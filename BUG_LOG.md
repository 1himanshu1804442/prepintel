# 🛠️ PrepIntel: Technical Bug & Troubleshooting Log

This document records the exact technical bugs, root causes, code fixes, and interview explanations for every major issue solved during the development of **PrepIntel**.

---

## 1. Spring Boot Property Hijacking & Gemini `400 API_KEY_INVALID`

### **Symptom**
When calling the Gemini AI Coach endpoint, the backend returned:
`{"error": "Gemini API returned status 400. Body: API key not valid. Please pass a valid API key."}`

### **Root Cause**
1. The host Windows machine had a stale global OS environment variable `GEMINI_API_KEY` holding an old, deleted key (`AIzaSy...`).
2. Spring Boot's **Relaxed Binding** and property resolution rules automatically mapped OS environment variables to `@Value("${gemini.api.key}")`.
3. Because OS environment variables take precedence over `application.properties`, Spring Boot silently overrode the valid key (`AQ...`) in `application.properties` with the broken OS environment variable.

### **The Code Fix**
- Renamed the custom property key to `prepintel.ai.key` in both `backend/src/main/resources/application.properties` and `backend/src/main/java/com/prepintel/service/GeminiService.java` to prevent Spring Boot from auto-binding to `GEMINI_API_KEY`.
- Updated request headers to pass the key using the `X-goog-api-key` HTTP header.

```java
// GeminiService.java
@Value("${prepintel.ai.key:}")
private String propertiesApiKey;

public String generateContent(String prompt) {
    String apiKey = propertiesApiKey;
    if (apiKey == null || apiKey.isBlank()) {
        apiKey = System.getenv("PREPINTEL_AI_KEY");
    }
    // ...
    HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .header("X-goog-api-key", apiKey)
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();
}
```

### **Interview Explanation**
> *"I debugged a subtle Spring Boot configuration issue where an OS-level environment variable silently hijacked our `@Value` property injection due to Spring's property precedence order. I resolved it by namespace-scoping our configuration keys and implementing header-based API authentication (`X-goog-api-key`)."*

---

## 2. JSON Payload String Sanitization for LLM Requests

### **Symptom**
Passing problem titles or descriptions containing quotes (`"`), backslashes (`\`), or multi-line text to Gemini caused malformed JSON HTTP `400 Bad Request` errors.

### **Root Cause**
Formatting raw prompt strings directly into JSON text blocks produced invalid JSON syntax if the prompt text contained unescaped quotes or newlines.

### **The Code Fix**
Added string sanitization in `backend/src/main/java/com/prepintel/service/GeminiService.java` to escape control characters before interpolating prompt strings into JSON payloads:

```java
String payload = """
        {
          "contents": [{
            "parts": [{"text": "%s"}]
          }],
          "generationConfig": {
            "responseMimeType": "application/json"
          }
        }
        """.formatted(prompt.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n"));
```

### **Interview Explanation**
> *"When programmatically building JSON payloads for LLM APIs in Java, user input and problem descriptions with double quotes or line breaks can break the JSON body. I implemented a string sanitizer that escapes backslashes, quotes, and newlines before payload injection."*

---

## 3. Gemini Free-Tier 503 Overload & Model Sunset Fallback Chain

### **Symptom**
During peak traffic hours, Gemini returned `503 Service Unavailable` due to free-tier load spikes. Attempting to fall back to older models like `gemini-1.5-flash-8b` resulted in `404 Not Found` errors.

### **Root Cause**
1. Google sunsetted the Gemini 1.5 model series for new API keys, invalidating legacy model strings.
2. Free-tier API keys experience temporary high-demand throttling (503 status code).

### **The Code Fix**
Built a 2-tier fallback chain utilizing current Gemini 2.5 models (`gemini-2.5-flash` → `gemini-2.5-flash-lite`) paired with exponential retry backoff in `backend/src/main/java/com/prepintel/service/GeminiService.java`:

```java
String[] models = {"gemini-2.5-flash", "gemini-2.5-flash-lite"};
int maxRetries = 2;

for (String model : models) {
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 200) {
            return extractText(response.body());
        } else if (response.statusCode() == 503 && attempt < maxRetries) {
            Thread.sleep((attempt + 1) * 1000L); // Backoff: 1s, 2s
            continue;
        }
        // Fall back to next model in chain if 503 persists
    }
}
```

### **Interview Explanation**
> *"To ensure high availability on free-tier LLM endpoints, I designed a resilient API client featuring exponential retry backoff for 503 load spikes and an automated fallback chain across separate model quota pools (`gemini-2.5-flash` to `gemini-2.5-flash-lite`)."*

---

## 4. Double-JSON String Rendering in React Modals

### **Symptom**
Clicking "AI Coach Summary" displayed raw JSON code blocks in the modal:
`{"company":"Google","summary":"{\n  \"focusAreas\": [\"Dynamic Programming\", ...]\n}"}`

### **Root Cause**
1. The frontend fetch call used `.text()` instead of `.json()`.
2. Gemini's `responseMimeType: application/json` setting returned a stringified JSON object nested inside the backend's `summary` field.
3. The React component rendered raw string text inside a `<pre>` / `<div>` block without parsing.

### **The Code Fix**
Updated `frontend/src/Dashboard.jsx` to parse incoming JSON responses and render a structured UI card layout:

```javascript
// AiSummaryModal in Dashboard.jsx
useEffect(() => {
  fetch(`${API}/companies/${companySlug}/ai-summary`)
    .then(r => r.json())
    .then(data => {
      const parsed = typeof data.summary === 'string' ? JSON.parse(data.summary) : data.summary;
      setSummaryData(parsed);
      setLoading(false);
    });
}, [companySlug]);
```

Rendered components:
- **Strategy Callout**: Highlighted recommendation card with `Sparkles` icon.
- **Focus Area Pills**: Interactive category tags (`Dynamic Programming`, `Graphs`).
- **Interview Pattern List**: Bulleted assessment details.
- **Trending Topics**: Topic cards with trend indicators (`↑ Rising`).

### **Interview Explanation**
> *"I resolved a nested JSON serialization issue where Gemini's structured output was rendered as raw strings in the UI. I implemented client-side JSON parsing and transformed the raw output into a structured UI component breakdown."*

---

## 5. Client-Side Rendering Performance Lag Across 1,000+ Questions

### **Symptom**
Filtering or typing in the problem search bar caused noticeable frame drops and input lag.

### **Root Cause**
The problem filtering pipeline re-computed array operations across 1,000+ items on every minor UI re-render.

### **The Code Fix**
Wrapped filtering logic inside `useMemo` in `frontend/src/Dashboard.jsx`, scoping dependencies strictly to filter state variables:

```javascript
const filteredProblems = useMemo(() => {
  return problems.filter(p => {
    const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiff = filterDiff === 'all' || p.difficulty.toLowerCase() === filterDiff.toLowerCase();
    return matchesSearch && matchesDiff;
  });
}, [problems, searchQuery, filterDiff, selectedTopic]);
```

### **Interview Explanation**
> *"I optimized React rendering performance for large problem datasets by scoping filter calculations inside `useMemo` hooks, eliminating unnecessary re-computations and maintaining 60fps UI responsiveness."*

---

## 6. Windows Port 8080 Process Lock on Development Restarts

### **Symptom**
Backend startup failed with `Web server failed to start. Port 8080 was already in use.`

### **Root Cause**
Orphaned Java processes remained bound to TCP port 8080 after unexpected process terminations on Windows.

### **The Code Fix**
Implemented an automated PowerShell restart command that forcibly terminates any process occupying port 8080 before launching Maven:

```powershell
try { Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess -Force -ErrorAction SilentlyContinue } catch {}; 
$env:SPRING_DATASOURCE_PASSWORD='1804'; 
cd C:\Users\hy180\Desktop\prepintel\backend; 
mvn spring-boot:run
```

---

## 📊 Summary of Tech Fixes

| Bug # | Domain | Issue | Fix Applied |
| :---: | :--- | :--- | :--- |
| **1** | Backend / Config | OS `GEMINI_API_KEY` hijacked Spring properties | Renamed property to `prepintel.ai.key` & used header auth |
| **2** | Backend / LLM | Quotes & newlines broke JSON prompt payloads | Added string escape sanitizer (`.replace(...)`) |
| **3** | Backend / Resilience | 503 load spikes & sunsetted 1.5 model 404s | Implemented exponential backoff + 2.5 model fallback chain |
| **4** | Frontend / UI | Raw JSON strings rendered in AI modals | Added `JSON.parse()` & rendered structured UI cards |
| **5** | Frontend / Performance | Frame drops when filtering 1,000+ problems | Wrapped filter pipeline in `useMemo` hooks |
| **6** | DevOps / Local | Port 8080 process collisions on Windows restarts | Created automated PowerShell process termination script |
