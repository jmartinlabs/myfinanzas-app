# 01 — E1.1 Saldos y atributos de control: Specification
Status: DRAFT — propuesta de revisión; NO cerrada ni implementable hasta resolver Q1–Q8.
Approval source/date: PENDING para especificación, wireframes y DT1/DT2/DT6.
Context and brainstorming: [ronda 1](01-saldos-control-brainstorming.md),
[roadmap E1.1](roadmap.md#e11--saldos-y-atributos-de-control),
[referencia funcional](functional-reference-v5.11.md).

## Autoridad y alcance
Solicitud del usuario 2026-10-20: iniciar únicamente STEP 5 de E1.1, preparar propuesta
 y PR documental y detenerse para revisión antes de cerrar especificación. Se publica
este borrador por esa autorización expresa; no es el commit de especificación aprobada
previsto al finalizar la Skill spec. Recomendaciones técnicas y reglas nuevas están
pendientes, aunque estén detalladas para permitir una revisión concreta.

Se conocen el extracto y la especificación funcional recibida, no el Excel físico ni
sus manuales originales completos. Solo reglas sanitizadas y fixtures inventados en
este documento. Excel v5.11 conserva la condición de maestro hasta P7. No se altera
el roadmap, el stack ni P1–P7. Sin implementación, archivos SQL, migraciones ni despliegue.

## Functionality

### Hechos confirmados y disponibilidad por entrega
| Aspecto | Contrato confirmado de la fuente | Alcance E1.1 propuesto |
| --- | --- | --- |
| Identidad | Sxxx estable, único, no reutilizable; nombre no es clave | Alta/consulta/edición por ID; generación y formato sujetos a Q5 |
| Tipo | Exterior, Efectivo, Inversión | Atributo independiente de Control; matriz válida pendiente Q1 |
| Control | Exterior, Movimientos, Terminal, No controlado, Inversiones, Manual | Mostrar motor y disponibilidad, no inventar uno |
| Movimientos | Apertura + entradas − salidas desde vigencia de control | Configuración de apertura/vigencia; cálculo se entrega en E1.4, no en E1.1 |
| Inversiones + Efectivo | Apertura + entradas − salidas de Movimientos − Compras + Ventas | Configuración, posición no disponible hasta E4.1/E4.2; sin falso cero |
| Inversiones + Inversión | Valoración agregada de posiciones de inversión | No implementar ni duplicar tblInversionesResumen; hasta E4.3 no disponible |
| Manual | Valor manual autorizado | Proponer captura explícita y lectura; semántica/fecha/nulos Q2 |
| Terminal | Financiación por transferencia y gasto desde terminal, sin duplicar compras | Maestro consultable; sin posición monetaria ficticia ni operaciones todavía |
| No controlado | No fingir posición calculada | Maestro consultable; etiqueta «No controlado», importe no aplicable |
| Exterior | S000 contraparte técnica, no cuenta patrimonial disponible | Registro de sistema visible como tal; protección propuesta Q3 |
| Liquidez | Solo Sí integra colchón; independiente de Finalidad/bolsa/permiso | Guardar atributo; sin sumar colchón ni fabricar KPI en E1.1 |
| Finalidad, Objetivo, bolsa, Estado | Distintos entre sí y de apertura/permiso | No deducir significado, dominios o defaults de uno a otro; Q1/Q3 |
| Permite salida a Exterior | Regla de salida directa, no inferida del banco o finalidad | Configurar explícitamente; su aplicación a operaciones llega con E1.4/E1.6 |

Para Terminal no se inventa aquí fórmula, apertura ni relación con un banco: fuente
no proporciona ese detalle. Un Control Manual no convierte un Tipo Inversión en un
nuevo tipo de operación ni reemplaza las reglas de valoración de posiciones de R5.

### Ciclo de vida propuesto — pendiente Q3
1. Alta con atributos explícitos y matriz autorizada; no crear una operación financiera.
   No predeterminar importe cero, Liquidez o permiso de salida. ID se devuelve al guardar.
2. Consulta por ID y nombre; filtros independientes; ficha de activos e inactivos.
3. Edición de nombre conserva identidad y relaciones. Actualización exige revisión vigente.
4. Desactivación es transición de uso futuro, no ajuste monetario ni cierre económico.
   Propuesta: fuera de nuevas selecciones, visible en historia, advertir saldo/relaciones
   cuando puedan calcularse. No exigir posición cero por inferencia. Dependencias activas
   que requieren el Saldo deben resolverse primero; no dejarlas huérfanas silenciosamente.
5. Reactivación conserva ID y datos, previa validación completa; no reinicia apertura,
   no crea hechos, no reabre ciclos y no resetea cálculos.
6. Sin borrado físico ni endpoint DELETE en la propuesta, también para no usados;
   alternativa de borrado no se da por aprobada. S000 queda excluido del ciclo ordinario.

### Protección histórica propuesta — pendiente Q3/DT5
| Cambio | Regla propuesta y consecuencia observable |
| --- | --- |
| ID / S000 técnico | Rechazar cambios de identidad; S000 sin edición ordinaria |
| Nombre | Renombrar por ID sin reescribir hechos/fotos; no prometer etiquetas congeladas hasta DT4 |
| Tipo, Control, apertura, inicio control, Manual | Sin hechos/relaciones económicas: validar y auditar. Con ellos: bloquear edición ordinaria; procedimiento excepcional aún no autorizado |
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

### DT2 — propuesta de modelo inicial; NO esquema aprobado
Recomendación: claves de negocio Sxxx como PK TEXT inmutables en SQLite STRICT, SQL
parametrizado con bun:sqlite y Effect para recursos/errores. Evitar ID interno duplicado
sin necesidad demostrada. Alternativa: INTEGER interno + Sxxx UNIQUE añade joins y
mapeo; solo elegir si el usuario identifica un requisito que lo justifique. Ambas permiten
preservar IDs; ninguna autoriza copiarlos de fuentes reales todavía.

| Grupo/entidad lógica propuesta | Datos persistentes candidatos | Restricciones/pendientes |
| --- | --- | --- |
| saldos | id TEXT PK, nombre TEXT, tipo TEXT, control TEXT, activo INTEGER, liquidez INTEGER, mostrar_como_bolsa INTEGER, permite_salida_exterior INTEGER | NOT NULL; booleanos 0/1; Tipo/Control enumerados y matriz Q1; ID inmutable en API y constraint/trigger por diseñar; S000 reservado |
| saldos: datos económicos | apertura_minor INTEGER nullable, inicio_control TEXT nullable, valor_manual_minor INTEGER nullable, fecha_valor_manual TEXT nullable | Obligación, signo y combinación condicionados a Q1/Q2/Q6; null no es cero; Manual no sobrescribe apertura |
| saldos: clasificación/objetivo | finalidad y objetivo, almacenamiento aún pendiente | No fijar TEXT/INTEGER/FK hasta conocer dominio/unidad de Q1; no es una copia de columnas del Excel |
| saldos: metadatos | revision INTEGER, creado_en TEXT, actualizado_en TEXT | Revisión positiva creciente; instantes UTC; no cambiar fecha económica por timestamp técnico |
| reserva de identificadores | siguiente número de Saldo, o mecanismo equivalente transaccional | Nunca MAX(id)+1 sin protección; reserva+alta atómicas, códigos conservados tras desactivación; mínimo tres dígitos/extensión Q5 |
| auditoría técnica | entidad/id, acción, revisión previa/nueva, instante UTC, actor, campos cambiados y motivo cuando sensible | Sin contraseña, token, secreto TOTP ni clave; retención y eventual valor anterior/nuevo requieren aprobación de alcance/privacidad |
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

**Dinero y fechas — recomendación condicional Q2/Q6.** Para apertura/Manual EUR con
escala 2 confirmada: INTEGER en céntimos, BigInt extremo a extremo y serialización JSON
de importes como texto decimal canónico (p. ej. fixture `"123.45"`), nunca FLOAT/REAL
ni Number para operar dinero. Propuesta de límite técnico absoluto 9 000 000 000 000 000
céntimos (dentro de int64); no es límite económico aprobado. Rechazar precisión extra,
exponentes, NaN, infinito, formatos ambiguos y overflow, sin redondear importes de entrada.
El formulario puede aceptar coma decimal española, con conversión exacta y sin miles
ambiguos; contrato API usa punto. La política de signos requiere Q2. Si fuente exige
más escala, alternativa decimal TEXT con aritmética exacta; no imponer dos decimales.
Objetivo no entra en esta regla hasta saber su unidad. Cantidad/precio/cambio de inversión
no se deciden ahora.

Fechas económicas: YYYY-MM-DD, fecha civil real (incluido bisiesto), sin desplazamiento
por zona horaria; semántica de inclusión/vigencia pendiente. Seguridad y auditoría:
instante UTC inequívoco; presentación Europe/Madrid. No inventar fecha financiera hoy.

**Atomicidad y concurrencia propuestas.** WAL con synchronous=FULL y timeout acotado,
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
las invariantes compuestas siguen en el servicio transaccional. Revisar schema/constraints
con Q1/Q2/Q3/Q5/Q6 antes de traducir a DDL. Ningún archivo SQL se añade aquí.

## Screens and interfaces

Wireframes PROPUESTOS, pendientes Q8; ASCII sin pantallas implementadas ni capturas.
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
| S102 Reserva demo   Efectivo  Manual        123,45 EUR *   [Ver]       |
| * Ejemplo condicionado a Q1/Q2; dato ficticio, no posición calculada.   |
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
| Valor Manual/fecha si procede    |
| Liquidez: selección explícita    |
| Finalidad [pendiente dominio]    |
| Objetivo [pendiente unidad]      |
| Mostrar como bolsa: Sí / No      |
| Permite salida Exterior: Sí / No |
| [Cancelar]        [Guardar]      |
+----------------------------------+
```
Formulario final adapta obligatoriedad a Q1/Q2; no expone campos irrelevantes como si
se debieran rellenar. Edición muestra ID solo lectura, cambios sin guardar avisan antes
de salir. Error no borra entradas; conflicto ofrece recargar/revisar sin perder borrador.
Permiso Exterior y Liquidez nunca se activan mutuamente. Antes de desactivar, resumen
de impacto y confirmación; si hay bloqueo, enlaces a dependencias disponibles sin SQL.

### Acceso propuesto DT1
Pantalla de contraseña -> desafío TOTP/código de recuperación -> aplicación. Estados
neutros de error, límites de intentos y expiración. Alta inicial solo herramienta local
con acceso administrativo, sin endpoint público de registro. Enrolado confirma un TOTP
antes de activar el factor; URI/semilla solo una vez en pantalla protegida, no en logs.
Se propone entrada manual en autenticador para evitar dependencia QR; QR opcional
exigiría justificar librería adicional y revisar su generación local, sin servicio externo.

## Empty, loading and error states
- Carga: estado anunciado, acciones de escritura deshabilitadas mientras se confirma envío.
- Vacío: distinguir catálogo sin Saldos de filtro sin resultados y de error de API.
- No calculable: importe null y etiqueta del control. Cero solo si dato Manual explícito
  aprobado o resultado de motor ya entregado; nunca por ausencia de fuente.
- Error campo: mensaje junto a control y resumen navegable; mantener valores escritos.
- 401: volver al acceso; no conservar payload financiero en almacenamiento persistente
  del navegador. 403/CSRF: rechazo sin escribir. 404: no encontrado con regreso a lista.
- 409: identidad duplicada, relación bloqueante o revisión obsoleta, con código específico;
  actualizar solo tras revisión, nunca reintento ciego de escritura.
- 422: contrato financiero inválido; no resultado parcial. 429: mensaje/Retry-After.
- 500/503: mensaje genérico y correlación técnica, sin SQL/rutas/stack ni secretos.
- Error de red tras POST: estado incierto, consultar/reconciliar antes de repetir. Propuesta
  de clave de idempotencia por alta con payload ligado y retención 24 h pendiente Q5;
  mismo intento devuelve el mismo ID, clave con distinto payload => conflicto.
- Éxito: confirmación anunciada, ficha con ID persistido y atributos leídos del servidor.

## API behavior and external dependencies

### DT1 — recomendación de seguridad, pendiente Q4
**Contraseña + TOTP + sesión opaca de servidor.** Bun.password Argon2id sin nuevo paquete
para hashes; proponer mínimo 15 y máximo 128 caracteres, admitir espacios/pegado, sin
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
Propuesta: 30 min inactividad/12 h absolutas, sin «recordarme»; desafío MFA 5 min y 5
intentos, nunca una sesión autorizada antes del segundo factor. Revocación servidor
al salir/cambiar credenciales/recuperar. Evitar refresh tokens/JWT en localStorage.

Protección API: guard de sesión completa en TODAS las rutas de negocio; solo acceso,
challenge y health mínimo sin datos pueden ser públicos. CSRF con token ligado a sesión
 y comprobación exacta Origin en mutaciones; origen local por config y futuro
https://myfinanzas.pp.ua cuando se autorice, sin CORS comodín/credenciales. API JSON,
validación por esquema Effect existente, límites de cuerpo/longitud, SQL parametrizado,
CSP y cabeceras por definir, Cache-Control: no-store en datos y acceso. No confiar
cabeceras proxy reenviadas salvo proxy configurado explícitamente. Propuesta límite de
cuerpo 16 KiB y nombre 1–120 caracteres sin controles, por aprobar con Q5/Q8.

Propuesta antiabuso: cinco fallos en 15 min disparan espera creciente acotada por
cuenta y origen; no bloqueo permanente que impida al único usuario recuperar acceso.
Contadores deben resistir reinicio; evitar que la persistencia permita agotar disco.
Auditar acceso/fallos con minimización de datos, sin credenciales/importes/cookies.
Parámetros exactos y retención de IP/eventos requieren aprobación Q4, no implican un
sistema antiabuso completo ya especificado/validado.

Recuperación: proponer diez códigos aleatorios de al menos 128 bits, mostrar una vez,
guardar hashes, consumo único transaccional. Con contraseña + código se sustituye
TOTP y se invalidan sesiones/códigos previos antes de nuevo enrolado. Pérdida de
contraseña o de todos los factores: procedimiento local administrativo, con control
 del sistema y custodia externa, restablece credenciales y obliga MFA, audita/revoca;
no endpoint remoto de bypass ni email de recuperación a configurar. Ese acceso
administrativo es una capacidad sensible que debe aprobarse y documentarse operativamente.

**Alternativas:** WebAuthn/passkeys resiste phishing y evita secreto compartido, pero
exige política de dispositivos de reserva, verificación de usuario/segundo factor y
orígenes local/producción. IdP OIDC con MFA reduce código de identidad, añade servicio,
metadatos externos y dependencia de disponibilidad/operación. No seleccionados.

**Dependencias candidatas, ninguna instalada:** `otpauth` para TOTP; `age` CLI para
backup cifrado (DT6). Sin nueva librería de sesiones, ORM, criptografía propia, servicio
email ni proveedor externo. Antes de autorizar uso: revisar mantenimiento, licencia,
compatibilidad Bun, advisories, versión exacta y lockfile/verificación del binario.
No se afirma aquí que se haya realizado esa auditoría o comprobado la API de esas herramientas.

### Contrato HTTP propuesto, sujeto a decisiones
Rutas bajo /api; errores JSON con code, mensaje no sensible, campos cuando proceda y
correlación; no revelar existencia de entidades a no autenticados.

| Operación propuesta | Respuesta esperada futura |
| --- | --- |
| POST /api/auth/login y desafío MFA | Desafío limitado; cookie autorizada solo al completar MFA; credenciales inválidas => error genérico |
| POST /api/auth/logout | Revocar sesión y cookie; requiere defensa CSRF |
| GET /api/auth/session | Estado mínimo de la propia sesión, sin factor/secreto |
| GET /api/saldos | 200 colección filtrada con identidad, atributos y estado de posición; paginación/cota propuesta 100 por página |
| GET /api/saldos/:id | 200 ficha o 404; acceso autenticado siempre |
| POST /api/saldos | 201 Location + ficha; ID servidor, atributos explícitos, idempotencia propuesta Q5 |
| PATCH /api/saldos/:id | Edición parcial con revisión esperada obligatoria; 200 nueva ficha o 409 |
| POST /api/saldos/:id/desactivar o /reactivar | Revisión + validación transaccional del impacto; 200 ficha, 409 bloqueo |
| DELETE /api/saldos/:id | Sin ruta habilitada; no borrar historia |

Contrato conceptual de posición: importe decimal o null + moneda cuando aplica +
condición (`manual`, `no_aplica`, `pendiente_motor`, `error_calculo`) + motivo. Estos
valores son de presentación, no nuevos controles financieros. Resultado calculado se
agregará al existir su motor; no persistir condición derivada como saldo independiente.
El GET demo actual cambia a contrato protegido únicamente en futura implementación
autorizada; no mantener una ruta de datos sin sesión por compatibilidad del bootstrap.

## DT6 — backups y recuperación propuestos, pendiente Q7

**Recomendación:** VACUUM INTO desde conexión dedicada, fuera de una transacción de
usuario, para producir snapshot SQLite coherente (incluido estado confirmado en WAL),
a archivo nuevo en directorio privado temporal 0700. No copiar solo .sqlite abierto ni
tratar un checkpoint como garantía suficiente de copia. Configurar espera/reintento
acotado ante busy y descartar snapshot interrumpido. Validar disponibilidad de esta
operación en Bun/SQLite y parámetro de ruta seguro antes de implementarla.

1. Snapshot local consistente a ruta generada de confianza, permisos archivo 0600;
   sin nombres aportados por cliente y sin endpoint público de descarga.
2. Abrir snapshot aislado, comprobar integrity_check, foreign_key_check y versión;
   fallo => no publicar backup ni podar copias buenas. No copiar claves de cifrado.
3. Cifrar con age y destinatario público; clave privada fuera del servidor y Git,
   con copia custodiada separadamente. Exportar de manera segura la clave de cifrado
   TOTP (DT1) en paquete de recuperación cifrado separado; DB sin ella no basta.
4. Manifest cifrado con versión app/esquema, instante UTC, identificador de copia y
   checksum; finalizar/sincronizar archivos y renombrar atómicamente solo tras éxito.
   No confundir SHA con confidencialidad o autenticación: las aporta cifrado autenticado.
   Eliminar temporal en finally; borrado seguro no se garantiza en SSD, por eso se
   propone volumen local cifrado y permisos restrictivos además de exposición mínima.
5. Proponer diaria + antes de futuras migraciones autorizadas, retención 7 diarias,
   4 semanales y 3 mensuales. No ejecutar scheduler ni migración en este STEP. Frecuencia,
   responsable y retención son propuesta; no garantizan RPO sin monitorización/destino.
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

**Objetivos a aprobar:** RPO 24 h y RTO 2 h orientativos para futura operación; E1.1
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
 de conciliación. Validar en servidor aunque UI ya valide. Matriz/obligatorios, signos,
fechas de apertura y reglas históricas pendientes no se sustituyen por defaults.

Casos a concretar con respuestas: nombres repetidos (propuesta aviso, ID distingue),
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
No simular estas capacidades en UI ni considerar aprobadas sus decisiones por este borrador.

## Acceptance checks
TODOS FUTUROS y condicionados a decisiones referenciadas; ninguno ejecutado sobre E1.1.
IDs estables locales AC-01…; relación con roadmap: E1.1-AC1 => AC-02/03/17;
E1.1-AC2 => AC-07/08; E1.1-AC3 => AC-09/10/11/12. Tests de motor de inversión quedan
fuera; se comprueba ausencia de resultado falso, no resultados que todavía no existen.

| ID | Action / preconditions | Expected observable result |
| --- | --- | --- |
| AC-01 | Autenticado, alta ficticia con atributos válidos según Q1/Q2; reiniciar y consultar | ID asignado persistente, misma ficha; no Movimiento de apertura |
| AC-02 | Renombrar un Saldo | ID y relaciones intactos, nombre actualizado, revisión incrementada |
| AC-03 | Intentar cambiar ID, duplicarlo o reutilizar desactivado; incluir dos altas concurrentes | Cambio/reutilización rechazados; altas concurrentes obtienen IDs distintos sin sobrescribir |
| AC-04 | Desactivar Saldo sin bloqueo y consultar historia; intentar seleccionarlo de nuevo | Historia conserva ID, nuevas selecciones excluyen inactivo; importe no se reajusta |
| AC-05 | Reactivar mismo Saldo y recargar | Mismo ID/apertura, vuelve a selección; sin hechos nuevos ni ciclo abierto |
| AC-06 | Consultar/intentar editar/desactivar S000, según Q3 | Etiqueta técnica y operaciones ordinarias rechazadas, sin posición cero |
| AC-07 | Cambiar solo Liquidez manteniendo Finalidad, bolsa y permiso | Solo cambia ese atributo; no se recalculan/infieren otros ni se muestra KPI incompleto |
| AC-08 | Cambiar permiso Exterior sin tocar Liquidez | Independencia persistente; no se reescribe validez de hechos históricos |
| AC-09 | Consultar control Terminal | Motivo de posición no aplicable; sin cero ni duplicación de compras |
| AC-10 | Consultar No controlado y Exterior | Etiquetas diferenciadas e importe null, sin cero ficticio |
| AC-11 | Consultar Manual con valor explícito y con ausencia permitida según Q2 | Valor autorizado exacto, incluso cero explícito; ausencia diferenciada y sin derivación automática |
| AC-12 | Consultar Movimientos/Inversiones en E1.1 | Fuente/configuración visibles; pendiente motor E1.4/E4, no posición calculada inventada |
| AC-13 | Enviar combinaciones inválidas, fechas irreales, precisión extra o overflow según Q1/Q2/Q6 | 422 específico sin escritura parcial ni redondeo silencioso |
| AC-14 | Cambiar apertura/Control/Tipo con dependencias ficticias; bloquear por impacto | 409 según Q3, datos/relaciones originales intactos; no fingir protección de fuentes aún no entregadas |
| AC-15 | Dos clientes editan revisión idéntica | Uno guarda; otro recibe conflicto y conserva borrador, sin actualización perdida |
| AC-16 | Forzar fallo de persistencia/auditoría en actualización | Rollback íntegro de datos/revisión/auditoría, error externo genérico |
| AC-17 | Referencia fixture por Sxxx y renombrado/desactivación | FK válida e historia consultable, sin cascada/borrado; pruebas no crean módulos futuros |
| AC-18 | Acceder API sin sesión, con desafío MFA parcial, expirada o revocada | Ninguna ruta financiera filtra datos o permite escritura; 401 |
| AC-19 | Login correcto/incorrecto, replay TOTP, desafío vencido y límite de intentos | Solo flujo completo crea sesión; replay/abuso rechazados, no secretos en respuesta/log |
| AC-20 | Cookie sesión + petición mutante sin CSRF/origen autorizado | Rechazo sin cambio; cookie inaccesible JS y flags por entorno; HTTP fuera de loopback rechazado |
| AC-21 | Usar código recuperación dos veces y recuperar credenciales según Q4 | Primer uso único y reenrolado; segundo rechazado; sesiones previas revocadas |
| AC-22 | Formularios/lista/ficha/error/vacío/carga a 390 y 1440 px, teclado | Sin overflow/recortes; foco/etiquetas accesibles, valores conservados y errores asociados; capturas inspeccionadas |
| AC-23 | Alta enviada con respuesta de red perdida; repetir clave idempotencia propuesta Q5 | Mismo ID y un registro; payload diferente con misma clave => conflicto |
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
  variantes de cada Control; solo asignar matriz/importes válidos tras respuestas.
  Ejemplos de importes 0, 123.45 y casos negativos solo donde Q2 los autorice; datos no
  copiados de finanzas reales. Identificadores ficticios no constituyen mapping de migración.
- Cada AC se marcará pasado/fallido/no ejecutado en etapa de desarrollo autorizada;
  este plan no sustituye evidencia ni autoriza implementarlo. Datos/DB/capturas sensibles fuera de Git.

## Puerta de revisión y siguiente acción
Responder [Q1–Q8](01-saldos-control-brainstorming.md), revisar wireframes y aprobar o
corregir recomendaciones DT1/DT2/DT6. Después se ajustará la propuesta y se solicitará
aprobación expresa de la especificación completa; ni las respuestas parciales ni una
PR documental autorizan desarrollo o merge. No iniciar E1.2 ni STEP 6/7/8.
