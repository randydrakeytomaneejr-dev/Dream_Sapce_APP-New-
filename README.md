# Dream Space — Wall Panel Ordering App

A real full-stack app: a Node.js/Express backend that stores orders in
`orders.json`, plus the customer storefront and a password-protected admin
dashboard. Every file sits in one flat folder (no subfolders) so it uploads
cleanly through GitHub's web interface, which doesn't support drag-and-drop
folders.

## What's new in this version

- **Categories** — Wall Panels, PU Stone, UV Sheet, Gypsum Board (edit/add
  categories by changing the `category` field on any product in `server.js`).
- **17 products** using your real photos.
- **Payment instructions** — checkout shows your Mobile Money number and name.
  There's no real payment gateway wired in (that needs a provider account +
  API access this project doesn't have) — customers pay manually and you
  confirm it.
- **Unique order codes** (e.g. `DS-7F3K2Q`) generated per order.
- **Order tracking page** (`track.html`) — customers enter their code to see
  live status, no login needed.
- **Ratings & reviews** — customers can leave a star rating + comment,
  shown publicly on the storefront with an average.

## What's inside

```
dream-space-app/
  server.js          <- backend: serves pages + order/review API
  package.json
  orders.json         <- orders get written here (kept private — not servable)
  reviews.json        <- ratings/reviews get written here (kept private, served via API)
  index.html          <- customer storefront
  admin.html          <- your order dashboard
  track.html          <- customer order-tracking page
  *.jpg                <- 17 product photos
```

Only the HTML pages and photos are ever served directly to visitors.
`server.js`, `package.json`, `orders.json`, and `reviews.json` are never
exposed as raw files, even though they live in the same folder — the server
code explicitly whitelists which files are public. Reviews are still public,
but only through the `/api/reviews` endpoint, not as a raw file.

## Run it locally

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
cd dream-space-app
npm install
npm start
```

Then open:
- **http://localhost:3000** — the storefront customers use
- **http://localhost:3000/admin.html** — your dashboard (default admin key: `changeme123`)

**Change the admin key before going live:**

```bash
ADMIN_KEY=your-own-secret npm start
```

## Deploying to Render.com

1. Push this folder to a GitHub repo (drag all files at once — no folders to worry about now).
2. On Render, create a new "Web Service" from that repo.
3. Build command: `npm install` — Start command: `npm start`.
4. Add environment variable `ADMIN_KEY` with your own secret.
5. Add a persistent disk (Render's "Disks" feature) mounted at `/opt/render/project/src` so `orders.json` survives restarts.

## Honest limitations of this version

- **Storage is a JSON file**, not a database. Fine for a small business —
  migrate to Postgres/MySQL later if volume grows.
- **Admin auth is a single shared key**, not individual logins.
- **No payment processing** — orders are captured as "please confirm and
  collect payment," same as a phone/WhatsApp order today.

## Editing products or prices

Open `server.js` and edit the `PRODUCTS` array near the top.
