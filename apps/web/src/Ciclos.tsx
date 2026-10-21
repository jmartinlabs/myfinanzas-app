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
