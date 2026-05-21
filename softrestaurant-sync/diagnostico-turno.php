<?php
/**
 * DIAGNOSTICO — Tickets del turno actual en SoftRestaurant
 * Ejecutar en servidor: php C:\Sincronizador\softrestaurant-sync\diagnostico-turno.php
 */
error_reporting(E_ALL);
date_default_timezone_set('America/Hermosillo');

define('SR_USER',       'usuario_web');
define('SR_PASS',       'Filipenses4:8@');

$dsn  = "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true;LoginTimeout=30";
$user = SR_USER;
$pass = SR_PASS;

try {
    $conn = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Throwable $e) {
    die("ERROR conexion: " . $e->getMessage() . "\n");
}

$h = (int)date('H');
$shiftDate  = ($h < 8) ? date('Y-m-d', strtotime('-1 day')) : date('Y-m-d');
$todayStart = $shiftDate . ' 08:00:00';
$todayEnd   = date('Y-m-d', strtotime($shiftDate . ' +1 day')) . ' 07:59:59';

echo "=== DIAGNOSTICO TURNO: {$todayStart} → {$todayEnd} ===\n\n";

// 1. CERRADOS (cheques)
$sqlC = "
    SELECT COUNT(*) as n,
           ISNULL(SUM(total),0) as total,
           ISNULL(SUM(efectivo),0) as efectivo,
           ISNULL(SUM(tarjeta),0) as tarjeta,
           ISNULL(SUM(vales),0) as vales,
           ISNULL(SUM(otros),0) as otros
    FROM cheques
    WHERE cancelado = 0 AND pagado = 1
      AND fecha >= CONVERT(DATETIME, '{$todayStart}', 120)
      AND fecha <= CONVERT(DATETIME, '{$todayEnd}', 120)
";
$rC = $conn->query($sqlC)->fetch();
echo "[CHEQUES cerrados]\n";
echo "  Tickets: " . $rC['n'] . " | Total: $" . number_format($rC['total'],2) . "\n";
echo "  Efectivo: $" . number_format($rC['efectivo'],2) . " | Tarjeta: $" . number_format($rC['tarjeta'],2) . "\n";
echo "  Vales: $" . number_format($rC['vales'],2) . " | Otros: $" . number_format($rC['otros'],2) . "\n\n";

// 2. ABIERTOS (tempcheques) SIN filtro de fecha — como hace sync-realtime.php
$sqlOall = "
    SELECT COUNT(*) as n, ISNULL(SUM(total),0) as total,
           MIN(fecha) as min_fecha, MAX(fecha) as max_fecha
    FROM tempcheques t
    WHERE NOT EXISTS (SELECT 1 FROM cheques c WHERE c.folio = t.folio)
";
$rOall = $conn->query($sqlOall)->fetch();
echo "[TEMPCHEQUES sin filtro fecha]\n";
echo "  Tickets: " . $rOall['n'] . " | Total: $" . number_format($rOall['total'],2) . "\n";
echo "  Fecha min: " . $rOall['min_fecha'] . " | Fecha max: " . $rOall['max_fecha'] . "\n\n";

// 3. ABIERTOS (tempcheques) CON filtro de fecha — como DEBERIA ser
$sqlOfilt = "
    SELECT COUNT(*) as n, ISNULL(SUM(total),0) as total,
           MIN(fecha) as min_fecha, MAX(fecha) as max_fecha
    FROM tempcheques t
    WHERE NOT EXISTS (SELECT 1 FROM cheques c WHERE c.folio = t.folio)
      AND fecha >= CONVERT(DATETIME, '{$todayStart}', 120)
      AND fecha <= CONVERT(DATETIME, '{$todayEnd}', 120)
";
$rOfilt = $conn->query($sqlOfilt)->fetch();
echo "[TEMPCHEQUES con filtro fecha]\n";
echo "  Tickets: " . $rOfilt['n'] . " | Total: $" . number_format($rOfilt['total'],2) . "\n";
echo "  Fecha min: " . $rOfilt['min_fecha'] . " | Fecha max: " . $rOfilt['max_fecha'] . "\n\n";

// 4. Detalle de tempcheques antiguos (fuera del turno actual)
if ((int)$rOall['n'] > (int)$rOfilt['n']) {
    $sqlOld = "
        SELECT TOP 20 t.folio, t.fecha, t.total, t.mesa, m.nombre as mesero
        FROM tempcheques t
        LEFT JOIN meseros m ON t.idmesero = m.idmesero
        WHERE NOT EXISTS (SELECT 1 FROM cheques c WHERE c.folio = t.folio)
          AND (fecha < CONVERT(DATETIME, '{$todayStart}', 120)
               OR fecha > CONVERT(DATETIME, '{$todayEnd}', 120))
        ORDER BY t.fecha DESC
    ";
    $old = $conn->query($sqlOld)->fetchAll();
    echo "[TEMPCHEQUES ANTIGUOS (fantasma)] — los primeros 20:\n";
    foreach ($old as $o) {
        echo "  Folio:" . $o['folio'] . " | Fecha:" . $o['fecha'] . " | Total:$" . number_format($o['total'],2)
           . " | Mesa:" . $o['mesa'] . " | Mesero:" . $o['mesero'] . "\n";
    }
    echo "\n";
}

// 5. Detalle de cheques con 'otros' > 0
$sqlOtros = "
    SELECT TOP 10 c.folio, c.fecha, c.total, c.efectivo, c.tarjeta, c.vales, c.otros, c.mesa, m.nombre as mesero
    FROM cheques c
    LEFT JOIN meseros m ON c.idmesero = m.idmesero
    WHERE cancelado = 0 AND pagado = 1
      AND fecha >= CONVERT(DATETIME, '{$todayStart}', 120)
      AND fecha <= CONVERT(DATETIME, '{$todayEnd}', 120)
      AND ISNULL(c.otros,0) > 0.01
    ORDER BY c.otros DESC
";
$otrosRows = $conn->query($sqlOtros)->fetchAll();
echo "[CHEQUES con 'otros' > 0] — los primeros 10:\n";
foreach ($otrosRows as $o) {
    echo "  Folio:" . $o['folio'] . " | Total:$" . number_format($o['total'],2)
       . " | Ef:$" . number_format($o['efectivo'],2) . " | TJ:$" . number_format($o['tarjeta'],2)
       . " | Vales:$" . number_format($o['vales'],2) . " | Otros:$" . number_format($o['otros'],2)
       . " | Mesa:" . $o['mesa'] . "\n";
}
echo "\n";

// 6. Verificar chequespagos para esos mismos folios con otros > 0
if (count($otrosRows) > 0) {
    $folios = implode(',', array_map(fn($o) => "'" . $o['folio'] . "'", $otrosRows));
    $sqlCp = "
        SELECT folio, idformadepago, importe
        FROM chequespagos
        WHERE folio IN ({$folios})
        ORDER BY folio, importe DESC
    ";
    try {
        $cpRows = $conn->query($sqlCp)->fetchAll();
        echo "[CHEQUEPAGOS de los folios con 'otros' > 0]:\n";
        foreach ($cpRows as $cp) {
            echo "  Folio:" . $cp['folio'] . " | FormaPago:" . $cp['idformadepago'] . " | Importe:$" . number_format($cp['importe'],2) . "\n";
        }
    } catch (Throwable $e) {
        echo "[CHEQUEPAGOS] Error o tabla no existe: " . $e->getMessage() . "\n";
    }
}

echo "\n=== FIN DIAGNOSTICO ===\n";
