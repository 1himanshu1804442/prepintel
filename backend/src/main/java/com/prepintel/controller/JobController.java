package com.prepintel.controller;

import com.prepintel.entity.Company;
import com.prepintel.entity.InterviewReport;
import com.prepintel.entity.Problem;
import com.prepintel.repository.CompanyRepository;
import com.prepintel.repository.InterviewReportRepository;
import com.prepintel.repository.ProblemRepository;
import com.prepintel.service.GeminiService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class JobController {

    private final CompanyRepository companyRepository;
    private final ProblemRepository problemRepository;
    private final InterviewReportRepository reportRepository;
    private final GeminiService geminiService;

    public JobController(CompanyRepository companyRepository,
                         ProblemRepository problemRepository,
                         InterviewReportRepository reportRepository,
                         GeminiService geminiService) {
        this.companyRepository = companyRepository;
        this.problemRepository = problemRepository;
        this.reportRepository = reportRepository;
        this.geminiService = geminiService;
    }

    // 1. Get List of all Companies (with problem counts)
    @GetMapping("/companies")
    public ResponseEntity<List<Map<String, Object>>> getAllCompanies() {
        List<Company> companies = companyRepository.findAll();
        List<Object[]> problemCounts = reportRepository.countProblemsByCompany();
        Map<String, Long> countMap = new HashMap<>();
        for (Object[] row : problemCounts) {
            countMap.put((String) row[0], (Long) row[1]);
        }

        List<Map<String, Object>> response = companies.stream().map(c -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", c.getId());
            map.put("name", c.getName());
            map.put("slug", c.getSlug());
            map.put("oaPattern", c.getOaPattern());
            map.put("hasLimitedData", c.isHasLimitedData());
            map.put("problemCount", countMap.getOrDefault(c.getSlug(), 0L));
            return map;
        }).sorted((a, b) -> Long.compare((Long) b.get("problemCount"), (Long) a.get("problemCount")))
        .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // 2. Get Problems by Company and Timeframe, Ranked by Frequency
    @GetMapping("/companies/{slug}/problems")
    public ResponseEntity<List<Map<String, Object>>> getProblemsByCompany(
            @PathVariable String slug,
            @RequestParam(defaultValue = "all_time") String timeframe) {

        List<Object[]> results = reportRepository.findProblemsByCompanyAndTimeframe(slug, timeframe);

        // Find max report count for relative frequency
        long maxCount = results.isEmpty() ? 1 : (Long) results.get(0)[1];

        List<Map<String, Object>> response = results.stream().map(row -> {
            Problem p = (Problem) row[0];
            Long count = (Long) row[1];

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", p.getId());
            map.put("leetcodeId", p.getLeetcodeId());
            map.put("title", p.getTitle());
            map.put("titleSlug", p.getTitleSlug());
            map.put("difficulty", p.getDifficulty());
            map.put("acceptanceRate", p.getAcceptanceRate());
            map.put("url", p.getUrl());
            map.put("topics", p.getTopics());
            map.put("reportCount", count);
            // Calculate realistic confidence (cap at 98%, never 100%)
            long baseConf = Math.round((count * 95.0) / maxCount);
            long conf = Math.min(98, baseConf + (maxCount > 20 ? 3 : 0));
            map.put("frequencyPercent", conf);
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // 3. Company Dashboard Stats (difficulty distribution + topic trends)
    @GetMapping("/companies/{slug}/stats")
    public ResponseEntity<Map<String, Object>> getCompanyStats(@PathVariable String slug) {
        Map<String, Object> stats = new LinkedHashMap<>();

        // Difficulty distribution
        List<Object[]> diffDist = reportRepository.getDifficultyDistribution(slug);
        Map<String, Long> difficulty = new LinkedHashMap<>();
        for (Object[] row : diffDist) {
            difficulty.put((String) row[0], (Long) row[1]);
        }
        stats.put("difficulty", difficulty);

        // Topic trends
        List<String> topicStrings = reportRepository.getTopicsForCompany(slug);
        Map<String, Integer> topicCounts = new LinkedHashMap<>();
        for (String ts : topicStrings) {
            if (ts != null && !ts.isBlank()) {
                for (String topic : ts.split(",")) {
                    String t = topic.trim();
                    if (!t.isEmpty()) {
                        topicCounts.merge(t, 1, Integer::sum);
                    }
                }
            }
        }
        // Sort by count descending, take top 10
        List<Map<String, Object>> topTopics = topicCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(10)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("topic", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());
        stats.put("topTopics", topTopics);

        // OA Pattern
        companyRepository.findBySlug(slug).ifPresent(c -> {
            stats.put("oaPattern", c.getOaPattern());
        });

        return ResponseEntity.ok(stats);
    }

    // 4. Latest Reports Feed (live ticker)
    @GetMapping("/reports/latest")
    public ResponseEntity<List<Map<String, Object>>> getLatestReports() {
        List<InterviewReport> reports = reportRepository.findTop20ByOrderByDateReportedDesc();
        List<Map<String, Object>> response = reports.stream().map(r -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", r.getId());
            map.put("companyName", r.getCompany().getName());
            map.put("companySlug", r.getCompany().getSlug());
            map.put("problemName", r.getProblem().getTitle());
            map.put("leetcodeId", r.getProblem().getLeetcodeId());
            map.put("difficulty", r.getProblem().getDifficulty());
            map.put("url", r.getProblem().getUrl());
            map.put("round", r.getRound());
            map.put("source", r.getSource());
            map.put("notes", r.getNotes());
            map.put("dateReported", r.getDateReported());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // 5. AI Summary for a Company
    @GetMapping("/companies/{slug}/ai-summary")
    public ResponseEntity<Map<String, String>> getAiSummary(@PathVariable String slug) {
        Company company = companyRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + slug));

        List<Object[]> problems = reportRepository.findProblemsByCompanyAndTimeframe(slug, "all_time");

        StringBuilder context = new StringBuilder();
        context.append("Company: ").append(company.getName()).append("\n");
        context.append("OA Pattern: ").append(company.getOaPattern()).append("\n\n");
        context.append("Top interview questions (by frequency):\n");

        int limit = Math.min(problems.size(), 20);
        for (int i = 0; i < limit; i++) {
            Problem p = (Problem) problems.get(i)[0];
            Long count = (Long) problems.get(i)[1];
            context.append("- ").append(p.getTitle())
                    .append(" (").append(p.getDifficulty()).append(", ")
                    .append(count).append(" reports");
            if (p.getTopics() != null && !p.getTopics().isBlank()) {
                context.append(", Topics: ").append(p.getTopics());
            }
            context.append(")\n");
        }

        String prompt = context + "\n\nBased on the above interview data for " + company.getName() +
                ", provide a JSON response with these fields:\n" +
                "- focusAreas: array of 3-5 key topic areas to focus on\n" +
                "- interviewPattern: array of 2 strings summarizing the format and duration based on the OA Pattern provided (e.g. ['Aptitude + 1 Easy Coding', '90 mins total'])\n" +
                "- trendingTopics: array of 3 objects with {topic: string, trend: '↑ Rising' or '↓ Falling'} based on what seems most important\n" +
                "- difficultyBreakdown: string describing the typical difficulty distribution\n" +
                "- recommendation: string with a 2-3 sentence preparation strategy\n" +
                "- estimatedPrepDays: number of days recommended for thorough preparation\n" +
                "Keep it concise and actionable for a student preparing for placement interviews.";

        String aiResponse = geminiService.generateContent(prompt);

        Map<String, String> result = new LinkedHashMap<>();
        result.put("company", company.getName());
        result.put("summary", aiResponse);
        return ResponseEntity.ok(result);
    }

    // 6. Generate Personalized Study Plan
    @PostMapping("/companies/{slug}/generate-plan")
    public ResponseEntity<Map<String, String>> generatePlan(
            @PathVariable String slug,
            @RequestBody GeneratePlanRequest request) {

        Company company = companyRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + slug));

        List<Object[]> problems = reportRepository.findProblemsByCompanyAndTimeframe(slug, "all_time");

        StringBuilder context = new StringBuilder();
        context.append("Company: ").append(company.getName()).append("\n");
        context.append("Days until interview: ").append(request.getDaysRemaining()).append("\n");
        context.append("Problems already solved: ").append(request.getSolvedCount()).append("\n\n");
        context.append("Top interview questions:\n");

        int limit = Math.min(problems.size(), 30);
        for (int i = 0; i < limit; i++) {
            Problem p = (Problem) problems.get(i)[0];
            Long count = (Long) problems.get(i)[1];
            context.append("- ").append(p.getTitle())
                    .append(" (").append(p.getDifficulty()).append(", reported ").append(count).append("x");
            if (p.getTopics() != null && !p.getTopics().isBlank()) {
                context.append(", Topics: ").append(p.getTopics());
            }
            context.append(")\n");
        }

        String prompt = context + "\n\nGenerate a personalized study plan in JSON format with:\n" +
                "- dailyPlan: array of objects with {day: number, focus: string, problems: array of problem titles, hours: number}\n" +
                "- topicsToRevise: array of 5-8 key topics to prioritize\n" +
                "- strategy: string with an overall 2-3 sentence strategy\n" +
                "- readinessScore: estimated readiness percentage after completing this plan\n" +
                "Distribute the " + limit + " most important problems across " + request.getDaysRemaining() + " days. " +
                "Consider the student has already solved " + request.getSolvedCount() + " problems.";

        String aiResponse = geminiService.generateContent(prompt);

        Map<String, String> result = new LinkedHashMap<>();
        result.put("company", company.getName());
        result.put("plan", aiResponse);
        return ResponseEntity.ok(result);
    }

    // 7. User Logs a Single Problem Experience
    @PostMapping("/reports")
    public ResponseEntity<String> createReport(@RequestBody UserReportRequest request) {
        Company company = companyRepository.findBySlug(request.getCompanySlug())
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + request.getCompanySlug()));

        Problem problem = problemRepository.findByLeetcodeId(request.getLeetcodeId())
                .orElseThrow(() -> new IllegalArgumentException("Leetcode ID not found: " + request.getLeetcodeId()));

        reportRepository.save(
                InterviewReport.builder()
                        .company(company)
                        .problem(problem)
                        .source("User Submission")
                        .timeframe("all_time")
                        .round(request.getRound() != null ? request.getRound() : "OA")
                        .notes(request.getNotes())
                        .build()
        );

        return ResponseEntity.ok("Successfully logged interview experience!");
    }

    // 8. Scraper Bulk API to submit parsed Reddit/External reports
    @PostMapping("/reports/bulk")
    public ResponseEntity<String> createBulkReports(@RequestBody List<BulkReportRequest> requests) {
        for (BulkReportRequest req : requests) {
            try {
                String companySlug = req.getCompanyName().toLowerCase().replace(" ", "-");
                Company company = companyRepository.findBySlug(companySlug)
                        .orElseGet(() -> companyRepository.save(
                                Company.builder()
                                        .name(req.getCompanyName())
                                        .slug(companySlug)
                                        .build()
                        ));

                Problem problem = problemRepository.findByLeetcodeId(req.getLeetcodeId())
                        .orElseGet(() -> problemRepository.save(
                                Problem.builder()
                                        .leetcodeId(req.getLeetcodeId())
                                        .title(req.getProblemName())
                                        .titleSlug(req.getTitleSlug())
                                        .difficulty(req.getDifficulty())
                                        .acceptanceRate(req.getAcceptanceRate() != null ? req.getAcceptanceRate() : new BigDecimal("50.0"))
                                        .url("https://leetcode.com/problems/" + req.getTitleSlug())
                                        .build()
                        ));

                reportRepository.save(
                        InterviewReport.builder()
                                .company(company)
                                .problem(problem)
                                .source(req.getSource() != null ? req.getSource() : "Reddit")
                                .timeframe("all_time")
                                .round(req.getRound() != null ? req.getRound() : "OA")
                                .notes(req.getNotes())
                                .build()
                );
            } catch (Exception e) {
                System.err.println("[PrepIntel] Failed to process bulk report: " + e.getMessage());
            }
        }
        return ResponseEntity.ok("Processed " + requests.size() + " bulk reports.");
    }

    // 9. Get recent Reddit crawler feeds
    @GetMapping("/reddit-problems")
    public ResponseEntity<List<Map<String, Object>>> getRedditProblems() {
        List<InterviewReport> reports = reportRepository.findBySourceOrderByDateReportedDesc("Reddit");
        List<Map<String, Object>> response = reports.stream().map(r -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", r.getId());
            map.put("companyName", r.getCompany().getName());
            map.put("problemName", r.getProblem().getTitle());
            map.put("leetcodeId", r.getProblem().getLeetcodeId());
            map.put("url", r.getProblem().getUrl());
            map.put("round", r.getRound());
            map.put("notes", r.getNotes());
            map.put("dateReported", r.getDateReported());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @Data
    public static class UserReportRequest {
        private String companySlug;
        private Integer leetcodeId;
        private String round;
        private String notes;
    }

    @Data
    public static class BulkReportRequest {
        private String companyName;
        private String problemName;
        private Integer leetcodeId;
        private String titleSlug;
        private String difficulty;
        private BigDecimal acceptanceRate;
        private String source;
        private String round;
        private String notes;
    }

    @Data
    public static class GeneratePlanRequest {
        private int daysRemaining;
        private int solvedCount;
    }
}
