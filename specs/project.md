# MyFinanzas App

## Contexto confirmado
Fuente: solicitud del usuario «Start New Project — MyFinanzas App», 2026-10-20.
Repositorio derivado de agent-project-template. Aplicación web privada de un único
usuario para migrar progresivamente el sistema personal existente en Excel,
preservando su semántica económica, identificadores, reglas y controles.
Objetivos: mejorar experiencia de uso, continuidad entre ejercicios, automatización
y mantenibilidad. No diseñar reglas financieras nuevas ni inferirlas autónomamente.

## Referencias pendientes de entrega controlada
- MyFinanzas2026_v5.10.xlsx: candidata validada, pendiente de confirmación expresa como estable.
- Instrucciones del Proyecto MyFinanzas v5.10.
- Mandato del Asesor Principal v5.10.
- Guía Operativa MyFinanzas v5.10 y hoja Criterios.
- Prompt de cambio de año 2027 v5.10.

Estos documentos no se han recibido ni validado. No son necesarios para el catálogo
ficticio del bootstrap; sí para especificar los módulos financieros posteriores.

## Principios financieros confirmados
- Movimientos: realidad financiera ejecutada. Saldos: posiciones financieras.
- Ciclos: maestro único de periodos financiados.
- Partida: unidad de imputación del gasto; Subcategoría y Categoría derivan de ella.
- Presupuesto: planificación. Referencia: casos concretos. Deudas no son Saldos.
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
