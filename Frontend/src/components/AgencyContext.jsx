import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const AgencyContext = createContext(null)

export function AgencyProvider({ children }) {
  const navigate = useNavigate()

  const [agency, setAgency] = useState(null) // { agencyName, status, cin, darpanId, isLegallyVerified, ... }
  const [profile, setProfile] = useState(null) // full profile: headquarters, contactPerson, fundingDomains, etc.
  const [contactEmail, setContactEmail] = useState('')
  const [programsList, setProgramsList] = useState([])
  const [proposalsList, setProposalsList] = useState([])
  const [stats, setStats] = useState({
    activePrograms: 0,
    totalFundPool: 0,
    proposalsCount: 0,
    newThisWeek: 0,
    aiMatchAccuracy: null,
  })
  const [loading, setLoading] = useState(true)

  const fetchAgencyStatus = useCallback(async () => {
    try {
      const res = await api.get('/agency/status')
      if (res.data.success && res.data.agency) {
        setAgency(res.data.agency)
        if (res.data.agency.status === 'pending') navigate('/agency/pending')
        else if (res.data.agency.status === 'rejected') navigate('/agency/rejected')
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // No agency profile yet — fall back to auth/me for display name
        try {
          const meRes = await api.get('/auth/me')
          if (meRes.data.success && meRes.data.user) {
            setContactEmail(meRes.data.user.email || '')
          }
        } catch {
          // offline or unauthenticated
        }
      }
    }
  }, [navigate])

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await api.get('/agency/programs')
      if (res.data.success) setProgramsList(res.data.programs || [])
    } catch {
      // agency not approved yet — leave empty
    }
  }, [])

  const fetchProposals = useCallback(async () => {
    try {
      const res = await api.get('/agency/proposals')
      if (res.data.success) setProposalsList(res.data.proposals || [])
    } catch {
      // agency not approved yet — leave empty
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/agency/stats')
      if (res.data.success) setStats(res.data.stats)
    } catch {
      // ignore — cards show zeros
    }
  }, [])

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/agency/profile')
      if (res.data.success) setProfile(res.data.agency)
    } catch {
      // agency not approved yet — leave null, Profile page shows a locked state
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchAgencyStatus(), fetchPrograms(), fetchProposals(), fetchStats(), fetchProfile()])
    setLoading(false)
  }, [fetchAgencyStatus, fetchPrograms, fetchProposals, fetchStats, fetchProfile])

  useEffect(() => {
    // Load saved user for instant display, then refresh from server
    const savedUser = localStorage.getItem('grantos_user')
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        if (parsed.email) setContactEmail(parsed.email)
      } catch {
        // ignore parse error
      }
    }
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Derived: real Agency Action Checklist state ───
  const checklist = {
    accountActivated: agency?.status === 'approved',
    hasPublishedGrant: programsList.length > 0,
    isLegallyVerified: Boolean(agency?.isLegallyVerified),
  }

  const value = {
    agency,
    profile,
    contactEmail,
    programsList,
    setProgramsList,
    proposalsList,
    stats,
    loading,
    checklist,
    refreshPrograms: fetchPrograms,
    refreshProposals: fetchProposals,
    refreshStats: fetchStats,
    refreshProfile: fetchProfile,
    refreshAll,
  }

  return <AgencyContext.Provider value={value}>{children}</AgencyContext.Provider>
}

export function useAgency() {
  const ctx = useContext(AgencyContext)
  if (!ctx) throw new Error('useAgency must be used within an AgencyProvider')
  return ctx
}