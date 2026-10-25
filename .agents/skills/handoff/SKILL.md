---
name: handoff
description: Stop an active agent session safely, consolidate recoverable work and preserve a verifiable checkpoint for another session.
---

# handoff — consolidate and stop

This is an explicit **shutdown/transfer command**, not a request to resume, finish the feature, or start another workstream. It applies to the current authorized session only. Follow AGENTS.md and project-specific approval/security rules; this Skill does not grant new permissions.

**MyFinanzas precedence:** follow `specs/methodology/myfinanzas-coordination.md` and local Git/GitHub policy. Never infer authorization for financial edits, E2.1 development, an outstanding PR merge, deployment or financial data use. Only the coordinator may update `specs/epic-board.md`; a delegated worker records its own checkpoint and reports to the coordinator. Respect branch/worktree ownership and prior unpublished work.

## Inputs
Read only the relevant current progress/checkpoint, Git status and active worker/tool state available in this session. Use existing task, branch, worktree, PR and approval evidence. Do not reload the entire project unless needed to prevent data loss.

## Outputs
A small durable checkpoint in an existing feature progress file, setup-progress file or coordinator-owned epic board; if none is suitable, use `specs/session-handoff.md` (one current handoff, no new documentation tree). Return a concise shutdown receipt with checkpoint path, branch/commit SHA, pending changes, real worker-stop status and next-session instruction.

## Procedure
1. **Freeze scope immediately.** Stop issuing new development, research, long tests, delegation, scheduling or PR/merge actions. Override any automatic orchestrator handoff/ready queue. Allow only the minimum steps to reach a safe operation boundary and preserve state. Do not try to finish acceptance criteria.
2. **Stop controlled workers.** Inspect the runtime's actual worker handles. Where supported, request cancellation/stop and a short final checkpoint; avoid waiting through lengthy investigation. Record each as `stopped`, `stop requested` or `unconfirmed` based on evidence. External Codex chats, separately launched tasks and workers without accessible controls are **not controlled** by this Skill: do not claim to stop them; tell the user which require manual interruption. If no worker tooling exists, say so.
3. **Inventory without destructive cleanup.** Check `git status`, active branch/HEAD SHA, relevant worktrees, current PR, uncommitted files and known owner of each change. Do not reset, discard, overwrite, delete a worktree, stash ambiguously owned files or amend someone else's commit. Leave blocked/unknown resources intact.
4. **Preserve authorized work.** If safe and permitted, review only owned, relevant changes (including staged history and secret/data leakage risk), then commit a clearly labeled WIP/checkpoint on the existing feature branch. Push only if project authorization permits and sensitive-history review succeeds. Never merge, deploy, open a new PR or expand scope by inference. If work cannot be safely committed/pushed, list exact pending files and that remote portability is **unverified**; do not pretend local changes survive a fresh cloud session.
5. **Record the minimum handoff.** Reuse the existing canonical progress/board file when writable and owned. Save: explicit `STOP REQUESTED — NO AUTO-RESUME`; feature and authorized scope; repo/branch/worktree/HEAD/PR; worker stop status; completed vs partial deliverables and uncommitted changes; real checks PASS/FAIL/UNRUN with evidence and candidate SHA; open bugs/blocked gates; approvals still valid versus pending; and **one next safe action**. Link to specs rather than copying long context. If persistence is unavailable, print the checkpoint to the user and mark it `not persisted`. Make this the linked current summary, superseding stale labels without deleting history. Include external client IDs, start/stop owners and uncontrolled workers; do not imply cross-client control.
6. **Conclude and stop.** Recheck that no new execution was intentionally started and that the checkpoint is accessible. Report `stopped` only where runtime confirmation exists, otherwise `unconfirmed`; distinguish local commits, remote commits, and missing persistence. The last message must not trigger further tasks or agents. Do not claim to control other sessions or background jobs.

## Next session
A separate user request such as `$orchestrate — inspect the latest handoff, verify its Git SHA and approvals, report state before proposing continuation` may re-open planning. The saved checkpoint grants **no** permission to resume work automatically; wait for the user's new instruction and any protected approvals.

## Quota exhaustion
If quota ends before this Skill can run, no shutdown or checkpoint is guaranteed. When quota returns, run `$handoff` **before** asking to continue; reconstruct what can be verified from Git/current worker state, and mark inaccessible context `unknown`. If a task is visibly still running, interrupt it using the client's stop control first, when available.

## Stop conditions
Stop once the minimum safe, non-destructive consolidation is complete, or sooner when access, ownership or authorization prevents safe persistence. Preserve blocker evidence; never bypass required QA, protected approvals or security checks by labeling unfinished work complete.
