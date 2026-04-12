<?php
// 404.php - Redirige todas las rutas a index.html
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/index.html');
?>
