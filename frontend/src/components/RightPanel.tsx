import { useState, useEffect, useRef } from 'react'
import { ChatMessage, Participant, RightPanelTab } from '../types'
import { shortKey, generateColor } from '../App'
import { Img } from '@bsv/uhrp-react'

interface RightPanelProps {
  activeTab: RightPanelTab
  onTabChange: (tab: RightPanelTab) => void
  selectedPerson: string | null
  participants: Participant[]
  socketMessages: ChatMessage[]
  httpMessages: ChatMessage[]
  myKey: string
  composeInput: string
  onComposeChange: (val: string) => void
  onSend: (e: React.FormEvent) => void
  onSendPayment: (amount: number, via: 'socket' | 'http') => void
  onCheckMailbox: () => void
  disabled: boolean
}

export function RightPanel({
  activeTab,
  onTabChange,
  selectedPerson,
  participants,
  socketMessages,
  httpMessages,
  myKey,
  composeInput,
  onComposeChange,
  onSend,
  onSendPayment,
  onCheckMailbox,
  disabled
}: RightPanelProps) {
  const endRef = useRef<HTMLDivElement>(null)
  const prevSocketCountRef = useRef(socketMessages.length)
  const prevHttpCountRef = useRef(httpMessages.length)
  const [paymentAmount, setPaymentAmount] = useState('')

  useEffect(() => {
    if (socketMessages.length > prevSocketCountRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    prevSocketCountRef.current = socketMessages.length
  }, [socketMessages.length])

  useEffect(() => {
    if (httpMessages.length > prevHttpCountRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    prevHttpCountRef.current = httpMessages.length
  }, [httpMessages.length])

  const isMine = (msg: ChatMessage) => msg.sender === myKey
  const selectedParticipant = selectedPerson
    ? participants.find(p => p.identityKey === selectedPerson)
    : undefined
  const displayName = selectedParticipant?.displayName || (selectedPerson ? shortKey(selectedPerson) : '')

  return (
    <div className="right-panel">
      {/* Mode Tabs */}
      <div className="panel-tabs">
        <button
          className={`panel-tab ${activeTab === 'socket' ? 'active' : ''}`}
          onClick={() => onTabChange('socket')}
        >
          <span className="tab-icon">⚡</span>
          <span className="tab-label">Live Chat</span>
          <span className="tab-api">sendLiveMessage</span>
        </button>
        <button
          className={`panel-tab ${activeTab === 'http' ? 'active' : ''}`}
          onClick={() => onTabChange('http')}
        >
          <span className="tab-icon">📮</span>
          <span className="tab-label">Post Office</span>
          <span className="tab-api">sendMessage</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════
          SOCKET MODE — Live Chat
          ═══════════════════════════════════════ */}
      {activeTab === 'socket' && (
        <div className="panel-content">
          <div className="mode-description">
            <strong>Real-time messaging</strong> via WebSocket.
            Messages travel instantly over the telephone wire.
          </div>

          {!selectedPerson ? (
            <div className="empty-chat">
              <div className="empty-chat-icon">⚡</div>
              <p>Select someone in the town</p>
              <p className="empty-chat-hint">
                Click a house to start a live conversation
              </p>
            </div>
          ) : (
            <>
              <div className="conversation-header">
                {selectedParticipant?.avatarURL ? (
                  <Img
                    className="conv-avatar-img"
                    src={selectedParticipant.avatarURL}
                    alt=""
                    fallback={
                      <div className="conv-avatar" style={{ background: generateColor(selectedPerson) }}>
                        {(selectedParticipant.displayName || selectedPerson).charAt(0).toUpperCase()}
                      </div>
                    }
                  />
                ) : (
                  <div className="conv-avatar" style={{ background: generateColor(selectedPerson) }}>
                    {(selectedParticipant?.displayName || selectedPerson).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="conv-info">
                  <span className="conv-name">{displayName}</span>
                  {selectedParticipant?.displayName && (
                    <span className="conv-key">{shortKey(selectedPerson)}</span>
                  )}
                  <span className="conv-method">⚡ Live connection</span>
                </div>
              </div>

              <div className="messages-list">
                {socketMessages.length === 0 && (
                  <div className="empty-chat">
                    <div className="empty-chat-icon">�</div>
                    <p>No live messages yet</p>
                    <p className="empty-chat-hint">
                      Type a message — it'll zip over the wire instantly
                    </p>
                  </div>
                )}

                {socketMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`msg-row ${isMine(msg) ? 'msg-sent' : 'msg-received'}`}
                  >
                    {!isMine(msg) && (
                      <div className="msg-avatar" style={{ background: generateColor(msg.sender) }}>
                        {msg.sender.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="msg-content">
                      {!isMine(msg) && (
                        <span className="msg-sender" style={{ color: generateColor(msg.sender) }}>
                          {shortKey(msg.sender)}
                        </span>
                      )}
                      <div className={`msg-bubble ${isMine(msg) ? 'bubble-mine' : 'bubble-other'} ${msg.amount ? 'payment-bubble' : ''}`}>
                        {msg.amount ? `💸 ${msg.amount.toLocaleString()} sats` : msg.text}
                      </div>
                      <span className="msg-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        {msg.amount
                          ? <span className="method-tag method-payment">💸 Payment</span>
                          : <span className="method-tag method-socket">⚡ Live</span>
                        }
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <form className="chat-input-form" onSubmit={onSend}>
                <input
                  type="text"
                  value={composeInput}
                  onChange={e => onComposeChange(e.target.value)}
                  placeholder={disabled ? 'Connecting...' : `Live message to ${shortKey(selectedPerson)}...`}
                  disabled={disabled}
                  autoFocus
                />
                <button type="submit" disabled={disabled || !composeInput.trim()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
              <form className="chat-input-form payment-form" onSubmit={e => {
                e.preventDefault()
                const amt = parseInt(paymentAmount, 10)
                if (amt > 0) { onSendPayment(amt, 'socket'); setPaymentAmount('') }
              }}>
                <input
                  type="number"
                  min="1"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="Send sats..."
                  disabled={disabled}
                />
                <button type="submit" disabled={disabled || !paymentAmount || parseInt(paymentAmount, 10) <= 0} className="payment-send-btn">
                  💸
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
          HTTP MODE — Post Office / Mailbox
          ═══════════════════════════════════════ */}
      {activeTab === 'http' && (
        <div className="panel-content">
          <div className="mode-description">
            <strong>Store &amp; forward</strong> via HTTP.
            The mailman picks up your letter and delivers it to the post office.
          </div>

          {!selectedPerson ? (
            <div className="empty-chat">
              <div className="empty-chat-icon">📮</div>
              <p>Select someone in the town</p>
              <p className="empty-chat-hint">
                Click a house to send them a letter
              </p>
            </div>
          ) : (
            <>
              <div className="conversation-header">
                {selectedParticipant?.avatarURL ? (
                  <Img
                    className="conv-avatar-img"
                    src={selectedParticipant.avatarURL}
                    alt=""
                    fallback={
                      <div className="conv-avatar" style={{ background: generateColor(selectedPerson) }}>
                        {(selectedParticipant.displayName || selectedPerson).charAt(0).toUpperCase()}
                      </div>
                    }
                  />
                ) : (
                  <div className="conv-avatar" style={{ background: generateColor(selectedPerson) }}>
                    {(selectedParticipant?.displayName || selectedPerson).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="conv-info">
                  <span className="conv-name">{displayName}</span>
                  {selectedParticipant?.displayName && (
                    <span className="conv-key">{shortKey(selectedPerson)}</span>
                  )}
                  <span className="conv-method">📮 Store &amp; forward</span>
                </div>
              </div>

              {/* Check mailbox button */}
              <div className="mailbox-header">
                <button className="check-mailbox-btn" onClick={onCheckMailbox} disabled={disabled}>
                  📬 Check Mailbox
                </button>
                <span className="mailbox-hint">listMessages via HTTP</span>
              </div>

              <div className="messages-list">
                {httpMessages.length === 0 && (
                  <div className="empty-chat">
                    <div className="empty-chat-icon">📭</div>
                    <p>No letters yet</p>
                    <p className="empty-chat-hint">
                      Write a letter below, or check your mailbox for deliveries
                    </p>
                  </div>
                )}

                {httpMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`msg-row ${isMine(msg) ? 'msg-sent' : 'msg-received'}`}
                  >
                    {!isMine(msg) && (
                      <div className="msg-avatar" style={{ background: generateColor(msg.sender) }}>
                        {msg.sender.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="msg-content">
                      {!isMine(msg) && (
                        <span className="msg-sender" style={{ color: generateColor(msg.sender) }}>
                          {shortKey(msg.sender)}
                        </span>
                      )}
                      <div className={`msg-bubble ${isMine(msg) ? 'bubble-mine' : 'bubble-other'} ${msg.amount ? 'payment-bubble' : 'letter-style'}`}>
                        {msg.amount ? `💸 ${msg.amount.toLocaleString()} sats` : msg.text}
                      </div>
                      <span className="msg-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        {msg.amount
                          ? <span className="method-tag method-payment">💸 Payment</span>
                          : <span className="method-tag method-http">📮 Letter</span>
                        }
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <form className="chat-input-form" onSubmit={onSend}>
                <input
                  type="text"
                  value={composeInput}
                  onChange={e => onComposeChange(e.target.value)}
                  placeholder={disabled ? 'Connecting...' : `Write a letter to ${shortKey(selectedPerson)}...`}
                  disabled={disabled}
                  autoFocus
                />
                <button type="submit" disabled={disabled || !composeInput.trim()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
              <form className="chat-input-form payment-form" onSubmit={e => {
                e.preventDefault()
                const amt = parseInt(paymentAmount, 10)
                if (amt > 0) { onSendPayment(amt, 'http'); setPaymentAmount('') }
              }}>
                <input
                  type="number"
                  min="1"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="Send sats..."
                  disabled={disabled}
                />
                <button type="submit" disabled={disabled || !paymentAmount || parseInt(paymentAmount, 10) <= 0} className="payment-send-btn">
                  💸
                </button>
              </form>
            </>
          )}
        </div>
      )}

    </div>
  )
}
