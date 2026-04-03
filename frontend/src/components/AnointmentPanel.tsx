import { useState } from 'react'
import { MessageBoxClient, AdvertisementToken } from '@bsv/message-box-client'
import { shortKey } from '../App'

const BABBAGE_HOST = 'https://messagebox.babbage.systems'
const DEMO_BOX = 'demo_chat'

const BSVA_HOST_DEFAULT = 'https://message-box-us-1.bsvb.tech'

interface AnointmentPanelProps {
  client: MessageBoxClient | null
  myKey: string
  disabled: boolean
  onLog: (msg: string) => void
}

export function AnointmentPanel({ client, myKey, disabled, onLog }: AnointmentPanelProps) {

  // ── Card 1: Anoint a host ──────────────────────────────────────────────────
  const [anointUrl, setAnointUrl] = useState('')
  const [anointResult, setAnointResult] = useState<{ txid: string } | null>(null)
  const [anointLoading, setAnointLoading] = useState(false)
  const [anointError, setAnointError] = useState('')

  // ── Card 2: Dynamic host discovery ────────────────────────────────────────
  const [discoverKey, setDiscoverKey] = useState('')
  const [resolvedHost, setResolvedHost] = useState('')
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverError, setDiscoverError] = useState('')

  // ── Card 3: Host switching (with revocation) ───────────────────────────────
  const [currentTokens, setCurrentTokens] = useState<AdvertisementToken[]>([])
  const [advertsLoaded, setAdvertsLoaded] = useState(false)
  const [switchUrl, setSwitchUrl] = useState('')
  const [switchLoading, setSwitchLoading] = useState(false)
  const [switchLog, setSwitchLog] = useState<string[]>([])
  const [switchError, setSwitchError] = useState('')
  const [switchDone, setSwitchDone] = useState(false)
  const [reResolvedHost, setReResolvedHost] = useState('')

  // ── Card 4: Multi-host demo ────────────────────────────────────────────────
  const [multiHostA, setMultiHostA] = useState(BABBAGE_HOST)
  const [multiHostB, setMultiHostB] = useState(BSVA_HOST_DEFAULT)
  const [multiLog, setMultiLog] = useState<string[]>([])
  const [multiLoading, setMultiLoading] = useState(false)
  const [multiError, setMultiError] = useState('')
  const [multiStep, setMultiStep] = useState(0) // 0=idle, 1=anointed B, 2=sent, 3=received

  // ── Helpers ────────────────────────────────────────────────────────────────
  const addSwitchLog = (msg: string) => setSwitchLog(prev => [...prev, msg])
  const addMultiLog = (msg: string) => setMultiLog(prev => [...prev, msg])

  // ── Card 1 handler ─────────────────────────────────────────────────────────
  const handleAnointHost = async () => {
    if (!client || !anointUrl.trim()) return
    setAnointLoading(true)
    setAnointError('')
    setAnointResult(null)
    try {
      const result = await client.anointHost(anointUrl.trim())
      setAnointResult(result)
      onLog(`📡 Anointed host: ${anointUrl.trim()} (txid: ${result.txid.slice(0, 12)}…)`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Anointing failed'
      setAnointError(msg)
      onLog(`❌ Anoint failed: ${msg}`)
    } finally {
      setAnointLoading(false)
    }
  }

  // ── Card 2 handler ─────────────────────────────────────────────────────────
  const handleDiscoverHost = async () => {
    if (!client || !discoverKey.trim()) return
    setDiscoverLoading(true)
    setDiscoverError('')
    setResolvedHost('')
    try {
      const host = await client.resolveHostForRecipient(discoverKey.trim())
      setResolvedHost(host)
      onLog(`🔍 Resolved host for ${shortKey(discoverKey.trim())}: ${host}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Discovery failed'
      setDiscoverError(msg)
      onLog(`❌ Discovery failed: ${msg}`)
    } finally {
      setDiscoverLoading(false)
    }
  }

  // ── Card 3 handlers ────────────────────────────────────────────────────────
  const loadCurrentAdverts = async () => {
    if (!client || !myKey) return
    try {
      const tokens = await client.queryAdvertisements(myKey)
      setCurrentTokens(tokens)
      setAdvertsLoaded(true)
      onLog(`📋 Found ${tokens.length} active advertisement(s)`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to query advertisements'
      onLog(`❌ ${msg}`)
    }
  }

  const handleSwitchHost = async () => {
    if (!client || !switchUrl.trim()) return
    setSwitchLoading(true)
    setSwitchError('')
    setSwitchLog([])
    setSwitchDone(false)
    setReResolvedHost('')
    try {
      // Anoint the new host — the overlay resolver picks the most recent advertisement,
      // so senders who re-resolve will automatically find the new host.
      // anointHost revokes existing advertisements internally before broadcasting the new one.
      addSwitchLog(`Anointing new host: ${switchUrl.trim()}…`)
      const result = await client.anointHost(switchUrl.trim())
      addSwitchLog(`✅ New host anointed (txid: ${result.txid.slice(0, 12)}…)`)
      onLog(`🔄 Switched to ${switchUrl.trim()} (txid: ${result.txid.slice(0, 12)}…)`)

      setSwitchDone(true)
      await loadCurrentAdverts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Host switch failed'
      setSwitchError(msg)
      onLog(`❌ Host switch failed: ${msg}`)
    } finally {
      setSwitchLoading(false)
    }
  }

  const handleReResolve = async () => {
    if (!client || !myKey) return
    setReResolvedHost('')
    try {
      const host = await client.resolveHostForRecipient(myKey)
      setReResolvedHost(host)
      onLog(`✅ Re-resolved my host: ${host}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Re-resolve failed'
      onLog(`❌ Re-resolve failed: ${msg}`)
    }
  }

  // ── Card 4 handlers ────────────────────────────────────────────────────────
  const handleAnointHostB = async () => {
    if (!client || !multiHostB.trim()) return
    setMultiLoading(true)
    setMultiError('')
    setMultiLog([])
    setMultiStep(0)
    try {
      // Anoint Host B — resolver picks the most recent advertisement
      addMultiLog(`Anointing Host B: ${multiHostB.trim()}…`)
      const result = await client.anointHost(multiHostB.trim())
      addMultiLog(`✅ Host B anointed (txid: ${result.txid.slice(0, 12)}…)`)
      onLog(`📡 Multi-host: anointed Host B ${multiHostB.trim()}`)
      setMultiStep(1)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setMultiError(msg)
      onLog(`❌ Multi-host anoint failed: ${msg}`)
    } finally {
      setMultiLoading(false)
    }
  }

  const handleMultiSendTest = async () => {
    if (!client || !myKey) return
    setMultiLoading(true)
    setMultiError('')
    try {
      // Resolve where messages should go — should now return Host B
      const resolvedHost = await client.resolveHostForRecipient(myKey)
      addMultiLog(`Resolved my host: ${resolvedHost}`)

      // Send a test message to ourselves (goes to resolved host)
      const body = `Multi-host test @ ${new Date().toLocaleTimeString()}`
      await client.sendMessage({
        recipient: myKey,
        messageBox: DEMO_BOX,
        body,
        skipEncryption: true
      })
      addMultiLog(`✅ Sent test message to myself at ${resolvedHost}`)
      onLog(`📤 Multi-host: sent test message → ${resolvedHost}`)
      setMultiStep(2)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed'
      setMultiError(msg)
      onLog(`❌ Multi-host send failed: ${msg}`)
    } finally {
      setMultiLoading(false)
    }
  }

  const handleMultiCheckMailbox = async () => {
    if (!client) return
    setMultiLoading(true)
    setMultiError('')
    try {
      // List messages at Host B specifically
      const msgs = await client.listMessages({
        messageBox: DEMO_BOX,
        host: multiHostB.trim(),
        acceptPayments: false
      })
      addMultiLog(`📬 Found ${msgs.length} message(s) at Host B`)
      if (msgs.length > 0) {
        const latest = msgs[msgs.length - 1]
        const body = typeof latest.body === 'string' ? latest.body : JSON.stringify(latest.body)
        addMultiLog(`Latest: "${body}"`)
        onLog(`✅ Multi-host: received message at Host B — "${body.slice(0, 40)}"`)
        // Acknowledge
        await client.acknowledgeMessage({ messageIds: [latest.messageId], host: multiHostB.trim() })
      }
      setMultiStep(3)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Mailbox check failed'
      setMultiError(msg)
      onLog(`❌ Multi-host mailbox failed: ${msg}`)
    } finally {
      setMultiLoading(false)
    }
  }

  const handleRestoreHostA = async () => {
    if (!client) return
    setMultiLoading(true)
    setMultiError('')
    try {
      const result = await client.anointHost(multiHostA.trim())
      addMultiLog(`✅ Restored Host A: ${multiHostA.trim()} (txid: ${result.txid.slice(0, 12)}…)`)
      onLog(`🔙 Multi-host: restored Host A ${multiHostA.trim()}`)
      setMultiStep(0)
      setMultiLog([])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Restore failed'
      setMultiError(msg)
    } finally {
      setMultiLoading(false)
    }
  }

  return (
    <section className="anointment-section">
      <div className="anointment-header">
        <span className="anointment-icon">📡</span>
        <div>
          <h2 className="anointment-title">Anointment Demo</h2>
          <p className="anointment-subtitle">
            Anointing lets you publish a signed on-chain advertisement declaring which host routes
            messages for your identity key. Anyone can discover it — no hardcoded URLs needed.
          </p>
        </div>
      </div>

      <div className="anointment-cards">

        {/* ── Card 1: Anoint a host ── */}
        <div className="anoint-card">
          <div className="anoint-card-header">
            <span className="anoint-card-num">1</span>
            <span className="anoint-card-title">Anoint a Host</span>
          </div>
          <p className="anoint-card-desc">
            Broadcast a signed overlay advertisement under the <code>tm_messagebox</code> topic
            declaring your preferred MessageBox server. Senders use this to route messages without
            any out-of-band configuration.
          </p>
          <div className="anoint-row">
            <input
              className="anoint-input"
              type="text"
              value={anointUrl}
              onChange={e => setAnointUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnointHost()}
              placeholder="https://your-messagebox-host.example.com"
              disabled={disabled || anointLoading}
            />
            <button
              className="anoint-btn"
              onClick={handleAnointHost}
              disabled={disabled || anointLoading || !anointUrl.trim()}
            >
              {anointLoading ? 'Anointing…' : 'Anoint'}
            </button>
          </div>
          {anointError && <div className="anoint-error">{anointError}</div>}
          {anointResult && (
            <div className="anoint-result">
              ✅ Host anointed on-chain!
              <div className="anoint-txid">txid: <code>{anointResult.txid}</code></div>
            </div>
          )}
          <div className="anoint-api-hint">
            <code>await client.anointHost(host)</code>
          </div>
        </div>

        {/* ── Card 2: Dynamic host discovery ── */}
        <div className="anoint-card">
          <div className="anoint-card-header">
            <span className="anoint-card-num">2</span>
            <span className="anoint-card-title">Dynamic Host Discovery</span>
          </div>
          <p className="anoint-card-desc">
            Given any identity key, resolve their currently anointed host at runtime via the
            <code> ls_messagebox</code> overlay lookup. No static config required — the network
            tells you where to send messages.
          </p>
          <div className="anoint-row">
            <input
              className="anoint-input"
              type="text"
              value={discoverKey}
              onChange={e => setDiscoverKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDiscoverHost()}
              placeholder="Paste any identity key to look up their host…"
              disabled={disabled || discoverLoading}
            />
            <button
              className="anoint-btn"
              onClick={handleDiscoverHost}
              disabled={disabled || discoverLoading || !discoverKey.trim()}
            >
              {discoverLoading ? 'Resolving…' : 'Resolve'}
            </button>
          </div>
          {myKey && (
            <button
              className="anoint-link-btn"
              onClick={() => setDiscoverKey(myKey)}
              disabled={disabled}
            >
              Use my own key
            </button>
          )}
          {discoverError && <div className="anoint-error">{discoverError}</div>}
          {resolvedHost && (
            <div className="anoint-result">
              Host resolved: <code>{resolvedHost}</code>
            </div>
          )}
          <div className="anoint-api-hint">
            <code>await client.resolveHostForRecipient(identityKey)</code>
          </div>
        </div>

        {/* ── Card 3: Host switching with revocation ── */}
        <div className="anoint-card">
          <div className="anoint-card-header">
            <span className="anoint-card-num">3</span>
            <span className="anoint-card-title">Host Switching</span>
          </div>
          <p className="anoint-card-desc">
            Switch to a new host cleanly: existing advertisements are revoked and the new host
            is anointed in a single <code>anointHost</code> call. Senders who re-resolve will
            automatically discover the updated host.
          </p>

          <button
            className="anoint-link-btn"
            onClick={loadCurrentAdverts}
            disabled={disabled || !myKey}
          >
            {advertsLoaded ? 'Refresh my advertisements' : 'Load my current advertisements'}
          </button>

          {advertsLoaded && (
            <div className="anoint-adverts">
              {currentTokens.length === 0
                ? <span className="anoint-advert-empty">No active advertisements</span>
                : currentTokens.map((t, i) => (
                  <div key={i} className="anoint-advert-row">
                    <span className="advert-dot" />
                    <code className="advert-host">{t.host}</code>
                    <span className="advert-txid">{t.txid.slice(0, 10)}…</span>
                  </div>
                ))
              }
            </div>
          )}

          <div className="anoint-row" style={{ marginTop: 8 }}>
            <input
              className="anoint-input"
              type="text"
              value={switchUrl}
              onChange={e => setSwitchUrl(e.target.value)}
              placeholder="https://new-host.example.com"
              disabled={disabled || switchLoading}
            />
            <button
              className="anoint-btn"
              onClick={handleSwitchHost}
              disabled={disabled || switchLoading || !switchUrl.trim()}
            >
              {switchLoading ? 'Switching…' : 'Switch Host'}
            </button>
          </div>

          {switchError && <div className="anoint-error">{switchError}</div>}

          {switchLog.length > 0 && (
            <div className="anoint-step-log">
              {switchLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}

          {switchDone && (
            <button
              className="anoint-verify-btn"
              onClick={handleReResolve}
              disabled={disabled}
            >
              Re-resolve to verify →
            </button>
          )}

          {reResolvedHost && (
            <div className="anoint-result">
              Re-resolved: <code>{reResolvedHost}</code>
            </div>
          )}

          <div className="anoint-api-hint">
            <code>anointHost(newHost)</code> (revokes old ads internally) → <code>resolveHostForRecipient(myKey)</code>
          </div>
        </div>

        {/* ── Card 4: Multi-host demo ── */}
        <div className="anoint-card anoint-card-wide">
          <div className="anoint-card-header">
            <span className="anoint-card-num">4</span>
            <span className="anoint-card-title">Multi-Host Portability</span>
          </div>
          <p className="anoint-card-desc">
            Demonstrate that you can switch between two independent hosts (e.g. Babbage and BSVA)
            and still receive messages. Senders who re-resolve your key automatically find you at
            the new host — no manual reconfiguration needed.
          </p>

          <div className="multi-host-inputs">
            <div className="multi-host-field">
              <label className="multi-host-label">Host A</label>
              <input
                className="anoint-input"
                type="text"
                value={multiHostA}
                onChange={e => setMultiHostA(e.target.value)}
                placeholder="https://messagebox.babbage.systems"
                disabled={disabled || multiLoading}
              />
            </div>
            <div className="multi-host-arrow">→</div>
            <div className="multi-host-field">
              <label className="multi-host-label">Host B</label>
              <input
                className="anoint-input"
                type="text"
                value={multiHostB}
                onChange={e => setMultiHostB(e.target.value)}
                placeholder="https://BSVA-messagebox-URL…"
                disabled={disabled || multiLoading}
              />
            </div>
          </div>

          <div className="multi-host-steps">
            <button
              className={`anoint-btn ${multiStep >= 1 ? 'anoint-btn-done' : ''}`}
              onClick={handleAnointHostB}
              disabled={disabled || multiLoading || !multiHostB.trim() || multiStep >= 1}
            >
              {multiStep >= 1 ? '✅ 1. Host B anointed' : '1. Anoint Host B'}
            </button>
            <button
              className={`anoint-btn ${multiStep >= 2 ? 'anoint-btn-done' : ''}`}
              onClick={handleMultiSendTest}
              disabled={disabled || multiLoading || multiStep < 1 || multiStep >= 2}
            >
              {multiStep >= 2 ? '✅ 2. Test message sent' : '2. Send test message to myself'}
            </button>
            <button
              className={`anoint-btn ${multiStep >= 3 ? 'anoint-btn-done' : ''}`}
              onClick={handleMultiCheckMailbox}
              disabled={disabled || multiLoading || multiStep < 2 || multiStep >= 3}
            >
              {multiStep >= 3 ? '✅ 3. Message received at Host B' : '3. Check mailbox at Host B'}
            </button>
            {multiStep >= 3 && (
              <button
                className="anoint-link-btn"
                onClick={handleRestoreHostA}
                disabled={disabled || multiLoading}
              >
                Reset: restore Host A
              </button>
            )}
          </div>

          {multiError && <div className="anoint-error">{multiError}</div>}

          {multiLog.length > 0 && (
            <div className="anoint-step-log">
              {multiLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}

          <div className="anoint-api-hint">
            <code>anointHost(hostB)</code> →{' '}
            <code>sendMessage()</code> → <code>listMessages(&#123; host: hostB &#125;)</code>
          </div>
        </div>

      </div>
    </section>
  )
}
