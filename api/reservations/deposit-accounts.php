<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    $conn = getConnection();
    $sql = "SELECT id, label, bank_name, account_holder, account_number, clabe, instructions
            FROM reservation_deposit_accounts
            WHERE is_active = 1
            ORDER BY id DESC";
    $result = $conn->query($sql);
    $accounts = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) $accounts[] = $row;
    }
    echo json_encode(['success' => true, 'accounts' => $accounts]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

