import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  eur,
  type TransferenciaPendienteDTO,
  type TransferenciaPendienteImpactoDTO,
  type TransferenciaPendienteListaDTO,
} from "./api";
import {
  etiquetaModalidad,
  importeApi,
  mensajeCoordinado,
} from "./GastoCoordinado";
import {
  Alert,
  EmptyState,
  Field,
  FormGrid,
  focusFirstInvalidField,
  Skeleton,
  Tag,
} from "./ui";

/**
 * SPEC36 — ficha compartida de Transferencia pendiente.
 *
 * La usan el reparto mensual y Movimientos. No es un Movimiento: solo el acto
 * explícito «Transferencia realizada» crea el hecho real mediante el servicio
 * E1.5. Cancelar no produce efecto financiero. El vocabulario nunca afirma que
 * la aplicación haya ejecutado un pago bancario.
 */

const date = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "—";
const today = () => new Date().toLocaleDateString("sv-SE");
const amount = (value: string | null) => (value === null ? "No disponible" : eur(value));
const origenTipo = (value: TransferenciaPendienteDTO["origenTipo"]) =>
  value === "Reparto" ? "Reparto mensual" : "Registro coordinado de Gasto";

const revisionLabels: Record<string, string> = {
  LINEA_CAMBIADA: "La línea del reparto cambió.",
  REPARTO_NO_GENERADO: "El reparto ya no está generado.",
  PRESUPUESTO_NO_DISPONIBLE: "El Presupuesto no está disponible.",
  PRESUPUESTO_INACTIVO: "El Presupuesto está inactivo.",
  FUENTE_NO_APORTACION: "El Presupuesto ya no es Aportación a saldo.",
  PRESUPUESTO_DESTINO: "El destino del Presupuesto cambió.",
  SALDO_NO_ELEGIBLE: "Un Saldo ya no es elegible.",
  SALDO_NO_DISPONIBLE: "Un Saldo no está disponible.",
  SALDO_ORIGEN_NO_ELEGIBLE: "El Saldo de origen ya no es elegible.",
  SALDO_DESTINO_NO_ELEGIBLE: "El Saldo de destino ya no es elegible.",
  MOVIMIENTO_ANULADO: "El Movimiento vinculado está anulado.",
  MOVIMIENTO_NO_DISPONIBLE: "El Movimiento vinculado no está disponible.",
  MOVIMIENTO_NO_COINCIDE: "El Movimiento vinculado ya no coincide.",
  DUPLICADO: "Hay una Transferencia coincidente que debe revisarse.",
  // SPEC37 §9.2 — la línea base del pendiente coordinado es `gastoRevision`.
  GASTO_NO_DISPONIBLE: "El Gasto vinculado no está disponible.",
  GASTO_ANULADO: "El Gasto está anulado: no se confirma contra él. Revisa y decide.",
  GASTO_NO_COINCIDE:
    "El Gasto cambió (importe, fecha, Partida o Saldo pagador) desde el alta del pendiente.",
  REFERENCIA_NO_ELEGIBLE:
    "La Referencia de Anticipo prevista ya no es elegible. No se sustituye sola.",
};

function motivoRevision(motivo: string) {
  return revisionLabels[motivo] ?? motivo;
}

function normalizeItem(value: TransferenciaPendienteDTO): TransferenciaPendienteDTO {
  return {
    ...value,
    motivosRevision: Array.isArray(value.motivosRevision)
      ? value.motivosRevision
      : [],
    requiereRevision: value.requiereRevision === true,
  };
}

/**
 * Las acciones del mecanismo único (`confirmar`, `cancelar`, `vincular`,
 * `editar`) responden `{ item }`. Se desenvuelve aquí, en un solo lugar, para
 * que ninguna pantalla consumidora reciba la envoltura como si fuera la ficha.
 */
function desenvuelto(
  value: TransferenciaPendienteDTO | { item?: TransferenciaPendienteDTO },
): TransferenciaPendienteDTO {
  const envelope = value as { item?: TransferenciaPendienteDTO };
  if (envelope && typeof envelope.item === "object" && envelope.item !== null)
    return envelope.item;
  return value as TransferenciaPendienteDTO;
}

export type TransferenciaPendienteFichaProps = {
  pendiente: TransferenciaPendienteDTO;
  onChanged?: (item: TransferenciaPendienteDTO) => void;
  onReload?: () => void;
  go?: (path: string) => void;
  className?: string;
};

/**
 * §10.3 — alerta única de «Pendiente de realizar».
 *
 * La usan las tres superficies: lista general de Movimientos, bandeja de
 * pendientes y detalle del Gasto. El glifo es decorativo y el texto es el que
 * informa: la alerta nunca depende solo del color.
 */
export function AlertaPendienteDeRealizar({ detalle }: { detalle?: string }) {
  return (
    <p className="pendiente-alerta">
      <span className="pendiente-alerta-icono" aria-hidden="true">
        !
      </span>
      <span>
        <strong>Pendiente de realizar.</strong>{" "}
        {detalle ??
          "La Transferencia todavía no es un hecho real: no mueve saldos, no ejecuta presupuesto y no computa en el motor de Anticipos."}
      </span>
    </p>
  );
}

/**
 * §10.3 — la misma alerta en formato compacto para celdas de lista. Conserva
 * el glifo y el texto completo: no hay una versión que dependa solo del color.
 */
export function EtiquetaPendienteDeRealizar() {
  return (
    <span className="pendiente-alerta pendiente-alerta-chip">
      <span className="pendiente-alerta-icono" aria-hidden="true">
        !
      </span>
      <span>Pendiente de realizar</span>
    </span>
  );
}

export function TransferenciaPendienteFicha({
  pendiente: raw,
  onChanged,
  onReload,
  go,
  className,
}: TransferenciaPendienteFichaProps) {
  const pendiente = normalizeItem(raw);
  const [mode, setMode] = useState<
    "ver" | "confirmar" | "cancelar" | "editar" | "vincular"
  >("ver");
  const [fechaReal, setFechaReal] = useState(today());
  const [impact, setImpact] =
    useState<TransferenciaPendienteImpactoDTO | null>(null);
  const [realizada, setRealizada] = useState(false);
  const [aceptarCoincidencia, setAceptarCoincidencia] = useState(false);
  const [motivo, setMotivo] = useState("");
  // §8.4 y E3.1: la Transferencia de Anticipo exige la atribución del hecho
  // real. El API la valida; el formulario no la inventa ni la deduce.
  const [evidencia, setEvidencia] = useState("");
  const [procedencia, setProcedencia] = useState("");
  const [edicion, setEdicion] = useState({
    importe: "",
    fechaPrevista: "",
    concepto: "",
    nota: "",
  });
  const [candidatos, setCandidatos] = useState<
    { id: string; fecha: string; importe: string; origen: string; destino: string }[]
  >([]);
  const [candidatosCargados, setCandidatosCargados] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [notice, setNotice] = useState("");
  const rootRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const impactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode("ver");
    setImpact(null);
    setRealizada(false);
    setAceptarCoincidencia(false);
    setMotivo("");
    setEvidencia("");
    setProcedencia("");
    setCandidatos([]);
    setCandidatosCargados(false);
    setError("");
    setFieldErrors({});
    setKey(crypto.randomUUID());
    setFechaReal(today());
  }, [pendiente.id, pendiente.revision]);

  // El aviso de éxito sobrevive a la revisión nueva del mismo pendiente: el
  // API devuelve la ficha ya actualizada y borrarlo dejaría la acción sin
  // confirmación visible. Solo se limpia al cambiar de pendiente.
  useEffect(() => {
    setNotice("");
  }, [pendiente.id]);

  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(rootRef.current)) errorRef.current?.focus();
    });
  }, [error, fieldErrors]);

  useEffect(() => {
    if (impact) impactRef.current?.focus();
  }, [impact]);

  async function revisar() {
    setBusy(true);
    setError("");
    setFieldErrors({});
    setNotice("");
    try {
      const data = await api<TransferenciaPendienteImpactoDTO>(
        `/transferencias-pendientes/${pendiente.id}/impacto`,
        "POST",
        {
          fechaReal,
          ...(pendiente.modalidad === "B"
            ? {
                anticipo: {
                  evidencia: evidencia.trim(),
                  procedencia: procedencia.trim(),
                },
              }
            : {}),
        },
      );
      setImpact({
        ...data,
        condiciones: data.condiciones ?? {
          requiereRevision: false,
          motivos: [],
        },
        duplicados: Array.isArray(data.duplicados) ? data.duplicados : [],
      });
      setRealizada(false);
      setAceptarCoincidencia(false);
      setKey(crypto.randomUUID());
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }

  async function confirmar() {
    if (!impact || !realizada) return;
    if (impact.duplicados.length > 0 && !aceptarCoincidencia) return;
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const respuesta = await api<
        TransferenciaPendienteDTO | { item?: TransferenciaPendienteDTO }
      >(
        `/transferencias-pendientes/${pendiente.id}/confirmar`,
        "POST",
        {
          revision: pendiente.revision,
          fechaReal,
          fingerprint: impact.fingerprint,
          ...(pendiente.modalidad === "B"
            ? {
                anticipo: {
                  evidencia: evidencia.trim(),
                  procedencia: procedencia.trim(),
                },
              }
            : {}),
          ...(impact.duplicados.length
            ? { aceptarCoincidencia }
            : {}),
        },
        { "idempotency-key": key },
      );
      setNotice("Transferencia confirmada. El Movimiento real ya existe.");
      setMode("ver");
      setImpact(null);
      onChanged?.(normalizeItem(desenvuelto(respuesta)));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? mensajeCoordinado(e.code, e.message)
          : (e as Error).message,
      );
      if (e instanceof ApiError) {
        setFieldErrors(e.fields);
        if (e.status === 409) setImpact(null);
      }
    } finally {
      setBusy(false);
    }
  }

  async function editar() {
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const respuesta = await api<
        TransferenciaPendienteDTO | { item?: TransferenciaPendienteDTO }
      >(
        `/transferencias-pendientes/${pendiente.id}`,
        "PATCH",
        {
          revision: pendiente.revision,
          // El campo admite la coma decimal española; el API exige el formato
          // canónico con punto y dos decimales exactos.
          importe: importeApi(edicion.importe),
          fechaPrevista: edicion.fechaPrevista,
          concepto: edicion.concepto,
          nota: edicion.nota,
        },
        { "idempotency-key": key },
      );
      setNotice("Pendiente actualizado. La modalidad y el Gasto no han cambiado.");
      setMode("ver");
      onChanged?.(normalizeItem(desenvuelto(respuesta)));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? mensajeCoordinado(e.code, e.message)
          : (e as Error).message,
      );
      if (e instanceof ApiError) setFieldErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }

  async function buscarCandidatos() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ items: typeof candidatos }>(
        `/transferencias-pendientes/${pendiente.id}/candidatos`,
      );
      setCandidatos(Array.isArray(data.items) ? data.items : []);
      setCandidatosCargados(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function vincular(movimientoId: string) {
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const respuesta = await api<
        TransferenciaPendienteDTO | { item?: TransferenciaPendienteDTO }
      >(
        `/transferencias-pendientes/${pendiente.id}/vincular`,
        "POST",
        { revision: pendiente.revision, movimientoId },
        { "idempotency-key": key },
      );
      setNotice(
        "Pendiente vinculado a la Transferencia existente. No se ha creado ni modificado ningún Movimiento.",
      );
      setMode("ver");
      onChanged?.(normalizeItem(desenvuelto(respuesta)));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? mensajeCoordinado(e.code, e.message)
          : (e as Error).message,
      );
      if (e instanceof ApiError) setFieldErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }

  async function cancelar() {
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const respuesta = await api<
        TransferenciaPendienteDTO | { item?: TransferenciaPendienteDTO }
      >(
        `/transferencias-pendientes/${pendiente.id}/cancelar`,
        "POST",
        { revision: pendiente.revision, motivo },
        { "idempotency-key": key },
      );
      setNotice("Pendiente cancelado con motivo; no hay efecto financiero.");
      setMode("ver");
      onChanged?.(normalizeItem(desenvuelto(respuesta)));
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }

  const pendienteDeRealizar = pendiente.estado === "Pendiente de realizar";
  const cycle = impact?.cicloFechaReal;
  const changeCycle = !!cycle && cycle.id !== pendiente.cicloOrigen;

  return (
    <section
      ref={rootRef}
      className={`panel ui-form-section${className ? ` ${className}` : ""}`}
      aria-label={`Transferencia pendiente ${pendiente.id}`}
    >
      <div className="ui-form-section-head">
        <div className="ui-form-section-copy">
          <h3 className="ui-form-section-title">
            Transferencia pendiente #{pendiente.id}
          </h3>
          <p className="ui-form-section-description">
            Registro operativo: no es un Movimiento ni mueve saldos hasta la
            confirmación del hecho real.
          </p>
        </div>
        <Tag inactive={pendiente.estado === "Cancelada"}>
          {pendiente.estado}
        </Tag>
      </div>

      {pendienteDeRealizar && (
        <AlertaPendienteDeRealizar
          detalle={
            pendiente.modalidad === "B"
              ? "El Gasto ya es real; la Transferencia de Anticipo todavía no existe, así que no hay Referencia ni ficha creadas y el motor de Anticipos no computa nada."
              : "El Gasto ya es real; la Transferencia ordinaria todavía no existe, así que no mueve saldos ni ejecuta presupuesto."
          }
        />
      )}

      <dl className="detail-grid">
        <div>
          <dt>Importe</dt>
          <dd>{amount(pendiente.importe)}</dd>
        </div>
        <div>
          <dt>Modalidad</dt>
          <dd>
            {pendiente.modalidad
              ? etiquetaModalidad(pendiente.modalidad)
              : "No aplica"}
          </dd>
        </div>
        <div>
          <dt>Origen → destino</dt>
          <dd>
            {pendiente.origen?.id ?? "No disponible"} ·{" "}
            {pendiente.origen?.nombre ?? "No disponible"} →{" "}
            {pendiente.destino?.id ?? "No disponible"} ·{" "}
            {pendiente.destino?.nombre ?? "No disponible"}
          </dd>
        </div>
        <div>
          <dt>Fecha prevista</dt>
          <dd>{date(pendiente.fechaPrevista)}</dd>
        </div>
        <div>
          <dt>Fecha efectiva</dt>
          <dd>
            {pendiente.fechaEfectiva
              ? date(pendiente.fechaEfectiva)
              : "Todavía no confirmada"}
          </dd>
        </div>
        <div>
          <dt>Ciclo de origen</dt>
          <dd>{pendiente.cicloOrigen}</dd>
        </div>
        <div>
          <dt>Procedencia</dt>
          <dd>{origenTipo(pendiente.origenTipo)}</dd>
        </div>
        {pendiente.gasto && (
          <div>
            <dt>Gasto vinculado</dt>
            <dd>
              {go ? (
                <a
                  href={`/movimientos/${pendiente.gasto}`}
                  onClick={(e) => {
                    e.preventDefault();
                    go(`/movimientos/${pendiente.gasto}`);
                  }}
                >
                  #{pendiente.gasto}
                </a>
              ) : (
                `#${pendiente.gasto}`
              )}
              {pendiente.gastoRevision !== null
                ? ` · revisión ${pendiente.gastoRevision}`
                : " · sin línea base"}
            </dd>
          </div>
        )}
        {pendiente.modalidad === "B" && (
          <div>
            <dt>Referencia de Anticipo prevista</dt>
            <dd>
              {pendiente.anticipoPrevisto
                ? `${pendiente.anticipoPrevisto} · Referencia existente`
                : pendiente.anticipoIntencion
                  ? `Intención de alta: ${pendiente.anticipoIntencion.nombre}${
                      pendiente.anticipoIntencion.apertura
                        ? ` · apertura ${date(pendiente.anticipoIntencion.apertura)}`
                        : ""
                    }`
                  : "No informada"}
            </dd>
          </div>
        )}
        <div>
          <dt>Concepto</dt>
          <dd>{pendiente.concepto || "Sin concepto"}</dd>
        </div>
        <div>
          <dt>Nota</dt>
          <dd>{pendiente.nota || "Sin nota"}</dd>
        </div>
        {pendiente.presupuesto && (
          <div>
            <dt>Presupuesto</dt>
            <dd>
              {pendiente.presupuesto.nombre} · {pendiente.presupuesto.id}
            </dd>
          </div>
        )}
        {pendiente.movimiento && (
          <div>
            <dt>Movimiento confirmado</dt>
            <dd>
              {go ? (
                <a
                  href={`/movimientos/${pendiente.movimiento.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    go(`/movimientos/${pendiente.movimiento!.id}`);
                  }}
                >
                  #{pendiente.movimiento.id} · {date(pendiente.movimiento.fecha)}{" "}
                  · {eur(pendiente.movimiento.importe)}
                </a>
              ) : (
                <>
                  #{pendiente.movimiento.id} ·{" "}
                  {date(pendiente.movimiento.fecha)} ·{" "}
                  {eur(pendiente.movimiento.importe)}
                </>
              )}
              {pendiente.movimiento.anulado && " · Movimiento anulado"}
            </dd>
          </div>
        )}
        {pendiente.motivoCancelacion && (
          <div>
            <dt>Motivo de cancelación</dt>
            <dd>{pendiente.motivoCancelacion}</dd>
          </div>
        )}
      </dl>

      {pendiente.requiereRevision && (
        <Alert>
          <strong>Requiere revisión.</strong>{" "}
          {pendiente.motivosRevision.length
            ? pendiente.motivosRevision.map(motivoRevision).join(" ")
            : "Revisa la ficha, vincula un hecho existente o cancela con motivo."}{" "}
          La confirmación queda bloqueada hasta resolverlo.
          {onReload && (
            <button className="secondary" onClick={onReload}>
              Releer la ficha
            </button>
          )}
        </Alert>
      )}

      <div ref={errorRef} tabIndex={-1}>
        {error && <Alert retry={onReload}>{error}</Alert>}
      </div>
      {notice && <p role="status">{notice}</p>}

      {pendienteDeRealizar && mode === "ver" && (
        <div className="actions">
          <button
            className="primary"
            disabled={busy || pendiente.requiereRevision}
            onClick={() => {
              setMode("confirmar");
              setImpact(null);
              setError("");
              setNotice("");
            }}
          >
            Confirmar transferencia
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              setMode("editar");
              setError("");
              setNotice("");
              setEdicion({
                importe: pendiente.importe,
                fechaPrevista: pendiente.fechaPrevista,
                concepto: pendiente.concepto,
                nota: pendiente.nota,
              });
            }}
          >
            Editar importe y fecha prevista
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              setMode("vincular");
              setError("");
              setNotice("");
              setCandidatos([]);
              setCandidatosCargados(false);
            }}
          >
            Vincular a una Transferencia existente
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              setMode("cancelar");
              setError("");
              setNotice("");
            }}
          >
            Cancelar pendiente
          </button>
        </div>
      )}

      {pendienteDeRealizar && mode === "confirmar" && (
        <section aria-label={`Confirmación de la Transferencia pendiente ${pendiente.id}`}>
          <h4>Revisión antes de confirmar</h4>
          <p>
            La fecha real es la del banco y determina el Ciclo y la ejecución
            presupuestaria. No se usa la fecha prevista como fecha efectiva.
          </p>
          <Field
            id={`pendiente-${pendiente.id}-fecha-real`}
            label="Fecha real del banco"
            help={`Máximo ${date(pendiente.hoy)} (día civil de España).`}
            error={fieldErrors.fechaReal}
            required
          >
            <input
              type="date"
              max={pendiente.hoy}
              value={fechaReal}
              onChange={(e) => {
                setFechaReal(e.target.value);
                setImpact(null);
              }}
            />
          </Field>
          {pendiente.modalidad === "B" && (
            <FormGrid>
              <Field
                id={`pendiente-${pendiente.id}-evidencia`}
                label="Evidencia de la Transferencia de Anticipo *"
                help="Hecho real que respalda el adelanto; el API lo exige y no se deduce."
                required
                error={fieldErrors["anticipo.evidencia"] ?? fieldErrors.evidencia}
              >
                <input
                  maxLength={1000}
                  value={evidencia}
                  onChange={(e) => {
                    setEvidencia(e.target.value);
                    setImpact(null);
                  }}
                />
              </Field>
              <Field
                id={`pendiente-${pendiente.id}-procedencia`}
                label="Procedencia de la Transferencia de Anticipo *"
                help="Origen documental de la evidencia. Se conserva con el hecho real."
                required
                error={
                  fieldErrors["anticipo.procedencia"] ?? fieldErrors.procedencia
                }
              >
                <input
                  maxLength={1000}
                  value={procedencia}
                  onChange={(e) => {
                    setProcedencia(e.target.value);
                    setImpact(null);
                  }}
                />
              </Field>
            </FormGrid>
          )}
          <div className="actions">
            <button
              className="secondary"
              disabled={
                busy ||
                (pendiente.modalidad === "B" &&
                  (!evidencia.trim() || !procedencia.trim()))
              }
              onClick={revisar}
            >
              Revisar confirmación
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setMode("ver")}
            >
              Volver a la ficha
            </button>
          </div>
          <div ref={impactRef} tabIndex={-1} aria-live="polite">
            {impact && (
              <section className="panel" aria-label="Vista previa de confirmación">
                <h4>Vista previa de confirmación</h4>
                {impact.motivoNoDisponible ? (
                  <Alert>{impact.motivoNoDisponible}</Alert>
                ) : (
                  <>
                    <p>
                      {impact.movimiento?.tipo ?? "Transferencia"} ·{" "}
                      {amount(impact.movimiento?.importe ?? pendiente.importe)} ·{" "}
                      {date(impact.fechaReal)}
                    </p>
                    <p>
                      Efecto presupuestario:{" "}
                      {impact.efectoPresupuestario?.motivo ??
                        "No se puede atribuir a un Presupuesto."}
                    </p>
                    {changeCycle && cycle && (
                      <Alert>
                        La fecha real cae en el Ciclo {cycle.id} (
                        {date(cycle.inicio)}–
                        {cycle.fin ? date(cycle.fin) : "sin fin temporal"}),
                        distinto del Ciclo del reparto ({pendiente.cicloOrigen}). El
                        Movimiento pertenece al Ciclo de la fecha real y el
                        reparto de origen conserva el vínculo sin recalcular un
                        Ciclo cerrado.
                      </Alert>
                    )}
                    {impact.duplicados.length > 0 && (
                      <Alert>
                        Hay {impact.duplicados.length} Transferencia(s)
                        coincidente(s). Confirma solo si es otro hecho económico
                        real; no se creará un segundo Movimiento por error.
                        <ul>
                          {impact.duplicados.map((d) => (
                            <li key={d.id}>
                              #{d.id} · {date(d.fecha)} · {eur(d.importe)}
                            </li>
                          ))}
                        </ul>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={aceptarCoincidencia}
                            onChange={(e) =>
                              setAceptarCoincidencia(e.target.checked)
                            }
                          />
                          Es otro hecho económico real y no un duplicado
                        </label>
                      </Alert>
                    )}
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={realizada}
                        onChange={(e) => setRealizada(e.target.checked)}
                      />
                      Transferencia realizada
                    </label>
                    <p className="help">
                      Confirmo que la operación ya se ejecutó en el banco. No se
                      marca automáticamente por el paso del tiempo ni por otras
                      líneas.
                    </p>
                    <button
                      className="primary"
                      disabled={
                        busy ||
                        !realizada ||
                        (pendiente.modalidad === "B" &&
                          (!evidencia.trim() || !procedencia.trim())) ||
                        (impact.duplicados.length > 0 && !aceptarCoincidencia)
                      }
                      onClick={confirmar}
                    >
                      Confirmar transferencia realizada
                    </button>
                  </>
                )}
              </section>
            )}
          </div>
        </section>
      )}

      {pendienteDeRealizar && mode === "cancelar" && (
        <section aria-label={`Cancelación de la Transferencia pendiente ${pendiente.id}`}>
          <h4>Cancelar pendiente</h4>
          <p>
            Cancelar no produce efecto financiero. El motivo y la trazabilidad
            se conservan; la alerta deja de mostrarse.
          </p>
          <Field
            id={`pendiente-${pendiente.id}-motivo`}
            label="Motivo de cancelación"
            error={fieldErrors.motivo}
            required
          >
            <textarea
              maxLength={2000}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Field>
          <div className="actions">
            <button
              className="primary"
              disabled={busy || !motivo.trim()}
              onClick={cancelar}
            >
              Confirmar cancelación
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setMode("ver")}
            >
              Volver a la ficha
            </button>
          </div>
        </section>
      )}

      {pendienteDeRealizar && mode === "editar" && (
        <section aria-label={`Edición de la Transferencia pendiente ${pendiente.id}`}>
          <h4>Editar importe y fecha prevista</h4>
          <p>
            La modalidad y el Gasto vinculado no se editan: la modalidad es
            inmutable tras el alta y el Gasto pertenece al hecho real. Cambiar la
            modalidad exige cancelar con motivo y crear otro pendiente.
          </p>
          <FormGrid>
            <Field
              id={`pendiente-${pendiente.id}-editar-importe`}
              label="Importe previsto (€) *"
              error={fieldErrors.importe}
              required
            >
              <input
                inputMode="decimal"
                value={edicion.importe}
                onChange={(e) =>
                  setEdicion((v) => ({ ...v, importe: e.target.value }))
                }
              />
            </Field>
            <Field
              id={`pendiente-${pendiente.id}-editar-fecha`}
              label="Fecha prevista *"
              error={fieldErrors.fechaPrevista}
              required
            >
              <input
                type="date"
                value={edicion.fechaPrevista}
                onChange={(e) =>
                  setEdicion((v) => ({ ...v, fechaPrevista: e.target.value }))
                }
              />
            </Field>
            <Field
              id={`pendiente-${pendiente.id}-editar-concepto`}
              label="Concepto"
              error={fieldErrors.concepto}
            >
              <input
                value={edicion.concepto}
                onChange={(e) =>
                  setEdicion((v) => ({ ...v, concepto: e.target.value }))
                }
              />
            </Field>
            <Field
              id={`pendiente-${pendiente.id}-editar-nota`}
              label="Nota"
              error={fieldErrors.nota}
            >
              <textarea
                maxLength={4000}
                value={edicion.nota}
                onChange={(e) =>
                  setEdicion((v) => ({ ...v, nota: e.target.value }))
                }
              />
            </Field>
          </FormGrid>
          <div className="actions">
            <button
              className="primary"
              disabled={
                busy ||
                !edicion.importe.trim() ||
                !edicion.fechaPrevista
              }
              onClick={editar}
            >
              Guardar cambios del pendiente
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setMode("ver")}
            >
              Volver a la ficha
            </button>
          </div>
        </section>
      )}

      {pendienteDeRealizar && mode === "vincular" && (
        <section aria-label={`Vinculación de la Transferencia pendiente ${pendiente.id}`}>
          <h4>Vincular a una Transferencia existente</h4>
          <p>
            Solo se admiten Transferencias reales con coincidencia exacta de
            dirección e importe y, cuando la modalidad lo exige, de Referencia. El
            hecho existente no se modifica ni se duplica; si el importe difiere,
            cancela el pendiente y usa el procedimiento ordinario.
          </p>
          <div className="actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={buscarCandidatos}
            >
              Buscar Transferencias coincidentes
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setMode("ver")}
            >
              Volver a la ficha
            </button>
          </div>
          {candidatosCargados &&
            (candidatos.length === 0 ? (
              <p className="help">
                No hay ninguna Transferencia real que coincida exactamente. Con
                una intención de Referencia todavía no existe Referencia con la
                que coincidir: confirma la Transferencia o cancela con motivo.
              </p>
            ) : (
              <ul className="ui-data-list" aria-label="Transferencias candidatas">
                {candidatos.map((c) => (
                  <li key={c.id} className="ui-data-list-item">
                    <div className="ui-data-list-field">
                      <span className="ui-data-list-label">Movimiento</span>
                      <div className="ui-data-list-value">
                        #{c.id} · {date(c.fecha)} · {eur(c.importe)}
                      </div>
                    </div>
                    <div className="ui-data-list-field">
                      <span className="ui-data-list-label">Dirección</span>
                      <div className="ui-data-list-value">
                        {c.origen} → {c.destino}
                      </div>
                    </div>
                    <div className="ui-data-list-field" data-kind="actions">
                      <span className="ui-data-list-label">Acción</span>
                      <div className="ui-data-list-value">
                        <button
                          className="secondary"
                          disabled={busy || pendiente.requiereRevision}
                          onClick={() => vincular(c.id)}
                        >
                          Vincular el pendiente a #{c.id}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ))}
        </section>
      )}
    </section>
  );
}

function normalizeList(data: unknown): TransferenciaPendienteListaDTO {
  const value = data as Partial<TransferenciaPendienteListaDTO> | null;
  return {
    items: Array.isArray(value?.items) ? value.items : [],
    total: typeof value?.total === "number" ? value.total : 0,
    page: typeof value?.page === "number" ? value.page : 1,
  };
}

/**
 * Sección de Movimientos para pendientes de confirmar. Vive separada de la
 * lista y de los totales de Movimientos: no suma importes ni altera balances.
 */
export function PendientesDeConfirmar({ go }: { go?: (path: string) => void }) {
  const [data, setData] = useState<TransferenciaPendienteListaDTO | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [visible, setVisible] = useState(true);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const request = useRef(0);

  useEffect(() => {
    const current = ++request.current;
    setLoading(true);
    setError("");
    api<TransferenciaPendienteListaDTO>(
      "/transferencias-pendientes?" +
        new URLSearchParams({
          estado: "Pendiente de realizar",
          page: "1",
        }),
    )
      .then((value) => {
        if (current === request.current) setData(normalizeList(value));
      })
      .catch((e) => {
        if (current === request.current) setError((e as Error).message);
      })
      .finally(() => {
        if (current === request.current) setLoading(false);
      });
    return () => {
      ++request.current;
    };
  }, [retry]);

  const items = data?.items ?? [];
  const attention = items.filter((item) => item.requiereRevision);
  const shown = attentionOnly ? attention : items;

  return (
    <section
      className="panel pending-transfers"
      aria-label="Pendientes de confirmar"
    >
      <h2>Pendientes de confirmar</h2>
      <div className="pending-filters">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          Pendientes de confirmar
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={attentionOnly}
            onChange={(e) => setAttentionOnly(e.target.checked)}
          />
          Requieren atención ({attention.length})
        </label>
      </div>
      {visible && (
        <>
      <div className="list-toolbar">
        <p ref={statusRef} role="status">
          <span
            className="pending-status-dot"
            aria-hidden="true"
            data-state={loading ? "loading" : error ? "error" : "ready"}
          />
          {loading
            ? "Cargando pendientes de confirmar…"
            : error
              ? "Pendientes no disponibles"
              : `Pendientes de confirmar: ${items.length} · Requieren atención: ${attention.length}`}
        </p>
        <span>No suman en totales, balances ni ejecución</span>
      </div>
      {error ? (
        <Alert retry={() => setRetry((value) => value + 1)}>{error}</Alert>
      ) : loading ? (
        <Skeleton lines={2} label="Cargando pendientes de confirmar" />
      ) : shown.length === 0 ? (
        <EmptyState
          title={
            attentionOnly
              ? "Sin pendientes que requieran atención"
              : "Sin pendientes de confirmar"
          }
          icon="○"
        >
          {attentionOnly
            ? "Ningún pendiente tiene una condición de revisión."
            : "Cuando registres un Gasto coordinado o prepares un reparto, sus Transferencias pendientes aparecerán aquí, separadas de los hechos ejecutados."}
        </EmptyState>
      ) : (
        <ul className="ui-data-list" aria-label="Lista de pendientes de confirmar">
          {shown.map((item) => (
            <li key={item.id} className="ui-data-list-item">
              <div className="ui-data-list-field" data-kind="amount">
                <span className="ui-data-list-label">Importe</span>
                <div className="ui-data-list-value">
                  <strong>{eur(item.importe)}</strong>
                </div>
              </div>
              <div className="ui-data-list-field">
                <span className="ui-data-list-label">Origen → destino</span>
                <div className="ui-data-list-value">
                  {item.origen?.nombre ?? "No disponible"} →{" "}
                  {item.destino?.nombre ?? "No disponible"}
                </div>
              </div>
              <div className="ui-data-list-field">
                <span className="ui-data-list-label">Fecha prevista</span>
                <div className="ui-data-list-value">
                  {date(item.fechaPrevista)}
                </div>
              </div>
              <div className="ui-data-list-field" data-kind="status">
                <span className="ui-data-list-label">Estado</span>
                <div className="ui-data-list-value">
                  <span
                    className="pending-status-dot"
                    aria-hidden="true"
                    data-state="ready"
                  />{" "}
                  <Tag>{item.estado}</Tag>
                  {item.requiereRevision && <Tag>Requiere revisión</Tag>}
                  <small className="table-id">
                    {item.movimiento
                      ? "No confirmada · pendiente de realizar"
                      : "No es un Movimiento ejecutado"}
                  </small>
                </div>
              </div>
              <div className="ui-data-list-field">
                <span className="ui-data-list-label">Modalidad y Gasto</span>
                <div className="ui-data-list-value">
                  {item.modalidad
                    ? etiquetaModalidad(item.modalidad)
                    : "No aplica (Reparto mensual)"}
                  {item.gasto && (
                    <>
                      {" · "}
                      <a
                        href={`/movimientos/${item.gasto}`}
                        onClick={(e) => {
                          e.preventDefault();
                          go?.(`/movimientos/${item.gasto}`);
                        }}
                      >
                        Gasto #{item.gasto}
                      </a>
                    </>
                  )}
                </div>
              </div>
              <div className="ui-data-list-field" data-kind="alert">
                <span className="ui-data-list-label">Alerta</span>
                <div className="ui-data-list-value">
                  <AlertaPendienteDeRealizar
                    detalle={
                      item.requiereRevision
                        ? "Requiere revisión antes de confirmar; la alerta no desaparece hasta confirmar o cancelar válidamente."
                        : "El Gasto ya es real; la Transferencia todavía no."
                    }
                  />
                </div>
              </div>
              <div className="ui-data-list-field" data-kind="actions">
                <span className="ui-data-list-label">Acciones</span>
                <div className="ui-data-list-value">
                  <button
                    className="secondary"
                    aria-expanded={openId === item.id}
                    onClick={() =>
                      setOpenId((value) => (value === item.id ? null : item.id))
                    }
                  >
                    {openId === item.id ? "Cerrar ficha" : "Abrir ficha"}
                  </button>
                </div>
              </div>
              {openId === item.id && (
                <TransferenciaPendienteFicha
                  pendiente={item}
                  go={go}
                  onReload={() => setRetry((value) => value + 1)}
                  onChanged={() => setRetry((value) => value + 1)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
        </>
      )}
      {!visible && (
        <p className="help">
          La sección está oculta. Los pendientes siguen existiendo y no se han
          convertido en Movimientos.
        </p>
      )}
    </section>
  );
}
