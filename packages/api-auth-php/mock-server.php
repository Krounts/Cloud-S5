#!/usr/bin/env php
<?php
/**
 * Mock API Server for testing report submissions
 * Simulates the PHP backend without requiring PostgreSQL
 */

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Mock database - stored in memory for this session
static $reports = [
    [
        'id' => 1,
        'title' => 'Nid de poule Ambohimanarina',
        'description' => 'Très profond',
        'latitude' => -18.8792,
        'longitude' => 47.5079,
        'area_m2' => 50,
        'budget' => 500000,
        'company' => 'SOGEA',
        'status' => 'new',
        'created_at' => '2024-01-20T10:00:00Z',
    ],
];

static $nextId = 2;

// Routes
switch ($path) {
    case '/health':
        http_response_code(200);
        echo json_encode(['status' => 'OK', 'timestamp' => gmdate('c')]);
        break;

    case '/api/reports':
        if ($method === 'GET') {
            http_response_code(200);
            echo json_encode($reports);
        } elseif ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $title = trim($input['title'] ?? '');
            $description = trim($input['description'] ?? '');
            $latitude = (float)($input['latitude'] ?? 0);
            $longitude = (float)($input['longitude'] ?? 0);
            $area_m2 = (float)($input['area_m2'] ?? 0);
            $budget = (float)($input['budget'] ?? 0);
            $company = trim($input['company'] ?? '');
            $status = trim($input['status'] ?? 'new');

            if (!$title || !$latitude || !$longitude) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields: title, latitude, longitude']);
                break;
            }

            $newReport = [
                'id' => $nextId++,
                'title' => $title,
                'description' => $description,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'area_m2' => $area_m2,
                'budget' => $budget,
                'company' => $company,
                'status' => $status,
                'created_at' => gmdate('c'),
            ];

            $reports[] = $newReport;

            http_response_code(201);
            echo json_encode([
                'message' => 'Report created successfully',
                'report' => $newReport,
            ]);
        }
        break;

    case '/api/reports/statistics':
        if ($method === 'GET') {
            $totalPoints = count($reports);
            $totalSurface = array_sum(array_column($reports, 'area_m2'));
            $totalBudget = array_sum(array_column($reports, 'budget'));
            $completed = count(array_filter($reports, fn($r) => $r['status'] === 'completed'));
            $progress = $totalPoints > 0 ? round(($completed / $totalPoints) * 100) : 0;

            http_response_code(200);
            echo json_encode([
                'total_points' => $totalPoints,
                'total_surface' => $totalSurface,
                'total_budget' => $totalBudget,
                'completed_points' => $completed,
                'progress_percentage' => $progress,
            ]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Route not found']);
        break;
}
