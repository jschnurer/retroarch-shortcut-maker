@echo off
rem make-ra-shortcut.bat - run: node . m {filePath} -o
if "%~1"=="" (
  echo Usage: "%~nx0" "path\to\file"
  exit /b 1
)
node . m "%~1" -o
exit /b 0