import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, eur, type SharedCase, type SharedMetric } from "./api";
import { Alert, PageHead, Tag } from "./ui";
const base = "/compartidos";
const date = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "No disponible";
const amount = (m: SharedMetric) =>
  m.valor !== null
    ? eur(m.valor)
    : m.subtotal !== null
      ? `Parcial · ${eur(m.subtotal)}`
      : m.estado;
const reason = (m: SharedMetric) =>
  m.estado === "Verificada" ? null : m.motivo;
const stateClass = (state: string) =>
  "tag " +
  (state === "Cerrado"
    ? "state-closed"
    : state === "Revisar"
      ? "state-review"
      : state === "Reparto parcial"
        ? "state-partial"
        : "inactive");
function Metric({
  label,
  metric,
  strong = false,
}: {
  label: string;
  metric: SharedMetric;
  strong?: boolean;
}) {
  return (
    <div className="metric">
      <dt>{label}</dt>
      <dd>
        <strong>{amount(metric)}</strong>
        {reason(metric) && <small className="muted">{reason(metric)}</small>}
      </dd>
    </div>
  );
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
export function Compartidos({
  path,
  go,
}: {
  path: string;
  go: (p: string) => void;
}) {
  if (path === base || path === "/")
    return <SharedList go={go} />;
  if (path === base + "/nuevo") return <NewShared go={go} />;
  const id = path.match(/^\/compartidos\/(REF\d+)$/)?.[1];
  if (id) return <SharedDetail key={id} id={id} go={go} />;
  return <Alert>Página no encontrada.</Alert>;
}
function SharedList({ go }: { go: (p: string) => void }) {
  const [data, setData] = useState<{ items: SharedCase[]; total: number } | null>(
      null,
    ),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setError("");
    setData(null);
    api(base + "/fichas")
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [retry]);
  return (
    <>
      <PageHead
        eyebrow="Compartidos"
        title="Gastos compartidos"
        description="Ficha 1:1, participantes y reparto exacto por Gasto y Partida. Base B sin aportaciones de terceros (D5)."
      >
        <button className="primary" onClick={() => go(base + "/nuevo")}>
          Nuevo caso compartido
        </button>
      </PageHead>
      {error ? (
        <Alert retry={() => setRetry((r) => r + 1)}>{error}</Alert>
      ) : !data ? (
        <p role="status">Cargando casos compartidos…</p>
      ) : data.total === 0 ? (
        <section className="panel empty-state">
          <h2>Todavía no hay casos compartidos</h2>
          <p className="muted">
            Crea una Referencia de tipo Gasto compartido y su ficha 1:1. Después
            añade participantes y registra los Gastos con su Partida real.
          </p>
          <button className="primary" onClick={() => go(base + "/nuevo")}>
            Crear el primer caso
          </button>
        </section>
      ) : (
        <>
          <div className="desktop-list shared-list">
            <table>
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Caso</th>
                  <th>Estado</th>
                  <th>Bruto</th>
                  <th>Coste propio</th>
                  <th>Participantes</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.referencia.id}>
                    <td>
                      <Link to={base + "/" + c.referencia.id} go={go}>
                        {c.referencia.id}
                      </Link>
                    </td>
                    <td>{c.referencia.nombre}</td>
                    <td>
                      <Tag>
                        <span className={stateClass(c.resumen.estado)}>
                          {c.resumen.estado}
                        </span>
                      </Tag>
                    </td>
                    <td>{amount(c.resumen.bruto)}</td>
                    <td>{amount(c.resumen.costePropio)}</td>
                    <td>{c.participantes.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="shared-cards">
            {data.items.map((c) => (
              <article className="panel" key={c.referencia.id}>
                <p className="eyebrow">{c.referencia.id}</p>
                <h2>
                  <Link to={base + "/" + c.referencia.id} go={go}>
                    {c.referencia.nombre}
                  </Link>
                </h2>
                <p>
                  <span className={stateClass(c.resumen.estado)}>
                    {c.resumen.estado}
                  </span>
                </p>
                <dl className="detail-grid">
                  <div>
                    <dt>Bruto</dt>
                    <dd>{amount(c.resumen.bruto)}</dd>
                  </div>
                  <div>
                    <dt>Coste propio</dt>
                    <dd>{amount(c.resumen.costePropio)}</dd>
                  </div>
                  <div>
                    <dt>Participantes</dt>
                    <dd>{c.participantes.length}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
      <section className="panel shared-scope-note">
        <h2>Alcance de esta base</h2>
        <p>
          Se calculan Bruto, Asignado y Coste propio. Con terceros con cuota,
          Recuperado, Neto, Cobertura y Exceso se muestran como No disponible o
          Parcial: no se inventa un 0,00 ni se declara Cerrado. Las aportaciones
          de terceros (D5/Exterior) no están habilitadas.
        </p>
      </section>
    </>
  );
}
function NewShared({ go }: { go: (p: string) => void }) {
  const [name, setName] = useState(""),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    attempt = useRef(crypto.randomUUID());
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    try {
      const result = await api<SharedCase>(base + "/fichas", "POST", {
        nombre: name,
      }, { "idempotency-key": attempt.current });
      go(base + "/" + result.referencia.id);
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.message);
      setFields(apiError.fields ?? {});
      attempt.current = crypto.randomUUID();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="Compartidos"
        title="Nuevo caso compartido"
        description="Se crean juntos la Referencia CAT013 y su ficha 1:1; no se admiten fichas o Referencias huérfanas."
      />
      <form className="panel form-grid" onSubmit={submit} noValidate>
        {error && <Alert>{error}</Alert>}
        <label htmlFor="shared-name">Nombre del caso</label>
        <input
          id="shared-name"
          value={name}
          maxLength={120}
          required
          aria-invalid={!!fields.nombre}
          aria-describedby={fields.nombre ? "shared-name-error" : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
            setFields({});
          }}
        />
        {fields.nombre && (
          <p className="field-error" id="shared-name-error">
            {fields.nombre}
          </p>
        )}
        <p className="muted">
          Ejemplo ficticio: «Piso 2026». El nombre se puede editar después desde
          Referencias; el Tipo queda protegido al tener ficha.
        </p>
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => go(base)}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Creando…" : "Crear caso"}
          </button>
        </div>
      </form>
    </>
  );
}
function SharedDetail({ id, go }: { id: string; go: (p: string) => void }) {
  const [data, setData] = useState<SharedCase | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [reload, setReload] = useState(0),
    [mode, setMode] = useState<"add" | "edit" | "baja" | null>(null),
    [selected, setSelected] = useState<string>("");
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    api<SharedCase>(base + "/fichas/" + id)
      .then((d) => {
        if (!live) return;
        setData(d);
        setSelected((current) =>
          d.participantes.some((p) => p.id === current && p.estado === "Activa")
            ? current
            : (d.participantes.find((p) => p.estado === "Activa")?.id ?? ""),
        );
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [id, reload]);
  const done = (notice?: string) => {
    setMode(null);
    setReload((r) => r + 1);
    if (notice) setError("");
  };
  if (loading && !data) return <p role="status">Cargando ficha compartida…</p>;
  if (error && !data)
    return (
      <Alert retry={() => setReload((r) => r + 1)}>
        {error}
        <p>
          <Link to={base} go={go}>
            Volver a Compartidos
          </Link>
        </p>
      </Alert>
    );
  if (!data) return <Alert>Ficha no disponible.</Alert>;
  const c = data,
    active = c.participantes.filter((p) => p.estado === "Activa"),
    selectedParticipant = c.participantes.find((p) => p.id === selected);
  return (
    <>
      <PageHead
        eyebrow="Compartido"
        title={c.referencia.nombre}
        description={`${c.referencia.id} · Ficha 1:1 · Revisión ${c.ficha.revision}`}
      >
        <button className="secondary" onClick={() => go(base)}>
          ‹ Volver
        </button>
      </PageHead>
      {error && <Alert>{error}</Alert>}
      <section className="panel shared-state" aria-label="Estado del caso">
        <p>
          <strong>Estado:</strong>{" "}
          <span className={stateClass(c.resumen.estado)}>
            {c.resumen.estado}
          </span>
          {c.resumen.estadoReparto !== c.resumen.estado && (
            <span className="muted">
              {" "}
              · Reparto subyacente: {c.resumen.estadoReparto}
            </span>
          )}
        </p>
        {c.resumen.alertas.map((a, i) => (
          <p className="shared-alert" role="alert" key={i}>
            ⚠ {a.motivo}
          </p>
        ))}
        {!c.resumen.alertas.length && (
          <p className="muted">
            {c.resumen.estado === "Cerrado"
              ? "Sin pendientes ni excesos de terceros; el coste propio puede ser positivo."
              : "Define participantes, partes y Gastos para completar el reparto."}
          </p>
        )}
      </section>
      <div className="shared-layout">
        <section className="panel" aria-label="Resumen del caso">
          <h2>Resumen del caso</h2>
          <dl className="shared-metrics">
            <Metric label="Bruto" metric={c.resumen.bruto} strong />
            <Metric label="Recuperado" metric={c.resumen.recuperado} />
            <Metric label="Neto (B − R)" metric={c.resumen.neto} strong />
            <Metric label="Coste propio (Titular)" metric={c.resumen.costePropio} />
            <Metric
              label="Por cubrir de terceros"
              metric={c.resumen.pendienteTerceros}
            />
            <Metric label="Exceso de terceros" metric={c.resumen.exceso} />
          </dl>
          <p className="muted">Cobertura: {c.resumen.cobertura.estado}</p>
          <p className="muted">{c.resumen.cobertura.motivo}</p>
          <dl className="detail-grid">
            <div>
              <dt>Último Gasto</dt>
              <dd>{date(c.resumen.fechas.ultimoGasto)}</dd>
            </div>
            <div>
              <dt>Última aportación</dt>
              <dd>{date(c.resumen.fechas.ultimaAportacion)}</dd>
            </div>
            <div>
              <dt>Reparto cubierto</dt>
              <dd>{date(c.resumen.fechas.repartoSoportado)}</dd>
            </div>
            <div>
              <dt>Fecha de exceso</dt>
              <dd>{date(c.resumen.fechas.exceso)}</dd>
            </div>
          </dl>
          <p className="muted">{c.resumen.d5}</p>
        </section>
        <section className="panel" aria-label="Participantes">
          <div className="shared-section-head">
            <h2>Participantes ({active.length})</h2>
            <button
              className="primary"
              onClick={() => {
                setMode("add");
                setSelected("");
              }}
            >
              Añadir participante
            </button>
          </div>
          <div className="desktop-list shared-participants">
            <table>
              <thead>
                <tr>
                  <th>Nombre · rol · partes</th>
                  <th>Asignado</th>
                  <th>Aportado</th>
                  <th>Pendiente</th>
                  <th>Exceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {c.participantes.map((p) => (
                  <tr key={p.id} className={p.estado === "Baja" ? "muted" : ""}>
                    <td>
                      <strong>{p.nombre}</strong>
                      {p.estado === "Baja" && <Tag inactive>Baja</Tag>}
                      <small className="muted">
                        {p.rol} · {p.partes} {p.partes === 1 ? "parte" : "partes"}
                      </small>
                    </td>
                    <td>{amount(p.asignado)}</td>
                    <td>{amount(p.aportado)}</td>
                    <td>{amount(p.pendiente)}</td>
                    <td>{amount(p.exceso)}</td>
                    <td>
                      {p.estado === "Activa" && (
                        <>
                          <button
                            className="text-button"
                            onClick={() => {
                              setSelected(p.id);
                              setMode("edit");
                            }}
                          >
                            Editar
                          </button>{" "}
                          <button
                            className="text-button"
                            onClick={() => {
                              setSelected(p.id);
                              setMode("baja");
                            }}
                          >
                            Baja
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="shared-cards">
            {c.participantes.map((p) => (
              <article className="panel shared-participant" key={p.id}>
                <h3>
                  {p.nombre} · {p.rol}
                  {p.estado === "Baja" && <Tag inactive>Baja</Tag>}
                </h3>
                <p>Partes: {p.partes}</p>
                <dl className="detail-grid">
                  <div>
                    <dt>Asignado</dt>
                    <dd>{amount(p.asignado)}</dd>
                  </div>
                  <div>
                    <dt>Aportado</dt>
                    <dd>{amount(p.aportado)}</dd>
                  </div>
                  <div>
                    <dt>Pendiente</dt>
                    <dd>{amount(p.pendiente)}</dd>
                  </div>
                  <div>
                    <dt>Exceso</dt>
                    <dd>{amount(p.exceso)}</dd>
                  </div>
                </dl>
                {p.estado === "Activa" && (
                  <div className="form-actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        setSelected(p.id);
                        setMode("edit");
                      }}
                    >
                      Editar reparto
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setSelected(p.id);
                        setMode("baja");
                      }}
                    >
                      Dar de baja
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          {mode === "add" && (
            <ParticipantForm
              key="add"
              referencia={id}
              onCancel={() => setMode(null)}
              onDone={done}
            />
          )}
          {mode === "edit" && selectedParticipant && (
            <ParticipantForm
              key={"edit-" + selectedParticipant.id + ":" + selectedParticipant.revision}
              referencia={id}
              participant={selectedParticipant}
              onCancel={() => setMode(null)}
              onDone={done}
            />
          )}
          {mode === "baja" && selectedParticipant && (
            <BajaForm
              key={"baja-" + selectedParticipant.id + ":" + selectedParticipant.revision}
              referencia={id}
              participant={selectedParticipant}
              onCancel={() => setMode(null)}
              onDone={done}
            />
          )}
        </section>
      </div>
      <section className="panel" aria-label="Gastos y Partidas">
        <div className="shared-section-head">
          <h2>Gastos y Neto por Gasto</h2>
          <div className="actions">
            <button
              className="secondary"
              onClick={() =>
                go("/movimientos/nuevo?referencia=" + id + "&tipo=Gasto")
              }
            >
              Registrar Gasto CAT013
            </button>
            <button
              className="secondary"
              onClick={() =>
                go(
                  "/movimientos/nuevo?referencia=" + id + "&tipo=Transferencia",
                )
              }
            >
              Transferencia interna
            </button>
          </div>
        </div>
        {c.gastos.length === 0 ? (
          <p className="muted">
            Sin Gastos elegibles: el caso queda en Sin repartir; la ausencia no
            se muestra como 0,00.
          </p>
        ) : (
          <ul className="shared-expenses">
            {c.gastos.map((g) => (
              <li key={g.id} className={g.valido ? "" : "shared-invalid"}>
                <div>
                  <strong>{g.partida?.nombre ?? "Partida no disponible"}</strong>{" "}
                  <span className="muted">
                    Movimiento {g.id} · {date(g.fecha)} · Pagador:{" "}
                    {g.saldoPagador?.nombre ?? "No disponible"}
                  </span>
                  {g.motivo && <p className="field-error">{g.motivo}</p>}
                </div>
                <span>{eur(g.importe)}</span>
                <span>Neto: {amount(g.neto)}</span>
                <span>
                  {g.anulado
                    ? "Anulado"
                    : g.valido
                      ? "Computa"
                      : "Revisar"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {c.partidas.length > 0 && (
          <>
            <h3>Neto por Partida</h3>
            <ul className="shared-partidas">
              {c.partidas.map((p) => (
                <li key={p.id}>
                  <span>
                    {p.nombre} · {p.id}
                  </span>
                  <span>{eur(p.bruto)}</span>
                  <span>Neto: {amount(p.neto)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <div className="shared-layout">
        <section className="panel" aria-label="Movimientos relacionados">
          <h2>Movimientos internos con esta Referencia</h2>
          {c.relacionados.length === 0 ? (
            <p className="muted">Sin otros movimientos internos.</p>
          ) : (
            <ul className="shared-related">
              {c.relacionados.map((m) => (
                <li key={m.id}>
                  <span>
                    {m.id} · {m.tipo} · {date(m.fecha)} · {eur(m.importe)}
                  </span>
                  <small className="muted">{m.motivo}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel" aria-label="Historia del caso">
          <h2>Historia (append-only)</h2>
          <ol className="shared-history">
            {c.historia.map((h) => (
              <li key={h.id}>
                <span>
                  {date(h.instante.slice(0, 10))} · {h.accion}
                  {h.motivo ? ` · Motivo: ${h.motivo}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
function ParticipantForm({
  referencia,
  participant,
  onCancel,
  onDone,
}: {
  referencia: string;
  participant?: SharedCase["participantes"][number];
  onCancel: () => void;
  onDone: (notice?: string) => void;
}) {
  const editing = !!participant;
  const [name, setName] = useState(participant?.nombre ?? ""),
    [role, setRole] = useState<"Titular" | "Tercero">(
      participant?.rol ?? "Tercero",
    ),
    [parts, setParts] = useState(String(participant?.partes ?? 1)),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [plan, setPlan] = useState<{
      fingerprint: string;
      participante: any;
      impacto: {
        antes: any;
        despues: any;
      };
    } | null>(null),
    [motive, setMotive] = useState(""),
    attempt = useRef(crypto.randomUUID()),
    focus = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (plan)
      requestAnimationFrame(() => focus.current?.focus());
  }, [plan]);
  const changes = () => {
    const value: Record<string, unknown> = {};
    if (!editing || name !== participant.nombre) value.nombre = name;
    if (!editing || role !== participant.rol) value.rol = role;
    if (!editing || Number(parts) !== participant.partes)
      value.partes = Number(parts);
    return value;
  };
  function fail(e: unknown) {
    const apiError = e as ApiError;
    setError(apiError.message);
    setFields(apiError.fields ?? {});
    setPlan(null);
    attempt.current = crypto.randomUUID();
  }
  async function preview(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return save();
    setBusy(true);
    setError("");
    setFields({});
    try {
      const result = await api(base + "/fichas/" + referencia + "/participantes/" + participant!.id + "/impacto", "POST", {
        revision: participant!.revision,
        cambios: changes(),
      });
      setPlan(result);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    setFields({});
    try {
      if (!editing) {
        await api(
          base + "/fichas/" + referencia + "/participantes",
          "POST",
          {
            nombre: name,
            rol: role,
            partes: Number(parts),
          },
          { "idempotency-key": attempt.current },
        );
      } else {
        await api(
          base +
            "/fichas/" +
            referencia +
            "/participantes/" +
            participant!.id +
            "/rectificar",
          "POST",
          {
            revision: participant!.revision,
            cambios: changes(),
            motivo: motive,
            fingerprint: plan!.fingerprint,
          },
          { "idempotency-key": attempt.current },
        );
      }
      onDone();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  if (plan)
    return (
      <section className="panel shared-impact" aria-label="Vista de impacto">
        <h2 tabIndex={-1} ref={focus}>
          Impacto del cambio de reparto
        </h2>
        <p className="muted">
          Las aportaciones acreditadas no cambian; solo se recalcula el reparto.
          En esta base B no existen aportaciones de terceros.
        </p>
        <div
          className="shared-table-scroll"
          role="region"
          aria-label="Tabla de impacto con desplazamiento"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Participante</th>
                <th>Asignado antes</th>
                <th>Asignado después</th>
                <th>Pendiente después</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Participante">
                  {plan.participante.antes.nombre}
                </td>
                <td data-label="Asignado antes">
                  {amount(plan.impacto.antes.asignado.asignado)}
                </td>
                <td data-label="Asignado después">
                  {amount(plan.impacto.despues.asignado.asignado)}
                </td>
                <td data-label="Pendiente después">
                  {amount(plan.impacto.despues.asignado.pendiente)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Estado después:{" "}
          <span className={stateClass(plan.impacto.despues.resumen.estado)}>
            {plan.impacto.despues.resumen.estado}
          </span>
          {" · "}Neto después: {amount(plan.impacto.despues.resumen.neto)}
        </p>
        {error && <Alert>{error}</Alert>}
        <label htmlFor="shared-motive">Motivo (obligatorio)</label>
        <textarea
          id="shared-motive"
          value={motive}
          onChange={(e) => setMotive(e.target.value)}
          rows={3}
          required
        />
        <div className="form-actions">
          <button className="secondary" onClick={() => setPlan(null)}>
            Cancelar
          </button>
          <button className="primary" disabled={busy} onClick={save}>
            {busy ? "Aplicando…" : "Aplicar cambio"}
          </button>
        </div>
      </section>
    );
  return (
    <form className="panel form-grid shared-form" onSubmit={preview} noValidate>
      <h2>{editing ? "Editar participante" : "Alta de participante"}</h2>
      {error && <Alert>{error}</Alert>}
      <label htmlFor="participant-name">Nombre</label>
      <input
        id="participant-name"
        value={name}
        maxLength={120}
        required
        aria-invalid={!!fields.nombre}
        onChange={(e) => {
          setName(e.target.value);
          setError("");
        }}
      />
      {fields.nombre && <p className="field-error">{fields.nombre}</p>}
      <label htmlFor="participant-role">Rol</label>
      <select
        id="participant-role"
        value={role}
        onChange={(e) => {
          setRole(e.target.value as "Titular" | "Tercero");
          setError("");
        }}
      >
        <option value="Titular">Titular</option>
        <option value="Tercero">Tercero</option>
      </select>
      {fields.rol && <p className="field-error">{fields.rol}</p>}
      <label htmlFor="participant-parts">Partes enteras</label>
      <input
        id="participant-parts"
        type="number"
        min={0}
        max={1000000}
        step={1}
        value={parts}
        required
        aria-invalid={!!fields.partes}
        onChange={(e) => {
          setParts(e.target.value);
          setError("");
        }}
      />
      {fields.partes && <p className="field-error">{fields.partes}</p>}
      <p className="muted">
        El Titular participa en el reparto pero no tiene aportación exigible.
        Solo puede existir un Titular activo por caso.
      </p>
      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary" disabled={busy}>
          {busy
            ? "Comprobando…"
            : editing
              ? "Ver impacto"
              : "Añadir participante"}
        </button>
      </div>
    </form>
  );
}
function BajaForm({
  referencia,
  participant,
  onCancel,
  onDone,
}: {
  referencia: string;
  participant: SharedCase["participantes"][number];
  onCancel: () => void;
  onDone: (notice?: string) => void;
}) {
  const [motive, setMotive] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    attempt = useRef(crypto.randomUUID());
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        base +
          "/fichas/" +
          referencia +
          "/participantes/" +
          participant.id +
          "/baja",
        "POST",
        { revision: participant.revision, motivo: motive },
        { "idempotency-key": attempt.current },
      );
      onDone();
    } catch (e) {
      setError((e as Error).message);
      attempt.current = crypto.randomUUID();
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel form-grid shared-form" onSubmit={submit} noValidate>
      <h2>Baja lógica de {participant.nombre}</h2>
      <p className="muted">
        Se conservan sus partes, revisiones y auditoría. No se borra ningún
        registro ni se reescriben Movimientos.
      </p>
      {error && <Alert>{error}</Alert>}
      <label htmlFor="shared-baja-motive">Motivo (obligatorio)</label>
      <textarea
        id="shared-baja-motive"
        value={motive}
        onChange={(e) => setMotive(e.target.value)}
        rows={3}
        required
      />
      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary" disabled={busy}>
          {busy ? "Aplicando…" : "Confirmar baja lógica"}
        </button>
      </div>
    </form>
  );
}
