<?php
/**
 * Verificar últimas ventas en SoftRestaurant
 */

define('SR_SERVER', '100.84.227.35\NATIONALSOFT');
define('SR_DATABASE', 'softrestaurant8pro');
define('SR_USER', 'usuario_web');
define('SR_PASS', 'Filipenses4:8@');

try {
    $dsn = "sqlsrv:Server=" . SR_SERVER . ";Database=" . SR_DATABASE . ";Encrypt=yes;TrustServerCertificate=yes";
    $conn = new PDO($dsn, SR_USER, SR_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    
    echo "=== ÚLTIMAS 10 VENTAS CERRADAS ===\n\n";
    
    $sql = "SELECT TOP 10 folio, fecha, total, pagado 
            FROM cheques 
            WHERE pagado = 1 
            ORDER BY fecha DESC";
    
    $stmt = $conn->query($sql);
    $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($sales) > 0) {
        echo "Folio\t\tFecha\t\t\tTotal\tPagado\n";
        echo str_repeat("-", 60) . "\n";
        foreach ($sales as $s) {
            printf("%s\t%s\t$%.2f\t%d\n", 
                $s['folio'], 
                $s['fecha'], 
                $s['total'], 
                $s['pagado']
            );
        }
        echo "\nTotal de ventas cerradas encontradas: " . count($sales) . "\n";
    } else {
        echo "No se encontraron ventas con pagado = 1\n";
    }
    
    // Contar total de ventas cerradas
    $countSql = "SELECT COUNT(*) as total FROM cheques WHERE pagado = 1";
    $countStmt = $conn->query($countSql);
    $count = $countStmt->fetch(PDO::FETCH_ASSOC);
    echo "\nTotal de ventas cerradas en la base de datos: " . $count['total'] . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
