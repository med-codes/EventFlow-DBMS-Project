import { z } from 'zod';

// Public registration schema (blocks Admin role from public registration)
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  role: z.enum(['Customer', 'Organizer'], {
    errorMap: () => ({ message: 'Public role must be either Customer or Organizer' }),
  }),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Create event schema
export const createEventSchema = z.object({
  category_id: z.number().int().positive(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
});

// Create schedule schema
export const createScheduleSchema = z.object({
  venue_id: z.number().int().positive(),
  start_datetime: z.string().datetime(),
  end_datetime: z.string().datetime(),
});

// Create ticket category schema
export const createTicketCategorySchema = z.object({
  category_name: z.string().min(2),
  price: z.number().min(0, 'Price must be non-negative'),
});

// Acquire seat locks schema
export const lockSeatsSchema = z.object({
  schedule_id: z.number().int().positive(),
  seat_ids: z.array(z.number().int().positive()).min(1, 'Select at least one seat'),
});

// Create booking schema
export const createBookingSchema = z.object({
  schedule_id: z.number().int().positive(),
  seats: z.array(
    z.object({
      seat_id: z.number().int().positive(),
      ticket_category_id: z.number().int().positive(),
    })
  ).min(1, 'At least one seat must be selected'),
});

// Payment simulation schema
export const paymentSchema = z.object({
  booking_id: z.number().int().positive(),
  payment_method: z.string().min(2),
  simulation_outcome: z.enum(['Successful', 'Failed']).default('Successful'),
});

// Cancellation schema
export const cancellationSchema = z.object({
  booking_id: z.number().int().positive(),
  reason: z.string().min(3, 'Reason is required'),
});

// Review schema
export const reviewSchema = z.object({
  event_id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().optional(),
});
