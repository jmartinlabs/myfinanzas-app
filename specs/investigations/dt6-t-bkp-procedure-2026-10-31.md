# DT6/T-BKP — Procedimiento propuesto de backup, custodia y restore

Fecha: 2026-10-31. Autor: orquestador OpenCode. Estado: **propuesta documental
alineada con los criterios del mensaje 0046**. No ejecuta backups, no toca datos
reales, no compra hardware y no cierra DT6/T-BKP. No es autorización de DEV ni de
uso de datos reales.

Contexto: [encargo DT6/T-BKP](../backlog/dt6-t-bkp-encargo.md),
[security](../guidelines/security.md), [architecture](../guidelines/architecture.md),
[SPEC27](../27-e49-cierre-financiero-specification.md).

## 1. Objetivo y límites

Objetivo: exportar una copia cifrada, custodiarla en un destino físico elegido por el
usuario y restaurarla en un entorno aislado con evidencia verificable.

Fuera de alcance:

- comprar discos, contratar almacenamiento o servicios externos;
- introducir un backend, scheduler, poda automática o monitorización sin autorización;
- restaurar sobre la base en servicio o hacer downgrade destructivo;
- usar datos reales en CI, GitHub Actions o este repositorio;
- exportar datos reales, activar el régimen o cerrar DT6/T-BKP, E4.9 o FIN_NETA.

## 2. Mecanismos existentes

- **Snapshot:** `VACUUM INTO` sobre una conexión CLI dedicada; no hay endpoint de copia.
- **Cifrado:** `age` con destinatario público; paquete `database.age` y `access-key.age`.
- **Manifiesto:** formato, app, esquema, origen, id, instante y SHA-256 del snapshot.
- **Publicación:** directorio nuevo por rename, tras cifrado y fsync; nunca reemplaza
  una copia existente.
- **Restore:** destino nuevo, verificación de manifiesto/checksum/esquema/clave,
  revocación de sesiones, desafíos, códigos e intentos, y apertura aislada.
- **CLI:** `bun run backup create` y `bun run backup restore`.

## 3. Procedimiento propuesto

### 3.1 Preflight

1. Confirmar que el destino físico está conectado, tiene espacio suficiente y es una
   ruta privada **fuera del VPS**.
2. Preferir **dos copias independientes en dos discos existentes**, si es factible, con
   al menos una copia externa real. Identificadores de disco, rutas y frecuencia de
   traslado quedan pendientes; no se inventan.
3. Confirmar que la identidad `age` está disponible y custodiada **fuera del VPS y de
   Git**, con copia de recuperación protegida y separada de los backups. Sin identidad
   no hay restauración.
4. Preferir el **snapshot cifrado en caliente** con el mecanismo SQLite coherente
   existente. No detener la API por defecto; una ventana fría solo si se justifica y se
   documenta.
5. Registrar fecha, operador, versión de app/esquema y una referencia no sensible del
   destino. No registrar importes, nombres, rutas sensibles ni datos personales.

### 3.2 Exportación

```text
bun run backup create <DESTINO_NUEVO> <DESTINATARIO_AGE>
```

- `<DESTINO_NUEVO>` no debe existir y debe estar fuera del VPS.
- El comando usa `DATABASE_PATH` y `AUTH_KEY_PATH` del entorno; no se copian a Git.
- El resultado debe contener `database.age` y `access-key.age`.
- La copia queda cifrada; el snapshot temporal se elimina y el directorio se publica
  por rename.

### 3.3 Verificación de integridad

En un entorno aislado y sin volcar datos a disco:

1. Leer el manifiesto cifrado y comprobar `app`, `schema`, `origin`, `created` y
   `sha256`.
2. Verificar que el SHA-256 del `database` decodificado coincide con el manifiesto.
3. Confirmar que la identidad `age` descifra ambos archivos y que la clave de
   aplicación tiene 32 bytes.
4. Confirmar que no hay archivos temporales, texto plano ni claves dentro del destino
   de copias.

No pegar el manifiesto completo, rutas sensibles ni el contenido descifrado en issues,
PRs, logs o documentación pública.

### 3.4 Custodia

- Mantener la identidad `age` **fuera del VPS, fuera del disco de copias y fuera de
  Git**. La copia de recuperación debe estar protegida y separada de los backups.
- Documentar **cómo acceder en emergencia**, nunca el secreto ni la clave.
- Guardar al menos una segunda copia física en un lugar distinto; mismo equipo no
  cubre pérdida del disco ni robo. Preferencia por dos discos existentes; sin compras.
- El destino debe estar cifrado a nivel de volumen; el cifrado `age` protege el
  paquete, pero no metadatos ni temporales de la máquina.
- Custodia y rotación de la identidad: decisión del usuario. No se inventa un segundo
  custodio ni se publica la clave.
- Retención objetivo: 7 diarias, 4 semanales y 3 mensuales. La poda es manual al
  inicio, reversible y documentada; se automatiza solo cuando el procedimiento, la
  rotación y la recuperación sean estables y estén autorizados.
- Objetivos aceptados: **RPO 24 h / RTO 2 h**. Una copia exportada solo semanalmente
  **no cumple RPO 24 h**. No se declaran RPO/RTO demostrados hasta ejecutar el
  calendario y el ensayo reales.

### 3.5 Ensayo de restauración

1. Elegir un equipo **Linux x86_64 aislado**, si está disponible, y una ruta nueva; no
   usar la base en servicio. La disponibilidad física sigue pendiente de confirmar.
2. Ejecutar:

```text
bun run backup restore <COPIA> <DESTINO_NUEVO> <IDENTIDAD_AGE>
```

3. Arrancar la app restaurada en loopback y autenticar con contraseña y TOTP.
4. Comprobar identidad, esquema, conteos, **permisos y acceso** y una muestra funcional
   acordada; no publicar importes ni datos personales.
5. Confirmar que sesiones, desafíos, códigos e intentos previos no resucitan.
6. Registrar duración y resultado, y destruir o conservar el ensayo según la política
   que se acuerde.

GitHub Actions solo se usa con **fixtures sintéticos**; nunca con datos financieros
privados.

### 3.6 Evidencia del gate

Guardar el registro en una **carpeta privada fuera de Git**, sin claves, secretos,
datos personales ni rutas sensibles públicas.

| Evidencia | Contenido mínimo |
| --- | --- |
| Manifiesto | app, esquema, origen, instante, id y SHA-256 |
| Checksum | SHA-256 del snapshot coincide con el manifiesto |
| Clave | Identidad age disponible y clave de app de 32 bytes |
| Restore | Directorio nuevo, ejecución correcta y sin destino parcial |
| Datos | Conteos/muestra funcional acordada, sin datos personales publicados |
| Accesos | Sesiones, desafíos, códigos e intentos revocados |
| Entorno | Equipo aislado, fecha, operador, versión y duración |
| Custodia | Referencia no sensible de copia, destino físico y segunda copia |
| Acciones | Incidencias, resultado y acciones correctivas |

## 4. Runner x86_64 y plataforma

- GitHub Actions `ubuntu-24.04` es Linux x86_64 y ya se usa en `Validate project` y
  `Rootless infrastructure`. Sirve para ensayos **sintéticos** de restore.
- **No** sirve para el ensayo DT6 con datos reales: el backup real no debe subirse a
  GitHub ni a un runner compartido.
- El ensayo real debe hacerse en un equipo **Linux x86_64 aislado y autorizado**, o en
  hardware existente del usuario si su arquitectura y sistema lo permiten. El Mac
  actual es arm64 y no acredita el comportamiento Linux/x86_64.
- La disponibilidad de equipo físico x86_64 **sigue por confirmar**.
- Sin compras ni infraestructura nueva. Si no hay equipo x86_64 disponible, el gate
  DT6 real sigue bloqueado; el ensayo sintético de CI no lo sustituye.

## 5. Estado de los criterios

| Criterio | Propuesta | Confirmación pendiente | Comprobación ejecutada |
| --- | --- | --- | --- |
| Destino | Discos existentes, ruta privada fuera del VPS; preferir dos copias | IDs de disco, rutas, capacidad y frecuencia | Ninguna |
| Identidad age | Fuera del VPS y Git; recuperación separada y protegida | Ubicación, custodio y rotación | Ninguna |
| Modo | Snapshot en caliente; sin apagado por defecto | Validación técnica en el entorno real | Solo fixtures sintéticos |
| Ensayo | Linux x86_64 aislado; permisos y acceso | Equipo disponible y fecha | Solo RESTORE-19/20 sintético |
| Poda | Manual, reversible y documentada | Inicio y responsable | Ninguna |
| Retención | 7 diarias / 4 semanales / 3 mensuales | Fecha efectiva, capacidad y calendario | Ninguna |
| Evidencias | Carpeta privada fuera de Git | Ruta y formato | Ninguna |

## 6. Preguntas materiales y checklist de aceptación

Preguntas que requieren confirmación humana:

1. ¿Qué discos existentes se usan y cuál es la ruta privada fuera del VPS?
2. ¿Habrá dos copias independientes? ¿Dónde se guarda la segunda?
3. ¿Dónde y cómo se custodia la identidad `age` y su copia de recuperación?
4. ¿Qué equipo Linux x86_64 aislado está disponible para el ensayo?
5. ¿Cuándo empieza la retención 7/4/3 y qué capacidad hay?
6. ¿Quién ejecuta la poda manual y dónde se registra?
7. ¿Dónde está la carpeta privada de evidencias fuera de Git?

Checklist de aceptación del gate:

- manifiesto y checksum verificados;
- versión de app/esquema correcta;
- clave de aplicación e identidad `age` disponibles;
- restore en directorio nuevo y sin destino parcial;
- permisos y acceso correctos;
- sesiones, desafíos, códigos e intentos revocados;
- evidencia registrada sin datos personales ni secretos;
- calendario real coherente con RPO 24 h;
- ninguna copia real en Git, CI o runner compartido.

## 7. Riesgos y límites

- Un backup cifrado sin identidad custodiada no es recuperable.
- Una copia en el mismo disco no cubre fallo de hardware, robo o ransomware.
- El snapshot WAL es consistente; una ventana fría solo se usa si se justifica.
- Una copia solo semanal no cumple RPO 24 h; no se declara RPO/RTO demostrado.
- El restore real con datos reales requiere autorización específica y un entorno
  aislado; no se ejecuta en CI.
- Este procedimiento no cierra DT6/T-BKP, no sustituye el gate rootless y no
  desbloquea E4.9.

## 8. Trazabilidad y siguiente paso

- Criterios incorporados del mensaje **0046** de Álex, sin convertirlos en hechos
  físicos confirmados.
- El mensaje **0045** sigue sin acuse `read_by`; **0046 no autoriza el merge de #148**
  ni de esta PR documental.
- RESTORE-19/20 acredita restore técnico con fixtures; **no** demuestra custodia
  externa ni simulacro físico.
- Siguiente paso: confirmar las preguntas del apartado 6. Solo después se podrá
  ejecutar un ensayo real autorizado y registrar la evidencia del gate.
