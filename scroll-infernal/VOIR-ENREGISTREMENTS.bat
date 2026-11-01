@echo off
chcp 65001 >nul
set "F=%USERPROFILE%\ScrollInfernal-donnees\enregistrements.txt"
if exist "%~dp0server\data\enregistrements.txt" set "F=%~dp0server\data\enregistrements.txt"
if exist "%F%" (
  start "" notepad "%F%"
) else (
  echo.
  echo  Rien n'a ete enregistre pour l'instant.
  echo  Lance le jeu avec LANCER.bat, clique sur "Commencer l'enregistrement et creer un compte",
  echo  puis relance ce fichier.
  echo.
  pause
)
