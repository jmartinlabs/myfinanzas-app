// Isolated fictional E4.3 source with real MFA. No fixture API or auth bypass.
// Fixture of SPEC23 test plan: S003/S007 cash, S004/S006 portfolios,
// I1001/I1002/I1003 (inactive)/I1005 and the Q1-Q5 dated valuations. Every
// figure is synthetic and deterministic. No production file is modified.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createSaldo, getSaldo, updateSaldo } from "../src/saldos";
import {
  changeInstrumentoState,
  createInstrumento,
} from "../src/instrumentos";
import { annulPurchase, createPurchase } from "../src/compras";
import { createSale } from "../src/ventas";
import { createValuation } from "../src/e43";
if (process.env.NODE_ENV !== "test") throw Error("Test process only");

const dir = ".local/e2e-valoracion";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key"),
  now = Date.parse("2026-10-26T12:00:00Z"),
  id = () => randomUUID();

// S003 opening 2.700,00: cashAt gives 1.416,40 at 2026-04-30 and 1.456,40 at
// 2026-06-30 after the fictional purchases and sales below.
updateSaldo(db, "S003", {
  revision: getSaldo(db, "S003").revision,
  saldoApertura: "2700.00",
  fechaApertura: "2026-01-01",
  permiteSalidaExterior: true,
});
const s006 = createSaldo(
  db,
  { nombre: "Cartera secundaria demo", tipo: "Inversión", control: "Inversiones" },
  id(),
  now,
);
const s007 = createSaldo(
  db,
  {
    nombre: "Efectivo secundario demo",
    tipo: "Efectivo",
    control: "Inversiones",
    saldoApertura: "500.00",
    fechaApertura: "2026-01-01",
    permiteSalidaExterior: true,
  },
  id(),
  now,
);
if (s006.id !== "S006" || s007.id !== "S007")
  throw new Error("Unexpected fictional Saldo identity: " + s006.id + "/" + s007.id);

const instrumento = (nombre: string, isin: string) =>
  createInstrumento(
    db,
    {
      nombre,
      isin,
      isinEvidencia: "Extracto ficticio E4.3 · 2026-01-10",
      divisaReferencia: "EUR",
    },
    id(),
    now,
  ).instrumento;
const i1001 = instrumento("Fondo índice demo", "ES0000000001"),
  i1002 = instrumento("Acción demo", "ES0000000002"),
  i1003 = instrumento("Fondo heredado demo", "ES0000000003"),
  i1004 = instrumento("Instrumento anulado demo", "ES0000000004"),
  i1005 = instrumento("Fondo manual demo", "ES0000000005");
if (
  [i1001, i1002, i1003, i1004, i1005].some(
    (row, index) => row.id !== `I${1001 + index}`,
  )
)
  throw new Error("Unexpected fictional Instrument identity.");

db.run("UPDATE counters SET next=5001 WHERE name='operaciones_inversion'");

const purchase = (
  fecha: string,
  instrumentoId: string,
  saldoInversion: string,
  cantidad: string,
  precio: string,
  divisa: string,
  cambio: string | null,
  importeEur: string,
  comisionEur: string | null,
  concepto: string,
) =>
  createPurchase(
    db,
    {
      fecha,
      instrumento: instrumentoId,
      saldoEfectivo: "S003",
      saldoInversion,
      cantidad,
      precio,
      divisa,
      cambio,
      importeEur,
      comisionEur,
      concepto,
      nota: null,
    },
    id(),
    now,
  );
const sale = (
  fecha: string,
  instrumentoId: string,
  saldoInversion: string,
  cantidad: string,
  precio: string,
  divisa: string,
  cambio: string | null,
  importeEur: string,
  comisionEur: string | null,
  concepto: string,
) =>
  createSale(
    db,
    {
      fecha,
      instrumento: instrumentoId,
      saldoEfectivo: "S003",
      saldoInversion,
      cantidad,
      precio,
      divisa,
      cambio,
      importeEur,
      comisionEur,
      concepto,
      nota: null,
    },
    id(),
    now,
  );

// C1/V1 P1, C2 P2, C3/V2 P3 (closed at 2026-06-30), C4 P4 (inactive),
// C5 I1004 annulled only, C6 P5 manual.
purchase("2026-02-10", i1001.id, "S004", "12.5", "100.000000", "USD", "0.900000", "1125.00", "5.00", "Compra P1 demo");
purchase("2026-03-03", i1001.id, "S006", "3", "98.000000", "USD", "0.900000", "264.60", "0.00", "Compra P2 demo");
purchase("2026-01-15", i1003.id, "S006", "10", "20.000000", "EUR", null, "200.00", "0.00", "Compra P4 heredada demo");
purchase("2026-02-01", i1005.id, "S006", "2", "100.000000", "EUR", null, "200.00", "0.00", "Compra P5 manual demo");
purchase("2026-05-02", i1002.id, "S004", "4", "50.000000", "EUR", null, "200.00", "0.00", "Compra P3 demo");
sale("2026-04-10", i1001.id, "S004", "5", "110.000000", "USD", "0.920000", "506.00", "2.00", "Venta V1 demo");
sale("2026-05-20", i1002.id, "S004", "4", "60.000000", "EUR", null, "240.00", "0.00", "Venta V2 demo");
const anulada = purchase("2026-01-20", i1004.id, "S004", "2", "10.000000", "EUR", null, "20.00", "0.00", "Compra anulada de I1004 demo");
annulPurchase(
  db,
  anulada.compra.id,
  { revision: 1, motivo: "Anulación ficticia del grupo solo anulado" },
  now,
);

changeInstrumentoState(
  db,
  i1003.id,
  { revision: 1, motivo: "Instrumento ficticio fuera de uso" },
  false,
  now,
);

const valorar = (
  saldo: string,
  instrumentoId: string,
  fecha: string,
  body: Record<string, unknown>,
) =>
  createValuation(
    db,
    saldo,
    instrumentoId,
    {
      fecha,
      procedencia: "Precio y cambio declarados por el usuario",
      ...body,
    },
    randomUUID(),
    now,
  ).valoracion.id;

// Q1-Q3 P1, Q4 P2 and Q5 P5. No valuation for P4; P3 is closed (`No aplica`).
valorar("S004", i1001.id, "2026-03-15", { tipo: "Automática", precio: "105.000000", divisa: "USD", cambio: "0.900000" });
valorar("S004", i1001.id, "2026-04-30", { tipo: "Automática", precio: "120.000000", divisa: "USD", cambio: "0.950000" });
valorar("S004", i1001.id, "2026-06-30", { tipo: "Automática", precio: "130.000000", divisa: "USD", cambio: "0.900000" });
valorar("S006", i1001.id, "2026-04-30", { tipo: "Automática", precio: "120.000000", divisa: "USD", cambio: "0.950000" });
valorar("S006", i1005.id, "2026-04-30", { tipo: "Manual", valorEur: "205.00" });

writeFileSync(dir + "/bootstrap.txt", provision(db, now), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key, now: () => now })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: 3011 })),
    ),
  ),
);
