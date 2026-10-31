# 26 — E4.8 Precierre y controles de consistencia: Specification

Status: **APPROVED — SPEC26/E4.8 aprobada documentalmente el 2026-10-28.** Los AC
siguen UNRUN; no autoriza DEV, código ni despliegue.
Approval source/date: **aprobación funcional del usuario el 2026-10-28**, condicionada a
las correcciones documentales de `SinPlan` y bloqueo E4.9 por E3.5, ya aplicadas; CI
`40668646943` SUCCESS. Decisiones M1–M6 confirmadas. **DT3 y DT4 resueltas el
2026-10-28** (ver «DT3/DT4 — resolución»); **DT6/T-BKP sigue abierto** y bloquea E4.9.
Revisión documental del 2026-10-31: fuentes y referencias contrastadas con `main`
`98b9792`; se distinguen los hechos integrados del PR #136 en revisión; sin cambios en
las decisiones aprobadas ni en los AC. Wireframes propuestos a continuación, pendientes
de aprobación visual.
Context and brainstorming: [26-e48-precierre-brainstorming.md](26-e48-precierre-brainstorming.md),
[inventario DT5](investigations/dt5-write-impact-inventory.md),
[propuesta E4.8/E4.9](investigations/dt5-e48-e49-specification-proposal.md),
[E4.8](roadmap.md#e48--revisión-de-precierre-y-controles-de-consistencia).
Base de aprobación: `main` `f077b7e`, esquema 18; revisión documental: `main` `98b9792`.

## Functionality

E4.8 permite revisar un ciclo antes de cerrarlo. Es una capacidad **de solo lectura**: no
crea, modifica ni elimina hechos, no altera S0, no cambia la ventana, no crea el cierre ni
crea el ciclo siguiente.

Incluye:

- ventana financiera, S0 y estado del ciclo;
- Movimientos del ciclo y su clasificación/Referencias;
- plan final o `SinPlan`, y presupuestos;
- Anticipos, Compartidos, Revisión Comida, Deuda E1.6 y Nómina si hay hechos;
- E4.1 Instrumentos/Compras/efectivo/posiciones;
- E4.5 histórico/precontrol y E3.6 pendientes/conciliación como fuentes de solo lectura,
  si están disponibles;
- cobertura, diferencias, bloqueos, avisos y evidencia de backup preflight.

No incluye: valoración/resultado/patrimonio E4.3, Comida E3.5/FIN_NETA, Ventas E4.2,
conciliaciones E4.4, escritura, cierre, foto, reapertura ni cálculo de patrimonio no
disponible.

## Data model and contracts

No se crea tabla ni migración en E4.8. El precierre es una lectura derivada.

### Ventana y estados

- `ciclo`: identidad existente; `inicio` y `fin` finitos y acreditados.
- Si existe siguiente Inicio, `fin = día anterior` según la derivación vigente.
- Si no existe siguiente Inicio, no se inventa `fin`: estado `Bloqueado` con motivo
  `SIN_SIGUIENTE_INICIO`. DT3 resuelta el 2026-10-28: el último ciclo solo es cerrable
  cuando existe un ciclo posterior que acredita su Fin.
- `S0`: `saldo_comida` del ciclo; su ausencia bloquea.

### DT3/DT4 — resolución (2026-10-28)

Decisiones del usuario, sin reabrir M1–M6:

- **DT3 · último ciclo:** no se cierra mientras no exista siguiente Inicio; no se admite
  Fin manual ni fecha inventada. Cuando exista, `fin` se deriva y el ciclo pasa a
  elegible.
- **DT3 · elegibilidad y orden:** es cerrable todo ciclo con ventana finita, S0 y núcleo
  consistente. Si ya existen cierres posteriores, el precierre muestra
  `CIERRE_FUERA_DE_ORDEN` y exige motivo; además comprueba la coherencia al mismo corte
  con las fotos posteriores, incluidas las operaciones legítimas posteriores. Solo una
  diferencia no explicable bloquea con `INCOHERENCIA_CON_CIERRE_POSTERIOR`; el aviso no
  basta. Un ciclo sin hechos solo se cierra si se acredita ausencia de operaciones
  imputables al ciclo en todas las fuentes aplicables; no se deduce de la falta de
  Movimientos, del S0 (incluido 0), de posiciones heredadas ni de la ausencia de Compras
  nuevas; un cero informado no es ausencia.
- **DT3 · plan siguiente:** sin precarga automática; E2.3 ya resuelve copia explícita
  con revisión previa y sin inventar histórico.
- **DT4:** el contenido, metadatos, versiones y retención de la foto se resuelven en
  SPEC27; E4.8 no crea fotos y solo muestra la evidencia disponible.
- **DT6/T-BKP:** sigue abierto. No existe aún destino externo; el criterio de evidencia
  es copia externa cifrada, restauración aislada probada y ensayo mensual. Sin esa
  evidencia el precierre queda `Bloqueado` y E4.9 no se habilita.

E4.8 no ejecuta ninguna regla de escritura: solo muestra bloqueos y avisos.

### Fuentes y cobertura

| Fuente | Estado esperado | Efecto |
| --- | --- | --- |
| Movimientos, clasificación, Referencias | Implementado | Núcleo; inconsistencia estructural bloquea |
| Plan de Ciclo/Anual, Presupuestos | Implementado | `SinPlan` válido; `PlanNoVerificable` bloquea |
| Anticipos, Compartidos, Nómina, Revisión Comida, Deuda E1.6 | Implementado | Se capturan si hay hechos |
| E4.1 Inversión | Integrado `156a50d` | Instrumentos, Compras, efectivo, cantidades y posiciones |
| E4.3 valoración/resultado/patrimonio | No implementado | `No disponible`; aviso, no cero |
| E3.5 Comida/FIN_NETA | No implementado | `No disponible`; aviso/parcial |
| E4.2 Ventas | Documental; sin DEV | `No disponible`; aviso/parcial |
| E4.4 Deuda completa/conciliaciones | Documental en revisión; sin código | `No disponible`; Deuda E1.6 sí |
| E4.5 Histórico y E3.6 Pendientes | Documental; sin código | `No disponible`; solo lectura cuando exista; no escritura |

Contraste con la base real (`main` `98b9792`): E4.1 está integrado; E4.5 y E3.6 son
documentales sin código; E4.2 y E4.4 siguen sin DEV. El PR #136 de Comida/Partidas está
OPEN y **no forma parte de esta base**: no se presume su código integrado ni cambia el
estado `No disponible` de E3.5/FIN_NETA hasta el merge y la verificación correspondientes.
Esta spec no modifica ni depende de su rama.

### Inversión a fecha Fin

El precierre calcula efectivo con `cashAt(..., fin)` y posiciones con
`positionsFor(..., fin)`. Incluye operaciones anteriores al ciclo y excluye las
posteriores a `fin`; un ciclo sin Compras nuevas no es una inversión vacía si existen
posiciones anteriores. La valoración, resultado y patrimonio E4.3 siguen `No disponible`.

### Plan

- **`SinPlan`:** no existen líneas; es un estado válido y no bloquea el precierre.
- **`PlanVerificado`:** líneas presentes y consistentes; se capturan.
- **`PlanNoVerificable`:** líneas presentes pero fuente/revisión inconsistente, duplicada
  o no verificable; bloquea el cierre.
- **`SinPlanificar`:** ejecución real sin línea; aviso independiente, no «Sin plan».

### Comida E3.5

E4.8 puede mostrar precierre parcial con motivo mientras E3.5/FIN_NETA no esté integrado.
E4.9 no puede cerrar con Comida `No disponible`; el cierre queda bloqueado hasta que E3.5
sea verificable. E4.8 no implementa el motor E3.5; cuando exista, consumirá sus resultados
verificados sin reimplementarlo. No se admite cierre parcial anticipado ni re-cierre como
sustituto.

### Backup preflight

E4.8 no ejecuta el cierre. Verifica que exista evidencia DT6/T-BKP recuperable:
manifiesto, checksum, clave disponible y prueba de restauración efectiva. Sin evidencia,
el resultado es `Bloqueado`; no se sustituye por un checkbox.

## Screens and interfaces

Wireframes **propuestos el 2026-10-31 para aprobación visual**; no aprobados todavía, sin
UI implementada. Sustituirán, si se aprueban, la descripción preliminar anterior sin
cambiar ninguna regla financiera ni AC.

Vista estática reproducible:
[26-e48-precierre-wireframes.html](26-e48-precierre-wireframes.html), con capturas
`26-e48-precierre-captures/w1-desktop-1440.png` (1440×1565) y
`26-e48-precierre-captures/w2-mobile-390.png` (390×1985). Son artefactos documentales de
revisión, no una implementación ni una prueba funcional.

Convenciones:

- Reutilizan shell, cabecera, paneles, etiquetas, tabla/tarjetas y texto oscuro sobre verde
  `#8DBB2E`; fondo claro, sin tema oscuro.
- Escritorio 1440 px y móvil 390 px. En móvil las tablas pasan a tarjetas apiladas; no se
  oculta ninguna fuente ni motivo.
- Los importes, cantidades, fechas, IDs y hashes se muestran como marcadores `«…»`: son
  ejemplos de composición, no datos reales ni cifras calculadas. El ciclo de los ejemplos
  es ficticio.
- El ASCII es una composición simbólica. La vista HTML documental y sus capturas fijan la
  composición a 1440/390, pero no son UI implementada; el ancho real de la futura UI se
  verificará con capturas cuando exista UI autorizada.
- El selector de ciclo es el único control de contexto; no se añade un selector de
  contexto separado.
- No existe botón operativo de cierre, foto ni escritura. El control de cierre de E4.9 se
  representa **deshabilitado**, con el motivo visible.
- `No disponible` nunca se representa como `0`; una fuente vacía se muestra vacía explícita.
- Los enlaces de revisión apuntan a las pantallas de origen; no duplican sus motores.

### W1 · Escritorio 1440 — precierre bloqueado

```text
MyFinanzas · Precierre                                    Revisión «hash…»  [↻]
Ciclo «periodo» · «inicio» → «fin» · solo lectura
════════════════════════════════════════════════════════════════════════════════
Navegación            │ Revisión de precierre
· Ciclos              │ Ciclo [«periodo» ▾]       Estado: ● Bloqueado
· Movimientos         │ Ventana  Inicio «fecha» · Fin «fecha» derivado del
· Plan                │          siguiente Inicio · no editable en E4.8
· Auxiliares          │ S0       «importe» · S0 informado manualmente en el ciclo
· Inversión           │          No se recalcula ni se crea si falta
· Precierre ← activo  │ Cobertura «n» de «m» fuentes · «k» bloqueos · «j» avisos
                      │
                      │ BLOQUEOS
                      │ • BACKUP_NO_VERIFICABLE — falta evidencia DT6/T-BKP
                      │   restaurable
                      │
                      │ FUENTES Y COBERTURA
                      │ Fuente                        Cobertura        Estado        Motivo                      Enlace
                      │ Movimientos/clasificación/Ref «n» hechos       Verificado    núcleo                      Abrir
                      │ Plan del ciclo                SinPlan          Válido        sin líneas                  Abrir plan
                      │ Auxiliares (estado y enlace individuales)
                      │   Anticipos                   «n» hechos       Verificado    con hechos                  Abrir
                      │   Compartidos                 «n» hechos       Verificado    con hechos                  Abrir
                      │   Nómina                      «n» hechos       Verificado    con hechos                  Abrir
                      │   Revisión Comida             «n» hechos       Verificado    con hechos                  Abrir
                      │   Deuda E1.6                  «n» hechos       Verificado    con hechos                  Abrir
                      │ E4.1 Inversión                posiciones a Fin Integrado     efectivo/cantidades a Fin   Abrir
                      │ E4.3 valoración/patrimonio    —                No disponible sin motor E4.3              No disp.
                      │ E3.5 Comida/FIN_NETA          —                No disponible FIN_NETA no integrado        No disp.
                      │ E4.2 Ventas                   —                No disponible sin DEV                     No disp.
                      │ E4.4 Deuda completa           —                No disponible documental en revisión      No disp.
                      │ E4.5 Histórico/precontrol     —                No disponible documental sin código       No disp.
                      │ E3.6 Pendientes/conciliación  —                No disponible documental sin código       No disp.
                      │ «No disp.» = enlace inactivo; el motor no existe todavía.
                      │
                      │ AVISOS
                      │ • E3.5/FIN_NETA no disponible: precierre parcial;
                      │   E4.9 queda bloqueado
                      │ • E4.3 no disponible: valoración/patrimonio no se
                      │   muestran como 0
                      │ • E4.1 sin Compras nuevas: se muestran las posiciones
                      │   anteriores a Fin
                      │ • Cobertura parcial por E3.5; el bloqueo de backup
                      │   prevalece y el estado global es Bloqueado
                      │
                      │ EVIDENCIA DE BACKUP (DT6/T-BKP)
                      │ Manifiesto «no verificable» · Checksum «no verificable»
                      │ Clave «no verificable» · Restauración «no probada»
                      │ → Sin evidencia recuperable el precierre queda Bloqueado
                      │
                      │ ENLACES DE REVISIÓN
                      │ Movimientos · Plan · Anticipos · Compartidos · Nómina
                      │ Revisión Comida · Deuda E1.6 · Inversión · Histórico
                      │ Pendientes
                      │
                      │ [Cerrar ciclo (E4.9) — no disponible en E4.8] (deshabilitado)
════════════════════════════════════════════════════════════════════════════════
```

### W2 · Móvil 390 — misma información, apilada

```text
MyFinanzas · Precierre      Revisión «hash…»
← Ciclos
Ciclo [«periodo» ▾]
● Bloqueado
──────────────────────────────────────
Ventana
Inicio «fecha»
Fin «fecha» (derivado)
S0 «importe» · manual, no editable
──────────────────────────────────────
BLOQUEOS «k»
• BACKUP_NO_VERIFICABLE
  Falta evidencia DT6/T-BKP
──────────────────────────────────────
FUENTES «n»/«m»
Movimientos        «n» hechos    Verificado     núcleo → Abrir
Plan               SinPlan       Válido         sin líneas → Abrir plan
AUXILIARES · estado y enlace por fuente
Anticipos          «n» hechos    Verificado     hechos → Abrir
Compartidos        «n» hechos    Verificado     hechos → Abrir
Nómina             «n» hechos    Verificado     hechos → Abrir
Revisión Comida    «n» hechos    Verificado     hechos → Abrir
Deuda E1.6         «n» hechos    Verificado     hechos → Abrir
E4.1 Inversión     a Fin         Integrado      posiciones → Abrir
E4.3 valoración    —             No disponible  sin motor → No disp.
E3.5 Comida        —             No disponible  FIN_NETA → No disp.
E4.2 Ventas        —             No disponible  sin DEV → No disp.
E4.4 Deuda         —             No disponible  documental → No disp.
E4.5 Histórico     —             No disponible  documental → No disp.
E3.6 Pendientes    —             No disponible  documental → No disp.
«No disp.» = enlace inactivo; el motor no existe todavía.
──────────────────────────────────────
AVISOS
• E3.5 no disponible; precierre
  parcial; E4.9 bloqueado
• E4.3 no se muestra como 0
• E4.1 sin Compras nuevas:
  posiciones anteriores a Fin
• Cobertura parcial por E3.5;
  bloqueo de backup prevalece
──────────────────────────────────────
BACKUP DT6/T-BKP
Manifiesto     «no verificable»
Checksum       «no verificable»
Clave          «no verificable»
Restauración   «no probada»
──────────────────────────────────────
ENLACES
Movimientos · Plan · Anticipos ·
Compartidos · Nómina · Revisión
Comida · Deuda E1.6 · Inversión ·
Histórico · Pendientes
──────────────────────────────────────
[Cerrar ciclo (E4.9)] deshabilitado
No disponible en E4.8
```

Variante no simultánea (AC-02): sin siguiente Inicio no hay Fin derivado.

```text
VARIANTE · ciclo sin siguiente Inicio
● Bloqueado · SIN_SIGUIENTE_INICIO
Ventana  Inicio «fecha» · Fin «no derivable»
No se inventa fecha, no se crea el ciclo siguiente
y no se permite cerrar.
```

### W3 · Estados del plan

```text
PLAN DEL CICLO
SinPlan            Válido       No bloquea; muestra «Sin plan»; no inventa líneas
SinPlanificar      Aviso        Ejecución real sin línea; no es lo mismo que SinPlan
PlanVerificado     Verificado   «n» líneas consistentes; se capturan sin recalcular
PlanNoVerificable  Bloqueado    Líneas duplicadas, revisión inconsistente o fuente
                                no verificable; no se captura el plan ni se corrige

[Ver plan del ciclo]   [Ver ejecución]   [Ver detalle de inconsistencias]
```

### W4 · Cobertura y estados

```text
ESTADO DE LA PANTALLA
Listo             Núcleo verificado; sin bloqueos ni avisos
Listo con avisos  Núcleo verificado; «j» avisos sin bloqueo
Parcial           Fuente no disponible con motivo; no se presenta como completo
Bloqueado         Uno o más motivos; no se cierra; corregir fuera de E4.8

ESTADO DE CADA FUENTE
Vacío             Ausencia acreditada de operaciones imputables al ciclo;
                  vacío explícito, nunca 0; no equivale a «Sin hechos»
No disponible     Sin motor, sin datos verificables o documental sin código;
                  motivo visible; no es 0 ni vacío; no bloquea salvo excepción
Error de lectura  Fallo al leer la fuente; conserva identidad y hechos conocidos;
                  cifra no verificable; [Reintentar]
Verificado        La fuente responde y cubre el corte; se muestran sus hechos
Integrado         Motor integrado (E4.1); se muestran sus hechos y cobertura

Vacío ≠ No disponible ≠ Error de lectura ≠ 0.
```

### W5 · Inconsistencias y cierres posteriores

```text
INCONSISTENCIAS
[BLOQUEADO] Movimientos / clasificación / Referencias
  • «ID»: referencia inactiva usada como obligatoria
  • «ID»: clasificación incompatible con el tipo
  No se corrige ni se escribe desde el precierre. [Abrir Movimientos]

[AVISO] CIERRE_FUERA_DE_ORDEN
  Existen cierres posteriores («referencias»). Se compara al mismo corte.
  El cierre exige motivo; E4.8 solo declara el aviso y no lo captura ni lo escribe.
  Sin diferencia no explicable no bloquea por sí solo.

[BLOQUEADO] INCOHERENCIA_CON_CIERRE_POSTERIOR
  Diferencia no explicable al mismo corte respecto de «cierre».
  No se permite cerrar; no se escribe ni se corrige el histórico.
```

### W6 · Carga y sesión

```text
CARGA Y SESIÓN
Carga             Conserva ciclo y filtros; sin cifras provisionales;
                  sin mezcla de revisiones
Sesión expirada   Conserva el contexto; exige reautenticación; sin cifras ni cierre
```

El error de lectura se detalla en W4 y no se confunde con vacío ni con no disponible.

Decisiones visuales pendientes de aprobación: jerarquía de la tabla de fuentes en
escritorio, agrupación de bloqueos frente a avisos, representación del control de cierre
deshabilitado y orden de tarjetas en móvil. La aprobación de estos wireframes es un gate
visual separado de la aprobación de la spec y no autoriza DEV.

La UI no muestra `0` por ausencia. Distingue `No disponible`, `Parcial`, `Bloqueado` y
`Listo con avisos`.

## Empty, loading and error states

- **Vacío por fuente:** una fuente capturable sin operaciones imputables al ciclo se
  muestra vacía explícita, no 0; no equivale a `Sin hechos` del ciclo. Un S0 informado
  (incluido 0) es un dato, una posición heredada se captura y la ausencia de Compras
  nuevas no vacía la inversión. `Sin hechos` exige ausencia acreditada de operaciones
  imputables en todas las fuentes aplicables; un cero informado no es ausencia.
- **Carga:** conserva filtros y ciclo; no muestra cifras provisionales.
- **Error de fuente:** conserva identidad y hechos conocidos; declara la cifra no
  verificable y ofrece reintento.
- **Bloqueado:** motivo y acción segura; no permite cerrar.
- **Sesión expirada:** conserva el contexto y exige reautenticación.

## API behavior and external dependencies

Contrato **conceptual**, no implementado. Las rutas, códigos y campos describen el
comportamiento previsto; ningún endpoint existe en `main` y no se declara prueba PASS.

### Superficie de lectura

- `GET /api/cierres/precierre/:ciclo` — resumen, fuentes, cobertura, bloqueos, avisos,
  revisión/hash y evidencia de backup.
- `GET /api/cierres/:ciclo/estado` — estado y versión; sin escritura. Ruta canónica
  compartida con SPEC27.
- Cualquier `POST/PATCH/DELETE` en E4.8 devuelve 405/422 (405 si el método no se admite;
  422 si la operación o el cuerpo se rechazan); no hay cierre ni mutación.

### Permisos y sesión

- Aplicación privada de un único usuario: no se introducen roles, permisos por fuente ni
  delegación nuevos. La lectura exige la sesión autenticada vigente del producto.
- Sin sesión válida: `401`, sin datos financieros en el cuerpo. La UI conserva ciclo y
  contexto y exige reautenticación, sin mostrar cifras.
- Hereda la sesión MFA completa, la verificación de Origin/CSRF y las cookies existentes
  descritas en [security](guidelines/security.md); no diseña autenticación nueva.
- El endpoint de precierre no es público, no se comparte con terceros y no admite
  credenciales embebidas en URL.
- Las pruebas de contrato usarán fixtures sintéticos; no requieren datos reales.

### Idempotencia y revisión

- Los `GET` son idempotentes y sin efectos: repetir la misma lectura sobre fuentes sin
  cambios devuelve la misma `revision`/hash y no altera S0, ventana, hechos ni cierres.
- La `revision` cambia si cambia cualquier fuente que compone el resultado. La UI la
  muestra. E4.8 no expone confirmación ni escribe; el flujo de cierre E4.9/SPEC27 es quien
  usa esa revisión para detectar `IMPACT_CHANGED`/409.
- La lectura no cachea cifras provisionales ni mezcla revisiones entre fuentes: si una
  fuente falla, se conserva la identidad del ciclo y se declara esa fuente no verificable.
- No se define paginación ni escritura diferida: el precierre es una lectura derivada y
  completa del ciclo.

### Resultados vacíos y errores (conceptual)

- Fuente capturable sin operaciones imputables: `{ estado: "vacio", motivo: null }` con
  presentación de vacío explícito, nunca `0`.
- Fuente sin motor o sin datos verificables: `{ estado: "no_disponible", motivo }`; no es
  un cero y no bloquea por sí sola salvo las excepciones ya aprobadas.
- Fuente con error de lectura: `{ estado: "error", motivo, reintentable: true }`; conserva
  identidad y hechos conocidos.
- Núcleo inconsistente o backup sin evidencia: bloqueo con motivo estable; la respuesta
  no incluye una operación de corrección.
- Cambio de revisión entre lecturas: se declara la nueva `revision`. En E4.8 toda
  mutación se rechaza con 405/422; el flujo de cierre E4.9/SPEC27 responde `409` con
  `IMPACT_CHANGED` si se intenta confirmar con una revisión anterior.

Sin servicios externos, importadores ni acceso a datos reales. El backup se lee como
evidencia DT6/T-BKP, no se ejecuta desde este endpoint.

## Validation and edge cases

- Ventana no finita o sin S0 → `Bloqueado`; no se inventa fecha ni S0.
- `SinPlan` → válido; no bloquea ni inventa líneas. `PlanNoVerificable` → `Bloqueado`.
- Inconsistencia estructural en Movimientos/clasificación/Referencias → `Bloqueado`.
- E4.1 no disponible → `Bloqueado` para el núcleo de inversión; un ciclo sin inversiones
  nuevas pero con posiciones anteriores muestra posición a Fin, no vacío.
- E4.3/E4.2/E4.4 no disponibles → aviso/parcial; no bloqueo por sí solo.
- E3.5/FIN_NETA no disponible → precierre parcial con motivo; E4.9 bloqueado, sin foto.
- Backup no verificable → `Bloqueado`.
- Cierre fuera de orden con diferencia no explicable al mismo corte → `Bloqueado` por
  `INCOHERENCIA_CON_CIERRE_POSTERIOR`; no se permite cerrar ni se escribe.
- Cambio entre preview y confirmación → 409; E4.8 no confirma.
- Cualquier intento de escritura, cierre o creación del ciclo siguiente → rechazo.
- La vista no altera S0 ni la ventana.

## Exclusions

- No crear cierre, foto, reapertura, versión ni ciclo siguiente.
- No calcular E4.3, E3.5/FIN_NETA, E4.2 ni E4.4.
- No duplicar motores de Comida, inversión o conciliación.
- No habilitar cierre parcial anticipado por E3.5/FIN_NETA no disponible.
- No cerrar DT6/T-BKP ni habilitar el cierre; DT3/DT4 ya están resueltas (ver arriba).
- No escribir en tablas, código, migraciones ni endpoints de mutación.

## Acceptance checks

| ID | Acción / precondiciones | Resultado esperado |
| --- | --- | --- |
| AC-01 | Ciclo con siguiente Inicio y S0; abrir precierre | Ventana finita, S0 visible y `Listo`/`Listo con avisos`; sin escritura |
| AC-02 | Ciclo sin siguiente Inicio; abrir precierre | `Bloqueado` con `SIN_SIGUIENTE_INICIO`; no se inventa Fin ni fecha |
| AC-03 | Ciclo sin S0 | `Bloqueado`; no se crea S0 |
| AC-04 | Movimientos/clasificación/Referencias inconsistentes | `Bloqueado`; no se corrige ni escribe |
| AC-05 | Ciclo con posiciones E4.1, incluidas operaciones anteriores | Instrumentos, Compras, efectivo y posiciones a Fin visibles; valoración/patrimonio `No disponible` |
| AC-06 | Ciclo sin Compras nuevas pero con posiciones anteriores; después sin ninguna operación histórica | Con posiciones: posición acumulada a Fin, no vacío ni 0; sin operaciones: vacío explícito; no bloqueo automático |
| AC-07 | E4.3/E4.2/E4.4 no disponibles | Aviso/parcial con motivo; no cero y no bloqueo por sí solo |
| AC-08 | Backup sin evidencia DT6/T-BKP | `Bloqueado`; no se permite cerrar |
| AC-09 | Intentar POST/PATCH/DELETE en precierre | 405/422; sin escritura |
| AC-10 | Abrir precierre y comprobar S0/ventana | No se alteran; no se crea ciclo siguiente ni cierre |
| AC-11 | Cambiar fuente entre preview y lectura | Revisión/hash cambia; se declara `IMPACT_CHANGED`/409 si se intenta confirmar |
| AC-12 | Ciclo `SinPlan` | No bloquea; muestra `Sin plan`; no inventa líneas |
| AC-13 | Plan con líneas inconsistentes, duplicadas o no verificables | `Bloqueado`; motivo; no se captura plan |
| AC-14 | E3.5/FIN_NETA no disponible | Precierre parcial con motivo; E4.9 queda bloqueado; no se presenta como completo |
| AC-15 | Consultar estado por `GET /api/cierres/:ciclo/estado` | Ruta canónica compartida con SPEC27; misma versión/estado; solo lectura |
| AC-16 | Ciclo con cierres posteriores ya existentes, coherentes o contradictorios; abrir precierre | Aviso `CIERRE_FUERA_DE_ORDEN`; sin contradicción no bloquea por sí solo; con contradicción financiera bloquea con `INCOHERENCIA_CON_CIERRE_POSTERIOR`; no escribe |
