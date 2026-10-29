# QA independiente — retorno original de sesión

**Sesión:** `ses_e78ad04d6ffe1dwLLXxmiufCOM` · agente `general` · título «Independent QA PR 128»
**SHA de código revisado:** `6483d06` (docs-only posterior a `a1e1be9`)
**Nota:** contenido extraído del mensaje final de la sesión; no es una reconstrucción manual.

# Independent QA report — PR #128, SPEC07 option B

## Scope & completion
Review **completed** against the **code** at `6483d06` (all source files are byte-identical at the current branch tip). During the review the branch advanced `6483d06 → a1e1be9` (docs only: `git diff --name-status 6483d06..HEAD` = progress/testplan). A concurrent session also briefly created/removed `tests/e2e/_tmp-spec07-comida.spec.ts`; final tree is clean except untracked `specs/session-handoff.md` (not in the PR). No files edited by me.

## 1) B1 / B2 / T1 — implemented and covered
- **B1 (full period comparison)** — ✅ `apps/api/src/ciclos.ts:536-537` hoists `period(c) = [id,inicio,fin,mesFinanciado]`; Comida reuses it at `ciclos.ts:560-579` (`fingerprint(period(a)) !== fingerprint(period(b))`). The B1 regression is covered by the changed expectation in `apps/api/src/cycle-operations.test.ts:274-278`: row `rc20` stays in **the same cycle id** while the interval changes `10-01→10-05`, and is now enumerated (`totalVigentesAfectadas=1`); the pre-fix id-only comparison (`4d7f504:apps/api/src/ciclos.ts:562`) returned 0, so the test genuinely fails without B1.
- **B2 (max, not sum)** — ✅ `apps/web/src/cycle-pagination.ts:3-7` uses `page*100 < Math.max(vigentes,históricas)`; used at `apps/web/src/Ciclos.tsx:1169-1176`. Unit-covered in `apps/api/src/cycle-pagination.test.ts:4-12` (105/105, 105/0, 0/105, 0/0). Server slicing keeps both lists on the same page (`ciclos.ts:652-672`); independent probe confirmed page 1=100/100, page 2=5/5, page 3=0/0 for 105+105, totals 105/105/210, `impactRevision` stable.
- **T1 (rows-only failure → 409, source MAX still available)** — ✅ `ciclos.ts:507-516` catches only `revisionComidaRows()` and throws `409 REFERENCE_ERROR`; `temporalSources` remains available. Covered by `cycle-operations.test.ts:500-537`; it asserts the message and "no writes" (`cycle_audit=0`) but **not** `status/code`, so I verified independently: after renaming `concepto`, `revisionComidaSource(db).state === "disponible"` and preview throws `{status:409, code:"REFERENCE_ERROR"}`.

## 2) Comida impact/huella/materiality — no functional regression found
- Huella composition `ciclos.ts:600-640` (aggregated reference `{fecha,estado,actual,coverage(source,state)}` instead of raw `maxDate`, plus material attribution lists) is sound: it drops non-material max changes (O6, `cycle-operations.test.ts:336-395`) while still invalidating on `fecha/actual/coverage/attribution`.
- Correct split by `Vigente/Anulado` (`ciclos.ts:586-591`; `RevisionComidaRow["estadoRegistro"]` is exactly those two values), material fields `ciclos.ts:611-619` match what the UI renders (`Ciclos.tsx:1114-1152`), and confirmations do not carry page params (`Ciclos.tsx:875-897`). Pagination cannot alter the huella (O9 `test:539-556`; probe pages 1/2/3 identical).
- The module derivation is dynamic (no persisted Comida FK); O5 confirms re-attribution on commit.
- No changes to `revision-comida-ledger.ts`; other modules unaffected.

## 3) Evidence (commands/results)
- `NODE_ENV=test bun test apps/api/src/cycle-operations.test.ts` → **17 pass / 1 fail**; the only failure is `07 O4 AC23/24 …` at `cycle-operations.test.ts:739` — `Executable not found: "age-keygen"` (environment, not product).
- `NODE_ENV=test bun test apps/api/src/cycle-pagination.test.ts` → **1 pass**.
- `tsc --noEmit` → **exit 0**.
- Full `bun test apps/api` → **258 pass / 53 fail / 311 tests**; all 53 failures are environment-only: 17 `age-keygen` errors + 58 `Ancestro no confiable` (`apps/api/src/private-state.ts:43`) in backup/production-identity suites. The docs' "311 API PASS" refers to Linux CI (not reproduced here).
- Independent in-memory probe (no repo writes) for B2/T1 as above.
- **UNRUN**: CI run `40856670004`, full Playwright E2E, Linux-only backup tests (age/dlopen).

## 4) Non-blocking concerns
1. **E2E evidence provenance**: the ignored `artifacts/spec07/pagination-desktop-1440.png` shows "105 vigentes · 105 históricas" with `Página 2` but only 2 Vigente rows and no históricas section — internally inconsistent with `ciclos.ts:661-662` (totals = affected lengths). It may be a stubbed/older-server capture. B2 evidence therefore rests on the unit test + my server probe, not that image.
2. **No committed E2E for the new Comida UI**: HEAD's e2e only changes a selector string (`tests/e2e/cycle-operations.ts:244`); `git grep` finds no committed test for `Siguiente Comida`/`Operaciones Revisión Comida`. The focal run used a deleted, ignored temp spec.
3. **Docs drift**: progress says `pageComida` (`specs/07-ciclos-operacion-progress.md:20`) but the field is `comidaImpacto.page`; the UI literal was renamed "Hechos afectados"→"Movimientos afectados" (`specs/07-ciclos-operacion-specification.md:190` still says the old label); testplan row B1 says "regresión añadida" though it is an updated O4 assertion (`testplan:42`); test IDs `C07-F1/F2`, `R1a/R1b`, `R2` (`testplan:36-39`) are defined nowhere in the spec.
4. **Test-depth nits**: T1 asserts message only (no 409/REFERENCE_ERROR assertion); no test for same-id `fin`-only change or for invalid `comidaPage` at HTTP level; UI shows "0 vigentes · 0 históricas anuladas" above the empty-state message (`Ciclos.tsx:1095-1105`).

## Verdict
**PASS** — B1/B2/T1 are correctly implemented and adequately covered; no functional regression or blocking risk found in the Comida impact/huella/materiality paths. Concerns above are non-blocking documentation/evidence/coverage items. No changes proposed or made.