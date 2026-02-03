<?php
namespace App\Models;

use PDO;

class Report
{
    public static function findAll(PDO $db): array
    {
        $stmt = $db->prepare('
            SELECT id, user_id, title, description, latitude, longitude, status, 
                   area_m2, budget, company, created_at 
            FROM reports 
            ORDER BY created_at DESC
        ');
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function findById(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare('
            SELECT id, user_id, title, description, latitude, longitude, status, 
                   area_m2, budget, company, created_at 
            FROM reports 
            WHERE id = :id
        ');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public static function create(
        PDO $db,
        int $userId,
        string $title,
        string $description,
        float $latitude,
        float $longitude,
        string $status,
        float $areaMm2,
        float $budget,
        string $company
    ): array {
        $stmt = $db->prepare('
            INSERT INTO reports (user_id, title, description, latitude, longitude, status, area_m2, budget, company, created_at)
            VALUES (:user_id, :title, :description, :latitude, :longitude, :status, :area_m2, :budget, :company, NOW())
            RETURNING id, user_id, title, description, latitude, longitude, status, area_m2, budget, company, created_at
        ');
        $stmt->execute([
            'user_id' => $userId,
            'title' => $title,
            'description' => $description,
            'latitude' => $latitude,
            'longitude' => $longitude,
            'status' => $status,
            'area_m2' => $areaMm2,
            'budget' => $budget,
            'company' => $company,
        ]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public static function updateStatus(PDO $db, int $id, string $status): bool
    {
        $stmt = $db->prepare('UPDATE reports SET status = :status, updated_at = NOW() WHERE id = :id');
        return $stmt->execute(['status' => $status, 'id' => $id]);
    }

    public static function updateFields(PDO $db, int $id, array $fields): bool
    {
        if (empty($fields)) {
            return false;
        }
        $sets = [];
        $params = ['id' => $id];
        foreach ($fields as $key => $value) {
            $sets[] = "$key = :$key";
            $params[$key] = $value;
        }
        $sql = 'UPDATE reports SET ' . implode(', ', $sets) . ', updated_at = NOW() WHERE id = :id';
        $stmt = $db->prepare($sql);
        return $stmt->execute($params);
    }

    public static function delete(PDO $db, int $id): bool
    {
        $stmt = $db->prepare('DELETE FROM reports WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    public static function getStatistics(PDO $db): array
    {
        $stmt = $db->prepare('
            SELECT 
                COUNT(*) as total_reports,
                SUM(area_m2) as total_area,
                SUM(budget) as total_budget,
                COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completed_count
            FROM reports
        ');
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
