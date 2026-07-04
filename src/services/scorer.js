import { computeSimilarity, embedText } from './embeddings'

const EMBED_THRESHOLD = 0.15 // low threshold for TF-IDF fallback mode
const EMBED_THRESHOLD_VECTOR = 0.60 // higher for real embeddings
const HIGH_MATCH_SCORE = 7.5

export async function scoreJobs(jobs, resumeData, llmClient, onProgress) {
  const { resumeText, resumeJson, resumeEmbedding } = resumeData
  const results = { highMatch: [], skillGap: [] }
  const usingVectors = !!resumeEmbedding

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]
    onProgress?.({ current: i + 1, total: jobs.length, stage: 'embedding', job })

    // Stage 2: embedding / TF-IDF similarity
    let jdEmbedding = null
    if (usingVectors) {
      try {
        jdEmbedding = await embedText(job.description.slice(0, 4000), llmClient)
      } catch {
        jdEmbedding = null
      }
    }

    const similarity = computeSimilarity(resumeEmbedding, job.description, resumeText, jdEmbedding)
    const threshold = usingVectors ? EMBED_THRESHOLD_VECTOR : EMBED_THRESHOLD

    if (similarity < threshold) {
      results.skillGap.push({
        ...job,
        score: parseFloat((similarity * 7).toFixed(1)),
        matchReason: 'Low similarity to your resume profile.',
        matchingSkills: [],
        missingSkills: [],
        scoredByLLM: false,
      })
      continue
    }

    // Stage 3: LLM scoring
    onProgress?.({ current: i + 1, total: jobs.length, stage: 'llm', job })
    try {
      const scored = await llmScoreJob(job, resumeJson || { rawText: resumeText }, llmClient)
      const target = scored.score >= HIGH_MATCH_SCORE ? results.highMatch : results.skillGap
      target.push({ ...job, ...scored, scoredByLLM: true })
    } catch {
      // On LLM failure, use similarity score scaled 1-10
      const fallbackScore = parseFloat((similarity * 10).toFixed(1))
      const target = fallbackScore >= HIGH_MATCH_SCORE ? results.highMatch : results.skillGap
      target.push({
        ...job,
        score: fallbackScore,
        matchReason: 'Score based on keyword similarity.',
        matchingSkills: [],
        missingSkills: [],
        scoredByLLM: false,
      })
    }
  }

  results.highMatch.sort((a, b) => b.score - a.score)
  results.skillGap.sort((a, b) => b.score - a.score)
  return results
}

async function llmScoreJob(job, resumeJson, llmClient) {
  const resumeStr = typeof resumeJson === 'string'
    ? resumeJson
    : JSON.stringify(resumeJson, null, 2).slice(0, 3000)

  const prompt = `You are an expert ATS recruiter. Score this job against the candidate's resume.

RESUME:
${resumeStr}

JOB TITLE: ${job.title}
COMPANY: ${job.company}
JOB DESCRIPTION:
${job.description.slice(0, 2000)}

Return ONLY a JSON object with this exact schema — no markdown, no explanation:
{
  "score": <number 1-10, one decimal, where 7.5+ means strong match>,
  "match_reason": "<2 sentences explaining why this score>",
  "top_3_matching_skills": ["skill1", "skill2", "skill3"],
  "top_3_missing_skills": ["skill1", "skill2", "skill3"]
}`

  const raw = await llmClient.call(prompt, 400)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('LLM did not return JSON')
  const parsed = JSON.parse(match[0])

  return {
    score: Math.min(10, Math.max(1, parseFloat(parsed.score) || 5)),
    matchReason: parsed.match_reason || '',
    matchingSkills: parsed.top_3_matching_skills || [],
    missingSkills: parsed.top_3_missing_skills || [],
  }
}
