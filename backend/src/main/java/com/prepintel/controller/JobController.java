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

    private final Map<String, String> aiSummaryCache = new java.util.concurrent.ConcurrentHashMap<>();

    // 5. AI Summary for a Company
    @GetMapping("/companies/{slug}/ai-summary")
    public ResponseEntity<Map<String, String>> getAiSummary(@PathVariable String slug) {
        Company company = companyRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + slug));

        String cachedSummary = aiSummaryCache.get(slug);
        if (cachedSummary != null) {
            Map<String, String> result = new LinkedHashMap<>();
            result.put("company", company.getName());
            result.put("summary", cachedSummary);
            return ResponseEntity.ok(result);
        }

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
        aiSummaryCache.put(slug, aiResponse);

        Map<String, String> result = new LinkedHashMap<>();
        result.put("company", company.getName());
        result.put("summary", aiResponse);
        return ResponseEntity.ok(result);
    }

    // 6. Get AI Hint for a Problem
    @GetMapping("/problems/{id}/hint")
    public ResponseEntity<Map<String, String>> getProblemHint(@PathVariable Long id) {
        Problem problem = problemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        String prompt = "You are an expert technical interviewer. A student is trying to solve the LeetCode problem: '" 
                + problem.getTitle() + "' (Difficulty: " + problem.getDifficulty() + ", Topics: " + problem.getTopics() + "). "
                + "Provide a conceptual, step-by-step hint to guide them towards the optimal solution. "
                + "DO NOT provide any code. Keep it under 4 sentences. Focus on intuition. "
                + "Return a JSON response with a single field 'hint' containing your response.";

        String aiResponse = geminiService.generateContent(prompt);

        // Since Gemini returns JSON, it will be a string like {"hint": "..."}
        // We can just return it as raw string, but it's cleaner to parse it or let the frontend parse it.
        // Actually, returning a Map will double-stringify if aiResponse is already JSON string.
        // We will just let the frontend parse the JSON, so we can return it raw or extract it.
        // Let's just return a Map with the raw aiResponse, and frontend can JSON.parse it if needed.
        Map<String, String> result = new LinkedHashMap<>();
        result.put("rawResponse", aiResponse);
        return ResponseEntity.ok(result);
    }

    // 7. Generate Personalized Study Plan (algorithmic — no AI needed)
    @PostMapping("/companies/{slug}/generate-plan")
    public ResponseEntity<Map<String, Object>> generatePlan(
            @PathVariable String slug,
            @RequestBody GeneratePlanRequest request) {

        Company company = companyRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + slug));

        List<Object[]> problems = reportRepository.findProblemsByCompanyAndTimeframe(slug, "all_time");

        int days = Math.max(1, request.getDaysRemaining());
        int solved = request.getSolvedCount();
        int totalProblems = problems.size();

        // Separate by difficulty
        List<Object[]> easyProblems = new ArrayList<>();
        List<Object[]> mediumProblems = new ArrayList<>();
        List<Object[]> hardProblems = new ArrayList<>();
        Map<String, Integer> topicFrequency = new LinkedHashMap<>();

        for (Object[] row : problems) {
            Problem p = (Problem) row[0];
            String diff = p.getDifficulty();
            if ("Easy".equals(diff)) easyProblems.add(row);
            else if ("Medium".equals(diff)) mediumProblems.add(row);
            else hardProblems.add(row);

            if (p.getTopics() != null && !p.getTopics().isBlank()) {
                for (String t : p.getTopics().split(",")) {
                    String topic = t.trim();
                    if (!topic.isEmpty()) topicFrequency.merge(topic, 1, Integer::sum);
                }
            }
        }

        // Top topics sorted by frequency
        List<String> topTopics = topicFrequency.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(8)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        // Build daily plan
        // Strategy: Day 1-2 = Easy warm-up, Middle days = Medium focus, Last days = Hard + revision
        int maxProblemsPerDay = Math.max(3, Math.min(8, totalProblems / Math.max(1, days)));
        List<Map<String, Object>> dailyPlan = new ArrayList<>();

        List<Object[]> allSorted = new ArrayList<>();
        // Interleave: some easy first, then medium heavy, then hard
        int easyIdx = 0, medIdx = 0, hardIdx = 0;

        for (int day = 1; day <= days; day++) {
            Map<String, Object> dayPlan = new LinkedHashMap<>();
            dayPlan.put("day", day);

            List<Map<String, String>> dayProblems = new ArrayList<>();
            String focus;
            double hours;

            if (day <= Math.max(1, days / 5)) {
                // Early days: Easy + some Medium (warm-up)
                focus = "Warm-up — Easy fundamentals & pattern recognition";
                int easyCount = Math.min(maxProblemsPerDay / 2 + 1, easyProblems.size() - easyIdx);
                for (int i = 0; i < easyCount && easyIdx < easyProblems.size(); i++, easyIdx++) {
                    Problem p = (Problem) easyProblems.get(easyIdx)[0];
                    Map<String, String> map = new LinkedHashMap<>();
                    map.put("title", p.getTitle());
                    map.put("url", p.getUrl());
                    dayProblems.add(map);
                }
                int medCount = Math.min(maxProblemsPerDay - dayProblems.size(), mediumProblems.size() - medIdx);
                for (int i = 0; i < medCount && medIdx < mediumProblems.size(); i++, medIdx++) {
                    Problem p = (Problem) mediumProblems.get(medIdx)[0];
                    Map<String, String> map = new LinkedHashMap<>();
                    map.put("title", p.getTitle());
                    map.put("url", p.getUrl());
                    dayProblems.add(map);
                }
                hours = 1.5 + dayProblems.size() * 0.3;
            } else if (day <= Math.max(2, days * 4 / 5)) {
                // Middle days: Medium + Hard (core practice)
                focus = "Core practice — Medium problems & key patterns";
                int medCount = Math.min(maxProblemsPerDay * 2 / 3 + 1, mediumProblems.size() - medIdx);
                for (int i = 0; i < medCount && medIdx < mediumProblems.size(); i++, medIdx++) {
                    Problem p = (Problem) mediumProblems.get(medIdx)[0];
                    Map<String, String> map = new LinkedHashMap<>();
                    map.put("title", p.getTitle());
                    map.put("url", p.getUrl());
                    dayProblems.add(map);
                }
                int hardCount = Math.min(maxProblemsPerDay - dayProblems.size(), hardProblems.size() - hardIdx);
                for (int i = 0; i < hardCount && hardIdx < hardProblems.size(); i++, hardIdx++) {
                    {
                    Problem p = (Problem) hardProblems.get(hardIdx)[0];
                    Map<String, String> map = new LinkedHashMap<>();
                    map.put("title", p.getTitle());
                    map.put("url", p.getUrl());
                    dayProblems.add(map);
                }
                }
                hours = 2.0 + dayProblems.size() * 0.4;
            } else {
                // Final days: Hard problems + revision of weak areas
                focus = "Deep dive — Hard problems & revision";
                int hardCount = Math.min(maxProblemsPerDay / 2 + 1, hardProblems.size() - hardIdx);
                for (int i = 0; i < hardCount && hardIdx < hardProblems.size(); i++, hardIdx++) {
                    {
                    Problem p = (Problem) hardProblems.get(hardIdx)[0];
                    Map<String, String> map = new LinkedHashMap<>();
                    map.put("title", p.getTitle());
                    map.put("url", p.getUrl());
                    dayProblems.add(map);
                }
                }
                // Fill remaining with unseen medium
                int medCount = Math.min(maxProblemsPerDay - dayProblems.size(), mediumProblems.size() - medIdx);
                for (int i = 0; i < medCount && medIdx < mediumProblems.size(); i++, medIdx++) {
                    Problem p = (Problem) mediumProblems.get(medIdx)[0];
                    Map<String, String> map = new LinkedHashMap<>();
                    map.put("title", p.getTitle());
                    map.put("url", p.getUrl());
                    dayProblems.add(map);
                }
                hours = 2.5 + dayProblems.size() * 0.45;
            }

            if (dayProblems.isEmpty()) {
                {
                Map<String, String> map = new LinkedHashMap<>();
                map.put("title", "Review solved problems");
                map.put("url", "https://leetcode.com/");
                dayProblems.add(map);
            }
                focus = "Revision & mock interview practice";
                hours = 2.0;
            }

            dayPlan.put("focus", focus);
            dayPlan.put("problems", dayProblems);
            dayPlan.put("hours", Math.round(hours * 10.0) / 10.0);
            dailyPlan.add(dayPlan);
        }

        // Calculate readiness
        int coveredProblems = easyIdx + medIdx + hardIdx + solved;
        int readiness = Math.min(95, Math.max(30, (int) ((coveredProblems * 100.0) / Math.max(1, totalProblems))));

        // Strategy text
        String strategy = String.format(
            "Focus on the top %d most-reported problems for %s. Start with Easy problems to build momentum, " +
            "then shift to Medium-Hard. Prioritize %s and %s as they dominate recent interviews. " +
            "Aim for %d problems/day over %d days.",
            Math.min(totalProblems, 30), company.getName(),
            topTopics.size() > 0 ? topTopics.get(0) : "Arrays",
            topTopics.size() > 1 ? topTopics.get(1) : "Strings",
            maxProblemsPerDay, days
        );

        // Build response as structured JSON (not a string)
        Map<String, Object> plan = new LinkedHashMap<>();
        plan.put("dailyPlan", dailyPlan);
        plan.put("topicsToRevise", topTopics);
        plan.put("strategy", strategy);
        plan.put("readinessScore", readiness);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("company", company.getName());
        result.put("plan", plan);
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

    // 10. Get Global Problems Ranked by Frequency
    @GetMapping("/problems")
    public ResponseEntity<List<Map<String, Object>>> getGlobalProblems() {
        List<Object[]> results = reportRepository.findGlobalProblemsOrderedByReportCount();
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
            long baseConf = Math.round((count * 95.0) / maxCount);
            long conf = Math.min(98, baseConf + (maxCount > 20 ? 3 : 0));
            map.put("frequencyPercent", conf);
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // 11. Get Global Dashboard Stats (difficulty split, top topics globally)
    @GetMapping("/stats/global")
    public ResponseEntity<Map<String, Object>> getGlobalStats() {
        List<Object[]> diffDist = reportRepository.getGlobalDifficultyDistribution();
        
        long easy = 0, medium = 0, hard = 0;
        for (Object[] row : diffDist) {
            String diff = (String) row[0];
            Long count = (Long) row[1];
            if ("Easy".equals(diff)) easy = count;
            else if ("Medium".equals(diff)) medium = count;
            else if ("Hard".equals(diff)) hard = count;
        }

        // Aggregate top topics globally
        List<Problem> problems = problemRepository.findAll();
        Map<String, Integer> topicMap = new HashMap<>();
        for (Problem p : problems) {
            if (p.getTopics() != null && !p.getTopics().isBlank()) {
                for (String t : p.getTopics().split(",")) {
                    String topic = t.trim();
                    if (!topic.isEmpty()) {
                        topicMap.merge(topic, 1, Integer::sum);
                    }
                }
            }
        }

        List<Map<String, Object>> topTopics = topicMap.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(10)
                .map(entry -> {
                    Map<String, Object> tMap = new LinkedHashMap<>();
                    tMap.put("topic", entry.getKey());
                    tMap.put("count", entry.getValue());
                    return tMap;
                }).collect(Collectors.toList());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("easyCount", easy);
        response.put("mediumCount", medium);
        response.put("hardCount", hard);
        response.put("topTopics", topTopics);
        response.put("totalQuestions", problems.size());

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
