# B3 capture — diagnostic only, not acceptance CI

One instrumented API-suite run on Ubuntu24.04/Bun1.4.3, on the PR75 candidate
`b7bcbb6402bb548df1c41f69ceee8ea5ab1cbf2e`. No product or canonical test edits.
The added workflow runs only on opening the diagnostic PR from
`codex/diag-b3-linux-capture` into `codex/dev14-base-b`. No synchronize trigger,
automatic retry, merge intention, or production operations. The standard
`validate.yml` is unchanged and its result is separate.

OpenCode supplied the preload/helper (EXT-OPENCODE-B3-DIAG / B3-DIAG;
model self-reported DeepSeek V4.1 Flash, runtime identity unverified).
Copied byte-for-byte after Codex review and18/18 synthetic checks.
Codex added the runner and diagnostic workflow. Hashes enforced by run.py:

- Preload:10646d33056d7fe611d83eaa41a62a0782838f19c9be552aa9cf108dc8b92ab4
- Helper:5fea125bdf166c7ee7da0ab922a7f5c297fcd83ab78af7d54f8a179ed36bd311

The helper reads at most32/48-byte WAL/SHM headers, file sizes/inodes/mtime,
never SQLite rows/pages, SQL, keys or full stacks. It is a separate process
to avoid disturbing the parent's POSIX locks. Salts are compared as raw bytes.
Snapshots are not atomic across files; stable applies per descriptor only.
Instrumentation changes scheduling. Coherent observed headers do not prove an
I/O cause or exclude native parent state. Missing522 means INCONCLUSIVE, stop.

900-second suite timeout; terminate the process group, force-kill after5s if
needed. JSONL/summary artifacts only, seven-day retention, no database or key.
Suite exit is preserved. A captured522 is evidence to review, not root cause.
A green diagnostic run never closes B3 or authorizes PR75 merge.

The diagnostic PR must not be merged into Base B or main.
