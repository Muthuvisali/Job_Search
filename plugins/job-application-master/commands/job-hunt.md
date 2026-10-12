---
description: Workflow 1 — scrape jobs, score fit, and tailor resumes for every job scoring at or above the threshold
argument-hint: "[optional overrides, e.g. 'titles: Data Analyst; location: Remote; limit 20']"
---

Run **Workflow 1** of Job Application Master. Read `job-master.config.json` (if missing, run the
`/job-setup` steps first). Apply any overrides from: $ARGUMENTS

1. **Scrape** — use the `job-scraper` skill to add new jobs to the tracker (`Status = New`).
2. **Evaluate** — use the `resume-jd-evaluation` skill on all `New` rows. Rows at or above
   `scoring.threshold` (default 75) become `Evaluated – Shortlisted`.
3. **Tailor** — use the `master-resume-maker` skill on every `Evaluated – Shortlisted` row. Each
   resume is saved to the Tailored Resumes folder as `<Job Title> - <Company> - <YYYY-MM-DD>`
   and linked in the tracker.

Process jobs in order of score (highest first). If a step fails for one job, set its status to
`Error – <reason>` and continue with the rest.

Finish with one summary: jobs found → evaluated → shortlisted → resumes created, a table of the
shortlisted jobs (Score · Company · Title · Resume link), the tracker link, and the suggestion to
run `/job-outreach` next.
