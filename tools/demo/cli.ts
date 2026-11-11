#!/usr/bin/env bun
/**
 * Entorno DEMO local de MyFinanzas: base ficticia, acceso desde la red Wi-Fi y
 * sin inicio de sesión. Uso:
 *
 *   bun run dev:demo            # prepara (si hace falta) y arranca API + Vite
 *   bun run dev:demo --reset    # archiva la base DEMO actual, siembra otra y arranca
 *   bun run demo:seed           # solo prepara la base, sin arrancar servidores
 *
 * El modo DEMO no se activa aquí por `NODE_ENV` únicamente: `apps/api/src/
 * demo-mode.ts` exige además MYFINANZAS_DEMO=1, rutas dentro de `.local/demo/`,
 * identidad `demo` sin credenciales y orígenes HTTP de loopback o red privada.
 */
import { spawn, type Subprocess } from "bun";
import {
  existsSync,
  mkdirSync,
  renameSync,
} from "node:fs";
import { networkInterfaces } from "node:os";
import { join, resolve } from "node:path";
import { openDatabase } from "../../apps/api/src/database";
import { inspectIdentity } from "../../apps/api/src/database-identity";
import { isPrivateHost } from "../../apps/api/src/local-network";
import { applyDemoDataset, isFreshDemoDatabase, verifyDemoDataset } from "./apply";

const root = resolve(import.meta.dir, "../..");
const stateDirectory = join(root, ".local", "demo");
const databasePath = join(stateDirectory, "demo.sqlite");
const keyPath = join(stateDirectory, "auth.key");
const port = Number(process.env.DEMO_PORT ?? 5173);

const accepted = new Set(["--reset", "--seed-only", "--help", "-h"]);
const flags = new Set(process.argv.slice(2));
for (const flag of flags)
  if (!accepted.has(flag)) {
    console.error(
      `Argumento no admitido: ${flag}\nUsa --reset, --seed-only o --help.`,
    );
    process.exit(2);
  }
if (flags.has("--help") || flags.has("-h")) {
  console.log(
    [
      "Uso: bun run dev:demo [--reset | --seed-only]",
      "",
      "  --reset      archiva .local/demo y crea una base ficticia nueva",
      "  --seed-only  prepara la base sin arrancar API ni Vite",
      "",
      "Nunca sobrescribe una base existente: si no es DEMO o ya tiene datos,",
      "se reutiliza tal cual o se archiva antes de crear otra.",
    ].join("\n"),
  );
  process.exit(0);
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error("DEMO_PORT debe ser un puerto entre 1024 y 65535.");
  process.exit(2);
}

function lanAddresses() {
  const addresses = new Set<string>();
  for (const entries of Object.values(networkInterfaces()))
    for (const entry of entries ?? [])
      if (entry.family === "IPv4" && !entry.internal && isPrivateHost(entry.address))
        addresses.add(entry.address);
  return [...addresses].sort();
}

const lan = lanAddresses();
const origins = [
  `http://127.0.0.1:${port}`,
  `http://localhost:${port}`,
  ...lan.map((address) => `http://${address}:${port}`),
];

function archiveExisting() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(stateDirectory, "archive", stamp);
  mkdirSync(target, { recursive: true, mode: 0o700 });
  for (const suffix of ["", "-wal", "-shm"]) {
    const from = databasePath + suffix;
    if (existsSync(from)) renameSync(from, join(target, "demo.sqlite" + suffix));
  }
  return target;
}

function prepareDatabase() {
  process.env.NODE_ENV = "development";
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  let db = openDatabase(databasePath);
  try {
    if (inspectIdentity(db)?.origin !== "demo")
      throw new Error("La base existente no está identificada como DEMO.");
    if (db.query("SELECT id FROM owner LIMIT 1").get())
      throw new Error(
        "La base DEMO tiene credenciales configuradas; no se reutiliza. Archívala manualmente.",
      );
    if (flags.has("--reset") && !isFreshDemoDatabase(db)) {
      db.close();
      const archived = archiveExisting();
      console.log(`Base DEMO anterior archivada en ${archived}`);
      db = openDatabase(databasePath);
    }
    if (isFreshDemoDatabase(db)) {
      const summary = applyDemoDataset(db);
      console.log("Base DEMO creada con datos ficticios.");
      for (const [table, count] of Object.entries(summary.counts))
        if (count > 0) console.log(`  ${table}: ${count}`);
    } else {
      const summary = verifyDemoDataset(db);
      console.log("Base DEMO existente reutilizada (sin sobrescribir).");
      console.log(
        `  ${Object.entries(summary.counts)
          .filter(([, count]) => count > 0)
          .map(([table, count]) => `${table}=${count}`)
          .join(" ")}`,
      );
    }
  } finally {
    db.close();
  }
}

try {
  prepareDatabase();
} catch (error) {
  console.error(`No se pudo preparar la base DEMO: ${(error as Error).message}`);
  process.exit(1);
}

console.log(
  [
    "",
    "DEMO · Datos ficticios (sin inicio de sesión, solo red local)",
    `  Este Mac: http://127.0.0.1:${port}`,
    ...lan.map((address) => `  Red Wi-Fi: http://${address}:${port}`),
    "  API: 127.0.0.1:3001 (solo loopback) · Vite: 0.0.0.0 con proxy /api",
    `  Base: ${databasePath} (identidad demo, sin credenciales)`,
    "  Reiniciar datos: bun run dev:demo --reset",
    "",
  ].join("\n"),
);

if (flags.has("--seed-only")) process.exit(0);

const environment = {
  ...process.env,
  NODE_ENV: "development",
  MYFINANZAS_DEMO: "1",
  DATABASE_PATH: databasePath,
  AUTH_KEY_PATH: keyPath,
  DEMO_ORIGINS: origins.join(","),
  API_BIND_HOST: "127.0.0.1",
  VITE_BIND_HOST: "0.0.0.0",
};

const children: Subprocess[] = [];
function stop(code = 0) {
  for (const child of children) child.kill();
  process.exit(code);
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

const api = spawn([process.execPath, "--watch", "src/main.ts"], {
  cwd: join(root, "apps", "api"),
  env: environment,
  stdout: "inherit",
  stderr: "inherit",
});
const web = spawn(
  [
    process.execPath,
    join(root, "node_modules", "vite", "bin", "vite.js"),
    "--port",
    String(port),
    "--strictPort",
  ],
  {
    cwd: join(root, "apps", "web"),
    env: environment,
    stdout: "inherit",
    stderr: "inherit",
  },
);
children.push(api, web);

const exited = await Promise.race([
  api.exited.then((code) => ({ name: "API", code })),
  web.exited.then((code) => ({ name: "Vite", code })),
]);
console.error(`${exited.name} terminó con código ${exited.code}; cerrando DEMO.`);
stop(exited.code ?? 1);
