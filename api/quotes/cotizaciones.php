<?php
require_once '../config/database.php';
require_once '../config/smtp.php';
date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $userId = requireAuth();
    $conn   = getConnection();

    if ($method === 'GET') {
        $quoteId = intval($_GET['quote_id'] ?? 0);
        if (!$quoteId) { http_response_code(400); echo json_encode(['error' => 'quote_id required']); exit; }

        $stmt = $conn->prepare("
            SELECT qc.*, u.full_name as created_by_name
            FROM quote_cotizaciones qc
            LEFT JOIN users u ON qc.created_by = u.id
            WHERE qc.quote_id = ?
            ORDER BY qc.created_at DESC
        ");
        $stmt->bind_param("i", $quoteId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

        // Decode JSON data for each row
        foreach ($rows as &$row) {
            $row['data'] = json_decode($row['data'] ?? '{}', true);
        }

        echo json_encode(['success' => true, 'cotizaciones' => $rows]);

    } elseif ($method === 'POST') {
        $input  = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? 'save';

        if ($action === 'save') {
            $quoteId = intval($input['quote_id'] ?? 0);
            $data    = $input['data'] ?? [];
            $cotId   = intval($input['id'] ?? 0); // if updating existing

            if (!$quoteId) { http_response_code(400); echo json_encode(['error' => 'quote_id required']); exit; }

            // Get next version number for this quote
            $vStmt = $conn->prepare("SELECT COALESCE(MAX(version_number), 0) + 1 AS next_v FROM quote_cotizaciones WHERE quote_id = ?");
            $vStmt->bind_param("i", $quoteId);
            $vStmt->execute();
            $nextV = $vStmt->get_result()->fetch_assoc()['next_v'];

            $dataJson = json_encode($data);

            if ($cotId) {
                // Update existing cotización
                $stmt = $conn->prepare("UPDATE quote_cotizaciones SET data=?, updated_at=NOW() WHERE id=? AND quote_id=?");
                $stmt->bind_param("sii", $dataJson, $cotId, $quoteId);
                $stmt->execute();
                echo json_encode(['success' => true, 'id' => $cotId]);
            } else {
                // Create new version
                $stmt = $conn->prepare("INSERT INTO quote_cotizaciones (quote_id, version_number, data, created_by) VALUES (?, ?, ?, ?)");
                $stmt->bind_param("iisi", $quoteId, $nextV, $dataJson, $userId);
                $stmt->execute();
                $newId = $stmt->insert_id;

                // Update quote status to 'quoted'
                $conn->prepare("UPDATE event_quotes SET status='quoted' WHERE id=?")->bind_param("i", $quoteId);
                $upd = $conn->prepare("UPDATE event_quotes SET status='quoted' WHERE id=?");
                $upd->bind_param("i", $quoteId);
                $upd->execute();

                echo json_encode(['success' => true, 'id' => $newId, 'version_number' => $nextV]);
            }

        } elseif ($action === 'mark_final') {
            $cotId   = intval($input['id'] ?? 0);
            $quoteId = intval($input['quote_id'] ?? 0);

            // Unmark all for this quote
            $conn->prepare("UPDATE quote_cotizaciones SET is_final=0 WHERE quote_id=?")->bind_param("i", $quoteId);
            $clr = $conn->prepare("UPDATE quote_cotizaciones SET is_final=0 WHERE quote_id=?");
            $clr->bind_param("i", $quoteId);
            $clr->execute();

            // Mark this one
            $stmt = $conn->prepare("UPDATE quote_cotizaciones SET is_final=1 WHERE id=?");
            $stmt->bind_param("i", $cotId);
            $stmt->execute();

            echo json_encode(['success' => true]);

        } elseif ($action === 'send_email') {
            $cotId = intval($input['id'] ?? 0);
            $to    = trim($input['to'] ?? '');

            if (!$cotId || !$to) { http_response_code(400); echo json_encode(['error' => 'id and to required']); exit; }

            // Fetch cotización + quote data
            $stmt = $conn->prepare("
                SELECT qc.*, eq.name, eq.email, eq.event_type, eq.event_date, eq.guests, eq.location,
                       u.full_name as sender_name
                FROM quote_cotizaciones qc
                JOIN event_quotes eq ON qc.quote_id = eq.id
                LEFT JOIN users u ON qc.created_by = u.id
                WHERE qc.id = ?
            ");
            $stmt->bind_param("i", $cotId);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            if (!$row) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }

            $d = json_decode($row['data'] ?? '{}', true);
            $eventDate = $row['event_date'] ? date('d/m/Y', strtotime($row['event_date'])) : '';
            $today = date('d \d\e F \d\e Y');
            $v = 'v' . $row['version_number'];

            $body = "
<!DOCTYPE html>
<html>
<head><meta charset='UTF-8'>
<style>
  body { font-family: Arial, sans-serif; color: #222; max-width: 700px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 28px; font-weight: bold; letter-spacing: 2px; border-bottom: 2px solid #000; padding-bottom: 4px; }
  table.info td { padding: 2px 12px 2px 0; font-size: 14px; }
  table.info td:first-child { color: #666; min-width: 130px; }
  .section { margin-top: 20px; }
  .section h3 { font-size: 14px; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #ccc; }
  .section p { font-size: 13px; margin: 3px 0; white-space: pre-wrap; }
  table.totales { width: 100%; border-collapse: collapse; margin-top: 14px; }
  table.totales td { padding: 5px 8px; font-size: 13px; }
  table.totales tr.sep td { border-top: 1px solid #ccc; }
  table.totales tr.total-row td { font-weight: bold; font-size: 14px; }
  .right { text-align: right; }
  .header-date { float: right; font-size: 13px; color: #666; }
</style>
</head>
<body>
  <div style='overflow:hidden'>
    <h1 style='float:left'>B o n i f a c i o ' s</h1>
    <span class='header-date'>$today</span>
  </div>
  <div style='clear:both; margin-top:16px;'>
  <table class='info'>
    <tr><td>Evento</td><td>= {$row['name']}</td></tr>
    <tr><td>Tel Contacto</td><td>= " . ($d['tel_contacto'] ?? $row['phone'] ?? '') . "</td></tr>
    <tr><td>Fecha</td><td>= $eventDate</td></tr>
    <tr><td>Celebración</td><td>= " . ($d['celebracion'] ?? $row['event_type'] ?? '') . "</td></tr>
    <tr><td>Lugar</td><td>= Bonifacio's Restaurant</td></tr>
    <tr><td>Área</td><td>= " . ($d['area'] ?? $row['location'] ?? '') . "</td></tr>
    <tr><td>Ceremonia</td><td>= " . ($d['hora_ceremonia'] ?? '') . "</td></tr>
    <tr><td>Evento</td><td>= " . ($d['hora_evento'] ?? '') . "</td></tr>
    <tr><td>Horario Cena</td><td>= " . ($d['hora_cena'] ?? '') . "</td></tr>
    <tr><td>Invitados</td><td>= " . ($d['invitados'] ?? $row['guests'] ?? '') . "</td></tr>
    <tr><td>Música</td><td>= " . ($d['musica'] ?? '') . "</td></tr>
  </table>
  </div>
" . ($d['bebidas'] ? "<div class='section'><h3>Bebidas</h3><p>" . htmlspecialchars($d['bebidas']) . "</p></div>" : '') . "
" . ($d['alimentos'] ? "<div class='section'><h3>Alimentos</h3><p>" . htmlspecialchars($d['alimentos']) . "</p></div>" : '') . "
" . ($d['nota_alimentos'] ? "<p><strong>Nota — " . htmlspecialchars($d['nota_alimentos']) . "</strong></p>" : '') . "
  <table class='totales'>
    <tr class='sep'><td>Subtotal costo</td><td class='right'>\$ " . number_format(floatval($d['subtotal'] ?? 0), 2) . "</td></tr>
    <tr><td>(+) Servicio</td><td class='right'>\$ " . number_format(floatval($d['servicio'] ?? 0), 2) . "</td></tr>
    <tr class='sep total-row'><td>Total Costo (por persona)</td><td class='right'>\$ " . number_format(floatval($d['total_persona'] ?? 0), 2) . "</td></tr>
    <tr><td>(x) " . ($d['invitados'] ?? $row['guests'] ?? 0) . " invitados</td><td class='right'>\$ " . number_format(floatval($d['total_general'] ?? 0), 2) . "</td></tr>
" . (!empty($d['extras']) ? "<tr class='sep'><td colspan='2'><strong>Extras</strong></td></tr>" . implode('', array_map(fn($e) => "<tr><td>(+) " . htmlspecialchars($e['concepto'] ?? '') . "</td><td class='right'>\$ " . number_format(floatval($e['monto'] ?? 0), 2) . "</td></tr>", $d['extras'] ?? [])) : '') . "
    <tr class='sep total-row'><td>Total con Extras</td><td class='right'>\$ " . number_format(floatval($d['total_con_extras'] ?? 0), 2) . "</td></tr>
" . (!empty($d['anticipos']) ? "<tr class='sep'><td colspan='2'>(-) anticipos</td></tr>" . implode('', array_map(fn($a) => "<tr><td>&nbsp;&nbsp;" . htmlspecialchars($a['fecha'] ?? '') . "</td><td class='right'>\$ " . number_format(floatval($a['monto'] ?? 0), 2) . "</td></tr>", $d['anticipos'] ?? [])) : '') . "
    <tr class='sep total-row'><td>Saldo Pendiente</td><td class='right'>\$ " . number_format(floatval($d['saldo'] ?? 0), 2) . "</td></tr>
  </table>
  " . ($d['condiciones'] ? "<div class='section'><h3>Condiciones</h3><p>" . htmlspecialchars($d['condiciones']) . "</p></div>" : '') . "
  <p style='margin-top:24px; font-size:12px; color:#888;'>Cotización $v · Bonifacio's Restaurant, San Carlos, Sonora</p>
</body></html>";

            $subject = "Cotización de Evento — {$row['name']} — Bonifacio's Restaurant";
            $result = sendMail($to, $subject, $body);

            if ($result) {
                // Mark as sent
                $conn->prepare("UPDATE quote_cotizaciones SET sent_at=NOW(), sent_to=? WHERE id=?")->bind_param("si", $to, $cotId);
                $upd = $conn->prepare("UPDATE quote_cotizaciones SET sent_at=NOW(), sent_to=? WHERE id=?");
                $upd->bind_param("si", $to, $cotId);
                $upd->execute();
                echo json_encode(['success' => true, 'message' => "Cotización enviada a $to"]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Error al enviar el correo']);
            }

        } elseif ($action === 'delete') {
            $cotId = intval($input['id'] ?? 0);
            $stmt = $conn->prepare("DELETE FROM quote_cotizaciones WHERE id=?");
            $stmt->bind_param("i", $cotId);
            $stmt->execute();
            echo json_encode(['success' => true]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
$conn->close();
?>
