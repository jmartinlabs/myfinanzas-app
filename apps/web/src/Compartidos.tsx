import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  api,
  ApiError,
  eur,
  type SharedCase,
  type SharedMetric,
  type SharedParticipant,
} from "./api";
import {
  Alert,
  DataList,
  Field,
  focusFirstInvalidField,
  FormGrid,
  FormSection,
  PageHead,
  Table,
  Tag,
  type TableColumn,
} from "./ui";
const base = "/compartidos";
const date = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "No disponible";
const inputAmount = (value: string) => {
  const [whole, decimals = ""] = value.replace(",", ".").split(".");
  if (!/^-?\d+$/.test(whole)) return value;
  return eur(`${whole}.${(decimals + "00").slice(0, 2)}`);
};
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
  const contribution = path.match(/^\/compartidos\/(REF\d+)\/aportacion$/)?.[1];
  if (contribution)
    return <AportacionForm key={contribution} id={contribution} go={go} />;
  const historical = path.match(/^\/compartidos\/(REF\d+)\/aportaciones$/)?.[1];
  if (historical)
    return <HistoricalAportaciones key={historical} id={historical} go={go} />;
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
  const columns: TableColumn<SharedCase>[] = [
    {
      id: "referencia",
      header: "Referencia",
      cell: (shared) => (
        <Link to={base + "/" + shared.referencia.id} go={go}>
          {shared.referencia.id}
        </Link>
      ),
    },
    {
      id: "caso",
      header: "Caso",
      cell: (shared) => shared.referencia.nombre,
      cardCell: (shared) => (
        <Link to={base + "/" + shared.referencia.id} go={go}>
          {shared.referencia.nombre}
        </Link>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      kind: "status",
      cell: (shared) => (
        <Tag>
          <span className={stateClass(shared.resumen.estado)}>
            {shared.resumen.estado}
          </span>
        </Tag>
      ),
    },
    {
      id: "bruto",
      header: "Bruto",
      kind: "amount",
      cell: (shared) => amount(shared.resumen.bruto),
    },
    {
      id: "costePropio",
      header: "Coste propio",
      kind: "amount",
      cell: (shared) => amount(shared.resumen.costePropio),
    },
    {
      id: "participantes",
      header: "Participantes",
      kind: "amount",
      cell: (shared) => shared.participantes.length,
    },
  ];
  return (
    <>
      <PageHead
        eyebrow="Compartidos"
        title="Gastos compartidos"
        description="Ficha 1:1, participantes, reparto exacto y aportaciones de terceros desde Exterior (D5)."
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
            <Table
              caption="Gastos compartidos"
              label="Tabla de Gastos compartidos"
              columns={columns}
              rows={data.items}
              rowKey={(shared) => shared.referencia.id}
            />
          </div>
          <DataList
            columns={columns}
            rows={data.items}
            rowKey={(shared) => shared.referencia.id}
            label="Gastos compartidos móvil"
            className="mobile-list shared-cards"
          />
        </>
      )}
      <section className="panel shared-scope-note">
        <h2>Alcance de esta base</h2>
        <p>
          Se calculan Bruto, Asignado, Coste propio, Recuperado, Pendiente y
          Exceso. Una aportación de tercero es una Transferencia desde Exterior
          (S000) con Referencia CAT013, ficha y Quién paga; no es Ingreso ni
          Gasto. S000 no computa como saldo interno. Sin fuente o con incidencias
          no se inventa un 0,00 ni se declara Cerrado.
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
    attempt = useRef(crypto.randomUUID()),
    formRef = useRef<HTMLFormElement>(null),
    alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(formRef.current)) alertRef.current?.focus();
    });
  }, [error]);
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
      <form
        className="shared-form"
        onSubmit={submit}
        noValidate
        ref={formRef}
      >
        {error && (
          <div tabIndex={-1} ref={alertRef}>
            <Alert>{error}</Alert>
          </div>
        )}
        <FormSection title="Identificación">
          <FormGrid>
            <Field
              id="shared-name"
              label="Nombre del caso"
              className="ui-form-span"
              error={fields.nombre}
            >
              <input
                value={name}
                maxLength={120}
                required
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                  setFields({});
                }}
              />
            </Field>
          </FormGrid>
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
        </FormSection>
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
  const participantColumns: TableColumn<SharedParticipant>[] = [
    {
      id: "nombre",
      header: "Nombre · rol · partes",
      label: "Nombre, rol y partes",
      cell: (participant) => (
        <>
          <strong>{participant.nombre}</strong>
          {participant.estado === "Baja" && <Tag inactive>Baja</Tag>}
          <small className="muted">
            {participant.rol} · {participant.partes}{" "}
            {participant.partes === 1 ? "parte" : "partes"}
          </small>
        </>
      ),
      cardCell: (participant) => (
        <>
          <strong>
            {participant.nombre} · {participant.rol}
          </strong>
          {participant.estado === "Baja" && <Tag inactive>Baja</Tag>}
          <small className="muted">
            {participant.partes}{" "}
            {participant.partes === 1 ? "parte" : "partes"}
          </small>
        </>
      ),
    },
    {
      id: "asignado",
      header: "Asignado",
      kind: "amount",
      cell: (participant) => amount(participant.asignado),
    },
    {
      id: "aportado",
      header: "Aportado",
      kind: "amount",
      cell: (participant) => amount(participant.aportado),
    },
    {
      id: "pendiente",
      header: "Pendiente",
      kind: "amount",
      cell: (participant) => amount(participant.pendiente),
    },
    {
      id: "exceso",
      header: "Exceso",
      kind: "amount",
      cell: (participant) => amount(participant.exceso),
    },
    {
      id: "acciones",
      header: "Acciones",
      kind: "actions",
      cell: (participant) =>
        participant.estado === "Activa" ? (
          <>
            <button
              className="text-button"
              onClick={() => {
                setSelected(participant.id);
                setMode("edit");
              }}
            >
              Editar
            </button>{" "}
            <button
              className="text-button"
              onClick={() => {
                setSelected(participant.id);
                setMode("baja");
              }}
            >
              Baja
            </button>
          </>
        ) : null,
      cardCell: (participant) =>
        participant.estado === "Activa" ? (
          <>
            <button
              className="secondary"
              onClick={() => {
                setSelected(participant.id);
                setMode("edit");
              }}
            >
              Editar reparto
            </button>
            <button
              className="secondary"
              onClick={() => {
                setSelected(participant.id);
                setMode("baja");
              }}
            >
              Dar de baja
            </button>
          </>
        ) : null,
    },
  ];
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
      <section className="panel shared-actions" aria-label="Aportaciones">
        <div className="shared-section-head">
          <div>
            <h2>Aportaciones de terceros</h2>
            <p className="muted">
              Transferencia desde Exterior con esta Referencia; no es Ingreso ni
              Gasto. El efecto bancario es +importe en el Destino y S000 no
              computa como saldo interno.
            </p>
          </div>
          <div className="actions">
            <button
              className="primary"
              disabled={!active.some((p) => p.rol === "Tercero")}
              onClick={() => go(base + "/" + id + "/aportacion")}
            >
              Registrar aportación
            </button>
            <button
              className="secondary"
              onClick={() => go(base + "/" + id + "/aportaciones")}
            >
              Aportaciones históricas
            </button>
          </div>
        </div>
        {!active.some((p) => p.rol === "Tercero") && (
          <p className="shared-alert" role="status">
            Sin Terceros activos: añade un participante Tercero para poder
            registrar una aportación.{" "}
            <button
              className="text-button"
              onClick={() => {
                setMode("add");
                setSelected("");
              }}
            >
              Añadir participante
            </button>
          </p>
        )}
        {c.aportaciones.length === 0 ? (
          <p className="muted">
            Sin aportaciones acreditadas. El Recuperado es 0,00 verificable y el
            Pendiente se calcula por Tercero, sin compensación cruzada.
          </p>
        ) : (
          <ul className="shared-aportaciones">
            {c.aportaciones.map((a) => (
              <li key={a.movimiento} className={a.anulado ? "muted" : ""}>
                <span>
                  <strong>{a.participante.nombre}</strong> · {eur(a.importe)} ·{" "}
                  {date(a.fecha)}
                </span>
                <span>
                  {a.procedencia} · revisión {a.revision}
                  {a.anulado ? " · Anulada (historia conservada)" : ""}
                </span>
                <small className="muted">Evidencia: {a.evidencia}</small>
              </li>
            ))}
          </ul>
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
            <Table
              caption={`Participantes de ${id}`}
              label="Tabla de Participantes"
              columns={participantColumns}
              rows={c.participantes}
              rowKey={(participant) => participant.id}
              rowClassName={(participant) =>
                participant.estado === "Baja" ? "muted" : undefined
              }
            />
          </div>
          <DataList
            columns={participantColumns}
            rows={c.participantes}
            rowKey={(participant) => participant.id}
            rowClassName={(participant) =>
              participant.estado === "Baja" ? "muted" : undefined
            }
            label="Participantes móvil"
            className="mobile-list shared-cards"
          />
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
    focus = useRef<HTMLHeadingElement>(null),
    formRef = useRef<HTMLFormElement>(null),
    alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (plan)
      requestAnimationFrame(() => focus.current?.focus());
  }, [plan]);
  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(formRef.current)) alertRef.current?.focus();
    });
  }, [error]);
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
        {error && (
          <div tabIndex={-1} ref={alertRef}>
            <Alert>{error}</Alert>
          </div>
        )}
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
    <form
      className="shared-form"
      onSubmit={preview}
      noValidate
      ref={formRef}
    >
      <FormSection
        title={editing ? "Editar participante" : "Alta de participante"}
      >
        {error && (
          <div tabIndex={-1} ref={alertRef}>
            <Alert>{error}</Alert>
          </div>
        )}
        <FormGrid>
          <Field
            id="participant-name"
            label="Nombre"
            className="ui-form-span"
            error={fields.nombre}
          >
            <input
              value={name}
              maxLength={120}
              required
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
            />
          </Field>
          <Field id="participant-role" label="Rol" error={fields.rol}>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as "Titular" | "Tercero");
                setError("");
              }}
            >
              <option value="Titular">Titular</option>
              <option value="Tercero">Tercero</option>
            </select>
          </Field>
          <Field id="participant-parts" label="Partes enteras" error={fields.partes}>
            <input
              type="number"
              min={0}
              max={1000000}
              step={1}
              value={parts}
              required
              onChange={(e) => {
                setParts(e.target.value);
                setError("");
              }}
            />
          </Field>
        </FormGrid>
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
      </FormSection>
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
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    attempt = useRef(crypto.randomUUID()),
    formRef = useRef<HTMLFormElement>(null),
    alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(formRef.current)) alertRef.current?.focus();
    });
  }, [error]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
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
      const apiError = e as ApiError;
      setError(apiError.message);
      setFields(apiError.fields ?? {});
      attempt.current = crypto.randomUUID();
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="shared-form"
      onSubmit={submit}
      noValidate
      ref={formRef}
    >
      <FormSection title={`Baja lógica de ${participant.nombre}`}>
        <p className="muted">
          Se conservan sus partes, revisiones y auditoría. No se borra ningún
          registro ni se reescriben Movimientos.
        </p>
        {error && (
          <div tabIndex={-1} ref={alertRef}>
            <Alert>{error}</Alert>
          </div>
        )}
        <FormGrid>
          <Field
            id="shared-baja-motive"
            label="Motivo (obligatorio)"
            className="ui-form-span"
            error={fields.motivo}
          >
            <textarea
              value={motive}
              onChange={(e) => {
                setMotive(e.target.value);
                setError("");
              }}
              rows={3}
              required
            />
          </Field>
        </FormGrid>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Aplicando…" : "Confirmar baja lógica"}
          </button>
        </div>
      </FormSection>
    </form>
  );
}

type SharedSummary = {
  recuperado: SharedMetric;
  neto: SharedMetric;
  pendienteTerceros: SharedMetric;
  exceso: SharedMetric;
  estado: string;
  cobertura: { estado: string; motivo: string };
};
type ContributionImpact = {
  antes: SharedSummary;
  despues: SharedSummary;
  participante: string;
  evidencia: string;
  procedencia: string;
  aviso: string;
};
type ContributionPlan = {
  fingerprint: string;
  contextRevision: string;
  despues: Record<string, any> | null;
  duplicados: { id: string; fecha: string; importe: string }[];
  impacto: {
    saldos: {
      id: string;
      nombre: string;
      antes: string | null;
      despues: string | null;
      motivo: string;
    }[];
  };
  compartidoImpacto?: ContributionImpact | null;
};
type HistoricalPlan = {
  contexto: string;
  revision: number;
  fingerprint: string;
  compartido: { participante: string; evidencia: string; procedencia: string };
  hecho: { fecha: string; importe: string; origen: string; destino: string };
  impacto: { antes: SharedSummary; despues: SharedSummary };
};
function ContributionMetrics({
  title,
  summary,
}: {
  title: string;
  summary: SharedSummary;
}) {
  return (
    <div className="shared-impact-column">
      <h3>{title}</h3>
      <dl className="shared-metrics">
        <Metric label="Recuperado" metric={summary.recuperado} />
        <Metric label="Neto" metric={summary.neto} />
        <Metric label="Pendiente Terceros" metric={summary.pendienteTerceros} />
        <Metric label="Exceso" metric={summary.exceso} />
      </dl>
      <p>
        Estado:{" "}
        <span className={stateClass(summary.estado)}>{summary.estado}</span>
      </p>
      <p className="muted">
        Cobertura: {summary.cobertura.estado} · {summary.cobertura.motivo}
      </p>
    </div>
  );
}
function ContributionPreview({
  impact,
  amountLabel,
  destination,
}: {
  impact: ContributionImpact;
  amountLabel?: string;
  destination?: string;
}) {
  return (
    <section className="panel shared-impact" aria-label="Vista de impacto">
      <h2>Antes y después de la aportación</h2>
      <p className="shared-alert" role="note">
        {impact.aviso}
      </p>
      <div className="shared-impact-grid">
        <ContributionMetrics title="Antes" summary={impact.antes} />
        <ContributionMetrics title="Después" summary={impact.despues} />
      </div>
      <p className="muted">
        Efecto banco: {amountLabel ? `+${amountLabel}` : "+importe"} en{" "}
        {destination ?? "el Destino"}. S000 no computa como saldo interno.
      </p>
    </section>
  );
}
function AportacionForm({
  id,
  go,
}: {
  id: string;
  go: (p: string) => void;
}) {
  const [data, setData] = useState<SharedCase | null>(null),
    [options, setOptions] = useState<{
      hoy: string;
      saldos: {
        id: string;
        nombre: string;
        tipo: string;
        control: string;
        estado: string;
      }[];
    } | null>(null),
    [participante, setParticipante] = useState(""),
    [fecha, setFecha] = useState(""),
    [importe, setImporte] = useState(""),
    [destino, setDestino] = useState(""),
    [evidencia, setEvidencia] = useState(""),
    [procedencia, setProcedencia] = useState("Documento bancario"),
    [plan, setPlan] = useState<ContributionPlan | null>(null),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState<string | null>(null),
    [reload, setReload] = useState(0),
    attempt = useRef(crypto.randomUUID()),
    focus = useRef<HTMLHeadingElement>(null),
    formRef = useRef<HTMLFormElement>(null),
    alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    Promise.all([
      api<SharedCase>(base + "/fichas/" + id),
      api<{
        hoy: string;
        saldos: {
          id: string;
          nombre: string;
          tipo: string;
          control: string;
          estado: string;
        }[];
      }>("/movimientos/opciones"),
    ])
      .then(([d, o]) => {
        if (!live) return;
        setData(d);
        setOptions(o);
        const third = d.participantes.filter(
          (p) => p.estado === "Activa" && p.rol === "Tercero",
        );
        setParticipante((current) =>
          third.some((p) => p.id === current) ? current : (third[0]?.id ?? ""),
        );
        setFecha((current) => current || o.hoy);
        const eligible = o.saldos.filter(
          (s) =>
            s.id !== "S000" &&
            s.estado === "Activa" &&
            s.tipo !== "Exterior" &&
            s.control !== "Manual" &&
            s.control !== "Exterior",
        );
        setDestino((current) =>
          eligible.some((s) => s.id === current)
            ? current
            : (eligible[0]?.id ?? ""),
        );
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [id, reload]);
  useEffect(() => {
    if (plan) requestAnimationFrame(() => focus.current?.focus());
  }, [plan]);
  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(formRef.current)) alertRef.current?.focus();
    });
  }, [error]);
  const thirds =
    data?.participantes.filter(
      (p) => p.estado === "Activa" && p.rol === "Tercero",
    ) ?? [];
  const destinations =
    options?.saldos.filter(
      (s) =>
        s.id !== "S000" &&
        s.estado === "Activa" &&
        s.tipo !== "Exterior" &&
        s.control !== "Manual" &&
        s.control !== "Exterior",
    ) ?? [];
  const body = () => ({
    tipo: "Transferencia",
    fecha,
    importe: importe.replace(",", "."),
    origen: "S000",
    destino,
    referencia: id,
    concepto: "Aportación de tercero desde Exterior",
    compartido: { participante, evidencia, procedencia },
  });
  function fail(e: unknown) {
    const apiError = e as ApiError;
    setError(apiError.message);
    setFields(apiError.fields ?? {});
    setPlan(null);
    attempt.current = crypto.randomUUID();
  }
  async function preview(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    try {
      const result = await api<ContributionPlan>(
        "/movimientos/impacto",
        "POST",
        body(),
      );
      if (!result.compartidoImpacto)
        throw new Error("No se pudo calcular el impacto compartido.");
      setPlan(result);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ movimiento: { id: string } }>(
        "/movimientos",
        "POST",
        {
          ...body(),
          fingerprint: plan!.fingerprint,
          aceptarCoincidencia: true,
        },
        { "idempotency-key": attempt.current },
      );
      setSuccess(result.movimiento.id);
      setPlan(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  if (loading && !data) return <p role="status">Cargando ficha compartida…</p>;
  if (error && !data)
    return (
      <Alert retry={() => setReload((r) => r + 1)}>
        {error}{" "}
        <button className="text-button" onClick={() => go(base + "/" + id)}>
          Volver
        </button>
      </Alert>
    );
  if (!data) return <Alert>Ficha no disponible.</Alert>;
  if (success)
    return (
      <>
        <PageHead
          eyebrow="Compartido"
          title="Aportación registrada"
          description={`Movimiento ${success} · ${data.referencia.id}`}
        >
          <button className="secondary" onClick={() => go(base + "/" + id)}>
            ‹ Volver a la ficha
          </button>
        </PageHead>
        <section className="panel" role="status">
          <p>
            Una única Transferencia desde Exterior sumó el importe al Destino. No
            se creó Ingreso, Gasto, Partida ni un segundo hecho financiero.
          </p>
          <p className="muted">
            El Recuperado y el Neto se recalculan en la ficha. S000 no computa
            como saldo interno.
          </p>
        </section>
      </>
    );
  return (
    <>
      <PageHead
        eyebrow="Compartido"
        title="Registrar aportación"
        description="Formulario dedicado de Transferencia desde Exterior (S000). No es un Ingreso ni un Gasto."
      >
        <button className="secondary" onClick={() => go(base + "/" + id)}>
          ‹ Volver
        </button>
      </PageHead>
      {thirds.length === 0 ? (
        <section className="panel empty-state">
          <h2>Sin Terceros activos</h2>
          <p className="muted">
            Añade un participante Tercero a la ficha antes de registrar una
            aportación. No se crean participantes implícitos.
          </p>
          <button className="primary" onClick={() => go(base + "/" + id)}>
            Volver a participantes
          </button>
        </section>
      ) : plan ? (
        <>
          <ContributionPreview
            impact={plan.compartidoImpacto!}
            amountLabel={inputAmount(importe)}
            destination={
              destinations.find((s) => s.id === destino)?.nombre ?? destino
            }
          />
          <section className="panel shared-contribution">
            <p>
              Caso <strong>{id}</strong> · Quién paga{" "}
              <strong>
                {thirds.find((p) => p.id === participante)?.nombre}
              </strong>{" "}
              · Importe <strong>{inputAmount(importe)}</strong> · Destino{" "}
              <strong>
                {destinations.find((s) => s.id === destino)?.nombre}
              </strong>
            </p>
            <p className="muted">Evidencia: {evidencia}</p>
            <p className="muted">Procedencia: {procedencia}</p>
            {plan.duplicados.length > 0 && (
              <p className="shared-alert" role="alert">
                Coincidencia con {plan.duplicados.length} Movimiento(s)
                existente(s). Confirma solo si es una aportación real distinta.
              </p>
            )}
            {error && (
              <div tabIndex={-1} ref={alertRef}>
                <Alert>{error}</Alert>
              </div>
            )}
            <div className="form-actions">
              <button className="secondary" onClick={() => setPlan(null)}>
                Cancelar
              </button>
              <button className="primary" disabled={busy} onClick={confirm}>
                {busy ? "Registrando…" : "Revisar aportación"}
              </button>
            </div>
          </section>
        </>
      ) : (
        <form
          className="shared-form"
          onSubmit={preview}
          noValidate
          ref={formRef}
        >
          <FormSection title="Datos de la aportación">
            {error && (
              <div tabIndex={-1} ref={alertRef}>
                <Alert>{error}</Alert>
              </div>
            )}
            <FormGrid>
              <Field
                id="contribution-case"
                label="Caso (bloqueado)"
                className="ui-form-span"
              >
                <input
                  value={`${data.referencia.id} · ${data.referencia.nombre}`}
                  readOnly
                />
              </Field>
              <Field
                id="contribution-participant"
                label="Quién paga"
                error={fields.participante}
              >
                <select
                  value={participante}
                  autoFocus
                  onChange={(e) => {
                    setParticipante(e.target.value);
                    setError("");
                  }}
                >
                  {thirds.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · Tercero
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                id="contribution-date"
                label="Fecha"
                error={fields.fecha}
              >
                <input
                  type="date"
                  value={fecha}
                  max={options?.hoy}
                  required
                  onChange={(e) => {
                    setFecha(e.target.value);
                    setError("");
                  }}
                />
              </Field>
              <Field
                id="contribution-amount"
                label="Importe (EUR)"
                error={fields.importe}
              >
                <input
                  inputMode="decimal"
                  value={importe}
                  placeholder="0,00"
                  required
                  onChange={(e) => {
                    setImporte(e.target.value);
                    setError("");
                  }}
                />
              </Field>
              <Field
                id="contribution-destination"
                label="Destino interno"
                error={fields.destino}
              >
                <select
                  value={destino}
                  onChange={(e) => {
                    setDestino(e.target.value);
                    setError("");
                  }}
                >
                  {destinations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} · {s.id}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                id="contribution-evidence"
                label="Evidencia"
                className="ui-form-span"
                error={fields.evidencia}
              >
                <textarea
                  value={evidencia}
                  rows={3}
                  minLength={10}
                  maxLength={500}
                  required
                  onChange={(e) => {
                    setEvidencia(e.target.value);
                    setError("");
                  }}
                />
              </Field>
              <Field
                id="contribution-provenance"
                label="Procedencia"
              >
                <select
                  value={procedencia}
                  onChange={(e) => {
                    setProcedencia(e.target.value);
                    setError("");
                  }}
                >
                  <option value="Registro del titular">
                    Registro del titular
                  </option>
                  <option value="Documento bancario">Documento bancario</option>
                </select>
              </Field>
            </FormGrid>
            <p className="shared-alert" role="note">
              Es una Transferencia desde Exterior; no es Ingreso ni Gasto. S000 no
              computa como saldo interno. El efecto bancario es +importe en el
              Destino.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => go(base + "/" + id)}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Calculando…" : "Ver impacto"}
              </button>
            </div>
          </FormSection>
        </form>
      )}
    </>
  );
}
function HistoricalAportaciones({
  id,
  go,
}: {
  id: string;
  go: (p: string) => void;
}) {
  const [data, setData] = useState<SharedCase | null>(null),
    [movement, setMovement] = useState(""),
    [participante, setParticipante] = useState(""),
    [evidencia, setEvidencia] = useState(""),
    [procedencia, setProcedencia] = useState("Documento bancario"),
    [plan, setPlan] = useState<HistoricalPlan | null>(null),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [reload, setReload] = useState(0),
    attempt = useRef(crypto.randomUUID()),
    focus = useRef<HTMLHeadingElement>(null),
    formRef = useRef<HTMLFormElement>(null),
    alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    api<SharedCase>(base + "/fichas/" + id)
      .then((d) => {
        if (!live) return;
        setData(d);
        setMovement((current) =>
          d.historicos.some((h) => h.movimiento === current)
            ? current
            : (d.historicos[0]?.movimiento ?? ""),
        );
        const third = d.participantes.filter(
          (p) => p.estado === "Activa" && p.rol === "Tercero",
        );
        setParticipante((current) =>
          third.some((p) => p.id === current) ? current : (third[0]?.id ?? ""),
        );
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [id, reload]);
  useEffect(() => {
    if (plan) requestAnimationFrame(() => focus.current?.focus());
  }, [plan]);
  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(formRef.current)) alertRef.current?.focus();
    });
  }, [error]);
  const selected = data?.historicos.find((h) => h.movimiento === movement);
  const thirds =
    data?.participantes.filter(
      (p) => p.estado === "Activa" && p.rol === "Tercero",
    ) ?? [];
  function fail(e: unknown) {
    const apiError = e as ApiError;
    setError(apiError.message);
    setFields(apiError.fields ?? {});
    setPlan(null);
    attempt.current = crypto.randomUUID();
  }
  async function preview(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    setFields({});
    try {
      const result = await api<HistoricalPlan>(
        base +
          "/fichas/" +
          id +
          "/movimientos/" +
          selected.movimiento +
          "/acreditar/preview",
        "POST",
        {
          revision: selected.revision,
          compartido: { participante, evidencia, procedencia },
        },
      );
      setPlan(result);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api(
        base +
          "/fichas/" +
          id +
          "/movimientos/" +
          selected.movimiento +
          "/acreditar",
        "POST",
        {
          revision: selected.revision,
          contexto: plan!.contexto,
          compartido: { participante, evidencia, procedencia },
          fingerprint: plan!.fingerprint,
          confirmado: true,
        },
        { "idempotency-key": attempt.current },
      );
      setPlan(null);
      setNotice("Aportación histórica acreditada. La historia y el hecho original se conservan.");
      setReload((r) => r + 1);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  if (loading && !data) return <p role="status">Cargando históricos…</p>;
  if (error && !data)
    return (
      <Alert retry={() => setReload((r) => r + 1)}>
        {error}{" "}
        <button className="text-button" onClick={() => go(base + "/" + id)}>
          Volver
        </button>
      </Alert>
    );
  if (!data) return <Alert>Ficha no disponible.</Alert>;
  return (
    <>
      <PageHead
        eyebrow="Compartido"
        title="Aportaciones históricas"
        description="Solo movimientos existentes, vigentes y elegibles. No se crea ni se reclasifica ningún hecho."
      >
        <button className="secondary" onClick={() => go(base + "/" + id)}>
          ‹ Volver
        </button>
      </PageHead>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {thirds.length === 0 ? (
        <section className="panel empty-state">
          <h2>Sin Terceros activos</h2>
          <p className="muted">
            Añade un participante Tercero activo a la ficha antes de revisar una
            acreditación histórica. No se crean participantes implícitos.
          </p>
        </section>
      ) : data.historicos.length === 0 ? (
        <section className="panel empty-state">
          <h2>Sin históricos elegibles</h2>
          <p className="muted">
            No hay Transferencias S000 con esta Referencia pendientes de
            acreditar. La ausencia no se convierte en un alta ni en un backfill.
          </p>
        </section>
      ) : (
        <form
          className="shared-form"
          onSubmit={preview}
          noValidate
          ref={formRef}
        >
          <FormSection title="Acreditación histórica">
            {error && (
              <div tabIndex={-1} ref={alertRef}>
                <Alert>{error}</Alert>
              </div>
            )}
            <FormGrid>
              <Field
                id="historical-movement"
                label="Movimiento existente"
                className="ui-form-span"
                error={fields.movimiento}
              >
                <select
                  value={movement}
                  autoFocus
                  onChange={(e) => {
                    setMovement(e.target.value);
                    setPlan(null);
                    setError("");
                  }}
                >
                  {data.historicos.map((h) => (
                    <option key={h.movimiento} value={h.movimiento}>
                      {h.movimiento} · {date(h.fecha)} · {eur(h.importe)} ·{" "}
                      {h.concepto}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                id="historical-participant"
                label="Quién paga"
                error={fields.participante}
              >
                <select
                  value={participante}
                  onChange={(e) => {
                    setParticipante(e.target.value);
                    setError("");
                  }}
                >
                  {thirds.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · Tercero
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                id="historical-evidence"
                label="Evidencia"
                className="ui-form-span"
                error={fields.evidencia}
              >
                <textarea
                  value={evidencia}
                  rows={3}
                  minLength={10}
                  maxLength={500}
                  required
                  onChange={(e) => {
                    setEvidencia(e.target.value);
                    setError("");
                  }}
                />
              </Field>
              <Field
                id="historical-provenance"
                label="Procedencia"
              >
                <select
                  value={procedencia}
                  onChange={(e) => {
                    setProcedencia(e.target.value);
                    setError("");
                  }}
                >
                  <option value="Documento bancario">Documento bancario</option>
                  <option value="Importación histórica autorizada">
                    Importación histórica autorizada
                  </option>
                </select>
              </Field>
            </FormGrid>
            <p className="shared-alert" role="note">
              Un histórico no se acredita solo con «Registro del titular». Se exige
              documento bancario o importación autorizada y revisión explícita.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => go(base + "/" + id)}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Calculando…" : "Ver impacto"}
              </button>
            </div>
          </FormSection>
        </form>
      )}
      {plan && selected && (
        <>
          <ContributionPreview
            impact={{
              ...plan.impacto,
              participante: plan.compartido.participante,
              evidencia: plan.compartido.evidencia,
              procedencia: plan.compartido.procedencia,
              aviso:
                "Es una Transferencia existente desde Exterior; se acredita sin reescribir importe, fecha, Origen, Destino ni Referencia.",
            }}
            amountLabel={eur(plan.hecho.importe)}
            destination={plan.hecho.destino}
          />
          <section className="panel shared-contribution">
            <h2 tabIndex={-1} ref={focus}>
              Revisión de acreditación histórica
            </h2>
            <p>
              Movimiento <strong>{selected.movimiento}</strong> ·{" "}
              {date(plan.hecho.fecha)} · {eur(plan.hecho.importe)} ·{" "}
              {plan.hecho.origen} → {plan.hecho.destino}
            </p>
            <p className="muted">Evidencia: {plan.compartido.evidencia}</p>
            <p className="muted">Procedencia: {plan.compartido.procedencia}</p>
            {error && <Alert>{error}</Alert>}
            <div className="form-actions">
              <button className="secondary" onClick={() => setPlan(null)}>
                Cancelar
              </button>
              <button className="primary" disabled={busy} onClick={confirm}>
                {busy ? "Acreditando…" : "Confirmar acreditación"}
              </button>
            </div>
          </section>
        </>
      )}
      <section className="panel" aria-label="Aportaciones acreditadas">
        <h2>Aportaciones acreditadas</h2>
        {data.aportaciones.length === 0 ? (
          <p className="muted">Sin aportaciones acreditadas.</p>
        ) : (
          <ul className="shared-aportaciones">
            {data.aportaciones.map((a) => (
              <li key={a.movimiento} className={a.anulado ? "muted" : ""}>
                <span>
                  <strong>{a.participante.nombre}</strong> · {eur(a.importe)} ·{" "}
                  {date(a.fecha)}
                </span>
                <span>
                  {a.procedencia} · revisión {a.revision}
                  {a.anulado ? " · Anulada" : ""}
                </span>
                <small className="muted">Evidencia: {a.evidencia}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
