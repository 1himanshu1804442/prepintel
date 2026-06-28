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
           "WHERE r.company.slug = :companySlug AND (:timeframe = 'all_time' OR r.timeframe = :timeframe) " +
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
           "WHERE r.company.slug = :companySlug AND r.problem.topics IS NOT NULL AND r.problem.topics <> ''")
    List<String> getTopicsForCompany(@Param("companySlug") String companySlug);
}
