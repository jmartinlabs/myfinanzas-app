import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import { Alert, PageHead, Tag } from "./ui";
type Budget = {
  id: string;
  nombre: string;
  fuente: string;
  destino: string | null;
  estado: "Activo" | "Inactivo";
  revision: number;
  saldoDestino: { id: string; nombre: string; estado: string } | null;
};
type Options = {
  saldos: { id: string; nombre: string; estado: string }[];
  presupuestos: Budget[];
};
type Plan = {
  old: Budget;
  value: { nombre: string; fuente: string; destino: string | null };
  blocked: boolean;
  coverage: string;
  pending: string[];
  fingerprint: string;
  partidas: { id: string; nombre: string }[];
  usos: {
    id: string;
    fecha: string;
    tipo: string;
    anulado: number;
    partida: string;
  }[];
};
const base = "/presupuestos",
  sources = ["Gasto real", "Aportación a saldo", "No aplica"];
function Link({
  to,
  go,
  children,
}: {
  to: string;
  go: (p: string) => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        go(to);
      }}
    >
      {children}
    </a>
  );
}
export function Presupuestos({
  path,
  go,
}: {
  path: string;
  go: (p: string) => void;
}) {
  const match = path.match(/^\/presupuestos\/(PRE\d+)(?:\/(editar))?$/);
  if (path === base) return <List go={go} />;
  if (path === base + "/nuevo") return <Form key={path} go={go} />;
  if (match)
    return match[2] ? (
      <Form key={path} id={match[1]} go={go} />
    ) : (
      <Detail key={path} id={match[1]} go={go} />
    );
  return <Alert>Página no encontrada.</Alert>;
}
function List({ go }: { go: (p: string) => void }) {
  const [filters, setFilters] = useState({
      q: "",
      fuente: "",
      destino: "",
      estado: "Activo",
    }),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0),
    [data, setData] = useState<{ items: Budget[]; total: number } | null>(null),
    [options, setOptions] = useState<Options | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    Promise.all([
      api(base + "?" + new URLSearchParams({ ...filters, page: String(page) })),
      api(base + "/opciones"),
    ])
      .then(([d, o]) => {
        if (live) {
          setData(d);
          setOptions(o);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [filters, page, retry]);
  const update = (key: keyof typeof filters, value: string) => {
    setFilters((v) => ({ ...v, [key]: value }));
    setPage(1);
  };
  const destination = (b: Budget) =>
    b.saldoDestino
      ? `${b.saldoDestino.id} · ${b.saldoDestino.nombre} · ${b.saldoDestino.estado}`
      : "Sin destino · No aplica";
  return (
    <>
      <PageHead
        eyebrow="CONFIGURACIÓN DEL PLAN"
        title="Presupuestos"
        description="Fuentes y relaciones; la planificación mensual llegará en E2.3"
      >
        <button className="primary" onClick={() => go(base + "/nuevo")}>
          Nuevo presupuesto
        </button>
      </PageHead>
      <section className="panel catalog-panel budget-list">
        <div className="filters budget-filters">
          <label>
            Buscar nombre o ID
            <input
              type="search"
              value={filters.q}
              onChange={(e) => update("q", e.target.value)}
            />
          </label>
          <label>
            Fuente
            <select
              aria-label="Fuente"
              value={filters.fuente}
              onChange={(e) => update("fuente", e.target.value)}
            >
              <option value="">Todas</option>
              {sources.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Saldo destino
            <select
              aria-label="Saldo destino"
              value={filters.destino}
              onChange={(e) => update("destino", e.target.value)}
            >
              <option value="">Todos</option>
              {options?.saldos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} · {s.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado de Presupuesto
            <select
              aria-label="Estado de Presupuesto"
              value={filters.estado}
              onChange={(e) => update("estado", e.target.value)}
            >
              <option>Activo</option>
              <option>Inactivo</option>
              <option value="">Todos</option>
            </select>
          </label>
        </div>
        <p className="help">
          Destino único entre Aportaciones a saldo. Compartir con Gasto real no
          crea una reserva exclusiva.
        </p>
        {error ? (
          <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>
        ) : !data ? (
          <p role="status">Cargando Presupuestos…</p>
        ) : !data.items.length ? (
          <div className="empty">
            <h2>Sin presupuestos que mostrar</h2>
            <p>
              Configura una fuente y sus relaciones, sin crear un plan ni
              Movimientos.
            </p>
            {(filters.q ||
              filters.fuente ||
              filters.destino ||
              filters.estado !== "Activo") && (
              <button
                className="secondary"
                onClick={() => {
                  setFilters({
                    q: "",
                    fuente: "",
                    destino: "",
                    estado: "Activo",
                  });
                  setPage(1);
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <p role="status">{data.total} presupuestos</p>
            <div className="desktop-list">
              <table>
                <caption className="sr-only">Presupuestos</caption>
                <thead>
                  <tr>
                    <th>Nombre / ID</th>
                    <th>Fuente</th>
                    <th>Saldo destino</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link to={base + "/" + b.id} go={go}>
                          {b.nombre}
                        </Link>
                        <small className="table-id">{b.id}</small>
                      </td>
                      <td>{b.fuente}</td>
                      <td>{destination(b)}</td>
                      <td>
                        <Tag inactive={b.estado === "Inactivo"}>{b.estado}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mobile-list">
              {data.items.map((b) => (
                <li key={b.id}>
                  <div className="card-head">
                    <span>{b.id}</span>
                    <Tag inactive={b.estado === "Inactivo"}>{b.estado}</Tag>
                  </div>
                  <h2>
                    <Link to={base + "/" + b.id} go={go}>
                      {b.nombre}
                    </Link>
                  </h2>
                  <p>Fuente: {b.fuente}</p>
                  <p>Destino: {destination(b)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="list-footer">
          <span>Página {page}</span>
          <div className="actions">
            <button
              disabled={page === 1 || !data}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              disabled={!data || page * 100 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
function Detail({ id, go }: { id: string; go: (p: string) => void }) {
  const [data, setData] = useState<{
      item: Budget;
      partidas: {
        id: string;
        nombre: string;
        estado: string;
        deuda: string | null;
      }[];
      usos: unknown[];
    } | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    setError("");
    api(base + "/" + id)
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
  async function state() {
    setBusy(true);
    setError("");
    try {
      const d = await api(
        base +
          "/" +
          id +
          (data!.item.estado === "Activo" ? "/desactivar" : "/reactivar"),
        "POST",
        { revision: data!.item.revision },
      );
      setData((v) => ({ ...v!, item: d.item }));
      setConfirm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return error ? (
      <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>
    ) : (
      <p role="status">Cargando Presupuesto…</p>
    );
  const b = data.item;
  return (
    <>
      <Link to={base} go={go}>
        Volver a Presupuestos
      </Link>
      <PageHead
        eyebrow={b.id}
        title={b.nombre}
        description="Maestro e identificación estable"
      >
        <button
          className="secondary"
          onClick={() => go(base + "/" + id + "/editar")}
        >
          Editar presupuesto
        </button>
      </PageHead>
      {error && <Alert>{error}</Alert>}
      <section className="panel">
        <h2>Configuración</h2>
        <dl>
          <dt>Fuente</dt>
          <dd>{b.fuente}</dd>
          <dt>Saldo destino</dt>
          <dd>
            {b.saldoDestino ? (
              <Link to={"/saldos/" + b.saldoDestino.id} go={go}>
                {b.saldoDestino.id} · {b.saldoDestino.nombre} ·{" "}
                {b.saldoDestino.estado}
              </Link>
            ) : (
              "Vacío · No aplica"
            )}
          </dd>
          <dt>Estado</dt>
          <dd>
            <Tag inactive={b.estado === "Inactivo"}>{b.estado}</Tag>
          </dd>
        </dl>
        <p className="help">
          Gasto real se imputa por Partida, no por el banco de origen. El
          destino no constituye una reserva exclusiva.
        </p>
        <p>
          Ejecución mensual: pendiente de E2.3. No se calculan importes ni
          estados del plan.
        </p>
      </section>
      <section className="panel">
        <h2>Partidas vinculadas</h2>
        {data.partidas.length ? (
          <ul>
            {data.partidas.map((p) => (
              <li key={p.id}>
                <Link to={"/clasificacion/partidas/" + p.id} go={go}>
                  {p.id} · {p.nombre}
                </Link>{" "}
                · {p.estado}
                {p.deuda && ` · Deuda ${p.deuda}`}
              </li>
            ))}
          </ul>
        ) : (
          <p>Sin Partidas vinculadas.</p>
        )}
        <p>
          Hechos relacionados: {data.usos.length}. Su detalle no sustituye el
          motor presupuestario pendiente.
        </p>
      </section>
      <section className="panel">
        <h2>Estado e historia</h2>
        <p>
          Los nombres e IDs se conservan al desactivar. No se desvinculan
          Partidas ni se borran hechos.
        </p>
        {confirm ? (
          <div className="confirm-panel">
            <p>
              ¿Confirmas {b.estado === "Activo" ? "desactivar" : "reactivar"}{" "}
              este Presupuesto?
            </p>
            <div className="actions">
              <button className="secondary" onClick={() => setConfirm(false)}>
                Cancelar
              </button>
              <button className="primary" disabled={busy} onClick={state}>
                Confirmar estado
              </button>
            </div>
          </div>
        ) : (
          <button className="secondary" onClick={() => setConfirm(true)}>
            {b.estado === "Activo" ? "Desactivar" : "Reactivar"} presupuesto
          </button>
        )}
      </section>
    </>
  );
}
function Form({ id, go }: { id?: string; go: (p: string) => void }) {
  const [old, setOld] = useState<Budget | null>(null),
    [options, setOptions] = useState<Options | null>(null),
    [value, setValue] = useState({ nombre: "", fuente: "", destino: "" }),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [retry, setRetry] = useState(0),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [plan, setPlan] = useState<Plan | null>(null),
    [reason, setReason] = useState(""),
    [conflict, setConflict] = useState(false);
  const attempt = useRef(crypto.randomUUID()),
    errorRef = useRef<HTMLDivElement>(null),
    reviewRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setLoadError("");
    Promise.all([
      api(base + "/opciones"),
      id ? api(base + "/" + id) : Promise.resolve(null),
    ])
      .then(([o, d]) => {
        if (live) {
          setOptions(o);
          if (d) {
            setOld(d.item);
            setValue({
              nombre: d.item.nombre,
              fuente: d.item.fuente,
              destino: d.item.destino ?? "",
            });
          }
        }
      })
      .catch((e) => {
        if (live) setLoadError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [id, retry]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (plan) reviewRef.current?.focus();
  }, [plan]);
  const change = (key: keyof typeof value, v: string) => {
    setValue((x) => ({ ...x, [key]: v }));
    setPlan(null);
    setFields({});
  };
  const destinations =
    options?.saldos.filter(
      (s) =>
        s.estado === "Activa" ||
        (s.id === old?.destino && value.fuente === old?.fuente),
    ) ?? [];
  const body = () => ({
    ...value,
    destino: value.destino || null,
    ...(old ? { revision: old.revision } : {}),
  });
  function failure(e: unknown) {
    setError((e as Error).message);
    if (e instanceof ApiError) setFields(e.fields ?? {});
    setConflict(e instanceof ApiError && e.status === 409 && !!id);
  }
  // Refresh only the stored revision; the user's draft stays in the form.
  async function refresh() {
    setBusy(true);
    try {
      const d = await api(base + "/" + id);
      setOld(d.item);
      setError("");
      setConflict(false);
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});
    setBusy(true);
    try {
      if (
        old &&
        (value.fuente !== old.fuente || (value.destino || null) !== old.destino)
      ) {
        const p = await api(base + "/" + id + "/impacto", "POST", body());
        setPlan(p);
      } else {
        const d = await api(
          base + (id ? "/" + id : ""),
          id ? "PATCH" : "POST",
          body(),
          { "idempotency-key": attempt.current },
        );
        go(base + "/" + d.item.id);
      }
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const d = await api(base + "/" + id + "/rectificar", "POST", {
        cambios: body(),
        fingerprint: plan!.fingerprint,
        motivo: reason,
      });
      go(base + "/" + d.item.id);
    } catch (e) {
      failure(e);
      if (e instanceof ApiError && e.status === 409) setPlan(null);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p role="status">Cargando formulario de Presupuesto…</p>;
  if (loadError)
    return <Alert retry={() => setRetry((v) => v + 1)}>{loadError}</Alert>;
  return (
    <>
      <Link to={id ? base + "/" + id : base} go={go}>
        Cancelar y volver
      </Link>
      <PageHead
        eyebrow={id ?? "NUEVO MAESTRO"}
        title={id ? "Editar presupuesto" : "Nuevo presupuesto"}
        description="Configura su fuente sin crear un plan mensual"
      />
      {error && (
        <div tabIndex={-1} ref={errorRef}>
          <Alert>
            {error}
            {conflict && (
              <button className="secondary" disabled={busy} onClick={refresh}>
                Actualizar contexto
              </button>
            )}
          </Alert>
        </div>
      )}
      {!plan ? (
        <form onSubmit={save}>
          <section className="panel">
            <h2>Identidad</h2>
            <p>ID: {id ?? "Se asignará al guardar"}</p>
            <label>
              Nombre *
              <input
                value={value.nombre}
                onChange={(e) => change("nombre", e.target.value)}
                aria-invalid={!!fields.nombre}
                aria-describedby={
                  fields.nombre ? "budget-name-error" : undefined
                }
              />
            </label>
            {fields.nombre && (
              <p className="field-error" id="budget-name-error">
                {fields.nombre}
              </p>
            )}
            <p className="help">
              Único, incluidos inactivos; se conservan tildes y espacios. * y ?
              son literales.
            </p>
          </section>
          <section className="panel">
            <h2>Configuración económica</h2>
            <label>
              Fuente ejecutado *
              <select
                aria-label="Fuente ejecutado *"
                value={value.fuente}
                onChange={(e) => change("fuente", e.target.value)}
                aria-invalid={!!fields.fuente}
              >
                <option value="">Elegir fuente</option>
                {sources.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {fields.fuente && <p className="field-error">{fields.fuente}</p>}
            <label>
              Saldo destino
              {value.fuente !== "No aplica" ? " *" : " · debe estar vacío"}
              <select
                aria-label={
                  value.fuente !== "No aplica"
                    ? "Saldo destino *"
                    : "Saldo destino · debe estar vacío"
                }
                value={value.destino}
                disabled={value.fuente === "No aplica"}
                onChange={(e) => change("destino", e.target.value)}
                aria-invalid={!!fields.destino}
              >
                <option value="">Sin destino</option>
                {destinations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.nombre} · {s.estado}
                  </option>
                ))}
                {/* Never clear a stale destination silently: show it as invalid. */}
                {value.destino &&
                  !destinations.some((s) => s.id === value.destino) && (
                    <option value={value.destino} disabled>
                      {value.destino} · no válido para esta fuente
                    </option>
                  )}
              </select>
            </label>
            {value.fuente === "No aplica" && value.destino && (
              <button
                className="secondary"
                type="button"
                onClick={() => change("destino", "")}
              >
                Vaciar destino expresamente
              </button>
            )}
            {fields.destino && <p className="field-error">{fields.destino}</p>}
            <p className="help">
              Gasto real y Aportación requieren destino interno. No aplica exige
              vacío; no se limpia silenciosamente. Dos Aportaciones no comparten
              destino.
            </p>
          </section>
          <section className="panel">
            <h2>Estado y cobertura</h2>
            <p>
              {old?.estado ?? "Activo al crear"}. Planificación, importes y
              ejecución mensual pendientes de E2.3.
            </p>
            <div className="actions">
              <button
                className="secondary"
                type="button"
                onClick={() => go(id ? base + "/" + id : base)}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy}>
                {busy
                  ? "Guardando…"
                  : old
                    ? "Guardar / Revisar cambio"
                    : "Guardar presupuesto"}
              </button>
            </div>
          </section>
        </form>
      ) : (
        <section className="panel budget-review" tabIndex={-1} ref={reviewRef}>
          <h2>Revisar cambio económico</h2>
          <div className="comparison">
            <div>
              <h3>Antes</h3>
              <p>{plan.old.fuente}</p>
              <p>Destino: {plan.old.destino ?? "Vacío"}</p>
            </div>
            <div>
              <h3>Después</h3>
              <p>{plan.value.fuente}</p>
              <p>Destino: {plan.value.destino ?? "Vacío"}</p>
            </div>
          </div>
          <p>{plan.coverage}</p>
          <h3>Partidas relacionadas</h3>
          {plan.partidas.length ? (
            <ul>
              {plan.partidas.map((p) => (
                <li key={p.id}>
                  {p.id} · {p.nombre}
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin Partidas vinculadas.</p>
          )}
          <h3>Hechos afectados</h3>
          {plan.usos.length ? (
            <ul>
              {plan.usos.map((u) => (
                <li key={u.id}>
                  {u.id} · {u.fecha} · {u.tipo} · Partida {u.partida}
                  {u.anulado ? " · Anulado" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin hechos registrados para estas relaciones.</p>
          )}
          {plan.blocked ? (
            <Alert>
              Cambio bloqueado hasta disponer de {plan.pending.join(", ")}.
              Enumerar hechos no verifica el impacto completo.
            </Alert>
          ) : (
            <label>
              Motivo del cambio
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          )}
          <div className="actions">
            <button className="secondary" onClick={() => setPlan(null)}>
              Volver al borrador
            </button>
            <button
              className="primary"
              disabled={plan.blocked || busy}
              onClick={confirm}
            >
              Confirmar cambio
            </button>
          </div>
        </section>
      )}
    </>
  );
}
