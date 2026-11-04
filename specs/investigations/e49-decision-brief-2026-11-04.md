# E4.9 — Brief de decisiones para desbloquear el DEV (2026-11-04)

**Estado:** documento de preparación. **No aprueba, no autoriza DEV ni declara PASS.** Las
recomendaciones son propuestas técnicas/funcionales; las decisiones materiales siguen
pendientes de usuario/Álex. Base: `main` `5c4297a`; SPEC27, testplan, wireframes y paquete
[e49-dev-authorization-package](e49-dev-authorization-package-2026-11-03.md).

## 1. Decisiones que bloquean fijar el paquete

| # | Decisión | Recomendación (propuesta) | Motivo / riesgo | ¿Bloquea DEV? |
| --- | --- | --- | --- | --- |
| 1 | **D4** | Estricto: si E3.5 no es verificable (`Parcial`, `No disponible`, error, `bloqueo.verificable=false`), el cierre queda bloqueado y no emite foto; sin Comida `0` ni total parcial. Corregir el estado de precierre para que no diga `Listo con avisos` con `e4_9Bloqueado`. | Capturar un parcial en una foto inmutable contradice la regla de no presentar parciales como completos. Riesgo: ciclos no cerrables mientras E3.5 siga parcial; es coherente con el gate actual. | **Sí**: fija preflight/AC-08 |
| 2 | **T1 Ventas** | Incluir E4.2 en T1: alta, rectificación, anulación y cambio de fecha, con `409 HISTORY_LOCKED` y comprobación de fecha antigua/nueva. | Sin lock, una Venta en ventana cerrada altera efectivo/cantidad ya capturados; E4.2 ya está integrado. Es ampliación expresa del alcance T1. | **Sí**: condición de entrada |
| 3 | **Versión v25** | Reservar **v25 en exclusiva a E4.9**; migración aditiva v24→v25 y contrato C25. Actualizar en bloque identidad, admisión, backup, `schema-contracts.json` y pruebas de migración. | v24 está ocupada por E4.3; sin versión no hay persistencia ni C25. Tocar una sola pieza rompe backup/restore. | **Sí** |
| 4 | **AC-20 / T2** | Comparar en el corte congelado de cada foto posterior, con hechos ≤ Fin, solo magnitudes inmunes a T2 (posiciones y efectivo a Fin); registrar valores comparados en auditoría. Excluir magnitudes que T2 puede mover (reparto, clasificación, presupuesto). | El seam actual no implementa AC-20; comparar totales sensibles a T2 produciría falsos `INCOHERENCIA_CON_CIERRE_POSTERIOR`. | **Sí**: algoritmo de entrada |
| 5 | **DT4 / foto v1** | Incluir el efecto de Ventas y la identidad de sus operaciones en el bloque de inversión; dejar conciliaciones E4.4 fuera de v1 con motivo explícito. | E4.2/E4.4 no existían al aprobar DT4. Sin identidad de Ventas no se reconstruye la cantidad; las conciliaciones requieren una regla de selección no fijada. | **Sí** para cerrar contrato v1 |
| 6 | **UI** | No aprobar #178 como definitivo: contiene filas desactualizadas de E4.2/E4.4/E3.5. Seguir el precedente de E4.8: UI provisional y revisión visual diferida, si el usuario lo decide. | Congelar wireframes obsoletos o bloquear el núcleo por la UI retrasa el DEV sin necesidad. | **No para API**; sí para fase UI |
| 7 | **Versión de app** | Constante generada en build desde `package.json` + SHA corto, registrada en la foto y verificada por contrato. | Hoy no hay campo de versión; AC-01 exige metadatos inmutables. | **Sí (menor)**: AC-01 |
| 8 | **MFA** | Reutilizar sesión MFA completa + Origin/CSRF; sin step-up nuevo. | SPEC27 solo exige reautenticación al expirar; step-up sería diseño de autenticación nuevo. | **No**, salvo petición expresa |
| 9 | **DT6** | Con fixtures: AC-01 sintético, AC-02–08, AC-10–14, AC-16–18, AC-20–21 y AC-09 simulado; marcar `PASS (fixtures)` y `BLOQUEADO (real)`. Cierre real solo con DT6/T-BKP. | Un doble de backup no acredita DT6; el cierre real exige destino, segunda copia, custodia `age`, restore Linux y RPO/RTO. | **No para DEV**; sí para cierre real |

## 2. Dependencia técnica detectada

`precierre.ts` sigue declarando `e43`, `e35`, `e44`, `e45` y `e36` como `No disponible` con
motivos de «sin motor», aunque E3.5, E4.2, E4.3 y E4.4 están integrados. D4/AC-08/AC-14 no
pueden implementarse sobre esa tabla sin refrescarla. Debe asignarse dueño (E4.8 o E4.9) y
límite documental; no reabre reglas.

## 3. Qué puede prepararse sin decisión

- Diseño de migración v25/C25 y lista de artefactos acoplados.
- Borrador del algoritmo AC-20 y matriz AC-20 × T2.
- Inventario de fixtures por AC y checklist DT6 real.
- Actualización documental de la tabla de fuentes de precierre y filas obsoletas de wireframes.
- Fuente de `APP_VERSION` y prueba de contrato.

## 4. Decisiones agrupadas para autorización

Bloque único: **1 D4, 2 T1 Ventas, 3 v25, 4 AC-20/T2, 5 DT4/Ventas+E4.4**. Las decisiones 6,
7 y 8 pueden resolverse después sin bloquear el diseño; 9 solo condiciona el cierre real.

**No se inicia DEV E4.9 ni se declara AC hasta autorización expresa.**
