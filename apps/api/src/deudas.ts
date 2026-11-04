import type { Database } from "bun:sqlite";
import { Problem, money, decimal } from "./saldos";
import { civil } from "./ciclos";
import { fingerprint } from "./movement-ledger";
import { assertClosedEconomicMotive } from "./e49-guards";
import { getDeudaCompleta } from "./deuda-completa";
export type Debt = {
  id: string;
  nombre: string;
  inicioControl: string | null;
  capitalApertura: string | null;
  capitalPendiente: string | null;
  estado: string;
  revision: number;
  creado: string;
  actualizado: string;
};
export function debtUsage(db: Database, id: string) {
  return db
    .query(
      "SELECT m.id,m.fecha,m.tipo,m.anulado FROM movimientos m JOIN partidas p ON p.id=m.partida WHERE p.deuda=? ORDER BY m.fecha,length(m.id),m.id",
    )
    .all(id);
}
export function getDebt(db: Database, id: string): Debt {
  const r = db
    .query(
      "SELECT id,nombre,inicio,CAST(apertura AS TEXT) apertura,estado,revision,creado,actualizado FROM deudas WHERE id=?",
    )
    .get(id) as any;
  if (!r) throw new Problem(404, "NOT_FOUND", "Deuda no encontrada.");
  let remaining: bigint | null =
    r.apertura === null || r.inicio === null ? null : BigInt(r.apertura);
  if (remaining !== null)
    for (const m of db
      .query(
        "SELECT CAST(m.capital AS TEXT) capital FROM movimientos m JOIN partidas p ON p.id=m.partida WHERE p.deuda=? AND m.anulado=0 AND m.fecha>=?",
      )
      .all(id, r.inicio) as { capital: string | null }[])
      remaining -= BigInt(m.capital ?? "0");
  return {
    id: r.id,
    nombre: r.nombre,
    inicioControl: r.inicio,
    capitalApertura: decimal(r.apertura),
    capitalPendiente: remaining === null ? null : decimal(remaining.toString()),
    estado: r.estado,
    revision: r.revision,
    creado: r.creado,
    actualizado: r.actualizado,
  };
}
export function listDebts(db: Database, p = new URLSearchParams()) {
  return db.transaction(() => {
    const page = Number(p.get("page") ?? 1),
      state = p.get("estado") ?? "Activa";
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !["", "Activa", "Inactiva"].includes(state)
    )
      throw new Problem(422, "VALIDATION", "Filtro inválido.");
    const q = (p.get("q") ?? "").toLocaleLowerCase("es");
    const all = (
      db.query("SELECT id FROM deudas ORDER BY length(id),id").all() as {
        id: string;
      }[]
    )
      .map((r) => getDebt(db, r.id))
      .filter(
        (r) =>
          (!state || r.estado === state) &&
          `${r.id} ${r.nombre}`.toLocaleLowerCase("es").includes(q),
      );
    return {
      items: all.slice((page - 1) * 100, page * 100),
      total: all.length,
      page,
    };
  })();
}
type DebtConditions = {
  tipoDeuda: string | null;
  tin: string | null;
  tae: string | null;
  cuotaContractual: string | null;
  condiciones: string | null;
};

type ValidatedDebt = {
  nombre: string;
  inicioControl: string | null;
  capitalApertura: string | null;
  estado: string;
  tipoDeuda: string | null;
  tin: bigint | null;
  tae: bigint | null;
  cuotaContractual: bigint | null;
  condiciones: string | null;
  motivo: string | null;
};

const CONDITION_SELECT = `SELECT tipo_deuda AS tipoDeuda,CAST(tin AS TEXT) AS tin,
  CAST(tae AS TEXT) AS tae,CAST(cuota_contractual AS TEXT) AS cuotaContractual,
  condiciones FROM deudas WHERE id=?`;
const RATE = /^(-?)(0|[1-9]\d*)(?:\.(\d{1,6}))?$/;
const MAX_RATE = 9007199254740991n; // 2^53-1 over the scaled integer rate.
const emptyConditions: DebtConditions = {
  tipoDeuda: null,
  tin: null,
  tae: null,
  cuotaContractual: null,
  condiciones: null,
};

function conditionRow(db: Database, id: string): DebtConditions {
  return (db.query(CONDITION_SELECT).get(id) as DebtConditions | null) ??
    emptyConditions;
}

function rateValue(value: unknown, field: "tin" | "tae"): bigint | null {
  if (value === null) return null;
  const match = typeof value === "string" ? RATE.exec(value) : null;
  if (!match)
    throw new Problem(
      422,
      "VALIDATION",
      "Tasa decimal exacta; máximo seis decimales.",
      { [field]: "Indica una tasa decimal exacta, sin exponentes." },
    );
  const [, sign, whole, fraction = ""] = match,
    scaled = BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, "0")),
    n = sign === "-" ? -scaled : scaled;
  if (n > MAX_RATE || n < -MAX_RATE)
    throw new Problem(422, "VALIDATION", "Tasa fuera del rango técnico.", {
      [field]: "La tasa excede la cota técnica admitida.",
    });
  return n;
}

function tipoDeudaValue(value: unknown): string | null {
  if (value === null) return null;
  if (value === "Hipotecaria" || value === "No hipotecaria") return value;
  throw new Problem(422, "VALIDATION", "Tipo de Deuda inválido.", {
    tipoDeuda: "Hipotecaria, No hipotecaria o Sin informar.",
  });
}

function boundedText(
  value: unknown,
  field: string,
  max: number,
): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || [...value].length > max)
    throw new Problem(
      422,
      "VALIDATION",
      `Texto de ${max} caracteres como máximo.`,
      { [field]: `Máximo ${max} caracteres.` },
    );
  return value;
}

function motivoValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !value.trim())
    throw new Problem(422, "VALIDATION", "Motivo obligatorio.", {
      motivo: "Indica el motivo del cambio.",
    });
  return value.trim();
}

function fields(
  body: Record<string, unknown>,
  old?: Debt,
  stored?: DebtConditions,
): ValidatedDebt {
  const allowed = [
    "nombre",
    "inicioControl",
    "capitalApertura",
    "tipoDeuda",
    "tin",
    "tae",
    "cuotaContractual",
    "condiciones",
    ...(old ? ["revision", "estado", "motivo"] : []),
  ];
  for (const k of Object.keys(body))
    if (!allowed.includes(k))
      throw new Problem(422, "VALIDATION", "Campo no editable: " + k);
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key),
    v = { ...(old as unknown as Record<string, unknown>), ...body },
    nombre = v.nombre;
  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    nombre.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(nombre)
  )
    throw new Problem(
      422,
      "VALIDATION",
      "Nombre obligatorio, máximo 120 caracteres.",
      { nombre: "Indica un nombre válido." },
    );
  // New calculable debts require explicit opening. Legacy absence remains absence when not edited.
  let inicioControl: string | null;
  if (!old || has("inicioControl")) inicioControl = civil(v.inicioControl);
  else inicioControl = old.inicioControl;
  let capitalApertura: string | null;
  if (!old || has("capitalApertura")) {
    if (typeof v.capitalApertura !== "string" || money(v.capitalApertura) === null)
      throw new Problem(422, "VALIDATION", "Apertura EUR explícita y exacta.", {
        capitalApertura: "Indica la apertura, sin redondear.",
      });
    capitalApertura = v.capitalApertura;
  } else capitalApertura = old.capitalApertura;
  const estado = has("estado")
    ? v.estado
    : (old?.estado ?? "Activa");
  if (old && !["Activa", "Inactiva"].includes(estado as string))
    throw new Problem(422, "VALIDATION", "Estado inválido.");

  const previous = stored ?? emptyConditions,
    tipoDeuda = has("tipoDeuda")
      ? tipoDeudaValue(v.tipoDeuda)
      : previous.tipoDeuda,
    tin = has("tin")
      ? rateValue(v.tin, "tin")
      : previous.tin === null
        ? null
        : BigInt(previous.tin),
    tae = has("tae")
      ? rateValue(v.tae, "tae")
      : previous.tae === null
        ? null
        : BigInt(previous.tae),
    cuotaContractual = has("cuotaContractual")
      ? v.cuotaContractual === null
        ? null
        : (() => {
          const cents = money(v.cuotaContractual);
          if (cents === null)
            throw new Problem(
              422,
              "VALIDATION",
              "Cuota contractual EUR explícita y exacta.",
              { cuotaContractual: "Indica una cuota, sin redondear." },
            );
          if (cents < 0n)
            throw new Problem(
              422,
              "VALIDATION",
              "La cuota contractual no puede ser negativa.",
              { cuotaContractual: "Indica cero o un importe positivo." },
            );
          return cents;
        })()
      : previous.cuotaContractual === null
        ? null
        : BigInt(previous.cuotaContractual),
    condiciones = has("condiciones")
      ? boundedText(v.condiciones, "condiciones", 1000)
      : previous.condiciones;

  let motivo: string | null = null;
  if (old) {
    motivo = has("motivo") ? motivoValue(v.motivo) : null;
    const correctedTipo =
        has("tipoDeuda") &&
        previous.tipoDeuda !== null &&
        tipoDeuda !== previous.tipoDeuda,
      correctedTin =
        has("tin") &&
        previous.tin !== null &&
        (tin === null || BigInt(previous.tin) !== tin),
      correctedTae =
        has("tae") &&
        previous.tae !== null &&
        (tae === null || BigInt(previous.tae) !== tae),
      correctedCuota =
        has("cuotaContractual") &&
        previous.cuotaContractual !== null &&
        (cuotaContractual === null ||
          BigInt(previous.cuotaContractual) !== cuotaContractual),
      correctedText =
        has("condiciones") &&
        previous.condiciones !== null &&
        previous.condiciones.trim() !== "" &&
        condiciones !== previous.condiciones;
    if (
      (correctedTipo ||
        correctedTin ||
        correctedTae ||
        correctedCuota ||
        correctedText) &&
      motivo === null
    )
      throw new Problem(
        422,
        "VALIDATION",
        "Indica el motivo al corregir un tipo o condición ya informados.",
        { motivo: "El motivo es obligatorio para esta corrección." },
      );
  }
  return {
    nombre,
    inicioControl,
    capitalApertura,
    estado: estado as string,
    tipoDeuda,
    tin,
    tae,
    cuotaContractual,
    condiciones,
    motivo,
  };
}
export function createDebt(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new Problem(
      422,
      "IDEMPOTENCY_REQUIRED",
      "Clave de intento inválida.",
    );
  const hash = fingerprint(
    Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
  );
  return db
    .transaction(() => {
      db.run("DELETE FROM debt_attempts WHERE expires<?", [now]);
      const retry = db
        .query("SELECT hash,response FROM debt_attempts WHERE key=?")
        .get(key) as any;
      if (retry) {
        if (retry.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as ReturnType<typeof getDeudaCompleta>;
      }
      const v = fields(body),
        n = db
          .query(
            "UPDATE counters SET next=next+1 WHERE name='deudas' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
          )
          .get() as { n: string } | null;
      if (!n)
        throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
      const id = "D" + n.n.padStart(3, "0"),
        time = new Date(now).toISOString();
      db.run(
        "INSERT INTO deudas(id,nombre,inicio,apertura,estado,revision,creado,actualizado,tipo_deuda,tin,tae,cuota_contractual,condiciones) VALUES(?,?,?,?,'Activa',1,?,?,?,?,?,?,?)",
        [
          id,
          v.nombre,
          v.inicioControl,
          money(v.capitalApertura),
          time,
          time,
          v.tipoDeuda,
          v.tin,
          v.tae,
          v.cuotaContractual,
          v.condiciones,
        ],
      );
      const r = getDeudaCompleta(db, id, null, now);
      db.run(
        "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,'alta',1,?,?,0,'usuario-unico',NULL)",
        [id, JSON.stringify({ anterior: null, posterior: r }), time],
      );
      db.run("INSERT INTO debt_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(r),
        now + 86400000,
      ]);
      return r;
    })
    .immediate();
}
export function updateDebt(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db
    .transaction(() => {
      const old = getDebt(db, id);
      if (body.revision !== old.revision)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "La Deuda ha cambiado. Revisa su ficha; tu borrador se conserva.",
        );
      const v = fields(body, old, conditionRow(db, id));
      const changed = Object.keys(body).filter(
        (field) => !["revision", "motivo"].includes(field),
      );
      assertClosedEconomicMotive(
        db,
        "deuda",
        changed,
        v.motivo,
        "actualizar la Deuda",
      );
      if (
        (v.inicioControl !== old.inicioControl ||
          money(v.capitalApertura) !== money(old.capitalApertura)) &&
        debtUsage(db, id).length
      )
        throw new Problem(
          409,
          "HISTORY_LOCKED",
          "Apertura e Inicio control protegidos: Deuda utilizada.",
        );
      const before = getDeudaCompleta(db, id, null, now),
        time = new Date(now).toISOString();
      db.run(
        "UPDATE deudas SET nombre=?,inicio=?,apertura=?,estado=?,tipo_deuda=?,tin=?,tae=?,cuota_contractual=?,condiciones=?,revision=revision+1,actualizado=? WHERE id=?",
        [
          v.nombre,
          v.inicioControl,
          money(v.capitalApertura),
          v.estado,
          v.tipoDeuda,
          v.tin,
          v.tae,
          v.cuotaContractual,
          v.condiciones,
          time,
          id,
        ],
      );
      const next = getDeudaCompleta(db, id, null, now);
      db.run(
        "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,'edición',?,?,?,?, 'usuario-unico',?)",
        [
          id,
          next.revision,
          JSON.stringify({ anterior: before, posterior: next }),
          time,
          old.revision,
          v.motivo,
        ],
      );
      return next;
    })
    .immediate();
}

/** Period breakdown of recorded payments, never opening/current outstanding capital. */
export function debtPeriod(
  db: Database,
  rows: import("./movement-ledger").LedgerRow[],
) {
  const links = db.query("SELECT id,deuda FROM partidas").all() as {
    id: string;
    deuda: string | null;
  }[];
  const cuotas: typeof rows = [],
    extraordinarias: typeof rows = [],
    invalidos: string[] = [];
  const fuentes: { movimiento: string; deuda: string; revision: number }[] = [];
  for (const m of rows.filter(
    (r) => !r.anulado && ["Gasto", "Amortización deuda"].includes(r.tipo),
  )) {
    const id = links.find((p) => p.id === m.partida)?.deuda;
    if (!id) {
      if (m.tipo === "Amortización deuda") invalidos.push(m.id);
      continue;
    }
    const exists = db.query("SELECT id FROM deudas WHERE id=?").get(id);
    if (!exists) {
      invalidos.push(m.id);
      continue;
    }
    const debt = getDebt(db, id);
    fuentes.push({ movimiento: m.id, deuda: id, revision: debt.revision });
    (m.tipo === "Gasto" ? cuotas : extraordinarias).push(m);
  }
  const payments = [...cuotas, ...extraordinarias];
  const completo =
    invalidos.length === 0 &&
    payments.every(
      (m) =>
        m.capital !== null &&
        m.intereses !== null &&
        BigInt(m.capital) + BigInt(m.intereses) === BigInt(m.importe),
    );
  return {
    cuotas,
    extraordinarias,
    invalidos,
    fuentes,
    desgloseVerificable: completo,
    capital: completo
      ? payments.reduce((s, m) => s + BigInt(m.capital!), 0n)
      : null,
    intereses: completo
      ? payments.reduce((s, m) => s + BigInt(m.intereses!), 0n)
      : null,
  };
}
