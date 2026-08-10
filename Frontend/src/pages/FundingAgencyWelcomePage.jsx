import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const SAMPLE_PROGRAMS = [
  {
    id: 'GP-2026-01',
    title: 'National Deep Tech & AI Innovation Grant',
    category: 'Technology & Computing',
    budget: '₹5,00,00,000',
    deadline: '2026-10-15',
    applicationsCount: 24,
    status: 'Active',
    fundingType: 'Research & Commercialization',
  },
  {
    id: 'GP-2026-02',
    title: 'Clean Energy & Carbon Neutrality Research Fellowship',
    category: 'Environmental Sciences',
    budget: '₹2,50,00,000',
    deadline: '2026-11-01',
    applicationsCount: 16,
    status: 'Active',
    fundingType: 'Institutional Fellowship',
  },
  {
    id: 'GP-2026-03',
    title: 'Translational Healthcare & Biotechnology Initiative',
    category: 'Medical Science',
    budget: '₹4,00,00,000',
    deadline: '2026-09-30',
    applicationsCount: 31,
    status: 'Reviewing',
    fundingType: 'Project Grant',
  },
  {
    id: 'GP-2026-04',
    title: 'Smart Agriculture & Rural Tech Seed Fund',
    category: 'Agriculture',
    budget: '₹1,00,00,000',
    deadline: '2026-12-15',
    applicationsCount: 8,
    status: 'Active',
    fundingType: 'Pre-Seed Grant',
  },
]

const SAMPLE_PROPOSALS = [
  {
    id: 'PROP-801',
    program: 'National Deep Tech & AI Innovation Grant',
    institution: 'Indian Institute of Technology, Bombay',
    pi: 'Dr. Ramesh Sundaram',
    title: 'Quantum-Resilient Cryptographic Protocols for Cloud Systems',
    requestedAmount: '₹85,00,000',
    submittedDate: '2026-08-04',
    aiScore: 96,
    status: 'Under Review',
  },
  {
    id: 'PROP-802',
    program: 'Clean Energy & Carbon Neutrality Research Fellowship',
    institution: 'National Institute of Technology, Karnataka',
    pi: 'Prof. Ananya Sen',
    title: 'Next-Gen Solid State Electrolytes for High-Capacity Energy Storage',
    requestedAmount: '₹45,00,000',
    submittedDate: '2026-08-02',
    aiScore: 91,
    status: 'Shortlisted',
  },
  {
    id: 'PROP-803',
    program: 'Translational Healthcare & Biotechnology Initiative',
    institution: 'All India Institute of Medical Sciences (AIIMS)',
    pi: 'Dr. Vivek Mehra',
    title: 'Low-Cost Point-of-Care Microfluidic Biosensor for Early Oncology Screening',
    requestedAmount: '₹1,20,00,000',
    submittedDate: '2026-07-28',
    aiScore: 94,
    status: 'Shortlisted',
  },
]

export default function FundingAgencyWelcomePage() {
  const navigate = useNavigate()
  const [agencyName, setAgencyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGrantTitle, setNewGrantTitle] = useState('')
  const [newGrantBudget, setNewGrantBudget] = useState('')
  const [newGrantDomain, setNewGrantDomain] = useState('Science & Technology')
  const [programsList, setProgramsList] = useState(SAMPLE_PROGRAMS)
  const [notificationMsg, setNotificationMsg] = useState('')

  useEffect(() => {
    // 1. Check local storage
    const savedUser = localStorage.getItem('grantos_user')
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        if (parsed.fullName) setAgencyName(parsed.fullName)
        if (parsed.email) setContactEmail(parsed.email)
      } catch {
        // ignore parse error
      }
    }

    // 2. Fetch fresh status from backend
    const fetchAgencyData = async () => {
      try {
        const res = await api.get('/agency/status')
        if (res.data.success && res.data.agency) {
          setAgencyName(res.data.agency.agencyName || '')
        }
      } catch {
        // Fallback to /auth/me
        try {
          const meRes = await api.get('/auth/me')
          if (meRes.data.success && meRes.data.user) {
            setAgencyName(meRes.data.user.fullName || '')
            setContactEmail(meRes.data.user.email || '')
          }
        } catch {
          // offline or unauthenticated fallback
        }
      }
    }

    fetchAgencyData()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('grantos_token')
    localStorage.removeItem('grantos_user')
    navigate('/login')
  }

  const handleCreateGrant = (e) => {
    e.preventDefault()
    if (!newGrantTitle.trim()) return

    const newProg = {
      id: `GP-2026-0${programsList.length + 1}`,
      title: newGrantTitle,
      category: newGrantDomain,
      budget: newGrantBudget || '₹2,00,00,000',
      deadline: '2026-11-30',
      applicationsCount: 0,
      status: 'Active',
      fundingType: 'Project Grant',
    }

    setProgramsList([newProg, ...programsList])
    setShowCreateModal(false)
    setNewGrantTitle('')
    setNewGrantBudget('')
    setNotificationMsg('New Grant Program published successfully!')
    setTimeout(() => setNotificationMsg(''), 4000)
  }

  const displayName = agencyName || 'Funding Agency Partner'

  return (
    <div className="min-h-screen bg-cream flex flex-col font-body">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-warm-gray-200/70 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group" id="agency-nav-logo">
              <div className="w-10 h-10 bg-amber rounded-[12px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105 shadow-soft">
                <LeafIcon />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-xl font-bold text-warm-gray-900 tracking-tight leading-none">
                  Grant<span className="text-amber">OS</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-amber uppercase mt-0.5">
                  Funding Agency Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber/15">
              <div className="w-2 h-2 rounded-full bg-amber animate-pulse-soft" />
              <span className="text-xs font-semibold text-amber">
                Agency Partner Active
              </span>
            </div>

            <div className="h-6 w-px bg-warm-gray-200 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-amber text-white font-heading font-semibold text-sm flex items-center justify-center shadow-soft">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-warm-gray-900 leading-tight truncate max-w-[160px]">
                  {displayName}
                </p>
                <p className="text-[11px] text-warm-gray-500 truncate max-w-[160px]">
                  {contactEmail || 'agency@partner.gov.in'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-warm-gray-500 hover:text-warm-gray-800 px-3 py-2 rounded-[8px] hover:bg-warm-gray-100 transition-colors cursor-pointer"
              id="agency-logout-btn"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification Toast */}
        {notificationMsg && (
          <div className="mb-6 p-4 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-fade-in shadow-soft">
            <CheckCircleIcon />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* Hero Welcome Banner */}
        <section className="bg-surface-elevated rounded-[20px] border border-warm-gray-200/70 p-6 sm:p-8 md:p-10 shadow-soft mb-8 relative overflow-hidden">
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
                Empower groundbreaking research and innovation. Broadcast your grant mandates, review matched proposals with AI scoring, and track milestone disbursements seamlessly.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-3 flex-shrink-0">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[12px] bg-amber hover:bg-amber-light text-white font-semibold shadow-soft hover:shadow-medium transition-all duration-200 hover:-translate-y-0.5 cursor-pointer text-sm"
                id="hero-create-grant-btn"
              >
                <PlusIcon /> Publish Grant Call
              </button>
              <Link
                to="/agency/register"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[12px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 font-semibold transition-all duration-200 text-sm text-center"
              >
                ⚙️ Agency Profile
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-5 shadow-soft hover:border-amber/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">Active Programs</span>
              <span className="p-2 rounded-[10px] bg-amber-50 text-amber text-lg">📢</span>
            </div>
            <div className="text-3xl font-heading font-bold text-warm-gray-900 mb-1">{programsList.length}</div>
            <p className="text-xs text-warm-gray-500 font-medium flex items-center gap-1 text-emerald-600">
              <span>●</span> Open for Institutional Submissions
            </p>
          </div>

          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-5 shadow-soft hover:border-amber/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">Total Fund Pool</span>
              <span className="p-2 rounded-[10px] bg-emerald-50 text-emerald-700 text-lg">💰</span>
            </div>
            <div className="text-3xl font-heading font-bold text-warm-gray-900 mb-1">₹12.50 Cr</div>
            <p className="text-xs text-warm-gray-500 font-medium">Committed across 4 domain calls</p>
          </div>

          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-5 shadow-soft hover:border-amber/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">Proposals Received</span>
              <span className="p-2 rounded-[10px] bg-blue-50 text-blue-700 text-lg">📄</span>
            </div>
            <div className="text-3xl font-heading font-bold text-warm-gray-900 mb-1">79</div>
            <p className="text-xs text-blue-600 font-medium">12 new submissions this week</p>
          </div>

          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-5 shadow-soft hover:border-amber/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">AI Match Accuracy</span>
              <span className="p-2 rounded-[10px] bg-purple-50 text-purple-700 text-lg">🧠</span>
            </div>
            <div className="text-3xl font-heading font-bold text-warm-gray-900 mb-1">94.8%</div>
            <p className="text-xs text-warm-gray-500 font-medium">Mandate alignment benchmark</p>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-warm-gray-200/80 mb-6 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-amber text-white shadow-soft'
                : 'text-warm-gray-600 hover:text-warm-gray-900 hover:bg-warm-gray-100'
            }`}
          >
            📊 Agency Overview & Features
          </button>
          <button
            onClick={() => setActiveTab('grants')}
            className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'grants'
                ? 'bg-amber text-white shadow-soft'
                : 'text-warm-gray-600 hover:text-warm-gray-900 hover:bg-warm-gray-100'
            }`}
          >
            📢 Grant Calls ({programsList.length})
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'proposals'
                ? 'bg-amber text-white shadow-soft'
                : 'text-warm-gray-600 hover:text-warm-gray-900 hover:bg-warm-gray-100'
            }`}
          >
            📋 Submitted Proposals ({SAMPLE_PROPOSALS.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-amber text-white shadow-soft'
                : 'text-warm-gray-600 hover:text-warm-gray-900 hover:bg-warm-gray-100'
            }`}
          >
            🏛️ Agency Credentials
          </button>
        </div>

        {/* Tab Content: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Core Capabilities Showcase */}
            <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 sm:p-8 shadow-soft">
              <h2 className="font-heading text-2xl font-bold text-warm-gray-900 mb-2">
                Funding Agency Capabilities on GrantOS
              </h2>
              <p className="text-warm-gray-500 text-sm mb-6">
                GrantOS connects your agency with top academic institutions, researchers, and innovation labs across India.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-5 rounded-[12px] bg-cream border border-warm-gray-200/60 hover:shadow-soft transition-all">
                  <div className="w-10 h-10 rounded-[10px] bg-amber-50 text-amber flex items-center justify-center text-xl mb-3">
                    📢
                  </div>
                  <h3 className="font-heading font-semibold text-warm-gray-900 mb-1">Grant Call Builder</h3>
                  <p className="text-xs text-warm-gray-600 leading-relaxed">
                    Publish customized requests for proposals (RFPs) with specific eligibility rubrics, submission deadlines, and fund allocation stages.
                  </p>
                </div>

                <div className="p-5 rounded-[12px] bg-cream border border-warm-gray-200/60 hover:shadow-soft transition-all">
                  <div className="w-10 h-10 rounded-[10px] bg-primary-50 text-primary flex items-center justify-center text-xl mb-3">
                    🧠
                  </div>
                  <h3 className="font-heading font-semibold text-warm-gray-900 mb-1">AI Proposal Matcher</h3>
                  <p className="text-xs text-warm-gray-600 leading-relaxed">
                    Automatically filter incoming proposals by relevance, track record of principal investigators, and feasibility scores.
                  </p>
                </div>

                <div className="p-5 rounded-[12px] bg-cream border border-warm-gray-200/60 hover:shadow-soft transition-all">
                  <div className="w-10 h-10 rounded-[10px] bg-blue-50 text-blue-700 flex items-center justify-center text-xl mb-3">
                    👥
                  </div>
                  <h3 className="font-heading font-semibold text-warm-gray-900 mb-1">Peer Review Workflow</h3>
                  <p className="text-xs text-warm-gray-600 leading-relaxed">
                    Assign blind or double-blind reviewers from our vetted academic pool and synthesize evaluation scoring sheets.
                  </p>
                </div>

                <div className="p-5 rounded-[12px] bg-cream border border-warm-gray-200/60 hover:shadow-soft transition-all">
                  <div className="w-10 h-10 rounded-[10px] bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl mb-3">
                    ⚡
                  </div>
                  <h3 className="font-heading font-semibold text-warm-gray-900 mb-1">UC & Milestone Audit</h3>
                  <p className="text-xs text-warm-gray-600 leading-relaxed">
                    Review Utilization Certificates (UCs), project deliverables, and sanction tranches with auditable verification trails.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Cards & Live Feeds */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Active Programs Preview */}
              <div className="lg:col-span-2 bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-warm-gray-900">Current Grant Programs</h3>
                    <p className="text-xs text-warm-gray-500">Live opportunities receiving applicant proposals</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('grants')}
                    className="text-xs font-semibold text-amber hover:underline cursor-pointer"
                  >
                    View all →
                  </button>
                </div>

                <div className="space-y-3.5">
                  {programsList.slice(0, 3).map((prog) => (
                    <div
                      key={prog.id}
                      className="p-4 rounded-[12px] bg-cream border border-warm-gray-200/70 hover:border-amber/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-semibold text-amber bg-amber-50 px-2 py-0.5 rounded">
                            {prog.id}
                          </span>
                          <span className="text-xs text-warm-gray-400">• {prog.category}</span>
                        </div>
                        <h4 className="font-semibold text-warm-gray-900 text-sm mb-1">{prog.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-warm-gray-500">
                          <span>💰 Budget: <strong>{prog.budget}</strong></span>
                          <span>⏳ Deadline: {prog.deadline}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                          {prog.applicationsCount} Submissions
                        </span>
                        <button
                          onClick={() => setActiveTab('proposals')}
                          className="text-xs font-semibold text-amber hover:bg-amber-50 px-3 py-1.5 rounded-[8px] border border-amber/20 transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 1 Col: Quick Links & Checklist */}
              <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft flex flex-col justify-between">
                <div>
                  <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-2">Agency Action Checklist</h3>
                  <p className="text-xs text-warm-gray-500 mb-4">Complete setup for full network reach</p>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 p-3 rounded-[10px] bg-emerald-50/60 border border-emerald-200/50">
                      <span className="text-emerald-600 mt-0.5">✓</span>
                      <div>
                        <p className="text-xs font-semibold text-warm-gray-900">Agency Account Activated</p>
                        <p className="text-[11px] text-warm-gray-500">Official email verified for GrantOS network</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-[10px] bg-cream border border-warm-gray-200/60">
                      <span className="text-amber mt-0.5">●</span>
                      <div>
                        <p className="text-xs font-semibold text-warm-gray-900">Publish Initial RFP</p>
                        <p className="text-[11px] text-warm-gray-500">Specify grant scope, domain, and corpus</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-[10px] bg-cream border border-warm-gray-200/60">
                      <span className="text-warm-gray-400 mt-0.5">○</span>
                      <div>
                        <p className="text-xs font-semibold text-warm-gray-900">Legal Verification (CIN/Darpan)</p>
                        <p className="text-[11px] text-warm-gray-500">Enhanced trust badge for applicant institutes</p>
                      </div>
                    </div>
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
          </div>
        )}

        {/* Tab Content: GRANT CALLS */}
        {activeTab === 'grants' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
              <div>
                <h2 className="font-heading text-2xl font-bold text-warm-gray-900">Grant Programs & Calls</h2>
                <p className="text-xs text-warm-gray-500 mt-1">Manage open, upcoming, and closed funding opportunities.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-sm font-semibold transition-all shadow-soft cursor-pointer"
              >
                <PlusIcon /> New Grant Opportunity
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {programsList.map((prog) => (
                <div
                  key={prog.id}
                  className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft hover:shadow-medium transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-amber bg-amber-50 px-2.5 py-1 rounded-full border border-amber/15">
                      {prog.id}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      prog.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber border border-amber/20'
                    }`}>
                      {prog.status}
                    </span>
                  </div>

                  <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-2">{prog.title}</h3>
                  <p className="text-xs text-warm-gray-500 mb-4">{prog.category} • {prog.fundingType}</p>

                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-[12px] bg-cream border border-warm-gray-200 mb-5 text-xs">
                    <div>
                      <span className="text-warm-gray-400 block text-[11px]">Total Funding</span>
                      <strong className="text-warm-gray-900 font-semibold text-sm">{prog.budget}</strong>
                    </div>
                    <div>
                      <span className="text-warm-gray-400 block text-[11px]">Submissions</span>
                      <strong className="text-warm-gray-900 font-semibold text-sm">{prog.applicationsCount} Proposals</strong>
                    </div>
                    <div>
                      <span className="text-warm-gray-400 block text-[11px]">Submission Deadline</span>
                      <span className="text-warm-gray-700 font-medium">{prog.deadline}</span>
                    </div>
                    <div>
                      <span className="text-warm-gray-400 block text-[11px]">Match Filter</span>
                      <span className="text-emerald-700 font-medium">AI Active</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => setActiveTab('proposals')}
                      className="flex-1 py-2 text-xs font-semibold rounded-[8px] bg-amber text-white hover:bg-amber-light transition-colors text-center cursor-pointer"
                    >
                      Review Proposals ({prog.applicationsCount})
                    </button>
                    <button
                      onClick={() => {
                        setNotificationMsg(`Edited grant call ${prog.id}`)
                        setTimeout(() => setNotificationMsg(''), 3000)
                      }}
                      className="px-3 py-2 text-xs font-semibold rounded-[8px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 transition-colors cursor-pointer"
                    >
                      Edit Call
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: PROPOSALS */}
        {activeTab === 'proposals' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
              <h2 className="font-heading text-2xl font-bold text-warm-gray-900">Submitted Research Proposals</h2>
              <p className="text-xs text-warm-gray-500 mt-1">Review applications ranked by GrantOS AI Mandate Matching.</p>
            </div>

            <div className="space-y-4">
              {SAMPLE_PROPOSALS.map((prop) => (
                <div
                  key={prop.id}
                  className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft hover:border-amber/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-warm-gray-700 bg-warm-gray-100 px-2 py-0.5 rounded">
                        {prop.id}
                      </span>
                      <span className="text-xs text-amber font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber/15">
                        {prop.program}
                      </span>
                    </div>

                    <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-1.5">{prop.title}</h3>
                    
                    <div className="text-xs text-warm-gray-600 flex flex-wrap items-center gap-y-1 gap-x-4 mb-3">
                      <span>🏛️ <strong>{prop.institution}</strong></span>
                      <span>👤 PI: {prop.pi}</span>
                      <span>📅 Submitted: {prop.submittedDate}</span>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                      <span>🧠 AI Match Score: {prop.aiScore}%</span>
                      <span className="text-[10px] text-emerald-600">• High mandate relevance</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 flex-shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-warm-gray-100">
                    <div className="text-left lg:text-right">
                      <span className="text-[11px] text-warm-gray-400 block">Requested Amount</span>
                      <span className="text-base font-bold text-warm-gray-900">{prop.requestedAmount}</span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setNotificationMsg(`Proposal ${prop.id} approved for next review stage!`)
                          setTimeout(() => setNotificationMsg(''), 4000)
                        }}
                        className="px-4 py-2 rounded-[8px] bg-amber text-white text-xs font-semibold hover:bg-amber-light transition-colors cursor-pointer"
                      >
                        Accept / Advance
                      </button>
                      <button
                        onClick={() => {
                          setNotificationMsg(`Detailed dossier for ${prop.id} downloaded.`)
                          setTimeout(() => setNotificationMsg(''), 3000)
                        }}
                        className="px-3 py-2 rounded-[8px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        View Dossier
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 sm:p-8 shadow-soft">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-warm-gray-200">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-warm-gray-900">Agency Identification & Profile</h2>
                  <p className="text-xs text-warm-gray-500 mt-1">Official agency metadata and legal credentials.</p>
                </div>
                <Link
                  to="/agency/register"
                  className="px-4 py-2 rounded-[8px] bg-amber text-white text-xs font-semibold hover:bg-amber-light transition-colors"
                >
                  Edit Registration Details
                </Link>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-b border-warm-gray-100">
                  <span className="text-warm-gray-500 font-medium">Agency Name</span>
                  <span className="sm:col-span-2 font-bold text-warm-gray-900">{displayName}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-b border-warm-gray-100">
                  <span className="text-warm-gray-500 font-medium">Registered Official Email</span>
                  <span className="sm:col-span-2 text-warm-gray-800">{contactEmail || 'contact@agency.gov.in'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-b border-warm-gray-100">
                  <span className="text-warm-gray-500 font-medium">Account Role</span>
                  <span className="sm:col-span-2">
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber text-xs font-semibold border border-amber/20">
                      funding_agency
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-b border-warm-gray-100">
                  <span className="text-warm-gray-500 font-medium">Network Access Status</span>
                  <span className="sm:col-span-2 text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircleIcon /> Active Funding Partner
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2">
                  <span className="text-warm-gray-500 font-medium">GrantOS Portal Link</span>
                  <span className="sm:col-span-2 text-xs font-mono text-warm-gray-600 bg-cream p-2 rounded border border-warm-gray-200 select-all">
                    https://grantos.gov.in/agency/{encodeURIComponent(displayName.toLowerCase().replace(/\s+/g, '-'))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Publish New Grant Call */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-gray-900/40 backdrop-blur-xs">
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/80 shadow-medium w-full max-w-lg p-6 sm:p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-xl font-bold text-warm-gray-900">
                Publish New Grant Opportunity
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-warm-gray-400 hover:text-warm-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGrant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                  Grant Program Title
                </label>
                <input
                  type="text"
                  value={newGrantTitle}
                  onChange={(e) => setNewGrantTitle(e.target.value)}
                  placeholder="e.g. AI for Climate Resilience Initiative 2026"
                  required
                  className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                    Funding Domain
                  </label>
                  <select
                    value={newGrantDomain}
                    onChange={(e) => setNewGrantDomain(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                  >
                    <option value="Science & Technology">Science & Technology</option>
                    <option value="Healthcare & Medicine">Healthcare & Medicine</option>
                    <option value="Environmental Sciences">Environmental Sciences</option>
                    <option value="Social Sciences">Social Sciences</option>
                    <option value="Agriculture & Rural">Agriculture & Rural</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                    Total Corpus Amount
                  </label>
                  <input
                    type="text"
                    value={newGrantBudget}
                    onChange={(e) => setNewGrantBudget(e.target.value)}
                    placeholder="e.g. ₹3,50,00,000"
                    className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                  />
                </div>
              </div>

              <div className="p-3 rounded-[10px] bg-amber-50 border border-amber/15 text-xs text-amber leading-relaxed">
                📢 Once published, registered universities and principal investigators will receive instant match notifications based on their research focus.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-[10px] text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-xs font-semibold shadow-soft transition-all cursor-pointer"
                >
                  Publish Grant Call
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-warm-gray-200/60 py-6 px-6 text-center text-xs text-warm-gray-400">
        <p>GrantOS Funding Agency Network • Secure Institutional Grants Infrastructure</p>
      </footer>
    </div>
  )
}
