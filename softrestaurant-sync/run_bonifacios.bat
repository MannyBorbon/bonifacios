@echo off
:inicio
cd C:\Sincronizador\softrestaurant-sync
php sync-final.php
echo El script se cerro o fallo. Reiniciando en 5 segundos...
timeout /t 5
goto inicio
