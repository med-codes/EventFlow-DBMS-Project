import React, { useState, useEffect } from 'react';
import { EventSchedule, SeatItem, TicketCategory } from '../types';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Clock, CheckCircle2, AlertTriangle, CreditCard, RefreshCw } from 'lucide-react';

interface SeatingModalProps {
  schedule: EventSchedule;
  onClose: () => void;
  onBookingSuccess: (bookingId: number) => void;
  openAuthModal: () => void;
}

export const SeatingModal: React.FC<SeatingModalProps> = ({ schedule, onClose, onBookingSuccess, openAuthModal }) => {
  const { user } = useAuth();
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [seatCategories, setSeatCategories] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [lockTimer, setLockTimer] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Checkout modal states
  const [showCheckout, setShowCheckout] = useState<boolean>(false);
  const [pendingBookingId, setPendingBookingId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('Simulated UPI Instant');
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Load seating layout and ticket categories
  const loadSeating = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [seatingData, scheduleData] = await Promise.all([
        apiFetch(`/schedules/${schedule.schedule_id}/seating`),
        apiFetch(`/schedules/${schedule.schedule_id}`),
      ]);
      setSeats(seatingData.seats || []);
      setTicketCategories(scheduleData.ticketCategories || []);

      // Default category selection
      if (scheduleData.ticketCategories?.length > 0) {
        const defaultCatId = scheduleData.ticketCategories[0].ticket_category_id;
        setSeatCategories(prev => {
          const updated = { ...prev };
          (seatingData.seats || []).forEach((s: SeatItem) => {
            if (!updated[s.seatId]) updated[s.seatId] = defaultCatId;
          });
          return updated;
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeating();
  }, [schedule.schedule_id]);

  // Lock countdown timer effect
  useEffect(() => {
    if (lockTimer === null || lockTimer <= 0) return;
    const interval = setInterval(() => {
      setLockTimer(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockTimer]);

  // Handle seat click
  const toggleSeat = async (seat: SeatItem) => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (seat.status === 'Booked' || seat.status === 'Locked') {
      return;
    }

    setErrorMsg(null);
    let nextSelected: number[];
    if (selectedSeatIds.includes(seat.seatId)) {
      nextSelected = selectedSeatIds.filter(id => id !== seat.seatId);
    } else {
      nextSelected = [...selectedSeatIds, seat.seatId];
    }
    setSelectedSeatIds(nextSelected);

    // If seats are selected, acquire temporary locks via API
    if (nextSelected.length > 0) {
      try {
        await apiFetch(`/schedules/${schedule.schedule_id}/locks`, {
          method: 'POST',
          body: JSON.stringify({ seat_ids: nextSelected }),
        });
        setLockTimer(10 * 60); // 10 minutes
      } catch (err: any) {
        setErrorMsg(err.message);
        loadSeating();
      }
    } else {
      // Release locks
      try {
        await apiFetch(`/schedules/${schedule.schedule_id}/locks/release`, { method: 'POST' });
        setLockTimer(null);
      } catch (err) {}
    }
  };

  // Group seats by section
  const sectionsMap: Record<string, SeatItem[]> = {};
  seats.forEach(s => {
    if (!sectionsMap[s.sectionName]) sectionsMap[s.sectionName] = [];
    sectionsMap[s.sectionName].push(s);
  });

  // Calculate estimated total on client
  const calculatedTotal = selectedSeatIds.reduce((sum, seatId) => {
    const catId = seatCategories[seatId] || (ticketCategories[0]?.ticket_category_id);
    const cat = ticketCategories.find(c => c.ticket_category_id === catId);
    return sum + (cat ? parseFloat(cat.price as string) : 0);
  }, 0);

  // Step 1: Create Booking Order
  const handleProceedToCheckout = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (selectedSeatIds.length === 0) {
      setErrorMsg('Please select at least one seat');
      return;
    }
    if (!ticketCategories || ticketCategories.length === 0) {
      setErrorMsg('No ticket categories are configured for this schedule. Please contact the organizer.');
      return;
    }

    try {
      setErrorMsg(null);
      const payload = {
        schedule_id: schedule.schedule_id,
        seats: selectedSeatIds.map(seatId => ({
          seat_id: seatId,
          ticket_category_id: seatCategories[seatId] || ticketCategories[0].ticket_category_id,
        })),
      };

      const data = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setPendingBookingId(data.booking.bookingId);
      setShowCheckout(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Step 2: Process Simulated Payment
  const handleSimulatePayment = async (outcome: 'Successful' | 'Failed') => {
    if (!pendingBookingId) return;
    try {
      setProcessingPayment(true);
      setPaymentError(null);

      const data = await apiFetch('/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          booking_id: pendingBookingId,
          payment_method: paymentMethod,
          simulation_outcome: outcome,
        }),
      });

      if (data.success) {
        setShowCheckout(false);
        onClose();
        onBookingSuccess(pendingBookingId);
      } else {
        setPaymentError('Payment simulation failed as requested. You can retry with another method or choose Successful.');
      }
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px' }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <span className="badge badge-indigo" style={{ marginBottom: '4px' }}>Venue Seating Layout</span>
            <h2 style={{ fontSize: '1.35rem' }}>{schedule.venue_name}</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Schedule #{schedule.schedule_id} • {new Date(schedule.start_datetime).toLocaleString()}
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Lock Timer Alert */}
        {lockTimer !== null && lockTimer > 0 && (
          <div className="flex items-center justify-between" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-main)', fontSize: '0.86rem', fontWeight: 600 }}>
              <Clock size={16} color="var(--warning)" /> Temporary Seat Lock Active
            </div>
            <div style={{ fontWeight: 800, color: 'var(--warning)', fontSize: '0.95rem' }}>
              {Math.floor(lockTimer / 60)}:{(lockTimer % 60).toString().padStart(2, '0')}
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Stage / Screen Representation */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ background: 'linear-gradient(90deg, transparent, #ffffff, transparent)', height: '2px', width: '60%', margin: '0 auto 8px', opacity: 0.8 }} />
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 700 }}>
            STAGE / SCREEN FRONT
          </span>
        </div>

        {/* Seat Legend */}
        <div className="flex items-center justify-center gap-6" style={{ marginBottom: '20px', fontSize: '0.78rem' }}>
          <div className="flex items-center gap-2">
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#18181b', border: '1px solid #3f3f46' }} />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#ffffff', border: '1px solid #ffffff' }} />
            <span style={{ fontWeight: 600, color: '#ffffff' }}>Selected by You</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b' }} />
            <span>Locked</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#121215', border: '1px solid #27272a' }} />
            <span style={{ color: 'var(--text-dim)' }}>Booked</span>
          </div>
        </div>

        {/* Sections and Seats */}
        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px 0' }}>Loading seat layout...</p>
        ) : (
          <div className="flex flex-col gap-5" style={{ marginBottom: '24px' }}>
            {Object.entries(sectionsMap).map(([sectionName, sectionSeats]) => (
              <div key={sectionName} style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
                  {sectionName}
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {sectionSeats.map(seat => {
                    const isSelected = selectedSeatIds.includes(seat.seatId);
                    let seatClass = 'seat-available';
                    if (seat.status === 'Booked') seatClass = 'seat-booked';
                    else if (seat.status === 'Locked') seatClass = 'seat-locked';
                    else if (isSelected) seatClass = 'seat-selected';

                    return (
                      <button
                        key={seat.seatId}
                        className={`seat-btn ${seatClass}`}
                        onClick={() => toggleSeat(seat)}
                        disabled={seat.status === 'Booked' || seat.status === 'Locked'}
                        title={`Seat ${seat.seatNumber} (${seat.status})`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Seats & Ticket Category Selection */}
        {selectedSeatIds.length > 0 && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '10px' }}>Selected Seats & Ticket Pricing</h4>
            {ticketCategories.length === 0 ? (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px 14px', borderRadius: '8px', fontSize: '0.84rem' }}>
                ⚠️ No ticket pricing tiers are configured for this schedule yet. Please contact the event organizer to publish ticket categories before booking.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedSeatIds.map(seatId => {
                  const seatObj = seats.find(s => s.seatId === seatId);
                  const currentCatId = seatCategories[seatId] || ticketCategories[0]?.ticket_category_id;
                  return (
                    <div key={seatId} className="flex items-center justify-between" style={{ fontSize: '0.85rem', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      <span style={{ fontWeight: 600 }}>Seat {seatObj?.seatNumber} ({seatObj?.sectionName})</span>
                      <select
                        className="select"
                        style={{ width: '220px', padding: '6px 10px', fontSize: '0.82rem' }}
                        value={currentCatId}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          setSeatCategories(prev => ({ ...prev, [seatId]: val }));
                        }}
                      >
                        {ticketCategories.map(tc => (
                          <option key={tc.ticket_category_id} value={tc.ticket_category_id}>
                            {tc.category_name} - ₹{parseFloat(tc.price as string).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer with Total and Booking Action */}
        <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              {selectedSeatIds.length} seat(s) selected
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
              Total: ₹{calculatedTotal.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn btn-outline btn-sm" onClick={loadSeating} title="Refresh Seating">
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              className="btn btn-primary"
              disabled={selectedSeatIds.length === 0 || ticketCategories.length === 0}
              onClick={handleProceedToCheckout}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>

      {/* Payment Simulation Modal */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <div className="flex items-center gap-2">
                <CreditCard size={20} color="#ffffff" />
                <h3 style={{ fontSize: '1.2rem' }}>Simulated Payment Checkout</h3>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setShowCheckout(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
              <div className="flex justify-between" style={{ marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Booking ID:</span>
                <span style={{ fontWeight: 600 }}>#{pendingBookingId}</span>
              </div>
              <div className="flex justify-between" style={{ marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Seats:</span>
                <span style={{ fontWeight: 600 }}>{selectedSeatIds.length}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--success)', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '6px' }}>
                <span>Total Amount:</span>
                <span>₹{calculatedTotal.toFixed(2)}</span>
              </div>
            </div>

            {paymentError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem' }}>
                {paymentError}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Demo Payment Method:
              </label>
              <select
                className="select"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              >
                <option value="Simulated UPI Instant">Simulated UPI Instant</option>
                <option value="Simulated Credit Card">Simulated Credit Card</option>
                <option value="Simulated Net Banking">Simulated Net Banking</option>
              </select>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
              This is a simulated payment checkout. No actual financial data is collected.
            </p>

            <div className="flex flex-col gap-2">
              <button
                className="btn btn-success"
                disabled={processingPayment}
                onClick={() => handleSimulatePayment('Successful')}
              >
                <CheckCircle2 size={16} /> Simulate Successful Payment
              </button>
              <button
                className="btn btn-outline"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                disabled={processingPayment}
                onClick={() => handleSimulatePayment('Failed')}
              >
                <AlertTriangle size={16} /> Simulate Payment Failure (Test Retry)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
