// Test-only API with real MFA and fictitious fixtures for the closing
// validation surface (SPEC38 · I2). Never imported by the application and never
// pointed at real data.
//
// #555: la vía fotográfica se retiró. El fixture ya no cierra con foto ni
// reabre: prepara ciclos ficticios y, cuando el escenario lo pide, una
// referencia humana (`cierre_validacion`) para ejercitar estado, preview y
// confirmación. La evidencia DT6/T-BKP se sigue inyectando como opción del
// servidor de test para demostrar que **no** es criterio de validación.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createSaldo } from "../src/saldos";
import { requisitosDeValidacion } from "../src/cierre-validacion-servicio";
import {
  VERSION_CONJUNTO,
  huellaUniverso,
  universoFinanciero,
} from "../src/cierre-validacion-impacto";

if (process.env.NODE_ENV !== "test") throw Error("Test process only");

const scenario = process.env.E49_SCENARIO ?? "listo";
// Puerto y estado del contexto de la ejecución (#514), con prioridad sobre los
// nombres históricos `E49_*`; sin contexto se conservan los valores de siempre
// para poder arrancarlo a mano.
const port = Number(process.env.E2E_PORT ?? process.env.E49_PORT ?? 3031);
const dir = process.env.E2E_STATE_DIR ?? `.local/e2e-cierre-${scenario}`;
const NOW = Date.parse("2026-11-03T10:00:00Z");
const INSTANTE = new Date(NOW).toISOString();

rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = openDatabase(dir + "/demo.sqlite");
const key = loadKey(db, dir + "/auth.key");

function saldo(body: Record<string, unknown>) {
  return createSaldo(db, body, randomUUID(), NOW);
}

// Fictitious cash and investment accounts so E4.1 cash/positions are readable
// at the frozen Fin. Amounts are demonstration data, not real balances.
saldo({
  nombre: "Cuenta efectivo ficticia E4.9",
  tipo: "Efectivo",
  control: "Inversiones",
  estado: "Activa",
  liquidez: true,
  finalidad: null,
  mostrarComoBolsa: false,
  permiteSalidaExterior: false,
  fechaApertura: "2025-12-01",
  saldoApertura: "0.00",
});
saldo({
  nombre: "Cartera ficticia E4.9",
  tipo: "Inversión",
  control: "Inversiones",
  estado: "Activa",
  liquidez: false,
  finalidad: "Inversión",
  mostrarComoBolsa: false,
  permiteSalidaExterior: false,
  fechaApertura: "2025-12-01",
  saldoApertura: "0.00",
});

// Unused fictitious classification: a fact can be written inside a cycle
// without inventing a real Partida.
db.exec(`
  INSERT INTO categorias(id,nombre,grupo,anual,mensual,referencia,estado,revision,creado,actualizado)
  VALUES('CAT001','Comida ficticia E4.9','Gasto','Gasto','Gasto',0,'Activa',1,'f','f');
  INSERT INTO subcategorias(id,nombre,padre,estado,revision,creado,actualizado)
  VALUES('SUB001','Subcategoría ficticia E4.9','CAT001','Activa',1,'f','f');
  INSERT INTO partidas(id,nombre,padre,estado,revision,creado,actualizado,deuda,presupuesto)
  VALUES('PAR001','Partida ficticia E4.9','SUB001','Activa',1,'f','f',NULL,NULL);
`);

function cycles(count: number) {
  const starts = ["2026-01-01", "2026-02-01", "2026-03-01"];
  for (let i = 0; i < count; i++)
    db.run(
      "INSERT INTO ciclos(id,inicio,saldo_comida,creado) VALUES(?,?,?,?)",
      [String(i + 1), starts[i], 100000, "f"],
    );
}

function gasto(id: string, concepto: string) {
  db.run(
    `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
       partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
       capital,intereses)
     VALUES(?, '2026-01-10','Gasto',1000,'S001','S000',NULL,'PAR001',
       NULL,?,'',0,1,'f','f',NULL,NULL)`,
    [id, concepto],
  );
}

/**
 * Cobertura persistida: la que el propio contrato calcula para el ciclo, no una
 * lista inventada por el fixture.
 */
function coberturaPersistida(ciclo: string) {
  return JSON.stringify(requisitosDeValidacion(db, ciclo).cobertura);
}

/** Huella vigente del conjunto, calculada por el módulo bajo prueba. */
function huellaVigente(ciclo: string) {
  return huellaUniverso(universoFinanciero(db, ciclo));
}

/**
 * Referencia humana ficticia. `dirty=1` reproduce la marca de §3.2 (un hecho
 * material posterior a la referencia) sin pasar por una escritura real: es un
 * estado de fixture, como los cierres ficticios de E4.9, y el trigger del
 * esquema sigue exigiendo sus cuatro campos coherentes.
 */
function referenciaHumana(ciclo: string, dirty: boolean) {
  db.run(
    `INSERT INTO cierre_validacion(ciclo,revision,dirty,
       dirty_desde,dirty_ultimo,dirty_origen,dirty_motivos,
       huella_validacion,version_conjunto,revision_actor,revision_instante,
       revision_motivo,cobertura)
     VALUES(?,1,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      ciclo,
      dirty ? 1 : 0,
      dirty ? INSTANTE : null,
      dirty ? INSTANTE : null,
      dirty ? "Operacion" : null,
      dirty ? JSON.stringify(["FLUJO_CICLO"]) : null,
      huellaVigente(ciclo),
      VERSION_CONJUNTO,
      "fixture-e2e",
      INSTANTE,
      "Referencia humana ficticia de test",
      coberturaPersistida(ciclo),
    ],
  );
}

switch (scenario) {
  case "sin-ciclo":
    break;
  case "sin-siguiente":
    // Un solo ciclo: no hay siguiente Inicio, así que no se deriva Fin y el
    // contrato responde 422 con SIN_SIGUIENTE_INICIO.
    cycles(1);
    break;
  case "validada":
    cycles(2);
    referenciaHumana("1", false);
    break;
  case "pendiente":
    cycles(2);
    referenciaHumana("1", true);
    break;
  case "sin-contrato":
    // Restore a medias: el contrato de validación no está. La lectura debe
    // fallar cerrada con 503 y nunca presentar el ciclo como «sin validar».
    cycles(2);
    db.run("DROP TABLE cierre_validacion");
    break;
  case "listo":
  case "replay":
  case "conflicto":
  case "backup-sin-referencia":
  case "nav":
    cycles(2);
    if (scenario === "nav") gasto("101", "Gasto ficticio de navegación");
    break;
  default:
    throw Error(`escenario desconocido: ${scenario}`);
}

// Evidencia DT6/T-BKP inyectada. Ya no decide ninguna validación: se declara
// aquí para demostrar que su ausencia no bloquea el conjunto.
const evidencia = {
  appVersion: "0.0.0-e2e",
  backup:
    scenario === "backup-sin-referencia"
      ? { verificado: true, restauracionProbada: true, referencia: null, motivo: null }
      : {
          verificado: true,
          restauracionProbada: true,
          referencia: "evidencia-ficticia-e49",
        },
  e35: {
    verificable: true,
    motivo: null,
    huella: "b".repeat(64),
    cobertura: "Verificada",
    datos: { fixture: "E3.5 inyectada solo en el servidor de test" },
  },
};

writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      createApp(db, {
        key,
        origin: process.env.E410_ORIGIN,
        cierre: evidencia,
      }),
    ).pipe(
      Layer.provide(
        BunHttpServer.layer({ hostname: "127.0.0.1", port }),
      ),
    ),
  ),
);