import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { STATUS_TONE, formatDate } from './ProposalDocumentView'

// ─── Shared modal shell (also used for the organization details popup) ───
// Rendered through a portal into <body>: the agency layout's <main> creates its
// own stacking context (relative z-10), which would otherwise trap the dialog
// underneath the sticky top bar (z-40).
export function ModalShell({ onClose, size = 'md', children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Lock page scroll behind the dialog
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const widths = { md: 'max-w-md', lg: 'max-w-3xl', xl: 'max-w-5xl' }

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex max-h-[94vh] w-full ${widths[size]} animate-fade-up flex-col overflow-hidden rounded-[20px] border border-warm-gray-200/60 bg-surface-elevated shadow-medium`}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

// ─── Helpers ───
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NOTES = 5000

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

// "₹25,00,000", "25 Lakh", "1.5 Cr" → number
const parseAmount = (value) => {
  if (typeof value === 'number') return value
  if (!value) return 0
  const s = String(value).toLowerCase().replace(/,/g, '')
  const m = s.match(/(\d+(\.\d+)?)/)
  if (!m) return 0
  let n = parseFloat(m[1])
  if (/crore|\bcr\b/.test(s)) n *= 1e7
  else if (/lakh|\blac\b|\bl\b/.test(s)) n *= 1e5
  return Math.round(n)
}

const toLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayISO = () => toLocalISO(new Date())
const addDaysISO = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toLocalISO(d)
}

const PRIORITIES = [
  { key: 'Minor', desc: 'Small clarifications', active: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
  { key: 'Moderate', desc: 'Substantive updates needed', active: 'border-amber-400 bg-amber-50 text-amber-900' },
  { key: 'Major', desc: 'Significant rework required', active: 'border-rose-400 bg-rose-50 text-rose-800' },
]

const REVISION_TEMPLATES = [
  'Clarify the research methodology and experimental design.',
  'Provide a detailed budget breakdown with justification for each head.',
  'Update the project timeline and milestones.',
  'Add supporting references and prior-work citations.',
  'Provide the missing supporting documents and clearances.',
  'Describe expected outcomes and measurable deliverables.',
]

const REJECT_REASONS = [
  'Outside the scope of the call',
  'Eligibility criteria not met',
  'Insufficient scientific merit',
  'Budget not adequately justified',
  'Incomplete documentation',
  'Other',
]

const META = {
  revisions: {
    icon: '📝',
    title: 'Request Revisions',
    subtitle: 'Tell the organization exactly what to improve, by when, and who to contact.',
    submit: 'Send Revision Request',
    button: 'bg-amber-600 hover:bg-amber-700',
    next: [
      'The organization is notified instantly on their tracking dashboard.',
      'They can edit the proposal and resubmit it for your review.',
      'Your contact details are shown alongside this request.',
      'Click Resume Evaluation when you are ready to continue the review.',
    ],
  },
  reject: {
    icon: '⛔',
    title: 'Reject Proposal',
    subtitle: 'The reason you give is shared with the organization.',
    submit: 'Confirm Rejection',
    button: 'bg-rose-600 hover:bg-rose-700',
    next: [
      'This decision is final and cannot be changed afterwards.',
      'The organization is notified instantly with your reason.',
    ],
  },
  award: {
    icon: '🏆',
    title: 'Award Grant',
    subtitle: 'Record the sanction. The organization sees these details immediately.',
    submit: 'Confirm Award',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    next: [
      'The sanction details appear on the organization’s dashboard.',
      'The amount is deducted from the programme’s remaining fund pool.',
      'This decision is final and cannot be changed afterwards.',
    ],
  },
}

const inputCls =
  'w-full rounded-[10px] border border-warm-gray-200 bg-white px-3.5 py-2.5 text-sm text-warm-gray-900 placeholder:text-warm-gray-400 focus:border-amber/40 focus:outline-none focus:ring-2 focus:ring-amber/25'

function Field({ label, required, hint, children }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold text-warm-gray-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-warm-gray-400">{hint}</span>}
    </div>
  )
}

export default function AgencyDecisionModal({ type, proposal, programFunding, reviewer, onClose, onSubmit }) {
  const meta = META[type]
  const sections = proposal.sections || []
  const org = proposal.organization || {}
  const orgContact = org.contactPerson || {}
  const refId = proposal.agencySubmission?.agencySubmissionId
  const round = (proposal.trackingTimeline || []).filter((t) => t.stage === 'Revisions Requested').length + 1
  const requested = parseAmount(proposal.fundingAmount)
  const remaining = programFunding?.budget > 0 ? programFunding.remaining : null

  // Form state
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState('Moderate')
  const [dueDate, setDueDate] = useState('')
  const [picked, setPicked] = useState([])
  const [category, setCategory] = useState('')
  const [award, setAward] = useState({ amount: '', order: '', start: '', months: '' })
  const [contact, setContact] = useState({
    name: reviewer?.name || '',
    designation: reviewer?.designation || '',
    email: reviewer?.email || '',
    phone: reviewer?.phone || '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggleSection = (title) =>
    setPicked((prev) => (prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]))

  const addTemplate = (text) =>
    setNotes((prev) => (prev.trim() ? `${prev.replace(/\s+$/, '')}\n• ${text}` : `• ${text}`))

  // What the organization will see (revisions)
  const preview = [
    `Revision round ${round} • Priority: ${priority}${dueDate ? ` • Response due: ${formatDate(dueDate)}` : ''}`,
    picked.length ? `Sections to revise: ${picked.join('; ')}` : '',
    notes.trim() ? `Note from agency: ${notes.trim()}` : '',
    contact.name.trim()
      ? `Contact for queries: ${[
          contact.designation.trim() ? `${contact.name.trim()} (${contact.designation.trim()})` : contact.name.trim(),
          contact.email.trim(),
          contact.phone.trim(),
        ]
          .filter(Boolean)
          .join(' • ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const validate = () => {
    const email = contact.email.trim()
    if (type === 'revisions') {
      if (notes.trim().length < 10) return 'Please describe the revisions in a little more detail (at least 10 characters).'
      if (!contact.name.trim()) return 'Add the contact person’s name so the organization knows who to reach out to.'
      if (!email && !contact.phone.trim()) return 'Add an email or phone number for the contact person.'
      if (dueDate && dueDate < todayISO()) return 'The response due date cannot be in the past.'
    }
    if (type === 'reject' && !notes.trim()) return 'Please provide the reason for rejection.'
    if (email && !EMAIL_RE.test(email)) return 'Enter a valid contact email address.'
    if (type === 'award') {
      const amount = Number(award.amount)
      if (!amount || amount <= 0) return 'Enter a valid award amount.'
      if (remaining !== null && amount > remaining) {
        return `This exceeds the remaining fund pool (${formatINR(remaining)} left).`
      }
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setSubmitting(true)

    const contactPayload = {
      name: contact.name.trim(),
      designation: contact.designation.trim(),
      email: contact.email.trim(),
      phone: contact.phone.trim(),
    }

    let payload
    if (type === 'revisions') {
      payload = {
        status: 'Revisions Requested',
        notes: notes.trim(),
        priority,
        dueDate: dueDate || undefined,
        sections: picked,
        contact: contactPayload,
      }
    } else if (type === 'reject') {
      payload = {
        status: 'Rejected',
        notes: category ? `[${category}] ${notes.trim()}` : notes.trim(),
        contact: contactPayload,
      }
    } else {
      payload = {
        status: 'Awarded',
        notes: notes.trim(),
        awardAmount: Number(award.amount),
        sanctionOrderNumber: award.order.trim(),
        startDate: award.start || undefined,
        durationMonths: award.months ? Number(award.months) : undefined,
        sanctionNotes: notes.trim(),
        contact: contactPayload,
      }
    }

    const message = await onSubmit(payload)
    setSubmitting(false)
    if (message) setError(message)
  }

  return (
    <ModalShell onClose={() => !submitting && onClose()} size="xl">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-warm-gray-200/70 px-6 py-5 sm:px-8">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-amber-50 text-2xl">
              {meta.icon}
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-2xl font-bold text-warm-gray-900">{meta.title}</h2>
              <p className="mt-0.5 text-sm text-warm-gray-500">{meta.subtitle}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="max-w-[420px] truncate text-sm font-semibold text-warm-gray-800">{proposal.title}</span>
                {refId && (
                  <span className="rounded bg-warm-gray-100 px-2 py-0.5 font-mono text-xs font-bold text-warm-gray-700">
                    Ref: {refId}
                  </span>
                )}
                <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[proposal.status] || ''}`}>
                  {proposal.status}
                </span>
                {type === 'revisions' && (
                  <span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    Revision round {round}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="cursor-pointer p-1 text-lg font-bold text-warm-gray-400 hover:text-warm-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* ── Left: the decision itself ── */}
            <div className="space-y-6 lg:col-span-3">
              {type === 'revisions' && (
                <>
                  <Field label="Priority">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setPriority(p.key)}
                          className={`cursor-pointer rounded-[12px] border px-3 py-2.5 text-left transition-colors ${
                            priority === p.key
                              ? p.active
                              : 'border-warm-gray-200 bg-white text-warm-gray-600 hover:bg-warm-gray-50'
                          }`}
                        >
                          <span className="block text-sm font-bold">{p.key}</span>
                          <span className="block text-[11px] opacity-80">{p.desc}</span>
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Response due by" hint="Optional. Shown to the organization with your request.">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        min={todayISO()}
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className={`${inputCls} sm:w-52`}
                      />
                      {[7, 14, 30].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setDueDate(addDaysISO(n))}
                          className="cursor-pointer rounded-full border border-warm-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100"
                        >
                          +{n} days
                        </button>
                      ))}
                      {dueDate && (
                        <button
                          type="button"
                          onClick={() => setDueDate('')}
                          className="cursor-pointer text-xs font-semibold text-warm-gray-400 hover:text-warm-gray-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </Field>

                  {sections.length > 0 && (
                    <Field label="Sections that need revision" hint="Optional. Helps the organization focus on the right parts.">
                      <div className="rounded-[12px] border border-warm-gray-200 bg-white">
                        <div className="flex items-center justify-between border-b border-warm-gray-100 px-3.5 py-2">
                          <span className="text-xs text-warm-gray-500">
                            {picked.length} of {sections.length} selected
                          </span>
                          <div className="flex gap-3 text-xs font-semibold">
                            <button
                              type="button"
                              onClick={() => setPicked(sections.map((s) => s.title))}
                              className="cursor-pointer text-amber hover:underline"
                            >
                              Select all
                            </button>
                            <button
                              type="button"
                              onClick={() => setPicked([])}
                              className="cursor-pointer text-warm-gray-400 hover:text-warm-gray-700"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
                          {sections.map((s) => (
                            <label
                              key={s.sectionKey}
                              className="flex cursor-pointer items-start gap-2 rounded-[8px] px-2 py-1.5 text-[13px] text-warm-gray-700 hover:bg-cream"
                            >
                              <input
                                type="checkbox"
                                checked={picked.includes(s.title)}
                                onChange={() => toggleSection(s.title)}
                                className="mt-0.5 accent-amber"
                              />
                              <span>{s.title}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </Field>
                  )}
                </>
              )}

              {type === 'reject' && (
                <Field label="Reason category" hint="Optional. Added to the start of your message.">
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                    <option value="">Select a reason…</option>
                    {REJECT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {type === 'award' && (
                <div className="space-y-5">
                  <div className="rounded-[12px] border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      <span>
                        Requested: <strong>{proposal.fundingAmount || '—'}</strong>
                      </span>
                      {programFunding?.budget > 0 && (
                        <>
                          <span>
                            Programme pool: <strong>{formatINR(programFunding.budget)}</strong>
                          </span>
                          <span>
                            Remaining: <strong>{formatINR(programFunding.remaining)}</strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <Field label="Award amount (₹)" required>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={award.amount}
                        onChange={(e) => setAward({ ...award, amount: e.target.value })}
                        className={`${inputCls} sm:w-64`}
                        placeholder="e.g. 2500000"
                      />
                      {requested > 0 && (remaining === null || requested <= remaining) && (
                        <button
                          type="button"
                          onClick={() => setAward({ ...award, amount: String(requested) })}
                          className="cursor-pointer rounded-full border border-warm-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-warm-gray-600 hover:bg-warm-gray-100"
                        >
                          Use requested ({formatINR(requested)})
                        </button>
                      )}
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Sanction order no.">
                      <input
                        value={award.order}
                        onChange={(e) => setAward({ ...award, order: e.target.value })}
                        className={inputCls}
                        placeholder="UGC/2026/…"
                      />
                    </Field>
                    <Field label="Project start date">
                      <input
                        type="date"
                        value={award.start}
                        onChange={(e) => setAward({ ...award, start: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Duration (months)">
                      <input
                        type="number"
                        min="1"
                        value={award.months}
                        onChange={(e) => setAward({ ...award, months: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* Notes (all types) */}
              <Field
                label={
                  type === 'revisions'
                    ? 'Revision details'
                    : type === 'reject'
                    ? 'Reason (shared with the organization)'
                    : 'Sanction notes'
                }
                required={type !== 'award'}
              >
                {type === 'revisions' && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {REVISION_TEMPLATES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => addTemplate(t)}
                        className="cursor-pointer rounded-full border border-warm-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-warm-gray-600 hover:bg-amber-50 hover:text-amber"
                      >
                        + {t.split(' ').slice(0, 3).join(' ')}…
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  rows={type === 'revisions' ? 9 : 6}
                  maxLength={MAX_NOTES}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    type === 'revisions'
                      ? '• Clarify the budget breakdown for equipment procurement.\n• Provide an updated timeline with milestones.'
                      : type === 'reject'
                      ? 'Explain why the proposal was not selected.'
                      : 'Conditions, reporting requirements, disbursement schedule…'
                  }
                  className={`${inputCls} resize-y leading-relaxed`}
                />
                <span className="mt-1 block text-right text-[11px] text-warm-gray-400">
                  {notes.length} / {MAX_NOTES}
                </span>
              </Field>

              {type === 'revisions' && (
                <details className="rounded-[12px] border border-warm-gray-200 bg-cream/50">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-warm-gray-700">
                    Preview what the organization will see
                  </summary>
                  <pre className="whitespace-pre-wrap px-4 pb-4 font-body text-[13px] leading-relaxed text-warm-gray-700">
                    {preview}
                  </pre>
                </details>
              )}
            </div>

            {/* ── Right: who / context ── */}
            <aside className="space-y-5 lg:col-span-2">
              <div className="rounded-[14px] border border-warm-gray-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">
                  {type === 'revisions' ? 'Requested by' : 'Decision recorded by'}
                </h3>
                <p className="mb-4 mt-1 text-xs text-warm-gray-500">
                  {reviewer?.agencyName ? `${reviewer.agencyName} • ` : ''}Shared with the organization so they know who to contact.
                </p>
                <div className="space-y-3">
                  <Field label="Name" required={type === 'revisions'}>
                    <input
                      value={contact.name}
                      onChange={(e) => setContact({ ...contact, name: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Designation">
                    <input
                      value={contact.designation}
                      onChange={(e) => setContact({ ...contact, designation: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. Programme Officer"
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-3">
                    <Field label="Email" required={type === 'revisions'}>
                      <input
                        type="email"
                        value={contact.email}
                        onChange={(e) => setContact({ ...contact, email: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Phone">
                      <input
                        value={contact.phone}
                        onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                        className={inputCls}
                        placeholder="+91 …"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="rounded-[14px] border border-warm-gray-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">Will be sent to</h3>
                <p className="mt-2 text-sm font-bold text-warm-gray-900">{org.organizationName || 'Unknown institution'}</p>
                {orgContact.name || orgContact.email || orgContact.phone ? (
                  <dl className="mt-2 space-y-1 text-[13px] text-warm-gray-600">
                    {orgContact.name && (
                      <div>
                        {orgContact.name}
                        {orgContact.designation ? ` • ${orgContact.designation}` : ''}
                      </div>
                    )}
                    {orgContact.email && <div>{orgContact.email}</div>}
                    {orgContact.phone && <div>{orgContact.phone}</div>}
                  </dl>
                ) : (
                  <p className="mt-2 text-xs text-warm-gray-400">No contact person on file.</p>
                )}
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-warm-gray-100 pt-4 text-xs">
                  <div>
                    <dt className="font-bold uppercase tracking-wider text-warm-gray-400">Programme</dt>
                    <dd className="mt-0.5 font-semibold text-warm-gray-800">
                      {proposal.grantProgram?.title || proposal.grantTitle || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-wider text-warm-gray-400">Requested</dt>
                    <dd className="mt-0.5 font-semibold text-warm-gray-800">{proposal.fundingAmount || '—'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-[14px] border border-amber/20 bg-amber-50/60 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber">What happens next</h3>
                <ul className="mt-2 space-y-1.5 text-[13px] text-warm-gray-700">
                  {meta.next.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-amber">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-warm-gray-200/70 bg-surface-elevated px-6 py-4 sm:px-8">
          {error && (
            <div className="mb-3 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="cursor-pointer rounded-[10px] px-5 py-2.5 text-sm font-semibold text-warm-gray-600 hover:bg-warm-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`cursor-pointer rounded-[10px] px-6 py-2.5 text-sm font-bold text-white shadow-soft disabled:opacity-60 ${meta.button}`}
            >
              {submitting ? 'Saving…' : meta.submit}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}