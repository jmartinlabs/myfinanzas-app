# Auditoría de especificaciones — reanudación y propuesta de cierre

Fecha: 2026-11-02. Autor: orquestador OpenCode. Estado: **cierre global propuesto; 11 actas
ratificadas, 9 propuestas y 2 diferidas; no cierra ninguna SPEC funcionalmente ni autoriza
DEV, merge, migración o datos reales**.
Base auditada: `main` `8b551c5`. Merges considerados: #160 `30a832c`, #161 `0c8d2fc`,
#162 `5a2a32b` y #163 `8b551c5` (además de #157 `fd2e21c` y #159 `d7b9077`).
Tracker histórico: [spec-audit-tracker.md](spec-audit-tracker.md). Acta global propuesta:
[audit-closure-global-2026-11-02.md](audit-closure-global-2026-11-02.md).

## 1. Checkpoint actualizado

- El checkpoint del tracker (`main` `2c97a66`, 3 cerradas/22 abiertas) es histórico.
- Desde entonces se integraron, entre otros: SPEC32 (#30), contrato v18 (#130), Comida
  único (#133/#136), D′ (#135/#137/#152), rootless (#140), restore Linux (#148), E4.8
  (#150/#151), D7 (#154/#155), FIN_NETA documental (#156) y DEV22 (#157).
- Se mantiene el balance **3 cerradas / 22 abiertas**; varias filas del tracker y del
  tablero estaban desactualizadas (SPEC16/17/22/26/32, D7, E4.8).
- Estado de auditoría: **23/25 cerradas en propuesta** (3 previas + 11 ratificadas + 9
  propuestas) y **2 diferidas** (SPEC06, SPEC32). **0 nuevos cierres funcionales.**
- Este documento no reclasifica AC ni convierte UNRUN/PARCIAL en PASS.

## 2. Estado propuesto de las 22 SPEC (propuesta sujeta a ratificación)

Leyenda: **A** cierre formal justificable sin código · **B** validación/aceptación
pendiente · **C** corrección técnica menor · **D** dependencia de DEV futuro.

| SPEC | Estado | Evidencia principal | Acción |
| --- | --- | --- | --- |
| 04 Movimientos | B | 29 AC PASS en `b51b89b`; fixes #125 `e3ebd76`; E2E de Movimientos PASS en full Linux `766ea6b` (código idéntico, no candidato propio) | E2E/full sobre candidato propio; acta propuesta |
| 05 Transferencias | A | #84/#90 integradas; nota de vigencia §D5 | Acta ratificada |
| 06 Deuda | B | Cabecera corregida; **auditoría técnica abierta** (`06-...:8-9`); M1/E4.4 como reserva | Cierre diferido; no cerrar E1.6 |
| 07 Ciclos | A | Opción B #128; progress/testplan con PR #49 histórico | Acta ratificada |
| 08 Presupuestos | A | Nota #129; pruebas B1–B9 | Acta ratificada |
| 09 Plan del ciclo | B | PR #57 `7422d23`; ambigüedad del cero con Fin temporal documentada | Mantener semántica; acta propuesta |
| 10 Plan anual | A | Nota #129; motor/pruebas | Acta ratificada |
| 11 Nómina | A | H-SPEC11-01 ambigüedad documentada; no bug | Acta ratificada |
| 12 Flujo mensual | A | Sin hallazgo; límites de `ledgerRows()` delimitados | Acta ratificada |
| 13 Anticipos | A | Nota #129; AC36 parcial aceptado | Acta ratificada |
| 14 Compartidos | A | Nota #129; D5 probado; B-T11 futuro | Acta ratificada |
| 15 Vehículos | A | Nota #129; proveedor histórico no conectado = límite | Acta ratificada |
| 16 Revisión Comida | B | #82/#136/#160; H-SPEC16-02 integrado (run `41455159383`); AC-25/P3 abiertos | Acta propuesta; datos reales aparte |
| 17 Deuda completa | B | M1/M2/m8 aplicados #163; spec/wireframes NO aprobados; ningún AC ejecutado | Acta propuesta; no aprobar spec |
| 19 Instrumentos | A | 6 AC PARCIAL aceptados; D7 #154/#155 | Acta ratificada; no promover parciales |
| 20 Histórico precontrol | D | PR87 `3d70fd6`; 59 AC UNRUN; DT7 | DEV futuro; acta propuesta |
| 21 Pendientes/conciliación | D | PR97 `2364d9c`; 31 AC UNRUN; E3.5 STOP | DEV futuro; acta propuesta |
| 22 Ventas/bróker | A | #157 MERGED `fd2e21c`; 45 AC PASS; full `766ea6b` (`41435723276`) y `494f59f` (`41434662965`) | Acta propuesta; sin cierre funcional |
| 26 Precierre | A | E4.8 #150 + #161; run `41456569310`; 13 AC PASS, AC-04 parcial | Acta propuesta; AC-11 en revisión |
| 27 Cierre financiero | D | Aprobada; AC UNRUN; #161 provee `positionsAtDate` | Gates E3.5/DT6; acta propuesta |
| 31 SQLite producción | A | Contrato v18, restore v19/v20; riesgos operativos | Acta ratificada; gate operativo |
| 32 Rootless | B | #30 integrado; AC-18 PASS; AC-22 PARCIAL en `87f9c5b`/`40898403837`; E2E final UNRUN | Cierre diferido; no reutilizar `766ea6b` |

**Recuento de esta propuesta:** **A 13 · B 6 · C 0 · D 3** (22 filas). El recuento cuadra
con la tabla y **no altera** el estado de auditoría ya fijado (23/25 cerradas propuestas y
2 diferidas) ni el balance funcional (3 cerradas / 22 abiertas). Ninguna fila declara una
SPEC funcionalmente cerrada.

## 3. Validación sin código (Lote 2)

- SPEC04: E2E de Movimientos y perfil full; el E2E propio sigue **UNRUN**. `766ea6b`
  pertenece a E4.2 y no se reutiliza como PASS de cierre.
- SPEC32: AC-22 (suites, tipos/build y E2E finales) en el entorno disponible; el E2E final
  sigue **UNRUN**.
- Todo resultado no ejecutado queda **UNRUN/BLOCKED** con motivo; no se declara PASS.

## 4. Correcciones integradas (Lote 3)

### H-SPEC16-02 — Rol ausente en métricas de Comida

- **Causa:** `comida.ts` incluía Transferencias sin rol y usaba `roles.get(r.id)!`.
- **Corrección:** guarda ante ausencia antes de desreferenciar, cobertura
  `Parcial`/`No disponible` con motivo y test de regresión.
- **Integración:** #160 `30a832c`; run `41455159383` API PASS.
- **Alcance:** defensa y cobertura; **no cambia P6/P7**.

### H-SPEC26-02 — Precierre no usaba el motor único

- **Causa:** `precierre.ts` consultaba `operaciones_inversion` y agrupaba posiciones por su
  cuenta, en lugar de reutilizar el motor con fecha.
- **Corrección:** `positionsFor` acepta `cutoff`
  (`apps/api/src/investment-engine.ts:591-596`) y `precierre.ts:296` consume
  `positionsAtDate(db, end)` desde el motor único.
- **Integración:** #161 `0c8d2fc`; run `41456569310`. Resultado: 13 AC PASS, AC-04 parcial,
  AC-11 en revisión y AC-16 de contrato.
- **Alcance:** no crea una segunda lógica de posiciones ni una foto; conserva las regresiones
  de fechas, Compras y Ventas.

## 5. Actas de cierre (Lote 4)

Cada acta distingue **cierre documental de auditoría** de **aceptación funcional**. No
convierten PARCIAL/UNRUN en PASS. Hay **22 actas**: 11 ratificadas, 9 propuestas y 2
diferidas.

| SPEC | Evidencia para el acta | Pendiente/limitación |
| --- | --- | --- |
| 04 | 29 AC PASS `b51b89b`; fixes #125 | E2E propio UNRUN; `766ea6b` no es candidato propio |
| 05 | #84/#90 integradas; contrato de referencias | Nota de vigencia §D5 |
| 06 | Motor de Deuda y pruebas; cabecera corregida | **Auditoría técnica abierta; M1; cierre diferido** |
| 07 | Opción B #128; C07-F1/F2 | AC28/E3.5 fuera; notas históricas |
| 08 | B1–B9; nota #129 | Aceptación formal |
| 09 | PR #57 `7422d23` | Ambigüedad del cero documentada |
| 10 | Motor anual y pruebas | Aceptación formal |
| 11 | N11-F1/F2/F3; H-SPEC11-01 aclarado | Sin reejecución |
| 12 | Sin hallazgo; límites de ledger | AC parciales futuros |
| 13 | Anticipos rol/par; AC36 parcial aceptado | Nota testplan |
| 14 | D5; B-T11 futuro | Aceptación formal |
| 15 | Motor y pruebas; proveedor histórico no conectado | Límite declarado |
| 16 | #82/#136/#160; H-SPEC16-02 | AC-25/P3 dependen de fuente real |
| 17 | M1/M2/m8 #163 | Spec/wireframes NO aprobados; 0 AC |
| 19 | 6 AC PARCIAL aceptados; D7 aprobada | AC-55 conserva estado |
| 20 | PR87 `3d70fd6` | 59 AC UNRUN; QA AC48–59 opcional |
| 21 | PR97 `2364d9c` | 31 AC UNRUN |
| 22 | #157 `fd2e21c`; 45 AC PASS | Sin cierre funcional por el acta |
| 26 | E4.8 #150/#161; 13 AC PASS | AC-04 parcial; AC-11 revisión |
| 27 | Spec/testplan; `positionsAtDate` #161 | Todos los AC UNRUN |
| 31 | Contrato v18; restore v19/v20 | Riesgos fsync/VPS/DT6 |
| 32 | #30; AC-22 PARCIAL `87f9c5b`/`40898403837` | **E2E final UNRUN; rootless real pendiente** |

Estas actas se presentan para **ratificación individual**; SPEC06 y SPEC32 quedan diferidas
y no se declaran cerradas.

### 5.1 Actas individuales

Cada acta acredita **auditoría documental**; no sustituye aceptación funcional ni convierte
PARCIAL/UNRUN en PASS. Acta global: [audit-closure-global-2026-11-02](audit-closure-global-2026-11-02.md).

- **SPEC04:** 29 AC PASS `b51b89b`; fixes #125. Límite: E2E propio UNRUN; `766ea6b` no es candidato propio. **Cierre documental: propuesto.**
- **SPEC05:** D5 aprobada e integrada; revisión de referencias y exterior cerrada. Límite: nota histórica §D5. **Ratificada.**
- **SPEC06:** motor de Deuda y pruebas; cabecera corregida. **Límite: auditoría técnica abierta y M1; cierre diferido.**
- **SPEC07:** opción B integrada #128; C07-F1/F2. Límite: AC28/E3.5 fuera; notas de PR #49 históricas. **Ratificada.**
- **SPEC08:** maestro y pruebas B1–B9; nota #129. Límite: aceptación formal. **Ratificada.**
- **SPEC09:** PR #57 `7422d23`; ambigüedad del cero documentada. Límite: decisión humana solo si se cambia la semántica. **Cierre documental: propuesto.**
- **SPEC10:** motor anual y pruebas. Límite: aceptación formal. **Ratificada.**
- **SPEC11:** N11-F1/F2/F3 y H-SPEC11-01 aclarado. Límite: sin reejecución. **Ratificada.**
- **SPEC12:** sin hallazgo; límites de `ledgerRows()` delimitados. Límite: AC parciales futuros. **Ratificada.**
- **SPEC13:** Anticipos rol/par y AC36 parcial aceptado. Límite: nota de testplan. **Ratificada.**
- **SPEC14:** D5 y B-T11 futuro delimitado. Límite: aceptación formal. **Ratificada.**
- **SPEC15:** motor y pruebas; proveedor histórico no conectado. Límite: cobertura declarada. **Ratificada.**
- **SPEC16:** #82/#136/#160; H-SPEC16-02 integrado. Límite: AC-25/P3 dependen de fuente real; datos reales no autorizados. **Cierre documental: propuesto.**
- **SPEC17:** M1/M2/m8 aplicados #163. Límite: spec/wireframes NO aprobados; 0 AC ejecutados; DEV17 no autorizado. **Cierre documental: propuesto.**
- **SPEC19:** 6 AC PARCIAL aceptados; D7 integrada #154/#155; AC-55 conserva estado. Límite: no promover parciales. **Ratificada.**
- **SPEC20:** PR87 MERGED `3d70fd6`; 59 AC UNRUN. Límite: DEV20 no autorizado; DT7. **Cierre documental: propuesto.**
- **SPEC21:** PR97 MERGED `2364d9c`; 31 AC UNRUN. Límite: DEV21 no autorizado; E3.5. **Cierre documental: propuesto.**
- **SPEC22:** #157 MERGED `fd2e21c`; 45 AC PASS; full `766ea6b` (`41435723276`) y `494f59f` (`41434662965`). Límite: el acta no declara cierre funcional ni promueve AC adicionales. **Cierre documental: propuesto.**
- **SPEC26:** #150 `e608bbb` + #161 `0c8d2fc`; run `41456569310`; 13 AC PASS. Límite: AC-04 parcial; AC-11 en revisión; AC-16 contrato. **Cierre documental: propuesto.**
- **SPEC27:** spec/testplan aprobados; #161 provee `positionsAtDate`; todos los AC UNRUN. Límite: DEV27 no autorizado; E3.5/DT6. **Cierre documental: propuesto.**
- **SPEC31:** contrato v18 y restore v19/v20. Límite: fsync/VPS/DT6 son gate operativo. **Ratificada.**
- **SPEC32:** #30 integrado (`306bbc5`); AC-18 PASS; AC-22 **PARCIAL** (API/build/rootless; E2E final **UNRUN**) en `87f9c5b`/run `40898403837`. **Límite: cierre diferido hasta completar E2E/rootless real.**

## 6. Decisiones humanas

- **SPEC09:** mantener la semántica actual; no se cambia el cero con Fin temporal hasta
  resolver la ambigüedad. Se registra en el acta como limitación.
- **SPEC17:** M1/M2/m8 aprobados y aplicados; la specification y los wireframes siguen sin
  aprobación. El tablero debe mostrar «spec/wireframes en revisión»; no se propone DEV17.
- **SPEC16:** la aprobación documental de spec/wireframes rev3 del 2026-10-31 ya está
  registrada; no se reabre. AC-25/P3 y los datos reales conservan su gate.
- **SPEC06/SPEC32:** permanecen diferidas; no se cierran por este lote.
- **SPEC20/21/22/27:** DEV solo donde ya está integrado (22); el resto conserva sus gates.

## 7. Pruebas y evidence (Lote 2)

Base de ejecución: `main` `8b551c5`, macOS arm64, Bun 1.4.3, Playwright 1.64.1.

| Comprobación | Resultado | Límite |
| --- | --- | --- |
| SPEC04 AC | **29 PASS en `b51b89b`** | El E2E propio sigue UNRUN; `766ea6b` no es candidato propio |
| SPEC04 E2E (suite full Linux `766ea6b`) | **PASS en E4.2** | Código idéntico, pero no candidato propio de SPEC04; no se reutiliza como PASS de cierre |
| SPEC22 full Linux `766ea6b` | **PASS**, run `41435723276`; 45 AC PASS | `494f59f` run `41434662965` como evidencia adicional |
| SPEC26 E4.8 + #161 | **13 AC PASS**, run `41456569310` | AC-04 parcial, AC-11 revisión, AC-16 contrato |
| SPEC16 #160 | **API PASS**, run `41455159383` | AC-25/P3 dependen de fuente real |
| `scripts/verify --full` | **PASS en `766ea6b`**: API 432/0, E2E 17/17, restore v19/v20 | Debian13 local no ejecutado; no es candidato propio de SPEC04 |
| SPEC32 AC-22: typecheck/build | **PASS** | Estática/tipos/build |
| SPEC32 AC-22: E2E final | **UNRUN en candidato propio**; `766ea6b` pertenece a E4.2 y no se reutiliza | `87f9c5b`: AC-22 PARCIAL (API/build/rootless); E2E final pendiente |

El E2E de Movimientos se ejecutó en la suite full Linux de E4.2 (`766ea6b`), pero no es
candidato propio de SPEC04. AC-22 de SPEC32 sigue parcial (API/build/rootless) con E2E final
**UNRUN** en `87f9c5b`/`40898403837`. Rootless real y Debian13 local no se declaran PASS.
