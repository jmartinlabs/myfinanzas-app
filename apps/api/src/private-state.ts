import { Database } from "bun:sqlite";
import { dlopen, FFIType, ptr } from "bun:ffi";
import { constants, lstatSync, openSync, closeSync, fsyncSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, resolve, parse } from "node:path";
import { inspectIdentity, keyHash } from "./database-identity";
import { Auth } from "./auth";

export type ProductionConfig = { database: string; key: string; origin: string; state: string };
export function canonical(path: string) {
  if (!isAbsolute(path) || path !== resolve(path) || path.includes("\0")) throw new Error("Ruta absoluta canónica requerida.");
}
export function safeAncestors(path: string) {
  canonical(path);
  const rootUID = lstatSync(parse(path).root).uid; // Namespace/root-filesystem owner (0 on Debian).
  let current = path;
  for (;;) {
    const st = lstatSync(current);
    if (!st.isDirectory() || st.isSymbolicLink() || ![rootUID, process.getuid!()].includes(st.uid)) throw new Error("Ancestro no confiable.");
    // A root-owned sticky directory such as /tmp cannot rename another user's private child.
    if ((st.mode & 0o022) && !(st.uid === rootUID && (st.mode & 0o1000))) throw new Error("Ancestro modificable por terceros.");
    if (current === parse(current).root) break;
    current = dirname(current);
  }
  if (realpathSync(path) !== path) throw new Error("Enlaces de ruta no permitidos.");
}
export function privateDirectory(path: string) {
  safeAncestors(path);
  const st = lstatSync(path);
  if (st.uid !== process.getuid!() || (st.mode & 0o777) !== 0o700) throw new Error("Directorio privado 0700 del UID efectivo requerido.");
}
export function privateFile(path: string) {
  canonical(path); privateDirectory(dirname(path));
  const st = lstatSync(path);
  if (!st.isFile() || st.isSymbolicLink() || st.nlink !== 1 || st.uid !== process.getuid!() || (st.mode & 0o777) !== 0o600)
    throw new Error("Archivo privado regular 0600 requerido.");
}
export function readPrivateKey(path: string) {
  privateFile(path);
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const key = readFileSync(fd);
    if (key.length !== 32) throw new Error("Clave de acceso inválida.");
    return key;
  } finally { closeSync(fd); }
}
export function syncPath(path: string) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
export function productionConfig(): ProductionConfig {
  const { DATABASE_PATH: database, AUTH_KEY_PATH: key, APP_ORIGIN: origin } = process.env;
  if (!database || !key || !origin) throw new Error("E1.1 solo admite demo por defecto; producción exige DATABASE_PATH, AUTH_KEY_PATH y APP_ORIGIN explícitos.");
  canonical(database); canonical(key);
  if (database === key || dirname(database) !== dirname(key)) throw new Error("DB y clave distintas en un mismo directorio requeridas.");
  const u = new URL(origin);
  if (u.protocol !== "https:" || u.origin !== origin || u.username || u.password) throw new Error("APP_ORIGIN HTTPS canónico requerido.");
  return { database, key, origin, state: dirname(database) };
}
export function verifyProductionFiles(config: ProductionConfig) {
  privateDirectory(config.state); privateFile(config.database);
  const key = readPrivateKey(config.key);
  const db = new Database(config.database, { readonly: true, strict: true });
  try {
    const id = inspectIdentity(db);
    if (id?.origin !== "production" || id.key_hash !== keyHash(key)) throw new Error("Identidad o pareja DB/clave inválida.");
    new Auth(db, key, config.origin).checkKey();
  } finally { db.close(); }
  return key;
}

// Linux target (Debian 13): atomic directory publication with RENAME_NOREPLACE.
// A plain exists+rename can replace an empty destination created concurrently.
export function publishNewDirectory(stage: string, target: string) {
  privateDirectory(dirname(target));
  const libc = dlopen("libc.so.6", { renameat2: { args: [FFIType.i32, FFIType.ptr, FFIType.i32, FFIType.ptr, FFIType.u32], returns: FFIType.i32 } });
  try {
    const source = Buffer.from(stage + "\0"), destination = Buffer.from(target + "\0");
    if (libc.symbols.renameat2(-100, ptr(source), -100, ptr(destination), 1) !== 0)
      throw new Error("No se pudo publicar el destino nuevo sin reemplazo.");
    syncPath(dirname(target));
  } finally { libc.close(); }
}
