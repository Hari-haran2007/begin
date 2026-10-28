import { API_URL } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, FileCheck2, Award, Briefcase, FolderKanban, 
  ShieldAlert, Check, X, Loader2, Code, AlertTriangle, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationItem {
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

export default function StaffNotifications() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const fetchNotifications = async () => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/staff/notifications`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!response.ok) {
        throw new Error(`Failed to load notifications (${response.status})`);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.notifications || []);
      setNotifications(list);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Unable to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) return;

    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Optimistically update UI
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
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const markAsReadAndNavigate = async (notif: NotificationItem) => {
    const authToken = token || localStorage.getItem('token');

    if (!notif.read && authToken) {
      // Optimistically mark as read
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      try {
        fetch(`${API_URL}/staff/notifications/${notif.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${authToken}` }
        }).catch(err => console.warn('Read update error:', err));
      } catch (err) {}
    }

    if (notif.link) {
      navigate(notif.link);
    }
  };

  const removeNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const authToken = token || localStorage.getItem('token');

    // Optimistically remove from state
    setNotifications(prev => prev.filter(n => n.id !== id));

    if (authToken) {
      try {
        await fetch(`${API_URL}/staff/notifications/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch (err) {
        console.error('Error dismissing notification:', err);
      }
    }
  };

  const getIconInfo = (type: string, title: string) => {
    if (type === 'alert' || title.includes('Risk')) {
      return { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-400/10' };
    }
    if (type === 'academic' || title.includes('Semester')) {
      return { icon: FileCheck2, color: 'text-purple-400', bg: 'bg-purple-400/10' };
    }
    if (type === 'certificate' || title.includes('Certificate')) {
      return { icon: Award, color: 'text-blue-400', bg: 'bg-blue-400/10' };
    }
    if (type === 'internship' || title.includes('Internship')) {
      return { icon: Briefcase, color: 'text-cyan-400', bg: 'bg-cyan-400/10' };
    }
    if (type === 'project' || title.includes('Project')) {
      return { icon: FolderKanban, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
    }
    if (type === 'skill' || title.includes('Skill')) {
      return { icon: Code, color: 'text-indigo-400', bg: 'bg-indigo-400/10' };
    }
    return { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-400/10' };
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">Stay updated on real-time student activities and system alerts.</p>
        </div>

        {notifications.length > 0 && unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors border border-white/10 flex items-center gap-2 w-fit shadow-sm"
          >
            <Check className="w-4 h-4 text-blue-400" /> Mark all read
          </button>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-blue-400">
          <Loader2 className="w-10 h-10 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-400">Loading notifications...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-10 bg-white/5 rounded-2xl border border-white/10 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Unable to Load Notifications</h3>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchNotifications}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
          <AnimatePresence>
            {notifications.length > 0 ? (
              notifications.map((notif, index) => {
                const styling = getIconInfo(notif.type, notif.title);
                const IconComponent = styling.icon;

                return (
                  <motion.div
                    key={notif.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, padding: 0, overflow: 'hidden' }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    onClick={() => markAsReadAndNavigate(notif)}
                    className={`p-5 flex gap-4 items-start border-b border-white/5 last:border-0 transition-all hover:bg-white/10 cursor-pointer relative group ${
                      notif.read ? 'opacity-70 bg-transparent' : 'bg-blue-500/5'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center ${styling.bg} ${styling.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold truncate ${notif.read ? 'text-gray-300' : 'text-white'}`}>
                            {notif.title}
                          </h4>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-400 leading-relaxed">{notif.desc}</p>
                    </div>
                    
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button 
                        onClick={(e) => removeNotification(e, notif.id)}
                        title="Dismiss notification"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-gray-500">
                  <Bell className="w-8 h-8 opacity-40" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">No notifications yet</h3>
                <p className="text-xs text-gray-500 max-w-sm">
                  You're all caught up! When students upload marksheets, certificates, internships, or projects, alerts will appear here.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
