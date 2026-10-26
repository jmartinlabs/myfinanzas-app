# 12 — Verificación de desarrollo vigente · 2026-10-25

Autorización EXT-CODEX-DEV12 registrada en [progress](12-flujo-mensual-progress.md).
56 AC actuales; ninguno diferido. Mapa previo al código, responsable único Codex;
QA independiente posterior OpenCode pendiente. La historia inferior conserva su fecha
sin sustituir el gate de desarrollo ahora autorizado.

F = `bun test apps/api/src/flujo-mensual.test.ts`, integración SQLite real y API/MFA;
Q4 = `bun test apps/api/src/nomina-mensual.test.ts`, motor único y vectores M1–M10;
UI = `node node_modules/@playwright/test/cli.js test tests/e2e/flujo-mensual.spec.ts`,
Effect/Auth/SQLite reales, respuestas retenidas/errores, teclado/capturas390/1440/contraste.
F/Q4 en macOS soportado y CI Linux; UI en navegador soportado y CI Linux.
Cada caso incluye positivos/negativos/integraciones indicados abajo. No mocks de éxito
financiero, fuente ausente no se acredita por tabla vacía, ni ausencia como0.
Candidato estable: tipos/build y entrada canónica `python3 scripts/verify`;
full Linux/restore exigidos en CI del SHA publicado, no sustituidos por macOS.
Evidencia local del árbol de código `519978cbae0e5dbcd915d0859382f7057e029d4e`, base `10bb794`.
Estado remoto del HEAD candidato y CI por SHA en [PR67](https://github.com/josemartin2000/myfinanzas-app/pull/67);
esta consolidación solo cambia checkpoint/evidencias, no código ni pruebas.
PASS indica comprobación ejecutada por el autor, no QA independiente. Los escenarios
positivos que requieren cobertura bancaria completa o identidad de Ahorro no instalada
conservan UNRUN de integración; no se reclasifican como AC futuros. El usuario confirmó
«Conservar ausencia de cobertura y subtotal Parcial».

| AC | Positivo/negativo e integración | Resultado esperado | Comando/estado |
| --- | --- | --- | --- |
| AC-01 | Hechos en Inicio/corte y fuera del intervalo | Incluir solo vigentes dentro de ventana central, límites incluidos | PASS · F1 |
| AC-02 | Ciclo abierto/cerrado, referencia central cambia | Corte del maestro, no reloj o fin/mes natural supuesto | PASS · F11 |
| AC-03 | Sin periodo/fuente verificables o ciclo futuro | No disponible con motivo, no ejecución0 fabricada | PASS · F1/F8 |
| AC-04 | Ingresos Nómina y Bonus en distintos meses salariales | Sumar por Subtipo/Fecha del ciclo, identidades preservadas | PASS · F1/F12 |
| AC-05 | Otros e Intereses separados | Otros contiene Intereses; desgloses suman Otros sin doble ingreso | PASS · F1/UI |
| AC-06 | N:M, cobro sin asociar, Histórico/Documentado/Pronóstico | Banco una vez aunque sin vínculo; importes documentales/previstos no se suman | PASS · F12/Q4 |
| AC-07 | Gasto de Partida sin presupuesto o plan | Incluido en Gasto bruto, sin crear línea automática | PASS · F2/F10 |
| AC-08 | Cuota ordinaria capital+interés | Gasto bruto incluye cuota íntegra una vez | PASS · F2 |
| AC-09 | Gasto terminal y Transferencia de financiación | Un Gasto, sin financiación añadida ni déficit supuesto | PASS · F2 |
| AC-10 | Compartido bruto sin motor neto | Incluido bruto, cobertura neta pendiente visible | PASS · F2/UI |
| AC-11 | Transferencia propia/Exterior y amortización | No Ingreso/Gasto por reclasificación; extraordinaria separada, sin ahorro inventado | PASS · F2 |
| AC-12 | Gasto con Deuda válida hoy inactiva | Cuota informativa por ID válido, historia preservada | PASS · F2 |
| AC-13 | Amortización extraordinaria vigente/anulada e ID Deuda válido/inválido | Solo vigente con relación válida en intervalo; relación no verificable impide completitud | PASS · F3/F13 |
| AC-14 | Cuotas300/extra100/Gasto1800/Ingreso2250 | Total deudas400 informativo; S350, no−50 por restar dos veces | PASS · F2/F13; UNRUN integración con cobertura completa (fuente ausente) |
| AC-15 | Capital/Intereses disponibles frente a desconocidos | Solo motor Deudas verificable; desconocidos no se calculan por diferencia | PASS · F3 |
| AC-16 | Tres componentes S verificables y netos futuros ausentes | S calculado siempre PARCIAL, nunca Ahorro real/flujo completo | PASS · F2/F13; UNRUN integración con cobertura completa (fuente ausente) |
| AC-17 | S negativo o0 verificado | Valor con signo/0, sin truncar; etiqueta PARCIAL | PASS · F2/F13; UNRUN integración con cobertura completa (fuente ausente) |
| AC-18 | Un componente S no verificable | S No disponible, conocidos aparte sin null→0 | PASS · F2/F8 |
| AC-19 | Nómina2000 y Del mes1900 completos | Margen del plan100 del mismo ciclo; no Bonus/histórico/forecast añadidos | PASS · F4/F13/UI; UNRUN integración con cobertura completa (fuente ausente) |
| AC-20 | No existen líneas de plan | Sin plan; no suma0 o margen definitivo automático | PASS · F4 |
| AC-21 | Base completa/Del mes incompleto y viceversa | Cobertura por campo; margen dependiente no disponible, subtotal Parcial | PASS · F4/F10 |
| AC-22 | Del mes0 explícito frente a vacío | 0 decidido se suma; vacío conserva falta de información | PASS · F4/F13 |
| AC-23 | Plan anual/Esencial y hecho sin línea | No doble plan ni Esencial como Base; Sin planificar según E2.3, sin nueva línea | PASS · F10 |
| AC-24 | Media estructural12meses con varias Ordinarias/meses ausentes | Totales mensuales verificados, ancla válida al corte y divisorN, nunca filas o12 fijo | PASS · Q4 M1/M2 |
| AC-25 | Fuente salarial futura/incompleta/incoherente frente a banco parcial | Excluir incoherencia no resuelta; documentación válida no se invalida solo por cobro parcial | PASS · Q4 M4/M5/M6 |
| AC-26 | Periodo y fuentes válidos sin hechos frente a fuente desconocida | 0 verificado distinto de ausencia; nunca nómina antigua trasladada al ciclo | PASS · F8/F13; UNRUN integración con cobertura completa (fuente ausente) |
| AC-27 | Saldos activos/inactivos y Liquidez Sí/No | Sumar solo activos Sí con posición verificable del motor | PASS · F5/F8 |
| AC-28 | Cambiar Finalidad/bolsa/Entidad/nombre | Sin sustituir atributo Liquidez ni derivar pertenencia por esos campos | PASS · F5 |
| AC-29 | Posiciones o pertenencia no verificables | Subtotal conocido Parcial con exclusiones; todo desconocido No disponible, no total0 | PASS · F5/F6 |
| AC-30 | Seleccionar ciclo antiguo y consultar actual | Liquidez actual independiente, fecha/fuente reales; no cierre histórico supuesto | PASS · F5/UI |
| AC-31 | Histórico sin proveedor o foto incompatible de mes natural | No disponible; solo fuente verificable compatible permite cifra histórica | PASS · F5/UI |
| AC-32 | Consultar liquidez/contexto R6 | Sin objetivos, meses cubiertos, umbrales o dashboard anticipado | PASS · F5/UI |
| AC-33 | Componente completo y modelo global parcial | Estados por definición; no completo global ni porcentaje de cobertura ficticio | PASS · F7/UI |
| AC-34 | Motores E3/E4 ausentes | Pendientes visibles y sin ceros, netos o cálculos paralelos | PASS · F2/UI |
| AC-35 | Consultar y volver de fuente | Sin modificar hechos/planes/documentos/cierres/fotos; IDs y relaciones históricos intactos | PASS · F6/Q4 integración |
| AC-36 | Sumas grandes/tasas medias/medio céntimo | Exactitud sin redondeo intermedio ni overflow silencioso; media mensual exacta conforme Q4 | PASS · F6/Q4 M7/M9 |
| AC-37 | Cambio de Ciclo/contexto durante carga o paginación | Sin mezcla de revisiones ni respuesta antigua; total no truncado por página | PASS · F6/F11/UI |
| AC-38 | Consulta anónima/sesión expirada/error servidor | Acceso protegido, errores sin SQL/datos sensibles; selección conservada | PASS · F9/UI |
| AC-39 | 390/1440, teclado/contraste/ausencias | Wireframes por aprobar; posterior UI real legible con icono+texto y fuentes | PASS · UI/capturas |
| AC-40 | Ciclo histórico y catálogos renombrados/inactivos | Periodos/IDs preservados, sin inventar datos precontrol ni reescribir historia | PASS · F12 |
| AC-41 | Comparar Gasto bruto con H física y futuro Neto Compartido | Diferencia explícita; bruto no se presenta como H ni se suma de nuevo el Neto | PASS · F2/UI |
| AC-42 | Variación ahorro/Ahorro cierre con posiciones históricas ausentes o incompatibles | No disponible, sin mes natural/actual/apertura inferida como histórico del ciclo | PASS · F5/UI |
| AC-43 | Presupuesto de Ahorro con ID/R3 verificables frente a identidad/ejecución ausente | Resultado de R3 separado de ahorro generado; desconocido No disponible, sin cálculo por nombre | PASS · F5/F10; UNRUN identidad/ejecución Ahorro acreditadas (fuente ausente) |
| AC-44 | Regla anual física con S015, Niños e inversión | Procedencia anual explícita, sin excluir S015 de Liquidez ni adelantar motor anual/inversión | PASS · F12 |
| AC-45 | C49 física apunta al último ciclo distinto del seleccionado | Nómina real del ciclo seleccionado; no fallback a último ciclo/paga ni presupuesto redefinido por Bonus | PASS · F1 |
| AC-46 | Histórico anual precontrol Cálculos!B54:B59 disponible | No incorporarlo automáticamente al ciclo ni inventar cobertura anterior al control | PASS · F1/UI |
| AC-47 | Integración futura Compartidos/Comida/Anticipos | No doble Neto+bruto, segundo Gasto Comida o doble descuento Anticipo; estados pendientes hasta motores aprobados | PASS · F2/UI |
| AC-48 | Ciclo histórico, Ordinaria posterior al corte y ancla válida anterior | Ancla por Mes salarial válido≤corte, ventana incluida ancla−11meses; no futura/reloj/último global | PASS · Q4 M1 |
| AC-49 | Dos Ordinarias distintas1000+500 de un mes y2000 de otro | T(m)=1500/2000, N2, media1750 Parcial2/12; no promedio por tres filas | PASS · Q4 M2/F4 |
| AC-50 | Representaciones duplicadas de una paga y pagas legítimas iguales | Una paga por identidad/evidencia; no descartar distinta por Mes/Tipo/importe; duplicidad no resuelta pendiente | PASS · Q4 M3 |
| AC-51 | Mes sin Ordinaria o con una paga suficiente y otra indeterminada | No0 ni denominador; mes indeterminado excluido de media válida y motivo/importe conocido parcial visibles | PASS · Q4 M4 |
| AC-52 | Documentación salarial válida y abono parcial frente a incoherencia documental | Falta conciliación sola no excluye; no promover neto bancario parcial ni validar documento por coincidencia | PASS · Q4 integración/M5/M6 |
| AC-53 | Mes válido0, meses ausentes y N0 | 0 documentado cuenta en N; ausencia no; N0→Media/Margen No disponible | PASS · Q4 M7 |
| AC-54 | N1–11/N12 con Base completa, vacía o incompleta | Cobertura N/12; media parcial propaga margen parcial; sin Base completa margen No disponible | PASS · Q4 M8/F4 |
| AC-55 | Consumir media/cambiar fuentes documentales | Un motor Nómina con IDs/revisiones/meses/motivos; E2.6 no calcula otra media ni reescribe históricos | PASS · Q4 integración/F4 |
| AC-56 | Comparar C48 física COUNTIFS de filas con vacío y consolidación app | Diferencia de denominador/ancla explícita, sin afirmar equivalencia literal Excel/app | PASS · Q4 M10/UI |


## Evidencias locales del candidato — 2026-10-25

| Estado | Comando / entorno | Resultado y límite |
| --- | --- | --- |
| PASS | `bun test apps/api/src/flujo-mensual.test.ts` · macOS/Bun1.4.3 | F1–F13,13tests/117assertions; incremento de regresión N:M/S015/fórmulas |
| PASS | `bun test apps/api/src/nomina-mensual.test.ts apps/api/src/nomina.test.ts` | 28tests/197assertions; Q4/6 y regresión E2.5/22, sin cambios posteriores de ese motor |
| PASS | Playwright focal E2.6 | MFA real, snapshot/read model real, consulta de fuentes/vuelta, selección retenida, respuesta antigua descartada,500/reintento,401, teclado/foco, contraste mínimo6,63:1 |
| PASS | Playwright E2.6/Nómina/Plan anual/Plan del ciclo |4tests en11,8s; repetición posterior solo E2.6 por estabilización de repintado de captura y delta focal |
| PASS | `bun run typecheck`, `bun run build` | árbol candidato; builds no despliegan |
| PASS | `python3 scripts/verify baseline` · Python3.12.14 | Baseline canónica completa:57 controles proyecto/CI,23validador,9uso,8hooks,15entrada; no fase application |
| FAIL | Regresión ampliada Deudas/Plan del ciclo en macOS |60PASS/2FAIL/589assertions; ambos fallos requieren libc.so.6 en copia/restauración. Selección local incompatible, no se repite/omite ni se declara verde; CI Linux obligatoria |
| UNRUN local | Entrada canónica full Linux del SHA publicado | macOS no la sustituye; resultado remoto vigente por SHA en PR67 |
| UNRUN | QA independiente OpenCode | revisión del candidato final, no realizada por este autor |

Prerrequisitos existentes reutilizados; sin instalación ni cambios de lockfile. Python3
por defecto del sistema era anterior a3.10; se usa runtime3.12.14 disponible, sin alterar
herramientas del proyecto. El primer baseline rechazó una ruta de máquina en progress;
corregido el checkpoint portable y repetido ese gate. La primera fixture usó Subtipo
no admitido «Otros»: corregido a Promoción del contrato existente, sin alterar validación.
E2E inicial precisó nombre accesible del selector/grupo de error, no assertions financieras.

### Inspección visual propia (no independiente)

Capturas viewport390×844 y1440×1000 en `artifacts/e2-6/`: `flujo-390.png`,
`flujo-1440.png`, `flow-plan-{390,1440}.png`, `flow-current-{390,1440}.png` y
`flow-coverage-{390,1440}.png`. Inspeccionadas cabecera, plan, contexto y cobertura.
Cinco mejoras justificadas:1) nombre accesible explícito del selector,2) foco identificable
al error,3) filas alineadas en escritorio/tarjetas móviles,4) Intereses/Resto dentro de
Otros con menos repetición,5) subtotal Parcial solo en campos incompletos, sin duplicar
etiquetas bajo valores Verificados. Motivos visibles, sin desbordamiento; icono+texto,
contraste medido en texto de títulos/etiquetas/fuentes mínimo6,63:1. No auditoría WCAG total.
Capturas fullPage iniciales tenían un artefacto de repintado del navegador: sustituidas
por viewport con dos frames de estabilización. No modifica el producto ni oculta elementos.
Los PNG son ignorados por Git; workflow conservado, no se presupone subida remota E2.6.

### Límites que conserva el candidato

Sin proveedor de integridad histórica del intervalo, banco/deuda solo subtotal Parcial;
S y margen frente a nómina real No disponible. Fórmulas exactas con operandos completos
probadas focalmente; integración positiva completa UNRUN, sin habilitar fuente ficticia.
Sin identidad semántica del Presupuesto de Ahorro acreditada, residual No disponible;
no selección por nombre. Sin históricos/fotos ni netos E3/E4 instalados, estados explícitos.
No se añade tabla, migración, dependencia, hook, workflow, metodología, tablero o plantilla.
No se afirma equivalencia numérica con Excel ni se cierran B3/Dev32.

---

## Historia documental (supersedida solo en estado de autorización)

# 12 — Flujo mensual base: cobertura diseñada rev3

Status: DESIGN ONLY — spec12 rev3/wireframes/56AC aprobados el2026-10-25; sin ejecución funcional.
[Especificación](12-flujo-mensual-specification.md) / [decisiones](12-flujo-mensual-brainstorming.md).
Casos preparados antes del código, sin suite, servidor o migración nuevos. Futuras
rutas de pruebas/comandos son propuestas, hoy no ejecutables; no son evidencia PASS.

| AC cubiertos | Casos positivos y negativos / riesgo | Resultado a comprobar | Entorno y evidencia prevista |
| --- | --- | --- | --- |
|01–03/26 | Hechos en Inicio/corte, fuera/anulados; abierto con referencia; futuro/sin corte | Ventana central;0 solo con periodo/fuentes válidos, desconocido No disponible | Unit del read model + API integrada; datos ficticios y fuente/corte verificables |
|04–06 | Nómina2000/Bonus200/Otros50; Intereses como parte de Otros; abono N:M o sin asociar | Total2250 una vez, mes salarial no mueve banco; Histórico/Documentado/forecast no ingresan | Integración Ciclos/Movimientos/Nómina reales; inspección IDs/subtotales |
|07–11 | Gasto sin plan, cuota300, terminal con financiación, compartido bruto200, Transferencia | Gasto completo por tipo sin financiación duplicada, neto E3 aún ausente | Unit + API de composición, regresión de motores existentes |
|12–15 | Deuda válida inactiva, extraordinaria100/anulada y capital/interés no verificables | Total deudas400 informativo; desglose solo motor/verificación y mismo intervalo | Integración Deudas/relaciones, sin usar capital pendiente actual como pago |
|14/16–18 | I2250/G1800/A100, S negativo/0 y componente G desconocido | S350 PARCIAL; no−50 por deudas, no ahorro; desconocido impide S | Vectores monetarios exactos y API; no null→0 |
|19–23/26 | N2000/Del mes1900; sin líneas; Base completa/Del mes vacío y viceversa; cero explícito | Margen100 del plan, ausencia distinta de0; fuentes y cobertura por campo | Integración plan E2.3; hechos sin línea siguen positivos/Sin planificar, no nueva línea |
|24–25/36/48–56 | Ancla al corte histórico, ventana entre años, pagas múltiples/duplicadas, meses ausentes/incompletos, banco parcial, N0 y0 válido | Consolidación mensual de fuente documental central; N/12 y divisorN; cobertura/ausencia propagadas sin duplicar o descartar pagas legítimas | Unit del motor Nómina + integración consumidor E2.6; vectores abajo, no ejecutados |
|27–29 | Activos/inactivos, Liquidez Sí/No/ausente, Finalidad/bolsa distintas y posición desconocida | Motor Saldos único; suma conocida parcial, todos desconocidos No disponible | API integrada usando DTO real y universo completo, no solo primera página |
|30–32 | Ciclo antiguo y posición actual fechada, histórico ausente/foto mes natural incompatible | Actual separada; histórico No disponible sin fuente compatible, sin objetivos R6 | API + navegador; proveedor ausente no se simula como instalado |
|33–34 | Componentes banco completos y E3/Comida/flujo completo ausentes | Completo solo de métrica acotada; ausencias explícitas y sin0 global | Unit/DTO y revisión visual icono+texto |
|35/40 | Consulta/cambio de ciclo, IDs inactivos/renombrados e histórico precontrol ausente | Tablas/hechos/planes/fotos intactos; identidad/historia preservadas | Snapshot lógico antes/después; sin nueva persistencia por defecto |
|36–38 | Sumas grandes, contexto cambia, paginación, anónimo/expirado/error | Sin overflow, totales no truncados ni respuestas viejas, acceso seguro | Unit/API; Playwright real con respuesta retenida y errores, sin mocks de éxito financiero |
|39 |390/1440, teclado, foco, contraste, parcial/desconocido y actual/histórico | Wireframes pendientes; posterior UI real legible y con procedencia | Playwright/capturas inspeccionadas y colores computados; no ejecutar en documentación |
|41/47 | Gasto bruto con Compartido y fuente neta/Comida/Anticipo ausentes | No equivalencia con H, Neto+bruto ni segundo Gasto o descuento; pendiente E3.6/E4.7 | Unit/DTO y revisión de estados sin simular motores instalados |
|42–44 | Cortes ahorro sin posiciones, residual R3 identificado/no identificado y regla anual S015 | Tres conceptos separados; históricos No disponible si faltan fuentes, sin filtro S015 transversal | Integración condicional de motores existentes y vectores de ausencia |
|45–46 | C49 apunta a último ciclo diferente e histórico anual B54:B59 existe | Ciclo seleccionado/banco, no fallback a C49 ni incorporación precontrol anual | Unit/integración con fuentes distintas y cobertura explícita |

### Comandos y prerequisitos previstos para futuro dev autorizado

Focales propuestas: `bun test apps/api/src/flujo-mensual.test.ts`; navegador propuesto:
`node node_modules/@playwright/test/cli.js test tests/e2e/flujo-mensual.spec.ts`.
Esos archivos NO existen ni se crean ahora. Ajustar nombres al diseño técnico aprobado.
Tipos/build/baseline y focales/navegador solo con plataforma/herramientas soportadas.
Validación final por entrada compartida vigente en CI Linux del SHA candidato; guardas
productivas y restore aplicables conservados. No repetir full Linux en macOS con
prerrequisitos conocidos ausentes, no skips inesperados ni verde parcial como full.

QA independiente revisará composición financiera, fuentes/ausencias, contexto temporal,
no duplicación y cobertura de56AC; pruebas reales solo al candidato implementado. Los
contratos futuros E3/E4 no se presentan como módulos entregados. Q4 resuelta y
AC24/48–56 diseñados; aprobación completa, implementación y evidencia siguen pendientes.

### Vectores Q4 propuestos para futuro desarrollo

| Caso | Precondiciones | Resultado esperado, no ejecutado |
| --- | --- | --- |
| M1 Ancla histórica | Corte15/07/2026, última Ordinaria válida junio2026, otra agosto2026 | Ancla junio2026, ventana julio2025–junio2026; agosto no altera referencia histórica |
| M2 Varias Ordinarias | MesA1000+500 distintas y MesB2000; resto sin válidas | Totales1500/2000, N2, media1750 Parcial2/12; Base1600→margen150 Parcial |
| M3 Duplicado | Mismo ID/evidencia aparece repetido frente a dos pagas legítimas iguales | Duplicado una vez; iguales distintas conservadas; duplicidad no resuelta deja mes pendiente |
| M4 Ausencia e incompleto | Un mes sin Ordinaria, otro con500 válida y otra sin estructural verificable | Ninguno aporta0 o denominador;500 subtotal conocido no total mensual válido |
| M5 Banco parcial | Paga con operandos/documentación válidos y abono parcial o sin asociar | Fuente estructural documental válida; no usar parcial bancario como Neto completo ni excluir solo por conciliación |
| M6 Discrepancia | Originales salariales incoherentes sin revisar, o cobrado distinto a documento válido | Incoherencia salarial exige revisión; diferencia bancaria sola no equivale a incoherencia documental |
| M7 Cero y N0 | Totales1500/2000/0 verificados, frente a ninguna mensualidad válida | N3 y media exacta3500/3; mes0 cuenta; N0→Media/Margen No disponible |
| M8 Cobertura | N11/N12, Base completa frente a vacía/incompleta |11/12 Parcial y margen Parcial;12/12 Verificado para ventana y plan; Base incompleta→margen No disponible |
| M9 Integración/precisión | Revisión salarial cambia, lecturas paginadas y media fraccionaria | Nómina calcula una sola media exacta; consumidor usa contexto/IDs completos y no valores visuales redondeados |
| M10 Físico vs app | COUNTIFS físico incluye dos filas mismo mes y una de estructural vacío | Registrar divergencia de COUNTIFS por filas, no exigir igualdad con media de meses válidos app |

Los netos de cada vector son ficticios y requieren fuente/verificación declaradas.
No se importan documentos personales ni se activan pruebas mientras no exista dev autorizado.

### Registro de esta revisión documental

Fuentes físicas atribuidas al contraste de Álex, sin inspección de Excel por Codex.
Sólo preparación de texto/wireframes y verificaciones estructurales/enlaces. Pruebas
financieras/UI/CI de spec12 NO ejecutadas; implementación y aprobación completa pendientes.
No código/SQL/Excel/PR/merge. Medición separada por fase según piloto; resultados futuros N/D.

---

## Historial de cobertura provisional anterior a Q1–Q3

# 12 — Flujo mensual base: cobertura provisional previa al desarrollo

Status: DESIGN ONLY — checkpoint anterior a resolución Q1–Q3.
[Brainstorming/ronda1](12-flujo-mensual-brainstorming.md). Reutiliza el testplan de la
entrega; no crea otro workflow o gate. Refinar antes del código tras respuestas y
especificación aprobada. La autorización documental no autoriza dev12.

| Fuente / riesgo | Caso que preparar | Resultado esperado / pendiente | Entorno y evidencia prevista |
| --- | --- | --- | --- |
| Roadmap E2.6-AC1 / periodo | Inicio/Fin inclusive, abierto con corte, fecha fuera y ciclo sin referencia verificable | Maestro Ciclos, sin mes natural o cero ficticio | Unit/API local soportada; full Linux en CI, comando definitivo pendiente |
| E2.6-AC1 / cobro e identidad | Un abono N:M y abonos de una paga en ciclos distintos | Cada Movimiento una vez por fecha real; histórico/documentado/estimado separados | API integración con motores reales; command/fixture pendientes |
| E2.6-AC2 / gasto | Partida sin plan, cuota ordinaria con capital/interés y amortización extraordinaria | Gasto completo conservado, extraordinaria separada; fórmula Q1 pendiente | Unit/API y full Linux; no motores duplicados |
| E2.6-AC3 / cobertura | Compartidos/Comida sin motor; intervalos sin fuente frente a cero verificado | Cobertura y motivos visibles; agregados globales según Q3, aún pendiente | Unit/API + navegador de estados parciales |
| DT8 / liquidez | Liquidez distinto de Finalidad; ciclo anterior sin posición verificable | Corte/indicador Q2 pendiente; consumir Saldos sin fotos inventadas | Unit/API + presentación, según fuentes disponibles |
| DT8 / fórmulas | Casos sanitizados de indicadores Q1, signos, cero y ausencia | Vectores de referencia por acordar, no equivalencia Excel afirmada | Aritmética/contratos; comandos concretos tras diseño |
| Lectura y seguridad | API anónima/sesión expirada, errores, carga, cambio de ciclo y respuesta tardía | Sin bypass; periodo/borrador conservados y respuesta antigua descartada | API protegida y Playwright real, datos ficticios |
| Persistencia/integridad | Consultar flujo antes/después sin alterar hechos o planes | Fuentes intactas; migración/restore solo si el diseño aprobado las exige | Comparación de tablas, CI Linux para guardas productivas aplicables |
| UX aprobada futura |390/1440, contraste, teclado y cobertura/estimado/real legibles | Wireframes por aprobar; inspección posterior de UI real | Playwright/capturas; no ejecutar por esta fase documental |

## Preflight por fase y repetición

Documental: Git/PR/checkpoint, fuentes aprobadas, enlaces/estructura y baseline aplicable.
Funcional (solo tras gates): responsable de permisos/navegador, herramientas y plataforma
antes de delegar; focales y navegador locales soportados. Prerrequisitos Linux ausentes
no se sortean ni producen un full parcial verde: full final en CI Linux del candidato.
Registrar revisión/entorno/cambio-fallo-riesgo para cada repetición. QA independiente
sobre riesgos/candidato/delta, no repetición automática de toda batería acreditada.

## Medición pendiente

Separar preparación documental, desarrollo, CI y aprobaciones/merge. Registrar tokens
por respuesta/agente con caché incluida y sin duplicar herencia; consultas con su
información/decisión, bloqueos y demora de comunicación observable, verificaciones
repetidas y motivo, AC descubiertos tarde, hallazgos QA/CI. Comparación con fases
homólogas Dev10/Dev11 conforme al piloto local; cero mediciones futuras inventadas.


## Revisión independiente del diseño rev1

SPEC12-DOC-QA PASS por inspección, sin hallazgos materiales;40 AC con cobertura y
wireframes/propuestas diferenciados de implementación. Sólo estructura/enlaces/
whitespace comprobados localmente; ninguna prueba funcional/UI/CI de spec12 ejecutada.
Q4/AC24 pendiente impide cerrar margen estructural. No se reclasifica como capacidad
futura para aprobar el resto por inferencia. Documento completo/visual sin aprobar.


## Delta rev2 de decisiones definitivas Q1–Q3

Columnas físicas D–L y limitaciones respecto a E2.6 documentadas. Nueva restricción
extraordinaria con Deuda válida; posiciones/ahorros separados y no regla anual S015
como filtro de Liquidez; C49 por ciclo seleccionado y precontrol anual fuera del ciclo.
Estados públicos Verificado/Parcial/No disponible/Cero verificado, con alcance por métrica.
AC01–40 conservados y AC41–47 diseñados, no ejecutados. Q4 sigue pendiente, sin nuevas
preguntas Q1–Q3. Revisión rev1 anterior es historia y no acredita por sí sola este delta.


### Revisión independiente del delta rev2 — 2026-10-25

SPEC12-DOC-QA PASS por inspección, sin conflictos materiales ni pruebas ejecutadas.
AC41–47 cubren precisiones definitivas;47IDs únicos y enlaces/estructura comprobados.
Q4 pendiente, aprobación completa/visual y desarrollo siguen sin otorgar.


### Revisión independiente rev3 — 2026-10-25

SPEC12-DOC-QA PASS de Q4 por inspección. AC24–25/36/48–56 y M1–M10 conformes:
consolidación mensual, duplicados/ausencias/incompletos, banco parcial/documentación,
cobertura del margen y referencia histórica. Q4 resuelta;56AC diseñados, ninguno
ejecutado por esta fase. Aprobación completa/visual y autorización dev12 pendientes.


### Aprobación documental y límite de evidencia — 2026-10-25

Usuario «si aprobada» a solicitud única de documento completo rev3/wireframes/56AC.
[Registro](12-flujo-mensual-brainstorming.md#aprobación-completa-rev3--2026-10-25).
Cobertura diseñada y QA documental conformes, no pruebas financieras o UI ejecutadas.
Las menciones anteriores de aprobación pendiente conservan la historia y quedan
resueltas por este hito. No dev12, SQL/Excel, merge o despliegue autorizados.
