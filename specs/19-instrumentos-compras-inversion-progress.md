# 19 — E4.1 Instrumentos y Compras de inversión: Progress

Status: **APPROVED rev7** — specification y wireframes aprobados el 2026-10-26 sobre el commit
`47f469a902330ac199c910225563f909bd5116eb`; testplan aprobado con ella. DEV, merge y
despliegue **no** autorizados.
Specification: [19-instrumentos-compras-inversion-specification.md](19-instrumentos-compras-inversion-specification.md)
Brainstorming: [19-instrumentos-compras-inversion-brainstorming.md](19-instrumentos-compras-inversion-brainstorming.md)
Test plan: [19-instrumentos-compras-inversion-testplan.md](19-instrumentos-compras-inversion-testplan.md)

## Aprobación registrada — 2026-10-26

- Objeto: **SPEC19 de E4.1 rev7**, incluidos wireframes W1–W10 y testplan.
- Commit aprobado: `47f469a902330ac199c910225563f909bd5116eb`.
- Mensaje real del usuario: «Apruebo la SPEC19 de E4.1 rev7, incluidos wireframes y testplan,
  correspondiente al commit 47f469a902330ac199c910225563f909bd5116eb.»
- Alcance de la aprobación: contrato de diseño documental. **No autoriza DEV, merge ni
  despliegue.** La implementación requiere una autorización separada posterior al gate de
  destino y a la congelación de manifiestos v14.
- Este checkpoint posterior solo registra la aprobación y el estado; no cambia el contenido
  funcional aprobado sobre `47f469a`.

## Checkpoint documental — 2026-10-26

- Checkout: `/private/var/folders/45/l03g6c0x15748l6t9c0f7zm80000gp/T/opencode/pilot-e41`.
- Rama: `codex/pilot-full-e41-instrumentos-compras-inversion`; base `e408b1da5ae9f45c9bfd139d11f362216b5bce26`.
- Alcance: solo documentación y ejemplos ficticios. Sin código, SQL ejecutable, migraciones,
  pruebas funcionales, datos reales, PR, merge ni despliegue.
- Cierre aplicado: coordinación de esquema con Compartidos/PR75 y Vehículos sin tocar sus
  sesiones; semántica unívoca de errores (suficiencia recalculada 422 `INSUFFICIENT_CASH`;
  revisión obsoleta 409 `REVISION_CONFLICT`; huella de Movimiento 409 `IMPACT_CHANGED`; guard
  de Saldo 409 `HISTORY_LOCKED`); residual R4-1 de AC-41 resuelto con precondición ordenada
  sobre `S003`.
- Contrato v14 (rev7): no se acepta una base por su número. Solo se admiten
  `C14-COMPARTIDOS-FCE1107` y `C14-VEHICULOS-C69E343`, con manifiesto canónico y SHA-256
  obligatorios antes de DEV; una variante desconocida o incompleta se rechaza antes de
  `BEGIN IMMEDIATE`/`journal_mode`/DDL/backup. La reserva 15 es provisional y se revalida
  contra `origin/main` antes de DEV. La generación de manifiestos es un paso pre-DEV separado,
  autorizado y con fixtures aislados, sin tocar los worktrees de Compartidos o Vehículos.
- Verificación canónica: `python3 scripts/verify baseline` con Python 3.12.14 → **PASS**,
  incluida la comprobación de espacio en blanco del commit.
- Revisión independiente real: **PASS** tras corregir restore/intentos, rutas
  `metrics.liquidez`, alcance de `IMPACT_CHANGED`, precondición AC-41, contrato v14,
  serialización del manifiesto y residuales editoriales; sin hallazgos bloqueantes. La
  revisión no escribió archivos ni contactó otras sesiones.
- Sesiones del cierre: coordinador `ses_e86859b93ffdjZlpllG1FflZol`; revisor independiente
  `ses_e86523c99ffeNgigtCay1EMUq1`.

## Incidencia del piloto — cambio de sesión

- La sesión anterior del piloto quedó bloqueada por un error del proveedor y **no** se ha
  contactado, reanudado ni modificado.
- El trabajo se recuperó desde este checkout y los tres documentos; no se repitió el
  brainstorming ni se reabrieron Q1–Q10, H1–H3 o N1–N12.
- No hubo cambios en el harness, Skills, hooks, scripts, workflows, permisos ni visibilidad.
- Impacto: continuidad documental sin pérdida; el cierre pendiente se completó en una sesión
  nueva y queda registrado aquí para el handoff.

## Siguiente acción

SPEC19 rev7 aprobada. Antes de DEV: ejecutar el gate de destino de §5.2/AC-33(f), comprobar
`origin/main` y reservas, y congelar los manifiestos v14 con sus SHA-256 en un paso pre-DEV
autorizado con fixtures aislados. Después, y solo con autorización separada de DEV, implementar
E4.1. HANDOFF a CODEX con los hashes del commit y de los documentos; no merge ni despliegue.
