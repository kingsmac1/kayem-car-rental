import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { brand } from '@/config/brand'
import { naira, nairaShort } from '@/lib/utils'

const AXIS = { stroke: 'transparent', tick: { fill: brand.colors.mute, fontSize: 11 }, tickLine: false }

function Tip({ active, payload, label, money = true, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; money?: boolean; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="border border-line-strong bg-ink-2 px-3 py-2 text-[12.5px] shadow-lg">
      <p className="text-mute">{label}</p>
      <p className="num mt-0.5 font-medium text-paper">{money ? naira(payload[0].value) : `${payload[0].value}${unit ?? ''}`}</p>
    </div>
  )
}

/** Single-series area chart (revenue over time). One axis, recessive grid, crosshair tooltip. */
export function TrendChart({ data, x, y, height = 240, money = true, unit }: { data: Record<string, string | number>[]; x: string; y: string; height?: number; money?: boolean; unit?: string }) {
  return (
    <div style={{ height }} role="img" aria-label={`Trend of ${y}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={brand.colors.accent} stopOpacity={0.28} />
              <stop offset="100%" stopColor={brand.colors.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(242,239,232,.07)" />
          <XAxis dataKey={x} {...AXIS} minTickGap={24} />
          <YAxis {...AXIS} width={52} tickFormatter={(v: number) => (money ? nairaShort(v) : `${v}${unit ?? ''}`)} />
          <Tooltip content={<Tip money={money} unit={unit} />} cursor={{ stroke: 'rgba(242,239,232,.3)', strokeWidth: 1 }} />
          <Area type="monotone" dataKey={y} stroke={brand.colors.accent} strokeWidth={2} fill="url(#trendFill)" activeDot={{ r: 4, stroke: brand.colors.ink2, strokeWidth: 2, fill: brand.colors.accent }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Horizontal or vertical single-series bars (e.g. profit per car). */
export function Bars({ data, x, y, height = 260, money = true, horizontal, unit }: { data: Record<string, string | number>[]; x: string; y: string; height?: number; money?: boolean; horizontal?: boolean; unit?: string }) {
  return (
    <div style={{ height }} role="img" aria-label={`Bar chart of ${y} by ${x}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap={horizontal ? 4 : 6}>
          <CartesianGrid vertical={!horizontal} horizontal={!!horizontal ? false : true} stroke="rgba(242,239,232,.07)" />
          {horizontal ? (
            <>
              <XAxis type="number" {...AXIS} tickFormatter={(v: number) => (money ? nairaShort(v) : `${v}${unit ?? ''}`)} />
              <YAxis type="category" dataKey={x} {...AXIS} width={120} />
            </>
          ) : (
            <>
              <XAxis dataKey={x} {...AXIS} />
              <YAxis {...AXIS} width={52} tickFormatter={(v: number) => (money ? nairaShort(v) : `${v}${unit ?? ''}`)} />
            </>
          )}
          <Tooltip content={<Tip money={money} unit={unit} />} cursor={{ fill: 'rgba(242,239,232,.05)' }} />
          <Bar dataKey={y} fill={brand.colors.accent} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
