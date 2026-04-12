<?php
/**
 * Script para identificar tablas de movimientos de caja en SoftRestaurant
 */

define('SR_SERVER', '100.84.227.35\NATIONALSOFT');
define('SR_DATABASE', 'softrestaurant8pro');
define('SR_USER', 'usuario_web');
define('SR_PASS', 'Filipenses4:8@');

try {
    $conn = new PDO(
        "sqlsrv:server=" . SR_SERVER . ";Database=" . SR_DATABASE . ";Encrypt=no;TrustServerCertificate=yes",
        SR_USER,
        SR_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    echo "=== BÚSQUEDA DE TABLAS DE MOVIMIENTOS DE CAJA ===\n\n";
    
    // Buscar tablas relacionadas con caja
    $sql = "SELECT name FROM sysobjects 
            WHERE xtype = 'U' 
              AND (name LIKE '%caja%' 
               OR name LIKE '%arqueo%' 
               OR name LIKE '%corte%'
               OR name LIKE '%movimiento%'
               OR name LIKE '%retiro%'
               OR name LIKE '%ingreso%'
               OR name LIKE '%deposito%'
               OR name LIKE '%efectivo%')
            ORDER BY name";
    
    $stmt = $conn->query($sql);
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($tables) > 0) {
        echo "Tablas encontradas:\n";
        echo str_repeat("-", 80) . "\n";
        foreach ($tables as $table) {
            echo "- $table\n";
        }
        echo "\n";
        
        // Para cada tabla, mostrar estructura y datos de ejemplo
        foreach ($tables as $table) {
            echo "\n" . str_repeat("=", 80) . "\n";
            echo "TABLA: $table\n";
            echo str_repeat("=", 80) . "\n";
            
            // Mostrar columnas
            try {
                $sqlCols = "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
                           FROM INFORMATION_SCHEMA.COLUMNS 
                           WHERE TABLE_NAME = '$table'
                           ORDER BY ORDINAL_POSITION";
                $stmtCols = $conn->query($sqlCols);
                $columns = $stmtCols->fetchAll(PDO::FETCH_ASSOC);
                
                echo "\nCOLUMNAS:\n";
                foreach ($columns as $col) {
                    $type = $col['DATA_TYPE'];
                    if ($col['CHARACTER_MAXIMUM_LENGTH']) {
                        $type .= "(" . $col['CHARACTER_MAXIMUM_LENGTH'] . ")";
                    }
                    echo sprintf("  %-30s %s\n", $col['COLUMN_NAME'], $type);
                }
                
                // Mostrar datos de ejemplo (últimos 5 registros)
                echo "\nDATOS DE EJEMPLO (últimos 5 registros):\n";
                echo str_repeat("-", 80) . "\n";
                $sqlData = "SELECT TOP 5 * FROM $table ORDER BY 1 DESC";
                $stmtData = $conn->query($sqlData);
                $rows = $stmtData->fetchAll(PDO::FETCH_ASSOC);
                
                if (count($rows) > 0) {
                    foreach ($rows as $row) {
                        foreach ($row as $key => $value) {
                            echo sprintf("  %-25s: %s\n", $key, $value);
                        }
                        echo str_repeat("-", 80) . "\n";
                    }
                } else {
                    echo "  (Tabla vacía)\n";
                }
                
            } catch (Exception $e) {
                echo "Error al consultar tabla: " . $e->getMessage() . "\n";
            }
        }
        
    } else {
        echo "No se encontraron tablas relacionadas con movimientos de caja.\n";
        echo "\nBuscando tablas con 'retiro' o 'ingreso' en los datos...\n";
        
        // Buscar en todas las tablas
        $sqlAllTables = "SELECT name FROM sysobjects WHERE xtype = 'U' ORDER BY name";
        $stmtAll = $conn->query($sqlAllTables);
        $allTables = $stmtAll->fetchAll(PDO::FETCH_COLUMN);
        
        echo "\nTodas las tablas disponibles:\n";
        echo str_repeat("-", 80) . "\n";
        foreach ($allTables as $t) {
            echo "- $t\n";
        }
    }
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
