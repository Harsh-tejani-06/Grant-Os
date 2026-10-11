import { useState, useMemo } from 'react'

// ─── Color Palette for Funding Agencies ───
export const AGENCY_COLORS = {
  DST: { bg: '#059669', light: '#ecfdf5', border: '#a7f3d0', text: '#065f46' }, // Emerald
  SERB: { bg: '#4f46e5', light: '#eef2ff', border: '#c7d2fe', text: '#3730a3' }, // Indigo
  AICTE: { bg: '#d97706', light: '#fffbeb', border: '#fde68a', text: '#92400e' }, // Amber
  DBT: { bg: '#0284c7', light: '#f0f9ff', border: '#bae6fd', text: '#075985' }, // Sky
  UGC: { bg: '#7c3aed', light: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6' }, // Purple
  ICMR: { bg: '#e11d48', light: '#fff1f2', border: '#fecdd3', text: '#9f1239' }, // Rose
  DRDO: { bg: '#0d9488', light: '#f0fdfa', border: '#99f6e4', text: '#115e59' }, // Teal
  CSIR: { bg: '#ea580c', light: '#fff7ed', border: '#fed7aa', text: '#9a3412' }, // Orange
  OTHER: { bg: '#64748b', light: '#f8fafc', border: '#e2e8f0', text: '#334155' }, // Slate
}

// Additional vibrant palettes for custom/private agencies
const FALLBACK_PALETTES = [
  { bg: '#0284c7', light: '#f0f9ff', border: '#bae6fd', text: '#075985' }, // Sky
  { bg: '#0d9488', light: '#f0fdfa', border: '#99f6e4', text: '#115e59' }, // Teal
  { bg: '#e11d48', light: '#fff1f2', border: '#fecdd3', text: '#9f1239' }, // Rose
  { bg: '#8b5cf6', light: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' }, // Violet
  { bg: '#64748b', light: '#f8fafc', border: '#e2e8f0', text: '#334155' }, // Slate
]

export const getAgencyColor = (agencyName = '') => {
  const norm = (agencyName || '').toUpperCase()
  for (const [key, val] of Object.entries(AGENCY_COLORS)) {
    if (key !== 'OTHER' && norm.includes(key)) return val
  }
  let hash = 0
  for (let i = 0; i < norm.length; i++) hash = (hash * 31 + norm.charCodeAt(i)) & 0xffffffff
  const idx = Math.abs(hash) % FALLBACK_PALETTES.length
  return FALLBACK_PALETTES[idx] || AGENCY_COLORS.OTHER
}

// ─── Helpers ───
export const formatLakhCrore = (num = 0) => {
  const val = Number(num) || 0
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`
  if (val > 0) return `₹${val.toLocaleString('en-IN')}`
  return '₹0'
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. FUNDING AGENCY CAPITAL ALLOCATION (INTERACTIVE DONUT CHART)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function FundingAgencyDonutChart({
  agencies = [],
  totalPipelineValue = 0,
  selectedAgency = 'all',
  onSelectAgency,
  formatCurrency = formatLakhCrore,
}) {
  const [hoveredAgency, setHoveredAgency] = useState(null)

  // Compute segments with angles and offsets
  const { segments, effectiveTotal } = useMemo(() => {
    const list = Array.isArray(agencies) ? agencies : []
    const sumVal = list.reduce((acc, a) => acc + (a.value || 0), 0)
    const effectiveTotal = sumVal > 0 ? sumVal : list.reduce((acc, a) => acc + (a.count || 0), 0) || 1

    const R = 64
    const C = 2 * Math.PI * R // ~402.12
    let currOffset = 0

    const segs = list.map((ag) => {
      const metricVal = sumVal > 0 ? ag.value || 0 : ag.count || 0
      const pct = (metricVal / effectiveTotal) * 100
      const sliceLen = Math.max(0, (metricVal / effectiveTotal) * C)
      const color = getAgencyColor(ag.name)

      const seg = {
        name: ag.name,
        value: ag.value || 0,
        count: ag.count || 0,
        awarded: ag.awarded || 0,
        pct: Math.round(pct),
        exactPct: pct,
        sliceLen,
        offset: currOffset,
        color,
      }
      currOffset += sliceLen
      return seg
    })

    return { segments: segs, effectiveTotal }
  }, [agencies])

  const activeAgencyName = hoveredAgency || (selectedAgency !== 'all' ? selectedAgency : null)
  const activeSegment = segments.find((s) => s.name === activeAgencyName)

  return (
    <div className="flex flex-col h-full justify-between gap-3 min-w-0 w-full">
      {/* 2-Column Balanced Layout */}
      <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-3.5 sm:gap-4 flex-1 my-auto min-w-0 w-full">
        {/* Left Column: SVG Donut Visual */}
        <div className="relative shrink-0 flex items-center justify-center w-32 h-32 sm:w-36 sm:h-36 max-w-full aspect-square my-auto select-none">
          <svg
            viewBox="0 0 160 160"
            className="w-full h-full -rotate-90 transform drop-shadow-2xs"
            role="img"
            aria-label="Funding Agency Capital Allocation Donut Chart"
          >
            {/* Background track circle */}
            <circle
              cx="80"
              cy="80"
              r="64"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="20"
            />

            {/* Segment arcs */}
            {(() => {
              const activeCount = segments.filter((s) => s.sliceLen > 0).length
              const hasMultiple = activeCount > 1
              const circumference = 2 * Math.PI * 64

              return segments.map((seg) => {
                if (seg.sliceLen <= 0) return null
                const isHovered = hoveredAgency === seg.name
                const isSelected = selectedAgency === seg.name
                const isDimmed = activeAgencyName && activeAgencyName !== seg.name

                // Precise proportional gap to eliminate overlapping and round cap bleed
                const gap = hasMultiple ? Math.min(2.5, seg.sliceLen * 0.35) : 0
                const drawLen = Math.max(0.8, seg.sliceLen - gap)
                const offset = seg.offset + gap / 2

                return (
                  <circle
                    key={seg.name}
                    cx="80"
                    cy="80"
                    r="64"
                    fill="none"
                    stroke={seg.color.bg}
                    strokeWidth={isHovered || isSelected ? 23 : 19}
                    strokeDasharray={`${drawLen} ${circumference - drawLen}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                    className="transition-all duration-300 cursor-pointer"
                    style={{
                      opacity: isDimmed ? 0.35 : 1,
                      filter: isHovered || isSelected ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.22))' : 'none',
                    }}
                    onMouseEnter={() => setHoveredAgency(seg.name)}
                    onMouseLeave={() => setHoveredAgency(null)}
                    onClick={() => onSelectAgency && onSelectAgency(selectedAgency === seg.name ? 'all' : seg.name)}
                  >
                    <title>{`${seg.name}: ${formatCurrency(seg.value)} (${seg.pct}%)`}</title>
                  </circle>
                )
              })
            })()}
          </svg>

          {/* Dynamic Donut Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none transition-all">
            {activeSegment ? (
              <>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 line-clamp-1 max-w-[85px]">
                  {activeSegment.name}
                </span>
                <span className="font-heading text-xs sm:text-sm font-black text-slate-900 leading-tight mt-0.5">
                  {formatCurrency(activeSegment.value)}
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full mt-0.5 border"
                  style={{
                    backgroundColor: activeSegment.color.light,
                    borderColor: activeSegment.color.border,
                    color: activeSegment.color.text,
                  }}
                >
                  {activeSegment.pct}% • {activeSegment.count} {activeSegment.count === 1 ? 'call' : 'calls'}
                </span>
              </>
            ) : (
              <>
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Total Pipeline
                </span>
                <span className="font-heading text-sm sm:text-base font-black text-slate-900 leading-tight mt-0.5">
                  {formatCurrency(totalPipelineValue || effectiveTotal)}
                </span>
                <span className="text-[8px] sm:text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-0.5 border border-emerald-200">
                  {segments.length} Partner {segments.length === 1 ? 'Body' : 'Bodies'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Portfolio Breakdown (All 5 Agencies Visible) */}
        <div className="flex-1 min-w-0 w-full flex flex-col justify-center">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1.5">
            <span>Portfolio Breakdown</span>
            {selectedAgency !== 'all' && (
              <button
                onClick={() => onSelectAgency && onSelectAgency('all')}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Reset Filter ✕
              </button>
            )}
          </div>

          <div className="space-y-1.5 w-full min-w-0">
            {segments.map((seg) => {
              const isSelected = selectedAgency === seg.name
              const isHovered = hoveredAgency === seg.name

              return (
                <div
                  key={seg.name}
                  onMouseEnter={() => setHoveredAgency(seg.name)}
                  onMouseLeave={() => setHoveredAgency(null)}
                  onClick={() => onSelectAgency && onSelectAgency(isSelected ? 'all' : seg.name)}
                  className={`p-1.5 sm:p-2 rounded-[10px] border transition-all cursor-pointer flex items-center justify-between gap-1.5 sm:gap-2 min-w-0 w-full ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : isHovered
                      ? 'bg-slate-50 border-slate-300'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: seg.color.bg }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className={`text-xs font-bold truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {seg.name}
                        </p>
                        {seg.awarded > 0 && (
                          <span className={`text-[9px] font-bold px-1 rounded shrink-0 ${
                            isSelected ? 'bg-emerald-500/30 text-emerald-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            🏆 {seg.awarded}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'} truncate mt-0.5 leading-none`}>
                        {seg.count} {seg.count === 1 ? 'proposal' : 'proposals'} • {seg.pct}% share
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-1">
                    <p className={`font-mono font-bold text-xs ${isSelected ? 'text-emerald-300' : 'text-slate-900'}`}>
                      {formatCurrency(seg.value)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Helper Footer Instruction */}
      <div className="pt-2.5 mt-auto border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-slate-500 shrink-0">
        <span className="truncate">Click an agency segment to filter proposal dossier</span>
        {activeSegment && (
          <span className="font-semibold text-slate-700 shrink-0 ml-1.5">
            Selected: <strong className="text-emerald-700">{activeSegment.name}</strong>
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. MONTHLY GRANT TRAJECTORY & SUBMISSION VELOCITY (DUAL-AXIS SVG AREA + BAR CHART)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function MonthlyGrantTrajectoryChart({
  proposals = [],
  formatCurrency = formatLakhCrore,
  parseAmountToNumber,
}) {
  const [timeHorizon, setTimeHorizon] = useState('6m') // '6m' | '12m'
  const [metricMode, setMetricMode] = useState('capital') // 'capital' | 'velocity'
  const [hoveredIndex, setHoveredIndex] = useState(null)

  // Compute dynamic monthly points
  const monthlyData = useMemo(() => {
    const list = Array.isArray(proposals) ? proposals : []
    const monthsCount = timeHorizon === '12m' ? 12 : 6
    const now = new Date()
    const months = []

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const mIdx = d.getMonth()
      const key = `${year}-${String(mIdx + 1).padStart(2, '0')}`
      const shortMonth = d.toLocaleString('en-IN', { month: 'short' })
      const fullLabel = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })

      months.push({
        key,
        year,
        mIdx,
        shortLabel: shortMonth,
        fullLabel,
        initiated: 0,
        submitted: 0,
        awarded: 0,
        requestedVal: 0,
        awardedVal: 0,
        proposals: [],
      })
    }

    list.forEach((p) => {
      const pDate = new Date(p.createdAt || p.updatedAt)
      const subDate = p.agencySubmission?.submittedAt ? new Date(p.agencySubmission.submittedAt) : null
      const reqVal = parseAmountToNumber ? parseAmountToNumber(p.fundingAmount) : Number(p.fundingAmount) || 0
      const awVal = ['Awarded', 'Accepted'].includes(p.status)
        ? (parseAmountToNumber ? parseAmountToNumber(p.awardDetails?.sanctionedAmount) : 0) || reqVal
        : 0

      // Match creation month
      if (!isNaN(pDate.getTime())) {
        const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`
        const mObj = months.find((m) => m.key === key)
        if (mObj) {
          mObj.initiated++
          mObj.requestedVal += reqVal
          mObj.proposals.push(p)
        }
      }

      // Match submission month
      if (subDate && !isNaN(subDate.getTime())) {
        const key = `${subDate.getFullYear()}-${String(subDate.getMonth() + 1).padStart(2, '0')}`
        const mObj = months.find((m) => m.key === key)
        if (mObj) {
          mObj.submitted++
        }
      } else if (['Submitted to Agency', 'Submitted', 'Under Evaluation'].includes(p.status) && !isNaN(pDate.getTime())) {
        const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`
        const mObj = months.find((m) => m.key === key)
        if (mObj) {
          mObj.submitted++
        }
      }

      // Match awarded month
      if (['Awarded', 'Accepted'].includes(p.status)) {
        const aDate = p.awardDetails?.startDate ? new Date(p.awardDetails.startDate) : pDate
        if (!isNaN(aDate.getTime())) {
          const key = `${aDate.getFullYear()}-${String(aDate.getMonth() + 1).padStart(2, '0')}`
          const mObj = months.find((m) => m.key === key)
          if (mObj) {
            mObj.awarded++
            mObj.awardedVal += awVal
          }
        }
      }
    })

    // Compute cumulative curve values
    let runReq = 0
    let runAw = 0
    months.forEach((m) => {
      runReq += m.requestedVal
      runAw += m.awardedVal
      m.cumulativeRequested = runReq
      m.cumulativeAwarded = runAw
    })

    return months
  }, [proposals, timeHorizon, parseAmountToNumber])

  // SVG Chart Geometry
  const W = 620
  const H = 220
  const padL = 50
  const padR = 25
  const padT = 20
  const padB = 35
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  // Max scale values based on mode
  const maxCapital = Math.max(...monthlyData.map((d) => d.requestedVal || 0), 100000)
  const maxVelocity = Math.max(...monthlyData.map((d) => Math.max(d.initiated, d.submitted, d.awarded)), 3)

  const topScale = metricMode === 'capital' ? maxCapital * 1.15 : maxVelocity + 1
  const yOf = (val) => padT + innerH - (Math.max(0, val) / (topScale || 1)) * innerH
  const xOf = (idx) => padL + (idx / Math.max(monthlyData.length - 1, 1)) * innerW
  const groupW = innerW / Math.max(monthlyData.length, 1)

  // Polyline & Area path generator for Capital Curve
  const areaPoints = monthlyData.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.requestedVal).toFixed(1)}`)
  const areaPath = `M ${xOf(0).toFixed(1)},${(padT + innerH).toFixed(1)} ` +
    areaPoints.map((pt) => `L ${pt}`).join(' ') +
    ` L ${xOf(monthlyData.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} Z`
  const linePath = areaPoints.length > 0 ? `M ${areaPoints.join(' L ')}` : ''

  // Awarded curve
  const awardPoints = monthlyData.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.awardedVal).toFixed(1)}`)
  const awardLinePath = awardPoints.length > 0 ? `M ${awardPoints.join(' L ')}` : ''

  // Peak month
  const peakMonth = [...monthlyData].sort((a, b) => (metricMode === 'capital' ? b.requestedVal - a.requestedVal : b.initiated - a.initiated))[0]

  // Total sums
  const totalPeriodInitiated = monthlyData.reduce((s, m) => s + m.initiated, 0)
  const totalPeriodSubmitted = monthlyData.reduce((s, m) => s + m.submitted, 0)
  const totalPeriodCapital = monthlyData.reduce((s, m) => s + m.requestedVal, 0)
  const conversionRate = totalPeriodInitiated > 0 ? Math.round((totalPeriodSubmitted / totalPeriodInitiated) * 100) : 0

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header Controls: Horizon + Metric toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-[10px] text-xs self-start">
          <button
            onClick={() => setMetricMode('capital')}
            className={`px-3 py-1.5 rounded-[8px] font-bold transition-all cursor-pointer ${
              metricMode === 'capital'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Capital Trajectory (₹)
          </button>
          <button
            onClick={() => setMetricMode('velocity')}
            className={`px-3 py-1.5 rounded-[8px] font-bold transition-all cursor-pointer ${
              metricMode === 'velocity'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Submission Velocity (Count)
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-[10px] text-xs self-start sm:self-auto">
          {[
            { id: '6m', label: 'Past 6M' },
            { id: '12m', label: 'Past 12M' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeHorizon(t.id)}
              className={`px-2.5 py-1 rounded-[7px] font-semibold transition-all cursor-pointer ${
                timeHorizon === t.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Stage */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label="Monthly Grant Trajectory and Submission Velocity Chart"
        >
          <defs>
            <linearGradient id="grantAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
              <stop offset="90%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="barGradientPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="barGradientSubmitted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padT + innerH * (1 - pct)
            const tickVal = topScale * pct
            const label =
              metricMode === 'capital'
                ? formatCurrency(tickVal)
                : Math.round(tickVal).toString()

            return (
              <g key={i}>
                <line
                  x1={padL}
                  y1={y}
                  x2={W - padR}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  opacity={i === 0 ? 0.9 : 0.6}
                />
                <text
                  x={padL - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9.5"
                  fill="#94a3b8"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {label}
                </text>
              </g>
            )
          })}

          {/* Mode 1: Capital Area Curve */}
          {metricMode === 'capital' && (
            <>
              {/* Shaded Area */}
              <path d={areaPath} fill="url(#grantAreaGradient)" />

              {/* Inflow Trajectory Line */}
              <path
                d={linePath}
                fill="none"
                stroke="#059669"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Awarded Curve Line (Amber) */}
              <path
                d={awardLinePath}
                fill="none"
                stroke="#d97706"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />

              {/* Data points */}
              {monthlyData.map((d, i) => {
                const cx = xOf(i)
                const cy = yOf(d.requestedVal)
                const isHovered = hoveredIndex === i

                return (
                  <g key={d.key} className="transition-all">
                    {/* Outer glow ring on hover */}
                    {isHovered && (
                      <circle cx={cx} cy={cy} r="8" fill="#10b981" fillOpacity="0.25" />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? '5' : '3.5'}
                      fill="#ffffff"
                      stroke="#059669"
                      strokeWidth={isHovered ? '3' : '2'}
                      className="cursor-pointer transition-all duration-200"
                    />
                  </g>
                )
              })}
            </>
          )}

          {/* Mode 2: Submission Velocity Monthly Bars */}
          {metricMode === 'velocity' && (
            <g>
              {monthlyData.map((d, i) => {
                const cx = xOf(i)
                const barWidth = Math.min(18, Math.max(10, groupW * 0.35))
                const barX1 = cx - barWidth - 1
                const barX2 = cx + 1

                const hInit = Math.max(0, innerH - (yOf(d.initiated) - padT))
                const hSub = Math.max(0, innerH - (yOf(d.submitted) - padT))
                const isHovered = hoveredIndex === i

                return (
                  <g key={d.key} opacity={isHovered || hoveredIndex === null ? 1 : 0.45}>
                    {/* Initiated Bar */}
                    <rect
                      x={barX1}
                      y={yOf(d.initiated)}
                      width={barWidth}
                      height={hInit}
                      rx="3"
                      fill="url(#barGradientPrimary)"
                      className="transition-all duration-300"
                    />

                    {/* Submitted to Agency Bar */}
                    <rect
                      x={barX2}
                      y={yOf(d.submitted)}
                      width={barWidth}
                      height={hSub}
                      rx="3"
                      fill="url(#barGradientSubmitted)"
                      className="transition-all duration-300"
                    />
                  </g>
                )
              })}
            </g>
          )}

          {/* Interactive Hover Hit Columns */}
          {monthlyData.map((d, i) => {
            const cx = xOf(i)
            const colW = groupW
            const colX = cx - colW / 2

            return (
              <g key={`hit-${d.key}`}>
                <rect
                  x={colX}
                  y={padT}
                  width={colW}
                  height={innerH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {hoveredIndex === i && (
                  <line
                    x1={cx}
                    y1={padT}
                    x2={cx}
                    y2={padT + innerH}
                    stroke="#0f172a"
                    strokeWidth="1.25"
                    strokeDasharray="3 3"
                    opacity="0.4"
                    pointerEvents="none"
                  />
                )}
              </g>
            )
          })}

          {/* X-Axis Month Labels */}
          {monthlyData.map((d, i) => {
            const x = xOf(i)
            const isHovered = hoveredIndex === i

            return (
              <text
                key={`lbl-${d.key}`}
                x={x}
                y={H - 12}
                textAnchor="middle"
                fontSize="11"
                fill={isHovered ? '#0f172a' : '#64748b'}
                fontWeight={isHovered ? '700' : '500'}
                fontFamily="sans-serif"
                className="transition-colors"
              >
                {d.shortLabel}
              </text>
            )
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredIndex !== null && monthlyData[hoveredIndex] && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-950 text-white p-3 rounded-[12px] shadow-xl border border-slate-700/60 text-xs animate-fade-in"
            style={{
              left: `${Math.min(75, Math.max(15, (xOf(hoveredIndex) / W) * 100))}%`,
              top: '8px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-bold text-emerald-400">{monthlyData[hoveredIndex].fullLabel}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {monthlyData[hoveredIndex].proposals.length} active
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Capital Inflow:</span>
                <span className="font-mono font-bold text-white">
                  {formatCurrency(monthlyData[hoveredIndex].requestedVal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Sanctioned:</span>
                <span className="font-mono font-bold text-amber-300">
                  {formatCurrency(monthlyData[hoveredIndex].awardedVal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/80 text-[11px]">
                <span className="text-emerald-300 font-semibold">
                  📝 {monthlyData[hoveredIndex].initiated} Initiated
                </span>
                <span className="text-indigo-300 font-semibold">
                  🚀 {monthlyData[hoveredIndex].submitted} Dispatched
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trajectory Insights Strip */}
      <div className="pt-3.5 mt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-2.5 rounded-[12px] bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-2.5">
          <span className="text-base">🚀</span>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Peak Month
            </span>
            <span className="font-bold text-emerald-950 truncate block">
              {peakMonth ? `${peakMonth.fullLabel}` : 'Active Cycle'}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-[12px] bg-indigo-50/80 border border-indigo-200/80 flex items-center gap-2.5">
          <span className="text-base">📈</span>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block">
              Period Inflow
            </span>
            <span className="font-bold text-indigo-950 truncate block">
              {formatCurrency(totalPeriodCapital)} across {monthlyData.length}M
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-[12px] bg-slate-50 border border-slate-200 flex items-center gap-2.5">
          <span className="text-base">🎯</span>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
              Submission Velocity
            </span>
            <span className="font-bold text-slate-900 truncate block">
              {conversionRate}% dispatched ({totalPeriodSubmitted}/{totalPeriodInitiated})
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
