import { useEffect, useRef, useState, useCallback } from 'react'
import { api } from '../../api/client'
import * as theme from '../../styles/theme'

const { C } = theme
const FONTS = theme.FONTS ?? {
  display: "'Russo One',sans-serif",
  mono: "'Fira Code',monospace",
  body: "'Nunito',sans-serif",
}

const DNS_IP = '167.172.130.167'

const REASON_META = {
  custom_blocklist: { label: 'BLOCKLIST', color: C.red, bg: 'rgba(255,68,101,0.10)' },
  parent_blocklist: { label: 'PARENT', color: C.red, bg: 'rgba(255,68,101,0.10)' },
  suspicious_tld: { label: 'BAD TLD', color: C.orange, bg: 'rgba(255,155,67,0.10)' },
  dga_heuristic: { label: 'DGA', color: C.orange, bg: 'rgba(255,155,67,0.10)' },
}

function reasonMeta(reason) {
  const key = reason?.startsWith('suspicious_tld:') ? 'suspicious_tld' : reason
  return REASON_META[key] ?? { label: 'THREAT', color: C.red, bg: 'rgba(255,68,101,0.10)' }
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function SkeletonRow() {
  return (
    <div style={{ padding: '13px 0', borderBottom: '1px solid rgba(79,142,247,0.07)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, background: 'rgba(255,68,101,0.3)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="pulse" style={{ height: 12, width: '38%', borderRadius: 6, background: 'rgba(79,142,247,0.12)', marginBottom: 8 }} />
        <div className="pulse" style={{ height: 10, width: '75%', borderRadius: 6, background: 'rgba(79,142,247,0.07)' }} />
      </div>
      <div className="pulse" style={{ width: 58, height: 18, borderRadius: 6, background: 'rgba(79,142,247,0.08)', flexShrink: 0 }} />
    </div>
  )
}

function SetupTab({ config, onToggle, onUpdate }) {
  const [copied, setCopied] = useState(null)

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const CopyBtn = ({ text, id }) => (
    <button
      onClick={() => copy(text, id)}
      style={{
        fontFamily: FONTS.mono, fontSize: 10, padding: '3px 11px',
        borderRadius: 5, cursor: 'pointer', letterSpacing: '0.06em',
        background: 'transparent',
        border: `1px solid ${copied === id ? C.green : 'rgba(79,142,247,0.28)'}`,
        color: copied === id ? C.green : C.blue,
        transition: 'all 0.15s',
      }}
    >
      {copied === id ? '✓ COPIED' : 'COPY'}
    </button>
  )

  const Step = ({ n, title, children }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONTS.mono, fontSize: 11, color: C.blue, fontWeight: 600,
        }}>{n}</div>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{title}</span>
      </div>
      <div style={{ paddingLeft: 40 }}>{children}</div>
    </div>
  )

  const CodeBlock = ({ label, value, copyId }) => (
    <div className="proxy-codeblock" style={{
      background: 'rgba(4,6,8,0.8)', border: '1px solid rgba(79,142,247,0.18)',
      borderRadius: 8, padding: '12px 16px', marginBottom: 10,
      display: 'flex', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim, marginBottom: 6, letterSpacing: '0.08em' }}>{label}</div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 14, color: C.green, letterSpacing: '0.04em' }}>{value}</div>
      </div>
      <CopyBtn text={value} id={copyId} />
    </div>
  )

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="card card-topline" style={{
        padding: '20px 24px', marginBottom: 32,
        borderColor: config?.enabled ? 'rgba(57,217,138,0.3)' : 'rgba(79,142,247,0.13)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>
            LuciusProxy DNS Protection
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            {config?.enabled
              ? 'Active — all DNS queries are being monitored and filtered'
              : 'Inactive — point your router DNS to activate protection'}
          </div>
        </div>
        <div
          onClick={() => onToggle(!config?.enabled)}
          style={{
            width: 52, height: 28, borderRadius: 14, cursor: 'pointer',
            background: config?.enabled ? C.green : 'rgba(79,142,247,0.15)',
            border: `1px solid ${config?.enabled ? C.green : 'rgba(79,142,247,0.3)'}`,
            position: 'relative', transition: 'all 0.2s', flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', top: 3, left: config?.enabled ? 26 : 3,
            width: 20, height: 20, borderRadius: '50%',
            background: config?.enabled ? '#fff' : 'rgba(79,142,247,0.5)',
            transition: 'left 0.2s',
          }} />
        </div>
      </div>

      <Step n="1" title="Point your router's DNS to Lucius">
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
          Log into your router admin panel, find the DNS settings, and replace your current DNS servers with the Lucius DNS.
        </div>
        <CodeBlock label="PRIMARY DNS" value={DNS_IP} copyId="primary" />
        <CodeBlock label="SECONDARY DNS" value="1.1.1.1" copyId="secondary" />
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.dim, lineHeight: 1.8 }}>
          Common locations: Advanced → DNS · WAN → DNS Server · Internet → DNS
        </div>
      </Step>

      <Step n="2" title="For individual computers (no router access)">
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
          Windows: Control Panel → Network → Adapter Settings → IPv4 Properties → Use the following DNS.
        </div>
        <CodeBlock label="WINDOWS / MAC DNS" value={DNS_IP} copyId="device" />
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.dim }}>
          Mac: System Settings → Network → DNS → add the IP above.
        </div>
      </Step>

      <Step n="3" title="Verify it's working">
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
          Once configured, blocked domain attempts appear in the Traffic tab within seconds. You can also test with a domain on your blocklist.
        </div>
        <div style={{
          background: 'rgba(57,217,138,0.06)', border: '1px solid rgba(57,217,138,0.2)',
          borderRadius: 8, padding: '12px 16px', fontFamily: FONTS.mono, fontSize: 11,
          color: C.green, lineHeight: 1.7,
        }}>
          ✓ No software to install on individual devices<br />
          ✓ Works for every device on your network automatically<br />
          ✓ Blocks threats before the connection is even made
        </div>
      </Step>

      <div style={{ borderTop: '1px solid rgba(79,142,247,0.08)', paddingTop: 24, marginTop: 8 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 11, letterSpacing: '0.1em', marginBottom: 16, color: C.muted }}>
          ADVANCED SETTINGS
        </div>
        {[
          { key: 'block_suspicious_tlds', label: 'Block suspicious domain extensions (.tk, .ml, .xyz, .top...)', desc: 'These TLDs are used almost exclusively for malicious purposes' },
          { key: 'block_dga', label: 'Block algorithmically generated domains (DGA)', desc: 'Malware uses randomly generated domains to evade detection' },
          { key: 'notify_on_block', label: 'Create an alert when a domain is blocked', desc: 'Adds to your Alert Feed when suspicious activity is detected' },
        ].map(setting => (
          <div key={setting.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3 }}>{setting.label}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{setting.desc}</div>
            </div>
            <div
              onClick={() => onUpdate({ [setting.key]: !config?.[setting.key] })}
              style={{
                width: 40, height: 22, borderRadius: 11, cursor: 'pointer', flexShrink: 0,
                background: config?.[setting.key] ? C.blue : 'rgba(79,142,247,0.12)',
                border: `1px solid ${config?.[setting.key] ? C.blue : 'rgba(79,142,247,0.25)'}`,
                position: 'relative', transition: 'all 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: config?.[setting.key] ? 19 : 2,
                width: 16, height: 16, borderRadius: '50%',
                background: config?.[setting.key] ? '#fff' : 'rgba(79,142,247,0.5)',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TrafficTab({ events, total, loading, onLoadMore, loadingMore }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      <div className="card card-topline" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        <div className="scan-beam" />
        <div style={{ padding: '15px 20px 12px', borderBottom: '1px solid rgba(79,142,247,0.07)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: FONTS.display, fontSize: 12, letterSpacing: '0.1em' }}>BLOCKED TRAFFIC</span>
            <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim }}>Real-time · plain English</span>
          </div>
          <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.muted }}>{loading ? '—' : `${total} total`}</span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '4px 20px' }}>
          {loading ? (
            Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} />)
          ) : events.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: C.green, padding: '40px 0' }}>
              <div style={{ fontSize: 28 }}>✓</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 11 }}>No threats detected. Your network is clean.</div>
            </div>
          ) : (
            events.map(event => {
              const meta = reasonMeta(event.reason)
              return (
                <div key={event.id} className="fade-in" style={{ padding: '13px 0', borderBottom: '1px solid rgba(79,142,247,0.07)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, background: meta.color, boxShadow: `0 0 6px ${meta.color}`, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontFamily: FONTS.mono, fontSize: 12, fontWeight: 600, color: C.text }}>{event.domain}</span>
                        <span className="badge" style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}33` }}>{meta.label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, lineHeight: 1.5 }}>{event.plain_english}</div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim }}>{timeAgo(event.created_at)}</span>
                        {event.client_ip && (
                          <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim }}>from {event.client_ip}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {events.length < total && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14, flexShrink: 0 }}>
          <button className="resolve-btn" disabled={loadingMore} onClick={onLoadMore} style={{ minWidth: 130, opacity: loadingMore ? 0.6 : 1 }}>
            {loadingMore ? 'LOADING...' : 'LOAD MORE'}
          </button>
        </div>
      )}
    </div>
  )
}

function BlocklistTab({ items, loading, onAdd, onRemove }) {
  const [domain, setDomain] = useState('')
  const [type, setType] = useState('block')
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  async function handleAdd() {
    if (!domain.trim()) return
    setAdding(true)
    setError(null)
    try {
      await onAdd({ domain: domain.trim(), list_type: type, reason: reason.trim() })
      setDomain('')
      setReason('')
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div className="card card-topline" style={{ padding: '18px 20px', flexShrink: 0 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 11, letterSpacing: '0.1em', marginBottom: 14 }}>ADD DOMAIN</div>
        <div className="proxy-form">
          <input
            value={domain}
            onChange={event => setDomain(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && handleAdd()}
            placeholder="example.com"
            style={{
              flex: '1 1 200px', padding: '9px 14px',
              background: 'rgba(4,6,8,0.8)', border: '1px solid rgba(79,142,247,0.25)',
              borderRadius: 7, color: C.text, fontFamily: FONTS.mono, fontSize: 12,
              outline: 'none',
            }}
          />
          <select
            value={type}
            onChange={event => setType(event.target.value)}
            style={{
              padding: '9px 14px', background: 'rgba(4,6,8,0.8)',
              border: '1px solid rgba(79,142,247,0.25)', borderRadius: 7,
              color: C.blue, fontFamily: FONTS.mono, fontSize: 11, cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="block">BLOCK</option>
            <option value="allow">ALLOW</option>
          </select>
          <input
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder="Reason (optional)"
            style={{
              flex: '1 1 160px', padding: '9px 14px',
              background: 'rgba(4,6,8,0.8)', border: '1px solid rgba(79,142,247,0.2)',
              borderRadius: 7, color: C.muted, fontFamily: FONTS.body, fontSize: 12,
              outline: 'none',
            }}
          />
          <button
            className="resolve-btn"
            disabled={adding || !domain.trim()}
            onClick={handleAdd}
            style={{ minWidth: 100, opacity: adding ? 0.6 : 1 }}
          >
            {adding ? 'ADDING...' : 'ADD →'}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 10, fontFamily: FONTS.mono, fontSize: 10, color: C.red }}>{error}</div>
        )}
      </div>

      <div className="card card-topline" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid rgba(79,142,247,0.07)', flexShrink: 0, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: FONTS.display, fontSize: 12, letterSpacing: '0.1em' }}>ACTIVE RULES</span>
          <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim }}>{loading ? '—' : `${items.length} entries`}</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 20px' }}>
          {loading ? (
            Array.from({ length: 4 }, (_, index) => <SkeletonRow key={index} />)
          ) : items.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: C.dim, fontFamily: FONTS.mono, fontSize: 11 }}>
              No custom rules. Add a domain above.
            </div>
          ) : (
            items.map(item => {
              const isGlobal = item.org_id == null
              const color = item.list_type === 'block' ? C.red : C.green
              return (
                <div key={item.id} className="fade-in" style={{ padding: '12px 0', borderBottom: '1px solid rgba(79,142,247,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.text }}>{item.domain}</span>
                      <span className="badge" style={{ color, background: `${color}18`, border: `1px solid ${color}33`, fontFamily: FONTS.mono, fontSize: 9 }}>
                        {item.list_type.toUpperCase()}
                      </span>
                      {isGlobal && (
                        <span className="badge" style={{ color: C.dim, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.1)', fontFamily: FONTS.mono, fontSize: 9 }}>
                          GLOBAL
                        </span>
                      )}
                    </div>
                    {item.reason && <div style={{ fontSize: 11, color: C.muted }}>{item.reason}</div>}
                  </div>
                  {!isGlobal && (
                    <button
                      onClick={() => onRemove(item.id)}
                      style={{
                        background: 'transparent', border: '1px solid rgba(255,68,101,0.2)',
                        color: C.red, borderRadius: 5, padding: '3px 10px',
                        fontFamily: FONTS.mono, fontSize: 9, cursor: 'pointer',
                        letterSpacing: '0.06em', transition: 'all 0.15s',
                      }}
                    >
                      REMOVE
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default function LuciusProxy() {
  const [tab, setTab] = useState('setup')
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [config, setConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [eventsTotal, setEventsTotal] = useState(0)
  const [eventsPage, setEventsPage] = useState(1)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [blocklist, setBlocklist] = useState([])
  const [blocklistLoading, setBlocklistLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.getProxySummary()
      setSummary(response?.data ?? null)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const response = await api.getProxyConfig()
      setConfig(response?.data ?? null)
    } finally {
      setConfigLoading(false)
    }
  }, [])

  const fetchEvents = useCallback(async (page = 1, append = false) => {
    try {
      const response = await api.getProxyEvents(page)
      const nextEvents = response?.data?.events ?? []
      setEventsTotal(response?.data?.total ?? 0)
      setEvents(current => (append ? [...current, ...nextEvents] : nextEvents))
      setEventsPage(page)
    } finally {
      setEventsLoading(false)
    }
  }, [])

  const fetchBlocklist = useCallback(async () => {
    try {
      const response = await api.getBlocklist()
      setBlocklist(response?.data?.items ?? [])
    } finally {
      setBlocklistLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
    fetchConfig()
    fetchEvents(1)
    fetchBlocklist()

    pollRef.current = setInterval(() => {
      fetchSummary()
      if (tab === 'traffic') {
        fetchEvents(1)
      }
    }, 10000)

    return () => clearInterval(pollRef.current)
  }, [fetchBlocklist, fetchConfig, fetchEvents, fetchSummary, tab])

  useEffect(() => {
    if (tab === 'traffic') {
      fetchEvents(1)
    }
  }, [fetchEvents, tab])

  async function handleToggle(enabled) {
    try {
      await api.updateProxyConfig({ enabled })
      setConfig(current => ({ ...current, enabled }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleUpdate(updates) {
    try {
      await api.updateProxyConfig(updates)
      setConfig(current => ({ ...current, ...updates }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAdd(body) {
    await api.addToBlocklist(body)
    await fetchBlocklist()
  }

  async function handleRemove(id) {
    await api.removeFromBlocklist(id)
    setBlocklist(current => current.filter(item => item.id !== id))
  }

  async function handleLoadMore() {
    setLoadingMore(true)
    await fetchEvents(eventsPage + 1, true)
    setLoadingMore(false)
  }

  const tabs = [
    { id: 'setup', label: 'SETUP' },
    { id: 'traffic', label: 'TRAFFIC' },
    { id: 'blocklist', label: 'BLOCKLIST' },
  ]

  function tabStyle(id) {
    const active = tab === id
    return {
      fontFamily: FONTS.mono, fontSize: 10, fontWeight: 600,
      padding: '7px 18px', borderRadius: 7, cursor: 'pointer',
      letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.15s',
      background: active ? 'rgba(79,142,247,0.12)' : 'transparent',
      border: `1px solid ${active ? 'rgba(79,142,247,0.35)' : 'rgba(79,142,247,0.12)'}`,
      color: active ? C.blue : C.muted,
    }
  }

  const enabled = config?.enabled ?? false

  return (
    <div className="page-padding" style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%', overflowX: 'hidden' }}>
      <div className="proxy-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ fontFamily: FONTS.display, fontSize: 14, letterSpacing: '0.1em' }}>LUCIUSPROXY</div>
            <div className={enabled ? 'pulse' : ''} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 6, fontFamily: FONTS.mono, fontSize: 9,
              background: enabled ? 'rgba(57,217,138,0.08)' : 'rgba(79,142,247,0.06)',
              border: `1px solid ${enabled ? 'rgba(57,217,138,0.25)' : 'rgba(79,142,247,0.15)'}`,
              color: enabled ? C.green : C.muted, letterSpacing: '0.08em',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: enabled ? C.green : C.dim, boxShadow: enabled ? `0 0 5px ${C.green}` : 'none' }} />
              {enabled ? 'ACTIVE' : 'INACTIVE'}
            </div>
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.dim }}>
            DNS-level threat interception · blocks before connections are made
          </div>
          {error && (
            <div style={{ marginTop: 8, fontFamily: FONTS.mono, fontSize: 10, color: C.red }}>
              {error}
            </div>
          )}
        </div>

        <div className="proxy-stats">
          {[
            { label: '24H BLOCKED', value: summary?.blocked_24h ?? '—', color: C.red },
            { label: '7D BLOCKED', value: summary?.blocked_7d ?? '—', color: C.orange },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: FONTS.display, fontSize: 28, color: stat.color, lineHeight: 1, textShadow: `0 0 14px ${stat.color}44` }}>{summaryLoading ? '—' : stat.value}</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 8, color: C.dim, letterSpacing: '0.1em', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {tabs.map(item => (
          <button key={item.id} style={tabStyle(item.id)} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {tab === 'setup' && (
          <SetupTab
            config={config}
            onToggle={handleToggle}
            onUpdate={handleUpdate}
          />
        )}
        {tab === 'traffic' && (
          <TrafficTab
            events={events}
            total={eventsTotal}
            loading={eventsLoading}
            onLoadMore={handleLoadMore}
            loadingMore={loadingMore}
          />
        )}
        {tab === 'blocklist' && (
          <BlocklistTab
            items={blocklist}
            loading={blocklistLoading}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        )}
      </div>
    </div>
  )
}