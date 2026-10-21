import { test, expect } from "bun:test";
import { HttpApp } from "@effect/platform";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  existsSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { Database } from "bun:sqlite";
import { createApp } from "./app";
import { Auth, provision, totp, digest, loadKey } from "./auth";
import { openDatabase } from "./database";
import {
  createSaldo,
  getSaldo,
  updateSaldo,
  listSaldos,
  money,
  position,
  pairs,
} from "./saldos";
import { backup, restore } from "./backup";

const origin = "http://127.0.0.1:5173";
const password = "Solo pruebas locales " + randomUUID();
const input = {
  nombre: "Saldo ficticio de prueba",
  tipo: "Efectivo",
  control: "Movimientos",
};
const create = (db: Database, body: Record<string, unknown> = {}) =>
  createSaldo(db, { ...input, ...body }, randomUUID());
function fixture() {
  const db = openDatabase(":memory:"),
    key = randomBytes(32);
  let now = Date.UTC(2026, 9, 21, 12);
  const handler = HttpApp.toWebHandler(createApp(db, { key, now: () => now }));
  let cookie = "",
    csrf = "";
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const r = await handler(
      new Request(origin + path, {
        method,
        headers: {
          origin,
          "content-type": "application/json",
          cookie,
          "x-csrf-token": csrf,
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    for (const set of r.headers.getSetCookie()) {
      const pair = set.split(";")[0],
        name = pair.split("=")[0];
      cookie = cookie
        .split("; ")
        .filter((p) => p && !p.startsWith(name + "="))
        .concat(pair)
        .join("; ");
    }
    const data = await r.json();
    if (data.csrf) csrf = data.csrf;
    return { status: r.status, data, headers: r.headers };
  }
  async function enroll() {
    const bootstrap = provision(db, now),
      r = await request("/api/auth/enroll", "POST", {
        token: bootstrap,
        password,
      });
    expect(r.status).toBe(200);
    expect(r.data.secret).toBeString();
    expect((await request("/api/saldos")).status).toBe(401);
    const secret = r.data.secret;
    const verified = await request("/api/auth/mfa", "POST", {
      code: totp(secret).generate({ timestamp: now }),
    });
    expect(verified.status).toBe(200);
    expect(verified.headers.getSetCookie().join(";")).toContain(
      "HttpOnly; SameSite=Strict",
    );
    return { secret, codes: verified.data.recoveryCodes as string[] };
  }
  return {
    db,
    key,
    request,
    enroll,
    get cookie() {
      return cookie;
    },
    get csrf() {
      return csrf;
    },
    get now() {
      return now;
    },
    advance: (ms: number) => {
      now += ms;
    },
  };
}

test("AC01–08/17: persistencia, IDs, atributos independientes, estado y FK históricos", () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-"));
  try {
    const path = join(dir, "test.sqlite");
    let db = openDatabase(path);
    const s = create(db, {
      saldoApertura: "-10.25",
      fechaApertura: "2026-01-10",
    });
    expect(s.id).toBe("S006");
    expect(s.posicion.importe).toBe("-10.25");
    db.run(
      "CREATE TABLE history_fixture(id INTEGER PRIMARY KEY,saldo TEXT REFERENCES saldos(id) ON DELETE RESTRICT) STRICT",
    );
    db.run("INSERT INTO history_fixture VALUES(1,?)", [s.id]);
    let u = updateSaldo(db, s.id, {
      revision: 1,
      nombre: "Renombrado ficticio",
      liquidez: true,
    });
    expect([
      u.liquidez,
      u.mostrarComoBolsa,
      u.permiteSalidaExterior,
      u.finalidad,
      u.objetivo,
    ]).toEqual([true, false, false, null, null]);
    u = updateSaldo(db, s.id, {
      revision: u.revision,
      permiteSalidaExterior: true,
    });
    expect(u.liquidez).toBe(true);
    u = updateSaldo(db, s.id, { revision: u.revision, estado: "Inactiva" });
    expect(listSaldos(db).saldos.some((v) => v.id === s.id)).toBe(false);
    expect(
      listSaldos(db, new URLSearchParams("estado=")).saldos.some(
        (v) => v.id === s.id,
      ),
    ).toBe(true);
    u = updateSaldo(db, s.id, { revision: u.revision, estado: "Activa" });
    expect(u.saldoApertura).toBe("-10.25");
    expect(() =>
      updateSaldo(db, s.id, { revision: u.revision, id: "S999" }),
    ).toThrow("Campo no editable");
    expect(() =>
      db.run("UPDATE saldos SET id=? WHERE id=?", ["S999", s.id]),
    ).toThrow();
    expect(() => db.run("DELETE FROM saldos WHERE id=?", [s.id])).toThrow();
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    db.close();
    db = openDatabase(path);
    expect(getSaldo(db, s.id).nombre).toBe("Renombrado ficticio");
    expect(listSaldos(db).total).toBe(6);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("AC03/23: IDs atómicos más allá S999 e idempotencia de reintento", async () => {
  const db = openDatabase(":memory:");
  try {
    db.run("UPDATE counters SET next=999 WHERE name='saldo'");
    const ids = await Promise.all(
      Array.from({ length: 4 }, async () => create(db).id),
    );
    expect(ids).toEqual(["S999", "S1000", "S1001", "S1002"]);
    const key = randomUUID(),
      s = createSaldo(db, input, key);
    expect(createSaldo(db, input, key).id).toBe(s.id);
    expect(() => createSaldo(db, { ...input, nombre: "Otro" }, key)).toThrow(
      "otros datos",
    );
  } finally {
    db.close();
  }
});
test("AC06/09–12/27/34: seis pares, S000 protegido y posiciones no inventadas", () => {
  const db = openDatabase(":memory:");
  try {
    const all = listSaldos(db, new URLSearchParams("tecnico=true")).saldos;
    expect(all).toHaveLength(6);
    expect(all.map((s) => `${s.tipo}/${s.control}`)).toEqual([
      "Exterior/Exterior",
      "Efectivo/Movimientos",
      "Efectivo/Terminal",
      "Efectivo/Inversiones",
      "Inversión/Inversiones",
      "Efectivo/No controlado",
    ]);
    for (const s of all) {
      if (s.control === "Movimientos")
        expect(s.posicion.importe).toBe(s.saldoApertura ?? "0.00");
      else expect(s.posicion.importe).toBeNull();
    }
    expect(getSaldo(db, "S002").posicion.motivo).toContain("Terminal");
    expect(getSaldo(db, "S005").posicion.motivo).toContain("No controlado");
    expect(() =>
      updateSaldo(db, "S000", { revision: 1, nombre: "Alterado" }),
    ).toThrow("protegida");
    expect(() => create(db, { tipo: "Exterior", control: "Exterior" })).toThrow(
      "no habilitada",
    );
    expect(() => create(db, { control: "Manual" })).toThrow("no habilitada");
    expect(position("Manual")).toMatchObject({ importe: null });
    expect(position("Manual", "-8.30")).toMatchObject({ importe: "-8.30" });
    expect(() =>
      db.run("UPDATE saldos SET apertura=1 WHERE id='S000'"),
    ).toThrow();
  } finally {
    db.close();
  }
});
test("AC13/29/33/35/41: precisión, fechas, M1/M2 y ausencias históricas", () => {
  const db = openDatabase(":memory:");
  try {
    for (const [tipo, controls] of Object.entries(pairs))
      for (const control of controls) {
        const empty = create(db, { tipo, control });
        expect([
          empty.fechaApertura,
          empty.saldoApertura,
          empty.objetivo,
        ]).toEqual([null, null, null]);
        expect(
          create(db, { tipo, control, fechaApertura: "2026-02-28" })
            .saldoApertura,
        ).toBeNull();
        expect(
          create(db, { tipo, control, saldoApertura: "0" }).saldoApertura,
        ).toBe("0.00");
        expect(
          create(db, {
            tipo,
            control,
            saldoApertura: "-0.01",
            fechaApertura: "2026-02-28",
          }).saldoApertura,
        ).toBe("-0.01");
      }
    const s = create(db, {
      saldoApertura: "92233720368547758.07",
      objetivo: "-4.25",
      liquidez: true,
    });
    expect(s.saldoApertura).toBe("92233720368547758.07");
    expect(s.objetivo).toBe("-4.25");
    expect(money("-92233720368547758.08")).toBe(-9223372036854775808n);
    for (const body of [
      { saldoApertura: "1.001" },
      { objetivo: 1.1 },
      { saldoApertura: "92233720368547758.08" },
      { fechaApertura: "2026-02-30" },
      { liquidez: null },
      { mostrarComoBolsa: "false" },
      { control: "Manual" },
      { tipo: "__proto__" },
    ])
      expect(() => create(db, body)).toThrow();
    const u = updateSaldo(db, s.id, {
      revision: s.revision,
      nombre: "Sin reiniciar",
    });
    expect(u.liquidez).toBe(true);
    db.run("UPDATE saldos SET liquidez=NULL WHERE id=?", [s.id]);
    const legacy = updateSaldo(db, s.id, {
      revision: u.revision,
      nombre: "Ausencia conservada",
    });
    expect(legacy.liquidez).toBeNull();
    expect(legacy.mostrarComoBolsa).toBe(false);
    const explicit = updateSaldo(db, s.id, {
      revision: legacy.revision,
      liquidez: false,
    });
    expect(explicit.liquidez).toBe(false);
  } finally {
    db.close();
  }
});
test("AC14–16: revisión concurrente, guard de impacto y rollback de auditoría", () => {
  const db = openDatabase(":memory:");
  try {
    const s = create(db);
    updateSaldo(db, s.id, { revision: 1, nombre: "Primero" });
    expect(() =>
      updateSaldo(db, s.id, { revision: 1, nombre: "Segundo" }),
    ).toThrow("cambiado");
    expect(() =>
      updateSaldo(
        db,
        s.id,
        { revision: 2, saldoApertura: "100" },
        (_id, fields) => fields.includes("saldoApertura"),
      ),
    ).toThrow("rectificación");
    expect(getSaldo(db, s.id).saldoApertura).toBeNull();
    db.run(
      "CREATE TRIGGER fail_audit BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'fixture disk failure'); END",
    );
    expect(() =>
      updateSaldo(db, s.id, { revision: 2, nombre: "No persistir" }),
    ).toThrow();
    expect(getSaldo(db, s.id)).toMatchObject({
      nombre: "Primero",
      revision: 2,
    });
    const next = (
      db.query("SELECT next FROM counters WHERE name='saldo'").get() as {
        next: number;
      }
    ).next;
    expect(() => create(db)).toThrow();
    expect(
      (
        db.query("SELECT next FROM counters WHERE name='saldo'").get() as {
          next: number;
        }
      ).next,
    ).toBe(next);
  } finally {
    db.close();
  }
});
test("AC18–20: Effect HTTP exige contraseña+MFA, sesión, CSRF, origen y caducidad", async () => {
  const f = fixture();
  try {
    expect((await f.request("/api/saldos")).status).toBe(401);
    const { secret } = await f.enroll();
    expect((await f.request("/api/saldos")).data.total).toBe(5);
    expect(
      (
        await f.request("/api/saldos", "POST", input, {
          "idempotency-key": randomUUID(),
          "x-csrf-token": "",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await f.request("/api/saldos", "POST", input, {
          "idempotency-key": randomUUID(),
          origin: "http://evil.invalid",
        })
      ).status,
    ).toBe(403);
    const s = await f.request("/api/saldos", "POST", input, {
      "idempotency-key": randomUUID(),
    });
    expect(s.status).toBe(201);
    expect(
      (await f.request("/api/saldos/" + s.data.saldo.id)).data.saldo.id,
    ).toBe(s.data.saldo.id);
    expect(
      (
        await f.request("/api/saldos/S000", "PATCH", {
          revision: 1,
          nombre: "No",
        })
      ).status,
    ).toBe(409);
    expect((await f.request("/api/saldos/S99999")).status).toBe(404);
    expect(
      (await f.request("/api/auth/login", "POST", { password })).status,
    ).toBe(200);
    expect(
      (
        await f.request("/api/auth/mfa", "POST", {
          code: totp(secret).generate({ timestamp: f.now }),
        })
      ).status,
    ).toBe(401);
    f.advance(1800000);
    expect((await f.request("/api/saldos")).status).toBe(401);
    expect(() => new Auth(f.db, f.key, "http://0.0.0.0:5173")).toThrow(
      "loopback",
    );
    expect(
      new Auth(f.db, f.key, "https://myfinanzas.pp.ua").cookie(
        "__Host-mf_session",
        "example",
        5,
      ),
    ).toContain("; Secure");
  } finally {
    f.db.close();
  }
});
test("AC19: desafíos vencidos, rate limit persistente, límite absoluto y logout", async () => {
  const f = fixture();
  try {
    const { secret } = await f.enroll();
    for (let i = 0; i < 4; i++)
      expect(
        (await f.request("/api/auth/login", "POST", { password: "Incorrecta" }))
          .status,
      ).toBe(401);
    expect(
      (await f.request("/api/auth/login", "POST", { password: "Incorrecta" }))
        .status,
    ).toBe(401);
    expect(
      (await f.request("/api/auth/login", "POST", { password })).status,
    ).toBe(429);
    f.advance(1001);
    expect(
      (await f.request("/api/auth/login", "POST", { password })).status,
    ).toBe(200);
    f.advance(300001);
    expect(
      (
        await f.request("/api/auth/mfa", "POST", {
          code: totp(secret).generate({ timestamp: f.now }),
        })
      ).status,
    ).toBe(401);
    f.db.run("DELETE FROM auth_limits");
    await f.request("/api/auth/login", "POST", { password });
    await f.request("/api/auth/mfa", "POST", {
      code: totp(secret).generate({ timestamp: f.now }),
    });
    for (let h = 0; h < 24; h++) {
      f.advance(1799000);
      await f.request("/api/auth/session");
    }
    f.advance(60000);
    expect((await f.request("/api/saldos")).status).toBe(401);
  } finally {
    f.db.close();
  }
});
test("AC21: recuperación exige contraseña+código, consume y revoca sesiones previas", async () => {
  const f = fixture();
  try {
    const { codes } = await f.enroll();
    const oldCookie = f.cookie;
    const reset = await f.request("/api/auth/recover", "POST", {
      password,
      code: codes[0],
    });
    expect(reset.status).toBe(200);
    expect(
      (await f.request("/api/saldos", "GET", undefined, { cookie: oldCookie }))
        .status,
    ).toBe(401);
    expect(
      (
        await f.request("/api/auth/recover", "POST", {
          password,
          code: codes[0],
        })
      ).status,
    ).toBe(401);
    const verified = await f.request("/api/auth/mfa", "POST", {
      code: totp(reset.data.secret).generate({ timestamp: f.now }),
    });
    expect(verified.status).toBe(200);
    expect(verified.data.recoveryCodes).toHaveLength(10);
    expect(
      f.db
        .query("SELECT hash FROM recovery WHERE hash=?")
        .get(digest(codes[0])),
    ).toBeNull();
    expect((await f.request("/api/auth/logout", "POST", {})).status).toBe(200);
    expect((await f.request("/api/saldos")).status).toBe(401);
  } finally {
    f.db.close();
  }
});
test("errores HTTP no revelan SQL y rechazan tamaños/campos no editables", async () => {
  const f = fixture();
  try {
    await f.enroll();
    expect(
      (
        await f.request(
          "/api/saldos",
          "POST",
          { ...input, nombre: "a".repeat(17000) },
          { "idempotency-key": randomUUID() },
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await f.request("/api/saldos/S001", "PATCH", {
          revision: 1,
          id: "S888",
        })
      ).status,
    ).toBe(422);
    f.db.run(
      "CREATE TRIGGER fail_fixture BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'private SQL detail'); END",
    );
    const r = await f.request("/api/saldos", "POST", input, {
      "idempotency-key": randomUUID(),
    });
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.data)).not.toContain("private SQL");
    expect(r.headers.get("cache-control")).toBe("no-store");
  } finally {
    f.db.close();
  }
});
test("AC24–26: backup WAL consistente/cifrado, restauración aislada, antigüedad y fallos", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-backup-"));
  const f = fixture();
  try {
    const identity = join(dir, "identity.txt");
    const keygen = Bun.spawnSync(
      [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-o", identity],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(keygen.exitCode).toBe(0);
    const pub = Bun.spawnSync(
      [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-y", identity],
      { stdout: "pipe", stderr: "pipe" },
    )
      .stdout.toString()
      .trim();
    const { secret, codes } = await f.enroll();
    const s = create(f.db, { saldoApertura: "-100.25", objetivo: "0" });
    const dest = join(dir, "cut");
    backup(f.db, f.key, dest, pub, f.now);
    expect(readdirSync(dest).sort()).toEqual([
      "access-key.age",
      "database.age",
    ]);
    expect(readFileSync(join(dest, "database.age"), "utf8")).not.toContain(
      "Saldo ficticio",
    );
    updateSaldo(f.db, s.id, {
      revision: s.revision,
      nombre: "Posterior al corte",
    });
    const restored = restore(dest, join(dir, "restored"), identity, {
      now: f.now,
    });
    const db = new Database(restored.database, { strict: true });
    try {
      expect(getSaldo(db, s.id)).toEqual(s);
      expect(db.query("SELECT * FROM sessions").all()).toEqual([]);
      expect(db.query("SELECT * FROM recovery").all()).toEqual([]);
      const auth = new Auth(
        db,
        readFileSync(restored.key),
        origin,
        () => f.now + 30000,
      );
      const l = await auth.login(password);
      const result = auth.verify(
        new Request(origin, {
          headers: { cookie: auth.challengeName + "=" + l.challenge },
        }),
        totp(secret).generate({ timestamp: f.now + 30000 }),
      );
      expect(result.recoveryCodes).toHaveLength(10);
      expect(result.recoveryCodes).not.toContain(codes[0]);
    } finally {
      db.close();
    }
    expect(() =>
      restore(dest, join(dir, "old"), identity, { now: f.now + 86400001 }),
    ).toThrow("Antigüedad");
    expect(() =>
      restore(dest, join(dir, "wrong"), join(dir, "missing-key"), {
        now: f.now,
      }),
    ).toThrow("age");
    writeFileSync(join(dir, "block"), "not-directory");
    expect(() =>
      backup(f.db, f.key, join(dir, "block", "copy"), pub),
    ).toThrow();
    expect(() => backup(f.db, f.key, dest, pub)).toThrow("existe");
    const corrupt = join(dir, "corrupt");
    backup(f.db, f.key, corrupt, pub, f.now);
    writeFileSync(join(corrupt, "database.age"), "interrupted");
    expect(() =>
      restore(corrupt, join(dir, "bad-restore"), identity, { now: f.now }),
    ).toThrow("age");
    const wrongIdentity = join(dir, "wrong-identity.txt");
    expect(
      Bun.spawnSync(
        [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-o", wrongIdentity],
        { stderr: "pipe" },
      ).exitCode,
    ).toBe(0);
    expect(() =>
      restore(dest, join(dir, "wrong-valid-key"), wrongIdentity, {
        now: f.now,
      }),
    ).toThrow("age");
    f.db.run("UPDATE schema_version SET version=999");
    expect(() =>
      backup(f.db, f.key, join(dir, "invalid-schema"), pub, f.now),
    ).toThrow("compatible");
    expect(existsSync(join(dir, "invalid-schema"))).toBe(false);
    expect(existsSync(join(dir, "bad-restore"))).toBe(false);
    expect(
      readdirSync(dir).some(
        (p) => p.startsWith(".backup-") || p.startsWith(".restore-"),
      ),
    ).toBe(false);
    expect(getSaldo(f.db, s.id).nombre).toBe("Posterior al corte");
  } finally {
    f.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("clave externa no se regenera al faltar para un usuario existente", async () => {
  const f = fixture();
  const dir = mkdtempSync(join(tmpdir(), "mf-key-"));
  try {
    await f.enroll();
    expect(() => loadKey(f.db, join(dir, "missing"))).toThrow(
      "no se regenerará",
    );
  } finally {
    f.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("AC24: snapshot de archivo WAL mientras otro proceso confirma escrituras", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-wal-"));
  const path = join(dir, "source.sqlite"),
    db = openDatabase(path),
    key = randomBytes(32);
  try {
    db.exec(
      "PRAGMA wal_autocheckpoint=0;CREATE TABLE consistency_fixture(a INTEGER NOT NULL,b INTEGER NOT NULL) STRICT;INSERT INTO consistency_fixture VALUES(0,0)",
    );
    const identity = join(dir, "identity.txt");
    expect(
      Bun.spawnSync(
        [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-o", identity],
        { stderr: "pipe" },
      ).exitCode,
    ).toBe(0);
    const recipient = Bun.spawnSync(
      [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-y", identity],
      { stderr: "pipe" },
    )
      .stdout.toString()
      .trim();
    const writer = Bun.spawn(
      [
        process.execPath,
        "-e",
        `import{Database}from'bun:sqlite';import{writeFileSync}from'node:fs';const db=new Database(process.argv[1]);db.exec('PRAGMA busy_timeout=3000;PRAGMA wal_autocheckpoint=0');writeFileSync(process.argv[2],'ready');let n=0;const task=setInterval(()=>{db.transaction(()=>{db.run('UPDATE consistency_fixture SET a=a+1');db.run('UPDATE consistency_fixture SET b=b+1')})();if(++n===100){clearInterval(task);db.close();}},2);`,
        path,
        join(dir, "ready"),
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    try {
      for (let i = 0; i < 200 && !existsSync(join(dir, "ready")); i++)
        await Bun.sleep(5);
      expect(existsSync(join(dir, "ready"))).toBe(true);
      backup(db, key, join(dir, "cut"), recipient);
      expect(await writer.exited).toBe(0);
      const restored = restore(
        join(dir, "cut"),
        join(dir, "restored"),
        identity,
      );
      const rd = new Database(restored.database, { readonly: true });
      try {
        const pair = rd.query("SELECT a,b FROM consistency_fixture").get() as {
          a: number;
          b: number;
        };
        expect(pair.a).toBe(pair.b);
        expect(pair.a).toBeLessThanOrEqual(100);
        expect(
          (db.query("SELECT a FROM consistency_fixture").get() as { a: number })
            .a,
        ).toBe(100);
      } finally {
        rd.close();
      }
    } finally {
      writer.kill();
    }
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("AC26: fallo simulado ENOSPC en cifrado limpia temporales y conserva copia anterior", () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-space-")),
    db = openDatabase(":memory:"),
    key = randomBytes(32);
  const previous = process.env.AGE_BIN;
  try {
    const identity = join(dir, "identity.txt");
    Bun.spawnSync(
      [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-o", identity],
      { stderr: "pipe" },
    );
    const recipient = Bun.spawnSync(
      [process.env.AGE_KEYGEN_BIN ?? "age-keygen", "-y", identity],
      { stderr: "pipe" },
    )
      .stdout.toString()
      .trim();
    backup(db, key, join(dir, "good"), recipient);
    // Isolated external-tool failure, not a write to /dev/full or exhaustion of the host disk.
    const fake = join(dir, "fake-age");
    writeFileSync(
      fake,
      '#!/bin/sh\necho "No space left on device" >&2\nexit 1\n',
      { mode: 0o700 },
    );
    process.env.AGE_BIN = fake;
    expect(() => backup(db, key, join(dir, "failed"), recipient)).toThrow(
      "age",
    );
    expect(existsSync(join(dir, "failed"))).toBe(false);
    expect(existsSync(join(dir, "good", "database.age"))).toBe(true);
    expect(readdirSync(dir).some((p) => p.startsWith(".backup-"))).toBe(false);
  } finally {
    if (previous) process.env.AGE_BIN = previous;
    else delete process.env.AGE_BIN;
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("AC03: dos procesos reservan IDs sin duplicarlos y dos conexiones detectan revisión obsoleta", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-concurrency-")),
    path = join(dir, "source.sqlite");
  const db = openDatabase(path);
  try {
    const script = `import{openDatabase}from'./apps/api/src/database.ts';import{createSaldo}from'./apps/api/src/saldos.ts';import{randomUUID}from'node:crypto';const db=openDatabase(process.argv[1]);for(let n=0;n<10;n++)createSaldo(db,{nombre:'Concurrencia ficticia',tipo:'Efectivo',control:'Movimientos'},randomUUID());db.close();`;
    const jobs = [0, 1].map(() =>
      Bun.spawn([process.execPath, "-e", script, path], {
        stdout: "pipe",
        stderr: "pipe",
      }),
    );
    const results = await Promise.all(
      jobs.map(async (j) => {
        const [code, stdout, stderr] = await Promise.all([
          j.exited,
          new Response(j.stdout).text(),
          new Response(j.stderr).text(),
        ]);
        return { code, stdout, stderr };
      }),
    );
    for (const result of results)
      expect(
        result,
        "Proceso hijo de concurrencia (solo fixtures ficticios)",
      ).toMatchObject({ code: 0, stderr: "" });
    const ids = (
      db
        .query("SELECT id FROM saldos WHERE nombre='Concurrencia ficticia'")
        .all() as { id: string }[]
    ).map((v) => v.id);
    expect(new Set(ids).size).toBe(20);
    const other = openDatabase(path);
    try {
      const s = getSaldo(db, ids[0]);
      updateSaldo(other, s.id, {
        revision: s.revision,
        nombre: "Ganador ficticio",
      });
      expect(() =>
        updateSaldo(db, s.id, {
          revision: s.revision,
          nombre: "No sobrescribe",
        }),
      ).toThrow("cambiado");
    } finally {
      other.close();
    }
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("semilla demo solo en development/test; otros entornos no crean ni modifican bases", () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-environment-"));
  const script =
    "import {openDatabase} from './apps/api/src/database.ts'; const db=openDatabase(process.argv[1]); db.close();";
  const run = (path: string, mode: string | undefined) => {
    const env = { ...process.env };
    if (mode === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = mode;
    return Bun.spawnSync([process.execPath, "-e", script, path], {
      env,
      stdout: "pipe",
      stderr: "pipe",
    });
  };
  try {
    for (const mode of [undefined, "production", "staging"]) {
      const path = join(dir, mode ?? "missing", "demo.sqlite");
      const result = run(path, mode);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("E1.1 solo admite");
      expect(existsSync(join(dir, mode ?? "missing"))).toBe(false);
    }
    const setup = Bun.spawnSync([process.execPath, "run", "setup"], {
      env: {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_PATH: join(dir, "setup", "demo.sqlite"),
        AUTH_KEY_PATH: join(dir, "setup", "auth.key"),
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(setup.exitCode).not.toBe(0);
    expect(setup.stderr.toString()).toContain("Alta rechazada");
    expect(existsSync(join(dir, "setup"))).toBe(false);
    for (const mode of ["development", "test"]) {
      const path = join(dir, mode, "demo.sqlite");
      expect(run(path, mode).exitCode).toBe(0);
      expect(run(path, mode).exitCode).toBe(0);
      const db = new Database(path, { readonly: true });
      expect(
        (db.query("SELECT COUNT(*) n FROM saldos").get() as { n: number }).n,
      ).toBe(6);
      db.close();
      const before = readFileSync(path);
      expect(run(path, "production").exitCode).not.toBe(0);
      expect(readFileSync(path).equals(before)).toBe(true);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("inicialización espera a un escritor concurrente sin upgrade de transacción diferida", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mf-initialization-lock-")),
    path = join(dir, "source.sqlite"),
    marker = join(dir, "started");
  const db = openDatabase(path);
  let terminate: (() => Promise<void>) | undefined;
  try {
    db.exec("BEGIN IMMEDIATE");
    const script = `import{writeFileSync}from'node:fs';import{openDatabase}from'./apps/api/src/database.ts';writeFileSync(process.argv[2],'started');openDatabase(process.argv[1]).close();`;
    const child = Bun.spawn([process.execPath, "-e", script, path, marker], {
      stdout: "pipe",
      stderr: "pipe",
    });
    terminate = async () => {
      child.kill();
      await child.exited;
    };
    const result = Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    const deadline = Date.now() + 2000;
    while (!existsSync(marker) && Date.now() < deadline) await Bun.sleep(5);
    expect(existsSync(marker)).toBe(true);
    // Deliberately hold the writer lock to distinguish waiting from an immediate SQLITE_BUSY.
    const early = await Promise.race([
      result.then((r) => ({ exited: r })),
      Bun.sleep(150).then(() => ({ waiting: true })),
    ]);
    db.exec("COMMIT");
    const [code, stdout, stderr] = await result;
    expect({ code, stdout, stderr }).toEqual({
      code: 0,
      stdout: "",
      stderr: "",
    });
    expect(early).toEqual({ waiting: true });
    expect(listSaldos(db, new URLSearchParams("tecnico=true")).total).toBe(6);
  } finally {
    if (db.inTransaction) db.exec("ROLLBACK");
    await terminate?.();
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
