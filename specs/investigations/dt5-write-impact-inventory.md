# DT5 — Inventario de escrituras con impacto en cierres futuros

**Status: REAUDITADO CONTRA `main` `f077b7e` — documental; no implementa Cierres.**
Este informe sustituye las conclusiones de la versión `4329a99` sobre E4.1, E4.5 y
E3.5. No es una especificación de Cierres, no cierra DT3/DT4/DT6 y no autoriza DEV,
push, PR ni merge.

- Fecha: 2026-10-28 (Europe/Madrid).
- Base integrada auditada: `origin/main` =
  `f077b7e84684d9ccf79ed16805f9e8172e7576de` (`f077b7e`), esquema SQLite **18**.
- Checkout aislado: worktree temporal de OpenCode, rama local `codex/dt5-reaudit`,
  creada desde `origin/main`; no se modificó el checkout principal ni worktrees
  ajenos.
- Alcance autorizado: reauditoría documental del inventario y propuesta de
  especificaciones E4.8/E4.9. Sin código, migraciones, pruebas funcionales, CI,
  push, PR, merge ni datos reales.
- Decisiones ya aprobadas: **M1–M6** (Q2 A reforzada sin `ciclo_id`; T1/T2/T3;
  núcleo y parciales con E4.1; backup preflight; fingerprint propio; identidad
  histórica vs etiquetas).
- Gates abiertos y no cerrados por inferencia: **DT3** (ventana/corte del último
  ciclo), **DT4** (contenido/metadatos/versiones de la foto) y **DT6/T-BKP**
  (backup recuperable y restauración efectiva).

## 1. Resumen ejecutivo

1. **No existe cierre financiero implementado.** No hay tabla de cierres, fotos de
   ciclo, locks transversales ni proveedor de Cierres en el runtime. La única
   protección cercana sigue siendo la foto de Neto de apertura de Anticipos
   (`fotos_neto_apertura`) y su bloqueo de corrección cuando no hay proveedor
   verificable (`anticipos.ts:726-777`, `anticipo-schema.ts:52-54`).
2. **La pertenencia de un Movimiento a un Ciclo sigue siendo derivada por fecha.**
   `movimientos` no tiene `ciclo_id`; el ciclo se calcula contra ventanas derivadas
   de `ciclos.inicio` y del siguiente Inicio (`ciclos.ts:126-157`,
   `movimientos.ts:422`, `movement-impact.ts:91-94`). M1 confirma A reforzada: no se
   introduce `ciclo_id`; la protección se hará por ventana/fecha cerrada.
3. **Las guardas transversales siguen sin instalarse en runtime.**
   `MovementProtection`, `ClassificationGuard`, `ImpactGuard`,
   `AnnualProvider` y `AnticipoProtectionProvider` existen como tipos, pero
   `main.ts:21-24` crea la app solo con `key` y `origin`. Las pruebas los instalan
   artificialmente.
4. **E4.1 ya está integrada** en `156a50d`, esquema 18. Hay instrumentos, compras,
   efectivo de bróker, cantidades y posiciones derivadas. **E4.3 no está integrada**:
   valoración, resultado y patrimonio siguen `No disponible`. **E3.5/Comida y
   FIN_NETA no están integrados**: `No disponible`.
5. **`financeRevision` ya incluye `operaciones_inversion`**, pero no es una foto
   financiera. No incluye necesariamente instrumentos, planes, presupuestos,
   Revisión Comida, participantes/ficha de Compartidos ni la tabla `payroll`
   completa. Es una huella técnica de concurrencia; no sustituye la foto de cierre.
6. **AC36 de Anticipos sigue PARCIAL.** El servicio define el proveedor, pero no hay
   opción en `AppOptions` ni cableado HTTP; el proveedor real de Cierres no existe.
7. **Los futuros con escritura siguen separados:** E4.2 (Ventas) está aprobada
   documentalmente y no implementada; E4.4 (Deuda/conciliaciones) solo documento;
   E4.3 y E3.5 no implementadas; E4.5 y E3.6 son fuentes de solo lectura sin código.

## 2. Método, definiciones y límites

### 2.1 Método

- Enumeración de todas las ramas POST/PATCH de `apps/api/src/app.ts` en `f077b7e`.
- Lectura de servicios de escritura, triggers y esquemas v1–v18.
- Reauditoría específica de E4.1 (`compras.ts`, `instrumentos.ts`,
  `investment-engine.ts`, `instrumento-schema.ts`, `movement-ledger.ts`).
- Contraste con SPEC19 (E4.1 integrada), SPEC22 (E4.2 documental), SPEC17 (E4.4
  documental), SPEC20 (E4.5 documental, solo lectura), SPEC21 (E3.6 documental,
  solo lectura) y roadmap E4.8/E4.9.
- No se ejecutaron pruebas funcionales, E2E, CI, migraciones ni escrituras reales.
  «Protección actual» es lectura de código y esquema, no prueba de comportamiento.

### 2.2 Definiciones

- **`Ciclo(fecha)`**: ciclo cuya ventana derivada contiene la fecha. No es FK.
- **`Ciclos posteriores`**: ciclos cuyas posiciones acumuladas, arrastres o fotos
  futuras pueden incluir el hecho o su efecto.
- **`Todos(REF)`** / **`Todos(nodo)`**: todos los ciclos con hechos de una Referencia
  o de una cadena de clasificación.
- **`Ejercicio`**: año natural del Plan Anual, no el ciclo financiado.
- Efectos: `[LEDGER]` escribe `movimientos`; `[INVERSIÓN]` persiste una operación
  de inversión; `[DERIVADO]` calcula/reporta desde datos existentes;
  `[ATRIBUCIÓN]` metadatos de reparto/neto; `[PLAN]` planificación; `[MAESTRO]`
  identidad/configuración sin importe propio.
- **Huella técnica**: `financeRevision`/fingerprint de concurrencia.
- **Foto financiera**: valores persistidos e inmutables del cierre. No son lo mismo.

### 2.3 SHAs y fuentes

| Fuente | SHA / referencia | Uso |
| --- | --- | --- |
| `main` integrado | `f077b7e` | Rutas, servicios, esquema 18, triggers |
| E4.1 Instrumentos/Compras | integrada `156a50d`; `main` `f077b7e`; esquema 18 | Runtime real |
| E4.2 Ventas | SPEC22 documental en `f077b7e`; DEV no iniciado | Contrato futuro con escritura |
| E4.3 Valoración/resultados | Sin código; `saldos.ts:112` deja la posición en `pendiente_motor` (motivo «no disponible hasta E4.3»), `movimientos.ts:700` y `instrumentos.ts:429-431` muestran el motivo/estado | Futuro no implementado |
| E3.5 Comida/FIN_NETA | Sin código en `f077b7e` | Futuro no implementado; `No disponible` |
| E4.4 Deuda completa | SPEC17 documental en `f077b7e`; sin implementación | Contrato futuro con escritura |
| E4.5 Histórico/precontrol | SPEC20 documental en `f077b7e`; sin código; solo lectura | Fuente de lectura, no escritura |
| E3.6 Pendientes/conciliación | SPEC21 documental en `f077b7e`; sin código; solo lectura | Fuente de lectura, no escritura |
| E4.8/E4.9 | `roadmap.md:374-391`; DT5 `:458` | Propuesta separada [dt5-e48-e49-specification-proposal.md](dt5-e48-e49-specification-proposal.md) |

## 3. Clasificación de fuentes

| Ámbito | Estado en `f077b7e` | Qué existe | Qué no existe |
| --- | --- | --- | --- |
| Movimientos, Ciclos, Saldos, Clasificación, Referencias | Integrado | Rutas, servicios, triggers, auditoría, revisiones | Guarda de cierre |
| Anticipos | Integrado | Ficha, foto REF+Ciclo, acreditación, bloqueo sin proveedor | Proveedor de Cierres; AC36 completo |
| Compartidos y D5 | Integrado | Ficha, participantes, reparto, aportación | Guarda de cierre |
| Comida E3.4 (Revisión) | Integrado | Registros Detalle/Reposición, rectificación, anulación, vínculo | Efecto en ledger; E3.5/FIN_NETA |
| Deuda E1.6 | Integrado | Alta/edición, apertura, bloqueo si usada | E4.4 con escrituras y conciliaciones |
| Plan de Ciclo, Plan Anual, Nómina, Presupuestos | Integrado | Escrituras de planificación/atribución | Proveedor real de Cierres |
| **Inversión E4.1** | **Integrado** `156a50d`; 6 AC PARCIAL | Instrumentos, Compras, efectivo, cantidades, posiciones derivadas | Ventas E4.2; valoración/resultado/patrimonio E4.3; proveedor de Cierres |
| Ventas E4.2 | Documental aprobado; DEV no iniciado | SPEC22/testplan; 45 AC UNRUN | Código, esquema de Venta, escrituras |
| Valoración E4.3 | No implementado | `No disponible` explícito | Cálculo/valoración/resultado/patrimonio |
| Comida E3.5 | No implementado | Nada runtime | `comida-ciclo`, `FIN_NETA`, CIERRE analítico |
| Deuda E4.4 | Documental **en revisión; no aprobada**; sin implementación | SPEC17; prevé POST/PATCH de Deuda y conciliaciones | Código, SQL, migración; aprobación documental |
| Histórico E4.5 | Documental **aprobada**; sin código | SPEC20; GET de solo lectura; sin POST/PATCH/DELETE | Implementación; no es escritura |
| E3.6 | Documental **aprobada**; sin código | SPEC21; GET de solo lectura; sin escritura | Implementación; no es escritura |
| Cierres E4.8–E4.11 | Futuro | Roadmap y propuesta DT5 | SPEC26/27; tablas; locks; proveedor; fotos |

## 4. Matriz de escrituras

### 4.1 Núcleo: Movimientos, Ciclos y Saldos

| Ruta / servicio | Escritura | Periodo afectado | Efecto | Protección actual | Dependencia DT5 | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /api/movimientos` → `writeMovement` | `INSERT movimientos` + auditoría + intento + metadatos Anticipo/Compartido | `Ciclo(fecha)`; posiciones y ciclos posteriores | `[LEDGER]` alta | Sesión/CSRF; transacción; validación; revisión/duplicados; `MovementProtection` opcional **no instalada**; foto Anticipo | T1: bloquear si la fecha cae en ventana cerrada | `app.ts:957-969`; `movimientos.ts:830-989`, `:926-947`; `main.ts:21-24` |
| `POST /api/movimientos/:id/rectificar` → `writeMovement` | `UPDATE movimientos` (incluida `fecha`) + auditoría + metadatos | Ciclo antiguo/nuevo; ciclos posteriores | `[LEDGER]` cambia importe, tipo, fecha, saldo, Partida, Referencia o deuda | Revisión/motivo/huella; guarda Anticipo; **sin frontera de ciclo ni cierre** | T1: bloquear si fecha antigua o nueva cae en ventana cerrada | `app.ts:970-1002`; `movimientos.ts:905-924`, `:613`, `:946-953` |
| `POST /api/movimientos/:id/anular` → `writeMovement` | `UPDATE anulado=1` + auditoría + retirada de metadatos | Ciclo del hecho; posteriores | `[LEDGER]` excluye el hecho | Revisión/motivo; anulado inmutable; guarda Anticipo; sin cierre | T1 | `app.ts:970-1002`; `movimientos.ts:900-904`, `:946-953`; `movement-schema.ts:24-26` |
| `POST /api/ciclos` → `createCycle` | `INSERT ciclos` + auditoría + intento | Ciclo nuevo; **Fin del ciclo anterior**; asignación de hechos | `[DERIVADO]` abre ventana y fija S0 manual | Trigger append-only; duplicado/chronología; `contextRevision`; sin cierre | M1: ventana finita; no alterar cierre anterior | `app.ts:554-563`; `ciclos.ts:233-353`; `cycle-schema.ts:12-17` |
| `POST /api/ciclos/omitido` y `/:id/rectificar` → `writeCycleOperation` | `INSERT/UPDATE ciclos` + `cycle_audit` | Ciclo, anterior/siguiente y hechos cuya ventana cambia | `[DERIVADO]` cambia Inicio, S0 y Fin anterior | Trigger revisado; vecinos/duplicado; solo foto Anticipo; sin cierre | T1: bloquear cambio de ventana/S0 de ciclo cerrado | `app.ts:564-590`; `ciclos.ts:416-447`, `:574-683`; `cycle-operation-schema.ts:8-10` |
| `POST /api/saldos` → `createSaldo` | `INSERT saldos` + auditoría + idempotencia | Ciclos futuros/actuales | `[MAESTRO]` | Validación; sin cierre | T2/T3 según atributo | `app.ts:263-272`; `saldos.ts:320-380` |
| `PATCH /api/saldos/:id` y estado → `updateSaldo` | `UPDATE saldos` + auditoría | Todos los ciclos con hechos del Saldo; liquidez/control | `[MAESTRO]`/`[DERIVADO]` | Revisión; `saldoHasEconomicUse` bloquea cinco campos si hay movimientos **o inversión**; `ImpactGuard` no instalado; `liquidez`, `bolsa`, `finalidad` y `estado` pueden cambiar sin bloqueo; `nombre` es etiqueta | T2 para liquidez/bolsa/finalidad/estado (afectan métricas históricas); T3 para nombre versionado | `app.ts:1091-1118`; `saldos.ts:383-430`; `movement-ledger.ts:141-170`; `flujo-mensual.ts:301-311` |

### 4.2 Planes, Presupuestos y Nómina

| Ruta / servicio | Escritura | Periodo | Efecto | Protección actual | Dependencia DT5 | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /api/planes-ciclo/:id/confirmar` → `confirmCyclePlan` | `INSERT/UPDATE cycle_plans` + líneas + auditoría | Ciclo planificado | `[PLAN]`; no ledger | Huella/contexto/revisión; sin proveedor de Cierres | T2: plan vivo auditado, foto intacta | `app.ts:538-547`; `planes-ciclo.ts:386-475` |
| `POST /api/plan-anual/:year/confirmar` → `confirmAnnualPlan` | `INSERT/UPDATE annual_plan_lines` + auditoría | `Ejercicio` y ciclos del año | `[PLAN]` | `AnnualProvider` opcional; runtime sin proveedor; huella/idempotencia | T2; proveedor real de Cierres | `app.ts:505-517`; `plan-anual.ts:31-54`, `:455-467`, `:501-585` |
| `POST /api/nomina/confirmar` → `confirmPayroll` | `INSERT/UPDATE payroll` + `payroll_allocations` + auditoría | Pagas/meses | `[ATRIBUCIÓN]`/`[DERIVADO]`; no ledger | Contexto/huella; sin cierre | T2; capturar si hay hechos | `app.ts:478-486`; `nomina.ts:338-500`; `flujo-mensual.ts:136`, `:237-258` |
| `POST /api/presupuestos` → `createBudget` | `INSERT presupuestos` + auditoría | Ciclos futuros/año | `[PLAN]` | Validación; sin cierre | T2 | `app.ts:602-610`; `presupuestos.ts:203-260` |
| `PATCH /api/presupuestos/:id`, `rectificar`, estado → `updateBudget`/`changeBudgetState` | `UPDATE presupuestos` + auditoría | Ciclos con Partidas | `[PLAN]`/`[DERIVADO]` | Revisión; triggers de configuración usada; sin cierre | T2 | `app.ts:627-680`; `presupuestos.ts:265-411`; `budget-schema.ts:23-24` |

### 4.3 Auxiliares: Referencias, Anticipos, Compartidos, Comida y Deuda

| Ruta / servicio | Escritura | Periodo | Efecto | Protección actual | Dependencia DT5 | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /api/referencias` → `createReference` | `INSERT referencias` + ficha 1:1 + auditoría | Todos(REF) futuros | `[MAESTRO]` | ID estable; tipo/ficha; sin cierre | M6: ID + versión del nombre en foto | `app.ts:732-741`; `referencias.ts:184-311` |
| `PATCH /api/referencias/:id` y estado → `updateReference` | `UPDATE referencias` (+ ficha Vehículo) + auditoría | Todos(REF) | `[MAESTRO]`; tipo/estado/nombre | Tipo bloqueado si hay hechos/ficha; renombrado permitido; sin cierre | T2 identidad; T3 nombre versionado | `app.ts:742-804`; `referencias.ts:314-547`; `reference-schema.ts:55` |
| `POST /api/anticipos/fichas` → `createAnticipo` | REF + `UPDATE fichas_anticipos` + auditoría | Futuro del Anticipo | `[MAESTRO]` apertura/evidencia | Validación; sin cierre | T2 | `app.ts:364-373`; `anticipos.ts:606-650` |
| `POST /api/anticipos/fichas/:ref/netos-apertura` → `confirmOpening` | `INSERT/UPDATE fotos_neto_apertura` + auditoría | Ciclo explícito REF+Ciclo | `[ATRIBUCIÓN]`/`[DERIVADO]`; no ledger | Proveedor opcional; sin proveedor, corrección existente bloqueada; foto no borrable; cambio de Inicio bloqueado por trigger. `/preview` no escribe | **AC36**: conectar con Cierres; T2 | `app.ts:374-395`; `anticipos.ts:736-875`; `anticipo-schema.ts:52-54` |
| `POST /api/anticipos/.../movimientos/:id/acreditar` → `confirmAccreditation`/`storeAnticipo` | Upsert `movimiento_anticipo` + auditoría | Ciclo(fecha) | `[ATRIBUCIÓN]` | Revisión/dependencias/foto; sin cierre | T2 | `app.ts:374-395`; `anticipos.ts:709-724`, `:283-320` |
| `POST /api/compartidos/fichas` → `createCompartido` | REF + ficha + auditoría | Futuro | `[MAESTRO]` | ID estable; sin cierre | T2 | `app.ts:419-428`; `compartidos.ts:1570-1587` |
| `POST /api/compartidos/fichas/:ref/participantes` → `createParticipante` | `INSERT participantes_compartido` + ficha + auditoría | Ciclos de Gastos | `[ATRIBUCIÓN]` | Titular único; ficha activa; sin cierre | T2 | `app.ts:436-447`; `compartidos.ts:1589-1640` |
| `POST /api/compartidos/.../participantes/:cp/rectificar|baja` → `rectificarParticipante`/`bajaParticipante` | `UPDATE participantes_compartido` + auditoría | Ciclos de Gastos | `[ATRIBUCIÓN]` | Impacto/huella/motivo; sin cierre | T2 | `app.ts:451-472`; `compartidos.ts:1723-1837` |
| `POST /api/compartidos/.../movimientos/:id/acreditar` → `confirmAportacion`/`storeAportacion` | Upsert `movimiento_compartido` + auditoría | Ciclo(fecha) | `[ATRIBUCIÓN]` | Inmutabilidad tipo/REF/origen; revisión; sin cierre; `/preview` no escribe | T2 | `app.ts:396-416`; `compartidos.ts:1356-1410`; `aportaciones.ts:324-410` |
| `POST /api/revision-comida` y `/reposiciones` → `createRevisionComida` | `INSERT revision_comida` + auditoría | Ciclo(fecha); **referencia temporal global** | `[ATRIBUCIÓN]`/`[DERIVADO]`; no ledger | Validación/evidencia/vínculo; sin cierre | T2; capturar si hay hechos | `app.ts:280-315`; `revision-comida.ts:450-534`; `revision-comida-ledger.ts:41-77` |
| `POST /api/revision-comida/.../rectificar|anular|vinculo` → servicios | `UPDATE revision_comida` + auditoría | Ciclo; referencia temporal | `[DERIVADO]` CIERRE analítico/Reposiciones/Falta | Estado/annulled lock; revisión; sin cierre | T2 | `app.ts:316-361`; `revision-comida.ts:535-824`; `revision-comida-schema.ts:42-50` |
| `POST /api/deudas` → `createDebt` | `INSERT deudas` + auditoría | Desde `inicio` | `[MAESTRO]`/`[DERIVADO]` | Validación; sin cierre | T2; E4.4 futuro | `app.ts:683-692`; `deudas.ts:120-180` |
| `PATCH /api/deudas/:id` y estado → `updateDebt` | `UPDATE deudas` + auditoría | Desde `inicio`; amortizaciones | `[MAESTRO]`/`[DERIVADO]` | Inicio/apertura bloqueados si usada; nombre/estado editables; sin cierre | T2; E4.4 futuro | `app.ts:693-729`; `deudas.ts:183-236`; `debt-schema.ts:47-48` |

### 4.4 Clasificación

| Ruta / servicio | Escritura | Periodo | Efecto | Protección actual | Dependencia DT5 | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /api/clasificacion/:kind` → `createClassification` | `INSERT` nodo + contador + auditoría | Futuro | `[MAESTRO]` | ID/padre; sin cierre | T2/T3 | `app.ts:1013-1023`; `clasificacion.ts:320-400` |
| `PATCH /api/clasificacion/:kind/:id` y `rectificar` → `updateClassification` | `UPDATE` nodo + `partidas.deuda`/`presupuesto` + auditoría | Todos(nodo); puede mover agregados históricos | `[DERIVADO]`; no cambia importes del ledger | Impacto interno; `planConfigurationImpact`; confirmación/motivo; `ClassificationGuard` no instalado | **T2** con revalidación auditada; foto intacta | `app.ts:1029-1039`, `:1063-1089`; `clasificacion.ts:418-499`, `:509-599`; `movement-impact.ts:19-105` |
| `POST /api/clasificacion/:kind/:id/desactivar|reactivar` → `changeClassificationState` | `UPDATE estado` + auditoría | Todos(nodo) | `[MAESTRO]`/`[DERIVADO]` | Descendientes/padre/presupuesto; sin cierre | T2 | `app.ts:1040-1062`; `clasificacion.ts:601-663` |

### 4.5 Inversión E4.1 — integrada en `156a50d`, esquema 18

| Ruta / servicio | Escritura | Periodo | Efecto | Protección actual | Dependencia DT5 | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /api/instrumentos` → `createInstrumento` | `INSERT instrumentos` + auditoría + intento | Compras/posiciones futuras | `[MAESTRO]` | Validación; sin cierre | M6: ID + ISIN/divisa en foto | `app.ts:848-860`; `instrumentos.ts:249-313`; `instrumento-schema.ts:15-32` |
| `PATCH /api/instrumentos/:id`, estado → `updateInstrumento`/`changeInstrumentoState` | `UPDATE instrumentos` + auditoría | Todas las Compras históricas | `[MAESTRO]`/`[DERIVADO]` nombre, ISIN, divisa, estado | Revisión; **sin bloqueo por uso**; sin cierre; **no está en `financeRevision`** | T2/T3: identidad versionada; no reescribir foto | `app.ts:866-889`; `instrumentos.ts:315-419`; `movement-ledger.ts:64-139` |
| `POST /api/compras` → `createPurchase` | `INSERT operaciones_inversion` + auditoría + intento | Fecha de compra; efectivo y posiciones posteriores | `[INVERSIÓN]` hecho persistido; efecto derivado en efectivo/posición; no escribe Movimientos | Efectivo suficiente; identidad de Saldos; idempotencia; triggers; **sin cierre** | T1: bloquear compra en ventana cerrada; capturar efectivo/posición | `app.ts:897-906`; `compras.ts:502-586`; `instrumento-schema.ts:33-73` |
| `POST /api/compras/:id/rectificar|anular` → `rectifyPurchase`/`annulPurchase` | `UPDATE operaciones_inversion` + auditoría | Fecha antigua/nueva; efectivo/posiciones posteriores | `[INVERSIÓN]` hecho persistido; efecto derivado | Revisión/motivo; `assertSufficient` revalida efectivo en fechas posteriores; identidad inmutable; sin cierre | T1: bloquear si fecha antigua/nueva en ventana cerrada | `app.ts:915-927`; `compras.ts:631-748`; `investment-engine.ts:268-320` |
| `GET /api/inversiones/efectivo` → `cashAt` | Solo lectura | Fecha consultada | `[DERIVADO]` efectivo | No escribe | Foto captura el efectivo del cierre | `app.ts:834-843`; `investment-engine.ts:165-225` |
| `GET /api/instrumentos/:id` → `getInstrumento`/`positionsFor` | Solo lectura | Posición actual | `[DERIVADO]` cantidad | No escribe; valoración `No disponible` | Foto captura cantidad/posición; no valoración E4.3 | `instrumentos.ts:421-440`; `investment-engine.ts:351-389` |

**Hechos E4.1 que la foto debe capturar y proteger:** instrumentos (ID, nombre, ISIN,
divisa, estado, revisión), compras (ID, fecha, instrumento, Saldos, cantidad, precio,
divisa, cambio, importe, comisión, estado, revisión), efectivo del bróker y posición
por Saldo+Instrumento. La **cobertura histórica es parcial** (solo Compras
registradas; no hay importación histórica). La valoración/resultado/patrimonio
E4.3 no existe y debe quedar `No disponible`, no cero.

### 4.6 Contratos futuros y fuentes de solo lectura

| Fuente | Rutas / servicio | Escritura | Periodo | Efecto | Protección / estado | Dependencia DT5 | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E4.2 Ventas | Diseño `POST/PATCH /api/compras` o recurso de Ventas (SPEC22) | **Futura** `operaciones_inversion` clase Venta | Fecha de venta; efectivo/posición posterior | `[DERIVADO]`; no Movimientos | SPEC22 aprobada; DEV no iniciado; 45 AC UNRUN; D1/D2 | T1 cuando exista; E4.9 no puede capturar Ventas aún | `22-ventas-posicion-broker-specification.md:28-43`, `:109-170`; `22-ventas-posicion-broker-progress.md:3-10` |
| E4.3 Valoración | Sin código | **Ninguna** | — | `No disponible` | `saldos.ts:112` (condición `pendiente_motor`, no el literal `No disponible`); `movimientos.ts:700`; `instrumentos.ts:429-431` | E4.9 no declara patrimonio/valoración | `19-instrumentos-compras-inversion-specification.md:113-125`; `roadmap.md:326-334` |
| E3.5 Comida | Sin código | **Ninguna** | — | `No disponible`; CIERRE analítico futuro | No integrada; FIN_NETA ausente | E4.9 Comida parcial/No disponible | SPEC18 no está en `main`; `21-pendientes-conciliacion-specification.md:197-211` |
| E4.4 Deuda/conciliaciones | SPEC17 en revisión; sin código | **Futura** POST/PATCH Deuda y conciliaciones | Desde `inicio`; `fechaCorte` | `[MAESTRO]`/`[DERIVADO]` | SPEC17 exige revisión/idempotencia/auditoría; sin cierre | T2; E4.9 captura Deuda E1.6, conciliación No disponible | `17-e44-deuda-completa-specification.md:180-202`, `:600-615` |
| E4.5 Histórico/precontrol | SPEC20; sin código | **Ninguna**; GET; POST/PATCH/DELETE 405/422 | Ejercicio | `[DERIVADO]` archivo, no ledger | Solo lectura; no crea fotos/cierres | Fuente de lectura para E4.8/E4.9; no escribir | `20-historico-precontrol-specification.md:707-714` |
| E3.6 Pendientes/conciliación | SPEC21; sin código | **Ninguna**; GET | Ciclo | `[DERIVADO]` alerta/diferencia | Solo lectura; matriz DT5 preparatoria | Insumo E4.8; no locks | `21-pendientes-conciliacion-specification.md:54-58`, `:754-763`, `:907` |
| E4.8/E4.9 | Sin SPEC26/27 | **Ninguna** | — | Precierre/cierre/foto futuros | Propuesta DT5 separada | Núcleo de DT5 | `roadmap.md:374-391`, `:458` |

## 5. Protecciones actuales

### 5.1 Comunes

- Sesión, mismo origen y CSRF para todo método distinto de GET/HEAD
  (`auth.ts:162-181`).
- Transacciones `immediate`, auditoría, idempotencia, revisión optimista y
  triggers de inmutabilidad/no delete.
- Triggers relevantes: `movement-schema.ts:24-26`, `cycle-schema.ts:12-17`,
  `reference-schema.ts:55`, `debt-schema.ts:47-48`, `budget-schema.ts:23-24`,
  `cycle-operation-schema.ts:8-10`, `anticipo-schema.ts:52-54`,
  `compartido-schema.ts:127-130`, `compartido-aportacion-schema.ts:84-119`,
  `annual-plan-schema.ts:10-11`, `payroll-schema.ts:7-8`,
  `revision-comida-schema.ts:42-50`, `vehicle-schema.ts:89-96`,
  `instrumento-schema.ts:28-31`, `:58-73`.

### 5.2 Guardas y proveedores no instalados

| Punto | Contrato | Runtime | Consecuencia |
| --- | --- | --- | --- |
| Movimientos | `MovementProtection` (`movimientos.ts:36-40`, `:573-590`) | **No se pasa** (`main.ts:21-24`) | No hay bloqueo de cierre |
| Clasificación | `ClassificationGuard` (`clasificacion.ts:36-40`, `:456-462`) | **No se pasa** | Solo impacto interno; no política de cierre |
| Saldos | `ImpactGuard` (`saldos.ts:289`, `:410`) | **No se pasa** | Cobertura parcial de atributos |
| Plan Anual/Vehículos | `AnnualProvider` (`plan-anual.ts:31-46`; fallback `vehiculos.ts:14-21`) | **No se pasa** | `cierresDisponibles:false`; sin foto |
| Anticipos | `AnticipoProtectionProvider` (`anticipos.ts:726-735`) | **No existe opción en `AppOptions` ni cableado HTTP**; fallback `:772-777` | **AC36 PARCIAL** |
| Inversión E4.1 | Sin contrato de cierre | Sin guarda | Compras/rectificaciones no se bloquean por cierre |

### 5.3 `financeRevision` — huella técnica, no foto

`financeRevision` (`movement-ledger.ts:64-139`) incluye:

- `movimientos` completos.
- `movimiento_anticipo` y `fotos_neto_apertura`.
- `payroll_allocations` y `MAX(payroll_audit.id)`.
- `movimiento_compartido`.
- `deudas`, `referencias`, y **una proyección parcial de `saldos`** (id, nombre,
  tipo, control, estado, exterior, apertura, fecha_apertura, revisión; no incluye
  finalidad, liquidez, bolsa, objetivo ni manual).
- `operaciones_inversion` completas.
- `categorias`, `subcategorias`, `partidas`.
- `ciclos`.

**No incluye**: `instrumentos`, `fichas_anticipos` (apertura/evidencia),
`fichas_compartidos`, `participantes_compartido`, `revision_comida`,
`annual_plan_lines`, `cycle_plans`/`cycle_plan_lines`, `presupuestos`, tabla
`payroll` completa, ficha de Vehículo, ni auditorías generales.

Por tanto, una coincidencia de `financeRevision` **no prueba** que la foto de
cierre esté completa ni que todas las fuentes capturadas sean las mismas. M5 exige
un fingerprint propio del cierre sobre las fuentes que realmente alimenten la foto.

## 6. Consumo y ausencia del proveedor de Cierres (AC36)

| Consumidor | Qué espera | Qué hace hoy | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| **Anticipos** | `verificada`, `revision`, `bloqueos`, `procedencia` por REF+Ciclo | Servicio acepta proveedor; no hay opción en `AppOptions` ni cableado; sin proveedor, corrección existente bloqueada | `anticipos.ts:726-777`, `:801-813`; `app.ts:153-161`, `:374-395`; AC36 `13-anticipos-specification.md:318`; testplan `13-anticipos-testplan.md:116`, `:145` | **AC36 PARCIAL**; integración UNRUN |
| Plan Anual | `AnnualSources.cierresDisponibles`/`protecciones` | Fallback sin proveedores | `plan-anual.ts:31-54`, `:300-321`, `:455-467` | Sin protección real |
| Vehículos | `AnnualProvider` | `emptySources` con `cierresDisponibles:false` | `vehiculos.ts:14-21`, `:88`, `:336-388` | Sin foto/cierre |
| Movimientos | `MovementProtection` | No instalada; `pendientes: ["Cierres", ...]` | `movimientos.ts:36-40`, `:573-590`, `:808-810`; `main.ts:21-24` | Sin bloqueo |
| Clasificación | `ClassificationGuard` + impacto interno | Impacto; `pending` incluye Cierres | `clasificacion.ts:36-40`, `:442-497` | Sin política de cierre |
| Saldos | `ImpactGuard` | `saldoHasEconomicUse` cubre cinco campos y ahora inversión | `saldos.ts:289`, `:410`; `movement-ledger.ts:141-170` | Cobertura parcial |
| Flujo mensual | Posiciones/ahorro al corte | Efectivo de inversión se incluye; valoración no; `ahorroCierre` ausente | `flujo-mensual.ts:301-336` | Sin cierre; E4.3 `No disponible` |
| Inversión E4.1 | Efectivo/posición al cierre | `cashAt`/`positionsFor` disponibles; sin guarda de cierre | `investment-engine.ts:165`, `:351` | Protección futura T1 |
| Comida E3.5 | CIERRE analítico/FIN_NETA | No existe | `21-pendientes-conciliacion-specification.md:197-211` | `No disponible` |
| Deudas/Presupuestos/Planes/Nómina | Plan/atribución | Escrituras sin estado de cierre | `deudas.ts`, `presupuestos.ts`, `planes-ciclo.ts`, `plan-anual.ts`, `nomina.ts` | Sin proveedor |
| E4.5/E3.6 | Fuentes de lectura | Sin código; solo GET por contrato | `20-historico-precontrol-specification.md:707-714`; `21-pendientes-conciliacion-specification.md:754-763`, `:907` | No son escrituras |

**Conclusión AC36:** el punto de extensión de Anticipos existe, pero falta opción de
aplicación, cableado, proveedor real y prueba de integración. Una prueba con
proveedor ficticio no acredita Cierres.

## 7. Fallos y concurrencia relevantes

| # | Escenario | Estado actual | Evidencia |
| --- | --- | --- | --- |
| F1 | Mover un Movimiento a un ciclo cerrado | `writeMovement` no comprueba ventana cerrada | `movimientos.ts:888-907` |
| F2 | Crear/rectificar un Ciclo y alterar el Fin anterior | Solo foto Anticipo bloquea; no cierre | `ciclos.ts:433-447`, `:638-651` |
| F3 | Cambiar S0 de un ciclo con hechos/cierre | Permitido con motivo/revisión | `ciclos.ts:574-651` |
| F4 | Reclasificar y mover agregados de ciclo cerrado | T2 futuro; hoy solo confirmación interna | `clasificacion.ts:509-599` |
| F5 | Cambiar reparto de Compartido tras cerrar | Permitido con impacto/motivo; sin cierre | `compartidos.ts:1723-1789` |
| F6 | Corregir foto de Anticipo | Sin proveedor se bloquea; con proveedor futuro, política abierta | `anticipos.ts:772-813` |
| F7 | Rectificar/anular Compra con operaciones posteriores | `assertSufficient` revalida efectivo en fechas posteriores; posición/cantidad derivada no se bloquea por cierre | `compras.ts:588-748`; `investment-engine.ts:268-320` |
| F8 | Cambiar fecha de Revisión Comida | Puede cambiar la referencia temporal global | `revision-comida-ledger.ts:41-77`; `ciclos.ts:47-80` |
| F9 | Cambiar asignación de Nómina | Sin bloqueo por cierre | `nomina.ts:338-500` |
| F10 | Editar Plan/Presupuesto tras la foto | Sin bloqueo; foto no existe | `planes-ciclo.ts:386-475`; `plan-anual.ts:501-585`; `presupuestos.ts:265-411` |
| F11 | Cierre concurrente con escritura | `financeRevision` cubre inversión, pero no instrumentos/planes/presupuestos/Comida/participantes/payroll completo | `movement-ledger.ts:64-139` |
| F12 | Restaurar backup como reapertura | Restaura en directorio nuevo; no es reapertura auditada | `backup.ts:206-333` |
| F13 | Cierre parcial por fallo | No hay transacción de cierre | `main.ts`; servicios |
| F14 | Reintento de cierre | No hay idempotencia de cierre | `roadmap.md:458` |
| F15 | Cambiar ISIN/divisa de Instrumento con Compras | Sin bloqueo por uso; no está en `financeRevision` | `instrumentos.ts:315-419`; `movement-ledger.ts:64-139` |
| F16 | Venta E4.2 en ciclo cerrado | No implementada; el esquema actual solo admite `clase='Compra'` | `instrumento-schema.ts:35`; SPEC22 |
| F17 | Valoración/patrimonio E4.3 | No existe; no debe ponerse cero | `saldos.ts:112` (condición `pendiente_motor`, no el literal `No disponible`); `instrumentos.ts:429-431` |

## 8. Decisiones aprobadas y gates abiertos

### 8.1 Decisiones M1–M6

- **M1 — Q2 A reforzada, sin `ciclo_id`.** La pertenencia sigue derivada por
  fecha; se protegen ventanas y fechas cerradas. Cierre solo con ventana financiera
  finita y acreditada. Si falta siguiente Inicio, no se inventa Fin ni fecha manual:
  **DT3** debe resolverlo antes de habilitar el cierre.
- **M2 — T1/T2/T3.** Trazabilidad: **Q3 → T1**, **Q9 → T2**, **Q15 → T3**. T1
  bloquea hechos financieros (Movimientos, S0, ventana, Compras/rectificaciones/
  anulaciones de inversión capturadas); T2 revalida con impacto/motivo/auditoría
  (clasificación, Referencias, participantes, Anticipos, Compartidos, Deuda,
  Presupuestos, plan vivo, Revisión Comida, instrumentos, atributos de Saldo que
  afectan métricas); T3 permite descriptivo/etiquetas con versión en la foto.
- **M3 — Núcleo y parciales.** Núcleo: ventana/S0, Movimientos, plan final,
  identidad de clasificación/REF, **E4.1 instrumentos/compras/posiciones/efectivo**,
  metadatos y backup. Capturado si hay hechos: Anticipos, Compartidos, Nómina,
  Revisión Comida y **Deuda E1.6**. E4.3 valoración/patrimonio `No disponible`.
  E3.5 Comida `No disponible`. Totales parciales con motivo.
- **M4 — Backup preflight.** Fuera de la transacción; evidencia DT6/T-BKP
  verificable, incluida restauración efectiva. Sin evidencia, E4.9 no se declara
  verificable.
- **M5 — Fingerprint propio.** Debe cubrir todas las fuentes que realmente
  alimenten la foto; `financeRevision` es solo una huella técnica y no incluye
  todas las fuentes.
- **M6 — Identidad histórica.** Preservar IDs, tipo, cadena, vínculos, apertura,
  divisa/ISIN y reparto; separar nombres/etiquetas. La foto guarda ID + versión
  del nombre.

### 8.2 Gates abiertos

- **DT3:** ventana/corte del último ciclo; sin él, no hay cierre del ciclo sin
  siguiente Inicio. No cerrar por inferencia.
- **DT4:** contenido exacto de la foto, metadatos, versiones y retención. M1–M6
  orientan la propuesta, pero DT4 no se declara cerrado; E4.9 no puede aprobar el
  contenido definitivo por inferencia.
- **DT6/T-BKP:** backup recuperable, restauración efectiva, custodia y ventana.
  Sin él, E4.9 no es verificable.
- **E4.2/E4.3/E3.5/E4.4:** no implementados; no pueden declararse capturados
  como runtime. E4.2/E4.4 son escrituras futuras; E4.3/E3.5 son `No disponible`.
- **E4.5/E3.6:** documentos de solo lectura; no son escrituras a proteger.

## 9. Cobertura, omisiones y dudas

### 9.1 Cobertura

- Enumeradas las ramas POST/PATCH de `app.ts`; leídos los servicios de escritura y
  los esquemas v1–v18.
- Reauditada E4.1 integrada (instrumentos, compras, efectivo, posiciones) y
  contrastada con SPEC19/SPEC22.
- Revisados E4.4/E4.5/E3.6 como contratos futuros o fuentes de solo lectura.

### 9.2 Omisiones deliberadas

- Auth/sesiones: tablas de autenticación, no información financiera de ciclo.
- Migraciones/esquema: pueden reescribir tablas, pero no son escrituras ordinarias.
- Backup/restore: operación de reemplazo fuera de banda; no es cierre.
- Frontend: no se recorrieron todos los handlers; la fuente es el servidor.
- Tests: no se usaron como prueba de cobertura.
- E4.1: se auditó el código integrado, no cada AC de su testplan; no se convierte
  evidencia de autor en PASS de cierre.

### 9.3 Dudas abiertas

- Si `instrumentos` debe entrar en el fingerprint de cierre o solo en la foto
  (M5 recomienda ambas cosas: fingerprint + valores).
- Si `fichas_anticipos`/`fichas_compartidos` deben capturarse como identidad
  histórica además de las fotos/metadatos ya existentes.
- Si el plan vivo debe ser T2 o T3; M2 lo sitúa en T2 con foto intacta.
- Si E4.1 debe capturar también la cobertura histórica parcial como metadato de
  foto (recomendado: sí).
- Si E4.2/E4.3/E3.5/E4.4 se integran antes de E4.9; la propuesta E4.8/E4.9 los
  trata como condicionales/`No disponible`, no como ceros.

## 10. Reauditoría y revisión

- **Base anterior:** `4329a99` sobre `9977210`/esquema 17; conclusiones de E4.1
  obsoletas.
- **Base actual:** `f077b7e`/esquema 18; E4.1 integrada `156a50d`; E4.5 documental;
  E3.5 no integrada.
- **Cambios principales:** E4.1 pasa de candidato a runtime; se añaden
  instrumentos/compras/efectivo/posiciones; E4.3/E3.5 se marcan `No disponible`;
  `financeRevision` se documenta con sus huecos; M1–M6 se incorporan.
- **Revisión independiente:** pendiente de ejecutar tras esta reauditoría; no se
  declara PASS funcional.

## 11. HANDOFF → CODEX

**Tarea/sesión:** `INV-DT5` · reauditoría y propuesta E4.8/E4.9. Sesión funcional
`INV-DT5`; ejecución local OpenCode; sin chats supervisores externos.

**Estado:** reauditoría documental completada; propuesta E4.8/E4.9 redactada;
revisión independiente pendiente. Sin código, pruebas, CI, migraciones, push, PR,
merge ni despliegue.

**Base/SHA:** `main` `f077b7e84684d9ccf79ed16805f9e8172e7576de`; worktree
`/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/dt5-reaudit`;
rama `codex/dt5-reaudit`. Commit local pendiente de registrar; no publicado.

**Archivos:** `specs/investigations/dt5-write-impact-inventory.md` (actualizado);
`specs/investigations/dt5-e48-e49-specification-proposal.md` (nuevo). Sin cambios
en código, SPEC21, tablero, checkpoints ajenos ni documentos de otras entregas.

**Comprobaciones:** rutas/servicios/esquemas de `f077b7e`; E4.1 `156a50d`;
`financeRevision`; E4.2/E4.3/E3.5/E4.4/E4.5/E3.6. **UNRUN:** pruebas funcionales,
E2E, CI, migraciones, escrituras reales.

**Riesgos:** huella técnica ≠ foto; `financeRevision` incompleta para la foto;
E4.1 cobertura histórica parcial; E4.3/E3.5 `No disponible`; DT3/DT4/DT6 abiertos;
AC36 parcial.

**Decisiones necesarias:** ninguna nueva de Q1–Q16; quedan **DT3**, **DT4** y
**DT6** como gates. Cualquier cambio de alcance de la foto (por ejemplo, incluir
E4.2/E4.3/E3.5 antes de integrarse) requiere decisión expresa.

**Siguiente acción:** revisión independiente de los dos documentos; después, si el
usuario lo autoriza, convertir la propuesta en SPEC26/E4.8 y SPEC27/E4.9. No
iniciar DEV ni cerrar DT3/DT4/DT6 por inferencia.
