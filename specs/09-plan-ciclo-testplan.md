# 09 — Plan del ciclo: plan de pruebas

Estado: EN CURSO, sin PASS declarado. Fecha 2026-10-24.
Datos exclusivamente sintéticos. Evidencia vinculada al commit candidato al validar.

## Trazabilidad

| AC | Comprobación / evidencia | Resultado esperado | Estado local |
| --- | --- | --- | --- |
| AC-01 | P3/P7/P10 | Sin plan, sin líneas/importes generados ni cambios por GET | PASS focal |
| AC-02 | P1/P3/P8; E2E | null y cero preservados y diferenciados | PASS focal; UI pendiente |
| AC-03 | P3 | Guardado admitido, sin ajuste ni restricción relativa | PASS focal |
| AC-04 | P3/P8 | Rechazo por campo, plan intacto | PASS focal |
| AC-05 | P3 | Esencial/Del mes conservados; no valores implícitos; null explícito vacía solo el campo solicitado | PASS focal |
| AC-06 | P1/P3 | A transferir coincide exactamente; no crea Movimiento | PASS focal |
| AC-07 | P2/P7 | Ejecutado Gasto real suma importes íntegros elegibles, sin filtrar por destino del Presupuesto | PASS focal |
| AC-08 | P2; regresión Deudas | Cuota íntegra incluida como Gasto; amortización excluida | PASS focal |
| AC-09 | P2 | Solo Transferencia ejecuta Aportación, sin segunda ejecución por Gasto | PASS focal |
| AC-10 | P2 fixtures aisladas | No ejecutan Aportación; no habilitar operaciones inválidas en API para probarlo | PASS focal |
| AC-11 | P2 | Cuenta en Gasto real por Partida; no aplicar exclusión propia de Transferencias | PASS focal |
| AC-12 | P1 V5–V7; E2E No aplica | A transferir conserva Del mes, incluido null/0; Ejecutado vacío con motivo No comparable, nunca cero; Pendiente/Estado null, sin aviso Sin planificar | PASS focal; UI pendiente |
| AC-13 | P1/P7; E2E V1 recarga 390/1440 | Ejecutado se conserva en API/recarga/UI; A transferir/Pendiente/Estado null; Sin importe del mes como explicación, nunca Sin planificar | PASS focal; UI pendiente |
| AC-14 | P1 | Pendiente 40/0/−20 y estados Pendiente/Completo/Excedido | PASS focal |
| AC-15 | P1 V3/V4/V10; E2E | A transferir 0; Pendiente 0/negativo y Estado Completo/Excedido solo con ejecución verificable. Sin verificación, Ejecutado/Pendiente/Estado null y motivo; nunca Sin planificar si existe línea | PASS focal; UI pendiente |
| AC-16 | P2/P12 | Solo elegibles según motor Ciclos; sin sustitución por mes natural/hoy | PASS focal |
| AC-17 | P12 | Casos no verificables/no iniciados muestran Ejecutado vacío y motivo, sin Pendiente/Estado ficticios; solo el periodo verificable iniciado sin hechos devuelve cero en fuente comparable | PASS focal |
| AC-18 | P7/P10 | Recalcular ejecución; importes manuales intactos; preview anterior inválido | PASS focal |
| AC-19 | P5; E2E copia | Base/Esencial marcados; Del mes desmarcado; origen por ID estable | PASS focal; UI pendiente |
| AC-20 | P5; E2E copia efectiva | Solo vacíos reciben valores del origen; cero nunca se sobrescribe; preview enumera omisiones | PASS focal; UI pendiente |
| AC-21 | P5/P10; E2E | Sin relleno; no introduce inactivos; no copia derivados ni modifica origen | PASS focal; UI pendiente |
| AC-22 | P4 rollback trigger | Commit completo o rollback completo, sin copia parcial | PASS focal |
| AC-23 | P3/P8; E2E revisión | Permitido con preview, motivo obligatorio y confirmación, sin mutar Movimientos | PASS focal; UI pendiente |
| AC-24 | P5 | Línea visible; editable solo sin cierre financiero, con impacto/motivo cuando corresponda; sin nueva relación ni reactivación; no seleccionable para nueva línea | PASS focal |
| AC-25 | P9 dos procesos reales | Una aplica; otra detecta conflicto y conserva borrador, sin sobrescritura | PASS focal |
| AC-26 | P4 | Igual intento devuelve mismo resultado; distinto se rechaza, sin auditoría duplicada | PASS focal |
| AC-27 | P7/P10 | Contexto obsoleto rechazado, requiere nueva revisión | PASS focal |
| AC-28 | P13; E2E Presupuestos | Impacto completo por ciclos y resultados antes/después; bloqueo si cobertura insuficiente, hechos originales intactos | PASS focal; UI pendiente |
| AC-29 | P7 105hechos/int64 agregado | Total exacto sobre todo el conjunto, no solo página; sin float/desbordamiento | PASS focal |
| AC-30 | P3/P8 | Rechazo atómico; identidad por ID, nunca por nombre | PASS focal |
| AC-31 | P3/P11 | Deltas, actor, instante y motivo aplicable; sin snapshots completos por edición | PARCIAL: deltas PASS, restore Linux pendiente |
| AC-32 | P8 HTTP Effect | Acceso denegado; sin escrituras, SQL, secretos ni payload financiero en logs | PASS focal |
| AC-33 | P6/P11 Linux | Planes y maestros consistentes, clave/acceso preservados al migrar; restore revoca accesos/intentos conforme política vigente | PARCIAL: P6 PASS, P11 Linux sin ejecutar |
| AC-34 | E2E planes-ciclo 390/1440 | Listado, edición, copia y detalle legibles; capturas ficticias inspeccionadas; estados carga/vacío/error/conflicto/borrador verificados | PARCIAL: recorrido inicial PASS; tabla final/copia ampliada pendientes |
| AC-35 | P1/P7; E2E | Visible como Sin planificar; ciclo sin líneas además indica Sin plan. Sin objetivos/pendiente/estado ficticios ni líneas automáticas | PASS focal; UI pendiente |
| AC-36 | P1/P12; E2E No aplica | Sin aviso Sin planificar; No aplica conserva No comparable, cero conserva su valor verificable y no verificable conserva su motivo, sin conversión a cero | PASS focal; UI pendiente |

V1–V10: matriz de importes nullable, cero explícito, No aplica y ejecución no verificable.
Comandos previstos: bun run typecheck; bun run build; bun run test; bun run test:e2e;
bash scripts/check-project; bash scripts/test-checks; bash scripts/validate-template.
Inspección visual, contraste y cinco mejoras justificadas: pendiente.

## Contratos futuros

E3/E4 fuentes adicionales y protección efectiva por cierre E4.9: revisados en diseño,
no implementados ni probados mediante dobles. Los 36 AC vigentes siguen abiertos.

## Ejecuciones locales — 2026-10-24

Runtime temporal Bun1.4.3 verificado por coordinador; sin nueva dependencia.
- Typecheck y build: PASS.
- P1–P10:10 pass/0 fail,140 expectativas antes de añadir P11–P13.
- P10/P12/P13:3 pass/0 fail,19 expectativas.
- E2E independiente:1 pass (coordinador), antes de ampliación de copia efectiva.
- API completa1:85 pass/46 fail; /var alias rechaza ancestros correctamente.
- API completa2 TMPDIR=/private/tmp:90 pass/42 fail,1546 expectativas; fallos
  publicación/backup/producción por libc.so.6 ausente en macOS. No PASS global.
  Logs locales /tmp/dev09-api.log y /tmp/dev09-api-private.log, sin versionar.
- P11 backup/restore10 y continuidad productiva: pendiente Linux, no cubierto
  por dobles ni por una excepción de plataforma.

## Revisión visual

Coordinador inspeccionó null-month-mobile y review-desktop iniciales: legibles
y sin overflow. Ajustes justificados: botones primary/secondary de la identidad
existente, acciones con separación, altura44px en acciones del plan y del detalle,
historial de deltas con etiquetas/importes legibles y tarjetas con ancho máximo
para evitar expansión excesiva en escritorio. Sin nueva paleta; repetir capturas
tras estos ajustes antes de declarar revisión visual terminada. Contraste oscuro
sobre principal conserva el par aprobado; medición foreground/background pendiente.

Actualización candidato tras formato: typecheck/build/diffcheck PASS;12 focales
P1–P10/P12/P13 PASS,155 expectativas; P11 filtrado explícitamente porque requiere
Linux glibc, pendiente gate CI completo. Fuente candidata aún sin SHA.
Primera ejecución contenía además expectativa heredada08B3 «E2.3»; se actualizó
a «Impacto de periodos no verificable» manteniendo el rechazo por historia sin
ciclos. Segunda ejecución no contiene ese fallo funcional. No todos los fallos
iniciales eran de plataforma.

## Verificación visual ampliada del coordinador

`planes-ciclo.spec.ts` ampliado:1 PASS/4.1s con navegador y servicios reales.
AC-02/12/13/15/19/20/21/23/35/36: comprobaciones UI locales PASS; AC-28 y restoreUI
integrados en recorrido financiero Linux todavía pendientes de CI. AC-34 sigue parcial:
capturas y contraste PASS, validación integral de todos los estados se contrasta en QA.
Se inspeccionaron `artifacts/e2-3/null-month-desktop.png`, `null-month-mobile.png`,
`review-desktop.png` y `review-mobile.png`; detalle en `execution-mobile.png`.
Las cinco mejoras aplicadas: acciones de identidad, separación de acciones, área táctil,
historial legible y disposición tabla/tarjeta. Se detectó y corrigió además solapamiento
de columnas de escritorio heredado de otra tabla; regresión geométrica de cabeceras.
Contraste calculado sobre foreground/background reales de acciones primarias ≥4.5
en ambas anchuras; sin nueva paleta ni excepción. No equivale a auditoría WCAG completa.
Regresión compartida CI tras añadir PNG e2-3 al artefacto:32 PASS; controles proyecto,
documentación y whitespace PASS. No se exportan DB, sesiones, trazas ni factores.

## Primera CI Linux y correcciones QA

Run40075502671, SHA45a73cf: baseline PASS; API135PASS/3FAIL, E2E no ejecutado por
fallo del paso anterior. Dos regresiones guardaban backup en v9 y restauraban v10;
P11 no configuraba destino productivo antes de restore. Se corrigen las rutas y la
configuración del fixture; código de apertura/restauración y guardas sin cambios.
QA independiente halló reintento de catálogo inicial ineficaz y respuesta manual
potencialmente obsoleta al cambiar ciclo; se corrigen sin mutar importes ni hechos.
E2E local con regresiones de recuperación de catálogo y respuesta tardía:1PASS/4.6s;
typecheck PASS. AC-34 añade carga/error/reintento real de UI, manteniendo pendiente
la regresión integral Linux y el recorrido de restauración. Sin repetir CI a ciegas.

## Resultado Linux del candidato 88941e1

[CI40076614284](https://github.com/josemartin2000/myfinanzas-app/actions/runs/40076614284):
API137PASS/1FAIL. P1–P13 completos PASS, incluido P11 con continuidad/restore10
productivo y demo, auditoría, sesiones/intentos revocados. Las tres correcciones de
fixtures de la primera CI quedan verificadas. El único FAIL es B3 heredado con
SQLITE_IOERR_SHORT_READ522 al reabrir tras contención; no es una prueba nueva de E2.3.
E2E global omitido por fallo API, no PASS; AC-28 UI integrada/AC-33 restoreUI y
aceptación global de AC-34 siguen pendientes de ese recorrido. No se usa el E2E local
independiente como sustituto. Harness54/0 y validador18/0 locales PASS.
La suite no se relanza para ocultar este fallo ni se modifica su política por dev09.
