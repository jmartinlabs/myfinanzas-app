# 24 — E4.6 Resumen de inicio completo: Brainstorming

Status: **DRAFT — sin respuestas aprobadas.** Specification y testplan redactados como
**candidatos** en la misma rama; no aprobados. Este documento no implementa código, no crea
esquema, no modifica motores y **no autoriza DEV E4.6**.
Roadmap/context: [E4.6](roadmap.md#e46--resumen-de-inicio-completo),
[referencia R6](functional-reference-v5.11.md),
[SPEC12/E2.6](12-flujo-mensual-specification.md),
[SPEC21/E3.6](21-pendientes-conciliacion-specification.md),
[SPEC22/E4.2](22-ventas-posicion-broker-specification.md),
[SPEC23/E4.3](23-e43-valoracion-resultados-specification.md),
[SPEC17/E4.4](17-e44-deuda-completa-specification.md),
[SPEC27/E4.9](27-e49-cierre-financiero-specification.md).
Base: `main` `024b348` (2026-11-03), esquema SQLite **v23**.
Next action: el usuario debe resolver el Round 1; después se revisan specification y
testplan candidatos. El DEV queda bloqueado hasta aprobación, DT8 resuelto y dependencias
integradas.

**Leyenda de autoridad.** `CONFIRMADO` = regla ya aprobada en su documento propietario, no se
reabre. `PROPUESTA` = diseño del agente, sujeto a revisión. `PENDIENTE` = decisión del usuario
o dependencia no resuelta.

## Hallazgo de partida (verificado en `024b348`)

- No existe pantalla de inicio ni ruta `/inicio`: `/` redirige a `/saldos`
  ([main.tsx](../apps/web/src/main.tsx)).
- Existe un read model de flujo mensual con endpoint `GET /api/flujo-mensual/:id`
  ([flujo-mensual.ts](../apps/api/src/flujo-mensual.ts)), con cobertura por métrica,
  `observedOperating` y `liquidez` actual.
- E4.2 está integrado: `cashAt`, `positionsFor`/`positionsAtDate` y
  `GET /api/inversiones/efectivo?saldo=` ([investment-engine.ts](../apps/api/src/investment-engine.ts)).
- E4.4 está integrado: `GET /api/deudas`, `GET /api/deudas/{id}?corte=`, con
  `capitalPendiente` por deuda ([deuda-completa.ts](../apps/api/src/deuda-completa.ts)).
- E4.3 está **aprobada documentalmente pero sin DEV**: no hay endpoint ni almacén de
  valoración. Su contrato de lectura es conceptual.
- E3.6 está **aprobada documentalmente pero sin DEV**: no existe vista ni endpoint de
  pendientes.
- No existe almacén de configuración de usuario (meses objetivo, umbrales de zona). El
  objetivo persistido por Saldo es `Saldos.objetivo`, que no es el mínimo objetivo de R6.
- `annualEquivalent` de E2.4 ya publica el equivalente esencial mensual como racional exacto
  con estado `Completo`/`Incompleto`/`Sin plan anual`
  ([plan-anual.ts](../apps/api/src/plan-anual.ts)).

Consecuencia: E4.6 puede prepararse documentalmente, pero su DEV **no puede declarar completa**
la capacidad mientras E4.3 y E3.6 no estén integrados, y el objetivo R6 no puede ser
configurable sin una decisión de persistencia que este paquete prohíbe crear.

## Alcance confirmado del roadmap

| Elemento | Contenido | Fuente |
| --- | --- | --- |
| Capacidad | Ver liquidez, ciclo, Saldos/bolsas, ahorro, inversión, deuda no hipotecaria y pendientes | Roadmap E4.6 |
| Dependencias | E2.6, E3.6, E4.3, E4.4; DT8 para UX, métricas y denominadores no aplicables | Roadmap E4.6 |
| E4.6-AC1 | Cada cifra procede de un motor central identificado | Roadmap E4.6 |
| E4.6-AC2 | Liquidez y objetivos usan R6, sin automatizar transferencia por zona informativa | Roadmap E4.6 |
| E4.6-AC3 | Inversiones no incluyen efectivo dos veces; la cobertura de Presupuesto no implica reserva exclusiva | Roadmap E4.6 |
| Fuera | Panel con cálculos económicos alternativos o UI definitiva aprobada por el roadmap | Roadmap E4.6 |
| Lectura R6 | Liquidez solo de saldos marcados; mínimo objetivo = coste esencial mensual × meses objetivo; meses cubiertos = liquidez / coste esencial; umbrales configurables y zona informativa sin transferencia automática | Referencia funcional R6 |
| Lectura R6 | Distinguir márgenes medio, estructural, puntual y plan; consumir motores únicos | Referencia funcional R6 |

## Reglas ya confirmadas que E4.6 no reabre

| ID | Regla confirmada | Autoridad |
| --- | --- | --- |
| C-01 | `Liquidez actual = SUM(Saldo actual de Saldos activos con Liquidez = Sí)`; Finalidad, bolsa, Entidad y nombre no seleccionan la métrica | SPEC12 / R6 |
| C-02 | Un atributo ausente no se normaliza a `false`; una posición no verificable se excluye con cobertura, no se suma como 0 | SPEC12 / SPEC01 |
| C-03 | `mínimo objetivo = coste esencial mensual × meses objetivo`; `meses cubiertos = liquidez / coste esencial` | R6 / SPEC10 |
| C-04 | El coste esencial mensual global procede de la cadena E2.4 (plan anual → equivalente mensual → consumidores R6); un parcial no genera un objetivo definitivo | SPEC10 |
| C-05 | Umbrales configurables y zona **informativa**; ninguna transferencia se automatiza | R6 |
| C-06 | Inversión: la posición es `Saldo inversión + Instrumento`; el efectivo del bróker se calcula aparte y **no** se agrega con la posición | SPEC22 §4.2/§4.3 |
| C-07 | E4.3 puede publicar valor/resultado con cobertura; un valor manual deja resultado y rentabilidad `No disponible` | SPEC23 D-02/D-10/D-11 |
| C-08 | E4.4 publica deuda viva por deuda; una deuda no calculable no se sustituye por 0 | SPEC17 |
| C-09 | E3.6 no publica un total ni una suma entre tipos; los importes actuales no son pendientes al corte | SPEC21 §5.4 |
| C-10 | E4.6 no implementa cierres, fotos, motores ni esquemas; no reabre E2.6/E3.6/E4.2/E4.3/E4.4 | Paquete de trabajo y roadmap |
| C-11 | Toda ruta financiera exige sesión MFA completa; sin datos financieros en URL ni logs | Security guidelines |
| C-12 | 390/1440, teclado, foco, contraste y estados carga/vacío/error/parcial son obligatorios | T-UX / UI guidelines |

## Round 1 — 2026-11-03 — Composición, contexto y objetivos

Las preguntas siguientes están **sin responder**. Las opciones marcadas `[x]` son solo la
recomendación del agente; no son respuestas confirmadas.

### Q1 — Composición de la pantalla

Question: ¿cómo se compone el resumen de inicio?

- [x] **(a) Dashboard único de solo lectura con secciones compactas y drill-down al origen**
  (recomendada). Cada cifra declara motor, contexto y cobertura; el detalle se abre en la
  pantalla propietaria.
- [ ] (b) Resumen mínimo con enlaces y sin cifras; toda cifra se consulta en su módulo.
- [ ] (c) Resumen y páginas de detalle propias de E4.6 que recompongan los motores.
- [ ] (d) Ampliar `/saldos` como inicio, sin ruta nueva.

Recommendation (proposal only): (a). Satisface R6 «Inicio objetivo» sin duplicar motores ni
crear una segunda UI de detalle; (c) reabriría cálculos y (d) mezclaría el listado de Saldos
con un resumen de varias fuentes.

Confirmed answer: **PENDING**; source/date: PENDING.

### Q2 — Contexto temporal de cada bloque

Question: ¿el resumen usa un único corte para todo o contextos separados por bloque?

- [x] **(a) Cabecera con el ciclo actual y su corte; cada bloque declara su propio contexto
  (`ciclo`, `actual`, `corte`) y nunca se suman bloques de contextos distintos** (recomendada).
- [ ] (b) Un solo corte global para todas las cifras, incluidas deuda y Saldos actuales.
- [ ] (c) Solo posición actual, sin corte de ciclo.
- [ ] (d) Selector libre de corte en el inicio.

Recommendation (proposal only): (a). E2.6 ya separa «liquidez actual» del corte del ciclo;
E4.4 lista sin corte y E4.3 exige un corte explícito. (b) obligaría a inventar una foto
histórica de Deuda/Saldos que no existe y (d) anticiparía E4.11.

Confirmed answer: **PENDING**; source/date: PENDING.

### Q3 — Objetivo R6: meses objetivo y umbrales

Question: ¿dónde se guardan «meses objetivo» y los umbrales de la zona informativa?

- [x] **(a) E4.6 es solo lectura: consume una configuración ya aprobada; mientras no exista,
  objetivo/meses cubiertos figuran `No disponible` con motivo y se muestra el coste esencial
  conocido** (recomendada, coherente con «E4.6 no implementa esquemas»).
- [ ] (b) E4.6 añade una tabla/configuración mínima de usuario (requiere DT2, migración y
  autorización separada; contradice el límite del paquete).
- [ ] (c) Reutilizar `Saldos.objetivo` como objetivo global (no es la fórmula R6 y mezclaría
  atributos por Saldo con un objetivo global).
- [ ] (d) Fijar valores por defecto en código (sería una regla financiera no aprobada).

Recommendation (proposal only): (a) + decisión separada para la configuración. Sin meses
objetivo no se puede publicar un mínimo objetivo real; `0` o un valor fijo serían invención.

Confirmed answer: **PENDING**; source/date: PENDING.

### Q4 — Ejercicio del coste esencial

Question: ¿qué plan anual alimenta el coste esencial mensual del inicio?

- [x] **(a) El ejercicio del `mesFinanciado` del ciclo actual, consumiendo `annualEquivalent`
  sin recalcular** (recomendada).
- [ ] (b) El año natural del corte del ciclo.
- [ ] (c) El año natural de la fecha de consulta (reloj).
- [ ] (d) El último ejercicio con plan anual, aunque no corresponda al ciclo.

Recommendation (proposal only): (a). Es una fecha del maestro de Ciclos, no el reloj, y
`mesFinanciado` identifica el mes que el ciclo financia. Un ciclo que cruza año exige que el
usuario confirme la regla; no se infiere en silencio.

Confirmed answer: **PENDING**; source/date: PENDING.

### Q5 — Significado de «ahorro» en el inicio

Question: ¿qué cifra de ahorro debe verse?

- [x] **(a) Lista de posiciones actuales de Saldos activos con Finalidad `Ahorro`, cada una con
  su motor, sin total agregado salvo aprobación expresa; los indicadores de ahorro de E2.6 se
  muestran aparte con su cobertura (`No disponible` si faltan fuentes)** (recomendada).
- [ ] (b) Solo «Ahorro cierre histórico» de E2.6 (hoy `No disponible` sin proveedor).
- [ ] (c) Solo «Ejecución del Presupuesto de Ahorro» (requiere identidad R3 verificable).
- [ ] (d) Sumar todas las posiciones con Finalidad Ahorro en un total nuevo.

Recommendation (proposal only): (a). Permite «ver ahorro» sin inventar un total ni confundir
posición, variación y ejecución de presupuesto. (d) es un agregado nuevo no aprobado.

Confirmed answer: **PENDING**; source/date: PENDING.

### Q6 — Inversión y efectivo del bróker

Question: ¿qué se muestra de inversión y con qué corte?

- [x] **(a) Agregado de posiciones de E4.3 al corte del ciclo cuando su cobertura sea
  completa; si es parcial, `Parcial n/m` sin total; si E4.3 no está integrado, `No disponible`.
  El efectivo se lista por Saldo `Efectivo`/`Inversiones`, sin total y sin sumarlo a la
  posición** (recomendada).
- [ ] (b) Solo efectivo del bróker y cantidades, sin valoración.
- [ ] (c) Sumar efectivo y posición en una «inversión total».
- [ ] (d) Usar la fecha de consulta como corte de valoración.

Recommendation (proposal only): (a). (c) duplica efectivo y posición; (d) usa el reloj como
fuente financiera.

Confirmed answer: **PENDING**; source/date: PENDING.

### Q7 — Deuda no hipotecaria y deudas «Sin informar»

Question: ¿qué deudas entran en la cifra de deuda no hipotecaria?

- [x] **(a) Sumar solo deudas activas con `tipoDeuda = No hipotecaria` y deuda viva
  calculable; mostrar `Hipotecaria` y `Sin informar` aparte, fuera del total, con conteo y
  motivo** (recomendada).
- [ ] (b) Incluir `Sin informar` en el total con una etiqueta.
- [ ] (c) No publicar total; solo lista por deuda.
- [ ] (d) Incluir también hipotecaria con subtotal separado en el mismo bloque.

Recommendation (proposal only): (a). R6 pide «deuda no hipotecaria»; `Sin informar` no es
equivalente a no hipotecaria y sumarlo podría sobrestimar. La exclusión debe ser visible, no
silenciosa.

Confirmed answer: **PENDING**; source/date: PENDING.

### Q8 — Pendientes E3.6

Question: ¿cómo se representa el bloque de pendientes cuando E3.6 no está integrado?

- [x] **(a) `No disponible` con motivo y enlace al módulo cuando exista; nunca conteo 0 ni
  total monetario entre tipos** (recomendada).
- [ ] (b) Ocultar el bloque hasta que E3.6 exista.
- [ ] (c) Implementar un contador propio en E4.6 (duplicaría E3.6).
- [ ] (d) Sumar los importes pendientes en una cifra única.

Recommendation (proposal only): (a). E3.6 prohíbe el total entre tipos y aún no tiene código.
Ocultarlo incumpliría la capacidad declarada; (c)/(d) reabren su contrato.

Confirmed answer: **PENDING**; source/date: PENDING.

### Q9 — Saldos y bolsas

Question: ¿cómo se muestran Saldos/bolsas?

- [x] **(a) Vistas independientes sobre el mismo universo de Saldos: Liquidez (marcados
  `Liquidez=Sí`), Ahorro (Finalidad `Ahorro`) y Bolsas (`Mostrar como bolsa=Sí`), cada una con
  sus IDs y cobertura; **nunca se suman entre sí** porque un Saldo puede pertenecer a varias**
  (recomendada).
- [ ] (b) Una única tabla de Saldos con tres columnas de pertenencia.
- [ ] (c) Sumar las tres vistas en un «total de saldos».
- [ ] (d) Mostrar solo las bolsas y omitir Liquidez/Ahorro.

Recommendation (proposal only): (a). Los atributos son independientes (SPEC01) y sumar vistas
solapadas duplicaría posiciones. (b) es una alternativa UX razonable si el usuario prefiere
menos bloques.

Confirmed answer: **PENDING**; source/date: PENDING.

### Q10 — ¿Patrimonio total en el inicio?

Question: ¿E4.6 publica una cifra de patrimonio global?

- [x] **(a) No. El inicio muestra bloques con contextos y coberturas distintas; no hay un
  total patrimonial ni un «neto» que reste deuda de liquidez** (recomendada).
- [ ] (b) Sí, sumando posición valorada + efectivo + liquidez + ahorro − deuda.
- [ ] (c) Sí, pero solo cuando todas las fuentes tengan cobertura completa.

Recommendation (proposal only): (a). R6 no define esa suma, E4.3 advierte del riesgo de doble
cuenta y E4.7 posee la comparación y los márgenes. Un patrimonio exigiría una decisión
financiera propia.

Confirmed answer: **PENDING**; source/date: PENDING.

### Q11 — División por coste esencial nulo y formato de meses

Question: ¿qué se muestra si el coste esencial es 0 o parcial?

- [x] **(a) Coste esencial verificado 0 → `meses cubiertos: No disponible` por denominador no
  aplicable, nunca infinito ni 0; coste parcial/incompleto → objetivo `No disponible` y
  subtotal conocido visible; formato de meses con 2 decimales como propuesta, sin alterar el
  racional exacto** (recomendada).
- [ ] (b) Coste 0 → meses cubiertos 0.
- [ ] (c) Coste 0 → tratar como cobertura completa.
- [ ] (d) Coste parcial → calcular igualmente el objetivo con el subtotal conocido.

Recommendation (proposal only): (a). SPEC10 ya prohíbe que un parcial genere un objetivo
definitivo; dividir por 0 no tiene resultado financiero. El formato exacto queda para DT8.

Confirmed answer: **PENDING**; source/date: PENDING.

### Q12 — Fallo de una fuente y coherencia de la lectura

Question: ¿qué ocurre si un motor falla o cambia durante la consulta?

- [x] **(a) Lectura en una transacción única; cada sección se degrada por separado a `Parcial`
  o `No disponible` con motivo; un fallo no borra las demás ni se convierte en 0; se devuelve
  una revisión y la UI permite reintentar sin perder contexto** (recomendada).
- [ ] (b) Si falla una fuente, toda la pantalla es error.
- [ ] (c) Reutilizar la última respuesta buena sin marcarla desactualizada.
- [ ] (d) Componer con varias lecturas sin snapshot y aceptar mezcla de revisiones.

Recommendation (proposal only): (a). Coherente con SPEC12 y con el principio de cobertura por
métrica; (d) podría mezclar contextos incompatibles.

Confirmed answer: **PENDING**; source/date: PENDING.

## Casos de uso previstos

| ID | Actor y situación | Resultado esperado |
| --- | --- | --- |
| U-01 | Abrir la app y ver el estado del ciclo actual | Ciclo, corte y ejecución/plan visibles con cobertura; sin cifras inventadas |
| U-02 | Comprobar si la liquidez cubre el objetivo | Liquidez, coste esencial, mínimo y meses cubiertos, o motivo de indisponibilidad |
| U-03 | Revisar inversión sin duplicar efectivo | Agregado de posiciones separado del efectivo por Saldo |
| U-04 | Revisar deuda no hipotecaria | Deuda viva por deuda y total solo si es calculable; hipotecaria y sin informar aparte |
| U-05 | Ver pendientes de casos | Lista y enlaces E3.6; `No disponible` si el motor no existe |
| U-06 | Ir de una cifra a su origen | Enlace al módulo/ficha con el ID y contexto conservados |
| U-07 | Consultar en móvil | Bloques apilados, estado+importe+origen legibles sin scroll horizontal |
| U-08 | Operar con teclado o lector de pantalla | Orden de foco, encabezados, estado con texto y no solo color |

## Alternativas de composición

| Alternativa | Ventajas | Riesgos | Valoración |
| --- | --- | --- | --- |
| A. Dashboard único + drill-down | Una sola lectura; menos duplicación; cumple R6 | Densidad y rendimiento; tentación de sumar bloques | Recomendada |
| B. Resumen mínimo + enlaces | Menor riesgo de cálculos duplicados | No permite «ver» las cifras en el inicio | Insuficiente para R6 |
| C. Resumen + detalle propio E4.6 | Control total de la presentación | Duplica pantallas y contratos de otros motores | Rechazable en esta entrega |
| D. Extender `/saldos` | Sin ruta nueva | Mezcla catálogo con resumen multi-fuente | Coherente solo como transición |

## Riesgos

| Riesgo | Consecuencia | Mitigación propuesta |
| --- | --- | --- |
| Sumar bloques solapados | Duplicar liquidez/ahorro/bolsas/efectivo | Vistas independientes; prohibido el total cruzado |
| Presentar parcial como completo | Decisión financiera errónea | Estado+cobertura por métrica; sin cifra si falta |
| `null` convertido a 0 | Ocultar ausencia de fuente | DTO con `null` explícito; pruebas de no normalización |
| Motores ausentes (E4.3/E3.6) | Inicio incompleto presentado como completo | `No disponible` con motivo; AC bloqueados |
| Objetivo R6 sin configuración | Métrica estrella no publicable | Decisión Q3; no inventar meses ni umbrales |
| Mezcla de revisiones | Cifras incoherentes | Snapshot transaccional + revisión |
| Densidad en móvil | Pérdida de accesibilidad | Tarjetas, jerarquía, foco, 44 px, sin tablas compressas |
| Enlaces con importes | Fuga de datos en URL/logs | Solo IDs y rutas; sin payload financiero |
| Cálculo en UI | Divergencia con motores | La UI solo formatea; toda cifra llega del API |

## Dependencias

| Dependencia | Estado real | Efecto en E4.6 |
| --- | --- | --- |
| E2.6 `monthlyFlow` | Integrado; `GET /api/flujo-mensual/:id` | Consumible |
| E4.2 posiciones/efectivo | Integrado | Consumible |
| E4.4 deuda completa | Integrado | Consumible; sin corte en listado |
| E4.3 valoración/resultado | Aprobada, **sin DEV** | Inversión valorada `No disponible`; bloquea AC de valoración |
| E3.6 pendientes | Aprobada, **sin DEV** | Pendientes `No disponible`; bloquea AC de pendientes |
| E2.4 equivalente esencial | Implementado | Consumible; falta decidir ejercicio (Q4) |
| Configuración meses/umbrales | **No existe** | Objetivo R6 `No disponible`; bloquea E4.6-AC2 completo |
| DT8 UX/métricas/denominadores | **Abierta** | Wireframes y formato de meses son propuesta |
| E4.9 cierre/fotos | Aprobada, sin DEV | Fuera de alcance; E4.6 no lee ni crea fotos |
| E4.7 resumen anual | Futura | Frontera: sin comparación anual ni archivo |

## Preguntas que requieren decisión del usuario

1. Q1 composición (dashboard único + drill-down).
2. Q2 contextos por bloque frente a corte único.
3. Q3 almacén de meses objetivo/umbrales y qué mostrar mientras no exista.
4. Q4 ejercicio que alimenta el coste esencial.
5. Q5 definición de «ahorro» y si se admite un total.
6. Q6 corte de valoración y separación efectivo/posición.
7. Q7 tratamiento de deudas `Sin informar`.
8. Q8 representación de pendientes sin E3.6.
9. Q9 vistas de Saldos/bolsas y prohibición de sumarlas.
10. Q10 patrimonio total: incluido o excluido.
11. Q11 coste esencial 0/parcial y formato de meses.
12. Q12 aislamiento de fallos y snapshot.

## Coverage del template

- **Requisitos funcionales:** secciones de R6 y AC E4.6-AC1/2/3.
- **Interfaces/pantallas/interacciones:** dashboard 1440/390, navegación y drill-down en la
  specification candidata; pendiente de aprobación visual.
- **Datos leídos/escritos:** solo lectura de E2.4/E2.6/E3.6/E4.2/E4.3/E4.4; sin escrituras.
- **APIs/dependencias externas:** contrato de lectura propuesto; sin servicios externos.
- **Validación:** estados, cobertura, `null`≠0, precisión, cero y denominadores.
- **Errores y casos límite:** motores ausentes, fuentes parciales, sin ciclo, sin plan, coste 0,
  deuda no calculable, cobertura incompleta y sesión expirada.

## Wireframes

No se aprueban aquí. La specification candidata incluye bocetos ASCII 1440/390 como
**propuesta**; su revisión y aprobación corresponden a DT8/STEP 5 de UI antes de cualquier DEV.
