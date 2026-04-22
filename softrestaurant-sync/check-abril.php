<?php
/**
 * Corre en el servidor SQL Server para ver exactamente que tiene cheques para abril 2025
 * Uso en CMD: php check-abril.php
 */

$dsn  = "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true";
$user = 'usuario_web';
$pass = 'Filipenses4:8@';

echo "=== CHECK CHEQUES ABRIL 2025 ===\n\n";

try {
    $conn = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "[OK] Conexion SQL Server\n\n";

    // Turno SR: 01/04/2025 08:00 al 01/05/2025 07:59
    // Usando YEAR/MONTH/DAY para evitar SQLSTATE[22007]

    // 1. Conteo exacto que SR reporta: pagado=1, cancelado=0
    $sql1 = "
        SELECT COUNT(*) as total, SUM(total) as suma_total,
               SUM(subtotal) as suma_subtotal,
               SUM(totalimpuesto1) as suma_iva,
               SUM(descuentoimporte) as suma_descuento,
               SUM(propina) as suma_propina
        FROM cheques
        WHERE pagado = 1
          AND cancelado = 0
          AND (
            (YEAR(fecha) = 2025 AND MONTH(fecha) = 4)
            OR (YEAR(fecha) = 2025 AND MONTH(fecha) = 5 AND DAY(fecha) = 1
                AND DATEPART(HOUR,fecha) < 8)
          )
    ";
    $r1 = $conn->query($sql1)->fetch(PDO::FETCH_ASSOC);
    echo "--- SR: pagado=1, cancelado=0, abril 2025 ---\n";
    foreach ($r1 as $k => $v) echo "  $k = $v\n";

    // 2. Conteo con pagado=1, cancelado=0 incluyendo total=0
    $sql2 = "
        SELECT pagado, cancelado, COUNT(*) as n, SUM(total) as suma
        FROM cheques
        WHERE (
            (YEAR(fecha) = 2025 AND MONTH(fecha) = 4)
            OR (YEAR(fecha) = 2025 AND MONTH(fecha) = 5 AND DAY(fecha) = 1
                AND DATEPART(HOUR,fecha) < 8)
        )
        GROUP BY pagado, cancelado
        ORDER BY pagado, cancelado
    ";
    $r2 = $conn->query($sql2)->fetchAll(PDO::FETCH_ASSOC);
    echo "\n--- Agrupado por pagado/cancelado ---\n";
    foreach ($r2 as $row) {
        echo "  pagado={$row['pagado']} cancelado={$row['cancelado']}  tickets={$row['n']}  suma_total={$row['suma']}\n";
    }

    // 3. Tickets con total=0 pagados y no cancelados
    $sql3 = "
        SELECT COUNT(*) as n, SUM(subtotal) as subtotal, SUM(totalimpuesto1) as iva, SUM(descuentoimporte) as descuento
        FROM cheques
        WHERE pagado = 1 AND cancelado = 0
          AND ISNULL(total,0) = 0
          AND (
            (YEAR(fecha) = 2025 AND MONTH(fecha) = 4)
            OR (YEAR(fecha) = 2025 AND MONTH(fecha) = 5 AND DAY(fecha) = 1
                AND DATEPART(HOUR,fecha) < 8)
          )
    ";
    $r3 = $conn->query($sql3)->fetch(PDO::FETCH_ASSOC);
    echo "\n--- Tickets pagados con total=0 ---\n";
    foreach ($r3 as $k => $v) echo "  $k = $v\n";

    // 4. Tickets con razoncancelado no nulo (cancelados de otra forma)
    $sql4 = "
        SELECT COUNT(*) as n, SUM(total) as suma
        FROM cheques
        WHERE pagado = 1 AND cancelado = 0
          AND razoncancelado IS NOT NULL AND razoncancelado != ''
          AND YEAR(fecha) = 2025 AND MONTH(fecha) = 4
    ";
    $r4 = $conn->query($sql4)->fetch(PDO::FETCH_ASSOC);
    echo "\n--- Tickets pagado=1, cancelado=0 pero con razoncancelado ---\n";
    foreach ($r4 as $k => $v) echo "  $k = $v\n";

    // 5. Suma exacta del reporte SR: venta bruta = subtotal sin descuento ni cortesia
    // SR usa: alimentos + bebidas + otros = SUM de columnas de producto
    // Intentemos reproducir: SUM(subtotal) - SUM(descuento) donde no es cortesia
    $sql5 = "
        SELECT 
            COUNT(*) as n,
            SUM(total) as suma_total,
            SUM(CASE WHEN ISNULL(descuentoimporte,0) >= ISNULL(subtotal,0)+ISNULL(totalimpuesto1,0) AND ISNULL(subtotal,0)+ISNULL(totalimpuesto1,0) > 0 THEN 1 ELSE 0 END) as cortesias,
            SUM(CASE WHEN ISNULL(descuentoimporte,0) >= ISNULL(subtotal,0)+ISNULL(totalimpuesto1,0) AND ISNULL(subtotal,0)+ISNULL(totalimpuesto1,0) > 0 THEN total ELSE 0 END) as suma_cortesias,
            SUM(CASE WHEN ISNULL(descuentoimporte,0) < ISNULL(subtotal,0)+ISNULL(totalimpuesto1,0) THEN total ELSE 0 END) as suma_sin_cortesias
        FROM cheques
        WHERE pagado = 1 AND cancelado = 0
          AND (
            (YEAR(fecha) = 2025 AND MONTH(fecha) = 4)
            OR (YEAR(fecha) = 2025 AND MONTH(fecha) = 5 AND DAY(fecha) = 1 AND DATEPART(HOUR,fecha) < 8)
          )
    ";
    $r5 = $conn->query($sql5)->fetch(PDO::FETCH_ASSOC);
    echo "\n--- Calculo cortesias en SQL Server ---\n";
    foreach ($r5 as $k => $v) echo "  $k = $v\n";
    echo "  suma_sin_cortesias deberia ser: 377692.16\n";
    $diff = round(floatval($r5['suma_sin_cortesias']) - 377692.16, 2);
    echo "  diferencia con SR: $diff\n";

    // 6b. Propinas incluidas en total (propinaincluida=1)
    $sql6b = "
        SELECT COUNT(*) as n,
               SUM(propina) as suma_propina,
               SUM(total) as suma_total,
               SUM(total - propina) as suma_total_sin_propina
        FROM cheques
        WHERE pagado = 1 AND cancelado = 0
          AND ISNULL(propinaincluida,0) = 1
          AND (
            (YEAR(fecha) = 2025 AND MONTH(fecha) = 4)
            OR (YEAR(fecha) = 2025 AND MONTH(fecha) = 5 AND DAY(fecha) = 1 AND DATEPART(HOUR,fecha) < 8)
          )
    ";
    $r6b = $conn->query($sql6b)->fetch(PDO::FETCH_ASSOC);
    echo "\n--- Tickets con propinaincluida=1 ---\n";
    foreach ($r6b as $k => $v) echo "  $k = $v\n";
    echo "  Si suma_propina = 154, ese es el problema\n";

    // 6c. Total SUM excluyendo propinas incluidas del total
    $sql6c = "
        SELECT 
            SUM(total - CASE WHEN ISNULL(propinaincluida,0)=1 THEN ISNULL(propina,0) ELSE 0 END) as total_sin_propinas_incluidas
        FROM cheques
        WHERE pagado = 1 AND cancelado = 0
          AND ISNULL(descuentoimporte,0) < ISNULL(subtotal,0)+ISNULL(totalimpuesto1,0)
          AND (
            (YEAR(fecha) = 2025 AND MONTH(fecha) = 4)
            OR (YEAR(fecha) = 2025 AND MONTH(fecha) = 5 AND DAY(fecha) = 1 AND DATEPART(HOUR,fecha) < 8)
          )
    ";
    $r6c = $conn->query($sql6c)->fetch(PDO::FETCH_ASSOC);
    echo "\n--- Total excluyendo propinas incluidas ---\n";
    echo "  total_sin_propinas_incluidas = {$r6c['total_sin_propinas_incluidas']}\n";
    $diff6c = round(floatval($r6c['total_sin_propinas_incluidas']) - 377692.16, 2);
    echo "  diferencia con SR: $diff6c\n";

    // 6. Los tickets con total > 0 pero que SR probablemente excluye
    // SR total = 377692.16, nosotros tenemos 377846.16, diferencia = 154
    // Buscar tickets con total entre 0.01 y 200 que pudieran ser los excluidos
    $sql6 = "
        SELECT folio, fecha, total, subtotal, totalimpuesto1 as iva, descuentoimporte as descuento, pagado, cancelado
        FROM cheques
        WHERE pagado = 1 AND cancelado = 0
          AND ISNULL(total,0) > 0 AND ISNULL(total,0) < 200
          AND YEAR(fecha) = 2025 AND MONTH(fecha) = 4
        ORDER BY total ASC
    ";
    $r6 = $conn->query($sql6)->fetchAll(PDO::FETCH_ASSOC);
    echo "\n--- Tickets con total entre 0.01 y 200 (posibles excluidos por SR) ---\n";
    $suma6 = 0;
    foreach ($r6 as $row) {
        $fecha = $row['fecha'] instanceof DateTime ? $row['fecha']->format('Y-m-d H:i:s') : $row['fecha'];
        echo "  folio={$row['folio']} total={$row['total']} subtotal={$row['subtotal']} iva={$row['iva']} desc={$row['descuento']} fecha=$fecha\n";
        $suma6 += floatval($row['total']);
    }
    echo "  SUMA: $suma6\n";

    // 7. Ver exactamente la suma de total donde descuento > 0
    $sql7 = "
        SELECT 
            SUM(CASE WHEN ISNULL(descuentoimporte,0) > 0 THEN total ELSE 0 END) as suma_con_descuento,
            SUM(CASE WHEN ISNULL(descuentoimporte,0) = 0 THEN total ELSE 0 END) as suma_sin_descuento,
            COUNT(CASE WHEN ISNULL(descuentoimporte,0) > 0 THEN 1 END) as n_con_descuento
        FROM cheques
        WHERE pagado = 1 AND cancelado = 0
          AND (
            (YEAR(fecha) = 2025 AND MONTH(fecha) = 4)
            OR (YEAR(fecha) = 2025 AND MONTH(fecha) = 5 AND DAY(fecha) = 1 AND DATEPART(HOUR,fecha) < 8)
          )
    ";
    $r7 = $conn->query($sql7)->fetch(PDO::FETCH_ASSOC);
    echo "\n--- Desglose por descuento ---\n";
    foreach ($r7 as $k => $v) echo "  $k = $v\n";

    // 8. Usar totalcortesiasconimpuestos real de cheques
    $sql8 = "
        SELECT 
            COUNT(*) as n,
            SUM(total) as suma_total,
            SUM(ISNULL(totalcortesiasconimpuestos,0)) as suma_cortesias_campo,
            SUM(total - ISNULL(totalcortesiasconimpuestos,0)) as total_menos_cortesias
        FROM cheques
        WHERE pagado = 1 AND cancelado = 0
          AND (
            (YEAR(fecha) = 2025 AND MONTH(fecha) = 4)
            OR (YEAR(fecha) = 2025 AND MONTH(fecha) = 5 AND DAY(fecha) = 1 AND DATEPART(HOUR,fecha) < 8)
          )
    ";
    $r8 = $conn->query($sql8)->fetch(PDO::FETCH_ASSOC);
    echo "\n--- Usando totalcortesiasconimpuestos real ---\n";
    foreach ($r8 as $k => $v) echo "  $k = $v\n";
    $diff8 = round(floatval($r8['total_menos_cortesias']) - 377692.16, 2);
    echo "  diferencia con SR: $diff8\n";

    // 9. Ver cuanto vale totalcortesiasconimpuestos en tickets con total>0
    $sql9 = "
        SELECT folio, total, subtotal, totalimpuesto1, totalcortesiasconimpuestos, descuentoimporte
        FROM cheques
        WHERE pagado=1 AND cancelado=0
          AND ISNULL(totalcortesiasconimpuestos,0) > 0
          AND YEAR(fecha)=2025 AND MONTH(fecha)=4
        ORDER BY totalcortesiasconimpuestos DESC
    ";
    $r9 = $conn->query($sql9)->fetchAll(PDO::FETCH_ASSOC);
    echo "\n--- Tickets con totalcortesiasconimpuestos > 0 ---\n";
    $suma9 = 0;
    foreach ($r9 as $row) {
        echo "  folio={$row['folio']} total={$row['total']} cort_imp={$row['totalcortesiasconimpuestos']} desc={$row['descuentoimporte']}\n";
        $suma9 += floatval($row['totalcortesiasconimpuestos']);
    }
    echo "  SUMA totalcortesiasconimpuestos: $suma9\n";
    echo "  Si SUMA = 154, ese es el campo correcto\n";

    // 10. Intentar leer directamente desde la vista vwrepventascheques
    echo "\n--- Intentando vista vwrepventascheques ---\n";
    try {
        $sql10 = "
            SELECT TOP 5 * FROM vwrepventascheques
            WHERE YEAR(fecha) = 2025 AND MONTH(fecha) = 4
        ";
        $r10 = $conn->query($sql10)->fetchAll(PDO::FETCH_ASSOC);
        if (count($r10) > 0) {
            echo "  Columnas: " . implode(', ', array_keys($r10[0])) . "\n";
            foreach ($r10 as $row) {
                $fecha = $row['fecha'] instanceof DateTime ? $row['fecha']->format('Y-m-d') : $row['fecha'];
                $total = $row['total'] ?? $row['totalconimpuestos'] ?? $row['importe'] ?? '?';
                echo "  fecha=$fecha total=$total\n";
            }
        }
    } catch (Throwable $e) {
        echo "  Vista no accesible: " . $e->getMessage() . "\n";
    }

    // 11. Buscar la diferencia de $154: cheqdet con idcortesia
    echo "\n--- Cortesias parciales en cheqdet (productos con idcortesia) ---\n";
    try {
        $sql11 = "
            SELECT SUM(d.precio * d.cantidad) as suma_cortesias_parciales,
                   COUNT(*) as n
            FROM cheqdet d
            INNER JOIN cheques c ON c.folio = d.foliodet
            WHERE c.pagado = 1 AND c.cancelado = 0
              AND ISNULL(d.idcortesia, '') != ''
              AND YEAR(c.fecha) = 2025 AND MONTH(c.fecha) = 4
        ";
        $r11 = $conn->query($sql11)->fetch(PDO::FETCH_ASSOC);
        foreach ($r11 as $k => $v) echo "  $k = $v\n";
        echo "  Si suma_cortesias_parciales ~= 154, ese es el origen\n";
    } catch (Throwable $e) {
        echo "  ERROR: " . $e->getMessage() . "\n";
    }

    // 12. SR cuenta 237 cuentas, SQL Server tiene 238. Encontrar el ticket extra de ~$154
    echo "\n--- Buscar ticket que SR excluye (SR=237, SQL=238, diff=154) ---\n";
    try {
        // Ver distribucion por tipodeservicio
        $sql12a = "
            SELECT tipodeservicio, COUNT(*) as n, SUM(total) as suma
            FROM cheques
            WHERE pagado=1 AND cancelado=0
              AND YEAR(fecha)=2025 AND MONTH(fecha)=4
            GROUP BY tipodeservicio
            ORDER BY tipodeservicio
        ";
        $r12a = $conn->query($sql12a)->fetchAll(PDO::FETCH_ASSOC);
        echo "  Por tipodeservicio:\n";
        foreach ($r12a as $row) echo "    tipo={$row['tipodeservicio']} n={$row['n']} suma={$row['suma']}\n";
    } catch (Throwable $e) {
        echo "  tipodeservicio error: " . $e->getMessage() . "\n";
    }

    try {
        // Ticket con total entre 140 y 170 (cerca de 154)
        $sql12b = "
            SELECT folio, fecha, total, tipodeservicio, idturno, mesa, nopersonas
            FROM cheques
            WHERE pagado=1 AND cancelado=0
              AND YEAR(fecha)=2025 AND MONTH(fecha)=4
              AND ISNULL(total,0) BETWEEN 140 AND 170
            ORDER BY total
        ";
        $r12b = $conn->query($sql12b)->fetchAll(PDO::FETCH_ASSOC);
        echo "  Tickets con total entre 140 y 170 (posible ticket excluido por SR):\n";
        foreach ($r12b as $row) {
            $fecha = $row['fecha'] instanceof DateTime ? $row['fecha']->format('Y-m-d H:i:s') : $row['fecha'];
            echo "    folio={$row['folio']} total={$row['total']} tipo={$row['tipodeservicio']} fecha=$fecha\n";
        }
    } catch (Throwable $e) {
        echo "  ERROR: " . $e->getMessage() . "\n";
    }

} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
