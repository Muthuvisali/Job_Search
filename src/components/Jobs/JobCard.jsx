import { useState } from 'react'
import {
  ChevronDown, ChevronUp, ExternalLink, Briefcase, MapPin,
  DollarSign, Clock, Zap, FileText, CheckCircle
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { tailorResume, generateCoverLetter, generateInterviewPrep } from '../../services/tailorer'
import { downloadResumeDocx, downloadCoverLetterDocx } from '../../services/docxExport'
import { track } from '../../services/metrics'
import Spinner from '../common/Spinner'

const SOURCE_LABELS = {
  jsearch: { label: 'JSearch', color: 'badge-blue' },
  adzuna: { label: 'Adzuna', color: 'badge-purple' },
  remoteok: { label: 'RemoteOK', color: 'badge-gray' },
  remotive: { label: 'Remotive', color: 'badge-gray' },
}

function ScoreBadge({ score }) {
  const color = score >= 7.5 ? 'badge-green' : score >= 5 ? 'badge-amber' : 'badge-gray'
  return <span className={color}>{score.toFixed(1)}/10</span>
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function JobCard({ job, mode = 'high-match', readOnly = false }) {
  const { state, dispatch } = useApp()
  const [expanded, setExpanded] = useState(false)
  const [tailoring, setTailoring] = useState(false)
  const [generatingCL, setGeneratingCL] = useState(false)
  const [markingApplied, setMarkingApplied] = useState(false)
  const [localJob, setLocalJob] = useState(job)

  const src = SOURCE_LABELS[job.source] || { label: job.source, color: 'badge-gray' }

  async function handleTailor() {
    if (!state.llmClient || !state.resumeJson) return
    setTailoring(true)
    try {
      const tailored = await tailorResume(job, state.resumeJson, state.llmClient)
      const updated = { ...localJob, tailoredResume: tailored }
      setLocalJob(updated)
      dispatch({ type: 'UPDATE_JOB_IN_HIGH_MATCH', payload: updated })
      await track('resume_tailored')
      dispatch({ type: 'SET_TOAST', payload: { message: 'Resume tailored!', type: 'success' } })
    } catch (err) {
      dispatch({ type: 'SET_TOAST', payload: { message: err.message, type: 'error' } })
    } finally {
      setTailoring(false)
    }
  }

  async function handleCoverLetter() {
    if (!state.llmClient) return
    setGeneratingCL(true)
    try {
      const resume = localJob.tailoredResume || state.resumeText
      const cl = await generateCoverLetter(job, resume, state.llmClient)
      const updated = { ...localJob, coverLetter: cl }
      setLocalJob(updated)
      dispatch({ type: 'UPDATE_JOB_IN_HIGH_MATCH', payload: updated })
      await track('cover_letter_generated')
      dispatch({ type: 'SET_TOAST', payload: { message: 'Cover letter generated!', type: 'success' } })
    } catch (err) {
      dispatch({ type: 'SET_TOAST', payload: { message: err.message, type: 'error' } })
    } finally {
      setGeneratingCL(false)
    }
  }

  async function handleMarkApplied() {
    if (!state.llmClient) return
    setMarkingApplied(true)
    try {
      const resume = localJob.tailoredResume || state.resumeText
      const prep = await generateInterviewPrep(job, resume, state.llmClient)
      const appliedJob = {
        ...localJob,
        tailoredResume: localJob.tailoredResume || state.resumeText,
        coverLetter: localJob.coverLetter || '',
        interviewPrep: prep,
        appliedAt: new Date().toISOString(),
      }
      dispatch({ type: 'MARK_APPLIED', payload: appliedJob })
      await track('job_applied')
    } catch (err) {
      dispatch({ type: 'SET_TOAST', payload: { message: err.message, type: 'error' } })
    } finally {
      setMarkingApplied(false)
    }
  }

  return (
    <div className={`card transition-all duration-200 ${expanded ? 'shadow-lg shadow-black/30' : ''}`}>
      {/* Header */}
      <button
        className="w-full text-left px-5 py-4 flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <ScoreBadge score={localJob.score} />
            <span className={src.color}>{src.label}</span>
            {mode === 'skill-gap' && localJob.missingSkills?.slice(0, 2).map((s) => (
              <span key={s} className="badge-amber">{s}</span>
            ))}
          </div>
          <h3 className="font-semibold text-gray-100 text-base leading-tight truncate">{job.title}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Briefcase size={13} />{job.company}
            </span>
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />{job.location}
              </span>
            )}
            {job.salary && (
              <span className="flex items-center gap-1 text-emerald-400">
                <DollarSign size={13} />{job.salary}
              </span>
            )}
            <span className="flex items-center gap-1 text-gray-600">
              <Clock size={13} />{timeAgo(job.postedAt)}
            </span>
          </div>
        </div>
        <div className="text-gray-600 shrink-0 mt-0.5">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-800 px-5 py-4 space-y-4">
          {/* Match reason */}
          {localJob.matchReason && (
            <div className="bg-gray-800/60 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-400 mb-1">Match Analysis</p>
              <p className="text-sm text-gray-300">{localJob.matchReason}</p>
              {localJob.matchingSkills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {localJob.matchingSkills.map((s) => (
                    <span key={s} className="badge-green">{s}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Job description */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Job Description</p>
            <div className="text-sm text-gray-400 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap rounded-lg bg-gray-800/30 p-3">
              {job.description || 'No description available.'}
            </div>
          </div>

          {/* Tailored resume */}
          {localJob.tailoredResume && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2">Tailored Resume</p>
              <textarea
                className="textarea text-sm font-mono text-gray-300 max-h-64"
                value={localJob.tailoredResume}
                rows={10}
                onChange={(e) => setLocalJob({ ...localJob, tailoredResume: e.target.value })}
                readOnly={readOnly}
              />
            </div>
          )}

          {/* Cover letter */}
          {localJob.coverLetter && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2">Cover Letter</p>
              <textarea
                className="textarea text-sm text-gray-300 max-h-64"
                value={localJob.coverLetter}
                rows={8}
                onChange={(e) => setLocalJob({ ...localJob, coverLetter: e.target.value })}
                readOnly={readOnly}
              />
            </div>
          )}

          {/* Interview prep */}
          {localJob.interviewPrep && <InterviewPrepView prep={localJob.interviewPrep} />}

          {/* Actions */}
          {!readOnly && (
            <div className="flex flex-wrap gap-2 pt-1">
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-sm flex items-center gap-1.5"
                >
                  <ExternalLink size={14} /> View Job
                </a>
              )}
              {mode === 'high-match' && (
                <>
                  <button
                    className="btn-secondary text-sm flex items-center gap-1.5"
                    onClick={handleTailor}
                    disabled={tailoring || !state.llmClient}
                  >
                    {tailoring ? <Spinner size={13} /> : <Zap size={13} />}
                    {localJob.tailoredResume ? 'Re-tailor Resume' : 'Tailor Resume'}
                  </button>
                  <button
                    className="btn-secondary text-sm flex items-center gap-1.5"
                    onClick={handleCoverLetter}
                    disabled={generatingCL || !state.llmClient}
                  >
                    {generatingCL ? <Spinner size={13} /> : <FileText size={13} />}
                    {localJob.coverLetter ? 'Regenerate Cover Letter' : 'Cover Letter'}
                  </button>
                  <button
                    className="btn-primary text-sm flex items-center gap-1.5 ml-auto"
                    onClick={handleMarkApplied}
                    disabled={markingApplied || !state.llmClient}
                  >
                    {markingApplied ? <Spinner size={13} /> : <CheckCircle size={13} />}
                    Mark Applied
                  </button>
                </>
              )}
            </div>
          )}

          {/* Download buttons for applied tab */}
          {readOnly && (
            <div className="flex flex-wrap gap-2 pt-1">
              {localJob.tailoredResume && (
                <button
                  className="btn-secondary text-sm flex items-center gap-1.5"
                  onClick={() => downloadResumeDocx(localJob.tailoredResume, job.title, job.company)}
                >
                  <FileText size={13} /> Download Resume (.docx)
                </button>
              )}
              {localJob.coverLetter && (
                <button
                  className="btn-secondary text-sm flex items-center gap-1.5"
                  onClick={() => downloadCoverLetterDocx(localJob.coverLetter, job.title, job.company)}
                >
                  <FileText size={13} /> Download Cover Letter (.docx)
                </button>
              )}
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-sm flex items-center gap-1.5"
                >
                  <ExternalLink size={14} /> View Original
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InterviewPrepView({ prep }) {
  if (prep.raw) return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-2">Interview Prep</p>
      <div className="text-sm text-gray-400 bg-gray-800/30 rounded-lg p-3 whitespace-pre-wrap">
        {prep.raw}
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-400">Interview Prep</p>

      {prep.likely_questions?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Likely Questions</p>
          <div className="space-y-2">
            {prep.likely_questions.map((q, i) => (
              <div key={i} className="bg-gray-800/40 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-200">{q.question}</p>
                {q.tip && <p className="text-xs text-gray-500 mt-1">Tip: {q.tip}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {prep.key_topics_to_review?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Topics to Review</p>
          <div className="flex flex-wrap gap-1.5">
            {prep.key_topics_to_review.map((t) => (
              <span key={t} className="badge-blue">{t}</span>
            ))}
          </div>
        </div>
      )}

      {prep.company_research_points?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Research Points</p>
          <ul className="text-sm text-gray-400 space-y-1">
            {prep.company_research_points.map((p, i) => (
              <li key={i} className="flex gap-2"><span className="text-gray-600">•</span>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
