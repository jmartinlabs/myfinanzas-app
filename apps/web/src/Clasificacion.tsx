import { monthLabel } from "./Ciclos";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, eur } from "./api";
import { Alert, PageHead, Tag } from "./ui";

type Kind = "categorias" | "subcategorias" | "partidas";
type Item = {
  id: string;
  nombre: string;
  estado: string;
  revision: number;
  deuda?: string | null;
  padre: string | null;
  grupo: string | null;
  anual: string | null;
  mensual: string | null;
  referencia: boolean | null;
  categoria: { id: string; nombre: string } | null;
  subcategoria: { id: string; nombre: string } | null;
  integridad: string | null;
};
type Dependency = { kind: Kind; id: string; nombre: string; estado: string };
type Plan = {
  fingerprint: string;
  dependencies: Dependency[];
  coverage: string;
  pending: string[];
  financial?: {
    movimientos: {
      id: string;
      fecha: string;
      estado: string;
      importe: string;
      antes: {
        categoria: { id: string; nombre: string };
        subcategoria: { id: string; nombre: string };
      };
      despues: {
        categoria: { id: string; nombre: string };
        subcategoria: { id: string; nombre: string };
      };
      ciclo: { mesFinanciado: string } | null;
    }[];
    cobertura: string;
  };
};
const plural = {
  categorias: "Categorías",
  subcategorias: "Subcategorías",
  partidas: "Partidas",
};
const singular = {
  categorias: "Categoría",
  subcategorias: "Subcategoría",
  partidas: "Partida",
};
const annual = ["Ingreso", "Gasto", "No aplica"];
const monthly = ["Ingreso", "Gasto", "Gasto compartido neto", "No aplica"];
const base = "/clasificacion/";
const endpoint = (kind: Kind, id?: string) =>
  base + kind + (id ? "/" + id : "");
async function all(kind: Kind): Promise<Item[]> {
  const rows: Item[] = [];
  for (let page = 1; ; page++) {
    const data = await api<{ items: Item[]; total: number }>(
      endpoint(kind) + `?estado=&page=${page}`,
    );
    rows.push(...data.items);
    if (rows.length >= data.total) return rows;
  }
}
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
function chain(item: Item) {
  return (
    [item.categoria?.nombre, item.subcategoria?.nombre]
      .filter(Boolean)
      .join(" / ") || "Nivel principal"
  );
}
export function Clasificacion({
  path,
  go,
}: {
  path: string;
  go: (p: string) => void;
}) {
  const match = path.match(
    /^\/clasificacion\/(categorias|subcategorias|partidas)(?:\/(nuevo|(?:CAT|SUB|PAR)\d+)(?:\/(editar|rectificar))?)?$/,
  );
  const kind = (match?.[1] ?? "partidas") as Kind;
  const id = match?.[2],
    action = match?.[3];
  const [version, reload] = useState(0),
    [item, setItem] = useState<Item | null>(null),
    [deps, setDeps] = useState<Dependency[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setItem(null);
    setError("");
    if (id && id !== "nuevo")
      api(endpoint(kind, id))
        .then((d) => {
          if (live) {
            setItem(d.item);
            setDeps(d.dependencies);
          }
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    return () => {
      live = false;
    };
  }, [kind, id, version]);
  if (!match && path !== "/clasificacion")
    return <Alert>Página no encontrada.</Alert>;
  if (!id) return <ClassificationList key={kind} kind={kind} go={go} />;
  const back = (
    <Link to={endpoint(kind)} go={go}>
      Volver a {plural[kind]}
    </Link>
  );
  if (error)
    return (
      <>
        <Alert retry={() => reload((v) => v + 1)}>{error}</Alert>
        {back}
      </>
    );
  if (id !== "nuevo" && !item) return <p role="status">Cargando ficha…</p>;
  if (id === "nuevo" || action)
    return (
      <ClassificationForm
        key={`${kind}:${id}:${action}`}
        kind={kind}
        item={item ?? undefined}
        rectifying={action === "rectificar"}
        go={go}
        onSaved={(saved) => {
          reload((v) => v + 1);
          go(endpoint(kind, saved.id));
        }}
      />
    );
  return (
    <ClassificationDetail
      kind={kind}
      item={item!}
      deps={deps}
      go={go}
      reload={() => reload((v) => v + 1)}
    />
  );
}
function ClassificationList({
  kind,
  go,
}: {
  kind: Kind;
  go: (p: string) => void;
}) {
  const [q, setQ] = useState(""),
    [state, setState] = useState("Activa"),
    [category, setCategory] = useState(""),
    [sub, setSub] = useState(""),
    [page, setPage] = useState(1),
    [rows, setRows] = useState<Item[]>([]),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [cats, setCats] = useState<Item[]>([]),
    [subs, setSubs] = useState<Item[]>([]);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      q,
      estado: state,
      categoria: category,
      subcategoria: sub,
      page: String(page),
    });
    Promise.all([
      api(endpoint(kind) + "?" + params),
      all("categorias"),
      kind === "partidas" ? all("subcategorias") : Promise.resolve([]),
    ])
      .then(([data, c, s]) => {
        if (live) {
          setRows(data.items);
          setTotal(data.total);
          setCats(c);
          setSubs(s);
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
  }, [kind, q, state, category, sub, page, retry]);
  const choose = (fn: (v: string) => void, value: string) => {
    fn(value);
    setPage(1);
  };
  const filterSub = subs.filter(
    (s) => !category || s.categoria?.id === category,
  );
  return (
    <>
      <PageHead
        eyebrow="NÚCLEO FINANCIERO"
        title="Clasificación"
        description="Categorías, Subcategorías y Partidas · relaciones por identidad estable"
      >
        <button className="primary" onClick={() => go(endpoint(kind, "nuevo"))}>
          Nueva {singular[kind]}
        </button>
      </PageHead>
      <nav
        className="classification-tabs"
        aria-label="Catálogos de clasificación"
      >
        {(Object.keys(plural) as Kind[]).map((k) => (
          <a
            key={k}
            href={endpoint(k)}
            aria-current={k === kind ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              go(endpoint(k));
            }}
          >
            {plural[k]}
          </a>
        ))}
      </nav>
      <section
        className="panel catalog-panel classification-list"
        aria-label={plural[kind]}
      >
        <div className="filters">
          <label className="search">
            Buscar nombre o ID
            <input
              type="search"
              value={q}
              onChange={(e) => choose(setQ, e.target.value)}
            />
          </label>
          {kind !== "categorias" && (
            <label>
              Categoría
              <select
                aria-label="Categoría"
                value={category}
                onChange={(e) => {
                  choose(setCategory, e.target.value);
                  setSub("");
                }}
              >
                <option value="">Todas</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {c.estado === "Inactiva" ? " · Inactiva" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {kind === "partidas" && (
            <label>
              Subcategoría
              <select
                aria-label="Subcategoría"
                value={sub}
                onChange={(e) => choose(setSub, e.target.value)}
              >
                <option value="">Todas</option>
                {filterSub.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                    {s.estado === "Inactiva" ? " · Inactiva" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Estado
            <select
              aria-label="Estado"
              value={state}
              onChange={(e) => choose(setState, e.target.value)}
            >
              <option>Activa</option>
              <option>Inactiva</option>
              <option value="">Todos</option>
            </select>
          </label>
        </div>
        <div className="list-toolbar">
          <p role="status">
            {loading
              ? "Cargando catálogo…"
              : error
                ? "Consulta no disponible"
                : `${total} elementos`}
          </p>
          <span>{plural[kind]}</span>
        </div>
        {error ? (
          <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>
        ) : loading ? (
          <div className="empty" aria-busy="true">
            Consultando relaciones…
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <h2>
              {q || category || sub || state !== "Activa"
                ? "Sin coincidencias"
                : "Todavía no hay elementos activos"}
            </h2>
            <p>Crea un elemento o ajusta los filtros.</p>
            <button
              className="secondary"
              onClick={() => {
                setQ("");
                setState("Activa");
                setCategory("");
                setSub("");
                setPage(1);
              }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="desktop-list">
              <table>
                <caption className="sr-only">{plural[kind]}</caption>
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">
                      {kind === "categorias" ? "Grupo" : "Jerarquía"}
                    </th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link go={go} to={endpoint(kind, r.id)}>
                          {r.nombre}
                        </Link>
                      </td>
                      <td>
                        {kind === "categorias"
                          ? (r.grupo ?? "Sin informar")
                          : chain(r)}
                      </td>
                      <td>
                        <Tag inactive={r.estado === "Inactiva"}>{r.estado}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mobile-list">
              {rows.map((r) => (
                <li key={r.id}>
                  <div className="card-head">
                    <h2>
                      <Link go={go} to={endpoint(kind, r.id)}>
                        {r.nombre}
                      </Link>
                    </h2>
                    <Tag inactive={r.estado === "Inactiva"}>{r.estado}</Tag>
                  </div>
                  <p>
                    {kind === "categorias"
                      ? (r.grupo ?? "Sin grupo")
                      : chain(r)}
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
              disabled={page * 100 >= total || loading || Boolean(error)}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
      <p className="page-foot">
        Los inactivos conservan sus relaciones e identidad para las consultas
        históricas.
      </p>
    </>
  );
}
function ClassificationDetail({
  kind,
  item,
  deps,
  go,
  reload,
}: {
  kind: Kind;
  item: Item;
  deps: Dependency[];
  go: (p: string) => void;
  reload: () => void;
}) {
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function state() {
    setBusy(true);
    setError("");
    try {
      await api(
        endpoint(kind, item.id) +
          (item.estado === "Activa" ? "/desactivar" : "/reactivar"),
        "POST",
        { revision: item.revision },
      );
      setConfirm(false);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const field = (label: string, value: ReactNode) => (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
  return (
    <>
      <div className="back">
        <Link go={go} to={endpoint(kind)}>
          Volver a {plural[kind]}
        </Link>
      </div>
      <PageHead
        eyebrow={singular[kind].toUpperCase()}
        title={item.nombre}
        description={item.id}
      >
        <Tag inactive={item.estado === "Inactiva"}>{item.estado}</Tag>
        <button
          className="primary"
          onClick={() => go(endpoint(kind, item.id) + "/editar")}
        >
          Editar {singular[kind]}
        </button>
      </PageHead>
      {error && <Alert>{error}</Alert>}
      <div className="detail-grid">
        <section className="panel">
          <h2>Identificación y jerarquía</h2>
          <dl>
            {field("ID inmutable", item.id)}
            {field("Nombre", item.nombre)}
            {item.categoria &&
              field(
                "Categoría",
                <Link go={go} to={endpoint("categorias", item.categoria.id)}>
                  {item.categoria.nombre}
                </Link>,
              )}
            {item.subcategoria &&
              field(
                "Subcategoría",
                <Link
                  go={go}
                  to={endpoint("subcategorias", item.subcategoria.id)}
                >
                  {item.subcategoria.nombre}
                </Link>,
              )}
            {kind === "subcategorias" &&
              field(
                "Integridad estructural",
                item.integridad ?? "No disponible",
              )}
          </dl>
        </section>
        <section className="panel">
          <h2>{kind === "categorias" ? "Configuración" : "Relaciones"}</h2>
          {kind === "categorias" ? (
            <dl>
              {field("Grupo", item.grupo ?? "Sin informar")}
              {field("Cálculo anual", item.anual ?? "Sin informar")}
              {field("Cálculo mensual", item.mensual ?? "Sin informar")}
              {field(
                "Referencia obligatoria",
                item.referencia === null
                  ? "Sin informar"
                  : item.referencia
                    ? "Sí"
                    : "No",
              )}
            </dl>
          ) : kind === "partidas" ? (
            <>
              <p>Presupuesto: Sin asignación</p>
              <p>Deuda: Sin asignación</p>
              <p className="muted">
                Vinculación disponible en sus entregas. Una Partida sin
                Presupuesto es válida.
              </p>
            </>
          ) : (
            <p>Las Partidas heredan Categoría mediante esta relación única.</p>
          )}
          <p className="help">
            No se calculan importes ni resultados financieros en este catálogo.
          </p>
        </section>
      </div>
      <section className="panel classification-deps">
        <h2>Dependencias del catálogo</h2>
        {deps.length ? (
          <ul>
            {deps.map((d) => (
              <li key={d.id}>
                <Link go={go} to={endpoint(d.kind, d.id)}>
                  {d.nombre}
                </Link>{" "}
                · {d.id} · {d.estado}
              </li>
            ))}
          </ul>
        ) : (
          <p>Sin descendientes en el catálogo.</p>
        )}
        <p className="help">
          Impacto financiero no comprobado. Movimientos, indicadores y cierres
          se integrarán en sus entregas.
        </p>
        <button
          className="secondary"
          onClick={() => go(endpoint(kind, item.id) + "/rectificar")}
        >
          Rectificar configuración
        </button>
      </section>
      <section className="panel lifecycle">
        <div>
          <h2>Estado del elemento</h2>
          <p>
            Desactivar conserva la historia. Reactivar no activa sus
            descendientes.
          </p>
        </div>
        {!confirm ? (
          <button className="secondary" onClick={() => setConfirm(true)}>
            {item.estado === "Activa" ? "Desactivar" : "Reactivar"}{" "}
            {singular[kind]}
          </button>
        ) : (
          <div className="confirmation">
            <p>¿Confirmas el cambio de estado?</p>
            <div className="actions">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy} onClick={state}>
                Confirmar{" "}
                {item.estado === "Activa" ? "desactivar" : "reactivar"}
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
function ClassificationForm({
  kind,
  item,
  rectifying,
  go,
  onSaved,
}: {
  kind: Kind;
  item?: Item;
  rectifying: boolean;
  go: (p: string) => void;
  onSaved: (item: Item) => void;
}) {
  const [value, setValue] = useState<Record<string, string>>({
    nombre: item?.nombre ?? "",
    grupo: item?.grupo ?? "",
    anual: item?.anual ?? "",
    mensual: item?.mensual ?? "",
    referencia: item?.referencia == null ? "" : String(item.referencia),
    deuda: item?.deuda ?? "",
    padre: item?.padre ?? "",
  });
  const [debts, setDebts] = useState<
    { id: string; nombre: string; estado: string }[]
  >([]);
  useEffect(() => {
    if (kind === "partidas")
      api("/movimientos/opciones")
        .then((d) => setDebts(d.deudas))
        .catch((e) => setLoadError(e.message));
  }, [kind]);
  const [parents, setParents] = useState<Item[]>([]),
    [groups, setGroups] = useState<string[]>([]),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [retry, setRetry] = useState(0),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [plan, setPlan] = useState<Plan | null>(null),
    [reason, setReason] = useState("");
  const attempt = useRef(crypto.randomUUID()),
    errorRef = useRef<HTMLDivElement>(null);
  const parentKind = kind === "partidas" ? "subcategorias" : "categorias";
  useEffect(() => {
    let live = true;
    setLoading(true);
    setLoadError("");
    all(parentKind)
      .then((rows) => {
        if (live) {
          setParents(rows);
          setGroups([
            ...new Set(
              rows.map((r) => r.grupo).filter((g): g is string => Boolean(g)),
            ),
          ]);
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
  }, [parentKind, retry]);
  function change(name: string, v: string) {
    setValue((old) => ({ ...old, [name]: v }));
    setPlan(null);
  }
  function body() {
    const names =
      kind === "categorias"
        ? ["nombre", "grupo", "anual", "mensual", "referencia"]
        : kind === "partidas"
          ? ["nombre", "padre", "deuda"]
          : ["nombre", "padre"];
    const result: Record<string, unknown> = item
      ? { revision: item.revision }
      : {};
    for (const name of names) {
      const val =
        name === "grupo" || name === "deuda"
          ? value[name] || null
          : name === "referencia"
            ? value[name] === ""
              ? null
              : value[name] === "true"
            : item &&
                ["anual", "mensual"].includes(name) &&
                value[name] === "" &&
                item[name as keyof Item] === null
              ? null
              : value[name];
      if (!item || val !== item[name as keyof Item]) result[name] = val;
    }
    return result;
  }
  async function submit(confirm = false) {
    setBusy(true);
    setError("");
    setFields({});
    try {
      const changes = body();
      if (rectifying && item && !confirm) {
        setPlan(
          await api(endpoint(kind, item.id) + "/impacto", "POST", changes),
        );
        return;
      }
      const data =
        rectifying && item
          ? await api(endpoint(kind, item.id) + "/rectificar", "POST", {
              cambios: changes,
              fingerprint: plan?.fingerprint,
              motivo: reason,
            })
          : await api(
              endpoint(kind, item?.id),
              item ? "PATCH" : "POST",
              changes,
              item ? {} : { "idempotency-key": attempt.current },
            );
      onSaved(data.item);
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      setFields(err.fields ?? {});
      if (err.status === 409) setPlan(null);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  function input(
    name: string,
    label: string,
    choices?: { id: string; nombre: string }[],
  ) {
    return (
      <label>
        {label}
        {choices ? (
          <select
            aria-label={label}
            value={value[name]}
            onChange={(e) => change(name, e.target.value)}
            aria-invalid={Boolean(fields[name])}
            aria-describedby={fields[name] ? `error-${name}` : undefined}
          >
            <option value="">Seleccionar…</option>
            {choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        ) : (
          <input
            aria-label={label}
            value={value[name]}
            onChange={(e) => change(name, e.target.value)}
            aria-invalid={Boolean(fields[name])}
            aria-describedby={fields[name] ? `error-${name}` : undefined}
            list={
              name === "grupo" || name === "deuda"
                ? "classification-groups"
                : undefined
            }
          />
        )}
        {fields[name] && (
          <span id={`error-${name}`} className="field-error">
            {fields[name]}
          </span>
        )}
      </label>
    );
  }
  const fieldLabels: Record<string, string> = {
    nombre: "Nombre",
    grupo: "Grupo",
    anual: "Cálculo anual",
    mensual: "Cálculo mensual",
    referencia: "Referencia obligatoria",
    padre: kind === "partidas" ? "Subcategoría" : "Categoría",
  };
  function display(name: string, val: unknown) {
    if (val === null || val === undefined) return "Sin informar";
    if (name === "referencia") return val ? "Sí" : "No";
    if (name === "padre")
      return parents.find((p) => p.id === val)?.nombre + " · " + String(val);
    return String(val);
  }
  const parentChoices = parents
    .filter((p) => p.estado === "Activa" || p.id === item?.padre)
    .map((p) => ({
      id: p.id,
      nombre: `${p.nombre} · ${p.id}${p.estado === "Inactiva" ? " · Inactiva" : ""}`,
    }));
  return (
    <>
      <PageHead
        eyebrow="CLASIFICACIÓN"
        title={`${rectifying ? "Rectificar" : item ? "Editar" : "Nueva"} ${singular[kind]}`}
        description={
          item
            ? `${item.id} · Identidad inmutable`
            : "ID asignado al guardar · Estado inicial Activa"
        }
      />
      {error && (
        <div tabIndex={-1} ref={errorRef}>
          <Alert>
            {error}
            {error.includes("rectificación") && item && !rectifying && (
              <p>
                <Link go={go} to={endpoint(kind, item.id) + "/rectificar"}>
                  Revisar rectificación
                </Link>
              </p>
            )}
          </Alert>
        </div>
      )}
      {loadError && (
        <Alert retry={() => setRetry((v) => v + 1)}>{loadError}</Alert>
      )}
      <form
        className="saldo-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <section className="panel">
          <h2>Identificación</h2>
          <div className="form-grid">
            {input("nombre", "Nombre *")}
            {kind === "categorias" && input("grupo", "Grupo (opcional)")}
          </div>
          <datalist id="classification-groups">
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </section>
        <section className="panel">
          <h2>{kind === "categorias" ? "Configuración" : "Jerarquía"}</h2>
          {loading ? (
            <p role="status">Cargando opciones…</p>
          ) : (
            <div className="form-grid">
              {kind === "categorias" ? (
                <>
                  {input(
                    "anual",
                    "Cálculo anual *",
                    annual.map((v) => ({ id: v, nombre: v })),
                  )}
                  {input(
                    "mensual",
                    "Cálculo mensual *",
                    monthly.map((v) => ({ id: v, nombre: v })),
                  )}
                  {input("referencia", "Referencia obligatoria *", [
                    { id: "true", nombre: "Sí" },
                    { id: "false", nombre: "No" },
                  ])}
                </>
              ) : (
                input(
                  "padre",
                  kind === "partidas" ? "Subcategoría *" : "Categoría *",
                  parentChoices,
                )
              )}
            </div>
          )}
          {kind === "categorias" && (
            <p className="help">
              Métodos independientes. Configurar no ejecuta los motores. Los
              valores históricos sin informar no se completan al editar otro
              campo.
            </p>
          )}
          {kind === "partidas" && (
            <>
              <label>
                Deuda opcional
                <select
                  aria-label="Deuda opcional"
                  value={value.deuda}
                  onChange={(e) => change("deuda", e.target.value)}
                >
                  <option value="">Sin Deuda</option>
                  {debts
                    .filter(
                      (d) => d.estado === "Activa" || d.id === item?.deuda,
                    )
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id} · {d.nombre} · {d.estado}
                      </option>
                    ))}
                </select>
              </label>
              <p className="help">
                Una Partida puede enlazar una Deuda. El enlace de una Partida
                utilizada está protegido; crea una nueva para el futuro.
                Presupuesto pendiente de su entrega.
              </p>
            </>
          )}
        </section>
        {rectifying && (
          <section className="panel classification-deps">
            <h2>Revisión expresa del cambio</h2>
            <p>
              Para un cambio solo futuro, crea una nueva Partida y desactiva la
              anterior cuando corresponda.
            </p>
            <p className="context-note">
              Aunque no cambien las filas de Movimientos, una relación puede
              reclasificar y recalcular resultados históricos. La vista previa
              muestra los consumidores disponibles e identifica las
              comprobaciones pendientes.
            </p>
            {plan && (
              <div aria-live="polite">
                <h3>Vista previa del catálogo</h3>
                <dl className="change-summary">
                  {Object.entries(body())
                    .filter(([k]) => k !== "revision")
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{fieldLabels[k]}</dt>
                        <dd>
                          <span>
                            Antes: {display(k, item?.[k as keyof Item])}
                          </span>
                          <span>Después: {display(k, v)}</span>
                        </dd>
                      </div>
                    ))}
                </dl>
                <ul>
                  {plan.dependencies.map((d) => (
                    <li key={d.id}>
                      {d.id} · {d.nombre} · {d.estado}
                    </li>
                  ))}
                </ul>
                {!plan.dependencies.length && (
                  <p>Sin descendientes en el catálogo.</p>
                )}
                {plan.financial && (
                  <div className="movement-impact">
                    <h3>
                      Movimientos afectados: {plan.financial.movimientos.length}
                    </h3>
                    <ul>
                      {plan.financial.movimientos.map((m) => (
                        <li key={m.id}>
                          #{m.id} · {m.fecha.split("-").reverse().join("/")} ·{" "}
                          {m.estado} · {eur(m.importe)}
                          <br />
                          Categoría: {m.antes.categoria.id} ·{" "}
                          {m.antes.categoria.nombre} → {m.despues.categoria.id}{" "}
                          · {m.despues.categoria.nombre}
                          <br />
                          Subcategoría: {m.antes.subcategoria.id} →{" "}
                          {m.despues.subcategoria.id}
                          <br />
                          Ciclo:{" "}
                          {m.ciclo
                            ? monthLabel(m.ciclo.mesFinanciado)
                            : "Sin ciclo asignable"}
                        </li>
                      ))}
                    </ul>
                    <p>{plan.financial.cobertura}</p>
                  </div>
                )}
                <p>{plan.coverage}</p>
                <p className="muted">
                  Pendientes: {plan.pending.join(", ")}. No se presentan
                  periodos ni importes estimados como comprobados.
                </p>
                <label>
                  Motivo de rectificación *
                  <textarea
                    aria-label="Motivo de rectificación *"
                    value={reason}
                    maxLength={2000}
                    onChange={(e) => setReason(e.target.value)}
                    aria-invalid={Boolean(fields.motivo)}
                    aria-describedby={
                      fields.motivo ? "error-motivo" : undefined
                    }
                  />
                  {fields.motivo && (
                    <span id="error-motivo" className="field-error">
                      {fields.motivo}
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  className="primary"
                  disabled={busy || !reason.trim()}
                  onClick={() => submit(true)}
                >
                  Confirmar rectificación
                </button>
              </div>
            )}
          </section>
        )}
        <div className="form-footer">
          <p className="muted">
            * Campos necesarios para nuevas altas. Sin borrado físico.
          </p>
          <div className="actions">
            <button
              className="secondary"
              type="button"
              onClick={() => go(endpoint(kind, item?.id))}
            >
              Cancelar
            </button>
            <button
              className="primary"
              disabled={busy || loading || Boolean(loadError)}
              type="submit"
            >
              {busy
                ? "Procesando…"
                : rectifying
                  ? "Revisar dependencias"
                  : item
                    ? "Guardar cambios"
                    : `Crear ${singular[kind]}`}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
