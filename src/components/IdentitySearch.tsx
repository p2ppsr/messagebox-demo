import { useState, useRef, useEffect, useCallback } from 'react'
import { IdentityClient } from '@bsv/sdk'
import type { DisplayableIdentity } from '@bsv/sdk'
import { Img } from '@bsv/uhrp-react'

const identityClient = new IdentityClient()
const DEBOUNCE_MS = 400
const MIN_QUERY_LENGTH = 2

function isIdentityKey(s: string): boolean {
  return /^(02|03|04)[0-9a-fA-F]{64}$/.test(s)
}

interface IdentitySearchProps {
  onSelect: (identity: DisplayableIdentity) => void
  disabled?: boolean
}

export function IdentitySearch({ onSelect, disabled }: IdentitySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DisplayableIdentity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const requestIdRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || trimmed.length < MIN_QUERY_LENGTH) {
      setResults([])
      setIsLoading(false)
      return
    }

    const reqId = ++requestIdRef.current
    setIsLoading(true)

    try {
      let identities: DisplayableIdentity[]

      if (isIdentityKey(trimmed)) {
        identities = await identityClient.resolveByIdentityKey({ identityKey: trimmed }, true)
      } else {
        const isHandle = trimmed.startsWith('@')
        identities = await identityClient.resolveByAttributes({
          attributes: isHandle
            ? { userName: trimmed.slice(1) }
            : { any: trimmed },
          limit: 10
        }, true)
      }

      // Only apply if this is still the latest request
      if (reqId === requestIdRef.current) {
        const seen = new Set<string>()
        const unique = identities.filter(i => {
          if (seen.has(i.identityKey)) return false
          seen.add(i.identityKey)
          return true
        })
        setResults(unique)
        setShowDropdown(unique.length > 0)
      }
    } catch {
      if (reqId === requestIdRef.current) {
        setResults([])
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), DEBOUNCE_MS)
  }

  const handleSelect = (identity: DisplayableIdentity) => {
    setQuery('')
    setResults([])
    setShowDropdown(false)
    onSelect(identity)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmed = query.trim()
      // If it looks like an identity key, submit directly
      if (isIdentityKey(trimmed)) {
        setQuery('')
        setResults([])
        setShowDropdown(false)
        onSelect({
          identityKey: trimmed,
          name: '',
          abbreviatedKey: `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`,
          avatarURL: '',
          badgeIconURL: '',
          badgeLabel: '',
          badgeClickURL: ''
        })
      }
    }
  }

  return (
    <div className="identity-search" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={e => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        placeholder="Search by name, @handle, or paste an identity key..."
        disabled={disabled}
      />
      {isLoading && <div className="identity-search-loading" />}
      {showDropdown && results.length > 0 && (
        <div className="identity-search-dropdown">
          {results.map((identity) => (
            <button
              key={identity.identityKey}
              className="identity-search-item"
              onClick={() => handleSelect(identity)}
            >
              <Img
                className="identity-avatar"
                src={identity.avatarURL}
                alt=""
                fallback={
                  <div className="identity-avatar identity-avatar-fallback">
                    {identity.name.charAt(0).toUpperCase()}
                  </div>
                }
              />
              <div className="identity-info">
                <span className="identity-name">{identity.name}</span>
                <span className="identity-key">{identity.abbreviatedKey}</span>
              </div>
              {identity.badgeLabel && (
                <span className="identity-badge">{identity.badgeLabel}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
