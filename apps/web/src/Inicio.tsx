import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { formatDecimal } from "./format";
import { Alert, Amount, Badge, Metric, PageHead, Skeleton } from "./ui";
import type { ThemeId } from "./themes";

/**
 * E4.6 — Resumen de inicio.
 *
 * Pantalla de solo lectura. Compone la respuesta de `GET /api/resumen-inicio`
 * sin calcular economía en el navegador: únicamente formatea cadenas decimales
 * exactas y fechas ISO. `null` se presenta como No disponible y nunca como 0,00.
 *
 * No usa `localStorage` financiero ni envía importes en la URL. Los enlaces de
 * drill-down solo llevan IDs y rutas publicadas por el API.
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
  incluidos: number;
  excluidos: number;
  motivos: string[];
};

type Fuente = { motor: string; ids: string[]; revisiones: string[] };

type Contexto = {
  tipo: "actual" | "ciclo" | "corte";
  cicloId?: string | null;
  corte?: string | null;
};

type Enlace = { ruta: string; ids: string[] } | null;

type Racional = { numeradorCentimos: string; divisor: string };

type Metrica = {
  clave: string;
  etiqueta: string;
  clase: "real" | "plan" | "posicion" | "objetivo" | "informativo";
  valor: string | null;
  subtotal?: string | null;
  estado: EstadoMetrica;
  unidad: "EUR" | "meses" | null;
  motivo: string;
  cobertura: Cobertura;
  fuente: Fuente;
  contexto: Contexto;
  enlace: Enlace;
  racional?: Racional;
};

type LiquidezIncluido = {
  id: string;
  nombre: string | null;
  valor: string | null;
};

type LiquidezExcluido = { id: string; motivo: string };

type SaldoItem = {
  id: string;
  nombre: string;
  estado: string;
  posicion: string | null;
  condicion: string;
  motivo?: string | null;
  liquidez: boolean | null;
  finalidad: string | null;
  bolsa: boolean | null;
  revision: number;
};

type InversionPosicion = {
  instrumento: string;
  nombre: string;
  cantidad: string;
  estado: string;
  tipoValoracion: string;
  valorEur: string | null;
  fechaValoracion: string | null;
  valoracionEstado: string | null;
  valoracionMotivo: string | null;
  valoracionCobertura: string | null;
  elegibilidadFechaExacta: string | null;
  resultadoEur: string | null;
  resultadoEstado: string;
  resultadoMotivo: string | null;
};

type DeudaItem = {
  id: string;
  nombre: string;
  tipoDeuda: string | null;
  estado: string;
  capitalPendiente: string | null;
  calculable: boolean;
  motivo?: string | null;
};

type DeudaAparte = {
  id: string;
  nombre: string;
  tipoDeuda: string | null;
  estado: string;
  capitalPendiente: string | null;
  calculable: boolean;
  revision: number;
  motivo?: string | null;
};

type PendienteItem = {
  claveEfimera: string;
  tipo: string;
  fuente: { motor: string; id: string; revision: number | null };
  fechaHecho: string | null;
  estado: string;
  cobertura: string;
  motivo: string | null;
  enlaces: { tipo: string; href: string }[];
};

type AhorroPosicion = {
  id: string;
  nombre: string;
  valor: string | null;
  estado: string;
  condicion: string;
  motivo?: string | null;
};

type MetricAhorro = {
  estado: string;
  valor: string | null;
  motivo: string;
  cobertura: string | null;
  fuente: Fuente;
};

type ResumenInicio = {
  contexto: {
    ciclo: {
      id: string;
      inicio: string;
      fin: string | null;
      mesFinanciado: string;
      estadoTemporal: string;
      corte: string | null;
      estadoCorte: string;
    } | null;
    referencia: {
      fecha: string | null;
      estado: string;
      cobertura: {
        source: string;
        state: string;
        maxDate?: string | null;
      }[];
    };
    consulta: string;
    revision: string;
    motivos: string[];
  };
  secciones: {
    liquidez: {
      metrica: Metrica;
      incluidos: LiquidezIncluido[];
      excluidos: LiquidezExcluido[];
    };
    objetivo: {
      metrica: Metrica;
      costeEsencialMensual: {
        valor: string | null;
        subtotal: string | null;
        estado: string;
        ejercicio: number | null;
        ejercicioOrigen: string;
        estadoEquivalente: string;
        motivo: string;
        cobertura: {
          estado: string;
          motivos: string[];
          importesSinInformar: number | null;
          clasificacionesPendientes: number | null;
          ejercicioSinPlan: boolean | null;
          fuenteMotivo: string | null;
        };
        fuente: Fuente;
        contexto: Contexto;
      };
      mesesObjetivo: number | null;
      mesesCubiertos: Metrica;
      zona: string;
    };
    ciclo: Record<string, Metrica | string | undefined> & {
      ingresos: Metrica;
      gasto: Metrica;
      extraordinaria: Metrica;
      operativo: Metrica;
      margenReal: Metrica;
      nomina: Metrica;
      base: Metrica;
      delMes: Metrica;
      motivo?: string;
    };
    saldos: {
      contexto: Contexto;
      conteos: { liquidez: number; ahorro: number; bolsas: number };
      items: SaldoItem[];
      cobertura: Cobertura;
      fuente: Fuente;
      enlace: Enlace;
    };
    ahorro: {
      contexto: Contexto;
      posiciones: AhorroPosicion[];
      ahorroCierre: MetricAhorro;
      variacionAhorro: MetricAhorro;
      ahorroResidual: MetricAhorro;
      fuente: Fuente;
      enlace: Enlace;
    };
    inversion: {
      contexto: Contexto;
      agregado: {
        coberturaValoracion: string;
        valorEur: string | null;
        coberturaResultado: string;
        resultadoEur: string | null;
      } | null;
      posiciones: InversionPosicion[];
      efectivo: {
        saldo: string;
        nombre: string;
        disponible: string;
        fecha: string;
      }[];
      cobertura: Cobertura;
      fuente: Fuente;
      enlace: Enlace;
    };
    deudaNoHipotecaria: {
      contexto: Contexto;
      items: DeudaItem[];
      total: {
        valor: string | null;
        subtotal: string | null;
        estado: EstadoMetrica;
        motivo: string;
        cobertura: Cobertura;
        fuente: Fuente;
      };
      aparte: {
        hipotecaria: DeudaAparte[];
        sinInformar: DeudaAparte[];
      };
      fuente: Fuente;
      enlace: Enlace;
    };
    pendientes: {
      contexto: Contexto;
      metrica: Metrica;
      items: PendienteItem[];
      conteo: Record<string, number> | null;
      fuenteFallos: { motor: string; id: string | null; motivo: string }[];
    };
  };
  pendientesDelModelo: string[];
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; expired: boolean }
  | { status: "ready"; data: ResumenInicio };

const ESTADO_META: Record<
  EstadoMetrica,
  { icon: string; label: string; tone: "ok" | "partial" | "nd" }
> = {
  Verificado: { icon: "✓", label: "COMPLETO", tone: "ok" },
  "Cero verificado": { icon: "✓", label: "CERO VERIFICADO", tone: "ok" },
  Parcial: { icon: "!", label: "PARCIAL", tone: "partial" },
  "No disponible": { icon: "—", label: "NO DISPONIBLE", tone: "nd" },
  "No aplica": { icon: "—", label: "NO APLICA", tone: "nd" },
  "Sin datos": { icon: "○", label: "SIN DATOS", tone: "nd" },
};

/** Traduce coberturas de motor (E4.3/E2.4) a la taxonomía única de badges. */
function estadoDesdeCobertura(value: string): EstadoMetrica {
  if (/^(Completa|Verificada|Completo)$/i.test(value)) return "Verificado";
  if (/^Parcial/i.test(value)) return "Parcial";
  if (/^No aplica$/i.test(value)) return "No aplica";
  if (/^Sin datos$/i.test(value)) return "Sin datos";
  return "No disponible";
}

/**
 * Distingue parcial por cobertura histórica de parcial por componentes, usando
 * solo el texto publicado por el motor. Si no hay señal, deja `PARCIAL`.
 */
function etiquetaParcial(
  estado: EstadoMetrica,
  motivo: string,
  cobertura: Cobertura,
): string | undefined {
  if (estado !== "Parcial") return undefined;
  const texto = `${motivo} ${cobertura.motivos.join(" ")}`.toLowerCase();
  if (texto.includes("cobertura histórica")) return "PARCIAL · HISTÓRICO";
  if (/componente|no calculable|sin informar|faltan/.test(texto))
    return "PARCIAL · COMPONENTES";
  return undefined;
}

/** Evita repetir el mismo texto como bullet de cobertura y como motivo. */
function motivosSinDuplicar(motivos: string[], motivo: string): string[] {
  const normalizar = (value: string) =>
    value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
  const motivoNormalizado = normalizar(motivo);
  const vistos = new Set<string>();
  return motivos.filter((candidato) => {
    const texto = normalizar(candidato);
    if (!texto || texto === motivoNormalizado || vistos.has(texto)) return false;
    vistos.add(texto);
    return true;
  });
}

const CLASE_META: Record<string, string> = {
  real: "REAL",
  plan: "PLAN",
  posicion: "POSICIÓN",
  objetivo: "OBJETIVO",
  informativo: "INFORMATIVO",
};

/** Formatea una fecha ISO como dd/mm/aaaa. */
function formatDate(value: string | null) {
  if (value === null) return "No disponible";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatMonth(value: string | null) {
  if (value === null) return "No disponible";
  const [year, month] = value.split("-");
  return year && month ? `${month}/${year}` : value;
}

function contextText(contexto: Contexto) {
  if (contexto.tipo === "ciclo")
    return `ciclo ${contexto.cicloId ?? "—"}${
      contexto.corte ? ` · corte ${formatDate(contexto.corte)}` : ""
    }`;
  if (contexto.tipo === "corte") return `corte ${formatDate(contexto.corte ?? null)}`;
  return "actual";
}

function coverageText(cobertura: Cobertura) {
  const total = cobertura.incluidos + cobertura.excluidos;
  return `${cobertura.incluidos}/${total} · incluidos ${cobertura.incluidos} · excluidos ${cobertura.excluidos}`;
}

function EstadoBadge({
  estado,
  label,
}: {
  estado: EstadoMetrica;
  label?: string;
}) {
  const meta = ESTADO_META[estado];
  return (
    <Badge
      tone={meta.tone}
      label={label ?? meta.label}
      icon={meta.icon}
      estado={estado}
      kind="estado"
    />
  );
}

/** Badge único para estados de cobertura publicados como texto por el motor. */
function CoberturaBadge({ valor }: { valor: string }) {
  return <EstadoBadge estado={estadoDesdeCobertura(valor)} />;
}

function InicioLink({
  enlace,
  go,
  children,
}: {
  enlace: Enlace;
  go: (path: string) => void;
  children: React.ReactNode;
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
      {children}
    </a>
  );
}

function FuenteLinea({
  fuente,
  contexto,
  etiqueta = "Fuente",
}: {
  fuente: Fuente;
  contexto: Contexto;
  etiqueta?: string;
}) {
  return (
    <p className="inicio-source">
      <span>
        {etiqueta}: <strong>{fuente.motor}</strong>
      </span>
      {fuente.ids.length > 0 && (
        <span className="inicio-source-ids">
          IDs: {fuente.ids.join(", ")}
        </span>
      )}
      <span>Contexto: {contextText(contexto)}</span>
    </p>
  );
}

function MetricCard({
  metrica,
  go,
  enlaceTexto,
  showLink = true,
  children,
}: {
  metrica: Metrica;
  go: (path: string) => void;
  enlaceTexto?: string;
  showLink?: boolean;
  children?: React.ReactNode;
}) {
  const motivos = motivosSinDuplicar(
    metrica.cobertura.motivos,
    metrica.motivo,
  );
  const parcial = etiquetaParcial(
    metrica.estado,
    metrica.motivo,
    metrica.cobertura,
  );
  return (
    <Metric
      title={metrica.etiqueta}
      clase={CLASE_META[metrica.clase] ?? metrica.clase}
      dataClase={metrica.clase}
      ariaLabel={metrica.etiqueta}
      className="inicio-metric"
      amount={
        <Amount
          value={metrica.valor}
          subtotal={metrica.subtotal ?? null}
          state={metrica.estado}
          unit={metrica.unidad}
        />
      }
      badge={<EstadoBadge estado={metrica.estado} label={parcial} />}
    >
      <p className="inicio-metric-meta">{coverageText(metrica.cobertura)}</p>
      {motivos.length > 0 && (
        <ul className="inicio-metric-coverage">
          {motivos.map((motivo) => (
            <li key={motivo}>{motivo}</li>
          ))}
        </ul>
      )}
      <p className="inicio-metric-motivo">{metrica.motivo}</p>
      <FuenteLinea fuente={metrica.fuente} contexto={metrica.contexto} />
      {children}
      {showLink && metrica.enlace !== null && (
        <p className="inicio-linkrow">
          <InicioLink enlace={metrica.enlace} go={go}>
            {enlaceTexto ?? "Ver origen"}
          </InicioLink>
        </p>
      )}
    </Metric>
  );
}

/** Extracción compartida de cifras publicadas para Inicio (Graphite y Casa). */
function buildInicioOverview(secciones: ResumenInicio["secciones"]) {
  return {
    liquidity: secciones.liquidez.metrica,
    liquidityIncluded: secciones.liquidez.incluidos.length,
    liquidityExcluded: secciones.liquidez.excluidos.length,
    cycle: {
      ingresos: secciones.ciclo.ingresos,
      gasto: secciones.ciclo.gasto,
      delMes: secciones.ciclo.delMes,
      nomina: secciones.ciclo.nomina,
      margenReal: secciones.ciclo.margenReal,
      base: secciones.ciclo.base,
    },
    kpis: {
      ingresos: secciones.ciclo.ingresos,
      gasto: secciones.ciclo.gasto,
      inversion: secciones.inversion.agregado,
      inversionCoverage: secciones.inversion.cobertura,
      deuda: secciones.deudaNoHipotecaria.total,
    },
    counts: {
      saldos: secciones.saldos.items.length,
      pendientes: secciones.pendientes.items.length,
    },
  };
}

type InicioOverview = ReturnType<typeof buildInicioOverview>;

function GraphiteHero({
  overview,
  go,
}: {
  overview: InicioOverview;
  go: (path: string) => void;
}) {
  const { liquidity, cycle } = overview;
  return (
    <section
      className="graphite-control"
      data-inicio-section="hero"
      aria-labelledby="graphite-control-title"
    >
      <h2 id="graphite-control-title" className="sr-only">
        Control del ciclo
      </h2>
      <div className="graphite-control-cell graphite-control-liquidity">
        <p className="graphite-kicker">Liquidez disponible</p>
        <div className="graphite-hero-amount">
          <Amount
            value={liquidity.valor}
            subtotal={liquidity.subtotal ?? null}
            state={liquidity.estado}
            unit={liquidity.unidad}
            showNote={false}
          />
        </div>
        <p className="graphite-control-meta">
          <EstadoBadge estado={liquidity.estado} />
          <span>
            {overview.liquidityIncluded} incluidas ·{" "}
            {overview.liquidityExcluded} excluidas
          </span>
        </p>
        <p className="graphite-control-note">
          {coverageText(liquidity.cobertura)}
        </p>
      </div>

      <div className="graphite-control-cell">
        <p className="graphite-kicker">Gasto y plan</p>
        <div className="graphite-plan-pair">
          <div className="graphite-plan-item">
            <span>Gasto bruto</span>
            <Amount
              value={cycle.gasto.valor}
              subtotal={cycle.gasto.subtotal ?? null}
              state={cycle.gasto.estado}
              unit={cycle.gasto.unidad}
              showNote={false}
            />
            <EstadoBadge estado={cycle.gasto.estado} />
          </div>
          <div className="graphite-plan-item">
            <span>Del mes planificado</span>
            <Amount
              value={cycle.delMes.valor}
              subtotal={cycle.delMes.subtotal ?? null}
              state={cycle.delMes.estado}
              unit={cycle.delMes.unidad}
              showNote={false}
            />
            <EstadoBadge estado={cycle.delMes.estado} />
          </div>
        </div>
        <p className="graphite-control-note">
          Lecturas publicadas por separado; sin porcentaje derivado.
        </p>
      </div>

      <div className="graphite-control-cell">
        <p className="graphite-kicker">Margen del plan frente a nómina</p>
        <div className="graphite-hero-amount graphite-hero-margin">
          <Amount
            value={cycle.margenReal.valor}
            subtotal={cycle.margenReal.subtotal ?? null}
            state={cycle.margenReal.estado}
            unit={cycle.margenReal.unidad}
            showNote={false}
          />
        </div>
        <p className="graphite-control-meta">
          <EstadoBadge estado={cycle.margenReal.estado} />
          <span>No es ahorro ejecutado ni margen estructural</span>
        </p>
        <dl className="graphite-facts">
          <div>
            <dt>Ingresos</dt>
            <dd>
              <Amount
                value={cycle.ingresos.valor}
                subtotal={cycle.ingresos.subtotal ?? null}
                state={cycle.ingresos.estado}
                unit={cycle.ingresos.unidad}
                showNote={false}
              />
            </dd>
          </div>
          <div>
            <dt>Gasto bruto</dt>
            <dd>
              <Amount
                value={cycle.gasto.valor}
                subtotal={cycle.gasto.subtotal ?? null}
                state={cycle.gasto.estado}
                unit={cycle.gasto.unidad}
                showNote={false}
              />
            </dd>
          </div>
          <div>
            <dt>Nómina</dt>
            <dd>
              <Amount
                value={cycle.nomina.valor}
                subtotal={cycle.nomina.subtotal ?? null}
                state={cycle.nomina.estado}
                unit={cycle.nomina.unidad}
                showNote={false}
              />
            </dd>
          </div>
        </dl>
        <p className="graphite-control-link">
          <InicioLink enlace={cycle.ingresos.enlace} go={go}>
            Ver flujo mensual
          </InicioLink>
        </p>
      </div>
    </section>
  );
}

function GraphiteKpis({ overview }: { overview: InicioOverview }) {
  const inversion = overview.kpis.inversion;
  const inversionState: EstadoMetrica = inversion
    ? estadoDesdeCobertura(inversion.coberturaValoracion)
    : "No disponible";
  return (
    <section
      className="graphite-kpis"
      data-inicio-section="kpis"
      aria-label="Indicadores del ciclo"
    >
      <article className="graphite-kpi">
        <p className="graphite-kicker">Ingresos del ciclo</p>
        <div className="graphite-kpi-value">
          <Amount
            value={overview.kpis.ingresos.valor}
            subtotal={overview.kpis.ingresos.subtotal ?? null}
            state={overview.kpis.ingresos.estado}
            unit={overview.kpis.ingresos.unidad}
            showNote={false}
          />
        </div>
        <p className="graphite-kpi-meta">
          <EstadoBadge estado={overview.kpis.ingresos.estado} />
          <span>{coverageText(overview.kpis.ingresos.cobertura)}</span>
        </p>
      </article>

      <article className="graphite-kpi">
        <p className="graphite-kicker">Gasto bruto</p>
        <div className="graphite-kpi-value">
          <Amount
            value={overview.kpis.gasto.valor}
            subtotal={overview.kpis.gasto.subtotal ?? null}
            state={overview.kpis.gasto.estado}
            unit={overview.kpis.gasto.unidad}
            showNote={false}
          />
        </div>
        <p className="graphite-kpi-meta">
          <EstadoBadge estado={overview.kpis.gasto.estado} />
          <span>{coverageText(overview.kpis.gasto.cobertura)}</span>
        </p>
      </article>

      <article className="graphite-kpi">
        <p className="graphite-kicker">Inversión valorada</p>
        <div className="graphite-kpi-value">
          <Amount
            value={inversion?.valorEur ?? null}
            state={inversionState}
            showNote={false}
          />
        </div>
        <p className="graphite-kpi-meta">
          <EstadoBadge estado={inversionState} />
          <span>{coverageText(overview.kpis.inversionCoverage)}</span>
        </p>
      </article>

      <article className="graphite-kpi">
        <p className="graphite-kicker">Deuda no hipotecaria</p>
        <div className="graphite-kpi-value">
          <Amount
            value={overview.kpis.deuda.valor}
            subtotal={overview.kpis.deuda.subtotal ?? null}
            state={overview.kpis.deuda.estado}
            showNote={false}
          />
        </div>
        <p className="graphite-kpi-meta">
          <EstadoBadge estado={overview.kpis.deuda.estado} />
          <span>{coverageText(overview.kpis.deuda.cobertura)}</span>
        </p>
      </article>
    </section>
  );
}

export function Inicio({
  go,
  theme,
}: {
  go: (path: string) => void;
  theme?: ThemeId;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState({ status: "loading" });
    api<ResumenInicio>("/resumen-inicio")
      .then((data) => {
        if (current) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!current) return;
        const apiError = error instanceof ApiError ? error : null;
        setState({
          status: "error",
          message:
            apiError?.message ?? "No se pudo cargar el resumen de inicio.",
          expired: apiError?.status === 401,
        });
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  if (state.status === "loading")
    return (
      <div className="inicio-page">
        <PageHead
          eyebrow="RESUMEN FINANCIERO · SOLO LECTURA"
          title="Inicio"
          description="Componiendo cifras publicadas por sus motores…"
        />
        <Skeleton label="Cargando el resumen de inicio" />
      </div>
    );

  if (state.status === "error")
    return (
      <div className="inicio-page">
        <PageHead
          eyebrow="RESUMEN FINANCIERO · SOLO LECTURA"
          title="Inicio"
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
  const { contexto, secciones } = data;
  const { ciclo } = contexto;
  const liquidez = secciones.liquidez;
  const objetivo = secciones.objetivo;
  const cicloSeccion = secciones.ciclo;
  const saldos = secciones.saldos;
  const ahorro = secciones.ahorro;
  const inversion = secciones.inversion;
  const deuda = secciones.deudaNoHipotecaria;
  const pendientes = secciones.pendientes;
  const overview = buildInicioOverview(secciones);
  const coste = objetivo.costeEsencialMensual;
  const costeMotivos = motivosSinDuplicar(coste.cobertura.motivos, coste.motivo);
  const costeEstadoValor: EstadoMetrica =
    coste.valor !== null
      ? "Verificado"
      : coste.subtotal !== null
        ? "Parcial"
        : "No disponible";

  return (
    <div className={`inicio-page${theme === "casa" ? " inicio-casa" : ""}`}>
      <PageHead
        eyebrow="RESUMEN FINANCIERO · SOLO LECTURA"
        title="Inicio"
        description="Cada cifra conserva su motor, su contexto y su cobertura. No hay sumas cruzadas ni totales nuevos."
      >
        <a
          className="secondary inicio-jump"
          href="#inicio-cobertura"
          onClick={(event) => {
            event.preventDefault();
            document
              .getElementById("inicio-cobertura")
              ?.scrollIntoView({ block: "start" });
          }}
        >
          Cómo se calcula y qué falta
        </a>
        {ciclo && (
          <a
            className="secondary inicio-jump"
            href={`/cierre?ciclo=${ciclo.id}`}
            onClick={(event) => {
              event.preventDefault();
              go(`/cierre?ciclo=${ciclo.id}`);
            }}
          >
            Ver cierre del ciclo
          </a>
        )}
      </PageHead>

      {theme === "graphite-lime" && (
        <>
          <GraphiteHero overview={overview} go={go} />
          <GraphiteKpis overview={overview} />
        </>
      )}

      {theme === "casa" && (
        <section className="casa-cover" aria-labelledby="casa-cover-title">
          <div className="casa-cover-head">
            <p className="casa-cover-kicker">
              Casa de cuentas · {ciclo ? `Ciclo ${ciclo.id}` : "Sin ciclo actual"}
            </p>
            <p className="casa-cover-date">
              {ciclo
                ? `${formatDate(ciclo.inicio)} — ${ciclo.fin ? formatDate(ciclo.fin) : "Abierto"}`
                : "Referencia actual sin ciclo"}
            </p>
          </div>
          <div className="casa-cover-main">
            <div className="casa-cover-amount-block">
              <h2 id="casa-cover-title">Liquidez disponible</h2>
              <p className="casa-cover-amount">
                <Amount
                  value={overview.liquidity.valor}
                  subtotal={overview.liquidity.subtotal ?? null}
                  state={overview.liquidity.estado}
                  unit={overview.liquidity.unidad ?? "EUR"}
                  showNote={false}
                />
              </p>
              <p className="casa-cover-meta">
                <EstadoBadge estado={overview.liquidity.estado} />
                <span>{coverageText(overview.liquidity.cobertura)}</span>
              </p>
            </div>
            <div className="casa-cover-aside">
              <p className="casa-cover-aside-label">Posición del ciclo</p>
              <dl className="casa-cover-counts">
                <div>
                  <dt>Saldos listados</dt>
                  <dd>{overview.counts.saldos}</dd>
                </div>
                <div>
                  <dt>Pendientes visibles</dt>
                  <dd>{overview.counts.pendientes}</dd>
                </div>
                <div className="casa-cover-coverage">
                  <dt>Cobertura</dt>
                  <dd>{overview.liquidity.cobertura.estado}</dd>
                </div>
              </dl>
              <div className="casa-cover-actions">
                <a
                  className="casa-cover-primary"
                  href="/movimientos/nuevo"
                  onClick={(event) => {
                    event.preventDefault();
                    go("/movimientos/nuevo");
                  }}
                >
                  Registrar movimiento
                </a>
                <a
                  className="casa-cover-secondary"
                  href="/movimientos"
                  onClick={(event) => {
                    event.preventDefault();
                    go("/movimientos");
                  }}
                >
                  Ver Movimientos
                </a>
              </div>
            </div>
          </div>
          <p className="casa-cover-note">
            No es un total patrimonial. Cada cifra conserva su motor y su
            cobertura; las posiciones sin información se muestran como ND.
          </p>
        </section>
      )}

      <section
        className="panel inicio-context"
        aria-labelledby="inicio-contexto"
      >
        <div className="inicio-context-head">
          <div>
            <p className="eyebrow">CONTEXTO</p>
            <h2 id="inicio-contexto">
              {ciclo ? `Ciclo ${ciclo.id}` : "Sin ciclo actual"}
            </h2>
          </div>
          <span className="inicio-readonly">Solo lectura</span>
        </div>
        {ciclo ? (
          <dl className="inicio-context-facts">
            <div>
              <dt>Inicio</dt>
              <dd>{formatDate(ciclo.inicio)}</dd>
            </div>
            <div>
              <dt>Fin</dt>
              <dd>{ciclo.fin ? formatDate(ciclo.fin) : "Abierto"}</dd>
            </div>
            <div>
              <dt>Corte</dt>
              <dd>{formatDate(ciclo.corte)}</dd>
            </div>
            <div>
              <dt>Mes financiado</dt>
              <dd>{formatMonth(ciclo.mesFinanciado)}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                {ciclo.estadoTemporal} · corte {ciclo.estadoCorte}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="inicio-motivo">
            No hay un ciclo actual verificable. Las cifras ligadas al ciclo se
            muestran No disponible; liquidez, Saldos y deuda actuales conservan
            su propio contexto.
          </p>
        )}
        <p className="inicio-context-ref">
          Referencia financiera: <strong>{formatDate(contexto.referencia.fecha)}</strong>{" "}
          · {contexto.referencia.estado}
        </p>
        {contexto.referencia.cobertura.length > 0 && (
          <ul className="inicio-ref-coverage">
            {contexto.referencia.cobertura.map((item) => (
              <li key={item.source}>
                <span>{item.source}</span> · {item.state}
                {item.maxDate ? ` · ${formatDate(item.maxDate)}` : ""}
              </li>
            ))}
          </ul>
        )}
        <p className="inicio-context-meta">
          Consulta {contexto.consulta} · Revisión {contexto.revision}
        </p>
      </section>

      <div className="inicio-grid-2">
        <section className="panel inicio-section" aria-labelledby="inicio-liquidez">
          <h2 id="inicio-liquidez">Liquidez</h2>
          <MetricCard
            metrica={liquidez.metrica}
            go={go}
            enlaceTexto="Ver Saldos"
          />
          <details className="inicio-detail">
            <summary>Ver posiciones incluidas y excluidas</summary>
            <div className="inicio-detail-grid">
              <div>
                <h4>Incluidas ({liquidez.incluidos.length})</h4>
                {liquidez.incluidos.length === 0 ? (
                  <p className="muted">Sin posiciones incluidas.</p>
                ) : (
                  <ul>
                    {liquidez.incluidos.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`/saldos/${item.id}`}
                          onClick={(event) => {
                            event.preventDefault();
                            go(`/saldos/${item.id}`);
                          }}
                        >
                          {item.id}
                        </a>{" "}
                        {item.nombre ?? "Saldo sin nombre"} ·{" "}
                        {item.valor === null
                          ? "ND"
                          : formatDecimal(item.valor, "EUR")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4>Excluidas ({liquidez.excluidos.length})</h4>
                {liquidez.excluidos.length === 0 ? (
                  <p className="muted">Sin posiciones excluidas.</p>
                ) : (
                  <ul>
                    {liquidez.excluidos.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`/saldos/${item.id}`}
                          onClick={(event) => {
                            event.preventDefault();
                            go(`/saldos/${item.id}`);
                          }}
                        >
                          {item.id}
                        </a>{" "}
                        · {item.motivo}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </details>
        </section>

        <section className="panel inicio-section" aria-labelledby="inicio-objetivo">
          <h2 id="inicio-objetivo">Objetivo R6</h2>
          <Metric
            title="Coste esencial mensual"
            clase="OBJETIVO"
            dataClase="objetivo"
            ariaLabel="Objetivo R6"
            className="inicio-metric inicio-objetivo"
            amount={
              <Amount
                value={coste.valor}
                subtotal={coste.subtotal}
                state={costeEstadoValor}
                unit="EUR"
              />
            }
            badge={<CoberturaBadge valor={coste.cobertura.estado} />}
          >
            <p className="inicio-metric-meta">
              Ejercicio {objetivo.costeEsencialMensual.ejercicio ?? "—"} ·
              origen {objetivo.costeEsencialMensual.ejercicioOrigen} ·
              equivalente {objetivo.costeEsencialMensual.estadoEquivalente}
            </p>
            <p className="inicio-metric-motivo">{coste.motivo}</p>
            <p className="inicio-metric-meta">
              Cobertura {coste.cobertura.estado}
              {coste.cobertura.importesSinInformar !== null
                ? ` · ${coste.cobertura.importesSinInformar} importes esenciales sin informar`
                : ""}
              {coste.cobertura.clasificacionesPendientes !== null
                ? ` · ${coste.cobertura.clasificacionesPendientes} clasificaciones pendientes`
                : ""}
            </p>
            {costeMotivos.length > 0 && (
              <ul className="inicio-metric-coverage">
                {costeMotivos.map((motivo) => (
                  <li key={motivo}>{motivo}</li>
                ))}
              </ul>
            )}
            {coste.cobertura.fuenteMotivo &&
              coste.cobertura.fuenteMotivo !== coste.motivo &&
              !costeMotivos.includes(coste.cobertura.fuenteMotivo) && (
                <p className="inicio-metric-motivo">
                  {coste.cobertura.fuenteMotivo}
                </p>
              )}
            <dl className="inicio-objetivo-facts">
              <div>
                <dt>Meses objetivo</dt>
                <dd>
                  {objetivo.mesesObjetivo === null
                    ? "No configurados"
                    : `${objetivo.mesesObjetivo} meses`}
                </dd>
              </div>
            </dl>
            <div className="inicio-submetric">
              <h4>Mínimo objetivo</h4>
              <div className="inicio-metric-main">
                <Amount
                  value={objetivo.metrica.valor}
                  subtotal={objetivo.metrica.subtotal ?? null}
                  state={objetivo.metrica.estado}
                  unit={objetivo.metrica.unidad}
                />
                <EstadoBadge estado={objetivo.metrica.estado} />
              </div>
              <p className="inicio-metric-meta">
                {coverageText(objetivo.metrica.cobertura)}
              </p>
              <p className="inicio-metric-motivo">{objetivo.metrica.motivo}</p>
              <FuenteLinea
                fuente={objetivo.metrica.fuente}
                contexto={objetivo.metrica.contexto}
              />
            </div>
            <div className="inicio-submetric">
              <h4>Meses cubiertos</h4>
              <div className="inicio-metric-main">
                <Amount
                  value={objetivo.mesesCubiertos.valor}
                  subtotal={objetivo.mesesCubiertos.subtotal ?? null}
                  state={objetivo.mesesCubiertos.estado}
                  unit={objetivo.mesesCubiertos.unidad}
                />
                <EstadoBadge estado={objetivo.mesesCubiertos.estado} />
              </div>
              <p className="inicio-metric-meta">
                {coverageText(objetivo.mesesCubiertos.cobertura)}
              </p>
              <p className="inicio-metric-motivo">
                {objetivo.mesesCubiertos.motivo}
              </p>
              <FuenteLinea
                fuente={objetivo.mesesCubiertos.fuente}
                contexto={objetivo.mesesCubiertos.contexto}
              />
            </div>
            <p className="inicio-zona">
              Zona {objetivo.zona.toLowerCase()} · sin transferencias ni
              reservas automáticas.
            </p>
            <FuenteLinea
              fuente={objetivo.costeEsencialMensual.fuente}
              contexto={objetivo.costeEsencialMensual.contexto}
            />
            <p className="inicio-linkrow">
              <InicioLink enlace={objetivo.metrica.enlace} go={go}>
                Ver coste esencial
              </InicioLink>
            </p>
          </Metric>
        </section>
      </div>

      <section className="panel inicio-section" aria-labelledby="inicio-ciclo">
        <h2 id="inicio-ciclo">
          {ciclo ? `Ciclo ${ciclo.id} · REAL vs PLAN` : "Ciclo · REAL vs PLAN"}
        </h2>
        <div className="inicio-metric-grid">
          {[
            cicloSeccion.ingresos,
            cicloSeccion.gasto,
            cicloSeccion.extraordinaria,
            cicloSeccion.nomina,
            cicloSeccion.operativo,
            cicloSeccion.margenReal,
            cicloSeccion.base,
            cicloSeccion.delMes,
          ].map((metrica) => (
            <MetricCard
              key={metrica.clave}
              metrica={metrica}
              go={go}
              showLink={false}
            />
          ))}
        </div>
        {cicloSeccion.ingresos.enlace !== null && (
          <p className="inicio-linkrow">
            <InicioLink enlace={cicloSeccion.ingresos.enlace} go={go}>
              Ver flujo mensual
            </InicioLink>
          </p>
        )}
        <p className="inicio-note">
          El saldo operativo y el margen se publican tal como los entrega E2.6.
          Un subtotal parcial no se convierte en total, no se fabrica un margen
          y no se resta la deuda ni los pendientes.
        </p>
      </section>

      <div className="inicio-grid-4">
        <section className="panel inicio-section" aria-labelledby="inicio-saldos">
          <h2 id="inicio-saldos">Saldos y bolsas</h2>
          <dl className="inicio-counts">
            <div>
              <dt>Liquidez</dt>
              <dd>{saldos.conteos.liquidez}</dd>
            </div>
            <div>
              <dt>Ahorro</dt>
              <dd>{saldos.conteos.ahorro}</dd>
            </div>
            <div>
              <dt>Bolsas</dt>
              <dd>{saldos.conteos.bolsas}</dd>
            </div>
          </dl>
          <p className="inicio-metric-meta">
            {saldos.items.length} Saldos · cobertura{" "}
            {coverageText(saldos.cobertura)}
          </p>
          <p className="inicio-note">
            Sin total de Saldos ni suma entre vistas: un Saldo puede pertenecer
            a varias.
          </p>
          <details className="inicio-detail">
            <summary>Ver Saldos y su pertenencia</summary>
            <ul className="inicio-item-list">
              {saldos.items.map((item) => (
                <li key={item.id}>
                  <a
                    href={`/saldos/${item.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      go(`/saldos/${item.id}`);
                    }}
                  >
                    {item.id} · {item.nombre}
                  </a>
                  <span className="inicio-item-meta">
                    {item.estado} · liquidez{" "}
                    {item.liquidez === null
                      ? "sin informar"
                      : item.liquidez
                        ? "Sí"
                        : "No"}{" "}
                    · finalidad {item.finalidad ?? "—"} · bolsa{" "}
                    {item.bolsa === null
                      ? "sin informar"
                      : item.bolsa
                        ? "Sí"
                        : "No"}{" "}
                    · posición {item.condicion}
                  </span>
                  {item.posicion === null && item.motivo && (
                    <span className="inicio-item-meta">
                      Motivo: {item.motivo}
                    </span>
                  )}
                  <span className="inicio-item-value">
                    {item.posicion === null
                      ? "ND"
                      : formatDecimal(item.posicion, "EUR")}
                  </span>
                </li>
              ))}
            </ul>
          </details>
          {saldos.cobertura.motivos.length > 0 && (
            <details className="inicio-detail">
              <summary>Ver motivos de cobertura</summary>
              <ul>
                {saldos.cobertura.motivos.map((motivo) => (
                  <li key={motivo}>{motivo}</li>
                ))}
              </ul>
            </details>
          )}
          <FuenteLinea fuente={saldos.fuente} contexto={saldos.contexto} />
          <p className="inicio-linkrow">
            <InicioLink enlace={saldos.enlace} go={go}>
              Ver Saldos
            </InicioLink>
          </p>
        </section>

        <section className="panel inicio-section" aria-labelledby="inicio-ahorro">
          <h2 id="inicio-ahorro">Ahorro</h2>
          <h3>Posiciones con Finalidad Ahorro</h3>
          {ahorro.posiciones.length === 0 ? (
            <p className="muted">Sin Saldos activos con Finalidad Ahorro.</p>
          ) : (
            <ul className="inicio-item-list">
              {ahorro.posiciones.map((item) => (
                <li key={item.id}>
                  <a
                    href={`/saldos/${item.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      go(`/saldos/${item.id}`);
                    }}
                  >
                    {item.id} · {item.nombre}
                  </a>
                  <span className="inicio-item-meta">
                    {item.estado} · posición {item.condicion}
                    {item.valor === null && item.motivo
                      ? ` · ${item.motivo}`
                      : ""}
                  </span>
                  <span className="inicio-item-value">
                    {item.valor === null
                      ? "ND"
                      : formatDecimal(item.valor, "EUR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <dl className="inicio-nd-list">
            <div>
              <dt>Ahorro de cierre</dt>
              <dd>
                {ahorro.ahorroCierre.valor === null
                  ? "ND"
                  : formatDecimal(ahorro.ahorroCierre.valor, "EUR")}{" "}
                <EstadoBadge
                  estado={ahorro.ahorroCierre.estado as EstadoMetrica}
                />
                <small>{ahorro.ahorroCierre.motivo}</small>
                <small>
                  Fuente: {ahorro.ahorroCierre.fuente.motor}
                  {ahorro.ahorroCierre.fuente.ids.length > 0
                    ? ` · ${ahorro.ahorroCierre.fuente.ids.join(", ")}`
                    : ""}
                  {" · "}Cobertura:{" "}
                  {ahorro.ahorroCierre.cobertura ?? "sin cobertura publicada"}
                </small>
              </dd>
            </div>
            <div>
              <dt>Variación de ahorro</dt>
              <dd>
                {ahorro.variacionAhorro.valor === null
                  ? "ND"
                  : formatDecimal(ahorro.variacionAhorro.valor, "EUR")}{" "}
                <EstadoBadge
                  estado={ahorro.variacionAhorro.estado as EstadoMetrica}
                />
                <small>{ahorro.variacionAhorro.motivo}</small>
                <small>
                  Fuente: {ahorro.variacionAhorro.fuente.motor}
                  {ahorro.variacionAhorro.fuente.ids.length > 0
                    ? ` · ${ahorro.variacionAhorro.fuente.ids.join(", ")}`
                    : ""}
                  {" · "}Cobertura:{" "}
                  {ahorro.variacionAhorro.cobertura ??
                    "sin cobertura publicada"}
                </small>
              </dd>
            </div>
          </dl>
          <p className="inicio-note">
            No se publica un total nuevo de ahorro ni se confunde con la
            ejecución del Presupuesto de Ahorro.
          </p>
          <FuenteLinea fuente={ahorro.fuente} contexto={ahorro.contexto} />
          <p className="inicio-linkrow">
            <InicioLink enlace={ahorro.enlace} go={go}>
              Ver Saldos
            </InicioLink>
          </p>
        </section>

        <section
          className="panel inicio-section"
          aria-labelledby="inicio-inversion"
        >
          <h2 id="inicio-inversion">Inversión</h2>
          {inversion.agregado === null ? (
            <p className="inicio-motivo">Inversión No disponible.</p>
          ) : (
            <dl className="inicio-objetivo-facts">
              <div>
                <dt>Posiciones valoradas</dt>
                <dd>
                  {inversion.agregado.valorEur === null
                    ? "ND"
                    : formatDecimal(inversion.agregado.valorEur, "EUR")}{" "}
                  <CoberturaBadge
                    valor={inversion.agregado.coberturaValoracion}
                  />
                  {/^Parcial/i.test(
                    inversion.agregado.coberturaValoracion,
                  ) && (
                    <small className="inicio-value-note">
                      {inversion.agregado.coberturaValoracion}
                    </small>
                  )}
                </dd>
              </div>
              <div>
                <dt>Resultado</dt>
                <dd>
                  {inversion.agregado.resultadoEur === null
                    ? "ND"
                    : formatDecimal(inversion.agregado.resultadoEur, "EUR")}{" "}
                  <CoberturaBadge
                    valor={inversion.agregado.coberturaResultado}
                  />
                  {/^Parcial/i.test(
                    inversion.agregado.coberturaResultado,
                  ) && (
                    <small className="inicio-value-note">
                      {inversion.agregado.coberturaResultado}
                    </small>
                  )}
                </dd>
              </div>
            </dl>
          )}
          <p className="inicio-metric-meta">
            Cobertura: {coverageText(inversion.cobertura)}
          </p>
          {inversion.cobertura.motivos.length > 0 && (
            <ul className="inicio-metric-coverage">
              {inversion.cobertura.motivos.map((motivo) => (
                <li key={motivo}>{motivo}</li>
              ))}
            </ul>
          )}
          {inversion.posiciones.length > 0 && (
            <details className="inicio-detail">
              <summary>Ver posiciones</summary>
              <ul className="inicio-item-list">
                {inversion.posiciones.map((item) => (
                  <li key={item.instrumento}>
                    <span>
                      {item.instrumento} · {item.nombre}
                    </span>
                    <span className="inicio-item-meta">
                      {item.cantidad} · {item.estado} ·{" "}
                      {item.tipoValoracion}
                      {item.valoracionCobertura
                        ? ` · cobertura ${item.valoracionCobertura}`
                        : ""}
                      {item.valoracionMotivo
                        ? ` · ${item.valoracionMotivo}`
                        : ""}
                      {item.elegibilidadFechaExacta
                        ? ` · ${item.elegibilidadFechaExacta}`
                        : ""}
                      {item.resultadoMotivo
                        ? ` · ${item.resultadoMotivo}`
                        : ""}
                    </span>
                    <span className="inicio-item-value">
                      {item.valorEur === null
                        ? "ND"
                        : formatDecimal(item.valorEur, "EUR")}{" "}
                      · resultado{" "}
                      {item.resultadoEur === null
                        ? "ND"
                        : formatDecimal(item.resultadoEur, "EUR")}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <h3>Efectivo del bróker</h3>
          {inversion.efectivo.length === 0 ? (
            <p className="muted">Sin efectivo del bróker al corte.</p>
          ) : (
            <ul className="inicio-item-list">
              {inversion.efectivo.map((item) => (
                <li key={item.saldo}>
                  <a
                    href={`/saldos/${item.saldo}`}
                    onClick={(event) => {
                      event.preventDefault();
                      go(`/saldos/${item.saldo}`);
                    }}
                  >
                    {item.saldo} · {item.nombre}
                  </a>
                  <span className="inicio-item-meta">
                    {formatDate(item.fecha)}
                  </span>
                  <span className="inicio-item-value">
                    {formatDecimal(item.disponible, "EUR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="inicio-note">
            Sin total combinado: el efectivo no se suma al agregado de
            posiciones.
          </p>
          <FuenteLinea fuente={inversion.fuente} contexto={inversion.contexto} />
          <p className="inicio-linkrow">
            <InicioLink enlace={inversion.enlace} go={go}>
              Ver Inversión
            </InicioLink>
          </p>
        </section>

        <section className="panel inicio-section" aria-labelledby="inicio-deuda">
          <h2 id="inicio-deuda">Deuda</h2>
          <Metric
            title="Deuda no hipotecaria"
            clase="POSICIÓN"
            dataClase="posicion"
            ariaLabel="Deuda no hipotecaria"
            className="inicio-metric inicio-deuda-total"
            amount={
              <Amount
                value={deuda.total.valor}
                subtotal={deuda.total.subtotal}
                state={deuda.total.estado}
                unit="EUR"
              />
            }
            badge={
              <EstadoBadge
                estado={deuda.total.estado}
                label={etiquetaParcial(
                  deuda.total.estado,
                  deuda.total.motivo,
                  deuda.total.cobertura,
                )}
              />
            }
          >
            <p className="inicio-metric-meta">
              {coverageText(deuda.total.cobertura)} · calculables
            </p>
            <p className="inicio-metric-motivo">{deuda.total.motivo}</p>
            <FuenteLinea
              fuente={deuda.total.fuente}
              contexto={deuda.contexto}
            />
          </Metric>
          {deuda.total.estado === "No disponible" && (
            <p className="inicio-motivo">
              Bloque no disponible por fallo de fuente; no se presenta como un
              vacío real.
            </p>
          )}
          {deuda.total.estado !== "No disponible" &&
            deuda.items.length === 0 && (
              <p className="muted">Sin deudas no hipotecarias activas.</p>
            )}
          {deuda.items.length > 0 && (
            <ul className="inicio-item-list">
              {deuda.items.map((item) => (
                <li key={item.id}>
                  <a
                    href={`/deudas/${item.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      go(`/deudas/${item.id}`);
                    }}
                  >
                    {item.id} · {item.nombre}
                  </a>
                  <span className="inicio-item-meta">
                    {item.estado} ·{" "}
                    {item.calculable ? "calculable" : "no calculable"}
                    {item.motivo ? ` · ${item.motivo}` : ""}
                  </span>
                  <span className="inicio-item-value">
                    {item.capitalPendiente === null
                      ? "ND"
                      : formatDecimal(item.capitalPendiente, "EUR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {(deuda.aparte.hipotecaria.length > 0 ||
            deuda.aparte.sinInformar.length > 0) && (
            <div className="inicio-aparte">
              <h3>Se muestran aparte, fuera del total</h3>
              {deuda.aparte.hipotecaria.length > 0 && (
                <p>
                  Hipotecaria:{" "}
                  {deuda.aparte.hipotecaria
                    .map((item) =>
                      item.capitalPendiente === null
                        ? `${item.id} ND${
                            item.motivo ? ` (${item.motivo})` : ""
                          }`
                        : `${item.id} ${formatDecimal(
                            item.capitalPendiente,
                            "EUR",
                          )} · ${item.estado}`,
                    )
                    .join(" · ")}
                </p>
              )}
              {deuda.aparte.sinInformar.length > 0 && (
                <p>
                  Sin informar:{" "}
                  {deuda.aparte.sinInformar
                    .map((item) =>
                      item.capitalPendiente === null
                        ? `${item.id} ND${
                            item.motivo ? ` (${item.motivo})` : ""
                          }`
                        : `${item.id} ${formatDecimal(
                            item.capitalPendiente,
                            "EUR",
                          )} · ${item.estado}`,
                    )
                    .join(" · ")}
                </p>
              )}
            </div>
          )}
          <FuenteLinea
            fuente={deuda.fuente}
            contexto={deuda.contexto}
            etiqueta="Fuente del bloque (incluye deudas fuera del total)"
          />
          <p className="inicio-linkrow">
            <InicioLink enlace={deuda.enlace} go={go}>
              Ver Deudas
            </InicioLink>
          </p>
        </section>
      </div>

      <section
        className="panel inicio-section"
        aria-labelledby="inicio-pendientes"
      >
        <div className="inicio-section-head">
          <h2 id="inicio-pendientes">Pendientes</h2>
          {pendientes.fuenteFallos.length > 0 ? (
            <EstadoBadge
              estado="Parcial"
              label="PARCIAL · FUENTES CON FALLO"
            />
          ) : (
            <EstadoBadge estado={pendientes.metrica.estado} />
          )}
        </div>
        <p className="inicio-metric-motivo">{pendientes.metrica.motivo}</p>
        {pendientes.fuenteFallos.length > 0 && (
          <div className="inicio-degradado" role="status">
            <strong>Estado degradado:</strong> hay fuentes de E3.6 no
            verificables; el bloque no se presenta como vacío ni como conteo
            cero.
            <ul className="inicio-metric-coverage">
              {pendientes.fuenteFallos.map((fallo) => (
                <li key={`${fallo.motor}-${fallo.id ?? ""}-${fallo.motivo}`}>
                  {fallo.motor}
                  {fallo.id ? ` ${fallo.id}` : ""}: {fallo.motivo}
                </li>
              ))}
            </ul>
          </div>
        )}
        {pendientes.conteo !== null &&
          Object.keys(pendientes.conteo).length > 0 && (
            <>
              <p className="inicio-metric-meta">
                {pendientes.fuenteFallos.length > 0
                  ? "Conteo parcial"
                  : "Conteo por estado"}
              </p>
              <dl className="inicio-counts">
                {Object.entries(pendientes.conteo).map(([estado, count]) => (
                  <div key={estado}>
                    <dt>{estado}</dt>
                    <dd>{count}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        {pendientes.items.length === 0 &&
        pendientes.fuenteFallos.length === 0 ? (
          <p className="muted">
            {pendientes.metrica.estado === "Sin datos"
              ? "Sin pendientes."
              : "Sin pendientes verificables; no se publica un conteo 0."}
          </p>
        ) : pendientes.items.length === 0 ? null : (
          <ul className="inicio-item-list">
            {pendientes.items.slice(0, 12).map((item) => {
              const enlace = item.enlaces[0];
              return (
                <li key={item.claveEfimera}>
                  <span>
                    {enlace ? (
                      <a
                        href={enlace.href}
                        onClick={(event) => {
                          event.preventDefault();
                          go(enlace.href);
                        }}
                      >
                        {item.tipo} · {item.fuente.id}
                      </a>
                    ) : (
                      `${item.tipo} · ${item.fuente.id}`
                    )}
                  </span>
                  <span className="inicio-item-meta">
                    {item.estado} · {item.cobertura}
                    {item.motivo ? ` · ${item.motivo}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="inicio-note">
          Sin total monetario ni ajuste del flujo: pendientes no se suman a
          ingresos, gasto u operativo.
        </p>
        <FuenteLinea
          fuente={pendientes.metrica.fuente}
          contexto={pendientes.metrica.contexto}
        />
        {pendientes.metrica.enlace !== null && (
          <p className="inicio-linkrow">
            <InicioLink enlace={pendientes.metrica.enlace} go={go}>
              Ver Pendientes
            </InicioLink>
          </p>
        )}
      </section>

      <section
        className="panel inicio-section inicio-cobertura"
        id="inicio-cobertura"
        aria-labelledby="inicio-cobertura-title"
      >
        <h2 id="inicio-cobertura-title">Cobertura del modelo</h2>
        <h3>Motores y estado</h3>
        <ul className="inicio-coverage-list">
          <li>Contexto · E1.3 cycleContext</li>
          <li>Liquidez y ciclo · {liquidez.metrica.fuente.motor}</li>
          <li>Coste esencial · {objetivo.costeEsencialMensual.fuente.motor}</li>
          <li>Saldos · {saldos.fuente.motor}</li>
          <li>Ahorro · {ahorro.fuente.motor}</li>
          <li>Inversión · {inversion.fuente.motor}</li>
          <li>Deuda · {deuda.fuente.motor}</li>
          <li>Pendientes · {pendientes.metrica.fuente.motor}</li>
        </ul>
        <h3>Qué falta y por qué</h3>
        {data.pendientesDelModelo.length === 0 ? (
          <p className="muted">Sin limitaciones declaradas por el API.</p>
        ) : (
          <ul className="inicio-coverage-list">
            {data.pendientesDelModelo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        {contexto.motivos.length > 0 && (
          <>
            <h3>Contexto</h3>
            <ul className="inicio-coverage-list">
              {contexto.motivos.map((motivo) => (
                <li key={motivo}>{motivo}</li>
              ))}
            </ul>
          </>
        )}
        {pendientes.fuenteFallos.length > 0 && (
          <>
            <h3>Fuentes parciales de Pendientes</h3>
            <ul className="inicio-coverage-list">
              {pendientes.fuenteFallos.map((fallo) => (
                <li key={`${fallo.motor}-${fallo.id ?? ""}-${fallo.motivo}`}>
                  {fallo.motor}
                  {fallo.id ? ` ${fallo.id}` : ""}: {fallo.motivo}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="inicio-context-meta">
          Revisión de la composición: {contexto.revision}
        </p>
      </section>

      <p className="page-foot">
        Solo lectura · Sin cálculos financieros en el navegador · Sin total
        patrimonial ni sumas cruzadas.
      </p>
    </div>
  );
}
