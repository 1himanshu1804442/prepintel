package com.prepintel.service;

import com.prepintel.entity.Company;
import com.prepintel.entity.InterviewReport;
import com.prepintel.entity.Problem;
import com.prepintel.repository.CompanyRepository;
import com.prepintel.repository.InterviewReportRepository;
import com.prepintel.repository.ProblemRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;

@Service
public class ScopedDataIngestionService {

    private final CompanyRepository companyRepository;
    private final ProblemRepository problemRepository;
    private final InterviewReportRepository reportRepository;
    private final HttpClient httpClient;

    private static final Map<String, CompanyConfig> TARGET_COMPANIES = new LinkedHashMap<>();

    static {
        TARGET_COMPANIES.put("infosys", new CompanyConfig("Infosys", "Infosys", 21, "Infosys Specialist Programmer (SP) / DSE / SE: Aptitude + 3 Coding Questions (Easy/Med/Hard DP)"));
        TARGET_COMPANIES.put("cognizant", new CompanyConfig("Cognizant", "Cognizant", 16, "Cognizant GenC / GenC Elevate / GenC Pro: Technical MCQs + 2 Coding Questions (Arrays, Strings)"));
        TARGET_COMPANIES.put("tcs", new CompanyConfig("tcs", "TCS", 12, "TCS NQT Ninja / Digital / Prime: Verbal & Numerical + 2 Coding Questions (1 Easy, 1 Medium)"));
        TARGET_COMPANIES.put("accenture", new CompanyConfig("Accenture", "Accenture", 13, "Accenture Cognitive Assessment: 90 mins total, 2 Coding Questions (Arrays & Strings)"));
        TARGET_COMPANIES.put("hcltech", new CompanyConfig("HCL", "HCL Technologies", 9, "HCL Tech Firstnique Assessment: Aptitude + Pseudocode + 2 Easy-Medium Coding Questions"));
        TARGET_COMPANIES.put("wipro", new CompanyConfig("Wipro", "Wipro", 8, "Wipro NLTH / Elite / Turbo: Aptitude + Essay + 2 Coding Questions (Control Flow & Data Structures)"));
        TARGET_COMPANIES.put("capgemini", new CompanyConfig("Capgemini", "Capgemini", 7, "Capgemini Excellence Assessment: Pseudocode + Game-based Aptitude + 2 Coding Questions"));
        TARGET_COMPANIES.put("amazon", new CompanyConfig("Amazon", "Amazon", 15, "Amazon SDE-1 OA: 2 Coding Questions (1 Medium + 1 Hard) + Leadership Principles"));
    }

    public static class CompanyConfig {
        public String folderName;
        public String displayName;
        public int placementWeight;
        public String oaPattern;

        public CompanyConfig(String folderName, String displayName, int placementWeight, String oaPattern) {
            this.folderName = folderName;
            this.displayName = displayName;
            this.placementWeight = placementWeight;
            this.oaPattern = oaPattern;
        }
    }

    public ScopedDataIngestionService(CompanyRepository companyRepository,
                                      ProblemRepository problemRepository,
                                      InterviewReportRepository reportRepository) {
        this.companyRepository = companyRepository;
        this.problemRepository = problemRepository;
        this.reportRepository = reportRepository;
        this.httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();
    }

    public Map<String, Object> ingestTargetCompanies() {
        System.out.println("[PrepIntel Ingestion] Live scraping 8 target tier-3 placement companies from GitHub datasets...");

        int totalProblemsScraped = 0;
        int totalReportsCreated = 0;

        for (Map.Entry<String, CompanyConfig> entry : TARGET_COMPANIES.entrySet()) {
            String slug = entry.getKey();
            CompanyConfig config = entry.getValue();

            Company company = companyRepository.findBySlug(slug)
                    .orElseGet(() -> {
                        Company c = new Company();
                        c.setSlug(slug);
                        c.setName(config.displayName);
                        c.setOaPattern(config.oaPattern);
                        c.setHasLimitedData(false);
                        return companyRepository.save(c);
                    });

            if (!config.oaPattern.equals(company.getOaPattern())) {
                company.setOaPattern(config.oaPattern);
                companyRepository.save(company);
            }

            // Scrape GitHub Live CSVs
            int scraped = scrapeCompanyFromGitHub(company, config.folderName);
            totalProblemsScraped += scraped;
        }

        System.out.println("[PrepIntel Ingestion] Ingestion complete! Scraped & seeded " + totalProblemsScraped + " question mappings across 8 target companies.");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("targetCompaniesCount", TARGET_COMPANIES.size());
        result.put("totalScrapedProblems", totalProblemsScraped);
        return result;
    }

    private int scrapeCompanyFromGitHub(Company company, String githubFolder) {
        int count = 0;
        String[] timeframes = {"1.%20Thirty%20Days.csv", "5.%20All.csv"};

        for (String file : timeframes) {
            String timeframeKey = file.contains("Thirty") ? "30_days" : "all_time";
            String rawUrl = "https://raw.githubusercontent.com/liquidslr/leetcode-company-wise-problems/main/" + githubFolder + "/" + file;

            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(rawUrl))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200) {
                    continue;
                }

                String[] lines = response.body().split("\n");
                if (lines.length <= 1) continue;

                for (int i = 1; i < lines.length; i++) {
                    String line = lines[i].trim();
                    if (line.isEmpty()) continue;

                    List<String> cols = parseCsvLine(line);
                    if (cols.size() < 5) continue;

                    String diffStr = cols.get(0).trim().toUpperCase();
                    String title = cols.get(1).trim();
                    String freqStr = cols.get(2).trim();
                    String accStr = cols.get(3).trim();
                    String link = cols.get(4).trim();
                    String topics = cols.size() > 5 ? cols.get(cols.size() > 6 ? 5 : cols.size() - 1).trim() : "";

                    if (title.isEmpty() || link.isEmpty()) continue;

                    String titleSlug = extractSlugFromLink(link, title);
                    String difficulty = formatDifficulty(diffStr);
                    double acceptanceRate = parseDouble(accStr, 50.0);
                    int reportCount = Math.max(1, (int) Math.round(parseDouble(freqStr, 10.0)));

                    try {
                        // Find or create Problem with unique LeetCode ID handling
                        Problem problem = findOrCreateProblem(title, titleSlug, difficulty, acceptanceRate, topics);

                        // Save InterviewReport
                        boolean reportExists = reportRepository.existsByCompanyIdAndProblemIdAndSourceAndTimeframe(
                                company.getId(), problem.getId(), "GitHub Scraper", timeframeKey
                        );

                        if (!reportExists) {
                            InterviewReport report = InterviewReport.builder()
                                    .company(company)
                                    .problem(problem)
                                    .source("GitHub Scraper")
                                    .timeframe(timeframeKey)
                                    .round(timeframeKey.equals("30_days") ? "OA" : "Technical")
                                    .reportCount(reportCount)
                                    .notes("Live GitHub scraped placement question for " + company.getName())
                                    .build();
                            reportRepository.save(report);
                            count++;
                        }
                    } catch (Exception ex) {
                        // Ignore individual row error and continue parsing next line
                    }
                }

            } catch (Exception e) {
                System.err.println("[PrepIntel Ingestion] Error scraping " + company.getName() + " (" + file + "): " + e.getMessage());
            }
        }
        return count;
    }

    private synchronized Problem findOrCreateProblem(String title, String titleSlug, String difficulty, double acceptanceRate, String topics) {
        Optional<Problem> existingBySlug = problemRepository.findByTitleSlug(titleSlug);
        if (existingBySlug.isPresent()) {
            return existingBySlug.get();
        }

        // Generate unique Leetcode ID
        int baseId = Math.abs(titleSlug.hashCode() % 15000) + 2000;
        int candidateId = baseId;
        while (problemRepository.findByLeetcodeId(candidateId).isPresent()) {
            candidateId++;
        }

        Problem p = new Problem();
        p.setLeetcodeId(candidateId);
        p.setTitle(title);
        p.setTitleSlug(titleSlug);
        p.setDifficulty(difficulty);
        p.setAcceptanceRate(BigDecimal.valueOf(acceptanceRate));
        p.setUrl("https://leetcode.com/problems/" + titleSlug + "/");
        p.setTopics(topics.isEmpty() ? DatabaseSeeder.generateTopicsForProblem(candidateId, title) : topics);

        return problemRepository.save(p);
    }

    private String extractSlugFromLink(String link, String fallbackTitle) {
        if (link.endsWith("/")) {
            link = link.substring(0, link.length() - 1);
        }
        int lastSlash = link.lastIndexOf('/');
        if (lastSlash >= 0 && lastSlash < link.length() - 1) {
            return link.substring(lastSlash + 1).toLowerCase();
        }
        return fallbackTitle.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }

    private String formatDifficulty(String diff) {
        if (diff.contains("EASY")) return "Easy";
        if (diff.contains("HARD")) return "Hard";
        return "Medium";
    }

    private double parseDouble(String str, double defaultVal) {
        try {
            double v = Double.parseDouble(str);
            if (v < 1.0 && v > 0.0) v = v * 100.0;
            return Math.round(v * 10.0) / 10.0;
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private List<String> parseCsvLine(String line) {
        List<String> result = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder sb = new StringBuilder();

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                result.add(sb.toString());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        result.add(sb.toString());
        return result;
    }
}
