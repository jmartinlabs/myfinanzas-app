import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { Alert, PageHead } from "./ui";
import type {
  MonthlyFlowDTO as MonthlyFlow,
  FlowMetric as Metric,
} from "./api";
function euro(v: string) {
  const [whole, cents] = v.split(".");
  return (
    whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".").replace("-", "−") +
    "," +
    (cents ?? "00") +
    " €"
  );
}
function Indicator({
  name,
  value,
  sourceLink,
}: {
  name: string;
  value: Metric;
  sourceLink?: React.ReactNode;
}) {
  const icon =
    value.estado === "Parcial"
      ? "!"
      : value.estado === "No disponible"
        ? "—"
        : "✓";
  return (
    <article className="flow-indicator" aria-label={name}>
      <div className="flow-indicator-head">
        <h3>{name}</h3>
        <span className="tag">
          {icon} {value.estado}
        </span>
      </div>
      <p className="flow-amount">
        {value.valor === null ? "No disponible" : euro(value.valor)}
      </p>
      {value.subtotal !== null && (
        <p>
          <strong>Subtotal conocido · Parcial: {euro(value.subtotal)}</strong>
        </p>
      )}
      <p>{value.motivo}</p>
      <p className="muted">
        {value.fuente}
        {value.cobertura !==
          "Definición acotada; no flujo global ni historia precontrol" && (
          <> · {value.cobertura}</>
        )}
      </p>
      {value.ids.length > 0 && (
        <details>
          <summary>Ver IDs de fuente ({value.ids.length})</summary>
          <p className="flow-ids">{value.ids.join(", ")}</p>
        </details>
      )}
      {sourceLink}
    </article>
  );
}
export function FlujoMensual({
  path,
  go,
}: {
  path: string;
  go: (path: string) => void;
}) {
  const selected = new URLSearchParams(path.split("?")[1]).get("ciclo") ?? "";
  const [cycles, setCycles] = useState<MonthlyFlow["ciclos"]>([]),
    [data, setData] = useState<MonthlyFlow | null>(null),
    [error, setError] = useState(""),
    [catalogError, setCatalogError] = useState(""),
    [retry, setRetry] = useState(0),
    [loading, setLoading] = useState(true);
  const generation = useRef(0),
    title = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    api("/ciclos?estado=&page=1")
      .then(async (first) => {
        let all = first.ciclos;
        for (let page = 2; all.length < first.total; page++) {
          const next = await api(`/ciclos?estado=&page=${page}`);
          if (
            next.total !== first.total ||
            next.contexto.revision !== first.contexto.revision ||
            next.contexto.referencia.fecha !== first.contexto.referencia.fecha
          )
            throw new Error(
              "El contexto de Ciclos cambió durante la paginación. Reintenta.",
            );
          all = [...all, ...next.ciclos];
          if (!next.ciclos.length)
            throw new Error("El catálogo cambió. Reintenta la consulta.");
        }
        if (live) {
          setCycles(all);
          setCatalogError("");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (live) {
          setCatalogError(e.message);
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [retry]);
  useEffect(() => {
    const version = ++generation.current;
    setData(null);
    setError("");
    if (!selected) return;
    setLoading(true);
    api<MonthlyFlow>(`/flujo-mensual/${encodeURIComponent(selected)}`)
      .then((d) => {
        if (generation.current === version) {
          setData(d);
          setCycles(d.ciclos);
          setLoading(false);
          requestAnimationFrame(() => title.current?.focus());
        }
      })
      .catch((e) => {
        if (generation.current === version) {
          setError(e.message);
          setLoading(false);
          requestAnimationFrame(() => alert.current?.focus());
        }
      });
    return () => {
      generation.current++;
    };
  }, [selected, retry]);
  const link = (url: string, text: string) => (
    <a
      href={url}
      onClick={(e) => {
        e.preventDefault();
        go(url);
      }}
    >
      {text}
    </a>
  );
  const bankLink = link(
    `/movimientos?ciclo=${selected}`,
    "Consultar hechos bancarios",
  );
  const draw = (key: string, name: string, sourceLink?: React.ReactNode) =>
    data && (
      <Indicator
        key={key}
        name={name}
        value={data.metrics[key]}
        sourceLink={sourceLink}
      />
    );
  return (
    <>
      <PageHead
        eyebrow="E2.6 · CONSULTA"
        title="Flujo mensual base"
        description="Fuentes y cobertura por indicador. No es un cierre financiero."
      />
      <section
        className="panel flow-selection"
        aria-label="Selección del ciclo"
      >
        <div className="flow-cycle-control">
          <label htmlFor="flow-cycle">Ciclo financiado</label>
          <select
            id="flow-cycle"
            value={selected}
            onChange={(e) =>
              go(
                "/flujo-mensual" +
                  (e.target.value
                    ? "?ciclo=" + encodeURIComponent(e.target.value)
                    : ""),
              )
            }
          >
            <option value="">Selecciona un Ciclo</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} · {c.mesFinanciado} · Inicio {c.inicio}
              </option>
            ))}
          </select>
        </div>
        <button className="secondary" onClick={() => setRetry((r) => r + 1)}>
          Actualizar fuentes
        </button>
      </section>
      {catalogError && (
        <Alert retry={() => setRetry((r) => r + 1)}>{catalogError}</Alert>
      )}
      {error && (
        <div
          ref={alert}
          tabIndex={-1}
          role="group"
          aria-label="Error de consulta"
        >
          <Alert retry={() => setRetry((r) => r + 1)}>
            {error} La selección del Ciclo se conserva.
          </Alert>
        </div>
      )}
      {loading && <p role="status">Cargando fuentes…</p>}
      {!loading && !selected && (
        <p role="status">
          {cycles.length
            ? "Selecciona un Ciclo para consultar su cobertura."
            : "Sin ciclos. No hay un periodo seleccionado ni ejecución cero."}
        </p>
      )}
      {data && data.ciclo.id === selected && (
        <>
          <section className="panel">
            <h2 ref={title} tabIndex={-1}>
              Ciclo {data.ciclo.id} · {data.ciclo.mesFinanciado}
            </h2>
            <p>
              Inicio {data.ciclo.inicio} · Fin temporal{" "}
              {data.ciclo.fin ?? "Abierto"} · Corte efectivo{" "}
              {data.corteEfectivo ?? "No disponible"}
            </p>
            <p>
              Fuente: Ciclos / referencia central. Fin temporal no equivale a
              cierre financiero.
            </p>
            <p className="notice">
              <strong>! Cobertura parcial del modelo</strong> · {data.alcance}
            </p>
            <p>{data.coberturaBancaria.motivo}</p>
            {!!data.erroresFuente.length && (
              <Alert retry={() => setRetry((r) => r + 1)}>
                Fuentes con error: {data.erroresFuente.join(", ")}. Las demás
                fuentes conservan su contexto.
              </Alert>
            )}
            <a href="#flow-coverage">Ver fuentes y pendientes</a>
          </section>
          <section className="panel" aria-labelledby="flow-bank">
            <h2 id="flow-bank">Ejecución bancaria del ciclo</h2>
            <div className="flow-grid">
              {draw("nomina", "Nómina cobrada", bankLink)}
              {draw("bonus", "Bonus cobrado")}
              {draw(
                "otros",
                "Otros ingresos",
                <p>
                  Desglose registrado: Intereses{" "}
                  {data.metrics.interesesIngreso.subtotal === null
                    ? "No disponible"
                    : euro(data.metrics.interesesIngreso.subtotal)}{" "}
                  · Resto{" "}
                  {data.metrics.restoOtros.subtotal === null
                    ? "No disponible"
                    : euro(data.metrics.restoOtros.subtotal)}
                  . Ambos incluidos en Otros.
                </p>,
              )}
              {draw("ingresos", "Total ingresos")}
              {draw("gasto", "Gasto bruto registrado", bankLink)}
              {draw("extraordinaria", "Amortización extraordinaria")}
              {draw("operativo", "Saldo operativo bruto observado")}
            </div>
          </section>
          <section className="panel" aria-labelledby="flow-debt">
            <h2 id="flow-debt">Deuda · desglose informativo</h2>
            <p>
              No se resta este total otra vez del gasto ni del saldo operativo.
            </p>
            <div className="flow-grid">
              {draw("cuotas", "Cuotas ordinarias pagadas")}
              {draw(
                "deudas",
                "Total pagado deudas",
                link("/deudas", "Consultar Deudas"),
              )}
              {draw("capital", "Capital amortizado")}
              {draw("interesesDeuda", "Intereses de deuda")}
            </div>
          </section>
          <section className="panel" aria-labelledby="flow-plan">
            <h2 id="flow-plan">Plan y referencias</h2>
            {data.plan.sinPlan && (
              <p className="notice">Sin plan. No se supone un objetivo cero.</p>
            )}
            {!!data.plan.sinPlanificar.length && (
              <p>
                Sin planificar según E2.3: {data.plan.sinPlanificar.join(", ")}.
                No se crean líneas automáticamente.
              </p>
            )}
            <div className="flow-grid">
              {draw(
                "delMes",
                "Del mes del plan",
                link(`/planes-ciclo?ciclo=${selected}`, "Consultar plan"),
              )}
              {draw("margenReal", "Margen frente a nómina real")}
              {draw("base", "Base del plan")}
              {draw(
                "media",
                "Media estructural de 12 meses",
                link("/nomina", "Consultar referencias salariales"),
              )}
              {draw("margenEstructural", "Margen estructural")}
            </div>
            <p>
              Ancla {data.mensual.ancla ?? "No disponible"} · Ventana{" "}
              {data.mensual.inicio ?? "No disponible"} a{" "}
              {data.mensual.fin ?? "No disponible"} · {data.mensual.n}/12 meses
              válidos
            </p>
            <details>
              <summary>
                Ver meses incluidos, ausentes/incompletos y fuentes
              </summary>
              {data.mensual.meses.map((m) => (
                <article key={m.mes} className="flow-month">
                  <h3>
                    {m.mes} ·{" "}
                    {m.valido ? "✓ Verificado" : "! Incompleto / ausente"}
                  </h3>
                  <p>
                    {m.motivo} ·{" "}
                    {m.subtotalConocido === null
                      ? "No disponible"
                      : euro(m.subtotalConocido)}
                  </p>
                  {m.pagas.map((p) => (
                    <p key={p.id}>
                      {p.id} · revisión {p.revision} · {p.motivo} · Fuente{" "}
                      {p.fuente ?? "No disponible"}
                    </p>
                  ))}
                </article>
              ))}
              {!data.mensual.meses.length && (
                <p>Sin ventana documental válida.</p>
              )}
            </details>
            {!!data.mensual.avisos.length && (
              <details>
                <summary>
                  Revisiones salariales pendientes ({data.mensual.avisos.length}
                  )
                </summary>
                {data.mensual.avisos.map((p) => (
                  <p key={p.id}>
                    {p.id} · {p.mes} · {p.motivo}
                  </p>
                ))}
              </details>
            )}
            <p>
              Pronóstico informativo en Nómina: no añade cobros. La media usa
              meses válidos, no el COUNTIFS físico de filas.
            </p>
          </section>
          <section className="panel" aria-labelledby="flow-current">
            <h2 id="flow-current">
              Contexto actual · independiente del ciclo seleccionado
            </h2>
            {draw(
              "liquidez",
              "Liquidez actual",
              link("/saldos", "Consultar Saldos"),
            )}
            <p>
              Consulta: {data.consulta}. {data.liquidez.fuente}. No es la
              liquidez al cierre del Ciclo.
            </p>
            {!!data.liquidez.excluidos.length && (
              <details>
                <summary>
                  Ver posiciones excluidas / pertenencias sin informar
                </summary>
                {data.liquidez.excluidos.map((s) => (
                  <p key={s.id}>
                    {link(`/saldos/${s.id}`, s.id)} · {s.motivo}
                  </p>
                ))}
              </details>
            )}
            {draw("liquidezHistorica", "Liquidez al corte del ciclo")}
          </section>
          <section className="panel" id="flow-coverage">
            <h2>Cobertura del modelo</h2>
            <div className="flow-grid">
              {draw("variacionAhorro", "Variación de ahorro")}
              {draw("ahorroCierre", "Ahorro cierre histórico")}
              {draw("ahorroResidual", "Ejecución del Presupuesto de Ahorro")}
            </div>
            <h3>Pendientes · No disponible</h3>
            <ul>
              {data.pendientes.map((p) => (
                <li key={p}>— {p}: No disponible</li>
              ))}
            </ul>
            <details>
              <summary>
                Procedencia Excel y diferencias de la aplicación
              </summary>
              <p>{data.procedencia}</p>
            </details>
            <p>
              No hay objetivos, meses cubiertos, umbrales R6 ni porcentaje
              global de cobertura.
            </p>
          </section>
        </>
      )}
    </>
  );
}
