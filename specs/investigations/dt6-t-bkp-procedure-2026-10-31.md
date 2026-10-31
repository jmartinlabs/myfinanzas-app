# DT6/T-BKP — Procedimiento propuesto de backup, custodia y restore

Fecha: 2026-10-31. Autor: orquestador OpenCode. Estado: **propuesta documental**.
No ejecuta backups, no toca datos reales, no compra hardware y no cierra DT6/T-BKP.
Las decisiones de destino, custodia y ensayo real siguen pendientes del usuario.

Contexto: [encargo DT6/T-BKP](../backlog/dt6-t-bkp-encargo.md),
[security](../guidelines/security.md), [architecture](../guidelines/architecture.md),
[SPEC27](../27-e49-cierre-financiero-specification.md).

## 1. Objetivo y límites

Objetivo: exportar una copia cifrada, custodiarla en un destino físico elegido por el
usuario y restaurarla en un entorno aislado con evidencia verificable.

Fuera de alcance:

- comprar discos, contratar almacenamiento o servicios externos;
- automatizar scheduler, poda o monitorización sin autorización de DEV;
- restaurar sobre la base en servicio o hacer downgrade destructivo;
- usar datos reales en CI, GitHub Actions o este repositorio;
- cerrar DT6/T-BKP, E4.9 o FIN_NETA por esta propuesta.

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

1. Confirmar que el destino físico está conectado y tiene espacio suficiente.
2. Confirmar que la identidad `age` está disponible y custodiada fuera del destino de
   copias. Sin identidad no hay restauración.
3. Elegir una ventana sin escrituras o aceptar explícitamente el snapshot WAL. Para el
   primer ensayo se recomienda detener la API y usar una ventana fría.
4. Registrar fecha, operador, versión de app/esquema y destino. No registrar importes,
   nombres ni datos personales.

### 3.2 Exportación

```text
bun run backup create <DESTINO_NUEVO> <DESTINATARIO_AGE>
```

- `<DESTINO_NUEVO>` no debe existir.
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

No pegar el manifiesto completo ni el contenido descifrado en issues, PRs o logs.

### 3.4 Custodia

- Mantener la identidad `age` **fuera** del disco de copias y fuera del repositorio.
- Guardar al menos una segunda copia física en un lugar distinto; mismo equipo no
  cubre pérdida del disco ni robo.
- El destino debe estar cifrado a nivel de volumen; el cifrado `age` protege el
  paquete, pero no metadatos ni temporales de la máquina.
- Custodia y rotación de la identidad: decisión del usuario. No se inventa un segundo
  custodio ni se publica la clave.
- Retención objetivo: 7 diarias, 4 semanales y 3 mensuales. La poda es manual hasta
  que exista autorización de automatización.
- Objetivos aceptados: **RPO 24 h / RTO 2 h**. El procedimiento debe poder ejecutarse
  dentro de esa ventana; si no, se registra la limitación.

### 3.5 Ensayo de restauración

1. Elegir un equipo aislado y una ruta nueva; no usar la base en servicio.
2. Ejecutar:

```text
bun run backup restore <COPIA> <DESTINO_NUEVO> <IDENTIDAD_AGE>
```

3. Arrancar la app restaurada en loopback y autenticar con contraseña y TOTP.
4. Comprobar identidad, esquema, conteos y una muestra funcional acordada; no publicar
   importes ni datos personales.
5. Confirmar que sesiones, desafíos, códigos e intentos previos no resucitan.
6. Registrar el resultado y destruir o conservar el ensayo según la política que se
   acuerde.

### 3.6 Evidencia del gate

| Evidencia | Contenido mínimo |
| --- | --- |
| Manifiesto | app, esquema, origen, instante, id y SHA-256 |
| Checksum | SHA-256 del snapshot coincide con el manifiesto |
| Clave | Identidad age disponible y clave de app de 32 bytes |
| Restore | Directorio nuevo, ejecución correcta y sin destino parcial |
| Datos | Conteos/muestra funcional acordada, sin datos personales publicados |
| Accesos | Sesiones, desafíos, códigos e intentos revocados |
| Entorno | Equipo aislado, fecha, operador y versión |
| Custodia | Destino físico y segunda copia identificados sin publicar secretos |

## 4. Runner x86_64 y plataforma

- GitHub Actions `ubuntu-24.04` es Linux x86_64 y ya se usa en `Validate project` y
  `Rootless infrastructure`. Sirve para ensayos **sintéticos** de restore.
- **No** sirve para el ensayo DT6 con datos reales: el backup real no debe subirse a
  GitHub ni a un runner compartido.
- El ensayo real debe hacerse en un equipo x86_64 aislado y autorizado, o en el
  hardware del usuario si su arquitectura y sistema lo permiten. El Mac actual es
  arm64 y no acredita el comportamiento Linux/x86_64.
- Sin compras ni infraestructura nueva. Si no hay equipo x86_64 disponible, el gate
  DT6 real sigue bloqueado; el ensayo sintético de CI no lo sustituye.

## 5. Decisiones pendientes del usuario

1. **Destino físico:** disco(s) existente(s), ruta y si habrá una o dos copias.
2. **Custodia de identidad:** dónde se guarda, quién la custodia y cómo se rotaría.
3. **Ventana:** backup en frío con API detenida o snapshot en caliente.
4. **Poda:** manual o automatizada; la automatización requiere DEV separado.
5. **Equipo de ensayo real:** x86_64 aislado disponible o gate bloqueado.
6. **Retención inicial:** confirmar 7/4/3 y la fecha de inicio.
7. **Evidencia:** dónde se guarda el registro sin datos personales.

## 6. Riesgos y límites

- Un backup cifrado sin identidad custodiada no es recuperable.
- Una copia en el mismo disco no cubre fallo de hardware, robo o ransomware.
- El snapshot WAL es consistente, pero una ventana fría reduce riesgo operativo.
- El restore real con datos reales requiere autorización específica y un entorno
  aislado; no se ejecuta en CI.
- Este procedimiento no cierra DT6/T-BKP, no sustituye el gate rootless y no
  desbloquea E4.9.

## 7. Siguiente paso

Presentar las decisiones del apartado 5 al usuario. Solo después se podrá ejecutar un
ensayo real autorizado y registrar la evidencia del gate. Mientras tanto, el ensayo
sintético Linux de RESTORE-19/20 queda como evidencia técnica separada.
