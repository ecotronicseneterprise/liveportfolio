-- liveportfolio.site — Supabase schema
-- Run this in Supabase SQL editor (Dashboard → SQL Editor → New query)

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text UNIQUE NOT NULL,
  slug       text UNIQUE NOT NULL,
  plan       text NOT NULL DEFAULT 'unpublished', -- 'unpublished' | 'pro'
  published_at   timestamptz,
  custom_domain  text,
  ls_customer_id text,
  created_at     timestamptz DEFAULT now()
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template        text NOT NULL DEFAULT 'minimal',
  content         jsonb,
  health_score    integer DEFAULT 0,
  seo_title       text,
  seo_description text,
  og_image_url    text,
  view_count      integer DEFAULT 0,
  edit_count      integer DEFAULT 0,
  last_viewed_at  timestamptz,
  updated_at      timestamptz DEFAULT now()
);

-- Payments table (idempotency via ls_order_id unique constraint)
CREATE TABLE IF NOT EXISTS payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id),
  ls_order_id  text UNIQUE NOT NULL,
  product_tier text NOT NULL,
  amount_cents integer NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- Email subscribers (non-paying users captured for conversion sequence)
CREATE TABLE IF NOT EXISTS email_subscribers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text UNIQUE NOT NULL,
  user_id          uuid REFERENCES users(id),
  portfolio_og_url text,
  source           text,
  subscribed       boolean DEFAULT true,
  sequence_step    integer DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Portfolios policies
CREATE POLICY "portfolios_select_own" ON portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "portfolios_insert_own" ON portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "portfolios_update_own" ON portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "portfolios_delete_own" ON portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Email subscribers — only service role writes; no client reads needed
-- (managed entirely through supabaseAdmin in API routes)

-- Function: auto-update updated_at on portfolio changes
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
