package com.prepintel.service;

import com.prepintel.entity.Company;
import com.prepintel.entity.InterviewReport;
import com.prepintel.entity.Problem;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InterviewReportRankingServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 7, 21);

    @Test
    void treatsOverlappingLegacyBucketsAsOneHistoricalEvidenceSource() {
        Company company = company(1L);
        Problem problem = problem(10L, "Two Sum");

        List<InterviewReport> reports = List.of(
                legacy(company, problem, "30_days", 7),
                legacy(company, problem, "3_months", 11),
                legacy(company, problem, "6_months", 9),
                legacy(company, problem, "all_time", 14)
        );

        List<InterviewReportRankingService.RankedProblem> allTime =
                InterviewReportRankingService.rank(reports, "all_time", "all", TODAY);

        assertEquals(1, allTime.size());
        assertEquals(14, allTime.get(0).reportCount(), "use the strongest aggregate instead of summing nested buckets");
        assertEquals("Historical data; interview date unverified", allTime.get(0).dataFreshnessLabel());
        assertTrue(InterviewReportRankingService.rank(reports, "30_days", "all", TODAY).isEmpty(),
                "undated legacy data must never be shown as recent");
    }

    @Test
    void favorsRecentVerifiedEvidenceAndReturnsFreshnessMetadata() {
        Company company = company(1L);
        Problem recentProblem = problem(10L, "Recent Graph");
        Problem historicalProblem = problem(20L, "Historical Array");

        InterviewReport recent = dated(company, recentProblem, TODAY.minusDays(10), "DSE", "VERIFIED", 2);
        InterviewReport historical = dated(company, historicalProblem, TODAY.minusDays(180), "DSE", "VERIFIED", 5);

        List<InterviewReportRankingService.RankedProblem> results =
                InterviewReportRankingService.rank(List.of(historical, recent), "all_time", "DSE", TODAY);

        assertEquals(recentProblem.getId(), results.get(0).problem().getId());
        assertEquals(2, results.get(0).recentReportCount());
        assertEquals(TODAY.minusDays(10), results.get(0).lastVerifiedAt());
        assertEquals("Verified in the last 30 days", results.get(0).dataFreshnessLabel());
    }

    @Test
    void filtersByExactRoleAndObservedDate() {
        Company company = company(1L);
        Problem dseProblem = problem(10L, "DSE Problem");
        Problem spProblem = problem(20L, "SP Problem");

        InterviewReport dseRecent = dated(company, dseProblem, TODAY.minusDays(20), "DSE", "PENDING_REVIEW", 1);
        InterviewReport spRecent = dated(company, spProblem, TODAY.minusDays(20), "SP", "PENDING_REVIEW", 1);

        List<InterviewReportRankingService.RankedProblem> results =
                InterviewReportRankingService.rank(List.of(dseRecent, spRecent), "30_days", "dse", TODAY);

        assertEquals(1, results.size());
        assertEquals(dseProblem.getId(), results.get(0).problem().getId());
        assertEquals("Community-reported; pending verification", results.get(0).dataFreshnessLabel());
    }

    private static Company company(Long id) {
        Company company = Company.builder().name("Infosys").slug("infosys").build();
        company.setId(id);
        return company;
    }

    private static Problem problem(Long id, String title) {
        Problem problem = Problem.builder()
                .leetcodeId(id.intValue())
                .title(title)
                .titleSlug(title.toLowerCase().replace(' ', '-'))
                .difficulty("Medium")
                .build();
        problem.setId(id);
        return problem;
    }

    private static InterviewReport legacy(Company company, Problem problem, String timeframe, int count) {
        return InterviewReport.builder()
                .company(company)
                .problem(problem)
                .source("GitHub Scraper")
                .timeframe(timeframe)
                .round("OA")
                .role("Unknown")
                .reportCount(count)
                .build();
    }

    private static InterviewReport dated(Company company, Problem problem, LocalDate reportedAt,
                                         String role, String verificationStatus, int count) {
        return InterviewReport.builder()
                .company(company)
                .problem(problem)
                .source("Candidate Report")
                .timeframe("all_time")
                .round("OA")
                .role(role)
                .reportedAt(reportedAt)
                .verificationStatus(verificationStatus)
                .reportCount(count)
                .build();
    }
}
