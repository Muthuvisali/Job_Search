export const config = { runtime: 'edge' }

const GROQ_MODEL = 'llama-3.3-70b-versatile'

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'No default model configured on server. Please add an API key in Settings.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const { prompt, max_tokens = 1024 } = await req.json()

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return new Response(
        JSON.stringify({ error: err.error?.message || `Groq error ${res.status}` }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const data = await res.json()
    return new Response(
      JSON.stringify({ text: data.choices[0].message.content }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
