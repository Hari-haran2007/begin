import { API_URL } from '../../lib/api';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, CheckCircle, XCircle, Search, ExternalLink, 
  AlertTriangle, FileText, Image as ImageIcon, ZoomIn, X, RefreshCw, 
  Loader2, FileX, FileCheck, Download, Calendar, Users, Award, Globe
} from 'lucide-react';
import { useToast } from '../../components/ui';

export interface HackathonWithProfile {
  id: string;
  _id?: string;
  hackathonId?: string;
  student_name: string;
  studentName?: string;
  roll_number: string;
  studentRollNumber?: string;
  department: string;
  semester?: string | number;
  student_id?: string;
  studentId?: string;
  name: string;
  organizer: string;
  date: string;
  team_name?: string;
  result?: string;
  prize?: string;
  project_name?: string;
  mode?: string;
  url?: string;
  file_url?: string;
  uploadedDocumentUrl?: string;
  file_name?: string;
  file_type?: string;
  uploadedDocumentType?: string;
  documentUrl?: string;
  verification_status: string;
  verificationStatus?: string;
  staff_comment?: string;
  rejectionReason?: string;
  created_at?: string;
  uploadedAt?: string;
}

export default function StaffHackathons() {
  const showToast = useToast();
  const [records, setRecords] = useState<HackathonWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<HackathonWithProfile | null>(null);
  const [remark, setRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<'Verified' | 'Rejected' | 'Re-upload' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Document modal preview
  const [modalPreview, setModalPreview] = useState<{
    url: string;
    type: 'image' | 'pdf';
    name: string;
    id?: string;
  } | null>(null);

  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
  }, [selectedRecord?.id, selectedRecord?._id]);

  const createBlobUrl = (dataUrl: string): string => {
    if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
    try {
      const parts = dataUrl.split(';base64,');
      if (parts.length < 2) return dataUrl;
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      return URL.createObjectURL(blob);
    } catch {
      return dataUrl;
    }
  };

  const openDocumentInNewTab = (rawUrl: string, id?: string) => {
    if (id) {
      const token = localStorage.getItem('token');
      const directUrl = `${API_URL}/hackathons/${id}/document${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(directUrl, '_blank');
      return;
    }
    if (rawUrl.startsWith('data:')) {
      const blobUrl = createBlobUrl(rawUrl);
      window.open(blobUrl, '_blank');
    } else {
      window.open(rawUrl, '_blank');
    }
  };

  const handleDownload = (rawUrl: string, filename: string, id?: string) => {
    if (id) {
      const token = localStorage.getItem('token');
      const directUrl = `${API_URL}/hackathons/${id}/document?download=1${token ? `&token=${encodeURIComponent(token)}` : ''}`;
      const a = document.createElement('a');
      a.href = directUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    const targetUrl = rawUrl.startsWith('data:') ? createBlobUrl(rawUrl) : rawUrl;
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/staff/hackathons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text}`);
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setRecords(list);

      if (selectedRecord) {
        const updatedSelected = list.find((r: any) => r.id === selectedRecord.id || r._id === selectedRecord.id);
        if (updatedSelected) {
          setSelectedRecord(updatedSelected);
        }
      }
    } catch (err: any) {
      console.error('Error fetching staff hackathons:', err);
      setError(err instanceof Error ? err.message : 'Unable to load hackathon submissions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecordsSilent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/staff/hackathons`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setRecords(data);
        }
      }
    } catch (err) {
      console.error('Silent refresh failed:', err);
    }
  };

  const handleAction = async (status: 'Verified' | 'Rejected' | 'Re-upload') => {
    if (actionLoading) return;

    if (!selectedRecord) {
      showToast('Please select a hackathon submission.', 'error');
      return;
    }

    const recId = selectedRecord.id || selectedRecord._id;
    if (!recId) {
      showToast('Invalid hackathon record selected.', 'error');
      return;
    }

    const trimmedRemark = remark.trim();

    if (status === 'Rejected' && !trimmedRemark) {
      setActionError('Please enter a rejection reason in the remarks field before rejecting.');
      showToast('Please enter a rejection reason in the remarks field before rejecting.', 'error');
      return;
    }

    setActionLoading(true);
    setActiveAction(status);
    setActionError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/staff/hackathons/${recId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          verification_status: status, 
          staff_comment: trimmedRemark 
        })
      });

      if (!response.ok) {
        let errorMsg = 'Failed to update hackathon status.';
        try {
          const errData = await response.json();
          if (errData.error || errData.message) errorMsg = errData.error || errData.message;
        } catch {
          const text = await response.text();
          if (text) errorMsg = text;
        }
        throw new Error(errorMsg);
      }
      
      const updated = await response.json();
      const finalStatus = updated.verification_status || status;
      const finalComment = updated.staff_comment !== undefined ? updated.staff_comment : trimmedRemark;
      
      setRecords(prev => prev.map(r => (r.id === recId || r._id === recId) ? { 
        ...r, 
        verification_status: finalStatus, 
        verificationStatus: finalStatus,
        staff_comment: finalComment,
        rejectionReason: finalComment
      } : r));

      if (status === 'Verified') {
        showToast('Hackathon verified successfully.', 'success');
      } else if (status === 'Rejected') {
        showToast('Hackathon rejected successfully.', 'success');
      } else {
        showToast('Re-upload requested successfully.', 'success');
      }

      setSelectedRecord(null);
      setRemark('');
      setActionError(null);
      setImageLoading(true);
      setImageError(false);

      fetchRecordsSilent();
    } catch (err: any) {
      console.error('Error during hackathon verification action:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update verification status. Please try again.';
      setActionError(msg);
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
      setActiveAction(null);
    }
  };

  const filteredRecords = records.filter(r => {
    const sName = (r.student_name || r.studentName || '').toLowerCase();
    const sRoll = (r.roll_number || r.studentRollNumber || '').toLowerCase();
    const sDept = (r.department || '').toLowerCase();
    const hName = (r.name || '').toLowerCase();
    const hOrg = (r.organizer || '').toLowerCase();
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || sName.includes(q) || sRoll.includes(q) || sDept.includes(q) || hName.includes(q) || hOrg.includes(q);

    const statusNorm = (r.verification_status || r.verificationStatus || 'pending').toLowerCase();
    let matchesStatus = true;
    if (statusFilter === 'pending') {
      matchesStatus = statusNorm === 'pending';
    } else if (statusFilter === 'approved' || statusFilter === 'verified') {
      matchesStatus = statusNorm === 'approved' || statusNorm === 'verified';
    } else if (statusFilter === 'rejected') {
      matchesStatus = statusNorm === 'rejected';
    } else if (statusFilter === 'reupload') {
      matchesStatus = statusNorm === 'reupload' || statusNorm === 're-upload';
    }

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status?: string) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'approved' || s === 'verified') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
          <CheckCircle className="w-3 h-3" /> Verified
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
    }
    if (s === 'reupload' || s === 're-upload') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
          <AlertTriangle className="w-3 h-3" /> Re-upload Req.
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
        Pending
      </span>
    );
  };

  const getResultBadge = (result?: string) => {
    const res = (result || 'participated').toLowerCase();
    if (res === 'winner') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
          Winner
        </span>
      );
    }
    if (res === 'runner_up') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
          Runner Up
        </span>
      );
    }
    if (res === 'finalist') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
          Finalist
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10 uppercase">
        Participant
      </span>
    );
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 flex items-center gap-2.5">
            <Trophy className="w-7 h-7 sm:w-8 h-8 text-blue-400" />
            Hackathons Verification
          </h1>
          <p className="text-gray-400 text-sm">
            Review and verify student hackathon participation proofs, certificates, prizes, and competitive achievements.
          </p>
        </div>

        <button
          onClick={fetchRecords}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium w-fit cursor-pointer"
          title="Refresh hackathon submissions"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, roll number, department, or hackathon name..."
            className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none min-w-[180px] cursor-pointer"
        >
          <option value="all">All Statuses ({records.length})</option>
          <option value="pending">Pending Verification</option>
          <option value="approved">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="reupload">Re-upload Required</option>
        </select>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-blue-400">
          <Loader2 className="w-10 h-10 animate-spin mb-3" />
          <p className="text-gray-300 text-sm font-medium">Loading hackathon submissions...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 p-6 max-w-lg mx-auto">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Unable to load hackathon submissions</h3>
          <p className="text-red-400 text-sm mb-5">{error}</p>
          <button 
            onClick={fetchRecords} 
            className="px-5 py-2.5 bg-blue-600 rounded-xl text-white font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 p-8">
          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-1">No hackathon submissions available.</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            When students submit hackathon participation records with certificates or proof documents, they will appear here for verification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: List of Submissions */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
              Submissions ({filteredRecords.length})
            </div>

            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => {
                const recId = record.id || record._id;
                const selId = selectedRecord?.id || selectedRecord?._id;
                const isSelected = Boolean(recId && selId && recId === selId);
                const isPdf = Boolean(
                  record.file_type === 'pdf' || 
                  record.uploadedDocumentType === 'pdf' ||
                  record.file_url?.includes('application/pdf') || 
                  record.file_url?.endsWith('.pdf') ||
                  record.file_name?.toLowerCase().endsWith('.pdf')
                );
                const hasDoc = Boolean(record.file_url || record.uploadedDocumentUrl);

                return (
                  <motion.div
                    key={record.id || record._id}
                    onClick={() => {
                      if (actionLoading) return;
                      setActionError(null);
                      setSelectedRecord(record);
                      setRemark(record.staff_comment || record.rejectionReason || '');
                    }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-900/25 border-blue-500/60 shadow-lg shadow-blue-500/10' 
                        : 'bg-white/5 border-white/10 hover:border-blue-500/30 hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-white font-bold text-base leading-tight truncate">{record.name}</h3>
                          <p className="text-xs text-blue-400 font-semibold truncate mt-0.5">{record.organizer}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(record.verification_status || record.verificationStatus)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {getResultBadge(record.result)}
                      {record.prize && (
                        <span className="text-[11px] text-emerald-400 font-medium truncate">
                          🏆 {record.prize}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-xs">
                      <div>
                        <p className="text-gray-200 font-semibold">{record.student_name || record.studentName}</p>
                        <p className="text-gray-500 text-[11px]">{record.roll_number || record.studentRollNumber} • {record.department}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {hasDoc ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                            isPdf ? 'bg-red-500/15 text-red-300 border border-red-500/20' : 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                          }`}>
                            {isPdf ? <FileText className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                            {isPdf ? 'PDF' : 'Image'}
                          </span>
                        ) : record.url ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/20">
                            <Globe className="w-3 h-3" /> Link
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[11px] italic">No proof</span>
                        )}
                        <span className="text-gray-500 text-[11px]">
                          {record.created_at ? new Date(record.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 p-6">
                <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-2 opacity-50" />
                <p className="text-gray-400 text-sm">No matching hackathon records found.</p>
              </div>
            )}
          </div>

          {/* Right Column: Detailed Review & Verification Panel */}
          <div className="lg:col-span-7 lg:sticky lg:top-20">
            <AnimatePresence mode="wait">
              {selectedRecord ? (
                <motion.div
                  key={selectedRecord.id || selectedRecord._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-gray-900/90 border border-white/15 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl space-y-6"
                >
                  {/* Panel Header */}
                  <div className="flex items-start justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white leading-tight">{selectedRecord.name}</h2>
                        <p className="text-blue-400 font-semibold text-sm">{selectedRecord.organizer}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {getStatusBadge(selectedRecord.verification_status || selectedRecord.verificationStatus)}
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => {
                          if (actionLoading) return;
                          setSelectedRecord(null);
                          setRemark('');
                          setActionError(null);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                        title="Close panel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Student & Submission Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 p-4 rounded-2xl border border-white/5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-gray-500">Student Name</p>
                      <p className="text-sm font-bold text-gray-200 truncate mt-0.5">
                        {selectedRecord.student_name || selectedRecord.studentName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-gray-500">Register No / Roll</p>
                      <p className="text-sm font-bold text-blue-300 truncate mt-0.5">
                        {selectedRecord.roll_number || selectedRecord.studentRollNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-gray-500">Department</p>
                      <p className="text-sm font-bold text-gray-200 truncate mt-0.5">{selectedRecord.department}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-gray-500">Submitted On</p>
                      <p className="text-sm font-bold text-gray-300 mt-0.5">
                        {selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Hackathon Event Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div>
                      <span className="text-gray-400 font-medium block">Event Date</span>
                      <span className="text-gray-200 font-semibold mt-0.5 block">
                        {selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium block">Result</span>
                      <span className="mt-1 block">
                        {getResultBadge(selectedRecord.result)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium block">Mode</span>
                      <span className="text-gray-200 font-semibold mt-0.5 block uppercase">
                        {selectedRecord.mode || 'Online'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium block">Prize / Award</span>
                      <span className="text-emerald-400 font-semibold mt-0.5 block truncate">
                        {selectedRecord.prize || 'Participation'}
                      </span>
                    </div>
                  </div>

                  {/* Team and Project Info */}
                  {(selectedRecord.team_name || selectedRecord.project_name || selectedRecord.url) && (
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2 text-xs">
                      {selectedRecord.team_name && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-400" />
                          <span className="text-gray-400">Team Name:</span>
                          <span className="text-gray-200 font-semibold">{selectedRecord.team_name}</span>
                        </div>
                      )}
                      {selectedRecord.project_name && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-400" />
                          <span className="text-gray-400">Project / Solution:</span>
                          <span className="text-gray-200 font-semibold">{selectedRecord.project_name}</span>
                        </div>
                      )}
                      {selectedRecord.url && (
                        <div className="pt-2 border-t border-white/5">
                          <a
                            href={selectedRecord.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium"
                          >
                            <Globe className="w-3.5 h-3.5" /> Event / Project Link <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ACTUAL UPLOADED IMAGE OR PDF PREVIEW SECTION */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-blue-400" />
                        Uploaded Certificate / Participation Proof
                      </p>
                      {selectedRecord.file_url && (
                        <button
                          type="button"
                          onClick={() => openDocumentInNewTab(selectedRecord.file_url!, selectedRecord.id || selectedRecord._id)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          View External Link <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {(() => {
                      const rawDocUrl = selectedRecord.uploadedDocumentUrl || selectedRecord.file_url;
                      const docType = selectedRecord.uploadedDocumentType || selectedRecord.file_type;
                      const isPdf = Boolean(
                        docType === 'pdf' || 
                        rawDocUrl?.includes('application/pdf') || 
                        rawDocUrl?.endsWith('.pdf') || 
                        selectedRecord.file_name?.toLowerCase().endsWith('.pdf')
                      );
                      const recId = selectedRecord.id || selectedRecord._id;
                      const fileName = selectedRecord.file_name || (isPdf ? `${selectedRecord.name}_certificate.pdf` : `${selectedRecord.name}_certificate.png`);

                      if (!rawDocUrl && !recId) {
                        return (
                          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
                            <FileX className="w-8 h-8 text-gray-500 opacity-60" />
                            <p className="text-sm font-medium text-gray-400">No certificate uploaded.</p>
                            <p className="text-xs text-gray-500">Student submitted this hackathon record without attaching a certificate.</p>
                          </div>
                        );
                      }

                      if (!rawDocUrl) {
                        return (
                          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
                            <FileX className="w-8 h-8 text-gray-500 opacity-60" />
                            <p className="text-sm font-medium text-gray-400">No certificate uploaded.</p>
                            <p className="text-xs text-gray-500">Student submitted this hackathon record without attaching a certificate.</p>
                          </div>
                        );
                      }

                      if (isPdf) {
                        const pdfPreviewUrl = (rawDocUrl && rawDocUrl.startsWith('data:')
                          ? createBlobUrl(rawDocUrl)
                          : (recId ? `${API_URL}/hackathons/${recId}/document` : rawDocUrl)) || '';

                        return (
                          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-white truncate">
                                    {fileName}
                                  </p>
                                  <p className="text-[11px] text-gray-400">PDF Certificate</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setModalPreview({
                                    url: pdfPreviewUrl,
                                    type: 'pdf',
                                    name: fileName,
                                    id: recId
                                  })}
                                  className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Fullscreen Preview"
                                >
                                  <ZoomIn className="w-3.5 h-3.5" /> Fullscreen
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openDocumentInNewTab(rawDocUrl || pdfPreviewUrl, recId)}
                                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Open PDF in new browser tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDownload(rawDocUrl || pdfPreviewUrl, fileName, recId)}
                                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" /> Download
                                </button>
                              </div>
                            </div>

                            <div className="w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-white/10 bg-white relative">
                              <iframe
                                src={pdfPreviewUrl}
                                className="w-full h-full"
                                title="Hackathon Certificate PDF Viewer"
                              />
                            </div>
                          </div>
                        );
                      } else {
                        // Image file
                        const imgDisplayUrl = rawDocUrl || (recId ? `${API_URL}/hackathons/${recId}/document` : '');

                        return (
                          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                                  <ImageIcon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-white truncate">
                                    {fileName}
                                  </p>
                                  <p className="text-[11px] text-gray-400">Image Certificate / Proof</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setModalPreview({
                                    url: imgDisplayUrl,
                                    type: 'image',
                                    name: fileName,
                                    id: recId
                                  })}
                                  className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Click to Enlarge"
                                >
                                  <ZoomIn className="w-3.5 h-3.5" /> Enlarge
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openDocumentInNewTab(rawDocUrl || imgDisplayUrl, recId)}
                                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Open Full Size in new tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Open Full Size
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDownload(rawDocUrl || imgDisplayUrl, fileName, recId)}
                                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Download Image"
                                >
                                  <Download className="w-3.5 h-3.5" /> Download
                                </button>
                              </div>
                            </div>

                            <div
                              onClick={() => setModalPreview({
                                url: imgDisplayUrl,
                                type: 'image',
                                name: fileName,
                                id: recId
                              })}
                              className="relative rounded-xl overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center cursor-pointer group min-h-[220px] max-h-96 p-2"
                            >
                              {imageLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                                  <span className="ml-2 text-xs text-gray-300 font-medium">Loading certificate image...</span>
                                </div>
                              )}

                              {imageError ? (
                                <div className="p-6 text-center text-gray-400">
                                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                                  <p className="text-sm font-semibold text-gray-200">Unable to display image preview</p>
                                  <p className="text-xs text-gray-400 mt-1">Click below to open the image directly in a new tab.</p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDocumentInNewTab(rawDocUrl || imgDisplayUrl, recId);
                                    }}
                                    className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                                  >
                                    Open Image
                                  </button>
                                </div>
                              ) : (
                                <img
                                  src={imgDisplayUrl}
                                  alt="Actual Uploaded Hackathon Certificate"
                                  onLoad={() => setImageLoading(false)}
                                  onError={() => {
                                    setImageLoading(false);
                                    setImageError(true);
                                  }}
                                  className="max-h-88 w-auto max-w-full object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.01]"
                                />
                              )}

                              {!imageError && !imageLoading && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                  <span className="px-3.5 py-1.5 rounded-lg bg-blue-600/90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                                    <ZoomIn className="w-4 h-4" /> Click to View Full Size
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* Verification Actions Area */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block mb-1.5">
                        Verification Remarks / Rejection Reason
                      </label>
                      <textarea
                        value={remark}
                        onChange={(e) => {
                          setRemark(e.target.value);
                          if (actionError) setActionError(null);
                        }}
                        disabled={actionLoading}
                        placeholder="Add faculty remarks or enter specific rejection reasons..."
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-20 disabled:opacity-50"
                      />
                    </div>

                    {actionError && (
                      <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{actionError}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap sm:flex-nowrap gap-3">
                      <button 
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleAction('Verified')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 px-4 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {actionLoading && activeAction === 'Verified' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Verify Hackathon</span>
                          </>
                        )}
                      </button>

                      <button 
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleAction('Rejected')}
                        className="flex-1 bg-red-600/80 hover:bg-red-600 text-white rounded-xl py-2.5 px-4 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {actionLoading && activeAction === 'Rejected' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Rejecting...</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>Reject Hackathon</span>
                          </>
                        )}
                      </button>

                      <button 
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleAction('Re-upload')}
                        className="flex-1 bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded-xl py-2.5 px-4 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {actionLoading && activeAction === 'Re-upload' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Requesting...</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4" />
                            <span>Re-upload Req.</span>
                          </>
                        )}
                      </button>
                    </div>

                    {selectedRecord.staff_comment && (
                      <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs">
                        <span className="text-gray-400 font-semibold block mb-0.5">Existing Remarks on File:</span>
                        <span className="text-gray-200">{selectedRecord.staff_comment}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center h-full flex flex-col items-center justify-center min-h-[460px]">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">Select a Hackathon</h3>
                  <p className="text-gray-400 text-sm max-w-sm">
                    Click any student hackathon submission from the left column to inspect the certificate, team details, prize info, and perform verification.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Fullscreen Preview */}
      <AnimatePresence>
        {modalPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setModalPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-white/15 rounded-3xl overflow-hidden max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2.5 truncate">
                  {modalPreview.type === 'pdf' ? (
                    <FileText className="w-5 h-5 text-red-400 shrink-0" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-blue-400 shrink-0" />
                  )}
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {modalPreview.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openDocumentInNewTab(modalPreview.url, modalPreview.id)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Open in new browser tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Open in Tab</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload(modalPreview.url, modalPreview.name, modalPreview.id)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Download document"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalPreview(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-black/40 min-h-[400px]">
                {modalPreview.type === 'pdf' ? (
                  <iframe
                    src={modalPreview.url}
                    className="w-full h-[72vh] rounded-xl border border-white/10 bg-white"
                    title="Hackathon Certificate Preview PDF"
                  />
                ) : (
                  <img
                    src={modalPreview.url}
                    alt="Hackathon Certificate Full Preview"
                    className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
