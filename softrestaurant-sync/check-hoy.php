<?php
$dsn  = "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true";
$user = 'usuario_web';
$pass = 'Filipenses4:8@';

echo "=== CHECK HOY " . date('Y-m-d H:i:s') . " ===\n\n";

try {
    $conn = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "[OK] Conexion SQL Server\n\n";

    // 1. Cheques cerrados de hoy (18 abril 2026)
    $r1 = $conn->query("
        SELECT COUNT(*) as n, SUM(total) as suma
        FROM cheques
        WHERE pagado=1 AND cancelado=0
          AND YEAR(fecha)=2026 AND MONTH(fecha)=4 AND DAY(fecha)=18
    ")->fetch(PDO::FETCH_ASSOC);
    echo "Cheques cerrados hoy (18/04/2026): n={$r1['n']} suma={$r1['suma']}\n";

    // 2. Cheques cerrados desde ayer 8AM (turno actual)
    $r2 = $conn->query("
        SELECT COUNT(*) as n, SUM(total) as suma
        FROM cheques
        WHERE pagado=1 AND cancelado=0
          AND (
            (YEAR(fecha)=2026 AND MONTH(fecha)=4 AND DAY(fecha)=18 AND DATEPART(HOUR,fecha)>=8)
            OR (YEAR(fecha)=2026 AND MONTH(fecha)=4 AND DAY(fecha)=19 AND DATEPART(HOUR,fecha)<8)
          )
    ")->fetch(PDO::FETCH_ASSOC);
    echo "Cheques cerrados turno actual (18/04 8AM-19/04 7:59AM): n={$r2['n']} suma={$r2['suma']}\n";

    // 3. Tempcheques (mesas abiertas ahora)
    $r3 = $conn->query("
        SELECT COUNT(*) as n, SUM(ISNULL(total,0)) as suma
        FROM tempcheques
    ")->fetch(PDO::FETCH_ASSOC);
    echo "Tempcheques (mesas abiertas): n={$r3['n']} suma={$r3['suma']}\n";

    // 4. Cheques > 2026-04-17 19:45:54 (lo que busca el sync)
    $r4 = $conn->query("
        SELECT COUNT(*) as n, SUM(total) as suma
        FROM cheques
        WHERE cancelado=0
          AND (
            (YEAR(fecha)=2026 AND MONTH(fecha)=4 AND DAY(fecha)=17 AND DATEPART(HOUR,fecha)=19
             AND DATEPART(MINUTE,fecha)>45)
            OR (YEAR(fecha)=2026 AND MONTH(fecha)=4 AND DAY(fecha)>17)
            OR YEAR(fecha)>2026
          )
    ")->fetch(PDO::FETCH_ASSOC);
    echo "Cheques > 2026-04-17 19:45:54 (dateFilter actual): n={$r4['n']} suma={$r4['suma']}\n";

    // 5. Ultimo cheque cerrado
    $r5 = $conn->query("
        SELECT TOP 1 folio, fecha, total, pagado, cancelado
        FROM cheques
        WHERE pagado=1 AND cancelado=0
        ORDER BY fecha DESC
    ")->fetch(PDO::FETCH_ASSOC);
    if ($r5) {
        $fecha = $r5['fecha'] instanceof DateTime ? $r5['fecha']->format('Y-m-d H:i:s') : $r5['fecha'];
        echo "Ultimo cheque cerrado: folio={$r5['folio']} fecha=$fecha total={$r5['total']}\n";
    }

} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
