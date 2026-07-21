package com.prepintel.repository;

import com.prepintel.entity.InterviewReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewReportRepository extends JpaRepository<InterviewReport, Long> {

    @Query("SELECT r FROM InterviewReport r JOIN FETCH r.company JOIN FETCH r.problem " +
           "WHERE r.company.slug = :companySlug")
    List<InterviewReport> findRankingReportsByCompanySlug(@Param("companySlug") String companySlug);

    @Query("SELECT r FROM InterviewReport r JOIN FETCH r.company JOIN FETCH r.problem")
    List<InterviewReport> findAllRankingReports();

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

    // Get distinct problem topics for a company to calculate topic trends without double counting
    @Query("SELECT DISTINCT r.problem.id, r.problem.topics FROM InterviewReport r " +
           "WHERE r.company.slug = :companySlug AND r.problem.topics IS NOT NULL AND r.problem.topics <> ''")
    List<Object[]> getTopicsForCompany(@Param("companySlug") String companySlug);

    // Get global difficulty distribution
    @Query("SELECT r.problem.difficulty, COUNT(DISTINCT r.problem) FROM InterviewReport r GROUP BY r.problem.difficulty")
    List<Object[]> getGlobalDifficultyDistribution();
}
