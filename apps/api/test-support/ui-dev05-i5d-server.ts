// Isolated UI · DEV-05 I5d source with real MFA. Test-only; never imported by
// the app and never pointed at real data.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createReference } from "../src/referencias";
import { createRevisionComida } from "../src/revision-comida";
import { revisionComidaFixture } from "./revision-comida-fixture";

if (process.env.NODE_ENV !== "test") throw new Error("Test process only");

// Puerto y estado del contexto de la ejecución (#514); los valores históricos
// se conservan para arrancarlo a mano. El puerto lo reserva el contexto, así
// que i5d e i5c —que compartían el 3027— pueden correr a la vez.
const PORT = Number(process.env.E2E_PORT ?? 3027);
const dir = process.env.E2E_STATE_DIR ?? ".local/e2e-ui-dev05-i5d";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key"),
  now = Date.parse("2026-10-26T12:00:00Z"),
  id = () => crypto.randomUUID();

revisionComidaFixture(db);

const vehicle = createReference(
    db,
    {
      nombre: "Coche I5d ficticio",
      tipo: "Vehículo",
      vehiculo: {
        matricula: "1111 I5D",
        proximaITV: "2026-12-01",
        cita: "2026-11-15",
      },
    },
    id(),
    now,
  ),
  conversion = createReference(
    db,
    { nombre: "Conversión I5d ficticia", tipo: "Viaje" },
    id(),
    now,
  ),
  detail = createRevisionComida(
    db,
    {
      fecha: "2026-10-20",
      concepto: "Operación I5d ficticia",
      importe: "12.34",
      direccion: "Salida",
      esDevolucion: false,
      clasificacion: "Comida",
      evidenciaBancaria: "Extracto I5d ficticio",
      cuentaOrigen: "Cuenta I5d ficticia",
    },
    id(),
    now,
    "Detalle",
  ).operacion;

writeFileSync(
  dir + "/ids.json",
  JSON.stringify({
    vehicle: vehicle.id,
    conversion: conversion.id,
    detail: detail.id,
  }),
  { mode: 0o600 },
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
