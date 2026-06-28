package com.prepintel.repository;

import com.prepintel.entity.InterviewReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewReportRepository extends JpaRepository<InterviewReport, Long> {

    @Query("SELECT r.problem, COUNT(r) FROM InterviewReport r " +
           "WHERE r.company.slug = :companySlug AND (:timeframe = 'all_time' OR r.timeframe = :timeframe) " +
           "GROUP BY r.problem " +
           "ORDER BY COUNT(r) DESC")
    List<Object[]> findProblemsByCompanyAndTimeframe(
            @Param("companySlug") String companySlug,
            @Param("timeframe") String timeframe
    );

    boolean existsByCompanyIdAndProblemIdAndSourceAndTimeframe(
            Long companyId, Long problemId, String source, String timeframe
    );

    List<InterviewReport> findBySourceOrderByDateReportedDesc(String source);
}
