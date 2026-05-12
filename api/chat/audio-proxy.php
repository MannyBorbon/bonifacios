<?php
/**
 * Sirve audio del chat con conversión opcional. Sin database.php para no forzar Content-Type: JSON.
 */
require_once __DIR__ . '/../config/env.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Method not allowed';
    exit;
}

$defaultOrigin = getenv('APP_PRIMARY_DOMAIN') ?: 'https://bonifaciossancarlos.com';
$allowedOrigins = array_filter(array_map('trim', explode(',', getenv('CORS_ALLOWED_ORIGINS') ?: $defaultOrigin)));
if (!in_array($defaultOrigin, $allowedOrigins, true)) {
    $allowedOrigins[] = $defaultOrigin;
}
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: GET');

$file = isset($_GET['file']) ? basename((string) $_GET['file']) : '';
if ($file === '' || !preg_match('/^[a-zA-Z0-9._\-]+$/', $file)) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Invalid file parameter';
    exit;
}

$uploadDir = null;
$candidates = [
    realpath(__DIR__ . '/../../uploads/chat'),
    !empty($_SERVER['DOCUMENT_ROOT']) ? realpath(rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') . '/uploads/chat') : false,
];
foreach ($candidates as $d) {
    if ($d !== false && $d !== '') {
        $uploadDir = $d;
        break;
    }
}

if ($uploadDir === null) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Upload directory not available';
    exit;
}

$filePath = $uploadDir . DIRECTORY_SEPARATOR . $file;
$resolved = realpath($filePath);
if ($resolved === false || strpos($resolved, $uploadDir) !== 0 || !is_file($resolved)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'File not found';
    exit;
}
$filePath = $resolved;

$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
$browserFormats = ['mp3', 'wav', 'ogg', 'webm', 'aac', 'm4a', 'mp4', 'flac'];

// If already browser-compatible, serve directly with correct headers
if (in_array($ext, $browserFormats, true)) {
    $mimeMap = [
        'mp3' => 'audio/mpeg',
        'wav' => 'audio/wav',
        'ogg' => 'audio/ogg',
        'webm' => 'audio/webm',
        'aac' => 'audio/aac',
        'm4a' => 'audio/mp4',
        'mp4' => 'audio/mp4',
        'flac' => 'audio/flac',
    ];
    header('Content-Type: ' . ($mimeMap[$ext] ?? 'audio/mpeg'));
    header('Content-Length: ' . filesize($filePath));
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=86400');
    readfile($filePath);
    exit;
}

// Non-browser format: check if we already have a converted MP3
$baseName = pathinfo($file, PATHINFO_FILENAME);
$mp3File = $baseName . '_converted.mp3';
$mp3Path = $uploadDir . DIRECTORY_SEPARATOR . $mp3File;
$mp3Resolved = realpath($mp3Path);
if ($mp3Resolved !== false && strpos($mp3Resolved, $uploadDir) === 0 && is_file($mp3Resolved)) {
    header('Content-Type: audio/mpeg');
    header('Content-Length: ' . filesize($mp3Resolved));
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=86400');
    readfile($mp3Resolved);
    exit;
}

// Try converting with ffmpeg
$ffmpegPaths = ['ffmpeg', '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
$converted = false;

foreach ($ffmpegPaths as $ffmpeg) {
    $cmd = $ffmpeg . ' -i ' . escapeshellarg($filePath) . ' -acodec libmp3lame -ab 128k -y ' . escapeshellarg($mp3Path) . ' 2>&1';
    @exec($cmd, $output, $returnCode);
    if ($returnCode === 0 && file_exists($mp3Path) && filesize($mp3Path) > 0) {
        $converted = true;
        break;
    }
}

// Try avconv as alternative
if (!$converted) {
    $cmd = 'avconv -i ' . escapeshellarg($filePath) . ' -acodec libmp3lame -ab 128k -y ' . escapeshellarg($mp3Path) . ' 2>&1';
    @exec($cmd, $output, $returnCode);
    if ($returnCode === 0 && file_exists($mp3Path) && filesize($mp3Path) > 0) {
        $converted = true;
    }
}

if ($converted) {
    $out = realpath($mp3Path);
    if ($out !== false && strpos($out, $uploadDir) === 0) {
        header('Content-Type: audio/mpeg');
        header('Content-Length: ' . filesize($out));
        header('Accept-Ranges: bytes');
        header('Cache-Control: public, max-age=86400');
        readfile($out);
        exit;
    }
}

// Fallback: serve original file with best-guess MIME type
$fallbackMime = [
    'amr' => 'audio/amr',
    '3gp' => 'audio/3gpp',
    '3gpp' => 'audio/3gpp',
    'wma' => 'audio/x-ms-wma',
    'opus' => 'audio/opus',
];
header('Content-Type: ' . ($fallbackMime[$ext] ?? 'application/octet-stream'));
header('Content-Length: ' . filesize($filePath));
header('Content-Disposition: attachment; filename="' . $file . '"');
readfile($filePath);
exit;
