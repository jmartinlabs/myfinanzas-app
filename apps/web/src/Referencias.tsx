import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import { Alert, PageHead, Tag } from "./ui";
import { referenceReturn } from "./movement-draft";
import { VehicleForm } from "./Vehiculos";
export type Reference = {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  revision: number;
};
type Usage = { id: string; fecha: string; tipo: string; anulado: number };
type VehicleFicha = {
  referencia: string;
  matricula: string | null;
  proximaITV: string | null;
  cita: string | null;
  revision: number;
};
const base = "/referencias";
export function Referencias({
  path,
  go,
}: {
  path: string;
  go: (p: string) => void;
}) {
  if (path === base) return <ReferenceList go={go} />;
  if (path === base + "/nueva") return <ReferenceForm key="nueva" go={go} />;
  const conversion = path.match(/^\/referencias\/(REF\d+)\/convertir$/);
  if (conversion)
    return <VehicleForm key={path} conversionId={conversion[1]} go={go} />;
  const m = path.match(/^\/referencias\/(REF\d+)(?:\/(editar))?$/);
  if (m)
    return m[2] ? (
      <ReferenceForm key={path} id={m[1]} go={go} />
    ) : (
      <ReferenceDetail key={path} id={m[1]} go={go} />
    );
  return <Alert>Página no encontrada.</Alert>;
}
function ReferenceList({ go }: { go: (p: string) => void }) {
  const [filters, setFilters] = useState({ q: "", tipo: "", estado: "Activa" }),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0),
    [data, setData] = useState<{ items: Reference[]; total: number } | null>(
      null,
    ),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api(base + "?" + new URLSearchParams({ ...filters, page: String(page) }))
      .then((r) => {
        if (live) setData(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [filters, page, retry]);
  const change = (key: string, value: string) => {
    setFilters((v) => ({ ...v, [key]: value }));
    setPage(1);
  };
  const link = (r: Reference) => (
    <a
      href={base + "/" + r.id}
      onClick={(e) => {
        e.preventDefault();
        go(base + "/" + r.id);
      }}
    >
      {r.nombre}
    </a>
  );
  return (
    <>
      <PageHead
        eyebrow="CASOS IDENTIFICABLES"
        title="Referencias"
        description="Un único maestro · Viajes, Eventos, Anticipos y Vehículos"
      >
        <button className="primary" onClick={() => go(base + "/nueva")}>
          Nueva referencia
        </button>
      </PageHead>
      <p className="help">
        Cada caso conserva una identidad estable. Los Vehículos añaden su ficha
        1:1 y su gasto anual sin crear maestros paralelos.{" "}
        <a
          href="/vehiculos/nuevo"
          onClick={(e) => {
            e.preventDefault();
            go("/vehiculos/nuevo");
          }}
        >
          Nuevo vehículo
        </a>
      </p>
      <section
        className="panel catalog-panel references-list"
        aria-label="Catálogo de Referencias"
      >
        <div className="filters">
          <label>
            Buscar nombre o ID
            <input
              type="search"
              value={filters.q}
              onChange={(e) => change("q", e.target.value)}
            />
          </label>
          <label>
            Tipo de Referencia
            <select
              aria-label="Tipo de Referencia"
              value={filters.tipo}
              onChange={(e) => change("tipo", e.target.value)}
            >
              <option value="">Todos</option>
              <option>Viaje</option>
              <option>Evento</option>
              <option>Anticipo</option>
              <option>Vehículo</option>
            </select>
          </label>
          <label>
            Estado de Referencia
            <select
              aria-label="Estado de Referencia"
              value={filters.estado}
              onChange={(e) => change("estado", e.target.value)}
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
          <p role="status">Cargando Referencias…</p>
        ) : !data.items.length ? (
          <div className="empty">
            <h2>
              {filters.q || filters.tipo || filters.estado !== "Activa"
                ? "Sin coincidencias"
                : "Todavía no hay referencias"}
            </h2>
            <p>Crea una Referencia para identificar un caso concreto.</p>
          </div>
        ) : (
          <>
            <p role="status">{data.total} referencias</p>
            <div className="desktop-list">
              <table>
                <caption className="sr-only">Referencias</caption>
                <thead>
                  <tr>
                    <th scope="col">Nombre / ID</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {link(r)}
                        <small className="table-id">{r.id}</small>
                      </td>
                      <td>{r.tipo}</td>
                      <td>
                        <Tag inactive={r.estado === "Inactiva"}>{r.estado}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mobile-list">
              {data.items.map((r) => (
                <li key={r.id}>
                  <div className="card-head">
                    <span>{r.tipo}</span>
                    <Tag inactive={r.estado === "Inactiva"}>{r.estado}</Tag>
                  </div>
                  <h2>{link(r)}</h2>
                  <p>{r.id}</p>
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
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              className="text-button"
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
function ReferenceDetail({ id, go }: { id: string; go: (p: string) => void }) {
  const [data, setData] = useState<{
      item: Reference;
      usos: Usage[];
      vehiculo: VehicleFicha | null;
      conversion: { disponible: boolean; motivo: string | null };
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
  useEffect(() => {
    if (data)
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("h1")?.focus(),
      );
  }, [data]);
  useEffect(() => {
    if (confirm)
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>("[data-reference-confirm]")
          ?.focus(),
      );
  }, [confirm]);
  const r = data?.item;
  return (
    <div className="reference-detail">
      <button className="text-button" onClick={() => go(base)}>
        Volver a Referencias
      </button>
      {error && <Alert retry={() => setRetry((v) => v + 1)}>{error}</Alert>}
      {!data ? (
        error ? null : (
          <p role="status">Cargando Referencia…</p>
        )
      ) : (
        <>
          <PageHead eyebrow={r!.id} title={r!.nombre} description={r!.tipo}>
            <Tag inactive={r!.estado === "Inactiva"}>{r!.estado}</Tag>
            <button
              className="secondary"
              onClick={() =>
                go(
                  r!.tipo === "Vehículo"
                    ? "/vehiculos/" + id + "/editar"
                    : base + "/" + id + "/editar",
                )
              }
            >
              {r!.tipo === "Vehículo" ? "Editar ficha" : "Editar referencia"}
            </button>
          </PageHead>
          <section className="panel">
            <h2>Identificación</h2>
            <dl>
              <div>
                <dt>ID estable</dt>
                <dd>{id}</dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{r!.tipo}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{r!.estado}</dd>
              </div>
            </dl>
            <p className="help">
              Viaje y Evento no necesitan ficha específica. Los Vehículos usan
              la Referencia como identidad y conservan su ficha 1:1. El nombre
              puede cambiar sin alterar sus enlaces.
            </p>
          </section>
          {r?.tipo === "Vehículo" && (
            <section className="panel">
              <h2>Ficha de Vehículo</h2>
              {data.vehiculo ? (
                <>
                  <dl>
                    <div>
                      <dt>Matrícula</dt>
                      <dd>{data.vehiculo.matricula ?? "Sin informar"}</dd>
                    </div>
                    <div>
                      <dt>Próxima ITV</dt>
                      <dd>{data.vehiculo.proximaITV ?? "No informada"}</dd>
                    </div>
                    <div>
                      <dt>Cita</dt>
                      <dd>{data.vehiculo.cita ?? "No informada"}</dd>
                    </div>
                  </dl>
                  <button
                    className="secondary"
                    onClick={() => go("/vehiculos/" + id)}
                  >
                    Consultar ficha y gasto anual
                  </button>
                </>
              ) : (
                <p>
                  Integridad: Revisar · la ficha no existe. No se crea ni repara
                  automáticamente.
                </p>
              )}
            </section>
          )}
          {r?.tipo !== "Vehículo" && (
            <section className="panel">
              <h2>Conversión a Vehículo</h2>
              {data.conversion.disponible ? (
                <>
                  <p>
                    La Referencia no tiene ficha ni hechos. La conversión crea
                    una ficha 1:1 en la misma transacción, conservando ID,
                    nombre e historial.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => go(base + "/" + id + "/convertir")}
                  >
                    Convertir a Vehículo
                  </button>
                </>
              ) : (
                <p className="help">{data.conversion.motivo}</p>
              )}
            </section>
          )}
          {r?.tipo === "Anticipo" && (
            <section className="panel">
              <h2>Ficha de Anticipo</h2>
              <button onClick={() => go("/anticipos/" + id)}>
                Consultar ficha de Anticipo
              </button>
            </section>
          )}
          <section className="panel">
            <h2>Movimientos vinculados</h2>
            <p>
              {data.usos.length} hechos, incluidos anulados. No se mezclan
              Transferencias con Gastos en un total económico.
            </p>
            <button
              className="secondary"
              onClick={() => go("/movimientos?referencia=" + id)}
            >
              Consultar movimientos de esta referencia
            </button>
          </section>
          <section className="panel">
            <h2>Disponibilidad</h2>
            <p>
              Desactivar impide nuevas selecciones, conservando todos los
              enlaces históricos.
            </p>
            {confirm ? (
              <div role="group" aria-label="Confirmar Estado">
                <p>
                  ¿{r!.estado === "Activa" ? "Desactivar" : "Reactivar"} {id}?
                </p>
                <div className="actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => setConfirm(false)}
                  >
                    Cancelar cambio de Estado
                  </button>
                  <button
                    className="primary"
                    data-reference-confirm
                    disabled={busy}
                    onClick={state}
                  >
                    Confirmar cambio de Estado
                  </button>
                </div>
              </div>
            ) : (
              <button className="secondary" onClick={() => setConfirm(true)}>
                {r!.estado === "Activa"
                  ? "Desactivar referencia"
                  : "Reactivar referencia"}
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
function ReferenceForm({ id, go }: { id?: string; go: (p: string) => void }) {
  const [data, setData] = useState<{
      item: Reference;
      usos: Usage[];
      vehiculo: VehicleFicha | null;
      conversion: { disponible: boolean; motivo: string | null };
    } | null>(null),
    [name, setName] = useState(""),
    [type, setType] = useState(""),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0),
    [conflict, setConflict] = useState(false);
  const attempt = useRef(crypto.randomUUID()),
    initialized = useRef(false),
    alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    api(base + "/" + id)
      .then((d) => {
        if (!live) return;
        setData(d);
        if (!initialized.current) {
          setName(d.item.nombre);
          setType(d.item.tipo);
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
      const r = await api(
        base + (id ? "/" + id : ""),
        id ? "PATCH" : "POST",
        {
          nombre: name,
          tipo: type,
          ...(id ? { revision: data!.item.revision } : {}),
        },
        id ? {} : { "idempotency-key": attempt.current },
      );
      if (!id && referenceReturn) go(referenceReturn.path);
      else go(base + "/" + r.item.id);
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
  if (data?.item.tipo === "Vehículo")
    return (
      <>
        <PageHead
          eyebrow={id!}
          title={data.item.nombre}
          description="Vehículo · ficha 1:1"
        />
        <section className="panel">
          <h2>Edición de vehículo</h2>
          <p>
            El nombre, la matrícula y las fechas se editan en la ficha, donde
            también se confirman los duplicados por dimensión.
          </p>
          <button
            className="primary"
            onClick={() => go("/vehiculos/" + id + "/editar")}
          >
            Abrir ficha de vehículo
          </button>
        </section>
      </>
    );
  return (
    <>
      <PageHead
        eyebrow={id ?? "NUEVO CASO"}
        title={id ? "Editar referencia" : "Nueva referencia"}
        description="Identidad estable · sin operaciones automáticas"
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
        error ? (
          <button
            className="secondary"
            onClick={() => {
              setError("");
              setRetry((v) => v + 1);
            }}
          >
            Reintentar carga
          </button>
        ) : (
          <p role="status">Cargando Referencia…</p>
        )
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="saldo-form"
        >
          <section className="panel">
            <h2>Identificación</h2>
            {id && <p>ID inmutable: {id}</p>}
            <div className="form-grid">
              <label>
                Nombre *
                <input
                  aria-label="Nombre de Referencia *"
                  maxLength={120}
                  value={name}
                  aria-invalid={!!fields.nombre}
                  aria-describedby={
                    fields.nombre ? "ref-name-error" : undefined
                  }
                  onChange={(e) => {
                    setName(e.target.value);
                    setFields((v) => ({ ...v, nombre: "" }));
                    setError("");
                    attempt.current = crypto.randomUUID();
                  }}
                />
                {fields.nombre && (
                  <span className="field-error" id="ref-name-error">
                    {fields.nombre}
                  </span>
                )}
              </label>
              <label>
                Tipo de Referencia *
                <select
                  aria-label="Tipo de Referencia *"
                  value={type}
                  disabled={
                    !!data?.usos.length || data?.item.tipo === "Vehículo"
                  }
                  aria-invalid={!!fields.tipo}
                  aria-describedby={fields.tipo ? "ref-type-error" : undefined}
                  onChange={(e) => {
                    setType(e.target.value);
                    setFields((v) => ({ ...v, tipo: "" }));
                    setError("");
                    attempt.current = crypto.randomUUID();
                  }}
                >
                  <option value="">Selecciona</option>
                  <option>Viaje</option>
                  <option>Evento</option>
                  <option>Anticipo</option>
                  {type === "Vehículo" && <option>Vehículo</option>}
                </select>
                {fields.tipo && (
                  <span className="field-error" id="ref-type-error">
                    {fields.tipo}
                  </span>
                )}
              </label>
            </div>
            {!!data?.usos.length && (
              <p className="help">
                Tipo protegido: hay movimientos vinculados, incluidos anulados.
                No se reclasifica la historia al editar.
              </p>
            )}
            <p className="help">
              Estado inicial Activa. El alta de Vehículo se realiza desde
              «Nuevo vehículo» para crear la ficha 1:1 en la misma transacción.
            </p>
          </section>
          <div className="form-footer">
            <span>Sin importes ni cálculos propios</span>
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
                {busy ? "Guardando…" : "Guardar referencia"}
              </button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
