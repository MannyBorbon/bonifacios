<?php
$conn = new PDO("sqlsrv:server=100.84.227.35\NATIONALSOFT;Database=softrestaurant8pro", "usuario_web", "Bon1f4c10s2024!");

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
