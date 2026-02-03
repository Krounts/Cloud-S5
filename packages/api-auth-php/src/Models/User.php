<?php
namespace App\Models;

use PDO;

class User
{
    public static function findAll(PDO $db, ?bool $locked = null): array
    {
        if ($locked === null) {
            $stmt = $db->prepare('SELECT id, email, first_name, last_name, role, is_locked, failed_login_attempts, created_at FROM users ORDER BY created_at DESC');
            $stmt->execute();
        } else {
            $stmt = $db->prepare('SELECT id, email, first_name, last_name, role, is_locked, failed_login_attempts, created_at FROM users WHERE is_locked = :locked ORDER BY created_at DESC');
            $stmt->execute(['locked' => $locked]);
        }
        return $stmt->fetchAll();
    }
    public static function findByEmail(PDO $db, string $email): ?array
    {
        $stmt = $db->prepare('SELECT * FROM users WHERE email = :email');
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function findById(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare('SELECT id, email, first_name, last_name, role, is_locked, failed_login_attempts, created_at FROM users WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function create(PDO $db, string $email, string $hash, string $firstName, string $lastName, string $role): array
    {
        $stmt = $db->prepare('INSERT INTO users (email, password_hash, first_name, last_name, role, created_at) VALUES (:email, :hash, :first, :last, :role, NOW()) RETURNING id, email, first_name, last_name, role');
        $stmt->execute(['email' => $email, 'hash' => $hash, 'first' => $firstName, 'last' => $lastName, 'role' => $role]);
        return $stmt->fetch();
    }

    public static function lock(PDO $db, int $id): void
    {
        $db->prepare('UPDATE users SET is_locked = TRUE WHERE id = :id')->execute(['id' => $id]);
    }

    public static function unlock(PDO $db, int $id): void
    {
        $db->prepare('UPDATE users SET is_locked = FALSE, failed_login_attempts = 0 WHERE id = :id')->execute(['id' => $id]);
    }

    public static function updateFailedAttempts(PDO $db, int $id, int $attempts): void
    {
        $db->prepare('UPDATE users SET failed_login_attempts = :a WHERE id = :id')->execute(['a' => $attempts, 'id' => $id]);
    }

    public static function resetFailedAttempts(PDO $db, int $id): void
    {
        $db->prepare('UPDATE users SET failed_login_attempts = 0, last_login = NOW() WHERE id = :id')->execute(['id' => $id]);
    }
}
