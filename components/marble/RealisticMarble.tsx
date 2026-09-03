'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, BallCollider } from '@react-three/rapier';
import { ProceduralTextureGenerator } from '@/lib/procedural-textures';
import { soundManager } from '@/lib/sound-effects';
import { MarblePaletteId, getMarblePalette } from '@/lib/marble-palettes';

interface RealisticMarbleProps {
  startPos: [number, number, number];
  resetTrigger: number;
  controlMode: 'board' | 'marble';
  keys: { forward: boolean; backward: boolean; left: boolean; right: boolean };
  onPositionUpdate?: (pos: THREE.Vector3, vel: THREE.Vector3) => void;
  onGoalCheck?: (pos: THREE.Vector3) => void;
  slowMo?: boolean;
  tiltRef?: React.RefObject<{ x: number; z: number }>;
  paletteId?: MarblePaletteId;
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
  paletteId = 'ocean-blue',
}) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const marbleGroupRef = useRef<THREE.Group>(null);
  const glassMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const filamentMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const lastVelocityMag = useRef<number>(0);
  const lastPos = useRef<THREE.Vector3>(new THREE.Vector3());

  // Procedural subtle imperfections texture for realistic surface touch
  const scratchesTexture = useMemo(() => {
    return ProceduralTextureGenerator.getMarbleImperfectionsTexture();
  }, []);

  // Generate 3 elegant internal glass ribbon swirls
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

  // Create custom ShaderMaterials for the internal glass swirl ribbons
  const swirlMaterials = useMemo(() => {
    const initialPalette = getMarblePalette(paletteId);
    return [0, 1, 2].map((idx) => {
      return new THREE.ShaderMaterial({
        uniforms: {
          uPrimaryColor: { value: new THREE.Color(initialPalette.primary) },
          uSecondaryColor: { value: new THREE.Color(initialPalette.secondary) },
          uAccentColor: { value: new THREE.Color(initialPalette.accent) },
          uEmissiveColor: { value: new THREE.Color(initialPalette.emissive) },
          uEmissiveIntensity: { value: initialPalette.emissiveIntensity },
          uOpacity: { value: 0.95 },
          uRibbonIndex: { value: idx },
          uTime: { value: 0.0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          varying vec2 vUv;
          varying vec3 vWorldPosition;

          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            vec4 mvPosition = viewMatrix * worldPos;
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uPrimaryColor;
          uniform vec3 uSecondaryColor;
          uniform vec3 uAccentColor;
          uniform vec3 uEmissiveColor;
          uniform float uEmissiveIntensity;
          uniform float uOpacity;
          uniform float uRibbonIndex;
          uniform float uTime;

          varying vec3 vNormal;
          varying vec3 vViewPosition;
          varying vec2 vUv;
          varying vec3 vWorldPosition;

          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);

            // Ribbon longitudinal curve coordinate
            float t = vUv.x;
            
            // Custom dominant color distribution per ribbon index
            vec3 c1 = uPrimaryColor;
            vec3 c2 = uSecondaryColor;
            vec3 c3 = uAccentColor;
            
            if (uRibbonIndex > 1.5) {
              c1 = uAccentColor;
              c2 = uPrimaryColor;
              c3 = uSecondaryColor;
            } else if (uRibbonIndex > 0.5) {
              c1 = uSecondaryColor;
              c2 = uAccentColor;
              c3 = uPrimaryColor;
            }

            // Helical gradient along ribbon length with gentle phase oscillation
            float wave = sin(t * 3.14159 * 2.0 + uTime * 0.4) * 0.5 + 0.5;
            vec3 baseColor = mix(c1, c2, mix(t, wave, 0.3));
            
            // Internal optical Fresnel edge brilliance inside the glass
            float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.2);
            baseColor = mix(baseColor, c3, fresnel * 0.55);

            // Directional specular highlights
            vec3 lightDir = normalize(vec3(0.5, 1.0, 0.7));
            float diff = max(dot(normal, lightDir), 0.0) * 0.55 + 0.45;

            vec3 halfDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfDir), 0.0), 28.0) * 0.35;

            vec3 finalColor = baseColor * diff + uEmissiveColor * uEmissiveIntensity + vec3(spec);
            gl_FragColor = vec4(finalColor, uOpacity);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dispose shader materials on unmount
  useEffect(() => {
    return () => {
      swirlMaterials.forEach((m) => m.dispose());
    };
  }, [swirlMaterials]);

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

    // Dynamically update shader uniforms with frame-rate independent interpolation for fluid color transitions
    const palette = getMarblePalette(paletteId);
    const colorLerp = 1.0 - Math.exp(-7.0 * delta);

    const targetPrimary = new THREE.Color(palette.primary);
    const targetSecondary = new THREE.Color(palette.secondary);
    const targetAccent = new THREE.Color(palette.accent);
    const targetEmissive = new THREE.Color(palette.emissive);

    swirlMaterials.forEach((mat) => {
      mat.uniforms.uPrimaryColor.value.lerp(targetPrimary, colorLerp);
      mat.uniforms.uSecondaryColor.value.lerp(targetSecondary, colorLerp);
      mat.uniforms.uAccentColor.value.lerp(targetAccent, colorLerp);
      mat.uniforms.uEmissiveColor.value.lerp(targetEmissive, colorLerp);
      mat.uniforms.uEmissiveIntensity.value = THREE.MathUtils.lerp(
        mat.uniforms.uEmissiveIntensity.value,
        palette.emissiveIntensity,
        colorLerp
      );
      mat.uniforms.uTime.value += delta;
    });

    if (glassMaterialRef.current) {
      glassMaterialRef.current.attenuationColor.lerp(
        new THREE.Color(palette.glassAttenuation),
        colorLerp
      );
    }

    if (filamentMaterialRef.current) {
      filamentMaterialRef.current.color.lerp(
        new THREE.Color(palette.coreFilament),
        colorLerp
      );
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
            ref={glassMaterialRef}
            roughness={0.03}
            metalness={0.0}
            transmission={0.96}
            ior={1.52} // Borosilicate glass optical refraction index
            thickness={MARBLE_RADIUS * 1.5}
            attenuationColor={getMarblePalette(paletteId).glassAttenuation}
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

        {/* Internal Swirl 1: Dynamic Shader Material */}
        <mesh
          geometry={swirlGeometries[0]}
          material={swirlMaterials[0]}
          castShadow
        />

        {/* Internal Swirl 2: Dynamic Shader Material */}
        <mesh
          geometry={swirlGeometries[1]}
          material={swirlMaterials[1]}
          castShadow
        />

        {/* Internal Swirl 3: Dynamic Shader Material */}
        <mesh
          geometry={swirlGeometries[2]}
          material={swirlMaterials[2]}
          castShadow
        />

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
            ref={filamentMaterialRef}
            color={getMarblePalette(paletteId).coreFilament}
            roughness={0.2}
            transparent={true}
            opacity={0.6}
          />
        </mesh>
      </group>
    </RigidBody>
  );
};
