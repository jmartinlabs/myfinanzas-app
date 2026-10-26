/**
 * B3 DIAGNOSTIC PRELOAD — NOT PRODUCT CODE, NOT A TEST.
 *
 * Loaded only with `bun test --preload ./.local/b3-capture.preload.ts` in the
 * diagnostic checkout. It wraps `Database.prototype.query` to spawn a small
 * helper process (no SQLite) that snapshots technical metadata of the B3
 * fixture (`mf-opening-*`) immediately before each query and, on error,
 * immediately after it. It rethrows the original error object.
 *
 * Isolation (F-B3-CAP-01): the parent never opens/reads the DB, WAL or SHM.
 * All header reads (<=32 B WAL, <=48 B SHM) and fstat calls happen in
 * `.local/b3-capture-helper.ts`, a separate process that imports only
 * `node:fs`; its close() cannot release the parent's POSIX locks.
 *
 * Captures ONLY sizes and technical headers. It does NOT capture SQL text,
 * page content, rows, keys, messages or full stacks. It does NOT run SQLite
 * on the target, checkpoints, retries, or change busy_timeout, assertions or
 * the 3000 ms limit.
 *
 * Salt normalization (F-B3-CAP-02): WAL and SHM salts are reported as raw
 * 4-byte hex (comparable) plus big-endian integers. Neither is parsed as a
 * native-endian integer for comparison.
 *
 * Atomicity: the helper fstats each fd before/after its <=32/48 B read and
 * marks `capture:"unstable"` if inode/size/mtime changed. Capture errors,
 * unstable reads or truncation set `inconclusive:true`; absence of data must
 * not be read as a consistent state. The suite result is untouched.
 *
 * TIMING LIMIT: one helper process per snapshot adds scheduling cost in the
 * parent for the B3 fixture. The timed `before`/`after` children are separate
 * `bun -e` processes and do not inherit this preload, but parent timing and
 * scheduling can change. Diagnostic, not timing-neutral.
 */
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fchmodSync,
  mkdirSync,
  openSync,
  writeSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";

const MAX_LINES = 10_000;
const LOG_PATH =
  process.env.B3_CAPTURE_LOG ??
  join(tmpdir(), "b3-capture", `${process.pid}.jsonl`);
const HELPER = join(import.meta.dir, "b3-capture-helper.ts");

let fd = -1;
let lines = 0;
let seq = 0;
let truncated = false;

function openLog() {
  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true, mode: 0o700 });
    fd = openSync(LOG_PATH, "a", 0o600);
    try {
      fchmodSync(fd, 0o600);
    } catch {}
  } catch (error) {
    console.error(
      "B3-CAPTURE: cannot open log; capture disabled:",
      (error as NodeJS.ErrnoException).code ?? "ERR",
    );
    fd = -1;
  }
}

function writeLine(record: Record<string, unknown>) {
  if (fd < 0) return;
  try {
    writeSync(fd, JSON.stringify({ seq: seq++, ...record }) + "\n");
    lines++;
  } catch {}
}

function emit(record: Record<string, unknown>) {
  if (fd < 0) return;
  if (lines >= MAX_LINES) {
    if (!truncated) {
      truncated = true;
      writeLine({
        event: "truncated",
        capture: "truncated",
        inconclusive: true,
        note: "capture truncated; absence of data is not consistency",
      });
    }
    return;
  }
  writeLine(record);
}

const hashCache = new Map<string, string>();
function pathHash(path: string) {
  const hit = hashCache.get(path);
  if (hit) return hit;
  const h = createHash("sha256").update(path).digest("hex").slice(0, 16);
  hashCache.set(path, h);
  return h;
}

type HelperResult = {
  pid?: number;
  capture?: string;
  stable?: boolean;
  inconclusive?: boolean;
  error?: string;
  main?: unknown;
  wal?: unknown;
  shm?: unknown;
  [key: string]: unknown;
};

function runHelper(path: string): HelperResult {
  try {
    const result = Bun.spawnSync(
      [process.execPath, HELPER, path, path + "-wal", path + "-shm"],
      { stdout: "pipe", stderr: "pipe", timeout: 2000 },
    );
    const out = result.stdout?.toString().trim() ?? "";
    if (!out) {
      return { capture: "error", error: "NO_OUTPUT", inconclusive: true };
    }
    let data: HelperResult;
    try {
      data = JSON.parse(out) as HelperResult;
    } catch {
      return { capture: "error", error: "PARSE", inconclusive: true };
    }
    if (result.exitCode !== 0 && data.capture !== "error") {
      data.capture = "error";
    }
    if (result.stderr?.length) {
      // Keep capturer errors separate from suite errors.
      data.captureError = true;
      data.capture = "error";
    }
    if (data.capture !== "ok") data.inconclusive = true;
    return data;
  } catch (error) {
    return {
      capture: "error",
      error: (error as NodeJS.ErrnoException).code ?? "SPAWN",
      inconclusive: true,
    };
  }
}

function fixturePath() {
  const path = process.env.DATABASE_PATH;
  if (!path) return null;
  try {
    if (!basename(dirname(dirname(path))).startsWith("mf-opening-")) return null;
  } catch {
    return null;
  }
  // Stat only (no open/lock) to skip the pre-publication initializeProduction.
  return existsSync(path) ? path : null;
}

function callFrames(stack: string | undefined) {
  if (!stack) return [];
  return stack
    .split("\n")
    .filter((line) => line.includes("/apps/api/"))
    .map((line) => {
      const match = line.match(/\/apps\/api\/([^):]+:\d+:\d+)/);
      return match ? match[1] : "apps/api";
    })
    .slice(0, 6);
}

function snapshot(path: string, helper: HelperResult) {
  return {
    event: "pre",
    ts: Date.now(),
    pid: process.pid,
    helperPid: helper.pid ?? null,
    node_env: process.env.NODE_ENV ?? null,
    db: pathHash(path),
    caller: callFrames(new Error().stack),
    capture: helper.capture ?? "error",
    stable: helper.stable ?? false,
    inconclusive: helper.inconclusive ?? helper.capture !== "ok",
    captureError: helper.error ?? helper.captureError ?? null,
    main: helper.main ?? null,
    wal: helper.wal ?? null,
    shm: helper.shm ?? null,
  };
}

openLog();
emit({
  event: "init",
  ts: Date.now(),
  pid: process.pid,
  bun: Bun.version,
  platform: process.platform,
  arch: process.arch,
  node_env: process.env.NODE_ENV ?? null,
  helper: pathHash(HELPER),
  maxLines: MAX_LINES,
  note: "diagnostic only; sizes/headers only; instrumentation may alter timing",
});

const proto = Database.prototype as unknown as {
  query: (...args: unknown[]) => unknown;
};
const originalQuery = proto.query;

if (typeof originalQuery === "function") {
  proto.query = function (this: unknown, ...args: unknown[]) {
    const path = fixturePath();
    if (!path) return originalQuery.apply(this, args);

    emit(snapshot(path, runHelper(path)));
    try {
      return originalQuery.apply(this, args);
    } catch (error) {
      const e = error as { stack?: string; code?: string; errno?: number };
      const helper = runHelper(path);
      emit({
        event: "error",
        ts: Date.now(),
        pid: process.pid,
        helperPid: helper.pid ?? null,
        node_env: process.env.NODE_ENV ?? null,
        db: pathHash(path),
        code: e?.code ?? null,
        errno: e?.errno ?? null,
        caller: callFrames(e?.stack),
        capture: helper.capture ?? "error",
        stable: helper.stable ?? false,
        inconclusive: helper.inconclusive ?? helper.capture !== "ok",
        captureError: helper.error ?? helper.captureError ?? null,
        main: helper.main ?? null,
        wal: helper.wal ?? null,
        shm: helper.shm ?? null,
      });
      throw error; // preserve the original error object
    }
  };
}

process.on("exit", () => {
  if (fd >= 0) {
    try {
      closeSync(fd);
    } catch {}
  }
});
