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
No imponer unicidad de nombres de Categoría/Partida sin evidencia. Subcategoría
rechaza duplicados demostrados; no inventar equivalencia de acentos/case ni alcance
por padre. Antes de cerrar implementación concretar comparador contra referencia.

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

Vista previa: valores antes/después, descendientes afectados, hechos/periodos e
indicadores impactados, cobertura consultada y bloqueos. Explicar: «Aunque no cambien
las filas de Movimientos, esta relación puede reclasificar y recalcular resultados
históricos». Motivo obligatorio y confirmación explícita antes de transacción atómica.
Revalidar revisiones e impacto al confirmar; si cambió, cancelar operación y pedir
nueva vista previa. Auditoría mínima de cambio/motivo/UTC, sin crear versiones financieras.
No modificar fotos. Si afecta a cierres protegidos, bloquear hasta procedimiento
aprobado. Revisión de dependencias incluye uso indirecto por descendientes.

E1.2 no tiene Movimientos, planes, indicadores ni cierres: vista real cubre catálogo
y declara consumidores pendientes; no muestra importes ni periodos inventados.
Pruebas de contratos con fixtures aislados no prueban integración futura. Fuente
instalada inaccesible/error: fallo cerrado, no tratar como cero usos. Cada consumidor
futuro conecta su guard antes de permitir cambios que afecten historia; no afirmar
protección completa de módulos inexistentes ni crear fuentes vacías para simularla.

## Screens and interfaces
Propuesta pendiente de feedback visual. Reusar shell, tema claro, paleta MyFinanzas,
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
Impacto histórico: fuentes disponibles / fuentes pendientes
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
| AC-10 I | Revisar integridad de Subcategoría e intentar datos inválidos | Validaciones de la secuencia contrastada; no Control persistido |
| AC-11 I | Intentar desactivar padre con descendiente activo | Bloqueo con descendientes identificados; nada se desactiva en cascada |
| AC-12 I | Desactivar rama de abajo arriba y reactivar padre | Inactivos consultables; hijos siguen inactivos |
| AC-13 I | Crear/reactivar bajo padre inactivo | Bloqueo explicable; no nueva selección de inactivos |
| AC-14 I | Intentar borrar o cambiar ID | Rechazo; histórico y relaciones preservados |
| AC-15 I | Cambiar economía con uso detectado por fixture de contrato | Edición ordinaria bloqueada; rectificación exige vista, motivo y confirmación |
| AC-16 I | Revisar impacto de cambio en padre usado indirectamente | Incluye descendientes y explica recálculo aunque no cambien filas de hechos |
| AC-17 I | Cambiar revisión/dependencias después de vista previa | Confirmación rechazada sin escritura; requiere revisar nuevo impacto |
| AC-18 I | Fixture declara cierre protegido o error de fuente instalada | Fallo cerrado; no altera fotos ni configuración |
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
| AC-31 I | Copia cifrada local y restauración aislada de fixtures | Jerarquía/atributos/estados idénticos; no afirma operación externa/producción |

## Validación futura y siguiente paso
Bun integración SQLite/API: invariantes, rollback/concurrencia, errores y guardas;
Playwright real con MFA: recorrido de tres niveles, estados, corrección disponible,
390/1440 y capturas inspeccionadas. Contratos futuros trazados por separado.
Ahora solo controles documentales. Pendiente revisión de wireframes y aprobación
expresa de especificación; no iniciar `$dev 02` ni declarar E1.2 implementada.
