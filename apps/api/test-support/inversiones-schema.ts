import { Database } from "bun:sqlite";
import { contract } from "../src/schema-contract";

/** Materialises a frozen contract in isolation for migration tests only. */
export function materializeContract(
  path: string,
  id: string,
  rows?: (db: Database) => void,
) {
  const source = contract(id),
    db = new Database(path, { create: true, strict: true });
  for (const object of source.objects)
    if (object.type === "table") db.exec(object.sql);
  for (const object of source.objects)
    if (object.type === "index") db.exec(object.sql);
  for (const object of source.objects)
    if (object.type === "trigger") db.exec(object.sql);
  db.run("INSERT INTO schema_version VALUES(?)", [source.schemaVersion]);
  db.run(
    "INSERT INTO database_origin VALUES(1,1,'demo',NULL)",
  );
  if (
    db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='budget_contract'",
      )
      .get()
  )
    db.run("INSERT INTO budget_contract VALUES(1,'e2.2-presupuestos-v8')");
  rows?.(db);
  const manifest = db
    .query(
      "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type,name",
    )
    .all() as { sql: string }[];
  if (manifest.length !== source.objects.length)
    throw new Error("Fixture de contrato incompleto.");
  db.close();
  return path;
}
