// Genuine pre-E3.2 builder: unchanged v12 fixture plus the integrated Anticipos extension.
import { Database } from "bun:sqlite";
import { prepareV12 } from "./database-v12";
import { anticipoSchema } from "../src/anticipo-schema";
export function prepareV13(db: Database) {
  prepareV12(db);
  anticipoSchema(db);
}

export function openDatabaseV13(path: string) {
  const db = new Database(path);
  prepareV13(db);
  return db;
}
