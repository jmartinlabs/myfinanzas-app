/* MyFinanzas · Fase C · Prototipo visual
   Sin lógica financiera. Solo tema, menú móvil y selección de una operación. */

(function () {
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const initialTheme = params.get("theme") || root.dataset.defaultTheme || "dark-s";
  const themeSelects = [...document.querySelectorAll("[data-theme-select]")];

  function applyTheme(theme) {
    root.dataset.theme = theme;
    themeSelects.forEach((select) => {
      if (select.value !== theme) select.value = theme;
    });
  }

  applyTheme(initialTheme);
  themeSelects.forEach((select) => {
    select.addEventListener("change", () => applyTheme(select.value));
  });

  /* Menú móvil */
  const sidebar = document.querySelector(".sidebar");
  const backdrop = document.querySelector(".sidebar-backdrop");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const menuClosers = document.querySelectorAll("[data-menu-close]");

  function setMenu(open) {
    if (!sidebar) return;
    sidebar.classList.toggle("is-open", open);
    backdrop?.classList.toggle("is-open", open);
    menuToggle?.setAttribute("aria-expanded", String(open));
    if (open) {
      sidebar.querySelector("a, button")?.focus({ preventScroll: true });
    } else {
      menuToggle?.focus({ preventScroll: true });
    }
  }

  menuToggle?.addEventListener("click", () => {
    setMenu(!sidebar?.classList.contains("is-open"));
  });
  menuClosers.forEach((el) => el.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebar?.classList.contains("is-open")) {
      setMenu(false);
    }
  });

  /* Selección de Movimientos */
  const movementData = {
    318: {
      id: "318",
      tipo: "Ingreso",
      subtipo: "Nómina",
      concepto: "Nómina noviembre",
      fecha: "08/11/2026",
      importe: "+2.450,00 €",
      tono: "positive",
      origen: "—",
      destino: "Cuenta principal",
      partida: "No aplica",
      referencia: "—",
      ciclo: "Ciclo 11 · Noviembre 2026",
      estado: "Vigente",
      nota: "Ingreso ordinario de nómina. Hecho sintético de demostración.",
    },
    317: {
      id: "317",
      tipo: "Gasto",
      subtipo: "Ordinario",
      concepto: "Compra semanal",
      fecha: "07/11/2026",
      importe: "-86,40 €",
      tono: "negative",
      origen: "Cuenta principal",
      destino: "—",
      partida: "Alimentación",
      referencia: "REF-012 · Comida",
      ciclo: "Ciclo 11 · Noviembre 2026",
      estado: "Vigente",
      nota: "Compra ordinaria de alimentación. Hecho sintético de demostración.",
    },
    316: {
      id: "316",
      tipo: "Transferencia",
      subtipo: "Interna",
      concepto: "Traspaso a Fondo objetivo",
      fecha: "06/11/2026",
      importe: "600,00 €",
      tono: "neutral",
      origen: "Cuenta principal",
      destino: "Fondo objetivo",
      partida: "No aplica",
      referencia: "—",
      ciclo: "Ciclo 11 · Noviembre 2026",
      estado: "Vigente",
      nota: "Movimiento interno entre saldos. No computa como ingreso ni gasto.",
    },
    315: {
      id: "315",
      tipo: "Gasto",
      subtipo: "Ordinario",
      concepto: "Cuota préstamo vivienda",
      fecha: "05/11/2026",
      importe: "-742,18 €",
      tono: "negative",
      origen: "Cuenta principal",
      destino: "—",
      partida: "Préstamo vivienda",
      referencia: "Cuota mensual",
      ciclo: "Ciclo 11 · Noviembre 2026",
      estado: "Vigente",
      nota: "Cuota ordinaria de gasto con desglose de deuda. Hecho sintético de demostración.",
    },
    314: {
      id: "314",
      tipo: "Ingreso",
      subtipo: "Intereses",
      concepto: "Intereses cuenta",
      fecha: "04/11/2026",
      importe: "+48,50 €",
      tono: "positive",
      origen: "Cuenta principal",
      destino: "—",
      partida: "No aplica",
      referencia: "—",
      ciclo: "Ciclo 11 · Noviembre 2026",
      estado: "Vigente",
      nota: "Ingreso por intereses. Hecho sintético de demostración.",
    },
    313: {
      id: "313",
      tipo: "Gasto",
      subtipo: "Servicios",
      concepto: "Cuota anual software",
      fecha: "03/11/2026",
      importe: "-129,99 €",
      tono: "muted",
      origen: "Tarjeta secundaria",
      destino: "—",
      partida: "Servicios digitales",
      referencia: "—",
      ciclo: "Ciclo 11 · Noviembre 2026",
      estado: "Anulado",
      nota: "Operación anulada. Se conserva para consulta y no computa.",
    },
    312: {
      id: "312",
      tipo: "Gasto",
      subtipo: "Salud",
      concepto: "Farmacia",
      fecha: "02/11/2026",
      importe: "-24,90 €",
      tono: "negative",
      origen: "Cuenta principal",
      destino: "—",
      partida: "Salud",
      referencia: "—",
      ciclo: "Ciclo 11 · Noviembre 2026",
      estado: "Vigente",
      nota: "Gasto ordinario de salud. Hecho sintético de demostración.",
    },
    311: {
      id: "311",
      tipo: "Transferencia",
      subtipo: "Interna",
      concepto: "Aporte a Fondo objetivo",
      fecha: "01/11/2026",
      importe: "200,00 €",
      tono: "neutral",
      origen: "Cuenta principal",
      destino: "Fondo objetivo",
      partida: "No aplica",
      referencia: "—",
      ciclo: "Ciclo 11 · Noviembre 2026",
      estado: "Vigente",
      nota: "Movimiento interno entre saldos. No computa como ingreso ni gasto.",
    },
  };

  const movementNodes = [...document.querySelectorAll("[data-movement]")];
  const details = [...document.querySelectorAll("[data-detail]")];
  const detailSheet = document.querySelector("[data-detail-sheet]");

  function fillDetail(movement) {
    if (!movement) return;
    details.forEach((detail) => {
      detail.querySelectorAll("[data-field]").forEach((node) => {
        const key = node.dataset.field;
        if (key && movement[key] !== undefined) node.textContent = movement[key];
      });
      detail.querySelectorAll("[data-class]").forEach((node) => {
        node.classList.remove("amount-positive", "amount-negative", "amount-muted");
        if (movement.tono === "positive") node.classList.add("amount-positive");
        if (movement.tono === "negative") node.classList.add("amount-negative");
        if (movement.tono === "muted") node.classList.add("amount-muted");
      });
    });
  }

  function selectMovement(id, openSheet = true) {
    const movement = movementData[id];
    if (!movement) return;
    movementNodes.forEach((node) => {
      const selected = node.dataset.movement === id;
      node.classList.toggle("is-selected", selected);
      if (selected) node.setAttribute("aria-current", "true");
      else node.removeAttribute("aria-current");
    });
    fillDetail(movement);
    if (openSheet && detailSheet && window.matchMedia("(max-width: 760px)").matches) {
      detailSheet.classList.add("is-open");
      document.body.classList.add("detail-open");
    }
  }

  movementNodes.forEach((node) => {
    node.addEventListener("click", () => selectMovement(node.dataset.movement));
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectMovement(node.dataset.movement);
      }
    });
  });

  document.querySelector("[data-close-detail]")?.addEventListener("click", () => {
    detailSheet?.classList.remove("is-open");
    document.body.classList.remove("detail-open");
  });

  if (movementNodes.length) {
    const requested = params.get("movement");
    const initial = requested && movementData[requested] ? requested : "317";
    selectMovement(initial, params.get("detail") === "1");
  }

  document.querySelectorAll("[data-group-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
    });
  });

  document.querySelectorAll("[data-filter-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest("[data-filter-demo]");
      const open = card?.classList.toggle("filters-open");
      button.setAttribute("aria-expanded", String(Boolean(open)));
    });
  });

  document.querySelectorAll("[data-clear-filters]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = button.closest("[data-filter-demo]");
      form?.querySelectorAll("input, select").forEach((control) => {
        if (control.tagName === "SELECT") control.selectedIndex = 0;
        else control.value = "";
      });
    });
  });
})();
