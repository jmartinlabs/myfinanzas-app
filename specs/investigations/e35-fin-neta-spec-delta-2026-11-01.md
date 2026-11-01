# E3.5 / FIN_NETA — delta de especificación y testplan (propuesta)

Fecha: 2026-11-01. Autor del registro: subagente ejecutor de OpenCode, por encargo del
coordinador. Base: `main` `4eb7264`.
Estado: **Aprobación conceptual del usuario el 2026-11-01 de las opciones A de D-01 a
D-11**, con las precisiones obligatorias D-04, D-07, D-09 y D-10. La **enmienda normativa
propuesta** y el **testplan definitivo propuesto** están en
[SPEC16](../16-revision-comida-specification.md) y su testplan; quedan **pendientes de
aprobación independiente**. **DEV sigue en STOP.** No se implementa, no se migra, no se
activa y no se autoriza merge. AC y filas de testplan **UNRUN**; no se afirma ejecución ni
PASS.

Contexto: [análisis de adaptación](e35-fin-neta-adaptation-2026-10-31.md),
[SPEC16](../16-revision-comida-specification.md),
[SPEC21](../21-pendientes-conciliacion-specification.md),
[SPEC27](../27-e49-cierre-financiero-specification.md),
[SPEC12](../12-flujo-mensual-specification.md),
[roadmap E3.5](../roadmap.md#e35--comida-por-ciclo-y-compensaciones) y
[referencia funcional](../functional-reference-v5.11.md).

## 0.1 Aprobación conceptual y precisiones (2026-11-01)

El usuario aprobó conceptualmente la **opción A de D-01 a D-11** con cuatro precisiones
obligatorias, ya incorporadas a la enmienda de SPEC16:

- **D-04:** solo el contrato necesario en SPEC16, sin duplicar P6/P7 ni crear una
  especificación paralela.
- **D-07:** distinguir devolución **sin vínculo** (no hay FK) de devolución **sin
  acreditación** (falta evidencia); la evidencia externa suficiente permite el neteo sin
  FK.
- **D-09:** reconciliar nombres y expresiones de SPEC21 §4.3 con P7 (`Base analítica`,
  `Cierre analítico`, `R_obl`, dos diferencias) sin descontar dos veces el compensable.
- **D-10:** definir `Completada`, `Parcial`, `No disponible` y `Sin obligación acreditada`;
  la ausencia de obligación o de reposición no acredita cumplimiento.

La aprobación es **conceptual**: no aprueba todavía el texto normativo ni autoriza DEV,
migración, activación ni merge.

## 0. Resumen ejecutivo

El análisis previo identificó qué entradas necesita E3.5 y qué huecos quedan. Este delta
las convierte en material revisable:

1. separa lo **ya aprobado** en SPEC16/21/27/12 de lo **nuevo y no aprobado**;
2. formula decisiones abiertas con opciones y recomendación, sin decidirlas;
3. propone AC y filas de testplan con identificadores provisionales que **no colisionan**
   con `E3.5-AC-nn` (candidata local no integrada) ni con `E3.5-AC1..3` del roadmap;
4. registra tres **desajustes documentales** entre el bloque no aprobado de SPEC21 y las
   reglas P6/P7 aprobadas de SPEC16, sin corregirlos aquí.

No se introduce ninguna fórmula nueva. Las fórmulas citadas son las aprobadas en
SPEC16 P6/P7/P7a; este documento solo describe de qué fuente se obtiene cada entrada y
qué cobertura exige.

## 1. Alcance y relación con el registro único de Comida

### 1.1 Frontera de E3.5

E3.5 es la capa de **agregación, atribución por ciclo y cobertura** sobre el registro
único de Comida. No es un segundo ledger ni un maestro de hechos:

| Capa | Dueño | Qué aporta | Qué no hace |
| --- | --- | --- | --- |
| Movimientos | E1.4/E1.5 | Hecho económico único: Gasto, Transferencia, `Devolución de gasto` | No conoce ciclos de Comida ni netos analíticos |
| Revisión Comida (E3.4) | SPEC16 | Etiqueta analítica, evidencias, vínculo opcional, reposiciones y devoluciones | No calcula Recursos, Compensable, Falta ni `Parcial`/`Completada` |
| E3.5 | Este delta (propuesta) | F, R_caja, R_obl, C_n, J_n, D, Recursos, Falta, cierre analítico, cobertura | No crea Gasto ni reescribe hechos; no debe persistir totales como verdad paralela (propuesto) |
| Flujo E2.6 | SPEC12 | S bruto y sus consumidores | No resta Comida ni convierte devoluciones en Ingreso |
| E3.6 | SPEC21 | Vista transversal de pendientes y conciliación | No reimplementa Comida ni emite agregados sin E3.5 |
| E4.9 | SPEC27 | Cierre y foto inmutable | No implementa Comida; consume sus resultados o bloquea el cierre |

El contrato de lectura E3.4→E3.5 ya está aprobado en SPEC16 («Contrato de lectura para
E3.5»): E3.5 recibe operaciones, vínculo, evidencias, reposiciones y cobertura, y sigue
siendo responsable de asignar por ciclo, agregar y calcular. Este delta **no reabre** ese
contrato; solo declara qué necesita consumir y con qué garantías.

### 1.2 Invariantes que el delta conserva

| # | Invariante | Autoridad vigente | Efecto en este delta |
| --- | --- | --- | --- |
| I1 | Un solo hecho económico; Revisión Comida no crea un segundo Gasto | SPEC16 P1/COMIDA-UNICO-01; SPEC21 §4.3 | Se consume, no se reabre |
| I2 | Devolución de Anticipo se deduce una sola vez | SPEC16 P6/P7 | Se exige contrato de doble vínculo (D-02) |
| I3 | Devolución comercial no es Ingreso ordinario | SPEC16 P1/P4/P5 | Se exige elegibilidad y neto observado separado |
| I4 | Comida no se resta de Recursos; consume J_n | SPEC16 P7 | Se conserva la fórmula aprobada |
| I5 | Reposición no es financiación; R_caja y R_obl no se suman | SPEC16 P6/P7 | Se exige distinción de obligación (D-06) |
| I6 | `Fuera presupuesto` afecta al banco pero no al análisis | SPEC16 P6/P7; SPEC21 §4.3 | Se exige exclusión solo analítica |
| I7 | Agregado legado y detalle no se suman | SPEC16; SPEC21 §4.3 | Se exige D solo desde Movimientos (D-08) |
| I8 | Ciclo y fecha reales; una devolución antigua no reduce la obligación actual | SPEC16 P5/P6; SPEC07 | Se exige por ciclo de compra |
| I9 | Faltante ≠ 0; sin fuente o cobertura la métrica es No disponible | SPEC12; SPEC16 P7; SPEC27 | Se exige cobertura por métrica |

Ninguno de estos invariantes se modifica. Cualquier propuesta que los altere queda fuera
de este delta y requiere enmienda aprobada en su spec propietaria.

### 1.3 Fuera de alcance

- Crear `specs/18-*` o cualquier spec nueva; editar SPEC16/21/27/12.
- Código, endpoints, DTO implementados, SQL, migraciones o cambios de esquema.
- Datos reales, Excel, activación del régimen, cierre, foto o despliegue.
- Tablero, roadmap, metodología, `AGENTS.md` o worktrees ajenos.
- Reanudar DEV18 o aceptar la candidata local como integrada.

## 2. Delta propuesto

### 2.1 Lo ya aprobado que E3.5 consume sin reabrir

| Regla aprobada | Fuente | Uso propuesto |
| --- | --- | --- |
| `Recursos = S0 + F + R_caja − C_n` | SPEC16 P7 | Entrada normativa; no se reformula |
| `Falta por reponer = max(C_n − R_obl, 0)` | SPEC16 P6/P7 | Obligación económica, no restauración de saldo |
| `J_n` = Comida/Pendiente revisar neto elegible | SPEC16 P6/P7 | Consumo del ciclo |
| `C_n` = Ocio + Niños + Otros neto elegible | SPEC16 P6/P7 | Compensable; excluye Comida y `Fuera presupuesto` |
| `D` = todos los Movimientos vigentes de ING en `[A,T]` | SPEC16 P7 | Incluye `Fuera presupuesto` y devoluciones antiguas |
| `Cierre analítico = S0 + D` | SPEC16 P7 | Distinto de saldo bancario y de foto E4.9 |
| `Base analítica = Recursos − J_n` | SPEC16 P7 | Puente de explicación |
| `Otros efectos = D − (F + R_caja − C_n − J_n)` | SPEC16 P7 | Puente de explicación, no asiento |
| Posición bancaria = `B_A + D` | SPEC16 P7 | Solo con apertura y cobertura |
| Duración provisional y horizonte vencido | SPEC16 P7a | Etiqueta Provisional; al vencer, equivalentes/Margen No disponible |
| Cobertura por métrica, no semáforo global | SPEC12; SPEC21 §2.1 | Se aplica a toda salida E3.5 |
| E4.9 bloquea el cierre sin E3.5/FIN_NETA verificable | SPEC27 AC-08 y Photo contract | No se captura Comida como `No disponible` |
| S bruto E2.6 intacto; Comida no se resta del flujo | SPEC12 AC-16/AC-47 | Se conserva sin vista ajustada nueva |

### 2.2 Lo nuevo que este delta propone (no aprobado)

Los siguientes contratos son **propuestas** para la futura spec propietaria. No son
reglas financieras nuevas: describen fuente, cobertura y frontera de datos.

| ID | Contrato propuesto | Justificación | Depende de |
| --- | --- | --- | --- |
| Δ-01 | `FIN_NETA` se obtiene de `F` (rol explícito `Financiación` menos `Devolución Anticipo` en `[A,T]`); no se reconstruye por nombre, importe ni fecha | SPEC16 P7 ya define F; evita inferencia | D-01 |
| Δ-02 | Para el mismo ID de Movimiento, `movimiento_anticipo` aporta la atribución canónica y `movimiento_rol_financiacion` la función analítica; se exige coherencia semántica y una sola deducción | Evita doble descuento y contradicción entre metadatos | D-02 |
| Δ-03 | Toda Transferencia de ING Comida sin rol declarado produce cobertura `Parcial`/`No disponible` con motivo; nunca asignación silenciosa ni excepción | Integridad de F, R_caja y D | D-05 |
| Δ-04 | `R_caja` (cobro en ING en `[A,T]`) y `R_obl` (asignación a la obligación del ciclo) son magnitudes distintas y no se suman | SPEC16 P7; evita doble cómputo | D-06 |
| Δ-05 | Una reposición tardía cuenta en el ciclo de su fecha; una parcial no es `Completada`; no se atribuye al ciclo anterior | SPEC16 P6; SPEC21 E3.6-AC-12 | D-06/D-10 |
| Δ-06 | `C_n` solo agrupa Ocio/Niños/Otros; `J_n` agrupa Comida/Pendiente revisar; `Fuera presupuesto` queda fuera del análisis y dentro de D/banco | SPEC16 P6; SPEC21 §4.3 | — |
| Δ-07 | Una devolución de compra de otro ciclo aumenta D y el neto observado, pero no reduce `J_n`/`C_n`/Falta del ciclo receptor ni reescribe el de origen | SPEC16 P5/P6 | D-07 |
| Δ-08 | `D` se compone solo de Movimientos vigentes; el agregado legado se conserva como fuente separada y nunca se suma al detalle | SPEC16; SPEC21 §4.3 | D-08 |
| Δ-09 | `S0` es manual y ausente ≠ 0; `B_A` se deriva solo con apertura y cobertura y no se copia a `S0`; `C`/`B` siguen siendo P3 | SPEC16 P2/P7; P3 pendiente | D-03 |
| Δ-10 | Cada salida E3.5 expone valor, unidad, estado de cobertura, motivo, intervalo/corte, régimen y fuente; un subtotal parcial no es total | SPEC16 contrato técnico candidato; SPEC12 | — |
| Δ-11 | E3.5 es de solo lectura sobre hechos: no crea tablas de hechos, no persiste Recursos/cierre/totales como verdad paralela ni introduce escrituras nuevas | SPEC16 «no almacenar verdad paralela» | D-04 |
| Δ-12 | E3.5 expone un proveedor de resultados verificables a E3.6/E4.9; sin él, esos consumidores muestran `No disponible` o bloquean, nunca 0 ni foto parcial | SPEC21 §4.3.1; SPEC27 | D-11 |
| Δ-13 | La nomenclatura `CIERRE`/`Base analítica`, `REP`/`R_obl` y las dos «diferencias» se alinean en la spec propietaria antes de DEV | Hallazgos H-1..H-3 | D-09 |

### 2.3 Hallazgos documentales (no se corrigen aquí)

El bloque de Comida de SPEC21 §4.3 está marcado por su propio texto como **propuesta
E3.5/spec18 no aprobada** (`[P][F]`). Al contrastarlo con P6/P7 aprobadas aparecen tres
desajustes de nombre o de magnitud. **No se edita SPEC21**: la corrección pertenece a su
spec propietaria y requiere aprobación.

| ID | Hallazgo | Comparación | Riesgo si no se resuelve | Recomendación |
| --- | --- | --- | --- | --- |
| H-1 | El bloque llama `CIERRE` a `RECURSOS − GC − CO`, que con el ejemplo P7 da 585; P7 llama `Cierre analítico` a `S0 + D`, que da 580, y `Base analítica` a `Recursos − J_n`, que da 585 | El nombre `CIERRE` de SPEC21 corresponde a la **Base analítica** de P7, no al cierre analítico | Un consumidor puede presentar la base como cierre y perder «Otros efectos» | Renombrar en la spec propietaria y mostrar Base, Otros efectos y Cierre como magnitudes distintas; sin cambiar fórmulas |
| H-2 | El bloque usa `REP = reposiciones vigentes en [A,T]` y `FALTA = max(CO − REP, 0)`; P6/P7 usan `R_obl` (asignadas a la obligación) para Falta | REP mezcla cobro y asignación | Falta mal calculada cuando hay reposiciones de otras obligaciones | Alinear Falta con `R_obl`; conservar `R_caja` para Recursos |
| H-3 | El bloque define `DIF = S0_siguiente − CIERRE`; P7 define la diferencia analítico−banco como `S0 − B_A` | Son dos diferencias distintas | Se comparan magnitudes no homogéneas o se oculta una | Mantener ambas con nombres y ventanas explícitos; no fusionarlas |

Estos hallazgos son **documentales**, no bugs reproducidos ni decisiones financieras.
D-09 propone cómo cerrarlos; la aprobación queda pendiente.

## 3. Decisiones abiertas

Ninguna opción está aprobada. La recomendación es técnica-documental y no sustituye la
decisión del usuario ni la autoridad de la spec propietaria. Mientras no se aprueben, DEV
no puede empezar y los AC dependientes quedan UNRUN.

### D-01 — Fuente de FIN_NETA

| Opción | Descripción | Consecuencia |
| --- | --- | --- |
| **A (recomendada)** | `FIN_NETA = F` según SPEC16 P7: rol `Financiación` menos `Devolución Anticipo` en `[A,T]`, con rol explícito y evidencia | Conserva P7, evita inferencia y duplicación; depende de roles completos |
| B | Proveedor externo autorizado entrega FIN_NETA ya neta, con evidencia y cobertura | Separa financiación de agregación, pero no existe hoy y exige contrato nuevo |
| C | Persistir FIN_NETA o agregados como cifra propia | Duplica verdad y contradice el registro único; no recomendada |

Recomendación: **A**, con B como evolución posible si aparece un proveedor real. No se
acepta inferir por nombre, importe o fecha. Aprobar A no autoriza DEV.

### D-02 — Doble vínculo de Anticipo

| Opción | Descripción | Consecuencia |
| --- | --- | --- |
| **A (recomendada)** | Mantener ambos metadatos: `movimiento_anticipo` como atribución canónica (Referencia, par, orientación) y `movimiento_rol_financiacion` como función analítica; exigir coherencia semántica para el mismo ID y una sola deducción | Conserva autoridades; conflictos → cobertura parcial/No disponible, sin elegir en silencio |
| B | Hacer `rol_financiacion` autoridad única para F e ignorar `movimiento_anticipo` en Comida | Simple, pero rompe la atribución canónica de Anticipos y el pendiente por caso |
| C | Unificar ambos metadatos en una sola tabla/campo | Requiere esquema y migración; contradice «no añadir FKs ni columnas sin permiso» y DEV STOP |

Recomendación: **A**. El contrato de conflicto debe especificarse antes de DEV. No se
crean FKs ni columnas en este delta.

### D-03 — S0, B y C

| Opción | Descripción | Consecuencia |
| --- | --- | --- |
| **A (recomendada)** | `S0` manual del ciclo (ausente ≠ 0); `B_A` derivado solo con apertura/cobertura y nunca copiado a `S0`; `C`/`B` según P3, diferidos hasta evidencia | Conserva P2/P7 y evita arrastre implícito |
| B | Arrastrar `S0` del cierre anterior o copiar `B_A` a `S0` | Crea apertura ficticia y contradice «Fuera: arrastre automático de saldo» del roadmap |
| C | Activar C/B con importes estimados para desbloquear métricas | Mezcla activación con datos no acreditados; prohibido sin autorización específica |

Recomendación: **A**. Sin S0, Recursos y cierre analítico son No disponibles aunque el
banco sea verificable; el documento no fija fecha ni importe de C/B.

### D-04 — Ubicación normativa

| Opción | Descripción | Consecuencia |
| --- | --- | --- |
| **A (recomendada)** | Enmendar SPEC16 (COMIDA-UNICO-01) con una sección E3.5 que fije contratos y cobertura, y referenciarla desde SPEC21/SPEC27 | P6/P7 ya viven allí; menor duplicación; requiere aprobación de la enmienda y revisión de consumidores |
| B | Formalizar una SPEC18/E3.5 propia e independiente | Separa responsabilidades, pero duplica P6/P7, exige numeración/aprobación nueva y reabre la candidata local |
| C | Repartir: contrato analítico en SPEC16 y contrato de consumo en SPEC21 | Dos propietarios para la misma regla; riesgo de deriva (ver H-1..H-3) |

Recomendación: **A**, con enlaces cruzados explícitos y sin reescribir P6/P7. **No se crea
ninguna spec nueva ni se edita la propietaria en este delta.** La aprobación de la
ubicación queda pendiente y es condición previa a cualquier DEV.

### D-05 — Transferencia de ING Comida sin rol

| Opción | Descripción | Consecuencia |
| --- | --- | --- |
| **A (recomendada)** | Cobertura `Parcial`/`No disponible` con motivo e IDs afectados; el dinero sigue en D/banco | Honesta y compatible con invariante I9 |
| B | Ignorar la transferencia no clasificada en F/R_caja | Oculta dinero real y produce Recursos falsamente completos |
| C | Inferir rol por nombre, importe, fecha o contraparte | Prohibido por P7; genera atribuciones no auditables |

Recomendación: **A**. Requiere además un test de regresión por el riesgo estático R-01.

### D-06 — Reposiciones sin asignación y reposición tardía

| Opción | Descripción | Consecuencia |
| --- | --- | --- |
| **A (recomendada)** | Sin `obligacion_ciclo` acreditada, la reposición cuenta en `R_caja` pero no en `R_obl`; la tardía cuenta en el ciclo de su fecha | Conserva P6/P7 y E3.6-AC-12 |
| B | Asignar por fecha o por proximidad al ciclo | Crea asignación no acreditada |
| C | Sumar R_caja y R_obl para «no perder» reposiciones | Doble cómputo; contradice P7 |

Recomendación: **A**.

### D-07 — Elegibilidad de devoluciones

| Opción | Descripción | Consecuencia |
| --- | --- | --- |
| **A (recomendada)** | Neteo solo con evidencia de clasificación, compra/origen temporal y correspondencia; vínculo `Revisar` no prueba elegibilidad; evidencia externa puede acreditarla sin FK | Compatible con P4/P5/P6; permite agregados de Terminal |
| B | Exigir siempre FK a compra individual | Excluye devoluciones acreditadas por evidencia externa y agregados; contradice P4 |
| C | Netear por coincidencia de importe/fecha | Prohibido por P5; riesgo de atribución falsa |

Recomendación: **A**. Compras agregadas de Terminal, devoluciones sin compra y de otro
ciclo se tratan como cobertura parcial/observada, no como cero ni como neto completo.

### D-08 — Cobertura histórica y legado

| Opción | Descripción | Consecuencia |
| --- | --- | --- |
| **A (recomendada)** | Régimen fechado con corte acreditado; antes del corte, legado en solo lectura, sin reconstruir FIN_NETA ni sumar agregado y detalle | Conserva historia y evita doble gasto |
| B | Reconstruir el histórico desde el detalle actual | Genera hechos y atribuciones que no existieron |
| C | Tratar el legado agregado como si fuera detalle | Duplica gasto y contradice I7; mezcla agregado y detalle |

Recomendación: **A**. El intervalo y las fuentes completas se acreditan antes de DEV; el
documento no los fija.

### D-09 — Nomenclatura y frontera de magnitudes

| Opción | Descripción | Consecuencia |
| --- | --- | --- |
| **A (recomendada)** | Renombrar en la spec propietaria: `CIERRE` de SPEC21 → `Base analítica`; añadir `Otros efectos` y `Cierre analítico`; `FALTA` usa `R_obl`; las dos diferencias conservan nombres distintos | Elimina ambigüedad sin cambiar fórmulas |
| B | Mantener los nombres actuales y documentar equivalencias en un anexo | Deja la ambigüedad en el contrato normativo |
| C | Unificar todo en una sola magnitud | Pierde trazabilidad del puente y oculta efectos |

Recomendación: **A**, como enmienda documental de la spec propietaria. No se aplica aquí.

### D-10 — Definición de `Parcial` y `Completada`

| Opción | Descripción | Consecuencia |
| --- | --- | --- |
| **A (recomendada)** | Definirlas en la spec propietaria antes de DEV; mientras no exista definición, E3.5 no emite `Completada` y usa `Parcial`/`No disponible` con motivo | Evita estados falsos (E3.4-AC-27, E3.6-AC-12) |
| B | Heredar la definición de la candidata spec18 sin revisión | Acepta un documento no integrado ni aprobado |
| C | Dejar que cada consumidor decida | Inconsistencia entre E3.4, E3.6 y E4.9 |

Recomendación: **A**. Es una decisión funcional del propietario, no de este delta.

### D-11 — Contrato del proveedor E3.5 → E4.9

| Opción | Descripción | Consecuencia |
| --- | --- | --- |
| **A (recomendada)** | Proveedor de lectura con resultados, cobertura, ventana, régimen, fuente y huella/revisión; E4.9 captura o bloquea | Satisface SPEC27 sin reimplementar Comida |
| B | E4.9 captura las entradas brutas y recalcula Comida | Duplica el motor y contradice SPEC27 |
| C | Diferir el contrato hasta DEV27 | Bloquea el cierre sin ruta documental |

Recomendación: **A**. SPEC27 ya exige que E4.9 consuma y no reimplemente; falta la forma
del contrato, que debe aprobarse en la spec propietaria.

## 4. AC propuestos

**Todos UNRUN.** Identificadores provisionales `E3.5-DELTA-AC-nn` para no colisionar con
`E3.5-AC-nn` de la candidata local (referenciados como 12/13/17/39 en SPEC21) ni con
`E3.5-AC1..3` del roadmap. La numeración definitiva la asigna la spec propietaria si
aprueba el delta. Ningún AC declara aprobación, implementación ni PASS.

| ID | Acción / precondiciones | Resultado observable esperado | Trazabilidad | Estado |
| --- | --- | --- | --- | --- |
| E3.5-DELTA-AC-01 | Fixture con compra de Comida ya registrada en Movimientos y detalle E3.4 asociado. | Existe una sola fila económica; E3.5 agrega sin crear Gasto, saldo paralelo ni segundo ledger; los IDs coinciden con Movimientos. | I1; SPEC16 P1; roadmap E3.4-AC1 | UNRUN |
| E3.5-DELTA-AC-02 | Cobertura completa con Transferencias de rol `Financiación` y `Devolución Anticipo`; después una transferencia sin rol. | `FIN_NETA`/F sale del rol explícito y se usa una vez; sin rol, F y dependientes pasan a `Parcial`/`No disponible` con motivo; nunca se infiere por nombre, importe o fecha. | Δ-01; D-01/D-05; SPEC16 P7 | UNRUN |
| E3.5-DELTA-AC-03 | Devolución de Anticipo con atribución en `movimiento_anticipo` y rol `Devolución Anticipo` en el mismo Movimiento. | Se deduce una sola vez de F; el importe informativo no se resta otra vez de Recursos ni se trata como devolución comercial; el hecho bancario permanece una vez. | Δ-02; I2; SPEC16 P6/P7 | UNRUN |
| E3.5-DELTA-AC-04 | Mismo Movimiento con atribución de Anticipo y función analítica incompatibles (orientación, Referencia o par). | No se elige en silencio: cobertura `Parcial`/`No disponible` con motivo; sin doble deducción; el hecho se conserva y se enlaza a revisión. | Δ-02; D-02 | UNRUN |
| E3.5-DELTA-AC-05 | Transferencia de ING Comida sin rol declarado, con y sin otras transferencias clasificadas. | La métrica afectada es `Parcial`/`No disponible` con motivo e IDs; no hay excepción de runtime; D/banco conservan el dinero; ninguna asignación automática. | Δ-03; D-05; R-01 | UNRUN |
| E3.5-DELTA-AC-06 | Reposición cobrada hoy y asignada a obligación antigua; reposición del ciclo; reposición sin `obligacion_ciclo`. | R_caja aumenta Recursos actuales sin sumarse a R_obl; R_obl solo reduce Falta de su obligación; sin asignación no hay R_obl; nunca se suman R_caja y R_obl. | Δ-04; I5; SPEC16 P6/P7 | UNRUN |
| E3.5-DELTA-AC-07 | Reposición parcial, reposición completa y reposición tardía en el ciclo siguiente. | Parcial no es `Completada`; la tardía cuenta en el ciclo de su fecha; no se persiste atribución al ciclo anterior; Falta refleja solo R_obl acreditada. | Δ-05; D-06/D-10; SPEC21 E3.6-AC-12 | UNRUN |
| E3.5-DELTA-AC-08 | Ocio, Niños, Otros, Comida, Pendiente revisar y `Fuera presupuesto` en el mismo ciclo, con devolución elegible de una compra compensable. | C_n = Ocio+Niños+Otros neto elegible; `Fuera presupuesto` no entra en C_n/J_n/Falta pero sí en D/banco; sin doble exclusión. | Δ-06; I6; SPEC16 P6 | UNRUN |
| E3.5-DELTA-AC-09 | Etiqueta `Pendiente revisar` junto a una devolución con Partida NULL y estado de atribución `Pendiente revisar`. | La etiqueta cuenta como Comida en J_n; el estado de atribución no asigna grupo ni ciclo automáticamente; se muestran como conceptos distintos. | Δ-06; SPEC16 P6; CU-19 | UNRUN |
| E3.5-DELTA-AC-10 | Devolución de compra de ciclo anterior, devolución sin compra vinculable y devolución con vínculo `Revisar`. | D y neto observado incluyen la entrada; J_n/C_n/Falta actuales no se reducen; vínculo `Revisar` no acredita elegibilidad; cobertura parcial con motivo; sin reescribir el ciclo de origen. | Δ-07; I3/I8; SPEC16 P4/P5/P6 | UNRUN |
| E3.5-DELTA-AC-11 | Ciclo con detalle nuevo y agregado legado coexistente; después solo agregado. | D usa solo Movimientos vigentes; el agregado no se suma al detalle; sin detalle no se reconstruye FIN_NETA; el legado se etiqueta y conserva procedencia. | Δ-08; I7; D-08; SPEC16 P2/COMIDA-UNICO-01 | UNRUN |
| E3.5-DELTA-AC-12 | S0 informado, S0 ausente, B_A acreditado, B_A no acreditado y C/B de P3 no decididos. | S0 ausente ≠ 0 → Recursos/cierre No disponible; B_A no se copia a S0; sin apertura/cobertura el banco es parcial/No disponible; C/B no se inventan. | Δ-09; I9; D-03; SPEC16 P2/P7 | UNRUN |
| E3.5-DELTA-AC-13 | Fuente vacía con cobertura, periodo sin hechos y lector fallido; métricas con distinta cobertura en la misma vista. | Vacío acreditado, cero verificado y fallo de fuente se distinguen; cada métrica conserva su cobertura; un subtotal parcial no se presenta como total; nunca 0 por omisión. | Δ-10; I9; SPEC12; SPEC21 E3.6-AC-21 | UNRUN |
| E3.5-DELTA-AC-14 | Ciclo con `Fuera presupuesto`, devolución antigua y transferencia no financiadora; comparar Base, Otros efectos, Cierre analítico y banco. | El puente desglosa los efectos; Cierre analítico ≠ saldo bancario verificado; la diferencia S0/B_A solo avisa; no se crean ajustes, asientos ni transferencias de regularización. | Δ-10/Δ-13; H-1/H-3; SPEC16 P7 | UNRUN |
| E3.5-DELTA-AC-15 | E3.6 con E3.5 integrada y después sin FIN_NETA/proveedor; E4.9 intenta cerrar sin E3.5 verificable. | E3.6 muestra agregados o `No disponible` con motivo, nunca 0 ni conciliación simulada; E4.9 bloquea el cierre sin foto parcial ni captura de Comida como `No disponible`. | Δ-12; D-11; SPEC21 §4.3.1; SPEC27 AC-08 | UNRUN |
| E3.5-DELTA-AC-16 | Inspeccionar tablas, endpoints y persistencia de E3.5; intentar escribir un total o crear un hecho desde la capa analítica. | No hay tabla de hechos nueva, totales persistidos como verdad paralela ni escritura de Movimientos desde E3.5; la capa es de solo lectura; autenticación y errores seguros se conservan. | Δ-11; D-04; SPEC16 contrato técnico | UNRUN |
| E3.5-DELTA-AC-17 | Ciclo abierto con duración provisional acreditada; corte dentro y después del horizonte; siguiente Inicio real. | Dentro del horizonte, equivalentes/Margen se etiquetan Provisional; al vencer, `No disponible` con motivo sin extrapolar; con siguiente Inicio se usa duración real y se revalida; Fin abierto sigue vacío. | SPEC16 P7a; CU-24 | UNRUN |
| E3.5-DELTA-AC-18 | Revisar el delta, SPEC16 P6/P7 y SPEC21 §4.3 contra H-1, H-2 y H-3. | La spec propietaria resuelve nombres y magnitudes sin cambiar fórmulas; `FALTA` usa R_obl; las dos diferencias quedan separadas; no se declara aprobado lo no aprobado. | D-09; H-1..H-3 | UNRUN |

### 4.1 Trazabilidad de roadmap y consumidores

| Origen | AC propuestos |
| --- | --- |
| Roadmap E3.5-AC1 (financiación neta sin doble descuento) | AC-02, AC-03, AC-04 |
| Roadmap E3.5-AC2 (Pendiente revisar, compensable, Falta) | AC-06, AC-07, AC-08, AC-09 |
| Roadmap E3.5-AC3 (Ciclos y diferencia solo avisa) | AC-12, AC-14, AC-17 |
| SPEC16 AC-27/34/36 (consumo futuro E3.5) | AC-07 (estado), AC-06 (reposición una vez), AC-10 (recálculo) |
| SPEC21 E3.6-AC-04/11/12/14 | AC-02/AC-03 (FIN_NETA), AC-08/AC-09 (métricas), AC-07 (parcial/tardía), AC-15 (No disponible) |
| SPEC27 AC-08 y Photo contract | AC-15 |
| SPEC12 AC-16/47 (S bruto intacto) | AC-01, AC-13 |
| Riesgo estático `comida.ts` | AC-05 |

## 5. Testplan propuesto

**Diseño de pruebas, ninguna ejecutada.** Todas las filas quedan **UNRUN**. La columna
«Dependencia» indica qué falta para poder ejecutarlas; la mayoría requiere autorización
de DEV separada, que hoy está en STOP. No se declara cobertura, PASS ni QA.

| ID | AC | Escenario P / N / L | Resultado observable esperado | Método previsto | Dependencia | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| E3.5-DELTA-TP-01 | AC-01 | P: compra y detalle E3.4. N: crear segundo Gasto desde E3.5. L: compra sin vínculo. | Un hecho, un ID; sin Gasto ni saldo paralelo; sin vínculo no se inventa. | Bun/API/SQLite | DEV E3.5 autorizado; E3.4 integrada | UNRUN |
| E3.5-DELTA-TP-02 | AC-02 | P: roles completos. N: inferir rol por nombre/importe. L: una transferencia sin rol. | F correcta y una vez; sin rol → Parcial/ND con motivo; sin inferencia. | Bun/API | DEV; fixtures sintéticas | UNRUN |
| E3.5-DELTA-TP-03 | AC-03 | P: doble vínculo coherente. N: restar dos veces. L: devolución igual a la financiación. | Una deducción; DEV_ANT informativa; sin segundo descuento; cero conservado. | Bun/API/SQLite | DEV; D-02 | UNRUN |
| E3.5-DELTA-TP-04 | AC-04 | P: vínculos coherentes. N: elegir uno en silencio. L: Referencia/par parcial. | Conflicto → Parcial/ND con motivo; hecho conservado; sin doble deducción. | Bun/API | DEV; D-02 | UNRUN |
| E3.5-DELTA-TP-05 | AC-05 | P: todas con rol. N: `roles.get(...)!` sobre transferencia sin rol. L: solo una sin rol entre muchas. | Sin excepción; cobertura Parcial/ND; IDs visibles; D/banco íntegros. | Bun/API | DEV; R-01 | UNRUN |
| E3.5-DELTA-TP-06 | AC-06 | P: reposición del ciclo. N: sumar R_caja + R_obl. L: reposición de obligación antigua. | R_caja suma a Recursos; R_obl solo a Falta; no se suman; antigua no reduce Falta actual. | Bun/API | DEV; D-06 | UNRUN |
| E3.5-DELTA-TP-07 | AC-07 | P: reposición total. N: declarar Completada por ausencia. L: parcial y tardía. | Parcial/Nunca completada sin acreditación; tardía en su ciclo; sin atribución persistida. | Bun/API + Playwright | DEV; D-06/D-10 | UNRUN |
| E3.5-DELTA-TP-08 | AC-08 | P: grupos completos. N: meter Fuera presupuesto en C_n. L: solo Fuera presupuesto. | C_n correcto; Fuera presupuesto en D/banco y fuera del análisis; sin doble exclusión. | Bun/API + Playwright | DEV; SPEC16 P6 | UNRUN |
| E3.5-DELTA-TP-09 | AC-09 | P: etiqueta Pendiente revisar. N: confundirla con estado de atribución. L: devolución con Partida NULL. | Suma una vez en J_n; conceptos separados en DTO/UI; sin asignación automática. | Bun/API + Playwright | DEV | UNRUN |
| E3.5-DELTA-TP-10 | AC-10 | P: devolución antigua elegible. N: reducir J_n actual. L: sin compra y con vínculo Revisar. | D/neto observado la incluyen; J_n/C_n/Falta actuales intactos; cobertura parcial; sin reescritura. | Bun/API | DEV; D-07 | UNRUN |
| E3.5-DELTA-TP-11 | AC-11 | P: detalle nuevo. N: sumar agregado + detalle. L: solo agregado. | D solo desde Movimientos; sin doble gasto; legado etiquetado; sin reconstruir FIN_NETA. | Bun/API/SQLite | DEV; D-08 | UNRUN |
| E3.5-DELTA-TP-12 | AC-12 | P: S0 y B_A acreditados. N: S0 ausente → 0. L: solo uno de los dos. | Ausente → ND; B_A no se copia a S0; banco parcial/ND si falta apertura; C/B no inventados. | Bun/API + Playwright | DEV; P3 sin decidir | UNRUN |
| E3.5-DELTA-TP-13 | AC-13 | P: vacío acreditado. N: fallo de fuente → 0. L: métricas con coberturas mixtas. | Vacío ≠ cero ≠ fallo; cobertura por métrica; subtotal parcial no es total. | Bun/API + Playwright | DEV; SPEC12 | UNRUN |
| E3.5-DELTA-TP-14 | AC-14 | P: ejemplo P7 con S0=100, F=700, R=20, C_n=35, J_n=200, D=480. N: presentar el cierre 580 como saldo bancario. L: añadir devolución antigua 40 (D=520) y B_A=250. | P: Recursos 785; Falta 15; Base 585; Otros efectos −5; cierre 580. L: Recursos y Falta sin cambio; cierre 620; banco 770; diferencia −150 explicada; sin ajustes. | Bun/API + Playwright | DEV; SPEC16 P7 aprobado | UNRUN |
| E3.5-DELTA-TP-15 | AC-15 | P: E3.5 y FIN_NETA verificables. N: E4.9 cierra sin E3.5. L: E3.6 sin proveedor de Cierres. | Agregados o ND con motivo; E4.9 bloqueado sin foto; sin 0 ni conciliación simulada. | Bun/API + Playwright | DEV; SPEC21/SPEC27 | UNRUN |
| E3.5-DELTA-TP-16 | AC-16 | P: lectura de métricas. N: POST/PATCH de totales. L: inspección de esquema. | Sin tabla de hechos ni totales persistidos; sin escritura desde E3.5; seguridad conservada. | Bun/API/SQLite | DEV; D-04 | UNRUN |
| E3.5-DELTA-TP-17 | AC-17 | P: corte dentro del horizonte. N: extrapolar al vencer. L: siguiente Inicio real. | Provisional correcto; vencido → ND con motivo; duración real al existir siguiente Inicio; Fin abierto vacío. | Bun/API + Playwright | DEV; SPEC16 P7a | UNRUN |
| E3.5-DELTA-TP-18 | AC-18 | P: revisión documental del delta. N: declarar aprobado lo pendiente. L: H-1..H-3 sin resolver. | Nombres/magnitudes alineados en la spec propietaria; fórmulas intactas; estado honesto. | Revisión documental | Aprobación de la enmienda | UNRUN |

## 6. Evidencia mínima y riesgos

### 6.1 Evidencia mínima antes de DEV

- Fixtures **sintéticas** para P7/CU-21/CU-22 con S0, F, R_caja/R_obl, C_n, J_n, D y puente.
- Devolución de Anticipo una sola vez, con doble vínculo coherente y conflicto controlado.
- Devolución comercial actual, antigua, sin compra y con vínculo `Revisar`.
- Reposición cobrada y asignada a obligación actual/antigua; reposición sin asignación.
- Compras agregadas de Terminal frente a detalle, sin doble cómputo.
- `Fuera presupuesto` con efecto bancario y exclusión analítica.
- Falta de S0, B_A o cobertura → `No disponible`, nunca 0.
- Ciclo abierto, sin siguiente Inicio, horizonte vencido y cruce de ciclos.
- Matriz de cobertura por métrica con motivo y fuente.
- Contrato del proveedor E3.5→E4.9 acordado antes de DEV27.

Sin datos reales, sin Excel y sin autorización de DEV. La evidencia documental no
sustituye fixtures ni QA independiente.

### 6.2 Riesgos

| ID | Riesgo | Evidencia / estado | Impacto | Mitigación propuesta |
| --- | --- | --- | --- | --- |
| R-01 | `apps/api/src/comida.ts` (~1391–1407 en `main` `4eb7264`): `missing` detecta Transferencias sin rol, pero después se usa `roles.get(r.id)!` y se evalúa `role.rol` antes de devolver `available` | **Inspección estática, no bug reproducido**; no se corrige aquí | Una Transferencia sin rol podría lanzar excepción en lugar de devolver cobertura `Parcial`/`No disponible` | Test de regresión TP-05 y corrección separada, solo con autorización de DEV |
| R-02 | Sumar agregado legado y detalle de Comida | Riesgo documentado en SPEC16/SPEC21 | Doble gasto y cierre inflado | AC-11/TP-11; D-08 |
| R-03 | Doble descuento de la devolución de Anticipo | P6/P7 lo prohíben | Recursos y Falta falsos | AC-03/AC-04; D-02 |
| R-04 | Convertir S0 ausente en 0 o copiar B_A a S0 | P7 lo prohíbe | Cierre aparente sin cobertura | AC-12/TP-12; D-03 |
| R-05 | Usar mes natural o reloj en lugar de Ciclos | SPEC07/SPEC12 | Ventana incorrecta | AC-17; P7a |
| R-06 | Inferir rol o elegibilidad por nombre, importe o fecha | P4/P5/P7 lo prohíben | Atribución no auditable | AC-02/AC-10; D-01/D-07 |
| R-07 | E4.9 captura Comida como `No disponible` o publica foto parcial | SPEC27 lo prohíbe | Cierre inválido | AC-15; D-11 |
| R-08 | Deriva de nombres entre SPEC21 §4.3 y P6/P7 (H-1..H-3) | Hallazgo documental | Consumidores comparan magnitudes no homogéneas | AC-18; D-09 |
| R-09 | Añadir FK/columna para el doble vínculo sin aprobación | DEV STOP | Cambio de esquema no autorizado | D-02 opción A; AC-16 |
| R-10 | Presentar `Completada` sin definición aprobada | E3.4-AC-27; E3.6-AC-12 | Estado falso | D-10; AC-07 |

## 7. Referencias y estado de verificación

Referencias normativas usadas, sin reabrirlas:

- [SPEC16 — Revisión Comida](../16-revision-comida-specification.md): contrato de lectura
  E3.5, P4, P5, P6, P7, P7a, CU-21..24 y contrato técnico candidato.
- [SPEC21 — Pendientes y conciliación](../21-pendientes-conciliacion-specification.md):
  §4.3 Comida (bloque `[P][F]` no aprobado), §4.3.1 disponibilidad, E3.6-AC-04/11/12/14.
- [SPEC27 — Cierre financiero](../27-e49-cierre-financiero-specification.md): bloqueo por
  E3.5/FIN_NETA, Photo contract y AC-08.
- [SPEC12 — Flujo mensual](../12-flujo-mensual-specification.md): S bruto PARCIAL,
  cobertura por indicador y AC-47.
- [Roadmap E3.5](../roadmap.md#e35--comida-por-ciclo-y-compensaciones): AC1–AC3 y
  exclusión de arrastre automático.
- [Análisis de adaptación](e35-fin-neta-adaptation-2026-10-31.md): mapeo de entradas,
  invariantes y huecos.

Estado de verificación de este documento: **solo documental**. Los AC y TP son propuestas
UNRUN; no se ha ejecutado ninguna prueba de aplicación ni se declara PASS funcional. La
verificación de repositorio (`scripts/verify`, perfil `docs`) se ejecuta sobre el commit
de esta rama y su resultado se registra en la entrega de la rama; este documento no
anticipa ese resultado. Los enlaces son relativos al repositorio y las referencias a
SPEC16/21/27/12 no afirman que sus AC estén ejecutados.

## 8. Siguiente paso seguro

1. Revisión y **aprobación independiente** de la enmienda normativa propuesta en SPEC16 y
   del testplan definitivo propuesto; D-04/D-07/D-09/D-10 ya están incorporadas.
2. Resolver cualquier observación de esa revisión en la spec propietaria, sin duplicar
   P6/P7 ni crear una especificación paralela.
3. Solo después, una autorización **separada** de DEV habilita fixtures, implementación y
   QA; el riesgo R-01 se corrige en esa fase, no aquí.
4. E3.6 y E4.9 siguen bloqueados hasta que E3.5/FIN_NETA sea verificable; este documento
   no desbloquea E4.9, no cierra DT6/T-BKP y no autoriza cierre ni foto.

Este delta **no** cierra E3.5, **no** aprueba el texto normativo, **no** sustituye la
evidencia DT6 y **no** autoriza push, PR ni merge por sí mismo.
