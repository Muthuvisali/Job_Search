// LLM client factory.
// Mode "default": routes calls through /api/llm (Groq Llama 3.3 70B, server-side key).
// Mode "anthropic": calls Anthropic directly with the user's key.
// Mode "openai": calls OpenAI directly with the user's key.

export function createDefaultClient() {
  const call = async (prompt, maxTokens = 1024) => {
    const res = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, max_tokens: maxTokens }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `Server LLM error ${res.status}`)
    return data.text
  }

  // Default mode uses TF-IDF similarity (no embedding API needed)
  const embed = async () => null

  return { call, embed, provider: 'default', displayName: 'Llama 3.3 70B (free)' }
}

export function createLLMClient(apiKey, provider) {
  if (provider === 'anthropic') return createAnthropicClient(apiKey)
  if (provider === 'openai') return createOpenAIClient(apiKey)
  return createDefaultClient()
}

function createAnthropicClient(apiKey) {
  const call = async (prompt, maxTokens = 1024) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Anthropic API error ${res.status}`)
    }
    const data = await res.json()
    return data.content[0].text
  }

  // Anthropic users fall back to TF-IDF (Voyage needs a separate key)
  const embed = async () => null

  return { call, embed, provider: 'anthropic', displayName: 'Claude Haiku (your key)' }
}

function createOpenAIClient(apiKey) {
  const call = async (prompt, maxTokens = 1024) => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `OpenAI API error ${res.status}`)
    }
    const data = await res.json()
    return data.choices[0].message.content
  }

  const embed = async (text) => {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `OpenAI embed error ${res.status}`)
    }
    const data = await res.json()
    return data.data[0].embedding
  }

  return { call, embed, provider: 'openai', displayName: 'GPT-4o mini (your key)' }
}

export function detectProvider(apiKey) {
  if (!apiKey) return null
  if (apiKey.startsWith('sk-ant-')) return 'anthropic'
  if (apiKey.startsWith('sk-')) return 'openai'
  return null
}

export async function validateApiKey(apiKey, provider) {
  try {
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })
      return res.ok
    } else {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return res.ok
    }
  } catch {
    return false
  }
}
