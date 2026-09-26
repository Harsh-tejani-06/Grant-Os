import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

// ─── Task type config ───
const TASK_TYPES = [
  { key: 'proposal_writing', label: 'Proposal Writing', icon: '📝', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'grant_discovery', label: 'Grant Discovery', icon: '🔍', color: 'bg-blue-50 text-blue-700 border-blue-200' },
]

// ─── Sidebar nav items ───
const NAV_ITEMS = [
  { key: 'home', label: 'Dashboard', icon: '🏠' },
  { key: 'proposals', label: 'Proposal Management', icon: '📝' },
  { key: 'grants', label: 'Grant Discovery', icon: '🔍' },
  { key: 'applications', label: 'Applications', icon: '📋' },
  { key: 'team', label: 'Team Management', icon: '👥' },
  { key: 'deadlines', label: 'Deadline Alerts', icon: '🔔' },
  { key: 'analytics', label: 'Analytics', icon: '📈' },
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

// Scraped listings carry a fundamentally different shape (grantId, agency.name,
// fundingAmount.{minINR,maxINR,rawText}, deadline.{parsedDate,rawText,type},
// duration.{months,rawText}, links.{infoUrl,applicationUrl,guidelinesUrl},
// focusAreas, source.website, needsReview, lastScrapedAt) than GrantProgram
// documents — these labels/helpers are scoped to that shape only.
const GRANT_TYPE_LABELS = {
  research_grant: 'Research Grant',
  fellowship: 'Fellowship',
  scholarship: 'Scholarship',
  seed_fund: 'Seed Fund',
  infrastructure: 'Infrastructure Grant',
  other: 'General Grant',
}

const PROPOSAL_STATUS_TONE = {
  'In Progress': 'bg-amber-50 text-amber border-amber/15',
  'Under Review': 'bg-blue-50 text-blue-700 border-blue-200',
  Submitted: 'bg-purple-50 text-purple-700 border-purple-200',
  Shortlisted: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Rejected: 'bg-red-50 text-red-600 border-red-200',
  Awarded: 'bg-green-50 text-green-700 border-green-200',
  'Not Awarded': 'bg-warm-gray-100 text-warm-gray-500 border-warm-gray-200',
  Accepted: 'bg-green-50 text-green-700 border-green-200',
  Draft: 'bg-warm-gray-100 text-warm-gray-500 border-warm-gray-200',
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

// Scraped listings carry funding as a { minINR, maxINR, rawText } triple —
// prefer the parsed numbers, fall back to whatever raw text the scraper kept.
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

// Scraped deadlines are often unparsed ("type: unknown") — show the parsed
// date when the scraper managed to extract one, otherwise its raw text,
// otherwise say plainly that it wasn't determined.
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

// Every non-empty link a scraped listing carries, labeled for display —
// links.infoUrl / applicationUrl / guidelinesUrl are independent and any
// subset may be populated.
const getScrapedLinks = (links) => {
  if (!links) return []
  const out = []
  if (links.applicationUrl) out.push({ key: 'applicationUrl', label: 'Apply Online', icon: '📝', url: links.applicationUrl })
  if (links.guidelinesUrl) out.push({ key: 'guidelinesUrl', label: 'View Guidelines', icon: '📄', url: links.guidelinesUrl })
  if (links.infoUrl) out.push({ key: 'infoUrl', label: 'More Information', icon: '🔗', url: links.infoUrl })
  return out
}

const MOCK_APPLICATIONS = [
  { id: 1, title: 'UGC Major Research Project', status: 'Submitted', date: '2026-07-20', amount: '₹25,00,000' },
  { id: 2, title: 'DST INSPIRE Fellowship', status: 'Under Review', date: '2026-07-10', amount: '₹35,000/mo' },
  { id: 3, title: 'ICSSR Doctoral Fellowship', status: 'Approved', date: '2026-06-15', amount: '₹8,00,000' },
]

const MOCK_DEADLINES = [
  { id: 1, title: 'UGC Major Research Project', date: '2026-09-15', daysLeft: 44, priority: 'medium' },
  { id: 2, title: 'CSIR Senior Research Fellowship', date: '2026-08-20', daysLeft: 18, priority: 'high' },
  { id: 3, title: 'ICSSR Research Fellowship', date: '2026-08-30', daysLeft: 28, priority: 'high' },
  { id: 4, title: 'DST SERB Core Research Grant', date: '2026-10-01', daysLeft: 60, priority: 'low' },
  { id: 5, title: 'AICTE Research Promotion', date: '2026-09-30', daysLeft: 59, priority: 'low' },
]

export default function OrgAdminDashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('home')
  const [orgName, setOrgName] = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
  const [reviewSectionModal, setReviewSectionModal] = useState(null)
  const [showFullProposalModal, setShowFullProposalModal] = useState(false)
  const [submittingToAgency, setSubmittingToAgency] = useState(false)
  const [addSectionModalOpen, setAddSectionModalOpen] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newSectionWordLimit, setNewSectionWordLimit] = useState('500')
  const [sectionActionError, setSectionActionError] = useState('')
  const [deletingSectionId, setDeletingSectionId] = useState('')

  // Grant Discovery state — real data from GrantProgram via GET /proposals/open-grants,
  // and from GrantListing (scraper pipeline) via GET /proposals/scraped-grants
  const [grantSource, setGrantSource] = useState('agency') // 'agency' | 'scraped'
  const [openGrants, setOpenGrants] = useState([])
  const [grantsLoading, setGrantsLoading] = useState(false)
  const [scrapedGrants, setScrapedGrants] = useState([])
  const [scrapedGrantsLoading, setScrapedGrantsLoading] = useState(false)
  const [grantSearch, setGrantSearch] = useState('')
  const [grantCategoryFilter, setGrantCategoryFilter] = useState('All Categories')
  const [grantFundingTypeFilter, setGrantFundingTypeFilter] = useState('All Types')
  const [viewAgencyGrant, setViewAgencyGrant] = useState(null) // grant whose agency popup is open
  const [viewGrantDetails, setViewGrantDetails] = useState(null) // grant whose details popup is open
  const [viewScrapedGrant, setViewScrapedGrant] = useState(null) // scraped listing whose details popup is open

  const handleApproveSection = async (sectionId) => {
    if (!selectedProposalId) return
    try {
      const res = await api.put(`/proposals/${selectedProposalId}/sections/${sectionId}`, {
        status: 'Approved',
      })
      if (res.data.success) {
        fetchOrgProposals()
        setReviewSectionModal(null)
      }
    } catch (err) {
      console.error('Failed to approve section:', err)
    }
  }

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

  // Explicit submission to the funding agency — this, and only this, is what
  // makes a proposal appear on the agency's side. Never automatic.
  const handleSubmitToAgency = async () => {
    if (!selectedProposalObj) return
    if (!window.confirm('Submit this proposal to the funding agency? You will not be able to submit it again.')) return
    setSubmittingToAgency(true)
    try {
      const res = await api.put(`/proposals/${selectedProposalObj._id}/submit`)
      if (res.data.success) {
        await fetchOrgProposals()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit proposal.')
    } finally {
      setSubmittingToAgency(false)
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

  const handleExportPDF = (proposal) => {
    if (!proposal) return

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
              <div><span class="meta-label">Total Sections:</span> <span class="meta-val">${proposal.sections?.length || 0} Sections</span></div>
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/auth/me')
        if (res.data.success) {
          setUserName(res.data.user.fullName)
          if (res.data.orgStatus) {
            setOrgName(res.data.orgStatus.organizationName)
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

  // Fetch members, proposals, and open grants when relevant sections are active
  useEffect(() => {
    if (activeSection === 'team' || activeSection === 'home' || activeSection === 'proposals') {
      fetchMembers()
    }
    if (activeSection === 'proposals' || activeSection === 'home' || activeSection === 'team') {
      fetchOrgProposals()
    }
    if (activeSection === 'grants' || activeSection === 'home') {
      fetchOpenGrants()
    }
  }, [activeSection])

  // Fetch scraped grants lazily — only once, the first time that tab is opened
  useEffect(() => {
    if (activeSection === 'grants' && grantSource === 'scraped' && scrapedGrants.length === 0 && !scrapedGrantsLoading) {
      fetchScrapedGrants()
    }
  }, [activeSection, grantSource])

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

  // Real scraped/government grant listings, reusing the existing GrantListing collection.
  const fetchScrapedGrants = async () => {
    setScrapedGrantsLoading(true)
    try {
      const res = await api.get('/proposals/scraped-grants')
      if (res.data.success) {
        setScrapedGrants(res.data.grants || [])
      }
    } catch (err) {
      console.error('Failed to fetch scraped grants:', err)
    } finally {
      setScrapedGrantsLoading(false)
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
        await fetchOrgProposals()
        setSelectedProposalId(res.data.proposal._id)
        setActiveSection('proposals')
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

  // Scraped listings have no GrantProgram counterpart — no grantProgramId is
  // set, so this proposal has no "submit to agency" destination and stays
  // org-internal (visible only in Proposal Management, never on any agency's
  // Proposals page).
  const handleStartProposalForScrapedGrant = (grant) => {
    setProposalCreateError('')
    const fundingDisplay = formatScrapedFunding(grant.fundingAmount) || ''
    setNewProposalData({
      title: `${grant.title} — Proposal`,
      grantTitle: grant.title,
      grantAgency: grant.agency?.name || '',
      fundingAmount: fundingDisplay,
      deadline: grant.deadline?.parsedDate ? new Date(grant.deadline.parsedDate).toISOString().split('T')[0] : '',
      grantProgramId: '',
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

  const handleAutoAssignByRolePresets = async (proposalId) => {
    const activeProp = orgProposals.find((p) => p._id === proposalId)
    if (!activeProp || members.length === 0) return

    const findMember = (keywords) => {
      return members.find((m) => {
        const text = (m.fullName + ' ' + (m.jobTitle || '')).toLowerCase()
        return keywords.some((k) => text.includes(k))
      })
    }

    const piMember = findMember(['investigator', 'pi', 'thorne']) || members[0]
    const researcherMember = findMember(['researcher', 'research', 'rostova']) || members[1] || members[0]
    const financeMember = findMember(['finance', 'patel']) || members[2] || members[0]
    const complianceMember = findMember(['compliance', 'jenkins']) || members[3] || members[0]

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
      if (searchKey.includes('investigator') || searchKey.includes('pi') || searchKey.includes('thorne')) {
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

  const pendingMembers = members.filter((m) => !m.isVerified)
  const verifiedMembers = members.filter((m) => m.isVerified)
  const selectedProposalObj = orgProposals.find((p) => p._id === selectedProposalId) || orgProposals[0]

  // A proposal can be submitted to its agency only if it's linked to a real
  // GrantProgram and hasn't already moved past "In Progress"/"Draft".
  const canSubmitToAgency = (proposal) =>
    Boolean(proposal?.grantProgram) && ['In Progress', 'Draft'].includes(proposal?.status)

  // Client-side filter over the real open-grants list (agency-created grants only —
  // scraped grants have their own tab and their own, much simpler, card).
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

  return (
    <div className="min-h-screen bg-cream flex">
      {/* ─── Sidebar ─── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface-elevated border-r border-warm-gray-200/60 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-warm-gray-200/60">
            <Link to="/" className="flex items-center gap-2 group" id="admin-dash-logo">
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
                onClick={() => { setActiveSection(item.key); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium transition-all duration-200 cursor-pointer ${activeSection === item.key
                  ? 'bg-primary text-white shadow-soft'
                  : 'text-warm-gray-600 hover:bg-warm-gray-50 hover:text-warm-gray-900'
                  }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
                {item.key === 'team' && memberCounts.pending > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {memberCounts.pending}
                  </span>
                )}
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
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 lg:ml-64">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-surface-elevated border-b border-warm-gray-200/60 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-warm-gray-600 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-heading font-semibold text-warm-gray-900">Grant<span className="text-primary">OS</span></span>
          <div className="w-8" />
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {/* ═══════════════════════════════════ HOME ═══════════════════════════════════ */}
          {activeSection === 'home' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl sm:text-4xl font-bold text-warm-gray-900 mb-2">
                  Welcome back, {userName.split(' ')[0]} 👋
                </h1>
                <p className="text-warm-gray-500">Here's your organization overview for today</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                {[
                  { label: 'Team Members', value: memberCounts.total, icon: '👥', accent: 'bg-blue-50 text-blue-600' },
                  { label: 'Pending Requests', value: memberCounts.pending, icon: '⏳', accent: 'bg-amber-50 text-amber' },
                  { label: 'Open Grant Calls', value: openGrants.length, icon: '📋', accent: 'bg-green-50 text-green-600' },
                  { label: 'Total Funding', value: '₹33L', icon: '💰', accent: 'bg-purple-50 text-purple-600' },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300 animate-fade-up"
                    style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-lg ${stat.accent}`}>
                        {stat.icon}
                      </span>
                    </div>
                    <p className="font-heading text-2xl font-bold text-warm-gray-900">{stat.value}</p>
                    <p className="text-sm text-warm-gray-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Requests Preview */}
                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold text-warm-gray-900">Pending Member Requests</h3>
                    {memberCounts.pending > 0 && (
                      <button onClick={() => setActiveSection('team')} className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors cursor-pointer">
                        View All →
                      </button>
                    )}
                  </div>
                  {pendingMembers.length === 0 ? (
                    <p className="text-sm text-warm-gray-400 py-4 text-center">No pending requests 🎉</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingMembers.slice(0, 3).map((m) => (
                        <div key={m._id} className="flex items-center justify-between p-3 rounded-[10px] bg-cream border border-warm-gray-200/60">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber font-bold text-xs">
                              {m.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-warm-gray-800">{m.fullName}</p>
                              <p className="text-xs text-warm-gray-500">{m.email}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber text-[10px] font-bold border border-amber/15">Pending</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upcoming Deadlines Preview */}
                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold text-warm-gray-900">Upcoming Deadlines</h3>
                    <button onClick={() => setActiveSection('deadlines')} className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors cursor-pointer">
                      View All →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {MOCK_DEADLINES.slice(0, 3).map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-[10px] bg-cream border border-warm-gray-200/60">
                        <div>
                          <p className="text-sm font-semibold text-warm-gray-800">{d.title}</p>
                          <p className="text-xs text-warm-gray-500">{d.date}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${d.priority === 'high'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : d.priority === 'medium'
                            ? 'bg-amber-50 text-amber border-amber/15'
                            : 'bg-green-50 text-green-600 border-green-200'
                          }`}>
                          {d.daysLeft}d left
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════ GRANTS (real data) ═══════════════════════════════════ */}
          {activeSection === 'grants' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Grant Discovery</h1>
                <p className="text-warm-gray-500">Browse open calls from GrantOS funding agencies and government/scraped listings</p>
              </div>

              {/* Source toggle */}
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

              {/* Search Bar */}
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
                      id="grant-search-input"
                    />
                  </div>
                  {grantSource === 'agency' && (
                    <div className="flex gap-2">
                      <select
                        value={grantCategoryFilter}
                        onChange={(e) => setGrantCategoryFilter(e.target.value)}
                        className="px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        id="grant-category-filter"
                      >
                        <option>All Categories</option>
                        {GRANT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select
                        value={grantFundingTypeFilter}
                        onChange={(e) => setGrantFundingTypeFilter(e.target.value)}
                        className="px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        id="grant-funding-type-filter"
                      >
                        <option>All Types</option>
                        {GRANT_FUNDING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── GrantOS Funding Agency grants ─── */}
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
                      <p className="text-sm text-warm-gray-400 mt-1">Check back later — funding agencies publish new calls regularly.</p>
                    </div>
                  )}

                  {!grantsLoading && openGrants.length > 0 && filteredGrants.length === 0 && (
                    <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-12 text-center">
                      <p className="text-warm-gray-500">No grants match your search or filters.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {filteredGrants.map((grant, i) => {
                      const daysLeft = daysUntil(grant.deadline)
                      const isClosingSoon = daysLeft !== null && daysLeft <= 14 && daysLeft >= 0
                      const docUrl = grantDocumentUrl(grant.document)

                      return (
                        <div
                          key={grant._id}
                          className="group bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300 animate-fade-up"
                          style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-primary bg-primary-50 px-2 py-0.5 rounded-full border border-primary/15">
                                {grant.displayId}
                              </span>
                              <h3 className="font-heading text-base font-bold text-warm-gray-900 group-hover:text-primary transition-colors mt-1.5 mb-1">
                                {grant.title}
                              </h3>
                              <p className="text-xs text-warm-gray-500">
                                {grant.fundingAgency?.agencyName || 'Funding Agency'}
                              </p>
                            </div>
                            {isClosingSoon && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-600 border-red-200 flex-shrink-0">
                                Closing Soon
                              </span>
                            )}
                          </div>

                          {grant.description && (
                            <p className="text-xs text-warm-gray-600 leading-relaxed mb-3 line-clamp-2">{grant.description}</p>
                          )}

                          <div className="flex items-center gap-4 mb-3 flex-wrap">
                            <span className="text-sm font-bold text-warm-gray-900">{grant.budget || '—'}</span>
                            <span className="text-xs text-warm-gray-400">•</span>
                            <span className="text-xs text-warm-gray-500">
                              Deadline: {formatGrantDate(grant.deadline)}
                              {daysLeft !== null && daysLeft >= 0 && ` (${daysLeft}d left)`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mb-4">
                            <span className="px-2.5 py-1 rounded-full bg-cream text-warm-gray-600 text-xs font-medium border border-warm-gray-200/60">
                              {grant.category || 'Uncategorized'}
                            </span>
                            <span className="text-[11px] text-warm-gray-400">{grant.fundingType}</span>
                          </div>

                          {/* Action buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-warm-gray-100">
                            <button
                              onClick={() => setViewAgencyGrant(grant)}
                              className="py-2 rounded-[10px] text-xs font-semibold text-warm-gray-700 bg-cream hover:bg-warm-gray-100 border border-warm-gray-200 transition-all cursor-pointer"
                            >
                              🏛️ View Agency
                            </button>
                            <button
                              onClick={() => setViewGrantDetails(grant)}
                              className="py-2 rounded-[10px] text-xs font-semibold text-warm-gray-700 bg-cream hover:bg-warm-gray-100 border border-warm-gray-200 transition-all cursor-pointer"
                            >
                              📄 View Details
                            </button>
                          </div>
                          <button
                            onClick={() => handleStartProposalForGrant(grant)}
                            className="w-full mt-2 py-2.5 rounded-[10px] text-xs font-bold text-white bg-primary hover:bg-primary-dark shadow-soft transition-all cursor-pointer"
                          >
                            ✏️ Write Proposal
                          </button>
                          {docUrl && (
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-center mt-2 text-[11px] font-semibold text-primary hover:underline"
                            >
                              📎 Download Guidelines Document
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* ─── Scraped / Government grants (read-only) ─── */}
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
                    {filteredScrapedGrants.map((grant, i) => {
                      const fundingDisplay = formatScrapedFunding(grant.fundingAmount)
                      const deadlineDisplay = formatScrapedDeadline(grant.deadline)
                      const scrapedLinks = getScrapedLinks(grant.links)

                      return (
                        <div
                          key={grant._id || grant.grantId}
                          className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 hover:shadow-medium transition-all duration-300 animate-fade-up"
                          style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <span className="text-[10px] font-bold text-warm-gray-500 bg-warm-gray-100 px-2 py-0.5 rounded-full border border-warm-gray-200">
                                {GRANT_TYPE_LABELS[grant.grantType] || grant.grantType || 'General'}
                              </span>
                              <h3 className="font-heading text-base font-bold text-warm-gray-900 mt-1.5 mb-1 line-clamp-2">{grant.title}</h3>
                              <p className="text-xs text-warm-gray-500">
                                {grant.agency?.name || 'Government / External Source'}
                                {grant.agency?.parentBody && grant.agency.parentBody !== grant.agency.name && (
                                  <span className="text-warm-gray-400"> • {grant.agency.parentBody}</span>
                                )}
                              </p>
                            </div>
                           
                          </div>

                          {grant.description && (
                            <p className="text-xs text-warm-gray-600 leading-relaxed mb-3 line-clamp-3">{grant.description}</p>
                          )}

                          <div className="flex items-center gap-4 mb-3 flex-wrap text-xs">
                            {fundingDisplay && <span className="font-bold text-warm-gray-900 text-sm">{fundingDisplay}</span>}
                            <span className="text-warm-gray-500">Deadline: {deadlineDisplay}</span>
                          </div>

                          {grant.focusAreas?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {grant.focusAreas.slice(0, 3).map((f) => (
                                <span key={f} className="px-2 py-0.5 rounded-full bg-cream text-warm-gray-600 text-[10px] font-medium border border-warm-gray-200/60">
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}

                          <p className="text-[10px] text-warm-gray-400 mb-4">
                            Source: {grant.source?.website || 'External'}
                            {grant.lastScrapedAt && ` • Last checked ${formatGrantDate(grant.lastScrapedAt)}`}
                          </p>

                          {/* Every non-empty scraped link shown individually */}
                          {scrapedLinks.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {scrapedLinks.map((l) => (
                                <a
                                  key={l.key}
                                  href={l.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] bg-primary-50 text-primary text-[11px] font-semibold border border-primary/15 hover:bg-primary-100 transition-colors"
                                >
                                  {l.icon} {l.label}
                                </a>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-2 pt-3 border-t border-warm-gray-100">
                            <button
                              onClick={() => setViewScrapedGrant(grant)}
                              className="py-2 rounded-[10px] text-xs font-semibold text-warm-gray-700 bg-cream hover:bg-warm-gray-100 border border-warm-gray-200 transition-all cursor-pointer"
                            >
                              📄 View Full Details
                            </button>
                          </div>
                          <button
                            onClick={() => handleStartProposalForScrapedGrant(grant)}
                            className="w-full mt-2 py-2.5 rounded-[10px] text-xs font-bold text-white bg-primary hover:bg-primary-dark shadow-soft transition-all cursor-pointer"
                          >
                            ✏️ Write Proposal
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-warm-gray-400 mt-4">
                    These listings are auto-extracted from external government/agency websites and may be
                    incomplete — GrantOS's eligibility checks apply only to grant calls published directly
                    by GrantOS funding agencies (see the tab above). You can still start a proposal against
                    any listing here; it will stay internal to your organization since there's no GrantOS
                    agency to submit it to.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════ APPLICATIONS ═══════════════════════════════════ */}
          {activeSection === 'applications' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Applications</h1>
                <p className="text-warm-gray-500">Track all your grant applications in one place</p>
              </div>

              {/* Status summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Submitted', count: 1, color: 'bg-blue-50 text-blue-600 border-blue-200' },
                  { label: 'Under Review', count: 1, color: 'bg-amber-50 text-amber border-amber/15' },
                  { label: 'Approved', count: 1, color: 'bg-green-50 text-green-600 border-green-200' },
                ].map((s) => (
                  <div key={s.label} className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 text-center">
                    <p className="font-heading text-2xl font-bold text-warm-gray-900">{s.count}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mt-2 ${s.color}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Applications list */}
              <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft overflow-hidden">
                <div className="divide-y divide-warm-gray-200/60">
                  {MOCK_APPLICATIONS.map((app, i) => (
                    <div key={app.id} className="p-5 hover:bg-cream/50 transition-colors animate-fade-up" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-heading font-bold text-warm-gray-900 mb-1">{app.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-warm-gray-500">
                            <span>Submitted: {app.date}</span>
                            <span>•</span>
                            <span>Amount: {app.amount}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${app.status === 'Approved'
                          ? 'bg-green-50 text-green-600 border-green-200'
                          : app.status === 'Under Review'
                            ? 'bg-amber-50 text-amber border-amber/15'
                            : 'bg-blue-50 text-blue-600 border-blue-200'
                          }`}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════ TEAM MANAGEMENT ═══════════════════════════════════ */}
          {activeSection === 'team' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Team Management</h1>
                <p className="text-warm-gray-500">Manage team members and assign tasks</p>
              </div>

              {/* Member stats */}
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
                  {/* Pending Requests */}
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

                  {/* Verified Members */}
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
                            {/* Assigned tasks display */}
                            {m.assignedTasks?.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3 pl-15">
                                {m.assignedTasks.map((t) => {
                                  const taskInfo = TASK_TYPES.find((tt) => tt.key === t)
                                  return taskInfo ? (
                                    <span key={t} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${taskInfo.color}`}>
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

          {/* ═══════════════════════════════════ DEADLINES ═══════════════════════════════════ */}
          {activeSection === 'deadlines' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Deadline Alerts</h1>
                <p className="text-warm-gray-500">Never miss a grant deadline</p>
              </div>

              <div className="space-y-4">
                {MOCK_DEADLINES.map((d, i) => (
                  <div
                    key={d.id}
                    className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 flex items-center justify-between hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300 animate-fade-up"
                    style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-[12px] flex items-center justify-center text-lg ${d.priority === 'high' ? 'bg-red-50' : d.priority === 'medium' ? 'bg-amber-50' : 'bg-green-50'
                        }`}>
                        {d.priority === 'high' ? '🔴' : d.priority === 'medium' ? '🟡' : '🟢'}
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-warm-gray-900">{d.title}</h3>
                        <p className="text-sm text-warm-gray-500">Deadline: {d.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-heading text-xl font-bold ${d.daysLeft <= 20 ? 'text-red-600' : d.daysLeft <= 45 ? 'text-amber' : 'text-green-600'
                        }`}>{d.daysLeft}</p>
                      <p className="text-xs text-warm-gray-500">days left</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════ ANALYTICS ═══════════════════════════════════ */}
          {activeSection === 'analytics' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Analytics & Reports</h1>
                <p className="text-warm-gray-500">Track your organization's grant performance</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Funding Chart placeholder */}
                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6">
                  <h3 className="font-heading font-bold text-warm-gray-900 mb-4">Funding Received</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Q1 2026', value: 45 },
                      { label: 'Q2 2026', value: 72 },
                      { label: 'Q3 2026', value: 38 },
                    ].map((q) => (
                      <div key={q.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-warm-gray-600">{q.label}</span>
                          <span className="font-bold text-warm-gray-900">₹{q.value}L</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-warm-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-700"
                            style={{ width: `${q.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Success Rate */}
                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6">
                  <h3 className="font-heading font-bold text-warm-gray-900 mb-4">Application Success Rate</h3>
                  <div className="flex items-center justify-center py-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2ddd4" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4a7c59" strokeWidth="3" strokeDasharray="67, 100" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="font-heading text-2xl font-bold text-primary">67%</span>
                        <span className="text-[10px] text-warm-gray-500">Success Rate</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-4">
                    <div><p className="font-bold text-warm-gray-900">6</p><p className="text-[10px] text-warm-gray-500">Applied</p></div>
                    <div><p className="font-bold text-green-600">4</p><p className="text-[10px] text-warm-gray-500">Won</p></div>
                    <div><p className="font-bold text-red-500">2</p><p className="text-[10px] text-warm-gray-500">Rejected</p></div>
                  </div>
                </div>
              </div>

              <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6">
                <h3 className="font-heading font-bold text-warm-gray-900 mb-4">Grant Distribution by Category</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Research', pct: 45, color: 'bg-blue-500' },
                    { label: 'Fellowship', pct: 25, color: 'bg-purple-500' },
                    { label: 'Infrastructure', pct: 20, color: 'bg-green-500' },
                    { label: 'Other', pct: 10, color: 'bg-amber' },
                  ].map((cat) => (
                    <div key={cat.label} className="text-center">
                      <div className="w-full h-24 bg-warm-gray-100 rounded-[10px] relative overflow-hidden mb-2">
                        <div className={`absolute bottom-0 left-0 right-0 ${cat.color} rounded-b-[10px] transition-all duration-700`} style={{ height: `${cat.pct}%` }} />
                      </div>
                      <p className="text-sm font-semibold text-warm-gray-900">{cat.pct}%</p>
                      <p className="text-xs text-warm-gray-500">{cat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Proposal Management Section ─── */}
          {activeSection === 'proposals' && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-heading text-2xl font-bold text-warm-gray-900">Proposal Management & Section Assignments</h1>
                  <p className="text-sm text-warm-gray-500 mt-1">Assign sections to team members, add or remove sections as the proposal's needs change, and submit to the funding agency when ready.</p>
                </div>
                <button
                  onClick={() => setCreateProposalModal(true)}
                  className="px-4 py-2.5 rounded-[12px] bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all shadow-soft cursor-pointer flex items-center gap-2"
                >
                  <span>+ Start New Proposal</span>
                </button>
              </div>

              {/* Proposal Selector Tabs */}
              {orgProposals.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-warm-gray-200/60">
                  {orgProposals.map((prop) => (
                    <button
                      key={prop._id}
                      onClick={() => setSelectedProposalId(prop._id)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${selectedProposalObj?._id === prop._id
                        ? 'bg-purple-600 text-white border-purple-600 shadow-soft'
                        : 'bg-white text-warm-gray-700 border-warm-gray-200 hover:bg-warm-gray-50'
                        }`}
                    >
                      {prop.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Active Proposal View */}
              {selectedProposalObj ? (
                <div className="space-y-6">
                  {/* Proposal Banner */}
                  <div className="bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-soft p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {selectedProposalObj.sections?.length || 0}-Section Proposal
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${PROPOSAL_STATUS_TONE[selectedProposalObj.status] || PROPOSAL_STATUS_TONE.Draft}`}>
                            {selectedProposalObj.status}
                          </span>
                          {!selectedProposalObj.grantProgram && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-warm-gray-100 text-warm-gray-500 border border-warm-gray-200">
                              Not linked to a GrantOS agency
                            </span>
                          )}
                        </div>
                        <h2 className="font-heading text-xl font-bold text-warm-gray-900">{selectedProposalObj.title}</h2>
                        <p className="text-xs text-warm-gray-500 mt-1">
                          Grant: <span className="font-semibold text-warm-gray-800">{selectedProposalObj.grantTitle || 'N/A'}</span> ({selectedProposalObj.grantAgency || 'Funding Agency'})
                          {selectedProposalObj.deadline && <> &nbsp;•&nbsp; Deadline: {selectedProposalObj.deadline}</>}
                          {selectedProposalObj.submittedAt && <> &nbsp;•&nbsp; Submitted: {formatGrantDate(selectedProposalObj.submittedAt)}</>}
                        </p>
                      </div>

                      {/* Banner Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setShowFullProposalModal(true)}
                          className="px-4 py-2.5 rounded-[12px] bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-soft"
                        >
                          <span>📄</span> View Full Proposal Document
                        </button>
                        <button
                          onClick={() => handleAutoAssignByRolePresets(selectedProposalObj._id)}
                          className="px-4 py-2.5 rounded-[12px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold hover:shadow-medium transition-all cursor-pointer flex items-center gap-2 shadow-soft"
                        >
                          <span>✨ Auto-Assign All Sections</span>
                        </button>
                        {canSubmitToAgency(selectedProposalObj) && (
                          <button
                            onClick={handleSubmitToAgency}
                            disabled={submittingToAgency}
                            className="px-4 py-2.5 rounded-[12px] bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-soft disabled:opacity-60"
                          >
                            <span>🚀</span> {submittingToAgency ? 'Submitting...' : 'Submit to Agency'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteProposal(selectedProposalObj._id)}
                          className="px-3.5 py-2.5 rounded-[12px] bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 transition-all cursor-pointer flex items-center gap-1.5"
                          title="Delete Proposal"
                        >
                          <span>🗑️ Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sections Table — dynamic: sections can be added or removed here */}
                  <div className="bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-soft overflow-hidden">
                    <div className="px-6 py-4 border-b border-warm-gray-200/60 flex items-center justify-between bg-cream/40 flex-wrap gap-2">
                      <h3 className="font-heading font-bold text-warm-gray-900">Section Assignments & Review ({selectedProposalObj.sections?.length || 0} Sections)</h3>
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
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sec.status === 'Ready for Review' ? 'bg-green-50 text-green-700 border-green-200 animate-pulse'
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

                          {/* Member Dropdown, Review Button, Delete Button */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setReviewSectionModal(sec)}
                              className={`px-3 py-2 rounded-[10px] text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${sec.status === 'Ready for Review'
                                  ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 shadow-soft'
                                  : 'bg-warm-gray-100 hover:bg-warm-gray-200 text-warm-gray-800 border-warm-gray-300'
                                }`}
                            >
                              <span>👁️</span> {sec.status === 'Ready for Review' ? 'Review & Approve' : 'View Text'}
                            </button>
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
                      {(!selectedProposalObj.sections || selectedProposalObj.sections.length === 0) && (
                        <div className="p-8 text-center text-sm text-warm-gray-400">
                          No sections yet — click "Add Section" above to build this proposal's structure.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-elevated rounded-[20px] p-12 border border-warm-gray-200/60 text-center">
                  <span className="text-4xl block mb-3">📋</span>
                  <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-2">No Proposals Created Yet</h3>
                  <p className="text-sm text-warm-gray-500 max-w-md mx-auto mb-6">
                    Start a proposal to generate a section structure and assign sections to team members.
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
                    {agency.organizationType && (
                      <div>
                        <span className="block text-warm-gray-400 uppercase tracking-wider font-bold text-[10px] mb-0.5">Organization Type</span>
                        <span className="text-warm-gray-800 font-semibold">{agency.organizationType}</span>
                      </div>
                    )}
                    {agency.ownershipType && (
                      <div>
                        <span className="block text-warm-gray-400 uppercase tracking-wider font-bold text-[10px] mb-0.5">Ownership</span>
                        <span className="text-warm-gray-800 font-semibold">{agency.ownershipType}</span>
                      </div>
                    )}
                  </div>

                  <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border bg-green-50 text-green-700 border-green-200 mb-4">
                    ✓ Verified Funding Agency
                  </span>

                  {agency.description && (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-warm-gray-400 mb-1">About</p>
                      <p className="text-sm text-warm-gray-700 leading-relaxed">{agency.description}</p>
                    </div>
                  )}
                  {agency.mission && (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-warm-gray-400 mb-1">Mission</p>
                      <p className="text-sm text-warm-gray-700 leading-relaxed">{agency.mission}</p>
                    </div>
                  )}
                  {agency.vision && (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-warm-gray-400 mb-1">Vision</p>
                      <p className="text-sm text-warm-gray-700 leading-relaxed">{agency.vision}</p>
                    </div>
                  )}

                  {agency.headquarters && (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-warm-gray-400 mb-1">Headquarters</p>
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

      {/* ─── View Grant Details Modal (restructured for readability) ─── */}
      {viewGrantDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setViewGrantDetails(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-2xl p-6 sm:p-8 animate-fade-up max-h-[85vh] overflow-y-auto">
            {(() => {
              const g = viewGrantDetails
              const docUrl = grantDocumentUrl(g.document)
              return (
                <>
                  {/* Header */}
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
                            <span key={r} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber text-[11px] font-semibold border border-amber/15">{r}</span>
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
                              <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 mb-1">Allowable</p>
                              <p className="text-xs text-warm-gray-700 whitespace-pre-line">{g.allowableExpenses}</p>
                            </div>
                          )}
                          {g.nonAllowableExpenses && (
                            <div className="p-3 rounded-[10px] bg-red-50 border border-red-200">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 mb-1">Not Allowable</p>
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
                      <span className="text-[10px] font-bold text-warm-gray-500 bg-warm-gray-100 px-2 py-0.5 rounded-full border border-warm-gray-200">
                        {GRANT_TYPE_LABELS[g.grantType] || g.grantType || 'General'}
                      </span>
                      <h2 className="font-heading text-xl font-bold text-warm-gray-900 mt-2">{g.title}</h2>
                      <p className="text-xs text-warm-gray-500 mt-1">
                        {g.agency?.name || 'Government / External Source'}
                        {g.agency?.parentBody && g.agency.parentBody !== g.agency.name && ` • ${g.agency.parentBody}`}
                      </p>
                    </div>
                    <button onClick={() => setViewScrapedGrant(null)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer flex-shrink-0">✕</button>
                  </div>

                  

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

                    {g.applicationProcedure && (
                      <GrantSection icon="🗂️" title="Application Procedure">
                        <p className="text-sm text-warm-gray-700 whitespace-pre-line leading-relaxed">{g.applicationProcedure}</p>
                      </GrantSection>
                    )}

                    {g.focusAreas?.length > 0 && (
                      <GrantSection icon="🔬" title="Focus Areas">
                        <div className="flex flex-wrap gap-1.5">
                          {g.focusAreas.map((f) => (
                            <span key={f} className="px-2.5 py-1 rounded-full bg-amber-50 text-amber text-[11px] font-semibold border border-amber/15">{f}</span>
                          ))}
                        </div>
                      </GrantSection>
                    )}

                    {g.eligibleApplicantTypes?.length > 0 && (
                      <GrantSection icon="👥" title="Eligible Applicant Types">
                        <p className="text-sm text-warm-gray-700">
                          {g.eligibleApplicantTypes.map((t) => APPLICANT_TYPE_LABELS[t] || t).join(', ')}
                        </p>
                      </GrantSection>
                    )}

                    <GrantSection icon="🌐" title="Source">
                      <p className="text-xs text-warm-gray-600">
                        {g.source?.website || 'External'}
                        {g.lastScrapedAt && ` • Last checked ${formatGrantDate(g.lastScrapedAt)}`}
                      </p>
                    </GrantSection>

                    {scrapedLinks.length > 0 && (
                      <GrantSection icon="🔗" title="Links">
                        <div className="flex flex-wrap gap-2">
                          {scrapedLinks.map((l) => (
                            <a
                              key={l.key}
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-primary-50 text-primary text-xs font-bold border border-primary/15 hover:bg-primary-100 transition-all"
                            >
                              {l.icon} {l.label}
                            </a>
                          ))}
                        </div>
                      </GrantSection>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-warm-gray-200/60">
                    <button
                      onClick={() => setViewScrapedGrant(null)}
                      className="px-4 py-2 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => { setViewScrapedGrant(null); handleStartProposalForScrapedGrant(g) }}
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

      {/* ─── Create Proposal Modal ─── */}
      {createProposalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setCreateProposalModal(false)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-lg p-8 animate-fade-up">
            <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-1">Start New Proposal</h2>
            <p className="text-sm text-warm-gray-500 mb-6">
              {newProposalData.grantProgramId
                ? 'Pre-filled from the selected grant call. You can submit this proposal directly to the funding agency once ready.'
                : newProposalData.grantTitle
                  ? 'Pre-filled from the selected grant listing. This proposal stays internal to your organization.'
                  : 'This will generate a starting section structure you can customize.'}
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
                <p className="text-[11px] text-warm-gray-400">
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
                  {proposalSubmitting ? 'Creating...' : 'Create Proposal'}
                </button>
              </div>
            </form>
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

            {/* Quick Role Presets */}
            <div className="mb-5 p-3 rounded-[12px] bg-cream/70 border border-warm-gray-200/60 space-y-1.5">
              <p className="text-[10px] font-bold text-warm-gray-500 uppercase tracking-wider">Quick Role Presets:</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(ROLE_PRESETS).map((pName) => (
                  <button
                    key={pName}
                    type="button"
                    onClick={() => applyRolePreset(pName)}
                    className="px-2.5 py-1 rounded-[8px] bg-white border border-warm-gray-200 hover:border-purple-300 hover:bg-purple-50 text-[11px] font-semibold text-warm-gray-800 transition-all cursor-pointer shadow-soft"
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
      {/* ─── Single Section Review & Approve Modal ─── */}
      {reviewSectionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setReviewSectionModal(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-2xl p-6 sm:p-8 animate-fade-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-warm-gray-200/60 mb-4">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${reviewSectionModal.status === 'Ready for Review' ? 'bg-green-50 text-green-700 border-green-200'
                    : reviewSectionModal.status === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-warm-gray-50 text-warm-gray-600 border-warm-gray-200'
                  }`}>
                  {reviewSectionModal.status}
                </span>
                <h2 className="font-heading text-lg font-bold text-warm-gray-900 mt-1">{reviewSectionModal.title}</h2>
                <p className="text-xs text-warm-gray-500">Assigned writer: <span className="font-semibold text-warm-gray-800">{reviewSectionModal.assignedToName || 'Unassigned'}</span></p>
              </div>
              <button onClick={() => setReviewSectionModal(null)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-white rounded-[12px] border border-warm-gray-200/80 font-mono text-xs text-warm-gray-800 leading-relaxed whitespace-pre-wrap mb-6">
              {reviewSectionModal.content || <span className="text-warm-gray-400 italic">No content written yet for this section.</span>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-warm-gray-200/60">
              <button onClick={() => setReviewSectionModal(null)} className="px-4 py-2 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer">
                Close
              </button>
              {reviewSectionModal.status !== 'Approved' && (
                <button
                  onClick={() => handleApproveSection(reviewSectionModal._id)}
                  className="px-5 py-2 rounded-[10px] font-bold text-white bg-green-600 hover:bg-green-700 shadow-soft transition-all text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>✓</span> Approve Section
                </button>
              )}
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
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Master Compiled Document
                </span>
                <h2 className="font-heading text-xl font-bold text-warm-gray-900 mt-1">{selectedProposalObj.title}</h2>
                <p className="text-xs text-warm-gray-500">Agency: {selectedProposalObj.grantAgency || 'Funding Agency'} &nbsp;•&nbsp; Overall Progress: {selectedProposalObj.progress || 0}%</p>
              </div>
              <button onClick={() => setShowFullProposalModal(false)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer">
                ✕
              </button>
            </div>

            {/* Compiled Sections Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-white rounded-[16px] border border-warm-gray-200 shadow-inner space-y-6 mb-6 text-xs leading-relaxed text-warm-gray-800">
              {selectedProposalObj.sections?.map((sec) => (
                <div key={sec._id} className="pb-6 border-b border-warm-gray-200/60 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-heading font-bold text-sm text-purple-950">{sec.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${sec.status === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : sec.status === 'Ready for Review' ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-warm-gray-50 text-warm-gray-500 border-warm-gray-200'
                      }`}>
                      {sec.status} &nbsp;•&nbsp; Writer: {sec.assignedToName || 'Unassigned'}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans bg-cream/30 p-4 rounded-[10px] border border-warm-gray-200/50">
                    {sec.content || <span className="text-warm-gray-400 italic">No section text submitted yet.</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-warm-gray-200/60">
              <button
                type="button"
                onClick={() => handleExportPDF(selectedProposalObj)}
                className="px-4 py-2.5 rounded-[10px] font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 transition-all text-xs cursor-pointer flex items-center gap-1.5 border border-purple-300"
              >
                <span>📥</span> Export PDF
              </button>
              <button
                type="button"
                onClick={() => setShowFullProposalModal(false)}
                className="px-4 py-2 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer"
              >
                Close Review
              </button>
              <button
                type="button"
                onClick={handleApproveAllSections}
                disabled={actionLoading === selectedProposalObj._id}
                className="px-5 py-2.5 rounded-[10px] font-bold text-white bg-green-600 hover:bg-green-700 shadow-soft transition-all text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>✓</span> {actionLoading === selectedProposalObj._id ? 'Approving All...' : 'Approve All Sections'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── View Assigned Tasks Modal ─── */}
      {viewTasksModalMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setViewTasksModalMember(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-3xl p-6 sm:p-8 animate-fade-up max-h-[90vh] flex flex-col">
            {/* Modal Header */}
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

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {/* Module Permissions */}
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

              {/* Grant Proposal Sections */}
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

                        {/* Grant Selection Dropdown */}
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
                              {/* Grant Banner */}
                              <div className="bg-purple-50/70 p-4 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Grant Proposal</span>
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

                              {/* Sections List */}
                              <div className="p-3 divide-y divide-warm-gray-100">
                                {prop.sections.map((sec) => (
                                  <div key={sec._id} className="py-2.5 px-2 flex items-center justify-between gap-2">
                                    <div>
                                      <p className="text-xs font-bold text-warm-gray-800">{sec.title}</p>
                                      <p className="text-[11px] text-warm-gray-400">Word limit: {sec.wordCountLimit || 500} words</p>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sec.status === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-200'
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

            {/* Footer */}
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
      <span className="text-warm-gray-400 block text-[10px] uppercase tracking-wide">{label}</span>
      <strong className="text-warm-gray-900">{value || fallback}</strong>
    </div>
  )
}