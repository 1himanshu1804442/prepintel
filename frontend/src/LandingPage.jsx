import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Brain, LineChart, Code2, Sparkles, Database } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-900 text-gray-200 selection:bg-accent/30 flex flex-col font-sans overflow-hidden">
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent-light/10 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-lg shadow-accent/20">
            <Target className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">PrepIntel<span className="text-accent-light">Pro</span></span>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://github.com/1himanshu1804442/prepintel" target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">GitHub</a>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-semibold text-white transition-all">
            Enter App
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto mt-12 mb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-xs font-semibold uppercase tracking-wider mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Interview Intelligence</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tight leading-[1.1] mb-6">
            Prepare smarter using <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-light via-white to-gray-400">
              community interview intelligence.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop guessing what to study. PrepIntel tracks real interview experiences, analyzes company-specific patterns, and builds a personalized study plan to get you hired.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="group flex items-center justify-center gap-2 px-8 py-4 w-full sm:w-auto bg-gradient-to-r from-accent to-accent-light text-white rounded-xl font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5">
              Start Preparing
              <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center gap-2 px-8 py-4 w-full sm:w-auto bg-surface-800 border border-surface-600 text-gray-300 hover:text-white hover:bg-surface-700 rounded-xl font-semibold text-lg transition-all">
              Browse Companies
            </button>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="grid md:grid-cols-3 gap-6 mt-24 text-left w-full"
        >
          <div className="glass-panel p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center mb-4">
              <Database className="w-5 h-5 text-accent-light" />
            </div>
            <h3 className="text-lg font-display font-bold text-white mb-2">Live Company Data</h3>
            <p className="text-sm text-gray-400 leading-relaxed">We aggregate thousands of real interview experiences to find exactly what FAANG and top startups are asking this month.</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center mb-4">
              <Brain className="w-5 h-5 text-accent-light" />
            </div>
            <h3 className="text-lg font-display font-bold text-white mb-2">🤖 AI Coach Insights</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Powered by Gemini. Get instant analysis on any company's interview patterns, difficulty distributions, and core topics.</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center mb-4">
              <LineChart className="w-5 h-5 text-accent-light" />
            </div>
            <h3 className="text-lg font-display font-bold text-white mb-2">Personalized Plans</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Enter your interview date, and PrepIntel will generate a day-by-day roadmap targeting the highest ROI topics.</p>
          </div>
        </motion.div>
      </main>

    </div>
  );
}
