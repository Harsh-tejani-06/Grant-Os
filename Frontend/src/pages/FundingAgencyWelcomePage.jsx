import { useState, useEffect, useCallback } from 'react'
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

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const GRANT_TYPE_OPTIONS = [
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

const APPLICANT_TYPE_OPTIONS = [
  { value: 'individual_researcher', label: 'Individual Researcher' },
  { value: 'student', label: 'Student' },
  { value: 'institution', label: 'Institution' },
  { value: 'startup', label: 'Startup' },
  { value: 'ngo', label: 'NGO' },
  { value: 'industry', label: 'Industry' },
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

// ─── Empty form state ───
const EMPTY_FORM = {
  title: '',
  description: '',
  grantType: 'research_grant',
  categoryRaw: '',
  eligibilityText: '',
  applicationProcedure: '',
  deadline: '',
  fundingAmountRawText: '',
  fundingAmountMin: '',
  fundingAmountMax: '',
  durationRawText: '',
  durationMonths: '',
  focusAreas: '',
  eligibleApplicantTypes: [],
  infoUrl: '',
  applicationUrl: '',
  guidelinesUrl: '',
}

export default function FundingAgencyWelcomePage() {
  const navigate = useNavigate()
  const [agencyName, setAgencyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [programsList, setProgramsList] = useState([])
  const [loadingGrants, setLoadingGrants] = useState(true)
  const [notificationMsg, setNotificationMsg] = useState('')
  const [notificationType, setNotificationType] = useState('success') // 'success' | 'error'
  const [hasAgencyProfile, setHasAgencyProfile] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState([])

  // ─── Form state ───
  const [form, setForm] = useState({ ...EMPTY_FORM })
  // ─── Modal step (1 = basic info, 2 = details & eligibility, 3 = links & review) ───
  const [modalStep, setModalStep] = useState(1)

  const showNotification = (msg, type = 'success') => {
    setNotificationMsg(msg)
    setNotificationType(type)
    setTimeout(() => setNotificationMsg(''), 5000)
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleApplicantType = (value) => {
    setForm((prev) => {
      const types = prev.eligibleApplicantTypes.includes(value)
        ? prev.eligibleApplicantTypes.filter((t) => t !== value)
        : [...prev.eligibleApplicantTypes, value]
      return { ...prev, eligibleApplicantTypes: types }
    })
  }

  // ─── Fetch grants from backend ───
  const fetchGrants = useCallback(async () => {
    try {
      setLoadingGrants(true)
      const res = await api.get('/agency/grants')
      if (res.data.success) {
        setProgramsList(res.data.grants || [])
      }
    } catch {
      // silently fall back to empty
      setProgramsList([])
    } finally {
      setLoadingGrants(false)
    }
  }, [])

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
          if (res.data.agency.status === 'pending') {
            navigate('/agency/pending')
          } else if (res.data.agency.status === 'rejected') {
            navigate('/agency/rejected')
          }
        }
      } catch (err) {
        if (err.response?.status === 404 && err.response?.data?.hasAgency === false) {
          setHasAgencyProfile(false)
        }
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
    fetchGrants()
  }, [navigate, fetchGrants])

  const handleLogout = () => {
    localStorage.removeItem('grantos_token')
    localStorage.removeItem('grantos_user')
    navigate('/login')
  }

  // ─── Publish grant call to backend ───
  const handlePublishGrant = async (e) => {
    e.preventDefault()
    setFormErrors([])
    setSubmitting(true)

    try {
      const payload = {
        title: form.title,
        description: form.description,
        grantType: form.grantType,
        categoryRaw: form.categoryRaw,
        eligibilityText: form.eligibilityText,
        applicationProcedure: form.applicationProcedure,
        deadline: form.deadline,
        fundingAmount: {
          rawText: form.fundingAmountRawText,
          minINR: form.fundingAmountMin ? Number(form.fundingAmountMin) : null,
          maxINR: form.fundingAmountMax ? Number(form.fundingAmountMax) : null,
        },
        duration: {
          rawText: form.durationRawText,
          months: form.durationMonths ? Number(form.durationMonths) : null,
        },
        focusAreas: form.focusAreas,
        eligibleApplicantTypes: form.eligibleApplicantTypes,
        infoUrl: form.infoUrl,
        applicationUrl: form.applicationUrl,
        guidelinesUrl: form.guidelinesUrl,
      }

      const res = await api.post('/agency/grants', payload)

      if (res.data.success) {
        setShowCreateModal(false)
        setForm({ ...EMPTY_FORM })
        setModalStep(1)
        showNotification(res.data.message || 'Grant call published successfully!')
        fetchGrants()
      }
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) {
        // express-validator array or mongoose validation array
        const msgs = Array.isArray(data.errors)
          ? data.errors.map((e) => (typeof e === 'string' ? e : e.msg || e.message || JSON.stringify(e)))
          : [data.message || 'Validation failed']
        setFormErrors(msgs)
      } else {
        setFormErrors([data?.message || 'Failed to publish grant call. Please try again.'])
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openCreateModal = () => {
    setForm({ ...EMPTY_FORM })
    setFormErrors([])
    setModalStep(1)
    setShowCreateModal(true)
  }

  const displayName = agencyName || 'Funding Agency Partner'

  // ─── Helper to format grant data for display ───
  const formatDeadline = (grant) => {
    if (grant.deadline?.parsedDate) {
      return new Date(grant.deadline.parsedDate).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    }
    return grant.deadline?.rawText || 'Not set'
  }

  const formatFunding = (grant) => {
    if (grant.fundingAmount?.rawText) return grant.fundingAmount.rawText
    if (grant.fundingAmount?.maxINR) return `Up to ₹${(grant.fundingAmount.maxINR / 100000).toFixed(1)} Lakh`
    if (grant.fundingAmount?.minINR) return `From ₹${(grant.fundingAmount.minINR / 100000).toFixed(1)} Lakh`
    return 'Not specified'
  }

  const getGrantTypeLabel = (type) => {
    const opt = GRANT_TYPE_OPTIONS.find((o) => o.value === type)
    return opt ? opt.label : type
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      case 'closed':
        return 'bg-warm-gray-100 text-warm-gray-600 border border-warm-gray-200'
      case 'suspended':
        return 'bg-amber-50 text-amber border border-amber/20'
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-200'
    }
  }

  // ─── Stats ───
  const activeGrants = programsList.filter((g) => g.status === 'active').length
  const totalGrants = programsList.length

  // ─── Minimum date for deadline input (tomorrow) ───
  const tomorrowISO = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

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
          <div className={`mb-6 p-4 rounded-[12px] text-sm font-semibold flex items-center gap-2 animate-fade-in shadow-soft ${
            notificationType === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}>
            {notificationType === 'error' ? <span>⚠️</span> : <CheckCircleIcon />}
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
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[12px] bg-amber hover:bg-amber-light text-white font-semibold shadow-soft hover:shadow-medium transition-all duration-200 hover:-translate-y-0.5 cursor-pointer text-sm"
                id="hero-create-grant-btn"
              >
                <PlusIcon /> Publish Grant Call
              </button>
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
            <div className="text-3xl font-heading font-bold text-warm-gray-900 mb-1">{activeGrants}</div>
            <p className="text-xs text-warm-gray-500 font-medium flex items-center gap-1 text-emerald-600">
              <span>●</span> Open for Institutional Submissions
            </p>
          </div>

          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-5 shadow-soft hover:border-amber/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">Total Published</span>
              <span className="p-2 rounded-[10px] bg-emerald-50 text-emerald-700 text-lg">📋</span>
            </div>
            <div className="text-3xl font-heading font-bold text-warm-gray-900 mb-1">{totalGrants}</div>
            <p className="text-xs text-warm-gray-500 font-medium">All grant calls published by your agency</p>
          </div>

          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-5 shadow-soft hover:border-amber/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">Proposals Received</span>
              <span className="p-2 rounded-[10px] bg-blue-50 text-blue-700 text-lg">📄</span>
            </div>
            <div className="text-3xl font-heading font-bold text-warm-gray-900 mb-1">{SAMPLE_PROPOSALS.length}</div>
            <p className="text-xs text-blue-600 font-medium">Submissions awaiting review</p>
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

                {loadingGrants ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-3 border-amber/30 border-t-amber rounded-full animate-spin" />
                  </div>
                ) : programsList.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📢</div>
                    <p className="text-warm-gray-500 text-sm font-medium mb-4">No grant calls published yet</p>
                    <button
                      onClick={openCreateModal}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-amber text-white text-sm font-semibold hover:bg-amber-light transition-colors cursor-pointer"
                    >
                      <PlusIcon /> Publish Your First Grant Call
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {programsList.slice(0, 3).map((grant) => (
                      <div
                        key={grant._id || grant.grantId}
                        className="p-4 rounded-[12px] bg-cream border border-warm-gray-200/70 hover:border-amber/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusBadge(grant.status)}`}>
                              {grant.status?.charAt(0).toUpperCase() + grant.status?.slice(1)}
                            </span>
                            <span className="text-xs text-warm-gray-400">• {getGrantTypeLabel(grant.grantType)}</span>
                          </div>
                          <h4 className="font-semibold text-warm-gray-900 text-sm mb-1">{grant.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-warm-gray-500">
                            <span>💰 {formatFunding(grant)}</span>
                            <span>⏳ Deadline: {formatDeadline(grant)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
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
                )}
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

                    <div className={`flex items-start gap-2.5 p-3 rounded-[10px] ${
                      programsList.length > 0
                        ? 'bg-emerald-50/60 border border-emerald-200/50'
                        : 'bg-cream border border-warm-gray-200/60'
                    }`}>
                      <span className={programsList.length > 0 ? 'text-emerald-600 mt-0.5' : 'text-amber mt-0.5'}>
                        {programsList.length > 0 ? '✓' : '●'}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-warm-gray-900">Publish Initial RFP</p>
                        <p className="text-[11px] text-warm-gray-500">
                          {programsList.length > 0
                            ? `${programsList.length} grant call${programsList.length > 1 ? 's' : ''} published`
                            : 'Specify grant scope, domain, and corpus'}
                        </p>
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
                    onClick={openCreateModal}
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
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-sm font-semibold transition-all shadow-soft cursor-pointer"
              >
                <PlusIcon /> New Grant Opportunity
              </button>
            </div>

            {loadingGrants ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-3 border-amber/30 border-t-amber rounded-full animate-spin" />
              </div>
            ) : programsList.length === 0 ? (
              <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-12 shadow-soft text-center">
                <div className="text-5xl mb-4">📢</div>
                <h3 className="font-heading text-xl font-bold text-warm-gray-900 mb-2">No Grant Calls Yet</h3>
                <p className="text-warm-gray-500 text-sm mb-6 max-w-md mx-auto">
                  Publish your first grant call to make it discoverable by research institutions across India.
                </p>
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-[12px] bg-amber hover:bg-amber-light text-white font-semibold transition-all shadow-soft cursor-pointer"
                >
                  <PlusIcon /> Publish Your First Grant Call
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {programsList.map((grant) => (
                  <div
                    key={grant._id || grant.grantId}
                    className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft hover:shadow-medium transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getStatusBadge(grant.status)}`}>
                        {grant.status?.charAt(0).toUpperCase() + grant.status?.slice(1)}
                      </span>
                      <span className="text-xs text-warm-gray-400 font-mono">
                        {new Date(grant.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-2">{grant.title}</h3>
                    <p className="text-xs text-warm-gray-500 mb-4">{getGrantTypeLabel(grant.grantType)} {grant.categoryRaw ? `• ${grant.categoryRaw}` : ''}</p>

                    {grant.description && (
                      <p className="text-xs text-warm-gray-600 mb-4 line-clamp-2 leading-relaxed">{grant.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-[12px] bg-cream border border-warm-gray-200 mb-5 text-xs">
                      <div>
                        <span className="text-warm-gray-400 block text-[11px]">Funding</span>
                        <strong className="text-warm-gray-900 font-semibold text-sm">{formatFunding(grant)}</strong>
                      </div>
                      <div>
                        <span className="text-warm-gray-400 block text-[11px]">Application Deadline</span>
                        <span className="text-warm-gray-700 font-medium">{formatDeadline(grant)}</span>
                      </div>
                      {grant.duration?.rawText && (
                        <div>
                          <span className="text-warm-gray-400 block text-[11px]">Duration</span>
                          <span className="text-warm-gray-700 font-medium">{grant.duration.rawText}</span>
                        </div>
                      )}
                      {grant.focusAreas?.length > 0 && (
                        <div>
                          <span className="text-warm-gray-400 block text-[11px]">Focus Areas</span>
                          <span className="text-warm-gray-700 font-medium">{grant.focusAreas.slice(0, 2).join(', ')}{grant.focusAreas.length > 2 ? ` +${grant.focusAreas.length - 2}` : ''}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() => setActiveTab('proposals')}
                        className="flex-1 py-2 text-xs font-semibold rounded-[8px] bg-amber text-white hover:bg-amber-light transition-colors text-center cursor-pointer"
                      >
                        Review Proposals
                      </button>
                      {grant.links?.infoUrl && (
                        <a
                          href={grant.links.infoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 text-xs font-semibold rounded-[8px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 transition-colors"
                        >
                          View Source ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                          showNotification(`Proposal ${prop.id} approved for next review stage!`)
                        }}
                        className="px-4 py-2 rounded-[8px] bg-amber text-white text-xs font-semibold hover:bg-amber-light transition-colors cursor-pointer"
                      >
                        Accept / Advance
                      </button>
                      <button
                        onClick={() => {
                          showNotification(`Detailed dossier for ${prop.id} downloaded.`)
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


      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          Modal: Publish New Grant Call (Multi-Step)
         ═══════════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-gray-900/40 backdrop-blur-xs">
          <div className="bg-surface-elevated rounded-[20px] border border-warm-gray-200/80 shadow-medium w-full max-w-2xl animate-fade-in flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-warm-gray-200/60 flex-shrink-0">
              <div>
                <h3 className="font-heading text-xl font-bold text-warm-gray-900">
                  Publish New Grant Call
                </h3>
                <p className="text-xs text-warm-gray-500 mt-1">
                  Step {modalStep} of 3 — {modalStep === 1 ? 'Basic Information' : modalStep === 2 ? 'Details & Eligibility' : 'Links & Review'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-warm-gray-400 hover:text-warm-gray-600 p-1 rounded-[8px] hover:bg-warm-gray-100 transition-colors cursor-pointer"
                id="close-grant-modal-btn"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 px-6 sm:px-8 pt-4 flex-shrink-0">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step < modalStep
                      ? 'bg-emerald-500 text-white'
                      : step === modalStep
                        ? 'bg-amber text-white shadow-soft'
                        : 'bg-warm-gray-100 text-warm-gray-400'
                  }`}>
                    {step < modalStep ? '✓' : step}
                  </div>
                  {step < 3 && (
                    <div className={`flex-1 h-0.5 rounded-full transition-all ${
                      step < modalStep ? 'bg-emerald-400' : 'bg-warm-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Form Errors */}
            {formErrors.length > 0 && (
              <div className="mx-6 sm:mx-8 mt-4 p-3 rounded-[10px] bg-red-50 border border-red-200 flex-shrink-0">
                <p className="text-xs font-bold text-red-800 mb-1">Please fix the following:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {formErrors.map((err, i) => (
                    <li key={i} className="text-xs text-red-700">{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handlePublishGrant} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 px-6 sm:px-8 py-5 space-y-5">
                {/* ── STEP 1: Basic Information ── */}
                {modalStep === 1 && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                        Grant Program Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        placeholder="e.g. AI for Climate Resilience Initiative 2026"
                        required
                        maxLength={300}
                        className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                        id="grant-title-input"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={form.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        placeholder="Describe the purpose, scope, and objectives of this grant program..."
                        rows={4}
                        maxLength={2000}
                        className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm resize-none"
                        id="grant-description-input"
                      />
                      <p className="text-[11px] text-warm-gray-400 mt-1 text-right">{form.description.length}/2000</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                          Grant Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={form.grantType}
                          onChange={(e) => updateField('grantType', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                          id="grant-type-select"
                        >
                          {GRANT_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                          Category / Domain
                        </label>
                        <input
                          type="text"
                          value={form.categoryRaw}
                          onChange={(e) => updateField('categoryRaw', e.target.value)}
                          placeholder="e.g. Environmental Sciences"
                          className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                          id="grant-category-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                        Application Deadline <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={form.deadline}
                        onChange={(e) => updateField('deadline', e.target.value)}
                        min={tomorrowISO}
                        required
                        className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                        id="grant-deadline-input"
                      />
                      <p className="text-[11px] text-warm-gray-400 mt-1">Must be a future date — the last date organizations can submit applications.</p>
                    </div>
                  </>
                )}

                {/* ── STEP 2: Details & Eligibility ── */}
                {modalStep === 2 && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                        Eligibility Criteria
                      </label>
                      <textarea
                        value={form.eligibilityText}
                        onChange={(e) => updateField('eligibilityText', e.target.value)}
                        placeholder="Who is eligible to apply? Specify institution types, qualifications, geographic requirements..."
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm resize-none"
                        id="grant-eligibility-input"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                        Application Procedure
                      </label>
                      <textarea
                        value={form.applicationProcedure}
                        onChange={(e) => updateField('applicationProcedure', e.target.value)}
                        placeholder="Describe the application process, required documents, submission portal..."
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm resize-none"
                        id="grant-procedure-input"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-2">
                        Eligible Applicant Types
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {APPLICANT_TYPE_OPTIONS.map((opt) => (
                          <button
                            type="button"
                            key={opt.value}
                            onClick={() => toggleApplicantType(opt.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                              form.eligibleApplicantTypes.includes(opt.value)
                                ? 'bg-amber text-white border-amber shadow-soft'
                                : 'bg-cream text-warm-gray-600 border-warm-gray-200 hover:border-amber/40 hover:text-warm-gray-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-[12px] bg-amber-50/60 border border-amber/10">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-3">Funding Amount</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-warm-gray-500 mb-1">Description</label>
                          <input
                            type="text"
                            value={form.fundingAmountRawText}
                            onChange={(e) => updateField('fundingAmountRawText', e.target.value)}
                            placeholder="e.g. up to ₹50 lakh"
                            className="w-full px-3 py-2 rounded-[8px] bg-white border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-warm-gray-500 mb-1">Min (₹)</label>
                          <input
                            type="number"
                            value={form.fundingAmountMin}
                            onChange={(e) => updateField('fundingAmountMin', e.target.value)}
                            placeholder="e.g. 500000"
                            min="0"
                            className="w-full px-3 py-2 rounded-[8px] bg-white border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-warm-gray-500 mb-1">Max (₹)</label>
                          <input
                            type="number"
                            value={form.fundingAmountMax}
                            onChange={(e) => updateField('fundingAmountMax', e.target.value)}
                            placeholder="e.g. 5000000"
                            min="0"
                            className="w-full px-3 py-2 rounded-[8px] bg-white border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                          Duration Description
                        </label>
                        <input
                          type="text"
                          value={form.durationRawText}
                          onChange={(e) => updateField('durationRawText', e.target.value)}
                          placeholder="e.g. up to 3 years"
                          className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                          Duration (Months)
                        </label>
                        <input
                          type="number"
                          value={form.durationMonths}
                          onChange={(e) => updateField('durationMonths', e.target.value)}
                          placeholder="e.g. 36"
                          min="0"
                          className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                        Focus Areas
                      </label>
                      <input
                        type="text"
                        value={form.focusAreas}
                        onChange={(e) => updateField('focusAreas', e.target.value)}
                        placeholder="Comma-separated, e.g. AI, Machine Learning, Renewable Energy"
                        className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                        id="grant-focus-areas-input"
                      />
                      <p className="text-[11px] text-warm-gray-400 mt-1">Helps organizations discover your grant through semantic matching.</p>
                    </div>
                  </>
                )}

                {/* ── STEP 3: Links & Review ── */}
                {modalStep === 3 && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                        Grant Info / Source URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={form.infoUrl}
                        onChange={(e) => updateField('infoUrl', e.target.value)}
                        placeholder="https://your-agency.gov.in/grants/this-program"
                        required
                        className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                        id="grant-info-url-input"
                      />
                      <p className="text-[11px] text-warm-gray-400 mt-1">The official page where this grant's details are published.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                          Application Portal URL
                        </label>
                        <input
                          type="url"
                          value={form.applicationUrl}
                          onChange={(e) => updateField('applicationUrl', e.target.value)}
                          placeholder="https://apply.your-agency.gov.in"
                          className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                          id="grant-app-url-input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
                          Guidelines Document URL
                        </label>
                        <input
                          type="url"
                          value={form.guidelinesUrl}
                          onChange={(e) => updateField('guidelinesUrl', e.target.value)}
                          placeholder="https://your-agency.gov.in/guidelines.pdf"
                          className="w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm"
                          id="grant-guidelines-url-input"
                        />
                      </div>
                    </div>

                    {/* Review Summary */}
                    <div className="p-5 rounded-[14px] bg-cream border border-warm-gray-200/70">
                      <h4 className="font-heading text-base font-bold text-warm-gray-900 mb-3 flex items-center gap-2">
                        📋 Grant Call Summary
                      </h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                        <div>
                          <span className="text-warm-gray-400 block text-[11px]">Title</span>
                          <span className="text-warm-gray-900 font-semibold">{form.title || '—'}</span>
                        </div>
                        <div>
                          <span className="text-warm-gray-400 block text-[11px]">Grant Type</span>
                          <span className="text-warm-gray-900 font-semibold">{getGrantTypeLabel(form.grantType)}</span>
                        </div>
                        <div>
                          <span className="text-warm-gray-400 block text-[11px]">Deadline</span>
                          <span className="text-warm-gray-900 font-semibold">
                            {form.deadline ? new Date(form.deadline).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-warm-gray-400 block text-[11px]">Funding</span>
                          <span className="text-warm-gray-900 font-semibold">{form.fundingAmountRawText || (form.fundingAmountMax ? `Up to ₹${Number(form.fundingAmountMax).toLocaleString('en-IN')}` : '—')}</span>
                        </div>
                        {form.categoryRaw && (
                          <div>
                            <span className="text-warm-gray-400 block text-[11px]">Domain</span>
                            <span className="text-warm-gray-900 font-semibold">{form.categoryRaw}</span>
                          </div>
                        )}
                        {form.focusAreas && (
                          <div>
                            <span className="text-warm-gray-400 block text-[11px]">Focus Areas</span>
                            <span className="text-warm-gray-900 font-semibold">{form.focusAreas}</span>
                          </div>
                        )}
                        {form.eligibleApplicantTypes.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-warm-gray-400 block text-[11px]">Eligible Applicants</span>
                            <span className="text-warm-gray-900 font-semibold">
                              {form.eligibleApplicantTypes.map((t) => {
                                const opt = APPLICANT_TYPE_OPTIONS.find((o) => o.value === t)
                                return opt ? opt.label : t
                              }).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-[10px] bg-amber-50 border border-amber/15 text-xs text-amber leading-relaxed">
                      📢 Once published, registered universities and principal investigators will receive instant match notifications based on their research focus.
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between gap-3 px-6 sm:px-8 pb-6 sm:pb-8 pt-4 border-t border-warm-gray-200/60 flex-shrink-0">
                <div>
                  {modalStep > 1 && (
                    <button
                      type="button"
                      onClick={() => { setModalStep((s) => s - 1); setFormErrors([]) }}
                      className="px-4 py-2 rounded-[10px] text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100 transition-colors cursor-pointer"
                    >
                      ← Back
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-[10px] text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  {modalStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFormErrors([])
                        // Basic front-end validation before advancing
                        if (modalStep === 1) {
                          if (!form.title.trim()) {
                            setFormErrors(['Grant title is required'])
                            return
                          }
                          if (!form.deadline) {
                            setFormErrors(['Application deadline is required'])
                            return
                          }
                        }
                        setModalStep((s) => s + 1)
                      }}
                      className="px-5 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-xs font-semibold shadow-soft transition-all cursor-pointer"
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`px-5 py-2.5 rounded-[10px] text-white text-xs font-semibold shadow-soft transition-all cursor-pointer flex items-center gap-2 ${
                        submitting
                          ? 'bg-warm-gray-400 cursor-not-allowed'
                          : 'bg-amber hover:bg-amber-light'
                      }`}
                      id="publish-grant-submit-btn"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        '🚀 Publish Grant Call'
                      )}
                    </button>
                  )}
                </div>
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
