# 02 — E1.2 Clasificación utilizable y conservación histórica: Specification
Status: DRAFT — propuesta para revisión, no aprobada ni implementada.
Approval source/date: PENDING
Context and brainstorming: [decisiones y evidencias](02-clasificacion-brainstorming.md),
[roadmap E1.2](roadmap.md#e12--clasificación-utilizable-y-conservación-histórica),
[referencia](functional-reference-v5.11.md), [UI común](guidelines/ui.md).

## Functionality
Gestionar Categorías, Subcategorías y Partidas con identidad estable y cadena única
por ID, consultando activos/inactivos, creando, editando y desactivando/reactivando.
No duplicar Categoría en Partida ni información económica derivada.
Conservar historia, permitir gasto sin Presupuesto y distinguir renombrado de cambio
económico. Sin versionado general de catálogo. Solo local con fixtures ficticios;
Excel permanece maestro. Este documento no autoriza desarrollo.

### Autoridad y límites de evidencia
- Excel contrastado por usuario/Álex: atributos y cadena; dominios de Configuración;
  Control de integridad de Subcategorías; comportamiento de Referencia obligatoria.
- Contratos app confirmados: Grupo descriptivo opcional; Estado en padres y guardas
  sin cascada; renombrado con nombre vigente; P4 con impacto indirecto explícito.
- Propuesta del usuario incorporada para revisión final: elección explícita Sí/No
  en nuevas Categorías, preservando posibles ausencias históricas.
- No demostrado: consumo directo actual de Cálculo anual, nulabilidad histórica de
  cálculos, comparador exacto de nombres duplicados, matriz completa de tipos de
  Referencia. No convertir observaciones en reglas nuevas. No bloquean este borrador;
  deben contrastarse antes de implementar validaciones dependientes no aprobadas.

## Data model and contracts
Modelo lógico propuesto, sin DDL ni aprobación implícita de esquema físico.

| Entidad | Datos propios | Derivación / protección |
| --- | --- | --- |
| Categoría | ID CATxxx; nombre; Grupo opcional; Cálculo anual; Cálculo mensual; Referencia obligatoria; Estado app | Métodos independientes; no motor ni agrupación económica por Grupo |
| Subcategoría | ID SUBxxx; nombre; ID Categoría obligatorio; Estado app | Categoría única; Control validación derivada, no persistido |
| Partida | ID PARxxx; nombre; ID Subcategoría obligatorio; Estado; contratos opcionales Presupuesto y Deuda | Categoría y atributos superiores derivados por cadena, no duplicados |

IDs inmutables, no reutilizables, nombres no claves. Propuesta técnica: generación
atómica por prefijo, sin reinicio por ejercicio, extendiendo patrón de E1.1 más allá
999; revisión técnica/UTC para concurrencia y auditoría mínima, no catálogo versionado.
No borrado físico en interfaz/API; simplifica protección histórica.
No imponer unicidad de nombres de Categoría/Partida sin evidencia.

### Unicidad de Subcategorías: evidencia y decisión pendiente
La evidencia aportada demuestra que Control comprueba duplicados de ID y nombre,
pero no incluye la fórmula/rango de búsqueda ni el comparador físico utilizados.
El ID estable es único en el catálogo; no hay evidencia suficiente para fijar el
alcance de la unicidad del nombre (global o por Categoría), ni el tratamiento de
mayúsculas, acentos, espacios o normalización Unicode. No seleccionar silenciosamente
una collation de SQLite, case-folding, eliminación de acentos o índice por padre.
**Decisión pendiente antes de implementar esa validación:** aportar fórmula/rango
y casos sanitizados de comparación vigentes, o aprobar explícitamente un contrato
app que resuelva alcance y comparador. No considerar esta reserva aprobada por
extensión de la valoración favorable. AC-10 queda condicionado a esa resolución;
no afirmar que el mero dominio de nombres actuales demuestre el comparador.

### Métodos de cálculo: configuración, no ejecución
| Campo | Dominio confirmado | Contrato futuro |
| --- | --- | --- |
| Anual | Ingreso; Gasto; No aplica | Suma por tipo/Categoría en anual, o sin cálculo desde Movimientos |
| Mensual | Ingreso; Gasto; Gasto compartido neto; No aplica | Suma por tipo/Categoría/ciclo; neto compartido mínimo cero; o sin seguimiento ejecutado |

No aplica es valor explícito, no sustituto de vacío ni importe cero. Formularios
propuestos sin preselección económica, con elección de un valor de dominio en altas
ordinarias (regla de app propuesta, no obligatoriedad demostrada del Excel).
Posibles ausencias de fuentes históricas quedan sin normalización automática para
mapping futuro autorizado. Este borrador no aprueba su importación.
Esencial/Base/Del mes quedan fuera de los maestros y de E1.2.

### Referencia obligatoria
Alta propuesta exige Sí/No explícito, sin switch inicial false heredado de Saldos.
Edición preserva valor real; ausencia histórica se muestra Sin informar y no se
convierte al guardar otro atributo. Sí requiere Referencia registrada, Tipo válido y
esperado por Categoría según tblTiposReferencia; con valor «No», Referencia es opcional; vacío no activa
obligación histórica. Herencia por Partida alcanza Gasto y Amortización deuda.
No afirmar que Referencia opcional exime otras restricciones del tipo de operación.
Anticipo/Compartido conservan contratos específicos; no completar matriz por inferencia.
Sin maestro, selector ni validador de Movimientos en esta entrega. Tipo esperado no
se añade como atributo arbitrario de Categoría: mapping funcional pendiente de su
consumidor. No derivarlo de Grupo o nombres.

### Presupuestos y Deudas
Contratos 0..1 por Partida. En catálogo local nuevo sin esos maestros, no se generan
vínculos ni se ofrecen IDs libres. Mostrar Sin asignación y explicación de módulo
pendiente, sin aparentar selector operativo. No registrar referencias provisionales.
E2.2/E1.6 habilitarán selección validada y guardas de cambio; E1.2 no ejecuta motores.

### Continuidad de una base local E1.1 existente
Contrato de actualización futuro de E1.2, no migración implementada ni autorizada
por este documento. La base E1.1 actual usa schema_version=1. La incorporación de
clasificación exige una actualización explícita, transaccional y versionada del
esquema, sin eliminar/recrear la base ni exigir reiniciar el bootstrap.
Preservar Saldos y sus IDs/S000, atributos, null/false/cero, revisiones/UTC, contadores,
auditoría e idempotencia; conservar también propietario, hash de contraseña, secreto
TOTP cifrado, anti-replay, recuperación, sesiones/desafíos vigentes y límites de acceso.
No pedir reenrolado, resetear contraseñas, resembrar Saldos ni sobrescribir registros.
No clonar claves/factores reales: la prueba usa factores efímeros locales y fixtures.
La clave TOTP externa permanece compatible, en su ubicación privada; nunca se publica.

La actualización debe comprobar versión compatible, adquirir bloqueo de escritura,
revalidar versión dentro de la transacción y publicar la nueva versión únicamente
al completar el cambio. Un fallo revierte esquema/versión y datos; versión desconocida
se rechaza sin modificar contenido. Reabrir es idempotente y el arranque concurrente
no duplica cambios ni reproduce SQLITE_BUSY del upgrade diferido corregido en PR #9.
No confundir esta evolución local con importación financiera ni uso productivo.
Copia cifrada local verificable antes del cambio y restauración aislada según E1.1;
no automatización externa ni infraestructura nueva.

## Validation and edge cases
Nombre obligatorio y relación paterna existente/única. Subcategoría valida integridad
en orden demostrado: ID, nombre, duplicado ID, duplicado nombre, Categoría existente
única y coincidencia del ID derivado. API valida; UI anticipa sin ser única defensa.
Persistir solo ID padre evita crear un segundo ID derivado editable. Errores muestran
campo/motivo comprensible, nunca SQL. No persistir texto OK/ERROR como maestro.

Propuesta operativa coherente con guardas aprobadas: altas Activa; padre activo al
crear/reactivar/reubicar. Inactivos siguen consultables y no se seleccionan para
nuevas relaciones. Editar un nombre no obliga a reemplazar un padre inactivo existente.
Bloquear desactivación con descendientes activos; listar dependencias directas e
indirectas. Reactivar no cambia hijos. Sin cascadas económicas ni de Estado.

### Protección histórica y corrección
Clasificar modificaciones: presentación (nombre/Grupo sin cambio de significado),
económicas (padre, métodos, exigencia de Referencia, vínculos futuros) y Estado.
Cambio económico sin uso: validación normal. Con uso directo/indirecto: edición
ordinaria no permite aplicarlo silenciosamente; acción Rectificar con vista previa.
Para cambio solo futuro crear nueva Partida y desactivar anterior cuando corresponda;
no desplazar ramas usadas como atajo para evitar revisar impacto.

Vista previa E1.2: valores antes/después y dependencias verificables del catálogo.
Hechos, periodos e indicadores económicos afectados solo podrán detallarse al
integrar los consumidores futuros; en E1.2 se identifican como no comprobados.
La vista declara cobertura consultada y bloqueos reales. Explicar: «Aunque no cambien
las filas de Movimientos, esta relación puede reclasificar y recalcular resultados
históricos». Motivo obligatorio y confirmación explícita antes de transacción atómica.
Revalidar revisiones e impacto al confirmar; si cambió, cancelar operación y pedir
nueva vista previa. Auditoría mínima de cambio/motivo/UTC, sin crear versiones financieras.
No modificar fotos. Si afecta a cierres protegidos, bloquear hasta procedimiento
aprobado. Revisión de dependencias incluye uso indirecto por descendientes.

**Límite de aceptación:** E1.2 solo muestra dependencias verificables del catálogo.
No crear motores simulados ni resultados financieros ficticios para completar la
vista. Dobles aislados pueden probar el protocolo técnico de fallo/bloqueo, nunca
se sirven en la app ni se presentan como impacto económico comprobado.
E1.2 no tiene Movimientos, planes, indicadores ni cierres: vista real cubre catálogo
y declara consumidores pendientes; no muestra importes ni periodos inventados.
Pruebas de contratos con fixtures aislados no prueban integración futura. Fuente
instalada inaccesible/error: fallo cerrado, no tratar como cero usos. Cada consumidor
futuro conecta su guard antes de permitir cambios que afecten historia; no afirmar
protección completa de módulos inexistentes ni crear fuentes vacías para simularla.

## Screens and interfaces
Propuesta visual aceptada como base por revisión de Álex sobre 9317940, comunicada
por el usuario; especificación completa aún pendiente de aprobación. Reusar shell,
tema claro, paleta MyFinanzas,
texto oscuro sobre verde principal, tablas escritorio/tarjetas móvil y páginas propias.
IDs visibles en fichas y selectores cuando desambigüen; no saturar todas las celdas.
Cabecera Ciclo financiado: No disponible hasta maestro correspondiente.

### Listado escritorio
```text
MyFinanzas | Ciclo financiado: No disponible
Clasificación
[Categorías] [Subcategorías] [Partidas]             [+ Nueva]
[Buscar nombre o ID] [Categoría v] [Subcategoría v] [Activas v]
Nombre             Jerarquía                Estado       Acción
Partida ejemplo    Categoría / Subcategoría Activa       Ver
```
Pestañas cambian entidad; filtros de jerarquía solo donde apliquen. Activos por
defecto, inactivos consultables, filtros encadenados y acciones con alcance claro.

### Móvil
```text
[Menú] MyFinanzas
Clasificación
[Partidas v]                    [+ Nueva]
[Buscar] [Filtros]
+--------------------------------+
| Partida ejemplo         Activa  |
| Categoría / Subcategoría        |
| Ver ficha                      |
+--------------------------------+
```
Mismos filtros/acciones, sin tabla horizontal obligatoria ni funcionalidad perdida.

### Ficha y formulario
```text
Clasificación / Subcategorías / Ejemplo
SUBxxx · Activa                         [Editar]
Identificación: nombre
Jerarquía: Categoría (enlace)
Integridad: OK / motivo comprobable
Descendientes: Partidas (enlace filtrado)
[Desactivar] [Rectificar configuración]
```
Formulario propio con Identificación, Jerarquía/configuración y Estado según entidad.
Categoría: Grupo con sugerencias no restrictivas; anual/mensual en selectores
independientes sin selección económica inicial; Referencia obligatoria Sí/No sin
preselección (opciones explícitas, no switch default). Partida: aviso de Presupuesto/
Deuda pendientes, no campos editables ficticios. ID asignado por servidor al guardar.
Cancelar no persiste; error conserva borrador. Campos derivados de solo lectura.

### Rectificación
```text
Rectificar configuración de SUBxxx
Antes: Categoría A        Después: Categoría B
Descendientes afectados: lista verificable
Cobertura: catálogo comprobado / impacto financiero no comprobado
Aviso: puede recalcular clasificaciones sin editar Movimientos
[Motivo obligatorio................................]
[Cancelar] [Confirmar rectificación]
```
Confirmación deshabilitada si hay cierre protegido o falla una fuente instalada.
No etiqueta «sin impacto histórico» sin cobertura que lo demuestre.

## Empty, loading and error states
Carga anunciada, vacío catálogo distinto de sin coincidencias; crear o limpiar filtros.
Error con reintento, sin sustituir por lista vacía. Formularios conservan datos en 422,
409 y errores de red; sesión expirada reutiliza acceso E1.1 preservando borrador.
404 ficha inexistente; bloqueo de estado muestra descendientes; conflicto solicita
recargar/revisar sin sobreescritura. Foco visible, etiquetas/errores asociados, teclado,
mensajes anunciados, sin depender del color. Validación visual futura real 390/1440;
ASCII no sustituye capturas ni conformidad de accesibilidad.

## API behavior and external dependencies
Propuesta de rutas JSON protegidas por sesión MFA/Origin/CSRF existentes bajo
/api/clasificacion/{categorias|subcategorias|partidas}: GET listado/ficha, POST alta,
PATCH edición por revisión; acciones de estado y vista previa/confirmación de
rectificación separadas. Sin DELETE, SQL ni implementación de endpoints ahora.
Validar estructura y dominios en servidor, consultas parametrizadas y transacciones;
reutilizar idempotencia de altas y manejo de conflictos E1.1. PATCH omitido conserva;
null solo donde ausencia tenga semántica definida, nunca falso/No aplica implícito.
400 estructura inválida, 401 acceso, 403 autorización/CSRF, 404 inexistente,
409 conflicto/dependencias/protección, 422 validación, 500 genérico con requestId.
No payload financiero/credenciales en logs. Reusar stack y dependencias; ninguna
biblioteca nueva ni servicio externo necesarios. Backups locales existentes deberán
incluir nuevas entidades y verificarse restaurando fixtures una vez implementadas.

## Exclusions
Código, DDL/migraciones, datos reales, Excel, despliegue, contratación; motores anual,
mensual, Movimientos, Referencias, Presupuestos y Deudas; importación y mapping real;
fotos/cierre/reapertura; versionado general y catálogo de Conceptos.

## Acceptance checks
Todos son FUTUROS, no ejecutados. I: verificable al implementar E1.2; C: contrato de
consumidor posterior, no aceptación de motor completado por tests dobles.
Se mantienen **31 criterios: 27 I y 4 C (AC-19, AC-24, AC-25, AC-26)**.
AC-31 incluye continuidad SQLite además de copia/restauración, sin renumerar criterios.

| ID | Action / preconditions | Expected observable result |
| --- | --- | --- |
| AC-01 I | Crear entidad en cada nivel con datos ficticios válidos | ID estable de su prefijo; cadena por ID conservada tras reinicio |
| AC-02 I | Crear dos entidades concurrentes y continuar tras 999 | IDs únicos sin reutilización ni truncado |
| AC-03 I | Renombrar sin cambiar significado | Mismo ID; nombre vigente en consulta viva; ficha mantiene identidad |
| AC-04 I | Crear/reubicar con padre inexistente | Rechazo sin escritura parcial |
| AC-05 I | Consultar Partida y cambiar relación autorizada | Categoría deriva de Subcategoría; no copias independientes editables |
| AC-06 I | Revisar campos de los tres formularios | Solo atributos propios; no Base/Esencial/Del mes en maestros |
| AC-07 I | Crear/editar Grupo vacío o nuevo texto | Válido; sugerencias no restringen; no maestro adicional |
| AC-08 I | Anual No aplica y mensual Gasto | Combinación independiente conservada, sin importe calculado |
| AC-09 I | Enviar valor ajeno a dominios de cálculo | Rechazo con mensaje de campo; sin conversión a No aplica |
| AC-10 I | Resolver evidencia/contrato pendiente de alcance y comparador; probar ID/nombre duplicado y casos entre Categorías, mayúsculas, acentos y espacios | Validación según contrato explícitamente confirmado, sin normalizaciones inventadas; no Control persistido ni aceptación cerrada antes de resolver reserva |
| AC-11 I | Intentar desactivar padre con descendiente activo | Bloqueo con descendientes identificados; nada se desactiva en cascada |
| AC-12 I | Desactivar rama de abajo arriba y reactivar padre | Inactivos consultables; hijos siguen inactivos |
| AC-13 I | Crear/reactivar bajo padre inactivo | Bloqueo explicable; no nueva selección de inactivos |
| AC-14 I | Intentar borrar o cambiar ID | Rechazo; histórico y relaciones preservados |
| AC-15 I | Cambiar economía con dependencias verificables del catálogo | No cambio silencioso: rectificación con vista de dependencias reales, motivo y confirmación; sin atribuir uso financiero inexistente |
| AC-16 I | Revisar cambio en padre con descendientes reales | Muestra dependencias del catálogo y explica posible recálculo indirecto; impacto financiero explícitamente no comprobado |
| AC-17 I | Cambiar revisión/dependencias después de vista previa | Confirmación rechazada sin escritura; requiere revisar nuevo impacto |
| AC-18 I | Probar fallo de lectura del catálogo y, aisladamente, protocolo de guard con doble que bloquea/falla | Sin escritura parcial; doble no es motor simulado servido ni prueba de cierres reales, cuya integración pertenece a AC-19 |
| AC-19 C | Integrar hechos/planes/indicadores/cierres futuros y repetir rectificación | Impacto real por movimientos, periodos e indicadores; bloqueos efectivos, fotos intactas |
| AC-20 I | Consultar impacto sin consumidores entregados | Cobertura catálogo y pendientes explícitos; no ceros/importes/periodos inventados |
| AC-21 I | Crear Partida sin Presupuesto/Deuda | Válida; no selectores/IDs ficticios ni maestros adelantados |
| AC-22 I | Alta Categoría omitiendo Referencia obligatoria | Exige Sí/No explícito, no default false |
| AC-23 I | Fixture histórico ausente y editar otro campo | Sin informar preservado; no conversión a No ni a No aplica |
| AC-24 C | Gastos/Amortizaciones con Categoría que exige Referencia | Consumidor valida existencia, Tipo y mapping esperado; no obligación desde Grupo |
| AC-25 C | Operaciones Anticipo/Compartido | Consumidor aplica reglas específicas contrastadas; E1.2 no simula motor |
| AC-26 C | Consumir métodos anual/mensual con fuentes futuras | Semántica de Configuración y ciclo maestro; neto compartido mínimo cero; no doble cálculo |
| AC-27 I | Buscar/filtrar/consultar/crear/editar en escritorio y móvil | Mismas capacidades, tabla/tarjetas y páginas propias; identidad existente |
| AC-28 I | Forzar carga/vacío/error/conflicto/sesión caducada | Estados distintos, reintento y borrador conservado; sin sobreescritura |
| AC-29 I | Operar teclado y revisar capturas 390/1440 | Foco/etiquetas, sin overflow; texto legible, tema claro; inspección real documentada |
| AC-30 I | Petición sin MFA o mutación sin CSRF/Origin válido | Protección E1.1 conservada; sin datos sensibles en respuesta/logs |
| AC-31 I | Actualizar base local E1.1 versión 1 con Saldos modificados y autenticación ficticia configurada; reabrir, probar rollback/concurrencia y restaurar copia aislada | Esquema evoluciona sin reset/resemilla; todos los datos previos se preservan, login/MFA siguen operativos; actualización idempotente/atómica y restauración compatible; sin afirmar producción |

## Validación futura y siguiente paso
Bun integración SQLite/API: invariantes, rollback/concurrencia, errores y guardas;
Playwright real con MFA: recorrido de tres niveles, estados, corrección disponible,
390/1440 y capturas inspeccionadas. Contratos futuros trazados por separado.
Pruebas previstas de AC-31, sin ejecutar todavía:

1. Crear base de archivo con implementación E1.1 vigente y datos ficticios no triviales:
   Saldos editados/inactivos, apertura negativa, null/cero/false y contadores avanzados;
   enrolar propietario/TOTP y registrar recuperación/sesión vigentes sin publicar factores.
2. Capturar estado lógico de todas las tablas previas; actualizar con futura versión
   E1.2 y comparar registros/valores antes de efectuar nuevas acciones de autenticación
   (estas sí cambian legítimamente sesiones, anti-replay y eventos).
3. Verificar lectura/edición de Saldos, login contraseña+TOTP real, sesión previamente
   vigente y acceso de clasificación; comprobar copia/restauración aislada y login
   posterior según política E1.1 de revocación en restauración, distinta del upgrade.
4. Reabrir dos veces y ejecutar aperturas concurrentes: sin duplicados/resemilla/reset.
5. Inyectar fallo de actualización y verificar rollback lógico íntegro de datos,
   esquema y versión; rechazar versión desconocida sin cambios. No exigir identidad
   binaria del archivo SQLite tras actividad WAL como sustituto de integridad lógica.

Ahora solo controles documentales. Base visual aceptada; pendiente aprobación
expresa de especificación; no iniciar `$dev 02` ni declarar E1.2 implementada.
