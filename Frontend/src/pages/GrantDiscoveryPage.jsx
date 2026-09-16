import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

// ─── Constants ───
const GRANT_TYPES = [
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

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'Open', label: 'Open' },
  { value: 'Closing Soon', label: 'Closing Soon' },
]

// ─── Sidebar nav items (same as OrgDashboard) ───
const NAV_ITEMS = [
  { key: 'home', label: 'Dashboard', icon: '🏠' },
  { key: 'proposals', label: 'Proposal Management', icon: '📝' },
  { key: 'grants', label: 'Grant Discovery', icon: '🔍' },
  { key: 'applications', label: 'Applications', icon: '📋' },
  { key: 'team', label: 'Team Management', icon: '👥' },
  { key: 'deadlines', label: 'Deadline Alerts', icon: '🔔' },
  { key: 'analytics', label: 'Analytics', icon: '📈' },
]

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

// Format grant type for display
function formatGrantType(type) {
  if (!type) return ''
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Format eligible applicant types for display
function formatApplicantType(type) {
  if (!type) return ''
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ─── Grant Detail Panel Component ───
function GrantDetailPanel({ grant, onClose, userRole, onApply, applyLoading, applySuccess, applyError }) {
  if (!grant) return null

  const canApply = userRole === 'org_admin' && grant.displayStatus === 'Open' && !grant.hasApplied && !applySuccess

  const handleApplyClick = () => {
    if (!window.confirm(`Start a proposal for "${grant.title}"? This will create a new 17-section proposal pre-filled with this grant's details.`)) return
    onApply(grant)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" id="grant-detail-overlay">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium overflow-hidden flex flex-col animate-fade-up"
        style={{ animationDuration: '0.3s' }}
        id="grant-detail-panel"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-warm-gray-50 hover:bg-warm-gray-100 flex items-center justify-center text-warm-gray-500 hover:text-warm-gray-700 transition-all duration-200 cursor-pointer"
          id="grant-detail-close"
          aria-label="Close grant details"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-7 flex-1">
          {/* Header */}
          <div className="mb-5 pr-8">
            <div className="flex items-start gap-3 mb-2">
              <h2 className="font-heading text-xl font-bold text-warm-gray-900 leading-tight flex-1">
                {grant.title}
              </h2>
              <span
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  grant.displayStatus === 'Open'
                    ? 'bg-green-50 text-green-600 border-green-200'
                    : grant.displayStatus === 'Closing Soon'
                      ? 'bg-orange-50 text-orange-600 border-orange-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                }`}
              >
                {grant.displayStatus}
              </span>
            </div>
            <p className="text-sm text-warm-gray-500">{grant.agencyName}</p>
          </div>

          {/* Key Info Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {grant.fundingDisplay && (
              <div className="bg-cream rounded-[12px] p-3.5 border border-warm-gray-200/40">
                <p className="text-[10px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">Funding</p>
                <p className="text-sm font-bold text-warm-gray-900">{grant.fundingDisplay}</p>
              </div>
            )}
            {grant.deadlineDisplay && (
              <div className="bg-cream rounded-[12px] p-3.5 border border-warm-gray-200/40">
                <p className="text-[10px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">Deadline</p>
                <p className="text-sm font-bold text-warm-gray-900">{grant.deadlineDisplay}</p>
              </div>
            )}
            {grant.durationDisplay && (
              <div className="bg-cream rounded-[12px] p-3.5 border border-warm-gray-200/40">
                <p className="text-[10px] uppercase tracking-wider text-warm-gray-400 font-semibold mb-1">Duration</p>
                <p className="text-sm font-bold text-warm-gray-900">{grant.durationDisplay}</p>
              </div>
            )}
          </div>

          {/* Category & Match */}
          <div className="flex items-center justify-between mb-6">
            <span className="px-3 py-1.5 rounded-full bg-cream text-warm-gray-600 text-xs font-medium border border-warm-gray-200/60">
              {grant.categoryRaw || formatGrantType(grant.grantType)}
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

          {/* Divider */}
          <div className="h-px bg-warm-gray-200/60 mb-5" />

          {/* Description */}
          {grant.description && (
            <div className="mb-5">
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">Description</h3>
              <p className="text-sm text-warm-gray-600 leading-relaxed whitespace-pre-line">{grant.description}</p>
            </div>
          )}

          {/* Eligibility */}
          {grant.eligibilityText && (
            <div className="mb-5">
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">Eligibility</h3>
              <p className="text-sm text-warm-gray-600 leading-relaxed whitespace-pre-line">{grant.eligibilityText}</p>
            </div>
          )}

          {/* Application Procedure */}
          {grant.applicationProcedure && (
            <div className="mb-5">
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">Application Procedure</h3>
              <p className="text-sm text-warm-gray-600 leading-relaxed whitespace-pre-line">{grant.applicationProcedure}</p>
            </div>
          )}

          {/* Focus Areas */}
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

          {/* Eligible Applicant Types */}
          {grant.eligibleApplicantTypes && grant.eligibleApplicantTypes.length > 0 && (
            <div className="mb-5">
              <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-2">Eligible Applicants</h3>
              <div className="flex flex-wrap gap-2">
                {grant.eligibleApplicantTypes.map((type, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber text-xs font-medium border border-amber/15">
                    {formatApplicantType(type)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Apply feedback */}
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

        {/* Footer — View Details link + Apply */}
        <div className="px-7 py-4 border-t border-warm-gray-200/60 bg-warm-gray-50/50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-3">
            {grant.infoUrl && (
              <a
                href={grant.infoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-surface-elevated border border-warm-gray-200 text-warm-gray-700 text-sm font-semibold hover:bg-warm-gray-50 transition-colors"
                id="grant-detail-view-link"
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

          {/* Apply / Already Applied */}
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
                id="grant-apply-btn"
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

// ─── Main Page Component ───
export default function GrantDiscoveryPage() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(true)
  const [grantsLoading, setGrantsLoading] = useState(false)
  const [grants, setGrants] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })

  // Filters
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Detail panel state
  const [selectedGrant, setSelectedGrant] = useState(null)

  // Apply state
  const [applyLoading, setApplyLoading] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)
  const [applyError, setApplyError] = useState('')

  // Debounce ref
  const debounceTimer = useRef(null)

  // ─── Fetch user info ───
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me')
        if (res.data.success) {
          setUserName(res.data.user.fullName)
          setUserRole(res.data.user.role)
          if (res.data.orgStatus) {
            setOrgName(res.data.orgStatus.organizationName)
          }
        }
      } catch (err) {
        console.error('Failed to fetch user:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  // ─── Fetch grants ───
  const fetchGrants = useCallback(
    async (page = 1) => {
      setGrantsLoading(true)
      try {
        const params = { page, limit: 20 }
        if (search.trim()) params.search = search.trim()
        if (category !== 'all') params.category = category
        if (status !== 'all') params.status = status

        const res = await api.get('/org/grants/discover', { params })
        if (res.data.success) {
          setGrants(res.data.grants)
          setPagination(res.data.pagination)
        }
      } catch (err) {
        console.error('Failed to fetch grants:', err)
      } finally {
        setGrantsLoading(false)
      }
    },
    [search, category, status]
  )

  // Debounced search
  useEffect(() => {
    if (loading) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchGrants(1)
    }, 300)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [search, category, status, loading, fetchGrants])

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

  const handleLogout = () => {
    localStorage.removeItem('grantos_token')
    localStorage.removeItem('grantos_user')
    navigate('/login')
  }

  const handleNavClick = (key) => {
    setSidebarOpen(false)
    if (key === 'grants') return // Already on this page
    if (key === 'home') {
      if (userRole === 'team_member') navigate('/member/dashboard')
      else navigate('/org/dashboard')
    } else {
      // For sections that live on OrgDashboard
      navigate('/org/dashboard')
    }
  }

  // ─── Apply for grant handler ───
  const handleApplyForGrant = async (grant) => {
    setApplyLoading(true)
    setApplyError('')
    setApplySuccess(false)
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
        setApplySuccess(true)
        // Update the local grants list so the card shows "Already Applied" without refetching
        setGrants((prev) =>
          prev.map((g) => (g._id === grant._id ? { ...g, hasApplied: true } : g))
        )
        // Also update the selected grant in the detail panel
        setSelectedGrant((prev) => prev ? { ...prev, hasApplied: true } : prev)
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create proposal. Please try again.'
      setApplyError(msg)
    } finally {
      setApplyLoading(false)
    }
  }

  // Reset apply state when detail panel is closed or a different grant is selected
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

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex">
      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface-elevated border-r border-warm-gray-200/60 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        id="grant-discovery-sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-warm-gray-200/60">
            <Link to="/" className="flex items-center gap-2 group" id="discovery-logo">
              <div className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
                <LeafIcon />
              </div>
              <span className="font-heading text-xl font-semibold text-warm-gray-900 tracking-tight">
                Grant<span className="text-primary">OS</span>
              </span>
            </Link>
            {orgName && (
              <p className="text-xs text-warm-gray-500 mt-2 truncate">{orgName}</p>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium transition-all duration-200 cursor-pointer ${
                  item.key === 'grants'
                    ? 'bg-primary text-white shadow-soft'
                    : 'text-warm-gray-600 hover:bg-warm-gray-50 hover:text-warm-gray-900'
                }`}
                id={`nav-${item.key}`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-warm-gray-200/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-warm-gray-900 truncate">{userName}</p>
                <p className="text-xs text-warm-gray-500">Org Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 rounded-[10px] text-sm text-warm-gray-500 hover:text-warm-gray-700 hover:bg-warm-gray-50 transition-colors cursor-pointer"
              id="sidebar-sign-out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 lg:ml-64">
        {/* Top bar (mobile only) */}
        <header className="lg:hidden sticky top-0 z-30 bg-surface-elevated border-b border-warm-gray-200/60 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-warm-gray-600 cursor-pointer"
            id="mobile-menu-toggle"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-heading font-semibold text-warm-gray-900">Grant<span className="text-primary">OS</span></span>
          <div className="w-8" />
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 animate-fade-up">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-warm-gray-900 mb-2">
              Grant Discovery
            </h1>
            <p className="text-warm-gray-500">
              Find and apply for grants matching your organization profile
            </p>
          </div>

          {/* Search & Filters */}
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-gray-400">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search grants by name, agency, or keyword..."
                  className="w-full pl-11 pr-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  id="grant-search-input"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  id="grant-category-filter"
                >
                  {GRANT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  id="grant-status-filter"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results count */}
          {!grantsLoading && (
            <div className="flex items-center justify-between mb-4 animate-fade-up" style={{ animationDelay: '0.15s' }}>
              <p className="text-sm text-warm-gray-500">
                Showing <span className="font-semibold text-warm-gray-700">{grants.length}</span> of{' '}
                <span className="font-semibold text-warm-gray-700">{pagination.total}</span> grants
              </p>
              {pagination.totalPages > 1 && (
                <p className="text-sm text-warm-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
              )}
            </div>
          )}

          {/* Loading */}
          {grantsLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-warm-gray-500 text-sm">Discovering matching grants...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!grantsLoading && grants.length === 0 && (
            <div className="text-center py-20 animate-fade-up">
              <div className="w-16 h-16 bg-warm-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="font-heading text-xl font-bold text-warm-gray-900 mb-2">No grants found</h3>
              <p className="text-warm-gray-500 text-sm max-w-md mx-auto">
                Try adjusting your search terms or filters to discover more grants.
              </p>
            </div>
          )}

          {/* Grants Grid */}
          {!grantsLoading && grants.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {grants.map((grant, i) => (
                <div
                  key={grant._id}
                  onClick={() => handleSelectGrant(grant)}
                  className="group bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300 cursor-pointer animate-fade-up"
                  style={{ animationDelay: `${0.05 * (i + 1)}s` }}
                  id={`grant-card-${grant._id}`}
                >
                  {/* Title & Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1 mr-3">
                      <h3 className="font-heading text-base font-bold text-warm-gray-900 group-hover:text-primary transition-colors mb-1 line-clamp-2">
                        {grant.title}
                      </h3>
                      <p className="text-xs text-warm-gray-500 truncate">{grant.agencyName}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        grant.displayStatus === 'Open'
                          ? 'bg-green-50 text-green-600 border-green-200'
                          : grant.displayStatus === 'Closing Soon'
                            ? 'bg-orange-50 text-orange-600 border-orange-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                      }`}
                    >
                      {grant.displayStatus}
                    </span>
                  </div>

                  {/* Funding & Deadline */}
                  <div className="flex items-center gap-4 mb-4">
                    {grant.fundingDisplay && (
                      <>
                        <span className="text-sm font-bold text-warm-gray-900">{grant.fundingDisplay}</span>
                        <span className="text-xs text-warm-gray-400">•</span>
                      </>
                    )}
                    {grant.deadlineDisplay && (
                      <span className="text-xs text-warm-gray-500">Deadline: {grant.deadlineDisplay}</span>
                    )}
                    {!grant.fundingDisplay && !grant.deadlineDisplay && (
                      <span className="text-xs text-warm-gray-400 italic">Details not available</span>
                    )}
                  </div>

                  {/* Category & Match */}
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-cream text-warm-gray-600 text-xs font-medium border border-warm-gray-200/60">
                      {grant.categoryRaw || formatGrantType(grant.grantType)}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-warm-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${grant.matchPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-primary min-w-[32px] text-right">
                        {grant.matchPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!grantsLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 animate-fade-up">
              <button
                onClick={() => fetchGrants(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-4 py-2 rounded-[10px] text-sm font-medium bg-surface-elevated border border-warm-gray-200/60 text-warm-gray-600 hover:bg-warm-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Previous
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4))
                const pageNum = start + i
                if (pageNum > pagination.totalPages) return null
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchGrants(pageNum)}
                    className={`w-10 h-10 rounded-[10px] text-sm font-semibold transition-colors cursor-pointer ${
                      pageNum === pagination.page
                        ? 'bg-primary text-white shadow-soft'
                        : 'bg-surface-elevated border border-warm-gray-200/60 text-warm-gray-600 hover:bg-warm-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => fetchGrants(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 rounded-[10px] text-sm font-medium bg-surface-elevated border border-warm-gray-200/60 text-warm-gray-600 hover:bg-warm-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ─── Grant Detail Panel Overlay ─── */}
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
