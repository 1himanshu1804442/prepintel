import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Search, ChevronRight, ExternalLink, Check, X, Sparkles,
  Calendar, BarChart3, Clock, Filter, ArrowUpDown, TrendingUp,
  Zap, Target, BookOpen, Flame, ChevronDown, Loader2, CheckCircle2,
  Database, MessageSquare, Globe, RefreshCw
} from 'lucide-react';

const API = 'http://localhost:8080/api';

// Company emoji/color mapping
const COMPANY_ICONS = {
  google: '🟨', microsoft: '🟦', amazon: '🟧', meta: '🔵', apple: '⬜',
  netflix: '🟥', atlassian: '🔷', autodesk: '🟩', adobe: '🔴', uber: '⬛',
  bloomberg: '🟪', flipkart: '🛒', paytm: '💳', meesho: '🩷', cred: '⚪',
  razorpay: '💙', infosys: '🔹', tcs: '🔸', wipro: '🌿', cognizant: '🔶'
};

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
function TopicBadge({ topic }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-600 text-gray-400 border border-surface-500">
      {topic}
    </span>
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
function ProgressRing({ percent, size = 36 }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#6C5CE7" strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700" />
    </svg>
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

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const [companies, setCompanies] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [problems, setProblems] = useState([]);
  const [companyStats, setCompanyStats] = useState(null);
  const [latestReports, setLatestReports] = useState([]);
  const [solvedMap, setSolvedMap] = useState(getSolved());
  const [searchQuery, setSearchQuery] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [sortBy, setSortBy] = useState('revision');
  const [filterDiff, setFilterDiff] = useState('All');
  const [timeframe, setTimeframe] = useState('all_time');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('companies');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [topicSearch, setTopicSearch] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [inspectProblem, setInspectProblem] = useState(null);


  const [loadingProblems, setLoadingProblems] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showAboutModal, setShowAboutModal] = useState(false);


  // Fetch companies on mount
  useEffect(() => {
    fetch(`${API}/companies`).then(r => r.json()).then(setCompanies).catch(() => {});
    fetch(`${API}/reports/latest`).then(r => r.json()).then(data => {
      setLatestReports(data);
      setLastUpdated(new Date());
    }).catch(() => {});
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
        setProblems(probs);
        setCompanyStats(stats);
        setLoadingProblems(false);
      }).catch(() => setLoadingProblems(false));


    } else {
      // Global or Topics mode -> fetch global problems & global stats
      Promise.all([
        fetch(`${API}/problems`).then(r => r.json()),
        fetch(`${API}/stats/global`).then(r => r.json()),
      ]).then(([probs, stats]) => {
        setProblems(probs);
        setGlobalStats(stats);
        setCompanyStats({
          difficulty: {
            Easy: stats.easyCount,
            Medium: stats.mediumCount,
            Hard: stats.hardCount
          },
          topTopics: stats.topTopics
        });
        setLoadingProblems(false);
      }).catch(() => setLoadingProblems(false));
    }
  }, [selectedSlug, timeframe, sidebarTab]);

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

  const selectedCompany = companies.find(c => c.slug === selectedSlug);

  // Filter + Sort problems
  const filteredProblems = useMemo(() => {
    let list = [...problems];
    if (filterDiff !== 'All') list = list.filter(p => p.difficulty === filterDiff);
    if (sidebarTab === 'topics' && selectedTopic) {
      list = list.filter(p => p.topics && p.topics.split(',').map(x => x.trim()).includes(selectedTopic));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) ||
        (p.topics && p.topics.toLowerCase().includes(q)));
    }
    if (sortBy === 'revision') {
      list.sort((a, b) => {
        const aSolved = isSolved(solvedMap, selectedSlug || 'global', a.id);
        const bSolved = isSolved(solvedMap, selectedSlug || 'global', b.id);
        if (aSolved !== bSolved) return aSolved ? 1 : -1; // Unsolved first
        return b.reportCount - a.reportCount; // High frequency first
      });
    }
    else if (sortBy === 'frequency') list.sort((a, b) => b.reportCount - a.reportCount);
    else if (sortBy === 'difficulty') {
      const order = { Easy: 0, Medium: 1, Hard: 2 };
      list.sort((a, b) => order[a.difficulty] - order[b.difficulty]);
    }
    else if (sortBy === 'acceptance') list.sort((a, b) => (b.acceptanceRate || 0) - (a.acceptanceRate || 0));
    return list;
  }, [problems, filterDiff, searchQuery, sortBy]);

  // High-confidence problems = top 250 or all if fewer
  const highConfidenceCount = Math.min(problems.length, 250);

  // Solved stats for this company (against high-confidence set)
  const solvedCount = useMemo(() => {
    const slugKey = selectedSlug || 'global';
    return problems.slice(0, highConfidenceCount).filter(p => isSolved(solvedMap, slugKey, p.id)).length;
  }, [problems, solvedMap, selectedSlug, highConfidenceCount]);

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

  // Total reports for this company
  const totalReports = useMemo(() => problems.reduce((s, p) => s + (p.reportCount || 0), 0), [problems]);
  const overallConfidence = useMemo(() => Math.min(98, Math.max(35, Math.round((totalReports / 500) * 100))), [totalReports]);

  // Handle solve toggle
  const handleToggleSolved = useCallback((problemId) => {
    const slugKey = selectedSlug || 'global';
    const updated = toggleSolved(slugKey, problemId);
    setSolvedMap({ ...updated });
  }, [selectedSlug]);

  // Filtered companies for sidebar
  const filteredCompanies = useMemo(() => {
    if (!companySearch) return companies;
    const q = companySearch.toLowerCase();
    return companies.filter(c => c.name.toLowerCase().includes(q));
  }, [companies, companySearch]);

  // "Updated X ago" for live indicator
  const updatedAgo = timeAgo(lastUpdated.toISOString());

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Top Bar ─── */}
      <header className="glass-panel border-b border-surface-600 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <h1 className="font-display font-bold text-xl tracking-tight">PrepIntel</h1>
          <span className="text-[11px] text-gray-500 font-mono bg-surface-700 px-2.5 py-1 rounded-lg">
            {companies.length} companies
          </span>
        </div>
        <div className="flex items-center gap-3">

          <button 
            onClick={() => setShowSyncModal(true)} 
            className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Progress
          </button>
          <button onClick={() => setShowAboutModal(true)} className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors">
            <BookOpen className="w-3.5 h-3.5" />
            About
          </button>
          <div className="flex items-center gap-2">
            <div className="pulse-dot w-2 h-2 rounded-full bg-success" />
            <span className="text-[10px] text-gray-500">Updated {updatedAgo}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar: Companies, Global, Topics ─── */}
        <aside className="w-60 flex-shrink-0 glass-panel border-r border-surface-600 flex flex-col overflow-hidden">
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

          <div className="p-3 border-b border-surface-600">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder={sidebarTab === 'companies' ? "Search companies..." : sidebarTab === 'topics' ? "Search topics..." : "Global leaderboard"}
                disabled={sidebarTab === 'global'}
                value={sidebarTab === 'companies' ? companySearch : sidebarTab === 'topics' ? topicSearch : ''}
                onChange={e => sidebarTab === 'companies' ? setCompanySearch(e.target.value) : setTopicSearch(e.target.value)}
                className="w-full bg-surface-700 border border-surface-500 rounded-lg pl-9 pr-3 py-2.5 text-xs text-gray-200 placeholder-gray-500 focus:border-accent focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
            {sidebarTab === 'companies' ? (
              filteredCompanies.map(c => {
                const active = c.slug === selectedSlug;
                return (
                  <button
                    key={c.slug}
                    onClick={() => { setSelectedSlug(c.slug); setSearchQuery(''); setFilterDiff('All'); }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between rounded-md transition-colors group text-sm ${
                      active 
                        ? 'bg-accent/10 text-white font-medium' 
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
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between rounded-md transition-colors group text-sm ${
                      active 
                        ? 'bg-accent/10 text-white font-medium' 
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
                className="w-full text-left px-3 py-1.5 flex items-center justify-between rounded-md bg-accent/10 text-white font-medium text-sm"
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
            <div className="p-6 space-y-6">
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
                    <button className="text-xs text-accent-light hover:underline font-medium transition-colors cursor-pointer">{totalReports.toLocaleString()} community reports →</button>
                  </div>
                  {sidebarTab === 'companies' && selectedCompany?.oaPattern && selectedCompany.oaPattern !== 'Unknown' && (
                    <div className="mt-2 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-accent-light" />
                      <span className="text-xs text-gray-400">{selectedCompany.oaPattern}</span>
                    </div>
                  )}
                </div>
                {sidebarTab === 'companies' && (
                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent to-accent-light text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-accent/20"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Generate Study Plan
                  </button>
                )}
              </div>

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
                    <p className="text-xs text-accent-light font-medium mt-2 cursor-pointer hover:underline">
                      Help the community. Submit your interview experience →
                    </p>
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

                <div className="flex items-center gap-1 bg-surface-700 rounded-lg p-0.5 border border-surface-500">
                  {[
                    { label: 'Any', val: 'all_time' },
                    { label: '30d', val: '30_days' },
                    { label: '3m', val: '3_months' },
                    { label: '6m', val: '6_months' },
                    { label: '1y', val: '1_year' }
                  ].map(t => (
                    <button
                      key={t.val}
                      onClick={() => setTimeframe(t.val)}
                      className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${timeframe === t.val ? 'bg-accent/20 text-accent-light' : 'text-gray-500 hover:text-gray-300'}`}
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
                  <ArrowUpDown className="w-3 h-3 text-gray-500" />
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="bg-surface-700 border border-surface-500 rounded-lg px-2 py-1.5 text-[11px] text-gray-300 focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="revision">Revision Mode</option>
                    <option value="frequency">Most Asked</option>
                    <option value="difficulty">Difficulty</option>
                    <option value="acceptance">Acceptance</option>
                  </select>
                </div>

                <span className="text-[10px] text-gray-600 ml-auto">
                  {filteredProblems.length} of {problems.length} shown
                </span>
              </div>

              {/* ─── Problem Table ─── */}
              <div className="glass-panel rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[32px_1fr_70px_48px_100px_52px_72px] gap-2 px-5 py-3 border-b border-surface-600 text-[10px] text-gray-500 uppercase tracking-wider font-medium">
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
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Loading questions...</p>
                    </div>
                  ) : filteredProblems.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-xs">No questions match your filters.</div>
                  ) : (
                    filteredProblems.map((p, idx) => {
                      const solved = isSolved(solvedMap, selectedSlug, p.id);
                      return (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(idx * 0.008, 0.3) }}
                          className={`grid grid-cols-[32px_1fr_70px_48px_100px_52px_72px] gap-2 px-5 py-3.5 border-b border-surface-700/50 text-xs items-center hover:bg-surface-700/30 transition-colors group ${solved ? 'opacity-50' : ''}`}
                        >
                          {/* LC ID */}
                          <span className="text-gray-600 font-mono text-[11px]">#{p.leetcodeId}</span>

                          {/* Title + Topics */}
                          <div className="min-w-0">
                            <button
                              onClick={() => setInspectProblem(p)}
                              className={`text-left truncate font-medium hover:text-accent-light transition-colors block w-full ${solved ? 'line-through text-gray-500' : 'text-gray-200'}`}
                            >
                              {p.title}
                            </button>
                            {p.topics && (
                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                {p.topics.split(',').slice(0, 3).map((t, i) => (
                                  <TopicBadge key={i} topic={t.trim()} />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Difficulty */}
                          <DiffBadge diff={p.difficulty} />

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
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${solved
                                ? 'bg-success/15 text-success border border-success/20'
                                : 'bg-surface-600 text-gray-500 border border-surface-500 hover:border-gray-400'
                              }`}
                            >
                              {solved ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-gray-500 inline-block" />}
                              {solved ? 'Solved' : 'Todo'}
                            </button>
                          </div>
                        </motion.div>
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
              onClick={() => setInspectProblem(null)}
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
                  <button onClick={() => setInspectProblem(null)} className="text-gray-500 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="font-display font-bold text-xl text-white">{inspectProblem.title}</h3>

                <div className="flex items-center gap-2 flex-wrap">
                  <DiffBadge diff={inspectProblem.difficulty} />
                  <span className="text-xs text-gray-500">Reported {inspectProblem.reportCount}×</span>
                  {inspectProblem.acceptanceRate && (
                    <span className="text-xs text-gray-500">· {Number(inspectProblem.acceptanceRate).toFixed(1)}% acceptance</span>
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

                <div className="border-t border-surface-600 pt-5">
                  <button
                    onClick={() => handleToggleSolved(inspectProblem.id)}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-medium transition-all shadow-lg ${
                      isSolved(solvedMap, selectedSlug, inspectProblem.id)
                        ? 'bg-success text-black border border-success'
                        : 'bg-gradient-to-r from-accent to-accent-light text-white hover:opacity-90'
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

      {/* ─── Generate Study Plan Modal ─── */}
      <AnimatePresence>
        {showPlanModal && (
          <StudyPlanModal
            companySlug={selectedSlug}
            companyName={selectedCompany?.name}
            onClose={() => setShowPlanModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── About Modal ─── */}
      <AnimatePresence>
        {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}
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
// STUDY PLAN MODAL
// ═══════════════════════════════════════════
function StudyPlanModal({ companySlug, companyName, onClose }) {
  const [daysRemaining, setDaysRemaining] = useState(14);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [solvedCount, setSolvedCount] = useState(0);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const dragControls = useDragControls();

  const generate = () => {
    setLoading(true);
    fetch(`${API}/companies/${companySlug}/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daysRemaining, solvedCount }),
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
        className="relative w-[560px] max-h-[85vh] glass-panel rounded-2xl border border-surface-500 z-50 overflow-hidden flex flex-col bg-surface-800"
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
              <p className="text-xs text-gray-400">Get a personalized day-by-day schedule for <span className="text-white font-semibold">{companyName}</span>, fully customized to focus areas.</p>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Interview Date</label>
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
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Hours / Day</label>
                  <input
                    type="number"
                    value={hoursPerDay}
                    onChange={e => setHoursPerDay(Number(e.target.value))}
                    min={1} max={12}
                    className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Already Solved</label>
                  <input
                    type="number"
                    value={solvedCount}
                    onChange={e => setSolvedCount(Number(e.target.value))}
                    min={0}
                    className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none"
                  />
                </div>
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
          <p className="text-sm text-gray-300 leading-relaxed">
            <strong>PrepIntel Pro</strong> is an AI-powered interview intelligence dashboard. It aggregates thousands of community-reported LeetCode questions across top global tech giants and Indian product companies.
          </p>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Core Features</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <Target className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span><strong>Curated Datasets:</strong> Questions are intelligently capped to the top 400 most frequently asked and recent questions per company to maximize your ROI.</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span><strong>Gemini AI Integration:</strong> Instantly get company-specific summaries, difficulty breakdowns, and fully personalized, day-by-day study plans.</span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span><strong>Advanced Analytics:</strong> Track your progress against a high-confidence set (top 250 problems), visualize difficulty distributions, and analyze top topic trends.</span>
              </li>
              <li className="flex items-start gap-2">
                <Flame className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <span><strong>Live Reports Feed:</strong> Stay updated with the latest interview experiences pulled directly from community discussions and datasets.</span>
              </li>
            </ul>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-surface-600 bg-surface-700/50">
            <p className="text-[11px] text-gray-400">
              Data is sourced from popular open-source repositories and dynamically merged. Companies marked with a <span className="text-warning bg-warning/10 px-1 rounded border border-warning/20">⚠ Limited</span> badge have sparse public data available.
            </p>
          </div>
        </div>
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
        className="relative w-[480px] max-h-[85vh] glass-panel rounded-2xl border border-surface-500 z-50 overflow-hidden flex flex-col bg-surface-800"
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
            { id: 'github', label: 'GitHub Repo' }
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

          {statusMsg && (
            <div className="p-3.5 bg-success/10 border border-success/20 text-success rounded-lg text-xs font-medium">
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
