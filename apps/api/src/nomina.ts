import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { Problem } from "./saldos";
import { ledgerRows, fingerprint, financeRevision } from "./movement-ledger";
import { D, type Decimal } from "./payroll-decimal";
import { spanishToday } from "./movimientos";
export type Pay = {
  id: string;
  revision: number;
  originalRevision: number;
  mes: string;
  tipo: "Ordinaria" | "Bonus";
  guardia: "Sí" | "No" | null;
  devengo: string | null;
  base: string | null;
  irpf: string | null;
  variable: string | null;
  historico: string | null;
  documentado: string | null;
  evidencia: string;
  evidenciaDocumentado: string;
  verificado: boolean;
  documentadoVerificado: boolean;
  nota: string;
  resolucion: null | {
    fuente: "Histórico" | "Documentado";
    evidencia: string;
    contexto: string;
  };
};
type Allocation = {
  paga: string;
  movimiento: string;
  importe: string;
  revision_movimiento: number;
  evidencia: string;
};
function fail(s: string): never {
  throw new Problem(422, "VALIDATION", s);
}
function conflict(): never {
  throw new Problem(
    409,
    "CONFLICT",
    "El contexto cambió. Revisa los cambios; se conserva el borrador.",
  );
}
function obj(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    return fail("Objeto inválido");
  return v as Record<string, unknown>;
}
function text(v: unknown, required = false) {
  if (typeof v !== "string" || v.length > 2000 || (required && !v.trim()))
    return fail("Evidencia o texto inválido");
  return v.trim();
}
function num(v: unknown, monetary = false): string | null {
  if (v === null) return null;
  if (
    typeof v !== "string" ||
    !/^-?\d+(?:\.\d+)?$/.test(v) ||
    v.length > 60 ||
    (monetary && (v.split(".")[1]?.length ?? 0) > 2)
  )
    return fail(
      "Importe decimal inválido; usa strings y céntimos exactos en dinero",
    );
  return D(v).exact();
}
function originalContext(p: Pay) {
  return fingerprint([
    p.originalRevision,
    p.historico,
    p.documentado,
    p.evidencia,
    p.evidenciaDocumentado,
    p.verificado,
    p.documentadoVerificado,
  ]);
}
export function payRows(db: Database): Pay[] {
  return (
    db.query("SELECT id,revision,data FROM payroll ORDER BY id").all() as {
      id: string;
      revision: number;
      data: string;
    }[]
  ).map((r) => ({ ...JSON.parse(r.data), id: r.id, revision: r.revision }));
}
const allocations = (db: Database) =>
  db
    .query("SELECT * FROM payroll_allocations ORDER BY paga,movimiento")
    .all() as Allocation[];
export function payrollContext(db: Database) {
  return fingerprint([payRows(db), allocations(db), financeRevision(db)]);
}
function bank(db: Database) {
  const rows = ledgerRows(db),
    all = allocations(db);
  return rows.map((m) => {
    const links = all.filter((a) => a.movimiento === m.id),
      eligible =
        !m.anulado &&
        m.tipo === "Ingreso" &&
        ["Nómina", "Bonus"].includes(m.subtipo ?? "");
    const total = links.reduce((s, a) => s.add(D(a.importe)), D("0"));
    const valid = eligible && total.cmp(D(m.importe).pct()) <= 0;
    return {
      ...m,
      importe: D(m.importe).pct().money(),
      asignaciones: links.map((a) => ({
        ...a,
        valida: valid && a.revision_movimiento === m.revision,
      })),
      totalRegistrado: total.money(),
      totalAsignado: links
        .filter((a) => valid && a.revision_movimiento === m.revision)
        .reduce((s, a) => s.add(D(a.importe)), D("0"))
        .money(),
      remanente: D(m.importe)
        .pct()
        .sub(
          links
            .filter((a) => valid && a.revision_movimiento === m.revision)
            .reduce((s, a) => s.add(D(a.importe)), D("0")),
        )
        .money(),
      elegible: eligible,
      requiereRevision: links.some(
        (a) => !valid || a.revision_movimiento !== m.revision,
      ),
    };
  });
}
export function payDetail(db: Database, p: Pay) {
  const movements = bank(db);
  const links = movements.flatMap((m) =>
    m.asignaciones
      .filter((a) => a.paga === p.id)
      .map((a) => ({ ...a, fecha: m.fecha, subtipo: m.subtipo })),
  );
  const valid = links.filter((a) => a.valida),
    total = valid.reduce((s, a) => s.add(D(a.importe)), D("0"));
  const h = p.historico === null ? null : D(p.historico),
    d = p.documentado === null ? null : D(p.documentado);
  let referencia: Decimal | null = null,
    origenReferencia: string | null = null,
    motivo = "Sin referencia documental válida";
  const discrepancy = h !== null && d !== null && h.cmp(d) !== 0;
  const pending =
    (h !== null && !p.verificado) || (d !== null && !p.documentadoVerificado);
  if (pending) motivo = "Fuente documental pendiente de verificar";
  else if (discrepancy) {
    if (p.resolucion?.contexto === originalContext(p)) {
      referencia = p.resolucion.fuente === "Histórico" ? h : d;
      origenReferencia = p.resolucion.fuente;
      motivo = "Referencia revisada explícitamente";
    } else motivo = "Discrepancia documental";
  } else if (h !== null || d !== null) {
    referencia = d ?? h;
    origenReferencia = d !== null ? "Documentado" : "Histórico";
    motivo = "Referencia documental acreditada";
  }
  const incomplete = links.some((a) => !a.valida);
  if (incomplete) {
    referencia = null;
    motivo = "Asociaciones pendientes de revisar";
  }
  const neto = h ?? (valid.length ? total : null),
    netoCompleto =
      h !== null
        ? p.verificado
        : referencia !== null && referencia.cmp(total) === 0;
  const retention =
    p.base !== null && p.irpf !== null ? D(p.base).mul(D(p.irpf).pct()) : null;
  const deductions =
    p.devengo !== null && retention !== null && neto !== null
      ? D(p.devengo).sub(retention).sub(neto)
      : null;
  let structural: Decimal | null = null;
  if (p.tipo === "Ordinaria" && neto !== null) {
    if (p.guardia !== "Sí") structural = neto;
    else if (
      p.devengo !== null &&
      p.variable !== null &&
      p.base !== null &&
      p.irpf !== null &&
      deductions !== null
    )
      structural = D(p.devengo)
        .sub(D(p.variable))
        .sub(D(p.base).sub(D(p.variable)).mul(D(p.irpf).pct()))
        .sub(deductions);
  }
  const diff = referencia?.sub(total) ?? null,
    dates = valid.map((a) => a.fecha).sort();
  let full: string | null = null;
  if (diff?.cmp(D("0")) === 0 && valid.length) {
    let acc = D("0");
    for (const a of [...valid].sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        a.movimiento.localeCompare(b.movimiento),
    )) {
      acc = acc.add(D(a.importe));
      if (acc.cmp(referencia!) >= 0) {
        full = a.fecha;
        break;
      }
    }
  }
  return {
    ...p,
    asignaciones: links,
    cobrado: total.money(),
    numeroIngresos: new Set(valid.map((a) => a.movimiento)).size,
    primeraFecha: dates[0] ?? null,
    ultimaFecha: dates.at(-1) ?? null,
    fechaCompleta: full,
    referencia: referencia?.money() ?? null,
    origenReferencia,
    motivo,
    diferencia: diff?.money() ?? null,
    discrepancia: discrepancy,
    neto: neto?.money() ?? null,
    origenNeto: h !== null ? "Histórico" : neto !== null ? "Movimientos" : null,
    netoCompleto,
    retencion: retention?.money() ?? null,
    deducciones: deductions?.money() ?? null,
    estructural: structural?.money() ?? null,
    derivadosParciales: !netoCompleto,
    exactos: { deducciones: deductions?.exact() ?? null },
  };
}
export function getPayroll(db: Database) {
  return db
    .transaction(() => ({
      contexto: payrollContext(db),
      pagas: payRows(db).map((p) => payDetail(db, p)),
      movimientos: bank(db).filter((m) => m.elegible || m.asignaciones.length),
      auditoria: db
        .query("SELECT * FROM payroll_audit ORDER BY id DESC LIMIT 200")
        .all(),
    }))
    .deferred();
}
function parsePay(v: unknown, old?: Pay): Pay {
  const b = obj(v);
  const allowed = [
    "mes",
    "tipo",
    "guardia",
    "devengo",
    "base",
    "irpf",
    "variable",
    "historico",
    "documentado",
    "evidencia",
    "evidenciaDocumentado",
    "verificado",
    "documentadoVerificado",
    "nota",
  ];
  if (Object.keys(b).some((k) => !allowed.includes(k)))
    fail("Campo desconocido o derivado");
  if (
    typeof b.mes !== "string" ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(b.mes) ||
    b.mes.startsWith("0000")
  )
    fail("Mes nómina inválido");
  if (
    !["Ordinaria", "Bonus"].includes(b.tipo as string) ||
    ![null, "Sí", "No"].includes(b.guardia as any)
  )
    fail("Tipo o Guardia inválidos");
  if (
    typeof b.verificado !== "boolean" ||
    typeof b.documentadoVerificado !== "boolean"
  )
    fail("Verificación explícita requerida");
  const p = {
    id: old?.id ?? "PAGA-" + randomUUID(),
    revision: (old?.revision ?? 0) + 1,
    originalRevision: (old?.originalRevision ?? 0) + 1,
    mes: b.mes,
    tipo: b.tipo,
    guardia: b.guardia,
    devengo: num(b.devengo),
    base: num(b.base),
    irpf: num(b.irpf),
    variable: num(b.variable),
    historico: num(b.historico, true),
    documentado: num(b.documentado, true),
    evidencia: text(b.evidencia, true),
    evidenciaDocumentado: text(b.evidenciaDocumentado, b.documentado !== null),
    verificado: b.verificado,
    documentadoVerificado: b.documentadoVerificado,
    nota: text(b.nota),
    resolucion: old?.resolucion ?? null,
  } as Pay;
  if (
    p.irpf !== null &&
    (D(p.irpf).cmp(D("0")) < 0 || D(p.irpf).cmp(D("100")) > 0)
  )
    fail("IRPF fuera de 0–100%");
  return p;
}
export function previewPayroll(db: Database, input: unknown) {
  const b = obj(input),
    contexto = payrollContext(db);
  let despues: unknown;
  const rollback = {};
  try {
    db.transaction(() => {
      despues = confirmPayroll(
        db,
        { ...b, contexto },
        "preview-" + randomUUID(),
        Date.now(),
      );
      throw rollback;
    }).immediate();
  } catch (e) {
    if (e !== rollback) throw e;
  }
  return {
    contexto,
    antes: getPayroll(db),
    despues,
    accion: b.accion,
    advertencia:
      "Revisar originales, fuentes y todas las asignaciones. No se modifican Movimientos ni Ciclos.",
  };
}
export function confirmPayroll(
  db: Database,
  input: unknown,
  key: string,
  now: number,
) {
  const b = obj(input);
  if (!/^[\w-]{8,100}$/.test(key)) fail("Clave idempotencia inválida");
  const hash = fingerprint(b);
  return db
    .transaction(() => {
      const attempt = db
        .query("SELECT * FROM payroll_attempts WHERE key=? AND expires>?")
        .get(key, now) as { hash: string; response: string } | null;
      if (attempt) {
        if (attempt.hash !== hash) conflict();
        return JSON.parse(attempt.response);
      }
      if (b.contexto !== payrollContext(db)) conflict();
      const motivo = text(b.motivo, true),
        before = payRows(db),
        beforeAllocations = allocations(db);
      let id: string | null = null;
      if (b.accion === "guardar") {
        const old = b.id ? payRows(db).find((p) => p.id === b.id) : undefined;
        if (b.id && !old) fail("Paga inexistente");
        const p = parsePay(b.paga, old);
        id = p.id;
        if (old)
          db.query("UPDATE payroll SET revision=?,data=? WHERE id=?").run(
            p.revision,
            JSON.stringify(p),
            id,
          );
        else
          db.query("INSERT INTO payroll VALUES(?,?,?)").run(
            id,
            p.revision,
            JSON.stringify(p),
          );
      } else if (b.accion === "resolver") {
        const p = payRows(db).find((p) => p.id === b.id);
        if (!p) fail("Paga inexistente");
        if (
          !["Histórico", "Documentado"].includes(b.fuente as string) ||
          !p.verificado ||
          !p.documentadoVerificado ||
          p.historico === null ||
          p.documentado === null
        )
          fail("Revisa ambas fuentes documentales");
        p.resolucion = {
          fuente: b.fuente as "Histórico" | "Documentado",
          evidencia: text(b.evidencia, true),
          contexto: originalContext(p),
        };
        p.revision++;
        id = p.id;
        db.query("UPDATE payroll SET revision=?,data=? WHERE id=?").run(
          p.revision,
          JSON.stringify(p),
          id,
        );
      } else if (b.accion === "repartir") {
        const m = ledgerRows(db).find((m) => m.id === b.movimiento);
        if (
          !m ||
          m.anulado ||
          m.tipo !== "Ingreso" ||
          !["Nómina", "Bonus"].includes(m.subtipo ?? "")
        )
          fail("Movimiento no elegible");
        if (!Array.isArray(b.asignaciones)) fail("Reparto inválido");
        const seen = new Set<string>();
        let sum = D("0");
        const parts = b.asignaciones.map((v) => {
          const a = obj(v),
            p = payRows(db).find((p) => p.id === a.paga);
          if (!p || seen.has(p.id)) fail("Paga inexistente o pareja repetida");
          seen.add(p.id);
          const importe = num(a.importe, true);
          if (importe === null || D(importe).cmp(D("0")) <= 0)
            fail("Asignación debe ser positiva");
          sum = sum.add(D(importe));
          return { paga: p.id, importe, evidencia: text(a.evidencia, true) };
        });
        if (sum.cmp(D(m.importe).pct()) > 0)
          fail("Suma global excede el importe bancario");
        db.query("DELETE FROM payroll_allocations WHERE movimiento=?").run(
          m.id,
        );
        for (const a of parts)
          db.query("INSERT INTO payroll_allocations VALUES(?,?,?,?,?)").run(
            a.paga,
            m.id,
            a.importe,
            m.revision,
            a.evidencia,
          );
      } else fail("Acción inválida");
      const after = payRows(db),
        afterAllocations = allocations(db);
      const changes = after.flatMap((p) => {
        const old = before.find((q) => q.id === p.id);
        const fields = Object.keys(p).filter(
          (k) =>
            fingerprint((old as any)?.[k] ?? null) !==
            fingerprint((p as any)[k] ?? null),
        );
        return fields.length
          ? [
              {
                id: p.id,
                revision: p.revision,
                campos: Object.fromEntries(
                  fields.map((k) => [
                    k,
                    {
                      antes: (old as any)?.[k] ?? null,
                      despues: (p as any)[k],
                    },
                  ]),
                ),
              },
            ]
          : [];
      });
      const allocationChanges = [
        ...new Set(
          [...beforeAllocations, ...afterAllocations].map(
            (a) => a.paga + "|" + a.movimiento,
          ),
        ),
      ].flatMap((key) => {
        const old =
            beforeAllocations.find(
              (a) => a.paga + "|" + a.movimiento === key,
            ) ?? null,
          next =
            afterAllocations.find((a) => a.paga + "|" + a.movimiento === key) ??
            null;
        return fingerprint(old) === fingerprint(next)
          ? []
          : [{ antes: old, despues: next }];
      });
      db.query(
        "INSERT INTO payroll_audit(paga,actor,instante,motivo,delta) VALUES(?,'usuario-unico',?,?,?)",
      ).run(
        id,
        new Date(now).toISOString(),
        motivo,
        JSON.stringify({
          accion: b.accion,
          campos: changes,
          asignaciones: allocationChanges,
        }),
      );
      const response = getPayroll(db);
      db.query(
        "INSERT INTO payroll_attempts VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET hash=excluded.hash,response=excluded.response,expires=excluded.expires",
      ).run(key, hash, JSON.stringify(response), now + 86400000);
      return response;
    })
    .immediate();
}
export function payrollForecast(db: Database, input: unknown, now: number) {
  const b = obj(input),
    cutoff =
      typeof b.corte === "string" ? b.corte : spanishToday(now).slice(0, 7);
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(cutoff) ||
    cutoff > spanishToday(now).slice(0, 7)
  )
    fail("Corte inválido o futuro");
  const variable = num(b.variable),
    adjustment = num(b.ajuste);
  if (variable === null || adjustment === null || D(variable).cmp(D("0")) < 0)
    fail("Variable prevista no negativa y ajuste explícito requeridos");
  const candidates = payRows(db)
    .filter(
      (p) =>
        p.tipo === "Ordinaria" &&
        p.mes <= cutoff &&
        p.verificado &&
        p.guardia !== null &&
        [p.devengo, p.base, p.irpf, p.variable].every((v) => v !== null),
    )
    .map((p) => payDetail(db, p))
    .filter(
      (p) =>
        p.netoCompleto && p.exactos.deducciones !== null && !p.discrepancia,
    );
  const recent = candidates
    .map((p) => p.mes)
    .sort()
    .at(-1);
  const eligible = candidates.filter((p) => p.mes === recent);
  if (b.contexto !== undefined && b.contexto !== payrollContext(db)) conflict();
  const p = b.id
    ? eligible.find((p) => p.id === b.id)
    : eligible.length === 1
      ? eligible[0]
      : undefined;
  if (!p)
    return {
      disponible: false,
      motivo: eligible.length
        ? "Selecciona ID y evidencia entre las pagas del mes más reciente"
        : "Sin referencia salarial completa y verificable",
      candidatas: eligible,
    };
  if (eligible.length > 1) text(b.evidencia, true);
  if (b.revision !== undefined && b.revision !== p.revision) conflict();
  const rate = D(p.irpf!);
  const calculate = (r: Decimal) => {
    if (r.cmp(D("0")) < 0 || r.cmp(D("100")) > 0)
      return {
        disponible: false,
        motivo: "Tasa fuera de 0–100%",
        neto: null,
        exacto: null,
        tasa: r.exact(),
      };
    const retention = D(p.base!).add(D(variable)).mul(r.pct()),
      net = D(p.devengo!)
        .add(D(variable))
        .sub(D(p.exactos.deducciones!))
        .sub(retention);
    return {
      disponible: true,
      motivo: "Simulación informativa",
      neto: net.money(),
      exacto: net.exact(),
      retencion: retention.money(),
      tasa: r.exact(),
    };
  };
  const base = calculate(rate.add(D(adjustment))),
    prudente = calculate(rate.add(D("0.27")));
  return {
    disponible: true,
    corte: cutoff,
    referencia: p,
    candidatas: eligible,
    variable,
    ajuste: adjustment,
    base,
    prudente,
    diferencia:
      base.exacto !== null && prudente.exacto !== null
        ? D(prudente.exacto).sub(D(base.exacto)).money()
        : null,
  };
}
