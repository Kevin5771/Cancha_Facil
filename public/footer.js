(() => {
  const year = document.getElementById("footer-year");
  if (year)
    year.textContent = new Intl.DateTimeFormat("es-GT", {
      timeZone: "America/Guatemala",
      year: "numeric",
    }).format(new Date());
  document.addEventListener("click", async (event) => {
    const top = event.target.closest("[data-footer-top]");
    if (top) {
      document.querySelector(".header .brand")?.focus({ preventScroll: true });
      scrollTo({
        top: 0,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
    const sport = event.target.closest("[data-footer-sport]");
    if (!sport) return;
    filtrosCatalogo.tipo = sport.dataset.footerSport;
    filtrosCatalogo.busqueda = "";
    await abrir("catalogo");
    document
      .getElementById("explorar")
      ?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  });
  async function load() {
    try {
      const { canchas } = await api("/api/canchas");
      const count = document.getElementById("footer-court-count");
      if (count)
        count.textContent = `${canchas.length} ${canchas.length === 1 ? "cancha para tu próximo partido" : "canchas para tu próximo partido"}`;
      const sports = document.getElementById("footer-sports-list");
      if (!sports || !canchas.length) return;
      sports.replaceChildren(
        ...[...new Set(canchas.map((c) => c.tipo))].map((name) => {
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.footerSport = name;
          button.textContent = name;
          return button;
        }),
      );
    } catch {
      /* El footer mantiene sus accesos si el catálogo no está disponible. */
    }
  }
  load();
})();
