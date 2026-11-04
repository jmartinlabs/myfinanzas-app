import { test, expect } from "bun:test";
import { planDeltaEntries } from "./plan-delta";

test("planDeltaEntries ignora el certificado de impacto y conserva los deltas de campo", () => {
  const raw = JSON.stringify({
    base: { anterior: "10.00", posterior: "12.00" },
    impacto: {
      fingerprint: "a".repeat(64),
      cierres: [{ ciclo: "1", version: 1, inicio: "2026-01-01", fin: "2026-01-31" }],
    },
  });
  expect(planDeltaEntries(raw)).toEqual([
    ["base", { anterior: "10.00", posterior: "12.00" }],
  ]);
});

test("planDeltaEntries tolera JSON inválido y entradas sin shape de campo", () => {
  expect(planDeltaEntries("no-es-json")).toEqual([]);
  expect(
    planDeltaEntries(
      JSON.stringify({
        impacto: { fingerprint: "a".repeat(64) },
        campos: { anterior: 1, posterior: 2 },
      }),
    ),
  ).toEqual([]);
});
