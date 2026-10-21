import { initializeProductionDatabase } from "./database";

if (process.env.NODE_ENV !== "production" || process.argv.length !== 3)
  throw new Error("Uso: NODE_ENV=production bun apps/api/src/production-init.ts RUTA_ABSOLUTA");

const db = initializeProductionDatabase(process.argv[2]);
try {
  const version = db.query("SELECT version FROM schema_version").get() as {
    version: number;
  };
  const count = db.query("SELECT count(*) AS count FROM saldos").get() as {
    count: number;
  };
  if (count.count !== 1)
    throw new Error("Inicialización no limpia.");
  process.stdout.write(`Esquema ${version.version} inicializado sin datos ficticios.\n`);
} finally {
  db.close();
}
