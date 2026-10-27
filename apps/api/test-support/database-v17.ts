// Genuine pre-E4.1 builder: v16 plus the integrated D5 v17 schema.
import { Database } from "bun:sqlite";
import { prepareV16 } from "./database-v16";
import { compartidoAportacionSchema } from "../src/compartido-aportacion-schema";
export function prepareV17(db: Database) {
  prepareV16(db);
  db.transaction(() => compartidoAportacionSchema(db)).immediate();
}
export function openDatabaseV17(path: string) {
  const db = new Database(path);
  prepareV17(db);
  return db;
}
