# 06 — E1.6 Cuota y amortización de Deuda: Progress

Specification: [spec06 aprobada](06-deuda-specification.md).
Current state: IN PROGRESS — desarrollo autorizado expresamente por usuario el 2026-10-22 mediante `$orchestrate`; sin merge ni despliegue. Esta autorización posterior sustituye las prohibiciones históricas de iniciar dev06 durante la adopción.

| Task | Status | Evidence |
| --- | --- | --- |
| Maestro Deudas y migración v6→v7 | implemented / verification in progress | debt-schema.ts, deudas.ts; historial sin backfill, apertura protegida |
| Partida→Deuda y pagos únicos | implemented / verification in progress | clasificación y pipeline Movimientos existentes; banco/gasto/capital separados |
| UI Deudas y desglose/revisión | implemented / verification in progress | componentes existentes/tokens; navegador pendiente |
| Aceptación y regresión | in progress | D1–D3 3 PASS/44 assertions; typecheck PASS; suites completas pendientes |
| QA independiente | pending candidate review | coordinador asigna QA sobre SHA fijo |

## Decisions
No se reabren Q1–Q4. Capital usa únicamente ID/Inicio control/apertura y capital de hechos vigentes; precontrol conserva banco/Gasto. Sin reglas nuevas, dependencias runtime ni cambios de infraestructura32.

## Errors, regressions and blockers
Primer ensayo de migración rechazó trigger externo referencia_used_type durante rebuild; corregido preservándolo dentro de la misma transacción. Regresión de Referencias 9 PASS/2 FAIL por expectativas del nuevo esquema/columnas; se ajustarán únicamente expectativas de estructura nueva. No se declara la funcionalidad terminada ni AC futuros implementados.

## Next action
Completar pruebas de continuidad v6 genuina demo/producción ficticia, concurrencia, restore/MFA, API, UI/Playwright 390/1440; QA independiente y correcciones antes de PR. No merge automático, migraciones operativas ni datos reales.

## Incremento y revisión independiente — 2026-10-22
Candidato inicial 67f2dbd revisado por QA independiente. Se corrigieron cuatro hallazgos: payload null de extraordinaria (deriva en servidor), exceso indebidamente aplicado al precontrol con apertura negativa, actualización productiva v6→v7 ausente y filtro Deuda de UI no conectado. Tests D4/D7 y recorrido E2E cubren las correcciones; no se cambian aprobaciones financieras. PR33 incorporada sin conflictos mediante merge de origin/main7c5c7d1b.

El upgrade productivo de E1.6 se ejecuta exclusivamente después de las comprobaciones existentes de ruta/identidad/pareja efectiva DB-clave y conserva la identidad. Solo se ha probado en fixtures ficticias; ninguna migración operativa ejecutada. Restore7 conserva la política heredada de revocación, incluidos los nuevos intentos Deuda.

API íntegra intermedia:96 PASS/1537 assertions; D10 adicional10 PASS/166 assertions; types/build PASS. Playwright financiero E1.4/E1.5/E1.6+restore/MFA1 PASS28s; catálogo1 PASS17.6s. Runs completos finales en curso tras D10 y ajustes visuales. Aceptación local final, QA de correcciones y CI pendientes de consolidar; PR todavía no preparada.
