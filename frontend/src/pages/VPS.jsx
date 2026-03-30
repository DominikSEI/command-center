import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Cpu, MemoryStick, HardDrive, ArrowUpDown } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api'

function MetricCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
        <Icon size={15} />
        {label}
      </div>
      <div className={`text-3xl font-bold ${color}`}>
        {value != null ? `${Math.round(value)}` : '—'}
        <span className="text-base font-normal text-gray-500 ml-1">{unit}</span>
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
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {Math.round(p.value)}%
        </p>
      ))}
    </div>
  )
}

export default function VPS() {
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [lat, hist] = await Promise.all([
      api.get('/vps/metrics/latest'),
      api.get('/vps/metrics?hours=24'),
    ])
    setLatest(lat.data)
    const data = hist.data.reverse().map((m) => ({
      time: new Date(m.recorded_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      CPU: m.cpu_percent,
      RAM: m.ram_percent,
      Disk: m.disk_percent,
    }))
    setHistory(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 60_000)
    return () => clearInterval(id)
  }, [fetchData])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">VPS Metriken</h1>
        <button onClick={fetchData} className="btn-ghost p-2">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Cpu} label="CPU" value={latest?.cpu_percent} unit="%" color="text-blue-400" />
        <MetricCard icon={MemoryStick} label="RAM" value={latest?.ram_percent} unit="%" color="text-purple-400" />
        <MetricCard icon={HardDrive} label="Disk" value={latest?.disk_percent} unit="%" color="text-orange-400" />
        <div className="card">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <ArrowUpDown size={15} />
            Netzwerk
          </div>
          <div className="space-y-1">
            <div className="text-sm">
              <span className="text-gray-500">Up:</span>{' '}
              <span className="text-emerald-400">{formatBytes(latest?.net_bytes_sent)}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Down:</span>{' '}
              <span className="text-blue-400">{formatBytes(latest?.net_bytes_recv)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {history.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-medium mb-4 text-gray-300">24h Verlauf</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="gCPU" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gRAM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="CPU" stroke="#60a5fa" strokeWidth={1.5} fill="url(#gCPU)" dot={false} />
              <Area type="monotone" dataKey="RAM" stroke="#a78bfa" strokeWidth={1.5} fill="url(#gRAM)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && history.length === 0 && (
        <div className="card text-center py-12 text-gray-500">
          Noch keine Metriken gesammelt. Der Scheduler startet alle 5 Minuten.
        </div>
      )}
    </div>
  )
}
