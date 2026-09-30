@echo off
rem Daily Brief Logbook - BETA launcher.
rem
rem Runs the app in portable mode: its notes live in the "data" folder beside this file, and its
rem window settings in "electron", so nothing is read from or written to the live logbook in
rem %AppData%. A different port keeps it from clashing with a live copy running at the same time.
rem
rem Layout this file expects:
rem   BETA\app\        the packaged app folder (contains trilium.exe)
rem   BETA\data\       created on first run; the beta notes - copy this folder to back them up
rem   BETA\electron\   created on first run; window settings only
setlocal
set "TRILIUM_DATA_DIR=%~dp0data"
set "TRILIUM_ELECTRON_DATA_DIR=%~dp0electron"
set "TRILIUM_PORT=37850"
start "" "%~dp0app\trilium.exe" %*
endlocal
