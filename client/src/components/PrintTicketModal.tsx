import React from 'react';
import { Ticket as TicketType } from '../types';
import { X, Printer, QrCode, Calendar, MapPin, CheckCircle } from 'lucide-react';

interface PrintTicketModalProps {
  ticket: TicketType;
  onClose: () => void;
}

export const PrintTicketModal: React.FC<PrintTicketModalProps> = ({ ticket, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', background: 'transparent', border: 'none', padding: 0 }}>
        {/* Printable Pass Container */}
        <div className="printable-ticket" style={{ boxShadow: 'var(--shadow-lg)' }}>
          {/* Header */}
          <div className="flex items-center justify-between" style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: '#6366f1' }}>
                EventFlow Admission Pass
              </span>
              <h2 style={{ fontSize: '1.25rem', marginTop: '2px' }}>{ticket.event_title}</h2>
            </div>
            <button className="btn btn-outline btn-sm no-print" onClick={onClose} style={{ color: '#0f172a', borderColor: '#cbd5e1' }}>
              <X size={16} />
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '20px', fontSize: '0.85rem' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>DATE & TIME</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                {new Date(ticket.start_datetime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ color: '#475569', fontSize: '0.8rem' }}>
                {new Date(ticket.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>VENUE & LOCATION</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{ticket.venue_name}</div>
              <div style={{ color: '#475569', fontSize: '0.8rem' }}>{ticket.venue_address}</div>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>SEAT & SECTION</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#6366f1' }}>
                {ticket.section_name} • Seat {ticket.seat_number}
              </div>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>TICKET CATEGORY & TIER</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{ticket.ticket_category}</div>
              <div style={{ color: '#10b981', fontWeight: 700 }}>
                ${parseFloat(ticket.ticket_price as string).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Barcode & Simulated QR Code */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', textAlign: 'center', marginBottom: '20px' }} className="flex items-center justify-between">
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>TICKET IDENTIFIER</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.04em', color: '#0f172a' }}>
                {ticket.ticket_code}
              </div>
              <div className="flex items-center gap-1" style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
                <CheckCircle size={13} /> Verified Authentic
              </div>
            </div>

            {/* Simulated QR Code Graphic */}
            <div style={{ background: '#ffffff', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
              <QrCode size={54} color="#0f172a" />
            </div>
          </div>

          {/* Attendee Info & Actions */}
          <div className="flex items-center justify-between no-print" style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '14px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Attendee: <strong style={{ color: '#0f172a' }}>{ticket.customer_name}</strong>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <Printer size={15} /> Print Ticket Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
