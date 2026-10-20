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
2. What will be visible or