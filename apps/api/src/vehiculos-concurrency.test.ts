import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "./database";

const now = Date.parse("2026-10-26T12:00:00Z");

test("AC-04: two independent processes create Vehicles without orphan or duplicate ficha", async () => {
  const dir = mkdtempSync(join(tmpdir(), "e33-concurrent-"));
  try {
    const path = join(dir, "concurrent.sqlite"),
      seed = openDatabase(path);
    seed.close();
    const database = resolve("apps/api/src/database.ts"),
      references = resolve("apps/api/src/referencias.ts"),
      createScript = join(dir, "create-vehicle.ts");
    writeFileSync(
      createScript,
      `import{openDatabase}from${JSON.stringify(database)};import{createReference}from${JSON.stringify(references)};const db=openDatabase(process.argv[2]);try{const r=createReference(db,{nombre:process.argv[3],tipo:'Vehículo',vehiculo:{matricula:process.argv[4]}},process.argv[5],${now});console.log(JSON.stringify({id:r.id,tipo:r.tipo}));}catch(e){console.error(String(e?.code??e));process.exitCode=1;}finally{db.close();}`,
    );
    const spawn = (name: string, matricula: string, key: string) =>
      Bun.spawn(
        [
          process.execPath,
          createScript,
          path,
          name,
          matricula,
          key,
        ],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, NODE_ENV: "test" },
        },
      );
    const children = [
        spawn("Concurrente A", "RACE A", randomUUID()),
        spawn("Concurrente B", "RACE B", randomUUID()),
      ],
      results = await Promise.all(
        children.map(async (child) => ({
          code: await child.exited,
          stdout: (await new Response(child.stdout).text()).trim(),
          stderr: (await new Response(child.stderr).text()).trim(),
        })),
      );
    expect(results.every((r) => r.code === 0)).toBe(true);
    const created = results.map((r) => JSON.parse(r.stdout) as { id: string });
    expect(created).toHaveLength(2);
    expect(new Set(created.map((r) => r.id)).size).toBe(2);
    const db = openDatabase(path);
    try {
      expect(
        db.query("SELECT COUNT(*) n FROM referencias WHERE tipo='Vehículo'").get(),
      ).toEqual({ n: 2 });
      expect(db.query("SELECT COUNT(*) n FROM fichas_vehiculo").get()).toEqual({
        n: 2,
      });
      expect(
        db
          .query(
            "SELECT COUNT(*) n FROM referencias r WHERE r.tipo='Vehículo' AND NOT EXISTS(SELECT 1 FROM fichas_vehiculo f WHERE f.referencia=r.id)",
          )
          .get(),
      ).toEqual({ n: 0 });
      expect(
        db
          .query(
            "SELECT COUNT(*) n FROM fichas_vehiculo f LEFT JOIN referencias r ON r.id=f.referencia WHERE r.id IS NULL",
          )
          .get(),
      ).toEqual({ n: 0 });
      expect(
        db
          .query(
            "SELECT f.referencia,r.id FROM fichas_vehiculo f JOIN referencias r ON r.id=f.referencia ORDER BY f.referencia",
          )
          .all(),
      ).toEqual([
        { referencia: "REF001", id: "REF001" },
        { referencia: "REF002", id: "REF002" },
      ]);
      expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(
        db
          .query(
            "SELECT COUNT(*) n FROM audit WHERE entidad='ficha_vehiculo' AND accion='alta'",
          )
          .get(),
      ).toEqual({ n: 2 });
      expect(db.query("SELECT next FROM counters WHERE name='referencias'").get()).toEqual({
        next: 3,
      });
    } finally {
      db.close();
    }
    // The same REF cannot receive a second ficha even from two independent processes.
    const second = openDatabase(path);
    try {
      second.run(
        "INSERT INTO referencias VALUES('REF900','Sin ficha concurrente','Vehículo','Activa',1,'x','x')",
      );
    } finally {
      second.close();
    }
    const insertScript = join(dir, "insert-ficha.ts");
    writeFileSync(
      insertScript,
      `import{openDatabase}from${JSON.stringify(database)};const db=openDatabase(process.argv[2]);try{db.run("INSERT INTO fichas_vehiculo VALUES('REF900',NULL,NULL,NULL,1,'x','x')");console.log('ok');}catch(e){console.log('rejected:'+String(e?.message??e?.code));}finally{db.close();}`,
    );
    const insert = () =>
      Bun.spawn([process.execPath, insertScript, path], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, NODE_ENV: "test" },
      });
    const fichaRace = await Promise.all(
      [insert(), insert()].map(async (p) => ({
        code: await p.exited,
        out: (await new Response(p.stdout).text()).trim(),
      })),
    );
    expect(fichaRace.every((r) => r.code === 0)).toBe(true);
    expect(fichaRace.filter((r) => r.out === "ok")).toHaveLength(1);
    expect(
      fichaRace.some((r) =>
        /UNIQUE constraint failed: fichas_vehiculo\.referencia/.test(r.out),
      ),
    ).toBe(true);
    const after = openDatabase(path);
    try {
      expect(
        after.query("SELECT COUNT(*) n FROM fichas_vehiculo WHERE referencia='REF900'").get(),
      ).toEqual({ n: 1 });
      expect(after.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      after.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
