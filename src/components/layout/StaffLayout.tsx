import { API_URL } from '../../lib/api';
import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { StaffSidebar } from './StaffSidebar';
import { Bell, Sparkles, ShieldCheck, MessageSquare, Award, FileCheck2, Briefcase, FolderKanban, ShieldAlert, Code, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
        <p className="text-gray-400 animate-pulse">Loading Staff Portal...</p>
      </div>
    </div>
  );
}

interface StaffNotifItem {
  id: string;
  type: string;
  title: string;
  desc: string;
  time: string;
  rawTime?: string;
  read: boolean;
  link?: string;
  studentName?: string;
  studentId?: string;
}

export function StaffLayout() {
  const { token, loading, profile } = useAuth();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('staff_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('staff_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const [notifications, setNotifications] = useState<StaffNotifItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchStaffNotifications = async () => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) return;

    try {
      const res = await fetch(`${API_URL}/staff/notifications`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : (data.notifications || []));
      }
    } catch {
      // silently ignore polling errors
    }
  };

  useEffect(() => {
    if (token) {
      fetchStaffNotifications();
      const interval = setInterval(fetchStaffNotifications, 3000);
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

  const markNotificationRead = async (notif: StaffNotifItem) => {
    const authToken = token || localStorage.getItem('token');
    if (!notif.read && authToken) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      try {
        fetch(`${API_URL}/staff/notifications/${notif.id}/read`, {
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
      await fetch(`${API_URL}/staff/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ notificationIds: unreadIds })
      });
    } catch {}
  };

  const getNotifIcon = (type: string, title: string) => {
    if (type === 'message' || title.includes('message')) {
      return { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' };
    }
    if (type === 'alert' || title.includes('Risk')) {
      return { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' };
    }
    if (type === 'academic' || title.includes('Semester')) {
      return { icon: FileCheck2, color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' };
    }
    if (type === 'certificate' || title.includes('Certificate')) {
      return { icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' };
    }
    if (type === 'internship' || title.includes('Internship')) {
      return { icon: Briefcase, color: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/30' };
    }
    if (type === 'project' || title.includes('Project')) {
      return { icon: FolderKanban, color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' };
    }
    return { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-500/20 border-gray-500/30' };
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!token) {
    return <Navigate to="/staff/login" replace />;
  }

  if (profile && profile.role !== 'staff') {
    return <Navigate to="/dashboard" replace />;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 font-sans">
      <StaffSidebar collapsed={sidebarCollapsed} onToggleCollapse={handleToggleSidebar} />
      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {/* Top Navigation */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-gray-950/60 backdrop-blur-xl border-b border-white/5 text-white shadow-sm">
          <div className="flex items-center gap-2 pl-12 lg:pl-0">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5 shadow-inner shadow-blue-500/10">
              <ShieldCheck className="w-3.5 h-3.5" /> Staff Portal Authenticated
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(prev => !prev)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all relative group cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-lg shadow-blue-500/50 border border-gray-950">
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
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
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
                          <p className="text-[10px] text-gray-500 mt-0.5">Student messages and activity submissions will appear here.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const iconInfo = getNotifIcon(notif.type, notif.title);
                          const IconComp = iconInfo.icon;
                          return (
                            <div
                              key={notif.id}
                              onClick={() => markNotificationRead(notif)}
                              className={`p-3.5 flex items-start gap-3 hover:bg-white/5 transition-colors cursor-pointer relative ${
                                notif.read ? 'opacity-65' : 'bg-blue-500/5'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${iconInfo.bg} ${iconInfo.color}`}>
                                <IconComp className="w-4 h-4" />
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
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0 mt-1.5" />
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
                          navigate('/staff/notifications');
                        }}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 w-full py-1 cursor-pointer"
                      >
                        View All Notifications <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 border-l border-white/10 pl-4">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover border-2 border-blue-500/30"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-md shadow-blue-900/20">
                  {profile?.full_name?.charAt(0) || ''}
                </div>
              )}
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-semibold text-gray-200">{profile?.full_name?.split(' ')[0]}</span>
                <span className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">Staff Admin</span>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-73px)] relative">
          <div className="p-4 lg:p-8 relative z-10">
            <Suspense fallback={<LoadingScreen />}>
              <Outlet />
            </Suspense>
          </div>
          {/* Subtle background glow effect for content area */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
        </main>
      </div>
    </div>
  );
}
