# Actas individuales de cierre de auditoría — 13 SPEC candidatas

Fecha: 2026-11-02. Base: `main` `d7b9077`. Estado: **preparadas para ratificación individual; 11 ratificables y 2 diferidas
(SPEC06, SPEC32); ninguna SPEC se declara cerrada**. Cada acta acredita **cierre documental de
auditoría**, no aceptación funcional, y conserva AC PARCIAL/UNRUN y dependencias.

## SPEC05 — Transferencias y Referencias

- **Evidencia:** #84/#90 integradas (`cf6954a`); D5 aprobada; nota de vigencia §D5.
- **AC PARCIAL/UNRUN:** según tracker; sin cierre funcional adicional.
- **Cierre documental:** procedente.
- **Pendiente:** ninguno funcional de E1.5; AC futuros conservan su estado.
- **Dependencias:** ninguna nueva.

## SPEC06 — Deuda mínima

- **Evidencia:** cabecera corregida #129; motor y pruebas de Deuda.
- **Cierre documental:** **diferido**: SPEC06 declara su auditoría técnica abierta (`06-...:8-9`) y M1 identifica el `capital` nulo en `deudas.ts` como caso a tratar en el read model E4.4.
- **AC PARCIAL/UNRUN:** según tracker; la auditoría técnica sigue abierta.
- **Dependencias:** E4.4 no cambia la fórmula Q1, pero puede añadir guarda de lectura; no cerrar E1.6 por este acta.

## SPEC07 — Operación de Ciclos

- **Evidencia:** opción B #128 (`2c97a66`); C07-F1/F2.
- **Cierre documental:** procedente.
- **Pendiente:** AC28/E3.5 fuera; notas de PR #49 históricas.
- **AC PARCIAL/UNRUN:** AC28 y dependientes E3.5 fuera; resto según tracker.
- **Dependencias:** E3.5 STOP.

## SPEC08 — Presupuestos

- **Evidencia:** nota #129; maestro y pruebas B1–B9.
- **Cierre documental:** procedente.
- **Pendiente:** aceptación formal; sin regresión conocida.
- **AC PARCIAL/UNRUN:** B1–B9 documentales; sin AC parciales propios identificados.
- **Dependencias:** ninguna nueva.

## SPEC10 — Plan anual

- **Evidencia:** nota #129; motor y pruebas anuales.
- **Cierre documental:** procedente.
- **Pendiente:** aceptación formal.
- **AC PARCIAL/UNRUN:** según tracker; sin AC parciales propios identificados.
- **Dependencias:** D′/SPEC33 conserva su ámbito.

## SPEC11 — Nómina

- **Evidencia:** N11-F1/F2/F3 reproducidos; H-SPEC11-01 aclarado como ambigüedad documentada.
- **Cierre documental:** procedente.
- **Pendiente:** sin reejecución; AC conservan estado.
- **AC PARCIAL/UNRUN:** N11 sin reejecución; IDs según tracker.
- **Dependencias:** ninguna nueva.

## SPEC12 — Flujo mensual

- **Evidencia:** sin hallazgo; límites de `ledgerRows()` delimitados.
- **Cierre documental:** procedente.
- **Pendiente:** AC parciales futuros.
- **AC PARCIAL/UNRUN:** AC-14/16/17/19/26/43/47 según tracker.
- **Dependencias:** E4.2 no altera S bruto.

## SPEC13 — Anticipos

- **Evidencia:** nota #129; rol/par probado; AC36 parcial aceptado.
- **Cierre documental:** procedente.
- **Pendiente:** nota de testplan histórica.
- **AC PARCIAL/UNRUN:** AC36 PARCIAL aceptado.
- **Dependencias:** ninguna nueva.

## SPEC14 — Compartidos

- **Evidencia:** nota #129; D5 probado; B-T11 futuro delimitado.
- **Cierre documental:** procedente.
- **Pendiente:** aceptación formal.
- **AC PARCIAL/UNRUN:** B-T11 futuro; resto según tracker.
- **Dependencias:** B-T11 no forma parte del cierre.

## SPEC15 — Vehículos

- **Evidencia:** nota #129; motor y pruebas; proveedor histórico no conectado declarado.
- **Cierre documental:** procedente.
- **Pendiente:** cobertura histórica limitada.
- **AC PARCIAL/UNRUN:** cobertura histórica parcial; IDs según tracker.
- **Dependencias:** ninguna nueva.

## SPEC19 — Instrumentos y Compras

- **Evidencia:** 6 AC PARCIAL aceptados (opción A); D7 integrada #154/#155.
- **Cierre documental:** procedente.
- **Pendiente:** AC-55 depende de DEV22 (ya integrado); no se promueve a PASS.
- **AC PARCIAL/UNRUN:** AC03/24/27/30/33/34 PARCIAL; AC-55 UNRUN hasta DEV22.
- **Dependencias:** ninguna nueva.

## SPEC31 — SQLite de producción

- **Evidencia:** contrato v18 #130; restore v19/v20 #148; AC técnicos acreditados.
- **Cierre documental:** procedente.
- **Pendiente:** fsync/WAL, VPS y custodia externa son gate operativo/DT6, no cierre funcional.
- **AC PARCIAL/UNRUN:** sin AC parciales propios; gates DT6/operativos fuera del cierre.
- **Dependencias:** DT6/T-BKP abierto.

## SPEC32 — Ejecución rootless

- **Evidencia:** #30 integrado (`306bbc5`); AC-18 PASS; AC-22 **PASS parcial** (API/build/rootless; E2E final UNRUN) en `87f9c5b`/run `40898403837`.
- **Cierre documental:** **diferido** hasta completar AC-22/E2E final y ejecución rootless real.
- **AC PARCIAL/UNRUN:** AC-22 PARCIAL; E2E final y rootless real UNRUN.
- **Pendiente:** Debian13/VPS son gate de despliegue; no acreditan el entorno productivo.
- **Dependencias:** entorno productivo y DT6 no validados.

## Ratificación del usuario — 2026-11-02

El usuario ratificó **individualmente** el cierre documental de auditoría de **SPEC05, 07,
08, 10, 11, 12, 13, 14, 15, 19 y 31**, conservando AC PARCIAL/UNRUN y dependencias.
**SPEC06 y SPEC32 permanecen diferidas.** Ningún AC se convierte en PASS y este acto no
autoriza DEV, migración, datos reales ni merge.

## Reglas de ratificación

- Ratificación **individual** por SPEC; no cierre masivo automático.
- No se convierte PARCIAL/UNRUN en PASS.
- Cierre documental ≠ aceptación funcional ni autorización de DEV/despliegue.
- Cualquier objeción a una SPEC se resuelve antes de registrar su cierre.
