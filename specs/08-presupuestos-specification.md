# 08 — E2.2 Presupuestos: Specification

Status: APPROVED — especificación y wireframes aprobados e integrados en main por squash PR #39 (20d8f9a). Desarrollo dev08 autorizado e integrado por PR #44 (255bf61) el 2026-10-23; ver [progreso](08-presupuestos-progress.md).
Approval source/date: aprobación documental final de Álex y autorización expresa de squash PR #39 sobre HEAD 0f3d4e5, con CI push39851581005/PR39851590534 SUCCESS, 2026-10-22 (registro de merge 20d8f9a y [tablero](epic-board.md)). Revisión financiera favorable previa de Álex, misma fecha. Sin merge ni dev08 adicionales autorizados.
Contexto/decisiones: [brainstorming08](08-presupuestos-brainstorming.md). Revisión financiera de Álex recibida el2026-10-22: se incorporan sus cuatro ajustes como instrucciones vigentes. Las menciones de aprobación pendiente en el cuerpo describen la revisión previa a la integración; el estado vigente es esta cabecera. No hay autorización de desarrollo.

## Funcionalidad y alcance

Mantener el maestro único Presupuestos con identidad estable, fuente de ejecución y Saldo destino, y permitir el vínculo opcional desde Partidas existentes. Consultar por ID, nombre, fuente, destino y Partidas relacionadas. Propuesta de búsqueda/filtros por fuente/destino/Estado, reutilizando tabla/tarjetas y páginas de ficha/formulario existentes.

E2.2 define la configuración que E2.3 consumirá; no crea planes ni calcula ejecutado por ciclo. La cabecera de Ciclos reutiliza el contrato mínimo integrado E1.3, sin incorporar ni aceptar E2.1 por inferencia. No requiere corregir AC23 para completar esta fase documental.

## Dependencias y autorización

| Dependencia | Estado / alcance necesario |
| --- | --- |
| E1.1 Saldos | Integrada; seleccionar identidad/destino y respetar Estado sin alterar posición |
| E1.2 Clasificación | Integrada; habilitar contrato0..1 Presupuesto en Partida, sin romper jerarquía |
| E1.6 Deuda | Integrada; conservar enlace Deuda, cuota y amortización independientes |
| R1/R3/P3 y revisión financiera de Álex | Fuentes/imputación; la revisión posterior precisa destino por fuente y unicidad Aportación a saldo, sustituyendo generalizaciones anteriores |
| Q1–Q4 | Respuestas e instrucciones registradas en ronda2 del brainstorming; contrato de nombres resuelto en ronda3; solo queda aprobación documental final |
| E2.1 | NO es dependencia de E2.2 en roadmap; AC23/global permanecen bloqueados |
| E2.3 | Consumidor posterior: plan/ejecutado/estados; no implementado por E2.2 |

Preparación local en rama spec/08-presupuestos sobre c04dc07, que contiene las dependencias integradas; PR documental preparada desde main9afa6172, que añade la metodología v2.4.1 sin alterar las dependencias financieras. No importar schema8 ni código no integrado de dev07. La base real de una futura implementación deberá reconciliarse al autorizarla; no se fija una versión SQL nueva en esta especificación. Dev32/PR30/AC22 y otras líneas pausadas no se reanudan. AC23-SQLITE conserva cierre inconcluso y relación de bloqueo con aceptación E2.1.

## Reglas vigentes tras revisión financiera de Álex

1. Fuente pertenece al Presupuesto; dominio cerrado: **Gasto real / Aportación a saldo / No aplica**. Rechazar Devolución anticipo y valores desconocidos sin coerción.
2. Saldo destino obligatorio para **Gasto real** y **Aportación a saldo**; para **No aplica debe permanecer vacío**. Rechazar tanto la ausencia de destino cuando es obligatorio como un destino informado con No aplica; no descartar ni completar datos silenciosamente. No inferir destino por nombre, Partida ni banco de un Movimiento, ni fuente por destino. Nuevos destinos: Saldos internos activos distintos de S000, sin restricciones adicionales por Liquidez, Finalidad o Control. Relaciones históricas con destinos posteriormente inactivos se conservan.
3. Partida puede no tener Presupuesto, o tener exactamente uno. Varias Partidas pueden consumir el mismo Presupuesto. No se elimina ni altera su relación opcional con Deuda.
4. Para Gasto real, la atribución futura depende del vínculo de Partida, no de coincidencia de Saldo. Seleccionar destino no reclasifica movimientos ni crea transferencias, reservas, gastos o ingresos.
5. **Dos Presupuestos con fuente Aportación a saldo no pueden compartir Saldo destino**. La restricción se verifica tanto en alta como al editar fuente/destino y en cambios concurrentes; no se introduce una excepción por Estado no indicada por la revisión. Otros Presupuestos, especialmente Gasto real, pueden compartir destino, incluido el usado por una Aportación a saldo: Gasto real se imputa por Partida. Ningún destino compartido representa reserva exclusiva ni se suma repetidamente como patrimonio.
6. Cuota ordinaria sigue siendo Gasto por importe íntegro; amortización extraordinaria no pasa a ser Gasto ni ejecución presupuestaria. No cambiar ledger, capital o banco al editar maestro/enlace.
7. Base, Esencial, Del mes y A transferir no son campos de alta del maestro; los contratos de plan anual/mensual conservan sus entregas.

| Fuente vigente | Saldo destino | Compartición permitida |
| --- | --- | --- |
| Gasto real | Obligatorio | Puede coincidir con otros Gasto real y con una Aportación; imputación por Partida |
| Aportación a saldo | Obligatorio | No puede coincidir con otra Aportación a saldo; sí con Gasto real |
| No aplica | Vacío | No tiene destino que compartir |

### Nombres — contrato de aplicación confirmado

Reutilizar exactamente el criterio aprobado e implementado para Subcategorías: comparación global sin distinguir mayúsculas, conservando texto con tildes, espacios y caracteres Unicode sin normalizaciones adicionales. No trim, eliminación de tildes ni normalización Unicode añadida para hacer coincidir nombres. * y ? son literales, no patrones. El alcance incluye activos e inactivos, también al renombrar; comprobar unicidad atómicamente con la escritura y ante procesos concurrentes. Un renombrado de la misma entidad no se considera duplicado de sí mismo. Nombre no vacío obligatorio, ID independiente/estable.

Casos de aceptación de nombres: «Viaje»/«VIAJE» colisionan, también si uno está inactivo; «Viaje»/«Viajé» y «Viaje»/«Viaje » permanecen distintos según el criterio reutilizado. «Plan*» y «Plan?» se comparan por sus caracteres literales, nunca como patrones de otros nombres. No añadir equivalencias para representaciones Unicode distintas. Dos altas o renombrados concurrentes que convergen al mismo nombre no pueden dejar duplicados ni escritura parcial. Estos casos concretan AC-12/AC-17, sin aumentar los24 criterios operativos.

Fuente: cierre de decisiones de Álex tras contraste directo comunicado de tblPresupuestos[Control] en v5.11(7). COUNTIF físico no normaliza explícitamente tildes/espacios; los comodines literales son decisión de app, NO equivalencia exacta atribuida a Excel. No inspección independiente ni modificación del libro por el agente.

### Semántica para consumidores posteriores, NO motor implementado aquí

| Fuente | Contrato R3 que deberá consumir E2.3 |
| --- | --- |
| Gasto real | Gastos por Partida/Presupuesto dentro del ciclo; cuota por total, no solo intereses |
| Aportación a saldo | Transferencias ordinarias al destino; excluir Referencias y entradas Exterior. Gasto posterior no vuelve a ejecutar ese plan |
| No aplica | Sin ejecutado comparable; no mostrar cero como equivalente |

La validación de unicidad del destino entre Aportaciones a saldo se resuelve en E2.2 para impedir doble ejecución futura de una transferencia. No se aplaza a E2.3 ni se inventa reparto. El cálculo efectivo y Pendiente/Completo/Excedido, incluida ausencia de estado sin Importe del mes, permanecen en E2.3.

## Modelo conceptual y contratos

Sin SQL, tablas, migraciones ni selección de tipos físicos.

| Dato | Contrato |
| --- | --- |
| ID Presupuesto | PRExxx estable, único, inmutable/no reutilizable; generación de app conforme patrón existente, nunca texto libre de relación |
| Nombre | Obligatorio y único globalmente, incluidos inactivos; comparar sin distinguir mayúsculas, conservando tildes, espacios y Unicode sin normalizaciones adicionales. * y ? literales. Criterio de Subcategorías expresamente reutilizado por autorización; unicidad atómica en alta/edición/concurrencia. ID estable como relación técnica |
| Fuente | Obligatoria y explícita; sin fuente predeterminada propuesta |
| Saldo destino | ID interno activo distinto de S000 para nuevas relaciones; obligatorio Gasto real/Aportación a saldo, vacío No aplica; destino Aportación a saldo no compartido entre dos Presupuestos de esa fuente |
| Estado | Activar/desactivar sin borrar historia ni cascadas; proteger Partidas activas vinculadas. Alta Activo propuesta para aprobación documental final |
| Revisión/metadatos | Reutilizar control de concurrencia/auditoría del núcleo; no dato económico nuevo |
| Partida → Presupuesto |0..1 ID opcional; ausencia conserva «Sin Presupuesto», no PRE ficticio |
| Datos derivados | Nombre del destino, etiqueta de fuente, Partidas vinculadas; no duplicar maestros ni persistir posición como reserva |

Editar enlace Presupuesto no modifica padre, Categoría, Deuda ni hechos originales. Cambios económicos o de relaciones utilizadas requieren impacto completo verificable, motivo y confirmación; si falta el consumidor necesario se bloquean. Renombrar preserva ID y vínculos; editar un nombre no autoriza cambiar fuente/destino incidentalmente. No ofrecer selector de presupuesto operativo antes de implementar su maestro.

## Ciclo de vida y cambios con historia — revisión vigente

Crear con ID nuevo y relaciones verificadas; confirmar desactivar/reactivar y listar dependencias. No elegir destinos/presupuestos inactivos para nuevas relaciones; conservar sus etiquetas en lectura histórica. Editar nombre conserva destino existente inactivo sin sustitución automática. Bloquear desactivación con Partidas activas vinculadas; sin cascadas ni borrados. La conservación del destino histórico no autoriza seleccionarlo de nuevo ni inventar revalidaciones de motor. La revisión financiera confirma el ciclo activar/desactivar; detalles de interacción de reactivación quedan sometidos a aprobación del documento completo.

Revisión de impacto antes/después para cambios económicos o de relaciones utilizadas, incluyendo primera asignación, retirada y cambios de fuente/destino con historia. Mostrar todos los hechos afectados, incluso si el detalle se pagina. **Solo confirmar si el impacto histórico completo puede verificarse con los consumidores existentes**. Enumerar hechos o conocer sus IDs no equivale a verificar su impacto. Si se necesita E2.3 u otro motor todavía ausente, mostrar motivo/cobertura pendiente y bloquear confirmación hasta disponer de él; ni aceptación del usuario ni preview parcial eluden ese bloqueo. Motivo y confirmación siguen siendo obligatorios cuando el cambio sí es verificable; revisión o contexto nuevo invalida preview. Confirmación atómica o sin cambios, sin reescribir hechos. No fechas efectivas ni versionado universal nuevos. Nueva Partida para cambios solo futuros conserva el patrón aprobado de Clasificación y no incorpora retroactivamente historia.

## Pantallas e interfaces — wireframes PROPUESTOS Q4

Mismo shell/paleta/tema claro, texto oscuro sobre verde y componentes existentes. Escritorio tabla y móvil tarjetas equivalentes; tamaños de referencia1440/390, sin afirmar comprobación visual ejecutada.

```text
Presupuestos                                      [Nuevo]
Buscar [________] Fuente [Todas] Destino [Todos] Estado [Activos]
ID      Nombre           Fuente             Destino       Estado
PRE001  Provisión demo   Aportación a saldo  S001 · Demo   Activo
Nota: destino único entre Aportaciones a saldo; compartir con Gasto real no crea reserva exclusiva.

Móvil: PRE001 · Provisión demo
       Fuente: Aportación a saldo
       Destino: S001 · Demo | Activo              [Ver]
```

```text
Nuevo / Editar Presupuesto
Identidad: ID [asignado al guardar / solo lectura] Nombre [_____]
Configuración: Fuente [Elegir] Saldo destino [Elegir]
Fuente obligatoria. Destino requerido para Gasto real/Aportación a saldo.
No aplica: Destino [vacío, no seleccionable]; sin importes del plan mensual.
Estado: Activo [alta propuesta]; activar/desactivar con dependencias protegidas.
[Cancelar] [Guardar / Revisar cambio]

Ficha PRE001: fuente, destino, estado y Partidas vinculadas por ID.
Ejecución mensual: pendiente de E2.3; sin cifra ficticia.
Clasificación > Partida: Presupuesto [Sin Presupuesto / elegir ID]
                        Deuda [enlace existente independiente]
```

```text
Revisar cambio económico — verificar impacto completo
Antes [configuración/vínculo] -> Después [configuración/vínculo]
Hechos afectados [detalle completo/paginado] | cobertura explícita
Motivo [________________]
Si falta consumidor: [Confirmar no disponible] + motivo y motor pendiente.
[Volver al borrador] [Confirmar solo si impacto completo verificable]
```

No pantalla de transferencia bancaria ni botón de ejecutar plan. Ficha enlaza Saldo/Partidas sin exponer motores pendientes como operativos.

## Estados vacíos, carga y errores

Catálogo sin registros ofrece alta; búsqueda sin coincidencias ofrece limpiar filtros, distinto de error/carga. Fuente omitida, destino requerido ausente y destino informado con No aplica se señalan por campo. Destino desconocido/no elegible, nombre duplicado o destino Aportación ya utilizado se rechazan sin reemplazos ni ajustes silenciosos. Cambiar a No aplica requiere destino vacío explícito y revisión histórica cuando corresponda; el borrador permite volver sin perder el destino anterior. Falta de motor para verificar impacto muestra bloqueo, no éxito con advertencia. Reintentar carga sin perder filtros/borrador. Sesión caducada conserva borrador en memoria conforme patrón seguro; no localStorage de datos/factores. Conflicto conserva borrador y exige releer/revisar, sin sobrescritura silenciosa. No aplica, Sin Presupuesto y cálculo no implementado son estados distintos de cero.

## API, seguridad y dependencias externas — contrato propuesto

Reutilizar servicio validado, sesión MFA, Origin/CSRF, validación estructural y errores seguros. Operaciones de lectura de catálogo/ficha/opciones y alta/edición/Estado, con revisión, idempotencia y auditoría conforme patrones existentes. La asignación se integra en Partida; no entrada paralela de Presupuesto o fuente en Movimientos. Preview/confirmación con huella revalidada y cobertura histórica completa cuando corresponda; falta de motor impide confirmar. Rutas y nombres JSON concretos se concretarán siguiendo convenciones existentes, sin crear una API alternativa ni escribir implementación en esta fase.

Sin sesión401; mutación sin Origin/CSRF403; entidad inexistente404; revisión/intento/contexto incompatible409; entrada inválida422; errores técnicos según contrato actual, sin SQL/stack/datos sensibles. No interpretar error SQLite como conflicto de negocio. No nuevas librerías, servicios financieros, cotizaciones ni infraestructura.

Futura continuidad: preservar todos los maestros/hechos, revisiones/auditorías/intentos y acceso/MFA/clave del núcleo integrado; sin reset/semilla/importación real. Copia/restore privado coherente y actualización atómica deberán especificarse/verificarse en desarrollo autorizado sobre su base real. Nada de ello está implementado o probado en esta propuesta; no autoriza cambiar apertura SQLite ni cerrar AC23.

## Riesgos, contradicciones y decisiones pendientes

- **Discrepancia documental P3**: roadmap/extracto sanitizado generalizaban destino obligatorio a todo Presupuesto. La revisión posterior de Álex, contrastada con tblPresupuestos[Control] y Criterios!C64, prevalece para E2.2: No aplica exige vacío. Se registra aquí sin reescribir esos documentos ni afirmar inspección directa del libro por el agente.
- **Discrepancia física de fuentes**: tblPresupuestos[Control] todavía admite Devolución anticipo, en contradicción con la lista vigente Criterios!C64. Se mantienen solo las tres fuentes vigentes; no cuarta fuente, conversión automática ni modificación del Excel.
- **Gasto real frente a destino**: destino es contexto/cobertura, no criterio de imputación. Cambiarlo no mueve banco ni reclasifica hechos.
- **Maestro frente a plan**: Base/Esencial/Del mes fuera del maestro; «consulta de derivaciones» queda limitada a configuración y relaciones, sin anticipar motor E2.3.
- **Historia**: cambio utilizado sin impacto completo verificable queda bloqueado hasta existir consumidor; no cálculos inventados E2.3 ni reescritura de hechos.
- **Nombres, reserva resuelta**: Álex confirma unicidad global incluidos inactivos, sin distinguir mayúsculas; conservar tildes/espacios/Unicode sin normalización adicional y usar * y ? literales. Se reutiliza el criterio de Subcategorías ya aprobado e implementado, no una collation supuesta. COUNTIF físico sin normalización explícita no demuestra equivalencia exacta con el contrato de aplicación, especialmente en comodines.
- **Destino compartido**: prohibición específica entre dos Aportaciones a saldo validada en E2.2, no diferida al motor. Compartir con Gasto real no cambia imputación por Partida ni crea reserva exclusiva.
- **Integración futura**: cierres transversales DT5 y casos E3 requieren revalidación al existir; no declarar guardas ni cálculos de consumidores ausentes.
- **AC23**: especificación independiente no garantiza que futura implementación pase regresiones. Mantener incidente separado y bloqueo E2.1; no reparar SQLite como tarea incidental de E2.2.

## Exclusiones

Planes E2.3/E2.4, ejecutado numérico y estados mensuales, Nómina/flujo, reservas exclusivas o reparto nuevo, fuentes obsoletas, ejecución automática de transferencias, motores E3, cierres/fotos, importación/Excel real, producción, corrección SQLite, reanudación Dev32. No datos reales, tests ejecutados ni aceptación funcional por este documento.

## Criterios de aceptación propuestos — NO ejecutados

Criterios actualizados conforme revisión financiera; aprobación documental global pendiente. Criterios F son contratos futuros y NO requisitos satisfechos por E2.2.

| ID | Acción / precondición | Resultado observable esperado |
| --- | --- | --- |
| AC-01 | Crear Gasto real/Aportación con destino válido y No aplica sin destino | Guarda fuente exacta y destino según fuente; identidad única y persistente |
| AC-02 | Enviar Devolución anticipo/fuente desconocida o ausente | Rechaza sin alta parcial ni sustitución de fuente |
| AC-03 | Omitir destino en Gasto real/Aportación; informar destino en No aplica | Rechaza ambas incompatibilidades sin autocorregir; No aplica vacío sí válido |
| AC-04 | Nuevo destino inexistente/inactivo/S000; interno activo con Liquidez/Finalidad/Control variados | Rechaza los primeros; no añade restricciones por esos atributos al interno activo |
| AC-05 | Vincular varias Partidas a un Presupuesto y una Partida a otro |0..1 por Partida; consulta coherente por IDs; no doble vínculo |
| AC-06 | Crear/consultar Gasto con Partida sin Presupuesto | Conserva validez e importe; muestra Sin Presupuesto |
| AC-07 | Asignar Presupuesto a Partida con Deuda | Deuda/jerarquía y reglas de cuota/amortización intactas |
| AC-08 | Dos Gasto real comparten destino; uno Gasto real y uno Aportación comparten destino | Válidos; imputación Gasto real por Partida, sin reserva exclusiva ni patrimonio duplicado |
| AC-09 | Configurar Gasto real con destino distinto del banco de un Gasto | No reclasifica por banco; configuración identifica Partidas vinculadas, sin alterar hechos |
| AC-10 | Renombrar y consultar relaciones; intentar cambiar/reutilizar ID | Nombre cambia, vínculos/ID conservados; cambio/reutilización ID rechazados |
| AC-11 | Desactivar/reactivar y consultar historia; intentar nueva asignación inactiva | Confirma según política; preserva historia, rechaza nueva asignación y no aplica cascadas |
| AC-12 | Desactivar con Partida activa vinculada; alta/renombrado con nombre vacío o duplicado | Bloquea desactivación y rechaza vacío/duplicado global incluido inactivo, sin distinguir mayúsculas; tildes/espacios/Unicode conservados y * / ? literales, sin cascadas ni advertencia que permita duplicar |
| AC-13 | Primera asignación, retirada o cambio de vínculo utilizado | Revisión de impacto completo verificable, motivo y confirmación; si falta consumidor, bloqueo hasta disponer de él |
| AC-14 | Cambiar fuente/destino con historia; falta motor o cambia contexto tras preview | Falta motor bloquea, no estimación E2.3; revisión obsoleta409 sin cambio parcial ni mutación de hechos |
| AC-15 | Cambiar solo nombre de Presupuesto con destino ya inactivo | Conserva relación histórica y no sustituye destino ni otro atributo silenciosamente |
| AC-16 | Repetir intento de alta y enviar payload diferente con misma clave | Idempotencia conforme contrato existente: un registro o conflicto, sin duplicados |
| AC-17 | Dos ediciones concurrentes y fallo durante escritura/auditoría | Revisión/atomicidad heredadas; colisiones de nombre también en alta/renombrado concurrentes se rechazan atómicamente; no pérdida silenciosa ni estado parcial |
| AC-18 | Leer sin MFA o mutar sin Origin/CSRF |401/403 según contrato, sin escritura ni filtraciones |
| AC-19 | Cargar vacío/error/404/409/422 y volver al formulario | Estados diferenciados; errores asociados y borrador preservado |
| AC-20 | Abrir maestro/ficha/formulario con cualquiera de las fuentes | Sin Base/Esencial/Del mes ni totales/estados mensuales ficticios; No aplica no es cero |
| AC-21 | Recorrer UI390/1440, teclado, foco y contraste | Misma información/acciones, sin overflow; patrón visual vigente, sujeto a Q4 |
| AC-22 | Futura actualización/restauración aislada desde base integrada | IDs/hechos/Deuda/MFA conservados; rollback/versión desconocida/restore conforme contrato sin reset |
| AC-23 | Alta/edición de dos Aportaciones con mismo destino, también concurrentes | Rechaza duplicidad sin estado parcial; cambiar Gasto real a Aportación revalida la restricción |
| AC-24 | Cambiar a No aplica conservando destino; probar fuente Devolución anticipo | Rechaza incompatibilidades; no cuarto valor ni limpieza implícita que eluda revisión histórica |
| F-01 | Incorporar E2.3 y hechos de cada fuente | Cálculos R3 y ausencia de comparabilidad implementados/verificados allí; pendiente, no PASS actual |
| F-02 | Incorporar cierres/casos consumidores E3/E4 | Integración/guardas reales revalidadas; no cierres ni motores simulados aquí |

**E2.1/spec07-AC23 sigue BLOQUEADO** y es un criterio diferente. Todos los criterios08 son propuestas no ejecutadas; ningún PASS declarado. F-01/F-02 son contratos futuros, separados de los24 criterios actuales propuestos.

## Gate siguiente

Preparar PR exclusivamente documental, autorizada expresamente tras la revisión financiera favorable y resolución del contrato de nombres. No quedan preguntas financieras abiertas en esta especificación; someter contenido completo y wireframes a aprobación documental antes de integrar. No iniciar dev08/E2.3 ni modificar Excel. Merge y desarrollo no autorizados. No se modifican estados de aceptación anteriores.
