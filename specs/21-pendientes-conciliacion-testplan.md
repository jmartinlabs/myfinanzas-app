# 21 — E3.6 Pendientes y conciliación transversal: Testplan

Status: **DISEÑO DE PRUEBAS — Q-S21-01–04 aprobadas en opción A; ninguna prueba
ejecutada.** Todas las pruebas nuevas quedan **UNRUN**. No se declara PASS funcional,
QA independiente ni autorización de desarrollo.

Approval source/date: usuario, 2026-10-27, Q-S21-01–04 opción A y cierre documental.
Este testplan no autoriza desarrollo.

Context: [specification 21](21-pendientes-conciliacion-specification.md),
[brainstorming 21](21-pendientes-conciliacion-brainstorming.md),
[roadmap E3.6](roadmap.md#e36--pendientes-y-conciliación-transversal-de-casos).

Métodos previstos: `Bun/API/SQLite` para motores y DTO; `Playwright` para UI 390/1440;
`revisión documental` para matrices y trazabilidad. Ningún método se ejecutó en esta
preparación.

Dependencias generales:

- **E3.6 no implementada.** No existen endpoints, DTO, pantallas ni pruebas de esta
  entrega.
- **E3.5/DEV18 candidata local**, no integrada ni aceptada; `FIN_NETA` runtime ausente;
  E3.5-AC-12/13/17/39 BLOCKED. Las pruebas de Comida que dependen de E3.5 quedan UNRUN y su
  ejecución futura está bloqueada hasta integración/aceptación.
- **E3.2 B-T11 pendiente.** El consumo por informes/E3.6 no se declara PASS.
- **E3.1-AC36 PARCIAL** por proveedor de Cierres ausente.
- **Cierres E4.8–E4.11 futuros.** No hay proveedor, locks, snapshots ni re-cierres.

## 1. Matriz AC → escenario → resultado → método → dependencia → estado

Leyenda de escenarios: **P** positivo, **N** negativo, **L** límite. Todos los estados
son **UNRUN**.

| AC | Escenario P / N / L | Resultado observable esperado | Método previsto | Dependencia | Estado |
| --- | --- | --- | --- | --- | --- |
| E3.6-AC-01 | P: Bruto 450, Recuperado 300. N: mostrar Bruto+Neto. L: Recuperado 0 y Recuperado = Bruto. | Neto central B−R = 150; Coste propio/Pendiente/Exceso aparte; sustitución, no segundo gasto; sin Ingreso por 300; con 0 el neto es el bruto; con Recuperado=Bruto el neto es 0 verificado. | Bun/API/SQLite + Playwright | E3.2 D5; motor E2.6; Q-S21-01/02=A | UNRUN |
| E3.6-AC-02 | P: Ingresos 800, Bruto 450, Extraordinaria 0, Neto 150. N: Bruto 450 + Neto 150. L: Neto negativo. | S bruto E2.6 350 visible e intacto; S ajustado 650 separado y PARCIAL; nunca 600; neto negativo se conserva y se explica. | API + Playwright | E3.2; spec12; Q-S21-02=A | UNRUN |
| E3.6-AC-03 | P: adelanto 1.000 y devolución 400 en ciclos distintos; línea de Plan de Partida no relacionada. N: intentar ejecutar Plan por la devolución. L: devolución igual al adelanto y exceso. | A transferir/Ejecutado R3 de la línea no relacionada sin cambio; no Ingreso/Gasto; no doble ejecución; exceso visible sin recorte. | Bun/API/SQLite | E3.1 PR71; E2.3 | UNRUN |
| E3.6-AC-04 | P: Comida con FIN_NETA neta y DEV_ANT informativa. N: restar Comida del flujo o DEV_ANT otra vez. L: FIN_NETA negativa/ausente. | Comida no crea Gasto central ni se resta del flujo; FIN_NETA se usa una vez; negativa se conserva; ausente → No disponible. | Bun/API + Playwright | E3.5 no integrada; spec16 | UNRUN |
| E3.6-AC-05 | P: Gasto con REF de Compartido/Anticipo y Partida. N: convertirlo en Transferencia por la REF. L: REF inactiva/histórica. | Conserva Tipo Gasto, Partida, fecha e importe; ejecuta Plan por Partida; REF no cambia el tipo; histórico se conserva. | Bun/API/SQLite | E1.4/E1.5/E2.3 | UNRUN |
| E3.6-AC-06 | P: G1 300 P1 + G2 150 P2 + G3 100 P3, 3 participantes 1:1:1 (p-001 Bea, p-002 Yo, p-003 Álex); Álex aporta 300 (rec G1=200, G2=100). N: repartir el Neto global a mano. L: céntimos con residuo G3. | G3: Bea 33,34 (desempate ID), Yo/Álex 33,33; Neto G1=100, G2=50, G3=100; caso 250; cada Gasto/Partida conserva identidad; sin reparto manual. | Bun/API/SQLite | spec14; E3.2 PR75 | UNRUN |
| E3.6-AC-07 | P: parcial, completo, exceso y Cerrado con coste propio. N: exigir Neto 0 para Cerrado. L: Cerrado con Neto positivo y sin terceros. | Estados correctos; Cerrado sin pendientes/excesos aunque Neto>0; exceso íntegro; sin compensación. | Bun/API + Playwright | spec14 R-CC | UNRUN |
| E3.6-AC-08 | P: Bea pendiente 150 y Álex exceso 150. N: compensarlos. L: ambos cero. | Una fila del caso con estado de fila `Pendiente`, estado del caso `Reparto parcial` y alerta de exceso separada; importes no sumados; ambos cero → Cerrado si no hay incidencias. | Bun/API + Playwright | spec14 F5/D7 | UNRUN |
| E3.6-AC-09 | P: foto apertura 1.000 y actual 600; después foto cero con evidencia. N: sustituir foto por actual. L: foto ausente. | Foto y actual separados; sin foto → No disponible; cero solo con evidencia; no se reconstruye. | Bun/API + Playwright | spec13 Q8/AC-30–36 | UNRUN |
| E3.6-AC-10 | P: adelanto C1, devolución C2, foto C2 confirmada con evidencia; sin foto → ND. N: ejecutar Plan dos veces o crear Ingreso. L: devolución en el límite del ciclo. | Pendiente correcto; foto C2 intacta; sin foto → No disponible; Plan sin doble ejecución; sin Ingreso/Gasto; límites inclusivos. | Bun/API/SQLite | E3.1; E2.1/E2.3 | UNRUN |
| E3.6-AC-11 | P: Comida 40 + Pendiente revisar 30 + Ocio 25 + Niños 10 + Otros 10 + FP 15 + repo 20. N: incluir FP en compensable o duplicar Pendiente revisar. L: devolución que supera el bruto. | Gasto comida 70; Compensable 45; Falta 25; FP excluido y conservado; neto negativo se conserva. | Bun/API | spec16; E3.5 | UNRUN |
| E3.6-AC-12 | P: repo 20 sobre CO 45. N: declarar Completada por ausencia. L: repo tardía en ciclo siguiente; repo = CO. | Falta 25/`Parcial`; ausencia → `Sin reposición`; tardía cuenta en su ciclo y no se atribuye; `Completada` solo con cobertura completa; definición condicionada a E3.5/spec18 (no en main). | Bun/API + Playwright | E3.5 Q3 C; spec16/spec18 | UNRUN |
| E3.6-AC-13 | P: S0 295 y cierre 205 con cobertura. N: modificar S0 o crear asiento. L: diferencia 0, positiva y negativa. | Diferencia 90 solo alerta; S0 intacto; sin asiento; 0 → Coincide; signo se conserva. | Bun/API + Playwright | E3.5/Cierres ausentes | UNRUN |
| E3.6-AC-14 | P: E3.4 integrada y E3.5 no; después sin FIN_NETA/Cierres/cobertura. N: mostrar 0 o Coincide. L: fuente recuperada después. | Detalle auxiliar E3.4 visible; agregados Comida/conciliación No disponible con motivo; sin cifra ni reconciliación simulada; al recuperar la fuente se recalcula. | Bun/API + Playwright | E3.4 integrada; E3.5/Cierres futuros; Q-S21-04=A | UNRUN |
| E3.6-AC-15 | P: periodo verificable sin hechos en `R_adj`. N: fuente ausente. L: periodo no verificable/ciclo futuro. | Sin hechos → 0 verificado en esa métrica; fuente ausente → No disponible; periodo no verificable → No disponible con motivo; no se usa para Comida sin E3.5. | Bun/API | E2.1/E2.6 | UNRUN |
| E3.6-AC-16 | P: operaciones válidas. N: Anticipo sin rol/par, intento de acreditar una Transferencia interna como aportación, participante de otra ficha, importe/fecha inválidos. L: reintento/rollback. | Rechazo estructural atómico (422/409); sin escritura parcial; no aparece como alerta; reintento seguro. | Bun/API/SQLite | E3.1 Q9/H1; spec14 D5; spec16 | UNRUN |
| E3.6-AC-17 | P: histórico acreditable. N: histórico sin evidencia/conflicto. L: operación anulada. | Se conserva; Revisar con motivo/enlace; no computa en total acreditado; anulada no computa. | Bun/API + Playwright | E3.1/E3.2/E3.4 | UNRUN |
| E3.6-AC-18 | P: por defecto (`alcance=abiertos`) y con filtros tipo/estado/ciclo/ejercicio/cobertura; `alcance=historico`. N: filtro contradictorio → 422. L: sin resultados. | Por defecto incluye Pendiente/Exceso/Revisar/Alerta/No disponible; histórico/resueltos con acción; `Resuelto` para cerrados/recuperados; ciclo filtra actividad e importe actual; ejercicio usa último hecho; sin mezcla ni total global; vacío claro. | API + Playwright | E3.2/E3.1/E3.5; Q-S21-03=A | UNRUN |
| E3.6-AC-19 | P: abrir cada tipo y volver. N: intentar escribir desde E3.6. L: enlace a caso inexistente. | Navegación correcta; sin escritura; filtros conservados; 404 seguro. | Playwright + API | E3.2/E3.1/E3.5 UI | UNRUN |
| E3.6-AC-20 | P: inspeccionar DTO y claves. N: buscar tabla/maestro nuevo. L: dos alertas del mismo caso. | Sin persistencia; claves efímeras; IDs de fuente visibles; un caso no se duplica por tener dos alertas. | Revisión de código + SQLite | E3.1/E3.2/E3.4/E3.5 motores | UNRUN |
| E3.6-AC-21 | P: métricas completa/parcial/ND. N: colapsar en un estado. L: una completa y otra parcial en la misma fila. | Cobertura por métrica; no se colapsa; subtotal parcial no es total; motivos visibles. | API + Playwright | spec12/spec14/spec16 | UNRUN |
| E3.6-AC-22 | P: neto negativo, exceso, cero. N: float/redondeo/truncado. L: céntimos y límites. | Signo/cero exactos; suma en céntimos; sin float; sin truncar exceso; límites inclusivos. | Bun/API/SQLite | motores existentes | UNRUN |
| E3.6-AC-23 | P: E1 mismo ciclo/distinto año; E2 mismo año/distintos ciclos; E3 distinto ciclo y año; recuperación posterior sin foto. N: forzar un solo eje. L: ciclo abierto o cambio de ciclo. | Los tres escenarios se muestran por separado; Plan anual usa el año del Gasto; el flujo usa el ciclo como ventana; con Q-S21-01=A el Recuperado se atribuye al Gasto y la aportación se muestra en la memoria de caja de su fecha; sin duplicar; la rama con foto es AC-31. | Bun/API + Playwright | Q-S21-01=A; E2.1/E2.4 | UNRUN |
| E3.6-AC-24 | P: terminal + financiación, cuota + extraordinaria, devolución de compra y reposición. N: sumar financiación como Gasto/Ingreso, cuota dos veces o repo como Ingreso adicional. L: Gasto terminal sin Transferencia. | Gasto terminal una vez; Transferencia no es Gasto/Ingreso; cuota una vez; extraordinaria separada; devolución/reposición no se suman como Ingreso adicional; sin Transferencia no se infiere financiación ni déficit. | Bun/API | E1.4/E1.6/spec12/spec16 | UNRUN |
| E3.6-AC-25 | P: flujo real, Plan, patrimonio, provisión y pronóstico. N: fusionarlos. L: métrica ajustada negativa. | Se muestran separados; no se suman/sustituyen; ajustada no es flujo completo ni ahorro real; signo conservado. | API + Playwright | spec12; E4 futuro | UNRUN |
| E3.6-AC-26 | P: dos consultas concurrentes. N: respuesta antigua tras cambio. L: cambio de ciclo durante carga. | Sin mezcla de revisiones; selección conservada; respuesta antigua no sustituye; sin caché como verdad. | Bun/API + dos conexiones | E3.2/E3.1/E2.6 | UNRUN |
| E3.6-AC-27 | P: 390/1440, teclado/foco. N: color-only/overflow. L: vacío/carga/error/parcial/ND. | Tabla/tarjetas legibles; etiquetas y texto; sin overflow; foco correcto; la UI real no inventa importes (wireframes ficticios). | Playwright 390/1440 | shell/UI existente | UNRUN |
| E3.6-AC-28 | P: sesión/MFA válidos. N: sin sesión, URL manipulada, intento de escritura. L: error de motor y sesión expirada. | 401/403/4xx seguro; sin SQL/importes en logs/URL; no POST/PATCH/DELETE; selección conservada. | API + revisión de logs | guía seguridad | UNRUN |
| E3.6-AC-29 | P: revisar matriz DT5. N: buscar locks/endpoints/snapshots. L: cambio en ciclo cerrado futuro. | Matriz cubre 15 filas: 10 cambios exigidos + tipo de Referencia, acreditación de aportación, Presupuesto, FIN_NETA y Cierre; concurrencia/auditoría/idempotencia/fallos quedan para E4.8/E4.9; no se implementa Cierres. | Revisión documental | E4.8 futuro | UNRUN |
| E3.6-AC-30 | P: revisar trazabilidad E3.6-AC1/2/3. N: AC sin prueba. L: dependencia no declarada. | Cada criterio tiene AC/prueba; dependencias E3.1–E3.5/E2.6 visibles; sin PASS ni aprobación. | Revisión documental | roadmap | UNRUN |
| E3.6-AC-31 | P: recuperación posterior sobre ciclo sin foto; N: intentar reescribir foto; L: con foto/cierre existente. | Sin foto, cálculo vivo y actualizado; con foto, valores persistidos sin reescritura; no se inventa cierre. | Revisión documental + futura integración | E4.8/E4.9 futuros | **UNRUN — BLOCKED** |

## 2. Trazabilidad de roadmap

| Roadmap | AC de esta spec | Escenarios clave |
| --- | --- | --- |
| E3.6-AC1 — flujo incorpora Neto compartido central y no descuenta dos veces Anticipos/Comida | AC-01, AC-02, AC-03, AC-04, AC-07, AC-22, AC-24, AC-25, AC-31 | Bruto 450/Recuperado 300; devolución de Anticipo; FIN_NETA; terminal/cuota; separación de planos |
| E3.6-AC2 — Referencia no cambia el tipo del Gasto | AC-05, AC-06, AC-21, AC-24 | Gasto con REF de Compartido/Anticipo; multi-Partida; cobertura por métrica |
| E3.6-AC3 — alerta de conciliación distinta de rechazo estructural, con navegación | AC-13, AC-14, AC-16, AC-17, AC-18, AC-19 | S0 vs cierre; ND; rechazo atómico; histórico Revisar; filtros; enlaces |
| Pruebas de roadmap: multi-Partida, devolución fuera de Plan, saldo discrepante, periodos/años distintos | AC-03, AC-05, AC-06, AC-10, AC-13, AC-23 | Casos 15.1–15.7 de la specification |
| DT5 preparatoria | AC-29 | Matriz de 15 filas (10 exigidas + 5 adicionales) + Cierre futuro |
| Dependencias | AC-04, AC-09–AC-17, AC-31 | E3.5 local, Cierres ausentes, B-T11; Q-S21-01–04 aprobadas opción A |

## 3. Riesgos de prueba

| Riesgo | Consecuencia | Cobertura prevista |
| --- | --- | --- |
| Declarar E3.5 integrada por tener candidato local | Comida/Conciliación falsamente completas | AC-04, AC-14; dependencia explícita; No disponible |
| Sumar Bruto + Neto | Doble gasto | AC-01/AC-02 |
| Restar Comida o Anticipos otra vez | Flujo infravalorado | AC-03/AC-04/AC-24 |
| Convertir ausencia en cero | Reconciliación falsa | AC-13–AC-15/AC-21 |
| Mezclar ciclo y año natural | Ejecución/plan incorrectos | AC-23 |
| Crear segundo maestro o Neto paralelo | Divergencia de verdad | AC-20 |
| Ocultar rechazo estructural como alerta | Operación inválida persistida | AC-16 |
| Implementar Cierres por la matriz | Alcance indebido | AC-29 |
| UI que dependa del color | Accesibilidad | AC-27 |

## 4. Estado global

| Bloque | Estado |
| --- | --- |
| Pruebas nuevas | **31 AC UNRUN (AC-31 BLOCKED por Cierres); no se declara PASS ni FAIL** |
| Pruebas funcionales E3.6 | No ejecutadas; no existe implementación |
| Pruebas Comida/E3.5 | UNRUN; ejecución futura bloqueada hasta integración/aceptación |
| Pruebas de Cierres | No diseñadas como operativas; solo revisión documental DT5 |
| QA independiente | No realizada |
| Aprobación de spec | No concedida |
