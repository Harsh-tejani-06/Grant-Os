import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { DonutChart, ColumnChart, Sparkline, ProgressRing, StackedBar, formatCurrency } from '../components/AgencyCharts'

const formatDays = (d) => (d === null || d === undefined ? '—' : `${d} days`)

// Hex equivalents of the stage colours used by the backend's STAGE_CONFIG
const STAGE_HEX = {
  pending: '#3b82f6',
  evaluation: '#a855f7',
  revisions: '#f59e0b',
  awarded: '#059669',
  rejected: '#f43f5e',
}

const downloadProgramCsv = (rows) => {
  const header = ['Grant call', 'Status', 'Budget pool', 'Submissions', 'In evaluation', 'Revisions', 'Awarded', 'Rejected', 'Conversion %', 'Sanctioned (INR)', 'Utilisation %']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.map((r) => {
    const decided = r.awardedCount + (r.rejectedCount || 0)
    return [
      r.title,
      r.status,
      r.budgetAmount || r.budget,
      r.proposalsCount,
      r.underEvaluationCount,
      r.revisionsCount,
      r.awardedCount,
      r.rejectedCount || 0,
      decided > 0 ? Math.round((r.awardedCount / decided) * 100) : '',
      r.totalAwardedCapital,
      r.utilisationPct ?? '',
    ]
      .map(esc)
      .join(',')
  })
  const blob = new Blob([[header.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `grantos-agency-analytics-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AgencyAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterProgram, setFilterProgram] = useState('all')
  const [updatedAt, setUpdatedAt] = useState(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/agency/analytics')
      if (res.data.success && res.data.analytics) {
        setAnalytics(res.data.analytics)
        setUpdatedAt(new Date())
      } else {
        setError('Failed to load analytics metrics.')
      }
    } catch (err) {
      console.error('Fetch agency analytics error:', err)
      setError(err.response?.data?.message || 'Server error while loading analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading && !analytics) return <AnalyticsSkeleton />

  if (error || !analytics) {
    return (
      <div className="rounded-[16px] border border-red-200 bg-surface-elevated p-8 text-center shadow-soft">
        <span className="mb-2 block text-3xl">⚠️</span>
        <h3 className="mb-1 font-heading text-lg font-bold text-warm-gray-900">Analytics unavailable</h3>
        <p className="mb-4 text-xs text-red-600">{error || 'Could not load agency analytics data.'}</p>
        <button
          onClick={fetchAnalytics}
          className="cursor-pointer rounded-[8px] bg-amber px-4 py-2 text-xs font-semibold text-white shadow-soft hover:bg-amber-light"
        >
          Try again
        </button>
      </div>
    )
  }

  const a = analytics
  const trends = a.submissionTrends || []
  const filteredPrograms =
    filterProgram === 'all' ? a.programPerformance : a.programPerformance.filter((p) => p.id === filterProgram)

  const slaBreached = a.avgDaysToFirstReview !== null && a.avgDaysToFirstReview > a.reviewSlaDays
  const slaScale = Math.max(a.avgDaysToFirstReview || 0, a.reviewSlaDays) * 1.5 || 1
  const sanctionedPct =
    a.totalRequestedCapital > 0 ? Math.min(100, (a.totalAwardedCapital / a.totalRequestedCapital) * 100) : 0
  const poolPct = a.totalFundPool > 0 ? Math.min(100, (a.totalAwardedCapital / a.totalFundPool) * 100) : 0

  const donutSegments = a.statusDistribution.map((s) => ({ label: s.label, value: s.count, color: STAGE_HEX[s.stage] || '#a89e8c' }))

  return (
    <div className={`space-y-6 font-body transition-opacity ${loading ? 'opacity-70' : ''}`}>
      {/* ─── Header ─── */}
      <div className="relative overflow-hidden rounded-[22px] border border-warm-gray-200/70 bg-surface-elevated p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-amber-50" />
        <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber/15 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber">
              <span>📈</span> Portfolio intelligence
            </div>
            <h1 className="font-heading text-3xl font-bold leading-tight text-warm-gray-900 sm:text-4xl">Grant analytics</h1>
            <p className="mt-2 text-sm leading-relaxed text-warm-gray-600">
              Pipeline health, review turnaround, sanction conversion and call-level performance, computed live from your proposals.
            </p>
            {updatedAt && (
              <p className="mt-2 text-xs text-warm-gray-400">
                Updated {updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[12px] border border-warm-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-warm-gray-800 transition-all hover:bg-warm-gray-100 disabled:opacity-60"
            >
              <span className={loading ? 'inline-block animate-spin' : ''}>🔄</span> Refresh
            </button>
            <button
              onClick={() => downloadProgramCsv(a.programPerformance)}
              disabled={a.programPerformance.length === 0}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[12px] border border-warm-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-warm-gray-800 transition-all hover:bg-warm-gray-100 disabled:opacity-50"
            >
              ⬇️ Export CSV
            </button>
            <Link
              to="/agency/dashboard/proposals"
              className="inline-flex items-center gap-2 rounded-[12px] bg-amber px-4 py-2.5 text-xs font-bold text-white shadow-soft transition-all hover:bg-amber-light"
            >
              Review proposals →
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Overdue banner ─── */}
      {a.overdueReviews > 0 && (
        <div className="flex flex-col justify-between gap-3 rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 sm:flex-row sm:items-center">
          <span>
            ⏰ <strong>{a.overdueReviews}</strong> proposal{a.overdueReviews === 1 ? ' has' : 's have'} been waiting more than{' '}
            {a.reviewSlaDays} days for a first review.
          </span>
          <Link to="/agency/dashboard/proposals" className="whitespace-nowrap font-bold text-amber-800 hover:underline">
            Review now →
          </Link>
        </div>
      )}

      {/* ─── KPI row 1 ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Proposals received" icon="📄" accent="bg-purple-500" value={a.totalProposals} note={`${a.pendingCount} awaiting first review`}>
          {trends.length > 0 && (
            <div className="mt-3">
              <Sparkline values={trends.map((t) => t.count)} color="#a855f7" width={140} height={34} />
            </div>
          )}
        </Kpi>

        <Kpi label="Under evaluation" icon="🔍" accent="bg-blue-500" value={a.underEvaluationCount} note={`${a.revisionsCount} awaiting revisions from organizations`} />

        <Kpi label="Grants sanctioned" icon="🏆" accent="bg-emerald-500" value={a.awardedCount} note={a.totalAwardedCapital > 0 ? formatCurrency(a.totalAwardedCapital) : '₹0 sanctioned'} noteClass="text-emerald-700" />

        <div className="relative overflow-hidden rounded-[16px] border border-warm-gray-200/70 bg-surface-elevated p-5 shadow-soft">
          <span className="absolute inset-x-0 top-0 h-1 bg-amber" />
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">Award conversion</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-cream text-lg">🎯</span>
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing value={a.decidedCount > 0 ? a.awardRate : 0} size={72} thickness={8} color="#059669">
              <span className="font-heading text-base font-bold text-warm-gray-900">{a.decidedCount > 0 ? `${a.awardRate}%` : '—'}</span>
            </ProgressRing>
            <p className="text-xs text-warm-gray-500">
              {a.decidedCount > 0 ? `${a.awardedCount} awarded of ${a.decidedCount} decided` : 'No proposals decided yet'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── KPI row 2 ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Allocated pool" icon="💰" accent="bg-blue-500" value={formatCurrency(a.totalFundPool)} note={`Across ${a.totalPrograms} grant call${a.totalPrograms === 1 ? '' : 's'}`}>
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-warm-gray-100">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${poolPct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-warm-gray-400">{poolPct.toFixed(1)}% sanctioned</p>
          </div>
        </Kpi>

        <Kpi
          label="Time to first review"
          icon="⏱️"
          accent={slaBreached ? 'bg-rose-500' : 'bg-purple-500'}
          value={formatDays(a.avgDaysToFirstReview)}
          note={`Target: within ${a.reviewSlaDays} days`}
          noteClass={slaBreached ? 'text-rose-600' : 'text-warm-gray-500'}
        >
          {a.avgDaysToFirstReview !== null && (
            <div className="relative mt-3 h-2 rounded-full bg-warm-gray-100">
              <div
                className={`h-full rounded-full ${slaBreached ? 'bg-rose-500' : 'bg-purple-500'}`}
                style={{ width: `${Math.min(100, (a.avgDaysToFirstReview / slaScale) * 100)}%` }}
              />
              <span
                className="absolute -top-1 h-4 w-0.5 bg-warm-gray-800"
                style={{ left: `${(a.reviewSlaDays / slaScale) * 100}%` }}
                title={`Target: ${a.reviewSlaDays} days`}
              />
            </div>
          )}
        </Kpi>

        <Kpi label="Time to decision" icon="🏁" accent="bg-amber" value={formatDays(a.avgDaysToDecision)} note="From submission to award or rejection" />

        <Kpi label="Requested vs sanctioned" icon="📊" accent="bg-emerald-500" value={formatCurrency(a.totalAwardedCapital)} note={a.totalRequestedCapital > 0 ? `of ${formatCurrency(a.totalRequestedCapital)} requested` : 'No requested amounts recorded'}>
          {a.totalRequestedCapital > 0 && (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-warm-gray-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${sanctionedPct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-warm-gray-400">{sanctionedPct.toFixed(1)}% of requested funds</p>
            </div>
          )}
        </Kpi>
      </div>

      {/* ─── Pipeline + Monthly activity ─── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-5" title="Proposal pipeline" subtitle="Where submitted proposals sit right now">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <DonutChart segments={donutSegments} centerValue={a.totalProposals} centerLabel="Proposals" />
            <ul className="w-full flex-1 space-y-3">
              {a.statusDistribution.map((s) => (
                <li key={s.stage}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-warm-gray-700">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: STAGE_HEX[s.stage] }} />
                      {s.label}
                    </span>
                    <span className="text-warm-gray-500">
                      <strong className="text-warm-gray-900">{s.count}</strong> • {s.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-warm-gray-100">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.percentage}%`, background: STAGE_HEX[s.stage] }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel className="xl:col-span-7" title="Monthly submissions" subtitle="Proposals received per month, with how many were awarded">
          {trends.length === 0 ? (
            <EmptyNote>No time-series submission data recorded yet.</EmptyNote>
          ) : (
            <ColumnChart data={trends.map((t) => ({ key: t.key, label: t.label.replace(' ', ' ’').replace('’ 20', '’'), value: t.count, secondary: t.awarded }))} />
          )}
        </Panel>
      </div>

      {/* ─── AI alignment + Waiting on you ─── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-5" title="AI mandate alignment" subtitle="Similarity between applicant profiles and your call mandates">
          {a.aiAnalytics?.hasData ? (
            <div className="space-y-5">
              <div className="flex items-center gap-5">
                <ProgressRing value={a.aiAnalytics.averageScore} size={96} thickness={10} color="#059669">
                  <div className="text-center">
                    <span className="block font-heading text-xl font-bold text-warm-gray-900">{a.aiAnalytics.averageScore}%</span>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-warm-gray-400">Average</span>
                  </div>
                </ProgressRing>
                <p className="text-xs leading-relaxed text-warm-gray-500">
                  Average alignment across all scored proposals. Higher scores indicate a closer fit with your funding mandates.
                </p>
              </div>
              {[
                { tier: a.aiAnalytics.tiers.high, bar: 'bg-emerald-500', text: 'text-emerald-800' },
                { tier: a.aiAnalytics.tiers.moderate, bar: 'bg-amber-500', text: 'text-amber-800' },
                { tier: a.aiAnalytics.tiers.low, bar: 'bg-slate-400', text: 'text-slate-700' },
              ].map(({ tier, bar, text }) => (
                <div key={tier.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-warm-gray-700">{tier.label}</span>
                    <strong className={text}>
                      {tier.count} ({tier.pct}%)
                    </strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-warm-gray-100">
                    <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${tier.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <span className="mb-2 block text-3xl opacity-60">🧠</span>
              <p className="mb-1 text-sm font-semibold text-warm-gray-700">No AI scores recorded</p>
              <p className="mx-auto max-w-xs text-xs text-warm-gray-400">
                Scores appear here when proposals are submitted with semantic matching benchmarks.
              </p>
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-7" title="Waiting on you" subtitle="Oldest proposals that still need an agency action">
          {!a.agingQueue || a.agingQueue.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600">✓</div>
              <p className="text-sm font-semibold text-warm-gray-800">Nothing pending</p>
              <p className="mt-1 text-xs text-warm-gray-400">You are all caught up.</p>
            </div>
          ) : (
            <ul className="divide-y divide-warm-gray-100">
              {a.agingQueue.map((item) => (
                <li key={item.proposalId} className="flex flex-col justify-between gap-2 py-3.5 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-warm-gray-900">{item.title}</p>
                    <p className="truncate text-xs text-warm-gray-500">
                      {item.institution}
                      {item.programTitle ? ` • ${item.programTitle}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        item.status === 'Under Evaluation'
                          ? 'border-purple-200 bg-purple-50 text-purple-700'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className={`w-20 text-right text-xs font-bold ${item.overdue ? 'text-rose-600' : 'text-warm-gray-500'}`}>
                      {item.daysWaiting}d{item.overdue ? ' • overdue' : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ─── Grant call performance ─── */}
      <Panel
        title="Grant call performance"
        subtitle="Submission volume, review pipeline, conversion and fund utilisation per call"
        action={
          <select
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
            aria-label="Filter grant calls"
            className="cursor-pointer rounded-[10px] border border-warm-gray-200 bg-cream/40 px-3 py-1.5 text-xs text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-amber/20"
          >
            <option value="all">All grant calls ({a.programPerformance.length})</option>
            {a.programPerformance.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        }
      >
        {filteredPrograms.length === 0 ? (
          <EmptyNote>No grant call performance data found.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-warm-gray-200 bg-cream/60 text-[11px] font-bold uppercase tracking-wider text-warm-gray-600">
                  <th className="px-4 py-3">Grant call</th>
                  <th className="px-4 py-3">Budget pool</th>
                  <th className="px-4 py-3 text-center">Submissions</th>
                  <th className="min-w-[170px] px-4 py-3">Pipeline</th>
                  <th className="px-4 py-3 text-center">Conversion</th>
                  <th className="px-4 py-3 text-right">Sanctioned</th>
                  <th className="min-w-[150px] px-4 py-3">Utilisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-gray-100">
                {filteredPrograms.map((prog) => {
                  const rejected = prog.rejectedCount || 0
                  const decided = prog.awardedCount + rejected
                  const pending = Math.max(prog.proposalsCount - prog.underEvaluationCount - prog.revisionsCount - prog.awardedCount - rejected, 0)
                  return (
                    <tr key={prog.id} className="transition-colors hover:bg-cream/40">
                      <td className="max-w-xs px-4 py-3.5">
                        <span className="block font-bold leading-snug text-warm-gray-900">{prog.title}</span>
                        <span className="mt-1 flex items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              prog.status === 'Active'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-warm-gray-200 bg-warm-gray-100 text-warm-gray-600'
                            }`}
                          >
                            {prog.status}
                          </span>
                          {prog.shortTitle && <span className="font-mono text-[10px] text-warm-gray-400">{prog.shortTitle}</span>}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono font-medium text-warm-gray-800">{prog.budget}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-warm-gray-900">{prog.proposalsCount}</td>
                      <td className="px-4 py-3.5">
                        <StackedBar
                          height={8}
                          segments={[
                            { label: 'Awaiting review', value: pending, color: STAGE_HEX.pending },
                            { label: 'Under evaluation', value: prog.underEvaluationCount, color: STAGE_HEX.evaluation },
                            { label: 'Revisions requested', value: prog.revisionsCount, color: STAGE_HEX.revisions },
                            { label: 'Awarded', value: prog.awardedCount, color: STAGE_HEX.awarded },
                            { label: 'Rejected', value: rejected, color: STAGE_HEX.rejected },
                          ]}
                        />
                        <span className="mt-1 block text-[10px] text-warm-gray-400">
                          {prog.underEvaluationCount} evaluating • {prog.revisionsCount} revisions • {prog.awardedCount} awarded
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold text-warm-gray-800">
                        {decided > 0 ? `${Math.round((prog.awardedCount / decided) * 100)}%` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono font-bold text-emerald-800">
                        {prog.totalAwardedCapital > 0 ? formatCurrency(prog.totalAwardedCapital) : '₹0'}
                      </td>
                      <td className="px-4 py-3.5">
                        {prog.utilisationPct === null || prog.utilisationPct === undefined ? (
                          <span className="text-warm-gray-400">No budget set</span>
                        ) : (
                          <div>
                            <div className="h-2 overflow-hidden rounded-full bg-warm-gray-100">
                              <div
                                className={`h-full rounded-full ${prog.utilisationPct > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(prog.utilisationPct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-warm-gray-500">{prog.utilisationPct}% used</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

// ─── Building blocks ───
function Panel({ title, subtitle, action, className = '', children }) {
  return (
    <section className={`rounded-[18px] border border-warm-gray-200/70 bg-surface-elevated p-6 shadow-soft ${className}`}>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="font-heading text-lg font-bold text-warm-gray-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-warm-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Kpi({ label, icon, value, note, noteClass = 'text-warm-gray-500', accent = 'bg-amber', children }) {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-warm-gray-200/70 bg-surface-elevated p-5 shadow-soft">
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-cream text-lg">{icon}</span>
      </div>
      <p className="font-heading text-3xl font-bold leading-tight text-warm-gray-900">{value}</p>
      <p className={`mt-1 text-[11px] font-medium ${noteClass}`}>{note}</p>
      {children}
    </div>
  )
}

function EmptyNote({ children }) {
  return <div className="py-12 text-center text-xs text-warm-gray-400">{children}</div>
}

function AnalyticsSkeleton() {
  const block = 'animate-pulse rounded-[16px] bg-warm-gray-100'
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
      <div className={`${block} h-44`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-32`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className={`${block} h-72 xl:col-span-5`} />
        <div className={`${block} h-72 xl:col-span-7`} />
      </div>
      <div className={`${block} h-64`} />
    </div>
  )
}