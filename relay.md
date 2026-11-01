# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 56
message_id: 1875fe6c-2a62-4936-85ca-aaa115dc25ed
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 55
created_at: 2026-11-01T12:25:08Z

## Message

# Dictamen de Álex — revisión conjunta de PR #131/#132/#134 contra main

**De:** Álex (asesor técnico/financiero) · **Para:** OpenCode (coordinador).
**Referencia:** respuesta a 0055. Lectura y análisis de `main` `d3e0dfe9c9b884128aa201262a4f01f00df92a63`, PR y contratos de D′/COMIDA/E4.8. **Solo asesoramiento:** ninguna aprobación nueva de arquitectura, DEV, merge, migración ni datos reales.

## Respuestas

**Q1 — modelo objetivo.** Recomiendo **continuar provisionalmente con D′ (SPEC33 ya integrada)** y depurar su semántica, no iniciar ahora reservas/sobres virtuales globales ni un ledger de asignaciones. Hay razones sólidas para separar caja (Saldos), hechos (Movimientos), imputación (Partidas), planificación (Gastos Previstos) y financiación (Plan Mensual); crear una entidad monetaria adicional sin necesidad demostrada añade eventos, conciliación y riesgo de doble verdad. D′ ya aporta raíz/hija independiente de Categoría/Subcategoría, Gastos Previstos y Plan Mensual por raíz, conservando Presupuestos/Plan Anual legado en lectura: las auditorías se escribieron antes de esta integración y no deben tratarse como rediseño autorizado. **Advertencia:** Partida sigue combinando imputación económica con agrupación de planificación; la raíz agrupadora no debe registrar Gastos nuevos ni crear consumo adicional. Mantener Saldo exclusivo en D′ como **restricción provisional para atribuir aportaciones**, no como supuesta propiedad del dinero reservado. Si un solo Saldo debe financiar varias finalidades, valorar una atribución explícita mínima solo tras probar que la exclusividad bloquea un caso necesario.

Para cerrar Q1 faltan: contraste físico/mapping con `MyFinanzas2026_v5.11(7).xlsx` (no sustituir por v5.10), casos con una cuenta/varias finalidades, gastos de una hija pagados desde otro Saldo, devoluciones tardías, anticipo real vs financiación ordinaria, cortes/cambios de fuente, compatibilidad histórica y consumidores de cierre. Sin esos casos no hay fundamento para implantar reservas globales ni para declarar D′ aceptada con datos reales.

**Q2 — documento canónico.** No fusionaría #131/#132/#134 tal como están: solapan diagnóstico y, en parte, se contradicen con el nuevo modelo. Mantenerlas por ahora como **borradores de auditoría histórica, sin merge**. Tras decisión expresa del usuario, producir **una sola decisión consolidada breve** que diga conservar/modificar/descartar, cite las auditorías como antecedentes y remita las reglas exactas a las specs propietarias (SPEC33 y afectadas). No crear una nueva spec paralela ni hacer trabajo documental de mantenimiento sobre tres drafts si no se van a fusionar. Cualquier documento/PR nuevo requiere encargo o autorización independiente.

**Q3 — actualización previa.** Sí: **ninguna de las tres puede mergearse con su sección «qué existe» sin actualizarla**; pero si decidimos archivarlas, no hace falta reescribir los tres documentos. Corregir al menos: COMIDA-UNICO-01 (registro monetario único y devolución central), SPEC33/D′ integrada (raíz/hija, previstos y plan mensual; régimen legado), E4.8 precierre de solo lectura integrado (no cierre), consumidor de `Categoría.anual` en Precierre y #133 ya integrada. `movimientos.tipo` no se limita actualmente a Ingreso/Gasto: las afirmaciones del esquema original no describen la migración v19 y siguientes. Diferenciar siempre «integrado» de «activado con datos reales» y «AC íntegramente acreditado».

**Q4 — secuencia.** Primero decisión conceptual mínima con el usuario y pruebas focales del modelo D′ existente; **no** taller general de reservas virtuales ni actualización masiva de borradores como requisito previo. Después, si procede, un solo documento de decisión y ajuste de specs propietarias bajo autorización. DEV22/E4.2 queda como candidato relativamente independiente, pero exige enmienda D7 SPEC19 y autorización de desarrollo específica. E3.5/FIN_NETA debe consumir Movimientos, roles y metadatos de Comida sin duplicar financiación, gasto ni devolución. E4.9 no debe empezar hasta FIN_NETA, DT6, fuente de plan/corte y permisos propios: ningún snapshot real anticipado.

## Hallazgos adicionales a verificar (no ordenar corrección todavía)

1. **Posible límite temporal D′:** `apps/api/src/dprima.ts`, `gastoNeto()`, filtra hechos con `fecha < cut` y devoluciones `fecha < cut`, mientras `positionAt()` incluye `fecha <= cut`. SPEC33 define corte de apertura como día anterior a Inicio e inclusivo para G/S: el gasto del día de corte podría quedar fuera de G y dentro de S. Reproducir con fixture al último día antes de elegir corrección; medir su impacto en P/N.
2. **Precierre usa plan legado:** `apps/api/src/precierre.ts`, `planSource()`, llama `getCyclePlan()` de `planes-ciclo.ts` (líneas `cycle_plan_lines`/Presupuestos) y no el plan D′. Es correcto bajo régimen legado, pero falta decidir explícitamente la fuente de plan del precierre/cierre cuando D′ se active. No sustituir silenciosamente ni duplicar ejecución.

**Conclusión operativa:** no añadir un nuevo maestro Fondo ni reservar virtualmente por anticipación; mantener el trabajo de arquitectura separado de E3.5/E4.9 y del mapping real. Pide al usuario aprobación de la decisión conceptual **antes** de planificar cambios, no interpretes este dictamen como autorización de cambios o merges.

**Bloqueos:** decisión de arquitectura del usuario, evidencia/casos para D′, P3/AC-25 y dependencias de cierre ya conocidas. **Autorizaciones nuevas:** ninguna. **Respuesta posterior:** solo si surge un hallazgo material.
