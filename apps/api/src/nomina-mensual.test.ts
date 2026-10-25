import { test, expect } from "bun:test";
import { monthlyReference, ratioMoney } from "./nomina-mensual";
import { structuralDocumentReference, type Pay } from "./nomina";
function pay(
  id: string,
  mes: string,
  neto: string | null = "1000",
  extra: Partial<Pay> = {},
): Pay {
  return {
    id,
    mes,
    revision: 1,
    originalRevision: 1,
    tipo: "Ordinaria",
    guardia: "No",
    devengo: "2000",
    base: "2000",
    irpf: "10",
    variable: "0",
    historico: neto,
    documentado: null,
    evidencia: id,
    evidenciaDocumentado: "",
    verificado: true,
    documentadoVerificado: false,
    nota: "Fixture",
    resolucion: null,
    ...extra,
  };
}
test("Q4 M1/M2: historical anchor, year crossing, monthly totals not rows", () => {
  const r = monthlyReference(
    [
      pay("a", "2026-06"),
      pay("b", "2026-06", "500"),
      pay("c", "2026-05", "2000"),
      pay("future", "2026-08", "9000"),
    ],
    "2026-07-15",
  );
  expect(r.ancla).toBe("2026-06");
  expect(r.inicio).toBe("2025-07");
  expect(r.n).toBe(2);
  expect(r.valor).toBe("1750.00");
  expect(r.estado).toBe("Parcial");
  expect(ratioMoney(r.exacto!, "1600")).toBe("150.00");
  expect(r.meses.at(-1)?.exacto).toBe("1500");
});
test("Q4 M3: repeated identity once, distinct equal pays preserved, ambiguous evidence pending", () => {
  const a = pay("a", "2026-06");
  expect(
    monthlyReference([a, a, pay("b", "2026-06")], "2026-07-15").valor,
  ).toBe("2000.00");
  const r = monthlyReference(
    [a, pay("b", "2026-06", "1000", { evidencia: "a" })],
    "2026-07-15",
  );
  expect(r.n).toBe(0);
  expect(r.avisos).toHaveLength(2);
  expect(monthlyReference([a, { ...a, historico: "2" }], "2026-07-15").n).toBe(
    0,
  );
});
test("Q4 M4/M6: incomplete month excluded, partial subtotal and newer incomplete warning", () => {
  const r = monthlyReference(
    [
      pay("a", "2026-05", "500"),
      pay("b", "2026-05", null),
      pay("c", "2026-04", "1000"),
      pay("d", "2026-06", "1000", { verificado: false }),
    ],
    "2026-07-15",
  );
  expect(r.ancla).toBe("2026-05");
  expect(r.n).toBe(1);
  expect(r.valor).toBe("1000.00");
  expect(r.meses.at(-1)?.subtotalConocido).toBe("500.00");
  expect(r.meses.at(-1)?.valido).toBe(false);
  expect(r.avisos.map((p) => p.id)).toContain("d");
  expect(
    structuralDocumentReference(
      pay("x", "2026-06", "1000", {
        documentado: "1001",
        documentadoVerificado: true,
        evidenciaDocumentado: "doc",
      }),
    ).exacto,
  ).toBeNull();
});
test("Q4 M5/M7: document without bank, verified zero, N0, exact rational rounding once", () => {
  const r = monthlyReference(
    [
      pay("a", "2026-06", "1500"),
      pay("b", "2026-05", "2000"),
      pay("c", "2026-04", "0"),
    ],
    "2026-07-15",
  );
  expect(r.n).toBe(3);
  expect(r.valor).toBe("1166.67");
  expect(ratioMoney(r.exacto!, "1166.665")).toBe("0.00");
  expect(monthlyReference([], "2026-07-15").valor).toBeNull();
  expect(monthlyReference([pay("a", "2026-06")], null).valor).toBeNull();
  const d = pay("doc", "2026-06", null, {
    documentado: "1200",
    documentadoVerificado: true,
    evidenciaDocumentado: "doc-ref",
    guardia: "Sí",
    variable: "100",
  });
  expect(structuralDocumentReference(d).exacto).toBe("1110.00");
  expect(
    structuralDocumentReference({ ...d, documentadoVerificado: false }).exacto,
  ).toBeNull();
  expect(structuralDocumentReference(pay("neg", "2026-06", "-1")).exacto).toBe(
    "-1",
  );
});
test("Q4 M8/M9/M10: 11/12, 12/12, exact fractions and revisions; no bonus/forecast", () => {
  const ps = Array.from({ length: 12 }, (_, i) =>
    pay(String(i), `2026-${String(i + 1).padStart(2, "0")}`, "1000"),
  );
  expect(monthlyReference(ps.slice(0, 11), "2026-12-31").estado).toBe(
    "Parcial",
  );
  expect(monthlyReference(ps, "2026-12-31").estado).toBe("Verificado");
  const r = monthlyReference(
    [...ps, pay("bonus", "2026-12", "5000", { tipo: "Bonus" })],
    "2026-12-31",
  );
  expect(r.valor).toBe("1000.00");
  expect(
    monthlyReference(
      [{ ...ps[0], revision: 2, historico: "3000" }, ...ps.slice(1)],
      "2026-12-31",
    ).revision,
  ).not.toBe(r.revision);
  expect(ratioMoney({ numerador: "1005", escala: 3, divisor: "1" })).toBe(
    "1.01",
  );
  expect(ratioMoney({ numerador: "-1005", escala: 3, divisor: "1" })).toBe(
    "-1.01",
  );
});

test("Q4 central integration: partial/revised bank never changes documentary monthly mean or historical priority", async () => {
  const { Database } = await import("bun:sqlite"),
    { prepareSchema } = await import("./database-schema"),
    { confirmPayroll, getPayroll } = await import("./nomina"),
    { payrollMonthlyReference } = await import("./nomina-mensual");
  const db = new Database(":memory:");
  prepareSchema(db, { origin: "demo", key_hash: null });
  const now = Date.parse("2026-10-25T12:00:00Z");
  const change = (input: Record<string, unknown>) =>
    confirmPayroll(
      db,
      {
        ...input,
        contexto: getPayroll(db).contexto,
        motivo: "Fixture documental revisada",
      },
      crypto.randomUUID(),
      now,
    );
  const { id, revision, originalRevision, resolucion, ...p } = pay(
    "fixture",
    "2026-06",
    null,
    {
      documentado: "1200",
      documentadoVerificado: true,
      evidenciaDocumentado: "documento-unico",
      guardia: "Sí",
      variable: "100",
    },
  );
  change({ accion: "guardar", paga: p });
  const paga = getPayroll(db).pagas[0];
  db.query(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,concepto,nota,anulado,revision,creado,actualizado) VALUES('101','2026-07-05','Ingreso',50000,'S000','S001','Nómina','Fixture','',0,1,'f','f')",
  ).run();
  change({
    accion: "repartir",
    movimiento: "101",
    asignaciones: [
      { paga: paga.id, importe: "500", evidencia: "Parcial ficticio" },
    ],
  });
  const before = getPayroll(db),
    ref = payrollMonthlyReference(db, "2026-07-15");
  expect(before.pagas[0].neto).toBe("500.00");
  expect(before.pagas[0].netoCompleto).toBe(false);
  expect(ref.valor).toBe("1110.00");
  db.exec("UPDATE movimientos SET revision=2 WHERE id='101'");
  expect(getPayroll(db).pagas[0].motivo).toContain("Asociaciones");
  expect(payrollMonthlyReference(db, "2026-07-15").valor).toBe("1110.00");
  const dump = () =>
    db.query("SELECT name,sql FROM sqlite_master ORDER BY name").all();
  const schema = dump(),
    changes = db.query("SELECT total_changes() n").get();
  payrollMonthlyReference(db, "2026-07-15");
  expect(dump()).toEqual(schema);
  expect(db.query("SELECT total_changes() n").get()).toEqual(changes);
  expect(getPayroll(db).pagas[0].historico).toBeNull();
  expect(getPayroll(db).pagas[0].documentado).toBe("1200");
  db.close();
});
