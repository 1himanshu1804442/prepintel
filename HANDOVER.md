# PrepIntel Handover

## Goal

Turn PrepIntel into a resume-worthy placement-intelligence platform whose data is **dated, attributable, role-specific, and transparent about freshness**. The immediate milestone was to stop historical/overlapping imports from being presented as recent interview trends, and to add an animated landing page.

## Work completed

### 1. Trustworthy interview-report data foundation

The old system relied on overlapping bucket labels (`30_days`, `3_months`, `6_months`, `all_time`) and summed them. That could inflate counts because a problem could occur in multiple nested buckets. `date_reported` also meant when the application stored a record, not necessarily the date a candidate encountered the question.

Implemented changes:

- Replaced destructive startup DDL in `backend/src/main/resources/schema.sql` with idempotent `CREATE ... IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements.
- Added report fields:
  - `reported_at` (the actual candidate/interview date)
  - `role`
  - `batch_year`
  - `drive_type`
  - `source_url`
  - `source_type`
  - `verification_status`
  - `verified_at`
- Added indexes for report date, company/role/date, and verification status.
- Expanded `InterviewReport` entity to expose those fields.
- Added `InterviewReportRankingService`.
  - Uses `reported_at` for `30_days`, `3_months`, `6_months`, and `1_year` filters.
  - Undated legacy data is allowed only in the all-time view; it cannot appear as recent.
  - Deduplicates legacy evidence across overlapping buckets, taking the strongest source aggregate instead of summing all nested windows.
  - Deduplicates dated evidence by company, problem, date, role, round, and source identity.
  - Weights dated reports with exponential recency decay and a modest verification multiplier.
  - Returns `recentReportCount`, `lastVerifiedAt`, `dataFreshnessLabel`, `weightedScore`, and a relative frequency score.
- Replaced the old overlapping ranking queries with fetched report data plus the ranking service.
- Updated company and global problem endpoints to expose the new freshness metadata.
- Updated report-submission payloads so new user and bulk submissions can include the new metadata. New submissions default to `PENDING_REVIEW`; they are not auto-claimed as verified.

### 2. Tests

Added `backend/src/test/java/com/prepintel/service/InterviewReportRankingServiceTest.java`.

It verifies:

1. Overlapping legacy buckets do not get summed together.
2. Undated legacy records do not appear in recent filters.
3. Verified recent reports rank ahead of older evidence and return freshness metadata.
4. Exact role/date filtering works.

Verification run:

```powershell
cd backend
mvn test
```

Result: **BUILD SUCCESS**, 3 tests passing.

### 3. Dashboard honesty improvements

`frontend/src/Dashboard.jsx` now:

- Replaces a sample-size-based "confidence" idea with explicit evidence counters.
- Shows reports from the last 90 days and number of verified signals in the header.
- Rephrases limited-data copy so legacy data is not advertised as current.
- Displays per-problem freshness labels, for example `Verified in the last 30 days` or `Historical data; interview date unverified`.

### 4. Landing page / hero

Rebuilt `frontend/src/LandingPage.jsx` and routed `/` to it in `frontend/src/App.jsx`.

The hero uses a CSS/React 3D-style **Evidence Prism**, rather than a heavy WebGL library:

- Mouse-responsive 3D tilt.
- Orbiting evidence signals.
- Layered report cards that communicate verified recency, rising topics, and a practice queue.
- Responsive/mobile styling and `prefers-reduced-motion` fallback.
- Landing copy explicitly avoids unsupported claims such as "updated daily" or universal 2026 patterns.

The related CSS is in `frontend/src/index.css` under `Landing page: evidence prism`.

Verification run:

```powershell
cd frontend
npm run build
```

Result: **BUILD SUCCESS**.

## Current local process

A Vite development server was started for visual review:

- URL: `http://127.0.0.1:4173/`
- It was started as a hidden process and was listening on port `4173` at handover time.

Stop it when no longer needed:

```powershell
Get-NetTCPConnection -LocalPort 4173 -State Listen |
  Select-Object -ExpandProperty OwningProcess |
  Stop-Process
```

## Important limitations still remaining

1. Existing `data.sql` data is legacy and usually has no actual `reported_at` evidence. It will therefore appear only in all-time views until a real dated source/import is added.
2. Existing CSV ingestion in `ScopedDataIngestionService` still imports bucketed legacy data. It needs a deliberate source adapter that can provide actual dates, role, drive type, and source URLs.
3. There is no authentication or moderation UI yet. New reports are only marked `PENDING_REVIEW` at the backend level.
4. No Flyway/Liquibase migration system is present yet. The idempotent SQL prevents data drops, but a production project should move the schema to versioned migrations next.
5. User solved state is still held in browser `localStorage`; it is not yet a user account/progress system.
6. `JobController` and `Dashboard.jsx` remain large and should be split as features grow.
7. No end-to-end API/database test exists yet—only ranking-unit coverage.

## Recommended next milestone

### Milestone 2: verified-report submission and moderation

Build this before adding more AI features.

1. Add Spring Security JWT authentication and `USER`, `MODERATOR`, `ADMIN` roles.
2. Build a submit-report form that requires:
   - company
   - role
   - drive type
   - observed date
   - round
   - source URL or evidence note
3. Create a moderator screen/API to approve/reject reports and set `verified_at`.
4. Add a composite duplicate rule/database constraint where feasible.
5. Add integration tests using PostgreSQL/Testcontainers or a dedicated test database.
6. Add a role filter to the dashboard query and UI.

## Useful API contract now available

Company problem endpoint:

```text
GET /api/companies/{slug}/problems?timeframe=30_days&role=DSE
```

Each problem now includes fields like:

```json
{
  "id": 1,
  "title": "Two Sum",
  "reportCount": 4,
  "recentReportCount": 3,
  "frequencyPercent": 100,
  "weightedScore": 3.2,
  "lastVerifiedAt": "2026-07-12",
  "dataFreshnessLabel": "Verified in the last 30 days"
}
```

For legacy imported records, `lastVerifiedAt` is null and the UI should show a historical/unverified freshness label instead of a current-pattern claim.

## Files changed or added during this session

- `backend/src/main/resources/schema.sql`
- `backend/src/main/java/com/prepintel/entity/InterviewReport.java`
- `backend/src/main/java/com/prepintel/repository/InterviewReportRepository.java`
- `backend/src/main/java/com/prepintel/service/InterviewReportRankingService.java` (new)
- `backend/src/main/java/com/prepintel/controller/JobController.java`
- `backend/src/test/java/com/prepintel/service/InterviewReportRankingServiceTest.java` (new)
- `frontend/src/Dashboard.jsx`
- `frontend/src/LandingPage.jsx`
- `frontend/src/index.css`
- `frontend/src/App.jsx`

## Resume claim status

Safe to claim after deployment and a real dated-data workflow exists:

> Built a placement-intelligence platform that ranks company-specific coding questions using deduplicated, recency-weighted interview reports and explicit data-freshness metadata.

Do **not** yet claim verified 2026 data coverage, production authentication, deployment, CI, or broad test coverage.
