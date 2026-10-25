# 12 — E2.6 Flujo mensual: Progress
Specification: [APPROVED rev3](12-flujo-mensual-specification.md)

## Current checkpoint

EXT-CODEX-DEV12 · 2026-10-25 · candidato publicado en [PR67](https://github.com/josemartin2000/myfinanzas-app/pull/67), pendiente de QA independiente; no integrado.
- Autorización real del usuario: «Autorizo dev12 conforme a la especificación y wireframes aprobado».
  Sustituye el gate anterior de desarrollo pendiente; no autoriza merge ni otros motores.
- Base `10bb794d793b7cd7c8f740831099e4dfb91c7340` (PR66), remoto reconsultado sin avance.
  Main actualizado por fast-forward desde7422d23; rama `codex/dev12-flujo-mensual`.
- Checkout asignado como único escritor; ownership código/pruebas E2.6, extensión central
  Nómina, progreso y testplan12. Tablero/otros worktrees excluidos.
- Cliente Codex Desktop, versión N/D; externo al coordinador. Inicio/parada y traslado:
  usuario; sin mensajes externos/subdelegación. QA independiente OpenCode UNRUN.
- Decisión real adicional: «Conservar ausencia de cobertura y subtotal Parcial».
  Se conservan ausencias, sin proveedor histórico ni identidad Ahorro inventados.
- Implementado: GET protegido/snapshot, componentes de consulta/cobertura/fuentes,
  motor mensual documental central y racional exacto, desgloses Deudas; sin persistencia nueva.
- Local: F13 y Q4/6 PASS; regresión Nómina22 PASS; tipos/build/baseline PASS;
  navegador4PASS, E2.6 focal finalPASS, capturas390/1440 inspeccionadas, contraste6,63:1.
  Dos casos de regresión ampliada FAIL por libc.so.6 en macOS; no repetidos ni omitidos.
  Detalle/56AC y UNRUN de integraciones condicionadas a fuentes ausentes en testplan.
- Permisos: refs/índice Git y navegador/servidores locales requirieron escalación;
  explicados en justification tras fallo sandbox. Responsable este ejecutor, sin eludir trust.
- Código revisado en `519978cbae0e5dbcd915d0859382f7057e029d4e`; este delta solo consolida
  checkpoint/evidencias. SHA HEAD candidato y resultado remoto full Linux vigentes en
  [PR67](https://github.com/josemartin2000/myfinanzas-app/pull/67), fuente de CI por SHA.
  Al redactar este checkpoint, CI estaba en curso; consolidar resultado en PR, sin otro
  commit documental únicamente para su verde. Sin merge/datos reales/Excel/VPS/deploy/B3/Dev32.
- Siguiente gate: QA independiente OpenCode sobre HEAD de PR67 y evidencia CI Linux del
  mismo SHA. El usuario traslada el paquete; aprobación de merge sigue separada.

## Tasks

| Incremento | Estado | Evidencia |
| --- | --- | --- |
| Autorización/preflight/mapa56AC | completado | este checkpoint/testplan |
| Referencia central Q4 y read model | implementado | Q4/F13 PASS |
| API protegida/UI de consulta | implementado | MFA/read model/E2E/capturas PASS |
| Candidato/validación/publicación | publicado, QA pendiente | PR67; CI por SHA en PR |

## Verified increments

Evidencias funcionales locales y límites por AC en testplan; QA independiente pendiente; CI Linux por SHA en PR67.
La evidencia histórica de spec/QA documental permanece identificada como historia.
Métricas de uso y versión del cliente no disponibles, no se inventan.

## Decisión de cobertura durante desarrollo — 2026-10-25

Fuente real del usuario en EXT-CODEX-DEV12: «Conservar ausencia de cobertura y subtotal Parcial»,
respuesta a la consulta sobre inexistencia de proveedor de integridad histórica del intervalo.
Se preserva el contrato de ausencia de rev3 y la frontera ya presente en E2.4: hechos
registrados consultables como subtotal Parcial; sin total bancario completo, S o margen
real por inferencia. No se instala proveedor ficticio ni fecha de inicio de control.
La referencia documental mensual y Base/Del mes y Liquidez actual son fuentes independientes.

Primer incremento Q4: 6 focales/32+ assertions y22 regresiones Nómina PASS; conjunto28tests,
197assertions. Typecheck PASS. macOS/Bun1.4.3; cambios aún sin commit. Repetición del focal
por nuevo caso integrado de abono parcial/revisión y ausencia de mutaciones, con regresión
E2.5 justificada por la extensión del motor. UI/CI/full/QA independiente UNRUN.
