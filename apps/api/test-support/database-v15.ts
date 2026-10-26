// Genuine pre-E3.4 builder: v14 plus the integrated E3.2 Compartidos/Base B schema.
import { Database } from "bun:sqlite";
import { prepareV14 } from "./database-v14";
import { compartidoSchema } from "../src/compartido-schema";
export function prepareV15(db: Database) {
  prepareV14(db);
  db.transaction(() => compartidoSchema(db)).immediate();
}
export function openDatabaseV15(path: string) {
  const db = new Database(path);
  prepareV15(db);
  return db;
}
