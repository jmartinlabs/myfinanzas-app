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
