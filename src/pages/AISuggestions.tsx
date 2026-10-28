import { API_URL } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Target,
  TrendingUp,
  Lightbulb,
  BookOpen,
  Code,
  Award,
  Briefcase,
  MessageSquare,
  Users,
  ChevronRight,
  CheckCircle,
  Clock,
  Zap,
  FolderKanban,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui';
import { Skill, Project, Certification, Internship } from '../types';

interface Suggestion {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'skills' | 'projects' | 'certifications' | 'internships' | 'soft_skills' | 'communication';
  impact: string;
  action: string;
}

export function AISuggestions() {
  const { profile, growthMetrics, token } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (token && (profile?._id || profile?.id || profile?.user_id)) {
      fetchData();
    }
  }, [profile, token]);

  useEffect(() => {
    if (skills.length || projects.length || certifications.length || internships.length) {
      generateSuggestions();
    }
  }, [skills, projects, certifications, internships, growthMetrics]);

  const fetchData = async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [skillsRes, projectsRes, certsRes, internshipsRes] = await Promise.all([
        fetch(`${API_URL}/skills`, { headers }),
        fetch(`${API_URL}/projects`, { headers }),
        fetch(`${API_URL}/certifications`, { headers }),
        fetch(`${API_URL}/internships`, { headers }),
      ]);

      if (skillsRes.ok) setSkills(await skillsRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (certsRes.ok) setCertifications(await certsRes.json());
      if (internshipsRes.ok) setInternships(await internshipsRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const generateSuggestions = async () => {
    try {
      if (token) {
        const res = await fetch(`${API_URL}/ai/suggestions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            skills,
            projects,
            certifications,
            internships,
            growthMetrics: growthMetrics || {}
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            const mapped = data.suggestions.map((s: any, idx: number) => ({
              id: s.id || `${idx + 1}`,
              icon: s.category === 'projects' ? <FolderKanban className="w-5 h-5" />
                : s.category === 'certifications' ? <Award className="w-5 h-5" />
                : s.category === 'internships' ? <Briefcase className="w-5 h-5" />
                : s.category === 'communication' ? <MessageSquare className="w-5 h-5" />
                : <Code className="w-5 h-5" />,
              title: s.title,
              description: s.description,
              priority: s.priority || 'medium',
              category: s.category || 'skills',
              impact: s.impact || '+5% Growth Score',
              action: s.action || 'Take action',
            }));
            setSuggestions(mapped);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Groq Suggestions fallback to local rules:', e);
    }

    const newSuggestions: Suggestion[] = [];

    // Skills analysis
    const lowSkills = skills.filter(s => s.proficiency < 50);
    const technicalSkills = skills.filter(s => s.skill_type === 'technical');
    const programmingSkills = skills.filter(s => s.skill_type === 'programming');

    if (technicalSkills.length < 5) {
      newSuggestions.push({
        id: '1',
        icon: <Code className="w-5 h-5" />,
        title: 'Expand Technical Skills',
        description: 'You have fewer than 5 technical skills. Industries value diverse technical knowledge.',
        priority: 'high',
        category: 'skills',
        impact: '+10% Growth Score',
        action: 'Add skills like AWS, Docker, or Kubernetes',
      });
    }

    if (programmingSkills.length < 3) {
      newSuggestions.push({
        id: '2',
        icon: <Zap className="w-5 h-5" />,
        title: 'Learn More Programming Languages',
        description: 'Knowing multiple programming languages increases your versatility.',
        priority: 'medium',
        category: 'skills',
        impact: '+8% Growth Score',
        action: 'Consider learning Python, Java, or Go',
      });
    }

    lowSkills.forEach(skill => {
      newSuggestions.push({
        id: `skill-${skill.id}`,
        icon: <Target className="w-5 h-5" />,
        title: `Improve ${skill.skill_name}`,
        description: `Your ${skill.skill_name} proficiency is at ${skill.proficiency}%. Aim for at least 70%.`,
        priority: skill.proficiency < 30 ? 'high' : 'medium',
        category: 'skills',
        impact: '+5% Skill Score',
        action: 'Practice daily for 30 minutes',
      });
    });

    // Projects analysis
    if (projects.length < 3) {
      newSuggestions.push({
        id: '3',
        icon: <BookOpen className="w-5 h-5" />,
        title: 'Build More Projects',
        description: 'Projects demonstrate practical skills. Aim for at least 3 completed projects.',
        priority: 'high',
        category: 'projects',
        impact: '+15% Growth Score',
        action: 'Start a full-stack web application',
      });
    }

    const incompleteProjects = projects.filter(p => p.status === 'in_progress');
    if (incompleteProjects.length > 1) {
      newSuggestions.push({
        id: '4',
        icon: <Clock className="w-5 h-5" />,
        title: 'Complete Ongoing Projects',
        description: `You have ${incompleteProjects.length} incomplete projects. Focus on finishing them.`,
        priority: 'medium',
        category: 'projects',
        impact: '+10% Project Score',
        action: 'Prioritize one project at a time',
      });
    }

    // Certifications analysis
    if (certifications.length < 2) {
      newSuggestions.push({
        id: '5',
        icon: <Award className="w-5 h-5" />,
        title: 'Get Industry Certifications',
        description: 'Certifications validate your skills and boost employability.',
        priority: 'high',
        category: 'certifications',
        impact: '+12% Growth Score',
        action: 'Consider AWS, Google Cloud, or Meta certifications',
      });
    }

    const cloudCerts = certifications.filter(c =>
      c.name.toLowerCase().includes('aws') ||
      c.name.toLowerCase().includes('azure') ||
      c.name.toLowerCase().includes('gcp') ||
      c.name.toLowerCase().includes('cloud')
    );
    if (cloudCerts.length === 0) {
      newSuggestions.push({
        id: '6',
        icon: <Award className="w-5 h-5" />,
        title: 'Add Cloud Certification',
        description: 'Cloud skills are in high demand across industries.',
        priority: 'medium',
        category: 'certifications',
        impact: '+8% Growth Score',
        action: 'Start with AWS Cloud Practitioner',
      });
    }

    // Internships analysis
    if (internships.length === 0) {
      newSuggestions.push({
        id: '7',
        icon: <Briefcase className="w-5 h-5" />,
        title: 'Complete an Internship',
        description: 'Real-world experience is crucial for placement readiness.',
        priority: 'high',
        category: 'internships',
        impact: '+20% Growth Score',
        action: 'Apply to internships on LinkedIn or Internshala',
      });
    } else if (internships.length === 1) {
      newSuggestions.push({
        id: '8',
        icon: <Briefcase className="w-5 h-5" />,
        title: 'Gain More Work Experience',
        description: 'Multiple internships show consistency and diverse experience.',
        priority: 'medium',
        category: 'internships',
        impact: '+10% Growth Score',
        action: 'Look for summer or part-time internships',
      });
    }

    // Communication and soft skills
    const communicationScore = growthMetrics?.communication_score || 0;
    if (communicationScore < 70) {
      newSuggestions.push({
        id: '9',
        icon: <MessageSquare className="w-5 h-5" />,
        title: 'Improve Communication Skills',
        description: 'Strong communication is essential for interviews and teamwork.',
        priority: communicationScore < 50 ? 'high' : 'medium',
        category: 'communication',
        impact: '+10% Growth Score',
        action: 'Join public speaking workshops or Toastmasters',
      });
    }

    const softSkillsScore = growthMetrics?.soft_skills_score || 0;
    if (softSkillsScore < 70) {
      newSuggestions.push({
        id: '10',
        icon: <Users className="w-5 h-5" />,
        title: 'Develop Soft Skills',
        description: 'Leadership, teamwork, and adaptability are valued by employers.',
        priority: 'medium',
        category: 'soft_skills',
        impact: '+8% Growth Score',
        action: 'Take leadership roles in college clubs or events',
      });
    }

    setSuggestions(newSuggestions);
  };

  const filteredSuggestions = selectedCategory === 'all'
    ? suggestions
    : suggestions.filter(s => s.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'All', count: suggestions.length },
    { id: 'skills', label: 'Skills', count: suggestions.filter(s => s.category === 'skills').length },
    { id: 'projects', label: 'Projects', count: suggestions.filter(s => s.category === 'projects').length },
    { id: 'certifications', label: 'Certs', count: suggestions.filter(s => s.category === 'certifications').length },
    { id: 'internships', label: 'Internships', count: suggestions.filter(s => s.category === 'internships').length },
  ];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const priorityColors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-purple-400" />
            AI Suggestions
          </h1>
          <p className="text-gray-400">Personalized recommendations to boost your growth</p>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card gradient="mixed">
          <div className="flex items-center gap-6 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/30">
              <Lightbulb className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg">Your Growth Pathway</h3>
              <p className="text-gray-400">Based on your profile, we've identified {suggestions.length} areas for improvement. Following these suggestions can increase your growth score significantly.</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{suggestions.filter(s => s.priority === 'high').length}</div>
              <p className="text-red-400 text-sm">High Priority</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-2xl font-bold text-white">{skills.length}</p>
              <p className="text-gray-400 text-sm">Skills Tracked</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-2xl font-bold text-white">{projects.length}</p>
              <p className="text-gray-400 text-sm">Projects Done</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <p className="text-2xl font-bold text-white">{certifications.length + internships.length}</p>
              <p className="text-gray-400 text-sm">Certs + Internships</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                selectedCategory === cat.id
                  ? 'bg-purple-600/30 text-purple-400 border border-purple-500/50'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              {cat.label}
              <span className="text-xs opacity-70">({cat.count})</span>
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item}>
        {filteredSuggestions.length > 0 ? (
          <div className="space-y-4">
            {filteredSuggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card hover={false}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      suggestion.priority === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : suggestion.priority === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {suggestion.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-white font-medium">{suggestion.title}</h4>
                          <p className="text-gray-400 text-sm mt-1">{suggestion.description}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full border ${priorityColors[suggestion.priority]}`}>
                          {suggestion.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-4">
                          <span className="text-green-400 text-sm flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {suggestion.impact}
                          </span>
                          <span className="text-gray-500 text-sm capitalize">{suggestion.category}</span>
                        </div>
                        <button className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm transition-colors">
                          {suggestion.action}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-white font-medium mb-2">All Caught Up!</h3>
              <p className="text-gray-400 text-sm">Add more data to get personalized suggestions</p>
            </div>
          </Card>
        )}
      </motion.div>

      <motion.div variants={item}>
        <Card gradient="green">
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-2xl bg-green-600/30">
              <Target className="w-8 h-8 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">Quick Wins</h3>
              <p className="text-gray-400 text-sm">These actions can quickly boost your profile:</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-white/5 text-gray-300 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Update all skill proficiencies
            </div>
            <div className="p-3 rounded-xl bg-white/5 text-gray-300 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Add GitHub links to projects
            </div>
            <div className="p-3 rounded-xl bg-white/5 text-gray-300 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Complete your profile bio
            </div>
            <div className="p-3 rounded-xl bg-white/5 text-gray-300 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Add one certification this month
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
