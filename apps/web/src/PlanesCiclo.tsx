import { useEffect, useRef, useState } from "react";
import { api, eur, ApiError } from "./api";
import { Alert, PageHead } from "./ui";
type Budget = { id: string; nombre: string; fuente: string; estado: string };
type Line = {
  presupuesto: string;
  base: string | null;
  esencial: string | null;
  delMes: string | null;
};
type Item = {
  presupuesto: Budget;
  linea: Line | null;
  aTransferir: string | null;
  ejecutado: string | null;
  pendiente: string | null;
  estado: string | null;
  motivo: string | null;
  sinPlanificar: boolean;
};
type Plan = {
  ciclo: {
    id: string;
    inicio: string;
    fin: string | null;
    corte: string | null;
  };
  revision: number;
  contextRevision: string;
  sinPlan: boolean;
  items: Item[];
  auditoria: {
    id: number;
    instante: string;
    presupuesto: string;
    delta: string;
    motivo: string | null;
  }[];
};
const labels = { base: "Base", esencial: "Esencial", delMes: "Del mes" };
const amount = (n: string | null) => (n === null ? "—" : eur(n));
export function PlanesCiclo({ go }: { go: (p: string) => void }) {
  const [cycles, setCycles] = useState<{ id: string; inicio: string }[]>([]),
    [selected, setSelected] = useState(""),
    [plan, setPlan] = useState<Plan | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [catalogLoading, setCatalogLoading] = useState(true),
    [notice, setNotice] = useState("");
  const [edit, setEdit] = useState(""),
    [draft, setDraft] = useState({ base: "", esencial: "", delMes: "" }),
    [copy, setCopy] = useState(false),
    [source, setSource] = useState(""),
    [fields, setFields] = useState<string[]>(["base", "esencial"]),
    [review, setReview] = useState<any>(null),
    [proposal, setProposal] = useState<any>(null),
    [reason, setReason] = useState(""),
    [key, setKey] = useState(crypto.randomUUID()),
    [detail, setDetail] = useState<any>(null),
    [detailId, setDetailId] = useState(""),
    [busy, setBusy] = useState(false),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const reviewRef = useRef<HTMLElement>(null),
    errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
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
        if (live) {
          setCycles(all);
          if (all.length) setSelected(all[0].id);
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      } finally {
        if (live) setCatalogLoading(false);
      }
    }
    void catalog();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (review) reviewRef.current?.focus();
  }, [review]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function load(id = selected) {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      setPlan(await api("/planes-ciclo/" + id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let live = true;
    setPlan(null);
    setLoading(true);
    setError("");
    if (selected)
      api<Plan>("/planes-ciclo/" + selected)
        .then((d) => {
          if (live) setPlan(d);
        })
        .catch((e) => {
          if (live) setError(e.message);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    else setLoading(false);
    return () => {
      live = false;
    };
  }, [selected]);
  function begin(id: string) {
    const item = plan!.items.find((i) => i.presupuesto.id === id)!;
    setEdit(id);
    setDraft({
      base: item.linea?.base ?? "",
      esencial: item.linea?.esencial ?? "",
      delMes: item.linea?.delMes ?? "",
    });
    setCopy(false);
    setReview(null);
    setError("");
    setFieldErrors({});
    setNotice("");
  }
  function clear() {
    setEdit("");
    setCopy(false);
    setReview(null);
    setReason("");
    setProposal(null);
    setKey(crypto.randomUUID());
    setFieldErrors({});
  }
  async function preview() {
    if (!plan) return;
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const p = {
        revision: plan.revision,
        contextRevision: plan.contextRevision,
        ...(copy
          ? { copia: { ciclo: source, campos: fields } }
          : {
              cambios: [
                {
                  presupuesto: edit,
                  ...Object.fromEntries(
                    Object.entries(draft).map(([k, v]) => [
                      k,
                      v.trim() === "" ? null : v.replace(",", "."),
                    ]),
                  ),
                },
              ],
            }),
      };
      setProposal(p);
      setReview(await api("/planes-ciclo/" + selected + "/impacto", "POST", p));
      setKey(crypto.randomUUID());
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const result = await api<Plan>(
        "/planes-ciclo/" + selected + "/confirmar",
        "POST",
        {
          propuesta: proposal,
          fingerprint: review.fingerprint,
          motivo: reason,
        },
        { "idempotency-key": key },
      );
      setPlan(result);
      setNotice(review.sinCambios ? "Sin cambios" : "Plan guardado.");
      clear();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  async function showDetail(id: string, page = 1) {
    const cycle = selected;
    setError("");
    try {
      const data = await api(
        `/planes-ciclo/${cycle}/ejecucion/${id}?page=${page}`,
      );
      if (selectedRef.current === cycle) {
        setDetail(data);
        setDetailId(id);
      }
    } catch (e) {
      if (selectedRef.current === cycle) setError((e as Error).message);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="PLANIFICACIÓN"
        title="Plan del ciclo"
        description="Importes del ciclo y ejecución real por Presupuesto."
      />
      <div ref={errorRef} tabIndex={-1}>
        {error && (
          <Alert retry={() => load()}>
            {error} El borrador se conserva. Actualiza contexto y vuelve a
            revisar.
          </Alert>
        )}
      </div>
      {notice && <p role="status">{notice}</p>}
      <section className="panel plan-controls">
        <label>
          Ciclo
          <select
            aria-label="Ciclo del plan"
            value={selected}
            disabled={!!edit || copy || busy}
            onChange={(e) => {
              setSelected(e.target.value);
              setDetail(null);
              setNotice("");
            }}
          >
            <option value="">Seleccionar ciclo</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.inicio} · Ciclo {c.id}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary"
          onClick={() => load()}
          disabled={!selected || busy}
        >
          Actualizar contexto
        </button>
      </section>
      {(loading || catalogLoading) && <p role="status">Cargando plan…</p>}
      {!cycles.length && !loading && !catalogLoading && !error && (
        <p>Sin ciclos. Crea primero un Ciclo.</p>
      )}
      {plan && !loading && (
        <>
          <p>
            Periodo: {plan.ciclo.inicio} —{" "}
            {plan.ciclo.fin ??
              plan.ciclo.corte ??
              "Periodo/corte no verificable"}
            . El fin temporal no equivale a cierre financiero.
          </p>
          {plan.sinPlan && (
            <section className="panel">
              <h2>Sin plan</h2>
              <p>
                Todavía no hay líneas de planificación. La lectura no crea
                importes ni objetivos.
              </p>
            </section>
          )}
          {!edit && !copy && (
            <div className="actions">
              <label>
                Añadir Presupuesto
                <select
                  aria-label="Añadir Presupuesto al plan"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) begin(e.target.value);
                  }}
                >
                  <option value="">Seleccionar Presupuesto activo</option>
                  {plan.items
                    .filter(
                      (i) => !i.linea && i.presupuesto.estado === "Activo",
                    )
                    .map((i) => (
                      <option key={i.presupuesto.id} value={i.presupuesto.id}>
                        {i.presupuesto.nombre} · {i.presupuesto.id}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="secondary"
                onClick={() => {
                  setCopy(true);
                  setEdit("");
                  setReview(null);
                  setFields(["base", "esencial"]);
                  setSource("");
                  setReason("");
                  setNotice("");
                }}
              >
                Copiar desde otro ciclo
              </button>
            </div>
          )}
          <div className="desktop-list plan-table">
            <table>
              <thead>
                <tr>
                  <th>Presupuesto / Fuente</th>
                  <th>Base</th>
                  <th>Esencial</th>
                  <th>Del mes</th>
                  <th>A transferir</th>
                  <th>Ejecutado</th>
                  <th>Pendiente / Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plan.items
                  .filter((i) => i.linea || i.sinPlanificar)
                  .map((i) => (
                    <tr key={i.presupuesto.id} className="plan-row">
                      <td>
                        <a
                          href={"/presupuestos/" + i.presupuesto.id}
                          onClick={(e) => {
                            e.preventDefault();
                            go("/presupuestos/" + i.presupuesto.id);
                          }}
                        >
                          {i.presupuesto.nombre}
                        </a>
                        <p>
                          {i.presupuesto.id} · {i.presupuesto.fuente}
                          {i.presupuesto.estado === "Inactivo" && " · Inactivo"}
                        </p>
                        <p>
                          {i.motivo ??
                            (i.sinPlanificar
                              ? "Sin planificar · Sin línea del plan"
                              : i.linea?.delMes === null
                                ? "Sin importe del mes · Línea existente"
                                : "")}
                        </p>
                      </td>
                      <td>{amount(i.linea?.base ?? null)}</td>
                      <td>{amount(i.linea?.esencial ?? null)}</td>
                      <td>{amount(i.linea?.delMes ?? null)}</td>
                      <td>{amount(i.aTransferir)}</td>
                      <td>{amount(i.ejecutado)}</td>
                      <td>
                        {amount(i.pendiente)}
                        <p>{i.estado ?? "—"}</p>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="secondary"
                            onClick={() => showDetail(i.presupuesto.id)}
                          >
                            Ver ejecución de {i.presupuesto.nombre}
                          </button>
                          {i.linea && (
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() => begin(i.presupuesto.id)}
                            >
                              Editar {i.presupuesto.nombre}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="plan-grid mobile-list">
            {plan.items
              .filter((i) => i.linea || i.sinPlanificar)
              .map((i) => (
                <article key={i.presupuesto.id} className="panel plan-card">
                  <h2>
                    <a
                      href={"/presupuestos/" + i.presupuesto.id}
                      onClick={(e) => {
                        e.preventDefault();
                        go("/presupuestos/" + i.presupuesto.id);
                      }}
                    >
                      {i.presupuesto.nombre}
                    </a>
                  </h2>
                  <p>
                    {i.presupuesto.id} · {i.presupuesto.fuente}{" "}
                    {i.presupuesto.estado === "Inactivo" && (
                      <strong> · Inactivo</strong>
                    )}
                  </p>
                  <dl className="plan-values">
                    {Object.entries(labels).map(([f, label]) => (
                      <div key={f}>
                        <dt>{label}</dt>
                        <dd>
                          {amount(i.linea?.[f as keyof typeof labels] ?? null)}
                        </dd>
                      </div>
                    ))}
                    <div>
                      <dt>A transferir</dt>
                      <dd>{amount(i.aTransferir)}</dd>
                    </div>
                    <div>
                      <dt>Ejecutado</dt>
                      <dd>{amount(i.ejecutado)}</dd>
                    </div>
                    <div>
                      <dt>Pendiente</dt>
                      <dd>{amount(i.pendiente)}</dd>
                    </div>
                    <div>
                      <dt>Estado</dt>
                      <dd>{i.estado ?? "—"}</dd>
                    </div>
                  </dl>
                  <p>
                    {i.motivo ??
                      (i.sinPlanificar
                        ? "Sin planificar · Sin línea del plan"
                        : i.linea?.delMes === null
                          ? "Sin importe del mes · Línea existente"
                          : "")}
                  </p>
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() => showDetail(i.presupuesto.id)}
                    >
                      Ver ejecución de {i.presupuesto.nombre}
                    </button>
                    {i.linea && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => begin(i.presupuesto.id)}
                      >
                        Editar {i.presupuesto.nombre}
                      </button>
                    )}
                  </div>
                </article>
              ))}
          </div>
          {plan.items.filter(
            (i) => !i.linea && i.motivo && i.presupuesto.estado === "Activo",
          ).length > 0 && (
            <details className="panel">
              <summary>Cobertura de Presupuestos sin línea</summary>
              {plan.items
                .filter(
                  (i) =>
                    !i.linea && i.motivo && i.presupuesto.estado === "Activo",
                )
                .map((i) => (
                  <p key={i.presupuesto.id}>
                    {i.presupuesto.nombre}: {i.motivo}
                  </p>
                ))}
            </details>
          )}
          {(edit || copy) && (
            <section className="panel">
              <h2>{copy ? "Copiar plan" : "Editar línea del plan"}</h2>
              {copy ? (
                <>
                  <label>
                    Ciclo origen
                    <select
                      aria-label="Ciclo origen"
                      value={source}
                      onChange={(e) => {
                        setSource(e.target.value);
                        setReview(null);
                      }}
                    >
                      <option value="">Seleccionar origen</option>
                      {cycles
                        .filter((c) => c.id !== selected)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.inicio} · {c.id}
                          </option>
                        ))}
                    </select>
                  </label>
                  <fieldset>
                    <legend>Campos a copiar</legend>
                    {Object.entries(labels).map(([f, l]) => (
                      <label key={f}>
                        <input
                          type="checkbox"
                          checked={fields.includes(f)}
                          onChange={(e) => {
                            setFields((old) =>
                              e.target.checked
                                ? [...old, f]
                                : old.filter((v) => v !== f),
                            );
                            setReview(null);
                          }}
                        />
                        {l}
                      </label>
                    ))}
                  </fieldset>
                  <p>
                    Solo campos vacíos; cero se conserva. No se copian derivados
                    ni se modifica el origen.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Vacío = no informado; 0 = importe decidido. A transferir
                    coincide con Del mes; no crea Transferencias.
                  </p>
                  <div className="form-grid">
                    {Object.entries(labels).map(([f, l]) => (
                      <label key={f}>
                        {l}
                        <input
                          aria-label={l}
                          inputMode="decimal"
                          value={draft[f as keyof typeof draft]}
                          aria-invalid={!!fieldErrors[f]}
                          aria-describedby={
                            fieldErrors[f] ? "plan-error-" + f : undefined
                          }
                          onChange={(e) => {
                            setDraft((d) => ({ ...d, [f]: e.target.value }));
                            setReview(null);
                          }}
                        />
                        {fieldErrors[f] && (
                          <span id={"plan-error-" + f}>{fieldErrors[f]}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </>
              )}
              <div className="actions">
                <button className="primary" disabled={busy} onClick={preview}>
                  Revisar cambios del plan
                </button>
                <button className="secondary" disabled={busy} onClick={clear}>
                  Cancelar edición
                </button>
              </div>
              {review && (
                <section
                  ref={reviewRef}
                  tabIndex={-1}
                  aria-label="Revisión del plan"
                >
                  <h3>Revisión del plan</h3>
                  {review.sinCambios ? (
                    <p>Sin cambios</p>
                  ) : (
                    review.cambios.map((l: Line) => {
                      const old = plan.items.find(
                        (i) => i.presupuesto.id === l.presupuesto,
                      );
                      const after = review.despues.find(
                        (i: Item) => i.presupuesto.id === l.presupuesto,
                      );
                      return (
                        <div key={l.presupuesto} className="panel">
                          <h4>
                            {old?.presupuesto.nombre} · {l.presupuesto}
                          </h4>
                          {Object.entries(labels).map(([f, label]) => (
                            <p key={f}>
                              {label}:{" "}
                              {amount(
                                old?.linea?.[f as keyof typeof labels] ?? null,
                              )}{" "}
                              →{" "}
                              {amount(
                                l[f as keyof typeof labels] === null
                                  ? null
                                  : (
                                      BigInt(l[f as keyof typeof labels]!) /
                                      100n
                                    ).toString() +
                                      "." +
                                      (
                                        BigInt(l[f as keyof typeof labels]!) %
                                        100n
                                      )
                                        .toString()
                                        .padStart(2, "0"),
                              )}
                            </p>
                          ))}
                          <p>
                            Pendiente: {amount(old?.pendiente ?? null)} →{" "}
                            {amount(after.pendiente)}. Estado:{" "}
                            {old?.estado ?? "—"} → {after.estado ?? "—"}
                          </p>
                        </div>
                      );
                    })
                  )}
                  {review.omisiones.map((o: any, index: number) => (
                    <p key={index}>
                      {o.presupuesto} · {labels[o.campo as keyof typeof labels]}
                      : {o.motivo}
                    </p>
                  ))}
                  <label>
                    Motivo{" "}
                    {review.requiereMotivo ? "(obligatorio)" : "(opcional)"}
                    <textarea
                      aria-label="Motivo del cambio de plan"
                      maxLength={2000}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <div className="actions">
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={confirm}
                    >
                      Confirmar cambios del plan
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => setReview(null)}
                    >
                      Volver al borrador
                    </button>
                  </div>
                </section>
              )}
            </section>
          )}
          {detail && (
            <section className="panel" aria-label="Detalle de ejecución">
              <h2>Detalle de ejecución · {detail.presupuesto.nombre}</h2>
              <p>
                Total ejecutado: {amount(detail.ejecutado)}. {detail.motivo} ·{" "}
                {detail.total} hechos elegibles.
              </p>
              <p>
                Solo hechos vigentes del periodo. Gasto real incluye cuotas y
                Referencias; Aportación excluye Referencias y origen Exterior.
              </p>
              {detail.items.map((m: any) => (
                <p key={m.id}>
                  <a
                    href={"/movimientos/" + m.id}
                    onClick={(e) => {
                      e.preventDefault();
                      go("/movimientos/" + m.id);
                    }}
                  >
                    {m.fecha} · {m.tipo} · {amount(m.importe)}
                  </a>
                </p>
              ))}
              <div className="actions">
                <button
                  className="secondary"
                  disabled={detail.page === 1}
                  onClick={() => showDetail(detailId, detail.page - 1)}
                >
                  Página anterior de ejecución
                </button>
                <button
                  className="secondary"
                  disabled={detail.page * 100 >= detail.total}
                  onClick={() => showDetail(detailId, detail.page + 1)}
                >
                  Página siguiente de ejecución
                </button>
                <button className="secondary" onClick={() => setDetail(null)}>
                  Cerrar detalle
                </button>
              </div>
            </section>
          )}
          <details className="panel">
            <summary>Historial de cambios del plan</summary>
            {plan.auditoria.map((a) => (
              <div key={a.id}>
                <p>
                  {a.instante} · {a.presupuesto} ·{" "}
                  {a.motivo ?? "Captura inicial"}
                </p>
                <dl>
                  {Object.entries(
                    JSON.parse(a.delta) as Record<
                      string,
                      { anterior: string | null; posterior: string | null }
                    >,
                  ).map(([field, delta]) => (
                    <div key={field}>
                      <dt>{labels[field as keyof typeof labels]}</dt>
                      <dd>
                        {amount(delta.anterior)} → {amount(delta.posterior)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </details>
        </>
      )}
    </>
  );
}
