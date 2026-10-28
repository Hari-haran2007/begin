import { API_URL } from '../../lib/api';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { 
  AlertTriangle, TrendingDown, MessageSquare, Calendar, Bot, Target, 
  BrainCircuit, Users, X, Send, Loader2, Sparkles, Check, CheckCheck,
  Clock, CheckCircle, XCircle, Info, Pencil, Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Profile, GrowthMetrics, ChatMessage } from '../../types';
import { formatDisplayName } from '../../utils/formatters';

type RiskStudent = Profile & {
  growth_metrics?: GrowthMetrics;
  latest_performance?: any;
};

export default function StaffAIRiskAnalysis() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<RiskStudent[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Messaging State
  const [chatStudent, setChatStudent] = useState<RiskStudent | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Meeting Request State
  const [meetingStudent, setMeetingStudent] = useState<RiskStudent | null>(null);
  const [meetingPurpose, setMeetingPurpose] = useState('Academic Counseling & Performance Review');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [meetingNote, setMeetingNote] = useState('');
  const [sendingMeeting, setSendingMeeting] = useState(false);
  const [meetingError, setMeetingError] = useState('');
  const [meetingSuccess, setMeetingSuccess] = useState('');
  const [studentMeetings, setStudentMeetings] = useState<any[]>([]);
  const [loadingStudentMeetings, setLoadingStudentMeetings] = useState(false);

  useEffect(() => {
    fetchRiskStudents();
  }, [token]);

  // Deep-link auto-opening of student chat if query param studentId is provided
  useEffect(() => {
    const studentIdParam = searchParams.get('studentId');
    if (studentIdParam && token && !chatStudent) {
      const existing = students.find(s => 
        (s.id === studentIdParam || s._id === studentIdParam || s.user_id === studentIdParam || s.roll_number === studentIdParam)
      );
      if (existing) {
        openChatWithStudent(existing);
      } else {
        const authToken = token || localStorage.getItem('token');
        fetch(`${API_URL}/messages/${studentIdParam}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data.partner) {
              openChatWithStudent(data.partner);
            }
          })
          .catch(err => console.error('Error deep linking chat:', err));
      }
    }
  }, [searchParams, students, token]);

  useEffect(() => {
    if (chatStudent) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatStudent]);

  useEffect(() => {
    if (chatStudent && !chatLoading) {
      inputRef.current?.focus();
    }
  }, [chatStudent, chatLoading]);

  // Periodic polling for active chat conversation
  useEffect(() => {
    if (!chatStudent) return;
    const studentId = chatStudent.id || chatStudent._id || chatStudent.user_id;
    if (!studentId) return;

    const interval = setInterval(async () => {
      try {
        const authToken = token || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/messages/${studentId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages)) {
            setChatMessages(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(data.messages)) {
                return data.messages;
              }
              return prev;
            });
          }
        }
      } catch {
        // Silently ignore polling network errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [chatStudent, token]);

  const fetchRiskStudents = async () => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/staff/risk-analysis`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTotalStudentsCount(data.totalStudents || 0);
        setStudents(data.students || []);
        setError('');
      } else {
        const res2 = await fetch(`${API_URL}/staff/students`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res2.ok) {
          const allStudents = await res2.json();
          setTotalStudentsCount(allStudents.length);
          const atRisk = allStudents.filter((s: any) => 
            s.growth_metrics?.growth_stage === 'Risk' || 
            (s.growth_metrics?.overall_score != null && s.growth_metrics.overall_score < 40)
          );
          setStudents(atRisk);
          setError('');
        } else {
          throw new Error('Failed to load risk analysis data');
        }
      }
    } catch (err: any) {
      console.error('Error fetching risk students:', err);
      setError(err.message || 'Unable to load risk analysis data.');
    } finally {
      setLoading(false);
    }
  };

  const openChatWithStudent = async (student: RiskStudent) => {
    setChatStudent(student);
    setChatError('');
    setMessageText('');
    setChatMessages([]);
    
    const studentId = student.id || student._id || student.user_id;
    if (!studentId) return;

    setChatLoading(true);
    try {
      const authToken = token || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/messages/${studentId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load conversation');
      }
      const data = await res.json();
      setChatMessages(data.messages || []);
    } catch (err: any) {
      console.error('Error loading chat:', err);
      setChatError(err.message || 'Unable to load message history.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !chatStudent || sendingMessage) return;

    const studentId = chatStudent.id || chatStudent._id || chatStudent.user_id;
    if (!studentId) return;

    const outgoingText = messageText.trim();
    const authToken = token || localStorage.getItem('token');

    // Optimistic message update
    const tempId = 'temp-' + Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      _id: tempId,
      senderId: 'staff-self',
      senderRole: 'staff',
      senderName: 'You',
      receiverId: studentId,
      receiverRole: 'student',
      studentId: studentId,
      message: outgoingText,
      created_at: new Date().toISOString(),
      isStaff: true,
      isSelf: true
    };

    setChatMessages(prev => [...prev, optimisticMsg]);
    setMessageText('');
    setSendingMessage(true);
    setChatError('');

    try {
      const res = await fetch(`${API_URL}/messages/${studentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ message: outgoingText })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send message');
      }

      const data = await res.json();
      if (data.message) {
        setChatMessages(prev => prev.map(m => m.id === tempId ? { ...data.message, isStaff: true } : m));
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setChatError(err.message || 'Failed to send message. Please try again.');
      // Revert optimistic message and restore text
      setChatMessages(prev => prev.filter(m => m.id !== tempId));
      setMessageText(outgoingText);
    } finally {
      setSendingMessage(false);
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
    setChatMessages(prev => prev.map(m => (m.id === messageId || m._id === messageId) ? {
      ...m,
      message: newText,
      is_edited: true,
      edited: true
    } : m));

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
        setChatMessages(prev => prev.map(m => (m.id === messageId || m._id === messageId) ? {
          ...m,
          ...data.message,
          isStaff: true
        } : m));
      }
      setEditingMessageId(null);
      setEditMessageText('');
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

    const backup = chatMessages;
    // Optimistic delete
    setChatMessages(prev => prev.filter(m => m.id !== messageId && m._id !== messageId));

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
    } catch (err: any) {
      console.error('Error deleting message:', err);
      setChatError(err.message || 'Failed to delete message.');
      setChatMessages(backup);
    } finally {
      setDeletingMessage(false);
    }
  };

  // Periodic polling for student meeting history in modal
  useEffect(() => {
    if (!meetingStudent) return;
    const studentId = meetingStudent.id || meetingStudent._id || meetingStudent.user_id;
    if (!studentId) return;

    const interval = setInterval(async () => {
      try {
        const authToken = token || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/meetings/staff/${studentId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStudentMeetings(data || []);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [meetingStudent, token]);

  // Meeting modal handlers
  const openMeetingModal = async (student: RiskStudent) => {
    setMeetingStudent(student);
    setMeetingPurpose('Academic Counseling & Performance Review');
    setMeetingError('');
    setMeetingSuccess('');
    setMeetingNote('');
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMeetingDate(tomorrow.toISOString().split('T')[0]);
    setMeetingTime('10:00');

    const studentId = student.id || student._id || student.user_id;
    if (!studentId) return;

    setLoadingStudentMeetings(true);
    try {
      const authToken = token || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/meetings/staff/${studentId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudentMeetings(data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStudentMeetings(false);
    }
  };

  const handleSendMeetingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingStudent || sendingMeeting) return;

    const studentId = meetingStudent.id || meetingStudent._id || meetingStudent.user_id;
    if (!studentId) return;

    if (!meetingPurpose.trim() || !meetingDate || !meetingTime) {
      setMeetingError('Please fill in purpose, date, and time.');
      return;
    }

    setSendingMeeting(true);
    setMeetingError('');
    setMeetingSuccess('');

    try {
      const authToken = token || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          studentId: String(studentId),
          title: 'Academic Counseling & Performance Review',
          purpose: meetingPurpose.trim(),
          date: meetingDate,
          time: meetingTime,
          message: meetingNote.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send meeting request');
      }

      setMeetingSuccess(`Meeting request sent to ${meetingStudent.full_name || 'student'}.`);
      setMeetingNote('');
      if (data.meeting) {
        setStudentMeetings(prev => [data.meeting, ...prev]);
      }
    } catch (err: any) {
      setMeetingError(err.message || 'Error sending meeting request');
    } finally {
      setSendingMeeting(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Accepted</span>;
      case 'declined':
        return <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1"><XCircle className="w-3 h-3" /> Declined</span>;
      case 'cancelled':
        return <span className="text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2 py-0.5 rounded font-bold uppercase">Cancelled</span>;
      case 'completed':
        return <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-bold uppercase">Completed</span>;
      default:
        return <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1"><Clock className="w-3 h-3 animate-pulse" /> Pending</span>;
    }
  };

  const riskPercentage = totalStudentsCount > 0 
    ? Math.round((students.length / totalStudentsCount) * 100) 
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">AI Risk Analysis</h1>
        <p className="text-gray-400">AI-powered early warning system for students at academic or placement risk.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-red-900/40 to-orange-900/40 border border-red-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-2xl rounded-full" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-4xl font-bold text-white mb-1">{students.length}</h3>
            <p className="text-sm font-medium text-gray-400">Total Students at Risk</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 mb-4">
              <TrendingDown className="w-6 h-6" />
            </div>
            <h3 className="text-4xl font-bold text-white mb-1">{riskPercentage}%</h3>
            <p className="text-sm font-medium text-gray-400">At-Risk Rate of Enrolled Students</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">AI Detection Active</h3>
            <p className="text-sm font-medium text-gray-400 mb-3">Monitoring {totalStudentsCount} student{totalStudentsCount === 1 ? '' : 's'} registered.</p>
            <div className="flex items-center gap-2 text-xs font-bold text-green-400 bg-green-400/10 w-fit px-2 py-1 rounded">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> System Healthy
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
        </div>
      ) : students.length > 0 ? (
        <div className="space-y-6">
          {students.map((student, index) => (
            <motion.div
              key={student.id || student._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 border border-red-500/20 rounded-2xl p-6 md:p-8 flex flex-col lg:flex-row gap-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <AlertTriangle className="w-32 h-32 text-red-500" />
              </div>

              <div className="flex-1 relative z-10">
                <div className="flex items-start gap-4 mb-6">
                  {student.avatar_url ? (
                    <img src={student.avatar_url} alt={student.full_name} className="w-16 h-16 rounded-2xl object-cover border-2 border-red-500/30" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-xl font-bold text-white border border-red-500/30">
                      {student.full_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-white">{student.full_name}</h3>
                    <p className="text-gray-400 text-sm">{student.roll_number} • {student.department}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-bold uppercase tracking-wider">High Risk</span>
                      <span className="text-xs bg-black/40 text-gray-300 px-2 py-1 rounded border border-white/10">Sem {student.semester}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Growth Score</p>
                    <p className="text-xl font-bold text-red-400">{student.growth_metrics?.overall_score || 0}%</p>
                  </div>
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Tech Skills</p>
                    <p className="text-xl font-bold text-orange-400">{student.growth_metrics?.technical_skills_score || 0}%</p>
                  </div>
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Comm Skills</p>
                    <p className="text-xl font-bold text-yellow-400">{student.growth_metrics?.communication_score || 0}%</p>
                  </div>
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Aptitude</p>
                    <p className="text-xl font-bold text-red-400">{student.growth_metrics?.aptitude_score || 0}%</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => openChatWithStudent(student)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                  >
                    <MessageSquare className="w-4 h-4" /> Message Student
                  </button>
                  <button 
                    onClick={() => openMeetingModal(student)}
                    className="flex-1 bg-white/10 hover:bg-white/15 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border border-white/10 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <Calendar className="w-4 h-4 text-purple-400" /> Request Meeting
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-black/40 rounded-2xl p-6 border border-white/5 relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="w-5 h-5 text-blue-400" />
                  <h4 className="font-bold text-white">AI Diagnostic & Recommendations</h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                      <AlertTriangle className="w-3 h-3" /> Core Issues Detected
                    </h5>
                    <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
                      {(student.growth_metrics?.technical_skills_score || 0) < 50 && (
                        <li>Technical skill proficiency is below recommended benchmark ({student.growth_metrics?.technical_skills_score || 0}%).</li>
                      )}
                      {(student.growth_metrics?.communication_score || 0) < 50 && (
                        <li>Communication assessment score is low ({student.growth_metrics?.communication_score || 0}%).</li>
                      )}
                      {(!student.latest_performance || student.latest_performance?.sgpa < 6.0) && (
                        <li>Academic SGPA requires improvement in Semester {student.semester}.</li>
                      )}
                      {(!student.growth_metrics?.technical_skills_score && !student.growth_metrics?.communication_score) && (
                        <li>Insufficient verified records added for comprehensive skill analysis.</li>
                      )}
                    </ul>
                  </div>

                  <div className="w-full h-px bg-white/10" />

                  <div>
                    <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                      <Target className="w-3 h-3" /> Actionable Recommendations
                    </h5>
                    <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
                      <li>Schedule a 1-on-1 mentoring session to discuss academic & career goals.</li>
                      <li>Encourage student to upload verified semester marksheets and industry certificates.</li>
                      <li>Recommend practical problem solving & coding workshops to elevate skill score.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Excellent! No students are currently at high risk.</p>
        </div>
      )}

      {/* Modern Student Messaging Modal */}
      <AnimatePresence>
        {chatStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col h-[620px] max-h-[92vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-white/10 bg-black/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {chatStudent.avatar_url ? (
                    <img 
                      src={chatStudent.avatar_url} 
                      alt={chatStudent.full_name} 
                      className="w-11 h-11 rounded-xl object-cover border border-blue-500/30 flex-shrink-0" 
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-lg font-bold text-white flex-shrink-0 shadow-md">
                      {chatStudent.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base truncate">{chatStudent.full_name}</h3>
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0">
                        At Risk
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {chatStudent.roll_number} • {chatStudent.department} • Sem {chatStudent.semester}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setChatStudent(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
                  title="Close conversation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Message History */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-gradient-to-b from-gray-950/50 to-gray-900/50">
                {chatLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-sm">Loading conversation...</p>
                  </div>
                ) : chatError ? (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center space-y-2">
                    <p className="text-sm text-red-400">{chatError}</p>
                    <button
                      onClick={() => openChatWithStudent(chatStudent)}
                      className="text-xs text-blue-400 hover:underline font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
                      <MessageSquare className="w-7 h-7" />
                    </div>
                    <h4 className="text-white font-semibold text-base mb-1">No messages yet</h4>
                    <p className="text-xs text-gray-400 max-w-sm">
                      Send a message to start a direct conversation with {chatStudent.full_name}.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-center my-2">
                      <span className="text-[11px] text-gray-500 bg-black/40 px-2.5 py-1 rounded-full border border-white/5">
                        Conversation with {chatStudent.full_name}
                      </span>
                    </div>

                    {chatMessages.map((msg, i) => {
                      const msgId = msg.id || msg._id || `msg-${i}`;
                      const isSelf = msg.isSelf ?? (msg.isStaff ?? (msg.senderRole === 'staff'));
                      const isEditing = editingMessageId === msgId;
                      const isConfirmingDelete = confirmDeleteId === msgId;
                      const isEdited = msg.is_edited || msg.edited;

                      const senderLabel = isSelf
                        ? 'You'
                        : formatDisplayName(
                            msg.senderName ||
                              msg.sender?.full_name ||
                              msg.sender?.name ||
                              chatStudent.full_name,
                            'Student'
                          );

                      return (
                        <div
                          key={msgId}
                          className={`flex flex-col group/msg relative ${isSelf ? 'items-end' : 'items-start'}`}
                        >
                          <span
                            className={`text-[10px] mb-1 font-medium select-none ${
                              isSelf ? 'text-blue-300 mr-1' : 'text-gray-400 ml-1'
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
                            <div className="w-full max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 bg-blue-950/90 border border-blue-500/40 text-white shadow-xl space-y-2 mb-1">
                              <div className="flex items-center justify-between text-[11px] text-blue-300 font-semibold">
                                <span className="flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit Message</span>
                                <button type="button" onClick={handleCancelEdit} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                              </div>
                              <textarea
                                value={editMessageText}
                                onChange={(e) => setEditMessageText(e.target.value)}
                                rows={2}
                                className="w-full bg-black/40 border border-white/15 focus:border-blue-400 rounded-xl p-2 text-sm text-white focus:outline-none resize-none"
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
                                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-md disabled:opacity-50 cursor-pointer"
                                >
                                  {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Normal Message Bubble */
                            <div className="relative group/bubble flex items-center gap-1.5 max-w-[85%] sm:max-w-[75%]">
                              {/* Hover Action controls for staff's own message */}
                              {isSelf && (
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
                                  isSelf
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs'
                                    : 'bg-white/10 text-gray-200 border border-white/10 rounded-tl-xs'
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                                <div
                                  className={`flex items-center gap-1.5 text-[10px] mt-1.5 ${
                                    isSelf ? 'text-blue-200 justify-end' : 'text-gray-400 justify-start'
                                  }`}
                                >
                                  <span>{formatMessageTime(msg.created_at)}</span>
                                  {isEdited && (
                                    <span className="text-[10px] text-blue-200/90 italic font-medium">
                                      • Edited
                                    </span>
                                  )}
                                  {isSelf && <CheckCheck className="w-3 h-3 text-blue-200" />}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="p-4 bg-black/60 border-t border-white/10">
                {chatError && chatMessages.length > 0 && (
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
                    placeholder={`Message ${chatStudent.full_name}...`}
                    disabled={sendingMessage}
                    className="flex-1 bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sendingMessage}
                    className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                      messageText.trim() && !sendingMessage
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 cursor-pointer active:scale-95'
                        : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern Request Meeting Modal */}
      <AnimatePresence>
        {meetingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-white/10 bg-black/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Request Meeting</h3>
                    <p className="text-xs text-gray-400">
                      With {meetingStudent.full_name} ({meetingStudent.roll_number})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setMeetingStudent(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4">
                {meetingSuccess && (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{meetingSuccess}</span>
                  </div>
                )}

                {meetingError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{meetingError}</span>
                  </div>
                )}

                {/* Existing Meetings History */}
                {studentMeetings.length > 0 && (
                  <div className="bg-black/30 border border-white/5 rounded-xl p-3.5 space-y-2">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Meeting Requests ({studentMeetings.length})
                    </p>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {studentMeetings.map((m: any) => (
                        <div key={m.id || m._id} className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{m.purpose}</p>
                            <p className="text-gray-400 text-[11px]">{m.date} at {m.time}</p>
                          </div>
                          <div>{getStatusBadge(m.status)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSendMeetingRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Meeting Purpose *
                    </label>
                    <input
                      type="text"
                      value={meetingPurpose}
                      onChange={(e) => setMeetingPurpose(e.target.value)}
                      placeholder="e.g. Academic Performance Counseling"
                      className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
                      required
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        'Academic SGPA Review',
                        'Low Attendance Guidance',
                        'Placement Mentoring',
                        'Skill Certifications Review'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setMeetingPurpose(preset)}
                          className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 transition-all"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Time *
                      </label>
                      <input
                        type="time"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Instructions / Note (Optional)
                    </label>
                    <textarea
                      value={meetingNote}
                      onChange={(e) => setMeetingNote(e.target.value)}
                      placeholder="e.g. Please bring your latest marksheets and workshop completion proofs..."
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setMeetingStudent(null)}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sendingMeeting || !meetingPurpose.trim() || !meetingDate || !meetingTime}
                      className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      {sendingMeeting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Send Request
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
