import React, { useState, useEffect } from 'react';
import { Booking, Ticket, WaitlistEntry } from '../types';
import { apiFetch } from '../services/api';
import { PrintTicketModal } from './PrintTicketModal';
import { Ticket as TicketIcon, Calendar, Clock, MapPin, Printer, Ban, Star } from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const [subTab, setSubTab] = useState<'tickets' | 'bookings' | 'waitlist' | 'review'>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlists, setWaitlists] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  // Review state
  const [reviewEventId, setReviewEventId] = useState<number | ''>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsData, bookingsData, waitlistData] = await Promise.all([
        apiFetch('/tickets/my-tickets'),
        apiFetch('/bookings/my-bookings'),
        apiFetch('/waitlist/my-waitlist'),
      ]);
      setTickets(ticketsData.tickets || []);
      setBookings(bookingsData.bookings || []);
      setWaitlists(waitlistData.waitlist || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancelBooking = async () => {
    if (!cancellingBooking) return;
    try {
      setCancelMsg(null);
      const data = await apiFetch('/cancellations', {
        method: 'POST',
        body: JSON.stringify({
          booking_id: cancellingBooking.booking_id,
          reason: cancelReason || 'Personal cancellation',
        }),
      });
      alert(`Booking #${cancellingBooking.booking_id} cancelled. Refund of ₹${parseFloat(data.cancellation.refund_amount).toFixed(2)} recorded.`);
      setCancellingBooking(null);
      setCancelReason('');
      loadData();
    } catch (err: any) {
      setCancelMsg(err.message);
    }
  };

  const handleLeaveWaitlist = async (waitlistId: number) => {
    try {
      await apiFetch(`/waitlist/${waitlistId}`, { method: 'DELETE' });
      setWaitlists(prev => prev.filter(w => w.waitlist_id !== waitlistId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewEventId) return;
    try {
      setReviewMsg(null);
      await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          event_id: Number(reviewEventId),
          rating: reviewRating,
          review_text: reviewText,
        }),
      });
      setReviewMsg(`Review submitted successfully!`);
      setReviewText('');
    } catch (err: any) {
      setReviewMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="container" style={{ padding: '30px 20px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem' }}>Customer Dashboard</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Manage your booked admissions, payments, tickets, and reviews</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
        <button
          className={`btn btn-sm ${subTab === 'tickets' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setSubTab('tickets')}
        >
          <TicketIcon size={15} /> My Tickets ({tickets.length})
        </button>
        <button
          className={`btn btn-sm ${subTab === 'bookings' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setSubTab('bookings')}
        >
          <Calendar size={15} /> Booking Orders ({bookings.length})
        </button>
        <button
          className={`btn btn-sm ${subTab === 'waitlist' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setSubTab('waitlist')}
        >
          <Clock size={15} /> Waitlist Queue ({waitlists.length})
        </button>
        <button
          className={`btn btn-sm ${subTab === 'review' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setSubTab('review')}
        >
          <Star size={15} /> Submit Event Review
        </button>
      </div>

      {loading ? (
        <p>Loading customer records...</p>
      ) : (
        <>
          {/* TAB 1: TICKETS */}
          {subTab === 'tickets' && (
            <div>
              {tickets.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                  <p>No tickets issued yet. Discover events and complete a booking to get tickets.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {tickets.map(t => (
                    <div key={t.ticket_id} className="card flex flex-col justify-between" style={{ padding: '20px' }}>
                      <div>
                        <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                          <span className={`badge ${t.ticket_status === 'Valid' ? 'badge-green' : t.ticket_status === 'Used' ? 'badge-gray' : 'badge-red'}`}>
                            {t.ticket_status}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                            {t.ticket_code}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{t.event_title}</h3>
                        <div className="flex items-center gap-2" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          <MapPin size={14} color="var(--success)" />
                          <span>{t.venue_name} • {t.section_name} (Seat {t.seat_number})</span>
                        </div>
                        <div className="flex items-center gap-2" style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                          <Calendar size={14} color="#a1a1aa" />
                          <span>{new Date(t.start_datetime).toLocaleDateString()} at {new Date(t.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '16px' }} className="flex items-center justify-between">
                        <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                          ₹{parseFloat(t.ticket_price as string).toFixed(2)}
                        </span>
                        <button className="btn btn-outline btn-sm" onClick={() => setSelectedTicket(t)}>
                          <Printer size={14} /> View & Print Pass
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BOOKINGS */}
          {subTab === 'bookings' && (
            <div>
              {bookings.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                  <p>No booking orders found.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {bookings.map(b => (
                    <div key={b.booking_id} className="card flex items-center justify-between flex-wrap gap-4" style={{ padding: '18px' }}>
                      <div>
                        <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>Booking #{b.booking_id}</span>
                          <span className={`badge ${b.booking_status === 'Confirmed' ? 'badge-green' : b.booking_status === 'Cancelled' ? 'badge-red' : 'badge-yellow'}`}>
                            {b.booking_status}
                          </span>
                          {b.payment_status && (
                            <span className="badge badge-indigo">Payment: {b.payment_status}</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>{b.event_title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                          {new Date(b.start_datetime).toLocaleDateString()} • {b.venue_name} • {b.total_seats} seat(s)
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Total Amount</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--success)' }}>
                            ₹{parseFloat(b.total_amount as string).toFixed(2)}
                          </div>
                          {b.refund_amount && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--danger)' }}>
                              Refunded: ₹{parseFloat(b.refund_amount as string).toFixed(2)}
                            </div>
                          )}
                        </div>

                        {b.booking_status === 'Confirmed' && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                            onClick={() => setCancellingBooking(b)}
                          >
                            <Ban size={14} /> Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WAITLIST */}
          {subTab === 'waitlist' && (
            <div>
              {waitlists.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                  <p>You are not currently in any waitlists.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {waitlists.map(w => (
                    <div key={w.waitlist_id} className="card flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
                          <span className={`badge ${w.waitlist_status === 'Promoted' ? 'badge-green' : 'badge-yellow'}`}>
                            {w.waitlist_status === 'Promoted' ? 'Seats Available!' : `Queue Position #${w.position}`}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>{w.event_title}</h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {new Date(w.start_datetime).toLocaleDateString()} • {w.venue_name}
                        </p>
                      </div>

                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleLeaveWaitlist(w.waitlist_id)}
                      >
                        Leave Waitlist
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WRITE REVIEW */}
          {subTab === 'review' && (
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Leave Event Review</h2>
              <p style={{ fontSize: '0.85rem', marginBottom: '16px', color: 'var(--text-muted)' }}>
                You can review events that you possess a confirmed booking for.
              </p>

              {reviewMsg && (
                <div style={{ background: reviewMsg.startsWith('Error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', color: reviewMsg.startsWith('Error') ? '#fca5a5' : '#86efac' }}>
                  {reviewMsg}
                </div>
              )}

              <form onSubmit={handleSubmitReview} className="flex flex-col gap-3">
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Select Event:
                  </label>
                  <select
                    className="select"
                    value={reviewEventId}
                    onChange={e => setReviewEventId(Number(e.target.value))}
                    required
                  >
                    <option value="">-- Choose Event --</option>
                    {bookings.filter(b => b.booking_status === 'Confirmed').map(b => (
                      <option key={b.booking_id} value={b.event_id}>
                        {b.event_title} (Booking #{b.booking_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Rating (1 to 5 Stars):
                  </label>
                  <select
                    className="select"
                    value={reviewRating}
                    onChange={e => setReviewRating(Number(e.target.value))}
                  >
                    <option value={5}>5 Stars - Outstanding</option>
                    <option value={4}>4 Stars - Great</option>
                    <option value={3}>3 Stars - Average</option>
                    <option value={2}>2 Stars - Poor</option>
                    <option value={1}>1 Star - Terrible</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Review Comments:
                  </label>
                  <textarea
                    className="textarea"
                    rows={4}
                    placeholder="Share your experience at this event..."
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                  Submit Review
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Printable Ticket Modal */}
      {selectedTicket && (
        <PrintTicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      {/* Cancellation Modal */}
      {cancellingBooking && (
        <div className="modal-overlay" onClick={() => setCancellingBooking(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', color: 'var(--danger)' }}>
              Confirm Booking Cancellation
            </h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '14px', lineHeight: 1.5, color: 'var(--text-muted)' }}>
              Are you sure you want to cancel Booking #{cancellingBooking.booking_id}?
              Under our cancellation policy, an <strong>80% refund</strong> of ₹
              {(parseFloat(cancellingBooking.total_amount as string) * 0.8).toFixed(2)} will be recorded, and associated tickets will be revoked.
            </p>

            {cancelMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.82rem', color: '#fca5a5' }}>
                {cancelMsg}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Reason for cancellation:
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Schedule clash"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
            </div>

            <div className="flex justify-between gap-3">
              <button className="btn btn-outline flex-1" onClick={() => setCancellingBooking(null)}>
                Keep Booking
              </button>
              <button className="btn btn-danger flex-1" onClick={handleCancelBooking}>
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
