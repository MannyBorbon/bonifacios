<?php
/**
 * Verificar estado de sincronización de productos
 */

// Verificar MySQL
$mysqlHost = 'localhost';
$mysqlDB = 'bonifaci_main';
$mysqlUser = 'bonifaci_main';
$mysqlPass = 'Filipenses4:8@bonifacios2024';

try {
    $pdo = new PDO("mysql:host=$mysqlHost;dbname=$mysqlDB;charset=utf8mb4", $mysqlUser, $mysqlPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== ESTADO DE SINCRONIZACIÓN ===\n\n";
    
    // Productos en MySQL
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM sr_products");
    $products = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✓ Productos en MySQL: " . $products['total'] . "\n";
    
    if ($products['total'] > 0) {
        $sample = $pdo->query("SELECT sr_product_id, product_name, price FROM sr_products LIMIT 5")->fetchAll();
        echo "\nMuestra de productos:\n";
        foreach ($sample as $p) {
            echo "  - {$p['sr_product_id']}: {$p['product_name']} (\${$p['price']})\n";
        }
    }
    
    // Items de tickets
    echo "\n";
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM sr_ticket_items WHERE sale_date >= CURDATE()");
    $items = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✓ Items vendidos HOY: " . $items['total'] . "\n";
    
    if ($items['total'] > 0) {
        $topItems = $pdo->query("
            SELECT product_id, product_name, SUM(quantity) as qty, COUNT(*) as times
            FROM sr_ticket_items 
            WHERE sale_date >= CURDATE()
            GROUP BY product_id, product_name
            ORDER BY qty DESC
            LIMIT 5
        ")->fetchAll();
        
        echo "\nTop 5 productos vendidos hoy:\n";
        foreach ($topItems as $item) {
            echo "  - {$item['product_name']}: {$item['qty']} unidades en {$item['times']} tickets\n";
        }
    }
    
    // Verificar tabla sr_sale_items
    echo "\n";
    $tables = $pdo->query("SHOW TABLES LIKE 'sr_sale_items'")->fetchAll();
    if (count($tables) > 0) {
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM sr_sale_items WHERE sale_date >= CURDATE()");
        $saleItems = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "✓ sr_sale_items HOY: " . $saleItems['total'] . "\n";
    } else {
        echo "⚠ Tabla sr_sale_items no existe\n";
    }
    
} catch (Exception $e) {
    echo "❌ ERROR MySQL: " . $e->getMessage() . "\n";
}

// Verificar archivo de estado del sync
$stateFile = __DIR__ . '/sync-state-v3.json';
if (file_exists($stateFile)) {
    echo "\n=== ESTADO DEL SYNC ===\n\n";
    $state = json_decode(file_get_contents($stateFile), true);
    
    $catalogSync = $state['catalog_synced_at'] ?? 0;
    if ($catalogSync > 0) {
        $diff = time() - $catalogSync;
        $mins = floor($diff / 60);
        echo "Última sincronización de catálogo: hace $mins minutos\n";
        echo "Próxima sincronización en: " . (15 - $mins) . " minutos\n";
    } else {
        echo "Catálogo nunca sincronizado\n";
    }
}
