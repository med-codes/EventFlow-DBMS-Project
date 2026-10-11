import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { Plus, Calendar, DollarSign, Users, Clock, AlertTriangle, CheckCircle, Tag } from 'lucide-react';

export const OrganizerDashboard: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number>(1);

  // Schedule modal
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [venueId, setVenueId] = useState<number>(1);
  const [startDatetime, setStartDatetime] = useState<string>('');
  const [endDatetime, setEndDatetime] = useState<string>('');

  // Ticket category modal
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [categoryName, setCategoryName] = useState<string>('Standard General');
  const [ticketPrice, setTicketPrice] = useState<number>(50);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const catsData = await apiFetch('/events/categories');
      if (catsData.categories && catsData.categories.length > 0) {
        setCategories(catsData.categories);
        setCategoryId(prev => {
          const exists = catsData.categories.some((c: any) => c.category_id === prev);
          return exists ? prev : catsData.categories[0].category_id;
        });
      }
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    // Fetch categories first independently
    await fetchCategories();

    // Fetch organizer protected endpoints safely
    try {
      const [eventsData, venuesData, analyticsData] = await Promise.all([
        apiFetch('/organizer/events').catch(() => ({ events: [] })),
        apiFetch('/organizer/venues').catch(() => ({ venues: [] })),
        apiFetch('/organizer/analytics').catch(() => ({ analytics: [] })),
      ]);
      setEvents(eventsData.events || []);
      setVenues(venuesData.venues || []);
      setAnalytics(analyticsData.analytics || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFeedbackMsg(null);
      await apiFetch('/organizer/events', {
        method: 'POST',
        body: JSON.stringify({ category_id: categoryId, title, description }),
      });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      loadData();
      alert('Event submitted for admin approval!');
    } catch (err: any) {
      setFeedbackMsg(err.message);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    try {
      setFeedbackMsg(null);
      const startIso = new Date(startDatetime).toISOString();
      const endIso = new Date(endDatetime).toISOString();
      await apiFetch(`/organizer/events/${selectedEventId}/schedules`, {
        method: 'POST',
        body: JSON.stringify({ venue_id: venueId, start_datetime: startIso, end_datetime: endIso }),
      });
      setShowScheduleModal(false);
      loadData();
      alert('Schedule added successfully!');
    } catch (err: any) {
      setFeedbackMsg(err.message);
    }
  };

  const handleAddTicketCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleId) return;
    try {
      setFeedbackMsg(null);
      await apiFetch(`/organizer/schedules/${selectedScheduleId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ category_name: categoryName, price: Number(ticketPrice) }),
      });
      setShowCategoryModal(false);
      alert('Ticket tier added to schedule!');
    } catch (err: any) {
      setFeedbackMsg(err.message);
    }
  };

  const totalGross = analytics.reduce((s, a) => s + parseFloat(a.gross_revenue || '0'), 0);
  const totalTickets = analytics.reduce((s, a) => s + parseInt(a.total_tickets_sold || '0', 10), 0);

  return (
    <div className="container" style={{ padding: '30px 20px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem' }}>Organizer Management Portal</h1>
          <p style={{ fontSize: '0.9rem' }}>Create events, configure schedules, and view revenue analytics</p>
        </div>
        <button className="btn btn-primary" onClick={() => { if (categories.length === 0) fetchCategories(); setShowCreateModal(true); }}>
          <Plus size={16} /> Create New Event
        </button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-3 gap-4" style={{ marginBottom: '30px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div className="flex items-center gap-2" style={{ color: '#818cf8', fontSize: '0.8rem', fontWeight: 600 }}>
            <Calendar size={16} /> Total Events Created
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px' }}>{events.length}</div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div className="flex items-center gap-2" style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: 600 }}>
            <Users size={16} /> Total Tickets Sold
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: '#10b981' }}>{totalTickets}</div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div className="flex items-center gap-2" style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
            <DollarSign size={16} /> Total Gross Revenue
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: '#fbbf24' }}>
            ${totalGross.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>My Managed Events</h3>
        {loading ? (
          <p>Loading events...</p>
        ) : events.length === 0 ? (
          <p>No events created yet. Click Create New Event to start.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(ev => (
              <div key={ev.event_id} className="card flex items-center justify-between flex-wrap gap-4" style={{ background: '#0f172a', padding: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{ev.title}</span>
                    <span className={`badge ${ev.approval_status === 'Approved' ? 'badge-green' : ev.approval_status === 'Rejected' ? 'badge-red' : 'badge-yellow'}`}>
                      {ev.approval_status}
                    </span>
                    <span className="badge badge-indigo">{ev.category_name}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', marginBottom: '6px' }}>{ev.description || 'No description'}</p>
                  {ev.rejection_reason && (
                    <div style={{ color: '#f87171', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                      Admin Feedback: {ev.rejection_reason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => { setSelectedEventId(ev.event_id); setShowScheduleModal(true); }}
                  >
                    <Calendar size={14} /> Add Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event Categories Reference Directory */}
      <div className="card" style={{ padding: '20px', marginTop: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '8px' }}>Event Categories Directory</h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
          Overview of classifications and scope for organizing events in EventFlow
        </p>
        <div className="grid grid-cols-2 gap-3">
          {categories.map(c => (
            <div key={c.category_id} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '12px 16px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.92rem' }}>{c.category_name}</span>
                <span className="badge badge-indigo" style={{ fontSize: '0.68rem' }}>ID #{c.category_id}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0 }}>
                {c.description || 'No description available'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Submit New Event</h3>
            {feedbackMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', color: '#fca5a5' }}>
                {feedbackMsg}
              </div>
            )}
            <form onSubmit={handleCreateEvent} className="flex flex-col gap-3">
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Event Category:</label>
                <select className="select" value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}>
                  {categories.length === 0 ? (
                    <option value="">Loading categories...</option>
                  ) : (
                    categories.map(c => (
                      <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                    ))
                  )}
                </select>
                {/* Display Selected Category Details */}
                {(() => {
                  const currentCat = categories.find(c => c.category_id === categoryId);
                  if (!currentCat) return null;
                  return (
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '6px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '8px 12px', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 700, color: '#818cf8', marginBottom: '2px' }}>
                        Category Details ({currentCat.category_name}):
                      </div>
                      <div style={{ color: '#94a3b8' }}>
                        {currentCat.description || 'No description provided for this category.'}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Event Title:</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Symphony Under The Stars"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Description:</label>
                <textarea
                  className="textarea"
                  rows={4}
                  placeholder="Describe your event..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-between gap-3" style={{ marginTop: '10px' }}>
                <button type="button" className="btn btn-outline flex-1" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Submit for Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Add Event Schedule</h3>
            {feedbackMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', color: '#fca5a5' }}>
                {feedbackMsg}
              </div>
            )}
            <form onSubmit={handleAddSchedule} className="flex flex-col gap-3">
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Select Venue:</label>
                <select className="select" value={venueId} onChange={e => setVenueId(Number(e.target.value))}>
                  {venues.map(v => (
                    <option key={v.venue_id} value={v.venue_id}>{v.venue_name} (Capacity: {v.capacity})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Start Date & Time:</label>
                <input
                  type="datetime-local"
                  className="input"
                  required
                  value={startDatetime}
                  onChange={e => setStartDatetime(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>End Date & Time:</label>
                <input
                  type="datetime-local"
                  className="input"
                  required
                  value={endDatetime}
                  onChange={e => setEndDatetime(e.target.value)}
                />
              </div>

              <div className="flex justify-between gap-3" style={{ marginTop: '10px' }}>
                <button type="button" className="btn btn-outline flex-1" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Publish Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
