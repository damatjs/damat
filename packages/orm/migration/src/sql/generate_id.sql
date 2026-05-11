-- Migration: Create generate_id function
-- This function creates prefixed IDs using ULID or random strings

CREATE OR REPLACE FUNCTION generate_id(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  ulid_part TEXT;
BEGIN
  -- Generate ULID-like string (26 chars)
  ulid_part := encode(gen_random_bytes(16), 'base64');
  ulid_part := replace(ulid_part, '+', 'A');
  ulid_part := replace(ulid_part, '/', 'B');
  ulid_part := replace(ulid_part, '=', '');
  ulid_part := substring(ulid_part, 1, 20);
  
  -- Return prefix_id
  RETURN concat(prefix, '_', ulid_part);
END;
$$ LANGUAGE plpgsql;

-- Test it
SELECT generate_id('usr'); -- Should return something like 'usr_AbCdEfGhIjKlMnOpQrSt'
