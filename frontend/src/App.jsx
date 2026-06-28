import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronRight, ExternalLink, Check, X, Sparkles,
  Calendar, BarChart3, Clock, Filter, ArrowUpDown, TrendingUp,
  Zap, Target, BookOpen, Flame, ChevronDown, Loader2
} from 'lucide-react';

const API = 'http://localhost:8080/api';

// Company emoji/color mapping
const COMPANY_ICONS = {
  google: '🟨', microsoft: '🟦', amazon: '🟧', facebook: '🔵', apple: '⬜',
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
const isSolved = (solvedMap, companySlug, problemId) => !!solvedMap[`${companySlug}:${problemId}`];

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

// ─── Frequency bar ───
function FreqBar({ percent }) {
  return (
    <div className="w-16 h-1.5 bg-surface-600 rounded-full overflow-hidden">
      <div className="freq-bar-fill h-full rounded-full" style={{ width: `${percent}%` }} />
    </div>
  );
}

// ─── Progress ring (small) ───
function ProgressRing({ percent, size = 36 }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
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
  const [sortBy, setSortBy] = useState('frequency');
  const [filterDiff, setFilterDiff] = useState('All');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [inspectProblem, setInspectProblem] = useState(null);
  const [loadingProblems, setLoadingProblems] = useState(false);

  // Fetch companies on mount
  useEffect(() => {
    fetch(`${API}/companies`).then(r => r.json()).then(setCompanies).catch(() => {});
    fetch(`${API}/reports/latest`).then(r => r.json()).then(setLatestReports).catch(() => {});
  }, []);

  // Fetch problems when company changes
  useEffect(() => {
    if (!selectedSlug) return;
    setLoadingProblems(true);
    setAiSummary(null);
    Promise.all([
      fetch(`${API}/companies/${selectedSlug}/problems`).then(r => r.json()),
      fetch(`${API}/companies/${selectedSlug}/stats`).then(r => r.json()),
    ]).then(([probs, stats]) => {
      setProblems(probs);
      setCompanyStats(stats);
      setLoadingProblems(false);
    }).catch(() => setLoadingProblems(false));
  }, [selectedSlug]);

  // Auto-select first company
  useEffect(() => {
    if (companies.length > 0 && !selectedSlug) {
      setSelectedSlug(companies[0].slug);
    }
  }, [companies]);

  const selectedCompany = companies.find(c => c.slug === selectedSlug);

  // Filter + Sort problems
  const filteredProblems = useMemo(() => {
    let list = [...problems];
    if (filterDiff !== 'All') list = list.filter(p => p.difficulty === filterDiff);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) ||
        (p.topics && p.topics.toLowerCase().includes(q)));
    }
    if (sortBy === 'frequency') list.sort((a, b) => b.reportCount - a.reportCount);
    else if (sortBy === 'difficulty') {
      const order = { Easy: 0, Medium: 1, Hard: 2 };
      list.sort((a, b) => order[a.difficulty] - order[b.difficulty]);
    }
    else if (sortBy === 'acceptance') list.sort((a, b) => (b.acceptanceRate || 0) - (a.acceptanceRate || 0));
    return list;
  }, [problems, filterDiff, searchQuery, sortBy]);

  // Solved stats for this company
  const solvedCount = useMemo(() => {
    if (!selectedSlug) return 0;
    return problems.filter(p => isSolved(solvedMap, selectedSlug, p.id)).length;
  }, [problems, solvedMap, selectedSlug]);

  const solvedPercent = problems.length > 0 ? Math.round((solvedCount / problems.length) * 100) : 0;

  // Difficulty distribution
  const diffDist = useMemo(() => {
    if (!companyStats?.difficulty) return { Easy: 0, Medium: 0, Hard: 0 };
    return { Easy: companyStats.difficulty.Easy || 0, Medium: companyStats.difficulty.Medium || 0, Hard: companyStats.difficulty.Hard || 0 };
  }, [companyStats]);
  const totalDiffProblems = diffDist.Easy + diffDist.Medium + diffDist.Hard || 1;

  // Handle solve toggle
  const handleToggleSolved = useCallback((problemId) => {
    const updated = toggleSolved(selectedSlug, problemId);
    setSolvedMap({ ...updated });
  }, [selectedSlug]);

  // Fetch AI Summary
  const fetchAiSummary = () => {
    if (!selectedSlug || aiLoading) return;
    setAiLoading(true);
    fetch(`${API}/companies/${selectedSlug}/ai-summary`)
      .then(r => r.json())
      .then(data => {
        try { setAiSummary(JSON.parse(data.summary)); }
        catch { setAiSummary({ recommendation: data.summary }); }
        setAiLoading(false);
      })
      .catch(() => setAiLoading(false));
  };

  // Filtered companies for sidebar
  const filteredCompanies = useMemo(() => {
    if (!companySearch) return companies;
    const q = companySearch.toLowerCase();
    return companies.filter(c => c.name.toLowerCase().includes(q));
  }, [companies, companySearch]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Top Bar ─── */}
      <header className="glass-panel border-b border-surface-600 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎯</span>
          <h1 className="font-display font-bold text-lg tracking-tight">PrepIntel</h1>
          <span className="text-[11px] text-gray-500 font-mono bg-surface-700 px-2 py-0.5 rounded">
            {companies.length} companies · {problems.length} questions loaded
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="pulse-dot w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar: Company List ─── */}
        <aside className="w-56 flex-shrink-0 glass-panel border-r border-surface-600 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-surface-600">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search companies..."
                value={companySearch}
                onChange={e => setCompanySearch(e.target.value)}
                className="w-full bg-surface-700 border border-surface-500 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {filteredCompanies.map(c => {
              const active = c.slug === selectedSlug;
              return (
                <button
                  key={c.slug}
                  onClick={() => { setSelectedSlug(c.slug); setSearchQuery(''); setFilterDiff('All'); }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-all duration-150 hover:bg-surface-700 ${active ? 'bg-surface-700 border-l-2 border-accent text-white' : 'text-gray-400 border-l-2 border-transparent'}`}
                >
                  <span className="text-base flex-shrink-0">{COMPANY_ICONS[c.slug] || '🏢'}</span>
                  <span className="truncate font-medium text-[13px]">{c.name}</span>
                  <span className="ml-auto text-[10px] font-mono text-gray-600">{c.reportCount || 0}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ─── Main Content ─── */}
        <main className="flex-1 overflow-y-auto">
          {selectedCompany ? (
            <div className="p-5 space-y-4">
              {/* ─── Company Header ─── */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{COMPANY_ICONS[selectedSlug] || '🏢'}</span>
                    <h2 className="font-display font-bold text-2xl text-white">{selectedCompany.name}</h2>
                    <span className="text-xs text-gray-500 font-mono">{problems.length} questions</span>
                  </div>
                  {selectedCompany.oaPattern && selectedCompany.oaPattern !== 'Unknown' && (
                    <div className="mt-2 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-accent-light" />
                      <span className="text-xs text-gray-400">{selectedCompany.oaPattern}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchAiSummary}
                    disabled={aiLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-accent/20 text-accent-light border border-accent/30 rounded-lg text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-50"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    AI Summary
                  </button>
                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-success/20 text-success border border-success/30 rounded-lg text-xs font-medium hover:bg-success/30 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Generate Study Plan
                  </button>
                </div>
              </div>

              {/* ─── Stats Row: Progress + Difficulty + Topics ─── */}
              <div className="grid grid-cols-3 gap-4">
                {/* Progress */}
                <div className="glass-panel rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Your Progress</span>
                    <ProgressRing percent={solvedPercent} />
                  </div>
                  <div className="text-2xl font-display font-bold text-white">{solvedPercent}%</div>
                  <div className="text-xs text-gray-500 mt-1">{solvedCount} / {problems.length} solved</div>
                  <div className="mt-3 w-full h-1.5 bg-surface-600 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light"
                      initial={{ width: 0 }}
                      animate={{ width: `${solvedPercent}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Difficulty Distribution */}
                <div className="glass-panel rounded-xl p-4">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Difficulty Split</span>
                  <div className="mt-3 flex items-end gap-1 h-10">
                    <div className="flex-1 bg-success/30 rounded-sm transition-all" style={{ height: `${(diffDist.Easy / totalDiffProblems) * 100}%`, minHeight: '4px' }} />
                    <div className="flex-1 bg-warning/30 rounded-sm transition-all" style={{ height: `${(diffDist.Medium / totalDiffProblems) * 100}%`, minHeight: '4px' }} />
                    <div className="flex-1 bg-danger/30 rounded-sm transition-all" style={{ height: `${(diffDist.Hard / totalDiffProblems) * 100}%`, minHeight: '4px' }} />
                  </div>
                  <div className="mt-3 flex justify-between text-[11px]">
                    <span className="text-success">{diffDist.Easy} Easy</span>
                    <span className="text-warning">{diffDist.Medium} Med</span>
                    <span className="text-danger">{diffDist.Hard} Hard</span>
                  </div>
                </div>

                {/* Top Topics */}
                <div className="glass-panel rounded-xl p-4">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Top Topics</span>
                  <div className="mt-2 space-y-1.5">
                    {(companyStats?.topTopics || []).slice(0, 5).map((t, i) => {
                      const maxCount = companyStats?.topTopics?.[0]?.count || 1;
                      return (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <span className="w-20 truncate text-gray-400">{t.topic}</span>
                          <div className="flex-1 h-1 bg-surface-600 rounded-full overflow-hidden">
                            <div className="topic-bar h-full rounded-full" style={{ width: `${(t.count / maxCount) * 100}%` }} />
                          </div>
                          <span className="text-gray-600 w-5 text-right font-mono">{t.count}</span>
                        </div>
                      );
                    })}
                    {(!companyStats?.topTopics || companyStats.topTopics.length === 0) && (
                      <p className="text-[11px] text-gray-600 italic">No topic data available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── AI Summary Panel ─── */}
              <AnimatePresence>
                {aiSummary && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-panel rounded-xl p-5 border-l-2 border-accent overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent-light" />
                        <span className="text-sm font-display font-semibold text-white">AI Preparation Summary</span>
                      </div>
                      <button onClick={() => setAiSummary(null)} className="text-gray-500 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {aiSummary.focusAreas && (
                      <div className="mb-3">
                        <span className="text-[11px] text-gray-500 uppercase tracking-wider">Focus Areas</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {aiSummary.focusAreas.map((a, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent-light border border-accent/20">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {aiSummary.recommendation && (
                      <p className="text-xs text-gray-300 leading-relaxed">{aiSummary.recommendation}</p>
                    )}
                    {aiSummary.estimatedPrepDays && (
                      <div className="mt-2 text-xs text-gray-500">
                        Estimated prep time: <span className="text-accent-light font-semibold">{aiSummary.estimatedPrepDays} days</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Controls: Search + Filter + Sort ─── */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder={`Search ${selectedCompany.name} questions...`}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-700 border border-surface-500 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:border-accent focus:outline-none transition-colors"
                  />
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
                    <option value="frequency">Most Asked</option>
                    <option value="difficulty">Difficulty</option>
                    <option value="acceptance">Acceptance</option>
                  </select>
                </div>
              </div>

              {/* ─── Problem Table ─── */}
              <div className="glass-panel rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[32px_1fr_70px_52px_80px_60px_60px] gap-2 px-4 py-2 border-b border-surface-600 text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                  <span></span>
                  <span>Question</span>
                  <span>Difficulty</span>
                  <span>Reports</span>
                  <span>Frequency</span>
                  <span>Accept</span>
                  <span className="text-center">Solved</span>
                </div>

                {/* Table body */}
                <div className="max-h-[480px] overflow-y-auto">
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
                          transition={{ delay: idx * 0.01 }}
                          className={`grid grid-cols-[32px_1fr_70px_52px_80px_60px_60px] gap-2 px-4 py-2.5 border-b border-surface-700/50 text-xs items-center hover:bg-surface-700/30 transition-colors group ${solved ? 'opacity-60' : ''}`}
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

                          {/* Reports */}
                          <span className="font-mono text-gray-400">{p.reportCount}×</span>

                          {/* Frequency bar */}
                          <FreqBar percent={p.frequencyPercent || 0} />

                          {/* Acceptance */}
                          <span className="font-mono text-gray-400">{p.acceptanceRate ? `${Number(p.acceptanceRate).toFixed(0)}%` : '—'}</span>

                          {/* Solved checkbox */}
                          <div className="text-center">
                            <input
                              type="checkbox"
                              checked={solved}
                              onChange={() => handleToggleSolved(p.id)}
                              className="solved-check w-4 h-4 rounded border-surface-500 cursor-pointer"
                            />
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Select a company to begin
            </div>
          )}
        </main>

        {/* ─── Right Sidebar: Latest Reports ─── */}
        <aside className="w-64 flex-shrink-0 glass-panel border-l border-surface-600 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-surface-600 flex items-center gap-2">
            <Flame className="w-4 h-4 text-danger" />
            <span className="text-xs font-display font-semibold text-white">Latest Reports</span>
            <div className="pulse-dot w-1.5 h-1.5 rounded-full bg-danger ml-auto" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {latestReports.map((r, i) => (
              <div key={r.id || i} className="px-3 py-3 border-b border-surface-700/50 hover:bg-surface-700/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{COMPANY_ICONS[r.companySlug] || '🏢'}</span>
                  <span className="text-[11px] font-semibold text-white">{r.companyName}</span>
                  <span className="ml-auto text-[10px] text-gray-600 font-mono">{timeAgo(r.dateReported)}</span>
                </div>
                <p className="text-xs text-gray-300 truncate">{r.problemName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <DiffBadge diff={r.difficulty || 'Medium'} />
                  <span className="text-[10px] text-gray-500 bg-surface-600 px-1.5 py-0.5 rounded">{r.round || 'OA'}</span>
                </div>
              </div>
            ))}
            {latestReports.length === 0 && (
              <div className="p-4 text-center text-gray-600 text-xs">No reports yet</div>
            )}
          </div>
        </aside>
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
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-mono text-xs">#{inspectProblem.leetcodeId}</span>
                  <button onClick={() => setInspectProblem(null)} className="text-gray-500 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="font-display font-bold text-xl text-white">{inspectProblem.title}</h3>
                <div className="flex items-center gap-2">
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
                    <FreqBar percent={inspectProblem.frequencyPercent || 0} />
                    <span className="text-xs text-gray-400">{inspectProblem.frequencyPercent}% relative frequency</span>
                  </div>
                </div>

                <a
                  href={inspectProblem.url || `https://leetcode.com/problems/${inspectProblem.titleSlug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-accent/20 text-accent-light border border-accent/30 rounded-lg text-xs font-medium hover:bg-accent/30 transition-colors w-full justify-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open on LeetCode
                </a>

                <div className="flex items-center gap-3 pt-2 border-t border-surface-600">
                  <input
                    type="checkbox"
                    checked={isSolved(solvedMap, selectedSlug, inspectProblem.id)}
                    onChange={() => handleToggleSolved(inspectProblem.id)}
                    className="solved-check w-5 h-5 cursor-pointer"
                  />
                  <span className="text-xs text-gray-400">
                    {isSolved(solvedMap, selectedSlug, inspectProblem.id) ? 'Solved ✓' : 'Mark as solved'}
                  </span>
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
    </div>
  );
}

// ═══════════════════════════════════════════
// STUDY PLAN MODAL
// ═══════════════════════════════════════════
function StudyPlanModal({ companySlug, companyName, onClose }) {
  const [daysRemaining, setDaysRemaining] = useState(14);
  const [solvedCount, setSolvedCount] = useState(0);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);
    fetch(`${API}/companies/${companySlug}/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daysRemaining, solvedCount }),
    })
      .then(r => r.json())
      .then(data => {
        try { setPlan(JSON.parse(data.plan)); }
        catch { setPlan({ strategy: data.plan }); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-h-[80vh] glass-panel rounded-2xl border border-surface-500 z-50 overflow-hidden"
      >
        <div className="p-5 border-b border-surface-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-success" />
            <h3 className="font-display font-bold text-lg text-white">Generate Study Plan</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
          {!plan ? (
            <>
              <p className="text-xs text-gray-400">Get a personalized day-by-day study schedule for <span className="text-white font-semibold">{companyName}</span>, powered by AI.</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 block">Days Until Interview</label>
                  <input
                    type="number"
                    value={daysRemaining}
                    onChange={e => setDaysRemaining(Number(e.target.value))}
                    min={1}
                    max={90}
                    className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 block">Problems Already Solved</label>
                  <input
                    type="number"
                    value={solvedCount}
                    onChange={e => setSolvedCount(Number(e.target.value))}
                    min={0}
                    className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={generate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-accent to-accent-light text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Generating Plan...' : 'Generate My Plan'}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              {plan.strategy && (
                <div className="glass-panel rounded-xl p-4 border-l-2 border-success">
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider">Strategy</span>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">{plan.strategy}</p>
                </div>
              )}

              {plan.readinessScore && (
                <div className="flex items-center gap-3">
                  <ProgressRing percent={plan.readinessScore} size={48} />
                  <div>
                    <div className="text-lg font-display font-bold text-white">{plan.readinessScore}%</div>
                    <div className="text-[11px] text-gray-500">Estimated readiness after plan</div>
                  </div>
                </div>
              )}

              {plan.topicsToRevise && (
                <div>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider">Topics to Prioritize</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {plan.topicsToRevise.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {plan.dailyPlan && (
                <div>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider">Daily Schedule</span>
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {plan.dailyPlan.map((day, i) => (
                      <div key={i} className="glass-panel rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-white">Day {day.day}</span>
                          <span className="text-[10px] text-gray-500">{day.hours}h</span>
                        </div>
                        <p className="text-[11px] text-accent-light mb-1">{day.focus}</p>
                        {day.problems && (
                          <div className="flex flex-wrap gap-1">
                            {day.problems.map((p, j) => (
                              <span key={j} className="text-[10px] bg-surface-600 px-1.5 py-0.5 rounded text-gray-400">{p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setPlan(null)}
                className="w-full text-xs text-gray-500 hover:text-white py-2 transition-colors"
              >
                ← Generate another plan
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
