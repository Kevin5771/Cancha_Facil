// Mejora progresiva: el select conserva su valor y su participación en FormData.
(() => {
  let counter = 0;
  let open = null;
  const widgets = new WeakMap();
  function close(focus = false) {
    if (!open) return;
    const current = open;
    current.list.hidden = true;
    current.button.setAttribute("aria-expanded", "false");
    current.wrapper.classList.remove("is-open");
    open = null;
    if (focus) current.button.focus();
  }
  function sync(select) {
    const widget = widgets.get(select);
    if (!widget) return;
    widget.value.textContent =
      select.selectedOptions[0]?.textContent || "Selecciona";
    widget.button.disabled = select.disabled;
    [...widget.list.children].forEach((option, index) => {
      const active = index === select.selectedIndex;
      option.setAttribute("aria-selected", String(active));
      option.classList.toggle("is-selected", active);
    });
  }
  function upgrade(select) {
    if (widgets.has(select)) {
      sync(select);
      return;
    }
    const wrapper = document.createElement("div");
    wrapper.className = "custom-select";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "select-trigger";
    button.setAttribute("role", "combobox");
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute(
      "aria-label",
      select.getAttribute("aria-label") ||
        select.labels?.[0]?.textContent ||
        "Seleccionar opción",
    );
    const value = document.createElement("span");
    value.className = "select-value";
    button.append(value);
    const chevron = document.createElement("img");
    chevron.src = "/assets/icons/chevron-down.svg";
    chevron.alt = "";
    chevron.className = "icon";
    chevron.width = 16;
    chevron.height = 16;
    button.append(chevron);
    const list = document.createElement("div");
    list.className = "select-options";
    list.id = `select-options-${++counter}`;
    list.hidden = true;
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", button.getAttribute("aria-label"));
    button.setAttribute("aria-controls", list.id);
    select.before(wrapper);
    wrapper.append(select, button, list);
    select.classList.add("native-select");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    const widget = { select, wrapper, button, list, value };
    widgets.set(select, widget);
    [...select.options].forEach((option, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "select-option";
      item.setAttribute("role", "option");
      item.tabIndex = -1;
      item.textContent = option.textContent;
      item.disabled = option.disabled;
      item.addEventListener("click", () => {
        select.selectedIndex = index;
        sync(select);
        close(true);
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      list.append(item);
    });
    function show() {
      close();
      open = widget;
      list.hidden = false;
      button.setAttribute("aria-expanded", "true");
      wrapper.classList.add("is-open");
      list.classList.toggle(
        "opens-up",
        button.getBoundingClientRect().bottom +
          Math.min(list.scrollHeight, 280) >
          innerHeight - 20,
      );
      const selected =
        list.children[select.selectedIndex] || list.firstElementChild;
      selected?.focus();
      selected?.scrollIntoView({ block: "nearest" });
    }
    button.addEventListener("click", () =>
      open === widget ? close() : show(),
    );
    button.addEventListener("keydown", (event) => {
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        show();
        if (event.key === "Home") list.firstElementChild?.focus();
        if (event.key === "End") list.lastElementChild?.focus();
      }
    });
    list.addEventListener("keydown", (event) => {
      const items = [...list.children].filter((item) => !item.disabled);
      const current = items.indexOf(document.activeElement);
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
      if (event.key === "Tab") {
        close();
        button.focus();
      }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const index =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : (current +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  items.length) %
                items.length;
        items[index]?.focus();
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        const match = items.find((item) =>
          item.textContent
            .toLocaleLowerCase("es")
            .startsWith(event.key.toLocaleLowerCase("es")),
        );
        match?.focus();
      }
    });
    select.addEventListener("change", () => sync(select));
    select.labels?.forEach((label) =>
      label.addEventListener("click", (event) => {
        event.preventDefault();
        button.focus();
      }),
    );
    sync(select);
  }
  function enhance() {
    document.querySelectorAll("select").forEach(upgrade);
    if (open && !open.wrapper.isConnected) close();
  }
  document.addEventListener("click", (event) => {
    if (open && !open.wrapper.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close(true);
  });
  document.addEventListener("DOMContentLoaded", () => {
    enhance();
    new MutationObserver((records) => {
      if (
        records.some((record) =>
          [...record.addedNodes].some(
            (node) =>
              node.nodeType === 1 &&
              (node.tagName === "SELECT" || node.querySelector?.("select")),
          ),
        )
      )
        enhance();
    }).observe(document.body, { childList: true, subtree: true });
  });
  window.actualizarSelects = enhance;
})();
