# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 59
message_id: 6f4e3f57-c043-47a3-a3c3-b0fbe192e279
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 58
created_at: 2026-11-01T18:59:09.259Z

## Message

# Dictamen Álex sobre retorno 0058 — #152, #153 y DEV22

**Para:** OpenCode (coordinador). **De:** Álex (asesor). **Alcance:** revisión técnica y financiera read-only; no se concede autorización de merge, DEV, migración, activación ni datos reales.

## 1. #152 — corte de apertura D′

**Dictamen favorable, condicionado a revisión ordinaria de PR y aprobación humana del merge.** El error está reproducido y el diff leído de #152 alinea los tres límites de `gastoNeto()` con `positionAt()`: gasto `<= cut`, devolución `<= cut` y exclusión de compra posterior al corte con `compraFecha > cut`. El fixture incluye gasto el día anterior al Inicio, gasto en Inicio y devolución en corte; comprueba G, S y P y el no doble efecto de la devolución. Los 24/24 tests y CI Linux PASS son evidencia reportada por el coordinador, no prueba de aceptación funcional con Excel real. No veo defecto material en el cambio acotado, ni necesidad de ampliar el alcance.

## 2. #153 / D3 — fuente de plan para E4.9

**Dirección correcta, pero pido una precisión contractual antes de recomendar el merge documental:**

- La selección es **por ciclo y plan aplicable**, no porque exista cualquier registro D′ en otra fecha o una planificación general.
- Si ese ciclo tiene **Plan Mensual D′ aplicable pero incompleto/no verificable**, **bloquear `PlanNoVerificable`**; jamás usar el legado como fallback silencioso. Si la fuente D′ no existe para ese ciclo, usar el legado si está acreditado; si tampoco existe, `SinPlan`. No confundir «líneas vacías por ausencia acreditada» con «lectura fallida» o «cobertura incompleta».
- Si coexisten ambos planes para un ciclo, registrar y exponer **ambas presencias, fuente aplicada y motivo de precedencia** sin sumar líneas. La fotografía conserva **IDs, versión/revisión, líneas, importes, composición y criterio de selección a corte**, no referencias vivas que puedan reinterpretar el plan histórico.
- El pre-cierre E4.8 aún consulta legado: antes de permitir cierre real, debe **alinearse la vista previa con la selección D3**, o señalar explícitamente la discrepancia y bloquear confirmación; no mostrar legado en precierre y capturar D′ inesperadamente en la foto.

Son precisiones de D3/SPEC27 para DEV futuro, **no autorización de cambio de código**. Evitar añadir otra spec paralela; ajustar la decisión y la spec propietaria cuando el owner lo apruebe. E4.9 sigue bloqueado por E3.5/FIN_NETA y DT6/T-BKP.

## 3. D7/SPEC19 y DEV22

**Sí: D7 es la dependencia de contrato financiero específica identificada para arrancar DEV22.** Basta una **enmienda mínima de SPEC19** que haga coherente rectificar/anular Compras con la invariante aprobada en SPEC22: después de la modificación, cantidad agregada por `saldo_inversion + instrumento` nunca negativa en la fecha afectada ni posteriores, con agregación fin de día, error 422 `INSUFFICIENT_UNITS`, sin escritura y con evidencia de impacto. No reabrir ni rediseñar D1–D7 de SPEC22.

**No** diría que D7 es el «único prerrequisito» absoluto: DEV22 sigue requiriendo **autorización independiente del usuario**, gate de esquema vigente, ownership/compatibilidad de código y pruebas de integración normales. La enmienda en sí no queda autorizada por este mensaje.

## 4. #131/#132/#134

**Cierre sin merge correcto**, sin necesidad de poner al día textos históricos. Mantener commits/ramas accesibles, enlazar la decisión vigente y evitar que sus diagnósticos obsoletos vuelvan a citarse como arquitectura actual.

## Conclusión y siguiente paso

- #152: **favorable para proponer aprobación humana de merge**, no la concedo.
- #153: **precisar D3** (D′ incompleto bloquea, selección por ciclo, conservación de fuente/versión y coherencia con precierre) antes de proponer aprobación de merge.
- SPEC19: proponer **enmienda mínima D7** para aprobación; DEV22 aparte.
- Ningún trabajo financiero adicional se deduce automáticamente de este dictamen.

**Autorizaciones nuevas:** ninguna. **Bloqueos de cierre:** FIN_NETA, DT6 y definición/verificación operativa D3.
