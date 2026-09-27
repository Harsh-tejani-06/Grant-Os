import { useState } from 'react'
import { useAgency } from '../components/AgencyContext'
import GrantCallEditorModal from '../components/GrantCallEditorModal'
import api from '../api'

const formatDate = (dateValue) => {
  if (!dateValue) return '—'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return dateValue
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_TONE = {
  Draft: 'bg-warm-gray-100 text-warm-gray-600 border-warm-gray-200',
  Upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-amber-50 text-amber border-amber/20',
  'Under Review': 'bg-purple-50 text-purple-700 border-purple-200',
  Completed: 'bg-warm-gray-100 text-warm-gray-600 border-warm-gray-200',
  Archived: 'bg-warm-gray-100 text-warm-gray-400 border-warm-gray-200',
}

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export default function AgencyGrantCallsPage() {
  const { programsList, loading, refreshPrograms, refreshStats } = useAgency()
  const [editingProgram, setEditingProgram] = useState(null) // null = closed, {} = new, {...} = editing existing
  const [notificationMsg, setNotificationMsg] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const draftCount = programsList.filter((p) => p.status === 'Draft').length

  const handleGrantSaved = (savedProgram, { published, silent } = {}) => {
    refreshPrograms()
    refreshStats()
    if (published) {
      setNotificationMsg('Grant call published successfully!')
      setTimeout(() => setNotificationMsg(''), 4000)
    } else if (!silent) {
      setNotificationMsg('Grant call saved.')
      setTimeout(() => setNotificationMsg(''), 3000)
    }
  }

  // Two required confirmations, in order, before the delete API is ever called.
  const handleDelete = async (prog) => {
    const firstConfirm = window.confirm('Are you sure you want to delete this grant?')
    if (!firstConfirm) return

    const secondConfirm = window.confirm(
      'This action will permanently delete the grant and its associated grant data. This action cannot be undone. Are you sure you want to permanently delete this grant?'
    )
    if (!secondConfirm) return

    setDeletingId(prog._id)
    try {
      const res = await api.delete(`/agency/programs/${prog._id}`)
      refreshPrograms()
      refreshStats()
      setNotificationMsg(
        res.data.softDeleted
          ? 'Grant call archived — existing proposals were preserved.'
          : 'Grant call permanently deleted.'
      )
      setTimeout(() => setNotificationMsg(''), 4000)
    } catch (err) {
      setNotificationMsg(err.response?.data?.message || 'Failed to delete grant call.')
      setTimeout(() => setNotificationMsg(''), 3000)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {notificationMsg && (
        <div className="p-4 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-fade-in shadow-soft">
          <span>✓</span>
          <span>{notificationMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
        <div>
          <h2 className="font-heading text-2xl font-bold text-warm-gray-900">Grant Calls</h2>
          <p className="text-xs text-warm-gray-500 mt-1">
            {draftCount > 0 ? `${draftCount} draft${draftCount === 1 ? '' : 's'} in progress • ` : ''}
            Manage draft, upcoming, active, and closed funding opportunities.
          </p>
        </div>
        <button
          onClick={() => setEditingProgram({})}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-sm font-semibold transition-all shadow-soft cursor-pointer"
        >
          <PlusIcon /> New Grant Call
        </button>
      </div>

      {loading && <p className="text-sm text-warm-gray-400 py-8 text-center">Loading grant calls…</p>}

      {!loading && programsList.length === 0 && (
        <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-10 text-center">
          <p className="text-sm text-warm-gray-500 mb-4">You haven't created any grant calls yet.</p>
          <button
            onClick={() => setEditingProgram({})}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-sm font-semibold transition-all shadow-soft cursor-pointer"
          >
            <PlusIcon /> Create Your First Grant Call
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {programsList.map((prog) => {
          const documentUrl = prog.document?.fileUrl
            ? `${api.defaults.baseURL?.replace(/\/api\/?$/, '') || ''}${prog.document.fileUrl}`
            : null

          return (
            <div
              key={prog._id}
              className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft hover:shadow-medium transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-amber bg-amber-50 px-2.5 py-1 rounded-full border border-amber/15">
                  {prog.displayId}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${STATUS_TONE[prog.status] || STATUS_TONE.Draft}`}>
                  {prog.status}
                </span>
              </div>

              <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-1">{prog.title}</h3>
              {prog.shortTitle && <p className="text-[11px] text-warm-gray-400 mb-2 font-mono">{prog.shortTitle}</p>}
              <p className="text-xs text-warm-gray-500 mb-4">{prog.category || 'No category yet'} • {prog.fundingType}</p>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-[12px] bg-cream border border-warm-gray-200 mb-3 text-xs">
                <div>
                  <span className="text-warm-gray-400 block text-[11px]">Funding</span>
                  <strong className="text-warm-gray-900 font-semibold text-sm">{prog.budget || '—'}</strong>
                </div>
                <div>
                  <span className="text-warm-gray-400 block text-[11px]">Submissions</span>
                  <strong className="text-warm-gray-900 font-semibold text-sm">{prog.applicationsCount || 0} Proposals</strong>
                </div>
                <div>
                  <span className="text-warm-gray-400 block text-[11px]">Submission Deadline</span>
                  <span className="text-warm-gray-700 font-medium">{formatDate(prog.deadline)}</span>
                </div>
                <div>
                  <span className="text-warm-gray-400 block text-[11px]">Match Filter</span>
                  <span className="text-emerald-700 font-medium">AI Active</span>
                </div>
              </div>

              {prog.evaluationCriteria?.length > 0 && (
                <div className="mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-warm-gray-400 block mb-1.5">
                    Evaluation Criteria
                  </span>
                  <ul className="text-xs text-warm-gray-700 space-y-0.5">
                    {prog.evaluationCriteria.map((c, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate">{c.label}</span>
                        <strong className="text-warm-gray-900 flex-shrink-0">{c.weight}%</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {documentUrl && (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber hover:underline mb-4"
                >
                  📄 View Document →
                </a>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingProgram(prog)}
                  className="flex-1 py-2 text-xs font-semibold rounded-[8px] bg-amber text-white hover:bg-amber-light transition-colors text-center cursor-pointer"
                >
                  {prog.status === 'Draft' ? 'Edit Draft' : 'Open'}
                </button>
                <button
                  onClick={() => handleDelete(prog)}
                  disabled={deletingId === prog._id}
                  className="px-3 py-2 text-xs font-semibold rounded-[8px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {deletingId === prog._id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {editingProgram !== null && (
        <GrantCallEditorModal
          program={Object.keys(editingProgram).length > 0 ? editingProgram : null}
          onClose={() => setEditingProgram(null)}
          onSaved={handleGrantSaved}
        />
      )}
    </div>
  )
}