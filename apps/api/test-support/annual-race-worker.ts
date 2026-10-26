// Test-only independent process. Exercises the real service/IMMEDIATE transaction, no endpoint.
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { confirmAnnualPlan } from "../src/plan-anual";
import { Problem } from "../src/saldos";
if (process.env.NODE_ENV !== "test") throw Error("Test process only");
const db = new Database(process.argv[2]!);
db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;");
try {
  confirmAnnualPlan(
    db,
    2026,
    JSON.parse(readFileSync(process.argv[3]!, "utf8")),
    randomUUID(),
    Number(process.argv[4]),
  );
  process.stdout.write("SAVED");
} catch (e) {
  if (e instanceof Problem && e.code === "CONTEXT_CHANGED")
    process.stdout.write(e.code);
  else throw e;
} finally {
  db.close();
}
