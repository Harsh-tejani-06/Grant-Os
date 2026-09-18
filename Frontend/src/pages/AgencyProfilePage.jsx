import { useState, useEffect } from 'react'
import { useAgency } from '../components/AgencyContext'
import api from '../api'

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

const SECTION_LABELS = {
  identity: 'Agency Identity',
  about: 'About the Agency',
  operationalDetails: 'Operational Details',
  fundingProfile: 'Funding Profile',
  contactPerson: 'Contact Person',
  legalVerification: 'Legal Verification',
}

const formatDate = (dateValue) => {
  if (!dateValue) return '—'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return dateValue
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateTime = (dateValue) => {
  if (!dateValue) return '—'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return dateValue
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatAddress = (hq) => {
  if (!hq) return '—'
  const parts = [hq.street, hq.city, hq.state, hq.pincode, hq.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '—'
}

export default function AgencyProfilePage() {
  const { profile, checklist, refreshAll, refreshProfile } = useAgency()

  // ─── About ───
  const [description, setDescription] = useState('')
  const [mission, setMission] = useState('')
  const [vision, setVision] = useState('')

  // ─── Operational details ───
  const [website, setWebsite] = useState('')
  const [csr, setCsr] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [country, setCountry] = useState('India')

  // ─── Funding profile ───
  const [grantTypes, setGrantTypes] = useState([])
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [durationMax, setDurationMax] = useState('')
  const [frequency, setFrequency] = useState('')
  const [applicantTypes, setApplicantTypes] = useState([])
  const [fundingScope, setFundingScope] = useState('')
  const [fundingStatesText, setFundingStatesText] = useState('')

  // ─── Contact person (partial) ───
  const [designation, setDesignation] = useState('')
  const [phone, setPhone] = useState('')

  // ─── Legal verification (embedded) ───
  const [cin, setCin] = useState('')
  const [darpanId, setDarpanId] = useState('')
  const [verifSubmitting, setVerifSubmitting] = useState(false)
  const [verifError, setVerifError] = useState('')
  const [verifSuccess, setVerifSuccess] = useState('')

  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  useEffect(() => {
    if (!profile) return
    setDescription(profile.description || '')
    setMission(profile.mission || '')
    setVision(profile.vision || '')
    setWebsite(profile.website || '')
    setCsr(profile.csrRegistrationNumber || '')
    setStreet(profile.headquarters?.street || '')
    setCity(profile.headquarters?.city || '')
    setState(profile.headquarters?.state || '')
    setPincode(profile.headquarters?.pincode || '')
    setCountry(profile.headquarters?.country || 'India')
    setGrantTypes(profile.grantTypesOffered || [])
    setMinAmount(profile.fundingAmountMin ?? '')
    setMaxAmount(profile.fundingAmountMax ?? '')
    setDurationMin(profile.fundingDurationMonths?.min ?? '')
    setDurationMax(profile.fundingDurationMonths?.max ?? '')
    setFrequency(profile.fundingFrequency || '')
    setApplicantTypes(profile.eligibleApplicantTypes || [])
    setFundingScope(profile.fundingScope || '')
    setFundingStatesText((profile.fundingStates || []).join(', '))
    setDesignation(profile.contactPerson?.designation || '')
    setPhone(profile.contactPerson?.phone || '')
    setCin(profile.cin || '')
    setDarpanId(profile.darpanId || '')
  }, [profile])

  const toggleInList = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setProfileSubmitting(true)
    try {
      const res = await api.put('/agency/profile', {
        website,
        csrRegistrationNumber: csr,
        description,
        mission,
        vision,
        headquarters: { street, city, state, pincode, country },
        contactPerson: { designation, phone },
        grantTypesOffered: grantTypes,
        fundingAmountMin: minAmount === '' ? null : Number(minAmount),
        fundingAmountMax: maxAmount === '' ? null : Number(maxAmount),
        fundingDurationMonths: {
          min: durationMin === '' ? null : Number(durationMin),
          max: durationMax === '' ? null : Number(durationMax),
        },
        fundingFrequency: frequency,
        eligibleApplicantTypes: applicantTypes,
        fundingScope,
        fundingStates: fundingStatesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      if (res.data.success) {
        setProfileSuccess('Profile updated successfully.')
        refreshProfile()
        setTimeout(() => setProfileSuccess(''), 4000)
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setProfileSubmitting(false)
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
      const res = await api.put('/agency/legal-verification', { cin, darpanId })
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

  if (!profile) {
    return (
      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-10 text-center">
        <p className="text-sm text-warm-gray-500">Loading agency profile…</p>
      </div>
    )
  }

  const completion = profile.profileCompletion

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header + completion */}
      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/70 p-6 shadow-soft">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-warm-gray-900">Agency Profile</h2>
            <p className="text-xs text-warm-gray-500 mt-1">
              Identity is locked after registration. Everything else can be kept current below.
            </p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
            profile.status === 'approved'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber border-amber/20'
          }`}>
            {profile.status === 'approved' ? '✓ Active' : profile.status}
          </span>
        </div>

        {completion && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-warm-gray-400">
                Profile Completion
              </span>
              <span className="text-[11px] font-bold text-amber">{completion.percent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-warm-gray-100 overflow-hidden mb-3">
              <div
                className="h-full bg-amber transition-all duration-500"
                style={{ width: `${completion.percent}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(completion.sections).map(([key, done]) => (
                <span
                  key={key}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                    done
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-warm-gray-100 text-warm-gray-500 border-warm-gray-200'
                  }`}
                >
                  {done ? '✓' : '○'} {SECTION_LABELS[key] || key}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-warm-gray-400 mt-4">
          Last updated: {formatDateTime(profile.updatedAt)}
        </p>
      </div>

      {/* 1. Agency Identity (locked) */}
      <Section title="Agency Identity" badge="Locked" badgeTone="neutral">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <LockedField label="Agency Name" value={profile.agencyName} />
          <LockedField label="Short Name" value={profile.shortName} />
          <LockedField label="Agency Type" value={AGENCY_TYPE_LABELS[profile.agencyType] || profile.agencyType} />
          <LockedField label="Organization Type" value={profile.organizationType} />
          <LockedField label="Ownership Type" value={profile.ownershipType} />
          <LockedField label="Registration Number" value={profile.registrationNumber} />
          <LockedField label="Founded Year" value={profile.establishedYear} />
          <LockedField label="Registered On" value={formatDate(profile.submittedAt)} />
          <LockedField label="Website" value={profile.website} />
          <LockedField label="Email" value={profile.contactPerson?.email} />
          <LockedField label="Phone" value={profile.contactPerson?.phone} />
          <LockedField label="Verification Status" value={checklist.isLegallyVerified ? 'Verified' : 'Not Verified'} />
        </div>
        <div className="mt-4">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-warm-gray-400 mb-1">Address</span>
          <p className="font-semibold text-warm-gray-800 text-sm">{formatAddress(profile.headquarters)}</p>
        </div>
        <p className="text-[11px] text-warm-gray-400 mt-4">
          Need to correct one of these? Contact the GrantOS admin team — identity fields require
          manual re-verification.
        </p>
      </Section>

      {/* 2. About the Agency */}
      <Section title="About the Agency" badge="Editable" badgeTone="editable">
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              placeholder="Tell applicants about your organization, its mission, funding objectives, and areas of focus."
              rows={4}
              className={`${inputCls} resize-none`}
            />
            <p className="text-[11px] text-warm-gray-400 mt-1 text-right">{description.length}/1000</p>
          </Field>
          <Field label="Mission">
            <textarea
              value={mission}
              onChange={(e) => setMission(e.target.value.slice(0, 1000))}
              placeholder="e.g. To accelerate innovative research and technology development through accessible and impact-driven funding."
              rows={3}
              className={`${inputCls} resize-none`}
            />
            <p className="text-[11px] text-warm-gray-400 mt-1 text-right">{mission.length}/1000</p>
          </Field>
          <Field label="Vision">
            <textarea
              value={vision}
              onChange={(e) => setVision(e.target.value.slice(0, 1000))}
              placeholder="e.g. To build a stronger innovation ecosystem where great ideas become real-world solutions."
              rows={3}
              className={`${inputCls} resize-none`}
            />
            <p className="text-[11px] text-warm-gray-400 mt-1 text-right">{vision.length}/1000</p>
          </Field>
          <FormFooter submitting={profileSubmitting} error={profileError} success={profileSuccess} />
        </form>
      </Section>

      {/* 3. Operational Details */}
      <Section title="Operational Details" badge="Editable" badgeTone="editable">
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Website">
              <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://your-agency.example" className={inputCls} />
            </Field>
            <Field label="CSR Registration Number">
              <input type="text" value={csr} onChange={(e) => setCsr(e.target.value)} placeholder="CSR00012345" className={inputCls} />
            </Field>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-2">Headquarters</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Street"><input type="text" value={street} onChange={(e) => setStreet(e.target.value)} className={inputCls} /></Field>
              <Field label="City"><input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></Field>
              <Field label="State"><input type="text" value={state} onChange={(e) => setState(e.target.value)} className={inputCls} /></Field>
              <Field label="Pincode"><input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} className={inputCls} /></Field>
              <Field label="Country"><input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} /></Field>
            </div>
          </div>

          <FormFooter submitting={profileSubmitting} error={profileError} success={profileSuccess} />
        </form>
      </Section>

      {/* 4. Funding Profile */}
      <Section title="Funding Profile" badge="Editable" badgeTone="editable">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <ChipGroup
            label="Grant Types Offered"
            hint="tap to add or remove"
            options={GRANT_TYPE_OPTIONS}
            selected={grantTypes}
            onToggle={(v) => toggleInList(grantTypes, setGrantTypes, v)}
          />

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-2">Grant Amount Range (₹)</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Minimum"><input type="number" min="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="500000" className={inputCls} /></Field>
              <Field label="Maximum"><input type="number" min="0" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="20000000" className={inputCls} /></Field>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-2">Typical Funding Duration (months)</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Minimum"><input type="number" min="0" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="12" className={inputCls} /></Field>
              <Field label="Maximum"><input type="number" min="0" value={durationMax} onChange={(e) => setDurationMax(e.target.value)} placeholder="36" className={inputCls} /></Field>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-2">Funding Frequency</p>
            <div className="flex flex-wrap gap-2">
              {FUNDING_FREQUENCY_OPTIONS.map((f) => (
                <Chip key={f} active={frequency === f} onClick={() => setFrequency(frequency === f ? '' : f)}>{f}</Chip>
              ))}
            </div>
          </div>

          <ChipGroup
            label="Eligible Applicant Types"
            hint="tap to add or remove"
            options={APPLICANT_TYPE_OPTIONS}
            selected={applicantTypes}
            onToggle={(v) => toggleInList(applicantTypes, setApplicantTypes, v)}
          />

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-2">Geographic Funding Scope</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {FUNDING_SCOPE_OPTIONS.map((s) => (
                <Chip key={s} active={fundingScope === s} onClick={() => setFundingScope(fundingScope === s ? '' : s)}>{s}</Chip>
              ))}
            </div>
            {(fundingScope === 'State' || fundingScope === 'National') && (
              <Field label="States / Regions Covered (comma-separated)">
                <input
                  type="text"
                  value={fundingStatesText}
                  onChange={(e) => setFundingStatesText(e.target.value)}
                  placeholder="Gujarat, Maharashtra, Delhi, Karnataka"
                  className={inputCls}
                />
              </Field>
            )}
          </div>

          <FormFooter submitting={profileSubmitting} error={profileError} success={profileSuccess} />
        </form>
      </Section>

      {/* 5. Contact Person */}
      <Section title="Contact Person" badge="Partially Editable" badgeTone="editable">
        <form onSubmit={handleSaveProfile}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LockedField label="Name" value={profile.contactPerson?.name} compact />
            <LockedField label="Official Email" value={profile.contactPerson?.email} compact />
            <Field label="Designation"><input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} className={inputCls} /></Field>
            <Field label="Phone"><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></Field>
          </div>
          <p className="text-[11px] text-warm-gray-400 mt-3">
            Name and email are tied to your registered account and can't be changed here.
          </p>
          <FormFooter submitting={profileSubmitting} error={profileError} success={profileSuccess} />
        </form>
      </Section>

      {/* 6. Legal Verification */}
      <Section
        title="Legal Verification"
        badge={checklist.isLegallyVerified ? 'Verified' : 'Not Verified'}
        badgeTone={checklist.isLegallyVerified ? 'verified' : 'neutral'}
      >
        <p className="text-xs text-warm-gray-500 mb-5">
          Verified agencies receive a trust badge shown to applicant institutions on every grant call.
        </p>
        <form onSubmit={handleSaveVerification} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Corporate Identification Number (CIN)">
              <input type="text" value={cin} onChange={(e) => setCin(e.target.value)} placeholder="e.g. U72900MH2015PTC123456" className={inputCls} />
            </Field>
            <Field label="NGO Darpan ID">
              <input type="text" value={darpanId} onChange={(e) => setDarpanId(e.target.value)} placeholder="e.g. MH/2015/0123456" className={inputCls} />
            </Field>
          </div>
          <p className="text-[11px] text-warm-gray-400 leading-relaxed">
            Provide at least one identifier. Clear both fields and save to remove your verification status.
          </p>
          <FormFooter
            submitting={verifSubmitting}
            error={verifError}
            success={verifSuccess}
            submitLabel="Save Verification Details"
          />
        </form>
      </Section>

      {/* 7. Registered Documents (read-only) — unchanged */}
      <Section title="Registered Documents" badge="Read-only" badgeTone="neutral">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DocumentRow label="Authorization Letter" url={profile.authorizationLetterUrl} />
          <DocumentRow label="Registration Certificate" url={profile.registrationCertificateUrl} />
        </div>
        <p className="text-[11px] text-warm-gray-400 mt-4">
          These were submitted during registration. Document uploads and replacements are
          handled by the GrantOS admin team during verification review.
        </p>
      </Section>
    </div>
  )
}

const inputCls =
  'w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm'

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
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${toneCls}`}>
          {badge}
        </span>
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function LockedField({ label, value, compact }) {
  return (
    <div>
      <span className="block text-[11px] font-bold uppercase tracking-wider text-warm-gray-400 mb-1">
        {label}
      </span>
      <p className={`font-semibold text-warm-gray-800 ${compact ? 'text-sm' : 'text-base'}`}>
        {value || '—'}
      </p>
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
        isError
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
      }`}
    >
      {isError ? '⚠️ ' : '✓ '}{children}
    </div>
  )
}

function FormFooter({ submitting, error, success, submitLabel }) {
  return (
    <div className="mt-5">
      {error && <div className="mb-3"><Banner type="error">{error}</Banner></div>}
      {success && <div className="mb-3"><Banner type="success">{success}</Banner></div>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-xs font-semibold shadow-soft transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : (submitLabel || 'Save Changes')}
        </button>
      </div>
    </div>
  )
}

function DocumentRow({ label, url }) {
  return (
    <div className="p-3.5 rounded-[10px] bg-cream border border-warm-gray-200 flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-warm-gray-700">{label}</span>
      {url
        ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-amber hover:underline">View →</a>
        : <span className="text-[11px] text-warm-gray-400">Not submitted</span>}
    </div>
  )
}