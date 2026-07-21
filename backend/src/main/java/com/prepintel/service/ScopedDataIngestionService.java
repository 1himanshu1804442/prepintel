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
import java.util.*;

@Service
public class ScopedDataIngestionService implements CommandLineRunner {

    private final CompanyRepository companyRepository;
    private final ProblemRepository problemRepository;
    private final InterviewReportRepository reportRepository;

    public ScopedDataIngestionService(CompanyRepository companyRepository,
                                      ProblemRepository problemRepository,
                                      InterviewReportRepository reportRepository) {
        this.companyRepository = companyRepository;
        this.problemRepository = problemRepository;
        this.reportRepository = reportRepository;
    }

    public static class TargetCompanySpec {
        public String slug;
        public String name;
        public int placementPercentage;
        public String oaPattern;
        public List<ProblemSeedSpec> problems;

        public TargetCompanySpec(String slug, String name, int placementPercentage, String oaPattern, List<ProblemSeedSpec> problems) {
            this.slug = slug;
            this.name = name;
            this.placementPercentage = placementPercentage;
            this.oaPattern = oaPattern;
            this.problems = problems;
        }
    }

    public static class ProblemSeedSpec {
        public int leetcodeId;
        public String title;
        public String titleSlug;
        public String difficulty;
        public double acceptanceRate;
        public String topics;
        public int reportCount;
        public String round;

        public ProblemSeedSpec(int leetcodeId, String title, String titleSlug, String difficulty, double acceptanceRate, String topics, int reportCount, String round) {
            this.leetcodeId = leetcodeId;
            this.title = title;
            this.titleSlug = titleSlug;
            this.difficulty = difficulty;
            this.acceptanceRate = acceptanceRate;
            this.topics = topics;
            this.reportCount = reportCount;
            this.round = round;
        }
    }

    @Override
    @Transactional
    public void run(String... args) {
        ingestTargetCompanies();
    }

    @Transactional
    public Map<String, Object> ingestTargetCompanies() {
        System.out.println("[PrepIntel Ingestion] Starting scoped tier-3 campus data ingestion...");

        List<TargetCompanySpec> targetCompanies = getTargetCompanySpecs();
        int companiesCreated = 0;
        int problemsIngested = 0;
        int reportsIngested = 0;

        for (TargetCompanySpec spec : targetCompanies) {
            Company company = companyRepository.findBySlug(spec.slug)
                    .orElseGet(() -> {
                        Company c = new Company();
                        c.setSlug(spec.slug);
                        c.setName(spec.name);
                        c.setOaPattern(spec.oaPattern);
                        c.setHasLimitedData(false);
                        return companyRepository.save(c);
                    });

            if (!cMatchesPattern(company, spec.oaPattern)) {
                company.setOaPattern(spec.oaPattern);
                companyRepository.save(company);
            }
            companiesCreated++;

            for (ProblemSeedSpec pSpec : spec.problems) {
                Problem problem = problemRepository.findByLeetcodeId(pSpec.leetcodeId)
                        .orElseGet(() -> {
                            Problem p = new Problem();
                            p.setLeetcodeId(pSpec.leetcodeId);
                            p.setTitle(pSpec.title);
                            p.setTitleSlug(pSpec.titleSlug);
                            p.setDifficulty(pSpec.difficulty);
                            p.setAcceptanceRate(BigDecimal.valueOf(pSpec.acceptanceRate));
                            p.setUrl("https://leetcode.com/problems/" + pSpec.titleSlug + "/");
                            p.setTopics(pSpec.topics);
                            return problemRepository.save(p);
                        });
                problemsIngested++;

                // Ensure interview report exists
                boolean reportExists = reportRepository.existsByCompanyIdAndProblemIdAndSourceAndTimeframe(
                        company.getId(), problem.getId(), "Campus Sourcing Engine", "all_time"
                );

                if (!reportExists) {
                    InterviewReport report = InterviewReport.builder()
                            .company(company)
                            .problem(problem)
                            .source("Campus Sourcing Engine")
                            .timeframe("all_time")
                            .round(pSpec.round)
                            .reportCount(pSpec.reportCount)
                            .notes("Fresh Tier-3 / SDE placement question sourced for " + spec.name + " (" + spec.placementPercentage + "% placement weight)")
                            .build();
                    reportRepository.save(report);
                    reportsIngested++;
                }
            }
        }

        System.out.println("[PrepIntel Ingestion] Ingestion complete! Ingested " + targetCompanies.size() + " target companies and " + problemsIngested + " problem mappings.");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("targetCompaniesCount", targetCompanies.size());
        result.put("problemsProcessed", problemsIngested);
        result.put("reportsCreated", reportsIngested);
        return result;
    }

    private boolean cMatchesPattern(Company c, String pattern) {
        return pattern.equals(c.getOaPattern());
    }

    private List<TargetCompanySpec> getTargetCompanySpecs() {
        List<TargetCompanySpec> list = new ArrayList<>();

        // 1. Infosys (21% Placements - Top Priority)
        list.add(new TargetCompanySpec(
                "infosys",
                "Infosys",
                21,
                "Infosys Specialist Programmer (SP) / DSE / System Engineer: Aptitude + 3 Coding Questions (1 Easy, 1 Medium, 1 Hard DP/Graph)",
                Arrays.asList(
                        new ProblemSeedSpec(1, "Two Sum", "two-sum", "Easy", 52.4, "Array, Hash Table", 45, "OA"),
                        new ProblemSeedSpec(9, "Palindrome Number", "palindrome-number", "Easy", 56.1, "Math", 38, "OA"),
                        new ProblemSeedSpec(13, "Roman to Integer", "roman-to-integer", "Easy", 62.0, "String, Math", 40, "OA"),
                        new ProblemSeedSpec(20, "Valid Parentheses", "valid-parentheses", "Easy", 40.5, "String, Stack", 42, "Technical"),
                        new ProblemSeedSpec(26, "Remove Duplicates from Sorted Array", "remove-duplicates-from-sorted-array", "Easy", 55.2, "Array, Two Pointers", 36, "OA"),
                        new ProblemSeedSpec(53, "Maximum Subarray", "maximum-subarray", "Medium", 50.8, "Array, Dynamic Programming", 32, "Technical"),
                        new ProblemSeedSpec(121, "Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock", "Easy", 53.9, "Array, Dynamic Programming", 41, "OA"),
                        new ProblemSeedSpec(217, "Contains Duplicate", "contains-duplicate", "Easy", 61.3, "Array, Hash Table", 35, "OA"),
                        new ProblemSeedSpec(242, "Valid Anagram", "valid-anagram", "Easy", 64.1, "String, Hash Table", 39, "OA"),
                        new ProblemSeedSpec(300, "Longest Increasing Subsequence", "longest-increasing-subsequence", "Medium", 55.4, "Array, Dynamic Programming", 28, "SP Track")
                )
        ));

        // 2. Cognizant (16% Placements)
        list.add(new TargetCompanySpec(
                "cognizant",
                "Cognizant",
                16,
                "Cognizant GenC / GenC Elevate / GenC Pro: Communication + Technical MCQs + 2 Coding Questions (Arrays, Strings, Searching)",
                Arrays.asList(
                        new ProblemSeedSpec(217, "Contains Duplicate", "contains-duplicate", "Easy", 61.3, "Array, Hash Table", 38, "OA"),
                        new ProblemSeedSpec(242, "Valid Anagram", "valid-anagram", "Easy", 64.1, "String, Hash Table", 34, "OA"),
                        new ProblemSeedSpec(283, "Move Zeroes", "move-zeroes", "Easy", 61.8, "Array, Two Pointers", 36, "OA"),
                        new ProblemSeedSpec(125, "Valid Palindrome", "valid-palindrome", "Easy", 48.2, "String, Two Pointers", 31, "OA"),
                        new ProblemSeedSpec(344, "Reverse String", "reverse-string", "Easy", 77.9, "String, Two Pointers", 40, "OA"),
                        new ProblemSeedSpec(136, "Single Number", "single-number", "Easy", 72.8, "Array, Bit Manipulation", 33, "OA"),
                        new ProblemSeedSpec(14, "Longest Common Prefix", "longest-common-prefix", "Easy", 43.1, "String", 30, "Technical"),
                        new ProblemSeedSpec(70, "Climbing Stairs", "climbing-stairs", "Easy", 52.7, "Dynamic Programming, Math", 27, "Elevate Track")
                )
        ));

        // 3. TCS (12% Placements)
        list.add(new TargetCompanySpec(
                "tcs",
                "TCS",
                12,
                "TCS NQT (Ninja / Digital / Prime): Numerical & Verbal Aptitude + 2 Coding Questions (1 Easy String/Array, 1 Medium DSA)",
                Arrays.asList(
                        new ProblemSeedSpec(9, "Palindrome Number", "palindrome-number", "Easy", 56.1, "Math", 42, "OA"),
                        new ProblemSeedSpec(13, "Roman to Integer", "roman-to-integer", "Easy", 62.0, "String, Math", 37, "OA"),
                        new ProblemSeedSpec(66, "Plus One", "plus-one", "Easy", 45.3, "Array, Math", 35, "OA"),
                        new ProblemSeedSpec(268, "Missing Number", "missing-number", "Easy", 67.2, "Array, Math, Bit Manipulation", 40, "OA"),
                        new ProblemSeedSpec(412, "Fizz Buzz", "fizz-buzz", "Easy", 72.1, "Math, String", 33, "OA"),
                        new ProblemSeedSpec(7, "Reverse Integer", "reverse-integer", "Medium", 28.5, "Math", 29, "Digital Track"),
                        new ProblemSeedSpec(48, "Rotate Image", "rotate-image", "Medium", 73.8, "Array, Matrix", 25, "Prime Track")
                )
        ));

        // 4. Accenture (13% Placements)
        list.add(new TargetCompanySpec(
                "accenture",
                "Accenture",
                13,
                "Accenture Cognitive & Technical Assessment: 90 mins total, 2 Coding Questions (String Operations, Array Manipulations)",
                Arrays.asList(
                        new ProblemSeedSpec(1, "Two Sum", "two-sum", "Easy", 52.4, "Array, Hash Table", 44, "OA"),
                        new ProblemSeedSpec(26, "Remove Duplicates from Sorted Array", "remove-duplicates-from-sorted-array", "Easy", 55.2, "Array, Two Pointers", 39, "OA"),
                        new ProblemSeedSpec(88, "Merge Sorted Array", "merge-sorted-array", "Easy", 50.1, "Array, Two Pointers, Sorting", 37, "OA"),
                        new ProblemSeedSpec(121, "Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock", "Easy", 53.9, "Array, Dynamic Programming", 35, "Technical"),
                        new ProblemSeedSpec(283, "Move Zeroes", "move-zeroes", "Easy", 61.8, "Array, Two Pointers", 38, "OA"),
                        new ProblemSeedSpec(387, "First Unique Character in a String", "first-unique-character-in-a-string", "Easy", 61.0, "String, Hash Table", 32, "OA")
                )
        ));

        // 5. HCL Technologies (9% Placements)
        list.add(new TargetCompanySpec(
                "hcltech",
                "HCL Technologies",
                9,
                "HCL Tech Firstnique Assessment: Aptitude + Pseudocode + 2 Easy-Medium Coding Questions (Arrays, Searching, Strings)",
                Arrays.asList(
                        new ProblemSeedSpec(26, "Remove Duplicates from Sorted Array", "remove-duplicates-from-sorted-array", "Easy", 55.2, "Array, Two Pointers", 31, "OA"),
                        new ProblemSeedSpec(27, "Remove Element", "remove-element", "Easy", 56.8, "Array, Two Pointers", 33, "OA"),
                        new ProblemSeedSpec(35, "Search Insert Position", "search-insert-position", "Easy", 46.2, "Array, Binary Search", 30, "OA"),
                        new ProblemSeedSpec(169, "Majority Element", "majority-element", "Easy", 65.0, "Array, Hash Table, Counting", 28, "Technical"),
                        new ProblemSeedSpec(217, "Contains Duplicate", "contains-duplicate", "Easy", 61.3, "Array, Hash Table", 32, "OA")
                )
        ));

        // 6. Wipro
        list.add(new TargetCompanySpec(
                "wipro",
                "Wipro",
                8,
                "Wipro NLTH / Elite / Turbo: Aptitude + Essay + 2 Coding Questions (Basic Data Structures & Control Flow)",
                Arrays.asList(
                        new ProblemSeedSpec(9, "Palindrome Number", "palindrome-number", "Easy", 56.1, "Math", 36, "OA"),
                        new ProblemSeedSpec(125, "Valid Palindrome", "valid-palindrome", "Easy", 48.2, "String, Two Pointers", 32, "OA"),
                        new ProblemSeedSpec(268, "Missing Number", "missing-number", "Easy", 67.2, "Array, Math", 34, "OA"),
                        new ProblemSeedSpec(344, "Reverse String", "reverse-string", "Easy", 77.9, "String, Two Pointers", 37, "OA"),
                        new ProblemSeedSpec(58, "Length of Last Word", "length-of-last-word", "Easy", 51.5, "String", 29, "OA")
                )
        ));

        // 7. Capgemini
        list.add(new TargetCompanySpec(
                "capgemini",
                "Capgemini",
                7,
                "Capgemini Excellence Assessment: Pseudocode + Game-based Aptitude + 2 Coding Questions (String/Array Traversal)",
                Arrays.asList(
                        new ProblemSeedSpec(1, "Two Sum", "two-sum", "Easy", 52.4, "Array, Hash Table", 39, "OA"),
                        new ProblemSeedSpec(20, "Valid Parentheses", "valid-parentheses", "Easy", 40.5, "String, Stack", 35, "OA"),
                        new ProblemSeedSpec(217, "Contains Duplicate", "contains-duplicate", "Easy", 61.3, "Array, Hash Table", 31, "OA"),
                        new ProblemSeedSpec(242, "Valid Anagram", "valid-anagram", "Easy", 64.1, "String, Hash Table", 33, "OA"),
                        new ProblemSeedSpec(283, "Move Zeroes", "move-zeroes", "Easy", 61.8, "Array, Two Pointers", 30, "Technical")
                )
        ));

        // 8. Amazon (High SDE Depth Priority)
        list.add(new TargetCompanySpec(
                "amazon",
                "Amazon",
                15,
                "Amazon SDE-1 OA: 2 Coding Questions (1 Medium + 1 Hard) + Work Style Assessment & Leadership Principles",
                Arrays.asList(
                        new ProblemSeedSpec(1, "Two Sum", "two-sum", "Easy", 52.4, "Array, Hash Table", 50, "OA"),
                        new ProblemSeedSpec(3, "Longest Substring Without Repeating Characters", "longest-substring-without-repeating-characters", "Medium", 35.1, "String, Sliding Window, Hash Table", 48, "OA"),
                        new ProblemSeedSpec(5, "Longest Palindromic Substring", "longest-palindromic-substring", "Medium", 34.2, "String, Dynamic Programming", 44, "OA"),
                        new ProblemSeedSpec(11, "Container With Most Water", "container-with-most-water", "Medium", 55.4, "Array, Two Pointers, Greedy", 46, "Technical"),
                        new ProblemSeedSpec(15, "3Sum", "3sum", "Medium", 34.8, "Array, Two Pointers, Sorting", 47, "OA"),
                        new ProblemSeedSpec(33, "Search in Rotated Sorted Array", "search-in-rotated-sorted-array", "Medium", 40.9, "Array, Binary Search", 42, "Technical"),
                        new ProblemSeedSpec(49, "Group Anagrams", "group-anagrams", "Medium", 68.2, "Array, Hash Table, String, Sorting", 45, "OA"),
                        new ProblemSeedSpec(53, "Maximum Subarray", "maximum-subarray", "Medium", 50.8, "Array, Dynamic Programming", 43, "OA"),
                        new ProblemSeedSpec(56, "Merge Intervals", "merge-intervals", "Medium", 47.5, "Array, Sorting", 49, "OA"),
                        new ProblemSeedSpec(200, "Number of Islands", "number-of-islands", "Medium", 59.1, "Array, Depth-First Search, Breadth-First Search, Graph", 50, "Technical")
                )
        ));

        return list;
    }
}
