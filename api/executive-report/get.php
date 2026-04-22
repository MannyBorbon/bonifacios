<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

// Check if sort_order column exists
$hasSortOrder = false;
try {
    $colCheck = $conn->query("SHOW COLUMNS FROM employee_files LIKE 'sort_order'");
    if ($colCheck && $colCheck->num_rows > 0) {
        $hasSortOrder = true;
    } else {
        // Try to add it
        try { $conn->query("ALTER TABLE employee_files ADD COLUMN sort_order INT DEFAULT 0"); $hasSortOrder = true; } catch (Exception $e2) {}
    }
} catch (Exception $e) {}

$orderBy = $hasSortOrder ? "ORDER BY ef.sort_order ASC, ef.id DESC" : "ORDER BY ef.id DESC";

// Get all employees from employee_files, with amounts from executive_report
$sql = "SELECT 
    ef.*,
    ef.hire_date as start_date,
    ef.studies as estudios,
    ef.sueldo as daily_salary,
    COALESCE(er.main_amount, 0) as main_amount,
    COALESCE(er.secondary_amount, 0) as secondary_amount
FROM employee_files ef
LEFT JOIN executive_report er ON ef.name = er.name
$orderBy";

$result = $conn->query($sql);

$report = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Ensure start_date alias is set (hire_date)
        if (!isset($row['start_date']) && isset($row['hire_date'])) {
            $row['start_date'] = $row['hire_date'];
        }
        $report[] = $row;
    }
}

echo json_encode([
    'success' => true,
    'data' => $report
]);

$conn->close();
?>
