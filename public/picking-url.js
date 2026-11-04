(function () {
  try {
    const u = new URL(location.href);
    if (u.pathname.endsWith(".html/")) {
      u.pathname = u.pathname.slice(0, -1);
      location.replace(u.toString());
    }
  } catch (e) {}
})();
