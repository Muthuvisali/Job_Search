---
name: master-resume-maker
description: Tailors the user's original master resume to a specific job description for every shortlisted job (score at or above threshold), without changing, adding or inflating any experience, then saves it to Google Drive titled "<Job Role> - <Company> - <YYYY-MM-DD>" and links it in the tracker. Use when the user asks to tailor, customise or optimise a resume for a job, or as step 3 of /job-hunt.
---

# Master resume maker

Produce an ATS-friendly version of the master resume that **speaks the JD's language using only
facts already in the master resume**. Tailoring is selection, ordering and wording — never
invention.

## Inputs

- Master resume (`master_resume.drive_file_id` or `local_path`) — the single source of truth.
  Always start from the original, never from a previously tailored version.
- Tracker rows with `Status = Evaluated – Shortlisted` (or rows the user names), plus their
  `Matching Strengths`, `Gaps` and full JD.
- `google.resumes_folder_id`.

## The non-negotiables (truthfulness contract)

These are absolute. If following the JD would require breaking one, don't — note it in the
change log instead.

1. **Never change** employers, job titles, employment dates, locations, degrees, institutions,
   graduation dates, certifications, or contact details.
2. **Never add** a skill, tool, technology, project, responsibility, employer, metric, team
   size, budget, or outcome that is not in the master resume.
3. **Never inflate** numbers or scope ("helped" ≠ "led", "contributed to" ≠ "owned",
   "~20%" ≠ "25%", "team of 4" ≠ "team of 10").
4. **Never** add JD keywords the user lacks — not in the summary, not in skills, not hidden
   (no white text, no keyword stuffing blocks).
5. Every bullet in the output must map to a specific source bullet. Rewording is allowed;
   merging two source bullets is allowed; splitting is allowed; new claims are not.

## What you *may* change

- **Professional summary**: rewrite (2–4 lines) to foreground the experience most relevant to
  this role. You may name the target role title; don't claim years the dates don't support.
- **Bullet wording**: swap in the JD's terminology where it describes the *same* thing (e.g.
  source "built customer churn dashboards in Looker" → "built churn analytics dashboards (Looker)
  to drive retention" if the JD says "retention analytics"). Lead with the verb and the result.
- **Bullet order** inside each role: most relevant first.
- **Bullet selection**: drop low-relevance bullets (keep at least 2 per role; never drop a role).
- **Skills section**: reorder so JD-matching skills come first; remove irrelevant ones; group
  them under JD-style headings.
- **Section order**: e.g. move Projects or Certifications up if they are the strongest evidence.
- Length: keep to 1 page for < 8 years of experience, else max 2.

## Steps (per job)

1. Read the full JD and the evaluation's strengths/gaps.
2. Build a keyword map: JD term → matching master-resume evidence (or `none`). Only `≠ none`
   terms may be used.
3. Draft the tailored resume in clean, single-column, ATS-safe structure: Name & contact
   (include `candidate.portfolio_url` and `linkedin_url`), Summary, Skills, Experience,
   Projects (if any), Education, Certifications. No tables, text boxes, icons or images.
4. **Self-audit** before saving — go bullet by bullet and confirm each maps to a source bullet;
   diff all names, titles, dates and numbers against the master. Fix or remove anything that
   doesn't trace back. Run this audit every time; it's the point of the skill.
5. **Save to Drive** as a Google Doc in `google.resumes_folder_id` titled exactly:
   `<Job Title> - <Company> - <YYYY-MM-DD>` (today's date; use the JD's job title, strip
   characters `/\:*?"<>|`). If that name exists, append ` (v2)`, ` (v3)`… — never overwrite.
   Upload as HTML with `contentMimeType: text/html` so it converts to a formatted Google Doc.
6. Update tracker: `Tailored Resume Link`, `Tailored Resume File`, `Status = Resume Tailored`,
   `Last Updated`.
7. Report per job: link, top 3 changes made, and **gaps left unaddressed** (JD asks the user
   can't truthfully claim) so they can prepare to discuss them.

## Change log (always show to the user, never put in the resume)

```
Acme — Senior Product Manager — 2026-10-12
Reworded: 6 bullets · Reordered: Experience (Acme Corp), Skills · Removed: 3 low-relevance bullets
Keywords matched truthfully: roadmap, A/B testing, SQL, stakeholder management
Not claimed (no evidence): Kubernetes, healthcare domain
Audit: 18/18 bullets trace to master ✔ · dates/titles unchanged ✔
```
