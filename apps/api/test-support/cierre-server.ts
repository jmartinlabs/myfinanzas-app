// Test-only E4.9 API with real MFA and fictitious fixtures. Never imported by
// the application and never pointed at real data.
//
// DT6/T-BKP evidence is INJECTED here through `createApp({ cierre })` so the UI
// and E2E can exercise the closure transaction. This is not a real backup
// provider and does not close DT6: the real external restore and its proof
// remain open, so a real closure is still blocked.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { openDatabase } from "../src/database";
import { loadKey, provision } from "../src/auth";
import { createApp } from "../src/app";
import { createSaldo } from "../src/saldos";
import {
  confirmCierre,
  previewCierre,
  type CierreOptions,
} from "../src/e49";

if (process.env.NODE_ENV !== "test") throw Error("Test process only");

const scenario = process.env.E49_SCENARIO ?? "listo";
const port = Number(process.env.E49_PORT ?? 3031);
const dir = `.local/e2e-cierre-${scenario}`;
const NOW = Date.parse("2026-11-03T10:00:00Z");

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

// Unused fictitious classification: lets the E2E rename a Partida after the
// closure (T3) and verify the photo is not recalculated.
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

const verifiedEvidence: CierreOptions = {
  appVersion: "0.0.0-e2e",
  backup: {
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

let options: CierreOptions = verifiedEvidence;

switch (scenario) {
  case "sin-ciclo":
    break;
  case "sin-siguiente":
    cycles(1);
    break;
  case "bloqueado":
    cycles(2);
    options = {
      appVersion: "0.0.0-e2e",
      backup: {
        verificado: false,
        restauracionProbada: false,
        motivo: "Sin evidencia DT6/T-BKP (fixture de bloqueo).",
      },
      e35: {
        verificable: false,
        motivo: "E3.5/FIN_NETA no verificable (fixture de bloqueo).",
      },
    };
    break;
  case "backup-sin-referencia":
    cycles(2);
    options = {
      appVersion: "0.0.0-e2e",
      backup: {
        verificado: true,
        restauracionProbada: true,
        referencia: null,
        motivo: null,
      },
      e35: verifiedEvidence.e35,
    };
    break;
  case "fuente":
    cycles(2);
    // Simulate an applicable auxiliary source that cannot be read: the
    // closure must block instead of treating it as "Sin hechos".
    db.run("DROP TABLE movimiento_anticipo");
    break;
  case "fuera-orden":
    cycles(3);
    closeLater("2");
    break;
  case "incoherente":
    cycles(3);
    closeLater("2");
    // A fact inside the later photo's frozen window that contradicts the
    // stored photo. Test-only direct write; the public T1 guard blocks this.
    db.run(
      `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
        partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
        capital,intereses)
       VALUES('990','2026-02-10','Transferencia',500,'S001','S002',NULL,
        NULL,NULL,'Contradicción ficticia E4.9','',0,1,'f','f',NULL,NULL)`,
    );
    break;
  case "listo":
  case "replay":
  case "conflicto":
  case "nav":
    cycles(2);
    if (scenario === "nav")
      db.run(
        `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,subtipo,
          partida,referencia,concepto,nota,anulado,revision,creado,actualizado,
          capital,intereses)
         VALUES('101','2026-01-10','Gasto',1000,'S001','S000',NULL,'PAR001',
          NULL,'Gasto ficticio de navegación','',0,1,'f','f',NULL,NULL)`,
      );
    break;
}

function closeLater(ciclo: string) {
  const pre = previewCierre(db, ciclo, options, NOW);
  if (pre.bloqueos.length)
    throw Error(
      `fixture: no se pudo cerrar el ciclo ${ciclo}: ${pre.bloqueos
        .map((item) => item.code)
        .join(",")}`,
    );
  confirmCierre(
    db,
    ciclo,
    { fingerprint: pre.fingerprint, motivo: "Cierre posterior ficticio E4.9" },
    randomUUID(),
    options,
    NOW,
  );
}

writeFileSync(dir + "/bootstrap.txt", provision(db), { mode: 0o600 });
BunRuntime.runMain(
  Layer.launch(
    HttpServer.serve(
      createApp(db, {
        key,
        cierre: options,
      }),
    ).pipe(
      Layer.provide(
        BunHttpServer.layer({ hostname: "127.0.0.1", port }),
      ),
    ),
  ),
);
