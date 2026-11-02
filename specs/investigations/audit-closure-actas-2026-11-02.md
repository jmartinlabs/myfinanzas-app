# Actas individuales de cierre de auditoría — 22 SPEC candidatas

Fecha: 2026-11-02. Base: `main` `8b551c5`. Estado: **11 ratificadas individualmente por el
usuario el 2026-11-02, 9 propuestas pendientes de ratificación y 2 diferidas (SPEC06,
SPEC32); 0 SPEC declaradas cerradas**. Cada acta acredita **cierre documental de auditoría**,
no aceptación funcional, y conserva AC PARCIAL/UNRUN y dependencias. «0 cerradas» se refiere
a estas 22 actas de auditoría; no altera el balance funcional global del tracker (3 cerradas /
22 abiertas) ni convierte AC en PASS. Acta global:
[audit-closure-global-2026-11-02](audit-closure-global-2026-11-02.md).

## SPEC04 — Movimientos

- **Evidencia:** 29 AC PASS en `b51b89b`; H-SPEC04-02/03/04 integrados por PR #125
  (`e3ebd76`). El E2E de Movimientos pasó en la suite full Linux `766ea6b`, sobre código
  idéntico pero **no candidato propio de SPEC04**.
- **AC PARCIAL/UNRUN:** AC-30–33 son contratos futuros; el E2E propio y el full sobre
  candidato propio siguen **UNRUN**.
- **Cierre documental: propuesto.**
- **Pendiente:** E2E/full sobre candidato propio; `766ea6b` no se cita como PASS de cierre
  de SPEC04 ni como evidencia de AC-22.
- **Dependencias:** ninguna nueva; DEV22 ya integrado en #157.

## SPEC05 — Transferencias y Referencias

- **Evidencia:** #84/#90 integradas (`cf6954a`); D5 aprobada; nota de vigencia §D5.
- **AC PARCIAL/UNRUN:** según tracker; sin cierre funcional adicional.
- **Cierre documental:** procedente (ratificado 2026-11-02).
- **Pendiente:** ninguno funcional de E1.5; AC futuros conservan su estado.
- **Dependencias:** ninguna nueva.

## SPEC06 — Deuda mínima

- **Evidencia:** cabecera corregida #129; motor y pruebas de Deuda.
- **Cierre documental:** **diferido**: SPEC06 declara su auditoría técnica abierta
  (`06-...:8-9`) y M1 identifica el `capital` nulo en `deudas.ts` como caso a tratar en el
  read model E4.4.
- **AC PARCIAL/UNRUN:** según tracker; la auditoría técnica sigue abierta.
- **Dependencias:** E4.4 no cambia la fórmula Q1, pero puede añadir guarda de lectura; no
  cerrar E1.6 por este acta.

## SPEC07 — Operación de Ciclos

- **Evidencia:** opción B #128 (`2c97a66`); C07-F1/F2.
- **Cierre documental:** procedente (ratificado 2026-11-02).
- **Pendiente:** AC28/E3.5 fuera; notas de PR #49 históricas.
- **AC PARCIAL/UNRUN:** AC28 y dependientes E3.5 fuera; resto según tracker.
- **Dependencias:** E3.5 STOP.

## SPEC08 — Presupuestos

- **Evidencia:** nota #129; maestro y pruebas B1–B9.
- **Cierre documental:** procedente (ratificado 2026-11-02).
- **Pendiente:** aceptación formal; sin regresión conocida.
- **AC PARCIAL/UNRUN:** B1–B9 documentales; sin AC parciales propios identificados.
- **Dependencias:** ninguna nueva.

## SPEC09 — Plan del ciclo

- **Evidencia:** PR #57 `7422d23` integrada; H-SPEC09-01 documentado como ambigüedad
  funcional —el cero con Fin temporal es conforme a P12/AC-17— y no como defecto técnico.
- **AC PARCIAL/UNRUN:** según tracker; no se declara ningún PASS nuevo.
- **Cierre documental: propuesto.**
- **Pendiente:** decisión humana solo si se quiere otra semántica del cero; no se cambia el
  motor por inferencia.
- **Dependencias:** ninguna nueva.

## SPEC10 — Plan anual

- **Evidencia:** nota #129; motor y pruebas anuales.
- **Cierre documental:** procedente (ratificado 2026-11-02).
- **Pendiente:** aceptación formal.
- **AC PARCIAL/UNRUN:** según tracker; sin AC parciales propios identificados.
- **Dependencias:** D′/SPEC33 conserva su ámbito.

## SPEC11 — Nómina

- **Evidencia:** N11-F1/F2/F3 reproducidos; H-SPEC11-01 aclarado como ambigüedad documentada.
- **Cierre documental:** procedente (ratificado 2026-11-02).
- **Pendiente:** sin reejecución; AC conservan estado.
- **AC PARCIAL/UNRUN:** N11 sin reejecución; IDs según tracker.
- **Dependencias:** ninguna nueva.

## SPEC12 — Flujo mensual

- **Evidencia:** sin hallazgo; límites de `ledgerRows()` delimitados.
- **Cierre documental:** procedente (ratificado 2026-11-02).
- **Pendiente:** AC parciales futuros.
- **AC PARCIAL/UNRUN:** AC-14/16/17/19/26/43/47 según tracker.
- **Dependencias:** E4.2 no altera S bruto.

## SPEC13 — Anticipos

- **Evidencia:** nota #129; rol/par probado; AC36 parcial aceptado.
- **Cierre documental:** procedente (ratificado 2026-11-02).
- **Pendiente:** nota de testplan histórica.
- **AC PARCIAL/UNRUN:** AC36 PARCIAL aceptado.
- **Dependencias:** ninguna nueva.

## SPEC14 — Compartidos

- **Evidencia:** nota #129; D5 probado; B-T11 futuro delimitado.
- **Cierre documental:** procedente (ratificado 2026-11-02).
- **Pendiente:** aceptación formal.
- **AC PARCIAL/UNRUN:** B-T11 futuro; resto según tracker.
- **Dependencias:** B-T11 no forma parte del cierre.

## SPEC15 — Vehículos

- **Evidencia:** nota #129; motor y pruebas; proveedor histórico no conectado declarado.
- **Cierre documental:** procedente (ratificado 2026-11-02).
- **Pendiente:** cobertura histórica limitada.
- **AC PARCIAL/UNRUN:** cobertura histórica parcial; IDs según tracker.
- **Dependencias:** ninguna nueva.

## SPEC16 — Revisión Comida

- **Evidencia:** #82 `26b6f0c`, #136 `7f3a66c` y #160 `30a832c` (H-SPEC16-02, guarda ante
  Transferencias sin rol; run `41455159383` API PASS). La aprobación documental de
  specification/wireframes rev3 está registrada el 2026-10-31 en
  [§Registro de aprobación integral](../16-revision-comida-specification.md#registro-de-aprobación-integral-y-coordinación--2026-10-31).
- **AC PARCIAL/UNRUN:** AC-25 sigue abierto; P3 (fecha/saldo/cobertura reales) no tiene
  evidencia real. No se declara equivalencia con v5.11(7).
- **Cierre documental: propuesto.**
- **Pendiente:** AC-25/P3 dependen de fuente real; los datos reales requieren autorización
  específica y siguen fuera de este acta.
- **Dependencias:** fuente real y gate operativo P3; E3.5/FIN_NETA conserva su ámbito.

## SPEC17 — Deuda completa

- **Evidencia:** M1/M2/m8 aprobados por el usuario y aplicados en #163 (`8b551c5`); D1–D7
  confirmadas. La specification y los wireframes **NO están aprobados**.
- **AC PARCIAL/UNRUN:** ningún AC ejecutado; todos **UNRUN** por ausencia de DEV17.
- **Cierre documental: propuesto.**
- **Pendiente:** aprobación de specification/wireframes; DEV17 no autorizado.
- **Dependencias:** E4.1/E4.4; la autorización de M1/M2/m8 no autoriza DEV.

## SPEC19 — Instrumentos y Compras

- **Evidencia:** 6 AC PARCIAL aceptados (opción A); D7 integrada #154/#155.
- **Cierre documental:** procedente (ratificado 2026-11-02).
- **Pendiente:** AC-55 depende de DEV22 (ya integrado); no se promueve a PASS.
- **AC PARCIAL/UNRUN:** AC03/24/27/30/33/34 PARCIAL; AC-55 conserva su estado.
- **Dependencias:** ninguna nueva.

## SPEC20 — Histórico precontrol

- **Evidencia:** PR #87 documental MERGED `3d70fd6`; specification y testplan aprobados por
  el usuario el 2026-10-28.
- **AC PARCIAL/UNRUN:** 59 AC **UNRUN**; el QA documental de AC48–59 es opcional y no se ha
  ejecutado.
- **Cierre documental: propuesto.**
- **Pendiente:** DEV20 no autorizado; DT7 sigue siendo gate independiente.
- **Dependencias:** DT7.

## SPEC21 — Pendientes y conciliación

- **Evidencia:** PR #97 documental MERGED `2364d9c`; specification y testplan aprobados.
- **AC PARCIAL/UNRUN:** 31 AC **UNRUN**.
- **Cierre documental: propuesto.**
- **Pendiente:** DEV21 no autorizado; E3.5/FIN_NETA no operativa.
- **Dependencias:** E3.5 y E4.

## SPEC22 — Ventas y posición de bróker

- **Evidencia:** #157 MERGED `fd2e21c`; 45 AC PASS; full Linux `766ea6b` con run
  `41435723276` y `494f59f` con run `41434662965`; QA APTO.
- **AC PARCIAL/UNRUN:** sin AC propios pendientes de PASS según la evidencia citada; el acta
  no promueve ningún AC adicional ni declara cierre funcional.
- **Cierre documental: propuesto.**
- **Pendiente:** ninguno funcional propio de DEV22; no reabrir.
- **Dependencias:** sin DEV18/E3.5.

## SPEC26 — Precierre

- **Evidencia:** E4.8 #150 `e608bbb` y #161 `0c8d2fc` (H-SPEC26-02, posiciones a fecha de
  corte desde el motor único); run `41456569310`. Resultado: 13 AC PASS, AC-04 parcial,
  AC-11 en revisión y AC-16 de contrato.
- **AC PARCIAL/UNRUN:** AC-04 PARCIAL; AC-11 en revisión; AC-16 documental; resto según
  tracker. No se convierten en PASS.
- **Cierre documental: propuesto.**
- **Pendiente:** revisión de AC-11; AC-04 conserva PARCIAL.
- **Dependencias:** E4.9/SPEC27 y DT6.

## SPEC27 — Cierre financiero

- **Evidencia:** specification y testplan aprobados; #161 ya provee `positionsAtDate`, base
  técnica para posiciones a fecha Fin.
- **AC PARCIAL/UNRUN:** todos los AC **UNRUN**; no hay implementación.
- **Cierre documental: propuesto.**
- **Pendiente:** DEV27 no autorizado; gates E3.5/FIN_NETA y DT6/T-BKP.
- **Dependencias:** E3.5, DT6 y SPEC26.

## SPEC31 — SQLite de producción

- **Evidencia:** contrato v18 #130; restore v19/v20 #148; AC técnicos acreditados.
- **Cierre documental:** procedente (ratificado 2026-11-02).
- **Pendiente:** fsync/WAL, VPS y custodia externa son gate operativo/DT6, no cierre
  funcional.
- **AC PARCIAL/UNRUN:** sin AC parciales propios; gates DT6/operativos fuera del cierre.
- **Dependencias:** DT6/T-BKP abierto.

## SPEC32 — Ejecución rootless

- **Evidencia:** #30 integrado (`306bbc5`); AC-18 PASS; AC-22 **PASS parcial**
  (API/build/rootless; E2E final UNRUN) en `87f9c5b`/run `40898403837`.
- **Cierre documental:** **diferido** hasta completar AC-22/E2E final y ejecución rootless
  real.
- **AC PARCIAL/UNRUN:** AC-22 PASS parcial (acotado); E2E final y rootless real UNRUN.
- **Pendiente:** Debian13/VPS son gate de despliegue; no acreditan el entorno productivo.
- **Dependencias:** entorno productivo y DT6 no validados.

## Ratificación del usuario — 2026-11-02

El usuario ratificó **individualmente**, en decisión identificable del **2026-11-02**, el
cierre documental de auditoría de **SPEC05, 07, 08, 10, 11, 12, 13, 14, 15, 19 y 31**,
conservando AC PARCIAL/UNRUN y dependencias.

Quedan **9 actas propuestas, pendientes de ratificación individual**: SPEC04, 09, 16, 17,
20, 21, 22, 26 y 27. **SPEC06 y SPEC32 permanecen diferidas.** Ningún AC se convierte en
PASS y este acto no autoriza DEV, migración, datos reales ni merge. Es cierre documental de
auditoría: no cambia el balance global (3 cerradas / 22 abiertas) ni el estado funcional del
[tablero](../epic-board.md).

## Reglas de ratificación

- Ratificación **individual** por SPEC; no cierre masivo automático.
- No se convierte PARCIAL/UNRUN en PASS.
- Cierre documental ≠ aceptación funcional ni autorización de DEV/despliegue.
- Cualquier objeción a una SPEC se resuelve antes de registrar su cierre.
