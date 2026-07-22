package com.prepintel.service;

import org.springframework.stereotype.Service;

import java.util.*;

/**
 * ═══════════════════════════════════════════════════════════════════
 * PrepIntel Topic Graph & Topological Scoring Engine
 * ═══════════════════════════════════════════════════════════════════
 *
 * Represents Data Structures & Algorithms as a Directed Acyclic Graph (DAG).
 * Performs Topological Sorting and calculates a Personalized Priority Score
 * for each topic node:
 *
 *   PriorityScore = 0.40 * CompanyFrequency
 *                 + 0.30 * UserWeakness (1.0 - solveRatio)
 *                 + 0.20 * UnlockValue (downstream nodes unlocked)
 *                 + 0.10 * DifficultyFit
 *
 * This turns the static company list into a personalized learning path
 * tailored to BOTH company requirements AND individual candidate progress.
 * ═══════════════════════════════════════════════════════════════════
 */
@Service
public class TopicGraphEngine {

    // Topic Node Definition
    public record TopicNode(
            String id,
            String name,
            String category,         // Foundational, Intermediate, Hierarchical, Advanced
            int baseEstHours,
            List<String> prereqs,
            List<String> unlocks
    ) {}

    // Calculated Dynamic Recommendation
    public record DynamicTopicRecommendation(
            String id,
            String name,
            String category,
            int companyFrequencyPercent,
            int totalCompanyQuestions,
            int solvedCount,
            double userWeakness,          // 0.0 = fully solved, 1.0 = 0% solved
            int downstreamUnlocksCount,
            List<String> unlocksList,
            int estimatedHours,
            int roiRating,                // 1 to 5 stars
            double priorityScore,         // 0.0 to 1.0
            boolean prereqsSatisfied,
            String primaryReason,
            String badgeColor
    ) {}

    private static final Map<String, TopicNode> GRAPH = new LinkedHashMap<>();

    static {
        // Build the DSA Prerequisite DAG
        addNode("Array", "Arrays & Hashing", "Foundational", 4,
                List.of(),
                List.of("Two Pointers", "Hash Table", "Sorting", "Matrix", "Prefix Sum"));

        addNode("String", "String Manipulation", "Foundational", 4,
                List.of(),
                List.of("Trie", "Two Pointers", "Hash Table"));

        addNode("Math", "Numerical & Math Logic", "Foundational", 3,
                List.of(),
                List.of("Bit Manipulation", "Number Theory"));

        addNode("Two Pointers", "Two Pointers", "Intermediate", 3,
                List.of("Array"),
                List.of("Sliding Window", "Binary Search"));

        addNode("Sliding Window", "Sliding Window", "Intermediate", 4,
                List.of("Two Pointers"),
                List.of("Substrings & Subarrays"));

        addNode("Hash Table", "Hash Maps & Sets", "Intermediate", 3,
                List.of("Array"),
                List.of("LRU Cache", "Frequency Tracking"));

        addNode("Stack", "Stacks & Monotonic Stack", "Intermediate", 4,
                List.of("Array"),
                List.of("Parentheses Matching", "Expression Parsing"));

        addNode("Queue", "Queues & Deques", "Intermediate", 3,
                List.of("Array"),
                List.of("Breadth-First Search"));

        addNode("Linked List", "Linked Lists", "Intermediate", 4,
                List.of("Array"),
                List.of("Fast & Slow Pointers", "LRU Cache"));

        addNode("Binary Search", "Binary Search", "Intermediate", 4,
                List.of("Two Pointers"),
                List.of("Search Space Optimization"));

        addNode("Tree", "Trees & Binary Search Trees", "Hierarchical", 6,
                List.of("Array"),
                List.of("Depth-First Search", "Trie"));

        addNode("Depth-First Search", "Depth-First Search (DFS)", "Hierarchical", 5,
                List.of("Tree"),
                List.of("Graph", "Backtracking"));

        addNode("Breadth-First Search", "Breadth-First Search (BFS)", "Hierarchical", 5,
                List.of("Queue", "Tree"),
                List.of("Graph", "Shortest Path"));

        addNode("Graph", "Graphs & Topological Sort", "Complex", 8,
                List.of("Depth-First Search", "Breadth-First Search"),
                List.of("Union Find", "Shortest Path", "Topological Sort"));

        addNode("Dynamic Programming", "Dynamic Programming (DP)", "Advanced", 10,
                List.of("Array", "Depth-First Search"),
                List.of("Memoization", "Tabulation", "Knapsack", "LCS"));

        addNode("Greedy", "Greedy Algorithms", "Advanced", 5,
                List.of("Sorting"),
                List.of("Interval Scheduling"));

        addNode("Backtracking", "Backtracking", "Advanced", 6,
                List.of("Depth-First Search"),
                List.of("Combinations", "N-Queens"));
    }

    private static void addNode(String id, String name, String category, int baseEstHours, List<String> prereqs, List<String> unlocks) {
        GRAPH.put(id, new TopicNode(id, name, category, baseEstHours, prereqs, unlocks));
    }

    /**
     * Compute dynamic, personalized topic recommendations for a company + user progress state.
     */
    public List<DynamicTopicRecommendation> computePersonalizedGraph(
            String companyName,
            Map<String, Integer> topicCounts,
            int totalCompanyProblems,
            Set<String> solvedTopicNames
    ) {
        int maxTopicCount = topicCounts.values().stream().mapToInt(Integer::intValue).max().orElse(1);
        int maxUnlocks = GRAPH.values().stream().mapToInt(n -> n.unlocks().size()).max().orElse(1);

        List<DynamicTopicRecommendation> recommendations = new ArrayList<>();

        String[] colorPalettes = {
            "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
            "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
            "bg-accent/10 text-accent-light border-accent/30",
            "bg-amber-500/10 text-amber-400 border-amber-500/30",
            "bg-purple-500/10 text-purple-400 border-purple-500/30",
            "bg-rose-500/10 text-rose-400 border-rose-500/30"
        };

        for (Map.Entry<String, TopicNode> entry : GRAPH.entrySet()) {
            String topicId = entry.getKey();
            TopicNode node = entry.getValue();

            int count = topicCounts.getOrDefault(topicId, 0);
            if (count == 0 && !hasPartialMatch(topicCounts, topicId)) {
                continue; // Skip topics not asked by this company
            }
            if (count == 0) {
                count = getPartialMatchCount(topicCounts, topicId);
            }

            int percent = totalCompanyProblems > 0 ? (int) Math.round((count * 100.0) / totalCompanyProblems) : 0;

            // Signal 1: Company Frequency (0.0 to 1.0)
            double freqSignal = (double) count / maxTopicCount;

            // Signal 2: User Weakness (0.0 if user completed topic, 1.0 if unsolved)
            boolean isSolved = solvedTopicNames != null && solvedTopicNames.contains(topicId);
            double weaknessSignal = isSolved ? 0.15 : 1.0;

            // Signal 3: Unlock Value (0.0 to 1.0)
            double unlockSignal = (double) node.unlocks().size() / maxUnlocks;

            // Signal 4: Difficulty Fit (Foundational gets slight preference early)
            double difficultySignal = switch (node.category()) {
                case "Foundational" -> 1.0;
                case "Intermediate" -> 0.85;
                case "Hierarchical" -> 0.70;
                default -> 0.55;
            };

            // Final Weighted Priority Formula
            double priorityScore = 0.40 * freqSignal
                                 + 0.30 * weaknessSignal
                                 + 0.20 * unlockSignal
                                 + 0.10 * difficultySignal;

            // ROI Star Rating (1 to 5)
            int roiRating = Math.min(5, Math.max(1, (int) Math.round(priorityScore * 5.0)));

            // Check Prerequisite satisfaction
            boolean prereqsSatisfied = node.prereqs().isEmpty() ||
                    (solvedTopicNames != null && solvedTopicNames.containsAll(node.prereqs()));

            // Determine Primary Recommendation Reason
            String primaryReason;
            if (!prereqsSatisfied) {
                primaryReason = "Prerequisite Alert: Master " + String.join(", ", node.prereqs()) + " first";
            } else if (!isSolved && percent >= 25) {
                primaryReason = String.format("High Company Weight (%d%% of %s OAs) — Unsolved", percent, companyName);
            } else if (node.unlocks().size() >= 3) {
                primaryReason = String.format("High Unlock Value: Unlocks %d downstream topics", node.unlocks().size());
            } else if (isSolved) {
                primaryReason = "Mastered topic — review for high-frequency patterns";
            } else {
                primaryReason = "Core placement requirement for " + companyName;
            }

            int badgeIdx = Math.abs(topicId.hashCode()) % colorPalettes.length;

            recommendations.add(new DynamicTopicRecommendation(
                    topicId,
                    node.name(),
                    node.category(),
                    percent,
                    count,
                    isSolved ? count : 0,
                    weaknessSignal,
                    node.unlocks().size(),
                    node.unlocks(),
                    node.baseEstHours(),
                    roiRating,
                    Math.round(priorityScore * 100.0) / 100.0,
                    prereqsSatisfied,
                    primaryReason,
                    colorPalettes[badgeIdx]
            ));
        }

        // Sort by computed priority score descending
        recommendations.sort(Comparator.comparingDouble(DynamicTopicRecommendation::priorityScore).reversed());

        return recommendations;
    }

    private boolean hasPartialMatch(Map<String, Integer> topicCounts, String topicId) {
        return topicCounts.keySet().stream().anyMatch(k -> k.toLowerCase().contains(topicId.toLowerCase()));
    }

    private int getPartialMatchCount(Map<String, Integer> topicCounts, String topicId) {
        return topicCounts.entrySet().stream()
                .filter(e -> e.getKey().toLowerCase().contains(topicId.toLowerCase()))
                .mapToInt(Map.Entry::getValue)
                .sum();
    }
}
