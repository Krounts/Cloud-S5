# Deployment Guide

## Production Deployment

### Prerequisites
- Docker & Docker Compose
- Server with at least 2GB RAM
- PostgreSQL 15 or higher
- SSL/TLS certificate

### Environment Setup

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd cloud-s5-project
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Generate secure JWT secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Create production database backup location**
   ```bash
   mkdir -p ./backups/postgres
   ```

### Docker Deployment

1. **Build Docker images**
   ```bash
   docker-compose build
   ```

2. **Start services**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

3. **Verify services**
   ```bash
   docker-compose ps
   docker-compose logs
   ```

4. **Run database migrations**
   ```bash
   docker exec cloud-s5-api-auth npm run migrate
   ```

### Nginx Reverse Proxy

```nginx
upstream api {
    server localhost:3001;
}

upstream web {
    server localhost:3000;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;

    location / {
        proxy_pass http://web;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.example.com app.example.com;
    return 301 https://$server_name$request_uri;
}
```

### Database Backup

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="./backups/postgres"
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql"

docker exec cloud-s5-postgres pg_dump \
  -U cloud_user \
  -d cloud_s5 > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### Monitoring

```bash
# Check API health
curl https://api.example.com/health

# Check logs
docker-compose logs -f api-auth

# Monitor resources
docker stats
```

### Scaling

For production with high load:

1. **Use separate database server** (managed PostgreSQL)
2. **Use load balancer** (Nginx, HAProxy, AWS ALB)
3. **Use CDN** for static assets (CloudFlare, AWS CloudFront)
4. **Use object storage** for uploads (AWS S3, MinIO)
5. **Add caching layer** (Redis)

### Security Checklist

- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] JWT secret is strong and unique
- [ ] Database password is strong
- [ ] CORS origin is restricted
- [ ] Rate limiting enabled
- [ ] HTTPS redirect configured
- [ ] Regular backups scheduled
- [ ] Monitoring and alerts set up
- [ ] Log aggregation configured

### Rollback Plan

```bash
# Stop current version
docker-compose down

# Restore database backup
docker exec cloud-s5-postgres \
  psql -U cloud_user -d cloud_s5 < backup-file.sql

# Start previous version
git checkout <previous-version>
docker-compose up -d
```

## Performance Optimization

### API Caching
- Implement Redis for session caching
- Cache frequently accessed reports
- Set appropriate TTLs

### Database
- Add indexes on frequently queried columns
- Monitor slow queries
- Regular VACUUM and ANALYZE

### Frontend
- Enable gzip compression
- Minify CSS/JS
- Lazy load images
- Use CDN for static assets

## Troubleshooting Production

### Memory Issues
```bash
# Increase Docker memory limit
docker update --memory 2g cloud-s5-api-auth
docker update --memory 2g cloud-s5-postgres
```

### Database Corruption
```bash
# Verify database integrity
docker exec cloud-s5-postgres pg_dump -v > /dev/null

# Rebuild indexes
docker exec cloud-s5-postgres \
  psql -U cloud_user -d cloud_s5 -c "REINDEX DATABASE cloud_s5;"
```

### Connection Pool Exhaustion
- Reduce IDLE connection timeout
- Increase max connections limit
- Check for connection leaks in code

## Monitoring with ELK Stack

For production logging, consider:
- Elasticsearch for logs
- Logstash for processing
- Kibana for visualization

```yaml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

## Cost Optimization

- Use managed services (RDS, CloudSQL)
- Implement auto-scaling policies
- Monitor and clean up unused resources
- Use spot instances for non-critical workloads
- Optimize database queries
