# DT6/T-BKP — Encargo pendiente: backup cifrado, custodia física y restauración

**Status: PENDIENTE — REGISTRO DE ENCARGO; NO EJECUTADO.**
No autoriza compras, contratación, DEV, cambios de criterios ni cierre de DT6/FIN_NETA.
Registrado el 2026-10-28 a petición del usuario para no perder el encargo.
Base: `main` `170d511` (PR #111 integrada); E4.9 sigue bloqueado.

## Contexto y decisión del usuario

- Dispone de ordenador y discos duros propios.
- No se contrata almacenamiento externo ni se adquiere hardware.
- El usuario gestiona personalmente el destino físico de las copias.

## Objetivo

Procedimiento sencillo para:

1. exportar el backup cifrado;
2. almacenarlo en el destino físico que el usuario decida;
3. restaurarlo posteriormente.

## Verificaciones exigidas para el gate

- **Restauración aislada real**, no simulada.
- **Evidencias de integridad**: manifiesto, checksum, versión de aplicación/esquema,
  clave disponible y resultado de la restauración.
- Pasos reproducibles y criterio de aceptación explícito, sin debilitar las pruebas.
- No cerrar DT6/FIN_NETA sin esas evidencias.

## Restricciones

- Sin dependencias de servicios externos ni infraestructura adicional innecesaria.
- Prioridad: **coste adicional cero**; no comprar ni contratar infraestructura por ahora.
- No cambiar criterios de aceptación.
- Mantener E4.9 bloqueado mientras DT6 y FIN_NETA sigan pendientes.
- Presentar alternativas viables, limitaciones y coste **antes** de solicitar decisiones.

## Investigación pendiente (ensayo E3.5 x86_64)

- Comprobar si el ensayo ya autorizado puede ejecutarse en un **runner GitHub Actions
  Linux x86_64 nativo** o en infraestructura existente.
- Sin debilitar pruebas; sin contratar infraestructura.

## Referencias técnicas existentes

- Mecanismo local ya disponible: VACUUM INTO, cifrado `age`, manifiesto cifrado,
  verificación `integrity_check`/FK/esquema y restauración aislada.
- Objetivos aceptados: RPO 24 h / RTO 2 h; retención 7 diarias/4 semanales/3 mensuales.
- Pendiente operativo: destino externo, custodia de claves, automatización/poda y
  evidencia de restauración efectiva.
- [security.md](../guidelines/security.md), [architecture.md](../guidelines/architecture.md),
  [SPEC27](../27-e49-cierre-financiero-specification.md).

## Próxima acción al retomar

1. Diseñar el procedimiento de exportación, custodia y restauración con los mecanismos
   existentes.
2. Definir el checklist de evidencias del gate.
3. Investigar el runner x86_64 y presentar alternativas, limitaciones y coste.
4. Solicitar decisión al usuario; no ejecutar compras ni cerrar gates.
