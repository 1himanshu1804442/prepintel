# 🎯 PrepIntel Pro

An AI-powered interview intelligence dashboard designed to help software engineers prepare for top tech company interviews efficiently.

![PrepIntel Pro Banner](https://img.shields.io/badge/PrepIntel-Pro-6C5CE7?style=for-the-badge&logo=react)

## ✨ Features

- **Company-Specific Insights**: Access curated lists of the most frequently asked LeetCode questions for top global tech giants (Google, Amazon, Meta, etc.) and major Indian product/service companies (Flipkart, Razorpay, TCS, etc.).
- **Smart Data Capping & Filtering**: Automatically limits problem sets to the top 400 most relevant questions per company, prioritized by recent timeframe (30 days, 3 months, etc.).
- **Gemini AI Integration**:
  - **AI Summaries**: Instantly generates an overview of a company's interview focus areas and difficulty breakdown.
  - **Personalized Study Plans**: Enter your interview date and hours per day to get a day-by-day, AI-generated preparation strategy.
- **Advanced Progress Tracking**:
  - LocalStorage-based tracking (Mark as Solved / Todo).
  - High-confidence progress rings tracking your completion against the top 250 questions.
- **Rich Analytics**:
  - Difficulty distribution charts.
  - Top topic trend percentages.
  - Frequency indicators (High / Medium / Low).
- **Live Reporting Feed**: A dynamic sidebar showing the latest community-reported questions, complete with round tags (e.g., OA) and source verification.
- **Multi-Source Data Aggregation**: The backend intelligently fetches and merges datasets from multiple popular GitHub repositories.

## 🛠️ Technology Stack

**Frontend**
- React (Vite)
- Tailwind CSS
- Framer Motion (Animations)
- Lucide React (Icons)

**Backend**
- Spring Boot (Java)
- Spring Data JPA
- PostgreSQL
- Google Generative AI (Gemini 2.5 Flash)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Java 17+
- PostgreSQL
- Gemini API Key

### Backend Setup

1. Configure your PostgreSQL database:
   ```sql
   CREATE DATABASE prepintel;
   ```
2. Set your environment variables in your IDE or terminal:
   ```bash
   SPRING_DATASOURCE_PASSWORD=your_db_password
   GEMINI_API_KEY=your_gemini_api_key
   ```
3. Run the Spring Boot application. On startup, the `DatabaseSeeder` will automatically fetch datasets from GitHub and populate your local database.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` (or the port specified by Vite) in your browser.

## 📦 Data Sources

PrepIntel automatically aggregates interview reports from highly credible, open-source repositories:
- `snehasishroy/leetcode-company-wise-problems`
- `krishnadey30/LeetCode-Questions-CompanyWise`
- `hxu296/leetcode-company-wise-problems-2022`

*Note: Some companies might display a "⚠ Limited Data" badge if insufficient data was found across all sources.*

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License

This project is licensed under the MIT License.
