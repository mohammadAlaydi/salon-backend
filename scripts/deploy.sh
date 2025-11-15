#!/usr/bin/env bash
set -euo pipefail

echo "Pulling latest code..."
git pull

echo "Building images..."
docker-compose build api

echo "Running migrations..."
docker-compose run --rm api npx prisma migrate deploy

echo "Restarting services..."
docker-compose up -d

echo "Deployment complete."


