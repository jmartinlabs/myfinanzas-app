/**
 * Panel de consulta de agregados de trimestre y año de `/fotos`.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { EmptyState, Skeleton } from "../../ui";
import { usePeriodo } from "../hooks";
import { ErrorBox } from "./feedback";
import { PeriodoResultado } from "./periodo-resultado";

export function PeriodoPanel({
  modo,
  periodoId,
  ejercicio,
  trimestre,
  versionAgregado,
  onCommit,
  onAbrirId,
  onAbrirCiclo,
  hrefCiclo,
  hrefPeriodoId,
}: {
  modo: "Trimestre" | "Anio";
  periodoId: string;
  ejercicio: string;
  trimestre: string;
  versionAgregado: string;
  onCommit: (patch: {
    modo: "Trimestre" | "Anio";
    periodoId: string;
    ejercicio: string;
    trimestre: string;
    versionAgregado: string;
  }) => void;
  onAbrirId: (id: string) => void;
  onAbrirCiclo: (ciclo: string, version?: number | null) => void;
  hrefCiclo: (ciclo: string, version?: number | null) => string;
  hrefPeriodoId: (id: number) => string;
}) {
  const [borrador, setBorrador] = useState({
    ejercicio,
    trimestre,
    versionAgregado,
    periodoId,
  });
  const ejercicioRef = useRef<HTMLInputElement>(null);
  const trimestreRef = useRef<HTMLSelectElement>(null);
  const versionRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBorrador({ ejercicio, trimestre, versionAgregado, periodoId });
  }, [ejercicio, trimestre, versionAgregado, periodoId]);

  function focusCampo(fields: Record<string, string>) {
    const nombres = Object.keys(fields);
    const nombre = nombres[0] ?? "";
    const target = nombre.startsWith("trimestre")
      ? trimestreRef.current
      : nombre.startsWith("version")
        ? versionRef.current
        : nombre === "id"
          ? idRef.current
          : ejercicioRef.current;
    if (target) requestAnimationFrame(() => target.focus());
  }

  const { periodo, error, cargando, reintentarPeriodo } = usePeriodo(
    modo,
    periodoId,
    ejercicio,
    trimestre,
    versionAgregado,
    focusCampo,
  );

  function consultar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCommit({
      modo,
      periodoId: borrador.periodoId.trim(),
      ejercicio: borrador.ejercicio.trim(),
      trimestre: borrador.trimestre,
      versionAgregado: borrador.versionAgregado.trim(),
    });
  }

  return (
    <>
      <section className="panel fotos-context" aria-label="Consulta de periodo">
        <form className="fotos-period-form" noValidate onSubmit={consultar}>
          <label htmlFor="fotos-ejercicio">
            Ejercicio
            <input
              id="fotos-ejercicio"
              ref={ejercicioRef}
              value={borrador.ejercicio}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              aria-invalid={Boolean(error?.fields.ejercicio || error?.fields.periodo)}
              onChange={(event) =>
                setBorrador((previous) => ({
                  ...previous,
                  ejercicio: event.target.value,
                }))
              }
            />
          </label>
          {modo === "Trimestre" && (
            <label htmlFor="fotos-trimestre">
              Trimestre
              <select
                id="fotos-trimestre"
                ref={trimestreRef}
                value={borrador.trimestre}
                aria-invalid={Boolean(error?.fields.trimestre)}
                onChange={(event) =>
                  setBorrador((previous) => ({
                    ...previous,
                    trimestre: event.target.value,
                  }))
                }
              >
                <option value="1">T1</option>
                <option value="2">T2</option>
                <option value="3">T3</option>
                <option value="4">T4</option>
              </select>
            </label>
          )}
          <label htmlFor="fotos-version-agregado">
            Versión del agregado
            <input
              id="fotos-version-agregado"
              ref={versionRef}
              value={borrador.versionAgregado}
              placeholder="A1 (vacío = última)"
              autoComplete="off"
              aria-invalid={Boolean(error?.fields.version)}
              onChange={(event) =>
                setBorrador((previous) => ({
                  ...previous,
                  versionAgregado: event.target.value,
                }))
              }
            />
          </label>
          <label htmlFor="fotos-periodo-id">
            ID del agregado
            <input
              id="fotos-periodo-id"
              ref={idRef}
              value={borrador.periodoId}
              placeholder="Opcional"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={Boolean(error?.fields.id)}
              onChange={(event) =>
                setBorrador((previous) => ({
                  ...previous,
                  periodoId: event.target.value,
                }))
              }
            />
          </label>
          <div className="actions">
            <button className="primary" type="submit" disabled={cargando}>
              {cargando ? "Consultando…" : "Consultar foto"}
            </button>
          </div>
        </form>
        <p className="help fotos-help">
          Sin versión se consulta la última del periodo y se declara. Una
          versión inexistente devuelve 404 y no cae a otra. Si informas un ID,
          se consulta la identidad persistida y se ignoran los filtros.
        </p>
      </section>

      {cargando && (
        <Skeleton lines={5} label="Consultando agregado del periodo…" />
      )}

      {error && !cargando && error.status === 404 && (
        <section className="panel" aria-label="Sin fotos para el periodo">
          <EmptyState
            title={
              periodoId
                ? "Sin foto para esta identidad"
                : "Sin fotos para este periodo"
            }
            icon="○"
          >
            <strong>Motivo:</strong>{" "}
            {error.message ||
              "No hay agregados persistidos para este periodo."}{" "}
            No se muestra 0 ni una foto vacía.
          </EmptyState>
          <p className="muted">Código: {error.code || "NOT_FOUND"}</p>
        </section>
      )}

      {error && !cargando && error.status !== 404 && (
        <ErrorBox
          failure={error}
          context="periodo"
          retry={error.status === 422 ? undefined : reintentarPeriodo}
          focus={error.status !== 422}
        />
      )}

      {periodo && !cargando && !error && (
        <PeriodoResultado
          data={periodo}
          hrefCiclo={hrefCiclo}
          onAbrirCiclo={onAbrirCiclo}
          hrefPeriodoId={hrefPeriodoId}
          onAbrirId={onAbrirId}
        />
      )}
    </>
  );
}
