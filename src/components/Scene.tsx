import { Delivery, Participant } from '../types'
import { TownScene } from './TownScene'

interface SceneProps {
  participants: Participant[]
  deliveries: Delivery[]
  myKey: string
  selectedPerson: string | null
  onSelectPerson: (key: string) => void
}

export function Scene({ participants, deliveries, myKey, selectedPerson, onSelectPerson }: SceneProps) {
  return (
    <div className="scene-container">
      <div className="scene-label">
        <span className="scene-label-icon">🏘️</span>
        <span>Town</span>
      </div>
      <TownScene
        participants={participants}
        deliveries={deliveries}
        myKey={myKey}
        selectedPerson={selectedPerson}
        onSelectPerson={onSelectPerson}
      />
      {deliveries.length > 0 && (
        <div className="delivery-status">
          {deliveries.map(d => (
            <div key={d.id} className={`delivery-pill ${d.phase}`}>
              {d.method === 'http' ? '📮' : '⚡'}
              {d.phase === 'to-sender' && ' Mailman → Your house'}
              {d.phase === 'at-sender' && ' 📬 Picking up letter'}
              {d.phase === 'to-postoffice' && ' → Post Office'}
              {d.phase === 'to-recipient' && ' → Delivering to house'}
              {d.phase === 'returning' && ' → Returning to Post Office'}
              {d.phase === 'direct' && ' Direct Signal'}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
