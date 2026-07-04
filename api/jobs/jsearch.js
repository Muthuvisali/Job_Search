export const config = { runtime: 'edge' }

export default async function handler(req) {
  const url = new URL(req.url)
  const query = url.searchParams.get('query') || 'software engineer'
  const location = url.searchParams.get('location') || ''

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ data: [] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const params = new URLSearchParams({
      query: location ? `${query} in ${location}` : query,
      page: '1',
      num_pages: '2',
      date_posted: 'today',
    })

    const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ data: [] }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ data: [] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
