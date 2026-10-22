# MyFinanzas — tablero de coordinación

Coordinador: único escritor; [gates locales](methodology/myfinanzas-coordination.md).
Reconciliación: 2026-10-22 Europe/Madrid. Main remoto verificado en
`7c5c7d1bfb62bdc77af1fad080312e6dce1577dd` (PR #33 integrada).
PR #32 integrada en `da543f3af6bde89259aeb0d9b2c1faad67311c05`.
Este tablero registra estado; no concede aprobaciones.

## Autorización vigente de esta ejecución

El usuario aprobó el plan y autorizó expresamente dev06, pruebas, relevo QA independiente
y preparación de PR; especificación E2.1 sin implementación ni aprobación automática;
subagentes y worktrees seguros, máximo dos trabajadores simultáneos más coordinador.
Dev32/PR30/AC22 permanecen pausados. Sin merges, despliegues, migraciones operativas,
cambios de seguridad ni decisiones financieras nuevas por inferencia.
La instrucción posterior de continuar preserva estos permisos e incorpora PR33,
sin reiniciar agentes ni trabajo ya realizado.

| Item | Prioridad | Spec / autorización | Dev | QA | Dependencias duras | Dueño / aislamiento | Bloqueo | Siguiente acción autorizada | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ADOPT-ORCH | Cerrada | PR32 integrada; PR33 actualiza autonomía operativa | Metodología vigente | Ensayo nativo previo conservado; no repetido | Satisfechas | Coordinador | Ninguno | Aplicar contrato vigente | PR32 da543f3; PR33 7c5c7d1b |
| E1.6 | P1 | Spec06 aprobada PR24; dev06 expresamente autorizado | Implementado y verificado localmente | Revisión independiente sin bloqueantes detectados en f2bfc1b | E1.2/E1.4/E1.5 y método integrados | /root/dev06; feat/06-deuda; worktree e16 | Solo nuevas decisiones materiales o fallo real | Preparar PR y verificar CI por SHA; esperar permiso de merge | [spec06](06-deuda-specification.md); autorización del usuario en esta sesión |
| E2.1 / spec07 | P2 paralela | Brainstorming07 preparado; 07 libre comprobado; spec NO aprobada | NO autorizado | Revisión funcional completada; ninguna aceptación ejecutada | E1.3/E1.4 integradas; resolver solo DT3 pendiente | /root/spec07; docs/07-ciclos-operacion; worktree e21 | Q1 y cobertura Comida respondidas; spec/wireframes aún sin aprobar | Completar spec y wireframes para aprobación expresa | [roadmap](roadmap.md), [spec03](03-ciclos-financiados-specification.md) |
| E2.2 | Futura | Roadmap aprobado; sin spec/dev nuevos autorizados | not-ready | no ejecutado | E1.1/E1.2/E1.6; P3/R3 | Sin trabajador | E1.6 pendiente; permiso específico | No iniciar | [roadmap](roadmap.md) |
| DEV32 / AC22 | Pausa independiente | Spec PR29 aprobada, aún no integrada; no nueva continuación | 23/24; AC22 pendiente | Revisión independiente NO iniciada | Orden PR29 → PR30 | PR30 Draft; feat/32-ejecucion-rootless; fuera de los worktrees actuales | Pausa expresa; suficiencia AC22 pendiente | Conservar checkpoint sin investigar ni modificar | PR30 a09011224e248edcc83080363660a237d409a7d8 |

## Paquetes activos y ownership

| Paquete | Estado | Escritura exclusiva | Límites / retorno |
| --- | --- | --- | --- |
| DEV06 | Completado localmente con QA; rama preparada para PR | Código/tests E1.6 y progress06/testplan06 en worktree e16 | 30 AC actuales; 3 futuros separados; candidato/SHA y evidencias reales; sin tablero/infra/spec07 |
| SPEC07 | Respuestas recibidas; siguiente paquete completa propuesta | Documentos specs/07-* en worktree e21 | Propuestas sin aprobación automática; sin código/tablero/infra |
| QA06 | Completado sobre f2bfc1b; cuatro hallazgos iniciales corregidos | Lectura y probes propios en worktree qa06; sin cambios a candidato | Independiente de autor; SHA fijo, AC/regresiones/seguridad/persistencia; no merge |

Los agentes reciben templates/agent-work-packet.md como contrato en su contexto.
Sin delegación recursiva; máximo dos trabajadores simultáneos. QA reutilizará capacidad
al terminar SPEC07 o DEV06. Solo coordinador escribe este tablero en
`chore/orchestrator-execution`; no comparte archivos de escritura con trabajadores.
Worktrees separados; suites con puerto3001 se ejecutarán de forma serial.

## Checkpoint de infraestructura preservado

Recuperados progress32/testplan32 e investigación existente desde SHA a090112, solo lectura.
Tres CI de a090112 confirmadas completed/success: rootless39739941226,
Validate PR39739941392 y push39739935397. Esto no cierra AC22.
Candidato86b1570/B5 demuestra carrera concreta de identidad y corrección mediante
snapshot, no causalidad del fallo histórico E1.4. R6, fsync post-rename y fallo API
histórico permanecen abiertos. Sin nuevas investigaciones, cambios, reruns o agentes infra.
No hay dependencia dura documentada de Dev32 para iniciar E1.6.

## Handoff y gates

Coordinador encadena dev → QA → correcciones técnicas autorizadas → verificaciones → PR.
Merge requiere permiso expreso de esa PR. E2.1 se detiene en decisiones nuevas y
aprobación de especificación; aprobar spec no autoriza desarrollo.
No trabajo entre sesiones ni control de chats externos. Reconciliar SHA/diff/evidencias
antes de publicar; preservar cambios y no declarar PASS o completado sin verificación.

## Historial metodológico

Ensayo PR32 ADOPT-RO-1/2 completado, lectura sin escrituras; no se repite para demostrar
herramientas. PR24 integrada b60def1. Estado anterior de tablero (PR32 Draft y dev06
sin autorización) queda sustituido por esta reconciliación y permisos expresos actuales.

### Actualización de paquetes
SPEC07 devuelve brainstorming07 sin commit ni aprobación, en worktree e21.
Q1 y la dependencia real Comida (E3.5 para aviso AC2) se han presentado al usuario.
No se ha rebajado AC2 ni cambiado roadmap. QA06-DESIGN completado en lectura por
/root/spec07; matriz AC01–30 y contratos31–33 revisados, sin suites ni PASS inventados.
Plaza disponible para QA ejecutable tras candidato; DEV06 continúa en su worktree.

### QA06 — primer candidato
Candidato67f2dbd en checkout QA aislado. QA reprodujo: extraordinaria UI con desglose
null rechazada; exceso aplicado indebidamente a precontrol; apertura productiva v6
sin migrar a tablas nuevas. Hallazgos enviados a DEV06 para corrección y regresiones
dentro de la spec aprobada. No aceptación global ni PR lista. Developer continúa
pruebas/UI mientras QA revisa el SHA fijo; no suites compartiendo puerto3001.

### DEV06 — verificación en curso
Developer informa correcciones de los cuatro hallazgos, API96 PASS/1537 aserciones,
typecheck/build PASS y prueba multiproceso v6→v7/IDs/reintentos/exceso. Evidencia
definitiva se consolidará por SHA en testplan06; no se trata como aceptación final.
Playwright E1.6/restoreMFA y capturas390/1440 en ejecución exclusiva de Developer;
QA no usa simultáneamente los puertos de esos servidores.

### Respuestas expresas E2.1 — 2026-10-22
Usuario confirma permitir rectificación con revisión de impacto (Q1) y especificar
operación disponible conservando AC2 pendiente hasta integrar Comida. No se declara
AC2 cumplido ni aprobada la especificación/wireframes. Tras cerrar QA06, el trabajador
Functional completará propuesta07 sin implementar E2.1.

### Candidato E1.6 corregido
Código3239c2d: Developer confirma API97 PASS/1547 aserciones, Playwright2 PASS47s,
typecheck/build y controles18+22 PASS. QA independiente confirma probes originales
corregidos y suite enfocada Deudas10 PASS/166 aserciones. Se añade aún resumen
visual capital/intereses en auditoría; se verificará incremental antes de cerrar.

### QA06 — cierre de código
Código final f2bfc1b0b3e0b86ae4232d3ee30d896f8b47b6f0, sin bloqueantes detectados
por QA independiente. Probes originales corregidos; ejecución QA propia:10 Deudas/166
aserciones y9guardas productivas/67aserciones PASS sobre3239c2d. Backend idéntico en
f2bfc1b; cambio incremental resumen auditoría capital/intereses revisado y E2E afectado
Developer1 PASS28.1s. Suite completa DeveloperAPI97/1547 yE2E2/47s sobre3239c2d.
No se atribuyen esas suites a QA. Historial de cuatro commits de desarrollo revisado
sin secretos/DB/datos reales detectados; solo fixtures y capturas ficticias. CI remota
y revisión del commit documental final pendientes antes de entregar PR.
SPEC07-FINAL en curso por mismo trabajador: propuestas pendientes de aprobación final,
sin implementación ni tercer trabajador. Dev32 conserva pausa expresa.

### Entrega del coordinador
Conciliado cierre QA f2bfc1b y documentación final fbcf423; los cuatro commits de
tablero se incorporan por el coordinador a feat/06-deuda, único escritor de tablero.
Rama preparada para PR hacia main; [comparación](https://github.com/josemartin2000/myfinanzas-app/compare/main...feat/06-deuda).
Resultados remotos vigentes se consultan por SHA en la PR, sin inferirlos de pruebas
locales. Merge sigue pendiente de autorización expresa. SPEC07-FINAL completa
propuesta documental con las respuestas recibidas; spec/wireframes no aprobados.
