import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bell, Shield, Key, Mail, Lock, Unlock, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function StaffSettings() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setAvatarPreview(url);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your staff account preferences.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="space-y-2">
          <button 
            onClick={() => setActiveTab('account')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'account' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}>
            <User className="w-5 h-5" /> Account Details
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'notifications' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}>
            <Bell className="w-5 h-5" /> Notifications
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'security' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}>
            <Shield className="w-5 h-5" /> Privacy & Security
          </button>
        </div>

        <div className="md:col-span-2 space-y-6">
          {activeTab === 'account' && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">Profile Information</h3>
              
              <div className="flex items-center gap-6 mb-8">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" className="w-20 h-20 rounded-2xl object-cover shadow-xl shadow-blue-500/20" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-blue-500/20">
                    {profile?.full_name?.charAt(0) || 'S'}
                  </div>
                )}
                <div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  hidden 
                  accept="image/png, image/jpeg, image/gif" 
                  onChange={handleAvatarChange} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors border border-white/10">
                  Change Avatar
                </button>
                <p className="text-xs text-gray-500 mt-2">JPG, GIF or PNG. Max size 2MB.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Full Name</label>
                    <input type="text" disabled value={profile?.full_name || ''} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Staff ID / Role</label>
                    <input type="text" disabled value={profile?.role || 'staff'} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none capitalize" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Email Address (System ID)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="email" disabled value={profile?.email || ''} className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-gray-300 focus:outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Department</label>
                  <input type="text" disabled value={profile?.department || 'Administration'} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">Notifications Preferences</h3>
              <p className="text-gray-400 text-sm mb-6">Manage how you receive alerts and updates.</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                  <div>
                    <p className="text-white font-medium text-sm">Email Notifications</p>
                    <p className="text-gray-500 text-xs mt-1">Receive daily summary emails.</p>
                  </div>
                  <div 
                    onClick={() => setEmailNotif(!emailNotif)}
                    className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors flex items-center px-0.5 ${emailNotif ? 'bg-blue-600 justify-end' : 'bg-white/10 justify-start'}`}>
                    <motion.div layout className={`w-4 h-4 rounded-full shadow-sm ${emailNotif ? 'bg-white' : 'bg-gray-400'}`} />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                  <div>
                    <p className="text-white font-medium text-sm">Push Notifications</p>
                    <p className="text-gray-500 text-xs mt-1">Receive instant alerts for student activities.</p>
                  </div>
                  <div 
                    onClick={() => setPushNotif(!pushNotif)}
                    className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors flex items-center px-0.5 ${pushNotif ? 'bg-blue-600 justify-end' : 'bg-white/10 justify-start'}`}>
                    <motion.div layout className={`w-4 h-4 rounded-full shadow-sm ${pushNotif ? 'bg-white' : 'bg-gray-400'}`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">Privacy & Security</h3>
              <p className="text-gray-400 text-sm mb-6">Manage your password and security settings.</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">Change Password</p>
                    <p className="text-xs text-gray-400 mt-1">Update your portal password.</p>
                  </div>
                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors border border-white/10 flex items-center gap-2">
                    <Key className="w-4 h-4" /> Change
                  </button>
                </div>
                
                <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-400 mt-1">Add an extra layer of security.</p>
                  </div>
                  <button 
                    onClick={() => setTwoFactor(!twoFactor)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center gap-2 ${
                      twoFactor 
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/20' 
                        : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-500/20'
                    }`}>
                    {twoFactor ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} 
                    {twoFactor ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl shadow-blue-900/20"
            >
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-white mb-6">Change Password</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Current Password</label>
                  <input 
                    type="password" 
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">New Password</label>
                  <input 
                    type="password" 
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Confirm New Password</label>
                  <input 
                    type="password" 
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <button 
                  onClick={() => setShowPasswordModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    // Simulate save
                    setShowPasswordModal(false);
                    setPasswordForm({ current: '', new: '', confirm: '' });
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
                >
                  Save Password
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
