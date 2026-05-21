@echo off
chcp 65001 >nul
cls
echo === Diagnostico turno actual ===
php "C:\Sincronizador\softrestaurant-sync\diagnostico-turno.php"
echo.
pause
