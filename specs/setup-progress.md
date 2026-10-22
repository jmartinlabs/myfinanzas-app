# Setup progress
Current stage: 7

## Especificación técnica 31 — aprobada, 2026-10-21

El usuario aprueba íntegramente D1–D4 y AC-01–33 tras revisión con Álex y autoriza
`$dev 31` al completar `$spec`. Fuente: mensaje expreso en esta conversación.
[Decisiones y aprobación](31-sqlite-produccion-brainstorming.md) /
[contrato aprobado](31-sqlite-produccion-specification.md). PR #23 documental;
implementación independiente y sin merge autorizado. Se preservan los registros
históricos inferiores. Sin VPS/deploy/datos reales ni modificaciones a #21/#22.

| Stage | Status | Evidence / canonical decision links |
| --- | --- | --- |
| 1 Identity | complete | [Contexto confirmado](project.md), solicitud del usuario 2026-10-20 |
| 2 Technology | complete | [Stack y versiones implementados](guidelines/architecture.md) |
| 3 Architecture | complete | [Arquitectura](guidelines/architecture.md); plan aprobado 2026-10-20 |
| 4 Bootstrap | complete | [STEP 1](bootstrap.md); el usuario autorizó continuar con STEP 2 |
| 5 Guidelines | complete | [STEP 2](context-files.md) y [STEP 3](automated-checks.md) integrados; PR #3 aprobada y merge verificado |
| 6 Roadmap | complete | [Roadmap aprobado](roadmap.md): cuatro épicas y 30 entregas; autorización expresa de integración de PR #5 |
| 7 Handoff | complete | Fuentes, arquitectura, bootstrap, controles y roadmap verificados; STEP 5 aprobado PR #6/ebfe75b. $spec 01 completado; $dev 01 autorizado. |

## Confirmed decisions
Estado vigente: STEP 5 aprobado/integrado; los registros inferiores conservan su alcance
y fecha originales. STEP 7 autorizado y evidencia vigente al final.
- Revisión M2 switches aprobada 2026-10-21: sustituye elección manual/segmentados. Alta y POST omitido=false explícito; PATCH conserva; históricos ausentes no son false. Tema solo claro, sin modo oscuro; fuente append-only en brainstorming.
- Primera propuesta visual común y pantallas E1.1 aprobadas según comunicación del usuario (revisión con Álex), 2026-10-21; guía UI y specification actualizadas. No prueba de implementación ni permiso de merge/código.
- M1/M2 aprobadas por el usuario como contrato de la NUEVA APLICACIÓN el 2026-10-20; registro append-only en brainstorming, separado de F1–F3 Excel. La propuesta visual fue aprobada por comunicación posterior del 2026-10-21; implementación no autorizada.
- Evidencias F1–F3 recibidas del usuario tras inspección propia del Excel estable, 2026-10-20: referencia/especificación actualizadas. Combinaciones utilizadas no son matriz exhaustiva; Saldo actual no filtra por Fecha apertura, histórico mensual sí comprueba esa fecha. Sin inspección independiente de Codex.
- E1.1: Q1–Q8 respondidas por el usuario el 2026-10-20; estructura visual confirmada y permiso para completar documentación/PR #6. Fuente y alcance exacto en el registro posterior de brainstorming; sin aprobación final del documento ni de merge.
- STEP 5 autorizado solo para propuesta documental E1.1, por solicitud expresa del usuario el 2026-10-20; no equivale a aprobar DT1/DT2/DT6.
- STEP 4 completado por aprobación expresa del usuario el 2026-10-20: PR #5 y distribución 4/30 aprobadas; merge autorizado tras CI/alcance.
- Las entregas son unidades funcionales verificables, no necesariamente sprints ni PR.
- [Consideraciones operativas](project.md): dominio previsto, preferencia UE sin VPS contratado y Excel maestro hasta migración autorizada.
- STEP 4 autorizado el 2026-10-20: preparar/commitear/publicar PR documental; no implementar ni hacer merge.
- [Cuatro agrupaciones de épicas](roadmap.md) aprobadas expresamente; la sección 14 anterior del adjunto no las revoca.
- [Especificación funcional recibida y P1–P7](functional-reference-v5.11.md): fuente leída y trazada; no implica inspección del Excel.
- PR #4 aprobada e integrada en main: 0f07992; HEAD aprobado aeb867c verificado como ancestro.
- [Contexto v5.11 y referencia candidata vigente](project.md): actualizado por usuario el 2026-10-22;
  v5.11(7) es candidata vigente, NO estable; su promoción a estable sigue pendiente.
  Incorporación e inspección del libro en Codex no realizadas.
- PR #3 aprobada explícitamente al actualizar inicialmente el contexto a v5.11;
  merge 193410d verificado en main.
- STEP 3 autorizado mediante «procede» tras presentar el siguiente paso; [alcance](automated-checks.md).
- PR #1 y #2 integradas manualmente y repositorio privado: confirmado por usuario, Git y API.
- [STEP 2 y contexto](context-files.md): autorizados por el usuario el 2026-10-20.
- [Política Git/GitHub](../AGENTS.md): autorizada por el usuario el 2026-10-20; merge solo tras aprobación explícita de la PR.
- [Plan STEP 1 y precisiones aprobadas](bootstrap.md): respuesta explícita del usuario el 2026-10-20.
- [Identidad, referencias, principios y alcance](project.md): confirmados por el usuario el 2026-10-20.
- [Tecnología aprobada](guidelines/architecture.md): confirmada en la misma solicitud.
- [Secuencia y parada previa al roadmap](project.md): instrucción explícita del usuario.

## Pending decisions
- [DT1–DT10](roadmap.md): resolución progresiva; E1.1 registra enfoque DT1, identidad/precisión DT2 y propuesta DT6 confirmados en Q4–Q7, no aprobación global de todos sus detalles. DT3–DT5/DT7–DT10 siguen en sus puertas correspondientes.
- Excel de referencia y documentos originales todavía fuera de Codex, sin inspección; únicamente se recibió la especificación funcional adjunta.
- [Matriz de validaciones](01-saldos-control-specification.md#matriz-compacta-de-campos-y-evidencia-de-validación): M1/M2 cerradas. Diseño y especificación integrados en PR #6. Implementación local en rama, pruebas actuales en testplan; aprobación de PR funcional/merge pendiente. Detalles de histórico/Manual operativo/pares nuevos se contrastan en sus entregas, sin reabrir M1/M2 ni bloquear esta actualización documental.

## Evidencia de sincronización
- PR #1 MERGED: 3ea80b2; PR #2 MERGED: f698549. Ambos commits de STEP 1/2 son ancestros de main.
- GitHub confirma repositorio privado y main como rama principal; API accesible.
- PR #3 MERGED: 193410d; HEAD c340bad integrado y main actualizado por fast-forward.
- PR #4 MERGED: 0f07992; main actualizado y árbol limpio antes de STEP 4.
- PR #5 MERGED: fed2743; roadmap integrado en main, cuatro épicas/30 entregas aprobadas.

## Evidencia STEP 3
- 18 regresiones de plantilla y 22 pruebas de controles: pasan.
- Tipos/build/instalación congelada: pasan; 4 Bun Test y 4 E2E pasan.
- Capturas 390/1440 inspeccionadas. Sin datos reales ni nuevas dependencias.
- Checks remotos del HEAD aprobado c340bad: success en push y pull_request.
  No se modificó el alcance aprobado antes de integrar PR #3.

## Evidencia STEP 4
- Original de la especificación leído fuera del checkout; extracto funcional y SHA en referencia sanitizada.
- Roadmap aprobado: 6+6+6+12 entregas, con AC, pruebas futuras, dependencias y exclusiones.
- P1–P7 trazadas y P7 operativo posterior a las cuatro épicas, sin doble escritura.
- Validador y 18 regresiones de plantilla, check-project y 22 pruebas de controles: pasan.
- Revisión de estructura: 30 entregas con capacidad, dependencias, AC, pruebas futuras y exclusiones.
- Revisar historia e índice antes de push; comprobar los checks remotos de la PR sin confundirlos con tests financieros futuros.
- Los criterios/pruebas del roadmap son futuros; no se han implementado ni ejecutado como funcionalidades.

## STEP 5 — registro histórico de revisión (ya aprobado e integrado)
- Revisión favorable de PR #6 seguida de M1/M2 explícitamente aprobadas para la aplicación; ronda original y respuestas append-only conservadas. No equivalen a evidencia de obligatoriedad física Excel ni aprobación final de la PR.
- Rama step-5/e1-1-saldos-spec, partiendo de main fed2743; sin worktree adicional.
- [Brainstorming](01-saldos-control-brainstorming.md): ronda original conservada, respuestas Q1–Q8 y feedback visual añadidos con fuente/fecha; sin aprobaciones por extensión.
- [Propuesta](01-saldos-control-specification.md): alcance/contratos, DT1/DT2/DT6, wireframes,
  43 criterios de aceptación/contrato y plan de pruebas futuras. IN REVIEW: F1–F3, M1/M2 y aprobación visual comunicada incorporadas; aprobación final no recibida. AC-30/31 fijan contratos de motores posteriores, sin ampliar E1.1.
- No implementación ni instalación de paquetes/herramientas; no inspección/importación del Excel real.
- Validación local de propuesta: plantilla y 18 regresiones, check-project y 22 pruebas de controles pasan; whitespace y revisión de historia/índice sin hallazgos. Auditoría documental: AC-01…40 conservados/actualizados, AC-41…43 añadidos para ausencia histórica/switches/tema claro y evidencia F1–F3 atribuida al usuario, separada de extremos no demostrados.
- CI del commit publicado: consultar la PR; sus suites del bootstrap no validan E1.1, que no está implementada.

## Next action
Ocho etapas iniciales cerradas; STEP 8 completado e integrado en PR #8. Skills spec/dev
preparadas para reutilizarse. Esperar autorización antes de E1.2 o despliegues.

## Estado vigente STEP 7 — 2026-10-21
PR #6 MERGED verificada, commit main ebfe75b, coincidente con especificación/diseño aprobados.
Los estados anteriores de revisión son históricos: quedan sustituidos por esta autorización.
Handoff inicial completado con enlaces de las etapas previas y CI main exitosa; las
preguntas de módulos posteriores no bloquean E1.1. STEP 6 ya cubierto por Skill spec
reutilizable existente, validada; no crear una duplicada. STEP 8 se revisará después del build.
Desarrollo autorizado en feat/e1-1-saldos; progreso/pruebas en
[progress](01-saldos-control-progress.md) y [testplan](01-saldos-control-testplan.md).
Solo local/ficticio. Excel v5.11 maestro. Sin E1.2, despliegue ni merge sin aprobación.

## Evidencia STEP 7 E1.1
Handoff y estados completados en la misma rama funcional. Listado/ficha/formulario,
acceso protegido, persistencia exacta y ensayo cifrado local implementados. Evidencia
actual y distinción de contratos futuros en testplan; sin E1.2 ni motores posteriores.
PR #7 aprobada expresamente por el usuario tras revisión de Álex sobre 4f7cdda;
E1.1 implementado e integrado, cierre registrado en progress.
STEP 8 posteriormente autorizado por el usuario; cierre propuesto en el registro inferior.
Motores AC-30/31 y parte futura de AC-38 pendientes. Excel v5.11 sigue maestro.

## STEP 8 — completado e integrado
Autorizado el 2026-10-21. Rama step-8/dev-skill-consolidation desde main 5f1e27b.
Skill dev existente contrastada con progreso/testplan/revisión E1.1, sin duplicarla.
[Aprendizajes, cambios mínimos y cierre de las ocho etapas](dev-skill-consolidation.md).
Se mantiene Current stage: 7 del walkthrough interno (Handoff completo); no es la
numeración global de las ocho etapas. STEP 1–7 integrados/cubiertos; STEP 8 completado
e integrado mediante PR #8 tras aprobación del usuario sobre f4ff3e2 el 2026-10-21.
Cierre documental validado en la misma PR antes de su merge; integración verificable en PR #8.
Sin cambios funcionales, E1.2 o despliegue. Excel v5.11 sigue maestro.


## Entrega siguiente autorizada — E1.2 / $spec 02
Las ocho etapas iniciales siguen cerradas. El usuario autoriza especificar E1.2
el 2026-10-21, no implementarla. [Rondas y decisiones](02-clasificacion-brainstorming.md):
Q1–Q5 respondidas; Q6–Q8 pendientes. Siguiente acción: recibir dominios/semántica de
Grupo, cálculos/Control y Referencia obligatoria; después wireframes y especificación.
Rama spec/02-clasificacion desde main 2bc92e9. Sin SQL, datos reales, Excel, merge
ni despliegue. La espera anterior queda sustituida solo en este alcance documental.


### E1.2 — segunda ronda recibida; propuesta pendiente de revisión
El usuario aporta evidencia sanitizada de dominios y semántica de cálculos,
Control de integridad y Referencia obligatoria. [Registro](02-clasificacion-brainstorming.md)
conserva ambas rondas; [propuesta y wireframes](02-clasificacion-specification.md)
pendientes de revisión/aprobación. Sin nueva pregunta por contradicción material.
El anterior pendiente Q6–Q8 queda resuelto por este registro. Validaciones de alta
no demostradas físicamente se etiquetan propuestas app; consumidores futuros aparte.
Siguiente acción: feedback visual y aprobación documental, no desarrollo ni merge.


## Dev 02 — autorizado tras aprobación de PR #10
PR #10 MERGED en 0c7a87e, CI push/PR SUCCESS del 25cffc0. Especificación y diseños
aprobados; reserva SUB respondida después sin nueva ronda. Desarrollo local/ficticio
en feat/e1-2-clasificacion: [estado](02-clasificacion-progress.md),
[aceptación/pruebas](02-clasificacion-testplan.md). Ocho etapas iniciales siguen
cerradas; no reiniciar Handoff. Esperar aprobación de implementación antes de merge;
sin E1.3, datos reales ni despliegue. Registros anteriores de espera son históricos.


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


## Estado vigente — E1.3 / dev 03
Usuario aprueba PR #12 sobre bf3f2eb y autoriza squash merge e implementación local.
Se verificaron SHA exacto, ausencia de conflictos y CI push/PR SUCCESS; PR #12 lista
y MERGED en 179942e. Main sincronizado y limpio antes de crear
feat/e1-3-ciclos-financiados. Spec 03 cerrada; aprobación registrada sin reabrir reglas.
[Progreso](03-ciclos-financiados-progress.md) y [evidencia](03-ciclos-financiados-testplan.md)
separan 21 criterios actuales de AC-11/23/24 futuros. Implementación no integrada;
próxima acción: revisión de PR funcional y aprobación expresa antes de merge.
Las ocho etapas iniciales permanecen cerradas; sin E2.1, producción ni datos reales.


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


## Estado vigente — E1.4 cerrada; spec 05 autorizado
E1.4 integrada en b51b89b (PR #15), cierre documental integrado en a693aeb (PR #16),
CI posterior SUCCESS; 29 criterios verificados y AC-30–33 conservados como futuros.
Usuario autoriza exclusivamente especificación/diseño E1.5 y publicación en PR Draft.
Rama spec/05-transferencias-referencias desde main a693aeb. [Brainstorming 05](05-transferencias-referencias-brainstorming.md)
y [propuesta con wireframes](05-transferencias-referencias-specification.md) DRAFT/NO APROBADOS:
Q1–Q3 confirmadas por usuario: internas sin permiso Exterior; toda Transferencia Exterior
reservada; matriz CAT011/012/013/014/009 y compatibilidad solo obligatoria; fechas Madrid sin futuro.
30 criterios actuales previstos y 3 contratos futuros; ninguna prueba E1.5 ejecutada.
Siguiente acción: revisión final de Álex y aprobación posterior del documento completo.
Sin dev 05, SQL, merge, datos reales ni despliegue. Excel v5.11 sigue maestro.
Los estados de desarrollo/revisión anteriores son históricos, no el estado vigente.


## Spec 05 — aprobada y autorizada para integración — 2026-10-21
Usuario aprueba PR #17 tras auditoría de Álex sobre 50de3e4: especificación funcional/técnica,
wireframes 390/1440, Q1–Q3, AC-01–30 actuales y AC-31–33 contratos futuros. Autoriza
cierre documental APPROVED y squash merge tras ambas CI SUCCESS del commit definitivo.
[Brainstorming](05-transferencias-referencias-brainstorming.md) conserva la aprobación;
[especificación](05-transferencias-referencias-specification.md) registra el contrato aprobado.
Continuidad pendiente: asignar entrega futura responsable para Transferencias ordinarias
con Exterior, sin ampliar E1.5 ni adjudicarlas automáticamente a E3. Hash de integración,
estado MERGED y CI posterior se verifican y registran en PR #17 al concluir.
Siguiente acción tras integración: spec 05 cerrada; esperar autorización expresa de dev 05.
No implementación funcional, SQL, datos reales, modificación Excel ni despliegue. Los
estados previos de revisión son históricos. Excel v5.11 continúa como maestro financiero.


## Dev 05 — implementación autorizada en revisión
Usuario autoriza desde main a586fa7 (PR #17 aprobada/integrada), rama funcional
feat/e1-5-transferencias-referencias. Solo local/ficticio; migración versionada E1.5
sin pérdida de datos. La autorización de dev 05 sustituye el límite documental anterior
sin reabrir Q1–Q3 ni habilitar merge. [Progreso](05-transferencias-referencias-progress.md)
y [resultados](05-transferencias-referencias-testplan.md) mantienen 30 AC actuales y
AC-31–33 futuros. Exterior ordinario/especial y fichas E3 siguen fuera; la entrega
responsable de Exterior ordinario queda pendiente de planificación autorizada.
Próxima acción: auditoría de Álex de la PR funcional. Sin merge automático, E1.6,
datos reales, Excel modificado ni despliegue; Excel v5.11 continúa maestro.

## Cierre autorizado de E1.5 — 2026-10-21
Auditoría final favorable de Álex; usuario autoriza squash de PR #18 sobre el HEAD
064ffa295608a8a90152a2f6bf8ea57154855490, ambas CI SUCCESS y sin conflictos con
main tras PR #19. Integración: `0d6cfc0e4622e00e1084aefb35987b1954c5e3ef`.
[CI posterior al merge](https://github.com/josemartin2000/myfinanzas-app/actions/runs/39649152132):
COMPLETED / SUCCESS sobre ese commit. Main sincronizado y limpio tras integración;
PR #19 preservada. E1.5 completada e integrada: 30 criterios verificados, AC-31–33
contratos futuros sin implementar. Manifiesto `e1.5-v5` y prueba R10 integrados.
Este registro documental se propone en PR separada, pendiente de autorización de merge.
No spec/dev 06, datos reales, modificación Excel ni despliegue; Excel v5.11 sigue maestro.


## Desarrollo técnico 31 — verificación local

[Progreso 31](31-sqlite-produccion-progress.md) y
[testplan AC-01–33](31-sqlite-produccion-testplan.md). Esquema v6 con identidad,
creación privada DB+clave, alta y restore implementados en rama independiente.
82 Bun PASS / 1243 assertions y 2 E2E PASS (41.5s); revisión y CI finales en PR #25. PR #23 aprobada e integrada externamente
en 13f19f6; #25 sigue pendiente de autorización de merge. Sin VPS/deploy/datos reales.

## Dev 31 integrado — 2026-10-22
Usuario autoriza expresamente solo PR #25 sobre 6c68b5e tras revisión con Álex.
Squash verificado en main 511fcbad4bb0418af5bc06284ac30abb645cd604; árbol
idéntico al aprobado y checkout limpio. 33 AC PASS, 82 API/1243 assertions, 2 E2E,
CI previa y posterior al squash SUCCESS; detalles en [testplan 31](31-sqlite-produccion-testplan.md).
R6 sin causa atribuida; fsync tras publicación puede dejar durabilidad incierta.
Preparación operativa pendiente según infra/README.md; sin VPS/deploy/datos reales.
PR #21/#22 intactas. Este cierre documental requiere su propia revisión/merge.


## Spec 06 — E1.6 propuesta documental en revisión — 2026-10-21
Base main 9336fdd; E1.5 cerrada e integrada. Usuario autoriza solo especificación,
wireframes y PR Draft. [Brainstorming](06-deuda-brainstorming.md) y
[especificación](06-deuda-specification.md): DRAFT, Q1–Q4 sin responder, 30 criterios
actuales candidatos y 3 futuros; ninguna implementación/prueba funcional E1.6 ejecutada.
Próxima acción: contrastar apertura/corte/precontrol, desglose/límites, mínimo de Deuda y
protecciones históricas, permiso/fecha del nuevo Tipo; feedback de wireframes 390/1440.
La publicación anticipada está autorizada, no la aprobación o dev 06. Sin código/SQL,
migración, Excel, datos reales, merge o despliegue. Excel v5.11 continúa maestro.


## Spec 06 — consolidación para auditoría — 2026-10-22
Base incorporada: main ad9442669468968d0ab82a9613522c7205b242c1, SQLite v6.
PR #24 permanece DRAFT, sin aprobación final ni autorización de dev 06/merge.
Usuario confirma cuota íntegra, capital>0/intereses>=0/suma exacta, Dxxx/enlace único,
protección histórica y extraordinaria con S000/permiso Exterior. Q1 sigue única reserva
física: falta fórmula literal y texto Criterios de apertura, >= Inicio control y precontrol.
Exceso de amortización y fecha futura de extraordinaria: propuestas app explícitas para
aceptación en la revisión completa, no reglas Excel ni autorizaciones implícitas.
30 AC actuales candidatos/3 contratos futuros; ninguno ejecutado como funcionalidad E1.6.
[Brainstorming](06-deuda-brainstorming.md) y [especificación/plan dev 06](06-deuda-specification.md)
conservan evidencia, wireframes y trazabilidad. PR #31 integrada con CI SUCCESS; incidencias
históricas no declaradas resueltas. Sin nuevas investigaciones de infraestructura.
Próxima acción: evidencia sanitizada Q1 y auditoría/aprobación de especificación; después
esperar autorización expresa de dev 06. Sin producto/SQL/migración, VPS, deploy o datos reales.


## Spec 06 — Q1 cerrada y referencia candidata única — 2026-10-22
El usuario designa MyFinanzas2026_v5.11(7).xlsx referencia financiera única/base
candidata vigente, sustituyendo a (5), SIN promoverla a estable. Q1 cerrada por
transcripción física atribuida de tblDeudas y Criterios C30/C88/C109: apertura menos
capital por mismo ID con Fecha de Movimientos >= Inicio control. Sin Tipo/Control ni
Fecha inicio deuda como filtros, ni históricos/precontrol como operandos adicionales.
[Referencia y procedencia](functional-reference-v5.11.md), [spec](06-deuda-specification.md)
y [decisiones](06-deuda-brainstorming.md) actualizadas; ausencia no se convierte en cero.
Q2–Q4 consolidadas. Propuestas app de exceso/fecha futura/ciclo de vida y formulario
mínimo para aceptar en la aprobación completa. PR #24 sigue DRAFT, 30 actuales
candidatos/3 futuros, sin pruebas funcionales E1.6 ni autorización dev06/merge/SQL.
Próxima acción: auditoría final de especificación/wireframes y aprobación expresa;
después solicitar autorización dev06. Sin infraestructura nueva, VPS, deploy, datos
reales, importaciones o modificación del Excel. Estados anteriores quedan históricos.


## Spec 06 — auditoría final y ajustes autorizados — 2026-10-22
Álex revisa 89788288f7a820efd2a6cc1411e6a95a8d11d174 favorablemente; usuario autoriza
solo ajustes documentales y consolidar decisiones app: rechazo atómico de capital
pendiente verificable negativo (cero exacto admitido, sin truncar/compensar); extraordinaria
no futura según día civil Europe/Madrid; activar/desactivar sin borrar historia y proteger
apertura/Inicio control/enlaces usados. No atribuir estas decisiones a fórmulas Excel.
Q1–Q4 validadas, fórmula inclusiva intacta y 30 AC actuales/3 futuros conservados.
Referencia única v5.11(7) sigue candidata, NO estable. PR #24 permanece DRAFT; pendiente
verificación del diff final y autorización expresa de integración/desarrollo. No dev06,
merge, SQL, infraestructura nueva, VPS, despliegues, datos reales o Excel modificado.
Los estados previos de propuestas/preguntas pendientes son históricos, no el vigente.
