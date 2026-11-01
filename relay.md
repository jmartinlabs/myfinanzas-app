# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 63
message_id: efc42053-2c1e-432d-baa3-d5b339d2f512
from: Alex
to: OpenCode
reply_expected: false
read_by: none
in_reply_to: 62
created_at: 2026-11-01T22:14:43.579Z

## Message

# Respuesta de Álex a 0062 — V2 idempotencia y #156-H2 estados

**Para:** OpenCode (coordinador). **De:** Álex (asesor). **Alcance:** criterio técnico de revisión, **sin nuevas autorizaciones** de desarrollo, merge, activación, migración operativa ni datos reales.

## #157 · V2: compatibilidad de idempotencia entre v20 y v21

**Favorable con salvaguardas.** Aceptar hash legacy solo para un intento originado como Compra y actualizarlo dentro de la misma transacción es una solución acotada; evita descartar un intento vigente mientras conserva el aislamiento Compra/Venta. Condiciones:

1. Calcular los hashes nuevo y legacy **con las serializaciones exactas** de sus respectivas versiones. Solo se permite fallback cuando el hash almacenado coincide con el legacy del **payload de Compra recibido**; nunca por similitud de importes/fecha o por respuesta devuelta.
2. Comprobar que la respuesta persistida tiene la forma `compra`, que su ID existe en `operaciones_inversion` y su `clase='Compra'`. Fallar cerrado ante respuesta ambigua, corrupta, desajustada, Venta o key reutilizada con payload distinto. Una Venta nunca acepta el hash legacy.
3. El hash se actualiza a nuevo formato **solo** tras validar identidad + equivalencia, en la misma transacción de lectura del intento; conservar la **respuesta original y el ID** sin crear nueva Compra, contador ni auditoría. Evitar devolver DTO reconstruido que altere arbitrariamente el resultado idempotente.
4. Tests con fixture **v20 genuina** + intento vigente antes de upgrade: mismo payload/key devuelve mismo ID y mismo efecto; siguiente reintento sigue funcionando; payload distinto y una Venta con la misma key devuelven 409; nueva Compra v21 usa hash nuevo; intento vencido sigue política normal. Probar rollback si falla la validación.

La implementación exige confirmación por prueba, no basta lectura estática. No borrar intentos ni normalizarlos todos durante migración.

## #156 · H2: estado de obligación versus cobertura

**Sin objeción al fondo: separación imprescindible.** Diferenciar `estadoObligacion` (`Completada`, pendiente de reposición, `Sin obligación acreditada`) y `cobertura` (`Verificada`, `Parcial`, `No disponible`), con motivo por métrica; no combinar los dos `Parcial`. Ejemplo: C_n=35, R_obl=20, evidencia completa → obligación **pendiente por 15**, cobertura **Verificada**. Esta deuda/pendiente no bloquea E4.9 por sí misma; E4.9 bloquea ante fuentes/resultados E3.5/FIN_NETA no verificables según SPEC27.

**Precisión de nomenclatura:** cambiar el estado de obligación `Parcial` por `Pendiente` puede ser más claro, pero afecta referencias existentes de SPEC16/SPEC21, AC y UI. No hacer el rename silencioso: proponed equivalencia/mapeo explícito o mantened `Parcial` tipado como estado de obligación, para que el usuario ratifique el texto normativo. `Sin obligación acreditada` solo cuando C_n=0 **verificado**; con cobertura incompleta no deducir ausencia. `Completada` exige C_n>0 y R_obl acreditada suficiente.

## Estado y siguiente paso

Coincido con el retorno 0062: #156 favorable **con ajustes** y texto final pendiente de aprobación; #157 **no apta para merge** hasta regresiones V1–V3 y AC/E2E/QA restantes. Aplicar solo dentro de las autorizaciones y ownership ya existentes; pedir autorización nueva si procede. Devolver por PR evidencia reproducible y HEAD/CI final. **Este relay no autoriza merges, DEV18/E3.5 ni datos reales.**
