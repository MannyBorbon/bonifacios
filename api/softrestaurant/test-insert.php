<?php
/**
 * Script de prueba para insertar una venta directamente y ver el error
 */

require_once '../config/database.php';

try {
    $conn = getConnection();
    
    // Datos de prueba simples
    $testSale = [
        'sr_ticket_id' => 'TEST-DEBUG-001',
        'ticket_number' => 'F-001',
        'folio' => 'F-001',
        'sale_date' => '2026-04-08',
        'sale_time' => '12:00:00',
        'sale_datetime' => '2026-04-08 12:00:00',
        'table_id' => null,
        'table_number' => '5',
        'waiter_id' => null,
        'waiter_name' => 'Test Waiter',
        'covers' => 2,
        'subtotal' => 100.00,
        'tax' => 16.00,
        'discount' => 0.00,
        'tip' => 10.00,
        'total' => 116.00,
        'status' => 'closed',
        'payment_type' => 'cash',
        'opened_at' => null,
        'closed_at' => '2026-04-08 12:30:00'
    ];
    
    $stmt = $conn->prepare("
        INSERT INTO sr_sales (
            sr_ticket_id, ticket_number, folio, sale_date, sale_time, sale_datetime,
            table_id, table_number, waiter_id, waiter_name, covers, subtotal, tax, discount, tip, total,
            status, payment_type, opened_at, closed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->bind_param("ssssssisisidddddssss",
        $testSale['sr_ticket_id'],
        $testSale['ticket_number'],
        $testSale['folio'],
        $testSale['sale_date'],
        $testSale['sale_time'],
        $testSale['sale_datetime'],
        $testSale['table_id'],
        $testSale['table_number'],
        $testSale['waiter_id'],
        $testSale['waiter_name'],
        $testSale['covers'],
        $testSale['subtotal'],
        $testSale['tax'],
        $testSale['discount'],
        $testSale['tip'],
        $testSale['total'],
        $testSale['status'],
        $testSale['payment_type'],
        $testSale['opened_at'],
        $testSale['closed_at']
    );
    
    if ($stmt->execute()) {
        echo "✓ Venta insertada exitosamente!\n";
        echo "ID insertado: " . $stmt->insert_id . "\n";
        
        // Verificar que se insertó
        $check = $conn->query("SELECT COUNT(*) as total FROM sr_sales WHERE sr_ticket_id = 'TEST-DEBUG-001'");
        $result = $check->fetch_assoc();
        echo "Registros en BD: " . $result['total'] . "\n";
    } else {
        echo "✗ Error al insertar: " . $stmt->error . "\n";
    }
    
} catch (Exception $e) {
    echo "✗ Excepción: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
