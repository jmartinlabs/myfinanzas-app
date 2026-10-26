# 17 — E4.4 Deuda completa y conciliación desde apertura: Brainstorming

Status: **PROPUESTA DOCUMENTAL EN REVISIÓN** — 2026-10-26. Q1–Q7 tienen respuesta
registrada en la herramienta `question` de OpenCode; el **mensaje humano original y su
procedencia independiente están pendientes de contraste**. La especificación y los
wireframes **NO están aprobados**. Sin desarrollo, código, SQL operativo, migración, Excel,
datos reales, merge ni despliegue.


**Estado vigente — 2026-10-27:** Q1–Q7 confirmadas expresamente por el usuario en el chat supervisor Codex. Sustituye únicamente los estados históricos de contraste pendiente conservados abajo; specification/wireframes no aprobados.

Roadmap/context: [E4.4](roadmap.md#e44--deuda-completa-y-conciliación-desde-apertura),
[E1.6](06-deuda-specification.md), [R2/R5 y P4–P7](functional-reference-v5.11.md),
[spec04](04-movimientos-specification.md), [spec05](05-transferencias-referencias-specification.md),
[spec07](07-ciclos-operacion-specification.md), [guías](guidelines/architecture.md).
Next action: revisión final de Codex y aprobación explícita de specification/wireframes;
después, autorización separada de desarrollo. No se declara E4.4 aprobada ni implementada.

## Autorización y preflight

Paquete de coordinación externa para preparar E4.4, sus wireframes y testplan, y coordinar
QA independiente. La autorización incluye commits y publicación documental por rama/PR;
no incluye desarrollo, aprobación de la spec por agentes, migraciones operativas, merge
ni despliegue.

| Comprobación | Evidencia |
| --- | --- |
| Repositorio | repositorio local autorizado de MyFinanzas |
| Base/main verificado | `origin/main` = `26b6f0c8838e1d4dfe2a7bb38949f4fa240b7d5f` |
| Checkout aislado | worktree temporal aislado bajo el directorio aprobado de OpenCode; nunca `main` |
| Rama documental | `codex/spec17-e44-deuda-completa` |
| Número documental | **17** libre: no existía `specs/17-*` ni rama/commit previo de E4.4 |
| Ownership | Sin otro ejecutor, borrador o rama E4.4 con ownership vigente |
| Trabajo ajeno | D5/DEV16/E4.1 no contactados, reasignados ni modificados; checkout principal con cambios ajenos intacto |
| Referencia | v5.11(7) candidata, **no estable**; Codex no ha inspeccionado el Excel ni importado datos reales |
| Estado E1.6 | Implementada e integrada PR #34/`cb9ba3b`; 30 AC actuales verificados y `E1.6-AC-31…33` conservados como contratos futuros. No se reabren Q1–Q4 |
| Estado main | Esquema SQLite v16; E4.4 no fija una versión futura ni escribe SQL |

### Fuentes leídas

`AGENTS.md`, Skill `$spec`, reglas locales de coordinación y aprobaciones, `specs/README.md`,
roadmap E4.4 y dependencias, referencia funcional R2/R5/P4–P7, spec06 y su
brainstorming/testplan/progress, código y pruebas integrados de E1.6
(`apps/api/src/deudas.ts`, `debt-schema.ts`, `movimientos.ts`, `apps/web/src/Deudas.tsx`,
`apps/api/src/deudas.test.ts`), contratos de Partidas/Movimientos/Ciclos/Deudas, y guías de
arquitectura, UI, calidad y seguridad. No se recargaron documentos completos sin necesidad.

## Decisiones existentes que no se reabren

- **Deudas no son Saldos**. Dxxx es identidad estable; las relaciones se resuelven por ID.
  Una Partida tiene 0..1 Deuda; varias Partidas pueden apuntar a la misma Deuda. No se crea
  un Saldo, Movimiento, Ingreso, Gasto ni Transferencia artificial de apertura.
- **Capital actual E1.6**: capital pendiente apertura menos suma de capital amortizado de
  Movimientos del mismo ID cuya Fecha sea `>=` Fecha inicio control. Día inicial incluido;
  hechos anteriores no reducen; no se descuenta cuota completa ni intereses; no hay filtro
  adicional por Tipo, Control o Fecha inicio de deuda. La exclusión de anulados es contrato
  app ya aprobado, no una regla atribuida al SUMIFS del Excel.
- **Cuota ordinaria** es un Gasto íntegro; `capital + intereses = importe`, ambos explícitos,
  capital `> 0`, intereses `>= 0`; no se infiere por TIN/TAE ni se autorrellena.
- **Amortización extraordinaria** es un Movimiento del tipo vigente `Amortización deuda`,
  destino Exterior S000, Partida ligada a Deuda; `capital = importe`, `intereses = 0`; no es
  Gasto, Transferencia ni ejecución presupuestaria.
- **Precontrol**: los hechos anteriores al Inicio control conservan su efecto bancario y su
  Gasto real, pero no reducen de nuevo el principal de apertura. Apertura es la posición en
  la frontera; no se reconstruyen hechos ausentes ni se convierten ausencias en cero.
- **Protecciones históricas**: apertura e Inicio control usados están protegidos; no DELETE;
  enlace Partida→Deuda usado no se reasigna silenciosamente; rectificación/anulación con
  motivo, revisión, auditoría e idempotencia según E1.6/E1.4.
- **Exclusiones de E1.6 que continúan**: simulación, calendario de cuotas futuras, interés
  calculado, TIN/TAE/condiciones completas como motor, conciliación completa E4.4,
  patrimonio/hipoteca como activo, cierres/fotos E4, planificación E2, fichas E3,
  transferencias Exterior, importación real y producción.

## Delta propio de E4.4 respecto a E1.6

| Ya existe en E1.6 (no se vuelve a especificar) | Lo que añade E4.4 |
| --- | --- |
| Maestro mínimo Dxxx, nombre, Inicio control, apertura, estado, revisión y auditoría | Condiciones informativas: TIN, TAE, cuota contractual y texto de condiciones; tipo de Deuda |
| Fórmula de capital y pipeline único de cuota/extraordinaria | Vista de **historia ejecutada**, **capital de control** y **deuda viva** por corte |
| Partida→Deuda y protecciones de uso histórico | Bloque de **histórico/precontrol** de solo lectura, sin operandos ni doble descuento |
| Validación de desglose, exceso, fecha, Referencias y Ciclos | **Conciliación desde apertura** con saldo declarado opcional y diferencias visibles |
| Migración v6→v7, backup/restore, MFA/CSRF, idempotencia y auditoría | Compatibilidad con main v16, nuevos campos opcionales, registros de conciliación y consulta por corte |
| UI mínima de listado/ficha/alta y pagos | Wireframes 1440/390 de consulta, detalle, histórico, corte, conciliación, vacíos y errores |
| `E1.6-AC-31…E1.6-AC-33` futuros de E1.6 | AC de E4.4 (IDs locales) y contrato de consumo para E4.6/E4.7, sin duplicar E1.6 |

E4.4 **no remodela** Saldos ni Movimientos, no crea un segundo ledger y no convierte a Deuda
en Saldo. La spec06 sigue siendo la autoridad del motor mínimo; esta spec la consume y
amplía solo la conservación/consulta/conciliación.

## Round 1 — 2026-10-26 — decisiones materiales

Las recomendaciones marcadas son propuestas; las selecciones registradas mediante la
herramienta `question` se conservan abajo y su procedencia humana está **pendiente de
contraste**. No se reescribe esta ronda.

### Q1 — Deuda viva y capital de control

¿«Deuda viva» es el capital pendiente E1.6, un capital de control distinto o incluye
intereses devengados?

- [x] **Recomendada — capital pendiente E1.6**: deuda viva = apertura menos capital
  amortizado vigente desde Inicio control; «capital de control» es esa misma posición en la
  frontera, no un segundo importe. No incluye intereses futuros ni comisiones.
- [ ] Capital de control distinto: exigiría un saldo declarado independiente y una regla de
  conciliación propia.
- [ ] Capital + intereses devengados: exigiría reglas de devengo, tasa y corte no aprobadas.

**Respuesta registrada:** capital pendiente E1.6. **Procedencia:** `question`, 2026-10-26; contraste humano pendiente.

### Q2 — TIN, TAE, cuota contractual y condiciones

¿Son datos informativos opcionales, requieren vigencia/historial o se limita la ficha a lo
que exista en la fuente?

- [x] **Recomendada — informativos y opcionales**: se conservan sin calcular intereses,
  cuotas ni cuadros; desconocido no es cero; la cuota contractual es referencia, no un hecho
  ejecutado; sin historial de cambios salvo petición expresa.
- [ ] Con vigencia e historial: TIN/TAE/cuota/condiciones con fechas y versiones.
- [ ] Solo lo que exista en la fuente: subconjunto incompleto, sin campos nuevos.

**Respuesta registrada:** informativos y opcionales. **Procedencia:** `question`, 2026-10-26; contraste humano pendiente.

### Q3 — Importes históricos/precontrol

¿Se conservan como entradas de solo lectura los conceptos de la tabla R5?

- [x] **Recomendada — sí, lista R5**: capital inicial, capital amortizado histórico,
  amortización extraordinaria histórica, capital histórico en cuotas, intereses históricos,
  total pagado histórico y cuotas/capital/amortización precontrol. Nunca operandos del
  capital actual; no se rellenan ni reconstruyen ausencias; desconocido distinto de cero.
- [ ] Solo mostrar, no persistir.
- [ ] Lista ampliada: el usuario debe indicar campos y significado.

**Respuesta registrada:** sí, lista R5, solo lectura. **Procedencia:** `question`, 2026-10-26; contraste humano pendiente.

**Consecuencia operativa:** E4.4 no ofrece alta ni corrección de histórico/precontrol por
`POST`/`PATCH`; solo lectura. Su aportación/corrección futura requiere una vía expresamente
autorizada (E4.5/E4.12/DT7 o proceso específico), con fuente/auditoría. E4.4 no concede ese
permiso ni inventa quién puede ejecutarlo.

### Q4 — Corte histórico y límites de reconstrucción

- [x] **Recomendada — fecha civil arbitraria, solo hechos**: capital a una fecha de corte
  inclusiva usando apertura y hechos registrados hasta esa fecha. Antes de Inicio control no
  hay capital derivado; se muestra cobertura precontrol. No persiste fotos ni reconstruye
  hechos ausentes.
- [ ] Solo cortes declarados o de Ciclo.
- [ ] Fotos persistentes por corte (E4.11, fuera de E4.4).

**Respuesta registrada:** fecha civil arbitraria, solo hechos. **Procedencia:** `question`, 2026-10-26; contraste humano pendiente.

### Q5 — Distinción de hipoteca

- [x] **Recomendada — atributo explícito con Sin informar**: Hipotecaria / No hipotecaria /
  null (= Sin informar); opcional; sin inferencia desde Partida, nombre o importe; las
  Deudas existentes quedan null/Sin informar. No se modela activo inmobiliario, LTV ni
  garantía. `Sin informar` es una etiqueta de presentación, no un literal persistido.
- [ ] Obligatorio en altas nuevas.
- [ ] Módulo de activo inmobiliario (fuera de alcance).

**Respuesta registrada:** atributo explícito con Sin informar. **Procedencia:** `question`, 2026-10-26; contraste humano pendiente.

### Q6 — Discrepancia conciliable

- [x] **Recomendada — saldo declarado vs. derivado**: saldo declarado opcional con importe,
  fecha y nota/fuente; diferencia visible; se resuelve corrigiendo hechos o actualizando el
  declarado con motivo/auditoría. Nunca se crea un Movimiento de ajuste ni se trunca el
  capital.
- [ ] Solo consistencia interna, sin saldo externo.
- [ ] Ajuste económico automático (requiere regla financiera expresa).

**Respuesta registrada:** saldo declarado vs. derivado. **Procedencia:** `question`, 2026-10-26; contraste humano pendiente.

### Q7 — Comisiones y penalizaciones

- [x] **Recomendada — excluir por ahora**: no hay componente aprobado en E1.6; la cuota
  sigue siendo capital + intereses = importe y la extraordinaria capital = importe. Se
  documenta que comisiones/penalizaciones no están soportadas y no se inventan.
- [ ] Ampliar el desglose del pago (modifica E1.6; requiere aprobación financiera expresa).
- [ ] Incluir en intereses (oculta su naturaleza; no recomendado).

**Respuesta registrada:** excluir por ahora. **Procedencia:** ver evidencia Q1–Q7; contraste humano pendiente.

## Evidencia de confirmación Q1–Q7 — 2026-10-26

**Lo que existe:** una selección registrada en `question` para el usuario en esta sesión; no
es un mensaje humano libre. **Lo que no existe:** un mensaje humano libre, firmado o externo
que pueda citarse como «mensaje original». Por tanto, la confirmación se registra como
**evidencia mediada por la herramienta**, no como aprobación documental, y su **contraste
con el mensaje humano/procedencia original queda PENDIENTE**.

Transcripción literal de las respuestas devueltas por `question`:

| Pregunta | Respuesta registrada |
| --- | --- |
| Q1 — Deuda viva | `Capital pendiente E1.6 (Recommended)` |
| Q2 — Condiciones | `Informativas y opcionales (Recommended)` |
| Q3 — Histórico/precontrol | `Sí, lista R5, solo lectura (Recommended)` |
| Q4 — Corte histórico | `Fecha civil arbitraria, solo hechos (Recommended)` |
| Q5 — Hipoteca | `Atributo explícito con Sin informar (Recommended)` |
| Q6 — Conciliación | `Saldo declarado vs. derivado (Recommended)` |
| Q7 — Comisiones | `Excluir por ahora (Recommended)` |

Procedencia técnica: herramienta `question` de OpenCode, invocada por el agente en la
sesión autora; fecha de registro **2026-10-26**. El resultado no es un texto redactado por
el usuario ni un documento externo; es una selección de opciones. No se atribuye al usuario
una aprobación de la especificación, de los wireframes, del desarrollo ni del merge.

**Consecuencia de gate:** si Codex o el usuario exigen el mensaje humano original, esta
evidencia debe contrastarse antes de tratar Q1–Q7 como confirmadas. Hasta entonces, las
decisiones D1–D7 se conservan como **registradas y pendientes de contraste humano**, no como
aprobación canónica.

## Decisiones registradas E4.4-D1…D7 (contraste humano pendiente)

| ID | Decisión registrada (contraste humano pendiente) | Efecto en la spec |
| --- | --- | --- |
| E4.4-D1 | Deuda viva = capital pendiente E1.6; capital de control = apertura en la frontera | Una sola fuente de capital; sin segundo saldo |
| E4.4-D2 | Condiciones informativas y opcionales; sin cálculo ni historial por defecto | TIN/TAE/cuota/condiciones no son operandos |
| E4.4-D3 | Histórico/precontrol R5 de solo lectura; sin reconstrucción | Bloque histórico separado; no se suma al capital; no se edita en E4.4 |
| E4.4-D4 | Corte civil arbitrario, inclusivo, solo hechos; sin fotos | Vista calculada; límites de reconstrucción explícitos |
| E4.4-D5 | Tipo de Deuda explícito `Hipotecaria`/`No hipotecaria`/`null` (= Sin informar) | Sin activo inmobiliario ni inferencia |
| E4.4-D6 | Conciliación contra saldo declarado; sin ajuste económico | Diferencia visible; corrección/auditoría |
| E4.4-D7 | Comisiones/penalizaciones excluidas | No se amplía el desglose E1.6 |

## Propuestas técnicas ordinarias (no son reglas financieras nuevas)

Estas propuestas resuelven detalles de representación y se contrastarán con `main` y con la
fuente antes de desarrollar. No cambian las decisiones D1–D7.

| ID | Propuesta | Límite |
| --- | --- | --- |
| P1 | TIN/TAE como porcentaje decimal exacto, sin `float`, hasta 6 decimales; se muestra sin redondear | El máximo puede ajustarse a la fuente en desarrollo; no se usa para calcular |
| P2 | `condiciones` como texto informativo acotado; las condiciones estructuradas futuras requieren evidencia y decisión propia | No se inventan periodicidad, plazo, revisión ni comisiones |
| P3 | Histórico/precontrol con campos nullable y etiqueta de ejercicio opcional; si la fuente solo aporta un agregado, se conserva como agregado sin descomponerlo; solo lectura en E4.4 | No se derivan componentes ausentes ni se edita por POST/PATCH |
| P4 | Varias conciliaciones por Deuda, una vigente por fecha de corte; corrección/annulación con revisión y auditoría | No se fija nombre físico, ID visible ni número de migración |
| P5 | Corte histórico futuro rechazado (422); el cálculo no usa reloj, solo la validación de la consulta | Evita confundir histórico con previsión |
| P6 | El corte no crea fotografía: una rectificación posterior puede cambiar el resultado del mismo corte | E4.11 seguirá siendo la entrega de fotos inmutables |

## Coverage

- **Funcional:** condiciones, tipo, histórico/precontrol, historia ejecutada, capital de
  control/deuda viva, corte, conciliación, discrepancias, rectificación/anulación.
- **Pantallas:** listado, ficha, condiciones, histórico, historia, corte, conciliación,
  vacíos, parcialidad, errores e incidencias a 1440/390.
- **Datos:** campos opcionales, registros de conciliación, derivados no persistidos,
  migración/rollback y compatibilidad con v16.
- **API:** lectura por corte, filtros por tipo, alta/edición de metadatos y conciliaciones,
  seguridad, revisión, idempotencia y errores.
- **Validación:** apertura/control, desglose, precontrol, histórico, diferencias, precisión,
  concurrencia, estados no calculables y límites de reconstrucción.
- **Errores:** 401/403/404/409/422, carga, vacío, parcial, discrepancia, no calculable y
  conflicto de revisión.

## Wireframes

La propuesta ASCII 1440/390 está en la [specification](17-e44-deuda-completa-specification.md#screens-and-interfaces).
No son pantallas implementadas, capturas, pruebas de accesibilidad ni aprobación visual.
El feedback del usuario y de Codex queda pendiente; no se adelanta un Ciclo de UI.

## Append-only clarifications

- 2026-10-26: se registra una selección mediada por `question` para Q1–Q7; **no se atribuye
  confirmación humana original** y el contraste de procedencia queda pendiente. La
  spec/wireframes siguen en revisión y no aprobadas.
- Pendiente: revisión final de Codex y aprobación explícita; después, autorización separada
  de dev. No se inicia desarrollo por publicar esta rama/PR.

## Confirmación humana Q1–Q7 — 2026-10-27

Fuente: mensaje directo del usuario en el chat supervisor Codex «Supervisar especificación E4.4», posterior a la presentación de las siete preguntas.

> Confirmo Q1–Q7 en los términos propuestos.
>
> Mantener la separación entre capital real calculado, condiciones informativas, histórico precontrol y saldo declarado para conciliación. Sin operaciones ficticias ni ajustes automáticos.
>
> Esta confirmación cierra únicamente las siete decisiones funcionales. No autoriza todavía la specification, los wireframes, el merge ni el desarrollo.

Quedan confirmadas D1–D7: capital pendiente E1.6; condiciones opcionales e informativas; histórico/precontrol solo consultable en E4.4, sin POST/PATCH; corte civil inclusivo no futuro y solo hechos; tipo explícito opcional; saldo declarado separado sin ajuste; comisiones/penalizaciones excluidas. La aportación/corrección del histórico requiere proceso futuro autorizado. No se atribuye aprobación retroactiva a la selección `question` del 26/10.

Próximo gate: aprobación explícita de specification y wireframes concretos; merge de PR85 y desarrollo siguen siendo autorizaciones separadas.
