<?php
namespace App\Controllers;

use App\Database;
use App\Jwt;
use App\Models\User;

class AuthController
{
    public function register(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
        $password = $input['password'] ?? '';
        $firstName = trim($input['firstName'] ?? '');
        $lastName = trim($input['lastName'] ?? '');

        if (!$email || strlen($password) < 8 || !$firstName || !$lastName) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
            return;
        }

        $db = Database::getConnection();
        $existing = User::findByEmail($db, $email);
        if ($existing) {
            http_response_code(400);
            echo json_encode(['error' => 'User already exists']);
            return;
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $user = User::create($db, $email, $hash, $firstName, $lastName, 'user');
        $token = Jwt::generate(['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role']]);

        http_response_code(201);
        echo json_encode(['message' => 'User registered successfully', 'user' => $user, 'token' => $token]);
    }

    public function login(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
        $password = $input['password'] ?? '';

        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
            return;
        }

        $db = Database::getConnection();
        $user = User::findByEmail($db, $email);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
            return;
        }

        if ($user['is_locked']) {
            http_response_code(401);
            echo json_encode(['error' => 'Account is locked']);
            return;
        }

        if (!password_verify($password, $user['password_hash'])) {
            $newAttempts = (int)($user['failed_login_attempts'] ?? 0) + 1;
            $max = (int)($_ENV['SESSION_MAX_ATTEMPTS'] ?? 3);
            if ($newAttempts >= $max) {
                User::lock($db, (int)$user['id']);
                http_response_code(401);
                echo json_encode(['error' => 'Account locked due to too many failed attempts']);
                return;
            }
            User::updateFailedAttempts($db, (int)$user['id'], $newAttempts);
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
            return;
        }

        User::resetFailedAttempts($db, (int)$user['id']);
        $token = Jwt::generate(['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role']]);
        echo json_encode(['message' => 'Login successful', 'user' => [
            'id' => $user['id'], 'email' => $user['email'], 'firstName' => $user['first_name'], 'lastName' => $user['last_name'], 'role' => $user['role']
        ], 'token' => $token]);
    }

    public function profile(): void
    {
        $user = Jwt::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $db = Database::getConnection();
        $data = User::findById($db, (int)$user['id']);
        if (!$data) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }
        echo json_encode([
            'id' => $data['id'], 'email' => $data['email'], 'firstName' => $data['first_name'], 'lastName' => $data['last_name'], 'role' => $data['role'], 'created_at' => $data['created_at']
        ]);
    }

    public function resetAttempts(): void
    {
        $admin = Jwt::authenticate();
        if (!$admin || !in_array($admin['role'] ?? 'user', ['admin', 'manager'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = (int)($input['userId'] ?? 0);
        if ($userId <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid userId']);
            return;
        }
        $db = Database::getConnection();
        User::unlock($db, $userId);
        echo json_encode(['message' => 'User unlocked successfully']);
    }

    public function listUsers(): void
    {
        $admin = Jwt::authenticate();
        if (!$admin || !in_array($admin['role'] ?? 'user', ['admin', 'manager'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }
        $locked = null;
        if (isset($_GET['locked'])) {
            $locked = $_GET['locked'] === 'true' || $_GET['locked'] === '1';
        }
        $db = Database::getConnection();
        $users = User::findAll($db, $locked);
        echo json_encode($users);
    }

    public function createUser(): void
    {
        $admin = Jwt::authenticate();
        if (!$admin || !in_array($admin['role'] ?? 'user', ['admin', 'manager'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
        $password = $input['password'] ?? '';
        $firstName = trim($input['firstName'] ?? '');
        $lastName = trim($input['lastName'] ?? '');
        $role = trim($input['role'] ?? 'user');

        if (!$email || strlen($password) < 8 || !$firstName || !$lastName || !in_array($role, ['user', 'manager', 'admin'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input']);
            return;
        }

        $db = Database::getConnection();
        $existing = User::findByEmail($db, $email);
        if ($existing) {
            http_response_code(400);
            echo json_encode(['error' => 'User already exists']);
            return;
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $user = User::create($db, $email, $hash, $firstName, $lastName, $role);
        http_response_code(201);
        echo json_encode(['message' => 'User created successfully', 'user' => $user]);
    }

    public function syncFirebase(): void
    {
        $admin = Jwt::authenticate();
        if (!$admin || !in_array($admin['role'] ?? 'user', ['admin', 'manager'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            // Load Firebase credentials
            $credentialsPath = __DIR__ . '/../../firebase-config.json';
            if (!file_exists($credentialsPath)) {
                http_response_code(200);
                echo json_encode(['message' => 'Firebase credentials not found', 'imported' => 0]);
                return;
            }

            $credentials = json_decode(file_get_contents($credentialsPath), true);
            $projectId = $credentials['project_id'] ?? '';
            
            if (!$projectId) {
                http_response_code(200);
                echo json_encode(['message' => 'Invalid Firebase credentials', 'imported' => 0]);
                return;
            }

            $db = Database::getConnection();
            $imported = 0;

            // Get Firebase ID token using service account
            $token = $this->getFirebaseToken($credentials);
            if (!$token) {
                http_response_code(200);
                echo json_encode(['message' => 'Failed to authenticate with Firebase', 'imported' => 0]);
                return;
            }

            // Fetch reports from Firestore REST API
            $url = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents/reports";
            $client = new \GuzzleHttp\Client();
            
            try {
                $response = $client->get($url, [
                    'headers' => [
                        'Authorization' => "Bearer {$token}",
                        'Content-Type' => 'application/json'
                    ]
                ]);

                $data = json_decode($response->getBody(), true);
                $documents = $data['documents'] ?? [];

                foreach ($documents as $doc) {
                    $fields = $doc['fields'] ?? [];
                    
                    // Extract field values (Firestore format)
                    $title = $fields['title']['stringValue'] ?? ($fields['title']['stringValue'] ?? 'Sans titre');
                    $description = $fields['description']['stringValue'] ?? '';
                    $latitude = (float)($fields['latitude']['doubleValue'] ?? $fields['lat']['doubleValue'] ?? 0);
                    $longitude = (float)($fields['longitude']['doubleValue'] ?? $fields['lng']['doubleValue'] ?? 0);
                    $status = $fields['status']['stringValue'] ?? 'new';
                    $area_m2 = (float)($fields['area_m2']['doubleValue'] ?? $fields['area']['doubleValue'] ?? 0);
                    $budget = (float)($fields['budget']['doubleValue'] ?? 0);
                    $company = $fields['company']['stringValue'] ?? 'Non renseigné';

                    // Validate required fields
                    if (!$title || !is_numeric($latitude) || !is_numeric($longitude)) {
                        continue;
                    }

                    // Check if report already exists
                    $stmt = $db->prepare('
                        SELECT id FROM reports 
                        WHERE title = ? AND latitude = ? AND longitude = ? 
                        LIMIT 1
                    ');
                    $stmt->execute([$title, $latitude, $longitude]);
                    $existing = $stmt->fetch();

                    if ($existing) {
                        continue; // Skip if already imported
                    }

                    // Insert report
                    $stmt = $db->prepare('
                        INSERT INTO reports (user_id, title, description, latitude, longitude, status, area_m2, budget, company, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ');
                    
                    $stmt->execute([
                        1, // admin user
                        $title,
                        $description,
                        $latitude,
                        $longitude,
                        in_array($status, ['new', 'in_progress', 'completed', 'closed']) ? $status : 'new',
                        $area_m2,
                        $budget,
                        $company
                    ]);

                    $imported++;
                }
            } catch (\Exception $e) {
                error_log('Firestore API error: ' . $e->getMessage());
            }

            http_response_code(200);
            echo json_encode([
                'message' => 'Firebase sync completed',
                'imported' => $imported,
                'status' => 'success'
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Sync failed: ' . $e->getMessage()]);
        }
    }

    private function getFirebaseToken(array $credentials): ?string
    {
        try {
            $now = time();
            $expire = $now + 3600;

            $header = [
                'alg' => 'RS256',
                'typ' => 'JWT',
                'kid' => $credentials['private_key_id']
            ];

            $payload = [
                'iss' => $credentials['client_email'],
                'scope' => 'https://www.googleapis.com/auth/cloud-platform',
                'aud' => 'https://oauth2.googleapis.com/token',
                'exp' => $expire,
                'iat' => $now
            ];

            $headerEncoded = $this->base64UrlEncode(json_encode($header));
            $payloadEncoded = $this->base64UrlEncode(json_encode($payload));
            $signatureInput = $headerEncoded . '.' . $payloadEncoded;

            $privateKey = $credentials['private_key'];
            openssl_sign($signatureInput, $signature, $privateKey, 'SHA256');
            $signatureEncoded = $this->base64UrlEncode($signature);

            $jwt = $signatureInput . '.' . $signatureEncoded;

            // Exchange JWT for access token
            $client = new \GuzzleHttp\Client();
            $response = $client->post('https://oauth2.googleapis.com/token', [
                'form_params' => [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $jwt
                ]
            ]);

            $data = json_decode($response->getBody(), true);
            return $data['access_token'] ?? null;
        } catch (\Exception $e) {
            error_log('Token generation error: ' . $e->getMessage());
            return null;
        }
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public function pushToFirebase(): void
    {
        $admin = Jwt::authenticate();
        if (!$admin || !in_array($admin['role'] ?? 'user', ['admin', 'manager'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        try {
            // Load Firebase credentials
            $credentialsPath = __DIR__ . '/../../firebase-config.json';
            if (!file_exists($credentialsPath)) {
                http_response_code(200);
                echo json_encode(['message' => 'Firebase credentials not found', 'pushed' => 0]);
                return;
            }

            $credentials = json_decode(file_get_contents($credentialsPath), true);
            $projectId = $credentials['project_id'] ?? '';
            
            if (!$projectId) {
                http_response_code(200);
                echo json_encode(['message' => 'Invalid Firebase credentials', 'pushed' => 0]);
                return;
            }

            $db = Database::getConnection();
            $pushed = 0;

            // Get Firebase access token
            $token = $this->getFirebaseToken($credentials);
            if (!$token) {
                http_response_code(200);
                echo json_encode(['message' => 'Failed to authenticate with Firebase', 'pushed' => 0]);
                return;
            }

            // Get all reports from PostgreSQL
            $stmt = $db->query('
                SELECT id, user_id, title, description, latitude, longitude, status, area_m2, budget, company, created_at, updated_at
                FROM reports
                ORDER BY created_at DESC
            ');
            $reports = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $client = new \GuzzleHttp\Client();
            $baseUrl = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents/reports";

            foreach ($reports as $report) {
                try {
                    // Create Firestore document (use report ID as document ID)
                    $docId = 'report_' . $report['id'];
                    $url = "{$baseUrl}/{$docId}";

                    // Convert to Firestore format
                    $firestoreDoc = [
                        'fields' => [
                            'id' => ['integerValue' => (string)$report['id']],
                            'user_id' => ['integerValue' => (string)$report['user_id']],
                            'title' => ['stringValue' => $report['title'] ?? ''],
                            'description' => ['stringValue' => $report['description'] ?? ''],
                            'latitude' => ['doubleValue' => (float)$report['latitude']],
                            'longitude' => ['doubleValue' => (float)$report['longitude']],
                            'status' => ['stringValue' => $report['status'] ?? 'new'],
                            'area_m2' => ['doubleValue' => (float)($report['area_m2'] ?? 0)],
                            'budget' => ['doubleValue' => (float)($report['budget'] ?? 0)],
                            'company' => ['stringValue' => $report['company'] ?? ''],
                            'created_at' => ['timestampValue' => date('c', strtotime($report['created_at']))],
                            'updated_at' => ['timestampValue' => date('c', strtotime($report['updated_at'] ?? $report['created_at']))]
                        ]
                    ];

                    // Use PATCH to create or update
                    $response = $client->patch($url, [
                        'headers' => [
                            'Authorization' => "Bearer {$token}",
                            'Content-Type' => 'application/json'
                        ],
                        'json' => $firestoreDoc
                    ]);

                    if ($response->getStatusCode() === 200) {
                        $pushed++;
                    }
                } catch (\Exception $e) {
                    error_log('Error pushing report ' . $report['id'] . ' to Firestore: ' . $e->getMessage());
                }
            }

            http_response_code(200);
            echo json_encode([
                'message' => 'Push to Firebase completed',
                'pushed' => $pushed,
                'total' => count($reports),
                'status' => 'success'
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Push failed: ' . $e->getMessage()]);
        }
    }
}
