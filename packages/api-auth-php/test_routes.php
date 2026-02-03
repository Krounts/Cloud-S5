<?php
require_once __DIR__ . '/vendor/autoload.php';

use App\Router;
use App\Routes;

$router = new Router();
Routes::register($router);

// Test la méthode findHandler via reflection
$reflection = new ReflectionClass($router);
$routesProperty = $reflection->getProperty('routes');
$routesProperty->setAccessible(true);
$allRoutes = $routesProperty->getValue($router);

echo "Routes disponibles:\n";
foreach ($allRoutes as $method => $routes) {
    echo "\n$method:\n";
    foreach (array_keys($routes) as $path) {
        echo "  - $path\n";
    }
}

// Tester le matching
$findHandlerMethod = $reflection->getMethod('findHandler');
$findHandlerMethod->setAccessible(true);

$testPaths = [
    'DELETE /api/reports/999',
    'GET /api/reports',
    'POST /api/reports',
];

echo "\n\nTests de matching:\n";
foreach ($testPaths as $test) {
    list($method, $path) = explode(' ', $test);
    $result = $findHandlerMethod->invoke($router, $method, $path);
    echo "$test: " . ($result ? "✓ TROUVÉ" : "✗ NON TROUVÉ") . "\n";
}
