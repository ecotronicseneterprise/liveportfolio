-- liveportfolio.site — Supabase schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Last updated: Jun 2026

-- ─────────────────────────────────────────────
-- CORE TABLES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text UNIQUE NOT NULL,
  slug           text UNIQUE NOT NULL,
  plan           text NOT NULL DEFAULT 'unpublished', -- 'unpublished' | 'pro'
  published_at   timestamptz,
  custom_domain  text,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolios (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template        text NOT NULL DEFAULT 'minimal',   -- 'minimal' | 'bold'
  content         jsonb,                              -- full portfolio JSON
  health_score    integer DEFAULT 0,                  -- 0-100 deterministic score
  seo_title       text,
  seo_description text,
  og_image_url    text,
  view_count      integer DEFAULT 0,
  edit_count      integer DEFAULT 0,
  last_viewed_at  timestamptz,
  updated_at      timestamptz DEFAULT now()
);

-- Payments — idempotency via ls_order_id (column name kept from original; stores Paystack reference)
CREATE TABLE IF NOT EXISTS payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id),
  ls_order_id  text UNIQUE NOT NULL,                  -- Paystack reference (column named for legacy reasons)
  product_tier text NOT NULL,                         -- 'launch' | 'pro'
  amount_cents integer NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- Subscriptions — recurring plan tracking
CREATE TABLE IF NOT EXISTS subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan         text NOT NULL,                         -- 'basic' | 'pro'
  status       text NOT NULL DEFAULT 'active',        -- 'active' | 'cancelled' | 'expired'
  started_at   timestamptz DEFAULT now(),
  expires_at   timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────
-- EMAIL LIST
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_subscribers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text UNIQUE NOT NULL,
  user_id          uuid REFERENCES users(id),
  portfolio_og_url text,
  source           text,                              -- 'preview_defer' | 'waitlist' | etc
  subscribed       boolean DEFAULT true,
  sequence_step    integer DEFAULT 0,
  sent_flows       jsonb DEFAULT '{}'::jsonb,         -- e.g. {"a_1": true, "b_7": true}
  created_at       timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────
-- ANALYTICS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  event_type   text NOT NULL,                         -- 'portfolio_view' | 'click'
  label        text,                                  -- for click events: button/link label
  referrer     text,
  ip_hash      text,                                  -- sha256 of real IP — never store raw IP
  company      text,                                  -- from IPinfo Lite as_name (filtered)
  country      text,                                  -- from IPinfo Lite (full country name)
  created_at   timestamptz DEFAULT now()
);

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS analytics_events_portfolio_id_created_at
  ON analytics_events(portfolio_id, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_ip_hash
  ON analytics_events(ip_hash);

-- ─────────────────────────────────────────────
-- CAREER SCORES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS career_scores (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  score        integer NOT NULL,                      -- 0-100
  breakdown    jsonb,                                 -- { presence, projects, experience, skills }
  summary      text,
  scored_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS career_scores_portfolio_id_scored_at
  ON career_scores(portfolio_id, scored_at DESC);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscribers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_scores      ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Portfolios
CREATE POLICY "portfolios_select_own" ON portfolios
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "portfolios_insert_own" ON portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolios_update_own" ON portfolios
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "portfolios_delete_own" ON portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Payments
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Subscriptions
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- analytics_events, career_scores, email_subscribers:
-- managed entirely via supabaseAdmin (service role) in API routes.
-- No client-side reads needed — RLS blocks direct client access.

-- ─────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER portfolios_updated_at
  BEFORE UPDATE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- MIGRATION: add columns to existing tables
-- Run these if upgrading from an older schema
-- ─────────────────────────────────────────────

-- Add sent_flows to email_subscribers (if not present)
ALTER TABLE email_subscribers
  ADD COLUMN IF NOT EXISTS sent_flows jsonb DEFAULT '{}'::jsonb;

-- Add company + country to analytics_events (if not present)
ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS country text;

-- ─────────────────────────────────────────────
-- Migration: affiliate tracking
-- Run in Supabase SQL Editor BEFORE deploying
-- the create page changes (Step 2/3 below).
-- ─────────────────────────────────────────────
-- ALTER TABLE users
--   ADD COLUMN IF NOT EXISTS referral_partner text;
-- CREATE INDEX IF NOT EXISTS users_referral_partner
--   ON users(referral_partner)
--   WHERE referral_partner IS NOT NULL;
