# 01 — E1.1 Saldos y atributos de control: Brainstorming
Status: DRAFT — primera ronda pendiente; recomendaciones no aprobadas.
Roadmap/context: [E1.1](roadmap.md#e11--saldos-y-atributos-de-control),
[referencia v5.11](functional-reference-v5.11.md), [propuesta](01-saldos-control-specification.md).
Next action: recibir respuestas Q1–Q8 y feedback de wireframes; no cerrar especificación.

## Confirmaciones recibidas antes de Round 1
Fuente: solicitud expresa del usuario de STEP 5 para E1.1, 2026-10-20.
- Se autoriza análisis, propuesta documental, rama y PR para revisión; no merge.
- Alta, consulta, edición, desactivación/reactivación, IDs Sxxx inmutables y atributos
  independientes forman el alcance. Seguridad/integridad/reglas nuevas requieren aprobación.
- Stack y cuatro épicas/30 entregas ya aprobados; no reabrirlos. Sin E1.2, implementación,
  DDL ejecutable, migraciones, importación real, servicios de producción ni contratación.
- Excel estable v5.11 sigue como maestro hasta P7. Solo fixtures ficticios deterministas.
- Las reglas confirmadas R1/R2/R5 y P1–P7 conservan su autoridad; esta propuesta no las amplía.

## Round 1 — 2026-10-20
Las casillas marcadas son recomendaciones del agente, NO respuestas del usuario.
Una respuesta parcial no aprueba las restantes. Añadir respuestas debajo en una nueva
entrada con fuente/fecha; conservar esta ronda sin reescribirla.

### Q1 — Combinaciones y vocabularios financieros
Question: ¿Puedes confirmar la matriz Tipo×Control válida y los valores/semántica de
Finalidad, Objetivo y Estado, mediante reglas sanitizadas sin datos personales?
- [x] Mantener pendientes las combinaciones no demostradas y solicitar ese contrato;
  solo están expresamente identificados Exterior/Exterior para S000 e Inversiones
  con Efectivo o Inversión. No asumir que los demás controles son solo Efectivo.
- [ ] Aprobar una nueva matriz/vocabulario explícitos para la app tras revisar diferencias.
Confirmed answer: PENDING; source/date: PENDING.
No se asume que Objetivo sea un importe, una categoría o un booleano, ni que Estado
incluya únicamente activo/inactivo en el sistema de origen. El ciclo de vida solicitado
sí debe representarse, con su mapping pendiente si Estado significa algo adicional.

### Q2 — Apertura, vigencia y valor Manual
Question: ¿La apertura se aplica al comienzo de la fecha de inicio, qué fechas/importes
admite y qué campos son obligatorios por control? ¿El valor Manual lleva fecha efectiva?
- [x] Proponer fecha civil explícita, importe de apertura separado del valor Manual y
  nunca inventar apertura cero. Solicitar confirmación de frontera inclusiva, negativos,
  precisión y significado de ausencia antes de fijar validaciones o fórmulas.
- [ ] Una observación manual histórica por fecha en vez de un único valor vigente;
  amplía la capacidad y el esquema, requiere justificar necesidad en E1.1.
Confirmed answer: PENDING; source/date: PENDING.
No se interpreta ausencia como cero, no se generan Movimientos de apertura y no se
reconstruye histórico. La fórmula de Movimientos existente no autoriza cambiar su vigencia.

### Q3 — Edición, desactivación e historia
Question: ¿Apruebas impedir borrado físico, reservar S000 como sistema y esta política
propuesta de cambios sensibles/desactivación/reactivación?
- [x] ID inmutable/no reutilizable; nombre editable; sin borrar ni siquiera no usados;
  S000 visible como técnico y sin edición/desactivación ordinaria. Desactivar excluye
  nuevas selecciones, mantiene historia y permite reactivar. Con dependencias activas,
  mostrar impacto y bloquear hasta resolverlas. Tras existir hechos, bloquear cambio
  ordinario de Tipo/Control/apertura/vigencia/Manual; rectificación expresa pendiente.
  Cambios de Liquidez/Finalidad/Objetivo/bolsa/permiso se revisan por impacto, sin
  reescribir fotos ni aplicar restricciones retrospectivas a hechos válidos.
- [ ] Permitir correcciones económicas usadas con un procedimiento de impacto ahora;
  exige concretar fuentes, cierres, autorización, auditabilidad y efectos temporales.
Confirmed answer: PENDING; source/date: PENDING.
La prohibición de borrado y los bloqueos propuestos son nuevos controles de la app,
no reglas atribuidas automáticamente a P4 (que trata clasificación). Cambiar solo el
nombre mantiene relaciones por ID; tratamiento del nombre mostrado en fotos compete a DT4.

### Q4 — DT1: método, sesiones y recuperación
Question: ¿Apruebas contraseña Argon2id + TOTP, sesiones servidor (30 min inactividad,
12 h máximo, sin recordar), MFA también local y recuperación sin correo ni proveedor?
- [x] Propuesta DT1 en la especificación: Bun.password nativo, una dependencia TOTP
  mantenida por evaluar (`otpauth`), códigos de recuperación de un uso y rescate local
  administrativo para pérdida total. Secretos TOTP cifrados con clave fuera de SQLite/Git;
  invalidar sesiones al recuperar y exigir reenrolado de MFA. Sin registro público.
- [ ] Passkeys/WebAuthn como alternativa principal; mejor resistencia al phishing,
  pero exige diseñar dispositivos de reserva, recuperación y validación de segundo factor.
- [ ] Proveedor de identidad externo con MFA; menor implementación propia, a cambio
  de dependencia externa, exposición de metadatos, disponibilidad y coste potencial.
Confirmed answer: PENDING; source/date: PENDING.
Confirmar también límites/timeout propuestos, custodia de clave y aceptación de TOTP
(no resistente al phishing). No elegir proveedor ni instalar paquetes en esta etapa.

### Q5 — DT2: identidad y persistencia
Question: ¿Apruebas Sxxx como clave primaria textual, sin ID sustituto, y los contratos
relacionales/atómicos propuestos, con revisión optimista y auditoría técnica de cambios?
- [x] SQLite STRICT, SQL directo parametrizado, claves foráneas sin borrado en cascada,
  creación y reserva de ID atómicas; no reset anual/no reutilización, S000 reservado.
  ID generado en servidor para nuevas altas; preservar IDs existentes solo por futura
  migración autorizada. Proponer mínimo tres dígitos y extensión tras S999, pendiente
  de confirmar formato. No imponer unicidad económica al nombre: avisar duplicados.
- [ ] Clave interna INTEGER y código Sxxx UNIQUE inmutable: más indirección y joins,
  útil solo si se necesita independencia de identificador que todavía no consta.
Confirmed answer: PENDING; source/date: PENDING.
El esquema es un diseño lógico propuesto, no DDL aprobado. Objetivo/Finalidad y matriz
no se fijan físicamente hasta Q1. La auditoría no introduce versiones de catálogo.

### Q6 — DT2: moneda, fechas y límites
Question: ¿Confirma v5.11 que apertura y valor Manual de Saldos se expresan en EUR con
máximo dos decimales? ¿Qué rango y signo son válidos? ¿Apruebas fechas civiles ISO y
metadatos UTC, dejando precisión de inversión/cambio para su entrega?
- [x] Si se confirma escala 2: INTEGER de céntimos con BigInt y JSON decimal canónico
  en texto; rechazo de decimales extra, sin redondeo silencioso. Proponer límite técnico
  ±9 000 000 000 000 000 céntimos, no un límite financiero; negativos según Q2.
  Fecha económica YYYY-MM-DD válida; instantes de seguridad/auditoría UTC, visualización
  Europe/Madrid. No sustituir fecha financiera por reloj.
- [ ] Decimal canónico TEXT con escala explícita y operaciones exactas si los Saldos
  requieren más precisión; sin aritmética FLOAT ni conversión por Number.
Confirmed answer: PENDING; source/date: PENDING.
No universalizar escala 2 a cantidades, precios, divisas o tipos de cambio de inversión.

### Q7 — DT6: objetivos y custodia
Question: ¿Apruebas copias consistentes con VACUUM INTO + cifrado age, objetivo local
RPO 24 h/RTO 2 h, 7 diarias/4 semanales/3 mensuales y clave privada custodiada fuera
 del equipo? ¿Tienes una ubicación separada bajo tu control para esa clave?
- [x] Copia diaria y antes de cambios autorizados de esquema; snapshot consistente
  validado, cifrado por destinatario público, publicación atómica y restauración
  mensual aislada. En E1.1 solo fixtures/local: ensayo medido, no promesa de SLA.
  No depender de un backup en el mismo disco para recuperación ante pérdida del equipo.
- [ ] Solo snapshot con aplicación detenida y copia de la base consolidada: menos
  tooling, pero introduce indisponibilidad y disciplina operativa para cada copia.
- [ ] Restic con repositorio cifrado como solución integrada futura: retención/copias
  remotas más completas, a cambio de herramienta y configuración operativa adicionales.
Confirmed answer: PENDING; source/date: PENDING.
`age` sería una herramienta nueva justificada, pendiente de aprobación/versionado; no
instalada. Copia externa futura cifrada en ubicación independiente UE por decidir DT10;
no proveedor elegido, contratado ni configurado. Sin destino/operador no prometer automatización.

### Q8 — Interacción y presentación
Question: ¿Apruebas listado + ficha y formulario en página propia, filtros de activos por
defecto, inactivos/técnico consultables, confirmación de desactivación y los wireframes?
- [x] Propuesta de pantallas en la especificación; móvil con tarjetas y formulario de
  una columna, escritorio tabla legible y formulario por secciones. Valor ausente
  acompañado de motivo, nunca 0 por defecto. Campos económicos sensibles con impacto.
- [ ] Edición en panel lateral/modal: menos navegación, mayor complejidad de foco,
  espacio en móvil y recuperación tras errores.
Confirmed answer: PENDING; source/date: PENDING.
Feedback de wireframes: PENDING. No hay capturas ni pruebas visuales de pantallas aún no implementadas.

## Coverage
Requisitos/ciclo de vida Q1–Q3; pantallas/interacción Q8; datos y contratos Q1/Q2/Q5/Q6;
API/acceso/dependencias Q4/Q5; validaciones/errores/historia Q1–Q6; recuperación Q7.
Las preguntas resuelven lo ausente sin reabrir stack, motores documentados ni P1–P7.

## Wireframes
Ver [pantallas propuestas](01-saldos-control-specification.md#screens-and-interfaces).
Requieren feedback antes de finalizar; ninguna elección visual equivale a aprobar DT1/DT2/DT6.

## Append-only clarifications
Sin respuestas posteriores todavía. Próxima entrada: respuestas explícitas Q1–Q8,
fuente/fecha, discrepancias y nueva ronda solo si sigue faltando una decisión material.
