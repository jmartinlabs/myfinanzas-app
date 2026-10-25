import type { Database } from "bun:sqlite";
import { decimal, money, Problem } from "./saldos";
import { civil } from "./ciclos";
import { getReference } from "./reference-rules";
import { createReference } from "./referencias";
import { fingerprint, ledgerRows, type LedgerRow } from "./movement-ledger";

export type Attribution = {
  rol: "Adelanto" | "Devolución";
  origen: string;
  destino: string;
  evidencia: string;
  procedencia: string;
};
type Metadata = Attribution & {
  movimiento: string;
  referencia: string;
  revision_movimiento: number;
  revision: number;
  actualizado: string;
};
type Fact = Pick<
  LedgerRow,
  | "id"
  | "tipo"
  | "origen"
  | "destino"
  | "referencia"
  | "fecha"
  | "revision"
  | "anulado"
  | "importe"
>;
function fail(message: string, code = "ANTICIPO_INVALID"): never {
  throw new Problem(422, code, message, { anticipo: message });
}
function text(value: unknown, label: string) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 1000 ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    fail(label + " obligatorio, máximo 1000 caracteres.");
  return (value as string).trim();
}
function installed(db: Database) {
  return !!db
    .query("SELECT name FROM sqlite_master WHERE name='movimiento_anticipo'")
    .get();
}
export function anticipoMetadata(db: Database, id: string) {
  if (!installed(db)) return null;
  return db
    .query("SELECT * FROM movimiento_anticipo WHERE movimiento=?")
    .get(id) as Metadata | null;
}
function allMetadata(db: Database) {
  return db
    .query("SELECT * FROM movimiento_anticipo ORDER BY movimiento")
    .all() as Metadata[];
}
export function anticipoRevision(db: Database) {
  return fingerprint([
    ledgerRows(db),
    allMetadata(db),
    db.query("SELECT * FROM fichas_anticipos ORDER BY referencia").all(),
    db
      .query("SELECT * FROM fotos_neto_apertura ORDER BY referencia,ciclo")
      .all(),
    db.query("SELECT * FROM ciclos ORDER BY inicio").all(),
    db.query("SELECT * FROM referencias ORDER BY id").all(),
  ]);
}
function matching(m: Fact, a: Metadata | Attribution, ref: string) {
  return (
    !m.anulado &&
    m.tipo === "Transferencia" &&
    m.referencia === ref &&
    (a.rol === "Adelanto"
      ? m.origen === a.origen && m.destino === a.destino
      : m.origen === a.destino && m.destino === a.origen) &&
    (!("revision_movimiento" in a) || a.revision_movimiento === m.revision)
  );
}
function hasAdvance(
  db: Database,
  ref: string,
  a: Attribution,
  exclude?: string,
) {
  return hasAdvanceFacts(ledgerRows(db), allMetadata(db), ref, a, exclude);
}
function hasAdvanceFacts(
  facts: LedgerRow[],
  meta: Metadata[],
  ref: string,
  a: Attribution,
  exclude?: string,
) {
  return facts.some(
    (m) =>
      m.id !== exclude &&
      meta.some(
        (x) =>
          x.movimiento === m.id &&
          x.rol === "Adelanto" &&
          x.origen === a.origen &&
          x.destino === a.destino &&
          matching(m, x, ref),
      ),
  );
}
export function validateAnticipo(
  db: Database,
  next: {
    tipo: string;
    referencia: string | null;
    origen: string;
    destino: string;
  },
  value: unknown,
  exclude?: string,
  historical = false,
): Attribution | null {
  const isCase =
    next.referencia && getReference(db, next.referencia).tipo === "Anticipo";
  if (!isCase || next.tipo !== "Transferencia") {
    if (value !== undefined && value !== null)
      fail("Atribución solo para Transferencia Anticipo.");
    return null;
  }
  if (
    !db
      .query("SELECT referencia FROM fichas_anticipos WHERE referencia=?")
      .get(next.referencia!)
  )
    fail("Ficha de Anticipo no disponible.");
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("Declara el rol Adelanto o Devolución y su orientación.");
  const a = value as Record<string, unknown>;
  if (
    Object.keys(a).some(
      (k) =>
        !["rol", "origen", "destino", "evidencia", "procedencia"].includes(k),
    )
  )
    fail("Metadatos no editables.");
  if (!["Adelanto", "Devolución"].includes(a.rol as string))
    fail("Selecciona el rol explícito.");
  const result = {
    rol: a.rol,
    origen: text(a.origen, "Origen del par"),
    destino: text(a.destino, "Destino del par"),
    evidencia: text(a.evidencia, "Evidencia"),
    procedencia: text(a.procedencia, "Procedencia"),
  } as Attribution;
  if (
    result.origen === result.destino ||
    (!historical && [next.origen, next.destino].includes("S000"))
  )
    fail("No admite Exterior en nuevas Transferencias.");
  if (
    result.rol === "Adelanto"
      ? next.origen !== result.origen || next.destino !== result.destino
      : next.origen !== result.destino || next.destino !== result.origen
  )
    fail("Dirección incompatible con el rol y par declarados.");
  if (
    result.rol === "Devolución" &&
    !hasAdvance(db, next.referencia!, result, exclude)
  )
    fail("Selecciona un par con Adelanto acreditado vigente.");
  return result;
}
export function anticipoImpact(
  db: Database,
  next: {
    referencia: string | null;
    importe: string;
    anticipo: Attribution | null;
  } | null,
) {
  if (!next?.anticipo || !next.referencia) return null;
  const r = getAnticipo(db, next.referencia),
    a = next.anticipo,
    p = r.pares.find((p) => p.origen === a.origen && p.destino === a.destino);
  return {
    referencia: next.referencia,
    rol: a.rol,
    origen: a.origen,
    destino: a.destino,
    pendientePar: p?.neto ?? null,
    aviso:
      a.rol === "Devolución" && p && money(next.importe)! > money(p.neto)!
        ? "⚠ La devolución supera el pendiente del par. Se conserva el importe real; el estado global depende de todos los pares."
        : null,
  };
}
export function protectAnticipoChange(
  db: Database,
  old: Fact | null,
  next: {
    tipo: string;
    referencia: string | null;
    origen: string;
    destino: string;
    fecha: string;
  } | null,
  attribution: Attribution | null,
) {
  if (!installed(db)) return;
  const a = old ? anticipoMetadata(db, old.id) : null;
  if (a?.rol === "Adelanto" && !hasAdvance(db, a.referencia, a, old!.id)) {
    const keeps =
      next?.tipo === "Transferencia" &&
      next.referencia === a.referencia &&
      attribution?.rol === "Adelanto" &&
      attribution.origen === a.origen &&
      attribution.destino === a.destino;
    if (
      !keeps &&
      allMetadata(db).some(
        (x) =>
          x.movimiento !== old!.id &&
          x.referencia === a.referencia &&
          x.rol === "Devolución" &&
          x.origen === a.origen &&
          x.destino === a.destino &&
          ledgerRows(db).some(
            (m) => m.id === x.movimiento && matching(m, x, a.referencia),
          ),
      )
    )
      throw new Problem(
        409,
        "ANTICIPO_DEPENDENCIES",
        "El cambio deja devoluciones sin Adelanto acreditado. Revisa los hechos dependientes.",
      );
  }
  const affected = [old, next].filter(
    (v): v is NonNullable<typeof v> => !!v && !!v.referencia,
  );
  const photos = db
    .query("SELECT referencia,ciclo,inicio FROM fotos_neto_apertura")
    .all() as { referencia: string; ciclo: string; inicio: string }[];
  if (
    affected.some((v) =>
      photos.some((p) => p.referencia === v.referencia && v.fecha <= p.inicio),
    )
  )
    throw new Problem(
      409,
      "ANTICIPO_PHOTO_PROTECTED",
      "El hecho afecta una apertura confirmada. Protección de fotos/cierres: no es posible verificar una corrección excepcional en esta entrega. La fotografía se conserva.",
    );
}
function audit(
  db: Database,
  ref: string,
  action: string,
  before: unknown,
  after: unknown,
  motive: string | null,
  now: number,
) {
  db.run(
    "INSERT INTO anticipo_audit(referencia,accion,anterior,posterior,motivo,instante,actor) VALUES(?,?,?,?,?,?,'usuario-unico')",
    [
      ref,
      action,
      before === null ? null : JSON.stringify(before),
      JSON.stringify(after),
      motive,
      new Date(now).toISOString(),
    ],
  );
}
export function storeAnticipo(
  db: Database,
  id: string,
  a: Attribution | null,
  now: number,
) {
  if (!installed(db)) return;
  const before = anticipoMetadata(db, id),
    m = ledgerRows(db).find((m) => m.id === id)!;
  if (!a || m.anulado) {
    // Original attribution stays traceable in the immutable audit; inactive metadata is never eligible.
    if (before) {
      db.run("DELETE FROM movimiento_anticipo WHERE movimiento=?", [id]);
      audit(
        db,
        before.referencia,
        "retirar atribución",
        before,
        { movimiento: id, revision: m.revision },
        "Cambio bancario revisado",
        now,
      );
    }
    return;
  }
  db.run(
    "INSERT INTO movimiento_anticipo VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(movimiento) DO UPDATE SET referencia=excluded.referencia,rol=excluded.rol,origen=excluded.origen,destino=excluded.destino,revision_movimiento=excluded.revision_movimiento,evidencia=excluded.evidencia,procedencia=excluded.procedencia,revision=excluded.revision,actualizado=excluded.actualizado",
    [
      id,
      m.referencia!,
      a.rol,
      a.origen,
      a.destino,
      m.revision,
      a.evidencia,
      a.procedencia,
      (before?.revision ?? 0) + 1,
      new Date(now).toISOString(),
    ],
  );
  audit(
    db,
    m.referencia!,
    before ? "revisar atribución" : "atribuir",
    before,
    anticipoMetadata(db, id),
    null,
    now,
  );
}
function sums(ops: { importe: string; atribucion: { rol: string } | null }[]) {
  let adelantado = 0n,
    recuperado = 0n;
  for (const o of ops) {
    if (o.atribucion?.rol === "Adelanto") adelantado += money(o.importe)!;
    else recuperado += money(o.importe)!;
  }
  return {
    adelantado: decimal(adelantado.toString())!,
    recuperado: decimal(recuperado.toString())!,
    neto: decimal((adelantado - recuperado).toString())!,
    exceso: decimal(
      (recuperado > adelantado ? recuperado - adelantado : 0n).toString(),
    )!,
    estado: !ops.length
      ? "Sin operaciones"
      : recuperado === 0n
        ? "Sin recuperar"
        : recuperado < adelantado
          ? "Recuperación parcial"
          : recuperado === adelantado
            ? "Recuperado"
            : "Excedido",
  };
}
function readAnticipo(
  db: Database,
  ref: string,
  override?: { id: string; atribucion: Attribution },
) {
  return db.transaction(() => {
    const referencia = getReference(db, ref),
      ficha = db
        .query("SELECT * FROM fichas_anticipos WHERE referencia=?")
        .get(ref) as {
        apertura: string | null;
        evidencia: string | null;
        creado: string;
        actualizado: string;
      } | null;
    if (!ficha || referencia.tipo !== "Anticipo")
      throw new Problem(404, "NOT_FOUND", "Ficha de Anticipo no encontrada.");
    const facts = ledgerRows(db).filter((m) => m.referencia === ref),
      metadata = allMetadata(db).filter((m) => m.movimiento !== override?.id);
    if (override) {
      const m = facts.find((m) => m.id === override.id)!;
      metadata.push({
        ...override.atribucion,
        movimiento: m.id,
        referencia: ref,
        revision_movimiento: m.revision,
        revision: (anticipoMetadata(db, m.id)?.revision ?? 0) + 1,
        actualizado: m.actualizado,
      });
    }
    const operations = facts.map((m) => {
      const a = metadata.find((a) => a.movimiento === m.id) ?? null;
      let reason = m.anulado
        ? "Anulado: no computa"
        : !a
          ? "Sin rol acreditado"
          : !matching(m, a, ref)
            ? "Atribución incompatible u obsoleta"
            : a.rol === "Devolución" &&
                !hasAdvanceFacts(facts, metadata, ref, a)
              ? "Sin Adelanto acreditado del par"
              : null;
      return {
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo,
        importe: decimal(m.importe)!,
        origen: m.origen,
        destino: m.destino,
        revision: m.revision,
        anulado: !!m.anulado,
        atribucion: a,
        elegible: reason === null,
        motivo: reason,
        estado: reason ? (m.anulado ? "Anulado" : "Revisar") : "Elegible",
      };
    });
    const eligible = operations.filter((o) => o.elegible),
      unknown = operations.filter(
        (o) => o.tipo === "Transferencia" && !o.anulado && !o.elegible,
      );
    const subtotal = sums(eligible),
      coverage = unknown.length
        ? eligible.length
          ? "Parcial"
          : "No disponible"
        : "Verificada";
    const pairs = eligible
      .filter((o) => o.atribucion!.rol === "Adelanto")
      .filter(
        (o, i, a) =>
          a.findIndex(
            (x) =>
              x.atribucion!.origen === o.atribucion!.origen &&
              x.atribucion!.destino === o.atribucion!.destino,
          ) === i,
      )
      .map((o) => {
        const a = o.atribucion!,
          s = sums(
            eligible.filter(
              (x) =>
                x.atribucion!.origen === a.origen &&
                x.atribucion!.destino === a.destino,
            ),
          );
        const exterior = [a.origen, a.destino].includes("S000");
        return {
          origen: a.origen,
          destino: a.destino,
          ...s,
          disponible: !exterior && !unknown.length,
          motivo: exterior
            ? "Exterior histórico: el servicio común no admite nuevas Transferencias Exterior"
            : unknown.length
              ? "Conflicto: hay hechos pendientes de acreditación"
              : null,
        };
      });
    const first =
      eligible
        .filter((o) => o.atribucion!.rol === "Adelanto")
        .map((o) => o.fecha)
        .sort()[0] ?? null;
    const photos = db
      .query(
        "SELECT referencia,ciclo,inicio,CAST(importe AS TEXT) importe,evidencia,procedencia,cobertura,confirmado,revision FROM fotos_neto_apertura WHERE referencia=? ORDER BY inicio DESC",
      )
      .all(ref) as {
      ciclo: string;
      inicio: string;
      importe: string;
      evidencia: string;
      procedencia: string;
      cobertura: string;
      confirmado: string;
      revision: number;
    }[];
    const cycles = db
      .query("SELECT id,inicio FROM ciclos ORDER BY inicio DESC")
      .all() as { id: string; inicio: string }[];
    return {
      referencia,
      saldos: db.query("SELECT id,nombre FROM saldos ORDER BY id").all() as {
        id: string;
        nombre: string;
      }[],
      ficha,
      contexto: anticipoRevision(db),
      cobertura: coverage,
      pendientes: unknown.length,
      ...(coverage === "No disponible"
        ? {
            adelantado: null,
            recuperado: null,
            neto: null,
            exceso: null,
            estado: "No disponible",
          }
        : {
            ...subtotal,
            estado: unknown.length ? "Revisar" : subtotal.estado,
          }),
      subtotal,
      primerAdelanto: first,
      ultimaActividad:
        eligible
          .map((o) => o.fecha)
          .sort()
          .at(-1) ?? null,
      fechaApertura: {
        fecha: ficha.apertura ?? first,
        tipo: ficha.apertura ? "Manual" : first ? "Derivada" : "No disponible",
        evidencia: ficha.evidencia,
      },
      operaciones: operations,
      pares: pairs,
      fotos: photos.map((p) => ({ ...p, importe: decimal(p.importe) })),
      ciclos: cycles,
      auditoria: db
        .query(
          "SELECT * FROM anticipo_audit WHERE referencia=? ORDER BY id DESC",
        )
        .all(ref),
    };
  })();
}
export function getAnticipo(db: Database, ref: string) {
  return readAnticipo(db, ref);
}
export function listAnticipos(db: Database, params = new URLSearchParams()) {
  return db.transaction(() => {
    const page = Number(params.get("page") ?? 1);
    if (!Number.isSafeInteger(page) || page < 1) fail("Página inválida.");
    const ids = db
      .query("SELECT referencia FROM fichas_anticipos ORDER BY referencia")
      .all() as { referencia: string }[];
    return {
      items: ids
        .slice((page - 1) * 100, page * 100)
        .map((x) => getAnticipo(db, x.referencia)),
      total: ids.length,
      page,
    };
  })();
}
function attempt<T>(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  action: string,
  now: number,
  run: () => T,
): T {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(key)) fail("Clave de intento inválida.");
  return db
    .transaction(() => {
      const hash = fingerprint([action, body]),
        r = db
          .query("SELECT * FROM anticipo_attempts WHERE key=? AND expires>=?")
          .get(key, now) as { hash: string; response: string } | null;
      if (r) {
        if (r.hash !== hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento corresponde a otros datos.",
          );
        return JSON.parse(r.response);
      }
      const result = run();
      db.run("DELETE FROM anticipo_attempts WHERE key=? OR expires<?", [
        key,
        now,
      ]);
      db.run("INSERT INTO anticipo_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(result),
        now + 86400000,
      ]);
      return result;
    })
    .immediate();
}
export function createAnticipo(
  db: Database,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  return attempt(db, body, key, "alta", now, () => {
    if (
      Object.keys(body).some(
        (k) => !["nombre", "apertura", "evidencia"].includes(k),
      )
    )
      fail("Campo no editable.");
    const opening = body.apertura ? civil(body.apertura) : null,
      evidence = opening
        ? text(body.evidencia, "Evidencia de apertura Manual")
        : null;
    if (
      opening &&
      opening >
        new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(
          now,
        )
    )
      fail("La apertura histórica no admite fecha futura.");
    const r = createReference(
      db,
      { nombre: body.nombre, tipo: "Anticipo" },
      key,
      now,
    );
    db.run(
      "UPDATE fichas_anticipos SET apertura=?,evidencia=? WHERE referencia=?",
      [opening, evidence, r.id],
    );
    audit(
      db,
      r.id,
      "alta ficha",
      null,
      { apertura: opening, evidencia: evidence },
      null,
      now,
    );
    return getAnticipo(db, r.id);
  });
}
function checkContext(db: Database, body: Record<string, unknown>) {
  if (body.contexto !== anticipoRevision(db))
    throw new Problem(
      409,
      "REVISION_CONFLICT",
      "El contexto ha cambiado. Revisa otra vista previa; se conserva tu borrador.",
    );
}
export function previewAccreditation(
  db: Database,
  ref: string,
  id: string,
  body: Record<string, unknown>,
) {
  return db.transaction(() => {
    const current = getAnticipo(db, ref),
      m = ledgerRows(db).find((x) => x.id === id && x.referencia === ref);
    if (!m || m.anulado) fail("Hecho vigente no encontrado.");
    if (body.revision !== m.revision)
      throw new Problem(409, "REVISION_CONFLICT", "El hecho ha cambiado.");
    const a = validateAnticipo(
      db,
      { ...m, referencia: m.referencia ?? null },
      body.atribucion,
      id,
      true,
    );
    if (!a) fail("Solo Transferencias de Anticipo.");
    // Attribution changes are subject to exactly the same dependencies and photo protections.
    protectAnticipoChange(db, m, { ...m, referencia: m.referencia ?? null }, a);
    const after = readAnticipo(db, ref, { id, atribucion: a! });
    return {
      contexto: current.contexto,
      movimiento: id,
      revision: m.revision,
      atribucion: a,
      hecho: {
        fecha: m.fecha,
        importe: decimal(m.importe),
        origen: m.origen,
        destino: m.destino,
      },
      impacto: {
        antes: { neto: current.neto, cobertura: current.cobertura },
        despues: {
          neto: after.neto,
          cobertura: after.cobertura,
        },
        fotos: current.fotos,
        cierres:
          "Protección no verificable: cambios que afectan fotografías bloqueados",
      },
      fingerprint: fingerprint([current.contexto, id, body.revision, a]),
    };
  })();
}
export function confirmAccreditation(
  db: Database,
  ref: string,
  id: string,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
) {
  return attempt(db, body, key, "acreditar:" + ref + ":" + id, now, () => {
    checkContext(db, body);
    const p = previewAccreditation(db, ref, id, body);
    if (body.confirmado !== true || p.fingerprint !== body.fingerprint)
      fail("Revisa impacto y confirma expresamente.");
    storeAnticipo(db, id, p.atribucion, now);
    return getAnticipo(db, ref);
  });
}
export type AnticipoProtectionProvider = (
  db: Database,
  ref: string,
  ciclo: string,
) => {
  verificada: boolean;
  revision: string;
  bloqueos: string[];
  procedencia: string;
};
export function previewOpening(
  db: Database,
  ref: string,
  body: Record<string, unknown>,
  provider?: AnticipoProtectionProvider,
) {
  return db.transaction(() => {
    const current = getAnticipo(db, ref),
      cycle = current.ciclos.find((c) => c.id === body.ciclo);
    if (!cycle) fail("Selecciona un Ciclo existente.");
    const amount =
      typeof body.importe === "string" ? money(body.importe) : null;
    if (amount === null)
      fail("Importe de apertura explícito; ausencia no es cero.");
    const evidence = text(
        body.evidencia,
        "Evidencia del importe e instante de apertura",
      ),
      source = text(body.procedencia, "Procedencia");
    if (body.coberturaVerificada !== true)
      fail(
        "Acredita la cobertura histórica del importe e instante, incluido el orden de hechos del mismo día.",
      );
    const existing = current.fotos.find((p) => p.ciclo === cycle!.id);
    const prior = current.operaciones.filter(
        (o) =>
          o.tipo === "Transferencia" && !o.anulado && o.fecha < cycle!.inicio,
      ),
      sameDay = current.operaciones.some(
        (o) =>
          o.tipo === "Transferencia" && !o.anulado && o.fecha === cycle!.inicio,
      );
    const suggested =
      prior.length > 0 && !sameDay && prior.every((o) => o.elegible)
        ? sums(prior).neto
        : null;
    const protection = provider?.(db, ref, cycle!.id) ?? {
      verificada: false,
      revision: "no-disponible",
      bloqueos: [],
      procedencia: "Cierres: proveedor no instalado",
    };
    if (existing && body.revision !== existing.revision)
      throw new Problem(
        409,
        "REVISION_CONFLICT",
        "La fotografía ha cambiado. Revisa el original vigente.",
      );
    const motive = existing
      ? text(body.motivo, "Motivo de corrección excepcional")
      : null;
    return {
      contexto: current.contexto,
      ciclo: cycle!.id,
      inicio: cycle!.inicio,
      importe: decimal(amount!.toString())!,
      evidencia: evidence,
      procedencia: source,
      cobertura: "Verificada por declaración y evidencia explícitas",
      sugerencia: suggested,
      motivoSugerencia:
        suggested === null
          ? "No disponible: hechos del mismo día sin orden o acreditación insuficiente. La evidencia explícita debe justificar apertura."
          : "Solo hechos anteriores al Inicio; cobertura declarada con evidencia. Requiere confirmación.",
      existente: existing ?? null,
      correccionBloqueada:
        !!existing &&
        (!protection.verificada || protection.bloqueos.length > 0),
      protecciones: protection,
      motivo: motive,
      revision: existing?.revision ?? null,
      proteccion: existing
        ? !protection.verificada
          ? "Corrección bloqueada: protección de cierres/fotos no verificable en esta entrega"
          : protection.bloqueos.length
            ? protection.bloqueos.join(". ")
            : "Protecciones verificadas: corrección excepcional revisable, original trazable"
        : "La confirmación conserva la foto y su Inicio; no modifica Movimientos",
      fingerprint: fingerprint([
        current.contexto,
        cycle,
        amount!.toString(),
        evidence,
        source,
        motive,
        protection,
      ]),
    };
  })();
}
export function confirmOpening(
  db: Database,
  ref: string,
  body: Record<string, unknown>,
  key: string,
  now = Date.now(),
  provider?: AnticipoProtectionProvider,
) {
  return attempt(db, body, key, "apertura:" + ref, now, () => {
    checkContext(db, body);
    const p = previewOpening(db, ref, body, provider);
    if (body.confirmado !== true || body.fingerprint !== p.fingerprint)
      fail("Revisa impacto y confirma expresamente.");
    if (p.correccionBloqueada)
      throw new Problem(409, "HISTORY_LOCKED", p.proteccion);
    if (p.existente)
      db.run(
        "UPDATE fotos_neto_apertura SET importe=?,evidencia=?,procedencia=?,cobertura=?,confirmado=?,revision=revision+1 WHERE referencia=? AND ciclo=?",
        [
          money(p.importe)!,
          p.evidencia,
          p.procedencia,
          p.cobertura,
          new Date(now).toISOString(),
          ref,
          p.ciclo,
        ],
      );
    else
      db.run("INSERT INTO fotos_neto_apertura VALUES(?,?,?,?,?,?,?,?,1)", [
        ref,
        p.ciclo,
        p.inicio,
        money(p.importe)!,
        p.evidencia,
        p.procedencia,
        p.cobertura,
        new Date(now).toISOString(),
      ]);
    audit(
      db,
      ref,
      p.existente ? "corregir apertura" : "confirmar apertura",
      p.existente,
      p,
      p.motivo,
      now,
    );
    return getAnticipo(db, ref);
  });
}
