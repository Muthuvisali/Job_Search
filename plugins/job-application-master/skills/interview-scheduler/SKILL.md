---
name: interview-scheduler
description: Handles the scheduling side of the pipeline — detects recruiter replies and interview invites in Gmail/Outlook, proposes free slots from Google or Outlook Calendar, shares the user's Calendly link, creates calendar holds and follow-up reminders, and updates the tracker. Use when the user asks to schedule an interview, reply with availability, check for recruiter replies, or set follow-up reminders.
---

# Interview scheduler

## Inputs

- `scheduling.calendar_provider` (`google` | `outlook`), `scheduling.timezone`,
  `scheduling.calendly_link`, `outreach.email_provider`.
- Tracker rows with `Status` in `Outreach Drafted`, `Applied`, `Interviewing`.

## Workflows

### A. Check for replies
1. Search the mailbox (last 14 days) for threads from tracked companies' domains or contacts in
   the `Contacts` column, and for subjects like "interview", "next steps", "availability".
2. Classify: interview request · rejection · info request · auto-reply.
3. Update tracker `Status` (`Interviewing` / `Rejected`) — only forward per the status flow — and
   summarise for the user.

### B. Reply with availability (draft only)
1. Read free/busy for the next 5 business days in `scheduling.timezone`, 9:00–17:00, skipping
   existing events and leaving 15-minute buffers.
2. Offer 3–4 slots of the requested length in the recruiter's timezone if stated (show both).
3. If `calendly_link` is set, offer it as the alternative, or create a single-use link via the
   scheduling-link tool if available.
4. Create a **reply draft** in the thread. Never send.

### C. Confirmed interview
1. Create a calendar event: title `Interview – <Company> – <Job Title> (<stage>)`, include the
   meeting link, interviewer names, Job URL and Tailored Resume Link in the description, with a
   60- and 15-minute reminder. Do not invite external attendees unless the user asks.
2. Add a 45-minute prep block the day before.

### D. Follow-up reminders
For rows `Outreach Drafted`/`Applied` with no reply after 7 days, create an all-day
`Follow up: <Company> – <Job Title>` event (or a Gmail draft follow-up if the user prefers).

## Rules
- Never accept/decline invites or send email without explicit user confirmation.
- Respect existing events; never move or delete them.
