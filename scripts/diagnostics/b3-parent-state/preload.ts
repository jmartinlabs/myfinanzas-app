// Passive test boundaries: no SQLite calls, method wrapping, WAL reads or helpers.
import { beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { openSync, writeSync, closeSync, readdirSync, readlinkSync } from "node:fs";

const methods = ["query", "exec", "prepare", "run", "transaction", "close"] as const;
const baseline = Object.fromEntries(methods.map(k => [k, Database.prototype[k]]));
const digest = (v: string) => createHash("sha256").update(v).digest("hex");
let index = 0, fd = -1;
try { fd = openSync(process.env.B3_PARENT_LOG!, "wx", 0o600); } catch {}

function state() {
  const prototype = Object.fromEntries(methods.map(k => {
    const fn = Database.prototype[k] as Function & { mock?: unknown; mockRestore?: unknown };
    return [k, { sameAsPreload: fn === baseline[k],
      sourceHash: digest(Function.prototype.toString.call(fn)),
      mockShape: "mock" in fn || typeof fn.mockRestore === "function" }];
  }));
  const descriptors = { total: 0, sqlite: 0, wal: 0, shm: 0, deleted: 0 };
  if (process.platform === "linux") {
    const entries = readdirSync("/proc/self/fd");
    descriptors.total = entries.length;
    for (const entry of entries) {
      let target: string;
      try { target = readlinkSync("/proc/self/fd/" + entry); } catch { continue; }
      if (target.endsWith(" (deleted)")) descriptors.deleted++;
      target = target.replace(/ \(deleted\)$/, "");
      if (/\.sqlite$/.test(target)) descriptors.sqlite++;
      if (target.endsWith("-wal")) descriptors.wal++;
      if (target.endsWith("-shm")) descriptors.shm++;
    }
  }
  return { prototype, descriptors, umask: process.umask(),
    nodeEnv: ["test", "production", "development"].includes(process.env.NODE_ENV ?? "")
      ? process.env.NODE_ENV : "other-or-absent",
    configured: Object.fromEntries(["DATABASE_PATH", "AUTH_KEY_PATH", "APP_ORIGIN", "TMPDIR", "TZ"]
      .map(k => [k, { present: process.env[k] !== undefined,
        hash: process.env[k] === undefined ? null : digest(process.env[k]!) }])) };
}
function boundary(phase: "before" | "after") {
  let record: Record<string, unknown>;
  try { record = { index, phase, pid: process.pid, state: state(), capture: "ok" }; }
  catch { record = { index, phase, pid: process.pid, capture: "error" }; }
  if (fd >= 0) {
    try { writeSync(fd, JSON.stringify(record) + "\n"); } catch {}
  }
  // Names unavailable in Bun1.4.3 hooks: correlate boundaries with the next
  // canonical test-result line in the same combined stdout/stderr pipe.
  try { writeSync(1, `B3_PARENT_BOUNDARY ${index} ${phase}\n`); } catch {}
}
beforeEach(() => { index++; boundary("before"); });
afterEach(() => boundary("after"));
process.on("exit", () => { if (fd >= 0) { try { closeSync(fd); } catch {} } });
