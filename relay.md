# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 114
message_id: ca89fcb2-45ba-48da-bcf0-38cfa951c459
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 113
created_at: 2026-11-03T16:43:23Z

## Message

# Dictamen técnico de Álex — E4.3, E4.9 y SPEC24 (sin autorización de merge)

He revisado el estado y los documentos actuales. Esto **comunica recomendaciones técnicas de Álex**, no debe interpretarse como aprobación formal de wireframes/specs por el usuario ni como autorización de merge o nuevo DEV.

**Base verificada:** `main` `024b348` (DEV17/#176 integrado); PR #177 HEAD `138144c` abierta; PR #178 HEAD `9d55d5a` abierta; PR #179 HEAD `982fa25` abierta; #180 draft HEAD `7908a54`, en desarrollo B/C. CI `required` verificada SUCCESS para #177, #178 y #179 en sus respectivos SHA consultados.

## 1. #177 / wireframes E4.3

**Visto bueno técnico favorable** al diseño en `138144c`: las resoluciones ya están incorporadas (valor EUR calculado/read-only en Automática, API ISO/UI DD/MM/AAAA, idempotencia interna, transición Manual↔Automática con revalidación, cantidad inconsistente ND, posiciones cerradas diferenciadas). Recomiendo **aprobar los wireframes y fusionar documentalmente #177**, pero **no ejecutes merge ni registres aprobación visual del usuario** salvo autorización inequívoca de este; DEV E4.3 continúa sin autorizar.

## 2. #178 / wireframes E4.9 — corrección puntual antes de aprobación

El apartado **A-07** mezcla estados: conforme a SPEC26, **E4.8 precierre puede ser Parcial** por ausencia/cobertura insuficiente de E3.5/FIN_NETA; **E4.9 cierre queda Bloqueado** y no genera foto. El precierre puede estar Bloqueado por otros gates (p. ej., backup no acreditado), pero no se debe imponer "Bloqueado" solo por faltar E3.5 cuando SPEC26 permite Parcial.

Corrige esa nota y cualquier texto de wireframes que presente estos dos estados como equivalentes; conserva las reglas y flujos aprobados sin introducir un contrato nuevo. Después aporta SHA final/CI y propone la aprobación visual y merge de #178; **sin aprobar o fusionar en nombre del usuario** ni iniciar DEV E4.9.

## 3. SPEC24 / #179 — Q1–Q12

Dictamen favorable a **las alternativas A recomendadas de Q1–Q12**, con las siguientes precisiones materiales:
- **Q3 requiere enmienda:** `mesesCubiertos = liquidezVerificada / costeEsencialMensual`, por tanto **NO depende de configurar `mesesObjetivo` ni umbrales**. Si liquidez y coste esencial son completos y coste >0, debe mostrarse meses cubiertos calculados, aunque falte configuración del objetivo. **Solo `minimoObjetivo = costeEsencialMensual × mesesObjetivo` permanece ND por falta de meses objetivo**. Si liquidez/coste no están verificados o coste=0, mesesCubiertos ND por su propio motivo. Ajustar brainstorming/spec/testplan/wireframes y AC afectados; sin nuevo almacén, defaults ni motor duplicado.
- **Q4:** usar ejercicio del `mesFinanciado` del ciclo actual para consultar `annualEquivalent`, incluso al cruzar ejercicio, sin usar reloj, corte o año de ingreso.
- **Q1, Q2, Q5–Q12:** resto de alternativas A coherentes con el modelo, sujeto a que no se introduzcan agregados nuevos ni se transformen parciales/ND en cero.

Las Q1–Q12 **siguen esperando confirmación expresa del usuario**; este dictamen no las ratifica por él. Solicitar aprobación de SPEC24/testplan sobre SHA final corregido, y merge independiente; DEV24 sin autorizar.

## 4. DEV21 / #180 y DT6

#180 puede seguir **B/C dentro del alcance que ya esté autorizado** y con su QA independiente final. No requiere bloquearse por estas correcciones documentales. QA y merge se solicitan por separado; no ampliar alcance.

DT6 permanece decisión operativa separada: equipo Linux x86_64/VM, dos soportes o aceptación explícita de riesgo, identidad `age` custodiada fuera de VPS/Git/copias y frescura compatible con RPO 24h. Sin acceso a datos reales ni cierre real autorizado.

## Retorno solicitado

Prioriza correcciones **Q3 de SPEC24** y **A-07 de #178**, con SHA/CI y cambios exactos, y ofrece al usuario un paquete compacto de autorizaciones pendientes (#177, #178 corregida, SPEC24 corregida) sin rondas de QA documental innecesarias. No mezclar "visto bueno técnico de Álex" con "aprobación del usuario".
