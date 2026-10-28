import { API_URL } from '../lib/api';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Target,
  Award,
  Building2,
  Code,
  MessageSquare,
  BookOpen,
  Briefcase,
  GraduationCap,
  Calendar,
  MapPin,
  Trophy,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CircularProgress, ProgressBar, Badge, StatCard } from '../components/ui';
import { Skill, Project, Certification, Internship, SemesterPerformance } from '../types';

const stageMap: Record<string, 'risk' | 'medium' | 'good' | 'advanced' | 'placement'> = {
  'Risk': 'risk',
  'Medium': 'medium',
  'Good': 'good',
  'Advanced': 'advanced',
  'Placement Ready': 'placement',
};

const aiSuggestions = [
  { id: 1, icon: Briefcase, title: 'Complete 1 internship', description: 'Gain real-world experience to boost your profile', priority: 'high' },
  { id: 2, icon: Code, title: 'Improve React skills', description: 'Focus on hooks and state management', priority: 'medium' },
  { id: 3, icon: Target, title: 'Practice Aptitude', description: 'Daily 30 mins aptitude practice recommended', priority: 'medium' },
  { id: 4, icon: Award, title: 'Complete AWS Certification', description: 'Cloud skills are in high demand', priority: 'high' },
  { id: 5, icon: MessageSquare, title: 'Improve Communication', description: 'Join a public speaking workshop', priority: 'medium' },
];

export function Dashboard() {
  const { profile, growthMetrics, token } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [semesterPerformance, setSemesterPerformance] = useState<SemesterPerformance[]>([]);

  useEffect(() => {
    if (profile?.user_id) {
      fetchData();
    }
  }, [profile?.user_id]);

  const fetchData = async () => {
    if (!token) return;
    
    try {
      const [skillsRes, projectsRes, certsRes, internshipsRes, semRes] = await Promise.all([
        fetch(`${API_URL}/skills`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/certifications`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/internships`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/semesterPerformances`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (skillsRes.ok) setSkills((await skillsRes.json()).slice(0, 5));
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (certsRes.ok) setCertifications(await certsRes.json());
      if (internshipsRes.ok) setInternships(await internshipsRes.json());
      if (semRes.ok) {
        const sems = await semRes.json();
        sems.sort((a: any, b: any) => a.semester - b.semester);
        setSemesterPerformance(sems);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const [cgpa, setCgpa] = useState('0.00');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!profile?.user_id) return;
    
    // First try calculating from semesterPerformance state
    const verifiedSemesters = semesterPerformance.filter((s: any) => s.sgpa && (s.credits_total || s.credits_earned || s.credits));
    if (verifiedSemesters.length > 0) {
      const totalCredits = verifiedSemesters.reduce((acc: number, curr: any) => acc + (curr.credits_total || curr.credits_earned || curr.credits || 0), 0);
      const totalPoints = verifiedSemesters.reduce((acc: number, curr: any) => acc + ((curr.sgpa || 0) * (curr.credits_total || curr.credits_earned || curr.credits || 0)), 0);
      if (totalCredits > 0) {
        setCgpa((totalPoints / totalCredits).toFixed(2));
        setIsVerified(true);
        return;
      }
    }

    const saved = localStorage.getItem(`semester_results_data_${profile.user_id}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const savedVerified = data.filter((s: any) => s.status === 'Verified' && s.sgpa && (s.credits_total || s.credits_earned || s.credits));
        if (savedVerified.length > 0) {
          const totalCredits = savedVerified.reduce((acc: number, curr: any) => acc + (curr.credits_total || curr.credits_earned || curr.credits || 0), 0);
          const totalPoints = savedVerified.reduce((acc: number, curr: any) => acc + ((curr.sgpa || 0) * (curr.credits_total || curr.credits_earned || curr.credits || 0)), 0);
          if (totalCredits > 0) {
            setCgpa((totalPoints / totalCredits).toFixed(2));
            setIsVerified(true);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to parse semester results state', e);
      }
    }
    setCgpa('0.00');
    setIsVerified(false);
  }, [profile?.user_id, semesterPerformance]);


  const latestAttendance = semesterPerformance.length > 0
    ? semesterPerformance[semesterPerformance.length - 1].attendance_percent
    : 0;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item} className="mb-6">
        <h1 className="text-2xl font-bold text-white">Welcome back, {profile?.full_name?.split(' ')[0] || ''}!</h1>
        <p className="text-gray-400">Here's your growth overview</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card gradient="mixed" className="lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-20 h-20 rounded-2xl object-cover border border-purple-500/30 shadow-lg shadow-purple-500/10 flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-purple-500/30 flex-shrink-0">
                {profile?.full_name?.charAt(0) || ''}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{profile?.full_name || ''}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-gray-400 text-sm">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4" />
                  {profile?.department || ''}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Roll: {profile?.roll_number || ''}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Semester {profile?.semester || 1}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant={stageMap[growthMetrics?.growth_stage || 'Medium']}>
                  {growthMetrics?.growth_stage || 'Medium'}
                </Badge>
                <span className="text-gray-500 text-sm">Growth: {(growthMetrics?.overall_score || 0).toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <CircularProgress
                value={growthMetrics?.overall_score || 0}
                size={140}
                strokeWidth={10}
                label="Overall"
                subLabel="Growth Score"
                color="mixed"
              />
            </div>
          </div>
        </Card>

        <Card gradient="green">
          <div className="flex flex-col items-center text-center h-full justify-center">
            <Trophy className="w-10 h-10 text-green-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Achievement Unlocked</p>
            <p className="text-white font-bold text-lg">Rising Star</p>
            <p className="text-gray-500 text-xs mt-1">Complete 5 projects</p>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="CGPA"
          value={cgpa}
          subtitle={isVerified ? '✓ Verified (Locked)' : '🔒 Upload Marksheet to Verify'}
          icon={<GraduationCap className="w-5 h-5 text-purple-400" />}
          gradient="purple"
        />
        <StatCard
          title="Attendance"
          value={`${latestAttendance}%`}
          subtitle="This semester"
          icon={<Target className="w-5 h-5 text-blue-400" />}
          gradient="blue"
        />
        <StatCard
          title="Projects"
          value={projects.length}
          subtitle="Completed"
          icon={<Code className="w-5 h-5 text-green-400" />}
          gradient="green"
        />
        <StatCard
          title="Certifications"
          value={certifications.length}
          subtitle="Earned"
          icon={<Award className="w-5 h-5 text-purple-400" />}
          gradient="purple"
        />
      </motion.div>

      {(() => {
        const approvedDocs = 
          semesterPerformance.filter(s => s.verification_status === 'approved').length +
          certifications.filter(c => c.verification_status === 'approved').length +
          internships.filter(i => i.verification_status === 'approved').length +
          projects.filter(p => p.verification_status === 'approved').length;

        const pendingDocs = 
          semesterPerformance.filter(s => s.verification_status === 'pending' || !s.verification_status).length +
          certifications.filter(c => c.verification_status === 'pending' || !c.verification_status).length +
          internships.filter(i => i.verification_status === 'pending' || !i.verification_status).length +
          projects.filter(p => p.verification_status === 'pending' || !p.verification_status).length;

        const rejectedDocs = 
          semesterPerformance.filter(s => s.verification_status === 'rejected').length +
          certifications.filter(c => c.verification_status === 'rejected').length +
          internships.filter(i => i.verification_status === 'rejected').length +
          projects.filter(p => p.verification_status === 'rejected').length;

        const totalDocs = approvedDocs + pendingDocs + rejectedDocs;
        const verifiedRate = totalDocs > 0 ? `${Math.round((approvedDocs / totalDocs) * 100)}%` : '0%';

        return (
          <motion.div variants={item} className="mt-2 mb-2">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              Document Verification Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Verified Docs"
                value={approvedDocs}
                subtitle="Approved submissions"
                icon={<ShieldCheck className="w-5 h-5 text-green-400" />}
                gradient="green"
              />
              <StatCard
                title="Pending"
                value={pendingDocs}
                subtitle="Awaiting review"
                icon={<ShieldAlert className="w-5 h-5 text-yellow-400" />}
                gradient="mixed"
              />
              <StatCard
                title="Rejected"
                value={rejectedDocs}
                subtitle="Returned submissions"
                icon={<X className="w-5 h-5 text-red-400" />}
                gradient="purple"
              />
              <StatCard
                title="Verification Rate"
                value={verifiedRate}
                subtitle="Approved ratio"
                icon={<Sparkles className="w-5 h-5 text-blue-400" />}
                gradient="blue"
              />
            </div>
          </motion.div>
        );
      })()}

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-purple-400" />
            Top Skills
          </h3>
          <div className="space-y-4">
            {skills.length > 0 ? (
              skills.slice(0, 5).map((skill, index) => (
                <ProgressBar
                  key={skill.id}
                  label={skill.skill_name}
                  value={skill.proficiency}
                  color={
                    index % 3 === 0 ? 'purple' : index % 3 === 1 ? 'blue' : 'green'
                  }
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No skills added yet</p>
                <p className="text-sm">Add skills from the Skills page</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Growth Timeline
          </h3>
          <div className="relative h-40 flex items-end justify-between gap-2 px-2">
            {semesterPerformance.length > 0 ? (
              semesterPerformance.map((data, index) => {
                const heightVal = Math.min(Math.round(((data.sgpa || 0) / 10) * 100), 100);
                return (
                  <motion.div
                    key={data.id || data._id || index}
                    initial={{ height: 0 }}
                    animate={{ height: `${heightVal || 15}%` }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-end"
                  >
                    <div
                      className="w-full bg-gradient-to-t from-purple-600 to-blue-500 rounded-t-lg min-h-[20px] relative group"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                        {data.sgpa ? `SGPA: ${data.sgpa.toFixed(2)}` : 'N/A'}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2">Sem {data.semester}</span>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-10 text-gray-500 w-full">
                <p className="text-sm">No semester results uploaded yet</p>
                <p className="text-xs text-gray-600 mt-1">Upload marksheet to view growth timeline</p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Internships
          </h3>
          {internships.length > 0 ? (
            <div className="space-y-3">
              {internships.slice(0, 3).map((intern) => (
                <div
                  key={intern.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">{intern.company}</p>
                    <p className="text-sm text-gray-400">{intern.role}</p>
                  </div>
                  <Badge variant={intern.is_current ? 'good' : 'medium'}>
                    {intern.is_current ? 'Current' : 'Completed'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No internships yet</p>
              <p className="text-sm">Start your professional journey</p>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-400" />
            Communication Score
          </h3>
          <div className="flex items-center justify-center h-32">
            <CircularProgress
              value={growthMetrics?.communication_score || 0}
              size={120}
              label="Score"
              color="green"
            />
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card gradient="mixed">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI Recommendations
            </h3>
            <button className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition-colors">
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiSuggestions.map((suggestion) => (
              <motion.div
                key={suggestion.id}
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer border border-white/5"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    suggestion.priority === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    <suggestion.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{suggestion.title}</p>
                    <p className="text-sm text-gray-400 mt-1">{suggestion.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Semester Performance
          </h3>
          {semesterPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-sm">
                    <th className="text-left py-2 px-3">Semester</th>
                    <th className="text-left py-2 px-3">SGPA</th>
                    <th className="text-left py-2 px-3">Credits</th>
                    <th className="text-left py-2 px-3">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterPerformance.map((sem) => (
                    <tr key={sem.id} className="text-white border-t border-white/5">
                      <td className="py-3 px-3">Semester {sem.semester}</td>
                      <td className="py-3 px-3 font-medium text-purple-400">{sem.sgpa.toFixed(2)}</td>
                      <td className="py-3 px-3">{sem.credits_earned}/{sem.credits_total}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                              style={{ width: `${sem.attendance_percent}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400">{sem.attendance_percent}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No semester data yet</p>
              <p className="text-sm">Add your academic performance</p>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
