import { API_URL } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Calendar,
  Users,
  Medal,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, useToast, AIVerificationBadge, DragDropUpload } from '../components/ui';
import { Hackathon } from '../types';

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const resultVariants = {
  participated: { label: 'Participated', variant: 'medium' as const, icon: Trophy },
  winner: { label: 'Winner', variant: 'good' as const, icon: Medal },
  runner_up: { label: 'Runner Up', variant: 'advanced' as const, icon: Medal },
  finalist: { label: 'Finalist', variant: 'good' as const, icon: Trophy },
};

export function Hackathons() {
  const { profile, token } = useAuth();
  const showToast = useToast();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    organizer: '',
    date: '',
    team_name: '',
    result: 'participated' as Hackathon['result'],
    prize: '',
    project_name: '',
    mode: 'online' as 'online' | 'offline',
    url: '',
  });

  const [certificate, setCertificate] = useState<File | null>(null);
  const [participationProof, setParticipationProof] = useState<File | null>(null);
  const [winningCert, setWinningCert] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File | null>(null);
  
  const [certPreview, setCertPreview] = useState<string | null>(null);
  const [photosPreview, setPhotosPreview] = useState<string | null>(null);
  const [winningPreview, setWinningPreview] = useState<string | null>(null);
  const [docDataUrl, setDocDataUrl] = useState<string | null>(null);
  const [docName, setDocName] = useState<string | null>(null);
  const [docType, setDocType] = useState<string | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [existingFileType, setExistingFileType] = useState<string | null>(null);
  
  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (profile?.user_id) fetchHackathons();
  }, [profile?.user_id]);

  const fetchHackathons = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/hackathons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHackathons(data);
      }
    } catch (err) {
      console.error('Error fetching hackathons:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const primaryFile = certificate || winningCert || participationProof || photos;
    let finalFileUrl = existingFileUrl || null;
    let finalFileName = existingFileName || null;
    let finalFileType = existingFileType || null;

    if (primaryFile) {
      try {
        finalFileUrl = await readFileAsDataUrl(primaryFile);
        finalFileName = primaryFile.name;
        finalFileType = primaryFile.type || 'application/pdf';
      } catch (e) {
        console.error('Failed to read file as data url', e);
      }
    }

    const hackathonData = {
      user_id: profile?.user_id,
      name: formData.name,
      organizer: formData.organizer,
      date: formData.date,
      team_name: formData.team_name || null,
      result: formData.result,
      prize: formData.prize || null,
      project_name: formData.project_name || null,
      mode: formData.mode,
      url: formData.mode === 'online' ? (formData.url || null) : null,
      file_url: finalFileUrl,
      file_name: finalFileName,
      file_type: finalFileType,
    };

    setVerifying(true);
    setProgress(0);
    // Simulate upload/verification progress
    const simulateProgress = async () => {
      for (let i = 0; i <= 100; i += 20) {
        setProgress(i);
        await new Promise(r => setTimeout(r, 60));
      }
    };
    
    if (primaryFile) {
      await simulateProgress();
    }
    setVerifying(false);

    try {
      const url = editingId 
        ? `${API_URL}/hackathons/${editingId}`
        : `${API_URL}/hackathons`;
      
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(hackathonData)
      });

      if (res.ok) {
        showToast(editingId ? 'Hackathon updated successfully' : 'Hackathon added successfully', 'success');
        await fetchHackathons();
        setLoading(false);
        setIsAdding(false);
        setEditingId(null);
        resetForm();
      } else {
        showToast(editingId ? 'Failed to update hackathon' : 'Failed to add hackathon', 'error');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error saving hackathon:', err);
      showToast('Error saving hackathon', 'error');
      setLoading(false);
    }

    // state updates moved inside try-catch block
  };

  const handleEdit = (hackathon: Hackathon) => {
    setFormData({
      name: hackathon.name,
      organizer: hackathon.organizer,
      date: hackathon.date,
      team_name: hackathon.team_name || '',
      result: hackathon.result || 'participated',
      prize: hackathon.prize || '',
      project_name: hackathon.project_name || '',
      mode: hackathon.mode || 'online',
      url: hackathon.url || '',
    });
    setEditingId(hackathon._id || hackathon.id || null);
    setExistingFileUrl(hackathon.file_url || (hackathon as any).certificate_url || null);
    setExistingFileName(hackathon.file_name || null);
    setExistingFileType(hackathon.file_type || null);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/hackathons/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchHackathons();
        showToast('Hackathon deleted', 'success');
      }
    } catch (err) {
      console.error('Error deleting hackathon:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      organizer: '',
      date: '',
      team_name: '',
      result: 'participated',
      prize: '',
      project_name: '',
      mode: 'online',
      url: '',
    });
    setCertificate(null);
    setParticipationProof(null);
    setWinningCert(null);
    setPhotos(null);
    setCertPreview(null);
    setPhotosPreview(null);
    setWinningPreview(null);
    setExistingFileUrl(null);
    setExistingFileName(null);
    setExistingFileType(null);
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-6"
    >
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Hackathons</h1>
          <p className="text-gray-400">Track your hackathon participations and achievements</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/30"
          >
            <Plus className="w-4 h-4" />
            Add Hackathon
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="mb-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">
                    {editingId ? 'Edit Hackathon' : 'Add New Hackathon'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingId(null);
                      resetForm();
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Hackathon Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g., Smart India Hackathon"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Organizer</label>
                    <input
                      type="text"
                      value={formData.organizer}
                      onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g., Ministry of Education"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Team Name
                    </label>
                    <input
                      type="text"
                      value={formData.team_name}
                      onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g., Code Warriors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Result</label>
                    <select
                      value={formData.result}
                      onChange={(e) =>
                        setFormData({ ...formData, result: e.target.value as Hackathon['result'] })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                    >
                      <option value="participated" className="bg-gray-900">Participated</option>
                      <option value="finalist" className="bg-gray-900">Finalist</option>
                      <option value="runner_up" className="bg-gray-900">Runner Up</option>
                      <option value="winner" className="bg-gray-900">Winner</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Project Name</label>
                    <input
                      type="text"
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g., EduConnect"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-300">Mode</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.mode === 'online'}
                          onChange={() => setFormData({ ...formData, mode: 'online' })}
                          className="w-4 h-4 bg-gray-900 border-gray-600 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-gray-300">Online</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.mode === 'offline'}
                          onChange={() => setFormData({ ...formData, mode: 'offline' })}
                          className="w-4 h-4 bg-gray-900 border-gray-600 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-gray-300">Offline</span>
                      </label>
                    </div>
                  </div>

                  {formData.mode === 'online' && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        URL
                      </label>
                      <input
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="e.g., https://devfolio.co/..."
                        required={formData.mode === 'online'}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Prize (if any)</label>
                  <input
                    type="text"
                    value={formData.prize}
                    onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="e.g., ₹1,00,000"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                  <DragDropUpload
                    label="Certificate / Document"
                    accept=".pdf,image/*"
                    file={certificate}
                    previewUrl={certPreview}
                    onFileChange={(file) => {
                      setCertificate(file);
                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onloadend = () => setCertPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      } else {
                        setCertPreview(null);
                      }
                    }}
                    onRemove={() => {
                      setCertificate(null);
                      setCertPreview(null);
                    }}
                  />
                  <DragDropUpload
                    label="Participation Proof"
                    accept=".pdf,image/*"
                    file={participationProof}
                    onFileChange={setParticipationProof}
                    onRemove={() => setParticipationProof(null)}
                  />
                  <DragDropUpload
                    label="Winning Certificate"
                    accept=".pdf,image/*"
                    file={winningCert}
                    previewUrl={winningPreview}
                    onFileChange={(file) => {
                      setWinningCert(file);
                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onloadend = () => setWinningPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      } else {
                        setWinningPreview(null);
                      }
                    }}
                    onRemove={() => {
                      setWinningCert(null);
                      setWinningPreview(null);
                    }}
                  />
                  <DragDropUpload
                    label="Photos"
                    accept="image/*"
                    file={photos}
                    previewUrl={photosPreview}
                    onFileChange={(file) => {
                      setPhotos(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setPhotosPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                    onRemove={() => {
                      setPhotos(null);
                      setPhotosPreview(null);
                    }}
                  />
                </div>

                {verifying && (
                  <div className="space-y-1 mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-300 flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading files...
                      </span>
                      <span className="text-white font-medium">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-150" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingId(null);
                      resetForm();
                    }}
                    className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !formData.name || !formData.organizer || !formData.date || (formData.mode === 'online' && !formData.url)}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-70"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        {editingId ? 'Update' : 'Add'} Hackathon
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={item}>
        {hackathons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hackathons.map((hackathon, index) => {
              const resultInfo = resultVariants[hackathon.result || 'participated'];
              const ResultIcon = resultInfo.icon;
              return (
                <motion.div
                  key={hackathon._id || hackathon.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card gradient="purple" className="h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-purple-600/20">
                          <Trophy className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">{hackathon.name}</h4>
                          <p className="text-gray-400 text-sm">{hackathon.organizer}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(hackathon)}
                          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(hackathon._id || hackathon.id!)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {new Date(hackathon.date).toLocaleDateString()}
                      </div>
                      {hackathon.team_name && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Users className="w-4 h-4" />
                          {hackathon.team_name}
                        </div>
                      )}
                      {hackathon.project_name && (
                        <p className="text-gray-400">Project: {hackathon.project_name}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={resultInfo.variant}>
                          <ResultIcon className="w-3 h-3 mr-1" />
                          {resultInfo.label}
                        </Badge>
                        
                        {hackathon.verification_status === 'Verified' || hackathon.verification_status === 'approved' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Faculty Verified
                          </span>
                        ) : hackathon.verification_status === 'Rejected' || hackathon.verification_status === 'rejected' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        ) : hackathon.verification_status === 'Re-upload' || hackathon.verification_status === 'reupload' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Re-upload Req.
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Under Review
                          </span>
                        )}

                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${hackathon.mode === 'offline' ? 'bg-gray-600/20 text-gray-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {hackathon.mode === 'offline' ? 'OFFLINE' : 'ONLINE'}
                        </span>
                        {hackathon.mode !== 'offline' && hackathon.url && (
                          <a
                            href={hackathon.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1 transition-colors"
                          >
                            View Link
                          </a>
                        )}
                        {(hackathon.file_url || (hackathon as any).certificate_url) && (
                          <a
                            href={`${API_URL}/hackathons/${hackathon._id || hackathon.id}/document`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-3 h-3" /> View Doc
                          </a>
                        )}
                      </div>
                      {hackathon.prize && (
                        <span className="text-green-400 text-sm font-medium">{hackathon.prize}</span>
                      )}
                    </div>
                    {hackathon.staff_comment && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                        <span className="font-semibold text-amber-400">Faculty Remarks:</span> {hackathon.staff_comment}
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-white font-medium mb-2">No hackathons yet</h3>
              <p className="text-gray-400 text-sm mb-4">Add your hackathon participations</p>
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Your First Hackathon
              </button>
            </div>
          </Card>
        )}
      </motion.div>

      <motion.div variants={item}>
        <Card gradient="mixed">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-purple-600/20">
              <Trophy className="w-8 h-8 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Hackathon Stats</h3>
              <p className="text-gray-400 text-sm">
                Total Participations: {hackathons.length} | Wins:{' '}
                {hackathons.filter((h) => h.result === 'winner').length} | Podium Finishes:{' '}
                {hackathons.filter((h) => h.result === 'winner' || h.result === 'runner_up').length}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
