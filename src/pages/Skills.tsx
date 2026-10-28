import { API_URL } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Zap,
  MessageSquare,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, ProgressBar } from '../components/ui';
import { Skill } from '../types';
const skillTypes = [
  { value: 'technical', label: 'Technical', icon: Code, color: 'purple' },
  { value: 'programming', label: 'Programming', icon: Zap, color: 'blue' },
  { value: 'soft', label: 'Soft Skills', icon: Users, color: 'green' },
  { value: 'communication', label: 'Communication', icon: MessageSquare, color: 'purple' },
] as const;

const skillColors: Record<string, 'purple' | 'blue' | 'green'> = {
  technical: 'purple',
  programming: 'blue',
  soft: 'green',
  communication: 'purple',
};

const predefinedSkills = {
  technical: ['React', 'Node.js', 'Python', 'AWS', 'Docker', 'MongoDB', 'PostgreSQL', 'Git', 'Linux', 'Kubernetes'],
  programming: ['JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'Swift', 'Kotlin', 'R', 'MATLAB'],
  soft: ['Leadership', 'Teamwork', 'Problem Solving', 'Time Management', 'Critical Thinking', 'Adaptability'],
  communication: ['Public Speaking', 'Technical Writing', 'Presentation', 'Negotiation', 'Active Listening'],
};

export function Skills() {
  const { profile, refreshProfile, token } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    skill_name: '',
    skill_type: 'technical' as Skill['skill_type'],
    proficiency: 50,
  });
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (profile?.user_id) {
      fetchSkills();
    }
  }, [profile?.user_id]);

  const fetchSkills = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/skills`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
      }
    } catch (err) {
      console.error('Error fetching skills:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);

    try {
      const url = editingId 
        ? `${API_URL}/skills/${editingId}`
        : `${API_URL}/skills`;
      
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          skill_name: formData.skill_name,
          skill_type: formData.skill_type,
          proficiency: formData.proficiency,
        })
      });

      if (res.ok) {
        await fetchSkills();
        await refreshProfile();
        setIsAdding(false);
        setEditingId(null);
        setFormData({ skill_name: '', skill_type: 'technical', proficiency: 50 });
      }
    } catch (err) {
      console.error('Error saving skill:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (skill: Skill) => {
    setFormData({
      skill_name: skill.skill_name,
      skill_type: skill.skill_type,
      proficiency: skill.proficiency,
    });
    setEditingId(skill._id || skill.id || null);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/skills/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchSkills();
        await refreshProfile();
      }
    } catch (err) {
      console.error('Error deleting skill:', err);
    }
  };

  const filteredSkills = filter === 'all'
    ? skills
    : skills.filter(s => s.skill_type === filter);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
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
      className="max-w-5xl mx-auto space-y-6"
    >
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Skills</h1>
          <p className="text-gray-400">Track your technical and soft skills</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/30"
          >
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        )}
      </motion.div>

      <motion.div variants={item}>
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-purple-600/30 text-purple-400 border border-purple-500/50'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
            }`}
          >
            All Skills ({skills.length})
          </button>
          {skillTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setFilter(type.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                filter === type.value
                  ? `bg-${type.color}-600/30 text-${type.color}-400 border border-${type.color}-500/50`
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              <type.icon className="w-4 h-4" />
              {type.label} ({skills.filter(s => s.skill_type === type.value).length})
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="mb-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">
                    {editingId ? 'Edit Skill' : 'Add New Skill'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingId(null);
                      setFormData({ skill_name: '', skill_type: 'technical', proficiency: 50 });
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Skill Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {skillTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, skill_type: type.value })}
                          className={`p-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${
                            formData.skill_type === type.value
                              ? 'bg-purple-600/20 border-purple-500/50 text-white'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Skill Name</label>
                    <input
                      type="text"
                      value={formData.skill_name}
                      onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g., React, Python, Leadership"
                      list="skill-suggestions"
                      required
                    />
                    <datalist id="skill-suggestions">
                      {predefinedSkills[formData.skill_type]?.map((skill) => (
                        <option key={skill} value={skill} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Proficiency: {formData.proficiency}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.proficiency}
                    onChange={(e) => setFormData({ ...formData, proficiency: parseInt(e.target.value) })}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Beginner</span>
                    <span>Intermediate</span>
                    <span>Expert</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingId(null);
                      setFormData({ skill_name: '', skill_type: 'technical', proficiency: 50 });
                    }}
                    className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !formData.skill_name.trim()}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-70"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        {editingId ? 'Update' : 'Add'} Skill
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={item}>
        {filteredSkills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSkills.map((skill, index) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card gradient={skillColors[skill.skill_type] || 'purple'} hover={false}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${skillColors[skill.skill_type]}-500/20`}>
                        {skillTypes.find(t => t.value === skill.skill_type)?.icon && (
                          <div className="text-purple-400">
                            {React.createElement(skillTypes.find(t => t.value === skill.skill_type)!.icon, { className: 'w-5 h-5' })}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{skill.skill_name}</h4>
                        <p className="text-xs text-gray-500 capitalize">{skill.skill_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(skill)}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => skill._id ? handleDelete(skill._id) : skill.id && handleDelete(skill.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <ProgressBar
                    value={skill.proficiency}
                    showValue={false}
                    color={skillColors[skill.skill_type] || 'purple'}
                    height={6}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {skill.proficiency < 40 ? 'Beginner' : skill.proficiency < 70 ? 'Intermediate' : 'Expert'}
                    </span>
                    <span className="text-sm text-gray-400 font-medium">{skill.proficiency}%</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <Code className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-white font-medium mb-2">No skills added yet</h3>
              <p className="text-gray-400 text-sm mb-4">Start building your skill profile</p>
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Your First Skill
              </button>
            </div>
          </Card>
        )}
      </motion.div>

      <motion.div variants={item}>
        <Card gradient="mixed">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-purple-600/20">
              <Zap className="w-8 h-8 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Skill Analytics</h3>
              <p className="text-gray-400 text-sm">
                You have {skills.length} skills tracked. Technical: {skills.filter(s => s.skill_type === 'technical').length}, Programming: {skills.filter(s => s.skill_type === 'programming').length}, Soft: {skills.filter(s => s.skill_type === 'soft').length}, Communication: {skills.filter(s => s.skill_type === 'communication').length}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
