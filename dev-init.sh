#!/bin/bash
echo "Initializing HRMS Monorepo Setup..."

# Install dependencies
pnpm install

# Setup isolated environment variable pools
if [ ! -f apps/backend-api/.env ]; then
  mkdir -p apps/backend-api
  echo "DB_HOST=localhost" > apps/backend-api/.env
  echo "DB_PORT=5432" >> apps/backend-api/.env
  echo "DB_NAME=hrms_core" >> apps/backend-api/.env
  echo "DB_USER=postgres" >> apps/backend-api/.env
  echo "DB_PASSWORD=secret" >> apps/backend-api/.env
  echo "Generating secure cryptographic seeds..."
  echo "JWT_SECRET=$(openssl rand -hex 32)" >> apps/backend-api/.env
fi

if [ ! -f apps/frontend-portal/.env ]; then
  mkdir -p apps/frontend-portal
  echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > apps/frontend-portal/.env
fi

echo "Starting system compilation & dev servers via Turborepo..."
pnpm run dev
