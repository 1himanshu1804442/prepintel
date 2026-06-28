import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Compass, ChevronRight, Terminal, PlusCircle, CheckCircle, ExternalLink, RefreshCw, BarChart2, ShieldAlert, Cpu } from 'lucide-react';

const API_BASE = "http://localhost:8080/api";

const MOCK_COMPANIES = [
  { id: 1, name: "Autodesk", slug: "autodesk" },
  { id: 2, name: "Infosys", slug: "infosys" },
  { id: 3, name: "Google", slug: "google" },
  { id: 4, name: "Microsoft", slug: "microsoft" },
  { id: 5, name: "Amazon", slug: "amazon" },
  { id: 6, name: "Meta", slug: "facebook" }
];

const MOCK_PROBLEMS = {
  autodesk: [
    { leetcodeId: 25, title: "Reverse Nodes in k-Group", titleSlug: "reverse-nodes-in-k-group", difficulty: "Hard", acceptanceRate: 54.3, url: "https://leetcode.com/problems/reverse-nodes-in-k-group", reportCount: 15 },
    { leetcodeId: 109, title: "Convert Sorted List to Binary Search Tree", titleSlug: "convert-sorted-list-to-binary-search-tree", difficulty: "Medium", acceptanceRate: 60.1, url: "https://leetcode.com/problems/convert-sorted-list-to-binary-search-tree", reportCount: 12 },
    { leetcodeId: 49, title: "Group Anagrams", titleSlug: "group-anagrams", difficulty: "Medium", acceptanceRate: 66.8, url: "https://leetcode.com/problems/group-anagrams", reportCount: 9 },
    { leetcodeId: 200, title: "Number of Islands", titleSlug: "number-of-islands", difficulty: "Medium", acceptanceRate: 57.2, url: "https://leetcode.com/problems/number-of-islands", reportCount: 8 }
  ],
  infosys: [
    { leetcodeId: 300, title: "Longest Increasing Subsequence", titleSlug: "longest-increasing-subsequence", difficulty: "Medium", acceptanceRate: 52.1, url: "https://leetcode.com/problems/longest-increasing-subsequence", reportCount: 22 },
    { leetcodeId: 322, title: "Coin Change", titleSlug: "coin-change", difficulty: "Medium", acceptanceRate: 42.5, url: "https://leetcode.com/problems/coin-change", reportCount: 18 },
    { leetcodeId: 72, title: "Edit Distance", titleSlug: "edit-distance", difficulty: "Hard", acceptanceRate: 53.8, url: "https://leetcode.com/problems/edit-distance", reportCount: 14 }
  ]
};

const MOCK_REDDIT = [
  { id: 1, companyName: "Autodesk", problemName: "Number of Islands", leetcodeId: 200, url: "https://leetcode.com/problems/number-of-islands", notes: "Grid pathing with negative weights. (Source: r/leetcode)", dateReported: "2026-06-28T10:30:00" },
  { id: 2, companyName: "Infosys", problemName: "Edit Distance", leetcodeId: 72, url: "https://leetcode.com/problems/edit-distance", notes: "Dynamic Programming optimization round. (Source: r/developersIndia)", dateReported: "2026-06-27T18:45:00" }
];

export default function App() {
  const [companies, setCompanies] = useState(MOCK_COMPANIES);
  const [selectedCompany, setSelectedCompany] = useState("autodesk");
  const [timeframe, setTimeframe] = useState("all_time");
  const [searchQuery, setSearchQuery] = useState("");
  const [problems, setProblems] = useState([]);
  const [redditProblems, setRedditProblems] = useState(MOCK_REDDIT);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'logs'
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(2818);
  const [totalReportsCount, setTotalReportsCount] = useState(9500);

  // Form states
  const [formCompany, setFormCompany] = useState("autodesk");
  const [formLcId, setFormLcId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/companies`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setCompanies(data);
      })
      .catch(() => console.log("Using fallback companies"));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/companies/${selectedCompany}/problems?timeframe=${timeframe}`)
      .then(res => res.json())
      .then(data => {
        setProblems(data);
        setLoading(false);
      })
      .catch(() => {
        setProblems(MOCK_PROBLEMS[selectedCompany] || []);
        setLoading(false);
      });
  }, [selectedCompany, timeframe]);

  const fetchRedditFeed = () => {
    fetch(`${API_BASE}/reddit-problems`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setRedditProblems(data);
      })
      .catch(() => console.log("Using fallback Reddit feed"));
  };

  useEffect(() => {
    fetchRedditFeed();
  }, []);

  const handleLogSubmit = (e) => {
    e.preventDefault();
    if (!formLcId) return;

    const payload = {
      companySlug: formCompany,
      leetcodeId: parseInt(formLcId),
      notes: formNotes
    };

    fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (res.ok) {
          setFormStatus("Logged successfully!");
          setFormLcId("");
          setFormNotes("");
          setTotalReportsCount(prev => prev + 1);
          setTimeout(() => setFormStatus(""), 3000);
        } else {
          setFormStatus("Error: Question ID not mapped.");
        }
      })
      .catch(() => {
        setFormStatus("Mock logged successfully!");
        setTotalReportsCount(prev => prev + 1);
        setTimeout(() => setFormStatus(""), 3000);
      });
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#111317] text-[#D1D5DB] font-sans selection:bg-[#E29D3E] selection:text-[#111317] px-6 py-10 md:px-12 lg:px-20 max-w-[1400px] mx-auto flex flex-col gap-10">
      
      {/* 🛡️ Header Identity - Industrial Brass / Charcoal Aesthetic */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-[#282F3A] pb-8">
        <div className="flex items-center gap-4.5">
          <div className="bg-[#1C2026] border border-[#E29D3E]/30 p-3.5 rounded-xl shadow-[0_0_20px_rgba(226,157,62,0.06)]">
            <Cpu className="w-8 h-8 text-[#E29D3E]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white font-display">
              PREP<span className="text-[#E29D3E]">INTEL</span>
            </h1>
            <p className="text-xs tracking-wider text-gray-500 uppercase font-semibold">
              Precision Interview Intelligence Console
            </p>
          </div>
        </div>

        {/* Console Nav & Live Stats */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="hidden sm:flex items-center gap-5 text-xs text-[#8E9BAE] border-r border-[#282F3A] pr-6">
            <div className="flex flex-col items-end">
              <span className="font-mono text-white text-sm font-bold">{totalReportsCount}</span>
              <span className="uppercase text-[9px] tracking-widest font-bold">TOTAL REPORTS</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono text-white text-sm font-bold">{totalQuestionsCount}</span>
              <span className="uppercase text-[9px] tracking-widest font-bold">ACTIVE PROBLEMS</span>
            </div>
          </div>

          <div className="flex bg-[#161A20] p-1.5 rounded-xl border border-[#282F3A]">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4.5 py-2 rounded-lg text-xs tracking-wider uppercase font-bold transition-all duration-300 ${
                activeTab === "dashboard" ? "bg-[#E29D3E] text-[#111317]" : "text-gray-400 hover:text-white"
              }`}
            >
              Intelligence Console
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-4.5 py-2 rounded-lg text-xs tracking-wider uppercase font-bold transition-all duration-300 ${
                activeTab === "logs" ? "bg-[#E29D3E] text-[#111317]" : "text-gray-400 hover:text-white"
              }`}
            >
              Log Report
            </button>
          </div>
        </div>
      </header>

      {/* 🚀 Main Interface (Dashboard vs Log Experience) */}
      <AnimatePresence mode="wait">
        {activeTab === "dashboard" ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* 1. Left Grid (3 cols): Company Selector Panel */}
            <div className="lg:col-span-4 bg-[#161A20] border border-[#282F3A] p-6 rounded-2xl flex flex-col gap-6 max-h-[550px] shadow-lg">
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm uppercase tracking-widest font-bold text-[#8E9BAE] flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#E29D3E]" /> TARGET REGISTER
                  </h3>
                  <span className="text-[10px] bg-[#E29D3E]/10 text-[#E29D3E] border border-[#E29D3E]/20 px-2 py-0.5 rounded font-mono font-bold">
                    {filteredCompanies.length} SYSTEMS
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search systems (e.g. Autodesk)..."
                    className="w-full bg-[#0E1114] border border-[#282F3A] focus:border-[#E29D3E]/50 focus:shadow-[0_0_12px_rgba(226,157,62,0.1)] rounded-xl pl-10 pr-4 py-3 text-sm text-gray-200 outline-none transition-all duration-300 placeholder-gray-600"
                  />
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-600" />
                </div>
              </div>

              {/* Badges container */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 scrollbar-thin">
                {filteredCompanies.map((c) => (
                  <button
                    key={c.slug}
                    onClick={() => setSelectedCompany(c.slug)}
                    className={`w-full flex justify-between items-center px-4.5 py-4 rounded-xl border transition-all duration-300 text-left ${
                      selectedCompany === c.slug
                        ? "bg-[#E29D3E]/5 border-[#E29D3E] text-white shadow-[inset_0_0_15px_rgba(226,157,62,0.03)]"
                        : "bg-transparent border-[#232933] text-gray-400 hover:bg-[#1E232B] hover:text-white"
                    }`}
                  >
                    <span className="font-mono text-sm tracking-wide font-bold">{c.name.toUpperCase()}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${
                      selectedCompany === c.slug ? "translate-x-1.5 text-[#E29D3E]" : "text-gray-600"
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Right Grid (8 cols): Question Console */}
            <div className="lg:col-span-8 bg-[#161A20] border border-[#282F3A] p-6 rounded-2xl flex flex-col gap-6 max-h-[550px] shadow-lg">
              {/* Header metadata details */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#282F3A] pb-5">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white capitalize font-display">
                    {companies.find(c => c.slug === selectedCompany)?.name || selectedCompany}
                  </h2>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-1">
                    Systemic problem occurrences index
                  </p>
                </div>

                {/* Micro timeframe tabs */}
                <div className="flex bg-[#0E1114] p-1 rounded-xl border border-[#232933]">
                  {[
                    { id: "30_days", label: "30D" },
                    { id: "3_months", label: "90D" },
                    { id: "1_year", label: "1YR" },
                    { id: "all_time", label: "ALL" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTimeframe(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider transition-all duration-300 ${
                        timeframe === t.id ? "bg-[#E29D3E] text-[#111317]" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Problem list scroll area */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin">
                {loading ? (
                  <div className="h-full flex justify-center items-center">
                    <RefreshCw className="w-6 h-6 text-[#E29D3E] animate-spin" />
                  </div>
                ) : problems.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-center p-6 gap-2">
                    <ShieldAlert className="w-8 h-8 text-gray-600" />
                    <span className="text-xs font-mono uppercase tracking-widest text-gray-500">NO SYSTEM LOGS RECORDED</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {problems.map((p, idx) => (
                      <div key={p.leetcodeId} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-[#232933] bg-[#0E1114]/40 hover:border-[#E29D3E]/30 transition-all duration-300">
                        <div className="flex items-center gap-4.5">
                          <span className="font-mono text-sm font-bold text-gray-600">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-white tracking-wide">{p.title}</span>
                              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                p.difficulty === "Easy" ? "bg-emerald-950 text-emerald-400 border border-emerald-900" :
                                p.difficulty === "Medium" ? "bg-amber-950 text-amber-400 border border-amber-900" :
                                "bg-rose-950 text-rose-400 border border-rose-900"
                              }`}>
                                {p.difficulty}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-gray-500 mt-1 block">
                              LC-{p.leetcodeId} // ACCEPTANCE: {p.acceptanceRate}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4.5 mt-3 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="text-xs font-mono font-bold bg-[#E29D3E]/10 border border-[#E29D3E]/20 text-[#E29D3E] px-3 py-1.5 rounded-lg shadow-sm">
                            {p.reportCount} REPORTS
                          </span>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#1E232B] hover:bg-[#E29D3E] border border-[#282F3A] hover:border-[#E29D3E] text-gray-400 hover:text-[#111317] p-2.5 rounded-xl transition-all duration-300"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Bottom Grid (12 cols): Timeline / Scraper Feed */}
            <div className="lg:col-span-12 bg-[#161A20] border border-[#282F3A] p-6 rounded-2xl flex flex-col gap-4.5 shadow-lg max-h-[350px]">
              <div className="flex justify-between items-center border-b border-[#282F3A] pb-4">
                <h3 className="text-sm uppercase tracking-widest font-bold text-[#8E9BAE] flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#E29D3E]" /> COMMUNITY INTERVIEW REPORTS (CRAWLED)
                </h3>
                <button
                  onClick={fetchRedditFeed}
                  className="text-[10px] font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> RELOAD CONSOLE
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin">
                {redditProblems.map((rp) => (
                  <div key={rp.id} className="p-4 rounded-xl border border-[#232933] bg-[#0E1114]/30 hover:border-[#282F3A] transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#E29D3E] tracking-wider uppercase bg-[#E29D3E]/10 border border-[#E29D3E]/20 px-2 py-0.5 rounded">
                          {rp.companyName}
                        </span>
                        <span className="text-gray-600 font-mono text-xs">//</span>
                        <span className="font-semibold text-white tracking-wide text-sm">{rp.problemName}</span>
                        <span className="font-mono text-[10px] text-gray-500">LC-{rp.leetcodeId}</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed font-mono">{rp.notes}</p>
                    </div>

                    <a
                      href={rp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#E29D3E] hover:underline"
                    >
                      Inspect Problem <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          /* 📝 Log Report Console Form */
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="bg-[#161A20] border border-[#282F3A] p-8 rounded-2xl max-w-2xl mx-auto flex flex-col gap-6 shadow-xl"
          >
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 font-display">
                <PlusCircle className="w-5 h-5 text-[#E29D3E]" /> SUBMIT INTERVIEW EXPERIENCE
              </h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-1">
                Inject candidate problem report logs into the console
              </p>
            </div>

            <form onSubmit={handleLogSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-widest text-[#8E9BAE] font-bold">Company Instance</label>
                <select
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full bg-[#0E1114] border border-[#282F3A] focus:border-[#E29D3E]/50 rounded-xl px-4 py-3.5 text-sm text-gray-200 outline-none transition-all duration-300"
                >
                  {companies.map(c => (
                    <option key={c.slug} value={c.slug} className="bg-[#111317]">{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-widest text-[#8E9BAE] font-bold">LeetCode Problem ID</label>
                <input
                  type="number"
                  required
                  value={formLcId}
                  onChange={(e) => setFormLcId(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full bg-[#0E1114] border border-[#282F3A] focus:border-[#E29D3E]/50 focus:shadow-[0_0_12px_rgba(226,157,62,0.1)] rounded-xl px-4 py-3.5 text-sm text-gray-200 outline-none transition-all duration-300"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-widest text-[#8E9BAE] font-bold">Console Log notes / constraints</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Encountered in Online Assessment. Solved using sliding window O(N) optimization."
                  rows={4}
                  className="w-full bg-[#0E1114] border border-[#282F3A] focus:border-[#E29D3E]/50 focus:shadow-[0_0_12px_rgba(226,157,62,0.1)] rounded-xl px-4 py-3.5 text-sm text-gray-200 outline-none transition-all duration-300 resize-none font-mono text-xs leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-[#E29D3E] hover:bg-[#c9862f] text-[#111317] text-xs uppercase tracking-widest font-bold shadow-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(226,157,62,0.2)]"
              >
                Injected experience report
              </button>

              {formStatus && (
                <div className="flex items-center justify-center gap-2 mt-2 text-xs font-mono text-[#E29D3E] uppercase tracking-widest animate-pulse">
                  <CheckCircle className="w-4 h-4" /> {formStatus}
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
