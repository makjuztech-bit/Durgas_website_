-- 004_five_metals_whatsapp_upgrade.sql
-- Upgrades for Five Metals / Iypponnu Jewellery & WhatsApp Ordering

-- 1. Add metal_composition, available_sizes, and tamil_name to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS metal_composition TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_sizes VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tamil_name VARCHAR(255);
ALTER TABLE products ALTER COLUMN purity TYPE VARCHAR(255);
ALTER TABLE products ALTER COLUMN material TYPE VARCHAR(255);
ALTER TABLE products ALTER COLUMN badge TYPE VARCHAR(100);

-- 2. Add tamil_name to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tamil_name VARCHAR(255);

-- 3. Add order_source and customer_name to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source VARCHAR(50) DEFAULT 'website';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- 4. App settings table for configurable WhatsApp business number and store info
CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial WhatsApp business number and store configurations
INSERT INTO app_settings (key, value, description)
VALUES 
  ('whatsapp_number', '917448882444', 'Durgas Jewellery Official WhatsApp Business Number'),
  ('store_name', 'Durgas Jewellery', 'Official Shop Name'),
  ('delivery_charge', '0', 'Standard Delivery Charge in INR (0 for Free Delivery)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
