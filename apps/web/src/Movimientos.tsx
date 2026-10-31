import type { Anticipo } from "./Anticipos";
import type { Debt } from "./Deudas";
import type { Reference } from "./Referencias";
import {
  referenceReturn,
  preserveMovement,
  clearMovementReturn,
} from "./movement-draft";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, eur, type Saldo } from "./api";
import { Alert, PageHead, Tag } from "./ui";
import { monthLabel, type Cycle } from "./Ciclos";
type Related = { id: string; nombre: string; estado?: string };
type Partida = Related & {
  deuda: string | null;
  seleccionable: boolean;
  referenciaObligatoria: boolean | null;
  tipoReferencia: string | null;
  referenciaDisponible: boolean;
  categoria: Related;
  subcategoria: Related;
};
type Movement = {
  anticipo: {
    rol: string;
    origen: string;
    destino: string;
    evidencia: string;
    procedencia: string;
  } | null;
  id: string;
  fecha: string;
  tipo: string;
  importe: string;
  capital: string | null;
  intereses: string | null;
  deuda: Debt | null;
  origen: Related;
  destino: Related;
  subtipo: string | null;
  partida: Partida | null;
  referencia: Reference | null;
  concepto: string;
  nota: string;
  anulado: boolean;
  estado: string;
  revision: number;
  ciclo: Cycle | null;
};
type Options = {
  deudas: Debt[];
  referencias: Reference[];
  hoy: string;
  saldos: Saldo[];
  partidas: Partida[];
  categorias: Related[];
  subcategorias: (Related & { padre: string })[];
  ciclos: Cycle[];
};
type Plan = {
  contextRevision: string;
  fingerprint: string;
  accion: string;
  antes: Movement | null;
  despues: Record<string, any> | null;
  duplicados: {
    id: string;
    fecha: string;
    tipo: string;
    importe: string;
    concepto: string;
  }[];
  impacto: {
    anticipo?: {
      referencia: string;
      rol: string;
      origen: string;
      destino: string;
      pendientePar: string | null;
      aviso: string | null;
    } | null;
    nomina?: { paga: string; importe: string; evidencia: string }[];
    deudas: {
      id: string;
      nombre: string;
      antes: string | null;
      despues: string | null;
    }[];
    gastoAntes: string;
    gastoDespues: string;
    saldos: {
      id: string;
      nombre: string;
      control: string;
      antes: string | null;
      despues: string | null;
      motivo: string;
    }[];
    cicloAntes: Cycle | null;
    cicloDespues: Cycle | null;
    referenciaAntes: string | null;
    referenciaDespues: string | null;
    cobertura: string;
    pendientes: string[];
  };
};
type Audit = {
  revision: number;
  accion: string;
  motivo: string | null;
  instante: string;
  anterior: Record<string, any> | null;
  posterior: Record<string, any>;
};
type Detail = { movimiento: Movement; auditoria: Audit[] };
const base = "/movimientos";
const date = (v: string) => v.split("-").reverse().join("/");
const cycle = (v: Cycle | null) =>
  v ? monthLabel(v.mesFinanciado) : "Sin ciclo asignable";
const amount = (v: string | null) => (v === null ? "No disponible" : eur(v));
function Link({
  to,
  go,
  children,
}: {
  to: string;
  go: (p: string) => void;
  children: ReactNode;
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
function useOptions() {
  const [options, setOptions] = useState<Options | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setError("");
    api<Options>(base + "/opciones")
      .then((d) => {
        if (live) setOptions(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [retry]);
  return { options, error, reload: () => setRetry((v) => v + 1) };
}
export function Movimientos({
  path,
  go,
}: {
  path: string;
  go: (p: string) => void;
}) {
  if (path.split("?")[0] === base)
    return (
      <MovementList
        key={path}
        initialDebt={new URLSearchParams(path.split("?")[1]).get("deuda") ?? ""}
        initialReference={
          new URLSearchParams(path.split("?")[1]).get("referencia") ?? ""
        }
        go={go}
      />
    );
  if (path.split("?")[0] === base + "/nuevo")
    return (
      <MovementForm
        key="nuevo"
        go={go}
        initialReference={
          new URLSearchParams(path.split("?")[1]).get("referencia") ?? ""
        }
        initialType={
          new URLSearchParams(path.split("?")[1]).get("tipo") ?? ""
        }
      />
    );
  const m = path.match(/^\/movimientos\/(\d+)(?:\/(rectificar|anular))?$/);
  if (m)
    return m[2] ? (
      <MovementForm key={path} id={m[1]} annul={m[2] === "anular"} go={go} />
    ) : (
      <MovementDetail key={path} id={m[1]} go={go} />
    );
  return <Alert>Página no encontrada.</Alert>;
}
function MovementList({
  go,
  initialDebt,
  initialReference,
}: {
  go: (p: string) => void;
  initialReference: string;
  initialDebt: string;
}) {
  const { options, error: optionError, reload: reloadOptions } = useOptions();
  const [filters, setFilters] = useState({
      q: "",
      referencia: initialReference,
      deuda: initialDebt,
      origen: "",
      destino: "",
      tipo: "",
      ciclo: "",
      estado: "Vigente",
      desde: "",
      hasta: "",
      saldo: "",
      categoria: "",
      subcategoria: "",
      partida: "",
    }),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0),
    [data, setData] = useState<{
      movimientos: Movement[];
      total: number;
    } | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setData(null);
    setError("");
    api(base + "?" + new URLSearchParams({ ...filters, page: String(page) }))
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
  }, [filters, page, retry]);
  const change = (key: string, value: string) => {
    setPage(1);
    setFilters((v) => ({
      ...v,
      [key]: value,
      ...(key === "categoria"
        ? { subcategoria: "", partida: "" }
        : key === "subcategoria"
          ? { partida: "" }
          : {}),
    }));
  };
  const select = (
    label: string,
    key: keyof typeof filters,
    items: { id: string; nombre: string }[],
  ) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={filters[key]}
        onChange={(e) => change(key, e.target.value)}
      >
        <option value="">Todos</option>
        {items.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nombre}
          </option>
        ))}
      </select>
    </label>
  );
  const activeFilters = Object.entries(filters).some(([k, v]) =>
    k === "estado" ? v !== "Vigente" : !!v,
  );
  const cellLink = (m: Movement) => (
    <Link to={base + "/" + m.id} go={go}>
      {m.concepto || "Movimiento #" + m.id}
    </Link>
  );
  return (
    <>
      <PageHead
        eyebrow="NÚCLEO FINANCIERO"
        title="Movimientos"
        description="Hechos ejecutados · Ingresos, Gastos, Transferencias, amortizaciones y devoluciones de gasto"
      >
        <button className="primary" onClick={() => go(base + "/nuevo")}>
          Nuevo movimiento
        </button>
      </PageHead>
      <p className="page-foot">
        Transferencias con Exterior: no disponibles todavía. Las inversiones
        tienen su propio registro.
      </p>
      {optionError && <Alert retry={reloadOptions}>{optionError}</Alert>}
      <section
        className="panel catalog-panel movements-list"
        aria-label="Registro de Movimientos"
      >
        <div className="filters">
          <label>
            Buscar Concepto, Nota o ID
            <input
              type="search"
              value={filters.q}
              onChange={(e) => change("q", e.target.value)}
            />
          </label>
          {select("Tipo", "tipo", [
            { id: "Ingreso", nombre: "Ingreso" },
            { id: "Gasto", nombre: "Gasto" },
            { id: "Transferencia", nombre: "Transferencia" },
            { id: "Amortización deuda", nombre: "Amortización deuda" },
          ])}
          {select("Deuda", "deuda", options?.deudas ?? [])}
          {select("Ciclo financiado", "ciclo", [
            { id: "sin_ciclo", nombre: "Sin ciclo asignable" },
            ...(options?.ciclos ?? []).map((c) => ({
              id: c.id,
              nombre: monthLabel(c.mesFinanciado),
            })),
          ])}
          <label>
            Estado
            <select
              aria-label="Estado de Movimiento"
              value={filters.estado}
              onChange={(e) => change("estado", e.target.value)}
            >
              <option>Vigente</option>
              <option>Anulado</option>
              <option value="">Todos</option>
            </select>
          </label>
        </div>
        <details className="movement-filters">
          <summary>Más filtros</summary>
          <div className="form-grid">
            <label>
              Desde
              <input
                type="date"
                value={filters.desde}
                onChange={(e) => change("desde", e.target.value)}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={filters.hasta}
                onChange={(e) => change("hasta", e.target.value)}
              />
            </label>
            {select(
              "Saldo",
              "saldo",
              (options?.saldos ?? []).map((s) => ({
                id: s.id,
                nombre: s.id + " · " + s.nombre,
              })),
            )}
            {select(
              "Referencia",
              "referencia",
              (options?.referencias ?? []).map((r) => ({
                id: r.id,
                nombre: r.id + " · " + r.nombre + " · " + r.tipo,
              })),
            )}
            {select("Origen", "origen", options?.saldos ?? [])}
            {select("Destino", "destino", options?.saldos ?? [])}
            {select("Categoría", "categoria", options?.categorias ?? [])}
            {select(
              "Subcategoría",
              "subcategoria",
              (options?.subcategorias ?? []).filter(
                (s) => !filters.categoria || s.padre === filters.categoria,
              ),
            )}
            {select(
              "Partida",
              "partida",
              (options?.partidas ?? []).filter(
                (p) =>
                  (!filters.categoria ||
                    p.categoria.id === filters.categoria) &&
                  (!filters.subcategoria ||
                    p.subcategoria.id === filters.subcategoria),
              ),
            )}
          </div>
        </details>
        <div className="list-toolbar">
          <p role="status">
            {loading
              ? "Cargando Movimientos…"
              : error
                ? "Consulta no disponible"
                : `${data?.total ?? 0} movimientos`}
          </p>
          <span>Fecha · más reciente primero</span>
        </div>
        {error ? (
          <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>
        ) : loading ? (
          <p className="empty" aria-busy="true">
            Consultando el registro…
          </p>
        ) : !data?.movimientos.length ? (
          <div className="empty">
            <h2>
              {activeFilters
                ? "Sin coincidencias"
                : "Todavía no hay movimientos"}
            </h2>
            <p>
              {activeFilters
                ? "Ajusta los filtros de consulta."
                : "Registra un hecho ejecutado con datos ficticios."}
            </p>
            {activeFilters && (
              <button
                className="secondary"
                onClick={() => {
                  setFilters({
                    q: "",
                    referencia: "",
                    deuda: "",
                    origen: "",
                    destino: "",
                    tipo: "",
                    ciclo: "",
                    estado: "Vigente",
                    desde: "",
                    hasta: "",
                    saldo: "",
                    categoria: "",
                    subcategoria: "",
                    partida: "",
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
            <div className="desktop-list">
              <table>
                <caption className="sr-only">
                  Ingresos, Gastos y Transferencias
                </caption>
                <thead>
                  <tr>
                    {[
                      "Fecha",
                      "Tipo / Subtipo",
                      "Concepto",
                      "Saldo",
                      "Partida",
                      "Importe",
                    ].map((h) => (
                      <th scope="col" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.movimientos.map((m) => (
                    <tr key={m.id} className={m.anulado ? "annulled" : ""}>
                      <td>
                        {date(m.fecha)}
                        {m.anulado && <Tag inactive>Anulado</Tag>}
                      </td>
                      <td>
                        {m.tipo}
                        <small className="table-id">{m.subtipo ?? ""}</small>
                      </td>
                      <td>
                        {cellLink(m)}
                        <small className="table-id">#{m.id}</small>
                      </td>
                      <td>
                        {m.tipo === "Transferencia"
                          ? m.origen.nombre + " → " + m.destino.nombre
                          : (m.tipo === "Ingreso" || m.tipo === "Devolución de gasto"
                              ? m.destino
                              : m.origen)
                              .nombre}
                      </td>
                      <td>
                        {m.partida?.nombre ?? "No aplica"}
                        {m.referencia && (
                          <small className="table-id">
                            {m.referencia.nombre} · {m.referencia.id}
                          </small>
                        )}
                      </td>
                      <td className="money">{eur(m.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mobile-list">
              {data.movimientos.map((m) => (
                <li key={m.id}>
                  <div className="card-head">
                    <span>{date(m.fecha)}</span>
                    <Tag inactive={m.anulado}>
                      {m.anulado ? "Anulado · " : ""}
                      {m.tipo}
                    </Tag>
                  </div>
                  <h2>{cellLink(m)}</h2>
                  <p>
                    #{m.id} ·{" "}
                    {m.tipo === "Transferencia"
                      ? m.origen.nombre + " → " + m.destino.nombre
                      : (m.tipo === "Ingreso" || m.tipo === "Devolución de gasto"
                          ? m.destino
                          : m.origen
                        ).nombre}
                  </p>
                  <p>{m.subtipo ?? m.partida?.nombre}</p>
                  {m.referencia && (
                    <p className="help">
                      {m.referencia.id} · {m.referencia.nombre}
                    </p>
                  )}
                  <div className="card-position">
                    <strong>{eur(m.importe)}</strong>
                    <small>
                      {cycle(m.ciclo)}
                      {m.anulado ? " · No computa" : ""}
                    </small>
                  </div>
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
              disabled={page <= 1 || loading || !!error}
              onClick={() => setPage((v) => v - 1)}
            >
              Anterior
            </button>
            <button
              className="text-button"
              disabled={page * 100 >= (data?.total ?? 0) || loading || !!error}
              onClick={() => setPage((v) => v + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
      <p className="page-foot">
        Los anulados se conservan para consulta y no computan. Los filtros no
        modifican la posición general de Saldos.
      </p>
    </>
  );
}
function MovementDetail({ id, go }: { id: string; go: (p: string) => void }) {
  const [data, setData] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api<Detail>(base + "/" + id)
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
  useEffect(() => {
    if (data)
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("h1")?.focus(),
      );
  }, [data]);
  const back = (
    <Link to={base} go={go}>
      Volver a Movimientos
    </Link>
  );
  if (error)
    return (
      <>
        {back}
        <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>
      </>
    );
  if (!data) return <p role="status">Cargando Movimiento…</p>;
  const m = data.movimiento,
    field = (label: string, v: ReactNode) => (
      <div>
        <dt>{label}</dt>
        <dd>{v}</dd>
      </div>
    );
  return (
    <div className="movement-detail">
      {back}
      <PageHead
        eyebrow={"MOVIMIENTO #" + m.id}
        title={m.concepto || m.tipo + " #" + m.id}
        description={m.tipo + (m.subtipo ? " · " + m.subtipo : "")}
      >
        <Tag inactive={m.anulado}>{m.estado}</Tag>
        {!m.anulado && (
          <>
            <button
              className="secondary"
              onClick={() => go(base + "/" + id + "/rectificar")}
            >
              Rectificar
            </button>
            <button
              className="secondary"
              onClick={() => go(base + "/" + id + "/anular")}
            >
              Anular
            </button>
          </>
        )}
      </PageHead>
      {m.anulado && (
        <div className="context-note">
          <p>
            Registro anulado: se conserva, pero no computa económicamente. No
            representa una devolución bancaria.
          </p>
        </div>
      )}
      <div className="detail-grid">
        <section className="panel">
          <h2>Hecho registrado</h2>
          <dl>
            {field("ID estable", m.id)}
            {field("Fecha económica", date(m.fecha))}
            {field("Importe", eur(m.importe))}
            {field("Nota", m.nota || "Sin informar")}
          </dl>
        </section>
        <section className="panel">
          <h2>Relaciones financieras</h2>
          <dl>
            {field(
              "Origen",
              <Link to={"/saldos/" + m.origen.id} go={go}>
                {m.origen.id + " · " + m.origen.nombre}
              </Link>,
            )}
            {field(
              "Destino",
              <Link to={"/saldos/" + m.destino.id} go={go}>
                {m.destino.id + " · " + m.destino.nombre}
              </Link>,
            )}
            {field(
              "Partida",
              m.partida ? (
                <Link to={"/clasificacion/partidas/" + m.partida.id} go={go}>
                  {m.partida.id + " · " + m.partida.nombre}
                </Link>
              ) : (
                "No aplica"
              ),
            )}
            {field(
              "Subcategoría",
              m.partida?.subcategoria.nombre ?? "No aplica",
            )}
            {field("Categoría", m.partida?.categoria.nombre ?? "No aplica")}
            {field(
              "Deuda",
              m.deuda ? (
                <Link to={"/deudas/" + m.deuda.id} go={go}>
                  {m.deuda.id + " · " + m.deuda.nombre}
                </Link>
              ) : (
                "No aplica"
              ),
            )}
            {field("Capital amortizado", amount(m.capital))}
            {field("Intereses", amount(m.intereses))}
            {field(
              "Referencia",
              m.referencia ? (
                <Link to={"/referencias/" + m.referencia.id} go={go}>
                  {m.referencia.id +
                    " · " +
                    m.referencia.nombre +
                    " · " +
                    m.referencia.tipo +
                    (m.referencia.estado === "Inactiva" ? " · Inactiva" : "")}
                </Link>
              ) : (
                "Sin referencia"
              ),
            )}
          </dl>
        </section>
      </div>
      <section className="panel">
        <h2>Imputación temporal</h2>
        <dl>
          {field(
            "Ciclo financiado",
            m.ciclo ? (
              <Link to={"/ciclos/" + m.ciclo.id} go={go}>
                {cycle(m.ciclo)}
              </Link>
            ) : (
              cycle(null)
            ),
          )}
          {field("Revisión", m.revision)}
        </dl>
        <p className="help">
          Fin temporal no equivale a cierre financiero. Los cierres se
          entregarán posteriormente.
        </p>
      </section>
      <section className="panel">
        <details>
          <summary>Historial de cambios · {data.auditoria.length}</summary>
          {data.auditoria.map((a) => (
            <article className="movement-audit" key={a.revision}>
              <h3>
                {a.accion} · revisión {a.revision}
              </h3>
              <p>
                {new Intl.DateTimeFormat("es-ES", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Europe/Madrid",
                }).format(new Date(a.instante))}{" "}
                · {a.motivo ?? "Alta de hecho ejecutado"}
              </p>
              <Facts before={a.anterior} after={a.posterior} />
            </article>
          ))}
        </details>
      </section>
    </div>
  );
}
function fact(value: Record<string, any> | null, key: string) {
  if (!value) return "No existía";
  const v = value[key];
  if (["importe", "capital", "intereses"].includes(key))
    return v == null ? "No aplica / sin informar" : eur(v);
  if (key === "fecha") return date(v);
  if (key === "anulado") return v ? "Anulado" : "Vigente";
  if (v && typeof v === "object") return v.id + " · " + v.nombre;
  return v || "No aplica / sin informar";
}
function Facts({
  before,
  after,
}: {
  before: Record<string, any> | null;
  after: Record<string, any> | null;
}) {
  const result = after ?? (before ? { ...before, anulado: true } : null);
  const keys = [
    ["tipo", "Tipo"],
    ["fecha", "Fecha"],
    ["importe", "Importe"],
    ["capital", "Capital amortizado"],
    ["intereses", "Intereses"],
    ["origen", "Origen"],
    ["destino", "Destino"],
    ["subtipo", "Subtipo"],
    ["partida", "Partida"],
    ["referencia", "Referencia"],
    ["concepto", "Concepto"],
    ["nota", "Nota"],
    ["anulado", "Estado"],
  ];
  const value = (v: Record<string, any> | null, key: string) => {
    const n = v?.[key];
    return key === "anulado"
      ? !!n
      : typeof n === "object" && n !== null
        ? n.id
        : (n ?? null);
  };
  const changed = keys.filter(
    ([key]) =>
      (!before || value(before, key) !== value(result, key)) &&
      !(
        result?.tipo === "Transferencia" &&
        !before &&
        ["subtipo", "partida"].includes(key)
      ),
  );
  return changed.length ? (
    <dl className="movement-facts">
      {changed.map(([key, label]) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>
            <span>Antes: {fact(before, key)}</span>
            <span>Después: {fact(result, key)}</span>
          </dd>
        </div>
      ))}
    </dl>
  ) : (
    <p>Los datos económicos no cambian.</p>
  );
}
function Impact({ plan }: { plan: Plan }) {
  return (
    <section
      className="panel movement-impact"
      aria-label="Vista previa de impacto"
    >
      <h2 tabIndex={-1}>Impacto económico</h2>
      <Facts before={plan.antes} after={plan.despues} />
      {!!plan.impacto.nomina?.length && (
        <Alert>
          Este hecho tiene asignaciones salariales:{" "}
          {plan.impacto.nomina
            .map((a) => `${a.paga}: ${amount(a.importe)}`)
            .join(", ")}
          . La corrección requiere revisar esas asociaciones en Nómina; no se
          trasladan automáticamente.
        </Alert>
      )}
      {plan.impacto.deudas.map((d) => (
        <p key={d.id}>
          Capital {d.id} · {d.nombre}: {amount(d.antes)} → {amount(d.despues)}
        </p>
      ))}
      <p>
        Gasto íntegro: {amount(plan.impacto.gastoAntes)} →{" "}
        {amount(plan.impacto.gastoDespues)}. La amortización extraordinaria no
        ejecuta Gasto.
      </p>
      {plan.impacto.saldos.map((s) => (
        <div className="context-note" key={s.id}>
          <p>
            <strong>
              {s.id} · {s.nombre}
            </strong>
            <br />
            Posición: {amount(s.antes)} → {amount(s.despues)}
            <br />
            <small>{s.motivo}</small>
          </p>
        </div>
      ))}
      <p>
        {plan.accion === "anulación" ? (
          <>
            Ciclo histórico: {cycle(plan.impacto.cicloAntes)}. El registro se
            conserva y dejará de computar.
          </>
        ) : (
          <>
            Ciclo: {cycle(plan.impacto.cicloAntes)} →{" "}
            {cycle(plan.impacto.cicloDespues)}
          </>
        )}
      </p>
      <p>
        Referencia financiera:{" "}
        {plan.impacto.referenciaAntes
          ? date(plan.impacto.referenciaAntes)
          : "No disponible"}{" "}
        →{" "}
        {plan.impacto.referenciaDespues
          ? date(plan.impacto.referenciaDespues)
          : "No disponible"}
      </p>
      {plan.impacto.anticipo && (
        <div className="panel">
          <h3>Anticipo · rol y orientación declarados</h3>
          <p>
            {plan.impacto.anticipo.referencia} · {plan.impacto.anticipo.rol} ·{" "}
            {plan.impacto.anticipo.origen} → {plan.impacto.anticipo.destino}
          </p>
          <p>Pendiente del par: {amount(plan.impacto.anticipo.pendientePar)}</p>
          {plan.impacto.anticipo.aviso && (
            <p role="alert">{plan.impacto.anticipo.aviso}</p>
          )}
        </div>
      )}
      <p className="help">
        {plan.impacto.cobertura} Pendientes:{" "}
        {plan.impacto.pendientes.join(", ")}. No se afirma comprobación de
        cierres todavía inexistentes.
      </p>
    </section>
  );
}
const empty = {
  rolAnticipo: "",
  parAnticipo: "",
  evidenciaAnticipo: "",
  procedenciaAnticipo: "",
  capital: "",
  intereses: "",
  tipo: "",
  fecha: "",
  importe: "",
  saldo: "",
  origen: "",
  destino: "",
  referencia: "",
  subtipo: "",
  partida: "",
  concepto: "",
  nota: "",
};
function MovementForm({
  id,
  annul = false,
  go,
  initialReference = "",
  initialType = "",
}: {
  id?: string;
  annul?: boolean;
  go: (p: string) => void;
  initialReference?: string;
  initialType?: string;
}) {
  const { options, error: optionsError, reload } = useOptions();
  const returnDraft =
    referenceReturn?.path ===
    (id ? base + "/" + id + "/rectificar" : base + "/nuevo")
      ? referenceReturn
      : null;
  const [old, setOld] = useState<Movement | null>(null),
    [form, setForm] = useState(
      returnDraft
        ? { ...empty, ...returnDraft.form }
        : {
            ...empty,
            ...(initialReference ? { referencia: initialReference } : {}),
            ...(initialType ? { tipo: initialType } : {}),
          },
    ),
    [reason, setReason] = useState(returnDraft?.reason ?? ""),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [plan, setPlan] = useState<Plan | null>(null),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState(false),
    [refresh, setRefresh] = useState(0);
  const initialized = useRef(!!returnDraft),
    attempt = useRef(crypto.randomUUID()),
    alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (returnDraft) clearMovementReturn();
  }, []);
  useEffect(() => {
    if (!id) return;
    let live = true;
    api<Detail>(base + "/" + id)
      .then((d) => {
        if (!live) return;
        setOld(d.movimiento);
        if (!initialized.current) {
          const m = d.movimiento;
          setForm({
            rolAnticipo: m.anticipo?.rol ?? "",
            parAnticipo: m.anticipo
              ? m.anticipo.origen + ">" + m.anticipo.destino
              : "",
            evidenciaAnticipo: m.anticipo?.evidencia ?? "",
            procedenciaAnticipo: m.anticipo?.procedencia ?? "",
            capital: m.capital ?? "",
            intereses: m.intereses ?? "",
            tipo: m.tipo,
            fecha: m.fecha,
            importe: m.importe,
            saldo:
              (m.tipo === "Ingreso" || m.tipo === "Devolución de gasto"
                ? m.destino
                : m.origen
              ).id,
            origen: m.tipo === "Transferencia" ? m.origen.id : "",
            destino: m.tipo === "Transferencia" ? m.destino.id : "",
            referencia: m.referencia?.id ?? "",
            subtipo: m.subtipo ?? "",
            partida: m.partida?.id ?? "",
            concepto: m.concepto,
            nota: m.nota,
          });
          initialized.current = true;
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id, refresh]);
  const change = (key: keyof typeof empty, value: string) => {
    setForm((v) => ({
      ...v,
      [key]: value,
      ...(key === "tipo"
        ? { subtipo: "", partida: "", capital: "", intereses: "" }
        : {}),
      ...(key === "partida" ? { capital: "", intereses: "" } : {}),
    }));
    setPlan(null);
    setFields((v) => ({ ...v, [key]: "" }));
    setError("");
    attempt.current = crypto.randomUUID();
  };
  useEffect(() => {
    if (plan)
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(".movement-impact h2")?.focus(),
      );
  }, [plan]);
  const selected = options?.partidas.find((p) => p.id === form.partida),
    saldo = options?.saldos.find((s) => s.id === form.saldo);
  const selectedCycle =
    options?.ciclos.find(
      (c) => c.inicio <= form.fecha && (c.fin === null || form.fecha <= c.fin),
    ) ?? null;
  const [caseData, setCaseData] = useState<Anticipo | null>(null),
    [caseError, setCaseError] = useState("");
  const isAnticipo =
    form.tipo === "Transferencia" &&
    options?.referencias.some(
      (r) => r.id === form.referencia && r.tipo === "Anticipo",
    );
  useEffect(() => {
    let live = true;
    setCaseData(null);
    setCaseError("");
    if (isAnticipo)
      api<Anticipo>("/anticipos/fichas/" + form.referencia)
        .then((r) => {
          if (live) setCaseData(r);
        })
        .catch((e) => {
          if (live) setCaseError(e.message);
        });
    return () => {
      live = false;
    };
  }, [isAnticipo, form.referencia, refresh]);
  function body() {
    const {
      rolAnticipo,
      parAnticipo,
      evidenciaAnticipo,
      procedenciaAnticipo,
      ...bankForm
    } = form;
    const selectedPair = caseData?.pares.find(
      (p) => p.origen + ">" + p.destino === parAnticipo,
    );
    return {
      ...(annul
        ? {}
        : {
            ...bankForm,
            ...(isAnticipo
              ? {
                  anticipo: {
                    rol: rolAnticipo,
                    origen:
                      rolAnticipo === "Adelanto"
                        ? form.origen
                        : (selectedPair?.origen ?? ""),
                    destino:
                      rolAnticipo === "Adelanto"
                        ? form.destino
                        : (selectedPair?.destino ?? ""),
                    evidencia: evidenciaAnticipo,
                    procedencia: procedenciaAnticipo,
                  },
                }
              : {}),
            capital:
              form.tipo === "Gasto" && selected?.deuda
                ? form.capital.replace(",", ".")
                : null,
            intereses:
              form.tipo === "Gasto" && selected?.deuda
                ? form.intereses.replace(",", ".")
                : null,
            saldo: form.tipo === "Transferencia" ? null : form.saldo,
            origen: form.tipo === "Transferencia" ? form.origen : null,
            destino: form.tipo === "Transferencia" ? form.destino : null,
            referencia: form.referencia || null,
            importe: form.importe.replace(",", "."),
            subtipo: form.tipo === "Ingreso" ? form.subtipo : null,
            partida:
              form.tipo === "Gasto" ||
              form.tipo === "Amortización deuda" ||
              form.tipo === "Devolución de gasto"
                ? form.partida || null
                : null,
          }),
      ...(id ? { revision: old?.revision, motivo: reason } : {}),
    };
  }
  function fail(e: unknown) {
    const err = e as ApiError;
    setError(err.message);
    setFields(err.fields ?? {});
    if (err.status === 409) {
      setConflict(true);
      setPlan(null);
    }
    requestAnimationFrame(() => alert.current?.focus());
  }
  async function confirm(p: Plan) {
    const endpoint = id
      ? base + "/" + id + (annul ? "/anular" : "/rectificar")
      : base;
    const result = await api<Detail>(
      endpoint,
      "POST",
      {
        ...body(),
        fingerprint: p.fingerprint,
        contextRevision: p.contextRevision,
        aceptarCoincidencia: p.duplicados.length > 0,
      },
      { "idempotency-key": attempt.current },
    );
    go(base + "/" + result.movimiento.id);
  }
  async function submit() {
    setBusy(true);
    setError("");
    setFields({});
    try {
      if (
        !annul &&
        form.tipo === "Transferencia" &&
        options &&
        form.fecha > options.hoy
      )
        throw new ApiError(422, "No se admiten fechas futuras (España).", {
          fecha: "Fecha máxima: " + date(options.hoy) + " (España).",
        });
      if (plan) {
        await confirm(plan);
        return;
      }
      const endpoint = id
        ? base + "/" + id + (annul ? "/impacto-anulacion" : "/impacto")
        : base + "/impacto";
      const p = await api<Plan>(endpoint, "POST", body());
      setPlan(p);
      if (
        !id &&
        !p.duplicados.length &&
        form.tipo !== "Transferencia" &&
        !selected?.deuda
      )
        await confirm(p);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  const field = (
    key: keyof typeof empty,
    label: string,
    children?: ReactNode,
  ) => (
    <label key={key}>
      {label}
      {children ?? (
        <input
          aria-label={label}
          type={key === "fecha" ? "date" : "text"}
          inputMode={key === "importe" ? "decimal" : undefined}
          max={key === "fecha" ? options?.hoy : undefined}
          value={form[key]}
          aria-invalid={!!fields[key]}
          aria-describedby={fields[key] ? "error-mov-" + key : undefined}
          onChange={(e) => change(key, e.target.value)}
        />
      )}
      {fields[key] && (
        <span id={"error-mov-" + key} className="field-error">
          {fields[key]}
        </span>
      )}
    </label>
  );
  const saldos = (options?.saldos ?? []).filter(
    (s) =>
      (s.estado === "Activa" || (s.id === form.saldo && !!id)) &&
      s.control !== "Manual" &&
      s.control !== "Exterior",
  );
  const partidas = (options?.partidas ?? []).filter(
    (p) => p.seleccionable || (p.id === form.partida && !!id),
  );
  const requiredRef =
    !annul &&
    (form.tipo === "Gasto" || form.tipo === "Amortización deuda") &&
    selected?.referenciaObligatoria === true &&
    selected?.referenciaDisponible === false;
  const button = plan
    ? id
      ? annul
        ? "Confirmar anulación"
        : "Confirmar rectificación"
      : plan.duplicados.length
        ? "Registrar otro hecho real"
        : form.tipo === "Transferencia"
          ? "Confirmar transferencia"
          : selected?.deuda
            ? "Confirmar pago de deuda"
            : "Reintentar registro"
    : id
      ? "Revisar impacto"
      : form.tipo === "Transferencia"
        ? "Revisar transferencia"
        : "Registrar movimiento";
  return (
    <>
      <Link to={base} go={go}>
        Volver a Movimientos
      </Link>
      <PageHead
        eyebrow={id ? "MOVIMIENTO #" + id : "HECHO EJECUTADO"}
        title={
          id
            ? annul
              ? "Anular movimiento"
              : "Rectificar movimiento"
            : "Nuevo movimiento"
        }
        description={
          annul
            ? "Anula una captura errónea que no representa un hecho económico real. No es una devolución."
            : "Ingreso, Gasto, Transferencia interna, Amortización deuda o Devolución de gasto"
        }
      />
      {optionsError && <Alert retry={reload}>{optionsError}</Alert>}
      {error && (
        <div tabIndex={-1} ref={alert}>
          <Alert>
            {error}
            {conflict && (
              <p>
                Tus campos se conservan. Revisa el contexto antes de confirmar.
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    reload();
                    setRefresh((v) => v + 1);
                    setConflict(false);
                    attempt.current = crypto.randomUUID();
                  }}
                >
                  Actualizar contexto
                </button>
              </p>
            )}
          </Alert>
        </div>
      )}
      {id && !old ? (
        <p role="status">Cargando Movimiento…</p>
      ) : old?.anulado ? (
        <Alert>
          Este Movimiento está anulado y se conserva como histórico.
        </Alert>
      ) : (
        <form
          className="saldo-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {!annul ? (
            <>
              <section className="panel">
                <h2>Hecho ejecutado</h2>
                <div className="form-grid">
                  {field(
                    "tipo",
                    "Tipo *",
                    <select
                      aria-label="Tipo *"
                      value={form.tipo}
                      aria-invalid={!!fields.tipo}
                      aria-describedby={
                        fields.tipo ? "error-mov-tipo" : undefined
                      }
                      onChange={(e) => change("tipo", e.target.value)}
                    >
                      <option value="">Selecciona</option>
                      <option>Ingreso</option>
                      <option>Gasto</option>
                      <option>Transferencia</option>
                      <option>Amortización deuda</option>
                      <option>Devolución de gasto</option>
                    </select>,
                  )}
                  {field("fecha", "Fecha económica *")}
                  {field("importe", "Importe (€) *")}
                  {field("concepto", "Concepto")}
                  <label className="full-width">
                    Nota
                    <textarea
                      aria-label="Nota"
                      value={form.nota}
                      maxLength={4000}
                      onChange={(e) => change("nota", e.target.value)}
                    />
                  </label>
                </div>
                <p className="help">
                  Importe mayor que cero. Fecha máxima:{" "}
                  {options ? date(options.hoy) + " (España)" : "Cargando…"}.
                  Cambiar Tipo elimina campos incompatibles, sin convertir el
                  hecho.
                </p>
              </section>
              <section className="panel">
                <h2>Relación financiera</h2>
                <div className="form-grid">
                  {form.tipo === "Transferencia" ? (
                    (["origen", "destino"] as const).map((side) =>
                      field(
                        side,
                        side === "origen"
                          ? "Saldo origen *"
                          : "Saldo destino *",
                        <select
                          aria-label={
                            side === "origen"
                              ? "Saldo origen *"
                              : "Saldo destino *"
                          }
                          value={form[side]}
                          aria-invalid={!!fields[side]}
                          aria-describedby={
                            fields[side] ? "error-mov-" + side : undefined
                          }
                          onChange={(e) => change(side, e.target.value)}
                        >
                          <option value="">Selecciona un Saldo</option>
                          {(options?.saldos ?? [])
                            .filter(
                              (s) =>
                                (s.estado === "Activa" ||
                                  (!!id &&
                                    s.id ===
                                      (side === "origen"
                                        ? old?.origen.id
                                        : old?.destino.id))) &&
                                s.control !== "Manual" &&
                                s.control !== "Exterior",
                            )
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.id +
                                  " · " +
                                  s.nombre +
                                  (s.estado === "Inactiva"
                                    ? " · Inactiva (histórico)"
                                    : "")}
                              </option>
                            ))}
                        </select>,
                      ),
                    )
                  ) : (
                    <>
                      {field(
                        "saldo",
                        form.tipo === "Gasto" ||
                          form.tipo === "Amortización deuda"
                          ? "Saldo origen *"
                          : "Saldo receptor *",
                        <select
                          aria-label={
                            form.tipo === "Gasto" ||
                            form.tipo === "Amortización deuda"
                              ? "Saldo origen *"
                              : "Saldo receptor *"
                          }
                          value={form.saldo}
                          aria-invalid={!!fields.saldo}
                          aria-describedby={
                            fields.saldo ? "error-mov-saldo" : undefined
                          }
                          onChange={(e) => change("saldo", e.target.value)}
                        >
                          <option value="">Selecciona un Saldo</option>
                          {saldos.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id} · {s.nombre}
                              {s.estado === "Inactiva"
                                ? " · Inactiva (histórico)"
                                : ""}
                            </option>
                          ))}
                        </select>,
                      )}
                    </>
                  )}
                  {form.tipo === "Ingreso" &&
                    field(
                      "subtipo",
                      "Subtipo *",
                      <select
                        aria-label="Subtipo *"
                        value={form.subtipo}
                        aria-invalid={!!fields.subtipo}
                        aria-describedby={
                          fields.subtipo ? "error-mov-subtipo" : undefined
                        }
                        onChange={(e) => change("subtipo", e.target.value)}
                      >
                        <option value="">Selecciona</option>
                        {["Nómina", "Bonus", "Intereses", "Promoción"].map(
                          (v) => (
                            <option key={v}>{v}</option>
                          ),
                        )}
                      </select>,
                    )}
                  {(form.tipo === "Gasto" ||
                    form.tipo === "Amortización deuda" ||
                    form.tipo === "Devolución de gasto") &&
                    field(
                      "partida",
                      form.tipo === "Devolución de gasto"
                        ? "Partida acreditada (opcional)"
                        : "Partida *",
                      <select
                        aria-label={
                          form.tipo === "Devolución de gasto"
                            ? "Partida acreditada (opcional)"
                            : "Partida *"
                        }
                        value={form.partida}
                        aria-invalid={!!fields.partida}
                        aria-describedby={
                          fields.partida ? "error-mov-partida" : undefined
                        }
                        onChange={(e) => change("partida", e.target.value)}
                      >
                        <option value="">Selecciona una Partida</option>
                        {partidas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.id} · {p.nombre} · {p.subcategoria.nombre} /{" "}
                            {p.categoria.nombre}
                          </option>
                        ))}
                      </select>,
                    )}
                </div>
                <p>
                  {form.tipo === "Ingreso"
                    ? "Origen: Exterior técnico S000"
                    : form.tipo === "Devolución de gasto"
                      ? "Entrada real desde Exterior técnico S000 al Saldo receptor. Es una devolución de gasto, no un Ingreso ordinario ni la anulación de una compra."
                      : form.tipo === "Gasto" ||
                        form.tipo === "Amortización deuda"
                      ? "Destino: Exterior técnico S000"
                      : form.tipo === "Transferencia"
                        ? "Origen y Destino internos · dos Saldos distintos"
                        : "Selecciona el Tipo para definir la dirección."}
                </p>
                {(form.tipo === "Gasto" ||
                  form.tipo === "Amortización deuda") && (
                  <>
                    <p>
                      Subcategoría:{" "}
                      {selected?.subcategoria.nombre ?? "Selecciona Partida"} ·
                      Categoría:{" "}
                      {selected?.categoria.nombre ?? "Selecciona Partida"}
                    </p>
                    <p className={requiredRef ? "field-error" : "help"}>
                      {requiredRef
                        ? "Esta Partida exige una Referencia verificable. No se puede registrar hasta su entrega E3 o mapping contrastado."
                        : selected?.referenciaObligatoria
                          ? "Referencia obligatoria · Tipo esperado: " +
                            selected.tipoReferencia
                          : "Referencia opcional: no impone compatibilidad adicional con la Categoría."}
                    </p>
                  </>
                )}
                {form.tipo !== "Devolución de gasto" && field(
                  "referencia",
                  (form.tipo === "Gasto" ||
                    form.tipo === "Amortización deuda") &&
                    selected?.referenciaObligatoria
                    ? "Referencia *"
                    : "Referencia opcional",
                  <select
                    aria-label={
                      (form.tipo === "Gasto" ||
                        form.tipo === "Amortización deuda") &&
                      selected?.referenciaObligatoria
                        ? "Referencia *"
                        : "Referencia opcional"
                    }
                    value={form.referencia}
                    disabled={requiredRef}
                    aria-invalid={!!fields.referencia}
                    aria-describedby={
                      fields.referencia ? "error-mov-referencia" : undefined
                    }
                    onChange={(e) => change("referencia", e.target.value)}
                  >
                    <option value="">Sin referencia</option>
                    {(options?.referencias ?? [])
                      .filter(
                        (r) =>
                          (r.estado === "Activa" ||
                            (!!id && old?.referencia?.id === r.id)) &&
                          (!(
                            (form.tipo === "Gasto" ||
                              form.tipo === "Amortización deuda") &&
                            selected?.referenciaObligatoria
                          ) ||
                            r.tipo === selected.tipoReferencia),
                      )
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.id +
                            " · " +
                            r.nombre +
                            " · " +
                            r.tipo +
                            (r.estado === "Inactiva"
                              ? " · Inactiva (histórico)"
                              : "")}
                        </option>
                      ))}
                  </select>,
                )}
                {isAnticipo && (
                  <section className="panel" aria-label="Atribución Anticipo">
                    <h3>Atribución explícita del Anticipo</h3>
                    <p>
                      Referencia {form.referencia}. El rol y el par se guardan
                      junto al hecho, sin duplicar el importe.
                    </p>
                    {caseError && <Alert>{caseError}</Alert>}
                    <label>
                      Rol Anticipo obligatorio
                      <select
                        aria-label="Rol Anticipo obligatorio"
                        value={form.rolAnticipo}
                        onChange={(e) => change("rolAnticipo", e.target.value)}
                      >
                        <option value="">Seleccionar rol</option>
                        <option>Adelanto</option>
                        <option>Devolución</option>
                      </select>
                    </label>
                    {form.rolAnticipo === "Adelanto" ? (
                      <p>
                        Orientación declarada:{" "}
                        {form.origen || "Selecciona Origen"} →{" "}
                        {form.destino || "Selecciona Destino"}
                      </p>
                    ) : (
                      form.rolAnticipo === "Devolución" && (
                        <label>
                          Par de Adelanto acreditado
                          <select
                            aria-label="Par de Adelanto acreditado"
                            value={form.parAnticipo}
                            onChange={(e) => {
                              const p = caseData?.pares.find(
                                (p) =>
                                  p.origen + ">" + p.destino === e.target.value,
                              );
                              change("parAnticipo", e.target.value);
                              if (p) {
                                change("origen", p.destino);
                                change("destino", p.origen);
                              }
                            }}
                          >
                            <option value="">
                              Seleccionar par explícitamente
                            </option>
                            {caseData?.pares.map((p) => (
                              <option
                                disabled={!p.disponible}
                                key={p.origen + ">" + p.destino}
                                value={p.origen + ">" + p.destino}
                              >
                                {p.origen} → {p.destino} · pendiente{" "}
                                {eur(p.neto)}
                                {p.motivo ? " · " + p.motivo : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                      )
                    )}
                    <label>
                      Evidencia de atribución
                      <input
                        aria-label="Evidencia de atribución"
                        value={form.evidenciaAnticipo}
                        onChange={(e) =>
                          change("evidenciaAnticipo", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Procedencia de atribución
                      <input
                        aria-label="Procedencia de atribución"
                        value={form.procedenciaAnticipo}
                        onChange={(e) =>
                          change("procedenciaAnticipo", e.target.value)
                        }
                      />
                    </label>
                    {fields.anticipo && <p role="alert">{fields.anticipo}</p>}
                    {form.rolAnticipo === "Devolución" &&
                      !caseData?.pares.some((p) => p.disponible) && (
                        <p>
                          ⚠ No disponible: sin par verificable o conflicto
                          pendiente de revisión.
                        </p>
                      )}
                  </section>
                )}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    preserveMovement(
                      id ? base + "/" + id + "/rectificar" : base + "/nuevo",
                      form,
                      reason,
                    );
                    go("/referencias/nueva");
                  }}
                >
                  Crear Viaje o Evento conservando borrador
                </button>
                {(form.tipo === "Gasto" ||
                  form.tipo === "Amortización deuda") && (
                  <section aria-label="Desglose de Deuda">
                    <h3>Deuda vinculada</h3>
                    <p>
                      {selected?.deuda
                        ? selected.deuda +
                          " · " +
                          (options?.deudas.find((d) => d.id === selected.deuda)
                            ?.nombre ?? "Deuda")
                        : "Sin Deuda: selecciona una Partida vinculada para un pago de Deuda."}
                    </p>
                    {selected?.deuda &&
                      (form.tipo === "Gasto" ? (
                        <div className="form-grid">
                          {(["capital", "intereses"] as const).map((k) =>
                            field(
                              k,
                              k === "capital"
                                ? "Capital amortizado EUR *"
                                : "Intereses EUR *",
                              <input
                                aria-label={
                                  k === "capital"
                                    ? "Capital amortizado EUR *"
                                    : "Intereses EUR *"
                                }
                                inputMode="decimal"
                                value={form[k]}
                                aria-invalid={!!fields[k]}
                                onChange={(e) => change(k, e.target.value)}
                              />,
                            ),
                          )}
                          <p>
                            El capital y los intereses deben sumar el importe
                            exacto. No se completan automáticamente.
                          </p>
                        </div>
                      ) : (
                        <p>
                          Capital = importe {form.importe || "sin informar"} EUR
                          · Intereses = 0,00 EUR · No es Gasto
                        </p>
                      ))}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        preserveMovement(
                          id
                            ? base + "/" + id + "/rectificar"
                            : base + "/nuevo",
                          form,
                          reason,
                        );
                        go("/deudas/nueva");
                      }}
                    >
                      Crear deuda conservando borrador
                    </button>
                  </section>
                )}
                {form.tipo === "Transferencia" && (
                  <p className="help">
                    Transferencia interna: sin Partida ni Subtipo, sin permiso
                    de salida a Exterior. Transferencias con Exterior pendientes
                    de una entrega futura.
                  </p>
                )}
                {options && !saldos.length && (
                  <p className="help">
                    No hay Saldos disponibles.{" "}
                    <Link to="/saldos" go={go}>
                      Consultar Saldos
                    </Link>
                  </p>
                )}
                {(form.tipo === "Gasto" ||
                  form.tipo === "Amortización deuda") &&
                  options &&
                  !partidas.length && (
                    <p className="help">
                      No hay Partidas seleccionables.{" "}
                      <Link to="/clasificacion/partidas" go={go}>
                        Consultar Clasificación
                      </Link>
                    </p>
                  )}
              </section>
              <section className="panel">
                <h2>Contexto derivado</h2>
                <p>
                  Fecha prevista:{" "}
                  {/^\d{4}-\d{2}-\d{2}$/.test(form.fecha)
                    ? date(form.fecha)
                    : "Indica una fecha"}
                </p>
                <p>
                  Ciclo:{" "}
                  {form.fecha ? cycle(selectedCycle) : "Indica una fecha"}
                </p>
                {form.tipo === "Transferencia" ? (
                  (["origen", "destino"] as const).map((side) => {
                    const related = options?.saldos.find(
                      (s) => s.id === form[side],
                    );
                    return (
                      <p key={side}>
                        Posición actual{" "}
                        {side === "origen" ? "del Origen" : "del Destino"}:{" "}
                        {related
                          ? amount(related.posicion.importe)
                          : "Selecciona Saldo"}
                        <br />
                        <small className="movement-position-note">
                          {related?.posicion.motivo ??
                            "El motor de cada Saldo determina su posición disponible."}
                        </small>
                      </p>
                    );
                  })
                ) : (
                  <>
                    <p>
                      Posición actual del Saldo:{" "}
                      {saldo
                        ? amount(saldo.posicion.importe)
                        : "Selecciona Saldo"}
                    </p>
                    <p className="help">
                      {saldo?.posicion.motivo ??
                        "No se copia el importe de ningún presupuesto ni se infiere una clasificación."}
                    </p>
                  </>
                )}
              </section>
            </>
          ) : (
            <section className="panel">
              <h2>Hecho que se anulará</h2>
              <p>
                #{old!.id} · {date(old!.fecha)} · {old!.tipo} ·{" "}
                {eur(old!.importe)}
              </p>
              <p>{old!.concepto}</p>
              <p className="help">
                Se conservarán el registro, sus relaciones y la auditoría.
                Dejará de computar económicamente.
              </p>
            </section>
          )}
          {!!id && (
            <section className="panel">
              <label>
                Motivo *
                <textarea
                  aria-label="Motivo *"
                  value={reason}
                  maxLength={2000}
                  aria-invalid={!!fields.motivo}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setPlan(null);
                    setFields((v) => ({ ...v, motivo: "" }));
                    attempt.current = crypto.randomUUID();
                  }}
                />
              </label>
              {fields.motivo && <p className="field-error">{fields.motivo}</p>}
            </section>
          )}
          {plan && (
            <>
              {plan.duplicados.length > 0 && (
                <section
                  className="panel duplicate-warning"
                  aria-label="Advertencia de coincidencias"
                >
                  <h2>Posible coincidencia</h2>
                  <p>
                    Revisa si son hechos distintos. La coincidencia no impide
                    registrar otro hecho real.
                  </p>
                  <ul>
                    {plan.duplicados.map((d) => (
                      <li key={d.id}>
                        #{d.id} · {date(d.fecha)} · {d.tipo} · {eur(d.importe)}{" "}
                        · {d.concepto}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <Impact plan={plan} />
            </>
          )}
          <div className="form-footer">
            <p className="muted">
              {id
                ? "ID estable · cambios auditados con motivo y fecha"
                : "* Campos obligatorios · datos ficticios en local"}
            </p>
            <div className="actions">
              <button
                className="secondary"
                type="button"
                onClick={() => go(id ? base + "/" + id : base)}
              >
                Cancelar
              </button>
              {plan && (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setPlan(null)}
                >
                  Volver y revisar
                </button>
              )}
              <button
                className="primary"
                type="submit"
                disabled={
                  busy ||
                  !options ||
                  !!optionsError ||
                  conflict ||
                  !!requiredRef
                }
              >
                {busy ? "Comprobando…" : button}
              </button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
