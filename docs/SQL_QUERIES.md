# EventFlow — SQL Demonstrations & Query Evaluation Guide

This document contains 15 curated PostgreSQL queries covering the DBMS syllabus requirements for evaluation.

---

### 1. Basic SELECT with Filtering and Sorting
Find all active customers whose email contains "eventflow.dev", sorted alphabetically by name:
```sql
SELECT user_id, name, email, phone, role
FROM app_user
WHERE role = 'Customer' AND account_status = 'Active' AND email LIKE '%@eventflow.dev'
ORDER BY name ASC;
```

---

### 2. INSERT, UPDATE, and DELETE Operations
Demonstrate DML statements maintaining referential integrity:
```sql
-- INSERT a new event category
INSERT INTO event_category (category_name, description)
VALUES ('Workshops & Bootcamps', 'Interactive hands-on training sessions');

-- UPDATE an event status
UPDATE event
SET approval_status = 'Approved', updated_at = CURRENT_TIMESTAMP
WHERE event_id = 4;

-- DELETE an unreferenced category
DELETE FROM event_category
WHERE category_name = 'Workshops & Bootcamps';
```

---

### 3. INNER JOIN and LEFT JOIN
Demonstrate inner join between events and categories, combined with left join on reviews:
```sql
SELECT 
    e.event_id,
    e.title,
    c.category_name,
    u.name AS organizer_name,
    COUNT(r.review_id) AS total_reviews,
    COALESCE(AVG(r.rating), 0.0) AS avg_rating
FROM event e
INNER JOIN event_category c ON c.category_id = e.category_id
INNER JOIN app_user u ON u.user_id = e.organizer_id
LEFT JOIN review r ON r.event_id = e.event_id
GROUP BY e.event_id, e.title, c.category_name, u.name;
```

---

### 4. Aggregate Functions (COUNT, SUM, AVG)
Compute system-wide ticket sales, total revenue, and average ticket price:
```sql
SELECT 
    COUNT(t.ticket_id) AS total_tickets_issued,
    SUM(bs.price) AS total_gross_ticket_revenue,
    ROUND(AVG(bs.price), 2) AS average_ticket_price
FROM ticket t
JOIN booking_seat bs ON bs.booking_seat_id = t.booking_seat_id;
```

---

### 5. GROUP BY and HAVING Clause
Find venues that host schedules with more than 5 total configured seats:
```sql
SELECT 
    v.venue_id,
    v.venue_name,
    COUNT(st.seat_id) AS configured_seats
FROM venue v
JOIN section sec ON sec.venue_id = v.venue_id
JOIN seat st ON st.section_id = sec.section_id
GROUP BY v.venue_id, v.venue_name
HAVING COUNT(st.seat_id) > 5
ORDER BY configured_seats DESC;
```

---

### 6. Subqueries and Correlated Subqueries
Find events where the total tickets sold is higher than the average tickets sold across all events:
```sql
SELECT e.event_id, e.title, COUNT(bs.booking_seat_id) AS tickets_sold
FROM event e
JOIN event_schedule s ON s.event_id = e.event_id
JOIN booking b ON b.schedule_id = s.schedule_id
JOIN booking_seat bs ON bs.booking_id = b.booking_id
WHERE b.booking_status = 'Confirmed'
GROUP BY e.event_id, e.title
HAVING COUNT(bs.booking_seat_id) >= (
    SELECT AVG(event_sales) FROM (
        SELECT COUNT(bs2.booking_seat_id) AS event_sales
        FROM event e2
        JOIN event_schedule s2 ON s2.event_id = e2.event_id
        JOIN booking b2 ON b2.schedule_id = s2.schedule_id
        JOIN booking_seat bs2 ON bs2.booking_id = b2.booking_id
        WHERE b2.booking_status = 'Confirmed'
        GROUP BY e2.event_id
    ) sub
);
```

---

### 7. Analytical View Demonstration
Query the precomputed schedule seat inventory view:
```sql
SELECT schedule_id, event_title, venue_name, total_seats, booked_seats, available_seats
FROM vw_schedule_seat_availability
ORDER BY schedule_id;
```

---

### 8. Indexes and Purpose
Query demonstrating index scan on foreign keys and partial unique indexes:
```sql
-- Check index usage on seat_lock partial index
EXPLAIN ANALYZE
SELECT lock_id, seat_id, schedule_id, expires_at
FROM seat_lock
WHERE seat_id = 1 AND schedule_id = 1 AND lock_status = 'Active';
```

---

### 9. Transaction Demonstration (ACID, COMMIT, ROLLBACK)
Simulate a transactional booking with automatic rollback on failure:
```sql
BEGIN;

-- Lock the target seat row
SELECT seat_id, seat_number 
FROM seat 
WHERE seat_id = 5 
FOR UPDATE;

-- Insert pending booking
INSERT INTO booking (user_id, schedule_id, booking_date, total_amount, booking_status)
VALUES (4, 2, CURRENT_TIMESTAMP, 100.00, 'Pending');

-- Insert booked seat item
INSERT INTO booking_seat (booking_id, seat_id, ticket_category_id, price)
VALUES (currval(pg_get_serial_sequence('booking', 'booking_id')), 5, 4, 100.00);

COMMIT;
```

---

### 10. Constraints and Integrity Verification
Attempt to insert an invalid review (rating > 5) to verify CHECK constraint:
```sql
-- Should fail with check constraint violation: chk rating >= 1 AND rating <= 5
INSERT INTO review (user_id, event_id, rating, review_text)
VALUES (4, 1, 10, 'Out of bounds rating test');
```

---

### 11. Event-Wise Bookings and Revenue Report
```sql
SELECT 
    e.event_id,
    e.title,
    c.category_name,
    COUNT(DISTINCT b.booking_id) AS total_bookings,
    COALESCE(SUM(b.total_amount), 0.00) AS total_revenue
FROM event e
JOIN event_category c ON c.category_id = e.category_id
LEFT JOIN event_schedule s ON s.event_id = e.event_id
LEFT JOIN booking b ON b.schedule_id = s.schedule_id AND b.booking_status = 'Confirmed'
GROUP BY e.event_id, e.title, c.category_name
ORDER BY total_revenue DESC;
```

---

### 12. Ticket Availability for a Schedule
```sql
SELECT 
    s.schedule_id,
    e.title AS event_title,
    v.venue_name,
    COUNT(DISTINCT st.seat_id) AS total_seats,
    COUNT(DISTINCT bs.seat_id) AS sold_seats,
    (COUNT(DISTINCT st.seat_id) - COUNT(DISTINCT bs.seat_id)) AS remaining_seats
FROM event_schedule s
JOIN event e ON e.event_id = s.event_id
JOIN venue v ON v.venue_id = s.venue_id
JOIN section sec ON sec.venue_id = v.venue_id
JOIN seat st ON st.section_id = sec.section_id
LEFT JOIN booking b ON b.schedule_id = s.schedule_id AND b.booking_status = 'Confirmed'
LEFT JOIN booking_seat bs ON bs.booking_id = b.booking_id AND bs.seat_id = st.seat_id
WHERE s.schedule_id = 3
GROUP BY s.schedule_id, e.title, v.venue_name;
```

---

### 13. Payment and Cancellation Summary
```sql
SELECT 
    p.payment_status,
    COUNT(p.payment_id) AS transaction_count,
    COALESCE(SUM(p.amount), 0.00) AS total_amount
FROM payment p
GROUP BY p.payment_status;
```

---

### 14. Customer Booking History
```sql
SELECT 
    b.booking_id,
    b.booking_date,
    b.booking_status,
    b.total_amount,
    e.title AS event_title,
    s.start_datetime,
    v.venue_name,
    COUNT(bs.booking_seat_id) AS seats_booked
FROM booking b
JOIN event_schedule s ON s.schedule_id = b.schedule_id
JOIN event e ON e.event_id = s.event_id
JOIN venue v ON v.venue_id = s.venue_id
LEFT JOIN booking_seat bs ON bs.booking_id = b.booking_id
WHERE b.user_id = 4
GROUP BY b.booking_id, b.booking_date, b.booking_status, b.total_amount, e.title, s.start_datetime, v.venue_name
ORDER BY b.booking_date DESC;
```

---

### 15. Event Rating Summaries
```sql
SELECT 
    e.event_id,
    e.title,
    COUNT(r.review_id) AS review_count,
    ROUND(AVG(r.rating)::NUMERIC, 2) AS avg_rating,
    MIN(r.rating) AS lowest_score,
    MAX(r.rating) AS highest_score
FROM event e
LEFT JOIN review r ON r.event_id = e.event_id
GROUP BY e.event_id, e.title;
```
