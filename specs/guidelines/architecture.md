# Architecture guidelines

## Current template architecture
Markdown methodology and repository-local Codex Skills; portable Python 3 standard-library
validation, with no application runtime dependencies. Python is template tooling only,
not a required language for derived applications. GitHub Actions invokes the same checks.
The Skills own workflow instructions; guidelines own decisions; feature documents own scope.

## Project initialization — UNDECIDED
Replace this section only with approved project decisions, retaining relevant methodology.
- Stack and versions: UNDECIDED; record alternatives, actual rationale and approval.
- Repository/package structure and module responsibilities: UNDECIDED.
- Communication, data flow and data ownership: UNDECIDED.
- Persistence/API strategy: UNDECIDED or justified not applicable.
- Dependency management and version/lock policy: UNDECIDED.
- Security and testing boundaries: UNDECIDED.
- Checkable constraints: UNDECIDED; map each to a command/test and file owner.
Document implemented reality after bootstrap. Proposals and unresolved questions must
be labeled; never invent a rationale or silently replace an approved decision.
