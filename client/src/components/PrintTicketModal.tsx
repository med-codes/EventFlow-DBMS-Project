import React from 'react';
import { Ticket as TicketType } from '../types';
import { X, Printer, QrCode, CheckCircle } from 'lucide-react';

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
          <div className="flex items-center justify-between" style={{ borderBottom: '2px solid #e4e4e7', paddingBottom: '14px', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: '#71717a' }}>
                EventFlow Admission Pass
              </span>
              <h2 style={{ fontSize: '1.25rem', marginTop: '2px', color: '#09090b' }}>{ticket.event_title}</h2>
            </div>
            <button className="btn btn-outline btn-sm no-print" onClick={onClose} style={{ color: '#09090b', borderColor: '#d4d4d8' }}>
              <X size={16} />
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '20px', fontSize: '0.85rem' }}>
            <div>
              <div style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 600 }}>DATE & TIME</div>
              <div style={{ fontWeight: 700, color: '#09090b' }}>
                {new Date(ticket.start_datetime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ color: '#52525b', fontSize: '0.8rem' }}>
                {new Date(ticket.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div>
              <div style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 600 }}>VENUE & LOCATION</div>
              <div style={{ fontWeight: 700, color: '#09090b' }}>{ticket.venue_name}</div>
              <div style={{ color: '#52525b', fontSize: '0.8rem' }}>{ticket.venue_address}</div>
            </div>

            <div>
              <div style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 600 }}>SEAT & SECTION</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#09090b' }}>
                {ticket.section_name} • Seat {ticket.seat_number}
              </div>
            </div>

            <div>
              <div style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 600 }}>TICKET CATEGORY & TIER</div>
              <div style={{ fontWeight: 700, color: '#09090b' }}>{ticket.ticket_category}</div>
              <div style={{ color: '#16a34a', fontWeight: 700 }}>
                ₹{parseFloat(ticket.ticket_price as string).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Barcode & Simulated QR Code */}
          <div style={{ background: '#f4f4f5', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '14px', textAlign: 'center', marginBottom: '20px' }} className="flex items-center justify-between">
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 600 }}>TICKET IDENTIFIER</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.04em', color: '#09090b' }}>
                {ticket.ticket_code}
              </div>
              <div className="flex items-center gap-1" style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                <CheckCircle size={13} /> Verified Authentic
              </div>
            </div>

            {/* Simulated QR Code Graphic */}
            <div style={{ background: '#ffffff', padding: '6px', border: '1px solid #d4d4d8', borderRadius: '6px' }}>
              <QrCode size={54} color="#09090b" />
            </div>
          </div>

          {/* Attendee Info & Actions */}
          <div className="flex items-center justify-between no-print" style={{ borderTop: '2px dashed #d4d4d8', paddingTop: '14px' }}>
            <div style={{ fontSize: '0.78rem', color: '#71717a' }}>
              Attendee: <strong style={{ color: '#09090b' }}>{ticket.customer_name}</strong>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ background: '#09090b', color: '#ffffff' }}>
              <Printer size={15} /> Print Ticket Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
