// Isolated fictional source and real MFA server for E3.2 base B. No fixture API.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createCompartido, createParticipante } from "../src/compartidos";
import { createClassification } from "../src/clasificacion";
import { createSaldo } from "../src/saldos";
import { previewMovement, writeMovement } from "../src/movimientos";
if (process.env.NODE_ENV !== "test") throw Error("Test process only");
const dir = ".local/e2e-compartidos";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key"),
  now = Date.parse("2026-10-26T12:00:00Z");
for (let i = 1; i <= 14; i++)
  createClassification(
    db,
    "categorias",
    {
      nombre: "Categoría ficticia " + i,
      anual: "Gasto",
      mensual: "Gasto",
      referencia: [11, 12, 13].includes(i),
    },
    crypto.randomUUID(),
    now,
  );
const sub = createClassification(
  db,
  "subcategorias",
  { nombre: "Vivienda ficticia", padre: "CAT013" },
  crypto.randomUUID(),
  now,
);
const partida = createClassification(
  db,
  "partidas",
  { nombre: "Piso ficticio", padre: sub.id },
  crypto.randomUUID(),
  now,
).id;
const saldo = createSaldo(
  db,
  {
    nombre: "Banco compartido ficticio",
    tipo: "Efectivo",
    control: "Movimientos",
    saldoApertura: "5000",
    fechaApertura: "2026-01-01",
    permiteSalidaExterior: true,
  },
  crypto.randomUUID(),
  now,
).id;
const saldoInterno = createSaldo(
  db,
  {
    nombre: "Reserva compartida ficticia",
    tipo: "Efectivo",
    control: "Movimientos",
    saldoApertura: "0",
    fechaApertura: "2026-01-01",
  },
  crypto.randomUUID(),
  now,
).id;
function gasto(ref: string, importe: string, fecha: string, concepto: string) {
  const body = {
    tipo: "Gasto",
    fecha,
    importe,
    saldo,
    partida,
    referencia: ref,
    concepto,
  };
  const p = previewMovement(db, body, null, false, now);
  return writeMovement(
    db,
    { ...body, fingerprint: p.fingerprint, aceptarCoincidencia: true },
    crypto.randomUUID(),
    null,
    false,
    now,
  ).movimiento;
}
const shared = createCompartido(
  db,
  { nombre: "Piso 2026" },
  crypto.randomUUID(),
  now,
).referencia.id;
for (const [nombre, rol, partes] of [
  ["Yo", "Titular", 1],
  ["Bea", "Tercero", 1],
  ["Álex", "Tercero", 1],
] as const)
  createParticipante(
    db,
    shared,
    { nombre, rol, partes },
    crypto.randomUUID(),
    now,
  );
gasto(shared, "300.00", "2026-10-05", "Alquiler ficticio");
gasto(shared, "150.00", "2026-10-06", "Limpieza ficticia");
const internal = {
  tipo: "Transferencia",
  fecha: "2026-10-08",
  importe: "50.00",
  origen: saldo,
  destino: saldoInterno,
  referencia: shared,
  concepto: "Movimiento interno ficticio",
};
const internalPlan = previewMovement(db, internal, null, false, now);
writeMovement(
  db,
  {
    ...internal,
    fingerprint: internalPlan.fingerprint,
    aceptarCoincidencia: true,
  },
  crypto.randomUUID(),
  null,
  false,
  now,
);
const solo = createCompartido(
  db,
  { nombre: "Solo mío" },
  crypto.randomUUID(),
  now,
).referencia.id;
createParticipante(
  db,
  solo,
  { nombre: "Yo", rol: "Titular", partes: 1 },
  crypto.randomUUID(),
  now,
);
gasto(solo, "50.00", "2026-10-07", "Gasto propio ficticio");
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: 3009 })),
    ),
  ),
);
