import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Brain, LineChart, Code2, Sparkles, Database, Check, TrendingUp } from 'lucide-react';
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
          <span className="font-display font-bold text-xl tracking-tight text-white">PrepIntel</span>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</button>
          <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Companies</button>
          <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">About</button>
          <a href="https://github.com/1himanshu1804442/prepintel" target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">⭐ GitHub</a>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-semibold text-white transition-all">
            Launch Dashboard
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
            Stop guessing what to study. PrepIntel tracks real interview experiences, analyzes real interview trends, and builds a personalized study plan to get you hired.
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

          <div className="mt-8 flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-sm font-medium text-gray-400">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-accent-light" /> 25 Companies</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-accent-light" /> 400+ Community Reports</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-accent-light" /> AI Study Plans</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-accent-light" /> Updated Daily</span>
          </div>
        </motion.div>

        {/* Hero Dashboard Image Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mt-16 w-full max-w-4xl mx-auto rounded-2xl border border-surface-600 bg-surface-800/50 p-2 shadow-2xl backdrop-blur-xl"
        >
          <div className="rounded-xl border border-surface-600 bg-surface-900 overflow-hidden flex flex-col">
            <div className="h-10 border-b border-surface-600 flex items-center px-4 gap-2 bg-surface-800/80">
              <div className="w-3 h-3 rounded-full bg-danger/80" />
              <div className="w-3 h-3 rounded-full bg-warning/80" />
              <div className="w-3 h-3 rounded-full bg-success/80" />
            </div>
            <div className="p-6 flex flex-col sm:flex-row gap-6 text-left">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center text-xl">🟨</div>
                  <div>
                    <h3 className="font-display font-bold text-white text-lg">Google</h3>
                    <p className="text-xs text-gray-500">2,492 community reports</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-800 rounded-lg p-3 border border-surface-600">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Top Topics</span>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs"><span className="text-gray-300">Graphs</span> <span className="text-success flex items-center gap-1">24% <TrendingUp className="w-3 h-3"/></span></div>
                      <div className="flex items-center justify-between text-xs"><span className="text-gray-300">DP</span> <span className="text-success flex items-center gap-1">18% <TrendingUp className="w-3 h-3"/></span></div>
                    </div>
                  </div>
                  <div className="bg-surface-800 rounded-lg p-3 border border-surface-600 flex flex-col justify-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Difficulty Split</span>
                    <div className="w-full h-2 bg-surface-600 rounded-full overflow-hidden flex">
                      <div className="bg-success/60 h-full w-[25%]" />
                      <div className="bg-warning/60 h-full w-[45%]" />
                      <div className="bg-danger/60 h-full w-[30%]" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-64 bg-accent/10 border border-accent/20 rounded-xl p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-accent-light" />
                  <span className="text-xs font-semibold text-white">AI Coach</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed mb-4">
                  Recent reports indicate Google interviews have shifted heavily toward graph traversal and dynamic programming. 
                </p>
                <button className="mt-auto w-full py-2 bg-accent hover:bg-accent-light transition-colors rounded-lg text-xs font-semibold text-white">
                  Generate Study Plan
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="grid md:grid-cols-3 gap-6 mt-24 text-left w-full max-w-5xl mx-auto"
        >
          <div className="glass-panel p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center mb-4">
              <Database className="w-5 h-5 text-accent-light" />
            </div>
            <h3 className="text-lg font-display font-bold text-white mb-2">Community Reports</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Track what candidates actually faced.</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center mb-4">
              <Brain className="w-5 h-5 text-accent-light" />
            </div>
            <h3 className="text-lg font-display font-bold text-white mb-2">AI Study Plans</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Generate a personalized roadmap in seconds.</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center mb-4">
              <LineChart className="w-5 h-5 text-accent-light" />
            </div>
            <h3 className="text-lg font-display font-bold text-white mb-2">Interview Trends</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Discover which topics are rising this month.</p>
          </div>
        </motion.div>
      </main>

    </div>
  );
}
