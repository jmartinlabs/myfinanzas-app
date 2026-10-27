# 22 — E4.2 Ventas, posición y efectivo de bróker: Progress

Status: **PROPOSED rev3 — wireframes rev3 aprobados visualmente el 2026-10-28; SPEC22 sigue
candidata hasta el cierre documental y la coordinación D7/SPEC19 (E4.1 integrada). NO aprobada en
conjunto. DEV22 no iniciado.**
Task ID: `SPEC22-E4.2` — Ventas, posición y efectivo de bróker.
Session: `ses_e814117d4ffeq7ykfa65veXcxv` (OpenCode desktop, cliente externo iniciado/parado
por el usuario; sin workers controlados).
Fecha: 2026-10-28.

## Aprobación visual rev3 — 2026-10-28

- **Mensaje explícito del usuario:** «Apruebo la revisión visual rev3 de W2/W5 y W11–W16 de
  SPEC22, incluidos los estados y bloqueos D1/D2/D3.»
- **Alcance:** W2/W5, W11–W16, estados de vacío/carga/error/sesión, W15b de revisión obsoleta y
  bloqueos D1/D2/D3. La aprobación visual **no** autoriza DEV22, esquema, commits, push, PR ni
  merge.
- **Evidencia:** HTML rev3 (SHA-256 `d337644c…a664a4`), capturas rev3 y ZIP
  `specs/22-ventas-posicion-broker-captures/rev3/spec22-wireframes-rev3-review.zip`
  (SHA-256 `50153491…b3cd1f`); `overflow-report.json` 20/20 sin desbordamiento.
- **Pendiente:** cierre documental de SPEC22 y coordinación D7/SPEC19 (enmienda mínima de
  SPEC19); E4.1 ya está integrada en `156a50d`. No se inicia DEV22.

## Checkpoint documental — 2026-10-27

- **Alcance autorizado:** preparar SPEC22 (brainstorming, specification, wireframes, testplan y
  checkpoint) para E4.2. Por instrucción expresa del encargo: sin desarrollo, migraciones,
  pruebas funcionales, CI remoto, push, PR, merge, despliegue, infraestructura nueva, Excel ni
  datos reales.
- **Ownership:** solo documentos `specs/22-ventas-posicion-broker-*`. No se modifican SPEC19,
  SPEC20/DT7, SPEC21, INV-DT5, código, harness, workflows ni `specs/epic-board.md`.
- **Base y aislamiento:** los artefactos se prepararon en un worktree aislado sobre `064df64`, base
  histórica de E4.1 anterior a rev10. Para publicación se trasladan —solo documentos y
  wireframes— a la rama `codex/spec22-visual-rev3`, creada desde `main` `4edcfeb`; no se traslada
  código histórico ni se modifica E4.1. SPEC19 rev10 quedó integrada en `main` `156a50d`
  (registro original `3c271d3`).
- **Estado de E4.1:** contrato funcional rev7/rev8 aprobado; **SPEC19 rev10 y su testplan
  aprobados el 2026-10-27** e integrados en `main` `156a50d` (registro original `3c271d3`), con
  C16/C17 congelados y `schemaVersion = 18`; QA independiente PASS 48/6 y CI Linux 295 API /
  13 E2E. E4.2 no reserva versión de esquema.
- **Documentos creados:**
  - [brainstorming](22-ventas-posicion-broker-brainstorming.md)
  - [specification](22-ventas-posicion-broker-specification.md)
  - [testplan](22-ventas-posicion-broker-testplan.md)
  - [presentación visual de wireframes rev3](22-ventas-posicion-broker-wireframes.html)
  - [capturas rev3 y HTML para revisión externa](22-ventas-posicion-broker-captures/rev3/spec22-wireframes-rev3-review.zip)
  - este progress/checkpoint.

## Contenido y decisiones

- **Decisiones fijadas por fuentes:** Venta solo en el registro de inversión; EUR cobrado y
  cambio histórico; efectivo `apertura + entradas − salidas − Compras + Ventas`; cantidad
  `Compras − Ventas`; referencia temporal de tres fuentes; precisión DT2; rectificación y
  anulación de E4.1; valoración/resultado fuera de E4.2.
- **Decisiones confirmadas A (2026-10-27):** D1 cantidad insuficiente (422
  `INSUFFICIENT_UNITS`), D2 efectivo negativo en correcciones/anulaciones (422
  `INSUFFICIENT_CASH`), D3 Instrumento/Saldo inactivo, D4 pestaña Ventas, D5 posición a 0, D6
  operaciones anuladas fuera de la referencia y D7 Compra rectificada/anulada por debajo de la
  cantidad vendida (422 `INSUFFICIENT_UNITS`, coordinación/documentación previa de SPEC19).
- **Q0 resuelta:** SPEC19 rev10 y testplan aprobados el 2026-10-27 e integrados en `main`
  `156a50d` (registro original `3c271d3`, posterior a `27c8d07`); no se reabre ni se modifica
  SPEC19.
- **Trazabilidad:** 45 AC de diseño, con positivos, negativos, límites e integración; tabla
  roadmap E4.2-AC1/AC2/AC3 → AC → testplan.
- **Dependencias E4.3 identificadas, no especificadas:** cantidad/historial/importes, Estado
  Abierta/Cerrada, valoración manual/automática, resultado abierto/cerrado, agregados por Tipo
  saldo=Inversión, posible decisión de lotes/FIFO y cobertura parcial.

## Verificaciones documentales

| Comprobación | Comando / método | Estado |
| --- | --- | --- |
| Enlaces y estructura | `python3 scripts/validate-template` | **PASS** — «Template validation passed» (macOS, Python 3.9.6, base `main` `4edcfeb`, candidate sin commitear; wireframes y ZIP versionados) |
| Regresiones del validador | `python3.12 scripts/test-validator` | **PASS** — 26 tests OK |
| Whitespace/diff | `git diff --check` | **PASS** — exit 0 |
| Verificación canónica local | `python3.12 scripts/verify baseline` (cliente externo) | **PASS reportado** — baseline phase PASS; application phase no incluida; 15 tests de verificación OK. **No reejecutado en esta publicación**: el entorno local solo tiene Python 3.9.6 y el script exige 3.10+ (UNRUN, no FAIL) |
| Revisión independiente | Tres revisores en contexto separado, solo lectura | **PASS final** — primera CHANGES (19), segunda CHANGES (2 mayores + 7 menores), tercera **PASS** (6 menores editoriales); correcciones aplicadas. Rev2 confirma A las recomendaciones ya revisadas y añade la presentación visual; no cambia reglas materiales |
| Presentación visual W11–W16/W2/W5 | `browser.preview` del HTML estático rev3 | **APROBADA** — aprobación visual rev3 del 2026-10-28; incluye ficha móvil en tarjetas, estados, W15b, D1/D2/D3 |
| Aprobación visual rev3 | Mensaje explícito del usuario, 2026-10-28 | **PASS** — «Apruebo la revisión visual rev3 de W2/W5 y W11–W16 de SPEC22, incluidos los estados y bloqueos D1/D2/D3.» No autoriza DEV22, esquema, commits, push, PR ni merge |
| Capturas de revisión rev3 | Playwright 1.64.1, Chromium 1248, 1440/390, base histórica `064df64` | **GENERADAS Y EMPAQUETADAS** — 20 capturas (sección y estados/bloqueos) + 2 de página completa; `overflow-report.json` con 20/20 `horizontalOverflow=false`; ZIP versionado `specs/22-ventas-posicion-broker-captures/rev3/spec22-wireframes-rev3-review.zip` (SHA-256 `50153491…b3cd1f`) |
| Revisión independiente focalizada rev3 | Revisor en contexto separado, solo lectura | **PASS final** — 3 hallazgos (regresión de wrapping en W11, paridad W11/W12, acción del error) corregidos; ZIP regenerado con el HTML/capturas actuales |

No se declara PASS sin comando, entorno, candidato y evidencia. No hay pruebas funcionales,
CI remoto ni verificación de implementación en esta ronda.

## Dependencias, riesgos y bloqueos

- **Aprobación SPEC19 rev10:** resuelta el 2026-10-27 e integrada en `main` `156a50d` (registro
  original `3c271d3`, posterior a `27c8d07`); C16/C17 congelados y `schemaVersion = 18`. No se
  modifica SPEC19 ni se reabre la aprobación.
- **E4.1 integrada:** `156a50d` en `main`, v18, con QA PASS y CI Linux verde. Los AC de esquema,
  backup, motor único y guard de Saldo de E4.2 siguen UNRUN por ausencia de implementación E4.2,
  no por la dependencia.
- **D7 / SPEC19:** E4.1 rev10 no define un guard de cantidad vendida porque Ventas queda fuera de
  su alcance. D7 exige una enmienda mínima y explícita de SPEC19: rechazar con 422
  `INSUFFICIENT_UNITS` toda rectificación o anulación de Compra que deje la cantidad vigente por
  debajo de la vendida, sin escritura y con fecha/cantidad del mínimo. La enmienda requiere
  aprobación separada y no se aplica en esta ronda.
- **Versión de esquema:** E4.2 no reserva ninguna; la ampliación de `clase` a `Venta` se resolverá
  en DEV conforme al gate de esquema vigente (v18). Si se elige una migración, deberá preservar
  filas, auditoría, identidad y datos ajenos.
- **Decisiones financieras:** D1/D2/D7 están confirmadas A; las alternativas B quedan
  descartadas. Cualquier cambio posterior exige nueva decisión y revisión de specification,
  códigos, AC y testplan.
- **Revisión Comida:** la fuente de la tercera fecha pertenece a E3.4; E3.5 consume la
  agregación por ciclo. E4.2 consume su contrato y no reimplementa su motor. La prueba de tres
  fuentes no acredita integración de E3.4/E3.5.
- **Sin bloqueo de acceso:** no hay conflicto de ownership detectado en `specs/22-*`; no se ha
  contactado ni reanudado otra sesión.

## Próxima acción segura

1. Publicar la rama documental con la aprobación visual registrada; su merge requiere aprobación
   expresa.
2. Presentar la specification completa para aprobación explícita del usuario; la aprobación
   visual no aprueba la spec.
3. Preparar la enmienda mínima de SPEC19 para D7 como propuesta separada; no modificar SPEC19 en
   esta ronda.
4. No iniciar DEV22 ni reservar versión sin autorización de desarrollo separada.
