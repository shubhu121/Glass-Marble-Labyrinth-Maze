'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ProceduralTextureGenerator } from '@/lib/procedural-textures';

interface OuterCabinetProps {
  totalWidth: number;
  totalDepth: number;
  rimThickness: number;
  tiltRef: React.RefObject<{ x: number; z: number }>;
}

export const OuterCabinet: React.FC<OuterCabinetProps> = ({
  totalWidth,
  totalDepth,
  rimThickness,
  tiltRef,
}) => {
  const pitchKnobRef = useRef<THREE.Group>(null);
  const rollKnobRef = useRef<THREE.Group>(null);

  // Textures
  const cabinetWoodTexture = useMemo(
    () => ProceduralTextureGenerator.getCabinetWoodTexture(),
    []
  );
  const feltTexture = useMemo(
    () => ProceduralTextureGenerator.getCabinetFeltTexture(),
    []
  );

  // Sizing calculations ensuring ample clearance around the tilting tray
  const innerTrayW = totalWidth + rimThickness * 2;
  const innerTrayD = totalDepth + rimThickness * 2;

  // 0.6 clearance on all sides so the board never touches the cabinet
  const clearance = 0.6;
  const cabinetWallThick = 0.55;
  const cabinetInnerW = innerTrayW + clearance * 2;
  const cabinetInnerD = innerTrayD + clearance * 2;
  const cabinetOuterW = cabinetInnerW + cabinetWallThick * 2;
  const cabinetOuterD = cabinetInnerD + cabinetWallThick * 2;

  // Vertical specs:
  // Top lip at y = 0.35 (just below the inner tray's top edge at 0.4)
  // Bottom of the cabinet floor at y = -2.65
  // Feet extend down to y = -3.0 (where the workshop table sits)
  const topY = 0.35;
  const bottomY = -2.65;
  const wallHeight = topY - bottomY; // 3.0 units
  const wallCenterY = (topY + bottomY) / 2; // -1.15

  // Animate knurled brass control knobs in sync with board tilt
  useFrame(() => {
    if (!tiltRef.current) return;
    if (pitchKnobRef.current) {
      // Rotate around X axis for forward/backward pitch
      pitchKnobRef.current.rotation.x = -tiltRef.current.x * 6.5;
    }
    if (rollKnobRef.current) {
      // Rotate around Z axis for left/right roll
      rollKnobRef.current.rotation.z = tiltRef.current.z * 6.5;
    }
  });

  return (
    <group name="outer-cabinet">
      {/* 1. Interior Acoustic Drop Cavity Floor (Dark Velvet Felt lining) */}
      <mesh
        position={[0, bottomY + 0.02, 0]}
        receiveShadow
      >
        <boxGeometry args={[cabinetInnerW + 0.1, 0.04, cabinetInnerD + 0.1]} />
        <meshStandardMaterial
          map={feltTexture}
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>

      {/* Solid Wood Cabinet Sub-floor Base */}
      <mesh
        position={[0, bottomY - 0.1, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[cabinetOuterW, 0.2, cabinetOuterD]} />
        <meshStandardMaterial
          map={cabinetWoodTexture}
          roughness={0.45}
          metalness={0.05}
        />
      </mesh>

      {/* 2. Four Solid Hardwood Cabinet Walls */}
      {/* North Wall (-Z) */}
      <mesh
        position={[0, wallCenterY, -cabinetInnerD / 2 - cabinetWallThick / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[cabinetOuterW, wallHeight, cabinetWallThick]} />
        <meshStandardMaterial
          map={cabinetWoodTexture}
          roughness={0.35}
          metalness={0.06}
        />
      </mesh>

      {/* South Wall (+Z) */}
      <mesh
        position={[0, wallCenterY, cabinetInnerD / 2 + cabinetWallThick / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[cabinetOuterW, wallHeight, cabinetWallThick]} />
        <meshStandardMaterial
          map={cabinetWoodTexture}
          roughness={0.35}
          metalness={0.06}
        />
      </mesh>

      {/* West Wall (-X) */}
      <mesh
        position={[-cabinetInnerW / 2 - cabinetWallThick / 2, wallCenterY, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[cabinetWallThick, wallHeight, cabinetInnerD]} />
        <meshStandardMaterial
          map={cabinetWoodTexture}
          roughness={0.35}
          metalness={0.06}
        />
      </mesh>

      {/* East Wall (+X) */}
      <mesh
        position={[cabinetInnerW / 2 + cabinetWallThick / 2, wallCenterY, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[cabinetWallThick, wallHeight, cabinetInnerD]} />
        <meshStandardMaterial
          map={cabinetWoodTexture}
          roughness={0.35}
          metalness={0.06}
        />
      </mesh>

      {/* 3. Polished Brass Corner Brackets on Cabinet Top Rim */}
      {[
        [-cabinetOuterW / 2 + 0.35, -cabinetOuterD / 2 + 0.35],
        [cabinetOuterW / 2 - 0.35, -cabinetOuterD / 2 + 0.35],
        [-cabinetOuterW / 2 + 0.35, cabinetOuterD / 2 - 0.35],
        [cabinetOuterW / 2 - 0.35, cabinetOuterD / 2 - 0.35],
      ].map(([cx, cz], i) => (
        <group key={i} position={[cx, topY + 0.015, cz]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.03, 24]} />
            <meshStandardMaterial
              color="#d4af37"
              roughness={0.2}
              metalness={0.88}
            />
          </mesh>
        </group>
      ))}

      {/* 4. Four Heavy Turned Brass & Rubber Pedestal Feet */}
      {[
        [-cabinetOuterW / 2 + 0.7, -cabinetOuterD / 2 + 0.7],
        [cabinetOuterW / 2 - 0.7, -cabinetOuterD / 2 + 0.7],
        [-cabinetOuterW / 2 + 0.7, cabinetOuterD / 2 - 0.7],
        [cabinetOuterW / 2 - 0.7, cabinetOuterD / 2 - 0.7],
      ].map(([fx, fz], idx) => (
        <group key={idx} position={[fx, bottomY - 0.2, fz]}>
          {/* Brass upper collar */}
          <mesh position={[0, -0.05, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.42, 0.48, 0.1, 24]} />
            <meshStandardMaterial
              color="#c59b27"
              roughness={0.25}
              metalness={0.85}
            />
          </mesh>
          {/* Black rubber dampener foot resting squarely on table (y = -3.0) */}
          <mesh position={[0, -0.15, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.38, 0.36, 0.1, 24]} />
            <meshStandardMaterial
              color="#1a1a1a"
              roughness={0.9}
              metalness={0.1}
            />
          </mesh>
        </group>
      ))}

      {/* 5. Mechanical Gimbal Brass Suspension Axle Pins */}
      {/* Right Pin (+X) */}
      <mesh
        position={[cabinetInnerW / 2 - clearance / 2, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.06, 0.06, clearance + 0.1, 16]} />
        <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.88} />
      </mesh>
      {/* Left Pin (-X) */}
      <mesh
        position={[-cabinetInnerW / 2 + clearance / 2, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.06, 0.06, clearance + 0.1, 16]} />
        <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.88} />
      </mesh>
      {/* Front Pin (+Z) */}
      <mesh
        position={[0, 0, cabinetInnerD / 2 - clearance / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.06, 0.06, clearance + 0.1, 16]} />
        <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.88} />
      </mesh>
      {/* Back Pin (-Z) */}
      <mesh
        position={[0, 0, -cabinetInnerD / 2 + clearance / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.06, 0.06, clearance + 0.1, 16]} />
        <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.88} />
      </mesh>

      {/* 6. Physical Knurled Brass Control Knobs on Cabinet Exterior */}
      {/* Right Knob for Pitch (X-axis tilt control) */}
      <group
        ref={pitchKnobRef}
        position={[cabinetOuterW / 2 + 0.05, -0.6, 0]}
        rotation={[0, 0, -Math.PI / 2]}
      >
        {/* Brass axle stem */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.3, 16]} />
          <meshStandardMaterial color="#c59b27" roughness={0.3} metalness={0.85} />
        </mesh>
        {/* Main knurled wheel body */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.32, 32]} />
          <meshStandardMaterial
            color="#d4af37"
            roughness={0.28}
            metalness={0.88}
          />
        </mesh>
        {/* Raised center cap */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 24]} />
          <meshStandardMaterial color="#b38a1f" roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Direction marker notch */}
        <mesh position={[0.42, 0.16, 0]}>
          <boxGeometry args={[0.08, 0.04, 0.08]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
      </group>

      {/* Front Knob for Roll (Z-axis tilt control) */}
      <group
        ref={rollKnobRef}
        position={[0, -0.6, cabinetOuterD / 2 + 0.05]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        {/* Brass axle stem */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.3, 16]} />
          <meshStandardMaterial color="#c59b27" roughness={0.3} metalness={0.85} />
        </mesh>
        {/* Main knurled wheel body */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.32, 32]} />
          <meshStandardMaterial
            color="#d4af37"
            roughness={0.28}
            metalness={0.88}
          />
        </mesh>
        {/* Raised center cap */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 24]} />
          <meshStandardMaterial color="#b38a1f" roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Direction marker notch */}
        <mesh position={[0.42, 0.16, 0]}>
          <boxGeometry args={[0.08, 0.04, 0.08]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
};
