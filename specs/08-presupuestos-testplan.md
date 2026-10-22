# 08 — E2.2 Presupuestos: evidencia parcial al checkpoint WIP

Fecha de checkpoint:2026-10-23 Europe/Madrid. **NO VALIDADO COMO ENTREGA**. No hay QA independiente de candidato ni24AC aceptados globalmente. Pruebas escritas/diseñadas no equivalen a PASS. Este registro transcribe logs existentes; no se ejecutaron nuevas pruebas durante el checkpoint.

| Registro local privado | Resultado observado | Alcance / límite |
| --- | --- | --- |
| typecheck-current.log y reportes Developer | PASS | Tipos; no aceptación funcional/visual |
| budgets-current.log |8 PASS/0 FAIL/156 aserciones | B1–B8 focales; hubo ampliaciones posteriores de continuidad, no atribuir esta pasada a todo el código final |
| api-first.log |98 PASS/7 FAIL/1631 aserciones | Preservar fallos:2 expectativas técnicas del nuevo campo, P11timeout,2 hijos concurrentes exit1 y B3/B4pipeEPERM; sin causa única demostrada |
| api-final.log |105 PASS/0 FAIL/1713 aserciones,39.79s | Log completo posterior, tras adaptaciones técnicas y permisos de red; encontrado al congelar, sin nueva ejecución ni atribución causal de todos los fallos |
| e2e-first.log |FAIL de arranque config.webServer,exit1 | No llegó a ejecutar escenarios; no hay E2E PASS ni capturas inspeccionadas dev08 |
| QA08 preparatoria | Matriz24 y riesgos preparados | Sin ejecución ni dictamen sobre candidato; matriz privada, no pruebas completadas |

El perfil de ejecución por defecto bloqueó creación de sockets con EPERM; comprobación equivalente con permisos adicionales permitió loopback. Ese prerrequisito justifica la segunda ejecución, pero no demuestra causa de cada error SQLite/concurrencia histórico. No se modificó el motor de apertura para cerrar fallos ni se afirma resuelto AC23.

## Cobertura escrita para revisión posterior

| Casos del archivo presupuestos.test.ts | Criterios que pretenden apoyar | Estado de aceptación |
| --- | --- | --- |
| B1 fuentes/destinos/sin reserva | AC01–04/08/09/20/23/24 | Pendiente de revisar cobertura exacta y extremos |
| B2 nombres/Estado/intento/revisión | AC10–12/15/16/17 | Pendiente; nombres requieren revisar altas/ediciones/concurrencia, no solo nombre del caso |
| B3 relación Partida/Deuda/historia | AC05–07/11/13/14 | Pendiente de QA independiente |
| B4 preview/huella/rollback | AC13/14/17 | Pendiente de QA y validación de todas las rutas |
| B5 procesos reales | AC17/23 | Ejecución local observada, cobertura completa por verificar |
| B6 HTTP/MFA/CSRF/errores | AC18/19/20/24 | No sustituye errores/borrador/UI pendientes |
| B7 continuidad genuinav7 | AC22 | Ampliada con cuota/hechos/audit; global posterior PASS, revisión pendiente |
| B8 backup/restore/contrato8 | AC22 | No afirmar todos los fallos de migración cubiertos sin revisión |
| tests/e2e/presupuestos.ts e integración en movimientos.spec.ts | AC de flujos y especialmente AC19/21,restore/MFA | Escritos; E2E/visual390/1440 NO VERIFICADOS |

AC01–AC24 continúan como criterios actuales; ninguno se degrada a futuro por falta de prueba. F-01(E2.3) y F-02(E3/E4/cierres) permanecen contratos futuros NO implementados. AC23 de E2.1 es un bloqueo independiente, no el AC23 de esta especificación.

Siguiente gate solo bajo nueva instrucción: candidato SHA fijo, comprobación de cobertura y regresiones necesarias, E2E completo e inspección visual y QA independiente. No PR ni merge autorizados por el checkpoint WIP.
