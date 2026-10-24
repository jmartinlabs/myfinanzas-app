import { useEffect, useRef, useState } from "react";
import { api, eur } from "./api";
import { Alert, PageHead } from "./ui";
const madridMonth = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
const blank = () => ({
  mes: madridMonth(),
  tipo: "Ordinaria",
  guardia: null as string | null,
  devengo: null as string | null,
  base: null as string | null,
  irpf: null as string | null,
  variable: null as string | null,
  historico: null as string | null,
  documentado: null as string | null,
  evidencia: "",
  evidenciaDocumentado: "",
  verificado: false,
  documentadoVerificado: false,
  nota: "",
});
const labels: Record<string, string> = {
  devengo: "Devengo €",
  base: "Base IRPF €",
  irpf: "IRPF %",
  variable: "Variable histórica €",
  historico: "Neto histórico €",
  documentado: "Neto documentado €",
};
export function Nomina() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("Histórico"),
    [mes, setMes] = useState(""),
    [tipo, setTipo] = useState("Todas"),
    [draft, setDraft] = useState<any>(null),
    [id, setId] = useState<string | null>(null),
    [documentOnly, setDocumentOnly] = useState(false),
    [motivo, setMotivo] = useState(""),
    [preview, setPreview] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [movement, setMovement] = useState(""),
    [parts, setParts] = useState<any[]>([]),
    [resolve, setResolve] = useState<any>(null),
    [cutoff, setCutoff] = useState(madridMonth()),
    [variable, setVariable] = useState("0"),
    [ajuste, setAjuste] = useState("0"),
    [reference, setReference] = useState(""),
    [evidence, setEvidence] = useState(""),
    [forecast, setForecast] = useState<any>(null);
  const mutationVersion = useRef(0),
    forecastVersion = useRef(0);
  const generation = useRef(0),
    alert = useRef<HTMLDivElement>(null),
    key = useRef(crypto.randomUUID());
  async function load() {
    const n = ++generation.current;
    try {
      const r = await api("/nomina");
      if (n === generation.current) setData(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, []);
  useEffect(() => {
    mutationVersion.current++;
    setPreview(null);
  }, [draft, parts, motivo, resolve, movement, tab, data?.contexto]);
  useEffect(() => {
    forecastVersion.current++;
    setForecast(null);
  }, [variable, ajuste, reference, evidence, cutoff, data?.contexto]);
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  const action = () =>
    tab === "Cobros/asociaciones"
      ? { accion: "repartir", movimiento: movement, asignaciones: parts }
      : resolve
        ? {
            accion: "resolver",
            id: resolve.id,
            fuente: resolve.fuente,
            evidencia: resolve.evidencia,
          }
        : { accion: "guardar", id, paga: draft };
  async function review() {
    setError("");
    setBusy(true);
    try {
      const version = mutationVersion.current;
      const b = { ...action(), motivo };
      const r = await api("/nomina/impacto", "POST", b);
      if (version !== mutationVersion.current) return;
      key.current = crypto.randomUUID();
      setPreview({ ...r, request: { ...b, contexto: r.contexto } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    try {
      setData(
        await api("/nomina/confirmar", "POST", preview.request, {
          "idempotency-key": key.current,
        }),
      );
      setPreview(null);
      setDraft(null);
      setResolve(null);
      setMotivo("");
      setParts([]);
      setMovement("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(p: any, documentOnly = false) {
    setDocumentOnly(documentOnly);
    const fields = blank();
    for (const k of Object.keys(fields)) (fields as any)[k] = p[k];
    setDraft(fields);
    setId(p.id);
    setPreview(null);
    setResolve(null);
  }
  const amount = (v: string | null) =>
    v === null ? "Sin informar" : eur(v.includes(".") ? v : v + ".00");
  return (
    <>
      <PageHead
        eyebrow="E2.5 · Documentación salarial"
        title="Nómina"
        description="Mes salarial, cobro bancario y estimación son magnitudes separadas. El ciclo se determina por la Fecha bancaria real."
      />
      <div ref={alert} tabIndex={-1}>
        {error && (
          <Alert
            retry={() => {
              void load();
              setPreview(null);
            }}
          >
            {error} El borrador se conserva. Revisa el contexto antes de
            confirmar de nuevo.
          </Alert>
        )}
      </div>
      <div className="actions" role="group" aria-label="Vistas de Nómina">
        {["Histórico", "Cobros/asociaciones", "Pronóstico"].map((t) => (
          <button
            key={t}
            aria-pressed={t === tab}
            className={t === tab ? "primary" : "secondary"}
            onClick={() => {
              setTab(t);
              setPreview(null);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {!data ? (
        <p role="status">Cargando Nómina…</p>
      ) : (
        <>
          {tab === "Histórico" && (
            <>
              <div className="filters">
                <label>
                  Mes nómina
                  <input
                    type="month"
                    value={mes}
                    onChange={(e) => setMes(e.target.value)}
                  />
                </label>
                <label>
                  Tipo
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                  >
                    {["Todas", "Ordinaria", "Bonus"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="primary"
                  onClick={() => {
                    setDraft(blank());
                    setDocumentOnly(false);
                    setId(null);
                    setResolve(null);
                    setPreview(null);
                  }}
                >
                  Añadir paga documentada
                </button>
              </div>
              {data.pagas.length === 0 && (
                <p className="empty">
                  Sin pagas documentadas. No se infiere nómina cero.
                </p>
              )}
              <div className="payroll-table table-wrap">
                <table>
                  <caption>
                    Pagas documentadas · importes independientes
                  </caption>
                  <thead>
                    <tr>
                      {[
                        "Paga / Mes / Tipo",
                        "Neto histórico",
                        "Neto documentado",
                        "Cobrado asignado",
                        "Conciliación",
                        "Acciones",
                      ].map((t) => (
                        <th key={t}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.pagas
                      .filter(
                        (p: any) =>
                          (!mes || p.mes === mes) &&
                          (tipo === "Todas" || p.tipo === tipo),
                      )
                      .map((p: any) => (
                        <tr key={p.id}>
                          <td>
                            <strong>
                              {p.mes} · {p.tipo}
                            </strong>
                            <br />
                            <span className="payroll-id">{p.id}</span>
                          </td>
                          <td>{amount(p.historico)}</td>
                          <td>{amount(p.documentado)}</td>
                          <td>
                            {amount(p.cobrado)}
                            <br />
                            {p.numeroIngresos} ingresos
                          </td>
                          <td>
                            {p.motivo}
                            <br />
                            Diferencia {amount(p.diferencia)}
                            <br />
                            Fecha completa{" "}
                            <span className="payroll-date">
                              {p.fechaCompleta ?? "No acreditada"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="secondary"
                              onClick={() => edit(p)}
                            >
                              Revisar originales
                            </button>
                            <button
                              className="secondary"
                              onClick={() => edit(p, true)}
                            >
                              Documentar neto
                            </button>
                            {p.discrepancia && (
                              <button
                                className="secondary"
                                onClick={() => {
                                  setResolve({
                                    id: p.id,
                                    fuente: "Documentado",
                                    evidencia: "",
                                  });
                                  setDraft(null);
                                }}
                              >
                                Resolver discrepancia
                              </button>
                            )}
                            <details>
                              <summary>Originales, fuentes y cobros</summary>
                              <p>
                                Devengo {amount(p.devengo)} · Base IRPF{" "}
                                {amount(p.base)} · IRPF{" "}
                                {p.irpf ?? "Sin informar"}% · Variable histórica{" "}
                                {amount(p.variable)} · Guardia{" "}
                                {p.guardia ?? "Sin informar"}
                              </p>
                              <p>
                                {p.evidencia} ·{" "}
                                {p.evidenciaDocumentado ||
                                  "Neto documentado sin informar"}{" "}
                                · {p.nota}
                              </p>
                              <p>
                                Neto {amount(p.neto)} ·{" "}
                                {p.origenNeto ?? "Sin fuente"} ·{" "}
                                {p.derivadosParciales ? "Parcial" : "Completo"}
                              </p>
                              <p>
                                Retención {amount(p.retencion)} · Deducciones{" "}
                                {amount(p.deducciones)} · Estructural{" "}
                                {amount(p.estructural)}
                              </p>
                              <p>
                                Primera / última fecha {p.primeraFecha ?? "—"} /{" "}
                                {p.ultimaFecha ?? "—"}
                              </p>
                              {p.asignaciones.map((a: any) => (
                                <p key={a.movimiento}>
                                  #{a.movimiento} · {a.fecha} ·{" "}
                                  {amount(a.importe)} · {a.evidencia} ·{" "}
                                  {a.valida
                                    ? "Verificable"
                                    : "Requiere revisión"}
                                </p>
                              ))}
                            </details>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="payroll-cards">
                {data.pagas
                  .filter(
                    (p: any) =>
                      (!mes || p.mes === mes) &&
                      (tipo === "Todas" || p.tipo === tipo),
                  )
                  .map((p: any) => (
                    <article className="panel payroll-card" key={p.id}>
                      <h2>
                        {p.mes} · {p.tipo}
                      </h2>
                      <p className="muted payroll-id">
                        {p.id} · revisión {p.revision}
                      </p>
                      <dl>
                        <dt>Neto histórico</dt>
                        <dd>{amount(p.historico)}</dd>
                        <dt>Neto documentado</dt>
                        <dd>{amount(p.documentado)}</dd>
                        <dt>Cobrado asignado</dt>
                        <dd>
                          {amount(p.cobrado)} · {p.numeroIngresos} ingresos
                        </dd>
                        <dt>Diferencia</dt>
                        <dd>
                          {p.diferencia === null
                            ? "No disponible"
                            : amount(p.diferencia)}
                        </dd>
                        <dt>Primera / última fecha bancaria</dt>
                        <dd>
                          {p.primeraFecha ?? "—"} / {p.ultimaFecha ?? "—"}
                        </dd>
                        <dt>Fecha de cobro completo</dt>
                        <dd>
                          <span className="payroll-date">
                            {p.fechaCompleta ?? "No acreditada"}
                          </span>
                        </dd>
                      </dl>
                      <p>
                        {p.numeroIngresos === 0 ? "Sin cobros asociados. " : ""}
                        {p.motivo}
                      </p>
                      <details>
                        <summary>Originales, procedencia y derivados</summary>
                        <p>
                          Devengo {amount(p.devengo)} · Base IRPF{" "}
                          {amount(p.base)} · IRPF {p.irpf ?? "Sin informar"}% ·
                          Variable histórica {amount(p.variable)} · Nota:{" "}
                          {p.nota || "Sin informar"}
                        </p>
                        <p>
                          Evidencia salarial: {p.evidencia} ·{" "}
                          {p.verificado
                            ? "Verificada"
                            : "Pendiente de verificar"}
                        </p>
                        <p>
                          Evidencia de Neto documentado:{" "}
                          {p.evidenciaDocumentado || "Sin informar"}
                        </p>
                        <p>
                          Guardia: {p.guardia ?? "Sin informar"} · Neto:{" "}
                          {amount(p.neto)} · Origen{" "}
                          {p.origenNeto ?? "Sin fuente"}
                        </p>
                        <p>
                          Retención: {amount(p.retencion)} · Deducciones no
                          IRPF: {amount(p.deducciones)} · Neto estructural:{" "}
                          {amount(p.estructural)}
                        </p>
                        <p>
                          {p.derivadosParciales
                            ? "Derivados parciales; no son referencia fiscal definitiva"
                            : "Contexto de Neto completo"}
                        </p>
                        {p.asignaciones.map((a: any) => (
                          <p key={a.movimiento}>
                            Movimiento #{a.movimiento}: {amount(a.importe)} ·{" "}
                            {a.fecha} ·{" "}
                            {a.valida ? "Verificable" : "Requiere revisión"} ·{" "}
                            {a.evidencia}
                          </p>
                        ))}
                      </details>
                      <div className="actions">
                        <button className="secondary" onClick={() => edit(p)}>
                          Revisar originales
                        </button>
                        <button
                          className="secondary"
                          onClick={() => edit(p, true)}
                        >
                          Documentar neto
                        </button>
                        {p.discrepancia && (
                          <button
                            className="secondary"
                            onClick={() => {
                              setResolve({
                                id: p.id,
                                fuente: "Documentado",
                                evidencia: "",
                              });
                              setDraft(null);
                            }}
                          >
                            Resolver discrepancia
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
              </div>
              {draft && (
                <section className="panel">
                  <h2>
                    {id ? "Revisar paga documentada" : "Nueva paga documentada"}
                  </h2>
                  <p>
                    {id ?? "ID estable asignado al confirmar"}. Vacío ≠ 0
                    informado. No autocompletar desde cobros.
                  </p>
                  <div className="form-grid">
                    <label>
                      Mes salarial
                      <input
                        type="month"
                        disabled={documentOnly}
                        value={draft.mes}
                        onChange={(e) =>
                          setDraft({ ...draft, mes: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Tipo de paga
                      <select
                        aria-label="Tipo de paga"
                        disabled={documentOnly}
                        value={draft.tipo}
                        onChange={(e) =>
                          setDraft({ ...draft, tipo: e.target.value })
                        }
                      >
                        <option>Ordinaria</option>
                        <option>Bonus</option>
                      </select>
                    </label>
                    <label>
                      Guardia
                      <select
                        aria-label="Guardia"
                        disabled={documentOnly}
                        value={draft.guardia ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            guardia: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Sin informar</option>
                        <option>Sí</option>
                        <option>No</option>
                      </select>
                    </label>
                    {Object.entries(labels).map(([k, label]) => (
                      <label key={k}>
                        {label}
                        <input
                          inputMode="decimal"
                          disabled={documentOnly && k !== "documentado"}
                          value={draft[k] ?? ""}
                          onChange={(e) =>
                            setDraft({ ...draft, [k]: e.target.value || null })
                          }
                        />
                      </label>
                    ))}
                    <label>
                      Evidencia salarial
                      <input
                        disabled={documentOnly}
                        value={draft.evidencia}
                        onChange={(e) =>
                          setDraft({ ...draft, evidencia: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Evidencia de Neto documentado
                      <input
                        value={draft.evidenciaDocumentado}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            evidenciaDocumentado: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        disabled={documentOnly}
                        checked={draft.verificado}
                        onChange={(e) =>
                          setDraft({ ...draft, verificado: e.target.checked })
                        }
                      />{" "}
                      Originales salariales verificados
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={draft.documentadoVerificado}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            documentadoVerificado: e.target.checked,
                          })
                        }
                      />{" "}
                      Neto documentado verificado
                    </label>
                    <label>
                      Nota
                      <textarea
                        disabled={documentOnly}
                        value={draft.nota}
                        onChange={(e) =>
                          setDraft({ ...draft, nota: e.target.value })
                        }
                      />
                    </label>
                  </div>
                </section>
              )}
              {resolve && (
                <section className="panel">
                  <h2>Resolver discrepancia documental</h2>
                  <p>
                    {resolve.id}. Revisar ambas fuentes; la selección no cambia
                    el Neto salarial histórico.
                  </p>
                  <label>
                    Referencia válida
                    <select
                      aria-label="Referencia válida"
                      value={resolve.fuente}
                      onChange={(e) =>
                        setResolve({ ...resolve, fuente: e.target.value })
                      }
                    >
                      <option>Documentado</option>
                      <option>Histórico</option>
                    </select>
                  </label>
                  <label>
                    Evidencia de resolución
                    <input
                      value={resolve.evidencia}
                      onChange={(e) =>
                        setResolve({ ...resolve, evidencia: e.target.value })
                      }
                    />
                  </label>
                </section>
              )}
            </>
          )}
          {tab === "Cobros/asociaciones" && (
            <section className="panel">
              <h2>Cobros bancarios y reparto global</h2>
              <p>
                Un Movimiento se cuenta una sola vez. Sin evidencia, el
                remanente queda pendiente de asociación; el banco sigue
                realizado.
              </p>
              {data.movimientos.length === 0 && (
                <p>Sin movimientos salariales elegibles.</p>
              )}
              <label>
                Movimiento
                <select
                  aria-label="Movimiento"
                  value={movement}
                  onChange={(e) => {
                    setMovement(e.target.value);
                    const m = data.movimientos.find(
                      (m: any) => m.id === e.target.value,
                    );
                    setParts(
                      m?.asignaciones.map((a: any) => ({
                        paga: a.paga,
                        importe: a.importe,
                        evidencia: a.evidencia,
                      })) ?? [],
                    );
                    setPreview(null);
                  }}
                >
                  <option value="">Selecciona ID bancario</option>
                  {data.movimientos.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      #{m.id} · {m.fecha} · {m.subtipo} · {amount(m.importe)}
                    </option>
                  ))}
                </select>
              </label>
              {movement &&
                (() => {
                  const m = data.movimientos.find(
                    (m: any) => m.id === movement,
                  );
                  return (
                    <>
                      <p>
                        Importe real: {amount(m.importe)} · Total asignado
                        antes: {amount(m.totalAsignado)} · Resto:{" "}
                        {m.remanente === null
                          ? "Requiere revisión"
                          : amount(m.remanente)}{" "}
                        · Destino {m.destino}
                      </p>
                      {m.requiereRevision && (
                        <Alert>
                          Las asignaciones requieren revisión tras una
                          corrección bancaria.
                        </Alert>
                      )}
                      <p>
                        Se presenta el conjunto completo, incluidas otras pagas
                        y meses. Un desglose mixto conserva el Subtipo bancario{" "}
                        {m.subtipo}.
                      </p>
                      {parts.map((a, i) => (
                        <div className="form-grid" key={i}>
                          <label>
                            Paga del reparto {i + 1}
                            <select
                              aria-label={`Paga del reparto ${i + 1}`}
                              value={a.paga}
                              onChange={(e) =>
                                setParts(
                                  parts.map((v, j) =>
                                    j === i
                                      ? { ...v, paga: e.target.value }
                                      : v,
                                  ),
                                )
                              }
                            >
                              <option value="">Selecciona paga</option>
                              {data.pagas.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                  {p.mes} · {p.tipo} · {p.id}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Importe asignado € {i + 1}
                            <input
                              inputMode="decimal"
                              value={a.importe}
                              onChange={(e) =>
                                setParts(
                                  parts.map((v, j) =>
                                    j === i
                                      ? { ...v, importe: e.target.value }
                                      : v,
                                  ),
                                )
                              }
                            />
                          </label>
                          <label>
                            Evidencia del reparto {i + 1}
                            <input
                              value={a.evidencia}
                              onChange={(e) =>
                                setParts(
                                  parts.map((v, j) =>
                                    j === i
                                      ? { ...v, evidencia: e.target.value }
                                      : v,
                                  ),
                                )
                              }
                            />
                          </label>
                          <button
                            className="secondary"
                            onClick={() =>
                              setParts(parts.filter((_, j) => j !== i))
                            }
                          >
                            Desvincular fila {i + 1}
                          </button>
                        </div>
                      ))}
                      <button
                        className="secondary"
                        onClick={() =>
                          setParts([
                            ...parts,
                            { paga: "", importe: "", evidencia: "" },
                          ])
                        }
                      >
                        Añadir asignación
                      </button>
                    </>
                  );
                })()}
            </section>
          )}
          {tab === "Pronóstico" && (
            <section className="panel">
              <h2>Estimado · simulación informativa</h2>
              <p>
                Fuentes coherentes de una paga Ordinaria completa. No modifica
                histórico, Movimientos, presupuesto ni Ciclos.
              </p>
              <div className="form-grid">
                <label>
                  Mes/corte consultado
                  <input
                    type="month"
                    value={cutoff}
                    onChange={(e) => setCutoff(e.target.value)}
                  />
                </label>
                <label>
                  Variable prevista €
                  <input
                    value={variable}
                    inputMode="decimal"
                    onChange={(e) => setVariable(e.target.value)}
                  />
                </label>
                <label>
                  Ajuste IRPF pp
                  <input
                    value={ajuste}
                    inputMode="decimal"
                    onChange={(e) => setAjuste(e.target.value)}
                  />
                </label>
                <label>
                  ID referencia en empate
                  <select
                    aria-label="ID referencia en empate"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  >
                    <option value="">Selección automática solo si única</option>
                    {data.pagas.map((p: any) => (
                      <option key={p.id}>{p.id}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Evidencia de selección
                  <input
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                  />
                </label>
              </div>
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const version = forecastVersion.current;
                    const result = await api("/nomina/pronostico", "POST", {
                      variable,
                      ajuste,
                      corte: cutoff,
                      contexto: data.contexto,
                      id: reference || undefined,
                      evidencia: evidence,
                      revision: data.pagas.find((p: any) => p.id === reference)
                        ?.revision,
                    });
                    if (version === forecastVersion.current)
                      setForecast(result);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Calcular pronóstico
              </button>
              {forecast &&
                (!forecast.disponible ? (
                  <p role="status">{forecast.motivo}</p>
                ) : (
                  <>
                    <p>
                      Variable prevista {amount(forecast.variable)} · Ajuste{" "}
                      {forecast.ajuste} pp · Corte {forecast.corte}
                    </p>
                    <p>
                      Referencia: {forecast.referencia.id} ·{" "}
                      {forecast.referencia.mes} · revisión{" "}
                      {forecast.referencia.revision} ·{" "}
                      {forecast.referencia.evidencia}
                    </p>
                    <p>
                      Devengo {amount(forecast.referencia.devengo)} · Base{" "}
                      {amount(forecast.referencia.base)} · IRPF{" "}
                      {forecast.referencia.irpf}% · Deducciones{" "}
                      {amount(forecast.referencia.deducciones)}
                    </p>
                    <div className="form-grid">
                      {["base", "prudente"].map((k) => (
                        <article key={k}>
                          <h3>
                            {k === "base"
                              ? "Estimado"
                              : "Prudente (+0,27pp sobre referencia)"}
                          </h3>
                          <p>
                            {forecast[k].disponible
                              ? amount(forecast[k].neto)
                              : forecast[k].motivo}
                          </p>
                          <p>IRPF {forecast[k].tasa}%</p>
                        </article>
                      ))}
                    </div>
                    <p>
                      Diferencia prudente − estimado:{" "}
                      {forecast.diferencia === null
                        ? "No disponible"
                        : amount(forecast.diferencia)}
                    </p>
                  </>
                ))}
            </section>
          )}
          {((tab === "Histórico" && (draft || resolve)) ||
            (tab === "Cobros/asociaciones" && movement)) && (
            <section className="panel">
              <label>
                Motivo de la revisión
                <input
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </label>
              <div className="actions">
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void review()}
                >
                  Revisar impacto
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setDraft(null);
                    setResolve(null);
                    setPreview(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </section>
          )}
          {preview && (
            <section className="panel" aria-label="Confirmación de Nómina">
              <h2>Revisión antes de confirmar</h2>
              <p>{preview.advertencia}</p>
              {preview.despues.movimientos
                .filter((m: any) => m.id === movement)
                .map((m: any) => (
                  <p key={m.id}>
                    Movimiento #{m.id}: importe real {amount(m.importe)} · Total
                    asignado después {amount(m.totalAsignado)} · Remanente{" "}
                    {amount(m.remanente)}
                  </p>
                ))}
              <details>
                <summary>
                  Comparar originales y relaciones antes / después
                </summary>
                <div>
                  {preview.despues.pagas.map((p: any) => {
                    const before = preview.antes.pagas.find(
                      (q: any) => q.id === p.id,
                    );
                    return (
                      <article key={p.id}>
                        <h3>
                          {p.mes} · {p.tipo} · {p.id}
                        </h3>
                        <dl>
                          {[
                            ...Object.keys(labels),
                            "evidencia",
                            "evidenciaDocumentado",
                            "guardia",
                            "nota",
                          ].map((k) => (
                            <div key={k}>
                              <dt>
                                {labels[k] ??
                                  (
                                    {
                                      evidencia: "Evidencia salarial",
                                      evidenciaDocumentado:
                                        "Evidencia de Neto documentado",
                                      guardia: "Guardia",
                                      nota: "Nota",
                                    } as any
                                  )[k]}
                              </dt>
                              <dd>
                                {before?.[k] ?? "Sin informar"} →{" "}
                                {p[k] ?? "Sin informar"}
                              </dd>
                            </div>
                          ))}
                          <dt>Cobrado asignado</dt>
                          <dd>
                            {amount(before?.cobrado ?? null)} →{" "}
                            {amount(p.cobrado)}
                          </dd>
                          <dt>Diferencia</dt>
                          <dd>
                            {amount(before?.diferencia ?? null)} →{" "}
                            {amount(p.diferencia)}
                          </dd>
                        </dl>
                        <p>
                          {p.numeroIngresos === 0
                            ? "Sin cobros asociados. "
                            : ""}
                          {p.motivo}
                        </p>
                        {p.asignaciones.map((a: any) => (
                          <p key={a.movimiento}>
                            Movimiento #{a.movimiento} · {a.fecha} ·{" "}
                            {amount(a.importe)} · {a.evidencia} ·{" "}
                            {a.valida ? "Verificable" : "Requiere revisión"}
                          </p>
                        ))}
                      </article>
                    );
                  })}
                </div>
              </details>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void confirm()}
              >
                Confirmar revisión de Nómina
              </button>
            </section>
          )}
          <details className="panel">
            <summary>Auditoría de Nómina</summary>
            {data.auditoria.map((a: any) => (
              <p key={a.id}>
                #{a.id} · {a.instante} · {a.actor} · {a.motivo}
              </p>
            ))}
          </details>
        </>
      )}
    </>
  );
}
