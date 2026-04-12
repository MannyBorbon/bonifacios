<?php
/**
 * Comunidades CRUD
 * GET    /api/communities/           → lista con stats
 * GET    /api/communities/?id=       → detalle de una comunidad
 * POST   /api/communities/           → crear
 * PUT    /api/communities/?id=       → actualizar
 * DELETE /api/communities/?id=       → eliminar
 */
declare(strict_types=1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/../config/database.php';
requireAuth();

$conn   = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? intval($_GET['id']) : null;

// ── GET ────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    if ($id) {
        // Single community with notes and visits
        $stmt = $conn->prepare("SELECT * FROM communities WHERE id = ? LIMIT 1");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $comm = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$comm) { http_response_code(404); echo json_encode(['success' => false, 'error' => 'Not found']); exit; }

        // Notes
        $ns = $conn->prepare("SELECT id, content, created_by, created_at FROM community_notes WHERE community_id = ? ORDER BY created_at DESC");
        $ns->bind_param('i', $id);
        $ns->execute();
        $comm['notes_list'] = $ns->get_result()->fetch_all(MYSQLI_ASSOC);
        $ns->close();

        // Visits (last 10)
        $vs = $conn->prepare("SELECT id, visit_date, guests, total_spent, occasion, notes FROM community_visits WHERE community_id = ? ORDER BY visit_date DESC LIMIT 10");
        $vs->bind_param('i', $id);
        $vs->execute();
        $comm['visits'] = $vs->get_result()->fetch_all(MYSQLI_ASSOC);
        $vs->close();

        // Aggregated stats
        $ag = $conn->prepare("SELECT COUNT(*) AS total_visits, COALESCE(SUM(total_spent),0) AS total_spent, MAX(visit_date) AS last_visit FROM community_visits WHERE community_id = ?");
        $ag->bind_param('i', $id);
        $ag->execute();
        $stats = $ag->get_result()->fetch_assoc();
        $ag->close();
        $comm['total_visits'] = intval($stats['total_visits']);
        $comm['total_spent']  = floatval($stats['total_spent']);
        $comm['last_visit']   = $stats['last_visit'];

        echo json_encode(['success' => true, 'community' => $comm]);
    } else {
        // List all with quick stats
        $rows = $conn->query(
            "SELECT c.*,
                COALESCE(v.total_visits,0)  AS total_visits,
                COALESCE(v.total_spent,0)   AS total_spent,
                v.last_visit
             FROM communities c
             LEFT JOIN (
                SELECT community_id,
                       COUNT(*)            AS total_visits,
                       SUM(total_spent)    AS total_spent,
                       MAX(visit_date)     AS last_visit
                FROM community_visits GROUP BY community_id
             ) v ON c.id = v.community_id
             ORDER BY c.status = 'vip' DESC, c.name ASC"
        )->fetch_all(MYSQLI_ASSOC);

        echo json_encode(['success' => true, 'communities' => $rows]);
    }
    exit;
}

// ── POST: create ───────────────────────────────────────────────────────────
if ($method === 'POST') {
    $b = json_decode(file_get_contents('php://input'), true);
    if (!$b) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'Invalid JSON']); exit; }

    $name    = trim($b['name']         ?? '');
    $contact = trim($b['contact_name'] ?? '');
    $phone   = trim($b['phone']        ?? '');
    $email   = trim($b['email']        ?? '');
    $members = intval($b['members']    ?? 1);
    $address = trim($b['address']      ?? '');
    $notes   = trim($b['notes']        ?? '');
    $status  = $b['status']            ?? 'activo';
    $color   = $b['avatar_color']      ?? '#22d3ee';

    if (!$name) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'Nombre requerido']); exit; }

    $stmt = $conn->prepare("INSERT INTO communities (name, contact_name, phone, email, members, address, notes, status, avatar_color) VALUES (?,?,?,?,?,?,?,?,?)");
    $stmt->bind_param('ssssissss', $name, $contact, $phone, $email, $members, $address, $notes, $status, $color);
    if ($stmt->execute()) {
        $newId = $conn->insert_id;
        echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Comunidad creada']);
    } else {
        http_response_code(500); echo json_encode(['success' => false, 'error' => $stmt->error]);
    }
    $stmt->close();
    exit;
}

// ── PUT: update ────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'id required']); exit; }
    $b = json_decode(file_get_contents('php://input'), true);

    $name    = trim($b['name']         ?? '');
    $contact = trim($b['contact_name'] ?? '');
    $phone   = trim($b['phone']        ?? '');
    $email   = trim($b['email']        ?? '');
    $members = intval($b['members']    ?? 1);
    $address = trim($b['address']      ?? '');
    $notes   = trim($b['notes']        ?? '');
    $status  = $b['status']            ?? 'activo';

    $stmt = $conn->prepare("UPDATE communities SET name=?, contact_name=?, phone=?, email=?, members=?, address=?, notes=?, status=? WHERE id=?");
    $stmt->bind_param('ssssisssi', $name, $contact, $phone, $email, $members, $address, $notes, $status, $id);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Comunidad actualizada']);
    } else {
        http_response_code(500); echo json_encode(['success' => false, 'error' => $stmt->error]);
    }
    $stmt->close();
    exit;
}

// ── DELETE ─────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'id required']); exit; }
    $stmt = $conn->prepare("DELETE FROM communities WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    echo json_encode(['success' => true, 'deleted' => $stmt->affected_rows > 0]);
    $stmt->close();
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
