import { CheckSquare, AlertTriangle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import JobCard from './JobCard'

export default function AppliedTab() {
  const { state } = useApp()
  const { appliedJobs } = state

  return (
    <div className="space-y-4">
      {/* Warning banner */}
      <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-800/40 rounded-xl px-4 py-3">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-300">
          This tracker clears when you close this tab.{' '}
          <strong>Download your materials before closing.</strong>
        </p>
      </div>

      {appliedJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <CheckSquare size={40} className="text-gray-700 mb-4" />
          <h3 className="text-base font-medium text-gray-400 mb-2">No applications yet</h3>
          <p className="text-sm text-gray-600">
            When you mark a job as applied from the High Match tab, it will appear here along with
            your tailored resume, cover letter, and interview prep.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 px-1">
            {appliedJobs.length} application{appliedJobs.length !== 1 ? 's' : ''} · sorted by most recent
          </p>
          {appliedJobs.map((job) => (
            <JobCard key={`applied_${job.id}_${job.appliedAt}`} job={job} mode="applied" readOnly />
          ))}
        </div>
      )}
    </div>
  )
}
