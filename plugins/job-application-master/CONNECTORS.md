# Connectors

Skills in this plugin refer to tools by **category**, not by server name, so they keep working
whichever concrete connector you have enabled. This table maps each category to what the plugin
ships in `.mcp.json` and the alternatives you can use instead.

| Category | Used for | Bundled server | Alternatives |
|---|---|---|---|
| **web-scraper** | Search job boards, scrape JDs, find public recruiter profiles | `firecrawl` (OAuth, hosted) | Any Firecrawl key-based setup |
| **spreadsheet** | Job tracker: add rows, update scores/status | `google-workspace` (Sheets tools) | Any Google Sheets MCP |
| **document** | Read the master resume, write tailored resumes, append connection notes | `google-workspace` (Docs tools) | Google Drive connector (create-only, see below) |
| **file-storage** | Save tailored resumes in a Drive folder, export PDF/DOCX | `google-workspace` (Drive tools) | claude.ai **Google Drive** connector |
| **email** | Create cold-email drafts with the resume attached | `gmail` | `ms365` (Outlook mail) |
| **calendar** | Interview scheduling, follow-up reminders | `google-calendar` | `ms365` (Outlook calendar) |
| **scheduling-link** | Share availability / booking links | `calendly` | — |
| **professional-network** | Look up recruiters / hiring managers | *none bundled* | A LinkedIn MCP you trust, otherwise public search via **web-scraper** |

## Why `google-workspace` is bundled

The hosted Google Drive connector can **create** Docs and Sheets but cannot **edit** an existing
file's contents. The tracker needs row updates and the outreach log needs appends, so the plugin
bundles the open-source [`workspace-mcp`](https://github.com/taylorwilsdon/google_workspace_mcp)
server (Sheets + Docs + Drive). It needs a Google Cloud OAuth client:

1. In Google Cloud Console create a project, enable **Google Sheets API**, **Google Docs API** and
   **Google Drive API**.
2. Create an OAuth client ID of type **Desktop app**.
3. Export the credentials before starting Claude Code:
   ```bash
   export GOOGLE_OAUTH_CLIENT_ID="...apps.googleusercontent.com"
   export GOOGLE_OAUTH_CLIENT_SECRET="..."
   ```
4. Requires `uv` (`pipx install uv` or `brew install uv`). The first tool call opens a browser
   for Google sign-in.

If you only have the hosted Drive connector, the skills fall back to create-only behaviour:
a fresh tracker snapshot per run and one connection-notes Doc per day. Each skill documents its
fallback.

## LinkedIn

LinkedIn has no official MCP server. Unofficial servers log in with your session cookie, which
breaks LinkedIn's User Agreement and can get your account restricted, so none is bundled.
The `linkedin-outreach` skill therefore:

- uses a professional-network connector **only if you have added one yourself**, otherwise
- finds people through public web search (`site:linkedin.com/in "<Company>" recruiter`) using
  **web-scraper**, reading search-result snippets only, never logged-in pages.

Connection requests are **never sent automatically**. Messages are written to a Google Doc for
you to paste.

## Outlook vs Gmail, Google Calendar vs Outlook Calendar

Set `outreach.email_provider` (`gmail` | `outlook`) and `scheduling.calendar_provider`
(`google` | `outlook`) in your `job-master.config.json`. Unused servers can be disabled with
`/mcp`.
