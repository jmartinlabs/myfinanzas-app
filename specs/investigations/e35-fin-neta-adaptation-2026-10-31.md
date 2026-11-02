# E3.5 / FIN_NETA — análisis de adaptación al registro único de Comida

Fecha: 2026-10-31; actualizado 2026-11-02. Autor: orquestador OpenCode. Base: `main`
`c827d4c`. Estado: **análisis de viabilidad y plan técnico pre-DEV** (§1–§9 conservan el
análisis original; §10–§16 añaden el plan). No implementa DEV, no define fórmulas nuevas, no
usa datos reales y no autoriza migración, activación, despliegue ni cierre. No reabre DEV18
ni las decisiones D-01…D-11 ratificadas. Las secciones §10–§16 no sustituyen la enmienda
normativa de SPEC16.

Contexto: [roadmap E3.5](../roadmap.md#e35--comida-por-ciclo-y-compensaciones),
[SPEC16](../16-revision-comida-specification.md),
[SPEC21](../21-pendientes-conciliacion-specification.md),
[referencia funcional](../functional-reference-v5.11.md).

## 1. Objetivo

Analizar cómo debe adaptarse E3.5/FIN_NETA al modelo vigente de **registro único de
Comida en Movimientos**, sin crear un segundo ledger, sin reconstruir FIN_NETA por
inferencia y sin duplicar gastos, devoluciones, financiación o reposiciones.

Este documento separa:

- lo que ya existe y está aprobado;
- lo que E3.5 necesita consumir;
- los huecos y decisiones pendientes;
- las opciones de adaptación, sin elegir una por el usuario.

## 2. Lo que ya existe

### 2.1 Registro único de Comida

- Movimientos centrales con tipo explícito `Devolución de gasto`; no hay un segundo
  gasto en Revisión Comida.
- `movimiento_revision_comida`: etiqueta analítica (`Comida`, `Pendiente revisar`,
  `Ocio`, `Niños`, `Otros`, `Fuera presupuesto`), evidencias y estado de revisión.
- `movimiento_devolucion`: vínculo devolución–compra, partida, ciclo de origen,
  elegibilidad y estado.
- `movimiento_rol_financiacion`: rol explícito **Financiación**, **Reposición** o
  **Devolución Anticipo**; la reposición exige `obligacion_ciclo`.
- `regimen_comida`: régimen fechado, corte, apertura, evidencia y cobertura.
- `movimiento_anticipo`: rol **Adelanto** o **Devolución** con referencia y evidencia.
- `comidaMetrics()` ya calcula, de forma condicional, `financing.f`, `resources`,
  `analyticsClose`, `bridge` y `position` cuando el régimen y la cobertura lo permiten.
  No es el motor E3.5 completo: faltan regímenes/cobertura, consumidores y contrato
  definitivo. DEV18 anterior sigue STOP.

### 2.2 Fórmulas ya aprobadas

SPEC16 P7 aprueba el contrato analítico, no una implementación:

- `Recursos = S0 + F + R_caja − C_n`.
- `Falta por reponer = max(C_n − R_obl, 0)`.
- `J_n` = Comida/Pendiente revisar neto elegible.
- `C_n` = Compensable neto elegible (Ocio + Niños + Otros).
- `D` = todos los Movimientos vigentes que afectan ING Comida en `[A,T]`.
- `Cierre analítico = S0 + D`.
- `Base analítica = Recursos − J_n`.
- `Otros efectos = D − (F + R_caja − C_n − J_n)`.

Este análisis **no cambia** esas fórmulas ni sus significados. Solo identifica de qué
fuente actual puede obtenerse cada entrada.

## 3. Mapeo de entradas E3.5 a datos vigentes

| Entrada | Fuente actual propuesta | Estado / hueco |
| --- | --- | --- |
| `S0` | `ciclos.saldo_comida` | Manual; ausente no es 0 |
| `F` / FIN_NETA | `movimiento_rol_financiacion` con rol `Financiación`, menos `Devolución Anticipo` en `[A,T]` | Requiere confirmar equivalencia FIN_NETA ↔ F y cobertura de roles |
| `R_caja` | Movimientos con rol `Reposición` cobrados en ING en `[A,T]` | Requiere distinguir cobro actual de obligación asignada |
| `R_obl` | Rol `Reposición` con `obligacion_ciclo` del ciclo | Requiere confirmar asignación y no sumar R_caja + R_obl |
| `C_n` | Etiquetas `Ocio`/`Niños`/`Otros` menos devoluciones elegibles de esas compras | Requiere cubrir compras sin vínculo y devoluciones de otro ciclo |
| `J_n` | Etiquetas `Comida`/`Pendiente revisar` menos devoluciones elegibles | Requiere cobertura y neto observado separado |
| `D` | Todos los Movimientos vigentes de ING en `[A,T]`, incluidos `Fuera presupuesto` | No sumar auxiliar legado ni duplicar devoluciones |
| `B_A` / `B` | Régimen/apertura y Movimientos desde el corte | Solo con cobertura; no copiar a S0 |
| `FIN_NETA` | No se almacena como cifra propia; `comidaMetrics()` calcula `F` condicionalmente | No reconstruir por inferencia; debe salir de F o de un proveedor explícito |

**Equivalencia propuesta, a confirmar:** `FIN_NETA` es la financiación ya neta de la
devolución de Anticipo; en P7 corresponde a `F`. Si el usuario o una spec posterior
definen otra fuente, prevalece esa definición.

## 4. Invariantes que la adaptación debe conservar

1. **Un solo hecho económico:** Comida no crea un segundo Gasto; Revisión Comida es
   capa analítica sobre Movimientos.
2. **Devolución de Anticipo una sola vez:** si está dentro de F/FIN_NETA, no se resta
   otra vez de Recursos ni se vuelve a descontar como Devolución de gasto.
3. **Devolución comercial no es Ingreso:** reduce J_n/C_n solo con elegibilidad y
   vínculo; no se suma como entrada ordinaria.
4. **Comida no se resta de Recursos:** J_n es consumo; Recursos usa F, R_caja y C_n.
5. **Reposición no es financiación:** R_caja y R_obl no se suman entre sí; una es caja
   y otra obligación asignada.
6. **Fuera presupuesto:** afecta al banco/D, pero no a C_n ni al análisis presupuestario.
7. **Agregado legado vs detalle:** no sumar ambos; si no hay cobertura, parcial/no
   disponible, nunca 0.
8. **Ciclo y fecha:** usar Ciclos y fecha real; una devolución antigua no reduce la
   obligación actual.
9. **Faltante ≠ 0:** sin S0, B, cobertura o rol, la métrica afectada es no disponible.

## 5. Huecos y decisiones pendientes

1. **Fuente de FIN_NETA:** SPEC16 P7 ya fija `F` como financiación ordinaria menos
   Devolución Anticipo, con rol explícito. La opción A es la recomendada para revisión;
   no es una decisión nueva aprobada ni autoriza DEV. No se acepta inferir por nombre,
   importe o fecha.
2. **Rol de cada Transferencia:** ¿qué hacer si una transferencia de ING no tiene rol
   declarado? Cobertura parcial/no disponible, no asignación silenciosa.
3. **Doble vínculo Anticipo:** coherencia semántica, no igualdad literal.
   `movimiento_anticipo` es la atribución canónica al Anticipo (Referencia, par y
   orientación). `movimiento_rol_financiacion` aporta la función analítica de Comida;
   no tiene Referencia ni el mismo vocabulario (`Devolución` frente a
   `Devolución Anticipo`). Para el mismo ID de Movimiento se exige: atribución de
   Anticipo acreditada, Transferencia real saliente elegible de ING, función
   `Devolución Anticipo` compatible, revisión y evidencias vigentes, y **una sola
   deducción**. Los conflictos se tratan como cobertura parcial/no disponible y su
   contrato se especifica antes de DEV. No añadir FKs ni columnas sin permiso.
4. **Reposiciones:** confirmar que `obligacion_ciclo` identifica la obligación y que
   R_caja/R_obl no se suman; qué pasa con reposiciones sin asignación.
5. **Compensable:** confirmar que solo Ocio/Niños/Otros entran en C_n y que
   `Fuera presupuesto` queda fuera aunque afecte al banco.
6. **Devoluciones:** qué vínculo mínimo acredita elegibilidad; qué ocurre con compras
   agregadas de Terminal, devoluciones sin compra y devoluciones de otro ciclo.
7. **Cobertura histórica:** qué intervalo y fuentes se consideran completos; cómo se
   representa el legado sin reconstruir FIN_NETA.
8. **S0/B/C:** confirmar que C y B son los de P3 y que S0 sigue siendo manual; no
   arrastrar S0 ni convertir B en S0.
9. **Ubicación normativa:** ¿enmienda de SPEC16 o nueva SPEC18? No se crea una spec
   nueva sin aprobación; este documento no decide.

## 6. Opciones de adaptación

### Opción A — capa analítica de solo lectura sobre lo vigente

E3.5 consume Movimientos, metadatos, devoluciones y roles explícitos; calcula F,
R_caja, R_obl, C_n, J_n, D y cobertura. No crea tablas de hechos ni un segundo ledger.

- **Recomendada por el auditor para revisión**, no aprobada ni autorizada para DEV.
- Ventaja: conserva el registro único y evita duplicación; `comidaMetrics()` ya tiene
  una base parcial de P7.
- Límite: depende de que los roles y vínculos estén completos; sin ellos, parcial.

### Opción B — proveedor explícito de FIN_NETA

Un proveedor autorizado entrega FIN_NETA ya neta, con evidencia y cobertura; E3.5 no
la reconstruye desde brutos.

- Ventaja: separa la financiación de la agregación.
- Límite: exige definir el proveedor y su contrato; no existe hoy.

### Opción C — agregados persistidos

Persistir totales o una posición paralela.

- No recomendada: duplica verdad, complica cierres y contradice el registro único.
- Solo tendría sentido con una spec y autorización explícitas.

## 7. Riesgo técnico observado (fuera de alcance)

En `apps/api/src/comida.ts` (~1390–1409 en `main` `2019fea`), `missing` detecta
Transferencias sin rol, pero después se usa `roles.get(r.id)!` y se evalúa `role.rol`.
Una Transferencia sin rol podría provocar una excepción en lugar de devolver cobertura
`Parcial`/`No disponible`. Es **inspección estática, no bug reproducido**. Requiere
test de regresión y corrección separada, solo con autorización de DEV; no se introduce
código en la PR documental.

## 8. Evidencia mínima antes de DEV

- Casos P7/CU-21/CU-22 con S0, F, R_caja/R_obl, C_n, J_n, D y puente.
- Devolución de Anticipo una sola vez, con doble vínculo controlado.
- Devolución comercial actual, antigua y sin compra.
- Reposición cobrada y asignada a obligación actual/antigua.
- Agregado Terminal vs detalle individual sin doble cómputo.
- `Fuera presupuesto` afecta banco pero no C_n.
- Falta S0, B o cobertura → no disponible, nunca 0.
- Ciclo abierto, sin siguiente Inicio y cruce de ciclos.

Sin datos reales; fixtures sintéticas y autorización de DEV separada.

## 9. Siguiente paso

Confirmar las decisiones del apartado 5, especialmente la fuente de FIN_NETA y el
tratamiento del doble vínculo de Anticipo. Después podrá proponerse una enmienda
documental o una spec E3.5 y, solo con autorización separada, su DEV.

Este análisis no cierra E3.5, no desbloquea E4.9 y no sustituye la evidencia DT6.

---

# Plan técnico pre-DEV — E3.5/FIN_NETA sobre registro único (2026-11-02)

Base verificada: `main` `c827d4c`. Este plan **no aprueba DEV**, no fija fórmulas nuevas y
no modifica la enmienda ratificada de SPEC16 (`16-revision-comida-specification.md:1442-1587`)
ni su testplan (`16-revision-comida-testplan.md:264-288`). Las referencias `AC-nn`
corresponden al testplan E3.5 ratificado (AC-01…AC-18); la numeración antigua se trata en
§15.5.

## 10. Inventario: qué está implementado y es reutilizable

| Capa | Evidencia | Estado | Reutilización |
| --- | --- | --- | --- |
| Ventana `[A,T]` y guarda de periodo | `apps/api/src/comida.ts:1224-1237` | Implementado (409 `PERIOD_UNAVAILABLE` sin corte) | Directa |
| `J_n` (Comida + Pendiente revisar) | `comida.ts:1180-1181,1271,1342-1346` | Implementado | Directa |
| `C_n` (Ocio+Niños+Otros neto) | `comida.ts:1182-1183,1272,1344-1347` | Implementado | Directa |
| `Fuera presupuesto` fuera de `C_n/J_n`, dentro de `D` | `comida.ts:1273-1278,1411-1415` | Implementado | Directa |
| Elegibilidad de devoluciones | `comida.ts:1283-1334` | Implementado (FIN-07 parcial) | Base, faltan causas separadas |
| `R_obl` (rol Reposición con `obligacion_ciclo`) | `comida.ts:1354-1368` | Calculado, sin envoltorio de cobertura | Parcial |
| `Falta = max(C_n − R_obl, 0)` | `comida.ts:1369-1375` | Implementado | Parcial (acoplado a cobertura de clasificación) |
| `F` = Financiación − Devolución Anticipo | `comida.ts:1377-1406` | Implementado por rol/orientación | Parcial (sin guarda de doble vínculo) |
| `R_caja` | `comida.ts:1407-1410` | Implementado | Parcial (sin estado) |
| `D` | `comida.ts:1411-1415` | Implementado | Directa |
| `Recursos`, `Cierre`, `Base`, `Otros efectos` | `comida.ts:1429-1434,1489-1501` | Implementado | Directa (aritmética verificada) |
| `DIF_BANCO` | `comida.ts:1466-1487` | Implementado | Directa |
| Duración Provisional/Vencida/Real | `comida.ts:1436-1455` | Implementado (P7a) | Directa |
| Legado agregado vs detalle | `comida.ts:1503-1542` | Implementado (FIN-08) | Directa |
| Envoltorio `metric()` valor/subtotal/estado/motivo/ids | `comida.ts:1185-1215` | Base de FIN-10; `partial/subtotal` sin uso | Parcial |
| Esquema de Comida v19 | `apps/api/src/comida-schema.ts:90-291` | Tablas, CHECKs, triggers, auditoría, idempotencia | Directa |
| Huella de financiación | `apps/api/src/movement-ledger.ts:74-179` | Incluye las 4 tablas de Comida | Materia prima de FIN-12 |
| Escritura E3.4 (metadata/devolución/rol/régimen) | `comida.ts:410-900,970-1145` | Implementado con idempotencia y auditoría | Se conserva; no se modifica |
| Tests P5/P6/P7 y H-SPEC16-02 | `apps/api/src/comida.test.ts:191-1533` | PASS registrados en ejecuciones locales previas; no reejecutados en esta PR documental | Base de regresión |

Conclusión: **la aritmética P7 y el esquema son reutilizables en su mayor parte**; lo que
falta es el contrato de estados/cobertura, `R_obl` como magnitud, la guarda del doble
vínculo de Anticipo, el proveedor FIN-12 y los consumidores.

## 11. Huecos frente a specification y testplan, por AC

| AC | Requisito ratificado | Estado en `main` | Hueco / evidencia |
| --- | --- | --- | --- |
| AC-01 | Un hecho/ID; E3.5 no crea Gasto ni saldo paralelo | Cumple por diseño: E3.5 no escribe | Falta prueba E3.5 propia (la cobertura actual es E3.4) |
| AC-02 | `F` correcta y una vez; rol ausente → Parcial/ND | `comida.ts:1377-1420,1610-1626` | `F` ya emite `Verificado`/`No disponible` con motivo e IDs; falta el estado **`Parcial`** |
| AC-03 | Doble vínculo coherente, una sola deducción | Deducción única por rol; no lee `movimiento_anticipo` | **Sin guarda**: `comida.ts:1399-1405` |
| AC-04 | Conflicto → Parcial/ND con motivo, hecho conservado | No implementado | Requiere cruce Referencia/par/evidencia (`anticipo-schema.ts:37-42`) |
| AC-05 | Transferencia sin rol no lanza excepción; Parcial/ND | Corregido en #160 (`comida.ts:1391-1396,1417-1420`; test `comida.test.ts:496-561`) | Reutilizable; falta prueba AC-05 |
| AC-06 | `R_caja` a Recursos; `R_obl` solo a Falta; no se suman; antigua no reduce Falta actual | Cálculo correcto; el caso de obligación antigua (L) sí es representable | El escenario adicional «sin `obligacion_ciclo`» **no es representable** por `CHECK` (`comida-schema.ts:229`); ver D3 |
| AC-07 | `Completada` solo con `C_n>0`, `R_obl≥C_n`, cobertura verificada y asignaciones | No existe estado de obligación | Añadir estados E3.5.3 |
| AC-08 | Grupos correctos; `Fuera presupuesto` fuera del análisis | Implementado | Falta prueba propia E3.5 |
| AC-09 | `Pendiente revisar` suma una vez en `J_n`; conceptos separados | Implementado (CU-19) | Falta prueba E3.5 |
| AC-10 | Devolución acreditada netea sin FK; no acreditada/`Revisar` no; antigua no reduce obligación actual | Implementado parcialmente | `pendingDev` agrupa causas (`comida.ts:1335-1352`); faltan motivos separados |
| AC-11 | `D` solo desde Movimientos; sin doble gasto; legado etiquetado | Implementado (D1) | Falta prueba E3.5 |
| AC-12 | S0 ausente → ND; `B_A` no se copia a S0; banco parcial/ND | `S0` siempre numérico (`cycle-schema.ts:9`) | **No representable** sin contrato de fuente; ver D2 |
| AC-13 | Vacío ≠ cero ≠ fallo; cobertura por métrica; subtotal parcial ≠ total | `metric()` acepta `partial/subtotal` (`comida.ts:1185-1215`), pero **ninguna llamada los usa** (`1627-1631`) | Parciales caen a `No disponible`; falta estado de fallo de fuente |
| AC-14 | Ejemplo numérico (Recursos 785, Falta 15, Base 585, Otros −5, Cierre 580) y subcaso `DIF_S0_SIGUIENTE`/`DIF_BANCO` | Aritmética correcta; `DIF_S0_SIGUIENTE` no existe | Ver §15.4 y §14 (D4) |
| AC-15 | E3.5 verificable; E4.9 bloquea sin foto; E3.6 sin proveedor | `precierre.ts:474-478` fija `e35: No disponible`; `estado` puede no bloquear | Contrato de integración §14 |
| AC-16 | Solo lectura; sin tablas de hechos ni totales persistidos | No hay tablas E3.5; lectura en transacción | Falta separación/guarda explícita y prueba de no-escritura |
| AC-17 | Provisional dentro del horizonte; vencido ND; duración real al existir siguiente Inicio | Implementado (P7a) | Falta prueba E3.5 propia |
| AC-18 | Nombres/magnitudes alineados; fórmulas, ventana y recálculo intactos; estado honesto | Pendiente de revisión documental | Debe resolverse con §15.5 y D1 |

Los solapes con tests existentes (P6/P7, CU-09, CU-14, CU-19, H-SPEC16-02, P7a) **no cuentan
como PASS de E3.5**: el testplan ratificado exige filas `E3.5-FIN-TP-*` propias, hoy UNRUN.

## 12. Dependencias y bloqueos, clasificados

| Tipo | Elemento | Gate / efecto | Dueño |
| --- | --- | --- | --- |
| Decisión | D1 propiedad de `/api/comida/metricas` | Bloquea AC-16/AC-18 y la UI; sin ella no se sabe si se migra, degrada o duplica la ruta | Usuario |
| Decisión | D2 `S0` ausente ≠ 0 con `saldo_comida NOT NULL` | Bloquea AC-12; opción B implicaría migración de esquema | Usuario |
| Decisión | D3 reposición sin `obligacion_ciclo` vs `CHECK` | Afecta al escenario adicional de AC-06 (no al caso L); opción B implicaría cambio de constraint | Usuario |
| Desarrollo | Estados de obligación/cobertura, `R_obl` como métrica, guarda de Anticipo, proveedor FIN-12 | Requiere autorización de DEV separada | Ejecutor autorizado |
| Desarrollo | Consumidor E3.6 (no existe) y contrato E4.9 | E3.6 no tiene código; E4.9 usa placeholder | Ejecutor autorizado |
| P3 / datos reales | Activación del régimen y equivalencia con v5.11(7) (AC-25/P3, numeración histórica de SPEC16) | Sin datos reales autorizados no se acredita; `regimenGates` ya bloquea Terminal/roles incompletos (`comida.ts:943-970`) | Usuario + ejecutor |
| Despliegue | DT6/T-BKP, Debian13/VPS | Gate de despliegue, **no** de DEV de E3.5 | Operación |
| Documental | Numeración antigua `E3.5-AC-12/13/17/39` en SPEC21 | Impacta en AC-18; ver §15.5 | Coordinador |

Ningún bloqueo de **datos o esquema** impide construir el read model: no hay tablas de totales
que migrar (FIN-11) y la huella ya existe. Los bloqueos reales son D1–D3 y la autorización de
DEV.

## 13. Secuencia mínima de implementación

Cada incremento cierra con sus AC en PASS sobre **fixtures sintéticas** y QA independiente.
Ningún AC se declara PASS por herencia de los tests P6/P7 existentes.

| Inc | Alcance | AC | Pruebas mínimas | Criterio de salida |
| --- | --- | --- | --- | --- |
| I1 | Read model de solo lectura + envoltorio de cobertura (`Verificada/Parcial/No disponible` con motivo, IDs y subtotal) + ventana `[A,T]` + decisión D1 aplicada | AC-01, AC-13, AC-16 | API focal: parcial con subtotal; fallo de fuente → ND; intento de escritura rechazado; esquema sin tablas nuevas | Cobertura por métrica y no-escritura demostradas |
| I2 | Roles, `F` y guarda del doble vínculo de Anticipo (Referencia/par/evidencia compatible; una sola deducción; conflicto → Parcial/ND) | AC-02, AC-03, AC-04, AC-05 | API focal: roles completos; transferencia sin rol; doble vínculo coherente/parcial/incompatible | `F` correcta y única; sin excepción |
| I3 | `R_caja`/`R_obl` con cobertura, estados de obligación y `Falta` | AC-06, AC-07 | API + Playwright: reposición total/parcial/tardía; obligación antigua; `C_n>0` sin reposiciones | `Completada` solo con las cuatro condiciones |
| I4 | Grupos, neteo, devoluciones por causa, `S0`/`B_A` | AC-08, AC-09, AC-10, AC-11, AC-12 | API + Playwright: causas de no elegibilidad; agregado vs detalle; S0/B_A | Cifras P7 y estados correctos |
| I5 | Duración, cierre, puente y `DIF_S0_SIGUIENTE` | AC-14, AC-17 | API + Playwright: ejemplo AC-14 y subcaso (Cierre 190, `DIF_S0_SIGUIENTE` 105, `DIF_BANCO` −150); ciclo abierto/vencido | Ejemplo ratificado reproducido |
| I6 | Proveedor FIN-12 + contratos E3.6/E4.9 + E2E | AC-15, AC-18 | Contrato del proveedor (ventana/fuente/huella/cobertura); AC-15 se acota al contrato `e4_9Bloqueado`/`No disponible`; AC-18 es revisión documental | Consumidores sin duplicar lógica y AC-15 sin depender del DEV de E4.9 |

Orden justificado: I1 fija el contrato que el resto consume; I2–I4 completan magnitudes; I5
verifica el ejemplo normativo; I6 cierra fronteras. Un incremento no empieza sin el anterior
en PASS.

## 14. Contratos de integración (sin modificar lógica ajena)

**Proveedor FIN-12 (E3.5 → E3.6/E4.9).** Read model de solo lectura que declara, por métrica:
valor, unidad, estado de cobertura (`Verificada`/`Parcial`/`No disponible`), motivo e IDs
afectados, ventana `[A,T]` y huella de las fuentes. No persiste totales, no crea tablas de
hechos y no expone escritura. La huella reutiliza `financeRevision`
(`movement-ledger.ts:74-179`), que ya cubre las tablas de Comida.

**E3.6 (SPEC21).** Consume el proveedor; no reimplementa Comida ni emite agregados propios.
Sin proveedor verificable, muestra `No disponible` con motivo y no concilia por inferencia.
Hoy E3.6 no tiene código (`precierre.ts:490` lo declara documental).

**E4.9 (SPEC27).** Bloquea el cierre sin foto cuando E3.5 requerido no sea verificable; nunca
usa Comida = 0 ni reconstruye. Contrato a confirmar en su DEV: `estado` debe ser `Bloqueado`
si `e4_9Bloqueado` es verdadero (hoy `precierre.ts:507-528` puede devolver «Listo con avisos»).
Esto es **D4**, gate del DEV de E4.9, no de E3.5.

**Mensual/anual (SPEC12/SPEC10).** Muestran los agregados de E3.5 o `No disponible`; no
recalculan netos ni crean un neto nuevo. Se conserva «Comida/compensaciones» como pendiente
hasta que el proveedor exista (`flujo-mensual.ts:344`).

**D′/SPEC33.** No consume un neto nuevo ni usa la duración provisional de Comida para cerrar
D′ (`33-dprima-simplificada-specification.md:233`). Sus fórmulas y ámbitos no cambian.

## 15. Decisiones materiales pendientes

Ninguna está aprobada. Se presentan con enunciado exacto, alternativas, recomendación e
impacto. **No reabren D-01…D-11.**

### D1 — Propiedad de `GET /api/comida/metricas/:ciclo`

- **Enunciado:** hoy esa ruta E3.4 emite agregados E3.5 (`app.ts:429-433`; consumo en
  `Comida.tsx:169`), lo que contradice SPEC21 §4.3.1 (`21-...:262-265`) y SPEC16:877. ¿Quién
  es dueño del read model y qué pasa con la ruta?
- **A (recomendada):** E3.5 es dueño; la ruta se traslada/renombra y la UI consume E3.5;
  E3.4 deja de emitir agregados.
- **B:** se conserva la ruta y se declara «E3.5 provisional» con el contrato de estados, sin
  renombrar ni mover.
- **C:** duplicar la ruta — **rechazada** (duplica fuente de verdad).
- **Impacto:** AC-16/AC-18, contrato de E3.4 y UI. Afecta a I1.

### D2 — `S0` ausente ≠ 0

- **Enunciado:** AC-12 exige «S0 ausente → No disponible», pero `ciclos.saldo_comida` es
  `INTEGER NOT NULL` (`cycle-schema.ts:9`); hoy el «ausente» solo existe en el seam de test de
  `precierre.ts:39,351,360`.
- **A (recomendada):** contrato de fuente: `regimen_comida.apertura` es la referencia y «S0
  no acreditado» se representa como régimen no activo o cobertura parcial; **sin migración**.
- **B:** permitir nulo en DEV (migración de esquema), con backfill controlado y AC-12 real.
- **C:** mantener solo el seam de test — **rechazada** (no acredita el caso real).
- **Impacto:** AC-12, I4 y, en B, migración.

### D3 — Reposición sin `obligacion_ciclo` frente al `CHECK`

- **Enunciado:** el `CHECK` impide `rol='Reposición'` sin `obligacion_ciclo`
  (`comida-schema.ts:229`), por lo que el escenario adicional de AC-06 «reposición sin
  obligación acreditada» no puede existir tal como está redactado. El caso L del testplan
  (obligación **antigua**) sí es representable y no se ve afectado.
- **A (recomendada):** conservar el `CHECK`; reformular ese escenario adicional como «rol
  Reposición sin obligación → rechazo en E3.4; E3.5 nunca la recibe» y probar el rechazo.
- **B:** relajar el `CHECK` en DEV para admitirla y tratarla como cobertura parcial.
- **Impacto:** redacción de AC-06 y prueba asociada; en B, cambio de constraint.
- **Precisión:** D-06-A ratificada admite «reposición sin obligación acreditada → cuenta en `R_caja`, no en `R_obl`». D3-A **no cambia D-06**; solo constata que el `CHECK` actual hace ese estado inalcanzable en E3.4. Si se prefiere representarlo, la opción es B, que sí requiere cambio de constraint y confirmación humana.

### D4 — Contrato de bloqueo de E4.9 (gate de su DEV)

- **Enunciado:** `precierre` puede devolver `estado = 'Listo con avisos'` con
  `e4_9Bloqueado = true` (`precierre.ts:507-528`).
- **Propuesta:** `estado = 'Bloqueado'` cuando E3.5 requerido no sea verificable, sin foto ni
  Comida = 0. Se confirma en el DEV de E4.9, no aquí; **no** bloquea el plan de E3.5.
- **Impacto:** contrato de E4.9 y su testplan; AC-15.

### 15.4 Revisión de E3.5-FIN-TP-14

- Aritmética verificada contra la enmienda: `S0=100, F=700, R=20, C_n=35, J_n=200, D=480`
  → Recursos 785; Falta 15; Base 585; Otros −5; Cierre 580.
- Subcaso: `S0=100, D=90, B_A=250, S0_siguiente=295` → Cierre 190;
  `DIF_S0_SIGUIENTE = 105`; `DIF_BANCO = −150`; son definiciones distintas y no se fusionan.
- La fila del testplan tenía **columnas duplicadas** al final (defecto de formato); se corrige
  sin cambiar contenido.
- El código actual **no asserta** `puente` ni el subcaso; ambos quedan en I5 y siguen UNRUN.

### 15.5 Hallazgo documental: numeración E3.5

| Documento | Referencia | Problema |
| --- | --- | --- |
| `roadmap.md:280-282` | `E3.5-AC1`, `E3.5-AC2`, `E3.5-AC3` | Numeración antigua de aceptación del epic |
| SPEC16 (enmienda) | `E3.5-FIN-AC-01…18` | Numeración vigente |
| Testplan E3.5 | `E3.5-FIN-TP-01…18` | Mapea 1:1 con AC-01…18 |
| SPEC21 | `E3.5-AC-12/13/17/39` «BLOCKED» | Numeración de la candidata local, **no reutilizable** (`16-...:1558-1559`); SPEC27 no cita `E3.5-AC` |

**Impacto:** AC-18 exige nombres y magnitudes alineados; hoy SPEC21 cita AC que no existen
en la numeración ratificada (no hay AC-39). Mientras no se resuelva, AC-18 no puede pasar y
las citas de SPEC21 deben leerse como históricas.

**Propuesta (no ejecutada):** tabla de correspondencia en este plan y, con autorización
específica, una nota de vigencia de una línea en SPEC21 que remita a `E3.5-FIN-AC-nn`. No
se reescriben esas specs ni se declaran AC cumplidos.

## 16. Definición de terminado y gates

**Terminado (DEV E3.5):**
1. Los 18 AC con fila `E3.5-FIN-TP-*` propia en PASS sobre fixtures sintéticas.
2. Cobertura por métrica, subtotales parciales y `No disponible` con motivo verificados.
3. Sin tablas de hechos, sin totales persistidos y sin escritura desde la capa analítica.
4. Proveedor FIN-12 con ventana, fuente, huella/revisión y cobertura; E3.6/E4.9 consumiéndolo sin
   duplicar lógica.
5. QA independiente y CI `required`; sin datos reales.

**Gates antes de autorizar DEV:**
1. Resolver **D1, D2 y D3**; D4 queda como gate del DEV de E4.9.
2. Ratificar la tabla de correspondencia de §15.5 (o aceptar el estado documental actual).
3. Autorización explícita de DEV, separada de esta preparación.
4. Mantener DEV18 antiguo en STOP: **no** se reanuda la rama histórica.

**No bloquean el DEV:** DT6/T-BKP, Debian13/VPS, datos reales ni la aprobación de otras specs.

Este plan no cierra E3.5, no desbloquea E4.9 por sí mismo y no sustituye la evidencia DT6.
