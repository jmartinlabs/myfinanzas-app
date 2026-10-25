# 13 — Anticipos y pendiente por caso: Progress
Specification: [rev3 aprobada](13-anticipos-specification.md)

## Current checkpoint
Current state: CANDIDATE FOR INDEPENDENT QA — implementación local fijada; aceptación global ABIERTA (CI Linux full y QA pendientes; integración de corrección con Cierres no verificada).

- Authorized scope / approval source: usuario «Pues empieza», recibido por coordinador 2026-10-25 tras PR70/Q9 aprobada/integrada; gate de cuota normal99%5h/69%semanal. B13-1 resuelto, sin reabrir Q1–Q9.
- Repository / checkout / branch / candidate SHA and pending changes: `/private/tmp/myfinanzas-spec13-q9-review`, `codex/dev13-anticipos-q9`; código y arquitectura `6e8dad350a55a7af61f00a90f6ea97d08d0146f5`, base `fa8a01ee72ee622e6d3f71cd170e5d399376473e`. Este checkpoint/testplan se consolidan en commit documental posterior; tablero ajeno del coordinador preservado y excluido.
- Client(s) / worker IDs / start-stop owners / uncontrolled workers: ejecutor Codex gpt-6.1-sol/low, sin subdelegación; QA independiente corresponde al coordinador. Sin otros escritores de producto.
- Preflight / permission-sensitive operation owners / blockers: Bun1.4.3/Python3.12; dependencias frozen instaladas por coordinador tras aprobación legítima del usuario. Coordinador fue operation owner de browser fuera del sandbox (solicitudes invisibles interrumpidas, sin bypass); recursos3001/3008/5173 liberados al terminar. Solo DB ficticias, sin datos reales, Excel, VPS, deploy o SQL operativo.
- Checks / QA evidence / environment: focal17PASS/0FAIL/158assertions; tipos/buildPASS; baseline canónicoPASS; browser1PASS,22PNG390/1440 inspeccionadas y contraste real acción>=4.5:1. Application canónicoFAIL:141PASS/45FAIL en API, E2E canónicoUNRUN; browser focal separadoPASS no lo sustituye. Resultados y causas agrupadas en testplan; no aceptación global43/44 inferida.
- PR / CI / merge state, source and last verified time: sin push/PR de implementación/CI remoto/merge por ejecutor. Remoto real `github`; `origin` es clon local, no publicar. Main y dev12 preservados; base PR70 integrada acreditada por coordinador y checkout.
- Next safe action: coordinador revisa diff/candidato y dispone QA independiente+CI Linux full; aceptación global permanece abierta, en especial protecciones externas AC36. Publicación/merge según gates propios; no reanudar B3/Dev32 por inferencia.

## Tasks

| Task | Status | Commit / evidence |
| --- | --- | --- |
| Verificar checkout, autorización, contrato y guías aplicables | done | Base fa8a01e; rev3+Q9 aprobadas/integradas |
| Crear progreso y matriz completa antes de código | done | 44 AC antes de código; diseño y resultados separados |
| Resolver acreditación de rol/orientación B13-1 | done | Q9 aprobada/integrada PR70; fuente por ID y acción explícita |
| Implementar persistencia mínima/alta atómica/motor y servicios comunes | done | 6e8dad3; alta1:1 también por Referencias, metadatos por ID, banco único |
| Implementar foto explícita/corrección y protección Inicio | candidate | 6e8dad3; positiva aislada con proveedor, runtime bloquea protección no verificable; integración AC36 UNRUN |
| Implementar UI y flujos comunes de devolución | done | 6e8dad3; tabla1440/tarjetas390, pares, formulario común, acreditación y foto explícita |
| Verificar focales/full/browser390/1440, diff y candidato | partial | Autor focal/browser/tipos/build/baselinePASS; API globalFAIL, Linux CI/QA pendientes |

## Verified increments
2026-10-25, reanudación actual: implementación Q9 por servicio común, alta atómica, read model único para global/pares/preview de acreditación y suma común para apertura histórica. Sugerencia vacía/same-day ambigua ND; cero/negativo solo con evidencia. Foto persiste separada del pendiente actual. Rectificación/anulación revalida dependencias y protege aperturas; Cierres no se simula. Esquema12 genuino conserva banco, asignaciones y acceso; fallo de DDL hace rollback. Referencias Anticipo siempre crean ficha en transacción, sin conversión ordinaria parcial.

Focal17/158, browser con MFA real y22PNG, contraste de acción real, tipos/build y baseline verifican el candidato; la última extracción de suma común no cambió la UI capturada y se revalidó con focal/tipos. Lectura manual de diff e índice sin datos reales/factores/DB, check-repositoryPASS. No subida de logs/capturas ni push del ejecutor.

### Historia del intento suspendido previo
2026-10-25, checkout indicado: `git status --short --branch`, `git remote -v`, `git rev-parse HEAD`, `git log -1` confirman base/branch/remotos. Bun `--version` = 1.4.3; Python runtime `--version` = 3.12.14. Revisión de AGENTS, skill dev, rol implementation, README, contrato13/brainstorming, arquitectura/UI/security/quality y fuentes relevantes. Sin instalación, procesos de aplicación o tests funcionales iniciados; no hubo fallo de sandbox que requiriese escalación.

## Decisions
Rev3+Q9 son el contrato aprobado de esta implementación. Sin decisiones financieras nuevas. La descripción B13-1 inferior conserva el diagnóstico histórico anterior a su aprobación, no revoca Q9 ni la reanudación actual. El código no duplica el hecho ni importes derivados. [Arquitectura](guidelines/architecture.md), [seguridad](guidelines/security.md).

## Errors, regressions and blockers

B13-1 es histórico y está resuelto por Q9 aprobada/integrada y reanudación expresa. Se preserva el diagnóstico previo como historia, no bloqueo vigente.
### B13-1 (histórico resuelto) — Falta fuente verificable del rol adelanto/devolución
`apps/api/src/movement-ledger.ts` (`LedgerRow` y `ledgerRows`) y el esquema canónico E1.5/E1.6 registran origen/destino/Referencia; no rol Adelanto/Devolución, vínculo al adelanto ni orientación acreditada del par. El tipo Anticipo aún está bloqueado en `reference-rules.ts`; no hay ficha de caso previa con otro dato fiable. La búsqueda de Anticipo/adelanto/devolución en `apps/api/src` y `apps/web/src` no revela una fuente alternativa.

La ronda2 de [brainstorming13](13-anticipos-brainstorming.md) reconoce que E1.5 no aporta clasificación; Q7 final exige pares fiables y prohíbe elegir por fecha/importe/proximidad. `A→B 1000` y `B→A 500` con la misma REF no acreditan por sí solos qué hecho es adelanto: podrían corresponder a adelanto1000+recuperación500 (neto500) o a la orientación inversa/roles históricos distintos. Primer ID, primera fecha, concepto o nombre no son evidencia aprobada. Bloquear todo caso ordinario tampoco cumpliría AC05/06/17/27.

Impacto: motor, estados, fechas, devolución guiada y sugerencia histórica no pueden implementar sus criterios ordinarios sin una regla nueva o una fuente explícita. Es bloqueo financiero, no detalle técnico. No se han cambiado AC actuales a futuros ni se afirman pruebas superadas.

Propuesta mínima para decisión del usuario (Q9 del coordinador): asociar a cada ID de Transferencia canónica una metadata auditada de rol Adelanto/Devolución y par/orientación verificable. El alta por formulario común registra la declaración explícita en la misma transacción del hecho; devolución guiada fija el rol y valida inversa/REF/par. Histórico sin respaldo conserva hechos intactos y muestra No disponible/Revisar hasta declaración explícita con evidencia por IDs; rectificación/anulación debe revalidar metadata y agregados. No duplicar importes ni crear un segundo hecho financiero. La elección entre metadata por hecho u orientación por par exige contrato aprobado suficiente; esta propuesta no altera la spec por sí misma.

Criterio de desbloqueo: confirmación expresa de la fuente/acción de acreditación, persistencia auditada mínima y tratamiento histórico/rectificación, incorporada por el coordinador al contrato vigente. QA financiera debe comprobar tanto los casos ordinarios como la negativa a inferir roles.

## Next action
See the current checkpoint; do not maintain a second next-action value here.
