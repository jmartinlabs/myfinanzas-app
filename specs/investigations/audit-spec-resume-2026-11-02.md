# Auditoría de especificaciones — reanudación y propuesta de cierre

Fecha: 2026-11-02. Autor: orquestador OpenCode. Estado: **diagnóstico y preparación; no
cierra ninguna SPEC ni autoriza DEV, merge, migración o datos reales**.
Base: `main` `8e4ef213dcca82eb83c7a949cdf1c1dea853b09d`.
Tracker histórico: [spec-audit-tracker.md](spec-audit-tracker.md).

## 1. Checkpoint actualizado

- El checkpoint del tracker (`main` `2c97a66`, 3 cerradas/22 abiertas) es histórico.
- Desde entonces se integraron, entre otros: SPEC32 (#30), contrato v18 (#130), Comida
  único (#133/#136), D′ (#135/#137/#152), rootless (#140), restore Linux (#148), E4.8
  (#150/#151), D7 (#154/#155) y FIN_NETA documental (#156).
- Se mantiene el balance **3 cerradas / 22 abiertas**; varias filas del tracker y del
  tablero estaban desactualizadas (SPEC26/32, D7, E4.8).
- Este documento no reclasifica AC ni convierte UNRUN/PARCIAL en PASS.

## 2. Estado propuesto de las 22 SPEC

Leyenda: **A** cierre formal justificable sin código · **B** validación/aceptación
pendiente · **C** corrección técnica menor · **D** dependencia de DEV futuro.

| SPEC | Estado | Evidencia principal | Acción |
| --- | --- | --- | --- |
| 04 Movimientos | B | H-SPEC04-02/03/04 integrados #125; CI critical PASS; E2E/full UNRUN | Ejecutar E2E/full y acta |
| 05 Transferencias | A | #84/#90 integradas; nota de vigencia pendiente en §D5 | Nota + acta |
| 06 Deuda | A | Cabecera corregida; motor y pruebas sin defecto | Nota progress + acta |
| 07 Ciclos | A | Opción B #128; progress/testplan con PR #49 histórico | Nota + acta |
| 08 Presupuestos | A | Nota #129; pruebas B1–B9 | Acta |
| 09 Plan del ciclo | B | Ambigüedad de cero con Fin temporal; decisión humana | Mantener semántica actual; acta con nota |
| 10 Plan anual | A | Nota #129; motor/pruebas | Acta |
| 11 Nómina | A | H-SPEC11-01 ambigüedad documentada; no bug | Acta con nota |
| 12 Flujo mensual | A | Sin hallazgo; límites de `ledgerRows()` delimitados | Acta |
| 13 Anticipos | A | Nota #129; AC36 parcial aceptado | Acta + nota testplan |
| 14 Compartidos | A | Nota #129; D5 probado; B-T11 futuro | Acta |
| 15 Vehículos | A | Nota #129; proveedor histórico no conectado = límite | Acta |
| 16 Revisión Comida | C | Registro único; AC-25/P3 abiertos; H-SPEC16-02 | Guarda de roles + test; datos reales aparte |
| 17 Deuda completa | B | Spec/wireframes no aprobados; tablero contradice | Propuesta de aprobación |
| 19 Instrumentos | A | 6 AC PARCIAL aceptados; D7 #154/#155 | Acta; no promover parciales |
| 20 Histórico precontrol | D | Documental; 59 AC UNRUN; DT7 | DEV futuro |
| 21 Pendientes/conciliación | D | Aprobada; AC UNRUN; E3.5 STOP | DEV futuro |
| 22 Ventas/bróker | D | Aprobada; D7 resuelta; PR #157 en QA E2E | Cauce DEV22 |
| 26 Precierre | C | E4.8 #150; H-SPEC26-02 | Refactor posiciones + regresión |
| 27 Cierre financiero | D | Aprobada; AC UNRUN; E3.5/DT6 | Gates antes de DEV |
| 31 SQLite producción | A | Contrato v18, restore v19/v20; riesgos operativos | Acta con gate operativo |
| 32 Rootless | B | #30 integrado; AC-18 PASS, AC-22 parcial | E2E final AC-22 |

**Recuento:** A 12 · B 4 · C 2 · D 4. **Cerrables sin código adicional:** 14 (12 A + 04 +
32); 16 si se resuelven las decisiones de 09 y 17.

## 3. Validación sin código (Lote 2)

Resultados se registran por SHA en la sección 7 de este documento. En esta fase:

- SPEC04: E2E de Movimientos y perfil full.
- SPEC32: AC-22 (suites, tipos/build y E2E finales) en el entorno disponible.
- Todo resultado no ejecutado queda **UNRUN/BLOCKED** con motivo; no se declara PASS.

## 4. Correcciones pendientes de revisión (Lote 3)

### H-SPEC26-02 — Precierre no usa el motor único

- **Causa:** `precierre.ts` consulta `operaciones_inversion` y agrupa posiciones por su
  cuenta, en lugar de reutilizar `positionsFor` con fecha.
- **Evidencia:** SPEC26 exige `positionsFor(..., fin)`; `positionsFor` no acepta fecha y
  `precierre.ts` duplica la consulta. AC-05 pasa con el fixture actual.
- **Propuesta:** parámetro opcional de fecha en `positionsFor` y reutilización desde
  `precierre`; regresión con Compras y Ventas al corte.
- **Archivos:** `apps/api/src/investment-engine.ts`, `apps/api/src/precierre.ts`,
  `apps/api/src/precierre.test.ts`.
- **Alcance:** corrección técnica de integración; **no cambia reglas financieras**. PR
  independiente y autorización expresa.

### H-SPEC16-02 — Rol ausente en métricas de Comida

- **Causa:** `comida.ts` incluye Transferencias sin rol y usa `roles.get(r.id)!`; el filtro
  `role.rol` podría lanzar `TypeError` y el aviso de “Transferencias sin función” queda
  inalcanzable.
- **Evidencia:** inspección estática; latente hasta activar el régimen (P3).
- **Propuesta:** comprobar ausencia antes de desreferenciar, marcar cobertura
  `Parcial`/`No disponible` con motivo y test de regresión.
- **Archivos:** `apps/api/src/comida.ts`, pruebas de Comida.
- **Alcance:** defensa y cobertura; **no cambia P6/P7**. PR independiente.

## 5. Actas de cierre preparadas (Lote 4) — no ratificadas

Cada acta distingue **cierre documental de auditoría** de **aceptación funcional**. No
convierten PARCIAL/UNRUN en PASS.

| SPEC | Evidencia para el acta | Pendiente/limitación |
| --- | --- | --- |
| 05 | #84/#90 integradas; contrato de referencias | Nota de vigencia §D5 |
| 06 | Motor de Deuda y pruebas; cabecera corregida | Progress histórico |
| 07 | Opción B #128; C07-F1/F2 | AC28/E3.5 fuera; notas históricas |
| 08 | B1–B9; nota #129 | Aceptación formal |
| 10 | Motor anual y pruebas | Aceptación formal |
| 11 | N11-F1/F2/F3; H-SPEC11-01 aclarado | Sin reejecución |
| 12 | Sin hallazgo; límites de ledger | AC parciales futuros |
| 13 | Anticipos rol/par; AC36 parcial aceptado | Nota testplan |
| 14 | D5; B-T11 futuro | Aceptación formal |
| 15 | Motor y pruebas; proveedor histórico no conectado | Límite declarado |
| 19 | 6 AC PARCIAL aceptados; D7 aprobada | AC-55 depende de DEV22 |
| 31 | Contrato v18; restore v19/v20 | Riesgos fsync/VPS/DT6 |

Estas 12 actas se presentan para **ratificación**; no se declaran cerradas.

## 6. Decisiones humanas

- **SPEC09:** mantener la semántica actual; no se cambia el cero con Fin temporal hasta
  resolver la ambigüedad. Se registra en el acta como limitación.
- **SPEC17:** propuesta definitiva: **aprobar la specification y wireframes vigentes sin
  cambios financieros**, o corregir el tablero que hoy los presenta como aprobados. Requiere
  revisión independiente y decisión del usuario; no se modifica la spec aquí.
- **SPEC20/21/22/27 y datos reales de SPEC16:** fuera de esta autorización; conservan sus
  gates.

## 7. Pruebas y evidence (Lote 2)

Base de ejecución: `main` `8e4ef21`, macOS arm64, Bun 1.4.3, Playwright 1.64.1.

| Comprobación | Resultado | Límite |
| --- | --- | --- |
| SPEC04 E2E (`tests/e2e/movimientos.spec.ts`) | **FAIL/BLOCKED** en el tramo final de restauración: el servidor de restore no responde en 3004 | El recorrido principal se ejecutó; el fallo es del entorno de restore, no se declara PASS |
| `scripts/verify --full` | **FAIL** de aplicación: 344 pass / 56 fail de entorno macOS; `e2e` UNRUN | No sustituye Linux/glibc; no se declara PASS |
| SPEC32 AC-22: typecheck/build | **PASS** | Solo estática/tipos/build |
| SPEC32 AC-22: E2E final y rootless | **UNRUN/BLOCKED** | No hay Docker/podman ni entorno rootless Linux local |

No se declara PASS de SPEC04 ni de AC-22; ambos quedan pendientes de entorno canónico o de
una ejecución E2E completa en Linux.
