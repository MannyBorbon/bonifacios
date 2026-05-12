<?php
/**
 * Exporta un documento Markdown con todas las tablas y columnas
 * de una base de datos SoftRestaurant en SQL Server.
 *
 * Uso:
 *   php export-softrestaurant-schema.php
 *   php export-softrestaurant-schema.php --server="HOST\INSTANCE" --database="softrestaurant8pro" --user="usuario" --pass="clave"
 *
 * Variables de entorno soportadas:
 *   SR_SERVER, SR_DATABASE, SR_USER, SR_PASS, SR_SCHEMA_OUTPUT
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Este script solo se puede ejecutar por CLI.\n");
    exit(1);
}

date_default_timezone_set('America/Hermosillo');

function getArgValue(array $argv, string $key): ?string
{
    foreach ($argv as $arg) {
        if (strpos($arg, $key . '=') === 0) {
            return trim(substr($arg, strlen($key) + 1), "\"'");
        }
    }
    return null;
}

function extractDefineValue(string $content, string $constantName): ?string
{
    $pattern = "/define\\(\\s*['\\\"]" . preg_quote($constantName, "/") . "['\\\"]\\s*,\\s*['\\\"](.*?)['\\\"]\\s*\\)\\s*;/i";
    if (preg_match($pattern, $content, $matches) === 1) {
        return stripcslashes($matches[1]);
    }
    return null;
}

function readFallbackConfigFromHistoricSync(): array
{
    $fallback = [
        'server' => null,
        'database' => null,
        'user' => null,
        'pass' => null,
    ];

    $syncHistoricoPath = __DIR__ . DIRECTORY_SEPARATOR . 'sync-historico.php';
    if (!is_readable($syncHistoricoPath)) {
        return $fallback;
    }

    $content = file_get_contents($syncHistoricoPath);
    if ($content === false || $content === '') {
        return $fallback;
    }

    $fallback['server'] = extractDefineValue($content, 'SR_SERVER');
    $fallback['database'] = extractDefineValue($content, 'SR_DATABASE');
    $fallback['user'] = extractDefineValue($content, 'SR_USER');
    $fallback['pass'] = extractDefineValue($content, 'SR_PASS');

    return $fallback;
}

function readConfig(array $argv): array
{
    $defaultOutput = __DIR__ . DIRECTORY_SEPARATOR . 'softrestaurant-schema-' . date('Ymd-His') . '.md';
    $fallback = readFallbackConfigFromHistoricSync();

    return [
        'server' => getArgValue($argv, '--server') ?: getenv('SR_SERVER') ?: $fallback['server'] ?: '100.84.227.35\NATIONALSOFT',
        'database' => getArgValue($argv, '--database') ?: getenv('SR_DATABASE') ?: $fallback['database'] ?: 'softrestaurant8pro',
        'user' => getArgValue($argv, '--user') ?: getenv('SR_USER') ?: $fallback['user'] ?: '',
        'pass' => getArgValue($argv, '--pass') ?: getenv('SR_PASS') ?: $fallback['pass'] ?: '',
        'output' => getArgValue($argv, '--output') ?: getenv('SR_SCHEMA_OUTPUT') ?: $defaultOutput,
    ];
}

function buildDsn(string $server, string $database): string
{
    return sprintf(
        'sqlsrv:Server=%s;Database=%s;Encrypt=no;TrustServerCertificate=yes',
        $server,
        $database
    );
}

function loadSchema(PDO $pdo): array
{
    $sql = "
        SELECT
            t.TABLE_SCHEMA,
            t.TABLE_NAME,
            c.COLUMN_NAME,
            c.ORDINAL_POSITION,
            c.DATA_TYPE,
            c.CHARACTER_MAXIMUM_LENGTH,
            c.NUMERIC_PRECISION,
            c.NUMERIC_SCALE,
            c.IS_NULLABLE,
            c.COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.TABLES t
        INNER JOIN INFORMATION_SCHEMA.COLUMNS c
            ON c.TABLE_SCHEMA = t.TABLE_SCHEMA
           AND c.TABLE_NAME = t.TABLE_NAME
        WHERE t.TABLE_TYPE = 'BASE TABLE'
        ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME, c.ORDINAL_POSITION
    ";

    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $tables = [];
    foreach ($rows as $row) {
        $tableKey = $row['TABLE_SCHEMA'] . '.' . $row['TABLE_NAME'];
        if (!isset($tables[$tableKey])) {
            $tables[$tableKey] = [
                'schema' => (string)$row['TABLE_SCHEMA'],
                'name' => (string)$row['TABLE_NAME'],
                'columns' => [],
            ];
        }

        $tables[$tableKey]['columns'][] = [
            'name' => (string)$row['COLUMN_NAME'],
            'position' => (int)$row['ORDINAL_POSITION'],
            'type' => buildTypeLabel($row),
            'nullable' => strtoupper((string)$row['IS_NULLABLE']) === 'YES' ? 'YES' : 'NO',
            'default' => normalizeDefault($row['COLUMN_DEFAULT']),
        ];
    }

    return array_values($tables);
}

function buildTypeLabel(array $row): string
{
    $type = strtolower((string)$row['DATA_TYPE']);
    $maxLength = $row['CHARACTER_MAXIMUM_LENGTH'];
    $precision = $row['NUMERIC_PRECISION'];
    $scale = $row['NUMERIC_SCALE'];

    if ($maxLength !== null && in_array($type, ['varchar', 'nvarchar', 'char', 'nchar', 'varbinary', 'binary'], true)) {
        $len = ((int)$maxLength === -1) ? 'max' : (string)$maxLength;
        return sprintf('%s(%s)', $type, $len);
    }

    if ($precision !== null && in_array($type, ['decimal', 'numeric'], true)) {
        $sc = $scale !== null ? (int)$scale : 0;
        return sprintf('%s(%d,%d)', $type, (int)$precision, $sc);
    }

    if ($precision !== null && in_array($type, ['float', 'real'], true)) {
        return sprintf('%s(%d)', $type, (int)$precision);
    }

    return $type;
}

function normalizeDefault($value): string
{
    if ($value === null) {
        return '-';
    }

    $raw = trim((string)$value);
    if ($raw === '') {
        return '-';
    }

    return str_replace(["\r", "\n"], ' ', $raw);
}

function escapePipe(string $value): string
{
    return str_replace('|', '\\|', $value);
}

function buildMarkdown(array $config, array $tables): string
{
    $lines = [];
    $generatedAt = date('Y-m-d H:i:s');
    $totalColumns = 0;
    foreach ($tables as $table) {
        $totalColumns += count($table['columns']);
    }

    $lines[] = '# Esquema de SoftRestaurant';
    $lines[] = '';
    $lines[] = '- Servidor: `' . $config['server'] . '`';
    $lines[] = '- Base de datos: `' . $config['database'] . '`';
    $lines[] = '- Generado: `' . $generatedAt . '`';
    $lines[] = '- Total de tablas: `' . count($tables) . '`';
    $lines[] = '- Total de columnas: `' . $totalColumns . '`';
    $lines[] = '';
    $lines[] = '## Tablas';
    $lines[] = '';

    foreach ($tables as $table) {
        $qualifiedName = $table['schema'] . '.' . $table['name'];
        $anchor = strtolower($qualifiedName);
        $anchor = str_replace([' ', '.', '_'], '-', $anchor);
        $lines[] = '- [' . $qualifiedName . '](#' . $anchor . ')';
    }

    foreach ($tables as $table) {
        $qualifiedName = $table['schema'] . '.' . $table['name'];
        $lines[] = '';
        $lines[] = '## ' . $qualifiedName;
        $lines[] = '';
        $lines[] = '| # | Columna | Tipo | Nullable | Default |';
        $lines[] = '|---:|---|---|:---:|---|';

        foreach ($table['columns'] as $column) {
            $lines[] = sprintf(
                '| %d | %s | %s | %s | %s |',
                $column['position'],
                escapePipe($column['name']),
                escapePipe($column['type']),
                $column['nullable'],
                escapePipe($column['default'])
            );
        }
    }

    $lines[] = '';
    return implode(PHP_EOL, $lines);
}

try {
    $config = readConfig($argv);

    if ($config['user'] === '' || $config['pass'] === '') {
        throw new RuntimeException(
            'Faltan credenciales. Define SR_USER y SR_PASS o pasa --user y --pass.'
        );
    }

    $pdo = new PDO(
        buildDsn($config['server'], $config['database']),
        $config['user'],
        $config['pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $tables = loadSchema($pdo);
    if (count($tables) === 0) {
        throw new RuntimeException('No se encontraron tablas en la base de datos.');
    }

    $markdown = buildMarkdown($config, $tables);
    $outputPath = $config['output'];
    $outputDir = dirname($outputPath);

    if (!is_dir($outputDir)) {
        if (!mkdir($outputDir, 0775, true) && !is_dir($outputDir)) {
            throw new RuntimeException('No se pudo crear el directorio de salida: ' . $outputDir);
        }
    }

    file_put_contents($outputPath, $markdown);

    fwrite(STDOUT, "OK. Archivo generado:\n" . $outputPath . "\n");
    fwrite(STDOUT, 'Tablas detectadas: ' . count($tables) . "\n");
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
