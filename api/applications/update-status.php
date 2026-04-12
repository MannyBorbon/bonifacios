<?php
require_once '../config/database.php';
$userId = requireAuth();

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit();
}

$id = isset($data['id']) ? intval($data['id']) : 0;
$status = isset($data['status']) ? trim($data['status']) : '';
$notes = isset($data['notes']) ? trim($data['notes']) : '';
$userId = $_SESSION['user_id'];

if (!$id || empty($status)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'ID and status required', 
        'received' => [
            'id' => $id, 
            'status' => $status,
            'raw_data' => $data
        ]
    ]);
    exit();
}

try {
    $sql = "UPDATE job_applications 
            SET status = ?, notes = ?, reviewed_by = ?, reviewed_at = NOW() 
            WHERE id = ?";
    
    $stmt = getPDO()->prepare($sql);
    $stmt->execute([$status, $notes, $userId, $id]);
    
    // If status is "Aceptada" or "accepted", create employee file and executive report entry
    if ($status === 'Aceptada' || $status === 'accepted' || $status === 'Aceptado') {
        try {
            // Get application data
            $appSql = "SELECT * FROM job_applications WHERE id = ?";
            $appStmt = getPDO()->prepare($appSql);
            $appStmt->execute([$id]);
            $application = $appStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($application) {
                $appName       = $application['name'];
                $appEmail      = $application['email']       ?? '';
                $appPhone      = $application['phone']       ?? '';
                $appAge        = $application['age']         ?? null;
                $appGender     = $application['gender']      ?? '';
                $appAddress    = $application['address']     ?? '';
                $appEstudios   = $application['estudios']    ?? $application['studies'] ?? '';
                $appExperience = $application['experience']  ?? '';
                $appCurrentJob = $application['current_job'] ?? '';
                $appPhoto      = $application['photo_url']   ?? null;
                $appPosition   = $application['position']    ?? '';

                // ── 1. Create employee_files if not exists ──────────────────
                $checkEF = getPDO()->prepare("SELECT id FROM employee_files WHERE application_id = ?");
                $checkEF->execute([$id]);
                if (!$checkEF->fetch()) {
                    $empStmt = getPDO()->prepare(
                        "INSERT INTO employee_files (application_id, name, email, phone, position, hire_date, status, created_at)
                         VALUES (?, ?, ?, ?, ?, NOW(), 'active', NOW())"
                    );
                    $empStmt->execute([$id, $appName, $appEmail, $appPhone, $appPosition]);
                }

                // ── 2. Upsert executive_report ──────────────────────────────
                $checkER = getPDO()->prepare("SELECT id FROM executive_report WHERE TRIM(LOWER(name)) = TRIM(LOWER(?)) LIMIT 1");
                $checkER->execute([$appName]);
                $existing = $checkER->fetch(PDO::FETCH_ASSOC);

                if ($existing) {
                    // Update fields that are currently empty/null
                    $updStmt = getPDO()->prepare(
                        "UPDATE executive_report SET
                            email       = COALESCE(NULLIF(email,''),       ?),
                            phone       = COALESCE(NULLIF(phone,''),       ?),
                            age         = COALESCE(age,                    ?),
                            gender      = COALESCE(NULLIF(gender,''),      ?),
                            address     = COALESCE(NULLIF(address,''),     ?),
                            estudios    = COALESCE(NULLIF(estudios,''),    ?),
                            experience  = COALESCE(NULLIF(experience,''), ?),
                            current_job = COALESCE(NULLIF(current_job,''),?),
                            photo       = COALESCE(NULLIF(photo,''),       ?),
                            status      = 'active'
                         WHERE id = ?"
                    );
                    $updStmt->execute([
                        $appEmail, $appPhone, $appAge, $appGender, $appAddress,
                        $appEstudios, $appExperience, $appCurrentJob, $appPhoto,
                        $existing['id']
                    ]);
                } else {
                    // Insert new record
                    $insStmt = getPDO()->prepare(
                        "INSERT INTO executive_report
                            (name, email, phone, age, gender, address, estudios, experience, current_job,
                             photo, main_amount, secondary_amount, application_date, start_date, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(), NULL, 'active')"
                    );
                    $insStmt->execute([
                        $appName, $appEmail, $appPhone, $appAge, $appGender,
                        $appAddress, $appEstudios, $appExperience, $appCurrentJob, $appPhoto
                    ]);
                }
            }
        } catch (Throwable $e) {
            error_log("Error creating employee file: " . $e->getMessage());
        }
    }
    
    // Log activity (silencioso si tabla no existe)
    try {
        $logSql = "INSERT INTO activity_log (user_id, action, entity_type, entity_id, description) 
                   VALUES (?, 'update_application_status', 'job_application', ?, ?)";
        $logStmt = getPDO()->prepare($logSql);
        $description = "Changed status to $status";
        $logStmt->execute([$userId, $id, $description]);
    } catch (PDOException $logErr) {}
    
    echo json_encode(['success' => true, 'message' => 'Application updated successfully']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update application', 'details' => $e->getMessage()]);
}
?>
