<?php
/**
 * diag-items.php — Diagnóstico específico para sr_ticket_items / cheqdet
 * Ejecutar: php diag-items.php
 * Borra después de usar.
 */

// Credenciales tomadas directamente de sync-v3.php
define('SR_DSN_DIAG',  "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true;LoginTimeout=30");
define('SR_USER_DIAG', 'usuario_web');
define('SR_PASS_DIAG', 'Filipenses4:8@');
define('API_BASE',     'https://bonifaciossancarlos.com/api/softrestaurant');
define('API_KEY_DIAG', 'bonifacios-sr-sync-2024-secret-key');

// ── 1. CONEXIÓN SQL SERVER ──
echo "\n=== 1. SQL Server - cheqdet COLUMNS ===\n";
try {
    $sqlConn = new PDO(SR_DSN_DIAG, SR_USER_DIAG, SR_PASS_DIAG, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // columnas de cheqdet
    $cols = $sqlConn->query("
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'cheqdet'
        ORDER BY ORDINAL_POSITION
    ")->fetchAll();

    if (empty($cols)) {
        echo "TABLA cheqdet NO EXISTE\n";
        // Intentar tempcheqdet
        $cols2 = $sqlConn->query("
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'tempcheqdet'
            ORDER BY ORDINAL_POSITION
        ")->fetchAll();
        if (!empty($cols2)) {
            echo "→ tempcheqdet sí existe con " . count($cols2) . " columnas:\n";
            foreach ($cols2 as $c) echo "  {$c['COLUMN_NAME']} ({$c['DATA_TYPE']})\n";
        } else {
            echo "→ tempcheqdet tampoco existe\n";
        }
    } else {
        echo "cheqdet tiene " . count($cols) . " columnas:\n";
        foreach ($cols as $c) echo "  {$c['COLUMN_NAME']} ({$c['DATA_TYPE']})\n";
    }
} catch (Exception $e) {
    echo "ERROR conexión SQL Server: " . $e->getMessage() . "\n";
    exit(1);
}

// ── 2. TOTAL DE ROWS EN cheqdet ÚLTIMAS 48H ──
echo "\n=== 2. cheqdet rows (últimas 48h, pagado=1) ===\n";
try {
    $row = $sqlConn->query("
        SELECT COUNT(*) AS total
        FROM cheqdet d
        INNER JOIN cheques ch ON ch.folio = d.foliodet
        WHERE ch.fecha >= DATEADD(HOUR, -48, GETDATE())
          AND ch.pagado = 1
          AND ch.cancelado = 0
          AND d.idproducto IS NOT NULL
    ")->fetch();
    echo "Rows encontradas: " . $row['total'] . "\n";
} catch (Exception $e) {
    echo "ERROR query: " . $e->getMessage() . "\n";

    // Intentar sin join cheques para ver si cheqdet tiene datos
    try {
        $row2 = $sqlConn->query("SELECT COUNT(*) AS total FROM cheqdet WHERE idproducto IS NOT NULL")->fetch();
        echo "  cheqdet total rows (sin filtro fecha): " . $row2['total'] . "\n";
    } catch (Exception $e2) {
        echo "  Error sin filtro: " . $e2->getMessage() . "\n";
    }
}

// ── 3. MUESTRA PRIMEROS 5 ROWS (debug) ──
echo "\n=== 3. Muestra de 5 items de cheqdet (últimas 48h) ===\n";
try {
    // Detectar columna de folio en cheqdet
    $folioCol = null;
    foreach (['foliodet','folio','idcheque','numcheque'] as $c) {
        $chk = $sqlConn->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='cheqdet' AND COLUMN_NAME=?");
        $chk->execute([$c]);
        if ($chk->fetchColumn()) { $folioCol = $c; break; }
    }
    echo "Columna folio detectada: " . ($folioCol ?? 'NINGUNA') . "\n";

    if ($folioCol) {
        $sample = $sqlConn->query("
            SELECT TOP 5 d.$folioCol AS folio, d.idproducto, d.cantidad
            FROM cheqdet d
            INNER JOIN cheques ch ON ch.folio = d.$folioCol
            WHERE ch.fecha >= DATEADD(HOUR, -48, GETDATE())
              AND ch.pagado = 1
              AND ch.cancelado = 0
              AND d.idproducto IS NOT NULL
        ")->fetchAll();
        if (empty($sample)) {
            echo "Sin resultados\n";
        } else {
            foreach ($sample as $r) {
                echo "  folio={$r['folio']} producto={$r['idproducto']} cant={$r['cantidad']}\n";
            }
        }
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

// ── 4. Verificar ticket-items.php con folios reales de cheqdet ──
echo "\n=== 4. Llamada a ticket-items.php (API ya desplegada) ===\n";

// Obtener hasta 3 folios reales de SQL Server para probar
$testFolios = [];
if (isset($folioCol) && $folioCol) {
    try {
        $folioRows = $sqlConn->query("
            SELECT DISTINCT TOP 3 CAST(d.$folioCol AS VARCHAR(50)) AS folio
            FROM cheqdet d
            INNER JOIN cheques ch ON ch.folio = d.$folioCol
            WHERE ch.fecha >= DATEADD(HOUR, -48, GETDATE())
              AND ch.pagado = 1
              AND ch.cancelado = 0
              AND d.idproducto IS NOT NULL
        ")->fetchAll();
        $testFolios = array_column($folioRows, 'folio');
    } catch (Exception $e) {
        echo "No se pudo obtener folios de prueba: " . $e->getMessage() . "\n";
    }
}

if (empty($testFolios)) {
    echo "Sin folios de SQL Server para probar.\n";
} else {
    foreach ($testFolios as $folio) {
        $url = API_BASE . '/ticket-items.php?folio=' . urlencode($folio);
        $ctx = stream_context_create(['http' => ['timeout' => 8, 'ignore_errors' => true]]);
        $resp = @file_get_contents($url, false, $ctx);
        if ($resp === false) {
            echo "  folio=$folio → ERROR al conectar\n";
        } else {
            $json = json_decode($resp, true);
            $count = count($json['items'] ?? []);
            echo "  folio=$folio → items en sr_ticket_items: $count\n";
            if ($count > 0) {
                $first = $json['items'][0];
                echo "    primer item: {$first['product_name']} qty={$first['qty']}\n";
            }
        }
    }
}

// ── 5. Envío de prueba vía sync API (ticket_items) ──
echo "\n=== 5. Test de envío al API sync ===\n";
if (!empty($testFolios)) {
    $firstFolio = $testFolios[0];
    $payload = json_encode([
        'module' => 'ticket_items',
        'api_key' => API_KEY_DIAG,
        'data' => [['folio' => $firstFolio, 'items' => [
            ['product_id' => 'TEST', 'product_name' => 'TEST-DIAG', 'qty' => 1, 'unit_price' => 1, 'subtotal' => 1, 'discount' => 0, 'notes' => '']
        ]]]
    ]);
    $ctx2 = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\n",
        'content' => $payload,
        'timeout' => 8,
        'ignore_errors' => true,
    ]]);
    $apiResp = @file_get_contents(API_BASE . '/sync.php', false, $ctx2);
    echo "Respuesta sync API: " . ($apiResp ?: 'ERROR sin respuesta') . "\n";

    // Verificar si el test item llegó
    $verUrl = API_BASE . '/ticket-items.php?folio=' . urlencode($firstFolio);
    $verResp = @file_get_contents($verUrl, false, stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]));
    $verJson = json_decode($verResp, true);
    $verCount = count($verJson['items'] ?? []);
    echo "Verificación post-envío folio=$firstFolio → items: $verCount\n";
}

echo "\n=== FIN DIAGNÓSTICO ===\n";
