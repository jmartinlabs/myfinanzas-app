# 21 — E3.6 Pendientes y conciliación transversal: Progress

Status: **APPROVED (documental) — 2026-10-27; PR #97 publicada; sin merge.** El
desarrollo E3.6 no está autorizado; el merge requiere aprobación separada.

Fecha: 2026-10-27. Sesión funcional `SPEC21-E3.6`. Cliente externo vía OpenCode;
modelo/versión observados por el entorno, no verificados por el coordinador.

## 1. Preflight

| Comprobación | Resultado |
| --- | --- |
| Repositorio | `josemartin2000/myfinanzas-app` |
| `origin/main` | `9977210095472de43a9abf59587ea88587376074` (merge PR94) |
| Checkout principal | `codex/dev12-flujo-mensual`, con `specs/session-handoff.md` sin seguimiento; preservado sin tocar |
| Ramas remotas SPEC21 | Ninguna |
| `specs/21-*` en main o en el historial | Ninguno |
| Worktrees con `21-pendientes-conciliacion-*` | Ninguno |
| Worktrees ajenos con cambios | `pilot-e41` (spec19) y `spec14-d5` (spec14); preservados sin tocar |
| Checkout aislado | directorio temporal de OpenCode, subcarpeta `spec21-e36` |
| Rama | `codex/spec21-e36-pendientes-conciliacion` |
| Base de la rama | `origin/main` = `9977210` |

No se reutilizó ningún worktree ajeno. No se detectó escritor previo de SPEC21 ni
expediente duplicado.

## 2. Fuentes consultadas

- `AGENTS.md`, `specs/README.md`, `specs/project.md`.
- `.agents/skills/spec/SKILL.md` y plantillas de brainstorming/specification/testplan.
- `specs/methodology/myfinanzas-coordination.md`, `approvals.md`, `workflows.md`,
  `coordinator-communication.md`.
- `specs/roadmap.md` (E2.3, E2.6, E3.1–E3.6, DT5, E4.6/E4.7).
- `specs/functional-reference-v5.11.md` (R1–R4/R6, P1–P7).
- `specs/epic-board.md` y checkpoints; se contrastaron con Git/PR cuando el tablero
  estaba desactualizado.
- SPEC09, SPEC12, SPEC13, SPEC14 y SPEC16 (specification/brainstorming/testplan cuando
  aplicaba).
- SPEC18/E3.5 y DEV18: documentos locales en el worktree de especificación
  `spec18-e35` (`specs/18-*`) y en el worktree de desarrollo DEV18 de OpenCode; **no
  forman parte de main** y no se atribuyen a `main`.
- Código/API de solo lectura: `apps/api/src/anticipos.ts`, `compartidos.ts`,
  `revision-comida*.ts`, `planes-ciclo.ts`, `flujo-mensual.ts`, `ciclos.ts`; contratos
  integrados comprobados sin ejecutar pruebas.

## 3. Documentos creados

| Documento | Contenido |
| --- | --- |
| `specs/21-pendientes-conciliacion-brainstorming.md` | Decisiones confirmadas con procedencia, propuestas P-01–P-10, alternativas y Q-S21-01–04 aprobadas en opción A. |
| `specs/21-pendientes-conciliacion-specification.md` | Matriz de magnitudes, semántica Anticipos/Compartidos/Comida/Plan/Flujo, modelo transversal, wireframes 390/1440, API de solo lectura, estados, validación, exclusiones, matriz DT5 y 31 AC (30 originales + AC-31 futuro). |
| `specs/21-pendientes-conciliacion-testplan.md` | Matriz AC → positivo/negativo/límite → resultado → método → dependencia → UNRUN; riesgos y trazabilidad. |
| `specs/21-pendientes-conciliacion-progress.md` | Este checkpoint. |

No se editó ningún otro archivo.

## 4. Dependencias locales y futuras

- **E3.5/DEV18:** candidato local, no integrado ni aceptado funcionalmente.
  `FIN_NETA` runtime ausente; E3.5-AC-12/13/17/39 BLOCKED según el último estado recibido
  (handoff QA18 local). No se promociona a integrado.
- **Cierres E4.8–E4.11:** no existen; la matriz DT5 es preparatoria.
- **B-T11/E3.2:** pendiente; SPEC21 define el consumidor, pero no declara PASS.
- **E3.1-AC36:** parcial por proveedor de Cierres ausente.
- **E3.4-AC25:** abierto; no se declara equivalencia física.

## 5. Decisiones y preguntas

Decisiones confirmadas: D-01–D-09 en el brainstorming, con fuente/fecha; R-01 es una
restricción de alcance, no una decisión financiera. No se reabren.

**Q-S21-01–04 aprobadas por el usuario el 2026-10-27, opción A:**

1. **Q-S21-01=A** — atribución por Gasto/Partida; Neto de caja `B−R`; memoria de caja
   separada; foto/cierre congela el histórico.
2. **Q-S21-02=A** — S bruto E2.6 intacto; S ajustado separado; `G_n = G_b − R_adj` como
   gasto neto del ciclo por recuperaciones, no coste propio.
3. **Q-S21-03=A** — por defecto no resueltos (`Pendiente`, `Exceso`, `Revisar`, `Alerta`,
   `No disponible`); histórico explícito; ciclo y ejercicio separados.
4. **Q-S21-04=A** — detalle E3.4 visible; agregados E3.5/`FIN_NETA` No disponible.

No quedan preguntas materiales de diseño Q-S21. Los bloqueos restantes son de entrega.

## 6. Verificación documental

- `git diff --check`: sin errores de whitespace en la candidata y en la autorrevisión.
- `python3 scripts/validate-template`: **passed** en ambas pasadas (estructura, enlaces,
  manifiestos, contratos, reanudación, prompt y heurísticas de seguridad).
- `./scripts/test-validator`: **26 tests OK** en la segunda pasada.
- Revisión manual del diff: solo los cuatro documentos del expediente; sin cambios
  ajenos. Respecto a `origin/main`, el diff son los cuatro archivos nuevos.
- No se ejecutaron pruebas funcionales, CI remoto, migraciones, deploy, push, PR ni
  merge.
- Aprobación documental registrada; no se declara PASS funcional ni QA independiente.

## 7. Siguiente acción exacta

1. Publicar la rama y crear la PR documental; sin merge automático.
2. Actualizar el seguimiento mediante el coordinador global.
3. Presentar al usuario el estado de dependencias y la propuesta de desarrollo E3.6
   para autorización separada.
4. No reanudar DEV18, DEV18-LINUX, E4.1, DEV17, B3, Dev32 ni otros frentes.

## 8. Publicación

Autorizada por el usuario el 2026-10-27: publicar rama y crear PR documental. **No
autoriza merge**; el merge requiere aprobación explícita e independiente. El estado
final de rama/PR se registra en §9.5 y en el retorno del handoff.

## 9. Autorrevisión crítica — 2026-10-27

**Resultado: APPROVED (documental) — 2026-10-27.** Q-S21-01–04 están aprobadas en opción
A. La candidata es coherente y está delimitada; E3.5/FIN_NETA/Cierres siguen sin
integrarse y no se declara PASS funcional ni QA. La primera revisión independiente fue
**NO APTA**; tras corregir A1–A5/M1–M14 y R1–R17, la tercera pasada independiente la
declaró **APTA (documental)** sin bloqueos residuales.

### 9.1 Defectos detectados y corregidos

| # | Defecto | Gravedad | Corrección aplicada |
| --- | --- | --- | --- |
| 1 | W1/W2 mezclaban un filtro de ciclo concreto con filas de otros ciclos y con un Anticipo sin ciclo propio. | Media | Filtros iniciales «Todos»; contexto `—` para magnitudes actuales; nota de importe actual; Conciliación rotulada «Apertura 01/11». |
| 2 | La taxonomía podía crear varias filas para el mismo caso (pendiente, exceso, Revisar). | Media | Una fila por caso/tipo; `alertas[]`; precedencia `Revisar > Pendiente > Exceso > No disponible`. |
| 3 | La fila Comida No disponible de W1 atribuía la ausencia al motor E3.5 aunque W1 presupone E3.5 integrada. | Media | W1 se declara escenario objetivo; la fila pasa a «sin cobertura histórica»; W5 muestra el estado sin E3.5. |
| 4 | AC-23 solo cubría un caso de cruce y no separaba año natural, ciclo y ambos. | Media | AC-23 y testplan con E1/E2/E3 y recuperación posterior con/sin foto. |
| 5 | Las fórmulas de Comida omitían `fuera_presupuesto_historico IS NULL` y la ventana temporal. | Alta | Fórmulas `GC_B/GC_D/CO_B/CO_D` completadas con exclusiones y corte. |
| 6 | `CIERRE`/`DIF` no explicitaban la condición de siguiente Inicio y cobertura completa. | Alta | Condición añadida; ciclo abierto sin siguiente Inicio → No disponible. |
| 7 | No se explicitaba que Pendiente/Exceso son solo de Terceros y que el Titular tiene pendiente 0. | Alta | Regla añadida en §4.2. |
| 8 | No se delimitaba qué permite ver E3.4 sin E3.5/`FIN_NETA`. | Alta | Tabla §4.3.1 y AC-14/W5. |
| 9 | W4 tenía un `S ajustado` aritméticamente incorrecto (500 con ingresos 800 y gasto neto 150). | Alta | Corregido a 650; S bruto E2.6 350 intacto; nota de resultado por Recuperado, no coste/caja. |
| 10 | DT5 clasificaba «Comida» como tipo de Referencia. | Alta | Corregido a Anticipo/Compartido/Viaje/Evento/Vehículo. |
| 11 | Faltaba separar atribución económica por Gasto de fecha bancaria de la recuperación y el tratamiento histórico/foto. | Alta | Q-S21-01 ampliada con E1/E2/E3, cálculo vivo y foto; §4.6. |
| 12 | El alcance por defecto y la semántica de filtros de ciclo/ejercicio eran implícitos. | Media | P-08, Q-S21-03, §5.5 y AC-18: no resueltos por defecto; importe actual etiquetado; contexto del último hecho. |
| 13 | AC-02/03/06/08/09/10/12/14/15/16/18/20/23/24 y sus filas de testplan no reflejaban las correcciones. | Media | AC y testplan alineados; IDs estables conservados; AC-31 añadido como gate futuro. |
| 14 | El estado global del testplan decía «0 PASS, 0 FAIL», que podía leerse como ejecución. | Baja | «31 AC UNRUN; no se declara PASS ni FAIL». |

### 9.1.1 Hallazgos de la revisión independiente y disposición

| Hallazgo | Disposición |
| --- | --- |
| A1 — propuestas abiertas presentadas como reglas | Marcas `[P-Q-S21-0x]`, nota de condicionalidad y dependencias de decisión en AC-01/02/14/18/23. |
| A2 — DTO sin cobertura por métrica ni contextos múltiples | Añadidos `metricas[]`, `contextos[]`, `severidad` opcional y `motivo` opcional; AC-21/23 representables. |
| A3 — estado/severidad incoherentes | Añadido estado `Alerta`; `alertas[].tipo` incluye `No disponible`; `severidad=null` en filas normales. |
| A4 — `B−R` mal etiquetado como coste/ajuste | Renombrado a Neto central por Recuperado; Coste propio/Pendiente/Exceso separados; W4 corregido. |
| A5 — AC-23 con rama de foto no ejecutable | AC-23 queda para cálculo vivo; nuevo AC-31 BLOCKED por E4.8/E4.9. |
| M1 — AC-29/DT5 10 vs 15 filas | AC-29 y testplan corregidos a 15 filas; concurrencia/auditoría/idempotencia/fallos se declaran futuros E4.8/E4.9. |
| M2–M6 — AC-06/10/12/16/18 | Añadidos importes/residuo, foto precondición, estados spec18, precondición de API fuente, 422 y alcance histórico. |
| M7 — prefijos AC entre entregas | `E3.5-AC-…`, `E3.4-AC-…`, `E3.1-AC-…` en spec/testplan/progress. |
| M8 — dependencias omitidas | Añadidas E2.3 y E3.3 (no consumido) a la tabla. |
| M9 — SHA no actualizado | Se reporta el SHA del commit de cierre y la URL de PR en el handoff; publicación autorizada. |
| M10 — Comida spec18 no aprobada/nomenclatura | Bloque marcado `[P][F]`; nota de nombres lógicos y remisión a E3.5/DT2. |
| M11 — ciclo abierto sin corte | Corregido: corte = referencia central; CIERRE/DIF No disponible. |
| M12 — exclusión cross-ciclo | Se excluye solo la regla definitiva; escenarios quedan documentados y condicionados. |
| M13 — reposición/Ingreso y devolución de compra | Precisado que no crea/reclasifica Ingreso; añadida fila de devolución de compra. |
| M14 — duplicación de escenarios | Escenarios canónicos en §15.6; brainstorming remite a ellos. |
| B1–B7 | Aclarados importes ficticios, REF015 en W2, tipo «Gasto compartido», D-10→R-01, dependencias, orden/motivo y guion con motivo. |
| R1–R17 (segunda reauditoría) | Corregidos: `Alerta` en alcance por defecto; `G_n` como gasto neto del ciclo; AC-31 con Q-S21-01; AC-23 E3 sin atribución; histórico `Resuelto`; progress sin SHA falso; P-06; marcas P-Q; AC-01/02 numéricos; estado de fila/caso; céntimo G3; «5 cambios»; dependencias; terminal; coste propio 15.2; REP/RECURSOS; AC-12 condicionado. Tercera pasada: **APTA documental**, sin bloqueos residuales. |

### 9.2 AC revisados

- 30 AC originales revisados individualmente; **ninguno eliminado ni renumerado**.
  Se añadió `E3.6-AC-31` como gate futuro BLOCKED por Cierres, sin alterar IDs previos.
- Cambios de redacción/cobertura: AC-02, AC-03, AC-06, AC-08, AC-09, AC-10, AC-12,
  AC-14, AC-15, AC-16, AC-18, AC-20, AC-23 y AC-24; AC-31 añadido.
- Trazabilidad de roadmap conservada: E3.6-AC1 → AC-01/02/03/04/07/22/24/25/31;
  E3.6-AC2 → AC-05/06/21/24; E3.6-AC3 → AC-13/14/16/17/18/19.
- Todos los AC y escenarios siguen **UNRUN**; AC-31 queda además BLOCKED; no hay PASS
  funcional.

### 9.3 Decisiones Q-S21-01–04 aprobadas

| Pregunta | Decisión | Autoridad |
| --- | --- | --- |
| Q-S21-01 | A: atribución por Gasto/Partida; Neto de caja `B−R`; memoria de caja separada; sin foto el cálculo es vivo, con foto no se reescribe. | **Aprobada por el usuario, 2026-10-27.** |
| Q-S21-02 | A: convivencia; S bruto E2.6 intacto y S ajustado separado, PARCIAL y por Recuperado (no coste/caja total). | **Aprobada por el usuario, 2026-10-27.** |
| Q-S21-03 | A: por defecto no resueltos (incluye Alerta/No disponible); histórico/resueltos con acción; ciclo filtra actividad e importe actual; ejercicio usa último hecho. | **Aprobada por el usuario, 2026-10-27.** |
| Q-S21-04 | A: Comida No disponible sin E3.5; con E3.4 se ve el detalle auxiliar, no los agregados. | **Aprobada por el usuario, 2026-10-27.** |

Reglas ya aprobadas que no se tocan: Anticipos (R4/spec13), Compartidos (R4/spec14),
Comida auxiliar y fórmulas R4/spec16, Plan R3/spec09, Flujo E2.6/spec12, Ciclos
R3/spec03/spec07 y prohibición de doble contabilización.

### 9.4 Bloqueos y reservas restantes

- E3.5/DEV18 no integrada ni aceptada; `FIN_NETA` runtime ausente; E3.5-AC-12/13/17/39
  BLOCKED. Las pruebas Comida/E3.5 no pueden ejecutarse todavía.
- Cierres E4.8–E4.11 y proveedor de conciliación ausentes; DT5 es preparatoria.
- E3.2 B-T11 pendiente; E3.1-AC36 parcial; E3.4-AC25 abierto.
- Aprobación documental registrada; quedan pendientes publicación de PR y aprobación
  separada de merge.
- Sin pruebas funcionales ni QA; no se declara PASS.

### 9.5 Evidencia de la segunda pasada

- `python3 scripts/validate-template`: **passed**.
- `./scripts/test-validator`: **26 tests OK**.
- `git diff --check`: sin errores.
- Revisión independiente: primera pasada NO APTA; tercera pasada **APTA (documental)**,
  sin bloqueos residuales.
- Diff completo respecto a `origin/main`: cuatro archivos del expediente, sin cambios en
  código, tablero, roadmap, otros specs ni configuración.
- La candidata aprobada se incluye en el commit local de cierre y se publica en rama/PR
  según la autorización del 2026-10-27; el SHA y la URL de PR se registran en §10 y en
  el retorno del handoff. No se hace merge.

## 10. Cierre documental y publicación

- Aprobación: usuario, 2026-10-27, Q-S21-01–04 opción A y cierre documental.
- Rama: `codex/spec21-e36-pendientes-conciliacion`.
- PR documental: `https://github.com/josemartin2000/myfinanzas-app/pull/97`.
- Base de la PR: `main` (`9977210`); head verificado por `refs/pull/97/head`.
- Alcance de la PR: solo los cuatro documentos `specs/21-pendientes-conciliacion-*`;
  sin código, SQL, migraciones, tablero, roadmap ni otros specs.
- Bloqueo operativo registrado: `gh` no está instalado y la API de GitHub no ofrece
  credenciales válidas en este entorno; la PR se verificó por refs Git (`head`/`merge`),
  no por API. No se solicitaron ni expusieron credenciales.
- Merge: **no realizado**; pendiente de aprobación explícita e independiente.
- Desarrollo E3.6: no autorizado; debe solicitarse por separado.

## 11. Comprobación de no alteración

- No se modifican reglas centrales de Movimientos, Saldos, Ciclos, Plan, Anticipos,
  Compartidos, Revisión Comida ni sus esquemas.
- No se introduce `Bruto + Neto`, segundo Gasto de Comida, doble descuento de Anticipo,
  doble ejecución de Plan, doble cuota/extraordinaria ni doble financiación de terminal.
- El diff es exclusivamente documental: cuatro archivos SPEC21, sin código, SQL,
  migraciones, tablero, roadmap ni otros specs.
- Validación documental PASS; pruebas funcionales UNRUN; QA no realizada.
