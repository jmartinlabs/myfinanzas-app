# 03 — E1.3 Ciclos financiados: Brainstorming
Status: DRAFT — Q1–Q3 resueltas y wireframes aceptados como base; aprobación final pendiente.
Roadmap/context: [E1.3](roadmap.md#e13--periodos-financiados-mínimos-para-imputar-hechos),
[R3](functional-reference-v5.11.md#r3--planificación-ciclos-y-nómina-secciones-56),
[proyecto](project.md), [especificación provisional](03-ciclos-financiados-specification.md).
Next action: revisión final de PR #12 y autorización expresa antes de dev 03; sin nueva ronda.

## Autorización y procedencia — 2026-10-21
Usuario autoriza spec 03 desde main; E1.1/E1.2 integradas, base a98d8f7.
Se reutiliza .agents/skills/spec/SKILL.md. Excepción expresa: publicar documentos aún
no aprobados en PR Draft para revisión, sin esperar aprobación para commit/push.
No altera la Skill ni autoriza dev 03, SQL ejecutado, migraciones, merge o despliegue.
El borrador provisional explicita pendientes; no cierra decisiones de esta ronda.
Excel estable MyFinanzas2026_v5.11(5).xlsx continúa como maestro, sin importación ni
inspección independiente del libro por Codex. Fuentes: roadmap, R3, DT3 y precisiones
sanitizadas del usuario; no afirmar lectura de Criterios físico no proporcionado.
No se incluyen datos personales ni credenciales en esta documentación.

## Confirmado: no reabrir
- Maestro único tblCiclos, sin derivarlo de Nómina ni mantener otro catálogo.
- Solo Inicio ciclo y Saldo inicial comida (€) son entradas financieras manuales.
  Identidad/revisión/metadatos técnicos los asignará servidor; no campos manuales nuevos.
- R3: Mes financiado = primer día del mes siguiente al Inicio. Incluye diciembre→enero.
  El «puede corresponder al mes siguiente» del último mensaje no aporta excepción
  a esa fórmula explícita: no introducir mes manual o coincidencia por defecto.
- Fin ciclo = siguiente Inicio cronológico menos un día civil; sin siguiente, Fin vacío
  y estado temporal Abierto. No equivale a cierre financiero.
- Corte de abierto depende de Fecha de referencia financiera, no del reloj.
- Fecha de referencia = máximo de fechas de Movimientos, Revisión Comida y operaciones
  de inversión disponibles. No confundir con metadatos UTC o fecha de Nómina.
- Puede crearse ciclo antes del cobro; no crea ingreso, Nómina ni hechos ficticios.
- Roadmap limita E1.3 a crear/consultar periodos mínimos; E2.1 amplía operación y
  apertura revisable. No reabrir/cerrar, planificar ni conciliar comida en esta entrega.
- Reutilizar identidad MyFinanzas, seguridad E1.1 y continuidad SQLite E1.2.

## Round 1 — 2026-10-21
Las casillas marcadas son recomendaciones pendientes, no respuestas del usuario.

### Q1 — Referencia vacía/anterior y ciclo de cabecera
Sin fuentes instaladas o sin fechas, ¿confirmamos referencia/corte «No disponible»,
sin reloj ni fecha manual de sustitución? Si hay referencia pero precede al último
Inicio, ¿la cabecera «actual» identifica el intervalo que contiene la referencia o
el último ciclo creado? Si precede al primer Inicio, ¿queda sin ciclo actual?
- [x] No disponible sin referencia; actual = intervalo del maestro que contiene la
  referencia cuando existe. Si está antes del primer Inicio, sin actual. Último
  ciclo sin siguiente sigue Abierto, pero no se presenta como actual si empieza
  después de referencia. Corte abierto anterior a Inicio: «Sin corte aplicable»;
  no fabricar duración negativa ni recortar/elevar referencia silenciosamente.
  Racional: separar último periodo creado de contexto financiero acreditado.
- [ ] Cabecera muestra siempre último ciclo Abierto, etiquetado como tal (no como
  actual acreditado); mantener contexto de referencia aparte. Más simple, cambia
  qué expresa la cabecera cuando se prepara un ciclo por adelantado.
Confirmed answer: PENDING; source/date: PENDING.
No decide referencia alternativa ni regla de cierre. Corte/duración de ciclos con Fin
no se amplían a métricas ejecutadas en E1.3; Fin sí conserva su fórmula confirmada.

### Q2 — Límites de las altas cronológicas
¿Confirmamos Inicio obligatorio/no duplicado, y que crear normalmente añade un Inicio
posterior al último? ¿Existe una restricción real de un ciclo por mes financiado?
- [x] Alta ordinaria añade posterior; inserciones intermedias/anteriores y correcciones
  quedan para operación con revisión de impacto de E2.1. No imponer unicidad por mes
  financiado sin evidencia: dos Inicios distintos pueden compartir mes derivado si
  Criterios no lo prohíbe. No vetar fecha futura por el reloj. Racional: alta sencilla
  sin reordenar periodos históricos inadvertidamente; límite append es propuesta app.
- [ ] Permitir inserción anterior/intermedia en E1.3 con vista de intervalos afectados
  y confirmación; amplía gestión/rectificación frente al mínimo crear/consultar.
Confirmed answer: PENDING; source/date: PENDING.
Un Inicio duplicado no permite ordenar inequívocamente siguiente Inicio. No se deduce
límite de duración, mes o distancia entre Inicios desde una muestra de datos.

### Q3 — Saldo inicial comida: obligatoriedad y signo
¿Se exige importe al crear o se permite «Sin informar»? ¿Admite importe negativo?
- [x] Exigir importe manual explícito al alta, admitiendo cero elegido, sin copiar
  cierre anterior ni default cero. Admitir negativos si reflejan la posición real,
  pendiente de tu confirmación financiera. Racional: apertura confirmada, sin inventar
  restricciones de signo ni aparentar que ausencia significa cero.
- [ ] Permitir importe ausente y completarlo en operación posterior E2.1; distinguir
  ausencia/cero/negativo, sin inventar importe ni autorrellenar. Alta menos restrictiva.
Confirmed answer: PENDING; source/date: PENDING.
La referencia acredita entrada manual/confirmación; no demuestra por sí sola que el
Excel exija importe al crear ni que prohíba saldo negativo. EUR exacto en céntimos
reutiliza solución técnica existente, sin aplicar reglas económicas de Saldos por extensión.

## Coverage
Requisitos/jerarquía temporal, lectura/escritura, vacíos, validaciones, API propuesta,
seguridad/continuidad y pruebas: borrador enlazado. No nueva ronda técnica para IDs,
formatos, componentes o layout si bastan patrones ya aprobados.

## Wireframes
En [especificación provisional](03-ciclos-financiados-specification.md#screens-and-interfaces):
listado, ficha, alta y cabecera 390/1440. Feedback visual pendiente; no evidencia de UI
implementada ni solicitud de reaprobar la identidad común.

## Append-only clarifications
Añadir respuestas Q1–Q3 y su procedencia; no reescribir preguntas ni recomendaciones
como si fueran aprobaciones. Después actualizar los mismos documentos/PR Draft;
esperar aprobación de especificación y autorización de dev 03.


## Respuestas Q1–Q3 y aceptación visual — 2026-10-21
Fuente: mensaje explícito del usuario tras contraste de Álex con el Excel físico
estable MyFinanzas2026_v5.11(5).xlsx y Criterios. Evidencia sanitizada de su revisión;
Codex no incorpora ni inspecciona independientemente el libro. Las preguntas y
PENDING anteriores se conservan como historia; este registro contiene las respuestas
vigentes. No convierte la PR en aprobada ni autoriza dev 03/merge.

### Q1 — Primera opción confirmada
Sin Fecha de referencia financiera: No disponible. Con referencia, actual es el
intervalo que la contiene; anterior al primer Inicio implica sin ciclo actual.
Crear anticipadamente no convierte el último ciclo en actual. Último sin siguiente
puede mostrarse Abierto, distinto de actual y de cierre financiero.
Sin referencia válida de abierto no se inventa Fecha corte; referencia anterior a
Inicio indica todavía sin corte aplicable. Fin derivado se conserva en los ciclos
que tienen siguiente Inicio aunque no existan Movimientos.

### Q2 — Confirmada con corrección material: mes financiado único
Control ciclo comprueba Inicio obligatorio, saldo inicial comida obligatorio,
Inicio no duplicado, Ciclo financiado no duplicado, corte no anterior a Inicio y Fin
no anterior a Inicio. Evidencia concreta:
`COUNTIF(tblCiclos[Ciclo financiado],[@[Ciclo financiado]])>1`
produce `ERROR · Ciclo duplicado`.
Por tanto, dos Inicios distintos que deriven el mismo mes financiado se rechazan.
Esta evidencia sustituye expresamente la propuesta anterior de no imponer unicidad
mensual: ya está demostrada, no es una restricción nueva de app.
E1.3: altas ordinarias posteriores al último Inicio; intermedias/rectificaciones en
E2.1 con impacto revisado. Este límite operativo es contrato de app confirmado;
no se atribuye al Control ciclo como otra fórmula demostrada. Sin distancias mínimas
arbitrarias ni bloqueo de fechas futuras por reloj.

### Q3 — Confirmada: importe explícito, cero y negativos
Saldo inicial comida obligatorio al alta; sin default cero ni copia de cierre previo.
Cero explícito válido. Negativo admitido si refleja posición bancaria real. El Control
ciclo y validación de celda revisados no prohíben signo negativo. Ausencia no es cero.
La obligatoriedad está ahora respaldada por Control ciclo, no solo decisión de app.

### Wireframes aceptados como base
Usuario acepta listado/ficha/alta/cabecera propuestos. Se precisan sus etiquetas y
validaciones conforme a respuestas, sin rediseñar identidad. No equivale a pantallas
implementadas, pruebas visuales ni accesibilidad certificada.

### Coherencia de controles y siguiente acción
Corte no anterior a Inicio se aplica a un corte existente/aplicable. Según Q1, una
referencia anterior a Inicio no se publica como corte válido ni se eleva a Inicio;
se indica Sin corte aplicable. Esto conserva el control y la creación anticipada
confirmada, sin introducir bloqueo financiero nuevo ni excepción de cierre.
Los 24 IDs de aceptación se mantienen: 21 de alcance E1.3 y 3 contratos futuros,
todos definidos; las tres filas Q pasan a alcance I tras sus respuestas, no a PASS.
Esperar cierre/aprobación final de PR #12 y autorización dev 03. Sin más ronda salvo
contradicción financiera material; detalles técnicos ordinarios en desarrollo.
