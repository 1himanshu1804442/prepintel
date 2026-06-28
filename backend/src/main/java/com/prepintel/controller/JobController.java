package com.prepintel.controller;

import com.prepintel.entity.Company;
import com.prepintel.entity.InterviewReport;
import com.prepintel.entity.Problem;
import com.prepintel.repository.CompanyRepository;
import com.prepintel.repository.InterviewReportRepository;
import com.prepintel.repository.ProblemRepository;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Allow frontend integration on local/network dev ports
public class JobController {

    private final CompanyRepository companyRepository;
    private final ProblemRepository problemRepository;
    private final InterviewReportRepository reportRepository;

    public JobController(CompanyRepository companyRepository,
                         ProblemRepository problemRepository,
                         InterviewReportRepository reportRepository) {
        this.companyRepository = companyRepository;
        this.problemRepository = problemRepository;
        this.reportRepository = reportRepository;
    }

    // 1. Get List of all Companies
    @GetMapping("/companies")
    public ResponseEntity<List<Company>> getAllCompanies() {
        return ResponseEntity.ok(companyRepository.findAll());
    }

    // 2. Get Problems by Company and Timeframe, Ranked by Frequency
    @GetMapping("/companies/{slug}/problems")
    public ResponseEntity<List<Map<String, Object>>> getProblemsByCompany(
            @PathVariable String slug,
            @RequestParam(defaultValue = "all_time") String timeframe) {
        
        List<Object[]> results = reportRepository.findProblemsByCompanyAndTimeframe(slug, timeframe);
        
        List<Map<String, Object>> response = results.stream().map(row -> {
            Problem p = (Problem) row[0];
            Long count = (Long) row[1];
            
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("leetcodeId", p.getLeetcodeId());
            map.put("title", p.getTitle());
            map.put("titleSlug", p.getTitleSlug());
            map.put("difficulty", p.getDifficulty());
            map.put("acceptanceRate", p.getAcceptanceRate());
            map.put("url", p.getUrl());
            map.put("reportCount", count);
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // 3. User Logs a Single Problem Experience
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
                        .notes(request.getNotes())
                        .build()
        );

        return ResponseEntity.ok("Successfully logged interview experience!");
    }

    // 4. Scraper Bulk API to submit parsed Reddit/External reports
    @PostMapping("/reports/bulk")
    public ResponseEntity<String> createBulkReports(@RequestBody List<BulkReportRequest> requests) {
        for (BulkReportRequest req : requests) {
            try {
                // Find or create Company dynamically
                String companySlug = req.getCompanyName().toLowerCase().replace(" ", "-");
                Company company = companyRepository.findBySlug(companySlug)
                        .orElseGet(() -> companyRepository.save(
                                Company.builder()
                                        .name(req.getCompanyName())
                                        .slug(companySlug)
                                        .build()
                        ));

                // Find or create Problem dynamically
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

                // Save report
                reportRepository.save(
                        InterviewReport.builder()
                                .company(company)
                                .problem(problem)
                                .source(req.getSource() != null ? req.getSource() : "Reddit")
                                .timeframe("all_time")
                                .notes(req.getNotes())
                                .build()
                );
            } catch (Exception e) {
                // Log and continue on single failure
                System.err.println("[PrepIntel] Failed to process bulk report: " + e.getMessage());
            }
        }
        return ResponseEntity.ok("Processed " + requests.size() + " bulk reports.");
    }

    // 5. Get recent Reddit crawler feeds
    @GetMapping("/reddit-problems")
    public ResponseEntity<List<Map<String, Object>>> getRedditProblems() {
        List<InterviewReport> reports = reportRepository.findBySourceOrderByDateReportedDesc("Reddit");
        List<Map<String, Object>> response = reports.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("companyName", r.getCompany().getName());
            map.put("problemName", r.getProblem().getTitle());
            map.put("leetcodeId", r.getProblem().getLeetcodeId());
            map.put("url", r.getProblem().getUrl());
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
        private String notes;
    }
}
