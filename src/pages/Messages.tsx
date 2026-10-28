import { API_URL } from '../lib/api';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { 
  MessageSquare, Calendar, Send, Loader2, User, Clock, 
  CheckCircle, XCircle, AlertCircle, RefreshCw, CheckCheck,
  GraduationCap, Mail, Sparkles, ChevronRight, Check,
  Pencil, Trash2, X, Users, Search, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ChatMessage } from '../types';
import { formatDisplayName } from '../utils/formatters';

interface ConversationItem {
  id: string;
  _id: string;
  conversationId: string;
  partner: {
    id?: string;
    _id?: string;
    full_name: string;
    name?: string;
    email?: string;
    department?: string;
    avatar_url?: string;
    role?: string;
    staff_id?: string;
  };
  staff?: {
    id?: string;
    _id?: string;
    full_name?: string;
    name?: string;
    email?: string;
    department?: string;
    avatar_url?: string;
    role?: string;
    staff_id?: string;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface MeetingItem {
  id: string;
  _id: string;
  staffName: string;
  staffEmail: string;
  staffDepartment: string;
  title: string;
  purpose: string;
  date: string;
  time: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  created_at: string;
}

export function Messages() {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'messages' | 'meetings'>('messages');

  // Messages State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<{
    partner: any;
    messages: ChatMessage[];
  } | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Meetings State
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [updatingMeetingId, setUpdatingMeetingId] = useState<string | null>(null);
  const [meetingError, setMeetingError] = useState('');

  // Deep linking via query parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'meetings') {
      setActiveTab('meetings');
    } else if (tabParam === 'messages') {
      setActiveTab('messages');
    }

    const partnerParam = searchParams.get('partnerId') || searchParams.get('staffId');
    if (partnerParam) {
      selectConversation(partnerParam);
    }
  }, [searchParams]);

  // Initial Data Fetch & Background Polling for both Conversations and Meetings
  useEffect(() => {
    fetchConversations(false);
    fetchMeetings(true);

    const interval = setInterval(() => {
      fetchMeetings(false);
      fetchConversations(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [token]);

  // Scroll to bottom on message updates
  useEffect(() => {
    if (activeConversation?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages]);

  // Focus input when selecting conversation
  useEffect(() => {
    if (selectedPartnerId && !loadingMessages) {
      inputRef.current?.focus();
    }
  }, [selectedPartnerId, loadingMessages]);

  // Polling for active conversation
  useEffect(() => {
    if (!selectedPartnerId) return;

    const interval = setInterval(async () => {
      try {
        const authToken = token || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/messages/${selectedPartnerId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages)) {
            setActiveConversation(prev => {
              if (!prev) return data;
              if (JSON.stringify(prev.messages) !== JSON.stringify(data.messages)) {
                return { ...prev, messages: data.messages };
              }
              return prev;
            });
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedPartnerId, token]);

  const fetchConversations = async (silent = false) => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      if (!silent) setLoadingConversations(false);
      return;
    }
    if (!silent) {
      setLoadingConversations(true);
      setConversationsError('');
    }
    try {
      const res = await fetch(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list: ConversationItem[] = Array.isArray(data) ? data : [];
        setConversations(list);
        
        const partnerParam = searchParams.get('partnerId') || searchParams.get('staffId');
        if (partnerParam && !selectedPartnerId) {
          selectConversation(partnerParam);
        } else if (list.length > 0 && !selectedPartnerId) {
          const firstPartnerId = list[0].partner?.id || list[0].partner?._id || list[0].staff?._id || list[0].staff?.id;
          if (firstPartnerId) {
            selectConversation(firstPartnerId);
          }
        }
      } else {
        if (!silent) throw new Error('Failed to load faculty conversations');
      }
    } catch (err: any) {
      if (!silent) {
        console.error('Error fetching conversations:', err);
        setConversationsError(err.message || 'Unable to load faculty conversations.');
      }
    } finally {
      if (!silent) {
        setLoadingConversations(false);
      }
    }
  };

  const selectConversation = async (partnerId: string) => {
    if (!partnerId) return;
    setSelectedPartnerId(partnerId);
    setLoadingMessages(true);
    setChatError('');
    try {
      const authToken = token || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/messages/${partnerId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConversation(data);
        // update unread in conversation list
        setConversations(prev => prev.map(c => {
          const cId = c.partner?.id || c.partner?._id || c.staff?._id || c.staff?.id;
          if (cId === partnerId) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        }));
      } else {
        throw new Error('Failed to load conversation');
      }
    } catch (err: any) {
      console.error('Error loading conversation:', err);
      setChatError(err.message || 'Unable to load conversation.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !selectedPartnerId || sending) return;

    const outgoing = messageText.trim();
    const authToken = token || localStorage.getItem('token');

    // Optimistic UI update
    const tempId = 'temp-' + Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      _id: tempId,
      senderId: user?.id || 'self',
      senderRole: 'student',
      senderName: 'You',
      receiverId: selectedPartnerId,
      receiverRole: 'staff',
      studentId: user?.id || '',
      message: outgoing,
      created_at: new Date().toISOString(),
      isSelf: true
    };

    setActiveConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, { ...optimisticMsg, isSelf: true }]
    } : null);

    setMessageText('');
    setSending(true);
    setChatError('');

    try {
      const res = await fetch(`${API_URL}/messages/${selectedPartnerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ message: outgoing })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send reply');
      }

      const data = await res.json();
      if (data.message) {
        setActiveConversation(prev => prev ? {
          ...prev,
          messages: prev.messages.map(m => m.id === tempId ? { ...data.message, isSelf: true } : m)
        } : null);
      }
      fetchConversations();
    } catch (err: any) {
      console.error('Error sending message:', err);
      setChatError(err.message || 'Failed to send message.');
      // Revert optimistic and keep text
      setActiveConversation(prev => prev ? {
        ...prev,
        messages: prev.messages.filter(m => m.id !== tempId)
      } : null);
      setMessageText(outgoing);
    } finally {
      setSending(false);
    }
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setConfirmDeleteId(null);
    setEditingMessageId(msg.id || msg._id || '');
    setEditMessageText(msg.message);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditMessageText('');
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editMessageText.trim() || savingEdit) return;
    const newText = editMessageText.trim();
    const authToken = token || localStorage.getItem('token');
    setSavingEdit(true);
    setChatError('');

    // Optimistic update
    setActiveConversation(prev => prev ? {
      ...prev,
      messages: prev.messages.map(m => (m.id === messageId || m._id === messageId) ? {
        ...m,
        message: newText,
        is_edited: true,
        edited: true
      } : m)
    } : null);

    try {
      const res = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ message: newText })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to edit message');
      }

      const data = await res.json();
      if (data.message) {
        setActiveConversation(prev => prev ? {
          ...prev,
          messages: prev.messages.map(m => (m.id === messageId || m._id === messageId) ? {
            ...m,
            ...data.message,
            isSelf: true
          } : m)
        } : null);
      }
      setEditingMessageId(null);
      setEditMessageText('');
      fetchConversations();
    } catch (err: any) {
      console.error('Error updating message:', err);
      setChatError(err.message || 'Failed to update message.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleStartDelete = (messageId: string) => {
    setEditingMessageId(null);
    setConfirmDeleteId(messageId);
  };

  const handleCancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const handleConfirmDelete = async (messageId: string) => {
    if (deletingMessage) return;
    const authToken = token || localStorage.getItem('token');
    setDeletingMessage(true);
    setChatError('');

    const backupMessages = activeConversation?.messages || [];

    // Optimistic removal
    setActiveConversation(prev => prev ? {
      ...prev,
      messages: prev.messages.filter(m => (m.id !== messageId && m._id !== messageId))
    } : null);

    try {
      const res = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete message');
      }

      setConfirmDeleteId(null);
      fetchConversations();
    } catch (err: any) {
      console.error('Error deleting message:', err);
      setChatError(err.message || 'Failed to delete message.');
      // Restore backup
      setActiveConversation(prev => prev ? {
        ...prev,
        messages: backupMessages
      } : null);
    } finally {
      setDeletingMessage(false);
    }
  };

  const fetchMeetings = async (showLoading = false) => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      setLoadingMeetings(false);
      return;
    }
    if (showLoading) setLoadingMeetings(true);
    try {
      const res = await fetch(`${API_URL}/meetings/student`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data || []);
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      if (showLoading) setLoadingMeetings(false);
    }
  };

  const handleUpdateMeetingStatus = async (meetingId: string, status: 'accepted' | 'declined') => {
    setUpdatingMeetingId(meetingId);
    setMeetingError('');
    try {
      const authToken = token || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/meetings/${meetingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update meeting status');
      }

      setMeetings(prev => prev.map(m => m.id === meetingId || m._id === meetingId ? { ...m, status } : m));
    } catch (err: any) {
      setMeetingError(err.message || 'Error updating meeting status');
    } finally {
      setUpdatingMeetingId(null);
    }
  };

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const pendingMeetingsCount = meetings.filter(m => m.status === 'pending').length;
  const totalUnreadMessages = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (c.partner?.full_name || c.partner?.name || c.staff?.full_name || c.staff?.name || '').toLowerCase();
    const dept = (c.partner?.department || c.staff?.department || '').toLowerCase();
    return name.includes(q) || dept.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Faculty Connect</h1>
          <p className="text-gray-400">Direct two-way messaging & 1-on-1 meeting scheduling with your faculty mentors.</p>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="flex p-1.5 rounded-2xl bg-white/5 border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Messages</span>
            {totalUnreadMessages > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {totalUnreadMessages}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('meetings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'meetings'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Meeting Requests</span>
            {pendingMeetingsCount > 0 && (
              <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {pendingMeetingsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Messages */}
      {activeTab === 'messages' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row h-[700px] shadow-2xl">
          {/* Left Column: Conversations List */}
          <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-gray-950/60 h-full min-h-0 ${
            selectedPartnerId ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Left Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-gray-950/40">
              <div>
                <h3 className="font-semibold text-white text-sm">Faculty Mentors</h3>
                <p className="text-[11px] text-gray-400">Direct messaging with advisors</p>
              </div>
              <button
                onClick={() => fetchConversations(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Refresh faculty conversations"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-2.5 border-b border-white/10 flex-shrink-0 bg-black/20">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search mentors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Faculty List Items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
              {loadingConversations ? (
                <div className="flex flex-col justify-center items-center py-20 text-gray-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  <p className="text-xs text-gray-400">Loading faculty mentors...</p>
                </div>
              ) : conversationsError ? (
                <div className="text-center py-16 px-4">
                  <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-medium text-white mb-1">Failed to load faculty</p>
                  <p className="text-xs text-gray-400 mb-3">{conversationsError}</p>
                  <button
                    onClick={() => fetchConversations(false)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-md"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Users className="w-10 h-10 text-gray-600 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-white mb-1">
                    {searchQuery ? 'No mentors match search' : 'No faculty mentors found'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {searchQuery
                      ? 'Try searching with a different term.'
                      : 'Faculty mentors assigned to your department will appear here.'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const pId = conv.partner?.id || conv.partner?._id || conv.staff?._id || conv.staff?.id;
                  const isSelected = selectedPartnerId === pId;
                  const partnerName = formatDisplayName(
                    conv.partner?.full_name || conv.partner?.name || conv.staff?.full_name || conv.staff?.name,
                    'Faculty Member'
                  );
                  const partnerDept = conv.partner?.department || conv.staff?.department || 'Academic Faculty';
                  const avatarUrl = conv.partner?.avatar_url || conv.staff?.avatar_url;
                  const initial = partnerName.charAt(0) || 'F';
                  const hasMessages = Boolean(conv.lastMessage);

                  return (
                    <button
                      key={conv.id || conv._id || pId}
                      onClick={() => pId && selectConversation(pId)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600/25 border border-purple-500/50 text-white shadow-md'
                          : 'hover:bg-white/5 text-gray-300 border border-transparent'
                      }`}
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={partnerName}
                          className="w-10 h-10 rounded-xl object-cover border border-white/10 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-sm">
                          {initial}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="font-semibold text-sm truncate text-white">
                            {partnerName}
                          </h4>
                          {conv.lastMessageAt && (
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              {formatTime(conv.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-purple-400 font-medium truncate mb-1">
                          {partnerDept}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-gray-400 truncate font-normal opacity-90 flex-1">
                            {hasMessages ? conv.lastMessage : 'Start a conversation'}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold whitespace-nowrap flex-shrink-0">
                              {conv.unreadCount} unread
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Window */}
          <div className={`flex-1 flex flex-col bg-gray-900/40 h-full min-h-0 overflow-hidden ${
            !selectedPartnerId ? 'hidden md:flex' : 'flex'
          }`}>
            {selectedPartnerId && activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 bg-black/30 flex items-center justify-between gap-4 flex-shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setSelectedPartnerId(null)}
                      className="md:hidden p-1.5 -ml-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors cursor-pointer"
                      title="Back to faculty list"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    {activeConversation.partner?.avatar_url ? (
                      <img
                        src={activeConversation.partner.avatar_url}
                        alt={formatDisplayName(activeConversation.partner.full_name, 'Faculty Mentor')}
                        className="w-10 h-10 rounded-xl object-cover border border-purple-500/30 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-sm">
                        {formatDisplayName(activeConversation.partner?.full_name, 'F').charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-base truncate">
                        {formatDisplayName(activeConversation.partner?.full_name, 'Faculty Mentor')}
                      </h3>
                      <p className="text-xs text-gray-400 truncate">
                        {activeConversation.partner?.department || 'Faculty'} {activeConversation.partner?.email ? `• ${activeConversation.partner.email}` : ''}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Connected
                  </span>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-gray-950/40 to-gray-900/40">
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    </div>
                  ) : activeConversation.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <MessageSquare className="w-12 h-12 text-gray-600 mb-2 opacity-40" />
                      <p className="text-white font-medium text-sm">No messages in this conversation</p>
                      <p className="text-xs text-gray-400 mt-1">Send a message to start communicating with your mentor.</p>
                    </div>
                  ) : (
                    activeConversation.messages.map((msg, i) => {
                      const msgId = msg.id || msg._id || `msg-${i}`;
                      const isMe = msg.isSelf ?? (String(msg.senderId) === String(user?.id) || msg.senderRole === 'student');
                      const isEditing = editingMessageId === msgId;
                      const isConfirmingDelete = confirmDeleteId === msgId;
                      const isEdited = msg.is_edited || msg.edited;

                      const senderLabel = isMe
                        ? 'You'
                        : formatDisplayName(
                            msg.senderName ||
                              msg.sender?.full_name ||
                              msg.sender?.name ||
                              activeConversation.partner?.full_name ||
                              activeConversation.partner?.name,
                            'Faculty Mentor'
                          );

                      return (
                        <div
                          key={msgId}
                          className={`flex flex-col group/msg relative ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <span
                            className={`text-[10px] mb-1 font-medium select-none ${
                              isMe ? 'text-purple-300 mr-1' : 'text-gray-400 ml-1'
                            }`}
                          >
                            {senderLabel}
                          </span>

                          {/* Delete Confirmation Box */}
                          {isConfirmingDelete ? (
                            <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-red-950/90 border border-red-500/40 text-white shadow-xl space-y-2 mb-1">
                              <p className="text-xs font-semibold text-red-200">Delete this message?</p>
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={handleCancelDelete}
                                  disabled={deletingMessage}
                                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-medium transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmDelete(msgId)}
                                  disabled={deletingMessage}
                                  className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                                >
                                  {deletingMessage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : isEditing ? (
                            /* Inline Edit Mode */
                            <div className="w-full max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 bg-purple-950/90 border border-purple-500/40 text-white shadow-xl space-y-2 mb-1">
                              <div className="flex items-center justify-between text-[11px] text-purple-300 font-semibold">
                                <span className="flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit Message</span>
                                <button type="button" onClick={handleCancelEdit} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                              </div>
                              <textarea
                                value={editMessageText}
                                onChange={(e) => setEditMessageText(e.target.value)}
                                rows={2}
                                className="w-full bg-black/40 border border-white/15 focus:border-purple-400 rounded-xl p-2 text-sm text-white focus:outline-none resize-none"
                                placeholder="Edit your message..."
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit(msgId);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                              />
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  disabled={savingEdit}
                                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-medium transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(msgId)}
                                  disabled={!editMessageText.trim() || savingEdit}
                                  className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-md disabled:opacity-50 cursor-pointer"
                                >
                                  {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Normal Message Bubble */
                            <div className="relative group/bubble flex items-center gap-1.5 max-w-[85%] sm:max-w-[75%]">
                              {/* Hover Action controls for own message */}
                              {isMe && (
                                <div className="opacity-0 group-hover/bubble:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-0.5 bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10 shadow-md">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(msg)}
                                    className="p-1 rounded hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
                                    title="Edit message"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStartDelete(msgId)}
                                    className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                                    title="Delete message"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                              <div
                                className={`w-full rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                                  isMe
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-tr-xs'
                                    : 'bg-white/10 text-gray-100 border border-white/10 rounded-tl-xs'
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                                <div
                                  className={`flex items-center gap-1.5 text-[10px] mt-1.5 ${
                                    isMe ? 'text-purple-200 justify-end' : 'text-gray-400 justify-start'
                                  }`}
                                >
                                  <span>{formatTime(msg.created_at)}</span>
                                  {isEdited && (
                                    <span className="text-[10px] text-purple-200/90 italic font-medium">
                                      • Edited
                                    </span>
                                  )}
                                  {isMe && <CheckCheck className="w-3 h-3 text-purple-200" />}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendMessage} className="p-4 bg-black/50 border-t border-white/10">
                  {chatError && (
                    <div className="text-xs text-red-400 mb-2 flex items-center justify-between">
                      <span>{chatError}</span>
                      <button type="button" onClick={() => setChatError('')} className="text-gray-400 hover:text-white">✕</button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={`Reply to ${formatDisplayName(activeConversation.partner?.full_name, 'mentor')}...`}
                      disabled={sending}
                      className="flex-1 bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim() || sending}
                      className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                        messageText.trim() && !sending
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95'
                          : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <GraduationCap className="w-16 h-16 text-gray-600 mb-3 opacity-40" />
                <h3 className="text-white font-semibold text-lg mb-1">Select a Conversation</h3>
                <p className="text-xs max-w-sm">
                  Choose a faculty mentor from the left panel to review message history and reply.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Meeting Requests */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          {meetingError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{meetingError}</span>
            </div>
          )}

          {loadingMeetings ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 p-8">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-3 opacity-40" />
              <h3 className="text-xl font-bold text-white mb-1">No Meeting Requests</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                When faculty mentors schedule a 1-on-1 counseling session with you, it will appear here so you can accept or decline.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meetings.map((meeting) => (
                <motion.div
                  key={meeting.id || meeting._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between gap-4 relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base">{formatDisplayName(meeting.staffName, 'Faculty Mentor')}</h4>
                          <p className="text-xs text-gray-400">{meeting.staffDepartment}</p>
                        </div>
                      </div>

                      {meeting.status === 'accepted' ? (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold uppercase flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Accepted
                        </span>
                      ) : meeting.status === 'declined' ? (
                        <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full font-bold uppercase flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Declined
                        </span>
                      ) : meeting.status === 'cancelled' ? (
                        <span className="text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2.5 py-1 rounded-full font-bold uppercase">
                          Cancelled
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full font-bold uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-pulse" /> Action Required
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                      <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                        {meeting.title || 'Meeting Purpose'}
                      </p>
                      <p className="text-sm font-semibold text-white">{meeting.purpose}</p>
                      {meeting.message && (
                        <p className="text-xs text-gray-300 italic pt-1 border-t border-white/5">
                          "{meeting.message}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <span>{meeting.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span>{meeting.time}</span>
                      </div>
                    </div>
                  </div>

                  {meeting.status === 'pending' && (
                    <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                      <button
                        onClick={() => handleUpdateMeetingStatus(meeting.id || meeting._id, 'accepted')}
                        disabled={updatingMeetingId === (meeting.id || meeting._id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        {updatingMeetingId === (meeting.id || meeting._id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" /> Accept Meeting
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleUpdateMeetingStatus(meeting.id || meeting._id, 'declined')}
                        disabled={updatingMeetingId === (meeting.id || meeting._id)}
                        className="flex-1 bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-gray-400 px-4 py-2 rounded-xl text-sm font-medium transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Messages;
