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

## Evidencia ampliada y hallazgos QA — 2026-10-22
- D1–D10:10 PASS/0 FAIL/166 assertions. D4 usa builder v6 congelado, hechos/REF/auditoría/intento/acceso genuinos y ambas identidades demo/production ficticia. Compara todas las filas heredadas (únicas extensiones: columnas null y versión/contador nuevo); restaura age7/MFA/IDs/posiciones y revoca sesiones/intentos. D5 fuerza fallo DDL y esquema desconocido preservados. D8 usa procesos reales para upgrade, IDs >999, reintento y dos pagos600+600 contra1000: solo uno guarda, otro409; nueva revisión del segundo bloquea exceso.
- D7 cubre regresiones QA de payload UI null y apertura negativa con pago precontrol. D10 cubre inactivos, permiso Exterior No, referencia obligatoria también en extraordinaria, contexto obsoleto y fallo de auditoría sin consumo de hechos/IDs/intentos.
- `bun run test` íntegro intermedio:96 PASS/0 FAIL/1537 assertions en23.46s. D10 y revocación debt_attempts añadidos después; resultado íntegro final pendiente, no sumar runs para fingir suite.
- `bun run typecheck` / `bun run build`: PASS tras correcciones y formato. Bun1.4.3, age1.3.2, Chromium sistema.
- Playwright financiero real:1 PASS28.0s (E1.4+E1.5+E1.6+restore/MFA). Catálogo anterior1 PASS17.6s. Run completo final pendiente tras comprobación adicional de foco/contraste.
- Nuevas capturas ficticias artifacts/e1-6: vacío/formulario/ficha/listado/preview de cuota/capital y movimientos filtrados a390/1440. Inspeccionadas quota-preview-mobile, capital-desktop y debt-list-mobile: sin overflow, capital720 separado de banco/Gasto, alcance temporal claro. Mejoras justificadas: separación20px entre paneles heredada; definición alineada/valores tabulares; fecha civil legible dd/mm/aaaa. Se conservan diseño/tokens y jerarquía; no hay cinco cambios visuales necesarios.
- Contraste de tokens heredados: texto rgb(36,50,14) sobre rgb(141,187,46),6.04:1. Comprobación de colores/foco real añadida al run final; pendiente resultado.

## Fallos conservados y correcciones
- Primer suite en sandbox:77 PASS/13 FAIL; errores EPERM en pipes/procesos y expectativas antiguas de versión/columnas. Se ejecutó con permisos de entorno necesarios sin cambiar assertions temporales/concurrencia:87 PASS/3 FAIL, restantes rutas de copias v6→v7 desactualizadas. Corregidas expectativas estructurales/paths manteniendo comparación exacta de cada dato heredado.
- Primera revisión QA identificó cuatro defectos, corregidos como arriba; no se presentan como PASS del candidato inicial.
- E2E primer run: catálogoPASS, financieroFAIL por helper ruta Partida /nueva (ruta real /nuevo). Segundo: fallo helper botón Guardar (real Crear Partida). Ambos corregidos sin aumentar timeout ni cambiar contrato. Tercero financieroPASS. No son reintentos a ciegas.
- La ejecución de suites multiproceso/servidores requiere permisos de entorno `with_additional_permissions` (network.enabled=true); evita EPERM del sandbox, conserva los mismos comandos/aserciones.

Pendientes actuales: suite final sobre último código, revisión QA independiente de correcciones y CI por SHA. Los contratos AC31–33 siguen NO implementados y no se contabilizan como PASS.
