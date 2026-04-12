<?php
require_once '../config/database.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $userId = requireAuth();
    $conn = getConnection();
    
    // Obtener información del usuario
    $userStmt = $conn->prepare("SELECT username, full_name FROM users WHERE id = ?");
    $userStmt->bind_param("i", $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    $user = $userResult->fetch_assoc();
    $userName = $user['full_name'] ?? $user['username'];

    if ($method === 'GET') {
        $quoteId = isset($_GET['quote_id']) ? intval($_GET['quote_id']) : 0;
        $action = $_GET['action'] ?? 'history';

        if ($action === 'history' && $quoteId > 0) {
            // Obtener historial de auditoría
            $stmt = $conn->prepare("
                SELECT 
                    qal.*,
                    u.full_name as user_full_name,
                    u.username
                FROM quote_audit_log qal
                LEFT JOIN users u ON qal.user_id = u.id
                WHERE qal.quote_id = ?
                ORDER BY qal.created_at DESC
                LIMIT 100
            ");
            $stmt->bind_param("i", $quoteId);
            $stmt->execute();
            $history = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            
            echo json_encode(['success' => true, 'history' => $history]);

        } elseif ($action === 'versions' && $quoteId > 0) {
            // Obtener todas las versiones
            $stmt = $conn->prepare("
                SELECT 
                    qv.*,
                    u.full_name as restored_by_name
                FROM quote_versions qv
                LEFT JOIN users u ON qv.created_by = u.id
                WHERE qv.quote_id = ?
                ORDER BY qv.version_number DESC
            ");
            $stmt->bind_param("i", $quoteId);
            $stmt->execute();
            $versions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            
            echo json_encode(['success' => true, 'versions' => $versions]);

        } elseif ($action === 'version' && $quoteId > 0) {
            // Obtener una versión específica
            $versionNumber = isset($_GET['version']) ? intval($_GET['version']) : 0;
            
            $stmt = $conn->prepare("
                SELECT * FROM quote_versions 
                WHERE quote_id = ? AND version_number = ?
            ");
            $stmt->bind_param("ii", $quoteId, $versionNumber);
            $stmt->execute();
            $version = $stmt->get_result()->fetch_assoc();
            
            if ($version) {
                echo json_encode(['success' => true, 'version' => $version]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Versión no encontrada']);
            }

        } elseif ($action === 'summary') {
            // Obtener resumen de cambios por cotización
            $stmt = $conn->prepare("
                SELECT * FROM quote_version_summary
                ORDER BY last_version_date DESC
            ");
            $stmt->execute();
            $summary = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            
            echo json_encode(['success' => true, 'summary' => $summary]);

        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Acción no válida o falta quote_id']);
        }

    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';

        if ($action === 'log') {
            // Registrar un cambio manual en auditoría
            $quoteId = intval($data['quote_id'] ?? 0);
            $actionType = $data['action_type'] ?? 'updated';
            $fieldChanged = $data['field_changed'] ?? null;
            $oldValue = $data['old_value'] ?? null;
            $newValue = $data['new_value'] ?? null;
            
            if ($quoteId === 0) {
                http_response_code(400);
                echo json_encode(['error' => 'quote_id requerido']);
                exit;
            }

            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

            $stmt = $conn->prepare("
                INSERT INTO quote_audit_log 
                (quote_id, user_id, user_name, action, field_changed, old_value, new_value, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("iisssssss", 
                $quoteId, $userId, $userName, $actionType, 
                $fieldChanged, $oldValue, $newValue, $ipAddress, $userAgent
            );
            $stmt->execute();

            echo json_encode(['success' => true, 'audit_id' => $stmt->insert_id]);

        } elseif ($action === 'restore') {
            // Restaurar una versión anterior
            $quoteId = intval($data['quote_id'] ?? 0);
            $versionNumber = intval($data['version_number'] ?? 0);

            if ($quoteId === 0 || $versionNumber === 0) {
                http_response_code(400);
                echo json_encode(['error' => 'quote_id y version_number requeridos']);
                exit;
            }

            // Llamar al procedimiento almacenado
            $stmt = $conn->prepare("CALL restore_quote_version(?, ?, ?, ?)");
            $stmt->bind_param("iiis", $quoteId, $versionNumber, $userId, $userName);
            
            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true, 
                    'message' => "Versión #{$versionNumber} restaurada exitosamente"
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Error al restaurar versión: ' . $stmt->error]);
            }

        } elseif ($action === 'compare') {
            // Comparar dos versiones
            $quoteId = intval($data['quote_id'] ?? 0);
            $version1 = intval($data['version_1'] ?? 0);
            $version2 = intval($data['version_2'] ?? 0);

            if ($quoteId === 0 || $version1 === 0 || $version2 === 0) {
                http_response_code(400);
                echo json_encode(['error' => 'quote_id, version_1 y version_2 requeridos']);
                exit;
            }

            // Obtener ambas versiones
            $stmt = $conn->prepare("
                SELECT * FROM quote_versions 
                WHERE quote_id = ? AND version_number IN (?, ?)
                ORDER BY version_number
            ");
            $stmt->bind_param("iii", $quoteId, $version1, $version2);
            $stmt->execute();
            $versions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            if (count($versions) !== 2) {
                http_response_code(404);
                echo json_encode(['error' => 'Una o ambas versiones no encontradas']);
                exit;
            }

            // Comparar campos
            $differences = [];
            $fields = ['name', 'phone', 'email', 'event_type', 'event_date', 'guests', 
                      'location', 'notes', 'status', 'quote_amount', 'menu_options', 
                      'beverages', 'services', 'decorations', 'additional_services',
                      'subtotal', 'tax', 'total', 'deposit', 'balance', 'payment_terms', 'notes_quote'];

            foreach ($fields as $field) {
                if ($versions[0][$field] !== $versions[1][$field]) {
                    $differences[] = [
                        'field' => $field,
                        'old_value' => $versions[0][$field],
                        'new_value' => $versions[1][$field]
                    ];
                }
            }

            echo json_encode([
                'success' => true,
                'differences' => $differences,
                'version_1' => $versions[0],
                'version_2' => $versions[1]
            ]);

        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Acción no válida']);
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

$conn->close();
?>
