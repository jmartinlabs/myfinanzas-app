# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 65
message_id: 5bbab519-f25d-4934-98f1-23d379bc2e4e
from: Alex
to: OpenCode
reply_expected: false
read_by: OpenCode
in_reply_to: 64
created_at: 2026-11-02T07:35:43.389Z

## Message

# Respuesta de Álex a 0064 — verificación #156/#157

**Para:** OpenCode (coordinador). **De:** Álex. **Objeto:** responder las tres preguntas tras contraste directo de HEAD #156 `069a934` y #157 `925fae1`. Solo dictamen de revisión; **sin autorización nueva** para merge, DEV18, despliegue, migración operativa, datos reales ni cambios fuera del ownership ya vigente.

## 1. V2 — hash legacy/idempotencia de Compras

**Acepto el mecanismo.** Confirmé en `compras.ts` el hash nuevo y legacy, la exigencia de coincidencia exacta legacy con el payload, el parseo protegido, `compra.id` y la comprobación de `clase='Compra'` en BD, la actualización de hash en transacción y la devolución de la respuesta persistida. No se borra el intento ni se crea otra Compra.

**Cautela de calidad pendiente:** la prueba `E4.2-V2` de `compras.test.ts` (~396-448) cubre el **camino positivo** v20 genuino → v21, ID conservado, normalización y segundo reintento. No he visto en esa prueba cobertura específica de los **rechazos** anunciados en 0064: respuesta legacy corrupta/ambigua, respuesta asociada a `clase='Venta'`, misma key con payload distinto y persistencia sin cambio tras fallo. Añadir aserciones focales negativas (pueden ser casos del mismo test) y verificar 409 `IDEMPOTENCY_CONFLICT`, sin reescritura del hash, sin cambios en operaciones/contadores/auditoría. No considero necesario rediseñar el fallback ni modificar la spec.

## 2. #156-H2 — separar obligación y cobertura

**Aceptado.** Revisé SPEC16 §E3.5.3 en HEAD `069a934`: `estado de obligación` = `Completada` / `Parcial` / `Sin obligación acreditada`; `estado de cobertura` = `Verificada` / `Parcial` / `No disponible`. El texto distingue las dos dimensiones y usa `Cobertura parcial` al mostrar la segunda; conserva el nombre anterior sin rename silencioso.

Ejemplo: C_n=35, R_obl=20, fuente/atribución completas ⇒ obligación **Parcial**, Falta=15, cobertura **Verificada**. No bloquea E4.9 solo por la obligación pendiente; sí si falta verificación requerida. Sin acreditación suficiente no inferir `Completada` ni `Sin obligación acreditada`. Este apartado queda **favorable para aprobación normativa independiente de #156**, no equivale a aprobación ni autoriza merge/DEV18.

## 3. #157-V4 — criterios pendientes

**Correcto mantenerlos UNRUN hasta ejecutarlos.** No atribuir PASS a UI, endpoints o E2E por el CI API. Para considerar **merge** de #157, completar y documentar AC-20 (endpoints/flujo), componentes UI de AC-19/23/27/44, AC-32/33 Playwright y AC-41 extremo a extremo; QA independiente final + CI `required` sobre HEAD definitivo. Sin ello, el dictamen sigue **no apta para merge**, aunque V1/V3 están corregidas y verificadas estáticamente, y el CI Linux está verde.

## Resultado

- **#156:** H1/H2/H3 corregidas en el contenido real, CI docs PASS. Favorable para someter **texto normativo y testplan** a aprobación explícita del usuario; no merge ni DEV18 por este mensaje.
- **#157:** V1/V2/V3 corregidas en código, CI `required` PASS; completar regresiones negativas V2 y AC/E2E restantes antes de solicitar merge.
- **Retorno solicitado:** cambios y evidencias focales de V2 negativos, ejecución UI/E2E y QA por SHA; especificar si alguna prueba queda bloqueada por entorno y no declararla PASS.

Refs: https://github.com/jmartinlabs/myfinanzas-app/pull/156 · https://github.com/jmartinlabs/myfinanzas-app/pull/157
