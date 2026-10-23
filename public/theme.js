(() => {
  const system = matchMedia("(prefers-color-scheme: dark)");
  let preference;
  try {
    preference = localStorage.getItem("cf-tema");
  } catch {
    /* Almacenamiento opcional. */
  }
  const initial = ["light", "dark"].includes(preference)
    ? preference
    : system.matches
      ? "dark"
      : "light";
  document.documentElement.dataset.theme = initial;
  function renderButtons() {
    const dark = document.documentElement.dataset.theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute(
        "aria-label",
        dark ? "Activar modo claro" : "Activar modo oscuro",
      );
      button.title = dark ? "Modo claro" : "Modo oscuro";
      button.innerHTML = `<img class="icon" src="/assets/icons/${dark ? "sun" : "moon"}.svg" alt="" width="20" height="20">`;
    });
  }
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-theme-toggle]")) return;
    preference =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = preference;
    try {
      localStorage.setItem("cf-tema", preference);
    } catch {
      /* Mantener el tema durante esta visita. */
    }
    renderButtons();
  });
  system.addEventListener("change", (event) => {
    if (!preference) {
      document.documentElement.dataset.theme = event.matches ? "dark" : "light";
      renderButtons();
    }
  });
  window.actualizarBotonTema = renderButtons;
})();
