import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Effect, Layer } from "effect";
import { readFileSync } from "node:fs";
import { openDatabase } from "../src/database";
import { backup, restore } from "../src/backup";
import { createApp } from "../src/app";
const dir = process.env.E2E_RESTORE_DIR ?? ".local/e2e";
const db = openDatabase(dir + "/demo.sqlite");
const key = readFileSync(dir + "/auth.key");
const gen = Bun.spawnSync(
  [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-o", dir + "/identity.txt"],
  { stdout: "pipe", stderr: "pipe" },
);
if (gen.exitCode !== 0) throw new Error("age-keygen failed");
const recipient = Bun.spawnSync(
  [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-y", dir + "/identity.txt"],
  { stdout: "pipe", stderr: "pipe" },
)
  .stdout.toString()
  .trim();
backup(db, key, dir + "/cut", recipient);
db.close();
restore(dir + "/cut", dir + "/restored", dir + "/identity.txt");
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
