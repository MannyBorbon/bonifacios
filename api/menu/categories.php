<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once '../config/database.php';

// No auth required - public endpoint
$conn = getConnection();

$type = isset($_GET['type']) ? $_GET['type'] : 'menu';

// Get categories
$stmt = $conn->prepare("SELECT * FROM menu_categories WHERE type = ? AND is_active = 1 ORDER BY sort_order ASC");
$stmt->bind_param("s", $type);
$stmt->execute();
$catResult = $stmt->get_result();

$categories = [];
while ($cat = $catResult->fetch_assoc()) {
    // Get items for this category
    $itemStmt = $conn->prepare("SELECT * FROM menu_items WHERE category_id = ? AND is_active = 1 ORDER BY sort_order ASC");
    $itemStmt->bind_param("i", $cat['id']);
    $itemStmt->execute();
    $itemResult = $itemStmt->get_result();

    $items = [];
    while ($item = $itemResult->fetch_assoc()) {
        $items[] = [
            'id' => (int)$item['id'],
            'name' => $item['name'],
            'desc' => $item['description'],
            'price' => (float)$item['price'],
            'unit' => $item['unit'],
            'image' => $item['image_url']
        ];
    }

    $categories[] = [
        'id' => $cat['slug'],
        'icon' => $cat['icon'],
        'label' => $cat['label'],
        'description' => $cat['description'],
        'items' => $items
    ];
}

echo json_encode([
    'success' => true,
    'categories' => $categories
]);

$conn->close();
?>
