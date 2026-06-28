package com.prepintel.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "interview_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;

    @Column(nullable = false)
    private String source; // 'Reddit', 'User Submission', 'Pre-seeded'

    @Column(nullable = false)
    private String timeframe; // '30_days', '3_months', '6_months', '1_year', 'all_time'

    @Column(name = "date_reported", insertable = false, updatable = false)
    private LocalDateTime dateReported;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
