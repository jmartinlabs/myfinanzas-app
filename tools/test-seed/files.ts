import {
  constants,
  closeSync,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import {
  privateDirectory,
  privateFile,
  syncPath,
} from "../../apps/api/src/private-state";
import { canonical } from "../../apps/api/src/private-state";
import { SeedError, type SeedExitCode } from "./errors";

function exclusiveWrite(path: string, content: string) {
  canonical(path);
  privateDirectory(dirname(path));
  const fd = openSync(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    const bytes = Buffer.from(content, "utf8");
    let offset = 0;
    while (offset < bytes.length)
      offset += writeSync(fd, bytes, offset, bytes.length - offset);
    fsyncSync(fd);
  } catch (error) {
    try {
      const current = lstatSync(path),
        owned = fstatSync(fd);
      if (current.dev === owned.dev && current.ino === owned.ino)
        unlinkSync(path);
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== "ENOENT")
        throw cleanupError;
    } finally {
      closeSync(fd);
    }
    throw error;
  }
  closeSync(fd);
  syncPath(dirname(path));
}

export function writeNewPrivateFile(path: string, content: string) {
  exclusiveWrite(path, content);
}

/** Reemplaza un archivo privado ya validado mediante un temporal exclusivo. */
export function replacePrivateFile(path: string, content: string) {
  canonical(path);
  privateFile(path);
  const temporary = path + ".tmp";
  if (existsSync(temporary))
    throw new SeedError(
      3,
      "Temporal de marcador ya presente; no se reemplaza.",
    );
  exclusiveWrite(temporary, content);
  try {
    renameSync(temporary, path);
    syncPath(dirname(path));
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== "ENOENT")
        throw cleanupError;
    }
    throw error;
  }
}

export type PrivateJsonResult<T> = {
  value: T;
  bytes: Buffer;
  sha256: string;
};

export function readPrivateJson<T>(
  path: string,
  code: SeedExitCode,
  label: string,
): PrivateJsonResult<T> {
  try {
    lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new SeedError(code, `${label} ausente.`);
    throw error;
  }
  try {
    privateFile(path);
  } catch {
    throw new SeedError(code, `${label} no es un archivo privado 0600 válido.`);
  }
  const bytes = readFileSync(path);
  let value: T;
  try {
    value = JSON.parse(bytes.toString("utf8")) as T;
  } catch {
    throw new SeedError(code, `${label} no contiene JSON válido.`);
  }
  return {
    value,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function optionalPrivateJson<T>(
  path: string,
  code: SeedExitCode,
  label: string,
): PrivateJsonResult<T> | null {
  try {
    lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  return readPrivateJson<T>(path, code, label);
}

export function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}
