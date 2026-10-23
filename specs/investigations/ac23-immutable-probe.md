# AC23-SQLITE — sonda `immutable=1` y `SQLITE_CORRUPT` en apertura concurrente

Status: MECANISMO DEMOSTRADO LOCALMENTE — atribución al fallo histórico de dev07 pendiente;
corrección propuesta, NO implementada.
Fecha: 2026-10-23 (Europe/Madrid). Base main `94ae3fd`; rama dev07 `d1868dc` (sin integrar).
Autorización: investigación técnica acotada de AC23-SQLITE vinculada al bloqueo de
Dev07/E2.1, expresa del usuario el 2026-10-23. No autoriza reanudar dev07, cambiar lógica
financiera, merges, despliegue ni Dev32. Este documento no modifica código.

## Punto de partida

- dev07 (checkpoint `d1868dc`; `specs/07-ciclos-operacion-progress.md` solo en la rama `feat/07-ciclos-operacion`):
  API 105 PASS / 1 FAIL en el test heredado «04 AC22/23/28», hijo `upgrade`, fase `open`,
  `SQLiteError UNCLASSIFIED errno 11`, `database-identity.ts:13:6`. Repeticiones 12/270,
  control base 1/18 y un probe de dos procesos no reprodujeron ni atribuyeron causa.
- Investigaciones previas: [arranque concurrente](../sqlite-startup-concurrency.md)
  (BEGIN IMMEDIATE, PR #9), [busy_timeout temprano](sqlite-early-timeout.md) (#31),
  [E1.4 instrumental](04-concurrency-diagnostics.md) (`SQLITE_BUSY_RECOVERY/261`),
  [R6](05-r6-diagnostico.md) y Dev32 (`32-sqlite-identity-snapshot.md`, rama de PR #30:
  carrera de lectura de identidad en la conexión viva, corrección candidata `86b1570`).
- Por qué seguía inconcluso: el saneador del diagnóstico solo publica códigos conocidos,
  por lo que el errno 11 aparecía como `UNCLASSIFIED`; solo se conservó el marco superior
  de la pila; y las pruebas anteriores buscaban BUSY/timeout, no lecturas sin bloqueo.

## Observaciones clave

- En SQLite, el código 11 es `SQLITE_CORRUPT` («database disk image is malformed»).
- `database-identity.ts:13` es el `.query()` sobre `sqlite_master` dentro de `has()`: la
  primera preparación de sentencia, que carga el esquema. Idéntico en main y dev07.
- `openDatabase` (rama demo/test, `database.ts:47-48`) llama primero a
  `persistentIdentity(path)` (`private-state.ts:183-196`), que abre
  `?mode=ro&immutable=1`. Con `immutable=1` SQLite asume que el archivo nunca cambia:
  no toma bloqueos ni lee el WAL. Su documentación advierte que, si cambia, pueden darse
  resultados incorrectos o `SQLITE_CORRUPT`.
- Las bases usan WAL. Al cerrar la última conexión, el proceso que migra hace checkpoint y
  copia páginas al archivo principal mientras otro proceso puede estar leyéndolo sin bloqueos.
- La sonda existe desde #25 (`511fcba`); no estaba en `9336fdd`.

## Hipótesis y prueba discriminante

**H1′**: la sonda `immutable=1` lee el archivo principal sin bloqueos mientras otro proceso
confirma o hace checkpoint de un cambio de esquema que abarca varias páginas; ve páginas
inconsistentes y falla al cargar `sqlite_master` con `SQLITE_CORRUPT`. Una conexión de solo
lectura normal (con bloqueos y `busy_timeout`) no falla en las mismas condiciones.

Discriminación: aplicación (sonda) frente a concurrencia general (control con bloqueos),
configuración (`busy_timeout` no interviene en la sonda) y entorno (reproducir en macOS,
no solo en el runner Linux).

## Resultados

Entorno: macOS (arm64), Bun 1.4.3, `NODE_ENV=test`, bases demo ficticias en directorios
temporales 0700 fuera del repositorio; módulos reales de main `94ae3fd` importados en
solo lectura. Sin datos reales, claves ni Excel.

| Prueba | Resultado | Qué demuestra |
| --- | --- | --- |
| Intento 1: escritor crea/borra una tabla, commit + checkpoint en bucle; lectores inmutable y normal, 8 s | Sin fallos: 1849 commits; 29 086 lecturas inmutables y 4290 normales; `integrity_check` ok | Un cambio de una sola página no basta; refina H1 a H1′ |
| Intento 2: 150 rondas de la escena real AC22/23/28 (v3 genuina; dos procesos `openDatabase` migrando a v8 a la vez) + observador `persistentIdentity` | **FAIL** en el observador: **21 rondas `SQLITE_CORRUPT/11`** y **73 rondas «Identidad ausente.»**; procesos que migran 300/300 OK | Mecanismo de H1′ con el código real |
| Control: mismas 150 rondas con lector normal `?mode=ro` + `busy_timeout` + transacción de lectura | **PASS**: 0 errores (84–124 lecturas por ronda); 300/300 migraciones OK | El fallo es propio de la sonda inmutable, no de la concurrencia en general |
| Typecheck, suites, E2E | UNRUN | Sin cambios de código |

Conclusiones:

- **Demostrado (local):** la sonda `immutable=1` produce `SQLITE_CORRUPT/11` y lecturas de
  identidad incoherentes durante migraciones concurrentes; con bloqueos no ocurre. No es
  específico de Linux.
- **No demostrado:** que el fallo histórico de dev07 saliera de la sonda. Coinciden código,
  errno y línea, y la migración de dev07 es mayor (ventana más amplia), pero en estas rondas
  falló el observador, no los procesos que migraban.
- **Compatible, no demostrado:** CI E1.4 `39680804651` (código de #25, con sonda).
  **No explicado:** R6 `39672873631`, anterior a la sonda.
- **Nuevo para Dev32:** las 73 «Identidad ausente.» salen por la ruta inmutable; la
  corrección candidata `86b1570` solo protege la conexión viva y no las cubre.

## SQLite B4 (dev08, `6eeb727`): causa distinta, sin ejecutar

Falló una vez en `sqlite-opening.test.ts:223` (`expect(waiting).toBe(true)`) a los 1283 ms,
antes del límite de 3000 ms: el hijo terminó sin que se observara `hrtimer_nanosleep` en
`/proc/PID/wchan`. La prueba descarta el resultado del hijo en ese camino. No hay migración
concurrente ni sonda inmutable en el punto observado; no comparte mecanismo con AC23.
**H2 pendiente**: el hijo no llegó a esperar (recuperación no necesaria en ese instante o
error temprano). UNRUN localmente (requiere Linux `/proc`). Propuesta aparte: registrar el
resultado del hijo cuando `waiting` sea falso, sin cambiar la condición de la prueba.

## Esquema e integración futura de dev07

- main está en v8 con el contrato E2.2 (`budget_contract`); dev07 también llama v8 a su
  esquema (`cycle-operation-schema.ts`). main rechaza ese v8 ajeno, como debe.
- Integrar dev07 exige renumerar su migración a **v9** con contrato propio, añadir un fixture
  v8 genuino y unificar `test-support/database-v7.ts` (existe en ambas ramas). Solo hay datos
  de prueba con el formato dev07; no hay datos reales que migrar.
- Cada versión añade DDL y amplía la ventana de la sonda: sin corregirla, las pruebas de
  migración concurrente serán más inestables.
- Producción: `verifyProductionFiles` usa la misma sonda (`auth.ts`, `backup.ts:82`). Un
  backup con el servidor escribiendo podría fallar de forma intermitente (falla cerrado; riesgo
  de disponibilidad, no de integridad).

## Corrección mínima propuesta — NO implementada

1. En `persistentIdentity`, sustituir `immutable=1` por una conexión de solo lectura **con
   bloqueos** (`?mode=ro`, `PRAGMA busy_timeout=3000`) e `inspectIdentity` dentro de una
   transacción de lectura (snapshot). Conservar la comprobación previa de identidad, que no
   se cree nada, las verificaciones de archivos y el fallo cerrado.
2. Verificar antes de aceptarla: que una conexión de solo lectura sobre una base WAL cerrada
   no cree ni altere `-wal`/`-shm` (los vigila `privateSidecars` en producción) y que no
   cambia ninguna garantía de spec31.
3. Regresión: convertir el intento 2 en prueba que falle antes y pase después; el saneador
   del diagnóstico debe aceptar `SQLITE_CORRUPT`.
4. Fuera de esta corrección: renumeración de dev07 a v9 (al reanudar dev07) e
   instrumentación de B4.

Requiere autorización expresa: toca la ruta de apertura SQLite y la verificación de
identidad productiva (seguridad).

## Reproducción

Copiar los scripts a un directorio vacío **fuera** del repositorio y sustituir `REPO` por la
ruta absoluta del checkout. Requiere Bun 1.4.3 y `sqlite3`.

`setup.ts`

```ts
import { openDatabase } from "REPO/apps/api/src/database";
const db = openDatabase(process.argv[2]); db.close();
```

`writer.ts` (solo intento 1)

```ts
import { Database } from "bun:sqlite";
const [path, ms] = [process.argv[2], Number(process.argv[3])];
const end = Date.now() + ms; let i = 0, errs: Record<string, number> = {};
const blob = "x".repeat(2000);
while (Date.now() < end) {
  try {
    const db = new Database(path, { strict: true });
    db.exec("PRAGMA busy_timeout=3000");
    db.transaction(() => {
      db.exec(`CREATE TABLE probe_${i}(a INTEGER PRIMARY KEY, b TEXT)`);
      const st = db.prepare(`INSERT INTO probe_${i}(b) VALUES(?)`);
      for (let k = 0; k < 200; k++) st.run(blob);
      if (i > 0) db.exec(`DROP TABLE probe_${i - 1}`);
    }).immediate();
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    db.close(); i++;
  } catch (e: any) { const k = `${e.code}/${e.errno}`; errs[k] = (errs[k] ?? 0) + 1; }
}
console.log(JSON.stringify({ role: "writer", commits: i, errs }));
```

`reader.ts` (`immutable` usa la sonda real; `live` es el control)

```ts
import { Database } from "bun:sqlite";
import { persistentIdentity } from "REPO/apps/api/src/private-state";
import { inspectIdentity } from "REPO/apps/api/src/database-identity";
import { pathToFileURL } from "node:url";
const [path, ms, mode] = [process.argv[2], Number(process.argv[3]), process.argv[4]];
const end = Date.now() + ms; let ok = 0; const errs: Record<string, number> = {}; let sample = "";
while (Date.now() < end) {
  try {
    if (mode === "immutable") persistentIdentity(path);
    else {
      const db = new Database(pathToFileURL(path).href + "?mode=ro", { readonly: true });
      try { db.exec("PRAGMA busy_timeout=3000"); db.transaction(() => inspectIdentity(db))(); } finally { db.close(); }
    }
    ok++;
  } catch (e: any) { const k = `${e.code ?? e.name}/${e.errno ?? "-"}`; errs[k] = (errs[k] ?? 0) + 1; if (!sample) sample = String(e.message).slice(0, 80); }
}
console.log(JSON.stringify({ role: "reader-" + mode, ok, errs, sample }));
```

`run.sh` (intento 1: `./run.sh intento1 8000`)

```sh
#!/bin/sh
D=$(mktemp -d "$PWD/run-XXXX"); chmod 700 "$D"; P="$D/demo.sqlite"
NODE_ENV=test bun setup.ts "$P" || exit 1
NODE_ENV=test bun writer.ts "$P" "$2" > "$D/w.json" 2>&1 &
NODE_ENV=test bun reader.ts "$P" "$2" immutable > "$D/ri.json" 2>&1 &
NODE_ENV=test bun reader.ts "$P" "$2" live > "$D/rl.json" 2>&1 &
wait
echo "== $1"; cat "$D/w.json" "$D/ri.json" "$D/rl.json"
sqlite3 "$P" "PRAGMA integrity_check;" ; rm -rf "$D"
```

`mkv3.ts` y `upgrader.ts`

```ts
// mkv3.ts — fixture v3 genuina del repositorio
import { openDatabase as openV3 } from "REPO/apps/api/test-support/database-v3";
openV3(process.argv[2]).close();
```

```ts
// upgrader.ts — apertura/migración real, como el hijo «upgrade» de AC22/23/28
import { openDatabase } from "REPO/apps/api/src/database";
try { const db = openDatabase(process.argv[2]); const v = db.query("SELECT version FROM schema_version").get(); db.close(); console.log(JSON.stringify({ ok: v })); }
catch (e: any) {
  const frames = String(e.stack ?? "").split("\n").filter((l) => l.includes("/apps/api/")).map((l) => l.trim().replace(/^at /, "").replace(/.*\/apps\/api\//, "")).slice(0, 4);
  console.log(JSON.stringify({ err: `${e.code ?? e.name}/${e.errno ?? "-"}`, msg: String(e.message).slice(0, 60), frames }));
}
```

`attempt2.sh` (intento 2: `./attempt2.sh 150`; control: cambiar `immutable` por `live` en
la línea del observador)

```sh
#!/bin/sh
N=$1; OUT="$PWD/attempt2.jsonl"; : > "$OUT"
for r in $(seq 1 $N); do
  D=$(mktemp -d "$PWD/r2-XXXX"); chmod 700 "$D"; P="$D/demo.sqlite"
  NODE_ENV=test bun mkv3.ts "$P" || { echo mkv3-fail; exit 1; }
  NODE_ENV=test bun upgrader.ts "$P" > "$D/a" 2>&1 &
  NODE_ENV=test bun upgrader.ts "$P" > "$D/b" 2>&1 &
  NODE_ENV=test bun reader.ts "$P" 400 immutable > "$D/i" 2>&1 &
  wait
  for f in a b i; do printf '{"round":%s,"proc":"%s","out":%s}\n' "$r" "$f" "$(cat $D/$f)" >> "$OUT"; done
  rm -rf "$D"
done
echo "upgraders ok: $(grep -c '"proc":"[ab]","out":{"ok"' $OUT) / $((N*2))"
echo "upgrader errors:"; grep '"proc":"[ab]"' "$OUT" | grep '"err"' | sed 's/.*"out"://' | sort | uniq -c | head
echo "observer errs:"; grep '"proc":"i"' "$OUT" | grep -v '"errs":{}' | sed 's/.*"errs"://' | sort | uniq -c | head
```

Los resultados son estadísticos: el número de rondas con error puede variar entre máquinas
y ejecuciones. No se repitieron pruebas equivalentes tras obtener la discriminación.
