/* Runs before React and before the main stylesheet. No inline script, CSP-safe. */
(function () {
  try {
    var stored = window.localStorage.getItem("mf-theme");
    var known = ["light-s", "dark-s", "hybrid-s"];
    document.documentElement.setAttribute(
      "data-theme",
      known.indexOf(stored) >= 0 ? stored : "dark-s",
    );
  } catch (_) {
    document.documentElement.setAttribute("data-theme", "dark-s");
  }
})();
