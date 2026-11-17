import { useEffect, useState, type ReactElement } from "react";
import {
  api,
  eur,
  type GastoCoordinadoPayload,
  type ModalidadCoordinada,
  type Saldo,
} from "./api";
import { Field, FormGrid } from "./ui";

/**
 * SPEC37 I5 — alta de Gasto con Transferencia asociada, dentro del formulario
 * único de Gasto (`Movimientos.tsx`).
 *
 * §10.1: una sola pantalla ofrece el **Gasto normal** (predeterminado) y las
 * modalidades A y B. No hay un segundo formulario: los campos del Gasto los
 * pinta `MovementForm` y este módulo añade solo la modalidad y la Transferencia.
 *
 * Decisiones de interfaz, no de contrato:
 * - El **Saldo pagador** es el destino de la Transferencia en las dos
 *   modalidades (§3.2 Cuenta 2, §3.3 Cuenta 1). El servidor lo exige, así que
 *   la interfaz no lo ofrece dos veces: se elige el pagador y el otro extremo es
 *   «el Saldo que aporta» (A) o «el Saldo que adelanta» (B).
 * - La Transferencia puede quedar **pendiente de realizar** (predeterminado) o
 *   registrarse como **ya realizada**. En el primer caso la operación escribe
 *   Gasto + pendiente; en el segundo, Gasto + Transferencia real en la misma
 *   transacción atómica (§4).
 * - Los cálculos que se muestran son los del servidor o una resta explícita
 *   sobre la posición publicada; nunca se inventa una posición ni un presupuesto.
 *   El aviso presupuestario es literalmente la respuesta de
 *   `/api/presupuestos/efecto-aportacion`, que aplica el mismo criterio que el
 *   motor R3 (`executionFacts`): una Transferencia **sin** Referencia ejecuta la
 *   «Aportación a saldo» de su destino; una de Anticipo (con Referencia) no.
 *   El cliente no decide nada de eso.
 */

export type ModalidadAlta = "normal" | "A" | "B";
export type ModoTransferencia = "pendiente" | "realizada";

export type CoordinadoForm = {
  /** Saldo que aporta (A) o adelanta (B); el destino es el Saldo pagador. */
  origen: string;
  /** Importe de la Transferencia, en euros con céntimos exactos. */
  importe: string;
  /** Fecha real de la Transferencia si ya se realizó; prevista si no. */
  fecha: string;
  formaReferencia: "existente" | "intencion";
  referencia: string;
  anticipoNombre: string;
  anticipoApertura: string;
  anticipoEvidencia: string;
  /** Atribución E3.1 del hecho real: solo modalidad B ya realizada. */
  evidencia: string;
  procedencia: string;
};

export const coordinadoVacio = (hoy: string): CoordinadoForm => ({
  origen: "",
  importe: "",
  fecha: hoy,
  formaReferencia: "existente",
  referencia: "",
  anticipoNombre: "",
  anticipoApertura: "",
  anticipoEvidencia: "",
  evidencia: "",
  procedencia: "",
});

export type ReferenciaOpcion = {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
};

/** Respuesta de `/api/presupuestos/efecto-aportacion` (motor R3, solo lectura). */
export type EfectoAportacionDTO = {
  aplica: boolean;
  presupuesto: string | null;
  fuente: string | null;
  destino: string;
  motivo: string;
};

const date = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "—";

/** §3 — las etiquetas visibles usan los nombres de la spec. */
export const etiquetaModalidad = (modalidad: ModalidadCoordinada) =>
  modalidad === "A"
    ? "Pago directo desde otro Saldo"
    : "Financiación mediante Anticipo";

export const etiquetaModalidadAlta = (modalidad: ModalidadAlta) =>
  modalidad === "normal" ? "Gasto normal" : etiquetaModalidad(modalidad);

/**
 * Importe exacto para el API. El campo es de texto para no perder céntimos; se
 * acepta la coma decimal española y se envía el formato canónico `1234.56`.
 * No redondea: una tercera decimal es un error de la persona, no un redondeo
 * silencioso.
 */
export function importeApi(texto: string): string {
  const limpio = texto.trim().replace(/\s/g, "").replace(",", ".");
  return limpio;
}

/** Céntimos de un importe ya publicada por el API (`1234.56`) o de un campo. */
export function cents(texto: string | null): number | null {
  if (texto === null || texto === "") return null;
  const normal = importeApi(texto);
  if (!/^-?(0|[1-9]\d*)(\.\d{1,2})?$/.test(normal)) return null;
  const negativo = normal.startsWith("-");
  const [entero, decimales = ""] = normal.replace("-", "").split(".");
  const valor = Number(entero) * 100 + Number(decimales.padEnd(2, "0"));
  return negativo ? -valor : valor;
}

/** Importe editable a partir de céntimos, con la coma decimal española. */
function entradaMoney(value: number) {
  return money(value).replace(".", ",");
}

/** `1234.56` a partir de céntimos; el API publica siempre dos decimales. */
function money(value: number): string {
  const negativo = value < 0;
  const abs = Math.abs(value);
  return `${negativo ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Déficit verificable de §6: `MAX(0, Importe del Gasto − Disponible real)`.
 * Solo existe si la posición es calculable; si no, es `null` y la interfaz
 * muestra «No disponible», nunca cero (AC-25 y §12).
 */
export function deficit(importeGasto: string, disponible: string | null) {
  const gasto = cents(importeGasto);
  const posicion = cents(disponible);
  if (gasto === null || posicion === null) return null;
  return money(Math.max(0, gasto - posicion));
}

/** Remanente positivo de la Transferencia sobre el déficit (§6, AC-05/AC-07). */
export function remanente(importeTransferencia: string, deficitCalculado: string | null) {
  const transferencia = cents(importeTransferencia);
  const minimo = cents(deficitCalculado);
  if (transferencia === null || minimo === null) return null;
  return money(Math.max(0, transferencia - minimo));
}

/** Posición estimada = posición publicada ± un importe. `null` si no se sabe. */
export function posicionEstimada(disponible: string | null, delta: string) {
  const posicion = cents(disponible);
  const cambio = cents(delta);
  if (posicion === null || cambio === null) return null;
  return money(posicion + cambio);
}

/**
 * Mensajes por `code` del API. No se inventa ningún código: los que no están
 * en el mapa conservan el mensaje del servidor, que ya es legible.
 */
export function mensajeCoordinado(code: string, mensaje: string) {
  const mapa: Record<string, string> = {
    IDEMPOTENCY_CONFLICT:
      "Ese intento ya corresponde a otros datos. Tu borrador se conserva: revísalo y vuelve a registrar la operación.",
    DUPLICATE_REVIEW:
      "Hay Movimientos coincidentes. Revisa la lista y confirma solo si es otro hecho económico real; tu borrador se conserva.",
    IMPACT_CHANGED:
      "El contexto cambió desde la vista previa. Tu borrador se conserva: vuelve a generar la vista previa.",
    REVISION_CONFLICT:
      "El pendiente ha cambiado mientras editabas. Tu borrador se conserva: relee la ficha y repite la acción.",
    STATE_CONFLICT:
      "El estado del pendiente ya no admite esta acción. Tu borrador se conserva.",
    REVIEW_REQUIRED:
      "El pendiente requiere revisión. Tu borrador se conserva: resuelve el motivo antes de confirmar.",
    HISTORY_LOCKED:
      "La fecha cae en una ventana cerrada: no se ha escrito nada. Elige una fecha de un Ciclo abierto o cancela el pendiente.",
    GASTO_YA_GENERADO:
      "Ese Gasto ya tiene un pendiente activo. Solo puede existir uno por Gasto: gestiona el existente o cancélalo con motivo.",
    CICLO_NO_DISPONIBLE:
      "La fecha del Gasto no pertenece a ningún Ciclo registrado. No se puede crear el pendiente sin Ciclo de origen.",
    REFERENCIA_NO_ELEGIBLE:
      "La Referencia de Anticipo no es válida para esta operación. Elige una Referencia de tipo Anticipo activa o una intención nueva.",
    REFERENCIA_NO_ADMITIDA:
      "La modalidad A no admite Referencia de Anticipo: la Transferencia ordinaria no genera Anticipo recuperable.",
    DIRECCION_INCOMPATIBLE:
      "La dirección declarada no coincide con la del pendiente. No se invierte automáticamente.",
    MODALIDAD_INMUTABLE:
      "La modalidad es inmutable tras el alta. Para cambiarla, cancela con motivo y crea otro pendiente.",
    PERMISO_EXTERIOR:
      "El Saldo pagador no tiene permiso de salida a Exterior. Elige un Saldo habilitado; no se cambia solo.",
  };
  return mapa[code] ? mapa[code] + ` (${mensaje})` : mensaje;
}

/**
 * Payload de §4. La modalidad fija qué campos de Referencia viajan: en A no
 * viaja ninguno y en B exactamente una forma. El modo decide si el acompañante
 * es un hecho real (`transferencia`) o un pendiente (`pendiente`).
 */
export function payloadCoordinado(input: {
  gasto: {
    fecha: string;
    importe: string;
    saldo: string;
    partida: string;
    concepto: string;
    nota: string;
  };
  modalidad: "A" | "B";
  modo: ModoTransferencia;
  valores: CoordinadoForm;
}): GastoCoordinadoPayload {
  const { gasto, modalidad, modo, valores } = input;

  if (modo === "pendiente") {
    const pendiente: GastoCoordinadoPayload["pendiente"] = {
      modalidad,
      importe: importeApi(valores.importe),
      origen: valores.origen,
      destino: gasto.saldo,
      fechaPrevista: valores.fecha,
      concepto: gasto.concepto,
      nota: gasto.nota,
    };
    if (modalidad === "B") {
      if (valores.formaReferencia === "existente") {
        pendiente.anticipoPrevisto = valores.referencia;
      } else {
        pendiente.anticipoNombre = valores.anticipoNombre.trim();
        if (valores.anticipoApertura)
          pendiente.anticipoApertura = valores.anticipoApertura;
        if (valores.anticipoApertura && valores.anticipoEvidencia.trim())
          pendiente.anticipoEvidencia = valores.anticipoEvidencia.trim();
      }
    }
    return { gasto, pendiente };
  }

  const transferencia: Record<string, unknown> = {
    fecha: valores.fecha,
    importe: importeApi(valores.importe),
    origen: valores.origen,
    destino: gasto.saldo,
    concepto: gasto.concepto,
    nota: gasto.nota,
  };
  if (modalidad === "B") {
    if (valores.formaReferencia === "existente") {
      transferencia.referencia = valores.referencia;
    } else {
      transferencia.anticipoNuevo = {
        nombre: valores.anticipoNombre.trim(),
        ...(valores.anticipoApertura
          ? { apertura: valores.anticipoApertura }
          : {}),
        ...(valores.anticipoApertura && valores.anticipoEvidencia.trim()
          ? { evidencia: valores.anticipoEvidencia.trim() }
          : {}),
      };
    }
    // E3.1 exige la atribución del hecho real; el servidor la valida y el
    // formulario no la deduce.
    transferencia.atribucion = {
      evidencia: valores.evidencia.trim(),
      procedencia: valores.procedencia.trim(),
    };
  }
  return { gasto, transferencia };
}

/**
 * Validación local mínima de la Transferencia antes de pedir la vista previa.
 * No sustituye a la del servidor: solo evita un viaje cuando el bloque está
 * incompleto de forma evidente. Los importes se comparan como céntimos.
 */
export function erroresCoordinado(
  modalidad: "A" | "B",
  modo: ModoTransferencia,
  valores: CoordinadoForm,
): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!valores.origen)
    errores.origen =
      modalidad === "A"
        ? "Selecciona el Saldo que aporta."
        : "Selecciona el Saldo que adelanta.";
  const importe = cents(valores.importe);
  if (importe === null || importe <= 0)
    errores.importe = "Indica un importe exacto mayor que cero.";
  if (!valores.fecha) errores.fecha = "Indica la fecha.";
  if (modalidad === "B") {
    if (valores.formaReferencia === "existente" && !valores.referencia)
      errores.referencia = "Selecciona una Referencia de Anticipo activa.";
    if (valores.formaReferencia === "intencion" && !valores.anticipoNombre.trim())
      errores.anticipoNombre = "Indica el nombre de la Referencia nueva.";
    if (
      valores.formaReferencia === "intencion" &&
      !valores.anticipoApertura &&
      valores.anticipoEvidencia.trim()
    )
      errores.anticipoApertura =
        "Sin apertura no se admite evidencia de la Referencia nueva.";
    if (modo === "realizada") {
      if (!valores.evidencia.trim())
        errores.evidencia = "La atribución del Anticipo exige evidencia.";
      if (!valores.procedencia.trim())
        errores.procedencia = "La atribución del Anticipo exige procedencia.";
    }
  }
  return errores;
}

type SeccionProps = {
  id: string;
  modalidad: ModalidadAlta;
  modo: ModoTransferencia;
  valores: CoordinadoForm;
  onModalidad: (valor: ModalidadAlta) => void;
  onModo: (valor: ModoTransferencia) => void;
  onChange: <K extends keyof CoordinadoForm>(
    clave: K,
    valor: CoordinadoForm[K],
  ) => void;
  saldos: Saldo[];
  pagador: Saldo | null;
  referencias: ReferenciaOpcion[];
  hoy: string;
  importeGasto: string;
  errors: Record<string, string>;
};

/**
 * §10.1 — modalidad y Transferencia asociada. Es la misma sección para las dos
 * modalidades y para los dos modos: solo cambia lo que se pide.
 */
export function SeccionAltaCoordinada({
  id,
  modalidad,
  modo,
  valores,
  onModalidad,
  onModo,
  onChange,
  saldos,
  pagador,
  referencias,
  hoy,
  importeGasto,
  errors,
}: SeccionProps) {
  const otros = saldos.filter((s) => s.id !== pagador?.id);
  const referenciasAnticipo = referencias.filter(
    (r) => r.tipo === "Anticipo" && r.estado === "Activa",
  );
  const disponible = pagador?.posicion.importe ?? null;
  const deficitCalculado = deficit(importeGasto, disponible);
  const remanenteCalculado = remanente(valores.importe, deficitCalculado);
  const pagadorDespues = (() => {
    const previsto = cents(valores.importe);
    const gasto = cents(importeGasto);
    if (previsto === null || gasto === null) return null;
    return posicionEstimada(disponible, money(previsto - gasto));
  })();
  const origenSaldo = otros.find((s) => s.id === valores.origen) ?? null;
  const origenDespues = (() => {
    const previsto = cents(valores.importe);
    const posicion = cents(origenSaldo?.posicion.importe ?? null);
    if (previsto === null || posicion === null) return null;
    return posicionEstimada(origenSaldo!.posicion.importe, money(-previsto));
  })();
  const maxBarra = Math.max(
    10000,
    cents(importeGasto) ?? 0,
    cents(valores.importe) ?? 0,
  );

  /**
   * `Field` añade el asterisco cuando `required` es verdadero, así que las
   * etiquetas no lo llevan escrito. Apertura y evidencia de la Referencia nueva
   * son opcionales (§5.2) y por eso no lo marcan.
   */
  const field = (
    clave: keyof CoordinadoForm,
    label: string,
    children: ReactElement,
    help?: string,
    requerido = true,
  ) => (
    <Field
      key={clave}
      id={`${id}-${clave}`}
      label={label}
      help={help}
      required={requerido}
      error={errors[clave]}
    >
      {children}
    </Field>
  );

  return (
    <div className="coordinado-alta">
      <fieldset className="coordinado-modalidades">
        <legend>Modalidad del alta *</legend>
        {(["normal", "A", "B"] as ModalidadAlta[]).map((valor) => (
          <label className="checkbox" key={valor}>
            <input
              type="radio"
              name={`${id}-modalidad`}
              value={valor}
              checked={modalidad === valor}
              onChange={() => onModalidad(valor)}
            />
            {etiquetaModalidadAlta(valor)}
          </label>
        ))}
      </fieldset>
      <p className="help">
        {modalidad === "normal"
          ? "Un único Gasto desde el Saldo pagador, por el importe íntegro: sin Transferencia, sin pendiente y sin alerta. Se registra por el camino ordinario de Movimientos."
          : modalidad === "A"
            ? "La Transferencia va del Saldo que aporta al Saldo pagador. Es ordinaria: no genera Anticipo recuperable ni exige Referencia. Si no se realiza, queda pendiente."
            : "El Saldo que adelanta transfiere al Saldo pagador con una Referencia de Anticipo. El Anticipo recuperable solo nace de la Transferencia real confirmada."}
      </p>

      {modalidad !== "normal" && (
        <>
          <label className="checkbox coordinado-realizada">
            <input
              type="checkbox"
              checked={modo === "realizada"}
              onChange={(e) =>
                onModo(e.target.checked ? "realizada" : "pendiente")
              }
            />
            Transferencia ya realizada
          </label>
          <p className="help">
            {modo === "realizada"
              ? "El Gasto y la Transferencia se registran juntos, como hechos reales, en una sola transacción. La Transferencia deja de ser una previsión."
              : "Sin marcar, la Transferencia queda pendiente de realizar: se guarda con su fecha prevista y no mueve saldos ni ejecuta presupuesto hasta confirmarla."}
          </p>

          <FormGrid>
            {field(
              "origen",
              modalidad === "A" ? "Saldo que aporta" : "Saldo que adelanta",
              <select
                value={valores.origen}
                onChange={(e) => onChange("origen", e.target.value)}
              >
                <option value="">Selecciona</option>
                {otros.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.nombre}
                  </option>
                ))}
              </select>,
              pagador
                ? `Destino: ${pagador.id}. Origen y destino deben ser distintos.`
                : "Elige antes el Saldo pagador.",
            )}
            {field(
              "importe",
              modo === "pendiente"
                ? "Importe de la Transferencia prevista (€)"
                : "Importe de la Transferencia realizada (€)",
              <input
                inputMode="decimal"
                value={valores.importe}
                onChange={(e) => onChange("importe", e.target.value)}
              />,
              "Puede superar el déficit: el exceso queda como remanente real en el Saldo pagador.",
            )}
            {field(
              "fecha",
              modo === "pendiente" ? "Fecha prevista" : "Fecha real de la Transferencia",
              <input
                type="date"
                max={modo === "realizada" ? hoy : undefined}
                value={valores.fecha}
                onChange={(e) => onChange("fecha", e.target.value)}
              />,
              modo === "pendiente"
                ? "Es una intención: la fecha efectiva será la del banco al confirmar."
                : "Fecha bancaria real, no futura (día civil de España).",
            )}
          </FormGrid>

          <p className="help">
            Disponibilidad real {pagador?.id ?? "—"}:{" "}
            {pagador === null
              ? "Selecciona el Saldo pagador"
              : disponible === null
                ? "No disponible"
                : eur(disponible)}{" "}
            · Déficit verificable:{" "}
            {deficitCalculado === null ? "No disponible" : eur(deficitCalculado)}. El
            déficit presupuestario y la falta de dinero en el Saldo se muestran por
            separado; no se convierten el uno en el otro.
          </p>

          <div className="coordinado-barra">
            <label className="ui-field-label" htmlFor={`${id}-barra`}>
              {modo === "pendiente"
                ? "Barra del importe previsto"
                : "Barra del importe de la Transferencia"}
            </label>
            <input
              id={`${id}-barra`}
              type="range"
              min="0"
              max={maxBarra / 100}
              step="0.01"
              value={(cents(valores.importe) ?? 0) / 100}
              onChange={(e) =>
                // La barra mueve céntimos exactos; el campo es la fuente de
                // verdad y conserva lo escrito cuando se edita a mano (AC-18).
                onChange(
                  "importe",
                  entradaMoney(Math.round(Number(e.target.value) * 100)),
                )
              }
            />
            <p className="help">
              Mínimo informativo:{" "}
              {deficitCalculado === null ? "No disponible" : eur(deficitCalculado)}{" "}
              · Remanente sobre el déficit:{" "}
              {remanenteCalculado === null ? "No disponible" : eur(remanenteCalculado)}{" "}
              · Disponible posterior estimado en {pagador?.id ?? "el pagador"}:{" "}
              {pagadorDespues === null ? "No disponible" : eur(pagadorDespues)}. La
              barra y el campo exacto comparten el valor: escribir céntimos en el
              campo no los redondea.
            </p>
            {origenSaldo && (
              <p className="help">
                Posición estimada de {origenSaldo.id} tras la Transferencia:{" "}
                {origenDespues === null ? "No disponible" : eur(origenDespues)}.
              </p>
            )}
          </div>

          {modalidad === "B" && (
            <div className="coordinado-referencia">
              <fieldset className="coordinado-formas">
                <legend>Referencia de Anticipo *</legend>
                <label className="checkbox">
                  <input
                    type="radio"
                    name={`${id}-forma-referencia`}
                    value="existente"
                    checked={valores.formaReferencia === "existente"}
                    onChange={() => onChange("formaReferencia", "existente")}
                  />
                  Referencia existente
                </label>
                <label className="checkbox">
                  <input
                    type="radio"
                    name={`${id}-forma-referencia`}
                    value="intencion"
                    checked={valores.formaReferencia === "intencion"}
                    onChange={() => onChange("formaReferencia", "intencion")}
                  />
                  Intención de Referencia nueva
                </label>
              </fieldset>
              {valores.formaReferencia === "existente" ? (
                field(
                  "referencia",
                  "Referencia de Anticipo existente",
                  <select
                    value={valores.referencia}
                    onChange={(e) => onChange("referencia", e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {referenciasAnticipo.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} · {r.nombre}
                      </option>
                    ))}
                  </select>,
                  referenciasAnticipo.length
                    ? "Solo Referencias de tipo Anticipo activas."
                    : "No hay Referencias de Anticipo activas: usa una intención nueva.",
                )
              ) : (
                <FormGrid>
                  {field(
                    "anticipoNombre",
                    "Nombre de la Referencia nueva",
                    <input
                      maxLength={120}
                      value={valores.anticipoNombre}
                      onChange={(e) => onChange("anticipoNombre", e.target.value)}
                    />,
                    "El nombre no es identidad: al confirmar se crea una Referencia nueva con su propio ID.",
                  )}
                  {field(
                    "anticipoApertura",
                    "Apertura de la Referencia nueva",
                    <input
                      type="date"
                      value={valores.anticipoApertura}
                      onChange={(e) =>
                        onChange("anticipoApertura", e.target.value)
                      }
                    />,
                    "Opcional. Sin apertura no se admite evidencia.",
                    false,
                  )}
                  {field(
                    "anticipoEvidencia",
                    "Evidencia de la Referencia nueva",
                    <input
                      maxLength={1000}
                      value={valores.anticipoEvidencia}
                      onChange={(e) =>
                        onChange("anticipoEvidencia", e.target.value)
                      }
                    />,
                    "Opcional, y solo junto con la apertura.",
                    false,
                  )}
                </FormGrid>
              )}
              {modo === "realizada" && (
                <FormGrid>
                  {field(
                    "evidencia",
                    "Evidencia de la Transferencia de Anticipo",
                    <input
                      maxLength={1000}
                      value={valores.evidencia}
                      onChange={(e) => onChange("evidencia", e.target.value)}
                    />,
                    "Hecho real que respalda el adelanto; el API lo exige y no se deduce.",
                  )}
                  {field(
                    "procedencia",
                    "Procedencia de la Transferencia de Anticipo",
                    <input
                      maxLength={1000}
                      value={valores.procedencia}
                      onChange={(e) => onChange("procedencia", e.target.value)}
                    />,
                    "Origen documental de la evidencia. Se conserva con el hecho real.",
                  )}
                </FormGrid>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type ResumenProps = {
  modalidad: ModalidadAlta;
  modo: ModoTransferencia;
  valores: CoordinadoForm;
  pagador: Saldo | null;
  efecto: EfectoAportacionDTO | null;
  efectoError: string;
  importeGasto: string;
};

/**
 * §10.2 — vista previa de la operación coordinada. El impacto del Gasto lo
 * publica `/movimientos/impacto`; aquí se añade la Transferencia y el efecto
 * presupuestario que responde el servidor. Nada se estima en el cliente salvo
 * la resta de §6 sobre una posición publicada.
 */
export function ResumenAltaCoordinada({
  modalidad,
  modo,
  valores,
  pagador,
  efecto,
  efectoError,
  importeGasto,
}: ResumenProps) {
  const disponible = pagador?.posicion.importe ?? null;
  const deficitCalculado = deficit(importeGasto, disponible);
  const remanenteCalculado = remanente(valores.importe, deficitCalculado);
  const pagadorDespues = (() => {
    const previsto = cents(valores.importe);
    const gasto = cents(importeGasto);
    if (previsto === null || gasto === null) return null;
    return posicionEstimada(disponible, money(previsto - gasto));
  })();

  return (
    <section
      className="panel coordinado-previa"
      aria-label="Transferencia asociada"
    >
      <h2 tabIndex={-1}>Transferencia asociada</h2>
      <dl className="detail-grid">
        <div>
          <dt>Modalidad</dt>
          <dd>{etiquetaModalidadAlta(modalidad)}</dd>
        </div>
        <div>
          <dt>Saldo que paga</dt>
          <dd>
            {pagador ? `${pagador.id} · ${pagador.nombre}` : "No disponible"}
          </dd>
        </div>
        <div>
          <dt>Importe del Gasto</dt>
          <dd>{importeGasto ? eur(importeApi(importeGasto)) : "Sin informar"}</dd>
        </div>
        <div>
          <dt>Transferencia</dt>
          <dd>
            {modo === "pendiente" ? "Pendiente de realizar" : "Ya realizada"} ·{" "}
            {valores.origen || "—"} → {pagador?.id ?? "—"} ·{" "}
            {valores.importe ? eur(importeApi(valores.importe)) : "Sin informar"}{" "}
            · {modo === "pendiente" ? "prevista" : "real"}{" "}
            {date(valores.fecha)}
          </dd>
        </div>
        <div>
          <dt>Referencia de Anticipo</dt>
          <dd>
            {modalidad === "A"
              ? "No aplica (Transferencia ordinaria)"
              : valores.formaReferencia === "existente"
                ? valores.referencia || "Sin seleccionar"
                : `Intención: ${valores.anticipoNombre || "sin nombre"}`}
          </dd>
        </div>
        <div>
          <dt>Disponible anterior</dt>
          <dd>{disponible === null ? "No disponible" : eur(disponible)}</dd>
        </div>
        <div>
          <dt>Disponible posterior estimado</dt>
          <dd>{pagadorDespues === null ? "No disponible" : eur(pagadorDespues)}</dd>
        </div>
        <div>
          <dt>Mínimo informativo</dt>
          <dd>{deficitCalculado === null ? "No disponible" : eur(deficitCalculado)}</dd>
        </div>
        <div>
          <dt>Remanente sobre el déficit</dt>
          <dd>{remanenteCalculado === null ? "No disponible" : eur(remanenteCalculado)}</dd>
        </div>
      </dl>

      <div aria-live="polite">
        <p>
          <strong>Efecto presupuestario.</strong>{" "}
          {efectoError
            ? `No se pudo consultar al servidor: ${efectoError}`
            : efecto === null
              ? "Consultando al servidor…"
              : efecto.motivo}
        </p>
        {efecto && (
          <p className="help">
            {efecto.aplica
              ? `El servidor atribuye la Transferencia al Presupuesto ${efecto.presupuesto ?? "—"} (fuente ${efecto.fuente ?? "—"}).`
              : "El servidor no atribuye esta Transferencia a ningún Presupuesto de Aportación a saldo."}{" "}
            {modo === "pendiente"
              ? "Mientras la Transferencia esté pendiente no ejecuta nada: el efecto se aplicará, si procede, al confirmarla con su fecha real."
              : ""}
          </p>
        )}
      </div>

      <p className="help">
        El alta no estima importes ejecutados: la ejecución por Partida la
        calcula el servidor con los hechos reales.
      </p>
    </section>
  );
}

/**
 * El aviso presupuestario se pide al servidor cuando ya hay un Saldo pagador:
 * es la misma lectura que aplica el motor R3, así que el cliente no decide si
 * una modalidad ejecuta o no una «Aportación a saldo».
 */
export function useEfectoAportacion(
  activo: boolean,
  destino: string,
  modalidad: ModalidadAlta,
) {
  const [efecto, setEfecto] = useState<EfectoAportacionDTO | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!activo || !destino || modalidad === "normal") {
      setEfecto(null);
      setError("");
      return;
    }
    let live = true;
    setError("");
    const query = new URLSearchParams({ destino });
    if (modalidad === "B") query.set("conReferencia", "1");
    api<EfectoAportacionDTO>("/presupuestos/efecto-aportacion?" + query)
      .then((data) => {
        if (live) setEfecto(data);
      })
      .catch((e) => {
        if (!live) return;
        setEfecto(null);
        setError((e as Error).message);
      });
    return () => {
      live = false;
    };
  }, [activo, destino, modalidad]);
  return { efecto, error };
}