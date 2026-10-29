import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "./database";
import { prepareSchema } from "./database-schema";
import { manifest, verifyContract } from "./schema-contract";
import { materializeContract } from "../test-support/inversiones-schema";
import { openDatabaseV16 } from "../test-support/database-v16";
import { openDatabaseV17 } from "../test-support/database-v17";

const contract18 = "C18-INVERSION-306BBC5";

function files(dir: string) {
  return readdirSync(dir).sort();
}

function rejectWithoutChange(
  path: string,
  dir: string,
  journal: "delete" | "wal",
) {
  const before = readFileSync(path);
  const beforeFiles = files(dir);
  expect(() => openDatabase(path)).toThrow(
    "Contrato de esquema v18 desconocido o incompleto; no se modificará esta base.",
  );
  expect(readFileSync(path)).toEqual(before);
  expect(files(dir)).toEqual(beforeFiles);
  const check = new Database(path, { readonly: true, strict: true });
  try {
    expect(check.query("SELECT version FROM schema_version").get()).toEqual({
      version: 18,
    });
    expect(check.query("PRAGMA journal_mode").get()).toEqual({
      journal_mode: journal,
    });
  } finally {
    check.close();
  }
}

test("C18: fresh, v16→v18 and v17→v18 produce the same frozen manifest", () => {
  process.env.NODE_ENV = "test";
  const dir = mkdtempSync(join(tmpdir(), "mf-c18-manifest-"));
  try {
    const fresh = new Database(join(dir, "fresh.sqlite"));
    prepareSchema(fresh, { origin: "demo", key_hash: null });
    const expected = manifest(fresh);
    expect(verifyContract(fresh, 18)).toBe(contract18);
    fresh.close();

    const v17path = join(dir, "v17.sqlite");
    openDatabaseV17(v17path).close();
    const v17 = openDatabase(v17path);
    expect(v17.query("SELECT version FROM schema_version").get()).toEqual({
      version: 18,
    });
    expect(manifest(v17)).toEqual(expected);
    expect(verifyContract(v17, 18)).toBe(contract18);
    v17.close();

    const v16path = join(dir, "v16.sqlite");
    openDatabaseV16(v16path).close();
    const v16 = openDatabase(v16path);
    expect(v16.query("SELECT version FROM schema_version").get()).toEqual({
      version: 18,
    });
    expect(manifest(v16)).toEqual(expected);
    expect(verifyContract(v16, 18)).toBe(contract18);
    v16.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const journal of ["DELETE", "WAL"] as const) {
  test(`C18: ${journal} builder rejects before persistent PRAGMA without writes`, () => {
    process.env.NODE_ENV = "test";
    const dir = mkdtempSync(join(tmpdir(), "mf-c18-builder-"));
    try {
      const path = join(dir, "builder.sqlite");
      materializeContract(path, contract18);
      const mutation = new Database(path);
      mutation.exec(
        `PRAGMA journal_mode=${journal}; CREATE TABLE synthetic_builder(x INTEGER)`,
      );
      mutation.close();
      chmodSync(path, 0o600);
      const before = readFileSync(path);
      const beforeFiles = files(dir);
      expect(() => {
        const db = new Database(path);
        try {
          prepareSchema(db, { origin: "demo", key_hash: null });
        } finally {
          db.close();
        }
      }).toThrow(
        "Contrato de esquema v18 desconocido o incompleto; no se modificará esta base.",
      );
      expect(readFileSync(path)).toEqual(before);
      expect(files(dir)).toEqual(beforeFiles);
      const check = new Database(path, { readonly: true, strict: true });
      try {
        expect(check.query("SELECT version FROM schema_version").get()).toEqual({
          version: 18,
        });
        expect(check.query("PRAGMA journal_mode").get()).toEqual({
          journal_mode: journal.toLowerCase(),
        });
      } finally {
        check.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`C18: ${journal} valid state opens and physical variants reject without writes`, () => {
    process.env.NODE_ENV = "test";
    const dir = mkdtempSync(join(tmpdir(), "mf-c18-reject-"));
    try {
      const valid = join(dir, "valid.sqlite");
      materializeContract(valid, contract18);
      const seed = new Database(valid);
      seed.exec(`PRAGMA journal_mode=${journal}`);
      seed.close();
      chmodSync(valid, 0o600);
      const db = openDatabase(valid);
      expect(verifyContract(db, 18)).toBe(contract18);
      db.close();

      const extra = join(dir, "extra.sqlite");
      materializeContract(extra, contract18);
      const extraDb = new Database(extra);
      extraDb.exec(`PRAGMA journal_mode=${journal}; CREATE TABLE synthetic_v18(x INTEGER)`);
      extraDb.close();
      chmodSync(extra, 0o600);
      rejectWithoutChange(extra, dir, journal.toLowerCase() as "delete" | "wal");

      const trigger = join(dir, "trigger.sqlite");
      materializeContract(trigger, contract18);
      const triggerDb = new Database(trigger);
      triggerDb.exec(`PRAGMA journal_mode=${journal}; DROP TRIGGER instrumento_no_delete`);
      triggerDb.close();
      chmodSync(trigger, 0o600);
      rejectWithoutChange(trigger, dir, journal.toLowerCase() as "delete" | "wal");

      const fk = join(dir, "fk.sqlite");
      materializeContract(fk, contract18);
      const fkDb = new Database(fk);
      fkDb.exec(`PRAGMA journal_mode=${journal}; PRAGMA foreign_keys=OFF;
        INSERT INTO saldos(id,nombre,tipo,control,estado,revision,creado,actualizado)
        VALUES('S999','E','Efectivo','Inversiones','Activa',1,'x','x'),
              ('S998','I','Inversión','Inversiones','Activa',1,'x','x');
        INSERT INTO operaciones_inversion(id,clase,fecha,instrumento,saldo_efectivo,
          saldo_inversion,cantidad,precio_divisa,divisa,cambio,importe_eur,
          comision_eur,concepto,nota,estado,revision,creado,actualizado)
        VALUES('1','Compra','2026-01-01','I9999','S999','S998',1,1,'EUR',NULL,1,0,
          NULL,NULL,'Vigente',1,'x','x')`);
      fkDb.close();
      chmodSync(fk, 0o600);
      rejectWithoutChange(fk, dir, journal.toLowerCase() as "delete" | "wal");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
