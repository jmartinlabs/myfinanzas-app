# Quality guidelines

## Template commands
Run `./scripts/validate-template` and `./scripts/test-validator` with Python 3.10+.
No package installation is required. CI runs both on pushes and pull requests.

## Enforced rules
The validator checks required structure, local Markdown file links (including AGENTS),
restricted Skill frontmatter, workflow contracts, initialization stage/state markers,
copyable prompt content, portable paths and common credential patterns. The test harness
runs valid fixtures and isolated corruptions for every check category, including legitimate
placeholder, interface and language choices. See [validator](../../scripts/validate-template)
and [regression tests](../../scripts/test-validator).
It is not a full Markdown/YAML parser, secret scanner or semantic architecture reviewer.
It checks local file destinations, not remote availability or heading anchors. Human review
must verify coherent instructions, neutral technology advice, privacy, and GitHub settings.
Project stacks in project guidelines are allowed: imposing a stack on all projects is not.
Add project-specific enforcement only after decisions; prove positive and negative cases.

## Project initialization — UNDECIDED
Record actual install, run, test, type-check, lint and formatting commands and their working
directories after bootstrap. Mark inapplicable tools explicitly, with reasons.
Use relevant unit/integration tests plus acceptance checks that can fail for broken behavior.
Review regressions, errors, accessibility and security in proportion to the change.
Definition of Done: approved scope implemented; every acceptance check passes with evidence;
required automated checks pass; documentation and progress updated; reviewed changes committed.
Blocked/skipped/unrun is not passed. No zero-test readiness claim.
