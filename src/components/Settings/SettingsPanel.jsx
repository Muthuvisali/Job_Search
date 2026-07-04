import { useState, useRef } from 'react'
import {
  X, Eye, EyeOff, Upload, Shield, CheckCircle, AlertCircle,
  Plus, Zap, Key, Cpu
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { detectProvider, validateApiKey } from '../../services/llm'
import { parseResumeFile, structureResume } from '../../services/resumeParser'
import { computeResumeEmbedding } from '../../services/embeddings'
import { track } from '../../services/metrics'
import Spinner from '../common/Spinner'

export default function SettingsPanel() {
  const { state, dispatch } = useApp()
  const { preferences } = state

  const [apiKeyInput, setApiKeyInput] = useState(state.apiKey || '')
  const [showKey, setShowKey] = useState(false)
  const [validating, setValidating] = useState(false)
  const [keyStatus, setKeyStatus] = useState(state.apiKey ? 'valid' : null)
  const [uploading, setUploading] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const fileRef = useRef(null)

  const provider = detectProvider(apiKeyInput)
  const usingDefault = !state.apiKey

  async function handleValidateKey() {
    const trimmed = apiKeyInput.trim()
    if (!trimmed) return
    setValidating(true)
    setKeyStatus(null)
    try {
      const prov = detectProvider(trimmed)
      if (!prov) { setKeyStatus('invalid'); return }
      const ok = await validateApiKey(trimmed, prov)
      setKeyStatus(ok ? 'valid' : 'invalid')
      if (ok) {
        dispatch({ type: 'SET_API_KEY', payload: trimmed })
        await track('api_key_type', { provider: prov })
        dispatch({
          type: 'SET_TOAST',
          payload: {
            message: `${prov === 'anthropic' ? 'Claude (Anthropic)' : 'OpenAI'} key active — using your model`,
            type: 'success',
          },
        })
      }
    } finally {
      setValidating(false)
    }
  }

  function handleRemoveKey() {
    setApiKeyInput('')
    setKeyStatus(null)
    dispatch({ type: 'CLEAR_API_KEY' })
    dispatch({ type: 'SET_TOAST', payload: { message: 'Switched back to free Llama default', type: 'info' } })
  }

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const rawText = await parseResumeFile(file)
      let resumeJson = { rawText }
      try {
        const jsonStr = await structureResume(rawText, state.llmClient.call)
        resumeJson = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
      } catch {
        // rawText fallback
      }
      dispatch({ type: 'SET_RESUME', payload: { text: rawText, json: resumeJson } })
      if (state.llmClient.provider === 'openai') {
        try {
          const emb = await computeResumeEmbedding(rawText, state.llmClient)
          dispatch({ type: 'SET_RESUME_EMBEDDING', payload: emb })
        } catch {
          // embeddings optional
        }
      }
      dispatch({ type: 'SET_SETUP_COMPLETE', payload: true })
      await track('resume_uploaded')
      dispatch({ type: 'SET_TOAST', payload: { message: 'Resume parsed successfully', type: 'success' } })
    } catch (err) {
      dispatch({ type: 'SET_TOAST', payload: { message: err.message, type: 'error' } })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function updatePref(key, value) {
    dispatch({ type: 'SET_PREFERENCES', payload: { ...preferences, [key]: value } })
  }

  function addTitle() {
    const t = titleInput.trim()
    if (!t || preferences.targetTitles.includes(t)) return
    updatePref('targetTitles', [...preferences.targetTitles, t])
    setTitleInput('')
  }

  function removeTitle(t) {
    updatePref('targetTitles', preferences.targetTitles.filter((x) => x !== t))
  }

  function toggleSource(src) {
    updatePref('sources', { ...preferences.sources, [src]: !preferences.sources[src] })
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className="flex-1 bg-black/60 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', payload: false })}
      />
      <div className="w-full max-w-md bg-gray-900 border-l border-gray-800 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', payload: false })} className="btn-ghost p-1.5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-8">

          {/* Active model indicator */}
          <div className={`rounded-xl p-4 border ${
            usingDefault
              ? 'bg-emerald-950/30 border-emerald-800/40'
              : 'bg-indigo-950/30 border-indigo-800/40'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {usingDefault ? <Cpu size={15} className="text-emerald-400" /> : <Zap size={15} className="text-indigo-400" />}
              <span className={`text-sm font-semibold ${usingDefault ? 'text-emerald-300' : 'text-indigo-300'}`}>
                {usingDefault ? 'Using free default model' : `Using ${state.llmClient?.displayName}`}
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {usingDefault
                ? 'Llama 3.3 70B via Groq is powering all AI features for free. Add your own API key below to switch to Claude or GPT-4o mini.'
                : 'Your API key is active. All LLM calls use your key directly from your browser — never via our servers.'}
            </p>
          </div>

          {/* Optional API Key */}
          <section>
            <h3 className="text-sm font-semibold text-gray-200 mb-1 flex items-center gap-2">
              <Key size={14} className="text-gray-400" />
              Your API Key <span className="text-xs font-normal text-gray-500">(optional upgrade)</span>
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Paste an Anthropic key (<code className="text-gray-400">sk-ant-…</code>) for Claude, or
              an OpenAI key (<code className="text-gray-400">sk-…</code>) for GPT-4o mini. The free
              Llama default works without any key.
            </p>

            <div className="bg-indigo-950/30 border border-indigo-800/30 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <Shield size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                <p className="text-xs text-indigo-300 leading-relaxed">
                  Your key is stored only in this browser session — never sent to any server we control.
                  It disappears when you close this tab.
                </p>
              </div>
            </div>

            {state.apiKey ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                  <span className="text-sm text-gray-300 font-mono truncate">
                    {state.apiProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} key active
                  </span>
                </div>
                <button onClick={handleRemoveKey} className="btn-ghost text-sm text-red-400 hover:text-red-300 whitespace-nowrap">
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="sk-ant-… or sk-…"
                      value={apiKeyInput}
                      onChange={(e) => { setApiKeyInput(e.target.value); setKeyStatus(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && handleValidateKey()}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <button
                    className="btn-primary whitespace-nowrap"
                    onClick={handleValidateKey}
                    disabled={validating || !apiKeyInput.trim()}
                  >
                    {validating ? <Spinner size={14} /> : 'Use Key'}
                  </button>
                </div>

                {provider && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Detected: <span className="text-indigo-300">
                      {provider === 'anthropic' ? 'Anthropic → Claude Haiku' : 'OpenAI → GPT-4o mini + embeddings'}
                    </span>
                  </p>
                )}

                {keyStatus === 'valid' && (
                  <p className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
                    <CheckCircle size={13} /> Key valid
                  </p>
                )}
                {keyStatus === 'invalid' && (
                  <p className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                    <AlertCircle size={13} /> Invalid key or unrecognized format
                  </p>
                )}
              </>
            )}
          </section>

          {/* Resume Upload */}
          <section>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Resume <span className="text-red-400">*</span></h3>
            <input ref={fileRef} type="file" accept=".docx,.pdf,.txt" className="hidden" onChange={handleResumeUpload} />
            <button
              className="btn-secondary w-full flex items-center justify-center gap-2"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <><Spinner size={14} /> Parsing resume…</> : <><Upload size={15} /> {state.resumeText ? 'Replace Resume' : 'Upload Resume'}</>}
            </button>
            {state.resumeText && (
              <div className="mt-2 bg-emerald-900/20 border border-emerald-800/40 rounded-lg px-3 py-2">
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle size={12} />
                  Resume loaded · {state.resumeText.length.toLocaleString()} chars
                  {state.resumeEmbedding && ' · vector cached'}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-600 mt-2">Supports .docx, .pdf, .txt</p>
          </section>

          {/* Target Titles */}
          <section>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Target Job Titles</h3>
            <div className="flex gap-2 mb-2">
              <input
                className="input"
                placeholder="e.g. Product Manager"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTitle()}
              />
              <button className="btn-secondary px-3" onClick={addTitle}><Plus size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[28px]">
              {preferences.targetTitles.map((t) => (
                <span key={t} className="badge-blue flex items-center gap-1 py-1 px-2.5">
                  {t}
                  <button onClick={() => removeTitle(t)} className="hover:text-blue-100 ml-0.5"><X size={11} /></button>
                </span>
              ))}
              {!preferences.targetTitles.length && <p className="text-xs text-gray-600">No titles set — all jobs pass the filter</p>}
            </div>
          </section>

          {/* Location */}
          <section>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Location</h3>
            <input
              className="input mb-2"
              placeholder="e.g. New York, NY"
              value={preferences.location}
              onChange={(e) => updatePref('location', e.target.value)}
            />
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input
                type="checkbox"
                checked={preferences.remoteOnly}
                onChange={(e) => updatePref('remoteOnly', e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500"
              />
              Remote only
            </label>
          </section>

          {/* Sources */}
          <section>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Job Sources</h3>
            <div className="space-y-2">
              {[
                { key: 'jsearch', label: 'JSearch', sub: 'Aggregates LinkedIn, Indeed, Glassdoor' },
                { key: 'adzuna', label: 'Adzuna', sub: 'Strong salary data' },
                { key: 'remoteok', label: 'RemoteOK', sub: 'Free · Remote-first' },
                { key: 'remotive', label: 'Remotive', sub: 'Free · PM, Design, Tech' },
              ].map(({ key, label, sub }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    checked={preferences.sources[key] !== false}
                    onChange={() => toggleSource(key)}
                    className="w-4 h-4 rounded accent-indigo-500 mt-0.5"
                  />
                  <div>
                    <span className="text-sm text-gray-200">{label}</span>
                    <p className="text-xs text-gray-500">{sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Status footer */}
        <div className="px-6 pb-6">
          <div className={`rounded-lg p-3 text-xs ${
            state.isSetupComplete
              ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-400'
              : 'bg-gray-800 border border-gray-700 text-gray-500'
          }`}>
            {state.isSetupComplete
              ? '✓ Ready. Click Refresh Jobs to start.'
              : 'Upload your resume to get started — no API key required.'}
          </div>
        </div>
      </div>
    </div>
  )
}
