<?php
$dsn = "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true";
$pass = getenv('SR_PASS') ?: '';
if ($pass === '') {
    fwrite(STDERR, "SR_PASS debe estar definido en el entorno.\n");
    exit(1);
}
$conn = new PDO($dsn, 'usuario_web', $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$sql = "SELECT folio, fecha, total, pagado, CAST(pagado AS INT) as pagado_int 
        FROM cheques 
        WHERE folio = 13960";

$stmt = $conn->query($sql);
$ticket = $stmt->fetch(PDO::FETCH_ASSOC);

if ($ticket) {
    echo "=== TICKET 13960 ===\n";
    echo "Folio: {$ticket['folio']}\n";
    echo "Fecha: {$ticket['fecha']}\n";
    echo "Total: {$ticket['total']}\n";
    echo "Pagado (raw): '{$ticket['pagado']}'\n";
    echo "Pagado (int): {$ticket['pagado_int']}\n";
    echo "Pagado == 0? " . ($ticket['pagado'] == 0 ? 'SI' : 'NO') . "\n";
    echo "Pagado === 0? " . ($ticket['pagado'] === 0 ? 'SI' : 'NO') . "\n";
    echo "Tipo de dato: " . gettype($ticket['pagado']) . "\n";
} else {
    echo "Ticket no encontrado\n";
}

echo "\n=== QUERY DE SYNC ===\n";
$sql2 = "SELECT COUNT(*) as total FROM cheques WHERE pagado = 0";
$stmt2 = $conn->query($sql2);
$result = $stmt2->fetch(PDO::FETCH_ASSOC);
echo "Total tickets con pagado = 0: {$result['total']}\n";
