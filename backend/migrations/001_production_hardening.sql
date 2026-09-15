ALTER TABLE users
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);

ALTER TABLE users MODIFY role ENUM('customer', 'admin', 'superadmin') DEFAULT 'customer';

ALTER TABLE orders ADD UNIQUE KEY unique_razorpay_payment (razorpay_payment_id);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_id INT NULL,
  razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
  amount_paise BIGINT NOT NULL,
  status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_payment_attempt_user_status (user_id, status)
);