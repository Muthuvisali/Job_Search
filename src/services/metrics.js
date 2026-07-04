import { session } from './session'

export async function track(eventName, metadata = {}) {
  try {
    await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        session_id: session.getSessionId(),
        metadata,
      }),
    })
  } catch {
    // metrics are best-effort, never block the user
  }
}
