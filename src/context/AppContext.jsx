import { createContext, useContext, useReducer, useEffect } from 'react'
import { session } from '../services/session'
import { createLLMClient, createDefaultClient, detectProvider } from '../services/llm'

const AppContext = createContext(null)

function buildLLMClient(apiKey, provider) {
  if (apiKey && provider) return createLLMClient(apiKey, provider)
  return createDefaultClient()
}

const initialState = {
  // Auth / LLM
  apiKey: '',
  apiProvider: null,
  llmClient: createDefaultClient(),

  // Resume
  resumeText: '',
  resumeJson: null,
  resumeEmbedding: null,

  // Preferences (kept for Settings panel)
  preferences: {
    targetTitles: [],
    location: '',
    remoteOnly: false,
    sources: { jsearch: true, adzuna: true, remoteok: true, remotive: true },
  },

  // Applied tracker
  appliedJobs: [],

  // UI
  isSetupComplete: false,
  settingsOpen: false,
  activeTab: 'resume',
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

    case 'MARK_APPLIED': {
      const newApplied = [action.payload, ...state.appliedJobs]
      session.setApplied(newApplied)
      return { ...state, appliedJobs: newApplied, activeTab: 'applied' }
    }

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

  // Rehydrate from sessionStorage on mount
  useEffect(() => {
    const apiKey     = session.getApiKey() || ''
    const apiProvider = session.getApiProvider()
    const llmClient  = buildLLMClient(apiKey, apiProvider)
    const resumeText = session.getResumeText() || ''
    const resumeJson = session.getResumeJson()
    const resumeEmbedding = session.getResumeEmbedding()
    const preferences = session.getPreferences()
    const appliedJobs = session.getApplied()

    dispatch({
      type: 'HYDRATE',
      payload: {
        apiKey, apiProvider, llmClient,
        resumeText, resumeJson, resumeEmbedding,
        preferences, appliedJobs,
        isSetupComplete: !!resumeText,
      },
    })
  }, [])

  // Auto-dismiss toasts
  useEffect(() => {
    if (state.toast) {
      const t = setTimeout(() => dispatch({ type: 'SET_TOAST', payload: null }), 4000)
      return () => clearTimeout(t)
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
