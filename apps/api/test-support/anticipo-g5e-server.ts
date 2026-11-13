// Isolated fictional Anticipos source with real MFA. Test-only; never imported
// by the app and never pointed at real data. G5e-1 needs a catalogue with more
// than one ficha plus an empty case, so it is separate from the E3.1 fixture.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createAnticipo } from "../src/anticipos";

if (process.env.NODE_ENV !== "test") throw new Error("Test process only");

const port = Number(process.env.ANTICIPO_G5E_PORT ?? 3056);
const dir = resolve(process.env.ANTICIPO_G5E_STATE ?? ".local/e2e-anticipos-g5e");
if (!dir.startsWith(resolve(".local") + sep))
  throw new Error("State must live under .local/");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
const key = loadKey(db, dir + "/auth.key");
const now = Date.now();
const refs = [
  "Adelanto ficticio formación",
  "Anticipo ficticio viaje",
  "Anticipo ficticio compartido",
].map(
  (nombre) =>
    createAnticipo(db, { nombre }, crypto.randomUUID(), now).referencia.id,
);
for (const [id, from, to, amount] of [
  ["201", "S001", "S002", 100000],
  ["202", "S002", "S001", 50000],
] as const)
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,referencia,concepto,nota,revision,creado,actualizado) VALUES(?,'2026-01-01','Transferencia',?,?,?,?,'histórico ficticio de anticipo','',1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
    [id, amount, from, to, refs[0]],
  );
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      createApp(db, {
        key,
        origin: process.env.APP_ORIGIN ?? "http://127.0.0.1:5173",
      }),
    ).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port })),
    ),
  ),
);