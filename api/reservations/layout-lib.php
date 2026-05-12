<?php

function bonifacios_layout_ensure_table(mysqli $conn): void
{
    $conn->query(
        "CREATE TABLE IF NOT EXISTS reservation_floor_layout_items (
            id INT(11) NOT NULL AUTO_INCREMENT,
            item_type ENUM('table','bar_chair','landmark','decor') NOT NULL DEFAULT 'table',
            code VARCHAR(50) NULL,
            zone ENUM('comedor','terraza_alta','terraza_baja') NOT NULL DEFAULT 'comedor',
            label VARCHAR(120) NOT NULL DEFAULT '',
            shape ENUM('round','rect') NOT NULL DEFAULT 'round',
            x_pct DECIMAL(7,3) NOT NULL DEFAULT 50.000,
            y_pct DECIMAL(7,3) NOT NULL DEFAULT 50.000,
            w_pct DECIMAL(7,3) NOT NULL DEFAULT 8.000,
            h_pct DECIMAL(7,3) NOT NULL DEFAULT 8.000,
            scale DECIMAL(6,3) NOT NULL DEFAULT 1.000,
            capacity INT(11) NOT NULL DEFAULT 0,
            tone VARCHAR(24) NULL,
            is_hidden TINYINT(1) NOT NULL DEFAULT 0,
            sort_order INT(11) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_rfl_code (code),
            KEY idx_rfl_zone_order (zone, sort_order),
            KEY idx_rfl_type (item_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    );
}

function bonifacios_layout_payload_from_row(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'item_type' => (string) ($row['item_type'] ?? 'table'),
        'code' => ($row['code'] ?? null) !== null ? (string) $row['code'] : null,
        'zone' => (string) ($row['zone'] ?? 'comedor'),
        'label' => (string) ($row['label'] ?? ''),
        'shape' => (string) ($row['shape'] ?? 'round'),
        'x_pct' => (float) ($row['x_pct'] ?? 50),
        'y_pct' => (float) ($row['y_pct'] ?? 50),
        'w_pct' => (float) ($row['w_pct'] ?? 8),
        'h_pct' => (float) ($row['h_pct'] ?? 8),
        'scale' => (float) ($row['scale'] ?? 1),
        'capacity' => (int) ($row['capacity'] ?? 0),
        'tone' => ($row['tone'] ?? null) !== null ? (string) $row['tone'] : null,
        'is_hidden' => (int) ($row['is_hidden'] ?? 0) === 1,
        'sort_order' => (int) ($row['sort_order'] ?? 0),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function bonifacios_layout_validate_item(array $item): array
{
    $zones = ['comedor', 'terraza_alta', 'terraza_baja'];
    $types = ['table', 'bar_chair', 'landmark', 'decor'];
    $shapes = ['round', 'rect'];
    $tones = ['amber', 'cyan', 'emerald', 'purple', 'slate'];

    $itemType = strtolower(trim((string) ($item['item_type'] ?? 'table')));
    $zone = strtolower(trim((string) ($item['zone'] ?? 'comedor')));
    $shape = strtolower(trim((string) ($item['shape'] ?? 'round')));
    $toneRaw = trim((string) ($item['tone'] ?? ''));
    $tone = strtolower($toneRaw);
    $label = trim((string) ($item['label'] ?? ''));
    $codeRaw = trim((string) ($item['code'] ?? ''));
    $code = $codeRaw !== '' ? strtoupper($codeRaw) : null;

    $x = is_numeric($item['x_pct'] ?? null) ? (float) $item['x_pct'] : 50.0;
    $y = is_numeric($item['y_pct'] ?? null) ? (float) $item['y_pct'] : 50.0;
    $w = is_numeric($item['w_pct'] ?? null) ? (float) $item['w_pct'] : 8.0;
    $h = is_numeric($item['h_pct'] ?? null) ? (float) $item['h_pct'] : 8.0;
    $scale = is_numeric($item['scale'] ?? null) ? (float) $item['scale'] : 1.0;
    $capacity = is_numeric($item['capacity'] ?? null) ? (int) $item['capacity'] : 0;
    $sortOrder = is_numeric($item['sort_order'] ?? null) ? (int) $item['sort_order'] : 0;
    $isHidden = (int) (!empty($item['is_hidden']));
    $id = is_numeric($item['id'] ?? null) ? (int) $item['id'] : 0;

    if (!in_array($itemType, $types, true)) {
        throw new InvalidArgumentException('item_type inválido');
    }
    if (!in_array($zone, $zones, true)) {
        throw new InvalidArgumentException('zone inválida');
    }
    if (!in_array($shape, $shapes, true)) {
        throw new InvalidArgumentException('shape inválida');
    }

    $x = max(0, min(100, $x));
    $y = max(0, min(100, $y));
    $w = max(3, min(100, $w));
    $h = max(3, min(100, $h));
    $scale = max(0.5, min(2.0, $scale));
    $capacity = max(0, min(24, $capacity));

    if ($tone !== '' && !in_array($tone, $tones, true)) {
        $tone = null;
    } elseif ($tone === '') {
        $tone = null;
    }

    if ($label === '') {
        $label = $code ?? strtoupper($itemType);
    }

    return [
        'id' => $id,
        'item_type' => $itemType,
        'code' => $code,
        'zone' => $zone,
        'label' => $label,
        'shape' => $shape,
        'x_pct' => $x,
        'y_pct' => $y,
        'w_pct' => $w,
        'h_pct' => $h,
        'scale' => $scale,
        'capacity' => $capacity,
        'tone' => $tone,
        'is_hidden' => $isHidden,
        'sort_order' => $sortOrder,
    ];
}

