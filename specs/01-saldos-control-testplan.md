# 01 — E1.1 Saldos: Test plan
Specification: [aprobada](01-saldos-control-specification.md)

| Acceptance ID | Preconditions and action | Expected result | Automated/manual method and command | Actual result / status | Run date / evidence |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Autenticado, alta ficticia con atributos válidos según reglas confirmadas y evidencia F1–F3; reiniciar y consultar | ID asignado persistente, misma ficha; no Movimiento de apertura | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-02 | Renombrar un Saldo | ID y relaciones intactos, nombre actualizado, revisión incrementada | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-03 | Intentar cambiar ID, duplicarlo o reutilizar desactivado; incluir dos altas concurrentes | Cambio/reutilización rechazados; altas concurrentes obtienen IDs distintos sin sobrescribir | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-04 | Desactivar Saldo sin bloqueo y consultar historia; intentar seleccionarlo de nuevo | Historia conserva ID, nuevas selecciones excluyen inactivo; importe no se reajusta | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-05 | Reactivar mismo Saldo y recargar | Mismo ID/apertura, vuelve a selección; sin hechos nuevos ni ciclo abierto | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-06 | Consultar/intentar editar/desactivar S000, con Q3 confirmado | Etiqueta técnica y operaciones ordinarias rechazadas, sin posición cero | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-07 | Cambiar solo Liquidez manteniendo Finalidad, Objetivo, Estado, bolsa y permiso | Solo cambia ese atributo; no se recalculan/infieren otros ni se muestra KPI incompleto | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-08 | Cambiar permiso Exterior sin tocar Liquidez | Independencia persistente; no se reescribe validez de hechos históricos | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-09 | Consultar control Terminal | Motivo de posición no aplicable; sin cero ni duplicación de compras | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-10 | Consultar No controlado y Exterior | Etiquetas diferenciadas e importe null, sin cero ficticio | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-11 | Revisar contrato conceptual Manual con fixture de valor y ausencia, sin asignar un Tipo/Manual no contrastado | Valor manual directamente o vacío/null si ausente, sin cero inventado ni fecha efectiva independiente; no habilitar pares no contrastados | Revisión contractual + fixtures; motores posteriores no implementados | PASA · fixture conceptual, Manual no operativo | 2026-10-21 · Bun `position(Manual, valor/ausencia)` + revisión F1/F3 |
| AC-12 | Consultar Movimientos/Inversiones en E1.1 | Fuente/configuración visibles; pendiente motor E1.4/E4, no posición calculada inventada | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-13 | Enviar Tipo/Control desconocidos, fechas irreales, precisión extra u overflow; distinguir de pares no contrastados | 422 específico sin escritura parcial ni redondeo silencioso; no declarar inválido un par solo por no figurar en la muestra | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-14 | Cambiar apertura/Control/Tipo que altere operaciones históricas en fixture; bloquear por impacto | 409 con Q3 confirmado, datos/relaciones originales intactos; no fingir protección de fuentes aún no entregadas | Bun integración API/SQLite: bun run test | PASA · guard de impacto con fixture | 2026-10-21 · Bun `apps/api/src/app.test.ts`; fuentes futuras aún no integradas |
| AC-15 | Dos clientes editan revisión idéntica | Uno guarda; otro recibe conflicto y conserva borrador, sin actualización perdida | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-16 | Forzar fallo de persistencia/auditoría en actualización | Rollback íntegro de datos/revisión/auditoría, error externo genérico | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-17 | Referencia fixture por Sxxx y renombrado/desactivación | FK válida e historia consultable, sin cascada/borrado; pruebas no crean módulos futuros | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-18 | Acceder API sin sesión, con desafío MFA parcial, expirada o revocada | Ninguna ruta financiera filtra datos o permite escritura; 401 | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-19 | Login correcto/incorrecto, replay TOTP, desafío vencido y límite de intentos | Solo flujo completo crea sesión; replay/abuso rechazados, no secretos en respuesta/log | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-20 | Cookie sesión + petición mutante sin CSRF/origen autorizado | Rechazo sin cambio; cookie inaccesible JS y flags por entorno; HTTP fuera de loopback rechazado | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-21 | Usar código recuperación dos veces y recuperar credenciales según Q4 | Primer uso único y reenrolado; segundo rechazado; sesiones previas revocadas | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-22 | Formularios/lista/ficha/error/vacío/carga a 390 y 1440 px, teclado | Sin overflow/recortes; foco/etiquetas accesibles, valores conservados y errores asociados; capturas inspeccionadas | Playwright + revisión visual: bun run test:e2e | PASA · alcance E1.1 | 2026-10-21 · Playwright `tests/e2e/catalog.spec.ts` + capturas inspeccionadas |
| AC-23 | Alta enviada con respuesta de red perdida; repetir la misma clave de idempotencia | Mismo ID y un registro; payload diferente con misma clave => conflicto | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-24 | Backup durante escrituras confirmadas con fixtures | Snapshot coherente confirmado, integrity/FK válidas, cifrado descifrable con clave externa; sin archivo incompleto publicado | Bun backup/restore y CLI age: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts`; age real y Playwright restauración aislada |
| AC-25 | Restaurar a instancia aislada y consultar vía API/UI | IDs/atributos/importes exactos coinciden con corte; acceso/MFA verificados y sesiones/códigos antiguos no resucitan | Bun backup/restore y CLI age: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts`; age real y Playwright restauración aislada |
| AC-26 | Simular disco lleno, backup interrumpido, clave incorrecta, snapshot inválido o viejo | Error visible, base original intacta, copias buenas conservadas; no declaración falsa de RPO/RTO | Bun backup/restore y CLI age: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts`; age real y Playwright restauración aislada |
| AC-27 | Revisar el catálogo de combinaciones utilizadas F1 en fixtures y su validación | Los seis pares figuran como utilizados; no se declara que sean matriz exhaustiva ni que otros pares sean inválidos; Manual no habilita pares nuevos | Revisión contractual + fixtures; motores posteriores no implementados | PASA · seis pares observados, no exhaustivos | 2026-10-21 · Bun `apps/api/src/app.test.ts`; revisión F1 y bloqueo de Manual |
| AC-28 | Alta/edición ficticia con Finalidad vacía y valores, Estado y tres switches independientes | Finalidad opcional, Estado Activa inicial; alta switches No/false sin inferencias, edición muestra guardado y PATCH omitido conserva; no cambia históricos ausentes | Playwright + revisión visual: bun run test:e2e | PASA · alcance E1.1 | 2026-10-21 · Playwright `tests/e2e/catalog.spec.ts` + capturas inspeccionadas |
| AC-29 | Guardar y recargar Saldo ficticio sin Objetivo, luego con importe EUR explícito | Objetivo es opcional y ausencia sigue null, no cero; céntimos exactos; sin reglas de signo inventadas | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-30 | Revisar contrato de Saldo actual con fixture de apertura 100, entrada anterior a Fecha apertura 20 y salida posterior 5 | Resultado de referencia 115: no excluir la entrada por Fecha apertura. Criterio de contrato para futuro motor E1.4; no motor implementado ni nueva pantalla E1.1 | Revisión contractual + fixtures; motores posteriores no implementados | CONTRATO REVISADO · no motor implementado | 2026-10-21 · Revisión especificación aprobada/brainstorming M1-M2; notas de contratos abajo |
| AC-31 | Revisar contrato histórico con un periodo inequívocamente anterior a Fecha apertura | No mostrar posición anterior; no borrar ni filtrar los Movimientos de Saldo actual. Límite mensual exacto/fecha ausente quedan sin suposición para la entrega del histórico | Revisión contractual + fixtures; motores posteriores no implementados | CONTRATO REVISADO · no motor implementado | 2026-10-21 · Revisión especificación aprobada/brainstorming M1-M2; notas de contratos abajo |
| AC-32 | Revisar matriz, validaciones y futura nulabilidad contra M1/M2 | O-A, NA-A, DEF-A y SW-A identificados como contrato aprobado de aplicación; separados de evidencia Excel y observaciones; sin preguntas M1/M2 pendientes ni restricciones por inferencia | Revisión contractual + fixtures; motores posteriores no implementados | CONTRATO REVISADO · no motor implementado | 2026-10-21 · Revisión especificación aprobada/brainstorming M1-M2; notas de contratos abajo |
| AC-33 | En cada uno de los cinco pares ordinarios, alta ficticia omitiendo Fecha apertura/Saldo apertura, luego solo uno y luego ambos con apertura cero explícito o negativa | Altas válidas según M1 con datos restantes válidos; campos independientes, ausencias preservadas y cero/negativo conservados exactamente; sin Movimiento/filtro por fecha creado | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-34 | Consultar S000 y conservar fixture de información existente no usada por su motor; intentar editarlo como Saldo ordinario | Aperturas no aplicables al contrato de S000 y edición bloqueada; no borrar/rechazar información existente por no tener función ni asignar defaults de alta al registro técnico | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-35 | Alta omitiendo cada indicador o todos; repetir con true/false y con null/valor inválido; PATCH omitiendo indicador | POST omitido persiste false explícito; true/false se conservan, null/valor inválido rechaza sin coerción/escritura parcial. PATCH omitido conserva false/true/ausencia histórica; Estado Activa solo por default de alta | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` |
| AC-36 | Revisar fuente/fecha de aprobación visual y estado de implementación | Dirección común y tres pantallas aprobadas por comunicación del usuario el 2026-10-21, separadas de futuras pruebas visuales; no implica aprobación final de PR ni permiso de código | Playwright + revisión visual: bun run test:e2e | CONTRATO REVISADO · no motor implementado | 2026-10-21 · Aprobación comunicada del usuario, PR #6/ebfe75b; evidencia nueva independiente |
| AC-37 | En futura UI, recorrer listado, ficha y alta/edición a 390 y 1440 px | Menú lateral escritorio/navegación móvil accesibles, tabla/tarjetas compactas, ID visible/inmutable y edición en página propia; misma información/acciones disponibles | Playwright + revisión visual: bun run test:e2e | PASA · alcance E1.1 | 2026-10-21 · Playwright `tests/e2e/catalog.spec.ts` + capturas inspeccionadas |
| AC-38 | Revisar cabecera sin maestro disponible y después con fuente de Ciclos entregada, incluyendo carga/error/vacío | Sin fuente: No disponible, sin datos inventados. Con fuente: ciclo del maestro único; estado temporal y cierre financiero separados, sin inferencia desde reloj/Nómina o Fin temporal | Playwright estado sin fuente E1.1; integración maestro posterior no entregada | PASA sin maestro · integración futura pendiente | 2026-10-21 · Playwright cabecera No disponible; no se prueba Ciclos/cierre |
| AC-39 | Recorrer formulario futuro y sus errores, modificando tres Sí/No independientemente | Tres bloques aprobados, Estado inicial Activa, opcionalidad M1/M2 y switches No/false iniciales solo en alta; edición conserva guardado e independencia. Sin Manual operativo ni pares no contrastados | Playwright + revisión visual: bun run test:e2e | PASA · alcance E1.1 | 2026-10-21 · Playwright `tests/e2e/catalog.spec.ts` + capturas inspeccionadas |
| AC-40 | Revisar evidencia antes de declarar diseño implementado/validado | Capturas nuevas 390/1440 inspeccionadas y pruebas de teclado/foco/etiquetas/contraste/estados; ni aprobación textual, ASCII ni screenshots del bootstrap sustituyen la comprobación futura | Playwright + revisión visual: bun run test:e2e | PASA · alcance E1.1 | 2026-10-21 · Playwright `tests/e2e/catalog.spec.ts` + capturas inspeccionadas |
| AC-41 | Fixture histórico ficticio con indicador ausente frente a false/true; consultar, cancelar edición y guardar cambio de otro campo | Ausencia sigue distinguible («Sin informar»/null), nunca No/false silencioso; PATCH omitido no la rellena. Informar booleano requiere elección real y solo cambia ese atributo; sin importar datos reales | Bun integración API/SQLite: bun run test | PASA · alcance E1.1 | 2026-10-21 · Bun `apps/api/src/app.test.ts` + Playwright ausencia/cancelación/PATCH/Informar No |
| AC-42 | En futura UI a 390/1440, inspeccionar y operar cada switch con teclado y foco | true: #8DBB2E/indicador blanco/Sí; false: verde suave de paleta/indicador blanco/No; nombre del atributo accesible, checked binario y etiqueta visible, independencia, sin controles segmentados ni interacción obligatoria al alta | Playwright + revisión visual: bun run test:e2e | PASA · alcance E1.1 | 2026-10-21 · Playwright `tests/e2e/catalog.spec.ts` + capturas inspeccionadas |
| AC-43 | Revisar futura UI con preferencia de sistema clara y oscura | Siempre tema claro de fondos blancos/verdes suaves; sin modo/selector oscuro. No se declara contraste/accesibilidad verificados sin pruebas reales | Playwright + revisión visual: bun run test:e2e | PASA · alcance E1.1 | 2026-10-21 · Playwright `tests/e2e/catalog.spec.ts` + capturas inspeccionadas |

## Regression checks
Ejecución local 2026-10-21 (Europe/Madrid), Bun 1.4.3, Chromium del sistema:
- `bun install --frozen-lockfile`, `bun run typecheck`, `bun run build`: pasan.
- `bun run test`: 15 pruebas, 195 aserciones, 0 fallos.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e`:
  recorrido real completo, ambos viewports, 0 fallos; sin errores JS.
- `validate-template`, `check-project`, `test-validator` (18), `test-checks` (22): pasan.
- `bun audit --json`: `{}` sin advisories reportados; alcance del registro consultado,
  no auditoría completa. OTPAuth 9.5.2 MIT y compatibility Bun probada con MFA real.
- `git diff --check`, revisión manual de historia/índice y `check-repository`: pasan antes de push; sin hallazgos detectados.
- CI de rama/PR se consulta por SHA en GitHub; la evidencia remota y artifacts se enlazan
  en la PR funcional. No confundirla con main/baseline.

## Functional verification
Persistencia tras reabrir; IDs/atributos exactos, cinco pares ordinarios con apertura
independiente/negativa/cero/ausente, int64, objetivos opcionales sin restricciones de signo.
Dos procesos reservan veinte IDs sin duplicar; revisión entre conexiones, idempotencia,
FK ficticia, guard de impacto y rollback tras fallo de auditoría.
API real protegida y pruebas de TOTP/replay/desafío/recuperación/tiempos/CSRF/origen.
Cookie HttpOnly y hash de token, no acceso con enrolado parcial. Backup age auténtico,
WAL con escritor concurrente, hash/integridad/FK/esquema, destinatario/identidad incorrectos,
antigüedad, copia corrupta y fallo ENOSPC **simulado en herramienta**, no agotamiento real
del disco del host. Original/copia buena conservados y temporales limpiados al fallar.
Snapshot restaurado leído por API y UI de otra instancia con contraseña/TOTP reales;
revocación de sesiones/códigos y generación de nuevos códigos comprobadas.
Ensayo local medido: restauración + MFA + lectura UI 2.006 s en una ejecución; no SLA/RTO
de producción. RPO depende de frecuencia/monitorización aún no desplegadas.

### Contratos expresamente separados de motores
- AC-30: referencia 100 + entrada anterior 20 − salida posterior 5 = 115; revisión
  documental confirma NO filtrar Movimientos por Fecha apertura. E1.4 no implementado.
- AC-31: periodo inequívocamente anterior a apertura no presenta posición histórica;
  límite mensual/fecha ausente siguen sin inferirse. Histórico no implementado.
- AC-11: fixture de presentación Manual valor directo/null; ningún par Manual habilitado.
- AC-32: M1/M2 son contrato aprobado de aplicación, no evidencia de obligatoriedad física.
- AC-36: aprobación visual STEP 5 no era prueba de aplicación ni aprobación de esta PR.
- AC-38: cabecera sin fuente No disponible probada; integración Ciclos/estado temporal/
  cierre financiero posteriores no probados. No se simula un maestro para declararlos hechos.

## Browser verification (web only)
Playwright opera login inicial/TOTP y guardado de códigos, alta/consulta/edición,
switches por teclado, menú móvil, revisión concurrente con borrador conservado,
desactivar/reactivar, filtros, estados transitorios, reintento y S000 protegido.
Fixture histórico con null se abre/cancela/guarda sin rellenar; Informar No exige acción
expresa. No permite cambios silenciosos a false. Solo datos ficticios y ninguna captura
de token, secreto, contraseña, OTP o códigos de recuperación.

Capturas nuevas en `artifacts/e1-1` (ignoradas; CI artifact e1-1-screenshots, 7 días):
| Pantalla/estado | 1440px | 390px |
| --- | --- | --- |
| Listado | list-desktop.png | list-mobile.png |
| Ficha | detail-desktop.png | detail-mobile.png |
| Formulario | form-desktop.png | form-mobile.png |
| Carga | loading-desktop.png | loading-mobile.png |
| Vacío | empty-desktop.png | empty-mobile.png |
| Error | error-desktop.png | error-mobile.png |
| Complementarias | conflict-desktop.png | validation-mobile.png, absence-mobile.png, restored-mobile.png |

Inspección real: densidad, jerarquía, legibilidad, tres bloques, aperturas, ID y atributos
separados; tabla y tarjetas sin overflow. Teclado/foco/nombres accesibles y tema claro
con preferencia dark probados. Ratio de pares de texto utilizados: texto/blanco 14.16,
auxiliar/blanco 6.63, auxiliar/fondo 6.03, acción/verde 6.04, switch off 9.76.
Medición de esos pares no certifica WCAG ni sustituye ensayo con lector de pantalla.
La fecha input nativa puede presentarse según locale del navegador; valor civil almacenado
ISO se comprueba sin interpretar el formato visual del control nativo.

## Visual improvements (visual apps only)
Cinco mejoras identificadas y aplicadas durante inspección; recorrido/capturas repetidos:
1. Checkbox técnico en línea horizontal: corrigió herencia flex-column del label general.
2. Nombres accesibles estables: errores/ayudas/opciones no cambian nombre de inputs/selects.
3. Foco en cambio de página/menú y aviso de error; borrador no desaparece en conflicto; avisos de éxito caducan al navegar y error no permanece Consultando.
4. Ausencia histórica con Sin informar + Informar No explícito, sin switch off engañoso.
5. Skip-link oculto por opacity fuera de foco: evita artefacto al capturar página completa
   tras scroll; sigue accesible por teclado y enfoca main. Confirmación por navegador.

## Limitations and next action
Aceptación **del alcance E1.1**, no de motores futuros. Fuente de historia no existe;
guard y FK probados con fixtures, deberán integrarse al implementar operaciones.
Sin Manual operativo, cálculos, módulos E1.2, importador ni datos reales. Cabecera Ciclos
No disponible. Sin deploy/HTTPS real, copia externa, scheduler/poda ni custodia definitiva.
Pruebas locales ejecutadas, sin bloqueo de Codex: Chromium del sistema y age oficial
verificado disponibles. Revisión final de PR por Álex/usuario, sin merge autorizado.

## Revisión posterior de Álex sobre ce7a92c — 2026-10-21
Contraste: excepción de texto oscuro documentada en guía UI (6.04:1 frente a blanco
2.26:1), sin cambiar CSS/diseño. Aserción Playwright del color real del botón añadida.
Se detectó semilla incondicional por entorno: ahora openDatabase solo admite
NODE_ENV=development/test y bloquea antes de crear directorios o abrir cualquier base.
Prueba de subprocesses cubre development/test (semilla idempotente), producción/entorno
ausente/desconocido (sin archivos) y bases existentes intactas ante rechazo. También verifica que bun run setup respeta
NODE_ENV=production y no crea base ni clave.
Baseline ce7a92c: 14 Bun/173 aserciones; revisión: 15 Bun/195 aserciones pasan.
Antes de datos reales: inicialización limpia sin fixtures y migración autorizada,
todavía no implementadas. Copias externas, automatización y configuración productiva
siguen pendientes. Sin nuevas dependencias/infraestructura, E1.2, STEP 8 ni merge.

## Cierre aprobado de entrega
PR #7 aprobada expresamente por el usuario tras revisión de Álex sobre 4f7cdda el
2026-10-21; E1.1 implementado e integrado con cierre documental. Los registros anteriores
de espera/sin merge son históricos. La aprobación no completa motores financieros:
AC-30/31 siguen contractuales y la integración futura de AC-38 sigue pendiente.
STEP 8, E1.2 y despliegues no iniciados; Excel v5.11 continúa fuente de verdad.
