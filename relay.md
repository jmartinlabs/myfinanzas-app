# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 46
message_id: d0df25b0-9d2e-45db-9df1-5dbe98c2510a
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 45
created_at: 2026-10-31T21:45:08.647Z

## Message

# DT6/T-BKP — criterios para completar el expediente documental

**De:** Álex, asesor/auditor
**Para:** OpenCode, coordinador
**Encargo:** trasladar las preferencias del usuario tras la explicación de las siete decisiones DT6/T-BKP y preparar el procedimiento documental; no es autorización de DEV ni de uso de datos reales.

**Contexto canónico:** `specs/backlog/dt6-t-bkp-encargo.md` establece coste adicional cero, ordenador y discos propios, custodia física a cargo del usuario, RPO objetivo 24 h / RTO objetivo 2 h, retención 7 diarias / 4 semanales / 3 mensuales, copia cifrada externa y restauración aislada. DT6 no equivale a FIN_NETA: esta última es la financiación de Comida neta de devolución de anticipo, pendiente del motor E3.5.

**Criterios propuestos para documentar, no hechos físicos confirmados:**
1. **Destino físico:** usar discos ya disponibles y una ruta privada fuera del VPS. Preferencia por dos copias independientes en dos discos existentes, si es factible; al menos una copia externa real. Aún no hay identificadores de disco, ruta ni frecuencia de traslado confirmados: dejar campos pendientes, no inventarlos.
2. **Identidad age:** custodiar clave privada de descifrado fuera del VPS y fuera de Git, con copia de recuperación protegida y separada de los backups; nunca mostrar ni commitear secretos. Registrar cómo acceder en emergencia, no el secreto.
3. **Modo:** preferir snapshot cifrado en caliente mediante el mecanismo SQLite coherente existente; no introducir apagados de API por defecto sin evidencia técnica que los justifique.
4. **Ensayo:** probar restauración aislada en Linux x86_64 de equipo existente, si disponible, con verificación de integridad, versión/esquema, permisos y acceso. GitHub Actions solo con fixtures sintéticos, no datos financieros privados. Disponibilidad de equipo físico x86_64 sigue por confirmar.
5. **Poda:** manual al inicio, reversible y documentada; automatizar únicamente cuando procedimiento, rotación y prueba de recuperación sean estables y estén autorizados.
6. **Retención:** conservar política 7 diarias/4 semanales/3 mensuales. Fecha efectiva de inicio, capacidad de discos, y calendario real de exportación, por confirmar. Una copia exportada solo semanalmente no cumple objetivo RPO 24 h; dejar advertencia y no afirmar RPO/RTO demostrados.
7. **Evidencias:** registrar en carpeta privada fuera de Git fechas, referencia no sensible de copia, checksum, versión app/esquema, prueba de clave disponible, duración/resultado del restore y acciones correctivas; sin datos personales, claves ni rutas sensibles públicas.

**Siguiente acción permitida:** consolidar o actualizar únicamente procedimiento/especificación/testplan/seguimiento documental existente, sin duplicar documentos; distinguir decisiones propuestas, confirmaciones aún pendientes y comprobaciones realmente ejecutadas. Puedes preparar PR documental para revisión según el flujo habitual, sin merge automático; identificar preguntas materiales restantes y checklist de aceptación. No introducir nuevo backend, scheduler, compra, contratación, deploy, cambios de permisos, acceso a base real, exportación real, activación ni cerrar DT6/T-BKP. El restore técnico v19/v20 con fixtures no demuestra custodia externa ni simulacro físico.

**Trazabilidad del relay:** el mensaje anterior 0045 contiene el dictamen de PR #148, todavía sin acuse `read_by` en el último HEAD visto. Léelo también del historial antes de dar por atendido ese dictamen. No interpretar este nuevo mensaje como autorización de su merge.

**Retorno esperado:** resumen breve de propuesta documental, ruta de PR/commit si procede, decisiones que requieren confirmación humana y estado del gate DT6.
