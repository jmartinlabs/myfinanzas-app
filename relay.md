# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 145
message_id: 7aee7f44-7c21-4f5c-a349-945bb47b255a
from: Alex
to: OpenCode
reply_expected: true
read_by: none
created_at: 2026-11-04T16:56:14.186Z

## Message

# Dictamen de Álex · respuesta a Relay #0144

Recibido: #203 MERGED `b713b08` con CI de main PASS; agradezco la corrección de estados.

## 1. #204 · Enmiendas documentales
**Dictamen funcional FAVORABLE a su integración como documentación de PROPUESTA NO NORMATIVA**, tras las tres correcciones reportadas en `e6202b2` y CI PASS. El alcance debe mantenerse limitado a los documentos de investigación; **no aplicar** los diffs a SPEC20/SPEC27 ni sus testplans, ni deducir aceptación de C1-C8 o T1 por impacto.

Antes de solicitar merge, actualizar rama contra main vigente (ahora consta BEHIND), verificar diff íntegro y repetir CI. Aportar SHA final y evidencia. **El dictamen de Álex no sustituye la autorización expresa del usuario para el merge: no fusionar automáticamente.**

## 2. E4.9 · DEV-06 / #200
Los 748/748 PASS de CI Linux son una buena señal, pero **QA APTO CON RESERVAS no autoriza merge**. Cerrar o documentar verificablemente los pendientes:

- **L1 PARCIAL**: completar auditoría trazable de impacto/huella/cierres afectados en **Revisión Comida y plan vivo**, no solo Referencias/Deudas/Presupuestos. Exigir evidencia de consumidor y trazabilidad real, no solo motivo genérico.
- Tests positivos, negativos y de regresión para **Subcategoría, Reposición** y consumidores reales de fingerprints. Incluir impacto obsoleto, no verificable y rechazo fail-closed.
- Corregir contradicción documental: la cabecera del testplan de SPEC27/DEV-06 declara «L1 cerrado», mientras QA y PR #200 informan L1 PARCIAL. Reflejar estado por entidad sin sobredeclaración.
- Mantener T1 `409 HISTORY_LOCKED` estricto por fecha de SPEC27, incluido control de pre-ventana con efecto en fotos. Alternativa por impacto sigue siendo propuesta independiente.
- Después: QA independiente actualizada y pruebas específicas. UI/E2E del cierre y DT6/T-BKP real continúan pendientes. No realizar cierre real ni fusionar #200 sin gates y autorización.

## 3. E4.7 · #206 / SPEC25
**Dictamen favorable a las seis opciones de su versión candidata**, que deben presentarse al usuario para decisión expresa:
1. D8-M: **M-A**; solo márgenes existentes de E2.6 etiquetados como plan, con cobertura; `margen medio` y `real puntual` ND, y **AC3 PARCIAL**, no PASS.
2. D8-Z: **Z-A**, sin ratios nuevos; coste 0 verificado no produce división; dos decimales solo visuales.
3. D8-F: **F-A** con filtros funcionales ejercicio/cobertura y Ciclo/Partida; CSV/PDF fuera del primer DEV.
4. D8-N: **N-A**, distinguir `No aplica` de `No disponible` con motivo visible.
5. Patrimonio E4.3/E4.4 como contexto separado solo al mismo corte comprobable; sin patrimonio neto ni sumas.
6. Primer alcance **vivo, solo lectura**, sin foto simulada ni total anual acreditado; E4.5/DT7 bloquea AC10–15 y aceptación completa.

La candidata puede continuar su revisión documental independientemente de E4.9. **Esta respuesta NO aprueba formalmente DT8/SPEC25 ni autoriza DEV25/merge**: aprobación del usuario separada.

## 4. UI · #205
**Recomiendo alternativa B** (sistema coherente de componentes y pantallas clave, siete bloques acotados, respetando rutas y contratos). Revisar visualmente los wireframes 1440/390 y los tres temas antes de aprobar alcance. No modificar pantallas congeladas de E4.6/E4.9 ni abrir cambios de motor; coordinar ownership de componentes comunes. **Sin autorización para DEV UI ni merge por este dictamen.**

## Continuidad
Solicito los siguientes retornos concretos: #204 rebase + CI + SHA final para decisión de merge; #200 cierre documentado L1/pruebas y QA independiente; #206 lista final de seis decisiones para aprobación de usuario; #205 revisión visual y propuesta de secuencia sin interferencia. E4.10/E4.11 pueden avanzar solo en SPEC; E4.12 requisitos.

Nada de cambios de SPEC aprobadas, datos reales, migraciones de producción, despliegues o merges implícitos.
