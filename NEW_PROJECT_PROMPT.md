# Start a new project

## Quick instructions
On GitHub, open <https://github.com/jmartinlabs/agent-project-template> and select
**Use this template → Create a new repository** once the owner has published this content
and enabled **Template repository**. Choose owner/name and **Private** unless you intend
otherwise. This creates an independent repository, not a fork; future template changes
are not automatically applied.

Alternatively, with an authenticated GitHub CLI, replace OWNER and NEW_NAME, then run
this command yourself only after deciding to create the remote repository:

```sh
gh repo create OWNER/NEW_NAME --template jmartinlabs/agent-project-template --private --clone
cd NEW_NAME
```

Do not run it inside an existing project. If it already exists, open that checkout instead.
An agent must obtain explicit authorization before remote creation or publication.

## Ready-to-copy prompt
Replace the two bracketed fields, then copy this entire block into Codex:

```text
We are going to create a new software project.
Project name: [PROJECT_NAME]
Initial idea: [SHORT_DESCRIPTION]
GitHub template: https://github.com/jmartinlabs/agent-project-template

Create an independent project from this template without modifying the original repository.
If this workspace is already a repository created from the template, inspect and continue
there instead of creating another one. Preserve existing files and decisions.
If a new remote is needed, check available GitHub access, ask for intended owner and
visibility (recommend private), and obtain explicit authorization before creating or
publishing it. Do not overwrite an existing remote or change its visibility.

Read AGENTS.md and the available repository-local Skills. Start $init-project.
Guide me through purpose, target users, technology choices, architecture, the smallest
walking skeleton, project guidelines and initial roadmap. Ask questions in short rounds,
recommend options and explain important trade-offs without imposing a stack.
Save progress in specs/setup-progress.md and confirmed decisions in the appropriate
canonical guidelines, so another session can resume without this chat history.
Do not invent requirements or implement unapproved features.
Start by planning: show the initial setup plan and wait for approval of material decisions.
Use Codex Plan mode if available; otherwise provide the plan conversationally. Do not
invent a CLI planning flag. After approvals, verify the walking skeleton and guide me
to $spec for an epic and $dev for its approved specification.
```

## Skill invocation and resume
Codex repository-local Skills use `.agents/skills/NAME/SKILL.md` with YAML `name` and
`description` frontmatter. In the Codex conversation type `$init-project` (or select the
Skill from its skill picker where available). `$spec 01` and `$dev 01` pass conversational
context after the Skill name; they are not shell commands or commands from another agent.
If the installed client does not discover Skills, reopen the repository/session and ask
Codex explicitly to read `.agents/skills/init-project/SKILL.md` and follow it. Check the
[official Skills documentation](https://developers.openai.com/codex/skills).

To resume in a new session: “Read AGENTS.md and specs/setup-progress.md; use $init-project
to resume at the next recorded action without redoing confirmed decisions.” For an active
feature, use `$spec 01` or `$dev 01` and its existing documents. Recommendations marked as
checked options are not approvals; confirm choices in the conversation.

## Fictional example
Sample only: replace `[PROJECT_NAME]` with `Field Notes` and `[SHORT_DESCRIPTION]` with
`A tool for volunteers to record fictional trail observations`. Leave language, UI,
database and hosting undecided until the walkthrough. This example adds no application
to the template and does not prescribe requirements for your project.

## Template publication and URL maintenance
The URL above is the verified existing Git origin, not a claim that this template content
has been pushed or that template mode is enabled. Before first use, publish validated
commits with permission, enable template mode and verify a disposable derived repository
with permission. If maintaining a copy under another owner, update both URL and CLI
reference here, validate, commit and push that documentation update with authorization.
