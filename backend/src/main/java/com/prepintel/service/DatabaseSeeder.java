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
import java.util.List;
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

    @Override
    public void run(String... args) throws Exception {
        System.out.println("[PrepIntel Seeder] Starting database auto-seeding from GitHub...");
        
        // Map of Company Name -> GitHub slug name
        Map<String, String> companies = Map.of(
            "Google", "google",
            "Microsoft", "microsoft",
            "Amazon", "amazon",
            "Meta", "facebook",
            "Apple", "apple",
            "Netflix", "netflix",
            "Atlassian", "atlassian",
            "Autodesk", "autodesk",
            "Infosys", "infosys"
        );

        // Map of GitHub filename -> Database timeframe tag
        Map<String, String> timeframeMappings = Map.of(
            "thirty-days", "30_days",
            "three-months", "3_months",
            "six-months", "6_months",
            "one-year", "1_year",
            "all", "all_time"
        );

        for (Map.Entry<String, String> companyEntry : companies.entrySet()) {
            String companyName = companyEntry.getKey();
            String companySlug = companyEntry.getValue();

            // Create Company if not exists
            Company company = companyRepository.findBySlug(companySlug)
                    .orElseGet(() -> companyRepository.save(
                            Company.builder()
                                    .name(companyName)
                                    .slug(companySlug)
                                    .build()
                    ));

            for (Map.Entry<String, String> timeframeEntry : timeframeMappings.entrySet()) {
                String ghFilename = timeframeEntry.getKey();
                String dbTimeframe = timeframeEntry.getValue();

                String url = String.format(
                        "https://raw.githubusercontent.com/snehasishroy/leetcode-companywise-interview-questions/master/%s/%s.csv",
                        companySlug, ghFilename
                );

                try {
                    seedFromUrl(company, dbTimeframe, url);
                } catch (Exception e) {
                    // Failures like 404 (file not found) are common for missing timeframes, skip silently
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
        // Skip header line
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;

            // Split CSV ignoring commas inside quotes
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

                // Find or create Problem entity
                Problem problem = problemRepository.findByLeetcodeId(leetcodeId)
                        .orElseGet(() -> problemRepository.save(
                                Problem.builder()
                                        .leetcodeId(leetcodeId)
                                        .title(title)
                                        .titleSlug(titleSlug)
                                        .difficulty(difficulty)
                                        .acceptanceRate(acceptanceRate)
                                        .url(problemUrl)
                                        .build()
                        ));

                // Check if this pre-seeded log already exists to prevent duplicate rows on re-runs
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
