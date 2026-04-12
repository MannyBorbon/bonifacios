@echo off
REM ============================================================
REM  Iniciar Sincronización en Tiempo Real SoftRestaurant
REM ============================================================
REM  Este script mantiene la sincronización corriendo
REM  Se reinicia automáticamente si se detiene
REM ============================================================

echo ========================================
echo  BONIFACIOS - Sync Tiempo Real
echo ========================================
echo.
echo Iniciando sincronizacion continua...
echo Presiona Ctrl+C para detener
echo.

:loop
php "%~dp0sync-realtime.php"

REM Si el script termina, esperar 5 segundos y reiniciar
echo.
echo [ERROR] Sincronizacion detenida. Reiniciando en 5 segundos...
timeout /t 5 /nobreak
goto loop
