// #502 E2E — fixture aislado de identidad de release. Proceso de prueba
// únicamente: no existe en la aplicación real ni toca datos reales.
//
// Puerto propio (3040) y directorio propio (`.local/e2e-version`): no comparte
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
const dir = ".local/e2e-version";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
const key = loadKey(db, dir + "/auth.key");
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      createApp(db, { key, origin: process.env.APP_ORIGIN }),
    ).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: 3040 })),
    ),
  ),
);