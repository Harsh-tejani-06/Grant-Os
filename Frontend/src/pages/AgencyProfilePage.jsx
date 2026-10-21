import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAgency } from '../components/AgencyContext'
import api from '../api'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const AGENCY_TYPE_LABELS = {
  government_central: 'Central Government',
  government_state: 'State Government',
  private_foundation: 'Private Foundation',
  international_agency: 'International Agency',
  corporate_csr: 'Corporate CSR',
}

const GRANT_TYPE_OPTIONS = [
  { value: 'research_grant', label: 'Research Grant' },
  { value: 'fellowship', label: 'Fellowship' },
  { value: 'travel_grant', label: 'Travel Grant' },
  { value: 'startup_seed', label: 'Startup / Seed' },
  { value: 'institutional_infra', label: 'Institutional Infrastructure' },
]

const APPLICANT_TYPE_OPTIONS = [
  { value: 'universities', label: 'Universities' },
  { value: 'research_institutions', label: 'Research Institutions' },
  { value: 'ngos', label: 'NGOs' },
  { value: 'startups', label: 'Startups' },
  { value: 'government_organizations', label: 'Government Organizations' },
  { value: 'individuals', label: 'Individuals' },
  { value: 'private_companies', label: 'Private Companies' },
]

const FUNDING_SCOPE_OPTIONS = ['Local', 'State', 'National', 'International']
const FUNDING_FREQUENCY_OPTIONS = ['Annual', 'Biannual', 'Quarterly', 'Rolling']

const FOCUS_AREA_SUGGESTIONS = [
  'Clean Energy',
  'Healthcare',
  'Agri-Tech',
  'AI & Data',
  'Education',
  'Climate Action',
  'Biotechnology',
  'Social Innovation',
]

const MAX_FOCUS_AREAS = 12
const MAX_LOGO_BYTES = 3 * 1024 * 1024
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Edit Profile' },
  { id: 'funding', label: 'Funding Preferences' },
  { id: 'legal', label: 'Legal & Documents' },
  { id: 'activity', label: 'Activity' },
]

// Completion section -> label + where to fix it
const SECTION_META = {
  identity: { label: 'Agency identity', tab: null, hint: 'Set during registration' },
  about: { label: 'About the agency', tab: 'profile', hint: 'Add a description applicants can read' },
  operationalDetails: { label: 'Operational details', tab: 'profile', hint: 'Add your website and headquarters' },
  branding: { label: 'Logo & focus areas', tab: 'profile', hint: 'Upload a logo and list your focus areas' },
  fundingProfile: { label: 'Funding profile', tab: 'funding', hint: 'Choose grant types and a typical range' },
  contactPerson: { label: 'Contact person', tab: 'profile', hint: 'Add a designation or phone number' },
  legalVerification: { label: 'Legal verification', tab: 'legal', hint: 'Add a CIN or NGO Darpan ID for the trust badge' },
}

const STAGE_TONE = {
  'Under Evaluation': 'bg-blue-50 text-blue-700 border-blue-200',
  'Revisions Requested': 'bg-amber-50 text-amber border-amber/20',
  Awarded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  'Not Awarded': 'bg-red-50 text-red-700 border-red-200',
}

const CIN_RE = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/i
const DARPAN_RE = /^[A-Z]{2}\/\d{4}\/\d{5,8}$/i
const PHONE_RE = /^[+()\d\s-]{7,20}$/

const ASSET_BASE = api.defaults.baseURL?.replace(/\/api\/?$/, '') || ''
const assetUrl = (url) => (!url ? '' : /^https?:\/\//i.test(url) ? url : `${ASSET_BASE}${url}`)

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const timeAgo = (value) => {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  if (Number.isNaN(diff)) return ''
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDate(value)
}

const formatAddress = (hq) => {
  if (!hq) return '—'
  const parts = [hq.street, hq.city, hq.state, hq.pincode, hq.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '—'
}

const trimZero = (n) => String(parseFloat(n.toFixed(2)))

// 2500000 -> "₹25 Lakh", 30000000 -> "₹3 Cr"
const formatINRCompact = (value) => {
  const n = Number(value)
  if (value === '' || value === null || value === undefined || !Number.isFinite(n)) return ''
  if (n >= 1e7) return `₹${trimZero(n / 1e7)} Cr`
  if (n >= 1e5) return `₹${trimZero(n / 1e5)} Lakh`
  return `₹${n.toLocaleString('en-IN')}`
}

const isValidUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return true
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    return u.hostname.includes('.')
  } catch {
    return false
  }
}

const toHref = (value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`)

const buildForm = (p) => ({
  description: p.description || '',
  mission: p.mission || '',
  vision: p.vision || '',
  focusAreas: p.focusAreas || [],
  website: p.website || '',
  csr: p.csrRegistrationNumber || '',
  street: p.headquarters?.street || '',
  city: p.headquarters?.city || '',
  state: p.headquarters?.state || '',
  pincode: p.headquarters?.pincode || '',
  country: p.headquarters?.country || 'India',
  designation: p.contactPerson?.designation || '',
  phone: p.contactPerson?.phone || '',
  linkedin: p.socialLinks?.linkedin || '',
  twitter: p.socialLinks?.twitter || '',
  other: p.socialLinks?.other || '',
  grantTypes: p.grantTypesOffered || [],
  minAmount: p.fundingAmountMin ?? '',
  maxAmount: p.fundingAmountMax ?? '',
  durationMin: p.fundingDurationMonths?.min ?? '',
  durationMax: p.fundingDurationMonths?.max ?? '',
  frequency: p.fundingFrequency || '',
  applicantTypes: p.eligibleApplicantTypes || [],
  fundingScope: p.fundingScope || '',
  fundingStatesText: (p.fundingStates || []).join(', '),
})

const validateForm = (f) => {
  const errors = {}
  if (!isValidUrl(f.website)) errors.website = 'Enter a valid website, e.g. https://agency.org'
  if (!isValidUrl(f.linkedin)) errors.linkedin = 'Enter a valid link'
  if (!isValidUrl(f.twitter)) errors.twitter = 'Enter a valid link'
  if (!isValidUrl(f.other)) errors.other = 'Enter a valid link'
  if (!f.phone.trim()) errors.phone = 'Phone number is required'
  else if (!PHONE_RE.test(f.phone.trim())) errors.phone = 'Use digits, spaces and + - ( ) only'
  ;['street', 'city', 'state', 'pincode'].forEach((k) => {
    if (!f[k].trim()) errors[k] = 'Required'
  })
  const toNum = (v) => (v === '' ? null : Number(v))
  const [a, b, c, d] = [toNum(f.minAmount), toNum(f.maxAmount), toNum(f.durationMin), toNum(f.durationMax)]
  if ([a, b].some((v) => v !== null && (!Number.isFinite(v) || v < 0))) errors.amount = 'Amounts must be positive numbers'
  else if (a !== null && b !== null && a > b) errors.amount = 'Minimum cannot be greater than maximum'
  if ([c, d].some((v) => v !== null && (!Number.isFinite(v) || v < 0))) errors.duration = 'Duration must be a positive number'
  else if (c !== null && d !== null && c > d) errors.duration = 'Minimum cannot be greater than maximum'
  return errors
}

const buildPayload = (f) => ({
  website: f.website.trim(),
  csrRegistrationNumber: f.csr.trim(),
  description: f.description,
  mission: f.mission,
  vision: f.vision,
  focusAreas: f.focusAreas,
  socialLinks: { linkedin: f.linkedin.trim(), twitter: f.twitter.trim(), other: f.other.trim() },
  headquarters: { street: f.street, city: f.city, state: f.state, pincode: f.pincode, country: f.country },
  contactPerson: { designation: f.designation, phone: f.phone },
  grantTypesOffered: f.grantTypes,
  fundingAmountMin: f.minAmount === '' ? null : Number(f.minAmount),
  fundingAmountMax: f.maxAmount === '' ? null : Number(f.maxAmount),
  fundingDurationMonths: {
    min: f.durationMin === '' ? null : Number(f.durationMin),
    max: f.durationMax === '' ? null : Number(f.durationMax),
  },
  fundingFrequency: f.frequency,
  eligibleApplicantTypes: f.applicantTypes,
  fundingScope: f.fundingScope,
  fundingStates: f.fundingStatesText.split(',').map((s) => s.trim()).filter(Boolean),
})

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function AgencyProfilePage() {
  const { profile, checklist, refreshAll, refreshProfile } = useAgency()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab = TABS.some((t) => t.id === requestedTab) ? requestedTab : 'overview'

  const goTab = useCallback(
    (id) => {
      setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [setSearchParams]
  )

  // ─── Editable form (one state object, one save bar) ───
  const [form, setForm] = useState(null)
  const [baseline, setBaseline] = useState('')
  const baselineRef = useRef('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  // ─── Legal verification ───
  const [cin, setCin] = useState('')
  const [darpanId, setDarpanId] = useState('')
  const [verifSubmitting, setVerifSubmitting] = useState(false)
  const [verifError, setVerifError] = useState('')
  const [verifSuccess, setVerifSuccess] = useState('')

  // ─── Logo ───
  const fileInputRef = useRef(null)
  const [logoBusy, setLogoBusy] = useState(false)
  const [logoError, setLogoError] = useState('')

  // ─── Insights ───
  const [insights, setInsights] = useState(null)
  const [recentDecisions, setRecentDecisions] = useState([])
  const [history, setHistory] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [insightsError, setInsightsError] = useState(false)

  const loadInsights = useCallback(async () => {
    try {
      const res = await api.get('/agency/profile/insights')
      if (res.data.success) {
        setInsights(res.data.insights)
        setRecentDecisions(res.data.recentDecisions || [])
        setHistory(res.data.history || [])
        setInsightsError(false)
      }
    } catch {
      setInsightsError(true)
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  // Sync form from the server profile, but never clobber unsaved edits when
  // the profile is refreshed for another reason (e.g. legal verification).
  useEffect(() => {
    if (!profile) return
    const next = buildForm(profile)
    const nextJson = JSON.stringify(next)
    // Captured now: the updater below runs later, after the ref has moved on.
    const previousBaseline = baselineRef.current
    setForm((current) =>
      current === null || JSON.stringify(current) === previousBaseline ? next : current
    )
    baselineRef.current = nextJson
    setBaseline(nextJson)
    setCin(profile.cin || '')
    setDarpanId(profile.darpanId || '')
  }, [profile])

  const dirty = form !== null && JSON.stringify(form) !== baseline
  const errors = useMemo(() => (form ? validateForm(form) : {}), [form])
  const hasErrors = Object.keys(errors).length > 0

  // Warn before leaving the page with unsaved edits
  useEffect(() => {
    if (!dirty) return undefined
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const toggleInList = (key, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
    }))

  const handleDiscard = () => {
    if (!profile) return
    setForm(buildForm(profile))
    setSaveError('')
    setSaveSuccess('')
  }

  const handleSave = async () => {
    if (!form || hasErrors) return
    setSaveError('')
    setSaveSuccess('')
    setSaving(true)
    try {
      const res = await api.put('/agency/profile', buildPayload(form))
      if (res.data.success) {
        const saved = buildForm(res.data.agency)
        const savedJson = JSON.stringify(saved)
        baselineRef.current = savedJson
        setBaseline(savedJson)
        setForm(saved)
        setSaveSuccess(res.data.message || 'Profile updated successfully.')
        refreshProfile()
        loadInsights()
        setTimeout(() => setSaveSuccess(''), 4000)
      }
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveVerification = async (e) => {
    e.preventDefault()
    setVerifError('')
    setVerifSuccess('')
    if (!cin.trim() && !darpanId.trim()) {
      setVerifError('Please provide at least one of CIN or Darpan ID')
      return
    }
    setVerifSubmitting(true)
    try {
      const res = await api.put('/agency/legal-verification', {
        cin: cin.trim().toUpperCase(),
        darpanId: darpanId.trim().toUpperCase(),
      })
      if (res.data.success) {
        setVerifSuccess('Legal verification details saved.')
        refreshAll()
        setTimeout(() => setVerifSuccess(''), 4000)
      }
    } catch (err) {
      setVerifError(err.response?.data?.message || 'Failed to save verification details.')
    } finally {
      setVerifSubmitting(false)
    }
  }

  const handleLogoPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLogoError('')
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoError('Logo must be a PNG, JPG or WEBP image.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Logo must be 3 MB or smaller.')
      return
    }
    setLogoBusy(true)
    try {
      const data = new FormData()
      data.append('logo', file)
      await api.post('/agency/profile/logo', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      await refreshProfile()
      loadInsights()
    } catch (err) {
      setLogoError(err.response?.data?.message || 'Failed to upload logo.')
    } finally {
      setLogoBusy(false)
    }
  }

  const handleLogoRemove = async () => {
    setLogoError('')
    setLogoBusy(true)
    try {
      await api.delete('/agency/profile/logo')
      await refreshProfile()
      loadInsights()
    } catch (err) {
      setLogoError(err.response?.data?.message || 'Failed to remove logo.')
    } finally {
      setLogoBusy(false)
    }
  }

  if (!profile || !form) {
    return (
      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-10 text-center">
        <p className="text-sm text-warm-gray-500">Loading agency profile…</p>
      </div>
    )
  }

  const completion = profile.profileCompletion
  const logo = assetUrl(profile.logoUrl)
  const editing = tab === 'profile' || tab === 'funding'

  return (
    <div className={`space-y-6 max-w-5xl ${editing && dirty ? 'pb-24' : ''}`}>
      <ProfileHero
        profile={profile}
        logo={logo}
        completion={completion}
        logoBusy={logoBusy}
        logoError={logoError}
        onPickLogo={() => fileInputRef.current?.click()}
        onRemoveLogo={handleLogoRemove}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleLogoPick}
      />

      {/* Tabs */}
      <div className="bg-surface-elevated rounded-[14px] border border-warm-gray-200/70 p-1.5 flex gap-1 overflow-x-auto shadow-soft">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => goTab(t.id)}
            className={`px-4 py-2 rounded-[10px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              tab === t.id ? 'bg-amber text-white shadow-soft' : 'text-warm-gray-600 hover:bg-warm-gray-100'
            }`}
          >
            {t.label}
            {t.id === 'profile' && dirty && tab !== 'profile' && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-light align-middle" />}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab
          profile={profile}
          form={form}
          logo={logo}
          completion={completion}
          insights={insights}
          insightsLoading={insightsLoading}
          insightsError={insightsError}
          isLegallyVerified={checklist.isLegallyVerified}
          goTab={goTab}
        />
      )}

      {tab === 'profile' && (
        <EditProfileTab form={form} errors={errors} setField={setField} profile={profile} />
      )}

      {tab === 'funding' && (
        <FundingTab form={form} errors={errors} setField={setField} toggleInList={toggleInList} />
      )}

      {tab === 'legal' && (
        <LegalTab
          profile={profile}
          isLegallyVerified={checklist.isLegallyVerified}
          cin={cin}
          setCin={setCin}
          darpanId={darpanId}
          setDarpanId={setDarpanId}
          onSubmit={handleSaveVerification}
          submitting={verifSubmitting}
          error={verifError}
          success={verifSuccess}
        />
      )}

      {tab === 'activity' && (
        <ActivityTab
          recentDecisions={recentDecisions}
          history={history}
          loading={insightsLoading}
          error={insightsError}
          profile={profile}
        />
      )}

      {/* Sticky save bar — only on the editable tabs */}
      {editing && (dirty || saveError || saveSuccess) && (
        <div className="fixed bottom-4 inset-x-4 lg:left-72 z-50 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-3xl bg-warm-gray-900 text-white rounded-[14px] shadow-medium px-4 py-3 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              {saveError ? (
                <p className="text-xs text-red-300 font-semibold">⚠️ {saveError}</p>
              ) : saveSuccess && !dirty ? (
                <p className="text-xs text-emerald-300 font-semibold">✓ {saveSuccess}</p>
              ) : hasErrors ? (
                <p className="text-xs text-amber-50 font-semibold">Fix the highlighted fields to save.</p>
              ) : (
                <p className="text-xs font-semibold">You have unsaved changes.</p>
              )}
            </div>
            {dirty && (
              <>
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={saving}
                  className="px-3.5 py-2 rounded-[10px] text-xs font-semibold text-warm-gray-200 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-60"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || hasErrors}
                  className="px-5 py-2 rounded-[10px] bg-amber hover:bg-amber-light text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────

function ProfileHero({ profile, logo, completion, logoBusy, logoError, onPickLogo, onRemoveLogo }) {
  const approved = profile.status === 'approved'
  const location = [profile.headquarters?.city, profile.headquarters?.state].filter(Boolean).join(', ')

  return (
    <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 overflow-hidden shadow-soft">
      <div className="h-24 sm:h-28 bg-gradient-to-br from-amber via-amber-light to-amber/70 relative">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, #fff 0, transparent 40%), radial-gradient(circle at 80% 70%, #fff 0, transparent 35%)',
          }}
        />
      </div>

      <div className="px-5 sm:px-6 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 pt-0">
          {/* Logo */}
          <div className="relative shrink-0 group -mt-10 sm:-mt-12 self-start">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[18px] bg-surface-elevated border-4 border-surface-elevated shadow-medium overflow-hidden flex items-center justify-center">
              {logo ? (
                <img src={logo} alt={`${profile.agencyName} logo`} className="w-full h-full object-contain bg-white" />
              ) : (
                <span className="font-heading text-3xl font-bold text-amber">
                  {(profile.agencyName || 'A').charAt(0).toUpperCase()}
                </span>
              )}
              {logoBusy && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-semibold text-warm-gray-600">
                  …
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onPickLogo}
              disabled={logoBusy}
              title="Change logo"
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-amber text-white shadow-soft flex items-center justify-center hover:bg-amber-light transition-colors cursor-pointer disabled:opacity-60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>

          {/* Name block */}
          <div className="flex-1 min-w-0 sm:pt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading text-2xl font-bold text-warm-gray-900 truncate">{profile.agencyName}</h2>
              {profile.shortName && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warm-gray-100 text-warm-gray-600">
                  {profile.shortName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1.5 text-xs text-warm-gray-500">
              <span className="font-semibold text-warm-gray-700">{AGENCY_TYPE_LABELS[profile.agencyType] || profile.agencyType}</span>
              {location && <span>📍 {location}</span>}
              {profile.establishedYear && <span>Est. {profile.establishedYear}</span>}
              {profile.website && (
                <a href={toHref(profile.website)} target="_blank" rel="noopener noreferrer" className="font-semibold text-amber hover:underline">
                  {profile.website.replace(/^https?:\/\//i, '')} ↗
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2.5">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                approved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber border-amber/20'
              }`}>
                {approved ? '✓ Active partner' : profile.status}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                profile.isLegallyVerified
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-warm-gray-100 text-warm-gray-500 border-warm-gray-200'
              }`}>
                {profile.isLegallyVerified ? '🛡 Verified agency' : 'Not yet verified'}
              </span>
              {profile.logoUrl && (
                <button
                  type="button"
                  onClick={onRemoveLogo}
                  disabled={logoBusy}
                  className="text-xs font-semibold text-warm-gray-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-60"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>

          {/* Completion ring */}
          {completion && (
            <div className="shrink-0 flex items-center gap-3 sm:pt-4">
              <CompletionRing percent={completion.percent} />
              <div className="hidden sm:block">
                <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">Profile strength</p>
                <p className="text-xs text-warm-gray-500 mt-0.5">
                  {completion.percent === 100 ? 'Complete' : 'Keep going'}
                </p>
              </div>
            </div>
          )}
        </div>

        {logoError && (
          <div className="mt-3"><Banner type="error">{logoError}</Banner></div>
        )}
        <p className="text-xs text-warm-gray-400 mt-3">
          Logo: PNG, JPG or WEBP, up to 3 MB. Last updated {formatDateTime(profile.updatedAt)}.
        </p>
      </div>
    </div>
  )
}

function CompletionRing({ percent }) {
  const size = 64
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-warm-gray-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-amber transition-all duration-700"
          strokeDasharray={c}
          strokeDashoffset={c - (c * percent) / 100}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-warm-gray-900">
        {percent}%
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────

function OverviewTab({ profile, form, logo, completion, insights, insightsLoading, insightsError, isLegallyVerified, goTab }) {
  const pending = completion
    ? Object.entries(completion.sections).filter(([, done]) => !done)
    : []

  return (
    <div className="space-y-6">
      {/* Live stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          loading={insightsLoading}
          label="Grant calls"
          value={insights ? insights.totalGrantCalls : null}
          sub={insights ? `${insights.activeGrantCalls} active · ${insights.draftGrantCalls} draft` : ''}
        />
        <StatTile
          loading={insightsLoading}
          label="Proposals received"
          value={insights ? insights.proposalsReceived : null}
          sub={insights ? `${insights.awaitingReview} awaiting review · ${insights.underEvaluation} in evaluation` : ''}
        />
        <StatTile
          loading={insightsLoading}
          label="Grants awarded"
          value={insights ? insights.awardedCount : null}
          sub={insights ? (insights.totalAwarded > 0 ? `${formatINRCompact(insights.totalAwarded)} sanctioned` : 'No awards yet') : ''}
        />
        <StatTile
          loading={insightsLoading}
          label="Avg. decision time"
          value={insights ? (insights.avgDecisionDays !== null ? `${insights.avgDecisionDays}d` : '—') : null}
          sub={insights ? (insights.awardRate !== null ? `${insights.awardRate}% award rate` : 'No decisions yet') : ''}
        />
      </div>
      {insightsError && (
        <Banner type="error">Live statistics couldn't be loaded. The rest of your profile is unaffected.</Banner>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Applicant-facing preview */}
        <div className="lg:col-span-3 space-y-3">
          <SectionHeading
            title="How applicants see you"
            subtitle="Everything applicants can see: about, mission, vision, location, contact and online links. Updates live as you edit."
          />
          <PreviewCard profile={profile} form={form} logo={logo} isLegallyVerified={isLegallyVerified} />
        </div>

        {/* Completion checklist */}
        <div className="lg:col-span-2 space-y-3">
          <SectionHeading title="Profile checklist" subtitle="Complete profiles earn more applicant trust." />
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-4 shadow-soft space-y-2">
            {completion &&
              Object.entries(completion.sections).map(([key, done]) => {
                const meta = SECTION_META[key] || { label: key, tab: null, hint: '' }
                const clickable = !done && meta.tab
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && goTab(meta.tab)}
                    className={`w-full text-left flex items-start gap-3 p-2.5 rounded-[10px] transition-colors ${
                      clickable ? 'hover:bg-warm-gray-50 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                      done ? 'bg-emerald-100 text-emerald-700' : 'bg-warm-gray-100 text-warm-gray-400'
                    }`}>
                      {done ? '✓' : '○'}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${done ? 'text-warm-gray-500' : 'text-warm-gray-900'}`}>
                        {meta.label}
                      </span>
                      {!done && <span className="block text-xs text-warm-gray-500 mt-0.5">{meta.hint} →</span>}
                    </span>
                  </button>
                )
              })}
            {completion && pending.length === 0 && (
              <p className="text-xs text-emerald-700 font-semibold px-2.5 pt-1">Everything is filled in. Nice work.</p>
            )}
          </div>
        </div>
      </div>

      {/* Locked identity */}
      <section className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-heading text-lg font-bold text-warm-gray-900">Agency Identity</h3>
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-warm-gray-400 bg-warm-gray-100">🔒 Locked</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <LockedField label="Agency Name" value={profile.agencyName} />
          <LockedField label="Short Name" value={profile.shortName} />
          <LockedField label="Agency Type" value={AGENCY_TYPE_LABELS[profile.agencyType] || profile.agencyType} />
          <LockedField label="Organization Type" value={profile.organizationType} />
          <LockedField label="Ownership Type" value={profile.ownershipType} />
          <LockedField label="Registration Number" value={profile.registrationNumber} />
          <LockedField label="Founded" value={profile.establishedYear} />
          <LockedField label="Registered On" value={formatDate(profile.submittedAt)} />
          <LockedField label="Approved On" value={formatDate(profile.reviewedAt)} />
        </div>
        <div className="mt-4">
          <LockedField label="Registered Address" value={formatAddress(profile.headquarters)} compact />
        </div>
        <p className="text-xs text-warm-gray-400 mt-4">
          Need to correct one of these? Contact the GrantIQ admin team — identity fields require manual re-verification.
        </p>
      </section>
    </div>
  )
}

function PreviewCard({ profile, form, logo, isLegallyVerified }) {
  const location = [form.city, form.state].filter(Boolean).join(', ')
  const fullAddress = [form.street, form.city, form.state, form.pincode, form.country].filter(Boolean).join(', ')
  const min = formatINRCompact(form.minAmount)
  const max = formatINRCompact(form.maxAmount)
  const range = min && max ? `${min} – ${max}` : min ? `From ${min}` : max ? `Up to ${max}` : ''
  const grantLabels = GRANT_TYPE_OPTIONS.filter((o) => form.grantTypes.includes(o.value)).map((o) => o.label)
  const applicantLabels = APPLICANT_TYPE_OPTIONS.filter((o) => form.applicantTypes.includes(o.value)).map((o) => o.label)
  const regions = form.fundingStatesText.split(',').map((s) => s.trim()).filter(Boolean)
  const links = [
    { label: 'Website', value: form.website },
    { label: 'LinkedIn', value: form.linkedin },
    { label: 'X / Twitter', value: form.twitter },
    { label: 'Other', value: form.other },
  ].filter((l) => l.value.trim())
  const hasDuration = form.durationMin !== '' || form.durationMax !== ''

  return (
    <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-5 shadow-soft space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3.5">
        <div className="w-14 h-14 rounded-[14px] border border-warm-gray-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
          {logo ? (
            <img src={logo} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="font-heading text-xl font-bold text-amber">{(profile.agencyName || 'A').charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-heading text-base font-bold text-warm-gray-900">{profile.agencyName}</h4>
            {profile.shortName && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warm-gray-100 text-warm-gray-600">{profile.shortName}</span>
            )}
            {isLegallyVerified && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">🛡 Verified</span>
            )}
          </div>
          <p className="text-xs text-warm-gray-500 mt-0.5">
            {AGENCY_TYPE_LABELS[profile.agencyType] || profile.agencyType}
            {location && ` · ${location}`}
            {profile.establishedYear && ` · Est. ${profile.establishedYear}`}
          </p>
        </div>
      </div>

      {/* About */}
      <PreviewBlock title="About">
        <PreviewText value={form.description} empty="Add a description so applicants know what you fund and why." />
      </PreviewBlock>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <PreviewBlock title="Mission">
          <PreviewText value={form.mission} empty="No mission added yet." />
        </PreviewBlock>
        <PreviewBlock title="Vision">
          <PreviewText value={form.vision} empty="No vision added yet." />
        </PreviewBlock>
      </div>

      {/* Focus areas */}
      {form.focusAreas.length > 0 && (
        <PreviewBlock title="Focus areas">
          <div className="flex flex-wrap gap-1.5">
            {form.focusAreas.map((a) => (
              <span key={a} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber border border-amber/15">{a}</span>
            ))}
          </div>
        </PreviewBlock>
      )}

      {/* Funding facts */}
      <PreviewBlock title="Funding">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <PreviewFact label="Typical grant" value={range || '—'} />
          <PreviewFact
            label="Duration"
            value={hasDuration ? `${form.durationMin !== '' ? form.durationMin : '?'}–${form.durationMax !== '' ? form.durationMax : '?'} months` : '—'}
          />
          <PreviewFact label="Frequency" value={form.frequency || '—'} />
          <PreviewFact label="Scope" value={form.fundingScope || '—'} />
        </div>
        {grantLabels.length > 0 && (
          <p className="text-xs text-warm-gray-600 mt-3">
            <span className="font-semibold text-warm-gray-800">Offers:</span> {grantLabels.join(' · ')}
          </p>
        )}
        {applicantLabels.length > 0 && (
          <p className="text-xs text-warm-gray-600 mt-1.5">
            <span className="font-semibold text-warm-gray-800">Open to:</span> {applicantLabels.join(' · ')}
          </p>
        )}
        {regions.length > 0 && (form.fundingScope === 'State' || form.fundingScope === 'National') && (
          <p className="text-xs text-warm-gray-600 mt-1.5">
            <span className="font-semibold text-warm-gray-800">Regions:</span> {regions.join(', ')}
          </p>
        )}
      </PreviewBlock>

      {/* Contact + location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5 border-t border-warm-gray-100">
        <PreviewBlock title="Contact">
          <p className="text-sm font-semibold text-warm-gray-800">{profile.contactPerson?.name || '—'}</p>
          {form.designation && <p className="text-xs text-warm-gray-500">{form.designation}</p>}
          <p className="text-xs text-warm-gray-700 mt-1.5 break-all">✉ {profile.contactPerson?.email || '—'}</p>
          <p className="text-xs text-warm-gray-700 mt-0.5">☎ {form.phone || '—'}</p>
        </PreviewBlock>
        <PreviewBlock title="Headquarters">
          <p className="text-xs text-warm-gray-700 leading-relaxed">{fullAddress || '—'}</p>
        </PreviewBlock>
      </div>

      {/* Online presence */}
      <PreviewBlock title="Online presence">
        {links.length === 0 ? (
          <p className="text-xs text-warm-gray-400 italic">No website or social links added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <span key={l.label} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cream border border-warm-gray-200 text-warm-gray-700">
                {l.label}: <span className="text-amber">{l.value.replace(/^https?:\/\//i, '')}</span>
              </span>
            ))}
          </div>
        )}
      </PreviewBlock>
    </div>
  )
}

function PreviewBlock({ title, children }) {
  return (
    <div>
      <span className="block text-xs font-bold uppercase tracking-wider text-warm-gray-400 mb-1.5">{title}</span>
      {children}
    </div>
  )
}

function PreviewText({ value, empty }) {
  return (
    <p className={`text-sm leading-relaxed whitespace-pre-line ${value ? 'text-warm-gray-700' : 'text-warm-gray-400 italic'}`}>
      {value || empty}
    </p>
  )
}

function PreviewFact({ label, value }) {
  return (
    <div>
      <span className="block text-xs font-bold uppercase tracking-wider text-warm-gray-400">{label}</span>
      <span className="block text-sm font-semibold text-warm-gray-800 mt-0.5">{value}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Edit Profile tab
// ─────────────────────────────────────────────────────────────

function EditProfileTab({ form, errors, setField, profile }) {
  const [focusInput, setFocusInput] = useState('')

  const addFocusArea = (raw) => {
    const value = raw.trim().replace(/,$/, '').trim()
    if (!value) return
    if (form.focusAreas.some((a) => a.toLowerCase() === value.toLowerCase())) return
    if (form.focusAreas.length >= MAX_FOCUS_AREAS) return
    setField('focusAreas', [...form.focusAreas, value.slice(0, 40)])
    setFocusInput('')
  }

  const removeFocusArea = (area) =>
    setField('focusAreas', form.focusAreas.filter((a) => a !== area))

  const remainingSuggestions = FOCUS_AREA_SUGGESTIONS.filter(
    (s) => !form.focusAreas.some((a) => a.toLowerCase() === s.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <Section title="About the Agency" badge="Editable" badgeTone="editable">
        <div className="space-y-5">
          <Field label="Description" counter={`${form.description.length}/1000`}>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value.slice(0, 1000))}
              placeholder="Tell applicants about your organization, its funding objectives, and areas of focus."
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="Mission" counter={`${form.mission.length}/1000`}>
            <textarea
              value={form.mission}
              onChange={(e) => setField('mission', e.target.value.slice(0, 1000))}
              placeholder="e.g. To accelerate innovative research through accessible, impact-driven funding."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="Vision" counter={`${form.vision.length}/1000`}>
            <textarea
              value={form.vision}
              onChange={(e) => setField('vision', e.target.value.slice(0, 1000))}
              placeholder="e.g. A stronger innovation ecosystem where great ideas become real-world solutions."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-2">
              Focus Areas{' '}
              <span className="text-warm-gray-400 normal-case font-medium">
                ({form.focusAreas.length}/{MAX_FOCUS_AREAS} — press Enter to add)
              </span>
            </p>
            <div className="flex flex-wrap gap-2 mb-2.5">
              {form.focusAreas.map((area) => (
                <span key={area} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold bg-amber text-white">
                  {area}
                  <button
                    type="button"
                    onClick={() => removeFocusArea(area)}
                    className="w-4 h-4 rounded-full hover:bg-white/25 flex items-center justify-center cursor-pointer leading-none"
                    aria-label={`Remove ${area}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {form.focusAreas.length === 0 && (
                <span className="text-xs text-warm-gray-400 italic">No focus areas yet.</span>
              )}
            </div>
            <input
              type="text"
              value={focusInput}
              disabled={form.focusAreas.length >= MAX_FOCUS_AREAS}
              onChange={(e) => setFocusInput(e.target.value.slice(0, 40))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addFocusArea(focusInput)
                } else if (e.key === 'Backspace' && !focusInput && form.focusAreas.length > 0) {
                  removeFocusArea(form.focusAreas[form.focusAreas.length - 1])
                }
              }}
              onBlur={() => addFocusArea(focusInput)}
              placeholder="e.g. Clean Energy"
              className={inputCls}
            />
            {remainingSuggestions.length > 0 && form.focusAreas.length < MAX_FOCUS_AREAS && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {remainingSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addFocusArea(s)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold border border-dashed border-warm-gray-300 text-warm-gray-500 hover:border-amber hover:text-amber transition-colors cursor-pointer"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section title="Operational Details" badge="Editable" badgeTone="editable">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Website" error={errors.website}>
              <input type="text" value={form.website} onChange={(e) => setField('website', e.target.value)} placeholder="https://your-agency.example" className={inputClsFor(errors.website)} />
            </Field>
            <Field label="CSR Registration Number">
              <input type="text" value={form.csr} onChange={(e) => setField('csr', e.target.value)} placeholder="CSR00012345" className={inputCls} />
            </Field>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-2">Headquarters</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Street" error={errors.street}><input type="text" value={form.street} onChange={(e) => setField('street', e.target.value)} className={inputClsFor(errors.street)} /></Field>
              <Field label="City" error={errors.city}><input type="text" value={form.city} onChange={(e) => setField('city', e.target.value)} className={inputClsFor(errors.city)} /></Field>
              <Field label="State" error={errors.state}><input type="text" value={form.state} onChange={(e) => setField('state', e.target.value)} className={inputClsFor(errors.state)} /></Field>
              <Field label="Pincode" error={errors.pincode}><input type="text" value={form.pincode} onChange={(e) => setField('pincode', e.target.value)} className={inputClsFor(errors.pincode)} /></Field>
              <Field label="Country"><input type="text" value={form.country} onChange={(e) => setField('country', e.target.value)} className={inputCls} /></Field>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Contact Person" badge="Partially Editable" badgeTone="editable">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LockedField label="Name" value={profile.contactPerson?.name} compact />
          <LockedField label="Official Email" value={profile.contactPerson?.email} compact />
          <Field label="Designation"><input type="text" value={form.designation} onChange={(e) => setField('designation', e.target.value)} placeholder="e.g. Programme Director" className={inputCls} /></Field>
          <Field label="Phone" error={errors.phone}><input type="text" value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={inputClsFor(errors.phone)} /></Field>
        </div>
        <p className="text-xs text-warm-gray-400 mt-3">
          Name and email are tied to your registered account and can't be changed here.
        </p>
      </Section>

      <Section title="Online Presence" badge="Editable" badgeTone="editable">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="LinkedIn" error={errors.linkedin}><input type="text" value={form.linkedin} onChange={(e) => setField('linkedin', e.target.value)} placeholder="linkedin.com/company/…" className={inputClsFor(errors.linkedin)} /></Field>
          <Field label="X / Twitter" error={errors.twitter}><input type="text" value={form.twitter} onChange={(e) => setField('twitter', e.target.value)} placeholder="x.com/…" className={inputClsFor(errors.twitter)} /></Field>
          <Field label="Other link" error={errors.other}><input type="text" value={form.other} onChange={(e) => setField('other', e.target.value)} placeholder="Annual report, newsroom…" className={inputClsFor(errors.other)} /></Field>
        </div>
      </Section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Funding preferences tab
// ─────────────────────────────────────────────────────────────

function FundingTab({ form, errors, setField, toggleInList }) {
  return (
    <div className="space-y-6">
      <Section title="What you fund" badge="Editable" badgeTone="editable">
        <div className="space-y-6">
          <ChipGroup
            label="Grant Types Offered"
            hint="tap to add or remove"
            options={GRANT_TYPE_OPTIONS}
            selected={form.grantTypes}
            onToggle={(v) => toggleInList('grantTypes', v)}
          />
          <ChipGroup
            label="Eligible Applicant Types"
            hint="tap to add or remove"
            options={APPLICANT_TYPE_OPTIONS}
            selected={form.applicantTypes}
            onToggle={(v) => toggleInList('applicantTypes', v)}
          />
        </div>
      </Section>

      <Section title="Amounts & duration" badge="Editable" badgeTone="editable">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-2">Grant Amount Range (₹)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Minimum" helper={formatINRCompact(form.minAmount)}>
                <input type="number" min="0" value={form.minAmount} onChange={(e) => setField('minAmount', e.target.value)} placeholder="500000" className={inputClsFor(errors.amount)} />
              </Field>
              <Field label="Maximum" helper={formatINRCompact(form.maxAmount)}>
                <input type="number" min="0" value={form.maxAmount} onChange={(e) => setField('maxAmount', e.target.value)} placeholder="20000000" className={inputClsFor(errors.amount)} />
              </Field>
            </div>
            {errors.amount && <p className="text-xs text-red-600 font-semibold mt-2">{errors.amount}</p>}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-2">Typical Funding Duration (months)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Minimum"><input type="number" min="0" value={form.durationMin} onChange={(e) => setField('durationMin', e.target.value)} placeholder="12" className={inputClsFor(errors.duration)} /></Field>
              <Field label="Maximum"><input type="number" min="0" value={form.durationMax} onChange={(e) => setField('durationMax', e.target.value)} placeholder="36" className={inputClsFor(errors.duration)} /></Field>
            </div>
            {errors.duration && <p className="text-xs text-red-600 font-semibold mt-2">{errors.duration}</p>}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-2">Funding Frequency</p>
            <div className="flex flex-wrap gap-2">
              {FUNDING_FREQUENCY_OPTIONS.map((f) => (
                <Chip key={f} active={form.frequency === f} onClick={() => setField('frequency', form.frequency === f ? '' : f)}>{f}</Chip>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Geographic reach" badge="Editable" badgeTone="editable">
        <div className="flex flex-wrap gap-2 mb-3">
          {FUNDING_SCOPE_OPTIONS.map((s) => (
            <Chip key={s} active={form.fundingScope === s} onClick={() => setField('fundingScope', form.fundingScope === s ? '' : s)}>{s}</Chip>
          ))}
        </div>
        {(form.fundingScope === 'State' || form.fundingScope === 'National') ? (
          <Field label="States / Regions Covered (comma-separated)">
            <input
              type="text"
              value={form.fundingStatesText}
              onChange={(e) => setField('fundingStatesText', e.target.value)}
              placeholder="Gujarat, Maharashtra, Delhi, Karnataka"
              className={inputCls}
            />
          </Field>
        ) : (
          <p className="text-xs text-warm-gray-400">
            Pick State or National to list the regions you fund. Local and International scopes don't need a region list.
          </p>
        )}
      </Section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Legal & documents tab
// ─────────────────────────────────────────────────────────────

function LegalTab({ profile, isLegallyVerified, cin, setCin, darpanId, setDarpanId, onSubmit, submitting, error, success }) {
  const cinOdd = cin.trim() && !CIN_RE.test(cin.trim())
  const darpanOdd = darpanId.trim() && !DARPAN_RE.test(darpanId.trim())

  return (
    <div className="space-y-6">
      <Section
        title="Legal Verification"
        badge={isLegallyVerified ? 'Verified' : 'Not Verified'}
        badgeTone={isLegallyVerified ? 'verified' : 'neutral'}
      >
        <div className={`flex items-start gap-3 p-3.5 rounded-[12px] border mb-5 ${
          isLegallyVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber/15'
        }`}>
          <span className="text-lg leading-none mt-0.5">{isLegallyVerified ? '🛡' : '🔎'}</span>
          <p className="text-xs leading-relaxed text-warm-gray-700">
            {isLegallyVerified
              ? 'Your agency shows a trust badge to applicant institutions. You can update the identifiers below at any time.'
              : 'Verified agencies receive a trust badge shown to applicant institutions on every grant call. Add at least one identifier below.'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Corporate Identification Number (CIN)">
              <input type="text" value={cin} onChange={(e) => setCin(e.target.value)} placeholder="e.g. U72900MH2015PTC123456" className={inputCls} />
              {cinOdd && <p className="text-xs text-amber font-semibold mt-1.5">A CIN is 21 characters, like U72900MH2015PTC123456 — double-check this one.</p>}
            </Field>
            <Field label="NGO Darpan ID">
              <input type="text" value={darpanId} onChange={(e) => setDarpanId(e.target.value)} placeholder="e.g. MH/2015/0123456" className={inputCls} />
              {darpanOdd && <p className="text-xs text-amber font-semibold mt-1.5">Darpan IDs look like MH/2015/0123456 — double-check this one.</p>}
            </Field>
          </div>
          <p className="text-xs text-warm-gray-400 leading-relaxed">
            Provide at least one identifier. Format hints are only a nudge — you can still save an unusual ID.
          </p>
          {error && <Banner type="error">{error}</Banner>}
          {success && <Banner type="success">{success}</Banner>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-xs font-semibold shadow-soft transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Save Verification Details'}
            </button>
          </div>
        </form>
      </Section>

      <Section title="Registered Documents" badge="Read-only" badgeTone="neutral">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DocumentRow label="Authorization Letter" url={profile.authorizationLetterUrl} />
          <DocumentRow label="Registration Certificate" url={profile.registrationCertificateUrl} />
        </div>
        <p className="text-xs text-warm-gray-400 mt-4">
          These were submitted during registration. Document uploads and replacements are handled by the GrantIQ admin team during verification review.
        </p>
      </Section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Activity tab
// ─────────────────────────────────────────────────────────────

function ActivityTab({ recentDecisions, history, loading, error, profile }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
        <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-1">Recent decisions</h3>
        <p className="text-xs text-warm-gray-500 mb-4">The latest updates you recorded on proposals.</p>
        {loading ? (
          <p className="text-xs text-warm-gray-400">Loading…</p>
        ) : error ? (
          <Banner type="error">Activity couldn't be loaded right now.</Banner>
        ) : recentDecisions.length === 0 ? (
          <EmptyNote>No decisions recorded yet. They'll appear here as you review proposals.</EmptyNote>
        ) : (
          <ul className="space-y-3">
            {recentDecisions.map((d, i) => (
              <li key={`${d.proposalId}-${i}`} className="p-3 rounded-[12px] bg-cream border border-warm-gray-200/70">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-warm-gray-900 min-w-0 truncate">{d.proposalTitle}</p>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${STAGE_TONE[d.stage] || 'bg-warm-gray-100 text-warm-gray-600 border-warm-gray-200'}`}>
                    {d.stage}
                  </span>
                </div>
                {d.organizationName && <p className="text-xs text-warm-gray-500 mt-0.5">{d.organizationName}</p>}
                {d.notes && <p className="text-xs text-warm-gray-600 mt-1.5 leading-relaxed">{d.notes}</p>}
                <p className="text-xs text-warm-gray-400 mt-1.5">{timeAgo(d.timestamp)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
        <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-1">Profile change log</h3>
        <p className="text-xs text-warm-gray-500 mb-4">Your last 15 profile edits.</p>
        {loading ? (
          <p className="text-xs text-warm-gray-400">Loading…</p>
        ) : history.length === 0 ? (
          <EmptyNote>No edits yet. Changes you save will be listed here.</EmptyNote>
        ) : (
          <ol className="relative border-l-2 border-warm-gray-100 ml-2 space-y-4">
            {history.map((h, i) => (
              <li key={`${h.changedAt}-${i}`} className="pl-4 relative">
                <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-amber border-2 border-surface-elevated" />
                <p className="text-sm font-semibold text-warm-gray-800">{h.fields.join(', ') || 'Profile updated'}</p>
                <p className="text-xs text-warm-gray-400 mt-0.5">{formatDateTime(h.changedAt)}</p>
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs text-warm-gray-400 mt-5 pt-4 border-t border-warm-gray-100">
          Registered {formatDate(profile.submittedAt)}
          {profile.reviewedAt ? ` · Approved ${formatDate(profile.reviewedAt)}` : ''}
        </p>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Shared building blocks
// ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm disabled:opacity-60'

const inputClsFor = (error) =>
  error
    ? 'w-full px-4 py-2.5 rounded-[10px] bg-red-50/40 border border-red-300 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 text-sm'
    : inputCls

function SectionHeading({ title, subtitle }) {
  return (
    <div>
      <h3 className="font-heading text-lg font-bold text-warm-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-warm-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function StatTile({ label, value, sub, loading }) {
  return (
    <div className="bg-surface-elevated rounded-[14px] border border-warm-gray-200/70 p-4 shadow-soft">
      <span className="block text-xs font-bold uppercase tracking-wider text-warm-gray-400">{label}</span>
      {loading ? (
        <div className="h-8 w-16 rounded-md bg-warm-gray-100 animate-pulse mt-2" />
      ) : (
        <span className="block font-heading text-3xl font-bold text-warm-gray-900 mt-1">{value ?? '—'}</span>
      )}
      <span className="block text-xs text-warm-gray-500 mt-1 min-h-[16px]">{loading ? '' : sub}</span>
    </div>
  )
}

function Section({ title, badge, badgeTone, children }) {
  const toneCls = {
    neutral: 'text-warm-gray-400 bg-warm-gray-100',
    editable: 'text-emerald-600 bg-emerald-50',
    verified: 'text-emerald-600 bg-emerald-50',
  }[badgeTone || 'neutral']

  return (
    <section className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-heading text-lg font-bold text-warm-gray-900">{title}</h3>
        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${toneCls}`}>
          {badge}
        </span>
      </div>
      {children}
    </section>
  )
}

function Field({ label, children, error, helper, counter }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700">{label}</label>
        {counter && <span className="text-xs text-warm-gray-400">{counter}</span>}
        {!counter && helper && <span className="text-xs font-semibold text-amber">{helper}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-600 font-semibold mt-1.5">{error}</p>}
    </div>
  )
}

function LockedField({ label, value, compact }) {
  return (
    <div>
      <span className="block text-xs font-bold uppercase tracking-wider text-warm-gray-400 mb-1">{label}</span>
      <p className={`font-semibold text-warm-gray-800 ${compact ? 'text-sm' : 'text-base'}`}>{value || '—'}</p>
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
        active
          ? 'bg-amber text-white border-amber'
          : 'bg-cream text-warm-gray-600 border-warm-gray-200 hover:border-amber/40'
      }`}
    >
      {active ? '✓ ' : '+ '}{children}
    </button>
  )
}

function ChipGroup({ label, hint, options, selected, onToggle }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-2">
        {label} <span className="text-warm-gray-400 normal-case font-medium">({hint})</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Chip key={opt.value} active={selected.includes(opt.value)} onClick={() => onToggle(opt.value)}>
            {opt.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function Banner({ type, children }) {
  const isError = type === 'error'
  return (
    <div
      className={`p-3 rounded-[10px] border text-xs leading-relaxed ${
        isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
      }`}
    >
      {isError ? '⚠️ ' : '✓ '}{children}
    </div>
  )
}

function EmptyNote({ children }) {
  return (
    <div className="p-4 rounded-[12px] bg-cream border border-dashed border-warm-gray-200 text-xs text-warm-gray-500 leading-relaxed">
      {children}
    </div>
  )
}

function DocumentRow({ label, url }) {
  const href = assetUrl(url)
  return (
    <div className="p-3.5 rounded-[10px] bg-cream border border-warm-gray-200 flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-warm-gray-700">{label}</span>
      {href
        ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-amber hover:underline">View →</a>
        : <span className="text-xs text-warm-gray-400">Not submitted</span>}
    </div>
  )
}