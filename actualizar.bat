@echo off
cls
echo ====================================================
echo    ACTUALIZADOR AUTOMATICO (MODO RAPIDO)
echo ====================================================

:: 1. Agregamos todos los cambios
git add .

:: 2. Creamos un mensaje automatico con la fecha y hora
set mensaje=Actualizacion automatica: %date% %time%

:: 3. Hacemos el commit con ese mensaje generado
git commit -m "%mensaje%"

:: 4. Subimos a GitHub (de master local a main remoto)
echo.
echo Subiendo cambios a GitHub...
git push origin master:main

echo.
echo ====================================================
echo    ¡LISTO! Todo se actualizo sin preguntas.
echo ====================================================
timeout /t 2