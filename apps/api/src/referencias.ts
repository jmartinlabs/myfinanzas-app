import type { Database } from "bun:sqlite";
import { Problem } from "./saldos";
import { fingerprint } from "./movement-ledger";
import {
  getReference,
  operationalReferenceTypes,
  type Reference,
} from "./reference-rules";
import {
  assertDuplicateConfirmations,
  assertNoOrphanConfirmations,
  duplicateSet,
  duplicateWarning,
  hasConfirmationAttempt,
  fullVehicle,
  normalizeVehicleKey,
  parseVehicleChanges,
  vehicleFicha,
} from "./vehicle-rules";
export { getReference } from "./reference-rules";
export function referenceUsage(db: Database, id: string) {
  getReference(db, id);
  return db
    .query(
      "SELECT id,fecha,tipo,anulado FROM movimientos WHERE referencia=? ORDER BY fecha DESC,length(id) DESC,id DESC",
    )
    .all(id) as { id: string; fecha: string; tipo: string; anulado: number }[];
}
export function listReferences(db: Database, params = new URLSearchParams()) {
  return db.transaction(() => {
    const page = Number(params.get("page") ?? 1),
      estado = params.get("estado") ?? "Activa",
      tipo = params.get("tipo") ?? "";
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !["", "Activa", "Inactiva"].includes(estado) ||
      !["", ...operationalReferenceTypes].includes(tipo)
    )
      throw new Problem(422, "VALIDATION", "Filtro o página inválidos.");
    const q = (params.get("q") ?? "").toLocaleLowerCase("es");
    const all = (
      db.query("SELECT id FROM referencias ORDER BY length(id),id").all() as {
        id: string;
      }[]
    )
      .map((r) => getReference(db, r.id))
      .filter(
        (r) =>
          (!estado || r.estado === estado) &&
          (!tipo || r.tipo === tipo) &&
          `${r.id} ${r.nombre}`.toLocaleLowerCase("es").includes(q),
      );
    return {
      items: all.slice((page - 1) * 100, page * 100),
      total: all.length,
      page,
    };
  })();
}
const confirmationKeys = [
  "confirmarDuplicadoNombre",
  "candidateNameHash",
  "confirmarDuplicadoMatricula",
  "candidateMatriculaHash",
  "confirmarConversion",
] as const;
function fields(body: Record<string, unknown>, creating: boolean) {
  const allowed = creating
    ? ["nombre", "tipo", "vehiculo", ...confirmationKeys]
    : [
        "nombre",
        "tipo",
        "estado",
        "revision",
        "vehiculo",
        "fichaRevision",
        ...confirmationKeys,
      ];
  for (const key of Object.keys(body))
    if (!allowed.includes(key))
      throw new Problem(422, "VALIDATION", "Campo no editable: " + key);
  if (
    (creating || "nombre" in body) &&
    (typeof body.nombre !== "string" ||
      !body.nombre.trim() ||
      body.nombre.length > 120 ||
      /[\u0000-\u001f\u007f]/.test(body.nombre))
  )
    throw new Problem(
      422,
      "VALIDATION",
      "Nombre obligatorio, máximo 120 caracteres.",
      { nombre: "Indica un nombre válido." },
    );
  if (
    (creating || "tipo" in body) &&
    (typeof body.tipo !== "string" ||
      !operationalReferenceTypes.includes(
        body.tipo as "Viaje" | "Evento" | "Anticipo" | "Vehículo",
      ))
  )
    throw new Problem(
      422,
      "REFERENCE_UNAVAILABLE",
      "Viaje, Evento, Anticipo y Vehículo están disponibles; otros Tipos esperan su entrega.",
      { tipo: "Selecciona Viaje, Evento, Anticipo o Vehículo." },
    );
  if ("estado" in body && !["Activa", "Inactiva"].includes(body.estado as string))
    throw new Problem(422, "VALIDATION", "Estado inválido.");
  if (
    "fichaRevision" in body &&
    (!Number.isSafeInteger(body.fichaRevision) ||
      (body.fichaRevision as number) < 1)
  )
    throw new Problem(422, "VALIDATION", "Revisión de ficha inválida.");
}
function confirmed(body: Record<string, unknown>) {
  return confirmationKeys
    .filter((key) => key !== "confirmarConversion")
    .some((key) => key in body);
}
function vehicleInput(body: Record<string, unknown>) {
  if (!("vehiculo" in body)) return null;
  if (body.vehiculo === null)
    throw new Problem(
      422,
      "VALIDATION",
      "vehiculo:null no es válido; omite el bloque o usa un objeto.",
    );
  return parseVehicleChanges(body.vehiculo);
}
function duplicateClock(
  db: Database,
  body: Record<string, unknown>,
  set: NonNullable<ReturnType<typeof duplicateSet>>,
) {
  if (!confirmed(body)) throw duplicateWarning(set);
  return assertDuplicateConfirmations(body, set);
}
function vehicleAudit(
  db: Database,
  reference: string,
  action: string,
  revision: number,
  previous: unknown,
  next: unknown,
  time: string,
  reason: string,
) {
  db.run(
    "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES('ficha_vehiculo',?,?,?,?,?, 'usuario-unico',?)",
    [
      action,
      revision,
      JSON.stringify({ referencia: reference, anterior: previous, posterior: next }),
      time,
      revision - 1,
      reason,
    ],
  );
}
function duplicateAudit(
  db: Database,
  reference: string,
  revision: number,
  details: ReturnType<typeof assertDuplicateConfirmations>,
  time: string,
) {
  db.run(
    "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES('ficha_vehiculo','duplicado_confirmado',?,?,?,?, 'usuario-unico',?)",
    [
      revision,
      JSON.stringify(details),
      time,
      revision - 1,
      "Duplicado confirmado por dimensión; sin unicidad global",
    ],
  );
}
export function createReference(
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
      db.run("DELETE FROM reference_attempts WHERE expires<?", [now]);
      const retry = db
        .query("SELECT hash,response FROM reference_attempts WHERE key=?")
        .get(key) as { hash: string; response: string } | null;
      if (retry) {
        if (hash !== retry.hash)
          throw new Problem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "El intento corresponde a otros datos.",
          );
        return JSON.parse(retry.response) as ReturnType<typeof getReference>;
      }
      fields(body, true);
      const tipo = body.tipo as Reference["tipo"],
        changes = vehicleInput(body);
      if (tipo !== "Vehículo" && changes)
        throw new Problem(
          422,
          "REFERENCE_TYPE",
          "El bloque vehiculo solo se admite con Tipo Vehículo.",
        );
      const vehicle = tipo === "Vehículo" ? fullVehicle(changes ?? {}) : null;
      const duplicates =
        tipo === "Vehículo"
          ? duplicateSet(db, {
              reference: null,
              revision: 0,
              fichaRevision: 0,
              excluding: null,
              nombre: { value: body.nombre as string, operation: "alta" },
              matricula: vehicle?.matricula
                ? { value: vehicle.matricula, operation: "alta" }
                : null,
            })
          : null;
      if (duplicates) assertNoOrphanConfirmations(body, duplicates);
      else if (hasConfirmationAttempt(body))
        throw new Problem(
          409,
          "DUPLICATE_CONTEXT_CHANGED",
          "El contexto de duplicados ha cambiado; vuelve a revisar antes de guardar.",
        );
      const confirmation = duplicates
        ? duplicateClock(db, body, duplicates)
        : null;
      const n = db
        .query(
          "UPDATE counters SET next=next+1 WHERE name='referencias' AND next<9223372036854775807 RETURNING CAST(next-1 AS TEXT) n",
        )
        .get() as { n: string } | null;
      if (!n)
        throw new Problem(503, "ID_SPACE", "No se pudo reservar identidad.");
      const id = "REF" + n.n.padStart(3, "0"),
        time = new Date(now).toISOString();
      db.run("INSERT INTO referencias VALUES(?,?,?,'Activa',1,?,?)", [
        id,
        body.nombre as string,
        tipo,
        time,
        time,
      ]);
      if (vehicle)
        db.run(
          "INSERT INTO fichas_vehiculo VALUES(?,?,?,?,1,?,?)",
          [id, vehicle.matricula, vehicle.proximaITV, vehicle.cita, time, time],
        );
      if (tipo === "Anticipo")
        db.run("INSERT INTO fichas_anticipos VALUES(?,NULL,NULL,?,?)", [
          id,
          time,
          time,
        ]);
      db.run(
        "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,'alta',1,?,?,0,'usuario-unico',NULL)",
        [id, JSON.stringify(["nombre", "tipo", "estado"]), time],
      );
      if (vehicle) {
        vehicleAudit(
          db,
          id,
          "alta",
          1,
          null,
          { referencia: id, ...vehicle, revision: 1, creado: time, actualizado: time },
          time,
          "Alta atómica de Referencia y ficha 1:1",
        );
        if (confirmation)
          duplicateAudit(db, id, 1, confirmation, time);
      }
      const r = getReference(db, id);
      db.run("INSERT INTO reference_attempts VALUES(?,?,?,?)", [
        key,
        hash,
        JSON.stringify(r),
        now + 86400000,
      ]);
      return r;
    })
    .immediate();
}
export function updateReference(
  db: Database,
  id: string,
  body: Record<string, unknown>,
  now = Date.now(),
) {
  return db
    .transaction(() => {
      fields(body, false);
      const old = getReference(db, id),
        oldFicha = vehicleFicha(db, id),
        changes = vehicleInput(body),
        nextTipo = (body.tipo ?? old.tipo) as Reference["tipo"],
        nextName = (body.nombre ?? old.nombre) as string,
        conversion = old.tipo !== "Vehículo" && nextTipo === "Vehículo",
        editingVehicle = old.tipo === "Vehículo" && nextTipo === "Vehículo";
      if (body.revision !== old.revision)
        throw new Problem(
          409,
          "REVISION_CONFLICT",
          "La Referencia ha cambiado. Actualiza su ficha; tu borrador se conserva.",
        );
      if ("vehiculo" in body && nextTipo !== "Vehículo")
        throw new Problem(
          422,
          "REFERENCE_TYPE",
          "El bloque vehiculo solo se admite con Tipo Vehículo.",
        );
      if (old.tipo === "Vehículo" && nextTipo !== "Vehículo")
        throw new Problem(
          409,
          "HISTORY_LOCKED",
          "Una Referencia Vehículo con ficha no cambia de Tipo; no se borra ni recrea.",
        );
      if (old.tipo === "Vehículo" && !oldFicha)
        throw new Problem(
          409,
          "INTEGRITY_REVIEW",
          "La ficha de vehículo no existe; no se repara automáticamente. Revisa la integridad.",
        );
      if (conversion) {
        if (oldFicha)
          throw new Problem(
            409,
            "HISTORY_LOCKED",
            "La Referencia ya tiene una ficha; no se convierte ni se recrea.",
          );
        if (referenceUsage(db, id).length)
          throw new Problem(
            409,
            "HISTORY_LOCKED",
            "Tipo protegido: la Referencia ya está utilizada, incluso en hechos anulados.",
          );
        if (body.confirmarConversion !== true)
          throw new Problem(
            422,
            "CONVERSION_CONFIRMATION_REQUIRED",
            "La conversión a Vehículo exige confirmación explícita.",
            { tipo: "Confirma la conversión antes de guardar." },
          );
      } else if (
        body.tipo !== undefined &&
        body.tipo !== old.tipo &&
        (old.tipo === "Anticipo" ||
          nextTipo === "Anticipo" ||
          referenceUsage(db, id).length)
      )
        throw new Problem(
          409,
          "HISTORY_LOCKED",
          "Tipo protegido: la Referencia ya está utilizada, incluso en hechos anulados.",
        );
      let nextVehicle = oldFicha,
        fichaChanged = false;
      if (conversion)
        nextVehicle = {
          referencia: id,
          ...fullVehicle(changes ?? {}),
          revision: 0,
          creado: "",
          actualizado: "",
        };
      else if (editingVehicle && changes) {
        if (oldFicha!.revision !== body.fichaRevision)
          throw new Problem(
            409,
            "FICHA_REVISION_CONFLICT",
            "La ficha ha cambiado. Actualiza el contexto; tu borrador se conserva.",
          );
        const next = {
          matricula:
            changes.matricula === undefined
              ? oldFicha!.matricula
              : changes.matricula,
          proximaITV:
            changes.proximaITV === undefined
              ? oldFicha!.proximaITV
              : changes.proximaITV,
          cita: changes.cita === undefined ? oldFicha!.cita : changes.cita,
        };
        fichaChanged =
          next.matricula !== oldFicha!.matricula ||
          next.proximaITV !== oldFicha!.proximaITV ||
          next.cita !== oldFicha!.cita;
        if (fichaChanged) nextVehicle = { ...oldFicha!, ...next };
      }
      let confirmation: ReturnType<typeof assertDuplicateConfirmations> | null =
        null;
      if (nextTipo === "Vehículo") {
        const nameChanged =
          conversion ||
          ("nombre" in body &&
            normalizeVehicleKey(nextName) !==
              normalizeVehicleKey(old.nombre));
        const registrationChanged =
          conversion ||
          (editingVehicle &&
            changes !== null &&
            "matricula" in changes &&
            normalizeVehicleKey(nextVehicle?.matricula ?? "") !==
              normalizeVehicleKey(oldFicha?.matricula ?? ""));
        const duplicates = duplicateSet(db, {
          reference: id,
          revision: old.revision,
          fichaRevision: oldFicha?.revision ?? 0,
          excluding: id,
          nombre: nameChanged
            ? {
                value: nextName,
                operation: conversion ? "conversión" : "renombrado",
              }
            : null,
          matricula:
            registrationChanged && nextVehicle?.matricula
              ? {
                  value: nextVehicle.matricula,
                  operation: conversion ? "conversión" : "matrícula",
                }
              : null,
        });
        if (duplicates) {
          assertNoOrphanConfirmations(body, duplicates);
          confirmation = duplicateClock(db, body, duplicates);
        } else if (hasConfirmationAttempt(body))
          throw new Problem(
            409,
            "DUPLICATE_CONTEXT_CHANGED",
            "El contexto de duplicados ha cambiado; vuelve a revisar antes de guardar.",
          );
      }
      const next = {
          ...old,
          nombre: nextName,
          tipo: nextTipo,
          estado: (body.estado ?? old.estado) as Reference["estado"],
        },
        time = new Date(now).toISOString();
      db.run(
        "UPDATE referencias SET nombre=?,tipo=?,estado=?,revision=revision+1,actualizado=? WHERE id=?",
        [next.nombre, next.tipo, next.estado, time, id],
      );
      if (conversion && nextVehicle) {
        db.run(
          "INSERT INTO fichas_vehiculo VALUES(?,?,?,?,1,?,?)",
          [
            id,
            nextVehicle.matricula,
            nextVehicle.proximaITV,
            nextVehicle.cita,
            time,
            time,
          ],
        );
        vehicleAudit(
          db,
          id,
          "alta",
          1,
          null,
          { ...nextVehicle, revision: 1, creado: time, actualizado: time },
          time,
          "Conversión explícita Q3; ficha creada en la misma transacción",
        );
      } else if (editingVehicle && fichaChanged && nextVehicle) {
        db.run(
          "UPDATE fichas_vehiculo SET matricula=?,proxima_itv=?,fecha_cita=?,revision=revision+1,actualizado=? WHERE referencia=?",
          [
            nextVehicle.matricula,
            nextVehicle.proximaITV,
            nextVehicle.cita,
            time,
            id,
          ],
        );
        vehicleAudit(
          db,
          id,
          "edición",
          oldFicha!.revision + 1,
          oldFicha,
          { ...nextVehicle, revision: oldFicha!.revision + 1, actualizado: time },
          time,
          "Edición manual de ficha; identidad y Referencia conservadas",
        );
      }
      db.run(
        "INSERT INTO audit(entidad,accion,revision,campos,instante,revision_previa,actor,motivo) VALUES(?,'edición',?,?,?,?, 'usuario-unico',?)",
        [
          id,
          old.revision + 1,
          JSON.stringify({ anterior: old, posterior: getReference(db, id) }),
          time,
          old.revision,
          conversion
            ? "Conversión explícita a Vehículo; identidad preservada"
            : "Cambios de catálogo; identidad preservada",
        ],
      );
      if (confirmation && nextVehicle)
        duplicateAudit(
          db,
          id,
          conversion ? 1 : fichaChanged ? oldFicha!.revision + 1 : (oldFicha?.revision ?? 1),
          confirmation,
          time,
        );
      return getReference(db, id);
    })
    .immediate();
}
