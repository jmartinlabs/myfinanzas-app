// Genuine pre-E3.4 builder: unchanged v13 fixture plus the integrated E3.3 vehicle schema.
import { Database } from "bun:sqlite";
import { prepareV13 } from "./database-v13";
import { vehicleSchema } from "../src/vehicle-schema";
export function prepareV14(db: Database) {
  prepareV13(db);
  db.transaction(() => vehicleSchema(db)).immediate();
}
export function openDatabaseV14(path: string) {
  const db = new Database(path);
  prepareV14(db);
  return db;
}
