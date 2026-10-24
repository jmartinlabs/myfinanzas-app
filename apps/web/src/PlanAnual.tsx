import { useEffect, useRef, useState } from "react";
import { api, eur } from "./api";
import { Alert, PageHead } from "./ui";
type Rational = { numeradorCentimos: string; divisor: string };
type Part = {
  id: string;
  nombre: string;
  estado: string;
  categoria: string;
  nombreCategoria: string;
  subcategoria: string;
  nombreSubcategoria: string;
  estadoCategoria: string;
  estadoSubcategoria: string;
};
type Item = {
  partida: Part;
  linea: {
    presupuesto: string | null;
    periodo: string | null;
    esencial: string;
    revision: number;
  } | null;
  ejecutado: string | null;
  subtotalRegistrado: string;
  historicoConocido: string;
  diferencia: string | null;
  fechaEjecutada: string | null;
  cobertura: string;
  motivo: string | null;
  corte: string | null;
  control: { inicio: string; fin: string } | null;
  hechos: { id: string; fecha: string; importe: string }[];
  protecciones: { id: string; motivo: string; verificada: boolean }[];
};
type Plan = {
  ejercicio: number;
  contextRevision: string;
  sinPlan: boolean;
  items: Item[];
  sinLinea: Item[];
  opciones: Part[];
  esencial: {
    estado: string;
    total: Rational | null;
    parcial: Rational | null;
    importesSinInformar: number;
    clasificacionesPendientes: number;
  };
  fuentes: {
    movimientos: boolean;
    historico: boolean;
    cierres: boolean;
    control: { inicio: string; fin: string } | null;
    motivo: string;
  };
  auditoria: {
    id: number;
    instante: string;
    partida: string;
    delta: string;
    motivo: string | null;
  }[];
};
/** Formatting only: exact rational remains in the service/consumer DTO. */
function monthly(r: Rational | null) {
  if (!r) return "—";
  const n = BigInt(r.numeradorCentimos),
    d = BigInt(r.divisor),
    c = (n + d / 2n) / d;
  return eur(`${c / 100n}.${String(c % 100n).padStart(2, "0")}`);
}
export function PlanAnual({ go }: { go: (p: string) => void }) {
  const [year, setYear] = useState(String(new Date().getFullYear())),
    [plan, setPlan] = useState<Plan | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState(""),
    [edit, setEdit] = useState(""),
    [draft, setDraft] = useState({
      presupuesto: "",
      periodo: "",
      esencial: "",
    }),
    [review, setReview] = useState<any>(null),
    [proposal, setProposal] = useState<any>(null),
    [reason, setReason] = useState(""),
    [key, setKey] = useState(crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [detail, setDetail] = useState<Item | null>(null),
    [unplanned, setUnplanned] = useState(false);
  const generation = useRef(0),
    yearRef = useRef(year),
    reviewRef = useRef<HTMLElement>(null),
    errorRef = useRef<HTMLDivElement>(null),
    editRef = useRef<HTMLElement>(null),
    detailRef = useRef<HTMLElement>(null);
  yearRef.current = year;
  async function load(y = year) {
    const request = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const p = await api<Plan>("/plan-anual/" + y);
      if (request === generation.current && yearRef.current === y) {
        setPlan(p);
        setReview(null);
      }
    } catch (e) {
      if (request === generation.current && yearRef.current === y)
        setError((e as Error).message);
    } finally {
      if (request === generation.current && yearRef.current === y)
        setLoading(false);
    }
  }
  useEffect(() => {
    setPlan(null);
    setDetail(null);
    setNotice("");
    void load(year);
    return () => {
      ++generation.current;
    };
  }, [year]);
  useEffect(() => {
    reviewRef.current?.focus();
  }, [review]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (edit) editRef.current?.focus();
  }, [edit]);
  useEffect(() => {
    if (detail) detailRef.current?.focus();
  }, [detail]);
  function begin(id: string) {
    const i = plan!.items.find((i) => i.partida.id === id);
    setEdit(id);
    setDraft({
      presupuesto: i?.linea?.presupuesto ?? "",
      periodo: i?.linea?.periodo ?? "",
      esencial: i?.linea?.esencial ?? "",
    });
    setReview(null);
    setProposal(null);
    setReason("");
    setError("");
    setNotice("");
    setDetail(null);
    setKey(crypto.randomUUID());
  }
  async function preview() {
    if (!plan) return;
    setBusy(true);
    setError("");
    try {
      const p = {
        partida: edit,
        revision:
          plan.items.find((i) => i.partida.id === edit)?.linea?.revision ?? 0,
        contextRevision: plan.contextRevision,
        cambios: {
          presupuesto:
            draft.presupuesto.trim() === ""
              ? null
              : draft.presupuesto.replace(",", "."),
          periodo: draft.periodo === "" ? null : draft.periodo,
          esencial: draft.esencial,
        },
      };
      setProposal(p);
      setReview(await api(`/plan-anual/${year}/impacto`, "POST", p));
      setKey(crypto.randomUUID());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const p = await api<Plan>(
        `/plan-anual/${year}/confirmar`,
        "POST",
        {
          propuesta: proposal,
          fingerprint: review.fingerprint,
          motivo: reason,
        },
        { "idempotency-key": key },
      );
      setPlan(p);
      setEdit("");
      setReview(null);
      setNotice("Plan anual guardado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const items =
    plan?.items.filter(
      (i) =>
        (!query ||
          `${i.partida.id} ${i.partida.nombre}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase())) &&
        (!filter || i.linea?.esencial === filter),
    ) ?? [];
  const fields = (i: Item) => (
    <>
      <dt>Presupuesto</dt>
      <dd>
        {i.linea?.presupuesto === null
          ? "Sin informar"
          : eur(i.linea?.presupuesto ?? null)}
      </dd>
      <dt>Periodo previsto</dt>
      <dd>{i.linea?.periodo || "—"}</dd>
      <dt>Esencial</dt>
      <dd>{i.linea?.esencial ?? "Sin línea"}</dd>
      <dt>Ejecutado</dt>
      <dd>{i.ejecutado === null ? "—" : eur(i.ejecutado)}</dd>
      <dt>Diferencia</dt>
      <dd>{i.diferencia === null ? "—" : eur(i.diferencia)}</dd>
      <dt>Fecha ejecutada</dt>
      <dd>{i.fechaEjecutada ?? "—"}</dd>
    </>
  );
  const actions = (i: Item) => (
    <div className="actions">
      <button
        className="secondary"
        onClick={() => setDetail(i)}
        aria-label={`Detalle ${i.partida.nombre}`}
      >
        Detalle
      </button>
      <button
        className="secondary"
        disabled={!!edit || busy}
        onClick={() => begin(i.partida.id)}
        aria-label={`Editar ${i.partida.nombre}`}
      >
        {i.protecciones.length
          ? "Protegido: ver motivo"
          : "Editar / Revisar impacto"}
      </button>
    </div>
  );
  return (
    <>
      <PageHead
        eyebrow="PLANIFICACIÓN"
        title="Plan anual"
        description="Una línea por Partida y ejercicio natural. Importes manuales, ejecución por Fecha real."
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
          Ejercicio
          <select
            aria-label="Ejercicio del plan anual"
            disabled={!!edit || busy}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {Array.from(
              { length: 21 },
              (_, i) => new Date().getFullYear() - 10 + i,
            ).map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <button className="secondary" disabled={busy} onClick={() => load()}>
          Actualizar contexto
        </button>
      </section>
      {loading && <p role="status">Cargando plan anual…</p>}
      {plan && !loading && (
        <>
          <section
            className="panel annual-coverage"
            aria-label="Cobertura y procedencia"
          >
            <h2>Cobertura y procedencia</h2>
            <p>{plan.fuentes.motivo}</p>
            <p>
              Control:{" "}
              {plan.fuentes.control
                ? `${plan.fuentes.control.inicio} — ${plan.fuentes.control.fin}`
                : "No verificable"}{" "}
              · Histórico:{" "}
              {plan.fuentes.historico ? "Disponible" : "No instalado"} ·
              Cierres:{" "}
              {plan.fuentes.cierres
                ? "Proveedor disponible"
                : "Integración pendiente"}
              .
            </p>
            <p>
              El subtotal registrado y la última fecha conocida no acreditan un
              total anual completo. La cobertura se desglosa por Partida.
            </p>
          </section>
          <section
            className="panel annual-essential"
            aria-label="Equivalente esencial mensual anual"
          >
            <h2>Equivalente esencial mensual anual</h2>
            <strong>
              {plan.esencial.estado}
              {plan.esencial.total
                ? `: ${monthly(plan.esencial.total)}/mes`
                : ""}
            </strong>
            {plan.esencial.parcial && (
              <p>
                {plan.esencial.estado === "Incompleto"
                  ? "Parcial conocido"
                  : "Suma anual / 12"}
                : {monthly(plan.esencial.parcial)}/mes{" "}
                <span className="muted">
                  (presentación redondeada; cálculo exacto)
                </span>
              </p>
            )}
            <p>
              Importes esenciales sin informar:{" "}
              {plan.esencial.importesSinInformar} · Clasificaciones Esencial
              pendientes: {plan.esencial.clasificacionesPendientes} (excluidas
              de la suma).
            </p>
            <p>
              No es el Coste esencial mensual global ni un objetivo definitivo
              de liquidez.
            </p>
          </section>
          {plan.sinPlan && (
            <section className="panel">
              <h2>Sin plan anual</h2>
              <p>
                Añade una Partida explícitamente. No se copian ni crean
                presupuestos al abrir el ejercicio.
              </p>
            </section>
          )}
          {!edit && (
            <label className="annual-add">
              Añadir Partida
              <select
                aria-label="Añadir Partida al plan anual"
                value=""
                onChange={(e) => {
                  if (e.target.value) begin(e.target.value);
                }}
              >
                <option value="">Seleccionar Partida activa</option>
                {plan.opciones
                  .filter(
                    (p) =>
                      p.estado === "Activa" &&
                      p.estadoCategoria === "Activa" &&
                      p.estadoSubcategoria === "Activa" &&
                      !plan.items.some((i) => i.partida.id === p.id),
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} · {p.nombre}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <section
            className="panel plan-controls"
            aria-label="Filtros del plan anual"
          >
            <label>
              Buscar Partida
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <label>
              Esencial
              <select
                aria-label="Filtrar Esencial"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">Todas las clasificaciones</option>
                {["Sí", "No", "Pendiente"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </section>
          {!!items.length && (
            <>
              <div className="desktop-list annual-table">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Partida",
                        "Presupuesto",
                        "Periodo previsto",
                        "Esencial",
                        "Ejecutado",
                        "Diferencia",
                        "Fecha ejecutada",
                        "Acciones",
                      ].map((s) => (
                        <th key={s}>{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.partida.id}>
                        <td>
                          <strong>
                            {i.partida.id} · {i.partida.nombre}
                          </strong>
                          {i.partida.estado !== "Activa" && <p>Inactiva</p>}
                          <small>{i.cobertura}</small>
                        </td>
                        <td>
                          {i.linea?.presupuesto === null
                            ? "Sin informar"
                            : eur(i.linea?.presupuesto ?? null)}
                        </td>
                        <td>{i.linea?.periodo ?? "—"}</td>
                        <td>{i.linea?.esencial}</td>
                        <td>{i.ejecutado === null ? "—" : eur(i.ejecutado)}</td>
                        <td>
                          {i.diferencia === null ? "—" : eur(i.diferencia)}
                        </td>
                        <td>{i.fechaEjecutada ?? "—"}</td>
                        <td>{actions(i)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-list annual-cards">
                {items.map((i) => (
                  <article className="panel" key={i.partida.id}>
                    <h2>
                      {i.partida.id} · {i.partida.nombre}
                    </h2>
                    {i.partida.estado !== "Activa" && <p>Inactiva</p>}
                    <p>{i.cobertura}</p>
                    <dl className="annual-values">{fields(i)}</dl>
                    {i.motivo && <p className="help">{i.motivo}</p>}
                    {actions(i)}
                  </article>
                ))}
              </div>
            </>
          )}
          {!items.length && !plan.sinPlan && (
            <p>Sin líneas para estos filtros.</p>
          )}
          {edit && (
            <section
              className="panel annual-editor"
              tabIndex={-1}
              ref={editRef}
            >
              <h2>
                {plan.items.some((i) => i.partida.id === edit)
                  ? "Editar"
                  : "Añadir"}{" "}
                línea · {edit} · Ejercicio {year}
              </h2>
              {!review ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void preview();
                  }}
                >
                  <div className="form-grid">
                    <label>
                      Presupuesto (€)
                      <input
                        inputMode="decimal"
                        value={draft.presupuesto}
                        onChange={(e) =>
                          setDraft({ ...draft, presupuesto: e.target.value })
                        }
                        aria-describedby="annual-empty"
                      />
                    </label>
                    <label>
                      Periodo previsto
                      <input
                        value={draft.periodo}
                        maxLength={500}
                        onChange={(e) =>
                          setDraft({ ...draft, periodo: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Esencial
                      <select
                        required
                        value={draft.esencial}
                        onChange={(e) =>
                          setDraft({ ...draft, esencial: e.target.value })
                        }
                      >
                        <option value="">Elegir</option>
                        {["Sí", "No", "Pendiente"].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p id="annual-empty">
                    Vacío ≠ 0. Periodo previsto es texto informativo; no genera
                    calendario. Ejecutado, Diferencia y Fecha ejecutada son de
                    solo lectura.
                  </p>
                  <div className="actions">
                    <button disabled={busy}>Revisar impacto</button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => setEdit("")}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <section tabIndex={-1} ref={reviewRef}>
                  <h3>Revisión de impacto</h3>
                  <p>
                    {review.requiereMotivo
                      ? "Ejercicio pasado: motivo obligatorio y confirmación explícita."
                      : "Comprueba los cambios antes de confirmar."}
                  </p>
                  <dl>
                    {Object.entries(review.delta).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>
                          {String((v as any).anterior ?? "Sin informar")} →{" "}
                          {String((v as any).posterior ?? "Sin informar")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <section aria-label="Cambios de derivados">
                    <h4>Derivados · Antes → Después</h4>
                    <dl>
                      <dt>Ejecutado</dt>
                      <dd>
                        {eur(review.derivadosAntes.ejecutado)} →{" "}
                        {eur(review.derivadosDespues.ejecutado)}
                      </dd>
                      <dt>Diferencia</dt>
                      <dd>
                        {eur(review.derivadosAntes.diferencia)} →{" "}
                        {eur(review.derivadosDespues.diferencia)}
                      </dd>
                      <dt>Fecha ejecutada conocida</dt>
                      <dd>
                        {review.derivadosAntes.fechaEjecutada ??
                          "Sin fecha conocida"}{" "}
                        →{" "}
                        {review.derivadosDespues.fechaEjecutada ??
                          "Sin fecha conocida"}
                      </dd>
                      <dt>Cobertura</dt>
                      <dd>
                        {review.derivadosAntes.cobertura} →{" "}
                        {review.derivadosDespues.cobertura}
                      </dd>
                      <dt>Motivo de ejecución</dt>
                      <dd>
                        {review.derivadosAntes.motivo ?? "Verificable al corte"}{" "}
                        →{" "}
                        {review.derivadosDespues.motivo ??
                          "Verificable al corte"}
                      </dd>
                      <dt>Motivo de diferencia</dt>
                      <dd>
                        {review.derivadosAntes.motivoDiferencia ??
                          "Operandos verificables"}{" "}
                        →{" "}
                        {review.derivadosDespues.motivoDiferencia ??
                          "Operandos verificables"}
                      </dd>
                    </dl>
                    <p>
                      Subtotal registrado:{" "}
                      {eur(review.derivadosAntes.subtotalRegistrado)} →{" "}
                      {eur(review.derivadosDespues.subtotalRegistrado)}. Corte:{" "}
                      {review.derivadosDespues.corte ?? "No verificable"}. Una
                      fecha conocida no acredita cobertura completa.
                    </p>
                  </section>
                  <section aria-label="Cambios del equivalente esencial">
                    <h4>Equivalente esencial · Antes → Después</h4>
                    <p>
                      {review.equivalenteAntes.estado}:{" "}
                      {monthly(review.equivalenteAntes.total)}/mes →{" "}
                      {review.equivalenteDespues.estado}:{" "}
                      {monthly(review.equivalenteDespues.total)}/mes
                    </p>
                    <p>
                      Parcial conocido:{" "}
                      {monthly(review.equivalenteAntes.parcial)}/mes →{" "}
                      {monthly(review.equivalenteDespues.parcial)}/mes.
                    </p>
                    <p>
                      Precisión conservada:{" "}
                      {review.equivalenteAntes.parcial
                        ? `${review.equivalenteAntes.parcial.numeradorCentimos} céntimos / ${review.equivalenteAntes.parcial.divisor}`
                        : "Sin plan anual"}{" "}
                      →{" "}
                      {review.equivalenteDespues.parcial
                        ? `${review.equivalenteDespues.parcial.numeradorCentimos} céntimos / ${review.equivalenteDespues.parcial.divisor}`
                        : "Sin plan anual"}
                      .
                    </p>
                    <p>
                      Importes sin informar:{" "}
                      {review.equivalenteAntes.importesSinInformar} →{" "}
                      {review.equivalenteDespues.importesSinInformar}.
                      Clasificaciones pendientes:{" "}
                      {review.equivalenteAntes.clasificacionesPendientes} →{" "}
                      {review.equivalenteDespues.clasificacionesPendientes}.
                    </p>
                  </section>
                  <section aria-label="Relaciones afectadas">
                    <h4>Relaciones por ID</h4>
                    <p>
                      {edit}, ejercicio {year}.
                    </p>
                    {review.relaciones.ciclos.length ? (
                      <ul>
                        {review.relaciones.ciclos.map((c: any) => (
                          <li key={c.id}>
                            Ciclo {c.id}: {c.inicio} —{" "}
                            {c.fin ?? "Sin fin temporal"}
                            {c.corte ? ` · Corte ${c.corte}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        Sin ciclos con intervalo que intersecte el ejercicio.
                      </p>
                    )}
                  </section>
                  <p>
                    Cierres/fotografías:{" "}
                    {review.fuentes.cierres
                      ? "Proveedor consultado"
                      : "Proveedor futuro no instalado; integración pendiente"}
                    .
                  </p>
                  {review.protecciones.map((p: any) => (
                    <p role="alert" key={p.id}>
                      Protegido · {p.id}: {p.motivo}
                      {!p.verificada ? " · Protección no verificable" : ""}
                    </p>
                  ))}
                  <label>
                    Motivo
                    {review.requiereMotivo ? " obligatorio" : " (opcional)"}
                    <textarea
                      value={reason}
                      maxLength={2000}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <div className="actions">
                    <button
                      disabled={
                        busy ||
                        review.bloqueado ||
                        (review.requiereMotivo && !reason.trim())
                      }
                      onClick={confirm}
                    >
                      Confirmar plan anual
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
            <section
              className="panel"
              aria-label="Detalle anual"
              tabIndex={-1}
              ref={detailRef}
            >
              <h2>
                Detalle · {detail.partida.id} · {detail.partida.nombre}
              </h2>
              <p>
                {detail.partida.nombreCategoria} /{" "}
                {detail.partida.nombreSubcategoria}
              </p>
              <dl className="annual-values">{fields(detail)}</dl>
              <p>{detail.motivo ?? "Verificable únicamente hasta el corte"}</p>
              <p>
                Subtotal registrado: {eur(detail.subtotalRegistrado)} ·
                Histórico conocido: {eur(detail.historicoConocido)} · Corte:{" "}
                {detail.corte ?? "No verificable"}
              </p>
              <p>
                La fecha es la más reciente conocida; no prueba cobertura
                completa.
              </p>
              <ul>
                {detail.hechos.map((h) => (
                  <li key={h.id}>
                    <a
                      href={`/movimientos/${h.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        go(`/movimientos/${h.id}`);
                      }}
                    >
                      {h.fecha} · Gasto {h.id} · {eur(h.importe)}
                    </a>
                  </li>
                ))}
              </ul>
              <button className="secondary" onClick={() => setDetail(null)}>
                Cerrar detalle
              </button>
            </section>
          )}
          <section className="panel">
            <button
              className="secondary"
              onClick={() => setUnplanned(!unplanned)}
              aria-expanded={unplanned}
            >
              Consultar ejecución registrada sin línea ({plan.sinLinea.length})
            </button>
            {unplanned && (
              <>
                <p>Hechos conocidos sin objetivo ni línea inventados.</p>
                {plan.sinLinea.map((i) => (
                  <article key={i.partida.id}>
                    <h3>
                      {i.partida.id} · {i.partida.nombre}
                    </h3>
                    <p>
                      Subtotal registrado: {eur(i.subtotalRegistrado)} · Fecha
                      conocida: {i.fechaEjecutada ?? "—"}
                    </p>
                    <button className="secondary" onClick={() => setDetail(i)}>
                      Ver Gastos de {i.partida.nombre}
                    </button>
                  </article>
                ))}
              </>
            )}
          </section>
          <details className="panel">
            <summary>Auditoría de entradas ({plan.auditoria.length})</summary>
            {plan.auditoria.map((a) => (
              <article key={a.id}>
                <p>
                  {a.instante} · {a.partida} ·{" "}
                  {a.motivo || "Sin motivo adicional"}
                </p>
                <p>{a.delta}</p>
              </article>
            ))}
          </details>
        </>
      )}
    </>
  );
}
