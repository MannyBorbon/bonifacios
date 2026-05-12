<?php
require_once '../config/database.php';
require_once '../config/smtp.php';
require_once '../notifications/push-lib.php';
date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $userId = requireAuth();
    $conn   = getConnection();
    
    $conn->query("
        CREATE TABLE IF NOT EXISTS meetings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(180) NOT NULL,
            description TEXT NULL,
            scheduled_at DATETIME NULL,
            started_at DATETIME NULL,
            ended_at DATETIME NULL,
            status ENUM('scheduled','active','ended') NOT NULL DEFAULT 'scheduled',
            created_by INT NOT NULL,
            moderator_user_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_meetings_status (status),
            INDEX idx_meetings_created (created_by),
            INDEX idx_meetings_moderator (moderator_user_id)
        )
    ");
    try { $conn->query("ALTER TABLE meetings ADD COLUMN moderator_user_id INT NULL"); } catch (Throwable $e) { /* ignore */ }
    $conn->query("UPDATE meetings SET moderator_user_id = created_by WHERE moderator_user_id IS NULL");

    $conn->query("
        CREATE TABLE IF NOT EXISTS meeting_participants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            meeting_id INT NOT NULL,
            user_id INT NOT NULL,
            participant_role ENUM('host','moderator','participant') NOT NULL DEFAULT 'participant',
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            left_at DATETIME NULL,
            INDEX idx_meeting_participants_meeting (meeting_id),
            INDEX idx_meeting_participants_user (user_id),
            INDEX idx_meeting_participants_role (participant_role)
        )
    ");
    try { $conn->query("ALTER TABLE meeting_participants ADD COLUMN participant_role ENUM('host','moderator','participant') NOT NULL DEFAULT 'participant'"); } catch (Throwable $e) { /* ignore */ }

    $conn->query("
        CREATE TABLE IF NOT EXISTS meeting_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            meeting_id INT NOT NULL,
            sender_user_id INT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_meeting_messages_meeting (meeting_id),
            INDEX idx_meeting_messages_sender (sender_user_id),
            INDEX idx_meeting_messages_created (created_at)
        )
    ");

    $conn->query("
        CREATE TABLE IF NOT EXISTS meeting_minutes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            meeting_id INT NOT NULL UNIQUE,
            content LONGTEXT NULL,
            updated_by INT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_meeting_minutes_meeting (meeting_id)
        )
    ");

    $conn->query("
        CREATE TABLE IF NOT EXISTS meeting_webrtc_signals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            meeting_id INT NOT NULL,
            from_user_id INT NOT NULL,
            to_user_id INT NOT NULL,
            signal_type ENUM('offer','answer','ice') NOT NULL,
            payload LONGTEXT NOT NULL,
            is_consumed TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_webrtc_to (meeting_id, to_user_id, is_consumed),
            INDEX idx_webrtc_cleanup (created_at)
        )
    ");

    // Invitations table (visibility control)
    $conn->query("CREATE TABLE IF NOT EXISTS workspace_meeting_invites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        meeting_id INT NOT NULL,
        user_id INT NOT NULL,
        status ENUM('invited','accepted','declined') NOT NULL DEFAULT 'invited',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_meeting_user (meeting_id, user_id),
        KEY meeting_id (meeting_id),
        KEY user_id (user_id)
    )");

    $isMeetingModerator = function(int $meetingId, int $uid) use ($conn): bool {
        $stmt = $conn->prepare("
            SELECT m.id
            FROM meetings m
            LEFT JOIN meeting_participants mp
              ON mp.meeting_id = m.id
             AND mp.user_id = ?
             AND mp.left_at IS NULL
            WHERE m.id = ?
              AND (
                m.created_by = ?
                OR m.moderator_user_id = ?
                OR mp.participant_role IN ('host','moderator')
              )
            LIMIT 1
        ");
        $stmt->bind_param("iiii", $uid, $meetingId, $uid, $uid);
        $stmt->execute();
        return $stmt->get_result()->num_rows > 0;
    };

    $isMeetingMember = function(int $meetingId, int $uid) use ($conn): bool {
        $stmt = $conn->prepare("
            SELECT id
            FROM meeting_participants
            WHERE meeting_id = ?
              AND user_id = ?
              AND left_at IS NULL
            LIMIT 1
        ");
        $stmt->bind_param("ii", $meetingId, $uid);
        $stmt->execute();
        return $stmt->get_result()->num_rows > 0;
    };

    $meetingTitleById = function(int $meetingId) use ($conn): string {
        $stmt = $conn->prepare("SELECT title FROM meetings WHERE id = ? LIMIT 1");
        $stmt->bind_param("i", $meetingId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        return trim((string)($row['title'] ?? 'Reunión'));
    };

    $activeUserIds = function(int $excludeUser = 0) use ($conn): array {
        $rows = $conn->query("SELECT id FROM users WHERE is_active = TRUE")->fetch_all(MYSQLI_ASSOC);
        $ids = array_map(static fn($row) => intval($row['id'] ?? 0), $rows ?: []);
        $ids = array_values(array_filter($ids, static fn($id) => $id > 0 && $id !== $excludeUser));
        return array_values(array_unique($ids));
    };

        // Ensure personal calendar exists and return id
    $personalCalendarId = function(int $uid) use ($conn): int {
        $stmt = $conn->prepare("SELECT id FROM workspace_calendars WHERE calendar_type='personal' AND owner_user_id=? LIMIT 1");
        $stmt->bind_param("i", $uid);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        if ($row) return intval($row['id']);
        $name = 'Mi calendario';
        $ins = $conn->prepare("INSERT INTO workspace_calendars (calendar_type,name,owner_user_id) VALUES ('personal',?,?)");
        $ins->bind_param("si", $name, $uid);
        $ins->execute();
        return intval($ins->insert_id);
    };

    $meetingParticipantUserIds = function(int $meetingId, int $excludeUser = 0) use ($conn): array {
        $stmt = $conn->prepare("
            SELECT user_id
            FROM meeting_participants
            WHERE meeting_id = ?
              AND left_at IS NULL
        ");
        $stmt->bind_param("i", $meetingId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $ids = array_map(static fn($row) => intval($row['user_id'] ?? 0), $rows ?: []);
        $ids = array_values(array_filter($ids, static fn($id) => $id > 0 && $id !== $excludeUser));
        return array_values(array_unique($ids));
    };

    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'list';

        if ($action === 'list') {
            $rows = $conn->query("
                SELECT m.*, u.full_name as creator_name,
                    (SELECT COUNT(*) FROM meeting_participants mp WHERE mp.meeting_id = m.id AND mp.left_at IS NULL) as active_count,
                    (SELECT COUNT(*) FROM meeting_participants mp2 WHERE mp2.meeting_id = m.id AND mp2.user_id = $userId AND mp2.left_at IS NULL) as i_am_in,
                    (SELECT participant_role FROM meeting_participants mp3 WHERE mp3.meeting_id = m.id AND mp3.user_id = $userId AND mp3.left_at IS NULL ORDER BY mp3.id DESC LIMIT 1) as my_role
                FROM meetings m
                LEFT JOIN users u ON m.created_by = u.id
                WHERE (
                    m.created_by = $userId
                    OR EXISTS (SELECT 1 FROM meeting_participants p WHERE p.meeting_id = m.id AND p.user_id = $userId AND p.left_at IS NULL)
                    OR EXISTS (SELECT 1 FROM workspace_meeting_invites wi WHERE wi.meeting_id = m.id AND wi.user_id = $userId AND wi.status <> 'declined')
                )
                ORDER BY
                    CASE m.status WHEN 'active' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
                    m.scheduled_at DESC
                LIMIT 50
            ")->fetch_all(MYSQLI_ASSOC);
            foreach ($rows as &$row) {
                $role = strtolower((string)($row['my_role'] ?? ''));
                $row['can_moderate'] = (int)(
                    intval($row['created_by']) === intval($userId)
                    || intval($row['moderator_user_id'] ?? 0) === intval($userId)
                    || in_array($role, ['host', 'moderator'], true)
                );
            }
            echo json_encode(['success' => true, 'meetings' => $rows]);

        } elseif ($action === 'room') {
            $meetingId = intval($_GET['id'] ?? 0);
            if (!$meetingId) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }

            $stmt = $conn->prepare("
                SELECT m.*, u.full_name as creator_name
                FROM meetings m LEFT JOIN users u ON m.created_by = u.id
                WHERE m.id = ?
            ");
            $stmt->bind_param("i", $meetingId);
            $stmt->execute();
            $meeting = $stmt->get_result()->fetch_assoc();
            if (!$meeting) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }
            // Verificar visibilidad: creador, participante activo o invitado vigente
            $stmtVis = $conn->prepare("SELECT 1 FROM workspace_meeting_invites WHERE meeting_id=? AND user_id=? AND status<>'declined' LIMIT 1");
            $stmtVis->bind_param('ii', $meetingId, $userId);
            $stmtVis->execute();
            $isInvited = $stmtVis->get_result()->num_rows > 0;
            if (intval($meeting['created_by']) !== intval($userId) && !$isMeetingMember($meetingId, intval($userId)) && !$isInvited) {
                http_response_code(403);
                echo json_encode(['error' => 'No autorizado para esta reunión']);
                exit;
            }

            // Active participants
            $pStmt = $conn->prepare("
                SELECT mp.*, u.full_name, u.username, u.profile_photo, u.role
                FROM meeting_participants mp
                JOIN users u ON mp.user_id = u.id
                WHERE mp.meeting_id = ? AND mp.left_at IS NULL
                ORDER BY mp.joined_at ASC
            ");
            $pStmt->bind_param("i", $meetingId);
            $pStmt->execute();
            $participants = $pStmt->get_result()->fetch_all(MYSQLI_ASSOC);

            $canModerate = $isMeetingModerator($meetingId, intval($userId));

            // Attendee IDs (invited users who should see this meeting)
            $attStmt = $conn->prepare("SELECT user_id FROM workspace_meeting_invites WHERE meeting_id = ?");
            $attStmt->bind_param("i", $meetingId);
            $attStmt->execute();
            $attRows = $attStmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $attendeeIds = array_map(static fn($r) => intval($r['user_id']), $attRows);
            $creatorId = intval($meeting['created_by'] ?? 0);
            if ($creatorId > 0 && !in_array($creatorId, $attendeeIds)) $attendeeIds[] = $creatorId;

            echo json_encode(['success' => true, 'meeting' => $meeting, 'participants' => $participants, 'can_moderate' => $canModerate, 'attendee_ids' => array_values($attendeeIds)]);
            exit;
        } elseif ($action === 'messages') {
            $meetingId = intval($_GET['meeting_id'] ?? 0);
            if (!$meetingId) { http_response_code(400); echo json_encode(['error' => 'meeting_id required']); exit; }
            if (!$isMeetingMember($meetingId, intval($userId))) {
                http_response_code(403);
                echo json_encode(['error' => 'No autorizado para esta reunión']);
                exit;
            }
            $stmt = $conn->prepare("
                SELECT mm.id, mm.meeting_id, mm.sender_user_id, mm.content, mm.created_at,
                       u.full_name, u.username, u.profile_photo
                FROM meeting_messages mm
                LEFT JOIN users u ON u.id = mm.sender_user_id
                WHERE mm.meeting_id = ?
                ORDER BY mm.id ASC
                LIMIT 300
            ");
            $stmt->bind_param("i", $meetingId);
            $stmt->execute();
            $messages = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            echo json_encode(['success' => true, 'messages' => $messages]);
            exit;
        }

    } elseif ($method === 'POST') {
        $data   = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'create';

        if ($action === 'create') {
            $title        = trim($data['title'] ?? '');
            $description  = trim($data['description'] ?? '');
            $scheduledAt  = $data['scheduled_at'] ?? null;
            if ($scheduledAt === '' || $scheduledAt === false) {
                $scheduledAt = null;
            }
            $status       = $scheduledAt ? 'scheduled' : 'active';

            if (!$title) { http_response_code(400); echo json_encode(['error' => 'title required']); exit; }

            $stmt = $conn->prepare("INSERT INTO meetings (title, description, scheduled_at, status, created_by, moderator_user_id) VALUES (?, ?, ?, ?, ?, ?)");
            $moderatorId = $userId;
            $stmt->bind_param("ssssii", $title, $description, $scheduledAt, $status, $userId, $moderatorId);
            $stmt->execute();
            $newId = $stmt->insert_id;

            // ----- Invitaciones de usuarios -----
            $invitedIds = array_filter(array_map('intval', $data['invited_user_ids'] ?? []), static fn($v) => $v > 0 && $v !== intval($userId));

            // Get creator name for emails
            $creatorNameStmt = $conn->prepare("SELECT full_name, username FROM users WHERE id = ? LIMIT 1");
            $creatorNameStmt->bind_param("i", $userId);
            $creatorNameStmt->execute();
            $creatorRow = $creatorNameStmt->get_result()->fetch_assoc();
            $creatorName = $creatorRow['full_name'] ?: $creatorRow['username'] ?: 'Un administrador';

            $evDate  = $scheduledAt ? substr($scheduledAt,0,10) : date('Y-m-d');
            $evTime  = $scheduledAt ? substr($scheduledAt,11,5) : null;
            $fmtDate = $scheduledAt
                ? (new DateTime($scheduledAt))->format('d/m/Y \a \l\a\s H:i')
                : 'Ahora (reunión en vivo)';

            if (!empty($invitedIds)) {
                // Collect invited user info for emails
                $placeholders = implode(',', array_fill(0, count($invitedIds), '?'));
                $types = str_repeat('i', count($invitedIds));
                $infoStmt = $conn->prepare("SELECT id, full_name, username, email FROM users WHERE id IN ($placeholders)");
                $infoStmt->bind_param($types, ...$invitedIds);
                $infoStmt->execute();
                $invitedUsers = $infoStmt->get_result()->fetch_all(MYSQLI_ASSOC);

                foreach ($invitedUsers as $invUser) {
                    $invUid = intval($invUser['id']);

                    // insert invite row (idempotente)
                    $invStmt = $conn->prepare("INSERT INTO workspace_meeting_invites (meeting_id,user_id) VALUES (?,?) ON DUPLICATE KEY UPDATE updated_at=NOW()");
                    $invStmt->bind_param("ii", $newId, $invUid);
                    $invStmt->execute();

                    // auto-calendar event (fixed: no calendar_id column)
                    $evTitle = $title;
                    $cat     = 'reunion';
                    $evStmt  = $conn->prepare("INSERT INTO calendar_events (title,event_date,start_time,category,created_by) VALUES (?,?,?,?,?)");
                    $evStmt->bind_param("ssssi", $evTitle, $evDate, $evTime, $cat, $userId);
                    $evStmt->execute();

                    // in-app notification
                    $notifTitle = "Invitación a reunión";
                    $notifMsg   = "{$creatorName} te invitó a la reunión \"{$title}\" — {$fmtDate}";
                    $notifType  = 'event_reminder';
                    $relType    = 'meeting';
                    $nStmt = $conn->prepare("INSERT INTO notifications (user_id, title, message, type, related_id, related_type) VALUES (?,?,?,?,?,?)");
                    $nStmt->bind_param("isssis", $invUid, $notifTitle, $notifMsg, $notifType, $newId, $relType);
                    $nStmt->execute();

                    // Send invitation email (non-blocking, best effort)
                    $userEmail = trim($invUser['email'] ?? '');
                    if ($userEmail !== '') {
                        $userName = $invUser['full_name'] ?: $invUser['username'] ?: 'Usuario';
                        $meetingUrl = "https://bonifaciossancarlos.com/admin/meetings/{$newId}";
                        $emailBody = "<!DOCTYPE html>
<html lang='es'>
<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
<body style='margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;'>
  <table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f5f5;padding:32px 0;'>
    <tr><td align='center'>
      <table width='560' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);'>
        <tr>
          <td style='background:linear-gradient(135deg,#1a2a4a 0%,#2c4a7a 100%);padding:32px 32px 24px;text-align:center;'>
            <p style='margin:0 0 8px 0;color:#D4AF37;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;'>Bonifacio's Restaurant</p>
            <h1 style='margin:0;color:#ffffff;font-size:22px;font-weight:700;'>Invitación a Reunión</h1>
          </td>
        </tr>
        <tr>
          <td style='padding:28px 32px;'>
            <p style='margin:0 0 16px;color:#333;font-size:15px;'>Hola <strong>" . htmlspecialchars($userName) . "</strong>,</p>
            <p style='margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;'><strong>" . htmlspecialchars($creatorName) . "</strong> te ha invitado a una reunión:</p>
            <table width='100%' cellpadding='0' cellspacing='0' style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;'>
              <tr><td style='padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:600;width:120px;'>Reunión</td><td style='padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#1e293b;font-size:14px;font-weight:600;'>" . htmlspecialchars($title) . "</td></tr>
              " . ($description ? "<tr><td style='padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:600;'>Descripción</td><td style='padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:13px;'>" . htmlspecialchars($description) . "</td></tr>" : "") . "
              <tr><td style='padding:12px 16px;color:#64748b;font-size:12px;font-weight:600;'>Fecha y hora</td><td style='padding:12px 16px;color:#1e293b;font-size:14px;'>{$fmtDate}</td></tr>
            </table>
            <div style='text-align:center;'>
              <a href='{$meetingUrl}' style='display:inline-block;background:linear-gradient(135deg,#0891b2,#06b6d4);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.5px;'>Ir a la reunión &rarr;</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style='background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #f0f0f0;'>
            <p style='margin:0;color:#aaa;font-size:12px;'>Bonifacio's Restaurant &middot; San Carlos, Sonora</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";
                        @sendMail($userEmail, "Invitación: {$title} — {$fmtDate}", $emailBody);
                    }
                }
            }

            // If starting now, auto-join creator
            if ($status === 'active') {
                $role = 'host';
                $jStmt = $conn->prepare("INSERT INTO meeting_participants (meeting_id, user_id, participant_role) VALUES (?, ?, ?)");
                $jStmt->bind_param("iis", $newId, $userId, $role);
                $jStmt->execute();
            }

            $targetUsers = $activeUserIds(intval($userId));
            if (!empty($targetUsers)) {
                $pushBody = $status === 'active'
                    ? "Se inició \"$title\". Entra ahora a la sala."
                    : "Se programó \"$title\" para seguimiento del equipo.";
                sendPushToUsers(
                    $conn,
                    $targetUsers,
                    'Nueva reunión',
                    $pushBody,
                    [
                        'kind' => 'meeting_created',
                        'meeting_id' => (string)$newId,
                        'click_action' => "/admin/meetings/$newId",
                    ],
                    intval($userId)
                );
            }

            echo json_encode(['success' => true, 'id' => $newId, 'status' => $status]);

        } elseif ($action === 'start') {
            $id = intval($data['id'] ?? 0);
            if (!$isMeetingModerator($id, intval($userId))) {
                http_response_code(403);
                echo json_encode(['error' => 'No autorizado para iniciar']);
                exit;
            }
            $stmt = $conn->prepare("UPDATE meetings SET status='active', started_at=NOW() WHERE id=?");
            $stmt->bind_param("i", $id);
            $stmt->execute();

            $title = $meetingTitleById($id);
            $targetUsers = $activeUserIds(intval($userId));
            if (!empty($targetUsers)) {
                sendPushToUsers(
                    $conn,
                    $targetUsers,
                    'Reunión en curso',
                    "\"$title\" ya está activa.",
                    [
                        'kind' => 'meeting_started',
                        'meeting_id' => (string)$id,
                        'click_action' => "/admin/meetings/$id",
                    ],
                    intval($userId)
                );
            }
            echo json_encode(['success' => true]);

        } elseif ($action === 'end') {
            $id = intval($data['id'] ?? 0);
            if (!$isMeetingModerator($id, intval($userId))) {
                http_response_code(403);
                echo json_encode(['error' => 'No autorizado para finalizar']);
                exit;
            }
            $stmt = $conn->prepare("UPDATE meetings SET status='ended', ended_at=NOW() WHERE id=?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            // Remove all participants
            $d = $conn->prepare("UPDATE meeting_participants SET left_at=NOW() WHERE meeting_id=? AND left_at IS NULL");
            $d->bind_param("i", $id);
            $d->execute();

            $title = $meetingTitleById($id);
            $targetUsers = $activeUserIds(intval($userId));
            if (!empty($targetUsers)) {
                sendPushToUsers(
                    $conn,
                    $targetUsers,
                    'Reunión finalizada',
                    "\"$title\" se cerró. Revisa la minuta cuando esté lista.",
                    [
                        'kind' => 'meeting_ended',
                        'meeting_id' => (string)$id,
                        'click_action' => "/admin/meetings/$id",
                    ],
                    intval($userId)
                );
            }
            echo json_encode(['success' => true]);

        } elseif ($action === 'join') {
            $id = intval($data['id'] ?? 0);
            // Si estaba programada, pasa a activa al unirse alguien
            $act = $conn->prepare("UPDATE meetings SET status='active', started_at=COALESCE(started_at, NOW()) WHERE id=? AND status='scheduled'");
            $act->bind_param("i", $id);
            $act->execute();
            // Upsert participant
            $check = $conn->prepare("SELECT id FROM meeting_participants WHERE meeting_id=? AND user_id=? AND left_at IS NULL");
            $check->bind_param("ii", $id, $userId);
            $check->execute();
            if ($check->get_result()->num_rows === 0) {
                $role = 'participant';
                $j = $conn->prepare("INSERT INTO meeting_participants (meeting_id, user_id, participant_role) VALUES (?, ?, ?)");
                $j->bind_param("iis", $id, $userId, $role);
                $j->execute();
            }

            $title = $meetingTitleById($id);
            $targetUsers = $meetingParticipantUserIds($id, intval($userId));
            if (!empty($targetUsers)) {
                sendPushToUsers(
                    $conn,
                    $targetUsers,
                    'Nuevo participante',
                    "Alguien se unió a \"$title\".",
                    [
                        'kind' => 'meeting_join',
                        'meeting_id' => (string)$id,
                        'click_action' => "/admin/meetings/$id",
                    ],
                    intval($userId)
                );
            }
            echo json_encode(['success' => true]);

        } elseif ($action === 'leave') {
            $id = intval($data['id'] ?? 0);
            $l = $conn->prepare("UPDATE meeting_participants SET left_at=NOW() WHERE meeting_id=? AND user_id=? AND left_at IS NULL");
            $l->bind_param("ii", $id, $userId);
            $l->execute();
            echo json_encode(['success' => true]);

        } elseif ($action === 'delete') {
            $id = intval($data['id'] ?? 0);
            if (!$isMeetingModerator($id, intval($userId))) {
                http_response_code(403);
                echo json_encode(['error' => 'No autorizado para eliminar']);
                exit;
            }
            $del = $conn->prepare("DELETE FROM meetings WHERE id=?");
            $del->bind_param("i", $id);
            $del->execute();
            echo json_encode(['success' => true]);
        } elseif ($action === 'send_message') {
            $meetingId = intval($data['meeting_id'] ?? 0);
            $content = trim((string)($data['content'] ?? ''));
            if ($meetingId <= 0 || $content === '') {
                http_response_code(400);
                echo json_encode(['error' => 'meeting_id y content requeridos']);
                exit;
            }
            if (!$isMeetingMember($meetingId, intval($userId))) {
                http_response_code(403);
                echo json_encode(['error' => 'No autorizado para esta reunión']);
                exit;
            }
            $stmt = $conn->prepare("INSERT INTO meeting_messages (meeting_id, sender_user_id, content) VALUES (?, ?, ?)");
            $stmt->bind_param("iis", $meetingId, $userId, $content);
            $stmt->execute();

            $title = $meetingTitleById($meetingId);
            $targetUsers = $meetingParticipantUserIds($meetingId, intval($userId));
            if (!empty($targetUsers)) {
                $preview = substr($content, 0, 90);
                sendPushToUsers(
                    $conn,
                    $targetUsers,
                    "Nuevo mensaje · $title",
                    $preview,
                    [
                        'kind' => 'meeting_message',
                        'meeting_id' => (string)$meetingId,
                        'click_action' => "/admin/meetings/$meetingId",
                    ],
                    intval($userId)
                );
            }
            echo json_encode(['success' => true, 'message_id' => intval($stmt->insert_id)]);
        } elseif ($action === 'set_participant_role') {
            $meetingId = intval($data['meeting_id'] ?? 0);
            $targetUserId = intval($data['user_id'] ?? 0);
            $participantRole = trim((string)($data['participant_role'] ?? 'participant'));
            if (!in_array($participantRole, ['moderator', 'participant'], true) || $meetingId <= 0 || $targetUserId <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Parámetros inválidos']);
                exit;
            }
            if (!$isMeetingModerator($meetingId, intval($userId))) {
                http_response_code(403);
                echo json_encode(['error' => 'No autorizado']);
                exit;
            }
            $stmt = $conn->prepare("UPDATE meeting_participants SET participant_role = ? WHERE meeting_id = ? AND user_id = ? AND left_at IS NULL");
            $stmt->bind_param("sii", $participantRole, $meetingId, $targetUserId);
            $stmt->execute();
            echo json_encode(['success' => true]);
        } elseif ($action === 'remove_participant') {
            $meetingId = intval($data['meeting_id'] ?? 0);
            $targetUserId = intval($data['user_id'] ?? 0);
            if ($meetingId <= 0 || $targetUserId <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Parámetros inválidos']);
                exit;
            }
            if (!$isMeetingModerator($meetingId, intval($userId))) {
                http_response_code(403);
                echo json_encode(['error' => 'No autorizado']);
                exit;
            }
            if ($targetUserId === intval($userId)) {
                http_response_code(400);
                echo json_encode(['error' => 'No puedes removerte a ti mismo']);
                exit;
            }
            $stmt = $conn->prepare("UPDATE meeting_participants SET left_at = NOW() WHERE meeting_id = ? AND user_id = ? AND left_at IS NULL");
            $stmt->bind_param("ii", $meetingId, $targetUserId);
            $stmt->execute();
            echo json_encode(['success' => true]);

        } elseif ($action === 'update_attendees') {
            // Admin/moderator only: set which users are invited (controls visibility)
            $meetingId = intval($data['meeting_id'] ?? 0);
            $attendeeIds = array_filter(array_map('intval', $data['attendee_ids'] ?? []), static fn($v) => $v > 0);
            if ($meetingId <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'meeting_id requerido']);
                exit;
            }
            // Only admin or moderator can update attendees
            $userRole = '';
            $roleStmt = $conn->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
            $roleStmt->bind_param("i", $userId);
            $roleStmt->execute();
            $roleRow = $roleStmt->get_result()->fetch_assoc();
            $userRole = $roleRow['role'] ?? '';
            if ($userRole !== 'administrador' && !$isMeetingModerator($meetingId, intval($userId))) {
                http_response_code(403);
                echo json_encode(['error' => 'Solo administradores pueden modificar asistentes']);
                exit;
            }
            // Get creator so we never remove them
            $creatorStmt = $conn->prepare("SELECT created_by FROM meetings WHERE id = ? LIMIT 1");
            $creatorStmt->bind_param("i", $meetingId);
            $creatorStmt->execute();
            $creatorRow = $creatorStmt->get_result()->fetch_assoc();
            $creatorId = intval($creatorRow['created_by'] ?? 0);

            // Remove all invites except creator
            $delStmt = $conn->prepare("DELETE FROM workspace_meeting_invites WHERE meeting_id = ? AND user_id <> ?");
            $delStmt->bind_param("ii", $meetingId, $creatorId);
            $delStmt->execute();

            // Insert new invites
            foreach ($attendeeIds as $aId) {
                if ($aId === $creatorId) continue; // creator always has access
                $insStmt = $conn->prepare("INSERT INTO workspace_meeting_invites (meeting_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE status='invited', updated_at=NOW()");
                $insStmt->bind_param("ii", $meetingId, $aId);
                $insStmt->execute();
            }

            // Return current attendee list
            $listStmt = $conn->prepare("SELECT user_id FROM workspace_meeting_invites WHERE meeting_id = ?");
            $listStmt->bind_param("i", $meetingId);
            $listStmt->execute();
            $invRows = $listStmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $currentIds = array_map(static fn($r) => intval($r['user_id']), $invRows);
            // Always include creator
            if (!in_array($creatorId, $currentIds)) $currentIds[] = $creatorId;
            echo json_encode(['success' => true, 'attendee_ids' => array_values($currentIds)]);
        }
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'trace' => basename($e->getFile()) . ':' . $e->getLine()]);
}
$conn->close();
?>
