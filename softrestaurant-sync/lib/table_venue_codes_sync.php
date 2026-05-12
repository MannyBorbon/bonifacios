<?php

/**
 * Copia mínima para el worker en Windows/C:\Sincronizador\… (sin carpeta ../api).
 * Debe mantenerse alineada con api/lib/table_venue_codes.php → bonifacios_table_canonical_venue_code().
 * Ver documentacion.md — tablas BD: cheques, tempcheques (campo mesa / id mesa en SR).
 */

if (!function_exists('bonifacios_table_canonical_venue_code')) {
    /**
     * @return ?string código del plano de reservas (M2, T16, TB1, BARR-I1…) o null
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
}
