<?php
/**
 * Script de diagnóstico: revisar estructura de tabla productos
 */

$dsn = "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true;LoginTimeout=30";
$user = 'usuario_web';
$pass = 'Filipenses4:8@';

try {
    $conn = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    echo "=== COLUMNAS DE LA TABLA 'productos' ===\n\n";
    
    $stmt = $conn->query("
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'productos'
        ORDER BY ORDINAL_POSITION
    ");
    
    $columns = $stmt->fetchAll();
    
    if (empty($columns)) {
        echo "❌ La tabla 'productos' NO existe o no tiene columnas.\n";
    } else {
        echo "✅ Encontradas " . count($columns) . " columnas:\n\n";
        
        foreach ($columns as $col) {
            $name = $col['COLUMN_NAME'];
            $type = $col['DATA_TYPE'];
            $nullable = $col['IS_NULLABLE'] === 'YES' ? 'NULL' : 'NOT NULL';
            $maxLen = $col['CHARACTER_MAXIMUM_LENGTH'] ?? '';
            
            echo sprintf("  %-30s %-20s %s %s\n", 
                $name, 
                $type . ($maxLen ? "($maxLen)" : ''),
                $nullable,
                ''
            );
        }
        
        echo "\n=== COLUMNAS CRÍTICAS ===\n\n";
        
        // Buscar columnas de precio
        echo "Precio:\n";
        foreach ($columns as $col) {
            if (stripos($col['COLUMN_NAME'], 'precio') !== false) {
                echo "  ✓ " . $col['COLUMN_NAME'] . "\n";
            }
        }
        
        echo "\nNombre:\n";
        foreach ($columns as $col) {
            if (stripos($col['COLUMN_NAME'], 'nombre') !== false || 
                stripos($col['COLUMN_NAME'], 'descripcion') !== false) {
                echo "  ✓ " . $col['COLUMN_NAME'] . "\n";
            }
        }
        
        echo "\nCategoría:\n";
        foreach ($columns as $col) {
            if (stripos($col['COLUMN_NAME'], 'categoria') !== false || 
                stripos($col['COLUMN_NAME'], 'grupo') !== false) {
                echo "  ✓ " . $col['COLUMN_NAME'] . "\n";
            }
        }
        
        // Muestra de datos
        echo "\n=== MUESTRA DE 3 PRODUCTOS ===\n\n";
        $sample = $conn->query("SELECT TOP 3 * FROM productos")->fetchAll();
        
        foreach ($sample as $idx => $row) {
            echo "Producto #" . ($idx + 1) . ":\n";
            foreach ($row as $key => $val) {
                if ($val !== null && $val !== '') {
                    echo "  $key = " . substr($val, 0, 50) . "\n";
                }
            }
            echo "\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
}
