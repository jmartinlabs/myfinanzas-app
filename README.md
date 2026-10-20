# Universal AI development template
A reusable Codex development methodology for any project stack. This repository contains
no application and makes no language, database, framework or hosting choice for you.

**Start here: [copy the new project prompt](NEW_PROJECT_PROMPT.md).**
Create an independent repository with GitHub **Use this template**, open it in Codex,
and send the prompt. Confirm material decisions as the walkthrough proceeds.

## Interactive initialization
Type `$init-project` in Codex. It reads existing context, asks short rounds of questions
and saves state in `specs/setup-progress.md`. The seven stages are identity → technology
→ architecture → working bootstrap → guidelines → roadmap → development handoff.
It recommends options but waits for material decisions. Approved architecture belongs
in guidelines, while progress links to it. Existing decisions/files are preserved.
To resume: open the derived repository and say “$init-project, resume from saved progress.”
No previous chat history is required. Do not initialize an application in this template.

## Skills and eight-step methodology
| Step | Process | Entry point / result |
| --- | --- | --- |
| 1 | Smallest tested end-to-end bootstrap | `$bootstrap` after decisions approved |
| 2 | Document implemented context | Thin AGENTS and four guidelines |
| 3 | Enforce checkable rules | Tests, linters, scripts and CI; positive/negative proofs |
| 4 | Plan independently useful MVP epics | `$roadmap`; four epics unless approved otherwise |
| 5 | Brainstorm and approve one specification | Append-only questions and acceptance checks |
| 6 | Reuse the specification process | `$spec 01` or `$spec feature name` |
| 7 | Build verified increments | Progress, test plan and working commits |
| 8 | Reuse implementation and verification | `$dev 01` for an approved specification |

To specify an epic, send `$spec 01`. Answer the proposed options; visual projects include
ASCII wireframes for feedback. It commits approved documents and stops before code.
Then send `$dev 01`. It maps acceptance checks to tests, builds small increments and
verifies actual behavior. Web features use Playwright plus inspected 390px/1440px
screenshots and a justified visual improvement review. Non-visual projects use relevant
API/CLI/integration checks. Failed or unrun acceptance checks block completion.
See [document ownership](specs/README.md) and [Skills invocation](NEW_PROJECT_PROMPT.md).

## Repository map
```text
AGENTS.md                         concise agent entry point
NEW_PROJECT_PROMPT.md              self-contained new project prompt
.agents/skills/{init-project,bootstrap,roadmap,spec,dev}/SKILL.md
.github/workflows/validate.yml     template validation on push/PR
specs/README.md                    document ownership and naming
specs/guidelines/{architecture,ui,quality,security}.md
templates/{brainstorming,specification,roadmap,progress,testplan}.md
scripts/validate-template          standard-library checks
scripts/test-validator            positive/negative regression fixtures
PROMPT_BACKUP.md                   original incomplete user prompt
PROMPT_BACKUP_COMPLETE.md          complete user requirements, verbatim
```
Project-specific files are created by the Skills in a derived repository, not prefilled
with fictional approved decisions. UNDECIDED placeholders are intentional initialization
instructions. Projects may retain this methodology and add their own code and tooling.

## Verify and commit
Python 3.10+ is needed only for template tooling; no package manager/install is needed.
From the repository root:
```sh
./scripts/validate-template
./scripts/test-validator
git diff --check
git status --short
```
Review the diff, stage explicit files, inspect the staged diff and commit working changes.
Do not include unrelated user changes or credentials. Derived projects additionally run
the real commands recorded in their quality guidelines. See [quality](specs/guidelines/quality.md)
for check coverage and limitations. GitHub Actions runs the same template checks.

## Create a project on GitHub
Use **Use this template → Create a new repository**, choose owner/name and private visibility
by default, then open its independent checkout in Codex. CLI alternative and a complete
prompt are in [NEW_PROJECT_PROMPT.md](NEW_PROJECT_PROMPT.md). Changes here do not propagate
to existing projects; selectively port reviewed methodology changes yourself.

## Maintain and publish this template
Edit reusable methodology only, preserve prompt backups and avoid adding a demo application.
Run both checks and review Skills manually, especially approval and resume behavior.
Codex conventions: [AGENTS](https://developers.openai.com/codex/guides/agents-md) and
[Skills](https://developers.openai.com/codex/skills). No agent-specific hooks are assumed.
The local environment reports Codex CLI 0.163.0; the official Skills page was inaccessible
(HTTP 403) during creation. Recheck client discovery on your installed version; explicit
file-reading instructions remain available. No unsupported slash commands are required.

Before publication inspect Git status, verify GitHub access, confirm intended owner,
visibility (private by default) and repository name. The existing origin is
`josemartin2000/agent-project-template`; do not create over it, reset it or change visibility.
After explicit authorization, push the reviewed branch normally, enable **Template
repository** in repository settings (or `gh repo edit OWNER/REPO --template` with API access),
and verify accessibility. Create a disposable private repository from the template only
with authorization; verify required files and run both checks there. Delete it only with
permission. Update the prompt URL if the actual published location changes.
Git read access does not prove API or push permission. CLI token failure does not mean a
new token must be supplied in chat. Use supported authentication/settings securely.
Local validation cannot prove GitHub template mode or successful remote creation.
