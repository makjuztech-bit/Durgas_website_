-- migration: 002_admin_panel_upgrade.sql
-- Adds audit_log table and review moderation columns.
-- Safe to run multiple times (all statements are idempotent).

-- ─── Audit Log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  admin_id     BIGINT NOT NULL,
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    BIGINT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_audit_log_admin FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin   ON audit_log (admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity  ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);

-- ─── Review Moderation Columns ────────────────────────────────────────────────
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'hidden')),
  ADD COLUMN IF NOT EXISTS moderated_by  BIGINT       REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS moderated_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status);

-- ─── Products: ensure SKU uniqueness index (non-unique index to support NULLs) ─
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique
  ON products (sku)
  WHERE sku IS NOT NULL AND sku != '';

-- ─── Enable RLS on new tables ─────────────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
