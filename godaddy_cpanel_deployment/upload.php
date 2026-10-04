<?php
// ==============================================================================
// GoDaddy Secure Image Upload Handler for Spotlight
// Place this file directly inside: public_html/spotlight.msritise.in/upload.php
// ==============================================================================

// Enable CORS for dashboard and backend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Upload-Secret');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. Authenticate with Upload Secret
$expectedSecret = 'spotlightDev@sam2005';
$headers = getallheaders();
$providedSecret = $headers['X-Upload-Secret'] ?? $headers['x-upload-secret'] ?? $_POST['secret'] ?? '';

if ($providedSecret !== $expectedSecret) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized: Invalid upload secret']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$action = $input['action'] ?? 'upload';
$baseDir = __DIR__ . '/uploads';

// 2. Handle File Deletion
if ($action === 'delete') {
    $url = $input['url'] ?? '';
    if (!$url) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing URL for deletion']);
        exit;
    }

    $parsedPath = parse_url($url, PHP_URL_PATH);
    $relPath = preg_replace('#^.*?/uploads/#', '', $parsedPath);
    $targetFile = realpath($baseDir . '/' . $relPath);

    if ($targetFile && strpos($targetFile, realpath($baseDir)) === 0 && file_exists($targetFile)) {
        unlink($targetFile);
        echo json_encode(['status' => 'success', 'message' => 'Deleted successfully']);
    } else {
        echo json_encode(['status' => 'skipped', 'message' => 'File not found or already deleted']);
    }
    exit;
}

// 3. Handle File Upload
$base64Data = $input['image'] ?? '';
$folder = trim($input['folder'] ?? 'misc', '/');

if (!$base64Data) {
    http_response_code(400);
    echo json_encode(['error' => 'No image data provided']);
    exit;
}

// Detect file type (supports any image format: jpg, png, webp, svg, gif, avif, plus pdf)
$ext = 'jpg';
if (preg_match('/^data:([a-zA-Z0-9\/\+\.\-]+);base64,/', $base64Data, $matches)) {
    $mime = strtolower($matches[1]);
    $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);

    if (strpos($mime, 'png') !== false) $ext = 'png';
    elseif (strpos($mime, 'jpeg') !== false || strpos($mime, 'jpg') !== false) $ext = 'jpg';
    elseif (strpos($mime, 'webp') !== false) $ext = 'webp';
    elseif (strpos($mime, 'svg') !== false) $ext = 'svg';
    elseif (strpos($mime, 'gif') !== false) $ext = 'gif';
    elseif (strpos($mime, 'avif') !== false) $ext = 'avif';
    elseif (strpos($mime, 'pdf') !== false) $ext = 'pdf';
}

// Security: Prevent any executable extensions
$disallowed = ['php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'cgi', 'pl', 'sh', 'exe'];
if (in_array(strtolower($ext), $disallowed)) {
    $ext = 'bin';
}

$decoded = base64_decode($base64Data);
if ($decoded === false) {
    http_response_code(400);
    echo json_encode(['error' => 'Base64 decoding failed']);
    exit;
}

// Ensure target folder exists
$targetFolder = $baseDir . '/' . $folder;
if (!is_dir($targetFolder)) {
    mkdir($targetFolder, 0755, true);
}

// Generate unique filename
$filename = bin2hex(random_bytes(16)) . '.' . $ext;
$targetPath = $targetFolder . '/' . $filename;

if (file_put_contents($targetPath, $decoded) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to write file to disk on GoDaddy']);
    exit;
}

// Return live public URL on GoDaddy
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$publicUrl = $protocol . '://' . $host . '/uploads/' . $folder . '/' . $filename;

echo json_encode([
    'status' => 'success',
    'url' => $publicUrl,
    'filename' => $filename,
    'size' => strlen($decoded)
]);
