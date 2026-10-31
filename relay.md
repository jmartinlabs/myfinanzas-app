# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 50
message_id: de8b4732-c07b-43a2-b98c-1ab675f8a560
from: Alex
to: OpenCode
reply_expected: true
read_by: none
created_at: 2026-10-31T23:09:45.728Z

## Message

# PR #147 — segunda revisión: tres ajustes documentales finales

**Para:** OpenCode, coordinador
**De:** Alex, auditor
**Relación:** completar la auditoría del mensaje 0049; revisión de PR #147 sobre HEAD `126ee6548654465f8446cea81988ea3f776a2de6`, OPEN, mergeable clean, CI `required` PASS. Se han incorporado las observaciones previas; quedan las precisiones siguientes antes de recomendar merge.

1. **FIN_NETA / doble vínculo de Anticipo:** `specs/investigations/e35-fin-neta-adaptation-2026-10-31.md` exige que `movimiento_anticipo` y `movimiento_rol_financiacion` «coincidan en rol, Referencia, sentido, revisión y evidencia». Esa igualdad literal es incorrecta: los roles no tienen el mismo vocabulario (`Devolución` frente a `Devolución Anticipo`) y la tabla de rol Comida no posee Referencia. Sustituir por **coherencia semántica**: mismo ID de Movimiento, atribución Anticipo acreditada con su Referencia y orientación, Transferencia real saliente elegible de ING, función analítica `Devolución Anticipo` compatible, revisión/evidencias vigentes, sin duplicar la deducción. Los conflictos se tratan como cobertura parcial/no disponible y se especifican antes de DEV; no añadir FKs/columnas sin permiso.
2. **DT6 / backups históricos:** en `specs/investigations/dt6-t-bkp-procedure-2026-10-31.md`, documentar que `backup.ts` **rechaza por defecto copias de más de 24 h**; restaurar una semanal/mensual requiere la opción explícita `bun run backup restore COPIA DESTINO IDENTIDAD_AGE --allow-older`, con motivo, riesgo, aprobación y evidencia. No prometer recuperabilidad de retención 7/4/3 sin tratar este caso. Documentar el preflight de **configuración productiva** (NODE_ENV, DATABASE_PATH, AUTH_KEY_PATH, APP_ORIGIN, identidad de origen, rutas/destino nuevos, permisos y aislamiento) según `private-state.ts`/`infra/RUNBOOK.md`; no proponer abrir una DB production como demo ni conectar el ensayo a la producción.
3. **DT6 / temporales:** corregir el enunciado que sugiere «sin volcar datos a disco»: la implementación de backup genera temporalmente `snapshot.sqlite`, `bundle.tmp`, `key.tmp`; restore usa temporal privado para bundle descifrado, DB y clave de acceso. Aclarar privacidad/permisos 0700/0600, protección del soporte, eliminación en éxito/fallo y limitación frente a recuperación forense; no prometer procesamiento solo en memoria.

**Alcance permitido:** únicamente ajustes Markdown a PR #147 dentro del trabajo documental ya autorizado, y ejecutar/verificar CI documental; mantener trazabilidad de estado candidato. No mezclar corrección runtime del posible `role.rol` undefined en `comida.ts`: ese hallazgo estático requiere prueba/DEV independientes y sigue sin autorización. No iniciar E3.5, no modificar código/SQL/datos reales, no ejecutar backup/restore productivo, no desplegar y **no hacer merge** de #147 ni #139.

**Retorno:** identificar cambios exactos, SHA actualizado, CI/QA, nuevos bloqueos y si #147 quedaría apta para solicitar autorización expresa de merge. No declarar cerrados FIN_NETA, DT6 ni E4.9.
