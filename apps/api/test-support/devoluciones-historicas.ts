import type { Database } from "bun:sqlite";
import { money } from "../src/saldos";

/**
 * #597 · Siembra de hechos de devolución HISTÓRICOS en bases ficticias.
 *
 * Desde F3 la API ya no crea devoluciones sin compra (`DEVOLUTION_LINK_REQUIRED`)
 * ni devoluciones en Revisión Comida (`DEVOLUTION_LEGACY_WRITE`). SPEC39 §3.2 y
 * §5.1 conservan y leen los hechos ya existentes, así que las pruebas de ese
 * comportamiento los siembran directamente en SQLite, con la misma forma que
 * dejaba el alta anterior. No lo importa ningún módulo de producción.
 */
function reservar(db: Database, counter: "movimientos" | "revision_comida") {
  return (
    db
      .query(
        "UPDATE counters SET next=next+1 WHERE name=? RETURNING CAST(next-1 AS TEXT) n",
      )
      .get(counter) as { n: string }
  ).n;
}

/** Movimiento «Devolución de gasto» sin compra ni fila de vínculo. */
export function sembrarDevolucionHuerfana(
  db: Database,
  hecho: {
    fecha: string;
    importe: string;
    saldo: string;
    concepto: string;
    partida?: string | null;
    nota?: string;
  },
  now: number,
): string {
  const time = new Date(now).toISOString();
  return db
    .transaction(() => {
      const id = reservar(db, "movimientos");
      db.run(
        `INSERT INTO movimientos(id,fecha,tipo,importe,origen,destino,partida,concepto,nota,revision,creado,actualizado)
         VALUES(?,?,'Devolución de gasto',?,'S000',?,?,?,?,1,?,?)`,
        [
          id,
          hecho.fecha,
          money(hecho.importe)!,
          hecho.saldo,
          hecho.partida ?? null,
          hecho.concepto,
          hecho.nota ?? "",
          time,
          time,
        ],
      );
      const posterior = JSON.stringify({
        id,
        fecha: hecho.fecha,
        tipo: "Devolución de gasto",
        importe: hecho.importe,
        origen: "S000",
        destino: hecho.saldo,
        partida: hecho.partida ?? null,
        concepto: hecho.concepto,
        nota: hecho.nota ?? "",
      });
      db.run(
        "INSERT INTO movement_audit VALUES(?,1,'alta',NULL,?,'usuario-unico',NULL,?)",
        [id, time, posterior],
      );
      db.run(
        "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,'alta',1,'[]',?,0,'usuario-unico',NULL)",
        ["movimiento:" + id, time],
      );
      return id;
    })
    .immediate();
}

/** Fila legacy de Revisión Comida marcada como devolución, con su auditoría de alta. */
export function sembrarDevolucionLegacy(
  db: Database,
  hecho: {
    fecha: string;
    concepto: string;
    importe: string;
    clasificacion: string;
    evidenciaBancaria?: string | null;
    evidenciaRelacionCompra?: string | null;
    cuentaOrigen?: string | null;
  },
  now: number,
): string {
  const time = new Date(now).toISOString();
  return db
    .transaction(() => {
      const id = reservar(db, "revision_comida");
      db.run(
        `INSERT INTO revision_comida(id,tipo,fecha,concepto,importe,direccion,es_devolucion,clasificacion,fuera_presupuesto_historico,evidencia_bancaria,evidencia_relacion_compra,cuenta_origen,tipo_vinculo,estado_vinculo,evidencia_vinculo,movimiento,revision_movimiento,estado_registro,estado_trazabilidad,revision,creado,actualizado)
         VALUES(?,'Detalle',?,?,?,'Entrada',1,?,NULL,?,?,?,NULL,'Sin vínculo',NULL,NULL,NULL,'Vigente','Sin asignación',1,?,?)`,
        [
          id,
          hecho.fecha,
          hecho.concepto,
          money(hecho.importe)!,
          hecho.clasificacion,
          hecho.evidenciaBancaria ?? null,
          hecho.evidenciaRelacionCompra ?? null,
          hecho.cuentaOrigen ?? null,
          time,
          time,
        ],
      );
      db.run(
        "INSERT INTO revision_comida_audit(operacion,accion,revision,anterior,posterior,motivo,instante,actor) VALUES(?,'alta',1,NULL,?,NULL,?,'usuario-unico')",
        [id, JSON.stringify({ id, ...hecho, esDevolucion: true }), time],
      );
      return id;
    })
    .immediate();
}
