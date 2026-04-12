<?php
echo "=== TEST DE CONEXIÓN SIMPLE ===\n";

// Verificar si config.php existe
if (file_exists('config.php')) {
    echo "config.php: EXISTE\n";
    require_once 'config.php';
    
    if (isset($softrestaurant)) {
        echo "Configuración softrestaurant: ENCONTRADA\n";
        echo "Servidor: " . ($softrestaurant['server'] ?? 'NO DEFINIDO') . "\n";
        echo "Base de datos: " . ($softrestaurant['database'] ?? 'NO DEFINIDA') . "\n";
        echo "Usuario: " . ($softrestaurant['username'] ?? 'NO DEFINIDO') . "\n";
    } else {
        echo "ERROR: No se encuentra \$softrestaurant en config.php\n";
    }
} else {
    echo "ERROR: config.php NO EXISTE en esta carpeta\n";
    echo "Archivos en esta carpeta:\n";
    $files = glob('*');
    foreach ($files as $file) {
        if (is_file($file)) {
            echo "- $file\n";
        }
    }
}

echo "\n=== TEST DE EXTENSIONES ===\n";
echo "PDO: " . (extension_loaded('pdo') ? 'INSTALADO' : 'NO INSTALADO') . "\n";
echo "PDO_SQLSRV: " . (extension_loaded('pdo_sqlsrv') ? 'INSTALADO' : 'NO INSTALADO') . "\n";
echo "SQLSRV: " . (extension_loaded('sqlsrv') ? 'INSTALADO' : 'NO INSTALADO') . "\n";

echo "\n=== TEST COMPLETADO ===\n";
?>
