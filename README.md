# 🌟 Spotlight: Campus Event Management Ecosystem

Spotlight is a premium, modern, full-stack campus event management platform. Designed for university clubs and students, it delivers a high-fidelity visual experience with glassmorphism layouts, buttery-smooth interactive animations, and manual payment moderation pipelines.

The Spotlight ecosystem consists of a **TypeScript REST API backend**, a **Vite + React admin dashboard web console**, and a **natively compiled Flutter mobile companion app**.

---

## 🏗️ Ecosystem Architecture

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
# Navigate into backend directory
cd spotlight_backend

# Install package dependencies
npm install

# Run database migrations with Prisma
npx prisma db push

# Start the TypeScript development server
npm run dev
```
*API server cleanly listens on port `5000` (e.g. `http://localhost:5000/api`).*

---

### 2. Launching the Admin Console (`spotlight_dashboard`)
Run the Vite development server to launch the reactive glassmorphic console:

```bash
# Navigate into dashboard directory
cd ../spotlight_dashboard

# Install packages
npm install

# Spin up Vite local server
npm run dev
```
*Dashboard console is accessible at `http://localhost:5173/`.*

---

### 3. Launching the Companion App (`spotlight_flutter`)
Start your favorite Android/iOS emulator or connect a physical device, and run:

```bash
# Navigate into flutter directory
cd ../spotlight_flutter

# Get dependencies
flutter pub get

# Run the native app
flutter run
```

---

## 📈 Git & Version Control

To push additional enhancements or fixes to the remote repository, ensure that local secrets are shielded by `.gitignore` rules:

```bash
# Stage changes safely
git add .

# Commit updates
git commit -m "feat: implement real-time background polling and aesthetic improvements"

# Push to Github main branch
git push origin main
```

---
*© 2026 SPOTLIGHT · Crafted with care for the modern campus experience.*
