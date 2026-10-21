import { inspectIdentity, keyHash } from "./database-identity";
import { productionConfig, verifyProductionFiles } from "./private-state";
import type { Database } from "bun:sqlite";
import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  chmodSync,
} from "node:fs";
import { dirname } from "node:path";
import { TOTP, Secret } from "otpauth";
import { Problem } from "./saldos";

export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("base64url");
export function loadKey(db: Database, path: string) {
  if (inspectIdentity(db)?.origin === "production") {
    if (process.env.NODE_ENV !== "production")
      throw new Error("Clave productiva fuera de su entorno.");
    const config = productionConfig();
    if (path !== config.key) throw new Error("AUTH_KEY_PATH no coincide.");
    if (db.filename !== config.database)
      throw new Error("Conexión distinta de DATABASE_PATH.");
    const key = verifyProductionFiles(config);
    if (inspectIdentity(db)?.key_hash !== keyHash(key))
      throw new Error("Pareja DB/clave inválida en conexión efectiva.");
    new Auth(db, key, config.origin).checkKey();
    return key;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Clave demo no admitida en producción.");
  if (!existsSync(path)) {
    if (db.query("SELECT id FROM owner").get())
      throw new Error(
        "Falta la clave de acceso. Restaura el paquete de recuperación; no se regenerará automáticamente.",
      );
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    writeFileSync(path, randomBytes(32), { mode: 0o600, flag: "wx" });
  }
  chmodSync(path, 0o600);
  const key = readFileSync(path);
  if (key.length !== 32) throw new Error("Clave de acceso inválida.");
  return key;
}
function seal(secret: string, key: Buffer) {
  const nonce = randomBytes(12),
    c = createCipheriv("aes-256-gcm", key, nonce);
  const data = Buffer.concat([c.update(secret, "utf8"), c.final()]);
  return [
    "v1",
    nonce.toString("base64"),
    c.getAuthTag().toString("base64"),
    data.toString("base64"),
  ].join(".");
}
function unseal(text: string, key: Buffer) {
  const [v, nonce, tag, data] = text.split(".");
  if (v !== "v1") throw new Error("Unsupported key version");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(nonce, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    d.update(Buffer.from(data, "base64")),
    d.final(),
  ]).toString("utf8");
}
export function totp(secret: string) {
  return new TOTP({
    issuer: "MyFinanzas",
    label: "Usuario único",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}
type Owner = {
  password: string;
  secret: string;
  enabled: number;
  last_step: number;
};
type Session = { csrf: string; created: number; seen: number };
export function provision(db: Database, now = Date.now()) {
  const row = db.query("SELECT enabled FROM owner WHERE id=1").get() as {
    enabled: number;
  } | null;
  if (row?.enabled)
    throw new Error(
      "El usuario ya está configurado; no existe reinicio administrativo automático.",
    );
  const value = token();
  db.transaction(() => {
    db.run("DELETE FROM bootstrap");
    db.run("INSERT INTO bootstrap VALUES(?,?)", [digest(value), now + 600000]);
  })();
  return value;
}
export class Auth {
  readonly cookieName: string;
  readonly challengeName: string;
  readonly origin: string;
  readonly secure: boolean;
  constructor(
    readonly db: Database,
    readonly key: Buffer,
    origin = "http://127.0.0.1:5173",
    readonly now = Date.now,
  ) {
    const u = new URL(origin);
    if (
      u.protocol !== "https:" &&
      !(
        u.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname)
      )
    )
      throw new Error("HTTP solo permitido en loopback.");
    this.origin = u.origin;
    this.secure = u.protocol === "https:";
    this.cookieName = this.secure ? "__Host-mf_session" : "mf_local_session";
    this.challengeName = this.secure
      ? "__Host-mf_challenge"
      : "mf_local_challenge";
  }
  owner() {
    return this.db
      .query("SELECT password,secret,enabled,last_step FROM owner WHERE id=1")
      .get() as Owner | null;
  }
  checkKey() {
    const o = this.owner();
    if (o) totp(unseal(o.secret, this.key));
  }
  configured() {
    return Boolean(this.owner());
  }
  cookie(name: string, value: string, maxAge: number) {
    return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${this.secure ? "; Secure" : ""}`;
  }
  readCookie(req: Request, name: string) {
    return (
      (req.headers.get("cookie") ?? "")
        .split(";")
        .map((p) => p.trim())
        .find((p) => p.startsWith(name + "="))
        ?.slice(name.length + 1) ?? ""
    );
  }
  sameOrigin(req: Request) {
    if (req.headers.get("origin") !== this.origin)
      throw new Problem(403, "ORIGIN", "Origen de la petición no autorizado.");
  }
  session(req: Request) {
    const raw = this.readCookie(req, this.cookieName),
      hash = digest(raw),
      s = this.db
        .query("SELECT csrf,created,seen FROM sessions WHERE hash=?")
        .get(hash) as Session | null;
    const now = this.now();
    if (!raw || !s || now - s.seen >= 1800000 || now - s.created >= 43200000) {
      if (s) this.db.run("DELETE FROM sessions WHERE hash=?", [hash]);
      throw new Problem(401, "AUTH_REQUIRED", "Inicia sesión para continuar.");
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      this.sameOrigin(req);
      const provided = req.headers.get("x-csrf-token") ?? "";
      if (
        Buffer.byteLength(provided) !== Buffer.byteLength(s.csrf) ||
        !timingSafeEqual(Buffer.from(provided), Buffer.from(s.csrf))
      )
        throw new Problem(403, "CSRF", "No se pudo verificar la petición.");
    }
    this.db.run("UPDATE sessions SET seen=? WHERE hash=?", [now, hash]);
    return s;
  }
  event(action: string) {
    // No IP, payload, credentials or financial data; bounded to 1,000 events / 24h.
    this.db.run("DELETE FROM auth_events WHERE instante<?", [
      this.now() - 86400000,
    ]);
    this.db.run("INSERT INTO auth_events(accion,instante) VALUES(?,?)", [
      action,
      this.now(),
    ]);
    this.db.run(
      "DELETE FROM auth_events WHERE id IN(SELECT id FROM auth_events ORDER BY id DESC LIMIT -1 OFFSET 1000)",
    );
  }
  rate() {
    const row = this.db
      .query("SELECT failures,window,blocked FROM auth_limits WHERE id=1")
      .get() as { failures: number; window: number; blocked: number } | null;
    if (row && row.blocked > this.now())
      throw new Problem(
        429,
        "RATE_LIMIT",
        "Demasiados intentos. Espera antes de volver a probar.",
      );
  }
  failure(): never {
    const now = this.now();
    const row = this.db
      .query("SELECT failures,window FROM auth_limits WHERE id=1")
      .get() as { failures: number; window: number } | null;
    const n = row && now - row.window < 900000 ? row.failures + 1 : 1,
      window = row && now - row.window < 900000 ? row.window : now;
    this.db.run("INSERT OR REPLACE INTO auth_limits VALUES(1,?,?,?)", [
      n,
      window,
      n >= 5 ? now + Math.min(60000, 1000 * 2 ** Math.min(n - 5, 6)) : 0,
    ]);
    this.event("acceso-fallido");
    throw new Problem(401, "ACCESS_DENIED", "No se pudo verificar el acceso.");
  }
  challenge() {
    const raw = token();
    this.db.run(
      "DELETE FROM challenges WHERE hash IN(SELECT hash FROM challenges ORDER BY expires DESC,hash LIMIT -1 OFFSET 19)",
    );
    this.db.run("DELETE FROM challenges WHERE expires<?", [this.now()]);
    this.db.run("INSERT INTO challenges VALUES(?,?,0)", [
      digest(raw),
      this.now() + 300000,
    ]);
    return raw;
  }
  enrollment(o: Owner) {
    const otp = totp(unseal(o.secret, this.key));
    return {
      needsEnrollment: true,
      uri: otp.toString(),
      secret: otp.secret.base32,
    };
  }
  async enroll(bootstrapToken: unknown, password: unknown) {
    this.rate();
    if (
      typeof bootstrapToken !== "string" ||
      typeof password !== "string" ||
      password.length < 15 ||
      password.length > 128
    )
      throw new Problem(
        422,
        "VALIDATION",
        "Contraseña entre 15 y 128 caracteres y token local obligatorios.",
      );
    const valid = this.db
      .query("SELECT hash FROM bootstrap WHERE hash=? AND expires>?")
      .get(digest(bootstrapToken), this.now());
    if (!valid || this.owner()?.enabled) this.failure();
    const hash = await Bun.password.hash(password, {
      algorithm: "argon2id",
      memoryCost: 65536,
      timeCost: 3,
    });
    const secret = new Secret({ size: 20 }).base32;
    const challenge = this.db
      .transaction(() => {
        if (
          !this.db
            .query("SELECT hash FROM bootstrap WHERE hash=? AND expires>?")
            .get(digest(bootstrapToken as string), this.now()) ||
          this.owner()?.enabled
        )
          this.failure();
        this.db.run("DELETE FROM bootstrap");
        this.db.run("DELETE FROM challenges");
        this.db.run("INSERT OR REPLACE INTO owner VALUES(1,?,?,0,-1)", [
          hash,
          seal(secret, this.key),
        ]);
        return this.challenge();
      })
      .immediate();
    return { challenge, ...this.enrollment(this.owner()!) };
  }
  async login(password: unknown) {
    this.rate();
    const owner = this.owner();
    if (
      !owner ||
      typeof password !== "string" ||
      password.length > 128 ||
      !(await Bun.password.verify(password, owner.password))
    )
      this.failure();
    const o = this.owner()!;
    return {
      challenge: this.challenge(),
      ...(o.enabled ? { needsEnrollment: false } : this.enrollment(o)),
    };
  }
  verify(req: Request, code: unknown) {
    this.rate();
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) this.failure();
    const challenge = this.readCookie(req, this.challengeName),
      now = this.now();
    const result = this.db
      .transaction(() => {
        const c = this.db
          .query("SELECT attempts FROM challenges WHERE hash=? AND expires>?")
          .get(digest(challenge), now) as { attempts: number } | null;
        const o = this.owner();
        if (!challenge || !c || c.attempts >= 5 || !o) return null;
        this.db.run("UPDATE challenges SET attempts=attempts+1 WHERE hash=?", [
          digest(challenge),
        ]);
        const delta = totp(unseal(o.secret, this.key)).validate({
          token: code as string,
          timestamp: now,
          window: 1,
        });
        const step = Math.floor(now / 30000) + (delta ?? 0);
        if (delta === null || step <= o.last_step) return null;
        const session = token(),
          csrf = token();
        this.db.run("UPDATE owner SET enabled=1,last_step=? WHERE id=1", [
          step,
        ]);
        this.db.run("DELETE FROM challenges WHERE hash=?", [digest(challenge)]);
        this.db.run("DELETE FROM sessions WHERE created<? OR seen<?", [
          now - 43200000,
          now - 1800000,
        ]);
        this.db.run(
          "DELETE FROM sessions WHERE hash IN(SELECT hash FROM sessions ORDER BY created DESC,hash LIMIT -1 OFFSET 19)",
        );
        this.db.run("INSERT INTO sessions VALUES(?,?,?,?)", [
          digest(session),
          csrf,
          now,
          now,
        ]);
        let recoveryCodes: string[] = [];
        if (
          !o.enabled ||
          !this.db.query("SELECT hash FROM recovery LIMIT 1").get()
        ) {
          this.db.run("DELETE FROM recovery");
          recoveryCodes = Array.from({ length: 10 }, () =>
            randomBytes(16).toString("hex"),
          );
          for (const c of recoveryCodes)
            this.db.run("INSERT INTO recovery VALUES(?)", [digest(c)]);
        }
        this.db.run("DELETE FROM auth_limits");
        this.event("mfa-correcto");
        return { session, csrf, recoveryCodes };
      })
      .immediate();
    if (!result) this.failure();
    return result!;
  }
  async recover(password: unknown, code: unknown) {
    this.rate();
    const o = this.owner();
    if (
      !o?.enabled ||
      typeof password !== "string" ||
      password.length > 128 ||
      typeof code !== "string" ||
      !(await Bun.password.verify(password, o.password))
    )
      this.failure();
    const secret = new Secret({ size: 20 }).base32;
    const challenge = this.db
      .transaction(() => {
        const current = this.owner();
        if (
          !current?.enabled ||
          !this.db
            .query("SELECT hash FROM recovery WHERE hash=?")
            .get(digest(code as string))
        )
          return null;
        this.db.run("DELETE FROM sessions");
        this.db.run("DELETE FROM challenges");
        this.db.run("DELETE FROM recovery");
        this.event("recuperación-iniciada");
        this.db.run(
          "UPDATE owner SET secret=?,enabled=0,last_step=-1 WHERE id=1",
          [seal(secret, this.key)],
        );
        return this.challenge();
      })
      .immediate();
    if (!challenge) this.failure();
    return { challenge: challenge!, ...this.enrollment(this.owner()!) };
  }
  logout(req: Request) {
    this.session(req);
    this.event("sesión-cerrada");
    this.db.run("DELETE FROM sessions WHERE hash=?", [
      digest(this.readCookie(req, this.cookieName)),
    ]);
  }
}
