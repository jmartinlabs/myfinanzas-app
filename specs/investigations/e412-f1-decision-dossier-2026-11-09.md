# E4.12 — Expediente consolidado de decisiones F1 (2026-11-09)

**Estado: documental, F1 `IN_PROGRESS`.** Este expediente **no aprueba nada**: reúne las
**15 decisiones** de [SPEC30 §9](../30-e412-recuperacion-specification.md#9-decisiones-f1)
—las nueve de §9.1–§9.9 y las seis de §9.10— para que el usuario pueda resolverlas de forma
coherente. Cada decisión sigue `[PENDIENTE]`; las recomendaciones son `[PROPUESTA]` y no
sustituyen una decisión explícita e identificable.

- **Base:** `test` `93f1e1e` (2026-11-09), rama `docs/e412-f1-dossier`. Solo documentación.
- **No autoriza:** DEV, F2, F3, F4, ensayo, restore, datos reales, claves, configuración
  productiva, VPS, migración, publicación ni merge.
- **No altera:** los 17 AC, los niveles A/B, los gates de SPEC30 §5/§6, las reservas de
  E4.5/E4.7/E4.9/E4.10/E4.11, DT6 ni DT7. Los AC se citan por ID y no se reproducen.
- **Regla:** el silencio no aprueba; una recomendación aceptada en bloque solo vale si el
  usuario la identifica como tal y señala sus excepciones.

**Leyenda:** `[CONFIRMADO]` = hecho documentado o decisión ya registrada; `[PROPUESTA]` =
recomendación de este expediente; `[PENDIENTE]` = decisión o evidencia que aún no existe.
Los identificadores `F1-D01…F1-D15` son de este expediente, **no** son AC ni gates nuevos.

---

## 1. Cómo leer este expediente

1. **Una decisión, una respuesta.** Cada `F1-Dxx` exige aprobar, modificar, rechazar o
   mantener pendiente. Aprobar una recomendación no cierra por sí solo DT6, DT7, E4.12 ni P7.
2. **Grupo no es aprobación.** Las agrupaciones de §2 ordenan la conversación; no convierten
   cinco decisiones en una. El usuario puede aprobar un paquete identificando expresamente
   qué incluye y qué excluye.
3. **Evidencia no es autorización.** Un restore sintético, un CI verde, un informe de
   aceptación con fixtures o la aprobación F0 acreditan límites, no operación real.
4. **Lo que ya puede decidirse** se separa en §6 de lo que requiere evidencia operativa del
   usuario o depende de DT6/DT7. Ninguna decisión se simula con ficción.
5. **El registro de la respuesta** debe indicar decisión, opción, alcance, fecha,
   responsable y, si aplica, referencia privada no sensible. La plantilla está en §7.

---

## 2. Agrupación de las decisiones

| Grupo | Decisiones | Tema | Qué comparten | Límite |
| --- | --- | --- | --- | --- |
| **G1 · DT6/T-BKP** | F1-D01–F1-D05 | Destino y segunda copia, canal, custodia `age`, retención/poda y `--allow-older` | Mismo gate DT6 y misma cadena copia→clave→restore | Aprobar una no cierra DT6 ni autoriza copias reales |
| **G2 · Entorno** | F1-D06–F1-D07 | Equipo Linux x86_64 y configuración productiva del ensayo | Gate Entorno y aislamiento | El nivel A puede usar un entorno aislado disponible; el B exige equipo y configuración declarados |
| **G3 · Evidencia y oráculo** | F1-D08–F1-D09 | Carpeta privada de evidencias y corte/matriz congelada | Gate Evidencia y gate Oráculo/DT7 | La carpeta no crea el oráculo; el corte no sustituye DT7 |
| **G4 · Gobernanza de ejecución** | F1-D10, F1-D11, F1-D14 | Datos reales, nivel de F3 y candidato/tags | Separación entre ficticio, real y autorización | Decidir la secuencia no autoriza F3 |
| **G5 · Dependencias y aceptaciones** | F1-D12, F1-D13, F1-D15 | Aceptación E4.9/E4.10/E4.11, aceptación E4.7 y alcance E4.5/DT7 | Corte documental de E4.12 | Aceptar un corte con reservas no declara aceptación global |

`[CONFIRMADO]` Las dependencias y sus estados se leen en SPEC30 §4, el testplan y los
informes citados; el tablero no es autorización y no se reaudita aquí. `[PROPUESTA]` Las
decisiones G2–G5 pueden prepararse en paralelo a G1, pero **G1 es imprescindible para el
nivel B**. Ninguna aprobación de G1–G5 cierra DT6, DT7, E4.12 ni P7.

---

## 3. Decisiones

### 3.1 G1 · DT6/T-BKP

#### F1-D01 — Destino y segunda copia

- **Recomendación `[PROPUESTA]`:** dos soportes físicos existentes en ubicaciones distintas:
  copia primaria en un disco privado distinto del sistema/VPS y segunda copia en otro
  soporte guardado en un lugar diferente; volumen cifrado y permisos `0700`/`0600`; sin
  compras ni nube por defecto.
- **Alternativa principal y descarte:** una copia externa más una local. No se recomienda
  porque no cubre pérdida o robo del equipo local y no alcanza la independencia que pide
  DT6. El almacenamiento remoto cifrado queda descartado por ahora: introduce tercero,
  coste y decisión DT10.
- **Riesgos:** financiero, pérdida de historia si el único soporte falla; seguridad, robo o
  ransomware sobre una copia no separada; operación, traslado manual olvidado o capacidad no
  verificada; trazabilidad, no poder demostrar que existe una segunda copia real.
- **Dependencias:** DT6; entorno; AC01/AC11 en nivel B; gates DT6/Entorno. No desbloquea
  AC12/AC13 (DT7) ni la equivalencia.
- **Evidencia hoy / falta:** el [procedimiento DT6](dt6-t-bkp-procedure-2026-10-31.md)
  prefiere dos discos existentes y no comprar hardware; los restores
  [v19/v20](restore-v19-v20-linux-2026-10-31.md) y el restore v27 Linux (E4.10 AC22) prueban
  la ruta técnica con fixtures, no una copia externa. Falta inventario real de discos,
  rutas privadas, capacidad, frecuencia de traslado y confirmación del usuario.
- **Autorización, gate y AC:** decisión F1 explícita del usuario y autorización DT6. Aprobar
  la recomendación no cierra DT6. Desbloquea AC01/AC11 en nivel B y los gates DT6/Entorno.
- **¿Decidible ya?:** no solo con documentación; requiere evidencia operativa del usuario
  (soportes, rutas y capacidad) y la decisión DT6.

#### F1-D02 — Canal de exportación

- **Recomendación `[PROPUESTA]`:** exportación manual controlada desde un staging privado a
  cada soporte, copiando solo `database.age` y `access-key.age`, con SHA-256 origen/destino,
  nombre, tamaño, recuento y registro de llegada confirmado por el operador autorizado; sin
  asumir montaje remoto ni sincronización.
- **Alternativa principal y descarte:** montaje o sincronización automática. No se recomienda
  porque no está disponible, añade credenciales, red y superficie, y puede asumir un montaje
  inexistente. El medio extraíble es compatible con la recomendación y puede ser el canal
  concreto.
- **Riesgos:** financiero, copia parcial o de versión equivocada; seguridad, soporte no
  cifrado a nivel de volumen o pérdida del medio; operación, error humano en la comprobación;
  trazabilidad, falta de evidencia de llegada.
- **Dependencias:** DT6; AC01/AC10/AC11 en nivel B; gates DT6/Evidencia.
- **Evidencia hoy / falta:** DT6 §3.2.1 describe la comprobación extremo a extremo y la
  prohibición de copiar la identidad `age` o texto plano; los restores sintéticos prueban la
  restauración, no la exportación. Falta canal concreto, operador designado, evidencia real
  de llegada y autorización DT6.
- **Autorización, gate y AC:** decisión F1 + autorización DT6. Desbloquea AC01/AC10/AC11 en
  nivel B y los gates DT6/Evidencia.
- **¿Decidible ya?:** no; requiere decisión operativa del usuario y evidencia de llegada.

#### F1-D03 — Custodia de la identidad `age`

- **Recomendación `[PROPUESTA]`:** custodia separada y offline de la identidad `age` y la
  clave de aplicación de 32 bytes, fuera del VPS y del disco de copias, en soporte físico
  protegido; copia de recuperación en ubicación distinta; acceso de emergencia documentado
  sin revelar el secreto; rotación solo con re-cifrado y verificación.
- **Alternativa principal y descarte:** clave en el mismo equipo o disco que las copias. No
  se recomienda porque un único fallo o robo compromete copia y clave. El gestor de secretos
  offline es una forma concreta de la recomendación, no una alternativa distinta.
- **Riesgos:** financiero, pérdida de la identidad deja las copias irrecuperables; seguridad,
  un único custodio es punto de fallo y la rotación sin re-cifrado inutiliza copias antiguas;
  operación, dependencia de disponibilidad del soporte; trazabilidad, falta de prueba de
  descifrado y de custodia.
- **Dependencias:** DT6; AC01/AC08/AC09 en nivel B; gate DT6/custodia. No sustituye
  AC12/AC13.
- **Evidencia hoy / falta:** DT6 §3.4 y el mecanismo `age` usado en los restores v19/v20 y
  v27 Linux; no hay ubicación, custodio ni copia de recuperación confirmados. Falta política
  de rotación, prueba de descifrado y autorización DT6.
- **Autorización, gate y AC:** decisión F1 explícita y autorización DT6. Desbloquea
  AC01/AC08/AC09 en nivel B y el gate DT6/custodia.
- **¿Decidible ya?:** no; requiere ubicación, custodio y prueba operativa.

#### F1-D04 — Retención y poda

- **Recomendación `[PROPUESTA]`:** calendario aprobado con poda manual reversible: mantener
  el objetivo ya aceptado de 7 diarias / 4 semanales / 3 mensuales sin reabrirlo; iniciar el
  calendario en la fecha que fije el usuario tras la primera copia verificada; cuarentena
  antes de borrar, responsable designado y registro; automatizar solo cuando procedimiento,
  rotación y restore estén estables y autorizados.
- **Alternativa principal y descarte:** automatizar la poda desde el inicio. No se recomienda
  porque puede borrar antes de verificar y el procedimiento aún no es estable. La retención
  indefinida tampoco se recomienda: crece sin control y no cumple una política.
- **Riesgos:** financiero, pérdida de copias útiles por poda prematura; seguridad, mayor
  exposición si se conserva todo sin control; operación, olvido de la poda o capacidad
  agotada; trazabilidad, fecha de inicio mal fijada crea una retención ficticia.
- **Dependencias:** DT6; AC11 en nivel B; gate DT6. No declara RPO/RTO cumplidos.
- **Evidencia hoy / falta:** SPEC30 §4.3 confirma que `RPO 24 h`/`RTO 2 h` y `7/4/3` ya están
  aceptados en security; DT6 §3.4 propone poda manual, reversible y documentada. Falta fecha
  de inicio, capacidad, responsable y registro de poda.
- **Autorización, gate y AC:** decisión del usuario y autorización DT6. Desbloquea la
  evidencia de retención para AC11 en nivel B y el gate DT6.
- **¿Decidible ya?:** el objetivo de retención ya está confirmado; la fecha, capacidad y
  responsable requieren decisión operativa del usuario.

#### F1-D05 — `--allow-older`

- **Recomendación `[PROPUESTA]`:** deshabilitado por defecto y excepcional por copia: uso
  solo para una copia histórica concreta de la retención, con motivo, riesgo aceptado,
  alcance y aprobación identificable registrados antes, y verificación completa de
  manifiesto/checksum y resultado; nunca para evitar una copia reciente ni como bypass
  general.
- **Alternativa principal y descarte:** autorización permanente por política. No se
  recomienda porque convierte la excepción en rutina y difumina el control. La prohibición
  total también se descarta: deja la retención 7/4/3 no recuperable.
- **Riesgos:** financiero, copia obsoleta tomada como vigente; seguridad, restauración sobre
  el destino equivocado; operación, normalización del bypass; trazabilidad, falta de motivo,
  aprobación y evidencia por caso.
- **Dependencias:** DT6; AC09 (antigüedad no aceptada) y AC11/AC13 en nivel B; gate DT6.
- **Evidencia hoy / falta:** DT6 §3.5.1 documenta que `backup.ts` rechaza copias de más de
  24 h y exige la opción explícita; las pruebas de restore v19/v20 incluyen negativos de
  antigüedad con fixtures. Falta política, aprobación por caso y evidencia en carpeta
  privada.
- **Autorización, gate y AC:** decisión F1 y autorización DT6. Desbloquea AC09 y la
  recuperación de la retención para AC11/AC13 en nivel B; gate DT6.
- **¿Decidible ya?:** la política puede decidirse ahora; los casos concretos requieren
  retención y DT6.

### 3.2 G2 · Entorno

#### F1-D06 — Equipo de ensayo Linux x86_64

- **Recomendación `[PROPUESTA]`:** equipo Linux x86_64 físico y aislado, existente o
  autorizado por el usuario, sin acceso a PROD; nivel A sin datos reales y nivel B con la
  configuración productiva declarada. Si no está disponible, el nivel B queda `BLOCKED` por
  plataforma y no se sustituye por macOS/arm64 ni por un runner compartido.
- **Alternativa principal y descarte:** runner CI `ubuntu-24.04`. No se recomienda para el
  nivel B porque solo admite fixtures sintéticas y un runner compartido no acredita el ensayo
  real ni admite datos reales. La VM emulada sobre el Mac sirve como máximo para fixtures y
  con limitación declarada.
- **Riesgos:** financiero, coste/tiempo si hay que habilitar hardware; seguridad, aislamiento
  insuficiente o uso de un runner compartido con datos reales; operación, disponibilidad y
  características del equipo; trazabilidad, no poder declarar plataforma real.
- **Dependencias:** entorno; AC01/AC08/AC16 en nivel B; gate Entorno. El nivel A puede usar
  el entorno aislado disponible.
- **Evidencia hoy / falta:** DT6 §4 y el restore v19/v20 en Linux CI; E4.10 AC22 registra un
  restore v27 Linux en CI #257. Son evidencia sintética/de CI, no un equipo aislado
  confirmado. Falta disponibilidad, características, fecha y autorización de uso.
- **Autorización, gate y AC:** decisión del usuario y autorización del entorno. Desbloquea
  AC01/AC08/AC16 en nivel B y el gate Entorno.
- **¿Decidible ya?:** no; requiere dato operativo del usuario sobre el equipo.

#### F1-D07 — Configuración productiva

- **Recomendación `[PROPUESTA]`:** preflight declarado y revisado: `NODE_ENV`,
  `DATABASE_PATH`, `AUTH_KEY_PATH` y `APP_ORIGIN` coherentes con el despliegue; identidad de
  origen y `database_origin`/`key_hash` compatibles; rutas nuevas con `0700`/`0600`;
  loopback/red aislada y sin acceso a la base en servicio. Valores concretos en la carpeta
  privada, nunca en Git. Nivel A declara configuración de fixture; nivel B, configuración
  productiva declarada y revisada.
- **Alternativa principal y descarte:** configuración de demo o valores por defecto del
  repositorio. No se recomienda para nivel B: no acredita el comportamiento productivo ni
  declara aislamiento e identidad compatible. Un archivo local versionado se descarta por
  riesgo de fuga.
- **Riesgos:** financiero, abrir una base `production` como demo o mezclar identidades;
  seguridad, fuga de rutas o claves; operación, `APP_ORIGIN` incorrecto invalida acceso/TOTP;
  trazabilidad, configuración no reproducible o no revisada.
- **Dependencias:** entorno/DT6; AC01/AC08/AC10/AC16 en nivel B; gate Entorno.
- **Evidencia hoy / falta:** DT6 §3.1.1 fija el preflight y SPEC30 §5.3 exige aislamiento y
  permisos; no hay valores declarados ni revisión. Falta declaración, revisión, autorización
  del entorno y evidencia del preflight.
- **Autorización, gate y AC:** decisión del usuario y autorización del entorno; no fija
  valores operativos ni sustituye la configuración del despliegue. Desbloquea
  AC01/AC08/AC10/AC16 en nivel B.
- **¿Decidible ya?:** no; requiere entorno y valores concretos revisados.

### 3.3 G3 · Evidencia y oráculo

#### F1-D08 — Carpeta de evidencias

- **Recomendación `[PROPUESTA]`:** carpeta privada fuera de Git y del VPS, permisos `0700`,
  estructura por fase/AC, registro con acción, entorno, candidato, base, fecha, operador y
  log crudo; sin datos personales, rutas sensibles ni secretos; acceso restringido y sin
  sincronización pública.
- **Alternativa principal y descarte:** artefactos de CI o carpeta del repositorio con
  `.gitignore`. No se recomiendan: runner compartido, riesgo de publicación e historial. El
  almacenamiento cifrado en nube introduce tercero y decisión DT10.
- **Riesgos:** financiero, pérdida de evidencia que impide reproducir; seguridad, fuga por
  sincronización o logs con secretos; operación, acceso restringido mal gestionado;
  trazabilidad, registro incompleto o no revisable por QA.
- **Dependencias:** gate Evidencia; AC10/AC17 y revisión QA de AC14/AC15. No requiere DT6 ni
  DT7 por sí misma.
- **Evidencia hoy / falta:** SPEC30 §5.7 y el testplan describen el contenido mínimo; no hay
  ruta, responsable, formato ni política de conservación. Falta decisión del usuario.
- **Autorización, gate y AC:** decisión F1 del usuario. Desbloquea AC10/AC17 y la revisión QA
  de AC14/AC15; gate Evidencia.
- **¿Decidible ya?:** sí, con la ruta y el formato que aporte el usuario; no requiere
  evidencia real ni DT6/DT7.

#### F1-D09 — Corte y matriz

- **Recomendación `[PROPUESTA]`:** corte común congelado antes de F2: fecha civil y SHA de
  `test` con v27/C27; matriz v5.11 congelada por hash/fecha con identificador, procedencia,
  escenario R/P, valor esperado, unidad/precisión y regla, revisada por usuario/asesor y no
  derivada del motor. Nivel A admite matriz sanitizada congelada; nivel B exige matriz
  revisada y contraste privado autorizado si se declara.
- **Alternativa principal y descarte:** matriz generada por el motor. No se recomienda: no es
  independiente y no demuestra equivalencia. Tampoco se recomienda actualizarla durante el
  ensayo ni usar un corte móvil: rompe el oráculo e invalida AC16.
- **Riesgos:** financiero, comparar cortes distintos o usar datos sin autorización
  (AC-25/P3); seguridad, exponer datos reales; operación, sesgo si se calcula con el motor;
  trazabilidad, un cambio de esquema invalida AC16 y una matriz sin congelar permite ajustar
  el esperado al resultado.
- **Dependencias:** DT7; oráculo; AC12/AC13/AC14/AC16; gates Oráculo/DT7; AUD-06.
- **Evidencia hoy / falta:** SPEC30 §3.4 y §5.5; la referencia funcional v5.11 es sanitizada
  y el libro no ha sido inspeccionado por los agentes; el contrato vigente es v27/C27. DT7
  mantiene M1/M2/M5/M8 pendientes de evidencia real. Falta fecha/corte, revisión del mapping,
  registro de congelación y autorización de datos reales si aplica.
- **Autorización, gate y AC:** decisión F1 + revisión DT7 del usuario/asesor; autorización
  específica si se usan datos reales. Desbloquea AC12/AC13/AC14/AC16 y los gates
  Oráculo/DT7; no desbloquea por sí solo AC-25/P3.
- **¿Decidible ya?:** parcialmente. La política de corte/SHA y la matriz sanitizada pueden
  decidirse ahora; la matriz v5.11 real y el mapping requieren DT7 y revisión humana.

### 3.4 G4 · Gobernanza de ejecución

#### F1-D10 — Datos reales (AC-25/P3)

- **Recomendación `[PROPUESTA]`:** no autorizar datos reales ni contraste privado en F1–F3;
  mantener AC-25/P3 abierto y declarar el límite de equivalencia de Comida. Cualquier
  contraste real exige una autorización posterior, específica y separada.
- **Alternativa principal y descarte:** autorizar el contraste privado ahora. No se
  recomienda: exige fuente y custodia privadas, autorización específica y amplía el alcance;
  el libro no ha sido inspeccionado por los agentes y el repositorio es público.
- **Riesgos:** financiero, declarar equivalencia no demostrada; seguridad, publicar o exponer
  datos privados; operación, abrir un gate sin custodia; trazabilidad, mezclar matriz
  sanitizada con fuente real.
- **Dependencias:** AUD-06; DT7; oráculo; AC12/AC13 en nivel B; AC-25/P3. No lo desbloquea
  ninguna decisión de F1.
- **Evidencia hoy / falta:** SPEC30 §3.4 y §4.5; la matriz disponible es la referencia
  sanitizada, no el libro; AC-25/P3 sigue abierto. Falta fuente real, autorización y custodia
  si el usuario quisiera revertir la recomendación.
- **Autorización, gate y AC:** decisión F1 explícita. Desbloquea el límite declarado de
  AC12/AC13; no cierra AC-25/P3. Revertirla exige una autorización nueva y específica.
- **¿Decidible ya?:** sí, mantener AC-25/P3 cerrado puede decidirse con la documentación
  actual; autorizar datos reales no.

#### F1-D11 — Nivel de F3

- **Recomendación `[PROPUESTA]`:** separar dos autorizaciones: primero F3 nivel A (fixtures),
  después F3 nivel B (integral), cada una con AC incluidos y exclusiones. No combinar ambas
  en una sola autorización ni presentar el nivel A como cierre de E4.12.
- **Alternativa principal y descarte:** autorizar solo nivel B. No se recomienda: hoy está
  bloqueado por DT6, DT7, entorno y aceptaciones, y dejaría sin preparar la evidencia
  ficticia que sí puede obtenerse. Presentar A como integral se descarta: un
  `PASS (fixtures)` no es aceptación.
- **Riesgos:** financiero, falsa sensación de recuperación; seguridad, ejecutar con el
  entorno equivocado; operación, confundir alcance y recursos; trazabilidad, un nivel A
  tomado como B.
- **Dependencias:** F2; DT6/DT7; E4.5/E4.7/E4.9/E4.10/E4.11; entorno; oráculo; gates de
  SPEC30 §5/§6.
- **Evidencia hoy / falta:** SPEC30 §2.5, §4.6 y §6; F0 aprobada como marco documental y
  F2/F3/F4 `UNRUN`. No hay fixture integral, entorno ni autorización F3. Falta F2 y la
  autorización separada que declare nivel y AC.
- **Autorización, gate y AC:** decisión F1 sobre la secuencia; la autorización de F3 sigue
  siendo un gate separado y posterior. Desbloquea la preparación ordenada, no la ejecución.
- **¿Decidible ya?:** sí como política de secuencia; la autorización concreta de F3 no puede
  decidirse antes de F2.

#### F1-D14 — Candidato y tags

- **Recomendación `[PROPUESTA]`:** fijar como candidato un SHA congelado de `test` con
  `schemaVersion=27`/`C27`, declarado en AC16; no crear tag ni depender de SPEC35 para F3.
  Hoy `test` `93f1e1e` es la referencia de base; el SHA definitivo se congela al autorizar
  F2. Cualquier cambio de esquema o contrato reinicia AC16.
- **Alternativa principal y descarte:** usar un tag `deploy-*` o un corte móvil. No se
  recomienda: la convención de SPEC35 no está implementada (D11 abierta), un tag inexistente
  no es evidencia y un corte móvil mezcla versiones.
- **Riesgos:** financiero, reproducir un resultado sobre otro código; seguridad, desplegar o
  depender de un tag no autorizado; operación, cambiar el candidato a mitad del ensayo;
  trazabilidad, AC16 sin SHA estable.
- **Dependencias:** SPEC35; AC16; esquema v27/C27; gate de §5. No requiere DT6/DT7.
- **Evidencia hoy / falta:** SPEC30 §4.2; `apps/api/src/database-identity.ts` declara
  `schemaVersion=27` y `schema-contracts.json` contiene `C27-E411-FOTOS-PERIODO`; SPEC35
  mantiene D11 abierta y no hay tags operativos. Falta confirmar el SHA definitivo en F2.
- **Autorización, gate y AC:** decisión F1 sobre la política; el coordinador fija el SHA en
  la autorización de F2. Desbloquea AC16.
- **¿Decidible ya?:** la política sí; el SHA concreto se congela en F2.

### 3.5 G5 · Dependencias y aceptaciones

#### F1-D12 — Aceptación E4.9/E4.10/E4.11

- **Recomendación `[PROPUESTA]`:** aceptar E4.9/E4.10/E4.11 como **corte documental con
  reservas** para el nivel A: E4.9 integrada y con QA `APTO CON RESERVAS` pero aceptación
  pendiente; E4.10 con 23 PASS (fixtures)/1 PARCIAL; E4.11 con 14 PASS (fixtures)/1 PARCIAL y
  15 `BLOCKED real` según la nota de 2026-11-09. No declarar aceptación global. Para nivel B,
  exigir una decisión específica sobre cada reserva o su cierre.
- **Alternativa principal y descarte:** esperar al cierre completo antes de preparar F2, o
  tratar los PASS de fixtures como aceptación global. Ninguna se recomienda: la primera
  retrasa innecesariamente el nivel A; la segunda convierte fixtures y reservas en un cierre
  falso.
- **Riesgos:** financiero, usar como oráculo un comportamiento aún no aceptado; seguridad,
  asumir extremos reales no probados; operación, confundir fixtures con producción;
  trazabilidad, reservas ocultas o tablero desactualizado frente a los informes.
- **Dependencias:** E4.9/E4.10/E4.11; DT6/E3.5; E4.2; AC05/AC07/AC13 en nivel B; gate de §5.
- **Evidencia hoy / falta:** informes [E4.10](e410-acceptance-2026-11-06.md) y
  [E4.11](e411-acceptance-2026-11-07.md), con sus notas de reconciliación; SPEC30 §4.1. Falta
  la declaración de aceptación global y la decisión sobre cada reserva.
- **Autorización, gate y AC:** decisión del usuario. Desbloquea el corte del nivel A y
  condiciona AC05/AC07/AC13 en nivel B; no declara aceptación de esas entregas.
- **¿Decidible ya?:** sí, con los informes actuales; el usuario debe aceptar el corte con
  reservas o esperar al cierre.

#### F1-D13 — Aceptación E4.7

- **Recomendación `[PROPUESTA]`:** aceptar E4.7 como corte parcial con brecha explícita:
  AC3 `PARCIAL`, AC10–AC15 `BLOCKED` por E4.5/DT7 y AC19 `UNRUN`; no declarar AC13/AC15
  completos ni un total anual. Para nivel A, usar solo lo que no dependa de E4.5/DT7.
- **Alternativa principal y descarte:** esperar al cierre completo de E4.7 o presentarlo como
  cerrado. No se recomienda: lo primero bloquea sin necesidad el nivel A; lo segundo oculta
  las reservas y produce una equivalencia falsa.
- **Riesgos:** financiero, publicar flujo anual incompleto; seguridad, baja; operación,
  escenarios R3/R6 incompletos; trazabilidad, una brecha no declarada se lee como omisión.
- **Dependencias:** E4.7; E4.5/DT7; AC13/AC15 en nivel B; gate de §5.
- **Evidencia hoy / falta:** [SPEC25](../25-e47-resumen-anual-specification.md) y su
  [testplan](../25-e47-resumen-anual-testplan.md); E4.7 integrada `0e89562`, con AC3
  `PARCIAL`, AC10–AC15 `BLOCKED` y AC19 `UNRUN`. Falta la aceptación de E4.7 y E4.5/DT7.
- **Autorización, gate y AC:** decisión del usuario. Desbloquea un corte parcial explícito;
  no completa AC13/AC15.
- **¿Decidible ya?:** sí, aceptando la brecha; el cierre completo requiere E4.5/DT7.

#### F1-D15 — Alcance E4.5/DT7

- **Recomendación `[PROPUESTA]`:** excluir del nivel A el archivo/histórico E4.5 y el universo
  real de DT7, con brecha explícita; para nivel B, exigir mapping/corte revisados por el
  usuario o declarar que no se acredita equivalencia real. No inventar correspondencias
  campo→caso ni cifras.
- **Alternativa principal y descarte:** incluir E4.5/DT7 sin mapping aprobado. No se
  recomienda: E4.5 no tiene DEV (59 AC `UNRUN`) y DT7 mantiene M1/M2/M5/M8 pendientes; sin
  mapping, AC12 no tiene correspondencia y AC14 no distingue una brecha de una omisión.
- **Riesgos:** financiero, universo histórico incompleto o total inventado; seguridad, baja;
  operación, R4/R5 sin cobertura verificable; trazabilidad, no poder explicar qué falta para
  P7.
- **Dependencias:** E4.5; DT7; AC04/AC06/AC12/AC13/AC14; R4/R5; gate DT7.
- **Evidencia hoy / falta:** [SPEC20/E4.5](../20-historico-precontrol-specification.md)
  aprobada y sin DEV; [DT7](dt7-decision-closure-2026-11-05.md) con M1/M2/M5/M8 pendientes;
  E4.7 AC10–AC15 bloqueados por E4.5/DT7. Falta DEV E4.5, mapping y corte revisados.
- **Autorización, gate y AC:** decisión del usuario. Excluir del nivel A puede decidirse ya
  con brecha explícita; incluir en nivel B exige DT7/E4.5.
- **¿Decidible ya?:** la exclusión del nivel A sí; la inclusión real no.

---

## 4. Tabla resumen de las 15 decisiones

`[PENDIENTE]` Todas. La columna «¿Ya?» distingue lo decidible con documentación de lo que
requiere dato operativo, DT6/DT7 o datos reales.

| ID | Decisión | Recomendación `[PROPUESTA]` | Evidencia hoy | Falta | Gate/AC | ¿Ya? | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1-D01 | Destino y segunda copia | Dos soportes físicos existentes, cifrados y separados | DT6; restores sintéticos v19/v20/v27 | Inventario, rutas, capacidad, DT6 | DT6/Entorno; AC01/AC11 B | No | `[PENDIENTE]` |
| F1-D02 | Canal de exportación | Manual controlado con SHA-256 y llegada registrada | DT6 §3.2.1; restores sintéticos | Canal, operador, llegada real, DT6 | DT6/Evidencia; AC01/AC10/AC11 B | No | `[PENDIENTE]` |
| F1-D03 | Custodia `age` | Offline, separada del VPS y de las copias; rotación verificada | DT6 §3.4; `age` en restores | Ubicación, custodio, prueba de descifrado, DT6 | DT6/custodia; AC01/AC08/AC09 B | No | `[PENDIENTE]` |
| F1-D04 | Retención y poda | 7/4/3 con poda manual reversible y fecha aprobada | Objetivo aceptado en security; DT6 §3.4 | Fecha, capacidad, responsable, registro | DT6; AC11 B | Parcial: objetivo confirmado | `[PENDIENTE]` |
| F1-D05 | `--allow-older` | Deshabilitado por defecto; excepción por copia | DT6 §3.5.1; negativos de antigüedad | Política, aprobación por caso, DT6 | DT6; AC09/AC11/AC13 B | Política sí; casos no | `[PENDIENTE]` |
| F1-D06 | Equipo Linux x86_64 | Equipo físico aislado; sin sustituto CI para B | Restore Linux CI (E4.10 AC22, #257) | Disponibilidad, características, fecha | Entorno; AC01/AC08/AC16 B | No | `[PENDIENTE]` |
| F1-D07 | Configuración productiva | Preflight declarado y revisado; valores fuera de Git | DT6 §3.1.1; SPEC30 §5.3 | Valores, revisión, autorización | Entorno; AC01/AC08/AC10/AC16 B | No | `[PENDIENTE]` |
| F1-D08 | Carpeta de evidencias | Privada, fuera de Git/VPS, `0700`, registro por AC | SPEC30 §5.7; testplan | Ruta, responsable, formato, conservación | Evidencia; AC10/AC17 | Sí, con ruta del usuario | `[PENDIENTE]` |
| F1-D09 | Corte y matriz | Corte congelado v27/C27; matriz v5.11 independiente | Referencia sanitizada; contrato v27/C27 | Fecha, revisión DT7, congelación, datos reales | Oráculo/DT7; AC12/AC13/AC14/AC16 | Parcial | `[PENDIENTE]` |
| F1-D10 | Datos reales | No autorizar; mantener AC-25/P3 abierto | AC-25/P3 abierto; libro no inspeccionado | Autorización nueva si se revierte | AUD-06; AC12/AC13 B | Sí, para mantener cerrado | `[PENDIENTE]` |
| F1-D11 | Nivel de F3 | Primero nivel A; nivel B separado | SPEC30 §2.5/§4.6/§6; F0 solo | F2, entorno, autorización F3 | §5/§6; AC incluidos | Sí, como secuencia | `[PENDIENTE]` |
| F1-D12 | Aceptación E4.9/E4.10/E4.11 | Corte con reservas para A; B decide cada reserva | Informes E4.10/E4.11; SPEC30 §4.1 | Aceptación global y reservas | §5; AC05/AC07/AC13 B | Sí, documental | `[PENDIENTE]` |
| F1-D13 | Aceptación E4.7 | Corte parcial con brecha R3/R6 | SPEC25/testplan; AC3/AC10–15/AC19 | Aceptación E4.7; E4.5/DT7 | §5; AC13/AC15 B | Sí, con brecha | `[PENDIENTE]` |
| F1-D14 | Candidato y tags | SHA de `test` v27/C27, sin tag | `test` `93f1e1e`; SPEC35 D11 abierta | SHA definitivo en F2 | AC16 | Política sí; SHA en F2 | `[PENDIENTE]` |
| F1-D15 | Alcance E4.5/DT7 | Excluir de A con brecha; B exige mapping | E4.5 sin DEV; DT7 M1/M2/M5/M8 | DEV E4.5, mapping/corte | DT7; AC04/AC06/AC12/AC13/AC14 | Exclusión sí; inclusión no | `[PENDIENTE]` |

---

## 5. Paquete mínimo aprobable y orden sugerido

`[PROPUESTA]` No existe un «paquete integral» que pueda aprobarse hoy sin evidencia real.
Sí existen paquetes parciales, cada uno con su límite:

### 5.1 Paquete documental A

Puede resolverse con la documentación actual y decisiones del usuario, sin datos reales, sin
DT6 cerrado y sin DT7 completo:

- **F1-D10** — mantener datos reales y AC-25/P3 fuera.
- **F1-D11** — separar F3 nivel A y nivel B.
- **F1-D08** — fijar carpeta privada y formato de evidencia.
- **F1-D14** — fijar la política de candidato/SHA sin tag.
- **F1-D12** — aceptar E4.9/E4.10/E4.11 como corte con reservas para A.
- **F1-D13** — aceptar E4.7 como corte parcial con brecha.
- **F1-D15** — excluir E4.5/DT7 de A con brecha explícita.
- **F1-D09 (parcial)** — fijar la regla de corte y autorizar la congelación de la matriz
  sanitizada en F2; no se aprueba una matriz que aún no existe.

Este paquete **no autoriza F2**: todavía faltan la fixture integral, el entorno y la
autorización específica de F2.

### 5.2 Paquete de entorno

- **F1-D06** y **F1-D07**: equipo y configuración. Son necesarios para ejecutar, pero el
  nivel A puede usar un entorno aislado disponible y configuración de fixture. El nivel B
  exige equipo Linux x86_64 y configuración productiva declarada.

### 5.3 Paquete DT6

- **F1-D01–F1-D05**: destino, canal, custodia, retención y `--allow-older`. Requieren
  evidencia operativa del usuario y autorización DT6. Aprobarlos en bloque no cierra DT6 ni
  autoriza copias reales; solo fija la dirección.

### 5.4 Orden sugerido

1. **F1-D10 + F1-D11:** fijar el marco (sin datos reales; A antes que B).
2. **F1-D08 + F1-D14:** asegurar evidencia y candidato.
3. **F1-D12 + F1-D13 + F1-D15:** declarar el corte y sus brechas.
4. **F1-D09:** congelar corte y matriz sanitizada para F2.
5. **F1-D06 + F1-D07:** habilitar el entorno del nivel que se autorice.
6. **F1-D01–F1-D05:** preparar DT6 en paralelo; imprescindible antes del nivel B.

`[CONFIRMADO]` El orden no crea autorizaciones: cada paso requiere decisión explícita y las
fases F2/F3/F4 conservan sus gates separados.

---

## 6. Qué puede decidirse ya y qué no

| Categoría | Decisiones | Condición |
| --- | --- | --- |
| **Decidible con documentación actual** | F1-D10, F1-D11 (secuencia), F1-D12, F1-D13, F1-D15 (exclusión A), F1-D14 (política) | El usuario acepta el corte con reservas o la exclusión con brecha; no se declara aceptación global |
| **Decidible con un dato del usuario, sin DT6/DT7** | F1-D08 (ruta y formato), F1-D04 (fecha/capacidad/responsable), F1-D05 (política) | El usuario aporta la decisión operativa; no se inventan rutas ni plazos |
| **Requiere evidencia operativa y DT6** | F1-D01, F1-D02, F1-D03, F1-D04, F1-D05 | Soportes, custodio, canal, calendario y aprobación por caso; DT6 sigue abierto |
| **Requiere entorno/equipo** | F1-D06, F1-D07 | Disponibilidad y configuración declaradas; el nivel B no se sustituye por CI |
| **Requiere DT7/E4.5 o datos reales** | F1-D09 (matriz real), F1-D15 (inclusión B), F1-D10 (reversión) | Mapping/corte revisados, DEV E4.5 o autorización específica de datos reales |

`[CONFIRMADO]` Ninguna fila de «decidible ya» convierte una propuesta en PASS de AC ni en
aceptación de E4.9/E4.10/E4.11/E4.7. Las reservas siguen abiertas.

---

## 7. Registro de respuesta del usuario

`[PROPUESTA]` Para cada decisión, registrar en el canal que el usuario autorice:

```text
ID: F1-Dxx
Decisión: aprobar / modificar / rechazar / mantener pendiente
Opción aprobada: <recomendación u otra>
Alcance y exclusiones:
Evidencia o referencia privada (no el dato sensible):
Fecha y responsable:
Efecto esperado en gate/AC (sin declarar PASS):
```

Una respuesta sin opción y alcance deja la decisión `[PENDIENTE]`. La aprobación de este
expediente, de una recomendación o de un grupo **no autoriza F2/F3/F4**, no cierra DT6, DT7,
E4.12 ni P7 y no declara ningún AC en PASS.

---

## 8. Evidencia, límites y siguiente acción

- **Fuentes principales:** [SPEC30](../30-e412-recuperacion-specification.md) §2.5, §3.4,
  §4, §5, §6, §7 y §9; [testplan 30](../30-e412-recuperacion-testplan.md);
  [DT6](dt6-t-bkp-procedure-2026-10-31.md); [DT7](dt7-decision-closure-2026-11-05.md);
  [E4.10](e410-acceptance-2026-11-06.md); [E4.11](e411-acceptance-2026-11-07.md);
  [restore v19/v20](restore-v19-v20-linux-2026-10-31.md);
  [SPEC25/E4.7](../25-e47-resumen-anual-specification.md);
  [SPEC20/E4.5](../20-historico-precontrol-specification.md);
  [security](../guidelines/security.md); [quality](../guidelines/quality.md) y
  [roadmap](../roadmap.md#e412--ensayo-integral-de-recuperación-y-preparación-de-equivalencia).
- **Lo que este expediente no demuestra:** que exista una copia externa, que la identidad
  `age` esté custodiada, que haya equipo Linux disponible, que la matriz v5.11 esté
  congelada, que E4.9/E4.10/E4.11/E4.7 estén aceptadas o que AC-25/P3 esté resuelto.
- **Riesgo residual:** aprobar recomendaciones sin aportar la evidencia operativa dejaría
  F1 formalmente avanzada pero F2 bloqueada; aprobar el nivel B sin DT6/DT7 repetiría el
  error de tomar un restore sintético como recuperación operativa.
- **Siguiente acción:** el coordinador presenta al usuario las 15 decisiones, con el paquete
  mínimo de §5.1 como primera respuesta posible y las decisiones de §6 marcadas como
  dependientes de evidencia. Solo después de una respuesta explícita e identificable se
  registra F1 y se propone F2, que sigue siendo un gate separado.
