import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BrainCircuit, CheckCircle2, ChevronRight, Clock3,
  Database, Github, Radar, ShieldCheck, Sparkles, Target, Zap
} from 'lucide-react';

const reveal = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 }
};

function EvidencePrism() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((event.clientY - bounds.top) / bounds.height - 0.5) * -11,
      y: ((event.clientX - bounds.left) / bounds.width - 0.5) * 14,
    });
  };

  return (
    <div
      className="evidence-stage"
      onMouseMove={handleMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      aria-label="Animated placement intelligence visual"
      role="img"
    >
      <div className="evidence-grid" />
      <motion.div
        className="evidence-prism"
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: 'spring', stiffness: 90, damping: 18, mass: 0.7 }}
      >
        <div className="prism-orbit orbit-one"><span /></div>
        <div className="prism-orbit orbit-two"><span /></div>
        <div className="prism-halo" />
        <div className="prism-core">
          <Radar className="w-8 h-8" strokeWidth={1.5} />
          <span>LIVE SIGNAL</span>
        </div>

        <div className="signal-card signal-card-top">
          <div className="signal-card-kicker"><span className="signal-dot" /> VERIFIED</div>
          <strong>Infosys DSE</strong>
          <p>Last report: 12 days ago</p>
          <div className="signal-meter"><i /></div>
        </div>

        <div className="signal-card signal-card-left">
          <div className="signal-card-kicker">RISING TOPIC</div>
          <strong>Graph traversal</strong>
          <p>3 recent reports</p>
          <span className="signal-tag">+ recency weight</span>
        </div>

        <div className="signal-card signal-card-right">
          <div className="signal-card-kicker">YOUR QUEUE</div>
          <strong>4 highest-yield</strong>
          <p>Unsolved questions first</p>
          <div className="queue-lines"><i /><i /><i /></div>
        </div>
      </motion.div>
      <p className="evidence-caption"><span /> Move to inspect the signal</p>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-shell min-h-screen overflow-x-hidden text-slate-100">
      <div className="landing-noise" aria-hidden="true" />
      <div className="landing-glow landing-glow-left" aria-hidden="true" />
      <div className="landing-glow landing-glow-right" aria-hidden="true" />

      <nav className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 text-left">
          <span className="brand-mark"><Target className="h-4 w-4" /></span>
          <span className="font-display text-lg font-bold tracking-[-0.03em] text-white">PrepIntel</span>
        </button>
        <div className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
          <a href="#method" className="transition-colors hover:text-white">How it works</a>
          <a href="#signals" className="transition-colors hover:text-white">Data standards</a>
          <a href="https://github.com/1himanshu1804442/prepintel" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-white"><Github className="h-3.5 w-3.5" /> GitHub</a>
        </div>
        <button onClick={() => navigate('/dashboard')} className="landing-nav-cta">Open dashboard <ChevronRight className="h-4 w-4" /></button>
      </nav>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-12 lg:px-8 lg:pt-20">
        <section className="grid min-h-[590px] items-center gap-10 lg:grid-cols-[0.93fr_1.07fr] lg:gap-4">
          <motion.div initial="hidden" animate="visible" transition={{ staggerChildren: 0.11 }} className="max-w-2xl">
            <motion.div variants={reveal} transition={{ duration: 0.6 }} className="eyebrow-signal">
              <span className="pulse-core" /> Placement intelligence, with provenance
            </motion.div>
            <motion.h1 variants={reveal} transition={{ duration: 0.65 }} className="landing-title mt-6">
              Stop studying the <em>past.</em>
              <span>Prepare for the signal.</span>
            </motion.h1>
            <motion.p variants={reveal} transition={{ duration: 0.65 }} className="mt-7 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
              PrepIntel turns dated interview evidence into a focused practice queue—so candidates can see what is recent, what is verified, and what still needs caution.
            </motion.p>
            <motion.div variants={reveal} transition={{ duration: 0.65 }} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => navigate('/dashboard')} className="landing-primary-cta">Explore company signals <ArrowRight className="h-4 w-4" /></button>
              <a href="#method" className="landing-secondary-cta">See the methodology</a>
            </motion.div>
            <motion.div variants={reveal} transition={{ duration: 0.65 }} className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-400">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-300" /> Source-aware ranking</span>
              <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-violet-300" /> Exact-date recency</span>
              <span className="inline-flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-amber-200" /> Focused study plans</span>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.94, x: 24 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ duration: 0.85, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}>
            <EvidencePrism />
          </motion.div>
        </section>

        <section id="method" className="landing-method mt-8 grid gap-px overflow-hidden rounded-3xl border border-white/[0.09] bg-white/[0.09] md:grid-cols-3">
          {[
            [Database, 'Capture evidence', 'Store an observed date, role, drive type, source, and verification state for every report.'],
            [Radar, 'Rank the signal', 'Recent, unique evidence matters more. Historical imports remain visible without pretending to be current.'],
            [Zap, 'Practice with intent', 'Get a transparent, high-yield queue of questions based on the opportunity you are targeting.'],
          ].map(([Icon, title, copy]) => (
            <article key={title} className="landing-method-card">
              <span className="method-icon"><Icon className="h-5 w-5" strokeWidth={1.7} /></span>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </section>

        <section id="signals" className="mt-24 grid items-center gap-10 border-t border-white/[0.08] pt-16 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <div className="eyebrow-signal"><Sparkles className="h-3.5 w-3.5" /> No false freshness</div>
            <h2 className="mt-5 font-display text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">Confidence should be explained, not invented.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="truth-card truth-card-violet"><span>Freshness label</span><strong>Verified in the last 30 days</strong><p>Only dated and verified reports earn this label.</p></div>
            <div className="truth-card truth-card-cyan"><span>Historical context</span><strong>Interview date unverified</strong><p>Legacy data stays useful without distorting current trends.</p></div>
          </div>
        </section>
      </main>
    </div>
  );
}
