/**
 * Hooks de datos de `/fotos`.
 *
 * Extraídos de `Fotos.tsx` sin cambiar su comportamiento: mismas guardas
 * `live`, mismas dependencias de efectos, mismos tokens de petición y mismo
 * contexto de comparación. No hay `AbortController` porque el componente
 * original tampoco lo usaba; la cancelación lógica sigue siendo `live` y el
 * token de comparación.
 */

import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { failureFrom } from "./errors";
import {
  catalogoCiclosUrl,
  comparacionVersionUrl,
  comparacionVigente,
  contextoComparacion,
  contrasteUrl,
  fotoCicloUrl,
  periodoUrl,
  versionesUrl,
} from "./requests";
import { seleccionComparacionVersion } from "./view";
import type {
  CicloResumen,
  ContrasteDto,
  Failure,
  FotoCicloDto,
  FotoPeriodoDto,
  PaginaCiclos,
  VersionFotoDto,
} from "./types";

export function useCatalogoCiclos(
  ciclo: string,
  onSelectCiclo: (id: string) => void,
) {
  const [ciclos, setCiclos] = useState<CicloResumen[] | null>(null);
  const [catalogoError, setCatalogoError] = useState<Failure | null>(null);
  const [catalogoCargando, setCatalogoCargando] = useState(true);
  const [catalogoReintento, setCatalogoReintento] = useState(0);

  useEffect(() => {
    let live = true;
    setCatalogoCargando(true);
    setCatalogoError(null);
    (async () => {
      try {
        const todos: CicloResumen[] = [];
        let page = 1;
        let total = 0;
        do {
          const data = await api<PaginaCiclos>(catalogoCiclosUrl(page++));
          todos.push(...data.ciclos);
          total = data.total;
        } while (todos.length < total && page <= 100);
        if (!live) return;
        setCiclos(todos);
      } catch (error) {
        if (!live) return;
        setCiclos(null);
        setCatalogoError(failureFrom(error));
      } finally {
        if (live) setCatalogoCargando(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [catalogoReintento]);

  useEffect(() => {
    if (!ciclo && ciclos && ciclos.length > 0) onSelectCiclo(ciclos[0].id);
  }, [ciclo, ciclos, onSelectCiclo]);

  return {
    ciclos,
    catalogoError,
    catalogoCargando,
    reintentarCatalogo: () => setCatalogoReintento((value) => value + 1),
  };
}

/**
 * Carga el índice de versiones del ciclo. `resetComparison` conserva el reset
 * de la comparación que el efecto original hacía al iniciar cada carga, sin
 * añadir una dependencia al efecto ni cambiar el token de la petición.
 */
export function useVersiones(
  ciclo: string,
  resetComparison?: { current: (() => void) | null },
) {
  const [versiones, setVersiones] = useState<VersionFotoDto[] | null>(null);
  const [versionesError, setVersionesError] = useState<Failure | null>(null);
  const [versionesCargando, setVersionesCargando] = useState(false);
  const [versionesReintento, setVersionesReintento] = useState(0);

  useEffect(() => {
    if (!ciclo) {
      setVersiones(null);
      setVersionesError(null);
      setVersionesCargando(false);
      return;
    }
    let live = true;
    setVersionesCargando(true);
    setVersionesError(null);
    setVersiones(null);
    resetComparison?.current?.();
    api<VersionFotoDto[]>(versionesUrl(ciclo))
      .then((data) => {
        if (live) setVersiones(data);
      })
      .catch((error) => {
        if (!live) return;
        setVersiones(null);
        setVersionesError(failureFrom(error));
      })
      .finally(() => {
        if (live) setVersionesCargando(false);
      });
    return () => {
      live = false;
    };
  }, [ciclo, versionesReintento]);

  return {
    versiones,
    versionesError,
    versionesCargando,
    reintentarVersiones: () => setVersionesReintento((value) => value + 1),
  };
}

export function useFotoCiclo(ciclo: string, version: string) {
  const [foto, setFoto] = useState<FotoCicloDto | null>(null);
  const [fotoError, setFotoError] = useState<Failure | null>(null);
  const [fotoCargando, setFotoCargando] = useState(false);
  const [fotoReintento, setFotoReintento] = useState(0);

  useEffect(() => {
    if (!ciclo) {
      setFoto(null);
      setFotoError(null);
      setFotoCargando(false);
      return;
    }
    let live = true;
    setFotoCargando(true);
    setFoto(null);
    setFotoError(null);
    api<FotoCicloDto>(fotoCicloUrl(ciclo, version))
      .then((data) => {
        if (live) setFoto(data);
      })
      .catch((error) => {
        if (live) setFotoError(failureFrom(error));
      })
      .finally(() => {
        if (live) setFotoCargando(false);
      });
    return () => {
      live = false;
    };
  }, [ciclo, version, fotoReintento]);

  return {
    foto,
    fotoError,
    fotoCargando,
    reintentarFoto: () => setFotoReintento((value) => value + 1),
  };
}

export function useContraste(ciclo: string, versionFoto: number | undefined) {
  const [contraste, setContraste] = useState<ContrasteDto | null>(null);
  const [contrasteError, setContrasteError] = useState<Failure | null>(null);
  const [contrasteCargando, setContrasteCargando] = useState(false);
  const [contrasteReintento, setContrasteReintento] = useState(0);

  useEffect(() => {
    if (!ciclo || versionFoto === undefined) {
      setContraste(null);
      setContrasteError(null);
      setContrasteCargando(false);
      return;
    }
    let live = true;
    setContrasteCargando(true);
    setContrasteError(null);
    setContraste(null);
    api<ContrasteDto>(contrasteUrl(ciclo))
      .then((data) => {
        if (live) setContraste(data);
      })
      .catch((error) => {
        if (live) setContrasteError(failureFrom(error));
      })
      .finally(() => {
        if (live) setContrasteCargando(false);
      });
    return () => {
      live = false;
    };
  }, [ciclo, versionFoto, contrasteReintento]);

  return {
    contraste,
    contrasteError,
    contrasteCargando,
    reintentarContraste: () => setContrasteReintento((value) => value + 1),
  };
}

export function useComparacion(
  ciclo: string,
  versiones: VersionFotoDto[] | null,
  resetComparison?: { current: (() => void) | null },
) {
  const [compararA, setCompararA] = useState("");
  const [compararB, setCompararB] = useState("");
  const [comparacion, setComparacion] = useState<{
    a: FotoCicloDto;
    b: FotoCicloDto;
  } | null>(null);
  const [comparacionError, setComparacionError] = useState<Failure | null>(
    null,
  );
  const [comparacionCargando, setComparacionCargando] = useState(false);
  const comparisonRequest = useRef(0);
  const comparisonContext = contextoComparacion(ciclo, versiones);
  const comparisonContextRef = useRef(comparisonContext);
  comparisonContextRef.current = comparisonContext;
  // El reset se comparte por ref con useVersiones para no alterar sus deps.
  if (resetComparison)
    resetComparison.current = () => {
      setComparacion(null);
      setComparacionError(null);
    };

  useEffect(() => {
    comparisonRequest.current += 1;
    setComparacion(null);
    setComparacionError(null);
    setComparacionCargando(false);
  }, [ciclo, versiones]);

  useEffect(() => {
    setCompararA((previous) =>
      seleccionComparacionVersion(versiones, previous, "primera"),
    );
    setCompararB((previous) =>
      seleccionComparacionVersion(versiones, previous, "ultima"),
    );
  }, [versiones]);

  async function comparar() {
    const a = Number(compararA);
    const b = Number(compararB);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) {
      setComparacionError({
        status: 422,
        code: "VALIDATION",
        message: "Elige dos versiones distintas para comparar.",
        fields: { version: "Las dos versiones deben ser distintas." },
      });
      return;
    }
    const request = ++comparisonRequest.current;
    const context = comparisonContext;
    setComparacionCargando(true);
    setComparacionError(null);
    setComparacion(null);
    try {
      const [primera, segunda] = await Promise.all([
        api<FotoCicloDto>(comparacionVersionUrl(ciclo, a)),
        api<FotoCicloDto>(comparacionVersionUrl(ciclo, b)),
      ]);
      if (
        !comparacionVigente(
          request,
          comparisonRequest.current,
          context,
          comparisonContextRef.current,
        )
      )
        return;
      setComparacion({ a: primera, b: segunda });
    } catch (error) {
      if (
        comparacionVigente(
          request,
          comparisonRequest.current,
          context,
          comparisonContextRef.current,
        )
      )
        setComparacionError(failureFrom(error));
    } finally {
      if (
        comparacionVigente(
          request,
          comparisonRequest.current,
          context,
          comparisonContextRef.current,
        )
      )
        setComparacionCargando(false);
    }
  }

  function cambiarComparacion(version: "a" | "b", value: string) {
    comparisonRequest.current += 1;
    if (version === "a") setCompararA(value);
    else setCompararB(value);
    setComparacion(null);
    setComparacionError(null);
    setComparacionCargando(false);
  }

  return {
    compararA,
    compararB,
    comparacion,
    comparacionError,
    comparacionCargando,
    comparar,
    cambiarComparacion,
  };
}

export function usePeriodo(
  modo: "Trimestre" | "Anio",
  periodoId: string,
  ejercicio: string,
  trimestre: string,
  versionAgregado: string,
  onValidationError?: (fields: Record<string, string>) => void,
) {
  const [periodo, setPeriodo] = useState<FotoPeriodoDto | null>(null);
  const [error, setError] = useState<Failure | null>(null);
  const [cargando, setCargando] = useState(false);
  const [reintento, setReintento] = useState(0);
  const onValidationErrorRef = useRef(onValidationError);
  onValidationErrorRef.current = onValidationError;

  useEffect(() => {
    let live = true;
    setCargando(true);
    setError(null);
    setPeriodo(null);
    const url = periodoUrl(
      modo,
      periodoId,
      ejercicio,
      trimestre,
      versionAgregado,
    );
    api<FotoPeriodoDto>(url)
      .then((data) => {
        if (live) setPeriodo(data);
      })
      .catch((failure) => {
        if (!live) return;
        const normalized = failureFrom(failure);
        setError(normalized);
        if (normalized.status === 422)
          onValidationErrorRef.current?.(normalized.fields);
      })
      .finally(() => {
        if (live) setCargando(false);
      });
    return () => {
      live = false;
    };
  }, [
    modo,
    periodoId,
    ejercicio,
    trimestre,
    versionAgregado,
    reintento,
  ]);

  return {
    periodo,
    error,
    cargando,
    reintentarPeriodo: () => setReintento((value) => value + 1),
  };
}
