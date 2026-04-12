<?php
/**
 * Script para verificar tickets de hoy en SoftRestaurant
 */

$serverName = "100.84.227.35\NATIONALSOFT";
$database = "softrestaurant8pro";
$username = "usuario_web";
$password = "Bon1f4c10s2024!";

try {
    $conn = new PDO("sqlsrv:server=$serverName;Database=$database", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== TICKETS DE HOY (2026-04-08) ===\n\n";
    
    $sql = "SELECT TOP 20
                folio, 
                fecha,
                total,
                pagado,
                efectivo,
                tarjeta,
                vales,
                otros
            FROM cheques 
            WHERE CAST(fecha AS DATE) = '2026-04-08'
            ORDER BY fecha DESC";
    
    $stmt = $conn->query($sql);
    $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($tickets) > 0) {
        echo "Total de tickets encontrados: " . count($tickets) . "\n\n";
        
        foreach ($tickets as $t) {
            echo "Folio: {$t['folio']}\n";
            echo "Fecha: {$t['fecha']}\n";
            echo "Total: \${$t['total']}\n";
            echo "Pagado: {$t['pagado']}\n";
            echo "Efectivo: \${$t['efectivo']} | Tarjeta: \${$t['tarjeta']} | Vales: \${$t['vales']} | Otros: \${$t['otros']}\n";
            echo "---\n";
        }
        
        $totalSum = array_sum(array_column($tickets, 'total'));
        echo "\nTotal general: \$$totalSum\n";
        
    } else {
        echo "No se encontraron tickets para hoy.\n";
    }
    
    echo "\n=== ÚLTIMA FECHA SINCRONIZADA ===\n";
    echo "2026-04-07 20:55:55\n\n";
    
    echo "=== TICKETS DESPUÉS DE ÚLTIMA SYNC ===\n";
    $sql2 = "SELECT COUNT(*) as total, SUM(total) as suma
             FROM cheques 
             WHERE fecha > '2026-04-07 20:55:55'";
    
    $stmt2 = $conn->query($sql2);
    $result = $stmt2->fetch(PDO::FETCH_ASSOC);
    
    echo "Tickets después de 2026-04-07 20:55:55: {$result['total']}\n";
    echo "Total: \${$result['suma']}\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
