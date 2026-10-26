# 17 — E4.4 Deuda completa y conciliación desde apertura: Brainstorming

Status: **PROPUESTA DOCUMENTAL EN REVISIÓN** — 2026-10-26. Las decisiones Q1–Q7 fueron
confirmadas por el usuario en esta sesión; la especificación y los wireframes **NO están
aprobados**. Sin desarrollo, código, SQL operativo, migración, Excel, datos reales, merge
ni despliegue.

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
| Base/main verificado | `origin/main` = `24b48c57b70700fedb80f9f4d4f1ed8cb00f2649` |
| Checkout aislado | worktree temporal aislado bajo el directorio aprobado de OpenCode; nunca `main` |
| Rama documental | `codex/spec17-e44-deuda-completa` |
| Número documental | **17** libre: no existía `specs/17-*` ni rama/commit previo de E4.4 |
| Ownership | Sin otro ejecutor, borrador o rama E4.4 con ownership vigente |
| Trabajo ajeno | D5/DEV16/E4.1 no contactados, reasignados ni modificados; checkout principal con cambios ajenos intacto |
| Referencia | v5.11(7) candidata, **no estable**; Codex no ha inspeccionado el Excel ni importado datos reales |
| Estado E1.6 | Implementada e integrada PR #34/`cb9ba3b`; 30 AC actuales verificados y AC-31–33 conservados como contratos futuros. No se reabren Q1–Q4 |
| Estado main | Esquema SQLite v15; E4.4 no fija una versión futura ni escribe SQL |

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
| Migración v6→v7, backup/restore, MFA/CSRF, idempotencia y auditoría | Compatibilidad con main v15, nuevos campos opcionales, registros de conciliación y consulta por corte |
| UI mínima de listado/ficha/alta y pagos | Wireframes 1440/390 de consulta, detalle, histórico, corte, conciliación, vacíos y errores |
| AC-31–33 futuros de E1.6 | AC de E4.4 y contrato de consumo para E4.6/E4.7, sin duplicar E1.6 |

E4.4 **no remodela** Saldos ni Movimientos, no crea un segundo ledger y no convierte a Deuda
en Saldo. La spec06 sigue siendo la autoridad del motor mínimo; esta spec la consume y
amplía solo la conservación/consulta/conciliación.

## Round 1 — 2026-10-26 — decisiones materiales

Las recomendaciones marcadas son propuestas; las respuestas inferiores son del usuario y
se registran con fuente/fecha. No se reescribe esta ronda.

### Q1 — Deuda viva y capital de control

¿«Deuda viva» es el capital pendiente E1.6, un capital de control distinto o incluye
intereses devengados?

- [x] **Recomendada — capital pendiente E1.6**: deuda viva = apertura menos capital
  amortizado vigente desde Inicio control; «capital de control» es esa misma posición en la
  frontera, no un segundo importe. No incluye intereses futuros ni comisiones.
- [ ] Capital de control distinto: exigiría un saldo declarado independiente y una regla de
  conciliación propia.
- [ ] Capital + intereses devengados: exigiría reglas de devengo, tasa y corte no aprobadas.

**Respuesta confirmada:** capital pendiente E1.6. **Fuente/fecha:** usuario, 2026-10-26.

### Q2 — TIN, TAE, cuota contractual y condiciones

¿Son datos informativos opcionales, requieren vigencia/historial o se limita la ficha a lo
que exista en la fuente?

- [x] **Recomendada — informativos y opcionales**: se conservan sin calcular intereses,
  cuotas ni cuadros; desconocido no es cero; la cuota contractual es referencia, no un hecho
  ejecutado; sin historial de cambios salvo petición expresa.
- [ ] Con vigencia e historial: TIN/TAE/cuota/condiciones con fechas y versiones.
- [ ] Solo lo que exista en la fuente: subconjunto incompleto, sin campos nuevos.

**Respuesta confirmada:** informativos y opcionales. **Fuente/fecha:** usuario, 2026-10-26.

### Q3 — Importes históricos/precontrol

¿Se conservan como entradas de solo lectura los conceptos de la tabla R5?

- [x] **Recomendada — sí, lista R5**: capital inicial, capital amortizado histórico,
  amortización extraordinaria histórica, capital histórico en cuotas, intereses históricos,
  total pagado histórico y cuotas/capital/amortización precontrol. Nunca operandos del
  capital actual; no se rellenan ni reconstruyen ausencias; desconocido distinto de cero.
- [ ] Solo mostrar, no persistir.
- [ ] Lista ampliada: el usuario debe indicar campos y significado.

**Respuesta confirmada:** sí, lista R5, solo lectura. **Fuente/fecha:** usuario, 2026-10-26.

### Q4 — Corte histórico y límites de reconstrucción

- [x] **Recomendada — fecha civil arbitraria, solo hechos**: capital a una fecha de corte
  inclusiva usando apertura y hechos registrados hasta esa fecha. Antes de Inicio control no
  hay capital derivado; se muestra cobertura precontrol. No persiste fotos ni reconstruye
  hechos ausentes.
- [ ] Solo cortes declarados o de Ciclo.
- [ ] Fotos persistentes por corte (E4.11, fuera de E4.4).

**Respuesta confirmada:** fecha civil arbitraria, solo hechos. **Fuente/fecha:** usuario,
2026-10-26.

### Q5 — Distinción de hipoteca

- [x] **Recomendada — atributo explícito con Sin informar**: Hipotecaria / No hipotecaria /
  Sin informar; opcional; sin inferencia desde Partida, nombre o importe; las Deudas
  existentes quedan Sin informar. No se modela activo inmobiliario, LTV ni garantía.
- [ ] Obligatorio en altas nuevas.
- [ ] Módulo de activo inmobiliario (fuera de alcance).

**Respuesta confirmada:** atributo explícito con Sin informar. **Fuente/fecha:** usuario,
2026-10-26.

### Q6 — Discrepancia conciliable

- [x] **Recomendada — saldo declarado vs. derivado**: saldo declarado opcional con importe,
  fecha y nota/fuente; diferencia visible; se resuelve corrigiendo hechos o actualizando el
  declarado con motivo/auditoría. Nunca se crea un Movimiento de ajuste ni se trunca el
  capital.
- [ ] Solo consistencia interna, sin saldo externo.
- [ ] Ajuste económico automático (requiere regla financiera expresa).

**Respuesta confirmada:** saldo declarado vs. derivado. **Fuente/fecha:** usuario,
2026-10-26.

### Q7 — Comisiones y penalizaciones

- [x] **Recomendada — excluir por ahora**: no hay componente aprobado en E1.6; la cuota
  sigue siendo capital + intereses = importe y la extraordinaria capital = importe. Se
  documenta que comisiones/penalizaciones no están soportadas y no se inventan.
- [ ] Ampliar el desglose del pago (modifica E1.6; requiere aprobación financiera expresa).
- [ ] Incluir en intereses (oculta su naturaleza; no recomendado).

**Respuesta confirmada:** excluir por ahora. **Fuente/fecha:** usuario, 2026-10-26.

## Decisiones confirmadas E4.4-D1…D7

| ID | Decisión confirmada | Efecto en la spec |
| --- | --- | --- |
| E4.4-D1 | Deuda viva = capital pendiente E1.6; capital de control = apertura en la frontera | Una sola fuente de capital; sin segundo saldo |
| E4.4-D2 | Condiciones informativas y opcionales; sin cálculo ni historial por defecto | TIN/TAE/cuota/condiciones no son operandos |
| E4.4-D3 | Histórico/precontrol R5 de solo lectura; sin reconstrucción | Bloque histórico separado; no se suma al capital |
| E4.4-D4 | Corte civil arbitrario, inclusivo, solo hechos; sin fotos | Vista calculada; límites de reconstrucción explícitos |
| E4.4-D5 | Tipo de Deuda explícito Hipotecaria/No hipotecaria/Sin informar | Sin activo inmobiliario ni inferencia |
| E4.4-D6 | Conciliación contra saldo declarado; sin ajuste económico | Diferencia visible; corrección/auditoría |
| E4.4-D7 | Comisiones/penalizaciones excluidas | No se amplía el desglose E1.6 |

## Propuestas técnicas ordinarias (no son reglas financieras nuevas)

Estas propuestas resuelven detalles de representación y se contrastarán con `main` y con la
fuente antes de desarrollar. No cambian las decisiones D1–D7.

| ID | Propuesta | Límite |
| --- | --- | --- |
| P1 | TIN/TAE como porcentaje decimal exacto, sin `float`, hasta 6 decimales; se muestra sin redondear | El máximo puede ajustarse a la fuente en desarrollo; no se usa para calcular |
| P2 | `condiciones` como texto informativo acotado; las condiciones estructuradas futuras requieren evidencia y decisión propia | No se inventan periodicidad, plazo, revisión ni comisiones |
| P3 | Histórico/precontrol con campos nullable y etiqueta de ejercicio opcional; si la fuente solo aporta un agregado, se conserva como agregado sin descomponerlo | No se derivan componentes ausentes |
| P4 | Varias conciliaciones por Deuda, una vigente por fecha de corte; corrección/annulación con revisión y auditoría | No se fija nombre físico, ID visible ni número de migración |
| P5 | Corte histórico futuro rechazado (422); el cálculo no usa reloj, solo la validación de la consulta | Evita confundir histórico con previsión |
| P6 | El corte no crea fotografía: una rectificación posterior puede cambiar el resultado del mismo corte | E4.11 seguirá siendo la entrega de fotos inmutables |

## Coverage

- **Funcional:** condiciones, tipo, histórico/precontrol, historia ejecutada, capital de
  control/deuda viva, corte, conciliación, discrepancias, rectificación/anulación.
- **Pantallas:** listado, ficha, condiciones, histórico, historia, corte, conciliación,
  vacíos, parcialidad, errores e incidencias a 1440/390.
- **Datos:** campos opcionales, registros de conciliación, derivados no persistidos,
  migración/rollback y compatibilidad con v15.
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

- 2026-10-26: usuario confirma Q1–Q7 con las recomendaciones anteriores. Se registran como
  decisiones de producto; la spec/wireframes siguen en revisión y no aprobadas.
- Pendiente: revisión final de Codex y aprobación explícita; después, autorización separada
  de dev. No se inicia desarrollo por publicar esta rama/PR.
