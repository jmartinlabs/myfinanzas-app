# 07 — E2.1 Operación de Ciclos: Progress

Specification aprobada integrada PR37/c04dc07; dev07 autorizado por el usuario
2026-10-22. Rama feat/07-ciclos-operacion, trabajo aislado. **IN PROGRESS —
verificación global bloqueada**, sin publicación/merge/despliegue/migración operativa.

| Incremento aprobado | Estado real |
| --- | --- |
| Persistencia/continuidad | Implementado SQLite8; fixture7 genuina demo/producción ficticia, Deuda/hechos/auditorías/MFA y guardas; O4/O5/O7 PASS |
| Impacto/operaciones | Implementado maestro único, preview completo, motivo/confirmación, revisión, reintento, rollback e historial; O1–O9 PASS |
| API/UI | Implementado con pipeline/seguridad/componentes existentes; E2E íntegro2 PASS,390/1440 y restoreMFA |
| QA independiente | Revisiones de3834ca9 y5787c39; dos hallazgos iniciales corregidos con regresiónO8; dictamen final pendiente del candidato consolidado |
| Entrega PR | Pendiente gate global API y QA final, luego coordinador prepara PR/CI; sin merge automático |

## Decisiones y límites

Se reutilizan Q1/Q2 y26 AC operativos aprobados; no hay decisiones financieras nuevas.
Saldo Comida manual admite cero/negativo explícito sin propagación; tblCiclos sigue
siendo el único maestro (SQL ciclos). Hechos originales intactos. AC27–29 separados;
E2.1-AC2 pendiente de Comida E3.5. Sin cierres/conciliaciones ficticias ni motores futuros.
Dev32/PR30/AC22 pausado, sin investigaciones/cambios. Referencia v5.11(7) candidata.

## Resultados y bloqueo actual

[Testplan](07-ciclos-operacion-testplan.md) mantiene matriz26, comandos, fallos y capturas.
Typecheck/build PASS; suite API íntegra105 PASS/1 FAIL (106 tests/1713 assertions).
Falla apertura concurrente heredada v3, SQLiteError UNCLASSIFIED errno11 faseopen en
database-identity.ts:13:6. Comprobación afectada posterior12 PASS/270 no cierra el fallo.
Control base del coordinador en c04dc07: mismo escenario1 PASS/18 assertions, una
ejecución; no atribuye causa ni cierra el fallo candidato. No se modificará apertura
fuera alcance por inferencia.
Playwright completo2 PASS/47,6s, conservando financiero heredado y restore/MFA.
Tres mejoras visuales justificadas aplicadas y verificadas; ninguna CI remota declarada.

## Trazabilidad y relevo

3834ca9: primer backend verificable entregado a QA. 5787c39: UI y continuidad ampliada,
corrección de dos hallazgos QA (periodo con mismoID y extras manipulados en replay).
Incremento posterior: fault injection omitido, E2E real y documentación actualizada.
Solo coordinador actualiza tablero. Siguiente acción: cerrar diagnóstico/gate con evidencia,
QA del candidato y revisión final; preparar PR cuando sea verificable, nunca auto merge.

## Conciliación final del coordinador — 2026-10-22
QA independiente sobre53cc238 (código d63442e): dictamen funcional favorable,
sin nuevos defectos detectados. Probes originales corregidos; ejecución QA
propia8/154, probes3/22 yO9 adicional1/17 PASS. E2E Developer2/47,6s contrastado
por QA mediante código/log/capturas. No se atribuye a QA la suite E2E completa.

AC23 y gate API global siguen BLOQUEADOS por105 PASS/1 FAIL errno11. Control
base c04dc07 del coordinador1 PASS/18 no demuestra causa ni cierra el fallo.
Un único probe de dos procesos con barrera e instrumentación temporal segura
dio lecturas immutable/live correctas y una DDL8; no reprodujo ni identificó
handle del fallo original. Sin cambios de apertura/guardas ni reanudación Dev32.
No se propone corrección causal sin evidencia.

Se prepara PR funcional en estado DRAFT para revisión con evidencia y CI por SHA,
no entrega verificada ni merge automático. Un CI posterior verde no se presenta
como resolución de esta incidencia. Ampliar la ruta heredada de diagnóstico
requiere decisión de alcance; no se oculta como trabajo funcional completado.
