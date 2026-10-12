-- migration: 003_production_hardening.sql
-- Adds payment webhook idempotency logs, GST invoice and tax tracking columns, and hallmark disclosures.
-- Safe to run multiple times (idempotent).

-- ─── Payment Webhook Logs (for Razorpay Idempotency) ─────────────────────────
CREATE TABLE IF NOT EXISTS payment_webhook_logs (
  id             BIGSERIAL PRIMARY KEY,
  event_id       VARCHAR(100) NOT NULL UNIQUE,
  event_type     VARCHAR(100) NOT NULL,
  entity_id      VARCHAR(100),
  payload        JSONB,
  status         VARCHAR(50) NOT NULL DEFAULT 'processed'
    CHECK (status IN ('pending', 'processed', 'failed', 'ignored')),
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON payment_webhook_logs (event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_entity   ON payment_webhook_logs (entity_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created  ON payment_webhook_logs (created_at DESC);

-- ─── Orders: GST Tax & Invoice Columns ───────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS invoice_number  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS invoice_url     VARCHAR(500);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_invoice_number
  ON orders (invoice_number)
  WHERE invoice_number IS NOT NULL AND invoice_number != '';

-- ─── Order Items: Jewellery Hallmark & Tax Breakdown ─────────────────────────
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS tax_rate         DECIMAL(5,2) NOT NULL DEFAULT 3.00,
  ADD COLUMN IF NOT EXISTS tax_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS huid             VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hallmark_details VARCHAR(100);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE payment_webhook_logs ENABLE ROW LEVEL SECURITY;
