<?php
namespace App\Models;

use PDO;

class Report
{
    public static function findAll(PDO $db): array
    {
        $stmt = $db->prepare('
            SELECT id, user_id, title, description, latitude, longitude, status, 
                   area_m2, budget, company, photos, created_at, started_at, completed_at, updated_at
            FROM reports 
            ORDER BY created_at DESC
        ');
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map(function ($row) {
            $row['photos'] = isset($row['photos']) ? json_decode($row['photos'], true) ?? [] : [];
            return $row;
        }, $rows);
    }

    public static function findById(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare('
            SELECT id, user_id, title, description, latitude, longitude, status, 
                   area_m2, budget, company, photos, created_at, started_at, completed_at, updated_at
            FROM reports 
            WHERE id = :id
        ');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $row['photos'] = isset($row['photos']) ? json_decode($row['photos'], true) ?? [] : [];
        }
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
        string $company,
        array $photos
    ): array {
        $stmt = $db->prepare('
            INSERT INTO reports (user_id, title, description, latitude, longitude, status, area_m2, budget, company, photos, created_at)
            VALUES (:user_id, :title, :description, :latitude, :longitude, :status, :area_m2, :budget, :company, :photos, NOW())
            RETURNING id, user_id, title, description, latitude, longitude, status, area_m2, budget, company, photos, created_at, started_at, completed_at
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
            'photos' => json_encode($photos),
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $row['photos'] = isset($row['photos']) ? json_decode($row['photos'], true) ?? [] : [];
        }
        return $row;
    }

    public static function updateStatus(PDO $db, int $id, string $status): bool
    {
        // Mettre à jour les dates selon le statut
        $extraFields = '';
        if ($status === 'in_progress') {
            $extraFields = ', started_at = COALESCE(started_at, NOW())';
        } elseif ($status === 'completed' || $status === 'closed') {
            $extraFields = ', started_at = COALESCE(started_at, NOW()), completed_at = COALESCE(completed_at, NOW())';
        }
        $stmt = $db->prepare("UPDATE reports SET status = :status{$extraFields}, updated_at = NOW() WHERE id = :id");
        return $stmt->execute(['status' => $status, 'id' => $id]);
    }

    public static function updateFields(PDO $db, int $id, array $fields): bool
    {
        if (empty($fields)) {
            return false;
        }
        
        // Gérer les dates de progression selon le statut
        $extraFields = '';
        if (isset($fields['status'])) {
            $status = $fields['status'];
            if ($status === 'in_progress') {
                $extraFields = ', started_at = COALESCE(started_at, NOW())';
            } elseif ($status === 'completed' || $status === 'closed') {
                $extraFields = ', started_at = COALESCE(started_at, NOW()), completed_at = COALESCE(completed_at, NOW())';
            }
        }
        
        $sets = [];
        $params = ['id' => $id];
        foreach ($fields as $key => $value) {
            $sets[] = "$key = :$key";
            $params[$key] = $key === 'photos' ? json_encode($value) : $value;
        }
        $sql = 'UPDATE reports SET ' . implode(', ', $sets) . $extraFields . ', updated_at = NOW() WHERE id = :id';
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
