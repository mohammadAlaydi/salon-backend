## Operational Runbook

### Check health

- `GET /health` should return `{ "status": "ok" }`.

### Logs

- Docker: `docker logs -f salon-api`.

### Deploy

- SSH to VPS and run `./scripts/deploy.sh`.

### Backup

- Run `./scripts/backup-db.sh`.


