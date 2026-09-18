import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const STATUS_COLORS = {
  pending: { bg: 'bg-amber-50', text: 'text-amber', border: 'border-amber/15', dot: 'bg-amber' },
  approved: { bg: 'bg-primary-50', text: 'text-primary', border: 'border-primary/15', dot: 'bg-primary' },
  rejected: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' },
}

export default function AdminDashboard() {
  const [activeEntityTab, setActiveEntityTab] = useState('organizations') // 'organizations' | 'agencies'
  const [organizations, setOrganizations] = useState([])
  const [agencies, setAgencies] = useState([])
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState({ text: '', type: '' })

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeEntityTab === 'organizations') {
        const url = filter ? `/admin/organizations?status=${filter}` : '/admin/organizations'
        const res = await api.get(url)
        if (res.data.success) {
          setOrganizations(res.data.organizations)
          setCounts(res.data.counts)
        }
      } else {
        const url = filter ? `/admin/agencies?status=${filter}` : '/admin/agencies'
        const res = await api.get(url)
        if (res.data.success) {
          setAgencies(res.data.agencies)
          setCounts(res.data.counts)
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSelectedItem(null)
    fetchData()
  }, [activeEntityTab, filter])

  const handleApprove = async (id) => {
    setActionLoading(true)
    setActionMessage({ text: '', type: '' })
    try {
      const endpoint = activeEntityTab === 'organizations'
        ? `/admin/organizations/${id}/approve`
        : `/admin/agencies/${id}/approve`

      const res = await api.put(endpoint)
      if (res.data.success) {
        setActionMessage({ text: res.data.message, type: 'success' })
        fetchData()
        setSelectedItem(null)
      }
    } catch (err) {
      setActionMessage({ text: err.response?.data?.message || 'Approval failed', type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim() || !selectedItem) return
    setActionLoading(true)
    setActionMessage({ text: '', type: '' })
    try {
      const endpoint = activeEntityTab === 'organizations'
        ? `/admin/organizations/${selectedItem._id}/reject`
        : `/admin/agencies/${selectedItem._id}/reject`

      const res = await api.put(endpoint, { reason: rejectReason })
      if (res.data.success) {
        setActionMessage({ text: res.data.message, type: 'success' })
        setShowRejectModal(false)
        setRejectReason('')
        fetchData()
        setSelectedItem(null)
      }
    } catch (err) {
      setActionMessage({ text: err.response?.data?.message || 'Rejection failed', type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Top Nav */}
      <header className="bg-surface-elevated border-b border-warm-gray-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group" id="admin-logo">
            <div className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
              <LeafIcon />
            </div>
            <span className="font-heading text-xl font-semibold text-warm-gray-900 tracking-tight">
              Grant<span className="text-primary">OS</span>
            </span>
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-primary-50 text-primary text-xs font-bold uppercase tracking-wider">System Admin</span>
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem('grantos_token')
              localStorage.removeItem('grantos_user')
              window.location.href = '/login'
            }}
            className="text-sm text-warm-gray-500 hover:text-warm-gray-700 font-medium transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Main Entity Tab Switcher */}
        <div className="flex border-b border-warm-gray-200 mb-8 gap-8">
          <button
            onClick={() => { setActiveEntityTab('organizations'); setFilter(''); }}
            className={`pb-4 text-lg font-heading font-bold transition-all cursor-pointer border-b-2 ${
              activeEntityTab === 'organizations'
                ? 'text-primary border-primary'
                : 'text-warm-gray-400 border-transparent hover:text-warm-gray-600'
            }`}
          >
            🏫 Academic Organizations
          </button>
          <button
            onClick={() => { setActiveEntityTab('agencies'); setFilter(''); }}
            className={`pb-4 text-lg font-heading font-bold transition-all cursor-pointer border-b-2 ${
              activeEntityTab === 'agencies'
                ? 'text-amber border-amber'
                : 'text-warm-gray-400 border-transparent hover:text-warm-gray-600'
            }`}
          >
            🏛️ Funding Agencies
          </button>
        </div>

        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">
            {activeEntityTab === 'organizations' ? 'Organization Management' : 'Funding Agency Management'}
          </h1>
          <p className="text-warm-gray-500">
            {activeEntityTab === 'organizations'
              ? 'Review and verify applicant academic institutions & NGOs'
              : 'Review, verify legal credentials, and approve funding agencies'}
          </p>
        </div>

        {/* Action Message */}
        {actionMessage.text && (
          <div className={`p-4 rounded-[12px] mb-6 ${actionMessage.type === 'success' ? 'bg-primary-50 border border-primary/15 text-primary' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            <p className="text-sm font-medium">{actionMessage.text}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', count: counts.total, color: 'bg-warm-gray-100 text-warm-gray-700' },
            { label: 'Pending', count: counts.pending, color: 'bg-amber-50 text-amber' },
            { label: 'Approved', count: counts.approved, color: 'bg-primary-50 text-primary' },
            { label: 'Rejected', count: counts.rejected, color: 'bg-red-50 text-red-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-elevated rounded-[12px] border border-warm-gray-200/60 shadow-soft p-5">
              <p className="text-sm text-warm-gray-500 mb-1">{stat.label}</p>
              <p className={`text-3xl font-heading font-bold ${stat.color.split(' ')[1]}`}>{stat.count}</p>
            </div>
          ))}
        </div>

        {/* Filter Status Tabs */}
        <div className="flex rounded-[12px] bg-surface-elevated border border-warm-gray-200/60 p-1 mb-6 w-fit">
          {[
            { value: '', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ].map(tab => (
            <button key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-5 py-2 rounded-[10px] text-sm font-semibold transition-all duration-200 cursor-pointer ${
                filter === tab.value
                  ? activeEntityTab === 'organizations' ? 'bg-primary text-white shadow-soft' : 'bg-amber text-white shadow-soft'
                  : 'text-warm-gray-500 hover:text-warm-gray-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className={`w-8 h-8 border-3 border-t-transparent rounded-full animate-spin ${activeEntityTab === 'organizations' ? 'border-primary' : 'border-amber'}`} />
          </div>
        ) : (
          activeEntityTab === 'organizations' ? (
            /* Organizations Table/Cards */
            organizations.length === 0 ? (
              <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-12 text-center">
                <p className="text-warm-gray-500 text-lg">No organizations found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {organizations.map(org => {
                  const sc = STATUS_COLORS[org.status]
                  return (
                    <div key={org._id} className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 transition-all duration-200 hover:shadow-medium">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-heading text-lg font-bold text-warm-gray-900">{org.organizationName}</h3>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${sc.bg} ${sc.border} border`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              <span className={`text-xs font-semibold capitalize ${sc.text}`}>{org.status}</span>
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-warm-gray-500">
                            <span>📋 Reg: {org.registrationNumber}</span>
                            <span className="capitalize">🏢 {org.organizationType?.replace('_', ' ')}</span>
                            <span>📧 {org.contactPerson?.email}</span>
                            <span>📅 {formatDate(org.submittedAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedItem(selectedItem?._id === org._id ? null : org)}
                            className="px-4 py-2 rounded-[10px] text-sm font-semibold text-warm-gray-600 border border-warm-gray-200 hover:bg-cream transition-all cursor-pointer"
                          >
                            {selectedItem?._id === org._id ? 'Close' : 'Details'}
                          </button>
                          {org.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(org._id)}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-[10px] text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-all cursor-pointer disabled:opacity-50"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => { setSelectedItem(org); setShowRejectModal(true) }}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-[10px] text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50"
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedItem?._id === org._id && (
                        <div className="mt-6 pt-6 border-t border-warm-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-xs font-bold text-warm-gray-400 uppercase tracking-wider mb-3">Address</h4>
                            <p className="text-sm text-warm-gray-700 leading-relaxed">
                              {org.address?.street}<br />
                              {org.address?.city}, {org.address?.state} — {org.address?.pincode}<br />
                              {org.address?.country}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-warm-gray-400 uppercase tracking-wider mb-3">Contact Person</h4>
                            <p className="text-sm text-warm-gray-700 leading-relaxed">
                              {org.contactPerson?.name}<br />
                              {org.contactPerson?.designation && <>{org.contactPerson.designation}<br /></>}
                              {org.contactPerson?.email}<br />
                              {org.contactPerson?.phone}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-warm-gray-400 uppercase tracking-wider mb-3">Academic Profile</h4>
                            <div className="text-sm text-warm-gray-700 space-y-1">
                              <p>NAAC: <strong>{org.naacAccreditation}</strong></p>
                              <p>UGC Recognition: <strong>{org.ugcRecognition ? 'Yes' : 'No'}</strong></p>
                              <p>Faculty: <strong>{org.totalFaculty}</strong> | PhD Scholars: <strong>{org.totalPhDScholars}</strong></p>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-warm-gray-400 uppercase tracking-wider mb-3">Interests</h4>
                            {org.focusAreas?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {org.focusAreas.map(a => <span key={a} className="px-2 py-0.5 rounded-full bg-primary-50 text-primary text-xs font-medium">{a}</span>)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            /* Funding Agencies Table/Cards */
            agencies.length === 0 ? (
              <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-12 text-center">
                <p className="text-warm-gray-500 text-lg">No funding agencies found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {agencies.map(agency => {
                  const sc = STATUS_COLORS[agency.status]
                  return (
                    <div key={agency._id} className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 transition-all duration-200 hover:shadow-medium">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-heading text-lg font-bold text-warm-gray-900">{agency.agencyName}</h3>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${sc.bg} ${sc.border} border`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              <span className={`text-xs font-semibold capitalize ${sc.text}`}>{agency.status}</span>
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-warm-gray-500">
                            <span className="capitalize">🏛️ Type: {agency.agencyType?.replace('_', ' ')}</span>
                            {agency.cin && <span>📜 CIN: {agency.cin}</span>}
                            {agency.darpanId && <span>📜 Darpan ID: {agency.darpanId}</span>}
                            <span>📧 {agency.contactPerson?.email}</span>
                            <span>📅 {formatDate(agency.submittedAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedItem(selectedItem?._id === agency._id ? null : agency)}
                            className="px-4 py-2 rounded-[10px] text-sm font-semibold text-warm-gray-600 border border-warm-gray-200 hover:bg-cream transition-all cursor-pointer"
                          >
                            {selectedItem?._id === agency._id ? 'Close' : 'Details'}
                          </button>
                          {agency.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(agency._id)}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-[10px] text-sm font-semibold text-white bg-amber hover:bg-amber-light transition-all cursor-pointer disabled:opacity-50"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => { setSelectedItem(agency); setShowRejectModal(true) }}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-[10px] text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50"
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expanded Agency Details */}
                      {selectedItem?._id === agency._id && (
                        <div className="mt-6 pt-6 border-t border-warm-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-xs font-bold text-warm-gray-400 uppercase tracking-wider mb-3">Legal Identifiers</h4>
                            <div className="text-sm text-warm-gray-700 space-y-1">
                              <p>CIN: <strong>{agency.cin || 'N/A'}</strong></p>
                              <p>Darpan ID: <strong>{agency.darpanId || 'N/A'}</strong></p>
                              <p>CSR-1 Reg: <strong>{agency.csrRegistrationNumber || 'N/A'}</strong></p>
                              {agency.website && <p>Website: <a href={agency.website} target="_blank" rel="noreferrer" className="text-amber font-medium underline">{agency.website}</a></p>}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-1">🔒 Confidential Officer Contact</h4>
                            <p className="text-sm text-warm-gray-700 leading-relaxed bg-red-50/50 p-3 rounded-[10px] border border-red-100">
                              Officer Name: <strong>{agency.contactPerson?.name}</strong><br />
                              Designation: <strong>{agency.contactPerson?.designation || 'N/A'}</strong><br />
                              Email: <strong>{agency.contactPerson?.email}</strong><br />
                              Phone: <strong>{agency.contactPerson?.phone}</strong>
                            </p>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-warm-gray-400 uppercase tracking-wider mb-3">Headquarters Location</h4>
                            <p className="text-sm text-warm-gray-700 leading-relaxed">
                              {agency.headquarters?.street}<br />
                              {agency.headquarters?.city}, {agency.headquarters?.state} — {agency.headquarters?.pincode}<br />
                              {agency.headquarters?.country}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-warm-gray-400 uppercase tracking-wider mb-3">Funding Profile</h4>
                            {agency.grantTypesOffered?.length > 0 && (
                              <div>
                                <span className="text-xs text-warm-gray-500 block mb-1">Grant Types:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {agency.grantTypesOffered.map(g => <span key={g} className="px-2 py-0.5 rounded-full bg-primary-50 text-primary text-xs font-medium capitalize">{g.replace('_', ' ')}</span>)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )
        )}
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-warm-gray-900/40 backdrop-blur-sm" onClick={() => { setShowRejectModal(false); setRejectReason('') }} />
          <div className="relative bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-medium p-8 w-full max-w-md">
            <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-2">
              Reject {activeEntityTab === 'organizations' ? 'Organization' : 'Funding Agency'}
            </h2>
            <p className="text-sm text-warm-gray-500 mb-6">
              Rejecting <strong className="text-warm-gray-700">{selectedItem?.organizationName || selectedItem?.agencyName}</strong>. Please provide a clear reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain why this application cannot be approved..."
              rows={4}
              className="w-full px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all duration-200 resize-none mb-6"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-warm-gray-600 border border-warm-gray-200 hover:bg-cream transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}