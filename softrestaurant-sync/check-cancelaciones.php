<?php
/**
 * Diagnóstico de cancelaciones
 * Ejecutar en el restaurante: php check-cancelaciones.php
 * 
 * Verifica:
 *  1. Cuántos tickets cancelados hay en cheques (sin filtro de fecha)
 *  2. Muestra los últimos 10
 *  3. Muestra el cursor actual en sync-state-v3.json
 *  4. Muestra lo que devolvería la query del sync con ese cursor
 */

error_reporting(E_ALL);
date_default_timezone_set('America/Hermosillo');

define('SR_DSN',  "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true;LoginTimeout=30");
define('SR_USER', 'usuario_web');
define('SR_PASS', 'Filipenses4:8@');
define('STATE_FILE', __DIR__ . '/sync-state-v3.json');

function line(string $s = ''): void { echo $s . "\n"; }
function sep(): void { line(str_repeat('─', 60)); }

line("=== DIAGNÓSTICO CANCELACIONES ===");
line(date('Y-m-d H:i:s'));
sep();

// ── 1. Estado del cursor ─────────────────────────────────────
$state = [];
if (file_exists(STATE_FILE)) {
    $state = json_decode(file_get_contents(STATE_FILE), true) ?? [];
}
$cursor = $state['cancellations'] ?? '2000-01-01 00:00:00';
line("Cursor 'cancellations' en sync-state-v3.json: $cursor");
line("initial_load_done: " . (isset($state['initial_load_done']) ? 'true' : 'false'));
sep();

// ── 2. Conexión ───────────────────────────────────────────────
try {
    $conn = new PDO(SR_DSN, SR_USER, SR_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    line("✓ SQL Server conectado");
} catch (Throwable $e) {
    line("✗ Conexión fallida: " . $e->getMessage());
    exit(1);
}
sep();

// ── 3. ¿Cuántos tickets cancelados en total? ──────────────────
try {
    $total = $conn->query("SELECT COUNT(*) AS n FROM cheques WHERE ISNULL(cancelado,0)=1")->fetch();
    line("Total cheques con cancelado=1: " . $total['n']);

    // Con fechacancelado NOT NULL (query antigua del sync)
    $conFecha = $conn->query("SELECT COUNT(*) AS n FROM cheques WHERE ISNULL(cancelado,0)=1 AND fechacancelado IS NOT NULL")->fetch();
    line("  → con fechacancelado NOT NULL: " . $conFecha['n']);

    // Con fechacancelado NULL
    $sinFecha = $conn->query("SELECT COUNT(*) AS n FROM cheques WHERE ISNULL(cancelado,0)=1 AND fechacancelado IS NULL")->fetch();
    line("  → con fechacancelado NULL (usará fecha): " . $sinFecha['n']);
} catch (Throwable $e) {
    line("ERROR conteo: " . $e->getMessage());
}
sep();

// ── 4. Últimos 10 tickets cancelados ─────────────────────────
line("Últimos 10 tickets cancelados (COALESCE(fechacancelado, fecha)):");
try {
    $rows = $conn->query("
        SELECT TOP 10
            CAST(folio AS VARCHAR(50)) AS folio,
            numcheque,
            fecha,
            fechacancelado,
            COALESCE(fechacancelado, fecha) AS cancel_date_efectiva,
            ISNULL(total,0) AS total,
            ISNULL(CAST(razoncancelado AS VARCHAR(100)),'') AS razon,
            ISNULL(CAST(usuariocancelo AS VARCHAR(30)),'') AS usuario
        FROM cheques
        WHERE ISNULL(cancelado,0) = 1
        ORDER BY COALESCE(fechacancelado, fecha) DESC
    ")->fetchAll();

    if (count($rows) === 0) {
        line("  (ninguno encontrado — puede que no haya cancelaciones en SR)");
    } else {
        foreach ($rows as $r) {
            line(sprintf(
                "  folio=%-8s  numcheque=%-6s  fecha=%-20s  fechacancelado=%-20s  cancel_efectiva=%-20s  total=%8.2f  razon=%s",
                $r['folio'],
                $r['numcheque'],
                (string)$r['fecha'],
                (string)($r['fechacancelado'] ?? 'NULL'),
                (string)$r['cancel_date_efectiva'],
                floatval($r['total']),
                $r['razon']
            ));
        }
    }
} catch (Throwable $e) {
    line("ERROR últimos cancelados: " . $e->getMessage());
}
sep();

// ── 5. ¿Qué devolvería la query del sync con el cursor actual? ──
line("Query del sync con cursor='$cursor':");
try {
    $stmt = $conn->prepare("
        SELECT TOP 20
            CAST(folio AS VARCHAR(50)) AS ticket_number,
            COALESCE(fechacancelado, fecha) AS cancel_date,
            ISNULL(total,0) AS amount,
            ISNULL(CAST(usuariocancelo AS VARCHAR(120)),'') AS user_name,
            ISNULL(CAST(razoncancelado AS VARCHAR(255)),'') AS reason
        FROM cheques
        WHERE ISNULL(cancelado,0) = 1
          AND COALESCE(fechacancelado, fecha) > CONVERT(DATETIME, ?, 120)
        ORDER BY COALESCE(fechacancelado, fecha) ASC
    ");
    $stmt->execute([$cursor]);
    $rows = $stmt->fetchAll();

    if (count($rows) === 0) {
        line("  ⚠ CERO FILAS — ningún ticket con cancel_date > '$cursor'");
        line("  → Si el cursor es muy reciente, resetéalo a 2000-01-01 00:00:00");
    } else {
        line("  Encontradas " . count($rows) . " filas:");
        foreach ($rows as $r) {
            line(sprintf(
                "    ticket=%-8s  cancel_date=%-20s  amount=%8.2f  user=%s",
                $r['ticket_number'],
                (string)$r['cancel_date'],
                floatval($r['amount']),
                $r['user_name']
            ));
        }
    }
} catch (Throwable $e) {
    line("ERROR query sync: " . $e->getMessage());
}
sep();

// ── 6. ¿Existe tabla cancelaciones? ──────────────────────────
try {
    $exists = $conn->query("SELECT OBJECT_ID('cancelaciones','U') AS oid")->fetch();
    line("Tabla 'cancelaciones' en SR: " . ($exists['oid'] ? "SÍ existe" : "NO existe"));
    if ($exists['oid']) {
        $cnt = $conn->query("SELECT COUNT(*) AS n FROM cancelaciones")->fetch();
        line("  → Registros en cancelaciones: " . $cnt['n']);
        if ($cnt['n'] > 0) {
            $sample = $conn->query("SELECT TOP 3 * FROM cancelaciones ORDER BY fecha DESC")->fetchAll();
            foreach ($sample as $r) {
                line("  " . json_encode($r, JSON_UNESCAPED_UNICODE));
            }
        }
    }
} catch (Throwable $e) {
    line("ERROR verificando cancelaciones: " . $e->getMessage());
}
sep();

// ── 7. Cancelados HOY (turno actual 08:00 de hoy) ─────────────
line("Cancelados en el turno ACTUAL (cheques.cancelado=1, fecha de hoy):");
try {
    $sql = "SELECT TOP 20
        CAST(folio AS VARCHAR(50)) AS folio,
        numcheque,
        fecha,
        fechacancelado,
        COALESCE(fechacancelado, fecha) AS cancel_date_efectiva,
        ISNULL(total,0) AS total,
        cancelado
    FROM cheques
    WHERE ISNULL(cancelado,0) = 1
      AND COALESCE(fechacancelado, fecha) >= DATEADD(HOUR, 8, CAST(
            CASE WHEN DATEPART(HOUR, GETDATE()) < 8
                 THEN DATEADD(DAY,-1, CONVERT(date, GETDATE()))
                 ELSE CONVERT(date, GETDATE()) END
        AS datetime))
    ORDER BY COALESCE(fechacancelado, fecha) ASC";
    $rows = $conn->query($sql)->fetchAll();
    if (count($rows) === 0) {
        line("  (ninguno en el turno actual — SR no registra cancelaciones de hoy todavía)");
    } else {
        line("  Encontrados: " . count($rows));
        foreach ($rows as $r) {
            line(sprintf(
                "  folio=%-8s  numcheque=%-6s  fecha=%-22s  fechacancelado=%-22s  cancel_efectiva=%-22s  total=%8.2f",
                $r['folio'],
                $r['numcheque'],
                (string)$r['fecha'],
                (string)($r['fechacancelado'] ?? 'NULL'),
                (string)$r['cancel_date_efectiva'],
                floatval($r['total'])
            ));
        }
    }
} catch (Throwable $e) {
    line("ERROR cancelados hoy: " . $e->getMessage());
}
sep();

// ── 8. Total actual de cancelados (cuenta actualizada) ────────
line("Conteo ACTUALIZADO de cancelados en SR:");
try {
    $t = $conn->query("SELECT COUNT(*) AS n FROM cheques WHERE ISNULL(cancelado,0)=1")->fetch();
    $nf = $conn->query("SELECT COUNT(*) AS n FROM cheques WHERE ISNULL(cancelado,0)=1 AND fechacancelado IS NOT NULL")->fetch();
    $nn = $conn->query("SELECT COUNT(*) AS n FROM cheques WHERE ISNULL(cancelado,0)=1 AND fechacancelado IS NULL")->fetch();
    line("  Total:                        " . $t['n']);
    line("  → fechacancelado NOT NULL:    " . $nf['n']);
    line("  → fechacancelado NULL:        " . $nn['n'] . "  ← estos se sincronizan usando fecha como fallback");
} catch (Throwable $e) {
    line("ERROR conteo: " . $e->getMessage());
}
sep();

// ── 9. Query "tiempo real" del sync con cursor actual ────────
$cursor2 = $state['cancellations'] ?? '2000-01-01 00:00:00';
line("Query fetchRecentCancellationRows (96h) — lo que el sync envía en tiempo real:");
try {
    $stmt = $conn->prepare("
        SELECT TOP 20
            CAST(folio AS VARCHAR(50)) AS ticket_number,
            COALESCE(fechacancelado, fecha) AS cancel_date,
            ISNULL(total,0) AS amount
        FROM cheques
        WHERE ISNULL(cancelado,0) = 1
          AND COALESCE(fechacancelado, fecha) >= DATEADD(HOUR, -96, GETDATE())
        ORDER BY COALESCE(fechacancelado, fecha) DESC
    ");
    $stmt->execute();
    $rows = $stmt->fetchAll();
    if (count($rows) === 0) {
        line("  (0 filas) — no hay cancelados en las últimas 96h en SR");
    } else {
        line("  Encontrados: " . count($rows));
        foreach ($rows as $r) {
            line(sprintf("    ticket=%-8s  cancel_date=%-22s  amount=%8.2f",
                $r['ticket_number'], (string)$r['cancel_date'], floatval($r['amount'])));
        }
    }
} catch (Throwable $e) {
    line("ERROR query tiempo real: " . $e->getMessage());
}
sep();

// ── 10. Buscar numcheques específicos de hoy (del reporte SR) ─
line("Buscando numcheques 14312,14313,14315,14318 en cheques y tempcheques:");
$targetNums = [14312, 14313, 14315, 14318];
$inList = implode(',', $targetNums);

try {
    // En cheques (cualquier estado)
    $rows = $conn->query("
        SELECT CAST(folio AS VARCHAR(50)) AS folio, numcheque, fecha, fechacancelado,
               cancelado, pagado, ISNULL(total,0) AS total, ISNULL(CAST(razoncancelado AS VARCHAR(80)),'') AS razon
        FROM cheques WHERE numcheque IN ($inList)
    ")->fetchAll();
    if (count($rows) === 0) {
        line("  cheques: NO encontrados");
    } else {
        line("  cheques (" . count($rows) . " filas):");
        foreach ($rows as $r) {
            line(sprintf("    folio=%-8s  numcheque=%-6s  fecha=%-22s  cancelado=%-2s  pagado=%-2s  total=%8.2f  fechacancelado=%s  razon=%s",
                $r['folio'], $r['numcheque'], (string)$r['fecha'],
                $r['cancelado'], $r['pagado'], floatval($r['total']),
                (string)($r['fechacancelado'] ?? 'NULL'), $r['razon']));
        }
    }
} catch (Throwable $e) {
    line("  ERROR cheques: " . $e->getMessage());
}

try {
    // En tempcheques (tickets abiertos)
    $rows = $conn->query("
        SELECT CAST(folio AS VARCHAR(50)) AS folio, numcheque, fecha, ISNULL(total,0) AS total
        FROM tempcheques WHERE numcheque IN ($inList)
    ")->fetchAll();
    if (count($rows) === 0) {
        line("  tempcheques: NO encontrados");
    } else {
        line("  tempcheques (" . count($rows) . " filas):");
        foreach ($rows as $r) {
            line(sprintf("    folio=%-8s  numcheque=%-6s  fecha=%-22s  total=%8.2f",
                $r['folio'], $r['numcheque'], (string)$r['fecha'], floatval($r['total'])));
        }
    }
} catch (Throwable $e) {
    line("  ERROR tempcheques: " . $e->getMessage());
}

// Buscar en el rango de numcheques del turno de hoy para ver todos los estados
line("");
line("Todos los cheques de hoy (numcheque 14300-14400) con cualquier estado:");
try {
    $rows = $conn->query("
        SELECT TOP 30 CAST(folio AS VARCHAR(50)) AS folio, numcheque, fecha, fechacancelado,
               cancelado, pagado, ISNULL(total,0) AS total
        FROM cheques
        WHERE numcheque BETWEEN 14300 AND 14400
        ORDER BY numcheque ASC
    ")->fetchAll();
    if (count($rows) === 0) {
        line("  (ninguno en ese rango en cheques)");
    } else {
        foreach ($rows as $r) {
            $estado = $r['cancelado'] == 1 ? 'CANCELADO' : ($r['pagado'] == 1 ? 'PAGADO' : 'ABIERTO');
            line(sprintf("    folio=%-8s  numcheque=%-6s  fecha=%-22s  estado=%-10s  total=%8.2f  fechacancelado=%s",
                $r['folio'], $r['numcheque'], (string)$r['fecha'], $estado, floatval($r['total']),
                (string)($r['fechacancelado'] ?? 'NULL')));
        }
    }
} catch (Throwable $e) {
    line("  ERROR rango: " . $e->getMessage());
}
sep();

// ── 11. Acción sugerida ───────────────────────────────────────
line("ESTADO Y ACCIÓN:");
line("Cursor actual: $cursor2");
line("Si la sección 9 muestra tickets y NO están en phpMyAdmin sr_cancellations:");
line("  → El sync no está corriendo, o fue detenido.");
line("  → Reinicia con: run_bonifacios.bat");
line("Si la sección 7 muestra tickets pero la sección 9 no:");
line("  → El COALESCE usa 'fecha' como fallback, pero esa fecha");
line("    puede quedar FUERA del rango de las últimas 96h si la");
line("    apertura fue hace más de 4 días (poco probable hoy).");
sep();
