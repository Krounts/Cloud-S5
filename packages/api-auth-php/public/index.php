<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Router;
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// CORS Headers - Allow requests from development servers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$router = new Router();

// Health endpoint
$router->get('/health', function () {
    echo json_encode(['status' => 'OK', 'timestamp' => (new DateTime())->format(DateTime::ATOM)]);
});

// Auth routes
App\Routes::register($router);

$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
