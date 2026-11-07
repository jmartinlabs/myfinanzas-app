/**
 * Panel de versiones consultables de la foto de ciclo.
 */

import type { VersionFotoDto } from "../types";
import { VersionesTable } from "./tables";

export function VersionesPanel({
  versiones,
  version,
  versionesCargando,
  onSelectVersion,
}: {
  versiones: VersionFotoDto[] | null;
  version: string;
  versionesCargando: boolean;
  onSelectVersion: (version: string) => void;
}) {
  return (
    <section className="panel" aria-label="Versiones consultables de la foto">
      <h2>Versiones consultables</h2>
      <p className="muted">
        Todas las versiones persisten y siguen consultables. Ninguna se
        poda ni se reetiqueta.
      </p>
      {versiones && versiones.length > 0 ? (
        <VersionesTable
          versiones={versiones}
          seleccionada={version}
          onSelect={onSelectVersion}
        />
      ) : versionesCargando ? (
        <p role="status">Cargando versiones…</p>
      ) : (
        <p className="muted">
          Sin versiones persistidas para este ciclo.
        </p>
      )}
    </section>
  );
}
