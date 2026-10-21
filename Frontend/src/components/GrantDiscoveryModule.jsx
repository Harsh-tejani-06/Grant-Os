import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import api from '../api'

// ─── Constants ───
export const GRANT_TYPES = [
  { value: 'all', label: 'All Categories' },
  { value: 'research_grant', label: 'Research Grant' },
  { value: 'fellowship', label: 'Fellowship' },
  { value: 'startup_funding', label: 'Startup Funding' },
  { value: 'institutional_infra', label: 'Institutional Infrastructure' },
  { value: 'facility_access', label: 'Facility Access' },
  { value: 'science_communication', label: 'Science Communication' },
  { value: 'academic_programme', label: 'Academic Programme' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'faculty_training', label: 'Faculty Training' },
  { value: 'student_competition_travel', label: 'Student Competition / Travel' },
  { value: 'institutional_recognition', label: 'Institutional Recognition' },
  { value: 'general_scheme', label: 'General Scheme' },
  { value: 'travel_grant', label: 'Travel Grant' },
  { value: 'other', label: 'Other' },
]

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Open', label: 'Open' },
  { value: 'Closing Soon', label: 'Closing Soon' },
]

// Fallback agencies strictly restricted to AICTE, DBT, DST, and UGC
export const DEFAULT_GOV_AGENCIES = [
  { value: 'AICTE', label: 'AICTE (All India Council for Technical Education)' },
  { value: 'DBT', label: 'DBT (Department of Biotechnology)' },
  { value: 'DST', label: 'DST (Department of Science and Technology)' },
  { value: 'UGC', label: 'UGC (University Grants Commission)' },
]

export const DEFAULT_PRIVATE_AGENCIES = [
  { value: 'TechNova Research Foundation', label: 'TechNova Research Foundation (TRF)' },
  { value: 'Tejani Group', label: 'Tejani Group' },
]

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
]

// Helper: Format grant category for clean display
export function formatGrantCategory(grant) {
  if (grant.categoryRaw) return grant.categoryRaw
  if (grant.category) return grant.category
  if (grant.grantType) {
    return grant.grantType
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }
  if (grant.fundingType) return grant.fundingType
  return 'General Grant'
}

// Helper: Format applicant type for clean display
export function formatApplicantType(type) {
  if (!type) return ''
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Helper: Format deadline cleanly
export function formatDeadlineDisplay(deadline) {
  if (!deadline) return 'Open / Rolling'
  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) return deadline
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Status Badge Component (Requirement 6: Open or Closed status clearly shown) ───
export function StatusBadge({ status, size = 'sm' }) {
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-xs'

  let colorClasses = 'bg-warm-gray-100 text-warm-gray-600 border-warm-gray-200'
  let dotColor = 'bg-warm-gray-400'
  const effectiveStatus = status || 'Closed'

  if (effectiveStatus === 'Open') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold'
    dotColor = 'bg-emerald-500'
  } else if (effectiveStatus === 'Closing Soon') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200/80 font-bold'
    dotColor = 'bg-amber-500 animate-pulse'
  } else if (effectiveStatus === 'Closed') {
    colorClasses = 'bg-rose-50 text-rose-600 border-rose-200/80'
    dotColor = 'bg-rose-400'
  }

  return (
    <span className={`inline-flex items-center gap-1 flex-shrink-0 ${sizeClasses} rounded-full font-bold border ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {effectiveStatus}
    </span>
  )
}

// ─── Match Bar Component (Requirement 5: Similarity percentage for both Gov & GrantIQ) ───
export function MatchBar({ percentage, compact = false }) {
  const pct = Math.max(0, Math.min(100, Math.round(percentage || 0)))
  const barWidth = compact ? 'w-14' : 'w-24'
  const barHeight = compact ? 'h-1.5' : 'h-2'
  const textSize = compact ? 'text-xs' : 'text-sm'

  return (
    <div className="flex items-center gap-2" title={`${pct}% relevance score based on your organization profile`}>
      {!compact && <span className="text-xs text-warm-gray-500 font-medium">Relevance</span>}
      <div className={`${barWidth} ${barHeight} rounded-full bg-warm-gray-100 overflow-hidden`}>
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`${textSize} font-bold text-primary min-w-[34px] text-right`}>
        {pct}%
      </span>
    </div>
  )
}

// ─── Grant Card Component (Requirements 2, 5, 6: Explicit tags, similarity %, and status) ───
export function GrantCard({ grant, index = 0, onSelect }) {
  const isGrantiqAgency = Boolean(
    grant.isProgramGrant ||
    grant.sourceType === 'agency_submitted' ||
    grant.sourceType === 'agency'
  )

  return (
    <div
      onClick={() => onSelect(grant)}
      className="group bg-surface-elevated rounded-[14px] border border-warm-gray-200/70 shadow-soft hover:shadow-medium hover:-translate-y-0.5 transition-all duration-200 cursor-pointer animate-fade-up overflow-hidden flex flex-col justify-between"
      style={{ animationDelay: `${0.02 * (index % 12 + 1)}s` }}
      id={`grant-card-${grant._id}`}
    >
      <div className="p-5">
        {/* Top Tag & Status row (Requirement 2 & 6: Distinct tags & clear open/close status) */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          {isGrantiqAgency ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
              <span className="text-xs">🌿</span> GrantIQ Partner Agency
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              <span className="text-xs">🏛️</span> Government & Other Sources
            </span>
          )}
          <StatusBadge status={grant.displayStatus} />
        </div>

        {/* Title */}
        <h3 className="font-heading text-[15px] font-bold text-warm-gray-900 group-hover:text-primary transition-colors mb-1 line-clamp-2 leading-snug">
          {grant.title}
        </h3>

        {/* Agency Name */}
        <p className="text-xs font-medium text-warm-gray-500 mb-3 truncate flex items-center gap-1">
          <span>🏢</span> {grant.agencyName || 'Funding Agency'}
          {grant.agencyShortName && (
            <span className="font-bold text-warm-gray-700">({grant.agencyShortName})</span>
          )}
        </p>

        {/* Financials & Deadline */}
        <div className="flex items-center gap-2 mb-3 text-xs text-warm-gray-600 bg-cream/70 rounded-lg px-2.5 py-1.5 border border-warm-gray-200/40">
          <span className="font-bold text-warm-gray-900 text-[13px] truncate">
            {grant.fundingDisplay || 'Specified in guidelines'}
          </span>
          <span className="text-warm-gray-300">•</span>
          <span className="truncate">
            Deadline: <span className="font-semibold text-warm-gray-800">{formatDeadlineDisplay(grant.deadlineDisplay)}</span>
          </span>
        </div>
      </div>

      {/* Card Footer: Category tag, Region badge & Similarity percentage */}
      <div className="px-5 py-3 border-t border-warm-gray-200/50 bg-warm-gray-50/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="px-2 py-0.5 rounded-md bg-surface-elevated text-warm-gray-600 text-xs font-medium border border-warm-gray-200/60 truncate max-w-[140px]">
            {formatGrantCategory(grant)}
          </span>
          {grant.regionDisplay && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 text-primary text-xs font-semibold border border-primary/20 truncate max-w-[150px]"
              title={`Region: ${grant.regionDisplay}`}
            >
              <span className="text-[10px]">📍</span>
              {grant.regionDisplay}
            </span>
          )}
        </div>
        <MatchBar percentage={grant.matchPercentage} compact />
      </div>
    </div>
  )
}

// ─── Grant Detail Modal Component ───
export function GrantDetailPanel({
  grant,
  onClose,
  userRole,
  onApply,
  applyLoading,
  applySuccess,
  applyError,
}) {
  if (!grant) return null

  const isGrantiqAgency = Boolean(
    grant.isProgramGrant ||
    grant.sourceType === 'agency_submitted' ||
    grant.sourceType === 'agency'
  )
  const canApply =
    userRole === 'org_admin' &&
    grant.displayStatus === 'Open' &&
    !grant.hasApplied &&
    !applySuccess

  const handleApplyClick = () => {
    if (
      !window.confirm(
        `Start a proposal for "${grant.title}"? This will create a collaborative proposal workspace for your team.`
      )
    )
      return
    onApply(grant)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      id="grant-detail-overlay"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-2xl max-h-[88vh] bg-surface-elevated rounded-[20px] border border-warm-gray-200/80 shadow-medium overflow-hidden flex flex-col animate-fade-up z-10"
        style={{ animationDuration: '0.25s' }}
        id="grant-detail-panel"
      >
        {/* Header */}
        <div className="p-6 border-b border-warm-gray-200/60 bg-cream/50 relative pr-14">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-surface-elevated hover:bg-warm-gray-100 flex items-center justify-center text-warm-gray-500 hover:text-warm-gray-800 transition-all border border-warm-gray-200/60 cursor-pointer shadow-soft"
            id="grant-detail-close"
            aria-label="Close grant details"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Source Tag & Status */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isGrantiqAgency ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                🌿 GrantIQ Partner Agency
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                🏛️ Government & Other Sources
              </span>
            )}
            <StatusBadge status={grant.displayStatus} size="md" />
            {grant.agencyShortName && (
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-warm-gray-100 text-warm-gray-700">
                {grant.agencyShortName}
              </span>
            )}
          </div>

          <h2 className="font-heading text-xl font-bold text-warm-gray-900 leading-snug mb-1">
            {grant.title}
          </h2>
          <p className="text-sm font-medium text-warm-gray-600">
            {grant.agencyName}
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Key Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-cream rounded-[12px] p-3 border border-warm-gray-200/50">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-0.5">
                Funding Amount
              </p>
              <p className="text-sm font-bold text-warm-gray-900 truncate">
                {grant.fundingDisplay || 'Specified in guidelines'}
              </p>
            </div>
            <div className="bg-cream rounded-[12px] p-3 border border-warm-gray-200/50">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-0.5">
                Submission Deadline
              </p>
              <p className="text-sm font-bold text-warm-gray-900 truncate">
                {formatDeadlineDisplay(grant.deadlineDisplay)}
              </p>
            </div>
            <div className="bg-cream rounded-[12px] p-3 border border-warm-gray-200/50">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-0.5">
                Region / Scope
              </p>
              <p className="text-sm font-bold text-warm-gray-900 truncate" title={grant.regionDisplay || grant.geographicScope || 'Pan-India (National)'}>
                {grant.regionDisplay || grant.geographicScope || 'Pan-India (National)'}
              </p>
            </div>
            {grant.durationDisplay && (
              <div className="bg-cream rounded-[12px] p-3 border border-warm-gray-200/50">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-0.5">
                  Duration
                </p>
                <p className="text-sm font-bold text-warm-gray-900 truncate">
                  {grant.durationDisplay}
                </p>
              </div>
            )}
          </div>

          {/* Category & Match Score */}
          <div className="flex items-center justify-between p-3 rounded-[12px] bg-warm-gray-50/70 border border-warm-gray-200/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-warm-gray-500 font-medium">
                Category:
              </span>
              <span className="px-2.5 py-1 rounded-full bg-surface-elevated text-warm-gray-700 text-xs font-semibold border border-warm-gray-200">
                {formatGrantCategory(grant)}
              </span>
            </div>
            <MatchBar percentage={grant.matchPercentage} />
          </div>

          {/* Description */}
          {grant.description && (
            <div>
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">
                Scheme Description
              </h3>
              <p className="text-sm text-warm-gray-600 leading-relaxed whitespace-pre-line bg-cream/40 p-4 rounded-[12px] border border-warm-gray-200/40">
                {grant.description}
              </p>
            </div>
          )}

          {/* Eligibility */}
          {grant.eligibilityText && (
            <div>
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">
                Eligibility Criteria
              </h3>
              <p className="text-sm text-warm-gray-600 leading-relaxed whitespace-pre-line bg-cream/40 p-4 rounded-[12px] border border-warm-gray-200/40">
                {grant.eligibilityText}
              </p>
            </div>
          )}

          {/* Application Process */}
          {grant.applicationProcedure && (
            <div>
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">
                Application Procedure
              </h3>
              <p className="text-sm text-warm-gray-600 leading-relaxed whitespace-pre-line bg-cream/40 p-4 rounded-[12px] border border-warm-gray-200/40">
                {grant.applicationProcedure}
              </p>
            </div>
          )}

          {/* Focus Areas / Research Areas */}
          {((grant.focusAreas && grant.focusAreas.length > 0) ||
            (grant.researchAreas && grant.researchAreas.length > 0)) && (
              <div>
                <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">
                  Focus Areas
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(grant.focusAreas || grant.researchAreas || []).map((area, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full bg-primary-50 text-primary text-xs font-medium border border-primary/15"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Eligible Applicant Types */}
          {grant.eligibleApplicantTypes &&
            grant.eligibleApplicantTypes.length > 0 && (
              <div>
                <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">
                  Eligible Applicant Types
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {grant.eligibleApplicantTypes.map((type, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full bg-warm-gray-100 text-warm-gray-700 text-xs font-medium border border-warm-gray-200"
                    >
                      {formatApplicantType(type)}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Eligible States & Territories */}
          {grant.eligibleStates && grant.eligibleStates.length > 0 && (
            <div>
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">
                Eligible States & Territories
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {grant.eligibleStates.map((st, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/80 flex items-center gap-1"
                  >
                    <span>📍</span> {st}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications & Feedback */}
        {applyError && (
          <div className="mx-6 mb-2 px-4 py-2.5 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {applyError}
          </div>
        )}
        {applySuccess && (
          <div className="mx-6 mb-2 px-4 py-2.5 rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <span>✓</span> Proposal workspace created successfully! You can access it in Proposal Management.
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-warm-gray-200/60 bg-warm-gray-50/70 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2">
            {grant.infoUrl && (
              <a
                href={grant.infoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-surface-elevated border border-warm-gray-200 text-warm-gray-700 text-xs sm:text-sm font-semibold hover:bg-warm-gray-100 transition-colors shadow-soft"
                id="grant-detail-view-link"
              >
                Official Portal ↗
              </a>
            )}
            {grant.guidelinesUrl && (
              <a
                href={grant.guidelinesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-surface-elevated border border-warm-gray-200 text-warm-gray-700 text-xs sm:text-sm font-semibold hover:bg-warm-gray-100 transition-colors shadow-soft"
              >
                Guidelines PDF ↗
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            {grant.hasApplied || applySuccess ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Proposal In Progress
              </span>
            ) : canApply ? (
              <button
                onClick={handleApplyClick}
                disabled={applyLoading}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-soft hover:shadow-medium"
                id="grant-apply-btn"
              >
                {applyLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Creating Workspace...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    Start Proposal in GrantIQ
                  </>
                )}
              </button>
            ) : grant.displayStatus === 'Closed' ? (
              <span className="text-xs text-warm-gray-500 italic px-3 py-1.5 rounded-lg bg-warm-gray-100">
                Grant closed for applications
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section Header Component ───
export function SectionHeader({ icon, title, subtitle, count, accentColor = 'primary' }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className={`w-10 h-10 rounded-[12px] flex items-center justify-center text-lg ${accentColor === 'primary'
            ? 'bg-primary-50 text-primary border border-primary/20'
            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
          }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-bold text-warm-gray-900">{title}</h2>
          {count !== undefined && (
            <span className="px-2 py-0.5 rounded-full bg-warm-gray-100 text-warm-gray-700 text-xs font-bold">
              {count}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-warm-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── Pagination Component ───
export function PaginationControls({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-surface-elevated border border-warm-gray-200/70 text-warm-gray-600 hover:bg-warm-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        ← Prev
      </button>
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
        const pageNum = start + i
        if (pageNum > totalPages) return null
        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`w-8 h-8 rounded-[10px] text-xs font-bold transition-all cursor-pointer ${pageNum === currentPage
                ? 'bg-primary text-white shadow-soft'
                : 'bg-surface-elevated border border-warm-gray-200/70 text-warm-gray-600 hover:bg-warm-gray-50'
              }`}
          >
            {pageNum}
          </button>
        )
      })}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-surface-elevated border border-warm-gray-200/70 text-warm-gray-600 hover:bg-warm-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        Next →
      </button>
    </div>
  )
}

// ─── Core Grant Discovery Module Component ───
export default function GrantDiscoveryModule({
  userRole = 'org_admin',
  onProposalCreated = null,
  embedded = false,
}) {
  // Source Tab: Requirement 1: Government & Other Sources is FIRST ('government')
  const [activeTab, setActiveTab] = useState('government')

  // Lists & totals
  const [govGrants, setGovGrants] = useState([])
  const [grantiqGrants, setGrantiqGrants] = useState([])
  const [govTotal, setGovTotal] = useState(0)
  const [grantiqTotal, setGrantiqTotal] = useState(0)
  const [govTotalPages, setGovTotalPages] = useState(0)
  const [grantiqTotalPages, setGrantiqTotalPages] = useState(0)

  // Independent pagination
  const [govPage, setGovPage] = useState(1)
  const [grantiqPage, setGrantiqPage] = useState(1)

  // Agency options for dropdown filter (Requirement 3)
  const [govAgencyOptions, setGovAgencyOptions] = useState(DEFAULT_GOV_AGENCIES)
  const [grantiqAgencyOptions, setGrantiqAgencyOptions] = useState(DEFAULT_PRIVATE_AGENCIES)

  // Search & Filters (Requirement 7: Resized search bar)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [agencyFilter, setAgencyFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [orgState, setOrgState] = useState('')

  // Loading & detail states
  const [grantsLoading, setGrantsLoading] = useState(false)
  const [selectedGrant, setSelectedGrant] = useState(null)

  // Apply workflow
  const [applyLoading, setApplyLoading] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)
  const [applyError, setApplyError] = useState('')

  // Debounce ref
  const debounceTimer = useRef(null)

  // ── Fetch grants with parameters ──
  const fetchGrants = useCallback(
    async (opts = {}) => {
      setGrantsLoading(true)
      try {
        const targetGovPage = opts.govPage !== undefined ? opts.govPage : govPage
        const targetGrantiqPage = opts.grantiqPage !== undefined ? opts.grantiqPage : (opts.grantosPage !== undefined ? opts.grantosPage : grantiqPage)

        const params = {
          limit: 20,
          govPage: targetGovPage,
          grantiqPage: targetGrantiqPage,
          grantosPage: targetGrantiqPage,
        }
        if (search.trim()) params.search = search.trim()
        if (category !== 'all') params.category = category
        if (status !== 'all') params.status = status
        if (agencyFilter !== 'all') params.agencyFilter = agencyFilter
        if (regionFilter !== 'all') params.region = regionFilter

        const res = await api.get('/org/grants/discover', { params })
        if (res.data?.success) {
          setGovGrants(res.data.government?.grants || [])
          setGovTotal(res.data.government?.total || 0)
          setGovTotalPages(res.data.government?.totalPages || 0)
          if (res.data.government?.page) setGovPage(res.data.government.page)

          const agencyData = res.data.grantiq || res.data.grantos
          setGrantiqGrants(agencyData?.grants || [])
          setGrantiqTotal(agencyData?.total || 0)
          setGrantiqTotalPages(agencyData?.totalPages || 0)
          if (agencyData?.page) setGrantiqPage(agencyData.page)

          if (res.data.filters?.orgState) {
            setOrgState(res.data.filters.orgState)
          }

          // Merge loaded agencies with defaults strictly restricted to AICTE, DBT, DST, UGC
          if (res.data.filters?.govAgencies && res.data.filters.govAgencies.length > 0) {
            const allowedGov = ['aicte', 'dst', 'serb', 'ugc', 'dbt']
            const filteredGov = res.data.filters.govAgencies.filter((item) => {
              const val = (typeof item === 'string' ? item : item.value || item.name || '').toLowerCase()
              return allowedGov.some((k) => val.includes(k))
            })
            setGovAgencyOptions(filteredGov.length > 0 ? filteredGov : DEFAULT_GOV_AGENCIES)
          }
          const privateAgencies = res.data.filters?.grantiqAgencies || res.data.filters?.grantosAgencies
          if (privateAgencies && privateAgencies.length > 0) {
            const govKeywords = ['aicte', 'dst', 'serb', 'ugc', 'dbt', 'csir', 'icmr', 'drdo', 'isro']
            const sanitizedPrivate = privateAgencies.filter((item) => {
              const name = (typeof item === 'string' ? item : item.name || item.value || item.shortName || '').toLowerCase()
              return !govKeywords.includes(name)
            })
            setGrantiqAgencyOptions(sanitizedPrivate)
          }
        }
      } catch (err) {
        console.error('Failed to fetch grants:', err)
      } finally {
        setGrantsLoading(false)
      }
    },
    [search, category, status, agencyFilter, regionFilter, govPage, grantiqPage]
  )

  // Debounced search & filter trigger
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setGovPage(1)
      setGrantiqPage(1)
      fetchGrants({ govPage: 1, grantiqPage: 1 })
    }, 280)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [search, category, status, agencyFilter, regionFilter])

  // Close detail panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedGrant) {
        setSelectedGrant(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedGrant])

  // Handle Apply Proposal
  const handleApplyForGrant = async (grant) => {
    setApplyLoading(true)
    setApplyError('')
    setApplySuccess(false)
    try {
      const payload = {
        title: `Proposal: ${grant.title}`,
        grantTitle: grant.title,
        grantAgency: grant.agencyName,
        fundingAmount: grant.fundingDisplay || '',
        deadline: grant.deadlineDisplay || '',
      }

      if (grant.isProgramGrant) {
        payload.grantProgramId = grant._id
      } else {
        payload.grantListingId = grant._id
      }

      const res = await api.post('/proposals/create', payload)
      if (res.data.success) {
        setApplySuccess(true)
        const updateList = (prev) =>
          prev.map((g) => (g._id === grant._id ? { ...g, hasApplied: true } : g))
        setGovGrants(updateList)
        setGrantiqGrants(updateList)
        setSelectedGrant((prev) => (prev ? { ...prev, hasApplied: true } : prev))
        if (onProposalCreated) onProposalCreated()
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create proposal. Please try again.'
      setApplyError(msg)
    } finally {
      setApplyLoading(false)
    }
  }

  const handleSelectGrant = (grant) => {
    setSelectedGrant(grant)
    setApplyLoading(false)
    setApplySuccess(false)
    setApplyError('')
  }

  const handleClosePanel = () => {
    setSelectedGrant(null)
    setApplyLoading(false)
    setApplySuccess(false)
    setApplyError('')
  }

  const handleClearAllFilters = () => {
    setSearch('')
    setCategory('all')
    setStatus('all')
    setAgencyFilter('all')
    setRegionFilter('all')
  }

  const totalGrants = govTotal + grantiqTotal
  const hasActiveFilters = Boolean(
    search || category !== 'all' || status !== 'all' || agencyFilter !== 'all' || regionFilter !== 'all'
  )

  // Selected region display label for human-readable filter chips
  const selectedRegionLabel = useMemo(() => {
    if (regionFilter === 'all') return ''
    if (regionFilter === 'my_state') return `My State: ${orgState || 'Local'}`
    if (regionFilter === 'National') return 'Pan-India / National'
    if (regionFilter === 'State') return 'State / Regional Specific'
    if (regionFilter === 'International') return 'International / Global'
    if (regionFilter === 'NER') return 'North Eastern Region (NER)'
    return regionFilter
  }, [regionFilter, orgState])

  // Selected agency display label for human-readable filter chips
  const selectedAgencyLabel = useMemo(() => {
    if (agencyFilter === 'all') return ''
    const allOptions = [...govAgencyOptions, ...grantiqAgencyOptions]
    const found = allOptions.find((o) => {
      const v = typeof o === 'string' ? o : o.value || o.name || o.shortName
      return v && v.toLowerCase() === agencyFilter.toLowerCase()
    })
    if (found) {
      if (typeof found === 'string') return found
      return found.shortName || found.name || found.label || agencyFilter
    }
    return agencyFilter
  }, [agencyFilter, govAgencyOptions, grantiqAgencyOptions])

  // Contextual tab switching: resets agencyFilter if it doesn't belong to the new tab
  const handleTabChange = (newTab) => {
    setActiveTab(newTab)
    if (agencyFilter !== 'all') {
      const isGov = govAgencyOptions.some(
        (o) =>
          (typeof o === 'string' && o.toLowerCase() === agencyFilter.toLowerCase()) ||
          o.value?.toLowerCase() === agencyFilter.toLowerCase() ||
          o.shortName?.toLowerCase() === agencyFilter.toLowerCase() ||
          o.name?.toLowerCase() === agencyFilter.toLowerCase()
      )
      const isGrantiq = grantiqAgencyOptions.some(
        (o) =>
          (typeof o === 'string' && o.toLowerCase() === agencyFilter.toLowerCase()) ||
          o.value?.toLowerCase() === agencyFilter.toLowerCase() ||
          o.shortName?.toLowerCase() === agencyFilter.toLowerCase() ||
          o.name?.toLowerCase() === agencyFilter.toLowerCase()
      )

      if (newTab === 'government' && !isGov) {
        setAgencyFilter('all')
      } else if ((newTab === 'grantiq' || newTab === 'grantos') && !isGrantiq) {
        setAgencyFilter('all')
      }
    }
  }

  // Smart agency filter change
  const handleAgencyChange = (val) => {
    setAgencyFilter(val)
    if (val !== 'all' && activeTab === 'all') {
      const isGov = govAgencyOptions.some(
        (o) =>
          (typeof o === 'string' && o.toLowerCase() === val.toLowerCase()) ||
          o.value?.toLowerCase() === val.toLowerCase() ||
          o.shortName?.toLowerCase() === val.toLowerCase() ||
          o.name?.toLowerCase() === val.toLowerCase()
      )
      const isGrantiq = grantiqAgencyOptions.some(
        (o) =>
          (typeof o === 'string' && o.toLowerCase() === val.toLowerCase()) ||
          o.value?.toLowerCase() === val.toLowerCase() ||
          o.shortName?.toLowerCase() === val.toLowerCase() ||
          o.name?.toLowerCase() === val.toLowerCase()
      )
      if (isGov) setActiveTab('government')
      else if (isGrantiq) setActiveTab('grantiq')
    }
  }

  return (
    <div className={embedded ? '' : 'p-5 sm:p-7 lg:p-8 max-w-7xl mx-auto'}>
      {/* Page / Section Header */}
      <div className="mb-6 animate-fade-up">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-warm-gray-900 mb-1">
          Grant Discovery
        </h1>
        <p className="text-sm text-warm-gray-500">
          Explore and apply for verified funding opportunities matching your organization profile
        </p>
      </div>

      {/* ─── Source Tabs (Requirement 1 & 2: Government & Other Sources FIRST, distinct tags) ─── */}
      <div
        className="flex items-center gap-2 mb-6 flex-wrap border-b border-warm-gray-200/70 pb-3"
        id="grant-source-tabs"
      >
        <button
          onClick={() => handleTabChange('government')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-semibold transition-all cursor-pointer ${activeTab === 'government'
              ? 'bg-primary text-white shadow-soft'
              : 'bg-surface-elevated text-warm-gray-600 hover:bg-warm-gray-100/80 border border-warm-gray-200/70'
            }`}
          id="tab-government-source"
        >
          <span>🏛️</span>
          Government & Other Sources
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'government'
                ? 'bg-white/20 text-white'
                : 'bg-warm-gray-100 text-warm-gray-600'
              }`}
          >
            {govTotal}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('grantiq')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-semibold transition-all cursor-pointer ${(activeTab === 'grantiq' || activeTab === 'grantos')
              ? 'bg-amber-600 text-white shadow-soft'
              : 'bg-surface-elevated text-warm-gray-600 hover:bg-warm-gray-100/80 border border-warm-gray-200/70'
            }`}
          id="tab-grantiq-source"
        >
          <span>🌿</span>
          GrantIQ Funding Agencies
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${(activeTab === 'grantiq' || activeTab === 'grantos')
                ? 'bg-white/20 text-white'
                : 'bg-warm-gray-100 text-warm-gray-600'
              }`}
          >
            {grantiqTotal}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('all')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-semibold transition-all cursor-pointer ${activeTab === 'all'
              ? 'bg-warm-gray-800 text-white shadow-soft'
              : 'bg-surface-elevated text-warm-gray-600 hover:bg-warm-gray-100/80 border border-warm-gray-200/70'
            }`}
          id="tab-all-sources"
        >
          <span>📋</span>
          All Sources
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-warm-gray-100 text-warm-gray-600'
              }`}
          >
            {totalGrants}
          </span>
        </button>
      </div>

      {/* ─── Search & Filters Bar (Requirement 7: Resized search bar; Requirement 3: Org dropdown) ─── */}
      <div className="bg-surface-elevated rounded-[14px] border border-warm-gray-200/70 shadow-soft p-4 mb-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
          {/* Search bar — Resized & compact (Requirement 7) */}
          <div className="relative w-full sm:w-64 md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search grants or keywords..."
              className="w-full pl-9 pr-7 py-2 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 text-sm placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              id="grant-search-input"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-gray-400 hover:text-warm-gray-600 text-xs cursor-pointer p-0.5"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category dropdown */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer min-w-[150px]"
            id="grant-category-filter"
          >
            {GRANT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Status dropdown */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer min-w-[120px]"
            id="grant-status-filter"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Organization dropdown filter (Contextual to activeTab for clarity) */}
          <select
            value={agencyFilter}
            onChange={(e) => handleAgencyChange(e.target.value)}
            className="px-3 py-2 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer min-w-[210px] max-w-[320px] truncate"
            id="grant-agency-filter"
            title="Filter by organization or agency"
          >
            {activeTab === 'government' ? (
              <>
                <option value="all">🏛️ All Government Agencies</option>
                {govAgencyOptions.map((item) => {
                  const val = typeof item === 'string' ? item : item.value || item.name
                  const lbl = typeof item === 'string' ? item : item.label || item.name
                  return (
                    <option key={val} value={val}>
                      {lbl}
                    </option>
                  )
                })}
              </>
            ) : (activeTab === 'grantiq' || activeTab === 'grantos') ? (
              <>
                <option value="all">🌿 All Partner Agencies</option>
                {grantiqAgencyOptions.map((item) => {
                  const val = typeof item === 'string' ? item : item.value || item.name
                  const lbl = typeof item === 'string' ? item : item.label || item.name
                  return (
                    <option key={val} value={val}>
                      {lbl}
                    </option>
                  )
                })}
              </>
            ) : (
              <>
                <option value="all">🏢 All Organizations</option>
                {govAgencyOptions.length > 0 && (
                  <optgroup label="Government Agencies">
                    {govAgencyOptions.map((item) => {
                      const val = typeof item === 'string' ? item : item.value || item.name
                      const lbl = typeof item === 'string' ? item : item.label || item.name
                      return (
                        <option key={val} value={val}>
                          {lbl}
                        </option>
                      )
                    })}
                  </optgroup>
                )}
                {grantiqAgencyOptions.length > 0 && (
                  <optgroup label="Private & Partner Foundations">
                    {grantiqAgencyOptions.map((item) => {
                      const val = typeof item === 'string' ? item : item.value || item.name
                      const lbl = typeof item === 'string' ? item : item.label || item.name
                      return (
                        <option key={val} value={val}>
                          {lbl}
                        </option>
                      )
                    })}
                  </optgroup>
                )}
              </>
            )}
          </select>

          {/* Region dropdown filter */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer min-w-[170px] max-w-[260px] truncate"
            id="grant-region-filter"
            title="Filter grants by geographic region or state"
          >
            <option value="all">🌐 All Regions & Scopes</option>
            {orgState && (
              <option value="my_state">🎯  State: {orgState} (Eligible)</option>
            )}
            <optgroup label="Geographic Scope">
              <option value="National">🇮🇳 Pan-India / National Schemes</option>
              <option value="State">🏛️ State / Regional Specific</option>
              <option value="International">🌍 International / Global</option>
            </optgroup>
            <optgroup label="Priority Regional Zones">
              <option value="NER">🏔️ North Eastern Region (NER)</option>
            </optgroup>
            <optgroup label="Specific Indian States">
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-warm-gray-200/50 text-xs">
            <span className="text-warm-gray-400 font-medium">Active filters:</span>
            {regionFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-primary-50 text-primary border border-primary/20">
                Region: {selectedRegionLabel}
                <button
                  onClick={() => setRegionFilter('all')}
                  className="hover:text-primary-dark cursor-pointer font-bold"
                  title="Remove region filter"
                >
                  ✕
                </button>
              </span>
            )}
            {agencyFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-primary-50 text-primary border border-primary/20">
                Organization: {selectedAgencyLabel}
                <button
                  onClick={() => setAgencyFilter('all')}
                  className="hover:text-primary-dark cursor-pointer font-bold"
                >
                  ✕
                </button>
              </span>
            )}
            {category !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-cream text-warm-gray-700 border border-warm-gray-200">
                Category: {GRANT_TYPES.find((t) => t.value === category)?.label || category}
                <button
                  onClick={() => setCategory('all')}
                  className="hover:text-warm-gray-900 cursor-pointer font-bold"
                >
                  ✕
                </button>
              </span>
            )}
            {status !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-cream text-warm-gray-700 border border-warm-gray-200">
                Status: {status}
                <button
                  onClick={() => setStatus('all')}
                  className="hover:text-warm-gray-900 cursor-pointer font-bold"
                >
                  ✕
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-cream text-warm-gray-700 border border-warm-gray-200">
                &quot;{search}&quot;
                <button
                  onClick={() => setSearch('')}
                  className="hover:text-warm-gray-900 cursor-pointer font-bold"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              onClick={handleClearAllFilters}
              className="text-primary hover:underline font-semibold ml-1 cursor-pointer"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {grantsLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-warm-gray-500 text-sm font-medium">Discovering matching grants...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!grantsLoading && totalGrants === 0 && (
        <div className="text-center py-20 animate-fade-up bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 p-8">
          <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-4 border border-warm-gray-200">
            <span className="text-3xl">🔍</span>
          </div>
          <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-1">
            No grants found
          </h3>
          <p className="text-warm-gray-500 text-sm max-w-md mx-auto mb-4">
            We couldn&apos;t find any grants matching your current search criteria or organization filter.
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="px-4 py-2 rounded-[10px] bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: Government & Other Sources (SHOWN FIRST)              */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {!grantsLoading && (activeTab === 'government' || activeTab === 'all') && (
        <div className="mb-10 animate-fade-up">
          <SectionHeader
            icon="🏛️"
            title="Government & Other Sources"
            subtitle="Official research grants from AICTE, DBT, DST, and UGC"
            count={govTotal}
            accentColor="primary"
          />

          {govGrants.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {govGrants.map((grant, i) => (
                  <GrantCard
                    key={grant._id}
                    grant={grant}
                    index={i}
                    onSelect={handleSelectGrant}
                  />
                ))}
              </div>

              <PaginationControls
                currentPage={govPage}
                totalPages={govTotalPages}
                onPageChange={(page) => {
                  setGovPage(page)
                  fetchGrants({ govPage: page })
                }}
              />
            </>
          ) : (
            <div className="bg-surface-elevated rounded-[14px] p-6 text-center border border-warm-gray-200/60">
              <p className="text-sm text-warm-gray-500">
                No government grants match the selected filters.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearAllFilters}
                  className="mt-2 text-xs text-primary hover:underline font-semibold cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: GrantIQ Funding Agencies (SHOWN SECOND)              */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {!grantsLoading && (activeTab === 'grantiq' || activeTab === 'grantos' || activeTab === 'all') && (
        <div className="mb-10 animate-fade-up">
          <SectionHeader
            icon="🌿"
            title="GrantIQ Funding Agencies"
            subtitle="Calls from verified partner institutions and private foundations on GrantIQ"
            count={grantiqTotal}
            accentColor="amber"
          />

          {grantiqGrants.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grantiqGrants.map((grant, i) => (
                  <GrantCard
                    key={grant._id}
                    grant={grant}
                    index={i}
                    onSelect={handleSelectGrant}
                  />
                ))}
              </div>

              <PaginationControls
                currentPage={grantiqPage}
                totalPages={grantiqTotalPages}
                onPageChange={(page) => {
                  setGrantiqPage(page)
                  fetchGrants({ grantiqPage: page })
                }}
              />
            </>
          ) : (
            <div className="bg-surface-elevated rounded-[14px] p-6 text-center border border-warm-gray-200/60">
              <p className="text-sm text-warm-gray-500">
                No GrantIQ partner agency grants match the selected filters.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearAllFilters}
                  className="mt-2 text-xs text-primary hover:underline font-semibold cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Grant Detail Modal ─── */}
      {selectedGrant && (
        <GrantDetailPanel
          grant={selectedGrant}
          onClose={handleClosePanel}
          userRole={userRole}
          onApply={handleApplyForGrant}
          applyLoading={applyLoading}
          applySuccess={applySuccess}
          applyError={applyError}
        />
      )}
    </div>
  )
}
