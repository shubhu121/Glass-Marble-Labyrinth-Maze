'use client';

import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { MazeData } from '@/lib/maze-generator';
import { RealisticMarble, MARBLE_RADIUS } from '@/components/marble/RealisticMarble';
import { MazeBoard } from '@/components/maze/MazeBoard';
import { OuterCabinet } from '@/components/maze/OuterCabinet';
import { ProceduralTextureGenerator } from '@/lib/procedural-textures';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface LabyrinthSceneProps {
  maze: MazeData;
  controlMode: 'board' | 'marble';
  keys: { forward: boolean; backward: boolean; left: boolean; right: boolean };
  virtualTilt?: { x: number; z: number };
  resetMarbleCount: number;
  autoRotate: boolean;
  slowMo: boolean;
  lightingPreset: 'workshop' | 'studio' | 'sunset';
  onGoalReached: () => void;
  gameStatus: 'playing' | 'completed';
  colliderMode?: 'trimesh' | 'convex-hull';
}

// Internal scene content with camera and lighting
const SceneContent: React.FC<{
  maze: MazeData;
  controlMode: 'board' | 'marble';
  keys: { forward: boolean; backward: boolean; left: boolean; right: boolean };
  virtualTilt?: { x: number; z: number };
  resetMarbleCount: number;
  autoRotate: boolean;
  slowMo: boolean;
  lightingPreset: 'workshop' | 'studio' | 'sunset';
  onGoalReached: () => void;
  gameStatus: 'playing' | 'completed';
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  colliderMode?: 'trimesh' | 'convex-hull';
}> = ({
  maze,
  controlMode,
  keys,
  virtualTilt,
  resetMarbleCount,
  autoRotate,
  slowMo,
  lightingPreset,
  onGoalReached,
  gameStatus,
  controlsRef,
  colliderMode = 'trimesh',
}) => {
  const totalWidth = maze.cols * maze.cellSize;
  const totalDepth = maze.rows * maze.cellSize;

  // Track live tilt angle for mechanical knobs and depth physics
  const tiltRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  // Procedural dark walnut workbench tabletop texture
  const tabletopTexture = useMemo(() => ProceduralTextureGenerator.getTabletopTexture(), []);

  // Calculate starting world position for marble
  const startPos = useMemo<[number, number, number]>(() => {
    const halfW = totalWidth / 2;
    const halfD = totalDepth / 2;
    const x = -halfW + maze.start.x * maze.cellSize + maze.cellSize / 2;
    const z = -halfD + maze.start.y * maze.cellSize + maze.cellSize / 2;
    // Marble sits on the floor: Y = floor (0) + radius (0.32) flush with floor
    return [x, MARBLE_RADIUS + 0.002, z];
  }, [maze, totalWidth, totalDepth]);

  // Goal position in world space
  const goalPos = useMemo(() => {
    const halfW = totalWidth / 2;
    const halfD = totalDepth / 2;
    return new THREE.Vector3(
      -halfW + maze.goal.x * maze.cellSize + maze.cellSize / 2,
      MARBLE_RADIUS,
      -halfD + maze.goal.y * maze.cellSize + maze.cellSize / 2
    );
  }, [maze, totalWidth, totalDepth]);

  // Goal reach detection handler
  const handleGoalCheck = useCallback(
    (pos: THREE.Vector3) => {
      if (gameStatus === 'completed') return;
      const dist = Math.hypot(pos.x - goalPos.x, pos.z - goalPos.z);
      if (dist < maze.cellSize * 0.45 && pos.y >= -0.2) {
        onGoalReached();
      }
    },
    [goalPos, gameStatus, maze.cellSize, onGoalReached]
  );

  // Lighting configurations based on selected preset
  const lighting = useMemo(() => {
    switch (lightingPreset) {
      case 'studio':
        return {
          ambientIntensity: 0.7,
          mainLightColor: '#ffffff',
          mainLightIntensity: 2.2,
          mainLightPos: [8, 14, 8] as [number, number, number],
          fillLightColor: '#e0e7ff',
          fillLightIntensity: 0.9,
          fillLightPos: [-8, 8, -6] as [number, number, number],
          envKeyIntensity: 2.5,
          envKeyColor: '#ffffff',
          envFillIntensity: 1.4,
          envFillColor: '#e8f0fe',
        };
      case 'sunset':
        return {
          ambientIntensity: 0.5,
          mainLightColor: '#ffb366',
          mainLightIntensity: 2.5,
          mainLightPos: [10, 8, 10] as [number, number, number],
          fillLightColor: '#93c5fd',
          fillLightIntensity: 0.6,
          fillLightPos: [-8, 6, -8] as [number, number, number],
          envKeyIntensity: 2.8,
          envKeyColor: '#ffa756',
          envFillIntensity: 1.0,
          envFillColor: '#80aaff',
        };
      case 'workshop':
      default:
        return {
          ambientIntensity: 0.65,
          mainLightColor: '#fff5e6', // Warm incandescent desk lamp
          mainLightIntensity: 2.4,
          mainLightPos: [6, 12, 7] as [number, number, number],
          fillLightColor: '#cadbee',
          fillLightIntensity: 0.8,
          fillLightPos: [-7, 7, -6] as [number, number, number],
          envKeyIntensity: 2.6,
          envKeyColor: '#ffe9cb',
          envFillIntensity: 1.2,
          envFillColor: '#c8dcfa',
        };
    }
  }, [lightingPreset]);

  return (
    <>
      {/* 3D OrbitControls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping={true}
        dampingFactor={0.06}
        minDistance={3.5}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.05} // Prevent camera from dipping beneath table surface
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
        target={[0, 0, 0]}
      />

      {/* Realistic Lighting Setup */}
      <ambientLight intensity={lighting.ambientIntensity} />

      {/* Key Directional Light (Warm Desk Lamp with Soft Shadow Map) */}
      <directionalLight
        position={lighting.mainLightPos}
        intensity={lighting.mainLightIntensity}
        color={lighting.mainLightColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
        shadow-bias={-0.0002}
        shadow-radius={2.5}
      />

      {/* Soft Cool Fill Light for photographic contrast */}
      <directionalLight
        position={lighting.fillLightPos}
        intensity={lighting.fillLightIntensity}
        color={lighting.fillLightColor}
      />

      {/* Warm ambient desk glow */}
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#ffd4a3" distance={15} />

      {/* Self-contained procedural HDRI Environment (zero external network CDN requests) */}
      <Environment resolution={256}>
        {/* Key overhead studio softbox */}
        <Lightformer
          form="rect"
          intensity={lighting.envKeyIntensity}
          color={lighting.envKeyColor}
          position={[0, 10, 0]}
          scale={[12, 12, 1]}
          rotation-x={Math.PI / 2}
        />
        {/* Lateral diffuse softbox for glass refraction highlights */}
        <Lightformer
          form="rect"
          intensity={lighting.envFillIntensity}
          color={lighting.envFillColor}
          position={[-8, 5, 2]}
          scale={[8, 8, 1]}
          target={[0, 0, 0]}
        />
        {/* Rim circular softbox for edge specular glints */}
        <Lightformer
          form="circle"
          intensity={1.8}
          color={lighting.mainLightColor}
          position={[6, 7, -6]}
          scale={[7, 7, 1]}
          target={[0, 0, 0]}
        />
      </Environment>

      {/* Wooden Desk Workshop Table Surface comfortably underneath the labyrinth cabinet */}
      <mesh position={[0, -3.2, 0]} receiveShadow>
        <cylinderGeometry args={[22, 22, 0.4, 64]} />
        <meshStandardMaterial
          map={tabletopTexture}
          roughness={0.55}
          metalness={0.08}
        />
      </mesh>

      {/* Tabletop Contact Shadow beneath the stationary cabinet feet */}
      <ContactShadows
        position={[0, -2.99, 0]}
        opacity={0.65}
        scale={24}
        blur={2.0}
        far={4}
        resolution={256}
        frames={1}
      />

      {/* Stationary Outer Wooden Cabinet with Turned Brass Feet, Mechanical Knobs & Felt Drop Cavity */}
      <OuterCabinet
        totalWidth={totalWidth}
        totalDepth={totalDepth}
        rimThickness={0.38}
        tiltRef={tiltRef}
      />

      {/* Rapier Physics World with solid downward gravity grounding the marble */}
      <Physics gravity={[0, -20, 0]}>
        {/* Tilting Kinematic Wooden Maze Board */}
        <MazeBoard
          maze={maze}
          controlMode={controlMode}
          keys={keys}
          virtualTilt={virtualTilt}
          slowMo={slowMo}
          tiltRef={tiltRef}
          colliderMode={colliderMode}
        />

        {/* Dynamic Glass Marble with Internal Swirls and Physics */}
        <RealisticMarble
          startPos={startPos}
          resetTrigger={resetMarbleCount}
          controlMode={controlMode}
          keys={keys}
          onGoalCheck={handleGoalCheck}
          slowMo={slowMo}
          tiltRef={tiltRef}
        />
      </Physics>
    </>
  );
};

export const LabyrinthScene: React.FC<
  LabyrinthSceneProps & { onResetCameraTrigger?: (fn: () => void) => void }
> = ({ onResetCameraTrigger, ...props }) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [contextLost, setContextLost] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);

  // Expose camera reset
  const handleResetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      // Optimal isometric 3D inspection view
      controlsRef.current.object.position.set(0, 9.2, 10.5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, []);

  // Register reset callback
  useEffect(() => {
    if (onResetCameraTrigger) {
      onResetCameraTrigger(handleResetCamera);
    }
  }, [onResetCameraTrigger, handleResetCamera]);

  const handleRecoverContext = useCallback(() => {
    ProceduralTextureGenerator.resetTextures();
    setContextLost(false);
    setSceneKey((k) => k + 1);
  }, []);

  return (
    <div id="canvas-container" className="w-full h-full relative">
      {contextLost && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-stone-950/90 text-stone-200 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3 text-amber-400">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
            <span className="text-xl font-medium tracking-tight">3D Graphics Context Resetting</span>
          </div>
          <p className="text-sm text-stone-400 max-w-md text-center mb-5">
            Your browser or graphics driver temporarily paused the WebGL rendering context. Click below to restore the labyrinth.
          </p>
          <button
            onClick={handleRecoverContext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm transition-all shadow-lg active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Restore 3D Labyrinth
          </button>
        </div>
      )}

      <Canvas
        key={sceneKey}
        shadows
        dpr={[1, 1.5]} // Caps high-DPI scaling safely to prevent GPU out-of-memory
        camera={{ position: [0, 9.2, 10.5], fov: 48 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl }) => {
          const dom = gl.domElement;
          const onContextLost = (e: Event) => {
            // Prevent browser from permanently killing context
            e.preventDefault();
            console.warn('[WebGL] Context lost detected. Preparing auto-recovery.');
            setContextLost(true);
          };
          const onContextRestored = () => {
            console.info('[WebGL] Context restored successfully.');
            handleRecoverContext();
          };

          dom.addEventListener('webglcontextlost', onContextLost, false);
          dom.addEventListener('webglcontextrestored', onContextRestored, false);
        }}
      >
        <SceneContent {...props} controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
};

