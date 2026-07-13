import { useState } from 'react'
import {
  FileText, Zap, CheckCircle, AlertTriangle, ChevronDown, ChevronUp,
  RotateCcw, Download, ArrowRight,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { runAtsCheck, rescoreWithKeywords } from '../../services/atsChecker'
import { tailorResumeForAts, explainAtsFailure } from '../../services/tailorer'
import { downloadResumeDocx } from '../../services/docxExport'
import { track } from '../../services/metrics'
import Spinner from '../common/Spinner'

const PASS_THRESHOLD = 85

const STEP_LABELS = {
  checking:  'Scanning JD for ATS keywords…',
  editing:   'Optimizing resume with missing keywords…',
  rescoring: 'Re-scoring edited resume…',
  explaining:'Generating gap analysis…',
  forcing:   'Adding keywords to Skills section…',
}

export default function ResumeTab() {
  const { state, dispatch } = useApp()
  const { resumeText, llmClient } = state

  const [jd, setJd]                   = useState('')
  const [step, setStep]               = useState('idle')
  // idle | checking | editing | rescoring | explaining
  // | pass | already_pass | fail | forcing | forced

  const [atsResult, setAtsResult]     = useState(null)
  const [editedResume, setEditedResume] = useState('')
  const [finalScore, setFinalScore]   = useState(null)
  const [failReason, setFailReason]   = useState('')
  const [showMatched, setShowMatched] = useState(false)
  const [saveForm, setSaveForm]       = useState({ open: false, title: '', company: '' })

  const isProcessing = step in STEP_LABELS
  const canRun = !!resumeText && jd.trim().length > 50 && !!llmClient && !isProcessing

  function toast(message, type = 'error') {
    dispatch({ type: 'SET_TOAST', payload: { message, type } })
  }

  async function handleRun() {
    if (!canRun) return
    setStep('checking')
    setAtsResult(null)
    setEditedResume('')
    setFinalScore(null)
    setFailReason('')
    setShowMatched(false)

    try {
      // ── Step 1: ATS scan ──────────────────────────────────────────
      const ats = await runAtsCheck(jd, resumeText, llmClient)
      setAtsResult(ats)
      await track('resume_tailored')

      if (ats.score >= PASS_THRESHOLD) {
        // Already passes — no edit needed
        setEditedResume(resumeText)
        setFinalScore(ats.score)
        setStep('already_pass')
        return
      }

      // ── Step 2: Edit resume ───────────────────────────────────────
      setStep('editing')
      const edited = await tailorResumeForAts(jd, resumeText, ats.missingKeywords, llmClient, false)

      // ── Step 3: Rescore ───────────────────────────────────────────
      setStep('rescoring')
      const newScore = rescoreWithKeywords(edited, ats.matchedKeywords, ats.missingKeywords)
      setEditedResume(edited)
      setFinalScore(newScore)

      if (newScore >= PASS_THRESHOLD) {
        setStep('pass')
        return
      }

      // ── Step 4: Explain failure ───────────────────────────────────
      setStep('explaining')
      const reason = await explainAtsFailure(jd, resumeText, ats.missingKeywords, llmClient)
      setFailReason(reason)
      setStep('fail')

    } catch (err) {
      toast(err.message)
      setStep('idle')
    }
  }

  async function handleForce() {
    if (!atsResult) return
    setStep('forcing')
    try {
      const forced = await tailorResumeForAts(jd, resumeText, atsResult.missingKeywords, llmClient, true)
      const score  = rescoreWithKeywords(forced, atsResult.matchedKeywords, atsResult.missingKeywords)
      setEditedResume(forced)
      setFinalScore(score)
      setStep('forced')
    } catch (err) {
      toast(err.message)
      setStep('fail')
    }
  }

  function handleSaveToTracker() {
    if (!saveForm.title || !saveForm.company) return
    const job = {
      id:            `manual_${Date.now()}`,
      title:         saveForm.title,
      company:       saveForm.company,
      description:   jd,
      url:           '',
      source:        'manual',
      score:         finalScore,
      tailoredResume: editedResume,
      coverLetter:   '',
      interviewPrep: null,
      appliedAt:     new Date().toISOString(),
    }
    dispatch({ type: 'MARK_APPLIED', payload: job })
    setSaveForm({ open: false, title: '', company: '' })
    track('job_applied')
    toast('Saved to Applied Tracker', 'success')
  }

  function reset() {
    setStep('idle')
    setAtsResult(null)
    setEditedResume('')
    setFinalScore(null)
    setFailReason('')
    setSaveForm({ open: false, title: '', company: '' })
  }

  const wordCount = editedResume
    ? editedResume.trim().split(/\s+/).filter(Boolean).length
    : 0

  // ── No resume loaded ─────────────────────────────────────────────
  if (!resumeText) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <FileText size={44} className="text-gray-700 mb-4" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No resume loaded</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Open <strong className="text-gray-400">Settings</strong> and upload your resume to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* ── JD Input card ─────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-100 flex items-center gap-2">
            <FileText size={16} className="text-indigo-400" />
            Job Description
          </h2>
          {step !== 'idle' && (
            <button onClick={reset} className="btn-ghost text-xs flex items-center gap-1.5 text-gray-500">
              <RotateCcw size={12} /> Start over
            </button>
          )}
        </div>

        <textarea
          className="textarea font-mono text-sm leading-relaxed"
          rows={9}
          placeholder="Paste the full job description here…"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          disabled={isProcessing}
        />

        <button
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
          onClick={handleRun}
          disabled={!canRun}
        >
          {isProcessing ? <Spinner size={15} /> : <Zap size={15} />}
          {isProcessing ? STEP_LABELS[step] : 'Check ATS & Edit Resume'}
        </button>

        {!llmClient && (
          <p className="text-xs text-center text-amber-400">
            Add an API key in Settings to use this feature.
          </p>
        )}
        {!resumeText && (
          <p className="text-xs text-center text-amber-400">
            Upload your resume in Settings first.
          </p>
        )}
      </div>

      {/* ── Inline progress for long steps ────────────────────────── */}
      {isProcessing && (
        <div className="card px-4 py-3 flex items-center gap-3">
          <Spinner size={15} className="text-indigo-400 shrink-0" />
          <p className="text-sm text-gray-400">{STEP_LABELS[step]}</p>
        </div>
      )}

      {/* ── ATS scan result panel ──────────────────────────────────── */}
      {atsResult && !isProcessing && <AtsPanel ats={atsResult} showMatched={showMatched} onToggle={() => setShowMatched(!showMatched)} />}

      {/* ── Fail panel ────────────────────────────────────────────── */}
      {step === 'fail' && (
        <div className="card p-5 space-y-4 border-amber-800/40">
          <div className="flex items-start gap-3">
            <AlertTriangle size={17} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300 mb-1.5">
                Edited resume scored {finalScore}% — below the 85% threshold
              </p>
              <p className="text-sm text-gray-400 leading-relaxed">{failReason}</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-4 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Proceed anyway? Missing keywords will be appended to the Skills section.
            </p>
            <button
              className="btn-secondary text-sm whitespace-nowrap flex items-center gap-1.5"
              onClick={handleForce}
            >
              <ArrowRight size={13} /> Yes, proceed
            </button>
          </div>
        </div>
      )}

      {/* ── Result panel (pass / already_pass / forced) ────────────── */}
      {(step === 'pass' || step === 'already_pass' || step === 'forced') && editedResume && (
        <div className="card overflow-hidden">
          {/* Result header */}
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
            <CheckCircle
              size={16}
              className={step === 'forced' ? 'text-amber-400' : 'text-emerald-400'}
            />
            <span className="font-semibold text-gray-100 flex-1">
              {step === 'already_pass' ? 'Your resume already passes ATS' :
               step === 'forced'       ? 'Resume with keywords added to Skills' :
                                         'ATS-Optimized Resume'}
            </span>
            {finalScore !== null && (
              <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full border ${
                finalScore >= PASS_THRESHOLD
                  ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50'
                  : 'bg-amber-900/60 text-amber-300 border-amber-700/50'
              }`}>
                {finalScore}% ATS
              </span>
            )}
          </div>

          {/* Resume textarea */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">
                {wordCount} words
                {wordCount > 550 && (
                  <span className="text-amber-400 ml-2">· over one-page limit — trim if needed</span>
                )}
              </span>
              <button
                className="btn-secondary text-xs flex items-center gap-1.5"
                onClick={() => downloadResumeDocx(editedResume, saveForm.title || 'Optimized', saveForm.company || 'Role')}
              >
                <Download size={12} /> Download .docx
              </button>
            </div>

            <textarea
              className="textarea font-mono text-sm leading-relaxed"
              rows={30}
              value={editedResume}
              onChange={(e) => setEditedResume(e.target.value)}
            />

            <p className="text-xs text-gray-600">
              You can edit directly above before downloading.
            </p>

            {/* Save to tracker */}
            {!saveForm.open ? (
              <button
                className="btn-ghost text-xs text-gray-500 flex items-center gap-1.5 mt-1"
                onClick={() => setSaveForm((f) => ({ ...f, open: true }))}
              >
                <CheckCircle size={12} /> Save to Applied Tracker
              </button>
            ) : (
              <div className="border border-gray-800 rounded-lg p-3 space-y-2 mt-1">
                <p className="text-xs text-gray-400 font-medium">Save to Applied Tracker</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input text-sm"
                    placeholder="Job title"
                    value={saveForm.title}
                    onChange={(e) => setSaveForm((f) => ({ ...f, title: e.target.value }))}
                  />
                  <input
                    className="input text-sm"
                    placeholder="Company"
                    value={saveForm.company}
                    onChange={(e) => setSaveForm((f) => ({ ...f, company: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-primary text-xs"
                    onClick={handleSaveToTracker}
                    disabled={!saveForm.title || !saveForm.company}
                  >
                    Save
                  </button>
                  <button
                    className="btn-ghost text-xs text-gray-500"
                    onClick={() => setSaveForm({ open: false, title: '', company: '' })}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AtsPanel({ ats, showMatched, onToggle }) {
  const { score, matchedKeywords, missingKeywords, analysis } = ats
  const color = score >= PASS_THRESHOLD ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'
  const barColor = score >= PASS_THRESHOLD ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="card overflow-hidden">
      {/* Score row */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-5">
        <div className="shrink-0 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Initial ATS</p>
          <p className={`text-3xl font-bold tabular-nums ${color}`}>{score}%</p>
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${score}%` }} />
          </div>
          {/* 85% marker */}
          <div className="relative h-0">
            <div className="absolute top-0 h-3 w-px bg-gray-600" style={{ left: '85%' }}>
              <span className="absolute -top-4 -translate-x-1/2 text-[10px] text-gray-600">85%</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed pt-1">{analysis}</p>
        </div>
      </div>

      {/* Keywords */}
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">
            Missing ({missingKeywords.length})
          </p>
          {missingKeywords.length === 0
            ? <p className="text-xs text-gray-600">None — great coverage!</p>
            : (
              <div className="flex flex-wrap gap-1.5">
                {missingKeywords.map((k) => (
                  <span key={k} className="badge-amber">{k}</span>
                ))}
              </div>
            )
          }
        </div>

        <div>
          <button
            onClick={onToggle}
            className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide flex items-center gap-1 hover:text-emerald-300"
          >
            Matched ({matchedKeywords.length})
            {showMatched ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {showMatched && (
            <div className="flex flex-wrap gap-1.5">
              {matchedKeywords.map((k) => (
                <span key={k} className="badge-green">{k}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
