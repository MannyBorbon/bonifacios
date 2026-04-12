<?php
/**
 * Script de diagnóstico para verificar tickets del 9 de abril en SoftRestaurant
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
    
    echo "=== DIAGNÓSTICO TICKETS 9 DE ABRIL 2026 ===\n\n";
    
    // 1. Tickets en cheques del 9 de abril (fecha calendario)
    echo "1. TICKETS EN CHEQUES (fecha = 2026-04-09):\n";
    echo str_repeat("-", 80) . "\n";
    $sql1 = "SELECT folio, fecha, total, pagado, efectivo, tarjeta
             FROM cheques
             WHERE CAST(fecha AS DATE) = '2026-04-09'
             ORDER BY fecha";
    $stmt1 = $conn->query($sql1);
    $tickets_fecha = $stmt1->fetchAll(PDO::FETCH_ASSOC);
    
    $total_fecha = 0;
    foreach ($tickets_fecha as $t) {
        echo sprintf("Folio: %5s | Fecha: %s | Total: %8.2f | Pagado: %d\n", 
            $t['folio'], $t['fecha'], $t['total'], $t['pagado']);
        $total_fecha += $t['total'];
    }
    echo "\nTotal tickets por fecha: " . count($tickets_fecha) . "\n";
    echo "Total ventas: $" . number_format($total_fecha, 2) . "\n\n";
    
    // 2. Tickets en turno del 9 de abril (06:00 del 9 a 07:59 del 10)
    echo "2. TICKETS EN TURNO 9 ABR (2026-04-09 06:00:00 a 2026-04-10 07:59:59):\n";
    echo str_repeat("-", 80) . "\n";
    $sql2 = "SELECT folio, fecha, total, pagado, efectivo, tarjeta
             FROM cheques
             WHERE fecha >= '2026-04-09 06:00:00' 
               AND fecha <= '2026-04-10 07:59:59'
             ORDER BY fecha";
    $stmt2 = $conn->query($sql2);
    $tickets_turno = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    $total_turno = 0;
    foreach ($tickets_turno as $t) {
        echo sprintf("Folio: %5s | Fecha: %s | Total: %8.2f | Pagado: %d\n", 
            $t['folio'], $t['fecha'], $t['total'], $t['pagado']);
        $total_turno += $t['total'];
    }
    echo "\nTotal tickets por turno: " . count($tickets_turno) . "\n";
    echo "Total ventas: $" . number_format($total_turno, 2) . "\n\n";
    
    // 3. Verificar si hay tickets cancelados
    echo "3. TICKETS CANCELADOS DEL 9 DE ABRIL:\n";
    echo str_repeat("-", 80) . "\n";
    try {
        $sql3 = "SELECT folio, fecha, total, motivo
                 FROM cancelaciones
                 WHERE CAST(fecha AS DATE) = '2026-04-09'
                 ORDER BY fecha";
        $stmt3 = $conn->query($sql3);
        $cancelados = $stmt3->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($cancelados) > 0) {
            foreach ($cancelados as $c) {
                echo sprintf("Folio: %5s | Total: %8.2f | Motivo: %s\n", 
                    $c['folio'], $c['total'], $c['motivo']);
            }
        } else {
            echo "No hay cancelaciones.\n";
        }
    } catch (Exception $e) {
        echo "Tabla cancelaciones no existe o error: " . $e->getMessage() . "\n";
    }
    
    echo "\n" . str_repeat("=", 80) . "\n";
    echo "RESUMEN:\n";
    echo "- Reporte SoftRestaurant muestra: $30,055.00 (folios 13974-13977)\n";
    echo "- Dashboard Hostinger muestra: $28,915.00 (folios 15410-15429)\n";
    echo "- Tickets por fecha calendario: $" . number_format($total_fecha, 2) . " (" . count($tickets_fecha) . " tickets)\n";
    echo "- Tickets por turno (06:00-07:59): $" . number_format($total_turno, 2) . " (" . count($tickets_turno) . " tickets)\n";
    echo str_repeat("=", 80) . "\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
