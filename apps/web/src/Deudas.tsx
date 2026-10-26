import { useEffect, useRef, useState } from "react";
import { api, ApiError, eur } from "./api";
import { Alert, PageHead, Tag } from "./ui";
import { referenceReturn } from "./movement-draft";
export type Debt = {
  id: string;
  nombre: string;
  inicioControl: string | null;
  capitalApertura: string | null;
  capitalPendiente: string | null;
  estado: string;
  revision: number;
};
const base = "/deudas",
  amount = (v: string | null) => (v === null ? "No calculable" : eur(v));
export function Deudas({
  path,
  go,
}: {
  path: string;
  go: (p: string) => void;
}) {
  const match = path.match(/^\/deudas\/(D\d+)(?:\/(editar))?$/);
  if (path === base) return <List go={go} />;
  if (path === base + "/nueva") return <Form key="nueva" go={go} />;
  if (match)
    return match[2] ? (
      <Form key={path} id={match[1]} go={go} />
    ) : (
      <Detail key={path} id={match[1]} go={go} />
    );
  return <Alert>Página no encontrada.</Alert>;
}
function List({ go }: { go: (p: string) => void }) {
  const [filters, setFilters] = useState({ q: "", estado: "Activa" }),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0),
    [data, setData] = useState<{ items: Debt[]; total: number } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api(base + "?" + new URLSearchParams({ ...filters, page: String(page) }))
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [filters, page, retry]);
  const link = (d: Debt) => (
    <a
      href={base + "/" + d.id}
      onClick={(e) => {
        e.preventDefault();
        go(base + "/" + d.id);
      }}
    >
      {d.nombre}
    </a>
  );
  return (
    <>
      <PageHead
        eyebrow="CAPITAL Y PAGOS"
        title="Deudas"
        description="Apertura y capital pendiente desde Inicio control"
      >
        <button className="primary" onClick={() => go(base + "/nueva")}>
          Nueva deuda
        </button>
      </PageHead>
      <section className="panel catalog-panel">
        <div className="filters">
          <label>
            Buscar nombre o ID
            <input
              type="search"
              value={filters.q}
              onChange={(e) => {
                setFilters((v) => ({ ...v, q: e.target.value }));
                setPage(1);
              }}
            />
          </label>
          <label>
            Estado de Deuda
            <select
              value={filters.estado}
              onChange={(e) => {
                setFilters((v) => ({ ...v, estado: e.target.value }));
                setPage(1);
              }}
            >
              <option>Activa</option>
              <option>Inactiva</option>
              <option value="">Todos</option>
            </select>
          </label>
        </div>
        {error ? (
          <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>
        ) : !data ? (
          <p role="status">Cargando Deudas…</p>
        ) : !data.items.length ? (
          <div className="empty">
            <h2>Sin deudas que mostrar</h2>
            <p>
              Registra una deuda sin crear Saldos ni Movimientos de apertura.
            </p>
          </div>
        ) : (
          <>
            <p role="status">{data.total} deudas</p>
            <div className="desktop-list">
              <table>
                <caption className="sr-only">Deudas</caption>
                <thead>
                  <tr>
                    <th>Nombre / ID</th>
                    <th>Inicio control</th>
                    <th>Apertura</th>
                    <th>Capital pendiente</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((d) => (
                    <tr key={d.id}>
                      <td>
                        {link(d)}
                        <small className="table-id">{d.id}</small>
                      </td>
                      <td>{d.inicioControl ?? "Sin informar"}</td>
                      <td>{amount(d.capitalApertura)}</td>
                      <td>{amount(d.capitalPendiente)}</td>
                      <td>
                        <Tag inactive={d.estado === "Inactiva"}>{d.estado}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mobile-list">
              {data.items.map((d) => (
                <li key={d.id}>
                  <div className="card-head">
                    <span>{d.id}</span>
                    <Tag inactive={d.estado === "Inactiva"}>{d.estado}</Tag>
                  </div>
                  <h2>{link(d)}</h2>
                  <p>Inicio control: {d.inicioControl ?? "Sin informar"}</p>
                  <p>Apertura {amount(d.capitalApertura)}</p>
                  <p>Capital pendiente {amount(d.capitalPendiente)}</p>
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
              disabled={page === 1 || !data}
              onClick={() => setPage((v) => v - 1)}
            >
              Anterior
            </button>
            <button
              className="text-button"
              disabled={!data || page * 100 >= data.total}
              onClick={() => setPage((v) => v + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
type DetailData = {
  item: Debt;
  usos: { id: string; anulado: number }[];
  partidas: { id: string; nombre: string; estado: string }[];
};
function Detail({ id, go }: { id: string; go: (p: string) => void }) {
  const [data, setData] = useState<DetailData | null>(null),
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
    try {
      await api(
        base +
          "/" +
          id +
          (data!.item.estado === "Activa" ? "/desactivar" : "/reactivar"),
        "POST",
        { revision: data!.item.revision },
      );
      setConfirm(false);
      setRetry((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const d = data?.item;
  return (
    <div className="reference-detail debt-detail">
      <button className="text-button" onClick={() => go(base)}>
        Volver a Deudas
      </button>
      {error && <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>}
      {!data ? (
        !error && <p role="status">Cargando Deuda…</p>
      ) : (
        <>
          <PageHead
            eyebrow={id}
            title={d!.nombre}
            description="Capital pendiente · no es un Saldo bancario"
          >
            <Tag inactive={d!.estado === "Inactiva"}>{d!.estado}</Tag>
            <button
              className="secondary"
              onClick={() => go(base + "/" + id + "/editar")}
            >
              Editar deuda
            </button>
          </PageHead>
          <section className="panel">
            <h2>Control y capital</h2>
            <dl className="debt-facts">
              <div>
                <dt>ID estable</dt>
                <dd>{id}</dd>
              </div>
              <div>
                <dt>Inicio control</dt>
                <dd>
                  {d!.inicioControl?.split("-").reverse().join("/") ??
                    "Sin informar"}
                </dd>
              </div>
              <div>
                <dt>Capital apertura</dt>
                <dd>{amount(d!.capitalApertura)}</dd>
              </div>
              <div>
                <dt>Capital pendiente</dt>
                <dd>{amount(d!.capitalPendiente)}</dd>
              </div>
            </dl>
            <p className="help">
              Apertura menos capital amortizado desde Inicio control, incluido
              ese día. Los pagos anteriores conservan su efecto bancario sin
              descontarse otra vez.
            </p>
          </section>
          <section className="panel">
            <h2>Partidas vinculadas</h2>
            {!data.partidas.length ? (
              <p>Sin Partidas vinculadas.</p>
            ) : (
              <ul>
                {data.partidas.map((p) => (
                  <li key={p.id}>
                    <a
                      href={"/clasificacion/partidas/" + p.id}
                      onClick={(e) => {
                        e.preventDefault();
                        go("/clasificacion/partidas/" + p.id);
                      }}
                    >
                      {p.id} · {p.nombre}
                    </a>{" "}
                    · {p.estado}
                  </li>
                ))}
              </ul>
            )}
            <button
              className="secondary"
              onClick={() => go("/clasificacion/partidas")}
            >
              Configurar Partidas
            </button>
          </section>
          <section className="panel">
            <h2>Movimientos vinculados</h2>
            <p>
              {data.usos.length} hechos, incluidos anulados. La cuota es Gasto
              íntegro; la amortización extraordinaria no es Gasto.
            </p>
            <button
              className="secondary"
              onClick={() => go("/movimientos?deuda=" + id)}
            >
              Consultar movimientos de esta deuda
            </button>
          </section>
          <section className="panel">
            <h2>Disponibilidad</h2>
            <p>Desactivar conserva la historia e impide nuevas selecciones.</p>
            {confirm ? (
              <div role="group" aria-label="Confirmar Estado">
                <p>¿Confirmar cambio de Estado de {id}?</p>
                <div className="actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => setConfirm(false)}
                  >
                    Cancelar cambio de Estado
                  </button>
                  <button className="primary" disabled={busy} onClick={state}>
                    Confirmar cambio de Estado
                  </button>
                </div>
              </div>
            ) : (
              <button className="secondary" onClick={() => setConfirm(true)}>
                {d!.estado === "Activa"
                  ? "Desactivar deuda"
                  : "Reactivar deuda"}
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
function Form({ id, go }: { id?: string; go: (p: string) => void }) {
  const [data, setData] = useState<DetailData | null>(null),
    [form, setForm] = useState({
      nombre: "",
      inicioControl: "",
      capitalApertura: "",
    }),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0),
    [conflict, setConflict] = useState(false);
  const initialized = useRef(false),
    attempt = useRef(crypto.randomUUID()),
    alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    api(base + "/" + id)
      .then((d) => {
        if (!live) return;
        setData(d);
        if (!initialized.current) {
          setForm({
            nombre: d.item.nombre,
            inicioControl: d.item.inicioControl ?? "",
            capitalApertura: d.item.capitalApertura ?? "",
          });
          initialized.current = true;
        }
        setConflict(false);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id, retry]);
  const back = () =>
    go(
      !id && referenceReturn
        ? referenceReturn.path
        : id
          ? base + "/" + id
          : base,
    );
  async function save() {
    setBusy(true);
    setError("");
    setFields({});
    try {
      const payload: Record<string, unknown> = {
        nombre: form.nombre,
        ...(id ? { revision: data!.item.revision } : {}),
      };
      for (const k of ["inicioControl", "capitalApertura"] as const)
        if (!id || form[k] !== (data!.item[k] ?? ""))
          payload[k] =
            k === "capitalApertura" ? form[k].replace(",", ".") : form[k];
      const r = await api(
        base + (id ? "/" + id : ""),
        id ? "PATCH" : "POST",
        payload,
        id ? {} : { "idempotency-key": attempt.current },
      );
      go(
        !id && referenceReturn ? referenceReturn.path : base + "/" + r.item.id,
      );
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      setFields(err.fields ?? {});
      setConflict(err.status === 409);
      requestAnimationFrame(() => alert.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        eyebrow={id ?? "NUEVA DEUDA"}
        title={id ? "Editar deuda" : "Nueva deuda"}
        description="Sin hechos automáticos ni cuotas programadas"
      />
      {error && (
        <div tabIndex={-1} ref={alert}>
          <Alert>
            {error}
            {conflict && (
              <button
                className="secondary"
                onClick={() => {
                  setError("");
                  setRetry((v) => v + 1);
                }}
              >
                Actualizar contexto
              </button>
            )}
          </Alert>
        </div>
      )}
      {id && !data ? (
        !error && <p role="status">Cargando Deuda…</p>
      ) : (
        <form
          className="saldo-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <section className="panel">
            <h2>Identificación y apertura</h2>
            {id && <p>ID inmutable: {id}</p>}
            <div className="form-grid">
              {(["nombre", "inicioControl", "capitalApertura"] as const).map(
                (k) => (
                  <label key={k}>
                    {k === "nombre"
                      ? "Nombre de Deuda *"
                      : k === "inicioControl"
                        ? "Inicio control *"
                        : "Capital apertura EUR *"}
                    <input
                      aria-label={
                        k === "nombre"
                          ? "Nombre de Deuda *"
                          : k === "inicioControl"
                            ? "Inicio control *"
                            : "Capital apertura EUR *"
                      }
                      type={k === "inicioControl" ? "date" : "text"}
                      inputMode={
                        k === "capitalApertura" ? "decimal" : undefined
                      }
                      value={form[k]}
                      maxLength={k === "nombre" ? 120 : undefined}
                      disabled={k !== "nombre" && !!data?.usos.length}
                      aria-invalid={!!fields[k]}
                      aria-describedby={
                        fields[k] ? "debt-" + k + "-error" : undefined
                      }
                      onChange={(e) => {
                        setForm((v) => ({ ...v, [k]: e.target.value }));
                        attempt.current = crypto.randomUUID();
                        setError("");
                        setFields((v) => ({ ...v, [k]: "" }));
                      }}
                    />
                    {fields[k] && (
                      <span id={"debt-" + k + "-error"} className="field-error">
                        {fields[k]}
                      </span>
                    )}
                  </label>
                ),
              )}
            </div>
            <p className="help">
              Apertura explícita, sin precargar cero. Inicio control y apertura
              quedan protegidos cuando la Deuda tiene movimientos, incluidos
              anulados. No se exige Fecha inicio deuda ni TIN/TAE.
            </p>
          </section>
          <div className="form-footer">
            <span>Estado inicial Activa · EUR exacto</span>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={back}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy || conflict}>
                {busy ? "Guardando…" : "Guardar deuda"}
              </button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
