import { API_URL } from '../../lib/api';
import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Bell, Sparkles, MessageSquare, Calendar, Check, Loader2, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
        <p className="text-gray-400 animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

interface StudentNotifItem {
  id: string;
  type: string;
  title: string;
  desc: string;
  time: string;
  rawTime?: string;
  read: boolean;
  link?: string;
  partnerId?: string;
  meetingId?: string;
  senderName?: string;
}

export function Layout() {
  const { token, loading, profile } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('student_sidebar_collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('student_sidebar_collapsed', String(next));
      return next;
    });
  };

  const [notifications, setNotifications] = useState<StudentNotifItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchStudentNotifications = async () => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) return;

    try {
      const res = await fetch(`${API_URL}/student/notifications`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently ignore polling errors
    }
  };

  useEffect(() => {
    if (token) {
      fetchStudentNotifications();
      const interval = setInterval(fetchStudentNotifications, 3000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const markNotificationRead = async (notif: StudentNotifItem) => {
    const authToken = token || localStorage.getItem('token');
    if (!notif.read && authToken) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      try {
        fetch(`${API_URL}/student/notifications/${notif.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${authToken}` }
        }).catch(() => {});
      } catch {}
    }

    setDropdownOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const markAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const authToken = token || localStorage.getItem('token');
    if (!authToken) return;

    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      await fetch(`${API_URL}/student/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ notificationIds: unreadIds })
      });
    } catch {}
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!token) {
    return <Navigate to="/student/login" replace />;
  }

  if (profile && profile.role === 'staff') {
    return <Navigate to="/staff/dashboard" replace />;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Sidebar />
      <div className="lg:ml-[260px] transition-all duration-300">
        {/* Top Navigation */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-gray-950/40 backdrop-blur-xl border-b border-white/5 text-white">
          <div className="flex items-center gap-2 pl-12 lg:pl-0">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" /> Student Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(prev => !prev)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-lg shadow-purple-500/50 border border-gray-950">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-gray-900/95 backdrop-blur-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">Notifications</h4>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" /> Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-[380px] overflow-y-auto divide-y divide-white/5">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center text-gray-500 px-4">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs font-medium text-gray-400">No notifications yet</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Faculty messages and meeting requests will appear here.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const isMessage = notif.type === 'message';
                          return (
                            <div
                              key={notif.id}
                              onClick={() => markNotificationRead(notif)}
                              className={`p-3.5 flex items-start gap-3 hover:bg-white/5 transition-colors cursor-pointer relative ${
                                notif.read ? 'opacity-65' : 'bg-purple-500/5'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isMessage 
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}>
                                {isMessage ? <MessageSquare className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <p className={`text-xs font-bold truncate ${notif.read ? 'text-gray-300' : 'text-white'}`}>
                                    {notif.title}
                                  </p>
                                  <span className="text-[10px] text-gray-500 whitespace-nowrap flex-shrink-0">
                                    {notif.time}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                                  {notif.desc}
                                </p>
                              </div>

                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="p-2.5 bg-black/40 border-t border-white/10 text-center">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/messages');
                        }}
                        className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center justify-center gap-1 w-full py-1 cursor-pointer"
                      >
                        Open Faculty Connect <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border border-purple-500/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold">
                  {profile?.full_name?.charAt(0) || ''}
                </div>
              )}
              <span className="hidden sm:inline text-sm font-medium text-gray-300">{profile?.full_name?.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-69px)]">
          <div className="p-4 lg:p-8">
            <Suspense fallback={<LoadingScreen />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

