import { useState } from 'react'
import { TrendingUp, BookOpen, Clock, Code, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { generateSkillGapSummary } from '../../services/tailorer'
import { track } from '../../services/metrics'
import JobCard from './JobCard'
import Spinner from '../common/Spinner'

export default function SkillGapTab() {
  const { state, dispatch } = useApp()
  const { skillGapJobs, skillGapSummary, isScoring, isFetching, llmClient } = state
  const [generating, setGenerating] = useState(false)

  async function handleGenerateSummary() {
    if (!llmClient || !skillGapJobs.length) return
    setGenerating(true)
    try {
      const summary = await generateSkillGapSummary(skillGapJobs, llmClient)
      dispatch({ type: 'SET_SKILL_GAP_SUMMARY', payload: summary })
      await track('daily_summary_generated')
      dispatch({ type: 'SET_TOAST', payload: { message: 'Daily summary ready!', type: 'success' } })
    } catch (err) {
      dispatch({ type: 'SET_TOAST', payload: { message: err.message, type: 'error' } })
    } finally {
      setGenerating(false)
    }
  }

  if (isFetching || isScoring) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <TrendingUp size={40} className="text-gray-700 mb-4 animate-pulse" />
        <p className="text-gray-400">Analyzing skill gaps…</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Generate Summary Button */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium text-gray-200 mb-1">Daily Skill Gap Summary</h3>
            <p className="text-sm text-gray-500">
              Aggregate all {skillGapJobs.length} below-threshold jobs into one actionable digest.
            </p>
          </div>
          <button
            className="btn-primary whitespace-nowrap flex items-center gap-2 shrink-0"
            onClick={handleGenerateSummary}
            disabled={generating || !llmClient || !skillGapJobs.length}
          >
            {generating ? <Spinner size={14} /> : <TrendingUp size={14} />}
            {skillGapSummary ? 'Regenerate' : 'Generate Summary'}
          </button>
        </div>

        {!llmClient && (
          <p className="text-xs text-amber-400 mt-2">Add an API key in Settings to generate your summary.</p>
        )}
      </div>

      {/* Summary Output */}
      {skillGapSummary?.length > 0 && <SkillGapSummaryView summary={skillGapSummary} />}

      {/* Job cards */}
      {skillGapJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <TrendingUp size={36} className="text-gray-700 mb-3" />
          <h3 className="text-base font-medium text-gray-400 mb-1">No skill gap jobs yet</h3>
          <p className="text-sm text-gray-600">Jobs scoring below 7.5 will appear here after you refresh.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 px-1">{skillGapJobs.length} jobs below threshold</p>
          {skillGapJobs.map((job) => (
            <JobCard key={job.id} job={job} mode="skill-gap" />
          ))}
        </div>
      )}
    </div>
  )
}

function SkillGapSummaryView({ summary }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-800"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-amber-400" />
          <span className="font-medium text-gray-200">Top {summary.length} Skill Gaps</span>
          <span className="badge-amber">Today's analysis</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>

      {expanded && (
        <div className="divide-y divide-gray-800">
          {summary.map((item, i) => (
            <div key={i} className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-amber-400">#{i + 1}</span>
                <div>
                  <h4 className="font-semibold text-gray-100">{item.skill}</h4>
                  <p className="text-xs text-gray-500">
                    Needed in {item.frequency} job{item.frequency !== 1 ? 's' : ''} today
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Course */}
                <div className="bg-gray-800/40 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400 mb-1">
                    <BookOpen size={12} /> Course
                  </div>
                  <p className="text-sm text-gray-300">{item.course?.name}</p>
                  <p className="text-xs text-gray-500">{item.course?.platform}</p>
                  {item.course?.url && item.course.url.startsWith('http') && (
                    <a
                      href={item.course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1"
                    >
                      Open <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                {/* Time */}
                <div className="bg-gray-800/40 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 mb-1">
                    <Clock size={12} /> Time to Proficiency
                  </div>
                  <p className="text-2xl font-bold text-gray-100">{item.hours_to_proficiency}</p>
                  <p className="text-xs text-gray-500">hours</p>
                </div>

                {/* Project */}
                <div className="bg-gray-800/40 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-purple-400 mb-1">
                    <Code size={12} /> Project Idea
                  </div>
                  <p className="text-sm text-gray-300">{item.project_idea}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
