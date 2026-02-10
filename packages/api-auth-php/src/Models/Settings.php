<?php
namespace App\Models;

use PDO;

class Settings
{
    public static function get(PDO $db, string $key, $default = null)
    {
        $stmt = $db->prepare('SELECT value FROM settings WHERE key = :key LIMIT 1');
        $stmt->execute(['key' => $key]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return $default;
        return $row['value'];
    }

    public static function getPricePerM2(PDO $db): float
    {
        $val = self::get($db, 'price_per_m2', '0');
        return (float)$val;
    }

    public static function set(PDO $db, string $key, string $value): bool
    {
        $stmt = $db->prepare('INSERT INTO settings (key, value, created_at, updated_at) VALUES (:key, :value, NOW(), NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()');
        return $stmt->execute(['key' => $key, 'value' => $value]);
    }
}
