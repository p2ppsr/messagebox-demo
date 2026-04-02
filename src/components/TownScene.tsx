import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Delivery, Participant, SendMethod } from '../types'
import { shortKey, generateColor } from '../App'

/* ════════════════════════════════════════════
   Constants & helpers
   ════════════════════════════════════════════ */

const POST_OFFICE_POS = new THREE.Vector3(0, 0, 0)
const HOUSE_RADIUS = 4.0
const HOUSE_Y = 0

function hexToVec3(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

function getHousePosition(index: number, total: number): THREE.Vector3 {
  // Houses go on the far side of the road (z > 4.2) so they don't overlap the road or sidewalks
  const baseZ = 4.5
  if (total <= 1) return new THREE.Vector3(-3, HOUSE_Y, baseZ)
  if (total === 2) {
    const positions = [
      new THREE.Vector3(-3.5, HOUSE_Y, baseZ),
      new THREE.Vector3(3.5, HOUSE_Y, baseZ),
    ]
    return positions[index]!
  }
  // Spread houses evenly along the street, stagger into two rows if many
  const maxPerRow = 6
  const row = Math.floor(index / maxPerRow)
  const indexInRow = index % maxPerRow
  const totalInRow = Math.min(total - row * maxPerRow, maxPerRow)
  const spread = Math.min(totalInRow - 1, 5) * 2.0
  const x = totalInRow === 1 ? 0 : -spread / 2 + (indexInRow / (totalInRow - 1)) * spread
  const z = baseZ + row * 2.2
  return new THREE.Vector3(x, HOUSE_Y, z)
}

/* ════════════════════════════════════════════
   Ground & Environment
   ════════════════════════════════════════════ */

function Ground() {
  return (
    <group>
      {/* Main ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#2d6b14" roughness={1} />
      </mesh>
      {/* Inner grass - lighter */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#3a8520" roughness={0.95} />
      </mesh>
      {/* Grass highlight patches for texture variation */}
      {[[-3, 0.5], [4, 1.5], [-5, 3], [2, -0.5], [-1, 4], [5, 2.5]].map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x!, 0.005, z!]} receiveShadow>
          <circleGeometry args={[0.6 + (i % 3) * 0.3, 8]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#4a8b2e' : '#357a1a'} roughness={1} />
        </mesh>
      ))}
      {/* Sidewalk strips along the road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 2.6]}>
        <planeGeometry args={[14, 0.3]} />
        <meshStandardMaterial color="#b0a898" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 3.8]}>
        <planeGeometry args={[14, 0.3]} />
        <meshStandardMaterial color="#b0a898" roughness={0.9} />
      </mesh>
      {/* Sidewalk on the house side of the road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 4.1]}>
        <planeGeometry args={[14, 0.4]} />
        <meshStandardMaterial color="#c4b8a8" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Road() {
  return (
    <group>
      {/* Main road across the front */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 3.2]}>
        <planeGeometry args={[14, 1.0]} />
        <meshStandardMaterial color="#555555" roughness={0.85} />
      </mesh>
      {/* Road edges / curbs */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 2.68]}>
        <planeGeometry args={[14, 0.05]} />
        <meshStandardMaterial color="#999" roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 3.72]}>
        <planeGeometry args={[14, 0.05]} />
        <meshStandardMaterial color="#999" roughness={0.7} />
      </mesh>
      {/* Road to post office */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 1.5]}>
        <planeGeometry args={[1.2, 2.5]} />
        <meshStandardMaterial color="#555555" roughness={0.85} />
      </mesh>
      {/* Cobblestone area near post office */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0.5]}>
        <planeGeometry args={[2.8, 1.5]} />
        <meshStandardMaterial color="#6a6358" roughness={0.95} />
      </mesh>
      {/* Cobblestone detail stones */}
      {Array.from({ length: 20 }, (_, i) => {
        const cx = (i % 5 - 2) * 0.5 + (Math.sin(i * 7) * 0.15)
        const cz = Math.floor(i / 5) * 0.35 + 0.1
        return (
          <mesh key={`cob-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.018, cz]}>
            <circleGeometry args={[0.08, 6]} />
            <meshStandardMaterial color={i % 3 === 0 ? '#7a7268' : '#6e685e'} roughness={1} />
          </mesh>
        )
      })}
      {/* Road dashes */}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-5.5 + i * 1.0, 0.015, 3.2]}>
          <planeGeometry args={[0.5, 0.06]} />
          <meshStandardMaterial color="#7a7a50" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function Clouds() {
  return (
    <group>
      {[[-6, 10, -8], [4, 11, -10], [-2, 9.5, -6], [8, 10.5, -9], [-8, 11, -12]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh>
            <sphereGeometry args={[1.0 + (i % 3) * 0.3, 8, 6]} />
            <meshBasicMaterial color="white" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0.8, -0.1, 0]}>
            <sphereGeometry args={[0.7 + (i % 2) * 0.2, 8, 6]} />
            <meshBasicMaterial color="white" transparent opacity={0.8} />
          </mesh>
          <mesh position={[-0.6, -0.15, 0.2]}>
            <sphereGeometry args={[0.6 + (i % 3) * 0.15, 8, 6]} />
            <meshBasicMaterial color="white" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Sun() {
  return (
    <group position={[8, 12, -6]}>
      <mesh>
        <sphereGeometry args={[1.0, 32, 32]} />
        <meshBasicMaterial color="#FFF8E0" />
      </mesh>
      {/* Sun glow */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#FFEE88" transparent opacity={0.15} />
      </mesh>
      <pointLight color="#FFF5D0" intensity={2.5} distance={50} />
    </group>
  )
}

/* ════════════════════════════════════════════
   Streetlamp
   ════════════════════════════════════════════ */

function Streetlamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 1.6, 8]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Lamp head */}
      <mesh position={[0, 1.65, 0]}>
        <boxGeometry args={[0.2, 0.15, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} />
      </mesh>
      {/* Light bulb */}
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#FFCC00" />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#FFD080" intensity={0.6} distance={3} castShadow />
    </group>
  )
}

/* ════════════════════════════════════════════
   Tree
   ════════════════════════════════════════════ */

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 0.7, 6]} />
        <meshStandardMaterial color="#3E2723" />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.4, 8, 6]} />
        <meshStandardMaterial color="#1B5E20" />
      </mesh>
      <mesh position={[0.1, 1.1, 0.05]}>
        <sphereGeometry args={[0.3, 8, 6]} />
        <meshStandardMaterial color="#2E7D32" />
      </mesh>
      <mesh position={[-0.08, 1.2, -0.05]}>
        <sphereGeometry args={[0.25, 8, 6]} />
        <meshStandardMaterial color="#388E3C" />
      </mesh>
    </group>
  )
}

/* ════════════════════════════════════════════
   Fence
   ════════════════════════════════════════════ */

function Fence({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const s = new THREE.Vector3(...start)
  const e = new THREE.Vector3(...end)
  const mid = s.clone().add(e).multiplyScalar(0.5)
  const dir = e.clone().sub(s)
  const len = dir.length()
  const angle = Math.atan2(dir.x, dir.z)

  const posts = useMemo(() => {
    const count = Math.floor(len / 0.4)
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1)
      return new THREE.Vector3().lerpVectors(s, e, t)
    })
  }, [len, s, e])

  return (
    <group>
      {/* Horizontal rail */}
      <mesh position={[mid.x, 0.2, mid.z]} rotation={[0, angle, 0]}>
        <boxGeometry args={[0.04, 0.04, len]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      <mesh position={[mid.x, 0.35, mid.z]} rotation={[0, angle, 0]}>
        <boxGeometry args={[0.04, 0.04, len]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      {/* Posts */}
      {posts.map((p, i) => (
        <mesh key={i} position={[p.x, 0.22, p.z]}>
          <boxGeometry args={[0.05, 0.45, 0.05]} />
          <meshStandardMaterial color="#4E342E" />
        </mesh>
      ))}
    </group>
  )
}

/* ════════════════════════════════════════════
   Gable Roof geometry (triangular prism)
   ════════════════════════════════════════════ */

function useGableRoof(width: number, height: number, depth: number) {
  return useMemo(() => {
    const hw = width / 2
    const hd = depth / 2
    // Vertices: two triangles (front & back gable ends) + two rectangular slopes
    const vertices = new Float32Array([
      // Front gable triangle
      -hw, 0, hd,    hw, 0, hd,    0, height, hd,
      // Back gable triangle
      hw, 0, -hd,   -hw, 0, -hd,   0, height, -hd,
      // Left slope
      -hw, 0, hd,    0, height, hd,   0, height, -hd,
      -hw, 0, hd,    0, height, -hd, -hw, 0, -hd,
      // Right slope
      hw, 0, hd,     hw, 0, -hd,     0, height, -hd,
      hw, 0, hd,     0, height, -hd,  0, height, hd,
      // Bottom
      -hw, 0, hd,   -hw, 0, -hd,    hw, 0, -hd,
      -hw, 0, hd,    hw, 0, -hd,    hw, 0, hd,
    ])
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.computeVertexNormals()
    return geo
  }, [width, height, depth])
}

/* ════════════════════════════════════════════
   House (3D)
   ════════════════════════════════════════════ */

function House3D({ participant, position, isMe, isSelected, onClick }: {
  participant: Participant
  position: THREE.Vector3
  isMe: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const color = useMemo(() => hexToVec3(participant.color), [participant.color])
  const roofColor = useMemo(() => {
    const c = new THREE.Color(participant.color)
    c.multiplyScalar(0.7)
    return c
  }, [participant.color])
  const roofGeo = useGableRoof(1.3, 0.5, 1.05)

  // Hover state
  const [hovered, setHovered] = useState(false)

  // Gentle bob for selected house
  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (isSelected) {
      groupRef.current.position.y = position.y + Math.sin(Date.now() * 0.003) * 0.03
    } else {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, position.y, delta * 5)
    }
  })

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      onClick={(e) => { e.stopPropagation(); if (!isMe) onClick() }}
      onPointerOver={() => { if (!isMe) setHovered(true); document.body.style.cursor = isMe ? 'default' : 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
    >
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[1.1, 1.25, 32]} />
          <meshBasicMaterial color={participant.color} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Foundation */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[1.25, 0.06, 1.05]} />
        <meshStandardMaterial color="#7a6a52" />
      </mesh>

      {/* Walls */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.1, 0.8, 0.9]} />
        <meshStandardMaterial
          color={hovered ? '#FFF8E8' : '#F5F0E0'}
          roughness={0.85}
          emissive={isSelected ? color : new THREE.Color('#000')}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* Wall trim / base board */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[1.12, 0.04, 0.92]} />
        <meshStandardMaterial color="#C4B69C" roughness={0.9} />
      </mesh>

      {/* Gable roof */}
      <mesh geometry={roofGeo} position={[0, 0.85, 0]} castShadow>
        <meshStandardMaterial color={roofColor} roughness={0.7} />
      </mesh>
      {/* Roof overhang trim along the eaves */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[1.35, 0.03, 1.1]} />
        <meshStandardMaterial color="#5D4037" roughness={0.8} />
      </mesh>

      {/* Front gable wall fill (triangle above front wall) */}
      <mesh position={[0, 0.3, 0.451]}>
        <boxGeometry args={[0.2, 0.4, 0.02]} />
        <meshStandardMaterial color="#5D4037" roughness={0.8} />
      </mesh>
      {/* Door frame */}
      <mesh position={[0, 0.3, 0.449]}>
        <boxGeometry args={[0.24, 0.44, 0.01]} />
        <meshStandardMaterial color="#4A3528" roughness={0.9} />
      </mesh>
      {/* Door panel detail */}
      <mesh position={[0, 0.35, 0.46]}>
        <boxGeometry args={[0.14, 0.14, 0.005]} />
        <meshStandardMaterial color="#4E342E" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.2, 0.46]}>
        <boxGeometry args={[0.14, 0.1, 0.005]} />
        <meshStandardMaterial color="#4E342E" roughness={0.9} />
      </mesh>
      {/* Step */}
      <mesh position={[0, 0.06, 0.52]}>
        <boxGeometry args={[0.35, 0.04, 0.12]} />
        <meshStandardMaterial color="#8B7355" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.03, 0.55]}>
        <boxGeometry args={[0.4, 0.04, 0.1]} />
        <meshStandardMaterial color="#7a6a52" roughness={0.9} />
      </mesh>
      {/* Doorknob */}
      <mesh position={[0.06, 0.28, 0.47]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#D4A850" metalness={0.8} />
      </mesh>

      {/* Windows (warm glow) */}
      {[[-0.32, 0.5, 0.451], [0.32, 0.5, 0.451]].map((pos, i) => (
        <group key={i}>
          {/* Window recess */}
          <mesh position={[pos[0]!, pos[1]!, pos[2]! - 0.01]}>
            <boxGeometry args={[0.24, 0.24, 0.02]} />
            <meshStandardMaterial color="#3E2723" roughness={0.9} />
          </mesh>
          {/* Glass */}
          <mesh position={pos as [number, number, number]}>
            <boxGeometry args={[0.2, 0.2, 0.02]} />
            <meshBasicMaterial color="#FFE4A0" />
          </mesh>
          {/* Window frame - horizontal */}
          <mesh position={pos as [number, number, number]}>
            <boxGeometry args={[0.22, 0.02, 0.025]} />
            <meshStandardMaterial color="#5D4037" />
          </mesh>
          {/* Window frame - vertical */}
          <mesh position={pos as [number, number, number]}>
            <boxGeometry args={[0.02, 0.22, 0.025]} />
            <meshStandardMaterial color="#5D4037" />
          </mesh>
          {/* Window sill */}
          <mesh position={[pos[0]!, pos[1]! - 0.12, pos[2]! + 0.02]}>
            <boxGeometry args={[0.26, 0.02, 0.04]} />
            <meshStandardMaterial color="#C4B69C" />
          </mesh>
          {/* Window light */}
          <pointLight position={[pos[0]!, pos[1]!, pos[2]! + 0.1]} color="#FFE4A0" intensity={0.15} distance={1.5} />
        </group>
      ))}

      {/* Side windows */}
      {[[-0.551, 0.5, 0.15], [-0.551, 0.5, -0.2], [0.551, 0.5, 0.15], [0.551, 0.5, -0.2]].map((pos, i) => (
        <group key={`sw-${i}`}>
          <mesh position={pos as [number, number, number]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.15, 0.15, 0.02]} />
            <meshBasicMaterial color="#FFE4A0" />
          </mesh>
        </group>
      ))}

      {/* Chimney — sits on the roof slope */}
      <mesh position={[0.3, 1.25, -0.15]} castShadow>
        <boxGeometry args={[0.15, 0.4, 0.15]} />
        <meshStandardMaterial color="#8B5E3C" />
      </mesh>
      {/* Chimney cap */}
      <mesh position={[0.3, 1.47, -0.15]}>
        <boxGeometry args={[0.19, 0.03, 0.19]} />
        <meshStandardMaterial color="#6B4C3B" />
      </mesh>

      {/* Chimney smoke particles */}
      <ChimneySmoke position={[0.3, 1.5, -0.15]} />

      {/* Mailbox */}
      <group position={[0.75, 0, 0.3]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
          <meshStandardMaterial color="#666" />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.15, 0.1, 0.1]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      {/* Label */}
      <Html position={[0, -0.15, 0.6]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: isSelected ? participant.color : 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          fontWeight: isSelected ? 'bold' : 'normal',
          whiteSpace: 'nowrap',
          border: isSelected ? '1px solid rgba(255,255,255,0.3)' : 'none',
          userSelect: 'none',
        }}>
          {isMe ? '🏠 You' : (participant.displayName || participant.shortName)}
        </div>
      </Html>
    </group>
  )
}

/* ── Chimney Smoke ── */
function ChimneySmoke({ position }: { position: [number, number, number] }) {
  const particles = useRef<THREE.InstancedMesh>(null)
  const count = 6
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const offsets = useMemo(() => Array.from({ length: count }, (_, i) => ({
    speed: 0.3 + Math.random() * 0.2,
    drift: (Math.random() - 0.5) * 0.3,
    phase: (i / count) * Math.PI * 2,
    scale: 0.03 + Math.random() * 0.02
  })), [])

  useFrame(() => {
    if (!particles.current) return
    const t = Date.now() * 0.001
    offsets.forEach((o, i) => {
      const life = ((t * o.speed + o.phase) % 1)
      dummy.position.set(
        position[0] + o.drift * life,
        position[1] + life * 0.8,
        position[2]
      )
      dummy.scale.setScalar(o.scale * (1 + life * 2))
      dummy.updateMatrix()
      particles.current!.setMatrixAt(i, dummy.matrix)
    })
    particles.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={particles} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#888" transparent opacity={0.15} />
    </instancedMesh>
  )
}

/* ════════════════════════════════════════════
   Post Office (3D)
   ════════════════════════════════════════════ */

function PostOfficeRoof() {
  const geo = useGableRoof(2.3, 0.6, 1.6)
  return (
    <group>
      <mesh geometry={geo} position={[0, 1.0, 0]} castShadow>
        <meshStandardMaterial color="#8B1A1A" roughness={0.7} />
      </mesh>
      {/* Eave trim */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[2.4, 0.04, 1.65]} />
        <meshStandardMaterial color="#5D2020" roughness={0.8} />
      </mesh>
    </group>
  )
}

function PostOffice3D() {
  return (
    <group position={[POST_OFFICE_POS.x, POST_OFFICE_POS.y, POST_OFFICE_POS.z]}>
      {/* Foundation / platform */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[2.2, 0.1, 1.6]} />
        <meshStandardMaterial color="#8B7355" />
      </mesh>

      {/* Main building */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[2.0, 0.9, 1.4]} />
        <meshStandardMaterial color="#E8DCC8" />
      </mesh>

      {/* Gable roof */}
      <PostOfficeRoof />

      {/* Pillars */}
      {[[-0.7, 0.5, 0.71], [0.7, 0.5, 0.71]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.06, 0.08, 0.9, 8]} />
          <meshStandardMaterial color="#D4C9A8" />
        </mesh>
      ))}

      {/* Door */}
      <mesh position={[0, 0.4, 0.71]}>
        <boxGeometry args={[0.4, 0.6, 0.02]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>

      {/* Windows */}
      {[[-0.55, 0.6, 0.71], [0.55, 0.6, 0.71]].map((pos, i) => (
        <group key={i}>
          <mesh position={pos as [number, number, number]}>
            <boxGeometry args={[0.25, 0.25, 0.02]} />
            <meshBasicMaterial color="#FFD280" />
          </mesh>
          <pointLight position={[pos[0]!, pos[1]!, pos[2]! + 0.2]} color="#FFD280" intensity={0.2} distance={2} />
        </group>
      ))}

      {/* Sign */}
      <mesh position={[0, 1.0, 0.72]}>
        <boxGeometry args={[1.2, 0.2, 0.03]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <Text
        position={[0, 1.0, 0.74]}
        fontSize={0.1}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        POST OFFICE
      </Text>

      {/* Mailbox out front */}
      <group position={[0.9, 0, 1.0]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
          <meshStandardMaterial color="#555" />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.15]} />
          <meshStandardMaterial color="#1565C0" />
        </mesh>
        {/* Red mailbox */}
        <mesh position={[-0.35, 0.6, 0]}>
          <boxGeometry args={[0.2, 0.25, 0.15]} />
          <meshStandardMaterial color="#C62828" />
        </mesh>
      </group>

      {/* Lantern above door */}
      <pointLight position={[0, 0.85, 0.9]} color="#FFCC00" intensity={0.5} distance={3} />
      <mesh position={[0, 0.85, 0.8]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#FFCC00" />
      </mesh>
    </group>
  )
}

/* ════════════════════════════════════════════
   Telephone Pole
   ════════════════════════════════════════════ */

function TelephonePole({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 2, 6]} />
        <meshStandardMaterial color="#4a3520" />
      </mesh>
      {/* Cross beam */}
      <mesh position={[0, 1.9, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.0, 0.06, 0.06]} />
        <meshStandardMaterial color="#4a3520" />
      </mesh>
    </group>
  )
}

/* ════════════════════════════════════════════
   Wire between houses (static)
   ════════════════════════════════════════════ */

function WireLine({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const points = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5)
    mid.y += 1.8
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(from.x, from.y + 1.3, from.z),
      mid,
      new THREE.Vector3(to.x, to.y + 1.3, to.z)
    )
    return curve.getPoints(20)
  }, [from, to])

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#555" transparent opacity={0.25} />
    </line>
  )
}

/* ════════════════════════════════════════════
   HTTP Delivery (Mailman 3D)
   ════════════════════════════════════════════ */

function MailmanDelivery({ delivery, fromPos, toPos }: {
  delivery: Delivery; fromPos: THREE.Vector3; toPos: THREE.Vector3
}) {
  const groupRef = useRef<THREE.Group>(null)
  const poDoor = useMemo(() => new THREE.Vector3(POST_OFFICE_POS.x, 0, POST_OFFICE_POS.z + 0.8), [])
  const senderDoor = useMemo(() => new THREE.Vector3(fromPos.x, 0, fromPos.z + 0.5), [fromPos])
  const recipientDoor = useMemo(() => new THREE.Vector3(toPos.x, 0, toPos.z + 0.5), [toPos])

  // Track whether mailman is carrying a letter
  const hasLetter = delivery.phase === 'to-postoffice' || delivery.phase === 'to-recipient'

  useFrame(() => {
    if (!groupRef.current) return
    const elapsed = Date.now() - delivery.startTime

    let pos: THREE.Vector3
    let target: THREE.Vector3

    if (delivery.phase === 'to-sender') {
      // Phase 1: PO door → sender's house (1200ms)
      const t = Math.min(elapsed / 1200, 1)
      const et = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      pos = new THREE.Vector3().lerpVectors(poDoor, senderDoor, et)
      target = senderDoor
    } else if (delivery.phase === 'at-sender') {
      // Phase 2: waiting at sender's house (800ms)
      pos = senderDoor.clone()
      pos.y = 0.05 + Math.sin(elapsed * 0.008) * 0.03
      target = poDoor
    } else if (delivery.phase === 'to-postoffice') {
      // Phase 3: sender's house → PO with letter (1200ms)
      const t = Math.min((elapsed - 2000) / 1200, 1)
      const et = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      pos = new THREE.Vector3().lerpVectors(senderDoor, poDoor, et)
      target = poDoor
    } else if (delivery.phase === 'to-recipient') {
      // Phase 4: PO → recipient's house (1200ms)
      const t = Math.min((elapsed - 3200) / 1200, 1)
      const et = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      pos = new THREE.Vector3().lerpVectors(poDoor, recipientDoor, et)
      target = recipientDoor
    } else {
      // Phase 5 (returning): recipient's house → PO (1200ms)
      const t = Math.min((elapsed - 4400) / 1200, 1)
      const et = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      pos = new THREE.Vector3().lerpVectors(recipientDoor, poDoor, et)
      target = poDoor
    }

    // Bounce while walking (not while waiting)
    if (delivery.phase !== 'at-sender') {
      pos.y += Math.abs(Math.sin(elapsed * 0.015)) * 0.08
    }

    groupRef.current.position.copy(pos)
    const dir = target.clone().sub(pos)
    if (dir.length() > 0.01) {
      groupRef.current.rotation.y = Math.atan2(dir.x, dir.z)
    }
  })

  // Pickup indicator at sender's house
  if (delivery.phase === 'at-sender') {
    return (
      <group ref={groupRef}>
        <MailmanModel />
        {/* Pickup indicator */}
        <Html position={[0, 0.7, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(241,196,15,0.9)',
            color: '#333',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '9px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
          }}>
            📬 Picking up
          </div>
        </Html>
      </group>
    )
  }

  return (
    <group ref={groupRef}>
      <MailmanModel />
      {/* Letter — only visible when carrying */}
      {hasLetter && (
        <mesh position={[0.12, 0.35, 0.05]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.15, 0.1, 0.02]} />
          <meshBasicMaterial color="white" />
        </mesh>
      )}
    </group>
  )
}

/* ── Mailman character model (reusable) ── */
function MailmanModel() {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.2, 0.25, 0.15]} />
        <meshStandardMaterial color="#e67e22" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#f5cba7" />
      </mesh>
      {/* Cap */}
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.08, 0.11, 0.06, 8]} />
        <meshStandardMaterial color="#2980b9" />
      </mesh>
      {/* Mail bag */}
      <mesh position={[-0.12, 0.2, 0]}>
        <boxGeometry args={[0.08, 0.15, 0.12]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  )
}

/* ════════════════════════════════════════════
   Socket Delivery (Wire Signal 3D)
   ════════════════════════════════════════════ */

function SocketSignalDelivery({ delivery, fromPos, toPos }: {
  delivery: Delivery; fromPos: THREE.Vector3; toPos: THREE.Vector3
}) {
  const signalRef = useRef<THREE.Mesh>(null)
  const trailRefs = useRef<THREE.Mesh[]>([])
  const glowRef = useRef<THREE.Mesh>(null)

  const curve = useMemo(() => {
    const a = new THREE.Vector3(fromPos.x, fromPos.y + 1.3, fromPos.z)
    const b = new THREE.Vector3(toPos.x, toPos.y + 1.3, toPos.z)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    mid.y += 1.0
    return new THREE.QuadraticBezierCurve3(a, mid, b)
  }, [fromPos, toPos])

  useFrame(() => {
    const elapsed = Date.now() - delivery.startTime
    const t = Math.min(elapsed / 1500, 1)
    const et = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2

    if (signalRef.current) {
      const pos = curve.getPoint(et)
      signalRef.current.position.copy(pos)
      signalRef.current.scale.setScalar(1 + Math.sin(elapsed * 0.02) * 0.3)
    }

    if (glowRef.current) {
      const pos = curve.getPoint(et)
      glowRef.current.position.copy(pos)
    }

    // Trail
    trailRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const tt = Math.max(0, et - (i + 1) * 0.04)
      const trailPos = curve.getPoint(tt)
      mesh.position.copy(trailPos)
      mesh.scale.setScalar(0.7 - i * 0.15)
    })
  })

  return (
    <group>
      {/* Glowing wire path */}
      {(() => {
        const pts = curve.getPoints(30)
        return (
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={pts.length}
                array={new Float32Array(pts.flatMap(p => [p.x, p.y, p.z]))}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#00ff88" transparent opacity={0.4} />
          </line>
        )
      })()}

      {/* Trail dots */}
      {[0, 1, 2].map(i => (
        <mesh key={i} ref={(el) => { if (el) trailRefs.current[i] = el }}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.3 - i * 0.08} />
        </mesh>
      ))}

      {/* Main signal */}
      <mesh ref={signalRef}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>

      {/* Glow light */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.15} />
      </mesh>
      <pointLight ref={glowRef as any} color="#00ff88" intensity={0.5} distance={2} />
    </group>
  )
}

/* ════════════════════════════════════════════
   Camera Setup
   ════════════════════════════════════════════ */

function CameraSetup() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 6.5, 10)
    camera.lookAt(0, 0.5, 2.5)
  }, [camera])
  return null
}

/* ════════════════════════════════════════════
   Main TownScene Component
   ════════════════════════════════════════════ */

interface TownSceneProps {
  participants: Participant[]
  deliveries: Delivery[]
  myKey: string
  selectedPerson: string | null
  onSelectPerson: (key: string) => void
}

export function TownScene({ participants, deliveries, myKey, selectedPerson, onSelectPerson }: TownSceneProps) {
  const positions = useMemo(() =>
    participants.map((_, i) => getHousePosition(i, participants.length)),
    [participants.length]
  )

  return (
    <div className="town-canvas-container">
      <Canvas
        shadows
        camera={{ position: [0, 6.5, 10], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        style={{ background: '#87CEEB' }}
      >
        <CameraSetup />

        {/* Ambient + directional lighting - daytime */}
        <ambientLight intensity={1.0} color="#ffffff" />
        <hemisphereLight args={['#87CEEB', '#4a8520', 0.6]} />
        <directionalLight
          position={[8, 12, 5]}
          intensity={1.5}
          color="#FFF8E0"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* Fill light from behind camera */}
        <directionalLight
          position={[0, 4, 10]}
          intensity={0.4}
          color="#ffffff"
        />

        {/* Fog for depth - light blue sky */}
        <fog attach="fog" args={['#87CEEB', 20, 40]} />

        {/* Environment */}
        <Clouds />
        <Sun />
        <Ground />
        <Road />

        {/* Post Office */}
        <PostOffice3D />

        {/* Streetlamps */}
        <Streetlamp position={[-4.5, 0, 3.8]} />
        <Streetlamp position={[4.5, 0, 3.8]} />
        <Streetlamp position={[-1.5, 0, 1.5]} />
        <Streetlamp position={[1.5, 0, 1.5]} />

        {/* Trees — placed away from house positions */}
        <Tree position={[-7, 0, 5.5]} scale={1.0} />
        <Tree position={[7, 0, 5.0]} scale={1.2} />
        <Tree position={[-5.5, 0, 0]} scale={0.8} />
        <Tree position={[5.5, 0, 0.5]} scale={0.9} />
        <Tree position={[-2.5, 0, -1.5]} scale={0.7} />
        <Tree position={[3, 0, -1.5]} scale={0.8} />
        <Tree position={[0, 0, -2]} scale={0.65} />

        {/* Fences — behind the houses */}
        <Fence start={[-7.5, 0, 7]} end={[-2, 0, 7]} />
        <Fence start={[2, 0, 7]} end={[7.5, 0, 7]} />

        {/* Telephone poles between houses */}
        {participants.length > 1 && positions.slice(0, -1).map((pos, i) => {
          const next = positions[i + 1]
          if (!next) return null
          const mid = pos.clone().add(next).multiplyScalar(0.5)
          return (
            <group key={`pole-${i}`}>
              <TelephonePole position={[mid.x, 0, mid.z - 0.3]} />
              <WireLine from={pos} to={next} />
            </group>
          )
        })}

        {/* Houses */}
        {participants.map((p, i) => (
          <House3D
            key={p.identityKey}
            participant={p}
            position={positions[i]!}
            isMe={p.identityKey === myKey}
            isSelected={p.identityKey === selectedPerson}
            onClick={() => onSelectPerson(p.identityKey)}
          />
        ))}

        {/* Deliveries */}
        {deliveries.map(d => {
          const fromIdx = participants.findIndex(p => p.identityKey === d.from)
          const toIdx = participants.findIndex(p => p.identityKey === d.to)
          const fromPos = positions[fromIdx] ?? new THREE.Vector3(-3, 0, 3)
          const toPos = positions[toIdx] ?? new THREE.Vector3(3, 0, 3)

          if (d.method === 'socket') {
            return <SocketSignalDelivery key={d.id} delivery={d} fromPos={fromPos} toPos={toPos} />
          }
          return <MailmanDelivery key={d.id} delivery={d} fromPos={fromPos} toPos={toPos} />
        })}
      </Canvas>
    </div>
  )
}
