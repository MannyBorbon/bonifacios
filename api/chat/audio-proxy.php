<?php
// Serves audio files, converting unsupported formats (AMR, 3GP, etc.) to MP3 on demand
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

$file = isset($_GET['file']) ? basename($_GET['file']) : '';
if (!$file) {
    http_response_code(400);
    echo 'Missing file parameter';
    exit;
}

$uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/chat/';
$filePath = $uploadDir . $file;

if (!file_exists($filePath)) {
    http_response_code(404);
    echo 'File not found';
    exit;
}

$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
$browserFormats = ['mp3', 'wav', 'ogg', 'webm', 'aac', 'm4a', 'mp4', 'flac'];

// If already browser-compatible, serve directly with correct headers
if (in_array($ext, $browserFormats)) {
    $mimeMap = [
        'mp3' => 'audio/mpeg',
        'wav' => 'audio/wav',
        'ogg' => 'audio/ogg',
        'webm' => 'audio/webm',
        'aac' => 'audio/aac',
        'm4a' => 'audio/mp4',
        'mp4' => 'audio/mp4',
        'flac' => 'audio/flac'
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
$mp3Path = $uploadDir . $mp3File;

if (file_exists($mp3Path)) {
    header('Content-Type: audio/mpeg');
    header('Content-Length: ' . filesize($mp3Path));
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=86400');
    readfile($mp3Path);
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
    header('Content-Type: audio/mpeg');
    header('Content-Length: ' . filesize($mp3Path));
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=86400');
    readfile($mp3Path);
    exit;
}

// Fallback: serve original file with best-guess MIME type
// Browser probably can't play it, but at least it won't 404
$fallbackMime = [
    'amr' => 'audio/amr',
    '3gp' => 'audio/3gpp',
    '3gpp' => 'audio/3gpp',
    'wma' => 'audio/x-ms-wma',
    'opus' => 'audio/opus'
];
header('Content-Type: ' . ($fallbackMime[$ext] ?? 'application/octet-stream'));
header('Content-Length: ' . filesize($filePath));
header('Content-Disposition: attachment; filename="' . $file . '"');
readfile($filePath);
?>
