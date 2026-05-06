import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Cylinder, Cone } from '@react-three/drei';

export function CatMelo({ onClick }) {
  const group = useRef();
  const tail = useRef();
  const earL = useRef();
  const earR = useRef();
  const bodyGroup = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Whole body float up/down
    if (group.current) {
      group.current.position.y = Math.sin(t * 1.4) * 0.12;
      group.current.rotation.y = Math.sin(t * 0.5) * 0.18;
    }

    // Subtle body sway
    if (bodyGroup.current) {
      bodyGroup.current.rotation.z = Math.sin(t * 1.4) * 0.04;
    }

    // Tail wag
    if (tail.current) {
      tail.current.rotation.z = Math.sin(t * 2.5) * 0.6 - 0.4;
    }

    // Ear twitch
    if (earL.current) earL.current.rotation.z = 0.25 + Math.sin(t * 3.2 + 1) * 0.1;
    if (earR.current) earR.current.rotation.z = -0.25 - Math.sin(t * 3.2) * 0.1;
  });

  return (
    <group ref={group} onClick={onClick} position={[0, 0, 0]}>
      <group ref={bodyGroup}>
        {/* Body */}
        <Sphere args={[0.48, 32, 32]} position={[0, -0.38, 0]}>
          <meshStandardMaterial color="#1e1b4b" roughness={0.6} />
        </Sphere>

        {/* Belly spot */}
        <Sphere args={[0.26, 20, 20]} position={[0, -0.32, 0.38]}>
          <meshStandardMaterial color="#2e1065" roughness={0.8} />
        </Sphere>

        {/* Head */}
        <Sphere args={[0.58, 32, 32]} position={[0, 0.26, 0]}>
          <meshStandardMaterial color="#1e1b4b" roughness={0.65} />
        </Sphere>

        {/* Ears */}
        <group ref={earL} position={[-0.34, 0.72, 0]}>
          <Cone args={[0.2, 0.34, 3]} rotation={[0, 0, 0.25]}>
            <meshStandardMaterial color="#1e1b4b" roughness={0.65} />
          </Cone>
          <Cone args={[0.11, 0.22, 3]} position={[0, 0.01, 0.05]} rotation={[0, 0, 0.25]}>
            <meshStandardMaterial color="#6d28d9" />
          </Cone>
        </group>
        <group ref={earR} position={[0.34, 0.72, 0]}>
          <Cone args={[0.2, 0.34, 3]} rotation={[0, 0, -0.25]}>
            <meshStandardMaterial color="#1e1b4b" roughness={0.65} />
          </Cone>
          <Cone args={[0.11, 0.22, 3]} position={[0, 0.01, 0.05]} rotation={[0, 0, -0.25]}>
            <meshStandardMaterial color="#6d28d9" />
          </Cone>
        </group>

        {/* Eyes */}
        <Sphere args={[0.11, 20, 20]} position={[-0.2, 0.34, 0.52]}>
          <meshStandardMaterial color="#8b5cf6" emissive="#6d28d9" emissiveIntensity={1.5} />
        </Sphere>
        <Sphere args={[0.11, 20, 20]} position={[0.2, 0.34, 0.52]}>
          <meshStandardMaterial color="#8b5cf6" emissive="#6d28d9" emissiveIntensity={1.5} />
        </Sphere>
        {/* Eye shine */}
        <Sphere args={[0.045, 12, 12]} position={[-0.18, 0.36, 0.61]}>
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1} />
        </Sphere>
        <Sphere args={[0.045, 12, 12]} position={[0.22, 0.36, 0.61]}>
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1} />
        </Sphere>

        {/* Nose */}
        <Cone args={[0.055, 0.07, 3]} position={[0, 0.14, 0.57]} rotation={[Math.PI, 0, 0]}>
          <meshStandardMaterial color="#ec4899" />
        </Cone>

        {/* Mouth */}
        <Cylinder args={[0.01, 0.01, 0.13, 6]} position={[-0.07, 0.07, 0.57]} rotation={[0, 0, 0.5]}>
          <meshStandardMaterial color="#a78bfa" />
        </Cylinder>
        <Cylinder args={[0.01, 0.01, 0.13, 6]} position={[0.07, 0.07, 0.57]} rotation={[0, 0, -0.5]}>
          <meshStandardMaterial color="#a78bfa" />
        </Cylinder>

        {/* Whiskers */}
        <Cylinder args={[0.007, 0.007, 0.42, 4]} position={[-0.44, 0.19, 0.44]} rotation={[0, 0, 0.1]}>
          <meshStandardMaterial color="#a78bfa" transparent opacity={0.55} />
        </Cylinder>
        <Cylinder args={[0.007, 0.007, 0.42, 4]} position={[-0.44, 0.13, 0.44]} rotation={[0, 0, 0.18]}>
          <meshStandardMaterial color="#a78bfa" transparent opacity={0.55} />
        </Cylinder>
        <Cylinder args={[0.007, 0.007, 0.42, 4]} position={[0.44, 0.19, 0.44]} rotation={[0, 0, -0.1]}>
          <meshStandardMaterial color="#a78bfa" transparent opacity={0.55} />
        </Cylinder>
        <Cylinder args={[0.007, 0.007, 0.42, 4]} position={[0.44, 0.13, 0.44]} rotation={[0, 0, -0.18]}>
          <meshStandardMaterial color="#a78bfa" transparent opacity={0.55} />
        </Cylinder>

        {/* Tail */}
        <group ref={tail} position={[-0.44, -0.48, -0.08]}>
          <Cylinder args={[0.055, 0.038, 0.62, 10]} rotation={[0.3, 0, -1.1]}>
            <meshStandardMaterial color="#1e1b4b" roughness={0.65} />
          </Cylinder>
          <Sphere args={[0.09, 12, 12]} position={[-0.3, 0.33, 0]}>
            <meshStandardMaterial color="#6d28d9" emissive="#4c1d95" emissiveIntensity={0.5} />
          </Sphere>
        </group>

        {/* Blush */}
        <Sphere args={[0.09, 12, 12]} position={[-0.37, 0.2, 0.46]}>
          <meshStandardMaterial color="#ec4899" transparent opacity={0.3} />
        </Sphere>
        <Sphere args={[0.09, 12, 12]} position={[0.37, 0.2, 0.46]}>
          <meshStandardMaterial color="#ec4899" transparent opacity={0.3} />
        </Sphere>
      </group>
    </group>
  );
}

export const MELO_3D = [
  { id: 3, name: 'Cat', Component: CatMelo, desc: 'Cozy & playful' },
];
