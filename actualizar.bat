@echo off
cls
echo ====================================================
echo    ACTUALIZADOR AUTOMATICO DE MENUSGO (GITHUB)
echo ====================================================
echo.

:: 1. Agrega todos los cambios (HTML, CSS, JS)
git add .

:: 2. Pide el nombre de la actualizacion
set /p msg="¿Que cambios hiciste hoy? (ej. Agregue categorias): "

:: 3. Guarda los cambios localmente
git commit -m "%msg%"

:: 4. Sube los cambios a la rama principal de GitHub
echo.
echo Subiendo archivos a internet...
git push origin master:main

echo.
echo ====================================================
echo    ¡LISTO! Tu web se actualizara en un momento.
echo ====================================================
pause