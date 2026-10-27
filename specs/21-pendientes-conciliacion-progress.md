# 21 — E3.6 Pendientes y conciliación transversal: Progress

Status: **PREPARACIÓN DOCUMENTAL COMPLETADA (candidata)** — sin aprobación, sin
desarrollo, sin push/PR/merge.

Fecha: 2026-10-27. Sesión funcional `SPEC21-E3.6`. Cliente externo vía OpenCode;
modelo/versión observados por el entorno, no verificados por el coordinador.

## 1. Preflight

| Comprobación | Resultado |
| --- | --- |
| Repositorio | `josemartin2000/myfinanzas-app` |
| `origin/main` | `9977210095472de43a9abf59587ea88587376074` (merge PR94) |
| Checkout principal | `codex/dev12-flujo-mensual`, con `specs/session-handoff.md` sin seguimiento; preservado sin tocar |
| Ramas remotas SPEC21 | Ninguna |
| `specs/21-*` en main o en el historial | Ninguno |
| Worktrees con `21-pendientes-conciliacion-*` | Ninguno |
| Worktrees ajenos con cambios | `pilot-e41` (spec19) y `spec14-d5` (spec14); preservados sin tocar |
| Checkout aislado | directorio temporal de OpenCode, subcarpeta `spec21-e36` |
| Rama | `codex/spec21-e36-pendientes-conciliacion` |
| Base de la rama | `origin/main` = `9977210` |

No se reutilizó ningún worktree ajeno. No se detectó escritor previo de SPEC21 ni
expediente duplicado.

## 2. Fuentes consultadas

- `AGENTS.md`, `specs/README.md`, `specs/project.md`.
- `.agents/skills/spec/SKILL.md` y plantillas de brainstorming/specification/testplan.
- `specs/methodology/myfinanzas-coordination.md`, `approvals.md`, `workflows.md`,
  `coordinator-communication.md`.
- `specs/roadmap.md` (E2.3, E2.6, E3.1–E3.6, DT5, E4.6/E4.7).
- `specs/functional-reference-v5.11.md` (R1–R4/R6, P1–P7).
- `specs/epic-board.md` y checkpoints; se contrastaron con Git/PR cuando el tablero
  estaba desactualizado.
- SPEC09, SPEC12, SPEC13, SPEC14 y SPEC16 (specification/brainstorming/testplan cuando
  aplicaba).
- SPEC18/E3.5 y DEV18: documentos locales en el worktree de especificación
  `spec18-e35` (`specs/18-*`) y en el worktree de desarrollo DEV18 de OpenCode; **no
  forman parte de main** y no se atribuyen a `main`.
- Código/API de solo lectura: `apps/api/src/anticipos.ts`, `compartidos.ts`,
  `revision-comida*.ts`, `planes-ciclo.ts`, `flujo-mensual.ts`, `ciclos.ts`; contratos
  integrados comprobados sin ejecutar pruebas.

## 3. Documentos creados

| Documento | Contenido |
| --- | --- |
| `specs/21-pendientes-conciliacion-brainstorming.md` | Decisiones confirmadas con procedencia, propuestas P-01–P-10, alternativas y preguntas materiales Q-S21-01–04. |
| `specs/21-pendientes-conciliacion-specification.md` | Matriz de magnitudes, semántica Anticipos/Compartidos/Comida/Plan/Flujo, modelo transversal, wireframes 390/1440, API de solo lectura, estados, validación, exclusiones, matriz DT5 y 30 AC. |
| `specs/21-pendientes-conciliacion-testplan.md` | Matriz AC → positivo/negativo/límite → resultado → método → dependencia → UNRUN; riesgos y trazabilidad. |
| `specs/21-pendientes-conciliacion-progress.md` | Este checkpoint. |

No se editó ningún otro archivo.

## 4. Dependencias locales y futuras

- **E3.5/DEV18:** candidato local, no integrado ni aceptado funcionalmente.
  `FIN_NETA` runtime ausente; AC-12/13/17/39 BLOCKED según el último estado recibido
  (handoff QA18 local). No se promociona a integrado.
- **Cierres E4.8–E4.11:** no existen; la matriz DT5 es preparatoria.
- **B-T11/E3.2:** pendiente; SPEC21 define el consumidor, pero no declara PASS.
- **E3.1 AC36:** parcial por proveedor de Cierres ausente.
- **E3.4 AC25:** abierto; no se declara equivalencia física.

## 5. Decisiones y preguntas

Decisiones confirmadas: D-01–D-10 en el brainstorming, con fuente/fecha. No se reabren.

Preguntas materiales pendientes:

1. Q-S21-01 — atribución temporal del Recuperado de Compartidos entre ciclos.
2. Q-S21-02 — convivencia o sustitución del S bruto E2.6.
3. Q-S21-03 — alcance por defecto de la vista (abiertos vs todos).
4. Q-S21-04 — presentación de Comida cuando E3.5 no está integrada.

No hay respuestas del usuario en esta ronda. No se asumen aprobadas.

## 6. Verificación documental

- `git diff --check`: sin errores de whitespace en la candidata.
- `python3 scripts/validate-template`: **passed** (estructura, enlaces, manifiestos,
  contratos, reanudación, prompt y heurísticas de seguridad).
- Revisión manual del diff: solo los cuatro documentos nuevos; sin cambios ajenos.
- No se ejecutaron pruebas funcionales, CI remoto, migraciones, deploy, push, PR ni
  merge.
- No se declara PASS funcional, QA independiente ni aprobación de SPEC21.

## 7. Siguiente acción exacta

1. Álex revisa independientemente este expediente, el diff y las dependencias.
2. Si procede, presenta al usuario las preguntas Q-S21-01–04 y la propuesta completa.
3. Solo tras aprobación explícita de la spec se evaluará una autorización separada de
   desarrollo.
4. No reanudar DEV17, E4.1, B3, Dev32 ni otros frentes.

## 8. Publicación

Prohibida en este encargo: no push, no PR, no merge. La candidata permanece en el
checkout aislado y rama local.
