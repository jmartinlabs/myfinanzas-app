import type { Database } from "bun:sqlite";

/** E2.2 migration only. The unmerged E2.1 schema8 is a different contract. */
export function budgetSchema(db: Database) {
  db.exec(`CREATE TABLE budget_contract(id INTEGER PRIMARY KEY CHECK(id=1), contract TEXT NOT NULL CHECK(contract='e2.2-presupuestos-v8')) STRICT;
    INSERT INTO budget_contract VALUES(1,'e2.2-presupuestos-v8');
    CREATE TABLE presupuestos(
      id TEXT PRIMARY KEY CHECK(id GLOB 'PRE[0-9]*' AND substr(id,4) NOT GLOB '*[^0-9]*' AND length(id)>=6),
      nombre TEXT NOT NULL CHECK(length(trim(nombre))>0),
      fuente TEXT NOT NULL CHECK(fuente IN ('Gasto real','Aportación a saldo','No aplica')),
      destino TEXT REFERENCES saldos(id) ON DELETE RESTRICT,
      estado TEXT NOT NULL CHECK(estado IN ('Activo','Inactivo')),
      revision INTEGER NOT NULL CHECK(revision>0), creado TEXT NOT NULL, actualizado TEXT NOT NULL,
      CHECK((fuente='No aplica' AND destino IS NULL) OR (fuente!='No aplica' AND destino IS NOT NULL AND destino!='S000'))
    ) STRICT;
    CREATE UNIQUE INDEX budget_contribution_destination ON presupuestos(destino) WHERE fuente='Aportación a saldo';
    CREATE TRIGGER presupuesto_id_immutable BEFORE UPDATE OF id ON presupuestos WHEN NEW.id!=OLD.id BEGIN SELECT RAISE(ABORT,'immutable budget id'); END;
    CREATE TRIGGER presupuesto_no_delete BEFORE DELETE ON presupuestos BEGIN SELECT RAISE(ABORT,'no delete'); END;
    CREATE TABLE budget_attempts(key TEXT PRIMARY KEY,hash TEXT NOT NULL,response TEXT NOT NULL,expires INTEGER NOT NULL) STRICT;
    INSERT INTO counters VALUES('presupuestos',1);
    ALTER TABLE partidas ADD COLUMN presupuesto TEXT REFERENCES presupuestos(id) ON DELETE RESTRICT;
    CREATE INDEX partidas_presupuesto ON partidas(presupuesto);
    CREATE TRIGGER partida_used_budget BEFORE UPDATE OF presupuesto ON partidas WHEN NEW.presupuesto IS NOT OLD.presupuesto AND EXISTS(SELECT 1 FROM movimientos WHERE partida=OLD.id) BEGIN SELECT RAISE(ABORT,'used budget relation'); END;
    CREATE TRIGGER budget_used_configuration BEFORE UPDATE OF fuente,destino ON presupuestos WHEN (NEW.fuente IS NOT OLD.fuente OR NEW.destino IS NOT OLD.destino) AND EXISTS(SELECT 1 FROM movimientos m JOIN partidas p ON p.id=m.partida WHERE p.presupuesto=OLD.id) BEGIN SELECT RAISE(ABORT,'used budget configuration'); END;
    UPDATE schema_version SET version=8;`);
  if (db.query("PRAGMA foreign_key_check").all().length)
    throw Error("Budget migration FK validation failed.");
}

export function assertBudgetContract(db: Database) {
  if (!db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='budget_contract'").get() ||
    (db.query("SELECT contract FROM budget_contract WHERE id=1").get() as any)?.contract !== 'e2.2-presupuestos-v8')
    throw Error("Esquema8 incompatible: se requiere el contrato E2.2, no una migración ajena.");
}
