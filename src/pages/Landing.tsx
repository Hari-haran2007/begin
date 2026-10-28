import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Users, ArrowRight, Sparkles } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #9C92AC 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      <div className="absolute top-1/4 -left-32 w-[30rem] h-[30rem] bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-[30rem] h-[30rem] bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Navbar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12 md:py-6 border-b border-white/5 bg-gray-950/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight">Beyond Grades</h1>
            <p className="text-xs text-purple-400 font-medium">Growth Intelligence</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">About</a>
          <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</a>
          <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Contact</a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" /> Welcome to the future of education
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Who are you?
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Choose your portal to continue to the Beyond Grades platform.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto">
          {/* Student Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group relative backdrop-blur-xl bg-white/5 border border-white/10 hover:border-purple-500/50 rounded-3xl p-8 flex flex-col h-full overflow-hidden transition-all duration-300 shadow-2xl shadow-purple-900/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="w-8 h-8 text-purple-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">Student Portal</h3>
              <p className="text-gray-400 leading-relaxed mb-8 flex-1">
                Track your academic growth, verify semester results, calculate SGPA & CGPA, manage skills, projects and AI insights.
              </p>
              
              <Link 
                to="/student/login"
                className="inline-flex items-center justify-center gap-2 w-full py-4 px-6 bg-white/5 hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 text-white font-medium rounded-xl border border-white/10 hover:border-transparent transition-all duration-300 group/btn"
              >
                Continue as Student
                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          {/* Staff Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group relative backdrop-blur-xl bg-white/5 border border-white/10 hover:border-blue-500/50 rounded-3xl p-8 flex flex-col h-full overflow-hidden transition-all duration-300 shadow-2xl shadow-blue-900/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">Staff Portal</h3>
              <p className="text-gray-400 leading-relaxed mb-8 flex-1">
                Monitor students, verify academic records, review uploaded results, approve certificates and view analytics.
              </p>
              
              <Link 
                to="/staff/login"
                className="inline-flex items-center justify-center gap-2 w-full py-4 px-6 bg-white/5 hover:bg-gradient-to-r hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl border border-white/10 hover:border-transparent transition-all duration-300 group/btn"
              >
                Continue as Staff
                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
