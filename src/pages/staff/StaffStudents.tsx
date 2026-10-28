import { API_URL } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, User, TrendingUp, Target, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Profile, GrowthMetrics, SemesterPerformance } from '../../lib/supabase';

type StudentData = Profile & {
  _id?: string;
  user_id?: string;
  growth_metrics?: GrowthMetrics;
  latest_performance?: SemesterPerformance;
  certificates_count?: number;
  skills_count?: number;
};

export default function StaffStudents() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/staff/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: Failed to fetch students`);
      }
      const data = await response.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred fetching students');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const name = (student.full_name || '').toLowerCase();
    const roll = (student.roll_number || '').toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch = name.includes(query) || roll.includes(query);
    const matchesDept = departmentFilter === 'All' || student.department === departmentFilter;
    const matchesSem = semesterFilter === 'All' || (student.semester != null && student.semester.toString() === semesterFilter);
    const matchesStatus = statusFilter === 'All' || 
                          (statusFilter === 'Placement Ready' && (student.growth_metrics?.growth_stage === 'Placement Ready' || (student.growth_metrics?.overall_score || 0) >= 70)) ||
                          (statusFilter === 'Risk' && (student.growth_metrics?.growth_stage === 'Risk' || (student.growth_metrics?.overall_score != null && student.growth_metrics.overall_score > 0 && student.growth_metrics.overall_score < 40)));
                          
    return matchesSearch && matchesDept && matchesSem && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Student Management</h1>
          <p className="text-gray-400">Monitor and manage all student profiles and academic growth.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400">Search Students</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or Register No..."
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400">Department</label>
          <select 
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
          >
            <option value="All">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Information Technology">Information Technology</option>
            <option value="AI & Data Science">AI & Data Science</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400">Semester</label>
          <select 
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
          >
            <option value="All">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400">Status Filter</label>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Placement Ready">Placement Ready</option>
            <option value="Risk">At Risk</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={fetchStudents} className="px-4 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-500 cursor-pointer">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.length > 0 ? filteredStudents.map((student, index) => {
            const studentId = student.user_id || student._id || student.id;
            return (
              <motion.div
                key={studentId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all flex flex-col"
              >
                <div className="flex items-start gap-4 mb-4">
                  {student.avatar_url ? (
                    <img src={student.avatar_url} alt={student.full_name} className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-blue-900/20">
                      {student.full_name ? student.full_name.charAt(0) : 'S'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{student.full_name}</h3>
                    <p className="text-sm text-gray-400">{student.roll_number}</p>
                    <p className="text-xs text-blue-400 font-medium mt-1">{student.department} • Sem {student.semester}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> CGPA</div>
                    <div className="text-lg font-bold text-white">{student.latest_performance?.sgpa || 'N/A'}</div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Growth Score</div>
                    <div className="text-lg font-bold text-emerald-400">{student.growth_metrics?.overall_score || 0}%</div>
                  </div>
                  <div className="col-span-2 bg-black/20 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                    <div className="text-xs text-gray-500 flex items-center gap-1">Status</div>
                    {student.growth_metrics?.growth_stage === 'Risk' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-md">
                        <AlertTriangle className="w-3 h-3" /> At Risk
                      </span>
                    ) : student.growth_metrics?.growth_stage === 'Placement Ready' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
                        <ShieldCheck className="w-3 h-3" /> Placement Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md">
                        <TrendingUp className="w-3 h-3" /> On Track
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-2">
                  <Link 
                    to={`/staff/students/${studentId}`} 
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors text-center shadow-lg shadow-blue-500/20 flex items-center justify-center cursor-pointer"
                  >
                    Open Profile
                  </Link>
                </div>
              </motion.div>
            );
          }) : (
            <div className="col-span-full py-20 text-center">
              <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No students found matching your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination Placeholder */}
      <div className="flex items-center justify-center gap-2 pt-4">
        <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-50 cursor-pointer"><ChevronLeft className="w-5 h-5" /></button>
        <button className="w-10 h-10 rounded-lg bg-blue-600 text-white font-medium cursor-pointer">1</button>
        <button className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white font-medium cursor-pointer">2</button>
        <button className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white font-medium cursor-pointer">3</button>
        <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white disabled:opacity-50 cursor-pointer"><ChevronRight className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
