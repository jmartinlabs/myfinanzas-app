# 14 — Gasto compartido y reparto verificable: Specification
Status: APPROVED — aprobación completa de la specification por el usuario, vía
coordinador (2026-10-25). Q1–Q7, F1–F5, P-F6, recuperación multi-Partida (R-MP) y
Cerrado con coste propio (R-CC) confirmadas. D5/Exterior sigue OPEN. La aprobación
no autoriza desarrollo14, SQL, Excel, push ni merge.
**División documental Base B APPROVED (usuario, 2026-10-26): §14.** La aprobación
se limita al alcance/condiciones B; no aprueba la enmienda D5 ni desarrollo.
Brainstorming, respuestas y revisiones: [14-compartidos-brainstorming.md](14-compartidos-brainstorming.md)
Base: `fa8a01ee72ee622e6d3f71cd170e5d399376473e`; rama `codex/spec14-compartidos`.
Solo especificación: no autoriza desarrollo, SQL real, commit, push ni merge.

## 1. Contexto y fuentes
- Roadmap: E3.2-AC1..3, pruebas y fuera de alcance; transversal E3.6
  («E3.6-AC2, Referencia no cambia el tipo del Gasto»; prueba «caso compartido
  multi-Partida»; «E3.6-AC1, flujo incorpora Neto compartido central y no
  descuenta dos veces Anticipos/Comida»).
- Referencia funcional v5.11 R4 (línea de Compartidos): «Gasto conserva Partida e
  importe real; aportaciones son Transferencias desde Exterior con Referencia y
  Quién paga. La ficha calcula bruto, Recuperado, Neto, Exceso, estado/fechas;
  participantes tienen rol/partes/cobertura/pendiente/exceso. Cerrado significa
  reparto cubierto, no Neto cero. Informes consumen Neto centralizado con
  atribución proporcional cuando corresponda.» R4 no fija el signo del Neto: lo
  fija F1 (§2.2).
- spec12 (H Gasto): «Gasto bruto app NO equivale a H; neto ajustado por
  Compartidos permanece No disponible hasta integración».
- E1.5 y código leído en la base: altas nuevas exigen origen/destino internos y
  rechazan Exterior.
- Precedente Q9 de spec13: rol acreditado con metadatos mínimos; sin replicar
  orientación/par que R4 no exige en Compartidos (D4).
- DT2/DT8 como fuente de precisión/presentación.
- Estado de entregas (dato del coordinador, no verificado en este checkout):
  dev13 reanudado tras B13-1; Q9 integrada en PR70; candidato dev13 publicado en
  PR71 pendiente de cierre de CI/QA. Dev12/PR67 separado y sin merge.
- Excel sigue fuente de verdad hasta traspaso autorizado; esta spec no modifica
  SQL operativo ni datos reales.

## 2. Decisiones confirmadas

### 2.1 Q1–Q7 (usuario, transcripción 2026-10-25)
Textos sin cambios desde la primera versión.
- **D1** Alta atómica Referencia CAT013 + ficha 1:1; participantes como hijos
  1:N posteriores, con integridad y auditoría; sin modificar el maestro de
  Referencias innecesariamente.
- **D2** Participante identificado por ficha: ID estable, nombre editable,
  roles y auditoría; sin maestro global. No se deduce ninguna aportación de un
  Saldo propio; el Saldo pagador del Gasto original (hecho bancario) se
  distingue del participante al que corresponde cada parte.
- **D3** Partes enteras; cálculo exacto en céntimos; residuo por mayor resto
  con desempate determinista por ID estable; suma de asignados = coste
  repartido exacto; las Partidas de cada Gasto real se conservan; varios
  Gastos/Partidas se tratan con atribución proporcional del motor único, sin
  inventar importes ni alterar Movimientos.
- **D4** Metadatos mínimos de acreditación «Quién paga»: asociados al ID
  canónico del Movimiento y al participante; reutilizan la auditoría,
  evidencia, revisión e idempotencia del patrón vigente; no duplican fecha,
  importe, Origen ni Destino. Q9 = precedente de integridad, no contrato de
  copia; en Compartidos no se requieren metadatos de orientación/par.
- **D5** Exterior NO se habilita: se conserva la restricción técnica vigente;
  no se simulan aportaciones externas como internas; los históricos válidos de
  Exterior se conservan con su procedencia; el bloqueo funcional y su contrato
  pendiente quedan documentados (§5); no se declara E3.2 funcionalmente
  completo mientras no pueda registrar las aportaciones que R4 exige.
- **D6** Estados y cardinalidad: no se limita el caso a un único Gasto; hay
  varios Gastos reales elegibles por Referencia, incluso con Partidas
  distintas (contrato multi-Partida de E3.6); cada Gasto conserva identidad,
  Partida, fecha e importe; el motor agrega por Referencia sin doble cómputo.
  Casos sin hechos o sin cobertura suficiente no pasan a Cerrado; fechas
  derivadas solo de hechos elegibles y cobertura verificable.
- **D7** Por participante: asignado, aportado, pendiente y exceso por
  separado; sin compensación automática entre personas; cambios de
  partes/participantes con aportaciones acreditadas exigen vista de impacto,
  motivo, auditoría y protección histórica; los movimientos bancarios nunca
  se reescriben por cambios de reparto.

### 2.2 F1–F6 (usuario, 2026-10-25)
- **F1 Neto = Bruto − Recuperado.** Puede ser negativo.
- **F2 Recuperado incluye el exceso.** Todo lo efectivamente recuperado cuenta,
  incluido el exceso de un tercero.
- **F3 El Titular participa en el reparto** con sus partes, pero no tiene que
  devolverse dinero a sí mismo: su asignado es Coste propio sin aportación
  exigible y su pendiente es 0.
- **F4 Reparto exacto en céntimos por cada Gasto y Partida** (§7.3).
- **F5 Estados: se muestra primero lo pendiente, con alerta de exceso
  simultánea** (§6).
- **F6 Importes negativos o inválidos: aceptar con precisión** (§2.3).

### 2.3 P-F6 aprobada (usuario, 2026-10-25)
Todo Gasto vinculado al caso que presente un importe inválido o incompatible con
el contrato financiero y comprometa la cobertura del Bruto bloquea «Cerrado».
- No declarar Cerrado mientras exista una incidencia relevante sin resolver.
- Mostrar «Revisar», identificando Movimiento y motivo.
- Conservar el Movimiento original y su efecto bancario.
- Mostrar únicamente subtotales acreditados como Parciales.
- No presentar Bruto, Neto ni reparto como completos mientras su cobertura esté
  comprometida.
- No convertir automáticamente importes negativos en devoluciones ni rectificar
  hechos sin autorización.
- Resuelta la incidencia mediante los procedimientos vigentes, recalcular el motor
  y determinar el estado correspondiente.

### 2.4 Recuperación multi-Partida y Cerrado con coste propio (Álex, 2026-10-25)
- **R-MP Recuperado multi-Partida.** Por cada tercero, su Recuperado acreditado se
  distribuye entre los Gastos en proporción a lo que tenía asignado en cada uno.
  Céntimos exactos, mayor resto, desempate por ID estable de Gasto. Se incluye el
  exceso íntegro, sin truncarlo. Si el tercero tiene aportaciones pero ninguna
  cuota asignada positiva, se muestra incidencia; no se divide entre cero.
  Neto Gasto = Bruto Gasto − Recuperado atribuido de terceros; Neto Partida = suma
  de los Netos de sus Gastos; Neto caso = suma de Netos por Partida = Bruto −
  Recuperado total. No se reparte directamente el Recuperado global entre Partidas.
  Si falta acreditación relevante, se muestra Parcial o No disponible.
- **R-CC Cerrado y coste propio.** Se elimina «sin aportaciones nunca Cerrado». El
  Titular participa en el reparto, pero no tiene aportación exigible hacia sí
  mismo. Con hechos y reparto verificables:
  - Sin repartir: falta reparto válido.
  - Reparto parcial: algún tercero tiene pendiente.
  - Excedido: ningún tercero tiene pendiente y existe exceso.
  - Cerrado: no hay pendientes ni excesos.
  Si coexisten pendiente y exceso: Reparto parcial más alerta de exceso. La
  incidencia relevante de cobertura (P-F6) bloquea Cerrado y se muestra como
  «Revisar». La recuperación sin cuota asignada (R-MP) se trata como incidencia
  relevante de cobertura: aplicación de P-F6 que se pide confirmar en la
  aprobación completa.

## 3. Alcance
**In:** ficha de caso compartido 1:1; mantenimiento de participantes; reparto
exacto central; recuperación atribuida por Gasto y Partida; metadatos de
acreditación D4 para aportaciones de terceros históricas o autorizadas en el
futuro; estados, alertas, incidencias y fechas derivadas; rectificaciones con
vista de impacto; consulta e historia append-only; API protegida; wireframes
390/1440.
**Out:** habilitar Transferencias Exterior; tratar como aportación un movimiento
entre Saldos propios; ingreso económico ficticio por cobros compartidos;
recálculo de netos por cada informe; maestro global de personas; campo manual de
estado; atribución por similitud o texto libre.

## 4. Modelo de datos (contrato, sin SQL)
- **Ficha de caso** (`ficha compartido`): ID estable creado con la Referencia
  CAT013 en una transacción atómica (D1); campos de nombre, creación, auditoría
  y revisión; sin estado persistido manual (§6). Integridad 1:1 verificada en
  alta y en lectura: ninguna ficha sin Referencia CAT013 ni Referencia compartida
  sin ficha.
- **Participante** (hijo, 1:N): ID estable por caso; nombre editable no clave;
  rol Tercero o Titular (F3); partes enteras ≥ 0; alta/edición/baja con
  auditoría y revisión; baja lógica sin borrar historia (D1/D7). Solo los
  Terceros tienen aportaciones exigibles.
- **Saldo pagador del Gasto original:** se muestra en lectura a partir del hecho
  bancario del Movimiento (Origen del Gasto), sin deducción automática (D2); nunca
  sustituye al participante del reparto.
- **Gastos elegibles:** Gastos reales con la Referencia del caso, no anulados y
  con importe válido (positivo). Los vinculados con importe inválido o
  incompatible que comprometa la cobertura se excluyen del Bruto como incidencia
  «Revisar» (F6, P-F6); no se corrigen ni se convierten en devoluciones. Cada
  Gasto elegible conserva identidad, Partida, fecha e importe (D6); E3.6-AC2 (la
  Referencia no cambia el tipo del Gasto).
- **Metadatos de aportación de tercero** (`acreditación compartida`, patrón D4):
  FK única por ID de Movimiento (0..1) + FK participante; solo acredita la
  persona que aporta; sin copia de importe, fecha, Origen ni Destino; evidencia y
  procedencia referidas; revisión e idempotencia reutilizadas; corrección por
  revisión, nunca borrado físico del hecho bancario.
- **Movimientos entre Saldos propios** (Transferencias internas): no tienen rol
  de aportación en Compartidos y nunca se acreditan como recuperación de terceros
  (§5). Pueden existir con la Referencia del caso sin efecto en Recuperado.

## 5. Dependencia material D5 — Exterior (gate OPEN)
Texto R4 vigente: aportaciones de terceros = Transferencias desde Exterior con
Referencia y Quién paga. Estado técnico E1.5 en la base: altas nuevas con Exterior
rechazadas. Consecuencias:
1. **Aportaciones acreditables hoy:** solo las de terceros ya existentes en datos
   históricos válidos, con su procedencia Exterior conservada y las limitaciones
   que apliquen. Ningún movimiento interno (entre Saldos propios) se admite como
   aportación acreditable: no representa dinero recuperado de otra persona
   (decisión Q5 del usuario).
2. **Altas nuevas de aportación de tercero:** bloqueadas. Esta spec no las
   habilita, no las simula con internas y no crea caso especial «Exterior
   compartido». Ningún selector, payload ni alta elude la restricción de E1.5.
3. **E3.2 NO se declara funcionalmente completo** con esta spec: la completitud
   queda condicionada a un contrato específico de Transferencias con Exterior,
   propuesto como paquete separado con autorización propia (§12).

## 6. Estados, alertas y fechas derivadas (D6, F5, P-F6, R-CC)
Estados (derivados del motor, sin campo manual), en este orden de evaluación:
- **Sin repartir:** falta reparto válido (sin partes válidas o sin Gastos
  elegibles verificables). Condición inicial de toda ficha.
- **Reparto parcial:** algún tercero tiene pendiente > 0. Si además hay exceso de
  otro tercero, se muestra la alerta de exceso a la vez (F5).
- **Excedido:** ningún tercero tiene pendiente y algún tercero aporta más de lo
  asignado; el estado identifica a qué participante corresponde cada exceso.
- **Cerrado:** no hay pendientes ni excesos de terceros. Puede coexistir con
  Neto y coste propio positivos (R4: Cerrado no es Neto cero). No se declara con
  una incidencia relevante sin resolver (P-F6).

Alertas e incidencias (no son estados; se muestran junto al estado):
- **Exceso de tercero** (F5): identifica participante e importe.
- **Revisar** (F6, P-F6): identifica Movimiento y motivo. Incluye importes
  inválidos o incompatibles y recuperación sin cuota asignada (R-MP). Bloquea
  Cerrado; conserva el Movimiento original y su efecto bancario.
- **Cobertura comprometida:** mientras haya una incidencia que afecte al Bruto o
  a la atribución, Bruto, Neto y reparto se presentan como Parciales, sin cifra de
  completitud. Solo los subtotales acreditados se muestran, como Parciales.
- **Resolución:** no hay conversión automática de negativos en devoluciones ni
  rectificación sin autorización. Resuelta la incidencia por los procedimientos
  vigentes, el motor recalcula y determina el estado.

Ejemplo de cierre (control): Bruto 150 €; coste propio del Titular 50 €; terceros
50 € + 50 € asignados; cada tercero aporta 50 €. Recuperado 100 €, Neto 50 €,
pendientes 0, excesos 0 → Cerrado.

Casos sin hechos verificables o sin cobertura suficiente no pasan a Cerrado; la
ausencia no se convierte en cobertura cumplida.

Fechas derivadas (solo con hechos elegibles que las soporten):
- Fecha del último Gasto elegible; fecha de la última aportación acreditada;
  fecha de reparto cubierto (la aportación que completa la cobertura de todos los
  terceros con asignado > 0); fecha de exceso (la aportación que supera lo
  asignado). Empates de fecha: desempate determinista por ID estable.

## 7. Motor central de reparto
Notación: B = bruto; w_p = partes enteras de p; W = Σ w_p; céntimos exactos;
g = Gasto elegible; P = Partida.

### 7.1 Definiciones
- **Bruto B** = Σ importes de Gastos elegibles (suma exacta). Excluye los importes
  inválidos (F6, P-F6), que se muestran como «Revisar»; mientras comprometan la
  cobertura, Bruto, Neto y reparto son Parciales.
- **Asignado(g,p)** = cuota de p en g según §7.3 (Titular incluido, F3).
- **Asignado_p** = Σ_g Asignado(g,p).
- **Coste propio C_T** = Asignado_T (Titular). Sin aportación exigible (F3).
- **Aportado_p** = Σ aportaciones acreditadas de p (tercero).
- **Recuperado R_p** = Aportado_p (incluye el exceso íntegro, F2).
- **Recuperado R** = Σ_p R_p (terceros).
- **Pendiente_p** = max(Asignado_p − Aportado_p, 0); **Exceso_p** = max(Aportado_p
  − Asignado_p, 0). Calculados por separado (D7); sin compensación cruzada.
- **Neto caso N** = B − R (F1). Puede ser negativo.
- **Identidad de control:** N = C_T + Σ Pendiente_p − Σ Exceso_p, sumando solo
  terceros. Se cumple porque, para cada tercero, Asignado_p − Aportado_p =
  Pendiente_p − Exceso_p.

### 7.2 Reparto válido
Reparto válido si W > 0 y B > 0. Si no hay Gastos elegibles o no hay partes
válidas, el caso queda en Sin repartir. El estado general se deriva según §6.

### 7.3 Atribución de cuotas por Gasto y Partida (F4, D3)
1. Para cada Gasto elegible g con importe c_g (céntimos) y cada participante p
   (incluido el Titular): cuota exacta = c_g × w_p / W.
2. Base entera = parte entera de la cuota exacta. Residuo = c_g − Σ bases.
3. El residuo se asigna en céntimos a los participantes con mayor resto; empate
   de resto: orden ascendente por ID estable de participante.
4. Asignado(g,p) = resultado de 1–3. Por construcción Σ_p Asignado(g,p) = c_g y
   Σ_g c_g = B.
5. Cada Gasto y su Partida suman exacto. La vista por Partida no pierde céntimos.
6. Si W = 0 o B = 0 → Sin repartir; no se fabrican ceros.

Ejemplo de control (céntimos; IDs p-001 Bea, p-002 Yo/Titular, p-003 Álex; pesos
1:1:1; G1 Partida P1 300,00 €; G2 Partida P2 150,00 €; G3 Partida P3 100,00 €):

| Gasto | Partida | p-001 Bea | p-002 Yo | p-003 Álex | Suma |
|---|---|---|---|---|---|
| G1 | P1 | 100,00 | 100,00 | 100,00 | 300,00 |
| G2 | P2 | 50,00 | 50,00 | 50,00 | 150,00 |
| G3 | P3 | 33,34 | 33,33 | 33,33 | 100,00 |
| Total | | 183,34 | 183,33 | 183,33 | 550,00 |

El residuo de G3 (0,01 €) va a p-001 por ser el primero en empate. Es un ejemplo
de control aritmético, no un test de aplicación.

### 7.4 Recuperado atribuido por Gasto (R-MP)
Para cada tercero p con R_p > 0:
1. Si Asignado_p = 0 (ninguna cuota asignada positiva) → incidencia «Revisar»
   con motivo «recuperado sin cuota asignada»; no se divide. R_p queda sin
   atribuir y el caso no puede ser Cerrado.
2. Si Asignado_p > 0: rec(g,p) = R_p × Asignado(g,p) / Asignado_p, en céntimos
   exactos por mayor resto; desempate por ID estable de Gasto ascendente. Solo
   reciben atribución los Gastos con Asignado(g,p) > 0. Σ_g rec(g,p) = R_p.
3. Recuperado atribuido de terceros en g: Rec(g) = Σ_p rec(g,p).

Ejemplo de control: Álex recupera 300 €; su asignado es 100 € en G1 y 50 € en G2
(Asignado_Álex = 150 €). rec(G1) = 300 × 100/150 = 200 €; rec(G2) = 300 × 50/150
= 100 €. Suma exacta: 300 €.

### 7.5 Netos por Gasto, Partida y caso (R-MP)
- **Neto Gasto:** Neto(g) = B_g − Rec(g) (B_g = importe del Gasto g).
- **Neto Partida:** Neto(P) = Σ Neto(g) con g en P.
- **Neto caso:** N = Σ Neto(P) = B − R, cuando no hay incidencia de atribución.
  Con incidencia, Neto caso se presenta como Parcial, no como cifra completa.
- Ejemplo: G1 300 − 200 = Neto 100 (P1); G2 150 − 100 = Neto 50 (P2); caso 150.

### 7.6 Informes
Informes consumen los Netos de §7.5 y las cuotas de §7.3 del motor central, sin
recalcular por vista (E3.2-AC3; E3.6-AC1).

## 8. Rectificación, impacto e historia (D7)
- Cambio de partes o de participantes cuando existen aportaciones acreditadas:
  **vista de impacto previa** (asignado, pendiente, exceso, atribución por Gasto y
  Neto antes y después), motivo obligatorio, auditoría y revisión; el reparto
  resultante debe cumplir §7.3.
- Protección histórica: los Movimientos bancarios nunca se reescriben ni se
  eliminan; solo los metadatos de acreditación se corrigen por revisión; la
  historia de la ficha es append-only.
- Baja de participante: solo lógica, conservando partes y aportaciones ya
  acreditadas; no deja acreditaciones huérfanas.

## 9. API y seguridad (contrato, nivel alto)
- Rutas protegidas con la autenticación vigente (MFA/sesión); autorización en
  API, no solo en UI.
- Operaciones: alta atómica de caso; alta/edición/baja lógica de participante;
  vista de impacto; cambio de reparto (motivo requerido); corrección por revisión
  de metadatos de aportación histórica; consulta de ficha con estado, alertas,
  atribución por Gasto/Partida, fechas y desglose.
- Ninguna operación de alta de aportación de tercero desde Exterior (D5).
- Validación: partes enteras ≥ 0; nombre obligatorio sin control characters
  (máximo acotado); Referencia CAT013 obligatoria; campos no editables rechazados;
  errores 404/409/422 sin información sensible; idempotencia en reintentos.
- Lecturas sin mutaciones; respuestas no obsoletas ante cambio de revisión.

## 10. Wireframes (390 / 1440)
Ejemplo común: Bruto 450,00 € (G1 Alquiler P1 300 + G2 Limpieza P2 150); Titular
1:1:1 con Bea y Álex; Álex aporta 300,00 €; Bea aporta 0,00 €. Asignado 150,00 € a
cada uno.

### W1 — Ficha de caso compartido (móvil 390)
```
┌──────────────────────────────────────┐
│ ‹ Volver   Compartido · Piso 2026    │
│ Estado: Reparto parcial              │
│ ⚠ Exceso de Álex 150,00 €            │
├──────────────────────────────────────┤
│ Bruto                    450,00 €    │
│ Recuperado               300,00 €    │
│ Neto (B − R)             150,00 €    │
│ Coste propio (Yo)        150,00 €    │
│ Por cubrir de terceros   150,00 €    │
│ Exceso de terceros       150,00 €    │
├──────────────────────────────────────┤
│ Gastos y Neto por Gasto              │
│  Alquiler P1   300,00 € · neto 100 € │
│  Limpieza P2   150,00 € · neto  50 € │
│ Neto P1 100,00 € · Neto P2 50,00 €   │
├──────────────────────────────────────┤
│ Participantes (Yo + 2 terceros)      │
│  Yo (Titular)  partes 1              │
│     asignado 150,00 € · coste propio │
│  Álex          partes 1              │
│     asignado 150,00 · aport 300,00   │
│     exceso 150,00 €                  │
│  Bea           partes 1              │
│     asignado 150,00 · aport 0,00     │
│     pendiente 150,00 €               │
│ [+ Participante] [Cambiar reparto]   │
│ [Ver aportaciones históricas]        │
└──────────────────────────────────────┘
```
Notas: el exceso de Álex (150,00 €) no compensa el pendiente de Bea (D7). Identidad
de control: 150 = 150 + 150 − 150. Neto por Gasto: rec(G1) 200 y rec(G2) 100 para
Álex (§7.4). Contraste mínimo 6:1 como referente vigente.

### W2 — Vista de impacto del cambio de reparto (390)
```
┌──────────────────────────────────────┐
│ Cambiar reparto · impacto            │
├──────────────────────────────────────┤
│ Actual: Yo 1 · Álex 1 · Bea 1        │
│ Nuevo:  Yo 1 · Álex 0 · Bea 2        │
├──────────────────────────────────────┤
│ Yo    asignado 150,00 → 150,00 €     │
│ Álex  asignado 150,00 → 0,00 €       │
│       recuperado 300,00 sin cuota    │
│       → Revisar (bloquea Cerrado)    │
│ Bea   asignado 150,00 → 300,00 €     │
│       pendiente 150,00 → 300,00 €    │
│ Neto  150,00 → Parcial (incidencia)  │
│ Las aportaciones acreditadas no      │
│ cambian; solo se recalcula el reparto│
├──────────────────────────────────────┤
│ Motivo (obligatorio) [__________]    │
│ [Cancelar]            [Aplicar]      │
└──────────────────────────────────────┘
```

### W3 — Aportación de tercero (390): estado bloqueado (D5)
```
┌──────────────────────────────────────┐
│ Aportación de tercero                │
├──────────────────────────────────────┤
│ Alta no disponible.                  │
│ Las aportaciones nuevas de terceros  │
│ requieren Transferencias desde       │
│ Exterior, pendientes de contrato y   │
│ autorización específicos (D5).       │
│ No se registran como movimientos     │
│ entre Saldos propios.                │
│ Quién paga: [— bloqueado —]          │
│ Importe     [— bloqueado —]          │
├──────────────────────────────────────┤
│ [Volver a la ficha]                  │
└──────────────────────────────────────┘
```
Sin botón de alta ni selector que permita eludir la restricción. Solo lectura de
históricos con su procedencia.

### W4 — Ficha de caso compartido (escritorio 1440)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ Compartido · Piso 2026            Estado: Reparto parcial        ⌂ Inicio  │
│ ⚠ Exceso de Álex 150,00 € (alerta simultánea, F5)                          │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Resumen del caso             │ Participantes                               │
│ Bruto             450,00 €   │ ┌──────────────┬───────┬──────────┬────────┐ │
│ Recuperado        300,00 €   │ │ Nombre       │Partes │Asignado  │Aport   │ │
│ Neto (B − R)      150,00 €   │ ├──────────────┼───────┼──────────┼────────┤ │
│ Coste propio      150,00 €   │ │ Yo (Titular) │  1    │ 150,00   │ —      │ │
│ Por cubrir terc.  150,00 €   │ │ Álex         │  1    │ 150,00   │ 300,00 │ │
│ Exceso terc.      150,00 €   │ │ Bea          │  1    │ 150,00   │ 0,00   │ │
│ Fechas: gasto 05/10 · última │ └──────────────┴───────┴──────────┴────────┘ │
│ aportación 10/10 · reparto   │ Exceso: Álex 150,00 € · Pendiente: Bea 150,00│
│ cubierto — (aún no)          │ [Editar partes] [Vista de impacto]          │
├──────────────────────────────┤ [Añadir participante]                       │
│ Gastos y Partidas            ├─────────────────────────────────────────────┤
│ Alquiler P1 300,00 neto 100  │ Historia (append)                            │
│ Limpieza P2 150,00 neto 50   │ · 01/10 Alta caso · 02/10 Alta participante  │
│ Neto P1 100 · P2 50 = 150    │ · 10/10 Aportación acreditada Álex 300,00    │
├──────────────────────────────┤ · 10/10 Estado → Reparto parcial             │
│ Aportaciones acreditadas (1) │                                             │
│ Álex 300,00 € 10/10 rev 1    │                                             │
└──────────────────────────────┴─────────────────────────────────────────────┘
```
Tab/foco navegable; estructura equivalente en ambas medidas; el determinismo del
motor no depende de la vista.

### W5 — Estados y alertas (390)
```
Sin repartir:    [ Estado: Sin repartir ]  «Define participantes, partes o Gastos.»
Reparto parcial: chip Reparto parcial; pendientes por tercero.
                 Si hay exceso de otro: alerta «Exceso de Álex 150,00 €» a la vez.
Excedido:        chip Excedido (ningún pendiente y exceso) + exceso por participante.
Cerrado:         chip Cerrado (sin pendientes ni excesos) + «Coste propio 50,00 €».
Revisar:         «G4 · Movimiento <ID> · importe −50,00 € · motivo: no válido».
                 Bloquea Cerrado; Bruto/Neto en Parcial (P-F6).
Revisar (R-MP):  «Recuperado 100,00 € de Álex sin cuota asignada». Bloquea Cerrado.
Gasto anulado:   deja de computar en el bruto; queda en historia.
```

## 11. Matriz AC (trazable a E3.2-AC1..3 y decisiones)
| ID | Requisito | Fuente / estado |
|---|---|---|
| AC-01 | Alta atómica Referencia CAT013 + ficha 1:1, sin huérfanos | D1; E3.2 «ficha 1:1 sin huérfanos» |
| AC-02 | Participantes hijos 1:N con ID estable, nombre editable, auditoría | D1/D2 |
| AC-03 | Ninguna aportación deducida de Saldo propio; Saldo pagador separado de la atribución | D2 |
| AC-04 | Partes enteras; céntimos exactos; mayor resto con desempate por ID | D3; DT2/DT8 |
| AC-05 | Suma de asignados = bruto exacto | D3; F4; §7.3 |
| AC-06 | Varios Gastos elegibles por Referencia con Partidas distintas; identidad/Partida/fecha/importe conservados | D6; E3.6-AC2 |
| AC-07 | Agregación por Referencia sin doble cómputo; sin alterar Movimientos | D3/D6 |
| AC-08 | Aportación de tercero acreditada solo por metadatos sobre Movimiento canónico + participante | D4; §5 |
| AC-09 | Auditoría, evidencia, revisión e idempotencia reutilizadas; corrección por revisión | D4/D7 |
| AC-10 | Histórico sin evidencia → Revisar/No disponible; sin atribución por dirección, Referencia o Concepto | D4; Q9 |
| AC-11 | El Gasto conserva Partida e importe real; aportaciones de terceros con Referencia y Quién paga acreditado | E3.2-AC1 |
| AC-12 | Estados y alertas con definiciones §6, derivados del motor, sin campo manual | D6; F5; R-CC |
| AC-13 | Cerrado con coste propio positivo, sin pendientes ni excesos de terceros; Neto no es criterio de cierre | D6; E3.2-AC2; R-CC |
| AC-14 | Excedido solo sin pendientes de terceros; identifica participante y su exceso | F5; R-CC |
| AC-15 | Sin Gastos elegibles o reparto no verificable → Sin repartir; nunca Cerrado | D6; §6 |
| AC-16 | Fechas derivadas solo de hechos elegibles; empates deterministas | D6/D3 |
| AC-17 | Pendiente y exceso por separado; sin compensación cruzada | D7; E3.2 pruebas |
| AC-18 | Cambio de reparto con acreditados: vista de impacto, motivo, auditoría | D7 |
| AC-19 | Movimientos bancarios nunca reescritos por cambios de reparto | D7 |
| AC-20 | Informes consumen Neto y atribución central; sin doble descuento con Anticipos/Comida | E3.2-AC3; E3.6-AC1 |
| AC-21 | Exterior no habilitado; movimientos internos no acreditan recuperación; históricos Exterior con procedencia | D5; Q5; E1.5 |
| AC-22 | API protegida; 404/409/422; lectura sin mutaciones | Guía seguridad; §9 |
| AC-23 | UI 390/1440 equivalente; teclado/foco; contraste 6:1; errores visibles | W1–W5; guía UI |
| AC-24 | Historia append-only; baja lógica sin huérfanos | D1/D7 |
| AC-25 | Neto = B − R con signo; Recuperado incluye exceso; identidad de control | F1; F2; §7.1 |
| AC-26 | Titular con coste propio sin aportación exigible | F3; E3.2-AC2 |
| AC-27 | Reparto exacto por Gasto y Partida; total = bruto | F4; §7.3 |
| AC-28 | Importe inválido o incompatible que compromete cobertura: «Revisar» con Movimiento y motivo; no computa; bloquea Cerrado | F6; P-F6 |
| AC-29 | Bruto, Neto y reparto como Parciales mientras la cobertura esté comprometida; solo subtotales acreditados | P-F6 |
| AC-30 | Ningún negativo se convierte en devolución ni se rectifica sin autorización; Movimiento original y efecto bancario conservados | P-F6; D7 |
| AC-31 | Tras resolver por procedimientos vigentes, el motor recalcula y determina el estado; sin Cerrado previo | P-F6 |
| AC-32 | Recuperado de cada tercero distribuido por Gasto en proporción al asignado; céntimos exactos; mayor resto; desempate por ID de Gasto; exceso íntegro | R-MP; §7.4 |
| AC-33 | Tercero con aportaciones y sin cuota asignada positiva: incidencia «Revisar»; sin división entre cero | R-MP; P-F6 |
| AC-34 | Neto Gasto = Bruto − Recuperado atribuido; Neto Partida = suma de Gastos; Neto caso = suma por Partida = B − R | R-MP; §7.5 |
| AC-35 | El Recuperado global no se reparte directamente entre Partidas; sin acreditación relevante → Parcial/No disponible | R-MP |
| AC-36 | Ejemplo de cierre: Bruto 150, coste propio 50, terceros 50+50 recuperados → Recuperado 100, Neto 50, Cerrado | R-CC; §6 |
| AC-37 | Pendiente y exceso coexistentes → Reparto parcial con alerta de exceso | F5; R-CC |
| AC-38 | Sin pendientes ni excesos de terceros → Cerrado aunque no haya aportaciones de terceros (solo coste propio) | R-CC |
| AC-39 | Incidencia relevante de cobertura (P-F6 o recuperación sin cuota) bloquea Cerrado y muestra «Revisar» | P-F6; R-CC; R-MP |

## 12. Pendientes antes de la aprobación completa

Nota vigente: la spec14 base ya está aprobada; los puntos originales siguientes
conservan procedencia histórica. División B aprobada en §14; desarrollo y D5
siguen sin autorizar. PR67/71 integradas en la basea445f90 de esta publicación.

1. Aprobación completa de esta spec por el usuario. Q1–Q7, F1–F5, P-F6 y las
   decisiones R-MP y R-CC están registradas; ninguna propuesta técnica queda
   abierta, salvo la aplicación de P-F6 a la recuperación sin cuota (§2.4), que
   se pide confirmar en la aprobación.
2. **D5/Exterior (OPEN, independiente):** paquete separado con contrato específico
   de Transferencias con Exterior y autorización propia; hasta entonces E3.2 no es
   funcionalmente completo según R4.
3. Estado de entregas (dato del coordinador, no verificado aquí): dev13 reanudado
   tras B13-1 con candidato en PR71 pendiente de CI/QA; Q9 integrada en PR70.
   Dev12/PR67 separado, sin merge. Una eventual dev14 exigirá dependencias
   integradas (E1.4/E1.5 y E2.6 aprobadas/integradas) y candidato verificado.
4. Excel: el traspaso de históricos (incluidos Exterior) pertenece al plan
   autorizado local; esta spec no define cargas ni SQL.
5. E3.5/Comida y E3.1/Anticipos consumen este Neto central (E3.6); su orden de
   integración no se decide aquí.
6. Copia del coordinador: solo referencia; no es otra versión a publicar. La
   versión única se consolida en esta copia.

## 13. Cobertura de pruebas propuesta (resumen, se detalla en dev)
- Fórmulas: Neto positivo y negativo; identidad de control; ejemplos §7.3, §7.4,
  §7.5 y §10 exactos.
- Recuperado multi-Partida: distribución proporcional por Gasto; céntimos exactos
  con mayor resto y desempate por ID de Gasto; exceso íntegro; tercero con
  aportaciones y sin cuota → incidencia sin división entre cero; sin reparto
  directo entre Partidas.
- Reparto: varios participantes; aporte parcial y excesivo; Titular sin aportación;
  multi-Gasto y multi-Partida con residuo y desempate por ID.
- Estados: Sin repartir; Reparto parcial con alerta simultánea; Excedido solo sin
  pendientes; Cerrado sin pendientes ni excesos, incluido el ejemplo 150/50/100.
- Incidencias: importes inválidos y recuperación sin cuota bloquean Cerrado y
  muestran «Revisar»; Bruto/Neto Parciales; sin conversión automática de negativos.
- Acreditación: solo metadatos sobre Movimiento; internos no acreditan; históricos
  Exterior con procedencia; sin duplicar datos bancarios; idempotencia.
- Integridad: sin huérfanos tras baja; sin reescritura bancaria; lectura sin
  mutaciones; snapshot antes/después.
- API/seguridad: acceso denegado sin sesión; validaciones; respuestas obsoletas;
  errores sin información sensible; alta Exterior rechazada.
- UI: 390/1440, teclado/foco, contraste, estados de error reales.

## 14. División documental Base B — APPROVED (2026-10-26)

### 14.1 Alcance de base B

**Base B = ficha/participantes + Gasto CAT013 + motor de reparto sin aportaciones
D5.**

#### 14.1.1 Incluido

| Capacidad | Contenido |
|---|---|
| Ficha 1:1 | Alta atómica Referencia de tipo «Gasto compartido» (CAT013) + ficha; sin huérfanos; auditoría y revisión. |
| Participantes | Hijos 1:N con ID estable, nombre, rol Titular/Tercero, partes enteras, alta/edición/baja lógica y auditoría. |
| Gasto CAT013 | Gastos originales con Referencia CAT013, Partida e importe real conservados. |
| Transferencia interna con REF CAT013 | Permitida entre dos Saldos internos, con ficha activa; no crea metadata, no pide Quién paga y no acredita Recuperado. |
| Motor base | Bruto, asignado por Gasto/Partida, coste propio, pendiente estructural y estados Sin repartir / Reparto parcial / Cerrado sin terceros con cuota. Sin Recuperado, Exceso ni cobertura de aportaciones. |
| Reparto exacto | Céntimos, mayor resto, desempate por ID; multi-Gasto y multi-Partida; sin doble cómputo. |
| Impacto e historia | Vista de impacto al cambiar partes, motivo, auditoría append-only y baja lógica sin huérfanos. |
| API/UI | Rutas protegidas y pantallas de ficha/participantes/Gasto/estado; 390/1440; estados vacío/carga/error/409/422. |
| Migración | Versión siguiente con rollback y continuidad desde v13; fixtures ficticias y servicios reales de prueba. |

#### 14.1.2 Excluido

- D5/Exterior: Transferencias S000→interno, formulario de aportación,
  `movimiento_compartido`, evidencia/procedencia de aportaciones.
- Recuperado real, Exceso positivo, atribución de recuperaciones por Gasto y
  cobertura de aportaciones.
- Históricos Exterior y cualquier importación histórica no autorizada.
- Transferencia CAT013 desde S000; Gasto CAT013 no se convierte en Transferencia.
- Informes/E3.6: AC-20 queda pendiente dentro de E3.2, con aplazamiento explícito
  propuesto (§14.4).
- Aceptación global de E3.2, T-D5-DOC-05 y entrega conjunta D5.
- Datos personales o financieros; solo fixtures ficticias.

#### 14.1.3 Utilidad autónoma

Base B permite crear un caso compartido, definir participantes y partes, registrar
los Gastos originales con CAT013 y conocer el **Bruto**, el **Asignado** por
Gasto/Partida y el **Coste propio**. Es útil para reparto y planificación.

No permite verificar que un tercero pagó. Con terceros con cuota, el caso queda
normalmente en **Reparto parcial / Cobertura no disponible**; no se muestra
Recuperado verificado, no se declara Excedido y no se cierra con terceros
pendientes. **No es E3.2 completo ni sustituye D5.**

#### 14.1.4 Transferencias internas con REF compartida vs. S000→interno

| Supuesto | Base B | D5 posterior |
|---|---|---|
| Transferencia entre dos Saldos internos, con REF CAT013 y ficha activa | **Permitida** según §4. No crea `movimiento_compartido`, no pide Quién paga y no acredita Recuperado. Puede verse en historia como movimiento interno. | Sigue sin acreditar; D5 no la convierte en aportación. |
| Transferencia S000 → Saldo interno, con REF CAT013 | **Rechazada**; el formulario común no ofrece S000; no hay tabla ni endpoint de aportación. | **Exclusiva de D5**; exige participante Tercero, evidencia/procedencia y validaciones D5. |
| Transferencia S000 → S000, o interno → S000 | Rechazada. | Rechazada; no es aportación. |
| Transferencia interna con REF CAT013 pero sin ficha | Rechazada. | Rechazada; la ficha es precondición. |

La base B debe usar un gate por operación: CAT013 para ficha/Gasto y para
Transferencia interna con ficha; S000 sigue prohibido. Una ampliación de la lista global repercute en alta de Referencias, validación
de Movimientos y opciones UI; debe coordinarse con ficha, esquema y gates por
operación. Por sí sola no elimina las guardas S000 del servicio ni el CHECK.

### 14.2 Matriz completa de los 39 AC

Leyenda:
- **B completa**: aceptable íntegramente en base B.
- **B parcial**: parte verificable en B; el resto se indica.
- **D5**: no aceptable sin D5.

AC-20 **permanece en E3.2**. Se propone aplazar explícitamente su consumo por
informes/E3.6; no se reasigna a otra entrega ni se declara PASS.

| AC | Cobertura B | Parte pendiente | Evidencia prevista |
|---|---|---|---|
| AC-01 | **B completa** | — | B-T02 |
| AC-02 | **B completa** | — | B-T03 |
| AC-03 | **B parcial** | B: no deducción desde Saldo propio y Saldo pagador visible. D5: atribución de aportación. | B-T06 + D5-AC-01/07/10 |
| AC-04 | **B completa** | — | B-T05 |
| AC-05 | **B completa** | — | B-T05 |
| AC-06 | **B completa** | — | B-T04 + B-T05 |
| AC-07 | **B completa** | — | B-T05 |
| AC-08 | **D5** | Metadata sobre Movimiento + participante. | D5-AC-01/07/08 |
| AC-09 | **B parcial** | B: auditoría/revisión/idempotencia de ficha, participantes y Gasto. D5: evidencia/auditoría de aportación. | B-T02/B-T03/B-T07 + D5-AC-09/10 |
| AC-10 | **D5** | Históricos Exterior sin evidencia → Revisar/No disponible. | D5-AC-07b/08 |
| AC-11 | **B parcial** | B: Gasto conserva Partida/importe. D5: Referencia y Quién paga acreditados. | B-T04 + D5-AC-01 |
| AC-12 | **B parcial** | B: Sin repartir / Reparto parcial / Cerrado sin terceros. D5: Excedido positivo. | B-T06 + D5-AC-01/10 |
| AC-13 | **B completa** | — | B-T06 |
| AC-14 | **D5** | Excedido real e identificación del participante. | D5-AC-01/10 |
| AC-15 | **B completa** | — | B-T06 |
| AC-16 | **B parcial** | B: fecha de Gasto y ausencia de fechas no soportadas. D5: última aportación, reparto cubierto y exceso. | B-T06 + D5-AC-01/10 |
| AC-17 | **B parcial** | B: campos separados y cobertura explícita; Pendiente/Exceso No disponible o No aplica según §14.5, sin fabricar Exceso=0. D5: valores con aportaciones acreditadas y no compensación. | B-T06 + D5-AC-10 |
| AC-18 | **B parcial** | B: impacto/auditoría al cambiar partes sin aportaciones. D5: cambio con aportaciones acreditadas. | B-T07 + D5-AC-10b/c |
| AC-19 | **B completa** | — | B-T07; revalidar en D5-AC-10b |
| AC-20 | **B parcial** | B: contrato de Neto central/DTO con importe o ausencia y cobertura coherentes. Pendiente: consumo por informes/E3.6, **dentro de E3.2**; aplazamiento explícito aprobado documentalmente. | B-T06/B-T08 (contrato entregado por B) + B-T11 (consumo aplazado) |
| AC-21 | **D5** | Exterior/S000, históricos y límites. | B-T09 + D5-AC-14 |
| AC-22 | **B completa** | — | B-T08; revalidar en D5-AC-12/13 |
| AC-23 | **B parcial** | B: W1/W2/W4/W5 y ficha/participantes. D5: W3/formulario de aportación. | B-T08 + D5-AC-13 |
| AC-24 | **B completa** | — | B-T03/B-T07; revalidar en D5-AC-10/11 |
| AC-25 | **B parcial** | B: Neto con Recuperado no disponible/no aplica e identidad estructural. D5: Recuperado real, exceso e identidad completa. | B-T06 + D5-AC-01/10/11 |
| AC-26 | **B completa** | — | B-T06 |
| AC-27 | **B completa** | — | B-T05 |
| AC-28 | **B completa** | — | B-T06 |
| AC-29 | **B completa** | — | B-T06 |
| AC-30 | **B completa** | — | B-T06 |
| AC-31 | **B completa** | Calificación limitada a resolución de incidencia P-F6 en Gastos admitidos por B; no acredita resolución R-MP con recuperaciones. Esta última se revalida en D5. | B-T06 (rama B) + D5-AC-10 (rama futura, UNRUN) |
| AC-32 | **D5** | Distribución de Recuperado por Gasto. | D5-AC-01/10 |
| AC-33 | **D5** | Recuperado sin cuota asignada. | D5-AC-07/10 |
| AC-34 | **D5** | Netos con Recuperado atribuido. | D5-AC-01/10 |
| AC-35 | **D5** | Recuperado global no repartido directamente. | D5-AC-07/10 |
| AC-36 | **D5** | Cierre con aportaciones 50+50. | D5-AC-01/10 |
| AC-37 | **D5** | Pendiente y exceso coexistentes. | D5-AC-01/10 |
| AC-38 | **B completa** | — | B-T06 |
| AC-39 | **B parcial** | B: P-F6/importe inválido bloquea Cerrado. D5: R-MP/recuperado sin cuota. | B-T06 + D5-AC-07/10 |

**Recuento:** 18 completas en B, 11 parciales, 10 pendientes de D5.

### 14.3 B-T01–B-T11 completas

Todas **UNRUN**. Son especificaciones de prueba, no resultados. El gate base B es
B-T01–B-T10; B-T11 pertenece al pendiente AC-20/E3.2 (§14.4).

| ID | Gate | Precondición | Operación | Resultado esperado |
|---|---|---|---|---|
| **B-T01** | Base B | Fixture v13 ficticia y congelada (nueva `database-v13`), con datos de módulos previos; esquema v13 actual. | Abrir/migrar; inyectar fallo de DDL; probar versión desconocida; backup/restore. | Versión siguiente; tablas nuevas; filas/auditorías/FK/acceso preservados; rollback íntegro; sin reseed; versión desconocida rechazada; manifiesto de copia correcto. |
| **B-T02** | Base B | Saldos ficticios y catálogo mínimo; servicio de Referencias y ficha. | Alta REF CAT013 + ficha atómica; reintento idempotente; conflicto de clave; revisión obsoleta; intento de ficha sin REF o REF sin ficha. | Un REF y una ficha; sin huérfanos; reintento no duplica; 409 sin estado parcial; lectura coherente. |
| **B-T03** | Base B | Ficha creada; participantes ficticios. | Alta, edición de nombre/rol/partes, baja lógica; dos conexiones; DELETE físico; participante de otra ficha. | ID estable; auditoría; revisión; sin DELETE; baja lógica conserva historia; sin huérfanos; 409/422 correctos. |
| **B-T04** | Base B | Ficha/participantes; Partida ficticia; Saldos internos. | Gasto CAT013 con Partida/importe; Gasto CAT013 sin ficha; Transferencia interna con REF CAT013; Transferencia CAT013 S000; Transferencia CAT013 interna sin metadata. | Gasto válido solo con ficha; interna con REF permitida sin acreditación; S000 rechazada; no se crea metadata ni Recuperado. |
| **B-T05** | Base B | Caso con varios Gastos y Partidas ficticias; participantes con partes. | Reparto multi-Gasto/multi-Partida con céntimos, residuo, mayor resto y desempate por ID; suma de asignados. | AC-04/05/06/07/27 exactos; cada Gasto/Partida suma; sin doble cómputo ni Movimientos alterados. |
| **B-T06** | Base B | Casos ficticios: sin Gastos; reparto 100% Titular verificable; terceros con cuota sin fuente de aportaciones; Gasto inválido; resolución de incidencia P-F6. | Consultar DTO/read model y UI de Recuperado, Neto, cobertura, Pendiente y Cerrado; resolver incidencia P-F6 de Gasto. | Contrato central y UI coinciden en importe/ausencia/cobertura. Estados Sin repartir / Reparto parcial conforme §6 y sus precondiciones verificables; no deducir un estado de una métrica desconocida. Cerrado solo sin terceros con cuota, con hechos/reparto verificables y sin incidencias. Métricas dependientes No disponible cuando falta fuente; no 0 por omisión ni Excedido. Recálculo P-F6 verificado, sin declarar probada la rama R-MP aplazada. |
| **B-T07** | Base B | Caso con Gasto y participantes; sin aportaciones. | Cambiar partes; motivo; impacto antes/después; baja lógica; consultar Movimientos y auditoría. | AC-18 parcial/19/24; Movimientos intactos; historia append-only; sin huérfanos; impacto correcto. |
| **B-T08** | Base B | API y UI base B; sesión MFA/CSRF. | API sin MFA/CSRF; 404/409/422; lectura sin mutaciones; verificar forma del DTO central de Neto/importe/ausencia/cobertura y consumo por UI B; UI 390/1440, teclado/foco/contraste; W3 ausente. | Rutas B protegidas, DTO coherente con B-T06, sin null→0 y errores sin datos sensibles; AC-22 y AC-23 parcial. El consumo por informes ajenos a B permanece en B-T11, no el contrato entregado por B. |
| **B-T09** | Base B | Servicio y UI base B; spec05 sin editar. | Gates: Transfer S000, D5, Exterior ordinario/salidas, Gasto CAT013 sin ficha, Transfer CAT013 interna con/sin metadata, spec05 y T-D5-DOC-05. | S000/D5 bloqueados; Gasto CAT013 solo con ficha; interna con REF sin acreditación; archivos05 intactos; no se declara E3.2. |
| **B-T10** | Base B | Suite de regresión del repositorio; fixtures ficticias. | `referencias.test.ts`, `movimientos.test.ts`, clasificación, ciclos, backups; actualizar expectativas CAT013 solo en el gate autorizado. | Sin regresiones E1.5/E1.4; CAT013 Gasto controlado; Transferencia CAT013/S000 sigue rechazada; esquemas anteriores preservados. |
| **B-T11** | **Pendiente E3.2 / aplazado** | Integración E3.6/informes, no incluida en base B. | Informe consume Neto central; comprobar no doble descuento con Anticipos/Comida y presentación Parcial/No disponible. | **UNRUN y aplazado explícitamente.** No se declara AC-20 PASS ni E3.2 completo. Si se exige en B, el alcance crece y B-T11 pasa a gate. |

#### 14.3.1 Por qué la aceptación de base B exige B-T01–B-T10 y no B-T11

- B-T01–B-T10 cubren todas las capacidades que base B **entrega**: ficha,
  participantes, Gasto CAT013, motor sin aportaciones, estados, API/UI, migración
  y gates.
- B-T11 cubre el **consumo por informes/E3.6**, que no forma parte de base B.
  AC-20 sigue siendo E3.2; su aplazamiento está aprobado documentalmente por el usuario (§14.6.1).
- Aceptar base B sin B-T11 significa aceptar una base B honesta y parcial, no una
  E3.2 completa. B-T11 queda abierto y trazable; no se convierte en PASS ni se
  elimina del alcance E3.2.
- Anticipar ese consumo ampliaría el alcance B aprobado y requiere otra
  decisión expresa; no se añade E3.6 por interpretación.

### 14.4 AC-20 como requisito de E3.2 y aplazamiento aprobado documentalmente

AC-20 exige que los informes consuman el Neto y la atribución central, sin doble
descuento con Anticipos/Comida (E3.2-AC3; E3.6-AC1). **Pertenece a E3.2 y no se
reasigna.**

Aplazamiento aprobado documentalmente:
- Base B expone el Neto central como DTO/read model, pero **no integra** los
  informes/E3.6.
- AC-20 queda **pendiente y UNRUN** en base B; B-T11 lo verifica cuando exista la
  integración.
- La aceptación de base B no declara AC-20 ni E3.2 completos.
- El aplazamiento está aprobado documentalmente. Cualquier cambio para incluir
  informes y convertir B-T11 en gate requiere revisión expresa del alcance.
- No se modifica el roadmap, spec05 ni el alcance global de E3.2.

### 14.5 Métricas sin D5: cero verificable, Parcial y No disponible

#### 14.5.1 Reglas confirmadas que no se cambian

Se conservan F1 (Neto = Bruto − Recuperado), F2 (Recuperado incluye exceso), F3
(Titular con coste propio sin aportación exigible), F5/P-F6, R-MP y R-CC. Base B
no crea reglas financieras nuevas; solo no puede poblar las fuentes que dependen
de D5.

#### 14.5.2 Presentación adoptada para base B

| Métrica | Fuente/cobertura en base B | Presentación | Prohibición |
|---|---|---|---|
| **Bruto** | Gastos CAT013 elegibles, fuente presente. | Suma verificable; si hay Gasto inválido que compromete cobertura, **Parcial** con «Revisar». | No convertir ausencia de Gastos en 0; usar «Sin repartir». |
| **Asignado** | Partes + Gastos; fuente presente. | Céntimos exactos y verificables. | No inventar participantes ni partes. |
| **Coste propio** | Titular y partes; fuente presente. | Importe verificable. | No tratarlo como aportación exigible. |
| **Recuperado** | D5 deshabilitado; con terceros con cuota no hay fuente. | `No disponible — D5 no habilitado`; sin terceros, `No aplica — sin terceros`. | **Nunca 0,00 verificado** por ausencia de fuente. |
| **Neto** | Depende de Recuperado y de cobertura verificable. | Con terceros: `No disponible / Parcial` según la limitación propuesta. Con reparto 100% coste propio, hechos/reparto verificables y sin incidencias: `Neto = Bruto`, coincidente con Coste propio; no fórmula alternativa. | No usar Bruto como Neto verificado con terceros o cobertura comprometida. |
| **Pendiente** | Requiere Aportado; fuente ausente con terceros. | `No disponible / Parcial`; mostrar `Asignado` con su propia definición y cobertura. | No presentar Asignado como pendiente verificado ni añadir un indicador de pendiente máximo no incluido en B. |
| **Pendiente del Titular** | F3; fuente presente. | `0,00 verificado` estructural. | No convertirlo en aportación exigible. |
| **Exceso** | Requiere Aportado; fuente ausente. | `No disponible / No aplica`; no simular. | **Nunca 0,00 verificado** por ausencia de fuente. |
| **Cobertura** | Requiere aportaciones; ausente con terceros. | `No disponible / Parcial`; no declarar cubierto. Sin terceros: `No aplica`. | No declarar Cerrado con terceros pendientes. |
| **Cerrado** | Sin terceros con cuota, hechos y reparto verificables, sin pendientes/excesos/incidencias. | Permitido en caso 100% coste propio conforme AC-38; no es un estado automático por ausencia de D5. | Nunca con terceros con cuota y D5 deshabilitado bajo esta limitación propuesta; ni con cobertura comprometida. |
| **Fechas** | Gasto: fuente presente; aportación/reparto cubierto/exceso: ausentes. | Fecha de Gasto verificable; las demás `No disponible`. | No inventar fechas ni usar la fecha de creación como fecha financiera. |

#### 14.5.3 Cero verificable, Parcial y No disponible

- **Cero verificable:** existe fuente y el cálculo exacto da cero. En base B:
  pendiente del Titular (F3) y asignaciones/partes explícitamente 0.
- **Parcial:** existe fuente, pero la cobertura está comprometida o incompleta
  (por ejemplo, Gasto inválido P-F6, o una futura acreditación parcial). Afecta a
  Bruto/Neto/reparto según §6; no se usa para inventar Recuperado.
- **No disponible:** no existe la fuente habilitada (D5 deshabilitado) o no hay
  base verificable para la métrica. Se muestra el motivo; no se sustituye por 0.

#### 14.5.4 Limitación de entrega aprobada para base B (sin cambiar reglas generales)

Esta es una **limitación de entrega**, no una regla financiera nueva:
- Con terceros con cuota y D5 deshabilitado, base B muestra Recuperado, Neto,
  cobertura y Exceso como `No disponible / Parcial`, y no declara Cerrado.
- No se añade el indicador opcional `Pendiente máximo`: queda fuera de esta
  propuesta para no introducir otra métrica. Se conserva Asignado con su definición.
- Esta limitación está aprobada para B. Su modificación requerirá decisión
  expresa; no autoriza D5 ni otra fuente de aportaciones por inferencia.
- No se modifica F1/F2/F3/F5/P-F6/R-MP/R-CC.

### 14.6 Decisiones aprobadas y condiciones de aceptación

#### 14.6.1 Decisión documental aprobada

Fuente directa del usuario, 2026-10-26: «Apruebo la división documental base B
de la propuesta consolidada», sobre SHA-256
e1839ba8e851fce25dca611a2247229b7dec60496ce402e38327069f8fc5a4d0.

- Se aprueba la división y matriz18/11/10, con las capacidades y límites de §14.1.
- Las Transferencias internas con REF del caso conservan el contrato ya aprobado;
  no son aportaciones. S000 sigue bloqueado durante B.
- Se aprueba el aplazamiento del consumo AC-20/B-T11 dentro de E3.2,
  sin reasignarlo, eliminarlo o declararlo PASS; el contrato central de B sí
  debe verificarse en B-T06/B-T08.
- Se aprueba la limitación de presentación sin D5 de §14.5, no una regla
  financiera general nueva; no se incorpora el indicador Pendiente máximo.
- B-T01–B-T10 son condiciones futuras para aceptar el alcance B; B-T11 queda
  pendiente de integración E3.2. Todas siguen UNRUN: no existe implementación.
- Fixtures ficticias y servicios reales de prueba conservan los límites de
  seguridad; no autorizan importación histórica ni uso de datos reales.
- **Desarrollo B requiere autorización separada.** D5 es posterior, con contrato
  y autorización propios; no se autoriza entrega conjunta, merge ni deploy.

La decisión de división documental D5-P1 queda resuelta para este alcance; su
viabilidad funcional solo se acreditará con el candidato y pruebas autorizados.
No se aprueba por ello la enmienda D5 completa ni excepciones históricas.

#### 14.6.2 Condiciones de aceptación

- B-T01–B-T10 en PASS sobre el candidato autorizado.
- B-T11 **UNRUN** y registrada como pendiente E3.2, no como PASS.
- Todos los AC parciales documentados con su parte pendiente.
- Sin 0 verificado por fuente ausente.
- Sin Transferencia S000, sin metadata D5, sin Exterior ordinario/salidas.
- Sin cambios en spec05, roadmap ni T-D5-DOC-05.
- Migración desde fixture v13 ficticia con rollback y sin reseed.
- Sin datos personales/financieros; fixtures ficticias y servicios reales de
  prueba; importación histórica separada y no autorizada.
- Sin declarar dev14/E3.2/D5 completos.
- PR y merge con aprobación explícita e independiente.

### 14.7 Límites de la aprobación

La aprobación es documental. No autoriza desarrollo B/dev14, implementación D5,
migraciones operativas, edición de spec05/testplan, importación histórica, uso de
datos reales, merge ni despliegue. La publicación de estos documentos sigue la
política Git del proyecto; el merge de su PR requiere aprobación propia.

No declara PASS de pruebas futuras ni dev14, D5, E3.2 o todos sus39AC completos.
D5 y T-D5-DOC-05 conservan gates propios. El resto de decisiones Q1–Q7, F1–F5,
P-F6, R-MP y R-CC permanece vigente; solo se delimita el alcance B aceptable de
forma autónoma tras su implementación y validación autorizadas.

### 14.8 Procedencia, revisión y trazabilidad de consolidación

Base original de publicación: main `a445f90`, con PR67/71 integradas. Autoría:
propuesta de OpenCode, Task `EXT-OPENCODE-SPEC14-D5`, sesión funcional Spec14,
versión/modelo/ID técnico desconocidos; consolidación y precisiones de Codex. Propuesta original SHA-256
e95a0c856580bfb3493a32fc61c354ed0d5236f8ac3897b250b10bec0d9d26cb,
consolidada aprobada e1839ba8e851fce25dca611a2247229b7dec60496ce402e38327069f8fc5a4d0.
La reproducción aquí omite rutas temporales y convierte etiquetas de propuesta
pendiente en aprobación documental, conservando alcance, matriz y condiciones.

QA externa Antigravity, EXT-ANTIGRAVITY-SPEC14-BASEB-QA, APTO para presentar a
aprobación sobre el original e95a0c85…; informe SHA-256
f9406b985f6c7c166b0059161fa890e5c53b701a91aa971208cd6b04b17f9029.
No se atribuye al revisor una validación del hash consolidado posterior.

| Origen | Precisión incluida en la versión aprobada | Trazabilidad |
| --- | --- | --- |
| F-BASEB-QA-01 | AC-31 completa solo para la rama P-F6 de B; R-MP requiere revalidación futura en D5 | AC-31, B-T06 y referencia futura D5-AC-10 pendiente. |
| F-BASEB-QA-02 | Neto = Bruto, coincidente con Coste propio, en reparto 100% Titular verificable y sin incidencias | §14.5.2, B-T06; no fórmula alternativa. |
| Coordinador | AC-17 no afirma Exceso=0 por ausencia de fuente | AC-17 y §14.5, limitación de entrega explícita. |
| Coordinador | Contrato/readmodel central probado en B, consumidor aplazado | AC-20, B-T06/B-T08 y B-T11. |
| Delimitación | Sin indicador Pendiente máximo adicional | §14.5.2/14.5.4; Asignado no se convierte en Pendiente verificado. |
| Mapa técnico | Tipos compartidos afectan varias operaciones; S000 también protegido por servicio/CHECK | §14.1.4 y B-T09/B-T10. |

Las referencias D5-AC en la matriz son trazabilidad propuesta hacia el contrato
D5 aún no aprobado ni publicado, no incorporación ni aprobación de sus cláusulas.
La sustitución D5 de AC-21 no se publica aquí: la matriz base§11 mantiene su
restricción aprobada y D5 continúa pendiente. Los 39 AC originales no se renumeran.
