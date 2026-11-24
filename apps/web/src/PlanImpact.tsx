import { aplicaColumna, rotuloEjecutado, textoValor } from "./devolucion-rotulos";
type Result = {
  presupuesto: { nombre: string; fuente?: string };
  ejecutado: string | null;
  pendiente: string | null;
  estado: string | null;
  motivo: string | null;
};
export type PlanImpactData = {
  coverage: string;
  ciclos: {
    ciclo: string;
    diferencias: { presupuesto: string; antes: Result; despues: Result }[];
  }[];
};
export function PlanImpact({
  impact,
}: {
  impact: PlanImpactData | null | undefined;
}) {
  if (!impact) return null;
  const value = (n: string | null, fuente?: string) =>
    textoValor(n, aplicaColumna("ejecucion", fuente));
  return (
    <section aria-label="Impacto en planes del ciclo">
      <h3>Impacto en planes del ciclo</h3>
      <p>{impact.coverage}</p>
      {impact.ciclos.length === 0 && (
        <p className="muted">
          Sin diferencias de ejecución por ciclo identificadas.
        </p>
      )}
      {impact.ciclos.length ? (
        impact.ciclos.map((c) => (
          <div key={c.ciclo}>
            <h4>Ciclo {c.ciclo}</h4>
            {c.diferencias.map((d) => (
              <div className="panel" key={d.presupuesto}>
                <p>
                  {d.antes.presupuesto.nombre} · {d.presupuesto}
                </p>
                <p>
                  Ejecutado
                  {rotuloEjecutado(d.antes.presupuesto.fuente)
                    ? ` (${rotuloEjecutado(d.antes.presupuesto.fuente)})`
                    : ""}
                  : {value(d.antes.ejecutado, d.antes.presupuesto.fuente)} →{" "}
                  {value(d.despues.ejecutado, d.despues.presupuesto.fuente)}
                </p>
                <p>
                  Pendiente: {value(d.antes.pendiente, d.antes.presupuesto.fuente)} →{" "}
                  {value(d.despues.pendiente, d.despues.presupuesto.fuente)}
                </p>
                <p>
                  Estado: {d.antes.estado ?? "—"} → {d.despues.estado ?? "—"}
                </p>
                {(d.antes.motivo || d.despues.motivo) && (
                  <p>
                    {d.antes.motivo ?? "Verificable"} →{" "}
                    {d.despues.motivo ?? "Verificable"}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))
      ) : (
        <p>Sin resultados de planes afectados.</p>
      )}
    </section>
  );
}
