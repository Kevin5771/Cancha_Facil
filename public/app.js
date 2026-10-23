"use strict";
const $ = (id) => document.getElementById(id);
const e = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let usuario = null,
  vista = "catalogo",
  canchaSeleccionada = null,
  fechaSeleccionada = "",
  canchasAdmin = [],
  catalogoCanchas = [];
const filtrosCatalogo = {
  tipo: "Todos",
  busqueda: "",
  fecha: "",
  orden: "recomendadas",
};
const icon = (name, extra = "") =>
  `<img class="icon ${extra}" src="/assets/icons/${name}.svg" alt="" aria-hidden="true" width="20" height="20">`;
const fotoCancha = (tipo) =>
  /básquet/i.test(tipo)
    ? "basketball"
    : /voleibol/i.test(tipo)
      ? "volleyball"
      : /tenis/i.test(tipo)
        ? "tennis"
        : "football";
const precio = (valor) =>
  valor == null
    ? "Consultar"
    : new Intl.NumberFormat("es-GT", {
        style: "currency",
        currency: "GTQ",
        maximumFractionDigits: 0,
      }).format(Number(valor));
const dias = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
function fechaLocal() {
  const d = new Date(),
    p = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Guatemala",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
  const x = Object.fromEntries(p.map((z) => [z.type, z.value]));
  return `${x.year}-${x.month}-${x.day}`;
}
function avisar(texto, error = false) {
  const el = $("alerta");
  el.textContent = texto;
  el.className = "toast" + (error ? " error" : "");
  el.hidden = false;
  clearTimeout(avisar.timeout);
  avisar.timeout = setTimeout(() => (el.hidden = true), 4800);
}
async function api(url, op = {}) {
  const config = { credentials: "same-origin", ...op };
  if (op.body && typeof op.body !== "string")
    config.body = JSON.stringify(op.body);
  if (config.body)
    config.headers = {
      "Content-Type": "application/json",
      ...(op.headers || {}),
    };
  const r = await fetch(url, config);
  let body;
  try {
    body = await r.json();
  } catch {
    body = {};
  }
  if (!r.ok)
    throw new Error(body.error || "No se pudo completar la operación.");
  return body;
}
function heading(t, s = "") {
  return `<div class="topbar"><div><h1>${e(t)}</h1>${s ? `<p class="muted">${e(s)}</p>` : ""}</div></div>`;
}
function nav() {
  const link = (key, label) =>
    `<button type="button" data-view="${key}" class="${vista === key ? "active" : ""}" ${vista === key ? 'aria-current="page"' : ""}>${label}</button>`;
  $("menu").innerHTML =
    `<div class="nav-links">${link("catalogo", "Explorar canchas")}${link("comunidad", "La grada")}${link("mis", "Mis reservas")}</div><div class="nav-account"><button class="theme-toggle" type="button" data-theme-toggle aria-label="Activar modo oscuro" aria-pressed="false">${icon("moon")}</button>${
      usuario?.rol === "ADMIN"
        ? `<details class="admin-menu"><summary>Administrar ${icon("chevron-down")}</summary><div>${[
            ["panel", "Resumen"],
            ["canchas-admin", "Gestionar canchas"],
            ["horarios-admin", "Horarios"],
            ["reservas-admin", "Todas las reservas"],
          ]
            .map(([key, label]) => link(key, label))
            .join("")}</div></details>`
        : ""
    }${usuario ? `<span class="user-name">Hola, ${e(usuario.nombre.split(" ")[0])}</span><button type="button" class="logout-button" data-action="salir" aria-label="Cerrar sesión">${icon("log-out")}</button>` : `<button class="login-link" type="button" data-view="login">Iniciar sesión ${icon("arrow-up-right")}</button>`}</div>`;
  window.actualizarBotonTema?.();
}
async function abrir(v) {
  window.comunidadUI?.detener();
  if (
    usuario &&
    window.comunidadRetorno &&
    !["login", "registro"].includes(v)
  ) {
    v = "comunidad";
    window.comunidadRetorno = false;
  }
  if (
    !usuario &&
    [
      "mis",
      "panel",
      "canchas-admin",
      "horarios-admin",
      "reservas-admin",
    ].includes(v)
  )
    v = "login";
  if (
    usuario?.rol !== "ADMIN" &&
    ["panel", "canchas-admin", "horarios-admin", "reservas-admin"].includes(v)
  )
    v = "catalogo";
  vista = v;
  document.body.dataset.page = v;
  nav();
  $("app").innerHTML = '<p class="loading">Cargando información...</p>';
  try {
    if (v === "catalogo") await catalogo();
    else if (v === "login") login();
    else if (v === "registro") registro();
    else if (v === "disponibilidad") await disponibilidad();
    else if (v === "mis") await misReservas();
    else if (v === "panel") await panel();
    else if (v === "canchas-admin") await canchasAdminVista();
    else if (v === "horarios-admin") await horariosVista();
    else if (v === "reservas-admin") await reservasAdminVista();
    else if (v === "comunidad") await window.comunidadUI.abrir();
    else await catalogo();
    if (["login", "registro"].includes(v))
      document
        .querySelector(".auth-wrap")
        ?.insertAdjacentHTML(
          "afterbegin",
          `<aside class="auth-aside"><span class="hero-badge">EL MEJOR PLAN EMPIEZA AQUÍ</span><h2>Haz espacio<br>para jugar<span>.</span></h2><p>Tu cancha y tu próximo partido,<br>a un par de clics.</p><span class="auth-caption">${icon("goal")} canchafácil / Guatemala</span></aside>`,
        );
  } catch (err) {
    $("app").innerHTML =
      `${heading("No se pudo cargar")}<div class="empty">${e(err.message)}<div class="spaced"><button class="btn" data-view="catalogo">Volver a canchas</button></div></div>`;
    avisar(err.message, true);
  }
}
async function catalogo() {
  const { canchas } = await api("/api/canchas");
  catalogoCanchas = canchas;
  const tipos = [...new Set(canchas.map((c) => c.tipo))];
  $("app").innerHTML =
    `<section class="hero" aria-labelledby="hero-title"><img class="hero-image" src="/assets/hero-tennis.jpg" alt="Jugador de tenis preparándose para devolver la pelota" fetchpriority="high"><div class="hero-shade"></div><div class="hero-topline"><span class="hero-badge"><span class="live-dot"></span> TU TIEMPO LIBRE, BIEN JUGADO.</span><span class="hero-edition">GUATEMALA / EST. 2026</span></div><div class="hero-content"><h1 id="hero-title">Desconecta.<br>Sal a <span>jugar.</span></h1><p>Encuentra tu cancha, reúne a tu equipo<br>y haz que el próximo partido suceda.</p><button class="btn hero-cta" data-action="explorar">Encuentra tu cancha ${icon("arrow-up-right")}</button><div class="hero-proof"><span class="proof-icon">${icon("check")}</span><span>Reserva en línea. Sin llamadas. Sin vueltas.</span></div></div><div class="hero-float"><span class="float-icon">${icon("goal")}</span><div><strong>Tu mejor plan está afuera.</strong><span>${canchas.length} canchas. Un montón de posibilidades.</span></div><span class="float-arrow">${icon("arrow-up-right")}</span></div><div class="hero-bottom"><span>01 / EL JUEGO EMPIEZA AQUÍ</span><span>DESLIZA PARA EXPLORAR ↓</span></div></section>
  <form id="form-buscar" class="search-dock" aria-label="Encuentra una cancha"><div class="dock-intro">¿Armamos<br><strong>un partido?</strong></div><div class="dock-field">${icon("goal")}<div><label for="buscar-deporte">Tu deporte</label><select id="buscar-deporte" name="deporte"><option value="Todos">Todos los deportes</option>${tipos.map((t) => `<option ${filtrosCatalogo.tipo === t ? "selected" : ""} value="${e(t)}">${e(t)}</option>`).join("")}</select></div></div><div class="dock-field">${icon("calendar-days")}<div><label for="buscar-fecha">¿Cuándo jugamos?</label><input id="buscar-fecha" name="fecha" type="date" min="${fechaLocal()}" value="${e(filtrosCatalogo.fecha || fechaLocal())}" required></div></div><button class="btn search-button" type="submit">Buscar cancha ${icon("search")}</button></form>
  <div class="trust-strip"><span>${icon("shield-check")} Tu horario, asegurado</span><span>${icon("clock-3")} Disponibilidad al instante</span><span>${icon("circle-user-round")} Tú eliges. Tú juegas.</span><span id="weather" class="weather">${icon("map-pin")} Ciudad de Guatemala</span></div>
  <section class="catalog-section" id="explorar" aria-labelledby="catalog-title"><div class="section-title"><div><span class="eyebrow">ENCUENTRA TU PRÓXIMO PLAN</span><h2 id="catalog-title">Una cancha para cada juego<span class="accent-dot">.</span></h2></div><span class="catalog-total" id="catalog-count" aria-live="polite"></span></div><div class="catalog-toolbar"><div class="sport-tabs" role="group" aria-label="Filtrar por deporte">${["Todos", ...tipos].map((t) => `<button type="button" class="sport-tab ${filtrosCatalogo.tipo === t ? "selected" : ""}" aria-pressed="${filtrosCatalogo.tipo === t}" data-action="filtrar-deporte" data-tipo="${e(t)}">${t === "Todos" ? icon("layout-grid") : ""}${e(t === "Todos" ? "Todas las canchas" : t)}</button>`).join("")}</div><div class="catalog-tools"><div class="quick-search">${icon("search")}<input id="buscar-nombre" type="search" aria-label="Buscar cancha por nombre" placeholder="Buscar cancha" value="${e(filtrosCatalogo.busqueda)}"></div><label class="sort-control">${icon("sliders-horizontal")}<select id="orden-canchas" aria-label="Ordenar canchas"><option value="recomendadas">Destacadas</option><option value="menor">Menor precio</option><option value="mayor">Mayor precio</option><option value="nombre">Nombre A–Z</option></select></label></div></div><div class="grid" id="catalog-grid"></div><p class="catalog-note">Fotografías de referencia · Consulta los horarios disponibles antes de reservar.</p></section>
  <section class="how-section" id="como-funciona" aria-labelledby="how-title"><div class="how-heading"><span class="eyebrow">ASÍ DE FÁCIL</span><h2 id="how-title">Menos organizar.<br>Más jugar.</h2><p>Del «¿y si jugamos?» al «nos vemos en la cancha» en tres pasos.</p><button class="btn" data-action="explorar">Vamos a jugar ${icon("arrow-up-right")}</button></div><div class="how-steps">${[
    [
      "01",
      "Encuentra tu lugar",
      "Fútbol, básquetbol, tenis o voleibol. Elige la cancha que va contigo.",
      "search",
    ],
    [
      "02",
      "Elige tu momento",
      "Consulta horarios reales y encuentra el espacio para tu equipo.",
      "calendar-days",
    ],
    [
      "03",
      "Hazlo un plan",
      "Inicia sesión, confirma tu reserva y encárgate de disfrutar.",
      "check",
    ],
  ]
    .map(
      ([n, t, d, i]) =>
        `<article class="how-step"><span class="step-number">${n}</span><div><h3>${t}</h3><p>${d}</p></div>${icon(i)}</article>`,
    )
    .join("")}</div></section>`;
  $("orden-canchas").value = filtrosCatalogo.orden;
  renderCards();
  actualizarClima();
}
function renderCards() {
  const query = filtrosCatalogo.busqueda.trim().toLocaleLowerCase("es");
  const canchas = catalogoCanchas.filter(
    (c) =>
      (filtrosCatalogo.tipo === "Todos" || c.tipo === filtrosCatalogo.tipo) &&
      `${c.nombre} ${c.tipo} ${c.descripcion}`
        .toLocaleLowerCase("es")
        .includes(query),
  );
  if (filtrosCatalogo.orden === "menor")
    canchas.sort(
      (a, b) =>
        (a.tarifa_referencia == null ? Infinity : Number(a.tarifa_referencia)) -
        (b.tarifa_referencia == null ? Infinity : Number(b.tarifa_referencia)),
    );
  if (filtrosCatalogo.orden === "mayor")
    canchas.sort(
      (a, b) =>
        (b.tarifa_referencia == null
          ? -Infinity
          : Number(b.tarifa_referencia)) -
        (a.tarifa_referencia == null ? -Infinity : Number(a.tarifa_referencia)),
    );
  if (filtrosCatalogo.orden === "nombre")
    canchas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  $("catalog-count").textContent =
    `${canchas.length} ${canchas.length === 1 ? "cancha disponible" : "canchas disponibles"}`;
  $("catalog-grid").innerHTML = canchas.length
    ? canchas
        .map(
          (c, index) =>
            `<article class="card"><div class="card-top"><img class="court-photo photo-${fotoCancha(c.tipo)}" src="/assets/${fotoCancha(c.tipo)}.jpg" alt="Fotografía ilustrativa de ${e(c.tipo)}" loading="lazy" width="850" height="560"><span class="sport-label">${e(c.tipo)}</span><button class="card-arrow" aria-label="Ver disponibilidad de ${e(c.nombre)}" data-action="seleccionar-cancha" data-id="${Number(c.id)}" data-nombre="${e(c.nombre)}">${icon("arrow-up-right")}</button><span class="photo-caption">${String(index + 1).padStart(2, "0")} / ENCUENTRA TU JUEGO</span></div><div class="card-body"><div class="card-title-row"><h3>${e(c.nombre)}</h3><span class="available-dot" title="Cancha activa"></span></div><p>${e(c.descripcion || "Tu espacio para el próximo partido.")}</p><div class="card-meta"><button class="card-rating" data-action="abrir-comunidad" data-id="${Number(c.id)}" aria-label="Ver comunidad y calificaciones de ${e(c.nombre)}"><span>★</span> ${c.votos ? `${Number(c.calificacion).toFixed(1)} <small>(${Number(c.votos)})</small>` : "Sin opiniones"}</button><span class="court-price"><strong>${e(precio(c.tarifa_referencia))}</strong><small>tarifa de referencia</small></span></div><div class="card-actions"><button class="card-book" data-action="seleccionar-cancha" data-id="${Number(c.id)}" data-nombre="${e(c.nombre)}">Ver disponibilidad ${icon("arrow-right")}</button><button class="card-community" data-action="abrir-comunidad" data-id="${Number(c.id)}" aria-label="Conversar sobre ${e(c.nombre)}">${icon("messages-square")}</button></div></div></article>`,
        )
        .join("")
    : `<div class="empty catalog-empty">${icon("search")}<h3>No encontramos esa cancha</h3><p>Prueba otro deporte o cambia tu búsqueda.</p><button class="btn" data-action="restablecer-catalogo">Ver todas las canchas</button></div>`;
  document.querySelectorAll(".sport-tab").forEach((button) => {
    const active = button.dataset.tipo === filtrosCatalogo.tipo;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", String(active));
  });
  window.actualizarSelects?.();
}
let climaCache = null;
async function actualizarClima() {
  try {
    if (!climaCache) {
      const response = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=14.6349&longitude=-90.5069&current=temperature_2m,weather_code&timezone=America%2FGuatemala",
        { signal: AbortSignal.timeout(6000), credentials: "omit" },
      );
      if (!response.ok) return;
      const data = await response.json();
      if (typeof data.current?.temperature_2m !== "number") return;
      climaCache = data.current;
    }
    if ($("weather")) {
      const code = climaCache.weather_code;
      $("weather").innerHTML =
        `${icon(code <= 1 ? "sun" : code <= 48 ? "cloud" : "cloud-rain")} ${Math.round(climaCache.temperature_2m)}°C <span>· Ciudad de Guatemala</span>`;
      $("weather").title = "Condiciones actuales estimadas por Open-Meteo";
    }
  } catch {
    /* El catálogo sigue disponible cuando el proveedor de clima falla. */
  }
}
function login() {
  $("app").innerHTML =
    `<div class="auth-wrap"><div class="auth-card"><span class="eyebrow">Acceso a CanchaFácil</span><h1>Iniciar sesión</h1><p class="muted">Ingresa para reservar o administrar tus canchas.</p><form id="form-login"><div class="field"><label for="login-correo">Correo electrónico</label><input type="email" id="login-correo" name="correo" autocomplete="username" required></div><div class="field"><label for="login-clave">Contraseña</label><input type="password" id="login-clave" name="password" autocomplete="current-password" required></div><button class="btn block" type="submit">Ingresar</button></form><p class="helper">¿Todavía no tienes cuenta? <button class="back" data-view="registro">Regístrate aquí</button></p></div></div>`;
}
function registro() {
  $("app").innerHTML =
    `<div class="auth-wrap"><div class="auth-card"><span class="eyebrow">Crear cuenta</span><h1>Únete a CanchaFácil</h1><form id="form-registro"><div class="field"><label for="reg-nombre">Nombre completo</label><input id="reg-nombre" name="nombre" maxlength="140" minlength="2" required autocomplete="name"></div><div class="field"><label for="reg-correo">Correo electrónico</label><input id="reg-correo" name="correo" type="email" required autocomplete="email"></div><div class="field"><label for="reg-tel">Teléfono (opcional)</label><input id="reg-tel" name="telefono" maxlength="30" autocomplete="tel"></div><div class="field"><label for="reg-pass">Contraseña (mínimo 8 caracteres)</label><input id="reg-pass" name="password" type="password" minlength="8" maxlength="100" required autocomplete="new-password"></div><button class="btn block" type="submit">Crear cuenta</button></form><p class="helper">¿Ya tienes cuenta? <button class="back" data-view="login">Inicia sesión</button></p></div></div>`;
}
async function disponibilidad() {
  if (!canchaSeleccionada) return abrir("catalogo");
  const fecha = fechaSeleccionada || fechaLocal();
  const { cancha, horarios } = await api(
    `/api/canchas/${canchaSeleccionada.id}/disponibilidad?fecha=${encodeURIComponent(fecha)}`,
  );
  $("app").innerHTML =
    `${heading("Disponibilidad de " + cancha.nombre, "Selecciona un horario libre para completar tu reserva.")}<button class="back" data-view="catalogo">← Volver al catálogo</button><div class="panel"><div class="input-row"><div class="field"><label for="fecha-reserva">Fecha del partido</label><input type="date" id="fecha-reserva" value="${e(fecha)}" min="${fechaLocal()}"></div><button class="btn" data-action="buscar-horarios">Consultar horarios</button></div></div><div class="section-title"><h2>Horarios para ${e(fecha)}</h2></div>${horarios.length ? `<div class="slots">${horarios.map((h) => `<div class="slot ${h.disponible ? "" : "booked"}"><div><strong>${e(h.hora_inicio.slice(0, 5))} – ${e(h.hora_fin.slice(0, 5))}</strong><div class="small-text">${h.disponible ? "Disponible" : "Ocupado"}</div></div><button class="btn small ${h.disponible ? "" : "outline"}" type="button" ${h.disponible ? "" : "disabled"} data-action="reservar" data-horario="${Number(h.id)}" data-desde="${e(h.hora_inicio.slice(0, 5))}" data-hasta="${e(h.hora_fin.slice(0, 5))}">${h.disponible ? "Reservar" : "No disponible"}</button></div>`).join("")}</div>` : '<div class="empty">No hay horarios configurados para este día. Prueba otra fecha o consulta al administrador.</div>'}`;
}
async function misReservas() {
  const { reservaciones } = await api("/api/reservaciones/mias");
  $("app").innerHTML =
    `${heading("Mis reservaciones", "Consulta tus reservas o cancela las que ya no utilizarás.")}<div class="panel">${reservaciones.length ? `<div class="table-wrap"><table><thead><tr><th>Cancha</th><th>Fecha</th><th>Horario</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${reservaciones.map((r) => `<tr><td>${e(r.cancha)}</td><td>${e(r.fecha)}</td><td>${e(r.hora_inicio.slice(0, 5))} – ${e(r.hora_fin.slice(0, 5))}</td><td><span class="chip ${r.estado === "CANCELADA" ? "fail" : r.estado === "PENDIENTE" ? "warn" : ""}">${e(r.estado)}</span></td><td>${["PENDIENTE", "CONFIRMADA"].includes(r.estado) ? `<button class="btn danger small" data-action="cancelar" data-id="${Number(r.id)}">Cancelar</button>` : "—"}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">Aún no tienes reservaciones. <button class="back" data-view="catalogo">Explora las canchas</button></div>'}</div>`;
}
async function panel() {
  const r = await api("/api/admin/resumen");
  const nums = [
    ["Reservas totales", r.total],
    ["Reservas de hoy", r.hoy],
    ["Confirmadas", r.confirmadas],
    ["Pendientes", r.pendientes],
    ["Canchas activas", r.canchas_activas],
  ];
  $("app").innerHTML =
    `${heading("Panel administrativo", "Resumen general de CanchaFácil.")}<div class="stats spaced">${nums.map(([label, n]) => `<div class="stat"><strong>${Number(n) || 0}</strong><span>${e(label)}</span></div>`).join("")}</div><div class="panel"><h2>Accesos rápidos</h2><div class="btn-row"><button class="btn" data-view="canchas-admin">Gestionar canchas</button><button class="btn outline" data-view="horarios-admin">Gestionar horarios</button><button class="btn outline" data-view="reservas-admin">Revisar reservaciones</button></div></div>`;
}
async function canchasAdminVista() {
  const { canchas } = await api("/api/canchas/admin");
  canchasAdmin = canchas;
  $("app").innerHTML =
    `${heading("Gestión de canchas", "Crea, edita y activa o desactiva canchas deportivas.")}<div class="columns spaced"><div class="panel"><h2 id="titulo-form-cancha">Nueva cancha</h2><form id="form-cancha" class="form-grid"><input type="hidden" name="cancha_id" value=""><div class="field wide"><label for="can-nombre">Nombre</label><input id="can-nombre" name="nombre" required maxlength="100"></div><div class="field"><label for="can-tipo">Tipo</label><input id="can-tipo" name="tipo" required maxlength="70" placeholder="Ej. Fútbol 5"></div><div class="field"><label for="can-tarifa">Tarifa Q (opcional)</label><input id="can-tarifa" name="tarifa_referencia" type="number" min="0" step="0.01"></div><div class="field wide"><label for="can-desc">Descripción</label><textarea id="can-desc" name="descripcion" maxlength="1500"></textarea></div><div class="checkbox-row wide"><input type="checkbox" id="can-activa" name="activa" checked><label for="can-activa">Cancha activa</label></div><button class="btn wide" type="submit">Guardar cancha</button><button class="btn outline wide" type="button" data-action="limpiar-cancha">Limpiar formulario</button></form></div><div class="panel"><h2>Listado de canchas</h2>${canchas.length ? `<div class="table-wrap"><table><thead><tr><th>Cancha</th><th>Tipo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${canchas.map((c) => `<tr><td>${e(c.nombre)}</td><td>${e(c.tipo)}</td><td><span class="chip ${c.activa ? "" : "fail"}">${c.activa ? "Activa" : "Inactiva"}</span></td><td><button class="btn small outline" data-action="editar-cancha" data-id="${Number(c.id)}">Editar</button></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">No hay canchas todavía.</div>'}</div></div>`;
}
async function horariosVista(canchaId) {
  const { canchas } = await api("/api/canchas/admin");
  if (!canchas.length) {
    $("app").innerHTML =
      heading("Horarios") +
      '<div class="empty">Crea primero una cancha desde administración.</div>';
    return;
  }
  const id = canchaId || canchas[0].id;
  const { horarios } = await api(`/api/horarios?cancha_id=${id}`);
  $("app").innerHTML =
    `${heading("Horarios semanales", "Configura franjas para cada día; desactiva horarios que no quieras ofrecer.")}<div class="panel"><div class="field"><label for="hor-cancha">Cancha</label><select id="hor-cancha">${canchas.map((c) => `<option value="${Number(c.id)}" ${String(c.id) === String(id) ? "selected" : ""}>${e(c.nombre)}</option>`).join("")}</select></div></div><div class="columns"><div class="panel"><h2>Agregar horario</h2><form id="form-horario" class="form-grid"><input type="hidden" name="cancha_id" value="${Number(id)}"><div class="field wide"><label for="hor-dia">Día</label><select id="hor-dia" name="dia_semana">${dias.map((d, i) => `<option value="${i}">${e(d)}</option>`).join("")}</select></div><div class="field"><label for="hor-inicio">Desde</label><input type="time" id="hor-inicio" name="hora_inicio" value="08:00" required></div><div class="field"><label for="hor-fin">Hasta</label><input type="time" id="hor-fin" name="hora_fin" value="09:00" required></div><button type="submit" class="btn wide">Agregar horario</button></form><p class="helper">Se recomienda crear bloques de una hora. Las franjas superpuestas serán rechazadas.</p></div><div class="panel"><h2>Horarios registrados</h2>${horarios.length ? `<div class="table-wrap"><table><thead><tr><th>Día</th><th>Franja</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${horarios.map((h) => `<tr><td>${e(dias[Number(h.dia_semana)])}</td><td>${e(h.hora_inicio.slice(0, 5))} – ${e(h.hora_fin.slice(0, 5))}</td><td>${h.activo ? "Activo" : "Bloqueado"}</td><td><button class="btn small ${h.activo ? "outline" : ""}" data-action="estado-horario" data-id="${Number(h.id)}" data-estado="${h.activo ? "false" : "true"}">${h.activo ? "Bloquear" : "Activar"}</button></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">Esta cancha no tiene horarios.</div>'}</div></div>`;
}
async function reservasAdminVista(params = new URLSearchParams()) {
  const [{ canchas }, { reservaciones }] = await Promise.all([
    api("/api/canchas/admin"),
    api("/api/admin/reservaciones?" + params.toString()),
  ]);
  $("app").innerHTML =
    `${heading("Administración de reservas", "Filtra, confirma, cancela o finaliza reservaciones.")}<div class="panel"><form id="form-filtros" class="form-grid"><div class="field"><label for="fil-fecha">Fecha</label><input type="date" id="fil-fecha" name="fecha" value="${e(params.get("fecha") || "")}"></div><div class="field"><label for="fil-cancha">Cancha</label><select id="fil-cancha" name="cancha_id"><option value="">Todas</option>${canchas.map((c) => `<option value="${Number(c.id)}" ${params.get("cancha_id") === String(c.id) ? "selected" : ""}>${e(c.nombre)}</option>`).join("")}</select></div><div class="field"><label for="fil-estado">Estado</label><select id="fil-estado" name="estado"><option value="">Todos</option>${["PENDIENTE", "CONFIRMADA", "CANCELADA", "FINALIZADA"].map((s) => `<option value="${s}" ${params.get("estado") === s ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="field"><label for="fil-cliente">Cliente</label><input id="fil-cliente" name="cliente" value="${e(params.get("cliente") || "")}" placeholder="Nombre"></div><div class="btn-row wide"><button class="btn" type="submit">Filtrar</button><button class="btn outline" type="button" data-action="limpiar-filtros">Limpiar</button></div></form></div><div class="panel"><h2>Reservaciones (${reservaciones.length})</h2>${reservaciones.length ? `<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Cancha</th><th>Fecha</th><th>Horario</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${reservaciones.map((r) => `<tr><td>${e(r.cliente)}<div class="small-text muted">${e(r.correo)}</div></td><td>${e(r.cancha)}</td><td>${e(r.fecha)}</td><td>${e(r.hora_inicio.slice(0, 5))}–${e(r.hora_fin.slice(0, 5))}</td><td><span class="chip ${r.estado === "CANCELADA" ? "fail" : r.estado === "PENDIENTE" ? "warn" : ""}">${e(r.estado)}</span></td><td><div class="btn-row">${r.estado === "PENDIENTE" ? `<button class="btn small" data-action="estado-reserva" data-id="${Number(r.id)}" data-estado="CONFIRMADA">Confirmar</button>` : ""}${r.estado === "CONFIRMADA" ? `<button class="btn small outline" data-action="estado-reserva" data-id="${Number(r.id)}" data-estado="FINALIZADA">Finalizar</button>` : ""}${["PENDIENTE", "CONFIRMADA"].includes(r.estado) ? `<button class="btn small danger" data-action="estado-reserva" data-id="${Number(r.id)}" data-estado="CANCELADA">Cancelar</button>` : "—"}</div></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">No se encontraron reservaciones.</div>'}</div>`;
}
function datosForm(f) {
  return Object.fromEntries(new FormData(f).entries());
}
$("app").addEventListener("submit", async (ev) => {
  const f = ev.target;
  const formId = f.getAttribute("id");
  if (
    ![
      "form-buscar",
      "form-login",
      "form-registro",
      "form-cancha",
      "form-horario",
      "form-filtros",
    ].includes(formId)
  )
    return;
  ev.preventDefault();
  if (!window.formUX.begin(f)) return;
  try {
    if (formId === "form-buscar") {
      if (!f.reportValidity()) return;
      filtrosCatalogo.tipo = $("buscar-deporte").value;
      filtrosCatalogo.fecha = $("buscar-fecha").value;
      renderCards();
      $("explorar").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (formId === "form-login") {
      const d = datosForm(f);
      const r = await api("/api/auth/login", { method: "POST", body: d });
      usuario = r.usuario;
      avisar("Bienvenido a CanchaFácil.");
      await abrir(
        usuario.rol === "ADMIN"
          ? "panel"
          : canchaSeleccionada
            ? "disponibilidad"
            : "catalogo",
      );
    } else if (formId === "form-registro") {
      const d = datosForm(f);
      const r = await api("/api/auth/registro", { method: "POST", body: d });
      usuario = r.usuario;
      avisar("Cuenta creada correctamente.");
      await abrir(canchaSeleccionada ? "disponibilidad" : "catalogo");
    } else if (formId === "form-cancha") {
      const d = datosForm(f);
      const id = d.cancha_id;
      const body = {
        nombre: d.nombre,
        tipo: d.tipo,
        descripcion: d.descripcion,
        tarifa_referencia:
          d.tarifa_referencia === "" ? null : Number(d.tarifa_referencia),
        activa: f.elements.activa.checked,
      };
      await api(id ? `/api/canchas/${id}` : "/api/canchas", {
        method: id ? "PUT" : "POST",
        body,
      });
      avisar("Cancha guardada correctamente.");
      await abrir("canchas-admin");
    } else if (formId === "form-horario") {
      const d = datosForm(f);
      await api("/api/horarios", {
        method: "POST",
        body: { ...d, dia_semana: Number(d.dia_semana) },
      });
      avisar("Horario agregado.");
      await horariosVista(d.cancha_id);
    } else if (formId === "form-filtros") {
      const params = new URLSearchParams();
      for (const [k, v] of new FormData(f)) {
        if (v) params.set(k, v);
      }
      await reservasAdminVista(params);
    }
  } catch (err) {
    window.formUX.fail(f, err);
    avisar(err.message, true);
  } finally {
    window.formUX.end(f);
  }
});
document.addEventListener("click", async (ev) => {
  const n = ev.target.closest("[data-view],[data-action]");
  if (!n) return;
  if (n.dataset.pending === "true") return;
  const v = n.dataset.view,
    act = n.dataset.action;
  if (v) {
    if (v === "comunidad") window.comunidadUI.reset();
    await abrir(v);
    return;
  }
  const writing = [
    "reservar",
    "cancelar",
    "estado-horario",
    "estado-reserva",
  ].includes(act);
  const oldLabel = n.innerHTML;
  if (writing) {
    n.dataset.pending = "true";
    n.disabled = true;
    n.textContent = "Procesando…";
  }
  try {
    if (act === "explorar" || act === "como-funciona") {
      if (vista !== "catalogo") await abrir("catalogo");
      $(act === "explorar" ? "explorar" : "como-funciona")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else if (act === "filtrar-deporte") {
      filtrosCatalogo.tipo = n.dataset.tipo;
      $("buscar-deporte").value = filtrosCatalogo.tipo;
      renderCards();
    } else if (act === "restablecer-catalogo") {
      filtrosCatalogo.tipo = "Todos";
      filtrosCatalogo.busqueda = "";
      $("buscar-deporte").value = "Todos";
      $("buscar-nombre").value = "";
      renderCards();
    } else if (act === "salir") {
      await api("/api/auth/logout", { method: "POST" });
      usuario = null;
      canchaSeleccionada = null;
      avisar("Sesión cerrada.");
      await abrir("catalogo");
    } else if (act === "seleccionar-cancha") {
      canchaSeleccionada = {
        id: Number(n.dataset.id),
        nombre: n.dataset.nombre,
      };
      fechaSeleccionada = filtrosCatalogo.fecha || fechaLocal();
      await abrir("disponibilidad");
    } else if (act === "buscar-horarios") {
      fechaSeleccionada = $("fecha-reserva").value;
      await abrir("disponibilidad");
    } else if (act === "reservar") {
      if (!usuario) {
        avisar("Inicia sesión para reservar.", true);
        return abrir("login");
      }
      if (
        !confirm(
          `¿Confirmar reserva de ${canchaSeleccionada.nombre} para ${fechaSeleccionada}, ${n.dataset.desde}–${n.dataset.hasta}?`,
        )
      )
        return;
      await api("/api/reservaciones", {
        method: "POST",
        body: {
          cancha_id: canchaSeleccionada.id,
          horario_id: Number(n.dataset.horario),
          fecha: fechaSeleccionada,
        },
      });
      avisar("¡Reserva creada correctamente!");
      await abrir("mis");
    } else if (act === "cancelar") {
      if (!confirm("¿Seguro que deseas cancelar esta reservación?")) return;
      await api(`/api/reservaciones/${n.dataset.id}/cancelar`, {
        method: "PATCH",
        body: {},
      });
      avisar("Reservación cancelada; horario liberado.");
      await abrir("mis");
    } else if (act === "editar-cancha") {
      const c = canchasAdmin.find((x) => String(x.id) === n.dataset.id);
      if (!c) return;
      const f = $("form-cancha");
      f.elements.namedItem("cancha_id").value = c.id;
      f.elements.nombre.value = c.nombre;
      f.elements.tipo.value = c.tipo;
      f.elements.descripcion.value = c.descripcion;
      f.elements.tarifa_referencia.value = c.tarifa_referencia ?? "";
      f.elements.activa.checked = c.activa;
      $("titulo-form-cancha").textContent = "Editar cancha";
      f.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (act === "limpiar-cancha") {
      const f = $("form-cancha");
      f.reset();
      f.elements.namedItem("cancha_id").value = "";
      $("titulo-form-cancha").textContent = "Nueva cancha";
    } else if (act === "estado-horario") {
      await api(`/api/horarios/${n.dataset.id}/estado`, {
        method: "PATCH",
        body: { activo: n.dataset.estado === "true" },
      });
      avisar("Horario actualizado.");
      await horariosVista($("hor-cancha").value);
    } else if (act === "estado-reserva") {
      if (
        n.dataset.estado === "CANCELADA" &&
        !confirm("¿Cancelar esta reservación?")
      )
        return;
      await api(`/api/admin/reservaciones/${n.dataset.id}/estado`, {
        method: "PATCH",
        body: { estado: n.dataset.estado },
      });
      avisar("Estado actualizado.");
      await abrir("reservas-admin");
    } else if (act === "limpiar-filtros") {
      await abrir("reservas-admin");
    }
  } catch (err) {
    avisar(err.message, true);
  } finally {
    if (writing) {
      delete n.dataset.pending;
      n.disabled = false;
      n.innerHTML = oldLabel;
    }
  }
});
$("app").addEventListener("change", async (ev) => {
  if (ev.target.id === "orden-canchas") {
    filtrosCatalogo.orden = ev.target.value;
    renderCards();
  }
  if (ev.target.id === "hor-cancha")
    try {
      await horariosVista(ev.target.value);
    } catch (err) {
      avisar(err.message, true);
    }
});
$("app").addEventListener("input", (ev) => {
  if (ev.target.id === "buscar-nombre") {
    filtrosCatalogo.busqueda = ev.target.value;
    renderCards();
  }
});
(async () => {
  try {
    const r = await api("/api/auth/me");
    usuario = r.usuario;
  } catch {
    usuario = null;
  }
  await abrir("catalogo");
})();
