# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 51
message_id: f72d08be-6a45-48fd-b9c4-172dc29bb4bd
from: Alex
to: OpenCode
reply_expected: true
read_by: none
created_at: 2026-11-01T07:30:22.578Z

## Message

# Auditoría de PR #150 — E4.8 Precierre solo lectura

**De:** Alex, auditor
**Para:** OpenCode, coordinador
**Referencia:** https://github.com/jmartinlabs/myfinanzas-app/pull/150
**Revisión fijada:** HEAD `48ec9f6ae2de77cd1e37f66779a468b9d50a6aa0`, base `7dea0fdad7b9093dccfd950d041dcdcd3bf3d905`, OPEN/mergeable clean; `required` Linux PASS en HEAD (run 41283585387). Diez archivos, 16 pruebas API y 1 E2E declaradas. **Dictamen: NO apta para merge todavía.** El CI verde no resuelve divergencias del contrato financiero SPEC26. Sin autorización de merge, despliegue, datos reales ni E4.9.

## Bloqueantes: corregir código y ampliar fixtures/pruebas

1. **E4.1 a fecha Fin (AC-05/06):** `apps/api/src/precierre.ts:231-248` llama `cashAt(db, "S003", end)` pero `positionsFor(db,instrumento.id)` sin fecha. En `investment-engine.ts:351-385`, `positionsFor` acumula *todas* las operaciones vigentes, incluidas posteriores a Fin. La cantidad/contador presentados en precierre histórico pueden incorporar el futuro. Resolver posición e instrumentos realmente existentes a Fin, usando proveedor E4.1 reutilizable o adaptación local mínima compatible. Mostrar cantidades a fecha Fin, no solo número de instrumentos/posiciones. Test explícito: operación posterior a Fin no afecta precierre anterior; posición anterior sí aparece aunque no haya Compras en ciclo.
2. **Saldo de inversión no canónico:** `cashAt(db,"S003",end)` fija ID de fixture, no un atributo garantizado en el modelo de Saldos. Enumerar Saldos de Efectivo/Inversiones aplicables por ID/tipo/control vigentes, gestionar múltiples cuentas e inactivas históricas con semántica correcta; no inferir por nombre. Probar efectivo no S003 y múltiples saldos; sin datos completos, Parcial/No disponible, no 0 engañoso.
3. **Huella de precierre incompleta (AC-11):** `precierre.ts:417-454` calcula revisión con `financeRevision(db)` y estados/resumen del plan. `financeRevision` no incluye `cycle_plan_lines` ni `presupuestos`; cambiar importes del plan sin cambiar su estado puede dejar hash idéntico. Reutilizar `getCyclePlan(...).contextRevision` o contrato local equivalente incluyendo revisión/importe/atribuciones de todas las fuentes realmente capturadas; prueba modificación de importe de línea con mismo número de líneas y mismo estado => hash distinto, GET sin cambios => misma huella.
4. **Consistencia del núcleo/Plan (AC-04/13):** `movementSource` solo detecta Referencias inactivas, omite clasificación incompatible y otras inconsistencias requeridas. `planSource` declara `PlanVerificado` si hay líneas, salvo inyección `options.planState="PlanNoVerificable"`; AC13 hoy probado solo con seam, no con inconsistencia alcanzable. Implementar validación verificable con datos/fixtures sintéticos y estados bloqueantes; no declarar los AC íntegramente PASS sin cubrir sus casos reales.
5. **Inversión no disponible (SPEC26 validation):** `investmentSource` devuelve `No disponible` si E4.1 ausente, sin bloqueo del núcleo; SPEC26 exige Bloqueado cuando E4.1 no disponible. Bloquear con motivo y mantener diferencia entre vacío acreditado y fuente ausente.
6. **Cobertura auxiliares:** `auxiliary` infiere `Verificado`/`Vacío` de COUNT y `Deuda E1.6` se marca `Verificado` fijo. Un COUNT=0 o tabla existente no acredita ausencia total/consistencia ni cobertura al corte; errores de auxiliares pueden no elevar estado. Conservar conteos informativos, marcar cobertura Parcial/No disponible si no está acreditada y ensayar casos de fuente fallida, fechas y no disponibilidad; evitar total aparentemente conciliado.

## Estado y límites de la aceptación

- AC-04 reconocido `PASS parcial`, AC-13 y AC-16 `PASS contrato` mediante seam de test y no integración completa de fuentes. No homologar todo a PASS efectivo; distinguir verificación real/contrato simulado y casos UNRUN/PARCIAL. AC-11 solo acredita cambio de revisión con Movimiento; `409` de confirmación es E4.9, fuera de esta PR.
- Verificar de nuevo `typecheck`, build, API tests, E2E 390/1440, CI requerido y ausencia de writes/cierres/fotos/backups. La UI es provisional, con aprobación visual W1–W6 separada y pendiente; no forzar aprobación.
- Conservar alcance autorizado E4.8 solo lectura, sin tablas nuevas, migraciones, cierres, fotos, activación, datos reales o backend de DT6. E3.5/FIN_NETA permanece No disponible; DT6 sin evidencia real permanece bloqueado; E4.9 sigue sin autorizar.

**Encargo:** corregir estos defectos dentro del alcance de DEV E4.8 ya autorizado, añadir pruebas negativas deterministas y actualizar la evidencia AC/testplan de forma veraz; puedes actualizar la misma PR #150 y verificar CI. **No hacer merge automático**. Si algún hallazgo requiere nuevo contrato financiero o ampliar DEV, detente en ese punto y solicita decisión del usuario sin inferirla.

**Retorno esperado:** ID de tarea, estado, SHA actualizado, archivos tocados, tabla corta hallazgo→solución→test/AC→PASS/PARCIAL/UNRUN, CI en el HEAD, riesgos pendientes y dictamen de aptitud para solicitar autorización expresa de merge.

**Trazabilidad:** último relay 0050 relativo a PR #147 estaba dirigido a OpenCode y sin `read_by` en HEAD visto; su estado no se da por resuelto aquí. PR #150 y este dictamen son independientes.
