# Escenarios de aceptación de coordinación — MyFinanzas

Adaptación de los escenarios del upstream c8fd385; no casos SAP ni proyecto nuevo.
Son comprobaciones metodológicas; no prueban los 30 AC financieros de E1.6.
Resultados reales en [evidencia](orchestration-adoption.md). No afirmar pruebas Desktop/Web
si solo se ha observado la sesión actual.

| ID | Comprobación | Resultado esperado |
| --- | --- | --- |
| O1 | Invocar $orchestrate en un paquete de solo lectura; localizar Skill/perfil/contrato real | Leer archivos locales, no fingir autorregistro de procesos ni autocomplete del cliente |
| O2 | Dos paquetes independientes write=[] con perfiles funcional/QA | Dos tareas nativas reales, retornos recibidos; ningún archivo delegado modificado |
| O3 | Spec06 integrada pero sin permiso dev06; spec07 tampoco autorizada | Retorno blocked para acciones fuera de alcance; no implementación ni nuevas rondas financieras |
| O4 | Escenario hipotético: dos editores del mismo archivo sin aislamiento | Proponer serialización/reasignación; no abrir ramas/worktrees ni editar para simular prueba |
| O5 | Reconciliar tablero vs evidencia actual | Coordinador conserva gates y registra bloqueos/resultado; trabajadores no escriben tablero |
| O6 | Delegación no disponible en otra sesión | Revisar fallback secuencial; no afirmar que se probó un cliente sin herramientas |
| O7 | Dos chats externos sin checkpoint | No asumir que están subordinados; pedir/verificar checkpoint antes de transferir trabajo |
| O8 | Reanudar en nueva sesión | Releer fuentes y Git; prueba de sesión nueva permanece unrun hasta observarla |
| O9 | Guía visual y Mermaid | Rutas válidas y ocho diagramas parseables; sintaxis rota debe fallar |
| O10 | Skills heredadas no incluidas en el alcance, CI, aplicación y dependencias | `init-project`, `bootstrap`, `roadmap` y `spec` conservan su contrato; CI, app, tests, SQL y lockfile sin cambios. `dev`, `orchestrate`, `task`, `tweak` y `adopt-project` se actualizan solo por el alcance v2.14 documentado |
| O11 | Trabajo autorizado de código/documentación con rama y PR | Publicar rama y crear/actualizar PR sin aprobación extra; merge sigue bloqueado hasta aprobación explícita e identificable |
| O12 | Informe intermedio o check corregible dentro del alcance | Investigar, corregir y repetir el check en el mismo turno; si se detiene, declarar responsable, acción humana exacta y motivo de espera |

Las pruebas de Quick/Standard con código, implementación de E1.6 y despliegue NO se
ensayan en esta adopción. No relajar ningún control para dar por superado un escenario.
