import { API_URL } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, User, Mail, Hash, BookOpen, Target, 
  Award, Briefcase, FolderKanban, Code, Trophy, 
  Presentation, CheckCircle, XCircle, Clock, FileText,
  TrendingUp, Sparkles
} from 'lucide-react';
import { Profile, GrowthMetrics, SemesterPerformance } from '../../types';

export default function StaffStudentProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [growth, setGrowth] = useState<GrowthMetrics | null>(null);
  const [semesters, setSemesters] = useState<SemesterPerformance[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) fetchStudentDetails(id);
  }, [id]);

  const fetchStudentDetails = async (userId: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/staff/students/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text}`);
      }
      
      const data = await response.json();
      
      if (data.profile) setProfile(data.profile);
      if (data.growth) setGrowth(data.growth);
      if (data.semesters) setSemesters(data.semesters);
      if (data.certificates) setCertificates(data.certificates);
      if (data.projects) setProjects(data.projects);
      if (data.internships) setInternships(data.internships);
      if (data.skills) setSkills(data.skills);
      
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred fetching student details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <div className="text-white text-center py-20">Student not found.</div>;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'academics', label: 'Academics', icon: BookOpen },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'internships', label: 'Internships', icon: Briefcase },
    { id: 'skills', label: 'Skills', icon: Code },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link to="/staff/students" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
        <ChevronLeft className="w-4 h-4" /> Back to Students
      </Link>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
        
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.full_name} className="w-32 h-32 rounded-3xl object-cover border-2 border-blue-500/30 shadow-xl shadow-blue-500/20 z-10" />
        ) : (
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-5xl font-bold text-white shadow-xl shadow-blue-500/20 z-10">
            {profile.full_name.charAt(0)}
          </div>
        )}
        
        <div className="flex-1 z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{profile.full_name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1"><Hash className="w-4 h-4 text-blue-400" /> {profile.roll_number}</span>
                <span className="flex items-center gap-1"><Mail className="w-4 h-4 text-purple-400" /> {profile.email}</span>
                <span className="flex items-center gap-1"><BookOpen className="w-4 h-4 text-emerald-400" /> {profile.department} (Sem {profile.semester})</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-gray-400">Current Status</p>
                <p className={`font-bold text-lg ${growth?.growth_stage === 'Placement Ready' ? 'text-emerald-400' : growth?.growth_stage === 'Risk' ? 'text-red-400' : 'text-blue-400'}`}>
                  {growth?.growth_stage || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto custom-scrollbar gap-2 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {activeTab === 'overview' && (
          <>
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" /> Growth Trajectory
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Overall Score', value: growth?.overall_score || 0, color: 'text-blue-400' },
                    { label: 'Technical Score', value: growth?.technical_skills_score || 0, color: 'text-purple-400' },
                    { label: 'Comm. Score', value: growth?.communication_score || 0, color: 'text-emerald-400' },
                    { label: 'Aptitude Score', value: growth?.aptitude_score || 0, color: 'text-orange-400' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-black/20 rounded-xl p-4 border border-white/5">
                      <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}%</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Sparkles className="w-24 h-24 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 relative z-10">AI Insights & Suggestions</h3>
                <p className="text-gray-400 text-sm mb-4 relative z-10">System generated analysis based on recent activities.</p>
                <div className="space-y-3 relative z-10">
                  <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                    <p className="text-white text-sm">Student is performing consistently in technical subjects but lacks soft skill certifications.</p>
                  </div>
                  <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                    <p className="text-white text-sm">Recommendation: Encourage participation in upcoming communication workshops to boost placement readiness.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Latest Semester (Sem {semesters[0]?.semester || profile.semester})</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">CGPA</span>
                      <span className="text-white font-bold">{semesters[0]?.sgpa || 'N/A'}</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(semesters[0]?.sgpa / 10) * 100 || 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Attendance</span>
                      <span className="text-white font-bold">{semesters[0]?.attendance_percent || 'N/A'}%</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${semesters[0]?.attendance_percent || 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Pending Verifications</h3>
                {(() => {
                  const pendingSems = semesters.filter(s => s.verification_status === 'pending');
                  const pendingCerts = certificates.filter(c => c.verification_status === 'pending');
                  const pendingProjs = projects.filter(p => p.verification_status === 'pending');
                  const pendingInterns = internships.filter(i => i.verification_status === 'pending');
                  const totalPending = pendingSems.length + pendingCerts.length + pendingProjs.length + pendingInterns.length;

                  if (totalPending === 0) {
                    return <p className="text-gray-400 text-sm">No pending verifications for this student.</p>;
                  }

                  return (
                    <div className="space-y-3">
                      {pendingSems.map(s => (
                        <div key={s._id || s.id} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-yellow-500/20">
                          <div className="flex items-center gap-3 text-sm">
                            <FileText className="w-4 h-4 text-purple-400" />
                            <span className="text-gray-300">Semester {s.semester} Marksheet</span>
                          </div>
                          <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">Pending</span>
                        </div>
                      ))}
                      {pendingCerts.map(c => (
                        <div key={c._id || c.id} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-yellow-500/20">
                          <div className="flex items-center gap-3 text-sm">
                            <Award className="w-4 h-4 text-yellow-500" />
                            <span className="text-gray-300">{c.name}</span>
                          </div>
                          <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">Pending</span>
                        </div>
                      ))}
                      {pendingProjs.map(p => (
                        <div key={p._id || p.id} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-yellow-500/20">
                          <div className="flex items-center gap-3 text-sm">
                            <FolderKanban className="w-4 h-4 text-yellow-500" />
                            <span className="text-gray-300">{p.title}</span>
                          </div>
                          <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">Pending</span>
                        </div>
                      ))}
                      {pendingInterns.map(i => (
                        <div key={i._id || i.id} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-yellow-500/20">
                          <div className="flex items-center gap-3 text-sm">
                            <Briefcase className="w-4 h-4 text-blue-400" />
                            <span className="text-gray-300">{i.role} at {i.company}</span>
                          </div>
                          <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">Pending</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'academics' && (
          <div className="md:col-span-3 space-y-4">
            {semesters.length > 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-gray-400 text-sm border-b border-white/10">
                      <th className="text-left py-3 px-4">Semester</th>
                      <th className="text-left py-3 px-4">SGPA</th>
                      <th className="text-left py-3 px-4">Credits</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semesters.map(s => (
                      <tr key={s._id || s.id} className="text-white border-b border-white/5 last:border-0">
                        <td className="py-3 px-4">Semester {s.semester}</td>
                        <td className="py-3 px-4 font-bold text-purple-400">{s.sgpa || 'N/A'}</td>
                        <td className="py-3 px-4">{s.credits_earned || s.credits_total || s.credits || 0}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.verification_status === 'approved' ? 'bg-green-500/20 text-green-400' : s.verification_status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {s.verification_status || 'verified'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl text-gray-400">
                No academic records uploaded by this student.
              </div>
            )}
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.length > 0 ? (
              certificates.map(c => (
                <div key={c._id || c.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-bold">{c.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.verification_status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {c.verification_status || 'approved'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{c.issuer}</p>
                  {c.issue_date && <p className="text-xs text-gray-500 mt-2">Issued: {new Date(c.issue_date).toLocaleDateString()}</p>}
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-12 bg-white/5 border border-white/10 rounded-2xl text-gray-400">
                No certificates submitted.
              </div>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.length > 0 ? (
              projects.map(p => (
                <div key={p._id || p.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-bold">{p.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${p.verification_status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {p.verification_status || 'approved'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">{p.description}</p>
                  {p.technologies && p.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.technologies.map((t: string, idx: number) => (
                        <span key={idx} className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-12 bg-white/5 border border-white/10 rounded-2xl text-gray-400">
                No projects submitted.
              </div>
            )}
          </div>
        )}

        {activeTab === 'internships' && (
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {internships.length > 0 ? (
              internships.map(i => (
                <div key={i._id || i.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-bold">{i.role}</h4>
                      <p className="text-sm text-blue-400">{i.company}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      (i.verification_status === 'approved' || i.verification_status === 'Verified') ? 'bg-green-500/20 text-green-400' :
                      (i.verification_status === 'rejected' || i.verification_status === 'Rejected') ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {i.verification_status === 'approved' || i.verification_status === 'Verified' ? 'Verified' : (i.verification_status === 'rejected' || i.verification_status === 'Rejected' ? 'Rejected' : 'Pending')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{new Date(i.start_date).toLocaleDateString()} - {i.is_current ? 'Present' : i.end_date ? new Date(i.end_date).toLocaleDateString() : 'Completed'}</p>
                  {i.description && <p className="text-sm text-gray-300 mt-2">{i.description}</p>}
                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-white/5 text-xs">
                    {i.file_url ? (
                      <a
                        href={i.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Uploaded Proof
                      </a>
                    ) : (
                      <span className="text-gray-500 italic">No document attached</span>
                    )}
                    {i.url && (
                      <a
                        href={i.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white inline-flex items-center gap-1"
                      >
                        External Link
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-12 bg-white/5 border border-white/10 rounded-2xl text-gray-400">
                No internships submitted.
              </div>
            )}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-6">
            {skills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {skills.map(s => (
                  <div key={s._id || s.id} className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">{s.skill_name}</span>
                      <span className="text-xs text-purple-400 font-bold">{s.proficiency}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${s.proficiency}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                No skills added.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
