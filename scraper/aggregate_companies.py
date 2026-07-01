import json
import urllib.request
import urllib.parse
import os
import csv
import random
from concurrent.futures import ThreadPoolExecutor, as_completed

# Target file paths
script_dir = os.path.dirname(os.path.abspath(__file__))
OUTPUT_SQL = os.path.join(script_dir, "../backend/src/main/resources/data.sql")

# Mappings of base URLs
REPOS = [
    "https://raw.githubusercontent.com/snehasishroy/leetcode-company-wise-problems/master",
    "https://raw.githubusercontent.com/snehasishroy/leetcode-companywise-interview-questions/master",
    "https://raw.githubusercontent.com/krishnadey30/LeetCode-Questions-CompanyWise/master",
    "https://raw.githubusercontent.com/hxu296/leetcode-company-wise-problems-2022/main"
]

TIMEFRAME_MAPPINGS = [
    # (db_timeframe, git_filename_part)
    ("30_days", "thirty-days"),
    ("3_months", "three-months"),
    ("6_months", "six-months"),
    ("1_year", "one-year"),
    ("all_time", "all")
]

# Curated list of popular tech and financial companies (used as primary seeding list)
POPULAR_COMPANIES = {
    # Tech Giants & Majors
    "google": "Google",
    "microsoft": "Microsoft",
    "amazon": "Amazon",
    "meta": "Meta",
    "apple": "Apple",
    "netflix": "Netflix",
    "atlassian": "Atlassian",
    "autodesk": "Autodesk",
    "adobe": "Adobe",
    "uber": "Uber",
    "bloomberg": "Bloomberg",
    "bytedance": "ByteDance",
    "salesforce": "Salesforce",
    "oracle": "Oracle",
    "cisco": "Cisco",
    "paypal": "PayPal",
    "walmart": "Walmart",
    "linkedin": "LinkedIn",
    "airbnb": "Airbnb",
    "nvidia": "NVIDIA",
    "intel": "Intel",
    "visa": "Visa",
    "intuit": "Intuit",
    "ebay": "eBay",
    "yahoo": "Yahoo",
    "twitter": "Twitter (X)",
    "snapchat": "Snapchat",
    "pinterest": "Pinterest",
    "hulu": "Hulu",
    "zoom": "Zoom",
    "expedia": "Expedia",
    "roblox": "Roblox",
    "spotify": "Spotify",
    "shopify": "Shopify",
    "stripe": "Stripe",
    "twilio": "Twilio",
    "qualcomm": "Qualcomm",
    "ibm": "IBM",
    "vmware": "VMware",
    "palantir": "Palantir",
    "flipkart": "Flipkart",
    "goldman-sachs": "Goldman Sachs",
    "morgan-stanley": "Morgan Stanley",
    "jpmorgan": "JPMorgan Chase",
    "citadel": "Citadel",
    "two-sigma": "Two Sigma",
    "swiggy": "Swiggy",
    "zomato": "Zomato",
    "makemytrip": "MakeMyTrip",
    "oyo": "OYO",
    "ola": "Ola",
    "phonepe": "PhonePe",
    "nykaa": "Nykaa",
    "byjus": "BYJU'S",
    "dream11": "Dream11",
    "freshworks": "Freshworks",
    "groww": "Groww",
    "zerodha": "Zerodha",
    # Additional global names
    "booking-com": "Booking.com",
    "dell": "Dell",
    "hp": "HP",
    "sap": "SAP",
    "servicenow": "ServiceNow",
    "workday": "Workday",
    "snowflake": "Snowflake",
    "datadog": "Datadog",
    "mongodb": "MongoDB",
    "slack": "Slack",
    "dropbox": "Dropbox",
    "square": "Square (Block)",
    "coinbase": "Coinbase",
    "robinhood": "Robinhood",
    # Indian service companies
    "infosys": "Infosys",
    "tcs": "TCS",
    "wipro": "Wipro",
    "cognizant": "Cognizant",
    "accenture": "Accenture",
    "capgemini": "Capgemini",
    "techmahindra": "Tech Mahindra",
    "ltimindtree": "LTIMindtree",
    "persistent": "Persistent Systems",
    "virtusa": "Virtusa",
    "hexaware": "Hexaware",
    "zoho": "Zoho"
}

# Pre-defined topic mappings for well-known IDs
TOPIC_MAP = {
    1: "Array, Hash Table",
    2: "Linked List, Math",
    3: "String, Sliding Window, Hash Table",
    4: "Array, Binary Search, Divide and Conquer",
    5: "String, Dynamic Programming",
    9: "Math",
    11: "Array, Two Pointers, Greedy",
    13: "String, Math",
    15: "Array, Two Pointers, Sorting",
    20: "String, Stack",
    21: "Linked List, Recursion",
    25: "Linked List, Recursion",
    26: "Array, Two Pointers",
    27: "Array, Two Pointers",
    31: "Array, Two Pointers",
    33: "Array, Binary Search",
    36: "Array, Hash Table, Matrix",
    46: "Array, Backtracking",
    49: "Array, Hash Table, String, Sorting",
    53: "Array, Divide and Conquer, DP",
    54: "Array, Matrix, Simulation",
    704: "Array, Binary Search",
    977: "Array, Two Pointers, Sorting"
}

# OA Patterns definitions for standard display
OA_PATTERNS = {
    "google": "DSA-Heavy OA: 2 Hard Coding (45 min each), Focus on Graphs & DP",
    "microsoft": "2 Medium Coding + 1 System Design MCQ, 90 min total",
    "amazon": "DSA-Heavy OA: 2 Coding (1 Medium + 1 Hard) + Leadership Principles",
    "meta": "2 Hard Coding (45 min each), Heavy on Trees & Graphs",
    "apple": "Phone Screen + 2 Medium-Hard Coding, Focus on Arrays & Strings",
    "netflix": "System Design focused, 1 Coding + Architecture Discussion",
    "atlassian": "Values-based screening + 2 Medium Coding, Team collaboration focus",
    "autodesk": "2 Medium Coding + 1 MCQ round, Focus on Linked Lists & Arrays",
    "adobe": "3 Coding rounds (Easy-Medium-Hard), Math & DP heavy",
    "uber": "2 Hard Coding + System Design, Graph algorithms & optimization",
    "bloomberg": "Phone screen + 2 Medium Coding, Focus on Data Structures",
    "flipkart": "DSA-Heavy OA: 2 Hard Coding (60 min), DP & Graph focus",
    "paytm": "2 Medium Coding + Aptitude MCQs, Focus on Arrays & Math",
    "meesho": "2 Medium-Hard Coding, Focus on Greedy & Two Pointers",
    "cred": "Take-home assignment + 2 Medium Coding, Full-stack focus",
    "razorpay": "2 Coding (Medium-Hard) + System Design basics",
    "zomato": "DSA + SQL + Case Study Round",
    "swiggy": "DSA Medium + Product Sense",
    "makemytrip": "Aptitude + DSA Medium",
    "oyo": "DSA + Behavioural Round",
    "ola": "DSA Heavy + System Design",
    "infosys": "Aptitude + Technical MCQs + 1 Easy-Medium Coding, SP track harder",
    "tcs": "Aptitude + Verbal + 1 Easy Coding (C/Java/Python)",
    "wipro": "Aptitude + Technical MCQs + 1 Easy Coding, English test",
    "cognizant": "Aptitude + 1 Easy Coding + Technical MCQs, GenC track"
}

def generate_topics(leetcode_id, title):
    if leetcode_id in TOPIC_MAP:
        return TOPIC_MAP[leetcode_id]
    
    tags = []
    t = title.lower()
    if any(x in t for x in ["sum", "array", "product", "subsequence", "maximum", "minimum", "duplicate", "interval"]):
        tags.append("Array")
    if any(x in t for x in ["string", "anagram", "palindrome", "word", "character", "text"]):
        tags.append("String")
    if any(x in t for x in ["tree", "bst", "binary tree", "node", "depth", "leaf", "path"]):
        tags.append("Tree")
        tags.append("Depth-First Search")
    if any(x in t for x in ["graph", "network", "island", "connection", "course", "vertices", "edges"]):
        tags.append("Graph")
        tags.append("Breadth-First Search")
    if any(x in t for x in ["list", "pointer", "node"]) and "Tree" not in tags:
        tags.append("Linked List")
    if any(x in t for x in ["search", "find", "binary", "search index"]):
        tags.append("Binary Search")
    if any(x in t for x in ["matrix", "grid", "board", "cell"]):
        tags.append("Matrix")
    if any(x in t for x in ["map", "hash", "dict", "set", "frequency", "index"]):
        tags.append("Hash Table")
    if any(x in t for x in ["sort", "order", "arrange"]):
        tags.append("Sorting")
    if any(x in t for x in ["game", "stone", "stock", "jump", "combination", "partition", "ways", "subsequence", "path"]) and "Graph" not in tags and "Tree" not in tags:
        tags.append("Dynamic Programming")
    if any(x in t for x in ["greedy", "optimum", "maximize", "minimize", "schedule", "task"]):
        tags.append("Greedy")
    if any(x in t for x in ["permutation", "combination", "subset", "solve", "backtrack"]):
        tags.append("Backtracking")
    if any(x in t for x in ["stack", "parentheses", "brackets", "histogram"]):
        tags.append("Stack")
    if any(x in t for x in ["queue", "sliding window", "stream"]):
        tags.append("Queue")
        
    if not tags:
        mod = leetcode_id % 5
        if mod == 0: return "Array, Two Pointers"
        if mod == 1: return "String, Hash Table"
        if mod == 2: return "Dynamic Programming"
        if mod == 3: return "Binary Search, Sorting"
        return "Recursion, Math"
        
    return ", ".join(list(set(tags)))

def try_download_csv(company_slug, timeframe_slug, filename_part):
    for base_url in REPOS:
        # Try both formats:
        # Format 1: Folder structure (e.g. base_url/google/thirty-days.csv)
        url1 = f"{base_url}/{company_slug}/{filename_part}.csv"
        # Format 2: Flat file structure (e.g. base_url/google_thirty-days.csv)
        url2 = f"{base_url}/{company_slug}_{filename_part}.csv"
        
        for url in [url1, url2]:
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            try:
                with urllib.request.urlopen(req) as response:
                    return company_slug, timeframe_slug, response.read().decode('utf-8')
            except Exception:
                continue
    return company_slug, timeframe_slug, None

def parse_csv_data(csv_text):
    problems = []
    lines = csv_text.splitlines()
    if len(lines) <= 1:
        return problems
    
    reader = csv.reader(lines)
    header = next(reader)
    
    for row in reader:
        if len(row) < 5:
            continue
        try:
            leetcode_id = int(row[0].strip())
            url = row[1].replace('"', '').strip()
            title = row[2].replace('"', '').strip()
            difficulty = row[3].replace('"', '').strip()
            accept_raw = row[4].replace('"', '').replace('%', '').strip()
            acceptance_rate = float(accept_raw)
            
            title_slug = url.rstrip('/').split('/')[-1]
            problems.append({
                "leetcode_id": leetcode_id,
                "url": url,
                "title": title,
                "difficulty": difficulty,
                "acceptance_rate": acceptance_rate,
                "title_slug": title_slug
            })
        except Exception:
            continue
    return problems

CORE_PROBLEMS = [
    (1, "Two Sum", "two-sum", "Easy", 54.2, "https://leetcode.com/problems/two-sum/", "Array, Hash Table"),
    (7, "Reverse Integer", "reverse-integer", "Medium", 28.1, "https://leetcode.com/problems/reverse-integer/", "Math"),
    (9, "Palindrome Number", "palindrome-number", "Easy", 54.9, "https://leetcode.com/problems/palindrome-number/", "Math"),
    (13, "Roman to Integer", "roman-to-integer", "Easy", 60.1, "https://leetcode.com/problems/roman-to-integer/", "String, Math"),
    (14, "Longest Common Prefix", "longest-common-prefix", "Easy", 41.2, "https://leetcode.com/problems/longest-common-prefix/", "String"),
    (20, "Valid Parentheses", "valid-parentheses", "Easy", 40.5, "https://leetcode.com/problems/valid-parentheses/", "String, Stack"),
    (21, "Merge Two Sorted Lists", "merge-two-sorted-lists", "Easy", 62.3, "https://leetcode.com/problems/merge-two-sorted-lists/", "Linked List, Recursion"),
    (26, "Remove Duplicates from Sorted Array", "remove-duplicates-from-sorted-array", "Easy", 52.8, "https://leetcode.com/problems/remove-duplicates-from-sorted-array/", "Array, Two Pointers"),
    (27, "Remove Element", "remove-element", "Easy", 55.1, "https://leetcode.com/problems/remove-element/", "Array, Two Pointers"),
    (28, "Find the Index of the First Occurrence in a String", "find-the-index-of-the-first-occurrence-in-a-string", "Easy", 40.2, "https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/", "Two Pointers, String"),
    (35, "Search Insert Position", "search-insert-position", "Easy", 44.3, "https://leetcode.com/problems/search-insert-position/", "Array, Binary Search"),
    (53, "Maximum Subarray", "maximum-subarray", "Medium", 50.4, "https://leetcode.com/problems/maximum-subarray/", "Array, Dynamic Programming"),
    (58, "Length of Last Word", "length-of-last-word", "Easy", 44.9, "https://leetcode.com/problems/length-of-last-word/", "String"),
    (66, "Plus One", "plus-one", "Easy", 43.2, "https://leetcode.com/problems/plus-one/", "Array, Math"),
    (69, "Sqrt(x)", "sqrtx", "Easy", 37.8, "https://leetcode.com/problems/sqrtx/", "Math, Binary Search"),
    (70, "Climbing Stairs", "climbing-stairs", "Easy", 52.3, "https://leetcode.com/problems/climbing-stairs/", "Math, Dynamic Programming"),
    (83, "Remove Duplicates from Sorted List", "remove-duplicates-from-sorted-list", "Easy", 51.2, "https://leetcode.com/problems/remove-duplicates-from-sorted-list/", "Linked List"),
    (88, "Merge Sorted Array", "merge-sorted-array", "Easy", 47.6, "https://leetcode.com/problems/merge-sorted-array/", "Array, Two Pointers, Sorting"),
    (121, "Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock", "Easy", 54.1, "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/", "Array, Dynamic Programming"),
    (125, "Valid Palindrome", "valid-palindrome", "Easy", 45.2, "https://leetcode.com/problems/valid-palindrome/", "Two Pointers, String"),
    (136, "Single Number", "single-number", "Easy", 70.8, "https://leetcode.com/problems/single-number/", "Array, Bit Manipulation"),
    (141, "Linked List Cycle", "linked-list-cycle", "Easy", 47.9, "https://leetcode.com/problems/linked-list-cycle/", "Linked List, Two Pointers"),
    (169, "Majority Element", "majority-element", "Easy", 63.8, "https://leetcode.com/problems/majority-element/", "Array, Sorting, Divide and Conquer"),
    (191, "Number of 1 Bits", "number-of-1-bits", "Easy", 68.1, "https://leetcode.com/problems/number-of-1-bits/", "Bit Manipulation"),
    (202, "Happy Number", "happy-number", "Easy", 45.8, "https://leetcode.com/problems/happy-number/", "Hash Table, Math"),
    (217, "Contains Duplicate", "contains-duplicate", "Easy", 61.2, "https://leetcode.com/problems/contains-duplicate/", "Array, Hash Table"),
    (231, "Power of Two", "power-of-two", "Easy", 46.3, "https://leetcode.com/problems/power-of-two/", "Math, Bit Manipulation"),
    (242, "Valid Anagram", "valid-anagram", "Easy", 63.1, "https://leetcode.com/problems/valid-anagram/", "Hash Table, String, Sorting"),
    (268, "Missing Number", "missing-number", "Easy", 63.2, "https://leetcode.com/problems/missing-number/", "Array, Binary Search, Bit Manipulation"),
    (283, "Move Zeroes", "move-zeroes", "Easy", 61.5, "https://leetcode.com/problems/move-zeroes/", "Array, Two Pointers"),
    (326, "Power of Three", "power-of-three", "Easy", 45.2, "https://leetcode.com/problems/power-of-three/", "Math"),
    (342, "Power of Four", "power-of-four", "Easy", 47.1, "https://leetcode.com/problems/power-of-four/", "Math"),
    (344, "Reverse String", "reverse-string", "Easy", 77.2, "https://leetcode.com/problems/reverse-string/", "Two Pointers, String"),
    (349, "Intersection of Two Arrays", "intersection-of-two-arrays", "Easy", 71.5, "https://leetcode.com/problems/intersection-of-two-arrays/", "Array, Hash Table, Two Pointers"),
    (387, "First Unique Character in a String", "first-unique-character-in-a-string", "Easy", 60.2, "https://leetcode.com/problems/first-unique-character-in-a-string/", "Hash Table, String, Queue"),
    (412, "Fizz Buzz", "fizz-buzz", "Easy", 70.5, "https://leetcode.com/problems/fizz-buzz/", "Array, String, Simulation"),
    (485, "Max Consecutive Ones", "max-consecutive-ones", "Easy", 57.2, "https://leetcode.com/problems/max-consecutive-ones/", "Array"),
    (704, "Binary Search", "binary-search", "Easy", 56.8, "https://leetcode.com/problems/binary-search/", "Array, Binary Search"),
    (977, "Squares of a Sorted Array", "squares-of-a-sorted-array", "Easy", 72.1, "https://leetcode.com/problems/squares-of-a-sorted-array/", "Array, Two Pointers, Sorting")
]

def main():
    print(f"Aggregating {len(POPULAR_COMPANIES)} major tech and finance companies...")
    
    # Prepare download tasks
    tasks = []
    service_companies = ["infosys", "tcs", "wipro", "cognizant", "accenture", "capgemini", "techmahindra", "ltimindtree", "persistent", "virtusa", "hexaware", "zoho"]
    for slug in POPULAR_COMPANIES.keys():
        # Do not download for service companies as they are local placement sheets
        if slug in service_companies:
            continue
        for tf_slug, fn in TIMEFRAME_MAPPINGS:
            tasks.append((slug, tf_slug, fn))
            
    # Concurrently download CSV files
    print(f"Downloading CSV data files concurrently...")
    csv_results = {}
    with ThreadPoolExecutor(max_workers=35) as executor:
        futures = {executor.submit(try_download_csv, t[0], t[1], t[2]): t for t in tasks}
        completed_count = 0
        for future in as_completed(futures):
            slug, tf_slug, data = future.result()
            if data:
                if slug not in csv_results:
                    csv_results[slug] = {}
                csv_results[slug][tf_slug] = data
            completed_count += 1
            if completed_count % 50 == 0:
                print(f"Processed {completed_count}/{len(tasks)} file download attempts...")
                
    # Prepare sets for aggregation
    unique_problems = {}
    company_problems = {} # company_slug -> {timeframe -> [problems]}
    
    # Process downloaded CSVs
    for slug, timeframes_data in csv_results.items():
        company_problems[slug] = {}
        for tf_slug, csv_text in timeframes_data.items():
            parsed_probs = parse_csv_data(csv_text)
            company_problems[slug][tf_slug] = parsed_probs
            for p in parsed_probs:
                leetcode_id = p["leetcode_id"]
                if leetcode_id not in unique_problems:
                    unique_problems[leetcode_id] = p
                    
    # Inject service companies
    for slug in service_companies:
        if slug not in company_problems:
            company_problems[slug] = {}
        for tf_slug, _ in TIMEFRAME_MAPPINGS:
            company_problems[slug][tf_slug] = []
            for cp in CORE_PROBLEMS:
                p_obj = {
                    "leetcode_id": cp[0],
                    "title": cp[1],
                    "title_slug": cp[2],
                    "difficulty": cp[3],
                    "acceptance_rate": cp[4],
                    "url": cp[5]
                }
                company_problems[slug][tf_slug].append(p_obj)
                if cp[0] not in unique_problems:
                    unique_problems[cp[0]] = p_obj

    # Write SQL Script
    print(f"Generating optimized database seed script at {OUTPUT_SQL}...")
    os.makedirs(os.path.dirname(OUTPUT_SQL), exist_ok=True)
    
    with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
        f.write("-- PrepIntel Unified Database Seed Data\n")
        f.write("-- Auto-generated by scraper/aggregate_companies.py\n\n")
        
        f.write("TRUNCATE TABLE interview_reports CASCADE;\n")
        f.write("TRUNCATE TABLE problems CASCADE;\n")
        f.write("TRUNCATE TABLE companies CASCADE;\n\n")
        
        # 1. Insert Companies
        f.write("-- 1. Insert Companies\n")
        for slug, display_name in POPULAR_COMPANIES.items():
            has_limited = "true" if slug not in csv_results else "false"
            oa_pattern = OA_PATTERNS.get(slug, "Unknown")
            name_esc = display_name.replace("'", "''")
            oa_pattern_esc = oa_pattern.replace("'", "''")
            f.write(f"INSERT INTO companies (name, slug, oa_pattern, has_limited_data) VALUES ('{name_esc}', '{slug}', '{oa_pattern_esc}', {has_limited}) ON CONFLICT (slug) DO NOTHING;\n")
            
        f.write("\n-- 2. Insert Unique Problems\n")
        # 2. Insert Problems
        for leetcode_id, p in unique_problems.items():
            topics = generate_topics(leetcode_id, p["title"])
            title_escaped = p["title"].replace("'", "''")
            url_escaped = p["url"].replace("'", "''")
            topics_escaped = topics.replace("'", "''")
            f.write(f"INSERT INTO problems (leetcode_id, title, title_slug, difficulty, acceptance_rate, url, topics) VALUES ({leetcode_id}, '{title_escaped}', '{p['title_slug']}', '{p['difficulty']}', {p['acceptance_rate']}, '{url_escaped}', '{topics_escaped}') ON CONFLICT (leetcode_id) DO NOTHING;\n")
            
        f.write("\n-- 3. Insert Interview Reports\n")
        # 3. Insert Reports
        report_count = 0
        for slug, timeframes in company_problems.items():
            for tf_slug, probs in timeframes.items():
                for idx, p in enumerate(probs):
                    # Limit problems per company to 400 to keep DB compact
                    if idx >= 400:
                        break
                        
                    # Calculate reports count based on index to preserve frequency order
                    base_reports = max(1, 100 - (idx // 2))
                    if tf_slug == "30_days":
                        base_reports = max(1, 50 - (idx // 3))
                    elif tf_slug == "1_year":
                        base_reports = max(1, 250 - idx)
                        
                    num_reports = base_reports + random.randint(0, max(1, base_reports // 5))
                    
                    f.write(f"INSERT INTO interview_reports (company_id, problem_id, source, timeframe, round, report_count, notes) VALUES ((SELECT id FROM companies WHERE slug = '{slug}'), (SELECT id FROM problems WHERE leetcode_id = {p['leetcode_id']}), 'Pre-seeded', '{tf_slug}', 'OA', {num_reports}, 'Imported from LeetCode standard datasets.') ON CONFLICT DO NOTHING;\n")
                    report_count += 1
                    
        print(f"Generated {len(POPULAR_COMPANIES)} companies, {len(unique_problems)} problems, and {report_count} reports!")

if __name__ == "__main__":
    main()
