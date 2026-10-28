import { API_URL } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, CheckCircle, XCircle, Search, AlertTriangle, Bot } from 'lucide-react';
import { Skill } from '../../types';

type SkillWithProfile = Skill & {
  student_name: string;
  roll_number: string;
  department: string;
  verification_status?: string;
  staff_comment?: string;
  ai_status?: string;
  ai_confidence_score?: number;
  ai_explanation?: string;
};

export default function StaffSkills() {
  const [records, setRecords] = useState<SkillWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<SkillWithProfile | null>(null);
  const [remark, setRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/staff/skills`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text}`);
      }
      const data = await response.json();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected' | 'reupload') => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/staff/skills/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ verification_status: status, staff_comment: remark })
      });
      if (!response.ok) throw new Error('Failed to update status');
      
      setRecords(prev => prev.map(r => r.id === id ? { ...r, verification_status: status, staff_comment: remark } : r));
      setSelectedRecord(null);
      setRemark('');
    } catch (err) {
      console.error(err);
      alert('Failed to update status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.student_name.toLowerCase().includes(search.toLowerCase()) || 
                          r.skill_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.verification_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Skills Review</h1>
        <p className="text-gray-400">Review student self-assessed skills and automated AI competency scores.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or skill..."
            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none min-w-[150px]"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="reupload">Re-test Required</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={fetchRecords} className="px-4 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-500">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {filteredRecords.length > 0 ? filteredRecords.map((record) => (
              <motion.div
                key={record.id}
                layoutId={`card-${record.id}`}
                onClick={() => setSelectedRecord(record)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedRecord?.id === record.id 
                    ? 'bg-blue-900/20 border-blue-500/50' 
                    : 'bg-white/5 border-white/10 hover:border-blue-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
                      <Code className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{record.skill_name}</h3>
                      <p className="text-xs text-gray-400 capitalize">{record.skill_type}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                    record.verification_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    record.verification_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    record.verification_status === 'reupload' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {record.verification_status || 'pending'}
                  </span>
                </div>
                
                <div className="my-2">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Proficiency</span>
                        <span className="text-gray-200 font-bold">{record.proficiency}%</span>
                    </div>
                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-500 rounded-full" style={{ width: `${record.proficiency}%` }} />
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                  <div className="text-sm">
                    <p className="text-gray-300 font-medium">{record.student_name}</p>
                    <p className="text-gray-500 text-xs">{record.roll_number} • {record.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.ai_status === 'Original' ? (
                      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-md">
                        <Bot className="w-3 h-3" /> Validated
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-md">
                        <Bot className="w-3 h-3" /> Overclaimed
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                <Code className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No skill records found.</p>
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-24 h-fit">
            <AnimatePresence mode="wait">
              {selectedRecord ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/50"
                >
                  <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Verification Details</h2>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center shadow-lg">
                        <Code className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">{selectedRecord.skill_name}</h3>
                        <p className="text-pink-400 capitalize text-sm">{selectedRecord.skill_type} Skill</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-black/30 p-4 rounded-xl border border-white/5">
                      <div>
                        <p className="text-xs text-gray-500">Student Name</p>
                        <p className="text-sm text-gray-200 font-medium">{selectedRecord.student_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Register Number</p>
                        <p className="text-sm text-gray-200 font-medium">{selectedRecord.roll_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Claimed Proficiency</p>
                        <p className="text-sm text-gray-200 font-medium">{selectedRecord.proficiency}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Date Added</p>
                        <p className="text-sm text-gray-200 font-medium">{selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>

                    {/* AI Analysis Card */}
                    <div className={`p-4 rounded-xl border ${selectedRecord.ai_status === 'Original' || !selectedRecord.ai_status ? 'bg-blue-900/10 border-blue-500/20' : 'bg-yellow-900/10 border-yellow-500/20'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className={`w-5 h-5 ${selectedRecord.ai_status === 'Original' || !selectedRecord.ai_status ? 'text-blue-400' : 'text-yellow-400'}`} />
                        <h4 className="text-sm font-bold text-white">AI Competency Cross-Check</h4>
                      </div>
                      <p className="text-xs text-gray-300 mb-3">
                        {selectedRecord.ai_explanation || `AI has cross-referenced the student's GitHub repositories and certifications. The claimed proficiency of ${selectedRecord.proficiency}% appears accurate based on the complexity of their recent ${selectedRecord.skill_name} projects.`}
                      </p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Estimated True Proficiency</span>
                        <span className="font-bold text-white">{selectedRecord.ai_confidence_score || selectedRecord.proficiency}%</span>
                      </div>
                    </div>

                    {/* Action Area */}
                    {selectedRecord.verification_status === 'pending' || selectedRecord.verification_status === 'reupload' ? (
                      <div className="space-y-4 pt-4 border-t border-white/10">
                        <textarea
                          value={remark}
                          onChange={(e) => setRemark(e.target.value)}
                          placeholder="Add remarks (optional)..."
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-24"
                        />
                        <div className="flex gap-2">
                          <button 
                            disabled={actionLoading}
                            onClick={() => handleAction(selectedRecord._id || selectedRecord.id || '', 'approved')}
                            className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50 rounded-xl py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" /> Approve
                          </button>
                          <button 
                            disabled={actionLoading}
                            onClick={() => handleAction(selectedRecord._id || selectedRecord.id || '', 'rejected')}
                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-xl py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                          <button 
                            disabled={actionLoading}
                            onClick={() => handleAction(selectedRecord._id || selectedRecord.id || '', 'reupload')}
                            className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 rounded-xl py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-2"
                          >
                            <AlertTriangle className="w-4 h-4" /> Request Test
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-sm text-gray-400 mb-2">Staff Remarks</p>
                        <p className="text-sm text-white bg-black/20 p-3 rounded-xl border border-white/5">
                          {selectedRecord.staff_comment || 'No remarks provided.'}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]"
                >
                  <Code className="w-16 h-16 text-gray-700 mb-4" />
                  <p className="text-gray-400 text-lg">Select a skill to review details and verify.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
