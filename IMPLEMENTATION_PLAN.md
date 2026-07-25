# One-Time Registration Key Verification System (Option A)

Implement a secure, single-use invite code verification system for Spotlight club registrations to ensure only authorized college clubs can create an account.

## User Review Required

> [!IMPORTANT]
> **Option A (2-Step Gate Flow)** has been selected:
> 1. **Step 1 (Security Gate)**: Club enters their One-Time Authorization Key.
> 2. **Step 2 (Registration Form)**: Form unlocks upon successful key verification.
> 3. **Single-Use Invalidation**: Once registration completes, the used key is immediately burned and logged in PostgreSQL, and a fresh active key is auto-generated.

## Proposed Changes

### Backend

#### [MODIFY] [schema.prisma](file:///d:/Spotlight/spotlight_backend/prisma/schema.prisma)
Add a `RegistrationKey` model to store auto-generated and developer-generated invite codes:
```prisma
model RegistrationKey {
  id           String    @id @default(uuid())
  code         String    @unique
  isUsed       Boolean   @default(false)
  usedByClubId String?
  createdAt    DateTime  @default(now())
  usedAt       DateTime?
}
```

---

#### [MODIFY] [routes/clubs.ts](file:///d:/Spotlight/spotlight_backend/routes/clubs.ts)
- Add `ensureActiveRegistrationKey()` helper: Auto-generates a fresh `SPOTLIGHT-XXXX-XXXX` key if no unused key exists.
- Add `POST /clubs/verify-key`: Checks if a key is valid and unused.
- Modify `POST /clubs/register`:
  - Enforces `key` validation before creating a club.
  - Marks key as `isUsed = true`, stores `usedByClubId` and `usedAt`.
  - Instantly generates a new active key for future registrations.
- Add Admin Endpoints:
  - `GET /clubs/registration-keys`: Lists active keys & historical usage logs.
  - `POST /clubs/registration-keys/generate`: Allows developers to create custom invite codes (e.g., `CLUB-ROTARACT-2026`).

---

### Frontend

#### [MODIFY] [api.ts](file:///d:/Spotlight/spotlight_dashboard/src/app/api.ts)
- Add `verifyRegistrationKey(key)` API helper.
- Update `clubRegister` API signature to send the verified key.

---

#### [MODIFY] [App.tsx](file:///d:/Spotlight/spotlight_dashboard/src/app/App.tsx)
- Update `AuthPage` **Sign Up** tab to use the **2-Step Gate Flow**:
  - **Step 1 (Lock Screen)**: Input for *Authorization Key*. Clean dark glassmorphic UI with inline error messages for invalid/used keys.
  - **Step 2 (Club Registration Form)**: Displays after key verification with key locked in. Submitting registers the club and invalidates the key.

---

## Verification Plan

### Automated / API Verification
1. Run `npx prisma db push` to update PostgreSQL database tables.
2. Test key verification with a valid key vs invalid key via API requests.

### Manual Verification
1. Open Spotlight Dashboard -> Navigate to **Sign Up**.
2. Verify Step 1 (Security Lock Screen) appears.
3. Try entering an invalid key -> Verify red error message: *"Invalid or expired registration key."*
4. Enter the active key from database -> Click **Verify & Continue**.
5. Fill in Club Registration details -> Submit.
6. Check database to verify:
   - Key status updated to `isUsed = true` with `usedAt` timestamp.
   - A new active key was auto-generated.
7. Try re-using the same key -> Verify it is rejected immediately.
