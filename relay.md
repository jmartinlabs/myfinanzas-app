# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 1
message_id: 083b2fc5-9a38-44fa-b49f-8ae0e9e05cf2
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-10-29T08:48:37Z

## Message

# Propuesta técnica — SPEC07 opción B (solo lectura)

**Para:** Alex
**De:** OpenCode
**Base:** `main` `f69d7d2` (PR #126 Agent Relay v1; sin cambios funcionales de SPEC07)
**Decisión funcional:** option B aprobada en tracker `audit/spec04-25` (`e26ffbc`). Integra Revisión Comida en la revisión temporal de impactos de Ciclos. No es E3.5 y no autoriza código, PR ni merge.

## 1. Invariantes

- `ciclos` sigue siendo el único maestro de periodos.
- Comida aporta atribución temporal, no Gastos ni ejecución presupuestaria. No se suman importes de Comida con Movimientos.
- La referencia máxima no certifica conciliación económica; `conciliacion` sigue indicando E3.5 pendiente.
- Se conservan IDs, fechas, importes, auditoría, idempotencia, guardas de vecinos, `fotos_neto_apertura` y rollback.
- Fuente `error` → `409 REFERENCE_ERROR`; vacía/no instalada no se convierte en error.

## 2. Contrato de impacto aditivo

En `operationPlan` añadir, sin romper campos existentes:

```ts
operacionesComida: ComidaImpact[]
totalOperacionesComida: number
pageComida: number
conteosComida: {
  vigentes: number
  anuladas: number
  detalle: number
  reposicion: number
}
```

`ComidaImpact` mínimo:

```ts
{
  id, fecha, tipo, estadoRegistro,
  antes: { id, inicio, fin, mesFinanciado } | null,
  despues: { id, inicio, fin, mesFinanciado } | null,
  efecto: "temporal" | "historico"
}
```

- `movimientos`, `totalMovimientos` y `page` permanecen sin cambios.
- `pageComida` es un parámetro opcional independiente, límite 100; la huella y los totales se calculan antes de paginar.
- UI: «Movimientos afectados: N» y «Operaciones Revisión Comida afectadas: M» con listas y paginación separadas. Nunca «No hay hechos» si existen operaciones Comida afectadas.
- Si Comida está vacía o no instalada, mostrar cobertura explícita, no un cero engañoso.

## 3. Materialidad y huella

1. Calcular para cada fila de `revisionComidaRows()` su ciclo antes/después con el mismo `atDate` de Movimientos y el master propuesto.
2. Considerar afectada una fila si cambia el periodo (`id/inicio/fin/mesFinanciado`) antes/después.
3. Política recomendada:
   - **Vigente:** efecto temporal; entra en listado, conteos y huella material.
   - **Anulado:** solo histórico; se puede mostrar si su atribución cambia, pero no cuenta como efecto temporal ni invalida por sí mismo.
   - **Detalle/Reposicion:** ambos incluidos si están vigentes; conteos separados; sin suma monetaria.
4. Huella material por fila vigente afectada: `id`, `fecha`, `estadoRegistro`, periodos antes/después. No incluir `revision`, importe ni concepto, para no invalidar por ediciones sin efecto temporal.
5. Composición propuesta:

```ts
contextRevision = fingerprint([
  beforeRows,
  facts,
  {
    estado: reference.estado,
    actualAntes: contextoAntes.actual?.id ?? null,
    actualDespues: contextoDespues.actual?.id ?? null,
    comida: materialComida
  }
])
impactRevision = fingerprint([
  operacion, id, inicio, saldo, motivo, old?.revision, contextRevision
])
```

Se recomienda **no incluir el `maxDate` crudo** de Comida: un cambio de máximo sin efecto en ciclos/atribuciones no debe forzar 409. Si el producto exige consentimiento sobre la fecha mostrada, habría que incluirla y aceptar más invalidaciones.

6. Confirmación: recalcular ambas fuentes dentro de la transacción `immediate`; cualquier cambio material → `409 CONTEXT_CHANGED` sin escritura ni auditoría/ID. La página no participa en la huella.

## 4. Estados y límites

- `Vigente` y `Anulado` se muestran con `estadoRegistro` y `efecto`.
- `Detalle` y `Reposicion` se distinguen por `tipo`; ninguno se convierte en Gasto ni modifica saldos.
- Fuente instalada vacía: `disponible` sin máximo; fuente ausente: `pendiente`; fuente rota: bloqueo 409. No equiparar los tres.
- La integración no cierra AC28 completo: inversión y E3.5/conciliación siguen fuera.

## 5. Archivos y complejidad

| Archivo | Cambio |
| --- | --- |
| `apps/api/src/ciclos.ts` | DTO, cálculo de impacto Comida, materialidad, huella, paginación |
| `apps/api/src/revision-comida-ledger.ts` | Reutilización de filas; posible helper de periodo |
| `apps/web/src/Ciclos.tsx` | Sección y paginación separadas, textos de cobertura |
| `apps/api/src/cycle-operations.test.ts` | Oráculos y regresiones |

Complejidad **media**: extensión del motor de preview, no una capa nueva; sin esquema/migración. Riesgos: falsos negativos por materialidad demasiado estrecha, falsos 409 por `maxDate`, política de anulados y paginación.

## 6. Pruebas y oráculos

- **C07-F1:** C1 01/10→05/10, C2 01/11, Comida 20/10; añadir Comida 03/10 entre preview y confirmación → preview la enumera y confirmación antigua da 409, sin escrituras.
- **C07-F2:** Comida 03/10 ya existente → `totalMovimientos=0`, `totalOperacionesComida=1`, antes C1/después sin ciclo; UI no dice «sin hechos».
- **C07-F3:** fuente rota → 409 `REFERENCE_ERROR`; vacía/ausente → preview válida y cobertura distinta.
- **Materialidad negativa:** cambio de máximo de Comida fuera de los ciclos/atribuciones revisadas no invalida; cambio de fecha/estado de una operación afectada sí.
- **Anulados/Detalle/Reposición**, límites 01/10, 05/10, 31/10, ciclo omitido, vecinos, páginas >100, dos procesos, idempotencia, rollback y `fotos_neto_apertura`.
- Mantener AC28 como futuro; no declarar PASS de E3.5 ni cierre de SPEC07.

## 7. Decisiones que requieren aprobación

1. ¿Los `Anulado` afectados se enumeran solo como históricos o también invalidan la confirmación?
2. ¿Se excluye el `maxDate` crudo de la huella (recomendado) o se exige consentimiento sobre la fecha mostrada?
3. ¿Paginación independiente `pageComida` o devolver todas las operaciones afectadas?
4. ¿La integración se limita a atribución temporal, manteniendo AC28/E3.5 fuera, como se propone?

No se ha modificado código, tests, SPEC, tracker, `main` ni abierto PR. Solicito revisión y respuesta con observaciones o aprobación de esta propuesta; cualquier implementación requiere autorización expresa posterior.
