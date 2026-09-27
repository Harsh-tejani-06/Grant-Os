import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgency } from '../components/AgencyContext'
import GrantCallModal from '../components/GrantCallEditorModal'

const AGENCY_TYPE_LABELS = {
  government_central: 'Central Government',
  government_state: 'State Government',
  private_foundation: 'Private Foundation',
  international_agency: 'International Agency',
  corporate_csr: 'Corporate CSR',
}

const formatLakh = (amount) => {
  return `${(amount / 100000).toFixed(2)} Lakh`;
};

const formatCr = (amount) => {
  if (!amount) return '₹0 Cr'
  return `₹${(amount / 1e7).toFixed(2)} Lakh`
}

const formatDate = (dateValue) => {
  if (!dateValue) return '—'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return dateValue
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
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

  return (
    <div className="space-y-8">
      {notificationMsg && (
        <div className="p-4 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-fade-in shadow-soft">
          <span>✓</span>
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <section className="bg-surface-elevated rounded-[20px] border border-warm-gray-200/70 p-6 sm:p-8 md:p-10 shadow-soft relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-amber-50/50 to-transparent pointer-events-none hidden md:block" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber/15 text-amber text-xs font-semibold uppercase tracking-wider mb-4">
              <span>🏛️</span> Welcome to GrantOS Funding Agency Hub
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-warm-gray-900 tracking-tight leading-tight mb-3">
              Welcome, <span className="text-amber">{displayName}</span>!
            </h1>
            <p className="text-warm-gray-600 text-base sm:text-lg leading-relaxed">
              Empower groundbreaking research and innovation. Broadcast your grant mandates,
              review matched proposals with AI scoring, and track milestone disbursements
              seamlessly.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 flex-shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[12px] bg-amber hover:bg-amber-light text-white font-semibold shadow-soft hover:shadow-medium transition-all duration-200 hover:-translate-y-0.5 cursor-pointer text-sm"
            >
              + Publish Grant Call
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard label="Active Programs" icon="📢" value={stats.activePrograms} note="Open for Institutional Submissions" noteClass="text-emerald-600" />
        <StatCard label="Total Fund Pool" icon="💰" value={formatCr(stats.totalFundPool)} note={`Committed across ${programsList.length} domain calls`} iconBg="bg-emerald-50 text-emerald-700" />
        <StatCard label="Proposals Received" icon="📄" value={stats.proposalsCount} note={`${stats.newThisWeek} new submissions this week`} noteClass="text-blue-600" iconBg="bg-blue-50 text-blue-700" />
        <StatCard label="AI Match Accuracy" icon="🧠" value={stats.aiMatchAccuracy !== null ? `${stats.aiMatchAccuracy}%` : '—'} note="Mandate alignment benchmark" iconBg="bg-purple-50 text-purple-700" />
      </section>

      {/* Agency Snapshot — quick-glance identity, location, and contact details */}
      {profile && (
        <section className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading text-lg font-bold text-warm-gray-900">Agency Snapshot</h3>
            <button
              onClick={() => navigate('/agency/dashboard/profile')}
              className="text-xs font-semibold text-amber hover:underline cursor-pointer"
            >
              Manage profile →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
            <SnapshotItem label="Agency Type" value={AGENCY_TYPE_LABELS[profile.agencyType] || profile.agencyType} />
            <SnapshotItem label="Established" value={profile.establishedYear} />
            <SnapshotItem
              label="Headquarters"
              value={[profile.headquarters?.city, profile.headquarters?.state].filter(Boolean).join(', ') || '—'}
            />
            <SnapshotItem label="Website" value={profile.website || 'Not added'} isLink={Boolean(profile.website)} />
            <SnapshotItem label="Contact Person" value={profile.contactPerson?.name} />
            <SnapshotItem label="Designation" value={profile.contactPerson?.designation || '—'} />
            <SnapshotItem label="Contact Email" value={profile.contactPerson?.email} />
            <SnapshotItem label="Contact Phone" value={profile.contactPerson?.phone} />
          </div>
          {profile.fundingDomains?.length > 0 && (
            <div className="mt-5 pt-5 border-t border-warm-gray-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-warm-gray-400 block mb-2">
                Funding Domains
              </span>
              <div className="flex flex-wrap gap-2">
                {profile.fundingDomains.map((d) => (
                  <span key={d} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber font-semibold border border-amber/15">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Capabilities + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-heading text-lg font-bold text-warm-gray-900">Current Grant Programs</h3>
              <p className="text-xs text-warm-gray-500">Live opportunities receiving applicant proposals</p>
            </div>
            <button
              onClick={() => navigate('/agency/dashboard/grants')}
              className="text-xs font-semibold text-amber hover:underline cursor-pointer"
            >
              View all →
            </button>
          </div>

          <div className="space-y-3.5">
            {loading && <p className="text-xs text-warm-gray-400 py-4 text-center">Loading…</p>}
            {!loading && programsList.length === 0 && (
              <p className="text-xs text-warm-gray-400 py-4 text-center">
                No grant programs published yet. Click "Publish Grant Call" to create your first one.
              </p>
            )}
            {programsList.slice(0, 3).map((prog) => (
              <div
                key={prog._id}
                className="p-4 rounded-[12px] bg-cream border border-warm-gray-200/70 hover:border-amber/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-semibold text-amber bg-amber-50 px-2 py-0.5 rounded">
                      {prog.displayId}
                    </span>
                    <span className="text-xs text-warm-gray-400">• {prog.category}</span>
                  </div>
                  <h4 className="font-semibold text-warm-gray-900 text-sm mb-1">{prog.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-warm-gray-500">
                    <span>💰 Budget: <strong>{prog.budget}</strong></span>
                    <span>⏳ Deadline: {formatDate(prog.deadline)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    {prog.applicationsCount} Submissions
                  </span>
                  <button
                    onClick={() => navigate('/agency/dashboard/proposals')}
                    className="text-xs font-semibold text-amber hover:bg-amber-50 px-3 py-1.5 rounded-[8px] border border-amber/20 transition-colors cursor-pointer"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real, data-driven checklist */}
        <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft flex flex-col justify-between">
          <div>
            <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-2">Agency Action Checklist</h3>
            <p className="text-xs text-warm-gray-500 mb-4">Complete setup for full network reach</p>

            <div className="space-y-3">
              <ChecklistItem
                done={checklist.accountActivated}
                title="Agency Account Activated"
                subtitle={
                  checklist.accountActivated
                    ? 'Official email verified for GrantOS network'
                    : 'Awaiting admin approval of your registration'
                }
              />
              <ChecklistItem
                done={checklist.hasPublishedGrant}
                title="Publish Initial RFP"
                subtitle={
                  checklist.hasPublishedGrant
                    ? `${programsList.length} grant call${programsList.length === 1 ? '' : 's'} published`
                    : 'Specify grant scope, domain, and corpus'
                }
                onClick={!checklist.hasPublishedGrant ? () => setShowCreateModal(true) : undefined}
              />
              <ChecklistItem
                done={checklist.isLegallyVerified}
                title="Legal Verification (CIN/Darpan)"
                subtitle={
                  checklist.isLegallyVerified
                    ? 'Trust badge active for applicant institutes'
                    : 'Enhanced trust badge for applicant institutes'
                }
                onClick={!checklist.isLegallyVerified ? () => navigate('/agency/dashboard/profile') : undefined}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-warm-gray-200">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full py-2.5 rounded-[10px] bg-amber text-white text-xs font-semibold hover:bg-amber-light transition-colors shadow-soft cursor-pointer"
            >
              + Publish New Grant Opportunity
            </button>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <GrantCallModal onClose={() => setShowCreateModal(false)} onCreated={onProgramCreated} />
      )}
    </div>
  )
}

function SnapshotItem({ label, value, isLink }) {
  return (
    <div>
      <span className="block text-[11px] font-bold uppercase tracking-wider text-warm-gray-400 mb-1">
        {label}
      </span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-amber hover:underline text-sm truncate block"
        >
          {value}
        </a>
      ) : (
        <p className="font-semibold text-warm-gray-800 text-sm truncate">{value || '—'}</p>
      )}
    </div>
  )
}

function StatCard({ label, icon, value, note, noteClass = 'text-warm-gray-500', iconBg = 'bg-amber-50 text-amber' }) {
  return (
    <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-5 shadow-soft hover:border-amber/30 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">{label}</span>
        <span className={`p-2 rounded-[10px] text-lg ${iconBg}`}>{icon}</span>
      </div>
      <div className="text-3xl font-heading font-bold text-warm-gray-900 mb-1">{value}</div>
      <p className={`text-xs font-medium flex items-center gap-1 ${noteClass}`}>{note}</p>
    </div>
  )
}

function ChecklistItem({ done, title, subtitle, onClick }) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`flex items-start gap-2.5 p-3 rounded-[10px] border w-full text-left transition-colors ${
        done
          ? 'bg-emerald-50/60 border-emerald-200/50'
          : `bg-cream border-warm-gray-200/60 ${onClick ? 'hover:border-amber/40 cursor-pointer' : ''}`
      }`}
    >
      <span className={`mt-0.5 ${done ? 'text-emerald-600' : 'text-warm-gray-400'}`}>
        {done ? '✓' : '○'}
      </span>
      <div>
        <p className="text-xs font-semibold text-warm-gray-900">{title}</p>
        <p className="text-[11px] text-warm-gray-500">{subtitle}</p>
      </div>
    </Wrapper>
  )
}