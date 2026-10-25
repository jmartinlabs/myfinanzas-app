// Independent test process; uses canonical service and its writer lock, no fixture endpoint.
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { writeMovement } from "../src/movimientos";
import { createAnticipo, confirmOpening } from "../src/anticipos";
import { Problem } from "../src/saldos";
if (process.env.NODE_ENV !== "test") throw Error("Test process only");
const db = new Database(process.argv[2]!);
db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000");
try {
  const body = JSON.parse(readFileSync(process.argv[3]!, "utf8")),
    key = process.argv[4]!,
    now = Number(process.argv[5]);
  if (process.argv[6] === "create") createAnticipo(db, body, key, now);
  else if (process.argv[6] === "photo")
    confirmOpening(db, process.argv[7]!, body, key, now);
  else writeMovement(db, body, key, null, false, now);
  process.stdout.write("SAVED");
} catch (e) {
  if (
    e instanceof Problem &&
    ["IMPACT_CHANGED", "IDEMPOTENCY_CONFLICT", "REVISION_CONFLICT"].includes(
      e.code,
    )
  )
    process.stdout.write(e.code);
  else throw e;
} finally {
  db.close();
}
