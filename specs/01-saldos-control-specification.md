# 01 — E1.1 Saldos y atributos de control: Specification
Status: IN REVIEW — versión completada para revisión tras Q1–Q8; reservas financieras F1–F3 explícitas.
Approval source/date: decisiones Q1–Q8 y estructura visual confirmadas por el usuario el 2026-10-20.
Aprobación final de esta versión, merge e implementación: PENDING / no autorizados.
Context and brainstorming: [ronda 1](01-saldos-control-brainstorming.md),
[roadmap E1.1](roadmap.md#e11--saldos-y-atributos-de-control),
[referencia funcional](functional-reference-v5.11.md).

## Autoridad y alcance
El usuario autorizó actualizar/completar la documentación y la PR #6 tras responder
Q1–Q8 el 2026-10-20. Sus respuestas están registradas de forma append-only en el
brainstorming. Esta versión integra esas decisiones y los detalles técnicos menores
resueltos bajo su autorización. No extiende su aprobación a reglas económicas no
probadas ni a parámetros/recomendaciones del borrador que no confirmó.

Se conocen el extracto y la especificación funcional recibida, no el Excel físico ni
sus manuales originales completos. Solo reglas sanitizadas y fixtures inventados en
este documento. Excel v5.11 conserva la condición de maestro hasta P7. No se altera
el roadmap, el stack ni P1–P7. Sin implementación, archivos SQL, migraciones ni despliegue.

## Functionality

### Hechos confirmados y disponibilidad por entrega
| Aspecto | Contrato confirmado de la fuente | Alcance E1.1 especificado |
| --- | --- | --- |
| Identidad | Sxxx estable, único, no reutilizable; nombre no es clave | Alta/consulta/edición por ID; generación atómica, al menos tres dígitos y continuidad S1000; Q5 confirmado |
| Tipo | Exterior, Efectivo, Inversión | Atributo independiente de Control; respetar matriz existente; falta evidencia exhaustiva F1, no imponer restricciones nuevas |
| Control | Exterior, Movimientos, Terminal, No controlado, Inversiones, Manual | Mostrar motor y disponibilidad, no inventar uno |
| Movimientos | Apertura + entradas − salidas desde vigencia de control | Configuración de apertura/vigencia; cálculo se entrega en E1.4, no en E1.1 |
| Inversiones + Efectivo | Apertura + entradas − salidas de Movimientos − Compras + Ventas | Configuración, posición no disponible hasta E4.1/E4.2; sin falso cero |
| Inversiones + Inversión | Valoración agregada de posiciones de inversión | No implementar ni duplicar tblInversionesResumen; hasta E4.3 no disponible |
| Manual | Valor manual autorizado | Soporte conceptual; no habilitar captura operativa sin semántica de F3; no inventar fecha adicional |
| Terminal | Financiación por transferencia y gasto desde terminal, sin duplicar compras | Maestro consultable; sin posición monetaria ficticia ni operaciones todavía |
| No controlado | No fingir posición calculada | Maestro consultable; etiqueta «No controlado», importe no aplicable |
| Exterior | S000 contraparte técnica, no cuenta patrimonial disponible | Registro de sistema visible como tal; protección confirmada Q3 |
| Liquidez | Solo Sí integra colchón; independiente de Finalidad/bolsa/permiso | Guardar atributo; sin sumar colchón ni fabricar KPI en E1.1 |
| Finalidad, Objetivo (€), bolsa, Estado | Independientes de apertura/permiso y entre sí; Q1 confirmado | Objetivo es importe EUR; dominio de Finalidad/Estado y condiciones de Objetivo requieren F2 |
| Permite salida a Exterior | Regla de salida directa, no inferida del banco o finalidad | Configurar explícitamente; su aplicación a operaciones llega con E1.4/E1.6 |

Para Terminal no se inventa aquí fórmula, apertura ni relación con un banco: fuente
no proporciona ese detalle. Un Control Manual no convierte un Tipo Inversión en un
nuevo tipo de operación ni reemplaza las reglas de valoración de posiciones de R5.

### Ciclo de vida — Q3 confirmado
1. Alta con atributos explícitos y combinaciones existentes contrastadas en F1; no crear una operación financiera.
   No predeterminar importe cero, Liquidez o permiso de salida. ID se devuelve al guardar.
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
| Tipo, Control, apertura, inicio control, Manual | Validar/auditar; si altera operaciones históricas, bloquear edición ordinaria hasta rectificación explícita; no prohibir por una relación sin impacto. Manual conserva alcance conceptual F3 |
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
| saldos | id TEXT PK, nombre TEXT, tipo TEXT, control TEXT, estado TEXT, liquidez INTEGER, mostrar_como_bolsa INTEGER, permite_salida_exterior INTEGER | Identidad/nombre/Tipo/Control requeridos; booleanos 0/1 cuando informados, sin defaults económicos; dominios/matriz/obligatoriedad F1/F2. ID inmutable en API y protección SQLite; S000 reservado |
| saldos: datos económicos | apertura_minor INTEGER nullable, inicio_control TEXT nullable, valor_manual_minor INTEGER nullable (soporte conceptual) | Apertura negativa válida; null no es cero; Manual no sobrescribe apertura. Obligación/vigencia F1/F3; no crear fecha Manual no demostrada |
| saldos: clasificación/objetivo | finalidad TEXT y objetivo_minor INTEGER nullable | Objetivo (€) confirmado, céntimos exactos; sin defaults ni rango/signo económico supuesto. Finalidad/Estado: conservar valores existentes, sin enum inventado F2; no duplicar Estado en un booleano activo hasta demostrar mapping |
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
«saldo >= 0». Valor ausente es null, distinto de cero, sin crear Movimientos. Signo y
obligación de Objetivo/Manual no se extrapolan de la apertura: F2/F3. Rechazar exponentes,
NaN/infinito y formatos ambiguos; formulario admite coma decimal española con conversión
exacta sin separadores de miles ambiguos; API usa punto. Solo convertir texto/BigInt.
Cantidades/precios/divisas/cambios de inversión quedan fuera, sin imponerles escala 2.

Fechas económicas YYYY-MM-DD, fecha civil válida (incluido bisiesto), sin desplazamiento
por zona; instantes técnicos UTC y presentación Europe/Madrid. Mantener separados inicio
del control, apertura y Manual, sin añadir fecha obligatoria a Manual. No usar el reloj
como fecha económica ni imponer prohibición de fechas futuras sin evidencia de v5.11.
La frontera de inclusión y tratamiento de fecha ausente deben contrastarse en F3, no
asumirlos a partir de «desde vigencia».

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
las invariantes compuestas siguen en el servicio transaccional. Revisar el esquema completo y reservas F1–F3
antes de traducir a DDL bajo otra autorización. Ningún archivo SQL se añade aquí.

## Screens and interfaces

Estructura de wireframes aprobada en Q8: listado/ficha/formulario en página propia,
tabla escritorio/tarjetas móvil, activos por defecto e inactivos consultables. ASCII
sin pantallas implementadas ni capturas; contenido de campos respeta reservas F1–F3.
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
| Ejemplos ilustrativos; combinaciones fixture requieren evidencia F1.  |
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
| Nombre [____________________]    |
| Tipo [v]     Control [v]         |
| Apertura [ ]  Inicio control [ ] |
| Manual: soporte conceptual      |
| Liquidez: selección explícita    |
| Finalidad [pendiente dominio]    |
| Objetivo EUR [____________]     |
| Mostrar como bolsa: Sí / No      |
| Permite salida Exterior: Sí / No |
| [Cancelar]        [Guardar]      |
+----------------------------------+
```
Formulario final adapta obligatoriedad a evidencia F1–F3; no expone campos irrelevantes como si
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
matriz/obligatorios, vigencia y dominios pendientes F1–F3 no se sustituyen por defaults;
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
las reservas F1–F3 condicionan únicamente los checks que requieren evidencia financiera.
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
| AC-07 | Cambiar solo Liquidez manteniendo Finalidad, bolsa y permiso | Solo cambia ese atributo; no se recalculan/infieren otros ni se muestra KPI incompleto |
| AC-08 | Cambiar permiso Exterior sin tocar Liquidez | Independencia persistente; no se reescribe validez de hechos históricos |
| AC-09 | Consultar control Terminal | Motivo de posición no aplicable; sin cero ni duplicación de compras |
| AC-10 | Consultar No controlado y Exterior | Etiquetas diferenciadas e importe null, sin cero ficticio |
| AC-11 | Consultar configuración conceptual Manual, no usada actualmente; probar valor/ausencia solo al contrastar contrato F3 | Sin cero inventado ni motor automático; conservar soporte conceptual sin activar captura ni fecha obligatoria no demostradas |
| AC-12 | Consultar Movimientos/Inversiones en E1.1 | Fuente/configuración visibles; pendiente motor E1.4/E4, no posición calculada inventada |
| AC-13 | Enviar combinaciones inválidas, fechas irreales, precisión extra o overflow según Q6 confirmado y evidencia F1–F3 | 422 específico sin escritura parcial ni redondeo silencioso |
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
  variantes de cada Control documentado; seleccionar combinaciones válidas al resolver F1.
  No tratar todas las combinaciones como válidas ni rechazarlas por una nueva matriz inventada.
  Ejemplos de aperturas 0, 123.45 y −25.00 confirmadas por Q2/Q6; Objetivo/Manual solo
  con sus condiciones demostradas. Incluir límites int64 y >2^53 céntimos. Datos no
  copiados de finanzas reales. Identificadores ficticios no constituyen mapping de migración.
- Cada AC se marcará pasado/fallido/no ejecutado en etapa de desarrollo autorizada;
  este plan no sustituye evidencia ni autoriza implementarlo. Datos/DB/capturas sensibles fuera de Git.

## Reservas financieras y trazabilidad
La revisión vuelve a contrastar el extracto R1/R2/R5/R6 y §4 del adjunto funcional
v5.11 recibido, sin copiar el original a Git. En esas fuentes figuran Tipos/Controles,
fórmulas resumidas, S000 y atributos separados; no consta un diccionario completo
de Saldos. Las afirmaciones de inspección del Excel siguen limitadas: no se ha
incorporado ni inspeccionado el libro físico ni sus manuales originales completos.

| Reserva | Demostrado / confirmado | No demostrado; tratamiento y puerta |
| --- | --- | --- |
| F1 — Combinaciones y obligatorios | Tipo Exterior/Efectivo/Inversión y seis controles; S000 técnico; Inversiones/Efectivo e Inversiones/Inversión descritos en §4; Q1 exige preservar combinaciones | Falta matriz exhaustiva y campos obligatorios por control. No inferir restantes pares válidos/inválidos ni inventar restricciones; completar desde referencia sanitizada antes de cerrar validación de alta/edición y fixtures de AC-01/13 |
| F2 — Dominios y Objetivo | Q1 confirma independencia y Objetivo (€); Q3 confirma desactivación/reactivación | Falta vocabulario de Finalidad/Estado, su correspondencia con activo/inactivo y obligación/signo de Objetivo. Persistencia conceptual tipa Objetivo como céntimos; no inventar enum, doble Estado ni límite financiero; necesario antes de fijar formulario/constraints |
| F3 — Apertura y Manual | Q2 separa fecha inicio/apertura/Manual; Q6 permite apertura negativa y fechas civiles; §4 dice «según vigencia» | Falta frontera exacta de vigencia y tratamiento de fecha ausente/obligatoriedad por control. Preservar, no asumir inclusión/exclusión o fecha hoy. Manual no se usa: conservar concepto, no añadir fecha/histórico ni habilitar operativa sin contrato. Contrastar apertura antes de implementación; motor en E1.4 también requiere ese contrato |

Estas reservas son evidencia funcional pendiente, no autorización para elegir otra regla
ni impedimento para documentar el resto. No se reabren Q1–Q8; se necesita una descripción
sanitizada de los detalles existentes, sin importes reales ni originales en Git. Los
casos de inversión, rectificación y cierre fuera de alcance conservan sus entregas/DT.

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
Revisar esta versión completada documentalmente y obtener únicamente la evidencia
sanitizada F1–F3 aplicable. Aprobación final del documento y merge de PR #6 siguen
pendientes; responder Q1–Q8 no aprueba automáticamente el texto completo o el esquema
físico. No declarar E1.1 lista para implementar con validaciones económicas pendientes.
No iniciar E1.2, código, SQL, migraciones, servicios o STEP 6/7/8 sin autorización.
