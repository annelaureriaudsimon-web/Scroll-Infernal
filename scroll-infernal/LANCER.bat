@echo off
chcp 65001 >nul
title Scroll Infernal - serveur local
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js n'est pas installe sur cet ordinateur.
  echo  1. Sur la page qui s'ouvre, telecharge la version "LTS" de Node.js
  echo  2. Installe-la ^(Suivant, Suivant...^), puis relance ce fichier.
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)
node server\server.js --open
echo.
echo  Le serveur est arrete. Appuie sur une touche pour fermer cette fenetre.
pause >nul
