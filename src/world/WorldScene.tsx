import { Canvas } from '@react-three/fiber';
import type { StationId } from '../core/contracts';

interface WorldSceneProps {
  onInspect: (station: StationId) => void;
  memoryShifted: boolean;
}

function ArchiveRoom({ onInspect, memoryShifted }: WorldSceneProps) {
  return (
    <>
      <color attach="background" args={[memoryShifted ? '#2a0b19' : '#070b15']} />
      <ambientLight intensity={1.15} color={memoryShifted ? '#ffb1ba' : '#97a7ff'} />
      <pointLight position={[-2, 2, 2]} intensity={24} color="#42ccc8" />
      <pointLight position={[2, 2, -1]} intensity={18} color="#f45b88" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color="#222536" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1, -3]}>
        <boxGeometry args={[16, 6, 0.3]} />
        <meshStandardMaterial color={memoryShifted ? '#59263e' : '#1b2038'} />
      </mesh>
      <mesh position={[-3.2, 0, -1.3]} onClick={() => onInspect('vhs')}>
        <boxGeometry args={[2.1, 2.3, 1.3]} />
        <meshStandardMaterial color="#364b53" />
      </mesh>
      <mesh position={[-3.2, 0.4, -0.58]} onClick={() => onInspect('vhs')}>
        <boxGeometry args={[1.7, 1, 0.06]} />
        <meshStandardMaterial color={memoryShifted ? '#fe4f86' : '#70e3db'} emissive={memoryShifted ? '#962747' : '#23625c'} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[2.6, -0.15, -1.2]} onClick={() => onInspect('arcade')}>
        <boxGeometry args={[1.65, 2.65, 1.5]} />
        <meshStandardMaterial color="#342a41" />
      </mesh>
      <mesh position={[2.6, 0.45, -0.41]} onClick={() => onInspect('arcade')}>
        <boxGeometry args={[1.26, 1.1, 0.07]} />
        <meshStandardMaterial color="#e7a4e3" emissive="#68266b" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, -0.7, -1.6]}>
        <boxGeometry args={[1.4, 1.1, 0.9]} />
        <meshStandardMaterial color="#6b503d" />
      </mesh>
    </>
  );
}

export function WorldScene(props: WorldSceneProps) {
  return (
    <div className="world-wrapper" aria-label="Prototype 3D scene with clickable VHS and arcade stations">
      <Canvas camera={{ position: [0, 2.4, 9.5], fov: 46 }} gl={{ antialias: true }}>
        <ArchiveRoom {...props} />
      </Canvas>
      <div className="world-hint">CLICK A STATION · Movement and collisions are not implemented yet</div>
    </div>
  );
}
