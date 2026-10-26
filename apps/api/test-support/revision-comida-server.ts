// Isolated fictional source and real MFA server. There is no fixture API.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import {
  createRevisionComida,
  vincularRevisionComida,
} from "../src/revision-comida";
import { revisionComidaFixture } from "./revision-comida-fixture";
if (process.env.NODE_ENV !== "test") throw Error("Test process only");
const dir = ".local/e2e-revision-comida";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key"),
  now = Date.parse("2026-10-26T12:00:00Z");
revisionComidaFixture(db);
const detail = (over: Record<string, unknown>) =>
  createRevisionComida(
    db,
    {
      fecha: "2026-10-03",
      concepto: "Operación ficticia",
      importe: "10.00",
      direccion: "Salida",
      esDevolucion: false,
      clasificacion: "Comida",
      evidenciaBancaria: "operación ficticia",
      ...over,
    },
    crypto.randomUUID(),
    now,
    "Detalle",
  ).operacion;
const created = [
  detail({
    fecha: "2026-10-03",
    concepto: "Supermercado ficticio",
    importe: "42.10",
    evidenciaBancaria: "operación bancaria ficticia",
  }),
  detail({ fecha: "2026-10-04", concepto: "Cine ficticio", importe: "8.50", clasificacion: "Ocio" }),
  detail({
    fecha: "2026-10-05",
    concepto: "Compra no presupuestada ficticia",
    importe: "15.00",
    clasificacion: "Fuera presupuesto",
  }),
  detail({
    fecha: "2026-10-06",
    concepto: "Supermercado pendiente ficticio",
    importe: "30.00",
    clasificacion: "Pendiente revisar",
  }),
  detail({
    fecha: "2026-10-07",
    concepto: "Compra sin evidencia ficticia",
    importe: "10.00",
    evidenciaBancaria: null,
  }),
  detail({
    fecha: "2026-10-08",
    concepto: "Devolución supermercado ficticia",
    importe: "12.00",
    direccion: "Entrada",
    esDevolucion: true,
  }),
];
const repos = createRevisionComida(
  db,
  {
    fecha: "2026-10-12",
    concepto: "Reposición comida ficticia",
    importe: "20.00",
    direccion: "Entrada",
    esDevolucion: false,
    evidenciaBancaria: "operación ficticia E-08",
    cuentaOrigen: "Cuenta ficticia",
  },
  crypto.randomUUID(),
  now,
  "Reposicion",
).operacion;
vincularRevisionComida(
  db,
  created[0].id,
  {
    revision: 1,
    motivo: "correspondencia ficticia",
    movimiento: "201",
    tipoVinculo: "Agregado terminal",
    evidenciaVinculo: "extracto terminal ficticio",
  },
  crypto.randomUUID(),
  now,
  "Detalle",
);
vincularRevisionComida(
  db,
  repos.id,
  {
    revision: 1,
    motivo: "transferencia ficticia",
    movimiento: "204",
    tipoVinculo: "Individual",
    evidenciaVinculo: "justificante ficticio",
  },
  crypto.randomUUID(),
  now,
  "Reposicion",
);
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: 3009 })),
    ),
  ),
);
