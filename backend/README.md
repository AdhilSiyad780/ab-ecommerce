# FreshCrate — Backend (Django + DRF)

## What this is
A REST API for FreshCrate: catalog, delivery areas, discounts/coupons/combos,
orders, and Razorpay payments. All pricing and stock logic runs here —
the React frontend never sends or trusts a price.

This backend has been tested end-to-end in development (migrations, seed
data, catalog browsing, JWT auth, order placement with real stock
transactions, coupon/combo pricing, cancellation with stock restore, and
admin-vs-customer permission gating all verified working).

## Local setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # then fill in DB + Razorpay values
```

For local development without installing Postgres, you can temporarily
point `DATABASES` in `freshcrate/settings.py` at SQLite — but use real
Postgres for anything beyond quick testing, since the schema relies on
transactional integrity (row locking on stock updates) that SQLite
doesn't handle the same way under concurrency.

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py seed_data        # 40 products, apartments, slots, combos, coupons
python manage.py createsuperuser  # prompts for mobile + name + password
python manage.py runserver
```

API now live at `http://localhost:8000/api/`. Django's built-in admin
(useful for quick manual data fixes) is at `http://localhost:8000/admin/`.

## Key endpoints

| Purpose | Endpoint |
|---|---|
| Login (JWT) | `POST /api/auth/login/` `{mobile, password}` |
| Refresh token | `POST /api/auth/refresh/` |
| Signup | `POST /api/accounts/signup/` |
| My profile | `GET/PATCH /api/accounts/me/` |
| My addresses | `/api/accounts/addresses/` |
| Products (public browse) | `GET /api/catalog/products/?category__name=Fruits&search=mango&offers=true` |
| Categories | `/api/catalog/categories/` |
| Apartments | `/api/delivery/apartments/` |
| Delivery slots | `/api/delivery/slots/` |
| Live price a cart | `POST /api/discounts/price-cart/` `{apartment_id, coupon_code?, lines:[{product_id, qty}]}` |
| Coupons / Combos | `/api/discounts/coupons/`, `/api/discounts/combos/` |
| Discount stacking rules | `GET/PATCH /api/discounts/rules/` |
| Place order | `POST /api/orders/` `{address_id, apartment_id, slot_id, payment_method, coupon_code?, lines}` |
| My orders | `GET /api/orders/` |
| Cancel order | `POST /api/orders/{id}/cancel/` |
| Admin: all orders | `GET /api/orders/admin/orders/?status=PLACED` |
| Admin: advance status | `POST /api/orders/admin/orders/{id}/advance_status/` |
| Razorpay: create order | `POST /api/orders/payments/razorpay/create/` `{order_id}` |
| Razorpay: webhook | `POST /api/orders/payments/razorpay/webhook/` |

Admin-only endpoints (product/apartment/coupon/combo writes, admin order
list) require a JWT belonging to a non-`CUSTOMER` role — set via
`user.role` (see `accounts/models.py`), either through
`createsuperuser`, Django admin, or directly in the DB.

## Deploying

- **API**: Railway or Render (both: connect this repo, set env vars from
  `.env.example`, add a Postgres addon, deploy). Not Vercel — DRF is a
  full Python app, not a serverless-shaped function.
- **Database**: the Postgres addon from Railway/Render, or Neon.
- **Frontend**: the separate `frontend/` folder deploys to Vercel and
  talks to this API's URL — set `CORS_ALLOWED_ORIGINS` here to match its
  deployed domain.
- Run `python manage.py migrate` and `seed_data` once against the
  production database after first deploy.
