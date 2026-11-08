// Isolated UI · DEV-05 motivo source with real MFA. Test-only; never imported
// by the app and never pointed at real data.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { getSaldo, updateSaldo } from "../src/saldos";
import { createInstrumento } from "../src/instrumentos";
import { createPurchase } from "../src/compras";
import { createSale } from "../src/ventas";

if (process.env.NODE_ENV !== "test") throw Error("Test process only");

const PORT = 3036;
const dir = ".local/e2e-ui-dev05-motivo";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key"),
  now = Date.parse("2026-10-26T12:00:00Z"),
  id = () => crypto.randomUUID();

updateSaldo(db, "S003", {
  revision: getSaldo(db, "S003").revision,
  saldoApertura: "2700.00",
  fechaApertura: "2026-01-01",
  permiteSalidaExterior: true,
});

const compraInstrumento = createInstrumento(
    db,
    {
      nombre: "Fondo compra motivo ficticio",
      isin: "ES0000000001",
      isinEvidencia: "Extracto ficticio motivo · 2026-01-10",
      divisaReferencia: "EUR",
    },
    id(),
    now,
  ).instrumento,
  ventaInstrumento = createInstrumento(
    db,
    {
      nombre: "Fondo venta motivo ficticio",
      isin: "ES0000000002",
      isinEvidencia: "Extracto ficticio motivo · 2026-01-11",
      divisaReferencia: "EUR",
    },
    id(),
    now,
  ).instrumento;

const compra = createPurchase(
  db,
  {
    fecha: "2026-02-10",
    instrumento: compraInstrumento.id,
    saldoEfectivo: "S003",
    saldoInversion: "S004",
    cantidad: "12.5",
    precio: "100.000000",
    divisa: "EUR",
    cambio: null,
    importeEur: "1250.00",
    comisionEur: null,
    concepto: "Compra ficticia para motivo",
    nota: null,
  },
  id(),
  now,
).compra;

createPurchase(
  db,
  {
    fecha: "2026-02-11",
    instrumento: ventaInstrumento.id,
    saldoEfectivo: "S003",
    saldoInversion: "S004",
    cantidad: "5",
    precio: "100.000000",
    divisa: "EUR",
    cambio: null,
    importeEur: "500.00",
    comisionEur: null,
    concepto: "Compra ficticia de la venta",
    nota: null,
  },
  id(),
  now,
);

const venta = createSale(
  db,
  {
    fecha: "2026-03-10",
    instrumento: ventaInstrumento.id,
    saldoEfectivo: "S003",
    saldoInversion: "S004",
    cantidad: "2",
    precio: "110.000000",
    divisa: "EUR",
    cambio: null,
    importeEur: "220.00",
    comisionEur: null,
    concepto: "Venta ficticia para motivo",
    nota: null,
  },
  id(),
  now,
).venta;

writeFileSync(
  dir + "/ids.json",
  JSON.stringify({ compra: compra.id, venta: venta.id }),
  { mode: 0o600 },
);
writeFileSync(dir + "/bootstrap.txt", provision(db, now), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key, now: () => now })).pipe(
      Layer.provide(
        BunHttpServer.layer({ hostname: "127.0.0.1", port: PORT }),
      ),
    ),
  ),
);
