import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { Check, X, Users, IndianRupee, Ticket, Calendar, Plus } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // New category state
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [catMsg, setCatMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, usersData, analyticsData, catsData] = await Promise.all([
        apiFetch('/admin/events'),
        apiFetch('/admin/users'),
        apiFetch('/admin/analytics'),
        apiFetch('/events/categories').catch(() => ({ categories: [] })),
      ]);
      setEvents(eventsData.events || []);
      setUsers(usersData.users || []);
      setAnalytics(analyticsData);
      setCategories(catsData.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewEvent = async (eventId: number, status: 'Approved' | 'Rejected') => {
    let reason: string | undefined = undefined;
    if (status === 'Rejected') {
      const input = prompt('Please enter the reason for rejection (optional):');
      if (input === null) return;
      reason = input;
    }

    try {
      await apiFetch(`/admin/events/${eventId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ approval_status: status, rejection_reason: reason }),
      });
      loadData();
      alert(`Event #${eventId} has been ${status.toLowerCase()}!`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await apiFetch(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ account_status: nextStatus }),
      });
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, account_status: nextStatus } : u));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCatMsg(null);
      await apiFetch('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ category_name: newCatName, description: newCatDesc }),
      });
      setCatMsg('Category created successfully!');
      setNewCatName('');
      setNewCatDesc('');
      loadData();
    } catch (err: any) {
      setCatMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="container" style={{ padding: '30px 20px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem' }}>System Administrator Dashboard</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Moderation queue, user management, and platform analytics</p>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-4 gap-4" style={{ marginBottom: '28px' }}>
          <div className="card" style={{ padding: '16px' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              <Users size={16} /> Total Users
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>
              {analytics.users?.total_users || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {analytics.users?.total_customers} Cust • {analytics.users?.total_organizers} Org
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              <IndianRupee size={16} /> Total Revenue
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: 'var(--success)' }}>
              ₹{parseFloat(analytics.bookings?.total_revenue || '0').toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {analytics.bookings?.confirmed_bookings} Confirmed Bookings
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              <Calendar size={16} /> Events Listed
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>
              {analytics.events?.total_events || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {analytics.events?.approved_events} Approved • {analytics.events?.pending_events} Pending
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              <Ticket size={16} /> Tickets Issued
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#f43f5e' }}>
              {analytics.tickets?.total_tickets || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {analytics.tickets?.valid_tickets} Valid Admissions
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Event Moderation Queue */}
      <div className="card" style={{ padding: '20px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Event Approval & Moderation Queue</h3>
        {loading ? (
          <p>Loading events...</p>
        ) : events.length === 0 ? (
          <p style={{ color: 'var(--text-dim)' }}>No events submitted yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(ev => (
              <div key={ev.event_id} className="card flex items-center justify-between flex-wrap gap-4" style={{ background: 'var(--bg-surface)', padding: '16px', borderColor: 'var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{ev.title}</span>
                    <span className={`badge ${ev.approval_status === 'Approved' ? 'badge-green' : ev.approval_status === 'Rejected' ? 'badge-red' : 'badge-yellow'}`}>
                      {ev.approval_status}
                    </span>
                    <span className="badge badge-indigo">{ev.category_name}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Organizer: <strong style={{ color: 'var(--text-main)' }}>{ev.organizer_name}</strong> ({ev.organizer_email})
                  </div>
                  {ev.reviewed_by_name && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Reviewed by: {ev.reviewed_by_name}
                    </div>
                  )}
                  {ev.rejection_reason && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px' }}>
                      Rejection Reason: {ev.rejection_reason}
                    </div>
                  )}
                </div>

                {ev.approval_status === 'Pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleReviewEvent(ev.event_id, 'Approved')}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleReviewEvent(ev.event_id, 'Rejected')}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: User Account Administration */}
      <div className="card" style={{ padding: '20px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>User Account Management</h3>
        <div className="flex flex-col gap-2">
          {users.map(u => (
            <div key={u.user_id} className="flex items-center justify-between" style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{u.name}</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginLeft: '8px' }}>({u.email})</span>
                <span className={`badge ${u.role === 'Admin' ? 'badge-red' : u.role === 'Organizer' ? 'badge-yellow' : 'badge-indigo'}`} style={{ marginLeft: '10px' }}>
                  {u.role}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={`badge ${u.account_status === 'Active' ? 'badge-green' : 'badge-red'}`}>
                  {u.account_status}
                </span>
                {u.role !== 'Admin' && (
                  <button
                    className={`btn btn-sm ${u.account_status === 'Active' ? 'btn-outline' : 'btn-primary'}`}
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={() => handleToggleUserStatus(u.user_id, u.account_status)}
                  >
                    {u.account_status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: Event Categories Catalog & Management */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Master Event Categories ({categories.length})</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
          Configured classifications and business descriptions for all events in EventFlow
        </p>

        {/* Existing Categories Table */}
        <div className="grid grid-cols-2 gap-3" style={{ marginBottom: '24px' }}>
          {categories.map(c => (
            <div key={c.category_id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{c.category_name}</span>
                <span className="badge badge-indigo" style={{ fontSize: '0.68rem' }}>ID #{c.category_id}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                {c.description || 'No description provided'}
              </p>
            </div>
          ))}
        </div>

        {/* Create Category Form */}
        <div style={{ maxWidth: '600px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '1rem', marginBottom: '10px' }}>Add New Category</h4>
          {catMsg && (
            <div style={{ background: catMsg.startsWith('Error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.82rem', color: catMsg.startsWith('Error') ? '#fca5a5' : '#86efac' }}>
              {catMsg}
            </div>
          )}
          <form onSubmit={handleCreateCategory} className="flex flex-col gap-3">
            <input
              type="text"
              className="input"
              required
              placeholder="Category Name (e.g. Esports & Gaming)"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
            />
            <input
              type="text"
              className="input"
              placeholder="Detailed description of what this category includes"
              value={newCatDesc}
              onChange={e => setNewCatDesc(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
              <Plus size={14} /> Add Category
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
