# 14 — Gasto compartido: enmienda 14-E1 (regularización de salida al tercero)

Status: **PROPUESTA — pendiente de revisión independiente y de aprobación del usuario.**
**NO AUTORIZA DEV, SQL, migraciones, cambio de datos ni despliegue.**
Fecha: 2026-11-23. Issue: #561.
Afecta a la [especificación 14](14-compartidos-specification.md). Su base, Base B y la
enmienda D5 (§15, implementada en v17, PR #90) **no se modifican**, con una excepción declarada:
el §4.1 **enmienda §7.1, §7.2, §7.3 y §7.5** para admitir el coste cero. Es la decisión **R7**.
Origen: [SPEC39](39-devoluciones-compras-specification.md) §9 y §11.1, aprobada el
2026-11-22. Allí SPEC14 figura como requisito previo de DEV, y `AC-D24`, `AC-D25` y
`AC-D26` quedan condicionados a esta enmienda.

## Motivo

Cuando una devolución de compra reduce el coste de un caso compartido, la cuota del tercero
baja. Si ya había pagado, ha aportado más de lo que le corresponde: aparece un **Exceso**. Hoy
la app solo registra dinero que **entra** de un tercero (D5, `S000 → Saldo interno`). No hay
forma de registrar el dinero que **sale** hacia él para devolverle ese exceso:

- el CHECK de `movimientos` rechaza cualquier `Transferencia` con `destino = 'S000'`;
- `movimiento_compartido` solo admite movimientos con `origen = 'S000'`;
- spec05 y la propia D5 declaran fuera de alcance las salidas `interno → Exterior`.

Sin esa salida, el caso no puede volver a `Cerrado` después de una devolución, y simularla
con un importe negativo o con un movimiento `Devolución de gasto` rompería la separación de
fuentes de SPEC39 (`AC-D25`).

## 1 · Lo que no cambia

- F1–F6, R-MP, R-CC, los 39 AC base y los D5-AC-01…15.
- El algoritmo de céntimos de §7.3 y la atribución multi-Gasto del Recuperado de §7.4. Cambian
  dos entradas, `Aportado_p` (§4) y la base del reparto, que pasa de B_g a C_g (§4.1, R7).
  Las fórmulas de Pendiente, Exceso y R-MP son las mismas.
- El orden y las reglas de los estados (§6).
- D5 completo: la aportación entrante, sus validaciones, su auditoría y su rectificación.
- No se habilitan las Transferencias Exterior ordinarias. La única salida nueva es la
  regularización de un caso compartido, con ficha y participante.
- El descuento comercial de SPEC39 —movimientos `Devolución de gasto` vinculados— nunca entra en
  `Aportado_p` ni en el Recuperado. Su efecto sobre el Bruto **sí** cambia §7.1 y §7.2 y se
  declara en el §4.1.

## 2 · Decisiones que se elevan al usuario

Cada una lleva una recomendación. Ninguna se da por aprobada hasta que el usuario lo diga.

| ID | Pregunta | Recomendación | Alternativa |
| --- | --- | --- | --- |
| **R1** | ¿Cómo se representa la salida? | **Una `Transferencia` real de un Saldo interno a `S000`**, con la REF CAT013 del caso: es la simétrica de la D5. | Un tipo nuevo de Movimiento. Se descarta porque añade un tipo y sus consumidores sin aportar ninguna garantía más. |
| **R2** | ¿Se puede acreditar solo una parte de un movimiento? | **No: cada movimiento se acredita entero a un único tercero, 0..1**, igual que en D5 (I-D5-2, I-D5-3). Es un subconjunto más estricto de SPEC39 §9 («una misma porción no se reutiliza»). **Coste:** un único cargo bancario que devuelva a dos terceros, o a dos casos, debe partirse en varios Movimientos, lo que afecta a la conciliación 1:1 con el extracto. | Acreditar porciones de un movimiento. Obligaría a copiar el importe en los metadatos, rompiendo I-D5-3, y a llevar un contador de porciones. |
| **R3** | ¿Solo para el exceso que causa una devolución? | **Para cualquier `Exceso_p` del tercero**, venga de una devolución, de un cambio de partes o de un pago de más. La operación es la misma: devolverle dinero. | Exigir que exista una devolución vinculada. Añade un vínculo sin garantía adicional y deja sin vía el pago de más. |
| **R4** | ¿Se puede regularizar a un tercero dado de baja? | **Sí, hasta su `Aportado_p` neto íntegro.** El motor no calcula cuota ni Exceso para una baja (su Asignado es «No aplica» y su aportado ya cuenta como atribución parcial), así que el límite no puede ser `Exceso_p`. La baja impide nuevas aportaciones, no devolver lo que puso. SPEC39 §9 incluye a los inactivos con saldo pendiente. **Es una decisión financiera tuya.** El cambio de participante de una regularización exige un Tercero activo, como en D5 §15.8. | Exigir que se reactive el participante antes de pagarle. Mantiene un único límite `Exceso_p`, a costa de reabrir el participante. |
| **R5** | ¿Dónde se guarda? | **En la misma `movimiento_compartido`, con una columna `sentido` (`Aportación` o `Regularización`)** ligada por CHECK y trigger a `origen`/`destino` del movimiento. Hay lectores de esa tabla (§7.7) que, sin el sentido explícito, sumarían una salida como cobro. | Deducir el sentido del movimiento, sin columna. Es menos auditable y obliga a que cada lector lo recuerde. |
| **R7** | ¿Cómo se admite el coste cero (devolución total)? | **Mantener B como bruto y añadir un coste económico C_g.** C_g = B_g − descuento comercial vinculado y vigente. El reparto, `Exceso_p`, Neto(g) y N usan C; B sigue siendo el bruto del hecho (SPEC39 §4: «el bruto permanece en el hecho original»; AC-D32 conserva el bruto en Flujo). **Cambia el significado de N** (F1: N = C − R en lugar de B − R), por lo que se inventarían los consumidores de B y N antes de DEV. | Redefinir B como neto. Cambia el significado de B en todos sus consumidores y confunde el bruto con el coste, que SPEC39 mantiene separados. |
| **R6** | ¿Se aplica el mismo gate de exposición que a las devoluciones? | **Sí:** la regularización se expone solo con #547 (v32) integrado, bajo el mismo gate 503 de SPEC39 §11. | Sin gate. La regularización existe sin devoluciones (R3), pero comparte el motor de impacto y el estado dirty de #547. |

El resto del documento está redactado con las cinco recomendaciones. Si el usuario elige otra
alternativa, se revisan las secciones afectadas antes de aprobar.

## 3 · Semántica

1. Una **regularización** es una `Transferencia` vigente de un Saldo interno elegible a
   `S000 · Exterior`, con la Referencia CAT013 de un caso con ficha, acreditada a un único
   participante **Tercero** de esa ficha. Representa dinero real devuelto a ese tercero.
2. No es Gasto, no es Ingreso, no es `Devolución de gasto`, no crea Partida ni Subtipo, y no
   hay un segundo hecho financiero. El efecto bancario lo marca el motor de Saldos: resta el
   importe del Saldo de origen. `S000` no computa como saldo disponible.
3. La regularización **reduce lo aportado neto** del tercero. **No modifica el cobro
   original**, ni su acreditación, ni la cuota del tercero, ni el Bruto del caso.
4. Una Transferencia interna con la Referencia del caso sigue sin acreditar nada (Q5), en
   cualquier sentido.

## 4 · Motor: entradas y fórmulas

Las definiciones de §7.1 y §15.9 se mantienen. Cambia solo cómo se calcula lo aportado por un
tercero:

- **Cobrado_p** = Σ de aportaciones entrantes acreditadas y vigentes de p (D5).
- **Regularizado_p** = Σ de regularizaciones acreditadas y vigentes de p.
- **Aportado_p** = Cobrado_p − Regularizado_p. Es el `aportadoNeto(p)` de SPEC39 §9.

Lo que se deriva de ahí, con las mismas fórmulas:

- `Recuperado_p = Aportado_p` (F2); `R = Σ` de terceros; `N = B − R`.
- `Pendiente_p = max(Asignado_p − Aportado_p, 0)`;
  `Exceso_p = max(Aportado_p − Asignado_p, 0)`.
- Equivalencia con SPEC39: `pendienteRegularizacion(p) = Aportado_p − Asignado_p`. Si es
  positivo, coincide con `Exceso_p` (hay que devolver). Si es negativo, coincide con
  `−Pendiente_p` (falta cobrar).
- `rec(g,p)` reparte el `Recuperado_p` **neto** por R-MP. Una regularización reduce el
  Recuperado atribuido a cada Gasto de p, y el Neto de cada Gasto vuelve a su valor sin
  reescribir nada.

### 4.1 Enmienda a §7.1, §7.2, §7.3 y §7.5: coste cero (R7)

SPEC39 §9 exige adaptar el motor (`compartidos.ts:223-224` exige hoy `Bruto > 0`). Se enmienda:

- **B y B_g** (Bruto) no cambian: importe de la compra o suma de compras elegibles.
- **C_g** (coste económico del Gasto) = B_g − descuento comercial vinculado y vigente de esa
  compra. **C** = Σ C_g, igual al `costeEconomicoCaso` de SPEC39 §9. No hay suelo: SPEC39 §4
  impide que un descuento supere a su compra. Si un histórico inconsistente lo supera, el
  motor genera una incidencia «Revisar», con cobertura Parcial, y no oculta el exceso con
  `max(…,0)`.
- §7.3 reparte **C_g** en lugar de B_g, con el mismo algoritmo. §7.5: Neto(g) = C_g − Rec(g);
  N = C − R.
- **Reparto válido** = `W > 0` y **al menos una compra elegible**, con `C ≥ 0`. Una devolución
  total deja C = 0 y el caso sigue repartido, con cuotas 0 y `Exceso_p` = Aportado_p. Sin compras
  elegibles sigue siendo «Sin repartir»: coste cero con compras no es ausencia de compras.
- Si el motor no puede leer el descuento, la cobertura es Parcial; nunca se asume 0.
- **Inventario previo a DEV:** todos los consumidores de B y de N (informes, Flujo, Resumen
  anual, E3.6) declaran si consumen B (bruto) o C (coste) y no cambian de significado sin que
  se les avise.

### 4.2 Aportado negativo

`Aportado_p < 0` solo puede aparecer si se anula el movimiento bancario de una aportación
entrante, hecho que esta enmienda no controla. El contrato es:

- **Bloqueo en el servicio:** cualquier alta, rectificación, anulación o cambio de participante
  hecho por la app que deje `Aportado_p < 0` se rechaza con 409 (I-E1-3). Se aplica a la
  aportación entrante, no solo a la regularización.
- **Si aun así ocurre** (por ejemplo, una anulación del movimiento por una vía previa): no se
  recorta a cero; incidencia **«Revisar · regularización superior a lo aportado»** que bloquea
  Cerrado (P-F6); Recuperado, Neto y cobertura **Parciales**; R-MP no distribuye un Recuperado
  negativo; la detección de bajas con aportación usa `≠ 0`, no `> 0`.

**Estados.** No cambian. Un caso Cerrado que recibe una devolución pasa a **Excedido**; una
regularización igual al exceso lo devuelve a **Cerrado**, si no hay incidencias. Si un cambio
posterior —partes o nuevas compras— sube la cuota por encima de lo aportado neto, aparece
**Pendiente**, y es correcto: el tercero vuelve a deber.

**Fechas derivadas.** La «fecha de reparto cubierto» y la «fecha de exceso» se evalúan en orden
cronológico sobre aportaciones **y** regularizaciones, con desempate por ID estable. La fecha de
la última regularización se muestra aparte de la de la última aportación. La fecha de una
regularización no puede ser anterior a la del primer cobro acreditado de ese tercero: 422.

## 5 · Operaciones permitidas y prohibidas

| Operación | Resultado |
| --- | --- |
| `Transferencia` interno → S000, REF CAT013 con ficha, Tercero de la ficha, `importe ≤ límite` (abajo), evidencia y procedencia | **Permitida solo como regularización** |
| `Transferencia` interno → S000 sin REF CAT013, sin ficha o sin participante | 422: es una salida Exterior ordinaria y sigue prohibida |
| Regularización con `importe > límite` o con `límite = 0` | 422: no hay deuda con ese tercero; no se crea un pendiente inverso |
| Regularización desde un Saldo con régimen Comida | 422 (`comida.ts:972-983`, `e35.ts:391-393` los señalan como huecos de cobertura) |
| Regularización al Titular | 422: el Titular no tiene aportación que devolver (F3) |
| Regularización con Saldo origen inactivo, de tipo Exterior, Manual o Control Exterior | 422 |
| `Devolución de gasto` o Gasto/Ingreso usado como regularización | 422: SPEC39 separa las fuentes (`AC-D25`) |
| Transferencia interna → interna con REF CAT013 | No regulariza ni aporta; conserva su efecto bancario |
| Acreditar a la vez como aportación y como regularización, o a dos terceros | Imposible: 0..1 por movimiento, y el sentido lo fija el hecho |

**Límite.** Para un Tercero activo es `Exceso_p`; para una baja, `Aportado_p` (R4). Se calcula
con el motor central, con las devoluciones vigentes de SPEC39, en la misma transacción
IMMEDIATE que escribe. Se compara contra la huella `contexto` que mostró el preview
(`IMPACT_CHANGED`, `compartidos.ts:1012-1042`): si cambió, 409 y nuevo preview; si no cambió y el
límite no alcanza, 422. Esa huella debe incluir los vínculos de devolución de las compras del
caso, hoy fuera de ella porque pueden no llevar la REF del caso. Dos regularizaciones
concurrentes no pueden superar juntas el límite.

## 6 · Rectificación, anulación e historia

Se aplica §15.8 de D5, con estas reglas para la regularización:

- **Anular** la regularización o su movimiento lo saca del motor, conserva metadatos, evidencia y
  auditoría, y **vuelve a mostrar el Exceso**. No modifica el cobro original ni crea un hecho
  ficticio (SPEC39 `AC-D26`). No se puede reactivar ni hacer DELETE.
- Rectificar importe, fecha u origen exige vista de impacto, motivo, revisión y auditoría.
  Aumentar el importe o cambiar el participante revalida
  `nuevo ≤ max(Cobrado_p − Σ otras regularizaciones de p − Asignado_p, 0)` (para una baja,
  sin restar `Asignado_p`). **Reducir el importe o cambiar solo la fecha siempre se permite**,
  salvo la regla de fechas del §4.
- Mientras la acreditación esté vigente, son inmutables el Tipo, la Referencia, el destino `S000`
  y el sentido. Para cambiarlos se anula y se registra un hecho nuevo.
- Si se cambia el participante, el nuevo debe ser un Tercero **activo** de la misma ficha con
  límite suficiente (D5 §15.8, sin excepción).
- Un cambio de partes, participantes o compras que deje `Aportado_p < 0` se rechaza con 409
  (§4.2); un cambio que deje `Exceso_p` positivo o `Pendiente_p` positivo es correcto y solo
  cambia el estado.

## 7 · Persistencia y versión de esquema

Contrato sin SQL; los detalles concretos se cierran en el paquete DEV autorizado.

1. **Migración sucesora explícita.** **No** reescribe v17 ni v32, que ya están publicadas.
   SPEC38 §I3 propone **v33** para la retirada de fotos de #548, y #538 necesita otra para el
   trigger de `comida-schema.ts:173-178`. Cada reconstrucción de `movimientos` arrastra sus
   dependientes: se **propone una sola migración coordinada** con #538 y #548, y el número se
   cierra antes de DEV. Se registra en `schema-catalog.ts` con contrato admitido y manifiesto.
   La prueba enumera los dependientes de forma dinámica, como `comida-schema.ts`, no con una
   lista fija.
2. **CHECK de `movimientos`.** Solo se relaja la **forma** para `Transferencia`:
   `origen != destino`, sin Partida ni Subtipo, y como mucho un extremo `S000`. CAT013, ficha,
   participante, límite y evidencia siguen siendo reglas del servicio. Cualquier otra
   Transferencia con `S000` sigue rechazándose en el servicio, como hoy.
3. **`movimiento_compartido`.** Con la columna `sentido` de R5. Los triggers de forma admiten
   dos alternativas:
   - **aportación:** `origen = 'S000'`, destino interno elegible y Tercero **activo** en el alta
     (igual que hoy);
   - **regularización:** `destino = 'S000'`, origen interno elegible y Tercero de la ficha,
     **activo o de baja** (R4), solo en el alta.

   El límite **no** se valida en un trigger: depende del motor. El servicio lo valida en la
   transacción. Un trigger sobre `movimientos` impide cambiar `tipo`, `referencia`, `origen` o
   `destino` de un movimiento con acreditación vigente.
4. **Migración conservadora.** Reconstrucción con copia, como v17. Conserva IDs, auditorías, FK,
   triggers y CHECK del resto de tipos. Sin reseed, sin backfill, sin crear regularizaciones a
   partir de datos existentes. `PRAGMA foreign_key_check` vacío.
5. **Backup y restore.** Un backup de la versión anterior se importa y migra. Un backup con
   regularizaciones **no** se restaura con un binario que no las entienda: falla cerrado
   (SPEC39 §11). Verify y restore comprueban que **toda Transferencia vigente hacia `S000` tiene
   una acreditación de regularización**: sin ella es un huérfano y se rechaza.
6. **Lectores de `movimiento_compartido`.** Inventario obligatorio, con un AC por lector, de
   los que hoy suman la tabla sin distinguir el sentido: `aportaciones.ts`, `compartidos.ts`,
   `movement-ledger.ts`, `e410-revalidacion.ts`, `e49.ts`, `precierre.ts`, `e410-recierre.ts` y
   backup. Cada uno filtra por `sentido`.
7. Auditoría en `compartido_audit`, con acciones propias de regularización, e idempotencia en
   `compartido_attempts`. No se crea una auditoría ni un contador paralelos.

## 8 · API y UI

- **UI:** la acción «Devolver al tercero» aparece en la ficha **solo** si algún Tercero tiene
  `Exceso_p > 0`. Formulario dedicado con:
  - caso y Referencia bloqueados;
  - tercero, solo entre los que tienen exceso;
  - importe, con el máximo visible;
  - fecha, Saldo origen, evidencia y procedencia.

  El preview muestra el antes y el después de Exceso, Recuperado, Neto y estado, y el efecto
  bancario: −importe en el Saldo de origen. Aviso: «es una Transferencia a Exterior; no es Gasto
  ni devolución de compra». El formulario común de Transferencia sigue sin Exterior.
- **API:** se extiende el bloque `compartido` de `POST /api/movimientos/impacto` y
  `POST /api/movimientos` (D5 §15.6), sin endpoint paralelo de hechos. El sentido se deduce del
  movimiento. Para acreditar un movimiento interno → S000 que ya exista, se usa la vía de
  históricos de D5, con las mismas reglas y el mismo límite. Hoy no existe ninguno: el CHECK lo
  impide.
- **Lectura:** la ficha devuelve, por Tercero, `cobrado`, `regularizado`, `aportado`,
  `pendiente` y `exceso`, junto con la lista de regularizaciones con su procedencia y su estado.
  Se conservan las claves existentes. `aportado` pasa a ser neto: es un **cambio semántico
  declarado** que se prueba en el contrato (SPEC39 §2.3).
- **Errores:** los mismos que D5: 404, 409, 422 y 401 con borrador. Los logs no llevan evidencia
  ni datos personales.

## 9 · Consumidores

- **Flujo mensual** (SPEC39 §10, `AC-D32`): `ajusteCompartidos` y `R_adj` usan el Aportado neto.
  La regularización entra con signo inverso, por atribución a las compras del intervalo. La
  memoria de caja muestra cobros y salidas por su fecha real, cada uno con su signo, sin volver a
  sumarlos a `S_aj`.
- **Resumen anual:** consume Flujo; sin fórmula propia.
- **GRE y planificación** (SPEC39 §7, SPEC33-E1): la regularización **no** es gasto ni ingreso,
  no cambia `GRE` ni `G`, y solo afecta a `S` como cualquier hecho bancario real.
- **Cierres** (#547): la regularización es un hecho nuevo que puede dejar un ciclo cerrado como
  dirty, por el motor de impacto de #547. No crea fotografías.

- **Gate de exposición** (R6): sin #547 (v32) y #549 integrados, la regularización devuelve 503,
  igual que las devoluciones en SPEC39 §11.

## 10 · Invariantes verificables

| ID | Invariante |
| --- | --- |
| I-E1-1 | Toda regularización acreditada es una `Transferencia` vigente interno → S000, con la REF CAT013 de su ficha y un único Tercero de esa ficha. |
| I-E1-2 | Cada movimiento tiene una sola acreditación, y el sentido es el del hecho. Ningún ID de `Devolución de gasto` aparece como aportación ni como regularización. |
| I-E1-3 | `Σ regularizaciones vigentes de p ≤ Cobrado_p` en el momento de cada alta o rectificación. Si un cambio posterior rompe la igualdad, aparece una incidencia y nunca un recorte silencioso. |
| I-E1-4 | Al regularizar no cambian ni la cuota del tercero, ni el Bruto, ni el cobro original, ni el descuento comercial. |
| I-E1-5 | `N = C_T + Σ Pendiente_p − Σ Exceso_p`, con N = C − R, se sigue cumpliendo con el Aportado neto, solo si no hay bajas con Aportado ≠ 0 (condición ya existente en la base). |
| I-E1-6 | Tres conjuntos, calculados cada uno por su lado: ledger bancario por fechas, devoluciones comerciales y acreditaciones (entrantes y salientes). Sus IDs no se repiten entre conjuntos. |
| I-E1-7 | Ninguna Transferencia S000 sin acreditación compartida, salvo las que ya admitía D5, pasa el servicio. |
| I-E1-8 | Movimiento, acreditación, intento y auditoría son atómicos. Un 409 o un fallo inyectado no deja efectos parciales. |

## 11 · Criterios de aceptación (UNRUN)

| ID | Escenario | Resultado esperado |
| --- | --- | --- |
| E1-AC-01 | Compra 120, partes 50/50, devolución 30, cobro 60 (`AC-D24`) | Cuota 45, `Exceso` del tercero 15, estado Excedido. Tras regularizar 15: Aportado 45, pendiente 0, exceso 0, Cerrado. |
| E1-AC-02 | Devolución total 120 con cobro 60 (`AC-D26`) | Coste 0 verificable con la compra elegible. Exceso 60; tras regularizar 60, Cerrado. Al anular la regularización vuelve el Exceso 60, y el cobro original queda intacto. |
| E1-AC-03 | (traza de `AC-D25`) Inyectar el ID de una `Devolución de gasto` como regularización o como aportación (`AC-D25`) | Rechazo o incidencia. Nunca resta dos veces. Los tres conjuntos se reconcilian por separado. |
| E1-AC-04 | Regularizar con `importe > Exceso_p`, con `Exceso_p = 0` o al Titular | 422, sin efectos. |
| E1-AC-05 | Dos regularizaciones concurrentes que juntas superan el exceso | Una se confirma; la otra recibe 409, sin efecto parcial. |
| E1-AC-06 | Transferencia interno → S000 sin REF CAT013, sin ficha o con origen no elegible | 422. Exterior ordinario sigue cerrado. |
| E1-AC-07 | Tercero dado de baja con exceso | Se le puede regularizar; nuevas aportaciones siguen bloqueadas; no se reactiva. |
| E1-AC-08 | Anular la aportación entrante después de regularizar | `Aportado_p < 0`; incidencia «Revisar»; Parcial; Cerrado bloqueado; sin recorte. |
| E1-AC-09 | Multi-Gasto y multi-Partida | Tras regularizar, `rec(g,p)` sale del Aportado neto con céntimos exactos; la suma de Netos cuadra; se cumple la identidad de I-E1-5. |
| E1-AC-10 | (traza de `AC-D32`) Flujo y Resumen | `ajusteCompartidos` incluye la salida en sentido inverso; la caja la muestra por su fecha; no se cuenta dos veces. |
| E1-AC-11 | Rectificar importe o fecha, o cambiar participante | Impacto, revisión, auditoría y revalidación del límite. Tipo, REF, S000 y sentido son inmutables. |
| E1-AC-12 | Migración sucesora coordinada sobre una copia de la versión anterior, y base nueva equivalente (traza con `AC-D43`) | Se conservan IDs, auditorías, FK, triggers y CHECK de los demás tipos. Sin backfill. Repetir la migración no duplica nada. El contrato y el manifiesto quedan registrados. |
| E1-AC-13 | Backup y restore | Un backup anterior migra. Un backup con regularizaciones falla cerrado en un binario que no las entiende. |
| E1-AC-15 | Coste cero (§4.1): devolución total, C = 0, B = 120, compra elegible | B sigue 120; caso repartido con cuotas 0 y `Exceso_p` = Aportado_p; sin compras elegibles, «Sin repartir». Histórico con descuento > compra: incidencia Revisar, sin `max(0)`. |
| E1-AC-16 | Tercero de baja con aportado 60 (R4) | Regularización hasta 60; más, 422; el cambio de participante exige un Tercero activo. |
| E1-AC-17 | Rectificar con Pendiente posterior (cobrado 60, regularización 15, cuota sube a 50) | Aumentar a 15 o más de 10 se rechaza; reducir el importe o cambiar la fecha se permite. |
| E1-AC-18 | Devolución vinculada sin REF física, concurrente con una regularización | 409 por huella `contexto`; nuevo preview con el límite recalculado. |
| E1-AC-19 | Cada lector de `movimiento_compartido` (§7.6) | Ninguno suma una regularización como cobro; un AC por lector. |
| E1-AC-20 | Regularización desde Saldo con régimen Comida; fecha anterior al cobro | 422 en ambos casos. |
| E1-AC-21 | Transferencia vigente → S000 sin acreditación, y cambio de `destino` con acreditación vigente | Verify y restore la rechazan; el trigger bloquea el cambio. |
| E1-AC-22 | Sin #547 o #549 integrados (R6) | 503. |
| E1-AC-14 | Ficha y API | Las claves existentes se mantienen. El cambio semántico de `aportado` está cubierto por prueba de contrato. Se devuelven `cobrado`, `regularizado`, la lista y los estados de UI a 390 y 1440. |

## 12 · Cambio consecuente en spec05

spec05 (§D5, AC-31) reserva las salidas `interno → Exterior`. Esta enmienda abre **una sola
excepción**: la regularización CAT013 del §5. Igual que hizo D5, se añadirá a spec05 una nota
breve que remita aquí, sin cambiar el texto aprobado del resto. Exterior ordinario sigue
reservado.

## 13 · Fuera de alcance

- Transferencias Exterior ordinarias.
- Pagos o portal para terceros.
- Regularización automática al registrar una devolución.
- Dividir un movimiento entre terceros.
- Backfill o reclasificación de hechos existentes.
- Compensar el exceso de un tercero con el pendiente de otro (D7).
- DEV, SQL, migraciones, datos reales y despliegue.

## 14 · Revisión independiente

Revisión crítica de un **subagente independiente** (no es el veredicto de Álex), contra SPEC14,
D5, SPEC39, spec05, SPEC33-E1, SPEC38 y el código. Veredicto: **APTO CON CAMBIOS**. Resolución:

| Hallazgo | Resolución |
| --- | --- |
| Coste cero inalcanzable con §7.2 y `Bruto > 0` (bloqueante) | §4.1: B bruto intacto, coste C aparte; decisión **R7**; E1-AC-15 |
| R4: una baja no tiene `Exceso_p` (bloqueante) | Límite = `Aportado_p`; decisión **R4** elevada; E1-AC-16 |
| Cambio de participante contradice §15.8 | El reviewer sugería elevarlo como decisión; **se resolvió distinto**: se eliminó la excepción y se mantiene D5 (Tercero activo), sin decisión nueva |
| Fórmula de rectificación errónea | Corregida en §6; E1-AC-17 |
| Aportado negativo sin contrato | §4.2: 409 en el servicio, incidencia como respaldo |
| «Revisión esperada» inexistente | Huella `contexto`, ampliada a los vínculos de devolución; E1-AC-18 |
| Lectores de `movimiento_compartido` | Columna `sentido` (**R5**), inventario y E1-AC-19 |
| Régimen Comida | 422; E1-AC-20 |
| CHECK, huérfanos y guard de `movimientos` | §7.2–§7.5; E1-AC-21 |
| Gate de exposición | **R6**; E1-AC-22 |
| R2 y SPEC39 | Subconjunto admisible; coste declarado en R2 |
| Versiones | Una migración coordinada con #538 y #548 |
| Fechas, identidad condicionada, trazas | §4, I-E1-5 y E1-AC-03/10/12 como trazas |

Una segunda revisión acotada del texto nuevo (§4.1, §4.2, límite del §5, fórmula del §6 y
R4–R7) consta abajo. Las decisiones **R1–R7 son del usuario**. Álex debe verificar el conjunto
antes de la aprobación.

### Revisión acotada del texto corregido

_Pendiente de anotar el resultado._
