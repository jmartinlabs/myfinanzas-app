// Test process only; the real app has no fixture endpoint or authentication bypass.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { openDatabase } from "../../apps/api/src/database";
import { provision, loadKey } from "../../apps/api/src/auth";
const dir = ".local/e2e";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
process.env.DATABASE_PATH = dir + "/demo.sqlite";
process.env.AUTH_KEY_PATH = dir + "/auth.key";
const db = openDatabase(process.env.DATABASE_PATH);
loadKey(db, process.env.AUTH_KEY_PATH);
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
db.close();
await import("../../apps/api/src/main");
