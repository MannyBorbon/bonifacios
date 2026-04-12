<?php
/**
 * Diagnóstico detallado de ventas de AYER vs Corte de Caja
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
    
    echo "=== DIAGNÓSTICO DETALLADO AYER (09 ABR 2026) ===\n\n";
    
    // Rango shift-based: 09 ABR 06:00 a 10 ABR 07:59:59
    $start = '2026-04-09 06:00:00';
    $end = '2026-04-10 07:59:59';
    
    echo "Período: $start a $end\n";
    echo str_repeat("=", 80) . "\n\n";
    
    // 1. Total de ventas por método de pago (cheques cerrados)
    echo "1. VENTAS POR MÉTODO DE PAGO (cheques cerrados):\n";
    echo str_repeat("-", 80) . "\n";
    
    $sql = "SELECT 
                COUNT(*) as tickets,
                SUM(total) as total_bruto,
                SUM(subtotal) as subtotal,
                SUM(totalimpuesto1) as impuestos,
                SUM(propina) as propinas,
                SUM(efectivo) as efectivo,
                SUM(tarjeta) as tarjeta,
                SUM(vales) as vales,
                SUM(otros) as otros,
                SUM(total - ISNULL(propina, 0)) as total_sin_propinas
            FROM cheques
            WHERE fecha BETWEEN CONVERT(DATETIME, ?, 120) AND CONVERT(DATETIME, ?, 120)
              AND pagado = 1";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([$start, $end]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo sprintf("Tickets: %d\n", $result['tickets']);
    echo sprintf("Total Bruto (con propinas): $%s\n", number_format($result['total_bruto'], 2));
    echo sprintf("Subtotal: $%s\n", number_format($result['subtotal'], 2));
    echo sprintf("Impuestos: $%s\n", number_format($result['impuestos'], 2));
    echo sprintf("Propinas: $%s\n", number_format($result['propinas'], 2));
    echo sprintf("Total Sin Propinas: $%s\n", number_format($result['total_sin_propinas'], 2));
    echo "\nDesglose por método de pago:\n";
    echo sprintf("  Efectivo: $%s\n", number_format($result['efectivo'], 2));
    echo sprintf("  Tarjeta: $%s\n", number_format($result['tarjeta'], 2));
    echo sprintf("  Vales: $%s\n", number_format($result['vales'], 2));
    echo sprintf("  Otros: $%s\n", number_format($result['otros'], 2));
    echo sprintf("  SUMA PAGOS: $%s\n", number_format($result['efectivo'] + $result['tarjeta'] + $result['vales'] + $result['otros'], 2));
    
    echo "\n";
    
    // 2. Verificar tickets con pagos mixtos
    echo "2. TICKETS CON PAGOS MIXTOS:\n";
    echo str_repeat("-", 80) . "\n";
    
    $sql = "SELECT folio, total, propina, efectivo, tarjeta, vales, otros,
                   (efectivo + tarjeta + vales + otros) as suma_pagos,
                   (total - ISNULL(propina, 0)) as total_sin_propina
            FROM cheques
            WHERE fecha BETWEEN CONVERT(DATETIME, ?, 120) AND CONVERT(DATETIME, ?, 120)
              AND pagado = 1
              AND (
                  (efectivo > 0 AND tarjeta > 0) OR
                  (efectivo > 0 AND vales > 0) OR
                  (tarjeta > 0 AND vales > 0) OR
                  (otros > 0)
              )
            ORDER BY folio";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([$start, $end]);
    $mixedPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($mixedPayments) > 0) {
        echo "Encontrados " . count($mixedPayments) . " tickets con pagos mixtos:\n\n";
        foreach ($mixedPayments as $t) {
            echo sprintf("Folio %s: Total=$%.2f, Propina=$%.2f, Sin Propina=$%.2f\n",
                $t['folio'], $t['total'], $t['propina'], $t['total_sin_propina']);
            echo sprintf("  Efectivo=$%.2f, Tarjeta=$%.2f, Vales=$%.2f, Otros=$%.2f\n",
                $t['efectivo'], $t['tarjeta'], $t['vales'], $t['otros']);
            echo sprintf("  Suma pagos=$%.2f\n\n", $t['suma_pagos']);
        }
    } else {
        echo "No hay tickets con pagos mixtos.\n\n";
    }
    
    // 3. Verificar discrepancias entre total y suma de pagos
    echo "3. TICKETS CON DISCREPANCIAS (total != suma de pagos):\n";
    echo str_repeat("-", 80) . "\n";
    
    $sql = "SELECT folio, total, propina, efectivo, tarjeta, vales, otros,
                   (efectivo + tarjeta + vales + otros) as suma_pagos,
                   (total - (efectivo + tarjeta + vales + otros)) as diferencia
            FROM cheques
            WHERE fecha BETWEEN CONVERT(DATETIME, ?, 120) AND CONVERT(DATETIME, ?, 120)
              AND pagado = 1
              AND ABS(total - (efectivo + tarjeta + vales + otros)) > 0.01
            ORDER BY ABS(total - (efectivo + tarjeta + vales + otros)) DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([$start, $end]);
    $discrepancies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($discrepancies) > 0) {
        echo "Encontrados " . count($discrepancies) . " tickets con discrepancias:\n\n";
        foreach ($discrepancies as $t) {
            echo sprintf("Folio %s: Total=$%.2f, Suma Pagos=$%.2f, Diferencia=$%.2f\n",
                $t['folio'], $t['total'], $t['suma_pagos'], $t['diferencia']);
        }
    } else {
        echo "No hay discrepancias entre total y suma de pagos.\n";
    }
    
    echo "\n";
    
    // 4. Comparar con lo que debe mostrar el dashboard
    echo "4. COMPARACIÓN CON DASHBOARD:\n";
    echo str_repeat("-", 80) . "\n";
    
    $totalSinPropinas = floatval($result['total_sin_propinas']);
    $propinas = floatval($result['propinas']);
    
    echo sprintf("Dashboard debería mostrar:\n");
    echo sprintf("  Venta Total (sin propinas): $%s\n", number_format($totalSinPropinas, 2));
    echo sprintf("  Propinas: $%s\n", number_format($propinas, 2));
    echo sprintf("  Total Bruto (con propinas): $%s\n", number_format($totalSinPropinas + $propinas, 2));
    
    echo "\n";
    echo sprintf("Corte de caja muestra:\n");
    echo sprintf("  Saldo Final: $26,864.00\n");
    echo sprintf("  Diferencia: $%s\n", number_format($totalSinPropinas - 26864, 2));
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
