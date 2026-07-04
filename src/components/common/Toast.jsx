import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const icons = {
  success: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
  error: <XCircle size={16} className="text-red-400 shrink-0" />,
  info: <AlertCircle size={16} className="text-blue-400 shrink-0" />,
}

export default function Toast() {
  const { state, dispatch } = useApp()
  if (!state.toast) return null

  const { message, type = 'info' } = state.toast

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm" style={{ animation: 'slideUp 0.2s ease-out' }}>
      <div className="flex items-start gap-3 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 shadow-2xl">
        {icons[type]}
        <p className="text-sm text-gray-200 flex-1">{message}</p>
        <button
          onClick={() => dispatch({ type: 'SET_TOAST', payload: null })}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
