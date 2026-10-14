import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAgency } from '../components/AgencyContext'
import GrantCallEditorModal, { summarizeGeography, getPublishReadiness } from '../components/GrantCallEditorModal'
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

const SCOPE_ICON = { Local: '📍', State: '🏛️', National: '🇮🇳', International: '🌍' }

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'Active', label: 'Active' },
  { id: 'Draft', label: 'Drafts' },
  { id: 'Upcoming', label: 'Upcoming' },
  { id: 'ended', label: 'Closed & other' },
]

const SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'deadline', label: 'Deadline — soonest' },
  { id: 'proposals', label: 'Most proposals' },
]

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

// Whole days from now until the deadline (negative = already passed).
const daysUntil = (deadline, now) => {
  if (!deadline) return null
  const t = new Date(deadline).getTime()
  if (Number.isNaN(t)) return null
  return Math.ceil((t - now) / 86400000)
}

function DeadlinePill({ status, days }) {
  if (days === null) return <span className="text-xs text-warm-gray-400">No deadline</span>
  const live = ['Active', 'Upcoming'].includes(status)
  if (!live) return null
  if (days < 0) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Deadline passed</span>
  if (days === 0) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Closes today</span>
  if (days <= 14) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber border border-amber/20">{days} day{days === 1 ? '' : 's'} left</span>
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{days} days left</span>
}

export default function AgencyGrantCallsPage() {
  const { programsList, loading, refreshPrograms, refreshStats } = useAgency()
  const [editingProgram, setEditingProgram] = useState(null) // null = closed, {} = new, {...} = editing existing
  const [notificationMsg, setNotificationMsg] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null) // program being deleted
  const [deleteStep, setDeleteStep] = useState(1)
  const [deletingId, setDeletingId] = useState(null)

  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [query, setQuery] = useState('')
  const [now] = useState(() => Date.now())

  const counts = useMemo(() => {
    const c = { all: programsList.length, Active: 0, Draft: 0, Upcoming: 0, ended: 0 }
    programsList.forEach((p) => {
      if (p.status === 'Active') c.Active += 1
      else if (p.status === 'Draft') c.Draft += 1
      else if (p.status === 'Upcoming') c.Upcoming += 1
      else c.ended += 1
    })
    return c
  }, [programsList])

  const totalProposals = programsList.reduce((sum, p) => sum + (p.applicationsCount || 0), 0)
  const totalFundPool = programsList
    .filter((p) => p.status === 'Active')
    .reduce((sum, p) => sum + (p.budgetAmount || 0), 0)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = programsList.filter((p) => {
      if (filter === 'ended' ? ['Active', 'Draft', 'Upcoming'].includes(p.status) : filter !== 'all' && p.status !== filter) return false
      if (!q) return true
      return [p.title, p.shortTitle, p.displayId, p.category, p.fundingType].some((v) => String(v || '').toLowerCase().includes(q))
    })
    const sorted = [...list]
    if (sort === 'deadline') {
      sorted.sort((a, b) => {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity
        return da - db
      })
    } else if (sort === 'proposals') {
      sorted.sort((a, b) => (b.applicationsCount || 0) - (a.applicationsCount || 0))
    }
    return sorted
  }, [programsList, filter, sort, query])

  const notify = (msg, ms = 3500) => {
    setNotificationMsg(msg)
    setTimeout(() => setNotificationMsg(''), ms)
  }

  const handleGrantSaved = (savedProgram, { published, silent } = {}) => {
    refreshPrograms()
    refreshStats()
    if (published) notify('Grant call published successfully!', 4000)
    else if (!silent) notify('Grant call saved.', 3000)
  }

  const openDelete = (prog) => {
    setDeleteTarget(prog)
    setDeleteStep(1)
  }
  const closeDelete = () => {
    setDeleteTarget(null)
    setDeleteStep(1)
  }

  // Two required confirmations, in order, before the delete API is ever called.
  const confirmDelete = async () => {
    if (!deleteTarget) return
    if (deleteStep === 1) {
      setDeleteStep(2)
      return
    }
    const prog = deleteTarget
    setDeletingId(prog._id)
    closeDelete()
    try {
      const res = await api.delete(`/agency/programs/${prog._id}`)
      refreshPrograms()
      refreshStats()
      notify(
        res.data.softDeleted
          ? 'Grant call archived — existing proposals were preserved.'
          : 'Grant call permanently deleted.',
        4000
      )
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to delete grant call.')
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

      {/* ─── Header + summary ─── */}
      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-warm-gray-900">Grant Calls</h2>
            <p className="text-xs text-warm-gray-500 mt-1">
              Create, publish and manage your funding opportunities.
            </p>
          </div>
          <button
            onClick={() => setEditingProgram({})}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-sm font-semibold transition-all shadow-soft cursor-pointer"
          >
            <PlusIcon /> New Grant Call
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <SummaryTile label="Active calls" value={counts.Active} tone="emerald" />
          <SummaryTile label="Drafts in progress" value={counts.Draft} />
          <SummaryTile label="Proposals received" value={totalProposals} />
          <SummaryTile label="Live fund pool" value={totalFundPool > 0 ? formatCompactINR(totalFundPool) : '—'} />
        </div>
      </div>

      {/* ─── Toolbar ─── */}
      {programsList.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-gray-400"><SearchIcon /></span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, code, category…"
              className="w-full pl-10 pr-4 py-2.5 rounded-[10px] bg-surface-elevated border border-warm-gray-200/70 text-sm text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 px-3.5 py-2 rounded-[10px] text-xs font-semibold transition-colors cursor-pointer ${
                  filter === f.id ? 'bg-amber text-white shadow-soft' : 'bg-surface-elevated text-warm-gray-600 border border-warm-gray-200/70 hover:bg-warm-gray-100'
                }`}
              >
                {f.label} <span className={filter === f.id ? 'opacity-80' : 'text-warm-gray-400'}>{counts[f.id]}</span>
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2.5 rounded-[10px] bg-surface-elevated border border-warm-gray-200/70 text-xs font-semibold text-warm-gray-700 focus:outline-none focus:ring-2 focus:ring-amber/30 cursor-pointer"
          >
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      )}

      {loading && <p className="text-sm text-warm-gray-400 py-8 text-center">Loading grant calls…</p>}

      {!loading && programsList.length === 0 && (
        <div className="bg-surface-elevated rounded-[16px] border border-dashed border-warm-gray-300 p-12 text-center">
          <div className="text-4xl mb-3">📣</div>
          <h3 className="font-heading text-lg font-bold text-warm-gray-900">No grant calls yet</h3>
          <p className="text-sm text-warm-gray-500 mt-1 mb-5 max-w-sm mx-auto">
            Publish your first call to start receiving proposals from verified organizations.
          </p>
          <button
            onClick={() => setEditingProgram({})}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-sm font-semibold transition-all shadow-soft cursor-pointer"
          >
            <PlusIcon /> Create Your First Grant Call
          </button>
        </div>
      )}

      {!loading && programsList.length > 0 && visible.length === 0 && (
        <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-10 text-center">
          <p className="text-sm text-warm-gray-500">No grant calls match your filters.</p>
          <button
            onClick={() => { setFilter('all'); setQuery('') }}
            className="mt-3 text-xs font-semibold text-amber hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ─── Cards ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {visible.map((prog) => {
          const documentUrl = prog.document?.fileUrl
            ? `${api.defaults.baseURL?.replace(/\/api\/?$/, '') || ''}${prog.document.fileUrl}`
            : null
          const geo = summarizeGeography(prog.eligibility)
          const days = daysUntil(prog.deadline, now)
          const isDraft = ['Draft', 'Upcoming'].includes(prog.status)
          const readiness = isDraft ? getPublishReadiness(prog) : null
          const readyCount = readiness ? readiness.filter((r) => r.ok).length : 0
          const missing = readiness ? readiness.filter((r) => !r.ok) : []
          const criteria = prog.evaluationCriteria || []
          const areaTypes = prog.eligibility?.areaTypes || []

          return (
            <div
              key={prog._id}
              className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 shadow-soft hover:shadow-medium transition-all flex flex-col overflow-hidden"
            >
              <div className="p-6 pb-4 flex-1">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-mono font-bold text-amber bg-amber-50 px-2.5 py-1 rounded-full border border-amber/15">
                    {prog.displayId}
                  </span>
                  <div className="flex items-center gap-2">
                    <DeadlinePill status={prog.status} days={days} />
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${STATUS_TONE[prog.status] || STATUS_TONE.Draft}`}>
                      {prog.status}
                    </span>
                  </div>
                </div>

                <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-1 leading-snug">{prog.title}</h3>
                {prog.shortTitle && <p className="text-xs text-warm-gray-400 mb-1 font-mono">{prog.shortTitle}</p>}
                <p className="text-xs text-warm-gray-500 mb-4">{prog.category || 'No category yet'} • {prog.fundingType}</p>

                {/* Geography */}
                <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-emerald-50/50 border border-emerald-200/70 mb-3">
                  <span className="text-lg leading-none mt-0.5">{SCOPE_ICON[geo.scope] || '🌐'}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{geo.label} scope</p>
                    <p className="text-xs text-warm-gray-700 mt-0.5 leading-relaxed">{geo.detail}</p>
                    {areaTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {areaTypes.map((a) => (
                          <span key={a} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-warm-gray-600 border border-warm-gray-200">
                            {a.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-[12px] bg-cream border border-warm-gray-200 mb-3 text-xs">
                  <div>
                    <span className="text-warm-gray-400 block text-xs">Funding</span>
                    <strong className="text-warm-gray-900 font-semibold text-sm">{prog.budget || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-warm-gray-400 block text-xs">Submissions</span>
                    <strong className="text-warm-gray-900 font-semibold text-sm">{prog.applicationsCount || 0} Proposals</strong>
                  </div>
                  <div>
                    <span className="text-warm-gray-400 block text-xs">Submission Deadline</span>
                    <span className="text-warm-gray-700 font-medium">{formatDate(prog.deadline)}</span>
                  </div>
                  <div>
                    <span className="text-warm-gray-400 block text-xs">Duration</span>
                    <span className="text-warm-gray-700 font-medium">
                      {prog.projectDurationMonths?.min || prog.projectDurationMonths?.max
                        ? `${prog.projectDurationMonths.min ?? '?'}–${prog.projectDurationMonths.max ?? '?'} months`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Evaluation criteria — stacked bar + legend */}
                {criteria.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-400 block mb-1.5">Evaluation criteria</span>
                    <div className="flex h-2 rounded-full overflow-hidden bg-warm-gray-100 mb-2">
                      {criteria.map((c, i) => (
                        <div
                          key={i}
                          title={`${c.label} — ${c.weight}%`}
                          style={{ width: `${Math.min(Number(c.weight) || 0, 100)}%`, opacity: 1 - (i % 5) * 0.16 }}
                          className="bg-amber"
                        />
                      ))}
                    </div>
                    <ul className="text-xs text-warm-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                      {criteria.map((c, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate">{c.label}</span>
                          <strong className="text-warm-gray-900 flex-shrink-0">{c.weight}%</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Draft readiness */}
                {readiness && (
                  <div className="p-3 rounded-[12px] bg-amber-50/60 border border-amber/15">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber">Ready to publish</span>
                      <span className="text-xs font-bold text-amber">{readyCount}/{readiness.length}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white overflow-hidden">
                      <div className="h-full bg-amber transition-all" style={{ width: `${(readyCount / readiness.length) * 100}%` }} />
                    </div>
                    {missing.length > 0 ? (
                      <p className="text-xs text-warm-gray-600 mt-2 leading-relaxed">
                        Still needed: {missing.map((m) => m.label.toLowerCase()).join(' · ')}
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-700 font-semibold mt-2">Everything is in place — open it and publish.</p>
                    )}
                  </div>
                )}

                {documentUrl && (
                  <a
                    href={documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber hover:underline mt-3"
                  >
                    📄 View Document →
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2 px-6 py-4 border-t border-warm-gray-100 bg-cream/40">
                <button
                  onClick={() => setEditingProgram(prog)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-[8px] bg-amber text-white hover:bg-amber-light transition-colors text-center cursor-pointer"
                >
                  {isDraft ? (prog.status === 'Draft' ? 'Edit Draft' : 'Edit') : 'Open'}
                </button>
                {(prog.applicationsCount || 0) > 0 && (
                  <Link
                    to="/agency/dashboard/proposals"
                    className="px-3 py-2.5 text-xs font-semibold rounded-[8px] bg-surface-elevated hover:bg-warm-gray-100 border border-warm-gray-200 text-warm-gray-700 transition-colors"
                  >
                    Proposals ({prog.applicationsCount})
                  </Link>
                )}
                <button
                  onClick={() => openDelete(prog)}
                  disabled={deletingId === prog._id}
                  className="px-3 py-2.5 text-xs font-semibold rounded-[8px] bg-surface-elevated hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-warm-gray-200 text-warm-gray-600 transition-colors cursor-pointer disabled:opacity-60"
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

      {/* ─── Two-step delete confirmation ─── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-warm-gray-900/50 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && closeDelete()}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-surface-elevated rounded-[18px] border border-warm-gray-200/70 shadow-medium p-6 animate-fade-in">
            <div className="flex items-center gap-1.5 mb-4">
              <span className={`h-1.5 flex-1 rounded-full ${deleteStep >= 1 ? 'bg-red-500' : 'bg-warm-gray-200'}`} />
              <span className={`h-1.5 flex-1 rounded-full ${deleteStep >= 2 ? 'bg-red-500' : 'bg-warm-gray-200'}`} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1">Confirmation {deleteStep} of 2</p>
            <h3 className="font-heading text-lg font-bold text-warm-gray-900">
              {deleteStep === 1 ? 'Delete this grant call?' : 'This cannot be undone'}
            </h3>
            <p className="text-sm font-semibold text-warm-gray-700 mt-1 truncate">{deleteTarget.title}</p>
            <p className="text-sm text-warm-gray-500 mt-2 leading-relaxed">
              {deleteStep === 1
                ? 'Are you sure you want to delete this grant?'
                : 'This action will permanently delete the grant and its associated grant data. If proposals already exist, the call is archived instead so their history is preserved.'}
            </p>
            <div className="flex gap-2.5 mt-6">
              <button onClick={closeDelete} className="flex-1 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-warm-gray-700 bg-warm-gray-100 hover:bg-warm-gray-200 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer">
                {deleteStep === 1 ? 'Yes, continue' : 'Permanently delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryTile({ label, value, tone }) {
  return (
    <div className="p-4 rounded-[12px] bg-cream border border-warm-gray-200/80">
      <span className="block text-xs font-bold uppercase tracking-wider text-warm-gray-400">{label}</span>
      <span className={`block font-heading text-2xl font-bold mt-1 ${tone === 'emerald' ? 'text-emerald-700' : 'text-warm-gray-900'}`}>{value}</span>
    </div>
  )
}

const formatCompactINR = (n) => {
  if (n >= 1e7) return `₹${String(parseFloat((n / 1e7).toFixed(2)))} Cr`
  if (n >= 1e5) return `₹${String(parseFloat((n / 1e5).toFixed(2)))} Lakh`
  return `₹${n.toLocaleString('en-IN')}`
}