package com.prepintel.repository;

import com.prepintel.entity.InterviewReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewReportRepository extends JpaRepository<InterviewReport, Long> {

    @Query("SELECT r.problem, SUM(r.reportCount) FROM InterviewReport r " +
           "WHERE r.company.slug = :companySlug AND (" +
           "  (:timeframe = 'all_time' AND (r.timeframe = 'all_time' OR NOT EXISTS (SELECT 1 FROM InterviewReport r2 WHERE r2.company.id = r.company.id AND r2.problem.id = r.problem.id AND r2.timeframe = 'all_time'))) OR " +
           "  (:timeframe <> 'all_time' AND (" +
           "    r.timeframe = :timeframe OR " +
           "    (:timeframe = '3_months' AND r.timeframe = '30_days') OR " +
           "    (:timeframe = '6_months' AND (r.timeframe = '30_days' OR r.timeframe = '3_months')) OR " +
           "    (:timeframe = '1_year' AND (r.timeframe = '30_days' OR r.timeframe = '3_months' OR r.timeframe = '6_months'))" +
           "  ))" +
           ") " +
           "GROUP BY r.problem " +
           "ORDER BY SUM(r.reportCount) DESC")
    List<Object[]> findProblemsByCompanyAndTimeframe(
            @Param("companySlug") String companySlug,
            @Param("timeframe") String timeframe
    );

    boolean existsByCompanyIdAndProblemIdAndSourceAndTimeframe(
            Long companyId, Long problemId, String source, String timeframe
    );

    List<InterviewReport> findBySourceOrderByDateReportedDesc(String source);

    // Get the latest reports across all sources (for the live feed)
    List<InterviewReport> findTop20ByOrderByDateReportedDesc();

    // Get count of unique problems per company
    @Query("SELECT r.company.slug, COUNT(DISTINCT r.problem) FROM InterviewReport r GROUP BY r.company.slug")
    List<Object[]> countProblemsByCompany();

    // Get difficulty distribution for a company
    @Query("SELECT r.problem.difficulty, COUNT(DISTINCT r.problem) FROM InterviewReport r " +
           "WHERE r.company.slug = :companySlug " +
           "GROUP BY r.problem.difficulty")
    List<Object[]> getDifficultyDistribution(@Param("companySlug") String companySlug);

    // Get top topics for a company
    @Query("SELECT r.problem.topics FROM InterviewReport r " +
           "WHERE r.company.slug = :companySlug AND r.timeframe = 'all_time' AND r.problem.topics IS NOT NULL AND r.problem.topics <> ''")
    List<String> getTopicsForCompany(@Param("companySlug") String companySlug);

    // Get global problems sorted by overall frequency
    @Query("SELECT r.problem, SUM(r.reportCount) FROM InterviewReport r " +
           "WHERE r.timeframe = 'all_time' " +
           "GROUP BY r.problem " +
           "ORDER BY SUM(r.reportCount) DESC")
    List<Object[]> findGlobalProblemsOrderedByReportCount();

    // Get global difficulty distribution
    @Query("SELECT r.problem.difficulty, COUNT(DISTINCT r.problem) FROM InterviewReport r GROUP BY r.problem.difficulty")
    List<Object[]> getGlobalDifficultyDistribution();
}
