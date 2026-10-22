# 06 — E1.6 Cuota y amortización de Deuda: Specification
Status: DRAFT — NO APROBADA; Q1 cerrada con evidencia v5.11(7), Q2–Q4 consolidadas.
Q1–Q4 validadas y decisiones app de exceso, fecha futura y ciclo de vida consolidadas
por auditoría final del usuario 2026-10-22; integración y desarrollo aún NO autorizados.
Approval source/date: PENDING. Autorizada solo elaboración/publicación Draft, 2026-10-21.
Context and brainstorming: [decisiones y ronda única](06-deuda-brainstorming.md),
[roadmap E1.6/E4.4](roadmap.md), [R1/R2/R5](functional-reference-v5.11.md),
[contratos E1.4](04-movimientos-testplan.md), [cierre E1.5](05-transferencias-referencias-testplan.md).
Base vigente: main ad9442669468968d0ab82a9613522c7205b242c1 (SQLite v6), 2026-10-22; datos exclusivamente ficticios. No libro ni Criterios físicos
inspeccionados por Codex. Referencia única: MyFinanzas2026_v5.11(7).xlsx, candidata
vigente NO promovida a estable, sustituye a (5) por usuario 2026-10-22. No dev 06,
código funcional, SQL ni migraciones autorizados.

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
| Capital actual = apertura − capital amortizado del mismo ID con Fecha >= Inicio control | Q1 cerrada: fórmula física v5.11(7) y Criterios aportados por usuario |
| Cuota: capital>0, intereses>=0, ambos explícitos, suma exacta | Confirmación del usuario 2026-10-22 Q2; no inferir TIN/TAE |
| Exceso sobre principal | Decisión app consolidada por auditoría final: rechazo atómico de capital verificable negativo, cero exacto válido; no regla Excel |
| Maestro mínimo Dxxx/Partida→Deuda y protección de apertura/Inicio/enlaces usados | Usuario Q3 confirmado; mínimo de cálculo Inicio control/capital apertura confirmado Q1; estados/ciclo de vida son decisión app consolidada |
| Extraordinaria S000 y origen con permiso Exterior Sí | Usuario Q4 confirmado |
| Fecha máxima extraordinaria | Decisión app consolidada: máximo hoy civil Europe/Madrid; no regla Excel |
| EUR exacto, MFA, auditoría, idempotencia y rectificaciones | Reutilización de contratos ya aprobados |

E1.6 habilitará el consumidor Deuda de E1.2 y la parte deuda/extraordinaria de E1.4
AC-31 y E1.5 AC-32. No declara globalmente completos esos contratos: inversión,
planificación, Comida y cierres reales siguen pendientes. E1.4 AC-30 y E1.5 AC-31
mantienen referencias E3 y TODAS las Transferencias con Exterior fuera de alcance.
La matriz de cuatro tipos no equivale a habilitar cualquier variante de Transferencia.

### Maestro y capital pendiente
Contrato Q3 y decisión de ciclo de vida app: alta, consulta/listado, nombre editable, estado, desactivación/reactivación,
ID visible inmutable Dxxx generado en servidor, atómico/no reutilizado y después de D999.
No ID interno extra sin necesidad; preservar los existentes en migración futura autorizada.
Nombre identifica en UI pero no es clave; no inventar unicidad de nombres.
Se pueden asociar distintas Partidas a una misma Deuda, manteniendo 0..1 por Partida
según R1; no inventar un límite 1:1. Una Partida sin Deuda sigue válida para Gasto ordinario.

Entradas necesarias para el cálculo: ID Dxxx, Fecha inicio control y Capital pendiente
apertura (€); nombre para identidad visible. Fecha inicio de la deuda y TIN/TAE no son
entradas de este motor ni se exigen en el mínimo. Campos históricos/precontrol amplios
siguen en su entrega de conservación/conciliación, no se añaden como operandos E1.6.

**Q1 cerrada — fórmula vigente:** capital pendiente actual = capital pendiente apertura
menos suma de Capital amortizado de Movimientos del mismo ID deuda cuya Fecha sea
>= Fecha inicio control. Día inicial incluido; hechos anteriores no reducen ese capital.
No se descuenta cuota completa ni intereses. No se añaden filtros por Tipo, Control
saldo ni Fecha inicio de la deuda; [fórmula física y Criterios](functional-reference-v5.11.md).
El registro canónico app excluye anulados por el contrato ya aprobado E1.4; no atribuir
ese filtro al SUMIFS físico ni permitir desgloses inválidos de otros Tipos por no filtrar.

La apertura es posición en la frontera. Capital inicial, capital amortizado histórico,
extraordinaria histórica, capital histórico en cuotas, intereses/total pagado histórico
y precontrol del año no se suman/restan otra vez. No crear capital inicial como Movimiento
ni como Saldo, ni reconstruir hechos ausentes. Corte C30 de 2026 solo corresponde a las
deudas allí indicadas; no codificar ni precargar una fecha universal en la app.

Apertura ausente y cero explícito siguen distintos. La fórmula no demuestra una regla
general de signo/obligatoriedad; no trasladar capital>0 de cuota a apertura. Propuesta
app de formulario para crear una Deuda calculable: fecha de control y apertura explícitas,
sin precargar cero; ausencias históricas no se rellenan, capital no calculable se muestra
como tal. No inferir intereses por TIN/TAE ni generar cuotas programadas.
Los hechos precontrol conservan su efecto bancario/Gasto real, pero no reducen de nuevo
el principal de apertura. El motor Saldos sigue sin filtro general de Fecha apertura.
Mostrar alcance temporal del capital; nunca persistir restante ni hacer clamp a cero.
Ciclo de vida app consolidado: no habilitar nuevas altas ligadas a Deuda inactiva; la historia sigue
consultable y una reactivación no crea hechos. No impedir anular por estado inactivo.
La conservación de relaciones sin cambio en una rectificación sigue patrón E1.4/E1.5,
sin obligar a sustituir entidades históricas inactivas por otras activas silenciosamente.

### Cuota ordinaria
Gasto con Partida ligada a Deuda existente: mostrar Deuda derivada por ID y desglose.
No selector independiente de Deuda contradictorio con Partida. Capital/intereses son
atributos del MISMO hecho, no detalles con IDs financieros nuevos.
Capital amortizado obligatorio y estrictamente mayor que cero; intereses obligatorios
y mayores o iguales a cero. Ambos explícitos: ausencia no es cero. La suma exacta debe
igualar importe EUR positivo según Q2 confirmado por el usuario;
no autocompletar capital=total, intereses=0 ni usar TIN/TAE en una cuota ordinaria.
Gasto sin Partida ligada sigue funcionando como E1.4, sin desglose de deuda inventado.
Q3 confirmado protege cambios de enlace que reclasifiquen hechos ya registrados: nunca incorporar
retroactivamente Gastos existentes a un motor nuevo sin revisión y datos de desglose.

Ejemplo ficticio con operación en/después de Inicio control según Q1: apertura de Deuda 1.000,00 EUR,
cuota 100,00 (capital 80,00 + intereses 20,00) aplicable → capital pendiente 920,00.
Banco con apertura 500,00 → 400,00; gasto económico 100,00, no 20,00 ni 180,00.
La ejecución presupuestaria futura consume el Gasto completo según fuente/Partida;
no se implementa un presupuesto simulado ni se afirma probado E2 por esta igualdad.

### Decisión app de exceso de capital — consolidada por auditoría final
Rechazar atómicamente cualquier operación cuando el estado candidato de hechos
vigentes aplicables deje capital pendiente verificable negativo en alguna Deuda afectada;
igualdad permite cero exacto. Al rectificar se sustituye el efecto anterior, no se resta
dos veces. Revalidar también las consecuencias de rectificación/anulación sobre los
hechos posteriores y ambas Deudas si cambian. Mostrar operación, Deuda y diferencia,
sin truncar ni crear compensaciones. No requiere inventar horas ni orden económico por ID.
El chequeo se aplica al capital computable según Q1: no se extiende a hechos precontrol. Si no hay base
verificable, no inventar pendiente ni aprobar un efecto ficticio. Decisión de la app
consolidada explícitamente en auditoría final del usuario; no regla física del Excel.

### Amortización extraordinaria
Tipo Amortización deuda; origen Saldo válido y destino fijo Exterior S000, Partida
obligatoria con Deuda válida; sin Subtipo ingreso. No Transferencia para este hecho.
Importe total estrictamente positivo; capital derivado=importe, intereses derivados=0,
no aceptar valores contradictorios ni un segundo Gasto. Q4 confirmado exige origen
activo elegible con Permite salida a Exterior=Sí; destino técnico S000 fijo. El límite
de fecha futura es decisión app consolidada en auditoría final: no posterior al día civil
actual Europe/Madrid, con validación cliente/servidor; no es una regla física demostrada.
Saldo origen Control Movimientos reduce el importe íntegro; principal reduce ese mismo
capital cuando Fecha >= Inicio control según Q1. Otros motores mantienen sus estados no calculables;
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

Fecha económica civil es entrada del hecho ejecutado; solo Ciclo se deriva del maestro
único. Antes del primero: Sin ciclo asignable.
Movimiento vigente del nuevo Tipo participa en máximo financiero; rectificar/anular puede
retroceder la referencia. No usar reloj para ciclo/corte. El límite de fecha futura
Europe/Madrid ya rige Gasto y queda extendido a extraordinaria en cliente/servidor
como decisión app consolidada. Sin cambiar Ciclos futuros.

Rectificar importe, Partida, desglose, fecha o Tipo requiere motivo, preview verificable,
ID estable, revisión/contexto y auditoría anterior/posterior. Anular solo un error que no
representa hecho económico real: mantiene ID/historia, excluye todo su efecto económico.
Una devolución real no es anulación. Mostrar efectos bancarios, capital y gasto separados,
según Q1/Q2, además de Ciclo/referencia; no representar un impacto incompleto como comprobado.
Cambiar una operación puede afectar el capital de la antigua y nueva Deuda: ambas deben
figurar en revisión. Conversiones de Tipo no retienen campos inválidos ni generan otra fila.

Reasignación Partida→Deuda, apertura e Inicio con uso tienen impacto económico aunque no
se edite directamente Movimientos. Q3 confirmado bloquea su edición ordinaria. Para
cambios futuros del enlace se crea nueva Partida, sin versionado general ni actualización
masiva implícita. Esto no autoriza cambiar apertura/Inicio de una Deuda usada mediante
nueva Partida ni define un procedimiento de rectificación de esas entradas.
Si se aprueba una rectificación histórica específica, debe tener consumidores verificables,
no motores simulados. Cierres/fotos todavía inexistentes siguen contrato futuro DT5/P5;
no declarar protegido por cierre un período sin motor de cierre instalado.

## Data model and contracts
Modelo conceptual propuesto, NO esquema SQL aprobado ni código ejecutable:

| Entidad | Persistente propuesto | Derivado/no persistir como fuente paralela |
| --- | --- | --- |
| Deuda | Dxxx, nombre, Fecha inicio control, capital apertura, estado de ciclo de vida app, revisión y UTC | Capital pendiente, totales operados, posiciones patrimoniales |
| Partida existente | Enlace opcional a Deuda por ID con integridad y protección Q3 | Deuda/nombre/jerarquía del contexto actual; no copia por descripción |
| Movimiento existente | Hecho único/ID, Tipo, fecha, importe, Saldos, Partida, REF, concepto/nota; desglose real de cuota | Capital/intereses de extraordinaria por identidad; Ciclo/jerarquía/efectos |
| Auditoría e intento | Actor único, motivo, UTC, anterior/posterior, revisiones e idempotencia | No acumulados financieros en tablas auxiliares |

La relación conceptual Partida→Deuda todavía no tiene columna ni selector en el producto
vigente. Se incorporará una única relación opcional por ID con integridad; Deuda de un
Movimiento deriva de su Partida, no dos FK editables independientes ni reinterpretación por
cambio silencioso del catálogo. Una captura de auditoría no sustituye el control de esa relación.
Importes EUR: céntimos enteros, parsing/suma exacta con controles de desbordamiento ya
establecidos, no float ni redondeo silencioso; fechas económicas civiles, metadatos UTC.
No extender dos decimales a futuras inversiones ni almacenar tasas innecesarias aquí.
Ausencias históricas/desglose antiguo no se rellenan con cero en upgrade ni por formulario.

Continuidad desde SQLite v6 genuina vigente: migración futura versionada atómica, preservando
Saldos/clasificación/Ciclos/REF/hechos/IDs/auditorías/intentos y propietario/MFA/acceso,
identidad demo/producción y vínculo DB/clave. Conservar cadena de upgrades anteriores
v1–v5 sin sustituir una fixture real por renumerar una base nueva.
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
│ Movim.     │ D001  Préstamo ficticio [Inicio control]     1.000,00  [capital derivado]│
│ Referenc.  │                                               [Ver ficha] │
│ Deudas     ├────────────────────────────────────────────────────────────┤
│            │ Préstamo ficticio · D001 · Activa               [Editar]   │
│            │ Control: Inicio / Capital apertura / Alcance desde Inicio control   │
│            │ Capital pendiente [valor verificado; no Saldo bancario]    │
│            │ Partidas vinculadas [Ver]  Operaciones [Abrir filtradas]   │
│            │ [Desactivar]  Sin cuadro previsto ni coste futuro          │
└────────────┴────────────────────────────────────────────────────────────┘
```
Alta/edición en página propia: Identificación (nombre/ID de solo lectura), Control
(Fecha inicio control y capital apertura), Estado como decisión app. No fecha de inicio
del préstamo ni campos históricos adicionales exigidos para el motor mínimo.
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
Inicio control inclusivo visible. Duplicados [Revisar coincidencias].
Rectificación: motivo [____], anterior/posterior, ambas Deudas si cambia.
[Volver al formulario] [Confirmar]  Ficha: [Rectificar] [Anular error]
```
En edición de Partida: selector Deuda real, opcional, Sin asignación válido. Si está
utilizada, Q3 impone bloqueo y explicación sin guardar un cambio económico oculto.
Incluye asignar Deuda a una Partida ya usada que antes no tenía desglose; no backfill implícito.
Acceso a alta Deuda propia y vuelta conserva borrador en memoria, no registros temporales.
No preselección de la primera Deuda ni autoasignación por nombre/Grupo.

### 390 px — listado/ficha/alta y pago
```text
┌ MyFinanzas                 [Menú] ┐
│ Ciclo: [contexto central]         │
│ Deudas                  [+ Nueva]│
│ Buscar [____] [Filtros]           │
│ Préstamo ficticio · D001          │
│ Activa · Inicio [Inicio control]        │
│ Apertura 1.000,00 EUR             │
│ Pendiente [capital derivado]      [Ficha] │
├──────────────────────────────────┤
│ Nueva deuda                      │
│ Nombre [____]                    │
│ Inicio control [____]            │
│ Capital apertura EUR [____]      │
│ [sin histórico adicional exigido]      │
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
no corrige automáticamente. Capital amortizado de cuota cero/negativo o intereses negativos se rechazan.
La validación de exceso informa pendiente verificable y diferencia, sin truncar importes.
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
Q1–Q4 validadas; verificar ajustes finales y obtener autorización expresa de integración/desarrollo. IDs inexistentes/inactivos,
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
Pruebas PREVISTAS, NO ejecutadas. 30 actuales I y 3 contratos futuros C. No son
30 PASS ni implementación aprobada. IDs estables; decisiones funcionales validadas
y auditoría favorable no autorizan integrar la PR ni iniciar desarrollo.

| ID | Acción / precondición | Resultado observable esperado | Prueba prevista | Clase / reserva |
| --- | --- | --- | --- | --- |
| AC-01 | Alta y consulta de Deuda con mínimo de cálculo | Dxxx estable, nombre/Inicio control/apertura; sin exigir Fecha inicio deuda ni históricos; ningún Saldo/Movimiento de apertura | Bun/API/UI | I |
| AC-02 | Altas concurrentes, reintento y D999 | IDs atómicos/no reutilizados, D1000, una respuesta por intento técnico | Bun procesos/API | I |
| AC-03 | Renombrar, desactivar/reactivar Deuda usada | ID/historia conservados, sin DELETE ni hechos nuevos; ciclo de vida app consolidado, no regla Excel | Bun/API/UI | I — decisión app |
| AC-04 | Asignar Deuda a Partida nueva, dejar otra sin relación | Enlace 0..1 único por ID, varias Partidas admisibles; sin duplicar jerarquía ni FK editable en Movimiento | Bun/API/UI | I |
| AC-05 | Reasignar/desvincular Partida usada, asignarle Deuda retroactivamente o cambiar apertura/Inicio usados | Bloqueo de edición económica ordinaria, sin reclasificación histórica; nueva Partida para futuro | Bun impacto/API | I |
| AC-06 | Registrar cuota100, capital80/intereses20 aplicable | Un Gasto100, banco−100, principal−80; ningún segundo hecho | Bun exactitud/E2E | I |
| AC-07 | Cuota con suma desigual, componentes ausentes, capital0/negativo o intereses negativos; probar intereses0 explícitos | Rechazar inválidos; capital>0/intereses>=0 y suma exacta; intereses0 válidos; sin TIN/TAE, autorrelleno o redondeo | Bun/API/UI | I |
| AC-08 | Gasto sin Deuda; intento de desglose/deuda contradictorios | Gasto ordinario intacto, ninguna reducción de principal ni FK paralela aceptada | Bun/API | I |
| AC-09 | Extraordinaria200 con Partida ligada y origen permitido | Un Amortización deuda, capital200/intereses0, banco−200, principal−200 si aplicable; Gasto0 | Bun/E2E | I |
| AC-10 | Extraordinaria sin Partida/Deuda, Subtipo o componentes alterados | Rechazo atómico del payload inválido; destino S000 fijo, sin Gasto sintético | Bun/API | I |
| AC-11 | Origen inactivo/inexistente/S000, permiso Exterior No/Sí y Control Terminal/No controlado | Rechazar inválidos o permiso No; exigir Sí sin excluir Terminal/No controlado por su Control; no mostrar posiciones parciales calculadas | Bun/API/UI | I |
| AC-12 | Total cero/negativo/tercer decimal y límites técnicos | Total positivo EUR exacto, error explícito; no float/truncado/overflow | Bun/API | I |
| AC-13 | Hechos t−1/t/t+1, otro ID deuda y cambios de atributos ajenos a la fórmula; apertura ausente/cero e históricos | t−1 excluido, t/t+1 incluidos por Fecha/ID; sin filtro Tipo/Control/Fecha inicio deuda; históricos no operandos, ausencia no cero; banco sin filtro apertura | Bun tabla de equivalencia física Q1 | I |
| AC-14 | Capital igual/excesivo respecto al pendiente verificable y cambios retroactivos/anulación que afecten después | Igualdad deja0; exceso aplicable bloquea atómicamente indicando hecho/diferencia; revalidar estado candidato/ambas Deudas sin orden horario inventado; no clamp | Bun/API/UI | I — decisión app exceso |
| AC-15 | Hoy/mañana en medianoche Madrid/DST | Decisión app: extraordinaria bloquea futuro en cliente/servidor como Gasto; no atribuir a Excel ni alterar Ciclos futuros | Bun/API/UI | I — decisión app fecha |
| AC-16 | Hecho antes del primer Ciclo y en límites de intervalo | Sin ciclo asignable o maestro correcto, sin ciclo creado automáticamente | Bun/E2E | I |
| AC-17 | Nueva extraordinaria vigente de fecha máxima; rectificar/anular | Máximo financiero/cabecera se actualiza o retrocede desde hechos vigentes, no reloj | Bun/UI | I |
| AC-18 | Gasto/extraordinaria con REF obligatoria/opcional/mapping/E3 | Existencia/compatibilidad según regla vigente por IDs; casos E3 bloqueados, opcionales no endurecidos | Bun/API/UI | I |
| AC-19 | Rectificar cuota/capital/intereses/Partida/Tipo con motivo | Mismo ID, antes/después y ambas Deudas afectadas verificables; sin efecto doble y límites consolidados revalidados | Bun/API/E2E | I — decisión app exceso |
| AC-20 | Anular error que no representa hecho real y reintentar | Auditoría conservada, excluye importe y capital del motor aplicable, no DELETE/compensación | Bun/E2E | I |
| AC-21 | Dos hechos iguales reales frente a respuesta perdida | Advertencia revisable permite dos hechos; reintento técnico produce solo uno | Bun concurrencia/E2E | I |
| AC-22 | Cambiar Deuda/apertura/enlace/hecho tras preview | 409/revisión nueva, sin guardar efecto basado en contexto obsoleto; huella incluye las nuevas entradas reales | Bun procesos/API/UI | I |
| AC-23 | Fallar escritura de auditoría/intento durante pago | Rollback de hecho/desglose/ID/intento, principal y banco intactos | Bun fault injection | I |
| AC-24 | Filtrar Deuda/Tipo/Ciclo/estado y abrir ficha | Solo hechos vinculados por ID, anulados consultables; gasto separado de extraordinaria | API/E2E | I |
| AC-25 | Recorrer listados/fichas/formularios/preview a390/1440 | Tabla/tarjetas, teclado/labels/foco/contraste, sin overflow; capturas reales solo en dev | Playwright + inspección | I — diseño pendiente |
| AC-26 | Vacío/carga/error/401/404/409/422 y vuelta desde alta Deuda | Borrador conservado, error accionable, no valores/relaciones ficticios de sustitución | API/E2E | I |
| AC-27 | Leer/escribir sin MFA, sin Origin/CSRF o manipular derivados | Rechazo servidor en todas las rutas, no fuga SQL/datos/factores ni bypass heredado | Bun Effect HTTP | I |
| AC-28 | Upgrade v6 genuina con historia/acceso, fallo DDL, dos arranques y cadena anterior | Datos/IDs/auditorías/REF/intentos/MFA/origen/DB-clave preservados, sin reseed/backfill; rollback y versión desconocida intacta | Bun integración/procesos | I |
| AC-29 | Backup age del esquema nuevo, inspeccionar manifiesto y restaurar aislado | Versión/etiqueta correctas, relaciones/capital/posiciones y acceso recuperables; política de sesiones preservada | Bun + E2E restore/MFA | I |
| AC-30 | Regresión E1.1–E1.5 y matriz de cuatro Tipos | Reglas previas conservadas, sin habilitar Exterior Transferencia ni E3; cuota es gasto íntegro, extraordinaria no es gasto | Bun/API/Playwright | I |
| AC-31 | Integrar plan anual/mensual, flujo e informes posteriores | Cuota ejecuta Gasto íntegro por reglas de fuente; extraordinaria excluida; no duplicar capital/intereses | Futuras E2/E4 | C |
| AC-32 | Ampliar Deuda completa/conciliación histórica y migración real | Apertura/precontrol preservados, condiciones/hipoteca según E4.4; equivalencia y corte autorizados, sin hechos inventados | Futuras E4.4/E4.5/E4.12 | C |
| AC-33 | Instalar cierres/fotos y rectificación protegida | Guardas reales transversales y fotos inmutables; no confundir pruebas locales con protección instalada | Futuras DT5/P5/E4 | C |

### Matriz mínima de pruebas para las decisiones revisadas
- AC-13: Inicio−1/Inicio/Inicio+1, apertura ausente/cero según evidencia, hechos
  precontrol, rectificar cruzando la frontera y anular. Esperados independientes de
  fórmula/Criterios sanitizados Q1. Otro ID, históricos/precontrol y Fecha inicio deuda
  no alteran el agregado. Probar ausencia de filtros por Tipo/Control con filas-oráculo
  técnicas, sin habilitar payloads inválidos en API; exclusión de anulados es contrato app.
- AC-07/12: 100=80+20, intereses0 explícitos, capital0 rechazado; ausencias, negativos,
  céntimo de diferencia, tercer decimal y límites técnicos sin redondeos silenciosos.
- AC-14/19/22/23: igualdad al pendiente y un céntimo superior; dos pagos concurrentes
  admisibles por separado pero excesivos juntos, cambio de Deuda y rectificación de un
  hecho previo; rechazo/rollback sin segunda auditoría ni consumo parcial de intento.
  Esperados de exceso corresponden a la decisión app consolidada; Q1 ya está cerrada.
- AC-05/28: Partida usada antes sin Deuda, enlace utilizado, apertura/Inicio usados;
  fixture v6 real con historia y acceso tanto demo como producción local ficticia,
  preservando origen y pareja DB/clave; continuidad heredada v1–v5.
- AC-11/15: permiso Exterior Sí/No, S000 manipulado, No controlado/Terminal; hoy/mañana,
  medianoche y DST Madrid según la regla temporal app consolidada de extraordinaria.
- AC-29: snapshot/manifiesto con etiqueta del futuro esquema y restore age aislado,
  acceso MFA, hechos/relaciones/posiciones y capital coherentes. No motor E2/E4 simulado.

### Oráculo ficticio Q1 — prueba prevista, no ejecutada
Apertura D001=1.000 EUR e Inicio control=01/10/2026:
| ID deuda derivado | Fecha Movimiento | Capital EUR | Contribución al capital D001 |
| --- | --- | --- | --- |
| D001 | 30/09/2026 | 50 | Excluido, anterior al control |
| D001 | 01/10/2026 | 80 | Resta80, frontera inclusiva |
| D001 | 02/10/2026 | 200 | Resta200 |
| D002 | 01/10/2026 | 40 | Excluido, otro ID |
Resultado esperado D001: **720 EUR**. Variar históricos o Fecha inicio deuda no lo cambia;
varias Partidas del mismo Dxxx contribuyen al mismo agregado. Fecha inicio control sí
cambia aplicabilidad; rectificar cruzando su frontera debe revalidar el impacto.
Ejemplo integrado: banco apertura500; Gasto precontrol70 (capital50/intereses20),
cuota en Inicio100 (capital80/intereses20) y extraordinaria posterior200 → banco130,
Gasto170, capital720. No crear hechos históricos adicionales ni filtrar saldo bancario
por Fecha apertura. Todos los importes son ficticios, sin relación con registros reales.

## Plan concreto para dev 06 — no iniciado
Con Q1 cerrada, tras auditoría/aprobación completa y autorización expresa de desarrollo:
1. Maestro mínimo y continuidad: fixture v6 genuina, migración versionada atómica sin
   reseed, Dxxx/revisiones/ciclo de vida app; preservar origen/DB-clave y MFA. Probar
   upgrade, rollback, versión desconocida y arranques concurrentes antes de ampliar UI.
2. Partida→Deuda: única relación opcional real y selector reutilizado; consumidor Deuda
   de clasificación con guardas históricas, incluida Partida usada sin desglose. No
   rellenar hechos antiguos ni eliminar reservas de consumidores todavía inexistentes.
3. Capital: servicio central desde entradas Q1 y hechos vigentes; equivalencia física
   antes/en/después de Inicio, precontrol y exactitud. Sin saldo acumulado paralelo.
4. Pagos: extender único pipeline Movimientos, posiciones, financeRevision/huella de
   preview, rectificación/anulación, Referencias y contexto de ambas Deudas. Conservar
   IMMEDIATE/idempotencia/auditoría; extraordinaria es cuarto Tipo, no Transferencia.
5. UI: reutilizar shell, formularios y navegación; maestro y filtros/desglose/revisión
   banco-capital-gasto, responsive 390/1440. Wireframes todavía sujetos a aprobación.
6. Validación/entrega: trazar 30 AC actuales sin atribuir E2/E4 implementadas; Bun/API,
   Playwright/capturas reales, concurrencia, rollback, backup/manifiesto/restore age/MFA,
   typecheck/build/controles y ambas CI; PR funcional independiente sin merge automático.

Ubicación física del desglose, consultas parametrizadas, nombres de componentes y
número de migración se resolverán en desarrollo como detalles ordinarios, sin nuevas
rondas si mantienen estas invariantes. No se fija SQL ahora ni se abre infraestructura.

## Reanudación y aprobación
Q1 CERRADA con fórmula física y Criterios de v5.11(7), aportados por usuario y referencia
única candidata autorizada el 2026-10-22. No se promueve a estable. Ya no se solicita
otra ronda Q1: Fecha de Movimiento >= Inicio control, apertura sin doble descuento
histórico ni reconstrucción. No inspección independiente del Excel por Codex.
Q2–Q4 validadas y exceso, fecha futura y ciclo de vida consolidados explícitamente
por auditoría final del usuario 2026-10-22 como decisiones app, no reglas del Excel.
Pendiente comprobar ajustes finales y autorización expresa de integración/desarrollo,
sin reabrir Q1–Q4 ni iniciar nuevas rondas sobre decisiones resueltas.
PR #24 sigue DRAFT; no marcar APPROVED, integrar ni iniciar dev 06. Ninguna prueba
funcional/visual E1.6 se declara ejecutada. Validaciones documentales/CI por SHA en PR.

## Evidencia histórica — 2026-10-21
Álex informó >= Inicio control, desglose exacto, protección histórica y permiso Exterior.
[Brainstorming](06-deuda-brainstorming.md) conserva el registro original. La consolidación
2026-10-22 sustituye sus PENDING de Q2–Q4; cierre posterior de Q1 por evidencia de
v5.11(7) y autorización de referencia candidata queda registrado en brainstorming.
El fallo histórico R6 y el IOERR_SHORT_READ del prototipo no se declaran resueltos por
extensión; #26/#27/#31 ya integradas. No nuevas investigaciones salvo bloqueo demostrado.
