// Isolated fictional E3.3 source with real MFA. No fixture API or auth bypass.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createReference, updateReference } from "../src/referencias";
import { createClassification } from "../src/clasificacion";
import { createSaldo } from "../src/saldos";
import type { AnnualProvider } from "../src/plan-anual";
if (process.env.NODE_ENV !== "test") throw Error("Test process only");
const dir = ".local/e2e-vehiculos";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite"),
  key = loadKey(db, dir + "/auth.key"),
  now = Date.parse("2026-10-26T12:00:00Z");
const id = () => crypto.randomUUID();
const category = createClassification(
    db,
    "categorias",
    { nombre: "Vehículo E2E", anual: "Gasto", mensual: "Gasto", referencia: false },
    id(),
    now,
  ),
  sub = createClassification(
    db,
    "subcategorias",
    { nombre: "Sub vehículo E2E", padre: category.id },
    id(),
    now,
  ),
  parts = ["Mantenimiento", "Seguro", "Combustible"].map((nombre) =>
    createClassification(
      db,
      "partidas",
      { nombre, padre: sub.id },
      id(),
      now,
    ),
  );
const mixed = createReference(
    db,
    {
      nombre: "Coche principal",
      tipo: "Vehículo",
      vehiculo: {
        matricula: "1234 ABC",
        proximaITV: "2026-09-12",
        cita: "2026-08-20",
      },
    },
    id(),
    now,
  ),
  moto = createReference(
    db,
    {
      nombre: "Moto",
      tipo: "Vehículo",
      vehiculo: { matricula: "5678 DEF" },
    },
    id(),
    now,
  ),
  van = createReference(
    db,
    {
      nombre: "Furgoneta",
      tipo: "Vehículo",
      vehiculo: { proximaITV: "2027-03-03", cita: "2025-01-10" },
    },
    id(),
    now,
  );
updateReference(db, van.id, { revision: van.revision, estado: "Inactiva" }, now);
const conversion = createReference(
    db,
    { nombre: "Coche secundario", tipo: "Viaje" },
    id(),
    now,
  ),
  used = createReference(db, { nombre: "Viaje usado", tipo: "Viaje" }, id(), now),
  missingRef = "REF900",
  wrongRef = "REF901";
db.run(
  "INSERT INTO referencias VALUES(?,'Furgoneta sin ficha','Vehículo','Activa',1,?,?)",
  [missingRef, new Date(now).toISOString(), new Date(now).toISOString()],
);
db.run(
  "INSERT INTO referencias VALUES(?,'Ficha de Viaje','Viaje','Activa',1,?,?)",
  [wrongRef, new Date(now).toISOString(), new Date(now).toISOString()],
);
db.exec("DROP TRIGGER ficha_vehiculo_type");
db.run(
  "INSERT INTO fichas_vehiculo VALUES(?,'WRONG 001',NULL,NULL,1,?,?)",
  [wrongRef, new Date(now).toISOString(), new Date(now).toISOString()],
);
db.exec(`CREATE TRIGGER ficha_vehiculo_type BEFORE INSERT ON fichas_vehiculo
  WHEN (SELECT tipo FROM referencias WHERE id=NEW.referencia) IS NOT 'Vehículo'
  BEGIN SELECT RAISE(ABORT,'invalid vehicle reference type'); END;`);
function fact(
  reference: string,
  partida: string,
  fecha: string,
  importe: number,
) {
  const n = db
    .query(
      "UPDATE counters SET next=next+1 WHERE name='movimientos' RETURNING CAST(next-1 AS TEXT) n",
    )
    .get() as { n: string };
  db.run(
    "INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,referencia,concepto,nota,anulado,revision,creado,actualizado) VALUES(?,?,'Gasto',?,'S001','S000',?,?,'Gasto ficticio vehículo','',0,1,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')",
    [n.n, fecha, importe, partida, reference],
  );
}
fact(mixed.id, parts[0].id, "2026-02-15", 12000);
fact(mixed.id, parts[1].id, "2026-06-20", 40000);
fact(mixed.id, parts[2].id, "2026-06-30", 72000);
fact(mixed.id, parts[1].id, "2026-07-01", 5000);
fact(used.id, parts[0].id, "2026-02-15", 1000);
const annualProvider: AnnualProvider = (_db, year) => {
  if (year === 2025)
    return {
      revision: "e2e-2025",
      control: { inicio: "2025-01-01", fin: "2025-12-31" },
      historico: [],
      historicoDisponible: true,
      protecciones: [],
      cierresDisponibles: true,
    };
  if (year === 2026)
    return {
      revision: "e2e-2026",
      control: { inicio: "2026-01-01", fin: "2026-06-30" },
      historico: [
        {
          partida: parts[1].id,
          ejercicio: 2026,
          importeCentimos: "1",
          fecha: null,
          intervalo: { inicio: "2026-05-01", fin: "2026-07-15" },
          procedencia: "Fixture de cobertura parcial",
          verificado: true,
          representadoEnMovimientos: false,
        },
      ],
      historicoDisponible: true,
      protecciones: [],
      cierresDisponibles: true,
    };
  return {
    revision: "e2e-futura",
    control: null,
    historico: [],
    historicoDisponible: false,
    protecciones: [],
    cierresDisponibles: false,
  };
};
writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(createApp(db, { key, annualProvider })).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "127.0.0.1", port: 3009 })),
    ),
  ),
);
