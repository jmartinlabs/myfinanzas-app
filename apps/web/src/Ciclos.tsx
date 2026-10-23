import { useEffect, useRef, useState } from "react";
import { api, ApiError, eur } from "./api";
import { Alert, PageHead, Tag } from "./ui";
export type Cycle = {
  id: string;
  inicio: string;
  mesFinanciado: string;
  saldoInicialComida: string;
  fin: string | null;
  estadoTemporal: string;
  corte: string | null;
  estadoCorte: string;
  revision: number;
};
type Context = {
  actual: Cycle | null;
  motivo: string;
  ultimoInicio: string | null;
  revision: string;
  referencia: {
    fecha: string | null;
    estado: string;
    coverage: { source: string; state: string }[];
  };
};
export const monthLabel = (value: string) =>
  new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value + "T00:00:00Z"));
const dateLabel = (value: string) => value.split("-").reverse().join("/");
function useContext(refreshKey: string | number) {
  const [context, setContext] = useState<Context | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setContext(null);
    setError("");
    api<Context>("/ciclos/contexto")
      .then((d) => {
        if (live) setContext(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [refreshKey, retry]);
  return { context, error, reload: () => setRetry((v) => v + 1) };
}
export function CycleHeader({ path }: { path: string }) {
  const { context, error, reload } = useContext(path);
  return (
    <div className="cycle-context" aria-live="polite">
      <span className="header-label">CICLO FINANCIADO</span>
      {error ? (
        <>
          <strong>Contexto no disponible</strong>
          <button className="text-button" onClick={reload}>
            Reintentar contexto
          </button>
        </>
      ) : !context ? (
        <strong>Cargando ciclo…</strong>
      ) : (
        <>
          <strong>
            {context.actual
              ? monthLabel(context.actual.mesFinanciado)
              : context.referencia.estado === "error"
                ? "Error de referencia"
                : context.motivo === "sin_ciclos"
                  ? "Sin ciclos"
                  : context.motivo === "sin_ciclo_actual"
                    ? "Sin ciclo actual"
                    : "No disponible"}
          </strong>
          <span className="cycle-help">
            Referencia financiera:{" "}
            {context.referencia.fecha
              ? dateLabel(context.referencia.fecha)
              : "No disponible"}
          </span>
        </>
      )}
    </div>
  );
}
export function Ciclos({
  path,
  go,
}: {
  path: string;
  go: (path: string) => void;
}) {
  if (path === "/ciclos/nuevo") return <CycleForm go={go} />;
  if (path === "/ciclos/omitido")
    return <CycleOperationForm key="omitido" go={go} />;
  const correction = path.match(/^\/ciclos\/(\d+)\/rectificar$/);
  if (correction)
    return (
      <CycleOperationForm key={correction[1]} id={correction[1]} go={go} />
    );
  const match = path.match(/^\/ciclos\/(\d+)$/);
  if (match) return <CycleDetail key={match[1]} id={match[1]} go={go} />;
  if (path === "/ciclos") return <CycleList go={go} />;
  return <Alert>Página no encontrada.</Alert>;
}
function ReferenceNote({ context }: { context: Context }) {
  return (
    <div className="context-note">
      <div>
        <strong>
          Referencia financiera:{" "}
          {context.referencia.fecha
            ? dateLabel(context.referencia.fecha)
            : "No disponible"}
        </strong>
        <p>
          {context.referencia.estado === "error"
            ? "No se puede obtener una referencia fiable: una fuente ha fallado."
            : context.referencia.coverage
                .filter((s) => s.state === "pendiente")
                .map((s) => s.source)
                .join(" · ") || "Fuentes disponibles"}
          {context.referencia.coverage.some((s) => s.state === "pendiente")
            ? " · pendientes"
            : ""}
        </p>
      </div>
    </div>
  );
}
function CycleList({ go }: { go: (p: string) => void }) {
  const [q, setQ] = useState(""),
    [state, setState] = useState(""),
    [page, setPage] = useState(1),
    [data, setData] = useState<{
      ciclos: Cycle[];
      total: number;
      contexto: Context;
    } | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    setData(null);
    api(
      "/ciclos?" +
        new URLSearchParams({ q, estado: state, page: String(page) }),
    )
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [q, state, page, retry]);
  const link = (cycle: Cycle) => (
    <a
      href={"/ciclos/" + cycle.id}
      onClick={(e) => {
        e.preventDefault();
        go("/ciclos/" + cycle.id);
      }}
    >
      {monthLabel(cycle.mesFinanciado)}
    </a>
  );
  return (
    <>
      <PageHead
        eyebrow="NÚCLEO FINANCIERO"
        title="Ciclos financiados"
        description="Periodos de financiación · maestro único, independiente de Nómina"
      >
        <button className="secondary" onClick={() => go("/ciclos/omitido")}>
          Registrar ciclo omitido
        </button>
        <button className="primary" onClick={() => go("/ciclos/nuevo")}>
          Nuevo ciclo
        </button>
      </PageHead>
      {data && <ReferenceNote context={data.contexto} />}
      <section
        className="panel catalog-panel cycles-list"
        aria-label="Catálogo de ciclos"
      >
        <div className="filters">
          <label className="search">
            Buscar por mes o Inicio
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Estado temporal
            <select
              aria-label="Estado temporal"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option>Abierto</option>
              <option>Con fin temporal</option>
            </select>
          </label>
        </div>
        <div className="list-toolbar">
          <p role="status">
            {loading
              ? "Cargando ciclos…"
              : error
                ? "Consulta no disponible"
                : `${data?.total ?? 0} ciclos`}
          </p>
          <span>Orden por Inicio · más reciente primero</span>
        </div>
        {error ? (
          <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>
        ) : loading ? (
          <p className="empty" aria-busy="true">
            Consultando el maestro…
          </p>
        ) : data?.ciclos.length === 0 ? (
          <div className="empty">
            <h2>
              {q || state ? "Sin coincidencias" : "Todavía no hay ciclos"}
            </h2>
            <p>
              {q || state
                ? "Ajusta la búsqueda o el estado temporal."
                : "Puedes crear un ciclo antes del cobro de Nómina."}
            </p>
            {(q || state) && (
              <button
                className="secondary"
                onClick={() => {
                  setQ("");
                  setState("");
                  setPage(1);
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="desktop-list">
              <table>
                <caption className="sr-only">Ciclos financiados</caption>
                <thead>
                  <tr>
                    <th scope="col">Mes financiado</th>
                    <th scope="col">Inicio ciclo</th>
                    <th scope="col">Fin ciclo</th>
                    <th scope="col">Estado temporal</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.ciclos.map((c) => (
                    <tr key={c.id}>
                      <td>{link(c)}</td>
                      <td>{dateLabel(c.inicio)}</td>
                      <td>
                        {c.fin ? dateLabel(c.fin) : "Sin siguiente Inicio"}
                      </td>
                      <td>
                        <Tag>{c.estadoTemporal}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mobile-list">
              {data?.ciclos.map((c) => (
                <li key={c.id}>
                  <div className="card-head">
                    <h2>{link(c)}</h2>
                    <Tag>{c.estadoTemporal}</Tag>
                  </div>
                  <p>Inicio: {dateLabel(c.inicio)}</p>
                  <p>
                    Fin: {c.fin ? dateLabel(c.fin) : "Sin siguiente Inicio"}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="list-footer">
          <span>Página {page}</span>
          <div className="actions">
            <button
              className="text-button"
              disabled={page <= 1 || loading || Boolean(error)}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              className="text-button"
              disabled={
                page * 100 >= (data?.total ?? 0) || loading || Boolean(error)
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
      <p className="page-foot">
        Fin temporal y cierre financiero son conceptos distintos. Aquí no se
        realizan cierres.
      </p>
    </>
  );
}
function CycleDetail({ id, go }: { id: string; go: (p: string) => void }) {
  const [data, setData] = useState<{ ciclo: Cycle; contexto: Context } | null>(
      null,
    ),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api("/ciclos/" + id)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id, retry]);
  const back = (
    <a
      className="back"
      href="/ciclos"
      onClick={(e) => {
        e.preventDefault();
        go("/ciclos");
      }}
    >
      Volver a Ciclos
    </a>
  );
  if (error)
    return (
      <>
        {back}
        <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>
      </>
    );
  if (!data) return <p role="status">Cargando ficha…</p>;
  const { ciclo: c, contexto } = data;
  const field = (label: string, value: string) => (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
  const cut =
    c.estadoCorte === "disponible"
      ? dateLabel(c.corte!)
      : c.estadoCorte === "no_aplicable"
        ? "Todavía no hay corte aplicable"
        : c.estadoCorte === "no_abierto"
          ? "No aplica: ciclo con fin temporal"
          : "No disponible";
  return (
    <>
      {back}
      <PageHead
        eyebrow="CICLO FINANCIADO"
        title={monthLabel(c.mesFinanciado)}
        description={`Ciclo #${c.id} · Identidad estable`}
      >
        <Tag>{c.estadoTemporal}</Tag>
        <button
          className="primary"
          onClick={() => go("/ciclos/" + id + "/rectificar")}
        >
          Rectificar ciclo
        </button>
      </PageHead>
      <ReferenceNote context={contexto} />
      <div className="detail-grid">
        <section className="panel">
          <h2>Apertura del ciclo</h2>
          <dl>
            {field("Inicio ciclo", dateLabel(c.inicio))}
            {field("Saldo inicial comida", eur(c.saldoInicialComida))}
            {field("Identidad técnica", c.id)}
          </dl>
          <p className="help">
            Saldo informado manualmente. No es un Movimiento ni una conciliación
            automática.
          </p>
        </section>
        <section className="panel">
          <h2>Periodo derivado</h2>
          <dl>
            {field("Mes financiado", dateLabel(c.mesFinanciado))}
            {field(
              "Fin ciclo",
              c.fin ? dateLabel(c.fin) : "Sin siguiente Inicio",
            )}
            {field("Estado temporal", c.estadoTemporal)}
            {field("Corte de abierto", cut)}
          </dl>
        </section>
      </div>
      <section className="panel classification-deps">
        <h2>Conciliación comida</h2>
        <p>No disponible · Revisión Comida pendiente</p>
      </section>
      <CycleHistory id={id} />
      <section className="panel classification-deps">
        <h2>Cierre financiero</h2>
        <p>Funcionalidad no disponible.</p>
        <p className="help">
          Un ciclo abierto puede no ser el actual. El ciclo actual se identifica
          mediante la referencia financiera, nunca por el reloj o el último
          ciclo creado.
        </p>
      </section>
    </>
  );
}
function preview(start: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  const day = new Date(start + "T00:00:00Z");
  if (
    !Number.isFinite(day.valueOf()) ||
    day.toISOString().slice(0, 10) !== start
  )
    return null;
  const [y, m] = start.split("-").map(Number),
    year = m === 12 ? y + 1 : y;
  if (year > 9999 || year < 1) return null;
  return {
    month: `${String(year).padStart(4, "0")}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`,
    previousFin: new Date(day.valueOf() - 86400000).toISOString().slice(0, 10),
  };
}
function CycleForm({ go }: { go: (p: string) => void }) {
  const { context, error: contextError, reload } = useContext("alta"),
    [inicio, setInicio] = useState(""),
    [saldo, setSaldo] = useState(""),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState(false);
  const attempt = useRef(crypto.randomUUID()),
    alertRef = useRef<HTMLDivElement>(null);
  const derived = preview(inicio);
  async function submit() {
    if (!context) return;
    setBusy(true);
    setError("");
    setFields({});
    try {
      const data = await api<{ ciclo: Cycle }>(
        "/ciclos",
        "POST",
        {
          inicio,
          saldoInicialComida: saldo.replace(",", "."),
          contextRevision: context.revision,
        },
        { "idempotency-key": attempt.current },
      );
      go("/ciclos/" + data.ciclo.id);
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      setFields(err.fields ?? {});
      setConflict(err.status === 409);
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="CICLOS FINANCIADOS"
        title="Nuevo ciclo financiado"
        description="Solo Inicio y Saldo inicial comida son entradas manuales."
      />
      {contextError && <Alert retry={reload}>{contextError}</Alert>}
      {error && (
        <div tabIndex={-1} ref={alertRef}>
          <Alert>
            {error}
            {conflict && (
              <p>
                Revisa el maestro; tus campos se conservan.
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    reload();
                    setConflict(false);
                  }}
                >
                  Actualizar contexto
                </button>
              </p>
            )}
          </Alert>
        </div>
      )}
      <form
        className="saldo-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <section className="panel">
          <h2>Apertura del ciclo</h2>
          <div className="form-grid">
            <label>
              Inicio ciclo *
              <input
                type="date"
                aria-label="Inicio ciclo *"
                value={inicio}
                aria-invalid={Boolean(fields.inicio)}
                aria-describedby={fields.inicio ? "error-inicio" : undefined}
                onChange={(e) => {
                  setInicio(e.target.value);
                  setFields((previous) => ({ ...previous, inicio: "" }));
                }}
              />
              {fields.inicio && (
                <span id="error-inicio" className="field-error">
                  {fields.inicio}
                </span>
              )}
            </label>
            <label>
              Saldo inicial comida (€) *
              <input
                type="text"
                inputMode="decimal"
                aria-label="Saldo inicial comida (€) *"
                value={saldo}
                aria-invalid={Boolean(fields.saldoInicialComida)}
                aria-describedby={
                  fields.saldoInicialComida ? "error-saldo" : undefined
                }
                onChange={(e) => {
                  setSaldo(e.target.value);
                  setFields((previous) => ({
                    ...previous,
                    saldoInicialComida: "",
                  }));
                }}
              />
              {fields.saldoInicialComida && (
                <span id="error-saldo" className="field-error">
                  {fields.saldoInicialComida}
                </span>
              )}
            </label>
          </div>
          <p className="help">
            Introduce el importe expresamente: cero y negativos son válidos. No
            se copia el cierre anterior.
          </p>
        </section>
        <section className="panel">
          <h2>Vista previa del periodo</h2>
          {!context ? (
            <p role="status">Cargando contexto…</p>
          ) : (
            <>
              <p>
                Último Inicio:{" "}
                <strong>
                  {context.ultimoInicio
                    ? dateLabel(context.ultimoInicio)
                    : "Todavía no hay ciclos"}
                </strong>
              </p>
              <div aria-live="polite">
                {derived && (
                  <p>
                    Inicio previsto: <strong>{dateLabel(inicio)}</strong>
                  </p>
                )}
                <p>
                  Mes financiado:{" "}
                  <strong>
                    {derived
                      ? monthLabel(derived.month)
                      : "Indica un Inicio válido"}
                  </strong>
                </p>
                {context.ultimoInicio && (
                  <p>
                    Fin temporal del anterior:{" "}
                    <strong>
                      {derived && inicio > context.ultimoInicio
                        ? dateLabel(derived.previousFin)
                        : "Pendiente de un Inicio posterior"}
                    </strong>
                  </p>
                )}
              </div>
              <p className="help">
                Un solo ciclo por mes y año financiados. Esta vista previa no
                guarda cambios ni realiza un cierre financiero.
              </p>
            </>
          )}
        </section>
        <div className="form-footer">
          <p className="muted">
            * Ambos campos son obligatorios. Sin importe ni fecha
            preseleccionados.
          </p>
          <div className="actions">
            <button
              className="secondary"
              type="button"
              onClick={() => go("/ciclos")}
            >
              Cancelar
            </button>
            <button
              className="primary"
              type="submit"
              disabled={busy || !context || Boolean(contextError) || conflict}
            >
              {busy ? "Creando…" : "Crear ciclo"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

type CycleAudit = {
  revision: number;
  accion: string;
  motivo: string;
  instante: string;
  actor: string;
  anterior: Cycle | null;
  posterior: Cycle;
};
function CycleHistory({ id }: { id: string }) {
  const [items, setItems] = useState<CycleAudit[] | null>(null),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setItems(null);
    setError("");
    api<{ items: CycleAudit[] }>("/ciclos/" + id + "/historial")
      .then((d) => {
        if (live) setItems(d.items);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id, reload]);
  return (
    <section className="panel cycle-history">
      <h2>Historial de rectificaciones</h2>
      {error ? (
        <Alert retry={() => setReload((n) => n + 1)}>{error}</Alert>
      ) : items === null ? (
        <p role="status">Cargando historial…</p>
      ) : !items.length ? (
        <p>Todavía no hay rectificaciones.</p>
      ) : (
        items.map((r) => (
          <article key={r.revision}>
            <h3>
              Revisión {r.revision} ·{" "}
              {r.accion === "omitido" ? "Ciclo omitido" : "Rectificación"}
            </h3>
            <p>Motivo: {r.motivo}</p>
            <p>
              {r.instante} · {r.actor}
            </p>
            <p>
              Inicio antes:{" "}
              {r.anterior ? dateLabel(r.anterior.inicio) : "No existía"} →
              después: {dateLabel(r.posterior.inicio)}
            </p>
            <p>
              Saldo comida antes:{" "}
              {r.anterior ? eur(r.anterior.saldoInicialComida) : "No existía"} →
              después: {eur(r.posterior.saldoInicialComida)}
            </p>
          </article>
        ))
      )}
    </section>
  );
}
type CycleImpact = {
  operation: string;
  id: string | null;
  before: Cycle | null;
  after: Cycle;
  contextRevision: string;
  impactRevision: string;
  ciclos: { antes: Cycle | null; despues: Cycle }[];
  movimientos: {
    id: string;
    fecha: string;
    tipo: string;
    vigencia: string;
    antes: Cycle | null;
    despues: Cycle | null;
  }[];
  totalMovimientos: number;
  page: number;
  contextoAntes: Context;
  contextoDespues: Context;
};
function CycleOperationForm({
  id,
  go,
}: {
  id?: string;
  go: (p: string) => void;
}) {
  const [inicio, setInicio] = useState(""),
    [saldo, setSaldo] = useState(""),
    [motivo, setMotivo] = useState(""),
    [revision, setRevision] = useState(1),
    [loading, setLoading] = useState(Boolean(id)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [fields, setFields] = useState<Record<string, string>>({}),
    [impact, setImpact] = useState<CycleImpact | null>(null);
  const initialized = useRef(false),
    attempt = useRef(crypto.randomUUID()),
    errorRef = useRef<HTMLDivElement>(null),
    reviewRef = useRef<HTMLDivElement>(null);
  const endpoint = id ? "/ciclos/" + id + "/rectificar" : "/ciclos/omitido";
  useEffect(() => {
    if (!id) return;
    let live = true;
    setLoading(true);
    setError("");
    api<{ ciclo: Cycle }>("/ciclos/" + id)
      .then((d) => {
        if (live) {
          if (!initialized.current) {
            setInicio(d.ciclo.inicio);
            setSaldo(d.ciclo.saldoInicialComida);
            initialized.current = true;
          }
          setRevision(d.ciclo.revision);
          setImpact(null);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [id, retry]);
  const payload = () => ({
    inicio,
    saldoInicialComida: saldo.replace(",", "."),
    motivo,
    ...(id ? { revision } : {}),
  });
  const fail = (e: unknown) => {
    const err = e as ApiError;
    setError(err.message);
    setFields(err.fields ?? {});
    if (err.status === 409) setImpact(null);
    requestAnimationFrame(() => errorRef.current?.focus());
  };
  async function review(page = 1) {
    setBusy(true);
    setError("");
    setFields({});
    try {
      setImpact(
        await api<CycleImpact>(
          endpoint + "/preview?page=" + page,
          "POST",
          payload(),
        ),
      );
      requestAnimationFrame(() => reviewRef.current?.focus());
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!impact) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ ciclo: Cycle }>(
        endpoint,
        "POST",
        {
          ...payload(),
          contextRevision: impact.contextRevision,
          impactRevision: impact.impactRevision,
          confirmado: true,
        },
        { "idempotency-key": attempt.current },
      );
      go("/ciclos/" + result.ciclo.id);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  const change =
    (set: (s: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      set(e.target.value);
      setImpact(null);
      attempt.current = crypto.randomUUID();
    };
  const interval = (c: Cycle | null) =>
    c
      ? `${dateLabel(c.inicio)} — ${c.fin ? dateLabel(c.fin) : "Sin siguiente Inicio"}`
      : "No existía";
  const cycleName = (c: Cycle | null) =>
    c
      ? `${c.id === "nuevo" ? "Nuevo" : c.id} · ${monthLabel(c.mesFinanciado)}`
      : "Sin ciclo asignable";
  const reference = (c: Context) =>
    `${c.referencia.fecha ? dateLabel(c.referencia.fecha) : "No disponible"} · ${c.actual ? monthLabel(c.actual.mesFinanciado) : "Sin ciclo actual"}`;
  return (
    <>
      <PageHead
        eyebrow="CICLOS FINANCIADOS"
        title={id ? "Rectificar ciclo" : "Registrar ciclo omitido"}
        description="Revisión de impacto antes de confirmar; conserva los hechos originales."
      />
      {error && (
        <div tabIndex={-1} ref={errorRef}>
          <Alert>
            {error}
            {id && !loading && (
              <button
                type="button"
                className="secondary"
                onClick={() => setRetry((n) => n + 1)}
              >
                Recargar ciclo
              </button>
            )}
          </Alert>
        </div>
      )}
      {loading ? (
        <p role="status">Cargando ciclo…</p>
      ) : (
        <form
          className="saldo-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            review();
          }}
        >
          <section className="panel">
            <h2>Entradas manuales</h2>
            <div className="form-grid">
              <label>
                Inicio ciclo *
                <input
                  type="date"
                  aria-label="Inicio ciclo *"
                  value={inicio}
                  onChange={change(setInicio)}
                  aria-invalid={Boolean(fields.inicio)}
                />
                {fields.inicio && (
                  <span className="field-error">{fields.inicio}</span>
                )}
              </label>
              <label>
                Saldo inicial comida (€) *
                <input
                  aria-label="Saldo inicial comida (€) *"
                  inputMode="decimal"
                  value={saldo}
                  onChange={change(setSaldo)}
                  aria-invalid={Boolean(fields.saldoInicialComida)}
                />
                {fields.saldoInicialComida && (
                  <span className="field-error">
                    {fields.saldoInicialComida}
                  </span>
                )}
              </label>
            </div>
            <label>
              Motivo *
              <textarea
                aria-label="Motivo *"
                value={motivo}
                onChange={change(setMotivo)}
                maxLength={1000}
              />
            </label>
            <p className="help">
              Importe manual explícito: cero y negativos válidos. No se copia un
              cierre ni se modifica la apertura del siguiente ciclo.
            </p>
          </section>
          {impact && (
            <section
              className="panel cycle-impact"
              role="region"
              aria-label="Revisión de impacto de Ciclos"
              tabIndex={-1}
              ref={reviewRef}
            >
              <h2>Revisar {id ? "rectificación" : "ciclo omitido"}</h2>
              <div className="impact-pair">
                <p>
                  <strong>Inicio antes:</strong>{" "}
                  {impact.before
                    ? dateLabel(impact.before.inicio)
                    : "No existía"}
                </p>
                <p>
                  <strong>Inicio después:</strong>{" "}
                  {dateLabel(impact.after.inicio)}
                </p>
                <p>
                  <strong>Saldo comida antes:</strong>{" "}
                  {impact.before
                    ? eur(impact.before.saldoInicialComida)
                    : "No existía"}
                </p>
                <p>
                  <strong>Saldo comida después:</strong>{" "}
                  {eur(impact.after.saldoInicialComida)}
                </p>
              </div>
              <h3>Periodos afectados</h3>
              {impact.ciclos.map((c, i) => (
                <article key={i}>
                  <p>
                    <strong>{cycleName(c.despues)}</strong>
                  </p>
                  <p>Mes financiado antes: {c.antes ? monthLabel(c.antes.mesFinanciado) : "No existía"}</p>
                  <p>Mes financiado después: {c.despues ? monthLabel(c.despues.mesFinanciado) : "No existía"}</p>
                  <p>Antes: {interval(c.antes)}</p>
                  <p>Después: {interval(c.despues)}</p>
                </article>
              ))}
              <p>
                Referencia / ciclo actual antes:{" "}
                {reference(impact.contextoAntes)}
              </p>
              <p>
                Referencia / ciclo actual después:{" "}
                {reference(impact.contextoDespues)}
              </p>
              <h3>Hechos afectados: {impact.totalMovimientos}</h3>
              {impact.movimientos.length === 0 ? (
                <p>No hay hechos que cambien de ciclo.</p>
              ) : (
                <ul className="cycle-facts">
                  {impact.movimientos.map((m) => (
                    <li key={m.id}>
                      <strong>
                        #{m.id} · {dateLabel(m.fecha)} · {m.tipo} · {m.vigencia}
                      </strong>
                      <p>
                        Antes: {cycleName(m.antes)} · {interval(m.antes)}
                      </p>
                      <p>
                        Después: {cycleName(m.despues)} · {interval(m.despues)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || impact.page <= 1}
                  onClick={() => review(impact.page - 1)}
                >
                  Anterior detalle
                </button>
                <span>Página {impact.page}</span>
                <button
                  type="button"
                  className="secondary"
                  disabled={
                    busy || impact.page * 100 >= impact.totalMovimientos
                  }
                  onClick={() => review(impact.page + 1)}
                >
                  Siguiente detalle
                </button>
              </div>
              <p>
                Movimientos comprobado. Revisión Comida / operaciones de
                inversión pendientes.
              </p>
              <p>
                Conciliación comida: No disponible · Revisión Comida pendiente.
              </p>
              <p className="help">
                No se alteran fechas, importes ni identidades de los hechos. Fin
                temporal no es cierre financiero.
              </p>
            </section>
          )}
          <div className="form-footer">
            <p className="muted">* Campos obligatorios</p>
            <div className="actions">
              <button
                className="secondary"
                type="button"
                onClick={() =>
                  impact
                    ? setImpact(null)
                    : go(id ? "/ciclos/" + id : "/ciclos")
                }
              >
                {impact ? "Volver al borrador" : "Cancelar"}
              </button>
              {!impact ? (
                <button className="primary" type="submit" disabled={busy}>
                  {busy ? "Revisando…" : "Revisar impacto"}
                </button>
              ) : (
                <button
                  className="primary"
                  type="button"
                  disabled={busy}
                  onClick={confirm}
                >
                  {busy
                    ? "Confirmando…"
                    : id
                      ? "Confirmar rectificación"
                      : "Confirmar ciclo omitido"}
                </button>
              )}
            </div>
          </div>
        </form>
      )}
    </>
  );
}
