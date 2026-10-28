import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  User,
  Code,
  FolderKanban,
  Award,
  Briefcase,
  Trophy,
  Presentation,
  GitCompare,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  ChevronRight,
  MessageSquare,
  FileDigit,
  Target,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Student DNA', path: '/student-dna', icon: Sparkles },
  { name: 'Placement Predict', path: '/placement-prediction', icon: Target },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Semester Results', path: '/semester-results', icon: FileDigit },
  { name: 'Skills', path: '/skills', icon: Code },
  { name: 'Projects', path: '/projects', icon: FolderKanban },
  { name: 'Certificates', path: '/certificates', icon: Award },
  { name: 'Internships', path: '/internships', icon: Briefcase },
  { name: 'Hackathons', path: '/hackathons', icon: Trophy },
  { name: 'Workshops', path: '/workshops', icon: Presentation },
  { name: 'Compare', path: '/compare', icon: GitCompare },
  { name: 'AI Suggestions', path: '/ai-suggestions', icon: Sparkles },
  { name: 'AI Assistant', path: '/ai-assistant', icon: MessageSquare },
  { name: 'Faculty Connect', path: '/messages', icon: Users },
  { name: 'Settings', path: '/settings', icon: Settings },
];


export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ collapsed: controlledCollapsed, onToggleCollapse }: SidebarProps = {}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const handleToggle = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl text-white"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: collapsed ? 80 : 260,
          x: mobileOpen ? 0 : typeof window !== 'undefined' && window.innerWidth < 1024 ? -280 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed left-0 top-0 h-screen bg-gray-950/80 backdrop-blur-xl border-r border-white/10 z-40 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between">
          <motion.div
            initial={false}
            animate={{ opacity: collapsed ? 0 : 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-white font-bold">Beyond Grades</h1>
                <p className="text-xs text-gray-500">Growth Intelligence</p>
              </div>
            )}
          </motion.div>
          <button
            onClick={handleToggle}
            className="hidden lg:flex p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight
              className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white border border-purple-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? 'text-purple-400' : 'text-gray-500 group-hover:text-white'
                    }`}
                  />
                  {!collapsed && <span className="font-medium">{item.name}</span>}
                  {isActive && !collapsed && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div
            className={`flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-3 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {profile?.full_name?.charAt(0) || ''}
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{profile?.full_name || ''}</p>
                <p className="text-xs text-gray-500 truncate">{profile?.department || ''}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all w-full ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
