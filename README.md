<div align="center">

<img src="assets/favicon.png" alt="Spotlight" width="72" />

# Spotlight

**Campus event platform for Ramaiah Institute of Technology.** Students discover and register for club events, clubs manage registrations and check people in by QR code, and an admin controls which clubs can join.

![Flutter](https://img.shields.io/badge/Flutter-02569B?logo=flutter&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)

</div>

## What's in this repo

| Folder | What it is | Stack |
|---|---|---|
| [`spotlight_backend/`](spotlight_backend) | REST API used by every client | Express 5, TypeScript, Prisma 7 (MariaDB/MySQL adapter) |
| [`spotlight_dashboard/`](spotlight_dashboard) | One web app with three areas, chosen by URL path | React 18, Vite 6, Tailwind 4, zustand |
| [`spotlight_flutter/`](spotlight_flutter) | Student Android app ([Google Play](https://play.google.com/store/apps/details?id=com.spotlight.connect)) | Flutter, Provider |
| [`spotlight_privacy_policy/`](spotlight_privacy_policy) | Hosted privacy policy page | Static HTML |

The web app serves:

| Path | Area | Who uses it |
|---|---|---|
| `/student` | Student web app (installable PWA, same features as the Flutter app) | Students |
| `/admin` | Admin console: issue club registration keys | Platform admin |
| everything else | Club dashboard: create events, review registrations, scan tickets | Club organisers |

## Features

**Students** (Flutter app and `/student`)
- Browse upcoming events by category, search, and save events
- Register solo, create a team, or join one with a 5-character passkey
- Paid events: pay the club by UPI (QR code or UPI ID), then submit the UPI Transaction ID
- QR ticket for every confirmed registration
- In-app notifications, light and dark themes

**Clubs** (dashboard)
- Sign up with a single-use registration key from the admin
- Create free or paid events with banner, deadline, team size and UPI details
- Approve or reject paid registrations after checking the Transaction ID
- Scan student QR tickets at the venue to check them in
- Overview stats per event

**Admin** (`/admin`)
- Generate random or custom registration keys and see which club used each one

## Architecture

```mermaid
flowchart LR
    APP[Flutter app] --> API
    WEB["Web app<br/>/student · dashboard · /admin"] --> API
    API[Express API<br/>Render] --> DB[(MySQL)]
    API --> FILES[Image storage<br/>GoDaddy upload.php]
    GOOGLE[Google Sign-In] -.ID token.-> API
```

**Auth:** the API issues its own JWTs (30 days for users, 12 hours for the admin). Students and clubs sign in with email and password or Google; the API verifies Google tokens with `google-auth-library`. Passwords are hashed with bcrypt.

**Images** (event banners, club logos, payment QR codes) are uploaded as base64 to the API, which stores them through a PHP endpoint on the GoDaddy host and keeps the URL in the database.

### Data model

`Profile` (students, plus the built-in `admin`) · `Club` · `Event` · `Team` · `Registration` (status `PENDING` / `CONFIRMED` / `REJECTED`, Transaction ID, check-in time) · `Notification` · `RegistrationKey`. See [`schema.prisma`](spotlight_backend/prisma/schema.prisma).

### API

All routes are served under `/api` (and also at the root, for hosts that strip the prefix).

| Prefix | Purpose |
|---|---|
| `/auth` | Student sign-up and login, Google sign-in, club login, password change |
| `/profiles` | Read and edit profiles, profile stats |
| `/clubs` | Club list and sign-up, admin login, registration keys, club registrations and stats |
| `/events` | Event list, create and edit events, deadlines, an event's registrations |
| `/notifications` | List, mark read, delete |
| `/` (registrations) | Register, teams, payment submission, approve or reject, ticket verification, public stats |

## Getting started

Requirements: Node.js 20+, a MySQL or MariaDB database, Flutter (stable) for the mobile app.

### Backend

```bash
cd spotlight_backend
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, etc.
npm install                 # also runs prisma generate
npx prisma db push          # create tables (first time only)
npm run dev                 # http://localhost:5000/api
```

On first start the API creates the `admin` profile with password `admin@123`. **Change it straight away** from the admin console.

### Web app

```bash
cd spotlight_dashboard
npm install
# .env: VITE_API_URL=http://localhost:5000/api and VITE_GOOGLE_CLIENT_ID=...
npm run dev                 # http://localhost:5173  (/student, /admin)
npm run build               # output in dist/
```

### Flutter app

```bash
cd spotlight_flutter
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api   # Android emulator → local API
```

Without `--dart-define` the app uses the production API. Release builds need `android/key.properties` and the upload keystore, which are not in the repo.

```bash
flutter build appbundle --release   # build/app/outputs/bundle/release/app-release.aab
```

## Environment variables

**Backend** (`spotlight_backend/.env`, see [`.env.example`](spotlight_backend/.env.example))

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | MySQL connection string |
| `JWT_SECRET` | yes | Signs all session tokens |
| `GOOGLE_CLIENT_ID` | yes | Verifies Google sign-in tokens |
| `UPLOAD_SECRET` | yes | Shared secret for the image upload endpoint |
| `GODADDY_UPLOAD_URL` | yes | URL of `upload.php` on the file host |
| `PORT` | no | Defaults to `5000` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | no | Fallback image storage |

**Web app** (`spotlight_dashboard/.env`): `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, and optionally `VITE_BASE_PATH` when hosted under a sub-path.

**Flutter:** `API_BASE_URL` via `--dart-define`.

## Deployment

- **API:** Render, configured in [`render.yaml`](spotlight_backend/render.yaml). [`app.js`](spotlight_backend/app.js) is the entry point when running under cPanel's Node.js app (Passenger).
- **Web app:** built with `npm run build` and served as static files; [`public/.htaccess`](spotlight_dashboard/public/.htaccess) (Apache) and [`vercel.json`](spotlight_dashboard/vercel.json) send every route to `index.html`.
- **Android:** upload the `.aab` to Google Play Console.

## License

[MIT](LICENSE)
