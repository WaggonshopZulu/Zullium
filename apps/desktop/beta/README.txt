DAILY BRIEF LOGBOOK - BETA FOLDER
=================================

What this is
  A self-contained copy of the app with its own notes, separate from the live logbook.
  Nothing here reads or changes %AppData%\trilium-data.

What is in it
  app\        the program (zullium.exe and its files)
  data\       the beta notes. Created the first time the app is opened.
  electron\   window settings only. Created the first time the app is opened.
  Daily Brief Logbook (BETA).bat           opens the app for the team
  Daily Brief Logbook (BETA) - Admin.bat   opens the admin window (keep off the shared desktop)

First run
  Double-click "Daily Brief Logbook (BETA).bat". Choose "Start a new logbook".
  The app opens on today's page in the Daily Shift Log.

Backing up (at every shift change)
  Close the app, then copy the whole "data" folder somewhere else, for example
  data-2026-10-01-0700. Closing first makes sure nothing is half-written.
  To go back to a backup, close the app, rename "data" to "data-broken", and
  rename the backup folder to "data".

Finding an older note
  Click "Search" in the top bar, type a word or phrase, and press Enter.
  Ctrl+J opens "Jump to note", which matches page titles; press Ctrl+Enter there
  to search the text of every page instead.

Updating the program
  Close the app, replace the "app" folder with the new one, and leave "data" alone.

Starting over
  Close the app and delete the "data" and "electron" folders.
