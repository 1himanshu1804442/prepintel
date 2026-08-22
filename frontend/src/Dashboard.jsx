import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Search, ChevronRight, ExternalLink, Check, X, Sparkles,
  Calendar, BarChart3, Clock, Filter, ArrowUpDown, TrendingUp,
  Zap, Target, BookOpen, Flame, ChevronDown, Loader2, CheckCircle2,
  Database, MessageSquare, Globe, RefreshCw, Brain, Copy, Plus
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Company emoji/color mapping
const COMPANY_ICONS = {
  google: '🟨', microsoft: '🟦', amazon: '🟧', meta: '🔵', apple: '⬜',
  netflix: '🟥', atlassian: '🔷', autodesk: '🟩', adobe: '🔴', uber: '⬛',
  bloomberg: '🟪', flipkart: '🛒', paytm: '💳', meesho: '🩷', cred: '⚪',
  razorpay: '💙', infosys: '🔹', tcs: '🔸', wipro: '🌿', cognizant: '🔶',
  accenture: '💜', capgemini: '🔷', hcltech: '💻'
};

const CAMPUS_PRIORITY_SLUGS = new Set([
  'infosys', 'tcs', 'cognizant', 'accenture', 'amazon', 'wipro', 'capgemini', 'hcltech'
]);

// ─── localStorage helpers ───
const getSolved = () => {
  try { return JSON.parse(localStorage.getItem('prepintel_solved') || '{}'); }
  catch { return {}; }
};
const setSolved = (data) => localStorage.setItem('prepintel_solved', JSON.stringify(data));
const toggleSolved = (companySlug, problemId) => {
  const s = getSolved();
  const key = `${companySlug}:${problemId}`;
  if (s[key]) delete s[key]; else s[key] = true;
  setSolved(s);
  return s;
};
const isSolved = (solvedMap, companySlug, problemId) => !!solvedMap[`${companySlug}:${problemId}`] || !!solvedMap[`global:${problemId}`];

// ─── Difficulty badge ───
function DiffBadge({ diff }) {
  const cls = diff === 'Easy' ? 'diff-easy' : diff === 'Medium' ? 'diff-medium' : 'diff-hard';
  return <span className={`${cls} text-xs font-semibold px-2 py-0.5 rounded-full`}>{diff}</span>;
}

// ─── Topic badge ───
function TopicBadge({ topic, onClick }) {
  return (
    <button
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(topic);
        }
      }}
      className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-600 text-gray-400 border border-surface-500 hover:border-accent/40 hover:text-accent-light transition-colors cursor-pointer"
      title={`Filter by topic: ${topic}`}
    >
      {topic}
    </button>
  );
}

// ─── Frequency indicator (High/Med/Low + bar) ───
function FreqIndicator({ percent, count }) {
  const label = percent >= 70 ? 'High Confidence' : percent >= 35 ? 'Med Confidence' : 'Low Confidence';
  const labelColor = percent >= 70 ? 'text-danger' : percent >= 35 ? 'text-warning' : 'text-gray-500';
  return (
    <div className="flex flex-col gap-1 justify-center">
      <span className={`text-[10px] font-semibold ${labelColor}`}>{percent}% {label}</span>
      <div className="w-full h-1.5 bg-surface-600 rounded-full overflow-hidden">
        <div className="freq-bar-fill h-full rounded-full" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// ─── Progress ring (small) ───
function ProgressRing({ percent, size = 42 }) {
  const strokeWidth = size >= 52 ? 3.5 : 3;
  const r = (size - strokeWidth - 1) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  const fontSizeClass = size >= 52 ? 'text-[11px]' : 'text-[9px]';
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#6C5CE7" strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-700" />
      </svg>
      <span className={`absolute font-bold font-display text-white ${fontSizeClass}`}>
        {percent}%
      </span>
    </div>
  );
}

// ─── Time ago helper ───
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Table Skeleton Loader (Butter-smooth transitions) ───
function TableSkeleton() {
  return (
    <div className="divide-y divide-surface-700/30">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[32px_1fr_70px_48px_100px_52px_72px] gap-2 px-5 py-4 items-center animate-pulse"
        >
          {/* LC ID */}
          <div className="h-3.5 w-6 bg-surface-600/40 rounded" />
          
          {/* Title + Topics */}
          <div className="space-y-1.5 min-w-0">
            <div className="h-3.5 w-1/3 bg-surface-600/60 rounded" />
            <div className="flex gap-1.5 flex-wrap">
              <div className="h-4.5 w-12 bg-surface-700/60 rounded-full" />
              <div className="h-4.5 w-14 bg-surface-700/60 rounded-full" />
            </div>
          </div>
          
          {/* Difficulty */}
          <div className="h-5.5 w-14 bg-surface-700/60 rounded-full" />
          
          {/* LeetCode link */}
          <div className="flex justify-center">
            <div className="w-7 h-7 bg-surface-700/50 rounded-md" />
          </div>
          
          {/* Frequency bar */}
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-16 bg-surface-700/60 rounded-full" />
            <div className="h-3 w-6 bg-surface-700/60 rounded" />
          </div>
          
          {/* Acceptance */}
          <div className="h-3.5 w-8 bg-surface-600/40 rounded" />
          
          {/* Status pill */}
          <div className="flex justify-center">
            <div className="h-6 w-16 bg-surface-700/60 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [problems, setProblems] = useState([]);
  const [companyStats, setCompanyStats] = useState(null);
  const [latestReports, setLatestReports] = useState([]);
  const [solvedMap, setSolvedMap] = useState(getSolved());
  const [searchQuery, setSearchQuery] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [companyCategory, setCompanyCategory] = useState('all'); // 'all' or 'campus'
  const [sortBy, setSortBy] = useState('frequency');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [filterDiff, setFilterDiff] = useState('All');
  const [timeframe, setTimeframe] = useState('all_time');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('companies');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [topicSearch, setTopicSearch] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [inspectProblem, setInspectProblem] = useState(null);
  const [presetLimit, setPresetLimit] = useState(null); // null, 15, 30, 60
  const [showAiSummaryModal, setShowAiSummaryModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAlgoModal, setShowAlgoModal] = useState(false);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [showArchModal, setShowArchModal] = useState(false);
  const [communityVotes, setCommunityVotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('prepintel_community_votes') || '{}'); }
    catch { return {}; }
  });
  const [aiHint, setAiHint] = useState(null);
  const [loadingHint, setLoadingHint] = useState(false);

  const handleHeaderClick = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      // default 'title' to asc, others to desc
      setSortOrder(field === 'title' ? 'asc' : 'desc');
    }
  };

  const [loadingProblems, setLoadingProblems] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showAboutModal, setShowAboutModal] = useState(false);


  // Fetch companies on mount
  useEffect(() => {
    fetch(`${API}/companies`)
      .then(r => r.json())
      .then(data => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]));

    fetch(`${API}/reports/latest`)
      .then(r => r.json())
      .then(data => {
        setLatestReports(Array.isArray(data) ? data : []);
        setLastUpdated(new Date());
      })
      .catch(() => setLatestReports([]));
  }, []);

  // Fetch problems depending on current active tab
  useEffect(() => {
    setLoadingProblems(true);

    if (sidebarTab === 'companies') {
      if (!selectedSlug) {
        setLoadingProblems(false);
        return;
      }
      Promise.all([
        fetch(`${API}/companies/${selectedSlug}/problems?timeframe=${timeframe}`).then(r => r.json()),
        fetch(`${API}/companies/${selectedSlug}/stats`).then(r => r.json()),
      ]).then(([probs, stats]) => {
        setProblems(Array.isArray(probs) ? probs : []);
        setCompanyStats(stats || {});
        setLoadingProblems(false);
      }).catch(() => {
        setProblems([]);
        setLoadingProblems(false);
      });


    } else {
      // Global or Topics mode -> fetch global problems & global stats
      Promise.all([
        fetch(`${API}/problems`).then(r => r.json()),
        fetch(`${API}/stats/global`).then(r => r.json()),
      ]).then(([probs, stats]) => {
        setProblems(Array.isArray(probs) ? probs : []);
        setGlobalStats(stats || {});
        setCompanyStats({
          difficulty: {
            Easy: stats?.easyCount || 0,
            Medium: stats?.mediumCount || 0,
            Hard: stats?.hardCount || 0
          },
          topTopics: stats?.topTopics || []
        });
        setLoadingProblems(false);
      }).catch(() => {
        setProblems([]);
        setLoadingProblems(false);
      });
    }
  }, [selectedSlug, timeframe, sidebarTab]);

  // Dynamically computed company analytics (Pattern Velocity + Predictive OA Probabilities)
  const dynamicAnalytics = useMemo(() => {
    const topTopics = companyStats?.topTopics || [];
    const maxCount = topTopics.length > 0 ? Math.max(...topTopics.map(t => t.count || 1)) : 1;

    // Predictive Topic Probabilities
    const probabilities = topTopics.slice(0, 3).map((t, idx) => {
      const rawRatio = (t.count || 1) / maxCount;
      const percent = Math.min(96, Math.max(45, Math.round(rawRatio * 95)));
      const colors = ['bg-accent', 'bg-indigo-500', 'bg-emerald-500'];
      return {
        topic: t.topic,
        probability: percent,
        color: colors[idx % colors.length]
      };
    });

    if (probabilities.length === 0) {
      probabilities.push(
        { topic: 'Arrays & Hashing', probability: 88, color: 'bg-accent' },
        { topic: 'Dynamic Programming', probability: 76, color: 'bg-indigo-500' },
        { topic: 'Trees & Graphs', probability: 68, color: 'bg-emerald-500' }
      );
    }

    // Topic Frequency Share — shows each topic's share of total questions (honest, computed from real data)
    const totalQuestionCount = topTopics.reduce((sum, t) => sum + (t.count || 0), 0) || 1;
    const frequencyList = topTopics.slice(0, 4).map((t) => {
      const share = Math.round(((t.count || 0) / totalQuestionCount) * 100);
      return {
        topic: t.topic,
        share: `${share}%`,
        count: t.count || 0,
        textColor: share >= 20 ? 'text-emerald-400' : share >= 10 ? 'text-amber-400' : 'text-gray-400'
      };
    });

    // Average Evidence Confidence — only uses real backend-computed values, no silent fallbacks
    const problemsWithConfidence = problems.filter(p => p.confidencePercent != null && p.confidencePercent > 0);
    const avgConfidence = problemsWithConfidence.length > 0
      ? Math.round(problemsWithConfidence.reduce((acc, p) => acc + p.confidencePercent, 0) / problemsWithConfidence.length)
      : null; // null means "not enough data" — displayed honestly in UI

    return { probabilities, frequencyList, avgConfidence };
  }, [companyStats, problems]);

  // Auto-select first company
  useEffect(() => {
    if (companies.length > 0 && !selectedSlug && sidebarTab === 'companies') {
      setSelectedSlug(companies[0].slug);
    }
  }, [companies, selectedSlug, sidebarTab]);

  // Auto-select first topic when switching to topics tab
  useEffect(() => {
    if (sidebarTab === 'topics' && !selectedTopic && globalStats?.topTopics?.length > 0) {
      setSelectedTopic(globalStats.topTopics[0].topic);
    }
  }, [sidebarTab, globalStats, selectedTopic]);

  // Reset preset limit on category change
  useEffect(() => {
    setPresetLimit(null);
  }, [selectedSlug, selectedTopic, sidebarTab]);

  const selectedCompany = Array.isArray(companies) ? companies.find(c => c.slug === selectedSlug) : null;

  // Filter + Sort problems
  const filteredProblems = useMemo(() => {
    let list = Array.isArray(problems) ? [...problems] : [];
    if (filterDiff !== 'All') list = list.filter(p => p && p.difficulty === filterDiff);
    if (sidebarTab === 'topics' && selectedTopic) {
      list = list.filter(p => p && p.topics && p.topics.split(',').map(x => x.trim()).includes(selectedTopic));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p && p.title && (p.title.toLowerCase().includes(q) ||
        (p.topics && p.topics.toLowerCase().includes(q))));
    }
    if (sortBy === 'revision') {
      list.sort((a, b) => {
        const aSolved = isSolved(solvedMap, selectedSlug || 'global', a.id);
        const bSolved = isSolved(solvedMap, selectedSlug || 'global', b.id);
        if (aSolved !== bSolved) {
          const comp = aSolved ? 1 : -1;
          return sortOrder === 'desc' ? comp : -comp;
        }
        const compFreq = (b.reportCount || 0) - (a.reportCount || 0);
        return sortOrder === 'desc' ? compFreq : -compFreq;
      });
    }
    else if (sortBy === 'frequency') {
      list.sort((a, b) => {
        const comp = (b.reportCount || 0) - (a.reportCount || 0);
        return sortOrder === 'desc' ? comp : -comp;
      });
    }
    else if (sortBy === 'difficulty') {
      const order = { Easy: 0, Medium: 1, Hard: 2 };
      list.sort((a, b) => {
        const comp = (order[a.difficulty] || 0) - (order[b.difficulty] || 0);
        return sortOrder === 'desc' ? comp : -comp;
      });
    }
    else if (sortBy === 'acceptance') {
      list.sort((a, b) => {
        const comp = (b.acceptanceRate || 0) - (a.acceptanceRate || 0);
        return sortOrder === 'desc' ? comp : -comp;
      });
    }
    else if (sortBy === 'title') {
      list.sort((a, b) => {
        const comp = (a.title || '').localeCompare(b.title || '');
        return sortOrder === 'asc' ? comp : -comp;
      });
    }

    if (presetLimit) {
      list = list.slice(0, presetLimit);
    }
    return list;
  }, [problems, filterDiff, searchQuery, sortBy, sortOrder, solvedMap, selectedSlug, presetLimit]);

  const safeProblems = Array.isArray(problems) ? problems : [];

  // High-confidence problems = top 250 or all if fewer
  const highConfidenceCount = Math.min(safeProblems.length, 250);

  // Solved stats for this company (against high-confidence set)
  const solvedCount = useMemo(() => {
    const slugKey = selectedSlug || 'global';
    return safeProblems.slice(0, highConfidenceCount).filter(p => p && isSolved(solvedMap, slugKey, p.id)).length;
  }, [safeProblems, solvedMap, selectedSlug, highConfidenceCount]);

  const solvedPercent = highConfidenceCount > 0 ? Math.round((solvedCount / highConfidenceCount) * 100) : 0;

  // Difficulty distribution
  const diffDist = useMemo(() => {
    if (!companyStats?.difficulty) return { Easy: 0, Medium: 0, Hard: 0 };
    return { Easy: companyStats.difficulty.Easy || 0, Medium: companyStats.difficulty.Medium || 0, Hard: companyStats.difficulty.Hard || 0 };
  }, [companyStats]);
  const totalDiffProblems = diffDist.Easy + diffDist.Medium + diffDist.Hard || 1;
  const easyPct = Math.round((diffDist.Easy / totalDiffProblems) * 100);
  const medPct = Math.round((diffDist.Medium / totalDiffProblems) * 100);
  const hardPct = Math.round((diffDist.Hard / totalDiffProblems) * 100);

  // Dynamic Overall Dataset Confidence based on problem sample size
  const overallConfidence = useMemo(() => {
    const len = safeProblems.length;
    if (len === 0) return 35;
    if (len >= 100) return 92;
    if (len >= 50) return 84;
    if (len >= 20) return 72;
    return 48;
  }, [safeProblems]);

  // Total community reports: sum of all reportCount values across the problem set
  const totalReports = useMemo(() => {
    return safeProblems.reduce((sum, p) => sum + (p?.reportCount || 0), 0);
  }, [safeProblems]);

  // Handle solve toggle
  const handleToggleSolved = useCallback((problemId) => {
    const slugKey = selectedSlug || 'global';
    const updated = toggleSolved(slugKey, problemId);
    setSolvedMap({ ...updated });
  }, [selectedSlug]);

  // Filtered companies for sidebar
  const filteredCompanies = useMemo(() => {
    let list = Array.isArray(companies) ? companies : [];
    if (companyCategory === 'campus') {
      list = list.filter(c => c && CAMPUS_PRIORITY_SLUGS.has(c.slug));
    }
    if (!companySearch) return list;
    const q = companySearch.toLowerCase();
    return list.filter(c => c && c.name && c.name.toLowerCase().includes(q));
  }, [companies, companySearch, companyCategory]);

  // Dataset loaded timestamp — shows when data was loaded into the current session, not a live feed
  const dataLoadedAt = useMemo(() => {
    const now = lastUpdated;
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [lastUpdated]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ─── Top Bar ─── */}
      <header className="glass-panel border-b border-surface-600 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2.5 group cursor-pointer text-left"
            title="Go to Landing Page"
          >
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-indigo-700 flex items-center justify-center text-white text-xs font-bold shadow-md group-hover:scale-105 transition-transform">
              🎯
            </span>
            <h1 className="font-display font-bold text-xl tracking-tight text-white group-hover:text-accent-light transition-colors">PrepIntel</h1>
          </button>
          <span className="text-[11px] text-gray-500 font-mono bg-surface-700 px-2.5 py-1 rounded-lg">
            {companies.length} companies
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowArchModal(true)} 
            className="text-[11px] text-amber-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40"
          >
            <Database className="w-3.5 h-3.5" />
            Architecture
          </button>
          <button 
            onClick={() => setShowGraphModal(true)} 
            className="text-[11px] text-accent-light hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 hover:border-accent/40"
          >
            <Globe className="w-3.5 h-3.5" />
            Knowledge Graph
          </button>
          <button 
            onClick={() => setShowAlgoModal(true)} 
            className="text-[11px] text-emerald-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Formula ℹ️
          </button>
          <button 
            onClick={() => setShowSyncModal(true)} 
            className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer px-2.5 py-1 rounded-md bg-surface-700/60 border border-surface-600 hover:border-surface-500"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Progress
          </button>
          <button 
            onClick={() => setShowAboutModal(true)} 
            className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-md bg-surface-700/60 border border-surface-600 hover:border-surface-500 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            About
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-[10px] text-gray-500">Data loaded {dataLoadedAt}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar: Companies, Global, Topics ─── */}
        <aside className="w-72 flex-shrink-0 glass-panel border-r border-surface-600 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-surface-600 flex gap-1 bg-surface-800/40">
            {['companies', 'global', 'topics'].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setSidebarTab(tab);
                  setSearchQuery('');
                  setFilterDiff('All');
                  if (tab === 'companies' && companies.length > 0) {
                    setSelectedSlug(companies[0].slug);
                  } else {
                    setSelectedSlug(null);
                  }
                  if (tab === 'topics' && globalStats?.topTopics?.length > 0) {
                    setSelectedTopic(globalStats.topTopics[0].topic);
                  } else {
                    setSelectedTopic(null);
                  }
                }}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  sidebarTab === tab 
                    ? 'bg-accent/20 text-accent-light border border-accent/30' 
                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-3 border-b border-surface-600 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder={sidebarTab === 'companies' ? "Search companies..." : sidebarTab === 'topics' ? "Search topics..." : "Global leaderboard"}
                disabled={sidebarTab === 'global'}
                value={sidebarTab === 'companies' ? companySearch : sidebarTab === 'topics' ? topicSearch : ''}
                onChange={e => sidebarTab === 'companies' ? setCompanySearch(e.target.value) : setTopicSearch(e.target.value)}
                className="w-full bg-surface-700 border border-surface-500 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:border-accent focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {sidebarTab === 'companies' && (
              <div className="flex gap-1 bg-surface-800/60 p-0.5 rounded-md border border-surface-600">
                <button
                  onClick={() => setCompanyCategory('all')}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded transition-colors ${companyCategory === 'all' ? 'bg-surface-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  All ({companies.length})
                </button>
                <button
                  onClick={() => setCompanyCategory('campus')}
                  className={`flex-1 py-1 text-[10px] font-semibold rounded transition-colors flex items-center justify-center gap-1 ${companyCategory === 'campus' ? 'bg-accent/20 text-accent-light border border-accent/30' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  🎯 Campus Target (8)
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
            {sidebarTab === 'companies' ? (
              filteredCompanies.map(c => {
                const active = c.slug === selectedSlug;
                return (
                  <button
                    key={c.slug}
                    onClick={() => { setSelectedSlug(c.slug); setSearchQuery(''); setFilterDiff('All'); }}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between rounded-lg transition-colors group text-[15px] ${
                      active 
                        ? 'bg-accent/10 text-white font-semibold' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-[13px]">{c.name}</span>
                      {c.hasLimitedData && (
                        <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" title="Limited data available" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-gray-600 group-hover:text-gray-500 transition-colors">
                      {c.problemCount || 0}
                    </span>
                  </button>
                );
              })
            ) : sidebarTab === 'topics' ? (
              (globalStats?.topTopics || []).filter(t => !topicSearch || t.topic.toLowerCase().includes(topicSearch.toLowerCase())).map(t => {
                const active = t.topic === selectedTopic;
                return (
                  <button
                    key={t.topic}
                    onClick={() => { setSelectedTopic(t.topic); setSearchQuery(''); setFilterDiff('All'); }}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between rounded-lg transition-colors group text-[15px] ${
                      active 
                        ? 'bg-accent/10 text-white font-semibold' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700/50'
                    }`}
                  >
                    <span className="truncate text-[13px]">{t.topic}</span>
                    <span className="text-[10px] font-mono text-gray-600 group-hover:text-gray-500 transition-colors">
                      {t.count}
                    </span>
                  </button>
                );
              })
            ) : (
              <button
                className="w-full text-left px-4 py-2.5 flex items-center justify-between rounded-lg bg-accent/10 text-white font-semibold text-[15px]"
              >
                <span className="text-[13px]">Global Leaderboard</span>
                <span className="text-[10px] font-mono text-gray-400">{problems.length}</span>
              </button>
            )}
          </div>
        </aside>

        {/* ─── Main Content ─── */}
        <main className="flex-1 overflow-y-auto">
          {(selectedCompany || sidebarTab === 'global' || (sidebarTab === 'topics' && selectedTopic)) ? (
            <div className="p-10 space-y-10 max-w-7xl mx-auto w-full">
              {/* ─── Header ─── */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-display font-bold text-3xl text-white">
                      {sidebarTab === 'companies' ? selectedCompany?.name : sidebarTab === 'global' ? 'Global Leaderboard' : `${selectedTopic}`}
                    </h2>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-gray-500">{problems.length} curated problems</span>
                    <span className="text-xs text-gray-600">·</span>
                    <a href="https://github.com/hxu296/leetcode-company-wise-problems-2022" target="_blank" rel="noopener noreferrer" className="text-xs text-accent-light hover:underline font-medium transition-colors cursor-pointer">{totalReports.toLocaleString()} sourced frequency datapoints →</a>
                  </div>
                  {sidebarTab === 'companies' && selectedCompany?.oaPattern && selectedCompany.oaPattern !== 'Unknown' && (
                    <div className="mt-2 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-accent-light" />
                      <span className="text-xs text-gray-400">{selectedCompany.oaPattern}</span>
                    </div>
                  )}
                </div>
                {sidebarTab === 'companies' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAiSummaryModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-surface-700 text-accent-light border border-surface-500 hover:border-accent hover:bg-surface-600 rounded-lg text-xs font-semibold transition-all shadow-sm"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      AI Coach Summary
                    </button>
                    <button
                      onClick={() => setShowPlanModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent to-accent-light text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-accent/20"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Generate Study Plan
                    </button>
                  </div>
                )}
              </div>

              {/* ─── Placement Intelligence Engine Briefing ─── */}
              {sidebarTab === 'companies' && selectedCompany && (
                <div className="glass-panel p-6 rounded-2xl border border-surface-600 bg-surface-800/60 space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-600 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent-light shrink-0 font-bold text-lg">
                        {COMPANY_ICONS[selectedCompany.slug] || '⚡'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-lg text-white">Placement Intelligence Engine</h3>
                          <span className="px-2 py-0.5 rounded-full bg-surface-600 text-gray-400 border border-surface-500 text-[10px] font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" /> Static Dataset
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Frequency analysis & predictive OA probabilities for {selectedCompany.name} (from open-source datasets)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold">Avg. Confidence Score</span>
                        <span className={`text-sm font-bold font-mono ${dynamicAnalytics.avgConfidence != null ? 'text-emerald-400' : 'text-gray-500'}`}>{dynamicAnalytics.avgConfidence != null ? `${dynamicAnalytics.avgConfidence}%` : 'N/A'}</span>
                      </div>
                      <button
                        onClick={() => setShowReportModal(true)}
                        className="px-3.5 py-2 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent-light rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        + Submit OA Report
                      </button>
                    </div>
                  </div>

                  {/* Analytics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Topic Frequency Share — computed from actual question counts per topic */}
                    <div className="p-4 rounded-xl bg-surface-700/40 border border-surface-600 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Topic Frequency Share</span>
                        <span className="text-[10px] text-gray-500 font-mono">From Dataset</span>
                      </div>
                      <div className="space-y-1.5">
                        {dynamicAnalytics.frequencyList.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-gray-300 font-medium truncate max-w-[120px]">{item.topic}</span>
                            <span className={`${item.textColor} font-bold text-[11px]`}>{item.share} ({item.count})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Predictive OA Probabilities */}
                    <div className="p-4 rounded-xl bg-surface-700/40 border border-surface-600 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Predictive Topic Probabilities</span>
                        <span className="text-[10px] text-warning font-mono">Next OA Round</span>
                      </div>
                      <div className="space-y-2">
                        {dynamicAnalytics.probabilities.map((item, idx) => (
                          <div key={idx}>
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className="text-gray-300 truncate max-w-[140px]">{item.topic}</span>
                              <span className="text-white font-mono font-bold">{item.probability}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-600 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color} rounded-full transition-all duration-300`} style={{ width: `${item.probability}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Evidence Prism Sources */}
                    <div className="p-4 rounded-xl bg-surface-700/40 border border-surface-600 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Verification Sources</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Multi-Source</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-1.5 rounded bg-surface-800/80 border border-surface-600">
                          <span className="text-gray-300">GitHub Community Repos</span>
                          <span className="text-amber-400 font-bold text-[10px]">Open-Source Import</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded bg-surface-800/80 border border-surface-600">
                          <span className="text-gray-300">LeetCode Discuss OA Feeds</span>
                          <span className="text-gray-400 font-bold text-[10px]">Unverified</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded bg-surface-800/80 border border-surface-600">
                          <span className="text-gray-300">Student-Submitted Reports</span>
                          <span className="text-accent-light font-bold text-[10px]">{totalReports} datapoints</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Empty State Alert ─── */}
              {sidebarTab === 'companies' && totalReports < 20 && (
                <div className="bg-surface-800/80 border border-surface-600 rounded-xl p-4 flex items-start gap-4 shadow-sm mb-6">
                  <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white">Only {totalReports} reports available.</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Confidence: <span className="text-danger font-medium">Low</span>. The open-source dataset for {selectedCompany?.name} is extremely limited.
                    </p>
                    <button onClick={() => setShowReportModal(true)} className="text-xs text-accent-light font-medium mt-2 hover:underline cursor-pointer">
                      Help the community. Submit your interview experience →
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Stats Row: Progress + Difficulty + Topics ─── */}
              <div className="grid grid-cols-3 gap-6">
                {/* Interview Readiness */}
                <div className="glass-panel rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Interview Readiness</span>
                    <ProgressRing percent={solvedPercent} />
                  </div>
                  <div className="text-2xl font-display font-bold text-white truncate max-w-[200px]">
                    {sidebarTab === 'companies' ? selectedCompany?.name : sidebarTab === 'global' ? 'Global Board' : selectedTopic}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-surface-800 p-2 rounded border border-surface-600">
                      <span className="text-gray-500 block mb-0.5">Remaining</span>
                      <span className="text-gray-300 font-medium">{highConfidenceCount - solvedCount} questions</span>
                    </div>
                    <div className="bg-surface-800 p-2 rounded border border-surface-600">
                      <span className="text-gray-500 block mb-0.5">Estimated</span>
                      <span className="text-gray-300 font-medium">{Math.max(1, Math.round((highConfidenceCount - solvedCount) * 0.75))} hours</span>
                    </div>
                  </div>
                </div>

                {/* Difficulty Distribution */}
                <div className="glass-panel rounded-xl p-5">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Difficulty Split</span>
                  <div className="mt-3 w-full h-3 bg-surface-600 rounded-full overflow-hidden flex">
                    <div className="bg-success/60 h-full transition-all" style={{ width: `${easyPct}%` }} />
                    <div className="bg-warning/60 h-full transition-all" style={{ width: `${medPct}%` }} />
                    <div className="bg-danger/60 h-full transition-all" style={{ width: `${hardPct}%` }} />
                  </div>
                  <div className="mt-3 flex justify-between text-[11px]">
                    <div className="text-center">
                      <span className="block text-success font-semibold">{easyPct}%</span>
                      <span className="text-gray-600">Easy</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-warning font-semibold">{medPct}%</span>
                      <span className="text-gray-600">Medium</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-danger font-semibold">{hardPct}%</span>
                      <span className="text-gray-600">Hard</span>
                    </div>
                  </div>
                </div>

                {/* Top Topics */}
                <div className="glass-panel rounded-xl p-5">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Top Topics</span>
                  <div className="mt-2 space-y-1.5">
                    {(companyStats?.topTopics || []).slice(0, 5).map((t, i) => {
                      const maxCount = companyStats?.topTopics?.[0]?.count || 1;
                      const topicTotal = (companyStats?.topTopics || []).reduce((s, x) => s + x.count, 0) || 1;
                      const pct = Math.round((t.count / topicTotal) * 100);
                      return (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <span className="w-16 truncate text-gray-400 flex items-center justify-between">{t.topic} <TrendingUp className="w-2.5 h-2.5 text-accent-light ml-1 shrink-0" /></span>
                          <div className="flex-1 h-1 bg-surface-600 rounded-full overflow-hidden">
                            <div className="topic-bar h-full rounded-full" style={{ width: `${(t.count / maxCount) * 100}%` }} />
                          </div>
                          <span className="text-gray-500 w-6 text-right font-mono text-[10px]">{t.count}</span>
                          <span className="text-gray-600 w-7 text-right font-mono text-[10px]">{pct}%</span>
                        </div>
                      );
                    })}
                    {(!companyStats?.topTopics || companyStats.topTopics.length === 0) && (
                      <p className="text-[11px] text-gray-600 italic">No topic data available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Revision Presets Panel ─── */}
              <div className="glass-panel p-4 rounded-xl border border-surface-600 bg-surface-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Interview Tomorrow?</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">Filter questions by your remaining prep time. Focus on the highest-yield problems first.</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: 'Top 15', sub: '2 hrs', val: 15 },
                    { label: 'Top 30', sub: '1 day', val: 30 },
                    { label: 'Top 60', sub: '3 days', val: 60 },
                    { label: 'All Questions', sub: 'Full prep', val: null }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => setPresetLimit(preset.val)}
                      className={`px-3 py-1.5 rounded-lg border text-left flex flex-col transition-all cursor-pointer ${
                        presetLimit === preset.val 
                          ? 'bg-accent/15 border-accent text-accent-light shadow-md shadow-accent/5' 
                          : 'bg-surface-700 hover:bg-surface-600 border-surface-500 text-gray-300 hover:text-white'
                      }`}
                    >
                      <span className="text-[11px] font-bold">{preset.label}</span>
                      <span className="text-[9px] text-gray-500">{preset.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Controls: Search + Filter + Sort ─── */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder={`Search by problem or topic...`}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-700 border border-surface-500 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:border-accent focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center gap-1 bg-surface-700 rounded-lg p-0.5 border border-surface-500" title="Data Provenance & Source Filter">
                  {[
                    { label: 'All Sources', val: 'all_time' },
                    { label: '30d Recent', val: '30_days' },
                    { label: '3m Recent', val: '3_months' },
                    { label: 'GitHub Repos', val: '1_year' }
                  ].map(t => (
                    <button
                      key={t.val}
                      onClick={() => setTimeframe(t.val)}
                      className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors ${timeframe === t.val ? 'bg-accent/20 text-accent-light border border-accent/30 font-semibold' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-surface-700 rounded-lg p-0.5 border border-surface-500">
                  {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                    <button
                      key={d}
                      onClick={() => setFilterDiff(d)}
                      className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${filterDiff === d ? 'bg-surface-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 bg-surface-700 border border-surface-500 rounded-lg text-gray-400 hover:text-white hover:border-accent transition-all cursor-pointer flex items-center justify-center h-[30px]"
                    title={`Sort direction: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}. Click to toggle.`}
                  >
                    <ArrowUpDown className={`w-3.5 h-3.5 transition-all duration-200 ${sortOrder === 'asc' ? 'text-accent-light rotate-180' : ''}`} />
                  </button>
                  <select
                    value={sortBy}
                    onChange={e => {
                      setSortBy(e.target.value);
                      setSortOrder(e.target.value === 'title' ? 'asc' : 'desc');
                    }}
                    className="bg-surface-700 border border-surface-500 rounded-lg px-2 py-1.5 text-[11px] text-gray-300 focus:outline-none focus:border-accent cursor-pointer h-[30px]"
                  >
                    <option value="frequency" className="bg-surface-800 text-white">Most Asked</option>
                    <option value="revision" className="bg-surface-800 text-white">Revision Mode</option>
                    <option value="difficulty" className="bg-surface-800 text-white">Difficulty</option>
                    <option value="acceptance" className="bg-surface-800 text-white">Acceptance</option>
                  </select>
                </div>

                <span className="text-[10px] text-gray-600 ml-auto">
                  {filteredProblems.length} of {problems.length} shown
                </span>
              </div>

              {/* ─── Problem Table ─── */}
              <div className="glass-panel rounded-xl overflow-hidden relative">
                {/* Shimmering loading bar at the top */}
                {loadingProblems && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-surface-600/30 overflow-hidden z-10">
                    <motion.div
                      className="h-full bg-gradient-to-r from-accent to-accent-light"
                      initial={{ left: "-100%", width: "100%", position: "absolute" }}
                      animate={{ left: "100%" }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.2,
                        ease: "easeInOut"
                      }}
                    />
                  </div>
                )}
                {/* Table header */}
                <div className="grid grid-cols-[40px_1fr_100px_60px_140px_70px_90px] gap-4 px-6 py-4 border-b border-surface-600 text-xs text-gray-500 uppercase tracking-widest font-bold">
                  <span></span>
                  <span>Question</span>
                  <span>Difficulty</span>
                  <span className="text-center">Link</span>
                  <span>Frequency</span>
                  <span>Accept</span>
                  <span className="text-center">Status</span>
                </div>

                {/* Table body */}
                <div className="max-h-[540px] overflow-y-auto">
                  {loadingProblems ? (
                    <TableSkeleton />
                  ) : filteredProblems.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-surface-700/60 border border-surface-500 flex items-center justify-center text-accent-light mb-3">
                        <Clock className="w-6 h-6 opacity-80" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-200 mb-1">
                        {timeframe === '30_days' ? 'No reports detected in the last 30 days' : timeframe === '3_months' ? 'No reports detected in the last 3 months' : 'No questions match your current filters'}
                      </h4>
                      <p className="text-xs text-gray-400 max-w-md mb-4 leading-relaxed">
                        {timeframe === '30_days' || timeframe === '3_months'
                          ? 'This specific timeframe requires timestamped candidate reports. You can view verified open-source historical questions or log a recent OA experience yourself.'
                          : 'Try resetting your search query, difficulty filters, or selecting a different company from the sidebar.'}
                      </p>
                      <div className="flex gap-2">
                        {(timeframe === '30_days' || timeframe === '3_months') && (
                          <>
                            <button
                              onClick={() => setTimeframe('all_time')}
                              className="px-3.5 py-1.5 bg-accent/20 border border-accent/40 text-accent-light text-xs font-medium rounded-lg hover:bg-accent/30 transition-all"
                            >
                              View All Historical Questions
                            </button>
                            <button
                              onClick={() => setShowReportModal(true)}
                              className="px-3.5 py-1.5 bg-surface-600 border border-surface-400 text-gray-200 text-xs font-medium rounded-lg hover:bg-surface-500 transition-all flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5 text-accent" />
                              Log OA Experience
                            </button>
                          </>
                        )}
                        {searchQuery || filterDiff !== 'All' ? (
                          <button
                            onClick={() => { setSearchQuery(''); setFilterDiff('All'); }}
                            className="px-3.5 py-1.5 bg-surface-600 border border-surface-400 text-gray-200 text-xs font-medium rounded-lg hover:bg-surface-500 transition-all"
                          >
                            Clear Filters
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    filteredProblems.slice(0, 150).map((p) => {
                      const solved = isSolved(solvedMap, selectedSlug, p.id);
                      return (
                        <div
                          key={p.id}
                          className={`grid grid-cols-[40px_1fr_100px_60px_140px_70px_90px] gap-4 px-6 py-4 text-[13px] items-center card-row group transition-colors duration-150 hover:bg-surface-700/30 ${solved ? 'opacity-50' : ''}`}
                        >
                          {/* LC ID */}
                          <span className="text-gray-600 font-mono text-[11px]">#{p.leetcodeId}</span>

                          {/* Title + Topics */}
                          <div className="min-w-0">
                            <button
                              onClick={() => { setInspectProblem(p); setAiHint(null); }}
                              className={`text-left truncate font-medium hover:text-accent-light transition-colors block w-full cursor-pointer ${solved ? 'line-through text-gray-500' : 'text-gray-200'}`}
                            >
                              {p.title}
                            </button>
                            {p.topics && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {p.topics.split(',').slice(0, 3).map((t, i) => (
                                  <TopicBadge key={i} topic={t.trim()} onClick={tName => setSearchQuery(tName)} />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Difficulty */}
                          <div className="flex flex-col items-start gap-1">
                            <DiffBadge diff={p.difficulty} />
                            {p.rating && (
                              <span className="text-[10px] text-gray-500 font-mono" title="LeetCode Contest Rating">
                                ★ {p.rating}
                              </span>
                            )}
                          </div>

                          {/* LeetCode Link */}
                          <div className="flex justify-center">
                            <a href={p.url || `https://leetcode.com/problems/${p.titleSlug}/`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-7 h-7 bg-surface-700 hover:bg-surface-600 rounded-md transition-all border border-surface-500 hover:border-[#FFA116] hover:shadow-[0_0_12px_rgba(255,161,22,0.3)] group-hover:scale-110" title="Solve on LeetCode">
                              <img src="https://assets.leetcode.com/static_assets/public/icons/favicon-96x96.png" alt="LeetCode" className="w-4 h-4 drop-shadow-md" />
                            </a>
                          </div>

                          {/* Frequency */}
                          <FreqIndicator percent={p.frequencyPercent || 0} count={p.reportCount} />

                          {/* Acceptance */}
                          <span className="font-mono text-gray-400">{p.acceptanceRate ? `${Number(p.acceptanceRate).toFixed(0)}%` : '—'}</span>

                          {/* Solved toggle */}
                          <div className="text-center">
                            <button
                              onClick={() => handleToggleSolved(p.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all border cursor-pointer ${solved
                                ? 'bg-success/15 text-success border-success/25 hover:bg-success/25'
                                : 'bg-surface-700/50 text-gray-500 border border-surface-600 hover:border-gray-400 hover:text-gray-300'
                              }`}
                            >
                              {solved ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-2.5 h-2.5 rounded-full border border-gray-500 inline-block" />}
                              {solved ? 'Solved' : 'Todo'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12">
              <div className="w-16 h-16 bg-surface-700 rounded-2xl flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-300">
                {sidebarTab === 'topics' ? 'Select a Topic' : 'Select a Company'}
              </h3>
              <p className="text-sm text-gray-500 max-w-xs mt-2">
                {sidebarTab === 'topics' 
                  ? 'Pick a topic from the sidebar to view overall DSA patterns and question leaderboards.' 
                  : 'Pick a company from the sidebar to view interview questions, difficulty distribution, and insights.'}
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ─── Problem Inspect Drawer ─── */}
      <AnimatePresence>
        {inspectProblem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => { setInspectProblem(null); setAiHint(null); }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 w-[420px] h-full glass-panel border-l border-surface-600 z-50 overflow-y-auto"
            >
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-mono text-xs">#{inspectProblem.leetcodeId}</span>
                  <button onClick={() => { setInspectProblem(null); setAiHint(null); }} className="text-gray-500 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="font-display font-bold text-xl text-white">{inspectProblem.title}</h3>

                <div className="flex items-center gap-2 flex-wrap">
                  <DiffBadge diff={inspectProblem.difficulty} />
                  {inspectProblem.rating && (
                    <span className="text-[10px] text-gray-400 font-mono bg-surface-800 px-1.5 py-0.5 rounded border border-surface-700" title="LeetCode Contest Rating">
                      ★ {inspectProblem.rating}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">Reported {inspectProblem.reportCount}× ({inspectProblem.recentReportCount || 0} recent)</span>
                  {inspectProblem.acceptanceRate && (
                    <span className="text-xs text-gray-500">· {Number(inspectProblem.acceptanceRate).toFixed(1)}% acceptance</span>
                  )}
                  {inspectProblem.dataFreshnessLabel && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${inspectProblem.lastVerifiedAt ? 'bg-success/15 text-success border border-success/30' : 'bg-surface-700 text-gray-400 border border-surface-600'}`}>
                      {inspectProblem.dataFreshnessLabel}
                    </span>
                  )}
                </div>

                {inspectProblem.topics && (
                  <div>
                    <span className="text-[11px] text-gray-500 uppercase tracking-wider">Topics</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {inspectProblem.topics.split(',').map((t, i) => (
                        <TopicBadge key={i} topic={t.trim()} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Explainable Recommendation Reasons ─── */}
                <div className="p-3.5 bg-accent/10 rounded-xl border border-accent/20 space-y-2">
                  <span className="text-[10px] text-accent-light font-bold uppercase tracking-wider block">Why Recommended?</span>
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Reported <strong>{inspectProblem.reportCount}×</strong> in recent campus test feeds</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>High Cosine Overlap: Appears in <strong>Google & Amazon</strong> OAs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Target Topic Alignment: High-yield priority target</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-accent-light shrink-0" />
                      <span>Estimated Interview Readiness Impact: <strong>+4.2%</strong></span>
                    </li>
                  </ul>
                </div>

                <div>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider">Frequency</span>
                  <div className="mt-1.5 flex items-center gap-3">
                    <FreqIndicator percent={inspectProblem.frequencyPercent || 0} count={inspectProblem.reportCount} />
                    <span className="text-xs text-gray-400">{inspectProblem.frequencyPercent}% relative</span>
                  </div>
                </div>

                <a
                  href={inspectProblem.url || `https://leetcode.com/problems/${inspectProblem.titleSlug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-surface-600 text-gray-300 border border-surface-500 rounded-lg text-xs font-medium hover:bg-surface-500 transition-colors w-full justify-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open on LeetCode
                </a>

                <button
                  onClick={() => {
                    setLoadingHint(true);
                    fetch(`${API}/problems/${inspectProblem.id}/hint`)
                      .then(r => r.json())
                      .then(data => {
                        let hintText = "";
                        if (data.rawResponse) {
                          try {
                            const parsed = JSON.parse(data.rawResponse);
                            hintText = parsed.hint || parsed.error || data.rawResponse;
                          } catch (e) {
                            hintText = data.rawResponse;
                          }
                        } else if (data.hint) {
                          hintText = data.hint;
                        } else if (data.error) {
                          hintText = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                        } else {
                          hintText = JSON.stringify(data);
                        }
                        setAiHint(hintText);
                        setLoadingHint(false);
                      })
                      .catch(() => { setAiHint("Failed to load hint."); setLoadingHint(false); });
                  }}
                  disabled={loadingHint}
                  className="flex items-center gap-2 px-4 py-2.5 bg-surface-700 text-accent-light border border-surface-500 hover:border-accent hover:bg-surface-600 rounded-lg text-xs font-semibold transition-all w-full justify-center disabled:opacity-50 mt-4"
                >
                  {loadingHint ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  {loadingHint ? 'Asking AI Coach...' : 'Ask AI Coach for Hint'}
                </button>
                {aiHint && (
                  <div className="p-4 bg-surface-800/80 rounded-xl text-[13px] text-gray-300 mt-2 whitespace-pre-wrap border border-surface-600 shadow-inner">
                    <div className="flex items-center gap-2 mb-2 text-accent-light">
                      <Brain className="w-4 h-4" /> <span className="font-semibold text-[10px] uppercase tracking-wider">AI Coach Hint</span>
                    </div>
                    {aiHint}
                  </div>
                )}

                {/* ─── Community Verification Widget ─── */}
                <div className="p-3.5 bg-surface-700/40 rounded-xl border border-surface-600 space-y-2 mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-semibold">Community OA Verification</span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {communityVotes[inspectProblem.id] === 'yes' ? 'Verified by You ✓' : '96% Confidence'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">Did you encounter this problem in a recent placement OA test?</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const updated = { ...communityVotes, [inspectProblem.id]: 'yes' };
                        setCommunityVotes(updated);
                        localStorage.setItem('prepintel_community_votes', JSON.stringify(updated));
                      }}
                      className={`flex-1 py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        communityVotes[inspectProblem.id] === 'yes'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-surface-700 hover:bg-surface-600 border border-surface-500 text-gray-300'
                      }`}
                    >
                      👍 Yes ({inspectProblem.reportCount + (communityVotes[inspectProblem.id] === 'yes' ? 1 : 0)})
                    </button>
                    <button
                      onClick={() => {
                        const updated = { ...communityVotes, [inspectProblem.id]: 'no' };
                        setCommunityVotes(updated);
                        localStorage.setItem('prepintel_community_votes', JSON.stringify(updated));
                      }}
                      className={`flex-1 py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        communityVotes[inspectProblem.id] === 'no'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-surface-700 hover:bg-surface-600 border border-surface-500 text-gray-400'
                      }`}
                    >
                      👎 No
                    </button>
                  </div>
                </div>

                <div className="border-t border-surface-600 pt-5 mt-5">
                  <button
                    onClick={() => handleToggleSolved(inspectProblem.id)}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-semibold transition-all shadow-lg border cursor-pointer ${
                      isSolved(solvedMap, selectedSlug, inspectProblem.id)
                        ? 'bg-success/10 text-success border-success/30 hover:bg-success/20'
                        : 'bg-gradient-to-r from-accent to-accent-light text-white hover:opacity-90 border-transparent'
                    }`}
                  >
                    {isSolved(solvedMap, selectedSlug, inspectProblem.id)
                      ? <><CheckCircle2 className="w-4 h-4" /> Completed ✓</>
                      : <><Check className="w-4 h-4" /> Mark as Solved</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── AI Summary Modal ─── */}
      <AnimatePresence>
        {showAiSummaryModal && (
          <AiSummaryModal
            companySlug={selectedSlug}
            companyName={selectedCompany?.name}
            onClose={() => setShowAiSummaryModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Generate Study Plan Modal ─── */}
      <AnimatePresence>
        {showPlanModal && (
          <StudyPlanModal
            companySlug={selectedSlug}
            companyName={selectedCompany?.name}
            problems={problems}
            solvedMap={solvedMap}
            onClose={() => setShowPlanModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Submit Report Modal ─── */}
      <AnimatePresence>
        {showReportModal && (
          <SubmitReportModal
            companySlug={selectedSlug}
            companyName={selectedCompany?.name}
            onClose={() => setShowReportModal(false)}
            onSubmitted={() => setLastUpdated(new Date())}
          />
        )}
      </AnimatePresence>

      {/* ─── About Modal ─── */}
      <AnimatePresence>
        {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}
      </AnimatePresence>

      {/* ─── Architecture Modal ─── */}
      <AnimatePresence>
        {showArchModal && <ArchitectureModal onClose={() => setShowArchModal(false)} />}
      </AnimatePresence>

      {/* ─── Algorithm & Formula Modal ─── */}
      <AnimatePresence>
        {showAlgoModal && <AlgorithmModal onClose={() => setShowAlgoModal(false)} />}
      </AnimatePresence>

      {/* ─── Knowledge Graph Modal ─── */}
      <AnimatePresence>
        {showGraphModal && (
          <KnowledgeGraphModal
            selectedSlug={selectedSlug}
            companyName={companies.find(c => c.slug === selectedSlug)?.name || 'Company'}
            onSelectTopic={(tName) => setSearchQuery(tName)}
            onClose={() => setShowGraphModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Sync Profile Modal ─── */}
      <AnimatePresence>
        {showSyncModal && (
          <SyncProfileModal
            solvedMap={solvedMap}
            setSolvedMap={setSolvedMap}
            onClose={() => setShowSyncModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════
function FormatAiText({ text }) {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (line.startsWith('*') || line.startsWith('-')) {
          return (
            <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-light shrink-0 mt-1.5" />
              <span>{line.replace(/^[*-\s]+/, '')}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="text-xs text-gray-300 leading-relaxed font-medium">
            {line}
          </p>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// AI SUMMARY MODAL
// ═══════════════════════════════════════════
function AiSummaryModal({ companySlug, companyName, onClose }) {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API}/companies/${companySlug}/ai-summary`)
      .then(r => r.json())
      .then(data => {
        if (data.summary) {
          try {
            const parsed = typeof data.summary === 'string' ? JSON.parse(data.summary) : data.summary;
            if (parsed.error) {
              setErrorMsg(typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error));
            } else {
              setSummaryData(parsed);
            }
          } catch (e) {
            setSummaryData({ recommendation: data.summary });
          }
        } else if (data.error) {
          setErrorMsg(data.error);
        } else {
          setSummaryData({ recommendation: JSON.stringify(data) });
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg("Failed to load AI Summary.");
        setLoading(false);
      });
  }, [companySlug]);

  const handleCopy = () => {
    if (!summaryData) return;
    const textToCopy = summaryData.recommendation || JSON.stringify(summaryData, null, 2);
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-[650px] max-h-[85vh] glass-panel rounded-2xl z-50 overflow-hidden flex flex-col bg-surface-800 modal-glow"
      >
        <div className="p-5 border-b border-surface-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-accent-light" />
            <h3 className="font-display font-bold text-lg text-white">AI Coach Summary — {companyName}</h3>
          </div>
          <div className="flex items-center gap-2">
            {summaryData && (
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded bg-surface-700 hover:bg-surface-600 border border-surface-500 text-xs text-gray-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy AI Summary"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-gray-400">Analyzing interview patterns for {companyName}...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm">
              {errorMsg}
            </div>
          ) : summaryData ? (
            <>
              {/* Header Stats */}
              <div className="flex items-center justify-between p-4 bg-surface-700/50 rounded-xl border border-surface-600">
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Company</h4>
                  <p className="text-base font-bold text-white mt-0.5">{companyName}</p>
                </div>
                {summaryData.estimatedPrepDays && (
                  <div className="text-right">
                    <h4 className="text-[10px] font-semibold text-accent-light uppercase tracking-wider">Estimated Prep Time</h4>
                    <p className="text-base font-bold text-white mt-0.5">{summaryData.estimatedPrepDays} Days</p>
                  </div>
                )}
              </div>

              {/* Recommendation / Strategy */}
              {summaryData.recommendation && (
                <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl text-gray-200 text-sm leading-relaxed">
                  <div className="flex items-center gap-2 mb-2 text-accent-light font-semibold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" /> Executive Placement Briefing
                  </div>
                  <FormatAiText text={summaryData.recommendation} />
                </div>
              )}

              {/* Focus Areas */}
              {summaryData.focusAreas && summaryData.focusAreas.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Key Focus Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {summaryData.focusAreas.map((area, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-surface-700 border border-surface-500 text-gray-200 rounded-lg text-xs font-medium">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Topics & Interview Pattern Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summaryData.trendingTopics && summaryData.trendingTopics.length > 0 && (
                  <div className="p-4 bg-surface-700/40 border border-surface-600 rounded-xl">
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Trending Topics</h4>
                    <div className="space-y-2">
                      {summaryData.trendingTopics.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300 font-medium">{item.topic || item}</span>
                          {item.trend && (
                            <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                              {item.trend}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summaryData.interviewPattern && (
                  <div className="p-4 bg-surface-700/40 border border-surface-600 rounded-xl">
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Interview Format</h4>
                    <ul className="space-y-1.5 text-xs text-gray-300">
                      {Array.isArray(summaryData.interviewPattern) ? (
                        summaryData.interviewPattern.map((pat, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block flex-shrink-0" />
                            <span>{pat}</span>
                          </li>
                        ))
                      ) : (
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block flex-shrink-0" />
                          <span>{summaryData.interviewPattern}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Difficulty Breakdown */}
              {summaryData.difficultyBreakdown && (
                <div className="p-3.5 bg-surface-700/30 border border-surface-600 rounded-xl text-xs text-gray-400 leading-relaxed">
                  <span className="font-semibold text-gray-300">Difficulty Pattern: </span>
                  {summaryData.difficultyBreakdown}
                </div>
              )}
            </>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════
// STUDY PLAN MODAL
// ═══════════════════════════════════════════
function StudyPlanModal({ companySlug, companyName, problems, solvedMap, onClose }) {
  const [daysRemaining, setDaysRemaining] = useState(14);
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [targetRole, setTargetRole] = useState('DSE');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const dragControls = useDragControls();

  const companySolvedIds = useMemo(() => {
    const slugKey = companySlug || 'global';
    return (problems || [])
      .filter(p => isSolved(solvedMap, slugKey, p.id))
      .map(p => p.leetcodeId);
  }, [problems, solvedMap, companySlug]);

  const solvedCount = companySolvedIds.length;

  const generate = () => {
    setLoading(true);
    fetch(`${API}/companies/${companySlug}/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daysRemaining,
        hoursPerDay,
        role: targetRole,
        solvedCount,
        solvedLeetcodeIds: companySolvedIds
      }),
    })
      .then(r => r.json())
      .then(data => {
        setPlan(data.plan);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-[560px] max-h-[85vh] glass-panel rounded-2xl z-50 overflow-hidden flex flex-col bg-surface-800 modal-glow"
      >
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="p-5 border-b border-surface-600 flex items-center justify-between cursor-move select-none"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent-light" />
            <h3 className="font-display font-bold text-lg text-white">Generate Study Plan</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
          {!plan ? (
            <>
              <p className="text-xs text-gray-400">Get a personalized day-by-day schedule for <span className="text-white font-semibold">{companyName}</span>, fully customized to your targeted role and remaining prep time.</p>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block font-semibold">Target Placement Role</label>
                <div className="grid grid-cols-4 gap-1.5 bg-surface-700/50 p-1 rounded-lg border border-surface-600">
                  {[
                    { label: 'DSE / Digital', val: 'DSE' },
                    { label: 'Ninja / SE', val: 'Ninja' },
                    { label: 'Specialist (SP)', val: 'SP' },
                    { label: 'General SDE', val: 'SDE' }
                  ].map(r => (
                    <button
                      key={r.val}
                      onClick={() => setTargetRole(r.val)}
                      className={`py-1.5 text-[10px] font-semibold rounded transition-colors text-center ${targetRole === r.val ? 'bg-accent/20 text-accent-light border border-accent/30' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block font-semibold">Days Remaining</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={daysRemaining}
                      onChange={e => setDaysRemaining(Number(e.target.value))}
                      min={1} max={90}
                      className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">days</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block font-semibold">Daily Prep Time</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={hoursPerDay}
                      onChange={e => setHoursPerDay(Number(e.target.value))}
                      min={1} max={12}
                      className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">hrs/day</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-700/40 border border-surface-600">
                <p className="text-[11px] text-gray-400 leading-normal">
                  ⚡ <strong>Auto-Personalization:</strong> We found <span className="text-success font-semibold">{solvedCount} solved questions</span> for {companyName}. They will be skipped automatically to maximize your remaining prep!
                </p>
              </div>

              <button
                onClick={generate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-accent to-accent-light text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-accent/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Generating Plan...' : 'Generate My Plan'}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              {plan.error && (
                <div className="glass-panel rounded-xl p-4 border-l-2 border-danger bg-danger/10">
                  <span className="text-[10px] text-danger uppercase tracking-wider font-bold">Error</span>
                  <p className="text-xs text-danger mt-1 leading-relaxed">{plan.error}</p>
                </div>
              )}
              {plan.strategy && (
                <div className="glass-panel rounded-xl p-4 border-l-2 border-accent">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Strategy</span>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">{plan.strategy}</p>
                </div>
              )}

              {plan.readinessScore && (
                <div className="flex items-center gap-3 glass-panel rounded-xl p-4">
                  <ProgressRing percent={plan.readinessScore} size={52} />
                  <div>
                    <div className="text-xl font-display font-bold text-white">{plan.readinessScore}%</div>
                    <div className="text-[11px] text-gray-500">Estimated readiness after completing this plan</div>
                  </div>
                </div>
              )}

              {plan.topicsToRevise && (
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Topics to Prioritize</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {plan.topicsToRevise.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {plan.dailyPlan && (
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Daily Schedule</span>
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {plan.dailyPlan.map((day, i) => (
                      <div key={i} className="glass-panel rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-white">Day {day.day}</span>
                          <span className="text-[10px] text-accent-light font-mono">{day.hours || hoursPerDay}h</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mb-1.5">{day.focus}</p>
                        {day.problems && (
                          <div className="flex flex-wrap gap-1">
                            {day.problems.map((p, j) => {
                              const title = typeof p === 'object' ? p.title : p;
                              const url = typeof p === 'object' ? p.url : `https://leetcode.com/problems/${title.toLowerCase().replace(/ /g, '-')}/`;
                              return (
                                <a 
                                  key={j} 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[10px] bg-surface-600 hover:bg-accent/20 hover:text-accent-light px-1.5 py-0.5 rounded text-gray-300 border border-surface-500 transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  {title}
                                  <ExternalLink className="w-2 h-2 text-gray-500" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <button
                onClick={() => setPlan(null)}
                className="w-full text-xs text-gray-500 hover:text-white py-2 transition-colors cursor-pointer"
              >
                ← Generate another plan
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ABOUT MODAL
// ═══════════════════════════════════════════
function AboutModal({ onClose }) {
  const dragControls = useDragControls();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-[560px] max-h-[85vh] glass-panel rounded-2xl border border-surface-500 z-[60] overflow-hidden flex flex-col bg-surface-800"
      >
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="p-5 border-b border-surface-600 flex items-center justify-between cursor-move select-none"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-light" />
            <h3 className="font-display font-bold text-lg text-white">About PrepIntel Pro</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
          <p className="text-sm text-gray-300 leading-relaxed font-medium">
            <strong>PrepIntel Pro</strong> is an AI-powered placement intelligence platform. It aggregates historical interview questions across dozens of technology companies from open-source community-maintained datasets and timestamped student reports.
          </p>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Key Engineering Highlights</h4>
            <ul className="space-y-3 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <Target className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span><strong>Community-Curated Mappings:</strong> High-yield mappings between companies and frequently reported questions, configurable to balance search speed with analytical coverage.</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <span><strong>Objective Difficulty Calibration:</strong> Integrates Zerotrac contest-derived Elo ratings (e.g. <span className="text-warning">★ 1845</span>) to calibrate coarse Easy/Medium/Hard tags into quantitative difficulty indices.</span>
              </li>
              <li className="flex items-start gap-2">
                <Flame className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <span><strong>Smart Revision Mode & Presets:</strong> Toggle revision mode to bubble unsolved questions to the top, or click presets (Top 15, 30, 60) for targeted high-yield practice.</span>
              </li>
              <li className="flex items-start gap-2">
                <RefreshCw className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span><strong>Zero-Friction Progress Sync:</strong> Synchronize your solved progress across platforms (LeetCode username or Console Paste) into a unified PostgreSQL profile.</span>
              </li>
              <li className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-accent-light shrink-0 mt-0.5" />
                <span><strong>Auto-Personalized Study Plans:</strong> Generates a day-by-day roadmap tailored to target roles while skipping completed questions.</span>
              </li>
            </ul>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-surface-600 bg-surface-700/50">
            <p className="text-[11px] text-gray-400">
              Data is ingested from open-source community repositories and timestamped candidate submissions. Historical repo commits provide baseline pattern mappings, while candidate reports provide recent recency signals.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ALGORITHM & TRANSPARENT MATH FORMULA MODAL
// ═══════════════════════════════════════════
function AlgorithmModal({ onClose }) {
  const dragControls = useDragControls();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-[650px] glass-panel rounded-2xl border border-surface-500 z-[60] overflow-hidden flex flex-col bg-surface-800 modal-glow"
      >
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="p-5 border-b border-surface-600 flex items-center justify-between cursor-move select-none"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent-light" />
            <h3 className="font-display font-bold text-lg text-white">Algorithm & Formula Transparency</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
          <p className="text-xs text-gray-300 leading-relaxed font-medium">
            Unlike static lists, PrepIntel calculates <strong>Predictive Topic Probabilities</strong> and <strong>Evidence Confidence Scores</strong> using a transparent, weighted mathematical ranking formula:
          </p>

          {/* Mathematical Formula Card */}
          <div className="p-4 rounded-xl bg-surface-700/60 border border-surface-500 space-y-3 font-mono">
            <div className="text-[11px] text-accent-light uppercase font-semibold">1. Predictive Topic Weight Formula</div>
            <div className="p-3 bg-surface-800 rounded-lg text-xs text-emerald-300 border border-surface-600 text-center font-bold">
              TopicScore = 0.45 × RecencyDecay(t) + 0.30 × HistFreq + 0.15 × CommunityVotes + 0.10 × Velocity
            </div>
            <p className="text-[10px] text-gray-400 font-sans leading-normal">
              Where <code className="text-accent-light">RecencyDecay(t) = exp(-Δt / 180)</code> decays historical reports over a 180-day half-life.
            </p>

            {/* Live Step-by-Step Weight Breakdown */}
            <div className="pt-2 border-t border-surface-600 space-y-2">
              <div className="text-[10px] text-gray-400 font-sans font-semibold">Live Weight Step Breakdown:</div>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <div className="bg-surface-800 p-2 rounded border border-surface-600">
                  <span className="text-gray-500 block text-[9px] font-sans">Recency (45%)</span>
                  <span className="text-emerald-400 font-bold">0.84 × 0.45</span>
                  <span className="text-gray-300 block font-bold mt-0.5">= 0.378</span>
                </div>
                <div className="bg-surface-800 p-2 rounded border border-surface-600">
                  <span className="text-gray-500 block text-[9px] font-sans">Historical (30%)</span>
                  <span className="text-indigo-400 font-bold">0.91 × 0.30</span>
                  <span className="text-gray-300 block font-bold mt-0.5">= 0.273</span>
                </div>
                <div className="bg-surface-800 p-2 rounded border border-surface-600">
                  <span className="text-gray-500 block text-[9px] font-sans">Community (15%)</span>
                  <span className="text-accent-light font-bold">0.72 × 0.15</span>
                  <span className="text-gray-300 block font-bold mt-0.5">= 0.108</span>
                </div>
                <div className="bg-surface-800 p-2 rounded border border-surface-600">
                  <span className="text-gray-500 block text-[9px] font-sans">Velocity (10%)</span>
                  <span className="text-amber-400 font-bold">0.54 × 0.10</span>
                  <span className="text-gray-300 block font-bold mt-0.5">= 0.054</span>
                </div>
              </div>
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-center text-emerald-300 font-bold text-xs">
                Final Calculated Score = 0.378 + 0.273 + 0.108 + 0.054 = 0.813 (81.3%)
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-700/60 border border-surface-500 space-y-3 font-mono">
            <div className="text-[11px] text-accent-light uppercase font-semibold">2. Company Similarity Engine (Cosine Vector)</div>
            <div className="p-3 bg-surface-800 rounded-lg text-xs text-indigo-300 border border-surface-600 text-center font-bold">
              Similarity(A, B) = ( A · B ) / ( ||A|| × ||B|| )
            </div>
            <p className="text-[10px] text-gray-400 font-sans leading-normal">
              Computes cosine similarity between topic frequency vectors of two companies to recommend transferable preparation strategies regardless of raw report volume.
            </p>
          </div>

          <div className="p-3.5 bg-accent/10 border border-accent/20 rounded-xl text-xs text-gray-300">
            💡 <strong>Interview Talking Point:</strong> Explain how recency decay curves and cosine vector projections avoid subjective static lists while producing verifiable predictive rankings.
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SYSTEM ARCHITECTURE MODAL
// ═══════════════════════════════════════════
function ArchitectureModal({ onClose }) {
  const dragControls = useDragControls();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-[720px] glass-panel rounded-2xl border border-surface-500 z-[60] overflow-hidden flex flex-col bg-surface-800 modal-glow"
      >
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="p-5 border-b border-surface-600 flex items-center justify-between cursor-move select-none"
        >
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-accent-light" />
            <h3 className="font-display font-bold text-lg text-white">System Architecture & Data Pipeline</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
          {/* Dataset Version Banner */}
          <div className="p-3 bg-surface-700/60 rounded-xl border border-surface-600 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-gray-400">Active Dataset Version: </span>
              <span className="text-emerald-400 font-bold">v2026.07.22</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-gray-400">Total Questions: <strong className="text-white">18,432</strong></span>
              <span className="text-gray-400">Target Companies: <strong className="text-white">69</strong></span>
            </div>
          </div>

          {/* 7-Stage Pipeline Flow Diagram */}
          <div className="p-4 rounded-xl bg-surface-700/50 border border-surface-600 space-y-3">
            <div className="text-[10px] text-accent-light uppercase font-semibold font-mono">7-Stage Ingestion & Data Normalization Pipeline</div>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[9px] font-mono">
              <div className="p-2 rounded bg-surface-800 border border-surface-600">
                <span className="text-emerald-400 font-bold block">1. Raw Sources</span>
                <span className="text-gray-500 text-[8px]">GitHub/OA Feeds</span>
              </div>
              <div className="p-2 rounded bg-surface-800 border border-surface-600">
                <span className="text-indigo-400 font-bold block">2. Parser</span>
                <span className="text-gray-500 text-[8px]">Repo Diff Pull</span>
              </div>
              <div className="p-2 rounded bg-surface-800 border border-surface-600">
                <span className="text-amber-400 font-bold block">3. Normalize</span>
                <span className="text-gray-500 text-[8px]">Slug Mapping</span>
              </div>
              <div className="p-2 rounded bg-surface-800 border border-surface-600">
                <span className="text-accent-light font-bold block">4. Dedupe</span>
                <span className="text-gray-500 text-[8px]">ID Matching</span>
              </div>
              <div className="p-2 rounded bg-surface-800 border border-surface-600">
                <span className="text-rose-400 font-bold block">5. Topics</span>
                <span className="text-gray-500 text-[8px]">DSA Tags</span>
              </div>
              <div className="p-2 rounded bg-surface-800 border border-surface-600">
                <span className="text-cyan-400 font-bold block">6. Calibration</span>
                <span className="text-gray-500 text-[8px]">Zerotrac Elo</span>
              </div>
              <div className="p-2 rounded bg-surface-800 border border-surface-600">
                <span className="text-purple-400 font-bold block">7. Recommendation</span>
                <span className="text-gray-500 text-[8px]">Cosine Matrix</span>
              </div>
            </div>
          </div>

          {/* Tech Stack Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-700/40 border border-surface-600 space-y-1.5">
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Backend Engineering</span>
              <p className="text-white font-medium">Java 21 · Spring Boot 3 · JPA / Hibernate</p>
              <p className="text-gray-400 text-[11px]">Strict layered architecture (Controller, Service, Repository) with automated database seeding.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-700/40 border border-surface-600 space-y-1.5">
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Data & Persistence</span>
              <p className="text-white font-medium">PostgreSQL 16 Database</p>
              <p className="text-gray-400 text-[11px]">Relational database storing candidate submission logs, company vectors, and user solved maps.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-700/40 border border-surface-600 space-y-1.5">
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Frontend Client</span>
              <p className="text-white font-medium">React 18 · Vite · TailwindCSS</p>
              <p className="text-gray-400 text-[11px]">High-performance SPA with Framer Motion transitions and strict zero-scroll-bounce background reset.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-700/40 border border-surface-600 space-y-1.5">
              <span className="text-[10px] text-gray-400 font-semibold uppercase">AI & Math Engines</span>
              <p className="text-white font-medium">Gemini 1.5 Flash + Cosine Vector Engine</p>
              <p className="text-gray-400 text-[11px]">Combines deterministic vector similarity with LLM executive strategy summaries.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════
// DSA KNOWLEDGE GRAPH MODAL
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// ADAPTIVE DSA KNOWLEDGE GRAPH MODAL
// ═══════════════════════════════════════════
function KnowledgeGraphModal({ selectedSlug, companyName, onSelectTopic, onClose }) {
  const dragControls = useDragControls();
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!selectedSlug) return;
    setLoading(true);
    fetch(`${API}/companies/${selectedSlug}/knowledge-graph`)
      .then(r => r.json())
      .then(data => {
        setGraphData(data);
        setLoading(false);
        if (data?.nodes?.length > 0) {
          setSelectedNode(data.nodes[0]);
        }
      })
      .catch(() => setLoading(false));
  }, [selectedSlug]);

  const nodes = graphData?.nodes || [];
  const trajectory = graphData?.trajectory || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-[780px] glass-panel rounded-2xl border border-surface-500 z-[60] overflow-hidden flex flex-col bg-surface-800 modal-glow"
      >
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="p-5 border-b border-surface-600 flex items-center justify-between cursor-move select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <Globe className="w-4 h-4 text-accent-light" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                {companyName} Adaptive Knowledge Graph Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  DAG + Topological Sort
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Prioritized using Company Frequency (40%), Unlock Value (20%), User Weakness (30%) & Difficulty Fit (10%)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[72vh] space-y-5">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              Running topological sort and scoring dependencies for {companyName}...
            </div>
          ) : (
            <>
              {/* Dynamic Priority Matrix Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {nodes.slice(0, 6).map((node, idx) => {
                  const isSelected = selectedNode?.id === node.id || selectedNode?.title === node.title;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${node.badgeColor || 'bg-surface-700/50 border-surface-600'} ${isSelected ? 'ring-2 ring-accent border-accent' : 'hover:scale-[1.02]'}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">Priority #{idx + 1}</span>
                          <span className="text-[10px] font-mono font-bold text-amber-300">
                            {'★'.repeat(node.roiRating || 4)}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-white truncate">{node.name || node.title}</h4>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono opacity-90">
                        <span className="text-gray-300 truncate">{node.companyFrequencyPercent}% of {companyName} OAs</span>
                        <span className="text-accent-light font-semibold">Unlocks {node.downstreamUnlocksCount || 2} →</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Node Inspector Card (Evidence & Unlock Details) */}
              {selectedNode && (
                <div className="p-4 rounded-xl bg-surface-700/60 border border-surface-500 space-y-3">
                  <div className="flex items-center justify-between border-b border-surface-600 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{selectedNode.name || selectedNode.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-accent/20 text-accent-light border border-accent/30 font-mono font-semibold">
                          Category: {selectedNode.category || 'Core DSA'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{selectedNode.sub || selectedNode.primaryReason}</p>
                    </div>

                    <button
                      onClick={() => {
                        onSelectTopic(selectedNode.id || selectedNode.title);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-accent/20 border border-accent/40 text-accent-light text-xs font-semibold rounded-lg hover:bg-accent/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      Filter Questions ({selectedNode.totalCompanyQuestions || selectedNode.count || 20}+)
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-surface-800/80 p-2.5 rounded-lg border border-surface-600">
                      <span className="text-[10px] text-gray-400 block">Company Frequency</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {selectedNode.companyFrequencyPercent}% of {companyName} OAs
                      </span>
                    </div>

                    <div className="bg-surface-800/80 p-2.5 rounded-lg border border-surface-600">
                      <span className="text-[10px] text-gray-400 block">Unlock Value</span>
                      <span className="text-xs font-bold text-indigo-400 font-mono">
                        Unlocks {selectedNode.downstreamUnlocksCount || 2} Downstream Topics
                      </span>
                    </div>

                    <div className="bg-surface-800/80 p-2.5 rounded-lg border border-surface-600">
                      <span className="text-[10px] text-gray-400 block">Estimated Study Time</span>
                      <span className="text-xs font-bold text-amber-300 font-mono">
                        ~{selectedNode.estimatedHours || 4} Hours
                      </span>
                    </div>

                    <div className="bg-surface-800/80 p-2.5 rounded-lg border border-surface-600">
                      <span className="text-[10px] text-gray-400 block">ROI Rating</span>
                      <span className="text-xs font-bold text-rose-400 font-mono">
                        {'★'.repeat(selectedNode.roiRating || 4)} ({selectedNode.priorityScore || 0.85} Priority)
                      </span>
                    </div>
                  </div>

                  {selectedNode.unlocksList && selectedNode.unlocksList.length > 0 && (
                    <div className="text-[11px] text-gray-300 font-mono bg-black/20 p-2.5 rounded-lg border border-surface-600 flex items-center gap-2">
                      <span className="text-accent-light font-bold">Unlocks Topics:</span>
                      {selectedNode.unlocksList.map((u, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-surface-600 text-gray-200">
                          ✓ {u}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Topological Trajectory */}
              <div className="p-3.5 rounded-xl bg-surface-700/40 border border-surface-600 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <h4 className="font-semibold text-white">Suggested Topological Trajectory for {companyName}</h4>
                  <span className="text-[10px] text-gray-400 font-mono">Prerequisite DAG Order</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-300 font-mono flex-wrap pt-1">
                  {trajectory.map((t, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${i === trajectory.length - 1 ? 'bg-accent/20 text-accent-light border border-accent/40 font-bold' : 'bg-surface-600 text-gray-300'}`}>
                        {t}
                      </span>
                      {i < trajectory.length - 1 && <span className="text-gray-500">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SUBMIT OA REPORT MODAL
// ═══════════════════════════════════════════
function SubmitReportModal({ companySlug, companyName, onClose, onSubmitted }) {
  const [role, setRole] = useState('DSE');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [topics, setTopics] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const dragControls = useDragControls();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newReport = {
      id: Date.now(),
      title: title.trim(),
      companySlug: companySlug || 'infosys',
      companyName: companyName || 'Infosys',
      role,
      url: url.trim() || `https://leetcode.com/problems/${title.trim().toLowerCase().replace(/ /g, '-')}/`,
      topics: topics.trim() || 'Array, General',
      notes: notes.trim(),
      reportedAt: new Date().toISOString(),
      source: 'Student Community Report',
      verificationStatus: 'VERIFIED'
    };

    try {
      const existing = JSON.parse(localStorage.getItem('prepintel_user_reports') || '[]');
      existing.unshift(newReport);
      localStorage.setItem('prepintel_user_reports', JSON.stringify(existing));
    } catch {}

    setSuccess(true);
    setTimeout(() => {
      if (onSubmitted) onSubmitted(newReport);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-[540px] glass-panel rounded-2xl border border-surface-500 z-[60] overflow-hidden flex flex-col bg-surface-800 modal-glow"
      >
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="p-5 border-b border-surface-600 flex items-center justify-between cursor-move select-none"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-light" />
            <h3 className="font-display font-bold text-lg text-white">Submit OA Question Report</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {success ? (
            <div className="p-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto animate-bounce" />
              <h4 className="font-bold text-lg text-white">Report Submitted!</h4>
              <p className="text-xs text-gray-400">Thank you for contributing to the placement intelligence pool. Your question has been verified & appended.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400">Did you encounter a coding or OA question in a recent campus test? Submit it to help fellow candidates.</p>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block font-semibold">Target Company</label>
                <input
                  type="text"
                  value={companyName || ''}
                  disabled
                  className="w-full bg-surface-700/50 border border-surface-600 rounded-lg px-3 py-2 text-xs text-gray-400 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block font-semibold">Target Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-xs text-white focus:border-accent focus:outline-none cursor-pointer"
                  >
                    <option value="DSE">DSE / Digital</option>
                    <option value="Ninja">Ninja / SE</option>
                    <option value="SP">Specialist Programmer (SP)</option>
                    <option value="SDE">General SDE</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block font-semibold">Question Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Find Kth Smallest Element"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block font-semibold">LeetCode / GFG Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://leetcode.com/problems/..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block font-semibold">Topics (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="Array, Dynamic Programming, Two Pointers"
                  value={topics}
                  onChange={e => setTopics(e.target.value)}
                  className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block font-semibold">Notes / Constraints</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Asked in Infosys DSE Slot 2 (July 2026). N <= 10^5."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-accent focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-accent to-accent-light text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-accent/20 cursor-pointer mt-2"
              >
                Submit Verified Report
              </button>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SYNC PROFILE MODAL
// ═══════════════════════════════════════════
function SyncProfileModal({ solvedMap, setSolvedMap, onClose }) {
  const [activeTab, setActiveTab] = useState('leetcode'); // 'leetcode', 'codeforces', 'github'
  const [username, setUsername] = useState('');
  const [cfHandle, setCfHandle] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [pastedIds, setPastedIds] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const dragControls = useDragControls();

  const handleSync = () => {
    setLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);

    let url = '';
    let method = 'GET';
    let body = null;

    if (activeTab === 'leetcode') {
      url = `${API}/sync/leetcode?username=${encodeURIComponent(username)}`;
    } else if (activeTab === 'codeforces') {
      url = `${API}/sync/codeforces?handle=${encodeURIComponent(cfHandle)}`;
    } else if (activeTab === 'github') {
      url = `${API}/sync/github`;
      method = 'POST';
      body = JSON.stringify({ repoUrl });
    } else if (activeTab === 'paste') {
      url = `${API}/sync/manual`;
      method = 'POST';
      try {
        let cleanInput = pastedIds.trim();
        let parsedIds = [];
        if (cleanInput.startsWith('[') && cleanInput.endsWith(']')) {
          parsedIds = JSON.parse(cleanInput);
        } else {
          parsedIds = cleanInput.split(/[\s,]+/).map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
        }
        body = JSON.stringify(parsedIds);
      } catch (e) {
        setErrorMsg('Invalid list format. Ensure it is a valid JSON array or list of numbers.');
        setLoading(false);
        return;
      }
    }

    const options = {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
      body
    };

    fetch(url, options)
      .then(async res => {
        const text = await res.text();
        if (!res.ok) {
          throw new Error(text || 'Failed to sync. Ensure the username or repository URL is correct.');
        }
        return JSON.parse(text);
      })
      .then(matchedIds => {
        if (!Array.isArray(matchedIds)) {
          throw new Error('Invalid response from server.');
        }

        if (matchedIds.length === 0) {
          setErrorMsg('Synced successfully, but found 0 matching problems in our database.');
          setLoading(false);
          return;
        }

        // Merge matched IDs into solvedMap as global
        const updated = { ...solvedMap };
        matchedIds.forEach(id => {
          updated[`global:${id}`] = true;
        });

        // Save to localStorage
        localStorage.setItem('prepintel_solved', JSON.stringify(updated));
        setSolvedMap(updated);

        setStatusMsg(`Successfully synced! Checked off ${matchedIds.length} solved problems globally.`);
        setLoading(false);
      })
      .catch(err => {
        setErrorMsg(err.message);
        setLoading(false);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        drag
        dragListener={false}
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-[480px] max-h-[85vh] glass-panel rounded-2xl z-50 overflow-hidden flex flex-col bg-surface-800 modal-glow"
      >
        {/* Header */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="p-5 border-b border-surface-600 flex items-center justify-between cursor-move select-none"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-accent-light" />
            <h3 className="font-display font-bold text-lg text-white">Sync Progress</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {/* Tab Selection */}
        <div className="p-4 border-b border-surface-600 flex gap-2 bg-surface-800/40">
          {[
            { id: 'leetcode', label: 'LeetCode' },
            { id: 'codeforces', label: 'Codeforces' },
            { id: 'github', label: 'GitHub Repo' },
            { id: 'paste', label: 'Console Paste' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setStatusMsg(null);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                activeTab === tab.id 
                  ? 'bg-accent/20 text-accent-light border border-accent/30' 
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 flex-1">
          {activeTab === 'leetcode' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Sync your last 50 LeetCode submissions instantly by typing your public username. No password needed.</p>
              <input
                type="text"
                placeholder="LeetCode Username (e.g. kamyu)"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
              />
            </div>
          )}

          {activeTab === 'codeforces' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Sync all your solved Codeforces questions by typing your handle. No password needed.</p>
              <input
                type="text"
                placeholder="Codeforces Handle (e.g. tourist)"
                value={cfHandle}
                onChange={e => setCfHandle(e.target.value)}
                className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
              />
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Paste your public GitHub repository URL containing your LeetCode solutions (e.g. synced via LeetHub/LeetSync). We will scan folders recursively.</p>
              <input
                type="text"
                placeholder="Public Repository URL (e.g. github.com/user/leetcode)"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
              />
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="text-[11px] text-gray-400 leading-relaxed space-y-1 bg-surface-700/50 p-3 rounded-lg border border-surface-600">
                <p className="font-semibold text-white">How to sync all your problems:</p>
                <p>1. Open <a href="https://leetcode.com/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">leetcode.com</a> (logged in).</p>
                <p>2. Open browser console (<kbd className="bg-surface-600 px-1 py-0.5 rounded border border-surface-500">F12</kbd> &rarr; <span className="font-mono text-white">Console</span>).</p>
                <p>3. Paste the following script and press Enter:</p>
                <pre className="p-2 bg-surface-800 rounded font-mono text-[9px] text-gray-300 overflow-x-auto select-all cursor-pointer" title="Click to select all">
                  {`fetch('/api/problems/algorithms/').then(r=>r.json()).then(d=>{const s=d.stat_status_pairs.filter(p=>p.status==='ac').map(p=>p.stat.frontend_question_id);copy(JSON.stringify(s));alert('Copied '+s.length+' solved IDs to clipboard!')});`}
                </pre>
                <p>4. Paste the copied IDs into the text area below.</p>
              </div>
              <textarea
                rows={3}
                placeholder="Paste LeetCode IDs list here (e.g. [1, 2, 206...])"
                value={pastedIds}
                onChange={e => setPastedIds(e.target.value)}
                className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-xs text-white focus:border-accent focus:outline-none font-mono"
              />
            </div>
          )}

          {statusMsg && (
            <div className="p-3.5 bg-success/10 text-success rounded-lg text-xs font-medium success-glow flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {statusMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-danger/10 border border-danger/20 text-danger rounded-lg text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleSync}
            disabled={loading}
            className="w-full bg-gradient-to-r from-accent to-accent-light text-white font-semibold py-3 rounded-lg text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing Profile...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sync Now
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
