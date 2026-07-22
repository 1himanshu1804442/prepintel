package com.prepintel.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class TopicGraphEngineTest {

    private TopicGraphEngine engine;

    @BeforeEach
    void setUp() {
        engine = new TopicGraphEngine();
    }

    @Test
    void testComputePersonalizedGraphForAmazon() {
        Map<String, Integer> topicCounts = new HashMap<>();
        topicCounts.put("Graph", 96);
        topicCounts.put("Dynamic Programming", 70);
        topicCounts.put("Array", 120);
        topicCounts.put("Tree", 64);

        Set<String> solvedTopics = Set.of("Array", "Two Pointers");

        List<TopicGraphEngine.DynamicTopicRecommendation> recs =
                engine.computePersonalizedGraph("Amazon", topicCounts, 350, solvedTopics);

        assertNotNull(recs);
        assertFalse(recs.isEmpty());

        // Top recommendation should be Graph or DP due to high company frequency and unsolved state
        TopicGraphEngine.DynamicTopicRecommendation top = recs.get(0);
        assertTrue(top.priorityScore() > 0.5, "Top topic priority score should be high");
        assertTrue(top.unlocksList().size() > 0, "Top topic should have downstream unlocks");
        assertTrue(top.roiRating() >= 3, "ROI rating should be at least 3 stars");
    }

    @Test
    void testComputePersonalizedGraphForTCS() {
        Map<String, Integer> topicCounts = new HashMap<>();
        topicCounts.put("String", 80);
        topicCounts.put("Array", 75);
        topicCounts.put("Math", 45);

        List<TopicGraphEngine.DynamicTopicRecommendation> recs =
                engine.computePersonalizedGraph("TCS", topicCounts, 200, Collections.emptySet());

        assertNotNull(recs);
        assertFalse(recs.isEmpty());

        // String or Array should be prioritized for TCS
        String topTopicName = recs.get(0).id();
        assertTrue(topTopicName.equalsIgnoreCase("Array") || topTopicName.equalsIgnoreCase("String"),
                "TCS should prioritize Array or String fundamentals");
    }

    @Test
    void testPrerequisiteUnlockCounting() {
        Map<String, Integer> topicCounts = Map.of("Array", 100, "Two Pointers", 50);

        List<TopicGraphEngine.DynamicTopicRecommendation> recs =
                engine.computePersonalizedGraph("TestCo", topicCounts, 150, Collections.emptySet());

        Optional<TopicGraphEngine.DynamicTopicRecommendation> arrayRec =
                recs.stream().filter(r -> r.id().equalsIgnoreCase("Array")).findFirst();

        assertTrue(arrayRec.isPresent());
        assertTrue(arrayRec.get().downstreamUnlocksCount() >= 4, "Array node should unlock at least 4 downstream topics");
    }
}
