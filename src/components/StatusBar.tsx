import { useState } from 'react'

interface StatusBarProps {
  status: 'connecting' | 'connected' | 'error'
  error: string
  identityKey: string
}

export function StatusBar({ status, error, identityKey }: StatusBarProps) {
  const [copied, setCopied] = useState(false)

  const shortKey = identityKey.length > 16
    ? `${identityKey.slice(0, 8)}...${identityKey.slice(-4)}`
    : identityKey

  const handleCopy = async () => {
    if (!identityKey) return
    try {
      await navigator.clipboard.writeText(identityKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="status-bar">
      {status === 'connecting' && (
        <span className="status-badge connecting">
          <span className="pulse-dot" />
          Connecting to MessageBox...
        </span>
      )}
      {status === 'connected' && (
        <span className="status-badge connected" onClick={handleCopy} title="Click to copy your identity key">
          <span className="live-dot" />
          {copied ? 'Copied!' : shortKey}
          <span className="copy-icon">📋</span>
        </span>
      )}
      {status === 'error' && (
        <span className="status-badge error">
          {error || 'Connection failed. Is your MetaNet Client running?'}
        </span>
      )}
    </div>
  )
}
