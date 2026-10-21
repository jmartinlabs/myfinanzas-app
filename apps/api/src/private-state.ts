import { pathToFileURL } from "node:url";
import {
  constants,
  type Stats,
  lstatSync,
  fstatSync,
  openSync,
  closeSync,
  fsyncSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { dirname, isAbsolute, resolve, parse, basename } from "node:path";
import { inspectIdentity, keyHash } from "./database-identity";
import { Auth } from "./auth";

export type ProductionConfig = {
  database: string;
  key: string;
  origin: string;
  state: string;
};
export function canonical(path: string) {
  if (
    !isAbsolute(path) ||
    path !== resolve(path) ||
    path !== path.trim() ||
    path.includes("\0")
  )
    throw new Error("Ruta absoluta canónica requerida.");
}
export function safeAncestors(path: string) {
  canonical(path);
  const rootUID = lstatSync(parse(path).root).uid; // Namespace/root-filesystem owner (0 on Debian).
  let current = path;
  for (;;) {
    const st = lstatSync(current);
    if (
      !st.isDirectory() ||
      st.isSymbolicLink() ||
      ![rootUID, process.getuid!()].includes(st.uid)
    )
      throw new Error("Ancestro no confiable.");
    // A root-owned sticky directory such as /tmp cannot rename another user's private child.
    if (st.mode & 0o022 && !(st.uid === rootUID && st.mode & 0o1000))
      throw new Error("Ancestro modificable por terceros.");
    if (current === parse(current).root) break;
    current = dirname(current);
  }
  if (realpathSync(path) !== path)
    throw new Error("Enlaces de ruta no permitidos.");
}
export function privateDirectory(path: string) {
  safeAncestors(path);
  const st = lstatSync(path);
  if (st.uid !== process.getuid!() || (st.mode & 0o777) !== 0o700)
    throw new Error("Directorio privado 0700 del UID efectivo requerido.");
}
export function privateFile(path: string) {
  canonical(path);
  privateDirectory(dirname(path));
  const st = lstatSync(path);
  if (
    !st.isFile() ||
    st.isSymbolicLink() ||
    st.nlink !== 1 ||
    st.uid !== process.getuid!() ||
    (st.mode & 0o777) !== 0o600
  )
    throw new Error("Archivo privado regular 0600 requerido.");
  return st;
}
function sameFile(a: Stats, b: Stats) {
  if (a.dev !== b.dev || a.ino !== b.ino)
    throw new Error("Archivo sustituido durante la validación.");
}
export function privateSidecars(path: string) {
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    try {
      lstatSync(path + suffix);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    privateFile(path + suffix);
  }
}
export function readPrivateKey(path: string) {
  const expected = privateFile(path);
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const actual = fstatSync(fd);
    sameFile(expected, actual);
    if (
      !actual.isFile() ||
      actual.nlink !== 1 ||
      actual.uid !== process.getuid!() ||
      (actual.mode & 0o777) !== 0o600
    )
      throw new Error("Descriptor de clave no privado.");
    const key = readFileSync(fd);
    sameFile(actual, privateFile(path));
    if (key.length !== 32) throw new Error("Clave de acceso inválida.");
    return key;
  } finally {
    closeSync(fd);
  }
}
export function syncPath(path: string) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
export function productionConfig(): ProductionConfig {
  const {
    DATABASE_PATH: database,
    AUTH_KEY_PATH: key,
    APP_ORIGIN: origin,
  } = process.env;
  if (!database || !key || !origin)
    throw new Error(
      "E1.1 solo admite demo por defecto; producción exige DATABASE_PATH, AUTH_KEY_PATH y APP_ORIGIN explícitos.",
    );
  canonical(database);
  canonical(key);
  if (
    database === key ||
    ["-wal", "-shm", "-journal"].some((suffix) => key === database + suffix) ||
    dirname(database) !== dirname(key) ||
    [database, key].some((path) => basename(path) === "bundle.tmp")
  )
    throw new Error("DB y clave distintas en un mismo directorio requeridas.");
  if (/^\.(initialize|restore|backup)-/.test(basename(dirname(database))))
    throw new Error("Área temporal no admisible como estado operativo.");
  const u = new URL(origin);
  if (
    u.protocol !== "https:" ||
    u.origin !== origin ||
    u.username ||
    u.password
  )
    throw new Error("APP_ORIGIN HTTPS canónico requerido.");
  return { database, key, origin, state: dirname(database) };
}
export function openProductionConnection(
  config: ProductionConfig,
  readonly: boolean,
) {
  const { Database } = require("bun:sqlite") as typeof import("bun:sqlite");
  // Readonly SQLite can change SHM read marks. Reject origins with a persistent,
  // immutable metadata probe before opening any connection that can touch WAL/SHM.
  verifyProductionFiles(config);
  privateDirectory(config.state);
  const expected = privateFile(config.database);
  privateSidecars(config.database);
  const key = readPrivateKey(config.key);
  const db = new Database(
    config.database,
    readonly
      ? { readonly: true, strict: true }
      : { readwrite: true, strict: true },
  );
  try {
    sameFile(expected, privateFile(config.database));
    privateSidecars(config.database);
    const id = inspectIdentity(db);
    if (id?.origin !== "production" || id.key_hash !== keyHash(key))
      throw new Error("Identidad o pareja DB/clave inválida.");
    new Auth(db, key, config.origin).checkKey();
    return { db, key };
  } catch (error) {
    db.close();
    throw error;
  }
}
// Identity is checkpointed before production publication and cannot be changed.
// Only this metadata probe ignores WAL; real connections validate live state below.
export function persistentIdentity(path: string) {
  const { Database, constants: sqlite } =
    require("bun:sqlite") as typeof import("bun:sqlite");
  const uri = pathToFileURL(resolve(path)).href + "?mode=ro&immutable=1";
  const db = new Database(
    uri,
    sqlite.SQLITE_OPEN_READONLY | sqlite.SQLITE_OPEN_URI,
  );
  try {
    return inspectIdentity(db);
  } finally {
    db.close();
  }
}
export function verifyProductionFiles(config: ProductionConfig) {
  privateDirectory(config.state);
  privateFile(config.database);
  privateSidecars(config.database);
  const key = readPrivateKey(config.key);
  const id = persistentIdentity(config.database);
  if (id?.origin !== "production" || id.key_hash !== keyHash(key))
    throw new Error("Identidad productiva persistente o clave inválida.");
  return key;
}

// Linux target (Debian 13): atomic directory publication with RENAME_NOREPLACE.
// A plain exists+rename can replace an empty destination created concurrently.
export function publishNewDirectory(stage: string, target: string) {
  const { dlopen, FFIType, ptr } =
    require("bun:ffi") as typeof import("bun:ffi");
  canonical(stage);
  canonical(target);
  if (dirname(stage) !== dirname(target))
    throw new Error("Publicación fuera del mismo directorio.");
  privateDirectory(stage);
  privateDirectory(dirname(target));
  const expected = lstatSync(dirname(target));
  const parent = openSync(
    dirname(target),
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
  );
  try {
    sameFile(expected, fstatSync(parent));
  } catch (error) {
    closeSync(parent);
    throw error;
  }
  try {
    const libc = dlopen("libc.so.6", {
      renameat2: {
        args: [FFIType.i32, FFIType.ptr, FFIType.i32, FFIType.ptr, FFIType.u32],
        returns: FFIType.i32,
      },
    });
    try {
      sameFile(expected, lstatSync(dirname(target)));
      const source = Buffer.from(basename(stage) + "\0"),
        destination = Buffer.from(basename(target) + "\0");
      if (
        libc.symbols.renameat2(
          parent,
          ptr(source),
          parent,
          ptr(destination),
          1,
        ) !== 0
      )
        throw new Error("No se pudo publicar el destino nuevo sin reemplazo.");
      fsyncSync(parent);
      sameFile(expected, lstatSync(dirname(target)));
    } finally {
      libc.close();
    }
  } finally {
    closeSync(parent);
  }
}
