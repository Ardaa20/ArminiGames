// Light / dark mode. Load in <head> (no defer) so the saved theme applies before first paint.
// Any element with class "theme-toggle" becomes a toggle button.
(function () {
  const KEY = "theme";
  const root = document.documentElement;
  const media = matchMedia("(prefers-color-scheme: dark)");

  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  } catch (e) {}

  const current = () => root.dataset.theme || (media.matches ? "dark" : "light");

  const ICONS = {
    // shown in light mode: moon
    light: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>`,
    // shown in dark mode: sun
    dark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  };

  function paint() {
    const mode = current();
    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      btn.innerHTML = ICONS[mode];
      btn.setAttribute("aria-label", mode === "dark" ? "Switch to light mode" : "Switch to dark mode");
    });
  }

  function toggle() {
    const next = current() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch (e) {}
    paint();
  }

  document.addEventListener("DOMContentLoaded", () => {
    paint();
    document.querySelectorAll(".theme-toggle").forEach((btn) => btn.addEventListener("click", toggle));
  });
  media.addEventListener("change", paint);
})();
