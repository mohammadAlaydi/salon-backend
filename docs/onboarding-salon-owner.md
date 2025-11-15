## Salon Onboarding Guide

### 1. Create your salon

- Ask your integrator to call `POST /auth/register` with your salon name, slug, admin name, email, and password.

### 2. Add staff

- Log into the admin panel that uses this API.
- Use `POST /staff` to add team members.
- Set working hours with `PUT /staff/{id}/schedule`.

### 3. Configure services

- Use `POST /services` to add services with duration and price.

### 4. Configure reminders and webhooks

- Provide your n8n URL to the integrator; they configure per-salon webhook and secret.

### 5. View reports

- Use `GET /reports/daily?date=YYYY-MM-DD` and staff performance endpoints.


