import { Trophy, Info } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import JobCard from './JobCard'

export default function HighMatchTab() {
  const { state } = useApp()
  const { highMatchJobs, isScoring, isFetching } = state

  if (isFetching || isScoring) {
    return <LoadingState isScoring={isScoring} progress={state.scoringProgress} />
  }

  if (!highMatchJobs.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <Trophy size={40} className="text-gray-700 mb-4" />
        <h3 className="text-lg font-medium text-gray-400 mb-2">No high-match jobs yet</h3>
        <p className="text-gray-600 text-sm max-w-sm">
          Click <strong className="text-gray-400">Refresh Jobs</strong> after completing setup to fetch and score today's postings.
          Jobs scoring 7.5+ will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-800">
        <Info size={13} />
        {highMatchJobs.length} jobs scored 7.5+. Sorted by match score. Click any card to expand.
      </div>
      {highMatchJobs.map((job) => (
        <JobCard key={job.id} job={job} mode="high-match" />
      ))}
    </div>
  )
}

function LoadingState({ isScoring, progress }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative w-16 h-16 mb-4">
        <svg className="animate-spin w-16 h-16 text-indigo-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <Trophy size={20} className="absolute inset-0 m-auto text-indigo-300" />
      </div>
      <p className="text-gray-300 font-medium mb-1">
        {isScoring ? 'Scoring jobs…' : 'Fetching jobs…'}
      </p>
      {progress && (
        <p className="text-xs text-gray-500">
          {progress.stage === 'embedding' ? 'Stage 2: Computing similarity' : 'Stage 3: LLM scoring'} ·{' '}
          {progress.current}/{progress.total}
          {progress.job && ` · ${progress.job.title}`}
        </p>
      )}
      {progress && (
        <div className="w-48 bg-gray-800 rounded-full h-1.5 mt-3">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
