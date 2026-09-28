# Zullium / Daily Brief Logbook — Progress Log

Last updated: 2026-09-28 (Task 8 done). Fork of TriliumNext/Trilium, repo lives at
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
6. Strip window chrome — **DONE** (2026-09-28; see below)
7. Lock down launch bar — **DONE, plus a chunk of the icon-label pass** (2026-09-28; see below). The rest of the
   icon-label pass needs a decision — see below.
8. Build admin-gated entry point (Option C) — **DONE** (2026-09-28; see below)
9. Wire in branding — **DONE** (2026-09-28; see below).
10. Configure backup destination — mostly pre-built, **deliberately deferred by the user** (2026-09-28):
    decided only once the app is deliverable and installed on its dedicated workstation, not before —
    the external drive's folder path isn't known until then. `apps/client/.../options/backup.tsx` already
    has a working "Select Location" folder picker (Electron only) writing to the `customDbBackupDir` option, with a
    reset-to-default button; `backup_provider.ts` resolves it each run rather than caching a drive letter, so a
    reassigned drive letter does not break it as long as the folder still exists. `_optionsBackup` is one of the two
    settings pages Task 4 kept, admin-gated — now reachable through Task 8's admin mode. No more code to write here;
    this is a hands-on step for the workstation itself, not a development task.
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

## Task #6 — window chrome (2026-09-28)
- **App name, one source of truth.** New `packages/commons/src/lib/guard_structure.js`-style shared constant
  `APP_NAME = "Daily Brief Logbook"` in `packages/commons/src/lib/app_name.ts`. Wired into: `apps/desktop/src/app-info.ts`
  (`PRODUCT_NAME`, feeds the packaged `.exe`/forge name and `app.setName()`), the two `BrowserWindow` `title` options in
  `apps/desktop/src/services/window.ts` (main window, extra window), `apps/client/index.html` `<title>` (literal, an
  HTML file can't import), and `apps/client/src/components/tab_manager.ts`'s `updateDocumentTitle`. No "Trilium" or
  "TriliumNext" text now reaches the title bar, taskbar or `.exe` name. **Not touched, out of scope for a Windows-first
  desktop build:** the standalone/mobile `<title>`, and `apps/desktop/e2e/example.spec.ts` (asserts `"Trilium Notes"`
  and opens the now-removed "Trilium Demo" note; e2e isn't run by the routine suite — revisit at Task 11).
- **Native menu bar.** `setupApplicationMenu()` in `window.ts` now installs only `{ role: "editMenu" }` — no File, View
  or Window menu at all, so nothing shows if the hidden bar is revealed with Alt (Windows convention). Previously it
  kept `fileMenu`/`viewMenu`/`windowMenu`, which meant View's **Reload, Force Reload and Toggle Developer Tools were
  one Alt-press away** — a real gap the charter's "no dev tools" line didn't cover on its own. Edit is kept because
  some Windows Electron/Chromium versions need a menu for Ctrl+C/V/X/A/Z to route into inputs reliably; this was
  already the existing code's own stated reason for keeping a menu at all.
- **No dev tools, code-level.** Removed everywhere, not just hidden: the `openDevTools` keyboard action (Ctrl+Shift+I)
  from `keyboard_actions.ts` and its interface entry; the `openDevToolsCommand` handler in `entrypoints.ts`; the command
  type in `app_context.ts`; the menu item in `global_menu.tsx`'s Advanced submenu; the shortcut row in `help.tsx`; and
  the whole IPC path — `toggleDevTools()` in `preload.ts` and `electron_api_interface.ts`, the `toggle-dev-tools`
  `ipcMain` handler in `window.ts`. Left alone on purpose: `isDevToolsDocked()` / `dev-tools-dock-changed` (used by
  `desktop.ts` to suspend background transparency effects if DevTools ever is open by some other means — reacts to the
  state, doesn't open it, so keeping it isn't a new way in).
- **Right-click Inspect: already true, nothing to remove.** Confirmed `apps/client/src/menus/electron_context_menu.ts`
  replaces Chromium's menu entirely with Trilium's own (Cut/Copy/Paste/spellcheck/note actions) — Electron ships no
  context menu of its own absent this code, so there was never an "Inspect Element" entry to strip.
- **Window controls: unmodified**, confirmed — minimize/maximize/close and the native title bar overlay code
  (`native_window.ts`) were not touched.
- **Icon labels (standing rule):** not done this task. Deferred to Task 7 together with the launch bar rework, since
  the launch bar's 53px column is the one that actually needs a layout change to fit labels, and doing the global menu
  button / tree header buttons / tab row / title-row buttons separately first would mean touching the same files twice.
- **The two flagged findings above, resolved 2026-09-28 on the user's instructions:**
  1. **Advanced submenu (Hidden Subtree, Search History, Backend Log, SQL Console, SQL Console History, Reload
     Frontend) — disabled, not deleted.** User's call: "turn it to simply non-clickable" rather than a Task 2-style
     code removal, since Task 8 will need this menu again for admin mode. `FormDropdownSubmenu`
     (`widgets/react/FormList.tsx`) gained a `disabled` prop: when set, the submenu never opens (click handler no-ops)
     **and its children are never mounted at all** — not a CSS grey-out, so nothing inside is reachable by click,
     hover-open (the desktop CSS opens submenus on `:hover`) or Tab. `global_menu.tsx`'s `AdvancedMenu` now passes
     `disabled` unconditionally, with a "TODO(Task 8)" comment to gate it on admin mode instead once that exists,
     and a tooltip ("Off in this build"). Closed the one thing a disabled *menu* alone wouldn't stop: `showSQLConsole`'s
     own default keyboard shortcut (Alt+O) is removed at the source in `keyboard_actions.ts`, so the menu being
     unclickable isn't undermined by a live shortcut. New tests in `FormList.spec.tsx` cover both states.
  2. **About dialog — rebranded, not removed.** User's call: rebrand it. Rewrote `about.tsx`/`.css`: heading is
     `APP_NAME`; dropped the Trilium Notes heading, the `triliumnotes.org` link, the GitHub links (repo, commit,
     contributors), the contributor list and its hover-history tooltips, the channel badge (nightly/standalone — not
     meaningful for one fixed build), and the donate button/styling, along with the `contributors.json` import and the
     now-unused CSS behind all of it. Kept: version/DB/sync-protocol info, build date and revision, the data directory
     (still useful for support), and one footer link — AGPL-3.0, repointed from Trilium's own docs site to the
     canonical `gnu.org` license text, plus a plain attribution line ("Based on TriliumNext Notes, licensed under
     AGPL-3.0."), which is what AGPL's notice-preservation actually asks for, without carrying Trilium's own community
     branding. Global menu's "About Trilium Notes" label is now "About Daily Brief Logbook". `en-GB` catalog updated
     to match (and given the "licence" spelling it was missing). New `about.spec.tsx` covers the branding and the
     kept/dropped content. (Reachability of the menu item itself is unaffected — it opens fine, unlike Advanced above,
     since there was never a risk in the dialog itself, only in its wording.)
  - **Testing note for whoever touches this dialog again:** its `<Trans i18nKey=.../>` needs `react-i18next` mocked
    in a unit test (`vi.mock("react-i18next", () => ({ Trans: ... }))`) — without it, Preact throws "Invalid hook
    call" *inside* `Modal`'s render once `show` flips true, which Preact swallows without failing the test, so the
    dialog just silently renders empty. `about.spec.tsx` has the working mock to copy.
- Tests: `main.spec.ts`'s `getDemoArchive` assertion was still expecting a `Buffer` from the pre-Task-4 desktop code —
  a leftover from Task 4, caught and fixed here (now asserts `null`). `window.spec.ts`'s menu-template test rewritten
  for the Edit-only menu. New case in `tab_manager.spec.ts` for the title. `preload.spec.ts` / `window.spec.ts` had
  their `toggleDevTools`/`toggle-dev-tools` cases removed along with the code.
- **Pre-existing failure found, NOT caused by Task 6, NOT fixed — flagged:** `apps/desktop/src/services/startup_metrics.spec.ts`
  ("records a metric relative to the baseline...") fails consistently, alone and in the full suite, on an untouched
  file (`startup_metrics.ts`, unrelated to anything in this or any earlier Zullium commit). `writeFileSync` is never
  called even though the test stubs `TRILIUM_ENV=dev` before importing the module; root cause not chased down — could
  be this recovered environment (Node v24.16.0 vs the repo's `.nvmrc` v24.21.0) rather than the code. Needs a dedicated
  look.
- **Another Task 2/13 leftover found and FIXED, from finally running the full standalone suite (flagged as not yet
  re-run after Task 4; this is that re-run):** `apps/standalone/src/lightweight/llm_skills.ts` imported
  `@triliumnext/core/src/services/llm/skills.js` and two `.md` files under `packages/trilium-core/src/assets/llm/skills/`
  — all deleted by Task 2, so the module (and its spec) failed to resolve. It registered a skill reader for the LLM
  tool stack Task 13 also removed — dead code with no caller worth keeping. Deleted the module, its spec, and the
  `import()` call site in `local-server-worker.ts`. Also removed two now-dangling `build.copy(".../assets/llm/skills", …)`
  lines (`apps/server/scripts/build.ts`, `apps/desktop/scripts/build.ts`) that would have thrown `ENOENT` at Task 11's
  build step, copying a directory Task 2 already deleted.
- **Full-suite verification after all of Task 6 and the above fix:** client 404/5450 green, server 367/5161 (48 skipped,
  pre-existing) green, standalone 261/4219 (32 skipped, pre-existing) green, desktop 24/25 files green — only the
  flagged `startup_metrics.spec.ts` still fails, confirmed unrelated.

## Task #7 — launch bar lockdown, plus findings from the sweep (2026-09-28)

**Drag lock (code-level).** `note_tree.ts`'s `dragStart` blocked only the six named launch-bar container ids
(`isLaunchBarConfig(noteId)`) — an individual launcher note (any note with `noteType === "launcher"`, wherever it
sits in that subtree) was never covered. Extended the check to also block `noteType === "launcher"`. New `dragStart`
describe block in `note_tree.spec.ts`.

**No add/configure affordance (structural).** Removed every guard-facing path into the `_lbRoot` tree editor:
- `launcher_button_context_menu.ts`: dropped "Configure launch bar" and "Remove from launch bar" from the launch
  bar's own right-click menu (along with `removeFromLaunchBar`/`canRemoveFromLaunchBar`, now unused). Kept the
  "Launch bar orientation" submenu — a display preference, not content-editing, and outside the blueprint's stated
  concern. New `launcher_button_context_menu.spec.ts`.
- `global_menu.tsx`: removed the "Configure Launchbar" item entirely (not disabled — the blueprint calls for no
  affordance at all here, unlike Advanced/Options below).
- `command_registry.ts`: removed the "Configure Launch Bar" and "Search History" command-palette entries (see the
  bypass below).
- The underlying capability — `_lbRoot`, `showLaunchBarSubtreeCommand`, `LauncherContextMenu`,
  `showLaunchBarManagementContextMenu` (now dead, its only caller was the `left_pane_toggle` Task 4 deleted) — is
  untouched, for Task 8's admin mode to wire a way back in.

**A real gap in Task 6's Advanced-menu fix, found and closed: the command palette (Ctrl+Shift+J) bypassed it
entirely.** Every `keyboard_actions.ts` entry auto-registers into the palette (`command_registry.ts`
`registerKeyboardActions`) unless marked `ignoreFromCommandPalette`, independent of whether its menu item is
disabled. `showSQLConsole` and `showBackendLog` are keyboard actions without that flag — a guard could press
Ctrl+Shift+J, type "SQL", and reach the console directly, disabled menu or not. Added `ignoreFromCommandPalette: true`
to both. (`showHiddenSubtree`/`showSearchHistory`/`showSQLConsoleHistory` are plain `MenuItem`s, not keyboard actions,
so they were never auto-registered — but `showSearchHistory` **was** manually registered in `command_registry.ts`
as `"show-search-history"`, a second, separate bypass; removed alongside `"show-launch-bar"`.) This closes the gap
in Task 6's fix from the same command-palette angle Task 6 hadn't checked. `command_registry.spec.ts` updated to
assert both stay unregistered.

**Extended the same "disabled, not deleted" treatment to Options/Settings — user precedent applied, not a fresh ask.**
While mapping the launch bar's default visible set, found `_lbSettings` → `showOptions` sitting in
`desktopVisibleLaunchers` *and* `global_menu.tsx`'s own gear icon — both fully guard-reachable, leading to the
Shortcuts and Backup pages Phase 1's audit already classified "Keep — admin-gated, not guard-facing." No task has
built that gate yet. This is the same shape of gap as Task 6's Advanced menu, and the user's decision there ("turn it
to simply non-clickable") generalizes directly, so applied it rather than reopening the question: `global_menu.tsx`'s
"Options" `MenuItem` is now `disabled` with a "TODO(Task 8)" comment, same pattern as Advanced. **Flag, not yet
touched: `_lbSettings` itself is still a live, clickable launcher icon in the default visible bar** (a launcher
button, not a menu item — the `disabled` mechanism used for menu items doesn't apply to it) — pressing it still opens
the same now-mostly-harmless-but-still-reachable Options dialog. Needs its own fix (most likely: give it the same
`enforceDeleted` treatment as `_zenMode`/`_lbSidebarChat` below, or move it out of the default visible set) —
deliberately left alone pending the user's read of this file, since it's adjacent to the still-open "should the
default visible launcher set be curated" question below.

**Two dead launchers, fixed (real bugs, not judgment calls).** `_zenMode` (`command: "toggleZenMode"`, a command
Task 6 deleted) and `_lbSidebarChat` (`builtinWidget: "sidebarChat"`, never a case in `LauncherContainer.tsx`'s
`initBuiltinWidget` switch — orphaned since Task 13 removed AI Chat) both pointed at nothing. Marked
`enforceDeleted: true`, matching the existing `_lbLlmChat` pattern. `hidden_subtree_launcherbar.spec.ts` updated.

**Also confirmed, no work needed:** the "should the default *visible* launcher set itself be curated for guards"
question flagged after reading `hidden_subtree_launcherbar.ts` (Settings gear aside — above) mostly resolves itself:
`_commandPalette` and `_lbBackendLog` are in `desktopAvailableLaunchers`, not the visible set, and with "Configure
Launch Bar" now unreachable, a guard has no way to move them into the visible bar at all.

## Icon labels — the full pass (2026-09-28, decided by the user: "widen the rail and give everything labels")

**Tree header:** labelled the tree's three floating buttons (Collapse, Scroll to active note, Tree settings) —
`note_tree.ts`'s `.tree-actions` bar had room to grow, so this was a straightforward CSS change (flex `gap` instead
of fixed `inset-inline-end` offsets per button, plus a text `<span>` next to each icon).

**`ActionButton` (`widgets/react/ActionButton.tsx`), the shared component behind roughly 40 call sites across the
app, now shows its `text` as a visible label by default**, not only as a hover tooltip. A button with a visible
label and no keyboard shortcut now carries no tooltip at all (nothing left for one to add); a button that does have
a shortcut still gets one, carrying just the shortcut hint rather than repeating the label. New `hideLabel` prop
keeps the old icon-only square + full tooltip + `aria-label` behaviour, documented as being for "a repeating
micro-control inside something already tight for room" — not a general opt-out. CSS: `.icon-action` (style.css,
theme-next/forms.css) is now `auto`-width with a flex row and a gap instead of a fixed icon-sized square;
`.action-button-label` resets off the icon's own (often much larger) font-size; `.action-button-icon-only` keeps the
old fixed square for `hideLabel` buttons. `.tn-tool-button` (the overlay controls that float over a map/diagram
canvas, and the calendar widget's own internal buttons) is a **separate, untouched class** — genuinely different,
space-constrained context, left alone rather than forced through the same treatment.

**The vertical launch bar rail is widened from 58px to 190px** (`--launcher-pane-vert-size`,
`theme-next/base.css`), with a new, separate `--launcher-pane-vert-button-height` (40px) token — a button's height
no longer equals the rail's width, so widening the rail doesn't turn every button into an oversized square. Vertical
buttons are now a left-aligned icon+label row (`theme-next/shell.css`) instead of a centred icon in a square; icon
size trimmed from 150% to 120% now that a label sits beside it. The global menu button gets the same treatment: a
"Menu" label added next to its SVG crest for the vertical layout. Most of the default visible bar (New Note, Search,
Jump To, Recent Changes, Today, Deleted Notes) already routed through `ActionButton`/`LaunchBarActionButton`, so
picked up labels for free; `LaunchBarDropdownButton` (Bookmarks, Calendar) needed one small fix — it already
received a `title` string for its tooltip, now also rendered as a visible label. `SyncStatus` is unaffected: it only
renders once a sync server is configured, which this build's single-workstation design never does.

**Not covered in this pass, flagged rather than silently swept in or ignored:**
- **Horizontal launch bar layout** (an alternate orientation, off by default, reachable via the launch bar's own
  right-click "Launch bar orientation"): still forces the old fixed-square button sizing, so a label may overflow
  the button if someone switches to it. Not broken-crashing, just not redesigned to match — needs the same kind of
  work the vertical rail got, if this orientation matters in practice.
- **The tab row's own close/pin buttons** (`tab_row.ts`): hand-rolled markup, not routed through `ActionButton`, so
  untouched by this pass either way. Still the one place raised as a genuine trade-off (a full text label repeated
  down a scrolling strip of many open tabs) rather than a simple width fix — worth a specific look before deciding.
- **`.tn-tool-button`** (map/diagram overlay controls, the calendar widget's internal day/month buttons): a second,
  smaller set of icon-only controls outside `ActionButton` entirely. Not swept in.
- A full sweep for any *other* hand-rolled (non-`ActionButton`) icon-only button elsewhere in the app has not been
  done — only what surfaced while working through the launch bar and tree.

**Verification:** typecheck clean throughout. New/updated tests: `ActionButton.spec.tsx` and
`ActionButton.mobile.spec.tsx` (label-by-default, `hideLabel`, tooltip-carries-shortcut-only, touch-device
behaviour), `launch_bar_widgets.spec.tsx` (new, `LaunchBarDropdownButton`'s label). Full suites after everything in
this Task 7 entry: client 406/5464, server 367/5162 (48 pre-existing skips), standalone 261/4220 (32 pre-existing
skips) — all clean. (One server failure seen mid-session, `setup_marker.spec.ts`, was a stale `document.db` file
left on disk by an earlier interrupted run on this machine — not a code issue; cleared by deleting the stray file,
confirmed on a clean rerun.) **Not verified: the actual rendered layout** — CSS and structure only, no live/visual
check. The user should look at the built app once and say if anything reads wrong.

## Task #8 — admin-gated entry point (2026-09-28)
Built the blueprint's approved Option C: one command-line flag (`--admin`) gates a second, separate
window into the app's main process, so Andrew reaches admin mode through a shortcut whose target has
`--admin` appended — kept off the shared desktop, or password-protected at its location — while every
ordinary launch or shared-desktop icon opens the same guard-only window it always has.

- **Per-window, not per-process.** Electron's `requestSingleInstanceLock()` means only one process ever
  really runs; a second launch just forwards its command line to the first via `second-instance` and that
  first process decides what to do. Gating admin mode on the *process* would risk the single-instance lock
  turning an admin launch into "the" window a guard's plain click later focuses. Instead, `--admin` always
  opens a brand-new **extra** window carrying `?admin=1` in its URL, and `createMainWindow` — the one
  window a plain launch or a plain relaunch's second-instance focus always reveals — can never carry that
  marker; it has no `isAdmin` parameter at all. Checked both paths: first launch with `--admin`
  (`onReady()` in `main.ts`, after the main window is created) and relaunching with `--admin` while the
  app is already running (`second-instance`, ahead of the existing `--new-window` and focus-last-window
  branches).
- **The flag itself:** `apps/desktop/src/services/admin_mode.ts` (`wantsAdminMode(argv)` — checks for the
  literal `--admin` in `process.argv` / the forwarded `commandLine`). `apps/desktop/src/services/window.ts`'s
  `createExtraWindow` takes an `isAdmin` flag and appends `&admin=1` to the loaded URL when set.
- **Client-side gate:** `apps/client/src/services/admin_mode.ts` reads the `admin=1` marker once from
  `window.location.search` at module load (mirroring the existing `extraWindow=1` marker) and exposes
  `isAdminMode()` plus `requireAdminMode(action)`, which runs `action` only in admin mode and otherwise
  shows a toast ("This is only available in admin mode") and returns `undefined`.
- **Two layers of gating, everywhere it matters** — a UI-level hide plus a command-level refusal, so no
  future UI surface (menu, launcher, context menu, command palette) can reach a gated action unchecked:
  - UI level: `global_menu.tsx`'s Advanced submenu and Options item are `disabled={!isAdminMode()}`
    (replacing Task 7's unconditional disable and its "TODO(Task 8)" comment); Configure Launch Bar is
    re-added to both the global menu and the launch bar's own right-click context menu
    (`launcher_button_context_menu.ts`), each behind `isAdminMode()`.
  - Command level: `root_command_executor.ts`'s six previously-flagged commands (SQL Console, Backend Log,
    Hidden Subtree, Search History, SQL Console History, Configure Launch Bar) and `OptionsDialog.tsx`'s
    `showOptions` handler are all wrapped in `requireAdminMode()`.
- **Closed the `_lbSettings` gap Task 7 flagged** (the Settings launcher icon that bypassed the disabled
  Options menu entry): `hidden_subtree_launcherbar.ts`'s `_lbSettings` definition gained an `adminOnly`
  label, enforced like any other hidden-subtree attribute; `LauncherContainer.tsx` gained an exported
  `shouldShowLauncher(note)` that drops an `adminOnly` launcher outside admin mode (alongside the existing
  `desktopOnly` check), so the icon no longer renders in a guard's bar at all — belt-and-braces alongside
  `showOptions` itself now refusing to open even if reached another way.
- **Practical step still outside source control:** the actual second shortcut is a packaging/distribution
  detail (Task 11), not something buildable here — Andrew appends `--admin` to a Windows shortcut's
  target (`"...\Zullium.exe" --admin`) and keeps that shortcut off the shared desktop or protects its
  folder.

**Found, flagged, not fixed (out of scope for Task 8):** while grepping for every remaining path into the
six gated commands, `showOptions` turned up 8 more call sites passing a `section` id for a settings page
that no longer exists post-Task-1 audit — `_optionsSecurity` (`call_to_action_definitions.ts`),
`_optionsMedia` (`ocr_text.tsx`), `_optionsOther` (`revisions.tsx`, `recent_changes.tsx`,
`space_usage/context_menu.ts`), `_optionsPassword` (`password_not_set.tsx`), plus two dynamic-section
callers in `PopupEditor.tsx`. These predate this task — Task 8's gate makes them harmless for a guard (a
refusal toast instead of a broken/empty settings page) rather than making them worse, so nothing here
regresses, but the dangling section ids themselves are still there and unrelated to admin mode. Worth a
pass on its own before Task 9 or 11.

**Verification:** typecheck clean (`pnpm typecheck` — no errors). New/updated tests: desktop
`admin_mode.spec.ts` (new), `window.spec.ts` (`createExtraWindow` admin-URL case), `main.spec.ts` (admin
paths on both first launch and second-instance, plus a no-extra-window-on-ordinary-launch case); client
`admin_mode.spec.ts` (new), `root_command_executor.spec.ts` (new — all six gated commands, refused and
admin-mode-permitted), `launcher_button_context_menu.spec.ts` (Configure Launch Bar admin-gated),
`hidden_subtree_launcherbar.spec.ts` (`_lbSettings` carries `adminOnly`), `LauncherContainer.spec.tsx`
(`shouldShowLauncher` — ordinary/non-launcher/desktopOnly/adminOnly cases). Full suites: client 5479/5479,
server 5115/5163 (48 pre-existing skips, same as Task 7), standalone 4189/4221 (32 pre-existing skips,
same as Task 7), desktop 509/511 + 1 skipped, all clean **except one pre-existing, unrelated failure**:
`startup_metrics.spec.ts` fails on this Windows machine on a hardcoded POSIX path literal
(`/tmp/trilium-data/...`) compared against Node's own `path.join`, which produces backslashes on Windows —
confirmed reproducible in isolation and untouched by this task's files, not a regression.

## Task #9 — branding assets (2026-09-28)
Wired in the crest (the "Zulu One" coat of arms — crown, crossed swords, maple wreath, the mansion,
six figures, a banner reading "ZULU ONE") at the three placements the user picked; nothing at the
sidebar bottom, per that same call.

- **Source assets used:** only `crest_master.png` and `logo_master_gold_transparent.png` from
  `C:\Zullium\art` — the user's call: the other four files there (`House_Guards.jpg`, `37_Crisp.jpg`,
  `ZuluOne_Crest.jpg`, `ZuluRPT_6.jpg`) are earlier drafts that fed into those two finished pieces, left
  alone as source material rather than referenced from the app.
- **App icon** (`.exe`/taskbar, Windows and Linux packaging): `daily_brief_logbook.ico` already existed
  in `C:\Zullium\art` as a proper multi-resolution `.ico` (16/32/48/256px) with a square icon composition
  of the crest already prepared for small sizes — used as the source rather than re-deriving one, since
  it's already a considered square crop the poster-format masters aren't. Copied into
  `apps/desktop/electron-forge/app-icon/icon.ico`, and generated the full non-dev PNG size set
  (16/32/128/256/512/1000/1024) the packaging config also reads, resizing from the ico's own frames
  where available and upscaling from its 256px frame above that (mild softening at 512/1024, accepted —
  this fork ships Windows only, where 512/1024 icons see little use). Left untouched, out of scope for a
  single-workstation Windows build: the `-dev` (nightly-channel) variants, `icon.icns`/`icon.icon`
  (macOS), and `ios/apple-touch-icon.png` (mobile) — none of which this deployment builds.
- **Sidebar top — crest beside the name:** no such header existed before this; added
  `SidebarBrandHeader` (new widget, `apps/client/src/widgets/sidebar_brand_header.tsx`) as the first
  child of the note-tree pane (`LeftPaneContainer`, in `desktop_layout.tsx`), above the quick-search box.
  Shows the crest (28px tall) beside `APP_NAME`. The crest is decorative — `alt=""` and
  `aria-hidden="true"` — so a screen reader isn't told the name twice. Small-size legibility was flagged
  and the user's call was to use it anyway rather than wait for a simplified mark or drop detail below a
  size floor.
- **Empty pane — faint crest:** `type_widgets/Empty.css`'s `.note-detail-empty` (the "no note open"
  panel with the search box) now carries the crest as a low-opacity background image, centered, capped at
  60% width. Baked the low opacity into the PNG itself (5% alpha) rather than a CSS `opacity`/`filter`,
  since either of those would also fade the search box sitting in front of it.
- **About dialog:** per the user's call on Task 6's open question, added the crest above the version
  info, replacing the dialog's `<div className="icon" />` (an empty div previously styled with
  Trilium's own `icon.svg` via CSS `background-image` — now genuinely unused) with an `<img>` of the
  crest. The box sizing changed from a fixed 160×160 square to a height-160px auto-width box, since the
  crest is portrait (roughly 3:4), not square like Trilium's original mark.
- **New/changed asset files:** `apps/client/src/assets/brand-crest.png` (480×640, transparent gold,
  sidebar header + About dialog) and `brand-crest-faint.png` (675×900, same art at 5% alpha, empty pane).
  Generated from `logo_master_gold_transparent.png` via Pillow (trimmed to its content bounding box first,
  so neither asset wastes resolution on transparent margin).

**Found, flagged, not fixed (visible branding gap outside the three requested placements):** the
first-run setup screen, the login screen, and the "session locked" unlock screen (`setup.tsx`,
`login.tsx`, `setup_unlock.tsx`) all still show Trilium's own logo (`assets/icon-color.svg`), and the
brief Electron setup window itself uses a separate still-Trilium `icon.png` (`window.ts`'s `getIcon()`).
Neither is one of the three placements the user specified, and both sit in front of the actual person
using the app rather than deep in a menu, so it's worth a follow-up pass rather than leaving it assumed
to be covered by this task. `apps/client/src/assets/icon.svg` also became unreferenced by this task's
About dialog change — left in place rather than deleted, since it's a single small orphaned file and
deleting assets outside what this task touched felt like more scope than the branding placements called
for.

**Verification:** typecheck clean (`pnpm typecheck` — no errors). New test: `sidebar_brand_header.spec.tsx`
(crest is decorative and non-announced, app name renders). Full client suite: 5480/5480 passed. Not run
again for server/standalone/desktop — this task touched only `apps/client` and `apps/desktop`'s packaged
icon assets (no source code in either of those two apps' runtime paths), so the client suite is the
relevant one; the `pnpm typecheck` pass already covers cross-package type correctness. **Not verified:
the actual rendered result** — image generation and CSS sizing only, no live/visual check of the built
app. The user should look at the sidebar header, the empty pane, the About dialog, and the packaged
`.ico` once built, and say if any of the sizing or placement reads wrong.

## Recommended next step
Task #8 and Task #9 are both done (see above). Two flagged, not-yet-acted-on findings sit behind them:
the 8 dangling `showOptions` section-id call sites (Task 8, harmless under the admin gate but still worth
a cleanup pass), and the setup/login/unlock screens plus the setup window's own icon still showing
Trilium's original logo (Task 9, a real visible gap outside the three placements that were actually
asked for). Task #10 (backup) is deliberately on hold until the app is installed on its dedicated
workstation — no code left to write there regardless. That leaves Task #11 (build and smoke-test) as
the next actual development task, once the user wants it.
