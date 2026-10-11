# EventFlow — Database Normalization Report (1NF, 2NF, 3NF)

This document explains the formal normalization process applied to the **EventFlow** relational database design for college DBMS evaluation.

---

## 1. First Normal Form (1NF)

### Requirement:
- Each table cell must contain atomic (indivisible) values.
- There must be no repeating groups or multivalued attributes.
- Each record must have a unique identifier (Primary Key).

### Application in EventFlow:
1. **No Comma-Separated Values:** In older designs, one might store a comma-separated list of booked seats inside the `booking` table (`seats: "A1, A2, A3"`). In EventFlow, this is completely decomposed into individual atomic tuples within the `booking_seat` relation (`booking_seat_id`, `booking_id`, `seat_id`).
2. **Explicit Candidate & Primary Keys:** Every relation uses standard PostgreSQL generated identity columns as surrogate primary keys, along with appropriate composite candidate keys.
3. **Atomic User Attributes:** Contact details are split into distinct atomic attributes (`email`, `phone`, `name`) rather than bundled text fields.

---

## 2. Second Normal Form (2NF)

### Requirement:
- The relation must already be in 1NF.
- There must be **no partial functional dependencies**: every non-prime attribute must be fully functionally dependent on the entire primary key, not a proper subset of a composite candidate key.

### Application in EventFlow:
Consider the junction between bookings and seats:
- In an unnormalized design, one might attempt to put seat attributes (`seat_number`, `section_name`, `venue_name`) and ticket price inside `booking_seat`.
- If the key were `(booking_id, seat_id)`, then `section_name` and `venue_name` would depend only on `seat_id` (a partial dependency), violating 2NF.
- **Decomposition:**
  - `venue` stores venue details (`venue_id -> venue_name, address, capacity`).
  - `section` stores section details (`section_id -> venue_id, section_name`).
  - `seat` stores seat details (`seat_id -> section_id, seat_number`).
  - `booking_seat` stores only attributes specific to that booking instance: `booking_seat_id -> booking_id, seat_id, ticket_category_id, price`.

---

## 3. Third Normal Form (3NF)

### Requirement:
- The relation must already be in 2NF.
- There must be **no transitive functional dependencies**: no non-prime attribute can be functionally dependent on another non-prime attribute ($X \rightarrow Y$ and $Y \rightarrow Z$).

### Application in EventFlow:
1. **Venue vs Event Schedule:**
   - An event schedule specifies a `venue_id`. If `event_schedule` also stored `venue_name`, `venue_address`, and `venue_capacity`, there would be a transitive dependency: `schedule_id -> venue_id -> venue_name`.
   - In EventFlow, `event_schedule` stores only `venue_id` as a foreign key. The venue details reside exclusively in `venue`.
2. **Event Categories:**
   - The `event` relation references `category_id`. Category description and naming reside solely in `event_category`, eliminating transitive dependencies.
3. **Customer Reviews:**
   - Customer information (`name`, `email`) is not stored in `review`. Only `user_id` and `event_id` are stored with the rating.

---

## 4. Analysis of Historical Data vs Derived Fields

A common viva question concerns why `price` appears in both `ticket_category` and `booking_seat`:

- `ticket_category.price` represents the **current catalog price** of a ticket category for that schedule. An organizer may change or discount this price before the event starts.
- `booking_seat.price` captures the **historical transaction price** at the exact time the booking was placed and paid.

Similarly, `booking.total_amount` is a derived financial transaction total captured at checkout. Storing it preserves an immutable audit record of the paid transaction even if line items or refund policies change later.

All functional dependencies are documented, verified, and consistent with 3NF principles.
