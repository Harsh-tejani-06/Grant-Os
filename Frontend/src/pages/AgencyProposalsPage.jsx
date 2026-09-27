import { useState } from 'react'
import { useAgency } from '../components/AgencyContext'
import api from '../api'

const formatDate = (dateValue) => {
  if (!dateValue) return '—'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return dateValue
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Status vocabulary is a strict subset of the org-side Proposal Tracking
// Dashboard's TRACKING_STAGES aliases — every status written here is
// recognized by the org's Kanban/table view.
const STATUS_TONE = {
  'Submitted to Agency': 'bg-blue-50 text-blue-700 border-blue-200',
  Submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  'Under Evaluation': 'bg-purple-50 text-purple-700 border-purple-200',
  'Revisions Requested': 'bg-amber-50 text-amber-800 border-amber-200',
  Awarded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
}

const REVIEWABLE_STATUSES = ['Submitted to Agency', 'Submitted', 'Under Evaluation', 'Revisions Requested']

export default function AgencyProposalsPage() {
  const { proposalsList, loading, refreshProposals } = useAgency()
  const [decidingId, setDecidingId] = useState(null)
  const [error, setError] = useState('')
  const [revisionModal, setRevisionModal] = useState(null) // proposal
  const [revisionNotes, setRevisionNotes] = useState('')
  const [viewOrgModal, setViewOrgModal] = useState(null) // proposal.organization

  const recordDecision = async (proposalId, status, extra = {}) => {
    setError('')
    if (status === 'Awarded') {
      const amount = window.prompt('Award amount (₹)?')
      if (!amount || Number(amount) <= 0) return
      setDecidingId(proposalId)
      try {
        await api.put(`/agency/proposals/${proposalId}/decision`, { status, awardAmount: Number(amount) })
        refreshProposals()
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to record decision.')
      } finally {
        setDecidingId(null)
      }
      return
    }

    setDecidingId(proposalId)
    try {
      await api.put(`/agency/proposals/${proposalId}/decision`, { status, ...extra })
      refreshProposals()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record decision.')
    } finally {
      setDecidingId(null)
    }
  }

  const openRevisionModal = (prop) => {
    setRevisionNotes('')
    setRevisionModal(prop)
  }

  const submitRevisionRequest = async (e) => {
    e.preventDefault()
    if (!revisionModal || !revisionNotes.trim()) return
    await recordDecision(revisionModal._id, 'Revisions Requested', { notes: revisionNotes.trim() })
    setRevisionModal(null)
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
        <h2 className="font-heading text-2xl font-bold text-warm-gray-900">Submitted Research Proposals</h2>
        <p className="text-xs text-warm-gray-500 mt-1">
          Only proposals the organization has officially submitted appear here. Every decision you record
          is also reflected on the organization's own Proposal Tracking Dashboard.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-[10px] bg-red-50 border border-red-200 text-xs text-red-700">
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-4">
        {loading && <p className="text-sm text-warm-gray-400 py-8 text-center">Loading proposals…</p>}

        {!loading && proposalsList.length === 0 && (
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-10 text-center">
            <p className="text-sm text-warm-gray-500">
              No proposals have been officially submitted to your grant programs yet.
            </p>
          </div>
        )}

        {proposalsList.map((prop) => {
          const isBusy = decidingId === prop._id
          const isReviewable = REVIEWABLE_STATUSES.includes(prop.status)
          const refId = prop.agencySubmission?.agencySubmissionId

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
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                      STATUS_TONE[prop.status] || 'bg-warm-gray-100 text-warm-gray-600 border-warm-gray-200'
                    }`}
                  >
                    {prop.status}
                  </span>
                </div>

                <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-1.5">{prop.title}</h3>

                <div className="text-xs text-warm-gray-600 flex flex-wrap items-center gap-y-1 gap-x-4 mb-3">
                  <button
                    onClick={() => setViewOrgModal(prop.organization)}
                    className="flex items-center gap-1 hover:text-amber font-semibold transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
                  >
                    🏛️ {prop.organization?.organizationName || 'Unknown Institution'}
                  </button>
                  <span>📅 Submitted: {formatDate(prop.agencySubmission?.submittedAt || prop.submittedAt || prop.createdAt)}</span>
                </div>

                {prop.aiScore !== null && prop.aiScore !== undefined && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mr-2">
                    <span>🧠 AI Match Score: {prop.aiScore}%</span>
                  </div>
                )}

                {prop.status === 'Revisions Requested' && prop.decision?.notes && (
                  <div className="mt-2 p-3 rounded-[10px] bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <strong>Revisions requested:</strong> {prop.decision.notes}
                  </div>
                )}

                {['Awarded', 'Rejected'].includes(prop.status) && prop.decision?.decidedAt && (
                  <p className="text-[11px] text-warm-gray-400 mt-2">
                    Decision recorded {formatDate(prop.decision.decidedAt)}
                    {prop.awardAmount ? ` — Award: ₹${prop.awardAmount.toLocaleString('en-IN')}` : ''}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 flex-shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-warm-gray-100">
                <div className="text-left lg:text-right">
                  <span className="text-[11px] text-warm-gray-400 block">Requested Amount</span>
                  <span className="text-base font-bold text-warm-gray-900">{prop.fundingAmount || '—'}</span>
                </div>

                {isReviewable && (
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    {['Submitted to Agency', 'Submitted'].includes(prop.status) && (
                      <button
                        onClick={() => recordDecision(prop._id, 'Under Evaluation')}
                        disabled={isBusy}
                        className="px-3 py-2 rounded-[8px] bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        Begin Evaluation
                      </button>
                    )}
                    {prop.status === 'Under Evaluation' && (
                      <>
                        <button
                          onClick={() => openRevisionModal(prop)}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-[8px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                        >
                          Request Revisions
                        </button>
                        <button
                          onClick={() => recordDecision(prop._id, 'Awarded')}
                          disabled={isBusy}
                          className="px-4 py-2 rounded-[8px] bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          Award
                        </button>
                        <button
                          onClick={() => recordDecision(prop._id, 'Rejected')}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-[8px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {prop.status === 'Revisions Requested' && (
                      <>
                        <button
                          onClick={() => recordDecision(prop._id, 'Under Evaluation')}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-[8px] bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          Mark Resubmitted → Evaluation
                        </button>
                        <button
                          onClick={() => recordDecision(prop._id, 'Rejected')}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-[8px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── Request Revisions Modal ─── */}
      {revisionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setRevisionModal(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-md p-6 sm:p-7 animate-fade-up">
            <h2 className="font-heading text-lg font-bold text-warm-gray-900 mb-1">Request Revisions</h2>
            <p className="text-xs text-warm-gray-500 mb-4">
              Proposal: <strong className="text-warm-gray-800">{revisionModal.title}</strong>
            </p>
            <form onSubmit={submitRevisionRequest} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1">
                  Query / Revision Details *
                </label>
                <textarea
                  required
                  rows={4}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="e.g. Please clarify the budget breakdown for equipment procurement and provide updated timeline."
                  className="w-full p-3 rounded-[10px] border border-warm-gray-200 bg-cream/30 text-xs text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-amber/20 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRevisionModal(null)}
                  className="px-4 py-2 rounded-[8px] text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[8px] text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-soft cursor-pointer"
                >
                  Send Revision Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── View Organization Details Modal ─── */}
      {viewOrgModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setViewOrgModal(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-lg p-6 sm:p-8 animate-fade-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold text-warm-gray-900">Organization Details</h2>
              <button onClick={() => setViewOrgModal(null)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer">✕</button>
            </div>
            <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-3">{viewOrgModal.organizationName}</h3>
            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div>
                <span className="block text-warm-gray-400 uppercase tracking-wider font-bold text-[10px] mb-0.5">Type</span>
                <span className="text-warm-gray-800 font-semibold capitalize">{(viewOrgModal.organizationType || '').replace(/_/g, ' ') || '—'}</span>
              </div>
              <div>
                <span className="block text-warm-gray-400 uppercase tracking-wider font-bold text-[10px] mb-0.5">Registration No.</span>
                <span className="text-warm-gray-800 font-semibold">{viewOrgModal.registrationNumber || '—'}</span>
              </div>
              {viewOrgModal.establishedYear && (
                <div>
                  <span className="block text-warm-gray-400 uppercase tracking-wider font-bold text-[10px] mb-0.5">Established</span>
                  <span className="text-warm-gray-800 font-semibold">{viewOrgModal.establishedYear}</span>
                </div>
              )}
              {viewOrgModal.website && (
                <div>
                  <span className="block text-warm-gray-400 uppercase tracking-wider font-bold text-[10px] mb-0.5">Website</span>
                  <a href={viewOrgModal.website} target="_blank" rel="noopener noreferrer" className="text-amber font-semibold hover:underline">{viewOrgModal.website}</a>
                </div>
              )}
            </div>
            {viewOrgModal.address && (
              <div className="mb-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-400 mb-1">Address</span>
                <p className="text-sm text-warm-gray-700">
                  {[viewOrgModal.address.street, viewOrgModal.address.city, viewOrgModal.address.state, viewOrgModal.address.pincode, viewOrgModal.address.country].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
            )}
            {viewOrgModal.contactPerson && (
              <div className="mb-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-400 mb-1">Contact Person</span>
                <p className="text-sm text-warm-gray-700">
                  {[viewOrgModal.contactPerson.name, viewOrgModal.contactPerson.designation, viewOrgModal.contactPerson.email, viewOrgModal.contactPerson.phone].filter(Boolean).join(' • ') || '—'}
                </p>
              </div>
            )}
            <div className="flex justify-end mt-6 pt-4 border-t border-warm-gray-200/60">
              <button onClick={() => setViewOrgModal(null)} className="px-5 py-2.5 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}