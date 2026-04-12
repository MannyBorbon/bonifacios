<?php
/**
 * Archivos / comprobantes de aportaciones
 * GET    ?aportacion_id=   → listar archivos
 * POST   multipart/form-data → subir archivo
 * DELETE ?id=              → eliminar archivo
 */
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
requireAuth();

$conn   = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

define('UPLOAD_DIR', __DIR__ . '/../../uploads/aportaciones/');
define('UPLOAD_URL', '/uploads/aportaciones/');

// ── GET ────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $aid = isset($_GET['aportacion_id']) ? intval($_GET['aportacion_id']) : null;
    if (!$aid) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'aportacion_id requerido']); exit; }

    $stmt = $conn->prepare("SELECT * FROM aportacion_archivos WHERE aportacion_id = ? ORDER BY created_at DESC");
    $stmt->bind_param('i', $aid);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    foreach ($rows as &$r) {
        $r['url'] = UPLOAD_URL . $r['aportacion_id'] . '/' . $r['nombre_archivo'];
    }
    echo json_encode(['success' => true, 'archivos' => $rows]);
    exit;
}

// ── POST (upload) ───────────────────────────────────────────────────────────
if ($method === 'POST') {
    $aid      = intval($_POST['aportacion_id'] ?? 0);
    $pago_id  = intval($_POST['pago_id'] ?? 0) ?: null;
    $tipo     = $_POST['tipo'] ?? 'otro';
    $notas    = trim($_POST['notas'] ?? '') ?: null;
    $subido_por = trim($_POST['subido_por'] ?? '') ?: null;

    $valid_tipos = ['comprobante_aportacion','comprobante_pago','referencia','otro'];
    if (!in_array($tipo, $valid_tipos)) $tipo = 'otro';

    if (!$aid || !isset($_FILES['archivo'])) {
        http_response_code(400); echo json_encode(['success' => false, 'error' => 'aportacion_id y archivo requeridos']); exit;
    }

    $file = $_FILES['archivo'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400); echo json_encode(['success' => false, 'error' => 'Error al subir archivo']); exit;
    }

    $max_size = 10 * 1024 * 1024; // 10 MB
    if ($file['size'] > $max_size) {
        http_response_code(400); echo json_encode(['success' => false, 'error' => 'Archivo demasiado grande (máx 10MB)']); exit;
    }

    $allowed_mime = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
    $mime = mime_content_type($file['tmp_name']);
    if (!in_array($mime, $allowed_mime)) {
        http_response_code(400); echo json_encode(['success' => false, 'error' => 'Tipo de archivo no permitido (jpg, png, gif, webp, pdf)']); exit;
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $nombre_archivo = uniqid('arc_', true) . '.' . strtolower($ext);
    $dir = UPLOAD_DIR . $aid . '/';

    if (!is_dir($dir)) mkdir($dir, 0755, true);

    if (!move_uploaded_file($file['tmp_name'], $dir . $nombre_archivo)) {
        http_response_code(500); echo json_encode(['success' => false, 'error' => 'No se pudo guardar el archivo']); exit;
    }

    $nombre_original = $file['name'];
    $tamano = $file['size'];

    $stmt = $conn->prepare("INSERT INTO aportacion_archivos (aportacion_id, pago_id, tipo, nombre_original, nombre_archivo, mime_type, tamano, notas, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('iissssiss', $aid, $pago_id, $tipo, $nombre_original, $nombre_archivo, $mime, $tamano, $notas, $subido_por);
    $stmt->execute();
    $new_id = $conn->insert_id;
    $stmt->close();

    echo json_encode([
        'success' => true,
        'id'      => $new_id,
        'url'     => UPLOAD_URL . $aid . '/' . $nombre_archivo,
        'nombre_archivo' => $nombre_archivo,
        'nombre_original' => $nombre_original,
    ]);
    exit;
}

// ── DELETE ──────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'id requerido']); exit; }

    $stmt = $conn->prepare("SELECT aportacion_id, nombre_archivo FROM aportacion_archivos WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($row) {
        $path = UPLOAD_DIR . $row['aportacion_id'] . '/' . $row['nombre_archivo'];
        if (file_exists($path)) unlink($path);
        $del = $conn->prepare("DELETE FROM aportacion_archivos WHERE id = ?");
        $del->bind_param('i', $id);
        $del->execute();
    }

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Método no soportado']);
