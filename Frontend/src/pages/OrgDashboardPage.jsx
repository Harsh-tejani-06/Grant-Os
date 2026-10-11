import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../api'
import { socket, joinOrgRoom, leaveOrgRoom } from '../socket'
import GrantDiscoveryModule from '../components/GrantDiscoveryModule'
import { FundingAgencyDonutChart, MonthlyGrantTrajectoryChart } from '../components/OrgCharts'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const TreasuryIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 3l9 7H3l9-7z" />
  </svg>
)

const TrophyIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 4h16v6a7 7 0 0 1-14 0V4z" />
    <path d="M12 17v4M8 21h8" />
  </svg>
)

const DocumentTextIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const TrackingChartIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
)

const UsersIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const ClockIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const TrendingUpIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
)

const CompassIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
)

const ShieldCheckIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
)

const FlameIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
)

const SparklesIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
  </svg>
)

const SparklineSvg = ({ data = [], color = "#059669", className = "w-16 h-6" }) => {
  if (!data || data.length === 0 || data.every(v => v === 0)) {
    return (
      <svg viewBox="0 0 80 24" fill="none" className={className}>
        <line x1="0" y1="18" x2="80" y2="18" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
      </svg>
    )
  }
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const points = data.map((val, idx) => {
    const x = data.length === 1 ? 40 : (idx / (data.length - 1)) * 76 + 2
    const y = 20 - ((val - min) / range) * 16
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const polylineStr = points.join(' ')
  const areaStr = `0,24 ${polylineStr} 80,24`
  return (
    <svg viewBox="0 0 80 24" fill="none" className={className}>
      <polygon points={areaStr} fill={color} fillOpacity="0.15" />
      <polyline points={polylineStr} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Task type config ───
const TASK_TYPES = [
  { key: 'proposal_writing', label: 'Proposal Writing', icon: '📝', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'grant_discovery', label: 'Grant Discovery', icon: '🔍', color: 'bg-blue-50 text-blue-700 border-blue-200' },
]

// ─── Sidebar nav items ───
const NAV_ITEMS = [
  { key: 'home', label: 'Dashboard', icon: <TreasuryIcon className="w-4 h-4" /> },
  { key: 'grants', label: 'Grant Discovery', icon: <CompassIcon className="w-4 h-4" /> },
  { key: 'proposals', label: 'Proposal Management', icon: <DocumentTextIcon className="w-4 h-4" /> },
  { key: 'tracking', label: 'Proposal Tracking', icon: <TrackingChartIcon className="w-4 h-4" /> },
  { key: 'team', label: 'Team Management', icon: <UsersIcon className="w-4 h-4" /> },
  { key: 'deadlines', label: 'Deadline Alerts', icon: <ClockIcon className="w-4 h-4" /> },
  { key: 'analytics', label: 'Analytics', icon: <TrendingUpIcon className="w-4 h-4" /> },
]

const GRANT_CATEGORIES = [
  'Science & Technology',
  'Healthcare & Medicine',
  'Environmental Sciences',
  'Social Sciences',
  'Agriculture & Rural',
  'Technology & Computing',
  'Medical Science',
  'Agriculture',
]

const GRANT_FUNDING_TYPES = [
  'Project Grant',
  'Research & Commercialization',
  'Institutional Fellowship',
  'Pre-Seed Grant',
]

const APPLICANT_TYPE_LABELS = {
  university: 'University',
  college: 'College',
  research_institution: 'Research Institution',
  ngo: 'NGO',
  startup: 'Startup',
  government_organization: 'Government Organization',
  private_company: 'Private Company',
  individual: 'Individual Researchers',
  faculty_member: 'Faculty Members / Professors',
  student: 'Students',
  research_scholar: 'Research Scholars / PhD Scholars',
  hospital_medical_institution: 'Hospitals / Medical Institutions',
}

const AGENCY_TYPE_LABELS = {
  government_central: 'Central Government',
  government_state: 'State Government',
  private_foundation: 'Private Foundation',
  international_agency: 'International Agency',
  corporate_csr: 'Corporate CSR',
}

// ─── Government / Other Sources (scraped grant discovery) constants ───
// This tab is now backed by GET /org/grants/discover — same endpoint and
// response shape used by the standalone GrantDiscoveryPage — rather than the
// raw GrantListing documents from GET /proposals/scraped-grants.
const GOV_GRANT_TYPES = [
  { value: 'all', label: 'All Categories' },
  { value: 'research_grant', label: 'Research Grant' },
  { value: 'fellowship', label: 'Fellowship' },
  { value: 'startup_funding', label: 'Startup Funding' },
  { value: 'institutional_infra', label: 'Institutional Infra' },
  { value: 'facility_access', label: 'Facility Access' },
  { value: 'science_communication', label: 'Science Communication' },
  { value: 'academic_programme', label: 'Academic Programme' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'faculty_training', label: 'Faculty Training' },
  { value: 'student_competition_travel', label: 'Student Competition/Travel' },
  { value: 'institutional_recognition', label: 'Institutional Recognition' },
  { value: 'general_scheme', label: 'General Scheme' },
  { value: 'travel_grant', label: 'Travel Grant' },
  { value: 'other', label: 'Other' },
]

const GOV_STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'Open', label: 'Open' },
  { value: 'Closing Soon', label: 'Closing Soon' },
]

function formatGovGrantType(type) {
  if (!type || typeof type !== 'string') return ''
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatGovApplicantType(type) {
  if (!type || typeof type !== 'string') return ''
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const formatGrantDate = (dateValue) => {
  if (!dateValue) return '—'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return dateValue
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const daysUntil = (dateValue) => {
  if (!dateValue) return null
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return null
  const diffMs = d.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

const grantDocumentUrl = (doc) =>
  doc?.fileUrl ? `${api.defaults.baseURL?.replace(/\/api\/?$/, '') || ''}${doc.fileUrl}` : null

// ─── Pre-Submission Compliance Checklist Items ───
const COMPLIANCE_CHECKLIST_ITEMS = [
  {
    key: 'endorsementLetter',
    label: 'Institutional Endorsement Letter (Mandatory)',
    description: 'Official endorsement letter from Registrar / Dean of Research certifying institutional space, resources, and commitment.',
    mandatory: true,
  },
  {
    key: 'investigatorCvs',
    label: 'Investigator CVs & Publications (Annexure I)',
    description: 'Biographical sketches and citation metrics of Principal Investigator and Co-PIs matching funding agency format.',
    mandatory: false,
  },
  {
    key: 'ethicalClearance',
    label: 'Institutional Ethics Committee (IEC) Clearance',
    description: 'Ethics committee approval certificate or categorical exemption certificate for human/animal trials or bio-samples.',
    mandatory: false,
  },
  {
    key: 'biosafetyClearance',
    label: 'Institutional Biosafety / Radiation Safety Clearance',
    description: 'IBSC clearance or radiological authorization for recombinant DNA, pathogenic strains, or hazardous isotopes.',
    mandatory: false,
  },
  {
    key: 'financeAudit',
    label: 'Finance & Overhead Audit Certification',
    description: 'Internal audit verification confirming institutional overhead calculations (5%–15%), recurring expenses, and GST.',
    mandatory: false,
  },
  {
    key: 'conflictOfInterest',
    label: 'No-Conflict of Interest Certificate',
    description: 'Signed declaration by all investigators verifying zero personal, commercial, or financial conflict with funding agency.',
    mandatory: false,
  },
]

// ─── Post-Submission Proposal Tracking Stages (Lifecycle Pipeline) ───
const TRACKING_STAGES = [
  {
    key: 'Submitted to Agency',
    aliases: ['Submitted to Agency', 'Submitted', 'Submitted to Admin'],
    label: 'Submitted to Agency',
    icon: '🏛️',
    color: 'border-blue-300 bg-blue-50/70 text-blue-900',
    headerBadge: 'bg-blue-100 text-blue-800',
    description: 'Dispatched to funding agency or undergoing final clearance',
  },
  {
    key: 'Under Evaluation',
    aliases: ['Under Evaluation'],
    label: 'Under Evaluation',
    icon: '🔍',
    color: 'border-purple-300 bg-purple-50/70 text-purple-900',
    headerBadge: 'bg-purple-100 text-purple-800',
    description: 'Active peer review & scientific committee scoring',
  },
  {
    key: 'Revisions Requested',
    aliases: ['Revisions Requested'],
    label: 'Revisions / Query',
    icon: '⚠️',
    color: 'border-amber-300 bg-amber-50/70 text-amber-900',
    headerBadge: 'bg-amber-100 text-amber-800',
    description: 'Agency requested budget revisions, queries, or presentation',
  },
  {
    key: 'Awarded',
    aliases: ['Awarded', 'Accepted'],
    label: 'Awarded / Sanctioned',
    icon: '🏆',
    color: 'border-emerald-300 bg-emerald-50/70 text-emerald-900',
    headerBadge: 'bg-emerald-100 text-emerald-800',
    description: 'Grant sanctioned, award order issued & funds allocated',
  },
  {
    key: 'Rejected',
    aliases: ['Rejected'],
    label: 'Rejected / Archived',
    icon: '❌',
    color: 'border-rose-300 bg-rose-50/70 text-rose-900',
    headerBadge: 'bg-rose-100 text-rose-800',
    description: 'Not shortlisted or rejected during peer review',
  },
]

// ─── Government / Other Sources grant detail panel (mirrors GrantDiscoveryPage's
// GrantDetailPanel) — shown when an org admin clicks a card in that tab ───
function GovGrantDetailPanel({ grant, onClose, onApply, applyLoading, applySuccess, applyError }) {
  if (!grant) return null

  const canApply = grant.displayStatus === 'Open' && !grant.hasApplied && !applySuccess

  const handleApplyClick = () => {
    if (!window.confirm(`Start a proposal for "${grant.title}"? This will create a new 17-section proposal pre-filled with this grant's details.`)) return
    onApply(grant)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium overflow-hidden flex flex-col animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-warm-gray-50 hover:bg-warm-gray-100 flex items-center justify-center text-warm-gray-500 hover:text-warm-gray-700 transition-all duration-200 cursor-pointer"
          aria-label="Close grant details"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="overflow-y-auto p-7 flex-1">
          <div className="mb-5 pr-8">
            <div className="flex items-start gap-3 mb-2">
              <h2 className="font-heading text-xl font-bold text-warm-gray-900 leading-tight flex-1">
                {grant.title}
              </h2>
              <span
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${grant.displayStatus === 'Open'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : grant.displayStatus === 'Closing Soon'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                  }`}
              >
                {grant.displayStatus}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600">{grant.agencyName}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {grant.fundingDisplay && (
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Funding</p>
                <p className="text-base font-bold text-slate-900">{grant.fundingDisplay}</p>
              </div>
            )}
            {grant.deadlineDisplay && (
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Deadline</p>
                <p className="text-base font-bold text-slate-900">{grant.deadlineDisplay}</p>
              </div>
            )}
            {grant.durationDisplay && (
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Duration</p>
                <p className="text-base font-bold text-slate-900">{grant.durationDisplay}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-6">
            <span className="px-3 py-1.5 rounded-full bg-cream text-warm-gray-600 text-xs font-medium border border-warm-gray-200/60">
              {grant.categoryRaw || formatGovGrantType(grant.grantType)}
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-warm-gray-500 font-medium">Match</span>
              <div className="w-20 h-2 rounded-full bg-warm-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${grant.matchPercentage}%` }}
                />
              </div>
              <span className="text-sm font-bold text-primary min-w-[36px] text-right">
                {grant.matchPercentage}%
              </span>
            </div>
          </div>

          <div className="h-px bg-warm-gray-200/60 mb-5" />

          {grant.description && (
            <div className="mb-5">
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">Description</h3>
              <p className="text-sm text-warm-gray-600 leading-relaxed whitespace-pre-line">{grant.description}</p>
            </div>
          )}

          {grant.eligibilityText && (
            <div className="mb-5">
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">Eligibility</h3>
              <p className="text-sm text-warm-gray-600 leading-relaxed whitespace-pre-line">{grant.eligibilityText}</p>
            </div>
          )}

          {grant.applicationProcedure && (
            <div className="mb-5">
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">Application Procedure</h3>
              <p className="text-sm text-warm-gray-600 leading-relaxed whitespace-pre-line">{grant.applicationProcedure}</p>
            </div>
          )}

          {grant.focusAreas && grant.focusAreas.length > 0 && (
            <div className="mb-5">
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">Focus Areas</h3>
              <div className="flex flex-wrap gap-2">
                {grant.focusAreas.map((area, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-primary-50 text-primary text-xs font-medium border border-primary/15">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {grant.eligibleApplicantTypes && grant.eligibleApplicantTypes.length > 0 && (
            <div className="mb-5">
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">Eligible Applicants</h3>
              <div className="flex flex-wrap gap-2">
                {grant.eligibleApplicantTypes.map((type, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber text-xs font-medium border border-amber/15">
                    {formatGovApplicantType(type)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {applyError && (
          <div className="mx-7 mb-0 -mt-1 px-4 py-2.5 rounded-[10px] bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {applyError}
          </div>
        )}
        {applySuccess && (
          <div className="mx-7 mb-0 -mt-1 px-4 py-2.5 rounded-[10px] bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
            ✓ Proposal created successfully! Go to Proposal Management to continue working on it.
          </div>
        )}

        <div className="px-7 py-4 border-t border-warm-gray-200/60 bg-warm-gray-50/50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-3">
            {grant.infoUrl && (
              <a
                href={grant.infoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-surface-elevated border border-warm-gray-200 text-warm-gray-700 text-sm font-semibold hover:bg-warm-gray-50 transition-colors"
              >
                View Details
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
            {grant.guidelinesUrl && (
              <a
                href={grant.guidelinesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-surface-elevated border border-warm-gray-200 text-warm-gray-600 text-sm font-semibold hover:bg-warm-gray-50 transition-colors"
              >
                Guidelines
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>

          <div className="flex items-center gap-3">
            {(grant.hasApplied || applySuccess) && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Already Applied
              </span>
            )}
            {canApply && (
              <button
                onClick={handleApplyClick}
                disabled={applyLoading}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {applyLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    Apply for this Grant
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrgAdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()

  // Derive active section from URL path
  const VALID_SECTIONS = ['home', 'grants', 'proposals', 'tracking', 'team', 'deadlines', 'analytics']
  const pathSegment = location.pathname.replace(/^\/org\/dashboard\/?/, '').split('/')[0] || 'home'
  const activeSection = VALID_SECTIONS.includes(pathSegment) ? pathSegment : 'home'

  // Navigate to a section by updating the URL
  const navigateToSection = (section) => {
    const path = section === 'home' ? '/org/dashboard' : `/org/dashboard/${section}`
    navigate(path, { replace: false })
  }

  const [orgName, setOrgName] = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Executive Dynamic Dashboard state
  const [dashboardTimeFilter, setDashboardTimeFilter] = useState('all') // 'all' | '30d' | '90d' | 'ytd'
  const [pipelineFilterStage, setPipelineFilterStage] = useState('all') // 'all' | stage key
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('')
  const [deadlineUrgencyFilter, setDeadlineUrgencyFilter] = useState('all') // 'all' | 'critical' | 'upcoming'
  const [dashboardViewTab, setDashboardViewTab] = useState('pipeline') // 'pipeline' | 'agencies' | 'workload'
  const [dashboardAgencyFilter, setDashboardAgencyFilter] = useState('all') // 'all' | agency name

  // Team management state
  const [members, setMembers] = useState([])
  const [memberCounts, setMemberCounts] = useState({ total: 0, verified: 0, pending: 0 })
  const [membersLoading, setMembersLoading] = useState(false)
  const [taskModalMember, setTaskModalMember] = useState(null)
  const [viewTasksModalMember, setViewTasksModalMember] = useState(null)
  const [selectedViewGrantId, setSelectedViewGrantId] = useState('all')
  const [selectedTasks, setSelectedTasks] = useState([])
  const [actionLoading, setActionLoading] = useState('')

  // Proposal Management state
  const [orgProposals, setOrgProposals] = useState([])
  const [proposalsLoading, setProposalsLoading] = useState(false)
  const [selectedProposalId, setSelectedProposalId] = useState(null)
  const [createProposalModal, setCreateProposalModal] = useState(false)
  const [newProposalData, setNewProposalData] = useState({
    title: '',
    grantTitle: '',
    grantAgency: '',
    fundingAmount: '',
    deadline: '',
    grantProgramId: '',
  })
  const [proposalSubmitting, setProposalSubmitting] = useState(false)
  const [proposalCreateError, setProposalCreateError] = useState('')
  const [assigningSectionId, setAssigningSectionId] = useState('')
  const [showFullProposalModal, setShowFullProposalModal] = useState(false)
  const [pdfNotSubmittedMsg, setPdfNotSubmittedMsg] = useState(null)
  const [addSectionModalOpen, setAddSectionModalOpen] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newSectionWordLimit, setNewSectionWordLimit] = useState('500')
  const [sectionActionError, setSectionActionError] = useState('')
  const [deletingSectionId, setDeletingSectionId] = useState('')
  const [inviteCollaboratorModal, setInviteCollaboratorModal] = useState(false)
  const [collaboratorEmail, setCollaboratorEmail] = useState('')
  const [inviteCollaboratorLoading, setInviteCollaboratorLoading] = useState(false)

  // ─── Proposal Tracking Dashboard State (GUI 4) ───
  const [trackingView, setTrackingView] = useState('kanban') // 'kanban' | 'table'
  const [trackingSearch, setTrackingSearch] = useState('')
  const [trackingAgencyFilter, setTrackingAgencyFilter] = useState('all')
  const [trackingStageFilter, setTrackingStageFilter] = useState('all')
  const [statusChangeModal, setStatusChangeModal] = useState(null) // { proposal, newStatus, notes }
  const [awardModal, setAwardModal] = useState(null) // proposal
  const [awardForm, setAwardForm] = useState({
    sanctionOrderNumber: '',
    sanctionedAmount: '',
    startDate: '',
    durationMonths: 24,
    sanctionNotes: '',
  })
  const [pingPiModal, setPingPiModal] = useState(null) // proposal
  const [pingPiMessage, setPingPiMessage] = useState('')
  const [timelineModal, setTimelineModal] = useState(null) // proposal
  const [updatingTrackingStatus, setUpdatingTrackingStatus] = useState(false)

  // ─── Grant Discovery state ───
  // 'agency' tab: real data from GrantProgram via GET /proposals/open-grants
  const [grantSource, setGrantSource] = useState('agency') // 'agency' | 'scraped'
  const [openGrants, setOpenGrants] = useState([])
  const [grantsLoading, setGrantsLoading] = useState(false)
  const [grantSearch, setGrantSearch] = useState('')
  const [grantCategoryFilter, setGrantCategoryFilter] = useState('All Categories')
  const [grantFundingTypeFilter, setGrantFundingTypeFilter] = useState('All Types')
  const [viewAgencyGrant, setViewAgencyGrant] = useState(null) // grant whose agency popup is open
  const [viewGrantDetails, setViewGrantDetails] = useState(null) // grant whose details popup is open
  const [proposalManagementSearch, setProposalManagementSearch] = useState('')

  // 'scraped' tab (Government & Other Sources): real data via GET /org/grants/discover,
  // same endpoint and response shape as the standalone GrantDiscoveryPage.
  const [govGrants, setGovGrants] = useState([])
  const [govLoading, setGovLoading] = useState(false)
  const [govPagination, setGovPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [govSearch, setGovSearch] = useState('')
  const [govCategory, setGovCategory] = useState('all')
  const [govStatus, setGovStatus] = useState('all')
  const [selectedGovGrant, setSelectedGovGrant] = useState(null)
  const [govApplyLoading, setGovApplyLoading] = useState(false)
  const [govApplySuccess, setGovApplySuccess] = useState(false)
  const [govApplyError, setGovApplyError] = useState('')
  const govDebounceRef = useRef(null)

  // ─── Real-Time Deadline Alerts & Follow-up Scheduler States ───
  const [reminders, setReminders] = useState([])
  const [remindersLoading, setRemindersLoading] = useState(false)
  const [deadlineTab, setDeadlineTab] = useState('all') // 'all' | 'critical' | 'deadlines' | 'followups' | 'custom' | 'completed'
  const [deadlineSearch, setDeadlineSearch] = useState('')
  const [createReminderModal, setCreateReminderModal] = useState(false)
  const [reminderForm, setReminderForm] = useState({
    title: '',
    targetDate: '',
    proposalId: '',
    reminderType: 'internal_review',
    priority: 'high',
    notes: '',
    recipientName: '',
  })
  const [submittingReminder, setSubmittingReminder] = useState(false)
  const [followupLetterModal, setFollowupLetterModal] = useState(null) // proposal
  const [copiedLetter, setCopiedLetter] = useState(false)
  const [sendingEmailAlertId, setSendingEmailAlertId] = useState(null)

  const handleApproveAllSections = async () => {
    if (!selectedProposalObj) return
    try {
      setActionLoading(selectedProposalObj._id)
      const res = await api.put(`/proposals/${selectedProposalObj._id}/approve-all`)
      if (res.data.success) {
        fetchOrgProposals()
        setShowFullProposalModal(false)
      }
    } catch (err) {
      console.error('Failed to approve all sections:', err)
    } finally {
      setActionLoading('')
    }
  }

  const handleExportPDF = (proposal) => {
    if (!proposal) return

    if (!['Submitted to Admin', 'Submitted', 'Submitted to Agency', 'Under Evaluation', 'Revisions Requested', 'Awarded', 'Accepted'].includes(proposal.status)) {
      alert('Cannot export: The proposal must be submitted before generating an official dossier PDF.')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to export proposal as PDF.')
      return
    }

    const sectionsHtml = (proposal.sections || [])
      .map((sec) => `
        <div style="margin-bottom: 28px; page-break-inside: avoid;">
          <div style="border-bottom: 2px solid #6b21a8; padding-bottom: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="color: #3b0764; font-size: 15px; font-weight: bold; margin: 0;">${sec.title}</h2>
            <span style="font-size: 11px; color: #6b7280; font-weight: 600;">Writer: ${sec.assignedToName || 'Unassigned'} | Status: ${sec.status}</span>
          </div>
          <div style="font-size: 13px; line-height: 1.7; color: #1f2937; white-space: pre-wrap; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fafafa; padding: 12px; border-radius: 6px; border: 1px solid #f3f4f6;">
            ${sec.content ? sec.content.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<em style="color: #9ca3af;">[Section content pending]</em>'}
          </div>
        </div>
      `)
      .join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${proposal.title} - Research Proposal</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Georgia', 'Times New Roman', serif; color: #111827; margin: 0; padding: 20px; }
            .cover-page { text-align: center; padding: 50px 20px; border-bottom: 3px double #1e1b4b; margin-bottom: 35px; }
            .org-badge { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2.5px; color: #4338ca; margin-bottom: 12px; font-family: sans-serif; }
            .proposal-title { font-size: 26px; font-weight: bold; color: #0f172a; margin-bottom: 20px; line-height: 1.35; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 650px; margin: 25px auto 0 auto; text-align: left; background: #f8fafc; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12.5px; font-family: sans-serif; }
            .meta-label { font-weight: bold; color: #475569; }
            .meta-val { color: #0f172a; }
            .header-info { display: flex; justify-content: space-between; font-size: 10.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 30px; font-family: sans-serif; }
            @media print { .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background: #1e1b4b; color: white; border: none; padding: 10px 22px; font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              📥 Save / Print as PDF
            </button>
          </div>

          <div class="cover-page">
            <div class="proposal-title">${proposal.title}</div>
            
            <div class="meta-grid">
              <div><span class="meta-label">Funding Agency:</span> <span class="meta-val">${proposal.grantAgency || 'N/A'}</span></div>
              <div><span class="meta-label">Grant Scheme:</span> <span class="meta-val">${proposal.grantTitle || 'N/A'}</span></div>
              <div><span class="meta-label">Funding Requested:</span> <span class="meta-val">${proposal.fundingAmount || 'N/A'}</span></div>
              <div><span class="meta-label">Submission Deadline:</span> <span class="meta-val">${proposal.deadline || 'N/A'}</span></div>
              <div><span class="meta-label">Total Sections:</span> <span class="meta-val">${proposal.sections?.length || 17} Sections</span></div>
              <div><span class="meta-label">Date of Submission:</span> <span class="meta-val">${new Date().toLocaleDateString()}</span></div>
            </div>
          </div>

        

          ${sectionsHtml}

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  const [orgId, setOrgId] = useState('')
  const [liveToast, setLiveToast] = useState(null)
  const [submitAgencyModal, setSubmitAgencyModal] = useState(false)
  const [agencySubmissionData, setAgencySubmissionData] = useState({
    agencySubmissionId: '',
    receiptNote: '',
  })
  const [submittingAgency, setSubmittingAgency] = useState(false)

  // ─── External Grant "Mark as Applied" Modal State ───
  const [externalSubmitModal, setExternalSubmitModal] = useState(false)
  const [externalSubmitData, setExternalSubmitData] = useState({
    externalReferenceId: '',
    portalName: '',
    notes: '',
  })
  const [submittingExternal, setSubmittingExternal] = useState(false)

  const [updatingChecklistKey, setUpdatingChecklistKey] = useState('')

  const showToast = (message) => {
    setLiveToast(message)
    setTimeout(() => {
      setLiveToast((prev) => (prev === message ? null : prev))
    }, 4500)
  }

  const handleToggleChecklist = async (proposalId, itemKey) => {
    const prop = orgProposals.find((p) => p._id === proposalId)
    if (!prop) return
    const currentVal = Boolean(prop.preSubmissionChecklist?.[itemKey])
    setUpdatingChecklistKey(itemKey)
    try {
      const res = await api.put(`/proposals/${proposalId}/checklist`, {
        [itemKey]: !currentVal,
      })
      if (res.data.success) {
        setOrgProposals((prev) =>
          prev.map((p) => (p._id === proposalId ? { ...p, preSubmissionChecklist: res.data.checklist } : p))
        )
      }
    } catch (err) {
      console.error('Failed to update checklist:', err)
      alert(err.response?.data?.message || 'Failed to update checklist item')
    } finally {
      setUpdatingChecklistKey('')
    }
  }

  const handleSubmitToAgency = async (e) => {
    e.preventDefault()
    if (!selectedProposalObj) return
    if (!agencySubmissionData.agencySubmissionId.trim()) {
      alert('Please enter the Official Agency Reference / Confirmation ID.')
      return
    }
    try {
      setSubmittingAgency(true)
      const res = await api.put(`/proposals/${selectedProposalObj._id}/submit-agency`, {
        agencySubmissionId: agencySubmissionData.agencySubmissionId.trim(),
        receiptNote: agencySubmissionData.receiptNote.trim(),
      })
      if (res.data.success) {
        setOrgProposals((prev) =>
          prev.map((p) => (p._id === selectedProposalObj._id ? res.data.proposal : p))
        )
        setSubmitAgencyModal(false)
        setAgencySubmissionData({ agencySubmissionId: '', receiptNote: '' })
        showToast('🏛️ Proposal officially submitted to Funding Agency!')
      }
    } catch (err) {
      console.error('Agency submission failed:', err)
      alert(err.response?.data?.message || 'Failed to submit proposal to agency')
    } finally {
      setSubmittingAgency(false)
    }
  }

  // ─── Mark External Grant as Applied Externally ───
  const handleMarkAppliedExternally = async (e) => {
    e.preventDefault()
    if (!selectedProposalObj) return
    if (!externalSubmitData.externalReferenceId.trim()) {
      alert('Please enter the External Reference / Confirmation ID.')
      return
    }
    try {
      setSubmittingExternal(true)
      const res = await api.put(`/proposals/${selectedProposalObj._id}/mark-applied-externally`, {
        externalReferenceId: externalSubmitData.externalReferenceId.trim(),
        portalName: externalSubmitData.portalName.trim(),
        notes: externalSubmitData.notes.trim(),
      })
      if (res.data.success) {
        setOrgProposals((prev) =>
          prev.map((p) => (p._id === selectedProposalObj._id ? res.data.proposal : p))
        )
        setExternalSubmitModal(false)
        setExternalSubmitData({ externalReferenceId: '', portalName: '', notes: '' })
        showToast('🏛️ Proposal marked as applied on external government portal!')
      }
    } catch (err) {
      console.error('External submission marking failed:', err)
      alert(err.response?.data?.message || 'Failed to mark proposal as applied externally')
    } finally {
      setSubmittingExternal(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/auth/me')
        if (res.data.success) {
          setUserName(res.data.user.fullName)
          if (res.data.orgStatus) {
            setOrgName(res.data.orgStatus.organizationName)
          }
          const detectedOrgId = res.data.user.organization || res.data.orgStatus?.organizationId || ''
          if (detectedOrgId) {
            setOrgId(detectedOrgId.toString())
          }
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // ─── Real-Time Live Updates via Socket.io for Org Admin ───
  useEffect(() => {
    if (!orgId) return

    joinOrgRoom(orgId)

    const handleSectionUpdate = (data) => {
      if (!data || !data.proposalId) return
      setOrgProposals((prev) =>
        prev.map((p) => {
          if (p._id === data.proposalId) {
            const updatedSections = p.sections.map((s) =>
              s._id === data.sectionId ? { ...s, ...data.section } : s
            )
            return {
              ...p,
              progress: data.progress !== undefined ? data.progress : p.progress,
              sections: updatedSections,
            }
          }
          return p
        })
      )
      if (data.section?.title && data.section?.status) {
        showToast(`⚡ Section "${data.section.title}" updated to "${data.section.status}"`)
      }
    }

    const handleAllApproved = (data) => {
      if (!data || !data.proposalId) return
      setOrgProposals((prev) =>
        prev.map((p) => {
          if (p._id === data.proposalId) {
            return {
              ...p,
              progress: 100,
              status: data.status || 'Under Review',
              sections: p.sections.map((s) => ({ ...s, status: 'Approved' })),
            }
          }
          return p
        })
      )
      showToast(`🎉 All 17 sections have been approved by Principal Investigator!`)
    }

    const handleSubmittedToAdmin = (data) => {
      if (!data || !data.proposalId) return
      setOrgProposals((prev) =>
        prev.map((p) => {
          if (p._id === data.proposalId) {
            return {
              ...p,
              status: 'Submitted to Admin',
              submittedByPIAt: data.submittedByPIAt || new Date(),
            }
          }
          return p
        })
      )
      showToast(`🚀 Final proposal successfully submitted by PI! PDF Export and Checklist are now unlocked.`)
    }

    const handleChecklistUpdated = (data) => {
      if (!data || !data.proposalId) return
      setOrgProposals((prev) =>
        prev.map((p) => {
          if (p._id === data.proposalId) {
            return {
              ...p,
              preSubmissionChecklist: data.checklist,
            }
          }
          return p
        })
      )
    }

    const handleSubmittedToAgency = (data) => {
      if (!data || !data.proposalId) return
      setOrgProposals((prev) =>
        prev.map((p) => {
          if (p._id === data.proposalId) {
            return {
              ...p,
              status: 'Submitted to Agency',
              agencySubmission: data.agencySubmission,
            }
          }
          return p
        })
      )
      showToast(`🏛️ Proposal officially submitted to ${data.agencySubmission?.agencySubmissionId || 'Funding Agency'}!`)
    }

    const handleSectionsAssigned = (data) => {
      if (!data || !data.proposalId || !data.proposal) return
      setOrgProposals((prev) =>
        prev.map((p) => (p._id === data.proposalId ? { ...p, ...data.proposal } : p))
      )
    }

    const handleTrackingStatusUpdated = (data) => {
      if (!data || !data.proposalId) return
      setOrgProposals((prev) =>
        prev.map((p) => {
          if (p._id === data.proposalId) {
            return {
              ...p,
              status: data.status,
              awardDetails: data.awardDetails || p.awardDetails,
              trackingTimeline: data.trackingTimeline || p.trackingTimeline,
            }
          }
          return p
        })
      )
      showToast(`📊 Proposal status updated to "${data.status}"`)
    }

    const handleReminderCreated = (data) => {
      if (data?.reminder) {
        setReminders((prev) => [data.reminder, ...prev.filter((r) => r._id !== data.reminder._id)])
        showToast(`🔔 New Reminder: "${data.reminder.title}"`)
      }
    }
    const handleReminderUpdated = (data) => {
      if (data?.reminder) {
        setReminders((prev) => prev.map((r) => (r._id === data.reminder._id ? data.reminder : r)))
      }
    }
    const handleReminderDeleted = (data) => {
      if (data?.reminderId) {
        setReminders((prev) => prev.filter((r) => r._id !== data.reminderId))
      }
    }

    const handleDeadlineAlertEmailSent = (data) => {
      if (data?.proposalTitle) {
        showToast(`📧 Critical deadline email dispatched to ${data.recipientName || 'PI'}`)
      }
    }

    socket.on('proposalSectionUpdated', handleSectionUpdate)
    socket.on('proposalAllSectionsApproved', handleAllApproved)
    socket.on('proposalSubmittedToAdmin', handleSubmittedToAdmin)
    socket.on('proposalChecklistUpdated', handleChecklistUpdated)
    socket.on('proposalSubmittedToAgency', handleSubmittedToAgency)
    socket.on('proposalSectionsAssigned', handleSectionsAssigned)
    socket.on('proposalTrackingStatusUpdated', handleTrackingStatusUpdated)
    socket.on('reminderCreated', handleReminderCreated)
    socket.on('reminderUpdated', handleReminderUpdated)
    socket.on('reminderDeleted', handleReminderDeleted)
    socket.on('deadlineAlertEmailSent', handleDeadlineAlertEmailSent)

    return () => {
      leaveOrgRoom(orgId)
      socket.off('proposalSectionUpdated', handleSectionUpdate)
      socket.off('proposalAllSectionsApproved', handleAllApproved)
      socket.off('proposalSubmittedToAdmin', handleSubmittedToAdmin)
      socket.off('proposalChecklistUpdated', handleChecklistUpdated)
      socket.off('proposalSubmittedToAgency', handleSubmittedToAgency)
      socket.off('proposalSectionsAssigned', handleSectionsAssigned)
      socket.off('proposalTrackingStatusUpdated', handleTrackingStatusUpdated)
      socket.off('reminderCreated', handleReminderCreated)
      socket.off('reminderUpdated', handleReminderUpdated)
      socket.off('reminderDeleted', handleReminderDeleted)
      socket.off('deadlineAlertEmailSent', handleDeadlineAlertEmailSent)
    }
  }, [orgId])

  // Fetch members, proposals, and reminders when sections are active
  useEffect(() => {
    if (activeSection === 'team' || activeSection === 'home' || activeSection === 'proposals' || activeSection === 'tracking' || activeSection === 'analytics') {
      fetchMembers()
    }
    if (activeSection === 'proposals' || activeSection === 'home' || activeSection === 'team' || activeSection === 'tracking' || activeSection === 'deadlines' || activeSection === 'analytics') {
      fetchOrgProposals()
    }
    if (activeSection === 'deadlines' || activeSection === 'home' || activeSection === 'analytics') {
      fetchReminders()
    }
    if (activeSection === 'grants' || activeSection === 'home') {
      fetchOpenGrants()
    }
  }, [activeSection])

  // Debounced fetch for the Government & Other Sources tab — mirrors the
  // standalone GrantDiscoveryPage's debounced search/filter behavior.
  useEffect(() => {
    if (activeSection !== 'grants' || grantSource !== 'scraped') return
    if (govDebounceRef.current) clearTimeout(govDebounceRef.current)
    govDebounceRef.current = setTimeout(() => {
      fetchGovGrants(1)
    }, govSearch ? 300 : 0)
    return () => {
      if (govDebounceRef.current) clearTimeout(govDebounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, grantSource, govSearch, govCategory, govStatus])

  const fetchMembers = async () => {
    setMembersLoading(true)
    try {
      const res = await api.get('/member/list')
      if (res.data.success) {
        setMembers(res.data.members)
        setMemberCounts(res.data.counts)
      }
    } catch (err) {
      console.error('Failed to fetch members:', err)
    } finally {
      setMembersLoading(false)
    }
  }

  const fetchOrgProposals = async () => {
    setProposalsLoading(true)
    try {
      const res = await api.get('/proposals/org-proposals')
      if (res.data.success && res.data.proposals) {
        setOrgProposals(res.data.proposals)
        if (res.data.proposals.length > 0 && !selectedProposalId) {
          setSelectedProposalId(res.data.proposals[0]._id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch org proposals:', err)
    } finally {
      setProposalsLoading(false)
    }
  }

  // Real open grant calls — Active, non-deleted, from approved funding agencies.
  const fetchOpenGrants = async () => {
    setGrantsLoading(true)
    try {
      const res = await api.get('/proposals/open-grants')
      if (res.data.success) {
        setOpenGrants(res.data.programs || [])
      }
    } catch (err) {
      console.error('Failed to fetch open grants:', err)
    } finally {
      setGrantsLoading(false)
    }
  }

  // Government & Other Sources — real scraped grant discovery via the same
  // endpoint and response contract as the standalone GrantDiscoveryPage.
  const fetchGovGrants = async (page = 1) => {
    setGovLoading(true)
    try {
      const params = { page, limit: 20, govPage: page }
      if (govSearch.trim()) params.search = govSearch.trim()
      if (govCategory !== 'all') params.category = govCategory
      if (govStatus !== 'all') params.status = govStatus

      const res = await api.get('/org/grants/discover', { params })
      if (res.data && res.data.success) {
        const govData = res.data.government || {}
        const grantsList = Array.isArray(govData.grants)
          ? govData.grants
          : (Array.isArray(res.data.grants) ? res.data.grants : [])
        const total = govData.total ?? res.data.pagination?.total ?? grantsList.length
        const totalPages = govData.totalPages ?? res.data.pagination?.totalPages ?? Math.max(1, Math.ceil(total / 20))
        const currentPage = govData.page ?? res.data.pagination?.page ?? page

        setGovGrants(grantsList)
        setGovPagination({
          page: currentPage,
          limit: res.data.pagination?.limit || 20,
          total,
          totalPages,
        })
      } else {
        setGovGrants([])
      }
    } catch (err) {
      console.error('Failed to fetch government grants:', err)
      setGovGrants([])
    } finally {
      setGovLoading(false)
    }
  }

  const handleApplyForGovGrant = async (grant) => {
    setGovApplyLoading(true)
    setGovApplyError('')
    setGovApplySuccess(false)
    try {
      const res = await api.post('/proposals/create', {
        title: `Proposal: ${grant.title}`,
        grantTitle: grant.title,
        grantAgency: grant.agencyName,
        fundingAmount: grant.fundingDisplay || '',
        deadline: grant.deadlineDisplay || '',
        grantListingId: grant._id,
      })
      if (res.data.success) {
        setGovApplySuccess(true)
        setGovGrants((prev) => (Array.isArray(prev) ? prev.map((g) => (g._id === grant._id ? { ...g, hasApplied: true } : g)) : []))
        setSelectedGovGrant((prev) => (prev ? { ...prev, hasApplied: true } : prev))
        fetchOrgProposals()
      }
    } catch (err) {
      setGovApplyError(err.response?.data?.message || 'Failed to create proposal. Please try again.')
    } finally {
      setGovApplyLoading(false)
    }
  }

  const handleSelectGovGrant = (grant) => {
    setSelectedGovGrant(grant)
    setGovApplyLoading(false)
    setGovApplySuccess(false)
    setGovApplyError('')
  }

  const handleCloseGovPanel = () => {
    setSelectedGovGrant(null)
    setGovApplyLoading(false)
    setGovApplySuccess(false)
    setGovApplyError('')
  }

  const fetchReminders = async () => {
    setRemindersLoading(true)
    try {
      const res = await api.get('/reminders')
      if (res.data.success && res.data.reminders) {
        setReminders(res.data.reminders)
      }
    } catch (err) {
      console.error('Failed to fetch reminders:', err)
    } finally {
      setRemindersLoading(false)
    }
  }

  const handleCreateReminder = async (e) => {
    e.preventDefault()
    if (!reminderForm.title.trim() || !reminderForm.targetDate) {
      alert('Please provide a title and target date for the reminder.')
      return
    }
    setSubmittingReminder(true)
    try {
      const res = await api.post('/reminders', reminderForm)
      if (res.data.success && res.data.reminder) {
        setReminders((prev) => [res.data.reminder, ...prev.filter((r) => r._id !== res.data.reminder._id)])
        setCreateReminderModal(false)
        setReminderForm({
          title: '',
          targetDate: '',
          proposalId: '',
          reminderType: 'internal_review',
          priority: 'high',
          notes: '',
          recipientName: '',
        })
        showToast('✓ Reminder scheduled successfully')
      }
    } catch (err) {
      console.error('Failed to create reminder:', err)
      alert(err.response?.data?.message || 'Failed to schedule reminder')
    } finally {
      setSubmittingReminder(false)
    }
  }

  const handleToggleReminder = async (reminderId) => {
    try {
      const res = await api.put(`/reminders/${reminderId}/toggle`)
      if (res.data.success && res.data.reminder) {
        setReminders((prev) => prev.map((r) => (r._id === reminderId ? res.data.reminder : r)))
        showToast(res.data.reminder.isCompleted ? '✓ Reminder marked completed' : 'Reminder reopened')
      }
    } catch (err) {
      console.error('Failed to toggle reminder:', err)
    }
  }

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Delete this scheduled reminder?')) return
    try {
      const res = await api.delete(`/reminders/${reminderId}`)
      if (res.data.success) {
        setReminders((prev) => prev.filter((r) => r._id !== reminderId))
        showToast('Reminder deleted')
      }
    } catch (err) {
      console.error('Failed to delete reminder:', err)
    }
  }

  const handleSendDeadlineEmailAlert = async (proposalId, proposalTitle) => {
    try {
      setSendingEmailAlertId(proposalId)
      const res = await api.post(`/reminders/proposals/${proposalId}/send-email-alert`)
      if (res.data.success) {
        showToast(`📧 Critical deadline alert email sent to ${res.data.recipientName || 'PI'} (${res.data.recipientEmail})`)
      }
    } catch (err) {
      console.error('Failed to send deadline email alert:', err)
      alert(err.response?.data?.message || 'Failed to dispatch email alert')
    } finally {
      setSendingEmailAlertId(null)
    }
  }

  const handleInviteCollaborator = async (e) => {
    e.preventDefault()
    if (!collaboratorEmail || !selectedProposalId) return
    setInviteCollaboratorLoading(true)
    try {
      const res = await api.post(`/proposals/${selectedProposalId}/collaborators`, { email: collaboratorEmail })
      if (res.data.success) {
        setInviteCollaboratorModal(false)
        setCollaboratorEmail('')
        setOrgProposals((prev) =>
          prev.map((p) => (p._id === selectedProposalId ? res.data.proposal : p))
        )
      }
    } catch (err) {
      console.error('Error inviting collaborator:', err)
      alert(err.response?.data?.message || 'Failed to invite collaborator')
    } finally {
      setInviteCollaboratorLoading(false)
    }
  }

  const handleCreateProposal = async (e) => {
    e.preventDefault()
    if (!newProposalData.title.trim()) return
    setProposalCreateError('')
    setProposalSubmitting(true)
    try {
      const res = await api.post('/proposals/create', newProposalData)
      if (res.data.success) {
        setCreateProposalModal(false)
        setNewProposalData({ title: '', grantTitle: '', grantAgency: '', fundingAmount: '', deadline: '', grantProgramId: '' })
        fetchOrgProposals()
      }
    } catch (err) {
      console.error('Create proposal error:', err)
      setProposalCreateError(err.response?.data?.message || 'Failed to create proposal.')
    } finally {
      setProposalSubmitting(false)
    }
  }

  // Pre-fills the create-proposal form from a specific agency-created grant
  // call and opens the modal — this is the "Write Proposal" entry point from
  // a Grant Discovery card (GrantOS Funding Agencies tab). grantProgramId is
  // set, so createProposal on the backend links + eligibility-checks it, and
  // this proposal will later be submittable to that agency.
  const handleStartProposalForGrant = (grant) => {
    setProposalCreateError('')
    setNewProposalData({
      title: `${grant.title} — Proposal`,
      grantTitle: grant.title,
      grantAgency: grant.fundingAgency?.agencyName || '',
      fundingAmount: grant.budget || '',
      deadline: grant.deadline ? new Date(grant.deadline).toISOString().split('T')[0] : '',
      grantProgramId: grant._id,
    })
    setCreateProposalModal(true)
  }

  const handleAssignSectionMember = async (proposalId, sectionId, memberId, memberName) => {
    setAssigningSectionId(sectionId)
    try {
      const res = await api.put(`/proposals/${proposalId}/sections/${sectionId}/assign`, {
        assignedTo: memberId,
        assignedToName: memberName,
      })
      if (res.data.success) {
        setOrgProposals((prev) =>
          prev.map((p) => (p._id === proposalId ? res.data.proposal : p))
        )
      }
    } catch (err) {
      console.error('Section assignment error:', err)
    } finally {
      setAssigningSectionId('')
    }
  }

  const handleAddSection = async (e) => {
    e.preventDefault()
    if (!selectedProposalObj || !newSectionTitle.trim()) return
    setSectionActionError('')
    try {
      const res = await api.post(`/proposals/${selectedProposalObj._id}/sections`, {
        title: newSectionTitle,
        wordCountLimit: Number(newSectionWordLimit) || 500,
      })
      if (res.data.success) {
        setOrgProposals((prev) => prev.map((p) => (p._id === selectedProposalObj._id ? res.data.proposal : p)))
        setAddSectionModalOpen(false)
        setNewSectionTitle('')
        setNewSectionWordLimit('500')
      }
    } catch (err) {
      setSectionActionError(err.response?.data?.message || 'Failed to add section.')
    }
  }

  const handleDeleteSection = async (sectionId, sectionTitle) => {
    if (!selectedProposalObj) return
    if (!window.confirm(`Remove section "${sectionTitle}" from this proposal?`)) return
    setDeletingSectionId(sectionId)
    try {
      const res = await api.delete(`/proposals/${selectedProposalObj._id}/sections/${sectionId}`)
      if (res.data.success) {
        setOrgProposals((prev) => prev.map((p) => (p._id === selectedProposalObj._id ? res.data.proposal : p)))
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove section.')
    } finally {
      setDeletingSectionId('')
    }
  }

  const handleAutoAssignByRolePresets = async (proposalId) => {
    const activeProp = orgProposals.find((p) => p._id === proposalId)
    if (!activeProp || members.length === 0) return

    const findMember = (keywords) => {
      return members.find((m) => {
        const text = (m.fullName + ' ' + (m.jobTitle || '')).toLowerCase()
        return keywords.some((k) => text.includes(k))
      })
    }

    const piMember = findMember(['investigator', 'pi', 'lead', 'director', 'professor']) || members[0]
    const researcherMember = findMember(['researcher', 'research', 'scientist', 'fellow']) || members[1] || members[0]
    const financeMember = findMember(['finance', 'budget', 'treasury', 'admin']) || members[2] || members[0]
    const complianceMember = findMember(['compliance', 'legal', 'regulatory', 'coordinator']) || members[3] || members[0]

    const assignmentsMap = {
      sec_1: piMember,
      sec_2: piMember,
      sec_3: piMember,
      sec_6: piMember,
      sec_11: piMember,
      sec_16: piMember,

      sec_4: researcherMember,
      sec_5: researcherMember,
      sec_7: researcherMember,
      sec_9: researcherMember,
      sec_17: researcherMember,

      sec_14: financeMember,
      sec_15: financeMember,

      sec_8: complianceMember,
      sec_10: complianceMember,
      sec_12: complianceMember,
      sec_13: complianceMember,
    }

    const assignments = activeProp.sections.map((sec) => {
      const assignedUser = assignmentsMap[sec.sectionKey] || piMember
      return {
        sectionId: sec._id,
        assignedTo: assignedUser._id,
        assignedToName: assignedUser.fullName,
      }
    })

    try {
      const res = await api.put(`/proposals/${proposalId}/bulk-assign`, { assignments })
      if (res.data.success) {
        setOrgProposals((prev) =>
          prev.map((p) => (p._id === proposalId ? res.data.proposal : p))
        )
      }
    } catch (err) {
      console.error('Auto assign error:', err)
    }
  }

  const handleDeleteProposal = async (proposalId) => {
    if (!window.confirm('Are you sure you want to delete this proposal?')) return
    try {
      const res = await api.delete(`/proposals/${proposalId}`)
      if (res.data.success) {
        setOrgProposals((prev) => prev.filter((p) => p._id !== proposalId))
        setSelectedProposalId(null)
        fetchOrgProposals()
      }
    } catch (err) {
      console.error('Delete proposal error:', err)
    }
  }

  const handleVerifyMember = async (memberId) => {
    setActionLoading(memberId)
    try {
      const res = await api.put(`/member/${memberId}/verify`)
      if (res.data.success) {
        fetchMembers()
      }
    } catch (err) {
      console.error('Verify error:', err)
    } finally {
      setActionLoading('')
    }
  }

  const handleRejectMember = async (memberId) => {
    setActionLoading(memberId)
    try {
      const res = await api.delete(`/member/${memberId}/reject`)
      if (res.data.success) {
        fetchMembers()
      }
    } catch (err) {
      console.error('Reject error:', err)
    } finally {
      setActionLoading('')
    }
  }

  const ROLE_PRESETS = {
    'Principal Investigator': ['proposal_writing', 'grant_discovery'],
    'Senior Researcher': ['proposal_writing'],
    'Finance Manager': ['proposal_writing'],
    'Compliance Manager': ['proposal_writing'],
  }

  const openTaskModal = (member) => {
    setTaskModalMember(member)
    if (member.assignedTasks && member.assignedTasks.length > 0) {
      const cleanTasks = member.assignedTasks.filter((t) => t === 'proposal_writing' || t === 'grant_discovery')
      setSelectedTasks(cleanTasks.length > 0 ? cleanTasks : ['proposal_writing'])
    } else {
      const searchKey = (member.jobTitle || member.fullName || '').toLowerCase()
      if (searchKey.includes('investigator') || searchKey.includes('pi') || searchKey.includes('lead') || searchKey.includes('director')) {
        setSelectedTasks(['proposal_writing', 'grant_discovery'])
      } else {
        setSelectedTasks(['proposal_writing'])
      }
    }
  }

  const openViewTasksModal = (member) => {
    setViewTasksModalMember(member)
    setSelectedViewGrantId('all')
    if (orgProposals.length === 0) {
      fetchOrgProposals()
    }
  }

  const getMemberAssignedProposals = (memberId, memberName) => {
    if (!orgProposals || orgProposals.length === 0) return []
    return orgProposals
      .map((proposal) => {
        const assignedSections = (proposal.sections || []).filter((sec) => {
          if (!sec.assignedTo && !sec.assignedToName) return false
          const matchId =
            sec.assignedTo === memberId ||
            sec.assignedTo?._id === memberId ||
            (typeof sec.assignedTo === 'string' && sec.assignedTo === memberId?.toString())
          const matchName =
            sec.assignedToName &&
            memberName &&
            sec.assignedToName.trim().toLowerCase() === memberName.trim().toLowerCase()
          return matchId || matchName
        })

        if (assignedSections.length > 0) {
          return {
            proposalId: proposal._id,
            title: proposal.title,
            grantTitle: proposal.grantTitle,
            grantAgency: proposal.grantAgency,
            fundingAmount: proposal.fundingAmount,
            deadline: proposal.deadline,
            sections: assignedSections,
          }
        }
        return null
      })
      .filter(Boolean)
  }

  const applyRolePreset = (presetName) => {
    if (ROLE_PRESETS[presetName]) {
      setSelectedTasks(ROLE_PRESETS[presetName])
    }
  }

  const toggleTask = (taskKey) => {
    setSelectedTasks((prev) =>
      prev.includes(taskKey)
        ? prev.filter((t) => t !== taskKey)
        : [...prev, taskKey]
    )
  }

  const handleAssignTasks = async () => {
    if (!taskModalMember) return
    setActionLoading(taskModalMember._id)
    try {
      const res = await api.put(`/member/${taskModalMember._id}/assign-task`, {
        tasks: selectedTasks,
      })
      if (res.data.success) {
        setTaskModalMember(null)
        fetchMembers()
      }
    } catch (err) {
      console.error('Assign task error:', err)
    } finally {
      setActionLoading('')
    }
  }

  // ─── Proposal Tracking Helper Handlers (GUI 4) ───
  const handleOpenStatusChange = (proposal, targetStatus) => {
    if (targetStatus === 'Awarded') {
      setAwardForm({
        sanctionOrderNumber: proposal.awardDetails?.sanctionOrderNumber || `SAN/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
        sanctionedAmount: proposal.awardDetails?.sanctionedAmount || proposal.fundingAmount || '',
        startDate: proposal.awardDetails?.startDate ? new Date(proposal.awardDetails.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        durationMonths: proposal.awardDetails?.durationMonths || 24,
        sanctionNotes: proposal.awardDetails?.sanctionNotes || '',
      })
      setAwardModal(proposal)
      return
    }
    setStatusChangeModal({
      proposal,
      newStatus: targetStatus || proposal.status,
      notes: '',
    })
  }

  const handleConfirmStatusChange = async () => {
    if (!statusChangeModal) return
    const { proposal, newStatus, notes } = statusChangeModal
    try {
      setUpdatingTrackingStatus(true)
      const res = await api.put(`/proposals/${proposal._id}/tracking-status`, {
        status: newStatus,
        notes,
      })
      if (res.data.success) {
        setOrgProposals((prev) =>
          prev.map((p) => (p._id === proposal._id ? res.data.proposal : p))
        )
        setStatusChangeModal(null)
      }
    } catch (err) {
      console.error('Failed to update tracking status:', err)
      alert(err.response?.data?.message || 'Failed to update tracking status')
    } finally {
      setUpdatingTrackingStatus(false)
    }
  }

  const handleConfirmAward = async (e) => {
    e.preventDefault()
    if (!awardModal) return
    try {
      setUpdatingTrackingStatus(true)
      const res = await api.put(`/proposals/${awardModal._id}/tracking-status`, {
        status: 'Awarded',
        notes: `Sanction Order #${awardForm.sanctionOrderNumber} granted for ${awardForm.sanctionedAmount}`,
        awardDetails: awardForm,
      })
      if (res.data.success) {
        setOrgProposals((prev) =>
          prev.map((p) => (p._id === awardModal._id ? res.data.proposal : p))
        )
        setAwardModal(null)
        alert(`🏆 Congratulations! Proposal officially marked as Awarded under Sanction Order #${awardForm.sanctionOrderNumber}!`)
      }
    } catch (err) {
      console.error('Failed to record award:', err)
      alert(err.response?.data?.message || 'Failed to record award')
    } finally {
      setUpdatingTrackingStatus(false)
    }
  }

  const handleSendPingPi = async (e) => {
    e.preventDefault()
    if (!pingPiModal || !pingPiMessage.trim()) return
    try {
      setUpdatingTrackingStatus(true)
      const res = await api.post(`/proposals/${pingPiModal._id}/comments`, {
        text: `📢 Note from Org Admin: ${pingPiMessage.trim()}`,
      })
      if (res.data.success) {
        setPingPiModal(null)
        setPingPiMessage('')
        alert('💬 Note sent to PI and team chat successfully!')
      }
    } catch (err) {
      console.error('Failed to send note to PI:', err)
      alert(err.response?.data?.message || 'Failed to send note')
    } finally {
      setUpdatingTrackingStatus(false)
    }
  }

  // Currency parser
  const parseAmountToNumber = (amtStr) => {
    if (!amtStr) return 0
    const str = amtStr.toString().toLowerCase()
    const clean = str.replace(/[₹$,]/g, '').trim()
    const num = parseFloat(clean)
    if (isNaN(num)) return 0
    if (str.includes('cr') || str.includes('crore')) return num * 10000000
    if (str.includes('lakh') || str.includes('lac') || str.includes('l')) return num * 100000
    return num
  }

  const formatCurrency = (val) => {
    if (!val || val === 0) return '₹0'
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakhs`
    return `₹${val.toLocaleString('en-IN')}`
  }

  const getProposalReviewTimeline = (proposal) => {
    const subDate = proposal.agencySubmission?.submittedAt || proposal.updatedAt
    const daysElapsed = subDate ? Math.max(0, Math.floor((Date.now() - new Date(subDate).getTime()) / (1000 * 60 * 60 * 24))) : 0

    if (['Awarded', 'Accepted'].includes(proposal.status)) {
      return { daysElapsed, flag: 'awarded', label: '🏆 Awarded', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    }
    if (proposal.status === 'Rejected') {
      return { daysElapsed, flag: 'closed', label: '❌ Decided', color: 'bg-warm-gray-100 text-warm-gray-600 border-warm-gray-200' }
    }
    if (proposal.status === 'Revisions Requested') {
      return { daysElapsed, flag: 'action_required', label: '⚠️ Query / Revision Pending', color: 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse' }
    }
    if (['Draft', 'In Progress', 'Under Review'].includes(proposal.status)) {
      return { daysElapsed, flag: 'draft', label: '📝 In Preparation', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
    if (proposal.status === 'Submitted to Admin') {
      return { daysElapsed, flag: 'admin_review', label: '⏳ Admin Review', color: 'bg-blue-50 text-blue-700 border-blue-200' }
    }
    if (daysElapsed > 90) {
      return { daysElapsed, flag: 'overdue', label: `🔴 Overdue (${daysElapsed}d) — Follow Up`, color: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' }
    }
    if (daysElapsed >= 60) {
      return { daysElapsed, flag: 'expected', label: `🟡 Decision Expected (${daysElapsed}d)`, color: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold' }
    }
    return { daysElapsed, flag: 'normal', label: `🟢 In Review (${daysElapsed}d)`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }

  // Filtered tracked proposals (Searches Title, PI, Agency, Ref ID, Sanction #, Status)
  const trackedProposals = useMemo(() => {
    const allTrackingAliases = TRACKING_STAGES.flatMap((s) => s.aliases)
    return orgProposals.filter((p) => {
      // Only include post-submission tracked proposals (Submitted, Under Evaluation, Revisions, Awarded, Rejected)
      if (!allTrackingAliases.includes(p.status)) return false

      if (trackingStageFilter !== 'all') {
        const stageObj = TRACKING_STAGES.find((s) => s.key === trackingStageFilter)
        if (stageObj) {
          if (!stageObj.aliases.includes(p.status)) return false
        }
      }

      if (trackingAgencyFilter !== 'all') {
        const ag = (p.grantAgency || '').toLowerCase()
        if (!ag.includes(trackingAgencyFilter.toLowerCase())) return false
      }

      if (trackingSearch.trim()) {
        const q = trackingSearch.toLowerCase().trim()
        const titleMatch = (p.title || '').toLowerCase().includes(q)
        const grantMatch = (p.grantTitle || '').toLowerCase().includes(q)
        const agencyMatch = (p.grantAgency || '').toLowerCase().includes(q)
        const refMatch = (
          p.agencySubmission?.agencySubmissionId ||
          p.externalSubmission?.externalReferenceId ||
          p.externalSubmission?.portalName ||
          ''
        ).toLowerCase().includes(q)
        const sanctionMatch = (p.awardDetails?.sanctionOrderNumber || '').toLowerCase().includes(q)
        const statusMatch = (p.status || '').toLowerCase().includes(q)
        const piMatch =
          (p.leadPIName || '').toLowerCase().includes(q) ||
          (p.createdByName || '').toLowerCase().includes(q) ||
          (p.createdBy?.fullName || '').toLowerCase().includes(q) ||
          (p.sections || []).some((s) => (s.assignedToName || '').toLowerCase().includes(q))

        if (!titleMatch && !grantMatch && !agencyMatch && !refMatch && !sanctionMatch && !statusMatch && !piMatch) {
          return false
        }
      }

      return true
    })
  }, [orgProposals, trackingStageFilter, trackingAgencyFilter, trackingSearch])

  // Client-side filter over the real open-grants list (agency-created grants only —
  // Government & Other Sources has its own server-side filtering via /org/grants/discover).
  const filteredGrants = useMemo(() => {
    return openGrants.filter((g) => {
      const q = grantSearch.trim().toLowerCase()
      const matchesSearch =
        !q ||
        g.title?.toLowerCase().includes(q) ||
        g.fundingAgency?.agencyName?.toLowerCase().includes(q) ||
        g.category?.toLowerCase().includes(q)
      const matchesCategory = grantCategoryFilter === 'All Categories' || g.category === grantCategoryFilter
      const matchesFundingType = grantFundingTypeFilter === 'All Types' || g.fundingType === grantFundingTypeFilter
      return matchesSearch && matchesCategory && matchesFundingType
    })
  }, [openGrants, grantSearch, grantCategoryFilter, grantFundingTypeFilter])

  // Analytics Metrics
  const trackingMetrics = useMemo(() => {
    const list = orgProposals.filter((p) =>
      ['Submitted to Admin', 'Submitted to Agency', 'Submitted', 'Under Evaluation', 'Revisions Requested', 'Awarded', 'Accepted', 'Rejected'].includes(p.status)
    )
    const totalDispatched = list.length
    let totalRequestedVal = 0
    let totalAwardedVal = 0
    let underReviewCount = 0
    let awardedCount = 0
    let rejectedCount = 0
    let overdueCount = 0
    let revisionsCount = 0

    list.forEach((p) => {
      const reqNum = parseAmountToNumber(p.fundingAmount)
      totalRequestedVal += reqNum

      if (p.status === 'Awarded' || p.status === 'Accepted') {
        awardedCount++
        const awNum = parseAmountToNumber(p.awardDetails?.sanctionedAmount) || reqNum
        totalAwardedVal += awNum
      } else if (p.status === 'Rejected') {
        rejectedCount++
      } else {
        underReviewCount++
      }

      if (p.status === 'Revisions Requested') {
        revisionsCount++
      }

      const subDate = p.agencySubmission?.submittedAt || p.updatedAt
      if (subDate && !['Awarded', 'Accepted', 'Rejected'].includes(p.status)) {
        const days = Math.floor((Date.now() - new Date(subDate).getTime()) / (1000 * 60 * 60 * 24))
        if (days > 90) overdueCount++
      }
    })

    const decided = awardedCount + rejectedCount
    const winRate = decided > 0 ? Math.round((awardedCount / decided) * 100) : (totalDispatched > 0 ? 33 : 0)

    return {
      totalDispatched,
      totalRequestedVal,
      totalAwardedVal,
      underReviewCount,
      awardedCount,
      rejectedCount,
      overdueCount,
      revisionsCount,
      winRate,
    }
  }, [orgProposals])

  // ─── Fully Dynamic Institutional Analytics Engine ───
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('all') // 'all' | 'fy26' | 'past12m'

  const analyticsData = useMemo(() => {
    const filteredProps = orgProposals.filter((p) => {
      if (analyticsTimeframe === 'all') return true
      const date = new Date(p.createdAt || p.updatedAt)
      if (isNaN(date.getTime())) return true
      if (analyticsTimeframe === 'fy26') {
        const fyStart = new Date(2026, 3, 1)
        const fyEnd = new Date(2027, 2, 31, 23, 59, 59)
        return date >= fyStart && date <= fyEnd
      }
      if (analyticsTimeframe === 'past12m') {
        const past12 = new Date()
        past12.setMonth(past12.getMonth() - 12)
        return date >= past12
      }
      return true
    })

    let totalPipelineValue = 0
    let totalAwardedValue = 0
    let totalUnderReviewValue = 0
    let totalDraftingValue = 0

    let countDrafting = 0
    let countUnderReview = 0
    let countRevisions = 0
    let countAwarded = 0
    let countRejected = 0

    const agencyMap = {}
    let totalSections = 0
    let approvedSections = 0
    let reviewSections = 0
    let inProgressSections = 0
    let notStartedSections = 0

    filteredProps.forEach((p) => {
      const reqVal = parseAmountToNumber(p.fundingAmount)
      totalPipelineValue += reqVal

      if (['Draft', 'In Progress', 'Under Review', 'Submitted to Admin'].includes(p.status)) {
        countDrafting++
        totalDraftingValue += reqVal
      } else if (p.status === 'Revisions Requested') {
        countRevisions++
        totalUnderReviewValue += reqVal
      } else if (['Submitted to Agency', 'Submitted', 'Under Evaluation'].includes(p.status)) {
        countUnderReview++
        totalUnderReviewValue += reqVal
      } else if (['Awarded', 'Accepted'].includes(p.status)) {
        countAwarded++
        const awVal = parseAmountToNumber(p.awardDetails?.sanctionedAmount) || reqVal
        totalAwardedValue += awVal
      } else if (p.status === 'Rejected') {
        countRejected++
      }

      const agencyName = (p.grantAgency || 'Independent Funding Body').trim()
      if (!agencyMap[agencyName]) {
        agencyMap[agencyName] = {
          name: agencyName,
          count: 0,
          totalRequested: 0,
          totalAwarded: 0,
          proposals: [],
        }
      }
      agencyMap[agencyName].count++
      agencyMap[agencyName].totalRequested += reqVal
      if (['Awarded', 'Accepted'].includes(p.status)) {
        agencyMap[agencyName].totalAwarded += parseAmountToNumber(p.awardDetails?.sanctionedAmount) || reqVal
      }
      agencyMap[agencyName].proposals.push(p)

      if (Array.isArray(p.sections)) {
        p.sections.forEach((sec) => {
          totalSections++
          if (sec.status === 'Approved') approvedSections++
          else if (sec.status === 'Ready for Review') reviewSections++
          else if (sec.status === 'In Progress') inProgressSections++
          else notStartedSections++
        })
      }
    })

    const decidedCount = countAwarded + countRejected
    const winRate = decidedCount > 0 ? Math.round((countAwarded / decidedCount) * 100) : (countAwarded > 0 ? 100 : 0)
    const overallWritingProgress = totalSections > 0 ? Math.round((approvedSections / totalSections) * 100) : 0

    const sortedAgencies = Object.values(agencyMap).sort((a, b) => b.totalRequested - a.totalRequested)

    const facultyMap = {}
    members.forEach((m) => {
      facultyMap[m._id] = {
        id: m._id,
        name: m.fullName,
        jobTitle: m.jobTitle || 'Faculty Investigator',
        email: m.email,
        assignedSectionsCount: 0,
        approvedSectionsCount: 0,
        proposalsCount: 0,
        pipelineCapital: 0,
        awardsWon: 0,
      }
    })

    filteredProps.forEach((p) => {
      const reqVal = parseAmountToNumber(p.fundingAmount)
      const isAwarded = ['Awarded', 'Accepted'].includes(p.status)

      let foundMember = members.find(
        (m) =>
          m._id === p.createdBy?._id ||
          m._id === p.createdBy ||
          (p.createdByName && m.fullName.toLowerCase() === p.createdByName.toLowerCase())
      )
      if (foundMember && facultyMap[foundMember._id]) {
        facultyMap[foundMember._id].proposalsCount++
        facultyMap[foundMember._id].pipelineCapital += reqVal
        if (isAwarded) facultyMap[foundMember._id].awardsWon++
      }

      if (Array.isArray(p.sections)) {
        p.sections.forEach((sec) => {
          if (sec.assignedTo && facultyMap[sec.assignedTo]) {
            facultyMap[sec.assignedTo].assignedSectionsCount++
            if (sec.status === 'Approved') facultyMap[sec.assignedTo].approvedSectionsCount++
          } else if (sec.assignedToName) {
            const m = members.find((mem) => mem.fullName.toLowerCase() === sec.assignedToName.toLowerCase())
            if (m && facultyMap[m._id]) {
              facultyMap[m._id].assignedSectionsCount++
              if (sec.status === 'Approved') facultyMap[m._id].approvedSectionsCount++
            }
          }
        })
      }
    })

    const facultyLeaderboard = Object.values(facultyMap)
      .filter((f) => f.proposalsCount > 0 || f.assignedSectionsCount > 0)
      .sort((a, b) => b.pipelineCapital - a.pipelineCapital || b.assignedSectionsCount - a.assignedSectionsCount)

    const insights = []
    if (sortedAgencies.length > 0) {
      const topAg = sortedAgencies[0]
      const topPct = totalPipelineValue > 0 ? Math.round((topAg.totalRequested / totalPipelineValue) * 100) : 0
      insights.push({
        type: 'primary',
        icon: '🏛️',
        title: `Primary Funding Partner: ${topAg.name}`,
        desc: `Accounts for ${topPct}% (${formatCurrency(topAg.totalRequested)}) of your total institution's grant pipeline across ${topAg.count} active proposals.`,
      })
    }
    if (countAwarded > 0) {
      insights.push({
        type: 'success',
        icon: '🏆',
        title: `${formatCurrency(totalAwardedValue)} Sanctioned to Date`,
        desc: `Your institution has successfully secured ${countAwarded} sanctioned grant award${countAwarded > 1 ? 's' : ''} with a ${winRate}% conversion success rate.`,
      })
    } else {
      insights.push({
        type: 'info',
        icon: '📈',
        title: `${formatCurrency(totalPipelineValue)} Active Capital in Motion`,
        desc: `${filteredProps.length} proposals currently underway across drafting, compliance verification, and peer evaluation stages.`,
      })
    }
    if (countUnderReview > 0 || countRevisions > 0) {
      insights.push({
        type: 'warning',
        icon: '🔍',
        title: `${countUnderReview + countRevisions} Proposals in Agency Evaluation`,
        desc: `${formatCurrency(totalUnderReviewValue)} currently undergoing technical peer evaluations or agency query responses.`,
      })
    }
    insights.push({
      type: 'purple',
      icon: '⚡',
      title: `${overallWritingProgress}% Overall Template Clearance`,
      desc: `${approvedSections} of ${totalSections} total 17-section template blocks have received formal PI and Admin approval.`,
    })

    return {
      totalProposals: filteredProps.length,
      totalPipelineValue,
      totalAwardedValue,
      totalUnderReviewValue,
      totalDraftingValue,
      countDrafting,
      countUnderReview,
      countRevisions,
      countAwarded,
      countRejected,
      winRate,
      overallWritingProgress,
      totalSections,
      approvedSections,
      reviewSections,
      inProgressSections,
      notStartedSections,
      sortedAgencies,
      facultyLeaderboard,
      insights,
    }
  }, [orgProposals, members, analyticsTimeframe])

  // ─── Computed Deadline & Follow-up Alerts Engine ───
  const { allAlerts, deadlineMetrics } = useMemo(() => {
    const alerts = []
    let criticalCount = 0
    let upcomingCount = 0
    let overdueFollowupCount = 0

    orgProposals.forEach((p) => {
      if (!p.deadline) return
      const target = new Date(p.deadline)
      if (isNaN(target.getTime())) return

      const diffMs = target.getTime() - Date.now()
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      const isPostSubmission = ['Submitted to Agency', 'Submitted', 'Under Evaluation', 'Revisions Requested', 'Awarded', 'Accepted', 'Rejected'].includes(p.status)

      if (!isPostSubmission) {
        let urgency = 'normal'
        let urgencyLabel = `🟢 ${daysLeft}d left`
        let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'

        if (daysLeft < 0) {
          urgency = 'passed'
          urgencyLabel = `⌛ Closed (${Math.abs(daysLeft)}d ago)`
          badgeColor = 'bg-warm-gray-100 text-warm-gray-600 border-warm-gray-200'
        } else if (daysLeft <= 7) {
          urgency = 'critical'
          urgencyLabel = `🚨 Critical: ${daysLeft}d left`
          badgeColor = 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse'
          criticalCount++
        } else if (daysLeft <= 30) {
          urgency = 'upcoming'
          urgencyLabel = `⚠️ Upcoming: ${daysLeft}d left`
          badgeColor = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
          upcomingCount++
        }

        alerts.push({
          id: `prop_deadline_${p._id}`,
          type: 'grant_deadline',
          title: p.title,
          grantTitle: p.grantTitle || 'Official Grant Call',
          agency: p.grantAgency || 'Funding Agency',
          proposalId: p._id,
          proposalStatus: p.status,
          targetDate: p.deadline,
          daysLeft,
          urgency,
          urgencyLabel,
          badgeColor,
          piName: p.sections?.[0]?.assignedToName || p.leadPIName || 'Lead Investigator',
          progress: p.progress || 0,
          approvedSections: p.sections?.filter((s) => s.status === 'Approved').length || 0,
          totalSections: p.sections?.length || 17,
          proposal: p,
        })
      }
    })

    orgProposals.forEach((p) => {
      const isTracked = ['Submitted to Agency', 'Submitted', 'Under Evaluation', 'Revisions Requested'].includes(p.status)
      if (!isTracked) return

      const subDate = p.agencySubmission?.submittedAt || p.updatedAt
      const daysElapsed = subDate ? Math.max(0, Math.floor((Date.now() - new Date(subDate).getTime()) / (1000 * 60 * 60 * 24))) : 0

      if (p.status === 'Revisions Requested') {
        criticalCount++
        alerts.push({
          id: `prop_query_${p._id}`,
          type: 'agency_followup',
          title: p.title,
          grantTitle: p.grantTitle || 'Grant Review',
          agency: p.grantAgency || 'Funding Agency',
          proposalId: p._id,
          proposalStatus: p.status,
          targetDate: subDate,
          daysElapsed,
          urgency: 'critical',
          urgencyLabel: '⚠️ Revisions / Queries Pending',
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse',
          piName: p.sections?.[0]?.assignedToName || p.leadPIName || 'Lead Investigator',
          refId: p.agencySubmission?.agencySubmissionId || 'Official Reference',
          needsFollowupLetter: true,
          proposal: p,
        })
      } else if (daysElapsed > 90) {
        criticalCount++
        overdueFollowupCount++
        alerts.push({
          id: `prop_overdue_${p._id}`,
          type: 'agency_followup',
          title: p.title,
          grantTitle: p.grantTitle || 'Technical Evaluation',
          agency: p.grantAgency || 'Funding Agency',
          proposalId: p._id,
          proposalStatus: p.status,
          targetDate: subDate,
          daysElapsed,
          urgency: 'critical',
          urgencyLabel: `🔴 Overdue (${daysElapsed}d) — Follow Up Due`,
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
          piName: p.sections?.[0]?.assignedToName || p.leadPIName || 'Lead Investigator',
          refId: p.agencySubmission?.agencySubmissionId || 'Official Reference',
          needsFollowupLetter: true,
          proposal: p,
        })
      } else if (daysElapsed >= 60) {
        upcomingCount++
        alerts.push({
          id: `prop_expected_${p._id}`,
          type: 'agency_followup',
          title: p.title,
          grantTitle: p.grantTitle || 'Desk Assessment',
          agency: p.grantAgency || 'Funding Agency',
          proposalId: p._id,
          proposalStatus: p.status,
          targetDate: subDate,
          daysElapsed,
          urgency: 'upcoming',
          urgencyLabel: `🟡 Decision Expected (${daysElapsed}d)`,
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
          piName: p.sections?.[0]?.assignedToName || p.leadPIName || 'Lead Investigator',
          refId: p.agencySubmission?.agencySubmissionId || 'Official Reference',
          needsFollowupLetter: false,
          proposal: p,
        })
      }
    })

    reminders.forEach((r) => {
      const target = new Date(r.targetDate)
      const diffMs = target.getTime() - Date.now()
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      let urgency = 'normal'
      let urgencyLabel = `${daysLeft >= 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d overdue`}`
      let badgeColor = 'bg-purple-50 text-purple-700 border-purple-200'

      if (r.isCompleted) {
        urgency = 'completed'
        urgencyLabel = '✓ Done'
        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'
      } else if (daysLeft < 0) {
        urgency = 'critical'
        urgencyLabel = `🔴 Overdue (${Math.abs(daysLeft)}d)`
        badgeColor = 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
        criticalCount++
      } else if (daysLeft <= 3) {
        urgency = 'critical'
        urgencyLabel = `🚨 Due ${daysLeft === 0 ? 'Today' : `in ${daysLeft}d`}`
        badgeColor = 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse'
        criticalCount++
      } else if (daysLeft <= 14) {
        urgency = 'upcoming'
        urgencyLabel = `⚠️ Due in ${daysLeft}d`
        badgeColor = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
        upcomingCount++
      }

      alerts.push({
        id: `custom_${r._id}`,
        type: 'custom_reminder',
        reminderObj: r,
        title: r.title,
        notes: r.notes,
        agency: r.proposal?.grantAgency || 'Institutional Reminder',
        grantTitle: r.proposal?.title || 'Action Required',
        proposalId: r.proposal?._id,
        targetDate: r.targetDate,
        reminderType: r.reminderType,
        priority: r.priority,
        isCompleted: r.isCompleted,
        daysLeft,
        urgency,
        urgencyLabel,
        badgeColor,
        recipientName: r.recipientName,
        createdByName: r.createdByName,
      })
    })

    const urgencyOrder = { critical: 1, upcoming: 2, normal: 3, completed: 4, passed: 5 }
    alerts.sort((a, b) => (urgencyOrder[a.urgency] || 99) - (urgencyOrder[b.urgency] || 99))

    return {
      allAlerts: alerts,
      deadlineMetrics: {
        criticalAlertsCount: criticalCount,
        upcomingCount,
        overdueFollowupCount,
        activeRemindersCount: reminders.filter((r) => !r.isCompleted).length,
        totalAlerts: alerts.length,
      },
    }
  }, [orgProposals, reminders])

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((alert) => {
      if (deadlineTab === 'critical' && alert.urgency !== 'critical') return false
      if (deadlineTab === 'deadlines' && alert.type !== 'grant_deadline') return false
      if (deadlineTab === 'followups' && alert.type !== 'agency_followup') return false
      if (deadlineTab === 'custom' && (alert.type !== 'custom_reminder' || alert.isCompleted)) return false
      if (deadlineTab === 'completed' && !alert.isCompleted) return false

      if (deadlineSearch.trim()) {
        const q = deadlineSearch.toLowerCase().trim()
        const matchTitle = (alert.title || '').toLowerCase().includes(q)
        const matchGrant = (alert.grantTitle || '').toLowerCase().includes(q)
        const matchAgency = (alert.agency || '').toLowerCase().includes(q)
        const matchPi = (alert.piName || alert.recipientName || '').toLowerCase().includes(q)
        const matchNotes = (alert.notes || '').toLowerCase().includes(q)
        if (!matchTitle && !matchGrant && !matchAgency && !matchPi && !matchNotes) return false
      }
      return true
    })
  }, [allAlerts, deadlineTab, deadlineSearch])

  const getFollowupLetterContent = (proposal) => {
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    const subDate = proposal?.agencySubmission?.submittedAt
      ? new Date(proposal.agencySubmission.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Recorded Date'
    const daysElapsed = proposal?.agencySubmission?.submittedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(proposal.agencySubmission.submittedAt).getTime()) / (1000 * 60 * 60 * 24)))
      : 90

    return `REF: ${orgName || 'INSTITUTION'}/R&D/INQ/${new Date().getFullYear()}/${proposal?.agencySubmission?.agencySubmissionId || 'DST-SERB-01'}
Date: ${today}

To,
The Member Secretary / Program Director,
${proposal?.grantAgency || 'Funding Agency'},
Government of India.

SUBJECT: Official Status Enquiry on Technical Peer Review for Research Proposal Ref #${proposal?.agencySubmission?.agencySubmissionId || 'N/A'}

Respected Sir/Madam,

Greetings from ${orgName || 'our Institution'}.

This is with reference to the research project proposal titled:
"${proposal?.title || 'N/A'}"
Grant Call: ${proposal?.grantTitle || 'Core Research Project'}
Lead Principal Investigator: ${proposal?.sections?.[0]?.assignedToName || 'Principal Investigator'}
Total Requested Budget: ${proposal?.fundingAmount || 'Unspecified'}

The aforementioned research proposal was officially endorsed, cleared with institutional compliances, and submitted on ${subDate} (Confirmation Ref ID: ${proposal?.agencySubmission?.agencySubmissionId || 'Dispatched'}).

As ${daysElapsed} days have elapsed since official submission, we respectfully request an update regarding the current status of the technical peer review, referee queries, or expert committee presentation schedule.

Our institution and the research team remain available to provide any additional supplementary data, budget clarifications, or presentation files as required.

Thanking you.

Yours sincerely,

Dean / Director (Research & Development)
${orgName || 'Institution'}
Official Seal & Endorsement`
  }

  const handleLogout = () => {
    localStorage.removeItem('grantos_token')
    localStorage.removeItem('grantos_user')
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pendingMembers = members.filter((m) => !m.isVerified)
  const verifiedMembers = members.filter((m) => m.isVerified)
  const selectedProposalObj = orgProposals.find((p) => p._id === selectedProposalId) || orgProposals[0]

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* ─── Sidebar ─── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-200/80">
            <Link to="/" className="flex items-center gap-2.5 group" id="admin-dash-logo">
              <div className="w-9 h-9 bg-emerald-800 rounded-[12px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105 shadow-sm">
                <LeafIcon />
              </div>
              <span className="font-heading text-xl font-bold text-slate-900 tracking-tight">
                Grant<span className="text-emerald-600 font-extrabold">OS</span>
              </span>
            </Link>
            {orgName && (
              <p className="text-xs text-slate-500 font-medium mt-2 truncate">{orgName}</p>
            )}
          </div>

          <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => { navigateToSection(item.key); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[12px] text-sm font-medium transition-all duration-200 cursor-pointer ${activeSection === item.key
                  ? 'bg-emerald-900 text-white shadow-xs font-semibold ring-1 ring-emerald-800'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <span className="w-5 h-5 flex items-center justify-center shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {item.key === 'team' && memberCounts.pending > 0 && (
                  <span className="ml-auto px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold shadow-xs">
                    {memberCounts.pending}
                  </span>
                )}
                {item.key === 'deadlines' && deadlineMetrics.criticalAlertsCount > 0 && (
                  <span className="ml-auto px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold animate-pulse shadow-xs">
                    {deadlineMetrics.criticalAlertsCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-200/80">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 font-bold text-sm shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{userName}</p>
                <p className="text-xs font-medium text-slate-500">Org Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 rounded-[10px] text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 lg:ml-64 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-heading font-bold text-slate-900">Grant<span className="text-emerald-600 font-extrabold">OS</span></span>
          <div className="w-8" />
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {/* ═══════════════════════════════════ HOME ═══════════════════════════════════ */}
          {activeSection === 'home' && (() => {
            /* ── Dynamic Computations with Period Filtering ── */
            const now = Date.now()
            const filteredProposals = orgProposals.filter((p) => {
              if (dashboardTimeFilter === 'all') return true
              const d = new Date(p.createdAt || p.updatedAt).getTime()
              const days = dashboardTimeFilter === '30d' ? 30 : dashboardTimeFilter === '90d' ? 90 : 365
              return now - d <= days * 24 * 60 * 60 * 1000
            })

            const totalPipeline = filteredProposals.reduce((sum, p) => sum + parseAmountToNumber(p.fundingAmount), 0)
            const awardedProposals = filteredProposals.filter((p) => ['Awarded', 'Accepted'].includes(p.status))
            const totalAwarded = awardedProposals.reduce(
              (sum, p) => sum + (parseAmountToNumber(p.awardDetails?.sanctionedAmount) || parseAmountToNumber(p.fundingAmount)),
              0
            )
            const activeProposals = filteredProposals.filter((p) => !['Awarded', 'Accepted', 'Rejected'].includes(p.status))

            const draftProposals = filteredProposals.filter((p) => ['Draft', 'In Progress'].includes(p.status))
            const reviewProposals = filteredProposals.filter((p) => ['Under Review', 'Submitted to Admin'].includes(p.status))
            const submittedProposals = filteredProposals.filter((p) =>
              ['Submitted to Agency', 'Submitted', 'Under Evaluation'].includes(p.status)
            )
            const revisionProposals = filteredProposals.filter((p) => p.status === 'Revisions Requested')
            const rejectedProposals = filteredProposals.filter((p) => p.status === 'Rejected')

            const draftCount = draftProposals.length
            const reviewCount = reviewProposals.length
            const submittedCount = submittedProposals.length
            const revisionsCount = revisionProposals.length
            const awardedCount = awardedProposals.length
            const rejectedCount = rejectedProposals.length
            const decided = awardedCount + rejectedCount
            const winRate = decided > 0 ? Math.round((awardedCount / decided) * 100) : awardedCount > 0 ? 100 : 0

            // Section completion health metrics
            let totalSecs = 0,
              approvedSecs = 0,
              inProgressSecs = 0
            filteredProposals.forEach((p) => {
              ; (p.sections || []).forEach((s) => {
                totalSecs++
                if (s.status === 'Approved') approvedSecs++
                else if (s.status === 'In Progress') inProgressSecs++
              })
            })
            const overallProgress = totalSecs > 0 ? Math.round((approvedSecs / totalSecs) * 100) : 0

            // Action Required Items: only when critical deadline comes in deadline alerts
            const criticalDeadlines = allAlerts.filter((a) => a.urgency === 'critical')
            const actionItemsCount = criticalDeadlines.length

            // Stage map for interactive funnel filtering
            const stageConfigMap = {
              all: { label: 'All Proposals', proposals: filteredProposals, badgeBg: 'bg-slate-100 text-slate-800 border-slate-200' },
              draft: { label: 'Drafting', proposals: draftProposals, badgeBg: 'bg-slate-100 text-slate-700 border-slate-200' },
              review: { label: 'Internal Review', proposals: reviewProposals, badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
              submitted: {
                label: 'Submitted to Agency',
                proposals: submittedProposals,
                badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
              },
              revisions: {
                label: 'Revisions Requested',
                proposals: revisionProposals,
                badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
              },
              awarded: {
                label: 'Awarded & Sanctioned',
                proposals: awardedProposals,
                badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              },
              rejected: { label: 'Archived / Rejected', proposals: rejectedProposals, badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' },
            }

            const currentStageObj = stageConfigMap[pipelineFilterStage] || stageConfigMap.all
            const displayedProposals = (currentStageObj.proposals || []).filter((p) => {
              if (dashboardAgencyFilter !== 'all') {
                const ag = (p.grantAgency || '').toLowerCase()
                if (!ag.includes(dashboardAgencyFilter.toLowerCase())) return false
              }
              if (!dashboardSearchQuery.trim()) return true
              const q = dashboardSearchQuery.toLowerCase().trim()
              const matchTitle = (p.title || '').toLowerCase().includes(q)
              const matchGrant = (p.grantTitle || '').toLowerCase().includes(q)
              const matchAgency = (p.grantAgency || '').toLowerCase().includes(q)
              return matchTitle || matchGrant || matchAgency
            })

            // Filtered deadlines by urgency toggle
            const displayedDeadlines = allAlerts
              .filter((a) => a.type === 'grant_deadline' && a.urgency !== 'passed' && a.urgency !== 'completed')
              .filter((a) => {
                if (deadlineUrgencyFilter === 'critical') return a.urgency === 'critical' || a.daysLeft <= 7
                if (deadlineUrgencyFilter === 'upcoming') return a.urgency === 'upcoming'
                return true
              })
              .slice(0, 5)

            // Team workload computations
            const memberWorkload = verifiedMembers
              .map((m) => {
                let assigned = 0,
                  completed = 0
                orgProposals.forEach((p) => {
                  ; (p.sections || []).forEach((s) => {
                    const matchId = s.assignedTo === m._id || s.assignedTo?._id === m._id
                    const matchName =
                      s.assignedToName &&
                      m.fullName &&
                      s.assignedToName.trim().toLowerCase() === m.fullName.trim().toLowerCase()
                    if (matchId || matchName) {
                      assigned++
                      if (s.status === 'Approved') completed++
                    }
                  })
                })
                return {
                  ...m,
                  assigned,
                  completed,
                  completion: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
                }
              })
              .sort((a, b) => b.assigned - a.assigned)

            // Funding agency portfolio breakdown
            const agencyBreakdown = {}
            filteredProposals.forEach((p) => {
              const agency = (p.grantAgency || 'Independent / Unassigned').trim()
              if (!agencyBreakdown[agency]) agencyBreakdown[agency] = { name: agency, count: 0, value: 0, awarded: 0 }
              agencyBreakdown[agency].count++
              agencyBreakdown[agency].value += parseAmountToNumber(p.fundingAmount)
              if (['Awarded', 'Accepted'].includes(p.status)) agencyBreakdown[agency].awarded++
            })
            const topAgencies = Object.values(agencyBreakdown)
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)

            // Time greeting
            const hour = new Date().getHours()
            const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

            return (
              <div className="animate-fade-up space-y-8">
                {/* ─── 1. Executive Command Header ─── */}
                <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#062c1e] via-[#093a27] to-[#031d14] p-7 sm:p-9 text-white shadow-xl border border-emerald-800/40">
                  <div className="absolute -top-28 -right-28 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-300/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between flex-wrap gap-5">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-semibold backdrop-blur-sm">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                          </span>
                          <span>{orgName || 'GrantOS Command Center'} • Real-Time Sync</span>
                        </div>
                        <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                          {greeting}, {userName ? userName.split(' ')[0] : 'Administrator'} 👋
                        </h1>
                        <p className="text-emerald-100/90 text-sm sm:text-base max-w-2xl leading-relaxed">
                          Executive oversight for research applications, team distribution, and institutional capital.
                          Currently monitoring {filteredProposals.length} active proposal{filteredProposals.length !== 1 ? 's' : ''}.
                        </p>
                      </div>

                      {/* Header Controls: Time Filter Deck */}
                      <div className="flex items-center gap-3">
                        {/* Dynamic Time Filter Deck */}
                        <div className="flex items-center bg-black/40 backdrop-blur-md p-1.5 rounded-[14px] border border-white/10 text-xs sm:text-sm">
                          {[
                            { id: 'all', label: 'All Time' },
                            { id: 'ytd', label: 'YTD 2026' },
                            { id: '90d', label: '90 Days' },
                            { id: '30d', label: '30 Days' },
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setDashboardTimeFilter(t.id)}
                              className={`px-3.5 py-1.5 rounded-[10px] font-semibold transition-all cursor-pointer ${dashboardTimeFilter === t.id
                                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                                : 'text-emerald-100/70 hover:text-white hover:bg-white/10'
                                }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── 2. Five Dynamic KPI Scorecards ─── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Card 1: Total Pipeline */}
                  <div
                    onClick={() => {
                      setPipelineFilterStage('all')
                      navigateToSection('home')
                    }}
                    className="bg-white rounded-[20px] border border-slate-200/80 p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-[12px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <TreasuryIcon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <SparklineSvg data={[draftCount, reviewCount, submittedCount, revisionsCount, awardedCount]} color="#059669" className="w-16 h-6" />
                    </div>
                    <p className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight leading-none mb-1.5">
                      {formatCurrency(totalPipeline)}
                    </p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pipeline</p>
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>{activeProposals.length} active in flight</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">{overallProgress > 0 ? `${overallProgress}% clearance` : (activeProposals.length > 0 ? `${activeProposals.length} in flight` : 'Ready')}</span>
                    </div>
                  </div>

                  {/* Card 2: Awarded Capital */}
                  <div
                    onClick={() => navigateToSection('tracking')}
                    className="bg-white rounded-[20px] border border-slate-200/80 p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-[12px] bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <TrophyIcon className="w-5 h-5 text-amber-600" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {winRate}% Win Rate
                      </span>
                    </div>
                    <p className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight leading-none mb-1.5">
                      {formatCurrency(totalAwarded)}
                    </p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sanctioned Capital</p>
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>{awardedCount} sanctioned grant{awardedCount !== 1 ? 's' : ''}</span>
                      <span className="text-amber-800 font-bold">Verified</span>
                    </div>
                  </div>

                  {/* Card 3: In-Flight Proposals */}
                  <div
                    onClick={() => {
                      setPipelineFilterStage('all')
                      navigateToSection('home')
                    }}
                    className="bg-white rounded-[20px] border border-slate-200/80 p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-[12px] bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {activeProposals.length} In Flight
                      </span>
                    </div>
                    <p className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight leading-none mb-1.5">
                      {filteredProposals.length}
                    </p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Proposals</p>
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
                      <span>{draftCount} Draft</span>
                      <span>•</span>
                      <span>{reviewCount} Review</span>
                      <span>•</span>
                      <span>{submittedCount} Agency</span>
                    </div>
                  </div>

                  {/* Card 4: Team Capacity */}
                  <div
                    onClick={() => navigateToSection('team')}
                    className="bg-white rounded-[20px] border border-slate-200/80 p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-[12px] bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <UsersIcon className="w-5 h-5 text-purple-600" />
                      </div>
                      {pendingMembers.length > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                          {pendingMembers.length} Pending
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight leading-none mb-1.5">
                      {verifiedMembers.length}
                    </p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team Researchers</p>
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>{memberWorkload.filter((m) => m.assigned > 0).length} assigned</span>
                      <span className="text-purple-800 font-bold">
                        {Math.min(
                          100,
                          Math.round((memberWorkload.filter((m) => m.assigned > 0).length / Math.max(1, verifiedMembers.length)) * 100)
                        )}
                        % Loaded
                      </span>
                    </div>
                  </div>

                  {/* Card 5: Open Grants Radar */}
                  <div
                    onClick={() => navigateToSection('grants')}
                    className="bg-white rounded-[20px] border border-slate-200/80 p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-[12px] bg-sky-50 text-sky-700 border border-sky-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <CompassIcon className="w-5 h-5 text-sky-600" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        Radar
                      </span>
                    </div>
                    <p className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight leading-none mb-1.5">
                      {openGrants.length}
                    </p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Open Opportunities</p>
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>Active Mandates</span>
                      <span className="text-sky-700 font-bold">Explore →</span>
                    </div>
                  </div>
                </div>

                {/* ─── 3. Action Required: Only shown when critical deadline comes in deadline alerts ─── */}
                {criticalDeadlines.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50/90 via-rose-50/50 to-amber-50/90 rounded-[22px] border border-amber-200 p-6 shadow-sm animate-fade-in">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                          <FlameIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="font-heading text-lg font-bold text-slate-900 leading-tight">
                            Action Required Today
                          </h2>
                          <p className="text-sm text-amber-900 font-medium">
                            {criticalDeadlines.length} critical deadline alert{criticalDeadlines.length !== 1 ? 's' : ''} in Deadline Alerts requiring immediate attention
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setDeadlineTab('critical')
                          navigateToSection('deadlines')
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <span>🚨 View in Deadline Alerts ({criticalDeadlines.length}) →</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {criticalDeadlines.map((d) => (
                        <div
                          key={d.id}
                          className="bg-white rounded-[16px] p-4 border border-rose-200/80 shadow-xs flex items-center justify-between gap-3 hover:border-rose-300 hover:shadow-sm transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${d.badgeColor || 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                {d.urgencyLabel}
                              </span>
                              {d.type === 'grant_deadline' && (
                                <span className="text-[11px] font-semibold text-slate-500">
                                  Call Deadline
                                </span>
                              )}
                              {d.type === 'agency_followup' && (
                                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  Agency Review
                                </span>
                              )}
                              {d.type === 'custom_reminder' && (
                                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                  Scheduled Alert
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-slate-900 truncate" title={d.title}>
                              {d.title}
                            </p>
                            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                              {d.agency || d.grantTitle || 'Official Record'}
                              {d.piName ? ` • ${d.piName}` : d.recipientName ? ` • ${d.recipientName}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (d.proposalId && (d.type === 'grant_deadline' || d.type === 'agency_followup')) {
                                setSelectedProposalId(d.proposalId)
                                navigateToSection('proposals')
                              } else {
                                setDeadlineTab('critical')
                                navigateToSection('deadlines')
                              }
                            }}
                            className="px-3.5 py-2 rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 shadow-xs"
                          >
                            Action
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── 4. Interactive Proposal Pipeline Funnel & Stage Drilldown ─── */}
                <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] p-6 sm:p-8">
                  {/* Funnel Top Bar */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
                          Proposal Lifecycle Funnel
                        </h2>
                      </div>
                      <p className="text-sm text-slate-600">
                        Click any lifecycle stage to filter and inspect proposals directly.
                      </p>
                    </div>

                    {/* Section Completion Dial */}
                    <div className="flex items-center gap-3.5 bg-slate-50 px-4.5 py-3 rounded-[16px] border border-slate-200/70">
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{overallProgress}% Section Health</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {approvedSecs} Approved • {inProgressSecs} Writing
                        </p>
                      </div>
                      <div className="w-13 h-13 relative flex items-center justify-center shrink-0">
                        <svg className="w-13 h-13 -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-slate-200"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-emerald-500 transition-all duration-1000 ease-out"
                            strokeDasharray={`${overallProgress}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-xs font-extrabold text-slate-900 font-heading">
                          {overallProgress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Stage Pill Deck (Click to Filter) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    {[
                      {
                        key: 'all',
                        label: 'All Stages',
                        count: filteredProposals.length,
                        sum: totalPipeline,
                        color: 'from-slate-700 to-slate-900',
                      },
                      {
                        key: 'draft',
                        label: 'Drafting',
                        count: draftCount,
                        sum: draftProposals.reduce((s, p) => s + parseAmountToNumber(p.fundingAmount), 0),
                        color: 'from-slate-500 to-slate-600',
                      },
                      {
                        key: 'review',
                        label: 'Internal Review',
                        count: reviewCount,
                        sum: reviewProposals.reduce((s, p) => s + parseAmountToNumber(p.fundingAmount), 0),
                        color: 'from-indigo-600 to-indigo-700',
                      },
                      {
                        key: 'submitted',
                        label: 'Agency Review',
                        count: submittedCount,
                        sum: submittedProposals.reduce((s, p) => s + parseAmountToNumber(p.fundingAmount), 0),
                        color: 'from-blue-600 to-blue-700',
                      },
                      {
                        key: 'revisions',
                        label: 'Revisions',
                        count: revisionsCount,
                        sum: revisionProposals.reduce((s, p) => s + parseAmountToNumber(p.fundingAmount), 0),
                        color: 'from-amber-500 to-amber-600',
                      },
                      {
                        key: 'awarded',
                        label: 'Awarded',
                        count: awardedCount,
                        sum: totalAwarded,
                        color: 'from-emerald-600 to-teal-700',
                      },
                    ].map((stage) => {
                      const isActive = pipelineFilterStage === stage.key
                      return (
                        <button
                          key={stage.key}
                          onClick={() => setPipelineFilterStage(stage.key)}
                          className={`p-4 rounded-[16px] text-left transition-all duration-200 cursor-pointer border relative overflow-hidden group ${isActive
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/50 -translate-y-0.5'
                            : 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border-slate-200/80'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-emerald-300' : 'text-slate-500'
                                }`}
                            >
                              {stage.label}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                                }`}
                            >
                              {stage.count}
                            </span>
                          </div>
                          <p className={`text-base font-extrabold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                            {formatCurrency(stage.sum)}
                          </p>
                        </button>
                      )
                    })}
                  </div>

                  {/* Filter Toolbar & Live Search */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 pt-3.5 border-t border-slate-100">
                    <div className="relative flex-1 max-w-md">
                      <input
                        type="text"
                        value={dashboardSearchQuery}
                        onChange={(e) => setDashboardSearchQuery(e.target.value)}
                        placeholder="Search proposals by title, grant program, agency..."
                        className="w-full pl-10 pr-9 py-2.5 rounded-[12px] bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3 pointer-events-none"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      {dashboardSearchQuery && (
                        <button
                          onClick={() => setDashboardSearchQuery('')}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 justify-end text-sm text-slate-600 flex-wrap">
                      {dashboardAgencyFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-xs">
                          <span>Agency: {dashboardAgencyFilter}</span>
                          <button
                            onClick={() => setDashboardAgencyFilter('all')}
                            className="hover:text-emerald-950 font-black cursor-pointer ml-0.5"
                            title="Clear Agency Filter"
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      <span>
                        Showing <strong className="text-slate-900">{displayedProposals.length}</strong> in{' '}
                        <strong className="text-slate-900">{currentStageObj.label}</strong>
                      </span>
                      {pipelineFilterStage !== 'all' && (
                        <button
                          onClick={() => setPipelineFilterStage('all')}
                          className="text-emerald-700 hover:underline font-bold ml-1 cursor-pointer"
                        >
                          Reset Stage
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Proposals Showcase Grid */}
                  {displayedProposals.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50/50 rounded-[18px] border border-dashed border-slate-200">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 text-lg">
                        <DocumentTextIcon className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-base font-bold text-slate-800 mb-1">
                        No proposals found {pipelineFilterStage !== 'all' ? `in stage "${currentStageObj.label}"` : ''}
                      </p>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        {dashboardSearchQuery
                          ? 'Try modifying your search keywords or resetting filters.'
                          : 'Proposals matching this stage will appear here.'}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[580px] overflow-y-auto pr-2 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayedProposals.map((p) => {
                          const statusConfig = {
                            Draft: { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
                            'In Progress': { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
                            'Under Review': { bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
                            'Submitted to Admin': {
                              bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                              dot: 'bg-indigo-500',
                            },
                            'Submitted to Agency': {
                              bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
                              dot: 'bg-cyan-500',
                            },
                            'Under Evaluation': {
                              bg: 'bg-violet-50 text-violet-700 border-violet-200',
                              dot: 'bg-violet-500',
                            },
                            'Revisions Requested': {
                              bg: 'bg-amber-50 text-amber-700 border-amber-200',
                              dot: 'bg-amber-500 animate-pulse',
                            },
                            Awarded: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
                            Accepted: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
                            Rejected: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
                          }
                          const sc = statusConfig[p.status] || statusConfig.Draft
                          const approvedInProposal = (p.sections || []).filter((s) => s.status === 'Approved').length
                          const totalInProposal = (p.sections || []).length || 1
                          const secPct = Math.round((approvedInProposal / totalInProposal) * 100)

                          return (
                            <div
                              key={p._id}
                              className="bg-white rounded-[18px] p-4.5 border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${sc.bg}`}
                                  >
                                    <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                                    {p.status}
                                  </span>
                                  {p.fundingAmount && (
                                    <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full">
                                      {p.fundingAmount}
                                    </span>
                                  )}
                                </div>

                                <h3
                                  onClick={() => {
                                    setSelectedProposalId(p._id)
                                    navigateToSection('proposals')
                                  }}
                                  className="font-heading text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 cursor-pointer"
                                  title={p.title}
                                >
                                  {p.title}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium truncate mt-1">
                                  {p.grantAgency || 'Independent Grant Call'}
                                </p>

                                {/* Progress Track */}
                                <div className="mt-3.5">
                                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1.5">
                                    <span>Dossier Sections</span>
                                    <span>
                                      {approvedInProposal}/{totalInProposal} done ({secPct}%)
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                      style={{ width: `${secPct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Card Actions */}
                              <div className="mt-4.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedProposalId(p._id)
                                    navigateToSection('proposals')
                                  }}
                                  className="text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                                >
                                  Open Editor →
                                </button>
                                <button
                                  onClick={() => navigateToSection('tracking')}
                                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                >
                                  Track Stage
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {displayedProposals.length > 6 && (
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100 flex-wrap gap-2">
                      <span>Showing {displayedProposals.length} proposals in this stage (scroll above to view all)</span>
                      <button
                        onClick={() => navigateToSection('proposals')}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        Open Proposal Management →
                      </button>
                    </div>
                  )}
                </div>

                {/* ─── 5. Two-Column Intelligence: Deadlines Radar & Team Capacity ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Deadlines Radar */}
                  <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] p-6 sm:p-7">
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <ClockIcon className="w-5 h-5 text-amber-600" />
                        <div>
                          <h2 className="font-heading text-xl font-bold text-slate-900 leading-tight">
                            Deadline Alerts Radar
                          </h2>
                          <p className="text-sm text-slate-500 mt-0.5">Impending submission windows</p>
                        </div>
                      </div>

                      {/* Urgency Filter */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-[10px] text-xs">
                        {[
                          { id: 'all', label: 'All' },
                          { id: 'critical', label: 'Critical' },
                          { id: 'upcoming', label: 'Upcoming' },
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            onClick={() => setDeadlineUrgencyFilter(btn.id)}
                            className={`px-3 py-1.5 rounded-[8px] font-semibold transition-all cursor-pointer ${deadlineUrgencyFilter === btn.id
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                              }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {displayedDeadlines.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50/50 rounded-[16px] border border-dashed border-slate-200">
                        <ShieldCheckIcon className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                        <p className="text-sm font-bold text-slate-800">No deadlines in this filter</p>
                        <p className="text-xs text-slate-500 mt-0.5">All active proposals are within comfortable margins</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {displayedDeadlines.map((d) => {
                          const isCrit = d.urgency === 'critical' || d.daysLeft <= 3
                          return (
                            <div
                              key={d.id}
                              className="p-4 rounded-[16px] bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 transition-all flex items-center justify-between gap-3 group"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                                  {d.title}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                                  <span>{d.agency}</span>
                                  <span>•</span>
                                  <span>
                                    {new Date(d.targetDate).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border shrink-0 ${isCrit
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                              >
                                {isCrit ? '🚨 ' : '⏰ '}
                                {d.daysLeft}d left
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium">Automated reminder dispatch active</span>
                      <button
                        onClick={() => navigateToSection('deadlines')}
                        className="font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        All Alerts →
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Team Capacity & Workload Balance */}
                  <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] p-6 sm:p-7">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2.5">
                        <UsersIcon className="w-5 h-5 text-purple-600" />
                        <div>
                          <h2 className="font-heading text-xl font-bold text-slate-900 leading-tight">
                            Team Capacity & Workload
                          </h2>
                          <p className="text-sm text-slate-500 mt-0.5">Researcher assignment balance</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigateToSection('team')}
                        className="text-sm font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Manage Team →
                      </button>
                    </div>

                    {memberWorkload.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50/50 rounded-[16px] border border-dashed border-slate-200">
                        <UsersIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <p className="text-sm font-bold text-slate-800">No member section assignments</p>
                        <p className="text-xs text-slate-500 mt-0.5">Assign sections in Proposal Management</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {memberWorkload.slice(0, 5).map((m) => {
                          const loadStatus =
                            m.assigned === 0
                              ? { label: 'Available', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                              : m.assigned <= 3
                                ? { label: 'Optimal', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
                                : { label: 'High Load', color: 'bg-amber-50 text-amber-700 border-amber-200' }

                          return (
                            <div
                              key={m._id}
                              className="p-3.5 rounded-[16px] bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0">
                                  {m.fullName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">{m.fullName}</p>
                                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{m.jobTitle || m.email}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="text-xs font-bold text-slate-700">
                                  {m.completed}/{m.assigned} done
                                </span>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${loadStatus.color}`}
                                >
                                  {loadStatus.label}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                      <span className="text-slate-500 font-medium">{verifiedMembers.length} verified researchers in roster</span>
                      <button
                        onClick={() => navigateToSection('team')}
                        className="font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Assign Tasks →
                      </button>
                    </div>
                  </div>
                </div>

                {/* ─── 6. Analytical Intelligence Suite: Agency Allocation & Trajectory Velocity ─── */}
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
                          Institutional Grant Intelligence & Trajectory
                        </h2>
                      </div>
                      <p className="text-sm text-slate-600">
                        Real-time capital distribution by agency and monthly dossier submission velocity.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                      {dashboardAgencyFilter !== 'all' && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-xs">
                          <span>Filtered: {dashboardAgencyFilter}</span>
                          <button
                            onClick={() => setDashboardAgencyFilter('all')}
                            className="hover:text-emerald-950 font-black cursor-pointer"
                            title="Clear Agency Filter"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => navigateToSection('analytics')}
                        className="px-4 py-2 rounded-[12px] bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <span>📊</span> Full Analytics Report →
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Funding Agency Capital Allocation Donut Chart */}
                    <div className="lg:col-span-5 bg-white rounded-[24px] border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] p-5 sm:p-6 min-w-0 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-heading text-lg font-bold text-slate-900 leading-tight">
                            Funding Agency Capital Allocation
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Capital distribution across government & private donors
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shrink-0">
                          {topAgencies.length} Partner Bodies
                        </span>
                      </div>

                      <FundingAgencyDonutChart
                        agencies={topAgencies}
                        totalPipelineValue={totalPipeline}
                        selectedAgency={dashboardAgencyFilter}
                        onSelectAgency={(agency) => setDashboardAgencyFilter(agency)}
                        formatCurrency={formatCurrency}
                      />
                    </div>

                    {/* Right: Monthly Grant Trajectory & Submission Velocity */}
                    <div className="lg:col-span-7 bg-white rounded-[24px] border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] p-5 sm:p-6 min-w-0 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-heading text-lg font-bold text-slate-900 leading-tight">
                            Monthly Grant Trajectory & Submission Velocity
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Timeline velocity of grant drafting, submissions & sanctioned capital
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 shrink-0">
                          Timeline Analytics
                        </span>
                      </div>

                      <MonthlyGrantTrajectoryChart
                        proposals={filteredProposals}
                        formatCurrency={formatCurrency}
                        parseAmountToNumber={parseAmountToNumber}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ═══════════════════════════════════ GRANTS ═══════════════════════════════════ */}
          {activeSection === 'grants' && (
            <GrantDiscoveryModule
              embedded={true}
              userRole="org_admin"
              onProposalCreated={fetchOrgProposals}
            />
          )}

          {/* ═══════════════════════════════════ PROPOSAL TRACKING DASHBOARD ═══════════════════════════════════ */}
          {(activeSection === 'tracking' || activeSection === 'applications') && (
            <div className="animate-fade-up space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                      Lifecycle Monitor
                    </span>
                    <span className="text-sm text-slate-400">•</span>
                    <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Post-Submission Command Center</span>
                  </div>
                  <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
                    Proposal Tracking Dashboard
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
                    Track the progress of all grant proposals dispatched to funding agencies. Monitor peer review stages, manage referee queries, follow up on decision deadlines, and log official sanction awards.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
                  <div className="bg-slate-200/80 p-1 rounded-xl flex items-center shadow-inner">
                    <button
                      type="button"
                      onClick={() => setTrackingView('kanban')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${trackingView === 'kanban'
                        ? 'bg-white text-purple-900 shadow-soft'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <span>☷</span> Kanban Board
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrackingView('table')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${trackingView === 'table'
                        ? 'bg-white text-purple-900 shadow-soft'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <span>☰</span> Dense Table
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchOrgProposals()}
                    className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-xs cursor-pointer transition-colors"
                    title="Refresh Proposals"
                  >
                    <span>🔄</span>
                  </button>
                </div>
              </div>

              {/* KPI bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-elevated rounded-2xl border border-slate-200/80 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Pipeline</span>
                    <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-base font-bold">🏛️</span>
                  </div>
                  <p className="font-heading text-3xl font-extrabold text-slate-900">{trackingMetrics.totalDispatched}</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Dispatched to Funding Agencies</p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
                </div>

                <div className="bg-surface-elevated rounded-2xl border border-slate-200/80 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requested Pipeline</span>
                    <span className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center text-base font-bold">💰</span>
                  </div>
                  <p className="font-heading text-3xl font-extrabold text-purple-950">{formatCurrency(trackingMetrics.totalRequestedVal)}</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Total grant funds requested</p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-fuchsia-500" />
                </div>

                <div className="bg-surface-elevated rounded-2xl border border-slate-200/80 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sanctioned & Won</span>
                    <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-base font-bold">🏆</span>
                  </div>
                  <p className="font-heading text-3xl font-extrabold text-emerald-900">{formatCurrency(trackingMetrics.totalAwardedVal)}</p>
                  <p className="text-xs text-emerald-700 font-bold mt-1">
                    {trackingMetrics.awardedCount} Grants Won &nbsp;•&nbsp; {trackingMetrics.winRate}% Success Rate
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                </div>

                <div className="bg-surface-elevated rounded-2xl border border-slate-200/80 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Under Evaluation</span>
                    <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-base font-bold">🔍</span>
                  </div>
                  <p className="font-heading text-3xl font-extrabold text-slate-900">{trackingMetrics.underReviewCount}</p>
                  <p className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                    {trackingMetrics.revisionsCount > 0 && (
                      <span className="text-amber-800 font-bold">⚠️ {trackingMetrics.revisionsCount} Query</span>
                    )}
                    {trackingMetrics.overdueCount > 0 && (
                      <span className="text-rose-700 font-bold">• 🔴 {trackingMetrics.overdueCount} Overdue</span>
                    )}
                    {trackingMetrics.revisionsCount === 0 && trackingMetrics.overdueCount === 0 && (
                      <span>Active peer review scoring</span>
                    )}
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                </div>
              </div>

              {/* Search & Filter */}
              <div className="bg-surface-elevated rounded-2xl border border-slate-200/80 shadow-soft p-4 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex-1 w-full relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                  <input
                    type="text"
                    value={trackingSearch}
                    onChange={(e) => setTrackingSearch(e.target.value)}
                    placeholder="Search by Proposal Title, Principal Investigator, Agency, or Agency Ref ID..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all placeholder:text-slate-400"
                  />
                  {trackingSearch && (
                    <button
                      onClick={() => setTrackingSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  <select
                    value={trackingAgencyFilter}
                    onChange={(e) => setTrackingAgencyFilter(e.target.value)}
                    className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                  >
                    <option value="all">All Agencies</option>
                    <option value="DST">DST / SERB</option>
                    <option value="UGC">UGC</option>
                    <option value="DBT">DBT</option>
                    <option value="AICTE">AICTE</option>
                  </select>

                  <select
                    value={trackingStageFilter}
                    onChange={(e) => setTrackingStageFilter(e.target.value)}
                    className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                  >
                    <option value="all">All Stages ({trackedProposals.length})</option>
                    {TRACKING_STAGES.map((s) => (
                      <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Kanban / Table */}
              {trackingView === 'kanban' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4.5 items-start">
                  {TRACKING_STAGES.map((stage) => {
                    const stageProposals = trackedProposals.filter((p) => stage.aliases.includes(p.status))
                    return (
                      <div
                        key={stage.key}
                        className="bg-surface-elevated rounded-2xl border border-slate-200/80 shadow-soft flex flex-col min-h-[580px]"
                      >
                        <div className={`p-4 border-b rounded-t-2xl ${stage.color} flex items-center justify-between`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg">{stage.icon}</span>
                            <h3 className="font-heading font-bold text-sm truncate text-slate-900">{stage.label}</h3>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs ${stage.headerBadge}`}>
                            {stageProposals.length}
                          </span>
                        </div>
                        <p className="px-4 py-2.5 text-xs text-slate-600 border-b border-slate-100 bg-slate-50/60 leading-relaxed font-medium">
                          {stage.description}
                        </p>

                        <div className="p-3.5 space-y-3 flex-1 overflow-y-auto max-h-[750px]">
                          {stageProposals.length === 0 ? (
                            <div className="py-12 px-4 text-center text-slate-400">
                              <span className="text-3xl block mb-2 opacity-50">{stage.icon}</span>
                              <p className="text-sm font-medium">No proposals in this stage</p>
                            </div>
                          ) : (
                            stageProposals.map((prop) => {
                              const timeline = getProposalReviewTimeline(prop)
                              const checklist = prop.preSubmissionChecklist || {}
                              const checklistCleared = Object.values(checklist).filter(v => v === true).length
                              return (
                                <div
                                  key={prop._id}
                                  className="bg-white rounded-xl border border-slate-200 shadow-soft p-4 hover:shadow-medium hover:border-purple-300 transition-all duration-200 group"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className="px-2.5 py-1 rounded-md font-mono text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 truncate max-w-[140px]"
                                        title={
                                          (prop.isExternalGrant
                                            ? prop.externalSubmission?.externalReferenceId
                                            : prop.agencySubmission?.agencySubmissionId) || 'No Ref ID'
                                        }
                                      >
                                        {(prop.isExternalGrant
                                          ? prop.externalSubmission?.externalReferenceId
                                          : prop.agencySubmission?.agencySubmissionId) || 'Ref: Recorded'}
                                      </span>
                                      {prop.isExternalGrant && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0" title="External Government Grant">
                                          🏛️ Govt
                                        </span>
                                      )}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border shrink-0 ${timeline.color}`}>
                                      {timeline.label}
                                    </span>
                                  </div>

                                  <h4 className="font-heading font-bold text-sm text-slate-900 group-hover:text-purple-900 transition-colors line-clamp-2 leading-snug mb-1">
                                    {prop.title}
                                  </h4>
                                  <p className="text-xs text-slate-600 font-medium truncate mb-2.5">
                                    {prop.grantAgency || 'Funding Agency'}{prop.grantTitle ? ` • ${prop.grantTitle}` : ''}
                                  </p>

                                  <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70 space-y-1.5 mb-3 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500 font-medium">Requested:</span>
                                      <strong className="text-slate-900 font-bold">{prop.fundingAmount || '—'}</strong>
                                    </div>
                                    {prop.status === 'Awarded' && prop.awardDetails?.sanctionedAmount && (
                                      <div className="flex items-center justify-between text-emerald-800 font-bold border-t border-emerald-100 pt-1.5">
                                        <span>Sanctioned:</span>
                                        <span>🏆 {prop.awardDetails.sanctionedAmount}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between pt-0.5">
                                      <span className="text-slate-500 font-medium truncate">Lead PI:</span>
                                      <span className="font-bold text-slate-800 truncate max-w-[120px]">
                                        {prop.sections?.[0]?.assignedToName || 'Lead PI Unassigned'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between text-xs text-slate-600 mb-3 pt-1 border-t border-slate-100">
                                    {prop.isExternalGrant ? (
                                      <span className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                        🏛️ {prop.externalSubmission?.portalName || 'External Portal'}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                                        ✓ {checklistCleared}/6 Pre-submission
                                      </span>
                                    )}
                                    <div className="flex items-center gap-2">
                                      {prop.isExternalGrant && prop.externalGrantLinks?.applicationUrl && (
                                        <a
                                          href={prop.externalGrantLinks.applicationUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-0.5"
                                          title="Open External Portal"
                                        >
                                          Portal ↗
                                        </a>
                                      )}
                                      <span className="text-slate-500 font-medium">
                                        {prop.externalSubmission?.appliedAt
                                          ? new Date(prop.externalSubmission.appliedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                                          : prop.agencySubmission?.submittedAt
                                            ? new Date(prop.agencySubmission.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                                            : 'Dispatched'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                                    <select
                                      value={stage.aliases.includes(prop.status) ? stage.key : prop.status}
                                      onChange={(e) => handleOpenStatusChange(prop, e.target.value)}
                                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                                      title="Update Tracking Stage"
                                    >
                                      <option value="Submitted to Agency">Submitted</option>
                                      <option value="Under Evaluation">Evaluation</option>
                                      <option value="Revisions Requested">Revisions</option>
                                      <option value="Awarded">Awarded 🏆</option>
                                      <option value="Rejected">Rejected</option>
                                    </select>

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPingPiModal(prop)
                                          setPingPiMessage('')
                                        }}
                                        className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold cursor-pointer transition-colors"
                                        title="Ping PI with status update or referee feedback"
                                      >
                                        💬
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleExportPDF(prop)}
                                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer transition-colors"
                                        title="Download Dossier PDF"
                                      >
                                        📄
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setTimelineModal(prop)}
                                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer transition-colors"
                                        title="View Stage Progression Audit"
                                      >
                                        🕒
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-surface-elevated rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden animate-fade-in">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-4 px-4">Proposal & Agency Ref ID</th>
                          <th className="py-4 px-4">Agency & Grant Call</th>
                          <th className="py-4 px-4">Principal Investigator</th>
                          <th className="py-4 px-4">Requested</th>
                          <th className="py-4 px-4">Sanctioned</th>
                          <th className="py-4 px-4">Timeline / Flag</th>
                          <th className="py-4 px-4">Compliance</th>
                          <th className="py-4 px-4">Current Status</th>
                          <th className="py-4 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 font-sans">
                        {trackedProposals.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="py-12 text-center text-slate-500 font-medium">
                              No proposals match your search or filter criteria.
                            </td>
                          </tr>
                        ) : (
                          trackedProposals.map((prop) => {
                            const timeline = getProposalReviewTimeline(prop)
                            const checklist = prop.preSubmissionChecklist || {}
                            const checklistCleared = Object.values(checklist).filter(v => v === true).length
                            return (
                              <tr key={prop._id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-4 px-4">
                                  <p className="font-heading font-bold text-slate-900 line-clamp-1 max-w-[220px]" title={prop.title}>
                                    {prop.title}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block">
                                      {(prop.isExternalGrant
                                        ? prop.externalSubmission?.externalReferenceId
                                        : prop.agencySubmission?.agencySubmissionId) || 'Ref: Dispatched'}
                                    </span>
                                    {prop.isExternalGrant && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        🏛️ Govt
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-slate-700 font-medium">
                                  <p className="font-bold text-slate-900">{prop.grantAgency || 'Funding Agency'}</p>
                                  <p className="text-xs text-slate-500 font-medium truncate max-w-[150px] mt-0.5">{prop.grantTitle}</p>
                                </td>
                                <td className="py-4 px-4 text-slate-800">
                                  <p className="font-bold text-slate-900">{prop.sections?.[0]?.assignedToName || 'Lead PI Unassigned'}</p>
                                  <p className="text-xs text-slate-500 font-medium">Lead Investigator</p>
                                </td>
                                <td className="py-4 px-4 font-bold text-slate-900">
                                  {prop.fundingAmount || '—'}
                                </td>
                                <td className="py-4 px-4">
                                  {prop.awardDetails?.sanctionedAmount ? (
                                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-xs">
                                      🏆 {prop.awardDetails.sanctionedAmount}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-xs font-medium">Pending</span>
                                  )}
                                </td>
                                <td className="py-4 px-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${timeline.color}`}>
                                    {timeline.label}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  {prop.isExternalGrant ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        🏛️ {prop.externalSubmission?.portalName || 'External Portal'}
                                      </span>
                                      {prop.externalGrantLinks?.applicationUrl && (
                                        <a
                                          href={prop.externalGrantLinks.applicationUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 text-xs font-bold hover:underline"
                                          title="Open Application Portal"
                                        >
                                          ↗
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                      ✓ {checklistCleared}/6 Pre-submission
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-4">
                                  <select
                                    value={prop.status}
                                    onChange={(e) => handleOpenStatusChange(prop, e.target.value)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none cursor-pointer shadow-xs"
                                  >
                                    <option value="Submitted to Agency">Submitted to Agency</option>
                                    <option value="Under Evaluation">Under Evaluation</option>
                                    <option value="Revisions Requested">Revisions Requested</option>
                                    <option value="Awarded">Awarded 🏆</option>
                                    <option value="Rejected">Rejected</option>
                                  </select>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPingPiModal(prop)
                                        setPingPiMessage('')
                                      }}
                                      className="p-1.5 rounded-[8px] bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold cursor-pointer transition-colors"
                                      title="Ping PI with message"
                                    >
                                      💬 Ping
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleExportPDF(prop)}
                                      className="p-1.5 rounded-[8px] bg-warm-gray-100 hover:bg-warm-gray-200 text-warm-gray-700 border border-warm-gray-200 text-xs font-bold cursor-pointer transition-colors"
                                      title="Export Dossier PDF"
                                    >
                                      📄 PDF
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setTimelineModal(prop)}
                                      className="p-1.5 rounded-[8px] bg-warm-gray-100 hover:bg-warm-gray-200 text-warm-gray-700 border border-warm-gray-200 text-xs font-bold cursor-pointer transition-colors"
                                      title="Audit Timeline"
                                    >
                                      🕒
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════ TEAM MANAGEMENT ═══════════════════════════════════ */}
          {activeSection === 'team' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Team Management</h1>
                <p className="text-warm-gray-500">Manage team members and assign tasks</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Total Members', value: memberCounts.total, icon: '👥', color: 'bg-blue-50' },
                  { label: 'Verified', value: memberCounts.verified, icon: '✅', color: 'bg-green-50' },
                  { label: 'Pending', value: memberCounts.pending, icon: '⏳', color: 'bg-amber-50' },
                ].map((s) => (
                  <div key={s.label} className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 text-center">
                    <span className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-lg mx-auto mb-2 ${s.color}`}>{s.icon}</span>
                    <p className="font-heading text-2xl font-bold text-warm-gray-900">{s.value}</p>
                    <p className="text-xs text-warm-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {membersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {pendingMembers.length > 0 && (
                    <div className="mb-8">
                      <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-amber">⏳</span> Pending Verification
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber text-xs font-bold border border-amber/15">{pendingMembers.length}</span>
                      </h2>
                      <div className="space-y-3">
                        {pendingMembers.map((m, i) => (
                          <div key={m._id} className="bg-surface-elevated rounded-[16px] border border-amber/20 shadow-soft p-5 flex items-center justify-between animate-fade-up" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center text-amber font-bold">
                                {m.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-warm-gray-900">{m.fullName}</p>
                                <p className="text-sm text-warm-gray-500">{m.email}</p>
                                <p className="text-xs text-warm-gray-400 mt-0.5">Joined: {new Date(m.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleVerifyMember(m._id)}
                                disabled={actionLoading === m._id}
                                className="px-4 py-2 rounded-[10px] text-sm font-semibold text-white bg-primary hover:bg-primary-dark shadow-soft transition-all duration-200 cursor-pointer disabled:opacity-50"
                              >
                                {actionLoading === m._id ? '...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleRejectMember(m._id)}
                                disabled={actionLoading === m._id}
                                className="px-4 py-2 rounded-[10px] text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all duration-200 cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-primary">✅</span> Verified Members
                      <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary text-xs font-bold border border-primary/15">{verifiedMembers.length}</span>
                    </h2>
                    {verifiedMembers.length === 0 ? (
                      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-10 text-center">
                        <span className="text-4xl mb-3 block">👥</span>
                        <p className="text-warm-gray-500">No verified team members yet</p>
                        <p className="text-sm text-warm-gray-400 mt-1">Approve pending requests to add members</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {verifiedMembers.map((m, i) => (
                          <div key={m._id} className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 animate-fade-up" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold">
                                  {m.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-warm-gray-900">{m.fullName}</p>
                                  <p className="text-sm text-warm-gray-500">{m.email}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  onClick={() => openTaskModal(m)}
                                  className="px-4 py-2 rounded-[10px] text-sm font-semibold text-primary bg-primary-50 hover:bg-primary-100 border border-primary/15 transition-all duration-200 cursor-pointer"
                                >
                                  {m.assignedTasks?.length > 0 ? 'Edit Tasks' : 'Assign Tasks'}
                                </button>
                                <button
                                  onClick={() => openViewTasksModal(m)}
                                  className="px-4 py-2 rounded-[10px] text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-soft"
                                >
                                  <span>View Tasks</span>
                                </button>
                              </div>
                            </div>
                            {m.assignedTasks?.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3 pl-15">
                                {m.assignedTasks.map((t) => {
                                  const taskInfo = TASK_TYPES.find((tt) => tt.key === t)
                                  return taskInfo ? (
                                    <span key={t} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${taskInfo.color}`}>
                                      {taskInfo.icon} {taskInfo.label}
                                    </span>
                                  ) : null
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════ DEADLINES & FOLLOW-UP SCHEDULER ═══════════════════════════════════ */}
          {activeSection === 'deadlines' && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      Real-Time Alert Engine
                    </span>
                    <span className="text-xs text-warm-gray-400">•</span>
                    <span className="text-xs text-warm-gray-500 font-medium">Automatic Follow-up Scheduler</span>
                  </div>
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold text-warm-gray-900">
                    Deadline Alerts & Follow-up Scheduler
                  </h1>
                  <p className="text-xs text-warm-gray-500 mt-1 max-w-2xl leading-relaxed">
                    Monitor live grant submission deadlines, track post-submission review overdue triggers (&gt;60d / &gt;90d), and schedule custom institutional reminders with real-time alerts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCreateReminderModal(true)}
                  className="px-4 py-2.5 rounded-[12px] bg-gradient-to-r from-primary to-primary-light hover:opacity-95 text-white text-xs font-bold shadow-soft transition-all cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-auto"
                >
                  <span>📅</span> + Schedule Custom Reminder
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider">Critical Deadlines</span>
                    <span className="w-8 h-8 rounded-[8px] bg-rose-50 text-rose-700 flex items-center justify-center text-sm font-bold">🚨</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-rose-700">{deadlineMetrics.criticalAlertsCount}</p>
                  <p className="text-xs text-warm-gray-500 mt-1">&lt;7 days to deadline or query pending</p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
                </div>

                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider">Upcoming Deadlines</span>
                    <span className="w-8 h-8 rounded-[8px] bg-amber-50 text-amber-800 flex items-center justify-center text-sm font-bold">⚠️</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-amber-800">{deadlineMetrics.upcomingCount}</p>
                  <p className="text-xs text-warm-gray-500 mt-1">Due in 7 to 30 days (Active drafting)</p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
                </div>

                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider">Agency Follow-ups</span>
                    <span className="w-8 h-8 rounded-[8px] bg-purple-50 text-purple-700 flex items-center justify-center text-sm font-bold">🔴</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-purple-900">{deadlineMetrics.overdueFollowupCount}</p>
                  <p className="text-xs text-warm-gray-500 mt-1">&gt;90d in agency review (Enquiry due)</p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
                </div>

                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider">Scheduled Tasks</span>
                    <span className="w-8 h-8 rounded-[8px] bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">📅</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-emerald-800">{deadlineMetrics.activeRemindersCount}</p>
                  <p className="text-xs text-warm-gray-500 mt-1">Active team reminders & audits</p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                </div>
              </div>

              <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-4 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex-1 w-full relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-gray-400 text-sm">🔍</span>
                  <input
                    type="text"
                    value={deadlineSearch}
                    onChange={(e) => setDeadlineSearch(e.target.value)}
                    placeholder="Search alerts by proposal title, funding agency, investigator, or note..."
                    className="w-full pl-10 pr-4 py-2 rounded-[10px] border border-warm-gray-200 bg-cream/40 text-xs font-medium text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all placeholder:text-warm-gray-400"
                  />
                  {deadlineSearch && (
                    <button
                      onClick={() => setDeadlineSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray-400 hover:text-warm-gray-700 text-xs cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                  {[
                    { key: 'all', label: `All Alerts (${allAlerts.length})` },
                    { key: 'critical', label: `🚨 Critical (${deadlineMetrics.criticalAlertsCount})` },
                    { key: 'deadlines', label: '🏛️ Call Deadlines' },
                    { key: 'followups', label: '🔍 Agency Follow-Ups' },
                    { key: 'custom', label: `📅 Scheduled (${deadlineMetrics.activeRemindersCount})` },
                    { key: 'completed', label: '✓ Completed' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setDeadlineTab(tab.key)}
                      className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${deadlineTab === tab.key
                        ? 'bg-warm-gray-900 text-white shadow-xs'
                        : 'bg-cream/70 text-warm-gray-600 hover:bg-cream hover:text-warm-gray-900 border border-warm-gray-200/50'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3.5">
                {filteredAlerts.length === 0 ? (
                  <div className="bg-surface-elevated rounded-[18px] border border-warm-gray-200/70 shadow-soft py-16 px-6 text-center animate-fade-in">
                    <span className="text-4xl block mb-2">🎉</span>
                    <h3 className="font-heading font-bold text-base text-warm-gray-800">All Clear — No Alerts Found!</h3>
                    <p className="text-xs text-warm-gray-400 mt-1 max-w-md mx-auto">
                      There are no active deadlines, overdue agency follow-ups, or scheduled reminders matching this filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCreateReminderModal(true)}
                      className="mt-4 px-4 py-2 rounded-[10px] bg-primary text-white font-bold text-xs hover:bg-primary-dark transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-soft"
                    >
                      <span>📅</span> Schedule a New Reminder
                    </button>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`bg-surface-elevated rounded-[16px] border border-warm-gray-200/80 shadow-soft p-5 hover:shadow-medium hover:border-warm-gray-300 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden ${alert.isCompleted ? 'opacity-60 bg-cream/20' : ''
                        }`}
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1.5 ${alert.urgency === 'critical'
                          ? 'bg-rose-500'
                          : alert.urgency === 'upcoming'
                            ? 'bg-amber-400'
                            : alert.isCompleted
                              ? 'bg-emerald-500'
                              : 'bg-purple-500'
                          }`}
                      />

                      <div className="flex items-start gap-4 flex-1 min-w-0 pl-1">
                        <div
                          className={`w-11 h-11 rounded-[12px] flex items-center justify-center text-lg shrink-0 border ${alert.type === 'grant_deadline'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : alert.type === 'agency_followup'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                        >
                          {alert.type === 'grant_deadline' ? '🏛️' : alert.type === 'agency_followup' ? '🔍' : '⏰'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${alert.badgeColor}`}>
                              {alert.urgencyLabel}
                            </span>

                            <span className="px-2 py-0.5 rounded-[6px] text-xs font-semibold bg-cream border border-warm-gray-200 text-warm-gray-600">
                              {alert.type === 'grant_deadline'
                                ? 'Grant Call Deadline'
                                : alert.type === 'agency_followup'
                                  ? 'Agency Review Trigger'
                                  : `Custom: ${alert.reminderType.replace('_', ' ')}`}
                            </span>

                            {alert.agency && (
                              <span className="text-xs font-bold text-warm-gray-700">
                                {alert.agency}
                              </span>
                            )}
                          </div>

                          <h4 className="font-heading font-bold text-sm text-warm-gray-900 leading-snug line-clamp-1 mb-1">
                            {alert.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-warm-gray-500">
                            {alert.grantTitle && (
                              <span className="truncate max-w-[240px]">
                                Call: <strong className="text-warm-gray-700">{alert.grantTitle}</strong>
                              </span>
                            )}
                            {alert.piName && (
                              <span>
                                PI: <strong className="text-warm-gray-700">{alert.piName}</strong>
                              </span>
                            )}
                            {alert.recipientName && (
                              <span>
                                For: <strong className="text-warm-gray-700">{alert.recipientName}</strong>
                              </span>
                            )}
                            {alert.refId && (
                              <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                Ref #{alert.refId}
                              </span>
                            )}
                          </div>

                          {alert.type === 'grant_deadline' && (
                            <div className="mt-2.5 max-w-xs flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-warm-gray-100 overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 rounded-full"
                                  style={{ width: `${alert.progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-warm-gray-400 font-bold shrink-0">
                                {alert.approvedSections}/{alert.totalSections} sections approved
                              </span>
                            </div>
                          )}

                          {alert.notes && (
                            <p className="mt-1.5 text-xs text-warm-gray-600 bg-cream/40 p-2 rounded-[8px] border border-warm-gray-200/50 italic leading-relaxed">
                              "{alert.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end">
                        {alert.type === 'grant_deadline' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProposalId(alert.proposalId)
                                navigateToSection('proposals')
                              }}
                              className="px-3 py-1.5 rounded-[10px] bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <span>📝</span> Open Workspace
                            </button>
                            <button
                              type="button"
                              onClick={() => setPingPiModal(alert.proposal)}
                              className="px-3 py-1.5 rounded-[10px] bg-white hover:bg-cream text-warm-gray-700 border border-warm-gray-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <span>💬</span> Ping PI
                            </button>
                            <button
                              type="button"
                              disabled={sendingEmailAlertId === alert.proposalId}
                              onClick={() => handleSendDeadlineEmailAlert(alert.proposalId, alert.title)}
                              className={`px-3 py-1.5 rounded-[10px] font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50 ${alert.urgency === 'critical'
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                                : 'bg-white hover:bg-purple-50 text-warm-gray-700 border border-warm-gray-300 hover:border-purple-300'
                                }`}
                              title={
                                alert.urgency === 'critical'
                                  ? 'Send Urgent Critical Deadline Email (<7 days left)'
                                  : 'Send Deadline Reminder Email to Lead PI & Assigned Team'
                              }
                            >
                              <span>{alert.urgency === 'critical' ? '🚨' : '📧'}</span>
                              {sendingEmailAlertId === alert.proposalId
                                ? 'Sending...'
                                : alert.urgency === 'critical'
                                  ? 'Email PI (Urgent)'
                                  : 'Email PI'}
                            </button>
                          </>
                        )}

                        {alert.type === 'agency_followup' && (
                          <>
                            {alert.needsFollowupLetter && (
                              <button
                                type="button"
                                onClick={() => setFollowupLetterModal(alert.proposal)}
                                className="px-3 py-1.5 rounded-[10px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs shadow-soft transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>📄</span> Generate Follow-up Letter
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => navigateToSection('tracking')}
                              className="px-3 py-1.5 rounded-[10px] bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <span>📊</span> Tracking Board
                            </button>
                            <button
                              type="button"
                              onClick={() => setPingPiModal(alert.proposal)}
                              className="px-3 py-1.5 rounded-[10px] bg-white hover:bg-cream text-warm-gray-700 border border-warm-gray-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <span>💬</span> Ping PI
                            </button>
                          </>
                        )}

                        {alert.type === 'custom_reminder' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleReminder(alert.reminderObj._id)}
                              className={`px-3 py-1.5 rounded-[10px] font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-xs border ${alert.isCompleted
                                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                }`}
                            >
                              <span>{alert.isCompleted ? '↩️ Reopen' : '✓ Mark Complete'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReminder(alert.reminderObj._id)}
                              className="px-2.5 py-1.5 rounded-[10px] bg-white hover:bg-rose-50 text-warm-gray-500 hover:text-rose-600 border border-warm-gray-200 text-xs transition-all cursor-pointer shadow-xs"
                              title="Delete Reminder"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════ ANALYTICS ═══════════════════════════════════ */}
          {activeSection === 'analytics' && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                      Institutional Intelligence Suite
                    </span>
                    <span className="text-xs text-warm-gray-400">•</span>
                    <span className="text-xs text-warm-gray-500 font-medium">Real-Time Data Engine</span>
                  </div>
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold text-warm-gray-900">
                    Grant Analytics & Institutional Portfolio
                  </h1>
                  <p className="text-xs text-warm-gray-500 mt-1 max-w-2xl leading-relaxed">
                    Real-time capital tracking, agency funding allocation, faculty contribution velocity, and grant award outcomes.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="flex items-center p-1 bg-white rounded-[12px] border border-warm-gray-200/80 shadow-xs">
                    {[
                      { key: 'all', label: 'All Time' },
                      { key: 'fy26', label: 'FY 2026–27' },
                      { key: 'past12m', label: 'Past 12M' },
                    ].map((tf) => (
                      <button
                        key={tf.key}
                        type="button"
                        onClick={() => setAnalyticsTimeframe(tf.key)}
                        className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${analyticsTimeframe === tf.key
                          ? 'bg-primary text-white shadow-soft'
                          : 'text-warm-gray-600 hover:text-warm-gray-900 hover:bg-cream/60'
                          }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 rounded-[12px] bg-white border border-warm-gray-200 text-warm-gray-700 hover:bg-cream text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    title="Export / Print Institutional Portfolio Dossier"
                  >
                    <span>🖨️</span> Print Dossier
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider">Pipeline Capital</span>
                    <span className="w-8 h-8 rounded-[8px] bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">💰</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-warm-gray-900">
                    {formatCurrency(analyticsData.totalPipelineValue)}
                  </p>
                  <p className="text-xs text-warm-gray-500 mt-1">
                    {analyticsData.totalProposals} Active Grant Proposals
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                </div>

                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider">Awarded Capital</span>
                    <span className="w-8 h-8 rounded-[8px] bg-amber-50 text-amber-800 flex items-center justify-center text-sm font-bold">🏆</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-amber-700">
                    {formatCurrency(analyticsData.totalAwardedValue)}
                  </p>
                  <p className="text-xs text-warm-gray-500 mt-1">
                    {analyticsData.countAwarded} Grants Sanctioned
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-500" />
                </div>

                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider">Win Rate</span>
                    <span className="w-8 h-8 rounded-[8px] bg-purple-50 text-purple-700 flex items-center justify-center text-sm font-bold">🎯</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-purple-800">
                    {analyticsData.winRate}%
                  </p>
                  <p className="text-xs text-warm-gray-500 mt-1">
                    {analyticsData.countAwarded} Won • {analyticsData.countRejected} Declined
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
                </div>

                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider">In Peer Review</span>
                    <span className="w-8 h-8 rounded-[8px] bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold">🔍</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-blue-900">
                    {formatCurrency(analyticsData.totalUnderReviewValue)}
                  </p>
                  <p className="text-xs text-warm-gray-500 mt-1">
                    {analyticsData.countUnderReview + analyticsData.countRevisions} Proposals In Agency Evaluation
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                </div>

                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-warm-gray-600 uppercase tracking-wider">Writing Clearance</span>
                    <span className="w-8 h-8 rounded-[8px] bg-rose-50 text-rose-700 flex items-center justify-center text-sm font-bold">⚡</span>
                  </div>
                  <p className="font-heading text-2xl font-bold text-rose-700">
                    {analyticsData.overallWritingProgress}%
                  </p>
                  <p className="text-xs text-warm-gray-500 mt-1">
                    {analyticsData.approvedSections}/{analyticsData.totalSections} Sections Approved
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {analyticsData.insights.map((ins, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-[14px] bg-white border border-warm-gray-200/70 shadow-xs flex items-start gap-3 hover:border-purple-200 transition-all"
                  >
                    <span className="text-xl shrink-0 p-2 rounded-[10px] bg-cream/70 border border-warm-gray-200/40">
                      {ins.icon}
                    </span>
                    <div>
                      <h4 className="font-heading font-bold text-xs text-warm-gray-900 leading-snug">
                        {ins.title}
                      </h4>
                      <p className="text-xs text-warm-gray-500 mt-0.5 leading-relaxed">
                        {ins.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-surface-elevated rounded-[18px] border border-warm-gray-200/70 shadow-soft p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-warm-gray-200/80 mb-5">
                  <div>
                    <h3 className="font-heading font-bold text-base text-warm-gray-900 flex items-center gap-2">
                      <span>📊</span> Grant Proposal Lifecycle & Capital Realization Funnel
                    </h3>
                    <p className="text-xs text-warm-gray-500 mt-0.5">
                      Visual progression of institutional proposals from formulation to agency sanction.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-warm-gray-600 bg-cream px-3 py-1 rounded-[8px] border border-warm-gray-200">
                    Total Portfolio: {formatCurrency(analyticsData.totalPipelineValue)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    {
                      label: 'Formulation & Drafting',
                      count: analyticsData.countDrafting,
                      amount: analyticsData.totalDraftingValue,
                      icon: '📝',
                      badge: 'Internal Phase',
                      color: 'border-slate-300 bg-slate-50/60 text-slate-800',
                      barColor: 'bg-slate-400',
                    },
                    {
                      label: 'Agency Peer Review',
                      count: analyticsData.countUnderReview,
                      amount: analyticsData.totalUnderReviewValue,
                      icon: '🏛️',
                      badge: 'Peer Review',
                      color: 'border-blue-300 bg-blue-50/60 text-blue-900',
                      barColor: 'bg-blue-500',
                    },
                    {
                      label: 'Revisions Requested',
                      count: analyticsData.countRevisions,
                      amount: 0,
                      icon: '⚠️',
                      badge: 'Queries Active',
                      color: 'border-amber-300 bg-amber-50/60 text-amber-900',
                      barColor: 'bg-amber-500',
                    },
                    {
                      label: 'Sanctioned & Awarded',
                      count: analyticsData.countAwarded,
                      amount: analyticsData.totalAwardedValue,
                      icon: '🏆',
                      badge: 'Sanctioned Funds',
                      color: 'border-emerald-300 bg-emerald-50/60 text-emerald-900',
                      barColor: 'bg-emerald-600',
                    },
                    {
                      label: 'Closed / Not Shortlisted',
                      count: analyticsData.countRejected,
                      amount: 0,
                      icon: '❌',
                      badge: 'Archived',
                      color: 'border-warm-gray-200 bg-warm-gray-50/60 text-warm-gray-700',
                      barColor: 'bg-warm-gray-400',
                    },
                  ].map((stg) => {
                    const pctOfTotal = analyticsData.totalProposals > 0
                      ? Math.round((stg.count / analyticsData.totalProposals) * 100)
                      : 0
                    return (
                      <div
                        key={stg.label}
                        className={`p-4 rounded-[14px] border ${stg.color} relative overflow-hidden flex flex-col justify-between`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base">{stg.icon}</span>
                            <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                              {stg.badge}
                            </span>
                          </div>
                          <p className="font-heading font-bold text-xs text-warm-gray-900 line-clamp-1">
                            {stg.label}
                          </p>
                          <div className="flex items-baseline gap-1.5 mt-2">
                            <span className="font-heading text-2xl font-bold">
                              {stg.count}
                            </span>
                            <span className="text-xs text-warm-gray-500 font-semibold">
                              ({pctOfTotal}%)
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-black/5">
                          <p className="text-xs font-mono font-bold text-warm-gray-800 truncate">
                            {stg.amount > 0 ? formatCurrency(stg.amount) : `${stg.count} Projects`}
                          </p>
                          <div className="w-full h-1.5 rounded-full bg-black/10 overflow-hidden mt-1.5">
                            <div
                              className={`h-full rounded-full ${stg.barColor} transition-all duration-700`}
                              style={{ width: `${pctOfTotal}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-surface-elevated rounded-[18px] border border-warm-gray-200/70 shadow-soft p-6">
                  <div className="flex items-center justify-between pb-3 border-b border-warm-gray-200/80 mb-4">
                    <div>
                      <h3 className="font-heading font-bold text-sm text-warm-gray-900 flex items-center gap-2">
                        <span>🏛️</span> Funding Partner Capital Allocation
                      </h3>
                      <p className="text-xs text-warm-gray-500 mt-0.5">
                        Portfolio capital requested and sanctioned broken down by funding agency.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                      {analyticsData.sortedAgencies.length} Partner Agencies
                    </span>
                  </div>

                  {analyticsData.sortedAgencies.length === 0 ? (
                    <div className="py-12 text-center text-xs text-warm-gray-400">
                      No funding agency data available for this timeframe.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analyticsData.sortedAgencies.map((agency) => {
                        const agencySharePct = analyticsData.totalPipelineValue > 0
                          ? Math.round((agency.totalRequested / analyticsData.totalPipelineValue) * 100)
                          : 0
                        return (
                          <div
                            key={agency.name}
                            className="p-3.5 rounded-[12px] bg-white border border-warm-gray-200/60 hover:border-purple-200 transition-all shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-warm-gray-900">
                                  {agency.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cream text-warm-gray-600 border border-warm-gray-200">
                                  {agency.count} {agency.count === 1 ? 'Proposal' : 'Proposals'}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-xs text-warm-gray-900">
                                  {formatCurrency(agency.totalRequested)}
                                </span>
                                <span className="text-xs text-warm-gray-400 ml-1.5">
                                  ({agencySharePct}%)
                                </span>
                              </div>
                            </div>

                            <div className="w-full h-2 rounded-full bg-warm-gray-100 overflow-hidden my-1.5">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-700"
                                style={{ width: `${Math.max(5, agencySharePct)}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-xs text-warm-gray-500 pt-1">
                              <span>
                                Sanctioned Value: <strong className="text-emerald-700">{agency.totalAwarded > 0 ? formatCurrency(agency.totalAwarded) : '₹0'}</strong>
                              </span>
                              <span>
                                {agency.proposals.some((p) => ['Awarded', 'Accepted'].includes(p.status)) ? (
                                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                                    <span>🏆</span> Award Won
                                  </span>
                                ) : (
                                  <span className="text-warm-gray-400">Under Review / Drafting</span>
                                )}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 bg-surface-elevated rounded-[18px] border border-warm-gray-200/70 shadow-soft p-6 flex flex-col justify-between">
                  <div>
                    <div className="pb-3 border-b border-warm-gray-200/80 mb-4">
                      <h3 className="font-heading font-bold text-sm text-warm-gray-900 flex items-center gap-2">
                        <span>⚡</span> 17-Section Template Writing Velocity
                      </h3>
                      <p className="text-xs text-warm-gray-500 mt-0.5">
                        Aggregate clearance status across all institutional proposal sections.
                      </p>
                    </div>

                    <div className="flex items-center justify-center py-4">
                      <div className="relative w-36 h-36">
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
                            stroke="url(#gradient-analytics-ring)"
                            strokeWidth="3.2"
                            strokeDasharray={`${analyticsData.overallWritingProgress}, 100`}
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="gradient-analytics-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#4a7c59" />
                              <stop offset="100%" stopColor="#7c3aed" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="font-heading text-3xl font-bold text-warm-gray-900">
                            {analyticsData.overallWritingProgress}%
                          </span>
                          <span className="text-xs font-bold text-warm-gray-400 uppercase tracking-wider">
                            Clearance
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 mt-2">
                      <div className="p-2.5 rounded-[10px] bg-emerald-50/70 border border-emerald-200">
                        <span className="text-xs font-bold text-emerald-800 uppercase block">Approved</span>
                        <p className="font-heading font-bold text-lg text-emerald-950 mt-0.5">
                          {analyticsData.approvedSections}
                        </p>
                        <span className="text-xs text-emerald-700">Signed off by Admin / PI</span>
                      </div>

                      <div className="p-2.5 rounded-[10px] bg-purple-50/70 border border-purple-200">
                        <span className="text-xs font-bold text-purple-800 uppercase block">Ready for Review</span>
                        <p className="font-heading font-bold text-lg text-purple-950 mt-0.5">
                          {analyticsData.reviewSections}
                        </p>
                        <span className="text-xs text-purple-700">Awaiting internal sign-off</span>
                      </div>

                      <div className="p-2.5 rounded-[10px] bg-amber-50/70 border border-amber-200">
                        <span className="text-xs font-bold text-amber-800 uppercase block">In Progress</span>
                        <p className="font-heading font-bold text-lg text-amber-950 mt-0.5">
                          {analyticsData.inProgressSections}
                        </p>
                        <span className="text-xs text-amber-700">Active faculty drafting</span>
                      </div>

                      <div className="p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 uppercase block">Not Started</span>
                        <p className="font-heading font-bold text-lg text-slate-900 mt-0.5">
                          {analyticsData.notStartedSections}
                        </p>
                        <span className="text-xs text-slate-500">Unallocated or blank</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-warm-gray-400 text-center mt-4 pt-3 border-t border-warm-gray-100">
                    Proposals require 100% of statutory compliance checklists verified prior to agency dispatch.
                  </p>
                </div>
              </div>

              {/* Monthly Grant Trajectory & Submission Velocity in Analytics Suite */}
              <div className="bg-surface-elevated rounded-[18px] border border-warm-gray-200/70 shadow-soft p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-warm-gray-200/80 mb-5">
                  <div>
                    <h3 className="font-heading font-bold text-base text-warm-gray-900 flex items-center gap-2">
                      <span>📈</span> Monthly Grant Trajectory & Submission Velocity
                    </h3>
                    <p className="text-xs text-warm-gray-500 mt-0.5">
                      Longitudinal research capital realization and dossier formulation velocity.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200">
                    Institutional Growth Engine
                  </span>
                </div>

                <MonthlyGrantTrajectoryChart
                  proposals={orgProposals}
                  formatCurrency={formatCurrency}
                  parseAmountToNumber={parseAmountToNumber}
                />
              </div>

              <div className="bg-surface-elevated rounded-[18px] border border-warm-gray-200/70 shadow-soft p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-warm-gray-200/80 mb-4">
                  <div>
                    <h3 className="font-heading font-bold text-base text-warm-gray-900 flex items-center gap-2">
                      <span>👥</span> Faculty & Lead Investigator Grant Performance Leaderboard
                    </h3>
                    <p className="text-xs text-warm-gray-500 mt-0.5">
                      Individual investigator workload, authored proposals, template section velocity, and funding capital handled.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                    {analyticsData.facultyLeaderboard.length} Contributing Investigators
                  </span>
                </div>

                {analyticsData.facultyLeaderboard.length === 0 ? (
                  <div className="py-12 text-center text-xs text-warm-gray-400">
                    Assign proposal sections in Proposal Management to view faculty analytics.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-cream/60 border-b border-warm-gray-200 text-xs font-bold text-warm-gray-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Faculty Investigator</th>
                          <th className="py-3 px-4">Designation / Role</th>
                          <th className="py-3 px-4 text-center">Authored Proposals</th>
                          <th className="py-3 px-4">Sections Completed</th>
                          <th className="py-3 px-4">Pipeline Value</th>
                          <th className="py-3 px-4 text-center">Awards Won</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-warm-gray-200/60 font-sans">
                        {analyticsData.facultyLeaderboard.map((faculty, idx) => (
                          <tr key={faculty.id || idx} className="hover:bg-cream/30 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-900 font-bold flex items-center justify-center text-xs shrink-0 border border-purple-200">
                                  {faculty.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-warm-gray-900">{faculty.name}</p>
                                  <p className="text-xs text-warm-gray-400 font-mono">{faculty.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-warm-gray-700">
                              {faculty.jobTitle}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-warm-gray-900">
                              {faculty.proposalsCount}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="max-w-[140px]">
                                <div className="flex items-center justify-between text-xs font-bold text-warm-gray-600 mb-1">
                                  <span>{faculty.approvedSectionsCount} of {faculty.assignedSectionsCount}</span>
                                  <span>{faculty.assignedSectionsCount > 0 ? Math.round((faculty.approvedSectionsCount / faculty.assignedSectionsCount) * 100) : 0}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-warm-gray-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-purple-600"
                                    style={{
                                      width: `${faculty.assignedSectionsCount > 0 ? (faculty.approvedSectionsCount / faculty.assignedSectionsCount) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-warm-gray-900">
                              {formatCurrency(faculty.pipelineCapital)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {faculty.awardsWon > 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300 flex items-center justify-center gap-1 w-fit mx-auto">
                                  <span>🏆</span> {faculty.awardsWon}
                                </span>
                              ) : (
                                <span className="text-warm-gray-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => navigateToSection('proposals')}
                                className="px-3 py-1 rounded-[8px] bg-white hover:bg-cream text-warm-gray-700 border border-warm-gray-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                              >
                                View Proposals
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════ PROPOSAL MANAGEMENT ═══════════════════════════════════ */}
          {activeSection === 'proposals' && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-heading text-2xl font-bold text-warm-gray-900">Proposal Management & Section Assignments</h1>
                  <p className="text-sm text-warm-gray-500 mt-1">Assign the proposal template sections to your organization's team members.</p>
                </div>
                <button
                  onClick={() => setCreateProposalModal(true)}
                  className="px-4 py-2.5 rounded-[12px] bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all shadow-soft cursor-pointer flex items-center gap-2"
                >
                  <span>+ Start New Proposal</span>
                </button>
              </div>

              {orgProposals.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-gray-400 text-xs">🔍</span>
                      <input
                        type="text"
                        value={proposalManagementSearch}
                        onChange={(e) => setProposalManagementSearch(e.target.value)}
                        placeholder="Search proposals by title, agency, or grant..."
                        className="w-full pl-9 pr-8 py-2 rounded-[10px] border border-warm-gray-200 bg-cream/40 text-xs text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 placeholder:text-warm-gray-400"
                      />
                      {proposalManagementSearch && (
                        <button
                          onClick={() => setProposalManagementSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray-400 hover:text-warm-gray-700 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-warm-gray-400 font-medium">
                      Showing {orgProposals.filter(p => !proposalManagementSearch.trim() || (p.title || '').toLowerCase().includes(proposalManagementSearch.toLowerCase()) || (p.grantAgency || '').toLowerCase().includes(proposalManagementSearch.toLowerCase())).length} of {orgProposals.length} proposals
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-warm-gray-200/60">
                    {orgProposals
                      .filter((p) => {
                        if (!proposalManagementSearch.trim()) return true
                        const q = proposalManagementSearch.toLowerCase().trim()
                        return (
                          (p.title || '').toLowerCase().includes(q) ||
                          (p.grantTitle || '').toLowerCase().includes(q) ||
                          (p.grantAgency || '').toLowerCase().includes(q)
                        )
                      })
                      .map((prop) => (
                        <button
                          key={prop._id}
                          onClick={() => {
                            setSelectedProposalId(prop._id)
                            setPdfNotSubmittedMsg(null)
                          }}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border whitespace-nowrap flex items-center gap-1.5 ${selectedProposalObj?._id === prop._id
                            ? 'bg-purple-600 text-white border-purple-600 shadow-soft'
                            : 'bg-white text-warm-gray-700 border-warm-gray-200 hover:bg-warm-gray-50'
                            }`}
                        >
                          <span>{prop.status === 'Awarded' ? '🏆' : prop.status === 'Submitted to Agency' ? '🏛️' : prop.status === 'Under Evaluation' ? '🔍' : '📝'}</span>
                          {prop.title}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {selectedProposalObj ? (
                <div className="space-y-6">
                  <div className="bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-soft p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            17-Section Master Template
                          </span>
                          {selectedProposalObj.isExternalGrant && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <span>🏛️</span> External Govt. Grant
                            </span>
                          )}
                          {selectedProposalObj.status === 'Submitted to Agency' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-soft">
                              {selectedProposalObj.isExternalGrant
                                ? `🏛️ Applied Externally (Ref: ${selectedProposalObj.externalSubmission?.externalReferenceId || selectedProposalObj.agencySubmission?.agencySubmissionId || 'Recorded'})`
                                : `🏛️ Submitted to Agency (Ref: ${selectedProposalObj.agencySubmission?.agencySubmissionId || 'Dispatched'})`}
                            </span>
                          ) : selectedProposalObj.status === 'Submitted to Admin' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200 shadow-soft animate-pulse">
                              ✓ Final Proposal Submitted by PI
                            </span>
                          ) : null}
                        </div>
                        <h2 className="font-heading text-xl font-bold text-warm-gray-900 mt-2">{selectedProposalObj.title}</h2>
                        <p className="text-xs text-warm-gray-500 mt-1">
                          Grant: <span className="font-semibold text-warm-gray-800">{selectedProposalObj.grantTitle || 'N/A'}</span> ({selectedProposalObj.grantAgency || 'Funding Agency'})
                          {selectedProposalObj.deadline && <>&nbsp;•&nbsp; Deadline: {selectedProposalObj.deadline}</>}
                        </p>
                        {/* External Grant Portal Links */}
                        {selectedProposalObj.isExternalGrant && (selectedProposalObj.externalGrantLinks?.applicationUrl || selectedProposalObj.externalGrantLinks?.infoUrl || selectedProposalObj.externalGrantLinks?.guidelinesUrl) && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {selectedProposalObj.externalGrantLinks.applicationUrl && (
                              <a href={selectedProposalObj.externalGrantLinks.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 hover:bg-blue-100 transition-colors">
                                🌐 Apply on Portal ↗
                              </a>
                            )}
                            {selectedProposalObj.externalGrantLinks.infoUrl && (
                              <a href={selectedProposalObj.externalGrantLinks.infoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warm-gray-50 text-warm-gray-700 text-xs font-semibold border border-warm-gray-200 hover:bg-warm-gray-100 transition-colors">
                                📋 Grant Info ↗
                              </a>
                            )}
                            {selectedProposalObj.externalGrantLinks.guidelinesUrl && (
                              <a href={selectedProposalObj.externalGrantLinks.guidelinesUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warm-gray-50 text-warm-gray-700 text-xs font-semibold border border-warm-gray-200 hover:bg-warm-gray-100 transition-colors">
                                📄 Guidelines ↗
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            if (
                              selectedProposalObj.status !== 'Submitted to Admin' &&
                              selectedProposalObj.status !== 'Submitted to Agency' &&
                              selectedProposalObj.status !== 'Submitted'
                            ) {
                              setPdfNotSubmittedMsg(
                                'The Principal Investigator (PI) has not submitted the final proposal to Admin yet. You can only view and export the final PDF once the PI completes the section reviews and submit to Admin.'
                              )
                            } else {
                              setPdfNotSubmittedMsg(null)
                              setShowFullProposalModal(true)
                            }
                          }}
                          className="px-4.5 py-2.5 rounded-[12px] bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-all cursor-pointer flex items-center gap-2 shadow-soft"
                        >
                          <span>📄</span> View & Export Final PDF
                        </button>
                        <button
                          onClick={() => setInviteCollaboratorModal(true)}
                          className="px-4.5 py-2.5 rounded-[12px] bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-2 shadow-soft"
                        >
                          <span>👤</span> Invite External Collaborator
                        </button>
                        <button
                          onClick={() => handleAutoAssignByRolePresets(selectedProposalObj._id)}
                          className="px-4 py-2.5 rounded-[12px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold hover:shadow-medium transition-all cursor-pointer flex items-center gap-2 shadow-soft"
                        >
                          <span>✨ Auto-Assign All 17 Sections</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProposal(selectedProposalObj._id)}
                          className="px-3.5 py-2.5 rounded-[12px] bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 transition-all cursor-pointer flex items-center gap-1.5"
                          title="Delete Proposal"
                        >
                          <span>🗑️ Delete</span>
                        </button>
                      </div>
                    </div>

                    {pdfNotSubmittedMsg && (
                      <div className="mt-4 p-4 rounded-[14px] bg-amber-50 border border-amber-300 text-amber-950 flex items-start justify-between gap-3 animate-fade-in shadow-xs">
                        <div className="flex items-start gap-3">
                          <span className="text-xl leading-none mt-0.5">⚠️</span>
                          <div>
                            <p className="font-bold text-xs text-amber-900 uppercase tracking-wide">Final Proposal Not Submitted Yet</p>
                            <p className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
                              {pdfNotSubmittedMsg}
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              Current Status: <span className="font-semibold">{selectedProposalObj.status || 'In Progress'}</span> ({selectedProposalObj.progress || 0}% sections approved)
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPdfNotSubmittedMsg(null)}
                          className="text-amber-700 hover:text-amber-950 font-bold text-sm cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {(selectedProposalObj.status === 'Submitted to Admin' || selectedProposalObj.status === 'Submitted to Agency' || selectedProposalObj.status === 'Submitted') && (
                      <div className="mt-6 pt-6 border-t border-warm-gray-200/80 animate-fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base">📋</span>
                              <h3 className="font-heading text-sm font-bold text-warm-gray-900">
                                Institutional Pre-Submission Compliance Checklist
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {COMPLIANCE_CHECKLIST_ITEMS.filter((item) => selectedProposalObj.preSubmissionChecklist?.[item.key]).length} of {COMPLIANCE_CHECKLIST_ITEMS.length} Verified
                              </span>
                            </div>
                            <p className="text-xs text-warm-gray-500 mt-0.5">
                              Admin verification of statutory institutional endorsements, clearances, and auditor certifications prior to formal funding agency dispatch.
                            </p>
                          </div>

                          {selectedProposalObj.status === 'Submitted to Agency' ? (
                            <div className="px-3.5 py-2 rounded-[10px] bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                              <span>🏛️</span> {selectedProposalObj.isExternalGrant
                                ? `Applied on ${selectedProposalObj.externalSubmission?.portalName || selectedProposalObj.grantAgency || 'Government Portal'} (Ref: ${selectedProposalObj.externalSubmission?.externalReferenceId || 'Recorded'})`
                                : `Submitted to ${selectedProposalObj.grantAgency || 'Agency'} (Ref: ${selectedProposalObj.agencySubmission?.agencySubmissionId})`}
                            </div>
                          ) : selectedProposalObj.isExternalGrant ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              {selectedProposalObj.externalGrantLinks?.applicationUrl && (
                                <a
                                  href={selectedProposalObj.externalGrantLinks.applicationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3.5 py-2.5 rounded-[12px] text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <span>🌐</span> Open Portal ({selectedProposalObj.grantAgency || 'Govt'}) ↗
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setExternalSubmitData({
                                    externalReferenceId: '',
                                    portalName: selectedProposalObj.grantAgency ? `${selectedProposalObj.grantAgency} Official Portal` : '',
                                    notes: '',
                                  })
                                  setExternalSubmitModal(true)
                                }}
                                className="px-5 py-2.5 rounded-[12px] text-xs font-bold transition-all shadow-soft flex items-center gap-2 cursor-pointer bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:opacity-95 shadow-md"
                              >
                                <span>🏛️</span> Mark as Applied Externally
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedProposalObj.preSubmissionChecklist?.endorsementLetter) {
                                  alert('⚠️ Institutional Endorsement Letter (Mandatory) must be verified before submitting to the funding agency.')
                                  return
                                }
                                setSubmitAgencyModal(true)
                              }}
                              className={`px-5 py-2.5 rounded-[12px] text-xs font-bold transition-all shadow-soft flex items-center gap-2 cursor-pointer ${selectedProposalObj.preSubmissionChecklist?.endorsementLetter
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:opacity-95 shadow-md'
                                : 'bg-warm-gray-200 text-warm-gray-500 border border-warm-gray-300 cursor-not-allowed opacity-75'
                                }`}
                            >
                              <span>🚀</span> Submit to Funding Agency
                            </button>
                          )}
                        </div>

                        {selectedProposalObj.isExternalGrant && selectedProposalObj.status !== 'Submitted to Agency' && (
                          <div className="mb-4 p-3.5 rounded-[12px] bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                            <span className="text-base shrink-0">🏛️</span>
                            <div className="leading-relaxed">
                              <span className="font-bold">External Government Grant Notice ({selectedProposalObj.grantAgency || 'AICTE / DBT / DST / UGC'}):</span>
                              <p className="mt-0.5 text-amber-800">
                                This proposal targets an external government grant. Submit the complete dossier directly on the government body's official online portal. Once submitted, click <strong>"Mark as Applied Externally"</strong> above to record your reference/acknowledgement ID. The proposal will then enter your lifecycle pipeline for manual status tracking.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-cream/50 p-4 rounded-[14px] border border-warm-gray-200/80">
                          {COMPLIANCE_CHECKLIST_ITEMS.map((item) => {
                            const isChecked = Boolean(selectedProposalObj.preSubmissionChecklist?.[item.key])
                            const isLocked = selectedProposalObj.status === 'Submitted to Agency'
                            return (
                              <div
                                key={item.key}
                                onClick={() => {
                                  if (isLocked) return
                                  handleToggleChecklist(selectedProposalObj._id, item.key)
                                }}
                                className={`p-3.5 rounded-[12px] border transition-all flex items-start gap-3 select-none ${isLocked
                                  ? isChecked
                                    ? 'bg-white border-emerald-200 shadow-xs'
                                    : 'bg-warm-gray-50 border-warm-gray-200 opacity-60'
                                  : isChecked
                                    ? 'bg-white border-emerald-300 shadow-xs cursor-pointer hover:border-emerald-400'
                                    : 'bg-white border-warm-gray-200 cursor-pointer hover:border-purple-300 hover:bg-purple-50/20'
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isLocked || updatingChecklistKey === item.key}
                                  onChange={() => { }}
                                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-xs font-bold ${isChecked ? 'text-emerald-950 font-semibold' : 'text-warm-gray-900'}`}>
                                      {item.label}
                                    </span>
                                    {item.mandatory && !isChecked && (
                                      <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                                        Mandatory
                                      </span>
                                    )}
                                    {isChecked && (
                                      <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                        ✓ Verified
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-warm-gray-500 mt-1 leading-snug">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {selectedProposalObj.status === 'Submitted to Agency' && selectedProposalObj.agencySubmission && (
                          <div className="mt-3 p-4 rounded-[12px] bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                            <div className="space-y-0.5">
                              <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                                <span>🏛️</span> Official Agency Submission Record (Permanent Dossier Lock)
                              </p>
                              <p className="text-xs text-emerald-800">
                                Agency Reference ID: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 font-bold">{selectedProposalObj.agencySubmission.agencySubmissionId}</strong>
                                {selectedProposalObj.agencySubmission.submittedByName && <> &nbsp;•&nbsp; Submitted by: <strong>{selectedProposalObj.agencySubmission.submittedByName}</strong></>}
                                {selectedProposalObj.agencySubmission.submittedAt && <> &nbsp;•&nbsp; Timestamp: {new Date(selectedProposalObj.agencySubmission.submittedAt).toLocaleString()}</>}
                              </p>
                              {selectedProposalObj.agencySubmission.receiptNote && (
                                <p className="text-xs text-emerald-700 italic mt-0.5">
                                  Notes: "{selectedProposalObj.agencySubmission.receiptNote}"
                                </p>
                              )}
                            </div>
                            <span className="px-2.5 py-1 rounded-[8px] bg-white border border-emerald-300 text-emerald-800 text-xs font-bold shrink-0">
                              🔒 Dossier Read-Only
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-soft overflow-hidden">
                    <div className="px-6 py-4 border-b border-warm-gray-200/60 flex items-center justify-between bg-cream/40 flex-wrap gap-2">
                      <h3 className="font-heading font-bold text-warm-gray-900">Section Assignments ({selectedProposalObj.sections?.length || 0} Sections)</h3>
                      <button
                        onClick={() => { setSectionActionError(''); setAddSectionModalOpen(true) }}
                        className="px-3 py-1.5 rounded-[8px] bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all cursor-pointer flex items-center gap-1"
                      >
                        + Add Section
                      </button>
                    </div>

                    <div className="divide-y divide-warm-gray-200/60 max-h-[600px] overflow-y-auto">
                      {selectedProposalObj.sections?.map((sec) => (
                        <div key={sec._id} className="p-4 hover:bg-cream/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm text-warm-gray-900">{sec.title}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${sec.status === 'Ready for Review' ? 'bg-green-50 text-green-700 border-green-200 animate-pulse'
                                : sec.status === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : sec.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-warm-gray-50 text-warm-gray-600 border-warm-gray-200'
                                }`}>
                                {sec.status}
                              </span>
                            </div>
                            <p className="text-xs text-warm-gray-500 line-clamp-1">
                              Assigned to: <span className="font-semibold text-warm-gray-800">{sec.assignedToName || 'Unassigned'}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={sec.assignedTo || ''}
                              onChange={(e) => {
                                const mId = e.target.value
                                const selectedM = members.find((m) => m._id === mId)
                                handleAssignSectionMember(
                                  selectedProposalObj._id,
                                  sec._id,
                                  mId,
                                  selectedM ? selectedM.fullName : ''
                                )
                              }}
                              disabled={assigningSectionId === sec._id}
                              className="px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-semibold text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                            >
                              <option value="">-- Unassigned --</option>
                              {verifiedMembers.map((m) => (
                                <option key={m._id} value={m._id}>
                                  👤 {m.fullName} ({m.jobTitle || m.role})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleDeleteSection(sec._id, sec.title)}
                              disabled={deletingSectionId === sec._id}
                              className="px-2.5 py-2 rounded-[10px] text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer disabled:opacity-50"
                              title="Remove this section"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-elevated rounded-[20px] p-12 border border-warm-gray-200/60 text-center">
                  <span className="text-4xl block mb-3">📋</span>
                  <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-2">No Proposals Created Yet</h3>
                  <p className="text-sm text-warm-gray-500 max-w-md mx-auto mb-6">
                    Start a proposal to automatically generate the 17-section template and assign sections to team members.
                  </p>
                  <button
                    onClick={() => setCreateProposalModal(true)}
                    className="px-5 py-2.5 rounded-[12px] bg-primary text-white font-semibold text-xs hover:bg-primary-dark transition-all cursor-pointer shadow-soft"
                  >
                    + Start New Proposal
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ─── Government & Other Sources Grant Detail Panel (NEW) ─── */}
      {selectedGovGrant && (
        <GovGrantDetailPanel
          grant={selectedGovGrant}
          onClose={handleCloseGovPanel}
          onApply={handleApplyForGovGrant}
          applyLoading={govApplyLoading}
          applySuccess={govApplySuccess}
          applyError={govApplyError}
        />
      )}

      {/* ─── View Funding Agency Profile Modal ─── */}
      {viewAgencyGrant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setViewAgencyGrant(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-lg p-6 sm:p-8 animate-fade-up max-h-[85vh] overflow-y-auto">
            {(() => {
              const agency = viewAgencyGrant.fundingAgency || {}
              return (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-heading text-xl font-bold text-warm-gray-900">{agency.agencyName || 'Funding Agency'}</h2>
                    <button onClick={() => setViewAgencyGrant(null)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer">✕</button>
                  </div>
                  {agency.shortName && <p className="text-xs text-warm-gray-400 mb-4">{agency.shortName}</p>}

                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div>
                      <span className="block text-slate-500 uppercase tracking-wider font-bold text-xs mb-0.5">Agency Type</span>
                      <span className="text-warm-gray-800 font-semibold">{AGENCY_TYPE_LABELS[agency.agencyType] || agency.agencyType || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 uppercase tracking-wider font-bold text-xs mb-0.5">Established</span>
                      <span className="text-warm-gray-800 font-semibold">{agency.establishedYear || '—'}</span>
                    </div>
                    {agency.organizationType && (
                      <div>
                        <span className="block text-slate-500 uppercase tracking-wider font-bold text-xs mb-0.5">Organization Type</span>
                        <span className="text-warm-gray-800 font-semibold">{agency.organizationType}</span>
                      </div>
                    )}
                    {agency.ownershipType && (
                      <div>
                        <span className="block text-slate-500 uppercase tracking-wider font-bold text-xs mb-0.5">Ownership</span>
                        <span className="text-warm-gray-800 font-semibold">{agency.ownershipType}</span>
                      </div>
                    )}
                  </div>

                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200 mb-4">
                    ✓ Verified Funding Agency
                  </span>

                  {agency.description && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-400 mb-1">About</p>
                      <p className="text-sm text-warm-gray-700 leading-relaxed">{agency.description}</p>
                    </div>
                  )}
                  {agency.mission && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-400 mb-1">Mission</p>
                      <p className="text-sm text-warm-gray-700 leading-relaxed">{agency.mission}</p>
                    </div>
                  )}
                  {agency.vision && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-400 mb-1">Vision</p>
                      <p className="text-sm text-warm-gray-700 leading-relaxed">{agency.vision}</p>
                    </div>
                  )}

                  {agency.headquarters && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-400 mb-1">Headquarters</p>
                      <p className="text-sm text-warm-gray-700">
                        {[agency.headquarters.city, agency.headquarters.state, agency.headquarters.country].filter(Boolean).join(', ') || '—'}
                      </p>
                    </div>
                  )}

                  {agency.website && (
                    <a href={agency.website} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">
                      🌐 {agency.website}
                    </a>
                  )}

                  <div className="flex justify-end mt-6 pt-4 border-t border-warm-gray-200/60">
                    <button
                      onClick={() => setViewAgencyGrant(null)}
                      className="px-5 py-2.5 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ─── View Grant Details Modal (agency grants) ─── */}
      {viewGrantDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setViewGrantDetails(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-2xl p-6 sm:p-8 animate-fade-up max-h-[85vh] overflow-y-auto">
            {(() => {
              const g = viewGrantDetails
              const docUrl = grantDocumentUrl(g.document)
              return (
                <>
                  <div className="flex items-start justify-between mb-1 pb-4 border-b border-warm-gray-200/60">
                    <div>
                      <span className="text-xs font-mono font-bold text-primary bg-primary-50 px-2 py-0.5 rounded-full border border-primary/15">{g.displayId}</span>
                      <h2 className="font-heading text-xl font-bold text-warm-gray-900 mt-2">{g.title}</h2>
                      {g.shortTitle && <p className="text-xs text-warm-gray-400 font-mono mt-0.5">{g.shortTitle}</p>}
                      <p className="text-xs text-warm-gray-500 mt-1">{g.fundingAgency?.agencyName || 'Funding Agency'}</p>
                    </div>
                    <button onClick={() => setViewGrantDetails(null)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer flex-shrink-0">✕</button>
                  </div>

                  <div className="space-y-5 mt-5">
                    {g.description && (
                      <GrantSection icon="📋" title="Description">
                        <p className="text-sm text-warm-gray-700 leading-relaxed">{g.description}</p>
                      </GrantSection>
                    )}

                    <GrantSection icon="💰" title="Key Facts">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <FactBox label="Funding" value={g.budget} />
                        <FactBox label="Category" value={g.category} />
                        <FactBox label="Funding Type" value={g.fundingType} />
                        <FactBox label="Start Date" value={formatGrantDate(g.startDate)} />
                        <FactBox label="Deadline" value={formatGrantDate(g.deadline)} />
                        <FactBox
                          label="Duration"
                          value={
                            g.projectDurationMonths?.min || g.projectDurationMonths?.max
                              ? `${g.projectDurationMonths.min || '?'}–${g.projectDurationMonths.max || '?'} months`
                              : null
                          }
                        />
                      </div>
                    </GrantSection>

                    {g.researchAreas?.length > 0 && (
                      <GrantSection icon="🔬" title="Research Areas">
                        <div className="flex flex-wrap gap-1.5">
                          {g.researchAreas.map((r) => (
                            <span key={r} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber text-xs font-semibold border border-amber/15">{r}</span>
                          ))}
                        </div>
                      </GrantSection>
                    )}

                    <GrantSection icon="✅" title="Eligibility">
                      <div className="space-y-2 text-sm text-warm-gray-700">
                        <p>
                          <strong className="text-warm-gray-900">Applicant Types:</strong>{' '}
                          {g.eligibility?.applicantTypes?.length > 0
                            ? g.eligibility.applicantTypes.map((t) => APPLICANT_TYPE_LABELS[t] || t).join(', ')
                            : 'Not restricted'}
                        </p>
                        <p>
                          <strong className="text-warm-gray-900">Geographic Scope:</strong> {g.eligibility?.geographicScope || 'Not restricted'}
                          {g.eligibility?.eligibleStates?.length > 0 ? ` (${g.eligibility.eligibleStates.join(', ')})` : ''}
                        </p>
                        {g.eligibilityRulesText && (
                          <p className="whitespace-pre-line p-3 rounded-[10px] bg-cream border border-warm-gray-200 text-xs leading-relaxed">
                            {g.eligibilityRulesText}
                          </p>
                        )}
                      </div>
                    </GrantSection>

                    {g.projectRequirements && (
                      <GrantSection icon="📌" title="Project Requirements">
                        <p className="text-sm text-warm-gray-700 whitespace-pre-line leading-relaxed">{g.projectRequirements}</p>
                      </GrantSection>
                    )}

                    {(g.allowableExpenses || g.nonAllowableExpenses) && (
                      <GrantSection icon="💵" title="Budget Guidelines">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {g.allowableExpenses && (
                            <div className="p-3 rounded-[10px] bg-green-50 border border-green-200">
                              <p className="text-xs font-bold uppercase tracking-wider text-green-700 mb-1">Allowable</p>
                              <p className="text-xs text-warm-gray-700 whitespace-pre-line">{g.allowableExpenses}</p>
                            </div>
                          )}
                          {g.nonAllowableExpenses && (
                            <div className="p-3 rounded-[10px] bg-red-50 border border-red-200">
                              <p className="text-xs font-bold uppercase tracking-wider text-red-700 mb-1">Not Allowable</p>
                              <p className="text-xs text-warm-gray-700 whitespace-pre-line">{g.nonAllowableExpenses}</p>
                            </div>
                          )}
                        </div>
                        {g.budgetRules && <p className="text-xs text-warm-gray-700 whitespace-pre-line mt-3">{g.budgetRules}</p>}
                      </GrantSection>
                    )}

                    {g.proposalRequirements && (
                      <GrantSection icon="📝" title="Proposal Requirements">
                        <p className="text-sm text-warm-gray-700 whitespace-pre-line leading-relaxed">{g.proposalRequirements}</p>
                      </GrantSection>
                    )}

                    {g.evaluationCriteria?.length > 0 && (
                      <GrantSection icon="⚖️" title="Evaluation Criteria">
                        <div className="divide-y divide-warm-gray-100">
                          {g.evaluationCriteria.map((c, i) => (
                            <div key={i} className="flex justify-between items-center py-1.5 text-sm">
                              <span className="text-warm-gray-700">{c.label}</span>
                              <strong className="text-warm-gray-900 bg-cream px-2 py-0.5 rounded-full text-xs">{c.weight}%</strong>
                            </div>
                          ))}
                        </div>
                      </GrantSection>
                    )}

                    {g.applicationProcess && (
                      <GrantSection icon="🗂️" title="Application Process">
                        <p className="text-sm text-warm-gray-700 whitespace-pre-line leading-relaxed">{g.applicationProcess}</p>
                      </GrantSection>
                    )}

                    {(g.contactInformation?.name || g.contactInformation?.email || g.contactInformation?.phone) && (
                      <GrantSection icon="📞" title="Program Contact">
                        <p className="text-sm text-warm-gray-700">
                          {[g.contactInformation.name, g.contactInformation.email, g.contactInformation.phone].filter(Boolean).join(' • ')}
                        </p>
                      </GrantSection>
                    )}

                    {docUrl && (
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-primary-50 text-primary text-xs font-bold border border-primary/15 hover:bg-primary-100 transition-all"
                      >
                        📄 View {g.document.documentType || 'Grant Document'} PDF →
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-warm-gray-200/60">
                    <button
                      onClick={() => setViewGrantDetails(null)}
                      className="px-4 py-2 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => { setViewGrantDetails(null); handleStartProposalForGrant(g) }}
                      className="px-5 py-2.5 rounded-[10px] font-bold text-white bg-primary hover:bg-primary-dark shadow-soft transition-all text-xs cursor-pointer"
                    >
                      ✏️ Write Proposal
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ─── Create Proposal Modal ─── */}
      {createProposalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setCreateProposalModal(false)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-lg p-8 animate-fade-up">
            <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-1">Start New Proposal</h2>
            <p className="text-sm text-warm-gray-500 mb-6">
              {newProposalData.grantProgramId
                ? 'Pre-filled from the selected grant call. You can submit this proposal directly to the funding agency once ready.'
                : 'This will automatically generate the 17-section proposal template.'}
            </p>

            {proposalCreateError && (
              <div className="mb-4 p-3 rounded-[10px] bg-red-50 border border-red-200 text-xs text-red-700">
                ⚠️ {proposalCreateError}
              </div>
            )}

            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1">Proposal Title *</label>
                <input
                  type="text"
                  required
                  value={newProposalData.title}
                  onChange={(e) => setNewProposalData({ ...newProposalData, title: e.target.value })}
                  placeholder="e.g. UGC Major Research Project Proposal"
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-warm-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-warm-gray-700 block mb-1">Grant Name</label>
                  <input
                    type="text"
                    value={newProposalData.grantTitle}
                    onChange={(e) => setNewProposalData({ ...newProposalData, grantTitle: e.target.value })}
                    placeholder="e.g. DST SERB CRG"
                    disabled={Boolean(newProposalData.grantProgramId)}
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-warm-gray-50 disabled:text-warm-gray-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-warm-gray-700 block mb-1">Funding Agency</label>
                  <input
                    type="text"
                    value={newProposalData.grantAgency}
                    onChange={(e) => setNewProposalData({ ...newProposalData, grantAgency: e.target.value })}
                    placeholder="e.g. DST / UGC"
                    disabled={Boolean(newProposalData.grantProgramId)}
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-warm-gray-50 disabled:text-warm-gray-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-warm-gray-700 block mb-1">Funding Amount</label>
                  <input
                    type="text"
                    value={newProposalData.fundingAmount}
                    onChange={(e) => setNewProposalData({ ...newProposalData, fundingAmount: e.target.value })}
                    placeholder="e.g. ₹25,00,000"
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-warm-gray-700 block mb-1">Application Deadline</label>
                  <input
                    type="date"
                    value={newProposalData.deadline}
                    onChange={(e) => setNewProposalData({ ...newProposalData, deadline: e.target.value })}
                    disabled={Boolean(newProposalData.grantProgramId)}
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-warm-gray-50 disabled:text-warm-gray-500"
                  />
                </div>
              </div>

              {newProposalData.grantProgramId && (
                <p className="text-xs text-warm-gray-400">
                  Eligibility for this grant call will be checked automatically when you create the proposal.
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setCreateProposalModal(false); setProposalCreateError('') }}
                  className="flex-1 py-2.5 rounded-[12px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={proposalSubmitting}
                  className="flex-1 py-2.5 rounded-[12px] font-semibold text-white bg-primary hover:bg-primary-dark shadow-soft transition-all text-xs cursor-pointer disabled:opacity-50"
                >
                  {proposalSubmitting ? 'Creating...' : 'Create & Generate Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Add Section Modal ─── */}
      {addSectionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setAddSectionModalOpen(false)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-md p-8 animate-fade-up">
            <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-1">Add Section</h2>
            <p className="text-sm text-warm-gray-500 mb-6">Add a custom section tailored to this grant's requirements.</p>
            {sectionActionError && (
              <div className="mb-4 p-3 rounded-[10px] bg-red-50 border border-red-200 text-xs text-red-700">⚠️ {sectionActionError}</div>
            )}
            <form onSubmit={handleAddSection} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1">Section Title *</label>
                <input
                  type="text"
                  required
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g. International Collaboration Details"
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-warm-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1">Word Limit</label>
                <input
                  type="number"
                  min="50"
                  value={newSectionWordLimit}
                  onChange={(e) => setNewSectionWordLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-warm-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddSectionModalOpen(false)}
                  className="flex-1 py-2.5 rounded-[12px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-[12px] font-semibold text-white bg-primary hover:bg-primary-dark shadow-soft transition-all text-xs cursor-pointer"
                >
                  Add Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Invite External Collaborator Modal ─── */}
      {inviteCollaboratorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setInviteCollaboratorModal(false)} />
          <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden border border-warm-gray-200">
            <div className="bg-blue-50/50 p-5 border-b border-blue-100 flex items-start justify-between">
              <div>
                <h2 className="font-heading text-xl font-bold text-warm-gray-900 mt-1">Invite External Collaborator</h2>
                <p className="text-xs text-warm-gray-500 mt-1">Invite a user from another organization to collaborate on this proposal.</p>
              </div>
              <button onClick={() => setInviteCollaboratorModal(false)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer">
                ✕
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleInviteCollaborator} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-warm-gray-700 block mb-1">Collaborator Email *</label>
                  <input
                    type="email"
                    required
                    value={collaboratorEmail}
                    onChange={(e) => setCollaboratorEmail(e.target.value)}
                    placeholder="e.g. peer@other-university.edu"
                    className="w-full px-4 py-2.5 rounded-[12px] border border-warm-gray-200 bg-warm-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-warm-gray-100 mt-6">
                  <button type="button" onClick={() => setInviteCollaboratorModal(false)} className="px-5 py-2.5 rounded-[12px] text-warm-gray-600 text-sm font-bold hover:bg-warm-gray-100 transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={inviteCollaboratorLoading} className="px-5 py-2.5 rounded-[12px] bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer shadow-soft">
                    {inviteCollaboratorLoading ? 'Inviting...' : 'Send Invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── Task Assignment Modal ─── */}
      {taskModalMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setTaskModalMember(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-md p-8 animate-fade-up">
            <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-1">Assign Tasks</h2>
            <p className="text-sm text-warm-gray-500 mb-4">Select tasks for <strong>{taskModalMember.fullName}</strong></p>

            <div className="mb-5 p-3 rounded-[12px] bg-cream/70 border border-warm-gray-200/60 space-y-1.5">
              <p className="text-xs font-bold text-warm-gray-500 uppercase tracking-wider">Quick Role Presets:</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(ROLE_PRESETS).map((pName) => (
                  <button
                    key={pName}
                    type="button"
                    onClick={() => applyRolePreset(pName)}
                    className="px-2.5 py-1 rounded-[8px] bg-white border border-warm-gray-200 hover:border-purple-300 hover:bg-purple-50 text-xs font-semibold text-warm-gray-800 transition-all cursor-pointer shadow-soft"
                  >
                    {pName}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {TASK_TYPES.map((task) => (
                <label
                  key={task.key}
                  className={`flex items-center gap-3 p-3 rounded-[12px] border-2 cursor-pointer transition-all duration-200 ${selectedTasks.includes(task.key)
                    ? 'border-primary bg-primary-50'
                    : 'border-warm-gray-200 bg-cream hover:border-warm-gray-300'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(task.key)}
                    onChange={() => toggleTask(task.key)}
                    className="sr-only"
                  />
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedTasks.includes(task.key)
                    ? 'border-primary bg-primary text-white'
                    : 'border-warm-gray-300'
                    }`}>
                    {selectedTasks.includes(task.key) && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className="text-lg">{task.icon}</span>
                  <span className="text-sm font-semibold text-warm-gray-900">{task.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAssignTasks}
                disabled={actionLoading === taskModalMember._id}
                className="flex-1 py-3 rounded-[12px] font-semibold text-white bg-primary hover:bg-primary-dark shadow-soft transition-all duration-300 cursor-pointer disabled:opacity-50"
              >
                {actionLoading === taskModalMember._id ? 'Saving...' : 'Save Tasks'}
              </button>
              <button
                onClick={() => setTaskModalMember(null)}
                className="px-6 py-3 rounded-[12px] font-semibold text-warm-gray-600 border-2 border-warm-gray-200 hover:border-warm-gray-300 transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Full Compiled Proposal Modal ─── */}
      {showFullProposalModal && selectedProposalObj && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowFullProposalModal(false)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-4xl p-6 sm:p-8 animate-fade-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-warm-gray-200/60 mb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
                  PDF Document Preview
                </span>
                <h2 className="font-heading text-xl font-bold text-warm-gray-900 mt-1">{selectedProposalObj.title}</h2>
                <p className="text-xs text-warm-gray-500">Agency: {selectedProposalObj.grantAgency || 'Funding Agency'} &nbsp;•&nbsp; Official Proposal View</p>
              </div>
              <button onClick={() => setShowFullProposalModal(false)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer">
                ✕
              </button>
            </div>

            {selectedProposalObj.status === 'Submitted to Admin' || selectedProposalObj.status === 'Submitted to Agency' || selectedProposalObj.status === 'Submitted' ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white rounded-[16px] border border-slate-300 shadow-medium mb-6 font-serif text-slate-900 leading-relaxed text-xs">
                  <div className="text-center pb-8 border-b-2 border-double border-indigo-950 mb-8">
                    <p className="text-xs font-bold uppercase tracking-[2.5px] text-indigo-700 mb-3 font-sans">
                      OFFICIAL RESEARCH PROPOSAL
                    </p>
                    <h1 className="font-heading text-2xl font-bold text-slate-900 mb-6 leading-snug">
                      {selectedProposalObj.title}
                    </h1>

                    <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto text-left bg-slate-50 p-4 rounded-[10px] border border-slate-200 text-xs font-sans">
                      <div><span className="font-bold text-slate-600">Funding Agency:</span> <span className="text-slate-900">{selectedProposalObj.grantAgency || 'N/A'}</span></div>
                      <div><span className="font-bold text-slate-600">Grant Scheme:</span> <span className="text-slate-900">{selectedProposalObj.grantTitle || 'N/A'}</span></div>
                      <div><span className="font-bold text-slate-600">Funding Requested:</span> <span className="text-slate-900">{selectedProposalObj.fundingAmount || 'N/A'}</span></div>
                      <div><span className="font-bold text-slate-600">Submission Deadline:</span> <span className="text-slate-900">{selectedProposalObj.deadline || 'N/A'}</span></div>
                      <div><span className="font-bold text-slate-600">Total Sections:</span> <span className="text-slate-900">{selectedProposalObj.sections?.length || 17} Sections</span></div>
                      <div><span className="font-bold text-slate-600">Date of Submission:</span> <span className="text-slate-900">{new Date().toLocaleDateString()}</span></div>
                      {selectedProposalObj.agencySubmission?.agencySubmissionId && (
                        <div className="col-span-2 pt-2 border-t border-slate-200">
                          <span className="font-bold text-emerald-800">Agency Application ID:</span> <span className="font-mono font-bold text-emerald-900">{selectedProposalObj.agencySubmission.agencySubmissionId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-slate-500 border-b border-slate-200 pb-2 mb-8 font-sans">
                    <span>Official Research Proposal Submission</span>
                    <span>Ref: {selectedProposalObj.agencySubmission?.agencySubmissionId || selectedProposalObj.grantTitle || selectedProposalObj.title}</span>
                  </div>

                  <div className="space-y-8">
                    {selectedProposalObj.sections?.map((sec) => (
                      <div key={sec._id} className="pb-6 border-b border-slate-200/80 last:border-0">
                        <h2 className="font-heading font-bold text-sm text-slate-900 border-b border-indigo-900/30 pb-1 mb-3">
                          {sec.title}
                        </h2>
                        <div className="whitespace-pre-wrap text-slate-800 text-xs leading-relaxed font-sans bg-slate-50/50 p-4 rounded-[8px] border border-slate-100">
                          {sec.content ? sec.content : <em className="text-slate-400 italic">[Section content pending]</em>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-warm-gray-200/60">
                  <button
                    type="button"
                    onClick={() => handleExportPDF(selectedProposalObj)}
                    className="px-5 py-2.5 rounded-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-soft transition-all text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📥</span> Export PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFullProposalModal(false)}
                    className="px-4 py-2 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 bg-white rounded-[16px] border border-warm-gray-200 text-center my-4">
                <span className="text-5xl mb-4">⏳</span>
                <h3 className="font-heading font-bold text-lg text-warm-gray-900 mb-2">Final Proposal Not Submitted Yet</h3>
                <p className="text-xs text-warm-gray-600 max-w-md leading-relaxed mb-4">
                  The Principal Investigator (PI) has not submitted the final proposal to Admin yet. You can only view and export the complete final PDF once the PI finishes reviewing the sections and clicks <strong>"Submit to Admin"</strong>.
                </p>
                <div className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold">
                  Status: {selectedProposalObj.status || 'In Progress'} ({selectedProposalObj.progress || 0}% sections approved)
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullProposalModal(false)}
                  className="mt-6 px-6 py-2 rounded-[10px] bg-warm-gray-100 hover:bg-warm-gray-200 text-warm-gray-800 text-xs font-bold cursor-pointer transition-all"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Submit to Funding Agency Modal ─── */}
      {submitAgencyModal && selectedProposalObj && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setSubmitAgencyModal(false)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-2xl w-full max-w-lg p-6 sm:p-8 animate-fade-up">
            <div className="flex items-center justify-between pb-4 border-b border-warm-gray-200/60 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-[10px] bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-lg">
                  🏛️
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold text-warm-gray-900">
                    Submit Proposal to Funding Agency
                  </h2>
                  <p className="text-xs text-warm-gray-500">
                    Target: {selectedProposalObj.grantAgency || 'Funding Agency'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmitAgencyModal(false)}
                className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3.5 rounded-[12px] bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <span>✓</span> Statutory Clearance Verified
              </p>
              <p className="text-xs text-emerald-800">
                Institutional Endorsement Letter has been confirmed. By proceeding, you certify that this research proposal is legally submitted on behalf of <strong>{orgName || 'the Institution'}</strong>. All 17 sections will be permanently locked.
              </p>
            </div>

            <form onSubmit={handleSubmitToAgency} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-warm-gray-800 mb-1.5">
                  Official Agency Reference / Application ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={agencySubmissionData.agencySubmissionId}
                  onChange={(e) =>
                    setAgencySubmissionData((prev) => ({ ...prev, agencySubmissionId: e.target.value }))
                  }
                  placeholder="e.g., UGC/2026/MRP-8841 or DST/SERB/CRG/0921"
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-mono font-bold text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-xs text-warm-gray-500 mt-1">
                  Generated by the funding agency's portal upon online application or physical docket dispatch.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-warm-gray-800 mb-1.5">
                  Submission Notes / Portal Receipt (Optional)
                </label>
                <textarea
                  rows={2}
                  value={agencySubmissionData.receiptNote}
                  onChange={(e) =>
                    setAgencySubmissionData((prev) => ({ ...prev, receiptNote: e.target.value }))
                  }
                  placeholder="e.g., Submitted via DST e-PMS portal with institutional digital signature. Acknowledgement #48291."
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-warm-gray-200 bg-white text-xs text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmitAgencyModal(false)}
                  className="flex-1 py-2.5 rounded-[12px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAgency || !agencySubmissionData.agencySubmissionId.trim()}
                  className="flex-1 py-2.5 rounded-[12px] font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:opacity-95 shadow-soft transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span>🚀</span> {submittingAgency ? 'Submitting...' : 'Confirm Official Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Mark as Applied Externally Modal (Scraped Government Grants) ─── */}
      {externalSubmitModal && selectedProposalObj && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setExternalSubmitModal(false)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-2xl w-full max-w-lg p-6 sm:p-8 animate-fade-up">
            <div className="flex items-center justify-between pb-4 border-b border-warm-gray-200/60 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-[10px] bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-lg">
                  🏛️
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold text-warm-gray-900">
                    Mark as Applied Externally
                  </h2>
                  <p className="text-xs text-warm-gray-500">
                    Government Body: {selectedProposalObj.grantAgency || 'AICTE / DBT / DST / UGC'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExternalSubmitModal(false)}
                className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3.5 rounded-[12px] bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <span>🏛️</span> Official Portal Submission
              </p>
              <p className="text-xs text-amber-800">
                Record the official application acknowledgement or reference number issued by <strong>{selectedProposalObj.grantAgency || 'the government agency'}</strong>. The proposal will then enter your post-submission tracking pipeline for manual stage updates (Under Evaluation, Revisions, Awarded).
              </p>
              {selectedProposalObj.externalGrantLinks?.applicationUrl && (
                <div className="mt-2 pt-2 border-t border-amber-200/70 flex items-center justify-between">
                  <span className="text-[11px] text-amber-700 font-medium">Official Portal:</span>
                  <a
                    href={selectedProposalObj.externalGrantLinks.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline text-xs"
                  >
                    Open Application Portal ↗
                  </a>
                </div>
              )}
            </div>

            <form onSubmit={handleMarkAppliedExternally} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-warm-gray-800 mb-1.5">
                  External Reference / Acknowledgement ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={externalSubmitData.externalReferenceId}
                  onChange={(e) =>
                    setExternalSubmitData((prev) => ({ ...prev, externalReferenceId: e.target.value }))
                  }
                  placeholder="e.g. DST/SERB/CRG/2026/001234 or UGC/2026/MRP-8841"
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-mono font-bold text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="text-xs text-warm-gray-500 mt-1">
                  Issued upon completing application on e-PMS (DST/SERB), e-Samarth/UGC, AICTE portal, or DBT e-ProMIS.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-warm-gray-800 mb-1.5">
                  Government Portal Name (Optional)
                </label>
                <input
                  type="text"
                  value={externalSubmitData.portalName}
                  onChange={(e) =>
                    setExternalSubmitData((prev) => ({ ...prev, portalName: e.target.value }))
                  }
                  placeholder={`e.g. ${selectedProposalObj.grantAgency || 'DST'} e-PMS Portal`}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-warm-gray-200 bg-white text-xs text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-warm-gray-800 mb-1.5">
                  Submission Notes / Acknowledgement Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={externalSubmitData.notes}
                  onChange={(e) =>
                    setExternalSubmitData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="e.g. Uploaded final dossier with signed endorsement certificate. Technical review decision expected in 90 days."
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-warm-gray-200 bg-white text-xs text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExternalSubmitModal(false)}
                  className="flex-1 py-2.5 rounded-[12px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExternal || !externalSubmitData.externalReferenceId.trim()}
                  className="flex-1 py-2.5 rounded-[12px] font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-95 shadow-soft transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span>🏛️</span> {submittingExternal ? 'Recording...' : 'Record External Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── View Assigned Tasks Modal ─── */}
      {viewTasksModalMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setViewTasksModalMember(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-3xl p-6 sm:p-8 animate-fade-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-warm-gray-200/60 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-lg shadow-inner">
                  {viewTasksModalMember.fullName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-warm-gray-900">
                    Assigned Tasks: {viewTasksModalMember.fullName}
                  </h2>
                  <p className="text-xs text-warm-gray-500">
                    {viewTasksModalMember.email} {viewTasksModalMember.jobTitle ? `• ${viewTasksModalMember.jobTitle}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewTasksModalMember(null)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              <div className="bg-cream/60 rounded-[14px] p-4 border border-warm-gray-200/60">
                <h4 className="text-xs font-bold text-warm-gray-700 uppercase tracking-wider mb-2">Module Permissions:</h4>
                <div className="flex flex-wrap gap-2">
                  {viewTasksModalMember.assignedTasks?.length > 0 ? (
                    viewTasksModalMember.assignedTasks.map((t) => {
                      const taskInfo = TASK_TYPES.find((tt) => tt.key === t)
                      return taskInfo ? (
                        <span key={t} className={`px-3 py-1 rounded-full text-xs font-semibold border ${taskInfo.color}`}>
                          {taskInfo.icon} {taskInfo.label}
                        </span>
                      ) : null
                    })
                  ) : (
                    <span className="text-xs text-warm-gray-400 italic">No module permissions assigned yet.</span>
                  )}
                </div>
              </div>

              <div>
                {(() => {
                  const memberProposals = getMemberAssignedProposals(viewTasksModalMember._id, viewTasksModalMember.fullName)

                  if (memberProposals.length === 0) {
                    return (
                      <>
                        <h4 className="text-xs font-bold text-warm-gray-700 uppercase tracking-wider mb-3">
                          Assigned Grant Proposal Sections
                        </h4>
                        <div className="bg-white rounded-[16px] p-8 border border-warm-gray-200/80 text-center">
                          <span className="text-3xl block mb-2">📋</span>
                          <p className="text-sm font-semibold text-warm-gray-700">No grant proposal sections assigned yet</p>
                          <p className="text-xs text-warm-gray-400 mt-1 max-w-sm mx-auto">
                            You can assign sections to <strong>{viewTasksModalMember.fullName}</strong> from the <strong>Proposal Management</strong> tab or using Auto-Assign.
                          </p>
                        </div>
                      </>
                    )
                  }

                  const filteredProposals = selectedViewGrantId === 'all'
                    ? memberProposals
                    : memberProposals.filter((p) => p.proposalId === selectedViewGrantId)

                  return (
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <h4 className="text-xs font-bold text-warm-gray-700 uppercase tracking-wider">
                          Assigned Grant Proposal Sections ({memberProposals.length} Grant{memberProposals.length > 1 ? 's' : ''})
                        </h4>

                        <div className="flex items-center gap-2">
                          <label htmlFor="view-grant-select" className="text-xs font-bold text-warm-gray-600">
                            Select Grant:
                          </label>
                          <select
                            id="view-grant-select"
                            value={selectedViewGrantId}
                            onChange={(e) => setSelectedViewGrantId(e.target.value)}
                            className="px-3 py-1.5 rounded-[10px] border border-purple-200 bg-white text-xs font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer shadow-soft"
                          >
                            <option value="all">-- All Assigned Grants ({memberProposals.length}) --</option>
                            {memberProposals.map((prop) => (
                              <option key={prop.proposalId} value={prop.proposalId}>
                                🎯 {prop.title} {prop.grantAgency ? `(${prop.grantAgency})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {filteredProposals.length === 0 ? (
                        <div className="bg-white rounded-[16px] p-6 border border-warm-gray-200/80 text-center">
                          <p className="text-xs text-warm-gray-500">No sections found for the selected grant.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredProposals.map((prop) => (
                            <div key={prop.proposalId} className="bg-white rounded-[16px] border border-warm-gray-200 shadow-soft overflow-hidden">
                              <div className="bg-purple-50/70 p-4 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Grant Proposal</span>
                                  <h5 className="font-heading font-bold text-warm-gray-900 text-sm">{prop.title}</h5>
                                  <p className="text-xs text-warm-gray-500">
                                    {prop.grantTitle ? `${prop.grantTitle} • ` : ''}{prop.grantAgency || 'Funding Agency'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-warm-gray-600">
                                  {prop.fundingAmount && (
                                    <span className="bg-white px-2.5 py-1 rounded-md border border-purple-200 font-semibold text-purple-900">
                                      💰 {prop.fundingAmount}
                                    </span>
                                  )}
                                  {prop.deadline && (
                                    <span className="bg-white px-2.5 py-1 rounded-md border border-purple-200 font-semibold text-purple-900">
                                      📅 {prop.deadline}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="p-3 divide-y divide-warm-gray-100">
                                {prop.sections.map((sec) => (
                                  <div key={sec._id} className="py-2.5 px-2 flex items-center justify-between gap-2">
                                    <div>
                                      <p className="text-xs font-bold text-warm-gray-800">{sec.title}</p>
                                      <p className="text-xs text-warm-gray-400">Word limit: {sec.wordCountLimit || 500} words</p>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${sec.status === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : sec.status === 'Ready for Review' ? 'bg-green-50 text-green-700 border-green-200'
                                        : sec.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-warm-gray-50 text-warm-gray-600 border-warm-gray-200'
                                      }`}>
                                      {sec.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-warm-gray-200/60 mt-4">
              <button
                onClick={() => setViewTasksModalMember(null)}
                className="px-5 py-2.5 rounded-[12px] font-bold text-white bg-primary hover:bg-primary-dark shadow-soft transition-all text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tracking Modal 1: Status Change Dialog ─── */}
      {statusChangeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setStatusChangeModal(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-2xl w-full max-w-md p-6 sm:p-7 animate-fade-in z-10">
            <div className="flex items-center justify-between pb-3 border-b border-warm-gray-200 mb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  Lifecycle Stage Update
                </span>
                <h3 className="font-heading font-bold text-base text-warm-gray-900 mt-1">Update Tracking Status</h3>
              </div>
              <button onClick={() => setStatusChangeModal(null)} className="text-warm-gray-400 hover:text-warm-gray-700 font-bold p-1 cursor-pointer">✕</button>
            </div>

            <p className="text-xs text-warm-gray-600 mb-4 line-clamp-2">
              Proposal: <strong className="text-warm-gray-900">{statusChangeModal.proposal.title}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1">Target Lifecycle Stage *</label>
                <select
                  value={statusChangeModal.newStatus}
                  onChange={(e) => {
                    if (e.target.value === 'Awarded') {
                      const prop = statusChangeModal.proposal
                      setStatusChangeModal(null)
                      handleOpenStatusChange(prop, 'Awarded')
                      return
                    }
                    setStatusChangeModal({ ...statusChangeModal, newStatus: e.target.value })
                  }}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-bold text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                >
                  <option value="Submitted to Agency">🏛️ Submitted to Agency</option>
                  <option value="Under Evaluation">🔍 Under Evaluation (Peer Review)</option>
                  <option value="Revisions Requested">⚠️ Revisions / Query Requested</option>
                  <option value="Awarded">🏆 Awarded / Sanctioned</option>
                  <option value="Rejected">❌ Rejected / Not Shortlisted</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1">
                  Status Notes / Agency Communication <span className="text-warm-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={statusChangeModal.notes}
                  onChange={(e) => setStatusChangeModal({ ...statusChangeModal, notes: e.target.value })}
                  placeholder="e.g. Funding agency nodal officer communicated peer review scores; interview defense scheduled for next week."
                  className="w-full p-3 rounded-[10px] border border-warm-gray-200 bg-cream/30 text-xs font-mono text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 placeholder:text-warm-gray-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-warm-gray-200">
                <button
                  type="button"
                  onClick={() => setStatusChangeModal(null)}
                  className="px-4 py-2 rounded-[10px] text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStatusChange}
                  disabled={updatingTrackingStatus}
                  className="px-5 py-2.5 rounded-[10px] text-xs font-bold text-white bg-primary hover:bg-primary-dark shadow-soft cursor-pointer transition-all disabled:opacity-50"
                >
                  {updatingTrackingStatus ? 'Updating...' : 'Confirm Stage Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tracking Modal 2: Post-Award Sanction Details ─── */}
      {awardModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setAwardModal(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-2xl w-full max-w-lg p-6 sm:p-8 animate-fade-in z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-warm-gray-200 mb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 w-fit">
                  <span>🏆</span> Grant Sanction & Award Form
                </span>
                <h3 className="font-heading font-bold text-lg text-warm-gray-900 mt-1">Record Official Sanction Order</h3>
              </div>
              <button onClick={() => setAwardModal(null)} className="text-warm-gray-400 hover:text-warm-gray-700 font-bold p-1 cursor-pointer">✕</button>
            </div>

            <p className="text-xs text-warm-gray-600 mb-5 leading-relaxed">
              Transition <strong className="text-warm-gray-900">{awardModal.title}</strong> into an officially sanctioned institutional award. These details will be preserved in the grant ledger.
            </p>

            <form onSubmit={handleConfirmAward} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-warm-gray-700 block mb-1">Sanction Order Number *</label>
                  <input
                    type="text"
                    required
                    value={awardForm.sanctionOrderNumber}
                    onChange={(e) => setAwardForm({ ...awardForm, sanctionOrderNumber: e.target.value })}
                    placeholder="e.g. DST/SERB/2026/00412"
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-mono font-bold text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-warm-gray-700 block mb-1">Sanctioned Amount *</label>
                  <input
                    type="text"
                    required
                    value={awardForm.sanctionedAmount}
                    onChange={(e) => setAwardForm({ ...awardForm, sanctionedAmount: e.target.value })}
                    placeholder="e.g. ₹22,50,000"
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-warm-gray-700 block mb-1">Project Start Date</label>
                  <input
                    type="date"
                    value={awardForm.startDate}
                    onChange={(e) => setAwardForm({ ...awardForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-medium text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-warm-gray-700 block mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={awardForm.durationMonths}
                    onChange={(e) => setAwardForm({ ...awardForm, durationMonths: e.target.value })}
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-medium text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1">Sanction Terms / Special Conditions</label>
                <textarea
                  rows={3}
                  value={awardForm.sanctionNotes}
                  onChange={(e) => setAwardForm({ ...awardForm, sanctionNotes: e.target.value })}
                  placeholder="e.g. Overhead allowed at 10%; ₹5L earmarked for spectrophotometer purchase under Non-Recurring equipment head."
                  className="w-full p-3 rounded-[10px] border border-warm-gray-200 bg-cream/30 text-xs font-sans text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-warm-gray-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-warm-gray-200">
                <button
                  type="button"
                  onClick={() => setAwardModal(null)}
                  className="px-4 py-2 rounded-[10px] text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingTrackingStatus}
                  className="px-5 py-2.5 rounded-[10px] text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 shadow-soft cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>🏆</span> {updatingTrackingStatus ? 'Recording...' : 'Record Award & Sanction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Tracking Modal 3: Quick Ping PI ─── */}
      {pingPiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setPingPiModal(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-2xl w-full max-w-md p-6 sm:p-7 animate-fade-in z-10">
            <div className="flex items-center justify-between pb-3 border-b border-warm-gray-200 mb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  Instant Team Ping
                </span>
                <h3 className="font-heading font-bold text-base text-warm-gray-900 mt-1">Send Notice to PI</h3>
              </div>
              <button onClick={() => setPingPiModal(null)} className="text-warm-gray-400 hover:text-warm-gray-700 font-bold p-1 cursor-pointer">✕</button>
            </div>

            <p className="text-xs text-warm-gray-600 mb-3">
              Proposal: <strong className="text-warm-gray-900">{pingPiModal.title}</strong>
            </p>

            <div className="mb-3 space-y-1.5">
              <span className="text-xs font-bold text-warm-gray-500 uppercase tracking-wider block">Quick Templates</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Agency requested budget justification revisions.',
                  'Technical committee interview presentation scheduled.',
                  'Referee comments uploaded in portal. Please review.',
                  'Official Sanction Order received! Congratulations!',
                ].map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setPingPiMessage(tpl)}
                    className="px-2 py-1 rounded-[6px] bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 text-xs font-medium text-left transition-colors cursor-pointer"
                  >
                    + {tpl}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSendPingPi} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1">Message for PI & Research Team *</label>
                <textarea
                  rows={3}
                  required
                  value={pingPiMessage}
                  onChange={(e) => setPingPiMessage(e.target.value)}
                  placeholder="Type your message or query for the PI here..."
                  className="w-full p-3 rounded-[10px] border border-warm-gray-200 bg-cream/30 text-xs font-sans text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 placeholder:text-warm-gray-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-warm-gray-200">
                <button
                  type="button"
                  onClick={() => setPingPiModal(null)}
                  className="px-4 py-2 rounded-[10px] text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingTrackingStatus}
                  className="px-5 py-2.5 rounded-[10px] text-xs font-bold text-white bg-primary hover:bg-primary-dark shadow-soft cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>🚀</span> {updatingTrackingStatus ? 'Sending...' : 'Send Note to PI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Tracking Modal 4: Lifecycle Audit Timeline ─── */}
      {timelineModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setTimelineModal(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-2xl w-full max-w-lg p-6 sm:p-7 animate-fade-in z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-warm-gray-200 mb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  Audit History
                </span>
                <h3 className="font-heading font-bold text-base text-warm-gray-900 mt-1">Proposal Lifecycle Progression</h3>
              </div>
              <button onClick={() => setTimelineModal(null)} className="text-warm-gray-400 hover:text-warm-gray-700 font-bold p-1 cursor-pointer">✕</button>
            </div>

            <div className="bg-cream/40 p-3.5 rounded-[12px] border border-warm-gray-200/60 mb-5">
              <h4 className="font-heading font-bold text-sm text-warm-gray-900 line-clamp-1">{timelineModal.title}</h4>
              <p className="text-xs text-warm-gray-500 mt-0.5">
                Agency: <strong className="text-warm-gray-800">{timelineModal.grantAgency || 'Funding Agency'}</strong> &nbsp;•&nbsp; Ref: <span className="font-mono font-bold text-purple-800">{timelineModal.agencySubmission?.agencySubmissionId || 'Recorded'}</span>
              </p>
            </div>

            <div className="space-y-4 pl-3 relative border-l-2 border-purple-200 ml-3">
              <div className="relative pl-5">
                <span className="absolute -left-[23px] top-0.5 w-4 h-4 rounded-full bg-purple-600 border-2 border-white shadow-xs" />
                <p className="text-xs font-bold text-warm-gray-900">Proposal Created</p>
                <p className="text-xs text-warm-gray-500">17-section template generated and allocated for team writing.</p>
                <span className="text-xs text-warm-gray-400 mt-0.5 block">{new Date(timelineModal.createdAt).toLocaleString()}</span>
              </div>

              {timelineModal.agencySubmission?.submittedAt && (
                <div className="relative pl-5">
                  <span className="absolute -left-[23px] top-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                  <p className="text-xs font-bold text-warm-gray-900">Endorsed & Dispatched to Agency</p>
                  <p className="text-xs text-warm-gray-600">
                    Dispatched by {timelineModal.agencySubmission.submittedByName || 'Org Admin'}. Ref ID: <span className="font-mono font-bold text-blue-800">{timelineModal.agencySubmission.agencySubmissionId}</span>
                  </p>
                  <span className="text-xs text-warm-gray-400 mt-0.5 block">{new Date(timelineModal.agencySubmission.submittedAt).toLocaleString()}</span>
                </div>
              )}

              {(timelineModal.trackingTimeline || []).map((step, idx) => (
                <div key={idx} className="relative pl-5">
                  <span className="absolute -left-[23px] top-0.5 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-xs" />
                  <p className="text-xs font-bold text-warm-gray-900">Stage: {step.stage}</p>
                  <p className="text-xs text-warm-gray-600">{step.notes || 'Status updated by administrator'}</p>
                  <p className="text-xs text-warm-gray-400 mt-0.5">By {step.updatedBy || 'Admin'} on {new Date(step.timestamp).toLocaleString()}</p>
                </div>
              ))}

              {timelineModal.awardDetails?.sanctionOrderNumber && (
                <div className="relative pl-5 bg-emerald-50/70 p-3 rounded-[10px] border border-emerald-200">
                  <span className="absolute -left-[23px] top-3 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-xs" />
                  <p className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <span>🏆</span> Grant Officially Awarded & Sanctioned
                  </p>
                  <p className="text-xs text-emerald-800 font-bold mt-1">
                    Sanction Order #{timelineModal.awardDetails.sanctionOrderNumber} • {timelineModal.awardDetails.sanctionedAmount}
                  </p>
                  {timelineModal.awardDetails.durationMonths && (
                    <p className="text-xs text-emerald-700">Duration: {timelineModal.awardDetails.durationMonths} Months</p>
                  )}
                  {timelineModal.awardDetails.sanctionNotes && (
                    <p className="text-xs text-emerald-900 mt-1 italic">"{timelineModal.awardDetails.sanctionNotes}"</p>
                  )}
                  <span className="text-xs text-emerald-600 mt-1 block">
                    Recorded on {timelineModal.awardDetails.awardedAt ? new Date(timelineModal.awardDetails.awardedAt).toLocaleDateString() : 'N/A'} by {timelineModal.awardDetails.awardedBy || 'Admin'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-warm-gray-200 mt-6">
              <button
                type="button"
                onClick={() => setTimelineModal(null)}
                className="px-5 py-2.5 rounded-[10px] font-bold text-warm-gray-700 bg-warm-gray-100 hover:bg-warm-gray-200 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Schedule Milestone / Custom Reminder ─── */}
      {createReminderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setCreateReminderModal(false)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-2xl w-full max-w-lg p-6 sm:p-8 animate-fade-in z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-warm-gray-200 mb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  Institutional Scheduler
                </span>
                <h3 className="font-heading font-bold text-base text-warm-gray-900 mt-1">
                  Schedule Milestone / Deadline Reminder
                </h3>
              </div>
              <button
                onClick={() => setCreateReminderModal(false)}
                className="text-warm-gray-400 hover:text-warm-gray-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-warm-gray-500 mb-4">
              Set automated notifications for call deadlines, internal reviews, ethical clearances, or agency follow-ups.
            </p>

            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1">
                  Link to Proposal <span className="text-warm-gray-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={reminderForm.proposalId}
                  onChange={(e) => setReminderForm({ ...reminderForm, proposalId: e.target.value })}
                  className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-medium text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="">-- General Institutional Milestone (No Specific Proposal) --</option>
                  {orgProposals.map((p) => (
                    <option key={p._id} value={p._id}>
                      📋 {p.title} ({p.grantAgency || 'Grant'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1">
                  Reminder Title *
                </label>
                <input
                  type="text"
                  required
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                  placeholder="e.g. DST SERB Query Resolution Deadline or Ethical Committee Review"
                  className="w-full px-3 py-2.5 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-medium text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-warm-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-warm-gray-700 block mb-1">
                    Target Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={reminderForm.targetDate}
                    onChange={(e) => setReminderForm({ ...reminderForm, targetDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-medium text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-warm-gray-700 block mb-1">
                    Priority Level
                  </label>
                  <select
                    value={reminderForm.priority}
                    onChange={(e) => setReminderForm({ ...reminderForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-bold text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="high">🔴 High Priority (Immediate Alert)</option>
                    <option value="medium">🟡 Medium Priority (Standard)</option>
                    <option value="low">🟢 Low Priority (Routine)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1.5">
                  Milestone Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { key: 'call_deadline', label: '🏛️ Call Deadline' },
                    { key: 'internal_review', label: '🔍 Internal Review' },
                    { key: 'ethical_clearance', label: '🛡️ Ethical Board' },
                    { key: 'agency_followup', label: '✉️ Agency Follow-up' },
                    { key: 'budget_audit', label: '💰 Budget Audit' },
                    { key: 'custom', label: '📌 Custom Task' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setReminderForm({ ...reminderForm, reminderType: t.key })}
                      className={`px-2.5 py-1.5 rounded-[8px] text-xs font-bold text-left transition-all cursor-pointer border ${reminderForm.reminderType === t.key
                        ? 'bg-primary-50 text-primary border-primary font-bold shadow-xs'
                        : 'bg-cream/40 text-warm-gray-700 border-warm-gray-200 hover:bg-cream'
                        }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1">
                  Assignee / Recipient <span className="text-warm-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={reminderForm.recipientName}
                  onChange={(e) => setReminderForm({ ...reminderForm, recipientName: e.target.value })}
                  placeholder="e.g. Lead PI, Co-Investigator, or Dean R&D"
                  className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs font-medium text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-warm-gray-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-warm-gray-700 block mb-1">
                  Notes / Instructions <span className="text-warm-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={reminderForm.notes}
                  onChange={(e) => setReminderForm({ ...reminderForm, notes: e.target.value })}
                  placeholder="e.g. Finalize financial breakdown and obtain Registrar sign-off prior to portal submission."
                  className="w-full p-2.5 rounded-[10px] border border-warm-gray-200 bg-cream/30 text-xs font-sans text-warm-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-warm-gray-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-warm-gray-200">
                <button
                  type="button"
                  onClick={() => setCreateReminderModal(false)}
                  className="px-4 py-2 rounded-[10px] text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReminder}
                  className="px-5 py-2.5 rounded-[10px] text-xs font-bold text-white bg-primary hover:bg-primary-dark shadow-soft cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>🔔</span> {submittingReminder ? 'Scheduling...' : 'Save & Notify Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Official Agency Status Enquiry Letter Generator ─── */}
      {followupLetterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setFollowupLetterModal(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-2xl w-full max-w-2xl p-6 sm:p-8 animate-fade-in z-10 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-warm-gray-200 mb-4 shrink-0">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  Institutional Letterhead Generator
                </span>
                <h3 className="font-heading font-bold text-base text-warm-gray-900 mt-1">
                  Official Status Enquiry Letter Draft
                </h3>
              </div>
              <button
                onClick={() => setFollowupLetterModal(null)}
                className="text-warm-gray-400 hover:text-warm-gray-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-cream/40 p-3 rounded-[12px] border border-warm-gray-200/60 mb-3 shrink-0 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-warm-gray-500">Proposal:</span>{' '}
                <strong className="text-warm-gray-900">{followupLetterModal.title}</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                  Ref: {followupLetterModal.agencySubmission?.agencySubmissionId || 'Recorded'}
                </span>
                <span className="text-warm-gray-500 text-xs">
                  Agency: <strong className="text-warm-gray-800">{followupLetterModal.grantAgency || 'Funding Agency'}</strong>
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-white rounded-[14px] border border-warm-gray-200 shadow-inner font-mono text-xs text-warm-gray-800 leading-relaxed whitespace-pre-wrap select-text">
              {getFollowupLetterContent(followupLetterModal)}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-warm-gray-200 mt-4 shrink-0">
              <span className="text-xs text-warm-gray-500 hidden sm:inline">
                Formal draft ready for official Registrar dispatch or email representation.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const text = getFollowupLetterContent(followupLetterModal)
                    navigator.clipboard.writeText(text)
                    setCopiedLetter(true)
                    showToast('✓ Enquiry letter copied to clipboard!')
                    setTimeout(() => setCopiedLetter(false), 2000)
                  }}
                  className={`px-4 py-2 rounded-[10px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-soft ${copiedLetter
                    ? 'bg-emerald-600 text-white'
                    : 'bg-primary text-white hover:bg-primary-dark'
                    }`}
                >
                  <span>{copiedLetter ? '✓' : '📋'}</span>
                  {copiedLetter ? 'Copied to Clipboard!' : 'Copy Letter Text'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-[10px] text-xs font-bold text-warm-gray-700 bg-warm-gray-100 hover:bg-warm-gray-200 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>🖨️</span> Print / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setFollowupLetterModal(null)}
                  className="px-3.5 py-2 rounded-[10px] text-xs font-semibold text-warm-gray-500 hover:text-warm-gray-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Real-Time Live Notification Toast ─── */}
      {liveToast && (
        <div className="fixed bottom-6 right-6 z-[99999] bg-slate-900/95 text-white px-4 py-3 rounded-[14px] shadow-2xl border border-slate-700/80 text-xs flex items-center gap-3 backdrop-blur-md max-w-sm transition-all animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="flex-1 font-medium leading-snug">{liveToast}</span>
          <button
            onClick={() => setLiveToast(null)}
            className="text-slate-400 hover:text-white font-bold ml-1 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Small reusable presentation helpers for the details modals ───
function GrantSection({ icon, title, children }) {
  return (
    <div className="pl-3 border-l-2 border-primary/20">
      <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-500 mb-2 flex items-center gap-1.5">
        <span>{icon}</span> {title}
      </p>
      {children}
    </div>
  )
}

function FactBox({ label, value, fallback = '—' }) {
  return (
    <div className="p-2.5 rounded-[8px] bg-cream border border-warm-gray-200">
      <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider mb-1">{label}</span>
      <strong className="text-slate-900 font-bold text-sm block leading-snug">{value || fallback}</strong>
    </div>
  )
}