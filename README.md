# Bella Paint

A premium Nigerian paint brand site: interactive colour studio, room visualiser, product showroom, project before/after sliders, a server-backed store, quote requests, and a password-protected admin dashboard.

## Requirements

- Node.js 22 or newer (uses the built-in `node:sqlite` module)
- npm
- Paystack secret key for online payments (optional; other payment methods remain available without it)

## Run locally

```sh
npm install
cp .env.example .env
# Edit .env: set a private ADMIN_PASSWORD; add Paystack credentials when ready.
npm start
```

Open `http://localhost:8000` for the site and `http://localhost:8000/admin.html` for the admin dashboard. The SQLite database is created at `data/bella.db` on first run and is intentionally gitignored.

You can also run `npm run dev` for automatic server restarts.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `8000` |
| `BASE_URL` | Public site URL used as the Paystack callback URL |
| `ADMIN_PASSWORD` | Admin sign-in password. Defaults to `bella-admin` for local development; set a strong private password before deploying. |
| `PAYSTACK_SECRET_KEY` | Paystack secret key. If unset, online checkout is disabled and pay-on-delivery / bank transfer remain available. |

For a live deployment, use HTTPS, set `BASE_URL` to the public HTTPS origin, set a strong `ADMIN_PASSWORD`, and configure the Paystack webhook URL as `https://your-domain/api/payments/webhook`. Never publish `.env` or the Paystack secret key.

## What is persisted

- Products, orders, customer records (derived from orders/enquiries), and quote / consultation requests are stored in SQLite and managed via the authenticated admin dashboard.
- Cart contents remain in the customer's browser storage.
- Order totals are recalculated from server-side product prices; client-supplied totals are not trusted.
- Paystack transactions are initialized and verified by the server. A configured secret key is required to accept live online payments.

Project before/after images are generated editorial-style portfolio visuals, not documentary client photography. Replace each pair with client-approved project photography when available:

- `assets/project-living-before.jpg` and `assets/project-living.jpg`
- `assets/project-bedroom-before.jpg` and `assets/project-bedroom.jpg`
- `assets/project-dining-before.jpg` and `assets/project-dining.jpg`

## Main files

- `index.html` — storefront, colour studio, room visualiser, showroom, projects, quote form, cart and checkout
- `admin.html` — server-authenticated dashboard for orders, products, customers and enquiries
- `server.js` — Express server, SQLite persistence, admin session auth and Paystack integration
- `js/data.js`, `js/app.js`, `js/admin.js`, `js/rooms.js` — shared data and browser interactions
- `css/styles.css` — storefront and dashboard styling
