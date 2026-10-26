import type { Database } from "bun:sqlite";

export type RevisionComidaRow = {
  id: string;
  tipo: "Detalle" | "Reposicion";
  fecha: string;
  concepto: string;
  importe: string;
  direccion: "Salida" | "Entrada";
  esDevolucion: number;
  clasificacion: string | null;
  fueraPresupuestoHistorico: number | null;
  evidenciaBancaria: string | null;
  evidenciaRelacionCompra: string | null;
  cuentaOrigen: string | null;
  tipoVinculo: "Individual" | "Agregado terminal" | null;
  estadoVinculo: "Sin vínculo" | "Verificado";
  evidenciaVinculo: string | null;
  movimiento: string | null;
  revisionMovimiento: number | null;
  estadoRegistro: "Vigente" | "Anulado";
  estadoTrazabilidad: "Asignada" | "Sin asignación";
  revision: number;
  creado: string;
  actualizado: string;
};

const select =
  "SELECT id,tipo,fecha,concepto,CAST(importe AS TEXT) importe,direccion,es_devolucion esDevolucion,clasificacion,fuera_presupuesto_historico fueraPresupuestoHistorico,evidencia_bancaria evidenciaBancaria,evidencia_relacion_compra evidenciaRelacionCompra,cuenta_origen cuentaOrigen,tipo_vinculo tipoVinculo,estado_vinculo estadoVinculo,evidencia_vinculo evidenciaVinculo,movimiento,revision_movimiento revisionMovimiento,estado_registro estadoRegistro,estado_trazabilidad estadoTrazabilidad,revision,creado,actualizado FROM revision_comida";

export function revisionComidaInstalled(db: Database) {
  return !!db
    .query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='revision_comida'",
    )
    .get();
}

export function revisionComidaRows(db: Database): RevisionComidaRow[] {
  if (!revisionComidaInstalled(db)) return [];
  return db
    .query(`${select} ORDER BY length(id),id`)
    .all() as RevisionComidaRow[];
}

export function revisionComidaById(db: Database, id: string) {
  return (db.query(`${select} WHERE id=?`).get(id) ?? null) as
    | RevisionComidaRow
    | null;
}

export function revisionComidaSource(db: Database):
  | { source: "Revisión Comida"; state: "pendiente" }
  | { source: "Revisión Comida"; state: "disponible"; maxDate: string | null }
  | { source: "Revisión Comida"; state: "error" } {
  if (!revisionComidaInstalled(db))
    return { source: "Revisión Comida", state: "pendiente" };
  try {
    const row = db
      .query(
        "SELECT MAX(fecha) fecha FROM revision_comida WHERE estado_registro='Vigente' AND length(fecha)=10 AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha)=fecha",
      )
      .get() as { fecha: string | null };
    return {
      source: "Revisión Comida",
      state: "disponible",
      maxDate: row.fecha,
    };
  } catch {
    return { source: "Revisión Comida", state: "error" };
  }
}

export function revisionComidaRange(db: Database) {
  if (!revisionComidaInstalled(db)) return { desde: null, hasta: null };
  const row = db
    .query(
      "SELECT MIN(fecha) desde,MAX(fecha) hasta FROM revision_comida WHERE estado_registro='Vigente' AND length(fecha)=10 AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(fecha)=fecha",
    )
    .get() as { desde: string | null; hasta: string | null };
  return row;
}
