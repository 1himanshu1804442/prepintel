package com.prepintel.service;

import com.prepintel.entity.InterviewReport;
import com.prepintel.entity.Problem;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Ranks individual interview reports without treating overlapping import buckets as independent evidence.
 * Legacy records with no observed date remain available in all-time views, but are never presented as recent.
 */
@Service
public class InterviewReportRankingService {

    public List<RankedProblem> rank(Collection<InterviewReport> reports, String timeframe, String role) {
        return rank(reports, timeframe, role, LocalDate.now());
    }

    static List<RankedProblem> rank(Collection<InterviewReport> reports, String timeframe, String role, LocalDate today) {
        LocalDate cutoff = cutoffFor(timeframe, today);
        String normalizedRole = normalize(role);
        Map<String, InterviewReport> uniqueEvidence = new LinkedHashMap<>();

        for (InterviewReport report : reports) {
            if (!matchesRole(report, normalizedRole) || !isInRequestedWindow(report, timeframe, cutoff)) {
                continue;
            }
            String key = evidenceKey(report);
            InterviewReport current = uniqueEvidence.get(key);
            if (current == null || evidenceComparator().compare(report, current) > 0) {
                uniqueEvidence.put(key, report);
            }
        }

        Map<Long, Aggregate> aggregates = new HashMap<>();
        for (InterviewReport report : uniqueEvidence.values()) {
            aggregates.computeIfAbsent(report.getProblem().getId(), ignored -> new Aggregate(report.getProblem()))
                    .add(report, today);
        }

        double maxScore = aggregates.values().stream()
                .mapToDouble(aggregate -> aggregate.weightedScore)
                .max()
                .orElse(1.0);

        return aggregates.values().stream()
                .map(aggregate -> aggregate.toRankedProblem(maxScore, today))
                .sorted(Comparator.comparingDouble(RankedProblem::weightedScore).reversed()
                        .thenComparing(RankedProblem::reportCount, Comparator.reverseOrder())
                        .thenComparing(ranking -> ranking.problem().getTitle()))
                .toList();
    }

    private static boolean isInRequestedWindow(InterviewReport report, String timeframe, LocalDate cutoff) {
        // "all_time" always includes everything — both GitHub historical and community reports
        if (timeframe == null || "all_time".equals(timeframe)) {
            return true;
        }

        // "1_year" means "GitHub Repos" — show only historical scraped data (no real timestamp)
        if ("1_year".equals(timeframe)) {
            return report.getReportedAt() == null;
        }

        // "30_days" and "3_months" are RECENT filters — they require a REAL reportedAt timestamp.
        // GitHub-scraped records have reportedAt=null, so they are excluded here.
        // This prevents the bug where GitHub folder names like "30_days.csv" were being
        // treated as real recency evidence when they're just repository structure labels.
        if (report.getReportedAt() == null) {
            return false;
        }

        // For community-submitted reports with real timestamps, apply the date cutoff
        return !report.getReportedAt().isBefore(cutoff);
    }

    private static boolean matchesRole(InterviewReport report, String normalizedRole) {
        return normalizedRole.isBlank() || "all".equals(normalizedRole)
                || normalize(report.getRole()).equals(normalizedRole);
    }

    private static LocalDate cutoffFor(String timeframe, LocalDate today) {
        return switch (timeframe == null ? "all_time" : timeframe) {
            case "30_days" -> today.minusDays(30);
            case "3_months" -> today.minusMonths(3);
            case "6_months" -> today.minusMonths(6);
            case "1_year" -> today.minusYears(1);
            case "all_time" -> null;
            default -> throw new IllegalArgumentException("Unsupported timeframe: " + timeframe);
        };
    }

    private static Comparator<InterviewReport> evidenceComparator() {
        return Comparator.comparing(InterviewReportRankingService::isVerified)
                .thenComparing(InterviewReport::getReportedAt, Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(InterviewReport::getReportCount, Comparator.nullsFirst(Comparator.naturalOrder()));
    }

    private static String evidenceKey(InterviewReport report) {
        String company = String.valueOf(report.getCompany().getId());
        String problem = String.valueOf(report.getProblem().getId());
        if (report.getReportedAt() == null) {
            // Imported buckets represent the same historical aggregate, not independent sightings.
            return String.join("|", "legacy", company, problem, normalize(report.getSource()),
                    normalize(report.getRole()), normalize(report.getRound()));
        }
        String sourceIdentity = report.getSourceUrl() == null || report.getSourceUrl().isBlank()
                ? normalize(report.getSource()) + ":" + normalize(report.getNotes())
                : report.getSourceUrl().trim();
        return String.join("|", "dated", company, problem, report.getReportedAt().toString(),
                normalize(report.getRole()), normalize(report.getRound()), sourceIdentity);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isVerified(InterviewReport report) {
        return "VERIFIED".equalsIgnoreCase(report.getVerificationStatus());
    }

    private static final class Aggregate {
        private final Problem problem;
        private int reportCount;
        private int recentReportCount;
        private double weightedScore;
        private LocalDate lastVerifiedAt;
        private LocalDate lastObservedAt;

        private Aggregate(Problem problem) {
            this.problem = problem;
        }

        private void add(InterviewReport report, LocalDate today) {
            int count = Math.max(1, Objects.requireNonNullElse(report.getReportCount(), 1));
            reportCount += count;

            if (report.getReportedAt() == null) {
                // Historical imports inform discovery, but cannot masquerade as a current trend.
                weightedScore += count * 0.15;
                return;
            }

            long ageDays = Math.max(0, today.toEpochDay() - report.getReportedAt().toEpochDay());
            double recencyWeight = Math.max(0.10, Math.exp(-ageDays / 180.0));
            double verificationWeight = isVerified(report) ? 1.20 : 0.85;
            weightedScore += count * recencyWeight * verificationWeight;
            lastObservedAt = lastObservedAt == null || report.getReportedAt().isAfter(lastObservedAt)
                    ? report.getReportedAt() : lastObservedAt;

            if (!report.getReportedAt().isBefore(today.minusDays(90))) {
                recentReportCount += count;
            }
            if (isVerified(report) && (lastVerifiedAt == null || report.getReportedAt().isAfter(lastVerifiedAt))) {
                lastVerifiedAt = report.getReportedAt();
            }
        }

        private RankedProblem toRankedProblem(double maxScore, LocalDate today) {
            int relativeFrequency = Math.min(100, Math.max(0, (int) Math.round(weightedScore * 100.0 / maxScore)));
            return new RankedProblem(problem, reportCount, recentReportCount, weightedScore, relativeFrequency,
                    lastVerifiedAt, freshnessLabel(today));
        }

        private String freshnessLabel(LocalDate today) {
            if (lastVerifiedAt != null) {
                long days = Math.max(0, today.toEpochDay() - lastVerifiedAt.toEpochDay());
                if (days <= 30) return "Verified in the last 30 days";
                if (days <= 90) return "Verified in the last 3 months";
                if (days <= 365) return "Verified this year";
                return "Verified historical report";
            }
            if (lastObservedAt != null) return "Community-reported; pending verification";
            return "Historical data; interview date unverified";
        }
    }

    public record RankedProblem(Problem problem, int reportCount, int recentReportCount,
                                double weightedScore, int relativeFrequency,
                                LocalDate lastVerifiedAt, String dataFreshnessLabel) {
    }
}
