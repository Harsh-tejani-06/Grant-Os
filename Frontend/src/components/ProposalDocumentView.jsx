import { useMemo } from 'react'

// ─── Shared helpers ───
export const wordCount = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length

export const formatDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const STATUS_TONE = {
  'Submitted to Agency': 'bg-blue-50 text-blue-700 border-blue-200',
  Submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  'Under Evaluation': 'bg-purple-50 text-purple-700 border-purple-200',
  'Revisions Requested': 'bg-amber-50 text-amber-800 border-amber-200',
  Awarded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  'Not Awarded': 'bg-red-50 text-red-700 border-red-200',
}

// ─── Plain-text → structured blocks ───
// Section content is typed into a plain textarea, so the applicant's formatting
// is expressed with blank lines, "•" / "-" bullets and "1." lists. We turn that
// into paragraphs, lists and sub-headings. Everything is rendered as React text
// nodes (never HTML), so content can never inject markup.
const BULLET_RE = /^\s*[•●▪◦‣\-–*]\s+(.*)$/
const NUMBERED_RE = /^\s*\d{1,2}[.)]\s+(.*)$/

export function parseContent(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let para = []
  let list = null

  const flushPara = () => {
    if (!para.length) return
    const joined = para.join('\n').trim()
    if (joined) {
      const isHeading = !joined.includes('\n') && joined.length <= 90 && /:$/.test(joined)
      blocks.push(isHeading ? { type: 'h', text: joined.replace(/:$/, '') } : { type: 'p', text: joined })
    }
    para = []
  }
  const flushList = () => {
    if (list) {
      blocks.push(list)
      list = null
    }
  }

  lines.forEach((raw) => {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) {
      flushPara()
      flushList()
      return
    }
    const b = line.match(BULLET_RE)
    const n = !b && line.match(NUMBERED_RE)
    if (b || n) {
      flushPara()
      const type = b ? 'ul' : 'ol'
      if (!list || list.type !== type) {
        flushList()
        list = { type, items: [] }
      }
      list.items.push((b || n)[1].trim())
      return
    }
    // Indented continuation of the previous list item
    if (list && /^\s{2,}\S/.test(raw)) {
      list.items[list.items.length - 1] += ' ' + line.trim()
      return
    }
    flushList()
    para.push(line)
  })
  flushPara()
  flushList()
  return blocks
}

export function ContentBlocks({ text }) {
  const blocks = useMemo(() => parseContent(text), [text])

  if (blocks.length === 0) {
    return <p className="text-[15px] italic text-warm-gray-400">Not provided by the applicant.</p>
  }

  return (
    <div>
      {blocks.map((b, i) => {
        if (b.type === 'h') {
          return (
            <h4 key={i} className="mt-8 mb-3 text-[17px] font-bold text-warm-gray-900">
              {b.text}
            </h4>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="mb-5 space-y-2.5">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-3 text-[16px] leading-8 text-warm-gray-800">
                  <span className="mt-[14px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )
        }
        if (b.type === 'ol') {
          return (
            <ol key={i} className="mb-5 space-y-2.5">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-3 text-[16px] leading-8 text-warm-gray-800">
                  <span className="w-6 shrink-0 text-right font-bold text-amber">{j + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          )
        }
        return (
          <p key={i} className="mb-5 whitespace-pre-line text-[16px] leading-8 text-warm-gray-800">
            {b.text}
          </p>
        )
      })}
    </div>
  )
}

// ─── Sidebar table of contents ───
export function SectionNav({ sections, activeKey, onSelect }) {
  return (
    <nav aria-label="Proposal sections">
      <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-warm-gray-400">Contents</p>
      <ul className="space-y-0.5">
        {sections.map((s) => {
          const words = wordCount(s.content)
          const active = s.sectionKey === activeKey
          return (
            <li key={s.sectionKey}>
              <button
                type="button"
                onClick={() => onSelect(s.sectionKey)}
                className={`flex w-full cursor-pointer items-start justify-between gap-2 rounded-[10px] px-3 py-2 text-left text-[13px] transition-colors ${
                  active ? 'bg-amber-50 font-bold text-amber' : 'text-warm-gray-600 hover:bg-warm-gray-100'
                }`}
              >
                <span className="leading-snug">{s.title}</span>
                <span className={`shrink-0 text-[11px] font-medium ${words ? 'text-warm-gray-400' : 'text-rose-400'}`}>
                  {words ? `${words}w` : 'empty'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// ─── The proposal "paper" ───
export default function ProposalDocument({ proposal }) {
  const sections = proposal.sections || []
  const org = proposal.organization || {}
  const totalWords = useMemo(() => sections.reduce((n, s) => n + wordCount(s.content), 0), [sections])
  const submittedOn = proposal.agencySubmission?.submittedAt || proposal.submittedAt || proposal.createdAt

  const meta = [
    ['Applicant institution', org.organizationName],
    ['Prepared by', proposal.createdByName],
    ['Funding programme', proposal.grantProgram?.title || proposal.grantTitle],
    ['Funding agency', proposal.grantAgency],
    ['Amount requested', proposal.fundingAmount],
    ['Submitted on', formatDate(submittedOn)],
    ['Agency reference ID', proposal.agencySubmission?.agencySubmissionId],
    ['Programme deadline', formatDate(proposal.deadline)],
  ].filter(([, value]) => value)

  return (
    <article className="mx-auto max-w-4xl rounded-[18px] border border-warm-gray-200/70 bg-white px-6 py-10 shadow-soft sm:px-12 sm:py-14">
      {/* Cover block */}
      <header className="mb-12 border-b border-warm-gray-200 pb-10">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-amber">Research Proposal</p>
        <h1 className="font-heading text-3xl font-bold leading-tight text-warm-gray-900 sm:text-4xl">
          {proposal.title}
        </h1>
        {org.organizationName && <p className="mt-3 text-lg text-warm-gray-600">{org.organizationName}</p>}

        <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {meta.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-warm-gray-400">{label}</dt>
              <dd className="mt-1 text-[15px] font-semibold text-warm-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 text-xs text-warm-gray-400">
          {sections.length} sections • {totalWords.toLocaleString('en-IN')} words • Submitted via GrantIQ
        </p>
      </header>

      {/* Sections */}
      {sections.length === 0 ? (
        <p className="py-10 text-center text-sm text-warm-gray-400">No sections available.</p>
      ) : (
        sections.map((s, idx) => (
          <section
            key={s.sectionKey}
            id={`doc-${s.sectionKey}`}
            data-section-key={s.sectionKey}
            className={`scroll-mt-6 ${idx === 0 ? '' : 'pt-12'}`}
          >
            <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-warm-gray-200 pb-3">
              <h3 className="font-heading text-2xl font-bold leading-snug text-warm-gray-900">{s.title}</h3>
              <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-warm-gray-400">
                {wordCount(s.content)} / {s.wordCountLimit} words
              </span>
            </div>
            <ContentBlocks text={s.content} />
          </section>
        ))
      )}
    </article>
  )
}

// ─── Print / Save as PDF ───
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const blocksToHtml = (text) => {
  const blocks = parseContent(text)
  if (!blocks.length) return '<p class="empty">Not provided by the applicant.</p>'
  return blocks
    .map((b) => {
      if (b.type === 'h') return `<h4>${esc(b.text)}</h4>`
      if (b.type === 'p') return `<p>${esc(b.text)}</p>`
      return `<${b.type}>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</${b.type}>`
    })
    .join('')
}

// Opens a clean, print-styled copy of the proposal. Returns false if the
// browser blocked the pop-up.
export function printProposal(proposal) {
  const w = window.open('', '_blank')
  if (!w) return false

  const org = proposal.organization || {}
  const sections = proposal.sections || []
  const submittedOn = proposal.agencySubmission?.submittedAt || proposal.submittedAt || proposal.createdAt

  const meta = [
    ['Applicant institution', org.organizationName],
    ['Prepared by', proposal.createdByName],
    ['Funding programme', proposal.grantProgram?.title || proposal.grantTitle],
    ['Amount requested', proposal.fundingAmount],
    ['Submitted on', formatDate(submittedOn)],
    ['Agency reference ID', proposal.agencySubmission?.agencySubmissionId],
  ].filter(([, v]) => v)

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(proposal.title)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1c1917; max-width: 780px; margin: 32px auto; padding: 0 24px; line-height: 1.7; font-size: 14px; }
  .eyebrow { font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #b45309; font-weight: 700; }
  h1 { font-size: 28px; line-height: 1.25; margin: 8px 0 4px; }
  .org { color: #57534e; font-size: 16px; margin-bottom: 18px; }
  table.meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  table.meta td { padding: 6px 0; vertical-align: top; font-size: 13px; }
  table.meta td.k { width: 190px; color: #78716c; font-family: Arial, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
  hr { border: none; border-top: 1px solid #d6d3d1; margin: 22px 0; }
  h2 { font-size: 19px; border-bottom: 1px solid #e7e5e4; padding-bottom: 6px; margin: 30px 0 14px; }
  h2 small { float: right; font-family: Arial, sans-serif; font-size: 11px; color: #a8a29e; font-weight: 400; }
  h4 { font-size: 15px; margin: 18px 0 6px; }
  p { white-space: pre-line; margin: 0 0 12px; }
  ul, ol { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 5px; }
  .empty { color: #a8a29e; font-style: italic; }
  .foot { margin-top: 36px; font-family: Arial, sans-serif; font-size: 11px; color: #a8a29e; text-align: center; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <div class="eyebrow">Research Proposal</div>
  <h1>${esc(proposal.title)}</h1>
  ${org.organizationName ? `<div class="org">${esc(org.organizationName)}</div>` : ''}
  <table class="meta">
    ${meta.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
  </table>
  <hr />
  ${sections
    .map(
      (s) =>
        `<h2>${esc(s.title)}<small>${wordCount(s.content)} / ${esc(s.wordCountLimit)} words</small></h2>${blocksToHtml(s.content)}`
    )
    .join('')}
  <div class="foot">Confidential — submitted via GrantIQ</div>
</body>
</html>`

  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
  return true
}