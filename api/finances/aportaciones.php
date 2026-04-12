<?php
/**
 * Aportaciones CRUD
 * GET    /api/finances/aportaciones.php          → lista con total pagado por cada una
 * POST   /api/finances/aportaciones.php          → crear
 * PUT    /api/finances/aportaciones.php?id=      → actualizar
 * DELETE /api/finances/aportaciones.php?id=      → eliminar
 */
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
requireAuth();

$conn   = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? intval($_GET['id']) : null;

// ── GET ────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    // Single record by id
    if ($id) {
        $stmt = $conn->prepare("
        SELECT a.*,
               COALESCE(SUM(p.monto),0)  AS total_pagado,
               COUNT(p.id)               AS num_pagos
        FROM   aportaciones a
        LEFT JOIN aportacion_pagos p ON p.aportacion_id = a.id
        WHERE  a.id = ?
        GROUP  BY a.id
        ");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$row) { http_response_code(404); echo json_encode(['success' => false, 'error' => 'No encontrado']); exit; }
        $row['monto']       = (float)$row['monto'];
        $row['total_pagado']= (float)$row['total_pagado'];
        $row['num_pagos']   = (int)$row['num_pagos'];
        $row['saldado']     = $row['total_pagado'] >= $row['monto'];
        echo json_encode(['success' => true, 'aportacion' => $row]);
        exit;
    }
    $rows = $conn->query("
        SELECT a.*,
               COALESCE(SUM(p.monto), 0) AS total_pagado,
               COUNT(p.id)               AS num_pagos
        FROM aportaciones a
        LEFT JOIN aportacion_pagos p ON p.aportacion_id = a.id
        GROUP BY a.id
        ORDER BY a.created_at ASC
    ")->fetch_all(MYSQLI_ASSOC);

    foreach ($rows as &$r) {
        $r['monto']       = (float)$r['monto'];
        $r['total_pagado'] = (float)$r['total_pagado'];
        $r['num_pagos']    = (int)$r['num_pagos'];
        $r['saldado']      = $r['total_pagado'] >= $r['monto'];
    }
    echo json_encode(['success' => true, 'aportaciones' => $rows]);
    exit;
}

// ── POST ───────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $nombre = trim($body['nombre'] ?? '');
    $monto  = (float)($body['monto'] ?? 0);
    $fecha  = trim($body['fecha_aportacion'] ?? '') ?: null;
    $banco  = trim($body['banco'] ?? '') ?: null;
    $clabe  = trim($body['clabe'] ?? '') ?: null;
    $cuenta = trim($body['cuenta'] ?? '') ?: null;
    $titular= trim($body['titular'] ?? '') ?: null;
    $metodo = trim($body['metodo_aportacion'] ?? '') ?: null;
    $notas  = trim($body['notas'] ?? '') ?: null;
    $ref    = trim($body['referencia'] ?? '') ?: null;
    if (!$nombre || $monto < 0) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'Nombre y monto requeridos']); exit; }

    $stmt = $conn->prepare("INSERT INTO aportaciones (nombre, monto, fecha_aportacion, banco, clabe, cuenta, titular, metodo_aportacion, notas, referencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('sdssssssss', $nombre, $monto, $fecha, $banco, $clabe, $cuenta, $titular, $metodo, $notas, $ref);
    $stmt->execute();
    echo json_encode(['success' => true, 'id' => $conn->insert_id]);
    exit;
}

// ── PUT ────────────────────────────────────────────────────────────────────
if ($method === 'PUT' && $id) {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $nombre = trim($body['nombre'] ?? '');
    $monto  = (float)($body['monto'] ?? 0);
    $fecha  = trim($body['fecha_aportacion'] ?? '') ?: null;
    $banco  = trim($body['banco'] ?? '') ?: null;
    $clabe  = trim($body['clabe'] ?? '') ?: null;
    $cuenta = trim($body['cuenta'] ?? '') ?: null;
    $titular= trim($body['titular'] ?? '') ?: null;
    $metodo = trim($body['metodo_aportacion'] ?? '') ?: null;
    $notas  = trim($body['notas'] ?? '') ?: null;
    $ref    = trim($body['referencia'] ?? '') ?: null;
    if (!$nombre || $monto < 0) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'Datos inválidos']); exit; }

    $stmt = $conn->prepare("UPDATE aportaciones SET nombre=?, monto=?, fecha_aportacion=?, banco=?, clabe=?, cuenta=?, titular=?, metodo_aportacion=?, notas=?, referencia=? WHERE id=?");
    $stmt->bind_param('sdssssssssi', $nombre, $monto, $fecha, $banco, $clabe, $cuenta, $titular, $metodo, $notas, $ref, $id);
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}

// ── DELETE ─────────────────────────────────────────────────────────────────
if ($method === 'DELETE' && $id) {
    $stmt = $conn->prepare("DELETE FROM aportaciones WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Método no soportado']);
