/**
 * UI · DEV-03 — configuración única de la navegación.
 *
 * Solo describe los enlaces existentes: no añade rutas ni módulos. El orden,
 * las etiquetas, los iconos y los grupos viven aquí; `main.tsx` se limita a
 * representarlos. `/` sigue siendo un alias de Saldos y `/saldos/nuevo` una
 * subvista, por lo que ninguno aparece como enlace propio.
 */

export type NavigationItem = {
  readonly href: string;
  readonly label: string;
  /** Glifo decorativo: siempre se renderiza con `aria-hidden`. */
  readonly icon: string;
  /** Prefijo usado para marcar el enlace activo; por defecto, `href`. */
  readonly activePrefix?: string;
};

export type NavigationGroup = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly NavigationItem[];
};

export const navigationGroups: readonly NavigationGroup[] = [
  {
    id: "mi-espacio",
    label: "Mi espacio",
    items: [
      { href: "/inicio", label: "Inicio", icon: "◉" },
      { href: "/flujo-mensual", label: "Flujo mensual", icon: "⇄" },
      {
        href: "/pendientes",
        label: "Pendientes y conciliación",
        icon: "⊙",
      },
      { href: "/anticipos", label: "Anticipos", icon: "↺" },
      { href: "/compartidos", label: "Compartidos", icon: "⇌" },
    ],
  },
  {
    id: "patrimonio",
    label: "Patrimonio",
    items: [
      { href: "/saldos", label: "Saldos", icon: "▤" },
      {
        href: "/clasificacion/partidas",
        label: "Clasificación",
        icon: "≡",
        activePrefix: "/clasificacion",
      },
      { href: "/inversiones", label: "Inversiones", icon: "↗" },
      { href: "/deudas", label: "Deudas", icon: "◷" },
      { href: "/vehiculos", label: "Vehículos", icon: "⌑" },
      { href: "/referencias", label: "Referencias", icon: "⌗" },
    ],
  },
  {
    id: "operacion",
    label: "Operación",
    items: [
      { href: "/movimientos", label: "Movimientos", icon: "↔" },
      { href: "/ciclos", label: "Ciclos", icon: "▦" },
      { href: "/precierre", label: "Precierre", icon: "◐" },
      { href: "/cierre", label: "Cierre", icon: "▣" },
    ],
  },
  {
    id: "planificacion",
    label: "Planificación",
    items: [
      { href: "/dprima", label: "D′ · Partidas", icon: "◫" },
      { href: "/comida", label: "Comida · hechos", icon: "◍" },
      { href: "/revision-comida", label: "Revisión Comida", icon: "◎" },
      { href: "/planes-ciclo", label: "Plan del ciclo", icon: "▥" },
      { href: "/nomina", label: "Nómina", icon: "◈" },
      { href: "/plan-anual", label: "Plan anual", icon: "▧" },
      { href: "/resumen-anual", label: "Resumen anual", icon: "▨" },
      { href: "/presupuestos", label: "Presupuestos", icon: "⊞" },
    ],
  },
];

export const navigationItems: readonly NavigationItem[] = navigationGroups.flatMap(
  (group) => group.items,
);

export function isNavigationActive(item: NavigationItem, path: string): boolean {
  if (path === "/") return item.href === "/saldos";
  return path.startsWith(item.activePrefix ?? item.href);
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
