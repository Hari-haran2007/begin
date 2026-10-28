import { API_URL } from '../lib/api';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Plus,
  Trash2,
  X,
  ExternalLink,
  Calendar,
  Building,
  ShieldCheck,
  Loader2,
  FileText,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, AIVerificationBadge, DragDropUpload } from '../components/ui';
import { Certification } from '../types';

export function Certificates() {
  const { profile, token } = useAuth();
  
  // List of certificates
  const [certifications, setCertifications] = useState<Certification[]>([]);
  
  // Form visibility
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [verifying, setVerifying] = useState(false);

  // Form Fields
  const [certName, setCertName] = useState('');
  const [organization, setOrganization] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [mode, setMode] = useState<'online' | 'offline'>('online');
  const [credentialUrl, setCredentialUrl] = useState('');

  // Upload Files
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);



  useEffect(() => {
    if (profile?.user_id) {
      fetchCerts();
    }
  }, [profile?.user_id]);

  const fetchCerts = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/certifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCertifications(data);
      }
    } catch (err) {
      console.error('Error fetching certificates:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile && !imageFile && !credentialUrl) {
      alert('Please upload a Certificate file (PDF or Image) or provide a Credential URL.');
      return;
    }

    setLoading(true);
    setVerifying(true);
    setProgress(0);

    // Simulated upload & verification progress
    for (let p = 0; p <= 100; p += 10) {
      setProgress(p);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    try {
      let finalFileUrl = imagePreview || null;
      let finalFileName = imageFile ? imageFile.name : null;
      let finalFileType: 'image' | 'pdf' | null = imageFile ? 'image' : null;

      if (!finalFileUrl && pdfFile) {
        finalFileUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(pdfFile);
        });
        finalFileName = pdfFile.name;
        finalFileType = 'pdf';
      }

      const res = await fetch(`${API_URL}/certifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: certName,
          issuer: organization,
          issue_date: issueDate,
          mode: mode,
          credential_url: mode === 'online' ? (credentialUrl || null) : null,
          file_url: finalFileUrl,
          file_name: finalFileName,
          file_type: finalFileType
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Store file details locally for immediate preview
        localStorage.setItem(`cert_verification_${data._id || data.id}`, JSON.stringify({
          pdfName: pdfFile ? pdfFile.name : (imageFile ? imageFile.name : 'Certificate Document'),
          imagePreview: finalFileUrl,
        }));
        await fetchCerts();
      } else {
        alert('Failed to save certificate.');
      }
    } catch (error) {
      console.error('Error adding certificate:', error);
      alert('Failed to save certificate.');
    }

    setLoading(false);
    setVerifying(false);
    setIsAdding(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/certifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        localStorage.removeItem(`cert_verification_${id}`);
        await fetchCerts();
      }
    } catch (err) {
      console.error('Error deleting certification:', err);
    }
  };

  const resetForm = () => {
    setCertName('');
    setOrganization('');
    setIssueDate('');
    setMode('online');
    setCredentialUrl('');
    setPdfFile(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="w-7 h-7 text-purple-400" />
            Certificates & Verification
          </h1>
          <p className="text-gray-400">Upload and verify your professional certifications with official credentials.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/20"
          >
            <Plus className="w-4 h-4" /> Verify New Certificate
          </button>
        )}
      </motion.div>

      {/* Verification guidelines if adding */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="mb-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                    New Certificate Verification
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      resetForm();
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Certificate Name</label>
                    <input
                      type="text"
                      value={certName}
                      onChange={(e) => setCertName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g., Google UX Design Certificate"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Issuing Organization</label>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g., Coursera / Google"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-400" /> Issue Date
                    </label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-300">Mode</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={mode === 'online'}
                          onChange={() => setMode('online')}
                          className="w-4 h-4 bg-gray-900 border-gray-600 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-gray-300">Online</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={mode === 'offline'}
                          onChange={() => setMode('offline')}
                          className="w-4 h-4 bg-gray-900 border-gray-600 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-gray-300">Offline</span>
                      </label>
                    </div>
                  </div>

                  {mode === 'online' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-blue-400" /> URL
                      </label>
                      <input
                        type="url"
                        value={credentialUrl}
                        onChange={(e) => setCredentialUrl(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="e.g., https://coursera.org/verify/..."
                        required={mode === 'online'}
                      />
                    </div>
                  )}
                </div>

                {/* Document Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <DragDropUpload
                    label="Certificate Document (PDF)"
                    accept=".pdf"
                    file={pdfFile}
                    onFileChange={setPdfFile}
                    onRemove={() => setPdfFile(null)}
                  />
                  <DragDropUpload
                    label="Certificate Image / Preview"
                    accept="image/*"
                    file={imageFile}
                    previewUrl={imagePreview}
                    onFileChange={(file) => {
                      setImageFile(file);
                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onloadend = () => setImagePreview(reader.result as string);
                        reader.readAsDataURL(file);
                      } else {
                        setImagePreview(null);
                      }
                    }}
                    onRemove={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  />
                </div>

                {/* Progress bar */}
                {verifying && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-300 flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Analyzing certificate authenticity...
                      </span>
                      <span className="text-white font-medium">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-150" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      resetForm();
                    }}
                    className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !certName || !organization || !issueDate || (mode === 'online' && !credentialUrl) || (!pdfFile && !imageFile && !credentialUrl)}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Verify & Add
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Certificate Grid */}
      <motion.div variants={item}>
        {certifications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certifications.map((cert, index) => {
              const statusLower = (cert.verification_status || '').toLowerCase();
              const isVerified = statusLower === 'approved' || statusLower === 'verified';
              const isRejected = statusLower === 'rejected';
              const isReupload = statusLower === 'reupload' || statusLower === 're-upload';
              
              // Read MongoDB file_url or cached previews
              const certId = cert._id || cert.id!;
              let imageSrc = cert.file_url || null;
              if (!imageSrc) {
                const cached = localStorage.getItem(`cert_verification_${certId}`);
                if (cached) {
                  try {
                    imageSrc = JSON.parse(cached).imagePreview;
                  } catch {}
                }
              }

              return (
                <motion.div
                  key={certId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="h-full"
                >
                  <Card gradient={isVerified ? 'green' : isRejected ? 'purple' : isReupload ? 'mixed' : 'blue'} className="h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-3 rounded-xl ${isVerified ? 'bg-green-600/20' : isRejected ? 'bg-red-600/20' : isReupload ? 'bg-orange-600/20' : 'bg-purple-600/20'}`}>
                          <Award className={`w-6 h-6 ${isVerified ? 'text-green-400' : isRejected ? 'text-red-400' : isReupload ? 'text-orange-400' : 'text-purple-400'}`} />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(certId)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Verification Badge */}
                      <div className="mb-2">
                        {isVerified ? (
                          <AIVerificationBadge status="Verified" />
                        ) : isRejected ? (
                          <span className="text-xs font-bold px-2 py-1 bg-red-500/20 text-red-400 rounded">Rejected</span>
                        ) : isReupload ? (
                          <span className="text-xs font-bold px-2 py-1 bg-orange-500/20 text-orange-400 rounded">Re-upload Required</span>
                        ) : (
                          <AIVerificationBadge status="Pending" />
                        )}
                      </div>

                      <h4 className="text-white font-semibold mb-1 text-base">{cert.name}</h4>
                      <p className="text-gray-400 text-sm flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
                        {cert.issuer}
                      </p>
                      
                      {cert.staff_comment && (
                        <div className={`mt-3 p-2.5 rounded-lg border text-xs ${
                          isRejected ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                          isReupload ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
                          'bg-black/40 border-white/5 text-gray-300'
                        }`}>
                          <p className="font-semibold mb-0.5">
                            {isRejected ? 'Rejection Reason from Faculty:' :
                             isReupload ? 'Faculty Remarks (Re-upload Requested):' :
                             'Faculty Remarks:'}
                          </p>
                          <p>{cert.staff_comment}</p>
                        </div>
                      )}

                      {/* Render preview image or pdf badge if available */}
                      {imageSrc && (
                        <div className="mt-3 relative w-full h-24 rounded-lg overflow-hidden border border-white/5 bg-black/10 flex items-center justify-center">
                          {imageSrc.includes('application/pdf') || cert.file_type === 'pdf' || (cert.file_name && cert.file_name.toLowerCase().endsWith('.pdf')) ? (
                            <div className="flex items-center gap-2 text-red-400 text-xs font-medium p-2">
                              <FileText className="w-6 h-6 shrink-0" />
                              <span className="truncate max-w-[180px]">{cert.file_name || 'Certificate (PDF)'}</span>
                            </div>
                          ) : (
                            <img src={imageSrc} alt="Preview" className="w-full h-full object-cover opacity-75" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        {new Date(cert.issue_date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${cert.mode === 'offline' ? 'bg-gray-600/20 text-gray-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {cert.mode === 'offline' ? 'OFFLINE' : 'ONLINE'}
                        </span>
                        {cert.mode !== 'offline' && cert.credential_url && (
                          <a
                            href={cert.credential_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> View Credential
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <Award className="w-16 h-16 mx-auto mb-4 text-gray-600 animate-pulse" />
              <h3 className="text-white font-medium mb-2">No verified certificates yet</h3>
              <p className="text-gray-400 text-sm mb-4">Submit your certificate image and PDF to verify and add it to your profile.</p>
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Your First Certificate
              </button>
            </div>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}
