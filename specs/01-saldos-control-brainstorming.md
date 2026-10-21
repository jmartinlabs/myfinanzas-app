# 01 — E1.1 Saldos y atributos de control: Brainstorming
Status: IN REVIEW — Q1–Q8 y M1/M2 respondidas; contrato de aplicación confirmado en registros posteriores.
Roadmap/context: [E1.1](roadmap.md#e11--saldos-y-atributos-de-control),
[referencia v5.11](functional-reference-v5.11.md), [propuesta](01-saldos-control-specification.md).
Next action: revisar PR #6 con revisión M2 switches/default false y tema claro, aprobada el 2026-10-21; sin merge ni implementación.

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


## Respuestas confirmadas de Round 1 — 2026-10-20
Fuente: mensaje expreso del usuario «He revisado contigo las preguntas Q1–Q8…».
Este registro posterior sustituye el estado PENDING de las respuestas, sin editar las
preguntas/recomendaciones originales. Una respuesta no aprueba automáticamente todo
el texto de una recomendación ni la especificación completa.

### Q1 — Respuesta confirmada
Mantener los Tipos, Controles y atributos de MyFinanzas v5.11 y respetar las combinaciones
existentes, sin inventar restricciones adicionales. Finalidad, Objetivo (€), Liquidez,
Estado, Mostrar como bolsa y Permite salida a Exterior son independientes. Conservar
soporte conceptual para Manual, actualmente no utilizado.
**Límite:** no se ha aportado la matriz exhaustiva ni el vocabulario de Finalidad/Estado;
Objetivo sí queda confirmado como importe EUR. No se aprueban por extensión signo,
obligatoriedad, rango o efectos de Objetivo. Evidencia pendiente F1/F2.

### Q2 — Respuesta confirmada
Fecha de inicio del control, saldo de apertura y valor Manual separados. Admitir negativos
cuando expresen una posición financiera real. Ausencias no se convierten en cero, no se
inventan importes y se preserva la semántica de fechas del Excel.
**Límite:** el material disponible no prueba frontera temporal exacta ni obligatoriedad
por control. No se aprueba una fecha económica adicional obligatoria para Manual ni
un histórico de observaciones; Manual conserva soporte conceptual. Evidencia F3.

### Q3 — Respuesta confirmada
IDs inmutables, protección de S000, desactivación/reactivación y ningún borrado físico.
Inactivos fuera de nuevos desplegables, disponibles en histórico. Bloquear modificaciones
económicas que alteren operaciones históricas sin rectificación explícita.
**Límite:** no se aprueba prohibir todo cambio por la mera existencia de cualquier relación.
Detectar impacto real; conservar historia sin versionar todo el catálogo ni inventar
procedimiento de rectificación. La desactivación por sí sola no ajusta importes ni borra relaciones.

### Q4 — Respuesta confirmada (DT1)
Priorizar sencillez y mantenibilidad: único usuario, contraseña Argon2id, TOTP con aplicación
autenticadora, códigos de recuperación, sesiones seguras de 30 minutos de inactividad y
12 horas máximas, HTTPS en producción. Sin registro público, proveedores externos,
correo de recuperación ni administración innecesaria. Preferir biblioteca consolidada
cuando reduzca mantenimiento/riesgo. Recuperación excepcional solo local, justificada;
nunca acceso remoto alternativo.
**Límite:** no se autoriza un subsistema administrativo ni queda seleccionada/auditada
una versión concreta de biblioteca. Detalles técnicos menores pueden concretarse según
buenas prácticas; cambio de enfoque o vía de recuperación requiere revisión explícita.

### Q5 — Respuesta confirmada (DT2)
Sxxx como PK estable sin otra clave interna innecesaria, generación atómica en servidor,
sin reutilización y con continuidad tras S999.
**Detalle técnico menor:** formato de nuevas altas S + decimal con al menos tres dígitos
(S001…S999, S1000…); S000 reservado. No recodificar IDs históricos ni reiniciar por año.
No implica autorizar importación real o un esquema físico completo por extensión.

### Q6 — Respuesta confirmada (DT2)
Céntimos enteros para importes EUR de Saldos, sin FLOAT ni redondeos silenciosos;
aperturas negativas admitidas. Fechas económicas civiles, metadatos UTC. No aplicar
escala 2 a cantidades/precios/divisas de inversión. Límites técnicos suficientes, sin
restricciones financieras arbitrarias.
**Detalle técnico menor:** int64 SQLite con BigInt y transporte decimal textual;
se elimina el límite más estrecho sugerido en la ronda inicial. Signo/obligación de
Objetivo o Manual no se deducen de la aprobación expresa de aperturas negativas.

### Q7 — Respuesta confirmada como propuesta (DT6)
VACUUM INTO consistente, cifrado age y restauración probada. Objetivos iniciales
RPO 24 horas/RTO 2 horas, retención 7 diarias/4 semanales/3 mensuales. Ubicación externa
y custodia definitiva se deciden antes del despliegue. Sin contratación de servicios.
**Límite:** no se afirma una clave externa ya custodiada ni copia remota configurada,
ni se garantiza SLA. En futuro desarrollo local, claves/fixtures de ensayo fuera de Git;
no instalar age ni ejecutar backups en este STEP documental.

### Q8 — Respuesta y feedback de wireframes confirmados
Listado, ficha y formulario en página propia. Tabla en escritorio, tarjetas en móvil,
activos visibles por defecto e inactivos consultables. Valores no calculables y errores
claros. Respetar identidad visual MyFinanzas. Se confirma la estructura de los wireframes;
no se afirma que estilos, accesibilidad o pantallas hayan sido implementados/verificados.

## Contraste posterior y estado de cierre — 2026-10-20
Se releen R1/R2/R5/R6 y el §4 de la especificación funcional adjunta v5.11, fuera del
checkout. El Excel físico y sus manuales completos siguen sin incorporarse/inspeccionarse.
El documento recibido enumera Tipos/Controles y motores, pero no la matriz exhaustiva,
vocabularios de Finalidad/Estado ni el contrato completo de apertura/Manual.

Pendientes exclusivamente de evidencia, no nuevas decisiones inventadas:
- **F1:** matriz Tipo×Control y obligatoriedad de atributos por control de v5.11.
- **F2:** vocabularios de Finalidad/Estado, mapping activo/inactivo y condiciones de Objetivo (€).
- **F3:** semántica exacta de vigencia de apertura (frontera/fecha ausente) y contrato
  operativo de Manual si se pretende habilitarlo, más allá de conservar soporte conceptual.

Ver detalle y puertas de aceptación en la [especificación](01-saldos-control-specification.md#reservas-financieras-y-trazabilidad).
No volver a preguntar Q1–Q8 como si no existieran respuestas. Solicitar únicamente una
referencia sanitizada para estos detalles, sin pedir datos financieros personales.
La especificación se completa para revisión documental; no se declara lista para
implementación mientras F1/F2 y la parte de F3 aplicable a aperturas sigan sin demostrar.
Manual no se activa por inferencia. Aprobación final del documento y merge de PR #6
siguen pendientes. No iniciar E1.2 ni otros STEPS.


## Evidencia posterior F1–F3 — 2026-10-20
Fuente: mensaje del usuario «He revisado las reservas F1–F3 … directamente contra el
Excel físico estable MyFinanzas2026_v5.11(5).xlsx». Este registro posterior actualiza
las reservas descritas arriba; no reescribe preguntas, respuestas ni el contraste anterior.
El libro físico sigue fuera de Codex; la inspección se atribuye al usuario.

- **F1:** pares utilizados Exterior/Exterior, Efectivo/Movimientos, Efectivo/Terminal,
  Efectivo/No controlado, Efectivo/Inversiones e Inversión/Inversiones. Manual existe
  en fórmula sin registros. Soporte conceptual, sin habilitar pares Manual no contrastados.
  La muestra no demuestra una matriz exhaustiva de validez ni invalidez de otros pares.
- **F2:** Finalidad vacío/Gastos planificados/Ahorro/Inversión; Estado Activa/Inactiva;
  Objetivo (€) opcional sin valores actualmente informados; Liquidez, Mostrar como bolsa
  y Permite salida a Exterior Sí/No. Independientes; ni obligatoriedad ni cero implícito
  para Objetivo. Dominio/mapping de Estado y unidad/opcionalidad de Objetivo demostrados.
- **F3:** apertura es posición inicial, no Movimiento. Saldo actual Movimientos suma
  apertura+entradas−salidas; Inversiones/Efectivo incorpora además Compras/Ventas.
  Manual devuelve Valor manual o vacío. Terminal/No controlado/Exterior no tienen posición
  convencional. Saldo actual NO filtra Movimientos por Fecha apertura; histórico mensual
  sí comprueba esa fecha para no mostrar anteriores. Sin fecha efectiva Manual independiente.

La afirmación anterior «desde vigencia» no debe convertirse en filtro: queda corregida
para Saldo actual. No añadir filtro temporal o fecha Manual sin especificación y prueba
de equivalencia. [Referencia canónica](functional-reference-v5.11.md#evidencias-sanitizadas-f1f3-aportadas-por-el-usuario--2026-10-20).

Extremos residuales: exhaustividad Tipo×Control, obligatoriedad por control, signo de
Objetivo/Manual y detalle de comparación/fecha ausente en histórico mensual. Se registran
sin restricciones nuevas. Manual sigue conceptual y los motores/histórico siguen en sus
entregas posteriores. No se reabren Q1–Q8 ni se reclama evidencia ya aportada.
Se autoriza únicamente actualizar PR #6/documentación y checks. Aprobación final del
documento, merge e implementación continúan pendientes.


## Round 2 — Matriz de validaciones — 2026-10-20
Fuente de alcance: el usuario revisó PR #6/b47bfd1 favorablemente y pidió resolver
únicamente reservas que afecten validaciones, manteniendo PR documental.
Ver [matriz compacta](01-saldos-control-specification.md#matriz-compacta-de-campos-y-evidencia-de-validación).
Las evidencias F1–F3 y respuestas Q1–Q8 se conservan; no se reabren.

### M1 — Fecha apertura y Saldo apertura por par demostrado
Question: ¿Son obligatorios, opcionales o no aplicables para cada uno de los seis pares
demostrados, al crear/conservar el maestro? No se ha aportado completitud de registros
ni una regla física de obligatoriedad que permita clasificarlo con certeza.
- [x] Registrar la regla existente confirmada por campo/par, conservando ausencias;
  no sustituirlas por cero/fecha ni inferir filtro temporal de Movimientos.
- [ ] Definir una nueva regla de alta para la app, identificándola como cambio y
  revisándola expresamente, nunca atribuyéndola a v5.11.
Confirmed answer: PENDING; source/date: PENDING.

### M2 — Estado, Finalidad y los tres atributos Sí/No
Question: ¿Se exige elección explícita de Estado, Finalidad, Liquidez, Mostrar como
bolsa y Permite salida a Exterior al alta, o se admite vacío en algún par demostrado?
Finalidad incluye vacío en su dominio, sin evidencia de opcionalidad en todos los pares.
- [x] Separar dominio conocido de obligatoriedad; esperar confirmación de la regla
  existente sin predeterminar Activa/Sí/No ni derivar un atributo de otro.
- [ ] Acordar obligatoriedad nueva exclusiva de la app, diferenciándola de la fuente
  y preservando los datos anteriores que existan; requiere aprobación expresa.
Confirmed answer: PENDING; source/date: PENDING.

Las marcas son recomendaciones, no respuestas. S000 continúa protegido; sus campos no
se inventan ni se abre un flujo de edición. La ausencia de objetivos y registros Manual
es observación, no regla. Objetivo sigue opcional y sin restricción de signo inventada;
Manual previsto sin nuevas parejas habilitadas. Detalle mensual queda para histórico,
conservando Saldo actual sin filtro y sin fechas nuevas. No se solicita una matriz
universal ni se pregunta de nuevo por dominios/semánticas ya confirmados.
Próxima acción: respuestas M1/M2 y actualización de matriz; aprobación final/merge no recibidos.


## Respuestas confirmadas de Round 2 — M1/M2 — 2026-10-20
Fuente: mensaje expreso del usuario «Confirmo las decisiones M1 y M2 para la
especificación E1.1». Este registro posterior sustituye el PENDING de la ronda 2 sin
reescribir preguntas, recomendaciones, evidencias ni respuestas anteriores.
**Autoridad:** contrato aprobado para la NUEVA APLICACIÓN; no nuevas afirmaciones sobre
obligatoriedad física o fórmulas del Excel estable. Q1–Q8 y F1–F3 se conservan.

### M1 — Respuesta confirmada: Fecha apertura y Saldo apertura
| Tipo / Control demostrado | Fecha apertura | Saldo apertura | Función precisada por el usuario |
| --- | --- | --- | --- |
| Exterior / Exterior | No aplicable | No aplicable | S000 técnico y protegido |
| Efectivo / Movimientos | Opcional | Opcional | Conservar semántica física, sin nuevo filtro temporal |
| Efectivo / Terminal | Opcional | Opcional | Sin función actual demostrada |
| Efectivo / No controlado | Opcional | Opcional | Sin función actual demostrada |
| Efectivo / Inversiones | Opcional | Opcional | Preservar separación de datos y fórmula F3 |
| Inversión / Inversiones | Opcional | Opcional | Apertura monetaria sin función actual demostrada |
Confirmed answer: APPROVED — contrato de aplicación; source/date: mensaje del usuario, 2026-10-20.

Ausencia distinta de cero explícito. No introducir filtro por Fecha apertura en Saldo
actual; histórico mensual conserva su comprobación, sin inventar corte/fecha ausente.
No prohibir ni eliminar información existente por carecer de función en un motor.
«No aplicable» no autoriza limpiar datos ni crear una restricción física que los borre.
Opcionalidad de ambos campos no crea dependencia de informar uno para permitir el otro.

### M2 — Respuesta confirmada: Estado y atributos
- Estado: Activa por defecto al crear Saldo nuevo; desactivación/reactivación posterior.
- Finalidad: opcional.
- Liquidez: Sí/No, elección explícita.
- Mostrar como bolsa: Sí/No, elección explícita.
- Permite salida a Exterior: Sí/No, elección explícita.
- Objetivo (€): opcional.
Confirmed answer: APPROVED — contrato de aplicación; source/date: mensaje del usuario, 2026-10-20.

Los tres Sí/No son independientes, sin valores inferidos del Tipo/Control ni defaults.
S000 conserva tratamiento técnico/protegido: no aplicar un alta ordinaria para asignarle
atributos. Solo Estado tiene el default de creación aprobado; no implica cambiar
Estados existentes, reactivar registros ni rellenar otros campos.

### Secuencia confirmada y parada
Se autoriza actualizar documentos/criterios y PR #6, ejecutar checks e informar. Sin
merge, implementación, SQL ni E1.2. La revisión del diseño visual global de MyFinanzas
será el siguiente paso ANTES de desarrollar pantallas; se registra, no se inicia aquí.
La aceptación anterior de estructura de pantallas Q8 no equivale a aprobar ese diseño global.
M1/M2 quedan respondidas; no volver a formularlas. Aprobación final de esta versión
completa y merge de la PR siguen pendientes, sin ampliarlos por la aprobación de contrato.


## Aprobación visual comunicada por el usuario — 2026-10-21
Fuente: mensaje «He revisado y aprobado con Álex la primera propuesta visual de
MyFinanzas App». Actualiza el paso visual previsto en el registro anterior; no modifica
rondas, respuestas ni contratos financieros. No se afirma revisión independiente por
Codex de archivos gráficos/prototipos no recibidos.

**Diseño común aprobado:** profesional, compacto, orientado al control financiero;
identidad original verde #8DBB2E y paleta complementaria existente; menú lateral en
escritorio, navegación móvil adaptada; cabecera con ciclo financiado actual procedente
del maestro de Ciclos, distinguiendo estado temporal y cierre financiero; tablas
compactas escritorio y tarjetas móvil; componentes reutilizables en siguientes entregas.

**Pantallas aprobadas:** listado con búsqueda/filtros/estados; ficha con identificación,
configuración y atributos separados, ID visible/inmutable y edición en página propia;
alta/edición en tres bloques (Identificación, Configuración económica, Atributos de
control), tres Sí/No explícitos, Estado Activa inicial y opcionalidad M1/M2.

**Comportamiento confirmado:** responsive/accesible, sin importes ficticios de motores
no entregados ni vacío convertido en cero. Reglas financieras intactas. Sin Manual
operativo o pares Tipo/Control no contrastados. M1/M2 y Q1–Q8 no se reabren.

**Límite y evidencia:** el diseño descrito está aprobado; UI/componentes nuevos no están
implementados y sus comprobaciones a 390/1440, contraste/teclado/foco/estados y capturas
siguen futuras. En E1.1, mientras Ciclos no exista, cabecera «No disponible» sin fabricar
un maestro, selección o cierre para completar el dibujo. La integración real corresponde
a las entregas del roadmap; no amplía E1.1.

Se autoriza solo actualizar documentación común/especificación y PR #6 con checks.
Sin merge, pantallas, componentes, SQL, E1.2 ni otros pasos. Aprobación final de la versión
completa/PR sigue pendiente. Ver [guía visual](guidelines/ui.md) para contrato común y
[especificación](01-saldos-control-specification.md#screens-and-interfaces) para E1.1.


## Revisión aprobada M2 — switches y tema claro — 2026-10-21
Fuente: instrucción expresa del usuario «incorporar nuestra última decisión aprobada
sobre los controles booleanos». **Sustituye** la exigencia anterior de elección manual
obligatoria y controles segmentados Sí/No para Liquidez, Mostrar como bolsa y Permite
salida a Exterior. Se conserva el registro histórico; los textos anteriores dejan de
ser el contrato vigente en este punto. Es contrato de aplicación, no evidencia Excel.

- Switches en lugar de controles segmentados, independientes de Tipo/Control/Finalidad.
- Nueva alta ordinaria: los tres comienzan desactivados, No/false por defecto.
- Activado: fondo verde principal #8DBB2E, indicador blanco, etiqueta visible «Sí».
- Desactivado: fondo verde suave de la paleta MyFinanzas, indicador blanco, etiqueta
  visible «No». Desactivado significa off, no un control inutilizable.
- Edición: valor guardado, sin reinicializar; no aplicar defaults de nueva alta.
- Servidor: almacenar booleano explícito; POST ordinario aplica false a cada indicador
  omitido; PATCH omitido conserva su valor, incluido posible histórico ausente.
- Posibles ausencias de futuros históricos importados no son false: no convertirlas,
  rellenarlas ni mostrarlas como No silenciosamente. No se afirma que existan registros
  reales ausentes en el libro; la importación sigue fuera del alcance autorizado.
- Tema únicamente claro en esta fase, con fondos blancos/verdes suaves; sin modo oscuro.

Detalle técnico de validación: null explícito no es booleano válido en POST/PATCH
ordinarios; no usarlo como sinónimo de omitido ni convertirlo a false. El permiso de
preservar un histórico ausente no habilita crear ausencias nuevas en un alta ordinaria.
La futura UI distinguirá «Sin informar» de No, sin inventar un tercer estado de switch.

Confirmed answer: APPROVED — revisión M2 para aplicación y tema claro; source/date:
mensaje expreso del usuario, 2026-10-21. M1, Estado inicial Activa, opcionalidad de
Finalidad/Objetivo, S000 protegido y restantes reglas financieras siguen vigentes.
Actualizar documentación/PR/checks; sin merge, implementación, SQL o E1.2. Pruebas
visuales/funcionales futuras no se dan por ejecutadas por aprobar esta decisión.


## Aprobación final y autorización STEP 7 — 2026-10-21
Usuario confirma PR #6 aprobada y fusionada en ebfe75b, especificación/diseño E1.1 aprobados.
Posteriormente aprueba plan de seis bloques y autoriza $dev 01 en feat/e1-1-saldos,
con Handoff/estado dentro de la rama funcional. Fuente: solicitudes expresas del usuario.
Historial anterior intacto; sin nuevas decisiones financieras/visuales. Desarrollo solo
local/ficticio, Excel maestro, sin E1.2, despliegue o merge automático.
