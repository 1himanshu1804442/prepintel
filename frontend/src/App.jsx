import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Brain, Clock, ChevronRight, Terminal, PlusCircle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';

const API_BASE = "http://localhost:8080/api";

// Fallback Mock Data for Demo & Offline Sanity
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
  { id: 1, companyName: "Autodesk", problemName: "Number of Islands", leetcodeId: 200, url: "https://leetcode.com/problems/number-of-islands", notes: "Asked in Autodesk OA. Grid traversal to count connected land masses. (Source: r/leetcode)", dateReported: "2026-06-28T10:30:00" },
  { id: 2, companyName: "Infosys", problemName: "Edit Distance", leetcodeId: 72, url: "https://leetcode.com/problems/edit-distance", notes: "Specialist Programmer OA. Complex string matching and minimum edit operations. (Source: r/developersIndia)", dateReported: "2026-06-27T18:45:00" }
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
  
  // Log form state
  const [formCompany, setFormCompany] = useState("autodesk");
  const [formLcId, setFormLcId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("");

  // Fetch Companies on Mount
  useEffect(() => {
    fetch(`${API_BASE}/companies`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setCompanies(data);
      })
      .catch(() => console.log("Using fallback companies (backend offline)"));
  }, []);

  // Fetch Problems when Company or Timeframe Changes
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/companies/${selectedCompany}/problems?timeframe=${timeframe}`)
      .then(res => res.json())
      .then(data => {
        setProblems(data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to mock problems
        setProblems(MOCK_PROBLEMS[selectedCompany] || []);
        setLoading(false);
      });
  }, [selectedCompany, timeframe]);

  // Fetch Scraped Reddit Feed
  const fetchRedditFeed = () => {
    fetch(`${API_BASE}/reddit-problems`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setRedditProblems(data);
      })
      .catch(() => console.log("Using fallback Reddit feed (backend offline)"));
  };

  useEffect(() => {
    fetchRedditFeed();
  }, []);

  // Handle Form Submission
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
          setFormStatus("Success! Logged experience.");
          setFormLcId("");
          setFormNotes("");
          // Refresh problem list
          setTimeout(() => setFormStatus(""), 3000);
        } else {
          setFormStatus("Error: LeetCode ID not found in dataset.");
        }
      })
      .catch(() => {
        setFormStatus("Mock Success! (Backend offline)");
        setTimeout(() => setFormStatus(""), 3000);
      });
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen px-6 py-8 md:px-16 max-w-7xl mx-auto flex flex-col gap-8">
      {/* 🚀 Sleek Glassmorphic Header */}
      <header className="glass-card p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-neonGlow to-neonGreen p-3 rounded-xl shadow-lg">
            <Brain className="w-8 h-8 text-darkBg" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
              PrepIntel
            </h1>
            <p className="text-sm text-gray-400">
              Community Interview Intelligence & Scraped OA Experiences
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-darkBg/60 p-1.5 rounded-xl border border-borderGlass">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === "dashboard" ? "bg-neonGlow text-white shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === "logs" ? "bg-neonGlow text-white shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            Log Experience
          </button>
        </div>
      </header>

      {/* 📊 Main Bento Grid Content */}
      <AnimatePresence mode="wait">
        {activeTab === "dashboard" ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* 1. Left Grid Panel: Search & Company List */}
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-6 h-[500px]">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                  <Search className="w-5 h-5 text-neonGlow" /> Find Companies
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Autodesk, Google..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-gray-200"
                  />
                  <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-500" />
                </div>
              </div>

              {/* Company Badges List */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                {filteredCompanies.map((c) => (
                  <button
                    key={c.slug}
                    onClick={() => setSelectedCompany(c.slug)}
                    className={`w-full flex justify-between items-center px-4 py-3 rounded-xl border transition-all duration-300 ${
                      selectedCompany === c.slug
                        ? "bg-neonGlow/10 border-neonGlow text-white"
                        : "bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="font-semibold">{c.name}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${
                      selectedCompany === c.slug ? "translate-x-1 text-neonGlow" : ""
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Center Grid Panel: Problem Feed */}
            <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col gap-6 h-[500px]">
              {/* Header with Timeframe toggles */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-borderGlass pb-4">
                <div>
                  <h2 className="text-2xl font-bold capitalize text-white">
                    {companies.find(c => c.slug === selectedCompany)?.name || selectedCompany}
                  </h2>
                  <p className="text-sm text-gray-400">Most reported interview questions</p>
                </div>

                {/* Timeframe selector */}
                <div className="flex bg-darkBg/60 p-1 rounded-xl border border-borderGlass">
                  {["30_days", "3_months", "1_year", "all_time"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                        timeframe === t ? "bg-neonGlow text-white shadow" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {t.replace("_", " ").toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Problems Table/Cards */}
              <div className="flex-1 overflow-y-auto pr-1">
                {loading ? (
                  <div className="h-full flex justify-center items-center">
                    <RefreshCw className="w-8 h-8 text-neonGlow animate-spin" />
                  </div>
                ) : problems.length === 0 ? (
                  <div className="h-full flex justify-center items-center text-gray-500 text-sm">
                    No questions logged for this timeframe.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {problems.map((p, idx) => (
                      <div key={p.leetcodeId} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-borderGlass bg-darkBg/30 hover:border-neonGlow/30 transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-gray-600">#{idx + 1}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{p.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                p.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400" :
                                p.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                              }`}>
                                {p.difficulty}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">LeetCode {p.leetcodeId} | Accept: {p.acceptanceRate}%</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="text-xs font-semibold bg-neonGlow/10 text-neonGlow px-3 py-1.5 rounded-lg">
                            {p.reportCount} Reports
                          </span>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-white p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Bottom Grid Panel: Reddit OA Crawler Feed */}
            <div className="lg:col-span-3 glass-card p-6 rounded-2xl flex flex-col gap-4 max-h-[400px]">
              <div className="flex justify-between items-center border-b border-borderGlass pb-3">
                <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-neonGreen" /> Recent OA Experiences (Reddit Live Crawler)
                </h3>
                <button
                  onClick={fetchRedditFeed}
                  className="text-xs font-bold flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
                {redditProblems.map((rp) => (
                  <div key={rp.id} className="p-4 rounded-xl border border-borderGlass bg-darkBg/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neonGreen">{rp.companyName}</span>
                        <span className="text-xs text-gray-500">|</span>
                        <span className="font-semibold text-white">{rp.problemName}</span>
                        <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded">ID: {rp.leetcodeId}</span>
                      </div>
                      <p className="text-sm text-gray-400">{rp.notes}</p>
                    </div>

                    <a
                      href={rp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-neonGlow hover:underline"
                    >
                      Solve on LeetCode <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          /* 📝 Log Experience Tab */
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-8 rounded-2xl max-w-2xl mx-auto flex flex-col gap-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-6 h-6 text-neonGlow" /> Log an Interview Experience
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Help the community grow. Submit coding questions you encountered during your assessments.
              </p>
            </div>

            <form onSubmit={handleLogSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-300">Company</label>
                <select
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="px-4 py-2.5 rounded-xl glass-input text-sm text-gray-200"
                >
                  {companies.map(c => (
                    <option key={c.slug} value={c.slug} className="bg-darkBg">{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-300">LeetCode Problem ID</label>
                <input
                  type="number"
                  required
                  value={formLcId}
                  onChange={(e) => setFormLcId(e.target.value)}
                  placeholder="e.g. 1"
                  className="px-4 py-2.5 rounded-xl glass-input text-sm text-gray-200"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-300">Notes / Constraints / Round Details</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Asked in Online Assessment. Had to optimize to O(N log N)."
                  rows={4}
                  className="px-4 py-2.5 rounded-xl glass-input text-sm text-gray-200 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-neonGlow hover:bg-neonGlow/90 font-bold transition-all duration-300 shadow-lg text-white"
              >
                Submit Report
              </button>

              {formStatus && (
                <div className="flex items-center justify-center gap-2 mt-2 text-sm text-neonGreen font-semibold animate-pulse">
                  <CheckCircle className="w-5 h-5" /> {formStatus}
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
