<?php
$dsn = "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true";
$pass = getenv('SR_PASS') ?: '';
if ($pass === '') {
    fwrite(STDERR, "SR_PASS debe estar definido en el entorno.\n");
    exit(1);
}
$conn = new PDO($dsn, 'usuario_web', $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$sql = "SELECT folio, fecha, total, pagado 
        FROM cheques 
        WHERE pagado = 0 
        ORDER BY fecha DESC";

$stmt = $conn->query($sql);
$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "=== TICKETS ABIERTOS EN SOFTRESTAURANT ===\n\n";
echo "Total: " . count($tickets) . " tickets\n\n";

foreach ($tickets as $t) {
    echo "Folio: {$t['folio']} | Fecha: {$t['fecha']} | Total: \${$t['total']}\n";
}
