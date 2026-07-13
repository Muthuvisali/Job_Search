export async function tailorResume(job, resumeJson, llmClient) {
  const resumeStr = JSON.stringify(resumeJson, null, 2).slice(0, 4000)

  const prompt = `You are an expert resume writer. Tailor this resume for the specific job below.

Rules:
1. Rewrite experience bullets that partially match the JD to highlight relevant keywords naturally
2. Adjust the professional summary to reference the role and company
3. Reorder skills to put the most relevant ones first
4. Keep all facts truthful — do NOT add experiences or skills the candidate doesn't have
5. Return the full tailored resume as clean plain text, formatted for easy reading
6. Keep dates, companies, and education exactly as they are
7. Mirror the exact keywords from the JD where truthfully applicable (ATS optimization)

JOB TITLE: ${job.title}
COMPANY: ${job.company}
JOB DESCRIPTION:
${job.description.slice(0, 2500)}

ORIGINAL RESUME (JSON):
${resumeStr}

Return the tailored resume as plain text only. Start with the candidate's name.`

  return llmClient.call(prompt, 2000)
}

export async function generateCoverLetter(job, tailoredResume, llmClient) {
  const prompt = `Write a concise, compelling cover letter for this job application.

Format: exactly 3 paragraphs
- Paragraph 1 (3-4 sentences): Hook opener referencing the specific role + company, and the candidate's most relevant experience
- Paragraph 2 (4-5 sentences): 2-3 specific accomplishments from the resume that directly address the JD requirements
- Paragraph 3 (2-3 sentences): Forward-looking close expressing genuine interest, mentioning one specific thing about the company

Tone: professional but not stiff. Confident but not arrogant. First person.
Do NOT use generic phrases like "I am writing to express my interest" or "Please find attached"

JOB: ${job.title} at ${job.company}
JOB DESCRIPTION:
${job.description.slice(0, 2000)}

TAILORED RESUME HIGHLIGHTS:
${tailoredResume.slice(0, 2000)}

Return only the cover letter text. No subject line. No date. No address.`

  return llmClient.call(prompt, 800)
}

export async function generateInterviewPrep(job, tailoredResume, llmClient) {
  const prompt = `Generate a focused interview prep guide for this specific job application.

JOB: ${job.title} at ${job.company}
JOB DESCRIPTION:
${job.description.slice(0, 1500)}

CANDIDATE RESUME:
${tailoredResume.slice(0, 1500)}

Return a JSON object with this schema:
{
  "likely_questions": [
    { "question": "string", "tip": "string (1 sentence on how to answer given this specific resume)" }
  ],
  "key_topics_to_review": ["string"],
  "company_research_points": ["string (specific things to research/know about ${job.company})"],
  "star_story_suggestions": [
    { "situation": "string", "task": "string", "action": "string", "result": "string" }
  ]
}

Include 5 likely questions, 4 key topics, 3 company research points, 2 STAR stories.
Return ONLY the JSON, no markdown.`

  const raw = await llmClient.call(prompt, 1500)
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { raw }
  } catch {
    return { raw }
  }
}

export async function tailorResumeForAts(jd, resumeText, missingKeywords, llmClient, forceToSkills = false) {
  const forceNote = forceToSkills
    ? 'Since some keywords cannot be naturally placed in experience bullets, append them to a "Tools & Technologies" line inside the Skills section.'
    : 'Only add keywords that honestly reflect the candidate\'s background. If a keyword cannot be truthfully placed, skip it.'

  const prompt = `You are a professional resume writer specializing in ATS optimization.

Edit the resume to incorporate the missing keywords. Follow ALL rules exactly:

RULES:
1. ONE PAGE — hard maximum of 550 words. Count carefully before returning.
2. Section order: Name & Contact → SUMMARY → EXPERIENCE → SKILLS → EDUCATION (all headers in ALL CAPS)
3. 3–4 bullet points per role maximum. Each bullet begins with a strong past-tense action verb.
4. ${forceNote}
5. Mirror the exact keyword strings from the JD — ATS systems match exact text.
6. Keep all dates, company names, job titles, schools, and degrees word-for-word.
7. Do NOT fabricate experience, metrics, certifications, or skills.
8. Plain text output only — no asterisks, no markdown symbols, no decorative lines.

MISSING KEYWORDS TO INCORPORATE:
${missingKeywords.slice(0, 20).join(', ')}

JOB DESCRIPTION (context):
${jd.slice(0, 1500)}

ORIGINAL RESUME:
${resumeText.slice(0, 2500)}

Return the complete edited resume starting with the candidate's name. Nothing else.`

  return llmClient.call(prompt, 1800)
}

export async function explainAtsFailure(jd, resumeText, missingKeywords, llmClient) {
  const prompt = `A resume optimizer could not reach 85% ATS keyword match for a job even after editing.

Keywords that could not be integrated: ${missingKeywords.slice(0, 15).join(', ')}

Job description (first 600 chars): ${jd.slice(0, 600)}

In 2–3 sentences, explain specifically WHY these keywords cannot be naturally added and what the core experience gap is. Be direct and honest.`

  return llmClient.call(prompt, 300)
}

export async function generateSkillGapSummary(skillGapJobs, llmClient) {
  const jobSummaries = skillGapJobs
    .slice(0, 30)
    .map((j) => `- ${j.title} at ${j.company}: missing [${j.missingSkills?.join(', ') || 'see JD'}]`)
    .join('\n')

  const prompt = `You are a career coach. Analyze these job postings the candidate did NOT qualify for and identify the top 5 skill gaps.

JOBS WITH GAPS:
${jobSummaries}

For each of the top 5 missing skills, provide:
- A specific online course (with a real URL if you know it, otherwise say "search [platform] for [skill]")
- Realistic hours to reach proficiency
- One concrete project idea to demonstrate the skill

Return ONLY a JSON array:
[
  {
    "skill": "string",
    "frequency": <how many jobs needed this, number>,
    "course": { "name": "string", "url": "string", "platform": "string" },
    "hours_to_proficiency": <number>,
    "project_idea": "string (1-2 sentences, concrete and buildable in 1-2 weeks)"
  }
]`

  const raw = await llmClient.call(prompt, 1200)
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}
