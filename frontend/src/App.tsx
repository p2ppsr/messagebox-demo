import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageBoxClient, PeerPayClient } from '@bsv/message-box-client'
import { WalletClient } from '@bsv/sdk'
import type { DisplayableIdentity } from '@bsv/sdk'
import { Scene } from './components/Scene'
import { RightPanel } from './components/RightPanel'
import { StatusBar } from './components/StatusBar'
import { AnointmentPanel } from './components/AnointmentPanel'
import { IdentitySearch } from './components/IdentitySearch'
import { Delivery, ChatMessage, Participant, SendMethod, RightPanelTab } from './types'
import './styles.css'

const MESSAGE_BOX_HOST = 'https://messagebox.babbage.systems'
const MESSAGE_BOX_NAME = 'demo_chat'

export function generateColor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 65%, 55%)`
}

export function shortKey(key: string): string {
  return key.length > 16 ? `${key.slice(0, 6)}...${key.slice(-4)}` : key
}

export default function App() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [error, setError] = useState('')
  const [myKey, setMyKey] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<RightPanelTab>('socket')
  const [composeInput, setComposeInput] = useState('')
  const [log, setLog] = useState<string[]>([])

  const clientRef = useRef<MessageBoxClient | null>(null)
  const peerPayRef = useRef<PeerPayClient | null>(null)
  const myKeyRef = useRef('')
  const seenIdsRef = useRef<Set<string>>(new Set())
  const deliveryIdRef = useRef(0)

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 80))
  }, [])

  const addParticipant = useCallback((key: string) => {
    setParticipants(prev => {
      if (prev.find(p => p.identityKey === key)) return prev
      return [...prev, {
        identityKey: key,
        shortName: shortKey(key),
        color: generateColor(key),
        joinedAt: Date.now()
      }]
    })
  }, [])

  const triggerDelivery = useCallback((from: string, to: string, text: string, method: SendMethod, host?: string) => {
    const id = ++deliveryIdRef.current

    if (method === 'socket') {
      // Socket: direct signal along telephone wire
      setDeliveries(prev => [...prev, {
        id, from, to, text, phase: 'direct' as const, startTime: Date.now(), method
      }])
      setTimeout(() => {
        setDeliveries(prev => prev.filter(d => d.id !== id))
      }, 1800)
    } else {
      // HTTP: mailman leaves PO → goes to sender → picks up letter → returns to PO → delivers to recipient → returns to PO
      setDeliveries(prev => [...prev, {
        id, from, to, text, phase: 'to-sender' as const, startTime: Date.now(), method, host
      }])
      // Phase 2: arrive at sender's house, pick up letter
      setTimeout(() => {
        setDeliveries(prev =>
          prev.map(d => d.id === id ? { ...d, phase: 'at-sender' as const } : d)
        )
      }, 1200)
      // Phase 3: walk back to post office with letter
      setTimeout(() => {
        setDeliveries(prev =>
          prev.map(d => d.id === id ? { ...d, phase: 'to-postoffice' as const } : d)
        )
      }, 2000)
      // Phase 4: deliver to recipient
      setTimeout(() => {
        setDeliveries(prev =>
          prev.map(d => d.id === id ? { ...d, phase: 'to-recipient' as const } : d)
        )
      }, 3200)
      // Phase 5: return to post office
      setTimeout(() => {
        setDeliveries(prev =>
          prev.map(d => d.id === id ? { ...d, phase: 'returning' as const } : d)
        )
      }, 4400)
      // Done — remove
      setTimeout(() => {
        setDeliveries(prev => prev.filter(d => d.id !== id))
      }, 5600)
    }
  }, [])

  // Initialize client
  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const walletClient = new WalletClient()
        const { publicKey } = await walletClient.getPublicKey({ identityKey: true })
        if (!mounted) return
        setMyKey(publicKey)
        myKeyRef.current = publicKey
        addParticipant(publicKey)
        addLog('Wallet connected: ' + shortKey(publicKey))

        const client = new MessageBoxClient({
          host: MESSAGE_BOX_HOST,
          walletClient,
          enableLogging: true,
          networkPreset: 'mainnet'
        })

        await client.init(MESSAGE_BOX_HOST)
        clientRef.current = client
        addLog('MessageBox client initialized')

        const peerPay = new PeerPayClient({
          walletClient,
          messageBoxHost: MESSAGE_BOX_HOST
        })
        peerPayRef.current = peerPay
        addLog('PeerPay client initialized')

        // Mark as connected now — WebSocket is optional for anointment features
        if (!mounted) return
        setStatus('connected')
        addLog('✅ Ready! Add a friend to start chatting')

        // Set up live message listening via sockets (best-effort — failure won't block the rest)
        try {
          await client.initializeConnection(MESSAGE_BOX_HOST)
          addLog('WebSocket connection established')

          await client.listenForLiveMessages({
            messageBox: MESSAGE_BOX_NAME,
            overrideHost: MESSAGE_BOX_HOST,
            onMessage: (msg) => {
              if (!mounted) return
              const body = typeof msg.body === 'string' ? msg.body : JSON.stringify(msg.body)

              // Check if this is a presence announcement
              try {
                const parsed = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body
                if (parsed && parsed.type === 'presence') {
                  addParticipant(msg.sender)
                  addLog(`🏘️ ${shortKey(msg.sender)} joined the town (via socket)`)
                  return
                }
              } catch {
                // Not JSON, treat as regular message
              }

              if (seenIdsRef.current.has(msg.messageId)) return
              seenIdsRef.current.add(msg.messageId)

              addParticipant(msg.sender)
              addLog(`📨 Live message from ${shortKey(msg.sender)} (via socket)`)
              triggerDelivery(msg.sender, myKeyRef.current, body, 'socket')

              // Add message after delivery animation completes
              setTimeout(() => {
                setMessages(prev => [...prev, {
                  id: msg.messageId,
                  text: body,
                  sender: msg.sender,
                  recipient: myKeyRef.current,
                  timestamp: Date.now(),
                  method: 'socket'
                }])
              }, 1500)
            }
          })
        } catch (wsErr) {
          if (mounted) {
            const wsMsg = wsErr instanceof Error ? wsErr.message : 'WebSocket unavailable'
            addLog(`⚠️ Live chat unavailable: ${wsMsg}`)
          }
        }

      } catch (e: unknown) {
        if (!mounted) return
        const message = e instanceof Error ? e.message : 'Failed to connect'
        setError(message)
        setStatus('error')
        addLog('❌ Error: ' + message)
      }
    }

    init()

    return () => {
      mounted = false
      clientRef.current?.disconnectWebSocket()
    }
  }, [addParticipant, triggerDelivery, addLog])

  // Add a friend to the town
  const handleAddFriend = async (identity: DisplayableIdentity) => {
    const key = identity.identityKey
    if (!key || !clientRef.current || key === myKey) return
    setParticipants(prev => {
      const existing = prev.find(p => p.identityKey === key)
      if (existing) {
        // Update with identity info if we didn't have it before
        if (!existing.displayName && identity.name) {
          return prev.map(p => p.identityKey === key
            ? { ...p, displayName: identity.name, avatarURL: identity.avatarURL }
            : p
          )
        }
        return prev
      }
      return [...prev, {
        identityKey: key,
        shortName: shortKey(key),
        color: generateColor(key),
        joinedAt: Date.now(),
        displayName: identity.name || undefined,
        avatarURL: identity.avatarURL || undefined
      }]
    })
    const label = identity.name || shortKey(key)
    addLog(`🏘️ Added ${label} to town`)
    setSelectedPerson(key)
    setActiveTab('socket')

    // Send a presence announcement so they see us too
    try {
      await clientRef.current.sendLiveMessage({
        recipient: key,
        messageBox: MESSAGE_BOX_NAME,
        body: JSON.stringify({ type: 'presence', from: myKey }),
        skipEncryption: true
      }, MESSAGE_BOX_HOST)
      addLog(`📡 Sent presence notification to ${shortKey(key)} (socket)`)
    } catch {
      // Also try HTTP as fallback
      try {
        await clientRef.current.sendMessage({
          recipient: key,
          messageBox: MESSAGE_BOX_NAME,
          body: JSON.stringify({ type: 'presence', from: myKey }),
          skipEncryption: true
        }, MESSAGE_BOX_HOST)
        addLog(`📡 Sent presence notification to ${shortKey(key)} (HTTP fallback)`)
      } catch {
        addLog(`⚠️ Could not notify ${shortKey(key)} (they'll see you when they check mailbox)`)
      }
    }
  }

  // Click on a person in the town
  const handleSelectPerson = (key: string) => {
    if (key === myKey) return
    setSelectedPerson(key)
    setActiveTab('socket')
  }

  // Send a message to the selected person
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = composeInput.trim()
    if (!text || !clientRef.current || !myKey || !selectedPerson) return
    setComposeInput('')

    const recipient = selectedPerson
    const sendMethod: SendMethod = activeTab === 'socket' ? 'socket' : 'http'
    addLog(`📤 Sending to ${shortKey(recipient)} via ${sendMethod.toUpperCase()}...`)

    try {
      let resultId: string
      let resolvedHost: string | undefined

      if (sendMethod === 'socket') {
        // Real-time via WebSocket
        const result = await clientRef.current.sendLiveMessage({
          recipient,
          messageBox: MESSAGE_BOX_NAME,
          body: text,
          skipEncryption: true
        }, MESSAGE_BOX_HOST)
        resultId = result.messageId
        addLog(`✅ Sent via WebSocket (live)`)
      } else {
        // Resolve the recipient's anointed host
        try {
          resolvedHost = await clientRef.current.resolveHostForRecipient(recipient)
          addLog(`🔍 Resolved host for ${shortKey(recipient)}: ${resolvedHost}`)
        } catch {
          resolvedHost = MESSAGE_BOX_HOST
        }

        // Store-and-forward via HTTP — send to the resolved host
        const result = await clientRef.current.sendMessage({
          recipient,
          messageBox: MESSAGE_BOX_NAME,
          body: text,
          skipEncryption: true
        })
        resultId = result.messageId
        addLog(`✅ Sent via HTTP to ${resolvedHost}`)
      }

      // Animate the outbound delivery
      triggerDelivery(myKey, recipient, text, sendMethod, resolvedHost)

      // Optimistically add the sent message
      const msgDelay = sendMethod === 'socket' ? 1500 : 4800
      if (!seenIdsRef.current.has(resultId)) {
        seenIdsRef.current.add(resultId)
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: resultId,
            text,
            sender: myKey,
            recipient,
            timestamp: Date.now(),
            method: sendMethod
          }])
        }, msgDelay)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      addLog(`❌ Send failed: ${msg}`)
      console.error('Failed to send message:', err)
    }
  }

  // Send a payment to the selected person
  const handleSendPayment = async (amount: number, via: 'socket' | 'http') => {
    if (!peerPayRef.current || !myKey || !selectedPerson || amount <= 0) return

    const recipient = selectedPerson
    const label = via === 'socket' ? 'live' : 'HTTP'
    addLog(`💸 Sending ${amount} sats to ${shortKey(recipient)} via PeerPay (${label})...`)

    try {
      if (via === 'socket') {
        await peerPayRef.current.sendLivePayment({ recipient, amount })
      } else {
        await peerPayRef.current.sendPayment({ recipient, amount })
      }
      addLog(`✅ Payment of ${amount} sats sent via ${label}!`)

      // Animate — socket payments travel along the wire, HTTP payments use the mailman with green envelope
      let resolvedHost: string | undefined
      if (via === 'http') {
        try {
          resolvedHost = await clientRef.current?.resolveHostForRecipient(recipient)
        } catch {
          resolvedHost = MESSAGE_BOX_HOST
        }
        triggerDelivery(myKey, recipient, `${amount} sats`, 'payment', resolvedHost)
      } else {
        triggerDelivery(myKey, recipient, `${amount} sats`, 'socket')
      }

      // Add to message list — use the tab's method so it appears in the right tab
      const paymentId = `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const msgDelay = via === 'socket' ? 1500 : 4800
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: paymentId,
          text: `${amount} sats`,
          sender: myKey,
          recipient,
          timestamp: Date.now(),
          method: via,
          amount
        }])
      }, msgDelay)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      addLog(`❌ Payment failed: ${msg}`)
      console.error('Failed to send payment:', err)
    }
  }

  // Check the mailbox (listMessages via HTTP)
  const handleCheckMailbox = async () => {
    if (!clientRef.current) return
    addLog('📬 Checking mailbox (listMessages via HTTP)...')

    try {
      const msgs = await clientRef.current.listMessages({
        messageBox: MESSAGE_BOX_NAME,
        host: MESSAGE_BOX_HOST,
        acceptPayments: false
      })

      let newCount = 0
      for (const m of msgs) {
        if (seenIdsRef.current.has(m.messageId)) continue

        const body = typeof m.body === 'string' ? m.body : JSON.stringify(m.body)

        // Skip presence messages
        try {
          const parsed = typeof m.body === 'string' ? JSON.parse(m.body) : m.body
          if (parsed && parsed.type === 'presence') {
            addParticipant(m.sender)
            seenIdsRef.current.add(m.messageId)
            await clientRef.current.acknowledgeMessage({ messageIds: [m.messageId] })
            addLog(`🏘️ ${shortKey(m.sender)} joined the town (found in mailbox)`)
            continue
          }
        } catch {
          // Not JSON
        }

        seenIdsRef.current.add(m.messageId)
        addParticipant(m.sender)
        newCount++

        setMessages(prev => [...prev, {
          id: m.messageId,
          text: body,
          sender: m.sender,
          recipient: myKey,
          timestamp: new Date(m.created_at).getTime(),
          method: 'http'
        }])

        // Acknowledge after receiving
        await clientRef.current.acknowledgeMessage({ messageIds: [m.messageId] })
      }

      addLog(newCount > 0 ? `📬 Found ${newCount} new message(s)!` : '📭 No new messages')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      addLog(`❌ Mailbox check failed: ${msg}`)
    }
  }

  // Messages filtered by method and conversation partner
  const socketMessages = selectedPerson
    ? messages.filter(m =>
      m.method === 'socket' &&
      ((m.sender === selectedPerson && m.recipient === myKey) ||
        (m.sender === myKey && m.recipient === selectedPerson))
    )
    : []

  const httpMessages = selectedPerson
    ? messages.filter(m =>
      m.method === 'http' &&
      ((m.sender === selectedPerson && m.recipient === myKey) ||
        (m.sender === myKey && m.recipient === selectedPerson))
    )
    : []

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <span className="logo-icon">📬</span>
          <div>
            <h1>MessageBox Demo</h1>
            <p className="subtitle">Store &amp; Forward Messaging</p>
          </div>
        </div>
        <StatusBar status={status} error={error} identityKey={myKey} />
      </header>

      <div className="app-body">
        <div className="left-column">
          <Scene
            participants={participants}
            deliveries={deliveries}
            myKey={myKey}
            selectedPerson={selectedPerson}
            onSelectPerson={handleSelectPerson}
          />

          {/* Add Friend */}
          <div className="add-friend-bar">
            <IdentitySearch
              onSelect={handleAddFriend}
              disabled={status !== 'connected'}
            />
          </div>

          {/* Activity Log */}
          <div className="activity-log">
            <div className="log-header">
              <span>📋</span>
              <span>Activity Log</span>
            </div>
            <div className="log-entries">
              {log.length === 0 && <div className="log-empty">Waiting for activity...</div>}
              {log.map((entry, i) => (
                <div key={i} className="log-entry">{entry}</div>
              ))}
            </div>
          </div>
        </div>

        <RightPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedPerson={selectedPerson}
          participants={participants}
          socketMessages={socketMessages}
          httpMessages={httpMessages}
          myKey={myKey}
          composeInput={composeInput}
          onComposeChange={setComposeInput}
          onSend={handleSend}
          onSendPayment={handleSendPayment}
          onCheckMailbox={handleCheckMailbox}
          disabled={status !== 'connected'}
        />
      </div>

      <AnointmentPanel
        client={clientRef.current}
        myKey={myKey}
        disabled={status !== 'connected'}
        onLog={addLog}
      />

      <footer className="app-footer">
        <p>
          Messages are sent to <strong>MessageBox</strong> at{' '}
          <code>{MESSAGE_BOX_HOST}</code>.{' '}
          <strong>HTTP</strong> = store-and-forward (sendMessage) · <strong>Socket</strong> = real-time (sendLiveMessage) · <strong>Pay</strong> = peer payments (PeerPayClient).
          Click "Check Mailbox" to retrieve stored messages via listMessages.
        </p>
      </footer>
    </div>
  )
}
