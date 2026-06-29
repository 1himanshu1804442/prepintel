package com.prepintel.service;

import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class GeminiService {

    private final HttpClient httpClient;

    public GeminiService() {
        this.httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();
    }

    @org.springframework.beans.factory.annotation.Value("${gemini.api.key:}")
    private String propertiesApiKey;

    public String generateContent(String prompt) {
        String apiKey = System.getenv("GEMINI_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            apiKey = propertiesApiKey;
        }
        if (apiKey == null || apiKey.isBlank()) {
            return "{\"error\": \"GEMINI_API_KEY not set. Please set it as an environment variable or in application.properties.\"}";
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
        String payload = """
                {
                  "contents": [{
                    "parts": [{"text": "%s"}]
                  }],
                  "generationConfig": {
                    "responseMimeType": "application/json"
                  }
                }
                """.formatted(prompt.replace("\"", "\\\"").replace("\n", "\\n"));

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                // Extract the text content from the Gemini response
                String body = response.body();
                int textStart = body.indexOf("\"text\":");
                if (textStart >= 0) {
                    int valueStart = body.indexOf("\"", textStart + 7) + 1;
                    int valueEnd = body.indexOf("\"", valueStart);
                    // Handle escaped content
                    while (valueEnd > 0 && body.charAt(valueEnd - 1) == '\\') {
                        valueEnd = body.indexOf("\"", valueEnd + 1);
                    }
                    if (valueEnd > valueStart) {
                        return body.substring(valueStart, valueEnd)
                                .replace("\\n", "\n")
                                .replace("\\\"", "\"")
                                .replace("\\\\", "\\");
                    }
                }
                return body;
            }
            return "{\"error\": \"Gemini API returned status " + response.statusCode() + "\"}";
        } catch (Exception e) {
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }
}
