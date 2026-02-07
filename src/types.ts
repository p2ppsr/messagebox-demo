export interface ChatMessage {
  id: string
  text: string
  sender: string
  recipient: string
  timestamp: number
  method: SendMethod
}

export interface Participant {
  identityKey: string
  shortName: string
  color: string
  joinedAt: number
}

export type DeliveryPhase = 'to-sender' | 'at-sender' | 'to-postoffice' | 'to-recipient' | 'returning' | 'direct'

export interface Delivery {
  id: number
  from: string
  to: string
  text: string
  phase: DeliveryPhase
  startTime: number
  method: SendMethod
}

export type SendMethod = 'http' | 'socket'

export type RightPanelTab = 'socket' | 'http'
