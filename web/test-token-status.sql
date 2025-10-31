-- Test script for Google Calendar token refresh fix
-- Run these queries in your PostgreSQL database to verify and test

-- 1. Check current token status
SELECT 
  u.email,
  i.provider,
  i."accessToken" IS NOT NULL as has_access_token,
  i."refreshToken" IS NOT NULL as has_refresh_token,
  i."expiresAt",
  CASE 
    WHEN i."expiresAt" IS NULL THEN 'No expiry set'
    WHEN i."expiresAt" < NOW() THEN '⚠️ EXPIRED'
    ELSE '✅ Valid'
  END as token_status,
  EXTRACT(EPOCH FROM (i."expiresAt" - NOW())) / 60 as minutes_until_expiry
FROM "User" u
JOIN "Integration" i ON u.id = i."userId"
WHERE i.provider = 'GOOGLE';

-- 2. Force token expiration for testing (OPTIONAL - only for testing!)
-- Uncomment to test auto-refresh functionality
-- UPDATE "Integration" 
-- SET "expiresAt" = NOW() - INTERVAL '1 hour'
-- WHERE provider = 'GOOGLE';

-- 3. Reset token expiry to 1 hour from now (use after successful refresh)
-- UPDATE "Integration" 
-- SET "expiresAt" = NOW() + INTERVAL '1 hour'
-- WHERE provider = 'GOOGLE';

-- 4. Check if any integrations need reconnection
SELECT 
  u.email,
  i.provider,
  i."refreshToken" IS NULL as needs_reconnect,
  i."expiresAt" < NOW() as is_expired
FROM "User" u
JOIN "Integration" i ON u.id = i."userId"
WHERE i.provider = 'GOOGLE'
  AND (i."refreshToken" IS NULL OR i."expiresAt" < NOW());
