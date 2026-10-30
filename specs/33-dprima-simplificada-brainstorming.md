# 33 — D′ simplificada: Brainstorming

Status: APPROVED — revisión2 y wireframes aprobados por usuario, 2026-10-31.
Historia de rondas conservada debajo; no autoriza desarrollo, migración ni merge.
Task ID: DPRIMA-SPEC-01. Antecedente de contraste: DPRIMA-ARQ-01.
Registro: 2026-10-31. Autorización: usuario «Autorizo», respuesta inmediata a la única
solicitud de redactar D′. No autoriza implementación, migración, merge ni despliegue.
Roadmap/context: [roadmap](roadmap.md), [contexto](project.md),
[specification](33-dprima-simplificada-specification.md).
Next action: registrar/publicar entrega documental verificada; desarrollo requiere
autorización separada y dependencias satisfechas.

## Round 1 — propuesta funcional y contraste

El usuario aporta «MyFinanzas · D′ simplificada»: maestro único Partidas, jerarquía
opcional sin tipos nuevos; Plan Mensual por raíz y Gastos Previstos por hijas;
financiación sugerida, histórico por cierre y conservación de hechos reales.
El encargo inicial era solo lectura; la autorización posterior permite redactar.
Su descripción se conserva como entrada de diseño, no como arquitectura aprobada.

Contraste independiente y asesor:
[PR134](https://github.com/jmartinlabs/myfinanzas-app/pull/134) es diagnóstico, no spec
aprobada; base main 454d21a. Relay D′ r-7n5b89ru:
[0002](https://github.com/jmartinlabs/myfinanzas-app/blob/5292b9865bfe38c3a29c59cd90d859e1736fc566/relay.md)
y [0004](https://github.com/jmartinlabs/myfinanzas-app/blob/1118c4958f76c85e7fc2a29fddb182db675de525/relay.md).
Ambos contrastes: VIABLE CON CAMBIOS. Álex no aprueba ni autoriza desarrollo.
v5.10 inspeccionada por Álex es evidencia histórica; no equivale a la base física
vigente, que no se ha contrastado para D′. Sin cifras privadas ni Excel en Git.

## Round 2 — tres criterios para la propuesta

Question C1: ¿cada planificación financiadora activa tendrá un Saldo exclusivo?
- [x] Recomendación: saldo efectivo propio, no descontar dinero ajeno a su propósito.
- [ ] Compartir dinero entre planes con un mecanismo de atribución por especificar.
Confirmed answer: usuario «Si» a esa pregunta; confirmado para propuesta.
No es aprobación protegida de spec/migración; autorización completa sigue pendiente.

Question C2: ¿mantener destino fijo durante planificación, con cambio solo mediante
traspaso real acreditado?
- [x] Recomendación: destino estable; excepción explícita con continuidad acreditada.
- [ ] Cambio libre del selector sin acreditar fondos anteriores (no recomendable).
Confirmed answer: usuario «Si» en la conversación, registrado el 2026-10-31.

Question C3: ¿rango de etiquetas futuras de mes financiado, sin Inicio/Fin ficticios,
reparto incluyendo ciclo que se abre?
- [x] Recomendación: rango inclusivo previsto, enlace al ciclo real al abrirlo.
- [ ] Exigir todos los ciclos reales creados antes de planificar.
Confirmed answer: usuario «Si», registrado el 2026-10-31.
Las etiquetas son planificación, no otro maestro de fechas financieras.

## Round 3 — alcance y campos, 2026-10-31

Question C4: ¿Gastos Previstos sustituye al Plan Anual o convive?
Confirmed answer textual: «Sustituye al Plan Anual, conservando su histórico y
revisando el traslado de sus campos». No transformar filas anuales automáticamente.

Question C5: ¿qué significa Gasto ejecutado para el cálculo de financiación D′?
Confirmed answer textual: «Gasto neto: restar devoluciones acreditadas de compras de
esa planificación; mostrar bruto y devoluciones separados».
No importar por analogía otras reglas de COMIDA-UNICO-01 ni cambiar esa spec.

Question C6: ¿conservar Esencial previsto y Esencial mensual independientes?
Confirmed answer textual: «Conservar ambos con esos significados, pendiente de aprobar
el conjunto de la spec». Esencial por línea prevista; mensual como importe manual,
sin sincronización ni divisor 12 automáticos.
Base/Del mes mensuales se conservan como datos del plan, no del catálogo.

## Coverage

Funcionalidad/financiación, fuentes y datos, jerarquía, conservación de anual/Deuda,
historical snapshots, contratos API, cobertura, errores, migración no ejecutada y
AC se documentan en la specification. No se modifica código ni roadmap vigente.
La spec es transversal nueva, sin inventar una épica ya aprobada: propone enmiendas
a SPEC02/08/09/10 y dependencias de cierre SPEC26/27, sujetas a aprobación conjunta
de su alcance. SPEC16/PR133 permanecen fuera de esta rama.

## Wireframes

ASCII 1440 y 390 en la specification: Partidas, Mensual, Gastos Previstos y revisión
de apertura/cálculo. Feedback y aprobación visual PENDIENTES; no capturas de app.

## Append-only clarifications

Pendientes declarados en specification: mapping físico vigente, cardinalidad de
atribución si cuentas de aportación no son inequívocas, reglas de clasificación de
raíces con hijos, netos/devoluciones no atribuibles y cierre/corrección tardía.
Son propuestas o bloqueos explícitos, no respuestas inventadas. La aprobación completa
del candidato y una autorización posterior de desarrollo son gates separados.


## Revisión documental inicial — 2026-10-31

QA independiente DPRIMA-SPEC-01: apto como DRAFT, sin aprobación funcional/visual.
Corregidas ambigüedad T (suma cada línea, no deduplica previsiones por hija) y omisión
de Fecha ejecutada/histórica del legado anual; añadido ASCII móvil390 específico.
Validación de estructura/enlaces en export limpio main+SPEC33 PASS; verificación
canónica por commit/CI y pruebas de aplicación UNRUN, sin candidato aprobado.
Cuota consultada antes de QA:71% ventana/75% semanal restante. Solicitado agente
con contexto nuevo gpt-6.1-sol/low explícitos; selección efectiva no expuesta en retorno,
no se afirma verificada. Sin escrituras delegadas ni cambios fuera de estos dos archivos.

## Round 4 — imputación en la raíz agrupada (registro histórico; ver retorno0006)

Question: ¿las raíces que tienen hijas sirven solo para agrupar/financiar, registrando
sus gastos en las hijas, mientras una raíz simple sí admite gastos propios?
- [x] Propuesta recomendada: agrupador con hijas sin gastos directos nuevos; raíz simple
  puede ser de Gasto real. Histórico se conserva, no se reclasifica automáticamente.
- [ ] Alternativa: permitir gastos directos en raíz con hijas y definir su inclusión
  explícita en previsto/ejecutado/financiación para que no queden fuera ni se dupliquen.
Confirmed answer: PENDIENTE. No aplicar restricción a datos ni cerrar spec sin resolver.
Siguiente acción al escribir esta ronda: confirmar criterio; estado posterior en
retorno0006. Wireframes siguen pendientes de aprobación integral.

## Retorno asesor0006 y consolidación revisión2 — 2026-10-31

Álex transmite usuario «confirmo gastos a los hijos» en relay0006, commit4435b676d43b3db902df55f8194850c9ebd0bf3d.
Se incorpora como preferencia comunicada, no aprobación protegida del usuario en este
chat. Padre con hijas sin Gastos nuevos; histórico conservado, sin hija ficticia.
La ronda4 previa se conserva como historia. Confirmación integral humana pendiente.
Usuario pide estado («Ahora?»); se consolida borrador, no autoriza código ni nuevas
reglas financieras. El cuadro de cálculo propone corte previo al Inicio, pagos externos,
neto/tardíos, cobertura, saldo firmado, céntimos y finalización verificable, con AC21–24.
Todas son propuestas explícitas para revisar/aprobar o corregir; no respuestas inventadas.
Proveedor neto/cierre, mapping físico y activación separados. Sin commit/PR ni cambios
fuera de estos dos documentos y la rama de especificación.

## Revisión de consolidación revisión2 — 2026-10-31

QA independiente: apta DRAFT, sin falsas aprobaciones. Se explicita como propuesta
el límite inferior G en Inicio real del primer ciclo enlazado, sin año/mes ficticio;
compras previas incluidas en previsiones requieren revisar cobertura, no crédito
inventado. Ronda4 señalada histórica. Validación documental repetida tras estos
cambios; aplicación/canónica por SHA/CI UNRUN. Se solicita contraste financiero al
asesor por mismo relay autorizado antes de cerrar aprobación integral.

## Contraste financiero0008 y candidato de aprobación integral — 2026-10-31

Álex0008 (867cd56f7fd58ba64da33469bbf87ec2afc753df) considera coherentes las reglas
propuestas 1–7 con precisiones: corte previo reconstruible sin exigir cierre/foto
financiera anterior; G empieza0 en primer ciclo y no incorpora compras previas.
Ambas precisiones incorporadas; no garantía de suma exacta de cuotas manuales.
El asesor no inspeccionó los archivos locales ni valida Excel vigente/migración.
Se solicita aprobación humana integral SPEC33 revisión2 y wireframes, incluyendo
cuadro de reglas. No se reabren respuestas previas ni se presentan nuevas rondas.
Estado: DRAFT pendiente de aprobación, sin commit/PR ni implementación.

## Aprobación humana integral — 2026-10-31

Mensaje literal: «Apruebo SPEC33 D′ revisión 2 y sus wireframes»» (incluye comilla final
adicional). Responde a la solicitud única e inequívoca de aprobación integral de
SPEC33 revisión2 con wireframes y cuadro explícito de reglas.
Specification aprobada SHA-256 cd7a4baea00f05fdd3813ff259621c7e9ec061df127e51db446853994e30ec49;
brainstorming candidato SHA-256 4c973f5de8cc70fe41221c9d44a9d2ebb3d856758e24cffb90854b828530aefd.
Se aprueban reglas/alcance/wireframes del candidato; los estados propuestos/pendientes
anteriores se conservan como historia superada, no como preguntas todavía abiertas.
No autoriza DEV, datos reales, migración/activación, despliegue ni merge. Proveedores,
mapping y pruebas de aplicación siguen gates de ejecución posteriores. AC01–24 UNRUN.

## Enmienda E1 tras revisión Álex0010 — 2026-10-31

Álex0010 revisa PR135/67dc53e: APTO CON OBSERVACIONES documental, sin permiso merge/DEV.
Usuario responde «Añrot» (no se interpreta como aprobación). Tras aclaración única
sobre primera enmienda (T incompleto sin sugerida salvo exclusión manual explícita),
responde «Aprobados»: se registra aprobación E1 solo, sin extenderla a segunda enmienda.
E1 explícita en specification y AC25 UNRUN. Regla de fuente de aportación aún pendiente.
Correcciones menores: estados actuales coherentes con revisión2 aprobada, fuente
No aplica preservada históricamente sin conversión, ASCII390 Maestro/Mensual y saldo
al corte diferenciado de actual. No cambian las demás reglas financieras ni el alcance.
Las huellas originales de revisión2 no se presentan como hash de esta enmienda.
