import { test, expect } from "bun:test";
import {
  activeNavigationGroup,
  isNavigationActive,
  navigationAllGroups,
  navigationDirect,
  navigationGroups,
  navigationItems,
  navigationLegacyGroup,
} from "../src/navigation";

/**
 * UI-02 · #504 — jerarquía del menú.
 *
 * Fija el catálogo: dos accesos directos, cinco grupos principales y
 * «Funciones anteriores» al final con las dos rutas históricas. No cambia
 * rutas ni comportamiento; solo comprueba la organización declarada.
 */

test("dos accesos directos fuera de grupos y cinco grupos principales", () => {
  expect(navigationDirect.map((item) => item.href)).toEqual([
    "/inicio",
    "/movimientos",
  ]);
  expect(navigationGroups.map((group) => group.label)).toEqual([
    "Resumen y control",
    "Patrimonio",
    "Presupuestos y planificación",
    "Casos y gastos especiales",
    "Ciclos y cierres",
  ]);
  for (const group of navigationGroups) expect(group.legacy).toBeUndefined();
});

test("«Funciones anteriores» es el último grupo y solo contiene las rutas históricas", () => {
  expect(navigationAllGroups.at(-1)).toBe(navigationLegacyGroup);
  expect(navigationLegacyGroup.id).toBe("funciones-anteriores");
  expect(navigationLegacyGroup.label).toBe("Funciones anteriores");
  expect(navigationLegacyGroup.hint).toBe("Retirada prevista");
  expect(navigationLegacyGroup.items.map((item) => item.href)).toEqual([
    "/presupuestos",
    "/plan-anual",
  ]);
  expect(navigationLegacyGroup.items.map((item) => item.label)).toEqual([
    "Presupuestos (legado)",
    "Plan anual (legado)",
  ]);
  expect(navigationLegacyGroup.items.every((item) => item.legacy)).toBe(true);
});

test("las rutas históricas salen de «Presupuestos y planificación»", () => {
  const planificacion = navigationGroups.find(
    (group) => group.id === "presupuestos-planificacion",
  )!;
  expect(planificacion.items.map((item) => item.href)).toEqual([
    "/dprima",
    "/planes-ciclo",
    "/nomina",
    "/clasificacion/partidas",
  ]);
  expect(planificacion.items.some((item) => item.legacy)).toBe(false);
});

test("«Comida del ciclo» y «Revisión Comida» son entradas hermanas", () => {
  const casos = navigationGroups.find((group) => group.id === "casos-gastos")!;
  const hrefs = casos.items.map((item) => item.href);
  // Consecutivas y dentro del mismo grupo, sin ninguna marca de jerarquía.
  expect(hrefs.indexOf("/revision-comida")).toBe(hrefs.indexOf("/comida") + 1);
  const comida = casos.items.find((item) => item.href === "/comida")!;
  const revision = casos.items.find((item) => item.href === "/revision-comida")!;
  expect(comida.label).toBe("Comida del ciclo");
  expect(revision.label).toBe("Revisión Comida");
  for (const item of [comida, revision]) {
    expect(item.legacy).toBeUndefined();
    expect(item).not.toHaveProperty("secondary");
    expect(item.label.toLowerCase()).not.toContain("ing");
  }
});

test("se conservan las 24 rutas sin duplicados", () => {
  const hrefs = navigationItems.map((item) => item.href);
  expect(hrefs).toHaveLength(24);
  expect(new Set(hrefs).size).toBe(24);
});

test("las rutas históricas abren y resaltan su grupo", () => {
  for (const path of ["/presupuestos", "/plan-anual"]) {
    expect(activeNavigationGroup(path)).toBe("funciones-anteriores");
  }
  expect(activeNavigationGroup("/saldos")).toBe("patrimonio");
  expect(activeNavigationGroup("/")).toBe("patrimonio");
  expect(activeNavigationGroup("/revision-comida")).toBe("casos-gastos");
  const legacyLink = navigationLegacyGroup.items[0];
  expect(isNavigationActive(legacyLink, "/presupuestos")).toBe(true);
  expect(isNavigationActive(legacyLink, "/saldos")).toBe(false);
});