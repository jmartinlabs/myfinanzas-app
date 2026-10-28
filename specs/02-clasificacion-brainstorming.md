# 02 — E1.2 Clasificación utilizable y conservación histórica: Brainstorming
Status: CERRADO — E1.2 implementada e integrada (PR #11); historial conservado; revisión documental 2026-10-28.
Roadmap/context: [E1.2](roadmap.md#e12--clasificación-utilizable-y-conservación-histórica),
[referencia v5.11](functional-reference-v5.11.md), [contexto](project.md).
**Estado vigente (2026-10-28):** las menciones `PENDING`, «sin merge» o «sin implementación»
de las rondas son históricas y están superadas por los registros posteriores. E1.2 cerró
en PR #11; los consumidores posteriores se rigen por sus specs. **F-SPEC02-01 abierto**
(transparencia de cobertura de impacto).
Next action: revisión documental de SPEC02; no iniciar SPEC03 ni modificar código.

## Alcance y autorización — 2026-10-21
Usuario autoriza `$spec 02`, comenzando por preguntas. Base main 2bc92e9;
ocho etapas iniciales cerradas, E1.1 integrada. Solo especificación documental;
sin código, SQL, migraciones, modificación del Excel, despliegue ni merge.
Excel v5.11 continúa como maestro; no se ha inspeccionado el libro en Codex.
Reutilizar Skill spec y diseño común; no reiniciar la inicialización.

## Confirmado antes de esta ronda
R1: IDs CATxxx/SUBxxx/PARxxx preservados y no reutilizables; nombres editables,
no claves. Partida determina Subcategoría/Categoría y opcionalmente Presupuesto
(0..1) y Deuda (0..1). Puede haber gasto sin Presupuesto. Sin catálogo de Conceptos.
P4: desactivación/reactivación conservando historia y relaciones; cambios económicos
históricos requieren revisión expresa con impacto o nueva Partida para uso futuro.
Sin versionado de cada edición. Roadmap: Presupuestos se gestionan en E2.2,
Deudas mínimas en E1.6; no adelantar esos módulos para rellenar un selector.
Identidad/patrones comunes aprobados; pantallas concretas E1.2 aún por revisar.

## Round 1 — 2026-10-21
Las casillas marcadas son recomendaciones, no respuestas confirmadas.

### Q1 — Jerarquía y atributos demostrados
¿Cada Subcategoría tiene exactamente una Categoría y cada Partida exactamente una
Subcategoría? ¿Qué atributos propios de estos tres catálogos están confirmados,
especialmente dónde residen Esencial, Base y Del mes y cuáles aplican a E1.2?
- [x] Cadena obligatoria única; guardar relaciones y derivar niveles superiores.
  Incluir únicamente atributos contrastados, con su entidad y opcionalidad;
  solicitar evidencia sanitizada de los restantes, sin copiar columnas del Excel.
- [ ] Permitir niveles sin padre o relaciones múltiples, solo si la referencia lo demuestra.
Confirmed answer: PENDING; source/date: PENDING.
La fuente demuestra la derivación pero no explicita toda cardinalidad/obligatoriedad
ni la titularidad de cada atributo de planificación. No inventar defaults ni restricciones.

### Q2 — Desactivación de una rama
¿Cómo desactivar Categoría/Subcategoría con descendientes activos?
- [x] Bloquear y mostrar dependencias; desactivar primero los descendientes de forma
  expresa. Reactivar el padre no reactiva hijos automáticamente. Evita cascadas ocultas.
- [ ] Permitir padre inactivo con hijos activos, pero excluir toda esa rama de nuevas
  selecciones; distinguir estado propio y elegibilidad heredada.
- [ ] Desactivar toda la rama en una acción confirmada; más cambios implícitos y
  necesidad de decidir qué hijos recuperar después.
Confirmed answer: PENDING; source/date: PENDING.
Conservación histórica y reactivación ya aprobadas; esta pregunta solo concreta propagación.

### Q3 — Correcciones económicas e historia
Para mover Partida/Subcategoría o cambiar un vínculo económico ya utilizado:
- [x] Separar cambio solo futuro (nueva Partida, y padres nuevos si procede) de
  rectificación histórica expresa: vista de impacto, motivo y confirmación; actualizar
  relaciones sin reescribir hechos ni crear versiones del catálogo. No alterar fotos
  inmutables; si afecta a cierres, bloquear y remitir al procedimiento futuro autorizado.
- [ ] No permitir rectificación histórica en E1.2; solo nueva clasificación futura,
  manteniendo la rectificación como contrato posterior explícito, sujeto a ajustar alcance.
Confirmed answer: PENDING; source/date: PENDING.
La primera opción sigue P4 y la vista de impacto del roadmap; no presupone motores,
Movimientos o cierres existentes. Fuentes futuras deben integrarse y probarse al llegar.

### Q4 — Renombrados y lectura histórica
Al corregir un nombre sin cambiar significado:
- [x] Mostrar nombre vigente e ID estable también en consultas históricas vivas;
  avisar de alcance en renombrados usados. Fotos cerradas conservan lo capturado.
  No guardar una versión de nombre por operación.
- [ ] Exigir conservación del nombre de la fecha de cada operación; requiere ampliar
  el contrato de captura histórica y justificar complejidad adicional.
Confirmed answer: PENDING; source/date: PENDING.
Nombre editable está confirmado; cómo se presenta en histórico no está demostrado.
Un cambio de significado no se tramita como simple renombrado: aplica Q3.

### Q5 — Presupuesto mientras E2.2 no existe
- [x] E1.2 permite Partidas sin Presupuesto y muestra vínculo no disponible hasta E2.2;
  define ahora contrato opcional y protección del cambio, sin maestro ficticio operativo,
  IDs libres sin validar ni ejecución presupuestaria. Al entregar E2.2 se habilita selector.
- [ ] Adelantar catálogo mínimo de Presupuestos; supone revisar alcance/dependencias,
  sin implementar importes, plan ni ejecución y con especificación adicional.
Confirmed answer: PENDING; source/date: PENDING.
La primera opción sigue el roadmap; no afirma conservación/importación de relaciones
reales todavía inexistentes. Vínculo Deuda se reserva análogamente a E1.6.

## Coverage
Ronda inicial: jerarquía/atributos, estados, integridad histórica, correcciones,
nombres y dependencia de Presupuestos. Tras respuestas: campos/validaciones concretas,
API, errores/concurrencia, pruebas y criterios numerados, sin asumir equivalencia Excel.

## Wireframes
Pendientes de siguiente ronda: listado/ficha/formulario bajo identidad aprobada,
tablas compactas escritorio y tarjetas móvil, con navegación de la jerarquía.
No se solicita aprobar de nuevo paleta, arquitectura ni patrones comunes.

## Append-only clarifications
Añadir respuestas y rondas posteriores sin reescribir las preguntas originales.


## Respuestas confirmadas a ronda 1 — 2026-10-21
Fuente: mensaje explícito del usuario, tras contraste de Álex con Excel v5.11 y
Criterios. Evidencia sanitizada aportada por el usuario; no inspección independiente
por Codex. Las preguntas originales/PENDING anteriores son registro histórico;
las respuestas vigentes se registran aquí sin reescribir esa ronda.

### Q1 — Confirmada con precisiones: reglas existentes contrastadas
- Cada Subcategoría pertenece a una única Categoría y cada Partida a una única
  Subcategoría; relaciones por ID estable.
- Categoría: nombre, Grupo, Cálculo anual, Cálculo mensual, Referencia obligatoria.
- Subcategoría: nombre, relación con Categoría; Control derivado.
- Partida: nombre, Subcategoría, Presupuesto opcional, Deuda opcional, Estado.
- Categoría y relaciones superiores de Partida se derivan, sin duplicar fuentes.
- Importe base, Importe esencial e Importe del mes pertenecen a Presupuesto Mensual.
  Esencial también existe en plan anual por Partida. No son atributos generales
  de estos maestros ni se trasladan a ellos.
- Dominios, obligatoriedad y fórmula de Control aún no demostrados en la referencia
  disponible: ronda 2. No inferir reglas desde los nombres de los campos.

### Q2 — Confirmada: extensión propia de aplicación, sin cascadas
Bloquear desactivación de Categoría/Subcategoría con descendientes activos y mostrar
cuáles deben desactivarse primero. Reactivar padre no reactiva hijos. Inactivos
consultables históricamente, excluidos de nuevas selecciones.
El Excel tiene Estado en Partidas, no en Categorías/Subcategorías: Estado en padres
es contrato aprobado de app, no propiedad demostrada del libro.

### Q3 — Confirmada: P4 y precisión de impacto indirecto
Cambio solo futuro: crear nueva Partida y desactivar anterior cuando corresponda.
Rectificación histórica real: acción específica, vista previa de movimientos,
periodos e indicadores afectados, motivo y confirmación expresa. No modificar
silenciosamente clasificación económica usada ni versionar catálogos de forma general.
Cambiar relaciones de Partida o sus padres puede reclasificar y recalcular historia
derivada aun sin actualizar filas de Movimientos: el aviso debe explicar ese efecto.
Fotos inmutables no se modifican; cambios que afecten cierres protegidos esperan
procedimiento autorizado. No presentar una comprobación de módulos inexistentes
como cobertura implementada: integración y pruebas al entregar cada fuente futura.

### Q4 — Confirmada: presentación e identidad
Renombrar sin cambiar significado mantiene ID. Consultas vivas usan nombre vigente.
ID disponible en fichas y donde ayude, sin sobrecargar todas las vistas. Fotos
históricas conservan los datos efectivamente capturados, sin guardar nombres por
operación ni introducir versionado general.

### Q5 — Confirmada: contratos futuros, sin adelantar maestros
Relación Partida → Presupuesto opcional; Partida sin Presupuesto válida. No catálogo,
selector operativo, registros ficticios ni relaciones provisionales en E1.2.
Presupuestos corresponde a E2.2. Deuda opcional conserva contrato sin adelantar motor
ni su catálogo mínimo de E1.6. No aceptar IDs libres como si validaran un maestro.

## Round 2 — 2026-10-21: solo cuestiones financieras materiales
Las recomendaciones marcadas son propuestas, no respuestas ni equivalencias Excel.

### Q6 — Grupo: dominio y obligatoriedad
¿Qué valores admite Grupo? ¿Es obligatorio o admite vacío? ¿Tiene efecto económico
propio o solo agrupa/presenta Categorías?
- [x] Conservar dominio, opcionalidad y efecto contrastados con Criterios, aportados
  como descripción/lista sanitizada; evita crear un clasificador económico nuevo.
- [ ] Convertirlo en texto libre de presentación; solo si se aprueba expresamente
  como diferencia de app y se demuestra que no elimina una regla económica.
Confirmed answer: PENDING; source/date: PENDING.

### Q7 — Cálculo anual/mensual y Control derivado
¿Qué valores admiten Cálculo anual y Cálculo mensual, admiten vacío y qué significa
cada uno? ¿De qué campos y mediante qué regla exacta deriva Control de Subcategoría?
Puede aportarse fórmula sanitizada o tabla de casos, sin registros personales.
- [x] Preservar ambos atributos independientes y derivar Control según regla
  demostrada; registrar el contrato para consumidores futuros sin construir motores.
- [ ] Aplazar escritura de esos atributos y mostrar No disponible hasta contrastar;
  deja incompleta la gestión y requiere declarar esa limitación de E1.2.
Confirmed answer: PENDING; source/date: PENDING.
No asumir que son booleanos, fórmulas ejecutables, equivalentes a Esencial o derivados
uno del otro; el nombre Control no demuestra equivalencia con Control de Saldos.

### Q8 — Referencia obligatoria: significado y alcance
¿Es Sí/No? ¿Admite ausencia? Cuando se exige Referencia, ¿afecta a todo Gasto de las
Partidas descendientes o hay excepciones por operación/tipo de Referencia?
- [x] Conservar indicador en Categoría y derivar exigencia por jerarquía según regla
  contrastada; nunca autogenerar Referencias ni convertir ausencia en false.
  Especificar validación en futuros registros y su efecto en correcciones usadas.
- [ ] Exigencia meramente informativa, sin bloqueo de registro; solo si Criterios
  lo demuestra o se aprueba expresamente como diferencia funcional.
Confirmed answer: PENDING; source/date: PENDING.
No proponer default de nuevas altas hasta conocer dominio y semántica. Pantallas de
Referencias y registro de Movimientos permanecen fuera de E1.2.

## Siguiente paso reanudable
**Histórico:** esta parada quedó superada por la aprobación de PR #10, el desarrollo de
E1.2 y la integración de PR #11. Se conserva para trazabilidad.
Esperar esta ronda sin inventar respuestas. Después proponer pantallas ASCII
(listado de jerarquía, ficha, formulario y rectificación con impacto), reutilizando
identidad/patrones aprobados. Completar especificación y AC tras resolver datos
materiales y obtener feedback visual; no implementar ni hacer merge.


## Respuestas confirmadas a ronda 2
Fuente: mensaje del usuario tras revisión física de hojas Categorias, Configuración,
Movimientos y Criterios de MyFinanzas2026_v5.11. Evidencia sanitizada de su revisión,
no inspección del libro por Codex. Sustituye pendientes Q6–Q8 del registro histórico.

### Q6 — Grupo
Excel: texto sin lista cerrada; todas las Categorías observadas informadas, sin
obligatoriedad expresa; no se encontraron fórmulas que lo consulten directamente.
Decisión app: descriptivo opcional, sugerencias desde valores existentes y nuevos
valores admitidos. Sin maestro adicional ni tratamiento económico derivado de Grupo.
No elevar «no encontrado» a prueba universal de ausencia de consumidores.

### Q7 — Cálculos y Control
Configuración define anual: Ingreso, Gasto, No aplica. Los dos primeros suman los
Movimientos del tipo correspondiente de la Categoría en resumen anual; No aplica
no obtiene cálculo anual desde Movimientos. No se encontró consumo directo actual
de Cálculo anual: dominio/significado confirmado no prueba motor implementado.
Mensual: Ingreso, Gasto, Gasto compartido neto, No aplica. Ingreso/Gasto suman su tipo
en ciclo financiado; Compartido consume neto de Gastos Compartidos con mínimo cero
según Configuración; No aplica no genera seguimiento mensual ejecutado.
Ambos atributos independientes: anual No aplica puede coexistir con otro mensual.
No calcular importes en E1.2. Opcionalidad histórica de estos dos campos no demostrada;
no inventar conversiones de vacío a No aplica ni defaults económicos.
Control Subcategoría comprueba en orden: ID informado; nombre informado; ID no
repetido; nombre no repetido; Categoría existente/única; ID Categoría derivado
correctamente y coincidente. Resultado OK o ERROR · motivo. App lo convierte en
validaciones de integridad, no dato maestro persistido ni control económico de Saldos.
No inferir reglas de equivalencia de mayúsculas/acentos o unicidad de otros nombres.

### Q8 — Referencia obligatoria
Excel: Sí/No, validación técnicamente admite vacío; registros observados informados.
Sí exige Referencia registrada; No opcional; vacío no activa obligación.
Propuesta expresa del usuario para app: elección Sí/No obligatoria en nuevas
Categorías; conservar posibles vacíos históricos sin reinterpretar. Se incorpora
al borrador para aprobación final, sin extrapolar default false de Saldos.
Herencia desde Categoría vía Partida en Gastos y Amortizaciones deuda. Cuando
obligatoria: Referencia existente, Tipo válido y coincidente con esperado según
tblTiposReferencia. Anticipo solo admite Transferencia; Compartido tiene reglas
específicas para Gastos/Transferencias. No generalizar ejemplos a matriz exhaustiva.
E1.2 solo contratos; no maestro de Referencias ni motor de Movimientos.
Mapping exacto de tipos esperados y excepciones se contrastará antes de implementar
consumidores; no inventar correspondencias por nombre de Categoría o Grupo.

## Propuesta de pantallas y cierre del brainstorming
No se detecta contradicción material que justifique otra ronda de preguntas.
[Especificación propuesta y wireframes](02-clasificacion-specification.md): listado,
fichas, formularios y rectificación con impacto. Pendiente feedback visual y aprobación
del documento completo; no equivalen a pantallas implementadas/verificadas.


## Publicación excepcional autorizada para revisión
El usuario solicita expresamente «haz el push» tras no poder descargar los archivos.
Autoriza publicar este borrador en rama y PR en borrador para revisión de Álex,
sustituyendo para esta publicación la secuencia del paso 6 de la Skill spec.
No supone aprobación de especificación/wireframes, implementación ni permiso de merge.
Se conservan Status DRAFT y Approval PENDING; próxima acción: revisión del contenido.


## Revisión de Álex sobre PR #10 / 9317940 — precisiones solicitadas
Fuente: mensaje del usuario. Valoración favorable y propuesta visual aceptada como
base; no aprobación definitiva de especificación ni permiso de desarrollo/merge.
- Unicidad: evidencia confirma comprobación de duplicados, pero no fórmula/rango
  ni comparador. Alcance de nombre global/por Categoría y comparación de mayúsculas,
  acentos/espacios permanecen decisión pendiente antes de implementar AC-10. No
  extrapolar de muestra ni imponer normalización/índice silenciosamente.
- Continuidad E1.1: especificación incorpora actualización SQLite transaccional
  desde versión 1, sin reinicializar/borrar, preservando Saldos y autenticación;
  AC-31 y plan futuro detallan comparación lógica, MFA, idempotencia, rollback,
  concurrencia, copia y restauración aislada. No se escribe ni ejecuta migración.
- Rectificación: en E1.2 solo dependencias verificables del catálogo; no motores
  simulados ni impacto financiero presentado como comprobado. Consumidores futuros
  integran consultas reales (AC-19), incluidos hechos/periodos/indicadores/cierres.
- Se mantienen 31 IDs: 27 criterios E1.2 y 4 contratos posteriores; no renumeración.
Siguiente acción: revisión de estas precisiones y resolución de reserva de unicidad
para cerrar validaciones. PR en borrador; documento DRAFT/Approval PENDING.


## Aprobación y reserva resuelta — 2026-10-21
Usuario aprueba especificación/diseños sobre 25cffc0, autoriza integrar PR #10 y
comenzar dev 02. CI push/PR verde antes de merge; PR #10 MERGED en 0c7a87e.
Reserva SUB resuelta por posterior comprobación física: COUNTIF sobre columna
completa tblSubcategorias[Subcategoría], sin distinguir mayúsculas, sin normalización
de tildes/espacios. App: alcance global, comparación sin mayúsculas conservando texto,
comodines * y ? literales; probar casos especiales, sin introducir otros cambios.
Se sustituye la reserva anterior; no hace falta nueva ronda ni reaprobar propuesta.
Implementación local/ficticia en feat/e1-2-clasificacion; revisión final/merge separados.
**Cierre vigente:** PR #11 integrada; E1.2 cerrada. Revisión documental 2026-10-28;
F-SPEC02-01 abierto; no SPEC03.
