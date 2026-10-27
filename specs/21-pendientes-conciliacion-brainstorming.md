# 21 — E3.6 Pendientes y conciliación transversal: Brainstorming

Status: **APPROVED (documental) — Q-S21-01–04 opción A; 2026-10-27.** No autoriza
desarrollo E3.6 ni reanudación de tareas bloqueadas.

Approval source/date: usuario, 2026-10-27: «Apruebo las cuatro decisiones propuestas»
(Q-S21-01–04, opción A) y «Autorizo el cierre documental de SPEC21», sin autorizar
desarrollo.

Autorización: TASK-SPEC21/E3.6, preparación documental autorizada el 2026-10-27.
Sesión funcional `SPEC21-E3.6`; cliente externo vía OpenCode; modelo/versión
observados por el entorno, no verificados por el coordinador. Las propuestas P-01–P-10
se conservan como historia; las decisiones Q-S21-01–04 quedan aprobadas en su opción A
(§3 y §7).

Contexto: [roadmap E3.6](roadmap.md#e36--pendientes-y-conciliación-transversal-de-casos),
[referencia funcional R1–R4/R6](functional-reference-v5.11.md),
[spec09](09-plan-ciclo-specification.md), [spec12](12-flujo-mensual-specification.md),
[spec13](13-anticipos-specification.md), [spec14](14-compartidos-specification.md),
[spec16](16-revision-comida-specification.md), [tablero](epic-board.md).

Documentos de la misma candidata:
[specification](21-pendientes-conciliacion-specification.md),
[testplan](21-pendientes-conciliacion-testplan.md),
[progress](21-pendientes-conciliacion-progress.md).

## 0. Preflight y ownership

- Base remota verificada: `origin/main = 9977210095472de43a9abf59587ea88587376074`
  (merge PR94).
- No existían `specs/21-*`, rama remota `SPEC21`, commit con ese prefijo ni worktree
  que usara esas rutas. El expediente se creó en un checkout aislado y rama
  `codex/spec21-e36-pendientes-conciliacion`.
- Los cambios ajenos observados se preservaron: `specs/session-handoff.md` sin
  seguimiento en el checkout principal y modificaciones locales en los worktrees
  `pilot-e41` (spec19) y `spec14-d5` (spec14). No se tocaron.
- Este expediente no edita tablero, specs anteriores, código, esquemas, harness ni
  configuración. No se ejecutaron pruebas funcionales, migraciones, push, PR ni merge.

## 1. Decisiones confirmadas con procedencia

Las siguientes decisiones no se reabren. Se registran porque gobiernan SPEC21; su
autoridad es la fuente citada, no este documento.

| ID | Decisión confirmada | Procedencia | Fecha | Límite que conserva SPEC21 |
| --- | --- | --- | --- | --- |
| D-01 | Motores únicos y una sola fuente de hechos: Movimientos para banco, Ciclos para periodos, Plan para ejecución, fichas de caso para pendientes. | R1/R2/R3, roadmap T-DAT y E3.6 | aprobado 2026-10-20 | No crear segundo maestro, segundo ledger ni motor de Neto paralelo. |
| D-02 | Anticipo: adelantos y devoluciones son Transferencias reales con la misma Referencia y rol/orientación acreditados; solo Transferencias acreditadas entran en Adelantado/Recuperado/Neto/Exceso. | R4; spec13 rev3 + Q9 + H1, aprobadas/integradas PR71 | 2026-10-25 | Gastos/Ingresos relacionados conservan efecto bancario y quedan fuera del motor de Anticipos; no se convierten ni compensan. |
| D-03 | El Neto de apertura de un Anticipo es una fotografía confirmada por Referencia+Ciclo; no es el pendiente actual ni se reconstruye sin evidencia. | R4; spec13 AC-14/15/30–36; decisión Q7/Q8 | 2026-10-25 | SPEC21 lo muestra y lo enlaza; no lo recalcula, sustituye ni crea en GET. |
| D-04 | Compartido: los Gastos conservan Tipo Gasto, Partida, fecha e importe; las aportaciones de tercero son Transferencias acreditadas, no Ingresos. Neto = Bruto − Recuperado; Cerrado no exige Neto cero. | R4; spec14 base aprobada; D5 aprobada 2026-10-27; Base B PR75, D5 PR90, overflow PR93 | 2026-10-25/27 | Se consumen Neto y atribución centrales; céntimos exactos, reparto por participante, exceso y Neto firmado se preservan. B-T11 sigue pendiente. |
| D-05 | Comida: Revisión Comida es auxiliar bancario, no un segundo Gasto central. Gasto comida = Comida + Pendiente revisar; compensable = Ocio + Niños + Otros; Falta por reponer = max(compensable − reposiciones, 0); Fuera presupuesto excluye análisis y conserva efecto bancario. | R4; spec16 aprobada; spec18 Q1–Q5 confirmadas por el usuario, pero la spec18 sigue sin aprobar | 2026-10-26/27 | SPEC21 no crea Gastos ni resta Comida dos veces. La spec18 es candidata local, no integrada ni aprobada; FIN_NETA runtime ausente. |
| D-06 | Plan del ciclo: A transferir = Del mes; Gasto real ejecuta por Partida/Periodo aunque el Gasto tenga Referencia; Aportación a saldo excluye Referencias y origen Exterior; devoluciones de Anticipo no ejecutan Presupuesto. | R3; spec09 aprobada/integrada E2.3; spec12 | 2026-10-23/25 | SPEC21 no cambia A transferir, no crea ejecución por devoluciones y no propone un «plan neto» paralelo. |
| D-07 | Flujo mensual E2.6: Gasto bruto registrado incluye Gastos centrales una vez; no es la H física; el Neto Compartido y Comida quedan pendientes de integración; S siempre es parcial. | spec12 aprobada, 56 AC; E2.6/PR67, documentación PR94 | 2026-10-25/27 | SPEC21 propone la integración futura sin reescribir las definiciones E2.6 ni presentar Bruto+Neto como dos gastos. |
| D-08 | Ciclos: `tblCiclos` es el único maestro; Fin = siguiente Inicio − 1; sin siguiente Inicio queda Abierto y corte = referencia central; el ejercicio natural no se sustituye por ciclo. | R3; spec03; spec07/E2.1 | aprobado/integrado | SPEC21 respeta ambos ejes y documenta cruces; no inventa cierre ni fecha. |
| D-09 | Estados de cobertura: Verificado, Cero verificado, Parcial y No disponible son distintos; la ausencia de fuente, motor o cobertura no es cero. | spec12, spec13, spec14 §14.5, spec16 | aprobado | SPEC21 no convierte `null` en 0 ni usa un total agregado para ocultar ausencias. |

**Restricción de alcance R-01 (no es una decisión financiera del usuario):** Cierres y
protección transversal DT5 solo se preparan como matriz de impacto; no se implementan
locks, re-cierres, snapshots ni proveedor de Cierres. Procede del roadmap DT5/E4.8–E4.11
y del encargo SPEC21.

### 1.1 Estado de dependencias que SPEC21 no puede promocionar

| Entrega | Estado real que se conserva | Efecto en SPEC21 |
| --- | --- | --- |
| E3.1/DEV13 | PR71 integrada. H1 conserva Gastos/Ingresos relacionados fuera del motor; solo Transferencias acreditadas generan Adelantado/Recuperado. E3.1-AC36 PARCIAL por proveedor de Cierres ausente. | Se consume el DTO de Anticipos; no se declara E3.1-AC36 completo ni se simula cierre. |
| E3.2 | Base B PR75, D5/Exterior PR90 y overflow PR93 integrados. B-T11 (consumo por informes/E3.6) sigue pendiente. | SPEC21 es el consumidor que activa B-T11, pero B-T11 no se declara PASS por diseñar esta spec. |
| E3.4/DEV16 | PR82 integrada. E3.4-AC25 pendiente; E3.4-AC12/31 históricos condicionados; E3.4-AC27/34/36 consumidores futuros E3.5. | Se consume el contrato de lectura de Revisión Comida; no se cierra E3.4-AC25 ni se declara equivalencia física. |
| E3.5/DEV18 | Candidato local `codex/dev18-e35-comida-ciclo`, no integrado ni aceptado funcionalmente. `FIN_NETA` runtime ausente; E3.5-AC-12/13/17/39 BLOCKED según el último estado recibido. | Comida se especifica como contrato condicionado; en ausencia del motor se muestra No disponible, nunca cero. |
| E2.6/DEV12 | PR67 integrada; documentación reconciliada PR94; 56 AC y UNRUN de fuentes no disponibles conservados. | Se reutiliza su semántica y se añade una vista ajustada explícita, sin declarar PASS los AC de integración. |

## 2. Propuestas de SPEC21 (no aprobadas)

Cada propuesta es una recomendación técnica/funcional. No es una respuesta del usuario
ni una aprobación. Las alternativas se conservan para revisión de Álex.

### P-01 — El flujo ajustado sustituye el Gasto bruto solo dentro de su vista

- **Recomendación:** para un ciclo, `Gasto neto ajustado = Gasto bruto central −
  Recuperado de Compartidos atribuido a esos Gastos`. Se muestra como sustitución
  explícita **dentro de la vista ajustada**, no como un segundo gasto. Nunca se presenta
  `Gasto bruto + Neto Compartido`.
- **Alternativa A:** mostrar solo el Neto compartido como línea separada y sumarlo al
  Gasto bruto. Se rechaza: cuenta dos veces el bruto y el neto.
- **Alternativa B:** no integrar el Neto y mantener el pendiente. Se rechaza para E3.6:
  no cumple E3.6-AC1.
- **Consecuencia:** el flujo conserva el Gasto bruto y el S bruto E2.6 como datos base
  intactos, y añade una vista ajustada con su propia cobertura. La sustitución es de la
  vista, no de la definición E2.6 (Q-S21-02).

### P-02 — El Neto compartido se atribuye por Gasto, con pregunta temporal abierta

- **Recomendación:** usar el Neto central por Gasto/Partida de spec14: `Neto(g) =
  Bruto(g) − Recuperado atribuido(g)`. Para el flujo del ciclo, el ajuste por Recuperado
  se calcula sobre los Gastos con fecha dentro del ciclo, aunque la aportación se haya
  cobrado en otro ciclo. La vista de caja muestra por separado las aportaciones
  cobradas en el ciclo, sin sumarlas como ingreso. `B − R` es Neto de caja del caso, no
  coste propio; Coste propio/Pendiente/Exceso se muestran aparte.
- **Alternativa A (caja):** ajustar solo las aportaciones con fecha dentro del ciclo,
  aunque correspondan a compras anteriores. Puede producir Gasto neto negativo en el
  ciclo de cobro y no coincide con el Neto por Gasto.
- **Alternativa B (dual):** dos vistas, económica y de caja, sin elegir una. Es la
  recomendación de presentación, pero no resuelve por sí sola qué cifra es la
  «principal».
- **Pregunta material:** Q-S21-01. Hasta que se responda, SPEC21 no declara una regla
  temporal definitiva; muestra ambas lecturas etiquetadas y no las suma.

### P-03 — El Plan no se netea

- **Recomendación:** A transferir y la ejecución R3 se consumen sin cambios. Un Gasto
  con Referencia sigue ejecutando por su Partida; una devolución de Anticipo o una
  aportación de Compartido no ejecuta Presupuesto. No se crea un «Plan neto de
  compartidos».
- **Alternativa:** descontar recuperaciones del Ejecutado del Plan. Se rechaza: R3 y
  E2.3 no lo autorizan y produciría doble ejecución/atribución.
- **Consecuencia:** el ahorro o pendiente del Plan no cambia por cobros de terceros.

### P-04 — Comida se presenta como bloque analítico separado

- **Recomendación:** Comida conserva su capa auxiliar y su bloque `Recursos/Gasto
  comida/Compensable/Reposiciones/Falta/Cierre analítico/Diferencia`. No se suma al
  Gasto bruto central ni se resta del flujo como segundo gasto. La devolución de
  Anticipo ya está dentro de `FIN_NETA`; no se resta otra vez.
- **Alternativa:** integrar el gasto de comida en el flujo central. Se rechaza: el
  detalle auxiliar no es un Gasto central y duplicaría el banco.
- **Consecuencia:** si E3.5 no está instalada, el bloque muestra No disponible con
  motivo y el flujo central sigue siendo utilizable. Con E3.4 integrada se puede
  consultar el detalle auxiliar y sus reposiciones; los agregados de E3.5 no se
  simulan.

### P-05 — Vista transversal como read model, no como maestro

- **Recomendación:** una vista de pendientes que compone resultados de los motores
  existentes. Cada fila conserva el ID de la fuente, su revisión y un enlace al caso.
  La clave de fila es efímera y no se persiste.
- **Alternativa:** una tabla nueva de «casos pendientes». Se rechaza: duplicaría
  maestros y estados.
- **Consecuencia:** no hay escritura desde la vista; las acciones navegan al caso.

### P-06 — Taxonomía de estados y severidad

- **Recomendación:** estados de fila `Pendiente`, `Exceso`, `Revisar`, `Alerta`,
  `No disponible`, `Resuelto`; cobertura `Verificada`, `Parcial`, `No disponible`,
  `No aplica`; severidad `Alerta de conciliación`, `No disponible` o `null` (fila
  normal). El rechazo estructural no es una fila: es un error de escritura atómico.
  La specification §5.4 concreta la serialización.
- **Alternativa:** usar `Pendiente/Completo/Excedido` del motor de Presupuestos.
  Se rechaza: mezcla semánticas de plan y de caso.
- **Consecuencia:** una fila puede ser `Pendiente` con cobertura `Parcial`; no se
  colapsan estado y cobertura.

### P-07 — Sin total económico entre tipos

- **Recomendación:** la vista muestra conteos por tipo/estado y los importes de cada
  fila. No ofrece un «total pendiente» que sume Anticipos, Compartidos y Comida, porque
  son magnitudes distintas y algunas no son deuda exigible.
- **Alternativa:** un KPI global. Se rechaza: crearía un estado financiero artificial.
- **Consecuencia:** se puede filtrar y ordenar; no se agrega entre tipos.

### P-08 — Filtros, alcance inicial y navegación

- **Recomendación:** filtros por tipo, estado, ciclo, ejercicio y cobertura; búsqueda
  por ID/nombre; enlace a ficha de Anticipo, ficha de Compartido, Comida del ciclo,
  Flujo del ciclo y Plan del ciclo.
- **Alcance inicial:** mostrar por defecto filas **no resueltas** (`Pendiente`, `Exceso`,
  `Revisar`, `Alerta`, `No disponible`). `Resuelto`, `Cerrado`, `Recuperado` y el
  histórico requieren acción explícita. No se ocultan las filas No disponible ni las
  alertas de conciliación: son parte honesta del alcance pendiente.
- **Ciclo:** el filtro selecciona casos con al menos un hecho elegible en esa ventana.
  El importe de una magnitud actual (Neto pendiente, Exceso, pendiente de terceros) se
  muestra como **actual**, no como pendiente al corte; sin foto/valor congelado no se
  reconstruye un histórico. El Fin temporal no es cierre financiero.
- **Ejercicio:** usa el año natural del último hecho elegible como contexto de la fila;
  no es el periodo del importe actual ni sustituye al ciclo.
- **Alternativa:** un único selector de «periodo» que sustituya ciclo y ejercicio.
  Se rechaza: oculta los cruces diciembre/enero y los ciclos no naturales.
- **Consecuencia:** ambos ejes se muestran por separado cuando difieren; una fila sin
  fecha propia muestra «—» y no se fuerza a un año o ciclo inventado.

### P-09 — Matriz DT5 con severidad futura, sin implementar protección

- **Recomendación:** clasificar cada cambio por magnitud afectada, periodos, dependencia
  de fotografía/cierre y necesidad futura (bloqueo, alerta, revisión, invalidación o
  sin efecto). No definir endpoints, locks ni re-cierres.
- **Alternativa:** posponer la matriz a E4.8. Se rechaza: el roadmap exige prepararla
  en E3.6.
- **Consecuencia:** la matriz es un insumo para E4.8/E4.9, no un contrato operativo.

### P-10 — Ausencia de fuente no se convierte en reconciliación

- **Recomendación:** si falta E3.5, `FIN_NETA`, cobertura histórica o proveedor de
  Cierres, la fila o métrica muestra `No disponible` con motivo. No se muestra
  `Coincide`, `0` ni `Completada`.
- **Alternativa:** asumir cero o completar con el pendiente actual. Se rechaza por R4
  y por la regla de cobertura.
- **Consecuencia:** el flujo central y los casos disponibles siguen visibles; solo se
  bloquean los agregados dependientes.

## 3. Decisiones Q-S21-01–04 — aprobadas

Aprobadas por el usuario el 2026-10-27, **opción A en las cuatro**. Las opciones B/C,
recomendaciones y consecuencias se conservan como historia; no se reabren sin
contradicción demostrada.

### Q-S21-01 — Atribución temporal del Recuperado de Compartidos entre ciclos

**Situación:** un Gasto compartido de 300 € se registra el 28/12/2026 en un ciclo que
termina el 19/01/2027. Un tercero aporta 100 € el 10/01/2027. El Neto central del Gasto
es 200 €, pero la aportación cae en otro mes natural y puede caer en otro ciclo.

**Escenarios que deben distinguirse** (definición canónica con importes en
[specification §15.6](21-pendientes-conciliacion-specification.md#156-cruces-de-ciclo-año-natural-y-ambos); aquí se resumen):

- **E1 — mismo ciclo, distinto año natural:** Gasto 28/12/2026 y aportación 10/01/2027,
  ambos en el ciclo 20/12–19/01. El ciclo es uno; los ejercicios naturales son 2026 y
  2027.
- **E2 — mismo año natural, distintos ciclos:** Gasto 05/01/2027 en el ciclo
  20/12–19/01 y Gasto 25/01/2027 en el ciclo 20/01–19/02. Ambos son ejercicio 2027,
  pero ciclos distintos.
- **E3 — distinto ciclo y distinto año natural:** Gasto 28/12/2026 en el ciclo
  20/12–19/01 y aportación 25/01/2027 en el ciclo 20/01–19/02.

**Opciones:**

- A. **Atribución económica por Gasto (recomendada):** el ciclo del Gasto muestra
  Gasto neto 200 €; la aportación se muestra como cobro del ciclo en que ocurrió, sin
  sumarse como ingreso. El Neto de un ciclo sin fotografía/cierre puede actualizarse,
  incluso si su Fin temporal ya pasó; un ciclo con fotografía/cierre futuro no se
  reescribe.
- B. **Atribución de caja por aportación:** el ciclo del Gasto mantiene 300 € de gasto;
  el ciclo de la aportación muestra −100 € de ajuste. Puede producir gasto neto
  negativo y no coincide con el Neto por Gasto.
- C. **Dual explícita:** mostrar ambas lecturas etiquetadas y no elegir una principal.
  Es compatible con A como vista económica, pero exige decisión de UX.

**Recomendación:** A como vista económica principal, con una memoria de caja separada
y una etiqueta clara; C solo como presentación, no como excusa para no decidir. La
razón es que el Neto central de spec14 ya está atribuido por Gasto/Partida; B obligaría
a reasignar un Recuperado global a otro ciclo y a mostrar importes negativos sin
correspondencia con el Neto del Gasto.

**Histórico y fotografía:** mientras no exista foto/cierre, la vista es un **cálculo
vivo** y puede cambiar con recuperaciones posteriores; se etiqueta como tal. Si existe
foto/cierre, se usan los valores persistidos y no se recalcula el pasado. Un cambio de
Ciclo que mueva la ventana invalida la lectura viva y exige recalcular; no se cachea
como verdad.

**Decisión aprobada (usuario, 2026-10-27): opción A.** Atribución por Gasto/Partida,
memoria de caja separada y foto/cierre que congela el histórico. Las opciones B/C quedan
como historia.

### Q-S21-02 — ¿El flujo ajustado sustituye o convive con el S bruto E2.6?

**Opciones:**

- A. **Convivencia (recomendada):** conservar `Gasto bruto registrado` y `S bruto
  observado` E2.6 **intactos y visibles**; añadir `Gasto neto ajustado` y `S ajustado`
  con etiqueta propia y cobertura PARCIAL.
- B. **Sustitución:** reemplazar el Gasto bruto por el neto en la vista principal.
  Cambia la lectura aprobada de E2.6 y exige nueva aprobación.

**Recomendación:** A. El flujo ajustado es una vista derivada explícita; no se
presenta como «flujo real completo» ni como ahorro. `S ajustado` combina ingresos
bancarios con el Neto central por Recuperado: se etiqueta como resultado ajustado por
Recuperado, no como coste propio ni caja total.

**Decisión aprobada (usuario, 2026-10-27): opción A.** Se confirma `G_n = G_b − R_adj`
como gasto neto del ciclo por recuperaciones, sin confundirlo con coste propio,
pendiente o exceso.

### Q-S21-03 — Alcance de la vista de pendientes

**Opciones:**

- A. **Solo filas no resueltas por defecto (recomendada):** `Pendiente`, `Exceso`,
  `Revisar`, `Alerta` y `No disponible`; histórico, cerrados y resueltos requieren
  acción explícita.
- B. **Todos los casos siempre**, incluidos cerrados/resueltos. Puede ocultar lo
  accionable y mezclar historia con pendiente.
- C. **Solo Pendiente/Exceso**, ocultando Revisar y No disponible. Se rechaza: oculta
  incidencias y cobertura incompleta.

**Recomendación:** A, con contadores por tipo/estado y sin total económico global. El
filtro de ciclo selecciona casos con actividad en la ventana; el importe actual se
etiqueta como actual, no como pendiente al corte.

**Decisión aprobada (usuario, 2026-10-27): opción A.** Incluye `Alerta` y `No
disponible` en el alcance por defecto y acceso explícito al histórico.

### Q-S21-04 — Comida cuando E3.5 no está integrada

**Opciones:**

- A. **Mostrar Comida como No disponible con motivo (recomendada)**, sin cifras ni
  reconciliación. Con E3.4 integrada se puede consultar el detalle auxiliar, su
  clasificación, evidencia y reposiciones; los agregados `Gasto comida`,
  `Compensable`, `Falta`, `Recursos`, `CIERRE` y `DIF` siguen No disponible hasta
  E3.5/`FIN_NETA`.
- B. **Ocultar Comida por completo** hasta que E3.5 esté integrada. Se rechaza: oculta
  el alcance pendiente y el enlace a Revisión Comida.
- C. **Usar el candidato local como si estuviera instalado.** Se rechaza: no es main
  ni está aceptado.

**Recomendación:** A. Conserva visibilidad del alcance pendiente sin simular motor y
distingue lo que E3.4 ya permite ver de lo que depende de E3.5.

**Decisión aprobada (usuario, 2026-10-27): opción A.** Detalle E3.4 visible; agregados
E3.5/`FIN_NETA` No disponible hasta integrarse y aceptarse.

## 4. Cobertura del brainstorming

| Área | Estado de la propuesta |
| --- | --- |
| Requisitos funcionales | Cubiertos: Anticipos, Compartidos, Comida, Plan, Flujo, conciliación y navegación. |
| Pantallas e interacción | Wireframes 1440/390 en la specification; pendientes de revisión. |
| Datos leídos/escritos | Solo lectura de motores; no hay escrituras nuevas. |
| APIs/dependencias externas | Endpoints de consulta propuestos; sin dependencias externas nuevas. |
| Validación | Identidad, importes, fechas, estados, filtros y rechazos estructurales. |
| Errores y límites | Vacío, carga, error, parcial, no disponible, conflicto y sesión. |
| Cierres | Solo matriz DT5 preparatoria; sin implementación. |

## 5. Wireframes

La propuesta visual está en
[specification §7](21-pendientes-conciliacion-specification.md#7-screens-and-interfaces).
No hay feedback visual del usuario en esta ronda; no se declara aprobada.

## 6. Clarificaciones append-only

Sin clarificaciones posteriores. Las respuestas futuras se añadirán sin reescribir
las preguntas ni las decisiones anteriores.

## 7. Registro de aprobación — 2026-10-27

Fuente: mensaje real del usuario en la sesión `SPEC21-E3.6`. Texto relevante:
«Apruebo las cuatro decisiones propuestas» (Q-S21-01–04, opción A) y «Autorizo el
cierre documental de SPEC21». No autoriza desarrollo E3.6, ni reanudación de DEV18,
DEV18-LINUX u otras tareas bloqueadas. La publicación de rama/PR se rige por la
autorización expresa de cierre documental; el merge sigue requiriendo aprobación
separada.
