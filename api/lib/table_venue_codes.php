<?php

/**
 * Convierte cualquier etiqueta de mesa SR/POS (M2P4, M02, "2", CD-1, TA-16…) al código
 * del plano de reservas (M2, T16, TB1, BARR-I1…). Un solo lugar para sync + floor-state.
 */
function bonifacios_table_canonical_venue_code(?string $raw): ?string
{
    if ($raw === null || $raw === '') {
        return null;
    }
    $s = strtoupper(trim(preg_replace('/\s+/', '', $raw)));
    if ($s === '') {
        return null;
    }
    if (preg_match('/^WEB-/i', $s)) {
        return $s;
    }

    // M2P6 → M2 (capacidad al final en SoftRestaurant)
    $s = preg_replace('/P\d+$/i', '', $s);

    if (preg_match('/^M0*(\d+)$/i', $s, $m)) {
        $n = (int) $m[1];
        if ($n >= 1 && $n <= 11) {
            return 'M' . $n;
        }
    }
    if (preg_match('/^T0*(\d+)$/i', $s, $m)) {
        $n = (int) $m[1];
        if ($n >= 16 && $n <= 22) {
            return 'T' . $n;
        }
    }
    if (preg_match('/^TB0*(\d+)$/i', $s, $m)) {
        $n = (int) $m[1];
        if ($n >= 1 && $n <= 8) {
            return 'TB' . $n;
        }
    }
    if (preg_match('/^BARR-I[1-5]$/', $s) || preg_match('/^BARR-E[1-5]$/', $s)) {
        return $s;
    }

    // Etiquetas plano “B-11”…“B-18” → TB1…TB8 (Terraza Baja en UI SR / Bonifacio’s).
    if (preg_match('/^B-(\d+)$/', $s, $m)) {
        $tb = (int) $m[1] - 10;
        if ($tb >= 1 && $tb <= 8) {
            return 'TB' . $tb;
        }
    }

    if (preg_match('/^CD-(\d+)$/', $s, $m)) {
        $n = (int) $m[1];
        if ($n >= 1 && $n <= 11) {
            return 'M' . $n;
        }

        return null;
    }
    if (preg_match('/^TA-(\d+)$/', $s, $m)) {
        $n = (int) $m[1];
        if ($n >= 16 && $n <= 22) {
            return 'T' . $n;
        }
        if ($n === 15) {
            return 'T16';
        }

        return null;
    }
    if (preg_match('/^TB-(\d+)$/', $s, $m)) {
        $n = (int) $m[1];
        if ($n >= 1 && $n <= 8) {
            return 'TB' . $n;
        }

        return null;
    }

    // Solo dígitos: mesa interior 1–11 → M1–M11; terraza 16–22 → T16–T22; 15 → T16
    if (preg_match('/^(\d{1,2})$/', $s, $m)) {
        $n = (int) $m[1];
        if ($n >= 1 && $n <= 11) {
            return 'M' . $n;
        }
        if ($n >= 16 && $n <= 22) {
            return 'T' . $n;
        }
        if ($n === 15) {
            return 'T16';
        }
    }

    return null;
}

/**
 * Merge de estado POS cuando hay varias filas legacy para la misma mesa: impreso pendiente cobro gana sobre cuenta abierta.
 *
 * @return 'free'|'open_ticket'|'printed_unpaid'
 */
function bonifacios_pos_state_merge_stronger(string $prev, string $incoming): string
{
    $prio = ['free' => 0, 'open_ticket' => 1, 'printed_unpaid' => 2];

    return ($prio[$incoming] ?? 0) > ($prio[$prev] ?? 0) ? $incoming : $prev;
}

/** Estado efectivo POS en BD para un código venue canónico (p. ej. M2). */
function bonifacios_pos_effective_state_for_venue(mysqli $conn, string $venueCode): string
{
    $want = strtoupper(trim($venueCode));
    if ($want === '') {
        return 'free';
    }

    $state = 'free';
    $pr = $conn->query('SELECT table_code, state FROM pos_table_live_state');
    if (!$pr) {
        return 'free';
    }

    while ($row = $pr->fetch_assoc()) {
        $vn = bonifacios_table_canonical_venue_code((string) ($row['table_code'] ?? ''));
        if ($vn === null || strtoupper($vn) !== $want) {
            continue;
        }
        $st = (string) ($row['state'] ?? 'free');
        if (!in_array($st, ['free', 'printed_unpaid', 'open_ticket'], true)) {
            continue;
        }
        $state = bonifacios_pos_state_merge_stronger($state, $st);
    }

    return $state;
}

/**
 * Día de negocio (Y-m-d en zona Hermosillo) de una fila sr_sales abierta — alinea mapa con occupancy-day-timeline.
 *
 * @param array<string, mixed> $row id, sr_ticket_id, table_number… + sale_date, sale_time, sale_datetime, opened_at
 */
function bonifacios_sr_sale_row_business_day_ymd(array $row): ?string
{
    $opened = trim((string) ($row['sale_datetime'] ?? ''));
    if ($opened !== '') {
        $ts = strtotime($opened);
        if ($ts !== false) {
            return date('Y-m-d', $ts);
        }
    }
    $sd = trim((string) ($row['sale_date'] ?? ''));
    $st = trim((string) ($row['sale_time'] ?? ''));
    if ($sd !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $sd)) {
        $composite = $st !== '' ? "{$sd} {$st}" : "{$sd} 12:00:00";
        $ts = strtotime($composite);
        if ($ts !== false) {
            return date('Y-m-d', $ts);
        }

        return $sd;
    }
    $oa = trim((string) ($row['opened_at'] ?? ''));
    if ($oa !== '') {
        $ts = strtotime($oa);
        if ($ts !== false) {
            return date('Y-m-d', $ts);
        }
    }

    return null;
}

/**
 * @param array<string, mixed> $row
 */
function bonifacios_sr_sale_row_matches_business_day(string $wantYmd, array $row): bool
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $wantYmd)) {
        return false;
    }
    $d = bonifacios_sr_sale_row_business_day_ymd($row);

    return $d !== null && $d === $wantYmd;
}

/**
 * Venta abierta en sr_sales para la mesa canónica, opcionalmente solo si el día de negocio coincide.
 *
 * @param ?string $forBusinessDateYmd Y-m-d Hermosillo; null o vacío → hoy
 */
function bonifacios_sr_open_sale_exists_for_venue(mysqli $conn, string $venueCode, ?string $forBusinessDateYmd = null): bool
{
    $want = strtoupper(trim($venueCode));
    if ($want === '') {
        return false;
    }

    $biz = ($forBusinessDateYmd !== null && $forBusinessDateYmd !== '') ? $forBusinessDateYmd : date('Y-m-d');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $biz)) {
        $biz = date('Y-m-d');
    }

    try {
        $chk = $conn->query("SHOW TABLES LIKE 'sr_sales'");
        if (!$chk || $chk->num_rows === 0) {
            return false;
        }
        $sr = $conn->query(
            "SELECT table_number, sale_date, sale_time, sale_datetime, opened_at
             FROM sr_sales WHERE status = 'open' LIMIT 400",
        );
        if (!$sr) {
            return false;
        }
        while ($row = $sr->fetch_assoc()) {
            $vn = bonifacios_table_canonical_venue_code((string) ($row['table_number'] ?? ''));
            if ($vn !== null && strtoupper($vn) === $want) {
                if (bonifacios_sr_sale_row_matches_business_day($biz, $row)) {
                    return true;
                }
            }
        }
    } catch (Throwable $e) {
        return false;
    }

    return false;
}

/**
 * Mesa ocupada para servicio en curso (no asignar otra reserva el mismo día):
 * POS en cuenta abierta o impreso sin cobrar, o venta abierta en sr_sales (mismo día de negocio).
 *
 * @param ?string $forBusinessDateYmd Y-m-d de la reserva / vista; null → hoy
 */
function bonifacios_table_live_busy(mysqli $conn, string $canonicalVenueCode, ?string $forBusinessDateYmd = null): bool
{
    $v = strtoupper(trim($canonicalVenueCode));
    if ($v === '' || preg_match('/^WEB-/i', $v)) {
        return false;
    }

    $pos = bonifacios_pos_effective_state_for_venue($conn, $v);
    if ($pos === 'open_ticket' || $pos === 'printed_unpaid') {
        return true;
    }

    return bonifacios_sr_open_sale_exists_for_venue($conn, $v, $forBusinessDateYmd);
}
