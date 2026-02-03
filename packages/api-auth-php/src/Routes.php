<?php
namespace App;

use App\Controllers\AuthController;
use App\Controllers\ReportController;

class Routes
{
    public static function register(Router $router): void
    {
        $auth = new AuthController();
        $report = new ReportController();

        // Authentication routes
        $router->post('/api/auth/register', fn() => $auth->register());
        $router->post('/api/auth/login', fn() => $auth->login());
        $router->get('/api/auth/profile', fn() => $auth->profile());
        $router->post('/api/admin/reset-attempts', fn() => $auth->resetAttempts());
        $router->get('/api/admin/users', fn() => $auth->listUsers());
        $router->post('/api/admin/users', fn() => $auth->createUser());
        $router->post('/api/admin/sync-firebase', fn() => $auth->syncFirebase());
        $router->post('/api/admin/push-to-firebase', fn() => $auth->pushToFirebase());

        // Report routes (public read, authenticated write)
        $router->get('/api/reports', fn() => $report->getAll());
        $router->post('/api/reports', fn() => $report->create());
        $router->get('/api/reports/statistics', fn() => $report->getStatistics());
        $router->post('/api/admin/reports/update', fn() => $report->updateAdmin());
    }
}
