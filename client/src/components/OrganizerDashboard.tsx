import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { Plus, Calendar, DollarSign, Users, Clock, AlertTriangle, CheckCircle, Tag, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';

const getTomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

export const OrganizerDashboard: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Expanded event schedules state
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
  const [eventSchedules, setEventSchedules] = useState<Record<number, any[]>>({});
  const [loadingSchedules, setLoadingSchedules] = useState<boolean>(false);

  // Create Event Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number>(1);

  // Add Schedule Modal state with 12-hour AM/PM Date & Time Picker
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [venueId, setVenueId] = useState<number>(1);

  const [startDate, setStartDate] = useState<string>(getTomorrowDate());
  const [startHour, setStartHour] = useState<string>('10');
  const [startMinute, setStartMinute] = useState<string>('00');
  const [startAmpm, setStartAmpm] = useState<'AM' | 'PM'>('AM');

  const [endDate, setEndDate] = useState<string>(getTomorrowDate());
  const [endHour, setEndHour] = useState<string>('01');
  const [endMinute, setEndMinute] = useState<string>('00');
  const [endAmpm, setEndAmpm] = useState<'AM' | 'PM'>('PM');

  // Ticket categories for newly added schedule
  const [scheduleTiers, setScheduleTiers] = useState<Array<{ name: string; price: number }>>([
    { name: 'Standard General', price: 50 },
    { name: 'VIP Access', price: 100 },
  ]);

  // Add Ticket Tier Modal (for existing schedule)
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [categoryName, setCategoryName] = useState<string>('Balcony Reserve');
  const [ticketPrice, setTicketPrice] = useState<number>(75);

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
    await fetchCategories();

    try {
      const [eventsData, venuesData, analyticsData] = await Promise.all([
        apiFetch('/organizer/events').catch(() => ({ events: [] })),
        apiFetch('/organizer/venues').catch(() => ({ venues: [] })),
        apiFetch('/organizer/analytics').catch(() => ({ analytics: [] })),
      ]);
      setEvents(eventsData.events || []);
      setVenues(venuesData.venues || []);
      if (venuesData.venues && venuesData.venues.length > 0) {
        setVenueId(venuesData.venues[0].venue_id);
      }
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

  const loadEventSchedules = async (eventId: number) => {
    try {
      setLoadingSchedules(true);
      const res = await apiFetch(`/organizer/events/${eventId}/schedules`);
      setEventSchedules(prev => ({ ...prev, [eventId]: res.schedules || [] }));
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const toggleExpandEvent = (eventId: number) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
    } else {
      setExpandedEventId(eventId);
      loadEventSchedules(eventId);
    }
  };

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
      alert('Event submitted for admin approval! (Tip: Use the Admin demo tab to approve it).');
    } catch (err: any) {
      setFeedbackMsg(err.message);
    }
  };

  const toIsoDateTime = (dateStr: string, hour12: string, minute: string, ampm: 'AM' | 'PM') => {
    let h = parseInt(hour12, 10);
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const hStr = h.toString().padStart(2, '0');
    const mStr = minute.padStart(2, '0');
    const dateObj = new Date(`${dateStr}T${hStr}:${mStr}:00`);
    return dateObj.toISOString();
  };

  const handleOpenAddSchedule = (eventId: number) => {
    setSelectedEventId(eventId);
    setStartDate(getTomorrowDate());
    setStartHour('10');
    setStartMinute('00');
    setStartAmpm('AM');
    setEndDate(getTomorrowDate());
    setEndHour('01');
    setEndMinute('00');
    setEndAmpm('PM');
    setScheduleTiers([
      { name: 'Standard General', price: 50 },
      { name: 'VIP Access', price: 100 },
    ]);
    setFeedbackMsg(null);
    setShowScheduleModal(true);
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;

    try {
      setFeedbackMsg(null);
      const startIso = toIsoDateTime(startDate, startHour, startMinute, startAmpm);
      const endIso = toIsoDateTime(endDate, endHour, endMinute, endAmpm);

      if (new Date(endIso) <= new Date(startIso)) {
        setFeedbackMsg('End Date & Time must be after Start Date & Time');
        return;
      }

      const validTiers = scheduleTiers.filter(t => t.name.trim().length > 0 && t.price >= 0);
      if (validTiers.length === 0) {
        setFeedbackMsg('Please specify at least one ticket tier with a valid price.');
        return;
      }

      await apiFetch(`/organizer/events/${selectedEventId}/schedules`, {
        method: 'POST',
        body: JSON.stringify({
          venue_id: venueId,
          start_datetime: startIso,
          end_datetime: endIso,
          categories: validTiers.map(t => ({ category_name: t.name.trim(), price: Number(t.price) })),
        }),
      });

      setShowScheduleModal(false);
      loadData();
      if (expandedEventId === selectedEventId) {
        loadEventSchedules(selectedEventId);
      }
      alert('Event schedule published with ticket tiers successfully!');
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
      if (expandedEventId) {
        loadEventSchedules(expandedEventId);
      }
      alert('Ticket tier added to schedule!');
    } catch (err: any) {
      setFeedbackMsg(err.message);
    }
  };

  const totalGross = analytics.reduce((s, a) => s + parseFloat(a.gross_revenue || '0'), 0);
  const totalTickets = analytics.reduce((s, a) => s + parseInt(a.total_tickets_sold || '0', 10), 0);

  const hoursList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const minutesList = ['00', '15', '30', '45'];

  return (
    <div className="container" style={{ padding: '30px 20px' }}>
      <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem' }}>Organizer Management Portal</h1>
          <p style={{ fontSize: '0.9rem' }}>Create events, configure schedules with 12-hour AM/PM times & ticket pricing tiers</p>
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
          <div className="flex flex-col gap-4">
            {events.map(ev => (
              <div key={ev.event_id} className="card" style={{ background: '#0f172a', padding: '18px', border: '1px solid #334155' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>{ev.title}</span>
                      <span className={`badge ${ev.approval_status === 'Approved' ? 'badge-green' : ev.approval_status === 'Rejected' ? 'badge-red' : 'badge-yellow'}`}>
                        {ev.approval_status}
                      </span>
                      <span className="badge badge-indigo">{ev.category_name}</span>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: '#cbd5e1', marginBottom: '6px' }}>{ev.description || 'No description provided'}</p>
                    
                    {ev.approval_status === 'Pending' && (
                      <div style={{ color: '#fbbf24', fontSize: '0.78rem', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.25)', marginTop: '4px' }}>
                        ⏳ Awaiting Admin Approval — Tip: Click DEMO "Admin" in the navbar to approve this event in the Admin Dashboard.
                      </div>
                    )}
                    {ev.rejection_reason && (
                      <div style={{ color: '#f87171', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '6px', marginTop: '4px' }}>
                        Admin Feedback: {ev.rejection_reason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => toggleExpandEvent(ev.event_id)}
                      style={{ fontSize: '0.82rem' }}
                    >
                      {expandedEventId === ev.event_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {expandedEventId === ev.event_id ? 'Hide Schedules' : `View Schedules (${ev.schedules_count || 0})`}
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenAddSchedule(ev.event_id)}
                      style={{ fontSize: '0.82rem' }}
                    >
                      <Plus size={14} /> Add Schedule
                    </button>
                  </div>
                </div>

                {/* Expanded Schedules Section */}
                {expandedEventId === ev.event_id && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '0.92rem', color: '#94a3b8', margin: 0 }}>
                        Event Schedules & Configured Ticket Tiers:
                      </h4>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                        onClick={() => handleOpenAddSchedule(ev.event_id)}
                      >
                        <Plus size={13} /> + New Schedule
                      </button>
                    </div>

                    {loadingSchedules ? (
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Loading schedules...</p>
                    ) : (!eventSchedules[ev.event_id] || eventSchedules[ev.event_id].length === 0) ? (
                      <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', textAlign: 'center', fontSize: '0.84rem', color: '#94a3b8' }}>
                        No schedules published yet. Click <strong>+ Add Schedule</strong> to add a venue, time, and ticket prices!
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {eventSchedules[ev.event_id].map((sch: any) => (
                          <div key={sch.schedule_id} style={{ background: '#1e293b', padding: '14px 16px', borderRadius: '8px', border: '1px solid #334155' }} className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                              <div className="flex items-center gap-2" style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff', marginBottom: '3px' }}>
                                <span>{sch.venue_name}</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 400 }}>(Capacity: {sch.capacity})</span>
                              </div>
                              <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '8px' }}>
                                <Clock size={13} color="#818cf8" />
                                <span>
                                  {new Date(sch.start_datetime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                  {' • '}
                                  {new Date(sch.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {' to '}
                                  {new Date(sch.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>TICKET TIERS:</span>
                                {sch.ticketCategories?.map((tc: any) => (
                                  <span key={tc.ticket_category_id} className="badge badge-green" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                    {tc.category_name}: ${parseFloat(tc.price).toFixed(2)}
                                  </span>
                                ))}
                                {(!sch.ticketCategories || sch.ticketCategories.length === 0) && (
                                  <span className="badge badge-red" style={{ fontSize: '0.74rem' }}>No tiers yet</span>
                                )}
                              </div>
                            </div>

                            <button
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                              onClick={() => {
                                setSelectedScheduleId(sch.schedule_id);
                                setCategoryName('Standard General');
                                setTicketPrice(50);
                                setFeedbackMsg(null);
                                setShowCategoryModal(true);
                              }}
                            >
                              <Tag size={13} /> + Add Tier
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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

      {/* Add Schedule Modal with explicit 12-hour AM/PM picker & Ticket Tiers */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Add Event Schedule</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowScheduleModal(false)}>
                <X size={16} />
              </button>
            </div>

            {feedbackMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', color: '#fca5a5' }}>
                {feedbackMsg}
              </div>
            )}

            <form onSubmit={handleAddSchedule} className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Select Venue:</label>
                <select className="select" value={venueId} onChange={e => setVenueId(Number(e.target.value))}>
                  {venues.map(v => (
                    <option key={v.venue_id} value={v.venue_id}>{v.venue_name} (Capacity: {v.capacity})</option>
                  ))}
                </select>
              </div>

              {/* Start Date & Time with explicit 12-hour format & AM / PM */}
              <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, display: 'block', marginBottom: '8px', color: '#818cf8' }}>
                  Start Date & Time (12-Hour Format with AM / PM):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Start Date:</span>
                    <input
                      type="date"
                      className="input"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Time (Hour : Min : AM/PM):</span>
                    <div className="flex gap-1">
                      <select className="select flex-1" value={startHour} onChange={e => setStartHour(e.target.value)}>
                        {hoursList.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span style={{ alignSelf: 'center', fontWeight: 700, color: '#94a3b8' }}>:</span>
                      <select className="select flex-1" value={startMinute} onChange={e => setStartMinute(e.target.value)}>
                        {minutesList.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        className="select"
                        style={{ width: '80px', fontWeight: 800, color: startAmpm === 'AM' ? '#38bdf8' : '#f59e0b', background: '#1e293b' }}
                        value={startAmpm}
                        onChange={e => setStartAmpm(e.target.value as 'AM' | 'PM')}
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* End Date & Time with explicit 12-hour format & AM / PM */}
              <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, display: 'block', marginBottom: '8px', color: '#818cf8' }}>
                  End Date & Time (12-Hour Format with AM / PM):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>End Date:</span>
                    <input
                      type="date"
                      className="input"
                      required
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Time (Hour : Min : AM/PM):</span>
                    <div className="flex gap-1">
                      <select className="select flex-1" value={endHour} onChange={e => setEndHour(e.target.value)}>
                        {hoursList.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span style={{ alignSelf: 'center', fontWeight: 700, color: '#94a3b8' }}>:</span>
                      <select className="select flex-1" value={endMinute} onChange={e => setEndMinute(e.target.value)}>
                        {minutesList.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        className="select"
                        style={{ width: '80px', fontWeight: 800, color: endAmpm === 'AM' ? '#38bdf8' : '#f59e0b', background: '#1e293b' }}
                        value={endAmpm}
                        onChange={e => setEndAmpm(e.target.value as 'AM' | 'PM')}
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ticket Pricing Tiers Section */}
              <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#34d399' }}>
                    Ticket Categories & Pricing (Tiers)
                  </label>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                    onClick={() => setScheduleTiers(prev => [...prev, { name: 'Tier ' + (prev.length + 1), price: 60 }])}
                  >
                    + Add Tier
                  </button>
                </div>
                <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '10px' }}>
                  Attendees will choose from these tiers when picking their seats.
                </p>
                <div className="flex flex-col gap-2">
                  {scheduleTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input flex-1"
                        style={{ padding: '6px 10px', fontSize: '0.84rem' }}
                        placeholder="e.g. Standard General, VIP"
                        value={tier.name}
                        onChange={e => {
                          const next = [...scheduleTiers];
                          next[idx].name = e.target.value;
                          setScheduleTiers(next);
                        }}
                        required
                      />
                      <div style={{ display: 'flex', alignItems: 'center', width: '120px' }}>
                        <span style={{ marginRight: '6px', color: '#10b981', fontWeight: 800 }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input"
                          style={{ padding: '6px 10px', fontSize: '0.84rem' }}
                          placeholder="Price"
                          value={tier.price}
                          onChange={e => {
                            const next = [...scheduleTiers];
                            next[idx].price = Number(e.target.value);
                            setScheduleTiers(next);
                          }}
                          required
                        />
                      </div>
                      {scheduleTiers.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 8px', color: '#f87171', borderColor: '#ef4444' }}
                          onClick={() => setScheduleTiers(prev => prev.filter((_, i) => i !== idx))}
                          title="Remove Tier"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between gap-3" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-outline flex-1" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Publish Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Ticket Tier Modal (for existing schedule) */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Add Ticket Pricing Tier</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowCategoryModal(false)}>
                <X size={16} />
              </button>
            </div>

            {feedbackMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', color: '#fca5a5' }}>
                {feedbackMsg}
              </div>
            )}

            <form onSubmit={handleAddTicketCategory} className="flex flex-col gap-3">
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category / Tier Name:</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Early Bird, Balcony, VIP Lounge"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Price (USD $):</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px', color: '#10b981', fontWeight: 800, fontSize: '1.1rem' }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    required
                    value={ticketPrice}
                    onChange={e => setTicketPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-between gap-3" style={{ marginTop: '12px' }}>
                <button type="button" className="btn btn-outline flex-1" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Save Ticket Tier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
