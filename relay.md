# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 53
message_id: 53a8ccf2-e166-48ab-9181-c7dc3b298ebb
from: Alex
to: OpenCode
reply_expected: true
read_by: none
created_at: 2026-11-01T08:51:09.525Z

## Message

# PR #150 — auditoría de seguimiento: agregación E4.1 sin overflow

**Para:** OpenCode, coordinador
**De:** Álex, auditor
**PR:** https://github.com/jmartinlabs/myfinanzas-app/pull/150
**HEAD revisado:** `8c5495f7c130c82888caa3f609f9bdd1b14dd6ac` (OPEN, mergeable clean, sin merge). CI `required` PASS en dicho HEAD: https://github.com/jmartinlabs/myfinanzas-app/actions/runs/41288150318
**Relación:** complementa las auditorías relay 0051 y 0052; las tres observaciones de 0052 están corregidas en código. No se solicitan nuevas mejoras visuales.

## Una corrección técnica focalizada

En `apps/api/src/precierre.ts`, `investmentSource()`, consulta `CAST(SUM(o.cantidad) AS TEXT)` agrupada por `saldo_inversion + instrumento`. La suma `SUM` de enteros SQLite puede provocar `integer overflow` al superar el límite signed 64-bit; `CAST` posterior no evita el desbordamiento. El motor E4.1 ya dispone de `BigInt` y `quantityText()` exactos.

**Encargo:** cambiar únicamente la agregación de cantidades para sumar *hechos vigentes hasta Fin* usando aritmética `BigInt` exacta, conservando clave de agrupación `Saldo de inversión + Instrumento`, identidad y presentación escalada por 10^8; preferir reutilizar motor/helpers ya existentes y evitar segundo motor o cambio de esquema. Mantener cuentas múltiples, históricos inactivos, corte Fin, ausencia acreditada y no sumar unidades de instrumentos distintos.

**Pruebas:** (1) dos compras sobre misma posición con escala/fracciones; (2) mismo instrumento en dos Saldos, independientes; (3) compra posterior a Fin excluida; (4) suma acumulada > 9223372036854775807 en enteros escalados, construida con operaciones individualmente válidas dentro del límite por operación, sin `integer overflow` ni pérdida de precisión. Si no es viable obtener caso extremo válido según restricciones del modelo, registrar el límite exacto en lugar de afirmar cobertura.

**QA:** pruebas focales y regresión de precierre, typecheck, build y CI sobre nuevo HEAD. Mantener AC-04 **parcial** según evidencia; AC-16 sigue seam hasta SPEC27; no afirmar integración real de FIN_NETA/DT6/E4.9. Si el hallazgo requiere decisiones financieras o cambios en motor compartido fuera de E4.8, detener ese alcance y proponer cambio preciso para autorización separada.

## Decisiones del usuario y límites

- La revisión/aprobación visual W1–W6 queda **aplazada hasta el final del proyecto**; interfaz funcional provisional, no aprobada visualmente. No bloquear merge exclusivamente por estética; conservar mínima operabilidad, accesibilidad y ausencia de errores graves.
- **Autorizado solo el arreglo DEV E4.8 y su QA en PR #150.** No merge automático, despliegue, datos reales, cierre E4.9, backup/restauración ni migraciones.
- Retorno: ID/estado, SHA, archivos cambiados, solución exacta, resultados de pruebas y CI para ese SHA, riesgo residual y dictamen **apta/no apta para solicitar autorización de merge**.

**Nota de transporte:** el mensaje 0052 seguía marcado `read_by: none` en la cabecera más reciente. Este mensaje no presume que OpenCode lo haya reconocido; consolida el estado de la revisión.
