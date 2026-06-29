package com.prepintel.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prepintel.entity.Problem;
import com.prepintel.repository.ProblemRepository;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sync")
@CrossOrigin(origins = "*")
public class SyncController {

    private final ProblemRepository problemRepository;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public SyncController(ProblemRepository problemRepository) {
        this.problemRepository = problemRepository;
        this.httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();
        this.objectMapper = new ObjectMapper();
    }

    // 1. Sync LeetCode Recent Submissions via GraphQL
    @GetMapping("/leetcode")
    public ResponseEntity<?> syncLeetCode(@RequestParam String username) {
        try {
            String query = "query userRecentAcSubmissions($username: String!, $limit: Int!) { " +
                    "recentAcSubmissionList(username: $username, limit: $limit) { " +
                    "titleSlug " +
                    "} " +
                    "}";

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("query", query);
            requestBody.put("variables", Map.of("username", username, "limit", 50));

            String jsonPayload = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://leetcode.com/graphql"))
                    .header("Content-Type", "application/json")
                    .header("User-Agent", "Mozilla/5.0")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return ResponseEntity.status(response.statusCode()).body("LeetCode API returned status " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode submissions = root.path("data").path("recentAcSubmissionList");

            if (submissions.isMissingNode() || !submissions.isArray()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            Set<String> slugs = new HashSet<>();
            for (JsonNode sub : submissions) {
                String slug = sub.path("titleSlug").asText("");
                if (!slug.isEmpty()) {
                    slugs.add(slug.trim());
                }
            }

            List<Problem> matchedProblems = problemRepository.findAll();
            List<Long> matchedIds = matchedProblems.stream()
                    .filter(p -> slugs.contains(p.getTitleSlug()))
                    .map(Problem::getId)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(matchedIds);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to sync LeetCode profile: " + e.getMessage());
        }
    }

    // 2. Sync Codeforces Solved Problems via REST API
    @GetMapping("/codeforces")
    public ResponseEntity<?> syncCodeforces(@RequestParam String handle) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://codeforces.com/api/user.status?handle=" + handle))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return ResponseEntity.status(response.statusCode()).body("Codeforces API returned status " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String status = root.path("status").asText("");
            if (!"OK".equals(status)) {
                return ResponseEntity.badRequest().body("Codeforces returned error: " + root.path("comment").asText(""));
            }

            JsonNode result = root.path("result");
            Set<String> solvedTitles = new HashSet<>();

            for (JsonNode sub : result) {
                String verdict = sub.path("verdict").asText("");
                if ("OK".equals(verdict)) {
                    String pName = sub.path("problem").path("name").asText("");
                    if (!pName.isEmpty()) {
                        solvedTitles.add(pName.toLowerCase().replaceAll("[^a-z0-9]", ""));
                    }
                }
            }

            List<Problem> matchedProblems = problemRepository.findAll();
            List<Long> matchedIds = matchedProblems.stream()
                    .filter(p -> solvedTitles.contains(p.getTitle().toLowerCase().replaceAll("[^a-z0-9]", "")))
                    .map(Problem::getId)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(matchedIds);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to sync Codeforces profile: " + e.getMessage());
        }
    }

    // 3. Tokenless GitHub LeetHub Repository Scanner
    @PostMapping("/github")
    public ResponseEntity<?> syncGitHub(@RequestBody GitHubSyncRequest req) {
        try {
            String repoUrl = req.getRepoUrl();
            if (repoUrl == null || repoUrl.isBlank()) {
                return ResponseEntity.badRequest().body("Repository URL cannot be empty");
            }

            // Extract owner and repo from URL (e.g. https://github.com/owner/repo)
            Pattern pattern = Pattern.compile("github\\.com/([^/]+)/([^/\\s#?]+)");
            Matcher matcher = pattern.matcher(repoUrl);
            if (!matcher.find()) {
                return ResponseEntity.badRequest().body("Invalid GitHub repository URL format");
            }

            String owner = matcher.group(1);
            String repo = matcher.group(2).replace(".git", "");

            // Query GitHub Git Trees API for recursively scanning files (try 'main' first, then fall back to 'master')
            List<String> branches = List.of("main", "master");
            JsonNode tree = null;

            for (String branch : branches) {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(String.format("https://api.github.com/repos/%s/%s/git/trees/%s?recursive=1", owner, repo, branch)))
                        .header("User-Agent", "Mozilla/5.0")
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    tree = root.path("tree");
                    break;
                }
            }

            if (tree == null || tree.isMissingNode() || !tree.isArray()) {
                return ResponseEntity.badRequest().body("Could not read repository tree. Ensure it is public and branches are named main or master.");
            }

            Set<String> slugs = new HashSet<>();
            // Look for patterns like "0001-two-sum/two-sum.py" or just "two-sum" folder structures
            for (JsonNode file : tree) {
                String path = file.path("path").asText("");
                String type = file.path("type").asText("");

                if ("tree".equals(type)) {
                    // It's a directory folder name
                    String folderName = path.contains("/") ? path.substring(path.lastIndexOf("/") + 1) : path;
                    
                    // Standard LeetHub directories are formatted as "0001-two-sum"
                    if (folderName.matches("^\\d+-[a-z0-9-]+$")) {
                        String slug = folderName.substring(folderName.indexOf("-") + 1);
                        slugs.add(slug);
                    } else if (folderName.matches("^[a-z0-9-]+$")) {
                        slugs.add(folderName);
                    }
                }
            }

            List<Problem> matchedProblems = problemRepository.findAll();
            List<Long> matchedIds = matchedProblems.stream()
                    .filter(p -> slugs.contains(p.getTitleSlug()))
                    .map(Problem::getId)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(matchedIds);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to scan GitHub repository: " + e.getMessage());
        }
    }

    @Data
    public static class GitHubSyncRequest {
        private String repoUrl;
    }
}
