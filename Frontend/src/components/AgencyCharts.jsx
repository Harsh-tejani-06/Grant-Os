// Lightweight SVG/CSS charts shared by the agency Overview and Analytics pages.
// No charting library is needed.

// ─── Formatting helpers ───
export const formatCurrency = (amount) => {
  const n = Number(amount)
  if (!n || Number.isNaN(n)) return '₹0'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

export const timeAgo = (value) => {
  if (!value) return ''
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return ''
  const minutes = Math.floor((Date.now() - t) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

// ─── Donut chart ───
export function DonutChart({ segments, size = 168, thickness = 22, centerValue, centerLabel }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const mid = size / 2
  let offset = 0

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label="Distribution chart">
        <circle cx={mid} cy={mid} r={r} fill="none" stroke="#f0ece6" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((seg) => {
            if (!seg.value) return null
            const len = (seg.value / total) * c
            const circle = (
              <circle
                key={seg.label}
                cx={mid}
                cy={mid}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              >
                <title>{`${seg.label}: ${seg.value}`}</title>
              </circle>
            )
            offset += len
            return circle
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-heading text-3xl font-bold text-warm-gray-900">{centerValue}</span>
        {centerLabel && (
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-warm-gray-400">{centerLabel}</span>
        )}
      </div>
    </div>
  )
}

// ─── Column chart: primary bars with an optional secondary bar drawn inside ───
export function ColumnChart({
  data,
  height = 240,
  primaryLabel = 'Submissions',
  secondaryLabel = 'Awarded',
  primaryColor = '#705c30',
  secondaryColor = '#059669',
}) {
  const W = 640
  const padL = 34
  const padR = 12
  const padT = 18
  const padB = 34
  const innerW = W - padL - padR
  const innerH = height - padT - padB

  const max = Math.max(...data.map((d) => d.value), 1)
  const step = Math.max(1, Math.ceil(max / 4))
  const top = step * 4
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step)
  const groupW = innerW / Math.max(data.length, 1)
  const barW = Math.min(46, groupW * 0.56)
  const yOf = (v) => padT + innerH - (v / top) * innerH

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Monthly submissions chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={yOf(t)} y2={yOf(t)} stroke="#e2ddd4" strokeDasharray="3 4" />
            <text x={padL - 8} y={yOf(t) + 3} textAnchor="end" fontSize="10" fill="#a89e8c">
              {t}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = padL + i * groupW + (groupW - barW) / 2
          const h1 = (d.value / top) * innerH
          const h2 = ((d.secondary || 0) / top) * innerH
          return (
            <g key={d.key || d.label}>
              <rect x={x} y={padT + innerH - h1} width={barW} height={Math.max(h1, d.value > 0 ? 2 : 0)} rx="6" fill={primaryColor} opacity="0.9">
                <title>{`${d.label} — ${primaryLabel}: ${d.value}`}</title>
              </rect>
              {d.secondary > 0 && (
                <rect x={x + barW * 0.25} y={padT + innerH - h2} width={barW * 0.5} height={Math.max(h2, 2)} rx="4" fill={secondaryColor}>
                  <title>{`${d.label} — ${secondaryLabel}: ${d.secondary}`}</title>
                </rect>
              )}
              {d.value > 0 && (
                <text x={x + barW / 2} y={padT + innerH - h1 - 7} textAnchor="middle" fontSize="11" fontWeight="700" fill="#3a3530">
                  {d.value}
                </text>
              )}
              <text x={x + barW / 2} y={height - 12} textAnchor="middle" fontSize="11" fill="#6b6256">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="mt-2 flex items-center justify-center gap-5">
        <span className="flex items-center gap-1.5 text-xs text-warm-gray-600">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: primaryColor }} />
          {primaryLabel}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-warm-gray-600">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: secondaryColor }} />
          {secondaryLabel}
        </span>
      </div>
    </div>
  )
}

// ─── Sparkline ───
export function Sparkline({ values, color = '#705c30', width = 96, height = 34 }) {
  if (!values || values.length === 0) return null
  const max = Math.max(...values, 1)
  const stepX = values.length > 1 ? width / (values.length - 1) : 0
  const pts = values.map((v, i) => [values.length > 1 ? i * stepX : width / 2, height - 4 - (v / max) * (height - 8)])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  const area = `${line} L${last[0].toFixed(1)} ${height} L${pts[0][0].toFixed(1)} ${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {values.length > 1 && <path d={area} fill={color} opacity="0.12" />}
      {values.length > 1 && (
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  )
}

// ─── Progress ring ───
export function ProgressRing({ value = 0, size = 64, thickness = 7, color = '#059669', children }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const mid = size / 2

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={mid} cy={mid} r={r} fill="none" stroke="#f0ece6" strokeWidth={thickness} />
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          style={{ transition: 'stroke-dasharray 0.7s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

// ─── Stacked horizontal bar ───
export function StackedBar({ segments, height = 12, className = '' }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  return (
    <div className={`flex w-full overflow-hidden rounded-full bg-warm-gray-100 ${className}`} style={{ height }} role="img" aria-label="Breakdown">
      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.label} title={`${s.label}: ${s.value}`} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
          ))}
    </div>
  )
}