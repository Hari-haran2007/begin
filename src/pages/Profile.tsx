import { API_URL } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Building2,
  Hash,
  Calendar,
  Edit3,
  Save,
  Camera,
  GraduationCap,
  Trash2,
  Crop,
  ZoomIn,
  MapPin,
  Award,
  Briefcase,
  Code,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CircularProgress, ProgressBar } from '../components/ui';



export function Profile() {
  const { profile, growthMetrics, refreshProfile, token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    roll_number: '',
    department: '',
    semester: 1,
    bio: '',
  });
  const [cgpa, setCgpa] = useState('0.00');
  const [isVerified, setIsVerified] = useState(false);

  // Avatar and crop states
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.avatar_url) {
      setTempAvatarUrl(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setShowCropModal(true);
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCrop = () => {
    if (!selectedImage) return;

    const img = new Image();
    img.src = selectedImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 300;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        const imgRatio = img.width / img.height;
        let drawWidth = size * zoom;
        let drawHeight = size * zoom;
        if (imgRatio > 1) {
          drawWidth = size * imgRatio * zoom;
        } else {
          drawHeight = (size / imgRatio) * zoom;
        }

        const x = (size - drawWidth) / 2 + offsetX * zoom;
        const y = (size - drawHeight) / 2 + offsetY * zoom;

        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setTempAvatarUrl(croppedDataUrl);
        setShowCropModal(false);
      }
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - offsetX, y: touch.clientY - offsetY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setOffsetX(touch.clientX - dragStart.x);
    setOffsetY(touch.clientY - dragStart.y);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - dragStart.x);
    setOffsetY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const removePhoto = () => {
    setTempAvatarUrl(null);
  };

  useEffect(() => {
    if (!profile?.user_id) return;

    const updateCGPA = async () => {
      const authToken = token || localStorage.getItem('token');
      if (authToken) {
        try {
          const res = await fetch(`${API_URL}/semesterPerformances`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            const verifiedSemesters = data.filter((s: any) => s.sgpa && (s.credits_total || s.credits_earned || s.credits));
            if (verifiedSemesters.length > 0) {
              const totalCredits = verifiedSemesters.reduce((acc: number, curr: any) => acc + (curr.credits_total || curr.credits_earned || curr.credits || 0), 0);
              const totalPoints = verifiedSemesters.reduce((acc: number, curr: any) => acc + ((curr.sgpa || 0) * (curr.credits_total || curr.credits_earned || curr.credits || 0)), 0);
              if (totalCredits > 0) {
                setCgpa((totalPoints / totalCredits).toFixed(2));
                setIsVerified(true);
                return;
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch semester performances in Profile', e);
        }
      }

      if (growthMetrics?.cgpa_score && Number(growthMetrics.cgpa_score) > 0) {
        setCgpa(Number(growthMetrics.cgpa_score).toFixed(2));
        setIsVerified(true);
        return;
      }

      const saved = localStorage.getItem(`semester_results_data_${profile.user_id}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          const verifiedSemesters = data.filter((s: any) => s.status === 'Verified' && s.sgpa && s.credits);
          if (verifiedSemesters.length > 0) {
            const totalCredits = verifiedSemesters.reduce((acc: number, curr: any) => acc + (curr.credits || 0), 0);
            const totalPoints = verifiedSemesters.reduce((acc: number, curr: any) => acc + ((curr.sgpa || 0) * (curr.credits || 0)), 0);
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
    };

    updateCGPA();
    window.addEventListener('semester_results_update', updateCGPA);
    return () => window.removeEventListener('semester_results_update', updateCGPA);
  }, [profile?.user_id, token, growthMetrics]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        roll_number: profile.roll_number || '',
        department: profile.department || '',
        semester: profile.semester || 1,
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let finalAvatarUrl = profile?.avatar_url || null;

    if (tempAvatarUrl && tempAvatarUrl.startsWith('data:')) {
      finalAvatarUrl = tempAvatarUrl;
    }

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          phone: formData.phone,
          semester: formData.semester,
          bio: formData.bio,
          avatar_url: finalAvatarUrl,
        })
      });

      if (res.ok) {
        await refreshProfile();
        setIsEditing(false);
      } else {
        console.error('Profile Update Error');
      }
    } catch (err) {
      console.error('Profile Update Error:', err);
    }
    
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

  const profileCompletion = 85;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-6"
    >
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile Overview</h1>
          <p className="text-gray-400">View and manage your professional identity</p>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <div className="bg-[#1e1e2d] rounded-2xl overflow-hidden border border-white/5 shadow-xl">
          {/* Banner */}
          <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 relative">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all shadow-lg"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>
          
          <div className="px-8 pb-8 relative">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Profile Picture */}
              <div className="relative -mt-20 group z-10 w-40 h-40">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-5xl font-bold text-white shadow-2xl border-4 border-[#1e1e2d] overflow-hidden">
                  {isEditing ? (
                    tempAvatarUrl ? (
                      <img src={tempAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {profile?.full_name?.charAt(0) || ''}
                      </div>
                    )
                  ) : (
                    profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {profile?.full_name?.charAt(0) || ''}
                      </div>
                    )
                  )}
                </div>
                
                {isEditing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 bg-black/60 rounded-full transition-opacity border-4 border-transparent cursor-pointer">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-purple-600 rounded-full text-white hover:bg-purple-500 transition-colors shadow-lg"
                      title="Replace Photo"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    {tempAvatarUrl && (
                      <button 
                        onClick={removePhoto}
                        className="p-2 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors shadow-lg absolute bottom-2 right-2"
                        title="Remove Photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
              </div>

              {/* Profile Header Info */}
              <div className="flex-1 pt-3">
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-400">Full Name</label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-xl font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-400">Headline / Bio</label>
                      <input
                        type="text"
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="e.g. Aspiring Software Engineer | Tech Enthusiast"
                      />
                    </div>
                    
                    <div className="flex gap-3 justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-70 shadow-lg"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Profile
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">{profile?.full_name || ''}</h2>
                    <p className="text-lg text-gray-300 mb-4">{profile?.bio || ''}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        <span>{profile?.department || ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        <span>Semester {profile?.semester || ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4" />
                        <span>{profile?.email || ''}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* About Section */}
          <motion.div variants={item}>
            <Card className="h-full">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Personal Information (About)
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {profile?.bio ? (
                  profile.bio
                ) : (
                  "I'm a passionate student actively building my skills and pursuing excellence in my field. Always looking for new opportunities to learn and grow."
                )}
              </p>
            </Card>
          </motion.div>

          {/* Academic Information */}
          <motion.div variants={item}>
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-400" />
                  Academic Information
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Roll Number</p>
                  <p className="text-white font-medium flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    {profile?.roll_number || ''}
                  </p>
                </div>
                
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Department</p>
                  <p className="text-white font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {profile?.department || ''}
                  </p>
                </div>

                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Current Semester</p>
                  <p className="text-white font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Semester {profile?.semester || ''}
                  </p>
                </div>

                <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-500/20">
                  <p className="text-xs text-purple-300 mb-1">Verified CGPA</p>
                  <div className="flex items-center justify-between">
                    <p className="text-white font-bold text-xl">{isVerified ? cgpa : 'Not Verified'}</p>
                    {isVerified ? (
                      <ShieldCheck className="w-6 h-6 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div variants={item}>
            <Card>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-400" />
                Contact Information
              </h3>
              
              <div className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <label className="text-xs text-gray-500 mb-1 block">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-transparent text-white focus:outline-none"
                        placeholder="Add your phone number"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Email Address</p>
                        <p className="text-white font-medium">{profile?.email || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Phone Number</p>
                        <p className="text-white font-medium">{profile?.phone || ''}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Achievements */}
          <motion.div variants={item}>
            <Card>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                Achievements
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="mt-1">
                    <Code className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Hackathon Winner</h4>
                    <p className="text-gray-400 text-sm mb-2">National Tech Innovation Challenge</p>
                    <p className="text-sm text-gray-500">Secured 1st place among 200+ teams by building an AI-driven accessibility tool.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="mt-1">
                    <Briefcase className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Summer Internship</h4>
                    <p className="text-gray-400 text-sm mb-2">Software Engineering Intern</p>
                    <p className="text-sm text-gray-500">Worked on the core ranking algorithm improving latency by 15%.</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Right Column (Side Content) */}
        <div className="space-y-6">
          {/* Profile Completion */}
          <motion.div variants={item}>
            <Card gradient="mixed">
              <h3 className="text-lg font-bold text-white mb-4">Profile Completion</h3>
              <div className="flex justify-center mb-6">
                <CircularProgress
                  value={profileCompletion}
                  size={140}
                  label="Complete"
                  color="purple"
                />
              </div>
              <p className="text-sm text-center text-gray-300">
                You're almost there! Add more projects and verify your internships to reach 100%.
              </p>
            </Card>
          </motion.div>

          {/* Verification Status */}
          <motion.div variants={item}>
            <Card>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                Verification Status
              </h3>
              <ul className="space-y-3">
                <li className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                  <span className="text-sm text-gray-300">Email</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </li>
                <li className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                  <span className="text-sm text-gray-300">Academic</span>
                  {isVerified ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                </li>
                <li className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                  <span className="text-sm text-gray-300">Internships</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </li>
              </ul>
            </Card>
          </motion.div>

          {/* Skills Summary */}
          <motion.div variants={item}>
            <Card>
              <h3 className="text-lg font-bold text-white mb-4">Skills Summary</h3>
              <div className="space-y-4">
                <ProgressBar
                  label="Technical Skills"
                  value={growthMetrics?.technical_skills_score || 75}
                  color="blue"
                />
                <ProgressBar
                  label="Programming"
                  value={growthMetrics?.programming_score || 82}
                  color="green"
                />
                <ProgressBar
                  label="Soft Skills"
                  value={growthMetrics?.soft_skills_score || 65}
                  color="purple"
                />
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Crop Modal */}
      {showCropModal && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 border border-white/10 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Crop className="w-5 h-5 text-purple-400" />
              Adjust Profile Picture
            </h3>
            
            <div 
              className="relative w-full aspect-square bg-black/50 rounded-xl overflow-hidden cursor-move mb-6 border border-white/5"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img 
                src={selectedImage} 
                alt="Upload preview" 
                className="max-w-none pointer-events-none absolute"
                style={{
                  transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
              {/* Overlay to show cropping area */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-4/5 h-4/5 border-2 border-purple-500 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <ZoomIn className="w-5 h-5 text-gray-400" />
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.1" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-purple-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowCropModal(false)}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleApplyCrop}
                className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors font-medium"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
