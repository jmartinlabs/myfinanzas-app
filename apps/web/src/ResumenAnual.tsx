import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";
import { formatDecimal } from "./format";
import { Alert, Amount, Badge, EmptyState, Metric, PageHead, Skeleton } from "./ui";

/**
 * E4.7 — Resumen anual.
 *
 * Pantalla de solo lectura. Compone `GET /api/resumen-anual` sin calcular
 * economía en el navegador: solo formatea cadenas decimales exactas y fechas
 * ISO. `null` se presenta como No disponible y nunca como 0,00.
 *
 * No muestra un total anual, no suma carriles y no envía importes en la URL.
 */

type EstadoMetrica =
  | "Verificado"
  | "Cero verificado"
  | "Parcial"
  | "No disponible"
  | "No aplica"
  | "Sin datos";

type Cobertura = {
  estado: string;
  fuente: string;
  detalle: string;
  incluidos: number | null;
  excluidos: number | null;
  motivos: string[];
};

type Fuente = {
  motor: string;
  ids: string[];
  revision: string | null;
  intervalo?: { desde: string | null; hasta: string | null };
};

type ContextoMetrica =
  | { tipo: "ciclo"; cicloId: string; corte: string | null }
  | { tipo: "ejercicio"; ejercicio: number; corte: string | null }
  | { tipo: "corte"; fecha: string | null; fuente: string };

type Enlace = { etiqueta: string; ruta: string; ids: string[] };

type Metrica = {
  clave: string;
  etiqueta: string;
  clase: "plan" | "real" | "archivo" | "informativo" | "patrimonio";
  valor: string | null;
  subtotal: string | null;
  estado: EstadoMetrica;
  unidad: "EUR" | "meses" | "conteo";
  motivo: string;
  cobertura: Cobertura;
  fuente: Fuente;
  contexto: ContextoMetrica;
  alcance: "Ciclo" | "Ejercicio" | "HastaCorte" | "No aplica";
  enlace: Enlace | null;
};

type CicloRef = {
  cicloId: string;
  inicio: string;
  fin: string | null;
  corte: string | null;
  ejercicios: number[];
};

type CarrilPlanItem = {
  partidaId: string;
  presupuesto: string | null;
  esencial: "Sí" | "No" | "Pendiente" | null;
  ejecutado: Metrica;
  diferencia: Metrica | null;
  cobertura: Cobertura;
};

type CarrilPlan = {
  estado: EstadoMetrica;
  motivo: string;
  items: CarrilPlanItem[];
  cobertura: Cobertura;
  fuente: Fuente;
  enlace: Enlace;
};

type CarrilPrevision = {
  estado: EstadoMetrica;
  motivo: string;
  simulacion: Metrica | null;
  cobertura: Cobertura;
  enlace: Enlace;
};

type AjusteCompartidos = {
  gNeto: string | null;
  sAjustado: string | null;
  estado: EstadoMetrica;
  motivo: string;
  cobertura: Cobertura;
  fuente: Fuente;
};

type CicloRealidad = CicloRef & {
  ingresos: Metrica;
  gasto: Metrica;
  extraordinaria: Metrica;
  nomina: Metrica;
  operativo: Metrica;
  margenReal: Metrica;
  margenEstructural: Metrica;
  ajusteCompartidos: AjusteCompartidos;
};

type CarrilRealidad = {
  estado: EstadoMetrica;
  motivo: string;
  ciclos: CicloRealidad[];
  agregadoAnual: { estado: "No aplica"; motivo: string };
  cobertura: Cobertura;
  enlace: Enlace;
};

type ArchivoItem = {
  partidaId: string | null;
  archivo: string | null;
  detalleControl: string | null;
  detallePrecontrol: string | null;
  total: string | null;
  alcanceTotal: "Anual" | "HastaCorte";
  subtotalConocido: string | null;
  estadoCobertura: string;
  estadoTotal: string;
  cobertura: Cobertura;
  corte: string | null;
  fuentes: Fuente[];
  procedencia: string[];
  motivoCodigo: string;
  motivo: string;
  sinClasificar: { importe: string | null; motivo: string }[];
};

type CarrilArchivo = {
  estado: EstadoMetrica;
  motivo: string;
  gate: "BLOCKED";
  items: ArchivoItem[];
  cobertura: Cobertura;
  enlace: Enlace;
};

type MargenPublicado = {
  clave: "margenEstructural" | "margenReal";
  etiqueta: string;
  clase: "plan";
  valor: string | null;
  subtotal: string | null;
  estado: EstadoMetrica;
  motivo: string;
  cobertura: Cobertura;
  fuente: Fuente;
  cicloId: string;
  corte: string | null;
  alcance: "Ciclo";
};

type Margenes = {
  estado: "Parcial" | "No disponible";
  etiqueta: "Márgenes del plan";
  publicados: MargenPublicado[];
  noDefinidos: {
    clave: "margenMedio" | "margenRealPuntual";
    etiqueta: string;
    estado: "No disponible";
    motivo: "Definición pendiente DT8";
  }[];
  nota: string;
};

type Patrimonio = {
  incluido: true;
  corte: { fecha: string | null; estado: EstadoMetrica; motivo: string };
  valoracion: {
    valorEur: string | null;
    estado: EstadoMetrica;
    coberturaValoracion: string;
    resultadoEur: string | null;
    coberturaResultado: string;
    corte: string | null;
    fuente: Fuente;
    enlace: Enlace;
  };
  deuda: {
    total: string | null;
    subtotal: string | null;
    estado: EstadoMetrica;
    cobertura: Cobertura;
    corte: string | null;
    fuente: Fuente;
    enlace: Enlace;
  };
  nota: string;
};

type ResumenAnualDto = {
  contexto: {
    consulta: string;
    corte: {
      fecha: string | null;
      fuente: string;
      estado: "disponible" | "parcial" | "no_disponible";
    };
    calculo: "Vivo" | "Foto";
    fotoId: string | null;
    etiqueta: string;
    revision: string;
  };
  ejercicio: {
    natural: number;
    desde: string;
    hasta: string;
    ciclos: CicloRef[];
  };
  filtros: {
    ejercicio: number;
    ciclo: string | null;
    partida: string | null;
    cobertura: string | null;
  };
  cobertura: {
    estado: string;
    fuentes: Fuente[];
    motivos: string[];
    porCarril: Record<string, Cobertura>;
  };
  carriles: {
    plan: CarrilPlan;
    prevision: CarrilPrevision;
    realidad: CarrilRealidad;
    archivo: CarrilArchivo;
  };
  margenes: Margenes;
  patrimonio: Patrimonio | null;
  enlaces: Enlace[];
  pendientesDelModelo: string[];
};

type Filters = {
  ejercicio: string;
  ciclo: string;
  partida: string;
  cobertura: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; expired: boolean }
  | { status: "ready"; data: ResumenAnualDto };

const ESTADO_META: Record<
  EstadoMetrica,
  { icon: string; label: string; tone: "ok" | "partial" | "nd" }
> = {
  Verificado: { icon: "✓", label: "VERIFICADO", tone: "ok" },
  "Cero verificado": { icon: "✓", label: "CERO VERIFICADO", tone: "ok" },
  Parcial: { icon: "!", label: "PARCIAL", tone: "partial" },
  "No disponible": { icon: "—", label: "NO DISPONIBLE", tone: "nd" },
  "No aplica": { icon: "—", label: "NO APLICA", tone: "nd" },
  "Sin datos": { icon: "○", label: "SIN DATOS", tone: "nd" },
};

const COBERTURA_META: Record<
  string,
  { icon: string; label: string; tone: "ok" | "partial" | "nd" }
> = {
  Completa: { icon: "✓", label: "COMPLETA", tone: "ok" },
  Parcial: { icon: "!", label: "PARCIAL", tone: "partial" },
  NoAcreditada: { icon: "⊘", label: "NO ACREDITADA", tone: "nd" },
  NoDisponible: { icon: "—", label: "NO DISPONIBLE", tone: "nd" },
  Solapada: { icon: "⊘", label: "SOLAPADA", tone: "nd" },
};

function formatDate(value: string | null) {
  if (value === null) return "No disponible";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function contextText(contexto: ContextoMetrica) {
  if (contexto.tipo === "ciclo")
    return `ciclo ${contexto.cicloId}${
      contexto.corte ? ` · corte ${formatDate(contexto.corte)}` : ""
    }`;
  if (contexto.tipo === "ejercicio")
    return `ejercicio ${contexto.ejercicio}${
      contexto.corte ? ` · corte ${formatDate(contexto.corte)}` : ""
    }`;
  return `corte ${formatDate(contexto.fecha)}`;
}

function estadoCorteLabel(estado: "disponible" | "parcial" | "no_disponible") {
  if (estado === "disponible") return "Disponible";
  if (estado === "parcial") return "Parcial";
  return "No disponible";
}

function EstadoBadge({ estado }: { estado: EstadoMetrica }) {
  const meta = ESTADO_META[estado];
  return (
    <Badge
      tone={meta.tone}
      label={meta.label}
      icon={meta.icon}
      estado={estado}
      kind="estado"
    />
  );
}

function CoberturaBadge({ valor }: { valor: string }) {
  const meta = COBERTURA_META[valor] ?? {
    icon: "—",
    label: valor.toUpperCase(),
    tone: "nd" as const,
  };
  return (
    <Badge
      tone={meta.tone}
      label={meta.label}
      icon={meta.icon}
      estado={valor}
      kind="cobertura"
    />
  );
}

/** Adapta la métrica publicada al `Amount` compartido sin tocar su contrato. */
function MetricAmount({ metrica }: { metrica: Metrica }) {
  return (
    <Amount
      value={metrica.valor}
      subtotal={metrica.subtotal}
      state={metrica.estado}
      unit={metrica.unidad}
    />
  );
}

function FuenteLinea({ fuente, contexto }: { fuente: Fuente; contexto?: ContextoMetrica }) {
  return (
    <p className="e47-source">
      <span>
        Fuente: <strong>{fuente.motor}</strong>
      </span>
      {fuente.ids.length > 0 && (
        <span>IDs: {fuente.ids.join(", ")}</span>
      )}
      {fuente.revision !== null && (
        <span>Revisión: {fuente.revision.slice(0, 16)}…</span>
      )}
      {fuente.intervalo && (
        <span>
          Intervalo: {formatDate(fuente.intervalo.desde)}–
          {formatDate(fuente.intervalo.hasta)}
        </span>
      )}
      {contexto && <span>Contexto: {contextText(contexto)}</span>}
    </p>
  );
}

function CoverageLine({ cobertura }: { cobertura: Cobertura }) {
  return (
    <div className="e47-coverage">
      <CoberturaBadge valor={cobertura.estado} />
      <span className="e47-coverage-meta">{cobertura.detalle}</span>
      {(cobertura.incluidos !== null || cobertura.excluidos !== null) && (
        <span className="e47-coverage-meta">
          Incluidos {cobertura.incluidos ?? "—"} · Excluidos{" "}
          {cobertura.excluidos ?? "—"}
        </span>
      )}
      {cobertura.motivos.length > 0 && (
        <ul className="e47-coverage-motivos">
          {cobertura.motivos.map((motivo) => (
            <li key={motivo}>{motivo}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PageLink({
  enlace,
  go,
  children,
}: {
  enlace: Enlace | null;
  go: (path: string) => void;
  children?: ReactNode;
}) {
  if (enlace === null) return null;
  return (
    <a
      href={enlace.ruta}
      onClick={(event) => {
        event.preventDefault();
        go(enlace.ruta);
      }}
    >
      {children ?? enlace.etiqueta}
    </a>
  );
}

function LaneHead({
  title,
  motor,
  lane,
}: {
  title: string;
  motor: string;
  lane: { estado: EstadoMetrica; motivo: string; cobertura: Cobertura };
}) {
  return (
    <header className="e47-lane-head">
      <div>
        <p className="eyebrow">{motor}</p>
        <h2>{title}</h2>
      </div>
      <div className="e47-lane-status">
        <EstadoBadge estado={lane.estado} />
        <CoberturaBadge valor={lane.cobertura.estado} />
      </div>
      <p className="e47-lane-motivo">{lane.motivo}</p>
    </header>
  );
}

function MetricCard({ metrica, go }: { metrica: Metrica; go: (path: string) => void }) {
  return (
    <Metric
      title={metrica.etiqueta}
      titleAs="h4"
      dataClase={metrica.clase}
      ariaLabel={metrica.etiqueta}
      className="e47-card"
      amount={<MetricAmount metrica={metrica} />}
      badge={<EstadoBadge estado={metrica.estado} />}
    >
      <p className="e47-card-motivo">{metrica.motivo}</p>
      <CoverageLine cobertura={metrica.cobertura} />
      <FuenteLinea fuente={metrica.fuente} contexto={metrica.contexto} />
      <PageLink enlace={metrica.enlace} go={go} />
    </Metric>
  );
}

function margenMetrica(margen: MargenPublicado): Metrica {
  return {
    clave: margen.clave,
    etiqueta: margen.etiqueta,
    clase: "plan",
    valor: margen.valor,
    subtotal: margen.subtotal,
    estado: margen.estado,
    unidad: "EUR",
    motivo: margen.motivo,
    cobertura: margen.cobertura,
    fuente: margen.fuente,
    contexto: {
      tipo: "ciclo",
      cicloId: margen.cicloId,
      corte: margen.corte,
    },
    alcance: "Ciclo",
    enlace: null,
  };
}

function MetricTableRow({ metrica }: { metrica: Metrica }) {
  return (
    <tr>
      <th scope="row">{metrica.etiqueta}</th>
      <td>
        <MetricAmount metrica={metrica} />
        <small className="e47-table-source">{metrica.fuente.motor}</small>
      </td>
      <td>
        <EstadoBadge estado={metrica.estado} />
      </td>
      <td>
        <CoberturaBadge valor={metrica.cobertura.estado} />
        <small className="e47-table-source">{metrica.cobertura.detalle}</small>
      </td>
      <td className="e47-table-motivo">{metrica.motivo}</td>
    </tr>
  );
}

function initialFilters(): Filters {
  const params = new URLSearchParams(location.search);
  return {
    ejercicio: params.get("ejercicio") ?? String(new Date().getFullYear()),
    ciclo: params.get("ciclo") ?? "",
    partida: params.get("partida") ?? "",
    cobertura: params.get("cobertura") ?? "",
  };
}

function filtersPath(filters: Filters) {
  const params = new URLSearchParams();
  params.set("ejercicio", filters.ejercicio);
  if (filters.ciclo !== "") params.set("ciclo", filters.ciclo);
  if (filters.partida !== "") params.set("partida", filters.partida);
  if (filters.cobertura !== "") params.set("cobertura", filters.cobertura);
  return `/resumen-anual?${params.toString()}`;
}

function yearOptions(current: string) {
  const numeric = Number(current);
  const base = Number.isSafeInteger(numeric) && numeric > 0
    ? numeric
    : new Date().getFullYear();
  return Array.from({ length: 8 }, (_, index) => String(base - 4 + index));
}

function FilterBar({
  filters,
  onChange,
  ciclos,
  partidas,
}: {
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
  ciclos: CicloRef[];
  partidas: string[];
}) {
  return (
    <div
      className="e47-filters"
      role="group"
      aria-label="Filtros del resumen anual"
    >
      <label>
        Ejercicio
        <select
          aria-label="Ejercicio"
          value={filters.ejercicio}
          onChange={(event) => onChange("ejercicio", event.target.value)}
        >
          {yearOptions(filters.ejercicio).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cobertura
        <select
          aria-label="Cobertura"
          value={filters.cobertura}
          onChange={(event) => onChange("cobertura", event.target.value)}
        >
          <option value="">Todas</option>
          <option value="Completa">Completa</option>
          <option value="Parcial">Parcial</option>
          <option value="NoAcreditada">No acreditada</option>
          <option value="NoDisponible">No disponible</option>
          <option value="Solapada">Solapada</option>
        </select>
      </label>
      <label>
        Ciclo
        <select
          aria-label="Ciclo"
          value={filters.ciclo}
          onChange={(event) => onChange("ciclo", event.target.value)}
        >
          <option value="">Todos</option>
          {ciclos.map((ciclo) => (
            <option key={ciclo.cicloId} value={ciclo.cicloId}>
              {ciclo.cicloId} · {formatDate(ciclo.inicio)}–
              {ciclo.fin ? formatDate(ciclo.fin) : "abierto"}
            </option>
          ))}
        </select>
      </label>
      <label>
        Partida
        <select
          aria-label="Partida"
          value={filters.partida}
          onChange={(event) => onChange("partida", event.target.value)}
        >
          <option value="">Todas</option>
          {partidas.map((partida) => (
            <option key={partida} value={partida}>
              {partida}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function ResumenAnual({ go }: { go: (path: string) => void }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState({ status: "loading" });
    const query = new URLSearchParams({ ejercicio: filters.ejercicio });
    if (filters.ciclo !== "") query.set("ciclo", filters.ciclo);
    if (filters.partida !== "") query.set("partida", filters.partida);
    if (filters.cobertura !== "") query.set("cobertura", filters.cobertura);
    api<ResumenAnualDto>("/resumen-anual?" + query.toString())
      .then((data) => {
        if (current) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!current) return;
        const apiError = error instanceof ApiError ? error : null;
        setState({
          status: "error",
          message:
            apiError?.message ?? "No se pudo cargar el resumen anual.",
          expired: apiError?.status === 401,
        });
      });
    return () => {
      current = false;
    };
  }, [
    filters.ejercicio,
    filters.ciclo,
    filters.partida,
    filters.cobertura,
    attempt,
  ]);

  function updateFilter(key: keyof Filters, value: string) {
    const next: Filters = { ...filters, [key]: value };
    if (key === "ejercicio") {
      next.ciclo = "";
      next.partida = "";
    }
    setFilters(next);
    history.replaceState(null, "", filtersPath(next));
  }

  if (state.status === "loading")
    return (
      <div className="e47-page">
        <PageHead
          eyebrow="RESUMEN ANUAL · SOLO LECTURA"
          title="Resumen anual"
          description="Componiendo lo que ya publican los motores propietarios…"
        />
        <section className="panel e47-context" aria-labelledby="e47-cargando">
          <div className="e47-context-head">
            <div>
              <p className="eyebrow">EJERCICIO NATURAL</p>
              <h2 id="e47-cargando">{filters.ejercicio}</h2>
            </div>
            <p className="e47-live">Cargando… · Solo lectura</p>
          </div>
          <FilterBar
            filters={filters}
            onChange={updateFilter}
            ciclos={[]}
            partidas={filters.partida === "" ? [] : [filters.partida]}
          />
        </section>
        <Skeleton label="Cargando el resumen anual" />
      </div>
    );

  if (state.status === "error")
    return (
      <div className="e47-page">
        <PageHead
          eyebrow="RESUMEN ANUAL · SOLO LECTURA"
          title="Resumen anual"
        />
        {state.expired ? (
          <Alert>
            La sesión ha caducado. Vuelve a iniciar sesión para consultar el
            resumen; no se muestran importes.
          </Alert>
        ) : (
          <Alert retry={() => setAttempt((value) => value + 1)}>
            {state.message}
          </Alert>
        )}
      </div>
    );

  const { data } = state;
  const { plan, prevision, realidad, archivo } = data.carriles;
  const sinDatos =
    plan.items.length === 0 &&
    realidad.ciclos.length === 0 &&
    archivo.items.length === 0 &&
    data.margenes.publicados.length === 0;
  const partidaOptions = [
    ...new Set(plan.items.map((item) => item.partidaId)),
  ];
  if (filters.partida !== "" && !partidaOptions.includes(filters.partida))
    partidaOptions.push(filters.partida);

  return (
    <div className="e47-page">
      <PageHead
        eyebrow="RESUMEN ANUAL · SOLO LECTURA"
        title="Resumen anual"
        description="Cada cifra conserva su motor, su contexto y su cobertura. No hay total anual ni sumas entre carriles."
      >
        <a
          className="secondary"
          href="#e47-pendientes"
          onClick={(event) => {
            event.preventDefault();
            document
              .getElementById("e47-pendientes")
              ?.scrollIntoView({ block: "start" });
          }}
        >
          Cómo se calcula y qué falta
        </a>
      </PageHead>

      <section className="panel e47-context" aria-labelledby="e47-contexto">
        <div className="e47-context-head">
          <div>
            <p className="eyebrow">EJERCICIO NATURAL</p>
            <h2 id="e47-contexto">{data.ejercicio.natural}</h2>
          </div>
          <p className="e47-live">
            {data.contexto.etiqueta} · Solo lectura
          </p>
        </div>
        <dl className="e47-facts">
          <div>
            <dt>Corte</dt>
            <dd>{formatDate(data.contexto.corte.fecha)}</dd>
          </div>
          <div>
            <dt>Fuente del corte</dt>
            <dd>{data.contexto.corte.fuente}</dd>
          </div>
          <div>
            <dt>Estado del corte</dt>
            <dd>{estadoCorteLabel(data.contexto.corte.estado)}</dd>
          </div>
          <div>
            <dt>Cobertura global</dt>
            <dd>
              <CoberturaBadge valor={data.cobertura.estado} />
            </dd>
          </div>
          <div>
            <dt>Rango civil</dt>
            <dd>
              {formatDate(data.ejercicio.desde)}–{formatDate(data.ejercicio.hasta)}
            </dd>
          </div>
          <div>
            <dt>Revisión</dt>
            <dd>{data.contexto.revision.slice(0, 16)}…</dd>
          </div>
        </dl>
        <FilterBar
          filters={filters}
          onChange={updateFilter}
          ciclos={data.ejercicio.ciclos}
          partidas={partidaOptions}
        />
        <p className="e47-context-meta">
          Consulta {data.contexto.consulta} ·{" "}
          {data.contexto.calculo === "Vivo"
            ? "cálculo vivo, sin foto"
            : "foto"}
        </p>
      </section>

      {sinDatos && (
        <EmptyState
          className="e47-empty-page"
          title="Sin datos para este ejercicio. No se muestran ceros inventados."
        />
      )}

      <div className="e47-grid-2">
        <section className="panel e47-lane" aria-labelledby="e47-plan">
          <LaneHead title="Plan" motor="E2.4 · plan anual" lane={plan} />
          {plan.items.length === 0 ? (
            <p className="e47-empty">Sin plan ni ejecución para el filtro.</p>
          ) : (
            <>
              <div className="e47-table-wrap">
                <table className="e47-table">
                  <caption className="e47-table-caption">
                    Plan por Partida; el Ejecutado no es total anual
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Partida</th>
                      <th scope="col">Presupuesto</th>
                      <th scope="col">Esencial</th>
                      <th scope="col">Ejecutado</th>
                      <th scope="col">Diferencia</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Cobertura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.items.map((item) => (
                      <tr key={item.partidaId}>
                        <th scope="row">{item.partidaId}</th>
                        <td>
                          {item.presupuesto === null
                            ? "Sin presupuesto"
                            : formatDecimal(item.presupuesto, "EUR")}
                        </td>
                        <td>{item.esencial ?? "Sin clasificar"}</td>
                        <td>
                          <MetricAmount metrica={item.ejecutado} />
                          <small className="e47-table-source">
                            {item.ejecutado.fuente.motor}
                            {item.ejecutado.fuente.ids.length > 0
                              ? ` · IDs: ${item.ejecutado.fuente.ids.join(", ")}`
                              : ""}
                          </small>
                        </td>
                        <td>
                          {item.diferencia === null ? (
                            <Amount
                              value={null}
                              state="No aplica"
                              note={
                                item.presupuesto === null
                                  ? "Sin presupuesto anual"
                                  : "Ejecutado no verificable"
                              }
                            />
                          ) : (
                            <MetricAmount metrica={item.diferencia} />
                          )}
                        </td>
                        <td>
                          <EstadoBadge estado={item.ejecutado.estado} />
                        </td>
                        <td>
                          <CoberturaBadge valor={item.cobertura.estado} />
                          <small className="e47-table-source">
                            {item.cobertura.detalle}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="e47-cards">
                {plan.items.map((item) => (
                  <article
                    className="e47-card"
                    key={item.partidaId}
                    aria-label={`Partida ${item.partidaId}`}
                  >
                    <div className="e47-card-head">
                      <h4>{item.partidaId}</h4>
                      <EstadoBadge estado={item.ejecutado.estado} />
                    </div>
                    <dl className="e47-card-facts">
                      <div>
                        <dt>Presupuesto</dt>
                        <dd>
                          {item.presupuesto === null
                            ? "Sin presupuesto"
                            : formatDecimal(item.presupuesto, "EUR")}
                        </dd>
                      </div>
                      <div>
                        <dt>Esencial</dt>
                        <dd>{item.esencial ?? "Sin clasificar"}</dd>
                      </div>
                      <div>
                        <dt>Ejecutado</dt>
                        <dd>
                          <MetricAmount metrica={item.ejecutado} />
                        </dd>
                      </div>
                      <div>
                        <dt>Diferencia</dt>
                        <dd>
                          {item.diferencia === null ? (
                            <Amount
                              value={null}
                              state="No aplica"
                              note={
                                item.presupuesto === null
                                  ? "Sin presupuesto anual"
                                  : "Ejecutado no verificable"
                              }
                            />
                          ) : (
                            <MetricAmount metrica={item.diferencia} />
                          )}
                        </dd>
                      </div>
                    </dl>
                    <p className="e47-card-motivo">{item.ejecutado.motivo}</p>
                    <CoverageLine cobertura={item.cobertura} />
                    <FuenteLinea
                      fuente={item.ejecutado.fuente}
                      contexto={item.ejecutado.contexto}
                    />
                  </article>
                ))}
              </div>
            </>
          )}
          <p className="e47-linkrow">
            <PageLink enlace={plan.enlace} go={go} />
          </p>
        </section>

        <section className="panel e47-lane" aria-labelledby="e47-prevision">
          <LaneHead
            title="Previsión"
            motor="E2.5 · previsión de nómina"
            lane={prevision}
          />
          <p className="e47-empty">{prevision.motivo}</p>
          {prevision.simulacion && (
            <MetricCard metrica={prevision.simulacion} go={go} />
          )}
          <p className="e47-note">
            La previsión no crea hechos ni se suma al año ni al Ciclo.
          </p>
          <p className="e47-linkrow">
            <PageLink enlace={prevision.enlace} go={go} />
          </p>
        </section>

        <section className="panel e47-lane" aria-labelledby="e47-realidad">
          <LaneHead
            title="Realidad"
            motor="E2.6 + E3.6 · por Ciclo"
            lane={realidad}
          />
          <p className="e47-note">
            Agregado anual: <strong>{realidad.agregadoAnual.estado}</strong> ·{" "}
            {realidad.agregadoAnual.motivo}
          </p>
          {realidad.ciclos.map((ciclo) => (
            <div className="e47-ciclo" key={ciclo.cicloId}>
              <h3>
                Ciclo {ciclo.cicloId} · {formatDate(ciclo.inicio)}–
                {ciclo.fin ? formatDate(ciclo.fin) : "abierto"} · corte{" "}
                {formatDate(ciclo.corte)}
              </h3>
              <p className="e47-linkrow">
                <PageLink enlace={ciclo.ingresos.enlace} go={go}>
                  Ver flujo mensual del ciclo {ciclo.cicloId}
                </PageLink>
              </p>
              <p className="e47-ciclo-meta">
                Ejercicios: {ciclo.ejercicios.join(", ")}. Un Ciclo puede cruzar
                diciembre/enero; no se prorratea.
              </p>
              <div className="e47-table-wrap">
                <table className="e47-table">
                  <caption className="e47-table-caption">
                    Métricas del Ciclo {ciclo.cicloId}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Métrica</th>
                      <th scope="col">Valor / subtotal</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Cobertura</th>
                      <th scope="col">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ciclo.ingresos,
                      ciclo.gasto,
                      ciclo.extraordinaria,
                      ciclo.nomina,
                      ciclo.operativo,
                      ciclo.margenReal,
                      ciclo.margenEstructural,
                    ].map((metrica) => (
                      <MetricTableRow key={metrica.clave} metrica={metrica} />
                    ))}
                    <tr>
                      <th scope="row">Ajuste G_n</th>
                      <td>
                        {ciclo.ajusteCompartidos.gNeto === null ? (
                          <Amount value={null} state="No disponible" showNote={false} />
                        ) : (
                          formatDecimal(ciclo.ajusteCompartidos.gNeto, "EUR")
                        )}
                      </td>
                      <td>
                        <EstadoBadge estado={ciclo.ajusteCompartidos.estado} />
                      </td>
                      <td>
                        <CoberturaBadge
                          valor={ciclo.ajusteCompartidos.cobertura.estado}
                        />
                      </td>
                      <td className="e47-table-motivo">
                        {ciclo.ajusteCompartidos.motivo}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Ajuste S_aj</th>
                      <td>
                        {ciclo.ajusteCompartidos.sAjustado === null ? (
                          <Amount value={null} state="No disponible" showNote={false} />
                        ) : (
                          formatDecimal(ciclo.ajusteCompartidos.sAjustado, "EUR")
                        )}
                      </td>
                      <td>
                        <EstadoBadge estado={ciclo.ajusteCompartidos.estado} />
                      </td>
                      <td>
                        <CoberturaBadge
                          valor={ciclo.ajusteCompartidos.cobertura.estado}
                        />
                      </td>
                      <td className="e47-table-motivo">
                        {ciclo.ajusteCompartidos.fuente.motor}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="e47-cards">
                {[
                  ciclo.ingresos,
                  ciclo.gasto,
                  ciclo.extraordinaria,
                  ciclo.nomina,
                  ciclo.operativo,
                  ciclo.margenReal,
                  ciclo.margenEstructural,
                ].map((metrica) => (
                  <MetricCard key={metrica.clave} metrica={metrica} go={go} />
                ))}
              </div>
            </div>
          ))}
          {realidad.ciclos.length === 0 && (
            <p className="e47-empty">{realidad.motivo}</p>
          )}
          <p className="e47-linkrow">
            <PageLink enlace={realidad.enlace} go={go} />
          </p>
        </section>

        <section className="panel e47-lane" aria-labelledby="e47-archivo">
          <LaneHead
            title="Archivo"
            motor="E4.5 · histórico de Gastos"
            lane={archivo}
          />
          <p className="e47-gate">
            Gate {archivo.gate === "BLOCKED" ? "BLOQUEADO" : archivo.gate}
          </p>
          <p className="e47-empty">{archivo.motivo}</p>
          <p className="e47-note">
            Sin E4.5/DT7 no hay archivo verificado ni total anual. No se simula
            ni se suma al flujo del Ciclo.
          </p>
          <p className="e47-linkrow">
            <PageLink enlace={archivo.enlace} go={go} />
          </p>
        </section>
      </div>

      <section className="panel e47-lane" aria-labelledby="e47-margenes">
        <LaneHead
          title="Márgenes del plan"
          motor="E2.6 · márgenes existentes"
          lane={{
            estado: data.margenes.estado,
            motivo: data.margenes.nota,
            cobertura: {
              estado:
                data.margenes.estado === "Parcial" ? "Parcial" : "NoDisponible",
              fuente: "E2.6 monthlyFlow",
              detalle: "Solo margen estructural y margen frente a nómina real.",
              incluidos: data.margenes.publicados.length,
              excluidos: data.margenes.noDefinidos.length,
              motivos: [],
            },
          }}
        />
        <p className="e47-note">
          Son márgenes del plan, no ahorro ejecutado ni margen anual. No se
          suman entre Ciclos ni se promedian.
        </p>
        <div className="e47-table-wrap">
          <table className="e47-table">
            <caption className="e47-table-caption">
              Márgenes por Ciclo con cobertura
            </caption>
            <thead>
              <tr>
                <th scope="col">Ciclo</th>
                <th scope="col">Margen</th>
                <th scope="col">Valor</th>
                <th scope="col">Estado</th>
                <th scope="col">Cobertura</th>
              </tr>
            </thead>
            <tbody>
              {data.margenes.publicados.map((margen) => (
                <tr key={`${margen.cicloId}-${margen.clave}`}>
                  <th scope="row">{margen.cicloId}</th>
                  <td>{margen.etiqueta}</td>
                  <td>
                    <MetricAmount metrica={margenMetrica(margen)} />
                  </td>
                  <td>
                    <EstadoBadge estado={margen.estado} />
                  </td>
                  <td>
                    <CoberturaBadge valor={margen.cobertura.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="e47-cards">
          {data.margenes.publicados.map((margen) => (
            <MetricCard
              key={`${margen.cicloId}-${margen.clave}`}
              metrica={margenMetrica(margen)}
              go={go}
            />
          ))}
        </div>
        <ul className="e47-nd-list">
          {data.margenes.noDefinidos.map((margen) => (
            <li key={margen.clave}>
              <EstadoBadge estado={margen.estado} />
              <span>
                <strong>{margen.etiqueta}</strong>: {margen.motivo}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {data.patrimonio && (
        <section className="panel e47-lane" aria-labelledby="e47-patrimonio">
          <header className="e47-lane-head">
            <div>
              <p className="eyebrow">CONTEXTO OPCIONAL</p>
              <h2 id="e47-patrimonio">Patrimonio al corte</h2>
            </div>
            <EstadoBadge estado={data.patrimonio.corte.estado} />
            <p className="e47-lane-motivo">
              {data.patrimonio.corte.motivo}
            </p>
          </header>
          <p className="e47-note">{data.patrimonio.nota}</p>
          <div className="e47-grid-2">
            <article className="e47-subblock" aria-label="Valoración E4.3">
              <h3>Valoración E4.3</h3>
              <dl className="e47-card-facts">
                <div>
                  <dt>Valor</dt>
                  <dd>
                    {data.patrimonio.valoracion.valorEur === null ? (
                      <Amount value={null} state="No disponible" showNote={false} />
                    ) : (
                      formatDecimal(data.patrimonio.valoracion.valorEur, "EUR")
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Resultado</dt>
                  <dd>
                    {data.patrimonio.valoracion.resultadoEur === null ? (
                      <Amount value={null} state="No disponible" showNote={false} />
                    ) : (
                      formatDecimal(data.patrimonio.valoracion.resultadoEur, "EUR")
                    )}
                  </dd>
                </div>
              </dl>
              {data.patrimonio.valoracion.estado !== "No disponible" &&
                data.patrimonio.valoracion.corte !== null && (
                  <p className="e47-ciclo-meta">
                    Corte aplicado:{" "}
                    {formatDate(data.patrimonio.valoracion.corte)} · Cobertura
                    valoración:{" "}
                    {data.patrimonio.valoracion.coberturaValoracion} ·
                    resultado: {data.patrimonio.valoracion.coberturaResultado}
                  </p>
                )}
              <FuenteLinea fuente={data.patrimonio.valoracion.fuente} />
              <PageLink enlace={data.patrimonio.valoracion.enlace} go={go} />
            </article>
            <article className="e47-subblock" aria-label="Deuda E4.4">
              <h3>Deuda E4.4</h3>
              <dl className="e47-card-facts">
                <div>
                  <dt>Total</dt>
                  <dd>
                    {data.patrimonio.deuda.total === null ? (
                      <Amount value={null} state="No disponible" showNote={false} />
                    ) : (
                      formatDecimal(data.patrimonio.deuda.total, "EUR")
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Subtotal</dt>
                  <dd>
                    {data.patrimonio.deuda.subtotal === null ? (
                      <Amount value={null} state="No disponible" showNote={false} />
                    ) : (
                      formatDecimal(data.patrimonio.deuda.subtotal, "EUR")
                    )}
                  </dd>
                </div>
              </dl>
              {data.patrimonio.deuda.estado !== "No disponible" &&
                data.patrimonio.deuda.corte !== null && (
                  <p className="e47-ciclo-meta">
                    Corte aplicado: {formatDate(data.patrimonio.deuda.corte)}
                  </p>
                )}
              <CoverageLine cobertura={data.patrimonio.deuda.cobertura} />
              <FuenteLinea fuente={data.patrimonio.deuda.fuente} />
              <PageLink enlace={data.patrimonio.deuda.enlace} go={go} />
            </article>
          </div>
        </section>
      )}

      <section
        className="panel e47-lane"
        id="e47-pendientes"
        aria-labelledby="e47-pendientes-title"
      >
        <h2 id="e47-pendientes-title">Cómo se calcula y qué falta</h2>
        <p className="e47-note">
          El resumen compone respuestas de sus motores propietarios. No hay
          motor de suma anual, tabla, snapshot, caché persistida ni migración.
        </p>
        <ul className="e47-pendientes">
          {data.pendientesDelModelo.map((pendiente) => (
            <li key={pendiente}>{pendiente}</li>
          ))}
        </ul>
        <ul className="e47-coverage-motivos">
          {data.cobertura.motivos.map((motivo) => (
            <li key={motivo}>{motivo}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
