<?php
/**
 * Pagos de aportaciones
 * GET    /api/finances/pagos.php?aportacion_id=  → listar pagos de una aportación
 * POST   /api/finances/pagos.php                 → registrar pago
 * DELETE /api/finances/pagos.php?id=             → eliminar pago
 */
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
requireAuth();

$conn   = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET ────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $aid = isset($_GET['aportacion_id']) ? intval($_GET['aportacion_id']) : null;
    if (!$aid) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'aportacion_id requerido']); exit; }

    $stmt = $conn->prepare("SELECT id, aportacion_id, monto, fecha_pago, metodo_pago, referencia, banco_origen, notas, created_by, created_at FROM aportacion_pagos WHERE aportacion_id = ? ORDER BY fecha_pago DESC, created_at DESC");
    $stmt->bind_param('i', $aid);
    $stmt->execute();
    $pagos = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    foreach ($pagos as &$p) { $p['monto'] = (float)$p['monto']; }
    echo json_encode(['success' => true, 'pagos' => $pagos]);
    exit;
}

// ── POST ───────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $body        = json_decode(file_get_contents('php://input'), true) ?? [];
    $aid         = intval($body['aportacion_id'] ?? 0);
    $monto       = (float)($body['monto'] ?? 0);
    $fecha       = trim($body['fecha_pago'] ?? date('Y-m-d'));
    $metodo      = trim($body['metodo_pago'] ?? '') ?: null;
    $referencia  = trim($body['referencia'] ?? '') ?: null;
    $banco_origen= trim($body['banco_origen'] ?? '') ?: null;
    $notas       = trim($body['notas'] ?? '');
    $created_by  = trim($body['created_by'] ?? '');

    if (!$aid || $monto <= 0 || !$fecha) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'aportacion_id, monto y fecha requeridos']);
        exit;
    }

    // Verify aportacion exists
    $check = $conn->prepare("SELECT id FROM aportaciones WHERE id = ?");
    $check->bind_param('i', $aid);
    $check->execute();
    if (!$check->get_result()->fetch_assoc()) {
        http_response_code(404); echo json_encode(['success' => false, 'error' => 'Aportación no encontrada']); exit;
    }
    $check->close();

    $stmt = $conn->prepare("INSERT INTO aportacion_pagos (aportacion_id, monto, fecha_pago, metodo_pago, referencia, banco_origen, notas, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('idssssss', $aid, $monto, $fecha, $metodo, $referencia, $banco_origen, $notas, $created_by);
    $stmt->execute();
    $new_id = $conn->insert_id;
    $stmt->close();

    echo json_encode(['success' => true, 'id' => $new_id]);
    exit;
}

// ── DELETE ─────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'id requerido']); exit; }

    $stmt = $conn->prepare("DELETE FROM aportacion_pagos WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Método no soportado']);
