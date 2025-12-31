-- 創建管理員帳戶
-- 密碼: admin123
INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
VALUES (
  'admin-001',
  'admin@tutoring.com',
  '$2b$10$HY6HFEf8YhtqKMDpzcsjEubZ4Yez4uONQmJwzqR40oA09B0QS8ePi',
  'admin',
  datetime('now'),
  datetime('now')
);

-- 創建示範教師
INSERT INTO teachers (id, teacher_code, name, subjects, hire_date, status, created_at, updated_at)
VALUES (
  'teacher-001',
  'T001',
  '陳老師',
  '["math","physics"]',
  datetime('now'),
  'active',
  datetime('now'),
  datetime('now')
);

-- 創建教師帳戶
-- 密碼: admin123
INSERT INTO users (id, email, password_hash, role, teacher_id, created_at, updated_at)
VALUES (
  'user-teacher-001',
  'teacher@tutoring.com',
  '$2b$10$HY6HFEf8YhtqKMDpzcsjEubZ4Yez4uONQmJwzqR40oA09B0QS8ePi',
  'teacher',
  'teacher-001',
  datetime('now'),
  datetime('now')
);
