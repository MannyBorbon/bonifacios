<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

$userId = requireAuth();
$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function ensureChecklistTables(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS operational_indicators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(160) NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        due_time TIME DEFAULT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_active_sort (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS operational_indicator_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        indicator_id INT NOT NULL,
        log_date DATE NOT NULL,
        completed TINYINT(1) NOT NULL DEFAULT 0,
        is_on_time TINYINT(1) NOT NULL DEFAULT 0,
        completed_at DATETIME DEFAULT NULL,
        completed_by INT DEFAULT NULL,
        notes VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_indicator_date (indicator_id, log_date),
        KEY idx_log_date (log_date),
        CONSTRAINT fk_operational_indicator
            FOREIGN KEY (indicator_id) REFERENCES operational_indicators(id)
            ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function getUserRole(PDO $pdo, int $userId): string {
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return strtolower((string)($row['role'] ?? 'viewer'));
}

ensureChecklistTables($pdo);
$role = getUserRole($pdo, $userId);
$canManage = in_array($role, ['administrador', 'supervisor'], true);

if ($method === 'GET') {
    $targetDate = $_GET['date'] ?? date('Y-m-d');

    try {
        if ($action === 'daily_report') {
            $summaryStmt = $pdo->prepare("SELECT
                    COUNT(*) AS total_indicators,
                    SUM(CASE WHEN l.completed = 1 THEN 1 ELSE 0 END) AS completed_count,
                    SUM(CASE WHEN l.completed = 1 AND l.is_on_time = 1 THEN 1 ELSE 0 END) AS on_time_count
                FROM operational_indicators i
                LEFT JOIN operational_indicator_logs l
                    ON l.indicator_id = i.id
                    AND l.log_date = ?
                WHERE i.is_active = 1");
            $summaryStmt->execute([$targetDate]);
            $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC) ?: [];

            $total = (int)($summary['total_indicators'] ?? 0);
            $completed = (int)($summary['completed_count'] ?? 0);
            $onTime = (int)($summary['on_time_count'] ?? 0);
            $compliancePct = $total > 0 ? round(($completed / $total) * 100, 1) : 0.0;
            $onTimePct = $total > 0 ? round(($onTime / $total) * 100, 1) : 0.0;

            $salesStmt = $pdo->prepare("SELECT
                    COALESCE(SUM(total), 0) AS total_sales,
                    COUNT(*) AS tickets,
                    COALESCE(SUM(covers), 0) AS covers
                FROM sr_sales
                WHERE sale_datetime BETWEEN ? AND ?
                  AND status = 'closed'");
            $salesStmt->execute([$targetDate . ' 00:00:00', $targetDate . ' 23:59:59']);
            $sales = $salesStmt->fetch(PDO::FETCH_ASSOC) ?: ['total_sales' => 0, 'tickets' => 0, 'covers' => 0];

            echo json_encode([
                'success' => true,
                'date' => $targetDate,
                'operations' => [
                    'total_indicators' => $total,
                    'completed_count' => $completed,
                    'on_time_count' => $onTime,
                    'compliance_pct' => $compliancePct,
                    'on_time_pct' => $onTimePct,
                ],
                'sales' => [
                    'total_sales' => round((float)($sales['total_sales'] ?? 0), 2),
                    'tickets' => (int)($sales['tickets'] ?? 0),
                    'covers' => (int)($sales['covers'] ?? 0),
                ],
            ]);
            exit;
        }

        $stmt = $pdo->prepare("SELECT
                i.id,
                i.title,
                i.description,
                i.due_time,
                i.sort_order,
                i.is_active,
                l.completed,
                l.is_on_time,
                l.completed_at,
                l.completed_by,
                l.notes
            FROM operational_indicators i
            LEFT JOIN operational_indicator_logs l
                ON l.indicator_id = i.id
                AND l.log_date = ?
            WHERE i.is_active = 1
            ORDER BY i.sort_order ASC, i.id ASC");
        $stmt->execute([$targetDate]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $nowTs = strtotime(date('H:i:s'));
        $mapped = array_map(function($row) use ($nowTs) {
            $completed = (int)($row['completed'] ?? 0) === 1;
            $dueTime = (string)($row['due_time'] ?? '');
            $isOnTime = (int)($row['is_on_time'] ?? 0) === 1;
            $color = 'green';
            if (!$completed) {
                if (!empty($dueTime) && strtotime($dueTime) < $nowTs) {
                    $color = 'red';
                } else {
                    $color = 'yellow';
                }
            } else if (!$isOnTime) {
                $color = 'yellow';
            }
            return [
                'id' => (int)$row['id'],
                'title' => $row['title'],
                'description' => $row['description'],
                'due_time' => $row['due_time'],
                'sort_order' => (int)$row['sort_order'],
                'completed' => $completed,
                'is_on_time' => $isOnTime,
                'completed_at' => $row['completed_at'],
                'notes' => $row['notes'],
                'status_color' => $color,
            ];
        }, $rows);

        echo json_encode([
            'success' => true,
            'date' => $targetDate,
            'can_manage' => $canManage,
            'indicators' => $mapped,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true) ?? [];
    $postAction = (string)($payload['action'] ?? '');

    if (!$canManage) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Sin permisos para modificar indicadores']);
        exit;
    }

    try {
        if ($postAction === 'create_indicator') {
            $title = trim((string)($payload['title'] ?? ''));
            $description = trim((string)($payload['description'] ?? ''));
            $dueTime = trim((string)($payload['due_time'] ?? ''));
            $sortOrder = (int)($payload['sort_order'] ?? 0);
            if ($title === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'El titulo es obligatorio']);
                exit;
            }
            $stmt = $pdo->prepare("INSERT INTO operational_indicators (title, description, due_time, sort_order, created_by) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$title, $description !== '' ? $description : null, $dueTime !== '' ? $dueTime : null, $sortOrder, $userId]);
            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
            exit;
        }

        if ($postAction === 'update_indicator') {
            $id = (int)($payload['id'] ?? 0);
            $title = trim((string)($payload['title'] ?? ''));
            $description = trim((string)($payload['description'] ?? ''));
            $dueTime = trim((string)($payload['due_time'] ?? ''));
            $sortOrder = (int)($payload['sort_order'] ?? 0);
            if ($id <= 0 || $title === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Datos invalidos']);
                exit;
            }
            $stmt = $pdo->prepare("UPDATE operational_indicators SET title = ?, description = ?, due_time = ?, sort_order = ? WHERE id = ?");
            $stmt->execute([$title, $description !== '' ? $description : null, $dueTime !== '' ? $dueTime : null, $sortOrder, $id]);
            echo json_encode(['success' => true]);
            exit;
        }

        if ($postAction === 'delete_indicator') {
            $id = (int)($payload['id'] ?? 0);
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID invalido']);
                exit;
            }
            $stmt = $pdo->prepare("DELETE FROM operational_indicators WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            exit;
        }

        if ($postAction === 'toggle_indicator') {
            $id = (int)($payload['id'] ?? 0);
            $completed = (int)($payload['completed'] ?? 0) === 1 ? 1 : 0;
            $targetDate = (string)($payload['date'] ?? date('Y-m-d'));
            $notes = trim((string)($payload['notes'] ?? ''));
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID invalido']);
                exit;
            }

            $dueStmt = $pdo->prepare("SELECT due_time FROM operational_indicators WHERE id = ? LIMIT 1");
            $dueStmt->execute([$id]);
            $dueRow = $dueStmt->fetch(PDO::FETCH_ASSOC);
            $dueTime = (string)($dueRow['due_time'] ?? '');
            $isOnTime = 0;
            $completedAt = null;
            if ($completed === 1) {
                $completedAt = date('Y-m-d H:i:s');
                if ($dueTime === '') {
                    $isOnTime = 1;
                } else {
                    $isOnTime = (strtotime(date('H:i:s')) <= strtotime($dueTime)) ? 1 : 0;
                }
            }

            $stmt = $pdo->prepare("INSERT INTO operational_indicator_logs (indicator_id, log_date, completed, is_on_time, completed_at, completed_by, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    completed = VALUES(completed),
                    is_on_time = VALUES(is_on_time),
                    completed_at = VALUES(completed_at),
                    completed_by = VALUES(completed_by),
                    notes = VALUES(notes)");
            $stmt->execute([$id, $targetDate, $completed, $isOnTime, $completedAt, $completed === 1 ? $userId : null, $notes !== '' ? $notes : null]);
            echo json_encode(['success' => true]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Accion invalida']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Metodo no permitido']);

