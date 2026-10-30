-- Core PostgreSQL Schema Initialization for Vero SaaS
-- Automatically executed by Postgres container on first run / fresh setup

\connect saas_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Core Types/Enums if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type_enum') THEN
    CREATE TYPE account_type_enum AS ENUM ('user', 'business', 'affiliate');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_enum') THEN
    CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'under_review', 'deactivated', 'dormant', 'banned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN
    CREATE TYPE users_status_enum AS ENUM ('active', 'suspended', 'under_review', 'deactivated', 'dormant', 'banned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
    CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
  END IF;
END $$;

-- 2. Create users table with ALL complete fields
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" VARCHAR(26) UNIQUE,
  "accountType" VARCHAR(20) DEFAULT 'user',
  "fullName" VARCHAR(255),
  username VARCHAR(50) UNIQUE,
  bio TEXT,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50) UNIQUE,
  password VARCHAR(255),
  "recoveryKey" VARCHAR(100),
  currency VARCHAR(10) DEFAULT 'USD',
  "profilePhoto" TEXT,
  "dateOfBirth" DATE,
  gender VARCHAR(20),
  nationality VARCHAR(100),
  "passportNumber" VARCHAR(50),
  "permanentAddress" JSONB,
  "governmentId" VARCHAR(100),
  "governmentIdType" VARCHAR(50),
  "idDocument" TEXT,
  status VARCHAR(20) DEFAULT 'active',
  "kycStatus" VARCHAR(50) DEFAULT 'none',
  kycstatus VARCHAR(50) DEFAULT 'none',
  "statusHistory" JSONB DEFAULT '[]'::jsonb,
  "emailVerified" BOOLEAN DEFAULT false,
  "phoneVerified" BOOLEAN DEFAULT false,
  "twoFactorEnabled" BOOLEAN DEFAULT false,
  "twoFactorMethod" VARCHAR(20),
  preferences JSONB DEFAULT '{}'::jsonb,
  "trustedIps" JSONB DEFAULT '[]'::jsonb,
  "paymentMethods" JSONB DEFAULT '[]'::jsonb,
  paymentmethods JSONB DEFAULT '[]'::jsonb,
  "agencyInfo" JSONB,
  "businessInfo" JSONB,
  "totalProject" INTEGER DEFAULT 0,
  "totalAmount" NUMERIC(12,2) DEFAULT 0,
  "paidAmount" NUMERIC(12,2) DEFAULT 0,
  "dueAmount" NUMERIC(12,2) DEFAULT 0,
  "refundAmount" NUMERIC(12,2) DEFAULT 0,
  profit NUMERIC(12,2) DEFAULT 0,
  "securityDeposit" NUMERIC(12,2) DEFAULT 0,
  "percentageRate" NUMERIC(5,2) DEFAULT 0,
  "businessName" VARCHAR(255),
  "businessType" VARCHAR(100),
  conversions INTEGER DEFAULT 0,
  referrals INTEGER DEFAULT 0,
  commission NUMERIC(12,2) DEFAULT 0,
  earnings NUMERIC(12,2) DEFAULT 0,
  level VARCHAR(50) DEFAULT 'Starter',
  "industryType" VARCHAR(100),
  "lastActiveAt" TIMESTAMP DEFAULT NOW(),
  "lastLoginAt" TIMESTAMP DEFAULT NOW(),
  "deactivatedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Ensure all columns exist even if users table was created by a microservice
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "trustedIps" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "recoveryKey" VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "kycStatus" VARCHAR(50) DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS kycstatus VARCHAR(50) DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "statusHistory" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "agencyInfo" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "businessInfo" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "governmentId" VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "governmentIdType" VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "idDocument" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "paymentMethods" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paymentmethods JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "totalProject" INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "totalAmount" NUMERIC(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "paidAmount" NUMERIC(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "dueAmount" NUMERIC(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "refundAmount" NUMERIC(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profit NUMERIC(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "securityDeposit" NUMERIC(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "percentageRate" NUMERIC(5,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "businessName" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "businessType" VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS conversions INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referrals INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission NUMERIC(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS earnings NUMERIC(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'Starter';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "industryType" VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP;

-- 3. Create kyc_application table
CREATE TABLE IF NOT EXISTS kyc_application (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" VARCHAR(100) UNIQUE NOT NULL,
  "applicationData" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 4. Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" VARCHAR(100),
  currency VARCHAR(10) DEFAULT 'USD',
  balance NUMERIC(15,2) DEFAULT 0,
  "lockedBalance" NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 5. Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "walletId" UUID,
  "userId" VARCHAR(100),
  type VARCHAR(50),
  amount NUMERIC(15,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  metadata JSONB,
  reference VARCHAR(100),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 6. Create payment_cards table
CREATE TABLE IF NOT EXISTS payment_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" VARCHAR(100) NOT NULL,
  "last4" VARCHAR(4) NOT NULL,
  brand VARCHAR(50) NOT NULL,
  "expiryMonth" INTEGER NOT NULL,
  "expiryYear" INTEGER NOT NULL,
  "holderName" VARCHAR(255),
  "isDefault" BOOLEAN DEFAULT false,
  "paymentMethodId" VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 7. Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" VARCHAR(100) NOT NULL,
  "refreshToken" TEXT,
  "ipAddress" VARCHAR(50),
  "userAgent" TEXT,
  "isValid" BOOLEAN DEFAULT true,
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
