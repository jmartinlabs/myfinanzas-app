import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "./api";
import {
  Alert,
  Badge,
  DataList,
  PageHead,
  Table,
  TableScroll,
  type TableColumn,
} from "./ui";

/**
 * SPEC38 · I2 — validación operativa del cierre (#555).
 *
 * Sustituye la pantalla fotográfica de E4.9/E4.10: ya no se cierra con una foto
 * inmutable, no hay versiones, ni reapertura, ni re-cierre, ni cancelación. Lo
 * que queda es una referencia humana del **conjunto vigente** —huella, versión
 * de conjunto, actor, instante y motivo— que se escribe con previsualización y
 * confirmación, y que el ciclo siguiente puede dejar `Pendiente` cuando un
 * hecho material cambia. Esta pantalla **no presenta cifras persistidas**: lee
 * estado, cobertura y divergencia, y devuelve sólo el recibo de la operación.
 *
 * Contrato consumido (no se modifica aquí):
 * - `GET /api/cierres/:id/estado` → precierre + `validacion` (`ValidacionDto`).
 * - `GET /api/cierres/:id/validacion/preview` → `PreviewValidacionDto`.
 * - `POST /api/cierres/:id/validar` y `/revision/confirmar` con `fingerprint`,
 *   `contextRevision`, `impactRevision`, `motivo?` e `Idempotency-Key`.
 * - Errores: `409 IMPACT_CHANGED` (reprevisualizar sin perder borrador),
 *   `409 VALIDATION_PENDING`/`VALIDATION_NOT_VALIDATED`,
 *   `422 VALIDATION` con bloqueos y `503 VALIDACION_NO_DISPONIBLE`.
 *
 * El fallo de lectura de validación **falla cerrado**: nunca se dibuja «Sin
 * validar» cuando el estado no se pudo leer (§7.6/G4).
 */

type Cobertura = {
  fuente: string;
  estado: "Disponible" | "Parcial" | "NoDisponible";
  causas: string[];
};

type EstadoValidacion = {
  estado: "SinValidar" | "Validada" | "Pendiente";
  revision: number | null;
  dirty: boolean;
  dirtyDesde: string | null;
  dirtyUltimo: string | null;
  dirtyOrigen: string | null;
  motivos: string[];
  cobertura: Cobertura[];
  divergenciaValidacion: "Igual" | "Distinta" | "NoComparable";
  pendienteSinDelta: boolean;
  revalidacionSugerida: boolean;
  validado: boolean;
  versionConjunto: string | null;
  huellaValidacion: string | null;
  huellaVigente: string;
  ultimaRevision: { actor: string; instante: string; motivo: string | null } | null;
};

type Requisito = { code: string; message: string };

type EstadoCiclo = {
  ciclo: string;
  estado: string;
  cobertura: "Completa" | "Parcial";
  revision: string;
  bloqueos: Requisito[];
  avisos: Requisito[];
  validacion: EstadoValidacion;
};

type Afectado = {
  ciclo: string;
  rango: { desde: string; hasta: string };
  material: boolean;
  motivos: string[];
  noDisponible: string[];
  estadoValidacion: string;
  validado: boolean;
  dirtyPrevio: boolean;
};

type Preview = {
  operacion: "validar" | "revalidar" | "confirmar_revision";
  fingerprint: string;
  contextRevision: string;
  impactRevision: string;
  material: boolean | null;
  afectados: Afectado[];
  cobertura: Cobertura[];
  requiereMotivo: boolean;
  estado: EstadoValidacion;
  bloqueos: Requisito[];
  avisos: Requisito[];
  huellaVigente: string;
  versionConjunto: string;
};

type Recibo = {
  operacionId: string;
  ciclos: { id: string; revision: string; estado: string }[];
  auditIds: string[];
  cierresDirty: {
    ciclo: string;
    rango: { desde: string; hasta: string };
    estadoValidacion: string;
    validado: boolean;
    dirtyPrevio: boolean;
  }[];
};

const FUENTE_LABEL: Record<string, string> = {
  movimientos: "Movimientos",
  efectivo: "Efectivo",
  posiciones: "Posiciones",
  plan: "Plan",
  e35: "E3.5",
  deuda: "Deuda",
  valoracion: "Valoración",
  anticipos: "Anticipos",
};

const ESTADO_LABEL: Record<EstadoValidacion["estado"], string> = {
  SinValidar: "Sin validar",
  Validada: "Validada",
  Pendiente: "Pendiente",
};

const OPERACION_LABEL: Record<Preview["operacion"], string> = {
  validar: "Validar",
  revalidar: "Revalidar",
  confirmar_revision: "Confirmar revisión",
};

const DIVERGENCIA_LABEL: Record<
  EstadoValidacion["divergenciaValidacion"],
  string
> = {
  Igual: "Igual a la referencia validada",
  Distinta: "Distinta de la referencia validada",
  NoComparable: "No comparable: no hay referencia humana",
};

const instante = (value: string | null) =>
  value ? value.replace("T", " ").replace(/(\.\d+)?Z$/, " UTC") : "—";

function estadoTone(estado: EstadoValidacion["estado"]) {
  return estado === "Validada" ? "ok" : estado === "Pendiente" ? "partial" : "nd";
}

function estadoIcon(estado: EstadoValidacion["estado"]) {
  return estado === "Validada" ? "●" : estado === "Pendiente" ? "◐" : "○";
}

function coberturaTone(estado: string) {
  return estado === "Disponible"
    ? "ok"
    : estado === "Parcial"
      ? "partial"
      : "nd";
}

function coberturaLabel(estado: string) {
  return estado === "NoDisponible" ? "No disponible" : estado;
}

function requisitosDe(error: ApiError): Requisito[] {
  const fields = error.fields ?? {};
  return Object.entries(fields).map(([code, message]) => ({
    code,
    message: String(message),
  }));
}

export function Validacion({ go }: { go: (path: string) => void }) {
  const [cycles, setCycles] = useState<{ id: string; inicio: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [data, setData] = useState<EstadoCiclo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [catalogFailed, setCatalogFailed] = useState(false);
  // La lista de ciclos y el estado son dos lecturas: sin esta marca, el vacío
  // se dibujaría antes de saber si hay ciclos.
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [noDisponible, setNoDisponible] = useState(false);
  const [reload, setReload] = useState(0);
  const request = useRef(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const cicloAnterior = useRef("");

  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewBloqueos, setPreviewBloqueos] = useState<Requisito[]>([]);
  const [key, setKey] = useState("");
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState("");
  const [busy, setBusy] = useState(false);
  // 409 IMPACT_CHANGED: los tokens del preview quedan obsoletos y confirmar con
  // ellos volvería a fallar; el borrador sí se conserva.
  const [stale, setStale] = useState(false);
  const [conflict, setConflict] = useState<{
    code: string;
    message: string;
    impactChanged: boolean;
    /** Fallo de red o 5xx: el mismo intento se puede repetir con la misma clave. */
    retryable: boolean;
    bloqueos: Requisito[];
  } | null>(null);
  const [retried, setRetried] = useState(false);
  const [recibo, setRecibo] = useState<Recibo | null>(null);
  const reciboRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let live = true;
    setCatalogFailed(false);
    async function catalog() {
      try {
        const all: { id: string; inicio: string }[] = [];
        let page = 1,
          total = 0;
        do {
          const result = await api("/ciclos?estado=&page=" + page++);
          all.push(...result.ciclos);
          total = result.total;
        } while (all.length < total);
        if (!live) return;
        setCycles(all);
        setCatalogLoaded(true);
        const wanted = new URLSearchParams(location.search).get("ciclo");
        setSelected((previous) => {
          if (previous) return previous;
          if (wanted && all.some((cycle) => cycle.id === wanted)) return wanted;
          return all[0]?.id ?? "";
        });
      } catch (e) {
        if (live) {
          setCatalogFailed(true);
          setCatalogLoaded(true);
          setError((e as Error).message);
        }
      }
    }
    void catalog();
    return () => {
      live = false;
    };
  }, [reload]);

  useEffect(() => {
    if (!selected) {
      setData(null);
      setLoading(false);
      return;
    }
    const current = ++request.current;
    // Cambiar de ciclo descarta el intento en curso; refrescar el mismo ciclo
    // conserva recibo, borrador y conflicto (una recarga no debe borrar lo que
    // el humano acaba de escribir o de registrar).
    const cambioDeCiclo = cicloAnterior.current !== selected;
    cicloAnterior.current = selected;
    setError("");
    setNoDisponible(false);
    if (cambioDeCiclo) {
      // La primera lectura del ciclo muestra carga; un refresco del mismo
      // ciclo conserva la lectura y el recibo en pantalla.
      setLoading(true);
      setData(null);
      setPreview(null);
      setPreviewBloqueos([]);
      setConflict(null);
      setRecibo(null);
      setMotivo("");
      setMotivoError("");
      setStale(false);
      setRetried(false);
    }
    api<EstadoCiclo>("/cierres/" + selected + "/estado")
      .then((result) => {
        if (current === request.current && selectedRef.current === selected)
          setData(result);
      })
      .catch((e) => {
        if (current !== request.current || selectedRef.current !== selected)
          return;
        const failure = e as ApiError;
        if (failure.status === 503 && failure.code === "VALIDACION_NO_DISPONIBLE") {
          setNoDisponible(true);
          return;
        }
        setError(failure.message);
      })
      .finally(() => {
        if (current === request.current && selectedRef.current === selected)
          setLoading(false);
      });
    return () => {
      ++request.current;
    };
  }, [selected, reload]);

  useEffect(() => {
    if (recibo) reciboRef.current?.focus();
  }, [recibo]);

  /** Preview no persistente: renueva tokens y clave sin tocar el borrador. */
  async function openPreview() {
    setPreviewBusy(true);
    setConflict(null);
    setRecibo(null);
    setMotivoError("");
    setPreviewBloqueos([]);
    setStale(false);
    setRetried(false);
    try {
      const result = await api<Preview>(
        "/cierres/" + selected + "/validacion/preview",
      );
      setPreview(result);
      setPreviewBloqueos(result.bloqueos);
      setKey(crypto.randomUUID());
    } catch (e) {
      const failure = e as ApiError;
      setPreview(null);
      if (failure.status === 422 && failure.code === "VALIDATION") {
        // Los bloqueos son la razón del 422; se muestran como lista cerrada y
        // no se ofrece confirmar: el contrato no los deja salvar.
        setPreviewBloqueos(requisitosDe(failure));
        setConflict({
          code: failure.code,
          message: "La validación no puede confirmarse con estos bloqueos.",
          impactChanged: false,
          retryable: false,
          bloqueos: [],
        });
      } else if (
        failure.status === 503 &&
        failure.code === "VALIDACION_NO_DISPONIBLE"
      ) {
        setNoDisponible(true);
      } else {
        setError(failure.message);
      }
    } finally {
      setPreviewBusy(false);
    }
  }

  async function confirmar() {
    if (!preview) return;
    if (preview.requiereMotivo && !motivo.trim()) {
      setMotivoError("Indica el motivo de la validación.");
      return;
    }
    setBusy(true);
    setConflict(null);
    try {
      const result = await api<Recibo>(
        "/cierres/" +
          selected +
          (preview.operacion === "confirmar_revision"
            ? "/revision/confirmar"
            : "/validar"),
        "POST",
        {
          fingerprint: preview.fingerprint,
          contextRevision: preview.contextRevision,
          impactRevision: preview.impactRevision,
          ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
        },
        { "Idempotency-Key": key },
      );
      setRecibo(result);
      setPreview(null);
      setMotivo("");
      setConflict(null);
      setReload((value) => value + 1);
    } catch (e) {
      const failure = e as ApiError;
      if (failure.status === 409 && failure.code === "IMPACT_CHANGED") {
        // El borrador (motivo) se conserva: sólo hace falta un preview nuevo.
        setStale(true);
        setConflict({
          code: failure.code,
          message: failure.message,
          impactChanged: true,
          retryable: false,
          bloqueos: [],
        });
      } else if (failure.status === 409) {
        setPreview(null);
        setConflict({
          code: failure.code,
          message: failure.message,
          impactChanged: false,
          retryable: false,
          bloqueos: [],
        });
        setReload((value) => value + 1);
      } else if (failure.status === 422) {
        setPreview(null);
        setConflict({
          code: failure.code,
          message: failure.message,
          impactChanged: false,
          retryable: false,
          bloqueos: requisitosDe(failure),
        });
        setReload((value) => value + 1);
      } else if (
        failure.status === 503 &&
        failure.code === "VALIDACION_NO_DISPONIBLE"
      ) {
        setNoDisponible(true);
      } else {
        // Un 5xx o un corte de red no confirma ni rechaza la operación: la
        // clave de intento sigue vigente y repetirla reproduce el mismo recibo.
        setConflict({
          code: failure.code,
          message: failure.message,
          impactChanged: false,
          retryable: true,
          bloqueos: [],
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const validacion = data?.validacion ?? null;
  const cobertura = preview?.cobertura ?? validacion?.cobertura ?? [];
  const coberturaVista = cobertura; /** sin cobertura medida no se inventan fuentes */
  const accion = validacion ? ESTADO_LABEL[validacion.estado] : "";
  const accionBoton =
    validacion?.estado === "Validada"
      ? "Revalidar"
      : validacion?.estado === "Pendiente"
        ? "Confirmar revisión"
        : "Validar";

  const columns: TableColumn<Cobertura>[] = [
    {
      id: "fuente",
      header: "Fuente",
      cell: (row) => FUENTE_LABEL[row.fuente] ?? row.fuente,
    },
    {
      id: "cobertura",
      header: "Cobertura",
      kind: "status",
      cell: (row) => (
        <Badge
          tone={coberturaTone(row.estado)}
          kind="cobertura"
          estado={row.estado}
          label={coberturaLabel(row.estado)}
        />
      ),
    },
    {
      id: "causas",
      header: "Causas",
      cell: (row) =>
        row.causas.length ? row.causas.join(", ") : <span className="muted">—</span>,
    },
  ];

  return (
    <section className="cierre-page validacion-page">
      <PageHead
        eyebrow="SPEC38 · I2 · Cierre y validación"
        title="Validación del cierre"
        description="La validación no congela resultados ni crea fotos: registra una referencia humana del conjunto vigente con actor, instante y motivo."
      >
        <button
          className="secondary"
          type="button"
          onClick={() => setReload((value) => value + 1)}
        >
          Actualizar estado
        </button>
      </PageHead>

      <div className="notice" role="note">
        La vía fotográfica se retiró: cerrar, reabrir, re-cerrar, cancelar y las
        fotografías de cierre o periodo ya no existen. Lo que sigue disponible es
        esta lectura viva y el{" "}
        <button
          className="text-button"
          type="button"
          onClick={() => go("/precierre")}
        >
          precierre
        </button>{" "}
        de sólo lectura.
      </div>

      <div className="panel cierre-context" aria-label="Contexto de la validación">
        <label htmlFor="validacion-cycle">Ciclo</label>{" "}
        <select
          id="validacion-cycle"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          disabled={loading || !cycles.length}
        >
          <option value="">Elegir ciclo</option>
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.inicio}
            </option>
          ))}
        </select>
      </div>

      {catalogFailed && (
        <Alert retry={() => setReload((value) => value + 1)}>
          No se pudieron cargar los ciclos. {error}
        </Alert>
      )}

      {noDisponible && (
        <Alert retry={() => setReload((value) => value + 1)}>
          <strong>El estado de validación no está disponible.</strong> El
          contrato de validación del esquema falta o está incompleto, así que
          este ciclo no se presenta ni como validado ni como sin validar. No se
          pierde nada: la lectura se reintenta cuando el contrato esté íntegro.
        </Alert>
      )}

      {error && !catalogFailed && !noDisponible && (
        <Alert retry={() => setReload((value) => value + 1)}>{error}</Alert>
      )}
      {loading && <p role="status">Cargando estado de validación…</p>}

      {catalogLoaded &&
        !loading &&
        !cycles.length &&
        !catalogFailed &&
        !noDisponible && (
        <div className="panel" aria-label="Sin ciclos para validar">
          <h2>Sin ciclos para validar</h2>
          <p className="muted">
            No hay ningún ciclo en la base. No se crea un ciclo para poder
            validar.
          </p>
        </div>
      )}

      {!loading && validacion && data && (
        <>
          <div className="panel validacion-status" role="region" aria-label="Estado de validación">
            <h2>Estado de validación</h2>
            <dl className="shared-metrics cierre-metrics validacion-metrics">
              <div className="metric">
                <dt>Estado</dt>
                <dd>
                  <Badge
                    tone={estadoTone(validacion.estado)}
                    kind="estado"
                    estado={validacion.estado}
                    icon={estadoIcon(validacion.estado)}
                    label={ESTADO_LABEL[validacion.estado]}
                  />
                </dd>
                <small data-testid="validacion-estado">
                  {accion === "Validada"
                    ? "Referencia humana comparable del conjunto vigente."
                    : accion === "Pendiente"
                      ? "Un hecho material cambió después de la referencia; hace falta confirmar la revisión."
                      : "Todavía no hay referencia humana de este conjunto."}
                </small>
              </div>
              <div className="metric">
                <dt>Cobertura</dt>
                <dd>{data.cobertura}</dd>
                <small>
                  Lectura de precierre: {data.estado.toLowerCase()}.
                </small>
              </div>
              <div className="metric">
                <dt>Divergencia</dt>
                <dd>{DIVERGENCIA_LABEL[validacion.divergenciaValidacion]}</dd>
                <small>
                  Diagnóstico: no limpia ni marca una validación por sí solo.
                </small>
              </div>
              <div className="metric">
                <dt>Revisión</dt>
                <dd>{validacion.revision ?? "—"}</dd>
                <small>
                  Conjunto{" "}
                  {validacion.versionConjunto === null
                    ? "sin versión de referencia"
                    : "v" + validacion.versionConjunto}
                  .
                </small>
              </div>
            </dl>

            <p>
              Huella vigente:{" "}
              <code className="cierre-fingerprint" title={validacion.huellaVigente}>
                {validacion.huellaVigente.slice(0, 16)}…
              </code>
            </p>

            {validacion.estado === "Pendiente" && (
              <p>
                <strong>Pendiente desde</strong>{" "}
                {instante(validacion.dirtyDesde)}
                {validacion.dirtyUltimo &&
                  validacion.dirtyUltimo !== validacion.dirtyDesde && (
                    <> · último cambio {instante(validacion.dirtyUltimo)}</>
                  )}
                {validacion.motivos.length > 0 && (
                  <> · motivos {validacion.motivos.join(", ")}</>
                )}
              </p>
            )}
            {validacion.pendienteSinDelta && (
              <p className="muted">
                Sin divergencia actual: el conjunto vigente coincide con la
                referencia; la marca sigue pendiente de confirmación humana.
              </p>
            )}
            {validacion.revalidacionSugerida && (
              <p className="muted">
                Revalidación sugerida: el conjunto vigente no coincide con la
                referencia validada.
              </p>
            )}
            {validacion.ultimaRevision && (
              <p className="muted">
                Última referencia: {validacion.ultimaRevision.actor} ·{" "}
                {instante(validacion.ultimaRevision.instante)}
                {validacion.ultimaRevision.motivo
                  ? " · " + validacion.ultimaRevision.motivo
                  : ""}
              </p>
            )}

            <div className="actions">
              <button
                className="primary"
                type="button"
                onClick={openPreview}
                disabled={previewBusy || busy}
              >
                {accionBoton}
              </button>
              {validacion.estado === "Pendiente" && (
                <span className="muted">
                  Un ciclo pendiente se confirma, no se valida de nuevo.
                </span>
              )}
            </div>
          </div>

          <div className="panel" role="region" aria-label="Cobertura de la validación">
            <h2>Cobertura de la validación</h2>
            {coberturaVista.length ? (
              <>
                <div className="validacion-desktop">
                  <Table
                    caption="Cobertura de la validación por fuente"
                    label="Cobertura de la validación por fuente"
                    columns={columns}
                    rows={coberturaVista}
                    rowKey={(row) => row.fuente}
                  />
                </div>
                <DataList
                  className="validacion-cards"
                  label="Cobertura de la validación por fuente"
                  columns={columns}
                  rows={coberturaVista}
                  rowKey={(row) => row.fuente}
                />
              </>
            ) : (
              <p className="muted">
                Sin cobertura medida todavía: previsualiza la validación para
                leer la cobertura vigente. Una fuente ausente no se presenta
                como cero.
              </p>
            )}
          </div>

          {(previewBloqueos.length > 0 || data.bloqueos.length > 0) && (
            <div className="panel" role="region" aria-label="Bloqueos de la validación">
              <h2>Bloqueos de la validación</h2>
              <p>
                Mientras existan, el contrato no permite confirmar la validación:
                no se salvan ni al confirmar.
              </p>
              <ul>
                {(previewBloqueos.length ? previewBloqueos : data.bloqueos).map(
                  (block) => (
                    <li key={block.code}>
                      <strong>{block.code}</strong> — {block.message}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          {data.avisos.length > 0 && (
            <div className="panel" role="note" aria-label="Avisos de la validación">
              <h2>Avisos de la validación</h2>
              <p className="muted">
                Informativos: se declaran y no bloquean la validación.
              </p>
              <ul>
                {data.avisos.map((aviso) => (
                  <li key={aviso.code}>
                    <strong>{aviso.code}</strong> — {aviso.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview && (
            <div className="panel cierre-e49-confirm" role="region" aria-label="Vista previa de la validación">
              <h2>Vista previa: {OPERACION_LABEL[preview.operacion]}</h2>
              <p className="muted">
                Cálculo en memoria: la previsualización no escribe ni deja
                intento. Sólo se registra al confirmar.
              </p>
              <p>
                <strong>Materialidad:</strong>{" "}
                {preview.material === null
                  ? "no medible; hay componentes no disponibles y no se declara «sin impacto»"
                  : preview.material
                    ? "cambia al menos un ciclo"
                    : "sin cambios materiales en el conjunto"}
              </p>

              {preview.afectados.length > 0 && (
                <>
                  <h3>Ciclos afectados</h3>
                  <ul>
                    {preview.afectados.map((afectado) => (
                      <li key={afectado.ciclo}>
                        Ciclo {afectado.ciclo} · {afectado.rango.desde} →{" "}
                        {afectado.rango.hasta} ·{" "}
                        {afectado.motivos.length
                          ? afectado.motivos.join(", ")
                          : "sin motivo material"}
                        {afectado.noDisponible.length > 0 && (
                          <> · no disponible: {afectado.noDisponible.join(", ")}</>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="field">
                <label htmlFor="validacion-motivo">
                  Motivo de la validación
                </label>
                <textarea
                  id="validacion-motivo"
                  value={motivo}
                  aria-invalid={motivoError ? "true" : undefined}
                  aria-describedby={
                    motivoError
                      ? "validacion-motivo-ayuda validacion-motivo-error"
                      : "validacion-motivo-ayuda"
                  }
                  onChange={(event) => {
                    setMotivo(event.target.value);
                    if (motivoError) setMotivoError("");
                  }}
                />
                <p id="validacion-motivo-ayuda" className="help">
                  {preview.requiereMotivo
                    ? "Obligatorio: la cobertura o el impacto de esta operación lo exigen."
                    : "Opcional: si lo escribes, queda en la referencia humana y en la auditoría."}
                </p>
                {motivoError && (
                  <p
                    id="validacion-motivo-error"
                    className="field-error"
                    role="alert"
                  >
                    {motivoError}
                  </p>
                )}
              </div>

              <p className="muted">
                Clave de intento:{" "}
                <code data-testid="validacion-attempt-key" className="cierre-fingerprint">
                  {key}
                </code>
              </p>

              <div className="actions">
                <button
                  className="primary"
                  type="button"
                  onClick={confirmar}
                  disabled={busy || stale || previewBloqueos.length > 0}
                >
                  {preview.operacion === "confirmar_revision"
                    ? "Confirmar revisión"
                    : preview.operacion === "revalidar"
                      ? "Confirmar revalidación"
                      : "Confirmar validación"}
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setMotivoError("");
                    setConflict(null);
                  }}
                  disabled={busy}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {conflict && (
            <Alert>
              <p>
                {conflict.impactChanged && (
                  <strong>La previsualización ha cambiado. </strong>
                )}
                {conflict.message}
              </p>
              <p>
                Código: <code>{conflict.code}</code>
              </p>
              {conflict.bloqueos.length > 0 && (
                <ul>
                  {conflict.bloqueos.map((block) => (
                    <li key={block.code}>
                      <strong>{block.code}</strong> — {block.message}
                    </li>
                  ))}
                </ul>
              )}
              {conflict.retryable ? (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setRetried(true);
                    void confirmar();
                  }}
                  disabled={busy}
                >
                  Reintentar (misma clave)
                </button>
              ) : conflict.impactChanged ? (
                <button className="secondary" type="button" onClick={openPreview}>
                  Volver a previsualizar
                </button>
              ) : (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setReload((value) => value + 1)}
                >
                  Volver a leer el estado
                </button>
              )}
            </Alert>
          )}

          {recibo && (
            <div className="panel" role="region" aria-label="Recibo de la validación">
              <h2 tabIndex={-1} ref={reciboRef}>
                Validación registrada
              </h2>
              <p className="muted">
                Recibo de la operación, sin cifras: la referencia humana y su
                auditoría quedan escritas; no se congela ningún resultado.
              </p>
              {retried && (
                <p role="status">
                  Reintento idempotente: se conserva el mismo recibo.
                </p>
              )}
              <p>
                Operación: <code>{recibo.operacionId}</code>
              </p>
              <TableScroll label="Ciclos de la operación">
                <table className="table">
                  <caption className="sr-only">
                    Ciclos de la operación de validación
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Ciclo</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Revisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recibo.ciclos.map((ciclo) => (
                      <tr key={ciclo.id}>
                        <td data-label="Ciclo">{ciclo.id}</td>
                        <td data-label="Estado">
                          <Badge
                            tone={estadoTone(
                              ciclo.estado as EstadoValidacion["estado"],
                            )}
                            kind="estado"
                            estado={ciclo.estado}
                            label={
                              ESTADO_LABEL[ciclo.estado as EstadoValidacion["estado"]] ??
                              ciclo.estado
                            }
                          />
                        </td>
                        <td data-label="Revisión">{ciclo.revision}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
              {recibo.cierresDirty.length > 0 && (
                <p>
                  Ciclos que quedaron pendientes:{" "}
                  {recibo.cierresDirty.map((cierre) => cierre.ciclo).join(", ")}.
                </p>
              )}
              <div className="actions">
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setReload((value) => value + 1)}
                >
                  Volver a leer el estado
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}