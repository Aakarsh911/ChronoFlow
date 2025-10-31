-- Manually expire Google integration token for testing
-- This sets the expiresAt to 1 hour ago, forcing a token refresh

-- First, check current token status
SELECT 
  id,
  provider,
  expiresAt,
  CASE 
    WHEN expiresAt IS NULL THEN 'No expiry set'
    WHEN expiresAt < NOW() THEN 'EXPIRED'
    ELSE 'Valid'
  END as status,
  expiresAt - NOW() as time_until_expiry
FROM "Integration"
WHERE provider = 'GOOGLE';

-- Expire the Google token (set to 1 hour ago)
UPDATE "Integration"
SET "expiresAt" = NOW() - INTERVAL '1 hour'
WHERE provider = 'GOOGLE';

-- Verify the token is now expired
SELECT 
  id,
  provider,
  expiresAt,
  CASE 
    WHEN expiresAt < NOW() THEN '✅ EXPIRED (will trigger refresh)'
    ELSE '❌ Still valid'
  END as status
FROM "Integration"
WHERE provider = 'GOOGLE';

-- Optional: Expire Microsoft token too
UPDATE "Integration"
SET "expiresAt" = NOW() - INTERVAL '1 hour'
WHERE provider = 'MICROSOFT';

-- View all integrations status
SELECT 
  id,
  provider,
  "userId",
  expiresAt,
  CASE 
    WHEN expiresAt IS NULL THEN '⚠️  No expiry'
    WHEN expiresAt < NOW() THEN '🔄 EXPIRED'
    ELSE '✅ Valid'
  END as status
FROM "Integration"
ORDER BY provider;
