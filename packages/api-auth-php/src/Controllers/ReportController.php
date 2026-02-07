<?php
namespace App\Controllers;

use App\Database;
use App\Jwt;
use App\Models\Report;

class ReportController
{
    public function getAll(): void
    {
        $db = Database::getConnection();
        $reports = Report::findAll($db);
        
        http_response_code(200);
        echo json_encode($reports);
    }

    public function getById(int $id): void
    {
        $db = Database::getConnection();
        $report = Report::findById($db, $id);

        if (!$report) {
            http_response_code(404);
            echo json_encode(['error' => 'Report not found']);
            return;
        }

        http_response_code(200);
        echo json_encode($report);
    }

    public function create(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        // Récupérer l'utilisateur connecté (optionnel)
        $user = Jwt::authenticate();
        $userId = $user ? (int)$user['id'] : 1; // user_id 1 = anonyme par défaut
        
        $title = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $latitude = (float)($input['latitude'] ?? 0);
        $longitude = (float)($input['longitude'] ?? 0);
        $status = trim($input['status'] ?? 'new');
        $areaMm2 = (float)($input['area_m2'] ?? 0);
        $budget = (float)($input['budget'] ?? 0);
        $company = trim($input['company'] ?? '');
        $photos = $input['photos'] ?? [];
        if (!is_array($photos)) {
            $photos = [];
        }

        if (!$title || !$latitude || !$longitude) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: title, latitude, longitude']);
            return;
        }

        $db = Database::getConnection();
        $report = Report::create($db, $userId, $title, $description, $latitude, $longitude, $status, $areaMm2, $budget, $company, $photos);

        http_response_code(201);
        echo json_encode(['message' => 'Report created successfully', 'report' => $report, 'user_id' => $userId]);
    }

    public function updateStatus(int $id): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = trim($input['status'] ?? '');

        if (!$status || !in_array($status, ['new', 'in_progress', 'completed', 'closed'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status']);
            return;
        }

        $db = Database::getConnection();
        Report::updateStatus($db, $id, $status);

        http_response_code(200);
        echo json_encode(['message' => 'Report updated successfully']);
    }

    public function updateAdmin(): void
    {
        $admin = Jwt::authenticate();
        if (!$admin || !in_array($admin['role'] ?? 'user', ['admin', 'manager'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid report id']);
            return;
        }

        $fields = [];
        if (array_key_exists('title', $input)) $fields['title'] = trim((string)$input['title']);
        if (array_key_exists('description', $input)) $fields['description'] = trim((string)$input['description']);
        if (array_key_exists('area_m2', $input)) $fields['area_m2'] = (float)$input['area_m2'];
        if (array_key_exists('budget', $input)) $fields['budget'] = (float)$input['budget'];
        if (array_key_exists('company', $input)) $fields['company'] = trim((string)$input['company']);
        if (array_key_exists('status', $input)) {
            $status = trim((string)$input['status']);
            if (!in_array($status, ['new', 'in_progress', 'completed', 'closed'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid status']);
                return;
            }
            $fields['status'] = $status;
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'No fields to update']);
            return;
        }

        $db = Database::getConnection();
        $ok = Report::updateFields($db, $id, $fields);
        if (!$ok) {
            http_response_code(400);
            echo json_encode(['error' => 'Update failed']);
            return;
        }
        $report = Report::findById($db, $id);
        http_response_code(200);
        echo json_encode(['message' => 'Report updated successfully', 'report' => $report]);
    }

    public function getStatistics(): void
    {
        $db = Database::getConnection();
        $stats = Report::getStatistics($db);

        http_response_code(200);
        echo json_encode($stats);
    }
}
