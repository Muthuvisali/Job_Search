export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

// TF-IDF based fallback when embedding API is unavailable
export function tfidfSimilarity(text1, text2) {
  const tokenize = (t) =>
    t.toLowerCase().match(/\b[a-z][a-z0-9+#.]{2,}\b/g) || []

  const tokens1 = tokenize(text1)
  const tokens2 = tokenize(text2)

  const freq = (arr) => {
    const map = {}
    arr.forEach((w) => { map[w] = (map[w] || 0) + 1 })
    return map
  }

  const f1 = freq(tokens1)
  const f2 = freq(tokens2)
  const vocab = new Set([...Object.keys(f1), ...Object.keys(f2)])

  let dot = 0, normA = 0, normB = 0
  vocab.forEach((w) => {
    const a = f1[w] || 0
    const b = f2[w] || 0
    dot += a * b
    normA += a * a
    normB += b * b
  })
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

export async function embedText(text, llmClient) {
  try {
    return await llmClient.embed(text)
  } catch (e) {
    if (e.message === 'voyage_unavailable') return null
    throw e
  }
}

export async function computeResumeEmbedding(resumeText, llmClient) {
  return embedText(resumeText.slice(0, 6000), llmClient)
}

export function computeSimilarity(resumeEmbedding, jdText, resumeText, jdEmbedding) {
  if (resumeEmbedding && jdEmbedding) {
    return cosineSimilarity(resumeEmbedding, jdEmbedding)
  }
  // fallback when embeddings are unavailable
  return tfidfSimilarity(resumeText || '', jdText || '')
}
