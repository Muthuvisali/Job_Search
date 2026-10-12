# Job Application Master (Claude plugin)

A Claude Code / Cowork plugin that runs your job search as two connected workflows on top of a
Google Sheets tracker.

```
                    ┌──────────── Workflow 1: /job-hunt ────────────┐
 Firecrawl ──► job-scraper ──► Google Sheet ──► resume-jd-evaluation ──► score ≥ 75?
                                     ▲                                       │ yes
                                     │                                       ▼
                                     └──── link ◄── Google Drive ◄── master-resume-maker
                                                    "<Role> - <Company> - <date>"

                    ┌────────── Workflow 2: /job-outreach ──────────┐
 score ≥ 75 rows ──► linkedin-outreach ──► recruiters + hiring managers
                          ├──► Gmail / Outlook drafts (tailored resume attached + portfolio link)
                          └──► Google Doc log: date · company · job · connection-request note
```

## What's inside

| Type | Name | Does |
|---|---|---|
| Skill | `job-scraper` | Firecrawl search + scrape of job boards and career pages → new tracker rows, de-duplicated |
| Skill | `resume-jd-evaluation` | Evidence-based 0–100 fit score with breakdown, strengths, gaps → tracker |
| Skill | `master-resume-maker` | Tailors the original resume to the JD with a strict no-fabrication contract and self-audit → Drive |
| Skill | `linkedin-outreach` | Finds recruiters/hiring managers, drafts cold emails with resume + portfolio, logs connection notes to a Doc |
| Skill | `interview-scheduler` | Reply detection, availability drafts, Calendly link, calendar holds, follow-up reminders |
| Command | `/job-setup` | Creates config, tracker sheet, resumes folder and outreach Doc |
| Command | `/job-hunt` | Workflow 1 |
| Command | `/job-outreach` | Workflow 2 |
| Command | `/job-pipeline` | Both, with a confirmation step between them |

## Install

```bash
# in Claude Code
/plugin marketplace add muthuvisali/job_search
/plugin install job-application-master@job-search
```

Then follow [CONNECTORS.md](CONNECTORS.md) to authorise Google (Sheets/Docs/Drive), Gmail or
Outlook, Firecrawl and optionally Calendly, and run `/job-setup`.

## Guardrails

- **Truthful resumes**: titles, employers, dates, degrees and numbers are never changed; no
  skill or claim is added that isn't in your original resume; every bullet is audited back to
  the source before saving.
- **Nothing is sent automatically**: emails are drafts, connection requests are text in a Doc.
- **No LinkedIn scraping behind login**: people are found via public search results or a
  LinkedIn connector you add yourself.
- **Honest email addresses**: unverified (pattern-guessed) addresses are labelled as such.

## Configuration

All settings live in `job-master.config.json` in your working folder
(template: [`config/job-master.config.example.json`](config/job-master.config.example.json)).
The score threshold is `scoring.threshold` (default **75**). The tracker columns are defined in
[`references/tracker-schema.md`](references/tracker-schema.md).
