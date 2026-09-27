import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import ProposalWritingWorkspace from '../components/ProposalWritingWorkspace'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

// ─── Task-to-feature mapping ───
const TASK_FEATURES = {
  grant_discovery: {
    key: 'grant_discovery',
    label: 'Grant Discovery',
    icon: '🔍',
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    description: 'Browse and discover grants matching your organization\'s profile',
  },
  proposal_writing: {
    key: 'proposal_writing',
    label: 'Proposal Writing',
    icon: '📝',
    color: 'from-purple-500 to-purple-600',
    bgLight: 'bg-purple-50',
    description: 'Draft, review, and submit compelling grant proposals',
  },
}

// ─── Grant Discovery helpers (mirrors OrgDashboardPage — team member view is
// read-only: same data, same detail modals, no Write Proposal button, since
// proposal creation is org_admin-only on the backend) ───
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

const GRANT_TYPE_LABELS = {
  research_grant: 'Research Grant',
  fellowship: 'Fellowship',
  scholarship: 'Scholarship',
  seed_fund: 'Seed Fund',
  infrastructure: 'Infrastructure Grant',
  other: 'General Grant',
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

const formatScrapedFunding = (fundingAmount) => {
  if (!fundingAmount) return null
  const { minINR, maxINR, rawText } = fundingAmount
  if (minINR || maxINR) {
    const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`
    if (minINR && maxINR && minINR !== maxINR) return `${fmt(minINR)} – ${fmt(maxINR)}`
    return fmt(maxINR || minINR)
  }
  return rawText || null
}

const formatScrapedDeadline = (deadline) => {
  if (!deadline) return 'Not specified'
  if (deadline.parsedDate) return formatGrantDate(deadline.parsedDate)
  if (deadline.rawText) return deadline.rawText
  return 'Not specified'
}

const formatScrapedDuration = (duration) => {
  if (!duration) return 'Not specified'
  if (duration.months) return `${duration.months} months`
  if (duration.rawText) return duration.rawText
  return 'Not specified'
}

const getScrapedLinks = (links) => {
  if (!links) return []
  const out = []
  if (links.applicationUrl) out.push({ key: 'applicationUrl', label: 'Apply Online', icon: '📝', url: links.applicationUrl })
  if (links.guidelinesUrl) out.push({ key: 'guidelinesUrl', label: 'View Guidelines', icon: '📄', url: links.guidelinesUrl })
  if (links.infoUrl) out.push({ key: 'infoUrl', label: 'More Information', icon: '🔗', url: links.infoUrl })
  return out
}

export default function TeamMemberDashboard() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [assignedTasks, setAssignedTasks] = useState([])
  const [activeTask, setActiveTask] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ─── My Organization modal ───
  const [myOrgModalOpen, setMyOrgModalOpen] = useState(false)
  const [myOrganization, setMyOrganization] = useState(null)
  const [myOrgLoading, setMyOrgLoading] = useState(false)

  // ─── Grant Discovery (real data) ───
  const [grantSource, setGrantSource] = useState('agency') // 'agency' | 'scraped'
  const [openGrants, setOpenGrants] = useState([])
  const [grantsLoading, setGrantsLoading] = useState(false)
  const [scrapedGrants, setScrapedGrants] = useState([])
  const [scrapedGrantsLoading, setScrapedGrantsLoading] = useState(false)
  const [grantSearch, setGrantSearch] = useState('')
  const [grantCategoryFilter, setGrantCategoryFilter] = useState('All Categories')
  const [grantFundingTypeFilter, setGrantFundingTypeFilter] = useState('All Types')
  const [viewAgencyGrant, setViewAgencyGrant] = useState(null)
  const [viewGrantDetails, setViewGrantDetails] = useState(null)
  const [viewScrapedGrant, setViewScrapedGrant] = useState(null)

  // ─── Grant context for assigned proposals (shown above the writing workspace) ───
  const [myAssignedProposals, setMyAssignedProposals] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/auth/me')
        if (res.data.success) {
          setUserName(res.data.user.fullName)
          const userTasks = (res.data.user.assignedTasks && res.data.user.assignedTasks.length > 0)
            ? res.data.user.assignedTasks
            : ['proposal_writing', 'grant_discovery']
          setAssignedTasks(userTasks)
          if (res.data.orgStatus) {
            setOrgName(res.data.orgStatus.organizationName)
          }
          setActiveTask(userTasks.includes('proposal_writing') ? 'proposal_writing' : userTasks[0])
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Fetch real grant data when Grant Discovery tab is active
  useEffect(() => {
    if (activeTask === 'grant_discovery') {
      fetchOpenGrants()
    }
  }, [activeTask])

  useEffect(() => {
    if (activeTask === 'grant_discovery' && grantSource === 'scraped' && scrapedGrants.length === 0 && !scrapedGrantsLoading) {
      fetchScrapedGrants()
    }
  }, [activeTask, grantSource])

  // Fetch assigned proposals (for grant-context strip) when Proposal Writing tab is active.
  // Read-only use of an existing endpoint — does not touch ProposalWritingWorkspace.
  useEffect(() => {
    if (activeTask === 'proposal_writing') {
      fetchMyAssignedProposals()
      if (openGrants.length === 0) fetchOpenGrants()
    }
  }, [activeTask])

  const fetchOpenGrants = async () => {
    setGrantsLoading(true)
    try {
      const res = await api.get('/proposals/open-grants')
      if (res.data.success) setOpenGrants(res.data.programs || [])
    } catch (err) {
      console.error('Failed to fetch open grants:', err)
    } finally {
      setGrantsLoading(false)
    }
  }

  const fetchScrapedGrants = async () => {
    setScrapedGrantsLoading(true)
    try {
      const res = await api.get('/proposals/scraped-grants')
      if (res.data.success) setScrapedGrants(res.data.grants || [])
    } catch (err) {
      console.error('Failed to fetch scraped grants:', err)
    } finally {
      setScrapedGrantsLoading(false)
    }
  }

  const fetchMyAssignedProposals = async () => {
    try {
      const res = await api.get('/proposals/my-assigned')
      if (res.data.success) setMyAssignedProposals(res.data.proposals || [])
    } catch (err) {
      console.error('Failed to fetch assigned proposals:', err)
    }
  }

  const openMyOrganizationModal = async () => {
    setMyOrgModalOpen(true)
    if (myOrganization) return // already fetched this session
    setMyOrgLoading(true)
    try {
      const res = await api.get('/proposals/my-organization')
      if (res.data.success) setMyOrganization(res.data.organization)
    } catch (err) {
      console.error('Failed to fetch organization:', err)
    } finally {
      setMyOrgLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('grantos_token')
    localStorage.removeItem('grantos_user')
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // No tasks assigned
  if (assignedTasks.length === 0) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <header className="bg-surface-elevated border-b border-warm-gray-200/60 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center text-white"><LeafIcon /></div>
              <span className="font-heading text-xl font-semibold text-warm-gray-900 tracking-tight">Grant<span className="text-primary">OS</span></span>
            </Link>
            <button onClick={handleLogout} className="text-sm text-warm-gray-500 hover:text-warm-gray-700 font-medium transition-colors cursor-pointer">Sign Out</button>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📋</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-4">No Tasks Assigned Yet</h1>
            <p className="text-warm-gray-500 mb-2">Your Organization Admin hasn't assigned any tasks to you yet.</p>
            <p className="text-sm text-warm-gray-400">Once tasks are assigned, you'll see the relevant features and tools here.</p>
            {orgName && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary/15 mt-6">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-semibold text-primary">{orgName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const activeFeature = TASK_FEATURES[activeTask]

  // Filtered grant lists (same logic as org admin side)
  const filteredGrants = openGrants.filter((g) => {
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

  const filteredScrapedGrants = scrapedGrants.filter((g) => {
    const q = grantSearch.trim().toLowerCase()
    if (!q) return true
    return (
      g.title?.toLowerCase().includes(q) ||
      g.agency?.name?.toLowerCase().includes(q) ||
      g.grantType?.toLowerCase().includes(q) ||
      g.focusAreas?.some((f) => f.toLowerCase().includes(q))
    )
  })

  // Distinct grants behind this team member's assigned sections — resolved
  // against the openGrants list already fetched, so the "View Grant Details"
  // button in the context strip has real data to show.
  const grantContextItems = (() => {
    const seen = new Set()
    const items = []
    for (const prop of myAssignedProposals) {
      const key = prop.grantProgram || prop.grantTitle
      if (!key || seen.has(key)) continue
      seen.add(key)
      const resolvedGrant = prop.grantProgram ? openGrants.find((g) => g._id === prop.grantProgram) : null
      items.push({
        proposalId: prop._id,
        proposalTitle: prop.title,
        grantTitle: prop.grantTitle,
        grantAgency: prop.grantAgency,
        resolvedGrant, // full GrantProgram object if still active/found, else null
      })
    }
    return items
  })()

  return (
    <div className="min-h-screen bg-cream flex">
      {/* ─── Sidebar ─── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface-elevated border-r border-warm-gray-200/60 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-warm-gray-200/60">
            <Link to="/" className="flex items-center gap-2 group" id="member-dash-logo">
              <div className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105"><LeafIcon /></div>
              <span className="font-heading text-xl font-semibold text-warm-gray-900 tracking-tight">Grant<span className="text-primary">OS</span></span>
            </Link>
            {orgName && <p className="text-xs text-warm-gray-500 mt-2 truncate">{orgName}</p>}
          </div>

          {/* Task Nav */}
          <div className="p-4">
            <p className="text-[10px] font-bold text-warm-gray-400 uppercase tracking-wider mb-3 px-2">My Tasks</p>
            <nav className="space-y-1">
              {assignedTasks.map((taskKey) => {
                const task = TASK_FEATURES[taskKey]
                if (!task) return null
                return (
                  <button
                    key={taskKey}
                    onClick={() => {
                      if (taskKey === 'grant_discovery') {
                        navigate('/org/grants/discover')
                        return
                      }
                      setActiveTask(taskKey); setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium transition-all duration-200 cursor-pointer ${activeTask === taskKey
                        ? 'bg-primary text-white shadow-soft'
                        : 'text-warm-gray-600 hover:bg-warm-gray-50 hover:text-warm-gray-900'
                      }`}
                  >
                    <span className="text-lg">{task.icon}</span>
                    {task.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* My Organization button — always visible regardless of active task */}
          <div className="px-4">
            <button
              onClick={openMyOrganizationModal}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium text-warm-gray-600 hover:bg-warm-gray-50 hover:text-warm-gray-900 transition-all duration-200 cursor-pointer border border-warm-gray-200/60"
            >
              <span className="text-lg">🏢</span>
              My Organization
            </button>
          </div>

          <div className="flex-1" />

          {/* User */}
          <div className="p-4 border-t border-warm-gray-200/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-warm-gray-900 truncate">{userName}</p>
                <p className="text-xs text-warm-gray-500">Team Member</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full px-4 py-2 rounded-[10px] text-sm text-warm-gray-500 hover:text-warm-gray-700 hover:bg-warm-gray-50 transition-colors cursor-pointer">
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ─── Main Content ─── */}
      <main className="flex-1 lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-surface-elevated border-b border-warm-gray-200/60 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-warm-gray-600 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-heading font-semibold text-warm-gray-900">Grant<span className="text-primary">OS</span></span>
          <button onClick={openMyOrganizationModal} className="p-2 text-warm-gray-600 cursor-pointer">🏢</button>
        </header>

        {activeFeature && (
          <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            {/* ─── Proposal Writing: grant context strip + unmodified workspace ─── */}
            {activeTask === 'proposal_writing' ? (
              <>
                                {grantContextItems.length > 0 && (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {grantContextItems.map((item) => (
                      <div
                        key={item.proposalId}
                        className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-surface-elevated border border-warm-gray-200/60 shadow-soft text-xs"
                      >
                        <span className="text-warm-gray-500">Writing for:</span>
                        <span className="font-semibold text-warm-gray-900">{item.grantTitle || item.proposalTitle}</span>
                        {item.grantAgency && <span className="text-warm-gray-400">• {item.grantAgency}</span>}
                        {item.resolvedGrant ? (
                          <>
                            <button
                              onClick={() => setViewAgencyGrant(item.resolvedGrant)}
                              className="ml-1 px-2 py-1 rounded-[8px] bg-cream text-warm-gray-700 font-semibold hover:bg-warm-gray-100 border border-warm-gray-200 transition-colors cursor-pointer"
                            >
                              View Agency
                            </button>
                            <button
                              onClick={() => setViewGrantDetails(item.resolvedGrant)}
                              className="px-2 py-1 rounded-[8px] bg-primary-50 text-primary font-semibold hover:bg-primary-100 transition-colors cursor-pointer"
                            >
                              View Grant Details
                            </button>
                          </>
                        ) : (
                          <span className="ml-1 text-warm-gray-400 italic">(details unavailable)</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <ProposalWritingWorkspace userName={userName} />
              </>
            ) : (
              <>
                {/* ─── Grant Discovery: real data, read-only ─── */}
                <div className="mb-8">
                  <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Grant Discovery</h1>
                  <p className="text-warm-gray-500">Browse open calls from GrantOS funding agencies and government/scraped listings</p>
                </div>

                <div className="flex items-center gap-2 mb-6 border-b border-warm-gray-200/60 pb-3">
                  <button
                    onClick={() => setGrantSource('agency')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${grantSource === 'agency'
                      ? 'bg-primary text-white border-primary shadow-soft'
                      : 'bg-white text-warm-gray-700 border-warm-gray-200 hover:bg-warm-gray-50'
                      }`}
                  >
                    🏛️ GrantOS Funding Agencies ({openGrants.length})
                  </button>
                  <button
                    onClick={() => setGrantSource('scraped')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${grantSource === 'scraped'
                      ? 'bg-primary text-white border-primary shadow-soft'
                      : 'bg-white text-warm-gray-700 border-warm-gray-200 hover:bg-warm-gray-50'
                      }`}
                  >
                    🏢 Government & Other Sources{scrapedGrants.length > 0 ? ` (${scrapedGrants.length})` : ''}
                  </button>
                </div>

                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 mb-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-gray-400">🔍</span>
                      <input
                        type="text"
                        value={grantSearch}
                        onChange={(e) => setGrantSearch(e.target.value)}
                        placeholder="Search grants by name, agency, or category..."
                        className="w-full pl-11 pr-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                    {grantSource === 'agency' && (
                      <div className="flex gap-2">
                        <select
                          value={grantCategoryFilter}
                          onChange={(e) => setGrantCategoryFilter(e.target.value)}
                          className="px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        >
                          <option>All Categories</option>
                          {GRANT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select
                          value={grantFundingTypeFilter}
                          onChange={(e) => setGrantFundingTypeFilter(e.target.value)}
                          className="px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        >
                          <option>All Types</option>
                          {GRANT_FUNDING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {grantSource === 'agency' && (
                  <>
                    {grantsLoading && (
                      <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!grantsLoading && openGrants.length === 0 && (
                      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-12 text-center">
                        <span className="text-4xl block mb-3">📭</span>
                        <p className="text-warm-gray-500">No open grant calls available right now.</p>
                      </div>
                    )}
                    {!grantsLoading && openGrants.length > 0 && filteredGrants.length === 0 && (
                      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-12 text-center">
                        <p className="text-warm-gray-500">No grants match your search or filters.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {filteredGrants.map((grant) => {
                        const daysLeft = daysUntil(grant.deadline)
                        const isClosingSoon = daysLeft !== null && daysLeft <= 14 && daysLeft >= 0
                        const docUrl = grantDocumentUrl(grant.document)
                        return (
                          <div key={grant._id} className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 hover:shadow-medium transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className="text-[10px] font-mono font-bold text-primary bg-primary-50 px-2 py-0.5 rounded-full border border-primary/15">
                                  {grant.displayId}
                                </span>
                                <h3 className="font-heading text-base font-bold text-warm-gray-900 mt-1.5 mb-1">{grant.title}</h3>
                                <p className="text-xs text-warm-gray-500">{grant.fundingAgency?.agencyName || 'Funding Agency'}</p>
                              </div>
                              {isClosingSoon && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-600 border-red-200 flex-shrink-0">Closing Soon</span>
                              )}
                            </div>
                            {grant.description && <p className="text-xs text-warm-gray-600 leading-relaxed mb-3 line-clamp-2">{grant.description}</p>}
                            <div className="flex items-center gap-4 mb-3 flex-wrap">
                              <span className="text-sm font-bold text-warm-gray-900">{grant.budget || '—'}</span>
                              <span className="text-xs text-warm-gray-400">•</span>
                              <span className="text-xs text-warm-gray-500">
                                Deadline: {formatGrantDate(grant.deadline)}{daysLeft !== null && daysLeft >= 0 && ` (${daysLeft}d left)`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mb-4">
                              <span className="px-2.5 py-1 rounded-full bg-cream text-warm-gray-600 text-xs font-medium border border-warm-gray-200/60">{grant.category || 'Uncategorized'}</span>
                              <span className="text-[11px] text-warm-gray-400">{grant.fundingType}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-warm-gray-100">
                              <button onClick={() => setViewAgencyGrant(grant)} className="py-2 rounded-[10px] text-xs font-semibold text-warm-gray-700 bg-cream hover:bg-warm-gray-100 border border-warm-gray-200 transition-all cursor-pointer">🏛️ View Agency</button>
                              <button onClick={() => setViewGrantDetails(grant)} className="py-2 rounded-[10px] text-xs font-semibold text-warm-gray-700 bg-cream hover:bg-warm-gray-100 border border-warm-gray-200 transition-all cursor-pointer">📄 View Details</button>
                            </div>
                            {docUrl && (
                              <a href={docUrl} target="_blank" rel="noopener noreferrer" className="block text-center mt-2 text-[11px] font-semibold text-primary hover:underline">📎 Download Guidelines Document</a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {grantSource === 'scraped' && (
                  <>
                    {scrapedGrantsLoading && (
                      <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!scrapedGrantsLoading && scrapedGrants.length === 0 && (
                      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-12 text-center">
                        <span className="text-4xl block mb-3">📭</span>
                        <p className="text-warm-gray-500">No scraped grant listings available right now.</p>
                      </div>
                    )}
                    {!scrapedGrantsLoading && scrapedGrants.length > 0 && filteredScrapedGrants.length === 0 && (
                      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-12 text-center">
                        <p className="text-warm-gray-500">No grants match your search.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {filteredScrapedGrants.map((grant) => {
                        const fundingDisplay = formatScrapedFunding(grant.fundingAmount)
                        const deadlineDisplay = formatScrapedDeadline(grant.deadline)
                        const scrapedLinks = getScrapedLinks(grant.links)
                        return (
                          <div key={grant._id || grant.grantId} className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 hover:shadow-medium transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className="text-[10px] font-bold text-warm-gray-500 bg-warm-gray-100 px-2 py-0.5 rounded-full border border-warm-gray-200">
                                  {GRANT_TYPE_LABELS[grant.grantType] || grant.grantType || 'General'}
                                </span>
                                <h3 className="font-heading text-base font-bold text-warm-gray-900 mt-1.5 mb-1 line-clamp-2">{grant.title}</h3>
                                <p className="text-xs text-warm-gray-500">
                                  {grant.agency?.name || 'Government / External Source'}
                                  {grant.agency?.parentBody && grant.agency.parentBody !== grant.agency.name && <span className="text-warm-gray-400"> • {grant.agency.parentBody}</span>}
                                </p>
                              </div>
                              
                            </div>
                            {grant.description && <p className="text-xs text-warm-gray-600 leading-relaxed mb-3 line-clamp-3">{grant.description}</p>}
                            <div className="flex items-center gap-4 mb-3 flex-wrap text-xs">
                              {fundingDisplay && <span className="font-bold text-warm-gray-900 text-sm">{fundingDisplay}</span>}
                              <span className="text-warm-gray-500">Deadline: {deadlineDisplay}</span>
                            </div>
                            {grant.focusAreas?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {grant.focusAreas.slice(0, 3).map((f) => (
                                  <span key={f} className="px-2 py-0.5 rounded-full bg-cream text-warm-gray-600 text-[10px] font-medium border border-warm-gray-200/60">{f}</span>
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] text-warm-gray-400 mb-4">
                              Source: {grant.source?.website || 'External'}{grant.lastScrapedAt && ` • Last checked ${formatGrantDate(grant.lastScrapedAt)}`}
                            </p>
                            {scrapedLinks.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {scrapedLinks.map((l) => (
                                  <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] bg-primary-50 text-primary text-[11px] font-semibold border border-primary/15 hover:bg-primary-100 transition-colors">
                                    {l.icon} {l.label}
                                  </a>
                                ))}
                              </div>
                            )}
                            <button onClick={() => setViewScrapedGrant(grant)} className="w-full py-2 rounded-[10px] text-xs font-semibold text-warm-gray-700 bg-cream hover:bg-warm-gray-100 border border-warm-gray-200 transition-all cursor-pointer">📄 View Full Details</button>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* ─── My Organization Modal ─── */}
      {myOrgModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMyOrgModalOpen(false)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-lg p-6 sm:p-8 animate-fade-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold text-warm-gray-900">My Organization</h2>
              <button onClick={() => setMyOrgModalOpen(false)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer">✕</button>
            </div>
            {myOrgLoading && <p className="text-sm text-warm-gray-400 text-center py-8">Loading organization details…</p>}
            {!myOrgLoading && !myOrganization && <p className="text-sm text-warm-gray-400 text-center py-8">Organization details unavailable.</p>}
            {!myOrgLoading && myOrganization && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-heading text-lg font-bold text-warm-gray-900">{myOrganization.organizationName}</h3>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border bg-green-50 text-green-700 border-green-200 mt-1 capitalize">
                    {myOrganization.status || 'approved'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-warm-gray-400 uppercase tracking-wider font-bold text-[10px] mb-0.5">Type</span>
                    <span className="text-warm-gray-800 font-semibold capitalize">{(myOrganization.organizationType || '').replace(/_/g, ' ') || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-warm-gray-400 uppercase tracking-wider font-bold text-[10px] mb-0.5">Registration No.</span>
                    <span className="text-warm-gray-800 font-semibold">{myOrganization.registrationNumber || '—'}</span>
                  </div>
                  {myOrganization.establishedYear && (
                    <div>
                      <span className="block text-warm-gray-400 uppercase tracking-wider font-bold text-[10px] mb-0.5">Established</span>
                      <span className="text-warm-gray-800 font-semibold">{myOrganization.establishedYear}</span>
                    </div>
                  )}
                  {myOrganization.website && (
                    <div>
                      <span className="block text-warm-gray-400 uppercase tracking-wider font-bold text-[10px] mb-0.5">Website</span>
                      <a href={myOrganization.website} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">{myOrganization.website}</a>
                    </div>
                  )}
                </div>
                {myOrganization.address && (
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-400 mb-1">Address</span>
                    <p className="text-sm text-warm-gray-700">
                      {[myOrganization.address.street, myOrganization.address.city, myOrganization.address.state, myOrganization.address.pincode, myOrganization.address.country].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                )}
                {myOrganization.focusAreas?.length > 0 && (
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-400 mb-1.5">Focus Areas</span>
                    <div className="flex flex-wrap gap-1.5">
                      {myOrganization.focusAreas.map((a) => (
                        <span key={a} className="px-2 py-0.5 rounded-full bg-primary-50 text-primary text-[11px] font-medium">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end mt-6 pt-4 border-t border-warm-gray-200/60">
              <button onClick={() => setMyOrgModalOpen(false)} className="px-5 py-2.5 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer">Close</button>
            </div>
          </div>
        </div>
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
                      <span className="block text-warm-gray-400 uppercase tracking-wider font-bold text-[10px] mb-0.5">Agency Type</span>
                      <span className="text-warm-gray-800 font-semibold">{AGENCY_TYPE_LABELS[agency.agencyType] || agency.agencyType || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-warm-gray-400 uppercase tracking-wider font-bold text-[10px] mb-0.5">Established</span>
                      <span className="text-warm-gray-800 font-semibold">{agency.establishedYear || '—'}</span>
                    </div>
                  </div>
                  <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border bg-green-50 text-green-700 border-green-200 mb-4">✓ Verified Funding Agency</span>
                  {agency.description && (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-warm-gray-400 mb-1">About</p>
                      <p className="text-sm text-warm-gray-700 leading-relaxed">{agency.description}</p>
                    </div>
                  )}
                  {agency.website && (
                    <a href={agency.website} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">🌐 {agency.website}</a>
                  )}
                  <div className="flex justify-end mt-6 pt-4 border-t border-warm-gray-200/60">
                    <button onClick={() => setViewAgencyGrant(null)} className="px-5 py-2.5 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer">Close</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ─── View Grant Details Modal ─── */}
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
                      <span className="text-[10px] font-mono font-bold text-primary bg-primary-50 px-2 py-0.5 rounded-full border border-primary/15">{g.displayId}</span>
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
                        <FactBox label="Duration" value={g.projectDurationMonths?.min || g.projectDurationMonths?.max ? `${g.projectDurationMonths.min || '?'}–${g.projectDurationMonths.max || '?'} months` : null} />
                      </div>
                    </GrantSection>
                    {g.researchAreas?.length > 0 && (
                      <GrantSection icon="🔬" title="Research Areas">
                        <div className="flex flex-wrap gap-1.5">
                          {g.researchAreas.map((r) => <span key={r} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber text-[11px] font-semibold border border-amber/15">{r}</span>)}
                        </div>
                      </GrantSection>
                    )}
                    <GrantSection icon="✅" title="Eligibility">
                      <div className="space-y-2 text-sm text-warm-gray-700">
                        <p><strong className="text-warm-gray-900">Applicant Types:</strong> {g.eligibility?.applicantTypes?.length > 0 ? g.eligibility.applicantTypes.map((t) => APPLICANT_TYPE_LABELS[t] || t).join(', ') : 'Not restricted'}</p>
                        <p><strong className="text-warm-gray-900">Geographic Scope:</strong> {g.eligibility?.geographicScope || 'Not restricted'}{g.eligibility?.eligibleStates?.length > 0 ? ` (${g.eligibility.eligibleStates.join(', ')})` : ''}</p>
                        {g.eligibilityRulesText && <p className="whitespace-pre-line p-3 rounded-[10px] bg-cream border border-warm-gray-200 text-xs leading-relaxed">{g.eligibilityRulesText}</p>}
                      </div>
                    </GrantSection>
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
                    {docUrl && (
                      <a href={docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-primary-50 text-primary text-xs font-bold border border-primary/15 hover:bg-primary-100 transition-all">
                        📄 View {g.document.documentType || 'Grant Document'} PDF →
                      </a>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-warm-gray-200/60">
                    <button onClick={() => setViewGrantDetails(null)} className="px-4 py-2 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer">Close</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ─── View Scraped Grant Details Modal ─── */}
      {viewScrapedGrant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setViewScrapedGrant(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-2xl p-6 sm:p-8 animate-fade-up max-h-[85vh] overflow-y-auto">
            {(() => {
              const g = viewScrapedGrant
              const fundingDisplay = formatScrapedFunding(g.fundingAmount)
              const deadlineDisplay = formatScrapedDeadline(g.deadline)
              const durationDisplay = formatScrapedDuration(g.duration)
              const scrapedLinks = getScrapedLinks(g.links)
              return (
                <>
                  <div className="flex items-start justify-between mb-1 pb-4 border-b border-warm-gray-200/60">
                    <div>
                      <span className="text-[10px] font-bold text-warm-gray-500 bg-warm-gray-100 px-2 py-0.5 rounded-full border border-warm-gray-200">{GRANT_TYPE_LABELS[g.grantType] || g.grantType || 'General'}</span>
                      <h2 className="font-heading text-xl font-bold text-warm-gray-900 mt-2">{g.title}</h2>
                      <p className="text-xs text-warm-gray-500 mt-1">{g.agency?.name || 'Government / External Source'}{g.agency?.parentBody && g.agency.parentBody !== g.agency.name && ` • ${g.agency.parentBody}`}</p>
                    </div>
                    <button onClick={() => setViewScrapedGrant(null)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer flex-shrink-0">✕</button>
                  </div>
                  {g.needsReview && (
                    <div className="mt-4 p-3 rounded-[10px] bg-amber-50 border border-amber/15">
                      <p className="text-xs text-amber-800">⚠️ This listing was auto-extracted and may be incomplete. Visit the official source below to confirm details.</p>
                    </div>
                  )}
                  <div className="space-y-5 mt-5">
                    {g.description && (
                      <GrantSection icon="📋" title="Description">
                        <p className="text-sm text-warm-gray-700 leading-relaxed whitespace-pre-line">{g.description}</p>
                      </GrantSection>
                    )}
                    <GrantSection icon="💰" title="Key Facts">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <FactBox label="Funding" value={fundingDisplay} fallback="Not specified" />
                        <FactBox label="Deadline" value={deadlineDisplay !== 'Not specified' ? deadlineDisplay : null} fallback="Not specified" />
                        <FactBox label="Duration" value={durationDisplay !== 'Not specified' ? durationDisplay : null} fallback="Not specified" />
                      </div>
                    </GrantSection>
                    {g.eligibilityText && (
                      <GrantSection icon="✅" title="Eligibility">
                        <p className="text-sm text-warm-gray-700 whitespace-pre-line leading-relaxed">{g.eligibilityText}</p>
                      </GrantSection>
                    )}
                    {scrapedLinks.length > 0 && (
                      <GrantSection icon="🔗" title="Links">
                        <div className="flex flex-wrap gap-2">
                          {scrapedLinks.map((l) => (
                            <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-primary-50 text-primary text-xs font-bold border border-primary/15 hover:bg-primary-100 transition-all">
                              {l.icon} {l.label}
                            </a>
                          ))}
                        </div>
                      </GrantSection>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-warm-gray-200/60">
                    <button onClick={() => setViewScrapedGrant(null)} className="px-4 py-2 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer">Close</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

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
      <span className="text-warm-gray-400 block text-[10px] uppercase tracking-wide">{label}</span>
      <strong className="text-warm-gray-900">{value || fallback}</strong>
    </div>
  )
}