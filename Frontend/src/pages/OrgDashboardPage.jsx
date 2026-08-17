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

// ─── Static grant data ───
const MOCK_GRANTS = [
  { id: 1, title: 'UGC Major Research Project', agency: 'University Grants Commission', amount: '₹25,00,000', deadline: '2026-09-15', category: 'Research', status: 'Open', match: 95 },
  { id: 2, title: 'DST SERB Core Research Grant', agency: 'Dept. of Science & Technology', amount: '₹50,00,000', deadline: '2026-10-01', category: 'Science', status: 'Open', match: 88 },
  { id: 3, title: 'ICSSR Research Fellowship', agency: 'Indian Council of Social Science Research', amount: '₹8,00,000', deadline: '2026-08-30', category: 'Fellowship', status: 'Closing Soon', match: 82 },
  { id: 4, title: 'DBT Institutional Development', agency: 'Dept. of Biotechnology', amount: '₹1,20,00,000', deadline: '2026-11-15', category: 'Infrastructure', status: 'Open', match: 76 },
  { id: 5, title: 'AICTE Research Promotion Scheme', agency: 'AICTE', amount: '₹15,00,000', deadline: '2026-09-30', category: 'Research', status: 'Open', match: 71 },
  { id: 6, title: 'CSIR Senior Research Fellowship', agency: 'Council of Scientific & Industrial Research', amount: '₹4,20,000/yr', deadline: '2026-08-20', category: 'Fellowship', status: 'Closing Soon', match: 68 },
]

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
  })
  const [proposalSubmitting, setProposalSubmitting] = useState(false)
  const [assigningSectionId, setAssigningSectionId] = useState('')
  const [reviewSectionModal, setReviewSectionModal] = useState(null)
  const [showFullProposalModal, setShowFullProposalModal] = useState(false)

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

  // Fetch members and proposals when sections are active
  useEffect(() => {
    if (activeSection === 'team' || activeSection === 'home' || activeSection === 'proposals') {
      fetchMembers()
    }
    if (activeSection === 'proposals' || activeSection === 'home') {
      fetchOrgProposals()
    }
  }, [activeSection])

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

  const handleCreateProposal = async (e) => {
    e.preventDefault()
    if (!newProposalData.title.trim()) return
    setProposalSubmitting(true)
    try {
      const res = await api.post('/proposals/create', newProposalData)
      if (res.data.success) {
        setCreateProposalModal(false)
        setNewProposalData({ title: '', grantTitle: '', grantAgency: '', fundingAmount: '', deadline: '' })
        fetchOrgProposals()
      }
    } catch (err) {
      console.error('Create proposal error:', err)
    } finally {
      setProposalSubmitting(false)
    }
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
                  { label: 'Active Grants', value: 3, icon: '📋', accent: 'bg-green-50 text-green-600' },
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

          {/* ═══════════════════════════════════ GRANTS ═══════════════════════════════════ */}
          {activeSection === 'grants' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Grant Discovery</h1>
                <p className="text-warm-gray-500">Find and apply for grants matching your organization profile</p>
              </div>

              {/* Search Bar */}
              <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-gray-400">🔍</span>
                    <input
                      type="text"
                      placeholder="Search grants by name, agency, or keyword..."
                      className="w-full pl-11 pr-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      id="grant-search-input"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select className="px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" id="grant-category-filter">
                      <option>All Categories</option>
                      <option>Research</option>
                      <option>Fellowship</option>
                      <option>Infrastructure</option>
                      <option>Science</option>
                    </select>
                    <select className="px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" id="grant-status-filter">
                      <option>All Status</option>
                      <option>Open</option>
                      <option>Closing Soon</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Grants Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {MOCK_GRANTS.map((grant, i) => (
                  <div
                    key={grant.id}
                    className="group bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300 animate-fade-up"
                    style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-heading text-base font-bold text-warm-gray-900 group-hover:text-primary transition-colors mb-1">{grant.title}</h3>
                        <p className="text-xs text-warm-gray-500">{grant.agency}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${grant.status === 'Closing Soon'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-green-50 text-green-600 border-green-200'
                        }`}>
                        {grant.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm font-bold text-warm-gray-900">{grant.amount}</span>
                      <span className="text-xs text-warm-gray-400">•</span>
                      <span className="text-xs text-warm-gray-500">Deadline: {grant.deadline}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-cream text-warm-gray-600 text-xs font-medium border border-warm-gray-200/60">
                        {grant.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-warm-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${grant.match}%` }} />
                        </div>
                        <span className="text-xs font-bold text-primary">{grant.match}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                              <button
                                onClick={() => openTaskModal(m)}
                                className="px-4 py-2 rounded-[10px] text-sm font-semibold text-primary bg-primary-50 hover:bg-primary-100 border border-primary/15 transition-all duration-200 cursor-pointer"
                              >
                                {m.assignedTasks?.length > 0 ? 'Edit Tasks' : 'Assign Tasks'}
                              </button>
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
                  <p className="text-sm text-warm-gray-500 mt-1">Assign the proposal template sections to your organization's team members.</p>
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
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          17-Section Master Template
                        </span>
                        <h2 className="font-heading text-xl font-bold text-warm-gray-900 mt-2">{selectedProposalObj.title}</h2>
                        <p className="text-xs text-warm-gray-500 mt-1">
                          Grant: <span className="font-semibold text-warm-gray-800">{selectedProposalObj.grantTitle || 'N/A'}</span> ({selectedProposalObj.grantAgency || 'Funding Agency'})
                          {selectedProposalObj.deadline && <> &nbsp;•&nbsp; Deadline: {selectedProposalObj.deadline}</>}
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
                  </div>

                  {/* 17 Sections Table */}
                  <div className="bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-soft overflow-hidden">
                    <div className="px-6 py-4 border-b border-warm-gray-200/60 flex items-center justify-between bg-cream/40">
                      <h3 className="font-heading font-bold text-warm-gray-900">Section Assignments & Review ({selectedProposalObj.sections?.length || 17} Sections)</h3>
                      <span className="text-xs text-warm-gray-500">Select team member & review section text</span>
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

                          {/* Member Dropdown & Review Button */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setReviewSectionModal(sec)}
                              className={`px-3 py-2 rounded-[10px] text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                sec.status === 'Ready for Review'
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

      {/* ─── Create Proposal Modal ─── */}
      {createProposalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setCreateProposalModal(false)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-lg p-8 animate-fade-up">
            <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-1">Start New Proposal</h2>
            <p className="text-sm text-warm-gray-500 mb-6">This will automatically generate the 17-section proposal template.</p>

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
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-warm-gray-700 block mb-1">Funding Agency</label>
                  <input
                    type="text"
                    value={newProposalData.grantAgency}
                    onChange={(e) => setNewProposalData({ ...newProposalData, grantAgency: e.target.value })}
                    placeholder="e.g. DST / UGC"
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
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
                    className="w-full px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateProposalModal(false)}
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
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  reviewSectionModal.status === 'Ready for Review' ? 'bg-green-50 text-green-700 border-green-200'
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
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      sec.status === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-200'
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
                <span>✓</span> {actionLoading === selectedProposalObj._id ? 'Approving All...' : 'Approve All 17 Sections'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
