<?php
header('Content-Type: application/json; charset=utf-8');

$query = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
$noCache = isset($_GET['nocache']) && $_GET['nocache'] === '1';
if ($query === '' || mb_strlen($query) < 3) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Parametro q invalido']);
    exit;
}

$cacheFile = __DIR__ . '/geocode-cache.json';
$cacheSuccessTtlSeconds = 60 * 60 * 24 * 45; // 45 dias
$cacheFailureTtlSeconds = 60 * 60 * 6; // 6 horas para no congelar errores de geocoding
$cache = [];

if (file_exists($cacheFile)) {
    $raw = @file_get_contents($cacheFile);
    $parsed = json_decode((string)$raw, true);
    if (is_array($parsed)) $cache = $parsed;
}

$key = mb_strtolower($query, 'UTF-8');
if (!$noCache && isset($cache[$key]) && is_array($cache[$key])) {
    $entry = $cache[$key];
    $ts = isset($entry['ts']) ? (int)$entry['ts'] : 0;
    $isSuccess = (bool)($entry['success'] ?? false);
    $ttl = $isSuccess ? $cacheSuccessTtlSeconds : $cacheFailureTtlSeconds;
    if ($ts > 0 && (time() - $ts) <= $ttl) {
        echo json_encode([
            'success' => $isSuccess,
            'coords' => $entry['coords'] ?? null,
            'source' => 'cache'
        ]);
        exit;
    }
}

$normalizeAddress = static function (string $addr): string {
    $a = trim($addr);
    $a = preg_replace('/\bC[ÓO]D(?:IGO)?\.?\s*P(?:OSTAL)?\.?\b/iu', ' ', $a);
    $a = preg_replace('/\bFRACC(?:IONAMIENTO)?\.?\b/iu', ' ', $a);
    $a = preg_replace('/\bCOL(?:ONIA)?\.?\b/iu', ' ', $a);
    $a = preg_replace('/\bMZ\.?\b/iu', ' ', $a);
    $a = preg_replace('/\bLT\.?\b/iu', ' ', $a);
    $a = preg_replace('/\bSON\.?\b/iu', 'Sonora', $a);
    $a = preg_replace('/C\.?\s*P\.?\s*\d{4,5}/iu', ' ', $a);
    $a = preg_replace('/\b\d{5}\b/u', ' ', $a);
    $a = preg_replace('/\bNo\.?\s*\d+\b/iu', ' ', $a);
    $a = preg_replace('/#\s*\d+\b/u', ' ', $a);
    $a = preg_replace('/\s*,\s*/u', ', ', $a);
    $a = preg_replace('/\s{2,}/u', ' ', $a);
    $a = trim((string)$a, " ,.");
    return $a;
};

$extractAddressParts = static function (string $addr): array {
    $parts = array_values(array_filter(array_map('trim', explode(',', $addr)), static fn($p) => $p !== ''));
    $cleanPart = static function (string $part): string {
        $part = preg_replace('/\bFRACC(?:IONAMIENTO)?\.?\b/iu', ' ', $part);
        $part = preg_replace('/\bCOL(?:ONIA)?\.?\b/iu', ' ', $part);
        $part = preg_replace('/\bC[ÓO]D(?:IGO)?\.?\s*P(?:OSTAL)?\.?\s*\d{4,5}\b/iu', ' ', $part);
        $part = preg_replace('/\s{2,}/u', ' ', $part);
        return trim((string)$part, " ,.");
    };

    $street = isset($parts[0]) ? $cleanPart($parts[0]) : '';
    $neighborhood = isset($parts[1]) ? $cleanPart($parts[1]) : '';
    return [$street, $neighborhood];
};

$extractCityState = static function (string $addr): ?string {
    $lower = mb_strtolower($addr, 'UTF-8');
    $map = [
        ['guaymas', 'sonora'],
        ['hermosillo', 'sonora'],
        ['empalme', 'sonora'],
        ['san carlos', 'sonora'],
        ['obregon', 'sonora'],
        ['nogales', 'sonora'],
        ['navojoa', 'sonora'],
    ];
    foreach ($map as $row) {
        if (mb_strpos($lower, $row[0]) !== false) {
            return $row[0] . ', ' . $row[1] . ', mexico';
        }
    }
    return null;
};

$requestNominatim = static function (string $q): array {
    $url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=mx&q=' . rawurlencode($q);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 7,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Accept-Language: es',
            'User-Agent: BonifaciosAdmin/1.0 (admin@bonifaciossancarlos.com)',
        ],
    ]);
    $response = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);
    return [$response, $httpCode, $curlErr];
};

$variants = [];
$clean = $normalizeAddress($query);
$postalCode = null;
if (preg_match('/\b(\d{5})\b/u', $query, $m)) $postalCode = $m[1];
[$streetPart, $neighborhoodPart] = $extractAddressParts($clean !== '' ? $clean : $query);
$variants[] = $query;
if ($clean !== '' && $clean !== $query) $variants[] = $clean;
if ($clean !== '') $variants[] = $clean . ', mexico';
$cityState = $extractCityState($query);
if ($cityState) $variants[] = $cityState;
if ($cityState && $streetPart !== '') $variants[] = $streetPart . ', ' . $cityState;
if ($cityState && $neighborhoodPart !== '') $variants[] = $neighborhoodPart . ', ' . $cityState;
if ($cityState && $streetPart !== '' && $neighborhoodPart !== '') $variants[] = $streetPart . ', ' . $neighborhoodPart . ', ' . $cityState;
if ($cityState && $postalCode) $variants[] = $postalCode . ', ' . $cityState;
$variants = array_values(array_unique(array_filter($variants)));

$coords = null;
$lastError = null;
$lastStatus = 0;

foreach ($variants as $variant) {
    [$response, $httpCode, $curlErr] = $requestNominatim($variant);
    $lastStatus = $httpCode;

    if ($response === false || $httpCode === 0) {
        $lastError = $curlErr ?: 'Fallo de conexion geocoder';
        continue;
    }

    if ($httpCode === 429) {
        http_response_code(429);
        $cache[$key] = ['success' => false, 'coords' => null, 'ts' => time()];
        @file_put_contents($cacheFile, json_encode($cache, JSON_UNESCAPED_UNICODE));
        echo json_encode(['success' => false, 'error' => 'Geocoder rate limited', 'rate_limited' => true]);
        exit;
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        $lastError = 'Geocoder upstream error';
        continue;
    }

    $data = json_decode($response, true);
    if (is_array($data) && isset($data[0]['lat'], $data[0]['lon'])) {
        $coords = [floatval($data[0]['lat']), floatval($data[0]['lon'])];
        break;
    }
}

if ($coords === null && $lastError && $lastStatus === 0) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Fallo de conexion geocoder', 'detail' => $lastError]);
    exit;
}

$ok = $coords !== null;
$cache[$key] = ['success' => $ok, 'coords' => $coords, 'ts' => time()];
@file_put_contents($cacheFile, json_encode($cache, JSON_UNESCAPED_UNICODE));

echo json_encode([
    'success' => $ok,
    'coords' => $coords,
    'source' => 'nominatim'
]);
