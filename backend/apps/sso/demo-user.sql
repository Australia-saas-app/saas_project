-- Demo user seed for the SSO Postman collection
-- Default credentials:
--   email:    demo@vero.local
--   password: password
--
-- Usage:
--   docker cp sso/demo-user.sql vero2-postgres:/tmp/demo-user.sql
--   docker exec -it vero2-postgres psql -U postgres -d vero2 -f /tmp/demo-user.sql

-- Ensure columns exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "trustedIps" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "recoveryKey" VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "kycStatus" VARCHAR(50) DEFAULT 'none';

INSERT INTO users (
  "userId",
  "accountType",
  "fullName",
  "username",
  "bio",
  "email",
  "phone",
  "password",
  "currency",
  "profilePhoto",
  "dateOfBirth",
  "gender",
  "nationality",
  "passportNumber",
  "permanentAddress",
  "governmentId",
  "idDocument",
  "status",
  "emailVerified",
  "phoneVerified",
  "twoFactorEnabled",
  "twoFactorMethod",
  "agencyInfo",
  "businessInfo",
  "createdAt",
  "updatedAt"
) VALUES (
  'USER999999',
  'user',
  'Demo User',
  'demouser',
  'Platform Demo User',
  'demo@vero.local',
  NULL,
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8m6Bx/6CkXbkqUBgfHBlCkbSrxlKFe',
  'USD',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'active',
  true,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT ("userId") DO NOTHING;















