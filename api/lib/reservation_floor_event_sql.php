<?php

/**
 * Misma lógica de filtro por categoría que floor-state.php / occupied-tables.php.
 *
 * @return array{0:string,1:string,2:array} [$extraSql, $mysqliTypes, $bindParams]
 */
function bonifacios_floor_event_sql(string $event, string $eventTypeId): array
{
    $extra = '';
    $types = '';
    $params = [];

    if ($eventTypeId !== '') {
        $extra .= ' AND sr.event_type_id = ?';
        $types .= 'i';
        $params[] = (int) $eventTypeId;
    } elseif ($event === 'mothers_day') {
        $extra .= " AND (sr.occasion = 'Dia de las Madres' OR sr.occasion = 'Día de las Madres' OR ret.slug = 'dia-madres')";
    } elseif ($event === 'general') {
        $extra .= " AND (
            ret.slug = 'general'
            OR (
                sr.event_type_id IS NULL
                AND (ret.slug IS NULL OR ret.slug = '' OR ret.slug NOT IN ('dia-madres'))
                AND (sr.occasion IS NULL OR (sr.occasion != 'Dia de las Madres' AND sr.occasion != 'Día de las Madres'))
            )
        )";
    } elseif ($event === 'normal') {
        $extra .= " AND ((sr.occasion IS NULL OR (sr.occasion != 'Dia de las Madres' AND sr.occasion != 'Día de las Madres')) AND (ret.slug IS NULL OR ret.slug != 'dia-madres'))";
    }

    return [$extra, $types, $params];
}
