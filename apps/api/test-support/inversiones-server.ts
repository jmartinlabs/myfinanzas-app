// Isolated fictional E4.1 source with real MFA. No fixture API or auth bypass.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
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
if (process.env.NODE_ENV !== "test") throw Error("Test process only");
const dir = ".local/e2e-inversiones";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key"),
  now = Date.parse("2026-10-26T12:00:00Z");
const id = () => crypto.randomUUID();
updateSaldo(db, "S003", {
  revision: getSaldo(db, "S003").revision,
  saldoApertura: "3200.00",
  fechaApertura: "2026-01-01",
  permiteSalidaExterior: true,
});
createSaldo(
  db,
  {
    nombre: "Cartera secundaria demo",
    tipo: "Inversión",
    control: "Inversiones",
  },
  id(),
  now,
);
const fondo = createInstrumento(
    db,
    {
      nombre: "Fondo índice demo",
      isin: "ES0000000001",
      isinEvidencia: "Extracto ficticio F-01 · 2026-01-10",
      divisaReferencia: "EUR",
    },
    id(),
    now,
  ).instrumento,
  accion = createInstrumento(
    db,
    { nombre: "Acción ficticia", divisaReferencia: "USD" },
    id(),
    now,
  ).instrumento,
  antiguo = createInstrumento(
    db,
    {
      nombre: "Fondo antiguo",
      isin: "ES0000000009",
      isinEvidencia: "Extracto ficticio F-09 · 2026-01-10",
      divisaReferencia: "EUR",
    },
    id(),
    now,
  ).instrumento;
changeInstrumentoState(
  db,
  antiguo.id,
  { revision: 1, motivo: "Instrumento ficticio fuera de uso" },
  false,
  now,
);
db.run("UPDATE counters SET next=5001 WHERE name='operaciones_inversion'");
const purchase = (
  fecha: string,
  saldoInversion: string,
  cantidad: string,
  precio: string,
  importeEur: string,
  comisionEur: string | null,
) =>
  createPurchase(
    db,
    {
      fecha,
      instrumento: fondo.id,
      saldoEfectivo: "S003",
      saldoInversion,
      cantidad,
      precio,
      divisa: "USD",
      cambio: "0.900000",
      importeEur,
      comisionEur,
      concepto: "Compra demo",
      nota: null,
    },
    id(),
    now,
  );
purchase("2026-02-10", "S004", "12.5", "100.00", "1125.00", "5.00");
purchase("2026-03-03", "S006", "3", "98.00", "264.60", "0.00");
const annulled = purchase("2026-03-20", "S004", "10", "100.00", "900.00", "0.00");
annulPurchase(
  db,
  annulled.compra.id,
  { revision: 1, motivo: "Duplicado ficticio de la compra" },
  now,
);
writeFileSync(dir + "/bootstrap.txt", provision(db, now), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key, now: () => now })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: 3010 })),
    ),
  ),
);
