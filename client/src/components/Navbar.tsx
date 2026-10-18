import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Ticket, User as UserIcon, LogOut, ShieldCheck, Calendar, Briefcase } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, openAuthModal }) => {
  const { user, logout, switchDemoRole } = useAuth();

  return (
    <nav style={{ background: '#09090b', borderBottom: '1px solid #27272a', position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container flex items-center justify-between" style={{ height: '70px' }}>
        {/* Logo */}
        <div 
          className="flex items-center gap-2" 
          style={{ cursor: 'pointer' }}
          onClick={() => setCurrentTab('discover')}
        >
          <div style={{ background: '#ffffff', color: '#09090b', padding: '7px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <Ticket size={20} />
          </div>
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              EventFlow
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button 
            className={`btn btn-sm ${currentTab === 'discover' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setCurrentTab('discover')}
          >
            <Calendar size={15} /> Discover
          </button>

          {user?.role === 'Customer' && (
            <button 
              className={`btn btn-sm ${currentTab === 'customer' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setCurrentTab('customer')}
            >
              <Ticket size={15} /> My Bookings & Tickets
            </button>
          )}

          {user?.role === 'Organizer' && (
            <button 
              className={`btn btn-sm ${currentTab === 'organizer' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setCurrentTab('organizer')}
            >
              <Briefcase size={15} /> Organizer Portal
            </button>
          )}

          {user?.role === 'Admin' && (
            <button 
              className={`btn btn-sm ${currentTab === 'admin' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setCurrentTab('admin')}
            >
              <ShieldCheck size={15} /> Admin Dashboard
            </button>
          )}
        </div>

        {/* Demo Role Switcher & Auth */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Switcher */}
          <div className="flex items-center gap-1" style={{ background: '#121215', padding: '4px', borderRadius: '8px', border: '1px solid #27272a' }}>
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa', padding: '0 6px', fontWeight: 600 }}>DEMO:</span>
            <button 
              className={`btn btn-sm ${user?.role === 'Customer' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              onClick={async () => { await switchDemoRole('Customer'); setCurrentTab('discover'); }}
            >
              Customer
            </button>
            <button 
              className={`btn btn-sm ${user?.role === 'Organizer' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              onClick={async () => { await switchDemoRole('Organizer'); setCurrentTab('organizer'); }}
            >
              Organizer
            </button>
            <button 
              className={`btn btn-sm ${user?.role === 'Admin' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              onClick={async () => { await switchDemoRole('Admin'); setCurrentTab('admin'); }}
            >
              Admin
            </button>
          </div>

          {/* User badge or Auth button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2" style={{ background: '#121215', padding: '6px 12px', borderRadius: '8px', border: '1px solid #27272a' }}>
                <UserIcon size={14} color="#a1a1aa" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f4f4f5' }}>{user.name.split(' ')[0]}</span>
                <span className={`badge ${user.role === 'Admin' ? 'badge-red' : user.role === 'Organizer' ? 'badge-yellow' : 'badge-indigo'}`} style={{ fontSize: '0.65rem' }}>
                  {user.role}
                </span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={logout} title="Sign Out">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={openAuthModal}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
