-- Migration: Seed admin user
-- Created at: 2026-01-01
-- Default admin password: admin123 (bcrypt hash)

INSERT OR IGNORE INTO users (id, email, password_hash, role, created_at, updated_at)
VALUES (
  'admin-user-id',
  'admin@tutoring.com',
  '$2a$10$rQEY8rHvYbWmh9ZQXU8Xz.ZPZbXsL8gWvM7XQVU8.0nCGN0qXFHXi',
  'admin',
  datetime('now'),
  datetime('now')
);

