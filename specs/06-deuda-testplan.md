# 06 — E1.6 Cuota y amortización de Deuda: Test plan

Estado 2026-10-22: IN PROGRESS. Pruebas reales actuales separadas de cobertura pendiente. 30 AC actuales; AC31–33 contratos futuros NO implementados.

| AC | Verification | Current result |
| --- | --- | --- |
| 01/03/04 | D1 maestro/enlace/consulta; UI prevista | API parcial PASS; UI pendiente |
| 02 | dos procesos/IDs/reintento/D1000 | pendiente |
| 05 | D2 enlace usado incluso antes sin Deuda; apertura usada | PASS local |
| 06/09/13 | D1 oráculo independiente banco130/Gasto170/principal720 con precontrol | PASS local |
| 07/08/10/12 | D2 desglose/exactitud/ausencia/Partida sin Deuda | PASS local parcial; ampliar límites |
| 11 | D3 Terminal/No controlado y permiso | PASS local parcial; ampliar negativos |
| 14/19/20 | D2 igualdad/exceso/ambas Deudas/anulación | PASS local parcial; concurrencia pendiente |
| 15 | D3 futuro/Madrid/DST | servidor PASS; cliente pendiente |
| 16/17/24 | D1 sin ciclo/referencia/filtro ID | API PASS parcial; UI pendiente |
| 18 | regresión Referencias y nuevos pagos | pendiente |
| 21/22/23 | D2/D3 huella/reintento/rollback hechos-auditoría-ID-intento | PASS local parcial; procesos pendientes |
| 25/26 | Playwright real390/1440, capturas inspeccionadas/errores/borrador | pendiente |
| 27 | Effect HTTP real con MFA/Origin/CSRF | pendiente |
| 28 | v6 genuina demo+production ficticia/rollback/concurrencia | pendiente |
| 29 | age/manifiesto7/restore destino nuevo/MFA | pendiente |
| 30 | matriz cuatro Tipos y regresión E1.1–E1.5 | pendiente suite completa |
| 31–33 | E2/E4 y cierres futuros | contratos revisados, NO implementados/probados |

## Executed checks
- `bun run typecheck`: PASS (Bun1.4.3).
- `NODE_ENV=test bun test apps/api/src/deudas.test.ts`: 3 PASS/0 FAIL/44 assertions.
- Referencias: primer run falló por trigger durante rebuild; corregido. Segundo run9 PASS/2 FAIL, expectativas estructurales pendientes. No retry para conseguir verde.

QA independiente y CI por SHA pendientes. No pruebas sobre datos operativos, VPS o Dev32.
