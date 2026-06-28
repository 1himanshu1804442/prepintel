package com.prepintel.service;

import com.prepintel.entity.Company;
import com.prepintel.entity.InterviewReport;
import com.prepintel.entity.Problem;
import com.prepintel.repository.CompanyRepository;
import com.prepintel.repository.InterviewReportRepository;
import com.prepintel.repository.ProblemRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class DatabaseSeeder implements CommandLineRunner {

    private final CompanyRepository companyRepository;
    private final ProblemRepository problemRepository;
    private final InterviewReportRepository reportRepository;
    private final HttpClient httpClient;

    public DatabaseSeeder(CompanyRepository companyRepository,
                          ProblemRepository problemRepository,
                          InterviewReportRepository reportRepository) {
        this.companyRepository = companyRepository;
        this.problemRepository = problemRepository;
        this.reportRepository = reportRepository;
        this.httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();
    }

    // Company slug -> Display Name
    private static final Map<String, String> COMPANIES = new LinkedHashMap<>();
    // Company slug -> OA Pattern description
    private static final Map<String, String> OA_PATTERNS = new LinkedHashMap<>();

    static {
        // Global Tech Giants
        COMPANIES.put("google", "Google");
        COMPANIES.put("microsoft", "Microsoft");
        COMPANIES.put("amazon", "Amazon");
        COMPANIES.put("facebook", "Meta");
        COMPANIES.put("apple", "Apple");
        COMPANIES.put("netflix", "Netflix");
        COMPANIES.put("atlassian", "Atlassian");
        COMPANIES.put("autodesk", "Autodesk");
        COMPANIES.put("adobe", "Adobe");
        COMPANIES.put("uber", "Uber");
        COMPANIES.put("bloomberg", "Bloomberg");
        // Indian Product Companies
        COMPANIES.put("flipkart", "Flipkart");
        COMPANIES.put("paytm", "Paytm");
        COMPANIES.put("meesho", "Meesho");
        COMPANIES.put("cred", "CRED");
        COMPANIES.put("razorpay", "Razorpay");
        // Indian Service Companies
        COMPANIES.put("infosys", "Infosys");
        COMPANIES.put("tcs", "TCS");
        COMPANIES.put("wipro", "Wipro");
        COMPANIES.put("cognizant", "Cognizant");

        // OA Patterns
        OA_PATTERNS.put("google", "DSA-Heavy OA: 2 Hard Coding (45 min each), Focus on Graphs & DP");
        OA_PATTERNS.put("microsoft", "2 Medium Coding + 1 System Design MCQ, 90 min total");
        OA_PATTERNS.put("amazon", "DSA-Heavy OA: 2 Coding (1 Medium + 1 Hard) + Leadership Principles");
        OA_PATTERNS.put("facebook", "2 Hard Coding (45 min each), Heavy on Trees & Graphs");
        OA_PATTERNS.put("apple", "Phone Screen + 2 Medium-Hard Coding, Focus on Arrays & Strings");
        OA_PATTERNS.put("netflix", "System Design focused, 1 Coding + Architecture Discussion");
        OA_PATTERNS.put("atlassian", "Values-based screening + 2 Medium Coding, Team collaboration focus");
        OA_PATTERNS.put("autodesk", "2 Medium Coding + 1 MCQ round, Focus on Linked Lists & Arrays");
        OA_PATTERNS.put("adobe", "3 Coding rounds (Easy-Medium-Hard), Math & DP heavy");
        OA_PATTERNS.put("uber", "2 Hard Coding + System Design, Graph algorithms & optimization");
        OA_PATTERNS.put("bloomberg", "Phone screen + 2 Medium Coding, Focus on Data Structures");
        OA_PATTERNS.put("flipkart", "DSA-Heavy OA: 2 Hard Coding (60 min), DP & Graph focus");
        OA_PATTERNS.put("paytm", "2 Medium Coding + Aptitude MCQs, Focus on Arrays & Math");
        OA_PATTERNS.put("meesho", "2 Medium-Hard Coding, Focus on Greedy & Two Pointers");
        OA_PATTERNS.put("cred", "Take-home assignment + 2 Medium Coding, Full-stack focus");
        OA_PATTERNS.put("razorpay", "2 Coding (Medium-Hard) + System Design basics");
        OA_PATTERNS.put("infosys", "Aptitude + Technical MCQs + 1 Easy-Medium Coding, SP track harder");
        OA_PATTERNS.put("tcs", "Aptitude + Verbal + 1 Easy Coding (C/Java/Python)");
        OA_PATTERNS.put("wipro", "Aptitude + Technical MCQs + 1 Easy Coding, English test");
        OA_PATTERNS.put("cognizant", "Aptitude + 1 Easy Coding + Technical MCQs, GenC track");
    }

    // Approximate topic mappings for well-known LeetCode IDs
    private static final Map<Integer, String> TOPIC_MAP = new LinkedHashMap<>();
    static {
        TOPIC_MAP.put(1, "Array, Hash Table");
        TOPIC_MAP.put(2, "Linked List, Math");
        TOPIC_MAP.put(3, "String, Sliding Window, Hash Table");
        TOPIC_MAP.put(4, "Array, Binary Search, Divide and Conquer");
        TOPIC_MAP.put(5, "String, Dynamic Programming");
        TOPIC_MAP.put(9, "Math");
        TOPIC_MAP.put(11, "Array, Two Pointers, Greedy");
        TOPIC_MAP.put(13, "String, Math");
        TOPIC_MAP.put(15, "Array, Two Pointers, Sorting");
        TOPIC_MAP.put(20, "String, Stack");
        TOPIC_MAP.put(21, "Linked List, Recursion");
        TOPIC_MAP.put(25, "Linked List, Recursion");
        TOPIC_MAP.put(26, "Array, Two Pointers");
        TOPIC_MAP.put(27, "Array, Two Pointers");
        TOPIC_MAP.put(31, "Array, Two Pointers");
        TOPIC_MAP.put(33, "Array, Binary Search");
        TOPIC_MAP.put(36, "Array, Hash Table, Matrix");
        TOPIC_MAP.put(46, "Array, Backtracking");
        TOPIC_MAP.put(49, "Array, Hash Table, String, Sorting");
        TOPIC_MAP.put(53, "Array, Divide and Conquer, DP");
        TOPIC_MAP.put(54, "Array, Matrix, Simulation");
        TOPIC_MAP.put(56, "Array, Sorting");
        TOPIC_MAP.put(68, "Array, String, Simulation");
        TOPIC_MAP.put(72, "String, Dynamic Programming");
        TOPIC_MAP.put(73, "Array, Hash Table, Matrix");
        TOPIC_MAP.put(75, "Array, Two Pointers, Sorting");
        TOPIC_MAP.put(88, "Array, Two Pointers, Sorting");
        TOPIC_MAP.put(121, "Array, Dynamic Programming");
        TOPIC_MAP.put(128, "Array, Hash Table, Union Find");
        TOPIC_MAP.put(139, "String, Dynamic Programming, Trie");
        TOPIC_MAP.put(141, "Linked List, Two Pointers");
        TOPIC_MAP.put(142, "Linked List, Two Pointers");
        TOPIC_MAP.put(146, "Hash Table, Linked List, Design");
        TOPIC_MAP.put(169, "Array, Hash Table, Divide and Conquer");
        TOPIC_MAP.put(175, "Database, SQL");
        TOPIC_MAP.put(200, "Array, BFS, DFS, Matrix, Union Find");
        TOPIC_MAP.put(204, "Array, Math, Number Theory");
        TOPIC_MAP.put(215, "Array, Sorting, Heap");
        TOPIC_MAP.put(238, "Array, Prefix Sum");
        TOPIC_MAP.put(239, "Array, Queue, Sliding Window, Heap");
        TOPIC_MAP.put(287, "Array, Two Pointers, Binary Search");
        TOPIC_MAP.put(300, "Array, Binary Search, DP");
        TOPIC_MAP.put(322, "Array, Dynamic Programming, BFS");
        TOPIC_MAP.put(344, "String, Two Pointers");
        TOPIC_MAP.put(347, "Array, Hash Table, Sorting, Heap");
        TOPIC_MAP.put(390, "Math, Recursion");
        TOPIC_MAP.put(485, "Array");
        TOPIC_MAP.put(560, "Array, Hash Table, Prefix Sum");
        TOPIC_MAP.put(875, "Array, Binary Search");
        TOPIC_MAP.put(876, "Linked List, Two Pointers");
        TOPIC_MAP.put(977, "Array, Two Pointers, Sorting");
    }

    private static final Map<String, String> TIMEFRAME_MAPPINGS = Map.of(
        "thirty-days", "30_days",
        "three-months", "3_months",
        "six-months", "6_months",
        "one-year", "1_year",
        "all", "all_time"
    );

    @Override
    public void run(String... args) throws Exception {
        System.out.println("[PrepIntel Seeder] Starting database auto-seeding...");

        // 1. Create all companies with OA patterns
        for (Map.Entry<String, String> entry : COMPANIES.entrySet()) {
            String slug = entry.getKey();
            String name = entry.getValue();
            String oaPattern = OA_PATTERNS.getOrDefault(slug, "Unknown");

            Optional<Company> existing = companyRepository.findBySlug(slug);
            if (existing.isEmpty()) {
                companyRepository.save(
                    Company.builder()
                        .name(name)
                        .slug(slug)
                        .oaPattern(oaPattern)
                        .build()
                );
            }
        }

        // 2. Seed from GitHub CSVs (only for companies that have datasets)
        String[] seededSlugs = {"google", "microsoft", "amazon", "facebook", "apple", "netflix",
            "atlassian", "autodesk", "adobe", "uber", "bloomberg",
            "flipkart", "infosys"};

        for (String companySlug : seededSlugs) {
            Company company = companyRepository.findBySlug(companySlug).orElse(null);
            if (company == null) continue;

            for (Map.Entry<String, String> tf : TIMEFRAME_MAPPINGS.entrySet()) {
                String ghFilename = tf.getKey();
                String dbTimeframe = tf.getValue();

                String url = String.format(
                    "https://raw.githubusercontent.com/snehasishroy/leetcode-companywise-interview-questions/master/%s/%s.csv",
                    companySlug, ghFilename
                );

                try {
                    seedFromUrl(company, dbTimeframe, url);
                } catch (Exception e) {
                    // 404 or parse failures are expected for missing timeframes
                }
            }
        }

        System.out.println("[PrepIntel Seeder] Database auto-seeding completed!");
    }

    @Transactional
    public void seedFromUrl(Company company, String dbTimeframe, String urlString) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(urlString))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("HTTP Status " + response.statusCode());
        }

        String[] lines = response.body().split("\n");
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;

            String[] cols = line.split(",(?=([^\"]*\"[^\"]*\")*[^\"]*$)");
            if (cols.length < 5) continue;

            try {
                Integer leetcodeId = Integer.parseInt(cols[0].trim());
                String problemUrl = cols[1].replace("\"", "").trim();
                String title = cols[2].replace("\"", "").trim();
                String difficulty = cols[3].replace("\"", "").trim();

                String acceptRaw = cols[4].replace("\"", "").replace("%", "").trim();
                BigDecimal acceptanceRate = new BigDecimal(acceptRaw);

                String titleSlug = problemUrl.substring(problemUrl.lastIndexOf("/") + 1);
                String topics = TOPIC_MAP.getOrDefault(leetcodeId, "");

                Problem problem = problemRepository.findByLeetcodeId(leetcodeId)
                        .orElseGet(() -> problemRepository.save(
                                Problem.builder()
                                        .leetcodeId(leetcodeId)
                                        .title(title)
                                        .titleSlug(titleSlug)
                                        .difficulty(difficulty)
                                        .acceptanceRate(acceptanceRate)
                                        .url(problemUrl)
                                        .topics(topics)
                                        .build()
                        ));

                boolean exists = reportRepository.existsByCompanyIdAndProblemIdAndSourceAndTimeframe(
                        company.getId(), problem.getId(), "Pre-seeded", dbTimeframe
                );

                if (!exists) {
                    reportRepository.save(
                            InterviewReport.builder()
                                    .company(company)
                                    .problem(problem)
                                    .source("Pre-seeded")
                                    .timeframe(dbTimeframe)
                                    .round("OA")
                                    .notes("Imported from LeetCode standard datasets.")
                                    .build()
                    );
                }

            } catch (Exception ex) {
                // Skip malformed rows
            }
        }
    }
}
