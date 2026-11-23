// #502 E2E — fixture aislado de identidad de release. Proceso de prueba
// únicamente: no existe en la aplicación real ni toca datos reales.
//
// Puerto y directorio del contexto de la ejecución (#514), con los valores
// históricos (3040, `.local/e2e-version`) para arrancarlo a mano: no comparte
// base, clave ni cuenta con `.local/e2e` ni con `.local/e2e-theme`, así que cada
// ejecución provisiona una cuenta nueva.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { loadKey, provision } from "../src/auth";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";

if (process.env.NODE_ENV !== "test") throw Error("Test process only");
const PORT = Number(process.env.E2E_PORT ?? 3040);
const dir = process.env.E2E_STATE_DIR ?? ".local/e2e-version";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
const key = loadKey(db, dir + "/auth.key");
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      createApp(db, {
        key,
        origin: process.env.APP_ORIGIN ?? process.env.E2E_APP_ORIGIN,
      }),
    ).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: PORT })),
    ),
  ),
);