/*
# Dream Space — Initial Schema

## Overview
Creates the core tables for the Dream Space wall panel storefront:
products, orders, and reviews. Admin access is handled through Supabase
Auth (email/password) — no custom auth table needed.

## New Tables

### products
- id (uuid, primary key)
- name (text, not null) — product name
- category (text, not null) — Wall Panels, PU Stone, UV Sheet, Gypsum Board
- price (integer, not null) — price per unit
- unit (text) — unit description e.g. "per panel (2.4m)"
- image (text) — image path
- sort_order (integer, default 0) — display ordering
- created_at (timestamptz)

### orders
- id (uuid, primary key)
- code (text, unique, not null) — human-readable order code e.g. DS-7F3K2Q
- customer_name (text)
- customer_phone (text)
- customer_email (text) — used for sending receipts
- customer_note (text)
- items (jsonb, not null) — array of {id, name, price, qty}
- total (integer, not null) — total price
- status (text, default 'awaiting payment')
- receipt_sent (boolean, default false)
- created_at (timestamptz)
- updated_at (timestamptz)

### reviews
- id (uuid, primary key)
- name (text, not null)
- rating (integer, not null, 1-5)
- comment (text)
- created_at (timestamptz)

## Security
- RLS enabled on all tables.
- products: public read (anon + authenticated), no public writes.
- orders: public insert (customers place orders), public read by code only
  is handled at the app level. Admin (authenticated) can read all and update.
- reviews: public read + insert.
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  price integer NOT NULL,
  unit text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_note text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'awaiting payment',
  receipt_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Customers place orders (public insert)
DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Public can look up orders by code (needed for tracking page)
DROP POLICY IF EXISTS "public_read_orders" ON orders;
CREATE POLICY "public_read_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

-- Admin (authenticated) can update order status
DROP POLICY IF EXISTS "admin_update_orders" ON orders;
CREATE POLICY "admin_update_orders" ON orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_reviews" ON reviews;
CREATE POLICY "public_read_reviews" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_reviews" ON reviews;
CREATE POLICY "public_insert_reviews" ON reviews FOR INSERT
  TO anon, authenticated WITH CHECK (true);
