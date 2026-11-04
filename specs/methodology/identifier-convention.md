# Convención de identificadores — MyFinanzas

**Estado:** aprobada por el usuario el 2026-11-04 e **integrada en `main` `b3f4ed9`** (PR #202).
Adopta la norma general de Agentic Template ([identifiers.md](https://github.com/jmartinlabs/agent-project-template/blob/c0ee565/specs/methodology/identifiers.md)) y **no
renombra** archivos, carpetas, ramas, PR, commits, enlaces ni identificadores históricos.

## 1. Identificador canónico

El identificador principal es la **entrega del roadmap**: `E<épica>.<entrega>` (`E4.6`,
`E4.10`). MyFinanzas declara esta grammar; otros proyectos pueden documentar otra.

- Identifica una capacidad, no una fase.
- Es estable, único y no se reutiliza ni renumera.
- Un cambio material de alcance crea un `E` nuevo.

## 2. Etapas

| Etapa | Estados |
| --- | --- |
| `SPEC` | planned → drafting → awaiting-approval → approved → superseded |
| `DEV` | not-ready → ready → implementing → testing → verified |
| `QA` | planned → test-design → awaiting-candidate → verifying → passed / failed / blocked |
| `MERGE` | not-ready → PR-open → ready-for-review → authorization-pending → approved → merged / closed |

Forma de uso: `E4.10 · SPEC`, `E4.10 · DEV`, `E4.10 · QA`, `E4.10 · MERGE`.

- Cada etapa tiene estado independiente.
- `SPEC` aprobada no autoriza `DEV`; `DEV` verificado y `QA` PASS no autorizan `MERGE`.
- Solo el usuario concede la aceptación funcional y la aprobación de merge.
- La **aceptación funcional** es un veredicto aparte:
  `pendiente / favorable con reservas / aceptada / rechazada`.

## 3. Bloques de desarrollo

- `DEV-01`, `DEV-02`… con nombre descriptivo: `E4.9 · DEV-04 — Guards`.
- La numeración es **propia de cada entrega**, nunca global.
- El número no implica que el bloque esté completado; un bloque pendiente conserva su identidad.
- **Compatibilidad histórica:** `A/B/C` equivalen a `DEV-01/02/03` y se conservan como alias;
  no se renombran documentos, ramas, PR ni commits.
- El siguiente bloque nuevo continúa la secuencia: en E4.6/E4.9, `DEV-04`.

## 4. Trazabilidad

- Un único tablero operativo: `specs/epic-board.md`.
- Una fila por `E4.x` con: estados `SPEC/DEV/QA/MERGE`, bloques DEV, aceptación, documentos,
  paquetes, owner/rama, evidencia y siguiente acción.
- [identifier-index.md](identifier-index.md) conserva las equivalencias históricas
  (`SPECnn`, `DEVnn`, PR, A/B/C).
- No se crea un tracker ni un tablero paralelo; los documentos se enlazan, no se copian estados.

## 5. Paquetes y PR

- Paquete: `E4.10 · SPEC` o `E4.10 · DEV-02 — <nombre>`.
- Rama: `feat/e46-<tema>` o `docs/<tema>` (histórico).
- Los commits y PR referencian el identificador y la etapa; no inventan IDs nuevos.

### Títulos de PR

Formato:

```text
<tipo>(<scope>): <ETAPA>[-<BLOQUE>] — <descripción>
```

- **`<tipo>`:** `feat`, `fix`, `test`, `docs`, `chore`, `refactor`.
- **`<scope>`:** ID funcional en minúsculas y sin separadores que rompan el parseo:
  `E4.10 → e410`, `E4.6 → e46`. Trabajo transversal usa un slug documentado (`theme`, `ci`).
- **`<ETAPA>`:** `SPEC`, `DEV` o `QA`. `MERGE` es seguimiento y no requiere PR propia.
- **`<BLOQUE>`:** `DEV-01`, `DEV-02`… si la PR cubre un bloque. Si cubre varios, se usa
  `DEV` y se listan los bloques en la descripción.
- Se conserva el número `#NNN` de GitHub; no se renumeran ni se renombran PR históricas.
- Títulos cortos, descriptivos y compatibles con los validadores existentes.

Ejemplos:

```text
docs(e410): SPEC — reapertura de cierres
feat(e410): DEV-01 — modelo de reapertura
feat(e410): DEV-02 — API y controles
test(e410): QA — pruebas de reapertura
fix(e410): DEV-02 — corrección del bloqueo histórico
feat(theme): DEV-01 — sistema de temas y shell
```

Las PR abiertas antes de esta convención conservan su título. Las nuevas la aplican desde su
creación; una PR que abarque varios bloques lo declara en la descripción.

## 6. Límites

- Sin renombrados masivos ni migración de historial.
- La convención es aditiva; los documentos existentes siguen siendo válidos.
- Cualquier cambio estructural posterior requiere autorización y verificación propia.
