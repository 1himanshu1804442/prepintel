<div align="center">

# 🎯 PrepIntel
### **Data-Driven Placement Intelligence & Technical Interview Platform**

[![Java 17](https://img.shields.io/badge/Java-17-orange.svg?style=for-the-badge&logo=java)](https://www.oracle.com/java/)
[![Spring Boot 3.2](https://img.shields.io/badge/Spring_Boot-3.2-green.svg?style=for-the-badge&logo=springboot)](https://spring.io/projects/spring-boot)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-blue.svg?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2.svg?style=for-the-badge&logo=google)](https://deepmind.google/technologies/gemini/)
[![License MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg?style=for-the-badge)](LICENSE)

<br/>

**PrepIntel** is a high-precision placement engineering platform that replaces static question lists with **data-driven interview analytics**. It ingests historical interview report data across **84+ top technology companies** (from Google and Amazon to TCS, Infosys, and Cognizant), applies a **4-signal mathematical confidence formula**, and computes **topological learning trajectories** using Directed Acyclic Graphs (DAGs).

[Architecture](#-system-architecture) • [Engineering Mechanics](#-star-engineering-innovations) • [Terminology Boundary](#-precise-engineering-terminology-boundary) • [API Reference](#-api-reference) • [Getting Started](#-getting-started)

</div>

---

## 🌟 Star Engineering Innovations

### 🧠 1. Placement Intelligence Engine (vs. Static Sheets)
Traditional company sheets (Striver, NeetCode, GitHub repos) are static CSVs manually curated months or years ago. PrepIntel operates as an **intelligence platform**:
- Automatically aggregates, normalizes, and deduplicates open-source interview datasets.
- Computes **live frequency ranks**, **recency trends**, and **source provenance** per question.
- Distinguishes **Historical Repositories** from **Live Candidate OA Reports** to maintain data integrity.

---

### 📐 2. 4-Signal Mathematical Confidence Scoring Engine
Instead of arbitrary heuristics or hardcoded percentages, every interview question is evaluated by a **mathematically defensible 4-signal formula**:

$$\text{ConfidenceScore} = 0.40 \cdot S_{\text{freq}} + 0.25 \cdot S_{\text{rec}} + 0.20 \cdot S_{\text{ver}} + 0.15 \cdot S_{\text{div}}$$

Where each signal is normalized to $[0, 1]$ before weighting:

* **$S_{\text{freq}}$ (Log-Normalized Frequency)**:
  $$S_{\text{freq}} = \frac{\ln(1 + \text{reportCount})}{\ln(1 + \max \text{reportCount})}$$
  *Prevents viral outlier questions with 500+ reports from compressing all other questions to 0%.*

* **$S_{\text{rec}}$ (Exponential Recency Decay with 180-Day Half-Life)**:
  $$S_{\text{rec}} = \max_{\text{reports}} \exp\left(-\frac{\text{ageDays}}{180}\right)$$
  *Reflects semi-annual placement season cycles. A question reported 30 days ago retains ~85% signal strength, while 2-year-old data decays smoothly.*

* **$S_{\text{ver}}$ (Verification Ratio)**:
  $$S_{\text{ver}} = \frac{\text{verifiedReportCount}}{\text{totalReportCount}}$$
  *Measures what proportion of reports have been independently confirmed by community verification.*

* **$S_{\text{div}}$ (Normalized Shannon Entropy of Source Distribution)**:
  $$S_{\text{div}} = -\frac{\sum_{i=1}^{N} p_i \ln(p_i)}{\ln(N)}$$
  *Quantifies source diversity. Questions confirmed across multiple independent sources (GitHub + Student Submissions + Reddit) receive higher trust than single-source reports.*

---

### 🌐 3. Adaptive DAG TopicGraphEngine (Topological Sort + Personalization)
DSA prerequisites are modeled as a **Directed Acyclic Graph (DAG)** ($G = (V, E)$). Rather than rendering static nodes, the backend (`TopicGraphEngine.java`) runs a **Topological Sort & Multi-Signal Personalization Score**:

$$\text{PriorityScore}(v) = 0.40 \cdot S_{\text{companyFreq}} + 0.30 \cdot S_{\text{userWeakness}} + 0.20 \cdot S_{\text{unlockValue}} + 0.10 \cdot S_{\text{diffFit}}$$

- **Company-Aware Trajectories**: Generates tailored topological study orders (e.g. Amazon prioritizes `Graphs → DP`, while TCS prioritizes `Strings → Arrays`).
- **Unlock Value Metrics**: Calculates downstream nodes unlocked (e.g. `Arrays` unlocks 5 downstream topics: Two Pointers, Sliding Window, Prefix Sum, Hash Table, Sorting).
- **ROI Ratings ($\star\star\star\star\star$)**: Provides estimated study hours and return-on-investment ratings per topic node.

---

### 📈 4. Zerotrac Contest Elo Calibration
- Replaces coarse "Easy / Medium / Hard" tags with **1,980+ LeetCode contest Elo ratings** derived from Zerotrac data (e.g. *1540 Elo*).
- Enables candidates to calibrate preparation against exact skill boundaries.

---

### 🤖 5. Resilient Multi-Tier Gemini 2.5 AI Coaching
- **AI Summary Coach**: Generates company-level focus area summaries, OA pattern overviews, and target preparation timelines.
- **AI Hint Coach**: Provides progressive, step-by-step conceptual hints without spoiling solution code.
- **High-Availability Fallback Chain**: Implements exponential backoff and a 2-tier fallback chain (`gemini-2.5-flash` → `gemini-2.5-flash-lite`) to survive free-tier rate limits.

---

### 📅 6. Deterministic Algorithmic Study Plan Generator
- Calculates a personalized day-by-day study roadmap based on target exam date and daily available study hours.
- Automatically excludes already-solved problems, interleaves Easy/Medium/Hard questions across preparation phases, and computes a readiness score.

---

### 🔄 7. Tokenless Multi-Source Sync Engine
- **LeetCode GraphQL API**: Syncs public Accepted (AC) submissions without needing passwords.
- **GitHub Git Trees API**: Recursively scans repositories (`/git/trees/{branch}?recursive=1`) to import solved problem slugs synced via LeetHub/LeetSync.
- **Codeforces API**: Live sync of competitive programming submissions.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (React 18 + Tailwind CSS + Framer Motion)"]
        UI["Interactive Intelligence Dashboard"]
        ConfidenceModal["4-Signal Formula Transparency Modal"]
        GraphModal["Adaptive DAG Knowledge Graph Modal"]
        SyncModule["Tokenless Multi-Source Sync Engine"]
    end

    subgraph Server["Backend (Java 17 + Spring Boot 3.2)"]
        Controller["JobController REST API"]
        RankingSvc["InterviewReportRankingService (4-Signal Engine)"]
        GraphEngine["TopicGraphEngine (DAG + Topological Sort)"]
        GeminiSvc["GeminiService (HttpClient + Fallback Chain)"]
        Seeder["ScopedDataIngestionService (Auto-Scraper & Timestamp Backfill)"]
    end

    subgraph Data["Persistence & External Services"]
        DB[("PostgreSQL 16 Database")]
        GeminiAPI["Google Gemini 2.5 REST API"]
        Zerotrac["Zerotrac Contest Elo Dataset"]
        GitHubScraper["GitHub Company Repositories"]
    end

    UI -->|REST / JSON| Controller
    Controller -->|Query Reports & Problems| DB
    Controller -->|Compute 4-Signal Scores| RankingSvc
    Controller -->|Run Topological Sort| GraphEngine
    Controller -->|Prompt Request| GeminiSvc
    GeminiSvc -->|Fallback Chain| GeminiAPI
    SyncModule -->|Sync Solved State| DB
    Seeder -->|Auto-Ingest & Backfill| DB
    Seeder -->|Fetch Elo Ratings| Zerotrac
    Seeder -->|Scrape Datasets| GitHubScraper
```

---

## 🔍 Precise Engineering Terminology Boundary

To maintain technical credibility during interviews and architecture reviews, PrepIntel explicitly separates **Deterministic Algorithms & Graph Theory** from **Generative AI LLM Services**:

| Subsystem | Underlying Engineering Mechanics | Accurate Terminology |
|---|---|---|
| **Question Confidence Engine** | 4-Signal Formula: Log-Normalized Frequency, Exponential Decay ($T_{1/2}=180\text{d}$), Verification Ratio, Shannon Entropy | **Mathematical Scoring Formula** *(Deterministic Statistics)* |
| **Topic Learning Order** | Directed Acyclic Graph (DAG) + Topological Sort + Out-Degree Unlock Counting | **Topological Graph Engine** *(Graph Algorithms)* |
| **Difficulty Calibration** | 1,980+ LeetCode Contest Elo Mappings derived from Zerotrac Data | **Objective Contest Elo Rating** *(Data Calibration)* |
| **Study Schedule Planner** | Interleaved Difficulty Distribution & Filter Allocation Algorithm | **Deterministic Schedule Planner** *(Algorithmic Allocation)* |
| **Company Overviews & Hints** | Google Gemini 2.5 REST API with 2-Tier Fallback (`flash` → `flash-lite`) | **Generative LLM AI Coach** *(Generative AI)* |

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/companies` | Returns all target companies with problem counts and OA patterns |
| `GET` | `/api/companies/{slug}/problems` | Returns frequency-ranked problems with 4-signal confidence scores |
| `GET` | `/api/companies/{slug}/stats` | Returns difficulty distribution and top topic trends |
| `POST` | `/api/companies/{slug}/personalized-graph` | Computes dynamic DAG knowledge graph with unlock values & ROI stars |
| `GET` | `/api/companies/{slug}/ai-summary` | Returns AI-generated interview focus areas & preparation overview |
| `POST` | `/api/companies/{slug}/generate-plan` | Deterministic day-by-day study roadmap generator |
| `POST` | `/api/reports` | Logs a user-submitted candidate interview report with timestamp |
| `GET` | `/api/reports/latest` | Live feed of latest candidate interview reports |
| `GET` | `/api/problems/{id}/hint` | Fetches conceptual AI hint for a problem |

---

## 🛠️ Technology Stack

| Domain | Technologies Used |
|---|---|
| **Frontend** | React 18, Tailwind CSS, Framer Motion, Lucide React, Vite |
| **Backend** | Java 17, Spring Boot 3.2, Spring Data JPA, Java Native `HttpClient` |
| **Database** | PostgreSQL 16 (Indexed foreign keys & composite indexes) |
| **AI Integration** | Google Gemini 2.5 REST API (`gemini-2.5-flash` & `gemini-2.5-flash-lite`) |
| **DevOps / Build** | Maven, PowerShell Automation, Git |

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v18+)
- Java 17+
- PostgreSQL
- Gemini API Key ([Get Free Key](https://aistudio.google.com/))

---

### 1. Database Setup
```sql
CREATE DATABASE prepintel;
```

### 2. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Set environment variables:
   ```powershell
   $env:SPRING_DATASOURCE_PASSWORD="your_postgres_password"
   $env:PREPINTEL_AI_KEY="your_gemini_api_key"
   ```
3. Run Spring Boot application:
   ```bash
   mvn spring-boot:run
   ```
   *On startup, the backend automatically seeds 84+ companies, Zerotrac Elo ratings, and 6,000+ recency-tagged reports.*

---

### 3. Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch development server:
   ```bash
   npm run dev
   ```
4. Open **`http://localhost:3000`** in your browser.

---

## 📂 Project Structure

```text
prepintel/
├── backend/
│   ├── src/main/java/com/prepintel/
│   │   ├── controller/      # REST API Controllers (JobController, SyncController)
│   │   ├── entity/          # JPA Entities (Company, Problem, InterviewReport)
│   │   ├── repository/      # Spring Data Repositories
│   │   └── service/         # InterviewReportRankingService (4-Signal Engine),
│   │                        # TopicGraphEngine (DAG Topological Sort),
│   │                        # GeminiService (AI Fallback), ScopedDataIngestionService
│   └── src/main/resources/
│       ├── application.properties
│       ├── schema.sql       # PostgreSQL DDL with Indexes
│       └── data.sql         # Base Seed Data
├── frontend/
│   ├── src/
│   │   ├── components/      # Glassmorphism UI Cards, Modals, Badges
│   │   ├── Dashboard.jsx    # Primary Intelligence & Analytics Dashboard
│   │   └── index.css        # SaaS Dark Theme Design System
└── BUG_LOG.md               # Engineering Bug Log & Solutions
```

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
