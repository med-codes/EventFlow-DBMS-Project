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
import { Filter } from 'lucide-react';

export const App: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('discover');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openAuthModal={() => setShowAuthModal(true)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {currentTab === 'discover' && (
          <div className="container" style={{ padding: '32px 20px 60px' }}>
            {/* Header & Category Filter Bar */}
            <div style={{ marginBottom: '28px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
              <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                    Available Events
                  </h1>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Browse upcoming live events, select your preferred seating, and book tickets instantly.
                  </p>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1" style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600, marginRight: '4px' }}>
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
            </div>

            {/* Event Cards Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p>Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No events found</h3>
                <p style={{ fontSize: '0.85rem' }}>Try selecting another category or check back later.</p>
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
        )}

        {currentTab === 'customer' && <CustomerDashboard />}
        {currentTab === 'organizer' && <OrganizerDashboard />}
        {currentTab === 'admin' && <AdminDashboard />}
      </main>

      {/* Footer */}
      <footer style={{ background: '#09090b', borderTop: '1px solid #27272a', padding: '24px 20px', textAlign: 'center', fontSize: '0.82rem', color: '#71717a' }}>
        <div className="container flex items-center justify-between flex-wrap gap-2">
          <div>
            <strong style={{ color: '#f4f4f5' }}>EventFlow</strong> — Live Event Ticketing & Reservation Platform
          </div>
          <div>
            © 2026 EventFlow. All rights reserved.
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
