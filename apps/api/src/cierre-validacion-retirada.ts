import { Problem } from "./problem";

/**
 * SPEC38 · I2 — retirada funcional de la vía fotográfica (§7.6).
 *
 * Cerrar ya no crea una foto inmutable y reabrir no existe: no hay versiones,
 * ni re-cierre, ni cancelación de reapertura. El código se fija **por ruta** y
 * nunca por prefijo, para que ninguna respuesta sea `3xx`, `404` ambiguo o
 * `500`, y para que una ruta nueva no herede un código por parecido.
 *
 * Un `POST` retirado tampoco se disfraza de lectura: no hay recurso equivalente
 * que consultar. Lo que sí sigue disponible es la lectura viva —precierre,
 * estado de validación e informe—, y por eso las rutas de foto devuelven un
 * `sustituto` explícito en lugar de redirigir.
 */

export type RutaRetirada = {
  code: "CIERRE_FOTOGRAFICO_RETIRADO" | "REAPERTURA_RETIRADA" | "FOTO_RETIRADA" | "FOTOS_RETIRADAS";
  message: string;
  sustituto: string | null;
};

const CIERRE: Omit<RutaRetirada, "sustituto"> = {
  code: "CIERRE_FOTOGRAFICO_RETIRADO",
  message:
    "Cerrar con foto inmutable se retiró: la validación operativa no congela resultados. Consulta el estado de validación del ciclo.",
};

const REAPERTURA: Omit<RutaRetirada, "sustituto"> = {
  code: "REAPERTURA_RETIRADA",
  message:
    "La reapertura se retiró: sin versiones de cierre no hay reapertura, re-cierre ni cancelación. Las correcciones son ordinarias, con previsualización, motivo y auditoría.",
};

const FOTO_CICLO: Omit<RutaRetirada, "sustituto"> = {
  code: "FOTO_RETIRADA",
  message:
    "La foto de cierre se retiró. El estado vigente del ciclo se lee en su estado de validación.",
};

const FOTOS: Omit<RutaRetirada, "sustituto"> = {
  code: "FOTOS_RETIRADAS",
  message:
    "Las fotografías de cierre y de periodo se retiraron. Los hechos vigentes se leen desde el informe vivo del ciclo.",
};

/**
 * Devuelve la retirada que corresponde a la ruta, o `null` si la ruta no está
 * retirada. Las comprobaciones son de ruta completa (con su patrón de ID), no
 * de prefijo.
 */
export function rutaFotograficaRetirada(path: string, search = ""): RutaRetirada | null {
  const ciclo = (sufijo: string) => new RegExp(`^/api/cierres/(\\d+)${sufijo}$`);
  const conSustituto = (base: Omit<RutaRetirada, "sustituto">, id: string): RutaRetirada => ({
    ...base,
    sustituto: `/api/cierres/${id}/estado`,
  });
  const cierreId = path.match(ciclo("/(?:cerrar|cierre|preflight)"));
  if (cierreId) return conSustituto(CIERRE, cierreId[1]);
  const reaperturaId = path.match(
    ciclo("/(?:(?:reapertura|reapertura/cancelar)|reabrir|repreflight|recerrar|cancelar|revalidacion)"),
  );
  if (reaperturaId) return conSustituto(REAPERTURA, reaperturaId[1]);
  const fotoId = path.match(ciclo("/foto"));
  if (fotoId) return conSustituto(FOTO_CICLO, fotoId[1]);
  if (path === "/api/fotos/contraste") {
    const params = new URLSearchParams(search);
    const id = params.get("ciclo");
    return {
      ...FOTO_CICLO,
      sustituto: id && /^\d+$/.test(id) ? `/api/cierres/${id}/estado` : null,
    };
  }
  if (path === "/api/fotos/periodos" || /^\/api\/fotos\/periodos\/\d+$/.test(path))
    return { ...FOTOS, sustituto: null };
  if (/^\/api\/fotos\/ciclos\/[^/]+(?:\/versiones)?$/.test(path))
    return { ...FOTOS, sustituto: null };
  return null;
}

/** Lanza el `410` con su sustituto declarado; usado por las rutas de prueba. */
export function retirada(path: string, search = ""): never | null {
  const encontrada = rutaFotograficaRetirada(path, search);
  if (!encontrada) return null;
  throw new Problem(410, encontrada.code, encontrada.message, {}, encontrada);
}