# 09 — E2.3 Plan del ciclo y ejecutado mensual: Specification

Status: APPROVED — revisión documental 4, incluidos sus wireframes, 2026-10-23.
Approval source/date: mensaje real del usuario «Apruebo», respuesta inmediata a
la entrega de revisión4 con una única aprobación pendiente: documento completo y wireframes.
Contexto y decisiones: [brainstorming09](09-plan-ciclo-brainstorming.md), Q1–Q3
confirmadas por el mensaje del usuario «Spec09 — Decisiones funcionales de Álex».
Roadmap: E2.3. Dependencias integradas: E1, E2.1 y E2.2.
Preparación documental autorizada; desarrollo y merge no autorizados.

## Funcionalidad y reglas confirmadas

El usuario selecciona un Ciclo existente del maestro único y consulta o prepara su
plan por ID de Presupuesto. Cada línea contiene Base (referencia estructural habitual),
Esencial (coste mínimo necesario) y Del mes (decisión concreta del ciclo).
Son importes manuales independientes, opcionales y no negativos. Vacío significa
no informado; cero es una decisión explícita. No completar ausencias, imponer orden
entre importes ni derivar uno de otro. No son propiedades del maestro Presupuestos.

Un ciclo nuevo tiene el plan vacío: no se crean líneas, importes ni copias por abrirlo.
Seleccionar un ciclo sin plan muestra «Sin plan», nunca una reconstrucción histórica.
Las nuevas líneas se eligen entre Presupuestos activos; líneas guardadas de inactivos
permanecen visibles. Solo se pueden editar si el ciclo no tiene cierre financiero,
aplicando revisión de impacto y motivo cuando corresponda, sin reactivarlos ni crear
relaciones nuevas. Nunca permitir nuevas líneas para Presupuestos inactivos.
«Sin plan» significa que no existen líneas de planificación; «Sin planificar» indica
ejecución real positiva y comparable de un Presupuesto sin línea planificada. Pueden coexistir:
un ciclo sin ninguna línea puede tener ejecución real sin planificar.
Se muestran aparte los Presupuestos con Ejecutado verificable > 0 de fuente Gasto
real o Aportación a saldo y sin línea planificada,
como «Sin planificar», sin persistir automáticamente una línea ni inventar un objetivo.
No aplica y Ejecutado = 0 no generan este aviso. Ejecutado no verificable conserva
su motivo específico; nunca se interpreta como cero ni como ejecución sin planificar.

### Motor único de ejecución R3

Usar hechos vigentes (no anulados), fechas reales y periodo/corte del servicio central
de Ciclos E2.1, con sus límites inclusivos; sin mes natural sustituto ni fallback a hoy.
Sin periodo/corte verificable o en un ciclo futuro todavía no iniciado, mostrar
Ejecutado vacío con el motivo «Periodo/corte no verificable» o «Ciclo no iniciado»,
respectivamente, sin fabricar ejecución cero, pendiente ni estado. La comprobación
de ciclo futuro no convierte el reloj en referencia financiera ni sustituye el corte
central. En un ciclo abierto sin referencia temporal tampoco hay ejecución cero
verificada. Un periodo verificable sin hechos elegibles
sí produce Ejecutado = 0 para las fuentes comparables.

| Fuente aprobada | Ejecutado y comparabilidad |
| --- | --- |
| Gasto real | Suma del importe íntegro de Gastos por Partidas vinculadas al Presupuesto en el periodo, independientemente del Saldo pagador. Incluye cuota ordinaria, excluye Amortización deuda |
| Aportación a saldo | Suma de Transferencias ordinarias reales hacia el destino configurado, sin Referencia y sin origen Exterior. Gastar posteriormente esa provisión no ejecuta otra vez este Presupuesto |
| No aplica | Ejecutado vacío, nunca cero, por no ser comparable; sin Pendiente ni Estado. Conservar importes de plan sin convertirlos en ejecución |

No añadir fuente Devolución anticipo. Recuperaciones con Referencia no ejecutan la
Aportación. Un Gasto con Referencia sigue las reglas de Gasto real; no extender a
Gastos la exclusión de Referencias propia de Transferencias. Reutilizar matriz E2.2:
destino requerido para Gasto real/Aportación, vacío para No aplica y destino único
entre Aportaciones. Un destino compartido permitido no constituye reserva exclusiva.
No añadir cálculo de disponibilidad o financiación de terminales.

A transferir = Del mes, también si es cero; su nombre no ordena ni crea una Transferencia.
Con fuente comparable, periodo verificable y Del mes informado:
Pendiente = Del mes − Ejecutado. Estado Pendiente si >0, Completo si =0, Excedido
si <0. Preservar el pendiente negativo, sin truncarlo a cero. Sin Del mes no calcular
Pendiente/Estado, aunque Ejecutado pueda consultarse. Sin cobertura verificable mostrar
motivo en lugar de números o estados fingidos. No sumar fuentes no comparables en un
total de pendiente; la primera entrega presenta resultados por Presupuesto.

La comparación de Estado se hace sobre céntimos exactos, sin tolerancias ni redondeo
visual. «Sin planificar» es un aviso de cobertura del plan, no un cuarto Estado
financiero ni un objetivo implícito de cero.

| Condición | A transferir | Ejecutado | Pendiente | Estado / aviso |
| --- | --- | --- | --- | --- |
| Línea con Del mes vacío, fuente comparable y periodo verificable | Vacío | Valor real, incluido cero | Vacío | Sin importe del mes; no Sin planificar porque existe línea |
| Línea con Del mes = 100, Ejecutado = 60 | 100 | 60 | 40 | Pendiente |
| Línea con Del mes = 100, Ejecutado = 100 | 100 | 100 | 0 | Completo |
| Línea con Del mes = 100, Ejecutado = 120 | 100 | 120 | −20 | Excedido |
| Línea con Del mes = 0, Ejecutado = 0 | 0 | 0 | 0 | Completo |
| Línea con Del mes = 0, Ejecutado = 25 | 0 | 25 | −25 | Excedido |
| Línea con fuente No aplica | Del mes, si informado | Vacío: No comparable | Vacío | Vacío |
| Periodo/corte no verificable o ciclo futuro no iniciado | Del mes, si existe | Vacío con motivo específico | Vacío | Sin Estado ni aviso Sin planificar |
| Sin línea, fuente comparable y Ejecutado verificable > 0 | Vacío | Valor real positivo | Vacío | Aviso Sin planificar, sin Estado financiero |
| Sin línea, fuente comparable y Ejecutado verificable = 0 | Vacío | 0 | Vacío | Sin aviso Sin planificar |
| Sin línea y fuente No aplica | Vacío | Vacío: No comparable | Vacío | Sin aviso Sin planificar |

Las cifras de la matriz son ejemplos sintéticos en euros, no datos personales.
Los motivos de no comparabilidad/no verificación prevalecen sobre una etiqueta
genérica de ausencia de Del mes; ningún caso convierte null en cero.

### Copia opcional

Seleccionar ciclo origen distinto del destino y campos Base/Esencial/Del mes.
Base y Esencial preseleccionados; Del mes desmarcado. Preview por ID de Presupuesto
indica valores a incorporar y omisiones (ya informado, origen vacío, inactivo).
Copiar solo valores informados hacia campos vacíos; cero del destino bloquea copia,
cero del origen es copiable. Sin campos seleccionados ni cambios efectivos, informar
«Sin cambios» sin escritura financiera. No copiar derivados ni modificar origen.
No introducir inactivos en el destino; sus líneas existentes permanecen intactas.
La confirmación se aplica completa o no se aplica; cambios concurrentes requieren
actualizar preview, nunca omitir conflictos silenciosamente.

### Edición, impacto e historia

El fin temporal no impide editar. Para planes de ciclos temporalmente terminados,
preview antes/después y efectos sobre pendiente/estado, motivo obligatorio y
confirmación. Se propone reutilizar el mismo flujo de revisión para toda modificación
de un plan guardado, evitando rutas de escritura con garantías distintas. La nueva
captura sin historia conserva revisión de contexto e idempotencia.

Guardar no modifica Movimientos, Ciclos ni fuente/destino del maestro. Auditoría
append-only de campos modificados y motivo cuando corresponda; no snapshots/versiones
financieras completas por edición. Una revisión técnica de concurrencia no es una foto.
Los planes se consultan con el motor vigente; el historial de cambios del plan no
pretende congelar un ejecutado histórico. Cierres y fotografías quedan en E4.9 y relacionadas.

Instalar el consumidor E2.3 en las revisiones existentes de Presupuestos y enlaces
Partida→Presupuesto: preview histórico completo por ciclos afectados y contexto de
hechos/configuración/planes. Cambio de fuente, destino, asignación o retirada puede
alterar Ejecutado/Pendiente/Estado sin mutar hechos. Solo desbloquear las operaciones
cuyo impacto sea íntegramente verificable; paginar detalle no trunca el cálculo.
Mantener bloqueo si falta otro consumidor necesario. F-01 de E2.2 se verifica aquí;
F-02 permanece futuro para E3/E4. Rectificar hechos o límites de Ciclos invalida
previews afectados y recalcula resultados; no cambia los importes manuales del plan.

## Modelo de datos y contratos técnicos propuestos

Diseño lógico: cabecera por ID de Ciclo con revisión técnica y líneas únicas por
(Ciclo, Presupuesto), FK a maestros existentes. Tres importes nullable, EUR en céntimos
INTEGER con rango individual int64 no negativo y transporte decimal exacto según
convención vigente. Agregados y diferencias en bigint, sin float ni desbordamiento.
No persistir Ejecutado/Pendiente/Estado como fuentes alternativas. Un campo vacío
se envía como null; campo omitido en una modificación conserva su valor, sin reset.

Auditoría de delta, intentos idempotentes y revisión/contexto siguen patrones existentes.
Confirmación revalida bajo transacción los IDs, estado de catálogos, valores previos,
origen de copia y hechos/corte/configuración necesarios. Reintento de igual clave y
payload devuelve el mismo resultado; payload distinto con igual clave se rechaza.
Dos escrituras sobre revisión antigua no se pisan. Copia multilínea es atómica.
La huella de contexto no sustituye autenticación ni es una firma de cierre.

La implementación futura propondrá la extensión versionada desde el esquema integrado
vigente, con fixture genuina anterior, rollback de DDL y continuidad demo/production
ficticias, acceso, auditoría y backup/restore. No fijar una versión desde un checkpoint
obsoleto. Sin cambios al motor de apertura SQLite, claves ni política de recuperación.

## Pantallas e interfaces — wireframes propuestos

Tema claro, componentes y tokens existentes. Navegación «Plan del ciclo», selector
del maestro Ciclos y enlace al detalle del Presupuesto. Fuente/destino se consultan,
no se editan desde esta pantalla. Detalle de Ejecutado enlaza hechos reales y explica
exclusiones sin crear nuevos hechos. Importes no disponibles muestran texto y motivo.

```text
Escritorio — Plan del ciclo
Ciclo [seleccionar v]  Periodo/corte: servicio Ciclos
[Añadir Presupuesto] [Copiar desde otro ciclo]
Presupuesto / Fuente | Base | Esencial | Del mes | Ejecutado | Pendiente | Estado
Nombre · PRE…        | —    | 0,00     | —       | 25,00     | —         | Sin importe del mes
[Detalle de línea: A transferir —; Estado financiero —; existe línea, no Sin planificar]
[Ver ejecución] [Editar plan]
Sin planificar: Gasto real/Aportación · Ejecutado > 0 · Sin línea del plan
```

```text
Móvil — tarjetas, sin columnas recortadas
Plan del ciclo [Ciclo v]
Nombre · PRE… · Fuente
Base —        Esencial 0,00 €
Del mes —     Ejecutado 25,00 € [Detalle]
A transferir —   Pendiente —   Estado —
Sin importe del mes · Línea existente
[Editar]       [Copiar plan]
```

```text
Edición / copia
Base [       ]  Esencial [       ]  Del mes [       ]
Vacío = no informado; 0 = importe decidido
Copia: Origen [Ciclo v]  [x] Base [x] Esencial [ ] Del mes
[Revisar cambios]
Revisión: Presupuesto / Campo / Antes / Después / Efecto
Omitidos: ya informado / origen vacío / inactivo
Motivo [obligatorio para cambios de plan guardado]
[Volver al borrador] [Confirmar cambios]
```

Nuevo plan sin líneas: explicar «Sin plan» y ofrecer añadir/copia.
«Sin planificar» se reserva a ejecución verificable positiva y comparable sin línea;
No aplica, Ejecutado cero o no verificable no generan el aviso.
No aplica muestra «— · No comparable» en Ejecutado; ciclo no iniciado o corte no
verificable muestra «—» y el motivo correspondiente. No usar «Sin importe del mes»
para ocultar esos motivos. Las líneas históricas inactivas llevan etiqueta «Inactivo»;
su acción Editar respeta la ausencia de cierre y el flujo de revisión/motivo aplicable.
Carga con estado accesible; error con reintento, distinto de vacío. Conservar filtros y borrador en
memoria al fallar o caducar sesión conforme patrón existente, sin localStorage de
datos financieros. Conflicto conserva borrador y exige releer/revisar. Errores por campo,
foco al aviso, teclado, etiquetas de importes, no depender solo del color.
Inspección futura a 390 y 1440 px, incluida revisión larga y Presupuesto inactivo.

```text
Variantes de estado — mismo diseño en tabla o tarjeta
Sin plan: todavía no hay líneas [Añadir] [Copiar]
Sin planificar: PRE… · Gasto real · Ejecutado 25,00 € · Sin línea del plan
No aplica: Ejecutado — · No comparable | Pendiente — | Estado —
Ciclo no iniciado: Ejecutado — · Ciclo no iniciado
Corte no verificable: Ejecutado — · Periodo/corte no verificable
Histórico: PRE… [Inactivo] [Editar si no existe cierre financiero]
```

## Casos de verificación del contrato — diseño de pruebas

Estos casos detallan AC-12/13/15/35/36 para su implementación futura. Verificación
documental de consistencia, no pruebas de software ejecutadas. Valores sintéticos en EUR;
repetir los casos comparables para Gasto real y Aportación a saldo con hechos R3 válidos.

| Caso | Línea / fuente / Del mes / Ejecutado verificable | A transferir | Pendiente | Estado financiero | Presentación |
| --- | --- | --- | --- | --- | --- |
| V1 | Existe / comparable / vacío / 25 | Vacío | Vacío | Vacío | Ejecutado 25; Sin importe del mes; nunca Sin planificar |
| V2 | Existe / comparable / vacío / 0 | Vacío | Vacío | Vacío | Ejecutado 0 verificado; Sin importe del mes |
| V3 | Existe / comparable / 0 / 0 | 0 | 0 | Completo | Cero explícito conservado |
| V4 | Existe / comparable / 0 / 25 | 0 | −25 | Excedido | Ejecución positiva, sin aviso Sin planificar porque existe línea |
| V5 | Existe / No aplica / vacío / no comparable | Vacío | Vacío | Vacío | Ejecutado vacío, No comparable; sin aviso Sin planificar |
| V6 | Existe / No aplica / 0 / no comparable | 0 | Vacío | Vacío | Ejecutado vacío, nunca cero ni Completo |
| V7 | Existe / No aplica / 100 / no comparable | 100 | Vacío | Vacío | Del mes conservado, sin ejecución comparable |
| V8 | No existe / comparable / ausente / 25 | Vacío | Vacío | Vacío | Sin planificar; Sin plan además si el ciclo no tiene ninguna línea |
| V9 | No existe / comparable / ausente / 0 | Vacío | Vacío | Vacío | Sin aviso Sin planificar |
| V10 | Existe / comparable / 0 / no verificable | 0 | Vacío | Vacío | Ejecutado vacío con motivo específico; nunca Completo |

V1 debe verificarse también en lectura API, recarga, detalle y UI móvil/escritorio:
la ausencia de Del mes no borra la ejecución real ni elimina la línea. API representa
ausencias como null y Estado como null; «Sin importe del mes» es texto explicativo,
no un valor adicional del enum Pendiente/Completo/Excedido. No inferir ausencia de
línea a partir de sus importes: la existencia se determina por identidad persistente.
Ninguna presentación convierte null en 0 al formatear, ordenar o calcular derivados.

## API propuesta y dependencias

Rutas bajo `/api/planes-ciclo`, contrato sujeto a aprobación de esta revisión:

| Operación | Contrato |
| --- | --- |
| GET `/:cicloId` | Plan, revisiones/contexto, catálogo elegible, ejecución por fuente y cobertura del corte, sin crear plan en lectura |
| GET `/:cicloId/ejecucion/:presupuestoId` | Detalle paginado de hechos elegibles, periodo, fuente y total exacto calculado sobre todos los hechos |
| POST `/:cicloId/impacto` | Borrador explícito de cambios o copia; preview completo y omisiones, sin escritura del plan |
| POST `/:cicloId/confirmar` | Payload validado, revisión/contexto e intento idempotente; revalidación y commit atómico del plan y auditoría |

IDs y campos admitidos validados en servidor; rechazar importes negativos,
fracciones menores a céntimo, exceso de rango, IDs desconocidos, duplicados y campos
derivados enviados como editables. Respetar límites JSON/paginación vigentes;
copia se solicita por ciclo/campos, no enviando todo el catálogo en un payload ilimitado.
Lecturas consistentes y respuestas no-store. MFA obligatorio en todas las rutas,
Origin/CSRF en escrituras, SQL parametrizado y errores públicos sin SQL ni datos privados.
Validación 400, acceso 401/403, entidad inexistente 404 y conflicto de revisión/contexto
409 conforme convenciones existentes. Sin dependencias externas ni cambios de stack.

## Exclusiones y límites

E2.4 plan anual, E2.5 Nómina, E2.6 flujo global, E3 casos completos y E4 cierres/fotos.
No automatizar Transferencias, reservar Saldos, calcular financiación terminal, copiar
Movimientos ni reconstruir planes. Backlog de registro coordinado se revisa después de
E3.1. No habilitar Exterior ni tipos de Referencia aún no implementados para probar R3:
esas exclusiones se verifican en el motor con fixtures aisladas y se integran en E3.6.
Sin Excel real, migración operativa, despliegue ni reanudación Dev32 o investigación B3.

## Criterios de aceptación propuestos — no ejecutados

| ID | Acción / precondiciones | Resultado observable esperado |
| --- | --- | --- |
| AC-01 | Consultar ciclo nuevo o histórico sin plan | Sin plan, sin líneas/importes generados ni cambios por GET |
| AC-02 | Guardar vacío y cero en cada campo y recargar | null y cero preservados y diferenciados |
| AC-03 | Esencial o Del mes mayores que Base | Guardado admitido, sin ajuste ni restricción relativa |
| AC-04 | Enviar negativo, fracción menor a céntimo o exceso de rango | Rechazo por campo, plan intacto |
| AC-05 | Editar solo Base | Esencial/Del mes conservados; no valores implícitos; null explícito vacía solo el campo solicitado |
| AC-06 | Informar Del mes, incluido cero | A transferir coincide exactamente; no crea Movimiento |
| AC-07 | Gastos de varias Partidas vinculadas, desde distintos Saldos | Ejecutado Gasto real suma importes íntegros elegibles, sin filtrar por destino del Presupuesto |
| AC-08 | Cuota ordinaria y amortización extraordinaria | Cuota íntegra incluida como Gasto; amortización excluida |
| AC-09 | Transferencia ordinaria al destino y posterior Gasto de provisión | Solo Transferencia ejecuta Aportación, sin segunda ejecución por Gasto |
| AC-10 | Transferencias con Referencia, devolución o entrada Exterior | No ejecutan Aportación; no habilitar operaciones inválidas en API para probarlo |
| AC-11 | Gasto válido con Referencia | Cuenta en Gasto real por Partida; no aplicar exclusión propia de Transferencias |
| AC-12 | No aplica con Del mes vacío, cero y positivo (V5–V7) | A transferir conserva Del mes, incluido null/0; Ejecutado vacío con motivo No comparable, nunca cero; Pendiente/Estado null, sin aviso Sin planificar |
| AC-13 | Línea existente con Del mes vacío y Ejecutado verificable positivo o cero, en ambas fuentes comparables (V1/V2) | Ejecutado se conserva en API/recarga/UI; A transferir/Pendiente/Estado null; Sin importe del mes como explicación, nunca Sin planificar |
| AC-14 | Del mes 100; Ejecutado 60, 100 o 120 | Pendiente 40/0/−20 y estados Pendiente/Completo/Excedido |
| AC-15 | Del mes cero; Ejecutado verificable cero o positivo en ambas fuentes comparables (V3/V4); contrastar no verificable (V10) | A transferir 0; Pendiente 0/negativo y Estado Completo/Excedido solo con ejecución verificable. Sin verificación, Ejecutado/Pendiente/Estado null y motivo; nunca Sin planificar si existe línea |
| AC-16 | Hechos en límites y fuera del periodo/corte | Solo elegibles según motor Ciclos; sin sustitución por mes natural/hoy |
| AC-17 | Ciclo abierto sin referencia, periodo/corte no verificable o ciclo futuro no iniciado; comparar con periodo verificable sin hechos elegibles | Casos no verificables/no iniciados muestran Ejecutado vacío y motivo, sin Pendiente/Estado ficticios; solo el periodo verificable iniciado sin hechos devuelve cero en fuente comparable |
| AC-18 | Rectificar/anular hecho o cambiar límites del Ciclo | Recalcular ejecución; importes manuales intactos; preview anterior inválido |
| AC-19 | Abrir copia desde ciclo seleccionado | Base/Esencial marcados; Del mes desmarcado; origen por ID estable |
| AC-20 | Copiar sobre campos vacíos, cero e informados | Solo vacíos reciben valores del origen; cero nunca se sobrescribe; preview enumera omisiones |
| AC-21 | Origen vacío, inactivo o campos no seleccionados | Sin relleno; no introduce inactivos; no copia derivados ni modifica origen |
| AC-22 | Confirmar copia válida de varias líneas o inyectar fallo | Commit completo o rollback completo, sin copia parcial |
| AC-23 | Editar ciclo temporalmente terminado sin cierre | Permitido con preview, motivo obligatorio y confirmación, sin mutar Movimientos |
| AC-24 | Presupuesto histórico inactivo | Línea visible; editable solo sin cierre financiero, con impacto/motivo cuando corresponda; sin nueva relación ni reactivación; no seleccionable para nueva línea |
| AC-25 | Dos confirmaciones concurrentes con misma revisión | Una aplica; otra detecta conflicto y conserva borrador, sin sobrescritura |
| AC-26 | Repetir intento o reutilizar clave con payload distinto | Igual intento devuelve mismo resultado; distinto se rechaza, sin auditoría duplicada |
| AC-27 | Cambiar origen/catálogo/hechos entre preview y confirmación | Contexto obsoleto rechazado, requiere nueva revisión |
| AC-28 | Cambiar fuente/destino o vínculo utilizado en maestro | Impacto completo por ciclos y resultados antes/después; bloqueo si cobertura insuficiente, hechos originales intactos |
| AC-29 | Consultar ejecución con más de una página y agregados grandes | Total exacto sobre todo el conjunto, no solo página; sin float/desbordamiento |
| AC-30 | Enviar duplicados Ciclo/Presupuesto o campos derivados | Rechazo atómico; identidad por ID, nunca por nombre |
| AC-31 | Guardar varios cambios y consultar auditoría | Deltas, actor, instante y motivo aplicable; sin snapshots completos por edición |
| AC-32 | Acceso sin MFA, Origin/CSRF incorrectos y errores | Acceso denegado; sin escrituras, SQL, secretos ni payload financiero en logs |
| AC-33 | Actualizar fixture genuina anterior y probar rollback/restore | Planes y maestros consistentes, clave/acceso preservados al migrar; restore revoca accesos/intentos conforme política vigente |
| AC-34 | Recorrido UI 390/1440 y teclado | Listado, edición, copia y detalle legibles; capturas ficticias inspeccionadas; estados carga/vacío/error/conflicto/borrador verificados |
| AC-35 | Sin línea, fuente Gasto real o Aportación a saldo y Ejecutado verificable > 0, incluso en ciclo sin líneas | Visible como Sin planificar; ciclo sin líneas además indica Sin plan. Sin objetivos/pendiente/estado ficticios ni líneas automáticas |
| AC-36 | Sin línea, fuente No aplica o Ejecutado = 0 o no verificable | Sin aviso Sin planificar; No aplica conserva No comparable, cero conserva su valor verificable y no verificable conserva su motivo, sin conversión a cero |

Futuros separados: integración de Anticipos/Compartidos/Comida e inversión en E3/E4;
protección por cierre, fotografías finales e inmutabilidad en E4.9 y relacionadas.
No afirmar implementados ni probados mediante dobles. Todos los AC anteriores son
contratos propuestos; ninguna prueba financiera ni de UI se ejecuta en esta fase.

## Gate documental

Documento completo y wireframes de revisión4 aprobados por «Apruebo» del usuario
el 2026-10-23. Q1–Q3 y precisiones previas confirmadas, sin nuevas respuestas pendientes.
Las menciones de propuestas en el cuerpo describen el diseño sometido a esta aprobación;
no significan implementación ni pruebas ejecutadas. Desarrollo requiere instrucción
separada. Commit documental y publicación/PR conforme política Git; merge únicamente
tras aprobación expresa de su PR concreta.
