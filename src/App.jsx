import { useEffect } from 'react'
import {
  Settings, RefreshCw, Trophy, TrendingUp, CheckSquare, Zap
} from 'lucide-react'
import { useApp } from './context/AppContext'
import { fetchAllJobs } from './services/jobFetcher'
import { scoreJobs } from './services/scorer'
import { track } from './services/metrics'
import SettingsPanel from './components/Settings/SettingsPanel'
import HighMatchTab from './components/Jobs/HighMatchTab'
import SkillGapTab from './components/Jobs/SkillGapTab'
import AppliedTab from './components/Jobs/AppliedTab'
import Toast from './components/common/Toast'
import Spinner from './components/common/Spinner'

const TABS = [
  { id: 'high-match', label: 'High Match', icon: Trophy },
  { id: 'skill-gap', label: 'Skill Gap', icon: TrendingUp },
  { id: 'applied', label: 'Applied', icon: CheckSquare },
]

export default function App() {
  const { state, dispatch } = useApp()
  const {
    activeTab, settingsOpen, isFetching, isScoring,
    highMatchJobs, skillGapJobs, appliedJobs,
    isSetupComplete, llmClient, preferences, resumeText, resumeJson, resumeEmbedding,
  } = state

  useEffect(() => {
    track('app_opened')
  }, [])

  async function handleRefresh() {
    if (!isSetupComplete) {
      dispatch({ type: 'SET_SETTINGS_OPEN', payload: true })
      dispatch({ type: 'SET_TOAST', payload: { message: 'Upload your resume first to get started.', type: 'info' } })
      return
    }

    dispatch({ type: 'SET_FETCHING', payload: true })
    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'high-match' })

    try {
      const jobs = await fetchAllJobs(preferences)
      await track('jobs_fetched', { count: jobs.length })

      if (jobs.length === 0) {
        dispatch({ type: 'SET_TOAST', payload: { message: 'No jobs found. Try adjusting your preferences.', type: 'info' } })
        dispatch({ type: 'SET_FETCHING', payload: false })
        return
      }

      dispatch({ type: 'SET_FETCHING', payload: false })
      dispatch({ type: 'SET_SCORING', payload: true })

      const resumeData = { resumeText, resumeJson, resumeEmbedding }
      const scored = await scoreJobs(
        jobs,
        resumeData,
        llmClient,
        (progress) => dispatch({ type: 'SET_SCORING_PROGRESS', payload: progress }),
      )

      await track('job_scored', { count: jobs.length, high: scored.highMatch.length, gap: scored.skillGap.length })
      dispatch({ type: 'SET_JOBS', payload: scored })
      dispatch({
        type: 'SET_TOAST',
        payload: {
          message: `${scored.highMatch.length} high matches, ${scored.skillGap.length} skill gap jobs`,
          type: 'success',
        },
      })
    } catch (err) {
      dispatch({ type: 'SET_TOAST', payload: { message: err.message, type: 'error' } })
    } finally {
      dispatch({ type: 'SET_FETCHING', payload: false })
      dispatch({ type: 'SET_SCORING', payload: false })
      dispatch({ type: 'SET_SCORING_PROGRESS', payload: null })
    }
  }

  const tabCounts = {
    'high-match': highMatchJobs.length || null,
    'skill-gap': skillGapJobs.length || null,
    'applied': appliedJobs.length || null,
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">HireReady</span>
            <span className="hidden sm:block text-xs text-gray-600 border-l border-gray-800 pl-3 ml-1">
              AI Job Search Copilot
            </span>
          </div>

          {!isSetupComplete && (
            <span className="hidden sm:block text-xs text-amber-400 bg-amber-900/20 border border-amber-800/30 px-2.5 py-1 rounded-full">
              Setup required
            </span>
          )}

          <button
            className="btn-primary flex items-center gap-2 text-sm"
            onClick={handleRefresh}
            disabled={isFetching || isScoring}
          >
            {isFetching || isScoring ? <Spinner size={14} /> : <RefreshCw size={14} />}
            {isFetching ? 'Fetching…' : isScoring ? 'Scoring…' : 'Refresh Jobs'}
          </button>

          <button
            className="btn-ghost p-2 relative"
            onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', payload: true })}
            title="Settings"
          >
            <Settings size={18} />
            {!isSetupComplete && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: id })}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 ${
                  activeTab === id
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon size={15} />
                {label}
                {tabCounts[id] && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {tabCounts[id]}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {activeTab === 'high-match' && <HighMatchTab />}
        {activeTab === 'skill-gap' && <SkillGapTab />}
        {activeTab === 'applied' && <AppliedTab />}
      </main>

      {/* Settings Panel */}
      {settingsOpen && <SettingsPanel />}

      {/* Toast */}
      <Toast />
    </div>
  )
}
