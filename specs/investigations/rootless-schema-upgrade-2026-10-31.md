# Rootless y upgrades de esquema — diagnóstico y propuesta limitada

Fecha: 2026-10-31. Autor: orquestador OpenCode. Estado: diagnóstico reproducible;
sin cambio de guardas, sin autorización de release/rollback.

## 1. Hechos verificados

- `main` contrastado: `02ed734` (merge PR #138), esquema **v18**, contrato de
  datos `e4.1-v18`.
- PR #136 (`codex/comida-unico-01`, `c96cb79`): esquema **v19**, contrato
  `e3.4-v19`.
- PR #137 (`codex/dprima-simplificada`, `89b8375`): esquema **v20**, contrato
  `e2.7-v20`.
- El workflow `Rootless infrastructure 32` construye una release previa desde
  `git merge-base HEAD origin/main` y compara
  `previous.inputs.contracts` con `manifest.inputs.contracts`
  (`infra/tests/rootless-integration.py:474-480`).
- `infra/compatibility.py::require_rollback` exige contratos **idénticos**
  (`schema`, `data`, `authentication`, `confirmed_writes`) antes de aceptar
  cualquier matriz de rollback.
- Resultado en los HEAD de ambas PR:
  `stage=previous-private-release-build; reason=incompatible contract metadata;
  no rollback authorized`. No es un fallo del código de la aplicación: la
  release final se construye y sus pruebas de API llegan a ejecutarse.
- Runs: #136 `41184720546`, `41186494342`; #137 `41184746347`,
  `41186505804`. El paso falla en el mismo punto.

## 2. Por qué ocurre

El gate fue diseñado para releases con contrato estable. Cualquier migración de
esquema/datos cambia `contracts` y, por tanto, **ninguna PR que suba versión de
esquema puede pasar rootless con la política actual**, aunque la migración sea
correcta, conservadora y reversible por restauración. No existe un mecanismo
aprobado que distinga:

- upgrade de esquema revisado y con plan de restauración, de
- cambio incompatible sin recuperación demostrada.

No se ha desactivado ni relajado la verificación para obtener un verde.

## 3. Evidencia de CI adicional (independiente del esquema)

Los runs de Actions desde `08:54Z` fallan en ~3 s sin ejecutar pasos. La
anotación del check-run es explícita:

> The job was not started because recent account payments have failed or your
> spending limit needs to be increased.

Afecta también a `workflow_dispatch` sobre `main` (`41186579653`), por lo que no
es atribuible a las PR. Requiere acción humana en *Billing & plans*; mientras
tanto, ningún HEAD puede obtener un PASS de CI nuevo. El PASS de `required` en
`b51764d` (anterior a este estado) no acredita los HEAD finales.

## 4. Propuesta limitada (no implementada)

No se propone una autorización genérica de «release/rollback». Se propone un
cambio acotado del gate, en una PR separada y con aprobación humana específica:

1. **Manifiesto de migración explícito** por release: versión origen, versión
   destino, contratos schema/data/auth, evidencia de backup cifrado previo,
   restauración a volumen nuevo, retención de filas/identidades/auditorías y
   ausencia de downgrade in-place.
2. **Prueba de matriz real**: release previa (v18) → inicialización → upgrade a
   v19/v20 → operación → backup → restore aislado → verificación; y rechazo de
   downgrade in-place sin restauración.
3. **Gate condicional**: `require_rollback` acepta contratos distintos **solo**
   si existe ese manifiesto firmado por el usuario y las pruebas pasan; en
   cualquier otro caso sigue fallando cerrado. El rollback autorizado sería por
   restauración, nunca por downgrade destructivo.
4. **Sin cambios a la baja** en contratos, checks de autenticación ni pruebas de
   integridad.

Consecuencia si no se aprueba: #136 y #137 no pueden obtener rootless verde y
no deben mergearse; el trabajo queda como candidato verificado localmente.

## 5. Decisión necesaria

- Aprobar o rechazar la propuesta limitada y su PR de infraestructura.
- Resolver el límite de pago de GitHub Actions.
- Solo después, autorizar merge de #136 con su HEAD verde y retarget/revisión de
  #137.

Sin datos reales, sin despliegue y sin merge en este informe.
