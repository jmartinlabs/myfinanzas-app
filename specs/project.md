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
El usuario aprobó las cuatro épicas y sus 30 entregas y autorizó integrar PR #5.
STEP 4 queda completado. Las decisiones técnicas abiertas
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

## Cierre aprobado de STEP 4
El usuario aprobó el 2026-10-20 la agrupación de cuatro épicas y sus 30 entregas y
autorizó integrar PR #5 tras verificar CI y alcance. Las decisiones P1–P7 se conservan
en la referencia funcional y se trazan en el [roadmap aprobado](roadmap.md).
STEP 4 completado e integrado en main (PR #5, fed2743). La autorización posterior
de STEP 5 se limita a E1.1 como se indica abajo; implementación no autorizada.
DT1–DT10 se resolverán progresivamente antes de las entregas correspondientes;
esta aprobación no fija SQL definitivo ni autoriza migraciones o despliegues.

## Consideraciones operativas confirmadas
Fuente: autorización expresa del usuario para integrar PR #5, 2026-10-20.
- Dominio previsto: `myfinanzas.pp.ua`. No implica DNS, certificados o servicio ya preparados.
- Preferencia: VPS ubicado en la Unión Europea; todavía sin contratar. Proveedor,
  recursos y operación permanecen pendientes en DT10; no se autoriza contratar ahora.
- Las 30 entregas son unidades funcionales verificables, no necesariamente 30 sprints ni 30 PR.
- Excel v5.11 sigue siendo fuente de verdad hasta la migración definitiva autorizada;
  la app solo pasa a maestro después del proceso P7. Nunca doble escritura.

## Autorización vigente de STEP 5 — E1.1
Fuente: solicitud expresa del usuario, 2026-10-20, posterior al merge de PR #5.
Se autoriza especificar Saldos y atributos de control, proponer DT1/DT2/DT6 y preparar
rama/PR exclusivamente documental. [Ronda inicial](01-saldos-control-brainstorming.md)
y [especificación en revisión](01-saldos-control-specification.md). El usuario respondió
Q1–Q8 y aprobó la estructura visual el 2026-10-20; registro posterior append-only en
brainstorming. La versión documental integra decisiones y detalles técnicos menores;
evidencia financiera F1–F3 y aprobación final del documento siguen pendientes. No cerrar alternativas de seguridad, integridad
o reglas económicas por suposición. Sin código, DDL, migraciones, nuevos servicios,
merge, E1.2 ni otros pasos. El permiso de elaborar esta propuesta no aprueba su contenido.
