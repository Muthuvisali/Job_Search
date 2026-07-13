import { useEffect } from 'react'
import { Settings, FileText, CheckSquare, Zap } from 'lucide-react'
import { useApp } from './context/AppContext'
import { track } from './services/metrics'
import SettingsPanel from './components/Settings/SettingsPanel'
import ResumeTab from './components/Resume/ResumeTab'
import AppliedTab from './components/Jobs/AppliedTab'
import Toast from './components/common/Toast'

const TABS = [
  { id: 'resume',  label: 'Resume',  icon: FileText },
  { id: 'applied', label: 'Applied', icon: CheckSquare },
]

export default function App() {
  const { state, dispatch } = useApp()
  const { activeTab, settingsOpen, appliedJobs, isSetupComplete } = state

  useEffect(() => {
    track('app_opened')
  }, [])

  const tabCounts = {
    resume:  null,
    applied: appliedJobs.length || null,
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">HireReady</span>
            <span className="hidden sm:block text-xs text-gray-600 border-l border-gray-800 pl-3 ml-1">
              ATS Resume Optimizer
            </span>
          </div>

          {!isSetupComplete && (
            <span className="hidden sm:block text-xs text-amber-400 bg-amber-900/20 border border-amber-800/30 px-2.5 py-1 rounded-full">
              Setup required
            </span>
          )}

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

      {/* ── Tab bar ────────────────────────────────────────────────── */}
      <div className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-4xl mx-auto px-4">
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

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {activeTab === 'resume'  && <ResumeTab />}
        {activeTab === 'applied' && <AppliedTab />}
      </main>

      {settingsOpen && <SettingsPanel />}
      <Toast />
    </div>
  )
}
