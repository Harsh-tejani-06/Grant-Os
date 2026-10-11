import { useMemo, useState } from 'react'
import { useAgency } from '../components/AgencyContext'
import AgencyProposalReview from '../components/AgencyProposalReview'
import AgencyDecisionModal, { ModalShell } from '../components/AgencyDecisionModal'
import { STATUS_TONE } from '../components/ProposalDocumentView'
import api from '../api'

// ─── Helpers ───
const formatDate = (dateValue) => {
  if (!dateValue) return '—'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return dateValue
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatINR = (n) => (n === null || n === undefined ? '—' : `₹${Number(n).toLocaleString('en-IN')}`)
const daysSince = (dateValue) => (dateValue ? Math.floor((Date.now() - new Date(dateValue).getTime()) / 86400000) : null)

// Status vocabulary matches the org-side Proposal Tracking Dashboard.
const AWAITING = ['Submitted to Agency', 'Submitted']
const AWARDED = ['Awarded', 'Accepted']
const REJECTED = ['Rejected', 'Not Awarded']
const REVIEW_SLA_DAYS = 7

const STAGE_FILTERS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'awaiting', label: 'Awaiting review', match: (s) => AWAITING.includes(s) },
  { key: 'evaluation', label: 'Under evaluation', match: (s) => s === 'Under Evaluation' },
  { key: 'revisions', label: 'Revisions', match: (s) => s === 'Revisions Requested' },
  { key: 'awarded', label: 'Awarded', match: (s) => AWARDED.includes(s) },
  { key: 'rejected', label: 'Rejected', match: (s) => REJECTED.includes(s) },
]

const btn = {
  primary: 'px-3 py-2 rounded-[8px] bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors cursor-pointer disabled:opacity-60',
  award: 'px-4 py-2 rounded-[8px] bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-60',
  warn: 'px-3 py-2 rounded-[8px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60',
  neutral: 'px-3 py-2 rounded-[8px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60',
}

const inputCls =
  'w-full p-2.5 rounded-[10px] border border-warm-gray-200 bg-cream/30 text-xs text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-amber/20'

export default function AgencyProposalsPage() {
  const { proposalsList, loading, refreshProposals, refreshStats } = useAgency()

  const [stage, setStage] = useState('all')
  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Review workspace: { proposal, programFunding, reviewer }
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Decision dialog: { type, proposal, programFunding, reviewer }
  const [action, setAction] = useState(null)

  const [viewOrg, setViewOrg] = useState(null)

  const flash = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3500)
  }

  // ─── Derived list ───
  const programOptions = useMemo(() => {
    const map = new Map()
    proposalsList.forEach((p) => {
      if (p.grantProgram?._id) map.set(p.grantProgram._id, p.grantProgram.title)
    })
    return [...map.entries()]
  }, [proposalsList])

  const counts = useMemo(
    () => Object.fromEntries(STAGE_FILTERS.map((f) => [f.key, proposalsList.filter((p) => f.match(p.status)).length])),
    [proposalsList]
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const stageDef = STAGE_FILTERS.find((f) => f.key === stage)
    const list = proposalsList.filter((p) => {
      if (!stageDef.match(p.status)) return false
      if (programFilter && p.grantProgram?._id !== programFilter) return false
      if (!q) return true
      return [p.title, p.organization?.organizationName, p.agencySubmission?.agencySubmissionId]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    })
    const submitted = (p) => new Date(p.agencySubmission?.submittedAt || p.submittedAt || p.createdAt).getTime()
    if (sortBy === 'oldest') list.sort((a, b) => submitted(a) - submitted(b))
    if (sortBy === 'score') list.sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1))
    return list
  }, [proposalsList, stage, search, programFilter, sortBy])

  // ─── API ───
  const fetchDetail = async (id) => {
    const res = await api.get(`/agency/proposals/${id}`)
    if (!res.data.success) throw new Error('Could not load proposal details.')
    return { proposal: res.data.proposal, programFunding: res.data.programFunding, reviewer: res.data.reviewer }
  }

  // silent = refresh in the background without showing the loading state
  const loadDetail = async (id, { silent = false } = {}) => {
    if (!silent) setDetailLoading(true)
    try {
      setDetail(await fetchDetail(id))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load proposal details.')
      if (!silent) setDetail(null)
    } finally {
      if (!silent) setDetailLoading(false)
    }
  }

  const openDetail = (prop) => {
    setError('')
    // Show what we already know straight away; the full document loads behind it.
    setDetail({ proposal: { ...prop, sections: [] }, programFunding: null, reviewer: null })
    loadDetail(prop._id)
  }

  const refreshAfterDecision = async (id) => {
    await Promise.all([refreshProposals(), refreshStats()])
    if (detail?.proposal?._id === id) await loadDetail(id, { silent: true })
  }

  // One-click moves that need no extra input (Begin / Resume evaluation)
  const quickDecision = async (proposalId, status) => {
    setError('')
    setBusyId(proposalId)
    try {
      await api.put(`/agency/proposals/${proposalId}/decision`, { status })
      await refreshAfterDecision(proposalId)
      flash(`Proposal moved to "${status}".`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record decision.')
    } finally {
      setBusyId(null)
    }
  }

  // Opens the revisions / reject / award dialog. It needs the full proposal
  // (sections, organization contact, reviewer contact), so load it if needed.
  const openAction = async (type, prop) => {
    setError('')
    if (detail?.proposal?._id === prop._id && (detail.proposal.sections || []).length > 0) {
      setAction({ type, proposal: detail.proposal, programFunding: detail.programFunding, reviewer: detail.reviewer })
      return
    }
    setBusyId(prop._id)
    try {
      const full = await fetchDetail(prop._id)
      setAction({ type, ...full })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load proposal details.')
    } finally {
      setBusyId(null)
    }
  }

  // Called by the dialog. Returns an error message, or null on success.
  const submitDecision = async (payload) => {
    const id = action.proposal._id
    try {
      await api.put(`/agency/proposals/${id}/decision`, payload)
    } catch (err) {
      return err.response?.data?.message || 'Failed to record decision.'
    }
    setAction(null)
    flash(`Proposal moved to "${payload.status}".`)
    await refreshAfterDecision(id)
    return null
  }

  // ─── Action buttons (shared by cards and review workspace) ───
  const renderActions = (prop) => {
    const isBusy = busyId === prop._id
    if (AWAITING.includes(prop.status)) {
      return (
        <>
          <button onClick={() => quickDecision(prop._id, 'Under Evaluation')} disabled={isBusy} className={btn.primary}>
            Begin Evaluation
          </button>
          <button onClick={() => openAction('reject', prop)} disabled={isBusy} className={btn.neutral}>
            Reject
          </button>
        </>
      )
    }
    if (prop.status === 'Under Evaluation') {
      return (
        <>
          <button onClick={() => openAction('revisions', prop)} disabled={isBusy} className={btn.warn}>
            Request Revisions
          </button>
          <button onClick={() => openAction('award', prop)} disabled={isBusy} className={btn.award}>
            Award
          </button>
          <button onClick={() => openAction('reject', prop)} disabled={isBusy} className={btn.neutral}>
            Reject
          </button>
        </>
      )
    }
    if (prop.status === 'Revisions Requested') {
      return (
        <>
          <button onClick={() => quickDecision(prop._id, 'Under Evaluation')} disabled={isBusy} className={btn.primary}>
            Resume Evaluation
          </button>
          <button onClick={() => openAction('reject', prop)} disabled={isBusy} className={btn.neutral}>
            Reject
          </button>
        </>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-warm-gray-900">Submitted Research Proposals</h2>
          <p className="text-xs text-warm-gray-500 mt-1">
            Only proposals the organization has officially submitted appear here. Every decision you record is shared with the
            organization instantly on their Proposal Tracking Dashboard.
          </p>
        </div>
        <button
          onClick={() => Promise.all([refreshProposals(), refreshStats()])}
          className="px-4 py-2 rounded-[10px] border border-warm-gray-200 text-xs font-semibold text-warm-gray-700 hover:bg-warm-gray-100 cursor-pointer self-start md:self-auto"
        >
          ↻ Refresh
        </button>
      </div>

      {error && <div className="p-3 rounded-[10px] bg-red-50 border border-red-200 text-xs text-red-700">⚠️ {error}</div>}

      {/* Toast stays visible above the full-screen workspace */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-[12px] bg-emerald-600 text-white text-sm font-semibold shadow-medium">
          ✓ {toast}
        </div>
      )}

      {/* ─── Stage chips + filters ─── */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {STAGE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStage(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                stage === f.key
                  ? 'bg-amber text-white border-amber shadow-soft'
                  : 'bg-surface-elevated text-warm-gray-600 border-warm-gray-200 hover:bg-warm-gray-100'
              }`}
            >
              {f.label} <span className={stage === f.key ? 'text-white/80' : 'text-warm-gray-400'}>({counts[f.key]})</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, institution or reference ID…"
            className={`${inputCls} sm:flex-1`}
          />
          <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className={`${inputCls} sm:w-56`}>
            <option value="">All programmes</option>
            {programOptions.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`${inputCls} sm:w-44`}>
            <option value="recent">Recent activity</option>
            <option value="oldest">Oldest submission</option>
            <option value="score">Highest AI score</option>
          </select>
        </div>
      </div>

      {/* ─── List ─── */}
      <div className="space-y-4">
        {loading && <p className="text-sm text-warm-gray-400 py-8 text-center">Loading proposals…</p>}

        {!loading && proposalsList.length === 0 && (
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-10 text-center">
            <p className="text-sm text-warm-gray-500">No proposals have been officially submitted to your grant programs yet.</p>
          </div>
        )}

        {!loading && proposalsList.length > 0 && visible.length === 0 && (
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-8 text-center">
            <p className="text-sm text-warm-gray-500">No proposals match these filters.</p>
          </div>
        )}

        {visible.map((prop) => {
          const refId = prop.agencySubmission?.agencySubmissionId
          const submittedAt = prop.agencySubmission?.submittedAt || prop.submittedAt || prop.createdAt
          const waiting = AWAITING.includes(prop.status) ? daysSince(submittedAt) : null
          const isResubmission =
            AWAITING.includes(prop.status) && (prop.trackingTimeline || []).some((t) => t.stage === 'Revisions Requested')

          return (
            <div
              key={prop._id}
              className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft hover:border-amber/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {refId && (
                    <span className="text-xs font-mono font-bold text-warm-gray-700 bg-warm-gray-100 px-2 py-0.5 rounded" title="Official agency reference ID">
                      Ref: {refId}
                    </span>
                  )}
                  <span className="text-xs text-amber font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber/15">
                    {prop.grantProgram?.title || prop.grantTitle || 'Unlinked Program'}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${STATUS_TONE[prop.status] || 'bg-warm-gray-100 text-warm-gray-600 border-warm-gray-200'}`}>
                    {prop.status}
                  </span>
                  {isResubmission && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                      Resubmitted
                    </span>
                  )}
                  {waiting !== null && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                        waiting > REVIEW_SLA_DAYS ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-warm-gray-100 text-warm-gray-600 border-warm-gray-200'
                      }`}
                    >
                      ⏰ {waiting}d waiting
                    </span>
                  )}
                </div>

                <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-1.5">{prop.title}</h3>

                <div className="text-xs text-warm-gray-600 flex flex-wrap items-center gap-y-1 gap-x-4 mb-3">
                  <button
                    onClick={() => setViewOrg(prop.organization)}
                    className="flex items-center gap-1 hover:text-amber font-semibold transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
                  >
                    🏛️ {prop.organization?.organizationName || 'Unknown Institution'}
                  </button>
                  <span>📅 Submitted: {formatDate(submittedAt)}</span>
                </div>

                {prop.aiScore !== null && prop.aiScore !== undefined && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mr-2">
                    <span>🧠 AI Match Score: {prop.aiScore}%</span>
                  </div>
                )}

                {prop.status === 'Revisions Requested' && (
                  <div className="mt-2 p-3 rounded-[10px] bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <strong>Revisions requested:</strong> {prop.decision?.notes || '—'}
                    <span className="block mt-1 text-amber-700">Waiting for the organization to resubmit.</span>
                  </div>
                )}

                {[...AWARDED, ...REJECTED].includes(prop.status) && prop.decision?.decidedAt && (
                  <p className="text-xs text-warm-gray-400 mt-2">
                    Decision recorded {formatDate(prop.decision.decidedAt)}
                    {prop.awardAmount ? ` — Award: ${formatINR(prop.awardAmount)}` : ''}
                    {REJECTED.includes(prop.status) && prop.decision?.notes ? ` — Reason: ${prop.decision.notes}` : ''}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 flex-shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-warm-gray-100">
                <div className="text-left lg:text-right">
                  <span className="text-xs text-warm-gray-400 block">Requested Amount</span>
                  <span className="text-base font-bold text-warm-gray-900">{prop.fundingAmount || '—'}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <button onClick={() => openDetail(prop)} className={btn.neutral}>
                    Open proposal
                  </button>
                  {renderActions(prop)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── Full-screen review workspace ─── */}
      {detail && (
        <AgencyProposalReview
          data={detail}
          loading={detailLoading}
          actions={renderActions(detail.proposal)}
          onClose={() => setDetail(null)}
          onViewOrg={setViewOrg}
        />
      )}

      {/* ─── Decision dialog (revisions / reject / award) ─── */}
      {action && (
        <AgencyDecisionModal
          type={action.type}
          proposal={action.proposal}
          programFunding={action.programFunding}
          reviewer={action.reviewer}
          onClose={() => setAction(null)}
          onSubmit={submitDecision}
        />
      )}

      {/* ─── Organization details modal ─── */}
      {viewOrg && (
        <ModalShell onClose={() => setViewOrg(null)} size="md">
          <div className="p-6 sm:p-7 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold text-warm-gray-900">Organization Details</h2>
              <button onClick={() => setViewOrg(null)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer" aria-label="Close">
                ✕
              </button>
            </div>
            <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-3">{viewOrg.organizationName}</h3>
            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div>
                <span className="block text-slate-500 uppercase tracking-wider font-bold text-xs mb-0.5">Type</span>
                <span className="text-warm-gray-800 font-semibold capitalize">{(viewOrg.organizationType || '').replace(/_/g, ' ') || '—'}</span>
              </div>
              <div>
                <span className="block text-slate-500 uppercase tracking-wider font-bold text-xs mb-0.5">Registration No.</span>
                <span className="text-warm-gray-800 font-semibold">{viewOrg.registrationNumber || '—'}</span>
              </div>
              {viewOrg.establishedYear && (
                <div>
                  <span className="block text-slate-500 uppercase tracking-wider font-bold text-xs mb-0.5">Established</span>
                  <span className="text-warm-gray-800 font-semibold">{viewOrg.establishedYear}</span>
                </div>
              )}
              {viewOrg.website && (
                <div>
                  <span className="block text-slate-500 uppercase tracking-wider font-bold text-xs mb-0.5">Website</span>
                  {/^https?:\/\//i.test(viewOrg.website) ? (
                    <a href={viewOrg.website} target="_blank" rel="noopener noreferrer" className="text-amber font-semibold hover:underline break-all">
                      {viewOrg.website}
                    </a>
                  ) : (
                    <span className="text-warm-gray-800 font-semibold break-all">{viewOrg.website}</span>
                  )}
                </div>
              )}
            </div>
            {viewOrg.address && (
              <div className="mb-4">
                <span className="block text-xs font-bold uppercase tracking-wider text-warm-gray-400 mb-1">Address</span>
                <p className="text-sm text-warm-gray-700">
                  {[viewOrg.address.street, viewOrg.address.city, viewOrg.address.state, viewOrg.address.pincode, viewOrg.address.country].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
            )}
            {viewOrg.contactPerson && (
              <div className="mb-4">
                <span className="block text-xs font-bold uppercase tracking-wider text-warm-gray-400 mb-1">Contact Person</span>
                <p className="text-sm text-warm-gray-700">
                  {[viewOrg.contactPerson.name, viewOrg.contactPerson.designation, viewOrg.contactPerson.email, viewOrg.contactPerson.phone].filter(Boolean).join(' • ') || '—'}
                </p>
              </div>
            )}
            <div className="flex justify-end mt-6 pt-4 border-t border-warm-gray-200/60">
              <button onClick={() => setViewOrg(null)} className="px-5 py-2.5 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}