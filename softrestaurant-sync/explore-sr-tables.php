<?php
/**
 * Explorar tablas de SoftRestaurant relacionadas con cortes/turnos
 * Correr desde CMD: php explore-sr-tables.php
 */
define('SR_DSN',  "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true;LoginTimeout=30");
define('SR_USER', 'usuario_web');
define('SR_PASS', 'Filipenses4:8@');

try {
    $conn = new PDO(SR_DSN, SR_USER, SR_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "✅ Conexión OK\n\n";

    // 1. Tablas relacionadas con turnos/cortes/cierres/declaraciones
    echo "=== TABLAS RELACIONADAS CON CORTES/TURNOS ===\n";
    $sql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
              AND (
                TABLE_NAME LIKE '%turno%'
                OR TABLE_NAME LIKE '%cierre%'
                OR TABLE_NAME LIKE '%corte%'
                OR TABLE_NAME LIKE '%declarac%'
                OR TABLE_NAME LIKE '%cajero%'
                OR TABLE_NAME LIKE '%caja%'
              )
            ORDER BY TABLE_NAME";
    $rows = $conn->query($sql)->fetchAll();
    if (count($rows) === 0) {
        echo "  (ninguna tabla encontrada con esos patrones)\n";
    }
    foreach ($rows as $r) {
        echo "  - " . $r['TABLE_NAME'] . "\n";
    }

    // 2. Todas las tablas del sistema (para referencia)
    echo "\n=== TODAS LAS TABLAS DE SR ===\n";
    $sql2 = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_TYPE = 'BASE TABLE'
             ORDER BY TABLE_NAME";
    $all = $conn->query($sql2)->fetchAll();
    foreach ($all as $r) {
        echo "  - " . $r['TABLE_NAME'] . "\n";
    }

    // 3. Tablas relacionadas con propinas
    echo "\n=== TABLAS RELACIONADAS CON PROPINAS ===\n";
    $sqlTip = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_TYPE = 'BASE TABLE'
                 AND (TABLE_NAME LIKE '%propina%' OR TABLE_NAME LIKE '%tip%')
               ORDER BY TABLE_NAME";
    $tipTables = $conn->query($sqlTip)->fetchAll();
    if (count($tipTables) === 0) {
        echo "  (ninguna tabla con 'propina' o 'tip')\n";
    }
    foreach ($tipTables as $r) {
        $t = $r['TABLE_NAME'];
        echo "\n=== TABLA: $t ===\n";
        $cols = $conn->query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '$t' ORDER BY ORDINAL_POSITION")->fetchAll();
        foreach ($cols as $c) echo "  " . $c['COLUMN_NAME'] . " (" . $c['DATA_TYPE'] . ")\n";
        echo "  Últimos 5 registros:\n";
        $rows = $conn->query("SELECT TOP 5 * FROM $t ORDER BY 1 DESC")->fetchAll();
        foreach ($rows as $row) echo "  " . json_encode($row) . "\n";
    }

    // 4. Columnas de cheques relacionadas con propinas
    echo "\n=== COLUMNAS DE cheques CON 'propina' ===\n";
    $colsProp = $conn->query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cheques' AND COLUMN_NAME LIKE '%propina%' ORDER BY ORDINAL_POSITION")->fetchAll();
    foreach ($colsProp as $c) echo "  " . $c['COLUMN_NAME'] . " (" . $c['DATA_TYPE'] . ")\n";

    // Muestra últimos 5 cheques con propina > 0
    echo "\n  Últimos 5 cheques con propina > 0:\n";
    $rows = $conn->query("SELECT TOP 5 folio, numcheque, fecha, idmesero, propina, propinaincluida, propinacobrada, pagoautorizado FROM cheques WHERE propina > 0 ORDER BY fecha DESC")->fetchAll();
    foreach ($rows as $row) echo "  " . json_encode($row) . "\n";

    // 5. Columnas de movtoscaja
    echo "\n=== COLUMNAS DE movtoscaja ===\n";
    $colsMov = $conn->query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'movtoscaja' ORDER BY ORDINAL_POSITION")->fetchAll();
    foreach ($colsMov as $c) echo "  " . $c['COLUMN_NAME'] . " (" . $c['DATA_TYPE'] . ")\n";
    echo "  Últimos 5 pagos de propina (pagodepropina=1):\n";
    $rows = $conn->query("SELECT TOP 5 * FROM movtoscaja WHERE pagodepropina = 1 ORDER BY fecha DESC")->fetchAll();
    foreach ($rows as $row) echo "  " . json_encode($row) . "\n";

    // 6. Turnos
    $tableNames = array_column($all, 'TABLE_NAME');
    $candidates = ['turnos', 'cierres', 'cortescaja', 'cortes', 'declaraciones'];
    foreach ($candidates as $tbl) {
        if (in_array($tbl, $tableNames)) {
            echo "\n=== COLUMNAS DE '$tbl' ===\n";
            $cols = $conn->query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '$tbl' ORDER BY ORDINAL_POSITION")->fetchAll();
            foreach ($cols as $c) {
                echo "  " . $c['COLUMN_NAME'] . " (" . $c['DATA_TYPE'] . ")\n";
            }
        }
    }

} catch (Throwable $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
