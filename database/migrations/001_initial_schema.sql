-- 1. app_user table
CREATE TABLE IF NOT EXISTS app_user (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(25),
    role VARCHAR(20) NOT NULL CHECK (role IN ('Customer', 'Organizer', 'Admin')),
    account_status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (account_status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- user_credential table (stores hashed passwords separately)
CREATE TABLE IF NOT EXISTS user_credential (
    user_id INT PRIMARY KEY REFERENCES app_user(user_id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. event_category table
CREATE TABLE IF NOT EXISTS event_category (
    category_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. event table
CREATE TABLE IF NOT EXISTS event (
    event_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organizer_id INT NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
    category_id INT NOT NULL REFERENCES event_category(category_id) ON DELETE RESTRICT,
    reviewed_by INT REFERENCES app_user(user_id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. venue table
CREATE TABLE IF NOT EXISTS venue (
    venue_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venue_name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. section table
CREATE TABLE IF NOT EXISTS section (
    section_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venue_id INT NOT NULL REFERENCES venue(venue_id) ON DELETE CASCADE,
    section_name VARCHAR(100) NOT NULL,
    CONSTRAINT uq_venue_section UNIQUE (venue_id, section_name)
);

-- 6. seat table
CREATE TABLE IF NOT EXISTS seat (
    seat_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_id INT NOT NULL REFERENCES section(section_id) ON DELETE CASCADE,
    seat_number VARCHAR(20) NOT NULL,
    CONSTRAINT uq_section_seat UNIQUE (section_id, seat_number)
);

-- 7. event_schedule table
CREATE TABLE IF NOT EXISTS event_schedule (
    schedule_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(event_id) ON DELETE CASCADE,
    venue_id INT NOT NULL REFERENCES venue(venue_id) ON DELETE RESTRICT,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    schedule_status VARCHAR(20) NOT NULL DEFAULT 'Scheduled' CHECK (schedule_status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_schedule_time_order CHECK (end_datetime > start_datetime)
);

-- 8. ticket_category table
CREATE TABLE IF NOT EXISTS ticket_category (
    ticket_category_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    schedule_id INT NOT NULL REFERENCES event_schedule(schedule_id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    CONSTRAINT uq_schedule_ticket_category UNIQUE (schedule_id, category_name)
);

-- 9. seat_lock table (active locks held for 10 minutes)
CREATE TABLE IF NOT EXISTS seat_lock (
    lock_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    seat_id INT NOT NULL REFERENCES seat(seat_id) ON DELETE CASCADE,
    schedule_id INT NOT NULL REFERENCES event_schedule(schedule_id) ON DELETE CASCADE,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    lock_status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (lock_status IN ('Active', 'Released', 'Expired', 'Converted')),
    CONSTRAINT chk_lock_expiration CHECK (expires_at > locked_at)
);

-- Partial index for active seat locks
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_seat_lock ON seat_lock (seat_id, schedule_id) WHERE (lock_status = 'Active');

-- 10. booking table
CREATE TABLE IF NOT EXISTS booking (
    booking_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
    schedule_id INT NOT NULL REFERENCES event_schedule(schedule_id) ON DELETE RESTRICT,
    booking_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    booking_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (booking_status IN ('Pending', 'Confirmed', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. booking_seat table
CREATE TABLE IF NOT EXISTS booking_seat (
    booking_seat_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES booking(booking_id) ON DELETE CASCADE,
    seat_id INT NOT NULL REFERENCES seat(seat_id) ON DELETE RESTRICT,
    ticket_category_id INT NOT NULL REFERENCES ticket_category(ticket_category_id) ON DELETE RESTRICT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    CONSTRAINT uq_booking_seat_instance UNIQUE (booking_id, seat_id)
);

-- 12. payment table
CREATE TABLE IF NOT EXISTS payment (
    payment_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES booking(booking_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50) NOT NULL,
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Successful', 'Failed', 'Refunded'))
);

-- 13. ticket table
CREATE TABLE IF NOT EXISTS ticket (
    ticket_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_seat_id INT NOT NULL UNIQUE REFERENCES booking_seat(booking_seat_id) ON DELETE CASCADE,
    ticket_code VARCHAR(64) NOT NULL UNIQUE,
    ticket_status VARCHAR(20) NOT NULL DEFAULT 'Valid' CHECK (ticket_status IN ('Valid', 'Used', 'Cancelled')),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. cancellation table
CREATE TABLE IF NOT EXISTS cancellation (
    cancellation_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE REFERENCES booking(booking_id) ON DELETE RESTRICT,
    cancelled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL,
    refund_amount NUMERIC(10, 2) NOT NULL CHECK (refund_amount >= 0),
    cancellation_status VARCHAR(20) NOT NULL DEFAULT 'Processed' CHECK (cancellation_status IN ('Pending', 'Processed', 'Rejected'))
);

-- 15. waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
    waitlist_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    schedule_id INT NOT NULL REFERENCES event_schedule(schedule_id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    position INT NOT NULL CHECK (position > 0),
    waitlist_status VARCHAR(20) NOT NULL DEFAULT 'Waiting' CHECK (waitlist_status IN ('Waiting', 'Promoted', 'Cancelled', 'Expired')),
    CONSTRAINT uq_user_schedule_waitlist UNIQUE (user_id, schedule_id)
);

-- 16. review table
CREATE TABLE IF NOT EXISTS review (
    review_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    event_id INT NOT NULL REFERENCES event(event_id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_event_review UNIQUE (user_id, event_id)
);

-- notification table
CREATE TABLE IF NOT EXISTS notification (
    notification_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('WaitlistPromotion', 'BookingConfirmation', 'BookingCancellation', 'SystemAlert')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_organizer ON event(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_category ON event(category_id);
CREATE INDEX IF NOT EXISTS idx_event_approval ON event(approval_status);
CREATE INDEX IF NOT EXISTS idx_schedule_event ON event_schedule(event_id);
CREATE INDEX IF NOT EXISTS idx_schedule_venue ON event_schedule(venue_id);
CREATE INDEX IF NOT EXISTS idx_seat_section ON seat(section_id);
CREATE INDEX IF NOT EXISTS idx_booking_user ON booking(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_schedule ON booking(schedule_id);
CREATE INDEX IF NOT EXISTS idx_payment_booking ON payment(booking_id);
CREATE INDEX IF NOT EXISTS idx_ticket_code ON ticket(ticket_code);
CREATE INDEX IF NOT EXISTS idx_notification_user ON notification(user_id, is_read);
