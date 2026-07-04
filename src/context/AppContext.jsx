import { createContext, useContext, useReducer, useEffect } from 'react'
import { session } from '../services/session'
import { createLLMClient, createDefaultClient, detectProvider } from '../services/llm'

const AppContext = createContext(null)

function buildLLMClient(apiKey, provider) {
  if (apiKey && provider) return createLLMClient(apiKey, provider)
  return createDefaultClient() // free Llama default
}

const initialState = {
  // Auth / LLM
  apiKey: '',
  apiProvider: null,
  llmClient: createDefaultClient(), // always ready — no key required

  // Resume
  resumeText: '',
  resumeJson: null,
  resumeEmbedding: null,

  // Preferences
  preferences: {
    targetTitles: [],
    location: '',
    remoteOnly: false,
    sources: { jsearch: true, adzuna: true, remoteok: true, remotive: true },
  },

  // Jobs
  highMatchJobs: [],
  skillGapJobs: [],
  appliedJobs: [],
  skillGapSummary: null,

  // UI
  isSetupComplete: false,
  isFetching: false,
  isScoring: false,
  scoringProgress: null,
  settingsOpen: false,
  activeTab: 'high-match',
  toast: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_API_KEY': {
      const provider = detectProvider(action.payload)
      const client = buildLLMClient(action.payload, provider)
      session.setApiKey(action.payload)
      session.setApiProvider(provider)
      return { ...state, apiKey: action.payload, apiProvider: provider, llmClient: client }
    }
    case 'CLEAR_API_KEY':
      session.setApiKey('')
      session.setApiProvider(null)
      return { ...state, apiKey: '', apiProvider: null, llmClient: createDefaultClient() }
    case 'SET_RESUME':
      session.setResumeText(action.payload.text)
      session.setResumeJson(action.payload.json)
      return { ...state, resumeText: action.payload.text, resumeJson: action.payload.json }
    case 'SET_RESUME_EMBEDDING':
      session.setResumeEmbedding(action.payload)
      return { ...state, resumeEmbedding: action.payload }
    case 'SET_PREFERENCES':
      session.setPreferences(action.payload)
      return { ...state, preferences: action.payload }
    case 'SET_SETUP_COMPLETE':
      return { ...state, isSetupComplete: action.payload }
    case 'SET_JOBS':
      session.setJobs(action.payload)
      return { ...state, highMatchJobs: action.payload.highMatch, skillGapJobs: action.payload.skillGap }
    case 'SET_FETCHING':
      return { ...state, isFetching: action.payload }
    case 'SET_SCORING':
      return { ...state, isScoring: action.payload }
    case 'SET_SCORING_PROGRESS':
      return { ...state, scoringProgress: action.payload }
    case 'MARK_APPLIED': {
      const job = action.payload
      const newApplied = [job, ...state.appliedJobs]
      const newHighMatch = state.highMatchJobs.filter((j) => j.id !== job.id)
      session.setApplied(newApplied)
      return { ...state, appliedJobs: newApplied, highMatchJobs: newHighMatch, activeTab: 'applied' }
    }
    case 'UPDATE_JOB_IN_HIGH_MATCH': {
      const updated = state.highMatchJobs.map((j) =>
        j.id === action.payload.id ? { ...j, ...action.payload } : j
      )
      return { ...state, highMatchJobs: updated }
    }
    case 'SET_SKILL_GAP_SUMMARY':
      return { ...state, skillGapSummary: action.payload }
    case 'SET_SETTINGS_OPEN':
      return { ...state, settingsOpen: action.payload }
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload }
    case 'SET_TOAST':
      return { ...state, toast: action.payload }
    case 'HYDRATE':
      return { ...state, ...action.payload }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const apiKey = session.getApiKey() || ''
    const apiProvider = session.getApiProvider()
    const llmClient = buildLLMClient(apiKey, apiProvider)
    const resumeText = session.getResumeText() || ''
    const resumeJson = session.getResumeJson()
    const resumeEmbedding = session.getResumeEmbedding()
    const preferences = session.getPreferences()
    const jobs = session.getJobs()
    const appliedJobs = session.getApplied()

    dispatch({
      type: 'HYDRATE',
      payload: {
        apiKey,
        apiProvider,
        llmClient,
        resumeText,
        resumeJson,
        resumeEmbedding,
        preferences,
        highMatchJobs: jobs.highMatch || [],
        skillGapJobs: jobs.skillGap || [],
        appliedJobs,
        // Setup only requires a resume — API key is optional (uses Llama free by default)
        isSetupComplete: !!resumeText,
      },
    })
  }, [])

  useEffect(() => {
    if (state.toast) {
      const timer = setTimeout(() => dispatch({ type: 'SET_TOAST', payload: null }), 4000)
      return () => clearTimeout(timer)
    }
  }, [state.toast])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
