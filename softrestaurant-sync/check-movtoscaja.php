<?php
// Script para verificar si hay movimientos en la tabla movtoscaja de SoftRestaurant

require_once 'config.php';

try {
    // Conectar a SoftRestaurant
    $conn = new PDO("sqlsrv:Server={$softrestaurant['server']};Database={$softrestaurant['database']}", 
                    $softrestaurant['username'], $softrestaurant['password']);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== CONECTADO A SOFTRESTAURANT ===\n";
    echo "Servidor: {$softrestaurant['server']}\n";
    echo "Base de datos: {$softrestaurant['database']}\n\n";
    
    // Verificar si la tabla movtoscaja existe
    echo "=== VERIFICANDO TABLA movtoscaja ===\n";
    $sql = "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'movtoscaja'";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['count'] > 0) {
        echo "TABLA movtoscaja: EXISTE\n\n";
        
        // Contar movimientos totales
        $sql = "SELECT COUNT(*) as total FROM movtoscaja";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Total de movimientos: {$result['total']}\n";
        
        // Contar movimientos válidos (no cancelados)
        $sql = "SELECT COUNT(*) as validos FROM movtoscaja WHERE cancelado = 0";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Movimientos válidos (cancelado=0): {$result['validos']}\n";
        
        // Contar pagos de propina
        $sql = "SELECT COUNT(*) as propinas FROM movtoscaja WHERE pagodepropina = 1 AND cancelado = 0";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Pagos de propina: {$result['propinas']}\n";
        
        // Contar retiros (importe negativo)
        $sql = "SELECT COUNT(*) as retiros FROM movtoscaja WHERE importe < 0 AND cancelado = 0";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Retiros (importe < 0): {$result['retiros']}\n";
        
        // Contar ingresos (importe positivo)
        $sql = "SELECT COUNT(*) as ingresos FROM movtoscaja WHERE importe > 0 AND cancelado = 0";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Ingresos (importe > 0): {$result['ingresos']}\n\n";
        
        // Mostrar últimos 5 movimientos
        echo "=== ÚLTIMOS 5 MOVIMIENTOS ===\n";
        $sql = "SELECT TOP 5 folio, foliomovto, tipo, concepto, importe, fecha, pagodepropina 
                FROM movtoscaja 
                WHERE cancelado = 0 
                ORDER BY fecha DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($movements as $i => $m) {
            echo ($i + 1) . ". Folio: {$m['folio']}, Tipo: {$m['tipo']}, Concepto: {$m['concepto']}, Importe: {$m['importe']}, Fecha: {$m['fecha']}, Propina: {$m['pagodepropina']}\n";
        }
        
        // Verificar movimientos de hoy
        echo "\n=== MOVIMIENTOS DE HOY ===\n";
        $today = date('Y-m-d');
        $sql = "SELECT COUNT(*) as hoy FROM movtoscaja 
                WHERE CAST(fecha AS DATE) = ? AND cancelado = 0";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$today]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Movimientos de hoy ({$today}): {$result['hoy']}\n";
        
        // Verificar movimientos de ayer
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $sql = "SELECT COUNT(*) as ayer FROM movtoscaja 
                WHERE CAST(fecha AS DATE) = ? AND cancelado = 0";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$yesterday]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Movimientos de ayer ({$yesterday}): {$result['ayer']}\n";
        
    } else {
        echo "TABLA movtoscaja: NO EXISTE\n";
        echo "Esta tabla es necesaria para sincronizar movimientos de caja\n";
    }
    
    echo "\n=== VERIFICACIÓN COMPLETADA ===\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Revisa la configuración de conexión a SoftRestaurant\n";
}
?>
