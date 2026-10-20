# MyFinanzas App

## Contexto confirmado
Fuente: solicitud del usuario «Start New Project — MyFinanzas App», 2026-10-20.
Repositorio derivado de agent-project-template. Aplicación web privada de un único
usuario para migrar progresivamente el sistema personal existente en Excel,
preservando su semántica económica, identificadores, reglas y controles.
Objetivos: mejorar experiencia de uso, continuidad entre ejercicios, automatización
y mantenibilidad. No diseñar reglas financieras nuevas ni inferirlas autónomamente.

## Referencia funcional vigente: arquitectura v5.11
Actualización confirmada por el usuario el 2026-10-20, antes de STEP 4.
La arquitectura v5.11 sustituye la referencia funcional v5.10. El usuario ha confirmado
expresamente que `MyFinanzas2026_v5.11(5).xlsx` es la **base estable vigente**;
no es una candidata ni está pendiente de promoción.

El Excel físico y su documentación original asociada v5.11 no se han incorporado
ni inspeccionado en Codex. Sí se ha recibido y leído la especificación funcional
consolidada adjunta para STEP 4; su [extracto sanitizado y procedencia](functional-reference-v5.11.md)
recoge R1–R6 y P1–P7. No confundir sus afirmaciones de contraste con una inspección
independiente del libro por Codex. No se han importado datos financieros reales.

Las reglas v5.10 que contradigan v5.11 quedan sustituidas y no deben aplicarse. No
reutilizar la lista anterior de documentos v5.10 como referencia funcional vigente.
Los principios previos no contradictorios se conservan; no inferir cambios adicionales.
La especificación funcional revisada ya ha sido aportada para preparar el roadmap.
El usuario aprobó la agrupación en cuatro épicas y autorizó una propuesta documental;
su planificación detallada sigue pendiente de revisión. Las decisiones técnicas abiertas
requieren aprobación en las especificaciones posteriores antes de implementar, sin
convertir automáticamente las tablas del Excel en SQL.

## Cambios financieros confirmados de v5.11
- Movimientos contiene únicamente Ingreso, Gasto, Transferencia y Amortización deuda.
- Las Compras/Ventas de inversión viven exclusivamente en tblOperacionesInversion;
  no se registran como tipos de Movimientos.
- tblInversionesResumen calcula posiciones y resultados; no duplicar esa fuente de cálculos.
- tblCiclos continúa como maestro único de ciclos financiados.
- Conservar los IDs estables y separar realidad financiera, planificación y cálculos.

Estos nombres describen el sistema de referencia, no tablas SQL aprobadas para la app.
Las reglas y relaciones funcionales confirmadas están en la referencia sanitizada;
el diseño físico SQL, columnas, restricciones y migraciones definitivas no están aprobados.

## Otros principios confirmados, subordinados a v5.11
- Saldos representa posiciones financieras; Deudas no son Saldos.
- Partida: unidad de imputación del gasto; Subcategoría y Categoría derivan de ella.
- Presupuesto: planificación. Referencia: casos concretos.
- Inversiones: preservar divisa y tipos de cambio históricos.
- Conservar identificadores existentes y evitar duplicar fuentes de verdad o cálculos centralizados.
- Distinguir movimientos reales, planificación, previsiones y simulaciones.

## Primer entregable y límites
Walking skeleton React → Effect HTTP API → SQLite, con catálogo pequeño, ficticio y
determinista de Saldos financieros, leído de SQLite y mostrado en una UI responsive.
Sin cálculos de saldos, presupuestos, inversiones, deudas ni registros reales.
No importar el Excel real. Originales y bases de datos reales fuera de Git;
ningún dato financiero personal se publicará en GitHub.

## Secuencia autorizada
Bootstrap, contexto y controles automáticos completados. Mantener la metodología
de ocho pasos. La especificación funcional ya recibida permite preparar el roadmap
bajo la autorización vigente de STEP 4 descrita abajo; no autoriza desarrollo ni despliegue.
La gestión de ramas, push y PR sí quedó autorizada posteriormente según [AGENTS](../AGENTS.md);
los merges de cada nueva PR requieren aprobación explícita. El usuario integró STEP 1 y
STEP 2 manualmente y cambió el repositorio a privado antes de autorizar STEP 3.
El usuario aprobó PR #3 explícitamente; se integró y verificó en main antes de esta
actualización documental v5.11. No cerrar ni aprobar el roadmap de STEP 4 sin la
especificación funcional revisada y aprobación expresa de su propuesta.

## Autorización vigente de STEP 4
El usuario autorizó el 2026-10-20 preparar una rama y PR documental del roadmap.
Agrupación aprobada: Núcleo financiero; Planificación; Gestión y controles; Patrimonio
y cierre. La sección 14 del adjunto era anterior a esa aprobación; no reabrirla.
Las decisiones P1–P7 se conservan en la referencia funcional y se trazan a las entregas
del [roadmap propuesto](roadmap.md). Autorización de elaborar/commitear/publicar el
borrador no equivale a aprobación del detalle ni de merge. Sin implementación, SQL
definitivo, migraciones o despliegues. Detenerse antes de STEP 5.
