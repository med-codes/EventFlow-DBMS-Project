import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Ticket, Bell, User as UserIcon, LogOut, ShieldCheck, Calendar, Briefcase } from 'lucide-react';
import { apiFetch } from '../services/api';
import { NotificationItem } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, openAuthModal }) => {
  const { user, logout, switchDemoRole } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Poll or fetch notifications when user is logged in
  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const data = await apiFetch('/notifications');
        setNotifications(data.notifications || []);
      } catch (e) {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    try {
      await apiFetch('/notifications/mark-all-read', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  return (
    <nav style={{ background: '#1e293b', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container flex items-center justify-between" style={{ height: '70px' }}>
        {/* Logo */}
        <div 
          className="flex items-center gap-2" 
          style={{ cursor: 'pointer' }}
          onClick={() => setCurrentTab('discover')}
        >
          <div style={{ background: '#6366f1', color: '#fff', padding: '8px', borderRadius: '8px' }}>
            <Ticket size={24} />
          </div>
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Event<span style={{ color: '#818cf8' }}>Flow</span>
            </span>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1 }}>College DBMS Project</div>
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
          <div className="flex items-center gap-1" style={{ background: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '0 6px', fontWeight: 600 }}>DEMO:</span>
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

          {/* Notifications Dropdown */}
          {user && (
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-outline btn-sm"
                style={{ padding: '8px', position: 'relative' }}
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span style={{ 
                    position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', 
                    color: '#fff', fontSize: '0.65rem', borderRadius: '999px', padding: '2px 5px', fontWeight: 800 
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div style={{ 
                  position: 'absolute', right: 0, top: '42px', width: '320px', 
                  background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', 
                  boxShadow: 'var(--shadow-lg)', zIndex: 200, padding: '14px' 
                }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button className="btn btn-sm btn-outline" style={{ fontSize: '0.7rem' }} onClick={markAllRead}>
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', padding: '10px 0', textAlign: 'center' }}>No notifications yet</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.notification_id} style={{ 
                          padding: '8px', borderBottom: '1px solid #334155', 
                          background: n.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.1)',
                          borderRadius: '6px', marginBottom: '4px' 
                        }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff' }}>{n.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User badge or Auth button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2" style={{ background: '#0f172a', padding: '6px 12px', borderRadius: '8px' }}>
                <UserIcon size={14} color="#818cf8" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
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
