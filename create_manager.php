<?php
require '/var/www/html/vendor/autoload.php';

use App\Database;
use App\Models\User;

$db = Database::getConnection();
$email = 'manager@cloud-s5.local';
$hash = password_hash('manager123', PASSWORD_BCRYPT);

$stmt = $db->prepare('INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)');
$stmt->execute([$email, $hash, 'Manager', 'Default', 'manager']);

echo "Manager account created successfully!\n";
echo "Email: $email\n";
echo "Password: manager123\n";
echo "Hash length: " . strlen($hash) . "\n";

// Verify it works
$user = User::findByEmail($db, $email);
$verify = password_verify('manager123', $user['password_hash']);
echo "Verification: " . ($verify ? "✓ OK" : "✗ FAILED") . "\n";
