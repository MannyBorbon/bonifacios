<?php
/**
 * ============================================================
 *  BONIFACIOS - Script de Sincronización SoftRestaurant 8.0
 * ============================================================
 *  Corre este script en la computadora donde está SoftRestaurant.
 *  Puedes programarlo con el Programador de Tareas de Windows
 *  para que corra cada 15-30 minutos.
 *
 *  REQUISITOS:
 *   - PHP 7.4+ instalado en Windows
 *   - Extensión php_sqlsrv (Microsoft SQL Server Driver for PHP)
 *     ó php_pdo_odbc para conectar al SQL Server de SoftRestaurant
 *   - Acceso a la red/PC donde está SoftRestaurant DB
 * ============================================================
 */

// ── CONFIGURACIÓN ──────────────────────────────────────────
define('API_URL',     'https://bonifaciossancarlos.com/api/sales/sync.php');
define('API_KEY',     'bonifacios-sr-sync-2024-secret-key'); // igual que en sales_api_keys

// Conexión a SQL Server de SoftRestaurant 8.0
define('SR_SERVER',   'localhost');          // IP/nombre del servidor SQL Server
define('SR_DATABASE', 'SoftRestaurant');     // Nombre de la base de datos
define('SR_USER',     'sa');                 // Usuario SQL Server
define('SR_PASS',     'tu_password_aqui');   // Contraseña SQL Server

// Cuántos días atrás sincronizar (normalmente 1 = hoy + ayer)
define('SYNC_DAYS',   2);
// ────────────────────────────────────────────────────────────

$syncDate = date('Y-m-d');
echo "[" . date('Y-m-d H:i:s') . "] Iniciando sincronización SoftRestaurant → Bonifacios API\n";

// ── Conectar a SoftRestaurant DB ────────────────────────────
try {
    // Opción A: usando sqlsrv (recomendado)
    // $conn = sqlsrv_connect(SR_SERVER, [
    //     'Database' => SR_DATABASE,
    //     'UID'      => SR_USER,
    //     'PWD'      => SR_PASS,
    // ]);
    // if (!$conn) { throw new Exception("No se pudo conectar: " . print_r(sqlsrv_errors(), true)); }

    // Opción B: usando PDO + ODBC (alternativa)
    $dsn  = "sqlsrv:Server=" . SR_SERVER . ";Database=" . SR_DATABASE;
    $conn = new PDO($dsn, SR_USER, SR_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    echo "[OK] Conectado a SoftRestaurant DB\n";
} catch (Exception $e) {
    echo "[ERROR] Conexión: " . $e->getMessage() . "\n";
    exit(1);
}

// ── Query: obtener cuentas cerradas de los últimos SYNC_DAYS días ──────────
//  Estructura típica de SoftRestaurant 8.0:
//   Cheques: Folio, NumPersonas, Total, Status (1=abierta, 2=cerrada), FechaCierre, NumMesa
//   ChequeConceptos: Folio, Cantidad, Precio
//   ChequeFormasPago: Folio, TipoFormaPago (1=Efectivo, 2=Tarjeta, ...), Importe
//
//  ¡AJUSTA los nombres de tabla/columna si tu versión es diferente!
$cutoffDate = date('Y-m-d', strtotime('-' . SYNC_DAYS . ' days'));

try {
    // --- Opción A (sqlsrv) ---
    // $sql = "SELECT c.Folio, c.NumPersonas, c.Total, c.FechaCierre, c.NumMesa,
    //                ISNULL(f.TipoFormaPago, 1) AS TipoFormaPago, ISNULL(f.Importe, c.Total) AS Importe
    //         FROM Cheques c
    //         LEFT JOIN ChequeFormasPago f ON c.Folio = f.Folio
    //         WHERE c.Status = 2
    //           AND CAST(c.FechaCierre AS DATE) >= ?
    //         ORDER BY c.FechaCierre";
    // $params = [$cutoffDate];
    // $result = sqlsrv_query($conn, $sql, $params);

    // --- Opción B (PDO) ---
    $sql = "SELECT
                c.Folio,
                ISNULL(c.NumPersonas, 1) AS NumPersonas,
                c.Total,
                c.FechaCierre,
                c.NumMesa,
                ISNULL(f.TipoFormaPago, 1) AS TipoFormaPago,
                ISNULL(f.Importe, c.Total) AS Importe,
                c.Mesero
            FROM Cheques c
            LEFT JOIN ChequeFormasPago f ON c.Folio = f.Folio
            WHERE c.Status = 2
              AND CAST(c.FechaCierre AS DATE) >= :cutoff
            ORDER BY c.FechaCierre";
    $stmt = $conn->prepare($sql);
    $stmt->execute([':cutoff' => $cutoffDate]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "[OK] " . count($rows) . " transacciones encontradas\n";
} catch (Exception $e) {
    echo "[ERROR] Query: " . $e->getMessage() . "\n";
    exit(1);
}

// ── Transformar datos ──────────────────────────────────────────────────────
$transactions = [];
foreach ($rows as $row) {
    $payType = match(intval($row['TipoFormaPago'] ?? 1)) {
        1       => 'efectivo',
        2       => 'tarjeta',
        default => 'otro',
    };

    $txDate = date('Y-m-d', strtotime($row['FechaCierre']));
    $txDt   = date('Y-m-d H:i:s', strtotime($row['FechaCierre']));

    $transactions[] = [
        'ticket_id'    => (string)$row['Folio'],
        'date'         => $txDate,
        'datetime'     => $txDt,
        'amount'       => floatval($row['Importe']),
        'payment_type' => $payType,
        'table'        => (string)($row['NumMesa'] ?? ''),
        'covers'       => intval($row['NumPersonas'] ?? 1),
        'waiter'       => (string)($row['Mesero'] ?? ''),
        'status'       => 'closed',
    ];
}

// ── Agrupar por fecha para calcular daily_summary ─────────────────────────
$byDate = [];
foreach ($transactions as $tx) {
    $d = $tx['date'];
    if (!isset($byDate[$d])) $byDate[$d] = ['cash' => 0, 'card' => 0, 'other' => 0, 'covers' => 0, 'tickets' => 0];
    $byDate[$d][$tx['payment_type'] === 'efectivo' ? 'cash' : ($tx['payment_type'] === 'tarjeta' ? 'card' : 'other')] += $tx['amount'];
    $byDate[$d]['covers']  += $tx['covers'];
    $byDate[$d]['tickets'] += 1;
}

// ── Enviar a la API (por fecha) ────────────────────────────────────────────
foreach ($byDate as $date => $summary) {
    $txForDate = array_filter($transactions, fn($t) => $t['date'] === $date);

    $payload = json_encode([
        'sync_date'     => $date,
        'transactions'  => array_values($txForDate),
        'daily_summary' => $summary,
    ]);

    $ch = curl_init(API_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'X-API-Key: ' . API_KEY,
        ],
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        echo "[ERROR] cURL ($date): $curlErr\n";
        continue;
    }

    $result = json_decode($response, true);
    if ($httpCode === 200 && ($result['success'] ?? false)) {
        echo "[OK] $date → {$result['inserted']} nuevos, {$result['updated']} actualizados\n";
    } else {
        echo "[ERROR] $date → HTTP $httpCode: $response\n";
    }
}

echo "[" . date('Y-m-d H:i:s') . "] Sincronización completada\n";

// ── Si no tienes PDO/sqlsrv y usas totales manuales del día ───────────────
// Descomenta esto y adapta para enviar solo totales del día:
/*
$manualPayload = json_encode([
    'sync_date'     => date('Y-m-d'),
    'transactions'  => [],
    'daily_summary' => [
        'cash'    => 0,    // <-- pon el total en efectivo del día
        'card'    => 0,    // <-- pon el total en tarjeta del día
        'other'   => 0,
        'covers'  => 0,
        'tickets' => 0,
    ],
]);
*/
