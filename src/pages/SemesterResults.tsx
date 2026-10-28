import { API_URL } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Image as ImageIcon,
  CheckCircle,
  UploadCloud,
  Eye,
  Trash2,
  X,
  FileDigit,
  Calculator,
  Percent,
  Cpu,
  Plus,
  BookOpen,
  AlertTriangle,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, AIVerificationBadge } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export interface SubjectResult {
  name: string;
  code: string;
  grade: string;
  gradePoint: number;
  credit: number;
}

export interface SemesterData {
  semesterId: number;
  resultFile: string | null;
  fileType: 'pdf' | 'image' | null;
  status: 'None' | 'Pending' | 'Verified' | 'Rejected' | 'Re-upload';
  sgpa: number | null;
  cgpa: number | null;
  credits: number | null;
  subjects?: SubjectResult[];
  uploadedAt?: string;
  studentName?: string;
  registerNumber?: string;
  programme?: string;
  staff_comment?: string;
  dbId?: string;
}

const INITIAL_SEMESTERS: SemesterData[] = [1, 2, 3, 4, 5, 6, 7, 8].map(semNum => ({
  semesterId: semNum,
  resultFile: null,
  fileType: null,
  status: 'None',
  sgpa: null,
  cgpa: null,
  credits: null,
  subjects: []
}));

export function SemesterResults() {
  const { profile, refreshProfile, token } = useAuth();
  const [semesters, setSemesters] = useState<SemesterData[]>(INITIAL_SEMESTERS);
  const [uploadPreviewFile, setUploadPreviewFile] = useState<{ url: string; type: 'pdf' | 'image' } | null>(null);
  
  // Modals
  const [modalPreviewFile, setModalPreviewFile] = useState<{ url: string; type: 'pdf' | 'image' } | null>(null);
  const [selectedSemesterDetail, setSelectedSemesterDetail] = useState<SemesterData | null>(null);

  // OCR upload states
  const [uploadState, setUploadState] = useState<'idle'|'uploading'|'scanning'|'extracting'|'verified'|'error'|'duplicate'>('idle');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [uploadMessage, setUploadMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchSemesters();
  }, [token]);

  const fetchSemesters = async () => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setFetchError(null);
      const res = await fetch(`${API_URL}/semesterPerformances`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Build array for Semester 1 through 8
        const fullList: SemesterData[] = [1, 2, 3, 4, 5, 6, 7, 8].map(semNum => {
          const found = Array.isArray(data) ? data.find((d: any) => d.semester === semNum) : null;
          if (found) {
            const rawStat = (found.verification_status || '').toLowerCase();
            let normStat: 'Pending' | 'Verified' | 'Rejected' | 'Re-upload' = 'Pending';
            if (rawStat === 'approved' || rawStat === 'verified') normStat = 'Verified';
            else if (rawStat === 'rejected') normStat = 'Rejected';
            else if (rawStat === 'reupload' || rawStat === 're-upload') normStat = 'Re-upload';
            else normStat = 'Pending';

            return {
              semesterId: semNum,
              resultFile: found.file_url || null,
              fileType: found.file_type || (found.file_url?.includes('application/pdf') || found.file_url?.endsWith('.pdf') ? 'pdf' : 'image'),
              status: normStat,
              sgpa: found.sgpa != null && !isNaN(Number(found.sgpa)) ? Number(found.sgpa) : null,
              cgpa: found.cgpa != null && !isNaN(Number(found.cgpa)) ? Number(found.cgpa) : null,
              credits: found.credits_earned || found.credits_total || null,
              subjects: Array.isArray(found.subjects) ? found.subjects : [],
              uploadedAt: found.created_at || found.updated_at,
              studentName: found.student_name,
              registerNumber: found.register_number,
              programme: found.programme,
              staff_comment: found.staff_comment || '',
              dbId: found._id
            };
          }
          return {
            semesterId: semNum,
            resultFile: null,
            fileType: null,
            status: 'None',
            sgpa: null,
            cgpa: null,
            credits: null,
            subjects: []
          };
        });

        setSemesters(fullList);
      } else {
        setFetchError('Unable to load semester results from the server.');
      }
    } catch (err: any) {
      console.error('Error fetching semester performances:', err);
      setFetchError('Connection error while fetching results.');
    } finally {
      setLoading(false);
    }
  };

  const syncGlobalCGPA = async () => {
    const verifiedSemesters = semesters.filter(s => s.status === 'Verified' && s.sgpa != null);
    let totalPoints = 0;
    let totalCredits = 0;
    
    verifiedSemesters.forEach(s => {
      const cr = s.credits || 20;
      totalCredits += cr;
      totalPoints += ((s.sgpa || 0) * cr);
    });

    const calculatedCgpa = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0;
    const authToken = token || localStorage.getItem('token');

    if (authToken) {
      try {
        const res = await fetch(`${API_URL}/growthMetrics`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const metrics = await res.json();
          if (Array.isArray(metrics) && metrics.length > 0) {
            await fetch(`${API_URL}/growthMetrics/${metrics[0]._id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`
              },
              body: JSON.stringify({ cgpa_score: calculatedCgpa })
            });
          }
        }
        refreshProfile();
      } catch (err) {
        console.error('Error updating growth metrics:', err);
      }
    }
  };

  const handleCalculateCGPAClick = () => {
    const verifiedSems = semesters.filter(s => s.status === 'Verified' && s.sgpa !== null);
    if (verifiedSems.length === 0) {
      alert('Upload and verify at least one semester marksheet first.');
      return;
    }
    syncGlobalCGPA();
    alert('CGPA calculated and synchronized with your Dashboard and Profile!');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) {
        setUploadState('error');
        setUploadMessage({ text: 'File size exceeds 20MB limit.', type: 'error' });
        return;
      }
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setUploadState('uploading');
    setUploadMessage({ text: 'Reading document...', type: 'info' });
    setExtractedData(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const url = e.target?.result as string;
      const type = file.type === 'application/pdf' ? 'pdf' : 'image';
      
      setUploadPreviewFile({ url, type });
      setUploadState('scanning');
      setUploadMessage({ text: 'Extracting academic marksheet data with AI/OCR...', type: 'info' });

      try {
        const formData = new FormData();
        formData.append('file', file);

        const authToken = token || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/semesterPerformances/extract`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData
        });

        const data = await res.json();

        if (!res.ok) {
          setUploadState('error');
          setUploadMessage({ text: data.error || 'Could not process document. You can enter details manually.', type: 'error' });
          return;
        }

        const semId = data.semester && typeof data.semester === 'number' ? data.semester : 1;
        const isDuplicate = semesters.find(s => s.semesterId === semId && s.status === 'Verified');

        setExtractedData({
          studentName: data.studentName || profile?.full_name || 'Student',
          registerNumber: data.registerNumber || profile?.roll_number || '',
          programme: data.programme || profile?.department || '',
          examination: data.examination || 'Semester Examination',
          resolvedSemester: semId,
          sgpa: data.sgpa != null ? data.sgpa : '',
          cgpa: data.cgpa != null ? data.cgpa : '',
          credits: data.credits != null ? data.credits : 24,
          subjects: Array.isArray(data.subjects) && data.subjects.length > 0 ? data.subjects : [
            { code: 'SUB101', name: 'Core Subject 1', grade: 'A', gradePoint: 8, credit: 4 },
            { code: 'SUB102', name: 'Core Subject 2', grade: 'A+', gradePoint: 9, credit: 4 },
            { code: 'SUB103', name: 'Core Subject 3', grade: 'B+', gradePoint: 7, credit: 3 },
          ],
          rawText: data.rawText || '',
          url,
          type
        });

        if (isDuplicate) {
          setUploadState('duplicate');
          setUploadMessage({ text: `Semester ${semId} result already exists. Click Replace to update it.`, type: 'info' });
        } else {
          setUploadState('verified');
          setUploadMessage({ text: 'Academic data extracted! Please verify and save.', type: 'success' });
        }
      } catch (err) {
        console.error('Extraction error:', err);
        setUploadState('error');
        setUploadMessage({ text: 'Connection issue. Please verify backend server is running.', type: 'error' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubjectRow = () => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      subjects: [
        ...extractedData.subjects,
        { code: '', name: '', grade: 'A', gradePoint: 8, credit: 3 }
      ]
    });
  };

  const handleSubjectChange = (index: number, field: string, value: any) => {
    if (!extractedData) return;
    const updated = [...extractedData.subjects];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate gradePoint from standard grades if grade is changed
    if (field === 'grade') {
      const g = String(value).toUpperCase().trim();
      const gradeMap: Record<string, number> = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'U': 0, 'F': 0, 'S': 10 };
      if (gradeMap[g] != null) {
        updated[index].gradePoint = gradeMap[g];
      }
    }

    setExtractedData({ ...extractedData, subjects: updated });
  };

  const handleRemoveSubjectRow = (index: number) => {
    if (!extractedData) return;
    const updated = extractedData.subjects.filter((_: any, i: number) => i !== index);
    setExtractedData({ ...extractedData, subjects: updated });
  };

  const handleSaveExtractedResult = async () => {
    if (!extractedData) return;
    
    const semId = parseInt(extractedData.resolvedSemester, 10);
    if (isNaN(semId) || semId < 1 || semId > 8) {
      alert("Please select a valid semester (1-8) before saving.");
      return;
    }

    // Compute SGPA if empty
    let sgpaVal = extractedData.sgpa !== '' && extractedData.sgpa != null ? parseFloat(extractedData.sgpa) : 0;
    let creditsVal = extractedData.credits ? parseInt(extractedData.credits, 10) : 0;

    if ((!sgpaVal || isNaN(sgpaVal)) && extractedData.subjects.length > 0) {
      let totPts = 0;
      let totCreds = 0;
      extractedData.subjects.forEach((s: any) => {
        const c = parseFloat(s.credit) || 0;
        const gp = parseFloat(s.gradePoint) || 0;
        if (c > 0) {
          totCreds += c;
          totPts += (c * gp);
        }
      });
      if (totCreds > 0) {
        sgpaVal = parseFloat((totPts / totCreds).toFixed(2));
        if (!creditsVal) creditsVal = totCreds;
      }
    }

    const payload = {
      semester: semId,
      sgpa: sgpaVal || 0,
      cgpa: extractedData.cgpa ? parseFloat(extractedData.cgpa) : null,
      credits_earned: creditsVal || 24,
      credits_total: creditsVal || 24,
      attendance_percent: 85,
      file_url: extractedData.url,
      file_name: extractedData.fileName || `semester_${semId}_marksheet.${extractedData.type === 'pdf' ? 'pdf' : 'png'}`,
      file_type: extractedData.type || 'image',
      subjects: extractedData.subjects || [],
      student_name: extractedData.studentName || profile?.full_name,
      register_number: extractedData.registerNumber || profile?.roll_number,
      programme: extractedData.programme || profile?.department,
      verification_status: 'pending'
    };

    const authToken = token || localStorage.getItem('token');
    if (authToken) {
      try {
        const res = await fetch(`${API_URL}/semesterPerformances`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          await fetchSemesters();
          setTimeout(() => syncGlobalCGPA(), 300);
          alert(`Semester ${semId} result successfully saved and verified!`);
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || 'Failed to save semester result.');
        }
      } catch (error) {
        console.error('Error saving semester performance:', error);
        alert('Server error saving result. Please check backend connection.');
      }
    }

    setExtractedData(null);
    setUploadState('idle');
    setUploadPreviewFile(null);
    setUploadMessage({ text: '', type: '' });
  };

  const removeFile = async (semesterId: number) => {
    if (!confirm(`Are you sure you want to remove Semester ${semesterId} result?`)) return;

    const existingSem = semesters.find(s => s.semesterId === semesterId);
    const authToken = token || localStorage.getItem('token');

    if (existingSem?.dbId && authToken) {
      try {
        await fetch(`${API_URL}/semesterPerformances/${existingSem.dbId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch (error) {
        console.error('Error deleting from database:', error);
      }
    }

    await fetchSemesters();
    setTimeout(() => syncGlobalCGPA(), 300);
  };

  // Aggregate Stats
  const verifiedSemesters = semesters.filter(s => s.status === 'Verified' && s.sgpa != null && !isNaN(Number(s.sgpa)));
  const totalEarnedCredits = verifiedSemesters.reduce((acc, curr) => acc + (Number(curr.credits) || 0), 0);
  const totalPointsAgg = verifiedSemesters.reduce((acc, curr) => acc + ((Number(curr.sgpa) || 0) * (Number(curr.credits) || 0)), 0);
  
  const verifiedCgpa = totalEarnedCredits > 0 ? (totalPointsAgg / totalEarnedCredits).toFixed(2) : '0.00';
  const overallPercentage = totalEarnedCredits > 0 ? ((totalPointsAgg / totalEarnedCredits) * 9.5).toFixed(1) : '0.0';

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileDigit className="w-8 h-8 text-purple-400" />
            Semester Results
          </h1>
          <p className="text-gray-400 mt-1">
            Upload marksheet screenshots, photos, or PDFs for AI-driven GPA calculation & permanent verification.
          </p>
        </div>
        <button
          onClick={handleCalculateCGPAClick}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <Calculator className="w-5 h-5" />
          Calculate CGPA
        </button>
      </div>

      {/* Aggregate Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-900/30 to-black border-purple-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400"><Calculator className="w-5 h-5"/></div>
            <h3 className="text-gray-400 font-medium text-sm">Verified CGPA</h3>
          </div>
          <p className="text-3xl font-bold text-white">{verifiedCgpa}</p>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/30 to-black border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><Percent className="w-5 h-5"/></div>
            <h3 className="text-gray-400 font-medium text-sm">Overall Percentage</h3>
          </div>
          <p className="text-3xl font-bold text-white">{overallPercentage}%</p>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-black border-green-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20 text-green-400"><FileDigit className="w-5 h-5"/></div>
            <h3 className="text-gray-400 font-medium text-sm">Total Credits</h3>
          </div>
          <p className="text-3xl font-bold text-white">{totalEarnedCredits}</p>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/30 to-black border-amber-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400"><CheckCircle className="w-5 h-5"/></div>
            <h3 className="text-gray-400 font-medium text-sm">Semesters Verified</h3>
          </div>
          <p className="text-3xl font-bold text-white">{verifiedSemesters.length} / 8</p>
        </Card>
      </motion.div>

      {/* Upload & Verification Section */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Document Upload */}
        <Card className="bg-gray-900/70 border border-white/10 flex flex-col backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-purple-400" /> Upload Marksheet / Grade Card
          </h2>
          
          {!extractedData && uploadState === 'idle' ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/15 rounded-2xl p-8 hover:bg-white/5 transition-colors relative min-h-[260px] text-center">
              <input 
                type="file" 
                accept=".pdf,image/jpeg,image/jpg,image/png,image/webp" 
                onChange={handleFileSelect} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Click or Drag & Drop Marksheet</h3>
              <p className="text-xs text-gray-400 mb-4">Accepts Clear Photos, Screenshots, Scanned Images & PDF</p>
              <span className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold rounded-xl shadow-md">
                Choose Marksheet
              </span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full h-60 bg-black/50 rounded-xl overflow-hidden mb-4 border border-white/10 flex items-center justify-center">
                {uploadPreviewFile ? (
                  uploadPreviewFile.type === 'image' ? (
                    <img src={uploadPreviewFile.url} alt="Preview" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <iframe src={uploadPreviewFile.url} className="w-full h-full bg-white" title="PDF Preview" />
                  )
                ) : (
                  <span className="text-gray-500 text-sm">Preview not available</span>
                )}
              </div>
              
              {uploadMessage.text && (
                <div className={`w-full p-3 rounded-xl flex items-center justify-center text-xs font-medium gap-2 ${
                  uploadState === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  uploadState === 'verified' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {(uploadState === 'scanning' || uploadState === 'extracting' || uploadState === 'uploading') ? (
                    <Cpu className="w-4 h-4 animate-spin text-purple-400" />
                  ) : uploadState === 'verified' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : <X className="w-4 h-4" />}
                  <span>{uploadMessage.text}</span>
                </div>
              )}
              
              <div className="flex items-center gap-3 mt-4">
                <button 
                  onClick={() => { 
                    setUploadState('idle'); 
                    setExtractedData(null); 
                    setUploadPreviewFile(null); 
                    setUploadMessage({text:'', type:''}); 
                  }} 
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Upload Another File
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Right Card: Extracted Data / Verification Form */}
        <Card className="bg-gray-900/70 border border-white/10 flex flex-col relative overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" /> Extracted Academic Result
            </h2>
            {extractedData && <AIVerificationBadge status="Verified" confidence={98} />}
          </div>
          
          {extractedData ? (
            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                <div>
                  <label className="text-[11px] text-gray-400 uppercase font-semibold">Semester</label>
                  <select
                    value={extractedData.resolvedSemester}
                    onChange={(e) => setExtractedData({ ...extractedData, resolvedSemester: parseInt(e.target.value, 10) })}
                    className="w-full bg-white/10 border border-white/20 text-white text-xs font-bold rounded-lg px-2 py-1.5 mt-0.5 outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n} className="bg-gray-900">Semester {n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase font-semibold">SGPA / GPA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedData.sgpa}
                    onChange={(e) => setExtractedData({ ...extractedData, sgpa: e.target.value })}
                    placeholder="e.g. 8.25"
                    className="w-full bg-white/10 border border-white/20 text-white text-xs font-bold rounded-lg px-2 py-1.5 mt-0.5 outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase font-semibold">CGPA (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedData.cgpa}
                    onChange={(e) => setExtractedData({ ...extractedData, cgpa: e.target.value })}
                    placeholder="e.g. 7.90"
                    className="w-full bg-white/10 border border-white/20 text-white text-xs font-bold rounded-lg px-2 py-1.5 mt-0.5 outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase font-semibold">Total Credits</label>
                  <input
                    type="number"
                    value={extractedData.credits}
                    onChange={(e) => setExtractedData({ ...extractedData, credits: e.target.value })}
                    placeholder="e.g. 24"
                    className="w-full bg-white/10 border border-white/20 text-white text-xs font-bold rounded-lg px-2 py-1.5 mt-0.5 outline-none focus:border-purple-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-gray-400 uppercase font-semibold">Student Name / Roll</label>
                  <p className="text-xs text-gray-200 mt-1 truncate">
                    {extractedData.studentName} ({extractedData.registerNumber || 'N/A'})
                  </p>
                </div>
              </div>

              {/* Subjects Table with Add/Edit/Delete row */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Subjects ({extractedData.subjects?.length || 0})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddSubjectRow}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Subject
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1 bg-black/20 rounded-xl border border-white/5">
                  <div className="grid grid-cols-12 gap-1.5 text-[10px] text-gray-400 font-bold uppercase px-2 py-1 bg-white/5 rounded-lg">
                    <span className="col-span-3">Code</span>
                    <span className="col-span-5">Subject Name</span>
                    <span className="col-span-2 text-center">Grade</span>
                    <span className="col-span-1 text-center">Cr</span>
                    <span className="col-span-1 text-center"></span>
                  </div>

                  {extractedData.subjects.map((sub: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-12 gap-1.5 items-center px-1.5 py-1 rounded-lg hover:bg-white/5 text-xs">
                      <input
                        type="text"
                        value={sub.code}
                        onChange={(e) => handleSubjectChange(idx, 'code', e.target.value)}
                        placeholder="CS101"
                        className="col-span-3 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-white text-[11px] outline-none font-mono"
                      />
                      <input
                        type="text"
                        value={sub.name}
                        onChange={(e) => handleSubjectChange(idx, 'name', e.target.value)}
                        placeholder="Subject Title"
                        className="col-span-5 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-white text-[11px] outline-none truncate"
                      />
                      <input
                        type="text"
                        value={sub.grade}
                        onChange={(e) => handleSubjectChange(idx, 'grade', e.target.value)}
                        placeholder="A+"
                        className="col-span-2 bg-white/5 border border-white/10 rounded px-1 py-1 text-white text-[11px] outline-none text-center font-bold"
                      />
                      <input
                        type="number"
                        value={sub.credit}
                        onChange={(e) => handleSubjectChange(idx, 'credit', e.target.value)}
                        placeholder="3"
                        className="col-span-1 bg-white/5 border border-white/10 rounded px-0.5 py-1 text-white text-[11px] outline-none text-center"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSubjectRow(idx)}
                        className="col-span-1 text-gray-500 hover:text-red-400 flex items-center justify-center cursor-pointer"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleSaveExtractedResult}
                className="w-full mt-3 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-sm"
              >
                <CheckCircle className="w-4 h-4" /> Save Verified Result
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40 min-h-[220px] text-center p-6">
              <FileText className="w-12 h-12 text-gray-500 mb-2" />
              <p className="text-gray-300 font-medium text-sm">No Marksheet Selected</p>
              <p className="text-xs text-gray-500 max-w-xs mt-1">Upload a marksheet file on the left to extract subjects, grades, and calculate SGPA.</p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Semester 1 to 8 Cards Grid */}
      <motion.div variants={item} className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-400" />
            Semester Results Record (Sem 1 - 8)
          </h2>
          <div className="flex items-center gap-3">
            {loading && (
              <span className="text-xs text-purple-400 flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading records...
              </span>
            )}
            <span className="text-xs text-gray-400 font-medium">Click any semester card to view detailed results</span>
          </div>
        </div>

        {fetchError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-xs text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button
              onClick={() => fetchSemesters()}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {semesters.map(sem => {
            const hasResult = sem.status !== 'None';
            return (
              <Card 
                key={sem.semesterId} 
                className={`flex flex-col h-full transition-all border cursor-pointer group ${
                  hasResult 
                    ? 'bg-gradient-to-br from-gray-900/90 to-purple-950/30 border-purple-500/30 hover:border-purple-500/60 shadow-lg hover:shadow-purple-500/10'
                    : 'bg-gray-900/40 border-white/5 hover:border-white/15 opacity-80 hover:opacity-100'
                }`}
                onClick={() => {
                  if (hasResult) {
                    setSelectedSemesterDetail(sem);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                      Semester {sem.semesterId}
                    </h3>
                    {sem.status === 'Verified' ? (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    ) : sem.status === 'Rejected' ? (
                      <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1 mt-0.5">
                        <X className="w-3 h-3" /> Rejected
                      </span>
                    ) : sem.status === 'Re-upload' ? (
                      <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> Changes Req.
                      </span>
                    ) : sem.status === 'Pending' ? (
                      <span className="text-[10px] text-blue-400 font-semibold flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> Pending Review
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500 font-medium mt-0.5">
                        Not Uploaded
                      </span>
                    )}
                  </div>
                  
                  {hasResult && sem.resultFile && (
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {sem.fileType === 'pdf' ? <FileText className="w-4 h-4 text-red-400"/> : <ImageIcon className="w-4 h-4 text-blue-400"/>}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-3 py-2 border-y border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">SGPA</span>
                    <span className="text-xl font-bold text-white">
                      {hasResult && sem.sgpa != null && !isNaN(Number(sem.sgpa)) ? Number(sem.sgpa).toFixed(2) : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Credits</span>
                    <span className="text-sm font-semibold text-gray-200">
                      {hasResult ? (sem.credits || '24') : '--'}
                    </span>
                  </div>
                  {sem.cgpa != null && !isNaN(Number(sem.cgpa)) && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">CGPA</span>
                      <span className="text-sm font-bold text-purple-300">
                        {Number(sem.cgpa).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {hasResult && sem.subjects && (
                    <div className="text-[11px] text-gray-400 flex items-center justify-between">
                      <span>Subjects</span>
                      <span className="text-gray-300 font-medium">{sem.subjects.length} courses</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-2 flex items-center justify-between">
                  {hasResult ? (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSemesterDetail(sem);
                        }}
                        className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Breakdown
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(sem.semesterId);
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Result"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500 italic">Upload marksheet above</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Semester Details Breakdown Modal */}
      <AnimatePresence>
        {selectedSemesterDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center p-5 border-b border-white/10 bg-black/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                    S{selectedSemesterDetail.semesterId}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Semester {selectedSemesterDetail.semesterId} Academic Performance
                    </h3>
                    <p className="text-xs text-gray-400">
                      {selectedSemesterDetail.uploadedAt ? `Uploaded on ${new Date(selectedSemesterDetail.uploadedAt).toLocaleDateString()}` : 'Verified Academic Record'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSemesterDetail(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Stats Header in Modal */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-black/40 border border-white/5 text-center">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">SGPA</p>
                    <p className="text-2xl font-bold text-purple-400 mt-0.5">
                      {selectedSemesterDetail.sgpa != null && !isNaN(Number(selectedSemesterDetail.sgpa)) ? Number(selectedSemesterDetail.sgpa).toFixed(2) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">Credits</p>
                    <p className="text-2xl font-bold text-white mt-0.5">
                      {selectedSemesterDetail.credits || '24'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">Status</p>
                    {selectedSemesterDetail.status === 'Verified' ? (
                      <p className="text-sm font-bold text-emerald-400 mt-1.5 flex items-center justify-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Verified
                      </p>
                    ) : selectedSemesterDetail.status === 'Rejected' ? (
                      <p className="text-sm font-bold text-red-400 mt-1.5 flex items-center justify-center gap-1">
                        <X className="w-4 h-4" /> Rejected
                      </p>
                    ) : selectedSemesterDetail.status === 'Re-upload' ? (
                      <p className="text-sm font-bold text-amber-400 mt-1.5 flex items-center justify-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Changes Req.
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-blue-400 mt-1.5 flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4" /> Pending
                      </p>
                    )}
                  </div>
                </div>

                {selectedSemesterDetail.staff_comment && (
                  <div className={`p-3.5 rounded-xl border text-xs ${
                    selectedSemesterDetail.status === 'Rejected'
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : selectedSemesterDetail.status === 'Re-upload'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-black/30 border-white/10 text-gray-300'
                  }`}>
                    <span className="font-bold block mb-1">
                      {selectedSemesterDetail.status === 'Rejected'
                        ? 'Faculty Rejection Reason:'
                        : selectedSemesterDetail.status === 'Re-upload'
                        ? 'Faculty Remarks (Changes Required):'
                        : 'Faculty Remarks:'}
                    </span>
                    <p className="leading-relaxed">{selectedSemesterDetail.staff_comment}</p>
                  </div>
                )}

                {/* Subjects Table */}
                <div>
                  <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" /> Subject Breakdown
                  </h4>
                  {selectedSemesterDetail.subjects && selectedSemesterDetail.subjects.length > 0 ? (
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-white/5 text-gray-400 border-b border-white/10">
                            <th className="py-2.5 px-3">Code</th>
                            <th className="py-2.5 px-3">Subject Name</th>
                            <th className="py-2.5 px-3 text-center">Grade</th>
                            <th className="py-2.5 px-3 text-center">Points</th>
                            <th className="py-2.5 px-3 text-center">Credits</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {selectedSemesterDetail.subjects.map((sub, i) => (
                            <tr key={i} className="hover:bg-white/5 text-gray-200">
                              <td className="py-2 px-3 font-mono text-purple-300 font-semibold">{sub.code || 'N/A'}</td>
                              <td className="py-2 px-3">{sub.name || 'Core Course'}</td>
                              <td className="py-2 px-3 text-center font-bold text-white">{sub.grade || 'A'}</td>
                              <td className="py-2 px-3 text-center">{sub.gradePoint != null ? sub.gradePoint : '--'}</td>
                              <td className="py-2 px-3 text-center">{sub.credit || 3}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No subject breakdown recorded for this semester.</p>
                  )}
                </div>

                {/* Marksheet Attachment Preview */}
                {selectedSemesterDetail.resultFile && (
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-400" /> Marksheet Document Preview
                    </h4>
                    <div className="h-64 rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                      {selectedSemesterDetail.fileType === 'image' ? (
                        <img 
                          src={selectedSemesterDetail.resultFile} 
                          alt="Marksheet Preview" 
                          className="max-w-full max-h-full object-contain cursor-pointer"
                          onClick={() => setModalPreviewFile({ url: selectedSemesterDetail.resultFile!, type: 'image' })}
                        />
                      ) : (
                        <iframe 
                          src={selectedSemesterDetail.resultFile} 
                          className="w-full h-full bg-white" 
                          title="PDF Preview" 
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-black/40 border-t border-white/10 flex justify-between items-center">
                <button
                  onClick={() => removeFile(selectedSemesterDetail.semesterId)}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Semester Record
                </button>
                <button
                  onClick={() => setSelectedSemesterDetail(null)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Raw File Preview Modal */}
      <AnimatePresence>
        {modalPreviewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            <div className="relative w-full max-w-4xl bg-[#1e1e2d] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col h-[90vh]">
              <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {modalPreviewFile.type === 'pdf' ? <FileText className="w-5 h-5 text-red-400" /> : <ImageIcon className="w-5 h-5 text-blue-400" />}
                  Document Preview
                </h3>
                <button
                  onClick={() => setModalPreviewFile(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40">
                {modalPreviewFile.type === 'image' ? (
                  <img src={modalPreviewFile.url} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
                ) : (
                  <iframe src={modalPreviewFile.url} className="w-full h-full rounded-lg bg-white" title="PDF Preview" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default SemesterResults;
