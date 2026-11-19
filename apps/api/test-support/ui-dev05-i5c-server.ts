// Isolated UI · DEV-05 I5c source with real MFA. Test-only; never imported by
// the app and never pointed at real data.
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

if (process.env.NODE_ENV !== "test") throw Error("Test process only");

// Puerto y estado del contexto de la ejecución (#514); los valores históricos
// se conservan para arrancarlo a mano. El puerto lo reserva el contexto, así
// que i5c e i5d —que compartían el 3027— pueden correr a la vez.
const PORT = Number(process.env.E2E_PORT ?? 3027);
const dir = process.env.E2E_STATE_DIR ?? ".local/e2e-ui-dev05-i5c";
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
const instrumento = createInstrumento(
  db,
  {
    nombre: "Fondo índice demo",
    isin: "ES0000000001",
    isinEvidencia: "Extracto ficticio I5c · 2026-01-10",
    divisaReferencia: "EUR",
  },
  id(),
  now,
).instrumento;

createPurchase(
  db,
  {
    fecha: "2026-02-10",
    instrumento: instrumento.id,
    saldoEfectivo: "S003",
    saldoInversion: "S004",
    cantidad: "12.5",
    precio: "100.000000",
    divisa: "USD",
    cambio: "0.900000",
    importeEur: "1125.00",
    comisionEur: "5.00",
    concepto: "Compra ficticia I5c",
    nota: null,
  },
  id(),
  now,
);

writeFileSync(dir + "/bootstrap.txt", provision(db, now), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      createApp(db, {
        key,
        now: () => now,
        origin: process.env.APP_ORIGIN ?? process.env.E2E_APP_ORIGIN,
      }),
    ).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: PORT })),
    ),
  ),
);
