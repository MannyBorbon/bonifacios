<?php
// Generar hash bcrypt para la contraseña
$password = 'Filipenses4:8@';
$hash = password_hash($password, PASSWORD_BCRYPT);

header('Content-Type: application/json');
echo json_encode([
    'password' => $password,
    'hash' => $hash,
    'sql_update' => "UPDATE users SET password = '$hash';"
], JSON_PRETTY_PRINT);
?>
