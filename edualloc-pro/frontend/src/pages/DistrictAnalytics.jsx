// DistrictAnalytics — premium BigQuery-powered charts page
import { motion } from 'framer-motion'
import { useAnalytics } from '../hooks/useAnalytics'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Line, Legend, Cell
} from 'recharts'

const CHART_COLORS = {
  di:        '#ef4444',
  vacancies: '#f59e0b',
  schools:   '#2563eb',
  stable:    '#10b981',
}

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', textLight: 'text-blue-400', textDark: 'text-blue-700', iconBg: 'bg-blue-100', iconText: 'text-blue-500' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-100', textLight: 'text-slate-400', textDark: 'text-slate-700', iconBg: 'bg-slate-100', iconText: 'text-slate-500' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-100', textLight: 'text-rose-400', textDark: 'text-rose-700', iconBg: 'bg-rose-100', iconText: 'text-rose-500' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-100', textLight: 'text-amber-400', textDark: 'text-amber-700', iconBg: 'bg-amber-100', iconText: 'text-amber-500' },
}

function StatCard({ label, value, icon, color, sub }) {
  const c = COLOR_MAP[color] || COLOR_MAP.slate
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${c.bg} ${c.border} border rounded-xl p-5 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-[10px] font-bold ${c.textLight} uppercase tracking-widest`}>{label}</p>
          <p className={`text-3xl font-black ${c.textDark} mt-1 leading-none`}>{value ?? '—'}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center`}>
          <span
            className={`material-symbols-outlined ${c.iconText} text-[18px]`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
      </div>
      {sub && <p className={`text-xs ${c.textLight} mt-2 font-semibold`}>{sub}</p>}
    </motion.div>
  )
}

function ChartCard({ title, subtitle, delay, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
    >
      <div className="mb-5">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  )
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function DistrictAnalytics() {
  const { data, loading, error } = useAnalytics()

  const blockStats = data?.block_stats || []

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-200 bg-white shadow-sm flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">District Analytics</h1>
            <p className="text-xs text-slate-500 font-semibold">Real-time metrics · Powered by Google BigQuery</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-semibold">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Data
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Loading */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-72 bg-slate-200 rounded-xl" />
              <div className="h-72 bg-slate-200 rounded-xl" />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
            <span className="material-symbols-outlined flex-shrink-0">error</span>
            <div>
              <div className="font-bold text-sm">Failed to load analytics</div>
              <div className="text-xs mt-1 opacity-80">{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Total Schools"    value={data?.total_schools}    icon="school"    color="blue"   sub="Nandurbar district" />
              <StatCard label="Avg DI Score"     value={data?.avg_di_score}     icon="bar_chart" color="slate"  sub="District average" />
              <StatCard label="Critical Schools" value={data?.critical_schools} icon="warning"   color="rose"   sub="DI ≥ 80" />
              <StatCard label="Subject Vacancies" value={data?.total_vacancies} icon="work_off"  color="amber"  sub="Across all blocks" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Chart 1: DI by Block */}
              <ChartCard
                title="Average Deprivation Index by Block"
                subtitle="Higher score = more deprived"
                delay={0.1}
              >
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={blockStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                      />
                      <YAxis
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        domain={[0, 100]}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="avg_di" name="Avg DI Score" radius={[6, 6, 0, 0]} barSize={36}>
                        {blockStats.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.avg_di >= 80 ? CHART_COLORS.di : entry.avg_di >= 60 ? CHART_COLORS.vacancies : CHART_COLORS.stable}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Color legend */}
                <div className="flex gap-4 mt-3">
                  {[
                    { color: CHART_COLORS.di, label: 'Critical (≥80)' },
                    { color: CHART_COLORS.vacancies, label: 'High (60-80)' },
                    { color: CHART_COLORS.stable, label: 'Stable (<60)' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                      <span className="text-[11px] text-slate-500 font-semibold">{label}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>

              {/* Chart 2: Vacancies vs Schools */}
              <ChartCard
                title="Subject Vacancies Distribution"
                subtitle="Per-block staffing gap analysis"
                delay={0.2}
              >
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={blockStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                      />
                      <YAxis
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '12px', color: '#64748b' }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Bar dataKey="vacancies" name="Vacancies" fill={CHART_COLORS.vacancies} radius={[6, 6, 0, 0]} barSize={36} opacity={0.9} />
                      <Line
                        type="monotone"
                        dataKey="schools"
                        name="Total Schools"
                        stroke={CHART_COLORS.schools}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: CHART_COLORS.schools, strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            {/* Block table */}
            {blockStats.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Block-Level Summary</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Live aggregation from BigQuery</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {['Block', 'Schools', 'Avg DI', 'Vacancies', 'Status'].map(h => (
                          <th key={h} className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {blockStats.map((block, i) => {
                        const isCritical = block.avg_di >= 80
                        const isHigh = block.avg_di >= 60
                        return (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3.5 font-bold text-slate-800">{block.name}</td>
                            <td className="px-6 py-3.5 text-slate-600 font-mono">{block.schools}</td>
                            <td className="px-6 py-3.5">
                              <span className={`font-black font-mono ${isCritical ? 'text-rose-600' : isHigh ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {block.avg_di?.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-slate-600 font-mono">{block.vacancies}</td>
                            <td className="px-6 py-3.5">
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                isCritical ? 'bg-rose-100 text-rose-700' :
                                isHigh ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                {isCritical ? 'Critical' : isHigh ? 'High Need' : 'Stable'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Empty block stats */}
            {blockStats.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-center text-slate-400">
                <span className="material-symbols-outlined text-[36px] mb-2">bar_chart</span>
                <p className="text-sm font-semibold">No block data available yet</p>
                <p className="text-xs mt-1">Ensure the BigQuery analytics pipeline has run</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
