# 32 — Ejecución segura con Podman rootless: Brainstorming
Status: APPROVED — especificación íntegra, D1–D3 y AC-01–AC-24
Roadmap/context: [roadmap](roadmap.md), [infra](../infra/README.md), [contrato 31](31-sqlite-produccion-specification.md).
Next action: cerrar controles y CI de spec 32; dev 32 autorizado después, PR independiente; no merge ni VPS.

## Contexto confirmado — 2026-10-22
Fuente: solicitud del usuario en este chat. Autoriza especificar preparación técnica
transversal, no implementar ni acceder/modificar VPS. Debian 13, Aruba, Podman
rootless, Quadlet, Caddy/HTTPS y directorios privados preparados según el usuario;
no inspección remota independiente. Actualmente página estática. Dev 31 integrado
en 511fcba y cierre documental #28 en 62662e974eb6b9e6724f42ea1f385b569a905714.
Conservar R6 sin causa atribuida y límite fsync. Sin datos reales/Excel, PR #21/#22
intactas. ID 32 libre; 01–30 reservados a entregas financieras, 31 ya ocupado.

## Round 1 — 2026-10-22
Recomendaciones marcadas son propuestas, no respuestas confirmadas.

D1. ¿División y frontera de esta entrega?
- [x] 32: imagen, runtime/Quadlet y pruebas aisladas; siguiente fase Caddy/HTTPS; otra recuperación externa; gates completos antes de datos reales. Evita mezclar tres capacidades y no autoriza despliegue.
- [ ] Especificar y entregar todo como una sola funcionalidad, con revisión y aceptación más amplias.
Confirmed answer: PENDING; source/date: PENDING.

D2. ¿Política de actualización y rollback inicial?
- [x] Ventana de mantenimiento con parada controlada, un único escritor; rollback de imagen solo con esquema compatible y sin pérdida de escrituras. Restore siempre explícito y a destino nuevo. Sin alta disponibilidad prometida.
- [ ] Exigir actualización sin interrupción; requiere diseño adicional para SQLite y coordinación de escritores, fuera del alcance recomendado.
Confirmed answer: PENDING; source/date: PENDING.

D3. ¿Distribución inicial de artefactos?
- [x] Archivo OCI privado y frontend estático emparejado por manifiesto/checksums, verificados localmente. No crear registro ni publicar imagen en esta fase; diseñar transporte futuro con verificación de integridad y procedencia.
- [ ] Registro OCI privado con autenticación y publicación restringidas; especificar permisos, custodia y retención antes de habilitarlo.
Confirmed answer: PENDING; source/date: PENDING.

## Coverage
Requisitos: imagen fijada, rootless/Quadlet, red, persistencia y ciclo de vida.
Interfaces: CLI deliberada, unidad de usuario, health y manifiesto de release;
sin pantallas nuevas ni endpoints financieros. Datos: DB/clave existentes y
metadatos técnicos, nunca valores reales. Dependencias: Bun/Effect/SQLite,
Debian/glibc, age, Podman/systemd y futuro Caddy. Validación: UID/permisos,
solo loopback host, secretos fuera de imagen/entorno/logs, salud y señales.
Fallos: disco lleno, kill, incompatibilidad de esquema, imagen inválida, permisos,
fsync ambiguo y recuperación sin sobrescritura; especificación con AC verificables.
Detalles de versiones concretas Podman/systemd del VPS permanecen no inspeccionados;
se fijará baseline compatible durante dev y se comprobará remotamente solo con permiso.

## Wireframes
N/A: infraestructura sin nuevas pantallas. CLI/estado operativo descritos en specification;
frontend mantiene la UI aprobada. Pruebas HTTPS/navegador pertenecen a la fase posterior.

## Append-only clarifications
Sin respuestas de ronda 1 todavía. La aprobación de esta propuesta no se infiere de
la autorización de cerrar #28 ni de crear estos borradores.

## Confirmación de ronda 1 y publicación provisional — 2026-10-22

Fuente: mensaje expreso del usuario en este chat tras revisión con Álex.
Las respuestas PENDING de la ronda anterior conservan el estado histórico previo;
este registro confirma D1–D3, sin aprobar el documento completo.

- **D1 CONFIRMED:** separar ejecución Podman rootless de Caddy/HTTPS y recuperación
  externa. La entrega 32 define y prueba la interfaz de red para la integración
  posterior, incluida comunicación HTTP real mediante el puerto publicado.
- **D2 CONFIRMED:** mantenimiento con parada controlada, un único escritor y rollback
  exclusivamente con compatibilidad de esquema SQLite demostrada. No revertir ni
  restaurar automáticamente datos o migraciones incompatibles.
- **D3 CONFIRMED:** archivo OCI privado, imagen versionada y manifiesto verificable
  que empareja backend y frontend. Sin publicación de imágenes ni despliegue automático.

El usuario declara expresamente que **todavía no aprueba la especificación 32 completa**.
Autoriza excepcionalmente commit/push provisional de estos dos documentos a rama
específica y PR Draft para revisar los 24 AC. Es una excepción puntual al paso 6 de
`.agents/skills/spec/SKILL.md` (commit de documentos aprobados), no una modificación
del skill ni una aprobación implícita. Sin código, dev 32, merge, VPS o despliegue.
Los AC permanecen PENDING/NO EJECUTADOS; publicación documental no es evidencia técnica.

## Aprobación íntegra y precisiones — 2026-10-22 (Europe/Madrid)

Fuente: mensaje expreso del usuario en este chat, tras revisar PR #29 con Álex.
Aprueba íntegramente specification 32, D1–D3 y AC-01–AC-24, incorporando:
1. Verificación real de UID 10001/keep-id y volúmenes. Si es incompatible,
   documentar y justificar alternativa segura probada, sin privilegios adicionales
   ni relajación de 0700/0600. No suponer compatibilidad por configuración.
2. Rollback exige compatibilidad demostrada de esquema SQLite, contrato de datos
   y autenticación entre versiones, preservando escrituras confirmadas; sin revertir
   automáticamente datos/migraciones incompatibles.
Autoriza iniciar dev 32 solo después de completar correctamente spec/controles/CI,
con PR de implementación independiente. No autoriza merge de ninguna PR, VPS,
despliegue, infraestructura activa ni datos reales. Los registros PENDING previos
son historia; la aprobación no implica pruebas de implementación ejecutadas.
