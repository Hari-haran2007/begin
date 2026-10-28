import { API_URL } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, CheckCircle, Clock, XCircle, GraduationCap, 
  Target, Code, TrendingUp, AlertTriangle,
  FileText, Award, Briefcase, FolderKanban, User, Loader2, Trophy, Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function StaffDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    verifiedStudents: 0,
    pendingVerification: 0,
    rejectedRequests: 0,
    averageCgpa: 'N/A',
    placementReady: 0,
    averageSkillScore: null as number | null,
    aiGrowthScore: null as number | null,
    studentsAtRisk: 0 as number | string,
    recentActivities: [] as any[],
    quickActions: {
      pendingSemesterResults: 0,
      pendingCertificates: 0,
      pendingInternships: 0,
      pendingProjects: 0,
      pendingHackathons: 0,
      pendingWorkshops: 0
    }
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/staff/dashboard-stats`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Failed to load dashboard data: ${response.status} ${errText}`);
        }
        
        const data = await response.json();
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        if (err instanceof Error) {
          setError(`Unable to load dashboard data. Details: ${err.message}`);
        } else {
          setError('Unable to load dashboard data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [token]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    const fetchDashboardStats = async () => {
      const authToken = token || localStorage.getItem('token');
      if (!authToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/staff/dashboard-stats`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (!response.ok) {
          throw new Error(`Failed to load dashboard data (${response.status})`);
        }
        const data = await response.json();
        setDashboardData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Unable to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-blue-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-xl font-medium text-gray-300">Loading Dashboard Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-white/5 rounded-2xl border border-white/10 max-w-lg mx-auto">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Unable to Load Dashboard</h3>
        <p className="text-sm text-gray-400 mb-6">{error}</p>
        <button
          onClick={handleRetry}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-lg shadow-blue-500/20"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = [
    { label: 'Total Students', value: dashboardData.totalStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Verified Documents', value: dashboardData.verifiedStudents, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Pending Verification', value: dashboardData.pendingVerification, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Rejected Requests', value: dashboardData.rejectedRequests, icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Average CGPA', value: dashboardData.averageCgpa || 'N/A', icon: GraduationCap, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Placement Ready', value: dashboardData.placementReady ?? 0, icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Avg Skill Score', value: dashboardData.averageSkillScore ? `${dashboardData.averageSkillScore}%` : 'N/A', icon: Code, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { label: 'AI Growth Score', value: dashboardData.aiGrowthScore ? `${dashboardData.aiGrowthScore}/100` : 'N/A', icon: TrendingUp, color: 'text-pink-400', bg: 'bg-pink-400/10' },
    { label: 'Students at Risk', value: dashboardData.studentsAtRisk ?? 'N/A', icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  ];

  const getActivityIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('semester')) return { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' };
    if (t.includes('certificate')) return { icon: Award, color: 'text-purple-400', bg: 'bg-purple-400/10' };
    if (t.includes('project')) return { icon: FolderKanban, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
    if (t.includes('internship')) return { icon: Briefcase, color: 'text-cyan-400', bg: 'bg-cyan-400/10' };
    if (t.includes('hackathon')) return { icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-400/10' };
    if (t.includes('workshop')) return { icon: Calendar, color: 'text-pink-400', bg: 'bg-pink-400/10' };
    return { icon: User, color: 'text-indigo-400', bg: 'bg-indigo-400/10' };
  };

  const handleReviewActivity = (activity: any) => {
    if (activity.verificationRoute) {
      navigate(activity.verificationRoute);
    } else {
      const t = (activity.type || '').toLowerCase();
      if (t.includes('cert')) navigate('/staff/certificates');
      else if (t.includes('intern')) navigate('/staff/internships');
      else if (t.includes('proj')) navigate('/staff/projects');
      else if (t.includes('sem')) navigate('/staff/semester-results');
      else if (t.includes('hack')) navigate('/staff/hackathons');
      else if (t.includes('work')) navigate('/staff/workshops');
      else navigate('/staff/students');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Staff Dashboard</h1>
        <p className="text-gray-400">Overview of student performance and verification statuses.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-sm font-medium text-gray-400">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-6">Recent Activities</h2>
          <div className="space-y-4">
            {dashboardData.recentActivities && dashboardData.recentActivities.length > 0 ? (
              dashboardData.recentActivities.map((activity: any, index: number) => {
                const styling = getActivityIcon(activity.type);
                const IconComponent = styling.icon;
                return (
                  <motion.div
                    key={activity.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl ${styling.bg} ${styling.color} flex items-center justify-center`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{activity.student}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-400">{activity.action}</p>
                          <span className="w-1 h-1 rounded-full bg-gray-600" />
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleReviewActivity(activity)}
                      className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
                    >
                      Review
                    </button>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5">
                <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No recent student activity found</p>
                <p className="text-xs text-gray-500 mt-1">Student submissions and verifications will appear here in real time.</p>
              </div>
            )}
          </div>
        </motion.div>
        
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.6 }}
           className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border border-blue-500/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full" />
          <h2 className="text-xl font-bold text-white mb-2 relative z-10">Quick Actions</h2>
          <p className="text-gray-400 text-sm mb-6 relative z-10">Manage verifications efficiently.</p>
          
          <div className="space-y-3 relative z-10">
            <button 
              onClick={() => navigate('/staff/certificates')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all group"
            >
              <span className="text-white font-medium group-hover:text-blue-400 transition-colors text-sm">Pending Certificates</span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold">{dashboardData.quickActions?.pendingCertificates || 0}</span>
            </button>
            <button 
              onClick={() => navigate('/staff/internships')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all group"
            >
              <span className="text-white font-medium group-hover:text-blue-400 transition-colors text-sm">Pending Internships</span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold">{dashboardData.quickActions?.pendingInternships || 0}</span>
            </button>
            <button 
              onClick={() => navigate('/staff/projects')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all group"
            >
              <span className="text-white font-medium group-hover:text-blue-400 transition-colors text-sm">Pending Projects</span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold">{dashboardData.quickActions?.pendingProjects || 0}</span>
            </button>
            <button 
              onClick={() => navigate('/staff/semester-results')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all group"
            >
              <span className="text-white font-medium group-hover:text-blue-400 transition-colors text-sm">Pending Semester Results</span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold">{dashboardData.quickActions?.pendingSemesterResults || 0}</span>
            </button>
            <button 
              onClick={() => navigate('/staff/ai-risk-analysis')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 transition-all group mt-4"
            >
              <span className="text-white font-medium group-hover:text-red-400 transition-colors text-sm">Review Risk Students ({dashboardData.studentsAtRisk ?? 0})</span>
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
