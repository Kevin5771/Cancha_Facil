// Adaptación de formularios: validación visible, conservación de datos y un envío a la vez.
(() => {
  const pending = new WeakMap();
  let sequence = 0;
  function clear(form) {
    form
      .querySelectorAll(".field-error,.form-feedback")
      .forEach((node) => node.remove());
    form.querySelectorAll("[data-error-description]").forEach((input) => {
      const errorId = input.dataset.errorDescription;
      const ids = (input.getAttribute("aria-describedby") || "")
        .split(" ")
        .filter((id) => id && id !== errorId);
      if (ids.length) input.setAttribute("aria-describedby", ids.join(" "));
      else input.removeAttribute("aria-describedby");
      input.removeAttribute("aria-invalid");
      delete input.dataset.errorDescription;
    });
  }
  function message(input) {
    const validity = input.validity;
    if (
      input.required &&
      typeof input.value === "string" &&
      !input.value.trim() &&
      !["password", "checkbox", "radio"].includes(input.type)
    )
      return "Completa este campo.";
    if (validity.valueMissing)
      return input.type === "radio"
        ? "Selecciona una opción."
        : "Completa este campo.";
    if (validity.typeMismatch)
      return input.type === "email"
        ? "Escribe un correo válido, por ejemplo nombre@correo.com."
        : "Revisa el formato de este campo.";
    if (validity.tooShort)
      return `Escribe al menos ${input.minLength} caracteres.`;
    if (validity.tooLong)
      return `Usa como máximo ${input.maxLength} caracteres.`;
    if (validity.rangeUnderflow)
      return `El valor mínimo permitido es ${input.min}.`;
    if (validity.rangeOverflow)
      return `El valor máximo permitido es ${input.max}.`;
    if (validity.stepMismatch)
      return "Revisa los decimales o el intervalo permitido.";
    return "Revisa el valor de este campo.";
  }
  function fieldError(input, text) {
    const error = document.createElement("p");
    error.className = "field-error";
    error.id = `field-error-${++sequence}`;
    error.textContent = text;
    input.setAttribute("aria-invalid", "true");
    input.dataset.errorDescription = error.id;
    input.setAttribute(
      "aria-describedby",
      `${input.getAttribute("aria-describedby") || ""} ${error.id}`.trim(),
    );
    (
      input.closest(".field,.dock-field,fieldset") || input.parentElement
    ).append(error);
  }
  function begin(form) {
    if (pending.has(form)) return false;
    clear(form);
    const invalid = [...form.elements].filter(
      (input) =>
        input.willValidate &&
        (!input.validity.valid ||
          (input.required &&
            typeof input.value === "string" &&
            !input.value.trim() &&
            !["password", "checkbox", "radio"].includes(input.type))),
    );
    if (invalid.length) {
      const radioGroups = new Set();
      invalid.forEach((input) => {
        if (input.type === "radio") {
          if (radioGroups.has(input.name)) return;
          radioGroups.add(input.name);
        }
        fieldError(input, message(input));
      });
      const target =
        invalid[0]
          .closest(".custom-select")
          ?.querySelector(".select-trigger") || invalid[0];
      target.focus();
      return false;
    }
    const buttons = [...form.querySelectorAll('button[type="submit"]')].map(
      (button) => ({
        button,
        html: button.innerHTML,
        disabled: button.disabled,
      }),
    );
    const labels = {
      "form-login": "Ingresando…",
      "form-registro": "Creando cuenta…",
      "form-comentario": "Publicando…",
      "form-filtros": "Filtrando…",
      "form-buscar": "Buscando…",
    };
    buttons.forEach(({ button }) => {
      button.disabled = true;
      button.textContent = labels[form.getAttribute("id")] || "Guardando…";
    });
    pending.set(form, buttons);
    form.setAttribute("aria-busy", "true");
    return true;
  }
  function end(form) {
    pending.get(form)?.forEach(({ button, html, disabled }) => {
      button.innerHTML = html;
      button.disabled = disabled;
    });
    pending.delete(form);
    form.removeAttribute("aria-busy");
  }
  function fail(form, error) {
    if (!form.isConnected) return;
    form.querySelector(".form-feedback")?.remove();
    const status = document.createElement("div");
    status.className = "form-feedback";
    status.setAttribute("role", "alert");
    status.textContent =
      error.message ||
      "No se pudo guardar. Revisa los datos e inténtalo de nuevo.";
    form.prepend(status);
  }
  function enhance(root) {
    if (root.matches?.("form")) root.noValidate = true;
    root.querySelectorAll?.("form").forEach((form) => {
      form.noValidate = true;
    });
    const tables = [...(root.querySelectorAll?.(".table-wrap") || [])];
    if (root.matches?.(".table-wrap")) tables.push(root);
    tables.forEach((wrapper) => {
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute(
        "aria-label",
        wrapper.closest(".panel")?.querySelector("h2")?.textContent ||
          "Tabla de datos; desplázate para ver todas las columnas",
      );
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    enhance(document);
    new MutationObserver((records) =>
      records.forEach((record) =>
        record.addedNodes.forEach((node) => {
          if (node.nodeType === 1) enhance(node);
        }),
      ),
    ).observe(document.body, { childList: true, subtree: true });
  });
  document.addEventListener("input", (event) => {
    const input = event.target;
    if (input.dataset.errorDescription && input.validity?.valid) {
      const id = input.dataset.errorDescription;
      document.getElementById(id)?.remove();
      const remaining = (input.getAttribute("aria-describedby") || "")
        .split(" ")
        .filter((value) => value && value !== id);
      if (remaining.length)
        input.setAttribute("aria-describedby", remaining.join(" "));
      else input.removeAttribute("aria-describedby");
      input.removeAttribute("aria-invalid");
      delete input.dataset.errorDescription;
    }
  });
  window.formUX = { begin, end, fail, clear };
})();
