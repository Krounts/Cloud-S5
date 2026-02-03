<?php
$password = 'manager123';
$hash = password_hash($password, PASSWORD_BCRYPT);
echo "Hash: $hash\n";
echo "Verify: " . (password_verify($password, $hash) ? 'OK' : 'FAILED') . "\n";
