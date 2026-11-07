/**
 * E4.11 I5 — consulta provisional de fotografías.
 *
 * Solo lectura. El cliente consume exclusivamente los contratos publicados de
 * E4.11 (`/fotos/ciclos/:ciclo`, `/versiones`, `/fotos/periodos`, por id y el
 * contraste vivo de I4). No recalcula economía, no suma valores, no convierte
 * una ausencia en 0 y no certifica un total parcial. La foto y el cálculo vivo
 * se muestran siempre separados y etiquetados (`Foto` / `Actual`).
 *
 * DT8 no está aprobada: esta UI es provisional y no declara aceptación visual.
 */

import { useEffect, useState } from "react";
import { CicloPanel } from "./fotos/components/ciclo-panel";
import { PeriodoPanel } from "./fotos/components/periodo-panel";
import type { Modo, Vista } from "./fotos/types";
import { trimestreActual, vistaDesdePath, vistaUrl } from "./fotos/view";
import { Badge, PageHead } from "./ui";

export function Fotos({
  path,
  go,
}: {
  path: string;
  go: (path: string) => void;
}) {
  const [vista, setVista] = useState<Vista>(() => vistaDesdePath(path));

  useEffect(() => {
    setVista(vistaDesdePath(path));
  }, [path]);

  function actualizar(patch: Partial<Vista>, push = false) {
    const siguiente = { ...vista, ...patch };
    setVista(siguiente);
    const url = vistaUrl(siguiente);
    if (push) go(url);
    else history.replaceState(null, "", url);
  }

  function cambiarModo(modo: Modo) {
    if (modo === "ciclo") {
      actualizar({ modo, periodoId: "" });
      return;
    }
    actualizar({
      modo,
      periodoId: "",
      ejercicio: vista.ejercicio || String(new Date().getFullYear()),
      trimestre: vista.trimestre || trimestreActual(),
    });
  }

  const hrefCiclo = (ciclo: string, version?: number | null) =>
    vistaUrl({
      ...vista,
      modo: "ciclo",
      ciclo,
      version: version === null || version === undefined ? "" : String(version),
      periodoId: "",
    });

  function abrirCiclo(ciclo: string, version?: number | null) {
    actualizar(
      {
        modo: "ciclo",
        ciclo,
        version:
          version === null || version === undefined ? "" : String(version),
        periodoId: "",
      },
      true,
    );
  }

  function abrirPeriodoId(id: string) {
    actualizar({ periodoId: id }, true);
  }

  return (
    <section className="fotos-page">
      <PageHead
        eyebrow="E4.11 · FOTOGRAFÍAS INMUTABLES"
        title="Fotografías"
        description="Consulta de solo lectura de fotos de ciclo, trimestre y año. Sin recálculo, sin ceros por ausencia y sin certificar un total parcial."
      >
        <Badge tone="nd" label="UI provisional · DT8 pendiente" />
      </PageHead>

      <div className="fotos-boundary" role="note">
        <Badge tone="info" icon="▣" label="Foto" />
        <p>
          La foto es la fuente histórica. El contraste vivo se etiqueta{" "}
          <Badge tone="info" label="Actual" /> y nunca se suma ni sustituye a la
          foto. No se mezclan fuentes ni se suman orígenes.
        </p>
      </div>

      <section className="panel fotos-context" aria-label="Tipo de consulta">
        <div className="fotos-context-row">
          <label htmlFor="fotos-modo">
            Consultar por
            <select
              id="fotos-modo"
              value={vista.modo}
              onChange={(event) => cambiarModo(event.target.value as Modo)}
            >
              <option value="ciclo">Ciclo</option>
              <option value="Trimestre">Trimestre</option>
              <option value="Anio">Año</option>
            </select>
          </label>
        </div>
        <p className="help fotos-help">
          Solo lectura. No se crean cierres ni agregados desde esta pantalla; la
          creación del agregado P2-A tiene su propia ruta y clave.
        </p>
      </section>

      {vista.modo === "ciclo" ? (
        <CicloPanel
          ciclo={vista.ciclo}
          version={vista.version}
          onSelectCiclo={(ciclo) =>
            actualizar({ modo: "ciclo", ciclo, version: "" })
          }
          onSelectVersion={(version) => actualizar({ version })}
          go={go}
        />
      ) : (
        <PeriodoPanel
          modo={vista.modo}
          periodoId={vista.periodoId}
          ejercicio={vista.ejercicio}
          trimestre={vista.trimestre}
          versionAgregado={vista.versionAgregado}
          onCommit={(patch) => actualizar(patch)}
          onAbrirId={abrirPeriodoId}
          onAbrirCiclo={abrirCiclo}
          hrefCiclo={hrefCiclo}
          hrefPeriodoId={(id) =>
            vistaUrl({ ...vista, periodoId: String(id) })
          }
        />
      )}
    </section>
  );
}
