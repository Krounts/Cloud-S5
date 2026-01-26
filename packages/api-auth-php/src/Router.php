<?php
namespace App;

class Router
{
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->routes['GET'][$this->normalize($path)] = $handler;
    }

    public function post(string $path, callable $handler): void
    {
        $this->routes['POST'][$this->normalize($path)] = $handler;
    }

    public function put(string $path, callable $handler): void
    {
        $this->routes['PUT'][$this->normalize($path)] = $handler;
    }

    public function dispatch(string $method, string $uri): void
    {
        $path = parse_url($uri, PHP_URL_PATH);
        $path = $this->normalize($path);
        $handler = $this->routes[$method][$path] ?? null;
        if (!$handler) {
            http_response_code(404);
            echo json_encode(['error' => 'Route not found']);
            return;
        }
        $handler();
    }

    private function normalize(string $path): string
    {
        return rtrim($path, '/') ?: '/';
    }
}
