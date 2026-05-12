<?php
require_once '../config/database.php';
require_once __DIR__ . '/../lib/table_venue_codes.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

/**
 * Códigos permitidos (Soft Restaurant + legado CD/TA/TB).
 */
function bonifacios_allowed_table_code(string $raw): bool
{
    $c = strtoupper(trim($raw));
    if ($c === '') {
        return false;
    }
    if (preg_match('/^(CD|TA|TB)-\d+$/', $c)) {
        return true;
    }
    if (preg_match('/^M([1-9]|1[0-1])$/', $c)) {
        return true;
    }
    if (preg_match('/^T(1[6-9]|2[0-2])$/', $c)) {
        return true;
    }
    if (preg_match('/^TB[1-8]$/', $c)) {
        return true;
    }
    if (preg_match('/^BARR-I[1-5]$/', $c) || preg_match('/^BARR-E[1-5]$/', $c)) {
        return true;
    }

    return false;
}

try {
    requireAuth();
    $conn = getConnection();

    try {
        $conn->query(
            'ALTER TABLE special_reservations ADD COLUMN secondary_table_code VARCHAR(32) NULL DEFAULT NULL AFTER table_code',
        );
    } catch (Throwable $e) { /* ignore if exists */
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        $data = [];
    }

    $id = (int)($data['id'] ?? 0);
    $rawTable = strtoupper(trim((string) ($data['table_code'] ?? '')));
    $tableCode = bonifacios_table_canonical_venue_code($rawTable) ?? $rawTable;
    $rawSecondary = isset($data['secondary_table_code'])
        ? strtoupper(trim((string) ($data['secondary_table_code'])))
        : '';
    $secondaryCode = '';
    if ($rawSecondary !== '') {
        $secondaryCode = bonifacios_table_canonical_venue_code($rawSecondary) ?? $rawSecondary;
    }

    if ($id <= 0 || $tableCode === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID de reservación y código de mesa son requeridos']);
        exit;
    }

    if (!bonifacios_allowed_table_code($tableCode)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Código de mesa no reconocido. Use M1–M11, T16–T22, TB1–TB8, BARR-I1–BARR-I5, BARR-E1–BARR-E5 o legado CD-x, TA-x, TB-x.',
        ]);
        exit;
    }

    if ($secondaryCode !== '') {
        if ($secondaryCode === $tableCode) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'La segunda mesa no puede ser la misma que la principal.']);
            exit;
        }
        if (!bonifacios_allowed_table_code($secondaryCode)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Código de mesa junta no reconocido (misma lista que mesa principal).',
            ]);
            exit;
        }
    }

    $checkSql = 'SELECT id FROM special_reservations WHERE id = ?';
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param('i', $id);
    $checkStmt->execute();

    if ($checkStmt->get_result()->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Reservación no encontrada']);
        exit;
    }

    $metaStmt = $conn->prepare('SELECT reservation_date FROM special_reservations WHERE id = ? LIMIT 1');
    $metaStmt->bind_param('i', $id);
    $metaStmt->execute();
    $metaRow = $metaStmt->get_result()->fetch_assoc();
    $reservationDate = isset($metaRow['reservation_date'])
        ? substr((string) $metaRow['reservation_date'], 0, 10)
        : '';
    $todayYmd = date('Y-m-d');
    if ($reservationDate !== '' && $reservationDate === $todayYmd) {
        foreach (array_unique(array_filter([$tableCode, $secondaryCode])) as $busyCode) {
            if ($busyCode !== '' && bonifacios_table_live_busy($conn, $busyCode, $reservationDate)) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Alguna mesa de la combinación está ocupada en POS (cuenta abierta o ticket impreso sin cobrar) o tiene venta abierta '
                        . 'en el sistema. No se puede usar para otra reserva hoy hasta liberarla o cobrar.',
                ]);
                exit;
            }
        }
    }

    if ($secondaryCode !== '') {
        $updateSql = 'UPDATE special_reservations SET table_code = ?, secondary_table_code = ?, updated_at = NOW() WHERE id = ?';
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bind_param('ssi', $tableCode, $secondaryCode, $id);
        $updated = $updateStmt->execute();
    } else {
        $updateSql = 'UPDATE special_reservations SET table_code = ?, secondary_table_code = NULL, updated_at = NOW() WHERE id = ?';
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bind_param('si', $tableCode, $id);
        $updated = $updateStmt->execute();
    }

    if ($updated) {
        echo json_encode([
            'success' => true,
            'message' => 'Mesa asignada correctamente',
            'table_code' => $tableCode,
            'secondary_table_code' => $secondaryCode !== '' ? $secondaryCode : null,
        ]);
    } else {
        throw new Exception('Error al asignar mesa: ' . $updateStmt->error);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
