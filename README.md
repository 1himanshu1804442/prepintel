<video src="./assets/promo_video.mp4" controls="controls" width="100%"></video>

# 🎯 PrepIntel Pro — Placement Preparation Intelligence

PrepIntel Pro is a high-performance, community-driven placement preparation dashboard. It aggregates real-world interview reports to tell candidates exactly which questions are most frequently asked by **84+ top companies** (from Google and Amazon to TCS and Infosys), helping them bypass standard interview filters.

Instead of generic preparation, PrepIntel Pro helps students focus on high-yield questions by merging community reports, providing tokenless progress synchronization across three external platforms, and using a custom scheduler to slice remaining work into a day-by-day preparation calendar.

---

## ✨ Features

### 🔄 Tokenless Multi-Source Sync Engine
Check off solved problems instantly without entering passwords or dealing with complex OAuth loops. PrepIntel Pro implements a background synchronization service that maps progress from three sources:
*   **LeetCode GraphQL Sync:** Cross-references your public LeetCode profile using GraphQL to fetch recent Accepted (AC) submissions.
*   **GitHub LeetHub Scanner:** Leverages the **GitHub Git Trees API** (`/git/trees/{branch}?recursive=1`) to recursively scan public repositories (like those synced via LeetHub/LeetSync) and dynamically extract solved problem slugs.
*   **Codeforces Sync:** Queries the Codeforces API to sync solved competitive programming questions in real-time.

### 📅 Algorithmic Study Plan Generator
Enter your exam date and your daily prep hours. The backend scheduling engine:
1.  Fetches all historical interview questions for the target company.
2.  Excludes questions you have already solved (imported via Sync).
3.  Categorizes the remaining questions by difficulty (Easy, Medium, Hard).
4.  Algorithmically distributes the highest-frequency unsolved questions into a custom, day-by-day schedule returned to the frontend.

### 🧠 Gemini 2.5 Flash AI Integrations
*   **AI Company Summaries:** Feeds aggregated interview report data for a company to Gemini and returns structured JSON overviews detailing typical Online Assessment (OA) patterns, key focus areas, and recommended preparation timeframes.
*   **AI Hint Coach:** Provides conceptual, step-by-step hints on-demand for coding questions to guide users toward the optimal time complexity ($O(1)$ space/time intuition) without spoiling the actual code.

### 📊 Rich Placement Analytics & Insights
*   **Difficulty Distribution:** Clean breakdown metrics for Easy, Medium, and Hard company questions.
*   **Top Topic Trends:** Automatically computes and displays topic weights (e.g. *Dynamic Programming: 24%*, *Graphs: 18%*) across all indexed questions.
*   **Live Community Feed:** A real-time sidebar displaying recent placement reports logged by the community, complete with round tags (OA, Technical, HR) and verification badges.

---

## 🛠️ Technology Stack

*   **Frontend:** React (Vite), Tailwind CSS, Framer Motion (smooth transition physics), Lucide React (Icons).
*   **Backend:** Java Spring Boot, Spring Data JPA, Java HttpClient (asynchronous GraphQL & REST clients).
*   **Database:** PostgreSQL (with indexed foreign keys for sub-50ms query responses).
*   **AI Model:** Google Generative AI (Gemini 2.5 Flash).

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Java 17+
*   PostgreSQL
*   Gemini API Key

### Backend Configuration

1.  Create the database:
    ```sql
    CREATE DATABASE prepintel;
    ```
2.  Set the environment variables (e.g. in your OS environment, `.env`, or IDE configuration):
    ```bash
    SPRING_DATASOURCE_PASSWORD=your_db_password
    GEMINI_API_KEY=your_gemini_api_key
    ```
3.  Run the Spring Boot application. On startup, the application auto-seeds the tables (`schema.sql` and `data.sql`), loading 84+ companies, 1,980+ LeetCode rating mappings, and thousands of historical interview reports.

### Frontend Configuration

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:3000` in your browser.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is licensed under the MIT License.
