import { readFileSync } from "node:fs";
import { test, expect } from "bun:test";

const casaCss = readFileSync(
  new URL("../src/casa.css", import.meta.url),
  "utf8",
);

/** Solo la sección 1G (semántica de importes y tipo en Movimientos). */
const seccion = casaCss.slice(casaCss.indexOf("Casa de cuentas · 1G"));

test("#421 la sección 1G existe y está acotada a Casa", () => {
  expect(seccion.length).toBeGreaterThan(0);
  expect(seccion).toContain(':root[data-theme="casa"]');
  expect(seccion).not.toMatch(
    /data-theme="(dark-s|light-s|hybrid-s|graphite-lime|aurora)"/,
  );
  expect(seccion).not.toContain("!important");
});

test("#421 todo selector de 1G lleva el ámbito de Casa en su propia línea", () => {
  const selectores = seccion
    .split("\n")
    .filter((linea: string) => linea.includes("{") && !linea.trim().startsWith("/*"));
  expect(selectores.length).toBeGreaterThan(0);
  for (const linea of selectores)
    expect(linea, linea).toContain(':root[data-theme="casa"]');
});

test("#421 el color de cada dirección usa tokens de Casa, no hex", () => {
  // El importe es siempre positivo: la dirección la comunican color y Tipo,
  // nunca un signo añadido en la interfaz.
  for (const flujo of ["inflow", "outflow", "neutral"]) {
    expect(seccion).toContain(`.movement-amount[data-flow="${flujo}"]`);
    expect(seccion).toContain(
      `.movement-detail[data-flow="${flujo}"] [data-label="Importe"] dd`,
    );
  }
  expect(seccion).toContain("color: var(--positive);");
  expect(seccion).toContain("color: var(--negative);");
  expect(seccion).toContain("color: var(--muted);");
  expect(seccion).not.toMatch(/:\s*#[0-9a-fA-F]{3,8}/);
});

test("#421 cada Tipo tiene glifo propio y no solo color", () => {
  const glifos: [string, string][] = [
    ["Ingreso", "\\2193"],
    ["Gasto", "\\2197"],
    ["Transferencia", "\\21C4"],
    ["Amortización deuda", "\\25A4"],
    ["Devolución de gasto", "\\21BA"],
  ];
  for (const [tipo, glifo] of glifos) {
    expect(seccion).toContain(`.movement-type[data-tipo="${tipo}"]`);
    expect(seccion).toContain(`content: "${glifo}";`);
  }
  expect(seccion).toContain(".movement-type-icon::before");
});