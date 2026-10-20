# Create a Universal AI Development Project Template

## Objective

Create a reusable GitHub template repository named **`agent-project-template`**.

The repository must provide a complete, agent-driven software development methodology, inspired by the eight-step workflow described below.

This is a **universal development template, not an application**.

It must support different types of projects, languages, frameworks, databases and deployment environments.

The primary coding agent is **OpenAI Codex**.

Use Codex-native conventions, including `AGENTS.md` and repository-local Skills.

An essential requirement is to provide an **interactive, resumable project setup walkthrough**, so starting a new project is simple and does not require manually configuring everything.

Also create a dedicated file named **`NEW_PROJECT_PROMPT.md`**, containing a complete, ready-to-copy prompt that users can give Codex to create another project from this GitHub template.

---

## 1. Core principles

1. Separate reusable development methodology from project-specific decisions.
2. Never impose a programming language, framework, database or hosting provider.
3. Keep `AGENTS.md` short, with references to detailed guidelines.
4. Build the smallest working software increment first.
5. Make architectural decisions explicit and documented.
6. Work through small, independently verifiable increments.
7. Use interactive questioning to resolve material decisions.
8. Maintain specifications, tests and acceptance criteria.
9. Preserve human approval for destructive, security-sensitive or externally consequential operations.
10. Avoid overengineering, unnecessary dependencies and duplicated instructions.
11. Maintain project continuity across different agent sessions.
12. Prefer objectively enforceable rules over vague instructions.

Do not include the domain logic of MyFinanzas, recipe planners or any other specific application.

Do not create a demonstration application inside the reusable template.

---

## 2. Repository structure

Create the following initial structure, adjusting it only when a concrete technical reason justifies doing so:

```text
agent-project-template/
├── AGENTS.md
├── README.md
├── NEW_PROJECT_PROMPT.md
├── .gitignore
│
├── .agents/
│   └── skills/
│       ├── init-project/
│       │   └── SKILL.md
│       ├── bootstrap/
│       │   └── SKILL.md
│       ├── roadmap/
│       │   └── SKILL.md
│       ├── spec/
│       │   └── SKILL.md
│       └── dev/
│           └── SKILL.md
│
├── .github/
│   └── workflows/
│       └── validate.yml
│
├── specs/
│   ├── guidelines/
│   │   ├── architecture.md
│   │   ├── ui.md
│   │   ├── quality.md
│   │   └── security.md
│   └── README.md
│
├── templates/
│   ├── brainstorming.md
│   ├── specification.md
│   ├── roadmap.md
│   ├── progress.md
│   └── testplan.md
│
└── scripts/
    └── validate-template
```

The structure must not require a specific programming language or application framework.

Files that depend on project-specific decisions must contain clearly labeled placeholders or initialization instructions.

Do not present placeholder decisions as if they were approved.

Keep the reusable template separate from the projects created from it.

---

# 3. Interactive Project Walkthrough

Create a Codex Skill:

`.agents/skills/init-project/SKILL.md`

This Skill is the main entry point when starting a new project.

It must guide the user through project initialization rather than attempting everything in one large prompt.

Use the currently supported Codex Skill manifest format and invocation conventions.

## Walkthrough stages

### Stage 1 — Project identity

Ask the user:

- Project name.
- Main objective.
- Target users.
- Type of application or system.
- Main problem the project should solve.
- Any existing code, documents or reference material.

Offer reasonable recommendations where appropriate.

Do not ask questions whose answers are already available in the project context.

### Stage 2 — Technology decisions

Discuss only the technologies relevant to the project.

Possible topics include:

- Frontend.
- Backend.
- Programming language.
- Database.
- API architecture.
- Authentication.
- Testing.
- Hosting and deployment.

Do not impose any technology.

Explain significant trade-offs and identify a recommended option.

Wait for approval of material decisions before implementation.

### Stage 3 — Architecture

Propose:

- Repository/package structure.
- Responsibility of each module.
- Communication between modules.
- Data ownership and persistence.
- Dependency-management approach.
- Security and testing requirements.

Identify unresolved decisions.

Do not invent reasons for technology choices.

### Stage 4 — Bootstrap

Execute the bootstrap workflow described in STEP 1 below.

Build and verify the smallest working end-to-end implementation.

### Stage 5 — Project guidelines

Create the architecture, UI, quality and security guidelines applicable to the new project.

Update `AGENTS.md` with actual project information and pointers to the guidelines.

### Stage 6 — Roadmap

Guide the user through defining the first functional roadmap.

### Stage 7 — Ready for development

Summarize:

- Confirmed decisions.
- Technologies.
- Architecture.
- Completed bootstrap.
- Documentation.
- Initial roadmap.
- Pending questions.

Explain how to continue with specification and development Skills.

## Walkthrough behavior

The walkthrough must be:

- **Interactive:** ask questions in small, meaningful rounds.
- **Resumable:** continue from the last completed stage.
- **Non-destructive:** never overwrite existing decisions without authorization.
- **State-aware:** inspect existing files before asking questions.
- **Recommendation-driven:** explain which option is preferred and why.
- **Incremental:** stop at approval boundaries rather than implementing everything immediately.

Persist progress in:

`specs/setup-progress.md`

This file should record completed stages, pending decisions, confirmed decisions and the next action.

Do not create another competing source of truth for architectural decisions. Once confirmed, those decisions belong in their appropriate guidelines; setup-progress should link to them.

The Skill must detect whether initialization has already started.

If it has, resume instead of starting again.

---

# 4. The Eight-Step Development Workflow

## STEP 1 — BOOTSTRAP

Create the reusable bootstrap Skill:

`.agents/skills/bootstrap/SKILL.md`

Purpose: create a *walking skeleton*, the smallest functional application demonstrating that its essential technical components work together.

Requirements:

- Read approved project decisions.
- Inspect existing code before generating files.
- Propose a minimal working implementation.
- Avoid unnecessary packages and abstractions.
- Use deterministic, fictional sample data when needed.
- Implement only the infrastructure necessary to prove the technical flow.
- Include basic automated tests.
- Start and inspect the application or service.
- Verify actual behavior.
- Commit a working state.

For a web application, this might mean:

Frontend → API → Database.

For another project type, use the equivalent minimal end-to-end flow.

Do not force web technologies onto non-web projects.

Do not implement unrelated business functionality.

**Done means:** the smallest end-to-end flow works, has been tested and can be reproduced.

---

## STEP 2 — CONTEXT FILES

Document the architecture that was actually implemented.

Create or complete:

### `specs/guidelines/architecture.md`

Include:

- Confirmed technology stack.
- Reasons for technology choices.
- Package/module boundaries.
- Data flow.
- Dependency rules.
- Persistence and API strategy when applicable.
- Checkable architectural constraints.

### `specs/guidelines/ui.md`

For projects with a user interface, define:

- Visual direction.
- Design tokens.
- Colors, typography, spacing and radii.
- Reusable components.
- Responsive layout rules.
- Accessibility.
- Empty, loading, error and disabled states.

Do not enforce UI conventions on projects without a graphical interface.

### `specs/guidelines/quality.md`

Define:

- Testing conventions.
- Type checking, when applicable.
- Linting and formatting.
- Acceptance criteria.
- Code review expectations.
- Definition of Done.

### `specs/guidelines/security.md`

Define security requirements proportionate to the actual project:

- Secrets.
- Authentication and authorization when needed.
- Data protection.
- Input validation.
- Dependency security.
- Deployment restrictions.
- Destructive operation safeguards.

### Root `AGENTS.md`

Keep it thin.

It should contain:

- Short project description.
- Essential development commands.
- Non-negotiable rules.
- References to the guidelines.
- Instructions for when the agent must stop and ask.

Do not duplicate the full guidelines inside `AGENTS.md`.

Prefer concise, objectively verifiable rules.

---

## STEP 3 — ENFORCEABLE RULES

Identify which architectural rules can be automatically enforced.

Examples:

- Dependency placement.
- Module boundaries.
- Linting.
- Formatting.
- Type checking.
- Required tests.
- Secret detection.
- Restricted files and directories.

Use the best supported mechanism for each rule.

Prefer:

- Tests.
- Linters.
- Validation scripts.
- GitHub Actions.
- Existing tooling.

Do not assume that Claude Code `PreToolUse` hooks work in Codex.

Check the current Codex documentation before using agent-specific mechanisms.

For every implemented check:

1. Demonstrate a valid case that passes.
2. Demonstrate an invalid case that fails.
3. Verify that the check does not incorrectly block legitimate operations.
4. Document how the rule is enforced.

Do not create complicated hooks for rules that cannot be reliably checked.

---

## STEP 4 — ROADMAP

Create:

`.agents/skills/roadmap/SKILL.md`

The Skill must guide the user through product roadmap planning.

Before starting:

- Read project architecture.
- Read UI and quality guidelines where relevant.
- Read existing product context.
- Identify the main user experience.

Interview the user using short rounds of questions.

Aim for no more than two rounds when practical, with recommended options.

Default to exactly four epics for the initial MVP, following the original methodology, unless the user explicitly approves a different scope.

Every epic must be independently useful and verifiable.

Epic 1 should deliver the smallest functional version of the project's main user experience.

For each epic, describe:

1. What the user can do afterwards.
2. What will be visible or otherwise observable.
3. What is explicitly excluded.
4. How completion can be verified.

Write:

`specs/roadmap.md`

Commit the roadmap once approved.

**Do not implement code during this step.**

---

## STEP 5 — SPECIFICATION

Create the process for specifying one epic or feature.

Use these files:

- `specs/{nr}-{slug}-brainstorming.md`
- `specs/{nr}-{slug}-specification.md`

The number must contain two digits.

### Brainstorming

Read the roadmap and relevant project guidelines.

Ask one round of questions at a time.

Append the questions to the brainstorming file using selectable Markdown options:

`[ ] Option`

Mark the recommended option as selected.

Stop and wait for the user to answer.

Do not invent answers.

Do not rewrite previous questions or confirmed answers. Append clarifications instead.

Cover:

- Functional requirements.
- Screens and interactions.
- Data read and written.
- APIs and external dependencies.
- Validation.
- Errors and edge cases.

For visual applications, provide ASCII wireframes and obtain feedback before finalizing the specification.

### Specification

Once the required decisions are confirmed, create the complete specification.

Include:

- Expected functionality.
- Data model and contracts.
- Screens/interfaces.
- Empty, loading and error states.
- API behavior, when applicable.
- Validation rules.
- Explicit exclusions.
- Numbered acceptance checks.

Every acceptance check must describe what to do and what result to expect.

Commit the brainstorming and specification files.

**Do not implement the feature yet.**

---

## STEP 6 — SPEC SKILL

Implement:

`.agents/skills/spec/SKILL.md`

This Skill must execute the STEP 5 process.

It should support:

- Existing roadmap epics, by number.
- New features, by name.

It must:

- Read guidelines.
- Resolve the selected epic or feature.
- Start or resume brainstorming.
- Preserve existing decisions.
- Request clarification where needed.
- Produce the specification.
- Stop before implementation.
- Commit approved documentation changes.

Use current Codex Skill conventions.

Do not assume that slash commands from another coding agent are automatically supported.

---

## STEP 7 — BUILD

Define the implementation process for an approved specification.

Before implementing:

- Read the specification.
- Read applicable guidelines.
- Review acceptance criteria.
- Identify contradictions.
- Stop and ask when an important conflict exists.

During implementation:

1. Create a task list.
2. Implement small, coherent increments.
3. Keep the application working between increments.
4. Maintain a progress file.
5. Run relevant tests.
6. Review errors and regressions.
7. Commit working increments.
8. Update architecture documentation when implementation changes confirmed boundaries.

Create:

- `specs/{nr}-{slug}-progress.md`
- `specs/{nr}-{slug}-testplan.md`

The test plan must map directly to specification acceptance checks.

### Browser verification

For web applications:

- Open and operate the application using Playwright.
- Verify all browser acceptance checks.
- Capture screenshots at 390px and 1440px widths.
- Inspect the screenshots.
- Review spacing, hierarchy, readability, accessibility and responsive behavior.
- Identify the five most valuable visual improvements.
- Apply justified corrections and verify again.

Browser interaction tests and automated regression tests are complementary. Use both where they add value.

For non-visual applications, replace screenshots with appropriate API, CLI or integration verification.

Do not finish while acceptance checks fail.

---

## STEP 8 — DEV SKILL

Implement:

`.agents/skills/dev/SKILL.md`

This Skill must automate the STEP 7 development methodology.

It must:

- Locate and read the requested specification.
- Validate consistency with guidelines.
- Prepare and maintain a task list.
- Implement the requested functionality.
- Maintain the progress file.
- Create the test plan.
- Run automated tests.
- Verify actual functionality.
- Perform visual verification when applicable.
- Fix defects.
- Update relevant documentation.
- Commit completed increments.
- Report remaining limitations.

Never deploy to production or perform destructive operations without explicit authorization.

---

# 5. NEW_PROJECT_PROMPT.md — Required

This file is mandatory.

Create `NEW_PROJECT_PROMPT.md` in the repository root.

Its purpose is to provide the **exact reusable prompt that the user should send to Codex whenever starting another project**.

The file must contain:

### A. Quick instructions

Explain how to create a project from the GitHub repository using either:

- GitHub's **Use this template** function.
- GitHub CLI, when available and authenticated.

Explain that creating a project from a template generates an independent repository, not a fork.

Clarify that future changes to the original template are not automatically applied to existing projects.

### B. Ready-to-copy prompt

Include a complete prompt similar to the following, with easily replaceable placeholders:

> We are going to create a new software project.
>
> Project name: `[PROJECT_NAME]`
>
> Initial idea: `[SHORT_DESCRIPTION]`
>
> Use the GitHub template:
>
> `[GITHUB_TEMPLATE_URL]`
>
> Create an independent project from this template, without modifying the original repository.
>
> If this workspace is already a repository created from the template, continue there instead of creating another one.
>
> Read `AGENTS.md` and the available project Skills.
>
> Start the interactive `init-project` walkthrough.
>
> Guide me through the project's purpose, technology choices, architecture, walking skeleton, guidelines and roadmap.
>
> Ask questions in short rounds, recommend options and explain important trade-offs.
>
> Save decisions and progress so the process can be resumed in another session.
>
> Do not invent requirements or automatically implement unapproved features.
>
> Start in planning mode. Show the initial project setup plan and wait for approval of material decisions.

### C. Skill invocation

Explain how to explicitly invoke the initialization Skill using the syntax actually supported by the installed Codex version.

Do not invent commands.

Also explain how to resume an interrupted walkthrough.

### D. Example

Provide one fictional example of creating a new project.

The example must clearly distinguish sample information from reusable instructions.

### E. Publication behavior

If the new repository does not exist:

- Check whether GitHub access is available.
- Ask for the intended repository owner and visibility.
- Default to private.
- Require authorization before creating or publishing a remote repository.

If the project already exists:

- Do not overwrite it.
- Inspect its current state.
- Resume the relevant setup stage.

### F. Template URL maintenance

Once the template repository has been published, replace the template URL placeholder in `NEW_PROJECT_PROMPT.md` with its real GitHub URL.

Keep a clearly explained placeholder if the repository is not yet published.

**The user must be able to copy the prompt from this file and start a new project without needing to remember previous conversations.**

---

# 6. README.md — User Walkthrough

Create a practical README explaining the entire process.

Include:

- Purpose of the template.
- Repository structure.
- Eight-step methodology.
- Interactive initialization walkthrough.
- Available Codex Skills.
- How to create a project from GitHub.
- How to resume an unfinished project.
- How to specify an epic.
- How to develop an approved specification.
- How to verify and commit changes.
- How to update the template itself.

Use short, clear examples.

Provide a visible link to `NEW_PROJECT_PROMPT.md` near the beginning of the README.

Do not require the user to read extensive documentation before creating their first project.

---

# 7. Template validation

Create a lightweight validation mechanism, without introducing unnecessary dependencies.

Verify:

1. Required files and folders exist.
2. `AGENTS.md` references valid paths.
3. All Skills have valid manifests.
4. Documentation links are correct.
5. The initialization walkthrough is coherent and resumable.
6. Every workflow has defined inputs, outputs and stop conditions.
7. `NEW_PROJECT_PROMPT.md` contains a complete usable prompt.
8. No project-specific stack is hardcoded.
9. No secrets, real personal data or machine-specific paths are committed.
10. The template is compatible with GitHub's template-repository mechanism.

Include automated checks in GitHub Actions where practical.

Do not assume an application-specific build, test runner or package manager exists in this universal repository.

---

# 8. GitHub publication

Initialize Git and prepare meaningful commits.

Proposed repository name:

`agent-project-template`

Before publication:

- Check Git status.
- Check GitHub CLI authentication or available GitHub integration.
- Confirm the repository owner.
- Confirm visibility (private by default).
- Check that the repository name is not already in use.

Only after authorization:

1. Create the GitHub repository.
2. Push the validated template.
3. Enable the **Template repository** setting.
4. Verify the repository is accessible.
5. Verify the template workflow.
6. Update `NEW_PROJECT_PROMPT.md` with the real repository URL.
7. Commit and push that final documentation update.

Do not overwrite repositories, force-push or change visibility without permission.

If publication is not possible, leave the local repository ready and explain what remains.

---

# 9. Execution instructions

First inspect the current working directory.

If it contains existing application files, do not overwrite them. Propose a separate directory for the template.

Present a short implementation plan.

Then create the actual reusable template files, Skills, documentation and validation checks.

Do not stop after merely describing the proposed architecture.

Make sensible technical decisions for the template infrastructure without imposing them on future applications.

Stop and ask only for material decisions or required authorizations.

## Final deliverables

When finished, report:

1. Repository structure and files created.
2. Available Skills and their invocation method.
3. How the interactive walkthrough works.
4. Validation results.
5. Git status.
6. GitHub repository URL, if published.
7. The contents and location of `NEW_PROJECT_PROMPT.md`.
8. Exact steps to create the first project from the template.
9. Any limitations or pending decisions.

## Definition of Done

The template is complete when a user can:

1. Open the GitHub template repository.
2. Create an independent new repository.
3. Open that repository with Codex.
4. Copy the prompt from `NEW_PROJECT_PROMPT.md`.
5. Start or resume an interactive project walkthrough.
6. Confirm architecture decisions.
7. Build a minimal walking skeleton.
8. Define a roadmap.
9. Specify an epic.
10. Implement and verify it using the development Skill.

**The entire workflow must be reusable without depending on previous chat history.**