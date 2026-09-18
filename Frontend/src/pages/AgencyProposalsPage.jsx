import { useState } from 'react'
import { useAgency } from '../components/AgencyContext'
import api from '../api'

const formatDate = (dateValue) => {
  if (!dateValue) return '—'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return dateValue
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_TONE = {
  Shortlisted: 'bg-blue-50 text-blue-700 border-blue-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  Awarded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Not Awarded': 'bg-warm-gray-100 text-warm-gray-600 border-warm-gray-200',
}

export default function AgencyProposalsPage() {
  const { proposalsList, loading, refreshProposals } = useAgency()
  const [decidingId, setDecidingId] = useState(null)
  const [error, setError] = useState('')

  const recordDecision = async (proposalId, status) => {
    setError('')
    if (status === 'awarded') {
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
      await api.put(`/agency/proposals/${proposalId}/decision`, { status })
      refreshProposals()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record decision.')
    } finally {
      setDecidingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
        <h2 className="font-heading text-2xl font-bold text-warm-gray-900">Submitted Research Proposals</h2>
        <p className="text-xs text-warm-gray-500 mt-1">Review applications ranked by GrantOS AI Mandate Matching.</p>
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
              No proposals have been submitted to your grant programs yet.
            </p>
          </div>
        )}

        {proposalsList.map((prop) => {
          const isBusy = decidingId === prop._id
          const hasDecision = ['Shortlisted', 'Rejected', 'Awarded', 'Not Awarded'].includes(prop.status)

          return (
            <div
              key={prop._id}
              className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft hover:border-amber/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-warm-gray-700 bg-warm-gray-100 px-2 py-0.5 rounded">
                    {prop._id.slice(-6).toUpperCase()}
                  </span>
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
                  <span>🏛️ <strong>{prop.organization?.organizationName || 'Unknown Institution'}</strong></span>
                  <span>📅 Submitted: {formatDate(prop.createdAt)}</span>
                </div>

                {prop.aiScore !== null && prop.aiScore !== undefined && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                    <span>🧠 AI Match Score: {prop.aiScore}%</span>
                  </div>
                )}

                {prop.decision?.status && prop.decision.status !== 'pending' && (
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

                {!hasDecision ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => recordDecision(prop._id, 'shortlisted')}
                      disabled={isBusy}
                      className="px-4 py-2 rounded-[8px] bg-amber text-white text-xs font-semibold hover:bg-amber-light transition-colors cursor-pointer disabled:opacity-60"
                    >
                      Shortlist
                    </button>
                    <button
                      onClick={() => recordDecision(prop._id, 'rejected')}
                      disabled={isBusy}
                      className="px-3 py-2 rounded-[8px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                ) : prop.status === 'Shortlisted' ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => recordDecision(prop._id, 'awarded')}
                      disabled={isBusy}
                      className="px-4 py-2 rounded-[8px] bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      Award
                    </button>
                    <button
                      onClick={() => recordDecision(prop._id, 'not_awarded')}
                      disabled={isBusy}
                      className="px-3 py-2 rounded-[8px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                    >
                      Not Awarded
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}