import { useEffect, useRef, useState } from "react";
import { api, eur } from "./api";
import { Alert, PageHead, Tag } from "./ui";
import { preserveMovement } from "./movement-draft";
export type Anticipo = {
  saldos: { id: string; nombre: string }[];
  auditoria: {
    id: number;
    accion: string;
    anterior: string | null;
    posterior: string;
    motivo: string | null;
    instante: string;
  }[];
  referencia: { id: string; nombre: string; estado: string };
  ficha: { creado: string };
  contexto: string;
  cobertura: string;
  pendientes: number;
  adelantado: string | null;
  recuperado: string | null;
  neto: string | null;
  exceso: string | null;
  estado: string;
  primerAdelanto: string | null;
  ultimaActividad: string | null;
  fechaApertura: {
    fecha: string | null;
    tipo: string;
    evidencia: string | null;
  };
  pares: {
    origen: string;
    destino: string;
    adelantado: string;
    recuperado: string;
    neto: string;
    disponible: boolean;
    motivo: string | null;
  }[];
  operaciones: {
    id: string;
    fecha: string;
    tipo: string;
    importe: string;
    origen: string;
    destino: string;
    revision: number;
    anulado: boolean;
    elegible: boolean;
    estado: string;
    motivo: string | null;
    atribucion: { rol: string; evidencia: string; procedencia: string } | null;
  }[];
  fotos: {
    ciclo: string;
    inicio: string;
    importe: string;
    evidencia: string;
    procedencia: string;
    cobertura: string;
    confirmado: string;
    revision: number;
  }[];
  ciclos: { id: string; inicio: string }[];
};
const base = "/anticipos/fichas",
  date = (s: string | null) =>
    s ? s.split("-").reverse().join("/") : "No disponible",
  amount = (s: string | null) => (s === null ? "No disponible" : eur(s));
export function Anticipos({
  path,
  go,
}: {
  path: string;
  go: (p: string) => void;
}) {
  const id = path.match(/^\/anticipos\/(REF\d+)$/)?.[1],
    creating = path === "/anticipos/nuevo";
  const [data, setData] = useState<Anticipo | null>(null),
    [list, setList] = useState<{
      items: Anticipo[];
      total: number;
      page: number;
    } | null>(null),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [pair, setPair] = useState(""),
    [action, setAction] = useState(""),
    [plan, setPlan] = useState<any>(null);
  const [form, setForm] = useState({
    nombre: "",
    apertura: "",
    evidencia: "",
    procedencia: "",
    ciclo: "",
    importe: "",
    coberturaVerificada: false,
    motivo: "",
    rol: "",
    par: "",
  });
  const attempt = useRef(crypto.randomUUID()),
    alert = useRef<HTMLDivElement>(null),
    request = useRef(0);
  const change = (key: keyof typeof form, value: string | boolean) => {
    request.current++;
    setForm((f) => ({ ...f, [key]: value }));
    setPlan(null);
    setError("");
    attempt.current = crypto.randomUUID();
  };
  useEffect(() => {
    setData(null);
    setList(null);
    setAction("");
    setPlan(null);
    setPair("");
    setError("");
  }, [id, creating]);
  useEffect(() => {
    let live = true;
    setError("");
    if (creating) return;
    api(id ? base + "/" + id : base + "?page=" + page)
      .then((d) => {
        if (live) {
          if (id) setData(d);
          else setList(d);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id, creating, page, refresh]);
  useEffect(() => {
    if (data) {
      const available = data.pares.filter((p) => p.disponible);
      if (available.length === 1)
        setPair(available[0].origen + ">" + available[0].destino);
    }
  }, [data?.contexto]);
  useEffect(() => {
    if (plan)
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(".anticipo-review h2")?.focus(),
      );
  }, [plan]);
  function failed(e: any) {
    setError(e.message);
    requestAnimationFrame(() => alert.current?.focus());
  }
  function start(next: string) {
    request.current++;
    setAction(next);
    setPlan(null);
    setError("");
    setForm((f) => ({
      ...f,
      evidencia: "",
      procedencia: "",
      ciclo: "",
      importe: "",
      coberturaVerificada: false,
      motivo: "",
      rol: "",
      par: "",
    }));
    attempt.current = crypto.randomUUID();
  }
  async function create() {
    setBusy(true);
    try {
      const r = await api<Anticipo>(
        base,
        "POST",
        {
          nombre: form.nombre,
          ...(form.apertura
            ? { apertura: form.apertura, evidencia: form.evidencia }
            : {}),
        },
        { "idempotency-key": attempt.current },
      );
      go("/anticipos/" + r.referencia.id);
    } catch (e) {
      failed(e);
    } finally {
      setBusy(false);
    }
  }
  function body() {
    if (action.startsWith("acreditar:")) {
      const o = data!.operaciones.find((o) => o.id === action.split(":")[1])!,
        p = data!.pares.find((p) => p.origen + ">" + p.destino === form.par);
      return {
        revision: o.revision,
        atribucion: {
          rol: form.rol,
          origen: form.rol === "Adelanto" ? o.origen : (p?.origen ?? ""),
          destino: form.rol === "Adelanto" ? o.destino : (p?.destino ?? ""),
          evidencia: form.evidencia,
          procedencia: form.procedencia,
        },
      };
    }
    const existing = data?.fotos.find((p) => p.ciclo === form.ciclo);
    return {
      ciclo: form.ciclo,
      importe: form.importe.replace(",", "."),
      evidencia: form.evidencia,
      procedencia: form.procedencia,
      coberturaVerificada: form.coberturaVerificada,
      ...(existing ? { revision: existing.revision, motivo: form.motivo } : {}),
    };
  }
  const endpoint = action.startsWith("acreditar:")
    ? base + "/" + id + "/movimientos/" + action.split(":")[1] + "/acreditar"
    : base + "/" + id + "/netos-apertura";
  async function review() {
    setBusy(true);
    const n = ++request.current;
    try {
      const p = await api(endpoint + "/preview", "POST", body());
      if (n === request.current) setPlan(p);
    } catch (e) {
      if (n === request.current) failed(e);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    try {
      const r = await api<Anticipo>(
        endpoint,
        "POST",
        {
          ...body(),
          contexto: plan.contexto,
          fingerprint: plan.fingerprint,
          confirmado: true,
        },
        { "idempotency-key": attempt.current },
      );
      setData(r);
      setPlan(null);
      setAction("");
    } catch (e) {
      failed(e);
    } finally {
      setBusy(false);
    }
  }
  const field = (key: keyof typeof form, label: string, type = "text") => (
    <label>
      {label}
      <input
        aria-label={label}
        type={type}
        value={String(form[key])}
        onChange={(e) => change(key, e.target.value)}
      />
    </label>
  );
  function returnTransfer() {
    const p = data!.pares.find((p) => p.origen + ">" + p.destino === pair);
    if (!p || !p.disponible) return;
    preserveMovement(
      "/movimientos/nuevo",
      {
        tipo: "Transferencia",
        referencia: id!,
        origen: p.destino,
        destino: p.origen,
        importe: p.neto.startsWith("-") ? "" : p.neto,
        rolAnticipo: "Devolución",
        parAnticipo: p.origen + ">" + p.destino,
        evidenciaAnticipo: "Declaración explícita de devolución",
        procedenciaAnticipo: "Ficha de Anticipo",
      },
      "",
    );
    go("/movimientos/nuevo");
  }
  const saldoName = (id: string) => {
    const s = data?.saldos.find((s) => s.id === id);
    return s ? s.id + " · " + s.nombre : id;
  };
  return (
    <div className="anticipo-page">
      <PageHead
        eyebrow="E3.1 · CASOS"
        title={
          creating
            ? "Nuevo Anticipo"
            : data
              ? data.referencia.id + " · " + data.referencia.nombre
              : "Anticipos"
        }
        description="Adelantos y devoluciones por caso · hechos acreditados"
      >
        <button
          className="secondary"
          onClick={() => go(creating || id ? "/anticipos" : "/anticipos/nuevo")}
        >
          {creating || id ? "Volver a Anticipos" : "Nuevo Anticipo"}
        </button>
      </PageHead>
      {error && (
        <div tabIndex={-1} ref={alert}>
          <Alert retry={() => setRefresh((x) => x + 1)}>{error}</Alert>
        </div>
      )}
      {creating ? (
        <form
          className="panel form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          {field("nombre", "Nombre del Anticipo")}
          {field("apertura", "Fecha apertura histórica (opcional)", "date")}
          {form.apertura && field("evidencia", "Evidencia de apertura Manual")}
          <p>
            Tipo Anticipo · Estado inicial Activa. Referencia y ficha se crean
            juntas.
          </p>
          <div className="form-actions">
            <button
              className="secondary"
              type="button"
              onClick={() => go("/anticipos")}
            >
              Cancelar
            </button>
            <button className="primary" disabled={busy}>
              Crear ficha
            </button>
          </div>
        </form>
      ) : id ? (
        data ? (
          <>
            <section className="panel">
              <h2>Estado del caso</h2>
              <Tag>ⓘ {data.estado}</Tag>
              <p>
                Cobertura: <strong>{data.cobertura}</strong>
                {data.pendientes > 0
                  ? ` · ${data.pendientes} hechos pendientes de atribución. Subtotales acreditados, parciales.`
                  : " · Hechos registrados acreditados"}
              </p>
              <div className="anticipo-metrics">
                {(
                  [
                    ["Adelantado", data.adelantado],
                    ["Recuperado", data.recuperado],
                    ["Neto pendiente", data.neto],
                    ["Exceso", data.exceso],
                  ] as const
                ).map(([label, value]) => (
                  <div className="metric" key={label}>
                    <span>{label}</span>
                    <strong>{amount(value)}</strong>
                    <small>{data.cobertura}</small>
                  </div>
                ))}
              </div>
              <dl className="detail-grid">
                <div>
                  <dt>Primer adelanto</dt>
                  <dd>{date(data.primerAdelanto)}</dd>
                </div>
                <div>
                  <dt>Última actividad</dt>
                  <dd>{date(data.ultimaActividad)}</dd>
                </div>
                <div>
                  <dt>Fecha apertura del caso · {data.fechaApertura.tipo}</dt>
                  <dd>
                    {date(data.fechaApertura.fecha)}
                    {data.fechaApertura.evidencia && (
                      <p>Evidencia: {data.fechaApertura.evidencia}</p>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Fecha técnica de creación · auditoría UTC</dt>
                  <dd>{data.ficha.creado}</dd>
                </div>
              </dl>
              <button
                className="secondary"
                onClick={() => go("/referencias/" + id)}
              >
                Consultar Referencia · {data.referencia.estado}
              </button>
            </section>
            <section className="panel">
              <h2>Registrar devolución</h2>
              <p>
                Selecciona un par acreditado. El formulario común conserva
                importe y fecha editables y exige revisar antes de guardar.
              </p>
              {data.pares.length ? (
                data.pares.map((p) => (
                  <label
                    className="anticipo-pair"
                    key={p.origen + ">" + p.destino}
                  >
                    <input
                      type="radio"
                      name="par-devolucion"
                      value={p.origen + ">" + p.destino}
                      checked={pair === p.origen + ">" + p.destino}
                      disabled={!p.disponible}
                      onChange={(e) => setPair(e.target.value)}
                    />
                    <span>
                      <strong>
                        {saldoName(p.origen)} → {saldoName(p.destino)}
                      </strong>
                      <br />
                      Adelantado {eur(p.adelantado)} · Recuperado{" "}
                      {eur(p.recuperado)} · Pendiente {eur(p.neto)}
                      {p.motivo && <p role="status">⚠ {p.motivo}</p>}
                    </span>
                  </label>
                ))
              ) : (
                <p role="status">
                  No disponible: sin par acreditado verificable. Consulta los
                  hechos para revisión.
                </p>
              )}
              <button
                className="primary"
                disabled={
                  !data.pares.some(
                    (p) => p.disponible && p.origen + ">" + p.destino === pair,
                  )
                }
                onClick={returnTransfer}
              >
                Registrar devolución
              </button>
            </section>
            <section className="panel">
              <h2>Operaciones y acreditación</h2>
              {data.operaciones.length > 0 && (
                <div className="desktop-list anticipo-table">
                  <table>
                    <caption>Hechos y roles por ID · {id}</caption>
                    <thead>
                      <tr>
                        <th>Fecha / ID</th>
                        <th>Rol acreditado</th>
                        <th>Importe</th>
                        <th>Origen → Destino</th>
                        <th>Estado / evidencia</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.operaciones.map((o) => (
                        <tr key={o.id}>
                          <td>
                            {date(o.fecha)}
                            <br />
                            Movimiento {o.id}
                          </td>
                          <td>{o.atribucion?.rol ?? "No disponible"}</td>
                          <td>{amount(o.importe)}</td>
                          <td>
                            {saldoName(o.origen)} → {saldoName(o.destino)}
                          </td>
                          <td>
                            <Tag>
                              {o.elegible ? "✓" : "⚠"} {o.estado}
                            </Tag>
                            <p>{o.motivo ?? o.atribucion?.evidencia}</p>
                            {o.atribucion && (
                              <small>{o.atribucion.procedencia}</small>
                            )}
                          </td>
                          <td>
                            <button
                              className="secondary"
                              onClick={() => go("/movimientos/" + o.id)}
                            >
                              Ver hecho {o.id}
                            </button>
                            {o.tipo === "Transferencia" && !o.anulado && (
                              <button
                                className="secondary"
                                onClick={() => start("acreditar:" + o.id)}
                              >
                                Acreditar Movimiento {o.id}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {data.operaciones.length ? (
                <div className="anticipo-cards">
                  {data.operaciones.map((o) => (
                    <article className="anticipo-operation" key={o.id}>
                      <h3>
                        Movimiento {o.id} ·{" "}
                        {o.atribucion?.rol ?? "Rol no acreditado"}
                      </h3>
                      <p>
                        {date(o.fecha)} · {amount(o.importe)} ·{" "}
                        {saldoName(o.origen)} → {saldoName(o.destino)} · {id}
                      </p>
                      <Tag>
                        {o.elegible ? "✓" : "⚠"} {o.estado}
                      </Tag>
                      {o.motivo && <p>{o.motivo}</p>}
                      {o.atribucion && (
                        <p>
                          Procedencia: {o.atribucion.procedencia} · Evidencia:{" "}
                          {o.atribucion.evidencia}
                        </p>
                      )}
                      <button
                        className="secondary"
                        onClick={() => go("/movimientos/" + o.id)}
                      >
                        Ver hecho {o.id}
                      </button>
                      {o.tipo === "Transferencia" && !o.anulado && (
                        <button
                          className="secondary"
                          onClick={() => start("acreditar:" + o.id)}
                        >
                          Acreditar Movimiento {o.id}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p>Sin operaciones registradas.</p>
              )}
            </section>
            <section className="panel">
              <h2>Neto apertura del ciclo</h2>
              {data.ciclos.length ? (
                data.ciclos.map((c) => {
                  const p = data.fotos.find((p) => p.ciclo === c.id);
                  return (
                    <article className="anticipo-operation" key={c.id}>
                      <h3>
                        Ciclo {c.id} · Inicio {date(c.inicio)}
                      </h3>
                      {p ? (
                        <>
                          <strong>{eur(p.importe)} · Confirmada</strong>
                          <p>
                            {p.cobertura} · Evidencia: {p.evidencia} ·
                            Procedencia: {p.procedencia}
                          </p>
                          <p>
                            Confirmación UTC: {p.confirmado} · revisión{" "}
                            {p.revision}
                          </p>
                        </>
                      ) : (
                        <p>
                          No disponible — sin fotografía confirmada. El
                          pendiente actual no sustituye la apertura.
                        </p>
                      )}
                    </article>
                  );
                })
              ) : (
                <p>No disponible: sin Ciclos registrados.</p>
              )}
              <button
                className="secondary"
                disabled={!data.ciclos.length}
                onClick={() => start("apertura")}
              >
                Confirmar Neto de apertura / solicitar corrección
              </button>
            </section>
            <section className="panel">
              <h2>Auditoría de atribuciones y aperturas</h2>
              {data.auditoria.length ? (
                data.auditoria.map((a) => (
                  <details key={a.id}>
                    <summary>
                      {a.accion} · {a.instante}
                    </summary>
                    <p>{a.motivo ?? "Confirmación explícita del usuario"}</p>
                    {a.anterior && <p>Original conservado: {a.anterior}</p>}
                    <p>Revisión confirmada: {a.posterior}</p>
                  </details>
                ))
              ) : (
                <p>Sin revisiones adicionales.</p>
              )}
            </section>
            {action && (
              <section className="panel">
                <h2>
                  {action.startsWith("acreditar:")
                    ? "Acreditar histórico · " + action.split(":")[1]
                    : "Confirmar Neto de apertura"}
                </h2>
                <form
                  className="form-grid"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void review();
                  }}
                >
                  {action.startsWith("acreditar:") ? (
                    <>
                      <p>
                        El hecho bancario conserva fecha, importe y dirección.
                        Solo cambia la atribución acreditada.
                      </p>
                      <label>
                        Rol acreditado
                        <select
                          aria-label="Rol acreditado"
                          value={form.rol}
                          onChange={(e) => change("rol", e.target.value)}
                        >
                          <option value="">Seleccionar rol</option>
                          <option>Adelanto</option>
                          <option>Devolución</option>
                        </select>
                      </label>
                      {form.rol === "Devolución" && (
                        <label>
                          Par acreditado
                          <select
                            aria-label="Par acreditado histórico"
                            value={form.par}
                            onChange={(e) => change("par", e.target.value)}
                          >
                            <option value="">Seleccionar par</option>
                            {data.pares.map((p) => (
                              <option
                                key={p.origen + ">" + p.destino}
                                value={p.origen + ">" + p.destino}
                              >
                                {saldoName(p.origen)} → {saldoName(p.destino)}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </>
                  ) : (
                    <>
                      <label>
                        Ciclo de apertura
                        <select
                          aria-label="Ciclo de apertura"
                          value={form.ciclo}
                          onChange={(e) => change("ciclo", e.target.value)}
                        >
                          <option value="">Seleccionar Ciclo</option>
                          {data.ciclos.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.id} · Inicio {date(c.inicio)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {field("importe", "Neto al instante de apertura EUR")}
                      {data.fotos.some((p) => p.ciclo === form.ciclo) &&
                        field("motivo", "Motivo de corrección excepcional")}
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={form.coberturaVerificada}
                          onChange={(e) =>
                            change("coberturaVerificada", e.target.checked)
                          }
                        />
                        La evidencia acredita el importe, la cobertura y el
                        instante de apertura, incluido orden del mismo día
                      </label>
                    </>
                  )}
                  {field("evidencia", "Evidencia identificable")}
                  {field("procedencia", "Fuente / procedencia")}
                  <div className="form-actions">
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => {
                        request.current++;
                        setAction("");
                        setPlan(null);
                      }}
                    >
                      Cancelar
                    </button>
                    <button className="secondary" disabled={busy}>
                      Revisar impacto
                    </button>
                  </div>
                </form>
              </section>
            )}
            {plan && (
              <section className="panel anticipo-review">
                <h2 tabIndex={-1}>Revisar y confirmar</h2>
                {action.startsWith("acreditar:") ? (
                  <>
                    <p>
                      Movimiento {plan.movimiento} · revisión {plan.revision} ·{" "}
                      {date(plan.hecho.fecha)} · {amount(plan.hecho.importe)} ·{" "}
                      {plan.hecho.origen} → {plan.hecho.destino}
                    </p>
                    <p>
                      Rol {plan.atribucion.rol} · par {plan.atribucion.origen} →{" "}
                      {plan.atribucion.destino}
                    </p>
                    <p>
                      Antes: Neto {amount(plan.impacto.antes.neto)} ·{" "}
                      {plan.impacto.antes.cobertura}. Después: Neto{" "}
                      {amount(plan.impacto.despues.neto)} ·{" "}
                      {plan.impacto.despues.cobertura}. {plan.impacto.cierres}
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Inicio financiero {date(plan.inicio)} · Neto{" "}
                      {amount(plan.importe)} · {plan.cobertura}
                    </p>
                    <p>
                      Sugerencia: {amount(plan.sugerencia)}.{" "}
                      {plan.motivoSugerencia}
                    </p>
                    <p>{plan.proteccion}</p>
                  </>
                )}
                <p>
                  Evidencia: {plan.evidencia ?? plan.atribucion?.evidencia} ·
                  Procedencia:{" "}
                  {plan.procedencia ?? plan.atribucion?.procedencia}
                </p>
                <div className="form-actions">
                  <button className="secondary" onClick={() => setPlan(null)}>
                    Volver a editar
                  </button>
                  <button
                    className="primary"
                    disabled={busy || plan.correccionBloqueada}
                    onClick={() => void confirm()}
                  >
                    Confirmar{" "}
                    {action.startsWith("acreditar:")
                      ? "acreditación"
                      : "Neto de apertura"}
                  </button>
                </div>
              </section>
            )}
          </>
        ) : (
          <p role="status">Cargando ficha…</p>
        )
      ) : list ? (
        <>
          <p role="status">
            {list.total} fichas · página {list.page}
          </p>
          <div className="anticipo-list">
            {list.items.length ? (
              list.items.map((a) => (
                <article className="panel" key={a.referencia.id}>
                  <h2>
                    <a
                      href={"/anticipos/" + a.referencia.id}
                      onClick={(e) => {
                        e.preventDefault();
                        go("/anticipos/" + a.referencia.id);
                      }}
                    >
                      {a.referencia.id} · {a.referencia.nombre}
                    </a>
                  </h2>
                  <Tag>ⓘ {a.estado}</Tag>
                  <p>
                    Neto pendiente: {amount(a.neto)} · {a.cobertura}
                  </p>
                  <p>Referencia {a.referencia.estado}</p>
                </article>
              ))
            ) : (
              <p>
                Sin fichas de Anticipo. Crea una Referencia y su ficha en una
                sola operación.
              </p>
            )}
          </div>
          <div className="form-actions">
            <button
              className="secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              className="secondary"
              disabled={page * 100 >= list.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      ) : (
        <p role="status">Cargando Anticipos…</p>
      )}
    </div>
  );
}
