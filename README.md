# SoHo Web

Premium end-to-end web platform for SoHo Cleaning Group.

Built for a luxury cleaning experience focused on Manhattan and NYC customers, this platform handles:

- Customer onboarding
- Professional onboarding
- Booking management
- Scheduling
- User dashboards
- Professional dashboards
- Admin operations
- Real-time workflows
- Premium UI/UX

---

# Tech Stack

## Frontend
- Next.js 15 (App Router)
- React
- TypeScript
- TailwindCSS

## Backend
- Next.js Server Actions / Route Handlers
- Prisma ORM
- Supabase PostgreSQL

## Authentication
- Supabase Auth

## Database
- PostgreSQL (Supabase)

## Deployment
- Vercel

---

# Features

## Customer Features
- User onboarding
- Instant cleaning request
- Booking management
- Real-time status updates
- Recurring cleaning setup
- Secure authentication

## Professional Features
- Professional onboarding
- Availability management
- Job assignments
- Earnings tracking
- Profile verification

## Admin Features
- Booking management
- Cleaner assignment
- Dashboard analytics
- Customer management
- Operations management

---

# Branding

SoHo Cleaning Group focuses on:

- Luxury experience
- Premium trust
- White-glove service
- Eco-friendly cleaning
- Manhattan-focused positioning

Design language:
- Black + Gold theme
- Elegant typography
- Minimal luxury UI

---

# Project Structure

```bash
app/
components/
lib/
prisma/
public/
styles/
types/
```

---

# Getting Started

## Install dependencies

```bash
npm install
```

---

## Setup environment variables

Create:

```bash
.env
```

Add:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="server-only-service-role-key"

ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="use-a-password-manager-generated-password"
ADMIN_SESSION_SECRET="at-least-32-random-characters"
PHONE_VERIFICATION_SECRET="a-different-at-least-32-character-secret"

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="server-only-auth-token"
TWILIO_VERIFY_SERVICE_SID="VA..."
TWILIO_MESSAGING_SERVICE_SID="MG..."

SENDGRID_API_KEY="SG..."
SENDGRID_FROM_EMAIL="verified-sender@example.com"
SENDGRID_FROM_NAME="SoHo Cleaning Group"
```

Never expose service-role, database, payment, messaging, or session secrets with
a `NEXT_PUBLIC_` prefix. Use distinct random values for the admin password,
admin session secret, and phone verification secret.

---

# Prisma

## Generate Prisma client

```bash
npx prisma generate
```

## Run migrations

```bash
npx prisma migrate dev
```

---

# Development

## Run local server

```bash
npm run dev
```

## Open

```bash
http://localhost:3000
```

---

# Deployment

## Recommended deployment

- Frontend: Vercel
- Database: Supabase

---

# Vision

Build the most trusted premium cleaning platform in NYC.

> “Pristine Spaces. Premium Care.”
