# 06 — E1.6 Cuota y amortización de Deuda: Specification
Status: DRAFT — NO APROBADA; propuesta para revisión, Q1–Q4 pendientes.
Approval source/date: PENDING. Autorizada solo elaboración/publicación Draft, 2026-10-21.
Context and brainstorming: [decisiones y ronda única](06-deuda-brainstorming.md),
[roadmap E1.6/E4.4](roadmap.md), [R1/R2/R5](functional-reference-v5.11.md),
[contratos E1.4](04-movimientos-testplan.md), [cierre E1.5](05-transferencias-referencias-testplan.md).
Base: main 9336fdd; datos exclusivamente ficticios. No libro ni Criterios físicos
inspeccionados por Codex. No dev 06, código funcional, SQL ni migraciones autorizados.

## Functionality
Maestro mínimo único de Deudas y registro de pagos reales en el único registro
Movimientos. Deudas NO son Saldos, ni generan transferencias/ingresos/gastos artificiales.
Una cuota es UN Gasto; su desglose no genera otro hecho, cargo bancario o plan ejecutado.
Amortización extraordinaria es UN Movimiento del tipo vigente Amortización deuda.

### Autoridad y alcance actual/futuro
| Contrato | Estado/procedencia |
| --- | --- |
| Identidad Dxxx estable, enlace Partida→0..1 Deuda | R1/E1.2 confirmado |
| Cuota Gasto íntegro, capital + intereses = importe | R2 confirmado |
| Extraordinaria a Exterior: capital = importe, intereses = 0, no Gasto | R2 confirmado |
| Capital pendiente deriva de apertura y capital real aplicable desde control | R5 confirmado; fórmula/corte exactos pendientes Q1 |
| Regla de desglose ausente/cero/signo y exceso sobre principal | Q2 pendiente; no inferir de importes totales positivos |
| Maestro mínimo, estados y protección de enlaces con uso | Propuesta app Q3, no columnas/validaciones físicas atribuidas |
| Permiso Exterior y fecha máxima de extraordinaria | Q4 pendiente; fecha es nueva decisión app si se aprueba |
| EUR exacto, MFA, auditoría, idempotencia y rectificaciones | Reutilización de contratos ya aprobados |

E1.6 habilitará el consumidor Deuda de E1.2 y la parte deuda/extraordinaria de E1.4
AC-31 y E1.5 AC-32. No declara globalmente completos esos contratos: inversión,
planificación, Comida y cierres reales siguen pendientes. E1.4 AC-30 y E1.5 AC-31
mantienen referencias E3 y TODAS las Transferencias con Exterior fuera de alcance.
La matriz de cuatro tipos no equivale a habilitar cualquier variante de Transferencia.

### Maestro y capital pendiente
Propuesta Q3: alta, consulta/listado, nombre editable, estado, desactivación/reactivación,
ID visible inmutable Dxxx generado en servidor, atómico/no reutilizado y después de D999.
No ID interno extra sin necesidad; preservar los existentes en migración futura autorizada.
Nombre identifica en UI pero no es clave; no inventar unicidad de nombres.
Se pueden asociar distintas Partidas a una misma Deuda, manteniendo 0..1 por Partida
según R1; no inventar un límite 1:1. Una Partida sin Deuda sigue válida para Gasto ordinario.

Entradas propuestas: nombre, Inicio control y capital pendiente apertura; ausencia/cero
separados. No decidir signo, obligatoriedad definitiva ni campos precontrol hasta Q1/Q3.
No crear capital inicial como Movimiento ni como Saldo. TIN/TAE no calculan el desglose
real; no deducir intereses mediante calendario ni generar cuotas programadas.
Capital pendiente: apertura menos capital de hechos vigentes aplicables según Q1,
NO menos gasto íntegro, intereses ni un agregado histórico ya incluido en la apertura.
No publicar fórmula con operador temporal pendiente ni usar `max(pendiente,0)` para
ocultar discrepancias. No sumar apertura al Saldo bancario ni persistir capital restante.

La ausencia de hechos precontrol no autoriza reconstruirlos; si existen hechos reales,
Q1 definirá su contribución al principal sin quitar su efecto bancario o gasto real.
El corte de control de Deuda no cambia el motor Saldos: apertura bancaria + entradas −
salidas de hechos vigentes, SIN filtro general de Fecha apertura. Mostrar alcance temporal
junto al capital, sin confundirlo con importe original del préstamo ni deuda patrimonial total.
No habilitar nuevas altas ligadas a Deuda inactiva según propuesta Q3; la historia sigue
consultable y una reactivación no crea hechos. No impedir anular por estado inactivo.
La conservación de relaciones sin cambio en una rectificación sigue patrón E1.4/E1.5,
sin obligar a sustituir entidades históricas inactivas por otras activas silenciosamente.

### Cuota ordinaria
Gasto con Partida ligada a Deuda existente: mostrar Deuda derivada por ID y desglose.
No selector independiente de Deuda contradictorio con Partida. Capital/intereses son
atributos del MISMO hecho, no detalles con IDs financieros nuevos.
La suma exacta debe igualar importe EUR positivo. Q2 decide cero/signos/ausencias;
no autocompletar capital=total, intereses=0 ni usar TIN/TAE en una cuota ordinaria.
Gasto sin Partida ligada sigue funcionando como E1.4, sin desglose de deuda inventado.
Q3 protege cambios de enlace que reclasifiquen hechos ya registrados: nunca incorporar
retroactivamente Gastos existentes a un motor nuevo sin revisión y datos de desglose.

Ejemplo ficticio condicionado a apertura/corte Q1: apertura de Deuda 1.000,00 EUR,
cuota 100,00 (capital 80,00 + intereses 20,00) aplicable → capital pendiente 920,00.
Banco con apertura 500,00 → 400,00; gasto económico 100,00, no 20,00 ni 180,00.
La ejecución presupuestaria futura consume el Gasto completo según fuente/Partida;
no se implementa un presupuesto simulado ni se afirma probado E2 por esta igualdad.

### Amortización extraordinaria
Tipo Amortización deuda; origen Saldo válido y destino fijo Exterior S000, Partida
obligatoria con Deuda válida; sin Subtipo ingreso. No Transferencia para este hecho.
Importe total estrictamente positivo; capital derivado=importe, intereses derivados=0,
no aceptar valores contradictorios ni un segundo Gasto. Q4 fija permiso/fecha del tipo.
Saldo origen Control Movimientos reduce el importe íntegro; principal reduce ese mismo
capital si aplica al control según Q1. Otros motores mantienen sus estados no calculables;
no excluir automáticamente No controlado ni Terminal sin evidencia específica.
Ejemplo continuación anterior, extraordinaria 200,00 aplicable: banco 200,00, principal
720,00 y gasto permanece 100,00. No plan ejecutado por 200,00 ni Gasto adicional.
No intereses, comisiones o penalizaciones sintéticos: no hay evidencia para repartirlos;
un caso con conceptos adicionales no se fuerza al modelo ni se habilita sin especificación.

### Referencias, Ciclos e impacto histórico
Categoría/Subcategoría y Deuda proceden de Partida por IDs, no de Concepto/Nota.
La obligación de Referencia alcanza Gasto y Amortización deuda según E1.2. Reutilizar
existencia y matriz por ID; CAT011 Viaje obligatorio, CAT012 Anticipo obligatorio,
CAT013 Gasto compartido obligatorio, CAT014 Evento y CAT009 Vehículo opcionales.
No endurecer compatibilidad opcional. Viaje/Evento operativos; casos con ficha E3 y
sus restricciones siguen bloqueados, no utilizar una Referencia para cambiar el Tipo.

Fecha civil y Ciclo se derivan del maestro único; antes del primero: Sin ciclo asignable.
Movimiento vigente del nuevo Tipo participa en máximo financiero; rectificar/anular puede
retroceder la referencia. No usar reloj para ciclo/corte. El límite de fecha futura
Europe/Madrid ya rige Gasto; extensión al nuevo Tipo pendiente Q4. Sin cambiar Ciclos futuros.

Rectificar importe, Partida, desglose, fecha o Tipo requiere motivo, preview verificable,
ID estable, revisión/contexto y auditoría anterior/posterior. Anular solo un error que no
representa hecho económico real: mantiene ID/historia, excluye todo su efecto económico.
Una devolución real no es anulación. Mostrar efectos bancarios, capital y gasto separados,
según Q1/Q2, además de Ciclo/referencia; no representar un impacto incompleto como comprobado.
Cambiar una operación puede afectar el capital de la antigua y nueva Deuda: ambas deben
figurar en revisión. Conversiones de Tipo no retienen campos inválidos ni generan otra fila.

Reasignación Partida→Deuda, apertura e Inicio con uso tienen impacto económico aunque no
se edite directamente Movimientos. Q3 propone bloquear su edición ordinaria y dar salida
futura con nueva Partida, sin versionado general ni actualización masiva implícita.
Si se aprueba una rectificación histórica específica, debe tener consumidores verificables,
no motores simulados. Cierres/fotos todavía inexistentes siguen contrato futuro DT5/P5;
no declarar protegido por cierre un período sin motor de cierre instalado.

## Data model and contracts
Modelo conceptual propuesto, NO esquema SQL aprobado ni código ejecutable:

| Entidad | Persistente propuesto | Derivado/no persistir como fuente paralela |
| --- | --- | --- |
| Deuda | Dxxx, nombre, entradas de control/apertura Q1/Q3, estado Q3, revisión y UTC | Capital pendiente, totales operados, posiciones patrimoniales |
| Partida existente | Enlace opcional a Deuda por ID con integridad y protección Q3 | Deuda/nombre/jerarquía del contexto actual; no copia por descripción |
| Movimiento existente | Hecho único/ID, Tipo, fecha, importe, Saldos, Partida, REF, concepto/nota; desglose real de cuota | Capital/intereses de extraordinaria por identidad; Ciclo/jerarquía/efectos |
| Auditoría e intento | Actor único, motivo, UTC, anterior/posterior, revisiones e idempotencia | No acumulados financieros en tablas auxiliares |

La estrategia exacta para preservar el enlace económico usado se concretará al resolver
Q3: no dos FK editables independientes en Partida/Movimiento, ni reinterpretación por
cambio silencioso del catálogo. Una captura de auditoría no sustituye el control de esa relación.
Importes EUR: céntimos enteros, parsing/suma exacta con controles de desbordamiento ya
establecidos, no float ni redondeo silencioso; fechas económicas civiles, metadatos UTC.
No extender dos decimales a futuras inversiones ni almacenar tasas innecesarias aquí.
Ausencias históricas/desglose antiguo no se rellenan con cero en upgrade ni por formulario.

Continuidad desde SQLite v5 genuina: migración futura versionada atómica, preservando
Saldos/clasificación/Ciclos/REF/hechos/IDs/auditorías/intentos y propietario/MFA/acceso.
Sin borrar/resembrar ni convertir movimientos antiguos en cuotas o amortizaciones.
Cambios de CHECK/tablas, si se requieren, preservan FK/índices/triggers y contenido exacto;
rollback ante fallo, dos arranques concurrentes y rechazo intacto de versión desconocida.
No se decide aquí un número de versión ejecutable ni se escribe SQL.
Snapshot consistente, manifiesto etiquetado con versión correcta y restore age real
se verifican en desarrollo futuro; claves y copias fuera de Git, restore destino nuevo.
No automatización/copia externa ni configuración de producción en E1.6.

## Screens and interfaces
Wireframes PROPUESTOS: revisión de diseño pendiente, NO capturas ni pruebas ejecutadas.
Reutilizar shell/cabecera Ciclos, navegación, componentes/tokens claros MyFinanzas:
#8DBB2E con texto oscuro, fondos blancos/verdes suaves, sin modo oscuro/librerías nuevas.
Desktop tabla compacta y menú lateral; móvil tarjetas, menú adaptado, formularios propios,
campos etiquetados, teclado/foco y acciones sin depender solo del color. No gráfico patrimonial.

### 1440 px — listado y ficha de Deuda
```text
┌ MyFinanzas ┬ Ciclo financiado: [contexto del maestro, o No disponible] ─────┐
│ Saldos     │ Deudas                                      [+ Nueva deuda] │
│ Clasific.  │ Buscar [________]  Estado [Activas ▾]                       │
│ Ciclos     │ ID    Nombre            Inicio control Apertura  Pendiente │
│ Movim.     │ D001  Préstamo ficticio [fecha Q1]     1.000,00  [motor Q1]│
│ Referenc.  │                                               [Ver ficha] │
│ Deudas     ├────────────────────────────────────────────────────────────┤
│            │ Préstamo ficticio · D001 · Activa               [Editar]   │
│            │ Control: Inicio / Capital apertura / Alcance temporal Q1   │
│            │ Capital pendiente [valor verificado; no Saldo bancario]    │
│            │ Partidas vinculadas [Ver]  Operaciones [Abrir filtradas]   │
│            │ [Desactivar]  Sin cuadro previsto ni coste futuro          │
└────────────┴────────────────────────────────────────────────────────────┘
```
Alta/edición en página propia: Identificación (nombre/ID de solo lectura), Control
(Inicio/apertura y campos adicionales solo si Q1/Q3 lo exigen), Estado según Q3.
No importe vacío presentado como cero ni total si configuración incompleta/no verificable.

### 1440 px — cuota, extraordinaria y revisión
```text
Movimientos                                 [+ Registrar movimiento]
Tipo [Todos ▾] Deuda [Todas ▾] Ciclo [Todos ▾] Estado [Vigentes ▾]
Fecha       Tipo                Concepto      Importe   Deuda    [Ver]
[fecha]     Gasto               Cuota demo    100,00 €  D001
[fecha]     Amortización deuda  Pago demo     200,00 €  D001

Registrar movimiento                         (página propia)
Identificación: Tipo [Gasto ▾] Fecha [____] Concepto [____]
Operación: Origen [Banco demo ▾] Destino Exterior · Importe [100,00]
Clasificación: Partida [Cuota demo ▾] → Deuda D001 (derivada)
Desglose cuota: Capital [80,00] Intereses [20,00] Suma 100,00 / Total 100,00
Referencia [según regla Categoría]  Nota [____]    [Cancelar] [Revisar]

Tipo [Amortización deuda ▾]: misma Partida/Deuda; sin Subtipo.
Capital = importe / Intereses = 0 (solo lectura, no valores editables).

Revisión / ficha: ID estable, Tipo, importe, desglose, Partida y Deuda,
Origen → Exterior, Referencia, Ciclo, vigencia y auditoría.
Impacto: Banco 500→400 / Principal 1.000→920 / Gasto +100 (ejemplo cuota)
Corte de control Q1 visible. Duplicados [Revisar coincidencias].
Rectificación: motivo [____], anterior/posterior, ambas Deudas si cambia.
[Volver al formulario] [Confirmar]  Ficha: [Rectificar] [Anular error]
```
En edición de Partida: selector Deuda real, opcional, Sin asignación válido. Si está
utilizada, Q3 determina bloqueo y explicación sin guardar un cambio económico oculto.
Acceso a alta Deuda propia y vuelta conserva borrador en memoria, no registros temporales.
No preselección de la primera Deuda ni autoasignación por nombre/Grupo.

### 390 px — listado/ficha/alta y pago
```text
┌ MyFinanzas                 [Menú] ┐
│ Ciclo: [contexto central]         │
│ Deudas                  [+ Nueva]│
│ Buscar [____] [Filtros]           │
│ Préstamo ficticio · D001          │
│ Activa · Inicio [fecha Q1]        │
│ Apertura 1.000,00 EUR             │
│ Pendiente [motor Q1]      [Ficha] │
├──────────────────────────────────┤
│ Nueva deuda                      │
│ Nombre [____]                    │
│ Inicio control [____]            │
│ Capital apertura EUR [____]      │
│ [campos mínimos según Q1/Q3]      │
│ [Cancelar] [Guardar]             │
├──────────────────────────────────┤
│ Ficha D001 · [Editar]            │
│ Control / Capital / Estado       │
│ [Partidas] [Movimientos]         │
│ [Desactivar/reactivar según Q3]   │
├──────────────────────────────────┤
│ Registrar movimiento             │
│ Tipo [Gasto ▾] Fecha [____]       │
│ Origen [____ ▾] Importe [100,00]  │
│ Destino Exterior (fijo)           │
│ Partida [Cuota demo ▾]            │
│ Deuda: D001 · Préstamo ficticio   │
│ Capital [80,00] Intereses [20,00] │
│ Suma 100,00 / Importe 100,00      │
│ Referencia [según Categoría]      │
│ [Cancelar] [Revisar]             │
├──────────────────────────────────┤
│ Revisar pago                     │
│ Banco antes → después            │
│ Deuda antes → después            │
│ Gasto íntegro / Ciclo / Referencia│
│ Motivo [solo rectificación]       │
│ [Volver] [Confirmar]             │
└──────────────────────────────────┘
```
Móvil extraordinaria: Tipo visible, capital=importe e intereses=0 como resumen claro.
Ficha Movimiento: auditoría y estado Anulado sin efectos; filtros por Deuda ID, Tipo,
fechas/Ciclo/vigencia reutilizan listado, sin sumar Gastos y amortizaciones bajo «Gasto».
No descargar datos ni mostrar factores de autenticación en evidencia visual futura.

## Empty, loading and error states
Sin Deudas: explicación y CTA alta, sin semillas reales/automáticas para cubrir ausencia.
Sin Partidas ligadas: enlazar a configuración, no permitir ID libre ni crear relación provisional.
Carga/error: reintento y borrador conservado, no sustituir por cero o por entidades de demo.
Validación: campo/mensaje y foco accesible; desglose desigual señala diferencia exacta,
no corrige automáticamente. Q2 fijará otras validaciones, sin fabricar límites.
404 inexistente, 422 datos inválidos, 409 revisión/contexto/idempotencia obsoletos:
conservar borrador y exigir revisión nueva, sin sobreescribir ni confirmar preview anterior.
401/expiración sigue MFA; no token persistido en navegador ni recuperación alternativa.
Duplicado económico muestra coincidencias y admite otro hecho real confirmado; reintento
técnico conserva el intento y nunca duplica el hecho, auditoría ni reducción de capital.
Histórico inactivo se identifica y no se sustituye al abrir la ficha. Casos E3 bloqueados
explican dependencia real. Errores técnicos no exponen SQL, importes, secretos o stack.

## API behavior and external dependencies
Propuesta, no rutas implementadas: /api/deudas para listado/alta, /:id para ficha/edición
con revisiones y estado; consulta enlazada /api/movimientos filtrada por Deuda ID.
Extender opciones, preview y escritura/rectificación/anulación de Movimientos, no otra
API de pagos que mantenga un registro financiero paralelo. Integrar Partida→Deuda en
Clasificación y sus guardas/preview de impacto, sin endpoint que salte protecciones.
No DELETE ni edición directa de capital derivado. Rechazar campos derivados manipulados;
extraordinaria calcula sus componentes en servidor, independientemente del navegador.

Lecturas coherentes y paginación/orden estable. Toda ruta financiera exige sesión MFA;
Origin/CSRF en escrituras, límite JSON y controles existentes. Una transacción IMMEDIATE
valida, reserva ID, escribe hecho/desglose, auditoría e intento. Concurrencia revalida
catálogo/apertura/enlaces, posiciones y ambas Deudas frente al contexto revisado;
fallo de cualquier paso revierte todo. No se guardan posiciones/calculadores paralelos.
Actualizar la huella central con las nuevas entradas reales para detectar cambios entre
preview y confirmación. Error genérico con requestId, sin payload financiero en logs.
React + Bun + Effect HTTP + bun:sqlite/SQL directo; sin ORM, dependencias nuevas,
servicios bancarios, infraestructura ni herramientas de simulación.

## Validation and edge cases
Resolver Q1–Q4 antes de declarar cerrada esta propuesta. IDs inexistentes/inactivos,
Partida sin Deuda en extraordinaria, relación histórica cambiada, suma desigual,
redondeos/reintentos/concurrencia, cambios antes/después del corte, igualdad de fechas
y principal agotado/excedido requieren las reglas contrastadas y pruebas de frontera.
Las comprobaciones de cierres/indicadores futuros se identifican como pendientes;
solo se inspeccionan consumidores realmente disponibles. El presupuesto futuro no
puede recibir intereses/capital como hechos adicionales ni sumar extraordinaria a Gasto.

## Exclusions
No dev 06, código/SQL/migración, datos reales, libro, merge ni despliegue en esta fase.
En E1.6 posterior: no simulación, calendario de cuotas futuras, interés calculado,
TIN/TAE/condiciones completas salvo necesidad demostrada del mínimo, conciliación completa
E4.4, patrimonio/hipoteca/activo inmobiliario, cierres/fotos E4, plan anual/mensual E2,
fichas E3, transferencias Exterior, importación/corte real, copia externa/scheduler o
producción. No motor falso para demostrar futuros contratos.

## Acceptance checks
Pruebas PREVISTAS, NO ejecutadas. 30 actuales candidatos I (algunos condicionados a
Q1–Q4), 3 contratos futuros C. No son 30 PASS ni aceptación aprobada. IDs estables
para revisión, sin afirmar validez de condiciones propuestas pendientes.

| ID | Acción / precondición | Resultado observable esperado | Prueba prevista | Clase / reserva |
| --- | --- | --- | --- | --- |
| AC-01 | Alta y consulta de Deuda con mínimo confirmado | Un Dxxx estable, identidad/control, sin Saldo ni Movimiento de apertura | Bun/API/UI | I — Q1/Q3 |
| AC-02 | Altas concurrentes, reintento y D999 | IDs atómicos/no reutilizados, D1000, una respuesta por intento técnico | Bun procesos/API | I — Q3 |
| AC-03 | Renombrar, desactivar/reactivar Deuda usada | ID/historia conservados, sin DELETE ni hechos nuevos; nuevas selecciones según estado | Bun/API/UI | I — Q3 |
| AC-04 | Asignar Deuda a Partida nueva, dejar otra sin relación | Enlace 0..1 real por ID, varias Partidas admisibles; sin duplicar jerarquía | Bun/API/UI | I — Q3 |
| AC-05 | Reasignar/desvincular Partida o cambiar apertura/Inicio utilizados | No reclasificación histórica silenciosa; aplicar protección aprobada | Bun impacto/API | I — Q3 |
| AC-06 | Registrar cuota 100, capital80/intereses20 aplicable | Un Gasto100, banco−100, principal−80; ningún segundo hecho | Bun exactitud/E2E | I — Q1/Q2 |
| AC-07 | Cuota con suma incorrecta, ausencia/cero/signo de componentes | Desigualdad rechazada; demás dominios según Q2, sin autocompletar ni redondear | Bun/API/UI | I — Q2 |
| AC-08 | Gasto sin Deuda; intento de desglose/deuda contradictorios | Gasto ordinario intacto, ninguna reducción de principal ni FK paralela aceptada | Bun/API | I |
| AC-09 | Extraordinaria200 con Partida ligada | Un Amortización deuda, capital200/intereses0, banco−200, principal−200 si aplicable; Gasto0 | Bun/E2E | I — Q1/Q4 |
| AC-10 | Extraordinaria sin Partida/Deuda, Subtipo o componentes alterados | Rechazo atómico del payload inválido; destino S000 fijo, sin Gasto sintético | Bun/API | I |
| AC-11 | Origen inactivo/inexistente/S000 y Control Terminal/No controlado; permiso Exterior | Aplicar elegibilidad contrastada sin vetos generales nuevos; sin posición parcial presentada como calculada | Bun/API/UI | I — Q4 |
| AC-12 | Total cero/negativo/tercer decimal y límites técnicos | Total positivo EUR exacto, error explícito; no float/truncado/overflow | Bun/API | I |
| AC-13 | Hechos antes/en/después del Inicio de control, apertura informada | Principal según frontera Q1, sin duplicación precontrol ni reconstrucción; banco no filtrado por Fecha apertura | Bun tabla de equivalencia | I — Q1 |
| AC-14 | Capital cero/agotado/excedido y rectificación retroactiva | Resultado o rechazo según Q2, sin clamp ni desaparición del exceso | Bun/API/UI | I — Q1/Q2 |
| AC-15 | Hoy/mañana en medianoche Madrid/DST | Gasto conserva límite; extraordinaria según Q4, cliente/servidor iguales; Ciclos futuros intactos | Bun/API/UI | I — Q4 |
| AC-16 | Hecho antes del primer Ciclo y en límites de intervalo | Sin ciclo asignable o maestro correcto, sin ciclo creado automáticamente | Bun/E2E | I |
| AC-17 | Nueva extraordinaria vigente de fecha máxima; rectificar/anular | Máximo financiero/cabecera se actualiza o retrocede desde hechos vigentes, no reloj | Bun/UI | I |
| AC-18 | Gasto/extraordinaria con REF obligatoria/opcional/mapping/E3 | Existencia/compatibilidad según regla vigente por IDs; casos E3 bloqueados, opcionales no endurecidos | Bun/API/UI | I |
| AC-19 | Rectificar cuota/capital/intereses/Partida/Tipo con motivo | Mismo ID, antes/después y ambas Deudas afectadas verificables; sin efecto doble | Bun/API/E2E | I — Q1/Q2/Q3 |
| AC-20 | Anular error que no representa hecho real y reintentar | Auditoría conservada, excluye importe y capital del motor aplicable, no DELETE/compensación | Bun/E2E | I — Q1 |
| AC-21 | Dos hechos iguales reales frente a respuesta perdida | Advertencia revisable permite dos hechos; reintento técnico produce solo uno | Bun concurrencia/E2E | I |
| AC-22 | Cambiar Deuda/apertura/enlace/hecho tras preview | 409/revisión nueva, sin guardar efecto basado en contexto obsoleto | Bun procesos/API/UI | I — Q3 |
| AC-23 | Fallar escritura de auditoría/intento durante pago | Rollback de hecho/desglose/ID/intento, principal y banco intactos | Bun fault injection | I |
| AC-24 | Filtrar Deuda/Tipo/Ciclo/estado y abrir ficha | Solo hechos vinculados por ID, anulados consultables; gasto separado de extraordinaria | API/E2E | I |
| AC-25 | Recorrer listados/fichas/formularios/preview a390/1440 | Tabla/tarjetas, teclado/labels/foco/contraste, sin overflow; capturas reales solo en dev | Playwright + inspección | I — diseño pendiente |
| AC-26 | Vacío/carga/error/401/404/409/422 y vuelta desde alta Deuda | Borrador conservado, error accionable, no valores/relaciones ficticios de sustitución | API/E2E | I |
| AC-27 | Leer/escribir sin MFA, sin Origin/CSRF o manipular derivados | Rechazo servidor en todas las rutas, no fuga SQL/datos/factores ni bypass heredado | Bun Effect HTTP | I |
| AC-28 | Upgrade v5 genuina con historia/acceso, fallo DDL, dos arranques | Datos/IDs/auditorías/REF/intentos/MFA preservados, sin reseed/backfill; rollback y versión desconocida intacta | Bun integración/procesos | I |
| AC-29 | Backup age del esquema nuevo, inspeccionar manifiesto y restaurar aislado | Versión/etiqueta correctas, relaciones/capital/posiciones y acceso recuperables; política de sesiones preservada | Bun + E2E restore/MFA | I |
| AC-30 | Regresión E1.1–E1.5 y matriz de cuatro Tipos | Reglas previas conservadas, sin habilitar Exterior Transferencia ni E3; cuota es gasto íntegro, extraordinaria no es gasto | Bun/API/Playwright | I |
| AC-31 | Integrar plan anual/mensual, flujo e informes posteriores | Cuota ejecuta Gasto íntegro por reglas de fuente; extraordinaria excluida; no duplicar capital/intereses | Futuras E2/E4 | C |
| AC-32 | Ampliar Deuda completa/conciliación histórica y migración real | Apertura/precontrol preservados, condiciones/hipoteca según E4.4; equivalencia y corte autorizados, sin hechos inventados | Futuras E4.4/E4.5/E4.12 | C |
| AC-33 | Instalar cierres/fotos y rectificación protegida | Guardas reales transversales y fotos inmutables; no confundir pruebas locales con protección instalada | Futuras DT5/P5/E4 | C |

## Reanudación y aprobación
Resolver Q1–Q4 en brainstorming con evidencias sanitizadas, revisar estos wireframes y
ajustar AC condicionados antes de pedir aprobación completa. Publicar Draft autorizado,
sin marcar APPROVED ni iniciar dev 06. Ningún resultado de pruebas funcionales o visuales
se atribuye a esta fase documental; las validaciones de documentos se registran en la PR.
