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
el usuario ha aportado después evidencias sanitizadas F1–F3 de su revisión directa
del Excel estable. Se incorporan en la referencia y especificación, sin inspección
independiente de Codex; quedan explícitos extremos residuales y la aprobación final
del documento sigue pendiente. Saldo actual NO filtra por Fecha apertura; histórico
mensual sí comprueba la fecha. No añadir filtro ni fecha Manual sin especificación
y prueba de equivalencia. No cerrar alternativas de seguridad, integridad
o reglas económicas por suposición. Sin código, DDL, migraciones, nuevos servicios,
merge, E1.2 ni otros pasos. El permiso de elaborar esta propuesta no aprueba su contenido.

Revisión posterior de PR #6: favorable funcional/técnicamente, seguida de confirmación
expresa M1/M2 el 2026-10-20. La [matriz de validación](01-saldos-control-specification.md#matriz-compacta-de-campos-y-evidencia-de-validación)
registra contrato aprobado para la aplicación: aperturas no aplicables Exterior, opcionales
en otros cinco pares; Estado Activa por defecto al crear, Finalidad/Objetivo opcionales,
tres booleanos independientes (revisión vigente de switches del 2026-10-21 abajo). No se atribuye ese contrato a reglas físicas
del Excel. No eliminar información existente sin función en un motor, convertir ausencia
en cero ni introducir filtro temporal o fecha Manual. M1/M2 quedan cerradas.
Aprobación final del documento completo y merge pendientes. La revisión visual prevista
recibió aprobación de su primera propuesta según comunicación posterior del usuario
el 2026-10-21; ver estado vigente abajo. Sin implementación, SQL, migraciones o E1.2.


## Diseño común y pantallas E1.1 aprobados — 2026-10-21
El usuario comunica revisión/aprobación con Álex de la primera propuesta visual.
[Guía UI común](guidelines/ui.md) registra paleta/estilo profesional y compacto,
navegación escritorio/móvil, cabecera de ciclo y patrones reutilizables. La
[especificación E1.1](01-saldos-control-specification.md#screens-and-interfaces) recoge
listado, ficha y formulario en tres bloques. M1/M2, Q1–Q8 y reglas v5.11 intactas.
La cabecera leerá el ciclo desde el maestro único; si no está entregado, No disponible,
sin adelantar E1.3 ni inferir ciclo/cierre desde reloj o estado temporal.
Aprobación comunicada no equivale a código, capturas inspeccionadas, prueba responsive
ni accesibilidad comprobada. Se recibieron descripciones textuales, no se afirma
inspección de un prototipo gráfico externo. Esperar aprobación final de PR #6/versión
completa; sin merge, componentes, pantallas, CSS, SQL, migraciones o E1.2.


## Revisión vigente M2 — switches y tema claro — 2026-10-21
Decisión posterior aprobada por el usuario: sustituye controles segmentados y exigencia
anterior de interacción manual en cada Sí/No. [Contrato](01-saldos-control-specification.md)
y [guía UI](guidelines/ui.md): tres switches No/false por defecto en alta; POST ordinario
omitido persiste false explícito, PATCH omitido conserva valor y edición no reinicializa.
Atributos independientes de Tipo/Control/Finalidad y entre sí. Posibles históricos
importados ausentes se preservan como ausencia, sin false ni conversión silenciosa;
no hay importación real ni afirmación de que esos casos existan en el libro.
Switch on verde #8DBB2E/indicador blanco/Sí; off verde suave MyFinanzas/indicador
blanco/No. Tema exclusivamente claro, sin modo oscuro en esta fase. M1, Estado inicial
Activa, Finalidad/Objetivo opcionales y S000 protegido permanecen sin cambios.
Solo documentación/PR/checks; sin merge, código, CSS, SQL, migraciones o E1.2.


## Autorización de desarrollo vigente — 2026-10-21
STEP 5 y diseño E1.1 aprobados e integrados mediante PR #6/main ebfe75b. Usuario autoriza
STEP 7/$dev 01 y seis bloques del plan en feat/e1-1-saldos: seguimiento/Handoff,
persistencia/acceso/backups, primer recorrido, gestión completa, recuperación/UX y PR.
Esta autorización sustituye límites de implementación del STEP 5 anterior; no altera
reglas aprobadas ni habilita E1.2, datos reales, despliegue o merge sin autorización.

## Estado de entrega STEP 7 E1.1
Especificación/diseño integrados en main ebfe75b; Handoff completado. PR #7, aprobada tras revisión de Álex sobre 4f7cdda,
integra el catálogo ficticio con altas/ediciones/estados, MFA y copias locales, según
[progreso](01-saldos-control-progress.md) y [evidencia](01-saldos-control-testplan.md).
Los textos anteriores de «sin implementación» registran la fase documental original.
No son un permiso para nuevos módulos: E1.2 y motores posteriores siguen excluidos.
Excel v5.11 sigue como maestro, sin datos reales ni despliegue. E1.1 implementado e integrado. STEP 8 completado e integrado mediante PR #8 tras aprobación expresa sobre f4ff3e2;
[cierre de las ocho etapas iniciales](dev-skill-consolidation.md). Skills spec/dev
preparadas para reutilizarse. Esperar autorización; no iniciar E1.2 ni desplegar.


## Autorización vigente — especificación E1.2 / $spec 02
Usuario autoriza el 2026-10-21 continuar tras las ocho etapas iniciales cerradas
(main 2bc92e9). Solo especificación de clasificación: rama spec/02-clasificacion,
[brainstorming reanudable](02-clasificacion-brainstorming.md). Ronda 1 confirmada
por el usuario tras contraste de Álex con Excel/Criterios: jerarquía única por ID,
atributos de cada entidad, estados de padres como extensión app, corrección con
impacto económico indirecto y separación de Presupuestos/Deudas futuros.
Ronda 2 pendiente sobre dominios/reglas no demostrados; no inventar equivalencias.
Esta autorización sustituye el anterior «esperar autorización de E1.2» únicamente
para especificar: no desarrollo, SQL, importación, despliegue o merge. Excel maestro
sin modificar; evidencia aportada por usuario, sin inspección independiente de Codex.


### E1.2 — segunda ronda recibida; propuesta pendiente de revisión
El usuario aporta evidencia sanitizada de dominios y semántica de cálculos,
Control de integridad y Referencia obligatoria. [Registro](02-clasificacion-brainstorming.md)
conserva ambas rondas; [propuesta y wireframes](02-clasificacion-specification.md)
pendientes de revisión/aprobación. Sin nueva pregunta por contradicción material.
El anterior pendiente Q6–Q8 queda resuelto por este registro. Validaciones de alta
no demostradas físicamente se etiquetan propuestas app; consumidores futuros aparte.
Siguiente acción: feedback visual y aprobación documental, no desarrollo ni merge.


## E1.2 — especificación integrada y desarrollo autorizado
Usuario aprueba PR #10 sobre 25cffc0; merge verificado en main 0c7a87e tras ambas CI
SUCCESS. Autoriza dev 02 en feat/e1-2-clasificacion; aprobación no autoriza merge de
implementación ni despliegue. Reserva de nombre SUB resuelta por evidencia posterior:
COUNTIF global, comparación sin mayúsculas, acentos/espacios conservados; app usa
comodines literales y prueba casos especiales, sin normalización silenciosa.
Estado actual y siguiente acción en [progreso](02-clasificacion-progress.md),
resultados en [testplan](02-clasificacion-testplan.md). Actualización local SQLite
preserva E1.1; únicamente fixtures, Excel maestro sin modificar. Consumidores
financieros de AC-19/24/25/26 siguen pendientes; ninguna aprobación por extensión.


## E1.2 completada e integrada — PR #11
El usuario aprueba 58b51f9 tras auditoría técnica y visual de Álex y autoriza squash
merge el 2026-10-21. Cierre registrado en la misma PR, sin cambios de código ni lógica.
[Progreso](02-clasificacion-progress.md) y [evidencia](02-clasificacion-testplan.md)
conservan 27 criterios verificados y AC-19/24/25/26 como contratos financieros futuros.
Estado MERGED, commit de squash y CI posterior verificables en PR #11. Los registros
anteriores de «en revisión/merge pendiente» describen la fase previa a esta aprobación.
Próxima acción: esperar autorización de la siguiente entrega; no iniciar E1.3 ni
desplegar. Excel v5.11 sigue como fuente de verdad, sin datos reales ni cambios al maestro.
Se prioriza resolver detalles técnicos ordinarios durante desarrollo y reutilizar
arquitectura/componentes/pruebas, manteniendo rigor financiero, de seguridad e integridad.


## E1.3 — spec 03 autorizado, sin desarrollo
Usuario autoriza especificar Ciclos financiados desde main a98d8f7 y publicar una
PR Draft de documentos no aprobados como excepción expresa a la secuencia de commit
aprobado de spec. [Brainstorming](03-ciclos-financiados-brainstorming.md) reúne Q1–Q3;
[especificación provisional](03-ciclos-financiados-specification.md) incluye wireframes
y criterios condicionados, no decisiones financieras asumidas. Próxima acción:
respuestas a ronda breve y revisión de la misma PR. Sin dev 03/SQL ejecutado/merge,
E2.1, motores, Nómina, datos reales ni despliegue. Excel v5.11 permanece maestro.


### E1.3 — respuestas y base visual recibidas, cierre documental pendiente
Q1–Q3 confirmadas por usuario tras revisión física de Álex. Corrección material Q2:
mes financiado único demostrado en Control ciclo, además de Inicio único/obligatorio
y saldo comida obligatorio; cero/negativos explícitos válidos. Cabecera por referencia,
sin corte inventado; Fin conservado sin hechos. Wireframes aceptados como base.
[Brainstorming](03-ciclos-financiados-brainstorming.md) conserva historia y respuestas;
[especificación](03-ciclos-financiados-specification.md) define 24 criterios: 21 actuales
y 3 contratos futuros, sin pruebas de E1.3 ejecutadas. PR #12 permanece Draft;
siguiente acción: aprobación final y autorización dev 03, sin implementación/merge.


## E1.3 vigente — desarrollo autorizado
Especificación/diseños aprobados por usuario sobre bf3f2eb, PR #12 integrada (179942e).
Implementación local/ficticia en rama independiente; [progreso](03-ciclos-financiados-progress.md)
y [testplan](03-ciclos-financiados-testplan.md) son la evidencia vigente.
21 criterios actuales y 3 contratos futuros; sin declarar motores financieros entregados.
Siguiente paso: revisión de implementación, sin merge automático, E2.1 ni despliegue.


## Estado vigente — E1.3 integrada; spec 04 autorizado
E1.3 completada e integrada PR #13 (ff9d18d), aprobación expresa del usuario sobre
ce4dadb; CI previa doble y posterior main SUCCESS verificadas. 21 criterios actuales,
AC-11/23/24 conservados como contratos futuros. Este registro sustituye estados de
revisión pendientes anteriores, conservados como historia.
Usuario autoriza spec 04 E1.4 Ingresos/Gastos, sin dev 04 ni SQL/merge/despliegue.
Rama spec/04-movimientos desde main ff9d18d, solo documentación ficticia/sanitizada.
[Ronda única Q1–Q6](04-movimientos-brainstorming.md) y
[borrador con wireframes/criterios](04-movimientos-specification.md), no aprobados.
Siguiente acción: respuestas materiales y feedback visual; no implementar ni publicar
como especificación aprobada. Excel v5.11 sigue maestro, no incorporado/inspeccionado.


### Spec 04 — Q1–Q6 confirmadas, especificación completa en revisión
Usuario confirma Q1–Q6 tras revisión de Álex, 2026-10-21. Registro append-only en
[brainstorming 04](04-movimientos-brainstorming.md); [especificación 04](04-movimientos-specification.md)
actualiza wireframes y conserva 33 AC: 29 actuales previstos y 4 contratos futuros.
No preguntas nuevas ni validaciones financieras supuestas. Apertura vacía→0 solo en
cálculo Control Movimientos; bloqueo de fechas futuras según día civil español es
contrato de app; rectificación/anulación auditadas y advertencias no bloqueantes.
Siguiente acción: revisión/aprobación de especificación completa y diseños, no dev 04.
Sin código, SQL, commit de especificación aprobada, merge ni despliegue autorizados.


### Spec 04 — aprobada el 21/10/2026
Usuario aprueba especificación completa y wireframes tras revisión favorable de Álex,
autoriza cierre de spec 04 y squash merge de PR #14 tras ambas CI verdes del HEAD final.
AC-20 aclarado: anular un movimiento registrado por error sin hecho económico real.
33 criterios conservados: 29 actuales previstos y 4 contratos futuros; ninguna prueba
de E1.4 implementada se da por ejecutada. Estado aprobado en
[specification](04-movimientos-specification.md) y registro en
[brainstorming](04-movimientos-brainstorming.md). Verificar integración/commit en PR #14.
Siguiente acción tras merge: esperar autorización de dev 04. Sin código/SQL, importación,
datos reales ni despliegue; Excel v5.11 sigue maestro. Estados de revisión previos históricos.


## Dev 04 — autorizado, implementación en revisión
Usuario autoriza E1.4 desde main 5fa4ace (PR #14 documental integrada, especificación y
wireframes APPROVED). Rama feat/e1-4-movimientos; SQL local versionado autorizado sin
resemilla, pérdida de datos ni reset de acceso. [Progreso](04-movimientos-progress.md)
y [pruebas](04-movimientos-testplan.md) conservan 29 criterios actuales y AC-30–33 futuros.
El permiso posterior de dev 04 sustituye exclusiones de implementación de la fase spec;
no altera Q1–Q6. Sin autorización de merge de PR funcional, E1.5, datos reales o deploy.
Excel v5.11 sigue maestro. Próxima acción: revisión de Álex de implementación/CI/capturas.
