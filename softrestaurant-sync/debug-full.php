<?php
/**
 * DEBUG COMPLETO - Diagnóstico completo del sistema
 */

echo "=== DEBUG COMPLETO - " . date('Y-m-d H:i:s') . " ===\n\n";

// 0. Columnas de cheqdet
echo "0. Columnas de cheqdet:\n";
try {
    $dsn0  = "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true";
    $conn0 = new PDO($dsn0, 'usuario_web', 'Filipenses4:8@', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $cols = $conn0->query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cheqdet' ORDER BY ORDINAL_POSITION")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $c) { echo "   {$c['COLUMN_NAME']} ({$c['DATA_TYPE']})\n"; }
    echo "\n-- MUESTRA cheqdet (1 fila):\n";
    $sample = $conn0->query("SELECT TOP 1 * FROM cheqdet")->fetch(PDO::FETCH_ASSOC);
    if ($sample) { foreach ($sample as $k=>$v) { echo "   $k = $v\n"; } }
} catch (Throwable $e) { echo "   ERROR: " . $e->getMessage() . "\n"; }

// 1. Verificar SQL Server - ventas de hoy
echo "\n1. SQL Server - Ventas de hoy:\n";
try {
    $dsn  = "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true";
    $conn = new PDO($dsn, 'usuario_web', 'Filipenses4:8@', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    
    $r = $conn->query("
        SELECT COUNT(*) as n, SUM(total) as suma,
               MIN(fecha) as primera, MAX(fecha) as ultima
        FROM cheques
        WHERE pagado=1 AND cancelado=0
          AND CAST(fecha AS DATE) = CAST(GETDATE() AS DATE)
    ")->fetch(PDO::FETCH_ASSOC);
    
    echo "   Tickets hoy: n={$r['n']} suma={$r['suma']}\n";
    echo "   Primera: {$r['primera']}\n";
    echo "   Ultima: {$r['ultima']}\n";
} catch (Throwable $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
}

// 2. Verificar MySQL - ventas de hoy
echo "\n2. MySQL - Ventas de hoy:\n";
try {
    $mysql = new PDO('mysql:host=localhost;dbname=bonifacios_dashboard', 'root', '');
    
    $r = $mysql->query("
        SELECT COUNT(*) as n, SUM(total) as suma,
               MIN(sale_datetime) as primera, MAX(sale_datetime) as ultima
        FROM sr_sales
        WHERE DATE(sale_datetime) = CURDATE()
          AND status = 'closed'
    ")->fetch(PDO::FETCH_ASSOC);
    
    echo "   Tickets hoy: n={$r['n']} suma={$r['suma']}\n";
    echo "   Primera: {$r['primera']}\n";
    echo "   Ultima: {$r['ultima']}\n";
} catch (Throwable $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
}

// 3. Verificar API endpoint
echo "\n3. API Endpoint Test:\n";
try {
    $payload = json_encode([
        'module' => 'sales',
        'data' => [[
            'sr_ticket_id' => 'TEST-' . time(),
            'ticket_number' => 'TEST',
            'sale_date' => date('Y-m-d'),
            'sale_time' => date('H:i:s'),
            'sale_datetime' => date('Y-m-d H:i:s'),
            'total' => 1.00,
            'status' => 'closed'
        ]],
        'sync_datetime' => date('Y-m-d H:i:s'),
    ]);
    
    $ch = curl_init('https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'X-API-Key: bonifacios-sr-sync-2024-secret-key'],
        CURLOPT_TIMEOUT => 30,
    ]);
    
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "   HTTP Code: $code\n";
    echo "   Response: " . substr($res, 0, 200) . "\n";
} catch (Throwable $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
}

// 4. Verificar API de ventas
echo "\n4. API Sales Endpoint:\n";
try {
    $ch = curl_init('https://bonifaciossancarlos.com/api/softrestaurant/sales.php?endpoint=getSalesStats&date=' . date('Y-m-d'));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);
    
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "   HTTP Code: $code\n";
    echo "   Response: " . substr($res, 0, 300) . "\n";
} catch (Throwable $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
}

// 5. Verificar sync state
echo "\n5. Sync State:\n";
$stateFile = __DIR__ . '/sync-state.json';
if (file_exists($stateFile)) {
    $state = json_decode(file_get_contents($stateFile), true);
    echo "   sales: " . ($state['sales'] ?? 'N/A') . "\n";
    echo "   initial_load_done: " . ($state['initial_load_done'] ?? 'false') . "\n";
} else {
    echo "   No existe sync-state.json\n";
}

echo "\n=== FIN DEBUG ===\n";
?>
