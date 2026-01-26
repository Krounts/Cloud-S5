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
        if (!$admin || ($admin['role'] ?? 'user') !== 'admin') {
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
}
