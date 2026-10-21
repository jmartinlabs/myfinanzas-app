# STEP 8 — Consolidación de la Skill dev

Estado: preparada y validada en rama; pendiente aprobación e integración de esta PR.
Autorización del usuario: 2026-10-21. Base main `5f1e27b`, PR #7 MERGED.
Se reutiliza [.agents/skills/dev/SKILL.md](../.agents/skills/dev/SKILL.md); no se crea otra
Skill ni se cambia la metodología de ocho etapas. E1.1 permanece completada e integrada.

## Contraste con experiencia real
Fuentes: [progreso E1.1](01-saldos-control-progress.md),
[testplan y revisión visual](01-saldos-control-testplan.md),
[revisión final e integración de PR #7](https://github.com/josemartin2000/myfinanzas-app/pull/7).
No se generalizan reglas financieras ni decisiones de producción a partir de esos casos.

| Evidencia real de E1.1 | Cobertura previa | Ajuste general mínimo |
| --- | --- | --- |
| 43 AC trazados; AC-30/31 contractuales y parte futura de AC-38 sin motor/maestro | Paso 2 mapea AC y paso 7 exigía todos pasados sin distinguir contratos | Clasificar según alcance aprobado, sin reclasificar fallos/no ejecutados como futuros; el cierre no acredita motores inexistentes |
| La revisión de 4f7cdda limitó una semilla automática antes incondicional al entorno development/test; rechazo sin abrir/modificar bases | Pruebas funcionales y revisión de seguridad generales | Cuando haya fixtures automáticos, comprobar su límite de entorno y rechazo sin mutación fuera de él; no imponer SQLite/NODE_ENV a otros proyectos |
| Aserción leyó un color intermedio de transición; etiquetas cambiaban al aparecer ayudas/errores | Paso 5 ya exige teclado, accesibilidad y navegador | Esperar presentación estable y usar nombres accesibles estables; no esperas arbitrarias ni pruebas que reflejen el CSS sin propósito |
| Verde principal/texto oscuro 6.04:1 frente a blanco 2.26:1, documentado sin cambiar diseño | Inspección de legibilidad ya exigida | Medir pares reales y documentar excepción de accesibilidad necesaria, respetando diseño aprobado |
| Login/MFA y restauración reales; factores generados fuera de capturas compartidas | Pruebas reales y revisión de secretos ya exigidas | Hacer explícito el cuidado de credenciales/artefactos de autenticación al compartir evidencia |
| Resultados locales separados de CI por SHA; aprobación sobre 4f7cdda, cierre documental ea1344a y merge 5f1e27b; contextos antes en revisión | Paso 6 ya actualiza documentos; AGENTS tiene política GitHub completa | Referenciar esa política sin duplicarla; vincular CI al SHA y distinguir implementado/aprobado/integrado |

## Aspectos conservados
- Misma Skill, frontmatter, entradas/salidas, siete puntos del procedimiento y stop conditions.
- Misma secuencia de especificación aprobada, incrementos funcionales, progress/testplan,
  pruebas trazables, comprobación real y criterios de cierre. Se conservan errores/bloqueos.
- Playwright, capturas 390/1440 inspeccionadas, cinco mejoras o justificación de menos,
  corrección y repetición de checks afectados. Sin nuevas exigencias de rediseño.
- Autorización de cambios materiales, revisión de diff/secretos/alcance y límites de
  producción. La política de Git/GitHub y autorización de merge sigue solo en AGENTS.
- Sin dependencias, frameworks, controles automáticos ni plantillas nuevas. No se modifican
  código, SQL, diseño, reglas financieras, criterios E1.1 ni roadmap aprobado.

## Cierre de las ocho etapas
Esta tabla registra la metodología global; no renumera los siete stages internos
Identity–Handoff del walkthrough init-project en setup-progress.

| STEP | Resultado | Estado / evidencia |
| --- | --- | --- |
| 1 Bootstrap | React → Effect HTTP → SQLite ficticio/local | Integrado; [bootstrap](bootstrap.md), PR #1 |
| 2 Context files | Contexto y guidelines | Integrado; [context files](context-files.md), PR #2 |
| 3 Enforceable rules | Controles/CI y regresiones | Integrado; [automated checks](automated-checks.md), PR #3 |
| 4 Roadmap | Cuatro épicas, 30 entregas funcionales | Aprobado e integrado; [roadmap](roadmap.md), PR #5 |
| 5 Specification | E1.1 y diseño aprobados, 43 AC | Integrado; [specification](01-saldos-control-specification.md), PR #6 |
| 6 Reusable spec Skill | Skill spec existente revisada/reutilizada | Cubierto; [spec Skill](../.agents/skills/spec/SKILL.md), Handoff |
| 7 Build | E1.1 local/ficticia implementada y verificada | Integrado; PR #7/main 5f1e27b; motores posteriores pendientes |
| 8 Reusable dev Skill | Skill dev existente consolidada con experiencia real | Preparado en esta rama; aprobación/merge de esta PR pendientes |

Con esta propuesta quedan cubiertas las ocho etapas; **no se declara integrado STEP 8**
hasta aprobar y fusionar su PR. La metodología queda preparada para reutilizar las Skills
spec/dev existentes y el roadmap aprobado, sin nuevas rondas de inicialización ni duplicados.
Esta preparación no autoriza E1.2, nuevas funcionalidades, datos reales ni despliegue.
Excel v5.11 continúa como fuente de verdad; inicialización limpia/migración y operación
productiva seguirán sus autorizaciones, sin servicios contratados ni configuración nueva.

## Validación y reanudación
Cambios solo de Skill/contexto: ejecutar validate-template, test-validator (18),
check-project, test-checks (22), diff --check y check-repository con índice e historial.
No se añaden pruebas para texto. La validación documental inicial no repitió flujos
locales de app; tras integrar PR #9 se repite la suite completa por petición del usuario.
La CI existente ejecuta automáticamente tipos/build/Bun/Playwright y su resultado se enlaza
en la PR por SHA, separado de la evidencia funcional E1.1 previamente integrada.

Resultado local 2026-10-21: validador, 18 regresiones de plantilla, check-project y
22 regresiones de controles pasan. Whitespace y revisión de cambios sin hallazgos;
check-repository revisa también el índice/historial antes del push. La PR enlaza la
CI del commit de STEP 8; no se presenta la evidencia antigua como una ejecución nueva.

Siguiente acción: revisión y aprobación expresa de la PR de STEP 8; no merge automático.
No iniciar E1.2 ni otro trabajo por extensión de esta autorización.

## Actualización tras corregir la incidencia de CI
El usuario aprueba PR #9 tras revisión de Álex sobre 121d790. Precisión documental
0f1231c (comprobaciones de versión fuera de la transacción) sin más cambios de código;
CI de push 39555763059 y PR 39555768822 SUCCESS antes de merge. Integración verificada
en main 23e471e. PR #8 incorpora ese main sin conflictos y su diff respecto a main
sigue limitado a Skill/documentación. No incorpora una corrección funcional propia.
La ejecución fallida 39553456240 se mantiene como evidencia histórica.
Validaciones locales repetidas de la rama actualizada: instalación congelada, tipos,
build, 16 pruebas Bun/200 aserciones y Playwright real 390/1440 (MFA y restauración)
pasan. Los controles documentales/40 regresiones y la revisión de historial/índice se
repiten antes del push; la evidencia remota del nuevo SHA se enlaza en PR #8.
CI posterior al merge de PR #9 en main: 39555962955 SUCCESS sobre 23e471e.
PR #8 permanece en borrador para revisión; no se declara integrado STEP 8 ni se autoriza
su merge, E1.2, nuevas funcionalidades o despliegue.
