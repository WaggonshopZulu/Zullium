# Zullium / Daily Brief Logbook — Progress Log

Last updated: 2026-09-27 (session ending). Fork of TriliumNext/Trilium, repo lives at
`$HOME/build/repo` on Andrew's linked Windows machine's Cowork VM disk (native clone —
fast, survives across sessions). A slower FUSE-mounted mirror also exists at
`$HOME/mnt/Zullium/repo` — that is the eventual sync target (Task #12), not the working copy.

Full locked-in plan lives in the Claude Docs artifact:
https://claude.ai/code/artifact/1c9b04b2-6b57-4d16-8221-0f2e3f3de7cf
(tabs: Project Charter, Phase 1 — Component Audit, Phase 2 — UX & Branding Blueprint,
Phase 3 — Local Storage & Backup)

## ⚠️ Repo state warning
`git status` shows HEAD **detached** at `bf256ae5db`, with **424 files** changed and
**nothing committed** — all of Task 1, 2 and 13's work exists only as uncommitted
working-tree changes on this one machine's disk. `origin` still points at the upstream
`TriliumNext/Trilium` repo, not a fork of Andrew's own. Recommend committing to a local
branch soon as a safety net before doing more destructive work. Not done yet — flagging
for a decision, not acting on it unasked.

## 13-item task list (TaskCreate/TaskUpdate tracked)
1. Strip Settings/Options module — **DONE** (earlier session)
2. Remove scripting engine, relation map, attribute editor — **DONE** (this session)
3. Remove update-checker network call — **DONE** (2026-09-28, uncommitted; see below)
4. Build Shift Log / Reference sidebar navigation — NOT STARTED
5. Scope the toolbar/ribbon — NOT STARTED
6. Strip window chrome — NOT STARTED
7. Lock down launch bar — NOT STARTED
8. Build admin-gated entry point (Option C) — NOT STARTED
9. Wire in branding — NOT STARTED (assets at C:\Zullium\art)
10. Configure backup destination — NOT STARTED (needs exact external drive letter/path)
11. Build and smoke-test — NOT STARTED
12. Sync finished code back to C:\Zullium\repo — NOT STARTED
13. Remove the AI Chat feature entirely — **DONE** (earlier session)

## Task #2 — what was removed (this session)
Per the Phase 1 Component Audit, three features with **no admin gate — full removal**:
- **Scripting engine** — frontend script API/bundle executor, backend script engine +
  API, `/api/script/*` routes, `customRequestHandler`-driven arbitrary script routes
  (kept `customResourceProvider`, the safe static-file-serving half), the scheduler's
  cron-like script execution, the entity-event script hooks (`runOn*` relations), the
  TypeScript IntelliSense subsystem for script notes, script-backed launchers/custom
  widgets, script-backed saved searches, script-backed shared-note EJS templates, the
  `render` note type's execution path, the standalone `script-deployer` app.
- **Relation Map** — the visual graph note type widget and its API route.
- **Attribute Editor** — the ribbon's raw `#label #relation=value` typed-syntax editor
  and its "OwnedAttributesTab" host. **Scope call**: kept the sidebar's structured
  `AttributeList.tsx` editor — that one is not the risk the audit flagged.

~55+ files touched (deletions + edits). Full file-by-file list is in this session's
transcript if ever needed, but shouldn't be — the pattern below is what matters for any
follow-up work.

**Established pattern, reuse for Tasks 4-12:**
- Leave a note's own type enum/generic per-type code alone when removing its UI — let
  it become unreachable dead code rather than editing every switch/union site.
- Where a note type can no longer do anything (relationMap, llmChat from Task 13), make
  its detail view resolve to `"empty"` / report a graceful error instead of crashing.
- After deleting, run `pnpm typecheck` (from repo root, `export PATH="$HOME/.npm-global/bin:$PATH"`
  first) repeatedly until "No errors found." — twice in a row to confirm stability.
- Typecheck does NOT catch dead/broken *tests* referencing removed runtime behavior by
  string literal (note type names, route paths). After typecheck is clean, grep spec
  files for the removed feature's identifiers and check each hit by hand.
- Run tests with `npx vitest run <path>` from **`apps/server`** (not from
  `packages/trilium-core` directly — that package has no real vitest config of its own;
  its tests only run correctly through `apps/server`'s config, which includes
  `../../packages/trilium-core/src/**/*.spec.ts` and sets up the runtime context
  (`initContext()` etc.) trilium-core's code expects). Running vitest bare inside
  `packages/trilium-core` gives ~1800 false failures ("Context not initialized").
- `pnpm --filter <app> test` reliably times out at the 180s device_bash cap with zero
  output — always use `npx vitest run` directly instead.
- A module that only registers itself via `eventService.subscribe(...)` at import time
  (e.g. `handlers.ts`) does nothing unless something imports it. If you delete the one
  file that used to import it for another reason, you silently kill its side effects in
  BOTH production and tests. Watch for this exact trap when removing "the thing that
  used to call into" a still-needed side-effect-only module.

**Bugs this session's sweep caught and fixed (all now verified green):**
1. `apps/client/src/services/ws.spec.ts` — dead `execute-script` tests mocking the
   deleted `bundle.js`; removed.
2. **Real production bug**: removing `handlers`'s barrel export
   (`packages/trilium-core/src/index.ts`) also removed the only import that loaded
   `packages/trilium-core/src/services/handlers.ts` — which still holds
   sort-on-change, template-relation-copy, inverse-relation and
   hidden-subtree-check-on-deletion logic (all correctly KEPT, none of it was meant to
   be removed). That logic would have silently stopped running entirely. Fixed by
   restoring a side-effect-only `import "../../services/handlers.js";` in
   `packages/trilium-core/src/becca/entities/bnote.ts` (always loaded, so it's live in
   both real runtime and tests via `becca_easy_mocking.ts`).
3. `apps/server/src/share/routes.spec.ts` — a test still toggled
   `config.Security.backendScriptingEnabled = true` to exercise custom EJS share
   templates (now-removed). Rewrote it to assert the correct new behavior: a note with
   a `~shareTemplate` relation falls back to the default share template instead of
   erroring or leaking the template note's content.

**Verification results (all from this session, all green except two flagged
pre-existing items below):**
- `pnpm typecheck` (repo root): clean, confirmed stable across multiple runs.
- `apps/client` full vitest run: 4,605 passed, 0 failures (hit 175s cap before finishing
  the whole suite, but zero failures in everything it got through).
- `apps/server` + `packages/trilium-core` full vitest run (must run from apps/server —
  see pattern above): 4,400+ passed, 0 Task-2-related failures.
- `apps/standalone` full vitest run: 234+ passed, 0 failures (also hit the time cap).
- `packages/commons`: 833/833, complete run.
- `packages/codemirror`: 335/335, complete run.

**Two PRE-EXISTING failures found, NOT caused by Task 2, NOT fixed — still open:**
- `apps/standalone/src/lightweight/browser_routes.spec.ts` — "serves the LLM
  provider-models route" and "serves the LLM stream routes" both get 404 instead of
  400. Diff shows this is leftover from Task 13 (AI Chat removal, prior session) —
  the `/api/llm-chat/stream-start` / `stream-abort` route registrations were removed
  from this file but the corresponding tests weren't updated.
- `packages/trilium-core/src/services/hidden_subtree.spec.ts` — 4 failures, all about
  `_optionsPassword` / `_optionsEtapi` / `_optionsImages` settings pages. Looks like
  leftover from Task 1 (Settings/Options module removal, prior session).

Both are real bugs worth fixing but are **out of Task 2's scope** — flagged for a
dedicated cleanup pass, not touched this session.

## Task #3 — update-checker removal (2026-09-28)
Recovered from the VM disk into `C:\Zulliumecoveredepo`, committed as `cce19ec` on branch `zullium-work`
(Tasks 1, 2, 13). Task 3 is on top of that, uncommitted.
- The only automatic outbound call was the client-side `useTriliumUpdateStatus` hook in
  `apps/client/src/widgets/buttons/global_menu.tsx` (GitHub releases API, every 8 h). Removed the hook,
  `RELEASES_API_URL`, `parseLatestVersion`, the menu badge and the "download update" menu entry.
- Deleted `global_menu.spec.tsx` (covered only that hook). Removed `isUpdateAvailable` from `services/utils.ts`
  and its two tests; `compareVersions` kept. Removed the badge CSS from `global_menu.css`.
- Left alone on purpose: the inert `checkForUpdates` option (no reader, settings UI already gone), the
  `--global-menu-update-available-*` theme variables, translation keys, and the click-only releases link in
  `dialogs/incorrect_cpu_arch.tsx` (no automatic request).
- Verified: `pnpm typecheck` clean; `utils.spec.ts` 113/113. Dependencies installed with `pnpm install --frozen-lockfile`.
- Environment: run pnpm 12.6.0 (`npm i -g pnpm`); `core.fileMode=false` set locally on this copy (NTFS lost exec bits).

## Recommended next step
Task #4: Shift Log / Reference sidebar navigation (or the 2 known pre-existing spec failures first).
Tasks #9 (branding assets) and #10 (backup drive path) need one more concrete detail
from Andrew before they can start (see task list above).
