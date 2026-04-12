<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

// Get current user's role
$roleStmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
$roleStmt->bind_param("i", $userId);
$roleStmt->execute();
$roleResult = $roleStmt->get_result()->fetch_assoc();
$isAdmin = ($roleResult && $roleResult['role'] === 'administrador');

// Get all active users except current user
$sql = "
    SELECT 
        u.id,
        u.full_name,
        u.username,
        u.role,
        u.profile_photo,
        MAX(CASE 
            WHEN us.is_active = TRUE 
            AND us.ended_at IS NULL 
            AND (us.last_activity IS NULL OR us.last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE))
            THEN 1 ELSE 0 
        END) as is_online,
        MAX(us.last_activity) as last_activity
    FROM users u
    LEFT JOIN user_sessions us ON us.user_id = u.id
    WHERE u.id != ? AND u.is_active = TRUE
    GROUP BY u.id, u.full_name, u.username, u.role, u.profile_photo
    ORDER BY is_online DESC, u.full_name ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

$users = [];
while ($row = $result->fetch_assoc()) {
    $user = [
        'id' => (int)$row['id'],
        'full_name' => $row['full_name'],
        'username' => $row['username'],
        'role' => $row['role'],
        'profile_photo' => $row['profile_photo'],
    ];
    // Only include online status for admin users
    if ($isAdmin) {
        $user['is_online'] = (bool)$row['is_online'];
        $user['last_activity'] = $row['last_activity'];
    }
    $users[] = $user;
}

echo json_encode([
    'success' => true, 
    'users' => $users,
    'is_admin' => $isAdmin
]);
$conn->close();
?>
