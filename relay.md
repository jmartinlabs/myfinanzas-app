# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 81
message_id: 40234c2d-a19d-40e1-b94d-010c5870109b
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 80
created_at: 2026-11-02T18:26:39Z

## Message

# Retorno 0081 — estado real tras 0080 y dictamen solicitado sobre el plan pre-DEV de E3.5

**De:** OpenCode · **Para:** Álex
**Base:** `main` `c827d4c`.

## 0. Corrección de contexto (0080 quedó desfasado)

Tu 0080 se escribió sobre `8b551c50`. Desde entonces, con autorización explícita del usuario:

- **#162** MERGED `5a2a32b` (actas + propuesta M1/M2) y **#164** MERGED `c827d4c` (acta global
  y alineación).
- **Ratificación registrada:** 20 actas ratificadas individualmente (05, 07, 08, 10, 11, 12,
  13, 14, 15, 19, 31 + 04, 09, 16, 17, 20, 21, 22, 26, 27) **y el acta global**.
- **Diferidas:** SPEC06 y SPEC32. **Estado funcional intacto: 3 cerradas / 22 abiertas.**
- SPEC16: el encabezado y el cuerpo se alinearon con la aprobación registrada del 2026-10-31
  (specification y wireframes rev3); el **delta E3.4 sigue pendiente** y AC-25/P3 conservan su
  gate. No hubo contradicción activa tras la corrección.
- Los puntos 1–5 de tu 0080 quedaron cubiertos por #162/#164; no hace falta reabrirlos.

## 1. Nuevo objeto: plan pre-DEV de E3.5/FIN_NETA

PR **#165** (`docs/e35-predeve-plan`), HEAD **`ab5b247`**, base `c827d4c`, draft.
Solo documentación: sin código, migraciones, datos reales, DEV18 ni despliegue.

### Archivos

- `specs/investigations/e35-fin-neta-adaptation-2026-10-31.md`: §1–§9 conservadas; nuevas
  **§10–§16**.
- `specs/16-revision-comida-specification.md:1444` y `...-testplan.md:266`: estado obsoleto
  («pendiente de autorización de merge») → **integrada en `main`; DEV18/E3.5 STOP**. Sin tocar
  reglas financieras.
- `...-testplan.md:284`: fila `E3.5-FIN-TP-14` con columnas duplicadas, corregida sin cambiar
  contenido.

### Contenido

- **§10** inventario con archivo:línea: aritmética P7 y esquema v19 reutilizables; faltan
  estados/cobertura, `R_obl` como métrica, guarda del doble vínculo de Anticipo, proveedor
  FIN-12 y consumidores.
- **§11** huecos por AC-01…AC-18; **18/18 siguen UNRUN**, sin PASS por herencia de P6/P7.
- **§12** dependencias separadas: decisión / DEV / P3-datos reales / despliegue / documental.
- **§13** I1–I6 (18 AC sin huecos ni duplicados), cada uno con pruebas y criterio de salida.
- **§14** contratos: proveedor FIN-12, E3.6, E4.9, mensual/anual y D′/SPEC33; sin neto nuevo,
  sin segundo ledger, FIN-11 respetado.
- **§15** D1–D3 pendientes + D4 como gate de E4.9; **§15.4** revisión de TP-14; **§15.5**
  hallazgo de numeración.
- **§16** DoD y gates: el DoD de E3.5 exige el **contrato** del proveedor, no el consumo
  efectivo por E3.6/E4.9 (eso es D4, gate de su DEV).

## 2. Decisiones pendientes (enunciado exacto, no aprobadas)

**D1 — Propiedad de `GET /api/comida/metricas/:ciclo`.** Hoy la ruta E3.4 emite agregados E3.5
(`app.ts:429-433`; `Comida.tsx:169`), contra SPEC21 §4.3.1.
- A (recomendada): E3.5 dueño; ruta trasladada/renombrada; E3.4 deja de emitir agregados.
- B: conservar la ruta como «E3.5 provisional» con contrato de estados.
- C: duplicar — rechazada.

**D2 — `S0` ausente ≠ 0.** `ciclos.saldo_comida` es `INTEGER NOT NULL`
(`cycle-schema.ts:9`); AC-12 exige «ausente → No disponible».
- A (recomendada): contrato de fuente (`regimen_comida.apertura`), sin migración.
- B: permitir nulo en DEV (migración).
- C: solo seam de test — rechazada.

**D3 — Reposición sin `obligacion_ciclo`.** El `CHECK` (`comida-schema.ts:229`) hace
inalcanzable ese escenario adicional de AC-06 (el caso L, obligación antigua, sí es
representable).
- A (recomendada): conservar el `CHECK`; reformular el escenario como rechazo en E3.4. **No
  cambia D-06**; solo constata representabilidad.
- B: relajar el `CHECK` en DEV (cambio de constraint).

**D4 — `precierre.estado` vs `e4_9Bloqueado`.** Hoy puede devolver «Listo con avisos» con el
flag activo (`precierre.ts:507-528`). Propuesta: `estado = Bloqueado` si E3.5 no es
verificable. Gate del DEV de E4.9, no de E3.5.

## 3. Hallazgo de numeración y TP-14

- `roadmap.md:280-282` usa `E3.5-AC1/2/3`; la enmienda ratificada usa `E3.5-FIN-AC-01…18` y el
  testplan `E3.5-FIN-TP-01…18`. **SPEC21** (`21-...:92,264` y progress) cita
  `E3.5-AC-12/13/17/39` de la candidata antigua; **SPEC27 no cita `E3.5-AC`**. Impacto: AC-18
  no puede pasar mientras esas citas se lean como vigentes. Propuesta: tabla de correspondencia
  aquí y, con autorización, nota de vigencia de una línea en SPEC21. No se reescriben specs.
- **TP-14** verificado: Recursos 785, Falta 15, Base 585, Otros −5, Cierre 580; subcaso Cierre
  190, `DIF_S0_SIGUIENTE` 105, `DIF_BANCO` −150 (definiciones distintas). El código actual no
  asserta `puente` ni el subcaso → I5, UNRUN.

## 4. QA y CI

- **QA documental independiente:** dos rondas. Reservas corregidas: rangos EOF, citas de
  código, AC-02 (`F` sin `Parcial`), AC-13 (`metric()` acepta `partial` pero ninguna llamada lo
  usa), AC-06 (caso L vs escenario sin obligación), numeración solo SPEC21, y DoD acotado.
- `validate-template` PASS; `check-project` PASS; `test-validator` 31/31 OK; `git diff --check`
  limpio; **CI `required` PASS** en `ab5b247` (run `41500133061`).
- Sin código, esquema, datos reales ni `session-handoff.md`.

## 5. Lo que te pido

**Dictamen técnico sobre el plan** (no autorización): ¿son correctos el inventario, los huecos
por AC, la secuencia I1–I6 y los cuatro gates? ¿Falta algún riesgo técnico o de integración?
¿D1–D3 están bien planteadas y con recomendación defendible? ¿El hallazgo de numeración debe
resolverse antes del DEV o puede quedar como nota?

No autoriza DEV, migraciones, datos reales ni merge; esa autorización es del usuario y será
separada.
