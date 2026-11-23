// Fixture aislado de #448 (iconos por Tipo en Movimientos). Test-only: proceso
// aparte, SQLite ficticia, MFA real y ni una fila de datos personales.
//
// Siembra un Movimiento por cada Tipo del contrato para que la lista muestre
// los cinco glifos, incluidos los dos textos largos («Amortización deuda» y
// «Devolución de gasto») que se usan en las mediciones de desbordamiento.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { loadKey, provision } from "../src/auth";
import { createClassification } from "../src/clasificacion";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";
import { createDebt } from "../src/deudas";
import { previewMovement, writeMovement } from "../src/movimientos";
import { getSaldo, updateSaldo } from "../src/saldos";
import { gateAbiertoParaPruebas } from "./devolucion-gate-abierto";

if (process.env.NODE_ENV !== "test") throw new Error("Test process only");

const NOW = Date.parse("2026-11-03T10:00:00Z");
// Estado y puerto del contexto de la ejecución (#514): `E2E_STATE_DIR` y
// `E2E_PORT` tienen prioridad sobre los nombres históricos. El puerto sigue
// fallando cerrado: este fixture no adivina un valor libre.
const dir =
  process.env.E2E_STATE_DIR ??
  process.env.E2E_ICONOS_DIR ??
  ".local/e2e-iconos";
const port = Number(process.env.E2E_PORT ?? process.env.E2E_API_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("El fixture #448 exige E2E_PORT/E2E_API_PORT reservado por la spec.");

function saveMovement(db: Database, body: Record<string, unknown>) {
  const plan = previewMovement(db, body, null, false, NOW);
  return writeMovement(
    db,
    { ...body, fingerprint: plan.fingerprint, aceptarCoincidencia: true },
    randomUUID(),
    null,
    false,
    NOW,
    undefined,
    gateAbiertoParaPruebas,
  ).movimiento;
}

rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");

// Los saldos demo no permiten salida al Exterior por defecto; un Gasto y una
// Amortización lo exigen. Se habilita solo en los dos saldos del fixture.
for (const id of ["S001", "S002"])
  updateSaldo(
    db,
    id,
    {
      revision: getSaldo(db, id).revision,
      liquidez: true,
      permiteSalidaExterior: true,
    },
    undefined,
    NOW,
  );

const category = createClassification(
  db,
  "categorias",
  {
    nombre: "Gasto ficticio 448",
    anual: "Gasto",
    mensual: "Gasto",
    referencia: false,
  },
  randomUUID(),
  NOW,
);
const sub = createClassification(
  db,
  "subcategorias",
  { nombre: "Sub ficticia 448", padre: category.id },
  randomUUID(),
  NOW,
);
const partida = createClassification(
  db,
  "partidas",
  { nombre: "Partida ficticia 448", padre: sub.id },
  randomUUID(),
  NOW,
).id;
const deuda = createDebt(
  db,
  {
    nombre: "Deuda ficticia 448",
    inicioControl: "2026-01-01",
    capitalApertura: "1000.00",
    tipoDeuda: "No hipotecaria",
  },
  randomUUID(),
  NOW,
);
const partidaDeuda = createClassification(
  db,
  "partidas",
  { nombre: "Cuota ficticia 448", padre: sub.id, deuda: deuda.id },
  randomUUID(),
  NOW,
).id;

// Un hecho por Tipo: es la única fuente de los cinco glifos.
saveMovement(db, {
  tipo: "Ingreso",
  fecha: "2026-07-01",
  saldo: "S001",
  subtipo: "Nómina",
  importe: "1000.00",
  concepto: "Ingreso ficticio 448",
});
saveMovement(db, {
  tipo: "Gasto",
  fecha: "2026-07-02",
  saldo: "S001",
  partida,
  importe: "200.00",
  concepto: "Gasto ficticio 448",
});
saveMovement(db, {
  tipo: "Transferencia",
  fecha: "2026-07-03",
  origen: "S001",
  destino: "S002",
  importe: "100.00",
  concepto: "Transferencia ficticia 448",
});
saveMovement(db, {
  tipo: "Amortización deuda",
  fecha: "2026-07-04",
  saldo: "S001",
  partida: partidaDeuda,
  importe: "50.00",
  concepto: "Amortización ficticia 448",
});
saveMovement(db, {
  tipo: "Devolución de gasto",
  fecha: "2026-07-05",
  saldo: "S001",
  importe: "25.00",
  concepto: "Devolución ficticia 448",
});

const key = loadKey(db, dir + "/auth.key");
// Bootstrap con reloj real para que la ventana MFA siga siendo válida.
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, {
      key,
      devolucionGate: gateAbiertoParaPruebas,
      // Origen de la ejecución (#514): sin él, el alta y la sesión del run se
      // rechazarían con 403 ORIGIN.
      origin: process.env.APP_ORIGIN ?? process.env.E2E_APP_ORIGIN,
    })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port })),
    ),
  ),
);