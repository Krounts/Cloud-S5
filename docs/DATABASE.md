# Database Schema

## Entity Relationship Diagram

```
┌──────────────┐
│    USERS     │
├──────────────┤
│ id (PK)      │◄──┐
│ email (UQ)   │   │
│ password     │   │ 1:N
│ first_name   │   │
│ last_name    │   │
│ role         │   │
│ is_locked    │   │
│ failed_...   │   │
│ last_login   │   │
│ created_at   │   │
└──────────────┘   │
                   │
              ┌────┴─────────┐
              │              │
         ┌────▼──────┐   ┌───▼────────┐
         │  REPORTS  │   │  SESSIONS  │
         ├───────────┤   ├────────────┤
         │ id (PK)   │   │ id (PK)    │
         │ user_id   │   │ user_id    │
         │ title     │   │ token      │
         │ description   │ created_at │
         │ latitude  │   │ expires_at │
         │ longitude │   └────────────┘
         │ status    │
         │ area_m2   │
         │ budget    │
         │ company   │
         │ priority  │
         │ created_at│
         │ updated_at│
         └───────────┘
```

## Tables

### users

Stores user account information and authentication details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique user ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| first_name | VARCHAR(100) | | User's first name |
| last_name | VARCHAR(100) | | User's last name |
| role | VARCHAR(50) | DEFAULT 'user' | user \| manager \| admin |
| is_locked | BOOLEAN | DEFAULT false | Account lock status |
| failed_login_attempts | INTEGER | DEFAULT 0 | Failed login counter |
| last_login | TIMESTAMP | | Last successful login time |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_users_email` on email

**Constraints:**
- Email must be unique and not null
- Password hash must not be null
- Role must be one of: user, manager, admin

### reports

Stores road work reports and related metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique report ID |
| user_id | INTEGER | FOREIGN KEY, NOT NULL | Reference to reporting user |
| title | VARCHAR(255) | NOT NULL | Report title |
| description | TEXT | | Detailed description |
| latitude | DECIMAL(10,8) | NOT NULL | GPS latitude coordinate |
| longitude | DECIMAL(11,8) | NOT NULL | GPS longitude coordinate |
| status | VARCHAR(50) | DEFAULT 'new' | new \| in_progress \| completed \| closed |
| area_m2 | DECIMAL(10,2) | | Area in square meters |
| budget | DECIMAL(15,2) | | Estimated budget |
| company | VARCHAR(255) | | Responsible company name |
| priority | VARCHAR(50) | DEFAULT 'medium' | low \| medium \| high |
| created_at | TIMESTAMP | DEFAULT NOW() | Report creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_reports_user_id` on user_id
- `idx_reports_status` on status
- `idx_reports_location` on (latitude, longitude)

**Constraints:**
- user_id must reference existing user (CASCADE delete)
- Title must not be null
- Latitude and longitude must not be null
- Status must be one of: new, in_progress, completed, closed
- Priority must be one of: low, medium, high

**Relationships:**
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

### sessions

Tracks active user sessions for optional session management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique session ID |
| user_id | INTEGER | FOREIGN KEY, NOT NULL | Reference to user |
| token | VARCHAR(500) | NOT NULL | JWT token string |
| created_at | TIMESTAMP | DEFAULT NOW() | Session creation time |
| expires_at | TIMESTAMP | NOT NULL | Token expiration time |

**Indexes:**
- `idx_sessions_user_id` on user_id
- `idx_sessions_token` on token

**Relationships:**
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

## Sample Queries

### Get all reports with user information

```sql
SELECT 
  r.id, 
  r.title, 
  r.status, 
  u.email as reporter,
  r.created_at
FROM reports r
JOIN users u ON r.user_id = u.id
ORDER BY r.created_at DESC;
```

### Get reports by status

```sql
SELECT * FROM reports
WHERE status = 'in_progress'
AND area_m2 > 100
ORDER BY priority DESC, created_at DESC;
```

### Get user statistics

```sql
SELECT 
  u.email,
  COUNT(r.id) as report_count,
  SUM(r.area_m2) as total_area,
  SUM(r.budget) as total_budget
FROM users u
LEFT JOIN reports r ON u.id = r.user_id
GROUP BY u.id, u.email
ORDER BY report_count DESC;
```

### Get reports near location

```sql
SELECT * FROM reports
WHERE 
  latitude BETWEEN -18.90 AND -18.87
  AND longitude BETWEEN 47.50 AND 47.55
ORDER BY created_at DESC;
```

### Get active sessions

```sql
SELECT u.email, s.created_at, s.expires_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE expires_at > NOW()
ORDER BY expires_at DESC;
```

## Migration Strategy

### Adding new column

```sql
-- Add column with default value
ALTER TABLE reports ADD COLUMN assigned_to INTEGER;
ALTER TABLE reports ADD CONSTRAINT fk_assigned_to 
  FOREIGN KEY (assigned_to) REFERENCES users(id);

-- Add index
CREATE INDEX idx_reports_assigned_to ON reports(assigned_to);
```

### Updating enum values

```sql
-- Add new value to enum
ALTER TABLE reports ADD CONSTRAINT status_check 
  CHECK (status IN ('new', 'in_progress', 'completed', 'closed', 'on_hold'));
```

### Backup Strategy

```bash
# Full backup
pg_dump cloud_s5 > backup-full-$(date +%Y%m%d).sql

# Compressed backup
pg_dump cloud_s5 | gzip > backup-full-$(date +%Y%m%d).sql.gz

# With custom format (better compression)
pg_dump -Fc cloud_s5 > backup-full-$(date +%Y%m%d).dump

# Restore from backup
psql cloud_s5 < backup-file.sql
# or
pg_restore -d cloud_s5 backup-file.dump
```

## Performance Tuning

### Query Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM reports
WHERE status = 'in_progress'
AND created_at > NOW() - INTERVAL '30 days';

-- Reindex if needed
REINDEX INDEX idx_reports_status;
```

### Maintenance

```sql
-- Vacuum (reclaim space)
VACUUM ANALYZE;

-- Monitor table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```
