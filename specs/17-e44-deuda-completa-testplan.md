# 17 — E4.4 Deuda completa y conciliación desde apertura: Test plan

Status: **DISEÑO DE PRUEBAS — NO EJECUTADO**. Esta es una entrega documental; no existe
candidato funcional de E4.4, no hay SQL ni migración y **ningún resultado es PASS**. Una
prueba diseñada no acredita la funcionalidad. Los AC se ejecutarán solo tras autorización
expresa y separada de desarrollo.

Base de preparación: `origin/main` = `24b48c57b70700fedb80f9f4d4f1ed8cb00f2649`
(esquema v15). Referencia: [specification](17-e44-deuda-completa-specification.md) y
[brainstorming](17-e44-deuda-completa-brainstorming.md).

## Estrategia

- **API/SQLite:** extender la suite existente `apps/api/src/deudas.test.ts` con casos E4.4
  (D11 y siguientes), usando fixtures ficticios y el pipeline real de Movimientos.
- **Read model:** probar el DTO de ficha/corte/conciliación con tablas de oráculo
  independientes; no comparar el motor consigo mismo.
- **UI:** extender el recorrido real de Deudas (`tests/e2e/deudas.ts` o un
  `deudas-completa.ts` nuevo, a decidir en dev) con MFA real, 390/1440, capturas ficticias,
  teclado, foco, contraste y estados vacío/parcial/error.
- **Migración/backup:** v15 genuina (o versión vigente al iniciar dev) → esquema ampliado;
  rollback, versión desconocida, dos arranques, snapshot/manifiesto/restore aislado y MFA.
- **Verificación canónica:** `python3 scripts/verify --base <main> --head <SHA>` en el
  candidato funcional; para esta rama documental, la verificación se limita a baseline/clasificación
  docs. No se ejecutan suites financieras solo por una especificación.
- **Registro:** PASS/FAIL/UNRUN/BLOCKED con comando, entorno y SHA. No se declara PASS por
  inspección ni se reutiliza evidencia de otro candidato.

## Entornos previstos

| Entorno | Uso | Límite |
| --- | --- | --- |
| macOS local | Bun 1.4.3, Python 3.10+, Chromium/Playwright 1.64.1; iteración | No sustituye CI Linux |
| Linux CI | Ubuntu 24.04, Bun/age/Chromium preparados; full del SHA candidato | Gate final del dev |
| Fixtures | Bases ficticias, MFA real local, sin datos personales | Nunca Excel, DB real, claves o VPS |
| Documental actual | `python3 scripts/verify --base origin/main --head <SHA>` | Solo baseline/clasificación docs; no valida E4.4 |

## Matriz AC → riesgo → caso → comprobación futura

Riesgos: **R1** doble cómputo/precontrol; **R2** apertura/amortización inferida; **R3**
pérdida/reescritura de historia; **R4** discrepancia oculta; **R5** Deuda como Saldo;
**R6** hipoteca mal clasificada; **R7** precisión/redondeo; **R8**
concurrencia/idempotencia; **R9** seguridad/fuga; **R10** migración/compatibilidad;
**R11** UI/accesibilidad; **R12** alcance/simulación.

| AC | Riesgo | Caso positivo | Caso negativo | Comprobación futura | Entorno / evidencia | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | R2 | Alta D001 con apertura/Inicio/tipo/condiciones/histórico | Falta de campos obligatorios, campos derivados o Saldo/Movimiento de apertura | API DTO + SQL: una Deuda, cero Movimientos/Saldos nuevos | `deudas.test.ts`; Bun/SQLite | UNRUN |
| AC-02 | R7/R12 | TIN 2,5 / TAE 2,8 / cuota 100 / condiciones | Tasa/importe no exacto, fuera de límite, intención de calcular | DTO exacto; ningún interés/cuota/cuadro derivado; 422 | API/UI; Bun/Playwright | UNRUN |
| AC-03 | R6/R5 | Hipotecaria, No hipotecaria, null (= Sin informar); filtro | Persistir el literal `Sin informar`; inferir por nombre/Partida; sumar a Saldos; crear activo | DTO enum/null; listado filtrado; `sqlite_master` sin activo; Saldos intactos | API/UI; Bun | UNRUN |
| AC-04 | R1/R3 | Histórico R5 completo y parcial | Backfill, cero implícito, intento de usarlo como operando | Campos null/exactos; capital solo E1.6; sin reconstrucción | API/SQL; Bun | UNRUN |
| AC-05 | R4 | Relación `capitalInicial − apertura = amortizadoHistorico` correcta | Diferencia de un céntimo | Aviso exacto, no bloqueo del dato fuente, capital intacto | API DTO; Bun | UNRUN |
| AC-06 | R1/R2 | Cuota 100 (80/20) + extraordinaria 200 desde control | Precontrol, anulado, otro Dxxx, cuota completa, intereses, Gasto ordinario sin Deuda | Deuda 720; aplicado 280; sin doble resta; Gasto sin Deuda no reduce | API/oráculo; Bun | UNRUN |
| AC-07 | R1 | Cuota 100 = 80 + 20 | Cuota sin desglose, suma desigual, capital 0/negativo | Historia 100/80/20; Gasto 100; banco −100; un hecho | API/E2E | UNRUN |
| AC-08 | R1 | Extraordinaria 200, capital 200, intereses 0 | Intento de Gasto/Transferencia/segundo hecho | Historia 200/200/0; Gasto 0; banco −200; capital −200 | API/E2E | UNRUN |
| AC-09 | R1 | Gasto precontrol 70 (50/20) | Intento de incluirlo en capital | `aplicaAlCapital=false`; banco/Gasto reales; deuda 720 sin corte o después de H3; 920 al 01/10; no calculable antes del control | API/oráculo | UNRUN |
| AC-10 | R1/R2 | Hechos 30/09, 01/10, 15/10 y corte 01/10; varias Partidas del mismo Dxxx | Hecho 02/10, otro Dxxx, corte futuro, Partida de otra Deuda | Solo `<=` corte; día incluido; varias Partidas mismo Dxxx suman; otra Deuda excluida | API tabla; Bun | UNRUN |
| AC-11 | R2/R4 | Corte anterior a Inicio; sin Inicio; sin apertura | Intento de mostrar 0 o capital inventado | No calculable + motivo; cobertura precontrol | API/UI | UNRUN |
| AC-12 | R2 | Apertura 0 explícita | Apertura ausente | 0 explícito vs null/no calculable; sin normalización | API DTO | UNRUN |
| AC-13 | R1/R4 | Hecho aplicable con desglose completo | Hecho aplicable con capital/intereses null o inválido | Read model E4.4 no calculable; IDs afectados; null ≠ 0; regresión del lector | API/fixture SQL | UNRUN |
| AC-14 | R2/R4 | Capital 0 por igualdad | Apertura/datos heredados que producen negativo | Negativo visible; sin clamp; E1.6 sigue bloqueando nuevos excesos | API/UI | UNRUN |
| AC-15 | R4 | Declarado 750 vs derivado 720; fecha no futura | Declarado 720 (0), sin declarado o fecha futura | Diferencia +30/0; estado Conciliado/Diferencia; fecha futura 422; capital intacto | API/UI; Bun | UNRUN |
| AC-16 | R3/R4 | Corregir declarado con motivo; anular | PATCH sin revisión/motivo, DELETE | Auditoría antes/después; anulada conservada; no vigente | API/SQL | UNRUN |
| AC-17 | R4 | Declarado antes del control o sin base | Intento de diferencia ficticia | `No comparable` con motivo; sin cero | API/UI | UNRUN |
| AC-18 | R8 | Varias fechas de conciliación; listado elige la última/Varias | Dos altas vigentes misma Deuda/fecha | 409 en la segunda; corregir la existente; sin duplicado ambiguo; ficha muestra todas | API/procesos/UI | UNRUN |
| AC-19 | R8 | Reintento misma clave; dos procesos | Revisión obsoleta; misma clave con otro payload | Una entidad; 409; sin escritura parcial | API/procesos | UNRUN |
| AC-20 | R3/R4 | Corregir tipo/condiciones/histórico | PATCH sin revisión/motivo; cambiar apertura/Inicio usados | Auditoría; sin efecto económico; E1.6 bloquea | API/SQL | UNRUN |
| AC-21 | R1/R3 | Rectificar/anular cuota; cambiar su fecha respecto al corte | Doble resta; historia borrada; corte no cambia | Recalcula deuda/diferencia; ambas Deudas; historia conservada; corte inclusive | API/E2E | UNRUN |
| AC-22 | R1/R5 | Inspeccionar tablas/endpoints | Intento de escribir derivados o ajuste | Sin capital/historia persistidos; sin segundo ledger; 422 | API/SQL | UNRUN |
| AC-23 | R10 | v15 genuina con historia/MFA → esquema ampliado | Fallo DDL; versión desconocida; dos arranques | Datos/IDs/auditoría/MFA preservados; rollback; rechazo intacto | Bun integración/procesos | UNRUN |
| AC-24 | R10 | Snapshot/manifiesto/restore aislado | Copia corrupta/versión incorrecta | Campos/conciliaciones/MFA recuperables; sin datos reales | Bun + E2E restore | UNRUN |
| AC-25 | R5 | Consumidor E4.6/E4.7 recibe capital/tipo | Suma Deuda a Saldos o duplica Gasto/capital | DTO separado; sin Saldo; sin doble cómputo | Contrato/API; futuro | UNRUN |
| AC-26 | R9 | MFA/CSRF/Origin válidos; payload limpio | Sin MFA/CSRF/Origin; derivados; DELETE; error forzado | 401/403/422; sin fuga; sin DELETE; límite JSON | API seguridad; Bun Effect | UNRUN |
| AC-27 | R11 | 1440 listado/ficha/corte/histórico/conciliación | Overflow, foco perdido, color-only | Etiquetas/foco/teclado/contraste; sin cuadro | Playwright 1440 + capturas | UNRUN |
| AC-28 | R11 | 390 mismas pantallas | Acción oculta, scroll horizontal, texto truncado | Secciones apiladas; acciones accesibles; sin overflow | Playwright 390 + capturas | UNRUN |
| AC-29 | R4/R11 | Vacío/carga/parcial/no calculable/diferencia | 401/404/409/422 y pérdida de borrador | Estados diferenciados; borrador conservado; foco | Playwright/API | UNRUN |
| AC-30 | R12 | Consulta normal | Simulación, cuadro, previsión, comisión, activo, ajuste | Rechazo/exclusión; cero hechos/cuotas/activos/ajustes | API/UI/inspección | UNRUN |
| AC-31 | R1/R5 | Regresión E1.1–E1.6 y cuatro Tipos | Exterior Transferencia, E3, cierre, doble Gasto | Reglas previas intactas; cuota Gasto; extraordinaria no Gasto | Suite completa + E2E | UNRUN |
| AC-32 | R7 | EUR/tasas/textos/fechas exactos | Tercer decimal, float, overflow, texto/fecha inválidos | Exactitud; 422; sin redondeo | API/Bun | UNRUN |
| AC-33 | R3/R9 | Cambios de Deuda/conciliación auditados | Log con importes/notas/secretos; auditoría ausente | Actor/UTC/anterior/posterior/motivo; append-only | API/SQL | UNRUN |

## Oráculo ficticio E4.4 — diseñado, no ejecutado

Todos los importes son ficticios. No representan datos personales ni el Excel.

**Deuda D001:** Inicio control `2026-10-01`, apertura `1000.00`, tipo `No hipotecaria`,
TIN `2.500000`, TAE `2.800000`, cuota contractual `100.00`.

| Hecho | Fecha | Tipo | Total | Capital | Intereses | Gasto | Banco | Aplica al capital |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| H1 precontrol | 2026-09-30 | Gasto | 70.00 | 50.00 | 20.00 | 70.00 | −70.00 | No |
| H2 cuota | 2026-10-01 | Gasto | 100.00 | 80.00 | 20.00 | 100.00 | −100.00 | Sí |
| H3 extraordinaria | 2026-10-15 | Amortización deuda | 200.00 | 200.00 | 0.00 | 0.00 | −200.00 | Sí |

| Consulta | Capital aplicado | Deuda viva | Cobertura/observación |
| --- | ---: | ---: | --- |
| Sin corte (todos los hechos) | 280.00 | 720.00 | H1 visible como precontrol; no resta |
| Corte 2026-09-15 | — | No calculable | Anterior a Inicio control; agregado R5 disponible; H1 (30/09) no incluido |
| Corte 2026-10-01 | 80.00 | 920.00 | Día inclusivo; H1 excluido; H3 posterior excluido |
| Corte 2026-10-14 | 80.00 | 920.00 | H3 aún no existe |
| Corte 2026-10-15 | 280.00 | 720.00 | H3 incluido en su día |
| Corte 2026-10-20 | 280.00 | 720.00 | Sin hechos posteriores |
| Corte futuro | — | 422 | No se simula previsión |

**Conciliación:** corte `2026-10-20`, declarado `750.00`, derivado `720.00`,
diferencia `+30.00`, estado `Diferencia`; declarado `720.00` → `Conciliado`; declarado
antes del control → `No comparable`; dos declarados vigentes misma fecha → 409.

**Histórico R5:** `capitalInicial 1200.00`, `capitalApertura 1000.00`,
`capitalAmortizadoHistorico 200.00` → consistente; `210.00` → diferencia `+10.00` visible,
capital 720.00 intacto. Los históricos no se suman ni restan al capital.

**Desglose inválido:** un Gasto aplicable con `capital=null` deja deuda viva no calculable y
enumera el ID; no se interpreta como 0. **Anulación:** anular H3 devuelve deuda viva a 920.00
y la conciliación recalcula; H3 sigue consultable como anulada.

## Riesgos residuales y criterios de salida

| Riesgo | Señal de fallo | Criterio de salida |
| --- | --- | --- |
| R1 doble cómputo | Deuda viva distinta de apertura − capital aplicable | Oráculo independiente y tabla de frontera PASS |
| R2 apertura/amortización inventada | Cero/normalización o hecho sintético | No calculable explícito; ningún hecho nuevo |
| R3 pérdida de historia | Anulación/rectificación borra filas o auditoría | Historia y auditoría conservadas; recálculo |
| R4 discrepancia oculta | Diferencia truncada, “resuelto” sin dato o clamp | Diferencia exacta visible; corrección auditada |
| R5 Deuda como Saldo | Deuda suma a Liquidez/patrimonio/Saldo | Inspección y contrato E4.6 sin suma |
| R6 hipoteca inferida | Tipo deducido por nombre/Partida o literal `Sin informar` persistido | Enum/null explícito; presentación Sin informar |
| R7 precisión | Float, redondeo, tercer decimal aceptado | Bigint/decimal exacto; 422 |
| R8 concurrencia | Dos vigentes, pérdida de revisión, duplicado | 409/idempotencia/transacción |
| R9 seguridad | Fuga de importes/notas/SQL; bypass MFA | 401/403/422; errores genéricos |
| R10 migración | Backfill, pérdida de IDs/MFA, versión desconocida mutada | v15→nuevo rollback/restore PASS |
| R11 UI | Overflow, foco perdido, información oculta | 390/1440 + teclado/contraste |
| R12 alcance | Cuadro, simulación, comisión, activo, cierre | Exclusión verificable; sin hechos |

**Salida del dev futuro:** todos los AC aplicables con evidencia en un SHA, suite completa,
typecheck/build, E2E 390/1440, migración/backup/restore, CI Linux full y QA independiente
sin bloqueantes. Esta lista no autoriza ese dev ni declara PASS ahora.

## QA independiente

Pendiente de candidato documental estable. El revisor será distinto del autor, con contexto
nuevo, y revisará este testplan, la spec y el brainstorming sobre un SHA concreto. No aprueba
reglas financieras, no amplía alcance, no escribe epic-board y no hace merge. Sus hallazgos
se registrarán con severidad y evidencia; las correcciones documentales se re-revisarán.

## Registro de ejecuciones

| Fecha | Candidato | Comando | Resultado | Nota |
| --- | --- | --- | --- | --- |
| 2026-10-26 | — | — | UNRUN | Diseño documental; no hay implementación E4.4 |
