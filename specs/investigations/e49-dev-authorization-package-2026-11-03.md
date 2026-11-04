# E4.9 — paquete breve para autorización de DEV

**Base:** `main` `dd56553` (2026-11-04). **Documento de decisión; no autoriza DEV, no declara PASS.**
Marcas: **CONFIRMADO** (estado verificado), **PROPUESTA** (candidato no aprobado), **PENDIENTE** (requiere decisión).

## 1. Estado y límites

- **CONFIRMADO:** SPEC27/E4.9 aprobada documentalmente; **sin DEV** y con AC **UNRUN**. E4.8 precierre, E3.5/FIN_NETA, E4.2 Ventas, E4.4 Deuda completa y E3.6 Pendientes están integrados; **E4.3 A+B+C está integrado** (v24 en `main`) y su QA final espera revisión/merge.
- **CONFIRMADO:** PR **#178 integrada** (`8b5cf5c`): wireframes 1440/390 de E4.9 disponibles. Es un insumo de diseño, no una autorización de desarrollo ni una aprobación visual independiente.
- **CONFIRMADO:** esquema **v24 integrado** con E4.3. **v25 preferida para E4.9** (**PENDIENTE** de asignación formal); no se reserva sin decisión.
- **CONFIRMADO:** **DT6/T-BKP abierto**. Bloquea el cierre real y AC-09 real; no bloquea el DEV con fixtures.
- **Límite:** este documento solo fija el paquete de decisión. No implementa, no migra, no ejecuta datos reales, no publica ni fusiona.

## 2. Matriz T1/T2/T3

| Nivel | Escrituras | Comportamiento |
|---|---|---|
| **T1** | Movimientos (alta, rectificación, anulación, cambio de fecha); S0/ventana de Ciclos; Compras E4.1 (alta, rectificación, anulación, cambio de fecha); **Ventas E4.2 (alta, rectificación, anulación, cambio de fecha)** | **409 `HISTORY_LOCKED`**, sin escritura ni foto. Comprobar fecha antigua y nueva |
| **T2** | Clasificación, Referencias, participantes/reparto, Anticipos, Compartidos, Deuda, Presupuestos, plan vivo, Revisión Comida, Instrumentos, atributos de Saldo que afectan métricas; **E4.4 por entidad real/conciliaciones** | Impacto + motivo + auditoría; foto intacta; vistas vivas actualizadas o marcadas |
| **T3** | Nombres, notas, evidencias y etiquetas no usadas en cálculos | Permitido; la foto conserva ID + versión del nombre |

**CONFIRMADO:** base T1/T2/T3 aprobada en SPEC27. **PROPUESTA:** incorporar expresamente **Ventas E4.2** a T1 y **E4.4** a T2 por entidad real. Sin Ventas en T1, una venta en ventana cerrada alteraría posiciones/efectivo ya capturados; es una ampliación de alcance que debe aprobarse, no inferirse.

## 3. D4 estricto

**PROPUESTA D4-E (estricta), PENDIENTE de confirmación:** E4.9 exige que E3.5/FIN_NETA sea **verificable con cobertura suficiente**. Si E3.5 devuelve `Parcial`, `No disponible`, fuente ilegible o `bloqueo.verificable=false`, el cierre queda **`Bloqueado` y no se emite foto**. No se captura Comida como `0` ni como total parcial.

**CONFIRMADO:** hoy `precierre` puede devolver `Listo con avisos` con `e4_9Bloqueado=true`; la contradicción debe resolverse antes del DEV. La alternativa literal —bloquear solo con `No disponible` y capturar `Parcial` con motivo— queda **PENDIENTE** y no se presupone.

## 4. Contenido de la foto v1

**CONFIRMADO (contrato DT4):** identidad (ciclo, versión de foto, UTC, actor, motivo, fingerprint, versión de app y esquema); ventana/S0; hechos; plan; clasificación/Referencias con ID y versión de nombre; E4.1 con posiciones/efectivo a Fin; auxiliares si hay hechos; cobertura por total; backup referenciado; `No disponible` motivado.

**PROPUESTA de precisión:**
- **E4.2:** incluir el efecto de Ventas en efectivo/posiciones y, si se aprueba DT4, la identidad de las operaciones; no marcar E4.2 como `No disponible`.
- **E4.4:** capturar Deuda E1.6 y, según cobertura, conciliaciones E4.4; si no se amplía DT4, declararlas fuera del contrato v1 con motivo.
- **E4.3:** `No disponible` con motivo; nunca `0` ni patrimonio inventado.
- **E4.8:** no es una magnitud; registrar su revisión y bloqueos en auditoría, no como total.

## 5. Versionado, AC-20/T2 y MFA

- **PROPUESTA:** **v24 E4.3 → v25 E4.9**. Una sola migración por versión; `database-schema`, `database-identity`, `schema-contract` y `backup` deben actualizarse juntos. **PENDIENTE:** asignación formal.
- **PROPUESTA:** versión de aplicación **reproducible** (por ejemplo `APP_VERSION`/versión de paquete registrada en la foto); no usar un valor manual no trazable. **PENDIENTE:** fuente exacta.
- **AC-20:** comparar al corte congelado de cada foto posterior, incluidas operaciones legítimas ≤ Fin. **Riesgo:** una escritura T2 posterior puede producir un falso `INCOHERENCIA_CON_CIERRE_POSTERIOR`; debe probarse AC-20 + T2. **PENDIENTE:** aceptar el algoritmo.
- **MFA:** el cierre exige sesión MFA completa, Origin y CSRF; sesión expirada conserva contexto y exige reautenticación. **PENDIENTE:** si basta el login+MFA existente o se exige step-up específico.

## 6. DT6: fixtures vs cierre real

- **CONFIRMADO:** el DEV con fixtures no queda bloqueado por DT6; el cierre real sí.
- **DEV:** AC-09 se marca `PASS (fixtures)` y `BLOQUEADO (real)`. No se usan backups/restauraciones reales, scheduler, poda, almacenamiento externo ni secretos. Un doble de prueba de backup no acredita DT6.
- **Cierre real:** exige destino externo, segunda copia, custodia de identidad `age`, snapshot cifrado, manifiesto/checksum, llegada verificada, restore en Linux x86_64 aislado, revocación de sesiones/desafíos/códigos/intentos, carpeta privada de evidencias y calendario RPO/RTO. Sin ello no hay AC-09 real ni cierre real.

## 7. Decisiones necesarias (bloque único)

1. **D4:** ¿estricto (E3.5 `Parcial` bloquea) o literal (solo `No disponible` bloquea)?
2. **T1 Ventas:** ¿se incorpora E4.2 a T1 con alta/rectificación/anulación/cambio de fecha?
3. **Orden v24/v25:** ¿v24 E4.3 y v25 E4.9, con asignación formal?
4. **Versión de app:** fuente reproducible para la foto.
5. **UI:** ¿wireframes #178 se consideran aprobados para implementar, o UI provisional con revisión visual diferida?
6. **AC-20:** aceptar el algoritmo de coherencia y su interacción con T2.
7. **DT4:** ¿la foto v1 incluye identidad de Ventas y conciliaciones E4.4, o se declaran fuera de contrato?
8. **Reautenticación:** ¿basta la sesión MFA existente o se exige step-up?

## 8. Texto exacto propuesto para la autorización futura

> **PROPUESTA — NO APROBADA. No autoriza nada por sí misma.**
>
> **Autorización DEV E4.9 / SPEC27 — solo fixtures**
>
> Autorizo, el `<fecha>`, sobre `main` `<SHA>` y SPEC27 aprobada, un DEV local de E4.9 limitado a: (A) esquema de cierre/foto/auditoría/intentos en la versión asignada, proveedor único de estado y locks T1/T2/T3, incluida **Ventas E4.2** en T1 si se confirma; (B) preflight, transacción única, fingerprint, foto v1 inmutable, idempotencia, concurrencia/409, rollback, doble cierre, cierre fuera de orden y `Sin hechos`; (C) proveedor y consumidores, con Anticipos/AC36 solo mediante proveedor real y prueba de integración; (D) UI solo con wireframes aprobados o aceptación expresa de UI provisional.
>
> **Datos:** exclusivamente fixtures sintéticas. Prohibido usar datos reales, Excel, bases de producción, VPS o entornos compartidos con datos reales.
>
> **Cierre real:** no autorizado. AC-09 y backup se registran como `PASS (fixtures)` y `BLOQUEADO (real)`. El cierre real requiere autorización separada y evidencia DT6/T-BKP.
>
> **Fuera de alcance:** merge, reapertura E4.10, fotos E4.11, E4.3, reimplementar E3.5 o E4.8, despliegue, cambios de visibilidad o permisos. Rama y commits locales sí; publicación/PR conforme a la política vigente; **sin merge**.
>
> **Condiciones de entrada:** D4 resuelto; versión de esquema asignada; T1 Ventas decidido; versión de app definida; UI decidida; AC-20/T2 definido.
>
> **Evidencia:** pruebas API/E2E, snapshots SQL, hashes de foto, auditoría, 401/403/405/409, `typecheck`, `build` y verificación canónica; QA independiente. El ejecutor no declara PASS por sí mismo.
>
> **Parada:** si falta una condición, si se piden datos reales/merge/despliegue, si se intenta tocar E4.3 o DT6, o si se amplía DT4 sin decisión.
