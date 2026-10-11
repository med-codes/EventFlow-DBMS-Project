-- Clear previous data and reset IDs
TRUNCATE TABLE notification, review, waitlist, cancellation, ticket, payment,
               booking_seat, booking, seat_lock, ticket_category, event_schedule,
               seat, section, venue, event, event_category, user_credential, app_user
RESTART IDENTITY CASCADE;

-- Insert users (password for all is: Password123!)
INSERT INTO app_user (name, email, phone, role, account_status) VALUES
('System Administrator', 'admin@eventflow.dev', '555-0100', 'Admin', 'Active'),
('Apex Entertainment', 'organizer@eventflow.dev', '555-0200', 'Organizer', 'Active'),
('Pulse Arts Media', 'pulse@eventflow.dev', '555-0201', 'Organizer', 'Active'),
('Aarav Sharma', 'customer@eventflow.dev', '555-0300', 'Customer', 'Active'),
('Priya Patel', 'priya@eventflow.dev', '555-0301', 'Customer', 'Active'),
('Rohan Mehta', 'rohan@eventflow.dev', '555-0302', 'Customer', 'Active');

-- Insert credentials (bcrypt hash for Password123!)
INSERT INTO user_credential (user_id, password_hash) VALUES
(1, '$2a$10$tee7Bhs2Ifuvm0d5mzDgge46U5q6xy5JUqsiNw.RiRXWWVoYpSndK'),
(2, '$2a$10$tee7Bhs2Ifuvm0d5mzDgge46U5q6xy5JUqsiNw.RiRXWWVoYpSndK'),
(3, '$2a$10$tee7Bhs2Ifuvm0d5mzDgge46U5q6xy5JUqsiNw.RiRXWWVoYpSndK'),
(4, '$2a$10$tee7Bhs2Ifuvm0d5mzDgge46U5q6xy5JUqsiNw.RiRXWWVoYpSndK'),
(5, '$2a$10$tee7Bhs2Ifuvm0d5mzDgge46U5q6xy5JUqsiNw.RiRXWWVoYpSndK'),
(6, '$2a$10$tee7Bhs2Ifuvm0d5mzDgge46U5q6xy5JUqsiNw.RiRXWWVoYpSndK');

-- Insert categories
INSERT INTO event_category (category_name, description) VALUES
('Technology & AI Conferences', 'Summits, developer conferences, and tech seminars'),
('Concerts & Live Music', 'Stadium tours, acoustic gigs, indie shows, and festivals'),
('Theater & Drama', 'Plays, musicals, and stage performances'),
('Sports & Athletics', 'Tournaments, sports matches, and fitness events'),
('Stand-up Comedy', 'Comedy tours and open-mic specials');

-- Insert events
INSERT INTO event (organizer_id, category_id, reviewed_by, title, description, approval_status, rejection_reason) VALUES
(2, 1, 1, 'Global AI & Tech Symposium 2026', 'Conference covering AI agent workflows and modern cloud databases.', 'Approved', NULL),
(2, 2, 1, 'Neon Horizon Rock Festival', 'Open air rock show with premier rock acts and light shows.', 'Approved', NULL),
(3, 3, 1, 'Midnight Hamlet', 'Modern theatrical production of Hamlet.', 'Approved', NULL),
(3, 1, NULL, 'NextGen Quantum Computing Summit', 'Quantum theory and applications conference.', 'Pending', NULL),
(2, 2, 1, 'Underground Indie Showcase', 'Indie concert.', 'Rejected', 'Missing venue safety and fire permits.');

-- Insert venues
INSERT INTO venue (venue_name, address, capacity) VALUES
('Apex Convention Center', '100 Cyber Tower Blvd, Tech City', 150),
('Grand Symphony Arena', '742 Evergreen Terrace, Metro City', 250),
('Royal Heritage Theater', '12 Arts Square, Cultural Quarter', 80);

-- Insert sections
INSERT INTO section (venue_id, section_name) VALUES
(1, 'Executive Lounge'),
(1, 'Main Auditorium'),
(2, 'VIP Front Row'),
(2, 'Orchestra Center'),
(2, 'Balcony Tier'),
(3, 'Royal Box'),
(3, 'Stalls');

-- Insert seats
INSERT INTO seat (section_id, seat_number) VALUES
(1, 'E-1'), (1, 'E-2'), (1, 'E-3'), (1, 'E-4'),
(2, 'M-1'), (2, 'M-2'), (2, 'M-3'), (2, 'M-4'), (2, 'M-5'), (2, 'M-6'), (2, 'M-7'), (2, 'M-8'),
(3, 'V-1'), (3, 'V-2'), (3, 'V-3'), (3, 'V-4'),
(4, 'O-1'), (4, 'O-2'), (4, 'O-3'), (4, 'O-4'), (4, 'O-5'), (4, 'O-6'),
(5, 'B-1'), (5, 'B-2'), (5, 'B-3'), (5, 'B-4'),
(6, 'R-1'), (6, 'R-2'),
(7, 'S-1'), (7, 'S-2'), (7, 'S-3'), (7, 'S-4');

-- Insert event schedules
INSERT INTO event_schedule (event_id, venue_id, start_datetime, end_datetime, schedule_status) VALUES
(1, 1, CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days' + INTERVAL '7 hours', 'Completed'),
(1, 1, CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP + INTERVAL '7 days' + INTERVAL '7 hours', 'Scheduled'),
(2, 2, CURRENT_TIMESTAMP + INTERVAL '12 days', CURRENT_TIMESTAMP + INTERVAL '12 days' + INTERVAL '4 hours', 'Scheduled'),
(3, 3, CURRENT_TIMESTAMP + INTERVAL '20 days', CURRENT_TIMESTAMP + INTERVAL '20 days' + INTERVAL '3 hours', 'Scheduled');

-- Insert ticket categories
INSERT INTO ticket_category (schedule_id, category_name, price) VALUES
(1, 'VIP Executive', 200.00),
(1, 'Standard Delegate', 80.00),
(2, 'VIP Executive', 250.00),
(2, 'Standard Delegate', 100.00),
(3, 'VIP Front Stage', 150.00),
(3, 'Orchestra General', 75.00),
(3, 'Balcony Tier', 45.00),
(4, 'Royal Box', 120.00),
(4, 'Stalls Seating', 60.00);

-- Insert bookings and seats
INSERT INTO booking (user_id, schedule_id, booking_date, total_amount, booking_status) VALUES
(4, 1, CURRENT_TIMESTAMP - INTERVAL '16 days', 400.00, 'Confirmed'),
(5, 3, CURRENT_TIMESTAMP - INTERVAL '2 days', 300.00, 'Confirmed'),
(6, 3, CURRENT_TIMESTAMP - INTERVAL '3 days', 75.00, 'Cancelled');

INSERT INTO booking_seat (booking_id, seat_id, ticket_category_id, price) VALUES
(1, 1, 1, 200.00),
(1, 2, 1, 200.00),
(2, 13, 5, 150.00),
(2, 14, 5, 150.00),
(3, 17, 6, 75.00);

-- Insert payments
INSERT INTO payment (booking_id, amount, payment_method, transaction_reference, payment_date, payment_status) VALUES
(1, 400.00, 'Simulated Card', 'TXN-10001', CURRENT_TIMESTAMP - INTERVAL '16 days', 'Successful'),
(2, 300.00, 'Simulated UPI', 'TXN-20002', CURRENT_TIMESTAMP - INTERVAL '2 days', 'Successful'),
(3, 75.00, 'Simulated Card', 'TXN-30001', CURRENT_TIMESTAMP - INTERVAL '3 days', 'Refunded');

-- Insert tickets
INSERT INTO ticket (booking_seat_id, ticket_code, ticket_status, generated_at) VALUES
(1, 'TCK-AI-E1-001', 'Used', CURRENT_TIMESTAMP - INTERVAL '16 days'),
(2, 'TCK-AI-E2-002', 'Used', CURRENT_TIMESTAMP - INTERVAL '16 days'),
(3, 'TCK-ROCK-V1-003', 'Valid', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(4, 'TCK-ROCK-V2-004', 'Valid', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(5, 'TCK-ROCK-O1-005', 'Cancelled', CURRENT_TIMESTAMP - INTERVAL '3 days');

-- Insert cancellation
INSERT INTO cancellation (booking_id, cancelled_at, reason, refund_amount, cancellation_status) VALUES
(3, CURRENT_TIMESTAMP - INTERVAL '1 day', 'Schedule conflict with college exams', 60.00, 'Processed');

-- Insert waitlist
INSERT INTO waitlist (user_id, schedule_id, joined_at, position, waitlist_status) VALUES
(6, 2, CURRENT_TIMESTAMP - INTERVAL '4 hours', 1, 'Waiting');

-- Insert review
INSERT INTO review (user_id, event_id, rating, review_text, review_date) VALUES
(4, 1, 5, 'Great technical event and insightful sessions!', CURRENT_TIMESTAMP - INTERVAL '10 days');

-- Insert notifications
INSERT INTO notification (user_id, title, message, type, is_read) VALUES
(4, 'Booking Confirmed', 'Booking #1 confirmed. 2 tickets issued.', 'BookingConfirmation', TRUE),
(5, 'Booking Confirmed', 'Booking #2 confirmed. 2 tickets issued.', 'BookingConfirmation', FALSE),
(6, 'Refund Processed', 'Booking #3 cancelled and refund processed.', 'BookingCancellation', TRUE),
(6, 'Waitlist Position', 'You are at position #1 for AI Symposium.', 'WaitlistPromotion', FALSE);
