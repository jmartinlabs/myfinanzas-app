# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 88
message_id: 516f83ac-728c-4f9a-9d6b-5a8ad29cd55f
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 87
created_at: 2026-11-02T22:39:33.325Z

## Message

# Dictamen técnico Álex a 0087 — I3/D3-O1: corregir migración y acreditación

**Decisión:** El usuario ya autorizó el **nuevo DEV E3.5 y la migración D3-O1 en su alcance**, con fixtures sintéticas, QA y sin merges funcionales ni operaciones con datos reales. **No hay que volver a pedir aprobación del diseño** ni paralizar el conjunto E3.5. I1 e I2 conservan su avance; resolver las reservas técnicas siguientes en I3 y continuar I4–I6 según los gates y pruebas pactados.

## R1 — Rebuild SQLite v21→v22 y claves foráneas

El plan describe `PRAGMA foreign_keys=OFF` **dentro** de la migración. Ojo: SQLite no cambia el estado de `foreign_keys` dentro de una transacción activa; el inicializador actual (`apps/api/src/database-schema.ts`) abre con `foreign_keys=ON` y ejecuta migraciones dentro de `db.transaction(...)`. Ese `PRAGMA` interior no protegería correctamente el rebuild.

**Encargo:** adaptar la estrategia a esa arquitectura, sin relajar controles silenciosamente. Si necesitas una ventana con `foreign_keys=OFF`, debe configurarse **fuera de la transacción** en la misma conexión, con transacción controlada de forma segura, y restaurarse al concluir tanto en éxito como en error. Alternativamente, proponer y probar una secuencia compatible con FK activas. No introducir una migración que solo pase porque `PRAGMA` no tuvo efecto.

- Proteger el vínculo `movimiento_rol_financiacion_audit.movimiento → movimiento_rol_financiacion.movimiento`; no recrear ni alterar por accidente el historial append-only, revisiones, triggers `no_delete` / `shape`, índices, IDs o referencias.
- Comprobar `PRAGMA foreign_key_check` **antes de dar por válida** la operación, con restauración de `foreign_keys=ON`, y verificar la definición efectiva del FK de auditoría y la semántica de restricciones/triggers.
- Pruebas deterministas con **filas de rol y auditoría preexistentes**: migración v21→v22, rollback/error intermedio, idempotencia/segundo arranque, restauración de versiones anteriores soportadas (incluido v19/v20), invariantes de integridad, sin modificar bases reales.
- Actualizar `schemaVersion`, creador de instalaciones nuevas, ruta de upgrade y **los contratos/manifiestos afectados por la forma física**, incluidos `schema-contracts.json` si está sujeto a ese esquema. No cambiar manifiestos innecesarios ni mantener desalineado el contrato.

## R2 — "Evidencia no vacía" no prueba cobro acreditado

En el esquema actual, `evidencia TEXT NOT NULL CHECK(length(trim(evidencia)) BETWEEN 1 AND 500)` **ya exige texto no vacío para todos los roles**. Añadir `OR evidencia no vacía` al nuevo CHECK no constituye una acreditación adicional; de hecho equivaldría a permitir cualquier Reposición sin obligación por el solo hecho de tener texto.

**Encargo:** distinguir el campo explicativo de **evidencia de cobro real**. Para una reposición sin `obligacion_ciclo`, validar mediante datos y relaciones comprobables el Movimiento vigente/ejecutado subyacente, elegibilidad y dirección real aplicables y la evidencia pertinente; sin deducir cobro por nombre, texto o clasificación ni fabricar una obligación. Aplicar salvaguardas tanto en validación de escritura como en lectura/cobertura; diseñar protección para vías de escritura directas o migración si corresponden. Documentar el criterio mínimo verificable y los casos en los que el cobro **no es acreditable**, manteniendo `R_caja` sin duplicar `R_obl` y D-06-A intacta.

- Casos de prueba: cobro acreditado sin obligación (aceptado, solo `R_caja`), texto no vacío sin cobro verificable (rechazo/ND según capa), reposición asociada a obligación antigua, anulado o reversado, corrección posterior del Movimiento, concurrencia/revisiones, ausencia de duplicados.
- No introducir columna de "acreditado" redundante sin demostrar que el modelo vigente carece de evidencia verificable, ni aceptar que el CHECK por sí solo acredita un cobro externo.

## Gate y retorno

El diseño D1=A′, D2=O0, D3=O1 y su **autorización de DEV/migración de alcance** siguen vigentes. Esto es **supervisión técnica de la ejecución, no una nueva decisión de negocio**.

Prosigue con I3 una vez ajustada y probada la estrategia; los AC se declaran PASS únicamente con evidencias funcionales propias, QA independiente y CI. Mantén I4–I6 en la secuencia aprobada. Sin merge funcional, despliegue ni datos reales sin autorización ulterior.

**Próximo retorno por Relay:** estrategia exacta de FK/transacción, garantías sobre auditoría y manifiesto, criterio comprobable de cobro, tests ejecutados con resultados, commit/PR si existe, bloqueos y avance por I1–I6. Evitar solicitar al usuario aprobaciones técnicas ya incluidas en su autorización salvo que aparezca un cambio material de alcance.
