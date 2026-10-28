import { API_URL } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Plus,
  Trash2,
  X,
  Calendar,
  MapPin,
  DollarSign,
  ShieldCheck,
  Loader2,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  Eye,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  ZoomIn,
  UploadCloud,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, AIVerificationBadge, Badge } from '../components/ui';
import { Internship } from '../types';

export function Internships() {
  const { profile, refreshProfile, token } = useAuth();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  
  // Progress states
  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Notifications / feedback inside page
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal preview for document
  const [modalPreview, setModalPreview] = useState<{
    url: string;
    type: 'image' | 'pdf';
    name: string;
  } | null>(null);

  // Form Data
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [mode, setMode] = useState<'online' | 'offline'>('online');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [workType, setWorkType] = useState<'remote' | 'onsite' | 'hybrid'>('remote');
  const [stipend, setStipend] = useState('');
  
  // Uploaded Document
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [docType, setDocType] = useState<'image' | 'pdf' | null>(null);
  const [docName, setDocName] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInternships();
  }, [token]);

  const fetchInternships = async () => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      setFetchLoading(false);
      return;
    }

    try {
      setFetchLoading(true);
      const res = await fetch(`${API_URL}/internships`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInternships(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching internships:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';

    if (!isImage && !isPdf) {
      alert('Invalid file format. Supported formats are JPG, JPEG, PNG, WEBP and PDF.');
      return;
    }

    // Limit to 25MB
    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit. Please upload a smaller file.');
      return;
    }

    setDocFile(file);
    setDocName(file.name);
    setDocType(isPdf ? 'pdf' : 'image');

    const reader = new FileReader();
    reader.onloadend = () => {
      setDocPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = () => {
    setDocFile(null);
    setDocPreviewUrl(null);
    setDocType(null);
    setDocName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!company.trim() || !role.trim() || !startDate || !description.trim()) {
      alert('Please fill in all required fields (Company, Role, Start Date, Description).');
      return;
    }

    if (mode === 'online' && !url.trim() && !docPreviewUrl) {
      alert('Please upload an Internship Document or provide the official URL.');
      return;
    }

    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      alert('You must be logged in to submit an internship.');
      return;
    }

    setLoading(true);
    setVerifying(true);
    setProgress(0);

    // Simulated scanning animation
    for (let p = 0; p <= 100; p += 20) {
      setProgress(p);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }

    try {
      const payload = {
        company: company.trim(),
        role: role.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: isCurrent ? null : (endDate || null),
        is_current: isCurrent,
        location: location.trim() || null,
        work_type: workType,
        stipend: stipend ? parseFloat(stipend) : null,
        mode,
        url: mode === 'online' ? (url.trim() || null) : null,
        file_url: docPreviewUrl || null,
        file_name: docName || (docFile ? docFile.name : null),
        file_type: docType,
        verification_status: 'Pending'
      };

      const res = await fetch(`${API_URL}/internships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg('Internship & document submitted successfully for verification!');
        await fetchInternships();
        if (refreshProfile) await refreshProfile();
        setIsAdding(false);
        resetForm();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setErrorMsg(errorData.error || errorData.message || 'Failed to save internship submission.');
      }
    } catch (error: any) {
      console.error('Error adding internship:', error);
      setErrorMsg('Failed to connect to the server. Please try again.');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this internship record?')) return;
    const authToken = token || localStorage.getItem('token');
    if (!authToken) return;

    try {
      const res = await fetch(`${API_URL}/internships/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        setSuccessMsg('Internship record removed successfully.');
        await fetchInternships();
        if (refreshProfile) await refreshProfile();
      } else {
        alert('Failed to delete internship.');
      }
    } catch (err) {
      console.error('Error deleting internship:', err);
      alert('Failed to delete internship.');
    }
  };

  const resetForm = () => {
    setCompany('');
    setRole('');
    setStartDate('');
    setEndDate('');
    setIsCurrent(false);
    setMode('online');
    setUrl('');
    setDescription('');
    setLocation('');
    setWorkType('remote');
    setStipend('');
    removeDoc();
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'approved' || s === 'verified') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
          <CheckCircle className="w-3.5 h-3.5" /> Verified
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold">
          <AlertCircle className="w-3.5 h-3.5" /> Rejected
        </span>
      );
    }
    if (s === 'reupload' || s === 're-upload') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" /> Re-upload Required
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
        <Clock className="w-3.5 h-3.5" /> Pending Verification
      </span>
    );
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="w-full space-y-6 pb-12">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <Briefcase className="w-7 h-7 sm:w-8 h-8 text-purple-400" />
            Internships & Verification
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Submit and verify your professional internships using official certificates or proof documents.
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => {
              setSuccessMsg(null);
              setErrorMsg(null);
              setIsAdding(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/25 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add New Internship
          </button>
        )}
      </motion.div>

      {/* Global Success / Error Banners */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Add / Verify Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="mb-6 border border-white/10 bg-gray-900/80 backdrop-blur-xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                    New Internship Submission & Verification
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      resetForm();
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Company Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g. Google, Microsoft, Infosys"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Internship Role <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g. Frontend Developer Intern, Data Analyst Intern"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" /> Start Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" /> End Date {!isCurrent && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={isCurrent}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-40"
                      required={!isCurrent}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g. Bangalore, Chennai, Remote"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">Work Type & Stipend</label>
                    <div className="flex gap-3">
                      <select
                        value={workType}
                        onChange={(e) => setWorkType(e.target.value as any)}
                        className="bg-gray-900 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 flex-1"
                      >
                        <option value="remote">Remote</option>
                        <option value="onsite">On-site</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                      <input
                        type="number"
                        value={stipend}
                        onChange={(e) => setStipend(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-1/2"
                        placeholder="₹ Stipend/month"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">Mode</label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                        <input
                          type="radio"
                          name="internshipMode"
                          checked={mode === 'online'}
                          onChange={() => setMode('online')}
                          className="w-4 h-4 bg-gray-900 border-gray-600 text-purple-500 focus:ring-purple-500"
                        />
                        <span>Online</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                        <input
                          type="radio"
                          name="internshipMode"
                          checked={mode === 'offline'}
                          onChange={() => setMode('offline')}
                          className="w-4 h-4 bg-gray-900 border-gray-600 text-purple-500 focus:ring-purple-500"
                        />
                        <span>Offline</span>
                      </label>
                    </div>
                  </div>

                  {mode === 'online' && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-blue-400" /> Internship / Portfolio Verification Link
                      </label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="https://..."
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 md:col-span-2">
                    <input
                      type="checkbox"
                      id="currentWorking"
                      checked={isCurrent}
                      onChange={(e) => {
                        setIsCurrent(e.target.checked);
                        if (e.target.checked) setEndDate('');
                      }}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="currentWorking" className="text-gray-300 text-sm cursor-pointer select-none">
                      I currently work at this company
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Internship Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none leading-relaxed"
                    placeholder="Describe your responsibilities, tech stack, and key accomplishments during this internship..."
                    required
                  />
                </div>

                {/* Upload Section */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-purple-400" />
                    Internship Document / Proof (Certificate, Offer Letter or Completion Proof)
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Supported formats: <strong>JPG, JPEG, PNG, WEBP and PDF</strong> (Max 25MB).
                  </p>

                  {!docFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileSelect(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                        dragOver ? 'border-purple-500 bg-purple-500/10' : 'border-white/15 hover:border-purple-500/50 bg-black/20 hover:bg-black/40'
                      }`}
                    >
                      <UploadCloud className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-purple-400' : 'text-gray-500'}`} />
                      <p className="text-sm text-gray-200 font-semibold">Click to upload or drag & drop internship proof</p>
                      <p className="text-xs text-gray-500 mt-1">Accepts Certificate Photo, Screenshot, Scanned Image or PDF Document</p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        accept=".pdf,image/jpeg,image/png,image/webp,image/jpg"
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="bg-black/30 border border-white/15 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`p-2.5 rounded-xl shrink-0 ${docType === 'pdf' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                            {docType === 'pdf' ? <FileText className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                          </div>
                          <div className="truncate">
                            <p className="text-sm text-white font-bold truncate">{docName}</p>
                            <p className="text-xs text-gray-400">
                              {(docFile.size / 1024 / 1024).toFixed(2)} MB • {docType?.toUpperCase()} Document
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {docPreviewUrl && (
                            <button
                              type="button"
                              onClick={() => setModalPreview({ url: docPreviewUrl, type: docType || 'image', name: docName })}
                              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Preview
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={removeDoc}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Image Preview */}
                      {docType === 'image' && docPreviewUrl && (
                        <div 
                          onClick={() => setModalPreview({ url: docPreviewUrl, type: 'image', name: docName })}
                          className="relative w-full max-h-56 rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center cursor-pointer group"
                        >
                          <img src={docPreviewUrl} alt="Document Preview" className="max-h-56 w-auto object-contain rounded-xl" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-xs text-white font-medium bg-black/70 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                              <ZoomIn className="w-4 h-4" /> Click to Enlarge
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Inline PDF Preview Card */}
                      {docType === 'pdf' && (
                        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center justify-between">
                          <span className="text-xs text-red-300 font-medium flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-red-400" /> PDF Document ready for submission
                          </span>
                          {docPreviewUrl && (
                            <button
                              type="button"
                              onClick={() => setModalPreview({ url: docPreviewUrl, type: 'pdf', name: docName })}
                              className="text-xs text-red-300 hover:text-white font-semibold underline cursor-pointer"
                            >
                              Open PDF Preview
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {verifying && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-300 flex items-center gap-1.5 font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Validating internship document & saving record...
                      </span>
                      <span className="text-white font-bold">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-150" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      resetForm();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !company.trim() || !role.trim() || !startDate || !description.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-purple-500/25 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Submit for Verification</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Internships List */}
      <motion.div variants={item}>
        {fetchLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-2" />
            <p className="text-sm">Loading your internship records...</p>
          </div>
        ) : internships.length > 0 ? (
          <div className="space-y-4">
            {internships.map((intern, index) => {
              const internId = intern._id || intern.id!;
              const isPdf = Boolean(
                intern.file_type === 'pdf' || 
                intern.file_url?.includes('application/pdf') || 
                intern.file_url?.endsWith('.pdf') ||
                intern.file_name?.toLowerCase().endsWith('.pdf')
              );
              const isImage = Boolean(
                intern.file_type === 'image' ||
                intern.file_url?.startsWith('data:image/') ||
                intern.file_name?.match(/\.(jpe?g|png|webp)$/i) ||
                intern.file_url?.match(/\.(jpe?g|png|webp)/i)
              );

              return (
                <motion.div
                  key={internId}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Card className="border border-white/10 bg-gray-900/60 backdrop-blur-xl hover:border-purple-500/30 transition-all">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="p-3.5 rounded-2xl bg-purple-600/15 border border-purple-500/25 shrink-0 self-start">
                        <Briefcase className="w-7 h-7 text-purple-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                          <div>
                            <h4 className="text-white font-bold text-lg leading-tight">{intern.role}</h4>
                            <p className="text-purple-400 font-semibold text-sm mt-0.5">{intern.company}</p>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(intern.verification_status)}

                            <Badge variant={intern.is_current ? 'good' : 'medium'}>
                              {intern.is_current ? 'Current' : 'Completed'}
                            </Badge>

                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              intern.mode === 'offline' ? 'bg-gray-800 text-gray-300 border border-white/10' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {intern.mode === 'offline' ? 'OFFLINE' : 'ONLINE'}
                            </span>

                            <button
                              onClick={() => handleDelete(internId)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors ml-1 cursor-pointer"
                              title="Delete record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-2">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            {new Date(intern.start_date).toLocaleDateString()} -{' '}
                            {intern.is_current ? 'Present' : intern.end_date ? new Date(intern.end_date).toLocaleDateString() : 'Completed'}
                          </span>
                          {intern.location && (
                            <span className="flex items-center gap-1.5 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-gray-500" /> {intern.location}
                            </span>
                          )}
                          {intern.work_type && (
                            <span className="capitalize px-2 py-0.5 rounded bg-white/5 text-gray-300 font-medium">
                              {intern.work_type}
                            </span>
                          )}
                          {intern.stipend && (
                            <span className="flex items-center gap-1 font-medium text-emerald-400">
                              <DollarSign className="w-3.5 h-3.5" /> ₹{intern.stipend.toLocaleString()}/mo
                            </span>
                          )}
                        </div>

                        {intern.description && (
                          <p className="text-gray-300 text-xs sm:text-sm mt-3 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                            {intern.description}
                          </p>
                        )}

                        {/* Rejection notice if rejected */}
                        {(intern.verification_status === 'rejected' || intern.verification_status === 'Rejected') && intern.staff_comment && (
                          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-red-400">Rejection Reason from Faculty: </span>
                              {intern.staff_comment}
                            </div>
                          </div>
                        )}

                        {/* Re-upload request notice if reupload requested */}
                        {(intern.verification_status === 'reupload' || intern.verification_status === 'Re-upload') && intern.staff_comment && (
                          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-amber-400">Faculty Remarks (Re-upload Requested): </span>
                              {intern.staff_comment}
                            </div>
                          </div>
                        )}

                        {/* Verification remarks if present */}
                        {(intern.verification_status === 'approved' || intern.verification_status === 'Verified') && intern.staff_comment && (
                          <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-emerald-400">Faculty Remarks: </span>
                              {intern.staff_comment}
                            </div>
                          </div>
                        )}

                        {/* Document Attachment & Preview Actions */}
                        <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                          {intern.file_url ? (
                            <div className="flex items-center gap-3">
                              {isImage && (
                                <div 
                                  onClick={() => setModalPreview({
                                    url: intern.file_url!,
                                    type: 'image',
                                    name: intern.file_name || `${intern.company}-proof.png`
                                  })}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/25 hover:bg-purple-500/20 text-purple-300 transition-colors cursor-pointer group"
                                >
                                  <ImageIcon className="w-4 h-4 text-purple-400" />
                                  <span className="font-semibold truncate max-w-[180px]">
                                    {intern.file_name || 'Internship Image Proof'}
                                  </span>
                                  <Eye className="w-3.5 h-3.5 ml-1 text-purple-400 opacity-80 group-hover:opacity-100" />
                                </div>
                              )}

                              {isPdf && (
                                <button
                                  type="button"
                                  onClick={() => setModalPreview({
                                    url: intern.file_url!,
                                    type: 'pdf',
                                    name: intern.file_name || `${intern.company}-document.pdf`
                                  })}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-300 transition-colors cursor-pointer"
                                >
                                  <FileText className="w-4 h-4 text-red-400" />
                                  <span className="font-semibold truncate max-w-[180px]">
                                    {intern.file_name || 'Internship Document (PDF)'}
                                  </span>
                                  <Eye className="w-3.5 h-3.5 ml-1 text-red-400" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-xs">No document attached</span>
                          )}

                          {intern.url && (
                            <a
                              href={intern.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors font-medium ml-auto"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                              <span>View Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="border border-white/10 bg-gray-900/50 backdrop-blur-xl">
            <div className="text-center py-14 px-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-4">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1.5">No internships submitted yet</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                Add and verify your professional internships using official completion certificates, proof images or offer letters.
              </p>
              <button
                onClick={() => {
                  setSuccessMsg(null);
                  setErrorMsg(null);
                  setIsAdding(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Your First Internship
              </button>
            </div>
          </Card>
        )}
      </motion.div>

      {/* Document Lightbox / Preview Modal */}
      <AnimatePresence>
        {modalPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setModalPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-white/15 rounded-3xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2.5 truncate">
                  {modalPreview.type === 'pdf' ? (
                    <FileText className="w-5 h-5 text-red-400 shrink-0" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-purple-400 shrink-0" />
                  )}
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {modalPreview.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={modalPreview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1"
                    title="Open in new window"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setModalPreview(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-black/30 min-h-[350px]">
                {modalPreview.type === 'pdf' ? (
                  <iframe
                    src={modalPreview.url}
                    className="w-full h-[65vh] rounded-xl border border-white/10 bg-white"
                    title="Document Preview PDF"
                  />
                ) : (
                  <img
                    src={modalPreview.url}
                    alt="Document Full Preview"
                    className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
