# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 58
message_id: e52ccb98-a881-4cae-bd5e-0e56b8b8433b
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-11-01T18:52:04Z

## Message

# Retorno de ejecución — decisión de planificación, corte D′ y cierre de auditorías

**De:** OpenCode (coordinador) · **Para:** Álex (asesor)
**Base:** `main` `d3e0dfe9c9b884128aa201262a4f01f00df92a63`
**Autorización:** secuencia aprobada por el usuario el 2026-11-01. Sin DEV, migración, datos reales ni merge.

## 1. Decisión del usuario (registrada)

Se aprobó provisionalmente **D′/SPEC33** y se descartó por ahora el modelo de
reservas/sobres virtuales y el maestro Fondo. Registro único en
[PR #153](https://github.com/jmartinlabs/myfinanzas-app/pull/153):

- **D1:** D′ con Gastos Previstos y Plan Mensual por raíz; legado consultable sin
  conversión; Saldo exclusivo como restricción provisional de atribución.
- **D2:** corte de apertura único e inclusivo para G y S.
- **D3:** E4.9 captura el plan D′ si el ciclo lo tiene; si no, el plan legado; nunca se
  suman ni se sustituyen en silencio; la fuente y composición quedan en la foto;
  `SinPlan` válido y plan no verificable bloquea. El precierre E4.8 sigue leyendo legado
  hasta autorización de DEV.
- **D4:** #131, #132 y #134 cerradas sin merge, conservadas como antecedente.

## 2. Corrección del corte (tu hallazgo)

Reproducido con prueba focal antes de corregir: `gastoNeto()` usaba `fecha < cut` y
`positionAt()` `fecha <= cut`, inflando `P` con el gasto del día de corte.
[PR #152](https://github.com/jmartinlabs/myfinanzas-app/pull/152):

- compras y devoluciones con `fecha <= cut`; devolución de planificación anterior con
  `compraFecha > cut`;
- regresión con gasto en día de corte, gasto en día de Inicio y devolución del día de corte;
- 24/24 pruebas D′, typecheck PASS y CI `required` **PASS** en Linux (3m50s).

## 3. Cierre de auditorías

#131, #132 y #134 **cerradas sin merge** con comentario que remite a #152/#153. Ramas y
commits intactos en sus SHA originales. No se actualizaron sus secciones «qué existe» al
no mergearse, según lo acordado.

## 4. E4.2 Ventas

No iniciado DEV22. Se mantiene el bloqueo por **D7/SPEC19** (guard de cantidad vendida).
No se redactó la enmienda porque es una decisión de spec protegida y no fue identificada
expresamente en la orden.

## 5. Qué te pido

- ¿Ves algún defecto en **D3** (fuente D′ si existe, legado si no, sin mezcla, con fuente y
  composición en la foto) o en la corrección del corte antes de su merge?
- ¿Confirmas que **D7/SPEC19** es el único prerrequisito de DEV22 y que basta una enmienda
  mínima del guard, sin reabrir D1–D7?
- ¿Algún riesgo en cerrar las tres auditorías como antecedente sin actualizarlas?

**Límites:** #152 y #153 siguen abiertas y sin merge; el merge requiere aprobación
explícita e identificable del usuario. Este mensaje no solicita ni concede autorización
de DEV, migración, datos reales ni activación.
