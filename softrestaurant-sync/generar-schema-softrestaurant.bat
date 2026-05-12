@echo off
setlocal

REM ===============================================
REM Genera un .md con tablas y columnas de SoftRestaurant
REM ===============================================

set "SCRIPT_DIR=%~dp0"

REM Puedes ajustar estos valores o definirlos en variables de entorno del sistema.
if "%SR_SERVER%"=="" set "SR_SERVER=100.84.227.35\NATIONALSOFT"
if "%SR_DATABASE%"=="" set "SR_DATABASE=softrestaurant8pro"

REM SR_USER y SR_PASS son opcionales aqui:
REM - Si no se definen, el script PHP intentara leerlos desde sync-historico.php
REM - Si quieres sobreescribirlos, define variables antes de ejecutar:
REM   set SR_USER=usuario_web
REM   set SR_PASS=tu_clave

where php >nul 2>nul
if errorlevel 1 (
  echo ERROR: PHP no esta en PATH.
  echo Instala PHP o agrega php.exe al PATH del sistema.
  echo.
  pause
  exit /b 1
)

set "SR_SCHEMA_OUTPUT=%SCRIPT_DIR%softrestaurant-schema.md"

php "%SCRIPT_DIR%export-softrestaurant-schema.php" ^
  --server="%SR_SERVER%" ^
  --database="%SR_DATABASE%" ^
  --output="%SR_SCHEMA_OUTPUT%"

if errorlevel 1 (
  echo.
  echo Fallo la generacion del archivo de esquema.
  pause
  exit /b 1
)

echo.
echo Listo. Archivo generado en:
echo %SR_SCHEMA_OUTPUT%
pause
exit /b 0
