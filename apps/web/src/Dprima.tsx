import { useEffect, useRef, useState } from "react";
import { api, eur, ApiError } from "./api";
import { Alert, PageHead, Tag } from "./ui";

type Cycle = {
  id: string;
  inicio: string;
  mesFinanciado: string;
  fin: string | null;
  corte: string | null;
};
type Partida = {
  id: string;
  nombre: string;
  estado: string;
  padrePartida: string | null;
  fuente: string | null;
  hijas?: Partida[];
};
type Line = {
  id: string;
  hija: string;
  importe: string | null;
  fecha: string | null;
  esencial: boolean;
  anulada: boolean;
};
type Plan = {
  id: string;
  padre: string;
  saldo: string;
  mesInicial: string;
  mesFinal: string;
  saldoInicial: string;
  saldoEvidencia: string;
  estado: string;
  revision: number;
  lineas?: Line[];
};
type Preview = {
  T: string | null;
  subtotal: string;
  G: { bruto: string; devoluciones: string; neto: string | null; parcial: boolean };
  S: string | null;
  P: string | null;
  N: number | null;
  fuente: string;
  sugerida: string | null;
  motivos: string[];
  fingerprint: string;
  lineas: { pendientes: string[]; excluidas: { linea: string; motivo: string }[] };
};
type Mensual = {
  ciclo: Cycle;
  items: {
    raiz: string;
    nombre: string;
    fuente: string;
    destino: string | null;
    base: string | null;
    esencial: string | null;
    delMes: string | null;
    bruto: string | null;
    devoluciones: string | null;
    ejecutado: string | null;
    pendiente: string | null;
    estado: string;
    motivo: string | null;
    revision: number;
  }[];
  nota: string;
};
type Mapping = {
  propuestas: {
    presupuesto: string | null;
    partida: string | null;
    relacion: string;
    motivo: string;
    requiereDecision: boolean;
    candidatas?: string[];
    deuda?: string | null;
  }[];
  anual: { ejercicio: number; partida: string; importe: string }[];
  confirmadas: unknown[];
  fingerprint: string;
};

const date = (v: string) => v.split("-").reverse().join("/");
const month = (v: string) => v.slice(0, 7);
const amount = (v: string | null) => (v === null ? "No disponible" : eur(v));

export function Dprima({ go }: { go: (p: string) => void }) {
  const [partidas, setPartidas] = useState<{ raices: Partida[] } | null>(null),
    [plans, setPlans] = useState<Plan[]>([]),
    [mapping, setMapping] = useState<Mapping | null>(null),
    [cycles, setCycles] = useState<Cycle[]>([]),
    [selected, setSelected] = useState<Plan | null>(null),
    [mensual, setMensual] = useState<Mensual | null>(null),
    [cycleId, setCycleId] = useState(""),
    [preview, setPreview] = useState<Preview | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [reload, setReload] = useState(0);
  const alert = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    Promise.all([
      api<{ raices: Partida[] }>("/dprima/partidas"),
      api<{ planificaciones: Plan[] }>("/dprima/planificaciones"),
      api<Mapping>("/dprima/mapping"),
      api<{ ciclos: Cycle[] }>("/ciclos?estado="),
    ])
      .then(([p, l, m, c]) => {
        if (!live) return;
        setPartidas(p);
        setPlans(l.planificaciones);
        setMapping(m);
        setCycles(c.ciclos);
        if (!cycleId && c.ciclos[0]) setCycleId(c.ciclos[0].id);
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [reload]);

  useEffect(() => {
    let live = true;
    setMensual(null);
    if (!cycleId) return;
    api<Mensual>("/dprima/mensual/" + cycleId)
      .then((m) => live && setMensual(m))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [cycleId, reload]);

  async function call(
    path: string,
    body: Record<string, unknown>,
  ): Promise<any | null> {
    try {
      const result = await api(path, "POST", body, {
        "idempotency-key": crypto.randomUUID(),
      });
      setNotice("Operación registrada.");
      setReload((n) => n + 1);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar.");
      requestAnimationFrame(() => alert.current?.focus());
      return null;
    }
  }

  async function openPlan(id: string) {
    try {
      const full = await api<{ planificacion: Plan; lineas: Line[] }>(
        "/dprima/planificaciones/" + id,
      );
      setSelected({ ...full.planificacion, lineas: full.lineas });
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
    }
  }

  return (
    <>
      <PageHead
        eyebrow="D′ · PARTIDAS Y PREVISIÓN"
        title="Planificación simplificada"
        description="Maestro de Partidas con raíces e hijas, Gastos Previstos y apertura. Presupuestos y Plan Anual se conservan como histórico consultable; nada se migra automáticamente."
      >
        <button type="button" className="secondary" onClick={() => go("/presupuestos")}>
          Ver Presupuestos legado
        </button>
        <button type="button" className="secondary" onClick={() => go("/plan-anual")}>
          Ver Plan Anual legado
        </button>
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

      <section className="panel" aria-label="Maestro de Partidas">
        <h2>Maestro de Partidas</h2>
        <p className="muted">
          La jerarquía raíz/hija es independiente de Categoría/Subcategoría. Si
          una raíz tiene hijas, los Gastos nuevos van a las hijas; la raíz
          agrupa y financia.
        </p>
        {!partidas ? (
          <p role="status">Cargando Partidas…</p>
        ) : (
          <>
            <table className="table">
              <caption className="muted">
                {partidas.raices.length} raíces
              </caption>
              <thead>
                <tr>
                  <th>ID / Nombre</th>
                  <th>Padre</th>
                  <th>Fuente</th>
                  <th>Estado</th>
                  <th>Hijas</th>
                </tr>
              </thead>
              <tbody>
                {partidas.raices.map((r) => (
                  <PartidaRows key={r.id} root={r} />
                ))}
              </tbody>
            </table>
            <PartidaConfigForm
              partidas={partidas.raices}
              onPreview={async (id, cambios) => {
                try {
                  return await api(
                    `/dprima/partidas/${id}/impacto`,
                    "POST",
                    { cambios, motivo: "Revisión de configuración D′" },
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : "No se pudo revisar.");
                  return null;
                }
              }}
              onConfirm={(id, cambios, fingerprint) =>
                call(`/dprima/partidas/${id}/confirmar`, {
                  cambios,
                  motivo: "Configuración D′ revisada",
                  fingerprint,
                })
              }
            />
          </>
        )}
      </section>

      <section className="panel" aria-label="Gastos Previstos">
        <h2>Gastos Previstos</h2>
        <p className="muted">
          Etiquetas de mes financiado y líneas por hija. Los importes son
          previsiones, no hechos. Un rango no se solapa con otro del mismo padre.
        </p>
        <PlanCreateForm
          partidas={partidas?.raices ?? []}
          onCreate={(body) => call("/dprima/planificaciones", body)}
        />
        {plans.length === 0 ? (
          <p>Sin planificaciones.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Raíz</th>
                <th>Rango</th>
                <th>Estado</th>
                <th>Líneas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.padre}</td>
                  <td>
                    {month(p.mesInicial)} → {month(p.mesFinal)}
                  </td>
                  <td>{p.estado}</td>
                  <td>
                    {typeof p.lineas === "number"
                      ? p.lineas
                      : (p.lineas?.length ?? 0)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => openPlan(p.id)}
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {selected && (
          <PlanDetail
            plan={selected}
            root={partidas?.raices.find((r) => r.id === selected.padre)}
            cycles={cycles}
            preview={preview}
            onClose={() => {
              setSelected(null);
              setPreview(null);
            }}
            onSaveLines={async (cambios, motivo) => {
              const p = await api(
                `/dprima/planificaciones/${selected.id}/lineas/impacto`,
                "POST",
                { revision: selected.revision, cambios, motivo },
              );
              return call(
                `/dprima/planificaciones/${selected.id}/lineas/confirmar`,
                {
                  revision: selected.revision,
                  cambios,
                  motivo,
                  fingerprint: p.fingerprint,
                },
              );
            }}
            onPreviewApertura={async (ciclo, exclusiones) => {
              try {
                const p = await api<Preview>(
                  `/dprima/planificaciones/${selected.id}/apertura/impacto`,
                  "POST",
                  { ciclo, exclusiones },
                );
                setPreview(p);
                return p;
              } catch (e) {
                setError(e instanceof Error ? e.message : "No se pudo prever.");
                return null;
              }
            }}
            onConfirmApertura={(ciclo, exclusiones, fingerprint, importe) =>
              call(`/dprima/planificaciones/${selected.id}/apertura/confirmar`, {
                ciclo,
                exclusiones,
                fingerprint,
                importe,
                motivo: "Apertura D′ revisada",
              })
            }
          />
        )}
      </section>

      <section className="panel" aria-label="Plan Mensual D′">
        <h2>Plan Mensual por raíz</h2>
        <select
          aria-label="Ciclo del plan mensual"
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
        >
          <option value="">Selecciona un ciclo</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {date(c.inicio)} → {c.fin ? date(c.fin) : "abierto"}
            </option>
          ))}
        </select>
        {mensual ? (
          <>
            <p className="muted">{mensual.nota}</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Raíz</th>
                  <th>Fuente</th>
                  <th>Destino</th>
                  <th>Base</th>
                  <th>Esencial</th>
                  <th>Del mes</th>
                  <th>Bruto</th>
                  <th>Devoluciones</th>
                  <th>Ejecutado</th>
                  <th>Pendiente</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {mensual.items.map((i) => (
                  <MensualRow
                    key={i.raiz}
                    item={i}
                    onSave={(body) => call("/dprima/mensual/" + cycleId, body)}
                  />
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p role="status">Cargando plan mensual…</p>
        )}
      </section>

      <section className="panel" aria-label="Mapping de Presupuestos">
        <h2>Mapping Presupuestos → Partidas</h2>
        <p className="muted">
          Propuesta de diagnóstico. Un Presupuesto con varias Partidas exige una
          raíz explícita; no se reparte su objetivo. No se crean hijas,
          importes ni correspondencias por nombre.
        </p>
        {!mapping ? (
          <p role="status">Cargando mapping…</p>
        ) : (
          <>
            <ul>
              {mapping.propuestas.map((p, index) => (
                <li key={index}>
                  <strong>{p.presupuesto ?? "—"}</strong> · {p.relacion} ·{" "}
                  {p.partida ?? "Sin Partida"}
                  <small> {p.motivo}</small>
                </li>
              ))}
            </ul>
            <MappingConfirm
              mapping={mapping}
              onConfirm={(propuestas) =>
                call("/dprima/mapping/confirmar", {
                  propuestas,
                  motivo: "Mapping D′ revisado",
                  fingerprint: mapping.fingerprint,
                })
              }
            />
            <p className="muted">
              {mapping.confirmadas.length} correspondencias confirmadas ·{" "}
              {mapping.anual.length} líneas anuales conservadas como histórico.
            </p>
          </>
        )}
      </section>
    </>
  );
}

function PartidaRows({ root }: { root: Partida }) {
  return (
    <>
      <tr>
        <td>
          {root.id} · {root.nombre}
          <small className="table-id">Raíz</small>
        </td>
        <td>—</td>
        <td>{root.fuente ?? "Sin informar"}</td>
        <td>{root.estado}</td>
        <td>{root.hijas?.length ?? 0}</td>
      </tr>
      {(root.hijas ?? []).map((h) => (
        <tr key={h.id}>
          <td>
            {h.id} · {h.nombre}
            <small className="table-id">Hija</small>
          </td>
          <td>{root.id}</td>
          <td>—</td>
          <td>{h.estado}</td>
          <td>—</td>
        </tr>
      ))}
    </>
  );
}

function PartidaConfigForm({
  partidas,
  onPreview,
  onConfirm,
}: {
  partidas: Partida[];
  onPreview: (
    id: string,
    cambios: Record<string, unknown>,
  ) => Promise<any | null>;
  onConfirm: (
    id: string,
    cambios: Record<string, unknown>,
    fingerprint: string,
  ) => void;
}) {
  const [id, setId] = useState(""),
    [parent, setParent] = useState(""),
    [fuente, setFuente] = useState(""),
    [impact, setImpact] = useState<any | null>(null);
  return (
    <form
      className="saldo-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const cambios: Record<string, unknown> = {};
        if (parent !== "") cambios.padrePartida = parent === "-" ? null : parent;
        if (fuente !== "") cambios.fuente = fuente === "-" ? null : fuente;
        const p = await onPreview(id, cambios);
        setImpact(p);
      }}
    >
      <h3>Configurar jerarquía y fuente</h3>
      <div className="form-grid">
        <label>
          Partida
          <select value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Selecciona</option>
            {partidas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Padre planificación
          <select value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">Sin cambio</option>
            <option value="-">Ninguno (raíz)</option>
            {partidas
              .filter((r) => r.id !== id)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.nombre}
                </option>
              ))}
          </select>
        </label>
        <label>
          Fuente ejecutado
          <select value={fuente} onChange={(e) => setFuente(e.target.value)}>
            <option value="">Sin cambio</option>
            <option value="Gasto real">Gasto real</option>
            <option value="Aportación a saldo">Aportación a saldo</option>
            <option value="No aplica">No aplica histórico</option>
            <option value="-">Sin informar</option>
          </select>
        </label>
      </div>
      <div className="actions">
        <button type="submit" disabled={!id}>
          Revisar impacto
        </button>
        {impact && (
          <button
            type="button"
            disabled={!impact.fingerprint || impact.bloqueos.length > 0}
            onClick={() =>
              onConfirm(id, impact.despues, impact.fingerprint)
            }
          >
            Confirmar configuración
          </button>
        )}
      </div>
      {impact && (
        <p className="muted">
          {impact.bloqueos.length
            ? impact.bloqueos.join(" ")
            : "Sin bloqueos; los cambios afectan ciclos abiertos/futuros."}
        </p>
      )}
    </form>
  );
}

function PlanCreateForm({
  partidas,
  onCreate,
}: {
  partidas: Partida[];
  onCreate: (body: Record<string, unknown>) => void;
}) {
  const [padre, setPadre] = useState(""),
    [saldo, setSaldo] = useState(""),
    [mesInicial, setMesInicial] = useState(""),
    [mesFinal, setMesFinal] = useState(""),
    [saldoInicial, setSaldoInicial] = useState(""),
    [saldoEvidencia, setSaldoEvidencia] = useState(""),
    [saldos, setSaldos] = useState<{ id: string; nombre: string }[]>([]);
  useEffect(() => {
    api<{ saldos: { id: string; nombre: string }[] }>("/comida/opciones")
      .then((o) => setSaldos(o.saldos))
      .catch(() => setSaldos([]));
  }, []);
  return (
    <form
      className="saldo-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onCreate({
          padre,
          saldo,
          mesInicial,
          mesFinal,
          saldoInicial,
          saldoEvidencia,
          copiarHijas: true,
        });
      }}
    >
      <h3>Nueva planificación prevista</h3>
      <div className="form-grid">
        <label>
          Raíz
          <select value={padre} onChange={(e) => setPadre(e.target.value)}>
            <option value="">Selecciona una raíz</option>
            {partidas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Saldo exclusivo
          <select value={saldo} onChange={(e) => setSaldo(e.target.value)}>
            <option value="">Selecciona</option>
            {saldos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mes financiado inicial
          <input
            type="month"
            value={mesInicial}
            onChange={(e) => setMesInicial(e.target.value + "-01")}
          />
        </label>
        <label>
          Mes financiado final
          <input
            type="month"
            value={mesFinal}
            onChange={(e) => setMesFinal(e.target.value + "-01")}
          />
        </label>
        <label>
          Saldo inicial confirmado
          <input
            inputMode="decimal"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
          />
        </label>
        <label>
          Evidencia del saldo
          <input
            value={saldoEvidencia}
            onChange={(e) => setSaldoEvidencia(e.target.value)}
          />
        </label>
      </div>
      <div className="actions">
        <button
          type="submit"
          disabled={!padre || !saldo || !mesInicial || !mesFinal || !saldoEvidencia}
        >
          Crear planificación
        </button>
      </div>
    </form>
  );
}

function PlanDetail({
  plan,
  root,
  cycles,
  preview,
  onClose,
  onSaveLines,
  onPreviewApertura,
  onConfirmApertura,
}: {
  plan: Plan;
  root?: Partida;
  cycles: Cycle[];
  preview: Preview | null;
  onClose: () => void;
  onSaveLines: (cambios: Record<string, unknown>[], motivo: string) => void;
  onPreviewApertura: (
    ciclo: string,
    exclusiones: string[],
  ) => Promise<Preview | null>;
  onConfirmApertura: (
    ciclo: string,
    exclusiones: string[],
    fingerprint: string,
    importe: string | null,
  ) => void;
}) {
  const [values, setValues] = useState<Record<string, Record<string, string>>>(
    Object.fromEntries(
      (plan.lineas ?? []).map((l) => [
        l.id,
        {
          importe: l.importe ?? "",
          fecha: l.fecha ?? "",
          esencial: l.esencial ? "Sí" : "No",
        },
      ]),
    ),
  );
  const [motivo, setMotivo] = useState(""),
    [cycle, setCycle] = useState(""),
    [exclusions, setExclusions] = useState<string[]>([]),
    [importe, setImporte] = useState(""),
    [extra, setExtra] = useState<
      { hija: string; importe: string; fecha: string; esencial: boolean }[]
    >([]),
    [newHija, setNewHija] = useState("");
  return (
    <section className="panel" aria-label="Detalle de planificación">
      <h2>
        {plan.id} · {plan.padre}
      </h2>
      <p className="muted">
        {month(plan.mesInicial)} → {month(plan.mesFinal)} · Estado {plan.estado} ·
        Revisión {plan.revision} · Saldo inicial confirmado{" "}
        {eur(plan.saldoInicial)}
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Línea</th>
            <th>Hija</th>
            <th>Importe previsto</th>
            <th>Fecha opcional</th>
            <th>Esencial</th>
            <th>Anulada</th>
          </tr>
        </thead>
        <tbody>
          {(plan.lineas ?? []).map((l) => (
            <tr key={l.id}>
              <td>{l.id}</td>
              <td>{l.hija}</td>
              <td>
                <input
                  aria-label={"Importe " + l.id}
                  inputMode="decimal"
                  value={values[l.id]?.importe ?? ""}
                  disabled={l.anulada}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [l.id]: { ...v[l.id], importe: e.target.value },
                    }))
                  }
                />
              </td>
              <td>
                <input
                  aria-label={"Fecha " + l.id}
                  type="date"
                  value={values[l.id]?.fecha ?? ""}
                  disabled={l.anulada}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [l.id]: { ...v[l.id], fecha: e.target.value },
                    }))
                  }
                />
              </td>
              <td>
                <select
                  aria-label={"Esencial " + l.id}
                  value={values[l.id]?.esencial ?? "No"}
                  disabled={l.anulada}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [l.id]: { ...v[l.id], esencial: e.target.value },
                    }))
                  }
                >
                  <option>Sí</option>
                  <option>No</option>
                </select>
              </td>
              <td>{l.anulada ? "Sí" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {root && (
        <div className="form-grid">
          <label>
            Añadir línea
            <select value={newHija} onChange={(e) => setNewHija(e.target.value)}>
              <option value="">Selecciona hija o raíz simple</option>
              {[root, ...(root.hijas ?? [])].map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} · {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Acción
            <button
              type="button"
              className="secondary"
              disabled={!newHija}
              onClick={() => {
                setExtra((v) => [
                  ...v,
                  { hija: newHija, importe: "", fecha: "", esencial: false },
                ]);
                setNewHija("");
              }}
            >
              Añadir línea manual
            </button>
          </label>
        </div>
      )}
      {extra.length > 0 && (
        <p className="muted">
          Líneas nuevas: {extra.map((e) => e.hija).join(", ")}
        </p>
      )}
      <div className="form-grid">
        <label>
          Motivo de las líneas
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </label>
      </div>
      <div className="actions">
        <button
          type="button"
          disabled={!motivo}
          onClick={() =>
            onSaveLines(
              [
                ...(plan.lineas ?? [])
                  .filter((l) => !l.anulada)
                  .map((l) => ({
                    id: l.id,
                    importe: values[l.id]?.importe || null,
                    fecha: values[l.id]?.fecha || null,
                    esencial: values[l.id]?.esencial === "Sí",
                  })),
                ...extra.map((e) => ({
                  hija: e.hija,
                  importe: e.importe || null,
                  fecha: e.fecha || null,
                  esencial: e.esencial,
                })),
              ],
              motivo,
            )
          }
        >
          Guardar líneas
        </button>
        <button type="button" className="secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <h3>Revisión de apertura</h3>
      <div className="form-grid">
        <label>
          Ciclo real
          <select value={cycle} onChange={(e) => setCycle(e.target.value)}>
            <option value="">Selecciona un ciclo</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {date(c.inicio)} · financiado {month(c.mesFinanciado)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Importe a incorporar (opcional)
          <input
            inputMode="decimal"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
          />
        </label>
      </div>
      <div className="actions">
        <button
          type="button"
          disabled={!cycle}
          onClick={async () => {
            const p = await onPreviewApertura(cycle, exclusions);
            if (p) setImporte(p.sugerida ?? "");
          }}
        >
          Revisar apertura
        </button>
        {preview && (
          <button
            type="button"
            onClick={() =>
              onConfirmApertura(
                cycle,
                exclusions,
                preview.fingerprint,
                importe || null,
              )
            }
          >
            Confirmar propuesta
          </button>
        )}
      </div>
      {preview && (
        <div>
          <dl className="metrics">
            <div className="metric">
              <dt>Total previsto T</dt>
              <dd>{amount(preview.T)}</dd>
            </div>
            <div className="metric">
              <dt>Subtotal conocido</dt>
              <dd>{eur(preview.subtotal)}</dd>
            </div>
            <div className="metric">
              <dt>G neto</dt>
              <dd>
                {amount(preview.G.neto)} · bruto {eur(preview.G.bruto)} ·
                devoluciones {eur(preview.G.devoluciones)}
              </dd>
            </div>
            <div className="metric">
              <dt>S al corte</dt>
              <dd>{amount(preview.S)}</dd>
            </div>
            <div className="metric">
              <dt>Pendiente P / Restantes N</dt>
              <dd>
                {amount(preview.P)} / {preview.N ?? "No aplica"}
              </dd>
            </div>
            <div className="metric">
              <dt>Sugerida</dt>
              <dd>{amount(preview.sugerida)}</dd>
            </div>
          </dl>
          <p>
            Fuente: <strong>{preview.fuente}</strong> ·{" "}
            {preview.N === 0 ? "Sin división" : ""}
          </p>
          {preview.motivos.length > 0 && (
            <ul className="muted">
              {preview.motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          {preview.lineas.pendientes.length > 0 && (
            <p className="muted">
              Líneas sin importe: {preview.lineas.pendientes.join(", ")}. Excluir
              una línea es una decisión manual auditada.
              {preview.lineas.pendientes.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="secondary"
                  onClick={() => setExclusions((v) => [...v, id])}
                >
                  Excluir {id}
                </button>
              ))}
            </p>
          )}
          {exclusions.length > 0 && (
            <p className="muted">Excluidas: {exclusions.join(", ")}</p>
          )}
        </div>
      )}
    </section>
  );
}

function MensualRow({
  item,
  onSave,
}: {
  item: Mensual["items"][number];
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState({
    base: item.base ?? "",
    esencial: item.esencial ?? "",
    delMes: item.delMes ?? "",
    destino: item.destino ?? "",
  });
  return (
    <tr>
      <td>
        {item.raiz} · {item.nombre}
      </td>
      <td>{item.fuente}</td>
      <td>
        <input
          aria-label={"Destino " + item.raiz}
          value={values.destino}
          onChange={(e) => setValues((v) => ({ ...v, destino: e.target.value }))}
        />
      </td>
      {(["base", "esencial", "delMes"] as const).map((field) => (
        <td key={field}>
          <input
            aria-label={field + " " + item.raiz}
            inputMode="decimal"
            value={values[field]}
            onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
          />
        </td>
      ))}
      <td>{amount(item.bruto)}</td>
      <td>{amount(item.devoluciones)}</td>
      <td>{amount(item.ejecutado)}</td>
      <td>{amount(item.pendiente)}</td>
      <td>
        <Tag inactive={item.estado === "No disponible"}>{item.estado}</Tag>
        {item.motivo && <small>{item.motivo}</small>}
      </td>
      <td>
        <button
          type="button"
          className="secondary"
          onClick={() =>
            onSave({
              raiz: item.raiz,
              fuente: item.fuente,
              destino: values.destino || null,
              base: values.base || null,
              esencial: values.esencial || null,
              delMes: values.delMes || null,
              revision: item.revision,
            })
          }
        >
          Guardar
        </button>
      </td>
    </tr>
  );
}

function MappingConfirm({
  mapping,
  onConfirm,
}: {
  mapping: Mapping;
  onConfirm: (propuestas: Record<string, unknown>[]) => void;
}) {
  const pending = mapping.propuestas.filter(
    (p) => p.relacion === "Raíz" || p.relacion === "Hija",
  );
  return (
    <div>
      <p className="muted">
        Confirmar una correspondencia guarda el mapping explícito; no cambia
        Partidas, Presupuestos, Deuda ni líneas anuales.
      </p>
      {pending.map((p, index) =>
        p.partida ? (
          <button
            key={index}
            type="button"
            className="secondary"
            onClick={() =>
              onConfirm([
                {
                  presupuesto: p.presupuesto,
                  partida: p.partida,
                  relacion: p.relacion,
                  motivo: "Correspondencia revisada explícitamente",
                },
              ])
            }
          >
            Confirmar {p.presupuesto ?? "—"} → {p.partida}
          </button>
        ) : (
          <p key={index} className="muted">
            {p.presupuesto}: varias Partidas; elige raíz explícita antes de confirmar.
          </p>
        ),
      )}
    </div>
  );
}
