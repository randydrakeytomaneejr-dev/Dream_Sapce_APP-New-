# Dream Space — Wall Panel Ordering App

A full-stack storefront for ordering wall panels, gypsum ceilings, UV sheets,
and PU stone finishes. Customers browse products, place orders, and track them
by code. Admins log in to a dedicated dashboard to manage orders and send
receipts.

## Features

- **Storefront** — Browse 17 products across 4 categories (Wall Panels, PU
  Stone, UV Sheet, Gypsum Board) with category showcase images.
- **Cart & checkout** — Add items, enter contact details, place order.
  Customers get a unique order code (e.g. `DS-7F3K2Q`).
- **Payment instructions** — Checkout shows Mobile Money details. No payment
  gateway — customers pay manually, admin confirms.
- **Order tracking** — Customers enter their code on the Track page to see
  live status, no login needed.
- **Admin login** — Dedicated login page with email/password authentication.
  Only signed-in admins can view and manage orders.
- **Receipts** — When admin marks an order as "payment confirmed," the system
  automatically sends a receipt to the customer's email.
- **Ratings & reviews** — Customers can leave a star rating + comment, shown
  publicly with an average.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Supabase (Postgres database, Auth, Edge Functions)
- **Styling:** Custom CSS with a dark, premium aesthetic

## Admin Setup

1. Go to `/admin/login`
2. Click "Create one" to set up your admin account (email + password)
3. Sign in to access the order dashboard

## Running Locally

```bash
npm install
npm run dev
```

Then open the dev server URL shown in your terminal.
