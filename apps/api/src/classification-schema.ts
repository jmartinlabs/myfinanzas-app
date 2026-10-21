import type { Database } from "bun:sqlite";

export const schemaVersion = 2;
export const entities = {
  categorias: { table: "categorias", prefix: "CAT", parent: null },
  subcategorias: {
    table: "subcategorias",
    prefix: "SUB",
    parent: "categorias",
  },
  partidas: { table: "partidas", prefix: "PAR", parent: "subcategorias" },
} as const;
export type Entity = keyof typeof entities;

/** Called inside the existing IMMEDIATE transaction. No seed or existing data writes. */
export function classificationSchema(db: Database) {
  db.exec(`
    CREATE TABLE categorias (
      id TEXT PRIMARY KEY, nombre TEXT NOT NULL CHECK(length(nombre)>0), grupo TEXT,
      anual TEXT CHECK(anual IN ('Ingreso','Gasto','No aplica')),
      mensual TEXT CHECK(mensual IN ('Ingreso','Gasto','Gasto compartido neto','No aplica')),
      referencia INTEGER CHECK(referencia IN (0,1)),
      estado TEXT NOT NULL CHECK(estado IN ('Activa','Inactiva')),
      revision INTEGER NOT NULL CHECK(revision>0), creado TEXT NOT NULL, actualizado TEXT NOT NULL
    ) STRICT;
    CREATE TABLE subcategorias (
      id TEXT PRIMARY KEY, nombre TEXT NOT NULL CHECK(length(nombre)>0),
      padre TEXT NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
      estado TEXT NOT NULL CHECK(estado IN ('Activa','Inactiva')),
      revision INTEGER NOT NULL CHECK(revision>0), creado TEXT NOT NULL, actualizado TEXT NOT NULL
    ) STRICT;
    CREATE TABLE partidas (
      id TEXT PRIMARY KEY, nombre TEXT NOT NULL CHECK(length(nombre)>0),
      padre TEXT NOT NULL REFERENCES subcategorias(id) ON DELETE RESTRICT,
      estado TEXT NOT NULL CHECK(estado IN ('Activa','Inactiva')),
      revision INTEGER NOT NULL CHECK(revision>0), creado TEXT NOT NULL, actualizado TEXT NOT NULL
    ) STRICT;
    CREATE INDEX subcategorias_padre ON subcategorias(padre);
    CREATE INDEX partidas_padre ON partidas(padre);
    CREATE TABLE classification_attempts (
      key TEXT PRIMARY KEY, entidad TEXT NOT NULL, hash TEXT NOT NULL,
      id TEXT NOT NULL, expires INTEGER NOT NULL
    ) STRICT;
  `);
  for (const [kind, config] of Object.entries(entities)) {
    // Table/trigger identifiers are exclusively this static, server-owned allowlist.
    db.exec(`CREATE TRIGGER ${kind}_id_immutable BEFORE UPDATE OF id ON ${config.table}
      WHEN NEW.id != OLD.id BEGIN SELECT RAISE(ABORT,'immutable id'); END;
      CREATE TRIGGER ${kind}_no_delete BEFORE DELETE ON ${config.table}
      BEGIN SELECT RAISE(ABORT,'no delete'); END;`);
    db.run("INSERT INTO counters VALUES(?,1)", [kind]);
  }
  db.run("UPDATE schema_version SET version=?", [schemaVersion]);
}
