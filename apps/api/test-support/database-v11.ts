// Genuine pre-E2.5 builder: v9 fixture plus the unchanged v10/v11 extensions.
import type { Database } from "bun:sqlite";
import { prepareV9 } from "./database-v9";
import { cyclePlanSchema } from "../src/cycle-plan-schema";
import { annualPlanSchema } from "../src/annual-plan-schema";
export function prepareV11(db: Database) {
  prepareV9(db, { origin: "demo", key_hash: null });
  cyclePlanSchema(db);
  annualPlanSchema(db);
}
