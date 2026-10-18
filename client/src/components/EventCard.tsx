import React from 'react';
import { EventItem } from '../types';
import { Star, ArrowRight } from 'lucide-react';

interface EventCardProps {
  event: EventItem;
  onSelect: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect }) => {
  const ratingNum = typeof event.average_rating === 'number' 
    ? event.average_rating 
    : parseFloat(event.average_rating || '0');

  return (
    <div className="card flex flex-col justify-between" style={{ height: '100%', background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div>
        {/* Category Pill and Rating */}
        <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
          <span className="badge badge-indigo">{event.category_name}</span>
          <div className="flex items-center gap-1" style={{ fontSize: '0.82rem', color: '#fbbf24', fontWeight: 600 }}>
            <Star size={13} fill="#fbbf24" />
            <span>{ratingNum > 0 ? ratingNum.toFixed(1) : 'New'}</span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>({event.total_reviews})</span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', color: '#ffffff' }}>{event.title}</h3>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {event.description || 'Join this live event.'}
        </p>

        {/* Organizer */}
        <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          <span style={{ color: 'var(--text-dim)' }}>By</span>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{event.organizer_name}</span>
        </div>
      </div>

      {/* Footer with Price and Button */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: 'auto' }} className="flex items-center justify-between">
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Tickets from</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>
            {event.min_price ? `₹${parseFloat(event.min_price as string).toFixed(2)}` : '₹450.00'}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => onSelect(event)}>
          View & Book <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
