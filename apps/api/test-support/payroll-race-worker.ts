// Independent test process: genuine SQLite writer lock and service.
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { confirmPayroll } from "../src/nomina";
import { Problem } from "../src/saldos";
if (process.env.NODE_ENV !== "test") throw Error("Test only");
const db = new Database(process.argv[2]!);
db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;");
try {
  confirmPayroll(
    db,
    JSON.parse(readFileSync(process.argv[3]!, "utf8")),
    randomUUID(),
    Number(process.argv[4]),
  );
  process.stdout.write("SAVED");
} catch (e) {
  if (e instanceof Problem && e.status === 409)
    process.stdout.write("CONFLICT");
  else throw e;
} finally {
  db.close();
}
