'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, BallCollider } from '@react-three/rapier';
import { ProceduralTextureGenerator } from '@/lib/procedural-textures';
import { soundManager } from '@/lib/sound-effects';

interface RealisticMarbleProps {
  startPos: [number, number, number];
  resetTrigger: number;
  controlMode: 'board' | 'marble';
  keys: { forward: boolean; backward: boolean; left: boolean; right: boolean };
  onPositionUpdate?: (pos: THREE.Vector3, vel: THREE.Vector3) => void;
  onGoalCheck?: (pos: THREE.Vector3) => void;
  slowMo?: boolean;
  tiltRef?: React.RefObject<{ x: number; z: number }>;
}

export const MARBLE_RADIUS = 0.32;

// Creates a twisted cat-eye 3D ribbon curve inside the marble
function createSwirlCurve(twistAngle: number, radius: number, height: number): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * 2 - 1; // -1 to 1
    const y = (t * height) / 2;
    // Spiral radius bulges in the center and tapers at the poles
    const r = radius * Math.cos((t * Math.PI) / 2);
    const theta = t * Math.PI * 1.8 + twistAngle;
    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);
    points.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(points);
}

export const RealisticMarble: React.FC<RealisticMarbleProps> = ({
  startPos,
  resetTrigger,
  controlMode,
  keys,
  onPositionUpdate,
  onGoalCheck,
  slowMo = false,
  tiltRef,
}) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const marbleGroupRef = useRef<THREE.Group>(null);
  const lastVelocityMag = useRef<number>(0);
  const lastPos = useRef<THREE.Vector3>(new THREE.Vector3());

  // Procedural subtle imperfections texture for realistic surface touch
  const scratchesTexture = useMemo(() => {
    return ProceduralTextureGenerator.getMarbleImperfectionsTexture();
  }, []);

  // Generate 3 elegant internal glass ribbon swirls (Crimson, Cobalt, Amber)
  const swirlGeometries = useMemo(() => {
    const sw1 = createSwirlCurve(0, MARBLE_RADIUS * 0.75, MARBLE_RADIUS * 1.6);
    const sw2 = createSwirlCurve((Math.PI * 2) / 3, MARBLE_RADIUS * 0.68, MARBLE_RADIUS * 1.55);
    const sw3 = createSwirlCurve((Math.PI * 4) / 3, MARBLE_RADIUS * 0.72, MARBLE_RADIUS * 1.58);

    const geom1 = new THREE.TubeGeometry(sw1, 24, MARBLE_RADIUS * 0.075, 8, false);
    const geom2 = new THREE.TubeGeometry(sw2, 24, MARBLE_RADIUS * 0.065, 8, false);
    const geom3 = new THREE.TubeGeometry(sw3, 24, MARBLE_RADIUS * 0.07, 8, false);

    return [geom1, geom2, geom3];
  }, []);

  // Dispose swirl geometries on unmount
  useEffect(() => {
    return () => {
      swirlGeometries.forEach((g) => g.dispose());
    };
  }, [swirlGeometries]);

  // Internal micro air bubbles trapped inside the glass
  const bubblePositions = useMemo(() => {
    const bubbles: Array<{ pos: [number, number, number]; r: number }> = [];
    const seedRng = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    };
    const rand = seedRng(7721);

    for (let i = 0; i < 10; i++) {
      // Random spherical coordinates within inner core
      const phi = rand() * Math.PI * 2;
      const costheta = rand() * 2 - 1;
      const u = rand();
      const theta = Math.acos(costheta);
      const dist = MARBLE_RADIUS * 0.58 * Math.cbrt(u);

      const x = dist * Math.sin(theta) * Math.cos(phi);
      const y = dist * Math.sin(theta) * Math.sin(phi);
      const z = dist * Math.cos(theta);
      const r = MARBLE_RADIUS * (0.025 + rand() * 0.035);
      bubbles.push({ pos: [x, y, z], r });
    }
    return bubbles;
  }, []);

  // Reset marble when resetTrigger changes
  useEffect(() => {
    if (rigidBodyRef.current) {
      rigidBodyRef.current.setTranslation(
        { x: startPos[0], y: startPos[1], z: startPos[2] },
        true
      );
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      soundManager.updateRoll(0);
    }
  }, [resetTrigger, startPos]);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    const dt = Math.min(delta, 0.05) * (slowMo ? 0.5 : 1.0);
    const pos = rigidBodyRef.current.translation();
    const vel = rigidBodyRef.current.linvel();
    const currentPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    const currentVel = new THREE.Vector3(vel.x, vel.y, vel.z);

    // Marble mode direct rolling physics: apply direct torque & impulse
    if (controlMode === 'marble') {
      const forceMag = 1.4 * (slowMo ? 0.6 : 1.0);
      const torqueMag = 0.28 * (slowMo ? 0.6 : 1.0);
      let fx = 0;
      let fz = 0;

      if (keys.forward) fz -= forceMag;
      if (keys.backward) fz += forceMag;
      if (keys.left) fx -= forceMag;
      if (keys.right) fx += forceMag;

      if (fx !== 0 || fz !== 0) {
        rigidBodyRef.current.applyImpulse({ x: fx * dt * 50, y: 0, z: fz * dt * 50 }, true);
        // Apply torque to encourage natural physical roll spin
        rigidBodyRef.current.applyTorqueImpulse(
          { x: fz * dt * torqueMag * 50, y: 0, z: -fx * dt * torqueMag * 50 },
          true
        );
      }
    }

    // Sound effects & velocity tracking
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    soundManager.updateRoll(speed);

    // Collision sound detection: sudden change in velocity
    const accel = Math.abs(speed - lastVelocityMag.current);
    if (accel > 1.8 && speed > 0.4) {
      soundManager.playWoodImpact(Math.min(accel / 4.0, 1.0));
    }
    lastVelocityMag.current = speed;
    lastPos.current.copy(currentPos);

    // Goal zone proximity check
    if (onGoalCheck) {
      onGoalCheck(currentPos);
    }

    if (onPositionUpdate) {
      onPositionUpdate(currentPos, currentVel);
    }

    // Grounding and boundary safety: preserve natural Rapier physics simulation without abrupt state overwrites
    if (tiltRef?.current) {
      const tiltX = tiltRef.current.x;
      const tiltZ = tiltRef.current.z;
      const boardEuler = new THREE.Euler(tiltX, 0, tiltZ, 'XYZ');
      const boardQuat = new THREE.Quaternion().setFromEuler(boardEuler);
      const invBoardQuat = boardQuat.clone().invert();

      // Board-relative position
      const localPos = new THREE.Vector3(pos.x, pos.y, pos.z).applyQuaternion(invBoardQuat);

      // Safety bounds check relative to the playing tray: reset if fallen out of tray
      const maxExt = 5.2;
      if (
        localPos.y < -1.2 ||
        Math.abs(localPos.x) > maxExt ||
        Math.abs(localPos.z) > maxExt ||
        pos.y < -3
      ) {
        rigidBodyRef.current.setTranslation(
          { x: startPos[0], y: startPos[1] + 0.08, z: startPos[2] },
          true
        );
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    } else {
      // Fallback world-space bounds check
      if (pos.y < -3 || Math.abs(pos.x) > 15 || Math.abs(pos.z) > 15) {
        rigidBodyRef.current.setTranslation(
          { x: startPos[0], y: startPos[1] + 0.1, z: startPos[2] },
          true
        );
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders={false}
      position={startPos}
      type="dynamic"
      ccd={true} // Continuous Collision Detection prevents passing through thin maze walls
      restitution={0.04} // Solid glass marble on hardwood - no springy bouncing
      friction={0.38} // Natural grip allowing rolling without unnatural sliding
      linearDamping={0.22}
      angularDamping={0.28}
      mass={0.45}
      name="marble"
      onCollisionEnter={(payload) => {
        const colName = payload.other.colliderObject?.name;
        const rbName = payload.other.rigidBodyObject?.name;
        if (colName === 'floor' || rbName === 'floor') return;
        soundManager.playWoodImpact(0.4);
      }}
    >
      <BallCollider
        args={[MARBLE_RADIUS]}
        contactSkin={0.0015}
        friction={0.38}
        restitution={0.04}
      />

      <group ref={marbleGroupRef}>
        {/* Outer Clear Glass Sphere */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[MARBLE_RADIUS, 48, 32]} />
          <meshPhysicalMaterial
            roughness={0.03}
            metalness={0.0}
            transmission={0.96}
            ior={1.52} // Borosilicate glass optical refraction index
            thickness={MARBLE_RADIUS * 1.5}
            attenuationColor="#edf6f9"
            attenuationDistance={1.8}
            specularIntensity={1.0}
            specularColor="#ffffff"
            clearcoat={1.0}
            clearcoatRoughness={0.02}
            roughnessMap={scratchesTexture}
            envMapIntensity={2.2}
            depthWrite={false}
          />
        </mesh>

        {/* Internal Swirl 1: Vivid Venetian Ruby Crimson */}
        <mesh geometry={swirlGeometries[0]} castShadow>
          <meshStandardMaterial
            color="#c5162a"
            emissive="#3a0408"
            emissiveIntensity={0.12}
            roughness={0.15}
            metalness={0.05}
            transparent={true}
            opacity={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Internal Swirl 2: Deep Cobalt Marine Blue */}
        <mesh geometry={swirlGeometries[1]} castShadow>
          <meshStandardMaterial
            color="#1249b8"
            emissive="#041030"
            emissiveIntensity={0.15}
            roughness={0.15}
            metalness={0.05}
            transparent={true}
            opacity={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Internal Swirl 3: Warm Amber Sunburst */}
        <mesh geometry={swirlGeometries[2]} castShadow>
          <meshStandardMaterial
            color="#e58910"
            emissive="#301802"
            emissiveIntensity={0.1}
            roughness={0.15}
            metalness={0.05}
            transparent={true}
            opacity={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Internal Trapped Micro Air Bubbles */}
        {bubblePositions.map((b, idx) => (
          <mesh key={idx} position={b.pos}>
            <sphereGeometry args={[b.r, 12, 10]} />
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.06}
              metalness={0.88}
              transparent={true}
              opacity={0.78}
            />
          </mesh>
        ))}

        {/* Subtle center filament swirl accent */}
        <mesh>
          <cylinderGeometry
            args={[MARBLE_RADIUS * 0.04, MARBLE_RADIUS * 0.04, MARBLE_RADIUS * 1.5, 8]}
          />
          <meshStandardMaterial
            color="#f4eedb"
            roughness={0.2}
            transparent={true}
            opacity={0.6}
          />
        </mesh>
      </group>
    </RigidBody>
  );
};
