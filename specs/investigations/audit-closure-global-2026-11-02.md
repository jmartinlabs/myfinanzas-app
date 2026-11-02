# Acta global de cierre de auditoría de especificaciones — 2026-11-02

Status: **acta global ratificada por el usuario el 2026-11-02; merge de la PR documental
autorizado por separado.** Base: `main` `8b551c5`. Documentos: [tracker](spec-audit-tracker.md),
[resumen](audit-spec-resume-2026-11-02.md) y [actas](audit-closure-actas-2026-11-02.md).
Alcance: las **25 SPEC** del inventario vigente (01–17, 19–22, 26, 27, 31, 32);
SPEC18 no existe en `main` y no forma parte del alcance. Este acta no declara ninguna SPEC
funcionalmente cerrada.

## 1. Alcance y base

- **Base auditada:** `main` `8b551c5` (squash #163).
- **Merges considerados:** #157 `fd2e21c` (SPEC22), #159 `d7b9077` (reanudación
  documental), #160 `30a832c` (H-SPEC16-02; CI post-merge `41455836058`), #161 `0c8d2fc`
  (H-SPEC26-02; CI `41457244681`), #162 `5a2a32b` (propuesta M1/M2 SPEC17 y actas; CI
  `41468802292`) y #163 `8b551c5` (M1/M2/m8 aplicados; CI `41468958542`).
- **Fuera de alcance:** DEV, SQL, migración, datos reales, despliegue, VPS, merge y cambios
  de permisos. Nada de este acta autoriza esos trabajos.

## 2. Estado dual

| Plano | Resultado | Significado |
| --- | --- | --- |
| **Auditoría documental** | **23/25 cerradas** (3 previas + 11 ratificadas + 9 ratificadas el 2026-11-02) y **2 diferidas**; cierre global **ratificado** | 3 previas (SPEC01–03) + 11 ratificadas (05, 07, 08, 10, 11, 12, 13, 14, 15, 19, 31) + 9 ratificadas el 2026-11-02 (04, 09, 16, 17, 20, 21, 22, 26, 27). Diferidas: SPEC06 y SPEC32. |
| **Estado funcional** | **3 cerradas / 22 abiertas** | No cambia por este lote. **0 nuevas SPEC funcionalmente cerradas.** |

«Auditoría finalizada» **no** equivale a «SPEC funcionalmente cerrada». Las 20 actas
ratificadas son cierre documental de auditoría; ninguna convierte AC PARCIAL o UNRUN en PASS
ni altera la aceptación funcional.

## 3. Evidencia por SPEC y runs citados

| SPEC | Evidencia principal | Límite |
| --- | --- | --- |
| 01–03 | Cerradas con anterioridad; correcciones y CI registrados en el tracker | Sin cambio en este lote |
| 04 | 29 AC PASS en `b51b89b`; fixes #125 `e3ebd76` | E2E propio UNRUN; full `766ea6b` sobre código idéntico pero **no candidato propio** |
| 05 | #84/#90 (`cf6954a`); D5 | Acta ratificada |
| 06 | Motor y pruebas; cabecera #129 | **Auditoría técnica abierta; M1/E4.4 como reserva** |
| 07 | Opción B #128 `2c97a66` | AC28/E3.5 fuera |
| 08 | Maestro y B1–B9; nota #129 | Aceptación formal |
| 09 | PR #57 `7422d23` | Ambigüedad del cero documentada; sin cambio de motor |
| 10 | Motor y pruebas anuales | Aceptación formal |
| 11 | N11-F1/F2/F3 | H-SPEC11-01 es ambigüedad documentada |
| 12 | Sin hallazgo; límites de `ledgerRows()` | AC parciales según tracker |
| 13 | Anticipos rol/par | AC36 PARCIAL |
| 14 | D5 probado | B-T11 futuro |
| 15 | Motor y pruebas | Proveedor histórico no conectado |
| 16 | #82 `26b6f0c`, #136 `7f3a66c`, #160 `30a832c`; run `41455159383` API PASS | AC-25/P3 dependen de fuente real |
| 17 | M1/M2/m8 aplicados #163 `8b551c5` | Spec/wireframes NO aprobados; ningún AC ejecutado |
| 19 | 6 AC PARCIAL aceptados; D7 #154/#155 | AC-55 conserva estado |
| 20 | PR #87 MERGED `3d70fd6` | 59 AC UNRUN; QA AC48–59 opcional |
| 21 | PR #97 MERGED `2364d9c` | 31 AC UNRUN |
| 22 | #157 MERGED `fd2e21c`; 45 AC PASS; full `766ea6b` run `41435723276` y `494f59f` run `41434662965` | Sin cierre funcional declarado por este acta |
| 26 | #150 `e608bbb` + #161 `0c8d2fc`; run `41456569310`; 13 AC PASS | AC-04 parcial, AC-11 en revisión, AC-16 contrato |
| 27 | Sin implementación | Todos los AC UNRUN; #161 ya provee `positionsAtDate` |
| 31 | Contrato v18 #130; restore v19/v20 #148 | DT6/T-BKP y operación fuera del cierre |
| 32 | #30 `306bbc5`; AC-18 PASS; AC-22 PARCIAL en `87f9c5b`/run `40898403837` | **E2E final UNRUN; rootless real/Debian13 pendiente** |

`766ea6b` **no** se cita como evidencia de AC-22 ni como PASS propio de SPEC04.

## 4. Hallazgos resueltos en el lote

- **H-SPEC16-02:** guarda ante Transferencias sin rol integrada en #160 `30a832c`; run
  `41455159383` API PASS.
- **H-SPEC26-02:** posiciones a fecha de corte desde el motor único integradas en #161
  `0c8d2fc`; `positionsFor` acepta `cutoff` y `precierre` consume `positionsAtDate`.
- **M1/M2/m8 de SPEC17:** aprobados por el usuario y aplicados en #163 `8b551c5`; no
  aprueban la specification ni los wireframes.
- **Documentación de SPEC22:** DEV22 integrado en #157 `fd2e21c`; deja de describirse como
  draft/no autorizado.

## 5. Reservas

- **SPEC06:** auditoría técnica abierta; `capital` nulo en `deudas.ts` queda como reserva
  M1/E4.4. No se cierra E1.6.
- **SPEC32:** AC-22 PARCIAL; E2E final UNRUN; rootless real y Debian13 no acreditados.
- **SPEC16:** AC-25 y P3 exigen fuente/datos reales; sin autorización específica no se
  ejecutan.
- **SPEC04:** el E2E propio sigue UNRUN; `766ea6b` pertenece a E4.2 y no se reutiliza.
- **SPEC22/26/27:** el PASS de AC no se extrapola a cierres funcionales ni a otros AC; las
  revisiones y parciales conservan su estado.
- **SPEC17/20/21/27:** DEV no autorizado; gates documentales y operativos siguen abiertos.

## 6. Registro estable de pendientes

| ID | Pendiente | Propietario | Gate | Autorización |
| --- | --- | --- | --- | --- |
| AUD-01 | ~~Ratificar individualmente las 9 actas propuestas~~ **Cumplido 2026-11-02** | Usuario | Decisión identificable | Ratificación registrada |
| AUD-02 | Decidir el cierre o la continuación de SPEC06 | Usuario, con asesoría de Álex | Auditoría técnica y reserva M1/E4.4 | Decisión explícita |
| AUD-03 | Decidir el cierre o la continuación de SPEC32 | Usuario, con asesoría de Álex | AC-22/E2E final y rootless real | Decisión explícita |
| AUD-04 | Alinear tracker, tablero, resume y notas de vigencia | Coordinador OpenCode | Esta PR documental | Publicación de rama/PR |
| AUD-05 | E2E/full propio de SPEC04 | Ejecutor QA | Candidato propio | Sin prueba funcional nueva; el E2E existente sigue UNRUN |
| AUD-06 | AC-25/P3 de SPEC16 | Usuario y ejecutor autorizado | Fuente real y cobertura | Autorización específica de datos reales |
| AUD-07 | Aprobación de specification/wireframes de SPEC17 | Usuario | Revisión documental | Aprobación explícita; DEV17 sigue no autorizado |
| AUD-08 | DEV20/21/27 y gates DT7/E3.5/DT6 | Usuario y ejecutor autorizado | DT7, E3.5/FIN_NETA y DT6/T-BKP | Autorización separada de DEV |

Este registro es estable: no se reabre un pendiente ya resuelto ni se crea una prueba
funcional nueva para sostener el cierre de auditoría.

## 7. Qué falta para declarar la auditoría formalmente terminada

1. **Decidir SPEC06 y SPEC32** (AUD-02/AUD-03): cerrar su auditoría o mantener el diferimiento
   con el gate vigente.
2. **Alinear la documentación** (AUD-04): tracker, tablero, resume y notas de vigencia deben
   mostrar el mismo estado dual y las mismas evidencias.
3. **Publicar la PR documental** y verificar sus validaciones; el merge ya está autorizado por
   el usuario y se ejecuta tras QA y CI `required`.

No se exige DEV futuro para completar estos pasos. La auditoría puede terminar sin que
ninguna SPEC pase a «funcionalmente cerrada».

## 8. Declaraciones

- Este acta **no autoriza DEV**, datos reales, migración, despliegue ni merge. El merge de la
  PR documental fue autorizado por el usuario por separado; esta acta no lo sustituye.
- **«Auditoría finalizada» ≠ «SPEC funcionalmente cerrada».**
- El balance funcional se conserva en **3 cerradas / 22 abiertas**.
- Las 20 actas ratificadas conservan su alcance y sus AC PARCIAL/UNRUN.
- No se reclasifican de nuevo los hallazgos ya resueltos ni se exigen pruebas funcionales
  nuevas.
