-- Bootstrap Migration
-- This migration should be run FIRST before any other migrations
-- It creates the generate_id function needed for ID columns

-- Create generate_id function
CREATE OR REPLACE FUNCTION generate_id(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  ts_part TEXT;
  rand_part TEXT;
BEGIN
  -- Timestamp part (13 digits: YYYYMMDDHH24MISS)
  ts_part := to_char(now(), 'YYYYMMDDHH24MISS');
  -- Random part (6 chars from MD5)
  rand_part := substring(md5(random()::text), 1, 6);
  -- Return prefix_timestamp_random
  RETURN concat(prefix, '_', ts_part, '_', rand_part);
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON FUNCTION generate_id(TEXT) IS 'Generate prefixed ID: prefix_YYYYMMDDHH24MISS_random6chars';
