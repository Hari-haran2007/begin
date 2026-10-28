import { API_URL } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

import { 
  Target, TrendingUp, Building2, Briefcase, GraduationCap, 
  Lightbulb, AlertTriangle, CheckCircle, Sparkles, AlertCircle
} from 'lucide-react';
import { CircularProgress, ProgressBar, Card } from '../components/ui';

export function PlacementPrediction() {
  const { profile, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>({
    placementReadiness: null,
    dreamCompanyMatch: null,
    internshipProbability: null,
    higherStudies: null,
    entrepreneurship: null,
  });

  const [hasData, setHasData] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Medium' | 'High' | null>(null);
  const [semestersList, setSemestersList] = useState<any[]>([]);

  useEffect(() => {
    if (profile?._id || profile?.id || profile?.user_id) {
      calculatePredictions();
    }
  }, [profile?._id, profile?.id, profile?.user_id]);

  const calculatePredictions = async () => {
    setLoading(true);
    setError(null);

    if (!token) {
      setError('Authentication token not found.');
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    let skills = [], projects = [], certs = [], internships = [], hackathons = [], workshops = [], semesters = [];

    try {
      const [skillsRes, projectsRes, certsRes, internshipsRes, hackathonsRes, workshopsRes, semRes] = await Promise.all([
        fetch(`${API_URL}/skills`, { headers }),
        fetch(`${API_URL}/projects`, { headers }),
        fetch(`${API_URL}/certifications`, { headers }),
        fetch(`${API_URL}/internships`, { headers }),
        fetch(`${API_URL}/hackathons`, { headers }),
        fetch(`${API_URL}/workshops`, { headers }),
        fetch(`${API_URL}/semesterPerformances`, { headers })
      ]);

      if (!skillsRes.ok || !projectsRes.ok || !certsRes.ok || !internshipsRes.ok || !hackathonsRes.ok || !workshopsRes.ok || !semRes.ok) {
        throw new Error('Failed to fetch one or more data points.');
      }

      skills = await skillsRes.json();
      projects = await projectsRes.json();
      certs = await certsRes.json();
      internships = await internshipsRes.json();
      hackathons = await hackathonsRes.json();
      workshops = await workshopsRes.json();
      semesters = await semRes.json();
      semesters.sort((a: any, b: any) => a.semester - b.semester);
      setSemestersList(semesters);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data.');
      setLoading(false);
      return;
    }

    const techSkills = skills.filter((s: any) => s.skill_type === 'technical' || s.skill_type === 'programming').length;
    const softSkills = skills.filter((s: any) => s.skill_type === 'soft' || s.skill_type === 'communication').length;

    const hasAnyData = skills.length > 0 || projects.length > 0 || certs.length > 0 || internships.length > 0 || hackathons.length > 0 || workshops.length > 0 || semesters.length > 0;
    setHasData(hasAnyData);

    if (!hasAnyData) {
      setMetrics({
        placementReadiness: null,
        dreamCompanyMatch: null,
        internshipProbability: null,
        higherStudies: null,
        entrepreneurship: null,
      });
      setRiskLevel(null);
      setAiSuggestions([]);
      setTimeout(() => setLoading(false), 500);
      return;
    }

    let verifiedSems = semesters.filter((s: any) => s.sgpa && (s.credits_total || s.credits_earned || s.credits));
    let totalCreds = verifiedSems.reduce((a: number, c: any) => a + (c.credits_total || c.credits_earned || c.credits || 0), 0);
    let totalPts = verifiedSems.reduce((a: number, c: any) => a + ((c.sgpa || 0) * (c.credits_total || c.credits_earned || c.credits || 0)), 0);
    let cgpa = totalCreds > 0 ? totalPts / totalCreds : (semesters.some((s: any) => s.cgpa) ? Math.max(...semesters.map((s: any) => s.cgpa).filter(Boolean)) : 0);

    const hasAcademic = semesters.length > 0;
    const hasProjects = projects.length > 0;
    const hasInternships = internships.length > 0;
    const hasTechSkills = techSkills > 0;
    const hasHackathons = hackathons.length > 0;
    const hasSoftSkills = softSkills > 0;
    const hasCerts = certs.length > 0;

    let placement = (hasAcademic || hasProjects || hasInternships) 
      ? Math.min((cgpa * 4) + (projects.length * 10) + (internships.length * 15) + 30, 100) 
      : null;

    let dream = (hasAcademic && hasTechSkills && hasHackathons)
      ? Math.min((cgpa * 5) + (techSkills * 5) + (hackathons.length * 15) + 20, 100)
      : null;

    let internProb = (hasProjects || hasSoftSkills)
      ? Math.min((projects.length * 15) + (softSkills * 10) + 40, 100)
      : null;

    let higherStudy = (hasAcademic || hasCerts)
      ? Math.min((cgpa * 6) + (certs.length * 10) + 30, 100)
      : null;

    let startup = (hasHackathons || hasProjects)
      ? Math.min((hackathons.length * 20) + (projects.length * 15) + 30, 100)
      : null;

    setMetrics({
      placementReadiness: placement !== null ? Math.round(placement) : null,
      dreamCompanyMatch: dream !== null ? Math.round(dream) : null,
      internshipProbability: internProb !== null ? Math.round(internProb) : null,
      higherStudies: higherStudy !== null ? Math.round(higherStudy) : null,
      entrepreneurship: startup !== null ? Math.round(startup) : null,
    });

    if (placement === null) {
      setRiskLevel(null);
    } else if (placement < 50) {
      setRiskLevel('High');
    } else if (placement < 75) {
      setRiskLevel('Medium');
    } else {
      setRiskLevel('Low');
    }

    let suggestions = [];
    if (placement !== null || internProb !== null) {
      if (techSkills < 5) suggestions.push('Improve DSA and Core Subjects.');
      if (certs.length < 2) suggestions.push('Complete AWS or Azure Certification.');
      if (projects.length < 3) suggestions.push('Build one Full Stack Project to showcase skills.');
      if (softSkills < 3) suggestions.push('Practice Aptitude and Communication Skills.');
      if (internships.length === 0) suggestions.push('Apply for a Summer Internship immediately.');
      
      if (suggestions.length === 0) {
        suggestions.push('Keep up the excellent work! You are highly placement ready.');
        suggestions.push('Start contributing to Open Source projects.');
      }
    }

    setAiSuggestions(suggestions);
    setTimeout(() => setLoading(false), 1200);
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full flex items-center justify-center">
          <span className="text-red-500 font-bold text-xl">!</span>
        </div>
        <p className="text-red-400 font-medium">{error}</p>
        <button 
          onClick={calculatePredictions}
          className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors mt-4"
        >
          Retry Prediction
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-purple-400 font-medium animate-pulse">Running Prediction Models...</p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4">
        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
          <Target className="w-10 h-10 text-blue-400" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center">Placement Prediction is not ready yet</h2>
        <p className="text-gray-400 max-w-md text-center">
          Add your academic records, skills, projects, internships and achievements to generate your personalized prediction.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mt-4">
          <button onClick={() => window.location.href='/semester-results'} className="px-6 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors">
            Upload Semester Results
          </button>
          <button onClick={() => window.location.href='/skills'} className="px-6 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors">
            Add Skills
          </button>
          <button onClick={() => window.location.href='/projects'} className="px-6 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors">
            Add Projects
          </button>
          <button onClick={() => window.location.href='/profile'} className="px-6 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors">
            Complete Profile
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 pb-20">
      
      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row gap-6 items-center bg-gradient-to-br from-blue-900/40 via-black/40 to-indigo-900/40 p-8 rounded-3xl border border-white/10 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl" />
        
        <div className="flex-1 relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium mb-4">
            <Target className="w-4 h-4" /> AI Analytics Engine
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Placement Prediction</h1>
          <p className="text-lg text-gray-300 leading-relaxed max-w-2xl">
            Real-time forecasting based on your complete academic and extracurricular footprint.
          </p>
        </div>

        <div className="relative z-10 flex gap-6 justify-center">
          <div className="text-center">
            <CircularProgress value={metrics.placementReadiness || 0} size={140} strokeWidth={10} label="Placement" subLabel="Readiness %" color="blue" />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metrics & Risk */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PredictionCard icon={Building2} title="Dream Company Match" score={metrics.dreamCompanyMatch} color="purple" />
            <PredictionCard icon={Briefcase} title="Internship Probability" score={metrics.internshipProbability} color="green" />
            <PredictionCard icon={GraduationCap} title="Higher Studies Readiness" score={metrics.higherStudies} color="blue" />
            <PredictionCard icon={Lightbulb} title="Entrepreneurship Potential" score={metrics.entrepreneurship} color="orange" />
          </motion.div>

          {/* Growth Timeline / Placement Graph */}
          {metrics.placementReadiness !== null && (
            <motion.div variants={item}>
              <Card>
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Growth Timeline & Placement Graph
                </h3>
                <div className="relative h-48 bg-black/20 rounded-xl border border-white/5 flex items-end justify-between p-4 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none" />
                  {semestersList.length > 0 ? (
                    semestersList.map((sem, idx) => {
                      const semScore = Math.min(Math.round(((sem.sgpa || 0) / 10) * 100), 100);
                      return (
                        <div key={idx} className="flex flex-col items-center gap-2 relative z-10 w-full">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${semScore || 20}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                            className="w-1/2 md:w-8 bg-gradient-to-t from-blue-600 to-purple-500 rounded-t-lg group-hover:opacity-80 transition-opacity"
                          />
                          <span className="text-xs text-gray-400 hidden sm:block">Sem {sem.semester}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full text-gray-500 text-sm">
                      <p>Upload semester marksheets to view academic progression graph.</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right Column: Risk & AI Suggestions */}
        <div className="space-y-6">
          {riskLevel && (
            <motion.div variants={item}>
              <Card gradient={riskLevel === 'Low' ? 'green' : riskLevel === 'Medium' ? 'mixed' : 'purple'}>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${riskLevel === 'Low' ? 'text-green-400' : riskLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`} />
                  Risk Meter
                </h3>
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-white mb-2">{riskLevel} Risk</div>
                  <p className="text-sm text-gray-300 text-center">
                    {riskLevel === 'Low' ? 'You are on a very safe path to secure a placement.' : 
                     riskLevel === 'Medium' ? 'You have decent chances but need to focus on weak areas.' : 
                     'Critical action required. Focus heavily on upskilling.'}
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {aiSuggestions.length > 0 && (
            <motion.div variants={item}>
              <Card>
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  AI Action Plan
                </h3>
                <div className="space-y-4">
                  {aiSuggestions.map((sug, idx) => (
                    <div key={idx} className="flex gap-3 bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <p className="text-sm text-gray-300">{sug}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

    </motion.div>
  );
}

function PredictionCard({ icon: Icon, title, score, color }: { icon: any, title: string, score: number | null, color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-500 text-blue-400',
    purple: 'from-purple-500 to-fuchsia-500 text-purple-400',
    green: 'from-emerald-500 to-green-500 text-emerald-400',
    orange: 'from-orange-500 to-red-500 text-orange-400',
  };

  const bgGradient = colorMap[color].split(' ').slice(0,2).join(' ');
  const textColor = colorMap[color].split(' ')[2];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all group relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none`} />
      
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${textColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="text-gray-300 font-medium group-hover:text-white transition-colors">{title}</h4>
      </div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-end mb-2">
          <span className={`text-3xl font-bold ${textColor}`}>{score !== null ? `${score}%` : 'N/A'}</span>
          {score === null && <span className="text-xs text-gray-400">Insufficient data</span>}
        </div>
        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: score !== null ? `${score}%` : '0%' }}
            transition={{ duration: 1, delay: 0.2 }}
            className={`h-full bg-gradient-to-r ${bgGradient}`}
          />
        </div>
      </div>
    </div>
  );
}
