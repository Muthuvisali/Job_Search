# Job tracker schema

The tracker is one Google Sheet with a tab named by `google.tracker_tab` (default `Jobs`).
Row 1 is the header row below, in this exact order. Every skill reads and writes columns **by
header name**, never by position, so adding extra columns on the right is safe.

| # | Header | Written by | Notes |
|---|---|---|---|
| A | Job ID | job-scraper | `<company-slug>-<title-slug>-<8-char hash of canonical URL>` — the dedup key |
| B | Date Found | job-scraper | `YYYY-MM-DD` |
| C | Source | job-scraper | e.g. `greenhouse`, `lever`, `linkedin`, `indeed`, `career-page` |
| D | Company | job-scraper | |
| E | Job Title | job-scraper | As written in the posting |
| F | Location | job-scraper | |
| G | Work Mode | job-scraper | `remote` / `hybrid` / `onsite` / `unknown` |
| H | Posted Date | job-scraper | `YYYY-MM-DD` or blank if unknown |
| I | Job URL | job-scraper | Canonical apply/posting URL (tracking params stripped) |
| J | JD Summary | job-scraper | ≤ 600 chars: must-haves, nice-to-haves, years, salary if stated |
| K | JD Doc Link | job-scraper | Optional Drive link to full JD text (when JD > 600 chars) |
| L | Status | all | See status flow below |
| M | Fit Score | resume-jd-evaluation | Integer 0–100 |
| N | Score Breakdown | resume-jd-evaluation | `Skills 30/35 · Exp 16/20 · Domain 10/15 · Resp 12/15 · Pref 6/10 · Logistics 5/5` |
| O | Matching Strengths | resume-jd-evaluation | Top 3–5, comma-separated |
| P | Gaps | resume-jd-evaluation | Honest gaps, comma-separated |
| Q | Evaluation Notes | resume-jd-evaluation | 1–2 sentences, incl. any hard-cap reason |
| R | Tailored Resume Link | master-resume-maker | Drive URL of the Google Doc |
| S | Tailored Resume File | master-resume-maker | File title, e.g. `Senior PM - Acme - 2026-10-12` |
| T | Contacts | linkedin-outreach | `Name (Role) <profile URL>` separated by ` ; ` |
| U | Email Drafts | linkedin-outreach | `Name → draft link [verified\|unverified email]` separated by ` ; ` |
| V | Connection Notes | linkedin-outreach | Link to the outreach Google Doc (+ heading anchor if available) |
| W | Outreach Date | linkedin-outreach | `YYYY-MM-DD` |
| X | Last Updated | all | ISO timestamp |

## Status flow

```
New ──► Evaluated – Below Threshold          (score < threshold, stop)
   └──► Evaluated – Shortlisted ──► Resume Tailored ──► Outreach Drafted ──► Applied ──► Interviewing ──► Offer / Rejected / Closed
```

Also allowed: `Skipped – Duplicate`, `Skipped – Expired`, `Error – <short reason>`.
Skills only move a row **forward**; they never overwrite a status the user set manually that is
later in the flow (e.g. never reset `Applied` back to `Resume Tailored`).

## Fallback without a Sheets edit tool

If no spreadsheet tool can update cells, write the full tracker as CSV (same headers) and
create a new Google Sheet titled `Job Tracker - YYYY-MM-DD HHmm` in the resumes folder's parent,
then tell the user the new link and save its id as `google.tracker_sheet_id`.
