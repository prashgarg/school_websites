/* ── School Websites Project — main.js ─────────────────────── */

(function () {
  "use strict";

  /* ── Theme toggle ─────────────────────────────────────────── */
  const STORAGE_KEY = "swp-theme";
  const html = document.documentElement;

  function getPreferred() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    html.setAttribute("data-theme", theme);
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "dark" ? "☀" : "☾";
    localStorage.setItem(STORAGE_KEY, theme);
  }

  // Apply on load (before render to avoid flash)
  applyTheme(getPreferred());

  document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        const current = html.getAttribute("data-theme");
        applyTheme(current === "dark" ? "light" : "dark");
      });
    }

    /* ── Active nav link ────────────────────────────────────── */
    const page = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      const href = a.getAttribute("href");
      if (href === page || (page === "" && href === "index.html")) {
        a.classList.add("active");
      }
    });

    /* ── Animated counters ──────────────────────────────────── */
    const counters = document.querySelectorAll("[data-count]");
    if (counters.length && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.3 }
      );
      counters.forEach(function (el) { observer.observe(el); });
    }
  });

  function animateCounter(el) {
    const target = parseFloat(el.getAttribute("data-count").replace(/,/g, ""));
    const decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const elapsed = Math.min(now - start, duration);
      const progress = easeOut(elapsed / duration);
      const value = progress * target;
      el.textContent = decimals > 0
        ? value.toFixed(decimals)
        : Math.round(value).toLocaleString();
      if (elapsed < duration) requestAnimationFrame(tick);
      else el.textContent = decimals > 0 ? target.toFixed(decimals) : target.toLocaleString();
    }
    requestAnimationFrame(tick);
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

})();
