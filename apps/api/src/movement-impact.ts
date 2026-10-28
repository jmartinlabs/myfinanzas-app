import { validateReference } from "./reference-rules";
import type { Database } from "bun:sqlite";
import type { Entity } from "./classification-schema";
import {
  financeRevision,
  ledgerInstalled,
  ledgerRows,
} from "./movement-ledger";
import { cycleMaster } from "./ciclos";
import { Problem, decimal } from "./saldos";
type Node = {
  id: string;
  nombre: string;
  padre?: string;
  referencia?: number | boolean | null;
  anual?: string | null;
  mensual?: string | null;
};
export function classificationMovementImpact(
  db: Database,
  kind: Entity,
  id: string,
  next: Record<string, unknown>,
  economic: string[],
) {
  if (!ledgerInstalled(db)) return undefined;
  const node = (table: Entity, key: string, after: boolean): Node => {
    const r = db
      .query(`SELECT * FROM ${table} WHERE id=?`)
      .get(key) as Node | null;
    if (!r)
      throw new Error("Relación histórica de clasificación no disponible.");
    return after && kind === table && key === id
      ? ({ ...r, ...next } as Node)
      : r;
  };
  const chain = (partida: string, after: boolean) => {
    const p = node("partidas", partida, after),
      sub = node("subcategorias", p.padre!, after),
      cat = node("categorias", sub.padre!, after);
    return {
      partida: { id: p.id, nombre: p.nombre },
      subcategoria: { id: sub.id, nombre: sub.nombre },
      categoria: { id: cat.id, nombre: cat.nombre },
      anual: cat.anual,
      mensual: cat.mensual,
      referencia: cat.referencia === 1 || cat.referencia === true,
    };
  };
  const cycles = cycleMaster(db);
  const movements = ledgerRows(db)
    .filter((r) => {
      if (!r.partida) return false;
      const c = chain(r.partida, false);
      return kind === "partidas"
        ? r.partida === id
        : kind === "subcategorias"
          ? c.subcategoria.id === id
          : c.categoria.id === id;
    })
    .map((r) => {
      const before = chain(r.partida!, false),
        after = chain(r.partida!, true);
      if (economic.length && !r.anulado) {
        try {
          validateReference(
            db,
            r.referencia,
            after.categoria.id,
            after.referencia,
            r.referencia ?? null,
          );
        } catch (e) {
          if (e instanceof Problem)
            throw new Problem(
              409,
              e.code,
              "La rectificación invalidaría la Referencia de un Gasto existente: " +
                e.message,
            );
          throw e;
        }
      }
      return {
        id: r.id,
        fecha: r.fecha,
        estado: r.anulado ? "Anulado" : "Vigente",
        importe: decimal(r.importe),
        antes: before,
        despues: after,
        ciclo:
          cycles.find(
            (c) => c.inicio <= r.fecha && (c.fin === null || r.fecha <= c.fin),
          ) ?? null,
      };
    });
  return {
    used: movements.length > 0,
    revision: financeRevision(db),
    movimientos: movements,
  };
}
