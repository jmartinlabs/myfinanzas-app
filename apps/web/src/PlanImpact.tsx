import { eur } from "./api";
type Result = {
  presupuesto: { nombre: string };
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
  const value = (n: string | null) => (n === null ? "—" : eur(n));
  return (
    <section aria-label="Impacto en planes del ciclo">
      <h3>Impacto en planes del ciclo</h3>
      <p>{impact.coverage}</p>
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
                  Ejecutado: {value(d.antes.ejecutado)} →{" "}
                  {value(d.despues.ejecutado)}
                </p>
                <p>
                  Pendiente: {value(d.antes.pendiente)} →{" "}
                  {value(d.despues.pendiente)}
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
