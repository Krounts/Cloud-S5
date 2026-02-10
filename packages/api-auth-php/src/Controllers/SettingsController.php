<?php
namespace App\Controllers;

use App\Database;
use App\Jwt;
use App\Models\Settings;

class SettingsController
{
    public function getPublic(): void
    {
        $db = Database::getConnection();
        $price = Settings::getPricePerM2($db);
        http_response_code(200);
        echo json_encode(['price_per_m2' => (float)$price]);
    }

    public function update(): void
    {
        $admin = Jwt::authenticate();
        if (!$admin || !in_array($admin['role'] ?? 'user', ['admin', 'manager'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        if (!array_key_exists('price_per_m2', $input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing price_per_m2']);
            return;
        }
        $price = (float)$input['price_per_m2'];
        $db = Database::getConnection();
        $ok = Settings::set($db, 'price_per_m2', (string)$price);
        if (!$ok) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save setting']);
            return;
        }
        http_response_code(200);
        echo json_encode(['message' => 'Setting updated', 'price_per_m2' => $price]);
    }
}
