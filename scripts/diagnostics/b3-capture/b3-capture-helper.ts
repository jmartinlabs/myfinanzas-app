/**
 * B3 DIAGNOSTIC HELPER — separate process, NO SQLite.
 *
 * Reads at most 32 B (WAL header) / 48 B (SHM header) and fstat metadata for
 * <main> <wal> <shm>. It never imports `bun:sqlite`, never acquires SQLite locks
 * and never touches the parent's descriptors. Runs as a child of the preload so
 * its close() cannot release the parent's POSIX locks.
 *
 * Output: one JSON object on stdout. `capture` is "ok" | "unstable" | "error".
 * Salt normalization: raw 4-byte hex (comparable) plus big-endian integer. The
 * WAL-index salts are byte copies, not native-endian integers.
 */
import { closeSync, fstatSync, openSync, readSync } from "node:fs";

type Header = Record<string, unknown>;

function readFile(path: string, headerLen: number, parse: (b: Buffer) => Header) {
  let fd = -1;
  try {
    fd = openSync(path, "r");
    const before = fstatSync(fd);
    if (!before.isFile()) {
      return { exists: true, error: "NOT_FILE", changed: false };
    }
    const buffer = Buffer.alloc(headerLen);
    const headerBytes =
      headerLen > 0 ? readSync(fd, buffer, 0, headerLen, 0) : 0;
    const after = fstatSync(fd);
    const changed =
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs;
    return {
      exists: true,
      size: after.size,
      ino: after.ino,
      mtimeMs: after.mtimeMs,
      headerBytes,
      changed,
      ...parse(buffer.subarray(0, headerBytes)),
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? "ERR";
    return { exists: false, error: code, changed: false };
  } finally {
    if (fd >= 0) {
      try {
        closeSync(fd);
      } catch {}
    }
  }
}

function walHeader(b: Buffer): Header {
  const rawPageSize = b.length >= 12 ? b.readUInt32BE(8) : null;
  const pageSize = rawPageSize === 1 ? 65536 : rawPageSize;
  return {
    magic: b.length >= 4 ? b.readUInt32BE(0) : null,
    version: b.length >= 8 ? b.readUInt32BE(4) : null,
    rawPageSize,
    pageSize,
    frameSize: pageSize ? 24 + pageSize : null,
    salt1Hex: b.length >= 20 ? b.subarray(16, 20).toString("hex") : null,
    salt2Hex: b.length >= 24 ? b.subarray(20, 24).toString("hex") : null,
    salt1BE: b.length >= 20 ? b.readUInt32BE(16) : null,
    salt2BE: b.length >= 24 ? b.readUInt32BE(20) : null,
  };
}

function shmHeader(b: Buffer): Header {
  const rawPageSize = b.length >= 16 ? b.readUInt16LE(14) : null;
  return {
    iVersion: b.length >= 4 ? b.readUInt32LE(0) : null,
    iChange: b.length >= 12 ? b.readUInt32LE(8) : null,
    isInit: b.length >= 13 ? b[12] : null,
    bigEndCksum: b.length >= 14 ? b[13] : null,
    rawPageSize,
    pageSize: rawPageSize === 1 ? 65536 : rawPageSize,
    mxFrame: b.length >= 20 ? b.readUInt32LE(16) : null,
    nPage: b.length >= 24 ? b.readUInt32LE(20) : null,
    // WAL-index salts are byte copies; hex is the comparable form.
    salt1Hex: b.length >= 36 ? b.subarray(32, 36).toString("hex") : null,
    salt2Hex: b.length >= 40 ? b.subarray(36, 40).toString("hex") : null,
    salt1BE: b.length >= 36 ? b.readUInt32BE(32) : null,
    salt2BE: b.length >= 40 ? b.readUInt32BE(36) : null,
  };
}

function main() {
  const [mainPath, walPath, shmPath] = process.argv.slice(2);
  if (!mainPath || !walPath || !shmPath) {
    console.log(JSON.stringify({ pid: process.pid, capture: "error", error: "ARGV" }));
    process.exitCode = 1;
    return;
  }
  const main = readFile(mainPath, 0, () => ({}));
  const wal = readFile(walPath, 32, walHeader);
  const shm = readFile(shmPath, 48, shmHeader);
  if (wal.exists && typeof wal.size === "number" && typeof wal.frameSize === "number" && wal.frameSize > 0) {
    const frames = wal.size >= 32 ? (wal.size - 32) / wal.frameSize : null;
    wal.frames = frames;
    wal.aligned = frames !== null && Number.isInteger(frames) && frames >= 0;
  }
  const files = [main, wal, shm];
  const readErrors = files.filter(
    (f) => f.error && f.error !== "ENOENT",
  );
  const changed = files.some((f) => f.changed);
  const capture =
    readErrors.length > 0 ? "error" : changed ? "unstable" : "ok";
  console.log(
    JSON.stringify({
      pid: process.pid,
      capture,
      stable: !changed,
      inconclusive: capture !== "ok",
      main,
      wal,
      shm,
    }),
  );
}

try {
  main();
} catch (error) {
  console.log(
    JSON.stringify({
      pid: process.pid,
      capture: "error",
      error: (error as NodeJS.ErrnoException).code ?? "EXCEPTION",
    }),
  );
  process.exitCode = 1;
}
