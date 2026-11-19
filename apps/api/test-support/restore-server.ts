import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Effect, Layer } from "effect";
import { existsSync, readFileSync } from "node:fs";
import { openDatabase } from "../src/database";
import { backup, restore } from "../src/backup";
import { createApp } from "../src/app";
const dir = process.env.E2E_RESTORE_DIR ?? ".local/e2e";
const db = openDatabase(dir + "/demo.sqlite");
const key = readFileSync(dir + "/auth.key");
// La identidad nunca se borra: si ya existe en el directorio se reutiliza, de
// modo que repetir la restauración no destruye el estado de nadie. Solo se
// genera cuando falta, porque age-keygen no sobrescribe con `-o`.
const identity = dir + "/identity.txt";
if (!existsSync(identity)) {
  const gen = Bun.spawnSync(
    [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-o", identity],
    { stdout: "pipe", stderr: "pipe" },
  );
  if (gen.exitCode !== 0) throw new Error("age-keygen failed");
}
const recipient = Bun.spawnSync(
  [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-y", identity],
  { stdout: "pipe", stderr: "pipe" },
)
  .stdout.toString()
  .trim();
backup(db, key, dir + "/cut", recipient);
db.close();
restore(dir + "/cut", dir + "/restored", identity);
const restored = openDatabase(dir + "/restored/demo.sqlite");
const app = createApp(restored, {
  key: readFileSync(dir + "/restored/auth.key"),
});
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(app).pipe(
      Layer.provide(
        BunHttpServer.layer({
          hostname: "127.0.0.1",
          port: Number(process.env.E2E_RESTORE_PORT ?? "3002"),
        }),
      ),
    ),
  ),
);
