# 06 — E1.6 Cuota y amortización de Deuda: Brainstorming
Status: APPROVED AND INTEGRATED — especificación E1.6 cerrada por usuario, PR #24/b60def1.
Q1–Q4 validadas; exceso, fecha futura y ciclo de vida consolidados como decisiones app
en auditoría final 2026-10-22. Integración verificada; desarrollo NO autorizado.
Roadmap/context: [E1.6/E4.4 y DT2/DT7](roadmap.md),
[R1/R2/R5 y P4–P7](functional-reference-v5.11.md),
[propuesta](06-deuda-specification.md).
Base: main `9336fdd301231191509b6371ffb05a54b33d61ed`. Fecha: 2026-10-21.
Next action: revisar/integrar metodología y esperar autorización expresa de dev06; no spec07.
Actualización 2026-10-22: base main ad9442669468968d0ab82a9613522c7205b242c1 (SQLite v6).

## Autoridad y decisiones que no se reabren
El usuario autoriza exclusivamente spec 06 y publicación en PR documental Draft,
no aprobación, implementación, SQL, migración, merge ni despliegue. La publicación
anticipada solicitada permite revisar estos documentos sin esperar su aprobación;
no sustituye la pausa de la Skill ante preguntas pendientes para cerrar la especificación.
Referencia financiera única: MyFinanzas2026_v5.11(7).xlsx, candidata vigente NO estable
por confirmación expresa del usuario del 2026-10-22. Sustituye a (5). No incorporada ni inspeccionada por Codex:
se dispone de referencia funcional sanitizada y evidencias anteriores del usuario.
No se atribuye al Excel ninguna propuesta nueva de este documento.

| Confirmado | Evidencia |
| --- | --- |
| Deudas no son Saldos; ID Dxxx estable; relaciones por ID | R1/R2/R5 |
| Partida tiene 0..1 Deuda; superiores derivan de su jerarquía | R1 y E1.2 |
| Cuota ordinaria: Gasto íntegro; capital + intereses = importe; solo capital reduce principal | R2 y solicitud spec 06 |
| Extraordinaria: Amortización deuda, destino Exterior, Partida ligada a Deuda; capital = importe, intereses = 0; no Gasto ni ejecución presupuestaria | R2/E1.6 |
| Capital desde apertura y amortización real desde control; preservar precontrol sin reconstruir hechos ausentes | R5/P6, sin fórmula física completa disponible |
| Cuatro tipos vigentes; inversión en su registro propio | R2 |
| MFA, precisión EUR, revisiones/idempotencia, rectificación/anulación y no DELETE | E1.1/E1.4/E1.5 |
| Gasto respeta salida Exterior; Referencia según Categoría; fuentes de Ciclos únicas | E1.4/E1.5, sin extensión implícita a la nueva operación |
| E1.5 completada: 30 AC; AC-31–33 siguen contratos futuros | PR #18/#20; cierre 9336fdd |

## Round 1 — 2026-10-21 — registro histórico, sustituido por consolidación de 2026-10-22
Las recomendaciones son propuestas, no respuestas del usuario. Basta aportar reglas,
fórmulas o ejemplos ficticios sanitizados; no enviar el libro ni registros personales.

### Q1 — Apertura, frontera temporal y precontrol (R5/DT7)
¿Qué fórmula/columnas físicas determinan capital pendiente, qué fecha compara y con qué
operador (`>=` o `>` Inicio control)? ¿La apertura es anterior o posterior a las
operaciones del propio día de Inicio? ¿Qué tratamiento tienen las operaciones reales
anteriores al control y qué importes históricos se conservan como entradas distintas?
- [x] Recomendada: transcribir la regla física contrastada, separar apertura/precontrol
  y aplicar el corte SOLO al motor Deuda, sin duplicar capital previo. Permitir hechos
  bancarios precontrol reales si la referencia lo permite. No fijar aún el operador.
- [ ] Diseñar una nueva convención temporal para la app: requiere decisión expresa,
  equivalencia con apertura y pruebas; riesgo de descontar dos veces o excluir capital.
Confirmed answer: PENDING; source/date: referencia R5 incompleta, pregunta 2026-10-21.
No tomar el «sin filtro Fecha apertura» de Saldos como regla del capital de Deuda.

### Q2 — Desglose y límites del principal
Para Gasto con Partida ligada a Deuda, ¿son ambos componentes obligatorios y explícitos?
¿Se permiten capital cero e intereses cero? ¿Hay casos negativos? ¿Qué hace la regla
cuando el capital amortizado supera el pendiente, incluso tras rectificar operaciones
anteriores o cambiar el orden de fechas?
- [x] Recomendada app: ambos componentes explícitos y no negativos, cero expresamente
  permitido, suma exacta; ninguna cuota sin desglose ni reparto inferido por TIN/TAE.
  Para exceso sobre pendiente, contrastar primero: no imponer bloqueo ni truncar a cero.
- [ ] Admitir desglose incompleto: requeriría definir un estado económico no calculable,
  conciliación y su tratamiento; no interpretar ausencia como cero ni total como capital.
Confirmed answer: PENDING; source/date: igualdad demostrada R2, dominios no demostrados.
Importe total estrictamente positivo ya aprobado; no se reabre. Extraordinaria tiene
componentes derivados por definición (capital=total/intereses=0), no cálculo de intereses.

### Q3 — Maestro mínimo y cambios con uso histórico
¿Bastan Dxxx, nombre, Inicio control y capital apertura para el control E1.6, o algún
importe precontrol/tipo/otro campo físico interviene necesariamente en la fórmula?
Confirmar campos obligatorios/dominios necesarios y cómo se conserva el enlace
Partida→Deuda de operaciones utilizadas.
- [x] Recomendada app: mínimo anterior más SOLO entradas que Q1 demuestre necesarias;
  estado Activa inicial/desactivar/reactivar, sin borrado; nombre editable sin cambio
  económico. Bloquear edición ordinaria de apertura/Inicio y reasignación/desvinculación
  de Partida ya utilizada; nueva Partida para cambios futuros. Rectificación económica
  histórica solo por acción expresa con impacto verificable, nunca un PATCH silencioso.
- [ ] Permitir cambios históricos de apertura/enlace mediante flujo dedicado ya en
  E1.6: necesita definir autorización, impacto completo y equivalencia antes de aprobar.
Confirmed answer: PENDING; source/date: propuesta app para concretar P4, 2026-10-21.
TIN/TAE/cuota/condiciones completas, distinción hipotecaria e informes E4.4 no se
eliminan: quedan fuera del mínimo salvo que la fórmula contrastada los necesite.

### Q4 — Validaciones del nuevo tipo Amortización deuda
¿Confirma la regla física que su Saldo de origen debe permitir salida a Exterior?
¿Aprobamos para este tipo nuevo el bloqueo de fecha futura con día civil Europe/Madrid?
- [x] Recomendada: contrastar el permiso en Criterios y, si es la regla, aplicarlo sin
  excluir por Tipo/Control (Terminal/No controlado no vetados por analogía). Aprobar
  para la app el mismo límite de fecha futura que Ingreso/Gasto/Transferencia.
- [ ] Si el permiso no aplica físicamente, mantener la diferencia; para fechas,
  permitir futuro necesitaría distinguirlo de previsión, no atribuirle aprobación previa.
Confirmed answer: PENDING; source/date: permiso y extensión temporal no demostrados.
Destino S000, Partida con Deuda y restricciones de Referencia sí están confirmados.

## Coverage y datos
Propuesta completa de flujos, datos persistentes/derivados, API, seguridad, estados,
pruebas y 33 AC en specification. 30 actuales previstos (algunos condicionados a Q1–Q4),
3 contratos futuros; ninguno ejecutado ni aprobado. Reutiliza arquitectura sin dependencias
nuevas. No SQL ni importación. Incógnitas no se sustituyen por reglas preventivas nuevas.

## Wireframes — propuesta para feedback
Listado/ficha/alta-edición de Deudas y extensión del formulario/ficha/preview de
Movimientos a 1440/390 en specification. No son pantallas implementadas, capturas,
pruebas de accesibilidad ni aprobación visual. Se conserva la identidad aprobada,
no se diseña un dashboard de patrimonio ni cuadro de amortización.

## Append-only clarifications
Pendiente respuesta Q1–Q4 y revisión de wireframes/especificación completa por Álex.
Registrar las respuestas aquí sin reescribir esta ronda ni confundir recomendación
marcada con aprobación. No iniciar dev 06 por publicar la PR Draft.

## Evidencia recibida — revisión de Álex, pendiente de consolidación — 2026-10-21
El usuario comunica revisión de Álex: fórmula de capital con `>= Inicio control`,
desglose explícito y exacto, protección histórica y permiso Exterior para salidas a S000.
Se registra como evidencia atribuida, NO decisión aprobada ni inspección física por Codex.
Falta confirmar la base física vigente y aceptación expresa del usuario antes de
consolidar Q1–Q4. Esta evidencia no resuelve por extensión signos/cero/exceso de capital,
campos precontrol mínimos ni la extensión del límite de fecha futura al nuevo Tipo.
No se cambia Status, aceptación o clasificación de AC; PR #24 continúa Draft.
Investigación técnica R6 autorizada aparte, sin permiso para modificar código/pruebas.

## Investigación técnica aislada R6
[Diagnóstico reproducible y propuesta de PR independiente](investigations/05-r6-diagnostico.md).
No reproducido en local; carencia de diagnóstico del helper confirmada, causa raíz de CI
no demostrada. Ningún código o prueba modificados. Se espera autorización para una PR
de diagnóstico de R6; el fallo histórico no se oculta ni declara resuelto por una CI verde.


## Tabla vigente Q1–Q4 — actualizada tras auditoría final, 2026-10-22
Fuente: instrucción expresa del usuario «Álex — Retomar E1.6 · Deudas — PR #24».
No se vuelve a preguntar lo ya confirmado. La ronda original y observaciones de Álex
se conservan como historia; sus PENDING y recomendación de capital cero no son el
contrato actual. La tabla inferior refleja la evidencia y decisiones ya consolidadas;
la PR sigue DRAFT, sin autorización de integración o desarrollo.

| Cuestión | Decisión/evidencia vigente | Estado |
| --- | --- | --- |
| Q1 | Fórmula literal v5.11(7) y Criterios aportados: apertura − capital por mismo ID con Fecha >= Inicio control; propio día incluido, sin doble descuento precontrol | CERRADA y validada; referencia candidata, no estable |
| Q2 | Cuota Gasto íntegro; capital>0/intereses>=0/suma exacta, no TIN/TAE; rechazo atómico de estado con pendiente verificable negativo, cero exacto admitido | Validada; límite de exceso es decisión app |
| Q3 | Dxxx y vínculo único Partida→Deuda; mínimo Inicio control/apertura; activar/desactivar sin borrar historia, proteger entradas/enlaces utilizados | Validada; ciclo de vida/protecciones son decisiones app |
| Q4 | Amortización deuda, misma Partida, S000, permiso Exterior Sí; capital=importe/intereses=0/sin Gasto ni presupuesto; no posterior al hoy civil Europe/Madrid | Validada; límite futuro es decisión app |

### Reserva histórica Q1 — resuelta por evidencia v5.11(7)
El texto siguiente conserva lo solicitado antes de recibir la fórmula; NO es una
reserva vigente. La fila anterior decía «no está la fórmula literal ni el texto
Criterios en Codex»; queda sustituida por la tabla actual y el cierre documentado.
No se ha incorporado/inspeccionado el Excel. La referencia sanitizada R5 no contiene
la fórmula física completa ni prueba qué campos de apertura/precontrol intervienen.
Falta transcripción sanitizada de la fórmula vigente de capital pendiente (tabla y
columnas) y del criterio que define Inicio control/apertura: confirmar `>=`, fecha
comparada, tratamiento del día inicial y movimientos anteriores, y si los importes
precontrol ya están incluidos en la apertura o intervienen como entrada separada.
Confirmar asimismo el tratamiento físico de apertura ausente/cero y los campos mínimos
necesarios; no se deduce signo ni obligatoriedad económica de una muestra.
No pedir libro ni datos personales; basta texto de reglas/fórmula y, si hiciera falta,
ejemplo ficticio. Hasta recibirlo, no publicar una fórmula definitiva, inventar campos
precontrol, reconstruir operaciones ni aplicar el criterio de Saldos a Deudas.

### Propuestas históricas — consolidadas por la auditoría final inferior
Se conserva su redacción anterior como trazabilidad, no como decisiones pendientes.
- Exceso de principal (Q2): recomendar rechazo atómico del alta/rectificación aplicable
  cuyo estado candidato deje pendiente verificable negativo en alguna Deuda afectada;
  igualdad válida deja cero exacto. Al rectificar sustituir el efecto anterior y revisar
  consecuencias sobre hechos posteriores y ambas Deudas si cambian. Señalar operación,
  Deuda y diferencia; no truncar, clamp, compensar ni ocultar inconsistencias. No inventar
  horas ni precedencia económica por ID dentro del mismo día. No aplicar el límite a
  precontrol antes de resolver Q1. Regla nueva app, NO demostrada en Excel ni aprobada
  por extensión; condiciones exactas dependen del motor de Q1.
- Fecha futura extraordinaria (Q4): recomendar máximo hoy civil Europe/Madrid, validado
  cliente/servidor como los demás hechos ejecutados. Nueva decisión app que requiere
  aceptación de la especificación; no cambia Ciclos futuros ni referencia financiera.
- Ciclo de vida del mínimo (Q3): mantener propuesta UI Activa inicial, desactivar/reactivar,
  nombre editable sin cambiar identidad; no DELETE. Son comportamientos app, no campos
  físicos Excel. Apertura/Inicio con uso y enlace de Partida utilizado se bloquean en
  edición ordinaria, incluida asignación retroactiva a Partida usada sin desglose.
  Nueva Partida para cambios futuros; sin versionado general ni rectificador histórico
  completo de catálogos en E1.6. Datos económicos exactos de apertura esperan Q1.

### Continuidad técnica y revisión paralela
PR #31 integrada: base SQLite v6; upgrade futuro desde v6 genuina preservará identidad
DB/clave, MFA y todos los datos. La relación Deuda todavía no está implementada en
Partida: se añadirá una sola relación opcional, no una segunda selección por Movimiento.
Análisis funcional/técnico/QA en paralelo, sin ediciones concurrentes: coordinador
consolida estos archivos; 33 IDs conservados (30 actuales candidatos y 3 contratos).
No nueva investigación de infraestructura. La evidencia R6 del 2026-10-21 es histórica;
#26/#27 mejoran diagnóstico y #31 adelanta timeout, sin demostrar causa histórica de CI
ni resolver por extensión el IOERR_SHORT_READ del prototipo. Se conservan sus límites.


## Cierre de Q1 — v5.11(7), 2026-10-22 (registro anterior a auditoría final)
Usuario aporta fórmula literal Deudas!J20:J21/B15 y Criterios C30/C88/C109;
[transcripción sanitizada y roles de campos](functional-reference-v5.11.md).
Posteriormente confirma (7) como referencia financiera única/base candidata vigente,
sustituyendo a (5), SIN promoverla a estable. La reserva anterior de versión queda
resuelta. Evidencia física atribuida al usuario; no inspección independiente por Codex.

**Q1 CERRADA:** capital apertura menos capital amortizado del mismo ID Deuda con
Fecha de Movimientos >= Fecha inicio control. Incluye propio día, excluye anteriores;
no usar Fecha inicio deuda, Tipo o Control como filtros adicionales. Apertura e históricos
no se duplican: precontrol no se vuelve a descontar ni se reconstruye con hechos ficticios.
Exclusión de anulados procede del contrato app previo, no se atribuye al SUMIFS físico.
No se deducen restricciones de signo/obligatoriedad de apertura ni se normaliza ausencia
como cero. Maestro mínimo del cálculo: Dxxx, Inicio control, capital apertura, además de
identidad/ciclo de vida app; sin TIN/TAE ni campos históricos necesarios para este motor.

Q2–Q4 siguen consolidadas: capital cuota>0/intereses>=0/suma exacta; protección histórica;
extraordinaria S000/permiso Exterior/capital=importe/intereses=0/sin Gasto. Se mantienen
las propuestas app de exceso y fecha futura para aprobación conjunta, sin nueva ronda.
Propuesta de formulario: entradas de control explícitas para crear una Deuda calculable,
sin precargar apertura cero ni inventar ausencias históricas. No trasladar el capital>0
exigido a cuotas al dominio de apertura por analogía.
PR #24 sigue DRAFT: cierre de Q1 no equivale a aprobación de documento, wireframes,
dev06 o merge. 30 AC actuales candidatos y 3 contratos futuros; pruebas aún previstas.


## Auditoría final y decisiones app consolidadas — 2026-10-22
Fuente: mensaje del usuario «Álex — Auditoría final E1.6 · PR #24» tras revisión de
89788288f7a820efd2a6cc1411e6a95a8d11d174. Sin bloqueantes financieros/arquitectónicos;
Q1–Q4 validadas. Las recomendaciones anteriores de estos tres puntos quedan sustituidas:
- Exceso: rechazar atómicamente cualquier operación que deje capital pendiente
  verificable negativo en alguna Deuda afectada; cero exacto válido. Mantener revisión
  de estado candidato, sin doble resta al rectificar, truncamientos ni compensaciones.
- Fecha futura: extraordinaria no posterior al día civil actual Europe/Madrid;
  validar cliente/servidor. No modifica Ciclos futuros ni fecha de referencia financiera.
- Ciclo de vida: activar/desactivar sin borrar historia; proteger apertura e Inicio
  control utilizados y evitar asignaciones/reasignaciones/desvinculaciones históricas
  silenciosas. Nueva Partida solo para enlace futuro, no para alterar apertura usada.
Son decisiones de aplicación, NO fórmulas o validaciones físicas atribuidas al Excel.
Referencia v5.11(7) candidata, no estable. Se mantienen fórmula Q1 y 33 AC (30+3).
Auditoría favorable y decisiones consolidadas no equivalen a autorización de integrar
PR #24 ni de dev06: sigue DRAFT, pendiente comprobar el diff final y aprobación expresa.
No preguntas nuevas sobre Q1–Q4, implementación, SQL, datos reales, Excel o despliegue.


## Cierre de spec06 verificado — 2026-10-22
Usuario autoriza squash merge del SHA 3f04f3395723dcd0141606affe7b7aba170bc7e5 en
la petición «Integración E1.6 y adopción de Epic Orchestration v2.3.1». PR #24 MERGED,
main b60def124e95d692b6021eff9c1049652e21ded0 y CI posterior SUCCESS verificados.
Spec y wireframes aprobados documentalmente; 30 AC actuales/3 contratos futuros,
sin implementar ni ejecutar pruebas E1.6. Los anteriores Draft/merge pendiente son
históricos. Adopción de metodología en PR independiente; dev06/spec07 NO autorizados.
