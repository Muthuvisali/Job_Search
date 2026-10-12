---
description: One-time setup — create the config file, job tracker sheet, resumes folder and outreach log doc
---

Set up the Job Application Master pipeline for the user.

1. If `job-master.config.json` does not exist in the working directory, copy
   `${CLAUDE_PLUGIN_ROOT}/config/job-master.config.example.json` there. Then ask the user (in one
   message) for anything still blank or placeholder: name, email, phone, LinkedIn URL,
   **portfolio URL**, work authorization, target titles, locations, work modes, seniority,
   email provider (gmail/outlook), calendar provider (google/outlook), Calendly link, and their
   **original resume** (Google Drive link/file id, or a local file path).
2. Check connectors listed in `${CLAUDE_PLUGIN_ROOT}/CONNECTORS.md`. For any category with no
   working tool, tell the user exactly what to enable and continue with what works.
3. In Google Drive create (skip any whose id is already in the config):
   - Folder `Job Search` with subfolder `Tailored Resumes` → `google.resumes_folder_id`.
   - Google Sheet `Job Tracker` in `Job Search`, tab `Jobs`, header row exactly as in
     `${CLAUDE_PLUGIN_ROOT}/references/tracker-schema.md`, frozen first row →
     `google.tracker_sheet_id`.
   - Google Doc `LinkedIn Connection Notes` in `Job Search` with a short intro line →
     `google.outreach_doc_id`.
4. Read the master resume once and confirm back a 3-line summary (current title, years,
   top skills) so the user can verify it parsed correctly.
5. Save the config and print the three Drive links plus next steps: `/job-hunt`, then
   `/job-outreach`.

$ARGUMENTS
