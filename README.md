# HireReady — AI Job Search Copilot

**[Live Demo →](https://hireready.vercel.app)** · Deployed on Vercel · Zero sign-up · No data stored server-side

> Upload your resume. Click Refresh. Get your top 20% of today's job postings in 30 seconds — scored, ranked, and ready to tailor. Powered by Llama 3.3 70B for free.

---

## Problem

Active job seekers applying to 10-15 roles per day face three compounding problems no free tool solves together:

- **Discovery friction** — jobs scatter across LinkedIn, Indeed, Glassdoor, Adzuna, RemoteOK, company pages. Checking all of them takes 30-45 minutes and returns mostly noise.
- **Relevance filtering** — no automatic, honest score tells you which 20% of today's postings are actually worth your time.
- **Customization gap** — a generic resume produces a 70-80% ATS-filter rate before a human reads it. Tailoring takes 15-30 minutes per application. Most people skip it.

---

## How to Use

1. Open the [live link](https://hireready.vercel.app)
2. Click **Settings** → upload your resume (.docx, .pdf, or .txt)
3. Add target job titles and location preference
4. Click **Refresh Jobs**

That is it. No account. No API key required to start.

**Optional:** Paste your Anthropic (`sk-ant-…`) or OpenAI (`sk-…`) key in Settings to switch from the free Llama default to Claude Haiku or GPT-4o mini.

---

## Models

| Mode | Model | Who pays | Cost |
|------|-------|----------|------|
| Default (no key needed) | Llama 3.3 70B via Groq | App (Groq free tier) | $0 |
| Anthropic key | Claude Haiku 4.5 | User's key, browser-direct | ~$0.001/call |
| OpenAI key | GPT-4o mini + embeddings | User's key, browser-direct | ~$0.001/call |

---

## Scoring Pipeline

**Stage 1 — Rule-based filter** (zero AI cost)
Title keyword match → recency (48h) → location → deduplication. Reduces ~200 raw jobs to ~60.

**Stage 2 — Similarity** (near-zero cost)
OpenAI users: `text-embedding-3-small` cosine similarity. Default/Anthropic users: TF-IDF keyword similarity. Jobs below threshold route directly to Skill Gap — no LLM call.

**Stage 3 — LLM scoring** (only for candidates above threshold)
One call per job. Returns: score 1-10, match reason (2 sentences), top 3 matching skills, top 3 missing skills. Routes 7.5+ to High Match.

---

## Privacy

Your data never touches any server we control.

| What | Where stored | When deleted |
|------|-------------|--------------|
| API key | `sessionStorage` only | Tab close |
| Resume content | `sessionStorage` only | Tab close |
| Job data | `sessionStorage` only | Tab close |
| Applied tracker | `sessionStorage` only | Tab close |
| Usage events | Vercel → Supabase | Never (no content, no PII) |

**Verify it yourself:** open DevTools Network tab during a session. You will see zero requests to any domain we control that contain your resume text or API key.

Anonymous events stored: `event_name`, `timestamp`, `session_id` (random UUID per session), `metadata` (numeric count or provider string only).

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Vite | Fast HMR, clean component model |
| Default LLM | Llama 3.3 70B via Groq | Free tier (14,400 req/day), fast inference |
| BYOK LLM | Anthropic / OpenAI | User's own key, called directly from browser |
| Job sources | JSearch + Adzuna (server keys) + RemoteOK + Remotive (public) | Four sources, keys never exposed to client |
| Session state | React + `sessionStorage` | Privacy-verifiable, zero backend needed |
| Metrics | Vercel Edge Function + Supabase | Anonymous counts only, free tier |
| Resume parsing | `mammoth` (DOCX) + `pdfjs-dist` (PDF) + LLM extraction | Handles real-world format variation |
| Export | `docx` npm package | DOCX output |
| Deployment | Vercel free tier | Auto-deploy from GitHub |

---

## Self-Hosting

Fork the repo, then set these environment variables in your Vercel project dashboard:

```bash
GROQ_API_KEY=gsk_...          # Free at console.groq.com — powers the default model
RAPIDAPI_KEY=...               # JSearch — rapidapi.com (200 req/month free)
ADZUNA_APP_ID=...              # Adzuna — developer.adzuna.com (1,000 req/month free)
ADZUNA_APP_KEY=...
SUPABASE_URL=...               # Optional — anonymous metrics only
SUPABASE_ANON_KEY=...
```

```bash
git clone https://github.com/yourusername/hireready
cd hireready
npm install
npm run dev        # localhost:5173
```

---

## Supabase Schema (anonymous metrics only)

```sql
create table events (
  id          bigserial primary key,
  event_name  text not null,
  session_id  text not null,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);
```

---

## Cost Breakdown

| Operation | Who pays | Heavy daily session |
|-----------|----------|-------------------|
| Job fetch (JSearch + Adzuna) | App env vars | $0 on free tiers |
| RemoteOK + Remotive | Nobody | $0 public endpoints |
| LLM scoring (25 jobs) | Groq/user key | ~$0.025 |
| Resume tailoring (3) | Groq/user key | ~$0.06 |
| Cover letter (3) | Groq/user key | ~$0.045 |
| Interview prep (3) | Groq/user key | ~$0.06 |
| Skill gap summary | Groq/user key | ~$0.03 |
| **Total (default Llama mode)** | **App Groq free tier** | **$0** |
| **Total (BYOK heavy session)** | **User key** | **~$0.22 max** |

---

## What I Learned

- Embedding similarity is not the same as relevance. The LLM scoring stage is necessary to distinguish "keyword match" from "role match."
- TF-IDF works surprisingly well as a similarity gate when real embeddings are not available.
- LLM tailoring hallucinates if you do not constrain it. Strict prompting ("do not add skills the candidate does not have") is essential.
- `sessionStorage` is the right privacy call for sensitive data. Users trust apps more when they can verify zero content leaves their browser.
