(function () {
  var root = document.documentElement;
  var button = document.querySelector(".theme-toggle");
  if (!button) return;

  var media = window.matchMedia("(prefers-color-scheme: dark)");

  function stored() {
    try { return localStorage.getItem("theme"); } catch (e) { return null; }
  }

  function current() {
    var t = root.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return media.matches ? "dark" : "light";
  }

  function reflect() {
    button.setAttribute("aria-pressed", current() === "dark" ? "true" : "false");
  }

  button.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    reflect();
  });

  // Follow system changes only while the visitor has not made a choice.
  if (media.addEventListener) {
    media.addEventListener("change", function () {
      if (!stored()) reflect();
    });
  }

  reflect();
})();
