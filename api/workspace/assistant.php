<?php
require_once '../config/database.php';
require_once '../config/gemini.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

function getShiftBounds(): array {
    $now = new DateTime('now');
    if ((int)$now->format('H') < 8) $now->modify('-1 day');
    $day = $now->format('Y-m-d');
    return [$day . ' 08:00:00', date('Y-m-d 07:59:59', strtotime($day . ' +1 day'))];
}

function fetchRestaurantContext(PDO $pdo): string {
    [$shiftStart, $shiftEnd] = getShiftBounds();
    $today = date('Y-m-d');
    $lines = [];

    // Ventas del turno
    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS tickets,
               SUM(status='closed') AS cerrados,
               SUM(status='open')   AS abiertos,
               COALESCE(SUM(CASE WHEN status='closed' THEN total ELSE 0 END), 0) AS total_cobrado
        FROM sr_sales
        WHERE sale_datetime BETWEEN ? AND ?
          AND NOT (total = 0 AND COALESCE(subtotal, 0) > 0)
    ");
    $stmt->execute([$shiftStart, $shiftEnd]);
    $v = $stmt->fetch(PDO::FETCH_ASSOC);
    $lines[] = "VENTAS TURNO ({$shiftStart} — {$shiftEnd}): "
             . "{$v['tickets']} tickets ({$v['cerrados']} cerrados, {$v['abiertos']} abiertos). "
             . "Total cobrado: $" . number_format((float)$v['total_cobrado'], 2) . " MXN.";

    // Top 5 productos del turno
    $stmt = $pdo->prepare("
        SELECT i.product_name,
               SUM(i.quantity) AS qty,
               ROUND(SUM(i.quantity * i.unit_price), 2) AS subtotal
        FROM sr_sale_items i
        JOIN sr_sales s ON s.id = i.sale_id
        WHERE s.sale_datetime BETWEEN ? AND ? AND s.status = 'closed'
        GROUP BY i.product_name
        ORDER BY qty DESC
        LIMIT 5
    ");
    $stmt->execute([$shiftStart, $shiftEnd]);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if ($products) {
        $pList = array_map(fn($p) => "{$p['product_name']} ({$p['qty']} pzas, \${$p['subtotal']})", $products);
        $lines[] = "TOP PRODUCTOS TURNO: " . implode(', ', $pList) . ".";
    }

    // Meseros del turno
    $stmt = $pdo->prepare("
        SELECT waiter_name,
               COUNT(*)          AS tickets,
               ROUND(SUM(total), 2) AS total,
               ROUND(SUM(COALESCE(tip, 0)), 2) AS propinas
        FROM sr_sales
        WHERE sale_datetime BETWEEN ? AND ?
          AND status = 'closed'
          AND waiter_name IS NOT NULL AND waiter_name <> ''
        GROUP BY waiter_name
        ORDER BY total DESC
        LIMIT 10
    ");
    $stmt->execute([$shiftStart, $shiftEnd]);
    $waiters = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if ($waiters) {
        $wList = array_map(
            fn($w) => "{$w['waiter_name']}: {$w['tickets']} tickets, \${$w['total']}, propinas \${$w['propinas']}",
            $waiters
        );
        $lines[] = "MESEROS TURNO: " . implode('; ', $wList) . ".";
    }

    // Reservaciones de hoy
    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS total,
               SUM(status='confirmed') AS confirmadas,
               SUM(status='pending')   AS pendientes
        FROM special_reservations
        WHERE reservation_date = ? AND status NOT IN ('cancelled')
    ");
    $stmt->execute([$today]);
    $r = $stmt->fetch(PDO::FETCH_ASSOC);
    $lines[] = "RESERVACIONES HOY ({$today}): {$r['total']} total "
             . "({$r['confirmadas']} confirmadas, {$r['pendientes']} pendientes).";

    // Personal ausente hoy
    $stmt = $pdo->prepare("
        SELECT employee_name FROM sr_attendance
        WHERE attendance_date = ? AND status = 'absent'
        ORDER BY employee_name
    ");
    $stmt->execute([$today]);
    $absent = array_unique(array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'employee_name'));
    $lines[] = $absent
        ? "AUSENTES HOY: " . implode(', ', array_values($absent)) . "."
        : "AUSENTES HOY: ninguno registrado.";

    // Personal en vacaciones
    $stmt = $pdo->query("
        SELECT name FROM employee_files
        WHERE LOWER(TRIM(COALESCE(status, ''))) = 'vacations'
        ORDER BY name
    ");
    $vacations = $stmt ? array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'name') : [];
    $lines[] = $vacations
        ? "EN VACACIONES: " . implode(', ', $vacations) . "."
        : "EN VACACIONES: ninguno actualmente.";

    return implode("\n", $lines);
}

function callGemini(string $systemPrompt, string $userMessage): string {
    $body = json_encode([
        'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
        'contents'           => [['role' => 'user', 'parts' => [['text' => $userMessage]]]],
        'generationConfig'   => ['temperature' => 0.3, 'maxOutputTokens' => 512],
    ]);

    $ch = curl_init(GEMINI_API_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_TIMEOUT        => GEMINI_TIMEOUT,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err || !$raw) throw new RuntimeException("Error de conexión con Gemini: $err");

    $data = json_decode($raw, true);
    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
    if ($text === null) {
        $reason = $data['candidates'][0]['finishReason'] ?? ($data['error']['message'] ?? 'respuesta vacía');
        throw new RuntimeException("Gemini no devolvió texto ({$reason})");
    }
    return trim($text);
}

try {
    requireAuth();
    $pdo = getPDO();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        exit;
    }

    $payload  = json_decode(file_get_contents('php://input'), true) ?? [];
    $action   = trim((string)($payload['action']   ?? 'ask'));
    $question = trim((string)($payload['question'] ?? ''));

    if ($action !== 'ask') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Acción no válida']);
        exit;
    }
    if ($question === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Pregunta requerida']);
        exit;
    }

    $context = fetchRestaurantContext($pdo);

    $systemPrompt = <<<PROMPT
Eres el asistente operativo de Bonifacio's Restaurant en Hermosillo, Sonora, México.
Respondes en español de forma concisa y profesional usando exclusivamente los datos operativos en tiempo real que se te proporcionan.
Tu especialidad: ventas del turno, tickets, meseros, productos, reservaciones, asistencia del personal y vacaciones.
Reglas:
- No inventes datos ni uses conocimiento externo sobre el restaurante.
- Si la pregunta no tiene relación con la operación del restaurante, declínala amablemente en una sola oración.
- Usa pesos mexicanos (MXN) al mencionar cantidades monetarias.
- Respuestas máximo 3-4 oraciones salvo que se pida un listado.
PROMPT;

    $userMessage = "DATOS OPERATIVOS ACTUALES DEL RESTAURANTE:\n{$context}\n\nPREGUNTA DEL USUARIO: {$question}";

    $answer = callGemini($systemPrompt, $userMessage);

    echo json_encode([
        'success'  => true,
        'question' => $question,
        'answer'   => $answer,
        'meta'     => ['intent' => 'gemini', 'model' => GEMINI_MODEL],
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
