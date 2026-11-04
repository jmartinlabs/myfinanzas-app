# E4.12 — Requisitos, dependencias y criterios de entrada (2026-11-04)

**Estado: inventario documental de requisitos.** No es la specification de E4.12/SPEC30, no
diseña procedimientos operativos, no ejecuta ensayos, no fija RPO/RTO distintos de los ya
aceptados, no elige proveedor ni destino, no autoriza DEV, datos reales, migración,
despliegue ni activación. **No cierra E4.12 ni ningún AC.**

Base contrastada: `main` `0b8aade` (2026-11-04). Los estados que siguen proceden de
[epic-board](../epic-board.md) y de las fuentes citadas; el tablero **no es autorización**.
Este documento separa deliberadamente:

- **requisito** — qué propiedad debe sostenerse;
- **cómo se probará** — qué tipo de evidencia la demostraría, no el procedimiento;
- **estado** — qué existe hoy y qué falta.

Fuentes: [roadmap](../roadmap.md) (E4.12, T-BKP, DT6/DT7, P1–P7),
[security](../guidelines/security.md), [quality](../guidelines/quality.md),
[SPEC27](../27-e49-cierre-financiero-specification.md),
[SPEC31](../31-sqlite-produccion-specification.md),
[SPEC32](../32-ejecucion-rootless-specification.md),
[SPEC20](../20-historico-precontrol-specification.md),
[sqlite-b3-short-read](sqlite-b3-short-read-2026-11-04.md),
[DT6/T-BKP](dt6-t-bkp-procedure-2026-10-31.md) y
[restore v19/v20](restore-v19-v20-linux-2026-10-31.md).

## 1. Qué debe demostrar E4.12

E4.12 es **ensayo integral final**, no el inicio de la estrategia de recuperación
[CONFIRMADO, roadmap T-BKP]. Debe demostrar tres cosas distintas, que no se sustituyen
entre sí: continuidad de hechos tras restaurar, independencia del oráculo y explicitación
de lo que falta para P7.

### 1.1 E4.12-AC1 — continuidad tras restaurar una copia ficticia coherente

| | Contenido |
| --- | --- |
| **Requisito** | Restaurar una copia ficticia coherente en un destino aislado y comprobar que se conservan, sin invención ni duplicación: IDs, aperturas, relaciones, plan, hechos y **versiones de fotos** [CONFIRMADO, roadmap E4.12-AC1]. |
| **Precisión de alcance** | «Preservar» significa igualdad verificable de identidad y vínculos, no solo conteos: IDs estables y no reutilizados; aperturas como posición, no como Movimiento; relaciones y fichas 1:1/1:N; plan vivo y plan final/foto; hechos con su clasificación y auxiliares; versiones de foto v1/v2 y su inmutabilidad [CONFIRMADO, R1/R2/P1/P5/P6 en functional-reference]. |
| **Cómo se probará (tipo de evidencia)** | Restauración en destino nuevo + comprobación por API/UI sobre la copia restaurada, con un corte común acordado y una muestra funcional definida antes del ensayo. La evidencia es comparativa **antes/después** (identidad, vínculos, fotos), no la mera apertura de la base [CONFIRMADO, roadmap E4.12-Pruebas; SPEC27 evidencia de backup]. |
| **Estado** | `PENDIENTE`. No existe ensayo integral; solo restores sintéticos parciales (ver §3.1). |

**Sub-requisitos que AC1 arrastra** [PROPUESTA de descomposición, derivada de las fuentes]:

1. La copia restaurada abre con el contrato de esquema que corresponde a su versión, sin
   downgrade destructivo y sin reset de identidad [CONFIRMADO, security; SPEC31].
2. Las sesiones, desafíos, códigos e intentos previos **no resucitan**; un login nuevo
   emite códigos nuevos [CONFIRMADO, security; SPEC31 AC-26].
3. Las fotos conservan versión, corte, metadatos y contenido persistido, y una foto
   anterior no se confunde con un recálculo actual [CONFIRMADO, DT4; roadmap E4.11].
4. La restauración no publica destino parcial ni reemplaza una copia buena ante fallo
   [CONFIRMADO, security; SPEC31 AC-28/AC-29].

### 1.2 E4.12-AC2 — la matriz v5.11 como oráculo independiente

| | Contenido |
| --- | --- |
| **Requisito** | La matriz de casos de v5.11 aporta **valores esperados independientes del motor probado** [CONFIRMADO, roadmap E4.12-AC2]. |
| **Precisión de alcance** | «Independiente» excluye calcular el esperado con el mismo código que se valida, copiar la salida de la app o deducir el valor desde fixtures generadas por el motor. La matriz conserva los casos del adjunto repartidos entre las pruebas del roadmap, con corte común [CONFIRMADO, roadmap «Trazabilidad de P1–P7»]. |
| **Límite de fuente** | El libro `MyFinanzas2026_v5.11(7).xlsx` es la referencia única y **no ha sido inspeccionado físicamente por los agentes**; la matriz disponible es la referencia sanitizada, no el libro [CONFIRMADO, functional-reference «Procedencia y autoridad»]. No se inventan cifras, casos ni reglas para completarla. |
| **Cómo se probará (tipo de evidencia)** | Matriz congelada por caso: identificador, fuente/procedencia, corte, valor esperado, regla aplicable y resultado observado; contraste por escenario R1–R6/P1–P7 con el mismo corte. Las diferencias se registran, no se fuerzan a PASS [CONFIRMADO, roadmap E4.12-Pruebas; quality T-QA]. |
| **Estado** | `PENDIENTE`. No hay matriz de equivalencia congelada ni contraste autorizado con la fuente real (AC-25/P3 sigue abierto; AUD-06). |

### 1.3 E4.12-AC3 — lista de discrepancias y brechas para P7

| | Contenido |
| --- | --- |
| **Requisito** | Un listado explícito de discrepancias y brechas que deje claro **qué falta para P7** [CONFIRMADO, roadmap E4.12-AC3]. |
| **Precisión de alcance** | Debe cubrir, como mínimo: diferencias de equivalencia no explicadas, cobertura incompleta de escenarios, dependencias no cerradas, evidencias ausentes y límites de la recuperación (custodia, destino externo, claves, plataforma). Un caso omitido no puede leerse como correcto [CONFIRMADO, quality T-QA]. |
| **Cómo se probará (tipo de evidencia)** | Inventario con estado por elemento (`PASS`/`PARCIAL`/`UNRUN`/`BLOCKED`), causa, responsable y gate que lo cierra; sin convertir `PARCIAL` o `UNRUN` en PASS. Debe permitir decidir el gate P7 sin inferencias [CONFIRMADO, roadmap; audit-closure-global AUD-08]. |
| **Estado** | `PENDIENTE`. No existe todavía el listado; este documento solo inventaría sus requisitos. |

### 1.4 Escenarios exigidos por el roadmap

El roadmap enumera, como **requisitos de prueba** y no como procedimiento: recuperación en
limpio, copia corrupta, recuperación de acceso según diseño, no publicación de datos/claves
y escenarios integrados de R1–R6/P1–P7 con corte común [CONFIRMADO, roadmap E4.12-Pruebas].

| Escenario | Requisito | Evidencia esperada | Estado |
| --- | --- | --- | --- |
| Recuperación en limpio | Copia coherente restaurada en destino nuevo y funcional | Identidad + vínculos + fotos + acceso | `PENDIENTE` |
| Copia corrupta | Falla cerrado, sin destino parcial ni reemplazo | Negativo reproducible con hash/esquema | `PARCIAL` (solo sintético v19/v20) |
| Recuperación de acceso | Contraseña + TOTP operativos tras restore; accesos previos revocados | Login real sobre copia aislada | `PARCIAL` (SPEC31 AC-25/26 locales) |
| No publicación de datos/claves | Cero datos reales o secretos en Git, CI, logs o artefactos | Revisión de contenido y destinos | `PENDIENTE` para el ensayo integral |
| R1–R6/P1–P7 con corte común | Escenarios integrados al mismo corte | Matriz de equivalencia + evidencias por escenario | `PENDIENTE` |

**Separación explícita:** un restore sintético verde demuestra la ruta de código del
restore; **no** demuestra custodia externa, recuperabilidad operativa ni equivalencia
económica [CONFIRMADO, restore v19/v20 §9; epic-board DT6].

## 2. Dependencias

### 2.1 Estado real por entrega

Estados según [epic-board](../epic-board.md) a `main` `0b8aade`; no son autorización ni
PASS funcional.

| Dependencia | Estado real | Qué debe estar cerrado antes del ensayo |
| --- | --- | --- |
| **E1.1–E1.6** | Integradas; E1.1 con 6 AC `PARCIAL`; E1.6 con contratos futuros separados [CONFIRMADO, board] | Contratos estables de IDs, aperturas, movimientos, referencias y deuda; sin deuda documental que altere identidad |
| **E2.1–E2.6** | Integradas; E2.6 cerrada/integrada [CONFIRMADO, board] | Plan de ciclo/anual, presupuestos, nómina y flujo con oráculo congelado |
| **E3.1–E3.6** | Integradas con reservas: E3.1 AC36 `PARCIAL`; E3.2 D5-AC13 parcial/B-T11 `UNRUN`; E3.3 retorno administrativo por consolidar; E3.4 AC-25 abierto; E3.5 `MERGED 1560d04` con AC-15 `PARCIAL`; E3.6 `MERGED a26fffb` [CONFIRMADO, board] | Auxiliares y Comida/FIN_NETA con cobertura declarada; AC-25/P3 resuelto o excluido explícitamente |
| **E4.1** | Integrada `156a50d`; 6 AC `PARCIAL` [CONFIRMADO, board] | Posiciones/instrumentos con cobertura y sin contratos abiertos que cambien el corte |
| **E4.2** | Integrada `fd2e21c`; DEV22 cerrado [CONFIRMADO, board] | Ventas/posición estables para el corte |
| **E4.3** | A+B+C y QA integrados (`3b9be46`, `8552d4a`, `dd56553`); 15 AC PASS de cobertura, 2 `PARCIAL` [CONFIRMADO, board] | Valoración/resultados con estado explícito (puede figurar `No disponible` en la primera foto, no en el ensayo final) |
| **E4.4** | Integrada `024b348`; evidencia post-merge #190 [CONFIRMADO, board] | Deuda completa y conciliación con corte |
| **E4.5** | Spec aprobada; **DEV no autorizado**; 59 AC `UNRUN`; DT7 pendiente [CONFIRMADO, board; SPEC20] | Archivo/histórico precontrol operativo y mapping DT7; sin esto no hay universo histórico completo |
| **E4.6** | Spec `MERGED 5dc1dd3`; DEV autorizado; **no integrado** en la base [CONFIRMADO, board/log] | Resumen de inicio integrado o exclusión declarada del corte |
| **E4.7** | SPEC25 **no iniciada** [CONFIRMADO, board] | Resumen anual y flujo trazable; sin esto no se cierra el escenario R3/R6 |
| **E4.8** | Precierre integrado (#150/#161); sin cierre real [CONFIRMADO, board] | Controles de consistencia operativos antes del cierre/foto |
| **E4.9** | DEV autorizado (v25); bloque A en ejecución; **no integrado**; AC `UNRUN` [CONFIRMADO, board] | Cierre manual, foto inmutable y preflight de backup verificables; DT6 bloquea el cierre real |
| **E4.10** | SPEC28 **no iniciada** [CONFIRMADO, board] | Reapertura/re-cierre y versiones v1/v2; sin esto AC1 no puede demostrar versiones de fotos |
| **E4.11** | SPEC29 **no iniciada** [CONFIRMADO, board] | Consulta histórica por corte/versión; sin esto no hay foto trimestral/anual que preservar |
| **E4.12** | SPEC30 **no iniciada**; este documento solo inventaría requisitos [CONFIRMADO] | Specification propia aprobada y ensayo autorizado por separado |

### 2.2 DT6/T-BKP

| | Contenido |
| --- | --- |
| **Requisito** | Copia SQLite coherente (WAL), automatización/frecuencia, RPO/RTO, retención, cifrado, custodia/recuperación de claves, ubicación externa y **prueba de restauración** [CONFIRMADO, roadmap DT6]. |
| **Estado real** | **Abierto**. El usuario no dispone de destino externo; no hay copia externa ni restauración operativa probada. Solo existen restores sintéticos y preflight técnico [CONFIRMADO, board; DT6/T-BKP §5]. |
| **Qué aporta hoy** | Ruta de código de backup/restore (VACUUM INTO, `age`, manifiesto/checksum, publicación por rename, revocación de accesos), ensayos v19/v20 y AC de SPEC31/32 [CONFIRMADO, security; 31-testplan; 32-testplan]. |
| **Qué falta antes del ensayo** | Destino externo autorizado, segunda copia, custodia/rotación de la identidad, ventana/frecuencia reales, evidencia de llegada y un ensayo de restauración previo en entorno aislado [CONFIRMADO como pendiente; decisiones del usuario en DT6 §6]. |
| **Límite** | El restore sintético **no cierra DT6** ni acredita custodia externa [CONFIRMADO, restore v19/v20; board]. |

### 2.3 DT7 — mapping y corte

| | Contenido |
| --- | --- |
| **Requisito** | Mapping exhaustivo por campo/ID/apertura/archivo, corte, discrepancias/excepciones, inventario privado y herramientas de importación aislada [CONFIRMADO, roadmap DT7]. |
| **Estado real** | **Abierto**. Solo preparación documental/ficticia; sin Excel, datos reales ni conciliación operativa. E4.5 depende de DT7 [CONFIRMADO, board; SPEC20]. |
| **Qué debe estar cerrado** | Mapping revisado por el usuario y corte acordado; sin él, AC2 no tiene correspondencia caso→campo ni AC3 puede distinguir brecha de omisión [CONFIRMADO, roadmap E4.12; P6]. |
| **Quién confirma** | Usuario revisa mapping y conciliación; los agentes no suben fuentes reales [CONFIRMADO, roadmap DT7]. |

### 2.4 Decisiones de auditoría

| Decisión | Estado | Efecto sobre E4.12 |
| --- | --- | --- |
| **AUD-06 — AC-25/P3 de SPEC16** | Abierta; exige fuente real y autorización específica [CONFIRMADO, audit-closure-global] | Sin contraste autorizado no se declara equivalencia de Comida; AC2 queda limitado a la matriz ficticia |
| **AUD-08 — DEV20/21/27 y gates DT7/E3.5/DT6** | Abierta; autorización separada [CONFIRMADO, audit-closure-global] | E4.5/E4.9 y sus gates deben resolverse antes del ensayo |
| **DT3/DT4** | Resueltas 2026-10-28 (cierre/fotos) [CONFIRMADO, SPEC27] | Base de la foto y de la versión; no se reabren |
| **DT9** | Pendiente; rectificación excepcional de ciclos antiguos [CONFIRMADO, roadmap] | Si el ensayo incluye ciclos antiguos rectificados, requiere decisión expresa |
| **DT10** | Pendiente; proveedor/despliegue fuera de STEP 4 [CONFIRMADO, roadmap] | No se contrata ni despliega para el ensayo |

## 3. Evidencias de entrada exigibles

Sin estas evidencias no debería autorizarse el ensayo. Se enumeran por **contenido mínimo**,
no por procedimiento.

### 3.1 Restauración previa ensayada

| | Contenido |
| --- | --- |
| **Exigencia** | Evidencia de al menos una restauración técnica previa, con alcance y límites declarados, que no sea el propio ensayo integral [CONFIRMADO, T-BKP «E4.12 es ensayo final, no inicio»]. |
| **Disponible hoy** | SPEC31 AC-25/26/29 locales; SPEC32 AC-20 (restore con WAL); RESTORE-19/20 sintético en Linux, PR #148 → `2019fea`, CI `41241521688`/`41243496311` [CONFIRMADO, restore v19/v20 §9]. |
| **Límite** | Son fixtures sintéticas; **no** acreditan custodia externa, hardware real ni datos privados [CONFIRMADO, mismo informe]. |
| **Falta** | Restauración desde la copia externa autorizada, con evidencia de llegada y claves custodiadas [PENDIENTE]. |

### 3.2 Copia coherente con WAL

| | Contenido |
| --- | --- |
| **Exigencia** | Copia SQLite coherente con su estado WAL; no copiar un archivo abierto a ciegas [CONFIRMADO, roadmap T-BKP; security]. |
| **Contenido mínimo** | Manifiesto (app, esquema, origen, instante, id), SHA-256 del snapshot, verificación de integridad/FK/esquema, ausencia de temporales y texto plano en el destino [CONFIRMADO, security; DT6 §3.6]. |
| **Falta** | Copia real sobre destino externo; hoy solo snapshot/paquete cifrado en ensayos [PENDIENTE]. |

### 3.3 Claves y custodia

| | Contenido |
| --- | --- |
| **Exigencia** | Identidad `age` y clave de aplicación de 32 bytes disponibles y custodiadas **fuera del VPS, del disco de copias y de Git**; copia de recuperación protegida y separada [CONFIRMADO, security; DT6 §3.4]. |
| **Contenido mínimo** | Prueba de que la identidad descifra ambos archivos y de que la clave de app es válida; recuperación de acceso sin exponer secretos [CONFIRMADO, DT6 §3.3/§3.6]. |
| **Falta** | Ubicación, custodio y rotación decididos por el usuario [PENDIENTE]. Un backup sin identidad custodiada no es recuperable [CONFIRMADO, DT6 §7]. |

### 3.4 Entorno aislado

| | Contenido |
| --- | --- |
| **Exigencia** | Destino nuevo, sin acceso a la base en servicio, loopback, red aislada y permisos privados `0700`/`0600`; Linux x86_64 aislado y autorizado si se busca evidencia de plataforma [CONFIRMADO, DT6 §3.1.1/§4; security]. |
| **Límite** | macOS arm64 no acredita Linux/x86_64; GitHub Actions solo sirve para fixtures sintéticas, nunca datos reales [CONFIRMADO, DT6 §4]. |
| **Falta** | Equipo Linux x86_64 aislado confirmado y configuración productiva del ensayo (`NODE_ENV`, `DATABASE_PATH`, `AUTH_KEY_PATH`, `APP_ORIGIN`) [PENDIENTE, DT6 §6]. |

### 3.5 Fixtures

| | Contenido |
| --- | --- |
| **Exigencia** | Fixtures deterministas y ficticias que cubran IDs, aperturas, relaciones, plan, hechos, auxiliares y **versiones de fotos**, en las versiones de esquema del corte [CONFIRMADO, T-DAT; roadmap E4.12; quality]. |
| **Disponible hoy** | Contratos congelados y `materializeContract()` para v19/v20; suites de backup por versión; fixtures E1.1/E4.1 [CONFIRMADO, restore v19/v20 §3/§4; specs/fixtures]. |
| **Falta** | Fixture integral del corte con fotos v1/v2 y los escenarios R1–R6/P1–P7; sin datos personales ni Excel [PENDIENTE]. |

### 3.6 Matriz de equivalencia

| | Contenido |
| --- | --- |
| **Exigencia** | Matriz de casos v5.11 con valor esperado, corte, procedencia y regla; congelada antes de ejecutar y ajena al motor [CONFIRMADO, E4.12-AC2; T-QA]. |
| **Contenido mínimo** | Identificador de caso, escenario R/P asociado, fuente sanitizada, valor esperado, unidad/precisión, resultado observado y diferencia [PROPUESTA de formato, sin cifras]. |
| **Falta** | Matriz congelada y revisada; el libro no está inspeccionado por los agentes y AC-25/P3 no está autorizado [PENDIENTE]. |

### 3.7 Criterios de aceptación por escenario

| | Contenido |
| --- | --- |
| **Exigencia** | Cada escenario (limpio, corrupto, acceso, R1–R6/P1–P7) debe tener criterio de aceptación explícito **antes** de ejecutar, con resultado esperado y tratamiento de diferencias [CONFIRMADO, T-QA; roadmap E4.12-Pruebas]. |
| **Regla** | Un `PARCIAL`, `UNRUN` u omitido no se convierte en PASS; los expected failures de fixtures no son fallos de suite, pero un caso omitido no es correcto [CONFIRMADO, quality T-QA]. |
| **Falta** | Criterios por escenario y umbral de aceptación acordados; no se inventan umbrales [PENDIENTE]. |

## 4. Brechas conocidas

| Brecha | Evidencia actual | Impacto en E4.12 | Responsable / gate |
| --- | --- | --- | --- |
| **DT6 abierto** | Sin destino externo; solo restores sintéticos [CONFIRMADO, board; DT6 §5] | AC1 no puede acreditar recuperación operativa desde copia externa; P7 bloqueado | Usuario fija destino/custodia; gate DT6 |
| **Sin destino externo ni restauración probada** | El usuario no dispone de destino; disponibilidad de Linux x86_64 por confirmar [CONFIRMADO, DT6 §4/§6] | El ensayo integral no tiene soporte real donde apoyarse | Usuario + ejecutor autorizado |
| **Flake SQLite B3 sin diagnóstico Linux** | `SQLITE_IOERR_SHORT_READ` intermitente; 0 reproducciones macOS; reproducción Linux `UNRUN` [CONFIRMADO, sqlite-b3-short-read] | Riesgo de falso negativo/positivo en la suite y en la confianza del restore; no es corrupción demostrada | Investigación separada; no cerrar por CI verde |
| **E4.5 sin DEV** | Spec aprobada; 59 AC `UNRUN`; DT7 pendiente [CONFIRMADO, board; SPEC20] | Falta archivo/histórico precontrol y universo DT7 para AC1/AC2 | Autorización DEV E4.5 |
| **E4.10 sin spec** | SPEC28 no iniciada [CONFIRMADO, board] | No hay reapertura/re-cierre ni versiones v1/v2 que AC1 exige preservar | SPEC28 |
| **E4.11 sin spec** | SPEC29 no iniciada [CONFIRMADO, board] | No hay consulta de fotos por corte/versión que AC1/AC2 puedan contrastar | SPEC29 |
| **E4.7 sin spec** | SPEC25 no iniciada [CONFIRMADO, board] | Escenario R3/R6 y flujo anual incompletos | SPEC25 |
| **E4.6/E4.9 en curso** | E4.6 DEV autorizado no integrado; E4.9 bloque A en ejecución [CONFIRMADO, board/log] | El corte no es estable; no se puede congelar esquema/fotos | Cierre de DEV y QA |
| **DT7 abierto** | Mapping/corte sin aprobar; solo preparación ficticia [CONFIRMADO, board] | AC2 sin correspondencia campo→caso; AC3 no distingue brecha de omisión | Usuario revisa mapping |
| **AC-25/P3 de Comida** | Abierto; requiere fuente real y autorización [CONFIRMADO, AUD-06] | Equivalencia de Comida no acreditable; se declara límite | Usuario + ejecutor autorizado |
| **Matriz v5.11 no congelada** | Referencia sanitizada; libro no inspeccionado por agentes [CONFIRMADO, functional-reference] | AC2 no tiene oráculo estable | Usuario/asesor |
| **Esquema en deriva** | `main` v24; v25 autorizada para E4.9 [CONFIRMADO, board; database-schema] | El ensayo debe fijar versión de app/esquema y no mezclar contratos | Coordinador + ejecutor |
| **Temporales/forense** | `backup`/`restore` usan temporales privados; no se promete borrado seguro [CONFIRMADO, security; DT6 §3.3] | La evidencia no puede afirmar ausencia forense de restos | Volumen cifrado en destino |

## 5. Criterios de entrada, decisiones y riesgos

### 5.1 Gates para autorizar el ensayo (no autorizan DEV)

Se propone que el ensayo integral solo se autorice cuando se cumplan **todos** estos gates,
cada uno con evidencia verificable [PROPUESTA de secuencia; los gates materiales son
`CONFIRMADO` en las fuentes citadas]:

1. **Funcional:** E4.5, E4.6, E4.7, E4.9, E4.10 y E4.11 integrados y con sus AC declarados
   (`PASS`/`PARCIAL`/`UNRUN`), sin deuda que cambie IDs, aperturas, plan, hechos o fotos.
2. **DT6:** destino externo, segunda copia, custodia/rotación de claves, frecuencia y
   ventana acordados; restauración previa desde esa copia aislada acreditada.
3. **DT7:** mapping por campo/ID/apertura/archivo y corte aprobados por el usuario.
4. **Oráculo:** matriz v5.11 congelada, con valores esperados y procedencia; diferencias
   aceptadas o registradas antes de ejecutar.
5. **Entorno:** Linux x86_64 aislado autorizado (o exclusión explícita de esa evidencia);
   configuración productiva del ensayo definida; sin acceso a producción.
6. **Evidencia:** carpeta privada fuera de Git, formato de registro y criterios por
   escenario acordados; sin datos personales ni secretos.
7. **Autorización:** aprobación explícita e identificable del ensayo, separada de la
   aprobación de la spec, del DEV y del merge. El permiso de publicación no la sustituye
   [CONFIRMADO, approvals].

**No** son gates de entrada por sí solos: CI verde, un restore sintético previo, la
aprobación de esta investigación o la existencia de la matriz sanitizada.

### 5.2 Decisiones pendientes (usuario)

| Decisión | Qué debe fijar | Fuente |
| --- | --- | --- |
| Destino y segunda copia | Discos/rutas privadas existentes, capacidad y frecuencia de traslado | DT6 §6 |
| Canal de exportación | Cómo llega la copia al soporte externo y quién lo verifica | DT6 §6 |
| Custodia de identidad `age` | Ubicación, custodio, copia de recuperación y rotación | DT6 §6 |
| Retención y poda | Inicio del calendario, responsable y registro | DT6 §6 |
| `--allow-older` | Autorización, motivo, riesgo y alcance para copias >24 h | DT6 §3.5.1 |
| Equipo de ensayo | Linux x86_64 aislado disponible o alcance alternativo declarado | DT6 §4/§6 |
| Configuración productiva | `NODE_ENV`, `DATABASE_PATH`, `AUTH_KEY_PATH`, `APP_ORIGIN` y aislamiento | DT6 §3.1.1 |
| Carpeta de evidencias | Ruta privada fuera de Git y formato | DT6 §6 |
| Corte y matriz | Fecha/corte común y revisión de la matriz v5.11 | E4.12-AC2; DT7 |
| Datos reales | Si se autoriza contraste privado (AC-25/P3) o se declara límite | AUD-06 |
| Alcance E4.10/E4.11 | Si entran en el ensayo o se declaran fuera con brecha explícita | roadmap E4.12-AC3 |

### 5.3 Riesgos

| Riesgo | Consecuencia | Mitigación declarada |
| --- | --- | --- |
| Copia sin identidad custodiada | Backup irrecuperable | Custodia separada y prueba de descifrado [CONFIRMADO, DT6 §7] |
| Copia en el mismo disco | No cubre hardware/robo/ransomware | Segunda copia externa independiente [CONFIRMADO, DT6 §3.4] |
| Copia no coherente con WAL | Restauración con estado inconsistente | Snapshot coherente y verificación de manifiesto/checksum [CONFIRMADO, security] |
| Oráculo derivado del motor | Falso PASS de equivalencia | Matriz independiente, congelada y con procedencia [CONFIRMADO, E4.12-AC2] |
| Deriva de esquema/app | El ensayo no representa el corte real | Congelar versión de app/esquema y contrato antes de ejecutar [PROPUESTA] |
| Flake B3 | Resultado no determinista | Diagnóstico Linux separado; no declarar PASS por un CI verde [CONFIRMADO, B3] |
| Restore sintético tomado como operativo | Falsa sensación de recuperación | Declarar límites; DT6 no se cierra por fixtures [CONFIRMADO, board] |
| Restos temporales/forense | Exposición residual | Volumen cifrado en destino; no prometer borrado seguro [CONFIRMADO, security] |
| Expansión a despliegue/P7 | Cambio de alcance no autorizado | E4.12 no despliega, no migra ni cambia el maestro [CONFIRMADO, roadmap «Fuera»] |

## 6. Propuesta de siguiente paquete

- **`E4.12 · requisitos`** — cubierto por este documento [CONFIRMADO como entregable
  documental]. No es la spec y no autoriza ensayo.
- **Siguiente propuesto: `E4.12 · DT6 evidencia`**, solo cuando existan destino externo y
  restauración autorizados. Su salida sería el expediente de evidencias DT6 (manifiesto,
  checksum, llegada, claves, custodia, restore aislado, accesos revocados y límites), sin
  ejecutar el ensayo integral ni diseñar procedimientos nuevos.
- **Paquete paralelo posible, si se pide:** `E4.12 · matriz de equivalencia`, limitado a
  congelar casos, procedencia y valores esperados de v5.11 con revisión del usuario.
- **No autoriza**: ensayo integral, DEV, datos reales, migración, despliegue, contratación
  ni cambio de maestro. Cualquiera de esas acciones requiere aprobación explícita e
  identificable y, para E4.12, su propia specification aprobada.

## 7. Para el usuario

- **E4.12 sigue sin empezar**: este documento solo inventaría requisitos; no hay spec, no
  hay ensayo y no se cierra ningún AC.
- **AC1 exige fotos versionadas**: sin E4.10 (reapertura/re-cierre) y E4.11 (consulta de
  fotos) no se puede demostrar la preservación de versiones.
- **AC2 necesita un oráculo congelado**: la matriz v5.11 debe aportar valores esperados
  independientes; el libro no ha sido inspeccionado por los agentes y AC-25/P3 sigue
  abierto.
- **DT6 es el bloqueo principal**: sin destino externo, segunda copia y custodia de claves
  no hay recuperación operativa que ensayar; los restores sintéticos no lo sustituyen.
- **Faltan E4.5 (sin DEV), E4.6/E4.9 (en curso) y E4.7/E4.10/E4.11 (sin spec)**: el corte
  funcional no está estable.
- **El flake B3 sigue abierto**: no hay diagnóstico Linux ni reproducción; no debe
  declararse resuelto por un CI verde.
- **Siguiente paso recomendado**: preparar `E4.12 · DT6 evidencia` cuando autorices destino
  y restauración, o `E4.12 · matriz de equivalencia` si prefieres avanzar el oráculo.
- **Nada de esto autoriza** ensayo, DEV, datos reales, migración ni despliegue; cada uno
  requiere aprobación separada.
