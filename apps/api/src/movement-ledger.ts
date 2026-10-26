import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
export const fingerprint = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
export type LedgerRow = {
  id: string;
  fecha: string;
  tipo: "Ingreso" | "Gasto" | "Transferencia" | "Amortización deuda";
  capital: string | null;
  intereses: string | null;
  referencia?: string | null;
  importe: string;
  origen: string;
  destino: string;
  subtipo: string | null;
  partida: string | null;
  concepto: string;
  nota: string;
  anulado: number;
  revision: number;
  creado: string;
  actualizado: string;
};
export function ledgerInstalled(db: Database) {
  const row = db.query("SELECT version FROM schema_version").get() as {
    version: number;
  };
  return row.version >= 4;
}
export function ledgerRows(db: Database): LedgerRow[] {
  return db
    .query(
      "SELECT id,fecha,tipo,CAST(capital AS TEXT) capital,CAST(intereses AS TEXT) intereses,CAST(importe AS TEXT) importe,origen,destino,subtipo,partida,referencia,concepto,nota,anulado,revision,creado,actualizado FROM movimientos ORDER BY length(id),id",
    )
    .all() as LedgerRow[];
}
export function positionCents(
  db: Database,
  id: string,
  opening: string | null,
) {
  let result = BigInt(opening ?? "0");
  const rows = db
    .query(
      "SELECT origen,destino,CAST(importe AS TEXT) importe FROM movimientos WHERE anulado=0 AND (origen=? OR destino=?)",
    )
    .all(id, id) as Pick<LedgerRow, "origen" | "destino" | "importe">[];
  for (const r of rows)
    result += (r.destino === id ? 1n : -1n) * BigInt(r.importe);
  return result.toString();
}
export function movementSource(
  db: Database,
):
  | { source: "Movimientos"; state: "pendiente" }
  | { source: "Movimientos"; state: "disponible"; maxDate: string | null } {
  if (!ledgerInstalled(db))
    return { source: "Movimientos", state: "pendiente" };
  const row = db
    .query("SELECT MAX(fecha) fecha FROM movimientos WHERE anulado=0")
    .get() as { fecha: string | null };
  return { source: "Movimientos", state: "disponible", maxDate: row.fecha };
}
export function financeRevision(db: Database) {
  return fingerprint([
    ledgerRows(db),
    ...(db
      .query("SELECT name FROM sqlite_master WHERE name='movimiento_anticipo'")
      .get()
      ? [
          db
            .query("SELECT * FROM movimiento_anticipo ORDER BY movimiento")
            .all(),
          db
            .query(
              "SELECT * FROM fotos_neto_apertura ORDER BY referencia,ciclo",
            )
            .all(),
        ]
      : []),
    ...(db
      .query("SELECT name FROM sqlite_master WHERE name='payroll_allocations'")
      .get()
      ? [
          db
            .query("SELECT * FROM payroll_allocations ORDER BY paga,movimiento")
            .all(),
          db.query("SELECT MAX(id) revision FROM payroll_audit").get(),
        ]
      : []),
    db
      .query(
        "SELECT id,nombre,inicio,CAST(apertura AS TEXT) apertura,estado,revision FROM deudas ORDER BY id",
      )
      .all(),
    db.query("SELECT * FROM referencias ORDER BY id").all(),
    db
      .query(
        "SELECT id,nombre,tipo,control,estado,exterior,CAST(apertura AS TEXT) apertura,fecha_apertura,revision FROM saldos ORDER BY id",
      )
      .all(),
    ...(db
      .query(
        "SELECT name FROM sqlite_master WHERE name='operaciones_inversion'",
      )
      .get()
      ? [
          db
            .query(
              "SELECT * FROM operaciones_inversion ORDER BY length(id),id",
            )
            .all(),
        ]
      : []),
    ...["categorias", "subcategorias", "partidas"].map((table) =>
      db.query(`SELECT * FROM ${table} ORDER BY id`).all(),
    ),
    db
      .query(
        "SELECT id,inicio,CAST(saldo_comida AS TEXT) saldo_comida FROM ciclos ORDER BY inicio",
      )
      .all(),
  ]);
}
export function saldoHasEconomicUse(
  db: Database,
  id: string,
  changed: string[],
) {
  const protectedFields = [
    "tipo",
    "control",
    "saldoApertura",
    "fechaApertura",
    "permiteSalidaExterior",
  ];
  return (
    changed.some((c) => protectedFields.includes(c)) &&
    ((ledgerInstalled(db) &&
      !!db
        .query("SELECT id FROM movimientos WHERE origen=? OR destino=? LIMIT 1")
        .get(id, id)) ||
      (!!db
        .query(
          "SELECT name FROM sqlite_master WHERE name='operaciones_inversion'",
        )
        .get() &&
        !!db
          .query(
            "SELECT id FROM operaciones_inversion WHERE saldo_efectivo=? OR saldo_inversion=? LIMIT 1",
          )
          .get(id, id)))
  );
}
