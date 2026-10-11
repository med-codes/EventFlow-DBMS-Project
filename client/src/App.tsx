import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { EventCard } from './components/EventCard';
import { EventDetailsModal } from './components/EventDetailsModal';
import { SeatingModal } from './components/SeatingModal';
import { PrintTicketModal } from './components/PrintTicketModal';
import { CustomerDashboard } from './components/CustomerDashboard';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { EventItem, EventCategory, EventSchedule, Ticket } from './types';
import { apiFetch } from './services/api';
import { useAuth } from './context/AuthContext';
import { Search, Database, Sparkles, Filter } from 'lucide-react';

export const App: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('discover');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [bookingSchedule, setBookingSchedule] = useState<EventSchedule | null>(null);
  const [successTicket, setSuccessTicket] = useState<Ticket | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Fetch events and categories
  const loadEvents = async () => {
    try {
      setLoading(true);
      let queryUrl = '/events?';
      if (searchQuery.trim()) queryUrl += `search=${encodeURIComponent(searchQuery.trim())}&`;
      if (selectedCategory) queryUrl += `category_id=${selectedCategory}&`;

      const [eventsData, catsData] = await Promise.all([
        apiFetch(queryUrl),
        apiFetch('/events/categories'),
      ]);
      setEvents(eventsData.events || []);
      setCategories(catsData.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadEvents();
  };

  // Called when booking and payment are completed
  const handleBookingSuccess = async (bookingId: number) => {
    try {
      const data = await apiFetch(`/bookings/${bookingId}`);
      if (data.seats?.[0]?.ticket_code) {
        // Find ticket info
        const ticketRes = await apiFetch('/tickets/my-tickets');
        const match = ticketRes.tickets?.find((t: Ticket) => t.booking_id === bookingId);
        if (match) {
          setSuccessTicket(match);
          return;
        }
      }
    } catch (e) {}
    setCurrentTab('customer');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openAuthModal={() => setShowAuthModal(true)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {currentTab === 'discover' && (
          <div>
            {/* Hero Banner */}
            <div style={{ 
              background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', 
              borderBottom: '1px solid #334155',
              padding: '48px 20px 40px'
            }}>
              <div className="container" style={{ textAlign: 'center', maxWidth: '800px' }}>
                <div className="flex items-center justify-center gap-2" style={{ marginBottom: '12px' }}>
                  <span className="badge badge-indigo">
                    <Database size={13} style={{ marginRight: '4px' }} /> PostgreSQL 18 Relational DBMS
                  </span>
                </div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '14px', letterSpacing: '-0.02em' }}>
                  Discover, Reserve & Experience Live Events
                </h1>
                <p style={{ fontSize: '1.05rem', color: '#94a3b8', marginBottom: '28px', lineHeight: 1.6 }}>
                  Built with concurrency-safe seat locking, relational integrity constraints, and multi-tier ticketing.
                </p>

                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="flex gap-2" style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '13px' }} />
                    <input
                      type="text"
                      className="input"
                      style={{ paddingLeft: '42px', height: '46px' }}
                      placeholder="Search events by title or keyword..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ height: '46px', padding: '0 24px' }}>
                    Search
                  </button>
                </form>
              </div>
            </div>

            {/* Events Discovery Section */}
            <div className="container" style={{ padding: '36px 20px 60px' }}>
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '28px' }}>
                <span className="flex items-center gap-1" style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginRight: '4px' }}>
                  <Filter size={14} /> Categories:
                </span>
                <button
                  className={`btn btn-sm ${selectedCategory === null ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSelectedCategory(null)}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.category_id}
                    className={`btn btn-sm ${selectedCategory === cat.category_id ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedCategory(cat.category_id)}
                  >
                    {cat.category_name}
                  </button>
                ))}
              </div>

              {/* Event Cards Grid */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <p>Loading database events...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No events found</h3>
                  <p style={{ fontSize: '0.85rem' }}>Try clearing your search query or selecting another category.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-6">
                  {events.map(ev => (
                    <EventCard
                      key={ev.event_id}
                      event={ev}
                      onSelect={evItem => setSelectedEvent(evItem)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'customer' && <CustomerDashboard />}
        {currentTab === 'organizer' && <OrganizerDashboard />}
        {currentTab === 'admin' && <AdminDashboard />}
      </main>

      {/* Footer */}
      <footer style={{ background: '#0b1120', borderTop: '1px solid #1e293b', padding: '24px 20px', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
        <div className="container flex items-center justify-between flex-wrap gap-2">
          <div>
            <strong>EventFlow</strong> — College DBMS Project (PostgreSQL 18, Node.js Express, React TypeScript)
          </div>
          <div>
            16 Normalized Core Relations • Row-Level Concurrency Control • Parameterized SQL
          </div>
        </div>
      </footer>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSelectSchedule={sch => setBookingSchedule(sch)}
        />
      )}

      {/* Seating Layout & Booking Modal */}
      {bookingSchedule && (
        <SeatingModal
          schedule={bookingSchedule}
          onClose={() => setBookingSchedule(null)}
          onBookingSuccess={handleBookingSuccess}
          openAuthModal={() => setShowAuthModal(true)}
        />
      )}

      {/* Printable Ticket Pass Modal */}
      {successTicket && (
        <PrintTicketModal
          ticket={successTicket}
          onClose={() => { setSuccessTicket(null); setCurrentTab('customer'); }}
        />
      )}

      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};
