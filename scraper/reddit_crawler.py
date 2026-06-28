import json
import os
import time
import urllib.request
import urllib.parse

# Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
BACKEND_URL = "http://localhost:8080/api/reports/bulk"

SEARCH_QUERIES = [
    "Autodesk OA",
    "Infosys Specialist Programmer",
    "Infosys coding test",
    "Atlassian OA",
    "Microsoft OA",
    "Google Online Challenge",
    "Paytm OA coding"
]

SUBREDDITS = ["leetcode", "developersIndia", "cscareerquestions"]

# Use a custom, non-blocked User-Agent to query Reddit
REDDIT_HEADERS = {
    "User-Agent": "windows:prepintel-crawler:v1.0 (by /u/hiring_assistant)"
}

def query_gemini(prompt, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            text = res_json['candidates'][0]['content']['parts'][0]['text']
            return text
    except Exception as e:
        print(f"[ERROR] Gemini API call failed: {e}")
        return None

def fetch_reddit_search(query):
    print(f"[Scraper] Searching Reddit for: '{query}'...")
    encoded_query = urllib.parse.quote(query)
    url = f"https://www.reddit.com/search.json?q={encoded_query}&sort=new&limit=10"
    
    req = urllib.request.Request(url, headers=REDDIT_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get("data", {}).get("children", [])
    except Exception as e:
        print(f"[ERROR] Failed to fetch search from Reddit: {e}")
        return []

def fetch_comments(post_id):
    url = f"https://www.reddit.com/comments/{post_id}.json?limit=10"
    req = urllib.request.Request(url, headers=REDDIT_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            # Reddit comments are in the second object of the returned list
            comments = []
            if len(data) > 1:
                children = data[1].get("data", {}).get("children", [])
                for child in children:
                    body = child.get("data", {}).get("body", "")
                    if body:
                        comments.append(body)
            return "\n".join(comments[:5]) # Take top 5 comments
    except Exception as e:
        print(f"[WARNING] Failed to fetch comments for post {post_id}: {e}")
        return ""

def process_post(post, api_key):
    post_data = post.get("data", {})
    title = post_data.get("title", "")
    selftext = post_data.get("selftext", "")
    post_id = post_data.get("id", "")
    post_url = post_data.get("url", "")
    
    if not title:
        return
        
    print(f"[Parser] Processing post: '{title}'")
    comments = fetch_comments(post_id)
    
    prompt = f"""
    You are an expert technical recruiter analyzing recent interview experiences.
    Given this Reddit post detailing an Online Assessment or coding interview:

    Title: {title}
    Body: {selftext}
    Comments: {comments}

    Identify any coding questions discussed. For each question, extract:
    1. The company name (e.g. Autodesk, Infosys, etc.)
    2. The specific coding question name.
    3. The LeetCode ID and Title Slug if it matches a standard LeetCode problem. If it doesn't match, search your knowledge base to find the closest match. If none exists, assign a unique custom ID > 100000.
    4. Difficulty ('Easy', 'Medium', 'Hard').
    5. A brief summary of the question constraints and logic for the 'notes' field.

    Return a JSON array strictly matching this format (no markdown blocks, just raw JSON):
    [
      {{
        "companyName": "Company Name",
        "problemName": "Problem Title",
        "leetcodeId": 123,
        "titleSlug": "problem-title-slug",
        "difficulty": "Medium",
        "notes": "Summarized details here"
      }}
    ]
    """
    
    raw_json = query_gemini(prompt, api_key)
    if not raw_json:
        return
        
    try:
        parsed_reports = json.loads(raw_json)
        # Add source and date info
        for r in parsed_reports:
            r["source"] = "Reddit"
            r["notes"] = f"{r.get('notes', '')} (Source: {post_url})"
        return parsed_reports
    except Exception as e:
        print(f"[WARNING] Failed to parse Gemini response: {e}")
        return None

def send_to_backend(reports):
    if not reports:
        return
    
    payload = json.dumps(reports).encode('utf-8')
    req = urllib.request.Request(
        BACKEND_URL,
        data=payload,
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            print(f"[Backend] Successfully logged {len(reports)} scraped reports.")
    except Exception as e:
        print(f"[ERROR] Failed to post reports to backend: {e}")

def main():
    if not GEMINI_API_KEY:
        print("[ERROR] GEMINI_API_KEY environment variable is not set. Please set it before running the scraper.")
        return
        
    all_extracted_reports = []
    
    for query in SEARCH_QUERIES:
        posts = fetch_reddit_search(query)
        for post in posts:
            reports = process_post(post, GEMINI_API_KEY)
            if reports:
                all_extracted_reports.extend(reports)
            # Sleep to prevent rate-limiting from Reddit and Gemini
            time.sleep(2)
            
    if all_extracted_reports:
        print(f"[Scraper] Sending {len(all_extracted_reports)} reports to backend...")
        send_to_backend(all_extracted_reports)
    else:
        print("[Scraper] No new coding questions found.")

if __name__ == "__main__":
    main()
