// Genuine pre-E3.1 builder: unchanged v11 fixture plus the integrated payroll extension.
import { Database } from "bun:sqlite";
import { prepareV11 } from "./database-v11";
import { payrollSchema } from "../src/payroll-schema";
export function prepareV12(db: Database) {
  prepareV11(db);
  payrollSchema(db);
}

export function openDatabaseV12(path: string) {
  const db = new Database(path);
  prepareV12(db);
  return db;
}
