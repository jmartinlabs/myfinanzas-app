# 10 — Plan anual: Test plan
Specification: [spec10](10-plan-anual-specification.md)

Fecha:2026-10-24. Estado vigente:9 focales PASS, navegador/QA PASS; CI Linux pendiente, sin integración.
Comando **A**: `PATH=/tmp/myfinanzas-runtime/bun-darwin-aarch64:/tmp/myfinanzas-runtime/age:$PATH TMPDIR=/private/tmp NODE_ENV=test bun test apps/api/src/plan-anual.test.ts`.
Resultado real:8 PASS/0 FAIL,83 assertions. **B**: `PATH=/tmp/myfinanzas-runtime/bun-darwin-aarch64:/tmp/myfinanzas-runtime/age:$PATH TMPDIR=/private/tmp node node_modules/@playwright/test/cli.js test tests/e2e/plan-anual.spec.ts`; pendiente por sandbox.
**L**: gate API Linux, P11 de `apps/api/src/planes-ciclo.test.ts`, pendiente.

Los34AC se mantienen actuales: un contrato aislado PASS no sustituye la integración
real de una fuente futura; la columna de evidencia distingue ambas cosas. AC23/24 y
restauración continúan abiertos hasta el gate correspondiente, sin reclasificarlos.

| Acceptance ID | Preconditions and action | Expected result | Automated/manual method and command | Actual result / status | Run date / evidence |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Dos procesos confirman misma Partida/año | Una línea/auditoría, segundo conflicto, rollback | A, prueba two real processes | PASS: SAVED/CONTEXT_CHANGED, intento único | 2026-10-24 / plan-anual.test.ts |
| AC-02 | Dos años y cambio de nombre | Independencia e ID conservado | A, stable year/Partida | PASS | 2026-10-24 / test focal |
| AC-03 | Vacío,0,negativo,number | null≠0;rechazos | A, stable year/Partida | PASS | 2026-10-24 / test focal |
| AC-04 | Consultar año sin líneas | No copia ni siembra | A, stable year/Partida;B futuro vacío | Backend PASS;browser pendiente | 2026-10-24 / A |
| AC-05 | Texto múltiple y nullable | Conserva texto,una fila | A, stable year/Partida;B formulario | Backend PASS;browser pendiente | 2026-10-24 / A |
| AC-06 | Cambiar Periodo | Derivados dependen solo de hechos/intervalos | A, motor independiente de entradas y PATCH parcial | PASS motor;browser pendiente | 2026-10-24 / A |
| AC-07 | Inputs derivados/campo esencial económico | Rechazo422 | A, validación y Effect HTTP | PASS | 2026-10-24 / A |
| AC-08 | Gasto diciembre/otro ejercicio | Fecha real gobierna,aunque ciclo distinto | A, exact annual actual-date ledger | PASS motor por fecha;sin dependencia ciclo | 2026-10-24 / A |
| AC-09 | Cuatro Tipos y cuota Gasto | Solo Gasto íntegro | A, exact annual actual-date ledger | PASS | 2026-10-24 / A |
| AC-10 | Rectificación/anulación | Reconsulta hechos vigentes sin copia | A, stored rows rectificados/anulados | PASS | 2026-10-24 / A |
| AC-11 | Fuente mensual independiente | R3 mensual conservado;anual por Partida | A,motor anual no consume fuente mensual;regresión planes-ciclo P13 | Motor anual PASS;regresión completa pendiente Linux | 2026-10-24 / A,L |
| AC-12 | Sin proveedor/control | Null y motivo,no total anual0 | A y B cobertura | Backend PASS;browser pendiente | 2026-10-24 / A |
| AC-13 | Intervalo verificado sin hechos |0soloal corte,no cobertura futura | A,full.control fixture | PASS aislado;proveedor runtime pendiente | 2026-10-24 / A |
| AC-14 | Futuro/sin líneas | Sin0ficticio/sin líneas automáticas | A y B selector | Backend PASS;browser pendiente | 2026-10-24 / A |
| AC-15 | Hechos sin línea o importe vacío | Subtotal consultable,sin objetivo creado | A,stored facts;B sin línea/detalle | Backend PASS;browser pendiente | 2026-10-24 / A |
| AC-16 | Sí/No/Pendiente | SoloSí suma,clasificaciones distintas | A, sum first | PASS | 2026-10-24 / A |
| AC-17 |0,03+0,03 | Numerador6céntimos/divisor12 | A, sum first | PASS racional exacto | 2026-10-24 / A |
| AC-18 | Sí vacío vs0 | Totalnull/Parcial/contador solo vacío | A y B guardar0 | Backend PASS;browser pendiente | 2026-10-24 / A |
| AC-19 | Edición anual junto plan ciclo | Manuales intactos;contrato sin duplicación | A,cycle_plan_lines antes/después | Aislamiento PASS;integración consumidores futura | 2026-10-24 / A |
| AC-20 | Presupuesto100,hechos0/120,vacío |100/−20/null exactos | A,stored provider y agregado>int64 | PASS;fuente verificada inyectada | 2026-10-24 / A |
| AC-21 | Línea inactiva/alta inactiva | Preserva/rechaza,edición protegida sigue protocolo | A,stable year/Partida y guards | PASS backend | 2026-10-24 / A |
| AC-22 | Obsoleto/retry/conflicto | Contexto,revisión,idempotencia,rollback,borrador | A,B conflicto real | Backend PASS;browser pendiente | 2026-10-24 / A |
| AC-23 | Error/carga/cambio rápido | Reintento y respuesta antigua descartada | B,route503/demora y generación UI | PENDIENTE navegador;no PASS inferido | 2026-10-24 / B |
| AC-24 |390/1440,nulos,cobertura | Tabla/tarjetas sin overflow | B,capturas e inspección visual | PENDIENTE navegador/inspección | 2026-10-24 / B |
| AC-25 | Histórico100+Gasto40,no solapado |140 y máxima15/06 | A, annual actual-date | PASS contrato aislado;histórico runtime no instalado | 2026-10-24 / A |
| AC-26 | Histórico posterior válido | Máximo conserva fecha histórica | A,corte independiente controlJan–Mar/históricoApr–Jun | PASS contrato aislado | 2026-10-24 / A |
| AC-27 | Histórico positivo sin fecha | No inventarfecha | A,emptyDate fixture | PASS contrato aislado | 2026-10-24 / A |
| AC-28 | Cobertura parcial y fecha conocida | Diferencianull,fecha conservada | A,partial fixture;B detalle | Backend PASS;browser pendiente | 2026-10-24 / A |
| AC-29 | Histórico solapado/representado/origen inválido | Sin doble suma/fecha impropia,motivo | A,full.historico fixtures | PASS contrato aislado | 2026-10-24 / A |
| AC-30 | DosSí vacíos+Pendiente | Contadores2/1 separados | A,sum first | PASS | 2026-10-24 / A |
| AC-31 | DTOequivalente parcial | Totalnull,parcial racional,completitud propagable | A,sum first | Contrato PASS;consumidor global/liquidez futuro no instalado | 2026-10-24 / A |
| AC-32 | Año pasado con/sin motivo | Preview+motivo+confirm,hechos intactos | A y B formulario2025 | Backend PASS;browser pendiente | 2026-10-24 / A |
| AC-33 | Referencia foto/ciclo protegida sin cierre anual | Rechazo,incluida no verificable | A,protection source inyectada | PASS contrato aislado;motor cierres real futuro | 2026-10-24 / A |
| AC-34 | Protección entre preview y confirm | Contexto obsoleto y sin escritura parcial | A,mutable source y draftB | Backend PASS;browser pendiente | 2026-10-24 / A |

## Regression checks
Typecheck y build PASS (Bun1.4.3,2026-10-24); Prettier desde caché local.
Clasificación:8 PASS/1 FAIL en gate backup macOS por libc.so.6, tras corregir TMPDIR.
No suite API completa ejecutada ni CI declarado verde. Versiones esperadas de fixtures
heredados ajustadas a11; constructores históricos conservados. P11 planes-ciclo prueba
explícitamente anual v11 de demo/production tras migración,backup age,restore,auditoría
preservada e intentos anuales revocados: **pendiente Linux**.

## Functional verification
Effect HTTP sin servidor de red:401 anónimo,403 sinCSRF/origen incorrecto,200 lectura
no-store,422 derivados,preview/confirm reales y404DELETE. Servicios ejercitan
concurrencia dos procesos y snapshot SQL;83assertions incluyen identidad/migración
v10→v11 y rollbackDDL. No se cambian las guardas de apertura/producción.

## Browser verification (web only)
Recorrido B preparado con MFA real,fixture separada en `.local/e2e-annual` y puerto3006;
rechaza NODE_ENV distinto de test antes de limpiar/inicializar. Sin bypass de API.
El seed contiene solo datos ficticios. Capturas previstas en
`artifacts/e2-4/plan-anual-1440.png` y `artifacts/e2-4/plan-anual-390.png`.
**No generadas ni inspeccionadas por el ejecutor**. Coordinador ejecuta este gate.

## Visual improvements (visual apps only)
Cinco decisiones aplicadas al candidato y pendientes de inspección efectiva:
1. Tabla compacta con acciones verticales para mantener lectura de ocho columnas.
2. Tarjetas móviles con pares etiqueta/valor,usando breakpoint760px existente.
3. Cobertura/procedencia y esencial en paneles separados;incompletitud siempre texto.
4. Presupuesto vacío con ayuda explícita y selección Esencial sin default en alta.
5. Foco programático en editor,preview,detalle y error;borrador conservado al reintentar.

Contraste teórico de tokens existentes: texto#2b2b2b/blanco14,16:1;muted#536147/blanco
6,63:1;texto#2b2b2b/verde#8dbb2e6,26:1;foco#335b0d/blanco7,95:1.
Estos cálculos no sustituyen el contraste efectivo ni revisión de controles/capturas.
No se afirma auditoría WCAG ni aprobación de UI implementada.

## Limitations and next action
Faltan B/inspección visual y L/CI/QA independiente. Fuentes reales históricas E4.5/E4.7,
cierres/fotografías E4.9 y consumidor global/liquidez E4.6 siguen futuras: se prueba
su frontera técnica aislada, nunca su instalación ni una sincronización mensual.
No Excel real,importación,deploy,B3,Dev32,copyentre años ni operaciones destructivas.

## Corrección QA10 P2 y primer gate browser — 2026-10-24
El coordinador ejecutó B: FAIL a los6,2s, heading Saldos tras MFA. El recorrido ahora
navega mediante el enlace real Plan anual, preservando el comportamiento de la shell.
B añade assertions sobre derivados, racional esencial y relación Ciclo2/ejercicio2026,
excluyendo Ciclo1/2025. **Nueva ejecución de B pendiente**; las filas AC23/24 siguen abiertas.

A actualizado: **9 PASS / 0 FAIL, 91 assertions**; nueva prueba QA10 P2 verifica:
- Preview con Ejecutado120,00; Diferencia−20,00→80,00; Fecha15/06/2026 y cobertura/motivos.
- Equivalente esencial exacto10000céntimos/12→20000céntimos/12.
- Solo Ciclo2/2026 intersecta2026; ciclos2025/2027 excluidos.
- Contexto parcial mantiene Ejecutado/Diferencianull, fecha conocida y motivo separado
  para Presupuesto sin informar tras vaciarlo.

La UI muestra estas comparaciones e intervalos en revisión. Typecheck y diff-check PASS;
contraste efectivo/capturas e inspección visual continúan pendientes, sin PASS inferido.

## Evidencia vigente del coordinador — 2026-10-24

B final: **1 PASS (2,1s; ejecución3,4s)** tras cuatro fallos de selectores/navegación
del fixture, descritos en progress10. Todos los flujos B preparados se ejecutaron,
incluidos ausencia/cero, detalle/sin línea, motivo pasado, conflicto/borrador, reintento,
respuesta obsoleta, foco y revisión de derivados/equivalentes/ciclos. Las menciones
«browser pendiente» de la matriz inicial quedan resueltas por esta evidencia B.
AC23 PASS navegador; AC24 PASS evidencia real390/1440 e inspección visual por coordinador.

Capturas ficticias inspeccionadas en artifacts/e2-4/plan-anual-{390,1440}.png. No hay
columnas superpuestas ni fecha partida tras corregir anchuras heredadas. Tarjetas390
conservan etiquetas/importes/ausencias, acciones y mensajes completos sin overflow.
Las cinco mejoras visuales propuestas arriba se revisaron; anchuras de tabla corregidas
como ajuste adicional. Contraste efectivo mínimo de cabeceras y acciones **5,81:1**,
medido por E2E sobre colores computados, no solo tokens teóricos; botones≥44px.

QA10 independiente: P2 preview/ciclos cerrado con probe propio7 assertions; revisión
final CSS/selectores/CI allowlist sin nuevos hallazgos. El core conserva9 focales91asserts.
L/CI completo sigue pendiente: en particular backup/restore cifrado v11 demo/production,
regresión R3 y todas las suites existentes. Proveedores E4.5/E4.7/E4.9 y consumidores
futuros siguen sin instalación real; sus probes internos no acreditan integración.

Baseline canónico local final: PASS (57 controles/CI,21 validador,9 informes,8 hooks,
15 CLI). Ejecutado una vez; sin repetir API completa en macOS. Las marcas pendientes
Linux de este checkpoint describen el instante previo a publicar; evidencia global
actual por SHA/run en checks y resumen de la PR de codex/dev10-plan-anual.
