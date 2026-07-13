export async function runAtsCheck(jd, resumeText, llmClient) {
  const prompt = `You are an expert ATS (Applicant Tracking System) analyzer, similar to Jobscan.

Analyze this resume against the job description. Extract the most important hard skills, technologies, certifications, and key qualifications from the JD. Then identify which of those appear in the resume.

JOB DESCRIPTION:
${jd.slice(0, 3000)}

RESUME:
${resumeText.slice(0, 3000)}

Return ONLY valid JSON, no markdown, no explanation:
{
  "ats_score": <integer 0-100, percentage of key JD requirements present in resume>,
  "matched_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword1", "keyword2"],
  "analysis": "<2 sentences: what drives this score and the biggest gaps>"
}`

  const raw = await llmClient.call(prompt, 900)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('ATS scan returned unexpected format — try again.')
  const parsed = JSON.parse(match[0])
  return {
    score: Math.min(100, Math.max(0, Math.round(Number(parsed.ats_score) || 0))),
    matchedKeywords: Array.isArray(parsed.matched_keywords) ? parsed.matched_keywords : [],
    missingKeywords: Array.isArray(parsed.missing_keywords) ? parsed.missing_keywords : [],
    analysis: parsed.analysis || '',
  }
}

// Re-score by checking which originally-missing keywords now appear in the edited resume.
// Fast, no LLM call needed.
export function rescoreWithKeywords(editedText, matchedKeywords, missingKeywords) {
  const lower = editedText.toLowerCase()
  const nowMatched = missingKeywords.filter((k) => lower.includes(k.toLowerCase()))
  const total = matchedKeywords.length + missingKeywords.length
  if (total === 0) return 0
  return Math.round(((matchedKeywords.length + nowMatched.length) / total) * 100)
}
