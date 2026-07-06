@echo off
rem make-dosbox-shortcut.bat - run: node . d {filePath}
if "%~1"=="" (
  echo Usage: "%~nx0" "path\to\file or folder"
  exit /b 1
)
node . d "%~1"
exit /b 0