# DURGAS Website

A multi-part project for the DURGAS jewellery storefront, backend API, and admin panel, upgraded for production readiness.

## 1. Local Development Setup

Requirements: Node.js 20 or newer, Docker (optional), and a Supabase project with PostgreSQL enabled.

1. **Environment Setup:** Copy `.env.example` to `backend/.env` and replace placeholders.
   - Configure `DATABASE_URL` for PostgreSQL.
   - Provide a unique `JWT_SECRET`.
   - Set Razorpay test credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
2. **Database Initialization:** Run the PostgreSQL schema in `backend/schema.sql` against your development Supabase project. 
3. **Install and Run:**
   ```powershell
   cd backend
   npm ci
   npm run dev
   ```
   The storefront is served by Express at `http://localhost:5000`.

## 2. Production Build and Deployment

### Docker Setup
The project now includes production-ready Dockerfiles using multi-stage builds and non-root users.
1. Make sure your `.env` is configured with production secrets (never commit this file).
2. Use Docker Compose to spin up the services:
   ```bash
   docker-compose build
   docker-compose up -d
   ```
3. Expose port `80` (frontend via Nginx proxy) and port `5000` (backend) to a reverse proxy (e.g., Nginx, Traefik) providing HTTPS.

### Admin Account Setup
To create the initial administrator securely:
1. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (min 12 characters) in `backend/.env`.
2. Run the seed script:
   ```bash
   cd backend && npm run seed
   ```
3. **Critical:** Remove the `SEED_ADMIN_*` variables from `.env` immediately after running.

## 3. Database Migration and Backup
- **Migrations:** Before applying schema changes, create a new SQL migration script. Do not destructively edit `schema.sql` once in production.
- **Backups:** Configure Supabase automated daily backups. For local/self-hosted databases, set up a cron job using `pg_dump`.

## 4. Razorpay Webhook Setup
To ensure payments are securely reconciled:
1. Open your Razorpay Dashboard.
2. Navigate to Settings > Webhooks and add a new webhook.
3. Set the URL to: `https://yourproductiondomain.com/api/orders/webhook`
4. Subscribe to the `order.paid` and `payment.captured` events.
5. Generate a secret and place it in your `.env` as `RAZORPAY_WEBHOOK_SECRET`.

## 5. Health Check & Rollbacks
- Monitor the backend via the root route or implement a `/health` API.
- Rollbacks using Docker: Tag images with commit SHAs (`my-backend:a1b2c3`) rather than just `latest`. To rollback, switch the tag in `docker-compose.yml` and `docker-compose up -d`.

## Structure
- `frontend/` — static storefront UI
- `backend/` — Express API and business logic
- `administrator/` — admin interface
- `docker-compose.yml` — Container orchestration
