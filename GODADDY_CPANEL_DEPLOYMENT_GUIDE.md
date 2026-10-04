# 🚀 GoDaddy cPanel Full-Stack Deployment Guide for Spotlight

This guide provides end-to-end instructions for deploying the entire Spotlight ecosystem on **GoDaddy cPanel Shared Hosting / Web Hosting Plus**:
- **Database**: GoDaddy MySQL via cPanel & phpMyAdmin
- **Backend API**: Node.js / Express deployed under `/api` via cPanel *Setup Node.js App*
- **Organizer Dashboard**: React (Vite) SPA deployed under `/dashboard`
- **Admin Portal**: React (Vite) SPA deployed under `/admin`
- **Mobile App**: Flutter app configured to point to the new production API

---

## 📁 Target Architecture on GoDaddy

```text
/home/cpaneluser/
├── spotlight_backend/             <-- Node.js Backend (Private, outside public_html)
│   ├── app.js                    <-- Phusion Passenger entrypoint
│   ├── dist/index.js             <-- Compiled TypeScript backend
│   ├── package.json
│   ├── .env                      <-- Production environment variables (MySQL, Secrets)
│   └── node_modules/
│
└── public_html/                  <-- Web Root (domain.com)
    ├── .htaccess                 <-- Enforces HTTPS & redirects / to /dashboard/
    │
    ├── dashboard/                <-- Spotlight Organizer Dashboard (dist files)
    │   ├── index.html
    │   ├── .htaccess             <-- React SPA rewrite rules for /dashboard
    │   └── assets/
    │
    └── admin/                    <-- Spotlight Admin Portal (dist files)
        ├── index.html
        ├── .htaccess             <-- React SPA rewrite rules for /admin
        └── assets/
```

Requests to `https://yourdomain.com/api/*` are handled by the cPanel Node.js Application.

---

## 🛠️ Phase 1: Database Setup (GoDaddy MySQL)

GoDaddy cPanel provides native MySQL/MariaDB. All table schemas and existing PostgreSQL data have already been converted to MySQL.

### 1.1 Create MySQL Database & User in cPanel
1. Log into your **GoDaddy cPanel**.
2. Under the **Databases** section, click **MySQL Database Wizard**.
3. **Step 1: Create a Database**:
   - Name: `spotlight` (Full name will be e.g. `cpaneluser_spotlight`).
   - Click *Next Step*.
4. **Step 2: Create Database User**:
   - Username: `spotuser` (Full username will be e.g. `cpaneluser_spotuser`).
   - Password: Click *Password Generator* (copy and save this securely).
   - Click *Create User*.
5. **Step 3: Add User to Database**:
   - Check **ALL PRIVILEGES**.
   - Click *Make Changes*.

### 1.2 Import Tables & Existing Data
1. In cPanel, click **phpMyAdmin** under **Databases**.
2. In the left sidebar, click on your newly created database (`cpaneluser_spotlight`).
3. Click the **Import** tab at the top.
4. Click **Choose File** and select:
   `d:\Spotlight\spotlight_backend\prisma\complete_godaddy_database.sql`
   *(This single file contains the complete MySQL table definitions plus all 8 clubs, 20 profiles, 8 events, teams, registrations, and keys exported from PostgreSQL).*
5. Click **Import** (or **Go**) at the bottom.
6. Verify that all 7 tables (`Club`, `Event`, `Notification`, `Profile`, `Registration`, `RegistrationKey`, `Team`) appear in your database.

---

## ⚙️ Phase 2: Backend Deployment (Node.js on cPanel)

### 2.1 Build the Backend Locally
In your local terminal:
```bash
cd d:\Spotlight\spotlight_backend
npm run build
```
This compiles TypeScript into the `dist/` directory.

### 2.2 Upload Files to GoDaddy
1. In cPanel, open **File Manager**.
2. Navigate to your user home directory (`/home/cpaneluser/`). Do **not** place the backend inside `public_html`.
3. Create a folder named `spotlight_backend`.
4. Upload the following files/folders into `/home/cpaneluser/spotlight_backend`:
   - `dist/`
   - `app.js`
   - `package.json`
   - `package-lock.json`
   - `prisma/`
   - `.env` (create or upload with production values)

### 2.3 Configure `.env` in `spotlight_backend`
In File Manager, create or edit `.env` inside `/home/cpaneluser/spotlight_backend/`:
```env
# GoDaddy MySQL connection string
DATABASE_URL="mysql://cpaneluser_spotuser:YOUR_DB_PASSWORD@localhost:3306/cpaneluser_spotlight"

PORT=5000
JWT_SECRET="072ba4a0c9d0438c72c6acc2171a90acad636d40aaf8556d96f6fc45bbd41086"
ADMIN_SECRET="spotlightDev@sam2005"
GOOGLE_CLIENT_ID="614014299614-n10khe2om4g50ehpqb6h82tdtumkh5ot.apps.googleusercontent.com"

# Supabase Storage (for banners, logos, QR codes, payment proofs)
SUPABASE_URL="https://flmxldwdbqbyrokmglus.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

### 2.4 Setup Node.js App in cPanel
1. In cPanel, navigate to the **Software** section and click **Setup Node.js App**.
2. Click **Create Application**.
3. Fill in the fields:
   - **Node.js version**: Select `20.x` (or `18.x`).
   - **Application mode**: `Production`.
   - **Application root**: `spotlight_backend`
   - **Application URL**: Select your domain and enter `api` in the path input box (so it becomes `yourdomain.com/api`).
   - **Application startup file**: `app.js`
4. Click **Create** in the upper right.
5. Under the *Detected configuration files* section, click **Run NPM Install** (or install dependencies via cPanel Terminal: `cd ~/spotlight_backend && npm install --omit=dev`).
6. Click **Restart**.
7. Test the API in your browser:
   Visit `https://yourdomain.com/api`
   You should see:
   ```json
   {"status":"success","message":"Spotlight API Server is live!"}
   ```

---

## 💻 Phase 3: Organizer Dashboard Deployment (`/dashboard`)

The dashboard has been configured with `base: '/dashboard/'` and includes an Apache `.htaccess` with SPA fallback rules.

### 3.1 Build the Dashboard Locally
1. In `spotlight_dashboard`, ensure `.env` or build arguments specify your production API:
   ```env
   VITE_GOOGLE_CLIENT_ID=614014299614-n10khe2om4g50ehpqb6h82tdtumkh5ot.apps.googleusercontent.com
   VITE_API_URL=https://yourdomain.com/api
   ```
2. Build the project:
   ```bash
   cd d:\Spotlight\spotlight_dashboard
   npm run build
   ```
   This generates the production bundle in `d:\Spotlight\spotlight_dashboard\dist\`.

### 3.2 Upload Dashboard to GoDaddy
1. In cPanel **File Manager**, navigate to `public_html/`.
2. Create a folder named `dashboard`.
3. Upload all files and folders from `d:\Spotlight\spotlight_dashboard\dist\` directly into `public_html/dashboard/`:
   - `index.html`
   - `.htaccess` *(make sure hidden files are enabled in cPanel File Manager)*
   - `assets/`
   - `favicon.png`, `logo.png`
4. Visit `https://yourdomain.com/dashboard`. The organizer console will load seamlessly.

---

## 🛡️ Phase 4: Admin Portal Deployment (`/admin`)

The admin portal has been configured with `base: '/admin/'` and includes an Apache `.htaccess` with SPA fallback rules.

### 4.1 Build the Admin Portal Locally
1. In `spotlight_admin`, configure `.env` (or pass during build):
   ```env
   VITE_API_URL=https://yourdomain.com/api
   ```
2. Build the project:
   ```bash
   cd d:\Spotlight\spotlight_admin
   npm run build
   ```
   This generates the production bundle in `d:\Spotlight\spotlight_admin\dist\`.

### 4.2 Upload Admin Portal to GoDaddy
1. In cPanel **File Manager**, navigate to `public_html/`.
2. Create a folder named `admin`.
3. Upload all files and folders from `d:\Spotlight\spotlight_admin\dist\` directly into `public_html/admin/`:
   - `index.html`
   - `.htaccess`
   - `assets/`
4. Visit `https://yourdomain.com/admin`. The admin key console will load cleanly.

---

## 🌐 Phase 5: Root `.htaccess` Setup (`public_html/`)

To automatically enforce HTTPS and redirect visitors from `https://yourdomain.com/` to `https://yourdomain.com/dashboard/`:

1. In cPanel **File Manager**, go to `public_html/`.
2. Create or edit `.htaccess` in `public_html/` and paste:
   ```apache
   RewriteEngine On

   # 1. Force HTTPS
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

   # 2. Redirect root (domain.com/) to domain.com/dashboard/
   RewriteRule ^$ /dashboard/ [R=301,L]

   # Prevent directory indexing
   Options -Indexes
   ```
3. Save the file.

---

## 🔒 Phase 6: Enable Free SSL (HTTPS)

1. In cPanel, search for **SSL/TLS Status**.
2. Select your domain.
3. Click **Run AutoSSL**.
4. Within 2-5 minutes, cPanel will issue a free certificate covering your domain and subfolders.

---

## 📱 Phase 7: Mobile App (Flutter) Update

Update the mobile app to point to your new GoDaddy API domain:

In [`spotlight_flutter/lib/core/api_service.dart`](file:///d:/Spotlight/spotlight_flutter/lib/core/api_service.dart):
```dart
class ApiService {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://yourdomain.com/api',
  );
```

When creating your release build:
```bash
cd d:\Spotlight\spotlight_flutter
flutter build appbundle --dart-define=API_BASE_URL=https://yourdomain.com/api
```

---

## 📋 Pre-Configured Files Reference

| File | Purpose | Location |
|---|---|---|
| `complete_godaddy_database.sql` | Table DDL + All exported clubs, users, events & registrations | `d:\Spotlight\spotlight_backend\prisma\` |
| `mysql_schema.sql` | Clean MySQL table definitions only | `d:\Spotlight\spotlight_backend\prisma\` |
| `app.js` | CloudLinux Passenger startup file for cPanel | `d:\Spotlight\spotlight_backend\app.js` |
| `public_html_htaccess.txt` | Root .htaccess for HTTPS & redirect | `d:\Spotlight\godaddy_cpanel_deployment\` |
| `public/.htaccess` | SPA routing fallback for Dashboard | `d:\Spotlight\spotlight_dashboard\public\` |
| `public/.htaccess` | SPA routing fallback for Admin | `d:\Spotlight\spotlight_admin\public\` |
