<?php
/**
 * Reconciliación cuando el mapa muestra cuenta abierta pero en SR ya se cobró/eliminó
 * y sr_sales sigue como `open`. Solo administradores.
 *
 * POST JSON:
 *   table_code string (mesa venue, ej. M2)
 *   business_date string opcional Y-m-d (por defecto hoy Hermosillo)
 *   dry_run bool — si true, solo lista coincidencias (no cambia BD)
 *   confirm bool — si true (y dry_run false), aplica cambios
 *   sale_id int opcional — limitar cancelación a un id concreto
 */
require_once '../config/database.php';
require_once __DIR__ . '/../lib/table_venue_codes.php';

date_default_timezone_set('America/Hermosillo');

try {
    $userId = requireAuth();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido (usa POST).']);
        exit;
    }

    $conn = getConnection();

    $roleStmt = $conn->prepare("SELECT role FROM users WHERE id = ? AND is_active = TRUE LIMIT 1");
    $roleStmt->bind_param('i', $userId);
    $roleStmt->execute();
    $roleRow = $roleStmt->get_result()->fetch_assoc();
    if (!$roleRow || (string) ($roleRow['role'] ?? '') !== 'administrador') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Solo administradores.']);
        exit;
    }

    $data = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($data)) {
        $data = [];
    }

    $rawTable = strtoupper(trim((string) ($data['table_code'] ?? '')));
    $code = bonifacios_table_canonical_venue_code($rawTable);
    if ($code === null || $code === '') {
        $code = $rawTable;
    }
    $codeU = strtoupper(trim($code));
    if ($codeU === '' || preg_match('/^WEB-/i', $codeU)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'table_code inválido (mesa física tipo M2, T16…).']);
        exit;
    }

    $businessDate = trim((string) ($data['business_date'] ?? ''));
    if ($businessDate === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $businessDate)) {
        $businessDate = date('Y-m-d');
    }

    $saleIdFilter = isset($data['sale_id']) ? (int) $data['sale_id'] : 0;
    $dryRun = filter_var($data['dry_run'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $confirm = filter_var($data['confirm'] ?? false, FILTER_VALIDATE_BOOLEAN);

    try {
        $conn->query("CREATE TABLE IF NOT EXISTS pos_table_live_state (
            table_code VARCHAR(32) NOT NULL,
            state ENUM('free','open_ticket','printed_unpaid') NOT NULL DEFAULT 'free',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (table_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $e) { /* ignore */ }

    $targets = [];
    $chk = $conn->query("SHOW TABLES LIKE 'sr_sales'");
    if ($chk && $chk->num_rows > 0) {
        $sr = $conn->query(
            "SELECT id, sr_ticket_id, folio, ticket_number, table_number, sale_date, sale_time, sale_datetime, opened_at
             FROM sr_sales WHERE status = 'open'
             ORDER BY sale_datetime DESC LIMIT 240",
        );
        if ($sr) {
            while ($row = $sr->fetch_assoc()) {
                if ($saleIdFilter > 0 && (int) ($row['id'] ?? 0) !== $saleIdFilter) {
                    continue;
                }
                $vn = bonifacios_table_canonical_venue_code((string) ($row['table_number'] ?? ''));
                if ($vn === null || strtoupper(trim($vn)) !== $codeU) {
                    continue;
                }
                if (!bonifacios_sr_sale_row_matches_business_day($businessDate, $row)) {
                    continue;
                }
                $targets[] = $row;
            }
        }
    }

    $summary = [];
    foreach ($targets as $r) {
        $summary[] = [
            'id' => (int) ($r['id'] ?? 0),
            'folio' => (string) ($r['folio'] ?? ''),
            'sr_ticket_id' => (string) ($r['sr_ticket_id'] ?? ''),
            'ticket_number' => (string) ($r['ticket_number'] ?? ''),
            'table_number_raw' => (string) ($r['table_number'] ?? ''),
            'sale_datetime' => (string) ($r['sale_datetime'] ?? ''),
        ];
    }

    if ($dryRun || !$confirm) {
        echo json_encode([
            'success' => true,
            'dry_run' => true,
            'table_code' => $codeU,
            'business_date' => $businessDate,
            'matches' => $summary,
            'hint' => 'Si son correctos, repite POST con confirm:true (sin dry_run) para liberar BD. Prefiere rerun de sync desde SR cuando sea posible.',
        ]);
        exit;
    }

    if ($summary === []) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'No hay ventas abiertas en sr_sales para esta mesa y día. El mapa debería verde tras actualizar.',
            'table_code' => $codeU,
            'business_date' => $businessDate,
        ]);
        exit;
    }

    $conn->begin_transaction();
    try {
        $delPos = $conn->prepare('DELETE FROM pos_table_live_state WHERE UPPER(TRIM(table_code)) = ?');
        $delPos->bind_param('s', $codeU);
        $delPos->execute();

        $cancelledIds = [];
        $upStmt = $conn->prepare("UPDATE sr_sales SET status = 'cancelled', closed_at = NOW() WHERE id = ? AND status = 'open'");
        foreach ($summary as $m) {
            $sid = (int) ($m['id'] ?? 0);
            if ($sid <= 0) {
                continue;
            }
            $upStmt->bind_param('i', $sid);
            $upStmt->execute();
            if ($conn->affected_rows > 0) {
                $cancelledIds[] = $sid;
            }
        }

        $conn->commit();
        echo json_encode([
            'success' => true,
            'table_code' => $codeU,
            'business_date' => $businessDate,
            'pos_cleared_canonical' => $codeU,
            'cancelled_sale_ids' => $cancelledIds,
            'message' => 'OK. Pulse «Actualizar mapa». La próxima sync de SR debe alinear también catálogo de tickets.',
        ]);
    } catch (Throwable $e) {
        $conn->rollback();
        throw $e;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
