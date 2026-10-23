(() => {
  let courtId = null,
    messages = [],
    summary = null,
    earlier = false,
    reply = null,
    timer = null,
    generation = 0,
    busy = false,
    search = "",
    unseen = 0;
  const draftKey = () => `cf-borrador-${usuario?.id || "visitante"}-${courtId}`;
  function saveDraft(text) {
    try {
      if (text) localStorage.setItem(draftKey(), text);
      else localStorage.removeItem(draftKey());
    } catch {
      /* La conversación funciona sin almacenamiento local. */
    }
  }
  function restoreDraft() {
    const input = $("mensaje-comunidad");
    if (!input) return;
    try {
      input.value = localStorage.getItem(draftKey()) || "";
    } catch {
      /* Almacenamiento opcional. */
    }
    $("message-count").textContent = `${input.value.length} / 1000`;
    if (input.value)
      $("draft-status").textContent = "Borrador recuperado en este dispositivo";
  }
  function renderUnread() {
    const button = $("chat-new-messages");
    if (!button) return;
    button.hidden = unseen === 0 || Boolean(search);
    button.textContent = `${unseen} ${unseen === 1 ? "mensaje nuevo" : "mensajes nuevos"} ↓`;
  }
  const endpoint = () => `/api/comunidad/canchas/${courtId}`;
  const dayKey = (value) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guatemala",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  function dayDivider(message, previous) {
    const day = dayKey(message.creado_en);
    if (previous && dayKey(previous.creado_en) === day) return "";
    const label =
      day === dayKey(new Date())
        ? "Hoy"
        : new Intl.DateTimeFormat("es-GT", {
            timeZone: "America/Guatemala",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(message.creado_en));
    return `<div class="chat-day"><time datetime="${e(day)}">${e(label)}</time></div>`;
  }
  const stars = (rating) =>
    "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  const date = (value) =>
    new Intl.DateTimeFormat("es-GT", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Guatemala",
    }).format(new Date(value));
  function stop() {
    clearInterval(timer);
    timer = null;
    generation++;
  }
  function reset() {
    stop();
    courtId = null;
    reply = null;
  }
  function choose(id) {
    courtId = String(id);
    messages = [];
    reply = null;
    search = "";
    unseen = 0;
  }
  async function open() {
    stop();
    search = "";
    unseen = 0;
    if (!courtId) {
      const token = generation;
      const { canchas } = await api("/api/canchas");
      if (token !== generation || vista !== "comunidad") return;
      $("app").innerHTML =
        `<section class="community-intro"><div><span class="eyebrow">LA COMUNIDAD DE CANCHAFÁCIL</span><h1>Bienvenido<br>a <em>la grada.</em></h1><p>Los mejores partidos empiezan con una conversación.<br>Comparte tu experiencia, califica y encuentra con quién jugar.</p><span class="community-intro-tag">${icon("messages-square")} Una conversación para cada cancha.</span></div><div class="community-art" aria-hidden="true"><span class="art-ring"></span><span class="art-bubble art-bubble-one">¿Armamos equipo? <b>↗</b></span><span class="art-bubble art-bubble-two">★★★★★<small>Tu opinión cuenta.</small></span><span class="art-word">JUGUEMOS.</span></div></section><div class="section-title"><div><span class="eyebrow">ENCUENTRA TU COMUNIDAD</span><h2>¿De cuál cancha hablamos?</h2></div><span class="catalog-total">${canchas.length} espacios para conectar</span></div><section class="community-courts">${canchas.map((c) => `<button class="community-court" type="button" data-action="abrir-comunidad" data-id="${Number(c.id)}"><img src="/assets/${fotoCancha(c.tipo)}.jpg" alt="" width="120" height="100"><span><small>${e(c.tipo)}</small><strong>${e(c.nombre)}</strong><span class="community-court-score">${c.votos ? `★ ${Number(c.calificacion).toFixed(1)} <small>· ${Number(c.votos)} opiniones</small>` : "Sé el primero en calificar"}</span></span><span class="round-arrow">${icon("arrow-up-right")}</span></button>`).join("")}</section>`;
      return;
    }
    const token = generation;
    const [data, mine, catalog] = await Promise.all([
      api(endpoint()),
      usuario
        ? api(endpoint() + "/calificacion")
        : Promise.resolve({ puntuacion: null }),
      api("/api/canchas"),
    ]);
    if (token !== generation) return;
    messages = data.comentarios;
    summary = data.resumen;
    earlier = data.hayAnteriores;
    const c = data.cancha;
    $("app").innerHTML =
      `<div class="community-breadcrumb"><button class="back" data-action="comunidad-inicio">${icon("arrow-left")} La grada</button><span>/</span><span>${e(c.nombre)}</span></div><section class="thread-heading"><div><span class="eyebrow">${e(c.tipo)} / COMUNIDAD</span><h1>${e(c.nombre)}<span class="accent-dot">.</span></h1><p>Un espacio para conversar, compartir y volver a jugar.</p></div><div class="thread-court-picker"><label for="comunidad-cancha">Cambiar de cancha</label><select id="comunidad-cancha" aria-label="Cambiar de cancha">${(catalog.canchas.some((x) => String(x.id) === courtId) ? catalog.canchas : [c, ...catalog.canchas]).map((x) => `<option value="${Number(x.id)}" ${String(x.id) === courtId ? "selected" : ""}>${e(x.nombre)}</option>`).join("")}</select></div></section><div class="community-layout"><aside class="community-sidebar"><div class="rating-panel"><span class="eyebrow">LO QUE DICE LA GRADA</span><div id="community-summary"></div>${usuario && c.activa ? `<form id="form-calificacion"><fieldset class="rating-fieldset"><legend>Tu calificación</legend><div class="rating-stars">${[1, 2, 3, 4, 5].map((n) => `<label title="${n} ${n === 1 ? "estrella" : "estrellas"}"><input type="radio" name="puntuacion" value="${n}" ${mine.puntuacion === n ? "checked" : ""} required aria-label="${n} ${n === 1 ? "estrella" : "estrellas"}"><span aria-hidden="true">★</span></label>`).join("")}</div></fieldset><p class="rating-hint">${mine.puntuacion ? "Puedes actualizar tu opinión." : "¿Cómo calificarías esta cancha?"}</p><button class="btn block" type="submit">Guardar calificación ${icon("star")}</button></form>` : `<p class="rating-hint">${c.activa ? "Entra a tu cuenta para dejar tu calificación." : "Cancha inactiva: comunidad en modo lectura."}</p>${!usuario ? '<button class="btn block" data-action="comunidad-login">Iniciar sesión</button>' : ""}`}</div><div class="community-note">${icon("heart-handshake")}<div><h3>El respeto también juega.</h3><p>Comparte opiniones útiles, arma equipo y cuida la conversación. Las estrellas son opiniones de la comunidad.</p></div></div><button class="btn outline block" data-action="seleccionar-cancha" data-id="${Number(c.id)}" data-nombre="${e(c.nombre)}" ${c.activa ? "" : "disabled"}>Reservar esta cancha ${icon("arrow-up-right")}</button></aside><section class="conversation-panel" aria-labelledby="conversation-title"><header class="conversation-header"><div><span class="conversation-icon">${icon("messages-square")}</span><div><h2 id="conversation-title">La conversación</h2><p>Ideas, equipos y próximos partidos.</p></div></div><span class="conversation-sync">${icon("refresh-cw")} Se actualiza cada 15 s</span></header><div class="older-messages"><button class="back" data-action="comunidad-anteriores" ${earlier ? "" : "hidden"}>Ver mensajes anteriores</button></div><div id="community-feed" class="community-feed" role="region" aria-label="Mensajes de la comunidad" tabindex="0"></div><div id="community-updates" class="community-updates" role="status" aria-live="polite"></div>${usuario && c.activa ? `<form id="form-comentario" class="message-composer"><div id="reply-preview" hidden></div><label for="mensaje-comunidad">Comparte algo con la grada</label><textarea id="mensaje-comunidad" name="contenido" rows="3" maxlength="1000" placeholder="¿Un partido el sábado? ¿Qué tal está la cancha? Te leemos." required></textarea><div class="composer-bottom"><span id="message-count">0 / 1000</span><button type="submit" class="btn">Publicar ${icon("send")}</button></div></form>` : `<div class="community-join"><p>${c.activa ? "Tu próximo equipo podría estar aquí." : "Esta conversación permanece disponible para consulta."}</p>${!usuario ? '<button class="btn" data-action="comunidad-login">Únete a la conversación</button>' : ""}</div>`}</section></div>`;
    document
      .querySelector(".older-messages")
      .insertAdjacentHTML(
        "beforebegin",
        `<div class="chat-toolbar"><label class="chat-search">${icon("search")}<input id="chat-search" type="search" maxlength="100" placeholder="Buscar en los mensajes cargados" aria-label="Buscar en los mensajes cargados"></label><button class="chat-refresh" type="button" data-action="comunidad-actualizar" aria-label="Actualizar conversación">${icon("refresh-cw")}<span>Actualizar</span></button></div>`,
      );
    $("community-updates").insertAdjacentHTML(
      "beforebegin",
      '<div class="chat-new-wrap"><button type="button" id="chat-new-messages" data-action="comunidad-nuevos" hidden></button></div>',
    );
    const composer = $("form-comentario");
    if (composer) {
      composer
        .querySelector(".composer-bottom")
        .insertAdjacentHTML(
          "beforebegin",
          '<div class="composer-help"><span id="draft-status" role="status"></span><span id="chat-keyboard-help">Ctrl + Enter para publicar · Enter para otra línea</span></div>',
        );
      $("mensaje-comunidad").setAttribute(
        "aria-describedby",
        "chat-keyboard-help",
      );
      restoreDraft();
    }
    renderSummary();
    renderFeed(true);
    window.actualizarSelects?.();
    timer = setInterval(() => {
      if (vista === "comunidad" && courtId && !document.hidden && !busy)
        refresh().catch(() => {
          if ($("community-updates"))
            $("community-updates").textContent =
              "No se pudo actualizar. Reintentaremos en unos segundos.";
        });
    }, 15000);
  }
  function renderSummary() {
    if (!$("community-summary")) return;
    $("community-summary").innerHTML =
      `<div class="rating-average"><strong>${summary.votos ? Number(summary.promedio).toFixed(1) : "—"}</strong><div><span class="rating-display" aria-label="${summary.votos ? `${summary.promedio} de 5 estrellas` : "Sin calificaciones"}">${stars(summary.promedio)}</span><small>${summary.votos} ${summary.votos === 1 ? "opinión" : "opiniones"} de la comunidad</small></div></div><div class="rating-bars">${[
        ["cinco", 5],
        ["cuatro", 4],
        ["tres", 3],
        ["dos", 2],
        ["uno", 1],
      ]
        .map(
          ([key, n]) =>
            `<div><span>${n} ★</span><progress max="${Math.max(summary.votos, 1)}" value="${summary[key]}" aria-label="${summary[key]} votos de ${n} estrellas"></progress><small>${summary[key]}</small></div>`,
        )
        .join("")}</div>`;
  }
  function renderFeed(bottom = false, prepend = false) {
    const feed = $("community-feed");
    if (!feed) return;
    const oldHeight = feed.scrollHeight,
      oldTop = feed.scrollTop;
    const normalized = search.toLocaleLowerCase("es");
    const visible = messages.filter(
      (m) =>
        !normalized ||
        `${m.autor} ${m.contenido}`
          .toLocaleLowerCase("es")
          .includes(normalized),
    );
    feed.innerHTML = visible.length
      ? visible
          .map(
            (m, index) =>
              dayDivider(m, visible[index - 1]) +
              `<article class="community-message ${String(usuario?.id) === m.usuario_id ? "own-message" : ""}" data-message-id="${e(m.id)}"><span class="message-avatar" aria-hidden="true">${e(m.autor.slice(0, 1))}</span><div class="message-body"><div class="message-heading"><strong>${e(m.autor)} ${String(usuario?.id) === m.usuario_id ? "<span>(tú)</span>" : ""}</strong><time datetime="${e(m.creado_en)}">${e(date(m.creado_en))}</time></div>${m.respuesta_a ? `<blockquote><strong>${e(m.respuesta_autor)}</strong><span>${e(m.respuesta_contenido)}</span></blockquote>` : ""}<p class="${m.eliminado ? "message-deleted" : ""}">${e(m.contenido)}</p>${!m.eliminado ? `<div class="message-actions">${usuario ? `<button type="button" data-action="comunidad-responder" data-id="${e(m.id)}">Responder</button>` : ""}${usuario && (String(usuario.id) === m.usuario_id || usuario.rol === "ADMIN") ? `<button type="button" data-action="comunidad-eliminar" data-id="${e(m.id)}" aria-label="Eliminar comentario de ${e(m.autor)}">Eliminar</button>` : ""}</div>` : ""}</div></article>`,
          )
          .join("")
      : `<div class="conversation-empty">${icon("messages-square")}<h3>${search ? "Sin coincidencias." : "Rompe el hielo."}</h3><p>${search ? "Prueba otro texto o carga mensajes anteriores." : "Sé la primera persona en iniciar la conversación."}</p></div>`;
    if (bottom) feed.scrollTop = feed.scrollHeight;
    else
      feed.scrollTop =
        oldTop + (prepend ? Math.max(0, feed.scrollHeight - oldHeight) : 0);
    const older = document.querySelector(
      '[data-action="comunidad-anteriores"]',
    );
    if (older) older.hidden = !earlier;
    renderUnread();
  }
  async function refresh() {
    const token = generation,
      id = courtId;
    const data = await api(endpoint());
    if (token !== generation || id !== courtId || vista !== "comunidad") return;
    const feed = $("community-feed");
    const atBottom =
      feed && feed.scrollHeight - feed.scrollTop - feed.clientHeight < 70;
    const known = new Set(messages.map((m) => m.id));
    const incoming = data.comentarios.filter(
      (m) => !known.has(m.id) && !m.eliminado,
    ).length;
    const previous = JSON.stringify(messages);
    const merged = new Map(messages.map((m) => [m.id, m]));
    data.comentarios.forEach((m) => merged.set(m.id, m));
    messages = [...merged.values()].sort((a, b) => Number(a.id) - Number(b.id));
    summary = data.resumen;
    renderSummary();
    if (previous !== JSON.stringify(messages)) {
      if (!atBottom || search) unseen += incoming;
      else unseen = 0;
      renderFeed(atBottom && !search);
      if ($("community-updates"))
        $("community-updates").textContent = "Conversación actualizada.";
    }
  }
  async function submit(form) {
    if (busy) return;
    if (!window.formUX.begin(form)) return;
    busy = true;
    const token = generation;
    const requestEndpoint = endpoint();
    try {
      if (form.id === "form-calificacion") {
        const selected = form.querySelector("input[name=puntuacion]:checked");
        if (!selected) return;
        await api(requestEndpoint + "/calificacion", {
          method: "PUT",
          body: { puntuacion: Number(selected.value) },
        });
        if (token !== generation) return;
        await refresh();
        if (token !== generation) return;
        const hint = document.querySelector(".rating-hint");
        if (hint)
          hint.textContent =
            "Calificación guardada. Puedes actualizarla cuando quieras.";
        avisar("Tu calificación ya forma parte de la grada.");
      } else {
        const contenido = $("mensaje-comunidad").value.trim();
        if (!contenido) {
          $("mensaje-comunidad").focus();
          return;
        }
        const input = $("mensaje-comunidad");
        const storageKey = draftKey();
        await api(requestEndpoint + "/comentarios", {
          method: "POST",
          body: { contenido, respuesta_a: reply?.id || null },
        });
        if (token !== generation) return;
        // No borrar lo que el usuario haya seguido escribiendo durante el envío.
        if (input.value.trim() === contenido) {
          form.reset();
          try {
            localStorage.removeItem(storageKey);
          } catch {
            /* Almacenamiento opcional. */
          }
          $("message-count").textContent = "0 / 1000";
          $("draft-status").textContent = "";
        }
        reply = null;
        renderReply();
        await refresh();
        if (token !== generation) return;
        const feed = $("community-feed");
        if (feed) feed.scrollTop = feed.scrollHeight;
        unseen = 0;
        renderUnread();
        input.focus();
        avisar("Mensaje publicado.");
      }
    } catch (error) {
      window.formUX.fail(form, error);
      throw error;
    } finally {
      busy = false;
      window.formUX.end(form);
    }
  }
  function renderReply() {
    const preview = $("reply-preview");
    if (!preview) return;
    preview.hidden = !reply;
    preview.innerHTML = reply
      ? `<div><small>Respondiendo a ${e(reply.autor)}</small><p>${e(reply.contenido.slice(0, 120))}</p></div><button type="button" data-action="comunidad-no-responder" aria-label="Cancelar respuesta">${icon("x")}</button>`
      : "";
  }
  document.addEventListener("submit", (event) => {
    if (
      !["form-comentario", "form-calificacion"].includes(
        event.target.getAttribute("id"),
      )
    )
      return;
    event.preventDefault();
    submit(event.target).catch((error) => avisar(error.message, true));
  });
  document.addEventListener("input", (event) => {
    if (event.target.id === "mensaje-comunidad" && $("message-count")) {
      $("message-count").textContent = `${event.target.value.length} / 1000`;
      saveDraft(event.target.value);
      $("draft-status").textContent = event.target.value
        ? "Borrador guardado en este dispositivo"
        : "";
    }
    if (event.target.id === "chat-search") {
      search = event.target.value.trim();
      renderFeed();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.target.id === "mensaje-comunidad" &&
      (event.ctrlKey || event.metaKey) &&
      event.key === "Enter" &&
      !event.isComposing
    ) {
      event.preventDefault();
      $("form-comentario").requestSubmit();
    }
  });
  document.addEventListener(
    "scroll",
    (event) => {
      const feed = event.target;
      if (
        feed.id === "community-feed" &&
        !search &&
        feed.scrollHeight - feed.scrollTop - feed.clientHeight < 35
      ) {
        unseen = 0;
        renderUnread();
      }
    },
    true,
  );
  document.addEventListener("change", (event) => {
    if (event.target.id === "comunidad-cancha") {
      choose(event.target.value);
      abrir("comunidad");
    }
  });
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    try {
      if (action === "comunidad-actualizar") {
        button.disabled = true;
        try {
          await refresh();
          if ($("community-updates"))
            $("community-updates").textContent =
              "Estás al día con la conversación.";
        } finally {
          button.disabled = false;
        }
      }
      if (action === "comunidad-nuevos") {
        const feed = $("community-feed");
        feed.scrollTop = feed.scrollHeight;
        unseen = 0;
        renderUnread();
      }
      if (action === "abrir-comunidad") {
        choose(button.dataset.id);
        await abrir("comunidad");
      }
      if (action === "comunidad-inicio") {
        reset();
        await abrir("comunidad");
      }
      if (action === "comunidad-login") {
        window.comunidadRetorno = true;
        await abrir("login");
      }
      if (action === "comunidad-responder") {
        reply = messages.find((m) => m.id === button.dataset.id);
        renderReply();
        $("mensaje-comunidad")?.focus();
      }
      if (action === "comunidad-no-responder") {
        reply = null;
        renderReply();
      }
      if (action === "comunidad-eliminar") {
        if (!confirm("¿Eliminar este mensaje? Las respuestas se conservarán."))
          return;
        await api(`/api/comunidad/comentarios/${button.dataset.id}`, {
          method: "DELETE",
        });
        messages = messages.map((m) =>
          m.id === button.dataset.id
            ? { ...m, eliminado: true, contenido: "Comentario eliminado" }
            : m,
        );
        await refresh();
        renderFeed();
        avisar("Mensaje eliminado.");
      }
      if (action === "comunidad-anteriores" && messages.length) {
        button.disabled = true;
        const token = generation;
        try {
          const data = await api(
            endpoint() + "?antes=" + encodeURIComponent(messages[0].id),
          );
          if (token !== generation) return;
          const merged = new Map(
            [...data.comentarios, ...messages].map((m) => [m.id, m]),
          );
          messages = [...merged.values()].sort(
            (a, b) => Number(a.id) - Number(b.id),
          );
          earlier = data.hayAnteriores;
          renderFeed(false, true);
        } finally {
          button.disabled = false;
        }
      }
    } catch (error) {
      avisar(error.message, true);
    }
  });
  window.comunidadUI = { abrir: open, detener: stop, reset };
})();
