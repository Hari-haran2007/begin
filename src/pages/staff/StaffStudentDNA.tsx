import { API_URL } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dna,
  Search,
  CheckCircle,
  Clock,
  User,
  Award,
  TrendingUp,
  Briefcase,
  Code,
  Lightbulb,
  MessageSquare,
  Users,
  Zap,
  Puzzle,
  ShieldCheck,
  FileText,
  ChevronRight,
  RefreshCw,
  Edit3,
  Sliders,
  Check,
  Trophy,
  FileDigit,
  Layers
} from 'lucide-react';
import { Card, useToast } from '../../components/ui';

interface StudentDirectoryItem {
  id: string;
  _id: string;
  name: string;
  full_name: string;
  roll_number: string;
  department: string;
  semester: string | number;
  email: string;
  avatar_url: string | null;
  hasSelfAssessment: boolean;
  hasStaffAssessment: boolean;
  selfScore: number | null;
  staffScore: number | null;
  lastAssessedAt: string | null;
}

interface ContributingRecord {
  type: string;
  title: string;
  detail: string;
}

interface DimensionAssessment {
  score: number;
  explanation?: string;
  remarks?: string;
  assessorName?: string;
  assessedAt?: string;
}

interface DimensionData {
  key: string;
  title: string;
  icon: string;
  evidenceScore: number | null;
  status: string;
  explanation: string;
  contributingRecords: ContributingRecord[];
  selfAssessment: DimensionAssessment | null;
  staffAssessment: DimensionAssessment | null;
}

interface EvidenceSummaryItem {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  [key: string]: any;
}

interface RawEvidence {
  semesterPerformances: any[];
  skills: any[];
  projects: any[];
  certifications: any[];
  internships: any[];
  hackathons: any[];
  workshops: any[];
}

interface StudentDNADetail {
  student: {
    id: string;
    _id: string;
    name: string;
    email: string;
    roll_number: string;
    department: string;
    semester: string | number;
    avatar_url: string | null;
  };
  overallDnaScore: number | null;
  overallSelfScore: number | null;
  overallStaffScore: number | null;
  overallExplanation: string;
  dataCompleteness: number;
  dimensions: DimensionData[];
  evidenceSummary: {
    academics: EvidenceSummaryItem;
    skills: EvidenceSummaryItem;
    projects: EvidenceSummaryItem;
    certifications: EvidenceSummaryItem;
    internships: EvidenceSummaryItem;
    hackathons: EvidenceSummaryItem;
    workshops: EvidenceSummaryItem;
  };
  hasEnoughData: boolean;
  hasSelfAssessment: boolean;
  hasStaffAssessment: boolean;
  lastUpdated: string;
  rawEvidence?: RawEvidence;
}

const DIMENSION_ICONS: Record<string, React.ElementType> = {
  problemSolving: Puzzle,
  leadership: ShieldCheck,
  creativity: Lightbulb,
  communication: MessageSquare,
  teamwork: Users,
  learningSpeed: Zap,
  consistency: Clock,
  placementReadiness: TrendingUp,
};

const DIMENSION_PROMPTS: Record<string, string> = {
  problemSolving: 'Algorithmic reasoning, coding round performance, and complex debugging capability.',
  leadership: 'Leading technical teams, driving project initiatives, and organizing college events.',
  creativity: 'Architectural ingenuity, novel feature implementation, and original problem formulation.',
  communication: 'Technical articulation, documentation clarity, seminar presentations, and viva performance.',
  teamwork: 'Cross-functional collaboration, git pull-request reviews, and peer guidance.',
  learningSpeed: 'Pace of adopting new frameworks, libraries, tech stacks, and cloud tools.',
  consistency: 'Academic attendance, regular submission record, and sustained semester SGPA.',
  placementReadiness: 'Preparedness for corporate interviews, aptitude tests, and system design evaluations.',
};

export default function StaffStudentDNA() {
  const showToast = useToast();

  const [students, setStudents] = useState<StudentDirectoryItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDNA, setStudentDNA] = useState<StudentDNADetail | null>(null);
  const [loadingDNA, setLoadingDNA] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'staff-done' | 'staff-pending' | 'self-done'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Active view tab in detail panel
  const [activeTab, setActiveTab] = useState<'dimensions' | 'assessment-form' | 'evidence'>('dimensions');

  // Staff Assessment Form State
  const [formScores, setFormScores] = useState<Record<string, number>>({
    problemSolving: 75,
    leadership: 75,
    creativity: 75,
    communication: 75,
    teamwork: 80,
    learningSpeed: 80,
    consistency: 80,
    placementReadiness: 75,
  });
  const [formRemarks, setFormRemarks] = useState<Record<string, string>>({
    problemSolving: '',
    leadership: '',
    creativity: '',
    communication: '',
    teamwork: '',
    learningSpeed: '',
    consistency: '',
    placementReadiness: '',
  });
  const [generalRemarks, setGeneralRemarks] = useState('');
  const [savingAssessment, setSavingAssessment] = useState(false);

  useEffect(() => {
    fetchDirectory();
  }, []);

  const fetchDirectory = async (keepSelected = true) => {
    try {
      setLoadingList(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/staff/student-dna`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load student directory');
      const data: StudentDirectoryItem[] = await res.json();
      setStudents(data);

      if (data.length > 0 && (!selectedStudentId || !keepSelected)) {
        handleSelectStudent(data[0]._id || data[0].id);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error fetching student DNA directory', 'error');
    } finally {
      setLoadingList(false);
    }
  };

  const handleSelectStudent = async (studentId: string) => {
    setSelectedStudentId(studentId);
    try {
      setLoadingDNA(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/staff/student-dna/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch student DNA');
      const data: StudentDNADetail = await res.json();
      setStudentDNA(data);

      // Pre-fill assessment form with existing staff assessment or evidence baseline
      const newScores: Record<string, number> = {};
      const newRemarks: Record<string, string> = {};
      data.dimensions.forEach(dim => {
        newScores[dim.key] = dim.staffAssessment?.score ?? (dim.evidenceScore !== null ? Math.round(dim.evidenceScore) : 75);
        newRemarks[dim.key] = dim.staffAssessment?.remarks || '';
      });
      setFormScores(newScores);
      setFormRemarks(newRemarks);
      setGeneralRemarks((data as any).staffAssessment?.general_remarks || '');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to load student DNA details', 'error');
    } finally {
      setLoadingDNA(false);
    }
  };

  const handleScoreChange = (dimKey: string, score: number) => {
    const clamped = Math.max(0, Math.min(100, score));
    setFormScores(prev => ({ ...prev, [dimKey]: clamped }));
  };

  const handleRemarkChange = (dimKey: string, text: string) => {
    setFormRemarks(prev => ({ ...prev, [dimKey]: text }));
  };

  const handleFillBaseline = () => {
    if (!studentDNA) return;
    const filledScores: Record<string, number> = {};
    studentDNA.dimensions.forEach(dim => {
      filledScores[dim.key] = dim.evidenceScore !== null ? Math.round(dim.evidenceScore) : 70;
    });
    setFormScores(filledScores);
    showToast('Assessment scores populated with verified evidence baseline', 'info');
  };

  const handleSubmitStaffAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    try {
      setSavingAssessment(true);
      const token = localStorage.getItem('token');

      const dimensionsPayload: Record<string, { score: number; remarks: string }> = {};
      Object.keys(formScores).forEach(key => {
        dimensionsPayload[key] = {
          score: formScores[key],
          remarks: formRemarks[key] || ''
        };
      });

      const res = await fetch(`${API_URL}/staff/student-dna/${selectedStudentId}/assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          dimensions: dimensionsPayload,
          general_remarks: generalRemarks
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save staff assessment');
      }

      const resData = await res.json();
      const updatedDna: StudentDNADetail = resData.dna || resData;
      setStudentDNA(prev => ({ ...prev, ...updatedDna }));

      showToast('Faculty DNA assessment saved successfully!', 'success');

      // Update student in local directory list
      setStudents(prev => prev.map(s => {
        if (s._id === selectedStudentId || s.id === selectedStudentId) {
          return {
            ...s,
            hasStaffAssessment: true,
            staffScore: updatedDna.overallStaffScore
          };
        }
        return s;
      }));

      // Switch to dimensions view
      setActiveTab('dimensions');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error saving staff assessment', 'error');
    } finally {
      setSavingAssessment(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    const query = search.toLowerCase();
    const matchesSearch =
      (s.full_name || '').toLowerCase().includes(query) ||
      (s.roll_number || '').toLowerCase().includes(query) ||
      (s.email || '').toLowerCase().includes(query) ||
      (s.department || '').toLowerCase().includes(query);

    const matchesDept = departmentFilter === 'all' || s.department === departmentFilter;

    let matchesStatus = true;
    if (statusFilter === 'staff-done') matchesStatus = s.hasStaffAssessment;
    if (statusFilter === 'staff-pending') matchesStatus = !s.hasStaffAssessment;
    if (statusFilter === 'self-done') matchesStatus = s.hasSelfAssessment;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const departments = Array.from(new Set(students.map(s => s.department).filter(Boolean)));

  const calculateFormAverage = () => {
    const values = Object.values(formScores);
    if (!values.length) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue-500/20 border border-indigo-500/30 text-indigo-400">
              <Dna className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Student DNA Intelligence
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-medium">
                  Faculty Assessment Portal
                </span>
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Evaluate student growth across 8 holistic dimensions, review verified portfolio evidence, and endorse competencies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDirectory(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700 text-gray-300 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Student Directory */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 bg-gray-900/60 border-gray-800">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, roll no, dept..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-950/70 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800/60 text-gray-400 hover:text-white'
                }`}
              >
                All ({students.length})
              </button>
              <button
                onClick={() => setStatusFilter('staff-pending')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === 'staff-pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-800/60 text-gray-400 hover:text-white'
                }`}
              >
                Needs Review ({students.filter(s => !s.hasStaffAssessment).length})
              </button>
              <button
                onClick={() => setStatusFilter('staff-done')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === 'staff-done'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800/60 text-gray-400 hover:text-white'
                }`}
              >
                Evaluated ({students.filter(s => s.hasStaffAssessment).length})
              </button>
              <button
                onClick={() => setStatusFilter('self-done')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === 'self-done'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800/60 text-gray-400 hover:text-white'
                }`}
              >
                Self-Assessed ({students.filter(s => s.hasSelfAssessment).length})
              </button>
            </div>

            {/* Department Dropdown */}
            {departments.length > 0 && (
              <div className="mb-2">
                <select
                  value={departmentFilter}
                  onChange={e => setDepartmentFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-950/70 border border-gray-800 rounded-md text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Students List */}
            <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {loadingList ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading student directory...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-10 text-center text-gray-500 text-sm">
                  No students match your filter criteria.
                </div>
              ) : (
                filteredStudents.map(student => {
                  const isSelected = selectedStudentId === (student._id || student.id);
                  const initials = (student.full_name || student.name || 'ST')
                    .split(' ')
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <motion.div
                      key={student._id || student.id}
                      onClick={() => handleSelectStudent(student._id || student.id)}
                      whileHover={{ scale: 1.01 }}
                      className={`p-3 rounded-xl cursor-pointer border transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                          : 'bg-gray-950/40 border-gray-800/80 hover:bg-gray-800/40 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                          {student.avatar_url ? (
                            <img
                              src={student.avatar_url}
                              alt={student.full_name}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            initials
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-semibold text-white truncate">
                              {student.full_name || student.name}
                            </h4>
                            {isSelected && (
                              <ChevronRight className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-gray-300">{student.roll_number}</span>
                            <span>•</span>
                            <span className="truncate">{student.department}</span>
                          </div>

                          {/* Status badges */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {student.hasStaffAssessment ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 flex items-center gap-1 font-medium">
                                <CheckCircle className="w-2.5 h-2.5 text-blue-400" />
                                Staff: {student.staffScore}%
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300/80 flex items-center gap-1 font-medium">
                                <Clock className="w-2.5 h-2.5 text-amber-400" />
                                Review Pending
                              </span>
                            )}

                            {student.hasSelfAssessment && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center gap-1 font-medium">
                                Self: {student.selfScore}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Selected Student DNA Details */}
        <div className="lg:col-span-8 space-y-6">
          {loadingDNA ? (
            <Card className="p-16 text-center bg-gray-900/60 border-gray-800">
              <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-1">Calculating Student DNA...</h3>
              <p className="text-sm text-gray-400">
                Retrieving verified academic marks, certificates, internships, hackathons, and assessments.
              </p>
            </Card>
          ) : !studentDNA ? (
            <Card className="p-16 text-center bg-gray-900/60 border-gray-800">
              <Dna className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Student Selected</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Select a student from the directory on the left to inspect their Evidence-based DNA, review their self-assessment, and submit your faculty evaluation.
              </p>
            </Card>
          ) : (
            <>
              {/* Student Header Card */}
              <Card className="p-6 bg-gradient-to-br from-gray-900/90 via-gray-900/60 to-gray-950 border-gray-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white text-xl font-bold shadow-xl border border-white/10 flex-shrink-0">
                      {studentDNA.student.avatar_url ? (
                        <img
                          src={studentDNA.student.avatar_url}
                          alt={studentDNA.student.name}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        studentDNA.student.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                          {studentDNA.student.name}
                        </h2>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                          {studentDNA.student.roll_number}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {studentDNA.student.department} • Semester {studentDNA.student.semester || 'N/A'} • {studentDNA.student.email}
                      </p>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('assessment-form')}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      {studentDNA.hasStaffAssessment ? 'Update Faculty Assessment' : 'Evaluate Student DNA'}
                    </button>
                  </div>
                </div>

                {/* Score Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-800/80">
                  {/* Evidence DNA */}
                  <div className="p-3.5 rounded-xl bg-gray-950/60 border border-cyan-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-cyan-400 font-medium flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Evidence DNA
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {studentDNA.overallDnaScore !== null ? (
                        <span>{studentDNA.overallDnaScore}<span className="text-sm text-gray-400 font-normal">/100</span></span>
                      ) : (
                        <span className="text-xs text-amber-400 font-normal">Need more data</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 truncate">Verified DB records</p>
                  </div>

                  {/* Student Self-Score */}
                  <div className="p-3.5 rounded-xl bg-gray-950/60 border border-purple-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-purple-400 font-medium flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Self-Assessment
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {studentDNA.overallSelfScore !== null ? (
                        <span>{studentDNA.overallSelfScore}<span className="text-sm text-gray-400 font-normal">/100</span></span>
                      ) : (
                        <span className="text-xs text-gray-500 font-normal">Not submitted</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 truncate">Student reflection</p>
                  </div>

                  {/* Staff Assessment */}
                  <div className="p-3.5 rounded-xl bg-gray-950/60 border border-blue-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        Faculty Assessment
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {studentDNA.overallStaffScore !== null ? (
                        <span>{studentDNA.overallStaffScore}<span className="text-sm text-gray-400 font-normal">/100</span></span>
                      ) : (
                        <span className="text-xs text-amber-400 font-normal">Pending your score</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 truncate">
                      {studentDNA.hasStaffAssessment ? 'Evaluated by faculty' : 'Awaiting endorsement'}
                    </p>
                  </div>

                  {/* Data Completeness */}
                  <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-gray-400" />
                        Completeness
                      </span>
                      <span className="text-xs font-semibold text-white">{studentDNA.dataCompleteness}%</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mt-3">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${studentDNA.dataCompleteness}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 truncate">Pillars with records</p>
                  </div>
                </div>
              </Card>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                <button
                  onClick={() => setActiveTab('dimensions')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'dimensions'
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  8 Dimensions Spectrum
                </button>
                <button
                  onClick={() => setActiveTab('assessment-form')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'assessment-form'
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  Faculty Evaluation Form
                </button>
                <button
                  onClick={() => setActiveTab('evidence')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'evidence'
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Portfolio Evidence ({Object.values(studentDNA.evidenceSummary).reduce((a, b) => a + (b.total || 0), 0)})
                </button>
              </div>

              {/* TAB 1: 8 DIMENSIONS SPECTRUM */}
              {activeTab === 'dimensions' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {studentDNA.dimensions.map(dim => {
                      const IconComp = DIMENSION_ICONS[dim.key] || Puzzle;
                      return (
                        <Card key={dim.key} className="p-4 bg-gray-900/60 border-gray-800 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-white">{dim.title}</h4>
                                  <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                                    {DIMENSION_PROMPTS[dim.key]}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Scores Comparison Trio */}
                            <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-lg bg-gray-950/60 border border-gray-800/80">
                              <div className="text-center">
                                <span className="text-[10px] text-cyan-400 font-medium block">Evidence</span>
                                <span className="text-sm font-bold text-white">
                                  {dim.evidenceScore !== null ? `${dim.evidenceScore}%` : '—'}
                                </span>
                              </div>
                              <div className="text-center border-x border-gray-800">
                                <span className="text-[10px] text-purple-400 font-medium block">Self</span>
                                <span className="text-sm font-bold text-white">
                                  {dim.selfAssessment?.score !== undefined ? `${dim.selfAssessment.score}%` : '—'}
                                </span>
                              </div>
                              <div className="text-center">
                                <span className="text-[10px] text-blue-400 font-medium block">Faculty</span>
                                <span className="text-sm font-bold text-white">
                                  {dim.staffAssessment?.score !== undefined ? `${dim.staffAssessment.score}%` : '—'}
                                </span>
                              </div>
                            </div>

                            {/* Student self-reflection note */}
                            {dim.selfAssessment?.explanation && (
                              <div className="p-2 rounded bg-purple-500/5 border border-purple-500/20 text-xs text-purple-300/90 mb-2">
                                <span className="font-semibold text-purple-300">Student Note: </span>
                                "{dim.selfAssessment.explanation}"
                              </div>
                            )}

                            {/* Staff Remarks */}
                            {dim.staffAssessment?.remarks && (
                              <div className="p-2 rounded bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300/90 mb-2">
                                <span className="font-semibold text-blue-300">Faculty Endorsement: </span>
                                "{dim.staffAssessment.remarks}"
                              </div>
                            )}

                            {/* Contributing Records List */}
                            {dim.contributingRecords && dim.contributingRecords.length > 0 && (
                              <div className="space-y-1 mt-2">
                                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                  Contributing Evidence:
                                </span>
                                {dim.contributingRecords.slice(0, 3).map((r, i) => (
                                  <div key={i} className="text-xs text-gray-300 flex items-center gap-1.5 truncate">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                                    <span className="font-medium text-gray-200">{r.title}</span>
                                    <span className="text-gray-500 text-[11px] truncate">({r.detail})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: FACULTY ASSESSMENT FORM */}
              {activeTab === 'assessment-form' && (
                <Card className="p-6 bg-gray-900/60 border-indigo-500/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-6 border-b border-gray-800">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-indigo-400" />
                        Evaluate Student Competencies
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Rate each dimension from 0 to 100 based on verified submissions, classroom performance, and project contributions.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleFillBaseline}
                        className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 border border-gray-700 transition-colors"
                      >
                        Auto-fill with Evidence Baseline
                      </button>
                      <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                        Overall Faculty Score: {calculateFormAverage()}%
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitStaffAssessment} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {studentDNA.dimensions.map(dim => {
                        const IconComp = DIMENSION_ICONS[dim.key] || Puzzle;
                        const score = formScores[dim.key] ?? 75;
                        const remarks = formRemarks[dim.key] ?? '';

                        return (
                          <div
                            key={dim.key}
                            className="p-4 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <label className="text-sm font-semibold text-white">{dim.title}</label>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={score}
                                  onChange={e => handleScoreChange(dim.key, parseInt(e.target.value) || 0)}
                                  className="w-16 px-2 py-1 text-center bg-gray-900 border border-indigo-500/40 rounded-md text-sm font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
                                />
                                <span className="text-xs text-gray-500">%</span>
                              </div>
                            </div>

                            {/* Range slider */}
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={score}
                              onChange={e => handleScoreChange(dim.key, parseInt(e.target.value) || 0)}
                              className="w-full accent-indigo-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                            />

                            <div className="flex items-center justify-between text-[10px] text-gray-500">
                              <span>Evidence: {dim.evidenceScore !== null ? `${dim.evidenceScore}%` : 'N/A'}</span>
                              <span>Self: {dim.selfAssessment?.score !== undefined ? `${dim.selfAssessment.score}%` : 'N/A'}</span>
                            </div>

                            {/* Remarks input */}
                            <input
                              type="text"
                              placeholder="Faculty remarks (e.g., strong in algorithms)..."
                              value={remarks}
                              onChange={e => handleRemarkChange(dim.key, e.target.value)}
                              className="w-full px-3 py-1.5 bg-gray-900/90 border border-gray-800 rounded-md text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Overall Remarks */}
                    <div className="space-y-2 pt-2 border-t border-gray-800">
                      <label className="text-sm font-semibold text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-400" />
                        Comprehensive Faculty Assessment Remarks
                      </label>
                      <textarea
                        rows={3}
                        value={generalRemarks}
                        onChange={e => setGeneralRemarks(e.target.value)}
                        placeholder="Provide overall qualitative feedback on the student's academic discipline, potential for placements, research acumen, and growth trajectory..."
                        className="w-full px-4 py-2.5 bg-gray-950/70 border border-gray-800 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('dimensions')}
                        className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingAssessment}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {savingAssessment ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving Assessment...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Submit & Endorse DNA
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </Card>
              )}

              {/* TAB 3: PORTFOLIO EVIDENCE */}
              {activeTab === 'evidence' && (
                <div className="space-y-4">
                  {/* Summary cards for the 7 modules */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(studentDNA.evidenceSummary).map(([key, sum]) => {
                      const names: Record<string, string> = {
                        academics: 'Semester Results',
                        skills: 'Technical Skills',
                        projects: 'Projects',
                        certifications: 'Certificates',
                        internships: 'Internships',
                        hackathons: 'Hackathons',
                        workshops: 'Workshops',
                      };
                      return (
                        <div key={key} className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                          <span className="text-xs text-gray-400 font-medium block truncate">
                            {names[key] || key}
                          </span>
                          <div className="text-xl font-bold text-white mt-1">
                            {sum.total}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                            <span className="text-emerald-400">{sum.verified} verified</span>
                            {sum.pending > 0 && <span className="text-amber-400">• {sum.pending} pending</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Raw records lists if available */}
                  {studentDNA.rawEvidence && (
                    <div className="space-y-4 pt-2">
                      {/* Projects */}
                      {studentDNA.rawEvidence.projects && studentDNA.rawEvidence.projects.length > 0 && (
                        <Card className="p-4 bg-gray-900/60 border-gray-800">
                          <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                            <Code className="w-4 h-4 text-indigo-400" />
                            Projects ({studentDNA.rawEvidence.projects.length})
                          </h4>
                          <div className="space-y-2">
                            {studentDNA.rawEvidence.projects.map((p, i) => (
                              <div key={i} className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-medium text-white">{p.title || p.project_title}</span>
                                  <p className="text-gray-400 mt-0.5">{p.technologies?.join(', ') || 'No tech stack listed'}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                  p.verification_status === 'approved' || p.verification_status === 'Verified'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {p.verification_status || 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Internships */}
                      {studentDNA.rawEvidence.internships && studentDNA.rawEvidence.internships.length > 0 && (
                        <Card className="p-4 bg-gray-900/60 border-gray-800">
                          <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                            <Briefcase className="w-4 h-4 text-blue-400" />
                            Internships ({studentDNA.rawEvidence.internships.length})
                          </h4>
                          <div className="space-y-2">
                            {studentDNA.rawEvidence.internships.map((intn, i) => (
                              <div key={i} className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-medium text-white">{intn.role || intn.internshipRole} at {intn.company || intn.companyName}</span>
                                  <p className="text-gray-400 mt-0.5">{intn.mode || intn.work_type || 'Internship'}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                  intn.verification_status === 'approved' || intn.verification_status === 'Verified'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {intn.verification_status || 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Hackathons */}
                      {studentDNA.rawEvidence.hackathons && studentDNA.rawEvidence.hackathons.length > 0 && (
                        <Card className="p-4 bg-gray-900/60 border-gray-800">
                          <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            Hackathons ({studentDNA.rawEvidence.hackathons.length})
                          </h4>
                          <div className="space-y-2">
                            {studentDNA.rawEvidence.hackathons.map((h, i) => (
                              <div key={i} className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-medium text-white">{h.title || h.hackathon_name}</span>
                                  <p className="text-gray-400 mt-0.5">{h.position || h.achievement || 'Participant'}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                  h.verification_status === 'approved' || h.verification_status === 'Verified'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {h.verification_status || 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Semester Performances */}
                      {studentDNA.rawEvidence.semesterPerformances && studentDNA.rawEvidence.semesterPerformances.length > 0 && (
                        <Card className="p-4 bg-gray-900/60 border-gray-800">
                          <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                            <FileDigit className="w-4 h-4 text-emerald-400" />
                            Semester Results ({studentDNA.rawEvidence.semesterPerformances.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {studentDNA.rawEvidence.semesterPerformances.map((sem, i) => (
                              <div key={i} className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-white">Semester {sem.semester}</span>
                                  <span className="text-emerald-400 font-mono font-bold">SGPA {sem.sgpa || 'N/A'}</span>
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
                                  <span>Credits: {sem.credits_earned || sem.credits_total || 0}</span>
                                  <span className="capitalize">{sem.verification_status || 'Pending'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
