import { useState, useEffect, useMemo, useRef } from 'react'
import api from '../api'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Science & Technology',
  'Healthcare & Medicine',
  'Environmental Sciences',
  'Social Sciences',
  'Agriculture & Rural',
  'Technology & Computing',
  'Medical Science',
  'Agriculture',
]

const FUNDING_TYPES = [
  'Project Grant',
  'Research & Commercialization',
  'Institutional Fellowship',
  'Pre-Seed Grant',
]

const APPLICANT_TYPE_OPTIONS = [
  { value: 'university', label: 'University' },
  { value: 'college', label: 'College' },
  { value: 'research_institution', label: 'Research Institution' },
  { value: 'ngo', label: 'NGO' },
  { value: 'startup', label: 'Startup' },
  { value: 'government_organization', label: 'Government Organization' },
  { value: 'private_company', label: 'Private Company' },
  { value: 'individual', label: 'Individual Researchers' },
  { value: 'faculty_member', label: 'Faculty Members / Professors' },
  { value: 'student', label: 'Students' },
  { value: 'research_scholar', label: 'Research Scholars / PhD Scholars' },
  { value: 'hospital_medical_institution', label: 'Hospitals / Medical Institutions' },
]

// ─── Geography ───

const SCOPE_OPTIONS = [
  { value: 'Local', icon: '📍', title: 'Local', hint: 'Specific districts or cities' },
  { value: 'State', icon: '🏛️', title: 'State', hint: 'Chosen states & union territories' },
  { value: 'National', icon: '🇮🇳', title: 'National', hint: 'Pan-India, with optional limits' },
  { value: 'International', icon: '🌍', title: 'International', hint: 'Global or chosen countries' },
]

const REGION_GROUPS = [
  { id: 'north', label: 'North', states: ['Delhi', 'Haryana', 'Himachal Pradesh', 'Punjab', 'Rajasthan', 'Uttarakhand', 'Uttar Pradesh', 'Chandigarh', 'Jammu and Kashmir', 'Ladakh'] },
  { id: 'south', label: 'South', states: ['Andhra Pradesh', 'Karnataka', 'Kerala', 'Tamil Nadu', 'Telangana', 'Puducherry', 'Lakshadweep', 'Andaman and Nicobar Islands'] },
  { id: 'east', label: 'East', states: ['Bihar', 'Jharkhand', 'Odisha', 'West Bengal'] },
  { id: 'west', label: 'West', states: ['Goa', 'Gujarat', 'Maharashtra', 'Dadra and Nagar Haveli and Daman and Diu'] },
  { id: 'central', label: 'Central', states: ['Chhattisgarh', 'Madhya Pradesh'] },
  { id: 'ne', label: 'North East', states: ['Arunachal Pradesh', 'Assam', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'] },
]
const ALL_STATES = REGION_GROUPS.flatMap((g) => g.states)

const COUNTRY_SUGGESTIONS = [
  'United States', 'United Kingdom', 'Germany', 'France', 'Japan', 'Australia', 'Canada',
  'Singapore', 'UAE', 'South Korea', 'Israel', 'Russia', 'Bangladesh', 'Nepal', 'Sri Lanka', 'Bhutan',
]

const AREA_TYPE_OPTIONS = [
  { value: 'urban', label: 'Urban' },
  { value: 'semi_urban', label: 'Semi-urban' },
  { value: 'rural', label: 'Rural' },
  { value: 'tribal', label: 'Tribal areas' },
  { value: 'aspirational_districts', label: 'Aspirational districts' },
  { value: 'border_areas', label: 'Border areas' },
  { value: 'coastal', label: 'Coastal regions' },
]

const NATIONAL_MODES = [
  { value: 'all', title: 'All of India', hint: 'Open to applicants in every state & UT' },
  { value: 'selected', title: 'Selected states only', hint: 'Restrict to the states you choose' },
  { value: 'except', title: 'All except…', hint: 'Open everywhere apart from chosen states' },
]

const TEMPLATE_CRITERIA = [
  { label: 'Technical Innovation', weight: '30' },
  { label: 'Feasibility & Methodology', weight: '25' },
  { label: 'Expected Impact', weight: '25' },
  { label: 'Team Capability', weight: '10' },
  { label: 'Budget Justification', weight: '10' },
]

const STEPS = [
  { id: 'basics', label: 'Basics', hint: 'Title and summary' },
  { id: 'funding', label: 'Funding & Timeline', hint: 'Budget, dates, duration' },
  { id: 'eligibility', label: 'Applicants', hint: 'Who can apply' },
  { id: 'geography', label: 'Geographic Scope', hint: 'Where it applies' },
  { id: 'requirements', label: 'Requirements', hint: 'Scope, expenses, rules' },
  { id: 'evaluation', label: 'Evaluation', hint: 'Scoring criteria' },
  { id: 'contact', label: 'Contact & Documents', hint: 'How to apply' },
  { id: 'review', label: 'Review & Publish', hint: 'Final checks' },
]

const inputCls =
  'w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm disabled:cursor-not-allowed'
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5'

// ─────────────────────────────────────────────────────────────
// Pure helpers (also used by the Grant Calls page)
// ─────────────────────────────────────────────────────────────

const toDateInput = (value) => (value ? new Date(value).toISOString().split('T')[0] : '')

// "₹10,00,000–₹50,00,000" -> 5000000. Takes the upper figure of a range, and
// understands lakh / crore / k / million. 0 when no number is present.
export const parseBudgetMax = (text) => {
  const s = String(text || '').toLowerCase().replace(/,/g, '')
  const re = /(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|thousand|million|k|l|m)?(?![a-z])/g
  const mult = { crore: 1e7, cr: 1e7, lakh: 1e5, lac: 1e5, l: 1e5, thousand: 1e3, k: 1e3, million: 1e6, m: 1e6 }
  const nums = []
  let m
  while ((m = re.exec(s)) !== null) {
    nums.push(Math.round(parseFloat(m[1]) * (m[2] ? mult[m[2]] : 1)))
  }
  return nums.length > 0 ? Math.max(...nums) : 0
}

export const formatINRCompact = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return ''
  const trim = (x) => String(parseFloat(x.toFixed(2)))
  if (n >= 1e7) return `₹${trim(n / 1e7)} Cr`
  if (n >= 1e5) return `₹${trim(n / 1e5)} Lakh`
  return `₹${n.toLocaleString('en-IN')}`
}

const listPreview = (list, max = 3) =>
  list.length <= max ? list.join(', ') : `${list.slice(0, max).join(', ')} +${list.length - max} more`

// One-line description of a grant's geographic eligibility.
// Accepts the `eligibility` object exactly as stored on a GrantProgram.
export const summarizeGeography = (eligibility) => {
  const el = eligibility || {}
  const scope = el.geographicScope || ''
  const states = el.eligibleStates || []
  const excluded = el.excludedStates || []
  const countries = el.eligibleCountries || []
  const districts = el.eligibleDistricts || []

  if (scope === 'Local') {
    const where = districts.length > 0 ? listPreview(districts) : ''
    const st = states[0] || ''
    return { scope, label: 'Local', detail: [where, st].filter(Boolean).join(', ') || 'Location not set' }
  }
  if (scope === 'State') {
    return { scope, label: 'State', detail: states.length > 0 ? listPreview(states) : 'No states selected' }
  }
  if (scope === 'International') {
    return { scope, label: 'International', detail: countries.length > 0 ? listPreview(countries) : 'Open to any country' }
  }
  if (states.length > 0) {
    return { scope: 'National', label: 'National', detail: `${states.length} state${states.length === 1 ? '' : 's'} only: ${listPreview(states, 2)}` }
  }
  if (excluded.length > 0) {
    return { scope: 'National', label: 'National', detail: `Pan-India except ${listPreview(excluded, 2)}` }
  }
  return { scope: 'National', label: 'National', detail: 'Pan-India' }
}

// Mirrors the server-side publish rules so authors see what is missing
// before they press Publish.
export const getPublishReadiness = (p) => {
  const criteria = p.evaluationCriteria || []
  const total = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0)
  const el = p.eligibility || {}
  const needsStates = el.geographicScope === 'State' && (el.eligibleStates || []).length === 0
  const needsLocal =
    el.geographicScope === 'Local' &&
    (el.eligibleStates || []).length === 0 &&
    (el.eligibleDistricts || []).length === 0
  const deadlineOk = p.deadline ? new Date(p.deadline) > new Date() : false

  return [
    { key: 'title', label: 'Grant title', ok: Boolean(p.title && String(p.title).trim()) },
    { key: 'category', label: 'Category selected', ok: Boolean(p.category) },
    { key: 'budget', label: 'Funding amount with a readable number', ok: Boolean(p.budget && String(p.budget).trim()) && Number(p.budgetAmount) > 0 },
    { key: 'deadline', label: 'Submission deadline in the future', ok: deadlineOk },
    { key: 'criteria', label: 'Evaluation criteria total exactly 100', ok: criteria.length > 0 && total === 100 },
    { key: 'geo', label: 'Geographic scope has its locations filled in', ok: !needsStates && !needsLocal },
  ]
}

const emptyCriterion = () => ({ label: '', weight: '' })

const geoFromEligibility = (el = {}) => {
  const states = el.eligibleStates || []
  const excluded = el.excludedStates || []
  return {
    scope: el.geographicScope || 'National',
    natMode: states.length > 0 ? 'selected' : excluded.length > 0 ? 'except' : 'all',
    states,
    excluded,
    countries: el.eligibleCountries || [],
    districts: el.eligibleDistricts || [],
    areaTypes: el.areaTypes || [],
    notes: el.geographicNotes || '',
  }
}

const formFromProgram = (program) => ({
  title: program?.title || '',
  shortTitle: program?.shortTitle || '',
  description: program?.description || '',
  category: program?.category || CATEGORIES[0],
  fundingType: program?.fundingType || FUNDING_TYPES[0],
  budget: program?.budget || '',
  startDate: toDateInput(program?.startDate),
  deadline: toDateInput(program?.deadline),
  durationMin: program?.projectDurationMonths?.min ?? '',
  durationMax: program?.projectDurationMonths?.max ?? '',
  applicantTypes: program?.eligibility?.applicantTypes || [],
  minOrgAge: program?.eligibility?.minOrganizationAge ?? '',
  eligibilityRulesText: program?.eligibilityRulesText || '',
  geo: geoFromEligibility(program?.eligibility),
  researchAreas: program?.researchAreas || [],
  projectRequirements: program?.projectRequirements || '',
  allowableExpenses: program?.allowableExpenses || '',
  nonAllowableExpenses: program?.nonAllowableExpenses || '',
  budgetRules: program?.budgetRules || '',
  proposalRequirements: program?.proposalRequirements || '',
  applicationProcess: program?.applicationProcess || '',
  contactName: program?.contactInformation?.name || '',
  contactEmail: program?.contactInformation?.email || '',
  contactPhone: program?.contactInformation?.phone || '',
  // Seeded from whatever the server returned, so re-opening a draft always
  // shows exactly what was last saved.
  criteria:
    program?.evaluationCriteria?.length > 0
      ? program.evaluationCriteria.map((c) => ({
          label: c.label ?? '',
          weight: c.weight === undefined || c.weight === null ? '' : String(c.weight),
        }))
      : [emptyCriterion()],
})

const buildEligibility = (f) => {
  const g = f.geo
  const usesStates = g.scope === 'State' || g.scope === 'Local' || (g.scope === 'National' && g.natMode === 'selected')
  return {
    applicantTypes: f.applicantTypes,
    geographicScope: g.scope,
    eligibleStates: usesStates ? (g.scope === 'Local' ? g.states.slice(0, 1) : g.states) : [],
    excludedStates: g.scope === 'National' && g.natMode === 'except' ? g.excluded : [],
    eligibleCountries: g.scope === 'International' ? g.countries : [],
    eligibleDistricts: g.scope === 'Local' ? g.districts : [],
    areaTypes: g.areaTypes,
    geographicNotes: g.notes.trim(),
    minOrganizationAge: f.minOrgAge === '' ? null : Number(f.minOrgAge),
  }
}

const buildPayload = (f) => ({
  title: f.title,
  shortTitle: f.shortTitle,
  category: f.category,
  fundingType: f.fundingType,
  description: f.description,
  budget: f.budget,
  budgetAmount: parseBudgetMax(f.budget),
  startDate: f.startDate || null,
  deadline: f.deadline || undefined,
  projectDurationMonths: {
    min: f.durationMin === '' ? null : Number(f.durationMin),
    max: f.durationMax === '' ? null : Number(f.durationMax),
  },
  eligibility: buildEligibility(f),
  eligibilityRulesText: f.eligibilityRulesText,
  researchAreas: f.researchAreas,
  projectRequirements: f.projectRequirements,
  allowableExpenses: f.allowableExpenses,
  nonAllowableExpenses: f.nonAllowableExpenses,
  budgetRules: f.budgetRules,
  proposalRequirements: f.proposalRequirements,
  applicationProcess: f.applicationProcess,
  contactInformation: { name: f.contactName, email: f.contactEmail, phone: f.contactPhone },
  // Keep every row the user typed, including a still-empty label/weight —
  // filtering per keystroke is what previously made criteria appear to vanish.
  evaluationCriteria: f.criteria
    .filter((c) => c.label.trim() !== '' || c.weight !== '')
    .map((c) => ({ label: c.label.trim(), weight: Number(c.weight) || 0 })),
})

// ─────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────

/**
 * Full create/edit/review/publish workflow for a single Grant Call.
 *
 * Draft save/re-save: `currentProgram` is the single source of truth for
 * CREATE vs UPDATE. It starts as the `program` prop (null for a brand-new
 * grant). The moment the first save succeeds it becomes the server's
 * response, and EVERY later save goes through PUT /programs/:id — never POST
 * again. Publishing saves the latest edits first, then publishes.
 */
export default function GrantCallEditorModal({ program, onClose, onSaved }) {
  const isExisting = Boolean(program)
  const isLifecycleLocked = isExisting && !['Draft', 'Upcoming'].includes(program.status)

  const [form, setForm] = useState(() => formFromProgram(program))
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(buildPayload(formFromProgram(program))))
  const [currentProgram, setCurrentProgram] = useState(program || null)
  const [stepIndex, setStepIndex] = useState(0)

  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [publishErrors, setPublishErrors] = useState([])
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [confirmClose, setConfirmClose] = useState(false)

  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docError, setDocError] = useState('')

  const bodyRef = useRef(null)

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const setGeo = (patch) => setForm((f) => ({ ...f, geo: { ...f.geo, ...patch } }))

  const payload = useMemo(() => buildPayload(form), [form])
  const dirty = JSON.stringify(payload) !== savedSnapshot
  const readiness = useMemo(() => getPublishReadiness(payload), [payload])
  const readyCount = readiness.filter((r) => r.ok).length
  const isReady = readyCount === readiness.length
  const canPublish = currentProgram ? ['Draft', 'Upcoming'].includes(currentProgram.status) : !isExisting

  const weightTotal = form.criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0)
  const step = STEPS[stepIndex]

  // Scroll the content pane back to the top on every step change.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [stepIndex])

  const requestClose = () => {
    if (dirty) setConfirmClose(true)
    else onClose()
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (dirty) setConfirmClose(true)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dirty, onClose])

  // Per-step "done" flags shown in the side navigation.
  const stepDone = {
    basics: Boolean(form.title.trim() && form.category),
    funding: Boolean(form.budget.trim() && form.deadline),
    eligibility: form.applicantTypes.length > 0,
    geography: (() => {
      const g = form.geo
      if (g.scope === 'State') return g.states.length > 0
      if (g.scope === 'Local') return g.states.length > 0 || g.districts.length > 0
      if (g.scope === 'National' && g.natMode === 'selected') return g.states.length > 0
      if (g.scope === 'National' && g.natMode === 'except') return g.excluded.length > 0
      return Boolean(g.scope)
    })(),
    requirements: Boolean(form.researchAreas.length || form.projectRequirements.trim() || form.proposalRequirements.trim()),
    evaluation: weightTotal === 100,
    contact: Boolean(form.contactName.trim() || form.contactEmail.trim() || form.applicationProcess.trim()),
    review: isReady,
  }

  // ─── Save / publish ───

  const saveDraft = async ({ quiet = false } = {}) => {
    setError('')
    if (!form.title.trim()) {
      setError('Grant title is required')
      setStepIndex(0)
      return null
    }
    setSaving(true)
    try {
      // PUT if this program already has an _id, POST only for the very first save.
      // Once a call is past Draft/Upcoming the server only accepts the four
      // always-editable fields, so that is all we send.
      const existingId = currentProgram?._id
      const lockedNow = currentProgram ? !['Draft', 'Upcoming'].includes(currentProgram.status) : false
      const body = lockedNow
        ? {
            title: payload.title,
            description: payload.description,
            contactInformation: payload.contactInformation,
            applicationProcess: payload.applicationProcess,
          }
        : payload
      const res = existingId
        ? await api.put(`/agency/programs/${existingId}`, body)
        : await api.post('/agency/programs', body)

      if (res.data.success) {
        const saved = res.data.program
        setCurrentProgram(saved)
        // Re-sync from the server response so the form always shows exactly
        // what is persisted (including any server-side normalisation).
        const synced = formFromProgram(saved)
        setForm(synced)
        setSavedSnapshot(JSON.stringify(buildPayload(synced)))
        setLastSavedAt(new Date())
        onSaved?.(saved, { silent: true, quiet })
        return saved
      }
      return null
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save grant call.')
      return null
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setPublishErrors([])
    setError('')
    const saved = await saveDraft({ quiet: true })
    if (!saved?._id) return
    setPublishing(true)
    try {
      const res = await api.put(`/agency/programs/${saved._id}/publish`)
      if (res.data.success) {
        onSaved?.(res.data.program, { published: true })
        onClose()
      }
    } catch (err) {
      if (err.response?.data?.errors) setPublishErrors(err.response.data.errors)
      else setError(err.response?.data?.message || 'Failed to publish grant call.')
    } finally {
      setPublishing(false)
    }
  }

  const handleUploadDocument = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setDocError('')

    if (!currentProgram?._id) {
      setDocError('Save the grant call as a draft before attaching a document.')
      return
    }
    if (file.type !== 'application/pdf') {
      setDocError('Only PDF files are accepted.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocError('File exceeds the 10 MB size limit.')
      return
    }

    const formData = new FormData()
    formData.append('document', file)
    formData.append('documentType', 'Guidelines')

    setUploadingDoc(true)
    try {
      const res = await api.post(`/agency/programs/${currentProgram._id}/document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data.success) {
        setCurrentProgram((prev) => ({ ...prev, document: res.data.document }))
        onSaved?.({ ...currentProgram, document: res.data.document }, { silent: true })
      }
    } catch (err) {
      setDocError(err.response?.data?.message || 'Failed to upload document.')
    } finally {
      setUploadingDoc(false)
    }
  }

  const documentUrl = currentProgram?.document?.fileUrl
    ? `${api.defaults.baseURL?.replace(/\/api\/?$/, '') || ''}${currentProgram.document.fileUrl}`
    : null

  // ─── Criteria helpers ───
  const updateCriterion = (idx, field, value) =>
    set('criteria', form.criteria.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  const addCriterion = () => set('criteria', [...form.criteria, emptyCriterion()])
  const removeCriterion = (idx) => {
    const next = form.criteria.filter((_, i) => i !== idx)
    set('criteria', next.length > 0 ? next : [emptyCriterion()])
  }
  const splitEvenly = () => {
    const rows = form.criteria.filter((c) => c.label.trim() !== '')
    if (rows.length === 0) return
    const base = Math.floor(100 / rows.length)
    const remainder = 100 - base * rows.length
    let seen = 0
    set(
      'criteria',
      form.criteria.map((c) => {
        if (c.label.trim() === '') return c
        const w = base + (seen === 0 ? remainder : 0)
        seen += 1
        return { ...c, weight: String(w) }
      })
    )
  }

  const toggleApplicantType = (v) =>
    set('applicantTypes', form.applicantTypes.includes(v) ? form.applicantTypes.filter((x) => x !== v) : [...form.applicantTypes, v])

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

  const saveLabel = isExisting && isLifecycleLocked ? 'Save changes' : 'Save draft'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-warm-gray-900/50 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div
        className="relative bg-surface-elevated rounded-[18px] border border-warm-gray-200/80 shadow-medium w-full max-w-5xl h-[94vh] sm:h-[90vh] flex flex-col overflow-hidden animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Grant call editor"
      >
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-warm-gray-200/70 bg-cream/50">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading text-lg sm:text-xl font-bold text-warm-gray-900 truncate">
                {form.title.trim() || (isExisting ? 'Edit Grant Call' : 'New Grant Call')}
              </h3>
              {currentProgram && (
                <>
                  <span className="text-xs font-mono font-semibold text-amber bg-amber-50 px-2 py-0.5 rounded">
                    {currentProgram.displayId}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-warm-gray-100 text-warm-gray-600 border border-warm-gray-200">
                    {currentProgram.status}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-warm-gray-500 mt-0.5">
              Step {stepIndex + 1} of {STEPS.length} · {step.label}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs font-semibold">
              {saving ? (
                <span className="text-warm-gray-500">Saving…</span>
              ) : dirty ? (
                <span className="text-amber">● Unsaved changes</span>
              ) : lastSavedAt ? (
                <span className="text-emerald-600">✓ Saved {lastSavedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              ) : currentProgram ? (
                <span className="text-warm-gray-400">All changes saved</span>
              ) : (
                <span className="text-warm-gray-400">Not saved yet</span>
              )}
            </span>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full text-warm-gray-400 hover:text-warm-gray-700 hover:bg-warm-gray-100 flex items-center justify-center text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {isLifecycleLocked && (
          <div className="px-5 sm:px-6 py-3 bg-amber-50 border-b border-amber/15 text-xs text-amber leading-relaxed">
            ⚠️ This grant call is <strong>{currentProgram.status}</strong> — budget, deadline, category,
            funding type, eligibility, geography, research areas, requirements and evaluation criteria are
            locked. Title, description, contact information and application process can still be updated.
          </div>
        )}

        {/* ─── Mobile step bar ─── */}
        <div className="md:hidden flex gap-1.5 overflow-x-auto px-4 py-2.5 border-b border-warm-gray-200/70">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStepIndex(i)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                i === stepIndex ? 'bg-amber text-white' : stepDone[s.id] ? 'bg-emerald-50 text-emerald-700' : 'bg-warm-gray-100 text-warm-gray-600'
              }`}
            >
              {stepDone[s.id] && i !== stepIndex ? '✓ ' : ''}{s.label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 min-h-0">
          {/* ─── Side navigation ─── */}
          <nav className="hidden md:flex flex-col w-60 shrink-0 border-r border-warm-gray-200/70 bg-cream/40 p-3 gap-1 overflow-y-auto">
            {STEPS.map((s, i) => {
              const active = i === stepIndex
              const done = stepDone[s.id]
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStepIndex(i)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors cursor-pointer ${
                    active ? 'bg-amber text-white shadow-soft' : 'hover:bg-warm-gray-100 text-warm-gray-700'
                  }`}
                >
                  <span
                    className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                      active
                        ? 'bg-white/25 text-white'
                        : done
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-warm-gray-100 text-warm-gray-500'
                    }`}
                  >
                    {done && !active ? '✓' : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{s.label}</span>
                    <span className={`block text-xs leading-tight mt-0.5 ${active ? 'text-white/80' : 'text-warm-gray-400'}`}>{s.hint}</span>
                  </span>
                </button>
              )
            })}
          </nav>

          {/* ─── Step content ─── */}
          <div ref={bodyRef} className="flex-1 min-w-0 overflow-y-auto px-5 sm:px-8 py-6">
            {step.id === 'basics' && (
              <StepShell title="Basics" subtitle="Give the call a clear name and a short summary applicants will read first.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Grant Title</label>
                    <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Innovexa Emerging Technology Grant 2026" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Short Title / Program Code</label>
                    <input type="text" value={form.shortTitle} onChange={(e) => set('shortTitle', e.target.value)} placeholder="e.g. IRF-ETG-2026" className={inputCls} disabled={isLifecycleLocked} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Description / Summary</label>
                  <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={5} placeholder="Describe the mandate, objectives, and scope for this call" className={`${inputCls} resize-none`} />
                </div>
                <fieldset disabled={isLifecycleLocked} className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 border-0 p-0 m-0 disabled:opacity-60">
                  <div>
                    <label className={labelCls}>Category</label>
                    <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Funding Type</label>
                    <select value={form.fundingType} onChange={(e) => set('fundingType', e.target.value)} className={inputCls}>
                      {FUNDING_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </fieldset>
              </StepShell>
            )}

            {step.id === 'funding' && (
              <StepShell title="Funding & Timeline" subtitle="Budget, key dates and how long funded projects run.">
                <fieldset disabled={isLifecycleLocked} className="space-y-5 min-w-0 border-0 p-0 m-0 disabled:opacity-60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Funding Amount / Range</label>
                      <input type="text" value={form.budget} onChange={(e) => set('budget', e.target.value)} placeholder="e.g. ₹10,00,000–₹50,00,000" className={inputCls} />
                      <p className="text-xs mt-1.5 text-warm-gray-500">
                        {parseBudgetMax(form.budget) > 0
                          ? <>Counts as <strong className="text-warm-gray-800">{formatINRCompact(parseBudgetMax(form.budget))}</strong> in your fund pool (the upper figure).</>
                          : 'Include a number, e.g. ₹25,00,000 or 25 Lakh.'}
                      </p>
                    </div>
                    <div>
                      <label className={labelCls}>Submission Deadline</label>
                      <input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} className={inputCls} />
                      <DeadlineHint deadline={form.deadline} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Start Date</label>
                      <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Duration — Min (months)</label>
                      <input type="number" min="0" value={form.durationMin} onChange={(e) => set('durationMin', e.target.value)} placeholder="12" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Duration — Max (months)</label>
                      <input type="number" min="0" value={form.durationMax} onChange={(e) => set('durationMax', e.target.value)} placeholder="24" className={inputCls} />
                    </div>
                  </div>
                </fieldset>
              </StepShell>
            )}

            {step.id === 'eligibility' && (
              <StepShell title="Applicants" subtitle="Who is allowed to apply. Location rules live in the next step.">
                <fieldset disabled={isLifecycleLocked} className="space-y-5 min-w-0 border-0 p-0 m-0 disabled:opacity-60">
                  <div>
                    <p className={labelCls}>Eligible Applicant Types</p>
                    <div className="flex flex-wrap gap-2">
                      {APPLICANT_TYPE_OPTIONS.map((opt) => (
                        <Chip key={opt.value} active={form.applicantTypes.includes(opt.value)} onClick={() => toggleApplicantType(opt.value)}>
                          {opt.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div className="max-w-xs">
                    <label className={labelCls}>Minimum Organization Age (years, optional)</label>
                    <input type="number" min="0" value={form.minOrgAge} onChange={(e) => set('minOrgAge', e.target.value)} placeholder="e.g. 3" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Eligibility Criteria / Rules
                      <span className="text-warm-gray-400 normal-case font-medium"> (supplements the structured fields)</span>
                    </label>
                    <textarea
                      value={form.eligibilityRulesText}
                      onChange={(e) => set('eligibilityRulesText', e.target.value)}
                      rows={6}
                      placeholder="e.g. Applicants must be legally registered organizations operating in India. Proposed projects must demonstrate clear technical innovation and measurable impact..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </fieldset>
              </StepShell>
            )}

            {step.id === 'geography' && (
              <StepShell title="Geographic Scope" subtitle="Decide exactly where applicants must be based. Eligibility checks for organizations use these rules.">
                <fieldset disabled={isLifecycleLocked} className="min-w-0 border-0 p-0 m-0 disabled:opacity-60">
                  <GeographyPanel geo={form.geo} setGeo={setGeo} />
                </fieldset>
              </StepShell>
            )}

            {step.id === 'requirements' && (
              <StepShell title="Requirements" subtitle="Research priorities, project scope and the rules for spending the grant.">
                <fieldset disabled={isLifecycleLocked} className="space-y-5 min-w-0 border-0 p-0 m-0 disabled:opacity-60">
                  <div>
                    <label className={labelCls}>Research Areas / Priorities</label>
                    <TagInput
                      values={form.researchAreas}
                      onChange={(v) => set('researchAreas', v)}
                      placeholder="Type an area and press Enter — e.g. Robotics"
                      max={20}
                      suggestions={['AI', 'ML', 'Robotics', 'Cybersecurity', 'IoT', 'Quantum Computing']}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Project Requirements</label>
                    <textarea value={form.projectRequirements} onChange={(e) => set('projectRequirements', e.target.value)} rows={3} className={`${inputCls} resize-none`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Allowable Expenses</label>
                      <textarea value={form.allowableExpenses} onChange={(e) => set('allowableExpenses', e.target.value)} rows={4} className={`${inputCls} resize-none`} />
                    </div>
                    <div>
                      <label className={labelCls}>Non-Allowable Expenses</label>
                      <textarea value={form.nonAllowableExpenses} onChange={(e) => set('nonAllowableExpenses', e.target.value)} rows={4} className={`${inputCls} resize-none`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Budget Rules</label>
                      <textarea value={form.budgetRules} onChange={(e) => set('budgetRules', e.target.value)} rows={3} className={`${inputCls} resize-none`} />
                    </div>
                    <div>
                      <label className={labelCls}>Proposal Requirements</label>
                      <textarea value={form.proposalRequirements} onChange={(e) => set('proposalRequirements', e.target.value)} rows={3} className={`${inputCls} resize-none`} />
                    </div>
                  </div>
                </fieldset>
              </StepShell>
            )}

            {step.id === 'evaluation' && (
              <StepShell title="Evaluation Criteria" subtitle="How proposals are scored. Weights must total exactly 100 before you can publish.">
                <fieldset disabled={isLifecycleLocked} className="min-w-0 border-0 p-0 m-0 disabled:opacity-60">
                  <div className="p-4 rounded-[12px] bg-cream border border-warm-gray-200 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-600">Total weight</span>
                      <span className={`text-sm font-bold ${weightTotal === 100 ? 'text-emerald-600' : weightTotal > 100 ? 'text-red-600' : 'text-amber'}`}>
                        {weightTotal}/100
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-warm-gray-100 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${weightTotal === 100 ? 'bg-emerald-500' : weightTotal > 100 ? 'bg-red-500' : 'bg-amber'}`}
                        style={{ width: `${Math.min(weightTotal, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-warm-gray-500 mt-2">
                      {weightTotal === 100
                        ? 'Perfect — the weights add up.'
                        : weightTotal > 100
                          ? `${weightTotal - 100} points over. Reduce a weight.`
                          : `${100 - weightTotal} points still to assign.`}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {form.criteria.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={c.label}
                          onChange={(e) => updateCriterion(idx, 'label', e.target.value)}
                          placeholder="e.g. Technical Innovation"
                          className={inputCls}
                          style={{ flex: '1 1 auto', minWidth: 0 }}
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={c.weight}
                          onChange={(e) => updateCriterion(idx, 'weight', e.target.value)}
                          placeholder="%"
                          className={inputCls}
                          style={{ width: '80px', flex: '0 0 80px' }}
                        />
                        <button type="button" onClick={() => removeCriterion(idx)} aria-label="Remove criterion" className="text-warm-gray-400 hover:text-red-600 text-sm px-2 cursor-pointer flex-shrink-0">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <button type="button" onClick={addCriterion} className="text-xs font-semibold text-amber hover:underline cursor-pointer">+ Add criterion</button>
                    <button type="button" onClick={splitEvenly} className="text-xs font-semibold text-warm-gray-600 hover:text-amber hover:underline cursor-pointer">Split weights evenly</button>
                    {form.criteria.every((c) => !c.label.trim() && c.weight === '') && (
                      <button type="button" onClick={() => set('criteria', TEMPLATE_CRITERIA.map((c) => ({ ...c })))} className="text-xs font-semibold text-warm-gray-600 hover:text-amber hover:underline cursor-pointer">
                        Start from a template
                      </button>
                    )}
                  </div>
                </fieldset>
              </StepShell>
            )}

            {step.id === 'contact' && (
              <StepShell title="Contact & Documents" subtitle="How applicants reach you and where to find the official guidelines. These stay editable after publishing.">
                <div>
                  <label className={labelCls}>Application Process</label>
                  <textarea value={form.applicationProcess} onChange={(e) => set('applicationProcess', e.target.value)} rows={4} placeholder="Explain how to apply, what happens after submission, and expected timelines." className={`${inputCls} resize-none`} />
                </div>

                <div>
                  <p className={labelCls}>Contact Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <input type="text" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Contact name" className={inputCls} />
                    <input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="Contact email" className={inputCls} />
                    <input type="text" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="Contact phone" className={inputCls} />
                  </div>
                </div>

                <div>
                  <p className={labelCls}>Grant Document (PDF, max 10 MB)</p>
                  {currentProgram?.document?.fileUrl ? (
                    <div className="flex items-center justify-between gap-3 p-3.5 rounded-[10px] bg-cream border border-warm-gray-200">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-warm-gray-800 truncate">📄 {currentProgram.document.fileName || 'Grant document.pdf'}</p>
                        <p className="text-xs text-warm-gray-400">{currentProgram.document.documentType}</p>
                      </div>
                      <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-amber hover:underline flex-shrink-0">View →</a>
                    </div>
                  ) : (
                    <p className="text-xs text-warm-gray-400 mb-2">No document uploaded yet.</p>
                  )}
                  <label className="inline-flex items-center gap-2 mt-2 px-3 py-2 rounded-[8px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 text-xs font-semibold cursor-pointer transition-colors">
                    {uploadingDoc ? 'Uploading…' : currentProgram?.document?.fileUrl ? 'Replace Document' : 'Upload Document'}
                    <input type="file" accept="application/pdf" onChange={handleUploadDocument} disabled={uploadingDoc} className="hidden" />
                  </label>
                  {!currentProgram?._id && (
                    <p className="text-xs text-warm-gray-400 mt-1">Save this grant call as a draft first to attach a document.</p>
                  )}
                  {docError && <p className="text-xs text-red-600 mt-1">⚠️ {docError}</p>}
                </div>
              </StepShell>
            )}

            {step.id === 'review' && (
              <StepShell title="Review & Publish" subtitle="Check how the call reads and make sure every requirement is met.">
                <ReviewPanel
                  form={form}
                  payload={payload}
                  weightTotal={weightTotal}
                  readiness={readiness}
                  documentUrl={documentUrl}
                  documentName={currentProgram?.document?.fileName}
                  onJump={(id) => setStepIndex(STEPS.findIndex((s) => s.id === id))}
                />
              </StepShell>
            )}

            {publishErrors.length > 0 && (
              <div className="mt-5 p-3 rounded-[10px] bg-red-50 border border-red-200 text-xs text-red-700">
                <p className="font-semibold mb-1.5">⚠️ Cannot publish — please fix:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {publishErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            {error && (
              <div className="mt-5 p-3 rounded-[10px] bg-red-50 border border-red-200 text-xs text-red-700">⚠️ {error}</div>
            )}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-warm-gray-200/70 bg-surface-elevated">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="px-4 py-2 rounded-[10px] text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => saveDraft()}
              disabled={saving || publishing}
              className="px-4 sm:px-5 py-2.5 rounded-[10px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving…' : saveLabel}
            </button>
            {step.id === 'review' ? (
              canPublish && (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing || saving || !isReady}
                  title={isReady ? '' : 'Complete every item in the checklist first'}
                  className="px-5 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-xs font-semibold shadow-soft transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? 'Publishing…' : 'Publish Grant Call'}
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="px-5 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-xs font-semibold shadow-soft transition-all cursor-pointer"
              >
                Next →
              </button>
            )}
          </div>
        </div>

        {/* ─── Unsaved-changes confirmation ─── */}
        {confirmClose && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-warm-gray-900/40 backdrop-blur-[2px]">
            <div className="w-full max-w-sm bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 shadow-medium p-6">
              <h4 className="font-heading text-lg font-bold text-warm-gray-900">Discard unsaved changes?</h4>
              <p className="text-sm text-warm-gray-500 mt-1.5 leading-relaxed">
                You have edits that haven't been saved. Save them as a draft, or discard them and close.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
                <button type="button" onClick={() => setConfirmClose(false)} className="flex-1 px-4 py-2.5 rounded-[10px] text-xs font-semibold text-warm-gray-700 bg-warm-gray-100 hover:bg-warm-gray-200 cursor-pointer">
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const saved = await saveDraft()
                    if (saved) onClose()
                    else setConfirmClose(false)
                  }}
                  className="flex-1 px-4 py-2.5 rounded-[10px] text-xs font-semibold text-white bg-amber hover:bg-amber-light cursor-pointer"
                >
                  Save & close
                </button>
                <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-[10px] text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 cursor-pointer">
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Geography panel
// ─────────────────────────────────────────────────────────────

function GeographyPanel({ geo, setGeo }) {
  const covered = geo.scope === 'National' && geo.natMode === 'except'
    ? ALL_STATES.length - geo.excluded.length
    : geo.states.length

  const summary = summarizeGeography({
    geographicScope: geo.scope,
    eligibleStates: geo.scope === 'State' || geo.scope === 'Local' || (geo.scope === 'National' && geo.natMode === 'selected') ? geo.states : [],
    excludedStates: geo.scope === 'National' && geo.natMode === 'except' ? geo.excluded : [],
    eligibleCountries: geo.scope === 'International' ? geo.countries : [],
    eligibleDistricts: geo.scope === 'Local' ? geo.districts : [],
  })

  const chooseScope = (scope) => {
    if (scope === geo.scope) return
    setGeo({ scope, natMode: 'all' })
  }

  const chooseNatMode = (mode) => setGeo({ natMode: mode })

  const showCoverage = geo.scope === 'State' || (geo.scope === 'National' && geo.natMode !== 'all')

  return (
    <div className="space-y-6">
      {/* Scope cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SCOPE_OPTIONS.map((opt) => {
          const active = geo.scope === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => chooseScope(opt.value)}
              className={`text-left p-3.5 rounded-[12px] border-2 transition-all cursor-pointer ${
                active ? 'border-amber bg-amber-50 shadow-soft' : 'border-warm-gray-200 bg-cream hover:border-amber/40'
              }`}
            >
              <span className="text-xl block mb-1.5">{opt.icon}</span>
              <span className={`block text-sm font-bold ${active ? 'text-amber' : 'text-warm-gray-800'}`}>{opt.title}</span>
              <span className="block text-xs text-warm-gray-500 mt-0.5 leading-snug">{opt.hint}</span>
            </button>
          )
        })}
      </div>

      {/* Local */}
      {geo.scope === 'Local' && (
        <div className="space-y-4 p-4 rounded-[14px] bg-cream/60 border border-warm-gray-200">
          <div className="max-w-sm">
            <label className={labelCls}>State / UT</label>
            <select value={geo.states[0] || ''} onChange={(e) => setGeo({ states: e.target.value ? [e.target.value] : [] })} className={inputCls}>
              <option value="">Select a state…</option>
              {ALL_STATES.slice().sort().map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Districts / Cities covered <span className="text-warm-gray-400 normal-case font-medium">(optional)</span></label>
            <TagInput values={geo.districts} onChange={(v) => setGeo({ districts: v })} placeholder="Type a district or city and press Enter — e.g. Ahmedabad" max={50} />
            <p className="text-xs text-warm-gray-500 mt-2">
              Organizations are matched on their registered city. Leave empty to cover the whole state.
            </p>
          </div>
        </div>
      )}

      {/* State */}
      {geo.scope === 'State' && (
        <StatePicker selected={geo.states} onChange={(v) => setGeo({ states: v })} tone="include" title="Eligible states & union territories" />
      )}

      {/* National */}
      {geo.scope === 'National' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {NATIONAL_MODES.map((m) => {
              const active = geo.natMode === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => chooseNatMode(m.value)}
                  className={`text-left p-3 rounded-[12px] border transition-colors cursor-pointer ${
                    active ? 'border-amber bg-amber-50' : 'border-warm-gray-200 bg-cream hover:border-amber/40'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? 'border-amber' : 'border-warm-gray-300'}`}>
                      {active && <span className="w-2 h-2 rounded-full bg-amber" />}
                    </span>
                    <span className="text-sm font-semibold text-warm-gray-800">{m.title}</span>
                  </span>
                  <span className="block text-xs text-warm-gray-500 mt-1 pl-6 leading-snug">{m.hint}</span>
                </button>
              )
            })}
          </div>
          {geo.natMode === 'selected' && (
            <StatePicker selected={geo.states} onChange={(v) => setGeo({ states: v })} tone="include" title="Open to these states only" />
          )}
          {geo.natMode === 'except' && (
            <StatePicker selected={geo.excluded} onChange={(v) => setGeo({ excluded: v })} tone="exclude" title="Excluded states & union territories" />
          )}
        </div>
      )}

      {/* International */}
      {geo.scope === 'International' && (
        <div className="space-y-3 p-4 rounded-[14px] bg-cream/60 border border-warm-gray-200">
          <label className={labelCls}>Eligible countries <span className="text-warm-gray-400 normal-case font-medium">(leave empty for open to any country)</span></label>
          <TagInput values={geo.countries} onChange={(v) => setGeo({ countries: v })} placeholder="Type a country and press Enter" max={60} suggestions={COUNTRY_SUGGESTIONS} />
          <p className="text-xs text-warm-gray-500">
            {geo.countries.length === 0 ? '🌍 Open to applicants from any country.' : `Limited to ${geo.countries.length} countr${geo.countries.length === 1 ? 'y' : 'ies'}.`}
          </p>
        </div>
      )}

      {/* Area focus + notes */}
      <div className="space-y-4">
        <div>
          <p className={labelCls}>Area focus <span className="text-warm-gray-400 normal-case font-medium">(shown to applicants)</span></p>
          <div className="flex flex-wrap gap-2">
            {AREA_TYPE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                active={geo.areaTypes.includes(opt.value)}
                onClick={() => setGeo({ areaTypes: geo.areaTypes.includes(opt.value) ? geo.areaTypes.filter((x) => x !== opt.value) : [...geo.areaTypes, opt.value] })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>
            Location notes <span className="text-warm-gray-400 normal-case font-medium">({geo.notes.length}/500)</span>
          </label>
          <textarea
            value={geo.notes}
            onChange={(e) => setGeo({ notes: e.target.value.slice(0, 500) })}
            rows={3}
            placeholder="e.g. The project must be carried out at a site within the selected region. Priority for Tier-2 and Tier-3 cities."
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      {/* Live summary */}
      <div className="p-4 rounded-[14px] bg-emerald-50/60 border border-emerald-200 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wider text-emerald-700">Applicants will see</span>
          <span className="block text-sm font-semibold text-warm-gray-900 mt-0.5">
            {summary.label} · {summary.detail}
          </span>
        </div>
        {showCoverage && (
          <div className="ml-auto text-right">
            <span className="block text-xs font-bold uppercase tracking-wider text-emerald-700">Coverage</span>
            <span className="block text-sm font-semibold text-warm-gray-900 mt-0.5">{covered} of {ALL_STATES.length} states / UTs</span>
          </div>
        )}
      </div>
    </div>
  )
}

function StatePicker({ selected, onChange, tone, title }) {
  const [query, setQuery] = useState('')
  const isExclude = tone === 'exclude'
  const q = query.trim().toLowerCase()
  const custom = selected.filter((s) => !ALL_STATES.includes(s))

  const toggle = (state) =>
    onChange(selected.includes(state) ? selected.filter((s) => s !== state) : [...selected, state])

  const toggleGroup = (group) => {
    const allIn = group.states.every((s) => selected.includes(s))
    onChange(
      allIn
        ? selected.filter((s) => !group.states.includes(s))
        : [...selected, ...group.states.filter((s) => !selected.includes(s))]
    )
  }

  const activeCls = isExclude ? 'bg-red-600 text-white border-red-600' : 'bg-amber text-white border-amber'
  const idleCls = 'bg-cream text-warm-gray-600 border-warm-gray-200 hover:border-amber/40'

  return (
    <div className="p-4 rounded-[14px] bg-cream/60 border border-warm-gray-200 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-warm-gray-900">{title}</p>
          <p className="text-xs text-warm-gray-500">{selected.length} of {ALL_STATES.length} selected</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onChange([...ALL_STATES])} className="text-xs font-semibold text-amber hover:underline cursor-pointer">Select all</button>
          <span className="text-warm-gray-300">|</span>
          <button type="button" onClick={() => onChange([])} className="text-xs font-semibold text-warm-gray-500 hover:text-red-600 hover:underline cursor-pointer">Clear</button>
        </div>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search states & union territories…"
        className={inputCls}
      />

      {/* Zone presets */}
      <div className="flex flex-wrap gap-2">
        {REGION_GROUPS.map((g) => {
          const count = g.states.filter((s) => selected.includes(s)).length
          const all = count === g.states.length
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggleGroup(g)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors ${
                all ? activeCls : count > 0 ? 'bg-amber-50 text-amber border-amber/30' : idleCls
              }`}
            >
              {g.label} <span className="opacity-70">{count}/{g.states.length}</span>
            </button>
          )
        })}
      </div>

      {/* Custom (legacy / free-text) entries */}
      {custom.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-500 mb-1.5">Other entries</p>
          <div className="flex flex-wrap gap-2">
            {custom.map((s) => (
              <button key={s} type="button" onClick={() => toggle(s)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer ${activeCls}`}>
                {s} ✕
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grouped states */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {REGION_GROUPS.map((g) => {
          const visible = g.states.filter((s) => !q || s.toLowerCase().includes(q))
          if (visible.length === 0) return null
          return (
            <div key={g.id}>
              <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-400 mb-1.5">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {visible.map((s) => {
                  const on = selected.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggle(s)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-colors ${on ? activeCls : idleCls}`}
                    >
                      {on ? (isExclude ? '✕ ' : '✓ ') : ''}{s}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        {q && ALL_STATES.every((s) => !s.toLowerCase().includes(q)) && (
          <p className="text-xs text-warm-gray-400">No state matches “{query}”.</p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Review panel
// ─────────────────────────────────────────────────────────────

function ReviewPanel({ form, payload, weightTotal, readiness, documentUrl, documentName, onJump }) {
  const geoSummary = summarizeGeography(payload.eligibility)
  const areaLabels = AREA_TYPE_OPTIONS.filter((o) => form.geo.areaTypes.includes(o.value)).map((o) => o.label)
  const jumpFor = { title: 'basics', category: 'basics', budget: 'funding', deadline: 'funding', criteria: 'evaluation', geo: 'geography' }
  const criteria = form.criteria.filter((c) => c.label.trim())

  return (
    <div className="space-y-6">
      {/* Readiness */}
      <div className="p-4 rounded-[14px] border border-warm-gray-200 bg-cream/60">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-warm-gray-900">Publish checklist</p>
          <span className={`text-xs font-bold ${readiness.every((r) => r.ok) ? 'text-emerald-600' : 'text-amber'}`}>
            {readiness.filter((r) => r.ok).length}/{readiness.length} ready
          </span>
        </div>
        <ul className="space-y-1.5">
          {readiness.map((r) => (
            <li key={r.key} className="flex items-center gap-2.5 text-sm">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${r.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {r.ok ? '✓' : '!'}
              </span>
              <span className={r.ok ? 'text-warm-gray-600' : 'text-warm-gray-900 font-semibold'}>{r.label}</span>
              {!r.ok && (
                <button type="button" onClick={() => onJump(jumpFor[r.key])} className="ml-auto text-xs font-semibold text-amber hover:underline cursor-pointer">
                  Fix →
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Document preview */}
      <div className="rounded-[14px] border border-warm-gray-200 p-5 space-y-5">
        <div>
          <h2 className="font-heading text-2xl font-bold text-warm-gray-900 mb-1">{form.title || 'Untitled Grant Call'}</h2>
          <p className="text-xs text-warm-gray-500">{form.shortTitle && `${form.shortTitle} • `}{form.category} • {form.fundingType}</p>
        </div>

        {form.description && <p className="text-sm text-warm-gray-700 leading-relaxed whitespace-pre-line">{form.description}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-[12px] bg-cream border border-warm-gray-200 text-xs">
          <Fact label="Funding" value={form.budget || '—'} />
          <Fact label="Deadline" value={form.deadline || '—'} />
          <Fact label="Start Date" value={form.startDate || '—'} />
          <Fact label="Duration" value={form.durationMin !== '' || form.durationMax !== '' ? `${form.durationMin !== '' ? form.durationMin : '?'}–${form.durationMax !== '' ? form.durationMax : '?'} months` : '—'} />
        </div>

        {form.researchAreas.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-500 mb-2">Research Areas</p>
            <div className="flex flex-wrap gap-2">
              {form.researchAreas.map((r) => (
                <span key={r} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber font-semibold border border-amber/15">{r}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-500 mb-2">Eligibility</p>
          <p className="text-sm text-warm-gray-700 mb-1">
            <strong>Applicant Types:</strong>{' '}
            {form.applicantTypes.length > 0 ? form.applicantTypes.map((t) => APPLICANT_TYPE_OPTIONS.find((o) => o.value === t)?.label || t).join(', ') : '—'}
          </p>
          <p className="text-sm text-warm-gray-700 mb-1">
            <strong>Geographic Scope:</strong> {geoSummary.label} · {geoSummary.detail}
          </p>
          {areaLabels.length > 0 && (
            <p className="text-sm text-warm-gray-700 mb-1"><strong>Area focus:</strong> {areaLabels.join(', ')}</p>
          )}
          {form.geo.notes.trim() && (
            <p className="text-sm text-warm-gray-700 mb-1"><strong>Location notes:</strong> {form.geo.notes.trim()}</p>
          )}
          {form.minOrgAge !== '' && (
            <p className="text-sm text-warm-gray-700 mb-1"><strong>Minimum Organization Age:</strong> {form.minOrgAge} years</p>
          )}
          {form.eligibilityRulesText && (
            <p className="text-sm text-warm-gray-700 whitespace-pre-line mt-2 p-3 rounded-[10px] bg-cream border border-warm-gray-200">{form.eligibilityRulesText}</p>
          )}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-500 mb-2">Evaluation Criteria (Total: {weightTotal}/100)</p>
          {criteria.length === 0 ? (
            <p className="text-sm text-warm-gray-400">No evaluation criteria defined yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {criteria.map((c, idx) => (
                  <tr key={idx} className="border-b border-warm-gray-100">
                    <td className="py-1.5 text-warm-gray-700">{c.label}</td>
                    <td className="py-1.5 text-right font-semibold text-warm-gray-900">{c.weight || 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {documentUrl && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-500 mb-2">Document</p>
            <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-amber hover:underline">📄 {documentName} →</a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Small building blocks
// ─────────────────────────────────────────────────────────────

function StepShell({ title, subtitle, children }) {
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="mb-1">
        <h4 className="font-heading text-xl font-bold text-warm-gray-900">{title}</h4>
        {subtitle && <p className="text-sm text-warm-gray-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Fact({ label, value }) {
  return (
    <div>
      <span className="text-warm-gray-400 block text-xs">{label}</span>
      <strong className="text-warm-gray-900 text-sm">{value}</strong>
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
        active ? 'bg-amber text-white border-amber' : 'bg-cream text-warm-gray-600 border-warm-gray-200 hover:border-amber/40'
      }`}
    >
      {active ? '✓ ' : '+ '}{children}
    </button>
  )
}

function DeadlineHint({ deadline }) {
  const [now] = useState(() => Date.now())
  if (!deadline) return null
  const days = Math.ceil((new Date(deadline).getTime() - now) / 86400000)
  if (Number.isNaN(days)) return null
  if (days < 0) return <p className="text-xs mt-1.5 text-red-600 font-semibold">This date has already passed.</p>
  return <p className="text-xs mt-1.5 text-warm-gray-500">{days === 0 ? 'Closes today.' : `Closes in ${days} day${days === 1 ? '' : 's'}.`}</p>
}

function TagInput({ values, onChange, placeholder, max = 30, suggestions = [] }) {
  const [text, setText] = useState('')

  const add = (raw) => {
    const value = raw.trim().replace(/,$/, '').trim()
    if (!value) return
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setText('')
      return
    }
    if (values.length >= max) return
    onChange([...values, value.slice(0, 80)])
    setText('')
  }
  const remove = (v) => onChange(values.filter((x) => x !== v))
  const remaining = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()))

  return (
    <div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold bg-amber text-white">
              {v}
              <button type="button" onClick={() => remove(v)} aria-label={`Remove ${v}`} className="w-4 h-4 rounded-full hover:bg-white/25 flex items-center justify-center cursor-pointer leading-none">×</button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={text}
        disabled={values.length >= max}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(text)
          } else if (e.key === 'Backspace' && !text && values.length > 0) {
            remove(values[values.length - 1])
          }
        }}
        onBlur={() => add(text)}
        placeholder={values.length >= max ? `Maximum of ${max} reached` : placeholder}
        className={inputCls}
      />
      {remaining.length > 0 && values.length < max && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="px-2.5 py-1 rounded-full text-xs font-semibold border border-dashed border-warm-gray-300 text-warm-gray-500 hover:border-amber hover:text-amber transition-colors cursor-pointer"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}