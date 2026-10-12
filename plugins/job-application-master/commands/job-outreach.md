---
description: Workflow 2 — find recruiters and hiring managers for 75+ jobs, draft cold emails with the tailored resume, and log LinkedIn connection notes
argument-hint: "[optional: company names or Job IDs to limit to]"
---

Run **Workflow 2** of Job Application Master. Read `job-master.config.json`.

Select tracker rows with `Fit Score ≥ scoring.threshold` and `Status = Resume Tailored`
(limit to these companies / Job IDs if given: $ARGUMENTS). If a qualifying row has no tailored
resume yet, run the `master-resume-maker` skill for it first.

For each row, use the `linkedin-outreach` skill to:
1. Find the recruiter(s) and hiring manager (max `outreach.max_contacts_per_company`).
2. Create cold-email **drafts** (Gmail or Outlook per config) with the tailored resume attached
   and the portfolio link in the body and signature.
3. Append the LinkedIn connection-request notes to the outreach Google Doc with the date,
   company and job.
4. Update the tracker (`Contacts`, `Email Drafts`, `Connection Notes`, `Outreach Date`,
   `Status = Outreach Drafted`).

Nothing is sent. End with a per-company table (Person · Role · Email status · Draft link), the
outreach Doc link, and a reminder to review and send manually.
