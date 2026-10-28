import { API_URL } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Presentation,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Calendar,
  Clock,
  ExternalLink,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, useToast, AIVerificationBadge, DragDropUpload } from '../components/ui';
import { Workshop as WorkshopType } from '../types';

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function Workshops() {
  const { profile, token } = useAuth();
  const showToast = useToast();
  const [workshops, setWorkshops] = useState<WorkshopType[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    organizer: '',
    date: '',
    duration_hours: '',
    skills_gained: [] as string[],
    certificate_url: '',
    skillInput: '',
    mode: 'online' as 'online' | 'offline',
  });

  const [certificate, setCertificate] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File | null>(null);
  const [certPreview, setCertPreview] = useState<string | null>(null);
  const [photosPreview, setPhotosPreview] = useState<string | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [existingFileType, setExistingFileType] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (profile?.user_id) fetchWorkshops();
  }, [profile?.user_id]);

  const fetchWorkshops = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/workshops`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkshops(data);
      }
    } catch (err) {
      console.error('Error fetching workshops:', err);
    }
  };

  const handleAddSkill = () => {
    if (
      formData.skillInput.trim() &&
      !formData.skills_gained.includes(formData.skillInput.trim())
    ) {
      setFormData({
        ...formData,
        skills_gained: [...formData.skills_gained, formData.skillInput.trim()],
        skillInput: '',
      });
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills_gained: formData.skills_gained.filter((s) => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const primaryFile = certificate || photos;
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

    const workshopData = {
      user_id: profile?.user_id,
      name: formData.name,
      organizer: formData.organizer,
      date: formData.date,
      duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : null,
      skills_gained: formData.skills_gained,
      mode: formData.mode,
      certificate_url: formData.mode === 'online' ? (formData.certificate_url || null) : null,
      file_url: finalFileUrl,
      file_name: finalFileName,
      file_type: finalFileType,
      url: formData.certificate_url || null,
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
        ? `${API_URL}/workshops/${editingId}`
        : `${API_URL}/workshops`;
      
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(workshopData)
      });

      if (res.ok) {
        showToast(editingId ? 'Workshop updated successfully' : 'Workshop added successfully', 'success');
        await fetchWorkshops();
        setLoading(false);
        setIsAdding(false);
        setEditingId(null);
        resetForm();
      } else {
        showToast(editingId ? 'Failed to update workshop' : 'Failed to add workshop', 'error');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error saving workshop:', err);
      showToast('Error saving workshop', 'error');
      setLoading(false);
    }

    // state updates moved inside try-catch block
  };

  const handleEdit = (workshop: WorkshopType) => {
    setFormData({
      name: workshop.name,
      organizer: workshop.organizer,
      date: workshop.date,
      duration_hours: workshop.duration_hours?.toString() || '',
      skills_gained: workshop.skills_gained || [],
      certificate_url: workshop.certificate_url || '',
      skillInput: '',
      mode: workshop.mode || 'online',
    });
    setEditingId(workshop._id || workshop.id || null);
    setExistingFileUrl(workshop.file_url || (workshop as any).url || null);
    setExistingFileName(workshop.file_name || null);
    setExistingFileType(workshop.file_type || null);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/workshops/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchWorkshops();
        showToast('Workshop deleted', 'success');
      }
    } catch (err) {
      console.error('Error deleting workshop:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      organizer: '',
      date: '',
      duration_hours: '',
      skills_gained: [],
      certificate_url: '',
      skillInput: '',
      mode: 'online',
    });
    setCertificate(null);
    setPhotos(null);
    setCertPreview(null);
    setPhotosPreview(null);
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
          <h1 className="text-2xl font-bold text-white">Workshops</h1>
          <p className="text-gray-400">Track workshops and seminars attended</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/30"
          >
            <Plus className="w-4 h-4" />
            Add Workshop
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
                    {editingId ? 'Edit Workshop' : 'Add New Workshop'}
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
                    <label className="text-sm font-medium text-gray-300">Workshop Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g., React Advanced Patterns"
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
                      placeholder="e.g., LinkedIn Learning"
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
                      <Clock className="w-4 h-4" /> Duration (hours)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.duration_hours}
                      onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g., 4"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Skills Gained</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.skillInput}
                      onChange={(e) => setFormData({ ...formData, skillInput: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="Add skill..."
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="px-4 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.skills_gained.map((skill) => (
                      <span
                        key={skill}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-600/20 border border-green-500/30 text-green-300 text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-blue-400" /> URL
                    </label>
                    <input
                      type="url"
                      value={formData.certificate_url}
                      onChange={(e) => setFormData({ ...formData, certificate_url: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="https://..."
                      required={formData.mode === 'online'}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                  <DragDropUpload
                    label="Workshop Certificate"
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
                    label="Workshop Photos"
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
                    disabled={loading || !formData.name || !formData.organizer || !formData.date || (formData.mode === 'online' && !formData.certificate_url)}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-70"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        {editingId ? 'Update' : 'Add'} Workshop
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
        {workshops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workshops.map((workshop, index) => (
              <motion.div
                key={workshop._id || workshop.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card gradient="blue" className="h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 rounded-xl bg-blue-600/20">
                      <Presentation className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(workshop)}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(workshop._id || workshop.id!)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-white font-semibold mb-1">{workshop.name}</h4>
                  <p className="text-gray-400 text-sm mb-2">{workshop.organizer}</p>
                  <div className="mb-3 flex items-center gap-2 flex-wrap">
                    {workshop.verification_status === 'Verified' || workshop.verification_status === 'approved' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Faculty Verified
                      </span>
                    ) : workshop.verification_status === 'Rejected' || workshop.verification_status === 'rejected' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Rejected
                      </span>
                    ) : workshop.verification_status === 'Re-upload' || workshop.verification_status === 'reupload' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Re-upload Req.
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Under Review
                      </span>
                    )}

                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${workshop.mode === 'offline' ? 'bg-gray-600/20 text-gray-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {workshop.mode === 'offline' ? 'OFFLINE' : 'ONLINE'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {new Date(workshop.date).toLocaleDateString()}
                    </div>
                    {workshop.duration_hours && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-4 h-4" />
                        {workshop.duration_hours} hours
                      </div>
                    )}
                  </div>
                  {workshop.skills_gained && workshop.skills_gained.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {workshop.skills_gained.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md bg-white/5 text-gray-400 text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {workshop.skills_gained.length > 3 && (
                        <span className="px-2 py-0.5 text-gray-500 text-xs">
                          +{workshop.skills_gained.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                  {workshop.staff_comment && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      <span className="font-semibold text-amber-400">Faculty Remarks:</span> {workshop.staff_comment}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-3 flex-wrap">
                    {workshop.mode !== 'offline' && workshop.certificate_url && (
                      <a
                        href={workshop.certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        External Link
                      </a>
                    )}
                    {(workshop.file_url || (workshop as any).url) && (
                      <a
                        href={`${API_URL}/workshops/${workshop._id || workshop.id}/document`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View Document
                      </a>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <Presentation className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-white font-medium mb-2">No workshops yet</h3>
              <p className="text-gray-400 text-sm mb-4">Add workshops and seminars you've attended</p>
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Your First Workshop
              </button>
            </div>
          </Card>
        )}
      </motion.div>

      <motion.div variants={item}>
        <Card gradient="green">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-green-600/20">
              <BookOpen className="w-8 h-8 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Learning Stats</h3>
              <p className="text-gray-400 text-sm">
                Total Workshops: {workshops.length} | Total Learning Hours:{' '}
                {workshops.reduce((acc, w) => acc + (w.duration_hours || 0), 0).toFixed(1)}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
