# Durgas Production Checklist

- [x] Authentication & Session Security (HttpOnly cookies, JWT, SameSite)
- [x] Authorization (RBAC: customer, admin, superadmin)
- [x] Directory Traversal & Sensitive File Exposure Blocked
- [x] CORS Lockdown & Origin Validation
- [x] Database Pool Hardening (Idle error handler, timeouts, health ping)
- [x] Database Schema & Migrations (001, 002, 003 added for webhook logs & GST invoices)
- [x] Payments & Signature Verification (Razorpay server-side HMAC validation)
- [x] Razorpay Webhook Idempotency (payment_webhook_logs tracking)
- [x] Inventory Concurrency Protection (SELECT ... FOR UPDATE locks)
- [x] Orders & GST Invoicing (3% GST breakdown: 1.5% CGST + 1.5% SGST, unique invoice generation)
- [x] Admin Dashboard Protection & Rate Limiting
- [x] Transactional Email & Tax Invoice Service (Nodemailer / SMTP ready)
- [x] Legal Pages (Privacy Policy DPDP Act 2023, Terms & Conditions, Shipping Policy, Refund Policy)
- [x] Grievance Redressal Officer & Business Compliance Disclosures
- [x] SEO (Dynamic OpenGraph metadata, JSON-LD Schema.org, /sitemap.xml, /robots.txt)
- [x] Performance (HTTP compression, static asset caching, lazy-loading images)
- [x] Graceful Shutdown (SIGTERM/SIGINT handlers)
- [x] Automated Testing Suite (15/15 tests passing)
- [ ] Live Supabase Migration Execution (Run 003_production_hardening.sql in Supabase SQL Editor)
- [ ] Production Environment Variables Configuration (Rotate secrets in production platform)
- [ ] Razorpay Production Keys & Webhook Secret Configuration
- [ ] SMTP / Transactional Email Provider Live Credentials
- [ ] Live Domain SSL / Reverse Proxy (Nginx / Cloudflare WAF)

## Supabase migration notes
- Supabase PostgreSQL is the target database; do not treat migration as complete until the SQL migrations and all application paths pass against a real project.
- Keep Redis for caching/session acceleration if needed.
- Configure the Supabase PostgreSQL `DATABASE_URL` in the backend hosting environment; use the provider's pooled connection string when required by the host.
- Add explicit least-privilege RLS policies for every table exposed through the Supabase Data API. Current schema enables RLS with default deny but does not define customer policies.
- Run the PostgreSQL schema in a development Supabase project first, migrate any existing data with backups and record-count checks, then verify the application end to end.
