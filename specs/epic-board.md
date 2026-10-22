# MyFinanzas — tablero de coordinación

Coordinador: único escritor; [gates locales](methodology/myfinanzas-coordination.md).
Última reconciliación: 2026-10-22, main b60def124e95d692b6021eff9c1049652e21ded0.
Rama: chore/adopt-orchestration-v2-3-1. El tablero no concede aprobaciones.

| Item | Prioridad | Spec / autorización | Dev | QA | Dependencias duras | Dueño / aislamiento | Bloqueo | Siguiente acción autorizada | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ADOPT-ORCH | P1 | Adopción y PR autorizadas; merge metodología pendiente | Solo instrucciones/docs | Validación local completada; CI final pendiente | PR24 integrada y CI SUCCESS: satisfecho | Coordinador, rama actual | Aprobación PR final | Preparar PR/CI, esperar aprobación | [adopción](methodology/orchestration-adoption.md) |
| E1.6 | P1 tras adopción | Spec06 aprobada/integrada PR24 | not-ready, SIN permiso dev06 | Plan y 30 AC aún no ejecutados | Método integrado + autorización dev06 | Sin trabajador de implementación | Permiso explícito y PR método aún sin integrar | Esperar; no codificar | [spec06](06-deuda-specification.md), main b60def1 |
| NEXT-SPEC | P2 futura | SIN permiso spec07; mapping E1.7 no resuelto | not-ready | planned | Identidad de entrega y alcance autorizados | Sin asignación | Roadmap actual continúa E2.1, no E1.7 | No crear spec; conservar solicitud futura | [roadmap](roadmap.md) |
| EXT-FIN | Externo | Checkpoint no recibido/verificado | unknown | unknown | Dueño externo y Git/checkpoint | Chat independiente, NO trabajador gestionado | No transferir ni duplicar | Esperar checkpoint antes de asignar | Solo declaración usuario, no contexto verificable |
| EXT-INFRA | Externo | Checkpoint no recibido/verificado | unknown | unknown | Dueño externo y Git/checkpoint | Chat independiente, NO trabajador gestionado | Sin autorización nueva de infra/VPS | No investigar ni tocar su trabajo | [límites](methodology/myfinanzas-coordination.md) |

## Cola lista de esta intervención
- ADOPT-RO-1/2 completados: dos subagentes nativos, lectura y retornos verificados; sin ediciones.
- Coordinador: verificar resultados, hashes/links/diagramas, controles y CI; preparar PR.
Después de entregar esta PR, no hay más trabajo financiero autorizado en esta intervención.

## Paquetes y estados
| Paquete | Estado | Scope de escritura | Responsable | Resultado |
| --- | --- | --- | --- | --- |
| ADOPT-RO-1 | completed / cerrado como paquete | Ninguno | /root/orch_gate_probe, perfil funcional | Skill/rol accesibles, dev06/spec07 blocked, retorno recibido |
| ADOPT-RO-2 | completed / cerrado como paquete | Ninguno | /root/orch_catalog_probe, perfil QA | 9 Skills/ownership/fallback revisados, retorno recibido |

## Infraestructura e investigaciones
Ninguna tarea nueva autorizada. R6, error histórico de CI y IOERR_SHORT_READ conservan
su evidencia; esta adopción no los investiga ni declara resueltos. No scheduler permanente.

## Handoff y reanudación
El merge de PR24 está autorizado y verificado. La PR metodológica necesita revisión y
permiso de integración. Dev06 y spec07 necesitan su propio permiso posterior, aunque la
spec06 esté aprobada. Reconciliar siempre Git y documentos canónicos antes de actuar;
no asumir que un agente quedó trabajando entre sesiones. No usar este tablero para
apropiarse de ramas de otros chats. Paquetes y evidencia: [registro](methodology/orchestration-adoption.md).


## Conciliación tras ensayo real — 2026-10-22
Coordinador recibió ambos resultados y contrastó rutas, hashes y diff. Ningún trabajador
modificó archivos ni tablero. Se pausaron las escrituras del coordinador durante sus
lecturas; las correcciones editoriales se aplicaron después, en serie. Estado nativo
completed comprobado; no se afirma terminación del proceso ni actividad residente.
Bloqueos detectados: falta permiso dev06/spec07 y aprobación PR de metodología. No se
lanzan investigaciones para ocupar trabajadores. O6/O8 y aislamiento de escritores reales
no se probaron; fallback y bloqueo de colisiones son contratos/revisión, no ejecución simulada.
