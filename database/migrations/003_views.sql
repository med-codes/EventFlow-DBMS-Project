-- View 1: Real-time seat availability per schedule
CREATE OR REPLACE VIEW vw_schedule_seat_availability AS
SELECT 
    s.schedule_id,
    e.event_id,
    e.title AS event_title,
    v.venue_id,
    v.venue_name,
    v.capacity,
    s.start_datetime,
    s.end_datetime,
    s.schedule_status,
    COUNT(DISTINCT st.seat_id) AS total_seats,
    COUNT(DISTINCT CASE WHEN b.booking_status IN ('Confirmed', 'Pending') THEN bs.seat_id END) AS booked_seats,
    (COUNT(DISTINCT st.seat_id) - COUNT(DISTINCT CASE WHEN b.booking_status IN ('Confirmed', 'Pending') THEN bs.seat_id END)) AS available_seats
FROM event_schedule s
JOIN event e ON e.event_id = s.event_id
JOIN venue v ON v.venue_id = s.venue_id
JOIN section sec ON sec.venue_id = v.venue_id
JOIN seat st ON st.section_id = sec.section_id
LEFT JOIN booking b ON b.schedule_id = s.schedule_id
LEFT JOIN booking_seat bs ON bs.booking_id = b.booking_id AND bs.seat_id = st.seat_id
GROUP BY s.schedule_id, e.event_id, e.title, v.venue_id, v.venue_name, v.capacity, s.start_datetime, s.end_datetime, s.schedule_status;

-- View 2: Event rating summaries
CREATE OR REPLACE VIEW vw_event_rating_summary AS
SELECT 
    e.event_id,
    e.title AS event_title,
    COUNT(r.review_id) AS total_reviews,
    COALESCE(ROUND(AVG(r.rating)::NUMERIC, 2), 0.00) AS average_rating
FROM event e
LEFT JOIN review r ON r.event_id = e.event_id
GROUP BY e.event_id, e.title;

-- View 3: Organizer revenue report
CREATE OR REPLACE VIEW vw_organizer_revenue_report AS
SELECT 
    u.user_id AS organizer_id,
    u.name AS organizer_name,
    e.event_id,
    e.title AS event_title,
    c.category_name,
    COUNT(DISTINCT CASE WHEN b.booking_status = 'Confirmed' THEN b.booking_id END) AS confirmed_bookings,
    COUNT(DISTINCT bs.booking_seat_id) AS tickets_sold,
    COALESCE(SUM(CASE WHEN b.booking_status = 'Confirmed' THEN b.total_amount ELSE 0 END), 0.00) AS total_revenue
FROM app_user u
JOIN event e ON e.organizer_id = u.user_id
JOIN event_category c ON c.category_id = e.category_id
LEFT JOIN event_schedule s ON s.event_id = e.event_id
LEFT JOIN booking b ON b.schedule_id = s.schedule_id
LEFT JOIN booking_seat bs ON bs.booking_id = b.booking_id AND b.booking_status = 'Confirmed'
GROUP BY u.user_id, u.name, e.event_id, e.title, c.category_name;

-- View 4: Customer booking details
CREATE OR REPLACE VIEW vw_customer_booking_details AS
SELECT 
    b.booking_id,
    b.user_id AS customer_id,
    u.name AS customer_name,
    u.email AS customer_email,
    e.event_id,
    e.title AS event_title,
    cat.category_name AS event_category,
    s.schedule_id,
    s.start_datetime,
    s.end_datetime,
    v.venue_name,
    v.address AS venue_address,
    b.booking_date,
    b.total_amount,
    b.booking_status,
    p.payment_status,
    p.transaction_reference,
    p.payment_method
FROM booking b
JOIN app_user u ON u.user_id = b.user_id
JOIN event_schedule s ON s.schedule_id = b.schedule_id
JOIN event e ON e.event_id = s.event_id
JOIN event_category cat ON cat.category_id = e.category_id
JOIN venue v ON v.venue_id = s.venue_id
LEFT JOIN payment p ON p.booking_id = b.booking_id AND p.payment_status = 'Successful';
