@echo off
echo ========================================
echo    GYMFLEX PRO - Iniciando Sistema
echo ========================================
echo.
echo Iniciando servidor de desarrollo...
echo.

REM Abrir el navegador después de 3 segundos
start "" cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:3000"

REM Iniciar el servidor de desarrollo
npm run dev

pause
