# 11 — Nómina histórica y previsión separada: Progress
Specification: [spec11](11-nomina-prevision-specification.md)
Current state: integrada en main mediante PR63; verificación final Linux PASS.


## Cierre vigente — 2026-10-24

Usuario «Aprobado merge» tras PR63 lista para revisión. [PR63](https://github.com/jmartinlabs/myfinanzas-app/pull/63)
integrada en main `ed4a2723de9a8f8b43ba13a44a1bc5703f7a5a70`; candidato validado
`7d24a7f23bb61082c70655f4bc86ed284b4f7152`. [CI40128422924](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40128422924)
SUCCESS: baseline/full/required,169 API/0fallos/2683 aserciones,5 E2E. P11 acredita
backup/restore v12 demo/production, originales y N:M/auditoría preservados e intentos
revocados. QA independiente PASS,22 focales/156 aserciones; capturas390/1440 y
contraste mínimo6,04:1 inspeccionados. La limitación macOS permanece documentada y
no invalida la evidencia Linux; no se omiten pruebas ni se afirma equivalencia con
el Excel físico. Sin despliegue o cambios de Excel. Próximo: piloto local autorizado
y preparación documental de E2.6/spec12; dev12 no autorizado. Los apartados siguientes
son checkpoints históricos previos al cierre, no tareas actuales pendientes.

Desarrollo autorizado por usuario «Autorizo» tras integración PR62 el2026-10-24;
rama `codex/dev11-nomina-prevision`, base `1cf13b4`. El gate está registrado por
coordinador en epic-board. Las frases históricas de spec11 sobre futuro dev no revocan
ese gate. Un ejecutor; sin subdelegación del ejecutor, Excel, datos reales, merge o deploy. Publicación/PR por coordinador.

| Task | Status | Commit / evidence |
| --- | --- | --- |
| Preflight/migración v11→v12 preservadora/backup | implementado; focal continuidad/rollback PASS; restore Linux pendiente | payroll-schema.ts, database-schema.ts, backup.ts, database-v11.ts |
| Originales/derivados/conciliación/Neto documentado | implementado; focal PASS | nomina.ts / nomina.test.ts |
| N:M global/evidencias/revisión/idempotencia/auditoría | implementado; dos procesos y HTTP MFA/CSRF PASS | P2–P5/P8/P9/P12/P13/P14 |
| Pronóstico decimal exacto/pp/fuentes coherentes | implementado; focal y QA PASS | payroll-decimal.ts, P6/P7/P10 |
| UI Histórico/Cobros/Pronóstico responsive | implementada; C2 final PASS, contraste6,04:1 y capturas inspeccionadas390/1440 | Nomina.tsx / nomina.spec.ts |
| Mapeo46AC/evidencia | registrado con parciales/gates honestos | testplan11 |
| QA independiente/full/inspección final | QA/C2/baseline PASS; full Linux pendiente | limitación macOS registrada, sin cierre anticipado |

## Verified increments
2026-10-24, raíz del repositorio. Dependencias existentes, Bun1.4.3; sin instalación.
Focal C1 del testplan:16 PASS/0 FAIL,94 assertions. Typecheck PASS; build PASS31 módulos.
Formateo Prettier3.6.2 desde caché local. diff-check PASS provisional.
Coordinador: primer E2E PASS1(3,4s), PNG390/1440 inspeccionados; fixes posteriores requieren repetir.

## Decisions
[Arquitectura](guidelines/architecture.md#e25--nómina-candidato-dev11) y [testplan](11-nomina-prevision-testplan.md).
No entidad/campo documental salarial idéntico existente: nueva entidad independiente del banco.
Migración en IMMEDIATE existente y guardas de identidad sin cambios. Decimal base10 con bigint,
sin dependencia, redondeo solo de presentación. No completar fuentes parciales ni mezclar pagas.
Auditoría conserva deltas originales y asignaciones; resolución conciliatoria separada de Neto fiscal.

## Errors, regressions and blockers
Focal inicial6FAIL por fingerprint(undefined) en auditoría nueva: corregido sin eliminar assertions.
Builderv11 inicialmente omitía argumento identity: corregido. Cleanup handler HTTP inicialmente
usaba dispose inexistente: corregido. Último focal16PASS, no fallos actuales ocultos.
Playwright sandbox no inició config.webServer; escalación quedó esperando803s y se interrumpió.
Coordinador ejecuta navegador. Guardia exacto falló primer recorrido; aria-label explícita corrigió.
QA solicita invalidar preview al editar y descartar respuestas antiguas, corte visible/consultable,
comparación humana y tabla escritorio: implementado, verificación final pendiente.
Guardas Linux/backup restore no ejecutables en macOS; no relajadas ni declaradas PASS.

## Next action
Coordinador: QA independiente, operar E2E ampliado y estados async/corte, inspeccionar capturas
estables y contraste, ejecutar verificación canónica full y restore Linux sobre SHA candidato.
Revisar cambios/historial/datos sensibles antes de commit/push/PR. Merge solo tras aprobación explícita.


## Complemento focal solicitado tras QA
2026-10-24: cierre de cobertura de comportamiento AC04/06/16/18/20/21/30/34/35/36
con P17–P20; C1 **21 PASS/0 FAIL,152 assertions**. Typecheck y diff-check PASS.
Sin cambios de aplicación para esos casos. Ajuste ordinario adicional solicitado por
coordinador: corte por mes civil Madrid en backend/frontend, cubierto P21 en borde UTC.
No se relanzó full ni navegador; coordinador conserva resultados y gates globales.

## Candidato final del coordinador — 2026-10-24

QA independiente PASS tras corregir invalidación asíncrona, corte explícito y ABA.
C1 final21 PASS/152 assertions y typecheck PASS; build final PASS31 módulos. C2 final
PASS1(3,7s), incluye corrección bancaria real desde UI y preservación de originales,
carreras de respuestas y conflictos; mínimo contraste medido6,04:1. Capturas finales
390/1440 inspeccionadas. Baseline canónico PASS.
Application canónica local: tipos/build PASS, API120 PASS/43 FAIL en macOS (39errores
libc.so.6 directos y4 de procesos Linux); E2E global UNRUN por fallo previo. Esta
ejecución precede al complemento P17–P21, acreditado aparte mediante C1. No se declara
full PASS ni restore Linux probado. Publicar candidato para obtener CI Linux completa,
sin omitir pruebas ni modificar harness. Merge requiere aprobación expresa de su PR.

## Corrección de fixture tras primera CI Linux — 2026-10-24

Candidato `5979731`, run40128010086: baseline PASS; API167 PASS/1 FAIL (2660assertions),
E2E global UNRUN. Único fallo en P11 backup/restore: nuevo abono asumía S001,
inexistente en la base production sin cuentas demo. No fallo del reparto ni permiso
para omitir el ensayo. La fixture crea ahora destino mediante createSaldo y utiliza
su ID real en ambos orígenes. P22 reproduce production-v9 sin cuenta demo, migra,
crea destino explícito y verifica N:M/FK. Corrección limitada a pruebas y revisión
independiente PASS. C1 repetido por delta de pruebas:22 PASS/156 assertions; typecheck
PASS. CI Linux/restore completo aún pendientes del candidato corregido.
