# EventFlow — College Student Learning Guide & Viva Handbook

This guide is designed to help you understand every aspect of **EventFlow**, reproduce the project step-by-step on your own system, and confidently answer questions during college viva examinations.

---

## 1. Project Overview & Architecture

### What is EventFlow?
EventFlow is a full-stack event ticket booking and management system designed around a relational database architecture in **PostgreSQL**. It supports three distinct user roles:
1. **Customer:** Discovers approved events, reserves specific seats in venue sections, completes simulated payments, views and prints ticket passes, cancels bookings with refund calculations, joins waitlists, and submits post-event reviews.
2. **Organizer:** Submits events for administrative review, schedules dates and times across physical venues, configures tiered ticket pricing (VIP, Standard), and reviews ticket sales revenue.
3. **Admin:** Approves or rejects submitted events, monitors system users, manages event categories, and reviews platform analytics.

### Architecture Overview
- **Database:** PostgreSQL 18 with 16 core relations and 2 supporting tables (`user_credential` and `notification`).
- **Backend API:** Node.js, Express, TypeScript, and the native `pg` driver using parameterized queries and ACID transactions.
- **Frontend Client:** React, Vite, TypeScript, and a responsive CSS design system.
- **Authentication:** Scrypt/Bcrypt securely salted hashes stored separately from user profiles, with signed JSON Web Tokens (JWT).

---

## 2. Core Relational Schema (16 Relations + 2 Supporting Tables)

| # | Relation Name | Primary Key | Foreign Keys | Business Purpose |
|---|---|---|---|---|
| 1 | `app_user` | `user_id` | None | Core user profiles (Customer, Organizer, Admin) |
| 2 | `user_credential` | `user_id` | `user_id -> app_user` | Isolates password hashes from conceptual user profiles |
| 3 | `event_category` | `category_id` | None | Master lookup for classifications (Tech, Concerts, Theater) |
| 4 | `event` | `event_id` | `organizer_id -> app_user`, `category_id -> event_category`, `reviewed_by -> app_user` | Events created by organizers and reviewed by admins |
| 5 | `venue` | `venue_id` | None | Physical locations with designated seat capacity |
| 6 | `section` | `section_id` | `venue_id -> venue` | Subdivisions inside a venue (VIP Front, Orchestra, Balcony) |
| 7 | `seat` | `seat_id` | `section_id -> section` | Specific numbered seats inside a section |
| 8 | `event_schedule` | `schedule_id` | `event_id -> event`, `venue_id -> venue` | Concrete event dates and time slots |
| 9 | `ticket_category` | `ticket_category_id` | `schedule_id -> event_schedule` | Schedule-specific ticket tiers and current prices |
| 10 | `seat_lock` | `lock_id` | `user_id -> app_user`, `seat_id -> seat`, `schedule_id -> event_schedule` | 10-minute temporary seat reservations during checkout |
| 11 | `booking` | `booking_id` | `user_id -> app_user`, `schedule_id -> event_schedule` | Overall customer booking order |
| 12 | `booking_seat` | `booking_seat_id` | `booking_id -> booking`, `seat_id -> seat`, `ticket_category_id -> ticket_category` | Individual seats in a booking with historical price snapshot |
| 13 | `payment` | `payment_id` | `booking_id -> booking` | Transactional simulated payment attempts |
| 14 | `ticket` | `ticket_id` | `booking_seat_id -> booking_seat` | Unique admission passes issued 1:1 per confirmed seat |
| 15 | `cancellation` | `cancellation_id` | `booking_id -> booking` | Records whole-booking cancellation and refund calculation |
| 16 | `waitlist` | `waitlist_id` | `user_id -> app_user`, `schedule_id -> event_schedule` | Fair FIFO queue for sold-out schedules |
| 17 | `review` | `review_id` | `user_id -> app_user`, `event_id -> event` | Verified customer reviews (1 to 5 stars) |
| 18 | `notification` | `notification_id` | `user_id -> app_user` | In-app alerts for waitlist promotions and ticket confirmations |

---

## 3. Detailed Component Breakdown

### Component 1: Database Migration & Schema Design
- **What it does:** Creates the relational tables, constraints, foreign keys, triggers, and views.
- **Files:** `database/migrations/001_initial_schema.sql`, `002_triggers_and_functions.sql`, `003_views.sql`.
- **Tables used:** All 18 tables.
- **SQL concepts demonstrated:** `GENERATED ALWAYS AS IDENTITY`, foreign keys with `ON DELETE CASCADE / RESTRICT`, `CHECK` constraints, partial unique index (`WHERE lock_status = 'Active'`), PL/pgSQL triggers, and SQL views.
- **Viva explanation:** Explain why identity columns are preferred over legacy `SERIAL` (they comply with the SQL standard) and how partial indexes save space while guaranteeing uniqueness only for active records.

### Component 2: Temporary Seat Locking & Concurrency Control
- **What it does:** Prevents two customers from booking the same seat simultaneously (race condition prevention).
- **Files:** `server/src/routes/scheduleRoutes.ts`, `server/src/routes/bookingRoutes.ts`.
- **Tables used:** `seat_lock`, `booking`, `booking_seat`, `seat`.
- **SQL concepts demonstrated:** `BEGIN ... COMMIT / ROLLBACK` transactions, row locking with `SELECT ... FOR UPDATE`, and atomic status transitions.
- **How it works:**
  1. When a user clicks a seat, the backend acquires a lock in `seat_lock` with an expiration timestamp (`CURRENT_TIMESTAMP + 10 minutes`).
  2. A partial unique index prevents another active lock on the same `(seat_id, schedule_id)`.
  3. When creating a booking, the query executes inside `withTransaction` using `SELECT ... FOR UPDATE` on the seat rows.
  4. If another transaction attempts to book the seat at the same time, PostgreSQL blocks it until the first transaction commits or rolls back, detecting the conflict safely.

### Component 3: Server-Side Price Calculation & Historical Snapshots
- **What it does:** Guarantees total calculation integrity and preserves historical price snapshots.
- **Tables used:** `ticket_category`, `booking`, `booking_seat`.
- **Why it is needed:** Client-side prices cannot be trusted (users can manipulate HTTP payloads). Also, if an organizer changes a ticket category price next week, existing bookings must remember the price paid at the time of purchase (`booking_seat.price`).
- **Viva explanation:** Explain the difference between current catalog price (`ticket_category.price`) and historical transaction price (`booking_seat.price`). This demonstrates functional dependency preservation.

### Component 4: Payment Simulation & Ticket Issuance
- **What it does:** Simulates payment workflows without real payment gateways.
- **Files:** `server/src/routes/paymentRoutes.ts`, `client/src/components/SeatingModal.tsx`.
- **Tables used:** `payment`, `booking`, `ticket`.
- **Behavior:**
  - If simulated payment is **Failed**: A payment row is inserted with status `'Failed'`. The booking remains `'Pending'` and NO tickets are generated. The user can retry.
  - If simulated payment is **Successful**: Status is updated to `'Successful'`, booking is set to `'Confirmed'`, and unique tickets are generated 1:1 for each seat with QR codes.

### Component 5: Whole-Booking Cancellation & Waitlist Promotion
- **What it does:** Cancels a confirmed booking, calculates an 80% refund, revokes tickets, and automatically promotes the next person in the waitlist.
- **Files:** `server/src/routes/cancellationRoutes.ts`.
- **Tables used:** `cancellation`, `booking`, `ticket`, `payment`, `waitlist`, `notification`.
- **SQL concepts demonstrated:** Trigger-based cascade updates (`trg_handle_booking_cancellation`) and FIFO queue ordering with `ORDER BY position ASC LIMIT 1`.

### Component 6: Review Eligibility Rule
- **What it does:** Ensures only customers who actually possessed a confirmed booking for an event can leave a review.
- **Tables used:** `review`, `booking`, `event_schedule`.
- **SQL concepts demonstrated:** Multi-table relational validation in both API route and database trigger (`trg_validate_review_eligibility`).

---

## 4. Manual Implementation Checklist for Independent Reproduction

Follow these steps to replicate the project from scratch in your own local environment:

1. **Prerequisites Check:**
   - Install PostgreSQL 18 or 16+ from postgresql.org.
   - Install Node.js v20+ or v24+ from nodejs.org.
2. **Create PostgreSQL Databases:**
   ```sql
   CREATE DATABASE eventflow_db;
   CREATE DATABASE eventflow_test_db;
   ```
3. **Run Schema Migrations:**
   ```bash
   psql -U postgres -h localhost -p 5432 -d eventflow_db -f database/migrations/001_initial_schema.sql
   psql -U postgres -h localhost -p 5432 -d eventflow_db -f database/migrations/002_triggers_and_functions.sql
   psql -U postgres -h localhost -p 5432 -d eventflow_db -f database/migrations/003_views.sql
   ```
4. **Seed Demonstration Data:**
   ```bash
   psql -U postgres -h localhost -p 5432 -d eventflow_db -f database/seeds/001_seed_data.sql
   ```
5. **Configure Environment Variables:**
   - Create a `.env` file in the root with `DB_USER=postgres`, `DB_PASSWORD=your_password`, and `DB_NAME=eventflow_db`.
6. **Install Backend Dependencies & Run Tests:**
   ```bash
   cd server
   npm install
   npm test
   ```
7. **Install Frontend Dependencies & Run Build:**
   ```bash
   cd ../client
   npm install
   npm run build
   ```
8. **Start Both Services:**
   - Terminal 1: `npm --prefix server run dev`
   - Terminal 2: `npm --prefix client run dev`
   - Open browser at `http://localhost:5173`.

---

## 5. Frequently Asked College Viva Questions & Model Answers

### Q1: Why did you separate `app_user` and `user_credential`?
**Answer:** In conceptual database modeling, authentication credentials (password hashes, salting strategies) represent implementation-specific security concerns rather than core user entity attributes. By isolating password hashes in a dedicated `user_credential` table referencing `app_user(user_id)`, we reduce the attack surface: queries selecting user profile information for dashboards never inadvertently select or leak password hashes into logs or API responses.

### Q2: How did you prevent double-booking when multiple customers click the same seat?
**Answer:** We implemented a multi-layered concurrency strategy:
1. **At the database level:** We created a partial unique index on `seat_lock (seat_id, schedule_id) WHERE lock_status = 'Active'`. PostgreSQL strictly forbids inserting a second active lock for the same seat and schedule.
2. **At the application transaction level:** When creating a booking, the query runs inside a PostgreSQL transaction (`BEGIN ... COMMIT`) and executes `SELECT ... FOR UPDATE` on the seat records. This locks the specific rows at the database engine level until transaction commit, ensuring sequential, deterministic evaluation and preventing race conditions.

### Q3: Why is ticket price stored in both `ticket_category` and `booking_seat`? Does this violate 3NF?
**Answer:** No, it does not violate Third Normal Form because they represent fundamentally different facts at different points in time:
- `ticket_category.price` represents the **current catalog price** of a ticket tier, which can be modified by the organizer at any time.
- `booking_seat.price` represents the **historical transaction price** captured at the exact moment the booking occurred. If an organizer increases ticket prices tomorrow, historical customer receipts and revenue accounting must reflect the price actually paid.

### Q4: What is the purpose of database views in your project?
**Answer:** We created 4 analytical views (such as `vw_schedule_seat_availability` and `vw_organizer_revenue_report`). Views simplify complex multi-table joins, aggregations (`COUNT`, `SUM`), and `GROUP BY` operations, presenting clean, abstracted virtual tables to the application layer while ensuring consistent reporting logic across all endpoints.

### Q5: How do ACID properties apply to EventFlow?
**Answer:**
- **Atomicity:** In booking and payment, creating the booking, inserting seats, and converting locks either all succeed together or all roll back completely via PostgreSQL transactions.
- **Consistency:** Enforced by primary keys, foreign keys, CHECK constraints (`price >= 0`, `rating BETWEEN 1 AND 5`), and triggers.
- **Isolation:** Managed via row locks (`FOR UPDATE`) preventing dirty reads and non-repeatable reads during simultaneous booking requests.
- **Durability:** Once committed, transaction records and ticket codes are permanently written to PostgreSQL write-ahead logs (WAL) on disk.
