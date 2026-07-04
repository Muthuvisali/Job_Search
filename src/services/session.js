const KEYS = {
  API_KEY: 'hr_api_key',
  API_PROVIDER: 'hr_api_provider',
  RESUME_TEXT: 'hr_resume_text',
  RESUME_JSON: 'hr_resume_json',
  RESUME_EMBEDDING: 'hr_resume_embedding',
  PREFERENCES: 'hr_preferences',
  JOBS: 'hr_jobs',
  APPLIED: 'hr_applied',
  SESSION_ID: 'hr_session_id',
}

function get(key) {
  try {
    const val = sessionStorage.getItem(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

function set(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('sessionStorage write failed:', e)
  }
}

function remove(key) {
  sessionStorage.removeItem(key)
}

export const session = {
  getApiKey: () => get(KEYS.API_KEY),
  setApiKey: (key) => set(KEYS.API_KEY, key),

  getApiProvider: () => get(KEYS.API_PROVIDER),
  setApiProvider: (p) => set(KEYS.API_PROVIDER, p),

  getResumeText: () => get(KEYS.RESUME_TEXT),
  setResumeText: (t) => set(KEYS.RESUME_TEXT, t),

  getResumeJson: () => get(KEYS.RESUME_JSON),
  setResumeJson: (j) => set(KEYS.RESUME_JSON, j),

  getResumeEmbedding: () => get(KEYS.RESUME_EMBEDDING),
  setResumeEmbedding: (e) => set(KEYS.RESUME_EMBEDDING, e),

  getPreferences: () => get(KEYS.PREFERENCES) || {
    targetTitles: [],
    location: '',
    remoteOnly: false,
    sources: { jsearch: true, adzuna: true, remoteok: true, remotive: true },
  },
  setPreferences: (p) => set(KEYS.PREFERENCES, p),

  getJobs: () => get(KEYS.JOBS) || { highMatch: [], skillGap: [] },
  setJobs: (j) => set(KEYS.JOBS, j),

  getApplied: () => get(KEYS.APPLIED) || [],
  setApplied: (a) => set(KEYS.APPLIED, a),

  getSessionId: () => {
    let id = get(KEYS.SESSION_ID)
    if (!id) {
      id = crypto.randomUUID()
      set(KEYS.SESSION_ID, id)
    }
    return id
  },

  clearAll: () => Object.values(KEYS).forEach(remove),
}
