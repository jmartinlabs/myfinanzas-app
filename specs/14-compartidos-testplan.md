# 14 — Gasto compartido: Test plan (Base B)

Specification: [§14 base B aprobada](14-compartidos-specification.md);
[progress](14-compartidos-progress.md). Matriz previa a código, 2026-10-26.

Alcance de esta entrega: solo base B (18 AC completas, 11 parciales, 10 D5). Los 39
AC conservan numeración. B-T01–B-T10 son el gate actual; **B-T11 es UNRUN y
aplazado** (consumo por informes/E3.6). Los resultados se añaden al final; esta
tabla inicial describe diseño, no PASS.

Responsables: autor dev14 (OpenCode, Task `EXT-OPENCODE-DEV14-BASEB`) en macOS
local; CI Linux y QA independiente pertenecen a Codex/Antigravity. Ningún resultado
local se atribuye a GitHub. Comando focal canónico:
`bun test apps/api/src/compartidos.test.ts`. Navegador:
`node node_modules/@playwright/test/cli.js test tests/e2e/compartidos.spec.ts`.
Entrada canónica: `python3 scripts/verify` / `--full`.

## Mapa de los 39 AC

| AC | Cobertura B / parte pendiente | Caso (P/N/I) y acción | Resultado esperado | Método y comando | Entorno / responsable | Evidencia esperada | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | **B completa** | P: alta `createCompartido` REF CAT013+ficha; N: fallo de ficha, replay, REF sin ficha/ficha sin REF | Una REF y una ficha 1:1; rollback sin huérfanos; reintento no duplica; 409 sin estado parcial | `bun test apps/api/src/compartidos.test.ts`; API HTTP | macOS autor; CI Linux Codex | Assertions SQLite/API | unrun |
| AC-02 | **B completa** | P/N: alta, edición de nombre/rol/partes, baja lógica; dos conexiones; DELETE físico; participante de otra ficha | ID estable, revisión y auditoría; baja lógica conserva partes; sin DELETE; 404/409/422 | Focal API/SQLite | macOS autor; CI Linux | Assertions SQLite + HTTP | unrun |
| AC-03 | **B parcial** (B: no deducción desde Saldo propio + pagador visible. D5: atribución de aportación) | P/N: Gasto CAT013 desde S001; caso con Transferencia interna; intento de acreditar aportación | Saldo pagador sale del Movimiento; ninguna aportación se deduce de Saldo; no existe alta de acreditación | Focal + inspección de rutas | macOS autor | DTO y 404 de ruta inexistente | unrun |
| AC-04 | **B completa** | P: reparto multi-Gasto con céntimos/residuo; N: W=0, partes inválidas | Céntimos exactos; mayor resto; desempate por ID estable | Motor puro + focal | macOS autor | Tabla exacta de cuotas | unrun |
| AC-05 | **B completa** | P: suma de asignados por Gasto/Partida; N: ningún céntimo perdido | Σ asignados = importe de cada Gasto y Bruto | Motor puro + focal | macOS autor | Sumas bigint/cadenas | unrun |
| AC-06 | **B completa** | P: varios Gastos con Partidas distintas; N: Gasto de otro caso | Identidad/Partida/fecha/importe conservados; E3.6-AC2 | Focal API/SQLite | macOS autor | DTO por Gasto | unrun |
| AC-07 | **B completa** | I: agregación por Referencia con hechos anulados/internos; N: doble cómputo | Agrega una vez Gastos vigentes; Movimientos intactos | Focal + snapshot antes/después | macOS autor | Igualdad de filas bancarias | unrun |
| AC-08 | **D5** | P: metadata por Movimiento+participante | No implementado en B; ruta/tabla inexistente | Inspección de esquema/rutas | macOS autor | Ausencia verificada | UNRUN (D5) |
| AC-09 | **B parcial** (B: auditoría/revisión/idempotencia de ficha, participantes y Gasto. D5: evidencia de aportación) | P: reintento y conflicto de revisión; N: auditoría duplicada | Una auditoría por cambio; replay devuelve la misma respuesta | Focal API/SQLite | macOS autor | Filas de auditoría | unrun |
| AC-10 | **D5** | N: histórico sin evidencia → Revisar/No disponible | No implementado en B (no hay históricos Exterior) | Inspección + matriz | macOS autor | Ausencia de inferencia | UNRUN (D5) |
| AC-11 | **B parcial** (B: Gasto conserva Partida/importe. D5: Quién paga acreditado) | P: Gasto CAT013; N: Gasto sin Partida/ficha | Partida e importe reales; no hay Quién paga en B | Focal + UI | macOS autor | DTO/UI | unrun |
| AC-12 | **B parcial** (B: Sin repartir / Reparto parcial / Cerrado sin terceros. D5: Excedido) | P: casos sin Gastos, terceros con cuota, 100% Titular; N: deducir estado de métrica desconocida | Estados §6/§14.5; nunca Cerrado con terceros con cuota | Focal motor/DTO/UI | macOS autor | DTO + capturas | unrun |
| AC-13 | **B completa** | P: Cerrado 100% Titular con coste propio positivo; N: Neto cero como criterio | Cerrado sin pendientes/excesos ni incidencias | Focal motor/DTO | macOS autor | Assertions | unrun |
| AC-14 | **D5** | Excedido real e identificación de participante | No implementado en B; Exceso nunca 0 verificado | Focal/inspección | macOS autor | Ausencia | UNRUN (D5) |
| AC-15 | **B completa** | P: caso sin Gastos; N: Cerrado inventado | Sin repartir; Bruto ausente, no 0 | Focal motor/DTO/UI | macOS autor | DTO + captura | unrun |
| AC-16 | **B parcial** (B: fecha de Gasto y ausencias. D5: última aportación/reparto/exceso) | P: Gasto 05/10; N: usar fecha de creación | Fecha de Gasto real; demás No disponible | Focal + UI | macOS autor | DTO/fechas | unrun |
| AC-17 | **B parcial** (B: campos separados y coberturas; sin Exceso=0. D5: valores con aportaciones) | P: Coste propio y Pendiente Titular; N: compensar o fabricar Exceso | Pendiente Titular 0,00 verificado estructural; Exceso No disponible/No aplica | Focal motor/DTO | macOS autor | Assertions | unrun |
| AC-18 | **B parcial** (B: impacto/auditoría sin aportaciones. D5: con aportaciones) | P: cambiar partes con impacto y motivo; N: confirmar sin motivo/fingerprint | Vista antes/después, motivo obligatorio, auditoría | Focal API + UI | macOS autor | DTO impacto + captura | unrun |
| AC-19 | **B completa** | I: cambio de partes y baja; comparar Movimientos | Nunca se reescriben Movimientos | Focal snapshot | macOS autor | Igualdad de filas | unrun |
| AC-20 | **B parcial** (B: contrato DTO Neto central; pendiente consumo informes/E3.6, UNRUN) | P: DTO con valor/ausencia/cobertura; I: consumidor no incluido | DTO coherente; informes no integrados; AC-20 no PASS | Focal B-T06/B-T08; B-T11 | macOS autor | DTO | unrun |
| AC-21 | **D5** | S000/Exterior/históricos | Sin Exterior nuevo, sin Transferencia S000, sin metadata | Gates B-T09 + inspección | macOS autor; CI Linux | 422 y archivos05 intactos | UNRUN (D5) |
| AC-22 | **B completa** | N: sin MFA/CSRF/Origin; 404/409/422; GET sin mutaciones | Rutas protegidas; errores sin datos sensibles; lectura no escribe | HTTP focal | macOS autor | Status y snapshot | unrun |
| AC-23 | **B parcial** (B: W1/W2/W4/W5; D5: W3) | P: flujo 390/1440, teclado/foco/contraste; N: W3/formulario ausente | Equivalencia responsive; sin formulario de aportación | Playwright + capturas | macOS autor | PNG `artifacts/e3-2/` | unrun |
| AC-24 | **B completa** | P: historia append-only y baja lógica; N: DELETE/huérfano | Sin borrado; auditoría inmutable; sin huérfanos | Focal SQLite | macOS autor | Triggers/filas | unrun |
| AC-25 | **B parcial** (B: Neto con Recuperado ausente/Parcial. D5: Recuperado real) | P: 100% Titular → Neto=Bruto; N: Bruto como Neto con terceros | Neto B − R; identidad estructural; nunca completa sin fuente | Focal motor/DTO | macOS autor | Assertions | unrun |
| AC-26 | **B completa** | P: Titular con partes; N: aportación exigible al Titular | Coste propio sin aportación; Pendiente Titular estructural 0 | Focal motor/DTO/UI | macOS autor | Assertions | unrun |
| AC-27 | **B completa** | P: multi-Gasto/multi-Partida con residuo; N: total distinto | Reparto exacto por Gasto/Partida; total = Bruto | Motor puro | macOS autor | Tabla exacta | unrun |
| AC-28 | **B completa** | N: Gasto CAT013 incompatible (Partida no CAT013/ficha ausente) | «Revisar», no computa, bloquea Cerrado; Movimiento intacto | Focal con fila incompatible | macOS autor | DTO alerta | unrun |
| AC-29 | **B completa** | N: cobertura comprometida | Bruto/Neto/reparto Parciales; solo subtotales acreditados | Focal motor/DTO/UI | macOS autor | DTO | unrun |
| AC-30 | **B completa** | N: importe inválido/negativo | No se convierte en devolución; hecho original conservado | Focal + snapshot | macOS autor | Igualdad de Movimiento | unrun |
| AC-31 | **B completa (rama P-F6 B; R-MP UNRUN)** | I: rectificar/anular el Gasto incompatible; recalcular | Estado se recalcula; sin Cerrado previo; R-MP no probado | Focal + B-T06 | macOS autor | Secuencia de estados | unrun |
| AC-32 | **D5** | Distribución de Recuperado por Gasto | No implementado en B | Inspección/focal | macOS autor | Ausencia | UNRUN (D5) |
| AC-33 | **D5** | Recuperado sin cuota | No implementado en B | Inspección | macOS autor | Ausencia | UNRUN (D5) |
| AC-34 | **D5** | Netos con Recuperado atribuido | No implementado en B | Inspección | macOS autor | Ausencia | UNRUN (D5) |
| AC-35 | **D5** | Recuperado global no repartido directamente | No implementado en B | Inspección | macOS autor | Ausencia | UNRUN (D5) |
| AC-36 | **D5** | Cierre 50+50 | No implementado en B | Inspección | macOS autor | Ausencia | UNRUN (D5) |
| AC-37 | **D5** | Pendiente y exceso coexistentes | No implementado en B | Inspección | macOS autor | Ausencia | UNRUN (D5) |
| AC-38 | **B completa** | P: caso 100% Titular sin terceros con cuota; N: ausencia de aportaciones como cierre automático | Cerrado permitido solo con hechos/reparto verificables | Focal motor/DTO | macOS autor | Assertions | unrun |
| AC-39 | **B parcial** (B: P-F6/importe inválido bloquea Cerrado. D5: R-MP sin cuota) | N: incidencia P-F6; N: deducir cierre | «Revisar» bloquea Cerrado; Neto Parcial | Focal motor/UI | macOS autor | DTO + captura | unrun |

Recuento de cobertura: 18 completas, 11 parciales, 10 D5 (AC-08, AC-10, AC-14,
AC-21, AC-32–AC-37). AC-20 y AC-31 conservan su parte pendiente explícita.

## B-T01–B-T11

| ID | Gate | Caso positivo / negativo / integración | Resultado esperado | Comando y entorno | Responsable | Evidencia | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **B-T01** | Base B | P: migrar fixture v13 ficticia; N: fallo de DDL, versión desconocida; I: backup/restore | v14 con tablas nuevas; filas/auditorías/FK/acceso preservados; rollback íntegro; sin reseed; versión desconocida rechazada; manifiesto y restore correctos | `bun test apps/api/src/compartidos.test.ts`; `bun test apps/api/src/referencias.test.ts` | macOS autor; CI Linux Codex | Assertions de esquema, copia y rollback | unrun |
| **B-T02** | Base B | P: alta REF CAT013+ficha; N: replay, conflicto, ficha/REF huérfana | Una REF y una ficha; reintento no duplica; 409 sin estado parcial; lectura coherente | Focal API/SQLite; dos conexiones | macOS autor | Assertions | unrun |
| **B-T03** | Base B | P: alta/edición/baja lógica; N: DELETE, otra ficha, revisión obsoleta | ID estable, auditoría, revisión, sin DELETE ni huérfanos; 409/422 | Focal API/SQLite | macOS autor | Assertions | unrun |
| **B-T04** | Base B | P: Gasto CAT013 con ficha; Transferencia interna con REF; N: Gasto sin ficha, S000, metadata | Gasto solo con ficha; interna sin acreditación; S000 rechazada; sin metadata ni Recuperado | Focal servicio común | macOS autor | Status/DB | unrun |
| **B-T05** | Base B | P: multi-Gasto/Partida; N: residuo/empate | AC-04/05/06/07/27 exactos; cada Gasto/Partida suma; sin doble cómputo | Motor puro + focal | macOS autor | Tabla/diferencias | unrun |
| **B-T06** | Base B | P/N: sin Gastos; 100% Titular; terceros con cuota; Gasto inválido; resolver P-F6 | DTO/UI coinciden; estados §6/§14.5; No disponible sin fuente; Cerrado solo sin terceros con cuota/incidencias; recálculo P-F6; R-MP no probado | Focal DTO/API + navegador | macOS autor | Assertions + PNG | unrun |
| **B-T07** | Base B | P: cambiar partes con motivo/impacto; baja lógica; N: sin motivo; I: Movimientos intactos | AC-18 parcial/19/24; impacto correcto, historia append-only, sin huérfanos | Focal + snapshot | macOS autor | Assertions | unrun |
| **B-T08** | Base B | P: DTO central; N: sin MFA/CSRF/Origin, 404/409/422, null→0; I: UI 390/1440, teclado/foco/contraste | Rutas protegidas; DTO coherente; sin 0 inventado; errores seguros; W3 ausente | Focal HTTP + Playwright | macOS autor | Status, PNG | unrun |
| **B-T09** | Base B | N: Transfer S000, D5, Exterior ordinario/salidas, Gasto CAT013 sin ficha, Transfer CAT013 sin ficha/metadata; I: spec05 intacta | S000/D5 bloqueados; Gasto solo con ficha; interna sin acreditación; archivos05 intactos; no se declara E3.2 | Focal + `git diff -- specs/05*` | macOS autor | 422/inspección | unrun |
| **B-T10** | Base B | I: `referencias.test.ts`, `movimientos.test.ts`, clasificación, ciclos, backups, tipos/build | Sin regresiones E1.5/E1.4; CAT013 Gasto controlado; Transferencia CAT013/S000 rechazada; esquemas previos preservados | `bun test apps/api`; `bun run typecheck`; `bun run build` | macOS autor; CI Linux | Salida de suites | unrun |
| **B-T11** | **Pendiente E3.2 / aplazado** | I: informe consume Neto central; no doble descuento Anticipos/Comida | **UNRUN**, no PASS; no se declara AC-20 ni E3.2 completo | N/A en B | Codex/E3.6 futuro | Pendiente explícito | UNRUN (aplazado) |

## Regression checks
Preflight: Bun 1.4.3, Python 3.12, age/age-keygen 1.3.2 y Chrome disponibles;
dependencias frozen instaladas. Ejecutar focales tras cada incremento y, sobre el
candidato estable, las suites API completas, typecheck, build y `scripts/verify`.
macOS no acredita las pruebas Linux/glibc de publicación/restore: se conservan como
UNRUN local y CI Linux queda obligatorio. No se omiten, debilitan ni relabelan
checks. Se actualizan únicamente expectativas de versión/manifiesto derivadas de la
nueva v14 y la matriz CAT013 autorizada; fixtures v13 y anteriores se conservan.

## Functional verification
Pendiente de implementación. Se registrarán aquí comandos, cwd, fecha, resultados
y SHA reales. Casos negativos obligatorios: rollback de DDL, versión desconocida,
replay/conflicto, 401/403, 404/409/422, DELETE físico rechazado, participante de
otra ficha, Gasto CAT013 sin ficha, Transferencia CAT013 sin ficha, S000 rechazada,
ausencia de `movimiento_compartido`/ruta de aportación y GET sin mutaciones.

## Browser verification (web only)
Pendiente. Playwright real con MFA y CSRF, servidor Effect/SQLite aislado y datos
ficticios. Recorrer alta de caso, participantes, cambio de partes con impacto,
baja lógica, Gasto CAT013, estado/alertas, error/409 y ausencia de W3. Capturas
390×844 y 1440×1000 en `artifacts/e3-2/`, inspeccionadas; teclado/foco/contraste
real. Nunca factores, DB, claves ni payloads sensibles en artefactos.

## Visual improvements (visual apps only)
Se evaluarán sobre la UI real: jerarquía estado/métricas, legibilidad de
No disponible/Parcial, tabla→tarjeta 390, foco del impacto y densidad del formulario.
Se aplicarán solo correcciones dentro del diseño aprobado, sin rediseño.

## Limitations and next action
Base B no implementa D5, Recuperado real, Exceso, R-MP ni informes; B-T11 queda
UNRUN. La aceptación de este plan no declara E3.2 completa. Próxima acción: ejecutar
incrementos y actualizar resultados con evidencia real.
