import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { HttpApp } from "@effect/platform";
import { openDatabase } from "./database";
import { openDatabase as openV1 } from "../test-support/database-v1";
import {
  createClassification as create,
  getClassification as get,
  updateClassification as update,
  changeClassificationState as state,
  listClassification as list,
  previewClassification as preview,
  descendants,
} from "./clasificacion";
import { createSaldo, getSaldo, updateSaldo } from "./saldos";
import { Auth, provision, totp, loadKey } from "./auth";
import { backup, restore } from "./backup";
import { createApp } from "./app";
import type { Entity } from "./classification-schema";
const category = (db: Database, name = "Categoría ficticia") =>
  create(
    db,
    "categorias",
    { nombre: name, anual: "No aplica", mensual: "Gasto", referencia: false },
    randomUUID(),
  );
// Fixture construction uses the same validated write path as the application.
function existingSub(db: Database, padre: string, id = "SUB900") {
  return create(
    db,
    "subcategorias",
    { nombre: "Subcategoría ficticia " + id, padre },
    randomUUID(),
  );
}
function fixture() {
  const db = openDatabase(":memory:");
  const c = category(db),
    s = existingSub(db, c.id),
    p = create(
      db,
      "partidas",
      { nombre: "Partida ficticia", padre: s.id },
      randomUUID(),
    );
  return { db, c, s, p };
}
const snapshot = (db: Database): [string, unknown[]][] =>
  (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
  ).map(
    ({ name }) =>
      [name, db.query(`SELECT * FROM "${name}" ORDER BY rowid`).all()] as [
        string,
        unknown[],
      ],
  );

test("02 AC01/03–09/21–23: catálogo persistente, derivación y atributos propios", () => {
  const { db, c, s, p } = fixture();
  try {
    expect(c.id).toBe("CAT001");
    expect(c.grupo).toBeNull();
    expect(c.anual).toBe("No aplica");
    expect(c.mensual).toBe("Gasto");
    expect(p.categoria).toEqual({ id: c.id, nombre: c.nombre });
    expect(p.subcategoria?.id).toBe(s.id);
    expect(() =>
      create(
        db,
        "categorias",
        { nombre: "Inválida", anual: "Gasto", mensual: "Gasto" },
        randomUUID(),
      ),
    ).toThrow("campos");
    expect(() =>
      create(
        db,
        "categorias",
        {
          nombre: "Inválida",
          anual: "Otro",
          mensual: "Gasto",
          referencia: false,
        },
        randomUUID(),
      ),
    ).toThrow();
    expect(() =>
      create(
        db,
        "partidas",
        { nombre: "Inválida", padre: "SUB99999", presupuesto: "PRE001" },
        randomUUID(),
      ),
    ).toThrow();
    expect(() =>
      create(
        db,
        "partidas",
        { nombre: "Inválida", padre: "SUB99999" },
        randomUUID(),
      ),
    ).toThrow("encontrado");
    expect(() =>
      create(
        db,
        "categorias",
        { nombre: " ", anual: "Gasto", mensual: "Gasto", referencia: false },
        randomUUID(),
      ),
    ).toThrow();
    const changed = update(db, "categorias", c.id, {
      revision: c.revision,
      nombre: "Nombre vigente",
      grupo: "Grupo libre",
    });
    expect(changed.id).toBe(c.id);
    expect(changed.grupo).toBe("Grupo libre");
    expect(get(db, "partidas", p.id).categoria?.nombre).toBe("Nombre vigente");
    db.run(
      "UPDATE categorias SET anual=NULL,mensual=NULL,referencia=NULL WHERE id=?",
      [c.id],
    );
    const legacy = update(db, "categorias", c.id, {
      revision: changed.revision,
      nombre: "Otro nombre",
    });
    expect([legacy.anual, legacy.mensual, legacy.referencia]).toEqual([
      null,
      null,
      null,
    ]);
    expect(
      list(db, "partidas", new URLSearchParams({ categoria: c.id })).total,
    ).toBe(1);
    expect(
      list(db, "partidas", new URLSearchParams({ q: "No coincide" })).total,
    ).toBe(0);
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(
      db
        .query("PRAGMA table_info(partidas)")
        .all()
        .some((x: any) =>
          ["categoria", "presupuesto", "esencial"].includes(x.name),
        ),
    ).toBe(false);
  } finally {
    db.close();
  }
});

test("02 AC10: nombre SUB global, Unicode lowercase, acentos/espacios/literales conservados", () => {
  const { db, c, s } = fixture();
  try {
    const other = category(db, "Otro padre");
    const add = (nombre: string, padre = c.id) =>
      create(db, "subcategorias", { nombre, padre }, randomUUID());
    add("Café");
    expect(() => add("CAFÉ", other.id)).toThrow("duplicada");
    expect(() => add("café")).toThrow("duplicada");
    expect(add("Cafe").nombre).toBe("Cafe");
    expect(add(" Café ").nombre).toBe(" Café ");
    expect(add("Café ").nombre).toBe("Café ");
    expect(add("Cafe\u0301").nombre).toBe("Cafe\u0301"); // No NFC/NFD normalization.
    expect(add("*?").nombre).toBe("*?");
    expect(add("Cualquier literal").nombre).toBe("Cualquier literal");
    expect(() => add("*?", other.id)).toThrow("duplicada");
    add("Ñandú");
    expect(() => add("ÑANDÚ")).toThrow("duplicada");
    expect(add("Nandú").nombre).toBe("Nandú");
    add("Straße");
    expect(add("STRASSE").nombre).toBe("STRASSE");
    const attempt = randomUUID(),
      retryInput = { nombre: "Reintento de Subcategoría", padre: c.id };
    const createdSub = create(db, "subcategorias", retryInput, attempt);
    expect(create(db, "subcategorias", retryInput, attempt)).toEqual(
      createdSub,
    );
    expect(() =>
      create(
        db,
        "subcategorias",
        { ...retryInput, nombre: "Cambio del intento" },
        attempt,
      ),
    ).toThrow("otros datos");
    const inactive = add("Conservada inactiva");
    state(
      db,
      "subcategorias",
      inactive.id,
      { revision: inactive.revision },
      false,
    );
    expect(() => add("CONSERVADA INACTIVA", other.id)).toThrow("duplicada");
    expect(() =>
      update(db, "subcategorias", s.id, {
        revision: s.revision,
        nombre: "CAFÉ",
      }),
    ).toThrow("duplicada");
    expect(
      update(db, "subcategorias", s.id, {
        revision: s.revision,
        nombre: s.nombre.toUpperCase(),
      }).id,
    ).toBe(s.id);
    const corruptionFixture = add("Nombre íntegro");
    db.run("UPDATE subcategorias SET nombre=? WHERE id=?", [
      "CAFÉ",
      corruptionFixture.id,
    ]);
    expect(get(db, "subcategorias", corruptionFixture.id).integridad).toBe(
      "ERROR · Subcategoría duplicada",
    );
  } finally {
    db.close();
  }
});

test("02 AC11–14: estados sin cascada, IDs inmutables y sin borrado", () => {
  const { db, c, s, p } = fixture();
  try {
    expect(() =>
      state(db, "categorias", c.id, { revision: c.revision }, false),
    ).toThrow(p.id);
    expect(() =>
      state(db, "subcategorias", s.id, { revision: s.revision }, false),
    ).toThrow(p.id);
    let cp = state(db, "partidas", p.id, { revision: p.revision }, false);
    let cs = state(db, "subcategorias", s.id, { revision: s.revision }, false);
    let cc = state(db, "categorias", c.id, { revision: c.revision }, false);
    expect(list(db, "partidas", new URLSearchParams()).total).toBe(0);
    expect(list(db, "partidas", new URLSearchParams("estado=")).total).toBe(1);
    expect(() =>
      state(db, "partidas", p.id, { revision: cp.revision }, true),
    ).toThrow("padre");
    expect(() =>
      create(db, "partidas", { nombre: "Inválida", padre: s.id }, randomUUID()),
    ).toThrow("activo");
    cc = state(db, "categorias", c.id, { revision: cc.revision }, true);
    expect(get(db, "subcategorias", s.id).estado).toBe("Inactiva");
    cs = state(db, "subcategorias", s.id, { revision: cs.revision }, true);
    cp = state(db, "partidas", p.id, { revision: cp.revision }, true);
    for (const [kind, id] of [
      ["categorias", c.id],
      ["subcategorias", s.id],
      ["partidas", p.id],
    ] as [Entity, string][]) {
      expect(() => db.run(`DELETE FROM ${kind} WHERE id=?`, [id])).toThrow();
      expect(() =>
        db.run(`UPDATE ${kind} SET id='BAD' WHERE id=?`, [id]),
      ).toThrow();
    }
    expect(descendants(db, "categorias", c.id).map((d) => d.id)).toEqual([
      s.id,
      p.id,
    ]);
  } finally {
    db.close();
  }
});

test("02 AC15–18/20: rectificación real del catálogo, impacto indirecto y revisión concurrente", () => {
  const { db, c, s, p } = fixture();
  try {
    const other = category(db, "Destino ficticio");
    const changes = { revision: s.revision, padre: other.id };
    expect(() => update(db, "subcategorias", s.id, changes)).toThrow(
      "rectificación",
    );
    const plan = preview(db, "subcategorias", s.id, changes);
    expect(plan.dependencies.map((d) => d.id)).toEqual([p.id]);
    expect(plan.coverage).toContain("no comprobado");
    expect(plan.pending).not.toContain("Movimientos");
    expect(plan.financial?.movimientos).toEqual([]);
    expect(() =>
      update(db, "subcategorias", s.id, changes, undefined, Date.now(), {
        fingerprint: plan.fingerprint,
        motivo: "",
      }),
    ).toThrow("motivo");
    update(db, "partidas", p.id, {
      revision: p.revision,
      nombre: "Cambio concurrente",
    });
    expect(() =>
      update(db, "subcategorias", s.id, changes, undefined, Date.now(), {
        fingerprint: plan.fingerprint,
        motivo: "Corrección documentada",
      }),
    ).toThrow("dependencias");
    const refreshed = preview(db, "subcategorias", s.id, changes);
    update(db, "subcategorias", s.id, changes, undefined, Date.now(), {
      fingerprint: refreshed.fingerprint,
      motivo: "Corrección documentada",
    });
    expect(get(db, "partidas", p.id).categoria?.id).toBe(other.id);
    expect(get(db, "partidas", p.id).revision).toBe(2); // No rewriting descendant rows.
    expect(
      db
        .query(
          "SELECT motivo FROM audit WHERE entidad=? AND accion='rectificación'",
        )
        .get(s.id),
    ).toEqual({ motivo: "Corrección documentada" });
    const before = snapshot(db);
    // Technical guard contract only; no simulated financial engine is installed in the application.
    expect(() =>
      preview(
        db,
        "categorias",
        c.id,
        { revision: c.revision, anual: "Ingreso" },
        () => {
          throw Error("Source failure");
        },
      ),
    ).toThrow("Source failure");
    expect(() =>
      preview(
        db,
        "categorias",
        c.id,
        { revision: c.revision, anual: "Ingreso" },
        () => ({ blocked: true }),
      ),
    ).toThrow("protegida");
    expect(snapshot(db)).toEqual(before);
  } finally {
    db.close();
  }
});

test("02 AC02: IDs >999, idempotencia y rollback de altas", () => {
  const db = openDatabase(":memory:");
  try {
    db.run("UPDATE counters SET next=999 WHERE name='categorias'");
    const key = randomUUID(),
      input = {
        nombre: "Ficticia",
        anual: "Gasto",
        mensual: "No aplica",
        referencia: true,
      };
    const c = create(db, "categorias", input, key);
    expect(c.id).toBe("CAT999");
    expect(create(db, "categorias", input, key)).toEqual(c);
    expect(() =>
      create(db, "categorias", { ...input, nombre: "Otro" }, key),
    ).toThrow("otros datos");
    expect(category(db).id).toBe("CAT1000");
    db.exec(
      "CREATE TRIGGER fail_audit BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'test rollback'); END",
    );
    expect(() => category(db)).toThrow("rollback");
    expect(
      db.query("SELECT next FROM counters WHERE name='categorias'").get(),
    ).toEqual({ next: 1001 });
    db.exec("DROP TRIGGER fail_audit");
    expect(category(db).id).toBe("CAT1001");
  } finally {
    db.close();
  }
});

test("02 AC31: base E1.1 genuina conserva tablas completas, MFA, sesiones y backup v1/v5", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-upgrade-")),
    path = join(dir, "demo.sqlite");
  let db = openV1(path);
  try {
    const key = loadKey(db, join(dir, "auth.key")),
      password = "Contraseña efímera " + randomUUID();
    const auth = new Auth(db, key),
      enrollment = await auth.enroll(provision(db), password);
    const secret = enrollment.secret!;
    const verified = auth.verify(
      new Request("http://127.0.0.1:5173", {
        headers: { cookie: auth.challengeName + "=" + enrollment.challenge },
      }),
      totp(secret).generate(),
    );
    const saldo = createSaldo(
      db,
      {
        nombre: "Saldo previo",
        tipo: "Efectivo",
        control: "Movimientos",
        saldoApertura: "-12.34",
        objetivo: "0",
      },
      randomUUID(),
    );
    updateSaldo(db, saldo.id, { revision: saldo.revision, estado: "Inactiva" });
    db.run("UPDATE saldos SET liquidez=NULL WHERE id=?", [saldo.id]);
    const identity = join(dir, "identity.txt");
    expect(
      Bun.spawnSync(
        [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-o", identity],
        { stdout: "pipe", stderr: "pipe" },
      ).exitCode,
    ).toBe(0);
    const recipient = Bun.spawnSync(
      [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-y", identity],
      { stdout: "pipe", stderr: "pipe" },
    )
      .stdout.toString()
      .trim();
    backup(db, key, join(dir, "v1-backup"), recipient);
    const before = snapshot(db),
      saldoBefore = getSaldo(db, saldo.id);
    db.close();
    db = openDatabase(path);
    for (const [name, values] of before)
      if (name !== "schema_version" && name !== "counters")
        expect(
          db.query(`SELECT * FROM "${name}" ORDER BY rowid`).all(),
        ).toEqual(values);
    const oldCounters = before.find(([n]) => n === "counters")![1] as any[];
    for (const row of oldCounters)
      expect(
        db.query("SELECT * FROM counters WHERE name=?").get(row.name),
      ).toEqual(row);
    expect({
      ...getSaldo(db, saldo.id),
      posicion: saldoBefore.posicion,
    }).toEqual(saldoBefore);
    expect(getSaldo(db, saldo.id).posicion.importe).toBe("-12.34");
    const nextAuth = new Auth(db, readFileSync(join(dir, "auth.key")));
    expect(
      nextAuth.session(
        new Request("http://127.0.0.1:5173", {
          headers: { cookie: nextAuth.cookieName + "=" + verified.session },
        }),
      ).csrf,
    ).toBe(verified.csrf);
    const login = await nextAuth.login(password);
    const result = nextAuth.verify(
      new Request("http://127.0.0.1:5173", {
        headers: { cookie: nextAuth.challengeName + "=" + login.challenge },
      }),
      totp(secret).generate({ timestamp: Date.now() + 30000 }),
    );
    expect(result.session).toBeString();
    category(db);
    const after = snapshot(db);
    db.close();
    db = openDatabase(path);
    expect(snapshot(db)).toEqual(after);
    backup(db, key, join(dir, "v7-backup"), recipient);
    for (const version of [1, 7]) {
      const restored = restore(
        join(dir, `v${version}-backup`),
        join(dir, `restore-${version}`),
        identity,
      );
      const copy = openDatabase(restored.database);
      try {
        expect({
          ...getSaldo(copy, saldo.id),
          posicion: saldoBefore.posicion,
        }).toEqual(saldoBefore);
        expect(getSaldo(copy, saldo.id).posicion.importe).toBe("-12.34");
        expect(copy.query("SELECT * FROM sessions").all()).toEqual([]);
        expect(copy.query("SELECT * FROM categorias").all()).toHaveLength(
          version === 7 ? 1 : 0,
        );
      } finally {
        copy.close();
      }
    }
    expect(db.query("PRAGMA integrity_check").get()).toEqual({
      integrity_check: "ok",
    });
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("02 AC31: fallo de actualización revierte DDL/versión; esquema desconocido intacto", () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-fail-upgrade-")),
    path = join(dir, "demo.sqlite");
  try {
    let db = openV1(path);
    db.exec("CREATE TABLE subcategorias(incompatible TEXT)");
    const before = snapshot(db);
    db.close();
    expect(() => openDatabase(path)).toThrow();
    db = new Database(path);
    expect(snapshot(db)).toEqual(before);
    expect(
      db.query("SELECT name FROM sqlite_master WHERE name='categorias'").get(),
    ).toBeNull();
    db.exec("DROP TABLE subcategorias; UPDATE schema_version SET version=999");
    const unknown = snapshot(db);
    db.close();
    expect(() => openDatabase(path)).toThrow("compatible");
    db = new Database(path);
    expect(snapshot(db)).toEqual(unknown);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("02 AC02/31: dos procesos actualizan v1 y reservan IDs atómicamente", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-parallel-upgrade-")),
    path = join(dir, "demo.sqlite");
  try {
    openV1(path).close();
    const source = `import {openDatabase} from ${JSON.stringify(resolve("apps/api/src/database.ts"))}; import {createClassification} from ${JSON.stringify(resolve("apps/api/src/clasificacion.ts"))}; const db=openDatabase(process.argv[1]); for(let i=0;i<8;i++) createClassification(db,'categorias',{nombre:'Ficticia',anual:'Gasto',mensual:'No aplica',referencia:false},crypto.randomUUID()); db.close();`;
    const children = [0, 1].map(() =>
      Bun.spawn([process.execPath, "-e", source, path], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, NODE_ENV: "test" },
      }),
    );
    for (const child of children) {
      expect(await child.exited).toBe(0);
      expect(await new Response(child.stderr).text()).toBe("");
    }
    const db = openDatabase(path);
    try {
      expect(db.query("SELECT COUNT(*) n FROM categorias").get()).toEqual({
        n: 16,
      });
      expect(
        db.query("SELECT COUNT(DISTINCT id) n FROM categorias").get(),
      ).toEqual({ n: 16 });
      expect(db.query("SELECT COUNT(*) n FROM saldos").get()).toEqual({ n: 6 });
      const script = `import {openDatabase} from ${JSON.stringify(resolve("apps/api/src/database.ts"))}; import {createClassification} from ${JSON.stringify(resolve("apps/api/src/clasificacion.ts"))}; const db=openDatabase(process.argv[1]); try {createClassification(db,'subcategorias',{nombre:process.argv[3],padre:process.argv[2]},crypto.randomUUID()); process.stdout.write('created');} catch(e) {if(e.code!=='DUPLICATE_NAME') throw e; process.stdout.write('duplicate');} finally {db.close();}`;
      const competing = [
        ["CAT001", "Café concurrente"],
        ["CAT002", "CAFÉ CONCURRENTE"],
      ].map(([parent, name]) =>
        Bun.spawn([process.execPath, "-e", script, path, parent, name], {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, NODE_ENV: "test" },
        }),
      );
      const outcomes: string[] = [];
      for (const child of competing) {
        expect(await child.exited).toBe(0);
        outcomes.push(await new Response(child.stdout).text());
        expect(await new Response(child.stderr).text()).toBe("");
      }
      expect(outcomes.sort()).toEqual(["created", "duplicate"]);
      expect(db.query("SELECT COUNT(*) n FROM subcategorias").get()).toEqual({
        n: 1,
      });
    } finally {
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("02 AC30: Effect HTTP protege catálogos y escrituras con MFA/CSRF/Origin", async () => {
  const db = openDatabase(":memory:"),
    key = randomBytes(32);
  const handler = HttpApp.toWebHandler(createApp(db, { key }));
  const origin = "http://127.0.0.1:5173";
  const request = (
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    handler(
      new Request(origin + path, {
        method,
        headers: { origin, "content-type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  try {
    for (const k of ["categorias", "subcategorias", "partidas"])
      expect((await request("/api/clasificacion/" + k)).status).toBe(401);
    const auth = new Auth(db, key),
      enroll = await auth.enroll(
        provision(db),
        "Clave HTTP ficticia " + randomUUID(),
      );
    const verified = auth.verify(
      new Request(origin, {
        headers: { cookie: auth.challengeName + "=" + enroll.challenge },
      }),
      totp(enroll.secret!).generate(),
    );
    const cookie = auth.cookieName + "=" + verified.session;
    expect(
      (await request("/api/clasificacion/categorias", "POST", {}, { cookie }))
        .status,
    ).toBe(403);
    expect(
      (
        await request(
          "/api/clasificacion/categorias",
          "POST",
          {},
          {
            cookie,
            "x-csrf-token": verified.csrf,
            origin: "https://invalid.example",
          },
        )
      ).status,
    ).toBe(403);
    const headers = {
      cookie,
      "x-csrf-token": verified.csrf,
      "idempotency-key": randomUUID(),
    };
    const created = await request(
      "/api/clasificacion/categorias",
      "POST",
      {
        nombre: "HTTP ficticia",
        anual: "Gasto",
        mensual: "No aplica",
        referencia: true,
      },
      headers,
    );
    expect(created.status).toBe(201);
    const c = (await created.json()).item;
    expect(
      (
        await request(
          "/api/clasificacion/categorias/" + c.id,
          "PATCH",
          { revision: c.revision, nombre: "HTTP renombrada" },
          headers,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          "/api/clasificacion/categorias/" + c.id,
          "DELETE",
          undefined,
          headers,
        )
      ).status,
    ).toBe(404);
    const planResponse = await request(
      "/api/clasificacion/categorias/" + c.id + "/impacto",
      "POST",
      { revision: 2, anual: "Ingreso" },
      headers,
    );
    expect(planResponse.status).toBe(200);
    const plan = await planResponse.json();
    const applied = await request(
      "/api/clasificacion/categorias/" + c.id + "/rectificar",
      "POST",
      {
        cambios: { revision: 2, anual: "Ingreso" },
        fingerprint: plan.fingerprint,
        motivo: "Rectificación explícita",
      },
      headers,
    );
    expect(applied.status).toBe(200);
    expect(
      (
        await request(
          "/api/clasificacion/categorias/" + c.id,
          "PATCH",
          { revision: 1, nombre: "Obsoleto" },
          headers,
        )
      ).status,
    ).toBe(409);
  } finally {
    db.close();
  }
});
