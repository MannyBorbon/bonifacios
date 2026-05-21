<?php
/**
 * LIMPIAR PAGOS INCORRECTOS - MySQL
 * Corrige registros con payment_type='transfer' que en realidad son tarjeta
 * Ejecutar en Hostinger o local con conexión a MySQL del sitio
 */
error_reporting(E_ALL);

// Configuración MySQL (ajustar según tu entorno)
$host = 'localhost'; // o el host de MySQL en Hostinger
$db   = 'nombre_base_datos'; // REEMPLAZAR
$user = 'usuario_mysql';     // REEMPLAZAR
$pass = 'contraseña';        // REEMPLAZAR

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "Conexión MySQL OK\n\n";
} catch (Throwable $e) {
    die("ERROR conexión MySQL: " . $e->getMessage() . "\n");
}

// 1. Verificar registros con payment_type='transfer'
echo "=== REGISTROS CON payment_type='transfer' ===\n";
$stmt = $pdo->query("
    SELECT 
        sr_ticket_id, sale_datetime, total, payment_type,
        cash_amount, card_amount, voucher_amount, other_amount,
        (card_amount + voucher_amount + other_amount) as non_cash_total
    FROM sr_sales 
    WHERE payment_type = 'transfer'
    ORDER BY sale_datetime DESC
    LIMIT 20
");
$transferRows = $stmt->fetchAll();

if (empty($transferRows)) {
    echo "No se encontraron registros con payment_type='transfer'\n";
    exit;
}

foreach ($transferRows as $row) {
    echo "Folio: {$row['sr_ticket_id']} | Fecha: {$row['sale_datetime']} | Total: ${row['total']}\n";
    echo "  Cash: {$row['cash_amount']} | Card: {$row['card_amount']} | Voucher: {$row['voucher_amount']} | Other: {$row['other_amount']}\n";
    echo "  Non-cash total: {$row['non_cash_total']}\n\n";
}

// 2. Identificar cuáles deberían ser 'card'
$toFix = [];
foreach ($transferRows as $row) {
    // Si tiene card_amount > 0 y otros son 0 o muy pequeños, debería ser 'card'
    if ($row['card_amount'] > 0.01 && $row['voucher_amount'] <= 0.01 && $row['other_amount'] <= 0.01) {
        $toFix[] = $row['sr_ticket_id'];
    }
}

if (empty($toFix)) {
    echo "No se encontraron registros para corregir\n";
    exit;
}

echo "\n=== REGISTROS A CORREGIR (de 'transfer' a 'card') ===\n";
echo "Se corregirán " . count($toFix) . " registros:\n";
echo implode(', ', $toFix) . "\n\n";

// 3. Confirmación y corrección
echo "¿Deseas continuar con la corrección? (s/N): ";
$handle = fopen("php://stdin", "r");
$line = fgets($handle);
if (trim(strtolower($line)) !== 's') {
    echo "Operación cancelada.\n";
    exit;
}

// 4. Ejecutar corrección
$placeholders = str_repeat('?,', count($toFix) - 1) . '?';
$stmt = $pdo->prepare("
    UPDATE sr_sales 
    SET payment_type = 'card' 
    WHERE sr_ticket_id IN ($placeholders)
");
$stmt->execute($toFix);

echo "✅ Corrección completada. {$stmt->rowCount()} registros actualizados.\n";

// 5. Verificar resultado
echo "\n=== VERIFICACIÓN POST-CORRECCIÓN ===\n";
$stmt = $pdo->query("
    SELECT payment_type, COUNT(*) as count, SUM(total) as total
    FROM sr_sales 
    WHERE sale_datetime >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY payment_type
    ORDER BY total DESC
");
$results = $stmt->fetchAll();

foreach ($results as $row) {
    echo "{$row['payment_type']}: {$row['count']} tickets | Total: ${row['total']}\n";
}
