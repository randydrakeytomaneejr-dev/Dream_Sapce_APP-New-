/*
# Create activity_logs table

## Overview
Adds a logging table that records key business events: order placed,
status changed, receipt sent, review submitted. This gives the admin
a full audit trail of everything happening in the system.

## New Tables

### activity_logs
- id (uuid, primary key)
- action (text, not null) — e.g. "order_placed", "status_changed", "receipt_sent", "review_submitted"
- description (text) — human-readable summary
- order_code (text) — related order code if applicable
- actor (text) — who triggered it: "customer", "admin", or email
- metadata (jsonb) — extra context (old status, new status, etc.)
- created_at (timestamptz)

## Security
- RLS enabled.
- Public insert (events can be logged from edge functions + frontend).
- Admin-only read (authenticated users only).
*/

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  description text NOT NULL DEFAULT '',
  order_code text NOT NULL DEFAULT '',
  actor text NOT NULL DEFAULT 'system',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Public can insert log entries (edge functions use service role which bypasses RLS,
-- but frontend also needs to insert for customer-side events)
DROP POLICY IF EXISTS "public_insert_activity_logs" ON activity_logs;
CREATE POLICY "public_insert_activity_logs" ON activity_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Only authenticated (admin) can read the log
DROP POLICY IF EXISTS "admin_read_activity_logs" ON activity_logs;
CREATE POLICY "admin_read_activity_logs" ON activity_logs FOR SELECT
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC);
