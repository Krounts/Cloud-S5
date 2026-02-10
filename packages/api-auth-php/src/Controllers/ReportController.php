<?php
namespace App\Controllers;

use App\Database;
use App\Jwt;
use App\Models\Report;
use App\Models\Settings;

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
        // Do not set severity by default on creation. Manager assigns severity later.
        $severityLevel = array_key_exists('severity_level', $input) ? (int)$input['severity_level'] : null;
        // Budget will be computed when manager assigns severity. Keep null/0 for now.
        $budget = array_key_exists('budget', $input) ? (float)$input['budget'] : 0;
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

        // Do NOT compute budget now. Budget is computed when manager assigns severity.
        $report = Report::create($db, $userId, $title, $description, $latitude, $longitude, $status, $areaMm2, $budget, $severityLevel, $company, $photos);

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
        if (array_key_exists('severity_level', $input)) $fields['severity_level'] = (int)$input['severity_level'];
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

        // Load current report to validate allowed changes
        $dbTmp = Database::getConnection();
        $current = Report::findById($dbTmp, $id) ?? [];

        // Manager can assign severity once. If severity already set, forbid changing it again.
        if (array_key_exists('severity_level', $input) && $current['severity_level'] !== null) {
            http_response_code(400);
            echo json_encode(['error' => 'La gravité a déjà été attribuée et ne peut pas être modifiée']);
            return;
        }
        $area = $fields['area_m2'] ?? $current['area_m2'] ?? 0;
        $severity = $fields['severity_level'] ?? $current['severity_level'] ?? 1;

        $shouldRecompute = false;
        if (!array_key_exists('budget', $fields)) {
            $shouldRecompute = true;
        } else {
            // Budget was provided in payload. If area or severity changed and the provided budget
            // equals the current stored budget (no intentional override), recompute.
            $providedBudget = (float)$fields['budget'];
            $currentBudget = (float)($current['budget'] ?? 0);
            if ((array_key_exists('severity_level', $fields) || array_key_exists('area_m2', $fields)) && abs($providedBudget - $currentBudget) < 0.01) {
                $shouldRecompute = true;
            }
        }

        if ($shouldRecompute && (float)$area > 0) {
            $price = Settings::getPricePerM2($dbTmp);
            $fields['budget'] = round($price * max(1, (int)$severity) * (float)$area, 2);
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
