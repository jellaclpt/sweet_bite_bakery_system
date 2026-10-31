# Sweet Bite Bakery Pre-order System

A web app for **Sweet Bite Bakery** where customers pre-order cakes, breads, pastries, cupcakes and cookies for a date and time they choose, pay a GCash deposit to confirm, and settle the balance on pickup or delivery. Bakery staff manage the menu and orders from an admin panel.

**Live site:** https://sweet-bite-bakery-system.vercel.app

---

## Contents

- [Features](#features)
- [How a pre-order works](#how-a-pre-order-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Running it on your computer](#running-it-on-your-computer)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [API reference](#api-reference)
- [Tests](#tests)
- [Troubleshooting](#troubleshooting)
- [Author](#author)

---

## Features

### Customers
- **Accounts:** register with a username, email and password; log in with either the username or the email.
- **Products:** browse the menu by category (Cake, Bread, Pastry, Cupcake, Cookies) and sort by name or price. Phones get dropdowns; larger screens get category buttons.
- **Cart and checkout:** choose quantities, pickup or delivery, and a date and time within opening hours.
- **GCash deposit:** pay part of the total upfront (50% by default) and upload a screenshot of the GCash receipt with its reference number.
- **Orders:** collapsible order cards that show status, schedule, items, payment status and total at a glance, with full details on tap.
- **Profile:** update name, phone, address and photo; change password; log out.
- **Mobile friendly:** bottom navigation bar on phones (Home, Products, Cart, Orders, Profile) with count badges.

### Admin
- **Dashboard:** product totals, availability and recent products, with search, category filter and price sort.
- **Products:** add, edit and delete products with photos; mark items as available or out of stock.
- **Orders:** filter by Needs review, Awaiting deposit, In progress, Completed and Cancelled; check GCash receipts; confirm or reject deposits; update order status.

### Under the hood
- Photos are resized in the browser before upload and stored on **Cloudinary**, so they survive redeploys.
- Admin account is created from environment variables on every deploy, so no password is ever stored in the code.
- Login and upload endpoints are rate limited; customers can only see their own orders.

---

## How a pre-order works

1. The customer adds items to the cart and picks pickup or delivery, a date and a time (opening hours are 8:00 to 18:00 by default, Philippine time).
2. The order is placed with payment status **Deposit needed** (`awaiting_deposit`).
3. The customer sends the deposit by GCash and submits the reference number and a receipt screenshot. Status becomes **Checking payment** (`deposit_submitted`).
4. The admin checks the receipt and confirms it (**Deposit paid**, `deposit_paid`) or rejects it (back to **Deposit needed**).
5. The admin moves the order through **Pending, Confirmed, Preparing, Ready, Completed** (or **Cancelled**).
6. The balance is paid on pickup or delivery, and the admin marks the order **Fully paid** (`paid`).

---

## Tech stack

| Part | Technology | Hosted on |
|---|---|---|
| Frontend | React 19 (Create React App), React Router 6, Tailwind CSS 3, lucide-react, react-hot-toast, react-datepicker | Vercel |
| Backend | Laravel 12 (PHP 8.2), Laravel Sanctum token auth | Render (Docker) |
| Database | PostgreSQL | Neon (free plan) |
| Images | Cloudinary Upload API | Cloudinary (free plan) |
| Design | Figma | |

---

## Project structure

```
sweet_bite_bakery_system/
├── backend/                     Laravel API
│   ├── app/Http/Controllers/    Auth, Products, Orders, Deposits, Admin, Profile
│   ├── app/Support/             Cloudinary client and image storage helper
│   ├── config/bakery.php        Bakery settings (deposit %, GCash, hours, admin)
│   ├── database/migrations/     Database tables
│   ├── database/seeders/        Categories and the admin account
│   ├── routes/api.php           All API routes
│   ├── tests/Feature/           Automated tests
│   ├── Dockerfile               Image used by Render
│   └── docker-entrypoint.sh     Runs migrations and seeders, then starts the server
├── frontend/                    React app
│   ├── src/pages/               Customer pages (Home, Products, Checkout, Orders, Profile, Login, Register)
│   ├── src/pages/admin/         Admin pages (Dashboard, Add Product, Orders) and layout
│   ├── src/components/          Navbar, Select dropdown, deposit modal, effects
│   ├── src/context/             Auth and cart state
│   └── tailwind.config.js       Brand colors and animations
└── vercel.json                  Vercel build settings for the frontend folder
```

---

## Running it on your computer

You need **PHP 8.2+**, **Composer**, **Node.js 18+** and **npm**. SQLite is enough for local work; PostgreSQL also works.

### 1. Backend (Laravel API)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate

# SQLite database file
touch database/database.sqlite

php artisan migrate --seed
php artisan storage:link
php artisan serve            # http://127.0.0.1:8000
```

With `APP_ENV=local`, the seeder also creates two demo accounts for testing:

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin12345` |
| Customer | `testcustomer` | `test12345` |

These demo accounts are **never** created on the live site.

### 2. Frontend (React)

```bash
cd frontend
npm install
cp .env.example .env         # REACT_APP_API_URL=http://127.0.0.1:8000
npm start                    # http://localhost:3000
```

---

## Environment variables

Never commit real secrets. Set them in Render and Vercel under **Environment**.

### Backend (Render)

| Variable | Required | What it does |
|---|---|---|
| `APP_KEY` | Yes | Laravel encryption key. Create one with `php artisan key:generate --show`. |
| `APP_ENV` | Yes | `production` on Render. |
| `APP_DEBUG` | Yes | `false` on Render. |
| `APP_URL` | Yes | The backend address, for example `https://your-service.onrender.com`. |
| `DB_CONNECTION` | Yes | `pgsql` |
| `DB_URL` | Yes | Neon connection string (`postgresql://user:password@host/dbname?sslmode=require`). |
| `ADMIN_USERNAME` | Yes | Admin username: 3 to 30 letters, numbers, dots or underscores. |
| `ADMIN_PASSWORD` | Yes | Admin password, at least 10 characters. |
| `ADMIN_EMAIL` | No | Admin email, also usable to log in. |
| `CLOUDINARY_URL` | Yes on Render | `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` from Cloudinary, Settings, API Keys. Without it, images are saved on the server and lost on every redeploy. |
| `CLOUDINARY_FOLDER` | No | Folder for uploads (default `sweet-bite`). |
| `BAKERY_DEPOSIT_PERCENT` | No | Deposit share of the total (default `50`). |
| `BAKERY_GCASH_NAME` | No | GCash account name shown at checkout. |
| `BAKERY_GCASH_NUMBER` | No | GCash number shown at checkout. |
| `BAKERY_TIMEZONE` | No | Default `Asia/Manila`. |
| `BAKERY_OPEN_HOUR` / `BAKERY_CLOSE_HOUR` | No | Pickup and delivery hours, 24-hour clock (default `8` and `18`). |
| `BAKERY_MAX_QUANTITY` | No | Most of one item per order (default `100`). |

### Frontend (Vercel)

| Variable | Required | What it does |
|---|---|---|
| `REACT_APP_API_URL` | Yes | Backend address **without** `/api`, for example `https://your-service.onrender.com`. |

---

## Deployment

### Database: Neon
1. In Vercel, open **Storage** and add the **Neon Postgres** integration (or create a project directly at neon.tech).
2. Copy the connection string and use it as `DB_URL` on Render.

### Images: Cloudinary
1. Create a free Cloudinary account.
2. In **Settings, API Keys**, copy the API key, API secret (click the eye icon) and cloud name.
3. On Render set `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME`.
4. After deploying, open `https://your-service.onrender.com/api/ping`. It should say `"uploads": "cloudinary"`.

### Backend: Render
1. Create a **Web Service** from this GitHub repository, environment **Docker**, root directory `backend`.
2. Add the backend environment variables above.
3. Deploy. On every start, `docker-entrypoint.sh`:
   - runs `php artisan migrate --force` (if it fails, the deploy stops and the previous version keeps running),
   - runs the seeders (categories and the admin account from `ADMIN_USERNAME` / `ADMIN_PASSWORD`),
   - starts the server on Render's `PORT`.
4. After changing an environment variable, choose **Save, rebuild, and deploy**.

### Frontend: Vercel
1. Import the repository in Vercel. `vercel.json` already builds the `frontend` folder and sends every path to `index.html`, so links like `/products` work on refresh.
2. Set `REACT_APP_API_URL` to the Render address and deploy.

Pushing to `master` redeploys both Vercel and Render automatically.

---

## API reference

All routes start with `/api` and answer in JSON. Signed-in routes need the header `Authorization: Bearer <token>` (returned by login and register).

### Public
| Method | Path | Purpose |
|---|---|---|
| GET | `/ping` | Health check; shows where uploads are stored |
| GET | `/categories` | List categories |
| GET | `/products` | List products, sorted by name (`?category=`, `?search=`, `?per_page=`) |
| GET | `/products/{id}` | One product |
| GET | `/payment-settings` | GCash name, number and deposit percent |
| POST | `/register` | Create an account (`name`, `username`, `email`, `password`, `password_confirmation`, optional `phone`, `address`) |
| POST | `/login` | Log in (`login` = username or email, `password`) |

### Signed-in customer
| Method | Path | Purpose |
|---|---|---|
| GET | `/user` | Current user |
| POST | `/logout` | Log out this device |
| PUT | `/profile/update` | Update name, phone, address, photo (multipart; send as POST with `_method=PUT`) |
| PUT | `/profile/change-password` | Change password |
| POST | `/orders` | Place an order |
| GET | `/orders/user/{user_id}` | Your orders |
| GET | `/orders/{id}` | One of your orders |
| GET | `/orders/{id}/status` | Order status |
| POST | `/orders/{id}/deposit` | Submit GCash reference and receipt (`payment_reference`, `proof`) |
| GET | `/notifications/{user_id}` | Your notifications |
| PATCH | `/notifications/{id}/read` | Mark a notification as read |

### Admin only
| Method | Path | Purpose |
|---|---|---|
| POST | `/products` | Add a product (multipart) |
| POST / PUT | `/products/{id}` | Edit a product |
| DELETE | `/products/{id}` | Delete a product (past orders keep their item details) |
| GET | `/orders/scheduled` | Upcoming scheduled orders |
| GET | `/admin/dashboard` | Dashboard numbers |
| GET | `/admin/orders` | All orders |
| PATCH | `/admin/orders/{id}/payment` | `action`: `confirm_deposit`, `reject_deposit` or `mark_paid` |
| PATCH | `/admin/orders/{id}/status` | Change order status |

---

## Tests

```bash
cd backend
php artisan test
```

The tests cover registration and username login, the admin seeder, the deposit flow, order rules (opening hours, quantities, prices), access control between customers, Cloudinary uploads (mocked) and profile updates.

To check the frontend builds cleanly:

```bash
cd frontend
CI=true npm run build
```

---

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| Admin can't log in | Check `ADMIN_USERNAME` and `ADMIN_PASSWORD` (10+ characters, no quotes) on Render, then **Save, rebuild, and deploy**. The username must not belong to a customer. |
| "The email field is required." on login | The website updated before the server. Wait until the latest Render deploy shows **Live**. |
| "Couldn't save the image right now." | `CLOUDINARY_URL` is wrong. Check for leftover `<` `>` placeholders, spaces or a hidden secret. Render **Logs** show Cloudinary's reason (search `Cloudinary upload failed`). |
| Uploaded images disappear after a deploy | `CLOUDINARY_URL` is not set, so images were saved on the server. Set it and upload again. |
| Render deploy fails with "could not translate host name" | The database no longer exists (Render's free databases expire). Use Neon and set `DB_URL`. |
| Pages show 404 when refreshed on Vercel | Make sure `vercel.json` is at the repository root. |
| Site loads but shows no products | `REACT_APP_API_URL` on Vercel is missing or ends in `/api`. Set it to the backend address only and redeploy. |

---

## Author

**Jella Mae Calupit**
BS Information Technology, Sorsogon State University, Bulan Campus
