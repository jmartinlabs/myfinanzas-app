# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 87
message_id: ddd2268a-980b-4c5c-99b7-a801925a51ac
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 86
created_at: 2026-11-02T22:21:55Z

## Message

# Retorno 0087 — #165/#166 integrados, #167 con reservas cerradas y E3.5 en desarrollo (I1–I2)

**De:** OpenCode · **Para:** Álex
**Base:** `main` `c5a0ccc` (esquema v21). Sin datos reales, sin despliegue y **sin merge de PR
funcional**.

## 1. Integraciones documentales

- **#165 MERGED `c5a0ccc`** — plan pre-DEV E3.5 con D1=A′, D2=O0, D3=O1 y D4 gate de E4.9.
  Post-merge CI `41533416756` **success**.
- **#166 MERGED `c8df42f`** — dictamen SPEC17 aplicado (M1 solo read model, desglose completo,
  `motivo`/422, v21, T-01…T-06, 390 como requisito). Post-merge CI `41531631773` **success**.
  No aprueba spec/wireframes ni autoriza DEV17.

## 2. #167 — SPEC23: QA APTO CON RESERVAS y reserva cerrada

PR #167, HEAD **`07d95dd`**, draft.

- QA independiente **APTO CON RESERVAS**. La material (R-1): la spec admitía `precio_unitario
  = 0` en Automática, contra E4.1 («cantidad y precio estrictamente positivos»). **Corregido**:
  precio `> 0` en Automática; el cero solo es válido como **valor manual 0,00**.
- Aplicados además: certificabilidad agregada explícita; `certificabilidad` como campo
  derivado y no columna; ejemplo JSON marcado como extracto; días transcurridos definidos
  (`T − fecha`, civiles); TP-08 409 condicional a DT2; casos de producto no exacto y de
  `importe_eur` distinto de cantidad×precio×cambio; cabecera del brainstorming a `c5a0ccc`
  y 16 decisiones.
- La specification/testplan siguen **candidatos no aprobados**; no hay DDL ni DEV E4.3.

## 3. E3.5 — desarrollo autorizado, incrementos I1–I2

Rama **`feat/e35-fin-neta`** desde `c5a0ccc`; DEV18 antiguo intacto. Commits `90f8bf2`,
`8f8e9d1`. 33/33 tests y `tsc --noEmit` limpio.

**I1 — propiedad D1-A′:** nuevo `apps/api/src/e35.ts` que contiene el read model y publica
`proveedor` (versión, ventana `[A,T]`, fuente, huella `financeRevision`, solo lectura).
`app.ts` sirve `/api/comida/metricas/:ciclo` desde E3.5; `comida.ts` conserva un alias para
importadores existentes. Sin cambio de aritmética.

**I2 — FIN-02/AC-03/AC-04:** la `Devolución Anticipo` solo se resta si existe
`movimiento_anticipo` coherente (rol `Devolución`, Referencia, par origen/destino y evidencia).
Si falta o es incompatible, `F` queda **No disponible con motivo** y no se deduce; el hecho se
conserva. Test AC-04 añadido; CU-09 actualizado con atribución canónica.

## 4. Lo que te pido: dictamen del plan de migración I3 (D3-O1)

Antes de ejecutarlo, el plan es:

1. **Esquema v22**: rebuild de `movimiento_rol_financiacion` en SQLite (no se puede relajar un
   CHECK con `ALTER`), con `PRAGMA foreign_keys=OFF` dentro de la migración, copia de filas,
   drop/rename, recreación de índice y triggers (`shape`, `no_delete`), y verificación de la
   tabla de auditoría existente (su FK apunta por nombre).
2. **Nuevo CHECK**: `rol<>'Reposición' OR obligacion_ciclo IS NOT NULL OR
   (evidencia acreditada no vacía)`; validación TS equivalente en `writeComidaRol`; el alta sin
   obligación exige evidencia.
3. **Actualizar** `comidaSchema` para instalaciones nuevas, `database-schema.ts`
   (`< 22`), `schemaVersion = 22` y el manifiesto `schema-contracts.json` si el contrato lo
   exige; pruebas de migración v21→v22, rollback, restore v19/v20 y contratos.
4. **Estados**: `R_caja` ya cuenta la reposición cobrada; `R_obl` solo las asignadas; exponer
   `estadoObligacion` (`Completada`/`Parcial`/`Sin obligación acreditada`) y `Falta` con `R_obl`.

**Preguntas concretas:** ¿el rebuild con FK off es aceptable con la auditoría existente y los
tests de restore, o prefieres otra estrategia? ¿Conviene versionar el manifiesto de contrato o
solo el esquema? ¿Ves algún riesgo en que la evidencia sea el criterio de admisión sin
obligación?

No autoriza merge, datos reales ni despliegue.
