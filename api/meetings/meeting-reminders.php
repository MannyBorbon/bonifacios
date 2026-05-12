<?php
/**
 * Meeting Reminders Cron Job
 * ---------------------------
 * Run via cron every 15 minutes:
 *   php /path/to/api/meetings/meeting-reminders.php
 *
 * Or via HTTP (with secret):
 *   GET /api/meetings/meeting-reminders.php?secret=bfc_remind_2025
 *
 * Sends two types of reminders:
 *   1) Same-day morning reminder (sent once at ~8:00 AM on the meeting day)
 *   2) 1-hour-before reminder
 *
 * Also creates in-app notification records in the `notifications` table.
 */

define('REMINDER_SECRET', 'bfc_remind_2025');

$isCli = (php_sapi_name() === 'cli');
if (!$isCli) {
    $secret = $_GET['secret'] ?? '';
    if ($secret !== REMINDER_SECRET) {
        http_response_code(403);
        die('Access denied');
    }
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/smtp.php';

date_default_timezone_set('America/Hermosillo');

$conn = getConnection();

// Ensure tracking table for sent reminders (idempotent)
$conn->query("CREATE TABLE IF NOT EXISTS meeting_reminders_sent (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    user_id INT NOT NULL,
    reminder_type ENUM('same_day','one_hour') NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_reminder (meeting_id, user_id, reminder_type),
    KEY meeting_id (meeting_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

$now = new DateTime('now');
$today = $now->format('Y-m-d');
$currentHour = (int)$now->format('H');
$currentMinute = (int)$now->format('i');

$log = function(string $msg) {
    echo date('[H:i:s] ') . $msg . "\n";
};

$log("Meeting reminders started — {$now->format('Y-m-d H:i:s')}");

// ========================================================
// 1) SAME-DAY REMINDER (morning, between 7:45–8:15 window)
// ========================================================
if ($currentHour === 8 && $currentMinute < 15 || $currentHour === 7 && $currentMinute >= 45) {
    $log("Checking same-day reminders...");

    $stmt = $conn->prepare("
        SELECT m.id, m.title, m.description, m.scheduled_at,
               wi.user_id,
               u.full_name, u.username, u.email
        FROM meetings m
        JOIN workspace_meeting_invites wi ON wi.meeting_id = m.id AND wi.status <> 'declined'
        JOIN users u ON u.id = wi.user_id AND u.is_active = 1
        LEFT JOIN meeting_reminders_sent mrs
            ON mrs.meeting_id = m.id AND mrs.user_id = wi.user_id AND mrs.reminder_type = 'same_day'
        WHERE m.status IN ('scheduled','active')
          AND DATE(m.scheduled_at) = ?
          AND mrs.id IS NULL
    ");
    $stmt->bind_param("s", $today);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    $log("Found " . count($rows) . " same-day reminders to send");

    foreach ($rows as $row) {
        $meetingId = intval($row['id']);
        $uid       = intval($row['user_id']);
        $userName  = $row['full_name'] ?: $row['username'] ?: 'Usuario';
        $userEmail = trim($row['email'] ?? '');
        $title     = $row['title'];
        $schedTime = (new DateTime($row['scheduled_at']))->format('H:i');
        $fmtDate   = (new DateTime($row['scheduled_at']))->format('d/m/Y \a \l\a\s H:i');

        // In-app notification
        $notifTitle = "Reunión hoy";
        $notifMsg   = "Tienes la reunión \"{$title}\" programada hoy a las {$schedTime}";
        $notifType  = 'event_reminder';
        $relType    = 'meeting';
        $nStmt = $conn->prepare("INSERT INTO notifications (user_id, title, message, type, related_id, related_type) VALUES (?,?,?,?,?,?)");
        $nStmt->bind_param("isssis", $uid, $notifTitle, $notifMsg, $notifType, $meetingId, $relType);
        $nStmt->execute();

        // Email
        if ($userEmail !== '') {
            $meetingUrl = "https://bonifaciossancarlos.com/admin/meetings/{$meetingId}";
            $emailBody = buildReminderEmail($userName, $title, $row['description'] ?? '', $fmtDate, $meetingUrl, 'Recordatorio: Reunión Hoy');
            @sendMail($userEmail, "Recordatorio: {$title} — Hoy a las {$schedTime}", $emailBody);
        }

        // Mark as sent
        $markStmt = $conn->prepare("INSERT IGNORE INTO meeting_reminders_sent (meeting_id, user_id, reminder_type) VALUES (?,?,'same_day')");
        $markStmt->bind_param("ii", $meetingId, $uid);
        $markStmt->execute();

        $log("  same_day: meeting={$meetingId} user={$uid} ({$userName})");
    }
}

// ========================================================
// 2) ONE-HOUR-BEFORE REMINDER
// ========================================================
$oneHourLater = (clone $now)->modify('+1 hour');
$windowStart  = (clone $now)->modify('+45 minutes')->format('Y-m-d H:i:s');
$windowEnd    = (clone $now)->modify('+75 minutes')->format('Y-m-d H:i:s');

$log("Checking 1-hour reminders (window: {$windowStart} to {$windowEnd})...");

$stmt2 = $conn->prepare("
    SELECT m.id, m.title, m.description, m.scheduled_at,
           wi.user_id,
           u.full_name, u.username, u.email
    FROM meetings m
    JOIN workspace_meeting_invites wi ON wi.meeting_id = m.id AND wi.status <> 'declined'
    JOIN users u ON u.id = wi.user_id AND u.is_active = 1
    LEFT JOIN meeting_reminders_sent mrs
        ON mrs.meeting_id = m.id AND mrs.user_id = wi.user_id AND mrs.reminder_type = 'one_hour'
    WHERE m.status IN ('scheduled','active')
      AND m.scheduled_at BETWEEN ? AND ?
      AND mrs.id IS NULL
");
$stmt2->bind_param("ss", $windowStart, $windowEnd);
$stmt2->execute();
$rows2 = $stmt2->get_result()->fetch_all(MYSQLI_ASSOC);

$log("Found " . count($rows2) . " one-hour reminders to send");

foreach ($rows2 as $row) {
    $meetingId = intval($row['id']);
    $uid       = intval($row['user_id']);
    $userName  = $row['full_name'] ?: $row['username'] ?: 'Usuario';
    $userEmail = trim($row['email'] ?? '');
    $title     = $row['title'];
    $schedTime = (new DateTime($row['scheduled_at']))->format('H:i');
    $fmtDate   = (new DateTime($row['scheduled_at']))->format('d/m/Y \a \l\a\s H:i');

    // In-app notification
    $notifTitle = "Reunión en 1 hora";
    $notifMsg   = "La reunión \"{$title}\" comienza en aproximadamente 1 hora ({$schedTime})";
    $notifType  = 'event_reminder';
    $relType    = 'meeting';
    $nStmt = $conn->prepare("INSERT INTO notifications (user_id, title, message, type, related_id, related_type) VALUES (?,?,?,?,?,?)");
    $nStmt->bind_param("isssis", $uid, $notifTitle, $notifMsg, $notifType, $meetingId, $relType);
    $nStmt->execute();

    // Email
    if ($userEmail !== '') {
        $meetingUrl = "https://bonifaciossancarlos.com/admin/meetings/{$meetingId}";
        $emailBody = buildReminderEmail($userName, $title, $row['description'] ?? '', $fmtDate, $meetingUrl, 'Comienza en 1 Hora');
        @sendMail($userEmail, "En 1 hora: {$title} — {$schedTime}", $emailBody);
    }

    // Mark as sent
    $markStmt = $conn->prepare("INSERT IGNORE INTO meeting_reminders_sent (meeting_id, user_id, reminder_type) VALUES (?,?,'one_hour')");
    $markStmt->bind_param("ii", $meetingId, $uid);
    $markStmt->execute();

    $log("  one_hour: meeting={$meetingId} user={$uid} ({$userName})");
}

$conn->close();
$log("Done.");

// ========================================================
// Helper: build reminder email HTML
// ========================================================
function buildReminderEmail(string $userName, string $title, string $description, string $fmtDate, string $meetingUrl, string $headline): string {
    $descRow = $description
        ? "<tr><td style='padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:600;'>Descripción</td><td style='padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:13px;'>" . htmlspecialchars($description) . "</td></tr>"
        : "";
    return "<!DOCTYPE html>
<html lang='es'>
<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
<body style='margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;'>
  <table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f5f5;padding:32px 0;'>
    <tr><td align='center'>
      <table width='560' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);'>
        <tr>
          <td style='background:linear-gradient(135deg,#1a2a4a 0%,#2c4a7a 100%);padding:32px 32px 24px;text-align:center;'>
            <p style='margin:0 0 8px 0;color:#D4AF37;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;'>Bonifacio's Restaurant</p>
            <h1 style='margin:0;color:#ffffff;font-size:22px;font-weight:700;'>" . htmlspecialchars($headline) . "</h1>
          </td>
        </tr>
        <tr>
          <td style='padding:28px 32px;'>
            <p style='margin:0 0 16px;color:#333;font-size:15px;'>Hola <strong>" . htmlspecialchars($userName) . "</strong>,</p>
            <p style='margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;'>Este es un recordatorio de tu próxima reunión:</p>
            <table width='100%' cellpadding='0' cellspacing='0' style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;'>
              <tr><td style='padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:600;width:120px;'>Reunión</td><td style='padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#1e293b;font-size:14px;font-weight:600;'>" . htmlspecialchars($title) . "</td></tr>
              {$descRow}
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
}
?>
