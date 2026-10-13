// Mobile menu, shared by every page
(() => {
  const header = document.querySelector(".site-header");
  const toggle = header?.querySelector(".nav-toggle");
  const nav = document.getElementById("main-nav");
  if (!toggle || !nav) return;

  // Dimmed backdrop behind the open panel; tapping it closes the menu
  const backdrop = document.createElement("div");
  backdrop.className = "nav-backdrop";
  document.body.appendChild(backdrop);

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  backdrop.addEventListener("click", () => setOpen(false));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Back on desktop the menu is inline, so drop the open state
  window.matchMedia("(min-width: 769px)").addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });
})();
