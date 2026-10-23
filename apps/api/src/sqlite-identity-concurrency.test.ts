import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { openDatabase as openV3 } from "../test-support/database-v3";

const databaseModule = resolve(import.meta.dir, "database.ts");

// Each child opens through the real product path and reports technical error codes only.
function child(path: string, loopMs: number) {
  const code = `import{openDatabase}from${JSON.stringify(databaseModule)};
const end=performance.now()+${loopMs};let opens=0;const errors=[];
do{try{openDatabase(${JSON.stringify(path)}).close();opens++;}catch(e){errors.push(String(e.code??e.name)+"/"+String(e.errno??"-")+"/"+String(e.message).slice(0,40));}}while(performance.now()<end);
console.log(JSON.stringify({opens,errors}));`;
  return Bun.spawn([process.execPath, "-e", code], {
    env: { ...process.env, NODE_ENV: "test" },
    stdout: "pipe",
    stderr: "pipe",
  });
}

// 31-E1 AC-34: the AC23 scene. Two real upgraders migrate a genuine v3 database while a
// third process reopens it continuously; no opening may observe torn or mixed identity.
test("31 AC34: concurrent genuine v3 upgrades never yield SQLITE_CORRUPT or mixed identity on open", async () => {
  const root = fs.mkdtempSync(join(tmpdir(), "mf-ac34-"));
  const rounds = 40;
  const failures: string[] = [];
  let opens = 0;
  try {
    for (let r = 0; r < rounds; r++) {
      const path = join(root, `round-${r}.sqlite`);
      openV3(path).close();
      const procs = [child(path, 0), child(path, 0), child(path, 400)];
      const results = await Promise.all(
        procs.map(async (p) => {
          const [out, err, exit] = await Promise.all([
            new Response(p.stdout).text(),
            new Response(p.stderr).text(),
            p.exited,
          ]);
          return { out, err, exit };
        }),
      );
      for (const { out, err, exit } of results) {
        if (exit !== 0 || err !== "") {
          failures.push(`round ${r}: exit ${exit} stderr ${err.slice(0, 80)}`);
          continue;
        }
        const parsed = JSON.parse(out) as { opens: number; errors: string[] };
        opens += parsed.opens;
        failures.push(...parsed.errors.map((e) => `round ${r}: ${e}`));
      }
      const db = new Database(path, { readonly: true });
      try {
        expect(db.query("PRAGMA integrity_check").get()).toEqual({
          integrity_check: "ok",
        });
        expect(db.query("SELECT version FROM schema_version").get()).toEqual({
          version: 8,
        });
      } finally {
        db.close();
      }
    }
    expect(failures).toEqual([]);
    expect(opens).toBeGreaterThan(rounds * 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 120000);
