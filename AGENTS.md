# Agent instructions · MyFinanzas App
Aplicación web privada para migrar el sistema financiero personal existente en Excel.
Repositorio privado: E1.1–E1.3 integradas; E1.4 local/ficticia en desarrollo autorizado.
Lee [contexto](specs/project.md) y [estado reanudable](specs/setup-progress.md) antes de actuar.

- Lee [architecture](specs/guidelines/architecture.md), [UI](specs/guidelines/ui.md),
  [quality](specs/guidelines/quality.md) y [security](specs/guidelines/security.md).
- Desde la raíz, con Bun 1.4.3: `bun install --frozen-lockfile`, `bun run dev`.
- Verifica `bun run typecheck`, `bun run build`, `bun run test`, `bun run test:e2e`.
  Prerrequisitos, comandos de plantilla y limitaciones: guideline de calidad.
- Usa el checkout aislado actual; no crees un worktree salvo petición explícita.
- Próximas entregas: evitar documentación/rondas redundantes; resolver detalles técnicos
  ordinarios durante desarrollo reutilizando arquitectura/componentes/pruebas. Mantener
  revisión rigurosa de lógica financiera, integridad, seguridad y persistencia.
- Sigue las ocho etapas de la metodología y las Skills locales; no inventes reglas
  financieras ni reabras decisiones confirmadas sin incompatibilidad justificada.
- E1.1: Q1–Q8 respondidas en specs/01-saldos-control-brainstorming.md; specification
  aprobada/integrada con evidencias F1–F3 del usuario. No reabrir decisiones;
  respetar extremos no demostrados. Saldo actual no filtra por Fecha apertura; histórico
  mensual sí comprueba esa fecha. No añadir filtro temporal ni fecha Manual por inferencia.
  M1/M2 respondidas y aprobadas como contrato de aplicación, no reglas físicas Excel;
  matriz vigente en specification. Revisión M2 del 2026-10-21: switches No/false
  al alta y POST omitido=false; PATCH conserva y ausencias históricas no se convierten.
  Sustituye elección manual obligatoria anterior. Tema solo claro; sin modo oscuro.
  Primera propuesta visual común y pantallas E1.1 aprobadas por comunicación del usuario
  el 2026-10-21; guía UI y specification documentan alcance. No confundir aprobación
  con pruebas de UI implementada ni adelantar Ciclos para la cabecera.
  E1.1 implementado e integrado en PR #7 tras aprobación expresa del usuario sobre
  4f7cdda y autorización de merge el 2026-10-21. Motores financieros posteriores pendientes.
  STEP 8 completado e integrado mediante PR #8 tras aprobación del usuario sobre
  f4ff3e2 el 2026-10-21: ocho etapas iniciales cerradas y Skills spec/dev reutilizables.
  E1.2 especificación/diseño aprobados e integrados PR #10 (0c7a87e); dev 02 autorizado
  en feat/e1-2-clasificacion, solo local/ficticio. Unicidad SUB global sin mayúsculas,
  tildes/espacios conservados y comodines literales; reserva resuelta por usuario.
  E1.2 completada e integrada mediante PR #11 tras aprobación expresa sobre 58b51f9
  y squash merge autorizado. 27 criterios verificados; AC-19/24/25/26 siguen contratos
  futuros. E1.3 integrada PR #13 (ff9d18d); spec 04 aprobada PR #14 (5fa4ace).
  $dev 04 autorizado en feat/e1-4-movimientos; progress/testplan 04: 29 AC actuales/4 futuros. Sin E1.5 ni deploy.
- Referencia funcional vigente: v5.11 en specs/project.md.
- Especificación funcional recibida y leída: specs/functional-reference-v5.11.md.
- Roadmap aprobado en specs/roadmap.md; DT1–DT10 progresivas antes de cada entrega.
- SQL/actualización local E1.2 autorizados conforme especificación 02, preservando E1.1. Sin despliegue. Contexto
  en specs/project.md; Excel sigue como fuente de verdad hasta el traspaso autorizado.

## Política permanente de Git y GitHub
Aprobada por el usuario el 2026-10-20. El usuario cambió el repositorio a privado; no cambies su visibilidad.
- Gestiona autónomamente Git/GitHub; el usuario no debe ejecutar comandos manuales.
- Comprueba estado, remoto y rama principal; preserva cambios ajenos y commits locales.
- Trabaja en una rama específica por STEP o funcionalidad, nunca directamente en main.
- Revisa tus cambios, ejecuta las validaciones aplicables y crea los commits necesarios.
- Antes de cada push inspecciona todos los commits que se enviarán, sus mensajes,
  rutas y contenido, incluidos archivos borrados en commits posteriores. Revisa también
  el diff final: no publiques datos financieros reales, bases, credenciales, secretos
  ni archivos sensibles. No confíes únicamente en .gitignore o un escáner.
- Haz push de la rama y crea una PR hacia main con resumen, cambios, pruebas y limitaciones.
  Si depende de otra rama aún no integrada, declara la dependencia y no la ocultes.
- Espera aprobación explícita del usuario de esa PR antes de hacer merge; una aprobación
  del plan o permiso para push no equivale a aprobación de merge.
- Tras esa aprobación, realiza el merge en GitHub, verifica estado y commit integrado,
  actualiza el checkout sin perder trabajo y confirma árbol limpio.
- Ante problemas de seguridad, conflictos o fallos de validación, detente y consulta;
  no fuerces un push ni desactives verificaciones. Informa de permisos o accesos bloqueados.
- No despliegues a producción, cambies permisos/visibilidad ni realices operaciones
  destructivas sin autorización específica. No publiques fuera del flujo autorizado.
