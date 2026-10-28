import { API_URL } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitCompare, Search, User, X, Check,
  AlertCircle, Zap, Target
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';

type CompareStudentInfo = {
  _id: string;
  user_id: string;
  full_name: string;
  department: string;
  semester: number;
  roll_number?: string;
  avatar_url?: string;
};

type CompareData = {
  profile: CompareStudentInfo;
  growthMetrics: any;
  comparisonData: any;
  counts: {
    projects: number;
    certifications: number;
    internships: number;
    hackathons: number;
    workshops: number;
  };
  skills?: any[];
  semesterPerformances?: any[];
};

export function Compare() {
  const { profile, token } = useAuth();
  
  // Student A is strictly the current user
  const studentA = profile ? {
    _id: profile._id || profile.id || '',
    user_id: profile.user_id,
    full_name: profile.full_name,
    department: profile.department,
    semester: profile.semester,
    roll_number: profile.roll_number,
    avatar_url: profile.avatar_url,
  } : null;

  const [studentB, setStudentB] = useState<CompareStudentInfo | null>(null);
  
  const [isSearchingB, setIsSearchingB] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CompareStudentInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [compareDataA, setCompareDataA] = useState<CompareData | null>(null);
  const [compareDataB, setCompareDataB] = useState<CompareData | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonError, setComparisonError] = useState('');
  const [hasCompared, setHasCompared] = useState(false);

  // Simulator State
  const [simMetric, setSimMetric] = useState('Coding Score');
  const [simCurrent, setSimCurrent] = useState<number | ''>('');
  const [simTarget, setSimTarget] = useState<number | ''>('');
  const [simResult, setSimResult] = useState<string | null>(null);

  // Debounced Search Effect
  useEffect(() => {
    if (!isSearchingB) return;
    
    const timer = setTimeout(async () => {
      if (!searchQuery.trim() || !token) {
        setSearchResults([]);
        setSearchError('');
        return;
      }
      
      setSearchLoading(true);
      setSearchError('');
      try {
        const res = await fetch(`${API_URL}/compare/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        } else if (res.status === 401 || res.status === 403) {
          setSearchError('Please login again.');
        } else if (res.status === 404) {
          setSearchError('Student search service is unavailable.');
        } else {
          setSearchError('Unable to search students.');
        }
      } catch (err) {
        setSearchError('Unable to search students.');
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, token, isSearchingB]);

  const selectStudent = (student: CompareStudentInfo) => {
    setStudentB(student);
    setIsSearchingB(false);
    setSearchQuery('');
    setSearchResults([]);
    setHasCompared(false);
    setCompareDataA(null);
    setCompareDataB(null);
  };

  const runComparison = async () => {
    if (!studentA || !studentB) return;
    
    setIsComparing(true);
    setComparisonError('');
    setHasCompared(false);

    try {
      const [resA, resB] = await Promise.all([
        fetch(`${API_URL}/compare/${studentA._id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/compare/${studentB._id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!resA.ok || !resB.ok) {
        throw new Error('Unable to fetch comparison data. Ensure both students have permitted comparison.');
      }

      const dataA = await resA.json();
      const dataB = await resB.json();

      setCompareDataA(dataA);
      setCompareDataB(dataB);
      setHasCompared(true);
    } catch (err: any) {
      setComparisonError(err.message || 'Unable to load comparison data. Please try again.');
    } finally {
      setIsComparing(false);
    }
  };

  const calculateDynamicMetrics = (data: CompareData | null) => {
    if (!data) return null;

    const { skills = [], semesterPerformances = [], counts } = data;
    const projects = counts?.projects || 0;
    const hackathons = counts?.hackathons || 0;
    const internships = counts?.internships || 0;
    const workshops = counts?.workshops || 0;
    const certs = counts?.certifications || 0;

    // 1. Calculate Academic CGPA using the same logic as SemesterResults
    let calculatedCgpa = null;
    let totalPoints = 0;
    let totalCredits = 0;

    const validSemesters = semesterPerformances.filter((s: any) => s.sgpa && (s.credits_total || s.credits_earned));
    validSemesters.forEach((s: any) => {
      const cred = s.credits_total || s.credits_earned || 0;
      totalCredits += cred;
      totalPoints += ((s.sgpa || 0) * cred);
    });

    if (totalCredits > 0) {
      calculatedCgpa = Number((totalPoints / totalCredits).toFixed(2));
    } else if (semesterPerformances.some((s:any) => s.cgpa)) {
      // Fallback if verified calculation fails but cgpa was extracted directly
      const cgpAs = semesterPerformances.map((s:any) => s.cgpa).filter(Boolean);
      if (cgpAs.length > 0) calculatedCgpa = Math.max(...cgpAs);
    }

    // 2. DNA Scores using the exact logic from StudentDNA.tsx
    const techSkills = skills.filter((s: any) => s.skill_type === 'technical' || s.skill_type === 'programming').length;
    const softSkills = skills.filter((s: any) => s.skill_type === 'soft' || s.skill_type === 'communication').length;

    let academic = semesterPerformances.length > 0 ? Math.min(semesterPerformances.length * 10 + 50, 100) : null;
    let coding = (techSkills > 0 || projects > 0) ? Math.min(techSkills * 10 + projects * 10 + 40, 100) : null;
    let problemSolving = (hackathons > 0 || projects > 0) ? Math.min(hackathons * 15 + projects * 10 + 40, 100) : null;
    let leadership = (internships > 0 || workshops > 0) ? Math.min(internships * 20 + workshops * 10 + 40, 100) : null;
    let creativity = (projects > 0 || hackathons > 0) ? Math.min(projects * 15 + hackathons * 10 + 40, 100) : null;
    let communication = (softSkills > 0 || workshops > 0) ? Math.min(softSkills * 15 + workshops * 10 + 40, 100) : null;
    let teamwork = (hackathons > 0 || projects > 0) ? Math.min(hackathons * 15 + projects * 10 + 40, 100) : null;
    let learningSpeed = certs > 0 ? Math.min(certs * 15 + 40, 100) : null;
    let consistency = semesterPerformances.length > 0 ? Math.min(semesterPerformances.length * 10 + projects * 5 + 40, 100) : null;

    const validOverall = [academic, coding, problemSolving, leadership, creativity, communication, teamwork, learningSpeed, consistency].filter(x => x !== null);
    const overall = validOverall.length > 0 ? Math.round(validOverall.reduce((a: any, b: any) => a + b, 0) / validOverall.length) : null;

    let technicalScore = techSkills > 0 ? Math.min(techSkills * 15 + 40, 100) : null;

    return {
      overall_score: overall,
      cgpa: calculatedCgpa,
      coding_score: coding,
      technical_skills_score: technicalScore || coding,
      communication_score: communication,
      projects_count: projects > 0 ? projects : null,
      internships_count: internships > 0 ? internships : null,
      hackathons_count: hackathons > 0 ? hackathons : null
    };
  };

  const getMetric = (data: CompareData | null, path: 'cgpa' | 'coding' | 'technical' | 'communication' | 'projects' | 'internships' | 'hackathons' | 'overall') => {
    if (!data) return null;
    const dynamic = calculateDynamicMetrics(data);
    if (!dynamic) return null;
    
    if (path === 'overall') return dynamic.overall_score;
    if (path === 'cgpa') return dynamic.cgpa;
    if (path === 'coding') return dynamic.coding_score;
    if (path === 'technical') return dynamic.technical_skills_score;
    if (path === 'communication') return dynamic.communication_score;
    
    if (path === 'projects') return dynamic.projects_count;
    if (path === 'internships') return dynamic.internships_count;
    if (path === 'hackathons') return dynamic.hackathons_count;
    
    return null;
  };

  const renderValue = (val: number | null, suffix = '') => {
    if (val === null || val === undefined) return <span className="text-gray-500 text-sm">Not available</span>;
    return <span>{Number.isInteger(val) ? val : val.toFixed(1)}{suffix}</span>;
  };

  const runSimulation = () => {
    if (simCurrent === '' || simTarget === '') return;
    const diff = Number(simTarget) - Number(simCurrent);
    if (diff === 0) {
      setSimResult('No change in target score.');
      return;
    }
    
    // Simple deterministic simulation weight
    const weight = 0.15; // 15% impact
    const projectedChange = diff * weight;
    
    setSimResult(`Projected impact on Overall Growth: ${projectedChange > 0 ? '+' : ''}${projectedChange.toFixed(1)} points.`);
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  // Prepare Radar Data
  const radarData = [
    { subject: 'Academic', A: getMetric(compareDataA, 'cgpa') || 0, B: getMetric(compareDataB, 'cgpa') || 0, fullMark: 10 },
    { subject: 'Coding', A: getMetric(compareDataA, 'coding') || 0, B: getMetric(compareDataB, 'coding') || 0, fullMark: 100 },
    { subject: 'Technical', A: getMetric(compareDataA, 'technical') || 0, B: getMetric(compareDataB, 'technical') || 0, fullMark: 100 },
    { subject: 'Comm.', A: getMetric(compareDataA, 'communication') || 0, B: getMetric(compareDataB, 'communication') || 0, fullMark: 100 },
  ].map(d => ({
    ...d,
    // Normalize Academic to 100 scale for radar visualization
    A_Norm: d.subject === 'Academic' ? d.A * 10 : d.A,
    B_Norm: d.subject === 'Academic' ? d.B * 10 : d.B,
  }));

  const hasRadarData = radarData.some(d => d.A_Norm > 0 || d.B_Norm > 0);

  // Generate Strengths
  const getStrengths = () => {
    const strengthsA = [];
    const strengthsB = [];
    
    if ((getMetric(compareDataA, 'cgpa') || 0) > (getMetric(compareDataB, 'cgpa') || 0)) strengthsA.push('Academic Performance');
    else if ((getMetric(compareDataB, 'cgpa') || 0) > (getMetric(compareDataA, 'cgpa') || 0)) strengthsB.push('Academic Performance');

    if ((getMetric(compareDataA, 'coding') || 0) > (getMetric(compareDataB, 'coding') || 0)) strengthsA.push('Coding Skills');
    else if ((getMetric(compareDataB, 'coding') || 0) > (getMetric(compareDataA, 'coding') || 0)) strengthsB.push('Coding Skills');
    
    if ((getMetric(compareDataA, 'projects') || 0) > (getMetric(compareDataB, 'projects') || 0)) strengthsA.push('Project Experience');
    else if ((getMetric(compareDataB, 'projects') || 0) > (getMetric(compareDataA, 'projects') || 0)) strengthsB.push('Project Experience');

    return { strengthsA, strengthsB };
  };

  const { strengthsA, strengthsB } = hasCompared ? getStrengths() : { strengthsA: [], strengthsB: [] };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <motion.div variants={item} className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Student Growth Comparison</h1>
        <p className="text-gray-400">Compare academic performance, technical skills, achievements and overall growth.</p>
      </motion.div>

      {/* Student Selection */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: 'A', student: studentA, title: 'STUDENT A', isCurrent: true },
          { key: 'B', student: studentB, title: 'STUDENT B', isCurrent: false }
        ].map((slot) => (
          <Card key={slot.key} gradient="mixed" className="relative">
            <h3 className="text-gray-400 text-sm font-semibold mb-4">{slot.title}</h3>
            {slot.student ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                    {slot.student.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">{slot.student.full_name}</h4>
                    <p className="text-gray-400 text-sm">{slot.student.department} • Semester {slot.student.semester}</p>
                    {slot.student.roll_number && <p className="text-gray-500 text-xs">Roll: {slot.student.roll_number}</p>}
                  </div>
                </div>
                {!slot.isCurrent && (
                  <button
                    onClick={() => setIsSearchingB(true)}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm"
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsSearchingB(true)}
                className="w-full py-8 rounded-xl border-2 border-dashed border-white/10 hover:border-purple-500/50 flex flex-col items-center gap-2 text-gray-400 hover:text-purple-400 transition-all bg-black/20"
              >
                <User className="w-8 h-8" />
                <span>Select Student</span>
              </button>
            )}
          </Card>
        ))}
      </motion.div>

      {/* Compare Button */}
      <motion.div variants={item} className="flex justify-center py-4">
        {(!studentA || !studentB) ? (
          <p className="text-gray-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Please select two students to compare.
          </p>
        ) : (
          <button
            onClick={runComparison}
            disabled={isComparing || (studentA._id === studentB._id)}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isComparing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : <GitCompare className="w-5 h-5" />}
            {isComparing ? 'Analyzing student growth...' : 'Compare Students'}
          </button>
        )}
      </motion.div>

      {comparisonError && (
        <motion.div variants={item} className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {comparisonError}
        </motion.div>
      )}

      {/* Results */}
      {hasCompared && compareDataA && compareDataB && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Overall Growth */}
            <Card gradient="blue" className="text-center py-8">
              <h2 className="text-2xl font-bold text-white mb-8">Overall Growth</h2>
              <div className="flex flex-col md:flex-row items-center justify-center gap-12">
                <div className={`p-6 rounded-2xl ${getMetric(compareDataA, 'overall')! >= getMetric(compareDataB, 'overall')! ? 'bg-purple-600/20 border border-purple-500/30' : 'bg-white/5 border border-transparent'}`}>
                  <h3 className="text-gray-400 text-sm font-semibold mb-2">{studentA?.full_name}</h3>
                  <div className="text-5xl font-bold text-white">
                    {renderValue(getMetric(compareDataA, 'overall'), '%')}
                  </div>
                </div>
                
                <GitCompare className="w-12 h-12 text-gray-600" />
                
                <div className={`p-6 rounded-2xl ${getMetric(compareDataB, 'overall')! > getMetric(compareDataA, 'overall')! ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-white/5 border border-transparent'}`}>
                  <h3 className="text-gray-400 text-sm font-semibold mb-2">{studentB?.full_name}</h3>
                  <div className="text-5xl font-bold text-white">
                    {renderValue(getMetric(compareDataB, 'overall'), '%')}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Category Comparison Table */}
              <Card>
                <h3 className="text-white font-semibold mb-4">Performance Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 text-sm">
                        <th className="pb-3 font-medium">Category</th>
                        <th className="pb-3 font-medium text-center">{studentA?.full_name.split(' ')[0]}</th>
                        <th className="pb-3 font-medium text-center">{studentB?.full_name.split(' ')[0]}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        { label: 'Academic (CGPA)', key: 'cgpa' as const },
                        { label: 'Technical Skills', key: 'technical' as const },
                        { label: 'Coding Score', key: 'coding' as const },
                        { label: 'Communication', key: 'communication' as const },
                        { label: 'Projects', key: 'projects' as const },
                        { label: 'Internships', key: 'internships' as const },
                        { label: 'Hackathons', key: 'hackathons' as const },
                      ].map((row) => (
                        <tr key={row.key} className="text-gray-300">
                          <td className="py-4 text-sm font-medium">{row.label}</td>
                          <td className="py-4 text-center text-white font-semibold">
                            {renderValue(getMetric(compareDataA, row.key))}
                          </td>
                          <td className="py-4 text-center text-white font-semibold">
                            {renderValue(getMetric(compareDataB, row.key))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Radar Chart */}
              <Card>
                <h3 className="text-white font-semibold mb-4">Growth Radar</h3>
                {!hasRadarData ? (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Not enough data for visual comparison.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                          formatter={(val: any, name: any) => {
                            // De-normalize for display if it's A_Norm or B_Norm
                            if (name === 'A_Norm') return [Number(val) / 10, studentA?.full_name];
                            if (name === 'B_Norm') return [Number(val) / 10, studentB?.full_name];
                            return [val, name];
                          }}
                        />
                        <Radar name="A_Norm" dataKey="A_Norm" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} />
                        <Radar name="B_Norm" dataKey="B_Norm" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>

            {/* Score Comparison Bars */}
            <Card>
              <h3 className="text-white font-semibold mb-6">Detailed Score Bars</h3>
              <div className="space-y-6">
                {[
                  { label: 'Academic (CGPA)', key: 'cgpa' as const, max: 10 },
                  { label: 'Coding Score', key: 'coding' as const, max: 100 },
                  { label: 'Technical Skills', key: 'technical' as const, max: 100 },
                  { label: 'Communication', key: 'communication' as const, max: 100 },
                ].map(metric => {
                  const valA = getMetric(compareDataA, metric.key);
                  const valB = getMetric(compareDataB, metric.key);
                  
                  // Safe percentages for the bars
                  const pctA = valA !== null ? Math.min((valA / metric.max) * 100, 100) : 0;
                  const pctB = valB !== null ? Math.min((valB / metric.max) * 100, 100) : 0;
                  
                  return (
                    <div key={metric.label} className="grid grid-cols-[150px_1fr] items-center gap-4">
                      <span className="text-sm text-gray-400 font-medium">{metric.label}</span>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-16 truncate">{studentA?.full_name.split(' ')[0]}</span>
                          <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                            {valA !== null && (
                              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${pctA}%` }} />
                            )}
                          </div>
                          <span className="text-sm text-white font-bold w-12 text-right">{renderValue(valA)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-16 truncate">{studentB?.full_name.split(' ')[0]}</span>
                          <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                            {valB !== null && (
                              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${pctB}%` }} />
                            )}
                          </div>
                          <span className="text-sm text-white font-bold w-12 text-right">{renderValue(valB)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths & AI Insights */}
              <Card gradient="purple">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Strength Analysis & Insights
                </h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-gray-400 text-sm mb-2 font-medium">Areas where {studentA?.full_name} leads:</h4>
                    {strengthsA.length > 0 ? (
                      <ul className="space-y-2">
                        {strengthsA.map(s => (
                          <li key={s} className="flex items-center gap-2 text-white text-sm">
                            <Check className="w-4 h-4 text-green-400" /> {s}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">Insufficient data to determine clear advantages.</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-gray-400 text-sm mb-2 font-medium">Areas where {studentB?.full_name} leads:</h4>
                    {strengthsB.length > 0 ? (
                      <ul className="space-y-2">
                        {strengthsB.map(s => (
                          <li key={s} className="flex items-center gap-2 text-white text-sm">
                            <Check className="w-4 h-4 text-blue-400" /> {s}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">Insufficient data to determine clear advantages.</p>
                    )}
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-white font-medium mb-2 text-sm">AI Comparison Insights</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Based on available MongoDB data, {studentA?.full_name} shows 
                      {strengthsA.length > 0 ? ` strong performance in ${strengthsA.join(', ')}` : ' emerging skills'}, 
                      while {studentB?.full_name} demonstrates 
                      {strengthsB.length > 0 ? ` a stronger profile in ${strengthsB.join(', ')}` : ' steady progress'}.
                      Overall Growth Scores reflect their respective focus areas.
                    </p>
                  </div>
                </div>
              </Card>

              {/* What-If Simulator */}
              <Card>
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  Growth Simulator
                </h3>
                <p className="text-xs text-yellow-500 mb-6 font-medium bg-yellow-500/10 inline-block px-2 py-1 rounded">
                  Simulation — not actual student data
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Metric to Improve</label>
                    <select
                      value={simMetric}
                      onChange={(e) => setSimMetric(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option className="bg-gray-900 text-white" value="Coding Score">Coding Score</option>
                      <option className="bg-gray-900 text-white" value="Technical Skills">Technical Skills</option>
                      <option className="bg-gray-900 text-white" value="Communication">Communication</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Current Value</label>
                      <input
                        type="number"
                        value={simCurrent}
                        onChange={(e) => setSimCurrent(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="e.g. 60"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Target Value</label>
                      <input
                        type="number"
                        value={simTarget}
                        onChange={(e) => setSimTarget(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="e.g. 80"
                      />
                    </div>
                  </div>

                  <button
                    onClick={runSimulation}
                    disabled={simCurrent === '' || simTarget === ''}
                    className="w-full py-3 rounded-xl bg-blue-600/20 text-blue-400 font-medium hover:bg-blue-600/30 transition-all disabled:opacity-50"
                  >
                    Simulate Impact
                  </button>

                  {simResult && (
                    <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                      <p className="text-white text-sm font-medium">{simResult}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

          </motion.div>
        </AnimatePresence>
      )}

      {/* Empty State */}
      {!hasCompared && (
        <motion.div variants={item}>
          <Card className="text-center py-20 bg-black/20 border-dashed">
            <GitCompare className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-white font-medium mb-2 text-xl">Compare Student Growth</h3>
            <p className="text-gray-400">Select two students to discover strengths, gaps and growth differences.</p>
          </Card>
        </motion.div>
      )}

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchingB && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-semibold">Select Student B</h3>
                <button onClick={() => { setIsSearchingB(false); setSearchResults([]); setSearchQuery(''); setSearchError(''); }} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, roll number, or department..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    autoFocus
                  />
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2 mt-4">
                  {searchLoading && (
                    <div className="text-center py-8 text-gray-400 flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                      Searching...
                    </div>
                  )}

                  {searchError && (
                    <div className="text-center py-8 text-red-400 flex flex-col items-center gap-2">
                      <AlertCircle className="w-6 h-6" />
                      {searchError}
                    </div>
                  )}

                  {!searchLoading && !searchError && searchResults.map(student => (
                    <button
                      key={student._id}
                      onClick={() => selectStudent(student)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {student.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{student.full_name}</p>
                        <p className="text-gray-400 text-xs truncate">{student.department} • {student.roll_number || 'N/A'}</p>
                      </div>
                      <div className="px-3 py-1 bg-white/5 text-gray-300 text-xs rounded-lg group-hover:bg-purple-600/20 group-hover:text-purple-400 transition-colors">
                        Select
                      </div>
                    </button>
                  ))}
                  
                  {!searchLoading && !searchError && searchQuery.trim() && searchResults.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No other student found
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
