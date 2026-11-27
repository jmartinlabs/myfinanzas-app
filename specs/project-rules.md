# MyFinanzas · Project Rules

Reglas locales de MyFinanzas App, independientes del cliente. Se aplican sobre el núcleo común provisto por el plugin global `agentic-harness-plugin`; ante cualquier conflicto prevalece la regla más estricta.

## 1. Revisión independiente y contratos críticos
- Antes de entregar una especificación o cualquier contrato financiero, de integridad histórica, migración o frontera de arquitectura/seguridad, realiza una revisión técnica independiente (asesor / revisor independiente).
- Las decisiones financieras y funcionales viven únicamente en su spec propietaria (`specs/NN-*`); no se reabren, duplican ni infieren.
- Aprobar una spec **no** autoriza desarrollo: el paso a desarrollo exige autorización de alcance explícita y separada.

## 2. Flujos: `tweak`, `Standard` (`$task`) y `dev` (`Full`)
- **`tweak` (Quick)**: si un cambio toca semántica financiera, integridad histórica, migraciones o seguridad, escala de inmediato al flujo correspondiente; siempre prevalece el gate más estricto de MyFinanzas.
- **`Standard` (`$task`)**: permite cambios acotados de riesgo medio sin requerir una spec `Full` completa, manteniendo plan breve, criterios de aceptación, QA independiente y publicación en rama/PR dentro del alcance autorizado.
- **`dev` (`Full`)**:
  - Separa explícitamente los contratos futuros pendientes de los criterios del incremento vigente.
  - Respeta los límites de fixtures ficticios/demo; nunca uses datos financieros reales sin autorización específica.
  - No incluyas credenciales, secretos ni rutas personales en código, logs ni evidencias.
  - Verifica contraste y accesibilidad en cambios de UI.
  - Respeta los límites de reintentos ante fallos; no ocultes errores ni desactives checks.
  - Toda evidencia de CI debe quedar ligada al SHA exacto verificado.
  - Distingue siempre entre **implementado**, **aprobado** e **integrado** (`main`/`test`); nunca avances el roadmap ni el estado de épicas por implicación.

## 3. Disciplina de QA y evidencia
- Toda evidencia reutilizada debe declararse como tal; cualquier comprobación no ejecutada se informa explícitamente como `UNRUN` (nunca como pasada ni reejecutada implícitamente).
- El QA independiente se ejecuta siempre en un subagente limpio de solo lectura (`qa-review`), nunca confundido con la revisión interna del Orchestrator.

## 4. Modelos, esfuerzo y clientes
- El modelo del coordinador lo configura el propietario en su cliente y nunca se cambia automáticamente.
- Los defaults y perfiles (`standard`/`complex`) en `.agents/harnesses/<coordinador>.json` son una petición, no un requisito bloqueante en delegación nativa: si el cliente no puede aplicarlos o confirmarlos, se delega con herencia nativa y se informa.
- **T3**: los perfiles se resuelven exclusivamente desde `.agents/harnesses/t3.json` o, si existe, `.agents/harnesses/t3.local.json` (sin herencia cruzada entre ambos); si el proveedor o modelo resuelto no está disponible, se detiene el despacho sin sustituirlo ni activar pago o créditos.
- **Antigravity**: el Orchestrator nativo opera con la configuración del propietario (p. ej. Neon Low / Hydrogen Medium). Su herramienta `invoke_subagent` solo admite `Model` en `{inherit, flash_lite, flash, pro}`, no expone parámetro de `effort` y no permite verificar el modelo efectivo ejecutado; se documenta esta limitación y se delega con herencia nativa salvo indicación expresa.

## 5. Infraestructura, datos reales y límites
- Nunca reactives Dev32/PR30, infraestructura VPS en pausa ni despliegues sin autorización específica.
- Nunca accedas, importes ni publiques datos financieros reales, bases de datos reales, credenciales ni secretos.

## 6. Handoff y merge
- En cierres de sesión prevalece el protocolo de `handoff` para consolidar trabajo recuperable sin cruzar gates ni dejar trabajadores descontrolados.
- El permiso de push/PR **no** autoriza merge: todo merge exige aprobación explícita del propietario (la regla más estricta prevalece; nunca activar auto-merge).
- La promoción `test→main` exige aprobación independiente y nunca se infiere del merge a `test`.
