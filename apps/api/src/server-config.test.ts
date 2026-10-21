import { test, expect } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const main = resolve(import.meta.dir, "main.ts");
const healthURL = "http://127.0.0.1:3001/api/health";

// These tests prove the process bind only, NOT Podman publication (AC-10).
test("32 bind rejects invalid values before creating SQLite or its directory", () => {
  const root = mkdtempSync(join(tmpdir(), "mf-bind-invalid-"));
  try {
    for (const value of ["", "localhost", "::", "192.0.2.1", " 0.0.0.0", "0.0.0.0 "]) {
      const state = join(root, "absent");
      const child = Bun.spawnSync([process.execPath, main], {
        env: { ...process.env, NODE_ENV: "test", API_BIND_HOST: value,
          DATABASE_PATH: join(state, "demo.sqlite"), AUTH_KEY_PATH: join(state, "auth.key") },
        stdout: "pipe", stderr: "pipe",
      });
      expect(child.exitCode).not.toBe(0);
      expect(child.stderr.toString()).toContain("API_BIND_HOST debe ser");
      expect(existsSync(state)).toBe(false);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

for (const hostname of [undefined, "0.0.0.0"] as const) {
  test(`32 actual API serves via host loopback with ${hostname ?? "default loopback"} and denies anonymous finance`, async () => {
    const root = mkdtempSync(join(tmpdir(), "mf-bind-http-"));
    const env: Record<string, string | undefined> = { ...process.env, NODE_ENV: "test",
      DATABASE_PATH: join(root, "demo.sqlite"), AUTH_KEY_PATH: join(root, "auth.key"),
      APP_ORIGIN: "http://127.0.0.1:5173" };
    delete env.API_BIND_HOST;
    if (hostname !== undefined) env.API_BIND_HOST = hostname;
    expect(await fetch(healthURL, { signal: AbortSignal.timeout(200) }).then(() => true, () => false)).toBe(false);
    const child = Bun.spawn([process.execPath, main], { env, stdout: "ignore", stderr: "pipe" });
    try {
      let response: Response | undefined;
      for (let attempt = 0; attempt < 80; attempt++) {
        if (child.exitCode !== null) throw new Error("API exited before health");
        try { response = await fetch(healthURL, { signal: AbortSignal.timeout(200) }); } catch {}
        if (response) break;
        await Bun.sleep(25);
      }
      expect(response?.status).toBe(200);
      expect(await response!.json()).toEqual({ ok: true });
      const denied = await fetch("http://127.0.0.1:3001/api/saldos");
      expect(denied.status).toBe(401);
    } finally {
      child.kill("SIGTERM");
      await child.exited;
      rmSync(root, { recursive: true, force: true });
    }
    expect(await fetch(healthURL, { signal: AbortSignal.timeout(200) }).then(() => true, () => false)).toBe(false);
  }, 10000);
}
