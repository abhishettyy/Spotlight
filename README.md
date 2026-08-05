<div align="center">

<img src="./assets/favicon.png" alt="Spotlight Logo" width="140" height="140" />

# ✨ Spotlight

### The Complete Campus Event Management Ecosystem

**Discover. Register. Verify. Check-In. All in one place.**

[![License: MIT](https://img.shields.io/badge/License-MIT-FFC107?style=for-the-badge&labelColor=1a1a2e)](#-license)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white&labelColor=1a1a2e)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=1a1a2e)](#)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=1a1a2e)](#)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?style=for-the-badge&logo=flutter&logoColor=white&labelColor=1a1a2e)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white&labelColor=1a1a2e)](#)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white&labelColor=1a1a2e)](#)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white&labelColor=1a1a2e)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-00C896?style=for-the-badge&labelColor=1a1a2e)](#-contributing)

</div>

---

## 📖 Table of Contents

- [Introduction](#-introduction)
- [Why Spotlight](#-why-spotlight)
- [Experience Highlights](#-experience-highlights)
- [Features](#-features)
- [Architecture](#-architecture)
- [Registration Flows](#-registration-flows)
- [Folder Structure](#-folder-structure)
- [Tech Stack](#-tech-stack)
- [Database Design](#-database-design)
- [Authentication Flow](#-authentication-flow)
- [Backend API](#-backend-api)
- [Dashboard](#-dashboard-club-organizer-console)
- [Flutter App](#-flutter-app-student-experience)
- [Admin Portal](#-admin-portal-developer-console)
- [Security](#-security)
- [Future Improvements](#-future-improvements)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [API Examples](#-api-examples)
- [Project Workflow](#-project-workflow)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Introduction

**Spotlight** is a modern, premium campus event management ecosystem built to simplify how colleges organize, manage, and experience events. Instead of relying on scattered Google Forms, spreadsheets, WhatsApp groups, and manual verification, Spotlight brings the **complete event lifecycle** into one connected platform.

The ecosystem links **students**, **club organizers**, and **platform administrators** through four tightly integrated applications, so that every stage of an event — from discovery to check-in — happens digitally, securely, and in real time.

> Spotlight isn't just a registration form. It's the operating system for campus events. 🚀

---

## 💡 Why Spotlight

Campus events today are powered by a patchwork of disconnected tools:

| Problem | Traditional Approach | Spotlight's Solution |
|---|---|---|
| 📋 Registrations | Google Forms + manual spreadsheets | Structured solo/team registration with validation |
| 💸 Payment proof | Screenshots sent over WhatsApp | In-app upload with organizer verification workflow |
| 🎟️ Entry tickets | Printed lists / honor system | Secure QR-coded digital tickets |
| 🔔 Updates | Manual messages to each participant | Automated real-time notifications |
| 📊 Analytics | None, or manual Excel counts | Live analytics dashboard for organizers |
| 🔐 Club onboarding | Anyone can "claim" to run an event | Invite-key controlled, admin-approved onboarding |
| 🧾 Data hygiene | Duplicate/inconsistent entries | Centralized relational database with validation |

Spotlight exists because **campus events deserve infrastructure**, not duct tape. It gives clubs professional-grade tooling and gives students an experience that feels like booking a flight, not filling out a form.

---

## 🖼️ Experience Highlights

A quick tour of what each surface of Spotlight feels like to use:

| Surface | What You See |
|---|---|
| 🎓 **Student Home** | A clean, card-based feed of upcoming events, filterable by club, category, and date, with a floating "My Tickets" shortcut |
| 📄 **Event Details** | Full event breakdown — fee, capacity, rules, organizing club, and a single prominent **Register** action |
| 🎟️ **QR Wallet** | A scrollable wallet of confirmed tickets, each rendered as a card with a live QR code and event metadata |
| 🧑‍💼 **Organizer Dashboard** | A stats-first home screen showing pending approvals, live registrations, and revenue at a glance |
| 🧾 **Registration Management** | A searchable, filterable table of every participant with inline status badges (Pending / Confirmed / Rejected) |
| 📈 **Analytics** | Animated charts tracking registration velocity, revenue trends, and turnout percentage per event |
| 🛡️ **Admin Portal** | A minimal, high-contrast console for issuing invite keys and approving new clubs |
| 📷 **QR Scanner** | A full-screen camera view with instant success/error feedback on every scan |

> 💡 Once the UI is built out, this section is a great place to drop real screenshots or a short product demo GIF.

---

## 🧩 Features

### 👨‍🎓 For Students

| Feature | Description |
|---|---|
| 🔍 Event Discovery | Browse and filter events by club, category, date, and fee type |
| 🏛️ Club Directory | Explore all verified clubs and their upcoming events |
| 📝 Solo Registration | One-tap registration for individual events |
| 👥 Team Registration | Create or join teams with member validation |
| 💳 Payment Uploads | Upload proof of payment for paid events |
| 🔔 Notifications | Real-time status updates (approved / rejected / pending) |
| 🎟️ QR Wallet | All confirmed tickets stored digitally with unique QR codes |
| 📱 Status Tracking | Live registration status across every event |

### 🧑‍💼 For Club Organizers

| Feature | Description |
|---|---|
| 🗓️ Event Creation | Create free or paid events with custom rules |
| 🧾 Registration Management | View, filter, and manage every participant |
| ✅ Payment Verification | Approve or reject uploaded payment proofs |
| 👥 Team Oversight | Manage team rosters and member eligibility |
| 📤 Data Export | Export participant lists to CSV |
| 📷 QR Check-In | Scan tickets at the venue for instant validation |
| 📊 Live Analytics | Track registrations, revenue, and turnout in real time |

### 🛠️ For Developers / Admins

| Feature | Description |
|---|---|
| 🔑 Invitation Keys | Generate single-use, time-bound onboarding keys |
| 🏢 Club Access Control | Approve which clubs can register on the platform |
| 🧑‍💻 Ecosystem Management | Full administrative oversight of the platform |

### 🌐 Platform-Wide

- 🔐 **Authentication** — Clerk-powered, JWT-secured, synced to the database
- 📡 **Real-Time Notifications** — Instant registration status updates
- 🎨 **Responsive Design** — Fluid layouts across mobile, tablet, and desktop
- ⚡ **Modern Stack** — TypeScript, Prisma, PostgreSQL, React, Flutter

---

## 🏗️ Architecture

```mermaid
flowchart TB
    subgraph Clients["📱 Client Applications"]
        FLUTTER["Spotlight Mobile<br/>(Flutter)"]
        DASH["Spotlight Dashboard<br/>(React + Vite)"]
        ADMIN["Spotlight Admin Portal<br/>(React + Vite)"]
    end

    subgraph Edge["🔐 Auth Layer"]
        CLERK["Clerk Authentication"]
    end

    subgraph Core["⚙️ Spotlight Backend"]
        API["Express + TypeScript API"]
        JWT["JWT Middleware"]
        PRISMA["Prisma ORM"]
    end

    subgraph Data["🗄️ Data Layer"]
        PG[("PostgreSQL Database")]
        SUPA[("Supabase Storage<br/>(Payment Proofs / Assets)")]
    end

    FLUTTER -->|HTTPS / REST| API
    DASH -->|HTTPS / REST| API
    ADMIN -->|HTTPS / REST| API

    FLUTTER --> CLERK
    DASH --> CLERK
    ADMIN --> CLERK
    CLERK -->|User Sync Webhook| API

    API --> JWT
    JWT --> PRISMA
    PRISMA --> PG
    API -->|Upload / Fetch Files| SUPA

    style Clients fill:#1e1b4b,color:#fff
    style Edge fill:#4c1d95,color:#fff
    style Core fill:#0f172a,color:#fff
    style Data fill:#052e2b,color:#fff
```

---

## 🔁 Registration Flows

### 🆓 Free Event Registration

```mermaid
flowchart LR
    A["Student Opens Event"] --> B["Clicks Register"]
    B --> C{"Slots Available?"}
    C -->|No| D["Registration Closed"]
    C -->|Yes| E["Registration Created<br/>(Status: CONFIRMED)"]
    E --> F["QR Ticket Generated"]
    F --> G["Notification Sent"]
    G --> H["Ticket Added to Wallet"]
```

### 💰 Paid Event Registration

```mermaid
flowchart LR
    A["Student Opens Event"] --> B["Clicks Register"]
    B --> C["Fills Registration Details"]
    C --> D["Uploads Payment Proof"]
    D --> E["Registration Created<br/>(Status: PENDING)"]
    E --> F["Organizer Reviews Proof"]
    F --> G{"Approved?"}
    G -->|Yes| H["Status: CONFIRMED"]
    G -->|No| I["Status: REJECTED"]
    H --> J["QR Ticket Generated"]
    J --> K["Notification: Approved 🎉"]
    I --> L["Notification: Rejected ❌"]
```

### 👥 Team Registration

```mermaid
flowchart LR
    A["Team Leader Creates Team"] --> B["Sets Team Name"]
    B --> C["Invites / Adds Members"]
    C --> D{"Team Size Valid?"}
    D -->|No| E["Show Validation Error"]
    D -->|Yes| F{"Event is Paid?"}
    F -->|Yes| G["Leader Uploads Payment Proof"]
    F -->|No| H["Team Registration Created"]
    G --> I["Status: PENDING"]
    I --> J["Organizer Verifies Payment"]
    J --> K{"Approved?"}
    K -->|Yes| H
    K -->|No| L["Status: REJECTED"]
    H --> M["QR Tickets Generated for All Members"]
    M --> N["Notifications Sent to Team"]
```

### 📷 QR Check-In

```mermaid
flowchart LR
    A["Organizer Opens Scanner"] --> B["Scans Participant QR Code"]
    B --> C{"Valid Ticket?"}
    C -->|No| D["Show Error: Invalid / Expired"]
    C -->|Yes| E{"Already Checked In?"}
    E -->|Yes| F["Show Warning: Duplicate Entry"]
    E -->|No| G["Mark Attendance: CHECKED_IN"]
    G --> H["Update Live Attendance Count"]
    H --> I["Show Success + Participant Info"]
```

---

## 📁 Folder Structure

```
spotlight/
├── spotlight_backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── profiles.routes.ts
│   │   │   ├── clubs.routes.ts
│   │   │   ├── events.routes.ts
│   │   │   ├── registrations.routes.ts
│   │   │   └── notifications.routes.ts
│   │   ├── controllers/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── services/
│   │   ├── utils/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── config/
│   │   └── index.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── spotlight_dashboard/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardHome/
│   │   │   ├── Events/
│   │   │   ├── Registrations/
│   │   │   ├── PaymentVerification/
│   │   │   ├── QRScanner/
│   │   │   └── Analytics/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
├── spotlight_admin/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login/
│   │   │   ├── InviteKeys/
│   │   │   ├── ClubApprovals/
│   │   │   └── Overview/
│   │   ├── components/
│   │   ├── lib/
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
│
├── spotlight_flutter/
│   ├── lib/
│   │   ├── screens/
│   │   │   ├── onboarding/
│   │   │   ├── home/
│   │   │   ├── event_details/
│   │   │   ├── registration/
│   │   │   ├── wallet/
│   │   │   ├── notifications/
│   │   │   └── profile/
│   │   ├── widgets/
│   │   ├── providers/
│   │   ├── services/
│   │   ├── models/
│   │   └── main.dart
│   ├── pubspec.yaml
│   └── android/ ios/
│
├── docs/
│   └── assets/
│       └── logo.png
│
├── LICENSE
└── README.md
```

---

## 🧪 Tech Stack

<div align="center">

**Backend**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

**Auth & Storage**

![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

**Dashboard & Admin**

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)

**Mobile**

![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)
![Dart](https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white)

</div>

<br>

| Layer | Technology | Purpose |
|---|---|---|
| **Backend Runtime** | Node.js | Server runtime environment |
| **Backend Framework** | Express | REST API routing & middleware |
| **Language** | TypeScript | Type-safe backend & frontend code |
| **ORM** | Prisma | Type-safe database access layer |
| **Database** | PostgreSQL | Primary relational data store |
| **Authentication** | Clerk | Identity provider & session management |
| **Authorization** | JWT | Stateless API request authentication |
| **File Storage** | Supabase Storage | Payment proofs, images, assets |
| **Dashboard Framework** | React + Vite | Club organizer web console |
| **Styling** | Tailwind CSS | Utility-first responsive design |
| **Animation** | Framer Motion | Smooth, premium UI transitions |
| **Icons** | Lucide Icons | Consistent iconography |
| **Admin Portal** | React + Vite + Tailwind | Developer & platform management |
| **Mobile Framework** | Flutter (Dart) | Cross-platform student app |
| **State Management** | Provider | Flutter app state handling |

---

## 🗃️ Database Design

Spotlight's schema is built around seven core entities that model the entire event lifecycle.

```mermaid
erDiagram
    Profile ||--o{ Registration : creates
    Profile ||--o{ Club : "administers (optional)"
    Club ||--o{ Event : hosts
    Club ||--o{ RegistrationKey : "onboarded via"
    Event ||--o{ Registration : receives
    Event ||--o{ Team : "may have"
    Team ||--o{ Registration : contains
    Profile ||--o{ Notification : receives

    Profile {
        string id PK
        string clerkId
        string name
        string email
        string role
    }
    Club {
        string id PK
        string name
        string description
        string status
    }
    Event {
        string id PK
        string title
        string category
        boolean isPaid
        boolean isTeamEvent
        int capacity
        datetime startAt
    }
    Team {
        string id PK
        string name
        string eventId FK
        string leaderId FK
    }
    Registration {
        string id PK
        string eventId FK
        string profileId FK
        string teamId FK
        string status
        string qrCode
    }
    Notification {
        string id PK
        string profileId FK
        string message
        boolean isRead
    }
    RegistrationKey {
        string id PK
        string code
        boolean isUsed
        string clubId FK
    }
```

| Entity | Description |
|---|---|
| **Profile** | Represents any platform user (student, organizer, or admin), synced from Clerk |
| **Club** | A registered campus organization allowed to host events |
| **Event** | A single event with metadata such as fee, capacity, and schedule |
| **Team** | A group of participants registering together for a team event |
| **Registration** | Links a Profile (or Team) to an Event, tracks status and QR data |
| **Notification** | System-generated updates delivered to a Profile |
| **RegistrationKey** | Single-use invitation code that grants a Club onboarding access |

---

## 🔐 Authentication Flow

Spotlight uses **Clerk** as the identity provider across all client applications, with backend-issued **JWTs** securing every API request.

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client App
    participant CL as Clerk
    participant API as Spotlight Backend
    participant DB as PostgreSQL

    U->>C: Sign up / Sign in
    C->>CL: Authenticate
    CL-->>C: Session + Clerk User ID
    CL->>API: Webhook (user.created / user.updated)
    API->>DB: Upsert Profile record
    C->>API: Request with Clerk session token
    API->>API: Verify token & attach JWT context
    API->>DB: Authorize & fetch resource
    API-->>C: Response
```

1. A user signs up or logs in through Clerk on any client (Dashboard, Admin, or Flutter app).
2. Clerk issues a session and fires a webhook to the backend.
3. The backend **syncs** the Clerk user into the local `Profile` table, assigning a role.
4. Every subsequent API request carries the Clerk session token, which the backend verifies and maps to an internal JWT-authorized context.
5. Role-based middleware then authorizes access to student, organizer, or admin-only routes.

---

## 🔌 Backend API

| Router | Base Path | Responsibility |
|---|---|---|
| **auth** | `/api/auth` | Session verification, Clerk webhook handling, role assignment |
| **profiles** | `/api/profiles` | Fetch/update user profile data |
| **clubs** | `/api/clubs` | Club creation, approval, and directory listing |
| **events** | `/api/events` | Event creation, editing, discovery, and filtering |
| **registrations** | `/api/registrations` | Solo/team registration, payment proof, approval, QR generation |
| **notifications** | `/api/notifications` | Fetch, mark-as-read, and push notification triggers |

### `auth`
Handles Clerk webhook ingestion, verifies incoming session tokens on protected routes, and issues role-scoped authorization context used by every downstream router.

### `profiles`
Exposes endpoints to retrieve the logged-in user's profile, update display information, and allow admins to look up any profile by ID.

### `clubs`
Manages the full club lifecycle — from an admin approving a new club via an invitation key, to public endpoints that list verified clubs for student browsing.

### `events`
Powers event creation for organizers (with support for free/paid and solo/team configurations) and discovery for students, including filtering by category, club, and date.

### `registrations`
The most complex router — handles solo and team registration creation, payment proof uploads, organizer approval/rejection, QR ticket generation, and check-in validation.

### `notifications`
Delivers status-change notifications (registration approved, rejected, event reminders) and exposes read/unread state management for clients.

---

## 🖥️ Dashboard (Club Organizer Console)

| Page | Purpose |
|---|---|
| **Dashboard Home** | Snapshot of active events, pending approvals, and quick stats |
| **Events** | Create, edit, publish, and archive events |
| **Registrations** | View and filter every participant per event |
| **Payment Verification** | Review uploaded payment proofs and approve/reject |
| **QR Scanner** | Camera-based check-in tool for event day |
| **Analytics** | Charts for registrations over time, revenue, and turnout |

---

## 📱 Flutter App (Student Experience)

| Screen | Purpose |
|---|---|
| **Onboarding** | Sign up / sign in via Clerk |
| **Home** | Browse featured and upcoming events |
| **Event Details** | View full event info, fee, capacity, and rules |
| **Registration** | Solo or team registration with payment upload |
| **Wallet** | All confirmed QR tickets in one place |
| **Notifications** | Real-time registration status feed |
| **Profile** | Manage account details and view registration history |

---

## 🛡️ Admin Portal (Developer Console)

| Page | Purpose |
|---|---|
| **Login** | Restricted access for platform administrators |
| **Invite Keys** | Generate and revoke single-use club onboarding keys |
| **Club Approvals** | Review and approve/reject club onboarding requests |
| **Overview** | Platform-wide stats: total clubs, events, and registrations |

---

## 🔒 Security

Spotlight is built with a security-first mindset across every layer:

- 🔑 **JWT** — Every API request beyond public routes requires a valid, verified token
- 🪪 **Clerk** — Delegated, industry-standard identity and session management
- 🔐 **Password Hashing** — Credential handling is fully delegated to Clerk's secure infrastructure (no plaintext storage, ever)
- 🎟️ **Invite Keys** — Single-use, expirable codes gate which clubs may onboard onto the platform
- 🧑‍⚖️ **Authorization** — Role-based access control (Student / Organizer / Admin) enforced at the middleware layer
- ✅ **Validation** — Strict request schema validation on every mutating endpoint to prevent malformed or malicious input

---

## 🚀 Future Improvements

1. 🔔 Push notifications (FCM / APNs)
2. 🎓 Auto-generated event certificates
3. 📊 Attendance analytics & heatmaps
4. 📅 Calendar integration (Google/Outlook sync)
5. ⭐ Post-event feedback & ratings
6. 🏆 Club and student leaderboards
7. 🤖 AI-based event recommendations
8. 🗺️ Interactive campus maps for venues
9. 🤝 Sponsor management module
10. 🏫 Multi-college / multi-tenant support
11. 💬 In-app organizer-participant chat
12. 🌙 Dark mode across all clients
13. 🌐 Multi-language support
14. 💳 Integrated payment gateway (Razorpay/Stripe)
15. 📦 Bulk event import via CSV
16. 🧾 Auto-generated invoices for paid events
17. 📈 Predictive turnout forecasting
18. 🛎️ Waitlist system for full events
19. 🧑‍🤝‍🧑 Alumni-exclusive event access
20. 🔍 Full-text search across events and clubs

---

## ⚙️ Installation

### Prerequisites

- Node.js ≥ 20.x
- PostgreSQL ≥ 15
- Flutter SDK ≥ 3.x
- pnpm / npm / yarn
- A Clerk account
- A Supabase project

### 1️⃣ Spotlight Backend

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
