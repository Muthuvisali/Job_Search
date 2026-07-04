export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const { event_name, session_id, metadata } = body

    // Only accept known event names — no content, no PII
    const allowed = [
      'app_opened', 'resume_uploaded', 'jobs_fetched', 'job_scored',
      'resume_tailored', 'cover_letter_generated', 'job_applied',
      'daily_summary_generated', 'api_key_type',
    ]
    if (!allowed.includes(event_name)) {
      return new Response('Unknown event', { status: 400 })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/events`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          event_name,
          session_id: session_id || 'unknown',
          metadata: typeof metadata === 'object' ? metadata : {},
          created_at: new Date().toISOString(),
        }),
      })
    }

    return new Response('ok', { status: 200 })
  } catch {
    // Metrics are best-effort
    return new Response('ok', { status: 200 })
  }
}
