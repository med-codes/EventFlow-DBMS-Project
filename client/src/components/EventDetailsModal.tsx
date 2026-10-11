import React, { useState, useEffect } from 'react';
import { EventItem, EventSchedule } from '../types';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Calendar, MapPin, Star, Users, Clock } from 'lucide-react';

interface EventDetailsModalProps {
  event: EventItem;
  onClose: () => void;
  onSelectSchedule: (schedule: EventSchedule) => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, onClose, onSelectSchedule }) => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<EventSchedule[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [waitlistMsg, setWaitlistMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await apiFetch(`/events/${event.event_id}`);
        setSchedules(data.schedules || []);
        setReviews(data.reviews || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [event.event_id]);

  const joinWaitlist = async (scheduleId: number) => {
    if (!user) {
      alert('Please sign in to join the waitlist');
      return;
    }
    try {
      const data = await apiFetch('/waitlist/join', {
        method: 'POST',
        body: JSON.stringify({ schedule_id: scheduleId }),
      });
      setWaitlistMsg(data.message);
    } catch (err: any) {
      setWaitlistMsg(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
          <div>
            <span className="badge badge-indigo" style={{ marginBottom: '6px' }}>{event.category_name}</span>
            <h2 style={{ fontSize: '1.4rem' }}>{event.title}</h2>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Event description */}
        <p style={{ marginBottom: '20px', lineHeight: 1.6 }}>{event.description}</p>

        {waitlistMsg && (
          <div style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1px solid #6366f1', color: '#c7d2fe', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
            {waitlistMsg}
          </div>
        )}

        {/* Schedules Section */}
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Available Event Schedules</h3>
        {loading ? (
          <p>Loading schedules...</p>
        ) : schedules.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: '#64748b' }}>No upcoming schedules published for this event yet.</p>
        ) : (
          <div className="flex flex-col gap-3" style={{ marginBottom: '24px' }}>
            {schedules.map(sch => (
              <div 
                key={sch.schedule_id} 
                className="card flex items-center justify-between flex-wrap gap-3"
                style={{ padding: '16px', background: '#0f172a' }}
              >
                <div>
                  <div className="flex items-center gap-2" style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem', marginBottom: '4px' }}>
                    <Calendar size={16} color="#818cf8" />
                    <span>{new Date(sch.start_datetime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <Clock size={14} color="#94a3b8" style={{ marginLeft: '6px' }} />
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      {new Date(sch.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2" style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                    <MapPin size={14} color="#10b981" />
                    <span>{sch.venue_name}</span>
                    <span style={{ color: '#64748b' }}>• Capacity: {sch.capacity}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => joinWaitlist(sch.schedule_id)}
                  >
                    <Users size={14} /> Waitlist
                  </button>
                  <button 
                    className="btn btn-primary btn-sm"
                    disabled={sch.schedule_status !== 'Scheduled'}
                    onClick={() => { onClose(); onSelectSchedule(sch); }}
                  >
                    Select Seats
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reviews Section */}
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Customer Reviews ({reviews.length})</h3>
        {reviews.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No reviews yet. Be the first to attend and review!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {reviews.map(r => (
              <div key={r.review_id} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.customer_name}</span>
                  <div className="flex items-center gap-1" style={{ color: '#fbbf24', fontSize: '0.8rem' }}>
                    <Star size={13} fill="#fbbf24" />
                    <span>{r.rating}/5</span>
                  </div>
                </div>
                {r.review_text && <p style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{r.review_text}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
