# Setup progress
Current stage: 7

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
- [Contexto v5.11 y base estable vigente](project.md): confirmados por usuario el 2026-10-20;
  no queda pendiente promoción del Excel. Su incorporación e inspección en Codex siguen pendientes.
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
- Excel estable y documentos originales todavía fuera de Codex, sin inspección; únicamente se recibió la especificación funcional adjunta.
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
E1.1 integrado en main 5f1e27b. STEP 8 autorizado, consolidación preparada en rama para
revisión y aprobación de PR; no hacer merge ni iniciar E1.2 o despliegues.

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

## STEP 8 — consolidación preparada para revisión
Autorizado el 2026-10-21. Rama step-8/dev-skill-consolidation desde main 5f1e27b.
Skill dev existente contrastada con progreso/testplan/revisión E1.1, sin duplicarla.
[Aprendizajes, cambios mínimos y cierre de las ocho etapas](dev-skill-consolidation.md).
Se mantiene Current stage: 7 del walkthrough interno (Handoff completo); no es la
numeración global de las ocho etapas. STEP 1–7 integrados/cubiertos; STEP 8 preparado,
pendiente aprobación y merge de su PR. No declarar todavía su integración en main.
Sin cambios funcionales, E1.2 o despliegue. Excel v5.11 sigue maestro.
