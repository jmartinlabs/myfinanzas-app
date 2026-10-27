// Genuine pre-D5 builder: v15 plus the integrated E3.4 Revisión Comida schema.
import { Database } from "bun:sqlite";
import { prepareV15 } from "./database-v15";
import { revisionComidaSchema } from "../src/revision-comida-schema";
export function prepareV16(db: Database) {
  prepareV15(db);
  db.transaction(() => revisionComidaSchema(db)).immediate();
}
export function openDatabaseV16(path: string) {
  const db = new Database(path);
  prepareV16(db);
  return db;
}
