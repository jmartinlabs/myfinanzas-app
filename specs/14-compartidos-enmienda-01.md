# 14 — Gasto compartido: enmienda 14-E1 (regularización de salida al tercero)

Status: **APROBADA — 2026-11-23**, aprobación formal del usuario, conforme al veredicto final
**APTO** de Álex sobre el HEAD `544fecc5` (PR #562, merge `97128152` en `test`).
Fuente: mensaje humano directo del 2026-11-23, «apruebo formalmente SPEC14-E1 (#561), con R1–R7
según las decisiones acordadas». **R1–R7 aprobadas:** R1 Transferencia interno → S000 con REF
CAT013; R2 por porciones de un único Movimiento real; R3 cualquier exceso real; R4 bajas hasta su
aportado neto; R5 tabla propia de porciones (confirmada el 2026-11-23); R6 mismo gate de
exposición; R7 F1 enmendada, con B bruto y coste económico C. La aprobación es del contrato: los
**29 E1-AC permanecen `UNRUN`**.
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

- F2–F6, R-MP, R-CC, los 39 AC base y los D5-AC-01…15.
- **F1 se enmienda expresamente (R7):** `F1 Neto = Bruto − Recuperado` pasa a `Neto = Coste económico
  − Recuperado`, con `Coste económico = Bruto − descuentoEconomico` (§4.1). Sin R7 aprobada, F1
  no cambia y el coste cero no se admite.
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

Cada una llevaba una recomendación. **El usuario aprobó el 2026-11-23 las siete en la forma que recoge este documento** (ver la cabecera). La tabla conserva la alternativa descartada de cada una como historia.

| ID | Pregunta | Recomendación | Alternativa |
| --- | --- | --- | --- |
| **R1** | ¿Cómo se representa la salida? | **Una `Transferencia` real de un Saldo interno a `S000`**, con la REF CAT013 del caso: es la simétrica de la D5. | Un tipo nuevo de Movimiento. Se descarta porque añade un tipo y sus consumidores sin aportar ninguna garantía más. |
| **R2** | ¿Cómo se acredita un movimiento bancario? | **Recomendación de Álex: acreditaciones parciales** sobre un único Movimiento real. Cada porción es individual y auditable, con `suma acreditada ≤ importe real` y sin reutilizar una porción (SPEC39 §9). No se fabrican Movimientos bancarios, y se conserva la conciliación 1:1 con el extracto. **Efectos:** la cardinalidad deja de ser 0..1 (hay varias filas por Movimiento); el importe de cada porción se guarda en la acreditación, lo que **cambia I-D5-3 «sin copia de importe»** solo para las regularizaciones; hace falta un contador de porciones y su idempotencia; R5 y los E1-AC se adaptan. | **Movimiento entero a un único tercero, 0..1** (como el texto actual, igual que D5). Más simple, sin copia de importe. **Coste:** un cargo bancario que devuelva a dos terceros o a dos casos debe partirse en varios Movimientos, lo que rompe la conciliación 1:1. |
| **R3** | ¿Solo para el exceso que causa una devolución? | **Para cualquier `Exceso_p` del tercero**, venga de una devolución, de un cambio de partes o de un pago de más. La operación es la misma: devolverle dinero. | Exigir que exista una devolución vinculada. Añade un vínculo sin garantía adicional y deja sin vía el pago de más. |
| **R4** | ¿Se puede regularizar a un tercero dado de baja? | **Sí, hasta su `Aportado_p` neto íntegro.** El motor no calcula cuota ni Exceso para una baja (su Asignado es «No aplica» y su aportado ya cuenta como atribución parcial), así que el límite no puede ser `Exceso_p`. La baja impide nuevas aportaciones, no devolver lo que puso. SPEC39 §9 incluye a los inactivos con saldo pendiente. **Es una decisión financiera tuya.** El cambio de participante de una regularización exige un Tercero activo, como en D5 §15.8. | Exigir que se reactive el participante antes de pagarle. Mantiene un único límite `Exceso_p`, a costa de reabrir el participante. |
| **R5** | ¿Dónde se guarda la regularización y cómo se distingue de la aportación? | **Contrato vigente único (elegido por el usuario y confirmado el 2026-11-23):** `movimiento_compartido` conserva **solo las aportaciones de D5** (entradas desde `S000`), y la regularización vive en una **tabla propia de porciones** (§7.3). El sentido es explícito por construcción: cada tabla tiene uno solo. Los lectores de aportaciones no ven salidas; los consumidores que necesitan las salidas leen la tabla de porciones (§7.6). | Una columna `sentido` en `movimiento_compartido`: **descartada**, porque su clave es el Movimiento y R2 exige varias porciones por Movimiento. |
| **R7** | ¿Cómo se admite el coste cero (devolución total)? | **Mantener B como bruto y añadir un coste económico C_g.** C_g = B_g − `descuentoEconomico` de SPEC39 §4 (solo devoluciones elegibles; una Verificada No acreditada no descuenta). El reparto, `Exceso_p`, Neto(g) y N usan C; B sigue siendo el bruto del hecho (SPEC39 §4: «el bruto permanece en el hecho original»; AC-D32 conserva el bruto en Flujo). **Cambia el significado de N** (F1: N = C − R en lugar de B − R), por lo que se inventarían los consumidores de B y N antes de DEV. | Redefinir B como neto. Cambia el significado de B en todos sus consumidores y confunde el bruto con el coste, que SPEC39 mantiene separados. |
| **R6** | ¿Se aplica el mismo gate de exposición que a las devoluciones? | **Sí:** la regularización se expone solo con #547 (v32) y #549 integrados, bajo el mismo gate 503 de SPEC39 §11. | Sin gate. La regularización existe sin devoluciones (R3), pero comparte el motor de impacto y el estado dirty de #547. |

**Estado del texto.** Los §3–§11 recogen las decisiones aprobadas: R1, R3, R4, R5 (tabla propia,
§7.3), R6 y R7 según su recomendación, y R2 por porciones.

## 3 · Semántica

1. Una **regularización** es una `Transferencia` vigente de un Saldo interno elegible a
   `S000 · Exterior`, con la Referencia CAT013 de un caso con ficha, acreditada a uno o varios
   participantes **Tercero** de esa ficha **por porciones** (R2). Representa dinero real devuelto
   a esos terceros. Un único Movimiento bancario real puede devolver a varios terceros: no se
   fabrican Movimientos para repartirlo, y se conserva la conciliación 1:1 con el extracto.
5. **Porción.** Cada porción es una acreditación individual y auditable: Movimiento, tercero,
   importe propio (> 0), evidencia, procedencia y revisión. Reglas: `Σ porciones vigentes del
   Movimiento ≤ importe del Movimiento`; una porción no se reutiliza ni se solapa con otra.
   **Alta nueva:** una regularización se registra con `Σ porciones = importe del Movimiento`; si
   no cuadra, 422 y no se crea nada. **Hecho bancario real ya existente** (un histórico, o una
   porción anulada después): se conserva y la diferencia `importe − Σ porciones vigentes` es una
   **discrepancia de conciliación pendiente** (§5.1), nunca una regularización íntegra o
   verificada ni un dato inocuo. No se inventa ningún Movimiento para cuadrarla. Un Movimiento lleva **una sola
   Referencia**, así que sus porciones pertenecen a **un único caso**: un cargo que sirva a dos
   casos es un hecho que esta enmienda no resuelve (§13).
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

- `Recuperado_p = Aportado_p` (F2); `R = Σ` de terceros; `N = C − R` (§4.1; antes `B − R`).
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
- **C_g** (coste económico del Gasto) = B_g − `descuentoEconomico` de esa compra (SPEC39 §4,
  solo devoluciones elegibles). **C** = Σ C_g, igual al `costeEconomicoCaso` de SPEC39 §9. No hay suelo: SPEC39 §4
  impide que un descuento supere a su compra. Si un histórico inconsistente lo supera, el
  motor genera una incidencia «Revisar», con cobertura Parcial, y no oculta el exceso con
  `max(…,0)`.
- §7.3 reparte **C_g** en lugar de B_g, con el mismo algoritmo. §7.5: Neto(g) = C_g − Rec(g);
  N = C − R.
- **Reparto válido** = `W > 0` y **al menos una compra elegible**, con `C ≥ 0`. Una devolución
  total deja C = 0 y el caso sigue repartido, con cuotas 0 y `Exceso_p` = Aportado_p. Sin compras
  elegibles sigue siendo «Sin repartir»: coste cero con compras no es ausencia de compras.
- Un Gasto con C_g < 0 es **inválido**: queda fuera de C y del reparto y genera la incidencia
  «Revisar». `cuotasExactas` no admite importes negativos.
- **Consecuencia, no excepción a R-MP:** con C = 0 todas las cuotas valen 0. Un tercero con
  `Aportado_p > 0` queda en «recuperado sin cuota» (§7.4, AC-33/AC-39): incidencia «Revisar»,
  cobertura Parcial y Cerrado bloqueado **hasta regularizar**. Es lo correcto, porque hay un
  importe que devolver. Al regularizar el total, `Aportado_p = 0` y el caso puede cerrar. No se
  fabrica una atribución a los Gastos mientras tanto.
- Si el motor no puede leer el descuento, la cobertura es Parcial; nunca se asume 0.
- **Inventario previo a DEV:** todos los consumidores de B y de N (informes, Flujo, Resumen
  anual, E3.6) declaran si consumen B (bruto) o C (coste) y no cambian de significado sin que
  se les avise.

### 4.2 Aportado negativo

`Aportado_p < 0` no puede crearlo una regularización, por el límite del §5 y la regla de fechas.
Solo puede aparecer si después se anula o se rectifica a la baja una aportación entrante de D5,
cuyo contrato esta enmienda **no modifica**. Entonces:

- no se recorta a cero;
- incidencia **«Revisar · regularización superior a lo aportado»**, que bloquea Cerrado (P-F6);
- Recuperado, Neto y cobertura **Parciales**;
- R-MP no distribuye un Recuperado negativo, y la detección de bajas con aportación usa `≠ 0`.

Endurecer D5 para bloquear esa anulación es una mejora posible y queda **fuera** de esta
enmienda.

**Estados.** No cambian. Un caso Cerrado que recibe una devolución parcial pasa a **Excedido**; si la devolución es **total** y deja C = 0 con aportaciones, pasa a «Revisar» hasta regularizar (§4.1); una
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
| `Transferencia` interno → S000, REF CAT013 con ficha, con una o más porciones a Terceros de la ficha, cada una `≤ límite` de su tercero (abajo), `Σ porciones = importe del Movimiento` en el alta, evidencia y procedencia | **Permitida solo como regularización** |
| `Transferencia` interno → S000 sin REF CAT013, sin ficha o sin participante | 422: es una salida Exterior ordinaria y sigue prohibida |
| Porción con `importe > límite` o con `límite = 0` | 422: no hay deuda con ese tercero; no se crea un pendiente inverso |
| `Σ porciones > importe del Movimiento`, o una porción reutilizada o duplicada | 422; con concurrencia, 409 para la segunda |
| Alta nueva con `Σ porciones < importe del Movimiento` | 422: una salida Exterior sin destino acreditado sigue prohibida; no hay salidas Exterior «no atribuidas» como caso normal |
| Regularización desde un Saldo con régimen Comida | 422 (`comida.ts:972-983`, `e35.ts:391-393` los señalan como huecos de cobertura) |
| Regularización al Titular | 422: el Titular no tiene aportación que devolver (F3) |
| Regularización con Saldo origen inactivo, de tipo Exterior, Manual o Control Exterior | 422 |
| Regularización desde un Saldo con **`Permite salida a Exterior` = No** | 422. La regularización no abre una vía indirecta de salida: el Saldo origen debe tener el atributo maestro en Sí (spec01). El caso CAT013 no lo exime. Si R1 se aprueba, E1-AC-23 lo prueba. |
| `Devolución de gasto` o Gasto/Ingreso usado como regularización | 422: SPEC39 separa las fuentes (`AC-D25`) |
| Transferencia interna → interna con REF CAT013 | No regulariza ni aporta; conserva su efecto bancario |
| Acreditar un mismo Movimiento como aportación y como regularización | Imposible: el sentido lo fija el hecho (`origen`/`destino` respecto a `S000`) |
| Acreditar un Movimiento a dos casos | Imposible: una Referencia por Movimiento |

**Límite de una porción** (por tercero) = `max(Aportado_p − Asignado_p, 0)`, descontando las
otras porciones vigentes del mismo tercero, con `Asignado_p = 0` para una baja (R4) o cuando
C = 0 (§4.1). Es `Exceso_p` para un Tercero activo con cuota. La **fecha** exige además
`Cobrado_p acumulado a esa fecha ≥ Regularizado_p acumulado incluida esta`: no se puede devolver
antes de haber cobrado. Se calcula
con el motor central, con las devoluciones vigentes de SPEC39, en la misma transacción
IMMEDIATE que escribe. Se compara contra la huella `contexto` que mostró el preview
(`IMPACT_CHANGED`, `compartidos.ts:1012-1042`): si cambió, 409 y nuevo preview; si no cambió y el
límite no alcanza, 422. Esa huella debe incluir los vínculos de devolución de las compras del
caso, hoy fuera de ella porque pueden no llevar la REF del caso. Dos regularizaciones
concurrentes no pueden superar juntas el límite.

### 5.1 Discrepancia de conciliación pendiente

`discrepancia(M) = importe(M) − Σ porciones vigentes(M)` para cada Movimiento regularizante
vigente. Si es > 0:

- el motor genera la incidencia **«Revisar · salida sin acreditar»**, con Movimiento e importe;
  **bloquea Cerrado** (P-F6) y deja la cobertura **Parcial** mientras exista;
- la ficha y la conciliación bancaria la muestran como **discrepancia pendiente**, nunca como
  regularización íntegra ni verificada, y el importe sin acreditar no se suma a ningún tercero;
- no cambia el efecto bancario del Movimiento, que se conserva;
- se resuelve **acreditando porciones adicionales** dentro del límite de cada tercero o, si la
  salida no pertenece a este caso, por los procedimientos vigentes de rectificación o anulación
  del Movimiento. No se crea ningún Movimiento para cuadrarla;
- ejemplo de control: Movimiento 100, porciones 60 y 0 → discrepancia 40; Movimiento 100 con
  porciones 60 y 40, anular la de 40 → discrepancia 40, con el efecto bancario intacto.

Esta enmienda **no** permite salidas Exterior no atribuidas como situación normal: si se quisiera,
sería una decisión material nueva del usuario.

## 6 · Rectificación, anulación e historia

Se aplica §15.8 de D5, con estas reglas para la regularización:

- **Anular una porción** la saca del motor y libera esa parte del Movimiento, conserva metadatos,
  evidencia y auditoría, y **vuelve a mostrar el Exceso** de ese tercero. **Anular el Movimiento**
  anula todas sus porciones. Una porción tiene `anulada` propio; no se reactiva. No modifica el cobro original ni crea un hecho
  ficticio (SPEC39 `AC-D26`). No se puede reactivar ni hacer DELETE.
- Rectificar el importe de una porción, su tercero, o el importe, la fecha o el origen del
  Movimiento exige vista de impacto, motivo, revisión y auditoría. Reducir el importe del
  Movimiento por debajo de `Σ porciones vigentes` se rechaza con 422. Aumentar una porción o
  cambiar su participante revalida
  `nuevo ≤ max(Cobrado_p − Σ otras regularizaciones de p − Asignado_p, 0)` (con `Asignado_p = 0`
  para una baja o con C = 0). Un cambio de origen revalida además Comida, Saldo inactivo y
  Exterior (§5). **Reducir el importe o cambiar solo la fecha siempre se permite**,
  salvo la regla de fechas del §4.
- Mientras la acreditación esté vigente, son inmutables el Tipo, la Referencia, el extremo `S000`
  y el sentido. El otro extremo (el Saldo interno) sí se rectifica, como en D5 §15.8. Para cambiarlos se anula y se registra un hecho nuevo.
- Si se cambia el participante de una porción, el nuevo debe ser un Tercero **activo** de la misma ficha con
  límite suficiente (D5 §15.8, sin excepción).
- Un cambio de partes, participantes o compras no altera `Aportado_p`: puede dejar `Exceso_p` o
  `Pendiente_p` positivos, y solo cambia el estado.

## 7 · Persistencia y versión de esquema

Contrato sin SQL; los detalles concretos se cierran en el paquete DEV autorizado.

1. **Migración sucesora explícita.** **No** reescribe v17 ni v32, que ya están publicadas.
   SPEC38 §I3 propone **v33** para la retirada de fotos de #548, y #538 necesita otra para el
   trigger de `comida-schema.ts:173-178`. Cada reconstrucción de `movimientos` arrastra sus
   dependientes. **No se asume que v33 ni una migración conjunta estén autorizadas.** Propiedad,
   secuencia y gates se fijan así, sin inventar número:
   - **Propiedad:** la migración de esta enmienda es **propia de SPEC14**, como exige SPEC39
     §9/§11; no se funde con la de #548 ni con la de #538 salvo decisión expresa del usuario.
   - **Secuencia:** solo existe tras aprobar esta enmienda y recibir autorización de DEV; su número
     es el siguiente libre en ese momento, contrastado con `schema-catalog.ts` y con las
     propuestas de #538/#548. Si coinciden en el tiempo, se coordina la secuencia, no el número
     de hoy.
   - **Gates:** contrato admitido y manifiesto propios, sin reescribir v17 ni v32; la prueba
     enumera los dependientes de `movimientos` de forma dinámica, como `comida-schema.ts`.
2. **CHECK de `movimientos`.** Solo se relaja la **forma** para `Transferencia`:
   `origen != destino`, sin Partida ni Subtipo, y como mucho un extremo `S000`. CAT013, ficha,
   participante, límite y evidencia siguen siendo reglas del servicio. Cualquier otra
   Transferencia con `S000` sigue rechazándose en el servicio, como hoy.
3. **Tabla de porciones (R2) y sentido (R5).** `movimiento_compartido` (D5) tiene como clave el
   Movimiento: admite una fila por Movimiento y **no puede** contener varias porciones. Se
   propone, por tanto, una **tabla propia de porciones de regularización** (`regularizacion_
   compartido` en este documento; nombre provisional), con identificador estable, Movimiento,
   Referencia, participante, importe de la porción en céntimos, evidencia, procedencia,
   revisión del Movimiento leída, revisión propia, `anulada`, y marcas de tiempo. El
   **sentido explícito** de R5 queda garantizado por construcción: lo que está en esa tabla es
   regularización y lo que está en `movimiento_compartido` es aportación. **R5, tal como se
   eligió (una columna `sentido` en `movimiento_compartido`), se sustituye por esta separación
   porque la clave de D5 lo impide; confirmado por el usuario el 2026-11-23.** Con esto, `movimiento_compartido` sigue siendo solo de aportaciones D5; cada consumidor se
   delimita en §7.6: unos leen aportaciones, otros leen porciones, y ninguno suma una salida
   como cobro.
   - El importe de la porción **se copia en la acreditación**: es una excepción a I-D5-3 («sin
     copia de importe»), limitada a las regularizaciones. El importe, la fecha, el origen, el
     destino y la Referencia del Movimiento se siguen leyendo del hecho canónico.
   - **Triggers de forma:** Movimiento `Transferencia` con `destino = 'S000'`, origen interno
     elegible, misma Referencia CAT013 que la porción, Tercero de la ficha (activo o de baja,
     R4) solo en el alta, importe > 0, y no anulado.
   - **Suma acotada:** `Σ porciones vigentes ≤ importe del Movimiento`, comprobada por el servicio
     en la transacción y, si es viable, por un trigger sobre la tabla de porciones y sobre
     `movimientos` (reducción de importe). El límite por tercero **no** va en un trigger: depende
     del motor.
   - Un trigger sobre `movimientos` impide cambiar `tipo`, `referencia` y el extremo `S000` de un
     Movimiento con alguna porción vigente; el Saldo interno sigue rectificable.
4. **Migración conservadora.** Reconstrucción con copia, como v17. Conserva IDs, auditorías, FK,
   triggers y CHECK del resto de tipos. Sin reseed, sin backfill, sin crear regularizaciones a
   partir de datos existentes. `PRAGMA foreign_key_check` vacío.
5. **Backup y restore.** Un backup de la versión anterior se importa y migra. Un backup con
   regularizaciones **no** se restaura con un binario que no las entienda: falla cerrado
   (SPEC39 §11). Verify y restore comprueban que **toda Transferencia vigente hacia `S000` con
   REF CAT013 tiene al menos una fila de porción** (vigente o anulada) y que
   `Σ porciones vigentes ≤ importe`. Sin ninguna fila es un huérfano y se rechaza; con la suma
   menor que el importe se conserva y se informa como discrepancia (§5.1), no se rechaza.
6. **Lectores, por consumidor.**
   - **Leen aportaciones (`movimiento_compartido`), sin cambio de contrato:** `aportaciones.ts`,
     `e410-revalidacion.ts`, `e49.ts`, `precierre.ts`, `e410-recierre.ts` y la parte de
     `compartidos.ts` que calcula `Cobrado_p`.
   - **Deben leer además las porciones:** `compartidos.ts` (`Regularizado_p`, discrepancia),
     `movement-ledger.ts`, Flujo (`ajusteCompartidos`), la reconciliación de cierres (#547),
     backup/restore y verify.
   - Inventario obligatorio, con un AC por consumidor; ninguno suma una salida como cobro.
7. Auditoría en `compartido_audit`, con acciones propias de porción, e idempotencia en
   `compartido_attempts`, con clave por porción: repetir el alta no duplica la porción ni consume
   la suma dos veces. No se crea una auditoría ni un contador paralelos.

## 8 · API y UI

- **UI:** la acción «Devolver al tercero» aparece en la ficha **solo** si algún Tercero tiene
  límite > 0, incluidas las bajas (R4). Formulario dedicado con:
  - caso y Referencia bloqueados;
  - una o varias **porciones**: tercero (solo entre los que tienen límite > 0) e importe, con el
    máximo visible, más el total del Movimiento y lo que falta por acreditar, que debe quedar a
    0 para poder confirmar el alta;
  - importe total del Movimiento;
  - fecha, Saldo origen, evidencia y procedencia.

  El preview muestra el antes y el después de Exceso, Recuperado, Neto y estado, y el efecto
  bancario: −importe en el Saldo de origen. Aviso: «es una Transferencia a Exterior; no es Gasto
  ni devolución de compra». El formulario común de Transferencia sigue sin Exterior.
- **API:** se extiende el bloque `compartido` de `POST /api/movimientos/impacto` y
  `POST /api/movimientos` (D5 §15.6), sin endpoint paralelo de hechos. El bloque
  `compartido` admite una lista de porciones. Para acreditar porciones a un movimiento interno →
  S000 que ya exista, se usa la vía de históricos de D5, con las mismas reglas y el mismo límite. Hoy no existe ninguno: el CHECK lo
  impide.
- **Discrepancia:** la ficha y la conciliación muestran `discrepancia(M)` y la incidencia
  «Revisar · salida sin acreditar» (§5.1), y nunca presentan el Movimiento como regularizado
  íntegramente mientras sea > 0.
- **Lectura:** la ficha devuelve, por Tercero, `cobrado`, `regularizado`, `aportado`,
  `pendiente` y `exceso`, junto con la lista de porciones con su Movimiento, procedencia y estado.
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
| I-E1-1 | Toda porción vigente pertenece a una `Transferencia` vigente interno → S000, con la REF CAT013 de su ficha y a un Tercero de esa ficha. |
| I-E1-2 | `Σ porciones vigentes de un Movimiento ≤ su importe`, con `=` en el alta nueva; la diferencia posterior es una discrepancia pendiente (§5.1) y nunca una regularización íntegra; una porción no se reutiliza; el sentido es el del hecho. Ningún ID de `Devolución de gasto` aparece como aportación ni como regularización. |
| I-E1-3 | `Σ regularizaciones vigentes de p ≤ Cobrado_p` en el momento de cada alta o rectificación. Si una anulación o rectificación posterior de D5 la rompe, aparece la incidencia del §4.2 y nunca un recorte silencioso. |
| I-E1-4 | Al regularizar no cambian ni la cuota del tercero, ni el Bruto, ni el cobro original, ni el descuento comercial. |
| I-E1-5 | `N = C_T + Σ Pendiente_p − Σ Exceso_p`, con N = C − R, se sigue cumpliendo con el Aportado neto, solo si no hay bajas con Aportado ≠ 0 (condición ya existente en la base). |
| I-E1-6 | Conciliaciones **independientes** de: ledger bancario por fechas, devoluciones comerciales y acreditaciones (entrantes y salientes). Los **tipos de negocio son disjuntos**: un ID de `Devolución de gasto` nunca computa como aportación ni como regularización. El vínculo ledger ↔ acreditación **existe y es obligatorio** (la misma Transferencia aparece en el ledger y la referencia su acreditación): lo prohibido es el **doble cómputo**, no el join. |
| I-E1-7 | Ninguna Transferencia S000 sin acreditación compartida (aportación D5 o al menos una porción) pasa el servicio, y ninguna salida Exterior sin atribuir se da por normal. |
| I-E1-8 | Movimiento, porciones, intento y auditoría son atómicos. Un 409 o un fallo inyectado no deja efectos parciales. |

## 11 · Criterios de aceptación (UNRUN)

| ID | Escenario | Resultado esperado |
| --- | --- | --- |
| E1-AC-01 | Compra 120, partes 50/50, devolución 30, cobro 60 (`AC-D24`) | Cuota 45, `Exceso` del tercero 15, estado Excedido. Tras regularizar 15: Aportado 45, pendiente 0, exceso 0, Cerrado. |
| E1-AC-02 | Devolución total 120 con cobro 60 (`AC-D26`) | Coste 0 verificable con la compra elegible. Antes de regularizar: incidencia «Revisar» (recuperado sin cuota), Parcial, sin Cerrado, límite 60. Tras regularizar 60, Cerrado. Al anular el movimiento de la regularización vuelve el límite 60, y el cobro original queda intacto. |
| E1-AC-03 | (traza de `AC-D25`) Inyectar el ID de una `Devolución de gasto` como regularización o como aportación (`AC-D25`) | Rechazo o incidencia. Nunca resta dos veces. Los tres conjuntos se reconcilian por separado. |
| E1-AC-04 | Regularizar con `importe > límite`, con `límite = 0`, al Titular o con una fecha anterior al cobro | 422, sin efectos. |
| E1-AC-05 | Dos porciones concurrentes que juntas superan el límite del tercero o el importe del Movimiento | Una se confirma; la otra recibe 409, sin efecto parcial. |
| E1-AC-06 | Transferencia interno → S000 sin REF CAT013, sin ficha o con origen no elegible | 422. Exterior ordinario sigue cerrado. |
| E1-AC-07 | Tercero dado de baja con aportado neto > 0 | Se le puede regularizar hasta su límite (R4), y sus cuotas pasan a los demás;  nuevas aportaciones siguen bloqueadas; no se reactiva. |
| E1-AC-08 | Anular la aportación entrante (D5, sin cambios) después de regularizar | `Aportado_p < 0`; incidencia «Revisar»; Parcial; Cerrado bloqueado; sin recorte; R-MP sin Recuperado negativo. |
| E1-AC-09 | Multi-Gasto y multi-Partida | Tras regularizar, `rec(g,p)` sale del Aportado neto con céntimos exactos; la suma de Netos cuadra; se cumple la identidad de I-E1-5. |
| E1-AC-10 | (traza de `AC-D32`) Flujo y Resumen | `ajusteCompartidos` incluye la salida en sentido inverso; la caja la muestra por su fecha; no se cuenta dos veces. |
| E1-AC-11 | Rectificar el importe de una porción, el importe o la fecha del Movimiento, o cambiar participante | Impacto, revisión, auditoría y revalidación del límite. Tipo, REF, S000 y sentido son inmutables. |
| E1-AC-12 | Migración sucesora coordinada sobre una copia de la versión anterior, y base nueva equivalente (traza con `AC-D43`) | Se conservan IDs, auditorías, FK, triggers y CHECK de los demás tipos. Sin backfill. Repetir la migración no duplica nada. El contrato y el manifiesto quedan registrados. |
| E1-AC-13 | Backup y restore | Un backup anterior migra. Un backup con regularizaciones falla cerrado en un binario que no las entiende. |
| E1-AC-15 | Coste cero (§4.1): devolución total, C = 0, B = 120, compra elegible | B sigue 120; caso repartido con cuotas 0; con Aportado > 0, «Revisar» hasta regularizar; Gasto con C_g < 0, inválido; sin compras elegibles, «Sin repartir». Histórico con descuento > compra: incidencia Revisar, sin `max(0)`. |
| E1-AC-16 | Tercero de baja con aportado 60 (R4) | Regularización hasta 60; más, 422; el cambio de participante exige un Tercero activo. |
| E1-AC-17 | Rectificar con Pendiente posterior (cobrado 60, regularización 15, cuota sube a 50) | Con la cuota en 50, el máximo es 60 − 50 = 10: pasar a más de 10 se rechaza; reducir el importe o cambiar solo la fecha se permite. |
| E1-AC-18 | Devolución vinculada sin REF física, concurrente con una regularización | 409 por huella `contexto`; nuevo preview con el límite recalculado. |
| E1-AC-19 | Cada lector de `movimiento_compartido` y cada lector de porciones (§7.6) | Los primeros no cambian; los segundos suman Regularizado_p una sola vez; un AC por lector. |
| E1-AC-20 | Regularización desde Saldo con régimen Comida; fecha anterior al cobro | 422 en ambos casos. |
| E1-AC-21 | Transferencia vigente → S000 sin acreditación, y cambio de `tipo`, `referencia` o extremo `S000` con acreditación vigente | Verify y restore la rechazan lo primero; el trigger bloquea lo segundo; el Saldo interno sí se rectifica. |
| E1-AC-23 | Saldo origen con `Permite salida a Exterior` = No (R1) | 422; sin vía indirecta. |
| E1-AC-24 | Un Movimiento de 100 con porciones de 60 a un tercero y 40 a otro | Un solo Movimiento y conciliación 1:1 con el extracto; Aportado de cada tercero baja lo que su porción; suma 100 ≤ 100. |
| E1-AC-28 | Alta nueva con Movimiento 100 y porciones que suman 60 | 422, sin Movimiento ni porciones. |
| E1-AC-29 | Hecho bancario existente: Movimiento 100, porciones 60, resto 40; y anular una porción de un Movimiento 100 = 60 + 40 | Discrepancia 40 en ambos casos; incidencia «Revisar · salida sin acreditar», Parcial, Cerrado bloqueado; el efecto bancario y el Movimiento se conservan; no aparece como regularización íntegra; verify y restore lo aceptan como discrepancia y rechazan un Movimiento sin ninguna fila de porción. |
| E1-AC-25 | Porción que supera el importe del Movimiento o duplicada; reducir el importe del Movimiento por debajo de la suma | 422 y sin efecto; la reutilización de una porción se rechaza. |
| E1-AC-26 | Anular una porción; anular el Movimiento | La primera libera esa parte y vuelve el Exceso de ese tercero; la segunda anula todas. Sin DELETE ni reactivación. |
| E1-AC-27 | Repetir el alta de una porción con la misma clave | Un solo efecto; la suma no se consume dos veces. |
| E1-AC-22 | Sin #547 o #549 integrados (R6) | 503. |
| E1-AC-14 | Ficha y API | Las claves existentes se mantienen. El cambio semántico de `aportado` está cubierto por prueba de contrato. Se devuelven `cobrado`, `regularizado`, la lista y los estados de UI a 390 y 1440. |

## 12 · Cambio consecuente en spec05

spec05 (§D5, AC-31) reserva las salidas `interno → Exterior`. Esta enmienda abre **una sola
excepción**: la regularización CAT013 del §5. Igual que hizo D5, spec05 incluye una **nota de referencia** (§D5-5)
que remite aquí y no cambia ninguno de sus criterios aprobados. Exterior ordinario sigue
reservado.

## 13 · Fuera de alcance

- Transferencias Exterior ordinarias.
- Pagos o portal para terceros.
- Regularización automática al registrar una devolución.
- Un Movimiento que sirva a dos casos (una Referencia por Movimiento).
- Dividir un Movimiento bancario en varios artificiales.
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
| Aportado negativo sin contrato | §4.2: D5 no se toca; la incidencia posterior es el único mecanismo (la primera versión proponía 409 en el servicio y se retiró) |
| «Revisión esperada» inexistente | Huella `contexto`, ampliada a los vínculos de devolución; E1-AC-18 |
| Lectores de `movimiento_compartido` | Sentido explícito (**R5**; tabla de porciones propia por R2, §7.3), inventario y E1-AC-19 |
| Régimen Comida | 422; E1-AC-20 |
| CHECK, huérfanos y guard de `movimientos` | §7.2–§7.5; E1-AC-21 |
| Gate de exposición | **R6**; E1-AC-22 |
| R2 y SPEC39 | Subconjunto admisible; coste declarado en R2 |
| Versiones | Una migración coordinada con #538 y #548 |
| Fechas, identidad condicionada, trazas | §4, I-E1-5 y E1-AC-03/10/12 como trazas |

**Revisión de Álex (PR #562, `3cc8b6f2`):** APTO CON CAMBIOS OBLIGATORIOS; CI documental pass, sin ejecutar AC. Hallazgos: R2 (recomienda porciones, decisión del usuario), F1 enmendada expresamente por R7 (§1 y §4.1), I-E1-6 reformulada (conciliaciones independientes y tipos disjuntos, join obligatorio), guarda `Permite salida a Exterior` (§5, E1-AC-23) y versionado sin asumir v33 ni migración conjunta (§7.1). R1–R7 siguen pendientes de aprobación del usuario.

**Corrección focal tras la revisión de Álex sobre `7b737aca`:** el resto bancario no acreditado es una discrepancia pendiente (§3.5, §5.1, §7.5, §8, I-E1-2/7, E1-AC-28/29), la fila R5 queda como único contrato vigente (tabla propia) y el absoluto «Cerrado pasa a Excedido» se acota a devoluciones parciales. Sin reabrir R1–R7.

**Cambios tras las elecciones del usuario (2026-11-23):** R2 por porciones reescribe §3, §5–§8, §10, §11 y §13 y añade E1-AC-24…27; la corrección focal posterior añade E1-AC-28 y 29. La revisión focal de Álex sobre `7b737aca` y su veredicto final sobre `544fecc5` cubren ese texto.

Una segunda revisión acotada del texto nuevo (§4.1, §4.2, límite del §5, fórmula del §6 y
R4–R7) consta abajo. Las decisiones **R1–R7 son del usuario**. Álex verificó el conjunto en su
revisión focal y en su veredicto final (PR #562).

### Revisión acotada del texto corregido

Mismo subagente, sobre el commit `4abe1db8`. Veredicto: **APTO CON CAMBIOS**. Sostiene la
fórmula de rectificación, I-E1-5 y N = C − R. Resolución:

| Hallazgo | Resolución |
| --- | --- |
| Con C = 0 el tercero cae en «recuperado sin cuota» (bloqueante) | Se asume como consecuencia de la regla aprobada, no como excepción: «Revisar» hasta regularizar, sin atribución inventada (§4.1); E1-AC-02/15 corregidos. **El reviewer ofrecía una excepción a R-MP o esta alternativa; elegí la segunda por no tocar una regla aprobada.** |
| C_g distinto de `descuentoEconomico` | Alineado con SPEC39 §4 |
| C_g negativo rompe `cuotasExactas` | Gasto inválido con incidencia |
| El trigger de §7 bloqueaba rectificaciones de D5 | Solo se protege `tipo`, `referencia` y el extremo `S000` |
| §4.2 contradecía §1 al endurecer D5 | D5 no se toca; incidencia como único mecanismo; endurecer D5 queda fuera |
| «Anular la regularización» sin columna | Equivale a anular el movimiento |
| R4 inalcanzable desde la UI | Acción y selector por límite > 0, bajas incluidas; consecuencia declarada en E1-AC-07 |
| Menores | Corregidos: `N = C − R`, «siete», #549 en R6, «límite» en AC, fecha por acumulado, AC-17 |

**Desacuerdo material pendiente:** ninguno. Los cambios posteriores a esta revisión proceden de
sus hallazgos y de los de Álex, y fueron verificados por él (veredicto final **APTO**).
