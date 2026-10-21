# 06 — E1.6 Cuota y amortización de Deuda: Brainstorming
Status: DRAFT — propuesta NO APROBADA; ronda Q1–Q4 pendiente.
Roadmap/context: [E1.6/E4.4 y DT2/DT7](roadmap.md),
[R1/R2/R5 y P4–P7](functional-reference-v5.11.md),
[propuesta](06-deuda-specification.md).
Base: main `9336fdd301231191509b6371ffb05a54b33d61ed`. Fecha: 2026-10-21.
Next action: revisar Q1–Q4 con evidencia sanitizada y los wireframes; no dev 06.

## Autoridad y decisiones que no se reabren
El usuario autoriza exclusivamente spec 06 y publicación en PR documental Draft,
no aprobación, implementación, SQL, migración, merge ni despliegue. La publicación
anticipada solicitada permite revisar estos documentos sin esperar su aprobación;
no sustituye la pausa de la Skill ante preguntas pendientes para cerrar la especificación.
Excel estable v5.11 continúa maestro. No incorporado ni inspeccionado por Codex:
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

## Round 1 — 2026-10-21 — única ronda material
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
