# Actas individuales de cierre de auditoría — 13 SPEC candidatas

Fecha: 2026-11-02. Base: `main` `d7b9077`. Estado: **preparadas para ratificación
individual; ninguna SPEC se declara cerrada**. Cada acta acredita **cierre documental de
auditoría**, no aceptación funcional, y conserva AC PARCIAL/UNRUN y dependencias.

## SPEC05 — Transferencias y Referencias

- **Evidencia:** #84/#90 integradas (`cf6954a`); D5 aprobada; nota de vigencia §D5.
- **Cierre documental:** procedente.
- **Pendiente:** ninguno funcional de E1.5; AC futuros conservan su estado.
- **Dependencias:** ninguna nueva.

## SPEC06 — Deuda mínima

- **Evidencia:** cabecera corregida #129; motor y pruebas de Deuda; `deudas.ts` sin defecto abierto.
- **Cierre documental:** procedente.
- **Pendiente:** progress histórico; AC parciales conservados.
- **Dependencias:** E4.4 no reabre E1.6.

## SPEC07 — Operación de Ciclos

- **Evidencia:** opción B #128 (`2c97a66`); C07-F1/F2.
- **Cierre documental:** procedente.
- **Pendiente:** AC28/E3.5 fuera; notas de PR #49 históricas.
- **Dependencias:** E3.5 STOP.

## SPEC08 — Presupuestos

- **Evidencia:** nota #129; maestro y pruebas B1–B9.
- **Cierre documental:** procedente.
- **Pendiente:** aceptación formal; sin regresión conocida.
- **Dependencias:** ninguna nueva.

## SPEC10 — Plan anual

- **Evidencia:** nota #129; motor y pruebas anuales.
- **Cierre documental:** procedente.
- **Pendiente:** aceptación formal.
- **Dependencias:** D′/SPEC33 conserva su ámbito.

## SPEC11 — Nómina

- **Evidencia:** N11-F1/F2/F3 reproducidos; H-SPEC11-01 aclarado como ambigüedad documentada.
- **Cierre documental:** procedente.
- **Pendiente:** sin reejecución; AC conservan estado.
- **Dependencias:** ninguna nueva.

## SPEC12 — Flujo mensual

- **Evidencia:** sin hallazgo; límites de `ledgerRows()` delimitados.
- **Cierre documental:** procedente.
- **Pendiente:** AC parciales futuros.
- **Dependencias:** E4.2 no altera S bruto.

## SPEC13 — Anticipos

- **Evidencia:** nota #129; rol/par probado; AC36 parcial aceptado.
- **Cierre documental:** procedente.
- **Pendiente:** nota de testplan histórica.
- **Dependencias:** ninguna nueva.

## SPEC14 — Compartidos

- **Evidencia:** nota #129; D5 probado; B-T11 futuro delimitado.
- **Cierre documental:** procedente.
- **Pendiente:** aceptación formal.
- **Dependencias:** B-T11 no forma parte del cierre.

## SPEC15 — Vehículos

- **Evidencia:** nota #129; motor y pruebas; proveedor histórico no conectado declarado.
- **Cierre documental:** procedente.
- **Pendiente:** cobertura histórica limitada.
- **Dependencias:** ninguna nueva.

## SPEC19 — Instrumentos y Compras

- **Evidencia:** 6 AC PARCIAL aceptados (opción A); D7 integrada #154/#155.
- **Cierre documental:** procedente.
- **Pendiente:** AC-55 depende de DEV22 (ya integrado); no se promueve a PASS.
- **Dependencias:** ninguna nueva.

## SPEC31 — SQLite de producción

- **Evidencia:** contrato v18 #130; restore v19/v20 #148; AC técnicos acreditados.
- **Cierre documental:** procedente.
- **Pendiente:** fsync/WAL, VPS y custodia externa son gate operativo/DT6, no cierre funcional.
- **Dependencias:** DT6/T-BKP abierto.

## SPEC32 — Ejecución rootless

- **Evidencia:** #30 integrado (`306bbc5`); AC-18 PASS; typecheck/build/E2E PASS en full Linux `766ea6b`.
- **Cierre documental:** procedente **con límite expreso**.
- **Pendiente:** ejecución rootless real y AC-22 final no acreditadas; Debian13/VPS son gate de despliegue.
- **Dependencias:** entorno productivo y DT6 no validados.

## Reglas de ratificación

- Ratificación **individual** por SPEC; no cierre masivo automático.
- No se convierte PARCIAL/UNRUN en PASS.
- Cierre documental ≠ aceptación funcional ni autorización de DEV/despliegue.
- Cualquier objeción a una SPEC se resuelve antes de registrar su cierre.
