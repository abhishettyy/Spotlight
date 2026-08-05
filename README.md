# 🌟 Spotlight: Campus Event Management Ecosystem

Spotlight is a premium, modern, full-stack campus event management platform. Designed for university clubs and students, it delivers a high-fidelity visual experience with glassmorphism layouts, buttery-smooth interactive animations, and manual payment moderation pipelines.

The Spotlight ecosystem consists of a **TypeScript REST API backend**, a **Vite + React admin dashboard web console**, and a **natively compiled Flutter mobile companion app**.

---

## 🏗️ Architecture

```
                               ┌────────────────────────┐
                               │   Spotlight Database   │
                               │      (PostgreSQL)      │
                               └───────────┬────────────┘
                                           │
                                  [ Prisma Client ]
                                           │
                               ┌───────────▼────────────┐
                               │   spotlight_backend    │
                               │   (TypeScript/Express) │
                               └───────────┬────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
           ┌────────────────────────┐            ┌────────────────────────┐
           │  spotlight_dashboard   │            │   spotlight_flutter    │
           │  (React Admin Portal)  │            │  (Mobile Student App)  │
           └────────────────────────┘            └────────────────────────┘
```

*   📂 **`spotlight_backend`**: Node.js & TypeScript API server powered by PostgreSQL and Prisma ORM. Handles JWT auth, Clerk integration, real-time background cron-reminders, and transactional team signups.
*   📂 **`spotlight_dashboard`**: Admin web application built with React, Vite, and Tailwind CSS v4. Features a liquid event builder, payment screenshot moderation panels, and premium micro-confetti feedback triggers.
*   📂 **`spotlight_flutter`**: Mobile application compiled for iOS and Android. Built with Dart and Provider state management, supporting offline caching, QR check-ins, and team sharing.

---

## ✨ Core Features

*   🎭 **Liquid Event Builder**: Launch club events dynamically with step-by-step builders, custom fee structures, and capacity limits.
*   🔒 **Dual-Core Authentication**: Integrates social Google Auth (synced automatically via Clerk) with fallback custom credentials (hashed using Bcrypt).
*   🎫 **Smart Digital Ticketing**: Natively renders QR codes containing verified ticket IDs for on-the-spot checkout.
*   👥 **UX-Optimized Team Signups**: Generate unique **5-character alphanumeric passkeys** allowing teammates to join group events in under 10 seconds.
*   💳 **Screenshot Verification pipeline**: Allows students to scan UPI QR codes directly inside the app, upload payment screenshots, and undergo manual review by administrators.
*   📅 **Real-Time Notification Services**: Automatically polls database states to instantly trigger registration alerts, in-app notifications, and daily cron-event reminders.

---

## 🛠️ Technology Stack

| Domain | Tech / Framework | Key Libraries & SDKs |
| :--- | :--- | :--- |
| **Backend API** | Node.js (TypeScript) | Express, Prisma ORM, Clerk SDK, BcryptJS, PostgreSQL (`pg`) |
| **Admin Web Console** | React (Vite) | Tailwind CSS v4, Framer Motion (`motion`), canvas-confetti, Lucide |
| **Mobile Client** | Flutter (Dart) | Provider State, Google Fonts, qr_flutter, image_picker, HTTP |

---

## 🗄️ Database Schema & Models

Spotlight leverages a PostgreSQL database structure designed for absolute relational integrity:

*   **`Profile`**: Synced with Clerk User IDs. Captures academic registration data (`USN`, `branch`, `sem`). Can be promoted to a `Club` administrator.
*   **`Club`**: Holds branding assets (`logoUrl`), payment details (`upiId`, `qrUrl`), and references to admin profiles and active events.
*   **`Event`**: Stores dates, fees, banner images, and organizer IDs. Supports both Solo and Team event categories.
*   **`Team`**: Group entity linking a leader, team name, and members via a secure, unique `passkey`.
*   **`Registration`**: Core transaction ledger mapping a profile to an event with status enums (`PENDING` / `CONFIRMED`).

---

## 🚀 Setting Up the Project

### Prerequisite Configuration
Create a `.env` file inside both `spotlight_backend` and `spotlight_dashboard` matching the variables defined in their respective `.env.example` templates.

---

### 1. Launching the Backend (`spotlight_backend`)
Navigate into the backend workspace to install dependencies and boot the Express API server:

```bash
cd spotlight_backend
npm install
cp .env.example .env      # fill in your credentials
npx prisma migrate dev
npx prisma generate
npm run dev
```

### 2️⃣ Spotlight Dashboard

```bash
cd spotlight_dashboard
npm install
cp .env.example .env
npm run dev
```

### 3️⃣ Spotlight Admin Portal

```bash
cd spotlight_admin
npm install
cp .env.example .env
npm run dev
```

### 4️⃣ Spotlight Flutter App

```bash
cd spotlight_flutter
flutter pub get
flutter run
```

---

## 🔧 Environment Variables

### `spotlight_backend/.env.example`

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/spotlight"

# Clerk
CLERK_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxx"
CLERK_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxx"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Supabase Storage
SUPABASE_URL="https://xxxxxxxxxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="xxxxxxxxxxxxxxxx"
SUPABASE_BUCKET="spotlight-uploads"
```

### `spotlight_dashboard/.env.example`

```env
VITE_API_BASE_URL="http://localhost:4000/api"
VITE_CLERK_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxxxxxx"
```

### `spotlight_admin/.env.example`

```env
VITE_API_BASE_URL="http://localhost:4000/api"
VITE_CLERK_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxxxxxx"
```

### `spotlight_flutter/.env`

```env
API_BASE_URL=http://localhost:4000/api
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxx
```

---

## 📡 API Examples

### Register for a Solo Event

**Request**

```http
POST /api/registrations/solo
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventId": "evt_8f2a1c",
  "paymentProofUrl": "https://storage.spotlight.app/proofs/8f2a1c-user92.jpg"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "registrationId": "reg_3d91fe",
    "status": "PENDING",
    "eventId": "evt_8f2a1c",
    "createdAt": "2026-08-05T10:12:00Z"
  }
}
```

### Approve a Registration

**Request**

```http
PATCH /api/registrations/reg_3d91fe/approve
Authorization: Bearer <organizer_token>
```

**Response**

```json
{
  "success": true,
  "data": {
    "registrationId": "reg_3d91fe",
    "status": "CONFIRMED",
    "qrCode": "SPTLGHT-REG-3D91FE-9X02",
    "notifiedAt": "2026-08-05T10:20:11Z"
  }
}
```

### Check In via QR

**Request**

```http
POST /api/registrations/check-in
Authorization: Bearer <organizer_token>
Content-Type: application/json

{
  "qrCode": "SPTLGHT-REG-3D91FE-9X02"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "registrationId": "reg_3d91fe",
    "attendee": "Priya Sharma",
    "checkedInAt": "2026-08-05T14:02:45Z"
  }
}
```

---

## 🔄 Project Workflow

```mermaid
flowchart TD
    A["🎓 Student Opens App"] --> B["📝 Registers for Event"]
    B --> C["💳 Payment (if applicable)"]
    C --> D["🧑‍💼 Organizer Approval"]
    D --> E["🎟️ QR Ticket Generated"]
    E --> F["📷 Check-In at Venue"]
    F --> G["✅ Event Complete"]

    style A fill:#1e1b4b,color:#fff
    style B fill:#312e81,color:#fff
    style C fill:#4c1d95,color:#fff
    style D fill:#6d28d9,color:#fff
    style E fill:#7c3aed,color:#fff
    style F fill:#059669,color:#fff
    style G fill:#047857,color:#fff
```

---

## 🤝 Contributing

Contributions make the open-source community an incredible place to learn, build, and grow. Any contribution is **greatly appreciated**.

1. 🍴 Fork the repository
2. 🌿 Create your feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 Commit your changes (`git commit -m "Add some amazing feature"`)
4. 📤 Push to the branch (`git push origin feature/amazing-feature`)
5. 🔁 Open a Pull Request

Please make sure to:

- Follow the existing code style and conventions
- Write clear, descriptive commit messages
- Add/update tests where relevant
- Update documentation for any user-facing changes

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">

### Built with ❤️ to modernize campus events.

**Spotlight** — turning chaotic event logistics into a seamless digital experience.

⭐ If you find this project useful, consider giving it a star!

</div>
