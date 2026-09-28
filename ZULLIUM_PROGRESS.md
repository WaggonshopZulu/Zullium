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
4. Build Shift Log / Reference sidebar navigation — **DONE** (2026-09-28, uncommitted; see below)
5. Scope the toolbar/ribbon — **DONE** (2026-09-28; see below)
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

**Two pre-existing failures found in the Task 2 sweep — FIXED 2026-09-28 (uncommitted, on top of `4488c69`):**
- `apps/standalone/src/lightweight/browser_routes.spec.ts` — the two LLM route tests now assert the removed
  `/api/llm-chat/*` routes answer 404 (one test, replaces both). 21/21 pass.
- `packages/trilium-core/src/services/hidden_subtree.spec.ts` — four failures from the Task 1 settings cut.
  `_options` now declares only `_optionsShortcuts` and `_optionsBackup`; the spec was rewritten to match. The
  `enforceDeleted` tests now use the `_lbLlmChat` launcher (the one remaining `enforceDeleted` entry). The
  "notInStandalone" test became "does not re-create the settings pages cut from the guard build".
  14/14 pass under both `apps/server` and `apps/standalone` runners.
- **Watch item:** the seeded fixture DB still carries the old upstream settings pages, and the definition does not
  delete pages it no longer lists. A fresh install builds only the two declared pages, so this only bites a database
  created before the cut. `OptionsDialog` lists every child of `_options` (`useChildNotes`), so if a stale database
  is ever reused, mark the withdrawn ids `enforceDeleted`. Decide when doing the admin-gated entry point (Task 8).

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

## Task #4 — Shift Log / Reference sidebar (2026-09-28)
Built from the Phase 2 blueprint text. **Mock-up differences, decided in favour of the written blueprint:** the mock-up
shows one root ("Cluny Security") with the year tree and Reference beneath it, and days oldest-first; the blueprint says
two top-level branches, newest first. Built as two top-level branches, newest first, keeping the mock-up's
year > month > day nesting.
- `packages/commons/src/lib/guard_structure.ts`: `SHIFT_LOG_NOTE_ID` (`shiftLogRoot`), `REFERENCE_NOTE_ID`
  (`referenceRoot`), `GUARD_ROOT_NOTE_IDS`.
- `packages/trilium-core/src/services/guard_structure.ts`: `ensureGuardStructure()` creates both notes under `root`
  (Shift Log first) and restores their labels. Called at the end of `checkHiddenSubtree`, which already runs on first
  start, every start and on change, in server, desktop and standalone. Shift Log carries `#calendarRoot`, `#sorted`
  and an inheritable `#sortDirection=desc`; the year, month and day titles (`2026`, `09 - September`, `27 - Sunday`)
  start with a number, so title order reversed is newest first at every level. Reference carries `#sorted`.
  A changed title or position is left alone.
- `bbranch.ts` `deleteBranch` refuses the two branches; client `branches.ts` `filterRootNote` also keeps them out of
  move/cut/clone/delete.
- Left pane cannot be hidden: `LeftPaneContainer` is always shown; `left_pane_toggle` replaced by a headless
  `LeftPaneResizer` (the resizer, minimum width 150 px, was only ever set up from the toggle); removed the
  `hideLeftPane` / `showLeftPane` / `toggleLeftPane` / `toggleZenMode` command handlers, the zen menu item, the desktop
  zen close button and the F9 default. Zen mode hid the whole interface including the sidebar.
- App opens today's day note on start (`app_context.openTodayNoteOnStartup`), which creates it on the first launch of a
  day. Skipped in secondary windows and when the URL names a note.
- New installs no longer import the upstream demo notes (`getDemoArchive` returns null in desktop and server).
- Tests: new `guard_structure.spec.ts` (4), new case in `branches.spec.ts`. Server and standalone runners green;
  typecheck clean.
- Full-suite sweep after Task 4 found two more Task 13 leftovers, fixed: `config.spec.ts` now asserts the AI assistant
  is absent; `loadSkillSheet` in `apps/server/src/core_assets.ts` (LLM skill sheets, no callers) removed with its spec.
  Client suite otherwise showed 2 load-only flakes (`login.spec`, `image_compression_dialog.spec`, pass alone).
  Full standalone suite not re-run after Task 4.
- **Not done / for later tasks:** the mobile layout still references the removed zen command (out of scope, Windows-first);
  the launch bar still lists a zen-mode launcher (Task 7); a session left open past midnight does not roll over to the
  new day's note until restart; title format is `27 - Sunday` rather than the mock-up's `Sun · Sept 27` (a title
  pattern that does not lead with the number would need `#sorted=dateNote` on each level, which the day-note service
  does not set); Shift Log / Reference remain renamable; standalone still imports the demo notes.

## Task #5 — toolbar and ribbon scope (2026-09-28)
Phase 2 blueprint scope: bold, italic, underline; highlight color; font family and size; font color; search; image insert.
- `type_widgets/text/toolbar.ts` rewritten: one item list (`TOOLBAR_ITEMS`) shared by the classic and floating bars, no
  block toolbar, no groups, nothing grouped behind an overflow button. `usesClassicToolbar` is now "classic unless a
  narrow view (the geo map pane) asks for the floating one"; the `textNoteEditorType` option and mobile branch are no
  longer read. The AI-assistant parameter is gone with the feature.
- `type_widgets/text/guard_palette.ts` (new): OneNote's 16 highlight colors (Yellow is the approved `#fde047`), its 10
  standard font colors, 9 font families all present on Windows, 13 sizes. `config.ts` sets `fontFamily`, `fontSize`,
  `fontColor` and `fontBackgroundColor` from it, with `documentColors: 0`. The custom color picker and "remove color"
  button are CKEditor's defaults and stay.
- Ribbon: `RibbonDefinition.ts` now holds only the formatting bar and the saved-search parameters panel. The tab strip and
  the note-actions menu are gone from `Ribbon.tsx`, and the formatting bar has no toggle command that could collapse it.
  Deleted `NoteMapTab`, `NotePropertiesTab`, `ScriptTab` (unreferenced). The other tab components remain because the
  experimental new-layout surfaces (status bar, note badges, inline title) still import them; that layout is reachable
  only from the dev-mode menu.
- Tests: `toolbar.spec.ts` rewritten, `RibbonDefinition.spec.ts` new, a fonts-and-colors case in `config.spec.ts`.
- **Search, decided 2026-09-28 by the user:** toolbar search finds within the current note; sidebar search is across all
  notes with a selectable date range. Built:
  - `packages/ckeditor5/src/plugins/guard_toolbar.ts` (new, `TriliumGuardToolbar`, registered in `plugins.ts`): a
    `findInNote` toolbar button ("Find in note", opens the existing find bar through `findInText`), and a text label
    beside every toolbar button (`withText`), with "Highlight" and "Font color" for the two color dropdowns.
  - `quick_search.ts`: "Entry dates" From / To date inputs and "Clear dates" under the search field; the search button
    now reads "Search" beside its icon. The range filters on the `#dateNote` label of Shift Log day notes
    (`#dateNote >= "…" #dateNote <= "…"`, either end optional, reversed range swapped), combines with typed words,
    and carries into "Show in full search". Reference pages have no entry date, so a range excludes them; leave the
    dates empty to search everything. New English strings under `quick-search.*`.
  - Tests: `guard_toolbar.spec.ts` (real Chromium; installed with `pnpm exec playwright install chromium`),
    `date_range_search.spec.ts` (real search over day notes), new cases in `quick_search.spec.ts`.
- **Fixed on the way:** the ribbon's formatting bar only rendered when the `textNoteEditorType` option equalled
  `ckeditor-classic` (a fresh database has that; a database missing it falls back to `ckeditor-balloon` and would show no
  toolbar). `FormattingToolbar.tsx` no longer reads the option; its spec no longer has the balloon cases.
- **Attachments, decided 2026-09-28 by the user: images and files.** `attachFile` ("Attach file", paper clip) in
  `guard_toolbar.ts` opens the system file picker (`FileDialogButtonView`, multiple files) and runs the existing
  `fileUpload` command, the same path a dropped or pasted file takes. `imageUpload` stays for pictures.
- **NEW STANDING REQUIREMENT (user, 2026-09-28): every icon needs a visible text label** (the user is neurodivergent and
  cannot read pictograms). See memory `icons-need-text-labels`. Done so far: editor toolbar, sidebar search button and
  date fields. Still icon-only, to be handled in Tasks 6 and 7: the launch bar (53 px column, needs widening or a
  horizontal layout), the global menu button, tree header buttons (collapse, scroll to active, tree settings), the tab
  row buttons, the title-row split-pane buttons, and every other `ActionButton` (about 40 uses; it is the shared
  icon-only button, and its `text` prop is only a tooltip today, so one change there can surface it as a label).
- **Left for later tasks:** keyboard shortcuts and typing shortcuts still work (Ctrl+K link, `# ` heading, `1. ` list,
  Ctrl+Z); the split-pane buttons in the note title row; the note context menu in the tree.

## Recommended next step
Task #6: strip window chrome (native menu bar, branded title bar, no dev tools / Inspect).
Tasks #9 (branding assets) and #10 (backup drive path) need one more concrete detail
from Andrew before they can start (see task list above).
