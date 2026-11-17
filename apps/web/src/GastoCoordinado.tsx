import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  api,
  ApiError,
  eur,
  type GastoCoordinadoPayload,
  type ModalidadCoordinada,
  type OperacionCoordinadaDTO,
  type Saldo,
  type TransferenciaPendienteDTO,
} from "./api";
import {
  Alert,
  Field,
  FormGrid,
  FormSection,
  PageHead,
  Tag,
  focusFirstInvalidField,
} from "./ui";

/**
 * SPEC37 I5 — alta coordinada de un Gasto con Transferencia **pendiente**.
 *
 * §10.1 y §10.2: un único formulario con la modalidad A/B explícita, la barra y
 * el campo exacto sincronizados, y una vista previa de impacto antes de
 * registrar. La operación que se envía es `POST /api/operaciones-coordinadas`
 * (§4): el Gasto real y su pendiente se escriben en una sola transacción, así
 * que un fallo no deja un Gasto sin su pendiente ni un pendiente sin Gasto.
 *
 * Decisiones de interfaz, no de contrato:
 * - El **Saldo pagador** es el destino de la Transferencia prevista en las dos
 *   modalidades (§3.2 y §3.3). El servidor lo exige, así que la interfaz no
 *   ofrece elegirlo dos veces: se elige el pagador y el otro extremo es «el
 *   Saldo que aporta» (A) o «el Saldo que adelanta» (B).
 * - El alta de un Gasto sin Transferencia no entra aquí: se registra por el
 *   formulario ordinario de Movimientos, que no crea pendiente.
 * - La modalidad B exige Referencia de Anticipo; se ofrece una existente **o**
 *   una intención de alta (nombre y, opcionalmente, apertura y evidencia). La
 *   intención no crea Referencia ni ficha: nacen al confirmar (§5.3).
 * - Los cálculos que se muestran son los del servidor (`/movimientos/impacto`)
 *   o una resta explícita sobre la posición publicada; nunca se inventa una
 *   posición ni un presupuesto.
 */

type PartidaOpcion = {
  id: string;
  nombre: string;
  estado: string;
  seleccionable?: boolean;
};
type ReferenciaOpcion = {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
};
type Opciones = {
  hoy: string;
  saldos: Saldo[];
  partidas: PartidaOpcion[];
  referencias: ReferenciaOpcion[];
  ciclos: { id: string; inicio: string; fin: string | null }[];
};

/** Plan de impacto de `/movimientos/impacto` (E1.4) resumido a lo que se usa. */
type PlanImpacto = {
  fingerprint: string;
  accion: string;
  duplicados: { id: string; fecha: string; tipo: string; importe: string }[];
  impacto: {
    gastoAntes: string;
    gastoDespues: string;
    cicloDespues: { id: string; mesFinanciado: string } | null;
    saldos: {
      id: string;
      nombre: string;
      antes: string | null;
      despues: string | null;
      motivo: string;
    }[];
  };
};

const date = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "—";

export const etiquetaModalidad = (modalidad: ModalidadCoordinada) =>
  modalidad === "A"
    ? "Pago directo desde otro Saldo"
    : "Financiación mediante Anticipo";

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
function cents(texto: string | null): number | null {
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

type Formulario = {
  fecha: string;
  importe: string;
  saldo: string;
  partida: string;
  concepto: string;
  nota: string;
  modalidad: ModalidadCoordinada;
  origen: string;
  importeTransferencia: string;
  fechaPrevista: string;
  formaReferencia: "existente" | "intencion";
  referencia: string;
  anticipoNombre: string;
  anticipoApertura: string;
  anticipoEvidencia: string;
};

const vacio = (hoy: string): Formulario => ({
  fecha: hoy,
  importe: "",
  saldo: "",
  partida: "",
  concepto: "",
  nota: "",
  modalidad: "A",
  origen: "",
  importeTransferencia: "",
  fechaPrevista: hoy,
  formaReferencia: "existente",
  referencia: "",
  anticipoNombre: "",
  anticipoApertura: "",
  anticipoEvidencia: "",
});

type CampoId =
  | "fecha"
  | "importe"
  | "saldo"
  | "partida"
  | "origen"
  | "importeTransferencia"
  | "fechaPrevista"
  | "referencia"
  | "anticipoNombre"
  | "anticipoApertura"
  | "anticipoEvidencia"
  | "concepto"
  | "nota"
  | "modalidad";

/** Errores del API por campo; el servidor usa `bloque.campo` o el campo solo. */
function erroresDeCampo(fields: Record<string, string>) {
  const salida: Partial<Record<CampoId, string>> = {};
  const conocidos: CampoId[] = [
    "fecha",
    "importe",
    "saldo",
    "partida",
    "origen",
    "importeTransferencia",
    "fechaPrevista",
    "referencia",
    "anticipoNombre",
    "anticipoApertura",
    "anticipoEvidencia",
    "concepto",
    "nota",
    "modalidad",
  ];
  for (const [clave, valor] of Object.entries(fields)) {
    const campo = clave.split(".").pop() as CampoId | undefined;
    if (campo && conocidos.includes(campo) && !salida[campo]) salida[campo] = valor;
  }
  return salida;
}

/**
 * Payload de §4 para Gasto + pendiente. La modalidad fija qué campos de
 * Referencia viajan: en A no viaja ninguno y en B exactamente una forma.
 */
export function payloadCoordinado(form: Formulario): GastoCoordinadoPayload {
  const pendiente: GastoCoordinadoPayload["pendiente"] = {
    modalidad: form.modalidad,
    importe: importeApi(form.importeTransferencia),
    origen: form.origen,
    destino: form.saldo,
    fechaPrevista: form.fechaPrevista,
    concepto: form.concepto,
    nota: form.nota,
  };
  if (form.modalidad === "B") {
    if (form.formaReferencia === "existente") {
      pendiente.anticipoPrevisto = form.referencia;
    } else {
      pendiente.anticipoNombre = form.anticipoNombre.trim();
      if (form.anticipoApertura) pendiente.anticipoApertura = form.anticipoApertura;
      if (form.anticipoApertura && form.anticipoEvidencia.trim())
        pendiente.anticipoEvidencia = form.anticipoEvidencia.trim();
    }
  }
  return {
    gasto: {
      fecha: form.fecha,
      importe: importeApi(form.importe),
      saldo: form.saldo,
      partida: form.partida,
      concepto: form.concepto,
      nota: form.nota,
    },
    pendiente,
  };
}

export function GastoCoordinado({ go }: { go: (path: string) => void }) {
  const [opciones, setOpciones] = useState<Opciones | null>(null);
  const [opcionesError, setOpcionesError] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [form, setForm] = useState<Formulario>(() => vacio(""));
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Partial<Record<CampoId, string>>>({});
  const [plan, setPlan] = useState<PlanImpacto | null>(null);
  const [duplicados, setDuplicados] = useState<
    { id: string; fecha: string; importe: string }[]
  >([]);
  const [aceptarCoincidencia, setAceptarCoincidencia] = useState(false);
  const [busy, setBusy] = useState(false);
  const [conflicto, setConflicto] = useState(false);
  const [resultado, setResultado] = useState<TransferenciaPendienteDTO | null>(
    null,
  );
  const intento = useRef(crypto.randomUUID());
  const alerta = useRef<HTMLDivElement>(null);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setOpcionesError("");
    api<Opciones>("/movimientos/opciones")
      .then((data) => {
        if (!live) return;
        setOpciones(data);
        setForm((v) => (v.fecha ? v : { ...v, fecha: data.hoy, fechaPrevista: data.hoy }));
      })
      .catch((e) => {
        if (live) setOpcionesError((e as Error).message);
      });
    return () => {
      live = false;
    };
  }, [recarga]);

  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      if (!focusFirstInvalidField(raiz.current)) alerta.current?.focus();
    });
  }, [error, fields]);

  const cambio = <K extends keyof Formulario>(clave: K, valor: Formulario[K]) => {
    setForm((v) => {
      const siguiente = { ...v, [clave]: valor };
      // §3.2/§3.3: el destino es el Saldo pagador; jamás el mismo Saldo.
      if (clave === "saldo" && siguiente.origen === valor) siguiente.origen = "";
      if (clave === "modalidad" && valor === "A") {
        siguiente.formaReferencia = "existente";
        siguiente.referencia = "";
        siguiente.anticipoNombre = "";
        siguiente.anticipoApertura = "";
        siguiente.anticipoEvidencia = "";
      }
      return siguiente;
    });
    setPlan(null);
    setDuplicados([]);
    setError("");
    setConflicto(false);
    setFields((v) => ({ ...v, [clave]: undefined }));
    intento.current = crypto.randomUUID();
  };

  const saldos = (opciones?.saldos ?? []).filter((s) => s.estado === "Activa");
  const pagador = saldos.find((s) => s.id === form.saldo) ?? null;
  const otros = saldos.filter((s) => s.id !== form.saldo);
  const referenciasAnticipo = (opciones?.referencias ?? []).filter(
    (r) => r.tipo === "Anticipo" && r.estado === "Activa",
  );
  const disponible = pagador?.posicion.importe ?? null;
  const deficitCalculado = deficit(form.importe, disponible);
  const remanenteCalculado = remanente(
    form.importeTransferencia,
    deficitCalculado,
  );
  const pagadorDespues = (() => {
    const previsto = cents(form.importeTransferencia);
    const gasto = cents(importeApi(form.importe));
    if (previsto === null || gasto === null) return null;
    return posicionEstimada(disponible, money(previsto - gasto));
  })();
  const origenSaldo = otros.find((s) => s.id === form.origen) ?? null;
  const origenDespues = (() => {
    const previsto = cents(form.importeTransferencia);
    const posicion = cents(origenSaldo?.posicion.importe ?? null);
    if (previsto === null || posicion === null) return null;
    return posicionEstimada(origenSaldo!.posicion.importe, money(-previsto));
  })();

  // La barra nunca recorta el importe ya escrito: su máximo lo incluye.
  const maxBarra = Math.max(
    10000,
    cents(importeApi(form.importe)) ?? 0,
    cents(form.importeTransferencia) ?? 0,
  );

  const etiquetaOrigen =
    form.modalidad === "A" ? "Saldo que aporta *" : "Saldo que adelanta *";

  const campo = (
    clave: CampoId,
    label: string,
    children: ReactElement,
    help?: string,
    requerido = false,
  ) => (
    <Field
      key={clave}
      id={`coordinado-${clave}`}
      label={label}
      help={help}
      required={requerido}
      error={fields[clave]}
    >
      {children}
    </Field>
  );

  async function previsualizar() {
    setBusy(true);
    setError("");
    setFields({});
    setDuplicados([]);
    try {
      const data = await api<PlanImpacto>("/movimientos/impacto", "POST", {
        tipo: "Gasto",
        fecha: form.fecha,
        importe: importeApi(form.importe),
        saldo: form.saldo,
        partida: form.partida,
        concepto: form.concepto,
        nota: form.nota,
      });
      setPlan(data);
      setDuplicados(data.duplicados ?? []);
      setAceptarCoincidencia(false);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? mensajeCoordinado(e.code, e.message)
          : (e as Error).message,
      );
      if (e instanceof ApiError) setFields(erroresDeCampo(e.fields));
    } finally {
      setBusy(false);
    }
  }

  async function registrar() {
    setBusy(true);
    setError("");
    setFields({});
    try {
      const data = await api<OperacionCoordinadaDTO>(
        "/operaciones-coordinadas",
        "POST",
        {
          ...payloadCoordinado(form),
          ...(duplicados.length ? { aceptarCoincidencia } : {}),
        },
        { "idempotency-key": intento.current },
      );
      setResultado(data.pendiente);
      setPlan(null);
      setDuplicados([]);
    } catch (e) {
      // AC-22: el 409 no pierde nada. El estado del formulario no se reinicia,
      // la vista previa sigue visible y la clave de intento se conserva para
      // que un reenvío del mismo contenido sea idempotente.
      const apiError = e instanceof ApiError ? e : null;
      setError(
        apiError
          ? mensajeCoordinado(apiError.code, apiError.message)
          : (e as Error).message,
      );
      setConflicto(apiError?.status === 409 || apiError?.status === 422);
      if (apiError) {
        setFields(erroresDeCampo(apiError.fields));
        const lista = (apiError.data?.duplicados ?? []) as {
          id: string;
          fecha: string;
          importe: string;
        }[];
        if (Array.isArray(lista) && lista.length) setDuplicados(lista);
      }
    } finally {
      setBusy(false);
    }
  }

  if (resultado)
    return (
      <div className="coordinado-page" ref={raiz}>
        <PageHead
          eyebrow="REGISTRO COORDINADO"
          title="Pendiente de realizar creado"
          description="El Gasto ya es un hecho real. La Transferencia queda pendiente y no mueve saldos hasta que se confirme."
        />
        <FormSection title="Resultado de la operación">
          <dl className="detail-grid">
            <div>
              <dt>Pendiente</dt>
              <dd>#{resultado.id}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                <Tag>{resultado.estado}</Tag>
              </dd>
            </div>
            <div>
              <dt>Modalidad</dt>
              <dd>
                {resultado.modalidad
                  ? etiquetaModalidad(resultado.modalidad)
                  : "No informada"}
              </dd>
            </div>
            <div>
              <dt>Importe previsto</dt>
              <dd>{eur(resultado.importe)}</dd>
            </div>
            <div>
              <dt>Origen → destino</dt>
              <dd>
                {resultado.origen?.nombre ?? "No disponible"} →{" "}
                {resultado.destino?.nombre ?? "No disponible"}
              </dd>
            </div>
            <div>
              <dt>Gasto vinculado</dt>
              <dd>#{resultado.gasto ?? "No disponible"}</dd>
            </div>
            <div>
              <dt>Referencia prevista</dt>
              <dd>
                {resultado.anticipoPrevisto ??
                  (resultado.anticipoIntencion
                    ? `Intención: ${resultado.anticipoIntencion.nombre}`
                    : "No aplica")}
              </dd>
            </div>
          </dl>
          <p className="help">
            La Transferencia de Anticipo no existe todavía: no hay Referencia ni
            ficha creadas, y el motor de Anticipos no computa nada hasta
            confirmarla con su fecha bancaria real, su evidencia y su
            procedencia.
          </p>
          <div className="actions">
            <button className="primary" onClick={() => go("/movimientos")}>
              Ir a la bandeja de pendientes
            </button>
            {resultado.gasto && (
              <button
                className="secondary"
                onClick={() => go("/movimientos/" + resultado.gasto)}
              >
                Ver el Gasto registrado
              </button>
            )}
            <button
              className="secondary"
              onClick={() => {
                setResultado(null);
                setForm(vacio(opciones?.hoy ?? form.fecha));
                intento.current = crypto.randomUUID();
              }}
            >
              Registrar otro Gasto coordinado
            </button>
          </div>
        </FormSection>
      </div>
    );

  return (
    <div className="coordinado-page" ref={raiz}>
      <PageHead
        eyebrow="NÚCLEO FINANCIERO"
        title="Nuevo Gasto coordinado"
        description="Gasto real con una Transferencia prevista: pago directo desde otro Saldo (A) o financiación mediante Anticipo (B)."
      />
      {opcionesError && (
        <Alert retry={() => setRecarga((v) => v + 1)}>{opcionesError}</Alert>
      )}
      {error && (
        <div tabIndex={-1} ref={alerta}>
          <Alert retry={() => setRecarga((v) => v + 1)}>
            <p>{error}</p>
            {conflicto && (
              <p>
                Tus datos siguen en el formulario y la modalidad no ha cambiado.
                Revisa el contexto antes de volver a registrar.
              </p>
            )}
          </Alert>
        </div>
      )}

      <form
        className="saldo-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (plan) registrar();
          else previsualizar();
        }}
      >
        <FormSection
          title="Gasto"
          description="Hecho real e íntegro desde el Saldo pagador. El Gasto nunca se divide ni se registra financiado."
        >
          <FormGrid>
            {campo(
              "fecha",
              "Fecha del Gasto *",
              <input
                type="date"
                max={opciones?.hoy}
                value={form.fecha}
                onChange={(e) => cambio("fecha", e.target.value)}
              />,
              "Fecha bancaria real, no futura (día civil de España).",
              true,
            )}
            {campo(
              "importe",
              "Importe del Gasto (€) *",
              <input
                inputMode="decimal"
                value={form.importe}
                onChange={(e) => cambio("importe", e.target.value)}
              />,
              "Euros con céntimos exactos: 1234,56 o 1234.56.",
              true,
            )}
            {campo(
              "saldo",
              "Saldo pagador *",
              <select
                value={form.saldo}
                onChange={(e) => cambio("saldo", e.target.value)}
              >
                <option value="">Selecciona</option>
                {saldos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.nombre}
                  </option>
                ))}
              </select>,
              "Debe tener permiso de salida a Exterior. No se elige otro por ti.",
              true,
            )}
            {campo(
              "partida",
              "Partida *",
              <select
                value={form.partida}
                onChange={(e) => cambio("partida", e.target.value)}
              >
                <option value="">Selecciona</option>
                {(opciones?.partidas ?? [])
                  .filter((p) => p.seleccionable !== false && p.estado === "Activa")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} · {p.nombre}
                    </option>
                  ))}
              </select>,
              undefined,
              true,
            )}
            {campo(
              "concepto",
              "Concepto",
              <input
                value={form.concepto}
                onChange={(e) => cambio("concepto", e.target.value)}
              />,
            )}
            {campo(
              "nota",
              "Nota",
              <textarea
                maxLength={4000}
                value={form.nota}
                onChange={(e) => cambio("nota", e.target.value)}
              />,
            )}
          </FormGrid>
          <p className="help">
            Disponibilidad real {pagador ? pagador.id : "—"}:{" "}
            {pagador
              ? disponible === null
                ? "No disponible"
                : eur(disponible)
              : "Selecciona el Saldo pagador"}{" "}
            · Déficit verificable:{" "}
            {deficitCalculado === null ? "No disponible" : eur(deficitCalculado)}.
            El déficit presupuestario y la falta de dinero en el Saldo se
            muestran por separado; no se convierten el uno en el otro.
          </p>
        </FormSection>

        <FormSection
          title="Modalidad"
          description="Se fija al crear el pendiente y no se puede cambiar después: para cambiarla hay que cancelar con motivo y crear otro."
        >
          <fieldset className="coordinado-modalidades">
            <legend>Modalidad *</legend>
            {(["A", "B"] as ModalidadCoordinada[]).map((valor) => (
              <label className="checkbox" key={valor}>
                <input
                  type="radio"
                  name="coordinado-modalidad"
                  value={valor}
                  checked={form.modalidad === valor}
                  onChange={() => cambio("modalidad", valor)}
                />
                {etiquetaModalidad(valor)}
              </label>
            ))}
          </fieldset>
          <p className="help">
            {form.modalidad === "A"
              ? "La Transferencia va del Saldo que aporta al Saldo pagador. Es ordinaria: no genera Anticipo recuperable ni exige Referencia."
              : "El Saldo que adelanta transfiere al Saldo pagador con una Referencia de Anticipo. El Anticipo recuperable solo nace de la Transferencia real confirmada."}{" "}
            Un Gasto sin Transferencia se registra en «Nuevo movimiento».
          </p>
        </FormSection>

        <FormSection
          title="Transferencia prevista"
          description="Todavía no se ha realizado: se conserva como pendiente y no mueve saldos hasta confirmarla."
        >
          <FormGrid>
            {campo(
              "origen",
              etiquetaOrigen,
              <select
                value={form.origen}
                onChange={(e) => cambio("origen", e.target.value)}
              >
                <option value="">Selecciona</option>
                {otros.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.nombre}
                  </option>
                ))}
              </select>,
              form.saldo
                ? `Destino: ${form.saldo}. Origen y destino deben ser distintos.`
                : "Elige antes el Saldo pagador.",
              true,
            )}
            {campo(
              "importeTransferencia",
              "Importe de la Transferencia prevista (€) *",
              <input
                inputMode="decimal"
                value={form.importeTransferencia}
                onChange={(e) => cambio("importeTransferencia", e.target.value)}
              />,
              "Puede superar el déficit: el exceso queda como remanente real en el Saldo pagador.",
              true,
            )}
            {campo(
              "fechaPrevista",
              "Fecha prevista *",
              <input
                type="date"
                value={form.fechaPrevista}
                onChange={(e) => cambio("fechaPrevista", e.target.value)}
              />,
              "Es una intención: la fecha efectiva será la del banco al confirmar.",
              true,
            )}
          </FormGrid>
          <div className="coordinado-barra">
            <label className="ui-field-label" htmlFor="coordinado-barra">
              Barra del importe previsto
            </label>
            <input
              id="coordinado-barra"
              type="range"
              min="0"
              max={maxBarra / 100}
              step="0.01"
              value={(cents(form.importeTransferencia) ?? 0) / 100}
              onChange={(e) =>
                // La barra mueve céntimos exactos; el campo es la fuente de
                // verdad y conserva lo escrito cuando se edita a mano (AC-18).
                cambio(
                  "importeTransferencia",
                  entradaMoney(Math.round(Number(e.target.value) * 100)),
                )
              }
            />
            <p className="help">
              Mínimo informativo:{" "}
              {deficitCalculado === null ? "No disponible" : eur(deficitCalculado)}{" "}
              · Remanente sobre el déficit:{" "}
              {remanenteCalculado === null ? "No disponible" : eur(remanenteCalculado)}{" "}
              · Disponible posterior estimado en {form.saldo || "el pagador"}:{" "}
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

          {form.modalidad === "B" && (
            <div className="coordinado-referencia">
              <fieldset className="coordinado-formas">
                <legend>Referencia de Anticipo *</legend>
                <label className="checkbox">
                  <input
                    type="radio"
                    name="coordinado-forma-referencia"
                    value="existente"
                    checked={form.formaReferencia === "existente"}
                    onChange={() => cambio("formaReferencia", "existente")}
                  />
                  Referencia existente
                </label>
                <label className="checkbox">
                  <input
                    type="radio"
                    name="coordinado-forma-referencia"
                    value="intencion"
                    checked={form.formaReferencia === "intencion"}
                    onChange={() => cambio("formaReferencia", "intencion")}
                  />
                  Intención de Referencia nueva
                </label>
              </fieldset>
              {form.formaReferencia === "existente" ? (
                campo(
                  "referencia",
                  "Referencia de Anticipo existente *",
                  <select
                    value={form.referencia}
                    onChange={(e) => cambio("referencia", e.target.value)}
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
                  true,
                )
              ) : (
                <FormGrid>
                  {campo(
                    "anticipoNombre",
                    "Nombre de la Referencia nueva *",
                    <input
                      maxLength={120}
                      value={form.anticipoNombre}
                      onChange={(e) => cambio("anticipoNombre", e.target.value)}
                    />,
                    "El nombre no es identidad: al confirmar se crea una Referencia nueva con su propio ID.",
                    true,
                  )}
                  {campo(
                    "anticipoApertura",
                    "Apertura de la Referencia nueva",
                    <input
                      type="date"
                      value={form.anticipoApertura}
                      onChange={(e) => cambio("anticipoApertura", e.target.value)}
                    />,
                    "Opcional. Sin apertura no se admite evidencia.",
                  )}
                  {campo(
                    "anticipoEvidencia",
                    "Evidencia de la Referencia nueva",
                    <input
                      maxLength={1000}
                      value={form.anticipoEvidencia}
                      onChange={(e) => cambio("anticipoEvidencia", e.target.value)}
                    />,
                    "Opcional, y solo junto con la apertura.",
                  )}
                </FormGrid>
              )}
            </div>
          )}
        </FormSection>

        {plan && (
          <section
            className="panel movement-impact coordinado-previa"
            aria-label="Vista previa de impacto del Gasto coordinado"
          >
            <h2 tabIndex={-1}>Vista previa de impacto</h2>
            <dl className="detail-grid">
              <div>
                <dt>Modalidad</dt>
                <dd>{etiquetaModalidad(form.modalidad)}</dd>
              </div>
              <div>
                <dt>Saldo que paga</dt>
                <dd>
                  {form.saldo} · {pagador?.nombre ?? "No disponible"}
                </dd>
              </div>
              <div>
                <dt>Importe del Gasto</dt>
                <dd>{form.importe ? eur(importeApi(form.importe)) : "Sin informar"}</dd>
              </div>
              <div>
                <dt>Transferencia prevista</dt>
                <dd>
                  {form.origen || "—"} → {form.saldo || "—"} ·{" "}
                  {form.importeTransferencia
                    ? eur(importeApi(form.importeTransferencia))
                    : "Sin informar"}{" "}
                  · prevista {date(form.fechaPrevista)}
                </dd>
              </div>
              <div>
                <dt>Referencia prevista</dt>
                <dd>
                  {form.modalidad === "A"
                    ? "No aplica (Transferencia ordinaria)"
                    : form.formaReferencia === "existente"
                      ? form.referencia || "Sin seleccionar"
                      : `Intención: ${form.anticipoNombre || "sin nombre"}`}
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
                <dt>Ciclo del Gasto</dt>
                <dd>
                  {plan.impacto.cicloDespues?.id ?? "Sin ciclo asignable"}
                </dd>
              </div>
            </dl>
            <p>
              Gasto íntegro del ciclo: {eur(plan.impacto.gastoAntes)} →{" "}
              {eur(plan.impacto.gastoDespues)}. La Transferencia prevista no
              ejecuta presupuesto ni aumenta el presupuesto de la Partida.
            </p>
            {plan.impacto.saldos.map((s) => (
              <p key={s.id}>
                {s.id} · {s.nombre}: {eur(s.antes)} →{" "}
                {s.despues === null ? "No disponible" : eur(s.despues)}
              </p>
            ))}
            {duplicados.length > 0 && (
              <Alert>
                Hay {duplicados.length} Movimiento(s) coincidente(s). No se crea
                un segundo hecho por error: confirma solo si es otro hecho
                económico real.
                <ul>
                  {duplicados.map((d) => (
                    <li key={d.id}>
                      #{d.id} · {date(d.fecha)} · {eur(d.importe)}
                    </li>
                  ))}
                </ul>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={aceptarCoincidencia}
                    onChange={(e) => setAceptarCoincidencia(e.target.checked)}
                  />
                  Es otro hecho económico real y no un duplicado
                </label>
              </Alert>
            )}
            <div className="actions">
              <button
                type="button"
                className="primary"
                disabled={
                  busy || (duplicados.length > 0 && !aceptarCoincidencia)
                }
                onClick={registrar}
              >
                Registrar operación
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setPlan(null);
                  setError("");
                }}
              >
                Volver a editar
              </button>
            </div>
          </section>
        )}

        {!plan && (
          <div className="actions">
            <button type="submit" className="primary" disabled={busy}>
              Vista previa
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => go("/movimientos")}
            >
              Cancelar
            </button>
          </div>
        )}
      </form>
    </div>
  );
}