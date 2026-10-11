// Application types matching PostgreSQL schema
export type UserRole = 'Customer' | 'Organizer' | 'Admin';

export interface User {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  accountStatus: 'Active' | 'Inactive';
}

export interface EventCategory {
  category_id: number;
  category_name: string;
  description?: string;
}

export interface EventItem {
  event_id: number;
  title: string;
  description?: string;
  approval_status: 'Pending' | 'Approved' | 'Rejected';
  rejection_reason?: string;
  category_id: number;
  category_name: string;
  organizer_name: string;
  average_rating: number | string;
  total_reviews: number | string;
  min_price?: number | string;
  created_at?: string;
}

export interface EventSchedule {
  schedule_id: number;
  event_id: number;
  venue_id: number;
  venue_name: string;
  venue_address?: string;
  capacity?: number;
  start_datetime: string;
  end_datetime: string;
  schedule_status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
}

export interface TicketCategory {
  ticket_category_id: number;
  schedule_id: number;
  category_name: string;
  price: string | number;
}

export interface SeatItem {
  sectionId: number;
  sectionName: string;
  seatId: number;
  seatNumber: string;
  status: 'Available' | 'Locked' | 'MyLock' | 'Booked';
  lockExpiresAt?: string;
}

export interface Booking {
  booking_id: number;
  schedule_id: number;
  booking_date: string;
  total_amount: string | number;
  booking_status: 'Pending' | 'Confirmed' | 'Cancelled';
  event_title: string;
  event_id: number;
  start_datetime: string;
  end_datetime: string;
  venue_name: string;
  venue_address: string;
  payment_status?: string;
  transaction_reference?: string;
  cancellation_id?: number;
  refund_amount?: string | number;
  cancelled_at?: string;
  total_seats: number | string;
}

export interface Ticket {
  ticket_id: number;
  ticket_code: string;
  ticket_status: 'Valid' | 'Used' | 'Cancelled';
  generated_at: string;
  event_id: number;
  event_title: string;
  schedule_id: number;
  start_datetime: string;
  end_datetime: string;
  venue_name: string;
  venue_address: string;
  section_name: string;
  seat_number: string;
  ticket_category: string;
  ticket_price: string | number;
  booking_id: number;
  customer_name: string;
}

export interface WaitlistEntry {
  waitlist_id: number;
  schedule_id: number;
  joined_at: string;
  position: number;
  waitlist_status: 'Waiting' | 'Promoted' | 'Cancelled' | 'Expired';
  event_title: string;
  start_datetime: string;
  end_datetime: string;
  venue_name: string;
}

export interface NotificationItem {
  notification_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}
