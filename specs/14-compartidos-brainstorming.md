# 14 — Gasto compartido y reparto verificable: Brainstorming
Status: DRAFT — Ronda 1 resuelta (Q1–Q7, transcripción usuario 2026-10-25); aprobación
de la specification PENDING
Roadmap/context: [E3.2 roadmap](roadmap.md) · [referencia funcional v5.11](functional-reference-v5.11.md) ·
[E1.5](05-transferencias-referencias-specification.md) · [spec12](12-flujo-mensual-specification.md) ·
[spec13 aprobada + Q9](13-anticipos-specification.md)
Base: `fa8a01ee72ee622e6d3f71cd170e5d399376473e` (origin/main verificada hoy; incluye
PR68 harness v2.9.0, PR69 spec13 rev3 aprobada y PR70 enmienda Q9). Rama
`codex/spec14-compartidos`; worktree aislado sobre `fa8a01e` (temporal del agente).
Checkouts ajenos preservados: dev12 (`c971ff4`, PR67 pendiente de merge), borradores
spec13 (worktree en base 10bb794), handoff v2.9.0. Next action: esperar respuestas
de la Ronda 1 y después preparar spec + wireframes 390/1440.

## Autorización y preflight — 2026-10-25
Usuario vía coordinador: autoriza preparar la especificación E3.2, solo
especificación; esta autorización no aprueba la propuesta. Ownership exclusivo:
este archivo y `specs/14-compartidos-specification.md`. Sin tablero, código, SQL,
suites funcionales ni subdelegación. AGENTS.md vigente (Coordinación v2.9.0) leído
en la base. Skills locales vía $spec; sin adaptador OpenCode. Sin Excel real, VPS,
merge/deploy, B3/Dev32 ni datos financieros reales; sin habilitar Transferencias
Exterior por inferencia.

## Contraste con contratos aprobados (lectura)
- R4 (v5.11): Gasto conserva Partida e importe real; aportaciones = Transferencias
  desde Exterior con Referencia y Quién paga; ficha calcula bruto/recuperado/neto/
  exceso, estado y fechas; participantes con rol/partes/cobertura/pendiente/exceso;
  Cerrado significa reparto cubierto, no Neto cero; informes consumen Neto y
  atribución proporcional centralizados. Variante histórica Exterior preservada
  (patrón aprobado en E3.1).
- Roadmap E3.2: AC1 (Partida/importe del Gasto original mantenido; aportaciones con
  Quién paga y Referencia), AC2 (Cerrado por reparto cubierto aunque Neto sea
  positivo), AC3 (informes consumen Neto y atribución proporcional centralizados).
- E1.5: CAT013 Gasto compartido admite Gasto o Transferencia; CAT013 sigue
  bloqueada hasta fichas E3; hoy no existen Quién paga, participantes ni ficha.
- Servicio común de Transferencias (leído en main): exige origen y destino internos
  elegibles y rechaza S000 en altas nuevas. La incompatibilidad Exterior queda
  confirmada en código y se expone como decisión focal; no se elude ni se amplía.
- Q9 de spec13 (aprobada): el rol de un hecho no se deduce de origen/destino/
  Referencia; exige metadatos explícitos por Movimiento con revisión y protocolo.
  Ese precedente es directo para el «Quién paga» de E3.2.
- spec12/AC-41–47: gasto bruto no equivale a H física; el Neto compartido central
  no descuenta dos veces Anticipos/Comida; PR67/dev12 pendiente, no asumida.
- Dev13: implementación E3.1 suspendida en B13-1; el patrón ficha/motor/wireframes
  de su spec aprobada es referente conceptual, sin depender de su código.

## Confirmado por el paquete (no se reabren)
Gasto original conserva Partida e importe real; aportaciones = Transferencias con
Referencia y Quién paga, no ingresos ficticios; ficha 1:1 sin huérfanos; Cerrado =
reparto cubierto aunque Neto sea positivo; bruto/recuperado/neto/exceso, estado,
fechas, participantes y atribución proporcional desde un motor central; no atribuir
por similitud; ampliar Transferencias con Exterior exige contrato y autorización
específicos, no derivados de esta spec.

## Ronda 1 — 2026-10-25
Question Q1 — Alta del caso y relación ficha/participantes
- [x] Recommended: alta atómica de Referencia (CAT013) y ficha 1:1 en una única
  transacción con rollback completo, como la ficha Anticipo aprobada; los
  participantes se gestionan después como registros hijos con alta, edición,
  baja y auditoría propias, sin modificar la ficha base; integridad 1:1 verificada
  en alta y lectura.
- [ ] Alternative: participantes obligatorios dentro de la transacción del alta —
  bloquea abrir un caso antes de decidir el reparto y complica correcciones.
Confirmed answer: PENDING; source/date: PENDING

Question Q2 — Identidad y rol de los participantes
- [x] Recommended: participante como registro dentro de la ficha. Nombre editable
  que no es clave; ID de servidor estable; rol pagador; fecha alta y auditoría.
  Opcional: vínculo con un Saldo propio existente para aportaciones internas, sin
  derivar atribución de ese vínculo. El pagador del Gasto original queda a la vista
  como dueño del Saldo del hecho; no hay campo de participante global.
- [ ] Alternative: catálogo global de personas reutilizable entre casos — añade un
  maestro nuevo con datos personales que v5.11 no exige para este ámbito.
Confirmed answer: PENDING; source/date: PENDING

Question Q3 — Partes y precisión del reparto (DT2/DT8)
- [x] Recommended: partes enteras por participante. Coste asignado repartido en
  céntimos exactos, con residuo de redondeo asignado por método determinista
  (mayor resto) y mostrado, sin recalcular el Gasto ni inventar decimales.
  Precisión y presentación siguen DT2/DT8, que quedan citados en la spec.
- [ ] Alternative: porcentaje decimal por participante — introduce redondeos
  acumulados y necesita reglas de precisión adicionales no aprobadas aún.
Confirmed answer: PENDING; source/date: PENDING

Question Q4 — Acreditación del Quién paga en cada aportación
- [x] Recommended: metadatos mínimos por Movimiento, siguiendo Q9 de spec13
  (FK única por ID de Movimiento, 0..1): participante pagador explícito, rol
  Aportación, orientación/par del hecho, evidencia, procedencia, revisión y
  auditoría. El motor central lee rol e identidad solo del metadato; nunca de
  concepto libre, importe, fecha ni Saldos. Históricos sin acreditación quedan
  «Revisar» y solo subtotales acreditados Parciales.
- [ ] Alternative: guardar el pagador en el Concepto (texto libre) — el rol no
  se acredita así y contradice Q9 ya aprobada.
Confirmed answer: PENDING; source/date: PENDING

Question Q5 — Decisión focal Exterior: aportaciones nuevas
- [x] Recommended: declarar la incompatibilidad y no habilitar nada: las altas
  nuevas de aportación son Transferencias internas (participante con Saldo propio
  en la app) acreditadas vía Q4. Aportaciones históricas desde Exterior se
  conservan si existen en los datos, etiquetadas con su procedencia y limitaciones.
  La ampliación del servicio para aceptar Exterior es un gate OPEN con contrato y
  autorización específicos, que esta spec no concede ni presume.
- [ ] Alternative: ampliar el servicio común dentro de spec14 para aceptar Exterior
  con Referencia compartida — lo prohíbe el alcance de este paquete y el contrato
  vigente; separar el gate es la opción segura.
Confirmed answer: PENDING; source/date: PENDING

Question Q6 — Gastos del caso, estados y fechas derivadas
- [x] Recommended: un Gasto original por caso (Partida CAT013 e importe reales).
  Otros Gastos con la misma Referencia no entran en el caso y se marcan «Revisar».
  Fechas derivadas: la del Gasto, la de la última aportación acreditada, la de
  reparto cubierto y la de exceso, existiendo solo con hechos que las soporten.
  Estado del caso con vocabulario propio: Sin repartir / Reparto parcial /
  Cerrado (reparto cubierto) / Excedido; derivado del motor, sin campo manual.
  Cerrado no exige Neto cero: puede ser cubierto con coste propio positivo.
- [ ] Alternative: reutilizar el vocabulario de Anticipos — mezcla préstamo y
  recuperación con cobertura de reparto, conceptos distintos y estados aprobados
  que la referencia funcional distingue por diseño.
Confirmed answer: PENDING; source/date: PENDING

Question Q7 — Parciales, excesos y rectificación/historia
- [x] Recommended: por participante, pendiente = coste asignado − aportación
  acreditada; si es negativo, se presenta como su exceso, separado del estado
  general del caso. No se compensan excesos entre participantes. Rectificaciones
  y bajas pasan por revisión y auditoría; cualquier cambio posterior de partes
  genera aviso de recalculo del reparto y protección de aportaciones ya
  acreditadas; nunca se revalida un hecho pasado o se reescriben importes o fechas.
  Historia de la ficha en append con auditoría.
- [ ] Alternative: neto único del caso sin detalle por participante — pierde el
  AC2 (reparto cubierto) y el AC3 (atribución proporcional centralizada).
Confirmed answer: PENDING; source/date: PENDING

## Coverage
Se detalla en la spec tras las respuestas: funcional, pantallas (390/1440),
lectura/escritura, servicio común de Transferencias, validación, errores y extremos.
Gate de dev explícito: nada de E3 está integrado o aprobado para desarrollo;
spec14 no lo concede.

## Append-only clarifications
Rondas nuevas se anexan al final; nunca se reescriben preguntas o respuestas previas.

## Ronda 1 — Respuestas del usuario (transcripción vía coordinador) — 2026-10-25
Estado: CONFIRMADAS. Álex contrastó con R4, E1.5, E3.2 y E3.6 del roadmap. Texto
transcrito (fiel, resumido en verbos de decisión; prohibido reinterpretarlo).

Q1 — APROBADA A. Alta atómica Referencia CAT013 + ficha 1:1. Participantes
gestionados posteriormente como hijos 1:N, con integridad, auditoría y sin
modificar el maestro de Referencias innecesariamente.
Q2 — APROBADA A. Participante por caso con ID estable, nombre editable, roles y
auditoría; sin maestro global de personas. No deducir quién realizó una
aportación a partir de un Saldo propio. Distinguir el Saldo desde el que se
pagó el Gasto original del participante al que corresponde cada parte.
Q3 — APROBADA A, con precisión. Partes enteras, cálculos exactos en céntimos.
Mayor resto para residuales, con desempate determinista por ID estable.
Suma de asignados = coste exacto del reparto. Conservar las Partidas de cada
Gasto real; varios Gastos/Partidas con atribución proporcional coherente del
motor único, sin inventar importes ni alterar Movimientos.
Q4 — APROBADA A CON PRECISIÓN. Solo metadatos necesarios para acreditar
«Quién paga» en aportaciones; asociados al ID del Movimiento canónico y al
participante; reutilizar auditoría, evidencia, revisión e idempotencia; no
duplicar fecha, importe, Origen ni Destino bancarios. Q9 de Anticipos es
precedente de integridad, sin obligar a replicar orientación/par innecesaria.
Históricos sin evidencia suficiente: Revisar/No disponible, sin atribución
automática.
Q5 — NO APROBADA A COMO SOLUCIÓN FUNCIONAL COMPLETA. R4 exige aportaciones
reales de terceros como Transferencias desde Exterior con Referencia y Quién
paga; una Transferencia entre Saldos propios NO representa dinero recuperado
de otra persona; el servicio vigente de E1.5 aún rechaza Exterior en altas
nuevas. Decisión: conservar la restricción técnica; no simular externas como
internas; conservar históricos válidos de Exterior con procedencia; documentar
el bloqueo funcional y la dependencia de contrato específico de Transferencias
con Exterior; proponer esa ampliación para autorización separada; no ampliar
E1.5 dentro de spec14; **no declarar E3.2 funcionalmente completo** si no
puede registrar las aportaciones que exige su contrato.
Q6 — ESTADOS APROBADOS (A); CARDINALIDAD CORREGIDA. Se rechaza la propuesta
previa de un único Gasto original por caso: no limitar cada Referencia
compartida a un único Gasto; permitir varios Gastos reales elegibles, incluso
con Partidas distintas, según el contrato multi-Partida de E3.6. Cada Gasto
conserva identidad, Partida, fecha e importe; el motor agrega por Referencia
y atribuye recuperaciones sin doble cómputo. Vocabulario aprobado: Sin
repartir (falta reparto válido), Reparto parcial (importes por cubrir de
participantes), Cerrado (reparto de participantes cubierto aunque permanezca
coste propio positivo), Excedido (aportaciones superiores a lo asignado,
indicando a qué participante). Casos sin hechos o sin cobertura suficiente no
pasan a Cerrado. Fechas derivadas solo de hechos elegibles y cobertura
verificable.
Q7 — APROBADA A. Por participante: asignado (reparto válido), aportado
(hechos acreditados), pendiente y exceso calculados por separado; sin
compensar automáticamente el exceso de una persona con lo pendiente de otra.
Cambios de partes/participantes con aportaciones existentes: vista de impacto,
motivo, auditoría y protección de integridad histórica. No reescribir
movimientos bancarios por cambios de reparto.

## Continuidad decidida (2026-10-25)
Actualizar el brainstorming y preparar specification/wireframes que incorporen
estas decisiones; identificar Q5 expresamente como dependencia material no
resuelta dentro del contrato actual; sin implementar Exterior, sin modificar
SQL/Excel, sin desarrollo ni merge; presentar alcance documental y conflictos
restantes antes de pedir aprobación completa.

## Revisión del coordinador — 2026-10-25 (append-only; Q1–Q7 no reabiertas)
Spec sigue DRAFT. Sin commit, push, aprobación completa, desarrollo ni merge.
1. **Neto.** R4 y spec12 mencionan Neto sin fijar signo ni base. La spec usa una
   sola fórmula: Neto = Bruto − Recuperado (positivo = coste no recuperado). Se
   corrige la discrepancia de signo de la versión anterior. Pregunta F1 (signo y
   base) y F2 (si el Recuperado incluye exceso).
2. **Coste propio y Cerrado.** La parte del Titular se trata como Coste propio sin
   aportación exigible (P2); Cerrado exige pendiente 0 de terceros y sin excesos,
   no Neto cero. Pregunta F3: ¿el Titular figura como parte del reparto?
3. **Exterior.** Se elimina la contradicción de §5: los movimientos entre Saldos
   propios no son aportaciones acreditables ni recuperación de terceros (Q5). Solo
   son acreditables históricos de terceros con procedencia Exterior. Altas nuevas
   bloqueadas (D5).
4. **Exceso en W1/W4.** Álex aporta 300 € sobre 150 € asignados: exceso 150 €, no
   0 €. No compensa el pendiente de Bea (150 €). Corregido. Al corregir, apareció
   una cuestión no resuelta por Q6: qué estado prevalece si coexisten pendiente y
   exceso. Pregunta F5 (A: Excedido prevalece; B: Reparto parcial prevalece).
5. **Multi-Partida.** Propuesta técnica P3: reparto por Gasto con mayor resto, desempate
   por ID estable ascendente, Partidas exactas, total exacto. Ejemplo verificado
   con aritmética exacta (183,34 / 183,33 / 183,33 = 550,00). Alternativa global
   en pregunta F4; no está confirmada.
6. **Estado de entregas.** Según el coordinador: dev13 ya no está suspendido en
   B13-1; Q9 integrada en PR70; candidato dev13 publicado en PR71 pendiente de CI/QA.
   No verificado en este checkout. Dev12/PR67 separado y sin merge.

Preguntas materiales abiertas: F1, F2, F3, F4, F5. Menor: F6 (importes negativos
no elegibles, propuesta ordinaria). Confirmadas: Q1–Q7 (sin cambio).

## Decisiones F1–F6 — usuario, 2026-10-25 (append-only)
- **F1 · Neto — A.** Neto = Bruto − Recuperado. Puede ser negativo.
- **F2 · Exceso — A.** Todo lo efectivamente recuperado cuenta, incluido el exceso.
- **F3 · Titular — A.** Participa en el reparto, pero no tiene que devolverse
  dinero a sí mismo.
- **F4 · Redondeo — A.** Reparto exacto en céntimos por cada Gasto y Partida.
- **F5 · Estados — B.** Primero mostrar lo pendiente, con alerta de exceso
  simultánea. Excedido solo con reparto cubierto y exceso; Cerrado solo sin excesos.
- **F6 · Negativos — aceptar con precisión.** No computar importes inválidos como
  Gastos elegibles ni ocultar el problema de cobertura.
  Precisión propuesta, pendiente de confirmación explícita: un importe inválido
  muestra alerta y bloquea Cerrado (P-F6).

Efecto en la spec: F1–F6 pasan a decisiones confirmadas (§2.2); P-F6 queda como
única propuesta abierta (§2.3 y §12). Sigue DRAFT; sin aprobación completa.
Sin commit, push, desarrollo ni merge.

## P-F6 aprobada — Álex, 2026-10-25 (append-only)
Confirmación expresa: **P-F6 APROBADA**. Todo Gasto vinculado al caso con importe
inválido o incompatible con el contrato financiero que comprometa la cobertura del
Bruto bloquea «Cerrado». Reglas: no declarar Cerrado con incidencia relevante sin
resolver; «Revisar» con Movimiento y motivo; Movimiento original y efecto bancario
conservados; solo subtotales acreditados como Parciales; Bruto, Neto y reparto no
completos mientras la cobertura esté comprometida; negativos no se convierten en
devoluciones ni se rectifican hechos sin autorización; tras resolver por los
procedimientos vigentes, recálculo del motor y estado.
Con esto quedan cerradas P-F6 y F1–F5. D5/Exterior sigue OPEN como dependencia
independiente. Estado de dev13/PR71 no presumido: pendiente de verificación del
coordinador. Autoriza preparación documental y presentación de la spec completa
para aprobación; no autoriza desarrollo, SQL, Excel ni merge.

## Recuperación multi-Partida y Cerrado con coste propio — Álex, 2026-10-25 (append-only)
Confirmadas por Álex, sin reabrir Q1–Q7 ni F1–F6. Incorporadas en la spec como §2.4.
- **Recuperado multi-Partida:** el Recuperado de cada tercero se distribuye entre sus
  Gastos en proporción al asignado en cada uno; céntimos exactos, mayor resto,
  desempate por ID estable de Gasto; exceso íntegro. Sin cuota asignada positiva →
  incidencia, sin división entre cero. Neto Gasto = Bruto − Recuperado atribuido;
  Neto Partida = suma; Neto caso = suma = Bruto − Recuperado total. Sin reparto
  directo del Recuperado global entre Partidas; sin acreditación relevante → Parcial
  o No disponible.
- **Cerrado y coste propio:** se elimina «sin aportaciones nunca Cerrado». Estados
  con hechos y reparto verificables: Sin repartir (falta reparto válido); Reparto
  parcial (algún tercero con pendiente); Excedido (ningún pendiente y exceso);
  Cerrado (sin pendientes ni excesos). Pendiente + exceso → Reparto parcial con
  alerta. Incidencia relevante (P-F6) bloquea Cerrado y muestra «Revisar».
  Ejemplo: Bruto 150, coste propio 50, terceros 50 + 50 recuperados → Recuperado 100,
  Neto 50, Cerrado.

Consecuencia documental: la aplicación de P-F6 a la recuperación sin cuota asignada
se trata como incidencia relevante. Se pide confirmarla en la aprobación completa.
Spec: 39 AC (AC-01 a AC-39). D5/Exterior sigue OPEN. Sin commit, push ni merge.

## Aprobación completa de spec14 — usuario, 2026-10-25 (append-only)
El usuario aprobó la specification completa en el chat del coordinador. Estado de la
spec: APPROVED. Incluye Q1–Q7, F1–F5, P-F6, R-MP y R-CC, con 39 AC.
Queda abierto y separado: D5/Exterior (contrato y autorización propios). Esta
aprobación no autoriza desarrollo14, SQL, Excel, push ni merge; el commit local
registra solo la documentación aprobada.

## División documental Base B aprobada — 2026-10-26 (append-only)

Fuente directa: usuario «Apruebo la división documental base B de la propuesta
consolidada», respuesta a la presentación inequívoca de esa división. Snapshot
aprobado SHA-256: e1839ba8e851fce25dca611a2247229b7dec60496ce402e38327069f8fc5a4d0.

- Base B: ficha/participantes, Gasto CAT013 y motor sin aportaciones D5. Las
  Transferencias internas con Referencia compartida conservan su efecto bancario
  y no acreditan recuperación.
- Matriz de 39 AC: 18 completas para el alcance B, 11 parciales y 10 pendientes
  de D5; se conservan sus IDs. AC-31 se limita a la rama P-F6 de B; no acredita
  la rama R-MP futura.
- AC-20 sigue en E3.2: contrato/read model central en B-T06/B-T08 y consumo por
  informes aplazado en B-T11, UNRUN. B-T01–B-T10 son condiciones futuras para
  aceptar B como entrega autónoma.
- Limitación de métricas aprobada para B: una fuente ausente no es cero;
  campos dependientes No disponible/Parcial. Neto = Bruto, coincidente con Coste
  propio, en el caso 100% Titular verificable y sin incidencias. No se añade el
  indicador Pendiente máximo.
- D5-P1 queda resuelta como división documental de este alcance, sin demostrar
  todavía viabilidad ni aceptación funcional. D5 es posterior, sin entrega
  conjunta; su enmienda completa y la coordinación con spec05 mantienen gates propios.
- Procedencia: OpenCode, Task EXT-OPENCODE-SPEC14-D5, sesión Spec14; revisión
  Antigravity EXT-ANTIGRAVITY-SPEC14-BASEB-QA sobre el original e95a0c85…;
  precisiones de Codex incorporadas al snapshot aprobado por el usuario.

Contenido y trazabilidad completos en spec14 §14. Q1–Q7, F1–F5, P-F6, R-MP y
R-CC no se reabren. El borrador D5 y su sustitución de AC-21 no se aprueban aquí;
los 39 AC base se conservan. Esta aprobación no autoriza desarrollo B/dev14/D5,
datos reales, SQL operativo, edición de spec05, importación histórica, merge ni
despliegue. La publicación documental sigue la política Git; el merge de su PR
exige aprobación separada.

## D5/Exterior — Ronda 1 y respuestas del usuario — 2026-10-26 (append-only)

Estado: **D5-Q1–D5-Q6 aprobadas conceptualmente (opción A) con precisiones; la
enmienda documental §15 de la specification queda PROPUESTA y pendiente de
revisión final.** No es aprobación documental final ni autorización de desarrollo.
No se reabren Q1–Q7, F1–F6, P-F6, R-MP, R-CC, Base B ni los 39 AC base.

Fuente: mensaje del usuario «Apruebo conceptualmente las opciones A de D5-Q1 a
D5-Q6, con las siguientes precisiones obligatorias», 2026-10-26. Base de esta
revisión: main `24b48c5` (PR75/Base B `5ad75ed` integrada; esquema v15).
Procedencia del borrador: OpenCode, worktree `.../T/opencode/spec14-d5`, base
`a445f90`, sin commits; se conserva su texto y autoría, recompuesto sobre Base B.

### Contraste confirmado del contrato vigente (no se pregunta)

1. **R4/E3.2-AC1.** El Gasto conserva Partida e importe real. Una aportación de
   tercero es una Transferencia desde Exterior con Referencia y Quién paga; no es
   un Ingreso, no crea un Gasto ficticio y no se simula con un movimiento entre
   Saldos propios (Q5). La variante histórica Exterior se conserva con procedencia.
2. **D4.** La acreditación son metadatos mínimos sobre el ID canónico del
   Movimiento y el participante: sin copiar importe, fecha, Origen ni Destino;
   con evidencia/procedencia, revisión, auditoría e idempotencia. La dirección o
   la Referencia por sí solas nunca acreditan el rol (Q9/AC-10).
3. **E1.5 vigente.** Transferencia es un único Movimiento, sin Partida ni Subtipo,
   entre dos extremos internos; S000 se rechaza en servicio y CHECK. CAT013 no es
   un Tipo operativo. Todas las Transferencias con Exterior —ordinarias y
   especiales— están reservadas fuera de E1.5; AC-31 sigue siendo contrato futuro.
4. **Q9/H1 de spec13.** El rol no se deduce de origen/destino/Referencia. Solo las
   Transferencias llevan metadatos de atribución; Gastos/Ingresos con la misma
   Referencia conservan su asociación sin metadatos. Una Transferencia acreditada
   no cambia de Tipo ni de Referencia; anularla retira la acreditación. Este
   precedente se reutiliza, sin copiar orientación/par que D4 no exige.
5. **Motor y estados de spec14.** Exceso permitido e íntegro (F2/F5); sin
   compensación entre participantes (D7); recuperación sin cuota asignada produce
   incidencia y bloquea Cerrado (R-MP); los movimientos internos no acreditan
   recuperación; el banco nunca se reescribe por cambios de reparto (AC-19/AC-30).
6. **Base B integrada.** Ficha 1:1, participantes, Gasto CAT013 y motor sin
   aportaciones ya existen en main v15. D5 no los duplica ni declara E3.2 completo;
   B-T11 y aceptación global siguen pendientes.
7. **Seguridad.** Solo el titular autenticado registra; no hay cuenta ni portal de
   terceros. MFA/sesión, Origin/CSRF, validación en API, idempotencia y errores sin
   datos sensibles se heredan. No se añaden roles ni permisos por esta enmienda.

### Preguntas y respuestas (todas con opción A y precisiones)

**D5-Q1 — Alcance, dirección y destino**
- A (elegida): habilitar **solo la aportación nueva de tercero**: Transferencia
  S000 → Saldo interno activo elegible, REF CAT013 y Quién paga. No habilitar
  Transferencias ordinarias con Exterior ni salidas interno→Exterior. El Destino
  conserva la elegibilidad de extremos internos de E1.5 (activo, no S000, no
  Manual, no Control Exterior; sin excluir Terminal/No controlado por inferencia).
- Precisión del usuario: CAT013 identifica el ámbito funcional, no convierte la
  Transferencia en Gasto ni deriva clasificación económica; la elegibilidad se
  comprueba por la Referencia y su ficha.

**D5-Q2 — Quién paga, cardinalidad y evidencia**
- A (elegida): un Movimiento acredita **un solo participante Tercero** de la misma
  ficha, activo; metadatos 0..1 por Movimiento; sin creación implícita; el Titular
  no es pagador acreditable; no se divide un Movimiento entre varias personas;
  evidencia y procedencia obligatorias y revisables. Si un ingreso cubre a varias
  personas, se registra el pagador real y no se infiere el reparto.
- Precisión: el mínimo de evidencia se concreta en la enmienda (propuesta 10–500
  y enum de procedencia) para revisión.

**D5-Q3 — Punto de entrada UI/API**
- A (elegida): acción **«Registrar aportación»** en la ficha, formulario dedicado
  con Referencia bloqueada; el formulario común sigue sin S000/Exterior. La API
  extiende `POST /api/movimientos` con bloque `compartido`; la acreditación
  histórica usa una acción revisada propia. Sin endpoint paralelo de hechos.

**D5-Q4 — Históricos Exterior**
- A (elegida): conservarlos y mostrarlos con procedencia; acreditar solo por
  acción explícita revisada sobre un Movimiento ya vinculado a REF CAT013 y con
  ficha/participante; sin backfill, REF retroactiva ni atribución automática.
  Sin evidencia suficiente: Revisar/No disponible y subtotales Parciales.
- Precisión: el CHECK actual impide Transferencias S000; deben delimitarse los
  realmente elegibles. En v15 estándar no hay filas elegibles sin importación.

**D5-Q5 — Dependencia y gate CAT013/E3.2**
- A (elegida): D5 **no se implementa ni habilita por separado**; requiere
  autorización propia de dev D5 con Base B integrada. La aceptación global de
  E3.2 es posterior e incluye D5/B-T11; no es precondición circular. CAT013 para
  Gasto ya está habilitada por Base B; D5 solo añade la variante Transferencia
  entrante CAT013 y no completa E3.2 ni habilita Exterior ordinario.

**D5-Q6 — Rectificación, corrección de atribución y anulación**
- A (elegida): una Transferencia acreditada **no cambia de Tipo ni de
  Referencia**. Importe, fecha y Destino pueden rectificarse con vista de impacto,
  motivo, auditoría y revalidación; la corrección de participante/evidencia es una
  acción revisada con impacto; la anulación excluye el hecho del motor, conserva
  metadatos e historia y no reactiva ni borra. Sin DELETE físico.
- Precisión: preservar evidencia y valores originales, especialmente en registros
  bancarios importados.

**Invariantes operativas confirmadas:** transaccionalidad, idempotencia,
revalidación concurrente, 409 sin efectos parciales y rollback total.

### Decisiones conservadas, propuestas y pendientes

- **Aprobado (base):** todo Q1–Q7, F1–F6, P-F6, R-MP, R-CC, Base B §14 y los 39 AC
  base. D5 no los reabre.
- **Aprobado conceptualmente:** D5-Q1–D5-Q6 opción A con las precisiones
  anteriores; no equivale a aprobación documental final.
- **Propuesto:** §15 de la specification; `movimiento_compartido`, enum/evidencia,
  endpoints, D5-AC-01..15, matriz de riesgos, wireframes y enmienda consecuente de
  spec05 §D5.
- **Pendiente de revisión/aprobación:** P-D5-1..P-D5-6 de §15.16 (evidencia,
  históricos, numeración, spec05, UI y versión futura de esquema). No se inventan
  reglas financieras para cerrarlas.

### Límites

Solo especificación. Sin desarrollo D5, SQL/migraciones, Excel, datos reales, VPS,
merge ni despliegue. B-T11 no se implementa: conserva su dependencia y estado
pendiente. No se declara D5 aprobado, implementado ni E3.2 completo.
