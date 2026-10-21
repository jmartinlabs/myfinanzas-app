# 04 — E1.4 Movimientos: Brainstorming
Status: APPROVED — Q1–Q6, especificación completa y wireframes aprobados el 21/10/2026.
Base: main ff9d18d, PR #13 MERGED; E1.1/E1.2/E1.3 integradas.
Roadmap/context: [E1.4](roadmap.md#e14--registrar-ingresosgastos-y-consultar-posición-general),
[R2 y P1–P7](functional-reference-v5.11.md), [propuesta](04-movimientos-specification.md).
Next action: squash merge autorizado de PR #14 tras validaciones/CI; después esperar autorización de dev 04.

## Confirmado antes de la ronda
Fuente: solicitud del usuario para spec 04 y referencias aprobadas, 2026-10-21.
No se ha inspeccionado el Excel físico en Codex ni recibido datos reales.
- Ingreso/Gasto son hechos ejecutados. Ingreso S000→receptor, subtipo obligatorio
  Nómina/Bonus/Intereses/Promoción, sin Partida; Gasto origen→S000, Partida obligatoria
  y permiso de salida a Exterior. No tipos de inversión ni Transferencia/Amortización ahora.
- Partida determina Subcategoría/Categoría; Presupuesto no es requisito de Gasto.
  Concepto/Nota no clasifican, no catálogo de conceptos. IDs numéricos estables y únicos.
- Referencia obligatoria deriva de Categoría vía Partida; Sí exige maestro, Tipo válido
  y mapping esperado. No/vacío histórico no activan obligación. No maestro hasta E1.5:
  E1.4 no puede guardar casos obligatorios sin validar ni inventar Referencias.
- Motor Control Movimientos: apertura + entradas − salidas, sin filtro de Fecha apertura.
  Apertura opcional y ausencia distinta de cero; falta demostrar efecto aritmético de ausencia.
  Otros controles no adquieren una posición convencional por entregar este motor.
- Ciclos es maestro único; Fin temporal no es cierre financiero. No bloquear un ciclo
  solo por tener Fin. DT5 protege escrituras y cambios indirectos cuando existan cierres.
- Reutilizar stack, exactitud EUR, sesiones/MFA, diseño claro MyFinanzas, copias y
  continuidad SQLite. Solo documentación en spec/04-movimientos; sin SQL ni dev 04.

## Round 1 — 2026-10-21
Opciones marcadas son recomendaciones para la app, NO decisiones aprobadas ni evidencia Excel.
Agrupación única de lagunas que afectan a validaciones o integridad económica.

### Q1 — Saldos elegibles en cada dirección
¿Las validaciones v5.11 añaden restricciones de Tipo/Control al receptor de Ingreso
 o al origen de Gasto, además de no usar S000 como saldo ordinario y del permiso Exterior?
Confirmar por cada par demostrado: Efectivo/Movimientos, Efectivo/Terminal,
Efectivo/No controlado, Efectivo/Inversiones e Inversión/Inversiones.
- [x] No añadir filtros por Tipo/Control sin evidencia; mantener selecciones activas y
  permiso explícito de salida en Gasto, sin confundir motor disponible con operación
  válida. Confirmar la matriz antes de habilitar pares dudosos; Manual sigue no operativo.
- [ ] Si la fuente tiene restricciones adicionales, trasladar únicamente esas reglas
  y su dirección. No deducirlas de los ejemplos ni limitar todo a Movimientos por comodidad.
Confirmed answer: PENDING; source/date: PENDING.

### Q2 — Importe y posibles devoluciones
¿Ingreso/Gasto exigen importe estrictamente positivo, o el sistema admite cero o
negativos? Si existen devoluciones/abonos, indicar cómo están representados en v5.11.
- [x] Para nuevas altas, importe positivo y dirección definida por Tipo, SOLO si se
  confirma su equivalencia. Es sencillo, pero no autoriza reinterpretar una devolución
  negativa ni convertirla en Ingreso. Regla propuesta, no aprobada.
- [ ] Conservar cero/negativos si la fuente los admite, documentando su efecto exacto
  en entradas/salidas y sin aplicar valor absoluto ni cambio de tipo silencioso.
Confirmed answer: PENDING; source/date: PENDING.

### Q3 — Saldo actual con apertura ausente
¿Qué devuelve la fórmula física para Control Movimientos cuando falta Saldo apertura,
con y sin movimientos? M1 permite esa ausencia: no se vuelve obligatorio el campo.
- [x] Hasta demostrar otra semántica, presentar No calculable por apertura sin informar;
  no fabricar un cero. No es aún la regla definitiva del motor.
- [ ] Si la fórmula trata ausencia como neutro aritmético, reproducir ese resultado
  tras confirmación, manteniendo el dato original ausente y distinto de cero explícito.
Confirmed answer: PENDING; source/date: PENDING.

### Q4 — Fecha económica sin ciclo y fechas futuras
¿Qué hace v5.11 con un Movimiento sin Ciclos o anterior al primer Inicio? ¿Existe
restricción/alerta para Fecha económica posterior al día del reloj? No extender a
Movimientos automáticamente la autorización de Ciclos futuros.
- [x] Conservar el hecho sin ciclo como Sin ciclo asignable, sin imputarlo al mes natural
  ni crear Ciclos; el alta sigue validando la fecha civil. Para fechas futuras, aplicar
  únicamente la validación/alerta que se confirme; no introducir veto de reloj por inferencia.
- [ ] Exigir ciclo existente al guardar si se confirma esa política; error explicativo,
  nunca ciclo paralelo ni desplazamiento automático de fecha.
Confirmed answer: PENDING; source/date: PENDING.

### Q5 — Rectificación y registro que nunca debió existir
Para errores de captura, ¿aprobamos corrección del mismo ID con antes/después, motivo,
previsualización y confirmación? ¿Incluye Tipo, Fecha, importe, Saldo, Subtipo y Partida?
¿Cómo excluir un registro introducido por error que no representa ningún hecho real?
- [x] Corregir mismo ID mediante acción específica, conservando auditoría; anulación
  lógica explícita del registro inexistente, sin DELETE ni Movimiento compensatorio ficticio.
  Solo versión vigente no anulada contribuye a posición/referencia; alcance de campos
  y anulación requieren aprobación. No versionado general de catálogos ni libro paralelo.
- [ ] Corregir campos bajo el mismo procedimiento, pero reservar la anulación para otra
  entrega; un registro inválido no se elimina ni se compensa de forma inventada.
Mantener enlaces históricos inactivos si no cambian; nuevas selecciones solo activas.
Fin temporal no impide rectificar. Cierre protegido bloquea hasta procedimiento autorizado.
Confirmed answer: PENDING; source/date: PENDING.

### Q6 — Duplicados económicos
Además de ID único e idempotencia ya confirmados, ¿cuál es la regla física de duplicado
por contenido, si existe? Dos compras reales pueden coincidir en fecha/importe/Partida.
- [x] No declarar único el contenido; alerta de coincidencia (Fecha, Tipo, Saldo ordinario,
  importe y Subtipo/Partida), revisión explícita para continuar y dos IDs si son hechos
  distintos. Confirmar firma/criterio: propuesta app, no evidencia de Control Excel.
- [ ] Si existe regla física bloqueante distinta, aportar campos y comparador exactos;
  reproducirla sin normalizaciones ni falsos positivos inventados.
Confirmed answer: PENDING; source/date: PENDING.

## Coverage
Requisitos/datos/validaciones Q1–Q6, límites de Referencias/Deudas y controles DT5 en
[especificación provisional](04-movimientos-specification.md). Incluye pantallas,
API lógica, vacíos/errores y pruebas previstas, sin SQL ni endpoints implementados.

## Wireframes
Listado, ficha, alta y rectificación desktop/móvil en la propuesta enlazada.
Feedback visual: PENDING; conservar shell/componentes/paleta aprobados.

## Append-only clarifications
Las preguntas y sus PENDING originales se conservan como historia; el registro posterior
resuelve la ronda. Las recomendaciones marcadas nunca sustituyen la respuesta del usuario.


## Respuestas confirmadas Q1–Q6 — 2026-10-21
Fuente: usuario comunica revisión de Álex del Excel v5.11 y Criterios y confirma
expresamente Q1–Q6. No inspección independiente de Codex ni incorporación del libro.
Aprobación de decisiones no equivale a aprobación final de especificación/wireframes.

| ID | Respuesta vigente | Procedencia y límites |
| --- | --- | --- |
| Q1 | Origen/Destino según R2, Saldos activos y permiso de salida Exterior. No excluir No controlado ni añadir restricciones generales por Tipo/Control sin evidencia. | Reglas vigentes confirmadas por usuario tras contraste. No convertir disponibilidad de motor en elegibilidad transaccional. Manual sigue no operativo según alcance previo. |
| Q2 | Ingreso y Gasto estrictamente positivos; cero/negativos rechazados. Devolución bancaria mediante sus operaciones reales, nunca Ingreso artificial. | Regla financiera confirmada tras contraste; no extender negativos de aperturas a Movimientos ni diseñar ahora el flujo de devoluciones de futuras entregas. |
| Q3 | Solo para Control Movimientos, apertura ausente equivale a cero en el cálculo. Mantener null persistente distinto de cero explícito. | Semántica de motor confirmada; sustituye la recomendación provisional de No calculable en Q3. No extender a Manual/Terminal/No controlado/Inversiones. |
| Q4 | Permitir hechos anteriores al primer Inicio, con Sin ciclo asignable. Bloquear fechas futuras de Ingreso/Gasto según fecha civil actual de España, también en servidor. | Sin ciclo: comportamiento confirmado para app tras revisión. Bloqueo futuro y reloj civil español: contrato aprobado de app, no atribuido a una fórmula Excel. No limita Ciclos futuros ni sustituye Fecha de referencia financiera. |
| Q5 | Rectificar y anular con mismo ID, motivo, fecha y antes/después. Sin DELETE; anulados no computan. Cierres protegidos según contratos futuros. Devolución real no es anulación. | Procedimiento de app expresamente aprobado, preservando P4/P5/P6; no afirmar que el Excel ya tiene esta auditoría ni habilitar cierres/reactivación de anulados por extensión. |
| Q6 | Coincidencia de contenido genera advertencia revisable, no rechazo automático de hechos reales distintos. Idempotencia técnica separada. | Contrato de aplicación aprobado. La firma de advertencia de la propuesta se explicita en specification; no es fórmula Excel ni unicidad económica. |

Se mantiene bloqueo de Gasto con Referencia obligatoria no verificable hasta E1.5,
confirmado expresamente de nuevo. No nuevas preguntas salvo contradicción material.
Wireframes actualizados para anulación, advertencia y fechas; feedback/aprobación
finales pendientes. Solo documentación; sin dev 04, SQL, merge ni despliegue.


## Publicación para revisión final — 2026-10-21
El usuario autoriza expresamente commit/push de spec/04-movimientos y PR a main con
ambos documentos, Q1–Q6 y 33 criterios. Esta autorización permite publicar documentos
aún en revisión; no aprueba la especificación completa ni autoriza dev 04 o merge.


## Aprobación final — 21/10/2026
Fuente: autorización expresa del usuario tras revisión favorable de Álex de PR #14.
Especificación completa y wireframes APPROVED. Se solicita precisar AC-20 como
«Anular un movimiento registrado por error que no representa un hecho económico real».
No cambia el contrato de anulación ni los 33 criterios (29 actuales previstos/4 futuros).
Merge squash autorizado tras ambas CI verdes del commit definitivo; cerrar spec 04.
Los estados PENDING/revisión anteriores son historia, sustituidos por este registro.
No autorización de dev 04, código, SQL, datos reales ni despliegue. Excel v5.11 maestro.
