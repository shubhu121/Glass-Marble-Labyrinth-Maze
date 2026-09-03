'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, TrimeshCollider, ConvexHullCollider, CuboidCollider } from '@react-three/rapier';
import { MazeData } from '@/lib/maze-generator';
import { ProceduralTextureGenerator } from '@/lib/procedural-textures';
import { computeMazeCollisionGeometry } from '@/lib/maze-collision-geometry';

interface MazeBoardProps {
  maze: MazeData;
  controlMode: 'board' | 'marble';
  keys: { forward: boolean; backward: boolean; left: boolean; right: boolean };
  virtualTilt?: { x: number; z: number };
  slowMo?: boolean;
  tiltRef?: React.RefObject<{ x: number; z: number }>;
  colliderMode?: 'trimesh' | 'convex-hull';
}

export const MazeBoard: React.FC<MazeBoardProps> = ({
  maze,
  controlMode,
  keys,
  virtualTilt,
  slowMo = false,
  tiltRef,
  colliderMode = 'trimesh',
}) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const boardVisualGroupRef = useRef<THREE.Group>(null);

  // Smooth tilt interpolation state
  const currentTiltX = useRef<number>(0);
  const currentTiltZ = useRef<number>(0);

  // Board dimensions
  const totalWidth = maze.cols * maze.cellSize;
  const totalDepth = maze.rows * maze.cellSize;
  const rimThickness = 0.38;
  const rimHeight = 1.10;
  const floorThickness = 0.40;

  // Recalculated precision collision geometry (welded Trimesh and Convex Hull shapes)
  const collisionData = useMemo(() => computeMazeCollisionGeometry(maze), [maze]);

  // Textures
  const woodFloorTexture = useMemo(() => ProceduralTextureGenerator.getWoodFloorTexture(), []);
  const woodWallTexture = useMemo(() => ProceduralTextureGenerator.getWoodWallTexture(), []);

  // Compute start and goal cell coordinates in world space (relative to board center)
  const startWorldPos = useMemo(() => {
    const halfW = totalWidth / 2;
    const halfD = totalDepth / 2;
    return new THREE.Vector3(
      -halfW + maze.start.x * maze.cellSize + maze.cellSize / 2,
      0.02,
      -halfD + maze.start.y * maze.cellSize + maze.cellSize / 2
    );
  }, [maze, totalWidth, totalDepth]);

  const goalWorldPos = useMemo(() => {
    const halfW = totalWidth / 2;
    const halfD = totalDepth / 2;
    return new THREE.Vector3(
      -halfW + maze.goal.x * maze.cellSize + maze.cellSize / 2,
      0.02,
      -halfD + maze.goal.y * maze.cellSize + maze.cellSize / 2
    );
  }, [maze, totalWidth, totalDepth]);

  // Handle board tilting animation and Rapier kinematic physics sync
  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    const dt = Math.min(delta, 0.05) * (slowMo ? 0.5 : 1.0);
    // Max tilt angle: 8.6 degrees (~0.15 rad) - realistic physical mechanical gimbal range
    const MAX_TILT = 0.15;
    // Physical mechanical lead screw / gear slew rate (rad/sec)
    const MAX_TILT_SPEED = 0.42;
    let targetTiltX = 0;
    let targetTiltZ = 0;

    if (controlMode === 'board') {
      // W / Up: tilts board forward (negative rotation on X axis lowers front)
      if (keys.forward) targetTiltX -= MAX_TILT;
      if (keys.backward) targetTiltX += MAX_TILT;
      // A / Left: tilts board left (positive rotation on Z axis lowers left)
      if (keys.left) targetTiltZ += MAX_TILT;
      if (keys.right) targetTiltZ += MAX_TILT;

      // Add virtual joystick / on-screen touch tilt input if present
      if (virtualTilt) {
        targetTiltX += virtualTilt.z * MAX_TILT;
        targetTiltZ -= virtualTilt.x * MAX_TILT;
        targetTiltX = Math.max(-MAX_TILT, Math.min(MAX_TILT, targetTiltX));
        targetTiltZ = Math.max(-MAX_TILT, Math.min(MAX_TILT, targetTiltZ));
      }
    }

    // Rate-limit delta tilt to realistic mechanical knob slew speed to prevent catapult effect
    const maxDelta = MAX_TILT_SPEED * dt;
    const diffX = targetTiltX - currentTiltX.current;
    const diffZ = targetTiltZ - currentTiltZ.current;
    currentTiltX.current += Math.max(-maxDelta, Math.min(maxDelta, diffX));
    currentTiltZ.current += Math.max(-maxDelta, Math.min(maxDelta, diffZ));

    // Sync tilt to ref for mechanical cabinet knob animations
    if (tiltRef?.current) {
      tiltRef.current.x = currentTiltX.current;
      tiltRef.current.z = currentTiltZ.current;
    }

    // Continuous kinematic rotation sync with Rapier
    const euler = new THREE.Euler(currentTiltX.current, 0, currentTiltZ.current, 'XYZ');
    const quat = new THREE.Quaternion().setFromEuler(euler);

    rigidBodyRef.current.setNextKinematicRotation(quat);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="kinematicPosition"
      colliders={false}
      name="board"
      restitution={0.01}
      friction={0.4}
    >
      {/* ================= RECALCULATED PRECISION PHYSICS COLLIDERS ================= */}
      {/* 1. Solid Analytic Floor Slab (Extending under all outer rims to eliminate corner/edge dropouts) */}
      <CuboidCollider
        args={[(totalWidth + rimThickness * 4) / 2, floorThickness / 2, (totalDepth + rimThickness * 4) / 2]}
        position={[0, -floorThickness / 2, 0]}
        name="floor"
        restitution={0.01}
        friction={0.4}
      />

      {/* 2. Four Solid Analytic Hardwood Outer Retaining Rims (Interlocking at all corners, 1.10 high) */}
      {/* North Rim */}
      <CuboidCollider
        args={[(totalWidth + rimThickness * 2) / 2, rimHeight / 2, rimThickness / 2]}
        position={[0, rimHeight / 2, -totalDepth / 2 - rimThickness / 2]}
        name="rim-north"
        restitution={0.02}
        friction={0.4}
      />
      {/* South Rim */}
      <CuboidCollider
        args={[(totalWidth + rimThickness * 2) / 2, rimHeight / 2, rimThickness / 2]}
        position={[0, rimHeight / 2, totalDepth / 2 + rimThickness / 2]}
        name="rim-south"
        restitution={0.02}
        friction={0.4}
      />
      {/* West Rim */}
      <CuboidCollider
        args={[rimThickness / 2, rimHeight / 2, (totalDepth + rimThickness * 2) / 2]}
        position={[-totalWidth / 2 - rimThickness / 2, rimHeight / 2, 0]}
        name="rim-west"
        restitution={0.02}
        friction={0.4}
      />
      {/* East Rim */}
      <CuboidCollider
        args={[rimThickness / 2, rimHeight / 2, (totalDepth + rimThickness * 2) / 2]}
        position={[totalWidth / 2 + rimThickness / 2, rimHeight / 2, 0]}
        name="rim-east"
        restitution={0.02}
        friction={0.4}
      />

      {/* 3. Interior Walls Colliders */}
      {colliderMode === 'convex-hull' ? (
        collisionData.convexHulls.map((hull) => (
          <ConvexHullCollider
            key={hull.id}
            args={[hull.vertices]}
            name={hull.id}
            restitution={0.04}
            friction={0.38}
          />
        ))
      ) : (
        <TrimeshCollider
          args={[collisionData.interiorWallsVertices, collisionData.interiorWallsIndices]}
          name="interior-walls"
          restitution={0.04}
          friction={0.38}
        />
      )}

      {/* ================= VISUAL MESHES ================= */}
      <group ref={boardVisualGroupRef}>
        {/* Maze Floor Planks */}
        <mesh position={[0, -0.02, 0]} receiveShadow>
          <boxGeometry args={[totalWidth, 0.04, totalDepth]} />
          <meshStandardMaterial
            map={woodFloorTexture}
            roughness={0.42}
            metalness={0.08}
            bumpScale={0.006}
          />
        </mesh>

        {/* Outer Wooden Tray Rim (Beveled Hardwood Frame with Interlocking Box Joints) */}
        {/* North Rim Mesh */}
        <mesh
          position={[0, rimHeight / 2, -totalDepth / 2 - rimThickness / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[totalWidth + rimThickness * 2, rimHeight, rimThickness]} />
          <meshStandardMaterial
            map={woodWallTexture}
            roughness={0.36}
            metalness={0.05}
          />
        </mesh>
        {/* South Rim Mesh */}
        <mesh
          position={[0, rimHeight / 2, totalDepth / 2 + rimThickness / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[totalWidth + rimThickness * 2, rimHeight, rimThickness]} />
          <meshStandardMaterial
            map={woodWallTexture}
            roughness={0.36}
            metalness={0.05}
          />
        </mesh>
        {/* West Rim Mesh */}
        <mesh
          position={[-totalWidth / 2 - rimThickness / 2, rimHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[rimThickness, rimHeight, totalDepth + rimThickness * 2]} />
          <meshStandardMaterial
            map={woodWallTexture}
            roughness={0.36}
            metalness={0.05}
          />
        </mesh>
        {/* East Rim Mesh */}
        <mesh
          position={[totalWidth / 2 + rimThickness / 2, rimHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[rimThickness, rimHeight, totalDepth + rimThickness * 2]} />
          <meshStandardMaterial
            map={woodWallTexture}
            roughness={0.36}
            metalness={0.05}
          />
        </mesh>

        {/* Polished Brass Corner Brackets on the outer rim */}
        {[
          [-totalWidth / 2 - rimThickness * 0.5, -totalDepth / 2 - rimThickness * 0.5],
          [totalWidth / 2 + rimThickness * 0.5, -totalDepth / 2 - rimThickness * 0.5],
          [-totalWidth / 2 - rimThickness * 0.5, totalDepth / 2 + rimThickness * 0.5],
          [totalWidth / 2 + rimThickness * 0.5, totalDepth / 2 + rimThickness * 0.5],
        ].map(([cx, cz], i) => (
          <mesh key={i} position={[cx, rimHeight - 0.02, cz]} castShadow>
            <cylinderGeometry args={[rimThickness * 0.65, rimThickness * 0.65, 0.04, 16]} />
            <meshStandardMaterial
              color="#d4af37"
              roughness={0.25}
              metalness={0.85}
            />
          </mesh>
        ))}

        {/* Outer Underside Tray Base (solid base plate) */}
        <mesh position={[0, -0.1, 0]} castShadow receiveShadow>
          <boxGeometry
            args={[
              totalWidth + rimThickness * 1.8,
              0.16,
              totalDepth + rimThickness * 1.8,
            ]}
          />
          <meshStandardMaterial
            color="#3d2213"
            roughness={0.65}
            metalness={0.05}
          />
        </mesh>

        {/* Interior Maze Walls */}
        {maze.walls.map((wall, idx) => (
          <mesh
            key={idx}
            position={[wall.x, maze.wallHeight / 2, wall.z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[wall.width, maze.wallHeight, wall.depth]} />
            <meshStandardMaterial
              map={woodWallTexture}
              roughness={0.38}
              metalness={0.06}
            />
          </mesh>
        ))}

        {/* Start Cell Inlay Marker (Fine bronze circle flush with wooden floor) */}
        <group position={[startWorldPos.x, 0.0005, startWorldPos.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <ringGeometry args={[maze.cellSize * 0.22, maze.cellSize * 0.34, 32]} />
            <meshStandardMaterial
              color="#b87333"
              roughness={0.35}
              metalness={0.7}
              polygonOffset={true}
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[maze.cellSize * 0.12, 24]} />
            <meshStandardMaterial
              color="#54361c"
              roughness={0.5}
              polygonOffset={true}
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        </group>

        {/* Goal Cell Finish Zone: Polished Brass Ring flush with floor */}
        <group position={[goalWorldPos.x, 0.0005, goalWorldPos.z]}>
          {/* Outer brass ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <ringGeometry args={[maze.cellSize * 0.28, maze.cellSize * 0.42, 36]} />
            <meshStandardMaterial
              color="#e6b800"
              emissive="#735c00"
              emissiveIntensity={0.25}
              roughness={0.2}
              metalness={0.88}
              polygonOffset={true}
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
          {/* Glowing finish zone pad */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[maze.cellSize * 0.26, 32]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#15803d"
              emissiveIntensity={0.65}
              roughness={0.3}
              metalness={0.2}
              transparent={true}
              opacity={0.85}
              polygonOffset={true}
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
          {/* Subtle finish beacon light */}
          <pointLight
            position={[0, 0.3, 0]}
            color="#4ade80"
            intensity={0.8}
            distance={1.6}
          />
        </group>
      </group>
    </RigidBody>
  );
};
