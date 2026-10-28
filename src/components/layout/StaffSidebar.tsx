import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Award,
  Briefcase,
  FolderKanban,
  Code,
  ShieldAlert,
  FileText,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Trophy,
  Presentation,
  Dna,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export interface StaffSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const navItems = [
  { name: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
  { name: 'Student Management', path: '/staff/students', icon: Users },
  { name: 'Student DNA', path: '/staff/student-dna', icon: Dna },
  { name: 'Semester Results', path: '/staff/semester-results', icon: GraduationCap },
  { name: 'Certificate Verification', path: '/staff/certificates', icon: Award },
  { name: 'Internship Verification', path: '/staff/internships', icon: Briefcase },
  { name: 'Projects Review', path: '/staff/projects', icon: FolderKanban },
  { name: 'Hackathons Verification', path: '/staff/hackathons', icon: Trophy },
  { name: 'Workshops Verification', path: '/staff/workshops', icon: Presentation },
  { name: 'Skills Review', path: '/staff/skills', icon: Code },
  { name: 'Student Connect', path: '/staff/ai-risk-analysis', icon: ShieldAlert },
  { name: 'Reports', path: '/staff/reports', icon: FileText },
  { name: 'Notifications', path: '/staff/notifications', icon: Bell },
  { name: 'Settings', path: '/staff/settings', icon: Settings },
];

export function StaffSidebar({ collapsed: controlledCollapsed, onToggleCollapse }: StaffSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const isControlled = controlledCollapsed !== undefined;
  const isCollapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (isControlled && onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(prev => !prev);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-gray-900/90 border border-white/10 backdrop-blur-xl text-white shadow-lg cursor-pointer"
        aria-label="Toggle navigation menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Aside */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gray-950/95 backdrop-blur-2xl border-r border-white/10 z-40 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header Section */}
        <div className={`p-4 border-b border-white/5 flex items-center transition-all duration-300 ${isCollapsed ? 'flex-col gap-2 justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h1 className="text-white font-bold text-sm tracking-tight truncate">Beyond Grades</h1>
                <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Staff Portal</p>
              </div>
            )}
          </div>

          {/* Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={handleToggle}
            className={`hidden lg:flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 cursor-pointer ${
              isCollapsed ? 'w-8 h-8' : 'w-7 h-7'
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <div key={item.path} className="relative group">
              <NavLink
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isCollapsed ? 'justify-center px-0' : ''
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/25 to-cyan-600/25 text-white border border-blue-500/40 shadow-sm shadow-blue-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`w-5 h-5 flex-shrink-0 transition-colors ${
                        isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                        {item.name}
                      </span>
                    )}
                    {isActive && !isCollapsed && (
                      <motion.div
                        layoutId="activeIndicatorStaff"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400"
                      />
                    )}
                  </>
                )}
              </NavLink>

              {/* Tooltip for Collapsed Sidebar */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg bg-gray-900 border border-white/15 text-white text-xs font-semibold whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex items-center">
                  <span>{item.name}</span>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Profile & Sign Out Bottom Section */}
        <div className="p-3 border-t border-white/10 bg-gray-900/60">
          <div className="relative group">
            <div
              className={`flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 mb-2 transition-all ${
                isCollapsed ? 'justify-center p-2' : ''
              }`}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full object-cover border border-white/15 flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                  {profile?.full_name ? profile.full_name.charAt(0) : 'S'}
                </div>
              )}
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-xs truncate leading-snug">
                    {profile?.full_name || 'Staff Member'}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {profile?.department || 'Faculty Mentor'}
                  </p>
                </div>
              )}
            </div>

            {/* Profile Tooltip when Collapsed */}
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 rounded-lg bg-gray-900 border border-white/15 text-white text-xs whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <p className="font-bold text-white">{profile?.full_name || 'Staff Member'}</p>
                <p className="text-[10px] text-gray-400">{profile?.department || 'Faculty Mentor'}</p>
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleSignOut}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all w-full border border-transparent hover:border-red-500/20 cursor-pointer ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="font-semibold text-xs">Sign Out</span>}
            </button>

            {/* Sign Out Tooltip when Collapsed */}
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg bg-gray-900 border border-white/15 text-red-300 text-xs font-semibold whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Sign Out
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
