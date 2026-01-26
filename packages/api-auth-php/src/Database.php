<?php
namespace App;

use PDO;
use PDOException;

class Database
{
    public static function getConnection(): PDO
    {
        $host = $_ENV['DB_HOST'] ?? 'localhost';
        $port = (int)($_ENV['DB_PORT'] ?? 5432);
        $db = $_ENV['DB_NAME'] ?? 'cloud_user';
        $user = $_ENV['DB_USER'] ?? 'postgres';
        $pass = $_ENV['DB_PASSWORD'] ?? 'postgres123';

        $dsn = "pgsql:host={$host};port={$port};dbname={$db}";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];
        try {
            return new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed', 'details' => $e->getMessage()]);
            exit;
        }
    }
}
