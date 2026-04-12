@echo off
REM ============================================================
REM  Instalador de Servicio de Sincronización Tiempo Real
REM ============================================================
REM  Ejecutar como ADMINISTRADOR
REM  Instala el servicio de Windows para sincronización continua
REM ============================================================

echo ========================================
echo  BONIFACIOS - Instalador de Servicio
echo ========================================
echo.

REM Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Este script requiere permisos de administrador
    echo Por favor, ejecuta como administrador
    pause
    exit /b 1
)

echo [1/4] Verificando PHP...
where php >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] PHP no encontrado en el PATH
    echo Por favor instala PHP primero
    pause
    exit /b 1
)
echo [OK] PHP encontrado

echo.
echo [2/4] Creando servicio de Windows...

REM Usar NSSM (Non-Sucking Service Manager) para crear el servicio
REM Descargar NSSM de: https://nssm.cc/download

set SERVICE_NAME=BonificiosSoftRestaurantSync
set SCRIPT_PATH=%~dp0sync-realtime.php
set PHP_PATH=C:\php\php.exe

REM Si tienes NSSM instalado, descomenta estas líneas:
REM nssm install %SERVICE_NAME% "%PHP_PATH%" "%SCRIPT_PATH%"
REM nssm set %SERVICE_NAME% DisplayName "Bonifacios - SoftRestaurant Sync"
REM nssm set %SERVICE_NAME% Description "Sincronización en tiempo real con SoftRestaurant 8.0"
REM nssm set %SERVICE_NAME% Start SERVICE_AUTO_START
REM nssm start %SERVICE_NAME%

echo.
echo ========================================
echo  INSTALACION MANUAL
echo ========================================
echo.
echo Para instalar como servicio de Windows:
echo.
echo 1. Descarga NSSM desde: https://nssm.cc/download
echo 2. Extrae nssm.exe a C:\nssm\
echo 3. Ejecuta estos comandos como administrador:
echo.
echo    nssm install %SERVICE_NAME% "%PHP_PATH%" "%SCRIPT_PATH%"
echo    nssm set %SERVICE_NAME% DisplayName "Bonifacios - SoftRestaurant Sync"
echo    nssm set %SERVICE_NAME% Description "Sincronizacion en tiempo real"
echo    nssm start %SERVICE_NAME%
echo.
echo ========================================
echo  ALTERNATIVA: Programador de Tareas
echo ========================================
echo.
echo Si no quieres usar NSSM, programa una tarea que ejecute:
echo    %~dp0start-realtime-sync.bat
echo.
echo Al iniciar Windows (con reinicio automático si falla)
echo.

pause
