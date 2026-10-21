import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgency } from '../components/AgencyContext'
import GrantCallModal from '../components/GrantCallEditorModal'
import { StackedBar, ProgressRing, formatCurrency, timeAgo } from '../components/AgencyCharts'

const AGENCY_TYPE_LABELS = {
  government_central: 'Central Government',
  government_state: 'State Government',
  private_foundation: 'Private Foundation',
  international_agency: 'International Agency',
  corporate_csr: 'Corporate CSR',
}

const AWAITING = ['Submitted to Agency', 'Submitted']
const REVIEW_SLA_DAYS = 7

const PIPELINE = [
  { key: 'awaiting', label: 'Awaiting review', color: '#3b82f6', statuses: AWAITING },
  { key: 'evaluation', label: 'Under evaluation', color: '#a855f7', statuses: ['Under Evaluation'] },
  { key: 'revisions', label: 'Revisions requested', color: '#f59e0b', statuses: ['Revisions Requested'] },
  { key: 'awarded', label: 'Awarded', color: '#059669', statuses: ['Awarded', 'Accepted'] },
  { key: 'rejected', label: 'Rejected', color: '#f43f5e', statuses: ['Rejected', 'Not Awarded'] },
]

const STAGE_ICON = {
  'Submitted to Agency': '📥',
  'Under Evaluation': '🔍',
  'Revisions Requested': '✏️',
  Awarded: '🏆',
  Accepted: '🤝',
  Rejected: '⛔',
  'Not Awarded': '⛔',
}

const formatDate = (dateValue) => {
  if (!dateValue) return '—'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return dateValue
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const daysSince = (value) => (value ? Math.floor((Date.now() - new Date(value).getTime()) / 86400000) : 0)

const daysLeft = (value) => {
  if (!value) return null
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return null
  return Math.ceil((t - Date.now()) / 86400000)
}

// When the proposal last landed in the agency's queue (a resubmission restarts the wait).
const lastSubmittedAt = (p) => {
  const entries = (p.trackingTimeline || []).filter((t) => t.stage === 'Submitted to Agency')
  return entries.length
    ? entries[entries.length - 1].timestamp
    : p.agencySubmission?.submittedAt || p.submittedAt || p.createdAt
}

export default function AgencyOverviewPage() {
  const navigate = useNavigate()
  const { agency, profile, programsList, proposalsList, stats, checklist, loading, refreshPrograms, refreshStats } =
    useAgency()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [notificationMsg, setNotificationMsg] = useState('')

  const displayName = agency?.agencyName || 'Funding Agency Partner'

  const onProgramCreated = () => {
    setShowCreateModal(false)
    setNotificationMsg('New Grant Program published successfully!')
    setTimeout(() => setNotificationMsg(''), 4000)
    refreshPrograms()
    refreshStats()
  }

  // ─── Derived data (all from what the context already loads) ───
  const pipeline = useMemo(
    () => PIPELINE.map((s) => ({ ...s, value: proposalsList.filter((p) => s.statuses.includes(p.status)).length })),
    [proposalsList]
  )
  const pipelineTotal = pipeline.reduce((n, s) => n + s.value, 0)
  const revisionsCount = pipeline.find((s) => s.key === 'revisions')?.value || 0

  const attention = useMemo(
    () =>
      proposalsList
        .filter((p) => AWAITING.includes(p.status))
        .map((p) => ({ ...p, waited: daysSince(lastSubmittedAt(p)) }))
        .sort((a, b) => b.waited - a.waited),
    [proposalsList]
  )

  const sortedPrograms = useMemo(() => {
    const rank = (p) => (p.status === 'Active' ? 0 : p.status === 'Upcoming' ? 1 : 2)
    return [...programsList].sort((a, b) => {
      if (rank(a) !== rank(b)) return rank(a) - rank(b)
      return new Date(a.deadline || 8.64e15) - new Date(b.deadline || 8.64e15)
    })
  }, [programsList])

  const closingSoon = sortedPrograms.filter((p) => {
    const d = daysLeft(p.deadline)
    return p.status === 'Active' && d !== null && d >= 0 && d <= 14
  }).length

  const activity = useMemo(() => {
    const events = []
    proposalsList.forEach((p) => {
      const base = { proposalId: p._id, title: p.title, org: p.organization?.organizationName || 'An institution' }
      const timeline = p.trackingTimeline || []
      timeline.forEach((t) => events.push({ ...base, stage: t.stage, source: t.source, notes: t.notes, at: t.timestamp }))
      // Proposals submitted before timeline logging existed
      const submittedAt = p.agencySubmission?.submittedAt || p.submittedAt
      if (submittedAt && !timeline.some((t) => t.stage === 'Submitted to Agency')) {
        events.push({ ...base, stage: 'Submitted to Agency', source: 'org_admin', notes: '', at: submittedAt })
      }
    })
    return events.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 7)
  }, [proposalsList])

  const describe = (e) => {
    if (e.source === 'funding_agency') return { who: 'You', text: `moved “${e.title}” to ${e.stage}` }
    if (e.stage === 'Submitted to Agency') {
      return { who: e.org, text: `${/^Resubmitted/i.test(e.notes || '') ? 'resubmitted' : 'submitted'} “${e.title}”` }
    }
    if (e.stage === 'Accepted') return { who: e.org, text: `accepted the award for “${e.title}”` }
    return { who: e.org, text: `updated “${e.title}” to ${e.stage}` }
  }

  // ─── Fund pool ───
  const fundPool = stats.totalFundPool || 0
  const totalAwarded = stats.totalAwarded || 0
  const utilisation = fundPool > 0 ? Math.min(100, (totalAwarded / fundPool) * 100) : 0

  // ─── Greeting ───
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const summaryParts = []
  if (attention.length > 0) summaryParts.push(`${attention.length} proposal${attention.length === 1 ? '' : 's'} awaiting your review`)
  if (closingSoon > 0) summaryParts.push(`${closingSoon} grant call${closingSoon === 1 ? '' : 's'} closing within 14 days`)
  const summary = summaryParts.length ? summaryParts.join(' • ') : 'Everything is up to date. Nothing needs your attention right now.'

  const setupDone = [checklist.accountActivated, checklist.hasPublishedGrant, checklist.isLegallyVerified].filter(Boolean).length

  return (
    <div className="space-y-6">
      {notificationMsg && (
        <div className="flex animate-fade-in items-center gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-soft">
          <span>✓</span>
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden rounded-[22px] border border-warm-gray-200/70 bg-surface-elevated p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-amber-50" />
        <div className="pointer-events-none absolute -bottom-24 right-40 hidden h-56 w-56 rounded-full bg-cream-dark/60 md:block" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-warm-gray-400">{today}</p>
            <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight text-warm-gray-900 sm:text-4xl">
              {greeting}, <span className="text-amber">{displayName}</span>
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-warm-gray-600">{summary}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  agency?.status === 'approved'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber/20 bg-amber-50 text-amber'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${agency?.status === 'approved' ? 'bg-emerald-500' : 'bg-amber'}`} />
                {agency?.status === 'approved' ? 'Verified agency partner' : 'Setup in progress'}
              </span>
              {profile?.agencyType && (
                <span className="rounded-full border border-warm-gray-200 bg-cream px-3 py-1 text-xs font-semibold text-warm-gray-600">
                  {AGENCY_TYPE_LABELS[profile.agencyType] || profile.agencyType}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-amber px-5 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-light hover:shadow-medium"
            >
              + Publish Grant Call
            </button>
            <button
              onClick={() => navigate('/agency/dashboard/analytics')}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-warm-gray-200 bg-white px-5 py-3 text-sm font-semibold text-warm-gray-700 transition-colors hover:bg-warm-gray-100"
            >
              📈 View analytics
            </button>
          </div>
        </div>
      </section>

      {/* ─── KPI row ─── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Active programmes"
          icon="📢"
          accent="bg-blue-500"
          value={loading ? '—' : stats.activePrograms ?? 0}
          note={`${stats.totalPrograms ?? programsList.length} grant calls in total`}
          onClick={() => navigate('/agency/dashboard/grants')}
        />

        <Kpi
          label="Fund pool"
          icon="💰"
          accent="bg-emerald-500"
          value={loading ? '—' : formatCurrency(fundPool)}
          note={`${formatCurrency(totalAwarded)} sanctioned`}
        >
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-warm-gray-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${utilisation}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-warm-gray-400">{utilisation.toFixed(1)}% of the pool awarded</p>
          </div>
        </Kpi>

        <Kpi
          label="Proposals received"
          icon="📄"
          accent="bg-purple-500"
          value={loading ? '—' : stats.proposalsCount ?? 0}
          note={`${stats.newThisWeek ?? 0} new this week`}
          onClick={() => navigate('/agency/dashboard/proposals')}
        />

        <Kpi
          label="Awaiting your review"
          icon="⏰"
          accent={attention.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'}
          value={loading ? '—' : attention.length}
          note={attention.length > 0 ? `Oldest waiting ${attention[0].waited} day${attention[0].waited === 1 ? '' : 's'}` : 'All caught up'}
          noteClass={attention.length > 0 ? 'text-rose-600' : 'text-emerald-600'}
          onClick={() => navigate('/agency/dashboard/proposals')}
        />
      </section>

      {/* ─── Attention + Pipeline ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Needs your attention"
          subtitle="Proposals waiting for a first review, oldest first"
          action={
            <button onClick={() => navigate('/agency/dashboard/proposals')} className="cursor-pointer text-xs font-semibold text-amber hover:underline">
              Open proposals →
            </button>
          }
        >
          {attention.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600">✓</div>
              <p className="text-sm font-semibold text-warm-gray-800">You’re all caught up</p>
              <p className="mt-1 text-xs text-warm-gray-400">New submissions will appear here the moment an organization submits.</p>
            </div>
          ) : (
            <ul className="divide-y divide-warm-gray-100">
              {attention.slice(0, 5).map((p) => (
                <li key={p._id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-warm-gray-900">{p.title}</p>
                    <p className="mt-0.5 truncate text-xs text-warm-gray-500">
                      {p.organization?.organizationName || 'Unknown institution'}
                      {p.grantProgram?.title ? ` • ${p.grantProgram.title}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        p.waited > REVIEW_SLA_DAYS
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-warm-gray-200 bg-warm-gray-100 text-warm-gray-600'
                      }`}
                    >
                      {p.waited === 0 ? 'Today' : `${p.waited}d waiting`}
                    </span>
                    <button
                      onClick={() => navigate('/agency/dashboard/proposals')}
                      className="cursor-pointer rounded-[8px] border border-amber/20 px-3 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber-50"
                    >
                      Review
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {revisionsCount > 0 && (
            <p className="mt-4 rounded-[10px] bg-amber-50 px-3.5 py-2.5 text-xs text-amber">
              ✏️ {revisionsCount} proposal{revisionsCount === 1 ? ' is' : 's are'} waiting for the organization to resubmit after your revision request.
            </p>
          )}
        </Panel>

        <Panel
          title="Pipeline snapshot"
          subtitle={`${pipelineTotal} submitted proposal${pipelineTotal === 1 ? '' : 's'}`}
          action={
            stats.aiMatchAccuracy !== null && stats.aiMatchAccuracy !== undefined ? (
              <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700" title="Average AI mandate-alignment score">
                🧠 {stats.aiMatchAccuracy}% avg match
              </span>
            ) : null
          }
        >
          <StackedBar segments={pipeline} height={14} />
          <ul className="mt-5 space-y-2.5">
            {pipeline.map((s) => (
              <li key={s.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5 text-warm-gray-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-bold text-warm-gray-900">{s.value}</span>
                  <span className="w-9 text-right text-xs text-warm-gray-400">
                    {pipelineTotal ? `${Math.round((s.value / pipelineTotal) * 100)}%` : '0%'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ─── Programmes + Activity ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Grant programmes"
          subtitle="Closest deadlines first"
          action={
            <button onClick={() => navigate('/agency/dashboard/grants')} className="cursor-pointer text-xs font-semibold text-amber hover:underline">
              View all →
            </button>
          }
        >
          {loading && <p className="py-6 text-center text-xs text-warm-gray-400">Loading…</p>}
          {!loading && programsList.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-warm-gray-800">No grant calls yet</p>
              <p className="mt-1 text-xs text-warm-gray-400">Publish your first call to start receiving proposals.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 cursor-pointer rounded-[10px] bg-amber px-4 py-2 text-xs font-semibold text-white shadow-soft hover:bg-amber-light"
              >
                + Publish Grant Call
              </button>
            </div>
          )}

          <div className="space-y-3">
            {sortedPrograms.slice(0, 4).map((prog) => {
              const left = daysLeft(prog.deadline)
              const isActive = prog.status === 'Active'
              let pill = { text: prog.status, cls: 'border-warm-gray-200 bg-warm-gray-100 text-warm-gray-600' }
              if (isActive && left !== null) {
                if (left < 0) pill = { text: 'Closed', cls: 'border-warm-gray-200 bg-warm-gray-100 text-warm-gray-600' }
                else if (left === 0) pill = { text: 'Closes today', cls: 'border-rose-200 bg-rose-50 text-rose-700' }
                else if (left <= 3) pill = { text: `${left}d left`, cls: 'border-rose-200 bg-rose-50 text-rose-700' }
                else if (left <= 14) pill = { text: `${left}d left`, cls: 'border-amber-200 bg-amber-50 text-amber-800' }
                else pill = { text: `${left}d left`, cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
              }
              return (
                <div
                  key={prog._id}
                  className="flex flex-col justify-between gap-4 rounded-[14px] border border-warm-gray-200/70 bg-cream/60 p-4 transition-all hover:border-amber/40 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {prog.displayId && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber">{prog.displayId}</span>
                      )}
                      {prog.category && <span className="text-xs text-warm-gray-400">{prog.category}</span>}
                    </div>
                    <h4 className="truncate text-sm font-semibold text-warm-gray-900">{prog.title}</h4>
                    <p className="mt-1 text-xs text-warm-gray-500">
                      💰 <strong>{prog.budget || formatCurrency(prog.budgetAmount)}</strong> • ⏳ {formatDate(prog.deadline)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2.5">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${pill.cls}`}>{pill.text}</span>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {prog.applicationsCount ?? 0} submission{prog.applicationsCount === 1 ? '' : 's'}
                    </span>
                    <button
                      onClick={() => navigate('/agency/dashboard/proposals')}
                      className="cursor-pointer rounded-[8px] border border-amber/20 px-3 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber-50"
                    >
                      Review
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel title="Recent activity" subtitle="Latest updates across your proposals">
          {activity.length === 0 ? (
            <p className="py-8 text-center text-xs text-warm-gray-400">No activity yet. Updates appear as proposals move through the pipeline.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-warm-gray-200 pl-5">
              {activity.map((e, i) => {
                const d = describe(e)
                return (
                  <li key={`${e.proposalId}-${i}`} className="relative">
                    <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border border-warm-gray-200 bg-white text-xs">
                      {STAGE_ICON[e.stage] || '•'}
                    </span>
                    <p className="text-[13px] leading-snug text-warm-gray-700">
                      <strong className="text-warm-gray-900">{d.who}</strong> {d.text}
                    </p>
                    <p className="mt-0.5 text-[11px] text-warm-gray-400">{timeAgo(e.at)}</p>
                  </li>
                )
              })}
            </ol>
          )}
        </Panel>
      </div>

      {/* ─── Snapshot + Checklist ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {profile && (
          <Panel
            className="lg:col-span-2"
            title="Agency snapshot"
            subtitle="Identity and contact details shown to applicants"
            action={
              <button onClick={() => navigate('/agency/dashboard/profile')} className="cursor-pointer text-xs font-semibold text-amber hover:underline">
                Manage profile →
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <SnapshotItem label="Agency type" value={AGENCY_TYPE_LABELS[profile.agencyType] || profile.agencyType} />
              <SnapshotItem label="Established" value={profile.establishedYear} />
              <SnapshotItem label="Headquarters" value={[profile.headquarters?.city, profile.headquarters?.state].filter(Boolean).join(', ') || '—'} />
              <SnapshotItem
                label="Website"
                value={profile.website || 'Not added'}
                isLink={Boolean(profile.website) && /^https?:\/\//i.test(profile.website)}
              />
              <SnapshotItem label="Contact person" value={profile.contactPerson?.name} />
              <SnapshotItem label="Designation" value={profile.contactPerson?.designation || '—'} />
              <SnapshotItem label="Contact email" value={profile.contactPerson?.email} />
              <SnapshotItem label="Contact phone" value={profile.contactPerson?.phone} />
            </div>
            {profile.fundingDomains?.length > 0 && (
              <div className="mt-5 border-t border-warm-gray-100 pt-5">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-warm-gray-400">Funding domains</span>
                <div className="flex flex-wrap gap-2">
                  {profile.fundingDomains.map((d) => (
                    <span key={d} className="rounded-full border border-amber/15 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        )}

        <Panel
          className={profile ? '' : 'lg:col-span-3'}
          title="Setup checklist"
          subtitle="Complete setup for full network reach"
          action={
            <ProgressRing value={(setupDone / 3) * 100} size={46} thickness={5} color="#705c30">
              <span className="text-[11px] font-bold text-warm-gray-800">{setupDone}/3</span>
            </ProgressRing>
          }
        >
          <div className="space-y-3">
            <ChecklistItem
              done={checklist.accountActivated}
              title="Agency account activated"
              subtitle={checklist.accountActivated ? 'Official email verified for the GrantIQ network' : 'Awaiting admin approval of your registration'}
            />
            <ChecklistItem
              done={checklist.hasPublishedGrant}
              title="Publish your first grant call"
              subtitle={
                checklist.hasPublishedGrant
                  ? `${programsList.length} grant call${programsList.length === 1 ? '' : 's'} published`
                  : 'Specify grant scope, domain and corpus'
              }
              onClick={!checklist.hasPublishedGrant ? () => setShowCreateModal(true) : undefined}
            />
            <ChecklistItem
              done={checklist.isLegallyVerified}
              title="Legal verification (CIN / Darpan)"
              subtitle={checklist.isLegallyVerified ? 'Trust badge active for applicant institutes' : 'Add a trust badge for applicant institutes'}
              onClick={!checklist.isLegallyVerified ? () => navigate('/agency/dashboard/profile') : undefined}
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-5 w-full cursor-pointer rounded-[10px] bg-amber py-2.5 text-xs font-semibold text-white shadow-soft transition-colors hover:bg-amber-light"
          >
            + Publish new grant opportunity
          </button>
        </Panel>
      </div>

      {showCreateModal && <GrantCallModal onClose={() => setShowCreateModal(false)} onCreated={onProgramCreated} />}
    </div>
  )
}

// ─── Building blocks ───
function Panel({ title, subtitle, action, className = '', children }) {
  return (
    <section className={`rounded-[18px] border border-warm-gray-200/70 bg-surface-elevated p-6 shadow-soft ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
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

function Kpi({ label, icon, value, note, noteClass = 'text-warm-gray-500', accent = 'bg-amber', onClick, children }) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`relative overflow-hidden rounded-[16px] border border-warm-gray-200/70 bg-surface-elevated p-5 text-left shadow-soft transition-all ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-medium' : ''
      }`}
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-cream text-lg">{icon}</span>
      </div>
      <div className="font-heading text-3xl font-bold text-warm-gray-900">{value}</div>
      <p className={`mt-1 text-xs font-medium ${noteClass}`}>{note}</p>
      {children}
    </Wrapper>
  )
}

function SnapshotItem({ label, value, isLink }) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-warm-gray-400">{label}</span>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-amber hover:underline">
          {value}
        </a>
      ) : (
        <p className="truncate text-sm font-semibold text-warm-gray-800">{value || '—'}</p>
      )}
    </div>
  )
}

function ChecklistItem({ done, title, subtitle, onClick }) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-[12px] border p-3.5 text-left transition-colors ${
        done ? 'border-emerald-200/60 bg-emerald-50/60' : `border-warm-gray-200/60 bg-cream ${onClick ? 'cursor-pointer hover:border-amber/40' : ''}`
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          done ? 'bg-emerald-500 text-white' : 'border border-warm-gray-300 text-transparent'
        }`}
      >
        ✓
      </span>
      <div>
        <p className="text-xs font-semibold text-warm-gray-900">{title}</p>
        <p className="mt-0.5 text-xs text-warm-gray-500">{subtitle}</p>
      </div>
    </Wrapper>
  )
}