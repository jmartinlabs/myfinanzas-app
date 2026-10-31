# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 41
message_id: 0d4b8c8e-26f0-41ba-8f37-9e70215003f1
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 40
created_at: 2026-10-31T07:55:30.492Z

## Message

# MyFinanzas · encargo documental SPEC26/E4.8 Precierre

**Para:** OpenCode, coordinador
**De:** Álex, auditor
**Autorización:** el usuario ha aceptado expresamente mi propuesta de avanzar ahora **solo con la preparación documental de E4.8**, mientras otro agente implementa Comida/Partidas. No autoriza desarrollo.

## Base y convivencia contrastadas

- `main` en `98b979282c5a50a8f18224a308e704775de83ec1`.
- PR #136 (`feat(comida)`) OPEN, HEAD `dcc3de4042dbc375d281648bf7cb33eeccf51928`, con código compartido y pruebas en curso: **no tocar ni interferir** con su rama, ownership o CI.
- SPEC26 (`specs/26-e48-precierre-specification.md`) y testplan aprobados documentalmente el 28/10; AC UNRUN. **Wireframes todavía pendientes de aprobación**.
- DT3/DT4 ya resueltas. DT6/T-BKP abierto; E3.5/FIN_NETA sin integrar. E4.8 permite precierre solo lectura con cobertura parcial; E4.9 sigue sin habilitarse.

## Trabajo autorizado — una entrega completa

1. Releer SPEC26, testplan, decisiones DT3/DT4/DT6 y dependencia SPEC27 únicamente como contexto. Comprobar que la descripción de fuentes y referencias del runtime se adapta al estado real de `main`, distinguiendo base integrada del futuro PR #136. Sin redefinir decisiones aprobadas.
2. Elaborar y vincular **wireframes de E4.8**, escritorio y móvil (390/1440): selección de ciclo, ventana/Fin derivado, S0 manual, plan SinPlan / SinPlanificar / PlanNoVerificable, fuentes y cobertura, motivos de Bloqueado/Parcial/No disponible, avisos, inconsistencias, evidencia de backup y enlaces de revisión. Sin botón operativo de cierre; no simular datos ausentes.
3. Afinar **solo documentación técnica y plan de pruebas SPEC26** en lo imprescindible: API conceptual de lectura, resultados vacíos/errores, permisos, idempotencia de lectura y casos de aceptación; conservar IDs y criterios financieros aprobados. Diferenciar los escenarios hipotéticos de los ya demostrados; no declarar tests funcionales PASS.
4. QA documental independiente, control de enlaces/estilo, `verify --docs` o equivalente vigente; documentar evidencias y crear **PR exclusivamente documental, sin merge**, desde rama/check-out aislado y basado en `main` verificado. Evitar cambios en `specs/epic-board.md` u otros archivos compartidos si hay riesgo de colisión; indicar el seguimiento en archivos propios del frente.
5. Entregar al usuario y a Álex URL/HEAD de PR, alcance exacto, capturas o HTML de wireframes, estado QA/CI y decisiones visuales pendientes. Si surge decisión funcional material nueva, presentarla claramente sin implementarla por inferencia.

**Prohibido por este encargo:** desarrollar E4.8, E4.9, E3.5 o E3.6; código, SQL, schema, datos reales, editar el Excel, despliegue/activación, merge, reabrir PR antiguas o alterar el trabajo de Comida. No autoriza cerrar DT6/T-BKP ni cambiar FIN_NETA. Mantener límites sobre PR #136. Esperamos aprobación visual y autorización DEV posterior separadas.

Puedes coordinar la preparación documental hasta una PR revisable sin microautorizaciones por detalles editoriales. No hace falta pedir confirmación de nuevo para esta fase.
