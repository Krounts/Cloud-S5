<?php
namespace App\Controllers;

use App\Database;
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
        
        $title = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $latitude = (float)($input['latitude'] ?? 0);
        $longitude = (float)($input['longitude'] ?? 0);
        $status = trim($input['status'] ?? 'new');
        $areaMm2 = (float)($input['area_m2'] ?? 0);
        $budget = (float)($input['budget'] ?? 0);
        $company = trim($input['company'] ?? '');

        if (!$title || !$latitude || !$longitude) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: title, latitude, longitude']);
            return;
        }

        $db = Database::getConnection();
        $report = Report::create($db, 1, $title, $description, $latitude, $longitude, $status, $areaMm2, $budget, $company);

        http_response_code(201);
        echo json_encode(['message' => 'Report created successfully', 'report' => $report]);
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

    public function getStatistics(): void
    {
        $db = Database::getConnection();
        $stats = Report::getStatistics($db);

        http_response_code(200);
        echo json_encode($stats);
    }
}
