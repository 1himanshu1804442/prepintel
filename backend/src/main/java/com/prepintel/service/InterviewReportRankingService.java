package com.prepintel.service;

import com.prepintel.entity.InterviewReport;
import com.prepintel.entity.Problem;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

/**
 * ═══════════════════════════════════════════════════════════════════
 * PrepIntel Confidence Scoring & Ranking Engine
 * ═══════════════════════════════════════════════════════════════════
 *
 * Computes a defensible Confidence Score for each question using
 * 4 independent, normalized signals combined with explicit weights:
 *
 *   ConfidenceScore = W_freq * FrequencySignal
 *                   + W_rec  * RecencySignal
 *                   + W_ver  * VerificationSignal
 *                   + W_div  * SourceDiversitySignal
 *
 * Each signal is normalized to [0, 1] before weighting.
 *
 * Signal Definitions:
 *   1. FrequencySignal     = log(1 + reportCount) / log(1 + maxReportCount)
 *      WHY log-scaled: Raw counts are heavily skewed (top question might have
 *      200 reports, median might have 3). Log compression prevents the top
 *      question from drowning out all others while preserving rank order.
 *
 *   2. RecencySignal       = max(recentRecencyScores) across all dated reports
 *      where each report's recency = exp(-ageDays / HALF_LIFE_DAYS)
 *      WHY exponential decay: A report from 30 days ago should matter much more
 *      than one from 2 years ago. The 180-day half-life means a 6-month-old
 *      report retains ~37% of its signal strength (1/e).
 *
 *   3. VerificationSignal  = verifiedReportCount / totalReportCount
 *      WHY ratio: A question with 10/10 verified reports is more trustworthy
 *      than one with 2/200 verified. This is the proportion of evidence that
 *      has been independently confirmed by community voting or manual review.
 *
 *   4. SourceDiversitySignal = normalizedEntropy(sourceDistribution)
 *      = -Σ(p_i * ln(p_i)) / ln(numDistinctSources)
 *      WHY Shannon entropy: A question reported by 5 different sources
 *      (GitHub, 3 students, Reddit) is more credible than one reported
 *      50 times by a single scraper. Entropy measures how evenly distributed
 *      the evidence is across independent sources.
 *
 * Default Weights (configurable):
 *   W_freq = 0.40  (how often it appears — strongest signal)
 *   W_rec  = 0.25  (how recently it was reported)
 *   W_ver  = 0.20  (what proportion is verified)
 *   W_div  = 0.15  (how many independent sources confirm it)
 *
 * Time Complexity: O(N log N) where N = number of unique evidence records
 * Space Complexity: O(N) for the aggregate map
 * ═══════════════════════════════════════════════════════════════════
 */
@Service
public class InterviewReportRankingService {

    // Configurable weights — must sum to 1.0
    // WHY these defaults: Frequency is the strongest predictor of future appearance.
    // Recency matters because interview patterns shift. Verification and diversity
    // provide trust calibration without overwhelming the core frequency signal.
    private static final double W_FREQ = 0.40;
    private static final double W_REC  = 0.25;
    private static final double W_VER  = 0.20;
    private static final double W_DIV  = 0.15;

    // Exponential decay half-life in days.
    // WHY 180: Placement seasons typically repeat every 6 months. A report from
    // the previous season should retain meaningful signal (~37%) while a report
    // from 2+ years ago naturally fades to near-zero (~1.4%).
    private static final double HALF_LIFE_DAYS = 180.0;

    public List<RankedProblem> rank(Collection<InterviewReport> reports, String timeframe, String role) {
        return rank(reports, timeframe, role, LocalDate.now());
    }

    static List<RankedProblem> rank(Collection<InterviewReport> reports, String timeframe, String role, LocalDate today) {
        LocalDate cutoff = cutoffFor(timeframe, today);
        String normalizedRole = normalize(role);

        // Step 1: Deduplicate evidence — prevent overlapping GitHub CSV imports
        // from counting the same question multiple times
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

        // Step 2: Aggregate deduplicated evidence per problem
        Map<Long, Aggregate> aggregates = new HashMap<>();
        for (InterviewReport report : uniqueEvidence.values()) {
            aggregates.computeIfAbsent(report.getProblem().getId(), ignored -> new Aggregate(report.getProblem()))
                    .add(report, today);
        }

        // Step 3: Find the max raw report count for log-normalization
        // WHY separate pass: FrequencySignal needs the global max to normalize
        int maxReportCount = aggregates.values().stream()
                .mapToInt(a -> a.reportCount)
                .max()
                .orElse(1);

        // Step 4: Compute final confidence scores and build ranked list
        return aggregates.values().stream()
                .map(aggregate -> aggregate.toRankedProblem(maxReportCount, today))
                .sorted(Comparator.comparingDouble(RankedProblem::confidenceScore).reversed()
                        .thenComparing(RankedProblem::reportCount, Comparator.reverseOrder())
                        .thenComparing(ranking -> ranking.problem().getTitle()))
                .toList();
    }

    // ─── Window Filtering ──────────────────────────────────────────

    private static boolean isInRequestedWindow(InterviewReport report, String timeframe, LocalDate cutoff) {
        if (timeframe == null || "all_time".equals(timeframe)) {
            return true;
        }
        // "GitHub Repos" filter — show only historical scraped data
        if ("1_year".equals(timeframe)) {
            return report.getReportedAt() == null;
        }
        // Recent filters require real timestamps; GitHub scrapes are excluded
        if (report.getReportedAt() == null) {
            return false;
        }
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

    // ─── Evidence Deduplication ─────────────────────────────────────

    private static Comparator<InterviewReport> evidenceComparator() {
        return Comparator.comparing(InterviewReportRankingService::isVerified)
                .thenComparing(InterviewReport::getReportedAt, Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(InterviewReport::getReportCount, Comparator.nullsFirst(Comparator.naturalOrder()));
    }

    private static String evidenceKey(InterviewReport report) {
        String company = String.valueOf(report.getCompany().getId());
        String problem = String.valueOf(report.getProblem().getId());
        if (report.getReportedAt() == null) {
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

    // ─── Per-Problem Aggregate ──────────────────────────────────────

    private static final class Aggregate {
        private final Problem problem;
        private int reportCount;
        private int recentReportCount;
        private int verifiedCount;
        private double bestRecencyScore;     // max recency across all dated reports
        private LocalDate lastVerifiedAt;
        private LocalDate lastObservedAt;

        // Track source names for Shannon entropy calculation
        private final Map<String, Integer> sourceCounts = new HashMap<>();

        private Aggregate(Problem problem) {
            this.problem = problem;
        }

        private void add(InterviewReport report, LocalDate today) {
            int count = Math.max(1, Objects.requireNonNullElse(report.getReportCount(), 1));
            reportCount += count;

            // Track source diversity for entropy calculation
            String source = normalize(report.getSource());
            if (source.isEmpty()) source = "unknown";
            sourceCounts.merge(source, count, Integer::sum);

            // Track verification status
            if (isVerified(report)) {
                verifiedCount += count;
            }

            if (report.getReportedAt() == null) {
                // Historical GitHub imports — no recency signal, but they
                // still contribute to frequency and source diversity
                return;
            }

            // Compute exponential recency decay for this report
            long ageDays = Math.max(0, today.toEpochDay() - report.getReportedAt().toEpochDay());
            double recency = Math.exp(-ageDays / HALF_LIFE_DAYS);
            bestRecencyScore = Math.max(bestRecencyScore, recency);

            // Track observation timestamps
            if (lastObservedAt == null || report.getReportedAt().isAfter(lastObservedAt)) {
                lastObservedAt = report.getReportedAt();
            }

            // Count recent reports (within 90 days)
            if (!report.getReportedAt().isBefore(today.minusDays(90))) {
                recentReportCount += count;
            }

            // Track latest verification date
            if (isVerified(report) && (lastVerifiedAt == null || report.getReportedAt().isAfter(lastVerifiedAt))) {
                lastVerifiedAt = report.getReportedAt();
            }
        }

        /**
         * Computes the final 4-signal confidence score.
         *
         * @param maxReportCount the highest report count across all problems (for normalization)
         * @param today          current date (for freshness labels)
         * @return a RankedProblem with all computed metrics
         */
        private RankedProblem toRankedProblem(int maxReportCount, LocalDate today) {

            // Signal 1: Frequency (log-normalized to [0, 1])
            // WHY log: prevents a single viral question with 500 reports from
            // making every other question appear as 0%. log(501)/log(501) = 1.0,
            // log(11)/log(501) ≈ 0.38, which feels fair.
            double freqSignal = Math.log(1.0 + reportCount) / Math.log(1.0 + maxReportCount);

            // Signal 2: Recency (already in [0, 1] from exponential decay)
            // bestRecencyScore = 0.0 if no dated reports exist (pure GitHub historical)
            double recSignal = bestRecencyScore;

            // Signal 3: Verification ratio (in [0, 1])
            // 0.0 if nothing is verified, 1.0 if all evidence is verified
            double verSignal = reportCount > 0 ? (double) verifiedCount / reportCount : 0.0;

            // Signal 4: Source diversity (normalized Shannon entropy in [0, 1])
            double divSignal = computeNormalizedEntropy();

            // Combine signals with explicit weights
            double confidenceScore = W_FREQ * freqSignal
                                   + W_REC  * recSignal
                                   + W_VER  * verSignal
                                   + W_DIV  * divSignal;

            // Convert to percentage [0, 100] — this is the "Confidence %" shown in UI
            int confidencePercent = Math.min(100, Math.max(0, (int) Math.round(confidenceScore * 100.0)));

            // Also compute a legacy "relative frequency" for backward compatibility
            // with UI elements that display frequency bars
            int relativeFrequency = Math.min(100, Math.max(0, (int) Math.round(freqSignal * 100.0)));

            return new RankedProblem(
                    problem, reportCount, recentReportCount,
                    confidenceScore, confidencePercent, relativeFrequency,
                    lastVerifiedAt, freshnessLabel(today),
                    // Expose individual signal values for the Formula Transparency modal
                    Math.round(freqSignal * 1000.0) / 1000.0,
                    Math.round(recSignal * 1000.0) / 1000.0,
                    Math.round(verSignal * 1000.0) / 1000.0,
                    Math.round(divSignal * 1000.0) / 1000.0
            );
        }

        /**
         * Computes normalized Shannon entropy of the source distribution.
         * Returns 0.0 if only one source, 1.0 if reports are evenly spread across many sources.
         *
         * Formula: H_norm = -Σ(p_i * ln(p_i)) / ln(N)
         * where p_i = count_from_source_i / total_count, N = number of distinct sources
         *
         * WHY Shannon entropy: It quantifies "how surprised we'd be" to learn which source
         * a random report came from. High entropy = evidence from many independent sources
         * = more trustworthy. Low entropy = single-source evidence = less trustworthy.
         */
        private double computeNormalizedEntropy() {
            int numSources = sourceCounts.size();
            if (numSources <= 1) return 0.0;

            double totalReports = sourceCounts.values().stream().mapToInt(Integer::intValue).sum();
            double entropy = 0.0;
            for (int count : sourceCounts.values()) {
                double p = count / totalReports;
                if (p > 0) {
                    entropy -= p * Math.log(p);
                }
            }
            // Normalize by max possible entropy (uniform distribution across N sources)
            return entropy / Math.log(numSources);
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

    // ─── Output Record ──────────────────────────────────────────────

    /**
     * Immutable result record for a ranked problem.
     * Exposes all 4 individual signal values so the frontend Formula Transparency
     * modal can render a live step-by-step breakdown for each question.
     */
    public record RankedProblem(
            Problem problem,
            int reportCount,
            int recentReportCount,
            double confidenceScore,      // raw score in [0, 1]
            int confidencePercent,       // confidence as integer percentage [0, 100]
            int relativeFrequency,       // log-normalized frequency percentage [0, 100]
            LocalDate lastVerifiedAt,
            String dataFreshnessLabel,
            // Individual signal breakdowns for transparency
            double freqSignal,           // [0, 1] log-normalized frequency
            double recencySignal,        // [0, 1] exponential decay
            double verificationSignal,   // [0, 1] verified/total ratio
            double diversitySignal       // [0, 1] normalized Shannon entropy
    ) {
        // Legacy accessor for backward compatibility with existing controller code
        public double weightedScore() { return confidenceScore; }
    }
}
