/**
 * UI · DEV-03 / UI-01 — configuración única de la navegación.
 *
 * Solo describe los enlaces declarados por la aplicación: no crea rutas por sí
 * mismo. El orden, las etiquetas, los iconos y los grupos viven aquí; `main.tsx`
 * se limita a representarlos. `/` sigue siendo un alias de Saldos y
 * `/saldos/nuevo` una subvista, por lo que ninguno aparece como enlace propio.
 */

export type NavigationItem = {
  readonly href: string;
  readonly label: string;
  /** Glifo decorativo: siempre se renderiza con `aria-hidden`. */
  readonly icon: string;
  /** Prefijo usado para marcar el enlace activo; por defecto, `href`. */
  readonly activePrefix?: string;
  /** Acceso heredado: se muestra después de las entradas principales. */
  readonly legacy?: boolean;
  /**
   * Acceso auxiliar: secundario y accesible, sin carácter de legado. Se marca
   * con `Auxiliar` en la navegación (VIS-25: Revisión Comida no es legado).
   */
  readonly secondary?: boolean;
};

export type NavigationGroup = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly NavigationItem[];
};

/** Dos accesos directos, siempre visibles. */
export const navigationDirect: readonly NavigationItem[] = [
  { href: "/inicio", label: "Inicio", icon: "◉" },
  { href: "/movimientos", label: "Movimientos", icon: "↔" },
];

/** Cinco grupos desplegables; conservan las 22 entradas restantes. */
export const navigationGroups: readonly NavigationGroup[] = [
  {
    id: "resumen-control",
    label: "Resumen y control",
    items: [
      { href: "/flujo-mensual", label: "Flujo mensual", icon: "⇄" },
      {
        href: "/pendientes",
        label: "Pendientes y conciliación",
        icon: "⊙",
      },
      { href: "/resumen-anual", label: "Resumen anual", icon: "▨" },
    ],
  },
  {
    id: "patrimonio",
    label: "Patrimonio",
    items: [
      { href: "/saldos", label: "Saldos", icon: "▤" },
      { href: "/inversiones", label: "Inversiones", icon: "↗" },
      { href: "/deudas", label: "Deudas", icon: "◷" },
    ],
  },
  {
    id: "presupuestos-planificacion",
    label: "Presupuestos y planificación",
    items: [
      { href: "/dprima", label: "Partidas", icon: "◫" },
      { href: "/planes-ciclo", label: "Plan del ciclo", icon: "▥" },
      { href: "/nomina", label: "Nómina", icon: "◈" },
      {
        href: "/clasificacion/partidas",
        label: "Clasificación",
        icon: "≡",
        activePrefix: "/clasificacion",
      },
      {
        href: "/presupuestos",
        label: "Presupuestos (legado)",
        icon: "⊞",
        legacy: true,
      },
      {
        href: "/plan-anual",
        label: "Plan anual (legado)",
        icon: "▧",
        legacy: true,
      },
    ],
  },
  {
    id: "casos-gastos",
    label: "Casos y gastos especiales",
    items: [
      { href: "/referencias", label: "Referencias", icon: "⌗" },
      { href: "/anticipos", label: "Anticipos", icon: "↺" },
      { href: "/compartidos", label: "Compartidos", icon: "⇌" },
      { href: "/vehiculos", label: "Vehículos", icon: "⌑" },
      { href: "/comida", label: "Comida", icon: "◍" },
      {
        href: "/revision-comida",
        label: "Revisión Comida",
        icon: "◎",
        secondary: true,
      },
    ],
  },
  {
    id: "ciclos-cierres",
    label: "Ciclos y cierres",
    items: [
      { href: "/ciclos", label: "Ciclos", icon: "▦" },
      { href: "/precierre", label: "Precierre", icon: "◐" },
      { href: "/cierre", label: "Cierre", icon: "▣" },
      { href: "/fotos", label: "Instantáneas financieras", icon: "▩" },
    ],
  },
];

export const navigationItems: readonly NavigationItem[] = [
  ...navigationDirect,
  ...navigationGroups.flatMap((group) => group.items),
];

export function isNavigationActive(item: NavigationItem, path: string): boolean {
  if (path === "/") return item.href === "/saldos";
  return path.startsWith(item.activePrefix ?? item.href);
}

/** Grupo que contiene la página activa, para abrirlo automáticamente. */
export function activeNavigationGroup(path: string): string | null {
  return (
    navigationGroups.find((group) =>
      group.items.some((item) => isNavigationActive(item, path)),
    )?.id ?? null
  );
}

/** Título de documento por ruta, sin introducir rutas nuevas. */
export function navigationTitle(path: string): string {
  if (path === "/") return "Saldos";
  if (path === "/saldos/nuevo" || path.startsWith("/saldos/nuevo?"))
    return "Nuevo Saldo";

  const edit = path.match(/^\/saldos\/(S\d+)\/editar(?:\?|$)/);
  if (edit) return `Editar Saldo ${edit[1]}`;
  const detail = path.match(/^\/saldos\/(S\d+)(?:\?|$)/);
  if (detail) return `Saldo ${detail[1]}`;

  const item = navigationItems.find((entry) =>
    isNavigationActive(entry, path),
  );
  return item?.label ?? "Página no encontrada";
}
