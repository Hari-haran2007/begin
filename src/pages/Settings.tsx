import { API_URL } from '../lib/api';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Bell,
  Eye,
  EyeOff,
  Shield,
  LogOut,
  Moon,
  Globe,
  HelpCircle,
  Save,
  Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui';

import { useNavigate } from 'react-router-dom';

export function Settings() {
  const { profile, signOut, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notifications, setNotifications] = useState({ email: true, push: false, weekly: true, suggestions: true });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/auth/update-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: passwordForm.newPassword })
      });
      if (res.ok) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        alert('Password updated successfully');
      } else {
        const data = await res.json();
        alert(data.message || 'Error updating password');
      }
    } catch (error) {
      console.error(error);
      alert('Server Error');
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400">Manage your account preferences</p>
      </motion.div>

      <motion.div variants={item} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600/30 text-purple-400 border border-purple-500/50'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {activeTab === 'account' && (
        <motion.div variants={item} className="space-y-6">
          <Card>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" />
              Account Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div>
                  <p className="text-gray-400 text-sm">Full Name</p>
                  <p className="text-white">{profile?.full_name}</p>
                </div>
                <button className="text-purple-400 hover:text-purple-300 text-sm">Edit</button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">{profile?.email}</p>
                </div>
                <span className="text-gray-500 text-sm">Verified</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div>
                  <p className="text-gray-400 text-sm">Department</p>
                  <p className="text-white">{profile?.department}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div>
                  <p className="text-gray-400 text-sm">Roll Number</p>
                  <p className="text-white">{profile?.roll_number}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-red-500/30 bg-red-500/10">
            <h3 className="text-white font-semibold mb-4">Danger Zone</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Delete Account</p>
                <p className="text-gray-400 text-sm">Permanently delete your account and all data</p>
              </div>
              <button className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all">
                Delete Account
              </button>
            </div>
          </Card>
        </motion.div>
      )}

      {activeTab === 'security' && (
        <motion.div variants={item} className="space-y-6">
          <Card>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-400" />
              Change Password
            </h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </button>
            </form>
          </Card>

          <Card>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Two-Factor Authentication
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Enable 2FA</p>
                <p className="text-gray-400 text-sm">Add an extra layer of security</p>
              </div>
              <button className="px-4 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all">
                Enable
              </button>
            </div>
          </Card>

          <Card>
            <h3 className="text-white font-semibold mb-4">Active Sessions</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-white">Current Device</p>
                    <p className="text-gray-500 text-sm">Active now</p>
                  </div>
                </div>
                <Check className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {activeTab === 'notifications' && (
        <motion.div variants={item}>
          <Card>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-400" />
              Notification Preferences
            </h3>
            <div className="space-y-4">
              {[
                { id: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                { id: 'push', label: 'Push Notifications', desc: 'Browser push notifications' },
                { id: 'weekly', label: 'Weekly Summary', desc: 'Get weekly progress reports' },
                { id: 'suggestions', label: 'AI Suggestions', desc: 'Get personalized suggestions' },
              ].map((setting) => (
                <div key={setting.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                  <div>
                    <p className="text-white">{setting.label}</p>
                    <p className="text-gray-400 text-sm">{setting.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications[setting.id as keyof typeof notifications]}
                      onChange={() => setNotifications({ ...notifications, [setting.id]: !notifications[setting.id as keyof typeof notifications] })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {activeTab === 'preferences' && (
        <motion.div variants={item} className="space-y-6">
          <Card>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Moon className="w-5 h-5 text-purple-400" />
              Appearance
            </h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div>
                <p className="text-white">Dark Mode</p>
                <p className="text-gray-400 text-sm">Always on for the premium experience</p>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-purple-600/20 text-purple-400 text-sm">
                Enabled
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-white font-semibold mb-4">Language</h3>
            <select className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none">
              <option value="en" className="bg-gray-900">English</option>
              <option value="hi" className="bg-gray-900">Hindi</option>
            </select>
          </Card>

          <Card gradient="blue">
            <div className="flex items-center gap-4">
              <HelpCircle className="w-8 h-8 text-blue-400" />
              <div className="flex-1">
                <p className="text-white">Need Help?</p>
                <p className="text-gray-400 text-sm">Contact support or view documentation</p>
              </div>
              <button className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all">
                Support
              </button>
            </div>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item}>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </motion.div>
    </motion.div>
  );
}
