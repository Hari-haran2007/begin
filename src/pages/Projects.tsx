import { API_URL } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  ExternalLink,
  Github,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, AIVerificationBadge, DragDropUpload } from '../components/ui';
import { Loader2 } from 'lucide-react';
import { Project } from '../types';
const statusVariants = {
  in_progress: { label: 'In Progress', variant: 'medium' as const },
  completed: { label: 'Completed', variant: 'good' as const },
  archived: { label: 'Archived', variant: 'risk' as const },
};

const techOptions = [
  'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Django', 'Flask',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Firebase', 'AWS', 'Docker',
  'Kubernetes', 'GraphQL', 'REST API', 'TypeScript', 'JavaScript',
  'Java', 'Go', 'Rust', 'Swift', 'Flutter', 'React Native',
];

export function Projects() {
  const { profile, refreshProfile, token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    technologies: [] as string[],
    github_url: '',
    live_url: '',
    status: 'completed' as Project['status'],
    techInput: '',
  });
  const [projectImages, setProjectImages] = useState<File | null>(null);
  const [projectReport, setProjectReport] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [reportDataUrl, setReportDataUrl] = useState<string | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [existingFileType, setExistingFileType] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (profile?.user_id) fetchProjects();
  }, [profile?.user_id]);

  const fetchProjects = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const handleAddTech = () => {
    if (formData.techInput.trim() && !formData.technologies.includes(formData.techInput.trim())) {
      setFormData({
        ...formData,
        technologies: [...formData.technologies, formData.techInput.trim()],
        techInput: '',
      });
    }
  };

  const handleRemoveTech = (tech: string) => {
    setFormData({
      ...formData,
      technologies: formData.technologies.filter(t => t !== tech),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setVerifying(true);
    setProgress(0);
    
    // Simulate upload/verification progress
    const simulateProgress = async () => {
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(r => setTimeout(r, 100));
      }
    };
    
    if (projectImages || projectReport) {
      await simulateProgress();
    }
    setVerifying(false);

    try {
      const url = editingId 
        ? `${API_URL}/projects/${editingId}`
        : `${API_URL}/projects`;
      
      const method = editingId ? 'PUT' : 'POST';

      let finalFileUrl = existingFileUrl;
      let finalFileName = existingFileName;
      let finalFileType = existingFileType;

      if (reportDataUrl && projectReport) {
        finalFileUrl = reportDataUrl;
        finalFileName = projectReport.name;
        finalFileType = 'pdf';
      } else if (imagePreview && projectImages) {
        finalFileUrl = imagePreview;
        finalFileName = projectImages.name;
        finalFileType = 'image';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          technologies: formData.technologies,
          github_url: formData.github_url || null,
          live_url: formData.live_url || null,
          status: formData.status,
          file_url: finalFileUrl || null,
          file_name: finalFileName || null,
          file_type: finalFileType || null,
        })
      });

      if (res.ok) {
        await fetchProjects();
        await refreshProfile();
        setIsAdding(false);
        setEditingId(null);
        resetForm();
      }
    } catch (err) {
      console.error('Error saving project:', err);
    }

    setLoading(false);
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const handleEdit = (project: Project) => {
    setFormData({
      title: project.title,
      description: project.description || '',
      technologies: project.technologies || [],
      github_url: project.github_url || '',
      live_url: project.live_url || '',
      status: project.status,
      techInput: '',
    });
    setExistingFileUrl(project.file_url || null);
    setExistingFileName(project.file_name || null);
    setExistingFileType(project.file_type || null);
    if (project.file_url && (project.file_type === 'image' || project.file_url.startsWith('data:image/'))) {
      setImagePreview(project.file_url);
    }
    setEditingId(project._id || project.id || null);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchProjects();
        await refreshProfile();
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      technologies: [],
      github_url: '',
      live_url: '',
      status: 'completed',
      techInput: '',
    });
    setProjectImages(null);
    setProjectReport(null);
    setImagePreview(null);
    setReportDataUrl(null);
    setExistingFileUrl(null);
    setExistingFileName(null);
    setExistingFileType(null);
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400">Showcase your development work</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/30"
          >
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card className="mb-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">{editingId ? 'Edit Project' : 'Add New Project'}</h3>
                  <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Project Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="e.g., E-commerce Platform"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                    >
                      <option value="in_progress" className="bg-gray-900">In Progress</option>
                      <option value="completed" className="bg-gray-900">Completed</option>
                      <option value="archived" className="bg-gray-900">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                    placeholder="Describe your project..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Technologies</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.techInput}
                      onChange={(e) => setFormData({ ...formData, techInput: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTech())}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="Add technology..."
                      list="tech-list"
                    />
                    <button type="button" onClick={handleAddTech} className="px-4 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all">Add</button>
                  </div>
                  <datalist id="tech-list">
                    {techOptions.map(tech => <option key={tech} value={tech} />)}
                  </datalist>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.technologies.map(tech => (
                      <span key={tech} className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm">
                        {tech}
                        <button type="button" onClick={() => handleRemoveTech(tech)} className="hover:text-white"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2"><Github className="w-4 h-4" /> GitHub URL</label>
                    <input type="url" value={formData.github_url} onChange={(e) => setFormData({ ...formData, github_url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="https://github.com/..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Live URL</label>
                    <input type="url" value={formData.live_url} onChange={(e) => setFormData({ ...formData, live_url: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="https://..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                  <DragDropUpload
                    label="Project Images"
                    accept="image/*"
                    file={projectImages}
                    previewUrl={imagePreview}
                    onFileChange={(file) => {
                      setProjectImages(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setImagePreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                    onRemove={() => {
                      setProjectImages(null);
                      setImagePreview(null);
                    }}
                  />
                  <DragDropUpload
                    label="Project Report (PDF)"
                    accept=".pdf"
                    file={projectReport}
                    onFileChange={(file) => {
                      setProjectReport(file);
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setReportDataUrl(reader.result as string);
                        reader.readAsDataURL(file);
                      } else {
                        setReportDataUrl(null);
                      }
                    }}
                    onRemove={() => {
                      setProjectReport(null);
                      setReportDataUrl(null);
                    }}
                  />
                </div>

                {verifying && (
                  <div className="space-y-1 mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-300 flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading project files...
                      </span>
                      <span className="text-white font-medium">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-150" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }} className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all">Cancel</button>
                  <button type="submit" disabled={loading || !formData.title.trim()} className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-70">
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="w-4 h-4" />{editingId ? 'Update' : 'Add'} Project</>}
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={item}>
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project, index) => {
              const pStatus = (project.verification_status || project.verificationStatus || 'pending').toLowerCase();
              const isApproved = pStatus === 'approved' || pStatus === 'verified';
              const isRejected = pStatus === 'rejected';
              const isReupload = pStatus === 'reupload' || pStatus === 're-upload';

              return (
                <motion.div key={project._id || project.id || index} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                  <Card>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-semibold">{project.title}</h4>
                        <Badge variant={statusVariants[project.status]?.variant || 'good'}>
                          {statusVariants[project.status]?.label || 'Completed'}
                        </Badge>
                        <div className="mt-2">
                          {isApproved ? (
                            <span className="text-xs font-bold px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded inline-flex items-center gap-1">
                              <Check className="w-3 h-3" /> Verified
                            </span>
                          ) : isRejected ? (
                            <span className="text-xs font-bold px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded inline-flex items-center gap-1">
                              <X className="w-3 h-3" /> Rejected
                            </span>
                          ) : isReupload ? (
                            <span className="text-xs font-bold px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Changes Required
                            </span>
                          ) : (
                            <AIVerificationBadge status="Pending" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(project)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all" title="Edit project"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(project._id || project.id!)} className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all" title="Delete project"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{project.description || 'No description'}</p>
                    
                    {project.staff_comment && (
                      <div className={`mb-4 p-3 rounded-xl border text-xs ${
                        isRejected 
                          ? 'bg-red-500/10 border-red-500/30 text-red-300' 
                          : isReupload 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                          : 'bg-black/40 border-white/5 text-gray-300'
                      }`}>
                        <p className="font-bold mb-0.5 text-gray-200">
                          {isRejected ? 'Rejection Reason:' : isReupload ? 'Faculty Remarks (Changes Required):' : 'Staff Note:'}
                        </p>
                        <p className="leading-relaxed">{project.staff_comment}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {project.technologies?.slice(0, 4).map(tech => (
                        <span key={tech} className="px-2 py-0.5 rounded-md bg-white/5 text-gray-400 text-xs">{tech}</span>
                      ))}
                      {project.technologies?.length > 4 && <span className="px-2 py-0.5 text-gray-500 text-xs">+{project.technologies.length - 4} more</span>}
                    </div>

                    <div className="flex items-center flex-wrap gap-3 pt-2 border-t border-white/5">
                      {project.github_url && (
                        <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-400 hover:text-white text-xs transition-colors bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                          <Github className="w-3.5 h-3.5" /> Code
                        </a>
                      )}
                      {project.live_url && (
                        <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-400 hover:text-white text-xs transition-colors bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                          <ExternalLink className="w-3.5 h-3.5" /> Live Demo
                        </a>
                      )}
                      {project.file_url && (
                        <a 
                          href={project.file_url.startsWith('data:') ? project.file_url : `${API_URL}/projects/${project._id || project.id}/document?token=${token}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-1 text-purple-300 hover:text-purple-200 text-xs transition-colors bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20"
                        >
                          {project.file_type === 'pdf' ? <FileText className="w-3.5 h-3.5 text-red-400" /> : <ImageIcon className="w-3.5 h-3.5 text-blue-400" />} 
                          <span>Attachment</span>
                        </a>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <FolderKanban className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-white font-medium mb-2">No projects yet</h3>
              <p className="text-gray-400 text-sm mb-4">Start building your portfolio</p>
              <button onClick={() => setIsAdding(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 transition-all">
                <Plus className="w-4 h-4" /> Add Your First Project
              </button>
            </div>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}
