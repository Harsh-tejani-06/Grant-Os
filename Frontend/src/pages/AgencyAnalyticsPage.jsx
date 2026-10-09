import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '₹0'
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(2)} Lakh`
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

export default function AgencyAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterProgram, setFilterProgram] = useState('all')

  const fetchAnalytics = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/agency/analytics')
      if (res.data.success && res.data.analytics) {
        setAnalytics(res.data.analytics)
      } else {
        setError('Failed to load analytics metrics.')
      }
    } catch (err) {
      console.error('Fetch agency analytics error:', err)
      setError(err.response?.data?.message || 'Server error while loading analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-3 border-amber border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-warm-gray-500">Compiling real-time grant portfolio analytics…</p>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="bg-surface-elevated rounded-[16px] border border-red-200 p-8 text-center shadow-soft">
        <span className="text-3xl block mb-2">⚠️</span>
        <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-1">Analytics Unavailable</h3>
        <p className="text-xs text-red-600 mb-4">{error || 'Could not load agency analytics data.'}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 rounded-[8px] bg-amber text-white text-xs font-semibold shadow-soft hover:bg-amber-light cursor-pointer"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Filter program performance
  const filteredPrograms = filterProgram === 'all'
    ? analytics.programPerformance
    : analytics.programPerformance.filter((p) => p.id === filterProgram)

  // Max value in submission trends for bar scaling
  const maxTrendCount = analytics.submissionTrends?.length > 0
    ? Math.max(...analytics.submissionTrends.map((t) => t.count), 1)
    : 1

  return (
    <div className="space-y-8 font-body">
      {/* ─── Hero Header ─── */}
      <div className="bg-surface-elevated rounded-[20px] border border-warm-gray-200/70 p-6 sm:p-8 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber/15 text-amber text-xs font-semibold uppercase tracking-wider mb-3">
            <span>📈</span> Funding Agency Portfolio Intelligence
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-warm-gray-900 leading-tight">
            Grant Analytics & Performance
          </h1>
          <p className="text-xs sm:text-sm text-warm-gray-600 mt-2 leading-relaxed">
            Real-time pipeline metrics, scientific proposal lifecycle distributions, sanction conversion rates, and grant call outcome intelligence directly from your database records.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-cream hover:bg-cream-dark text-warm-gray-800 text-xs font-semibold border border-warm-gray-200 transition-all cursor-pointer shadow-2xs"
          >
            <span>🔄</span> Refresh Data
          </button>
          <Link
            to="/agency/dashboard/proposals"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-amber hover:bg-amber-light text-white text-xs font-bold transition-all cursor-pointer shadow-soft"
          >
            Review Proposals →
          </Link>
        </div>
      </div>

      {/* ─── KPI Stats Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          icon="📢"
          label="Total Grant Calls"
          value={analytics.totalPrograms}
          note={`${analytics.activePrograms} actively accepting submissions`}
          noteColor="text-emerald-700"
          bgColor="bg-blue-50/70 text-blue-700"
        />

        <StatCard
          icon="📄"
          label="Proposals Received"
          value={analytics.totalProposals}
          note={`${analytics.pendingCount} pending initial screening`}
          noteColor="text-blue-700"
          bgColor="bg-purple-50/70 text-purple-700"
        />

        <StatCard
          icon="🔍"
          label="Under Evaluation"
          value={analytics.underEvaluationCount}
          note={`${analytics.revisionsCount} awaiting revision queries`}
          noteColor="text-amber-800"
          bgColor="bg-amber-50/70 text-amber-800"
        />

        <StatCard
          icon="🏆"
          label="Grants Sanctioned"
          value={analytics.awardedCount}
          note={analytics.totalAwardedCapital > 0 ? formatCurrency(analytics.totalAwardedCapital) : '₹0 sanctioned'}
          noteColor="text-emerald-700"
          bgColor="bg-emerald-50/70 text-emerald-800"
        />
      </div>

      {/* ─── Secondary Highlights Row ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-5 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider block">Award Conversion Rate</span>
            <p className="font-heading text-2xl font-bold text-warm-gray-900 mt-1">
              {analytics.decidedCount > 0 ? `${analytics.awardRate}%` : '—'}
            </p>
            <span className="text-[11px] text-warm-gray-500 mt-0.5 block">
              {analytics.decidedCount > 0
                ? `${analytics.awardedCount} awarded out of ${analytics.decidedCount} decided proposals`
                : 'No proposals decided yet'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xl text-emerald-700">
            🎯
          </div>
        </div>

        <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-5 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider block">Total Allocated Pool</span>
            <p className="font-heading text-2xl font-bold text-warm-gray-900 mt-1">
              {formatCurrency(analytics.totalFundPool)}
            </p>
            <span className="text-[11px] text-warm-gray-500 mt-0.5 block">
              Committed across {analytics.totalPrograms} grant programs
            </span>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xl text-blue-700">
            💰
          </div>
        </div>

        <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-5 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider block">Rejected / Closed</span>
            <p className="font-heading text-2xl font-bold text-warm-gray-900 mt-1">
              {analytics.rejectedCount}
            </p>
            <span className="text-[11px] text-warm-gray-500 mt-0.5 block">
              Proposals closed without sanction order
            </span>
          </div>
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-xl text-rose-700">
            ❌
          </div>
        </div>
      </div>

      {/* ─── Proposal Pipeline Lifecycle Distribution ─── */}
      <div className="bg-surface-elevated rounded-[18px] border border-warm-gray-200/70 shadow-soft p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-warm-gray-200/80 mb-5">
          <div>
            <h3 className="font-heading font-bold text-base text-warm-gray-900 flex items-center gap-2">
              <span>📊</span> Proposal Lifecycle Distribution
            </h3>
            <p className="text-xs text-warm-gray-500 mt-0.5">
              Live progression of submitted research dossiers across evaluation stages.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber text-xs font-bold border border-amber/15">
            {analytics.totalProposals} Total Submissions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {analytics.statusDistribution.map((stg) => (
            <div
              key={stg.stage}
              className={`p-4 rounded-[14px] border ${stg.borderColor} ${stg.bgColor} flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{stg.icon}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${stg.textColor}`}>
                    {stg.percentage}% Share
                  </span>
                </div>
                <h4 className="font-heading font-bold text-xs text-warm-gray-900 line-clamp-1">
                  {stg.label}
                </h4>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="font-heading text-2xl font-bold text-warm-gray-900">
                    {stg.count}
                  </span>
                  <span className="text-[11px] text-warm-gray-500 font-medium">
                    Proposals
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-black/5">
                <div className="w-full h-1.5 rounded-full bg-black/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stg.color} transition-all duration-700`}
                    style={{ width: `${Math.max(stg.count > 0 ? 5 : 0, stg.percentage)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Grid: Submission Trends & AI Scoring ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Submission Trends Timeline */}
        <div className="lg:col-span-7 bg-surface-elevated rounded-[18px] border border-warm-gray-200/70 shadow-soft p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-warm-gray-200/80 mb-4">
              <div>
                <h3 className="font-heading font-bold text-sm text-warm-gray-900 flex items-center gap-2">
                  <span>📅</span> Monthly Submission Activity
                </h3>
                <p className="text-[11px] text-warm-gray-500 mt-0.5">
                  Actual chronological submission frequency recorded in database.
                </p>
              </div>
            </div>

            {(!analytics.submissionTrends || analytics.submissionTrends.length === 0) ? (
              <div className="py-12 text-center text-xs text-warm-gray-400">
                No time-series submission data recorded yet.
              </div>
            ) : (
              <div className="space-y-3.5 pt-2">
                {analytics.submissionTrends.map((trend) => {
                  const pct = Math.round((trend.count / maxTrendCount) * 100)
                  return (
                    <div key={trend.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-warm-gray-800">{trend.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-warm-gray-900 font-mono">{trend.count} Submissions</span>
                          {trend.awarded > 0 && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                              {trend.awarded} Awarded
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-cream overflow-hidden border border-warm-gray-200/60">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber to-amber-light transition-all duration-700"
                          style={{ width: `${Math.max(8, pct)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <p className="text-[11px] text-warm-gray-400 text-center mt-6 pt-3 border-t border-warm-gray-100">
            Timeline intervals update automatically whenever organizations submit endorsed proposals.
          </p>
        </div>

        {/* AI Matching & Scoring Analytics */}
        <div className="lg:col-span-5 bg-surface-elevated rounded-[18px] border border-warm-gray-200/70 shadow-soft p-6 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-warm-gray-200/80 mb-4">
              <h3 className="font-heading font-bold text-sm text-warm-gray-900 flex items-center gap-2">
                <span>🧠</span> AI Mandate Alignment & Scoring
              </h3>
              <p className="text-[11px] text-warm-gray-500 mt-0.5">
                Evaluated vector similarity scores between applicant profiles and call mandates.
              </p>
            </div>

            {analytics.aiAnalytics?.hasData ? (
              <div className="space-y-5">
                <div className="flex items-center justify-center py-2">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#f1ede5"
                        strokeWidth="3.2"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="3.2"
                        strokeDasharray={`${analytics.aiAnalytics.averageScore}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="font-heading text-2xl font-bold text-warm-gray-900">
                        {analytics.aiAnalytics.averageScore}%
                      </span>
                      <span className="text-[9px] font-bold text-warm-gray-400 uppercase tracking-wider">
                        Avg Alignment
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-[10px] bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs">
                    <span className="font-medium text-emerald-900">{analytics.aiAnalytics.tiers.high.label}</span>
                    <strong className="text-emerald-800">{analytics.aiAnalytics.tiers.high.count} ({analytics.aiAnalytics.tiers.high.pct}%)</strong>
                  </div>
                  <div className="p-2.5 rounded-[10px] bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs">
                    <span className="font-medium text-amber-900">{analytics.aiAnalytics.tiers.moderate.label}</span>
                    <strong className="text-amber-800">{analytics.aiAnalytics.tiers.moderate.count} ({analytics.aiAnalytics.tiers.moderate.pct}%)</strong>
                  </div>
                  <div className="p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{analytics.aiAnalytics.tiers.low.label}</span>
                    <strong className="text-slate-700">{analytics.aiAnalytics.tiers.low.count} ({analytics.aiAnalytics.tiers.low.pct}%)</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-warm-gray-400">
                <span className="text-3xl block mb-2 opacity-60">🧠</span>
                <p className="font-medium text-warm-gray-600 mb-1">No AI Scores Recorded</p>
                <p className="text-[11px] text-warm-gray-400 max-w-xs mx-auto">
                  AI match scores will appear here automatically when proposals are submitted with semantic matching benchmarks.
                </p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-warm-gray-400 text-center mt-6 pt-3 border-t border-warm-gray-100">
            Powered by 768-dimensional semantic embedding alignment models.
          </p>
        </div>
      </div>

      {/* ─── Grant Call Performance Matrix ─── */}
      <div className="bg-surface-elevated rounded-[18px] border border-warm-gray-200/70 shadow-soft p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warm-gray-200/80 mb-5">
          <div>
            <h3 className="font-heading font-bold text-base text-warm-gray-900 flex items-center gap-2">
              <span>🏛️</span> Grant Call Performance Matrix
            </h3>
            <p className="text-xs text-warm-gray-500 mt-0.5">
              Program-level submission volume, scientific review pipeline, and sanction fund distribution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-warm-gray-500 font-medium">Filter:</label>
            <select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="px-3 py-1.5 rounded-[10px] bg-cream/30 border border-warm-gray-200 text-xs text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-amber/20 cursor-pointer"
            >
              <option value="all">All Grant Calls ({analytics.programPerformance.length})</option>
              {analytics.programPerformance.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredPrograms.length === 0 ? (
          <div className="py-12 text-center text-xs text-warm-gray-400">
            No grant call performance data found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-cream/60 border-b border-warm-gray-200 text-[11px] font-bold text-warm-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Grant Call</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Budget Pool</th>
                  <th className="py-3 px-4 text-center">Submissions</th>
                  <th className="py-3 px-4 text-center">In Evaluation</th>
                  <th className="py-3 px-4 text-center">Revisions</th>
                  <th className="py-3 px-4 text-center">Awarded</th>
                  <th className="py-3 px-4 text-right">Sanctioned Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-gray-100">
                {filteredPrograms.map((prog) => (
                  <tr key={prog.id} className="hover:bg-cream/30 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex flex-col">
                        <span className="font-bold text-warm-gray-900 leading-snug">{prog.title}</span>
                        {prog.shortTitle && (
                          <span className="text-[10px] font-mono text-warm-gray-400 mt-0.5">{prog.shortTitle}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        prog.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-warm-gray-100 text-warm-gray-600 border-warm-gray-200'
                      }`}>
                        {prog.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-medium text-warm-gray-800">
                      {prog.budget}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap font-bold text-warm-gray-900">
                      {prog.proposalsCount}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap font-medium text-purple-700">
                      {prog.underEvaluationCount}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap font-medium text-amber-800">
                      {prog.revisionsCount}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap font-bold text-emerald-700">
                      {prog.awardedCount}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-emerald-800">
                      {prog.totalAwardedCapital > 0 ? formatCurrency(prog.totalAwardedCapital) : '₹0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, note, noteColor = 'text-warm-gray-500', bgColor = 'bg-amber-50 text-amber' }) {
  return (
    <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-5 shadow-soft flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-warm-gray-500 uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-[10px] ${bgColor} flex items-center justify-center text-base shadow-2xs`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="font-heading text-3xl font-bold text-warm-gray-900 leading-tight">
          {value}
        </p>
        {note && <p className={`text-[11px] font-medium mt-1 ${noteColor}`}>{note}</p>}
      </div>
    </div>
  )
}

