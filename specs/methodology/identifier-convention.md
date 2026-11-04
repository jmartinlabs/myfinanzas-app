# Convención de identificadores — propuesta

**Estado:** `[PROPUESTA]` · 2026-11-04 · **No aprobada**. No renombra archivos, carpetas,
ramas, PR, commits, enlaces ni identificadores existentes.

## 1. Identificador canónico

El identificador principal es la **entrega del roadmap**: `E<épica>.<entrega>`.

- `E4.6` agrupa spec, desarrollo, QA y documentación de «Resumen de inicio completo».
- Las fases se expresan como sufijo, nunca como identidad propia:
  - `E4.6 · SPEC`
  - `E4.6 · DEV`
  - `E4.6 · QA`
  - `E4.6 · DOC` para readiness, investigaciones y paquetes de decisión.
- Un bloque de un DEV se nombra `E4.6 · DEV-A`, `E4.6 · DEV-B`, `E4.6 · DEV-C`.
- Un paquete de corrección se nombra `E4.6 · DEV-fix-N` o por su contenido
  (`E4.9 · DEV-núcleo`, `E4.9 · DEV-guards`), sin crear un identificador nuevo.

## 2. Identificadores históricos

Se conservan como **referencias de compatibilidad y trazabilidad**:

- `SPECnn`, `DEVnn`, `PR #nn`, `AC-nn`, `KI-*`, `DTn`, `Pn`, `T-*`, `R1–R6`.
- No se reescriben documentos, ramas ni PR existentes para migrarlos.
- En documentos nuevos, la primera mención usa la forma canónica y, entre paréntesis,
  el histórico si aporta trazabilidad: «E4.6 · DEV (DEV24)».
- El índice de equivalencias vive en [identifier-index.md](identifier-index.md).

## 3. Nombres de archivos y ramas para paquetes nuevos

| Artefacto | Convención | Ejemplo |
| --- | --- | --- |
| Investigación / readiness | `specs/investigations/e<entrega>-<tema>-AAAA-MM-DD.md` | `e47-annual-readiness-2026-11-04.md` |
| Spec funcional | `NN-<slug>-specification.md` (NN histórico, sin renumerar) | `24-e46-resumen-inicio-specification.md` |
| Testplan | `NN-<slug>-testplan.md` | `24-e46-resumen-inicio-testplan.md` |
| Rama de desarrollo | `feat/e<entrega>-<tema>` | `feat/e46-inicio` |
| Rama documental | `docs/<tema>` | `docs/next-packages` |
| Título de PR | `feat(e<entrega>): <resultado>` o `docs(<tema>): <resultado>` | `feat(e46): resumen de inicio` |
| Paquete de trabajo | `E<entrega> · <fase> — <tema>` | `E4.7 · SPEC — resumen anual` |

No se crean identificadores nuevos del tipo `DEVnn`/`SPECnn` para trabajos futuros. Si un
documento histórico exige un número de spec nuevo, se asigna el siguiente libre y se registra
en el índice; el número es **soporte documental**, no la identidad de la entrega.

## 4. Reglas de uso

1. Tablero, backlog, PR y mensajes usan primero el identificador canónico.
2. Los AC se citan como `E4.6-AC05` cuando cruzan documentos; dentro de su propia spec/testplan
   puede mantenerse `AC-05`.
3. Un documento no mezcla fases: `E4.6 · QA` no autoriza `E4.6 · DEV`.
4. La aprobación de una fase no aprueba las siguientes.
5. Los archivos existentes no se renombran por esta convención; la migración, si se aprueba,
   será un trabajo documental separado y verificable.

## 5. Qué requiere aprobación

- Adoptar esta convención para paquetes nuevos.
- Asignar números de spec a E4.7, E4.10, E4.11 y E4.12 **solo al crear sus specs**.
- Cualquier renombrado masivo posterior (fuera de alcance hoy).
