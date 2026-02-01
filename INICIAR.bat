@echo off
setlocal enabledelayedexpansion

REM Crear un script VBS temporal para ejecutar npm run dev oculto
set "vbs_file=%temp%\run_dev.vbs"

(
echo Set objWshShell = CreateObject("WScript.Shell"^)
echo objWshShell.Run "cmd /c npm run dev", 0, false
) > "%vbs_file%"

REM Abrir el navegador después de 5 segundos
start "" cmd /c "timeout /t 5 /nobreak > nul && start http://localhost:3000"

REM Ejecutar npm run dev de forma oculta
cscript.exe "%vbs_file%"

REM Limpiar archivo temporal
del "%vbs_file%"

endlocal
