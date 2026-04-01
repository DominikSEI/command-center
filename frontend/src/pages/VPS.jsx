import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Cpu, MemoryStick, HardDrive, ArrowUpDown } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api'

function MetricCard({ icon: Icon, label, value, unit, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={14} className={iconColor} />
        </div>
        <span className="text-xs font-medium text-stone-500">{label}</span>
      </div>
      <div className="text-3xl font-bold text-stone-800">
        {value != null ? Math.round(value) : '—'}
        <span className="text-base font-normal text-stone-400 ml-1">{unit}</span>
      </div>
    </div>
  )
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${(bytes / 1e3).toFixed(0)} KB`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-surface-border rounded-xl px-3 py-2 text-xs shadow-card-md">
      <p className="text-stone-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {Math.round(p.value)}%
        </p>
      ))}
    </div>
  )
}

export default function VPS() {
  const [latest, setLatest]   = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [cur, hist] = await Promise.all([
      api.get('/vps/metrics/current'),
      api.get('/vps/metrics?hours=24'),
    ])
    setLatest(cur.data)
    setHistory(hist.data.reverse().map(m => ({
      time: new Date(m.recorded_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      CPU: m.cpu_percent,
      RAM: m.ram_percent,
      Disk: m.disk_percent,
    })))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 30_000)
    return () => clearInterval(id)
  }, [fetchData])

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">VPS Metriken</h1>
          <p className="text-sm text-stone-400 mt-1">Live-Auslastung · alle 30s</p>
        </div>
        <button onClick={fetchData} className="btn-ghost p-2.5">
          <RefreshCw size={15} className={loading ? 'animate-spin text-accent' : 'text-stone-400'} />
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Cpu}         label="CPU"     value={latest?.cpu_percent}  unit="%" iconBg="bg-blue-100"   iconColor="text-blue-600"   />
        <MetricCard icon={MemoryStick} label="RAM"     value={latest?.ram_percent}  unit="%" iconBg="bg-purple-100" iconColor="text-purple-600" />
        <MetricCard icon={HardDrive}   label="Disk"    value={latest?.disk_percent} unit="%" iconBg="bg-orange-100" iconColor="text-orange-500" />
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-100">
              <ArrowUpDown size={14} className="text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-stone-500">Netzwerk</span>
          </div>
          <div className="space-y-1">
            <div className="text-sm">
              <span className="text-stone-400">Up: </span>
              <span className="font-semibold text-emerald-600">{formatBytes(latest?.net_bytes_sent)}</span>
            </div>
            <div className="text-sm">
              <span className="text-stone-400">Down: </span>
              <span className="font-semibold text-blue-600">{formatBytes(latest?.net_bytes_recv)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}>
          <h2 className="text-sm font-semibold text-stone-600 mb-5">24h Verlauf</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="gCPU" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gRAM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#a8a29e', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#a8a29e', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="CPU" stroke="#60a5fa" strokeWidth={2} fill="url(#gCPU)" dot={false} />
              <Area type="monotone" dataKey="RAM" stroke="#a78bfa" strokeWidth={2} fill="url(#gRAM)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && history.length === 0 && (
        <div className="bg-white rounded-2xl text-center py-12 text-stone-400" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          Noch keine Metriken gesammelt. Der Scheduler startet alle 5 Minuten.
        </div>
      )}
    </div>
  )
}
