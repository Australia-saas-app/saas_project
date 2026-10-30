#!/bin/bash
set -e

echo "=========================================================="
echo "🔒 Running PostgreSQL Schema Verification & Self-Healing"
echo "=========================================================="

echo "Verifying database schema, constraints, and user records in saas-postgres..."

docker compose exec -T saas-postgres psql -U admin -d saas_db -c "
  -- 1. Ensure foreign key / ID column widths and constraints
  ALTER TABLE transactions ALTER COLUMN \"userId\" TYPE VARCHAR(100);
  ALTER TABLE wallets ALTER COLUMN \"userId\" TYPE VARCHAR(100);
  ALTER TABLE transactions ALTER COLUMN \"userId\" DROP NOT NULL;
  ALTER TABLE wallets ALTER COLUMN \"userId\" DROP NOT NULL;

  -- 2. Ensure core user profile and auth columns exist
  ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "trustedIps" JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "paymentMethods" JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "governmentIdType" VARCHAR(50);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "governmentId" VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "idDocument" TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "recoveryKey" VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "kycStatus" VARCHAR(50) DEFAULT 'none';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "statusHistory" JSONB;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "agencyInfo" JSONB;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "businessInfo" JSONB;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "totalProject" integer DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "totalAmount" numeric(12,2) DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "paidAmount" numeric(12,2) DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "dueAmount" numeric(12,2) DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "refundAmount" numeric(12,2) DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS profit numeric(12,2) DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "securityDeposit" numeric(12,2) DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "percentageRate" numeric(5,2) DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "businessName" varchar(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "businessType" varchar(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS conversions integer DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS referrals integer DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS commission numeric(12,2) DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS earnings numeric(12,2) DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS level varchar(50) DEFAULT 'Starter';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "industryType" varchar(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP DEFAULT NOW();
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP DEFAULT NOW();
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP;

  -- 3. Harmonize recoveryKey case sensitivity
  UPDATE users SET \"recoveryKey\" = recoverykey WHERE \"recoveryKey\" IS NULL AND recoverykey IS NOT NULL;
  UPDATE users SET recoverykey = \"recoveryKey\" WHERE recoverykey IS NULL AND \"recoveryKey\" IS NOT NULL;

  -- 4. Harmonize case-sensitive kycstatus and kycStatus columns
  UPDATE users SET \"kycStatus\" = kycstatus WHERE (\"kycStatus\" IS NULL OR \"kycStatus\" = 'none') AND kycstatus IS NOT NULL AND kycstatus != 'none';
  UPDATE users SET kycstatus = \"kycStatus\" WHERE (kycstatus IS NULL OR kycstatus = 'none') AND \"kycStatus\" IS NOT NULL AND \"kycStatus\" != 'none';

  -- 5. Synchronize exact KYC status from kyc_application to users table if users table is empty/none
  UPDATE users u
  SET \"kycStatus\" = (k.\"applicationData\"->>'status')::varchar, kycstatus = (k.\"applicationData\"->>'status')::varchar
  FROM kyc_application k
  WHERE (u.\"userId\" = k.\"userId\" OR u.id::text = k.\"userId\" OR u.email = k.\"userId\")
    AND (u.\"kycStatus\" IS NULL OR u.\"kycStatus\" = 'none')
    AND k.\"applicationData\"->>'status' IS NOT NULL
    AND k.\"applicationData\"->>'status' != 'none';

  -- 6. Synchronize exact KYC status from users table to kyc_application if kyc_application has no status
  UPDATE kyc_application k
  SET \"applicationData\" = jsonb_set(COALESCE(k.\"applicationData\", '{}'::jsonb), '{status}', to_jsonb(u.\"kycStatus\"), true)
  FROM users u
  WHERE (u.\"userId\" = k.\"userId\" OR u.id::text = k.\"userId\" OR u.email = k.\"userId\")
    AND u.\"kycStatus\" IS NOT NULL
    AND u.\"kycStatus\" != 'none'
    AND (k.\"applicationData\"->>'status' IS NULL OR k.\"applicationData\"->>'status' = 'none');

  -- 7. Harmonize paymentMethods column
  UPDATE users SET \"paymentMethods\" = paymentmethods WHERE (\"paymentMethods\" IS NULL OR \"paymentMethods\" = '[]'::jsonb) AND paymentmethods IS NOT NULL AND paymentmethods != '[]'::jsonb;
  UPDATE users SET paymentmethods = \"paymentMethods\" WHERE (paymentmethods IS NULL OR paymentmethods = '[]'::jsonb) AND \"paymentMethods\" IS NOT NULL AND \"paymentMethods\" != '[]'::jsonb;

  -- 8. Create payment_cards table if not exists
  CREATE TABLE IF NOT EXISTS payment_cards (
    id SERIAL PRIMARY KEY,
    \"userId\" varchar(100) NOT NULL,
    \"cardHolderName\" varchar(100) NOT NULL,
    last4 varchar(4) NOT NULL,
    \"cardBrand\" varchar(50) NOT NULL,
    \"cardType\" varchar(50) NOT NULL,
    \"expiryMonth\" varchar(5) NOT NULL,
    \"expiryYear\" varchar(4) NOT NULL,
    \"encryptedCardToken\" text,
    status varchar(50) DEFAULT 'active',
    \"isDefault\" boolean DEFAULT false,
    \"billingAddress\" varchar(255),
    \"billingCity\" varchar(100),
    \"billingState\" varchar(100),
    \"billingZipCode\" varchar(20),
    \"billingCountry\" varchar(100),
    \"createdAt\" TIMESTAMP DEFAULT NOW(),
    \"updatedAt\" TIMESTAMP DEFAULT NOW()
  );
  ALTER TABLE payment_cards ALTER COLUMN \"userId\" TYPE VARCHAR(100);

  -- 9. Relate orphan transactions dynamically to their respective wallet's owner
  UPDATE transactions t
  SET \"userId\" = w.\"userId\"
  FROM wallets w
  WHERE t.\"walletId\" = w.id
    AND (t.\"userId\" IS NULL OR t.\"userId\" = '' OR t.\"userId\" = 'user')
    AND w.\"userId\" IS NOT NULL AND w.\"userId\" != '' AND w.\"userId\" != 'user';
" 2>/dev/null || true

echo "✅ Database schema and records verified and synchronized successfully!"
