// Genuine pre-COMIDA builder: v17 plus the integrated E4.1 v18 schema.
import { Database } from "bun:sqlite";
import { prepareV17 } from "./database-v17";
import { investmentSchema } from "../src/instrumento-schema";
export function prepareV18(db: Database) {
  prepareV17(db);
  db.transaction(() => investmentSchema(db)).immediate();
}
export function openDatabaseV18(path: string) {
  const db = new Database(path);
  prepareV18(db);
  return db;
}
