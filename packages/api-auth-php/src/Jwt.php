<?php
namespace App;

use Firebase\JWT\JWT as FirebaseJWT;
use Firebase\JWT\Key;

class Jwt
{
    public static function generate(array $payload): string
    {
        $secret = $_ENV['JWT_SECRET'] ?? 'secret';
        $ttl = $_ENV['JWT_EXPIRE_IN'] ?? '24h';
        $exp = time() + self::parseTtl($ttl);
        $payload['exp'] = $exp;
        return FirebaseJWT::encode($payload, $secret, 'HS256');
    }

    public static function authenticate(): ?array
    {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (!preg_match('/Bearer\s+(.*)/i', $auth, $m)) {
            return null;
        }
        $token = $m[1];
        try {
            $secret = $_ENV['JWT_SECRET'] ?? 'secret';
            $decoded = FirebaseJWT::decode($token, new Key($secret, 'HS256'));
            return (array)$decoded;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private static function parseTtl(string $ttl): int
    {
        if (preg_match('/^(\d+)h$/', $ttl, $m)) return (int)$m[1] * 3600;
        if (preg_match('/^(\d+)m$/', $ttl, $m)) return (int)$m[1] * 60;
        if (preg_match('/^(\d+)s$/', $ttl, $m)) return (int)$m[1];
        return 24 * 3600;
    }
}
