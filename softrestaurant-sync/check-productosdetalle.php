<?php
$dsn = "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true;LoginTimeout=30";
$user = 'usuario_web';
$pass = 'Filipenses4:8@';

try {
    $conn = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    echo "=== COLUMNAS DE LA TABLA 'productosdetalle' ===\n\n";
    
    $stmt = $conn->query("
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'productosdetalle'
        ORDER BY ORDINAL_POSITION
    ");
    
    $columns = $stmt->fetchAll();
    
    if (empty($columns)) {
        echo "❌ La tabla 'productosdetalle' NO existe.\n";
    } else {
        echo "✅ Encontradas " . count($columns) . " columnas:\n\n";
        foreach ($columns as $col) {
            echo "  " . $col['COLUMN_NAME'] . " (" . $col['DATA_TYPE'] . ")\n";
        }
        
        echo "\n=== MUESTRA DE 3 REGISTROS ===\n\n";
        $sample = $conn->query("SELECT TOP 3 * FROM productosdetalle")->fetchAll();
        
        foreach ($sample as $idx => $row) {
            echo "Registro #" . ($idx + 1) . ":\n";
            foreach ($row as $key => $val) {
                if ($val !== null && $val !== '') {
                    echo "  $key = $val\n";
                }
            }
            echo "\n";
        }
    }
    
    // Query de JOIN para ver cómo se relacionan
    echo "\n=== QUERY CON JOIN (productos + precios) ===\n\n";
    $join = $conn->query("
        SELECT TOP 3 
            p.idproducto,
            p.descripcion,
            p.idgrupo,
            pd.*
        FROM productos p
        LEFT JOIN productosdetalle pd ON pd.idproducto = p.idproducto
    ")->fetchAll();
    
    foreach ($join as $idx => $row) {
        echo "Producto #" . ($idx + 1) . ": " . $row['descripcion'] . "\n";
        foreach ($row as $key => $val) {
            if ($val !== null && $val !== '' && !in_array($key, ['descripcion', 'idproducto'])) {
                echo "  $key = $val\n";
            }
        }
        echo "\n";
    }
    
} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
}
