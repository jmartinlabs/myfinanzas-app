# SPEC17 — propuesta de corrección M1/M2 y observaciones

Fecha: 2026-11-02. Base: `main` `d7b9077`. Estado: **PROPUESTA DOCUMENTAL — no aprobada**.
No modifica todavía SPEC17 ni autoriza DEV17, código, migración, datos reales o merge.
Responde al dictamen independiente de 0074.

## M1 — `null → 0` en el cálculo, no en presentación

**Texto actual (SPEC17 §Autoridad, ~59-63):** «si se reutiliza el lector E1.6, se corregirá
únicamente su presentación `null → 0` … no se cambia el cálculo».

**Propuesta exacta:** sustituir por:

> Si E4.4 reutiliza el lector E1.6, el read model deberá tratar `capital` nulo como **no
> verificable en el agregado** y no como cero: se reutilizará la validación de `debtPeriod`
> o se añadirá la misma guarda a `getDebt`, conservando la fórmula Q1 y sin reescribir la
> historia. La corrección de presentación es adicional, no suficiente.

**Evidencia:** `apps/api/src/deudas.ts:38` usa `BigInt(m.capital ?? "0")`; `debtPeriod` ya
devuelve `capital: null` si falta el desglose. La UI ya muestra «No calculable».

**AC/negativos:** reforzar AC-13 con un hecho aplicable de capital nulo: el agregado debe
ser **No calculable con motivo**, sin mostrar importe agregado (no «No disponible/parcial»,
vocabulario de E4.8/E4.9); no se altera la fórmula ni se reinterpreta historia. Añadir
regresión del lector E1.6 si se toca `getDebt`/`debtPeriod`.

## M2 — escritura R5 sin asignación circular (opción c)

**Texto actual:** difiere la aportación/corrección del histórico/precontrol de Deuda a
`E4.5/E4.12/DT7` (SPEC17 ~193, ~251, ~654-655).

**Propuesta exacta:** sustituir esas remisiones por:

> E4.4 mantiene el histórico/precontrol de Deuda en **solo lectura**. La escritura/corrección
> de los campos R5 no se asigna a E4.5 ni a E4.12: SPEC20/E4.5 excluye el precontrol de Deuda
> y E4.12 es recuperación/ensayo, no editor R5. La capacidad queda **pendiente de decisión
> futura**, ligada a DT7/mapping y a una autorización específica; no se crea otro módulo ni
> SPEC por inferencia. Los campos ausentes permanecen «Sin informar».

**Coherencia:** SPEC20/E4.5 (`specs/20-...:66-67,161-164`) y su AC-43. No se modifica D3
(solo lectura en E4.4).

## Observaciones menores (propuesta, sin cambiar Q1–Q7)

| ID | Cambio propuesto |
| --- | --- |
| m1 signo histórico | Definir `diferencia = capitalAmortizadoHistorico − (capitalInicial − capitalApertura)` y alinear el oráculo del testplan. |
| m2 DTO | Añadir `nota` de conciliación, conteo de precontrol, totales, resultado histórico e IDs afectados; declarar qué agregados calcula el servidor. |
| m3 estados listado | Un solo vocabulario: `No calculable` solo para capital; `Sin declarar` para conciliación ausente; alinear D002/D003. |
| m4 fecha conciliación | Mostrar la fecha de corte junto a la diferencia; no compararla visualmente con deuda viva de otro corte. |
| m5 `motivo` PATCH | Declarar `motivo` obligatorio al corregir tipo/condiciones en `PATCH /api/deudas/:id`. |
| m6 base | Marcar v16 como base de preparación; v21 es `main` actual al iniciar DEV. |
| m7 etiquetas | «Deuda viva = capital pendiente E1.6» explícito; una sola etiqueta visible. |
| m8 intereses | Aclarar que la exigencia de intereses es integridad del desglose, no operando de la fórmula. **Recomendación asesora pendiente de confirmación humana:** si una cuota/hecho aplicable tiene desglose inválido, marcar No calculable la deuda viva completa de esa deuda en el corte; no bloquear otras deudas ni cortes anteriores. |
| m9 historia vinculada | Definir Gastos vinculados sin capital/intereses: visibles como «desglose incompleto», no sumados. |
| m10 ficha 390 | Concretar qué se apila/colapsa y cómo se accede a apertura, capital de control, comprobación y totales; reutilizar desactivar/reactivar de E1.6. |
| m11 tablero | Corregir la fila que declara SPEC17 aprobada; mantener «en revisión, no aprobada». |

## Siguiente paso

1. QA documental independiente sobre este SHA.
2. Si APTO, aplicar el diff a SPEC17/wireframes en PR documental.
3. Aprobación explícita del usuario del texto resultante.
4. DEV17 sigue STOP y requiere autorización separada.
