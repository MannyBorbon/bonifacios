<?php
require_once '../config/database.php';
header('Content-Type: application/json');

try {
    requireAuth();

    $conn   = getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    /* ── AUTO-CREATE TABLE ───────────────────────────────────────────── */
    $conn->query("CREATE TABLE IF NOT EXISTS `note_attachments` (
        `id`          INT(11)       NOT NULL AUTO_INCREMENT,
        `note_id`     INT(11)       NOT NULL,
        `file_path`   VARCHAR(600)  NOT NULL,
        `file_name`   VARCHAR(300)  NOT NULL DEFAULT '',
        `file_type`   VARCHAR(50)   NOT NULL DEFAULT 'other',
        `file_size`   INT(11)       NOT NULL DEFAULT 0,
        `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_note_id` (`note_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    /* ── GET: list attachments for a note ────────────────────────────── */
    if ($method === 'GET') {
        $noteId = intval($_GET['note_id'] ?? 0);
        if (!$noteId) { http_response_code(400); echo json_encode(['error' => 'note_id required']); exit; }

        $stmt = $conn->prepare("SELECT id, file_path, file_name, file_type, file_size, created_at FROM note_attachments WHERE note_id = ? ORDER BY created_at ASC");
        $stmt->bind_param("i", $noteId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'attachments' => $rows]);
        exit;
    }

    /* ── POST: upload a file ─────────────────────────────────────────── */
    if ($method === 'POST' && !empty($_FILES['file'])) {
        $noteId = intval($_POST['note_id'] ?? 0);
        if (!$noteId) { http_response_code(400); echo json_encode(['error' => 'note_id required']); exit; }

        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['error' => 'Upload error: ' . $file['error']]);
            exit;
        }

        if ($file['size'] > 50 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['error' => 'Archivo demasiado grande (máx 50 MB)']);
            exit;
        }

        /* Detect type category */
        $mime      = mime_content_type($file['tmp_name']);
        $ext       = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'bin');
        $typeMap   = ['image' => 'image', 'video' => 'video', 'audio' => 'audio'];
        $fileType  = 'other';
        foreach ($typeMap as $k => $v) {
            if (strpos($mime, $k) === 0) { $fileType = $v; break; }
        }
        $pdfExts = ['pdf']; if (in_array($ext, $pdfExts)) $fileType = 'pdf';
        $docExts = ['doc','docx','xls','xlsx','ppt','pptx','txt','csv']; if (in_array($ext, $docExts)) $fileType = 'document';

        $uploadDir = __DIR__ . '/../uploads/note-attachments/';
        if (!file_exists($uploadDir)) mkdir($uploadDir, 0755, true);

        $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
        $filename = 'note_' . $noteId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;

        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            http_response_code(500); echo json_encode(['error' => 'No se pudo guardar el archivo']); exit;
        }

        $filePath = '/api/uploads/note-attachments/' . $filename;
        $fileSize = $file['size'];

        $stmt = $conn->prepare("INSERT INTO note_attachments (note_id, file_path, file_name, file_type, file_size) VALUES (?,?,?,?,?)");
        $stmt->bind_param("isssi", $noteId, $filePath, $safeName, $fileType, $fileSize);
        $stmt->execute();
        $newId = $conn->insert_id;

        echo json_encode([
            'success'   => true,
            'attachment' => [
                'id'         => $newId,
                'file_path'  => $filePath,
                'file_name'  => $safeName,
                'file_type'  => $fileType,
                'file_size'  => $fileSize,
                'created_at' => date('Y-m-d H:i:s'),
            ]
        ]);
        exit;
    }

    /* ── DELETE: remove an attachment ────────────────────────────────── */
    if ($method === 'DELETE' || ($method === 'POST' && empty($_FILES['file']))) {
        $data = json_decode(file_get_contents('php://input'), true);
        $attId = intval($data['attachment_id'] ?? 0);
        if (!$attId) { http_response_code(400); echo json_encode(['error' => 'attachment_id required']); exit; }

        $stmt = $conn->prepare("SELECT file_path FROM note_attachments WHERE id = ?");
        $stmt->bind_param("i", $attId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        if (!$row) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }

        $stmt2 = $conn->prepare("DELETE FROM note_attachments WHERE id = ?");
        $stmt2->bind_param("i", $attId);
        $stmt2->execute();

        /* Remove physical file */
        $physPath = __DIR__ . '/../../public_html' . $row['file_path'];
        if (!file_exists($physPath)) $physPath = __DIR__ . '/../..' . $row['file_path'];
        if (file_exists($physPath)) @unlink($physPath);

        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
