-- Validate organizer and reviewer roles
CREATE OR REPLACE FUNCTION trg_fn_validate_event_roles()
RETURNS TRIGGER AS $$
DECLARE
    v_organizer_role VARCHAR(20);
    v_reviewer_role VARCHAR(20);
BEGIN
    SELECT role INTO v_organizer_role FROM app_user WHERE user_id = NEW.organizer_id;
    IF v_organizer_role != 'Organizer' THEN
        RAISE EXCEPTION 'Organizer ID must have the Organizer role';
    END IF;

    IF NEW.reviewed_by IS NOT NULL THEN
        SELECT role INTO v_reviewer_role FROM app_user WHERE user_id = NEW.reviewed_by;
        IF v_reviewer_role != 'Admin' THEN
            RAISE EXCEPTION 'Reviewed by user must have the Admin role';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_event_roles ON event;
CREATE TRIGGER trg_validate_event_roles
    BEFORE INSERT OR UPDATE ON event
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_validate_event_roles();

-- Validate that seat belongs to schedule venue and category belongs to schedule
CREATE OR REPLACE FUNCTION trg_fn_validate_booking_seat()
RETURNS TRIGGER AS $$
DECLARE
    v_expected_venue_id INT;
    v_actual_venue_id INT;
    v_category_schedule_id INT;
    v_booking_schedule_id INT;
BEGIN
    SELECT s.venue_id, b.schedule_id INTO v_expected_venue_id, v_booking_schedule_id
    FROM booking b
    JOIN event_schedule s ON s.schedule_id = b.schedule_id
    WHERE b.booking_id = NEW.booking_id;

    SELECT sec.venue_id INTO v_actual_venue_id
    FROM seat st
    JOIN section sec ON sec.section_id = st.section_id
    WHERE st.seat_id = NEW.seat_id;

    IF v_actual_venue_id != v_expected_venue_id THEN
        RAISE EXCEPTION 'Selected seat does not belong to the venue of this schedule';
    END IF;

    SELECT schedule_id INTO v_category_schedule_id
    FROM ticket_category
    WHERE ticket_category_id = NEW.ticket_category_id;

    IF v_category_schedule_id != v_booking_schedule_id THEN
        RAISE EXCEPTION 'Selected ticket category does not belong to this schedule';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_booking_seat ON booking_seat;
CREATE TRIGGER trg_validate_booking_seat
    BEFORE INSERT OR UPDATE ON booking_seat
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_validate_booking_seat();

-- Update booking and tickets status when cancellation is created
CREATE OR REPLACE FUNCTION trg_fn_handle_booking_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE booking SET booking_status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE booking_id = NEW.booking_id;
    UPDATE ticket SET ticket_status = 'Cancelled' WHERE booking_seat_id IN (
        SELECT booking_seat_id FROM booking_seat WHERE booking_id = NEW.booking_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_booking_cancellation ON cancellation;
CREATE TRIGGER trg_handle_booking_cancellation
    AFTER INSERT ON cancellation
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_handle_booking_cancellation();

-- Validate review eligibility: customer must have a confirmed booking
CREATE OR REPLACE FUNCTION trg_fn_validate_review_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    v_confirmed_count INT;
BEGIN
    SELECT COUNT(*) INTO v_confirmed_count
    FROM booking b
    JOIN event_schedule s ON s.schedule_id = b.schedule_id
    WHERE b.user_id = NEW.user_id AND s.event_id = NEW.event_id AND b.booking_status = 'Confirmed';

    IF v_confirmed_count = 0 THEN
        RAISE EXCEPTION 'Customer must have a confirmed booking for this event to leave a review';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_review_eligibility ON review;
CREATE TRIGGER trg_validate_review_eligibility
    BEFORE INSERT ON review
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_validate_review_eligibility();

-- Helper function to expire stale seat locks
CREATE OR REPLACE FUNCTION fn_cleanup_expired_seat_locks()
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE seat_lock SET lock_status = 'Expired' WHERE lock_status = 'Active' AND expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
