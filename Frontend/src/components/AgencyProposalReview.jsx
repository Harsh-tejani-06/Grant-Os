import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ProposalDocument, { SectionNav, STATUS_TONE, formatDate, wordCount, printProposal } from './ProposalDocumentView'

const AWARDED = ['Awarded', 'Accepted']

const formatDateTime = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatINR = (n) => (n === null || n === undefined ? '—' : `₹${Number(n).toLocaleString('en-IN')}`)

const titleCase = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// Organization fields can be strings, numbers, arrays or small objects.
const asText = (v) => {
  if (v === null || v === undefined || v === '') return ''
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(', ')
  if (typeof v === 'object') return Object.values(v).map(asText).filter(Boolean).join(' • ')
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

const CHECKLIST_LABELS = {
  endorsementLetter: 'Institutional endorsement letter',
  investigatorCvs: 'Investigator CVs',
  ethicalClearance: 'Ethical clearance',
  biosafetyClearance: 'Biosafety clearance',
  financeAudit: 'Finance audit',
  conflictOfInterest: 'Conflict-of-interest declaration',
}

function Card({ title, children }) {
  return (
    <section className="rounded-[16px] border border-warm-gray-200/70 bg-surface-elevated p-6 shadow-soft">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-warm-gray-400">{title}</h3>
      {children}
    </section>
  )
}

function Fact({ label, children }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-warm-gray-400">{label}</dt>
      <dd className="mt-1 text-[15px] font-semibold text-warm-gray-900">{children}</dd>
    </div>
  )
}

export default function AgencyProposalReview({ data, loading, actions, onClose, onViewOrg }) {
  const proposal = data.proposal
  const programFunding = data.programFunding
  const sections = proposal.sections || []
  const org = proposal.organization || {}
  const timeline = proposal.trackingTimeline || []

  const [tab, setTab] = useState('document')
  const [activeKey, setActiveKey] = useState(sections[0]?.sectionKey || '')
  const [printMsg, setPrintMsg] = useState('')
  const scrollRef = useRef(null)

  // Lock page scroll behind the full-screen workspace
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Highlight the section currently being read
  useEffect(() => {
    const root = scrollRef.current
    if (!root || tab !== 'document') return undefined
    const els = [...root.querySelectorAll('[data-section-key]')]
    if (els.length === 0) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveKey(visible[0].target.dataset.sectionKey)
      },
      { root, rootMargin: '0px 0px -70% 0px', threshold: 0 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [tab, sections.length])

  const jumpTo = (key) => {
    const el = scrollRef.current?.querySelector(`[data-section-key="${CSS.escape(key)}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveKey(key)
  }

  const handlePrint = () => {
    const ok = printProposal(proposal)
    setPrintMsg(ok ? '' : 'Pop-up blocked. Allow pop-ups for this site to print or save as PDF.')
  }

  const totalWords = sections.reduce((n, s) => n + wordCount(s.content), 0)
  const filled = sections.filter((s) => wordCount(s.content) > 0).length
  const ref = proposal.agencySubmission?.agencySubmissionId

  const address = org.address
    ? [org.address.street, org.address.city, org.address.state, org.address.pincode, org.address.country]
        .filter(Boolean)
        .join(', ')
    : ''

  const orgFacts = [
    ['Institution type', titleCase(org.organizationType)],
    ['Registration no.', org.registrationNumber],
    ['Established', org.establishedYear],
    ['NAAC accreditation', asText(org.naacAccreditation)],
    ['UGC recognition', asText(org.ugcRecognition)],
    ['Total faculty', asText(org.totalFaculty)],
    ['PhD scholars', asText(org.totalPhDScholars)],
    ['Focus areas', asText(org.focusAreas)],
  ].filter(([, v]) => v)

  const tabs = [
    { key: 'document', label: 'Proposal Document' },
    { key: 'applicant', label: 'Applicant & Compliance' },
    { key: 'activity', label: `Activity & Timeline${timeline.length ? ` (${timeline.length})` : ''}` },
  ]

  // Rendered through a portal into <body>: the agency layout's <main> creates its
  // own stacking context (relative z-10), which would otherwise trap this
  // full-screen workspace underneath the sticky top bar (z-40).
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-cream">
      {/* ─── Top bar ─── */}
      <header className="shrink-0 border-b border-warm-gray-200/70 bg-surface-elevated">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[10px] border border-warm-gray-200 px-3 py-2 text-xs font-semibold text-warm-gray-700 hover:bg-warm-gray-100"
          >
            ← Back to proposals
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[proposal.status] || 'border-warm-gray-200 bg-warm-gray-100 text-warm-gray-600'}`}>
                {proposal.status}
              </span>
              {ref && (
                <span className="rounded bg-warm-gray-100 px-2 py-0.5 font-mono text-xs font-bold text-warm-gray-700">
                  Ref: {ref}
                </span>
              )}
            </div>
            <h2 className="mt-1 truncate font-heading text-lg font-bold text-warm-gray-900">{proposal.title}</h2>
            <p className="truncate text-xs text-warm-gray-500">
              {org.organizationName || 'Unknown institution'} • {proposal.grantProgram?.title || proposal.grantTitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={sections.length === 0}
              className="cursor-pointer rounded-[8px] border border-warm-gray-200 bg-cream px-3 py-2 text-xs font-semibold text-warm-gray-700 hover:bg-cream-dark disabled:opacity-50"
            >
              🖨️ Print / Save PDF
            </button>
            {actions}
          </div>
        </div>

        {printMsg && (
          <div className="border-t border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-900">{printMsg}</div>
        )}

        <div className="flex gap-1 overflow-x-auto px-4 sm:px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`cursor-pointer whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? 'border-amber text-amber'
                  : 'border-transparent text-warm-gray-500 hover:text-warm-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ─── Body: fills all remaining height; each pane scrolls on its own ─── */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          {loading && sections.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-warm-gray-500">
              Loading the full proposal…
            </div>
          ) : (
            <>
              {tab === 'document' && (
                <div className="grid h-full grid-rows-[minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
                  <aside className="hidden min-h-0 overflow-y-auto border-r border-warm-gray-200/70 bg-surface-elevated p-4 lg:block">
                    <div className="mb-5 rounded-[12px] bg-cream/70 p-3.5 text-xs text-warm-gray-600">
                      <p className="font-bold text-warm-gray-900">Document overview</p>
                      <p className="mt-1">
                        {filled} of {sections.length} sections completed
                      </p>
                      <p>{totalWords.toLocaleString('en-IN')} words in total</p>
                    </div>
                    <SectionNav sections={sections} activeKey={activeKey} onSelect={jumpTo} />
                  </aside>

                  <div ref={scrollRef} className="min-h-0 overflow-y-auto px-4 py-8 sm:px-8">
                    <ProposalDocument proposal={proposal} />
                    <div className="h-16" />
                  </div>
                </div>
              )}

              {tab === 'applicant' && (
                <div className="h-full overflow-y-auto px-4 py-8 sm:px-8">
                  <div className="mx-auto max-w-5xl space-y-6">
                    <Card title="Applicant institution">
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <h4 className="font-heading text-2xl font-bold text-warm-gray-900">
                          {org.organizationName || 'Unknown institution'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => onViewOrg(org)}
                          className="cursor-pointer text-xs font-semibold text-amber hover:underline"
                        >
                          Open full organization details →
                        </button>
                      </div>
                      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                        {orgFacts.map(([label, value]) => (
                          <Fact key={label} label={label}>
                            {value}
                          </Fact>
                        ))}
                        {org.website && (
                          <Fact label="Website">
                            {/^https?:\/\//i.test(org.website) ? (
                              <a href={org.website} target="_blank" rel="noopener noreferrer" className="break-all text-amber hover:underline">
                                {org.website}
                              </a>
                            ) : (
                              org.website
                            )}
                          </Fact>
                        )}
                        {address && <Fact label="Address">{address}</Fact>}
                      </dl>
                    </Card>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <Card title="Contact person at the institution">
                        {org.contactPerson?.name || org.contactPerson?.email || org.contactPerson?.phone ? (
                          <dl className="space-y-4">
                            {org.contactPerson.name && (
                              <Fact label="Name">
                                {org.contactPerson.name}
                                {org.contactPerson.designation ? ` • ${org.contactPerson.designation}` : ''}
                              </Fact>
                            )}
                            {org.contactPerson.email && <Fact label="Email">{org.contactPerson.email}</Fact>}
                            {org.contactPerson.phone && <Fact label="Phone">{org.contactPerson.phone}</Fact>}
                          </dl>
                        ) : (
                          <p className="text-sm text-warm-gray-400">No contact person on file.</p>
                        )}
                      </Card>

                      <Card title="Funding request">
                        <dl className="space-y-4">
                          <Fact label="Amount requested">{proposal.fundingAmount || '—'}</Fact>
                          <Fact label="AI match score">
                            {proposal.aiScore !== null && proposal.aiScore !== undefined ? `${proposal.aiScore}%` : '—'}
                          </Fact>
                          {programFunding?.budget > 0 && (
                            <Fact label="Programme fund pool">
                              {formatINR(programFunding.budget)} total • {formatINR(programFunding.awarded)} awarded •{' '}
                              <span className="text-emerald-700">{formatINR(programFunding.remaining)} remaining</span>
                            </Fact>
                          )}
                        </dl>
                      </Card>
                    </div>

                    {AWARDED.includes(proposal.status) && proposal.awardDetails && (
                      <Card title="Sanction details">
                        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                          <Fact label="Sanctioned amount">
                            {proposal.awardDetails.sanctionedAmount || formatINR(proposal.awardAmount)}
                          </Fact>
                          <Fact label="Sanction order no.">{proposal.awardDetails.sanctionOrderNumber || '—'}</Fact>
                          <Fact label="Project start">{formatDate(proposal.awardDetails.startDate) || '—'}</Fact>
                          <Fact label="Duration">
                            {proposal.awardDetails.durationMonths ? `${proposal.awardDetails.durationMonths} months` : '—'}
                          </Fact>
                          {proposal.awardDetails.sanctionNotes && (
                            <div className="sm:col-span-2">
                              <Fact label="Notes">{proposal.awardDetails.sanctionNotes}</Fact>
                            </div>
                          )}
                        </dl>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <Card title="Eligibility checks">
                        <p className="mb-4 text-sm font-semibold">
                          {proposal.eligibilitySnapshot?.isEligible === true && (
                            <span className="text-emerald-700">✓ Meets the call’s eligibility criteria</span>
                          )}
                          {proposal.eligibilitySnapshot?.isEligible === false && (
                            <span className="text-rose-700">✗ Does not meet all eligibility criteria</span>
                          )}
                          {(proposal.eligibilitySnapshot?.isEligible === null ||
                            proposal.eligibilitySnapshot?.isEligible === undefined) && (
                            <span className="text-warm-gray-400">No eligibility snapshot recorded</span>
                          )}
                        </p>
                        <ul className="space-y-2.5">
                          {(proposal.eligibilitySnapshot?.checks || []).map((c, i) => (
                            <li key={i} className="flex gap-3 text-[15px]">
                              <span className={c.passed ? 'text-emerald-600' : 'text-rose-600'}>{c.passed ? '✓' : '✗'}</span>
                              <span className="text-warm-gray-800">{c.label}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>

                      <Card title="Pre-submission checklist">
                        <ul className="space-y-2.5">
                          {Object.entries(CHECKLIST_LABELS).map(([key, label]) => (
                            <li key={key} className="flex gap-3 text-[15px]">
                              <span className={proposal.preSubmissionChecklist?.[key] ? 'text-emerald-600' : 'text-warm-gray-300'}>
                                {proposal.preSubmissionChecklist?.[key] ? '✓' : '○'}
                              </span>
                              <span className="text-warm-gray-800">{label}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'activity' && (
                <div className="h-full overflow-y-auto px-4 py-8 sm:px-8">
                  <div className="mx-auto max-w-3xl">
                    <h3 className="mb-5 font-heading text-xl font-bold text-warm-gray-900">Tracking timeline</h3>
                    {timeline.length === 0 ? (
                      <p className="text-sm text-warm-gray-400">No tracking events yet.</p>
                    ) : (
                      <ol className="space-y-4">
                        {[...timeline].reverse().map((t, i) => {
                          const agency = t.source === 'funding_agency'
                          return (
                            <li
                              key={i}
                              className={`rounded-[14px] border p-5 ${
                                agency ? 'border-amber/30 bg-amber-50/50' : 'border-warm-gray-200/70 bg-surface-elevated'
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[15px] font-bold text-warm-gray-900">{t.stage}</span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                    agency ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
                                  }`}
                                >
                                  {agency ? 'Agency' : 'Organization'}
                                </span>
                                <span className="text-xs text-warm-gray-400">{formatDateTime(t.timestamp)}</span>
                              </div>
                              {t.notes && (
                                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-warm-gray-700">{t.notes}</p>
                              )}
                              {t.updatedBy && <p className="mt-2 text-xs text-warm-gray-400">by {t.updatedBy}</p>}
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}