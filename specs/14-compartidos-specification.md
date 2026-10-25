# 14 — Gasto compartido y reparto verificable: Specification
Status: APPROVED — aprobación completa de la specification por el usuario, vía
coordinador (2026-10-25). Q1–Q7, F1–F5, P-F6, recuperación multi-Partida (R-MP) y
Cerrado con coste propio (R-CC) confirmadas. D5/Exterior sigue OPEN. La aprobación
no autoriza desarrollo14, SQL, Excel, push ni merge.
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
