import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { dayBefore, getCycle, cycleMaster, civil } from "./ciclos";
import { ledgerRows, fingerprint, type LedgerRow } from "./movement-ledger";
import { getSaldo, decimal, money, Problem } from "./saldos";
import { getClassification } from "./clasificacion";
import { comidaInstalled } from "./comida";

/**
 * SPEC33 D′ simplificada — services.
 *
 * Partidas are the single planifiable master; Presupuestos is never renamed or
 * merged automatically. Monthly execution is attributed by Partida, forecasts
 * are labels + lines (never economic facts) and an opening only proposes an
 * amount for the monthly plan: it never creates a Movimiento or transfers money.
 */

export const fuentes = ["Gasto real", "Aportación a saldo", "No aplica"] as const;
export type Fuente = (typeof fuentes)[number];
const cents = (value: string) => {
  const [whole, fraction = ""] = value.split(".");
  const sign = whole.startsWith("-") ? -1n : 1n;
  return (
    sign *
    (BigInt(whole.replace("-", "")) * 100n +
      BigInt(fraction.padEnd(2, "0").slice(0, 2)))
  );
};
const sum = (values: bigint[]) => values.reduce((a, b) => a + b, 0n);
function divRound(n: bigint, d: bigint) {
  if (d <= 0n) return null;
  const negative = n < 0n,
    abs = negative ? -n : n;
  const rounded = (abs * 2n + d) / (2n * d);
  return negative ? -rounded : rounded;
}
const month = (value: string) => value.slice(0, 7) + "-01";
const months = (from: string, to: string) => {
  const result: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    result.push(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`);
    if (++m === 13) {
      m = 1;
      y++;
    }
  }
  return result;
};
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
function only(body: Record<string, unknown>, keys: readonly string[]) {
  for (const key of Object.keys(body))
    if (!keys.includes(key))
      throw new Problem(422, "VALIDATION", `Campo no editable: ${key}.`, {
        [key]: "Campo no editable.",
      });
}
function text(value: unknown, field: string, max: number, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required)
      throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
        [field]: "Campo obligatorio.",
      });
    return null;
  }
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim()) ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    throw new Problem(422, "VALIDATION", "Revisa los campos indicados.", {
      [field]: `Texto válido, máximo ${max} caracteres.`,
    });
  return value;
}
function amount(
  value: unknown,
  field: string,
  optional = true,
  signed = false,
) {
  if (value === undefined || value === null || value === "") {
    if (optional) return null;
    throw new Problem(422, "VALIDATION", "Importe obligatorio.", {
      [field]: "Indica un importe.",
    });
  }
  let cents: bigint | null = null;
  try {
    cents = money(value);
  } catch {}
  if (cents === null || (!signed && cents < 0n))
    throw new Problem(422, "VALIDATION", "Importe inválido.", {
      [field]: signed
        ? "EUR exacto, máximo dos decimales."
        : "EUR no negativo, máximo dos decimales.",
    });
  return cents;
}
function key(value: string) {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(value))
    throw new Problem(422, "IDEMPOTENCY_REQUIRED", "Clave de intento inválida.");
}
function retry<T>(
  db: Database,
  table: string,
  attempt: string,
  requestHash: string,
  now: number,
  run: () => T,
): T {
  db.run(`DELETE FROM ${table} WHERE expires<?`, [now]);
  const saved = db
    .query(`SELECT hash,response FROM ${table} WHERE key=?`)
    .get(attempt) as { hash: string; response: string } | null;
  if (saved) {
    if (saved.hash !== requestHash)
      throw new Problem(
        409,
        "IDEMPOTENCY_CONFLICT",
        "El intento corresponde a otros datos.",
      );
    return JSON.parse(saved.response) as T;
  }
  const result = run();
  db.run(`INSERT INTO ${table} VALUES(?,?,?,?)`, [
    attempt,
    requestHash,
    JSON.stringify(result),
    now + 86400000,
  ]);
  return result;
}
function nextId(db: Database, counter: string, prefix: string) {
  const row = db
    .query(
      "UPDATE counters SET next=next+1 WHERE name=? AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
    )
    .get(counter) as { n: string } | null;
  if (!row)
    throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
  return prefix + row.n.padStart(4, "0");
}

/* --------------------------------------------------------------- partidas */

type PartidaRow = {
  id: string;
  nombre: string;
  estado: string;
  padre: string;
  padrePartida: string | null;
  fuente: Fuente | null;
  presupuesto: string | null;
  deuda: string | null;
};
function partidaRows(db: Database) {
  return db
    .query(
      `SELECT id,nombre,estado,padre,padre_partida padrePartida,fuente,presupuesto,deuda
       FROM partidas ORDER BY length(id),id`,
    )
    .all() as PartidaRow[];
}
function partidaDto(db: Database, r: PartidaRow) {
  const p = getClassification(db, "partidas", r.id);
  return {
    ...p,
    padrePartida: r.padrePartida,
    fuente: r.fuente,
    hija: r.padrePartida !== null,
    gastos: (
      db.query("SELECT COUNT(*) n FROM movimientos WHERE partida=?").get(r.id) as {
        n: number;
      }
    ).n,
    planificaciones: (
      db
        .query(
          "SELECT COUNT(*) n FROM dprima_planificaciones WHERE padre=?",
        )
        .get(r.id) as { n: number }
    ).n,
  };
}
export function listDprimaPartidas(db: Database) {
  return db.transaction(() => {
    const rows = partidaRows(db);
    const roots = rows
      .filter((r) => r.padrePartida === null)
      .map((r) => ({
        ...partidaDto(db, r),
        hijas: rows
          .filter((h) => h.padrePartida === r.id)
          .map((h) => partidaDto(db, h)),
      }));
    return {
      raices: roots,
      hijasSinRaiz: rows.filter(
        (r) =>
          r.padrePartida !== null &&
          !rows.some((p) => p.id === r.padrePartida),
      ),
      fuentes,
      nota: "La jerarquía raíz/hija es independiente de Categoría/Subcategoría. Presupuestos se conserva como legado hasta confirmar el mapping.",
    };
  })();
}

export function previewPartidaConfig(
  db: Database,
  id: string,
  body: Record<string, unknown>,
) {
  only(body, ["cambios", "motivo", "contextRevision"]);
  const partida = partidaRows(db).find((r) => r.id === id);
  if (!partida)
    throw new Problem(404, "NOT_FOUND", "Partida no encontrada.");
  const cambios = body.cambios;
  if (!cambios || typeof cambios !== "object" || Array.isArray(cambios))
    throw new Problem(422, "VALIDATION", "Cambios inválidos.");
  const input = cambios as Record<string, unknown>;
  only(input, ["padrePartida", "fuente"]);
  const next = { ...partida };
  const errors: Record<string, string> = {};
  if (Object.hasOwn(input, "padrePartida")) {
    const parent = input.padrePartida;
    if (parent !== null && (typeof parent !== "string" || !parent))
      errors.padrePartida = "Raíz no válida.";
    else if (parent === id) errors.padrePartida = "Una Partida no es su propia raíz.";
    else if (parent !== null) {
      const root = partidaRows(db).find((r) => r.id === parent);
      if (!root || root.padrePartida !== null)
        errors.padrePartida = "La raíz debe ser una Partida sin padre.";
      else if (partidaRows(db).some((r) => r.padrePartida === id))
        errors.padrePartida = "Una raíz con hijas no se convierte en hija.";
    }
    next.padrePartida = parent as string | null;
  }
  if (Object.hasOwn(input, "fuente")) {
    if (input.fuente !== null && !fuentes.includes(input.fuente as Fuente))
      errors.fuente = "Fuente no válida.";
    next.fuente = (input.fuente as Fuente | null) ?? null;
  }
  if (Object.keys(errors).length)
    throw new Problem(422, "VALIDATION", "Revisa los cambios.", errors);
  const used =
    !!db.query("SELECT 1 FROM movimientos WHERE partida=? LIMIT 1").get(id) ||
    !!db.query("SELECT 1 FROM dprima_planificaciones WHERE padre=? LIMIT 1").get(id) ||
    !!db.query("SELECT 1 FROM dprima_lineas WHERE hija=? LIMIT 1").get(id) ||
    !!db.query("SELECT 1 FROM dprima_plan_mensual WHERE raiz=? LIMIT 1").get(id);
  const blocks: string[] = [];
  if (used && next.padrePartida !== partida.padrePartida)
    blocks.push(
      "La Partida ya participa en hechos o planificación; cambiar el padre exigiría una operación de impacto no implementada.",
    );
  if (
    used &&
    next.fuente !== partida.fuente &&
    db.query("SELECT 1 FROM dprima_plan_mensual WHERE raiz=?").get(id)
  )
    blocks.push(
      "La fuente ya está aplicada en un ciclo; cambiarla requiere revisar aperturas y no se hace aquí.",
    );
  const planificaciones = db
    .query(
      "SELECT id,estado,mes_inicial,mes_final FROM dprima_planificaciones WHERE padre=? ORDER BY mes_inicial",
    )
    .all(id);
  return {
    partida: partidaDto(db, partida),
    despues: { padrePartida: next.padrePartida, fuente: next.fuente },
    usada: used,
    bloqueos: blocks,
    planificaciones,
    fingerprint: hash([id, next.padrePartida, next.fuente, partida, used]),
  };
}

export function confirmPartidaConfig(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  attempt: string,
  now = Date.now(),
) {
  only(body, ["cambios", "motivo", "fingerprint"]);
  key(attempt);
  const requestHash = hash([id, body]);
  return db
    .transaction(() =>
      retry(db, "dprima_mapping_attempts", attempt, requestHash, now, () => {
        const preview = previewPartidaConfig(db, id, {
          cambios: body.cambios,
          motivo: body.motivo,
        });
        if (body.fingerprint !== preview.fingerprint)
          throw new Problem(
            409,
            "IMPACT_CHANGED",
            "La Partida ha cambiado; revisa el impacto.",
          );
        if (preview.bloqueos.length)
          throw new Problem(409, "DPRIMA_BLOCKED", preview.bloqueos.join(" "));
        const motivo = text(body.motivo, "motivo", 2000, true)!;
        const input = body.cambios as Record<string, unknown>;
        const before = partidaRows(db).find((r) => r.id === id)!;
        db.run(
          "UPDATE partidas SET padre_partida=?,fuente=?,revision=revision+1,actualizado=? WHERE id=?",
          [
            preview.despues.padrePartida,
            preview.despues.fuente,
            new Date(now).toISOString(),
            id,
          ],
        );
        const after = partidaRows(db).find((r) => r.id === id)!;
        db.run(
          `INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo)
           VALUES(?,?,?,?,?,?,'usuario-unico',?)`,
          [
            "partida-dprima:" + id,
            "configuración",
            before.nombre ? 1 : 1,
            JSON.stringify(Object.keys(input)),
            new Date(now).toISOString(),
            before ? 1 : 0,
            motivo.trim(),
          ],
        );
        return { partida: partidaDto(db, after) };
      }),
    )
    .immediate();
}

/* ---------------------------------------------------------- planificación */

export function listPlanificaciones(db: Database) {
  return db
    .query(
      `SELECT p.id,p.padre,p.saldo,p.mes_inicial mesInicial,p.mes_final mesFinal,
       CAST(p.saldo_inicial AS TEXT) saldoInicial,p.saldo_evidencia saldoEvidencia,
       p.estado,p.revision,
       (SELECT COUNT(*) FROM dprima_lineas l WHERE l.planificacion=p.id AND l.anulada=0) lineas
       FROM dprima_planificaciones p ORDER BY p.mes_inicial,p.id`,
    )
    .all()
    .map((r) => {
      const row = r as Record<string, unknown>;
      return { ...row, saldoInicial: decimal(String(row.saldoInicial)) };
    });
}
type PlanRow = {
  id: string;
  padre: string;
  saldo: string;
  mesInicial: string;
  mesFinal: string;
  saldoInicial: string;
  saldoEvidencia: string;
  estado: string;
  revision: number;
  creado: string;
  actualizado: string;
};
type LineRow = {
  id: string;
  planificacion: string;
  hija: string;
  importe: string | null;
  fecha: string | null;
  esencial: boolean;
  anulada: boolean;
  revision: number;
};
function planificacionRow(db: Database, id: string): PlanRow {
  const row = db
    .query(
      `SELECT id,padre,saldo,mes_inicial mesInicial,mes_final mesFinal,
       CAST(saldo_inicial AS TEXT) saldoInicial,saldo_evidencia saldoEvidencia,
       estado,revision,creado,actualizado FROM dprima_planificaciones WHERE id=?`,
    )
    .get(id) as (Omit<PlanRow, "saldoInicial"> & { saldoInicial: string }) | null;
  if (!row) throw new Problem(404, "NOT_FOUND", "Planificación no encontrada.");
  return { ...row, saldoInicial: decimal(row.saldoInicial)! };
}
function lineas(db: Database, id: string): LineRow[] {
  return (
    db
      .query(
        `SELECT id,planificacion,hija,CAST(importe AS TEXT) importe,fecha,esencial,
         anulada,revision FROM dprima_lineas WHERE planificacion=? ORDER BY length(id),id`,
      )
      .all(id) as (Omit<LineRow, "importe" | "esencial" | "anulada"> & {
      importe: string | null;
      esencial: number;
      anulada: number;
    })[]
  ).map((row) => ({
    ...row,
    importe: decimal(row.importe),
    esencial: row.esencial === 1,
    anulada: row.anulada === 1,
  }));
}
export function getPlanificacion(db: Database, id: string) {
  const plan = planificacionRow(db, id);
  return {
    planificacion: plan,
    lineas: lineas(db, id),
    auditoria: db
      .query("SELECT * FROM dprima_planificacion_audit WHERE planificacion=? ORDER BY id")
      .all(id),
  };
}

export function createPlanificacion(
  db: Database,
  body: Record<string, unknown>,
  attempt: string,
  now = Date.now(),
) {
  only(body, [
    "padre",
    "saldo",
    "mesInicial",
    "mesFinal",
    "saldoInicial",
    "saldoEvidencia",
    "copiarHijas",
  ]);
  key(attempt);
  const requestHash = hash(body);
  return db
    .transaction(() =>
      retry(db, "dprima_planificacion_attempts", attempt, requestHash, now, () => {
        const padre = partidaRows(db).find((r) => r.id === body.padre);
        if (!padre || padre.padrePartida !== null)
          throw new Problem(422, "VALIDATION", "Selecciona una Partida raíz.", {
            padre: "La planificación pertenece a una raíz.",
          });
        const saldo = getSaldo(db, String(body.saldo));
        if (
          saldo.id === "S000" ||
          saldo.estado !== "Activa" ||
          saldo.control !== "Movimientos"
        )
          throw new Problem(422, "VALIDATION", "Saldo exclusivo no válido.", {
            saldo: "Selecciona un Saldo activo con control Movimientos.",
          });
        let mesInicial: string, mesFinal: string;
        try {
          mesInicial = month(civil(String(body.mesInicial)));
          mesFinal = month(civil(String(body.mesFinal)));
        } catch {
          throw new Problem(422, "VALIDATION", "Rango de meses inválido.", {
            mesInicial: "Indica meses financiados válidos.",
          });
        }
        if (
          !/^\d{4}-\d{2}-01$/.test(mesInicial) ||
          !/^\d{4}-\d{2}-01$/.test(mesFinal) ||
          mesInicial > mesFinal
        )
          throw new Problem(422, "VALIDATION", "Rango de meses inválido.");
        const saldoInicial = amount(
          body.saldoInicial,
          "saldoInicial",
          false,
          true,
        )!;
        const saldoEvidencia = text(
          body.saldoEvidencia,
          "saldoEvidencia",
          500,
          true,
        )!;
        const id = nextId(db, "dprima_planificacion", "DP");
        const time = new Date(now).toISOString();
        db.run(
          `INSERT INTO dprima_planificaciones(id,padre,saldo,mes_inicial,mes_final,
           saldo_inicial,saldo_evidencia,estado,revision,creado,actualizado)
           VALUES(?,?,?,?,?,?,?,'Borrador',1,?,?)`,
          [
            id,
            padre.id,
            saldo.id,
            mesInicial,
            mesFinal,
            String(saldoInicial),
            saldoEvidencia,
            time,
            time,
          ],
        );
        if (body.copiarHijas !== false) {
          const daughters = partidaRows(db).filter(
            (r) => r.padrePartida === padre.id && r.estado === "Activa",
          );
          for (const h of daughters) {
            const lineId = nextId(db, "dprima_linea", "LP");
            db.run(
              `INSERT INTO dprima_lineas(id,planificacion,hija,importe,fecha,esencial,anulada,revision,creado,actualizado)
               VALUES(?,?,?,NULL,NULL,0,0,1,?,?)`,
              [lineId, id, h.id, time, time],
            );
          }
        }
        const after = planificacionRow(db, id);
        db.run(
          `INSERT INTO dprima_planificacion_audit(planificacion,accion,revision,anterior,posterior,motivo,instante,actor)
           VALUES(?,?,?,?,?,?,?,'usuario-unico')`,
          [id, "alta", 1, null, JSON.stringify(after), "Alta de Gastos Previstos", time],
        );
        return getPlanificacion(db, id);
      }),
    )
    .immediate();
}

export function previewLineas(
  db: Database,
  id: string,
  body: Record<string, unknown>,
) {
  only(body, ["revision", "cambios", "eliminar", "motivo"]);
  const plan = planificacionRow(db, id);
  if (plan.estado === "Finalizada")
    throw new Problem(409, "PLAN_FINALIZED", "La planificación está finalizada.");
  if (body.revision !== plan.revision)
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      "La planificación ha cambiado. Revisa sus líneas.",
    );
  const current = lineas(db, id);
  const changes = body.cambios ?? [];
  const remove = body.eliminar ?? [];
  if (!Array.isArray(changes) || !Array.isArray(remove))
    throw new Problem(422, "VALIDATION", "Cambios inválidos.");
  if (changes.length + remove.length > 200)
    throw new Problem(422, "VALIDATION", "Envía hasta 200 líneas por revisión.");
  const errors: Record<string, string> = {};
  const next: Record<string, unknown>[] = [];
  const daughters = partidaRows(db).filter(
    (r) => r.padrePartida === plan.padre || r.id === plan.padre,
  );
  for (const raw of changes) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Problem(422, "VALIDATION", "Línea inválida.");
    const input = raw as Record<string, unknown>;
    only(input, ["id", "hija", "importe", "fecha", "esencial"]);
    const old = input.id ? current.find((l) => l.id === input.id) : null;
    if (input.id && !old)
      throw new Problem(404, "NOT_FOUND", "Línea no encontrada.");
    const hija = input.hija ?? old?.hija;
    if (typeof hija !== "string" || !daughters.some((d) => d.id === hija))
      errors.hija = "La línea debe usar una hija de esta raíz.";
    let fecha: string | null = old?.fecha ?? null;
    if (Object.hasOwn(input, "fecha")) {
      if (input.fecha === null || input.fecha === "") fecha = null;
      else {
        try {
          fecha = civil(input.fecha);
        } catch {
          errors.fecha = "Fecha civil válida o Sin fecha.";
        }
      }
    }
    let importe: bigint | null =
      old && old.importe !== null ? cents(old.importe) : null;
    if (Object.hasOwn(input, "importe"))
      importe = amount(input.importe, "importe");
    if (Object.keys(errors).length)
      throw new Problem(422, "VALIDATION", "Revisa las líneas.", errors);
    next.push({
      id: old?.id ?? null,
      hija,
      importe: importe === null ? null : decimal(importe),
      fecha,
      esencial:
        typeof input.esencial === "boolean"
          ? input.esencial
          : (old?.esencial ?? false),
    });
  }
  for (const lineId of remove) {
    if (typeof lineId !== "string" || !current.some((l) => l.id === lineId))
      throw new Problem(404, "NOT_FOUND", "Línea a retirar no encontrada.");
    next.push({ id: lineId, anulada: true });
  }
  return {
    antes: current,
    cambios: next,
    fingerprint: hash([id, plan.revision, next, body.motivo ?? null]),
  };
}

export function confirmLineas(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  attempt: string,
  now = Date.now(),
) {
  only(body, ["revision", "cambios", "eliminar", "motivo", "fingerprint"]);
  key(attempt);
  const requestHash = hash([id, body]);
  return db
    .transaction(() =>
      retry(db, "dprima_linea_attempts", attempt, requestHash, now, () => {
        const preview = previewLineas(db, id, {
          revision: body.revision,
          cambios: body.cambios,
          eliminar: body.eliminar,
          motivo: body.motivo,
        });
        if (body.fingerprint !== preview.fingerprint)
          throw new Problem(
            409,
            "IMPACT_CHANGED",
            "Las líneas han cambiado; revisa de nuevo.",
          );
        const motivo = text(body.motivo, "motivo", 2000, true)!;
        const time = new Date(now).toISOString();
        for (const change of preview.cambios as Record<string, unknown>[]) {
          const changeId = change.id ? String(change.id) : null;
          if (change.anulada) {
            db.run(
              "UPDATE dprima_lineas SET anulada=1,revision=revision+1,actualizado=? WHERE id=?",
              [time, changeId],
            );
            db.run(
              `INSERT INTO dprima_linea_audit(linea,accion,revision,anterior,posterior,motivo,instante,actor)
               VALUES(?,?,?,?,?,?,?,'usuario-unico')`,
              [
                changeId,
                "anulación",
                (
                  db.query("SELECT revision FROM dprima_lineas WHERE id=?").get(
                    changeId,
                  ) as { revision: number }
                ).revision,
                null,
                JSON.stringify(change),
                motivo.trim(),
                time,
              ],
            );
            continue;
          }
          if (changeId) {
            db.run(
              `UPDATE dprima_lineas SET hija=?,importe=?,fecha=?,esencial=?,revision=revision+1,actualizado=? WHERE id=?`,
              [
                String(change.hija),
                change.importe === null ? null : cents(String(change.importe)),
                change.fecha === null ? null : String(change.fecha),
                change.esencial ? 1 : 0,
                time,
                changeId,
              ],
            );
            db.run(
              `INSERT INTO dprima_linea_audit(linea,accion,revision,anterior,posterior,motivo,instante,actor)
               VALUES(?,?,?,?,?,?,?,'usuario-unico')`,
              [
                changeId,
                "rectificación",
                (
                  db.query("SELECT revision FROM dprima_lineas WHERE id=?").get(
                    changeId,
                  ) as { revision: number }
                ).revision,
                null,
                JSON.stringify(change),
                motivo.trim(),
                time,
              ],
            );
          } else {
            const lineId = nextId(db, "dprima_linea", "LP");
            db.run(
              `INSERT INTO dprima_lineas(id,planificacion,hija,importe,fecha,esencial,anulada,revision,creado,actualizado)
               VALUES(?,?,?,?,?,?,0,1,?,?)`,
              [
                lineId,
                id,
                String(change.hija),
                change.importe === null ? null : cents(String(change.importe)),
                change.fecha === null ? null : String(change.fecha),
                change.esencial ? 1 : 0,
                time,
                time,
              ],
            );
            db.run(
              `INSERT INTO dprima_linea_audit(linea,accion,revision,anterior,posterior,motivo,instante,actor)
               VALUES(?,?,1,NULL,?,?,?,'usuario-unico')`,
              [lineId, "alta", JSON.stringify(change), motivo.trim(), time],
            );
          }
        }
        db.run(
          "UPDATE dprima_planificaciones SET revision=revision+1,actualizado=? WHERE id=?",
          [time, id],
        );
        db.run(
          `INSERT INTO dprima_planificacion_audit(planificacion,accion,revision,anterior,posterior,motivo,instante,actor)
           VALUES(?,?,?,?,?,?,?,'usuario-unico')`,
          [
            id,
            "líneas",
            planificacionRow(db, id).revision as number,
            null,
            JSON.stringify(preview.cambios),
            motivo.trim(),
            time,
          ],
        );
        return getPlanificacion(db, id);
      }),
    )
    .immediate();
}

/* --------------------------------------------------------------- apertura */

function planPartidas(db: Database, padre: string) {
  const rows = partidaRows(db);
  return new Set([
    padre,
    ...rows.filter((r) => r.padrePartida === padre).map((r) => r.id),
  ]);
}
function positionAt(db: Database, saldo: string, cut: string) {
  const s = getSaldo(db, saldo);
  const opening = money(s.saldoApertura);
  if (opening === null) return null;
  let total = opening;
  const rows = db
    .query(
      "SELECT origen,destino,CAST(importe AS TEXT) importe FROM movimientos WHERE anulado=0 AND fecha<=? AND (origen=? OR destino=?)",
    )
    .all(cut, saldo, saldo) as {
    origen: string;
    destino: string;
    importe: string;
  }[];
  for (const r of rows)
    total += (r.destino === saldo ? 1n : -1n) * BigInt(r.importe);
  return total;
}
function gastoNeto(db: Database, padre: string, from: string, cut: string) {
  const set = planPartidas(db, padre);
  const purchases = ledgerRows(db).filter(
    (r) =>
      !r.anulado &&
      r.tipo === "Gasto" &&
      r.fecha >= from &&
      r.fecha < cut &&
      r.partida !== null &&
      set.has(r.partida) &&
      getSaldo(db, r.origen).control !== "Terminal",
  );
  const gross = sum(purchases.map((r) => BigInt(r.importe)));
  let net = 0n;
  const pending: string[] = [];
  if (comidaInstalled(db, "movimiento_devolucion")) {
    const links = db
      .query(
        `SELECT d.movimiento,d.elegibilidad,d.estado,d.partida partida,
           m.partida movimientoPartida,d.compra compra,
           m.fecha,CAST(m.importe AS TEXT) importe,
           c.partida compraPartida,c.anulado compraAnulada,c.tipo compraTipo
         FROM movimiento_devolucion d
         JOIN movimientos m ON m.id=d.movimiento
         LEFT JOIN movimientos c ON c.id=d.compra
         WHERE m.anulado=0`,
      )
      .all() as {
      movimiento: string;
      elegibilidad: string;
      estado: string;
      partida: string | null;
      movimientoPartida: string | null;
      compra: string | null;
      fecha: string;
      importe: string;
      compraPartida: string | null;
      compraAnulada: number | null;
      compraTipo: string | null;
    }[];
    for (const l of links) {
      const partida = l.partida ?? l.movimientoPartida ?? l.compraPartida;
      if (!partida || !set.has(partida)) continue;
      if (l.fecha >= from && l.fecha < cut) {
        const validLink =
          !l.compra ||
          (l.estado === "Verificado" &&
            l.compraAnulada === 0 &&
            l.compraTipo === "Gasto");
        if (l.elegibilidad === "Acreditada" && validLink) net += BigInt(l.importe);
        else pending.push(l.movimiento);
      }
    }
  }
  const devoluciones = net;
  return {
    bruto: gross,
    devoluciones,
    neto: pending.length ? null : gross - devoluciones,
    pending,
    ids: purchases.map((r) => r.id),
  };
}

export function aperturaPreview(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  only(body, ["ciclo", "exclusiones"]);
  const plan = planificacionRow(db, id);
  if (plan.estado === "Finalizada")
    throw new Problem(409, "PLAN_FINALIZED", "La planificación está finalizada.");
  const ciclo = getCycle(db, String(body.ciclo)).ciclo;
  const labels = months(plan.mesInicial as string, plan.mesFinal as string);
  if (!labels.includes(ciclo.mesFinanciado))
    throw new Problem(
      422,
      "CYCLE_NOT_LINKED",
      "El ciclo no cae en el rango financiado de la planificación.",
      { ciclo: "Selecciona un ciclo del rango previsto." },
    );
  const exclusions = body.exclusiones ?? [];
  if (!Array.isArray(exclusions) || exclusions.some((x) => typeof x !== "string"))
    throw new Problem(422, "VALIDATION", "Exclusiones inválidas.");
  const all = lineas(db, id).filter((l) => !l.anulada);
  for (const lineId of exclusions)
    if (!all.some((l) => l.id === lineId))
      throw new Problem(404, "NOT_FOUND", "Línea excluida no encontrada.");
  const included = all.filter((l) => !exclusions.includes(l.id as string));
  const missing = included.filter((l) => l.importe === null);
  const subtotal = sum(
    included
      .filter((l) => l.importe !== null)
      .map((l) => cents(String(l.importe))),
  );
  const T = missing.length ? null : subtotal;
  const realCycles = cycleMaster(db).filter((c) =>
    labels.includes(c.mesFinanciado),
  );
  const first = realCycles.sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const from = first?.inicio ?? ciclo.inicio;
  const cut = dayBefore(ciclo.inicio);
  const G = gastoNeto(db, plan.padre as string, from, cut);
  const exclusive =
    db
      .query(
        `SELECT COUNT(*) n FROM dprima_planificaciones p
         WHERE p.id<>? AND p.saldo=? AND p.estado<>'Finalizada'
           AND p.mes_inicial<=? AND ?<=p.mes_final`,
      )
      .get(id, plan.saldo, plan.mesFinal, plan.mesInicial) as { n: number };
  const S =
    exclusive.n === 0 ? positionAt(db, plan.saldo as string, cut) : null;
  const N = months(ciclo.mesFinanciado, plan.mesFinal as string).length;
  const fuente =
    (partidaRows(db).find((r) => r.id === plan.padre)?.fuente as Fuente | null) ??
    "No aplica";
  const exclusionsDetail = exclusions.map((lineId) => {
    const line = all.find((l) => l.id === lineId)!;
    return { linea: lineId, motivo: "Exclusión manual en revisión de apertura" };
  });
  let P: bigint | null = null;
  if (T !== null && G.neto !== null && S !== null) {
    const raw = T - G.neto - S;
    P = raw > 0n ? raw : 0n;
  }
  const sugerida =
    fuente === "Aportación a saldo" && P !== null ? divRound(P, BigInt(N)) : null;
  const motivos: string[] = [];
  if (missing.length)
    motivos.push(
      `T incompleto: faltan importes en ${missing.map((l) => l.id).join(", ")}.`,
    );
  if (G.neto === null)
    motivos.push(
      `G parcial: devoluciones sin origen acreditado ${G.pending.join(", ")}.`,
    );
  if (exclusive.n > 0)
    motivos.push("El Saldo exclusivo está compartido con otra planificación.");
  if (S === null && exclusive.n === 0)
    motivos.push("Saldo exclusivo no calculable al corte.");
  if (fuente !== "Aportación a saldo")
    motivos.push("Sugerencia no aplica por fuente (E2).");
  return {
    planificacion: { ...plan, ciclo },
    corte: cut,
    ventana: { desde: from, hasta: cut },
    lineas: { incluidas: included, pendientes: missing.map((l) => l.id), excluidas: exclusionsDetail },
    T: T === null ? null : decimal(T),
    subtotal: decimal(subtotal),
    G: {
      bruto: decimal(G.bruto),
      devoluciones: decimal(G.devoluciones),
      neto: G.neto === null ? null : decimal(G.neto),
      parcial: G.neto === null,
    },
    S: S === null ? null : decimal(S),
    P: P === null ? null : decimal(P),
    N,
    fuente,
    sugerida: sugerida === null ? null : decimal(sugerida),
    restantes: months(ciclo.mesFinanciado, plan.mesFinal as string),
    motivos,
    fingerprint: hash([
      id,
      ciclo.id,
      exclusions,
      T === null ? null : decimal(T),
      G.neto === null ? null : decimal(G.neto),
      S === null ? null : decimal(S),
      N,
      fuente,
    ]),
  };
}

export function confirmApertura(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  attempt: string,
  now = Date.now(),
) {
  only(body, [
    "ciclo",
    "exclusiones",
    "fingerprint",
    "importe",
    "motivo",
  ]);
  key(attempt);
  const requestHash = hash([id, body]);
  return db
    .transaction(() =>
      retry(db, "dprima_apertura_attempts", attempt, requestHash, now, () => {
        const preview = aperturaPreview(
          db,
          id,
          { ciclo: body.ciclo, exclusiones: body.exclusiones },
          now,
        );
        if (body.fingerprint !== preview.fingerprint)
          throw new Problem(
            409,
            "IMPACT_CHANGED",
            "Las fuentes han cambiado; revisa la apertura.",
          );
        const motivo = text(body.motivo, "motivo", 2000, true)!;
        const importe =
          body.importe === undefined || body.importe === null
            ? preview.sugerida
            : decimal(amount(body.importe, "importe"));
        const plan = planificacionRow(db, id);
        const aperturaId = nextId(db, "dprima_apertura", "AP");
        const time = new Date(now).toISOString();
        const ciclo = preview.planificacion.ciclo.id;
        db.run(
          `INSERT INTO dprima_aperturas(id,planificacion,ciclo,total,gasto_neto,saldo,
           pendiente,restantes,sugerida,importe,fuente,corte,huella,confirmado,creado)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            aperturaId,
            id,
            ciclo,
            preview.T === null ? null : cents(preview.T),
            preview.G.neto === null ? null : cents(preview.G.neto),
            preview.S === null ? null : cents(preview.S),
            preview.P === null ? null : cents(preview.P),
            preview.N,
            preview.sugerida === null ? null : cents(preview.sugerida),
            importe === null ? null : cents(importe),
            preview.fuente,
            preview.corte,
            preview.fingerprint,
            time,
            time,
          ],
        );
        for (const exclusion of preview.lineas.excluidas)
          db.run(
            `INSERT INTO dprima_exclusiones(apertura,linea,motivo,instante,actor)
             VALUES(?,?,?,?, 'usuario-unico')`,
            [aperturaId, exclusion.linea, exclusion.motivo, time],
          );
        if (importe !== null && preview.fuente === "Aportación a saldo") {
          db.run(
            `INSERT INTO dprima_plan_mensual(ciclo,raiz,fuente,destino,base,esencial,
             del_mes,corte_sugerencia,revision,creado,actualizado)
             VALUES(?,?,?,?,NULL,NULL,?,?,1,?,?)
             ON CONFLICT(ciclo,raiz) DO UPDATE SET del_mes=excluded.del_mes,
               corte_sugerencia=excluded.corte_sugerencia,
               revision=dprima_plan_mensual.revision+1,actualizado=excluded.actualizado`,
            [
              ciclo,
              plan.padre,
              preview.fuente,
              plan.saldo,
              cents(importe),
              preview.corte,
              time,
              time,
            ],
          );
        }
        db.run(
          `INSERT INTO dprima_apertura_audit(apertura,accion,anterior,posterior,motivo,instante,actor)
           VALUES(?,'confirmación',NULL,?,?,?,'usuario-unico')`,
          [
            aperturaId,
            JSON.stringify({
              T: preview.T,
              G: preview.G,
              S: preview.S,
              P: preview.P,
              N: preview.N,
              sugerida: preview.sugerida,
              importe,
            }),
            motivo.trim(),
            time,
          ],
        );
        return {
          apertura: {
            id: aperturaId,
            ciclo,
            total: preview.T,
            gastoNeto: preview.G.neto,
            saldo: preview.S,
            pendiente: preview.P,
            restantes: preview.N,
            sugerida: preview.sugerida,
            importe,
            fuente: preview.fuente,
            corte: preview.corte,
          },
          planMensual:
            importe !== null && preview.fuente === "Aportación a saldo"
              ? { ciclo, raiz: plan.padre, delMes: importe }
              : null,
        };
      }),
    )
    .immediate();
}

/* ----------------------------------------------------------------- mensual */

export function getPlanMensualDprima(db: Database, cicloId: string, now = Date.now()) {
  const { ciclo } = getCycle(db, cicloId);
  const end = ciclo.fin ?? ciclo.corte;
  const lines = db
    .query(
      `SELECT m.ciclo,m.raiz,m.fuente,m.destino,CAST(m.base AS TEXT) base,
       CAST(m.esencial AS TEXT) esencial,CAST(m.del_mes AS TEXT) delMes,m.revision,
       p.nombre FROM dprima_plan_mensual m JOIN partidas p ON p.id=m.raiz
       WHERE m.ciclo=? ORDER BY length(m.raiz),m.raiz`,
    )
    .all(cicloId) as {
    ciclo: string;
    raiz: string;
    fuente: Fuente;
    destino: string | null;
    base: string | null;
    esencial: string | null;
    delMes: string | null;
    revision: number;
    nombre: string;
  }[];
  const parts = partidaRows(db);
  const roots =
    lines.length > 0
      ? lines
      : parts
          .filter((p) => p.padrePartida === null)
          .map((p) => ({
            ciclo: cicloId,
            raiz: p.id,
            fuente: (p.fuente ?? "No aplica") as Fuente,
            destino: null,
            base: null,
            esencial: null,
            delMes: null,
            revision: 0,
            nombre: p.nombre,
          }));
  const destinations = new Map<string, number>();
  for (const r of roots)
    if (r.destino)
      destinations.set(r.destino, (destinations.get(r.destino) ?? 0) + 1);
  const rows = ledgerRows(db).filter(
    (r) =>
      end !== null && !r.anulado && r.fecha >= ciclo.inicio && r.fecha <= end,
  );
  const devolutions = comidaInstalled(db, "movimiento_devolucion")
    ? (db.query(
        `SELECT d.movimiento,d.partida,m.partida movimientoPartida,d.compra,
          d.estado,c.partida compraPartida,c.anulado compraAnulada,
          c.tipo compraTipo,m.fecha,CAST(m.importe AS TEXT) importe,d.elegibilidad
         FROM movimiento_devolucion d JOIN movimientos m ON m.id=d.movimiento
         LEFT JOIN movimientos c ON c.id=d.compra WHERE m.anulado=0`,
      ).all() as {
        movimiento: string;
        partida: string | null;
        movimientoPartida: string | null;
        compra: string | null;
        estado: string;
        compraPartida: string | null;
        compraAnulada: number | null;
        compraTipo: string | null;
        fecha: string;
        importe: string;
        elegibilidad: string;
      }[])
    : [];
  return db.transaction(() => ({
    ciclo,
    items: roots.map((line) => {
      const set = planPartidas(db, line.raiz);
      let bruto: bigint | null = null,
        devoluciones: bigint | null = null,
        executed: bigint | null = null,
        reason: string | null = null;
      if (line.fuente === "No aplica") reason = "No comparable";
      else if (end === null) reason = "Periodo/corte no verificable";
      else if (line.fuente === "Gasto real") {
        const purchases = rows.filter(
          (r) =>
            r.tipo === "Gasto" &&
            r.partida !== null &&
            set.has(r.partida) &&
            getSaldo(db, r.origen).control !== "Terminal",
        );
        bruto = sum(purchases.map((r) => BigInt(r.importe)));
        const pending: string[] = [];
        devoluciones = sum(
          devolutions
            .filter((d) => {
              const partida = d.partida ?? d.movimientoPartida ?? d.compraPartida;
              if (!partida || !set.has(partida)) return false;
              if (d.fecha < ciclo.inicio || d.fecha > end!) return false;
              const validLink =
                !d.compra ||
                (d.estado === "Verificado" &&
                  d.compraAnulada === 0 &&
                  d.compraTipo === "Gasto");
              if (d.elegibilidad !== "Acreditada" || !validLink) {
                pending.push(d.movimiento);
                return false;
              }
              return true;
            })
            .map((d) => BigInt(d.importe)),
        );
        executed = pending.length ? null : bruto - devoluciones;
        if (pending.length)
          reason = `Devoluciones sin origen acreditado: ${pending.join(", ")}.`;
      } else {
        if (!line.destino) reason = "Destino no definido";
        else if ((destinations.get(line.destino) ?? 0) > 1)
          reason =
            "Destino compartido por varias raíces: atribución automática bloqueada.";
        else {
          const transfers = rows.filter(
            (r) =>
              r.tipo === "Transferencia" &&
              r.destino === line.destino &&
              r.origen !== "S000" &&
              !r.referencia,
          );
          executed = sum(transfers.map((r) => BigInt(r.importe)));
        }
      }
      const planned = line.delMes === null ? null : BigInt(line.delMes);
      const pending =
        planned === null || executed === null ? null : planned - executed;
      return {
        ...line,
        base: decimal(line.base),
        esencial: decimal(line.esencial),
        delMes: decimal(line.delMes),
        bruto: bruto === null ? null : decimal(bruto),
        devoluciones: devoluciones === null ? null : decimal(devoluciones),
        ejecutado: executed === null ? null : decimal(executed),
        pendiente: pending === null ? null : decimal(pending),
        estado:
          reason
            ? "No disponible"
            : pending === null
              ? "Sin plan"
              : pending > 0n
                ? "Pendiente"
                : pending === 0n
                  ? "Completo"
                  : "Excedido",
        motivo: reason,
      };
    }),
    nota: "Gasto y aportación son magnitudes distintas; el total no las suma como doble consumo.",
  }))();
}

export function writeMensual(
  db: Database,
  cicloId: string,
  body: Record<string, unknown>,
  attempt: string,
  now = Date.now(),
) {
  only(body, [
    "raiz",
    "fuente",
    "destino",
    "base",
    "esencial",
    "delMes",
    "revision",
  ]);
  key(attempt);
  const requestHash = hash([cicloId, body]);
  return db
    .transaction(() =>
      retry(db, "dprima_mensual_attempts", attempt, requestHash, now, () => {
        getCycle(db, cicloId);
        const root = partidaRows(db).find((r) => r.id === body.raiz);
        if (!root || root.padrePartida !== null)
          throw new Problem(422, "VALIDATION", "Selecciona una raíz.");
        if (!fuentes.includes(body.fuente as Fuente))
          throw new Problem(422, "VALIDATION", "Fuente no válida.");
        if (root.fuente && root.fuente !== body.fuente)
          throw new Problem(
            422,
            "SOURCE_CHANGED",
            "La fuente aplicada no puede cambiarse en el plan sin revisión de impacto.",
            { fuente: "La fuente del maestro manda en este ciclo." },
          );
        const destino =
          body.destino === undefined || body.destino === null || body.destino === ""
            ? null
            : String(body.destino);
        if (body.fuente === "Aportación a saldo" && !destino)
          throw new Problem(422, "VALIDATION", "Destino obligatorio.", {
            destino: "Selecciona el Saldo destino.",
          });
        if (destino) {
          const s = getSaldo(db, destino);
          if (s.id === "S000" || s.estado !== "Activa")
            throw new Problem(422, "VALIDATION", "Destino no válido.");
        }
        const base = amount(body.base, "base");
        const esencial = amount(body.esencial, "esencial");
        const delMes = amount(body.delMes, "delMes");
        const existing = db
          .query("SELECT revision FROM dprima_plan_mensual WHERE ciclo=? AND raiz=?")
          .get(cicloId, root.id) as { revision: number } | null;
        if ((existing?.revision ?? 0) !== body.revision)
          throw new Problem(
            409,
            "REVISION_CONFLICT",
            "La línea mensual ha cambiado. Revisa la tabla.",
          );
        const time = new Date(now).toISOString();
        db.run(
          `INSERT INTO dprima_plan_mensual(ciclo,raiz,fuente,destino,base,esencial,del_mes,corte_sugerencia,revision,creado,actualizado)
           VALUES(?,?,?,?,?,?,?,NULL,1,?,?)
           ON CONFLICT(ciclo,raiz) DO UPDATE SET fuente=excluded.fuente,destino=excluded.destino,
             base=excluded.base,esencial=excluded.esencial,del_mes=excluded.del_mes,
             revision=dprima_plan_mensual.revision+1,actualizado=excluded.actualizado`,
          [
            cicloId,
            root.id,
            String(body.fuente),
            destino,
            base === null ? null : base,
            esencial === null ? null : esencial,
            delMes === null ? null : delMes,
            time,
            time,
          ],
        );
        return getPlanMensualDprima(db, cicloId, now);
      }),
    )
    .immediate();
}

/* ----------------------------------------------------------------- mapping */

export function mappingProposal(db: Database) {
  return db.transaction(() => {
    const budgets = db
      .query(
        "SELECT id,nombre,fuente,destino,estado FROM presupuestos ORDER BY length(id),id",
      )
      .all() as {
      id: string;
      nombre: string;
      fuente: string;
      destino: string | null;
      estado: string;
    }[];
    const parts = partidaRows(db);
    const proposals: Record<string, unknown>[] = [];
    for (const budget of budgets) {
      const linked = parts.filter((p) => p.presupuesto === budget.id);
      if (linked.length === 0)
        proposals.push({
          presupuesto: budget.id,
          partida: null,
          relacion: "Presupuesto sin Partida",
          requiereDecision: true,
          motivo:
            "Presupuesto sin Partidas; puede ser financiación sin Partida. No crear hijas ni importes por coincidencia.",
        });
      else if (linked.length === 1)
        proposals.push({
          presupuesto: budget.id,
          partida: linked[0].id,
          relacion: linked[0].padrePartida ? "Hija" : "Raíz",
          requiereDecision: true,
          motivo:
            "Correspondencia 1:1 propuesta; no equivale automáticamente a identidad compartida.",
          deuda: linked[0].deuda,
        });
      else
        proposals.push({
          presupuesto: budget.id,
          partida: null,
          relacion: "Raíz",
          requiereDecision: true,
          motivo: `Presupuesto con ${linked.length} Partidas (${linked
            .map((p) => p.id)
            .join(", ")}): resolver raíz/mapping explícito sin repartir el objetivo.`,
          candidatas: linked.map((p) => p.id),
          deuda: linked.some((p) => p.deuda),
        });
    }
    for (const partida of parts.filter((p) => p.presupuesto === null))
      proposals.push({
        presupuesto: null,
        partida: partida.id,
        relacion: "Partida sin planificación",
        requiereDecision: true,
        motivo:
          "Partida sin Presupuesto: conservar como raíz simple sin planificación o asignarla explícitamente.",
      });
    const annual = db
      .query(
        `SELECT a.ejercicio,a.partida,CAST(a.presupuesto AS TEXT) importe,
           a.periodo,a.esencial,p.presupuesto
         FROM annual_plan_lines a JOIN partidas p ON p.id=a.partida
         ORDER BY a.ejercicio,a.partida`,
      )
      .all();
    return {
      propuestas: proposals,
      anual: annual,
      confirmadas: db
        .query("SELECT * FROM dprima_mapping WHERE estado='Confirmada' ORDER BY id")
        .all(),
      nota: "Ningún Presupuesto se renombra ni se fusiona. El mapping es explícito, reversible como historia y no modifica hechos ni líneas anuales.",
      fingerprint: hash([proposals, annual]),
    };
  })();
}

export function confirmMapping(
  db: Database,
  body: Record<string, unknown>,
  attempt: string,
  now = Date.now(),
) {
  only(body, ["propuestas", "motivo", "fingerprint"]);
  key(attempt);
  const requestHash = hash(body);
  return db
    .transaction(() =>
      retry(db, "dprima_mapping_attempts", attempt, requestHash, now, () => {
        const preview = mappingProposal(db);
        if (body.fingerprint !== preview.fingerprint)
          throw new Problem(
            409,
            "IMPACT_CHANGED",
            "El mapping ha cambiado; revisa la propuesta.",
          );
        if (!Array.isArray(body.propuestas) || !body.propuestas.length)
          throw new Problem(422, "VALIDATION", "Envía propuestas explícitas.");
        const motivo = text(body.motivo, "motivo", 2000, true)!;
        const time = new Date(now).toISOString();
        const ids: number[] = [];
        for (const raw of body.propuestas) {
          if (!raw || typeof raw !== "object" || Array.isArray(raw))
            throw new Problem(422, "VALIDATION", "Propuesta inválida.");
          const p = raw as Record<string, unknown>;
          only(p, ["presupuesto", "partida", "relacion", "evidencia", "motivo"]);
          if (
            ![
              "Raíz",
              "Hija",
              "Presupuesto sin Partida",
              "Partida sin planificación",
            ].includes(String(p.relacion))
          )
            throw new Problem(422, "VALIDATION", "Relación no válida.");
          const presupuesto =
            typeof p.presupuesto === "string" && p.presupuesto
              ? p.presupuesto
              : null;
          const partida =
            typeof p.partida === "string" && p.partida ? p.partida : null;
          if (presupuesto && !db.query("SELECT 1 FROM presupuestos WHERE id=?").get(presupuesto))
            throw new Problem(404, "NOT_FOUND", "Presupuesto no encontrado.");
          if (partida && !db.query("SELECT 1 FROM partidas WHERE id=?").get(partida))
            throw new Problem(404, "NOT_FOUND", "Partida no encontrada.");
          if (
            !["Presupuesto sin Partida", "Partida sin planificación"].includes(
              String(p.relacion),
            ) &&
            !partida
          )
            throw new Problem(422, "VALIDATION", "La relación exige Partida.");
          const reason = text(
            p.motivo ?? motivo,
            "motivo",
            2000,
            true,
          )!;
          db.run(
            `INSERT INTO dprima_mapping(presupuesto,partida,relacion,motivo,evidencia,
             estado,revision,creado,actualizado) VALUES(?,?,?,?,?,'Confirmada',1,?,?)`,
            [
              presupuesto,
              partida,
              String(p.relacion),
              reason.trim(),
              text(p.evidencia, "evidencia", 500),
              time,
              time,
            ],
          );
          const id = (
            db.query("SELECT last_insert_rowid() id").get() as { id: number }
          ).id;
          ids.push(id);
          db.run(
            `INSERT INTO dprima_mapping_audit(mapping,accion,anterior,posterior,motivo,instante,actor)
             VALUES(?,'confirmación',NULL,?,?,?,'usuario-unico')`,
            [id, JSON.stringify(p), motivo.trim(), time],
          );
        }
        return { ids, mapping: mappingProposal(db) };
      }),
    )
    .immediate();
}
