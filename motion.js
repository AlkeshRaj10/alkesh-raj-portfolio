// Shared UI motion: scroll reveals, FAQ accordion, phone tilt, hero parallax, footer wordmark.
// Loaded by the home and contact pages. Everything is a no-op under prefers-reduced-motion.
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Tells the CSS that reveals are now driven by script (turns off the no-script failsafe)
  root.classList.add("motion-ready");

  // ---------- Footer wordmark: wrap each word so they can rise one after another ----------
  document.querySelectorAll(".footer-wordmark").forEach((mark) => {
    [...mark.childNodes].forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) {
        node.classList.add("footer-wordmark__word");
        return;
      }
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.append(part);
        } else {
          const span = document.createElement("span");
          span.className = "footer-wordmark__word";
          span.textContent = part;
          frag.append(span);
        }
      });
      node.replaceWith(frag);
    });
  });

  // ---------- Text splitting for line / word reveals ----------
  // data-reveal="lines": each <br>-separated line slides up inside its own mask
  document.querySelectorAll('[data-reveal="lines"]').forEach((el) => {
    const lines = [[]];
    [...el.childNodes].forEach((node) => {
      if (node.nodeName === "BR") lines.push([]);
      else lines[lines.length - 1].push(node);
    });
    el.textContent = "";
    lines.forEach((nodes, l) => {
      const mask = document.createElement("span");
      mask.className = "reveal-line";
      const inner = document.createElement("span");
      inner.className = "reveal-line__inner";
      inner.style.setProperty("--l", l);
      inner.append(...nodes);
      mask.append(inner);
      el.append(mask);
    });
  });

  // data-reveal="words": words rise one after another (line breaks and inline elements kept)
  document.querySelectorAll('[data-reveal="words"]').forEach((el) => {
    let w = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.nodeName !== "BR") wrap(child);
          return;
        }
        if (child.nodeType !== Node.TEXT_NODE) return;
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(part);
          const span = document.createElement("span");
          span.className = "reveal-word";
          span.style.setProperty("--w", w++);
          span.textContent = part;
          frag.append(span);
        });
        child.replaceWith(frag);
      });
    };
    wrap(el);
  });

  // ---------- Scroll reveals ----------
  // data-reveal-stagger="<variant>" on a parent reveals its children one after another.
  // A child that is itself a stagger group is left alone (its own children carry the motion).
  document.querySelectorAll("[data-reveal-stagger]").forEach((parent) => {
    const variant = parent.dataset.revealStagger || "up";
    [...parent.children].forEach((child, i) => {
      if (child.hasAttribute("data-reveal-stagger")) return;
      if (!child.hasAttribute("data-reveal")) child.dataset.reveal = variant;
      child.style.setProperty("--i", i);
    });
  });

  // While revealing, an element uses the reveal transition (with its stagger delay); afterwards
  // it drops back to its own transitions, so hover/highlight effects keep their normal timing.
  const REVEAL_WINDOW_MS = 2600;
  const reveal = (el) => {
    el.classList.add("is-revealing", "is-revealed");
    setTimeout(() => el.classList.remove("is-revealing"), REVEAL_WINDOW_MS);
  };

  const targets = document.querySelectorAll("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-revealed"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        reveal(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    targets.forEach((el) => {
      // Anything in the first screen plays as part of the opening sequence. (Checked by
      // position, since an element's hidden offset can push it just past the fold.)
      if (el.getBoundingClientRect().top < window.innerHeight && el.getClientRects().length) reveal(el);
      else io.observe(el);
    });
  }

  // ---------- FAQ accordion: animate open/close of the native <details> ----------
  const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
  document.querySelectorAll(".faq-list details").forEach((details) => {
    const summary = details.querySelector("summary");
    let anim = null;

    summary.addEventListener("click", (e) => {
      if (reduceMotion || !details.animate) return; // native instant toggle
      e.preventDefault();

      const opening = !details.open || details.classList.contains("is-closing");
      const startH = details.offsetHeight;
      anim?.cancel();

      let endH;
      if (opening) {
        details.classList.remove("is-closing");
        details.open = true;
        endH = details.offsetHeight;
      } else {
        // Measure the closed height, then keep it open while it animates shut
        details.open = false;
        endH = details.offsetHeight;
        details.open = true;
        details.classList.add("is-closing");
      }

      details.style.overflow = "hidden";
      anim = details.animate(
        { height: [`${startH}px`, `${endH}px`] },
        { duration: 420, easing: EASE }
      );
      const answer = details.querySelector("summary + *");
      if (answer) {
        answer.animate(
          opening
            ? { opacity: [0, 1], translate: ["0 -10px", "0 0"] }
            : { opacity: [1, 0], translate: ["0 0", "0 -6px"] },
          { duration: opening ? 420 : 240, easing: EASE, delay: opening ? 60 : 0, fill: "backwards" }
        );
      }
      anim.onfinish = () => {
        if (!opening) {
          details.open = false;
          details.classList.remove("is-closing");
        }
        details.style.overflow = "";
        anim = null;
      };
      anim.oncancel = () => {
        details.style.overflow = "";
      };
    });
  });

  if (reduceMotion) return;

  // ---------- How it works: phones tilt slightly toward the pointer ----------
  if (finePointer) {
    document.querySelectorAll(".step-media").forEach((card) => {
      const demo = card.firstElementChild;
      if (!demo) return;
      let raf = 0, px = 0, py = 0, leaveTimer = 0;
      const apply = () => {
        raf = 0;
        demo.style.setProperty("--tilt-x", `${(-py * 4).toFixed(2)}deg`);
        demo.style.setProperty("--tilt-y", `${(px * 4).toFixed(2)}deg`);
      };
      card.addEventListener("pointerenter", () => {
        clearTimeout(leaveTimer);
        demo.classList.add("is-tilting");
      });
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width - 0.5;
        py = (e.clientY - r.top) / r.height - 0.5;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      card.addEventListener("pointerleave", () => {
        px = py = 0;
        if (!raf) raf = requestAnimationFrame(apply);
        // drop the transform once it has eased back to flat
        leaveTimer = setTimeout(() => demo.classList.remove("is-tilting"), 450);
      });
    });
  }

  // ---------- Hero: light parallax on the copy and the floating cards ----------
  const hero = document.querySelector(".hero");
  if (hero) {
    let raf = 0, px = 0, py = 0, visible = true;
    const update = () => {
      raf = 0;
      const sy = Math.min(Math.max(window.scrollY / hero.offsetHeight, 0), 1);
      hero.style.setProperty("--hero-px", px.toFixed(3));
      hero.style.setProperty("--hero-py", py.toFixed(3));
      hero.style.setProperty("--hero-sy", sy.toFixed(3));
    };
    const queue = () => {
      if (visible && !raf) raf = requestAnimationFrame(update);
    };

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
    window.addEventListener("scroll", queue, { passive: true });
    if (finePointer) {
      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width - 0.5;
        py = (e.clientY - r.top) / r.height - 0.5;
        queue();
      });
      hero.addEventListener("pointerleave", () => {
        px = py = 0;
        queue();
      });
    }
  }
})();
