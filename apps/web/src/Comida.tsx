import { useEffect, useRef, useState } from "react";
import { api, eur, ApiError } from "./api";
import { Alert, PageHead, Tag } from "./ui";

type Cycle = {
  id: string;
  inicio: string;
  fin: string | null;
  mesFinanciado: string;
  corte: string | null;
  estadoTemporal: "Abierto" | "Con fin temporal";
};
type Metric = {
  valor: string | null;
  subtotal: string | null;
  estado: string;
  motivo: string;
  ids: string[];
};
type Regimen = {
  saldo: string;
  cicloCorte: string;
  apertura: string;
  evidencia: string;
  cobertura: "Verificable" | "Parcial";
  estado: "Preparado" | "Activo" | "Suspendido";
  revision: number;
  corte?: string | null;
  saldoNombre?: string | null;
};
type RegimenDto = { modo: "Histórico" | "Individual"; regimen: Regimen | null };
type Item = {
  id: string;
  fecha: string;
  tipo: string;
  importe: string;
  direccion: "Salida" | "Entrada";
  concepto: string;
  estado: string;
  anulado: boolean;
  revision: number;
  partida: string | null;
  etiqueta: string | null;
  estadoRevision: string;
  etiquetaSinClasificar: boolean;
  evidenciaBancaria: string | null;
  evidenciaComercial: string | null;
  agregadoTerminal: boolean;
  devolucion: null | {
    compra: string | null;
    partida: string | null;
    cicloOrigen: string | null;
    evidenciaRelacion: string | null;
    evidenciaOrigenTemporal: string | null;
    elegibilidad: "Acreditada" | "No acreditada";
    estado: "Sin vínculo" | "Verificado" | "Revisar";
  };
};
type ListDto = {
  items: Item[];
  total: number;
  historico: { id: string; fecha: string; tipo: string; importe: string }[];
  historicoTotal: number;
  regimen: RegimenDto;
};
type Metrics = {
  ciclo: Cycle;
  regimen: RegimenDto;
  periodo: { inicio: string; corte: string };
  cobertura: { estado: string; motivos: string[]; sinClasificar: string[]; devolucionesPendientes: string[] };
  compras: { bruto: Metric; devoluciones: Metric; neto: Metric };
  compensable: { bruto: Metric; devoluciones: Metric; neto: Metric };
  reposiciones: { obligacion: string | null; ids: string[] };
  faltaPorReponer: Metric;
  financiacion: { estado: string; f: string | null; reposicionesCaja: string | null; d: string | null; motivo?: string };
  recursos: Metric;
  cierreAnalitico: Metric;
  posicionBancaria:
    | { apertura: string; alInicio: string; alCorte: string | null; diferenciaAnaliticoBanco: string | null }
    | { estado: string; motivo: string };
  puente: { baseAnalitica: string; otrosEfectos: string; cierreAnalitico: string } | null;
  ritmo: {
    semanalObservado: Metric;
    equivalentes: Metric;
    margen: Metric;
    duracion: { total: number; tipo: string; horizon: string; elapsed: number; estado: string };
  };
  historico: { agregadoReconocido: string; detalleAuxiliar: string; nota: string };
};
type Options = {
  etiquetas: string[];
  roles: string[];
  partidas: { id: string; nombre: string }[];
  ciclos: Cycle[];
  regimen: RegimenDto;
  saldos: { id: string; nombre: string; control: string; estado: string }[];
};
const date = (v: string) => v.split("-").reverse().join("/");
const amount = (v: string | null) => (v === null ? "No disponible" : eur(v));
const errorFields = (e: unknown) =>
  e instanceof ApiError ? (e.fields ?? {}) : {};

function MetricRow({ label, metric, hint }: { label: string; metric: Metric; hint?: string }) {
  return (
    <div className="metric">
      <dt>{label}</dt>
      <dd>
        {metric.valor === null ? (
          <span className="unknown">{metric.estado}</span>
        ) : (
          <>
            <strong>{eur(metric.valor)}</strong>{" "}
            <Tag inactive={metric.estado === "Parcial"}>{metric.estado}</Tag>
          </>
        )}
        {metric.subtotal !== null && (
          <small>Subtotal conocido: {eur(metric.subtotal)}</small>
        )}
        {metric.motivo && <small>{metric.motivo}</small>}
        {hint && <small>{hint}</small>}
      </dd>
    </div>
  );
}

export function Comida({ go }: { go: (p: string) => void }) {
  const [options, setOptions] = useState<Options | null>(null),
    [regimen, setRegimen] = useState<RegimenDto | null>(null),
    [cycleId, setCycleId] = useState(""),
    [list, setList] = useState<ListDto | null>(null),
    [metrics, setMetrics] = useState<Metrics | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [reload, setReload] = useState(0),
    [selected, setSelected] = useState<Item | null>(null),
    [action, setAction] = useState<"metadata" | "devolucion" | "rol" | "regimen" | null>(null);
  const alert = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setError("");
    Promise.all([
      api<Options>("/comida/opciones"),
      api<ListDto>("/comida?estado="),
      api<RegimenDto>("/comida/regimen"),
    ])
      .then(([o, l, r]) => {
        if (!live) return;
        setOptions(o);
        setList(l);
        setRegimen(r);
        if (!cycleId)
          setCycleId(
            o.ciclos.at(-1)?.id && l.regimen.regimen
              ? l.regimen.regimen.cicloCorte
              : (o.ciclos.at(-1)?.id ?? ""),
          );
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [reload]);

  useEffect(() => {
    let live = true;
    setMetrics(null);
    if (!cycleId) return;
    api<Metrics>("/comida/metricas/" + cycleId)
      .then((m) => live && setMetrics(m))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [cycleId, reload]);

  const cycles = options?.ciclos ?? [];
  const cycle = cycles.find((c) => c.id === cycleId) ?? null;

  async function call(
    path: string,
    body: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      await api(path, "POST", body, { "idempotency-key": crypto.randomUUID() });
      setNotice("Operación registrada y auditada.");
      setSelected(null);
      setAction(null);
      setReload((n) => n + 1);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar.");
      requestAnimationFrame(() => alert.current?.focus());
      return false;
    }
  }

  return (
    <>
      <PageHead
        eyebrow="COMIDA · UN ÚNICO HECHO"
        title="Revisión Comida"
        description="Cada compra y devolución nuevas son un Movimiento. Aquí solo se guardan metadatos, atribución y métricas; el histórico agregado y auxiliar se conserva aparte."
      >
        <select
          aria-label="Ciclo"
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
        >
          <option value="">Selecciona un ciclo</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {date(c.inicio)} → {c.fin ? date(c.fin) : "abierto"} ·{" "}
              {c.mesFinanciado.slice(0, 7)}
            </option>
          ))}
        </select>
      </PageHead>
      {error && (
        <div tabIndex={-1} ref={alert}>
          <Alert retry={() => setReload((n) => n + 1)}>{error}</Alert>
        </div>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {!options ? (
        <p role="status">Cargando Revisión Comida…</p>
      ) : (
        <>
          <section className="panel" aria-label="Régimen de ING Comida">
            <h2>Régimen de Comida</h2>
            <p>
              {regimen?.modo === "Individual"
                ? `Individual · ${regimen.regimen?.saldoNombre ?? regimen.regimen?.saldo} · corte ${date(regimen.regimen!.corte ?? "")} · apertura ${eur(regimen.regimen!.apertura)}`
                : "Histórico. El régimen individual no está activo; la apertura real (P3) sigue pendiente."}
            </p>
            {regimen?.regimen && (
              <p className="muted">
                Estado {regimen.regimen.estado} · Cobertura{" "}
                {regimen.regimen.cobertura} · Evidencia:{" "}
                {regimen.regimen.evidencia}
              </p>
            )}
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setAction(action === "regimen" ? null : "regimen")}
              >
                {regimen?.regimen ? "Revisar régimen" : "Preparar régimen ficticio"}
              </button>
              {regimen?.regimen?.estado === "Preparado" && (
                <button
                  type="button"
                  onClick={() =>
                    call("/comida/regimen/activar", {
                      revision: regimen.regimen!.revision,
                      motivo: "Activación revisada en entorno local",
                      confirmar: true,
                    })
                  }
                >
                  Activar régimen preparado
                </button>
              )}
            </div>
          </section>

          {action === "regimen" && (
            <RegimenForm
              options={options}
              onCancel={() => setAction(null)}
              onSubmit={(body) => call("/comida/regimen/preparar", body)}
            />
          )}

          {metrics ? (
            <section className="panel" aria-label="Métricas del ciclo">
              <h2>
                Ciclo {date(metrics.periodo.inicio)} → {date(metrics.periodo.corte)}
              </h2>
              <p>
                Cobertura: <strong>{metrics.cobertura.estado}</strong> ·{" "}
                {metrics.regimen.modo}
              </p>
              {metrics.cobertura.motivos.length > 0 && (
                <ul className="muted">
                  {metrics.cobertura.motivos.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
              <dl className="metrics">
                <MetricRow label="Comida bruto" metric={metrics.compras.bruto} />
                <MetricRow
                  label="Devoluciones de comida"
                  metric={metrics.compras.devoluciones}
                />
                <MetricRow label="Comida neto" metric={metrics.compras.neto} />
                <MetricRow
                  label="Compensable bruto"
                  metric={metrics.compensable.bruto}
                />
                <MetricRow
                  label="Devoluciones compensables"
                  metric={metrics.compensable.devoluciones}
                />
                <MetricRow
                  label="Compensable neto"
                  metric={metrics.compensable.neto}
                />
                <MetricRow
                  label="Falta por reponer · obligación económica"
                  metric={metrics.faltaPorReponer}
                  hint="No es dinero para restaurar ING ni conciliación bancaria."
                />
                <MetricRow label="Recursos analíticos" metric={metrics.recursos} />
                <MetricRow
                  label="Cierre analítico"
                  metric={metrics.cierreAnalitico}
                />
                <MetricRow
                  label="Ritmo semanal observado"
                  metric={metrics.ritmo.semanalObservado}
                />
                <MetricRow
                  label={`Equivalentes (${metrics.ritmo.duracion.estado})`}
                  metric={metrics.ritmo.equivalentes}
                />
                <MetricRow label="Margen" metric={metrics.ritmo.margen} />
              </dl>
              <p className="muted">
                Duración {metrics.ritmo.duracion.estado}:{" "}
                {metrics.ritmo.duracion.elapsed}/{metrics.ritmo.duracion.total}{" "}
                días · horizonte {date(metrics.ritmo.duracion.horizon)}. Fin
                abierto siempre vacío.
              </p>
              {"motivo" in metrics.posicionBancaria ? (
                <p className="muted">
                  Posición bancaria: {metrics.posicionBancaria.estado} ·{" "}
                  {metrics.posicionBancaria.motivo}
                </p>
              ) : (
                <p>
                  Apertura {eur(metrics.posicionBancaria.apertura)} · al inicio{" "}
                  {eur(metrics.posicionBancaria.alInicio)} · al corte{" "}
                  {amount(metrics.posicionBancaria.alCorte)} · diferencia
                  analítico/banco{" "}
                  {amount(metrics.posicionBancaria.diferenciaAnaliticoBanco)}
                </p>
              )}
              {metrics.puente && (
                <p className="muted">
                  Puente: base {eur(metrics.puente.baseAnalitica)} + otros
                  efectos {eur(metrics.puente.otrosEfectos)} = cierre{" "}
                  {eur(metrics.puente.cierreAnalitico)}.
                </p>
              )}
              <p className="muted">
                Financiación: {metrics.financiacion.estado} · F{" "}
                {amount(metrics.financiacion.f)} · reposiciones de caja{" "}
                {amount(metrics.financiacion.reposicionesCaja)} · D{" "}
                {amount(metrics.financiacion.d)}.
              </p>
            </section>
          ) : cycleId ? (
            <p role="status">Calculando métricas del ciclo…</p>
          ) : null}

          <section className="panel" aria-label="Operaciones individuales">
            <h2>Operaciones individuales</h2>
            <p className="muted">
              Compras y devoluciones reales. Sin vínculo es un estado normal;
              una devolución nunca se deduce de una simple Entrada.
            </p>
            {list && list.items.length === 0 ? (
              <p>Sin operaciones individuales registradas.</p>
            ) : (
              <table className="table">
                <caption className="muted">
                  {list?.total ?? 0} operaciones individuales
                </caption>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Operación</th>
                    <th>Importe</th>
                    <th>Partida</th>
                    <th>Etiqueta</th>
                    <th>Devolución</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(list?.items ?? []).map((i) => (
                    <tr key={i.id}>
                      <td>{i.id}</td>
                      <td>{date(i.fecha)}</td>
                      <td>
                        {i.concepto || i.tipo}
                        <small className="table-id">
                          {i.tipo}
                          {i.agregadoTerminal ? " · agregado terminal" : ""}
                          {i.anulado ? " · anulado" : ""}
                        </small>
                      </td>
                      <td>
                        {eur(i.importe)} · {i.direccion}
                      </td>
                      <td>{i.partida ?? "Sin Partida"}</td>
                      <td>
                        {i.etiqueta ?? "Sin clasificar"}
                        <small className="table-id">{i.estadoRevision}</small>
                      </td>
                      <td>
                        {i.tipo === "Devolución de gasto"
                          ? i.devolucion
                            ? `${i.devolucion.estado}${i.devolucion.elegibilidad === "Acreditada" ? " · acreditada" : ""}`
                            : "Sin atribución"
                          : "—"}
                      </td>
                      <td>
                        {!i.anulado && !i.agregadoTerminal && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => {
                              setSelected(i);
                              setAction(
                                i.tipo === "Devolución de gasto"
                                  ? "devolucion"
                                  : "metadata",
                              );
                            }}
                          >
                            {i.tipo === "Devolución de gasto"
                              ? "Atribuir"
                              : "Clasificar"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="actions">
              <button type="button" onClick={() => go("/movimientos/nuevo?tipo=Gasto")}>
                Registrar compra en Movimientos
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  go("/movimientos/nuevo?tipo=Devolución%20de%20gasto")
                }
              >
                Registrar devolución
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setAction("rol")}
              >
                Asignar rol a una Transferencia
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => go("/revision-comida")}
              >
                Ver histórico auxiliar legado
              </button>
            </div>
          </section>

          {selected && action === "metadata" && (
            <MetadataForm
              item={selected}
              onCancel={() => setSelected(null)}
              onSubmit={(body) =>
                call(`/comida/${selected.id}/metadata`, {
                  revision: selected.revision,
                  ...body,
                })
              }
            />
          )}
          {selected && action === "devolucion" && (
            <AtribucionForm
              item={selected}
              options={options}
              cycles={cycles}
              onCancel={() => setSelected(null)}
              onSubmit={(body) =>
                call(`/comida/${selected.id}/devolucion`, {
                  revision: selected.revision,
                  ...body,
                })
              }
            />
          )}
          {action === "rol" && (
            <RolForm
              options={options}
              cycles={cycles}
              onCancel={() => setAction(null)}
              onSubmit={(id, body) => call(`/comida/${id}/rol`, body)}
            />
          )}

          <section className="panel" aria-label="Histórico">
            <h2>Histórico conservado</h2>
            <p className="muted">
              {list?.historicoTotal ?? 0} registros auxiliares legados y los
              agregados de Terminal se conservan consultables. No se convierten
              en compras individuales ni se suman a los hechos centrales.
            </p>
            {metrics && (
              <p className="muted">
                Agregado reconocido del ciclo:{" "}
                {eur(metrics.historico.agregadoReconocido)} · detalle auxiliar
                firmado: {eur(metrics.historico.detalleAuxiliar)}.{" "}
                {metrics.historico.nota}
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}

function RegimenForm({
  options,
  onCancel,
  onSubmit,
}: {
  options: Options;
  onCancel: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [saldo, setSaldo] = useState(""),
    [ciclo, setCiclo] = useState(options.ciclos.at(-1)?.id ?? ""),
    [apertura, setApertura] = useState(""),
    [evidencia, setEvidencia] = useState(""),
    [cobertura, setCobertura] = useState(""),
    [motivo, setMotivo] = useState("");
  return (
    <section className="panel" aria-label="Preparar régimen">
      <h2>Preparar régimen (datos ficticios)</h2>
      <p className="muted">
        No activa datos reales. La apertura B y el corte C deben acreditarse; un
        agregado que atraviese el corte o una Transferencia sin función bloquean
        la activación.
      </p>
      <form
        className="saldo-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ saldo, cicloCorte: ciclo, apertura, evidencia, cobertura, motivo });
        }}
      >
        <div className="form-grid">
          <label>
            Saldo ING Comida
            <select value={saldo} onChange={(e) => setSaldo(e.target.value)}>
              <option value="">Selecciona un Saldo</option>
              {options.saldos
                .filter((s) => s.control === "Movimientos" && s.estado === "Activa")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.nombre}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Ciclo del corte
            <select value={ciclo} onChange={(e) => setCiclo(e.target.value)}>
              {options.ciclos.map((c) => (
                <option key={c.id} value={c.id}>
                  {date(c.inicio)} · {c.mesFinanciado.slice(0, 7)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Apertura acreditada B
            <input
              inputMode="decimal"
              value={apertura}
              onChange={(e) => setApertura(e.target.value)}
            />
          </label>
          <label>
            Cobertura
            <select value={cobertura} onChange={(e) => setCobertura(e.target.value)}>
              <option value="">Selecciona cobertura</option>
              <option value="Verificable">Verificable</option>
              <option value="Parcial">Parcial</option>
            </select>
          </label>
          <label>
            Evidencia de apertura
            <input value={evidencia} onChange={(e) => setEvidencia(e.target.value)} />
          </label>
          <label>
            Motivo
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </label>
        </div>
        <div className="actions">
          <button
            type="submit"
            disabled={!saldo || !apertura || !evidencia || !motivo || !cobertura}
          >
            Preparar
          </button>
          <button type="button" className="secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

function MetadataForm({
  item,
  onCancel,
  onSubmit,
}: {
  item: Item;
  onCancel: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [etiqueta, setEtiqueta] = useState(item.etiqueta ?? ""),
    [evidenciaBancaria, setEvidenciaBancaria] = useState(item.evidenciaBancaria ?? ""),
    [evidenciaComercial, setEvidenciaComercial] = useState(item.evidenciaComercial ?? ""),
    [motivo, setMotivo] = useState("");
  return (
    <section className="panel" aria-label="Clasificación de Comida">
      <h2>Clasificar Movimiento {item.id}</h2>
      <p className="muted">
        La Partida del Gasto no cambia aquí. La etiqueta es análisis auxiliar y
        nunca suprime el efecto bancario.
      </p>
      <form
        className="saldo-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            etiqueta: etiqueta || null,
            evidenciaBancaria: evidenciaBancaria || null,
            evidenciaComercial: evidenciaComercial || null,
            motivo,
          });
        }}
      >
        <div className="form-grid">
          <label>
            Etiqueta
            <select value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
              <option value="">Sin clasificar (Pendiente revisar)</option>
              {["Comida", "Pendiente revisar", "Ocio", "Niños", "Otros", "Fuera presupuesto"].map(
                (l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            Evidencia bancaria
            <input
              value={evidenciaBancaria}
              onChange={(e) => setEvidenciaBancaria(e.target.value)}
            />
          </label>
          <label>
            Evidencia comercial
            <input
              value={evidenciaComercial}
              onChange={(e) => setEvidenciaComercial(e.target.value)}
            />
          </label>
          <label>
            Motivo (si ya existía)
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </label>
        </div>
        <div className="actions">
          <button type="submit">Guardar metadatos</button>
          <button type="button" className="secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

function AtribucionForm({
  item,
  options,
  cycles,
  onCancel,
  onSubmit,
}: {
  item: Item;
  options: Options;
  cycles: Cycle[];
  onCancel: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const d = item.devolucion;
  const [compra, setCompra] = useState(d?.compra ?? ""),
    [partida, setPartida] = useState(d?.partida ?? item.partida ?? ""),
    [cicloOrigen, setCicloOrigen] = useState(d?.cicloOrigen ?? ""),
    [evidenciaRelacion, setEvidenciaRelacion] = useState(d?.evidenciaRelacion ?? ""),
    [evidenciaOrigenTemporal, setEvidenciaOrigenTemporal] = useState(
      d?.evidenciaOrigenTemporal ?? "",
    ),
    [elegibilidad, setElegibilidad] = useState<string>(
      d?.elegibilidad ?? "No acreditada",
    ),
    [estado, setEstado] = useState<string>(d?.estado ?? "Sin vínculo"),
    [motivo, setMotivo] = useState("");
  return (
    <section className="panel" aria-label="Atribución de devolución">
      <h2>Atribuir devolución {item.id}</h2>
      <p className="muted">
        Compra y Partida son opcionales. El vínculo es íntegro: si la suma de
        devoluciones verificadas supera la compra, guarda «Revisar». El importe
        y la fecha solo viven en el Movimiento.
      </p>
      <form
        className="saldo-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            compra: compra || null,
            partida: partida || null,
            cicloOrigen: cicloOrigen || null,
            evidenciaRelacion: evidenciaRelacion || null,
            evidenciaOrigenTemporal: evidenciaOrigenTemporal || null,
            elegibilidad,
            estado,
            motivo,
          });
        }}
      >
        <div className="form-grid">
          <label>
            Compra (ID de Movimiento)
            <input value={compra} onChange={(e) => setCompra(e.target.value)} />
          </label>
          <label>
            Partida acreditada
            <select value={partida} onChange={(e) => setPartida(e.target.value)}>
              <option value="">Sin Partida</option>
              {options.partidas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} · {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ciclo de compra (origen)
            <select value={cicloOrigen} onChange={(e) => setCicloOrigen(e.target.value)}>
              <option value="">Sin ciclo acreditado</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {date(c.inicio)} · {c.mesFinanciado.slice(0, 7)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado del vínculo
            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
              {["Sin vínculo", "Verificado", "Revisar"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Elegibilidad
            <select value={elegibilidad} onChange={(e) => setElegibilidad(e.target.value)}>
              <option value="No acreditada">No acreditada</option>
              <option value="Acreditada">Acreditada</option>
            </select>
          </label>
          <label>
            Evidencia de relación
            <input
              value={evidenciaRelacion}
              onChange={(e) => setEvidenciaRelacion(e.target.value)}
            />
          </label>
          <label>
            Evidencia de origen temporal
            <input
              value={evidenciaOrigenTemporal}
              onChange={(e) => setEvidenciaOrigenTemporal(e.target.value)}
            />
          </label>
          <label>
            Motivo (si ya existía)
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </label>
        </div>
        <div className="actions">
          <button type="submit">Guardar atribución</button>
          <button type="button" className="secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

function RolForm({
  options,
  cycles,
  onCancel,
  onSubmit,
}: {
  options: Options;
  cycles: Cycle[];
  onCancel: () => void;
  onSubmit: (id: string, body: Record<string, unknown>) => void;
}) {
  const [id, setId] = useState(""),
    [rol, setRol] = useState("Financiación"),
    [obligacionCiclo, setObligacion] = useState(""),
    [evidencia, setEvidencia] = useState(""),
    [revisionMovimiento, setRevision] = useState("1"),
    [motivo, setMotivo] = useState("");
  return (
    <section className="panel" aria-label="Rol de financiación">
      <h2>Asignar rol analítico a una Transferencia</h2>
      <p className="muted">
        Ningún rol se deduce por nombre ni importe. Las reposiciones asignadas no
        son devoluciones comerciales ni Gastos adicionales.
      </p>
      <form
        className="saldo-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(id, {
            revision: Number(revisionMovimiento),
            rol,
            obligacionCiclo: rol === "Reposición" ? obligacionCiclo : null,
            evidencia,
            motivo,
          });
        }}
      >
        <div className="form-grid">
          <label>
            ID de Transferencia
            <input value={id} onChange={(e) => setId(e.target.value)} />
          </label>
          <label>
            Revisión del Movimiento
            <input
              inputMode="numeric"
              value={revisionMovimiento}
              onChange={(e) => setRevision(e.target.value)}
            />
          </label>
          <label>
            Rol
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              {options.roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {rol === "Reposición" && (
            <label>
              Obligación (ciclo)
              <select
                value={obligacionCiclo}
                onChange={(e) => setObligacion(e.target.value)}
              >
                <option value="">Selecciona un ciclo</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {date(c.inicio)} · {c.mesFinanciado.slice(0, 7)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Evidencia
            <input value={evidencia} onChange={(e) => setEvidencia(e.target.value)} />
          </label>
          <label>
            Motivo (si ya existía)
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </label>
        </div>
        <div className="actions">
          <button type="submit" disabled={!id || !evidencia}>
            Guardar rol
          </button>
          <button type="button" className="secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
