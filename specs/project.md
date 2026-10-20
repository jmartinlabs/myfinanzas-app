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

El Excel y su documentación asociada v5.11 todavía no se han incorporado ni
inspeccionado dentro del repositorio de Codex. La estabilidad es una decisión
confirmada por el usuario; no implica que Codex haya validado o analizado esos
archivos. No se han importado datos del Excel.

Las reglas v5.10 que contradigan v5.11 quedan sustituidas y no deben aplicarse. No
reutilizar la lista anterior de documentos v5.10 como referencia funcional vigente.
Los principios previos no contradictorios se conservan; no inferir cambios adicionales.
La especificación funcional revisada, que el usuario aportará, es un prerrequisito
para definir el modelo financiero definitivo y cerrar el roadmap. El Excel por sí
solo no permite tomar esas decisiones ni convertir automáticamente sus tablas a SQL.

## Cambios financieros confirmados de v5.11
- Movimientos contiene únicamente Ingreso, Gasto, Transferencia y Amortización deuda.
- Las Compras/Ventas de inversión viven exclusivamente en tblOperacionesInversion;
  no se registran como tipos de Movimientos.
- tblInversionesResumen calcula posiciones y resultados; no duplicar esa fuente de cálculos.
- tblCiclos continúa como maestro único de ciclos financiados.
- Conservar los IDs estables y separar realidad financiera, planificación y cálculos.

Estos nombres describen el sistema de referencia, no tablas SQL aprobadas para la app.
No se han aprobado campos, relaciones, migraciones ni fórmulas del modelo definitivo.

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
Planificación inicial; implementación solo tras aprobación del plan.
Después: bootstrap verificado, arquitectura implementada, guidelines de UI/calidad/
seguridad y controles automáticos. Respetar los ocho pasos de la plantilla.
Detenerse antes de las épicas financieras definitivas y solicitar la especificación
funcional de MyFinanzas para iniciar el roadmap. No se autoriza despliegue.
La gestión de ramas, push y PR sí quedó autorizada posteriormente según [AGENTS](../AGENTS.md);
los merges de cada nueva PR requieren aprobación explícita. El usuario integró STEP 1 y
STEP 2 manualmente y cambió el repositorio a privado antes de autorizar STEP 3.
El usuario aprobó PR #3 explícitamente; se integró y verificó en main antes de esta
actualización documental v5.11. No cerrar ni aprobar el roadmap de STEP 4 sin la
especificación funcional revisada y aprobación expresa de su propuesta.
