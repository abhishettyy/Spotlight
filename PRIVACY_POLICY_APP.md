# Spotlight Mobile App Privacy Policy

**Last Updated: July 26, 2026**

Spotlight ("Spotlight", "we", "us", or "our") respects the privacy of its users. This Privacy Policy explains what information we collect, why we collect it, how it is used and shared, and the choices available to users when using the Spotlight mobile application and related services (collectively, the "Services").

By creating an account or using Spotlight, you acknowledge the practices described in this Privacy Policy.

---

## 1. About Spotlight

Spotlight is an event discovery and registration platform that allows users to discover and register for events organized by college clubs.

Events displayed on Spotlight are created and managed by authorized clubs through the Spotlight Club Dashboard.

General users of the Spotlight application can:
* Create and manage a Spotlight account
* Browse available events
* View event details
* Register for events (solo or as a team)
* View information related to their registrations (tickets/passes)
* Use other event-related features provided by Spotlight

General users cannot create or publish events through the Spotlight mobile application.

---

## 2. Information We Collect

### 2.1 Account and Profile Information
When you create or use a Spotlight account, we collect information including:
* **Personal Identifiers:** Full Name, Email address, and Phone number.
* **Academic/Onboarding Details:** College USN (University Seat Number) / Roll Number, Branch, Year of study, and Semester of study.
* **Credentials:** If you sign up directly using an email and password (rather than Google Sign-In), we securely store a cryptographic hash of your password on our servers.
* **Social Auth Profile Details:** If you authenticate via Google Sign-In, we collect your email address, profile display name, and profile picture URL.

This information is used to create, identify, maintain, and secure your Spotlight account and to verify student eligibility for club events.

### 2.2 Event Registration and Payment Information
When you register for an event through Spotlight, we collect information related to your registration, including:
* **Registration Metadata:** Your account identity, name, USN, email address, phone number, registered event, registration status, and date/time of registration.
* **Team Participation Data:** If registering for a team event, we collect your Team Name and generate/process a unique 5-character alphanumeric Team Passkey to link members under a single registration.
* **Payment Verification Data:** For paid events, you pay the organizing club via UPI (by scanning a club-provided QR code or copying their UPI ID). To verify your payment, we collect:
  * The **Transaction ID / UTR Number** of your payment.
  * An **image upload of your payment screenshot (proof of payment)**.
  
This proof of payment is uploaded to secure cloud storage and is shared directly with the organizing club's administrators to verify your registration.

### 2.3 Technical Information and Local Storage
When you use Spotlight, certain technical information may be processed automatically as necessary to operate, secure, troubleshoot, and improve the application.

* **Local Storage:** The mobile app stores your authentication token and user ID locally on your device (using `shared_preferences` secure/local storage) to maintain a persistent logged-in session.
* **API Log Data:** Depending on the technologies used by Spotlight, our backend servers may record IP addresses, device operating-system information, application version, login or authentication activity, crash and error information, and basic usage logs.

We use this information primarily for security, troubleshooting, performance monitoring, and improving Spotlight.

---

## 3. How We Use Your Information

We may use your information to:
* Create and maintain your Spotlight account.
* Authenticate and identify you (including verifying Google Sign-In credentials).
* Allow you to browse, search, and discover events.
* Process your event registrations (both solo and team-based).
* Maintain your registration and ticketing history.
* Provide your registration information, transaction IDs, and uploaded payment proofs to the relevant event-organizing club for approval.
* Deliver in-app notifications regarding event updates or registration status changes.
* Diagnose technical problems and optimize API performance.
* Protect the security and integrity of the Services.
* Detect and prevent fraud, duplicate registrations, and unauthorized activity.
* Provide user support and comply with legal requirements.

We do not sell your personal information.

---

## 4. Event Information

Events available in the Spotlight application are created and managed by authorized clubs through the Spotlight Club Dashboard.

Event information may include:
* Event name, description, venue/location, date/time, and registration deadline.
* Event type (Solo/Team) and associated registration fees.
* Event banners, posters, and the club's payment details (UPI ID and UPI QR codes).
* Organizer or club information.
* Rules, eligibility, or requirements.

Published event information is visible to all Spotlight users. Spotlight users do not create or publish events themselves through the general-user mobile application.

---

## 5. Information Shared With Clubs

When you register for an event, information necessary to manage your participation is shared directly with the club organizing that event. 

Because clubs run registrations independently, the club admins access this data via the Spotlight Club Dashboard. Shared information includes:
* Your Name, College USN / Roll Number, Email address, and Phone number.
* Your registration status, Team details (if applicable), UPI Transaction ID (UTR), and the uploaded image of your payment proof.

The information is provided to the relevant club for purposes such as identifying participants, managing registrations, approving payments, communicating event updates, and conducting the event.

Clubs are expected to use participant information only for legitimate purposes connected with the event. Registering for one club's event does not share your registration information with other, unrelated clubs.

---

## 6. Information Visible to Other Users

Your private account information is not publicly displayed to all Spotlight users. Information such as your email address, phone number, and College USN will not be visible to general users of the app.

However:
* Relevant registration details are accessible to the club organizing the event.
* If you participate in a team event, your team name, passkey, and the names of your fellow team members are visible to you and the members who join your team.

---

## 7. How We Share Information (Third-Party Services)

We do not sell or rent your personal information. We share or make information available in the following circumstances:

### Event-Organizing Clubs
When you register for an event, relevant registration details, transaction numbers, and payment proofs are shared with the club responsible for organizing that event.

### Third-Party Service Providers
We rely on trusted third-party providers to support our platform infrastructure. These providers process information on our behalf strictly under our instructions:

* **Authentication & Identity:** 
  * **Google Sign-In API:** We use Google Sign-in to authenticate users on the mobile application, retrieving email, profile name, and profile photos.
  * **Google OAuth 2.0 API:** Our servers call Google APIs to verify identity tokens passed by the mobile app.
  * **Clerk (Clerk Auth):** Used to manage authentication and sessions for club administrators and dashboard users.
* **Storage and Hosting Infrastructure:**
  * **Supabase Storage:** All uploaded media—specifically user-uploaded payment screenshots, club logos, and event banner images—are securely stored on Supabase cloud storage buckets (`spotlight-images`).
  * **Database Infrastructure:** Our backend utilizes PostgreSQL database servers to store user accounts, registration records, notifications, and event details.

### Legal and Safety Requirements
We may disclose information where reasonably necessary to comply with applicable laws, regulations, or legal processes, protect the safety of users, investigate suspected fraud, or enforce terms and policies.

---

## 8. Data Storage and Security

We use reasonable technical and organizational safeguards designed to protect personal information from unauthorized access, disclosure, alteration, loss, or misuse. These measures include server-side API access controls, secure JWT verification, and encrypted transmission (HTTPS).

However, no application, database, transmission method, or electronic storage system can guarantee absolute security. 

Users are responsible for keeping their account credentials secure and should not share passwords, one-time passwords, verification codes, or other authentication information with others.

---

## 9. Data Retention

We retain personal information for as long as reasonably necessary to provide Spotlight and fulfill the purposes described in this Privacy Policy:
* Your Spotlight account profile remains active until deletion.
* Your event registrations and payment records are maintained to provide proof of entry to events and historical logs.
* When information is no longer reasonably required, we may delete or anonymize it. 

Certain information may remain temporarily in encrypted backups, database logs, or security systems after deletion where technically necessary.

---

## 10. Account and Data Deletion

Users may request deletion of their Spotlight account and associated personal information using the account deletion functionality provided within the Spotlight mobile app profile settings, or by contacting us through our support channel.

Upon processing a valid account deletion request, we will delete or anonymize personal information associated with the account, except where certain information must reasonably be retained for:
* Legal obligations.
* Security or fraud/abuse prevention.
* Dispute resolution or event audit histories.

---

## 11. Notifications and Device Permissions

Spotlight may request permission to access specific device capabilities to perform key features:

* **Camera & Photo Gallery Access (via Image Picker):** Needed to select and upload a payment proof screenshot when registering for paid events.
* **Clipboard Permissions:** Facilitated to copy the club's UPI ID or the generated registration reference code, improving user payment convenience.
* **In-App Notifications:** Used to deliver critical notifications (such as registration approvals, event cancellations, or team member updates) directly inside the app's notification feed.
* **External Application Launcher:** Used to launch standard external browsers or device-installed UPI payment applications to complete registration fee transfers.

Users can manage these permissions at any time through their device settings. Disabling certain permissions may restrict the availability of associated features.

---

## 12. Children's Privacy

Spotlight is intended for students and users who meet the minimum age requirements applicable to use college event discovery services. We do not knowingly collect personal information from children in violation of applicable legal requirements. If we identify that a child's information has been collected improperly, we will take steps to purge this data from our database.

---

## 13. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect changes to our services, backend technologies, or regulatory requirements. When significant changes are made, we will update the "Last Updated" date at the top of this policy and notify users through appropriate in-app notifications.

---

## 14. Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy, your account data, or deletion requests, please contact us:

**Spotlight Support**

* **Email:** [OFFICIAL SPOTLIGHT SUPPORT EMAIL]
* **Website:** [SPOTLIGHT WEBSITE URL]

*Note: You may also request account deletion or data corrections directly through the Settings screen in the Spotlight mobile app.*
