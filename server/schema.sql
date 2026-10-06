CREATE DATABASE IF NOT EXISTS studyspace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE studyspace;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(254) NOT NULL,
  -- Plain-text password: for this local educational demonstration only.
  password VARCHAR(255) NOT NULL,
  role ENUM('member', 'admin') NOT NULL DEFAULT 'member',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email)
);

-- Migration for the older hashed-password schema (run once only if it still has
-- password_hash and does not yet have password). Existing hashes are retained
-- and are not valid plain-text passwords.
-- ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL AFTER password_hash;
-- ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL;
