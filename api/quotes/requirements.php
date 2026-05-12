<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    requireAuth();
    $conn = getConnection();

    if ($method === 'GET') {
        $quoteId = isset($_GET['quote_id']) ? intval($_GET['quote_id']) : 0;
        if (!$quoteId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'quote_id required']);
            $conn->close();
            exit;
        }
        $stmt = $conn->prepare('SELECT * FROM quote_requirements WHERE quote_id = ? ORDER BY sort_order ASC, id ASC');
        $stmt->bind_param('i', $quoteId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'requirements' => $rows]);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            $data = [];
        }
        $action = $data['action'] ?? 'add';

        if ($action === 'add') {
            $quoteId = intval($data['quote_id'] ?? 0);
            $item = trim($data['item'] ?? '');
            if (!$quoteId || $item === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'quote_id and item required']);
                $conn->close();
                exit;
            }
            $stmt = $conn->prepare(
                'INSERT INTO quote_requirements (quote_id, item, is_checked, sort_order) VALUES (?, ?, 0, '
                . '(SELECT COALESCE(MAX(sort_order),0)+1 FROM quote_requirements r2 WHERE r2.quote_id = ?))'
            );
            $stmt->bind_param('isi', $quoteId, $item, $quoteId);
            $stmt->execute();
            $newId = $stmt->insert_id;
            $fetch = $conn->prepare('SELECT * FROM quote_requirements WHERE id = ?');
            $fetch->bind_param('i', $newId);
            $fetch->execute();
            $row = $fetch->get_result()->fetch_assoc();
            echo json_encode(['success' => true, 'requirement' => $row]);
        } elseif ($action === 'toggle') {
            $id = intval($data['id'] ?? 0);
            $checked = intval($data['is_checked'] ?? 0);
            $stmt = $conn->prepare('UPDATE quote_requirements SET is_checked = ? WHERE id = ?');
            $stmt->bind_param('ii', $checked, $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        } elseif ($action === 'delete') {
            $id = intval($data['id'] ?? 0);
            $stmt = $conn->prepare('DELETE FROM quote_requirements WHERE id = ?');
            $stmt->bind_param('i', $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        } elseif ($action === 'save_all') {
            $quoteId = intval($data['quote_id'] ?? 0);
            $items = $data['items'] ?? [];
            if (!is_array($items)) {
                $items = [];
            }
            if (!$quoteId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'quote_id required']);
                $conn->close();
                exit;
            }
            $conn->begin_transaction();
            $delAll = $conn->prepare('DELETE FROM quote_requirements WHERE quote_id = ?');
            $delAll->bind_param('i', $quoteId);
            $delAll->execute();
            $stmt = $conn->prepare('INSERT INTO quote_requirements (quote_id, item, is_checked, sort_order) VALUES (?, ?, ?, ?)');
            foreach ($items as $i => $req) {
                $item = trim($req['item'] ?? '');
                $checked = intval($req['is_checked'] ?? 0);
                $sort = (int)$i;
                if ($item !== '') {
                    $stmt->bind_param('isii', $quoteId, $item, $checked, $sort);
                    $stmt->execute();
                }
            }
            $conn->commit();
            echo json_encode(['success' => true]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'invalid action']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        $conn->close();
        exit;
    }
} catch (Exception $e) {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
