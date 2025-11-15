## Salon SaaS Backend

NestJS + Prisma multi-tenant backend for salon booking, CRM, staff management, and reporting.

### Local development

- Install Docker and Node.js 20.
- Copy `.env.example` to `.env` and adjust values (DB URL, JWT secrets, N8N base URL).
- Run `docker-compose up -d postgres redis n8n`.
- Run `npm install`.
- Run `npx prisma migrate dev` to apply migrations.
- Run `npm run start:dev` to start the API on port 3000.

### Tests

- `npm test` – unit tests.
- `npm run test:cov` – coverage.

### Migrations & seed

- `npm run prisma:migrate:dev` – create/apply migrations in dev.
- `npm run prisma:migrate:deploy` – apply migrations in production.
- `npm run prisma:seed` – seed demo data.

### Docker

- `docker-compose up -d` will start the API, Postgres, Redis, n8n, and nginx.


