
# EventFlow — Event Ticket Booking and Management System
> **College Relational Database Management Systems (DBMS) Capstone Project**  
> Built with PostgreSQL 18, Node.js, Express, TypeScript, and React.

---

## Project Overview
**EventFlow** is a comprehensive, production-grade event ticket booking and management platform designed specifically for college DBMS demonstrations. It features relational database modeling across **16 normalized core relations** and **2 supporting tables**, implementing:
- Concurrency-safe seat reservations via row-level locks and 10-minute temporary expiration.
- Multi-tier ticket pricing scoped strictly to individual event schedules.
- Simulated payment checkout workflows supporting failure retries and idempotency.
- Admission pass generation with unique alphanumeric codes and printable passes.
- Whole-booking cancellations with an automated 80% refund policy and automatic waitlist queue promotions.
- Verified customer reviews restricted strictly to attended, confirmed bookings.
- Administrative moderation queues for event approvals, user status toggling, and SQL-backed analytics.

---

##  Technology Stack
- **Database:** PostgreSQL 18 (Relational Engine, Identity Columns, Check Constraints, Partial Indexes, Triggers, Views)
- **Database Driver:** `pg` (node-postgres) with parameterized SQL queries and transaction management
- **Backend API:** Node.js, Express, TypeScript, Zod, BcryptJS, JSON Web Tokens (JWT)
- **Frontend Client:** React 18, Vite, TypeScript, Lucide Icons, Vanilla CSS Design System
- **Testing:** Jest, Supertest, automated concurrency race-condition suites

---

## 👥 Demo Accounts (Credentials for Evaluation)

All demonstration accounts use the password: **`Password123!`**

| Role | Email | Password | Access & Responsibilities |
|---|---|---|---|
| **Customer** | `customer@eventflow.dev` | `Password123!` | Browses events, locks seats, books passes, views/prints tickets, cancels bookings, writes reviews |
| **Organizer** | `organizer@eventflow.dev` | `Password123!` | Creates events, publishes schedules, sets ticket category prices, monitors revenue |
| **Admin** | `admin@eventflow.dev` | `Password123!` | Approves/rejects pending events, toggles user status (Active/Inactive), monitors platform metrics |

*(Note: The UI also includes a 1-click **DEMO** role switcher in the navigation bar for effortless presentation switching.)*

---

##  Quick Setup & Installation

### 1. Prerequisites
- **PostgreSQL 18** (or 16+) installed and running locally on port `5432`.
- **Node.js v20+ / v24+** and **npm** installed.

### 2. Database Initialization
Open your terminal (PowerShell or Bash) and execute:
```bash
# Create application and test databases
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE eventflow_db;"
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE eventflow_test_db;"

# Run versioned migrations (Tables, Triggers, Views)
psql -U postgres -h localhost -p 5432 -d eventflow_db -f database/migrations/001_initial_schema.sql
psql -U postgres -h localhost -p 5432 -d eventflow_db -f database/migrations/002_triggers_and_functions.sql
psql -U postgres -h localhost -p 5432 -d eventflow_db -f database/migrations/003_views.sql

# Seed demonstration data
psql -U postgres -h localhost -p 5432 -d eventflow_db -f database/seeds/001_seed_data.sql
```

*(Also run the same migrations on `eventflow_test_db` for automated tests).*

### 3. Environment Configuration
Create a `.env` file in the project root:
```ini
PORT=5000
NODE_ENV=development

# Database Credentials
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456
DB_NAME=eventflow_db
TEST_DB_NAME=eventflow_test_db

# Security
JWT_SECRET=eventflow_college_dbms_jwt_secret_key_2026_super_secure
JWT_EXPIRES_IN=7d

# Business Rules
SEAT_LOCK_DURATION_MINUTES=10
CANCELLATION_REFUND_PERCENTAGE=80
CORS_ORIGIN=http://localhost:5173
```

### 4. Install Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 5. Run the Application
Open two separate terminal windows:

**Terminal 1 — Backend API Server:**
```bash
cd server
npm run dev
# Starts backend at http://localhost:5000
```

**Terminal 2 — Frontend Client:**
```bash
cd client
npm run dev
# Starts web client at http://localhost:5173
```

Navigate to `http://localhost:5173` in your browser.

---

##  Automated Testing

EventFlow includes a test suite covering authentication, concurrency race-conditions, ticket issuance, cancellation refunds, and role authorizations:

```bash
cd server
npm test
```

### Verified Test Cases:
- `tests/auth.test.ts`: Customer and Admin login with password hashes, rejection of wrong passwords, registration validation, and denial of public Admin signups.
- `tests/booking_concurrency.test.ts`: Two concurrent requests attempting to book the same seat simultaneously (ensures exactly 1 succeeds and the other receives a conflict error).
- `tests/payment_cancellation.test.ts`: Failed payment attempts do not generate tickets; successful payments generate tickets 1:1; 80% whole-booking cancellation refunds; review eligibility verification.
- `tests/organizer_admin.test.ts`: Organizer isolation (organizer cannot edit another organizer's event); admin event approval workflow.

---

##  College Documentation Files

Complete project documentation is available in the `docs/` directory:
- [`docs/LEARNING_GUIDE.md`](./docs/LEARNING_GUIDE.md) — Step-by-step reproduction guide and college viva question bank.
- [`docs/ER_DIAGRAM.md`](./docs/ER_DIAGRAM.md) — Entity-Relationship model and relational table mappings.
- [`docs/NORMALIZATION.md`](./docs/NORMALIZATION.md) — Formal analysis of 1NF, 2NF, and 3NF functional dependencies.
- [`docs/SQL_QUERIES.md`](./docs/SQL_QUERIES.md) — 15 curated PostgreSQL evaluation queries.
- [`docs/PROGRESS.md`](./docs/PROGRESS.md) — Phased implementation log and verification records.

---

##  Database Quality Highlights
1. **Separation of Credentials:** Password hashes are strictly isolated in `user_credential`, never exposing secrets in user queries.
2. **Partial Unique Indexes:** `idx_active_seat_lock` guarantees at most one active lock per seat per schedule.
3. **Historical Snapshots:** `booking_seat.price` captures the purchase price at transaction time, preserving financial audit accuracy independently of subsequent price tier changes.
4. **Trigger Validation:** Enforces seat-to-venue matching, role integrity on event creation, review attendance eligibility, and cascade invalidation on cancellations.
