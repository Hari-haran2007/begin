import { API_URL } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  Dna,
  Brain,
  Code,
  Puzzle,
  Users,
  Lightbulb,
  MessageSquare,
  Target,
  Zap,
  Clock,
  ShieldCheck,
  TrendingUp,
  Award,
  Briefcase,
  Trophy,
  Presentation,
  FileDigit,
  RefreshCw,
  AlertCircle,
  X,
  Info,
  Sparkles,
  UserCheck,
  User,
  Sliders
} from 'lucide-react';
import { Card, useToast } from '../components/ui';

export interface ContributingRecord {
  type: string;
  title: string;
  detail: string;
}

export interface DimensionAssessment {
  score: number;
  explanation?: string;
  remarks?: string;
  assessorName?: string;
  assessedAt?: string;
}

export interface DimensionData {
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

export interface EvidenceSummaryItem {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  [key: string]: any;
}

export interface DNAResponse {
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

const DIMENSION_QUESTIONS: Record<string, string> = {
  problemSolving: 'How effectively do you break down complex technical problems and implement algorithmic solutions?',
  leadership: 'How confident are you taking initiative, guiding peers, and driving projects to completion?',
  creativity: 'How frequently do you propose innovative architectures, original designs, and out-of-the-box solutions?',
  communication: 'How clearly do you articulate technical concepts in presentations, viva, and technical documentation?',
  teamwork: 'How productively do you collaborate, share code, and handle peer feedback within engineering teams?',
  learningSpeed: 'How rapidly do you grasp and apply new programming languages, frameworks, or tools?',
  consistency: 'How reliably do you maintain study routines, high academic attendance, and project deadlines?',
  placementReadiness: 'How prepared do you feel for technical interviews, DSA rounds, and system design evaluations?',
};

export function StudentDNA() {
  const { token } = useAuth();
  const showToast = useToast();
  const [dnaData, setDnaData] = useState<DNAResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'assessment' | 'evidence'>('overview');
  const [selfModalOpen, setSelfModalOpen] = useState(false);
  const [submittingSelf, setSubmittingSelf] = useState(false);

  // Self assessment form state (8 dimensions, scores 0-100)
  const [selfForm, setSelfForm] = useState<Record<string, { score: number; explanation: string }>>({
    problemSolving: { score: 75, explanation: '' },
    leadership: { score: 70, explanation: '' },
    creativity: { score: 75, explanation: '' },
    communication: { score: 75, explanation: '' },
    teamwork: { score: 80, explanation: '' },
    learningSpeed: { score: 80, explanation: '' },
    consistency: { score: 80, explanation: '' },
    placementReadiness: { score: 75, explanation: '' },
  });
  const [generalRemarks, setGeneralRemarks] = useState('');

  useEffect(() => {
    fetchDNA();
  }, [token]);

  const fetchDNA = async () => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      setError('Please log in to view your Student DNA.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/student-dna`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!res.ok) {
        throw new Error('Failed to load Student DNA from database.');
      }

      const data: DNAResponse = await res.json();
      setDnaData(data);

      // Pre-fill form if self assessment exists
      if (data.dimensions) {
        const prefilled: Record<string, { score: number; explanation: string }> = {};
        data.dimensions.forEach(d => {
          prefilled[d.key] = {
            score: d.selfAssessment?.score ?? 75,
            explanation: d.selfAssessment?.explanation ?? ''
          };
        });
        setSelfForm(prev => ({ ...prev, ...prefilled }));
      }
    } catch (err: any) {
      console.error('Error fetching student DNA:', err);
      setError(err.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSelfAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const authToken = token || localStorage.getItem('token');
    if (!authToken) return;

    try {
      setSubmittingSelf(true);
      const res = await fetch(`${API_URL}/student-dna/self-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          dimensions: selfForm,
          general_remarks: generalRemarks
        })
      });

      const resData = await res.json();
      if (res.ok) {
        setDnaData(resData.dna);
        setSelfModalOpen(false);
        showToast('Self-assessment successfully saved to your Student DNA!', 'success');
      } else {
        showToast(resData.error || 'Failed to save self-assessment.', 'error');
      }
    } catch (err: any) {
      console.error('Error saving self-assessment:', err);
      showToast('Error saving self-assessment. Please check connection.', 'error');
    } finally {
      setSubmittingSelf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <Dna className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className="text-purple-300 font-medium animate-pulse text-sm">Sequencing Student Growth DNA from MongoDB records...</p>
      </div>
    );
  }

  if (error || !dnaData) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Student DNA Offline</h3>
        <p className="text-gray-400 text-sm">{error || 'Unable to load student DNA profile.'}</p>
        <button
          onClick={fetchDNA}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl text-xs hover:opacity-90 transition-opacity inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const { student, dimensions, evidenceSummary, overallDnaScore, overallSelfScore, overallStaffScore, dataCompleteness, overallExplanation, lastUpdated } = dnaData;

  // Radar chart SVG computation (3 overlapping polygons: Evidence, Self, Staff)
  const RadarSpectrum = () => {
    const max = 100;
    const center = 150;
    const radius = 105;
    const numPoints = 8;
    const angleStep = (Math.PI * 2) / numPoints;

    const generatePolygon = (dataPoints: (number | null)[]) => {
      return dataPoints.map((val, i) => {
        const safeVal = val !== null ? val : 0;
        const r = (safeVal / max) * radius;
        const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
        return `${x},${y}`;
      }).join(' ');
    };

    const evidencePoints = dimensions.map(d => d.evidenceScore);
    const selfPoints = dimensions.map(d => d.selfAssessment?.score ?? null);
    const staffPoints = dimensions.map(d => d.staffAssessment?.score ?? null);

    const labels = [
      'Problem Solving', 'Leadership', 'Creativity', 'Communication',
      'Teamwork', 'Learning Speed', 'Consistency', 'Placement Ready'
    ];

    return (
      <div className="relative w-full h-[320px] flex items-center justify-center">
        <svg width="340" height="320" className="overflow-visible">
          {/* Background Concentric Rings */}
          {[0.25, 0.5, 0.75, 1].map((scale, idx) => (
            <polygon
              key={idx}
              points={generatePolygon(Array(8).fill(100 * scale))}
              fill={idx === 3 ? 'rgba(255,255,255,0.02)' : 'none'}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          ))}

          {/* Radial Axis Lines */}
          {Array(8).fill(0).map((_, i) => {
            const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
            return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
          })}

          {/* Evidence Polygon (Cyan/Blue) */}
          {evidencePoints.some(p => p !== null) && (
            <polygon
              points={generatePolygon(evidencePoints)}
              fill="rgba(6, 182, 212, 0.2)"
              stroke="#06b6d4"
              strokeWidth="2"
            />
          )}

          {/* Self-Assessment Polygon (Purple) */}
          {selfPoints.some(p => p !== null) && (
            <polygon
              points={generatePolygon(selfPoints)}
              fill="rgba(168, 85, 247, 0.15)"
              stroke="#a855f7"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
          )}

          {/* Staff Assessment Polygon (Emerald) */}
          {staffPoints.some(p => p !== null) && (
            <polygon
              points={generatePolygon(staffPoints)}
              fill="rgba(16, 185, 129, 0.18)"
              stroke="#10b981"
              strokeWidth="2.5"
            />
          )}

          {/* Axis Labels */}
          {labels.map((label, i) => {
            const r = radius + 22;
            const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
            return (
              <text
                key={i}
                x={x}
                y={y}
                fill="#94a3b8"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {label.split(' ')[0]}
              </text>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* 1. SECTION A: STUDENT DNA OVERVIEW */}
      <div className="relative rounded-3xl bg-gradient-to-br from-purple-950/60 via-gray-900/90 to-blue-950/60 border border-white/10 p-6 md:p-8 backdrop-blur-2xl overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
              <Dna className="w-3.5 h-3.5 text-purple-400" /> Real-Data Student Growth Intelligence
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              {student.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono">
                Reg: {student.roll_number}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                Dept: {student.department}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                Semester: {student.semester}
              </span>
              <span className="text-gray-400">
                Updated: {new Date(lastUpdated).toLocaleDateString()}
              </span>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed max-w-2xl pt-1">
              {overallExplanation}
            </p>

            {/* Data completeness progress */}
            <div className="pt-2 max-w-md space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">Data Completeness (7 Modules)</span>
                <span className="text-cyan-400 font-bold">{dataCompleteness}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 transition-all duration-500" 
                  style={{ width: `${dataCompleteness}%` }}
                />
              </div>
            </div>
          </div>

          {/* Scores Overview Column */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 lg:gap-6 bg-black/40 p-4 md:p-6 rounded-2xl border border-white/10">
            <div className="text-center min-w-[100px]">
              <div className="text-xs text-cyan-300 font-bold mb-1 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Evidence
              </div>
              {overallDnaScore !== null ? (
                <div className="text-4xl font-black text-cyan-400">{overallDnaScore}</div>
              ) : (
                <div className="text-xs text-gray-500 italic py-3">Not enough data</div>
              )}
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">DNA Index</div>
            </div>

            <div className="w-px h-16 bg-white/10 hidden sm:block" />

            <div className="text-center min-w-[100px]">
              <div className="text-xs text-purple-300 font-bold mb-1 flex items-center justify-center gap-1">
                <User className="w-3.5 h-3.5" /> Self
              </div>
              {overallSelfScore !== null ? (
                <div className="text-4xl font-black text-purple-400">{overallSelfScore}</div>
              ) : (
                <div className="text-xs text-gray-500 italic py-3">Not assessed</div>
              )}
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Self-Rating</div>
            </div>

            <div className="w-px h-16 bg-white/10 hidden sm:block" />

            <div className="text-center min-w-[100px]">
              <div className="text-xs text-emerald-300 font-bold mb-1 flex items-center justify-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Staff
              </div>
              {overallStaffScore !== null ? (
                <div className="text-4xl font-black text-emerald-400">{overallStaffScore}</div>
              ) : (
                <div className="text-xs text-gray-500 italic py-3">Not assessed</div>
              )}
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Faculty Score</div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              8 Dimensions
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'evidence'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Real Evidence Sources
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelfModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" /> 
              {dnaData.hasSelfAssessment ? 'Update Self-Assessment' : 'Submit Self-Assessment'}
            </button>
            <button
              onClick={fetchDNA}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
              title="Refresh DNA from MongoDB"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. SECTION B: ACADEMIC & ACHIEVEMENT INTELLIGENCE SUMMARY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            Real Evidence Intelligence (MongoDB Data)
          </h2>
          <span className="text-xs text-gray-400">
            * Unverified and rejected submissions do not inflate scores
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Academics */}
          <Card className="bg-gray-900/60 border-white/10 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <FileDigit className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] text-emerald-400 font-bold">
                {evidenceSummary.academics.verified} ver.
              </span>
            </div>
            <div className="text-lg font-bold text-white">
              {evidenceSummary.academics.cgpa ? Number(evidenceSummary.academics.cgpa).toFixed(2) : '--'}
            </div>
            <div className="text-[11px] text-gray-400">Academics (CGPA)</div>
            <div className="text-[10px] text-gray-500 mt-1">
              {evidenceSummary.academics.total} semesters total
            </div>
          </Card>

          {/* Skills */}
          <Card className="bg-gray-900/60 border-white/10 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <Code className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] text-emerald-400 font-bold">
                {evidenceSummary.skills.verified} ver.
              </span>
            </div>
            <div className="text-lg font-bold text-white">{evidenceSummary.skills.total}</div>
            <div className="text-[11px] text-gray-400">Technical Skills</div>
            <div className="text-[10px] text-gray-500 mt-1">
              {evidenceSummary.skills.technical} Tech / {evidenceSummary.skills.soft} Soft
            </div>
          </Card>

          {/* Projects */}
          <Card className="bg-gray-900/60 border-white/10 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] text-emerald-400 font-bold">
                {evidenceSummary.projects.verified} ver.
              </span>
            </div>
            <div className="text-lg font-bold text-white">{evidenceSummary.projects.total}</div>
            <div className="text-[11px] text-gray-400">Projects</div>
            <div className="text-[10px] text-gray-500 mt-1">
              {evidenceSummary.projects.pending} under review
            </div>
          </Card>

          {/* Certifications */}
          <Card className="bg-gray-900/60 border-white/10 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-4 h-4 text-rose-400" />
              <span className="text-[10px] text-emerald-400 font-bold">
                {evidenceSummary.certifications.verified} ver.
              </span>
            </div>
            <div className="text-lg font-bold text-white">{evidenceSummary.certifications.total}</div>
            <div className="text-[11px] text-gray-400">Certificates</div>
            <div className="text-[10px] text-gray-500 mt-1">
              {evidenceSummary.certifications.verified} verified credentials
            </div>
          </Card>

          {/* Internships */}
          <Card className="bg-gray-900/60 border-white/10 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-bold">
                {evidenceSummary.internships.verified} ver.
              </span>
            </div>
            <div className="text-lg font-bold text-white">{evidenceSummary.internships.total}</div>
            <div className="text-[11px] text-gray-400">Internships</div>
            <div className="text-[10px] text-gray-500 mt-1">
              {evidenceSummary.internships.verified} industry roles
            </div>
          </Card>

          {/* Hackathons */}
          <Card className="bg-gray-900/60 border-white/10 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-[10px] text-emerald-400 font-bold">
                {evidenceSummary.hackathons.verified} ver.
              </span>
            </div>
            <div className="text-lg font-bold text-white">{evidenceSummary.hackathons.total}</div>
            <div className="text-[11px] text-gray-400">Hackathons</div>
            <div className="text-[10px] text-yellow-400 font-medium mt-1">
              {evidenceSummary.hackathons.wins} podium wins
            </div>
          </Card>

          {/* Workshops */}
          <Card className="bg-gray-900/60 border-white/10 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <Presentation className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] text-emerald-400 font-bold">
                {evidenceSummary.workshops.verified} ver.
              </span>
            </div>
            <div className="text-lg font-bold text-white">{evidenceSummary.workshops.total}</div>
            <div className="text-[11px] text-gray-400">Workshops</div>
            <div className="text-[10px] text-gray-500 mt-1">
              {evidenceSummary.workshops.verified} completed
            </div>
          </Card>
        </div>
      </div>

      {/* 3. SECTION C: EIGHT-DIMENSION ASSESSMENT & RADAR COMPARISON */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Radar Spectrum Column */}
          <div className="lg:col-span-4 bg-gray-900/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center justify-between">
            <div className="w-full">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-purple-400" />
                Tri-Spectrum Radar
              </h3>
              <p className="text-xs text-gray-400">
                Real-time triangulation between Evidence, Self-Rating, and Faculty assessment.
              </p>
            </div>

            <RadarSpectrum />

            {/* Legend */}
            <div className="w-full pt-4 border-t border-white/10 flex items-center justify-around text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-cyan-400" />
                <span className="text-gray-300 font-medium">Evidence</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-purple-400" />
                <span className="text-gray-300 font-medium">Self</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-gray-300 font-medium">Staff</span>
              </div>
            </div>
          </div>

          {/* Dimension Cards (8 Dimensions) */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {dimensions.map(dim => {
              const Icon = DIMENSION_ICONS[dim.key] || Sparkles;
              return (
                <div 
                  key={dim.key} 
                  className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 hover:border-purple-500/30 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 flex-shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{dim.title}</h4>
                          <span className={`text-[10px] font-semibold ${
                            dim.evidenceScore !== null ? 'text-cyan-400' : 'text-gray-500'
                          }`}>
                            {dim.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-xl font-black ${
                          dim.evidenceScore !== null ? 'text-white' : 'text-gray-600'
                        }`}>
                          {dim.evidenceScore !== null ? `${dim.evidenceScore}` : '--'}
                        </span>
                        <span className="text-[10px] text-gray-500 block">/ 100</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed mb-3">
                      {dim.explanation}
                    </p>

                    {/* Tri-Scores Breakdown */}
                    <div className="space-y-2 bg-black/40 p-3 rounded-xl border border-white/5 text-xs">
                      {/* Evidence */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" /> Evidence Score:
                        </span>
                        <span className="font-bold text-cyan-400">
                          {dim.evidenceScore !== null ? `${dim.evidenceScore}%` : 'Not enough data yet'}
                        </span>
                      </div>
                      
                      {/* Self */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-purple-400" /> Self-Assessment:
                        </span>
                        <span className="font-bold text-purple-400">
                          {dim.selfAssessment ? `${dim.selfAssessment.score}%` : 'Not assessed yet'}
                        </span>
                      </div>

                      {/* Staff */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" /> Staff Assessment:
                        </span>
                        <span className="font-bold text-emerald-400">
                          {dim.staffAssessment ? `${dim.staffAssessment.score}%` : 'Not assessed yet'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Remarks & Contributing records */}
                  <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                    {dim.staffAssessment?.remarks && (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]">
                        <span className="font-semibold text-emerald-400">Staff Note ({dim.staffAssessment.assessorName || 'Faculty'}):</span> {dim.staffAssessment.remarks}
                      </div>
                    )}

                    {dim.selfAssessment?.explanation && (
                      <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px]">
                        <span className="font-semibold text-purple-400">Self Reflection:</span> {dim.selfAssessment.explanation}
                      </div>
                    )}

                    {dim.contributingRecords && dim.contributingRecords.length > 0 && (
                      <div className="text-[10px] text-gray-500 truncate">
                        <span className="text-gray-400 font-medium">Evidence: </span>
                        {dim.contributingRecords.map(r => `${r.title} (${r.detail})`).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. SECTION D: EVIDENCE AND GROWTH DETAILS */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs text-gray-300 leading-relaxed">
            <h4 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" /> How Records Map to Your Dimensions
            </h4>
            Every score in Beyond Grades is derived strictly from real verified submissions stored in MongoDB. Uploaded certificates do not automatically award leadership or teamwork—only collaborative team hackathons, verified industry internships, and multi-person engineering projects contribute to relational dimensions.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dimensions.map(dim => {
              const Icon = DIMENSION_ICONS[dim.key] || Sparkles;
              return (
                <Card key={dim.key} className="bg-gray-900/70 border border-white/10 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-white">{dim.title} Evidence</h4>
                    </div>
                    <span className="text-xs font-bold text-cyan-400">
                      Score: {dim.evidenceScore !== null ? `${dim.evidenceScore}%` : 'Not enough data yet'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400">{dim.explanation}</p>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                      Contributing Verified Records:
                    </span>
                    {dim.contributingRecords && dim.contributingRecords.length > 0 ? (
                      <div className="space-y-1.5">
                        {dim.contributingRecords.map((rec, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs">
                            <span className="text-gray-200 font-medium">{rec.title}</span>
                            <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded">
                              {rec.detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic py-2">
                        No verified records currently contributing to this dimension. Add verified items in the respective student module to build evidence.
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. SELF-ASSESSMENT MODAL */}
      <AnimatePresence>
        {selfModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-gray-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Student Self-Assessment</h3>
                    <p className="text-xs text-gray-400">Rate your proficiency across all 8 dimensions with honest self-reflection.</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelfModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveSelfAssessment} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                {dimensions.map(dim => {
                  const currentVal = selfForm[dim.key] || { score: 75, explanation: '' };
                  return (
                    <div key={dim.key} className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">{dim.title}</h4>
                          <p className="text-[11px] text-gray-400">{DIMENSION_QUESTIONS[dim.key]}</p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={currentVal.score}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                              setSelfForm({
                                ...selfForm,
                                [dim.key]: { ...currentVal, score: val }
                              });
                            }}
                            className="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-center text-sm font-bold text-purple-400 outline-none"
                          />
                          <span className="text-xs text-gray-500">/ 100</span>
                        </div>
                      </div>

                      {/* Slider Control */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={currentVal.score}
                        onChange={(e) => {
                          setSelfForm({
                            ...selfForm,
                            [dim.key]: { ...currentVal, score: parseInt(e.target.value, 10) }
                          });
                        }}
                        className="w-full accent-purple-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                      />

                      {/* Evidence / Reflection field */}
                      <input
                        type="text"
                        value={currentVal.explanation}
                        onChange={(e) => {
                          setSelfForm({
                            ...selfForm,
                            [dim.key]: { ...currentVal, explanation: e.target.value }
                          });
                        }}
                        placeholder="Optional reflection or supporting evidence (e.g., solved 100+ LeetCode problems)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-500/50"
                      />
                    </div>
                  );
                })}

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-gray-300">General Self-Reflection / Career Goals</label>
                  <textarea
                    rows={3}
                    value={generalRemarks}
                    onChange={(e) => setGeneralRemarks(e.target.value)}
                    placeholder="Share any overarching achievements, aspirations, or areas you are actively working on improving..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-500/50"
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelfModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSelf}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {submittingSelf ? 'Saving...' : 'Save Self-Assessment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default StudentDNA;
