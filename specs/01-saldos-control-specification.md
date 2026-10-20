# 01 — E1.1 Saldos y atributos de control: Specification
Status: IN REVIEW — versión completada para revisión tras Q1–Q8; F1–F3 incorporadas y contrato M1/M2 de aplicación aprobado; sin implementación.
Approval source/date: decisiones Q1–Q8 y estructura visual confirmadas por el usuario el 2026-10-20.
M1/M2: contrato aprobado por el usuario el 2026-10-20, distinto de evidencia del Excel.
Aprobación final de esta versión completa, merge e implementación: PENDING / no autorizados.
Context and brainstorming: [ronda 1](01-saldos-control-brainstorming.md),
[roadmap E1.1](roadmap.md#e11--saldos-y-atributos-de-control),
[referencia funcional](functional-reference-v5.11.md).

## Autoridad y alcance
El usuario autorizó actualizar/completar la documentación y la PR #6 tras responder
Q1–Q8 el 2026-10-20. Sus respuestas están registradas de forma append-only en el
brainstorming. Esta versión integra esas decisiones y los detalles técnicos menores
resueltos bajo su autorización. No extiende su aprobación a reglas económicas no
probadas ni a parámetros/recomendaciones del borrador que no confirmó. Posteriormente
el usuario contrastó F1–F3 contra el Excel físico y aportó evidencia sanitizada; registro
append-only en brainstorming y precisión canónica en la referencia funcional. M1/M2
se aprobaron después como contrato de la aplicación, no como hechos del Excel. La
revisión visual global se prevé como siguiente paso antes de desarrollar pantallas.

Se conocen el extracto y la especificación funcional recibida, no el Excel físico ni
sus manuales originales completos. Solo reglas sanitizadas y fixtures inventados en
este documento. Excel v5.11 conserva la condición de maestro hasta P7. No se altera
el roadmap, el stack ni P1–P7. Sin implementación, archivos SQL, migraciones ni despliegue.

## Functionality

### Hechos confirmados y disponibilidad por entrega
| Aspecto | Contrato confirmado de la fuente | Alcance E1.1 especificado |
| --- | --- | --- |
| Identidad | Sxxx estable, único, no reutilizable; nombre no es clave | Alta/consulta/edición por ID; generación atómica, al menos tres dígitos y continuidad S1000; Q5 confirmado |
| Tipo | Exterior, Efectivo, Inversión | Atributo independiente de Control; seis pares utilizados demostrados F1, sin asumir exhaustividad ni invalidez del resto |
| Control | Exterior, Movimientos, Terminal, No controlado, Inversiones, Manual | Mostrar motor y disponibilidad, no inventar uno |
| Movimientos | Apertura + entradas − salidas, sin filtro por Fecha apertura en Saldo actual | Configurar apertura/fecha y conservar distinción actual/histórico; cálculo E1.4, no E1.1 |
| Inversiones + Efectivo | Apertura + entradas − salidas de Movimientos − Compras + Ventas | Configuración, posición no disponible hasta E4.1/E4.2; sin falso cero |
| Inversiones + Inversión | Valoración agregada de posiciones de inversión | No implementar ni duplicar tblInversionesResumen; hasta E4.3 no disponible |
| Manual | Valor manual autorizado | Valor manual directamente o vacío si ausente; sin fecha efectiva propia. Soporte conceptual, sin habilitar pares no contrastados |
| Terminal | Financiación por transferencia y gasto desde terminal, sin duplicar compras | Maestro consultable; sin posición monetaria ficticia ni operaciones todavía |
| No controlado | No fingir posición calculada | Maestro consultable; etiqueta «No controlado», importe no aplicable |
| Exterior | S000 contraparte técnica, no cuenta patrimonial disponible | Registro de sistema visible como tal; protección confirmada Q3 |
| Liquidez | Solo Sí integra colchón; independiente de Finalidad/bolsa/permiso | Guardar atributo; sin sumar colchón ni fabricar KPI en E1.1 |
| Finalidad, Objetivo (€), bolsa, Estado | Independientes de apertura/permiso y entre sí; Q1 confirmado | Dominios F2 recibidos; Objetivo EUR opcional, Estado Activa/Inactiva; no derivar atributos ni rellenar ausencias |
| Permite salida a Exterior | Regla de salida directa, no inferida del banco o finalidad | Configurar explícitamente; su aplicación a operaciones llega con E1.4/E1.6 |

Para Terminal no se inventa aquí fórmula, apertura ni relación con un banco: fuente
no proporciona ese detalle. Un Control Manual no convierte un Tipo Inversión en un
nuevo tipo de operación ni reemplaza las reglas de valoración de posiciones de R5.

### Matriz compacta de campos y evidencia de validación

Fuentes separadas: Q1–Q8, evidencia Excel F1–F3 aportada por el usuario y contrato de
aplicación M1/M2 aprobado expresamente el 2026-10-20. No se atribuye el contrato nuevo
al Excel físico, no inspeccionado por Codex. Solo se listan los seis pares demostrados,
sin convertirlos en una matriz exhaustiva de validez/invalidez de otros pares.

**Leyenda:** **R-C** identidad/tipado confirmados; **R-T** nombre requerido por contrato
técnico ya propuesto, no evidencia Excel; **O-A** opcional por contrato de aplicación;
**NA-A** no aplicable por contrato de aplicación, sin prohibir conservar datos;
**DEF-A** Estado Activa por defecto al crear, por contrato de aplicación; **E-A**
Sí/No de elección explícita obligatoria, independiente y sin default, por contrato de
aplicación; **SYS** registro técnico protegido, sin alta/edición ordinaria; **N-M**
no usado como entrada del motor de ese control, no prohibición de almacenamiento;
**D** resultado derivado, no entrada manual; **N-C** sin posición convencional (F3).

| Campo | Exterior / Exterior | Efectivo / Movimientos | Efectivo / Terminal | Efectivo / No controlado | Efectivo / Inversiones | Inversión / Inversiones |
| --- | --- | --- | --- | --- | --- | --- |
| ID, Tipo, Control | R-C, S000 protegido | R-C | R-C | R-C | R-C | R-C |
| Nombre | R-T / SYS | R-T | R-T | R-T | R-T | R-T |
| Estado | SYS | DEF-A | DEF-A | DEF-A | DEF-A | DEF-A |
| Finalidad | O-A / SYS | O-A | O-A | O-A | O-A | O-A |
| Objetivo (€) | O-A / SYS | O-A | O-A | O-A | O-A | O-A |
| Liquidez / Mostrar como bolsa / Permite salida a Exterior (cada uno independiente) | SYS | E-A | E-A | E-A | E-A | E-A |
| Fecha apertura | NA-A / SYS | O-A | O-A | O-A | O-A | O-A |
| Saldo apertura | NA-A / SYS | O-A | O-A | O-A | O-A | O-A |
| Valor manual | N-M / SYS | N-M | N-M | N-M | N-M | N-M |
| Saldo actual (resultado, no campo de alta) | N-C | D, futuro E1.4 | N-C | N-C | D, futuro E4 | D, futuro E4 |

M1: en Efectivo/Terminal y Efectivo/No controlado, los dos campos de apertura son
opcionales sin función actual demostrada. En Inversión/Inversiones ambos son opcionales
y la apertura monetaria no tiene función actual demostrada. No inventar fórmulas para
usarlos ni exigir cero. En los cinco pares ordinarios son opcionales de forma independiente:
puede faltar uno, ambos o ninguno; no exigir completar uno para permitir el otro.

NA-A en Exterior/Exterior afecta a aplicabilidad del contrato y formulario; S000 no
admite alta/edición ordinaria. No imponer un CHECK que prohíba conservar información
existente, ni limpiar campos sin función demostrada. SYS no inventa valores de Estado,
Finalidad o indicadores del S000 existente ni le aplica el default de una nueva alta.

M2: solo Estado dispone del default aprobado Activa para una NUEVA alta ordinaria.
Desactivar/reactivar cambia Estado sin crear otro ID ni tocar apertura. Finalidad y
Objetivo son opcionales; no convertir su ausencia en una categoría, importe cero ni
valor derivado. Los tres Sí/No se eligen expresamente, también cuando se elige No;
no preseleccionar No/false ni inferirlos de Tipo/Control o de otro atributo.

Detalle técnico de API: en POST, Estado omitido aplica Activa; un null explícito no es
un Estado válido. Los tres booleanos deben estar presentes con valor válido (false/No
es elección explícita, distinto de omitido/null). En PATCH, omitir un campo conserva
su valor; no reaplicar defaults de creación ni exigir reenviar los tres indicadores
cuando no se modifican. Vaciar un campo opcional es distinto de omitirlo, y sigue la
protección de impacto histórico Q3. No actualizar o rellenar registros antiguos por defecto.

R-C: ID estable y Tipo/Control identifican entidad; ID asignado en servidor, no editable.
R-T: nombre no vacío es contrato técnico del formulario, no restricción física Excel.
N-M: los seis controles demostrados no son Manual. No rechazar/borrar información
histórica porque no alimente ese motor. Manual permanece previsto sin pareja habilitada,
con valor directo/vacío y sin fecha efectiva independiente. No inventar un Tipo/Manual.
Objetivo mantiene céntimos exactos y límites técnicos acordados, sin mínimo/máximo
financiero o CHECK de signo inventado. Ausencia de apertura/Manual/Objetivo nunca es cero.

### Reglas del Excel, observaciones y contrato de aplicación

| Naturaleza / fuente | Evidencia o decisión | Consecuencia permitida |
| --- | --- | --- |
| Confirmado Q3/Q5 | ID inmutable, S000 protegido, sin borrado físico | Validar identidad, preservar relaciones |
| Evidencia funcional F2 | Dominios de atributos, vacío en Finalidad y Objetivo opcional | Conservar dominios; no atribuir a la muestra reglas físicas de obligatoriedad |
| Evidencia funcional F3 | Apertura es posición inicial; Saldo actual sin filtro por Fecha apertura; Manual directo/vacío sin fecha propia | Preservar semántica, no generar Movimientos de apertura ni fecha/filtro nuevos |
| Observación F1/F2 | Seis pares utilizados, sin registros Manual ni objetivos informados | Fixtures con pares contrastados; no matriz exhaustiva, no prohibición de objetivos |
| Contrato aprobado M1, aplicación | NA-A para apertura Exterior; O-A para ambos campos en los cinco pares ordinarios | Aplicar opcionalidad sin convertir ausencia en cero ni eliminar información existente |
| Contrato aprobado M2, aplicación | Estado Activa por defecto al crear; Finalidad/Objetivo opcionales; tres Sí/No explícitos | Validación de alta/edición sin inferencias ni defaults adicionales; S000 protegido |
| No demostrado del Excel | Obligatoriedad física por registro, exhaustividad de pares, detalle mensual | No atribuir M1/M2 al Excel ni inventar otros controles; no reabrir M1/M2 |

### Cierre de M1/M2 y secuencia posterior

M1/M2 están respondidas y su contrato de aplicación queda aprobado. No siguen siendo
preguntas ni requieren confirmar de nuevo su obligatoriedad. El corte mensual detallado
se contrasta en la entrega de histórico sin cambiar Saldo actual. Nuevos pares y uso
operativo Manual requieren su propio contraste antes de habilitarse, sin bloquear esta
ronda ni convertir la muestra en regla universal. No imponer signo a Objetivo por lagunas.

El siguiente paso previsto es la revisión del diseño visual GLOBAL de MyFinanzas antes
de desarrollar pantallas. La estructura Q8 sigue confirmada; no equivale a identidad,
componentes o pantallas finales aprobados. Esta actualización solo registra esa secuencia,
no inicia la revisión visual, E1.2 ni implementación. Aprobación final de la versión
completa y merge de PR #6 continúan pendientes.

### Ciclo de vida — Q3 confirmado
1. Alta con atributos explícitos y combinaciones existentes contrastadas en F1; no crear una operación financiera.
   Estado Activa por defecto al crear; Liquidez/bolsa/permiso exigen elección explícita.
   Finalidad/Objetivo y aperturas ordinarias opcionales, sin importe cero por defecto.
   ID se devuelve al guardar; S000 sigue fuera del alta ordinaria.
2. Consulta por ID y nombre; filtros independientes; ficha de activos e inactivos.
3. Edición de nombre conserva identidad y relaciones. Actualización exige revisión vigente.
4. Desactivación es transición de uso futuro, no ajuste monetario ni cierre económico.
   Fuera de nuevas selecciones, visible en historia, advertir saldo/relaciones
   cuando puedan calcularse. No exigir posición cero por inferencia. Si una dependencia activa queda inoperable
   al desactivar, explicar el impacto y
   resolverlo antes; no bloquear por la mera existencia de historia o referencias.
   El detalle por módulo se verificará al especificarlo, sin modificar relaciones automáticamente.
5. Reactivación conserva ID y datos, previa validación completa; no reinicia apertura,
   no crea hechos, no reabre ciclos y no resetea cálculos.
6. Sin borrado físico ni endpoint DELETE, también para no usados: Q3 confirmado.
   S000 queda excluido del ciclo ordinario.

### Protección histórica — Q3 confirmado; extensión transversal DT5 pendiente
| Cambio | Regla y consecuencia observable |
| --- | --- |
| ID / S000 técnico | Rechazar cambios de identidad; S000 sin edición ordinaria |
| Nombre | Renombrar por ID sin reescribir hechos/fotos; no prometer etiquetas congeladas hasta DT4 |
| Tipo, Control, Saldo apertura, Fecha apertura, Manual | Validar/auditar; si altera operaciones históricas, bloquear edición ordinaria hasta rectificación explícita; no prohibir por una relación sin impacto. Manual conserva alcance conceptual y no tiene fecha independiente |
| Liquidez, Finalidad, Objetivo, bolsa, permiso | Presentar impacto; no inferir cambios entre atributos. No invalidar retrospectivamente hechos válidos; si puede afectar un cierre, bloquear hasta definir procedimiento DT5 |
| Desactivar | Validar referencias activas, conservar todas las históricas y rechazar nuevas selecciones una vez inactivo |
| Reactivar | Validar atributos y relaciones vigentes, sin nuevo ID ni nueva apertura |

No implementar un sistema universal de versiones por cada edición: no se ha aprobado.
Auditoría técnica de mutaciones no equivale a catálogo versionado ni fotografía financiera.
E1.1 no crea tablas financieras de entregas futuras para simular referencias. Contratos
de protección se probarán con fixtures aislados; antes de cada nueva fuente se amplía
la comprobación de dependencias en la misma transacción. No declarar protección de
cierres completa hasta DT5/E4.8; hasta entonces esa operación financiera no existe.

## Data model and contracts

### DT2 — decisiones confirmadas y diseño lógico inicial; sin DDL aprobado
Q5 confirmado: claves de negocio Sxxx como PK TEXT inmutables. Detalle técnico: SQLite STRICT, SQL
parametrizado con bun:sqlite y Effect para recursos/errores. Evitar ID interno duplicado
sin necesidad demostrada. La alternativa INTEGER interno + Sxxx UNIQUE queda descartada para E1.1 por Q5.
Ninguna decisión autoriza copiar IDs/datos desde fuentes reales todavía.

| Grupo/entidad lógica propuesta | Datos persistentes candidatos | Restricciones/pendientes |
| --- | --- | --- |
| saldos | id TEXT PK, nombre TEXT, tipo TEXT, control TEXT, estado TEXT, liquidez INTEGER, mostrar_como_bolsa INTEGER, permite_salida_exterior INTEGER | Identidad/nombre/Tipo/Control requeridos; booleanos 0/1 para Sí/No; Estado Activa/Inactiva y dominios F2. M2 aplicación: Estado Activa al crear, tres booleanos explícitos sin default; Finalidad opcional. S000 protegido; no rellenar registros anteriores. ID inmutable en API y protección SQLite; S000 reservado |
| saldos: datos económicos | apertura_minor INTEGER nullable, fecha_apertura TEXT nullable, valor_manual_minor INTEGER nullable (soporte conceptual) | Apertura negativa válida; null no es cero; Manual no sobrescribe apertura y devuelve vacío si ausente. Sin fecha Manual; fecha de apertura solo afecta a la comprobación del histórico mensual, no al filtro de Saldo actual. M1 aplicación: opcionales en cinco pares ordinarios, no aplicables Exterior; conservar datos existentes |
| saldos: clasificación/objetivo | finalidad TEXT y objetivo_minor INTEGER nullable | Objetivo opcional en céntimos, sin default cero ni signo impuesto. Finalidad: vacío/Gastos planificados/Ahorro/Inversión. Estado canónico Activa/Inactiva: selección activa deriva de Estado, no otro booleano persistente |
| saldos: metadatos | revision INTEGER, creado_en TEXT, actualizado_en TEXT | Revisión positiva creciente; instantes UTC; no cambiar fecha económica por timestamp técnico |
| reserva de identificadores | siguiente número de Saldo, o mecanismo equivalente transaccional | Nunca MAX(id)+1 sin protección; reserva+alta atómicas, códigos conservados tras desactivación; mínimo tres dígitos y extensión S1000 confirmada Q5 |
| auditoría técnica | entidad/id, acción, revisión previa/nueva, instante UTC, actor, campos cambiados y motivo cuando sensible | Sin contraseña, token, secreto TOTP ni clave; auditoría mínima de acción/campos/revisión sin duplicar cifras financieras ni versionar catálogo; sin panel administrativo nuevo |
| principal único / factor / recuperación | hash Argon2id, secreto TOTP cifrado/nonce/versión de clave, último paso TOTP usado, hashes de códigos de recuperación | Único usuario; alta local exclusiva; códigos de un uso consumidos atómicamente; clave de cifrado fuera de base |
| sesiones y desafíos | hash token, principal, creado/expira/último uso, estado MFA; desafío temporal limitado | Sin token crudo en DB/log; desafío no autoriza rutas financieras; sesiones revocables y expiración servidor |
| versión de esquema técnica | versión aplicada | Diseño de futuras migraciones, no ejecutar/crear ninguna en STEP 5 |

No fijar el modelo entero de Movimientos, inversión, ciclos, deuda, presupuesto o fotos.
Claves foráneas futuras referencian Sxxx; activar foreign_keys en cada conexión y
usar RESTRICT, sin cascadas que borren historia. Evitar un enum global «tipo» para
mezclar Tipo de Saldo, Control y Tipo de Movimiento.

**Derivados: no persistir como verdad editable:** saldo calculado, entradas/salidas,
valoración agregada, liquidez total, cobertura de objetivo, nombres resueltos desde
otras entidades, condición de disponibilidad y contadores de referencias. Manual es
un dato autorizado, no caché del motor; apertura es posición inicial, no movimiento.
La condición inactiva no elimina económicamente una posición de informes históricos.

**Dinero y fechas — Q2/Q6 confirmados.** Importes EUR de Saldos (incluido
Objetivo €) en INTEGER de céntimos, BigInt extremo a extremo y JSON de importes como
texto decimal canónico (fixture `"123.45"`), sin FLOAT/REAL ni Number para operar dinero.
Usar rango int64 de SQLite: −9 223 372 036 854 775 808 a 9 223 372 036 854 775 807
céntimos. Es límite representacional, no umbral financiero; se retira el tope menor
del borrador. Rechazar overflow y precisión extra, nunca redondear silenciosamente.
Probar ida/vuelta exacta por encima del entero seguro de JavaScript. Nuevos IDs/secuencia
también se tratan exactamente, sin Number para el contador si supera ese rango seguro.

Admitir aperturas negativas que representen posiciones reales; no aplicar una restricción
«saldo >= 0». Valor ausente es null, distinto de cero, sin crear Movimientos. El
signo de Objetivo/Manual no se extrapola de la apertura; opcionalidad por par aprobada
en M1 y validación de atributos en M2 pertenecen al contrato de aplicación.
Objetivo es opcional, sin imponer un CHECK de signo no demostrado. Rechazar exponentes,
NaN/infinito y formatos ambiguos; formulario admite coma decimal española con conversión
exacta sin separadores de miles ambiguos; API usa punto. Solo convertir texto/BigInt.
Cantidades/precios/divisas/cambios de inversión quedan fuera, sin imponerles escala 2.

Fechas económicas YYYY-MM-DD, fecha civil válida (incluido bisiesto), sin desplazamiento
por zona; instantes técnicos UTC y presentación Europe/Madrid. Conservar el campo físico Fecha apertura separado de Saldo apertura y Valor manual,
sin crear una segunda fecha económica de inicio del control ni una fecha Manual.
El nombre candidato fecha_apertura sustituye inicio_control del borrador; no hay migración. No usar el reloj
como fecha económica ni imponer prohibición de fechas futuras sin evidencia de v5.11.
La evidencia F3 establece que Saldo actual NO filtra Movimientos por Fecha apertura;
el histórico mensual sí comprueba la fecha. No añadir filtro ni fecha Manual. El detalle
del límite mensual y de fecha ausente no está demostrado: no elegir comparador,
mes de corte ni sustitución por hoy; contrastarlo en la entrega de histórico.

**Atomicidad y concurrencia — detalles técnicos.** WAL con synchronous=FULL y timeout acotado,
una conexión de escritura administrada, transacciones breves BEGIN IMMEDIATE para
reserva+alta y validación de impacto+mutación+auditoría; rollback íntegro ante fallo.
Comparar revision dentro del UPDATE/transacción; petición obsoleta => 409 sin sobrescribir.
Asignación de ID no confía en UI; no permitir un ID elegido por cliente en altas normales.
Persistencia de revisión/auditoría y consumo de códigos TOTP/recuperación también atómicos.
WAL/PRAGMA y límites se deben probar con Bun/SQLite real al implementar, no se afirman
compatibles/rendidos por redactarlos. No sostener transacciones esperando contraseña,
MFA, usuario, cifrado de backup ni red. Evitar operaciones asíncronas dentro del callback
transaccional síncrono bun:sqlite.

**Pros:** importes exactos, identidad visible sin doble clave, rollback y relaciones
protegidas, conflictos detectables. **Contras:** política de IDs debe durar, int64/JSON
requiere cuidado y tests, STRICT no valida por sí solo calendarios/reglas financieras;
las invariantes compuestas siguen en el servicio transaccional. Revisar el esquema completo y extremos residuales de F1–F3
antes de traducir a DDL bajo otra autorización. Ningún archivo SQL se añade aquí.

## Screens and interfaces

Estructura de wireframes aprobada en Q8: listado/ficha/formulario en página propia,
tabla escritorio/tarjetas móvil, activos por defecto e inactivos consultables. ASCII
sin pantallas implementadas ni capturas; contenido de campos respeta evidencias F1–F3
y contrato M1/M2. La revisión visual global será el siguiente paso antes de desarrollar
pantallas; estos wireframes no sustituyen esa revisión ni autorizan implementarla aquí.
Usar referencia de identidad de UI guideline con contraste revisado, no asumir que colores
originales cumplen accesibilidad. Foco visible, etiquetas, mensajes asociados, teclado,
confirmación con foco y retorno a la acción invocadora. No información solo por color.

### Escritorio 1440 px — lista y ficha
```text
+------------------------------------------------------------------------+
| MyFinanzas                    Local · datos ficticios        [Salir]   |
| Saldos                                            [+ Nuevo Saldo]     |
| Buscar [____________] Estado [Activos v] Tipo [Todos v] Control [Todos]  |
| ID   Nombre         Tipo      Control       Posición       Acciones    |
| S101 Cuenta demo    Efectivo  Movimientos   No disponible  [Ver]       |
| S102 Reserva demo   Efectivo  No controlado No aplicable   [Ver]       |
| Ejemplos ficticios con pares utilizados confirmados por el usuario.   |
| [Incluir inactivos] [Mostrar contraparte técnica S000]                 |
+------------------------------------------------------------------------+
| Ficha: Cuenta demo · S101 (ID no editable)                             |
| Estado · Tipo · Control                                               |
| Posición: no disponible — motor Movimientos previsto en E1.4           |
| Apertura y vigencia | Atributos independientes | Uso/relaciones        |
| [Editar] [Desactivar]                    Última revisión técnica       |
+------------------------------------------------------------------------+
```
No mostrar saldo total, colchón, rendimiento ni cobertura incompletos. Si el catálogo
está vacío, CTA de alta; S000 se distingue de ese catálogo, no se confunde con una cuenta.

### Móvil 390 px — listado y formulario propio
```text
+----------------------------------+
| MyFinanzas              [Salir]   |
| Saldos                  [+ Nuevo]|
| Buscar [____________________]    |
| [Filtros: activos]               |
| S101 · Cuenta demo               |
| Efectivo / Movimientos           |
| Posición: No disponible          |
| [Ver ficha]                      |
+----------------------------------+
| < Saldos · Nuevo / Editar         |
| Identidad: asignada al guardar   |
| Estado inicial: Activa          |
| Nombre [____________________]    |
| Tipo [v]     Control [v]         |
| Apertura [ ]  Fecha apertura [ ] |
| Manual: soporte conceptual      |
| Liquidez: selección explícita    |
| Finalidad [vacío / opciones v]   |
| Objetivo EUR [____________]     |
| Mostrar como bolsa: Sí / No      |
| Permite salida Exterior: Sí / No |
| [Cancelar]        [Guardar]      |
+----------------------------------+
```
Formulario ofrece Finalidad vacía o Gastos planificados/Ahorro/Inversión, Estado
Activa/Inactiva y Objetivo (€) opcional. No exige Objetivo ni convierte vacío en cero;
Estado Activa por defecto al crear, aprobado en M2. Los tres booleanos son independientes y exigen
elección explícita sin preselección. Aperturas ordinarias opcionales según M1, sin
campos editables de apertura para S000; no expone campos irrelevantes como si
se debieran rellenar. Edición muestra ID solo lectura, cambios sin guardar avisan antes
de salir. Error no borra entradas; conflicto ofrece recargar/revisar sin perder borrador.
Permiso Exterior y Liquidez nunca se activan mutuamente. Antes de desactivar, resumen
de impacto y confirmación; si hay bloqueo, enlaces a dependencias disponibles sin SQL.

### Acceso propuesto DT1
Pantalla de contraseña -> desafío TOTP/código de recuperación -> aplicación. Estados
neutros de error, límites de intentos y expiración. Alta inicial única mediante procedimiento local mínimo, sin panel administrativo
ni endpoint público de registro; no confundirla con rescate excepcional. Enrolado confirma un TOTP
antes de activar el factor; URI/semilla solo una vez en pantalla protegida, no en logs.
Se propone entrada manual en autenticador para evitar dependencia QR; QR opcional
exigiría justificar librería adicional y revisar su generación local, sin servicio externo.

## Empty, loading and error states
- Carga: estado anunciado, acciones de escritura deshabilitadas mientras se confirma envío.
- Vacío: distinguir catálogo sin Saldos de filtro sin resultados y de error de API.
- No calculable: importe null y etiqueta del control. Cero solo si dato explícito autorizado
  por su contrato o resultado de motor ya entregado; nunca por ausencia de fuente.
- Error campo: mensaje junto a control y resumen navegable; mantener valores escritos.
- 401: volver al acceso; no conservar payload financiero en almacenamiento persistente
  del navegador. 403/CSRF: rechazo sin escribir. 404: no encontrado con regreso a lista.
- 409: identidad duplicada, relación bloqueante o revisión obsoleta, con código específico;
  actualizar solo tras revisión, nunca reintento ciego de escritura.
- 422: contrato financiero inválido; no resultado parcial. 429: mensaje/Retry-After.
- 500/503: mensaje genérico y correlación técnica, sin SQL/rutas/stack ni secretos.
- Error de red tras POST: estado incierto, consultar/reconciliar antes de repetir. Propuesta
  de clave de idempotencia por alta con payload ligado y retención 24 h como detalle técnico;
  mismo intento devuelve el mismo ID, clave con distinto payload => conflicto.
- Éxito: confirmación anunciada, ficha con ID persistido y atributos leídos del servidor.

## API behavior and external dependencies

### DT1 — enfoque confirmado Q4; detalles técnicos de seguridad
**Contraseña + TOTP + sesión opaca de servidor.** Bun.password Argon2id sin nuevo paquete
para hashes; mínimo 15 y máximo 128 caracteres, admitir espacios/pegado, sin
caducidad periódica forzada ni truncamiento; calibrar coste en equipo destino (punto
inicial propuesto 64 MiB/3 pasadas/1 hilo, sujeto a API y medición). Comparación segura,
errores genéricos y sin indicios de qué factor falló en respuestas públicas.

TOTP con biblioteca mantenida, candidata `otpauth`: evita desarrollar criptografía
HOTP/TOTP propia. Propuesta interoperable 6 dígitos/30 s/ventana ±1 paso, rechazar
reutilización del mismo paso atómicamente; reloj de autenticación confiable distinto
 de la fecha de referencia financiera. Secretos cifrados con AES-256-GCM usando APIs
criptográficas nativas y nonce único, versión de clave y rotación por diseñar. Clave
fuera de DB/Git; no es protección ante compromiso completo del servidor, sí frente
 a una copia aislada de DB. TOTP no resiste phishing como WebAuthn.

Sesión: token aleatorio de 256 bits, solo hash persistido; rotación tras login/MFA y
cambio de credenciales. Cookie HttpOnly, SameSite=Strict, Secure en HTTPS, host-only,
Path=/; prefijo __Host- cuando se cumplan requisitos. En desarrollo HTTP loopback,
configuración explícita con nombre distinto y sin Secure; fallar al arrancar si esa
configuración se intenta usar fuera de loopback, nunca bypass de autenticación.
Confirmado: 30 min inactividad/12 h absolutas, sin «recordarme»; desafío MFA 5 min y 5
intentos, nunca una sesión autorizada antes del segundo factor. Revocación servidor
al salir/cambiar credenciales/recuperar. Evitar refresh tokens/JWT en localStorage.

Protección API: guard de sesión completa en TODAS las rutas de negocio; solo acceso,
challenge y health mínimo sin datos pueden ser públicos. CSRF con token ligado a sesión
 y comprobación exacta Origin en mutaciones; origen local por config y futuro
https://myfinanzas.pp.ua cuando se autorice, sin CORS comodín/credenciales. API JSON,
validación por esquema Effect existente, límites de cuerpo/longitud, SQL parametrizado,
CSP y cabeceras por definir, Cache-Control: no-store en datos y acceso. No confiar
cabeceras proxy reenviadas salvo proxy configurado explícitamente. Límite técnico de
cuerpo 16 KiB. Nombre sin caracteres de control, no vacío tras trim; no cambiar
mayúsculas/acentos ni imponer unicidad por nombre. Un tope de UI no debe truncar
nombres existentes: preservar fuente y revisar cualquier límite antes de importación.

Detalle antiabuso: cinco fallos en 15 min disparan espera creciente acotada por
cuenta y origen; no bloqueo permanente que impida al único usuario recuperar acceso.
Contadores deben resistir reinicio; evitar que la persistencia permita agotar disco.
Auditar acceso/fallos con minimización de datos, sin credenciales/importes/cookies.
Evitar guardar IP histórica por defecto; contadores operativos acotados con caducidad
a 24 h y log técnico mínimo sin payload. Ajustar solo con evidencia de prueba, sin
introducir servicio externo ni prometer resistencia a abuso ya verificada.

Recuperación normal: diez códigos aleatorios de al menos 128 bits, mostrar una vez,
guardar hashes y consumir uno atómicamente. Contraseña + código sustituye el factor
TOTP para reenrolado seguro; invalida sesiones/códigos anteriores. No habilitar recuperación
remota por correo, proveedor externo, código estático universal o bypass de contraseña.
La confirmación/reautenticación es parte de la misma sesión limitada; nunca permite
acceso a Saldos antes de completar todos los requisitos.

Pérdida total de contraseña/factores no habilita automáticamente una función de rescate.
Cualquier excepción requerirá justificación y procedimiento exclusivamente local con
control del sistema, revocación y reenrolado. E1.1 no añade panel de usuarios, endpoint
remoto alternativo ni CLI administrativa general. Alta inicial mínima es necesaria para
el único usuario; rescate excepcional no se incluye por extensión de esa necesidad.
Mantener contraseña+TOTP también en desarrollo, sin bypass de fixture en rutas reales.

**Alternativas:** WebAuthn/passkeys resiste phishing y evita secreto compartido, pero
exige política de dispositivos de reserva, verificación de usuario/segundo factor y
orígenes local/producción. IdP OIDC con MFA reduce código de identidad, añade servicio,
metadatos externos y dependencia de disponibilidad/operación. No seleccionados.

**Dependencias previstas, ninguna instalada:** biblioteca TOTP consolidada (candidata
`otpauth`) y `age` CLI para backup cifrado, este último enfoque aceptado como propuesta
en Q7. No implementar algoritmos TOTP/cifrado propios ni framework de identidad.
Bun.password y APIs criptográficas nativas cubren hash/aleatoriedad/cifrado estándar;
si una biblioteca mantenida compatible simplifica las sesiones, justificar su necesidad
antes de añadirla. Sin ORM, correo, proveedor externo ni paquete por comodidad. Antes de autorizar uso: revisar mantenimiento, licencia,
compatibilidad Bun, advisories, versión exacta y lockfile/verificación del binario.
No se afirma aquí que se haya realizado esa auditoría o comprobado la API de esas herramientas.

### Contrato HTTP especificado; validación económica sujeta a evidencia F1–F3
Rutas bajo /api; errores JSON con code, mensaje no sensible, campos cuando proceda y
correlación; no revelar existencia de entidades a no autenticados.

| Operación | Respuesta esperada futura |
| --- | --- |
| POST /api/auth/login y desafío MFA | Desafío limitado; cookie autorizada solo al completar MFA; credenciales inválidas => error genérico |
| POST /api/auth/logout | Revocar sesión y cookie; requiere defensa CSRF |
| GET /api/auth/session | Estado mínimo de la propia sesión, sin factor/secreto |
| GET /api/saldos | 200 colección filtrada con identidad, atributos y estado de posición; paginación con máximo 100 por página, orden estable por ID y desempate sin depender del nombre |
| GET /api/saldos/:id | 200 ficha o 404; acceso autenticado siempre |
| POST /api/saldos | 201 Location + ficha; ID servidor, atributos explícitos, clave de idempotencia y revisión técnica |
| PATCH /api/saldos/:id | Edición parcial con revisión esperada obligatoria; 200 nueva ficha o 409 |
| POST /api/saldos/:id/desactivar o /reactivar | Revisión + validación transaccional del impacto; 200 ficha, 409 bloqueo |
| DELETE /api/saldos/:id | Sin ruta habilitada; no borrar historia |

Contrato conceptual de posición: importe decimal o null + moneda cuando aplica +
condición (`manual`, `no_aplica`, `pendiente_motor`, `error_calculo`) + motivo. Estos
valores son de presentación, no nuevos controles financieros. Resultado calculado se
agregará al existir su motor; no persistir condición derivada como saldo independiente.
El GET demo actual cambia a contrato protegido únicamente en futura implementación
autorizada; no mantener una ruta de datos sin sesión por compatibilidad del bootstrap.

## DT6 — propuesta aceptada Q7; operación definitiva antes del despliegue

**Mecanismo aceptado como propuesta:** VACUUM INTO desde conexión dedicada, fuera de una transacción de
usuario, para producir snapshot SQLite coherente (incluido estado confirmado en WAL),
a archivo nuevo en directorio privado temporal 0700. No copiar solo .sqlite abierto ni
tratar un checkpoint como garantía suficiente de copia. Configurar espera/reintento
acotado ante busy y descartar snapshot interrumpido. Validar disponibilidad de esta
operación en Bun/SQLite y parámetro de ruta seguro antes de implementarla.

1. Snapshot local consistente a ruta generada de confianza, permisos archivo 0600;
   sin nombres aportados por cliente y sin endpoint público de descarga.
2. Abrir snapshot aislado, comprobar integrity_check, foreign_key_check y versión;
   fallo => no publicar backup ni podar copias buenas. No copiar claves de cifrado.
3. Cifrar con age y destinatario público; clave privada fuera de Git; para futura producción, custodia
   separada del servidor, ubicación/procedimiento definitivos pendientes antes de despliegue.
   El ensayo local usa claves temporales de prueba fuera del checkout y no prueba
   que la custodia operativa definitiva ya esté resuelta. Exportar de manera segura la clave de cifrado
   TOTP (DT1) en paquete de recuperación cifrado separado; DB sin ella no basta.
4. Manifest cifrado con versión app/esquema, instante UTC, identificador de copia y
   checksum; finalizar/sincronizar archivos y renombrar atómicamente solo tras éxito.
   No confundir SHA con confidencialidad o autenticación: las aporta cifrado autenticado.
   Eliminar temporal en finally; borrado seguro no se garantiza en SSD, por eso se
   propone volumen local cifrado y permisos restrictivos además de exposición mínima.
5. Objetivos aceptados: diaria, retención 7 diarias/4 semanales/3 mensuales; copia
   previa a futuras migraciones autorizadas como precaución técnica. No ejecutar
   scheduler ni migración en este STEP. Responsabilidad/destino se concretan antes de
   desplegar; frecuencia/retención por sí solas no garantizan RPO sin monitorización.
6. Restaurar mensualmente y antes de uso real, siempre a directorio/base aislados:
   descifrar, comprobar hash/integridad/FK/esquema, leer IDs/atributos/Manual y estados
   por API/UI con fixtures y probar recuperación de credenciales. Evitar acciones
   sobre base activa o servicios externos durante el ensayo.
7. Restauración operativa futura: detener servidor, conservar copia previa, verificar
   compatibilidad, sustituir atómicamente sin arrastrar WAL/SHM anteriores, revocar todas
   las sesiones/desafíos y regenerar códigos de recuperación (evitar resucitar usados);
   comprobar MFA/clave, reiniciar y verificar flujo. Si falla, rollback controlado.
   No implementar ahora comandos de restauración ni borrados.
8. Copia externa cifrada futura en soporte/proveedor independiente, preferencia UE,
   credenciales de mínimo privilegio y retención/inmutabilidad por decidir DT10;
   no configurar dominio, proveedor, VPS ni servicio. Una copia en el mismo disco no
   cubre pérdida de máquina, ransomware o pérdida de la clave privada.

**Objetivos iniciales aceptados Q7:** RPO 24 h y RTO 2 h para futura operación; E1.1
mide ensayo local con fixtures, sin SLA de producción. Alerta de antigüedad/fallo debe
ser observable y no enviar datos financieros a un canal no autorizado. Claves privadas
solo se necesitan al restaurar; el proceso de backup usa destinatario público. Probar
pérdida/rotación de claves y recuperación desde entorno limpio, no solo desde el equipo original.

**Ventajas:** snapshot consistente sin pausa prolongada de la app, cifrado con clave de
restauración fuera del servidor, ensayo reproducible. **Inconvenientes:** snapshot temporal
en claro, consumo de disco/I/O, herramienta CLI nueva y carga operativa de custodia/
monitorización; no protege por sí solo frente a compromiso de host. **Alternativas:**
parar app y copiar DB consolidada reduce herramientas pero interrumpe uso; restic aporta
repositorio/retención/transporte cifrado integrado, con mayor dependencia/configuración.
La API online-backup de SQLite sería otra vía si la integración elegida expone soporte
verificado: no se inventa aquí un método bun:sqlite no comprobado.

## Validation and edge cases
Separar esquema/validación estructural que bloquea escritura de discrepancia informativa
 de conciliación. Validar en servidor aunque UI ya valide. Reglas de
exhaustividad de matriz y extremos residuales de motores posteriores no se
sustituyen por defaults; M1/M2 ya resuelven obligatoriedad para la aplicación; dominios F2 y distinción actual/histórico F3 ya están demostrados;
aperturas negativas y céntimos exactos ya están confirmados.

Casos de prueba: nombres repetidos (aviso no bloqueante, ID distingue),
Unicode/control/espacios, fecha inválida o futura, apertura ausente vs cero, Manual ausente,
importe negativo/exceso precisión, intento de ID nuevo S000, agotamiento/crecimiento de
Sxxx, reactivar con dependencias ya desactivadas, dos pestañas editando, permiso cambiado
con hechos antiguos, fallo entre actualización/auditoría, snapshot mientras se escribe,
clave de restauración perdida y copia demasiado antigua. Errores de validación no
deben modificar ninguna fila ni consumir un ID de forma reutilizable accidentalmente.

## Exclusions
E1.2 y otras entregas; motores de Movimientos/inversión; agregados de liquidez/patrimonio;
crear Deudas como Saldos; operaciones reales; importación o mapping real; SQL/DDL ejecutable,
migraciones, instalaciones de dependencias, autenticación implementada, servicios online,
backups de datos reales, fotografías/cierre/reapertura implementados y merge sin permiso.
No simular estas capacidades en UI ni considerar aprobados por extensión detalles no confirmados.

## Acceptance checks
TODOS FUTUROS; ninguno ejecutado sobre E1.1. Q1–Q8 tienen respuesta registrada;
las evidencias F1–F3 están incorporadas. Los extremos residuales condicionan únicamente
los checks que los necesitan; no se interpreta la muestra como matriz exhaustiva.
IDs estables locales AC-01…; relación con roadmap: E1.1-AC1 => AC-02/03/17;
E1.1-AC2 => AC-07/08; E1.1-AC3 => AC-09/10/11/12. Tests de motor de inversión quedan
fuera; se comprueba ausencia de resultado falso, no resultados que todavía no existen.

| ID | Action / preconditions | Expected observable result |
| --- | --- | --- |
| AC-01 | Autenticado, alta ficticia con atributos válidos según reglas confirmadas y evidencia F1–F3; reiniciar y consultar | ID asignado persistente, misma ficha; no Movimiento de apertura |
| AC-02 | Renombrar un Saldo | ID y relaciones intactos, nombre actualizado, revisión incrementada |
| AC-03 | Intentar cambiar ID, duplicarlo o reutilizar desactivado; incluir dos altas concurrentes | Cambio/reutilización rechazados; altas concurrentes obtienen IDs distintos sin sobrescribir |
| AC-04 | Desactivar Saldo sin bloqueo y consultar historia; intentar seleccionarlo de nuevo | Historia conserva ID, nuevas selecciones excluyen inactivo; importe no se reajusta |
| AC-05 | Reactivar mismo Saldo y recargar | Mismo ID/apertura, vuelve a selección; sin hechos nuevos ni ciclo abierto |
| AC-06 | Consultar/intentar editar/desactivar S000, con Q3 confirmado | Etiqueta técnica y operaciones ordinarias rechazadas, sin posición cero |
| AC-07 | Cambiar solo Liquidez manteniendo Finalidad, Objetivo, Estado, bolsa y permiso | Solo cambia ese atributo; no se recalculan/infieren otros ni se muestra KPI incompleto |
| AC-08 | Cambiar permiso Exterior sin tocar Liquidez | Independencia persistente; no se reescribe validez de hechos históricos |
| AC-09 | Consultar control Terminal | Motivo de posición no aplicable; sin cero ni duplicación de compras |
| AC-10 | Consultar No controlado y Exterior | Etiquetas diferenciadas e importe null, sin cero ficticio |
| AC-11 | Revisar contrato conceptual Manual con fixture de valor y ausencia, sin asignar un Tipo/Manual no contrastado | Valor manual directamente o vacío/null si ausente, sin cero inventado ni fecha efectiva independiente; no habilitar pares no contrastados |
| AC-12 | Consultar Movimientos/Inversiones en E1.1 | Fuente/configuración visibles; pendiente motor E1.4/E4, no posición calculada inventada |
| AC-13 | Enviar Tipo/Control desconocidos, fechas irreales, precisión extra u overflow; distinguir de pares no contrastados | 422 específico sin escritura parcial ni redondeo silencioso; no declarar inválido un par solo por no figurar en la muestra |
| AC-14 | Cambiar apertura/Control/Tipo que altere operaciones históricas en fixture; bloquear por impacto | 409 con Q3 confirmado, datos/relaciones originales intactos; no fingir protección de fuentes aún no entregadas |
| AC-15 | Dos clientes editan revisión idéntica | Uno guarda; otro recibe conflicto y conserva borrador, sin actualización perdida |
| AC-16 | Forzar fallo de persistencia/auditoría en actualización | Rollback íntegro de datos/revisión/auditoría, error externo genérico |
| AC-17 | Referencia fixture por Sxxx y renombrado/desactivación | FK válida e historia consultable, sin cascada/borrado; pruebas no crean módulos futuros |
| AC-18 | Acceder API sin sesión, con desafío MFA parcial, expirada o revocada | Ninguna ruta financiera filtra datos o permite escritura; 401 |
| AC-19 | Login correcto/incorrecto, replay TOTP, desafío vencido y límite de intentos | Solo flujo completo crea sesión; replay/abuso rechazados, no secretos en respuesta/log |
| AC-20 | Cookie sesión + petición mutante sin CSRF/origen autorizado | Rechazo sin cambio; cookie inaccesible JS y flags por entorno; HTTP fuera de loopback rechazado |
| AC-21 | Usar código recuperación dos veces y recuperar credenciales según Q4 | Primer uso único y reenrolado; segundo rechazado; sesiones previas revocadas |
| AC-22 | Formularios/lista/ficha/error/vacío/carga a 390 y 1440 px, teclado | Sin overflow/recortes; foco/etiquetas accesibles, valores conservados y errores asociados; capturas inspeccionadas |
| AC-23 | Alta enviada con respuesta de red perdida; repetir la misma clave de idempotencia | Mismo ID y un registro; payload diferente con misma clave => conflicto |
| AC-24 | Backup durante escrituras confirmadas con fixtures | Snapshot coherente confirmado, integrity/FK válidas, cifrado descifrable con clave externa; sin archivo incompleto publicado |
| AC-25 | Restaurar a instancia aislada y consultar vía API/UI | IDs/atributos/importes exactos coinciden con corte; acceso/MFA verificados y sesiones/códigos antiguos no resucitan |
| AC-26 | Simular disco lleno, backup interrumpido, clave incorrecta, snapshot inválido o viejo | Error visible, base original intacta, copias buenas conservadas; no declaración falsa de RPO/RTO |
| AC-27 | Revisar el catálogo de combinaciones utilizadas F1 en fixtures y su validación | Los seis pares figuran como utilizados; no se declara que sean matriz exhaustiva ni que otros pares sean inválidos; Manual no habilita pares nuevos |
| AC-28 | Alta/edición ficticia con Finalidad vacía y con sus valores, Estado y tres Sí/No independientes | Finalidad opcional, Estado Activa si se omite en nueva alta; los tres Sí/No explícitos, sin inferencias ni pérdida de histórico. PATCH omitido conserva valor |
| AC-29 | Guardar y recargar Saldo ficticio sin Objetivo, luego con importe EUR explícito | Objetivo es opcional y ausencia sigue null, no cero; céntimos exactos; sin reglas de signo inventadas |
| AC-30 | Revisar contrato de Saldo actual con fixture de apertura 100, entrada anterior a Fecha apertura 20 y salida posterior 5 | Resultado de referencia 115: no excluir la entrada por Fecha apertura. Criterio de contrato para futuro motor E1.4; no motor implementado ni nueva pantalla E1.1 |
| AC-31 | Revisar contrato histórico con un periodo inequívocamente anterior a Fecha apertura | No mostrar posición anterior; no borrar ni filtrar los Movimientos de Saldo actual. Límite mensual exacto/fecha ausente quedan sin suposición para la entrega del histórico |
| AC-32 | Revisar matriz, validaciones y futura nulabilidad contra M1/M2 | O-A, NA-A, DEF-A y E-A identificados como contrato aprobado de aplicación; separados de evidencia Excel y observaciones; sin preguntas M1/M2 pendientes ni restricciones por inferencia |
| AC-33 | En cada uno de los cinco pares ordinarios, alta ficticia omitiendo Fecha apertura/Saldo apertura, luego solo uno y luego ambos con apertura cero explícito o negativa | Altas válidas según M1 con datos restantes válidos; campos independientes, ausencias preservadas y cero/negativo conservados exactamente; sin Movimiento/filtro por fecha creado |
| AC-34 | Consultar S000 y conservar fixture de información existente no usada por su motor; intentar editarlo como Saldo ordinario | Aperturas no aplicables al contrato de S000 y edición bloqueada; no borrar/rechazar información existente por no tener función ni asignar defaults de alta al registro técnico |
| AC-35 | Nueva alta sin Estado y con tres elecciones explícitas, probando No/false; repetir omitiendo o enviando null en cada indicador | Estado inicial Activa si omitido; false es elección válida. Ausencia/null del indicador rechaza alta sin escritura parcial; sin inferir de Tipo/Control. PATCH omite y conserva, no reinicializa Estado |
| AC-36 | Revisar secuencia de entrega antes de empezar pantallas | Revisión del diseño visual global registrada como siguiente paso y pendiente antes del desarrollo de pantallas; estructura Q8 no se interpreta como diseño global aprobado ni permiso de implementación |

### Plan de prueba futuro con fixtures
- Unitarias Bun: validaciones autorizadas, parseo exacto, fechas, disponibilidad, transiciones,
  decisiones de impacto, MFA/recuperación usando reloj de prueba, sin debilitar seguridad real.
- Integración Bun + Effect HTTP + bun:sqlite temporal: AC-01…21/23, FK y rollback real,
  dos conexiones/revisión, permisos, JSON/CSRF, sesión y persistencia tras reinicio.
- Playwright sin mocks para recorrido principal: alta -> ficha -> edición -> desactivar ->
  filtrar -> reactivar; acceso/MFA y errores. Estados aislados pueden inyectar fallos.
  390×844 y 1440×1000, captura/inspección efectiva y teclado; no afirmar WCAG por solo E2E.
- Operativas locales aisladas: AC-24…26, escrituras concurrentes, restore a directorio
  nuevo con claves de prueba fuera de Git; medir tiempo y registrar corte/RPO/RTO observado.
- Fixtures: S000 técnico, nombres «Cuenta demo», «Reserva demo», «Terminal demo» y
  seis pares utilizados contrastados F1; Manual se prueba como contrato conceptual sin
  inventar combinación Tipo/Manual. No se habilita operativa adicional.
  No tratar todas las combinaciones como válidas ni rechazarlas por una nueva matriz inventada.
  Ejemplos de aperturas 0, 123.45 y −25.00 confirmadas por Q2/Q6; Objetivo opcional (vacío no cero) y Manual directo/vacío,
  sin imponer signo no demostrado ni inventar registros reales. Incluir límites int64 y >2^53 céntimos. Datos no
  copiados de finanzas reales. Identificadores ficticios no constituyen mapping de migración.
- AC-27 y AC-30/31 verifican contratos documentados; cálculo actual e histórico se
  probarán al entregar sus motores. No ampliar E1.1 a ejecutar esos módulos. Añadir
  equivalencia antes de cualquier filtro temporal nuevo o fecha Manual independiente.
- Cada AC se marcará pasado/fallido/no ejecutado en etapa de desarrollo autorizada;
  este plan no sustituye evidencia ni autoriza implementarlo. Datos/DB/capturas sensibles fuera de Git.

## Reservas financieras y trazabilidad
Evidencias F1–F3 recibidas del usuario el 2026-10-20 tras su inspección directa del
Excel físico estable. [Procedencia y detalle canónico](functional-reference-v5.11.md#evidencias-sanitizadas-f1f3-aportadas-por-el-usuario--2026-10-20).
Codex no ha incorporado ni inspeccionado el libro ni sus manuales originales completos.
La precisión recibida sustituye cualquier formulación previa que implicase filtrar
Saldo actual «desde vigencia del control» por Fecha apertura.

| Evidencia | Demostrado / incorporado | Extremos aún no demostrados; no inventar reglas |
| --- | --- | --- |
| F1 | Utilizados: Exterior/Exterior; Efectivo/Movimientos; Efectivo/Terminal; Efectivo/No controlado; Efectivo/Inversiones; Inversión/Inversiones. Manual existe en fórmula sin registros | La muestra no es matriz exhaustiva de validez; tampoco prueba invalidez de pares restantes. Obligatoriedad por control y otros pares requieren contraste antes de habilitarse; no convertir muestra en restricción universal |
| F2 | Finalidad vacío/Gastos planificados/Ahorro/Inversión; Estado Activa/Inactiva; Objetivo (€) opcional y actualmente no informado; Liquidez/bolsa/permiso Sí/No, independientes | No demuestra signo de Objetivo ni reglas de cobertura/automatismos; no obligarlo ni inferir atributos. No se generaliza la muestra vacía a prohibir objetivos nuevos |
| F3 | Apertura es posición inicial; Movimientos=apertura+entradas−salidas sin filtro de Fecha apertura; Inversiones/Efectivo añade Compras/Ventas; Manual directo o vacío sin fecha efectiva propia; Terminal/No controlado/Exterior sin saldo convencional; histórico mensual comprueba Fecha apertura | No consta detalle de comparación mensual, mes de frontera o fecha ausente; obligatoriedad de aplicación ya resuelta en M1, sin atribuirla al Excel. No cambiar Saldo actual; detalles del histórico se contrastan antes de su implementación. No inventar signo/parejas Manual |

F1–F3 ya no se consideran evidencia ausente en bloque. Los extremos residuales se
mantienen explícitos, sin restricciones nuevas ni defaults salvo Estado Activa de alta,
aprobado para la aplicación en M2. M1/M2 no son extremos pendientes. Para operativas
que dependan de ellos se necesita únicamente el detalle sanitizado correspondiente,
no reabrir Q1–Q8 ni reclamar dominios/semánticas que el usuario ya ha aportado.
Los módulos posteriores conservan sus entregas; registrar contrato no autoriza implementarlos.

### Particularidad obligatoria: actual frente a histórico
Saldo actual de control Movimientos suma apertura+entradas−salidas sin filtrar por Fecha
apertura; el histórico mensual comprueba esa fecha para no mostrar posiciones anteriores.
Esto no es una incoherencia a «corregir» autónomamente: preservar equivalencia. La fecha
no altera ni borra los hechos registrados. Inversiones/Efectivo conserva además Compras
y Ventas. No existe fecha efectiva Manual independiente. Ningún filtro nuevo de
Movimientos por fecha de apertura ni fecha Manual se añade sin especificación y prueba
de equivalencia. Detalles de corte mensual/ausencias no demostrados permanecen abiertos.

### Trazabilidad de decisiones
- Q1 -> atributos independientes, Objetivo (€), Manual conceptual y F1/F2.
- Q2/Q6 -> datos separados, negativos de apertura, ausencia distinta de cero, céntimos/fechas y F3.
- Q3 -> ciclo de vida, protección de S000/IDs y bloqueo por impacto histórico, no por mera relación.
- Q4 -> DT1 sin proveedor/correo/registro/administración innecesaria; excepción local justificada.
- Q5 -> PK Sxxx y asignación atómica sin reutilización ni clave sustituta, crecimiento S1000.
- Q7 -> propuesta DT6 aceptada; custodia/destino externo aún pendientes antes de despliegue.
- Q8 -> estructura visual confirmada, identidad MyFinanzas, sin afirmar prueba visual implementada.
- Detalles técnicos menores: revisión optimista, idempotencia, paginación, int64/BigInt,
  parseo exacto y protecciones estándar de sesión/API, resueltos con la autorización recibida.

## Puerta de revisión y siguiente acción
Presentar la versión con contrato aprobado M1/M2, criterios revisados y resultados de
checks. M1/M2 cerradas; no equivalen a aprobación final del documento completo ni a
permiso de merge o esquema SQL. Las evidencias Excel y contrato nuevo permanecen separados.
Siguiente paso previsto: revisión del diseño visual global ANTES de desarrollar pantallas;
registrarla no es iniciarla. No merge, implementación, SQL, migraciones, servicios,
E1.2 u otros STEPS. Pares nuevos, Manual operativo y detalle de histórico se contrastan
cuando corresponda, sin reabrir decisiones aprobadas ni añadir restricciones a Objetivo.
