import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { Alert, PageHead } from "./ui";

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
  capitalPendiente: string | null;
  calculable: boolean;
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
  motivo?: string | null;
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
      ahorroCierre: { estado: string; valor: string | null; motivo: string };
      variacionAhorro: { estado: string; valor: string | null; motivo: string };
      ahorroResidual: { estado: string; valor: string | null; motivo: string };
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
  Verificado: { icon: "✓", label: "VERIFICADO", tone: "ok" },
  "Cero verificado": { icon: "✓", label: "CERO VERIFICADO", tone: "ok" },
  Parcial: { icon: "!", label: "PARCIAL", tone: "partial" },
  "No disponible": { icon: "—", label: "NO DISPONIBLE", tone: "nd" },
  "No aplica": { icon: "—", label: "NO APLICA", tone: "nd" },
  "Sin datos": { icon: "○", label: "SIN DATOS", tone: "nd" },
};

const CLASE_META: Record<string, string> = {
  real: "REAL",
  plan: "PLAN",
  posicion: "POSICIÓN",
  objetivo: "OBJETIVO",
  informativo: "INFORMATIVO",
};

/** Formatea una cadena decimal exacta sin convertirla a número. */
function formatDecimal(value: string, unidad: "EUR" | "meses" | null) {
  const negative = value.startsWith("-");
  const raw = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = raw.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = fraction.padEnd(2, "0").slice(0, 2);
  const text = `${grouped},${decimals}`;
  const signed = negative ? `−${text}` : text;
  return unidad === "meses" ? `${signed} meses` : `${signed} €`;
}

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

/** Traduce el estado textual de cobertura de E4.3 a un tono semántico. */
function coverageTone(value: string) {
  if (/^(Completa|Verificada)$/i.test(value)) return "ok";
  if (/^Parcial/i.test(value)) return "partial";
  return "nd";
}

function EstadoBadge({ estado }: { estado: EstadoMetrica }) {
  const meta = ESTADO_META[estado];
  return (
    <span
      className={`inicio-estado inicio-estado-${meta.tone}`}
      data-estado={estado}
    >
      <span aria-hidden="true">{meta.icon}</span> {meta.label}
    </span>
  );
}

function MetricValue({ metrica }: { metrica: Metrica }) {
  if (metrica.estado === "No disponible") {
    return (
      <span className="inicio-value-wrap">
        <span className="inicio-value inicio-value-nd">ND</span>
        {metrica.subtotal != null && (
          <small className="inicio-value-note">
            Subtotal conocido{" "}
            {formatDecimal(metrica.subtotal, metrica.unidad)}
          </small>
        )}
      </span>
    );
  }
  if (metrica.estado === "No aplica")
    return <span className="inicio-value inicio-value-nd">No aplica</span>;
  if (metrica.estado === "Sin datos")
    return <span className="inicio-value inicio-value-nd">Sin datos</span>;
  const shown = metrica.valor ?? metrica.subtotal ?? null;
  if (shown === null)
    return <span className="inicio-value inicio-value-nd">ND</span>;
  const isSubtotal = metrica.valor === null;
  return (
    <span className="inicio-value-wrap">
      {isSubtotal && (
        <small className="inicio-value-note">Subtotal conocido</small>
      )}
      <span className="inicio-value">
        {formatDecimal(shown, metrica.unidad)}
      </span>
    </span>
  );
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
}: {
  fuente: Fuente;
  contexto: Contexto;
}) {
  return (
    <p className="inicio-source">
      Fuente: <strong>{fuente.motor}</strong>
      {fuente.ids.length > 0 && (
        <>
          {" · "}IDs: <span>{fuente.ids.join(", ")}</span>
        </>
      )}
      {" · "}Contexto: {contextText(contexto)}
    </p>
  );
}

function MetricCard({
  metrica,
  go,
  enlaceTexto,
  children,
}: {
  metrica: Metrica;
  go: (path: string) => void;
  enlaceTexto?: string;
  children?: React.ReactNode;
}) {
  return (
    <article
      className="inicio-metric"
      data-clase={metrica.clase}
      aria-label={metrica.etiqueta}
    >
      <div className="inicio-metric-head">
        <h3>{metrica.etiqueta}</h3>
        <span className="inicio-clase">
          {CLASE_META[metrica.clase] ?? metrica.clase}
        </span>
      </div>
      <div className="inicio-metric-main">
        <MetricValue metrica={metrica} />
        <EstadoBadge estado={metrica.estado} />
      </div>
      <p className="inicio-metric-meta">{coverageText(metrica.cobertura)}</p>
      {metrica.cobertura.motivos.length > 0 && (
        <ul className="inicio-metric-coverage">
          {metrica.cobertura.motivos.map((motivo) => (
            <li key={motivo}>{motivo}</li>
          ))}
        </ul>
      )}
      <p className="inicio-metric-motivo">{metrica.motivo}</p>
      <FuenteLinea fuente={metrica.fuente} contexto={metrica.contexto} />
      {children}
      {metrica.enlace !== null && (
        <p className="inicio-linkrow">
          <InicioLink enlace={metrica.enlace} go={go}>
            {enlaceTexto ?? "Ver origen"}
          </InicioLink>
        </p>
      )}
    </article>
  );
}

export function Inicio({ go }: { go: (path: string) => void }) {
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
        <div
          className="inicio-skeleton"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="inicio-skeleton-line" />
          <span className="inicio-skeleton-line" />
          <span className="inicio-skeleton-line short" />
        </div>
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

  return (
    <div className="inicio-page">
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
      </PageHead>

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
          <article
            className="inicio-metric inicio-objetivo"
            data-clase="objetivo"
            aria-label="Objetivo R6"
          >
            <div className="inicio-metric-head">
              <h3>Coste esencial mensual</h3>
              <span className="inicio-clase">OBJETIVO</span>
            </div>
            <div className="inicio-metric-main">
              <span className="inicio-value-wrap">
                <span className="inicio-value">
                  {objetivo.costeEsencialMensual.valor === null
                    ? "ND"
                    : formatDecimal(
                        objetivo.costeEsencialMensual.valor,
                        "EUR",
                      )}
                </span>
                {objetivo.costeEsencialMensual.valor === null &&
                  objetivo.costeEsencialMensual.subtotal !== null && (
                    <small className="inicio-value-note">
                      Subtotal conocido{" "}
                      {formatDecimal(
                        objetivo.costeEsencialMensual.subtotal,
                        "EUR",
                      )}
                    </small>
                  )}
              </span>
              <span
                className={`inicio-estado ${
                  objetivo.costeEsencialMensual.estado === "Verificado"
                    ? "inicio-estado-ok"
                    : "inicio-estado-nd"
                }`}
              >
                {objetivo.costeEsencialMensual.estado === "Verificado"
                  ? "✓ COMPLETO"
                  : "— NO DISPONIBLE"}
              </span>
            </div>
            <p className="inicio-metric-meta">
              Ejercicio {objetivo.costeEsencialMensual.ejercicio ?? "—"} ·
              origen {objetivo.costeEsencialMensual.ejercicioOrigen} ·
              equivalente {objetivo.costeEsencialMensual.estadoEquivalente}
            </p>
            <p className="inicio-metric-motivo">
              {objetivo.costeEsencialMensual.motivo}
            </p>
            <dl className="inicio-objetivo-facts">
              <div>
                <dt>Meses objetivo</dt>
                <dd>
                  {objetivo.mesesObjetivo === null
                    ? "No configurados"
                    : `${objetivo.mesesObjetivo} meses`}
                </dd>
              </div>
              <div>
                <dt>Mínimo objetivo</dt>
                <dd>
                  <MetricValue metrica={objetivo.metrica} />{" "}
                  <EstadoBadge estado={objetivo.metrica.estado} />
                </dd>
              </div>
              <div>
                <dt>Meses cubiertos</dt>
                <dd>
                  <MetricValue metrica={objetivo.mesesCubiertos} />{" "}
                  <EstadoBadge estado={objetivo.mesesCubiertos.estado} />
                </dd>
              </div>
            </dl>
            <p className="inicio-metric-motivo">
              {objetivo.mesesCubiertos.motivo}
            </p>
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
          </article>
        </section>
      </div>

      <section className="panel inicio-section" aria-labelledby="inicio-ciclo">
        <h2 id="inicio-ciclo">
          {ciclo ? `Ciclo ${ciclo.id} · REAL vs PLAN` : "Ciclo · REAL vs PLAN"}
        </h2>
        {cicloSeccion.motivo && (
          <p className="inicio-motivo">{cicloSeccion.motivo}</p>
        )}
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
              enlaceTexto="Ver flujo mensual"
            />
          ))}
        </div>
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
                        : "No"}
                  </span>
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
                  <span className="inicio-item-meta">{item.estado}</span>
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
                <span className="inicio-estado inicio-estado-nd">
                  {ahorro.ahorroCierre.estado}
                </span>
                <small>{ahorro.ahorroCierre.motivo}</small>
              </dd>
            </div>
            <div>
              <dt>Variación de ahorro</dt>
              <dd>
                {ahorro.variacionAhorro.valor === null
                  ? "ND"
                  : formatDecimal(ahorro.variacionAhorro.valor, "EUR")}{" "}
                <span className="inicio-estado inicio-estado-nd">
                  {ahorro.variacionAhorro.estado}
                </span>
                <small>{ahorro.variacionAhorro.motivo}</small>
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
            <p className="inicio-motivo">
              Inversión No disponible.
              {inversion.cobertura.motivos.length > 0
                ? ` ${inversion.cobertura.motivos.join(" ")}`
                : ""}
            </p>
          ) : (
            <dl className="inicio-objetivo-facts">
              <div>
                <dt>Posiciones valoradas</dt>
                <dd>
                  {inversion.agregado.valorEur === null
                    ? "ND"
                    : formatDecimal(inversion.agregado.valorEur, "EUR")}{" "}
                  <span
                    className={`inicio-estado inicio-estado-${coverageTone(
                      inversion.agregado.coberturaValoracion,
                    )}`}
                  >
                    {inversion.agregado.coberturaValoracion}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Resultado</dt>
                <dd>
                  {inversion.agregado.resultadoEur === null
                    ? "ND"
                    : formatDecimal(inversion.agregado.resultadoEur, "EUR")}{" "}
                  <span
                    className={`inicio-estado inicio-estado-${coverageTone(
                      inversion.agregado.coberturaResultado,
                    )}`}
                  >
                    {inversion.agregado.coberturaResultado}
                  </span>
                </dd>
              </div>
            </dl>
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
          <h2 id="inicio-deuda">Deuda no hipotecaria</h2>
          <article
            className="inicio-metric inicio-deuda-total"
            data-clase="posicion"
            aria-label="Total de deuda no hipotecaria"
          >
            <div className="inicio-metric-head">
              <h3>Total no hipotecario</h3>
              <span className="inicio-clase">POSICIÓN</span>
            </div>
            <div className="inicio-metric-main">
              <MetricValue
                metrica={{
                  ...deuda.total,
                  clave: "deudaNoHipotecaria",
                  etiqueta: "Total no hipotecario",
                  clase: "posicion",
                  unidad: "EUR",
                  fuente: deuda.total.fuente,
                  contexto: deuda.contexto,
                  enlace: deuda.enlace,
                }}
              />
              <EstadoBadge estado={deuda.total.estado} />
            </div>
            <p className="inicio-metric-meta">
              {coverageText(deuda.total.cobertura)} · calculables
            </p>
            <p className="inicio-metric-motivo">{deuda.total.motivo}</p>
          </article>
          {deuda.items.length === 0 ? (
            <p className="muted">Sin deudas no hipotecarias activas.</p>
          ) : (
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
                        ? `${item.id} ND`
                        : `${item.id} ${formatDecimal(
                            item.capitalPendiente,
                            "EUR",
                          )}`,
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
                        ? `${item.id} ND`
                        : `${item.id} ${formatDecimal(
                            item.capitalPendiente,
                            "EUR",
                          )}`,
                    )
                    .join(" · ")}
                </p>
              )}
            </div>
          )}
          <FuenteLinea fuente={deuda.fuente} contexto={deuda.contexto} />
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
          <EstadoBadge estado={pendientes.metrica.estado} />
        </div>
        <p className="inicio-metric-motivo">{pendientes.metrica.motivo}</p>
        {pendientes.conteo !== null &&
          Object.keys(pendientes.conteo).length > 0 && (
            <dl className="inicio-counts">
              {Object.entries(pendientes.conteo).map(([estado, count]) => (
                <div key={estado}>
                  <dt>{estado}</dt>
                  <dd>{count}</dd>
                </div>
              ))}
            </dl>
          )}
        {pendientes.items.length === 0 ? (
          <p className="muted">
            {pendientes.metrica.estado === "Sin datos"
              ? "Sin pendientes."
              : "Sin pendientes verificables; no se publica un conteo 0."}
          </p>
        ) : (
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
