import { useState, useEffect } from 'react'
import api from '../api'

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

const GEOGRAPHIC_SCOPES = ['Local', 'State', 'National', 'International']

const emptyCriterion = () => ({ label: '', weight: '' })

const inputCls =
  'w-full px-4 py-2.5 rounded-[10px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber text-sm'
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-warm-gray-700 mb-1.5'

const csvToArray = (text) =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

/**
 * Full create/edit/preview/publish workflow for a single Grant Call.
 *
 * IMPORTANT re: draft save/re-save workflow:
 * `currentProgram` is the single source of truth for whether we CREATE or
 * UPDATE. It starts as the `program` prop (null for a brand-new grant,
 * populated for an existing draft opened for editing). The moment the first
 * save succeeds, `currentProgram` is set to the server's response — from
 * that point on, EVERY subsequent save (this open of the modal, however many
 * times "Save Draft" is clicked) goes through PUT /programs/:id, never POST
 * again. There is no code path that falls back to create once an _id exists.
 */
export default function GrantCallEditorModal({ program, onClose, onSaved }) {
  const isExisting = Boolean(program)
  const isLifecycleLocked = isExisting && !['Draft', 'Upcoming'].includes(program.status)

  const [mode, setMode] = useState('edit') // 'edit' | 'preview'

  const [title, setTitle] = useState(program?.title || '')
  const [shortTitle, setShortTitle] = useState(program?.shortTitle || '')
  const [category, setCategory] = useState(program?.category || CATEGORIES[0])
  const [fundingType, setFundingType] = useState(program?.fundingType || FUNDING_TYPES[0])
  const [description, setDescription] = useState(program?.description || '')
  const [budget, setBudget] = useState(program?.budget || '')
  const [startDate, setStartDate] = useState(
    program?.startDate ? new Date(program.startDate).toISOString().split('T')[0] : ''
  )
  const [deadline, setDeadline] = useState(
    program?.deadline ? new Date(program.deadline).toISOString().split('T')[0] : ''
  )
  const [durationMin, setDurationMin] = useState(program?.projectDurationMonths?.min ?? '')
  const [durationMax, setDurationMax] = useState(program?.projectDurationMonths?.max ?? '')

  const [applicantTypes, setApplicantTypes] = useState(program?.eligibility?.applicantTypes || [])
  const [geographicScope, setGeographicScope] = useState(program?.eligibility?.geographicScope || '')
  const [eligibleStatesText, setEligibleStatesText] = useState(
    (program?.eligibility?.eligibleStates || []).join(', ')
  )
  const [minOrgAge, setMinOrgAge] = useState(program?.eligibility?.minOrganizationAge ?? '')
  const [eligibilityRulesText, setEligibilityRulesText] = useState(program?.eligibilityRulesText || '')

  const [researchAreasText, setResearchAreasText] = useState((program?.researchAreas || []).join(', '))
  const [projectRequirements, setProjectRequirements] = useState(program?.projectRequirements || '')
  const [allowableExpenses, setAllowableExpenses] = useState(program?.allowableExpenses || '')
  const [nonAllowableExpenses, setNonAllowableExpenses] = useState(program?.nonAllowableExpenses || '')
  const [budgetRules, setBudgetRules] = useState(program?.budgetRules || '')
  const [proposalRequirements, setProposalRequirements] = useState(program?.proposalRequirements || '')
  const [applicationProcess, setApplicationProcess] = useState(program?.applicationProcess || '')

  const [contactName, setContactName] = useState(program?.contactInformation?.name || '')
  const [contactEmail, setContactEmail] = useState(program?.contactInformation?.email || '')
  const [contactPhone, setContactPhone] = useState(program?.contactInformation?.phone || '')

  // Evaluation criteria — seeded from whatever the server actually returned,
  // so re-opening a draft always shows exactly what was last saved.
  const [criteria, setCriteria] = useState(() => {
    if (program?.evaluationCriteria?.length > 0) {
      return program.evaluationCriteria.map((c) => ({
        label: c.label ?? '',
        weight: c.weight === undefined || c.weight === null ? '' : String(c.weight),
      }))
    }
    return [emptyCriterion()]
  })

  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [publishErrors, setPublishErrors] = useState([])
  const [currentProgram, setCurrentProgram] = useState(program || null)

  // ─── Grant-specific PDF ───
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docError, setDocError] = useState('')

  useEffect(() => {
    setPublishErrors([])
  }, [mode])

  const toggleApplicantType = (v) => {
    setApplicantTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  const updateCriterion = (idx, field, value) => {
    setCriteria((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }
  const addCriterion = () => setCriteria((prev) => [...prev, emptyCriterion()])
  const removeCriterion = (idx) => setCriteria((prev) => prev.filter((_, i) => i !== idx))

  const weightTotal = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0)

  const buildPayload = () => {
    const numericBudget = Number((budget || '').replace(/[^0-9]/g, '')) || 0
    return {
      title,
      shortTitle,
      category,
      fundingType,
      description,
      budget,
      budgetAmount: numericBudget,
      startDate: startDate || null,
      deadline: deadline || undefined,
      projectDurationMonths: {
        min: durationMin === '' ? null : Number(durationMin),
        max: durationMax === '' ? null : Number(durationMax),
      },
      eligibility: {
        applicantTypes,
        geographicScope,
        eligibleStates: csvToArray(eligibleStatesText),
        minOrganizationAge: minOrgAge === '' ? null : Number(minOrgAge),
      },
      eligibilityRulesText,
      researchAreas: csvToArray(researchAreasText),
      projectRequirements,
      allowableExpenses,
      nonAllowableExpenses,
      budgetRules,
      proposalRequirements,
      applicationProcess,
      contactInformation: { name: contactName, email: contactEmail, phone: contactPhone },
      // Keep every row the user typed, including a still-empty label/weight —
      // filtering here (rather than on every keystroke) is what previously
      // caused criteria to appear to "vanish": a row with a label but no
      // weight yet was being dropped before the user finished typing.
      evaluationCriteria: criteria
        .filter((c) => c.label.trim() !== '' || c.weight !== '')
        .map((c) => ({ label: c.label.trim(), weight: Number(c.weight) || 0 })),
    }
  }

  const handleSaveDraft = async (e) => {
    e?.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Grant title is required')
      return
    }
    setSaving(true)
    try {
      const payload = buildPayload()
      // Decision point: PUT if this program already has an _id (from the
      // prop, or from a prior save in this same modal session) — POST only
      // ever fires once, on the very first save of a brand-new grant.
      const existingId = currentProgram?._id
      const res = existingId
        ? await api.put(`/agency/programs/${existingId}`, payload)
        : await api.post('/agency/programs', payload)

      if (res.data.success) {
        setCurrentProgram(res.data.program)
        // Re-sync local criteria state from the server's response so what's
        // displayed always matches what's actually persisted.
        if (res.data.program.evaluationCriteria) {
          setCriteria(
            res.data.program.evaluationCriteria.length > 0
              ? res.data.program.evaluationCriteria.map((c) => ({
                  label: c.label ?? '',
                  weight: c.weight === undefined || c.weight === null ? '' : String(c.weight),
                }))
              : [emptyCriterion()]
          )
        }
        onSaved?.(res.data.program, { silent: true })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save grant call.')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = async (e) => {
    e.preventDefault()
    // Save first so preview reflects the latest edits, then switch mode.
    await handleSaveDraft()
    setMode('preview')
  }

  const handlePublish = async () => {
    setPublishErrors([])
    setError('')
    if (!currentProgram?._id) {
      setError('Save the grant call as a draft before publishing.')
      return
    }
    setPublishing(true)
    try {
      const res = await api.put(`/agency/programs/${currentProgram._id}/publish`)
      if (res.data.success) {
        onSaved?.(res.data.program, { published: true })
        onClose()
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setPublishErrors(err.response.data.errors)
      } else {
        setError(err.response?.data?.message || 'Failed to publish grant call.')
      }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-gray-900/40 backdrop-blur-xs">
      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/80 shadow-medium w-full max-w-2xl p-6 sm:p-8 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading text-xl font-bold text-warm-gray-900">
            {isExisting ? 'Edit Grant Call' : 'New Grant Call'}
          </h3>
          <button onClick={onClose} className="text-warm-gray-400 hover:text-warm-gray-600 text-lg cursor-pointer">
            ✕
          </button>
        </div>

        {currentProgram && (
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs font-mono font-semibold text-amber bg-amber-50 px-2 py-0.5 rounded">
              {currentProgram.displayId}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-warm-gray-100 text-warm-gray-600 border border-warm-gray-200">
              {currentProgram.status}
            </span>
          </div>
        )}

        {isLifecycleLocked && (
          <div className="mb-5 p-3 rounded-[10px] bg-amber-50 border border-amber/15 text-xs text-amber leading-relaxed">
            ⚠️ This grant call is <strong>{currentProgram.status}</strong> — budget, deadline,
            category, funding type, eligibility, research areas, requirements, and evaluation
            criteria are locked. Title, description, contact information, and application
            process may still be updated.
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex items-center gap-2 mb-5 border-b border-warm-gray-200 pb-3">
          <button
            onClick={() => setMode('edit')}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold cursor-pointer transition-colors ${
              mode === 'edit' ? 'bg-amber text-white' : 'text-warm-gray-600 hover:bg-warm-gray-100'
            }`}
          >
            Edit
          </button>
          <button
            onClick={handlePreview}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold cursor-pointer transition-colors ${
              mode === 'preview' ? 'bg-amber text-white' : 'text-warm-gray-600 hover:bg-warm-gray-100'
            }`}
          >
            Preview
          </button>
        </div>

        {mode === 'edit' ? (
          <form onSubmit={handleSaveDraft} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Grant Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Innovexa Emerging Technology Grant 2026"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Short Title / Program Code</label>
                <input
                  type="text"
                  value={shortTitle}
                  onChange={(e) => setShortTitle(e.target.value)}
                  placeholder="e.g. IRF-ETG-2026"
                  className={inputCls}
                  disabled={isLifecycleLocked}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Description / Summary</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the mandate, objectives, and scope for this call"
                className={`${inputCls} resize-none`}
              />
            </div>

            <fieldset disabled={isLifecycleLocked} className="space-y-5 disabled:opacity-60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Funding Type</label>
                  <select value={fundingType} onChange={(e) => setFundingType(e.target.value)} className={inputCls}>
                    {FUNDING_TYPES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Funding Amount / Range</label>
                  <input
                    type="text"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. ₹10,00,000–₹50,00,000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Submission Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Project Duration — Min (months)</label>
                  <input type="number" min="0" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="12" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Project Duration — Max (months)</label>
                  <input type="number" min="0" value={durationMax} onChange={(e) => setDurationMax(e.target.value)} placeholder="24" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Research Areas / Priorities (comma-separated)</label>
                <input
                  type="text"
                  value={researchAreasText}
                  onChange={(e) => setResearchAreasText(e.target.value)}
                  placeholder="AI, ML, Robotics, Cybersecurity, IoT, Quantum Computing"
                  className={inputCls}
                />
              </div>

              <div>
                <p className={labelCls}>Eligible Applicant Types</p>
                <div className="flex flex-wrap gap-2">
                  {APPLICANT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleApplicantType(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                        applicantTypes.includes(opt.value)
                          ? 'bg-amber text-white border-amber'
                          : 'bg-cream text-warm-gray-600 border-warm-gray-200 hover:border-amber/40'
                      }`}
                    >
                      {applicantTypes.includes(opt.value) ? '✓ ' : '+ '}{opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Geographic Scope</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {GEOGRAPHIC_SCOPES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setGeographicScope(geographicScope === s ? '' : s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                        geographicScope === s
                          ? 'bg-amber text-white border-amber'
                          : 'bg-cream text-warm-gray-600 border-warm-gray-200 hover:border-amber/40'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {(geographicScope === 'State' || geographicScope === 'National') && (
                  <input
                    type="text"
                    value={eligibleStatesText}
                    onChange={(e) => setEligibleStatesText(e.target.value)}
                    placeholder="Eligible states, comma-separated e.g. Gujarat, Maharashtra"
                    className={inputCls}
                  />
                )}
              </div>

              <div>
                <label className={labelCls}>Minimum Organization Age (years, optional)</label>
                <input
                  type="number"
                  min="0"
                  value={minOrgAge}
                  onChange={(e) => setMinOrgAge(e.target.value)}
                  placeholder="e.g. 3"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Eligibility Criteria / Rules / Guidelines
                  <span className="text-warm-gray-400 normal-case font-medium"> (supplements the structured fields above)</span>
                </label>
                <textarea
                  value={eligibilityRulesText}
                  onChange={(e) => setEligibilityRulesText(e.target.value)}
                  rows={5}
                  placeholder="e.g. Applicants must be legally registered organizations operating in India. Proposed projects must demonstrate clear technical innovation and measurable impact..."
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div>
                <label className={labelCls}>Project Requirements</label>
                <textarea value={projectRequirements} onChange={(e) => setProjectRequirements(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Allowable Expenses</label>
                  <textarea value={allowableExpenses} onChange={(e) => setAllowableExpenses(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
                </div>
                <div>
                  <label className={labelCls}>Non-Allowable Expenses</label>
                  <textarea value={nonAllowableExpenses} onChange={(e) => setNonAllowableExpenses(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Budget Rules</label>
                <textarea value={budgetRules} onChange={(e) => setBudgetRules(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              </div>

              <div>
                <label className={labelCls}>Proposal Requirements</label>
                <textarea value={proposalRequirements} onChange={(e) => setProposalRequirements(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              </div>

              {/* Evaluation Criteria — label field is deliberately wide (flex-1)
                  and the weight field has a fixed pixel width via inline style
                  so it never collapses or gets visually squeezed regardless
                  of Tailwind purge behavior. */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className={labelCls + ' mb-0'}>Evaluation Criteria</p>
                  <span className={`text-xs font-bold ${weightTotal === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
                    Total: {weightTotal}/100
                  </span>
                </div>
                <div className="space-y-2">
                  {criteria.map((c, idx) => (
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
                      <button
                        type="button"
                        onClick={() => removeCriterion(idx)}
                        className="text-warm-gray-400 hover:text-red-600 text-sm px-2 cursor-pointer flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addCriterion}
                  className="text-xs font-semibold text-amber hover:underline mt-2 cursor-pointer"
                >
                  + Add criterion
                </button>
              </div>
            </fieldset>

            {/* Always editable, even after publish */}
            <div>
              <label className={labelCls}>Application Process</label>
              <textarea value={applicationProcess} onChange={(e) => setApplicationProcess(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </div>

            <div>
              <p className={labelCls}>Contact Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" className={inputCls} />
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email" className={inputCls} />
                <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Contact phone" className={inputCls} />
              </div>
            </div>

            {/* Grant-specific PDF */}
            <div>
              <p className={labelCls}>Grant Document (PDF, max 10 MB)</p>
              {currentProgram?.document?.fileUrl ? (
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-[10px] bg-cream border border-warm-gray-200">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-warm-gray-800 truncate">
                      📄 {currentProgram.document.fileName || 'Grant document.pdf'}
                    </p>
                    <p className="text-[11px] text-warm-gray-400">{currentProgram.document.documentType}</p>
                  </div>
                  <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-amber hover:underline flex-shrink-0">
                    View →
                  </a>
                </div>
              ) : (
                <p className="text-xs text-warm-gray-400 mb-2">No document uploaded yet.</p>
              )}
              <label className="inline-flex items-center gap-2 mt-2 px-3 py-2 rounded-[8px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 text-xs font-semibold cursor-pointer transition-colors">
                {uploadingDoc ? 'Uploading…' : currentProgram?.document?.fileUrl ? 'Replace Document' : 'Upload Document'}
                <input type="file" accept="application/pdf" onChange={handleUploadDocument} disabled={uploadingDoc} className="hidden" />
              </label>
              {!currentProgram?._id && (
                <p className="text-[11px] text-warm-gray-400 mt-1">Save this grant call as a draft first to attach a document.</p>
              )}
              {docError && <p className="text-[11px] text-red-600 mt-1">⚠️ {docError}</p>}
            </div>

            {error && (
              <div className="p-3 rounded-[10px] bg-red-50 border border-red-200 text-xs text-red-700">
                ⚠️ {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-warm-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-[10px] text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-[10px] bg-cream hover:bg-cream-dark border border-warm-gray-200 text-warm-gray-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              {currentProgram && ['Draft', 'Upcoming'].includes(currentProgram.status) && (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="px-5 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-xs font-semibold shadow-soft transition-all cursor-pointer disabled:opacity-60"
                >
                  {publishing ? 'Publishing…' : 'Publish Grant Call'}
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {/* ─── Preview ─── */}
            <div>
              <h2 className="font-heading text-2xl font-bold text-warm-gray-900 mb-1">{title || 'Untitled Grant Call'}</h2>
              <p className="text-xs text-warm-gray-500">{shortTitle && `${shortTitle} • `}{category} • {fundingType}</p>
            </div>

            {description && <p className="text-sm text-warm-gray-700 leading-relaxed">{description}</p>}

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-[12px] bg-cream border border-warm-gray-200 text-xs">
              <div>
                <span className="text-warm-gray-400 block text-[11px]">Funding</span>
                <strong className="text-warm-gray-900 text-sm">{budget || '—'}</strong>
              </div>
              <div>
                <span className="text-warm-gray-400 block text-[11px]">Deadline</span>
                <strong className="text-warm-gray-900 text-sm">{deadline || '—'}</strong>
              </div>
              <div>
                <span className="text-warm-gray-400 block text-[11px]">Start Date</span>
                <strong className="text-warm-gray-900 text-sm">{startDate || '—'}</strong>
              </div>
              <div>
                <span className="text-warm-gray-400 block text-[11px]">Duration</span>
                <strong className="text-warm-gray-900 text-sm">
                  {durationMin || durationMax ? `${durationMin || '?'}–${durationMax || '?'} months` : '—'}
                </strong>
              </div>
            </div>

            {researchAreasText && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-500 mb-2">Research Areas</p>
                <div className="flex flex-wrap gap-2">
                  {csvToArray(researchAreasText).map((r) => (
                    <span key={r} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber font-semibold border border-amber/15">{r}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-500 mb-2">Eligibility</p>
              <p className="text-sm text-warm-gray-700 mb-1">
                <strong>Applicant Types:</strong>{' '}
                {applicantTypes.length > 0
                  ? applicantTypes.map((t) => APPLICANT_TYPE_OPTIONS.find((o) => o.value === t)?.label || t).join(', ')
                  : '—'}
              </p>
              <p className="text-sm text-warm-gray-700 mb-1">
                <strong>Geographic Scope:</strong> {geographicScope || '—'}
                {eligibleStatesText ? ` (${eligibleStatesText})` : ''}
              </p>
              {minOrgAge !== '' && (
                <p className="text-sm text-warm-gray-700 mb-1">
                  <strong>Minimum Organization Age:</strong> {minOrgAge} years
                </p>
              )}
              {eligibilityRulesText && (
                <p className="text-sm text-warm-gray-700 whitespace-pre-line mt-2 p-3 rounded-[10px] bg-cream border border-warm-gray-200">
                  {eligibilityRulesText}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-500 mb-2">
                Evaluation Criteria (Total: {weightTotal}/100)
              </p>
              {criteria.filter((c) => c.label.trim()).length === 0 ? (
                <p className="text-sm text-warm-gray-400">No evaluation criteria defined yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {criteria
                      .filter((c) => c.label.trim())
                      .map((c, idx) => (
                        <tr key={idx} className="border-b border-warm-gray-100">
                          <td className="py-1.5 text-warm-gray-700">{c.label}</td>
                          <td className="py-1.5 text-right font-semibold text-warm-gray-900">{c.weight || 0}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            {currentProgram?.document?.fileUrl && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-warm-gray-500 mb-2">Document</p>
                <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-amber hover:underline">
                  📄 {currentProgram.document.fileName} →
                </a>
              </div>
            )}

            {publishErrors.length > 0 && (
              <div className="p-3 rounded-[10px] bg-red-50 border border-red-200 text-xs text-red-700">
                <p className="font-semibold mb-1.5">⚠️ Cannot publish — please fix:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {publishErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {error && (
              <div className="p-3 rounded-[10px] bg-red-50 border border-red-200 text-xs text-red-700">⚠️ {error}</div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-warm-gray-100">
              <button
                onClick={() => setMode('edit')}
                className="px-4 py-2 rounded-[10px] text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100 transition-colors cursor-pointer"
              >
                Back to Edit
              </button>
              {currentProgram && ['Draft', 'Upcoming'].includes(currentProgram.status) && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="px-5 py-2.5 rounded-[10px] bg-amber hover:bg-amber-light text-white text-xs font-semibold shadow-soft transition-all cursor-pointer disabled:opacity-60"
                >
                  {publishing ? 'Publishing…' : 'Confirm & Publish'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}