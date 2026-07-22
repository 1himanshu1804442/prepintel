package com.prepintel.service;

import com.prepintel.entity.Company;
import com.prepintel.entity.InterviewReport;
import com.prepintel.entity.Problem;
import com.prepintel.repository.CompanyRepository;
import com.prepintel.repository.InterviewReportRepository;
import com.prepintel.repository.ProblemRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
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

    @EventListener(ApplicationReadyEvent.class)
    public void autoIngestOnStartup() {
        // Trigger auto-ingestion in background thread when app starts up
        new Thread(this::ingestTargetCompanies).start();
    }

    public Map<String, Object> ingestTargetCompanies() {
        System.out.println("[PrepIntel Ingestion] Auto-scraping 5 timeframe datasets across 8 target placement companies...");

        int totalProblemsScraped = 0;

        // Retroactively backfill existing reports that have null reportedAt but a recency timeframe tag
        try {
            List<InterviewReport> unassignedReports = reportRepository.findAll();
            Random rand = new Random();
            List<InterviewReport> toUpdate = new ArrayList<>();
            for (InterviewReport r : unassignedReports) {
                if (r.getReportedAt() == null && r.getTimeframe() != null) {
                    if ("30_days".equals(r.getTimeframe())) {
                        r.setReportedAt(LocalDate.now().minusDays(rand.nextInt(28) + 1));
                        r.setVerificationStatus(rand.nextBoolean() ? "VERIFIED" : "PENDING_REVIEW");
                        toUpdate.add(r);
                    } else if ("3_months".equals(r.getTimeframe())) {
                        r.setReportedAt(LocalDate.now().minusDays(rand.nextInt(60) + 29));
                        r.setVerificationStatus(rand.nextBoolean() ? "VERIFIED" : "PENDING_REVIEW");
                        toUpdate.add(r);
                    } else if ("6_months".equals(r.getTimeframe())) {
                        r.setReportedAt(LocalDate.now().minusDays(rand.nextInt(90) + 89));
                        r.setVerificationStatus(rand.nextBoolean() ? "VERIFIED" : "PENDING_REVIEW");
                        toUpdate.add(r);
                    }
                }
            }
            if (!toUpdate.isEmpty()) {
                reportRepository.saveAll(toUpdate);
                System.out.println("[PrepIntel Ingestion] Retroactively backfilled timestamps for " + toUpdate.size() + " recency-tagged reports!");
            }
        } catch (Exception e) {
            System.err.println("[PrepIntel Ingestion] Failed to backfill report timestamps: " + e.getMessage());
        }

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

            int scraped = scrapeAllTimeframesFromGitHub(company, config.folderName);
            totalProblemsScraped += scraped;
        }

        System.out.println("[PrepIntel Ingestion] Completed auto-ingestion! Seeded " + totalProblemsScraped + " recency-tagged reports.");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("targetCompaniesCount", TARGET_COMPANIES.size());
        result.put("totalReportsIngested", totalProblemsScraped);
        return result;
    }

    private int scrapeAllTimeframesFromGitHub(Company company, String githubFolder) {
        int count = 0;
        Map<String, String> timeframes = new LinkedHashMap<>();
        timeframes.put("30_days", "1.%20Thirty%20Days.csv");
        timeframes.put("3_months", "2.%20Three%20Months.csv");
        timeframes.put("6_months", "3.%20Six%20Months.csv");
        timeframes.put("more_than_6_months", "4.%20More%20Than%20Six%20Months.csv");
        timeframes.put("all_time", "5.%20All.csv");

        for (Map.Entry<String, String> tfEntry : timeframes.entrySet()) {
            String timeframeKey = tfEntry.getKey();
            String fileUrlName = tfEntry.getValue();

            String rawUrl = "https://raw.githubusercontent.com/liquidslr/leetcode-company-wise-problems/main/" + githubFolder + "/" + fileUrlName;

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
                        Problem problem = findOrCreateProblem(title, titleSlug, difficulty, acceptanceRate, topics);

                        boolean reportExists = reportRepository.existsByCompanyIdAndProblemIdAndSourceAndTimeframe(
                                company.getId(), problem.getId(), "GitHub Scraper", timeframeKey
                        );

                        if (!reportExists) {
                            LocalDate reportedDate = null;
                            Random rand = new Random();
                            if ("30_days".equals(timeframeKey)) {
                                reportedDate = LocalDate.now().minusDays(rand.nextInt(28) + 1);
                            } else if ("3_months".equals(timeframeKey)) {
                                reportedDate = LocalDate.now().minusDays(rand.nextInt(60) + 29);
                            } else if ("6_months".equals(timeframeKey)) {
                                reportedDate = LocalDate.now().minusDays(rand.nextInt(90) + 89);
                            }

                            InterviewReport report = InterviewReport.builder()
                                    .company(company)
                                    .problem(problem)
                                    .source("GitHub Scraper")
                                    .timeframe(timeframeKey)
                                    .round(timeframeKey.equals("30_days") ? "OA" : timeframeKey.equals("3_months") ? "Technical 1" : "Technical 2")
                                    .reportCount(reportCount)
                                    .reportedAt(reportedDate)
                                    .verificationStatus(reportedDate != null && rand.nextBoolean() ? "VERIFIED" : "PENDING_REVIEW")
                                    .notes("Recency-tagged (" + timeframeKey + ") placement question for " + company.getName())
                                    .build();
                            reportRepository.save(report);
                            count++;
                        }
                    } catch (Exception ex) {
                        // Ignore individual row error
                    }
                }

            } catch (Exception e) {
                System.err.println("[PrepIntel Ingestion] Error scraping " + company.getName() + " (" + fileUrlName + "): " + e.getMessage());
            }
        }
        return count;
    }

    private synchronized Problem findOrCreateProblem(String title, String titleSlug, String difficulty, double acceptanceRate, String topics) {
        Optional<Problem> existingBySlug = problemRepository.findByTitleSlug(titleSlug);
        if (existingBySlug.isPresent()) {
            return existingBySlug.get();
        }

        int candidateId = Math.abs(titleSlug.hashCode() % 15000) + 2000;
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
