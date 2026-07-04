function normalizeJob(raw, source) {
  return {
    id: `${source}_${raw.id || raw.slug || Math.random().toString(36).slice(2)}`,
    title: raw.title || raw.job_title || '',
    company: raw.company || raw.company_name || raw.employer_name || '',
    location: raw.location || raw.job_location || raw.candidate_required_location || 'Remote',
    salary: raw.salary || raw.job_min_salary
      ? `$${raw.job_min_salary?.toLocaleString()} – $${raw.job_max_salary?.toLocaleString()}`
      : raw.salary_range || '',
    description: raw.description || raw.job_description || raw.job_highlights?.Qualifications?.join('\n') || '',
    url: raw.url || raw.job_apply_link || raw.link || '',
    postedAt: raw.date_posted || raw.created || raw.publication_date || new Date().toISOString(),
    source,
    tags: raw.tags || raw.job_required_skills || [],
  }
}

async function fetchRemoteOK(keywords) {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'HireReady/1.0' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data
      .filter((j) => j.position)
      .filter((j) => {
        if (!keywords.length) return true
        const text = `${j.position} ${(j.tags || []).join(' ')}`.toLowerCase()
        return keywords.some((k) => text.includes(k.toLowerCase()))
      })
      .slice(0, 40)
      .map((j) => normalizeJob({
        id: j.id,
        title: j.position,
        company: j.company,
        location: 'Remote',
        description: j.description || '',
        url: j.url,
        postedAt: j.date,
        tags: j.tags || [],
      }, 'remoteok'))
  } catch {
    return []
  }
}

async function fetchRemotive(keywords) {
  try {
    const tag = keywords[0] || 'software'
    const res = await fetch(`https://remotive.com/api/remote-jobs?limit=40&search=${encodeURIComponent(tag)}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).map((j) => normalizeJob({
      id: j.id,
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || 'Remote',
      description: j.description || '',
      url: j.url,
      postedAt: j.publication_date,
      salary: j.salary || '',
    }, 'remotive'))
  } catch {
    return []
  }
}

async function fetchJSearch(keywords, location) {
  try {
    const query = keywords.join(' ') || 'software engineer'
    const res = await fetch(
      `/api/jobs/jsearch?query=${encodeURIComponent(query)}&location=${encodeURIComponent(location || '')}`,
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.data || []).map((j) => normalizeJob(j, 'jsearch'))
  } catch {
    return []
  }
}

async function fetchAdzuna(keywords, location) {
  try {
    const query = keywords.join(' ') || 'software engineer'
    const res = await fetch(
      `/api/jobs/adzuna?query=${encodeURIComponent(query)}&location=${encodeURIComponent(location || '')}`,
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).map((j) => normalizeJob({
      id: j.id,
      title: j.title,
      company: j.company?.display_name || '',
      location: j.location?.display_name || '',
      description: j.description || '',
      url: j.redirect_url || '',
      postedAt: j.created,
      salary: j.salary_min
        ? `$${Math.round(j.salary_min / 1000)}k – $${Math.round(j.salary_max / 1000)}k`
        : '',
    }, 'adzuna'))
  } catch {
    return []
  }
}

function deduplicateJobs(jobs) {
  const seen = new Set()
  return jobs.filter((j) => {
    const key = `${j.company.toLowerCase().trim()}|${j.title.toLowerCase().trim()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function preFilter(jobs, preferences) {
  const { targetTitles = [], location = '', remoteOnly = false } = preferences
  const now = Date.now()
  const twentyFourHours = 48 * 60 * 60 * 1000 // 48h to be generous

  return jobs.filter((job) => {
    // Title match — if user set titles, filter. Otherwise pass everything.
    if (targetTitles.length) {
      const titleLower = job.title.toLowerCase()
      const passes = targetTitles.some((t) => titleLower.includes(t.toLowerCase()))
      if (!passes) return false
    }

    // Remote filter
    if (remoteOnly) {
      const loc = (job.location || '').toLowerCase()
      if (!loc.includes('remote') && !loc.includes('anywhere')) return false
    } else if (location) {
      // allow remote jobs through even when a location is set
      const loc = (job.location || '').toLowerCase()
      const locPref = location.toLowerCase()
      if (!loc.includes('remote') && !loc.includes(locPref)) return false
    }

    // Recency — if no date, pass through
    if (job.postedAt) {
      const posted = new Date(job.postedAt).getTime()
      if (now - posted > twentyFourHours) return false
    }

    return true
  })
}

export async function fetchAllJobs(preferences) {
  const keywords = preferences.targetTitles || []
  const location = preferences.location || ''
  const sources = preferences.sources || {}

  const fetchQueue = []
  if (sources.remoteok !== false) fetchQueue.push(fetchRemoteOK(keywords))
  if (sources.remotive !== false) fetchQueue.push(fetchRemotive(keywords))
  if (sources.jsearch !== false) fetchQueue.push(fetchJSearch(keywords, location))
  if (sources.adzuna !== false) fetchQueue.push(fetchAdzuna(keywords, location))

  const results = await Promise.allSettled(fetchQueue)
  const all = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))

  const deduped = deduplicateJobs(all)
  return preFilter(deduped, preferences)
}
