-- Add 'sms_sent' to the audit_action enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE audit_action AS ENUM ('sms_sent');
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'sms_sent'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'audit_action')
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'sms_sent';
  END IF;
END$$;
