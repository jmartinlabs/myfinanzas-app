# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 94
message_id: 6c964d7a-b795-4810-81f1-9c32d12cd046
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 93
created_at: 2026-11-03T08:20:23.339Z

## Message

# Dictamen y plan de ejecución al retorno 0093 — cerrar E3.5, preparar #167 y #170

El usuario solicita trasladarte mi recomendación para avanzar **en paralelo** en los tres frentes, sin nuevas rondas generales de brainstorming.

## 1. E3.5 / PR #171 — cerrar reservas antes de solicitar integración

**Continuar DEV ya autorizado** en la rama vigente. No proponer todavía merge funcional: terminar las pruebas y evidencias focales de **E3.5-FIN-AC-08/09/11/13/14/17**, incluidas sus filas TP:

- AC-08/09: pruebas propias de grupos, devolución, banco y Partida NULL, con oráculos y asserts del caso positivo/negativo.
- AC-11: demostrar solo agregado y los estados/coberturas derivados, sin generar nueva fuente financiera.
- AC-13: periodo vacío y fallo de fuente además del subtotal parcial ya validado; `No disponible` nunca equivale a cero.
- AC-14: además de 785/15/585/−5/580 y 190/105/−150, completar composición 800/−100 y devolución antigua.
- AC-17: duración **Real** y casos temporales propios de TP-17.
- AC-12: conservar D2=O0; S0 ausente en ciclo válido es estructuralmente imposible, documentar ese límite sin inventar ciclos imposibles; verificar banco parcial y distinción S0/B_A.
- AC-15: mantener la frontera con E4.9 (D4, fuera de este DEV); validar únicamente el contrato de E3.5 exigible ahora. AC-18 ya cuenta con PASS documental, no funcional de E4.9.

Revalidar v22, FK, auditoría, contratos y regresiones. Los 56 fallos globales heredados de `main` deben permanecer identificados y comparados: no presentar el suite global como PASS sin matices. Actualiza matriz AC↔TP y el cuerpo de #171, ejecuta QA independiente y CI sobre HEAD final. Presenta para decisión humana **solo cuando las reservas subsanables de E3.5 estén cerradas**; no efectuar merge funcional sin autorización ulterior.

## 2. SPEC23 / PR #167 — preparar cierre documental

Veo favorable **preparar el merge documental**, sin autorizar DEV E4.3 ni DDL. Comprobar que se preservan las **16 decisiones** y las **17 AC / 17 TP**, las reservas A-01/A-02/A-03 resueltas, la política de fecha/antigüedad, y la frontera de certificación E4.9. DT2 del almacén sigue como gate de ejecución.

Actualizar con la `main` vigente, revisar alcance/diff y pasar QA documental + CI final. Presentar al usuario paquete y estado para **ratificación de specification/testplan y autorización expresa del squash merge documental**. No inferir aprobación del diseño técnico DT2, implementación ni migración por integrar documentos.

## 3. SPEC17 / PR #170 — preparar cierre documental

Tras QA focal APTO, favorable a **preparar el merge exclusivamente documental** de wireframes de 390 px. Actualizar con `main`, revisar diff y ejecutar CI/QA final, incluidas navegación, estados, acciones y ausencia de overflow. Presentar al usuario la versión candidata y solicitar **autorización expresa de merge documental** y, separadamente, aprobación de wireframes finales. DEV17 permanece sin autorización.

## 4. Límites / retorno

Este Relay confirma la instrucción de **preparar** los dos merges documentales y terminar E3.5. **No constituye por sí solo aprobación inequívoca para ejecutar ningún merge**: conserva el gate explícito de autorización de merges del usuario. Tampoco autoriza DEV17/DEV E4.3, datos reales, despliegue ni nuevas migraciones fuera de E3.5 ya aprobado.

Devuelve resumen por frente (PR, SHA, CI, QA, reservas, decisión solicitada) y solicita únicamente los permisos humanos aún necesarios, sin reabrir asuntos ya decididos.
