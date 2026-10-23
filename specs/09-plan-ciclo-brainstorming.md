# 09 — E2.3 Plan del ciclo y ejecutado mensual: Brainstorming

Status: APPROVED — Q1–Q3 y specification09 revisión4 completa con wireframes aprobadas.
Autorización: el usuario pide continuar con la especificación de E2.3, 2026-10-23.
No autoriza desarrollo, SQL operativo, datos reales ni despliegue.
Siguiente acción: commit y PR documental; aprobación de merge y desarrollo separadas.

## Contexto y contratos reutilizados

Fuentes: [roadmap](roadmap.md#e23--plan-del-ciclo-editable-y-ejecutado-mensual),
[R3](functional-reference-v5.11.md#r3--planificación-ciclos-y-nómina-secciones-56),
[Presupuestos aprobados](08-presupuestos-specification.md) y su
[brainstorming](08-presupuestos-brainstorming.md), con las precisiones posteriores
de fuentes/destinos prevaleciendo sobre textos generales anteriores.

Dependencias integradas: núcleo E1; E2.2 PR #44; E2.1 PR #49 (squash 1cdbc7c).
Base de esta preparación: main 2412ac3, PR #53 integrada y CI 40026257796 SUCCESS.
Los registros anteriores que presentan dev07 bloqueado o PR #49 pendiente son históricos.
AC23 de dev07 ya no bloquea esa entrega; B3 es una incidencia separada no resuelta.
Dev32/PR #30 sigue pausado. No se reanuda investigación SQLite.

- Base, Esencial y Del mes pertenecen al plan mensual, no al maestro Presupuestos.
- A transferir = Importe del mes; ausencia no equivale a cero ni fuerza estado.
- Gasto real: Gastos por Partida/Presupuesto dentro del periodo de Ciclos.
- Aportación a saldo: Transferencias ordinarias al destino, excluyendo Referencias
  y entradas desde Exterior; gastar la provisión no ejecuta de nuevo el plan.
- No aplica: sin ejecutado comparable. No existe fuente Devolución anticipo.
- Para fuentes comparables: Pendiente = A transferir − Ejecutado;
  estados Pendiente/Completo/Excedido, sin estado si falta Importe del mes.
- Mantener la matriz aprobada de destinos E2.2 y su unicidad entre Aportaciones.
- Plan vivo editable sin versiones por edición; foto financiera final en E4.9.
- Maestro único de Ciclos y corte central, sin sustituir referencia por el reloj.
- No inventar planes históricos, cierres, fuentes futuras ni disponibilidad terminal.

## Ronda 1 — 2026-10-23

Las casillas marcadas indican propuestas; ninguna constituye respuesta del usuario.

### Q1 — Significado y relación de Base, Esencial y Del mes

La referencia distingue los tres importes, pero no concreta su inicialización,
dependencia, límites relativos ni si Esencial es importe o selección en esta UI.
Solicitar definición o fórmulas vigentes, sin trasladar reglas del plan anual.

- [x] Propuesta: conservar valores independientes por Presupuesto/ciclo, sin recalcular
  ni copiar entre campos automáticamente salvo regla expresamente confirmada.
- [ ] Alternativa: definir la derivación o selección vigente entre esos campos.

Respuesta confirmada: PENDING; fuente/fecha: PENDING.
Precisar además: negativos admitidos o rechazados, cero y ausencia en cada campo.

### Q2 — Preparación del siguiente ciclo (DT3)

- [x] Propuesta: crear el plan vacío cuando el usuario lo solicite, para un Ciclo
  existente; ofrecer copia explícita desde un plan elegido con revisión previa,
  sin sobrescribir valores existentes ni crear Ciclos automáticamente.
- [ ] Alternativa: solo entrada manual, sin copia en esta entrega.
- [ ] Alternativa: precarga automática con origen, campos y momento expresamente definidos.

Respuesta confirmada: PENDING; fuente/fecha: PENDING.
Si se elige copia, confirmar qué campos copia y qué Presupuestos son elegibles.

### Q3 — Histórico y catálogo del plan

- [x] Propuesta: permitir consultar y editar planes existentes de ciclos pasados
  aún no cerrados financieramente, con revisión/motivo/confirmación para cambios
  guardados; mantener visibles líneas históricas de Presupuestos inactivos y
  excluirlos de nuevas líneas. Ausencia de plan se muestra como «Sin plan».
- [ ] Alternativa: restringir edición a determinados ciclos y definir cuáles.

Respuesta confirmada: PENDING; fuente/fecha: PENDING.
No confundir un ciclo temporalmente terminado con un cierre financiero.
No reconstruir planes ausentes ni fijar importes pasados mediante esta propuesta.

## Cobertura y siguiente fase

Tras las respuestas: especificar lectura/escritura por Ciclo y Presupuesto,
motor único de ejecución, invalidación por rectificaciones de hechos/catálogos/ciclos,
concurrencia/idempotencia/auditoría, API protegida MFA/Origin/CSRF y precisión monetaria
vigentes; continuidad y backup/restore sin alterar apertura SQLite.
Revisar F-01/F-02 de E2.2 al instalar el consumidor, sin afirmar resueltos antes de probarlos.

Preparar wireframes de listado/edición del plan y detalle de ejecución, escritorio
y móvil, con carga/vacío/error/conflicto/borrador y ausencia diferenciada de cero.
Reutilizar tema claro, componentes y navegación aprobados. El esquema visual y los
AC se presentarán con el contrato completo; no hay aprobación visual implícita.

Anticipos E3.1 requiere E2.3; el backlog de registro coordinado de gastos sigue
conceptual y se revisará después de E3.1, sin incorporarlo a esta entrega.

## Estado al cerrar ronda 1

Preparación documental únicamente. Sin producto, migraciones, pruebas financieras,
commit ni publicación. Detenerse ante esta ronda pendiente según la Skill local spec.
No crear specification09 con respuestas supuestas. Conservar este archivo para reanudar.

## Respuestas confirmadas — 2026-10-23

Fuente: mensaje real del usuario «Spec09 — Decisiones funcionales de Álex para E2.3
(Plan del ciclo)». Comunica contraste con v5.11(7), Criterios, R3 y roadmap;
no se afirma inspección independiente del Excel por el agente. Esta sección resuelve
Q1–Q3 y sustituye el estado de parada de ronda1, conservado como historia.

### Q1 resuelta

Base = referencia estructural habitual; Esencial = coste mínimo considerado necesario;
Del mes = decisión presupuestaria concreta del ciclo. Tres importes manuales,
independientes por Presupuesto/ciclo, no atributos del maestro. Vacío y cero distintos;
negativos prohibidos. Sin Esencial ≤ Base ni Del mes ≤ Base, ni relleno silencioso.
A transferir = Del mes; sin Del mes no calcular Pendiente ni Estado. Ejecutado
deriva exclusivamente de R3, nunca editable ni copiado.

### Q2 resuelta

Nuevo ciclo con plan inicialmente vacío. Copia opcional explícita desde otro ciclo
seleccionado y con vista previa, por ID de Presupuesto. Solo Base/Esencial/Del mes;
Base y Esencial preseleccionados en UX, Del mes requiere selección expresa.
No sobrescribir importes informados (incluido cero), incorporar inactivos, copiar
derivados ni modificar origen. Conservar íntegramente líneas históricas inactivas.

### Q3 resuelta

Editar mientras no exista cierre financiero; Fin temporal no es cierre. En planes
pasados exigir preview del impacto, motivo y confirmación; auditoría, relaciones
históricas y contexto/concurrencia revalidados. No reescribir Movimientos, inventar
planes históricos ni generar snapshots completos por edición. Fotografías y bloqueos
financieros pertenecen a E4.9 y entregas relacionadas.

Autorización recibida: continuar preparando especificación y AC sin nuevas
confirmaciones sobre estas decisiones. No autoriza implementación, merge ni Excel.
Sin contradicciones materiales nuevas identificadas en esta revisión.

## Entrega documental para revisión

[Specification09](09-plan-ciclo-specification.md), revisión1, desarrolla los contratos,
API propuesta, UX y AC verificables. Decisiones anteriores confirmadas; documento
completo, contratos técnicos propuestos y wireframes aún DRAFT, sin aprobación inferida.

## Precisión de la revisión parcial — 2026-10-23

Fuente: mensaje real del usuario «He revisado la primera parte de spec09 y el enfoque
es correcto». Autoriza continuar documentación y wireframes, manteniendo el diseño;
no constituye aprobación completa, desarrollo ni merge.

- Inactivos: líneas históricas visibles, editables únicamente sin cierre financiero,
  con impacto y motivo cuando corresponda; prohibidas nuevas líneas para inactivos.
- Sin plan = ausencia de líneas; Sin planificar = ejecución real atribuible sin línea.
  No crear líneas ni objetivos automáticamente.
- R3: Gastos vigentes por Partidas vinculadas; Transferencias ordinarias vigentes al
  destino sin Referencia ni origen Exterior; No aplica muestra Ejecutado vacío, no cero.
- Sin periodo/corte verificable o ciclo futuro todavía no iniciado, no ejecución cero
  ficticia. Periodo verificable sin hechos elegibles permite cero en fuentes comparables.
- Reglas de Base, Esencial, Del mes y A transferir conservadas.

Specification09 revisión2 traslada las precisiones a reglas, UX y AC-12/17/24/35,
sin renumerar criterios ni introducir otra ronda financiera. Sin contradicción material
nueva identificada. No se implementan cierres para representar esta condición futura.

## Precisión de Sin planificar — 2026-10-23

Fuente: mensaje del usuario «La revisión documental 2 de spec09 está correctamente
encaminada». Conformidad parcial, no aprobación completa ni permiso de desarrollo/merge.
Sin planificar requiere ausencia de línea y ejecución real positiva, comparable y
verificable: Gasto real o Aportación a saldo, Ejecutado > 0. No aplica y Ejecutado
cero no generan aviso; no verificable mantiene su motivo sin convertirse en cero.
Mantener Sin plan, cero explícito y ausencia como conceptos distintos.

Revisión3 actualiza regla, wireframes y AC-35, y añade AC-36 negativo sin renumerar
los anteriores. Fórmulas de Pendiente/Estado conservadas y detalladas en su matriz.
Decisiones resueltas; sin nueva ronda de preguntas ni aprobación total inferida.

## Conformidad parcial R3 y continuación — 2026-10-23

Fuente: mensaje real del usuario «Spec09 — Revisión documental 3». Álex da por
conforme Funcionalidad y reglas confirmadas y Motor único R3; no exige cambios
adicionales en esos fragmentos. Conformidad parcial, no aprobación completa/wireframes.

Verificar expresamente línea existente con Del mes vacío y ejecución positiva
verificable: conservar Ejecutado y dejar A transferir/Pendiente/Estado sin calcular;
no Sin planificar. Incluir Del mes cero y No aplica. Revisión4 conserva el bloque
conforme y añade diez vectores documentales V1–V10, precisa AC-12/13/15 y la
representación API/UX de null y Estado, sin nueva decisión Q1–Q3 ni desarrollo.

## Aprobación documental completa — 2026-10-23

Fuente: mensaje real del usuario «Apruebo», inmediatamente después de la entrega
de specification09 revisión4 con documento completo y wireframes pendientes de
una única aprobación. Conforme approvals.md, esta respuesta identifica ese objeto.
Quedan aprobados contenido completo, contratos y wireframes de revisión4, incluidos
36 AC y diez casos documentales; no son pruebas de software ejecutadas.

Este registro sustituye los estados históricos DRAFT/conformidad parcial anteriores.
No autoriza desarrollo, merge, Excel ni despliegue. Preparar commit/PR documental
según política Git; detener antes del merge y de $dev 09.
